#!/usr/bin/env python3
"""Compare each official CA 1203.4 source binary against its committed rescued derivative.

WHY THIS EXISTS

`data/rcap-all50/local-source-corpus-index.json` records the five official
California sources for this family as structuralClassObserved="unreadable" with
loadError "Expected instance of PDFDict, but got instance of undefined". That is
a true observation about pdf-lib 1.17.1, which has no decryption support at all
and fails on the encrypted object streams. It is NOT an observation about the
documents: every one of these forms carries a permissions-only standard security
handler with an EMPTY user password, so the official bytes open directly in any
implementation that implements the standard handler.

This script establishes that from the bytes, and then answers the question the
build discipline actually cares about: if the official form is readable, does the
committed derivative describe the same document, field by field and box by box?
A derivative that matches everywhere still may not be substituted for the
official binary as a measurement surface -- but a derivative that DIVERGES is a
finding that has to be reported before anything downstream cites it.

It reads only. It writes no PDF and modifies no derivative.

Requires pikepdf (qpdf bindings); pdf-lib cannot open these inputs:
    pip install pikepdf
"""

import hashlib
import json
import os
import sys

import pikepdf

CORPUS = os.environ.get(
    "RCAP_BUNDLE_EXTRACT",
    "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
)
FORMS_DIR = os.path.join(CORPUS, "STATES/CA/02_PACKET_FORMS")
RESCUED_DIR = "data/rcap-all50/overlays/rescued-encrypted-pdfs"

# formNumber -> (official filename, pinned official sha256, rescued derivative or None)
TARGETS = {
    "CR-180": (
        "CA__FORM__CR-180__petition-for-dismissal__REV-2024-01-01__EN.pdf",
        "06c1b64315ebd5c7f8260d7169abc2392d6373a202dc39f4788cb8a8c98bbdbe",
        "california-cr180-rescued.pdf",
    ),
    "CR-181": (
        "CA__FORM__CR-181__order-for-dismissal__REV-2024-01-01__EN.pdf",
        "f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504",
        "california-cr181-rescued.pdf",
    ),
    "CR-106": (
        "CA__FORM__CR-106__proof-of-service-criminal-record-clearing__REV-2020-01-01__EN.pdf",
        "f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a",
        "california-cr106-rescued.pdf",
    ),
    "MC-025": (
        "CA__FORM__MC-025__attachment-to-judicial-council-form__REV-2009-07-01__EN.pdf",
        "b0ca1509f2c3de152518079de7c1eb2771eaa1eb7da457c2e918498894f6f0af",
        None,
    ),
    "MC-031": (
        "CA__FORM__MC-031__attached-declaration__REV-2005-07-01__EN.pdf",
        "defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075",
        None,
    ),
}


RESCUE_REPORT = "data/rcap-all50/overlays/encrypted-pdf-rescue-report.json"


def rescue_provenance(rescued_name):
    """What the repository itself records about how a derivative was produced."""
    if not os.path.exists(RESCUE_REPORT):
        return {"recordFound": False,
                "note": "no encrypted-pdf-rescue-report.json in this tree"}
    report = json.load(open(RESCUE_REPORT))
    for t in report.get("targets", []):
        if os.path.basename(t.get("rescuedPdfPath", "")) == rescued_name:
            return {
                "recordFound": True,
                "record": RESCUE_REPORT,
                "producedAt": report.get("generatedAt"),
                "producedBy": "qpdf",
                "qpdfPathAtRescueTime": report.get("tools", {}).get("qpdf"),
                "method": t.get("successfulMethod"),
                "invocation": "qpdf --decrypt <input> <output> "
                              "(no --password argument; the user password is empty)",
                "readFromTree": report.get("sourceDir"),
                "readFromRelativePath": t.get("sourceRelativePath"),
                "sourceSha256Before": t.get("sourceSha256Before"),
                "sourceSha256After": t.get("sourceSha256After"),
                "sourceUnchangedByRescue":
                    t.get("sourceSha256Before") == t.get("sourceSha256After"),
                "reclassifiedAs": [n for n in t.get("notes", [])
                                   if n.startswith("rescued_reclassification")],
                "errors": t.get("errors", []),
            }
    return {"recordFound": False,
            "note": "no target in the rescue report names %s" % rescued_name}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def rnd(x):
    # Round to 1e-6 so float formatting noise never reads as a geometry difference.
    return round(float(x), 6)


def qualified_name(field):
    parts = []
    node = field
    seen = 0
    while node is not None and seen < 64:
        t = node.get("/T")
        if t is not None:
            parts.append(str(t))
        node = node.get("/Parent")
        seen += 1
    return ".".join(reversed(parts))


def page_index_map(pdf):
    return {page.obj.objgen: i for i, page in enumerate(pdf.pages)}


def terminal_fields(pdf):
    """Walk the AcroForm tree to its terminal (leaf) fields.

    A node is an intermediate node only when its Kids are themselves fields --
    i.e. they carry /T. Kids without /T are widget annotations of this field.
    """
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


def read_page_content(page):
    """Concatenated content-stream bytes for one page.

    /Contents may be a single stream or an array of streams; PDF treats an array
    as one operator stream with the parts joined by whitespace. Joining with a
    newline here makes the hash independent of how the parts were split, so a
    writer that merely re-split the streams does not read as a content change.
    Read-only: contents_coalesce() would mutate the document, so it is not used.
    """
    obj = page.obj.get("/Contents")
    if obj is None:
        return b""
    if isinstance(obj, pikepdf.Array):
        return b"\n".join(bytes(part.read_bytes()) for part in obj)
    return bytes(obj.read_bytes())


def describe(path):
    """Structural description of one PDF, in page coordinates."""
    pdf = pikepdf.open(path)  # empty user password
    pidx = page_index_map(pdf)

    pages = []
    for page in pdf.pages:
        mb = [rnd(v) for v in page.MediaBox]
        cb = [rnd(v) for v in page.CropBox] if "/CropBox" in page else None
        content = read_page_content(page)
        pages.append(
            {
                "mediaBox": mb,
                "cropBox": cb,
                "rotate": int(page.get("/Rotate", 0)),
                "contentStreamSha256": hashlib.sha256(content).hexdigest(),
                "contentStreamBytes": len(content),
            }
        )

    fields = {}
    for f in terminal_fields(pdf):
        name = qualified_name(f)
        widgets = []
        # A terminal field is either merged with its single widget, or has Kids
        # that are pure widget annotations.
        nodes = f.get("/Kids") if f.get("/Kids") is not None else [f]
        for w in nodes:
            rect = w.get("/Rect")
            page_ref = w.get("/P")
            widgets.append(
                {
                    "rect": [rnd(v) for v in rect] if rect is not None else None,
                    "pageIndex": pidx.get(page_ref.objgen) if page_ref is not None else None,
                    "flags": int(w.get("/F", 0)),
                }
            )
        widgets.sort(key=lambda w: (w["pageIndex"] if w["pageIndex"] is not None else -1,
                                    w["rect"] or []))
        fields[name] = {
            "fieldType": str(f.get("/FT")) if f.get("/FT") is not None else None,
            "fieldFlags": int(f.get("/Ff", 0)),
            "maxLen": int(f["/MaxLen"]) if "/MaxLen" in f else None,
            "widgets": widgets,
        }

    enc = pdf.encryption if pdf.is_encrypted else None
    return {
        "pageCount": len(pdf.pages),
        "pages": pages,
        "fieldCount": len(fields),
        "fields": fields,
        "encryption": None
        if enc is None
        else {
            "handler": "Standard",
            "V": enc.V,
            "R": enc.R,
            "bits": enc.bits,
            "streamMethod": str(enc.stream_method),
            "stringMethod": str(enc.string_method),
            "openedWithEmptyUserPassword": True,
        },
        "permissions": {
            "modifyForm": bool(pdf.allow.modify_form),
            "modifyOther": bool(pdf.allow.modify_other),
            "extract": bool(pdf.allow.extract),
            "print": bool(pdf.allow.print_highres or pdf.allow.print_lowres),
            "accessibility": bool(pdf.allow.accessibility),
        },
    }


def diff(official, derivative):
    """Every way the derivative differs from the official, in page coordinates."""
    d = {"pageCount": None, "pageGeometry": [], "fieldsOnlyInOfficial": [],
         "fieldsOnlyInDerivative": [], "fieldDifferences": [],
         "contentStreamIdenticalPages": [], "contentStreamChangedPages": []}

    if official["pageCount"] != derivative["pageCount"]:
        d["pageCount"] = {"official": official["pageCount"],
                          "derivative": derivative["pageCount"]}

    for i in range(min(official["pageCount"], derivative["pageCount"])):
        o, r = official["pages"][i], derivative["pages"][i]
        for key in ("mediaBox", "cropBox", "rotate"):
            if o[key] != r[key]:
                d["pageGeometry"].append(
                    {"pageIndex": i, "property": key, "official": o[key], "derivative": r[key]}
                )
        if o["contentStreamSha256"] == r["contentStreamSha256"]:
            d["contentStreamIdenticalPages"].append(i)
        else:
            d["contentStreamChangedPages"].append(
                {"pageIndex": i,
                 "officialBytes": o["contentStreamBytes"],
                 "derivativeBytes": r["contentStreamBytes"],
                 "officialSha256": o["contentStreamSha256"],
                 "derivativeSha256": r["contentStreamSha256"]}
            )

    on, rn = set(official["fields"]), set(derivative["fields"])
    d["fieldsOnlyInOfficial"] = sorted(on - rn)
    d["fieldsOnlyInDerivative"] = sorted(rn - on)

    for name in sorted(on & rn):
        o, r = official["fields"][name], derivative["fields"][name]
        deltas = {}
        for key in ("fieldType", "fieldFlags", "maxLen"):
            if o[key] != r[key]:
                deltas[key] = {"official": o[key], "derivative": r[key]}
        if len(o["widgets"]) != len(r["widgets"]):
            deltas["widgetCount"] = {"official": len(o["widgets"]),
                                     "derivative": len(r["widgets"])}
        else:
            moved = [
                {"widget": i, "official": ow, "derivative": rw}
                for i, (ow, rw) in enumerate(zip(o["widgets"], r["widgets"]))
                if ow != rw
            ]
            if moved:
                deltas["widgets"] = moved
        if deltas:
            d["fieldDifferences"].append({"field": name, "deltas": deltas})
    return d


def main():
    report = {
        "schemaVersion": "rcap-census-v1-source-fidelity-comparison/v1",
        "worklistGroupId": "ca-1203-4-set",
        "question": "Is the official binary readable directly, and does each committed "
                    "rescued derivative describe the same document field by field?",
        "method": {
            "officialReadBy": "pikepdf/qpdf %s, empty user password" % pikepdf.__libqpdf_version__,
            "comparedInCoordinateSystem": "unrotated PDF page coordinates (points)",
            "note": "No PDF was written and no derivative was modified.",
        },
        "forms": {},
    }

    for form, (official_name, pinned, rescued_name) in TARGETS.items():
        official_path = os.path.join(FORMS_DIR, official_name)
        entry = {"officialPath": os.path.join("STATES/CA/02_PACKET_FORMS", official_name)}

        observed = sha256(official_path)
        entry["pinnedOfficialSha256"] = pinned
        entry["observedOfficialSha256"] = observed
        entry["officialSha256Verified"] = observed == pinned
        if not entry["officialSha256Verified"]:
            entry["binding"] = "MISMATCH"
            report["forms"][form] = entry
            continue
        entry["binding"] = "BOUND_EXACT"

        try:
            official = describe(official_path)
            entry["officialReadableDirectly"] = True
            entry["official"] = {k: official[k] for k in
                                 ("pageCount", "fieldCount", "encryption", "permissions")}
            entry["officialPageGeometry"] = [
                {"pageIndex": i, "mediaBox": p["mediaBox"], "cropBox": p["cropBox"],
                 "rotate": p["rotate"]}
                for i, p in enumerate(official["pages"])
            ]
        except Exception as exc:  # noqa: BLE001 - the failure itself is the finding
            entry["officialReadableDirectly"] = False
            entry["officialReadError"] = "%s: %s" % (type(exc).__name__, exc)
            report["forms"][form] = entry
            continue

        if rescued_name is None:
            entry["derivative"] = None
            entry["derivativeComparison"] = "NO_DERIVATIVE_EXISTS"
            report["forms"][form] = entry
            continue

        rescued_path = os.path.join(RESCUED_DIR, rescued_name)
        derivative = describe(rescued_path)
        entry["derivativePath"] = rescued_path
        entry["derivativeSha256"] = sha256(rescued_path)
        prov = rescue_provenance(rescued_name)
        # The rescue report asserts which bytes it read. That assertion is
        # checkable now, because we hold the official bytes it names.
        prov["rescueInputMatchesPinnedOfficial"] = (
            prov.get("sourceSha256Before") == pinned
        )
        entry["derivativeProvenance"] = prov
        entry["derivative"] = {k: derivative[k] for k in
                               ("pageCount", "fieldCount", "encryption", "permissions")}

        delta = diff(official, derivative)
        identical = (
            delta["pageCount"] is None
            and not delta["pageGeometry"]
            and not delta["fieldsOnlyInOfficial"]
            and not delta["fieldsOnlyInDerivative"]
            and not delta["fieldDifferences"]
        )
        entry["derivativeComparison"] = (
            "IDENTICAL_FIELD_SET_AND_GEOMETRY" if identical else "DIVERGES"
        )
        entry["contentStreamsIdentical"] = not delta["contentStreamChangedPages"]
        entry["delta"] = delta
        report["forms"][form] = entry

    out = ("data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/"
           "reports/source-fidelity-official-vs-rescued.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as fh:
        json.dump(report, fh, indent=2)
        fh.write("\n")
    print("wrote %s" % out)
    for form, e in report["forms"].items():
        print("  %-7s %-12s officialReadableDirectly=%-5s  %s" % (
            form, e["binding"], e.get("officialReadableDirectly"),
            e.get("derivativeComparison")))


if __name__ == "__main__":
    main()
