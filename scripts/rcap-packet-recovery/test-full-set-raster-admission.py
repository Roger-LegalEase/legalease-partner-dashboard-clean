#!/usr/bin/env python3
"""Controls for the full-set raster admission path.

The importer used to admit exactly two documents. It now admits the whole
declared set, which is only safe if the widening kept every binding it had: each
page must belong to a named document, carry that document's role, and land in
that document's own page-image directory. These controls construct a
three-document family and prove each of those bindings bites, and prove the
two-document shape is unchanged.

Every case that must be refused is asserted to raise, with the refusal message
checked, so a control that stops biting fails here rather than passing quietly.
"""
import copy
import importlib.util
import pathlib
import sys

MODULE = pathlib.Path(__file__).with_name("admit-completed-fixture-raster.py")
spec = importlib.util.spec_from_file_location("admit", MODULE)
admit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(admit)

FAMILY = "test_full_set-set"
DIGEST = "d" * 64
HOME = "data/rcap-all50/overlays/census-v1/xx/test-full-set-set--official-pdf-fill/fixtures"

DOCS = [
    ("canonical.pdf", "canonical", "a" * 64, 2),
    ("canonical--order.pdf", "canonical", "b" * 64, 1),
    ("boundary.pdf", "boundary", "c" * 64, 1),
]


def config():
    documents = [
        {"role": role, "document": name, "path": f"{HOME}/{name}", "sha256": digest,
         "pages": pages, "pageSizePt": [612, 792], "pngSizePx": [None, None]}
        for name, role, digest, pages in DOCS
    ]
    primary = {d["role"]: d for d in reversed(documents)}
    return {
        "familyId": FAMILY, "runId": 1, "packetCommit": "0" * 40,
        "expectedPdfs": {r: {"path": d["path"], "sha256": d["sha256"], "pages": d["pages"],
                             "pageSizePt": d["pageSizePt"], "pngSizePx": d["pngSizePx"]}
                         for r, d in primary.items()},
        "expectedDocuments": documents,
        "documentsDigest": DIGEST,
        "imageBytesReadBy": "this test",
    }


def row():
    return {"familyId": FAMILY, "documentsDigest": DIGEST,
            "documents": [{"name": n, "role": r, "path": f"{HOME}/{n}", "sha256": s, "pageCount": p}
                          for n, r, s, p in DOCS]}


def verdict(c):
    measurements = []
    for d in c["expectedDocuments"]:
        for page in range(1, d["pages"] + 1):
            measurements.append({
                "kind": d["role"], "document": d["document"], "page": page,
                "png": f"{FAMILY}/{admit.document_path(d['document'])}/page-{page:03d}.png",
                "bytes": 1000 + page, "nonblank": True, "croppedToThePage": True,
                "calibrationResidualPx": 0, "pageWidthPt": 612, "pageHeightPt": 792,
            })
    return {
        "schemaVersion": "rcap-raster-family-verdict/v1", "familyId": FAMILY,
        "verdict": "RASTER_PASS", "workflowRunId": "1", "packetCommitSha": "0" * 40,
        "documentsDigest": DIGEST, "problems": [], "environmentProblems": [],
        "packetPdfsModified": 0, "coversTheWholeFamily": True,
        "documentsRendered": [{"role": d["role"], "document": d["document"],
                               "path": d["path"], "pinned": d["sha256"]}
                              for d in c["expectedDocuments"]],
        "hashesBound": {r: {"path": e["path"], "pinned": e["sha256"]}
                        for r, e in c["expectedPdfs"].items()},
        "pagesMeasured": len(measurements), "measurements": measurements,
    }


def images(v):
    return {p["png"]: {"sha256": "e" * 64, "bytes": p["bytes"], "pngWidth": 2040, "pngHeight": 2640}
            for p in v["measurements"]}


RUN = {"id": 1, "status": "completed", "conclusion": "success",
       "path": ".github/workflows/rcap-packet-raster-acceptance-batch.yml"}
JOBS = [{"id": 1, "run_id": 1, "name": n, "status": "completed", "conclusion": "success"}
        for n in ["Synthetic canary and live negative controls", "Plan the family matrix", FAMILY]]

failures = []


def refuses(label, mutate, expected_message):
    c, r, v = config(), row(), None
    v = verdict(c)
    i = images(v)
    mutate(c, r, v, i)
    try:
        admit.validate(c, r, v, i, RUN, JOBS)
    except ValueError as e:
        if expected_message in str(e):
            print(f"  refused  {label}")
            return
        failures.append(f"{label}: refused for the wrong reason -- {e}")
        return
    failures.append(f"{label}: ACCEPTED, the control does not bite")


def admits(label, mutate=lambda *a: None):
    c, r = config(), row()
    v = verdict(c)
    i = images(v)
    mutate(c, r, v, i)
    try:
        measured = admit.validate(c, r, v, i, RUN, JOBS)
    except ValueError as e:
        failures.append(f"{label}: refused a sound receipt -- {e}")
        return
    print(f"  admitted {label} ({len(measured)} page image(s))")


# The positive case: three documents, two of them canonical, four pages.
admits("a three-document family whose receipt covers every document")


# Each document gets its OWN page-image directory. Two canonical documents
# sharing one would have overwritten each other's PNGs upstream, and the role
# alone cannot tell them apart here.
def collapse_to_role(c, r, v, i):
    for p in v["measurements"]:
        p["png"] = f"{FAMILY}/{p['kind']}/page-{p['page']:03d}.png"
    i.clear()
    i.update(images(v))


refuses("page images filed by role rather than by document", collapse_to_role,
        "wrong page image binding")


def wrong_role(c, r, v, i):
    v["measurements"][0]["kind"] = "boundary"


refuses("a page whose kind contradicts its document's role", wrong_role,
        "wrong page image binding")


def drop_rendered(c, r, v, i):
    v["documentsRendered"].pop()


refuses("a verdict that rendered fewer documents than the family declares",
        drop_rendered, "wrong rendered inputs")


def drop_from_row(c, r, v, i):
    r["documents"].pop()


refuses("a queue row carrying fewer documents than the receipt",
        drop_from_row, "extra/omitted document")


def duplicate_page(c, r, v, i):
    v["measurements"][1].update(document=v["measurements"][0]["document"],
                                kind=v["measurements"][0]["kind"],
                                page=v["measurements"][0]["page"])


refuses("the same page measured twice under two documents", duplicate_page,
        "duplicate/wrong page")


def unpinned_pair(c, r, v, i):
    c["expectedPdfs"]["canonical"]["sha256"] = "9" * 64
    v["hashesBound"]["canonical"]["pinned"] = "9" * 64


refuses("a pinned pair that names bytes no rendered document carries",
        unpinned_pair, "the pinned pair is not among the rendered documents")


def duplicate_declaration(c, r, v, i):
    c["expectedDocuments"].append(copy.deepcopy(c["expectedDocuments"][0]))


refuses("a document declared twice", duplicate_declaration, "declared twice")


def one_role_only(c, r, v, i):
    for d in c["expectedDocuments"]:
        d["role"] = "canonical"


refuses("a declared set with no boundary at all", one_role_only,
        "both roles must be rendered")


# The two-document shape is unchanged: a config with no expectedDocuments is
# derived exactly as it always was, and still refuses anything but a pair.
def two_document_config(c, r, v, i):
    keep = [d for d in c["expectedDocuments"] if d["document"] in ("canonical.pdf", "boundary.pdf")]
    c["expectedDocuments"] = keep
    c["expectedPdfs"] = {d["role"]: {k: d[k] for k in ("path", "sha256", "pages", "pageSizePt", "pngSizePx")}
                         for d in keep}
    r["documents"] = [d for d in r["documents"] if d["name"] in ("canonical.pdf", "boundary.pdf")]
    v["documentsRendered"] = [{"role": d["role"], "document": d["document"],
                               "path": d["path"], "pinned": d["sha256"]} for d in keep]
    v["hashesBound"] = {r_: {"path": e["path"], "pinned": e["sha256"]}
                        for r_, e in c["expectedPdfs"].items()}
    v["measurements"] = [p for p in v["measurements"]
                         if p["document"] in ("canonical.pdf", "boundary.pdf")]
    v["pagesMeasured"] = len(v["measurements"])
    i.clear()
    i.update(images(v))


def derived_two_document(c, r, v, i):
    two_document_config(c, r, v, i)
    del c["expectedDocuments"]


admits("a two-document config with no expectedDocuments, derived as before",
       derived_two_document)


def three_documents_without_declaring_them(c, r, v, i):
    del c["expectedDocuments"]


refuses("three rendered documents with only a pair declared",
        three_documents_without_declaring_them, "extra/omitted document")

if failures:
    print("\nfull-set raster admission controls FAILED:")
    for f in failures:
        print(f"- {f}")
    sys.exit(1)
print("\nfull-set raster admission: 11 control(s) held.")
