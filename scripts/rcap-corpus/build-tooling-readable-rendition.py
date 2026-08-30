#!/usr/bin/env python3
"""Produce a TOOLING-READABLE RENDITION of an official source, and prove it is
the same document.

  python3 scripts/rcap-corpus/build-tooling-readable-rendition.py \
      --request <request.json> --report <report.json>

WHAT THIS IS, AND WHAT IT IS NOT

It is not a rescue, a repair or a workaround, and the sources it reads are not
damaged. Every source this pipeline is built for is a published official form
that opens on the first try in any implementation of the PDF standard security
handler -- with an EMPTY user password, because the handler is permissions-only.
Nothing here defeats a secret, and nothing here is asked to.

What it does is narrower and worth naming precisely: our own writer, pdf-lib
1.17.1, implements no decryption at all, so it cannot open these documents to
write a filled artifact from them. This pipeline produces a form of the same
document that pdf-lib CAN open -- a rendition -- and then proves, dimension by
dimension, that the rendition is the document. The proof is the deliverable.
The rendition is a build intermediate.

THE FIVE THINGS THAT MAKE IT CONTROLLED

  1. The official SHA-256 is verified BEFORE the document is opened. A
     transformation of unverified bytes proves nothing about anything, so a
     mismatch stops the run before pikepdf ever sees the file.
  2. The rendition is written under private/, which is git-ignored, and is
     never committed. What is committed is this pipeline's report: hashes,
     counts, geometry and deltas -- no source binary, no derivative, no
     absolute container path, no symlink.
  3. The rendition is compared against the official on every dimension that a
     field map or a rendered artifact could depend on: page count, page
     geometry, page content-stream hashes, terminal field identities, widget
     rectangles, /FT, /Ff, /MaxLen, appearance-state names and appearance
     stream hashes, the XFA packet, the document information dictionary and
     the catalogue's own key set. A delta anywhere is a stop, not a note.
  4. The transformation identity and the exact tool version are recorded.
  5. The bytes are deterministic. The rendition is produced twice, from the
     same input, and the two must hash identically.

THE ONE NORMALISATION, AND WHY IT IS NEEDED

qpdf's default trailer /ID generation is TIME-DEPENDENT: the same input saved
twice, seconds apart, yields two different files. That was measured here, not
assumed -- three saves of CR-180 at t, t and t+3s produced three distinct
SHA-256 values. `deterministic_id=True` replaces that clock-derived value with
one derived from the file's own content, which makes the pipeline reproducible.

It is worth being exact about what that changes. ISO 32000-1 §14.4 gives /ID two
elements: the first is the document's PERMANENT identifier, fixed when the file
is created, and the second is a CHANGING identifier that is expected to differ
whenever the file is written again. qpdf preserves the first and regenerates the
second -- verified, and asserted below. So the rendition keeps the official
document's permanent identity and carries a second element that says, correctly,
that this is a different file of the same document. That is the accurate record,
not a loss.

XFA

Recorded explicitly per source, because an unrecorded XFA decision is exactly
the kind of silent change that makes a rendered form differ from the court's.
This stage REMOVES NOTHING: any /XFA packet is carried through and its bytes are
hashed on both sides and asserted equal. Where a downstream stage removes XFA,
that is that stage's decision to declare, and it does not get to inherit
silence from this one.

Requires pikepdf (bindings over libqpdf). pdf-lib cannot open these inputs; that
is the whole reason this stage exists.
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile

import pikepdf

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_CORPUS = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1"

# ISO 32000-1 table 22: the bits of /P that a permissions-only handler uses to
# say what it allows. Recorded so the report states the publisher's own terms
# rather than paraphrasing them.
PERMISSION_BITS = {
    3: "print",
    4: "modifyContents",
    5: "extractForAnyPurpose",
    6: "modifyAnnotationsAndFillForms",
    9: "fillInFormFields",
    10: "extractForAccessibility",
    11: "assemblePages",
    12: "printHighQuality",
}


def fail(message, detail=""):
    sys.stderr.write("STOP: %s\n" % message)
    if detail:
        sys.stderr.write("      %s\n" % detail)
    raise SystemExit(1)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def rnd(x):
    return round(float(x), 4)


# ---- what the output is ------------------------------------------------------
def sniff_media_type(path):
    """`application/pdf` is asserted from the bytes, not from the extension.

    A file named .pdf that does not begin %PDF- and end with %%EOF is not a PDF,
    and a pipeline whose contract is "the final artifact is application/pdf"
    should be able to say so from the file rather than from its own filename.
    """
    size = os.path.getsize(path)
    with open(path, "rb") as fh:
        head = fh.read(8)
        fh.seek(max(0, size - 2048))
        tail = fh.read()
    header_ok = head.startswith(b"%PDF-")
    eof_ok = b"%%EOF" in tail
    return {
        "mediaType": "application/pdf" if (header_ok and eof_ok) else "application/octet-stream",
        "headerVersion": head[:8].decode("latin1") if header_ok else None,
        "hasEofMarker": eof_ok,
        "byteLength": size,
    }


# ---- what the encryption actually is -----------------------------------------
def describe_encryption(pdf, opened_with_empty_user_password):
    if not pdf.is_encrypted:
        return {
            "encrypted": False,
            "handler": None,
            "note": "no /Encrypt dictionary; nothing to render readable at the cipher layer",
        }
    enc = pdf.encryption
    p = int(enc.P)
    allows = {name: bool(p & (1 << (bit - 1))) for bit, name in sorted(PERMISSION_BITS.items())}
    return {
        "encrypted": True,
        "handler": "/Standard",
        "V": int(enc.V),
        "R": int(enc.R),
        "streamCipher": str(enc.stream_method),
        "stringCipher": str(enc.string_method),
        "bitLength": int(getattr(enc, "bits", 0)) or None,
        "P": p,
        "permissions": allows,
        "userPasswordEmpty": opened_with_empty_user_password,
        "readingIsPermitted": True,
        "fillingFormFieldsIsPermitted": allows.get("fillInFormFields", False),
        "whatThisIs":
            "A permissions-only /Standard handler. The user password is empty, so the document "
            "opens with no secret in any conforming implementation; the /P bits are the publisher's "
            "statement about what may be done with it, and they are recorded here verbatim rather "
            "than summarised.",
    }


# ---- the comparison ----------------------------------------------------------
def read_page_content(page):
    obj = page.obj.get("/Contents")
    if obj is None:
        return b""
    if isinstance(obj, pikepdf.Array):
        return b"\n".join(bytes(part.read_bytes()) for part in obj)
    return bytes(obj.read_bytes())


def qualified_name(field):
    parts, node, guard = [], field, 0
    while node is not None and guard < 64:
        t = node.get("/T")
        if t is not None:
            parts.append(str(t))
        node = node.get("/Parent")
        guard += 1
    return ".".join(reversed(parts))


def terminal_fields(pdf):
    if "/AcroForm" not in pdf.Root:
        return []
    out = []

    def walk(nodes, depth=0):
        if depth > 32:
            return
        for node in nodes:
            kids = node.get("/Kids")
            if kids is not None and any("/T" in k for k in kids):
                walk(kids, depth + 1)
            else:
                out.append(node)

    walk(pdf.Root.AcroForm.get("/Fields", []))
    return out


def xfa_fingerprint(acro):
    """Hash the XFA packet, and name its parts.

    /XFA is either a single stream or a flat array of alternating name/stream
    pairs. Both shapes are hashed over the concatenated stream bytes so the two
    sides are comparable whatever the shape, and the part names are listed so a
    reader can see WHICH packets exist rather than only that some do.
    """
    if acro is None or "/XFA" not in acro:
        return {"present": False, "shape": None, "partNames": [], "packetSha256": None}
    x = acro["/XFA"]
    if isinstance(x, pikepdf.Array):
        names, blobs = [], []
        for i in range(0, len(x) - 1, 2):
            names.append(str(x[i]))
            blobs.append(bytes(x[i + 1].read_bytes()))
        return {
            "present": True,
            "shape": "array",
            "partNames": names,
            "packetSha256": hashlib.sha256(b"".join(blobs)).hexdigest(),
            "partCount": len(names),
        }
    return {
        "present": True,
        "shape": "stream",
        "partNames": [],
        "packetSha256": hashlib.sha256(bytes(x.read_bytes())).hexdigest(),
        "partCount": 1,
    }


def appearance_fingerprint(widget):
    """The /AP /N state names and the bytes of each state's appearance stream.

    Included in the comparison because these forms are marked by SETTING an
    appearance state, and a rendition that carried a different appearance -- or
    lost one -- would put a tick in a different place, or nowhere, without
    changing a single rectangle.
    """
    ap = widget.get("/AP")
    if ap is None or "/N" not in ap:
        return {"states": [], "streamSha256": None}
    n = ap["/N"]
    # A widget's /N is EITHER a state dictionary (a button, one appearance per
    # state) OR a single appearance stream (everything else). A stream also
    # answers .keys() -- with its own /BBox, /Length, /Filter -- so the two are
    # told apart by type rather than by asking. Hashing read_bytes() rather than
    # the raw stream matters here: qpdf recompresses, so the encoded bytes
    # differ where the DRAWN appearance does not.
    if isinstance(n, pikepdf.Stream):
        try:
            return {"states": ["<stream>"],
                    "streamSha256": hashlib.sha256(bytes(n.read_bytes())).hexdigest()}
        except Exception:
            return {"states": ["<stream>"], "streamSha256": None}
    try:
        keys = sorted(str(k) for k in n.keys())
    except AttributeError:
        return {"states": [], "streamSha256": None}
    blobs = []
    for k in keys:
        try:
            blobs.append(k.encode("latin1") + b"\x00" + bytes(n[k].read_bytes()))
        except Exception:
            blobs.append(k.encode("latin1") + b"\x00<unreadable>")
    return {"states": keys, "streamSha256": hashlib.sha256(b"\x1e".join(blobs)).hexdigest()}


def optional_content(pdf):
    """The document's optional-content groups, and which pages actually use them.

    This is not housekeeping. A Judicial Council form paints the grey panel
    behind its "Clear This Form" warning inside a group named `ViewOnly Layer`
    whose /Usage says /Print /PrintState /OFF -- so a conforming printer hides
    it and a rasteriser that ignores /OCProperties shows it. Any visual review
    of these forms is reading a page the court would not print unless it knows
    that, and the dangerous direction is the other one: content in a
    /PrintState /ON, /ViewState /OFF group prints and is invisible to the
    review. Both are answerable only from the document, so both are recorded,
    and the comparison holds the rendition to them.
    """
    ocp = pdf.Root.get("/OCProperties")
    if ocp is None:
        return {"present": False, "groups": [], "usageByPage": []}

    groups = {}
    for g in ocp.get("/OCGs", []):
        usage = g.get("/Usage") or {}
        groups[g.objgen] = {
            "name": str(g.get("/Name")),
            "printState": str((usage.get("/Print") or {}).get("/PrintState")) or None,
            "viewState": str((usage.get("/View") or {}).get("/ViewState")) or None,
        }

    usage_by_page = []
    for i, page in enumerate(pdf.pages):
        props = (page.obj.get("/Resources") or {}).get("/Properties")
        if props is None:
            continue
        body = read_page_content(page).decode("latin1")
        for key in props.keys():
            blocks = len(re.findall(r"/OC\s*" + re.escape(str(key)) + r"\s+BDC", body))
            if not blocks:
                continue
            g = groups.get(props[key].objgen, {"name": None, "printState": None, "viewState": None})
            usage_by_page.append({
                "pageIndex": i, "resourceName": str(key), "groupName": g["name"],
                "printState": g["printState"], "viewState": g["viewState"], "blocks": blocks,
            })

    return {
        "present": True,
        "groups": sorted(groups.values(), key=lambda g: g["name"] or ""),
        "usageByPage": usage_by_page,
    }


def structural_profile(pdf):
    """Everything about a document that a field map or a rendered artifact could
    depend on, reduced to comparable values."""
    page_index = {p.obj.objgen: i for i, p in enumerate(pdf.pages)}

    pages = []
    for i, page in enumerate(pdf.pages):
        content = read_page_content(page)
        annots = page.obj.get("/Annots")
        pages.append({
            "pageIndex": i,
            "mediaBox": [rnd(v) for v in page.MediaBox],
            "cropBox": [rnd(v) for v in page.CropBox] if "/CropBox" in page else None,
            "rotate": int(page.get("/Rotate", 0)),
            "userUnit": rnd(page.get("/UserUnit", 1)),
            "annotationCount": len(annots) if annots is not None else 0,
            "contentStreamSha256": hashlib.sha256(content).hexdigest(),
            "contentStreamBytes": len(content),
        })

    fields = {}
    for f in terminal_fields(pdf):
        ft = str(f.get("/FT")) if f.get("/FT") is not None else None
        widgets = []
        nodes = f.get("/Kids") if f.get("/Kids") is not None else [f]
        for w in nodes:
            rect = w.get("/Rect")
            if rect is None:
                continue
            x0, y0, x1, y1 = (float(v) for v in rect)
            page_ref = w.get("/P")
            widgets.append({
                "pageIndex": page_index.get(page_ref.objgen) if page_ref is not None else None,
                "rect": [rnd(min(x0, x1)), rnd(min(y0, y1)), rnd(max(x0, x1)), rnd(max(y0, y1))],
                "annotationFlags": int(w.get("/F", 0)),
                "appearance": appearance_fingerprint(w),
            })
        widgets.sort(key=lambda w: (w["pageIndex"] if w["pageIndex"] is not None else -1,
                                    -w["rect"][3], w["rect"][0]))
        opt = f.get("/Opt")
        fields[qualified_name(f)] = {
            "fieldType": ft,
            "ff": int(f.get("/Ff", 0)),
            "maxLen": int(f["/MaxLen"]) if "/MaxLen" in f else None,
            "options": [str(o) for o in opt] if opt is not None else None,
            "widgetCount": len(widgets),
            "widgets": widgets,
        }

    acro = pdf.Root.get("/AcroForm")
    info = pdf.trailer.get("/Info")
    return {
        "pageCount": len(pdf.pages),
        "pages": pages,
        "catalogKeys": sorted(str(k) for k in pdf.Root.keys()),
        "needsRendering": bool(pdf.Root.get("/NeedsRendering", False)),
        "acroForm": {
            "present": acro is not None,
            "needAppearances": bool(acro.get("/NeedAppearances", False)) if acro is not None else None,
            "sigFlags": int(acro["/SigFlags"]) if acro is not None and "/SigFlags" in acro else 0,
            "defaultAppearance": str(acro["/DA"]) if acro is not None and "/DA" in acro else None,
            "defaultResourceFonts": sorted(str(k) for k in acro["/DR"]["/Font"].keys())
                if acro is not None and "/DR" in acro and "/Font" in acro["/DR"] else [],
        },
        "xfa": xfa_fingerprint(acro),
        "optionalContent": optional_content(pdf),
        "terminalFieldCount": len(fields),
        "fields": fields,
        "documentInformation": {str(k): str(v) for k, v in (info or {}).items()},
        "permanentId": bytes(pdf.trailer["/ID"][0]).hex() if "/ID" in pdf.trailer else None,
        "changingId": bytes(pdf.trailer["/ID"][1]).hex()
            if "/ID" in pdf.trailer and len(pdf.trailer["/ID"]) > 1 else None,
    }


def compare(official, rendition):
    """Every delta, named. An empty result is the only pass."""
    deltas = []

    def differ(dimension, a, b, where=None):
        if a != b:
            deltas.append({"dimension": dimension, "where": where,
                           "official": a, "rendition": b})

    differ("pageCount", official["pageCount"], rendition["pageCount"])
    differ("catalogKeys", official["catalogKeys"], rendition["catalogKeys"])
    differ("needsRendering", official["needsRendering"], rendition["needsRendering"])
    for key in ("present", "needAppearances", "sigFlags", "defaultAppearance",
                "defaultResourceFonts"):
        differ("acroForm.%s" % key, official["acroForm"][key], rendition["acroForm"][key])
    for key in ("present", "shape", "partNames", "packetSha256", "partCount"):
        differ("xfa.%s" % key, official["xfa"].get(key), rendition["xfa"].get(key))
    differ("optionalContent.groups", official["optionalContent"]["groups"],
           rendition["optionalContent"]["groups"])
    differ("optionalContent.usageByPage", official["optionalContent"]["usageByPage"],
           rendition["optionalContent"]["usageByPage"])
    differ("documentInformation", official["documentInformation"],
           rendition["documentInformation"])
    differ("permanentId", official["permanentId"], rendition["permanentId"])

    for i in range(min(official["pageCount"], rendition["pageCount"])):
        a, b = official["pages"][i], rendition["pages"][i]
        for key in ("mediaBox", "cropBox", "rotate", "userUnit", "annotationCount",
                    "contentStreamSha256", "contentStreamBytes"):
            differ("page.%s" % key, a[key], b[key], where="page %d" % (i + 1))

    a_names, b_names = set(official["fields"]), set(rendition["fields"])
    for name in sorted(a_names - b_names):
        deltas.append({"dimension": "field.missingFromRendition", "where": name,
                       "official": name, "rendition": None})
    for name in sorted(b_names - a_names):
        deltas.append({"dimension": "field.addedByRendition", "where": name,
                       "official": None, "rendition": name})
    for name in sorted(a_names & b_names):
        a, b = official["fields"][name], rendition["fields"][name]
        for key in ("fieldType", "ff", "maxLen", "options", "widgetCount"):
            differ("field.%s" % key, a[key], b[key], where=name)
        for i in range(min(a["widgetCount"], b["widgetCount"])):
            wa, wb = a["widgets"][i], b["widgets"][i]
            for key in ("pageIndex", "rect", "annotationFlags"):
                differ("widget.%s" % key, wa[key], wb[key], where="%s [widget %d]" % (name, i))
            differ("widget.appearanceStates", wa["appearance"]["states"],
                   wb["appearance"]["states"], where="%s [widget %d]" % (name, i))
            differ("widget.appearanceStreamSha256", wa["appearance"]["streamSha256"],
                   wb["appearance"]["streamSha256"], where="%s [widget %d]" % (name, i))
    return deltas


# ---- the transformation ------------------------------------------------------
def render_readable(source_path, out_path):
    """The transformation itself: open at the cipher layer, write without it.

    qpdf rewrites the object layer and does not re-render page content, which is
    why the page content-stream hashes above are expected to be identical rather
    than merely close. Nothing is removed, downsampled, flattened or rasterised.
    """
    with pikepdf.open(source_path, password="") as pdf:
        was_encrypted = pdf.is_encrypted
        encryption = describe_encryption(pdf, opened_with_empty_user_password=True)
        pdf.save(out_path, deterministic_id=True)
    return was_encrypted, encryption


def process(entry, corpus_root, private_dir, keep_second_copy_dir):
    form = entry["formNumber"]
    source_path = os.path.join(corpus_root, entry["pathInArchive"])
    if not os.path.exists(source_path):
        fail("%s: the official source is not present at its pinned path" % form,
             entry["pathInArchive"])

    # (1) Verify BEFORE transforming. An absent corpus and a wrong one are both
    #     stops, and neither is allowed to become a rendition.
    observed = sha256_file(source_path)
    if observed != entry["sha256"]:
        fail("%s: official SHA-256 mismatch; nothing was transformed" % form,
             "pinned %s / observed %s" % (entry["sha256"], observed))

    os.makedirs(private_dir, exist_ok=True)
    out_path = os.path.join(private_dir, "%s.readable.pdf" % form)
    was_encrypted, encryption = render_readable(source_path, out_path)

    # (5) Deterministic bytes: the same input, transformed again, byte for byte.
    second = os.path.join(keep_second_copy_dir, "%s.readable.pdf" % form)
    render_readable(source_path, second)
    first_hash, second_hash = sha256_file(out_path), sha256_file(second)
    if first_hash != second_hash:
        fail("%s: the transformation is not deterministic" % form,
             "%s vs %s" % (first_hash, second_hash))

    media = sniff_media_type(out_path)
    if media["mediaType"] != "application/pdf":
        fail("%s: the rendition is not application/pdf" % form, json.dumps(media))

    # (3) Prove it is the same document.
    with pikepdf.open(source_path, password="") as o:
        official = structural_profile(o)
    with pikepdf.open(out_path) as r:
        rendition = structural_profile(r)
        rendition_still_encrypted = r.is_encrypted

    deltas = compare(official, rendition)
    if deltas:
        fail("%s: the rendition is NOT the same document (%d delta(s))" % (form, len(deltas)),
             json.dumps(deltas[:5], indent=2))
    if rendition_still_encrypted:
        fail("%s: the rendition is still encrypted; it would not be readable" % form)

    rel_out = os.path.relpath(out_path, REPO_ROOT)
    return {
        "formNumber": form,
        "role": entry.get("role"),
        "pathInArchive": entry["pathInArchive"],
        "official": {
            "pinnedSha256": entry["sha256"],
            "observedSha256": observed,
            "verifiedBeforeTransformation": True,
            "byteLength": os.path.getsize(source_path),
            "encryption": encryption,
        },
        "rendition": {
            "path": rel_out,
            "committed": False,
            "whyNotCommitted":
                "It is a build intermediate under private/, which is git-ignored. What this family "
                "stands on is the official binary and this report; a derivative in the tree would "
                "invite a later run to measure off it.",
            "sha256": first_hash,
            "byteLength": media["byteLength"],
            "mediaType": media["mediaType"],
            "headerVersion": media["headerVersion"],
            "hasEofMarker": media["hasEofMarker"],
            "stillEncrypted": rendition_still_encrypted,
        },
        "deterministicBytes": {
            "provenBy": "the transformation was run twice from the same input in this run",
            "firstRunSha256": first_hash,
            "secondRunSha256": second_hash,
            "identical": True,
            "normalisation": {
                "applied": "qpdf deterministic /ID",
                "why":
                    "qpdf's default trailer /ID is derived from the clock, so the same input saved "
                    "twice seconds apart produces different bytes. Measured, not assumed: three "
                    "default saves of CR-180 at t, t and t+3s produced three distinct SHA-256 "
                    "values. deterministic_id derives it from the file's own content instead.",
                "whatItChanges":
                    "ISO 32000-1 14.4 /ID[0] is the document's PERMANENT identifier and /ID[1] the "
                    "CHANGING one, which is expected to differ whenever the file is written again. "
                    "qpdf preserves the first and regenerates the second; permanentId is asserted "
                    "equal in the comparison above, and changingId is expected to differ and is "
                    "recorded on both sides.",
                "officialPermanentId": official["permanentId"],
                "officialChangingId": official["changingId"],
                "renditionChangingId": rendition["changingId"],
            },
        },
        "xfaDecision": {
            "sourceCarriesXfa": official["xfa"]["present"],
            "shape": official["xfa"]["shape"],
            "partCount": official["xfa"].get("partCount"),
            "partNames": official["xfa"]["partNames"],
            "needsRendering": official["needsRendering"],
            "hybridStaticXfa": official["xfa"]["present"] and not official["needsRendering"],
            "removedByThisStage": False,
            "why":
                "This stage removes nothing. Its whole claim is that the rendition IS the document, "
                "and a rendition that dropped the XFA packet would not be. The packet is carried "
                "through and its bytes are hashed on both sides and asserted equal "
                "(xfa.packetSha256 is a compared dimension, not a note).",
            "officialPacketSha256": official["xfa"]["packetSha256"],
            "renditionPacketSha256": rendition["xfa"]["packetSha256"],
            "packetIdentical": official["xfa"]["packetSha256"] == rendition["xfa"]["packetSha256"],
            "downstreamWarning":
                "A downstream FILL stage may remove XFA -- pdf-lib 1.17.1 does, announcing it -- and "
                "that removal is that stage's decision to declare in its own record. It does not "
                "inherit silence from this one.",
        },
        "optionalContent": official["optionalContent"],
        "comparison": {
            "dimensionsCompared": [
                "page count",
                "page /MediaBox, /CropBox, /Rotate, /UserUnit",
                "per-page annotation count",
                "per-page content-stream SHA-256 and byte length",
                "catalogue key set and /NeedsRendering",
                "AcroForm /NeedAppearances, /SigFlags, /DA, /DR font names",
                "XFA presence, shape, part names and packet SHA-256",
                "optional-content groups, their /Print and /View usage states, and which pages use them",
                "terminal field identities (fully-qualified names)",
                "per field /FT, /Ff, /MaxLen, /Opt, widget count",
                "per widget page index, /Rect, /F",
                "per widget /AP /N state names and appearance-stream SHA-256",
                "document information dictionary",
                "trailer /ID[0] (the permanent identifier)",
            ],
            "deltaCount": 0,
            "deltas": [],
            "identical": True,
            "pageCount": official["pageCount"],
            "terminalFieldCount": official["terminalFieldCount"],
            "widgetCount": sum(f["widgetCount"] for f in official["fields"].values()),
            "pageContentStreamSha256": [p["contentStreamSha256"] for p in official["pages"]],
            "pageGeometry": [
                {"pageIndex": p["pageIndex"], "mediaBox": p["mediaBox"], "cropBox": p["cropBox"],
                 "rotate": p["rotate"], "userUnit": p["userUnit"]}
                for p in official["pages"]
            ],
        },
        "whatChanged": [
            "the /Standard security handler and its permission bits are gone, which is the "
            "point of the stage",
            "trailer /ID[1], the changing identifier, is regenerated from content (see "
            "deterministicBytes.normalisation)",
            "the object layer is rewritten -- object numbering, stream compression and "
            "cross-reference form are qpdf's, not the publisher's",
        ],
        "whatDidNotChange": [
            "every page's decoded content stream, byte for byte",
            "every page's geometry",
            "every terminal field's identity, type, flags and maximum length",
            "every widget's rectangle, page and appearance states",
            "the XFA packet",
            "the optional-content groups and which pages use them",
            "the document information dictionary",
            "the permanent document identifier",
        ],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--request", required=True,
                    help="the rendition request: which official sources, pinned by SHA-256")
    ap.add_argument("--report", required=True, help="where to write the committed report")
    ap.add_argument("--corpus", default=os.environ.get("RCAP_BUNDLE_EXTRACT", DEFAULT_CORPUS))
    args = ap.parse_args()

    with open(args.request) as fh:
        request = json.load(fh)

    private_dir = os.path.join(REPO_ROOT, request["renditionDirectory"])
    if "private/" not in request["renditionDirectory"].replace(os.sep, "/") + "/":
        fail("the rendition directory must be under private/", request["renditionDirectory"])

    second_dir = tempfile.mkdtemp(prefix="readable-rendition-determinism-")
    try:
        sources = [process(entry, args.corpus, private_dir, second_dir)
                   for entry in request["sources"]]
    finally:
        shutil.rmtree(second_dir, ignore_errors=True)

    report = {
        "schemaVersion": "rcap-tooling-readable-rendition/v1",
        "familyId": request["familyId"],
        "jurisdiction": request.get("jurisdiction"),
        "generatedBy": "scripts/rcap-corpus/build-tooling-readable-rendition.py",
        "request": os.path.relpath(os.path.abspath(args.request), REPO_ROOT),
        "whatThisStageIs":
            "A tooling-readable rendition of an official source, plus the proof that the rendition "
            "is the same document. It is not a rescue and the sources are not damaged: each opens "
            "with an empty user password in any conforming implementation. The obstacle is that "
            "pdf-lib 1.17.1, the only writer in this repository, implements no decryption and so "
            "cannot open them to write a filled artifact.",
        "whatThisStageIsNot": [
            "not a repair -- nothing here is damaged",
            "not a password crack -- the user password is empty and no secret is defeated",
            "not a re-render -- page content streams are carried through and asserted identical",
            "not a source of geometry -- every rectangle this family uses is measured off the "
            "official binary, never off a rendition",
        ],
        "transformation": {
            "identity": "structural rewrite of the object layer with the security handler removed",
            "tool": "pikepdf (bindings over libqpdf)",
            "pikepdfVersion": pikepdf.__version__,
            "libqpdfVersion": pikepdf.__libqpdf_version__,
            "call": "pikepdf.open(source, password='').save(out, deterministic_id=True)",
            "equivalentCommandLine": "qpdf --decrypt --deterministic-id <in> <out>",
            "password": "empty user password; no password was supplied or needed",
            "reRendersContent": False,
            "removesXfa": False,
        },
        "controls": [
            "the official SHA-256 is verified BEFORE the document is opened; a mismatch stops the "
            "run and nothing is transformed",
            "the rendition is written under private/, is git-ignored and is never committed",
            "the rendition is compared against the official on every dimension a field map or a "
            "rendered artifact could depend on; any delta is a stop",
            "the transformation identity and exact tool version are recorded",
            "the rendition is produced twice and the two runs must hash identically",
            "the output is asserted application/pdf from its own bytes",
        ],
        "sourceCount": len(sources),
        "allIdentical": all(s["comparison"]["identical"] for s in sources),
        "allDeterministic": all(s["deterministicBytes"]["identical"] for s in sources),
        "xfaDecisionSummary": {
            "sourcesCarryingXfa": [s["formNumber"] for s in sources if s["xfaDecision"]["sourceCarriesXfa"]],
            "sourcesWithoutXfa": [s["formNumber"] for s in sources if not s["xfaDecision"]["sourceCarriesXfa"]],
            "removedByThisStage": False,
            "why": "removing it would falsify the claim that the rendition is the same document",
        },
        "sources": sources,
        "whatThisReportDoesNotEstablish": [
            "that any rendered artifact is approved for participant delivery",
            "that a downstream stage preserves what this one preserved -- each stage declares its "
            "own losses",
            "anything about a source this request does not name",
        ],
    }

    os.makedirs(os.path.dirname(os.path.abspath(args.report)), exist_ok=True)
    with open(args.report, "w") as fh:
        json.dump(report, fh, indent=2)
        fh.write("\n")

    print("TOOLING_READABLE_RENDITION_PROVEN: %d/%d source(s)" % (len(sources), len(sources)))
    print("  tool: pikepdf %s / libqpdf %s" % (pikepdf.__version__, pikepdf.__libqpdf_version__))
    for s in sources:
        print("  %-7s official %s -> rendition %s  pages=%d fields=%d deltas=0 xfa=%s"
              % (s["formNumber"], s["official"]["pinnedSha256"][:12],
                 s["rendition"]["sha256"][:12], s["comparison"]["pageCount"],
                 s["comparison"]["terminalFieldCount"],
                 "carried" if s["xfaDecision"]["sourceCarriesXfa"] else "absent"))
    print("  report -> %s" % os.path.relpath(os.path.abspath(args.report), REPO_ROOT))
    print("  renditions -> %s (git-ignored, not committed)" % request["renditionDirectory"])


if __name__ == "__main__":
    main()
