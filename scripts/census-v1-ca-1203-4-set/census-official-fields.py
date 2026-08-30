#!/usr/bin/env python3
"""Field census for ca-1203-4-set, read from the SHA-256-bound official binaries.

Every rectangle here is read from the official document. No derivative is
opened. The five sources are re-bound by SHA-256 on every run, and the census
refuses to emit if any one of them fails to bind, so a census can never describe
a document other than the pinned one.

It also writes each page's decoded content stream into a scratch directory so
that scripts/lib/pdf-stroked-boxes.mjs -- which takes a content stream, not a
PDFDocument, and so is usable on an encrypted source -- can measure the boxes
the form actually draws. The scratch directory is a build temporary and is
never committed.

Requires pikepdf (qpdf bindings); pdf-lib 1.17.1 cannot open these inputs.
"""

import hashlib
import json
import os
import re
import sys

import pikepdf

CORPUS = os.environ.get(
    "RCAP_BUNDLE_EXTRACT",
    "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
)
FORMS_DIR = os.path.join(CORPUS, "STATES/CA/02_PACKET_FORMS")
OUT_DIR = ("data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/"
           "reports")
SCRATCH = os.environ.get("CA_1203_4_SCRATCH", "/tmp/ca-1203-4-set-content")

ORDER = ["CR-180", "CR-181", "CR-106", "MC-025", "MC-031"]
TARGETS = {
    "CR-180": ("CA__FORM__CR-180__petition-for-dismissal__REV-2024-01-01__EN.pdf",
               "06c1b64315ebd5c7f8260d7169abc2392d6373a202dc39f4788cb8a8c98bbdbe",
               "Petition for dismissal"),
    "CR-181": ("CA__FORM__CR-181__order-for-dismissal__REV-2024-01-01__EN.pdf",
               "f737503a89465d40206b11b1123e815e44a249d324bad16d313c337a695ce504",
               "Order for dismissal (proposed)"),
    "CR-106": ("CA__FORM__CR-106__proof-of-service-criminal-record-clearing__REV-2020-01-01__EN.pdf",
               "f8a37a9a8c30a016b432bb39fd67407717c3dee7be74bc3e3d471127bf190c5a",
               "Proof of service"),
    "MC-025": ("CA__FORM__MC-025__attachment-to-judicial-council-form__REV-2009-07-01__EN.pdf",
               "b0ca1509f2c3de152518079de7c1eb2771eaa1eb7da457c2e918498894f6f0af",
               "Attachment to Judicial Council form"),
    "MC-031": ("CA__FORM__MC-031__attached-declaration__REV-2005-07-01__EN.pdf",
               "defc9108f6baa4c2ca444c1571d737d841af78289bef337f874f51e595191075",
               "Attached declaration"),
}

# Field-flag bits (PDF 32000-1 table 221/226/228), 1-based in the spec.
TX_FLAGS = {13: "multiline", 14: "password", 21: "fileSelect", 23: "doNotSpellCheck",
            24: "doNotScroll", 25: "comb", 26: "richText"}
BTN_FLAGS = {15: "noToggleToOff", 16: "radio", 17: "pushButton",
             26: "radiosInUnison"}
CH_FLAGS = {18: "combo", 19: "edit", 20: "sort", 22: "multiSelect",
            23: "doNotSpellCheck", 27: "commitOnSelChange"}
COMMON_FLAGS = {1: "readOnly", 2: "required", 3: "noExport"}


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def rnd(x):
    return round(float(x), 2)


def decode_flags(ff, ft):
    names = dict(COMMON_FLAGS)
    names.update({"/Tx": TX_FLAGS, "/Btn": BTN_FLAGS, "/Ch": CH_FLAGS}.get(ft, {}))
    return sorted(name for bit, name in names.items() if ff & (1 << (bit - 1)))


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


def read_page_content(page):
    obj = page.obj.get("/Contents")
    if obj is None:
        return b""
    if isinstance(obj, pikepdf.Array):
        return b"\n".join(bytes(part.read_bytes()) for part in obj)
    return bytes(obj.read_bytes())


def _mat_apply(m, x, y):
    return (m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5])


def mark_region(widget, rect):
    """Where the tick is actually painted, in page coordinates.

    A widget's appearance stream does not necessarily paint the whole /Rect.
    On these forms the "on" appearance opens with a clip inset from its BBox --
    e.g. `q 1 1 7 7 re W n` inside a 9x9 BBox -- so the glyph lands in a region
    1pt smaller on every side than the widget. That inset is the difference
    between "the mark is inside the printed box" and "the widget overhangs it",
    on MC-031 in particular, so it is read from the stream rather than assumed.

    The appearance is mapped onto /Rect the standard way: transform BBox by
    /Matrix, take its bounds, then scale and translate those bounds onto /Rect.
    """
    ap = widget.get("/AP")
    if ap is None or "/N" not in ap:
        return None
    n = ap["/N"]
    try:
        states = list(n.keys())
    except AttributeError:
        return None
    on = [k for k in states if str(k) != "/Off"]
    if not on:
        return None
    stream = n[on[0]]
    try:
        body = bytes(stream.read_bytes()).decode("latin1")
        bbox = [float(v) for v in stream.BBox]
    except Exception:
        return None
    matrix = [float(v) for v in stream.get("/Matrix", [1, 0, 0, 1, 0, 0])]

    m = re.search(r"([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+re\s+W\s+n", body)
    if m:
        cx, cy, cw, ch = (float(v) for v in m.groups())
        clip = [min(cx, cx + cw), min(cy, cy + ch), max(cx, cx + cw), max(cy, cy + ch)]
        basis = "appearance clip"
    else:
        clip = [min(bbox[0], bbox[2]), min(bbox[1], bbox[3]),
                max(bbox[0], bbox[2]), max(bbox[1], bbox[3])]
        basis = "appearance BBox (no clip in the stream)"

    corners = [_mat_apply(matrix, bbox[0], bbox[1]), _mat_apply(matrix, bbox[2], bbox[1]),
               _mat_apply(matrix, bbox[2], bbox[3]), _mat_apply(matrix, bbox[0], bbox[3])]
    tx0 = min(c[0] for c in corners); tx1 = max(c[0] for c in corners)
    ty0 = min(c[1] for c in corners); ty1 = max(c[1] for c in corners)
    sx = (rect[2] - rect[0]) / (tx1 - tx0) if tx1 > tx0 else 1.0
    sy = (rect[3] - rect[1]) / (ty1 - ty0) if ty1 > ty0 else 1.0

    c0 = _mat_apply(matrix, clip[0], clip[1])
    c1 = _mat_apply(matrix, clip[2], clip[3])
    px0 = rect[0] + (min(c0[0], c1[0]) - tx0) * sx
    px1 = rect[0] + (max(c0[0], c1[0]) - tx0) * sx
    py0 = rect[1] + (min(c0[1], c1[1]) - ty0) * sy
    py1 = rect[1] + (max(c0[1], c1[1]) - ty0) * sy
    return {"rect": [rnd(px0), rnd(py0), rnd(px1), rnd(py1)], "basis": basis}


def on_states(widget):
    """The /AP /N appearance state names a button can be set to, excluding /Off.

    A checkbox is set by writing its own on-state name, which is NOT always /Yes
    on Judicial Council forms. Guessing it produces a box that stays empty.
    """
    ap = widget.get("/AP")
    if ap is None or "/N" not in ap:
        return []
    n = ap["/N"]
    try:
        return sorted(str(k).lstrip("/") for k in n.keys() if str(k) != "/Off")
    except AttributeError:
        return []  # /N is a stream: not a state-bearing button


def census_form(form, path, pinned):
    observed = sha256_file(path)
    if observed != pinned:
        raise SystemExit("%s: SHA-256 mismatch, refusing to census.\n  pinned   %s\n"
                         "  observed %s" % (form, pinned, observed))

    pdf = pikepdf.open(path)
    pidx = {p.obj.objgen: i for i, p in enumerate(pdf.pages)}
    acro = pdf.Root.AcroForm

    os.makedirs(os.path.join(SCRATCH, form), exist_ok=True)
    pages = []
    for i, page in enumerate(pdf.pages):
        content = read_page_content(page)
        with open(os.path.join(SCRATCH, form, "page-%02d.txt" % (i + 1)), "wb") as fh:
            fh.write(content)
        pages.append({
            "pageIndex": i,
            "mediaBox": [rnd(v) for v in page.MediaBox],
            "cropBox": [rnd(v) for v in page.CropBox] if "/CropBox" in page else None,
            "rotate": int(page.get("/Rotate", 0)),
            "contentStreamSha256": hashlib.sha256(content).hexdigest(),
        })

    fields = []
    for f in terminal_fields(pdf):
        ft = str(f.get("/FT")) if f.get("/FT") is not None else None
        ff = int(f.get("/Ff", 0))
        widgets = []
        nodes = f.get("/Kids") if f.get("/Kids") is not None else [f]
        for w in nodes:
            rect = w.get("/Rect")
            if rect is None:
                continue
            x0, y0, x1, y1 = (float(v) for v in rect)
            lo_x, hi_x = min(x0, x1), max(x0, x1)
            lo_y, hi_y = min(y0, y1), max(y0, y1)
            page_ref = w.get("/P")
            widgets.append({
                "pageIndex": pidx.get(page_ref.objgen) if page_ref is not None else None,
                "rect": [rnd(lo_x), rnd(lo_y), rnd(hi_x), rnd(hi_y)],
                "width": rnd(hi_x - lo_x),
                "height": rnd(hi_y - lo_y),
                "onStates": on_states(w) if ft == "/Btn" else [],
                "markRegion": mark_region(w, (lo_x, lo_y, hi_x, hi_y))
                              if ft == "/Btn" else None,
                "hidden": bool(int(w.get("/F", 0)) & 0b10),
            })
        widgets.sort(key=lambda w: (w["pageIndex"] if w["pageIndex"] is not None else -1,
                                    -w["rect"][3], w["rect"][0]))
        tu = f.get("/TU")
        opt = f.get("/Opt")
        fields.append({
            "name": qualified_name(f),
            "shortName": str(f.get("/T")) if f.get("/T") is not None else None,
            "fieldType": ft,
            "flags": decode_flags(ff, ft),
            "rawFf": ff,
            "maxLen": int(f["/MaxLen"]) if "/MaxLen" in f else None,
            "tooltip": str(tu) if tu is not None else None,
            "options": [str(o) for o in opt] if opt is not None else None,
            "widgetCount": len(widgets),
            "widgets": widgets,
        })
    fields.sort(key=lambda f: (
        f["widgets"][0]["pageIndex"] if f["widgets"] else 99,
        -f["widgets"][0]["rect"][3] if f["widgets"] else 0,
        f["widgets"][0]["rect"][0] if f["widgets"] else 0,
    ))

    return {
        "formNumber": form,
        "officialPath": os.path.join("STATES/CA/02_PACKET_FORMS", os.path.basename(path)),
        "pinnedOfficialSha256": pinned,
        "observedOfficialSha256": observed,
        "sha256Verified": True,
        "measuredOff": "official binary",
        "acroForm": {
            "isHybridXfa": "/XFA" in acro,
            "needsRendering": bool(pdf.Root.get("/NeedsRendering", False)),
            "sigFlags": int(acro["/SigFlags"]) if "/SigFlags" in acro else 0,
            "needAppearances": bool(acro.get("/NeedAppearances", False)),
        },
        "pageCount": len(pdf.pages),
        "pages": pages,
        "terminalFieldCount": len(fields),
        "fields": fields,
    }


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    forms = {}
    for form in ORDER:
        filename, pinned, role = TARGETS[form]
        entry = census_form(form, os.path.join(FORMS_DIR, filename), pinned)
        entry["role"] = role
        forms[form] = entry

    report = {
        "schemaVersion": "rcap-census-v1-field-census/v1",
        "worklistGroupId": "ca-1203-4-set",
        "jurisdiction": "CA",
        "implementationStrategy": "official_pdf_fill",
        "measurementBasis": {
            "surface": "the official binary, bound by exact SHA-256 on this run",
            "derivativesUsed": False,
            "readBy": "pikepdf/qpdf %s, empty user password" % pikepdf.__libqpdf_version__,
            "coordinateSystem": "PDF page coordinates (points), origin bottom-left; "
                                "every page is 612x792 with CropBox == MediaBox and "
                                "/Rotate 0, so no transform is applied",
            "rectConvention": "[x0, y0, x1, y1] normalised so x0<x1 and y0<y1",
        },
        "formOrder": ORDER,
        "forms": forms,
    }
    out = os.path.join(OUT_DIR, "field-census.json")
    with open(out, "w") as fh:
        json.dump(report, fh, indent=2)
        fh.write("\n")

    total = sum(f["terminalFieldCount"] for f in forms.values())
    print("wrote %s" % out)
    print("content streams -> %s (scratch, not committed)" % SCRATCH)
    for form in ORDER:
        f = forms[form]
        kinds = {}
        for fl in f["fields"]:
            kinds[fl["fieldType"]] = kinds.get(fl["fieldType"], 0) + 1
        print("  %-7s %d pages  %3d fields  %s  hybridXFA=%s"
              % (form, f["pageCount"], f["terminalFieldCount"],
                 dict(sorted(kinds.items())), f["acroForm"]["isHybridXfa"]))
    print("  total terminal fields: %d" % total)


if __name__ == "__main__":
    main()
