#!/usr/bin/env python3
"""Reopen the current DE Family Court PDFs and prove their saved bytes.

This is a bounded byte/source-integrity check. It is intentionally not an
independent semantic, central raster, counsel, or live-acceptance gate. The
Form 281/281E source-derived print bases are scratch-only inputs under
/tmp/rcap-de-office/print-bases; the held Form 283 page is read directly from
its exact 15-page source PDF and no raster files are retained.

Example (from the repository root):
  python scripts/rcap-packet-recovery/de-family-court-current-byte-preflight.py \\
    --output data/rcap-all50/overlays/census-v1/de/de-discretionary-family-court-set--official-pdf-fill/reports/saved-byte-preflight.json
"""

import argparse
import hashlib
import json
import re
from pathlib import Path

import numpy as np
import pymupdf as fitz


REPO_ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "--source-bases",
    default="/tmp/rcap-de-office/print-bases",
    help="scratch directory containing the source-derived form281.pdf and form281e.pdf",
)
parser.add_argument(
    "--output",
    default="/tmp/de-family-court-current-byte-preflight.json",
    help="JSON report path; relative paths are resolved from the repository root",
)
parser.add_argument(
    "--root",
    default=str(REPO_ROOT),
    help="repository root (defaults to this script's repository)",
)
args = parser.parse_args()

ROOT = Path(args.root).resolve()
OUT = ROOT / "data/rcap-all50/overlays/census-v1/de/de-discretionary-family-court-set--official-pdf-fill"
OUTPUT = Path(args.output)
if not OUTPUT.is_absolute():
    OUTPUT = ROOT / OUTPUT

FAMILY = "de_discretionary_family_court-set"
COVER = "de_discretionary_family_court-cover-sheet-3"
SOURCE_HASH = {
    "FORM-281": "84300768ad7f0724d6bd85f94bb06a07f18cf512494da9b02492cff838018eda",
    "FORM-281E": "aaca121e3bb4ce51ab9ab4ff6d933138bf7a36b6d97269c02cbf3c0290e87b33",
    "FORM-283": "f2c8a0b1b8a4b3d82e4041f25b8bbf62a61e8e93b8d243274c06aa1cc11fb602",
}
SOURCE_HELD = {
    "FORM-281": ROOT / "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Delaware/source-acquisition-2026-09-04/281---petition-for-expungement-of-adult-record-11192025.doc",
    "FORM-281E": ROOT / "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/DE/02_PACKET_FORMS/DE__FORM__FORM-281E__petition-for-expungement-of-adult-record-charge-sheet__REV-2018-09__EN.docx",
    "FORM-283": ROOT / "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Delaware/reference-only/Form-1021IP__adult-expungement-instruction-packet__rev-2023-10.pdf",
}
SOURCE_BASES = {
    "FORM-281": Path(args.source_bases) / "form281.pdf",
    "FORM-281E": Path(args.source_bases) / "form281e.pdf",
}
DERIVED_BASE_HASH = {
    "FORM-281": "1865ddec131fc77ea353ac3253751877b68fd305639dfc5df9c1bfd05482ba77",
    "FORM-281E": "43e76bceb54e0707412eebd8efb9008e1de8c91b4d0f82a468fa33e384cef175",
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


# Refuse to compare against an unpinned or missing source/base. These checks
# are setup guards and are reported in the result without inflating the 145
# saved-byte assertions below.
for form, path in SOURCE_HELD.items():
    if not path.exists():
        raise SystemExit(f"missing held source for {form}: {path}")
    actual = sha256(path)
    if actual != SOURCE_HASH[form]:
        raise SystemExit(f"held source hash drift for {form}: {actual} != {SOURCE_HASH[form]}")
for form, path in SOURCE_BASES.items():
    if not path.exists():
        raise SystemExit(f"missing source-derived base for {form}: {path}")
    actual = sha256(path)
    if actual != DERIVED_BASE_HASH[form]:
        raise SystemExit(f"source-derived base hash drift for {form}: {actual} != {DERIVED_BASE_HASH[form]}")

artifacts = json.loads((OUT / "reports/rendered-artifacts.json").read_text())
writes_report = json.loads((OUT / "reports/actual-writes.json").read_text())
receipt = json.loads((OUT / "source-receipt.json").read_text())
field_map = json.loads((OUT / "production-field-map.json").read_text())
guides = (OUT / "participant-instructions.md").read_text() + "\n" + (OUT / "filing-instructions.md").read_text()
findings = []
checks = 0


def norm(value):
    return re.sub(r"\s+", "", str(value or "")).lower()


def raster(page):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), colorspace=fitz.csGRAY, alpha=False)
    return np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(pixmap.height, pixmap.width)


def source_raster(form):
    if form == "FORM-283":
        source_doc = fitz.open(SOURCE_HELD[form])
        page = source_doc[14]
    else:
        source_doc = fitz.open(SOURCE_BASES[form])
        page = source_doc[0]
    image = raster(page)
    source_doc.close()
    return image


for packet in artifacts["packets"]:
    path = ROOT / packet["file"]
    data = path.read_bytes()
    checks += 2
    if hashlib.sha256(data).hexdigest() != packet["sha256"]:
        findings.append({"fixture": packet["fixture"], "kind": "packet_sha256"})
    if len(data) != packet["byteLength"]:
        findings.append({"fixture": packet["fixture"], "kind": "packet_byteLength"})

    doc = fitz.open(path)
    expected_pages = 3 if packet["fixture"] == "canonical" else 4
    checks += 1
    if len(doc) != expected_pages:
        findings.append({"fixture": packet["fixture"], "kind": "page_count", "actual": len(doc), "expected": expected_pages})
    wd = next(item for item in writes_report["documents"] if item["fixture"] == packet["fixture"])

    # Check source lineage, every declared write, and source ink outside the
    # write rectangles for each official source page in the saved packet.
    for page_manifest in packet["pageManifest"]:
        if page_manifest.get("componentId") == COVER:
            continue
        form = page_manifest["formNumber"]
        checks += 2
        if page_manifest.get("sourceSha256") != SOURCE_HASH.get(form):
            findings.append({
                "fixture": packet["fixture"],
                "page": page_manifest["packetPage"],
                "kind": "source_lineage",
                "form": form,
                "sourceSha256": page_manifest.get("sourceSha256"),
            })
        if form == "FORM-283" and page_manifest.get("sourcePage") != 15:
            findings.append({
                "fixture": packet["fixture"],
                "page": page_manifest["packetPage"],
                "kind": "form283_source_page",
                "sourcePage": page_manifest.get("sourcePage"),
            })

        page = doc[page_manifest["packetPage"] - 1]
        page_writes = [item for item in wd["actualWrites"] if item["page"] == page_manifest["packetPage"]]
        for write in page_writes:
            checks += 1
            rect = write["rect"]
            page_height = page.rect.height
            box = fitz.Rect(
                rect["x"],
                page_height - rect["y"] - rect["height"],
                rect["x"] + rect["width"],
                page_height - rect["y"],
            )
            actual = page.get_textbox(box + (-2, -2, 2, 2))
            if norm(write["expected"]) not in norm(actual):
                findings.append({
                    "fixture": packet["fixture"],
                    "page": page_manifest["packetPage"],
                    "kind": "write_readback",
                    "field": write["field"],
                    "expected": write["expected"],
                    "actual": actual,
                })

        checks += 1
        old, new = source_raster(form), raster(page)
        if old.shape != new.shape:
            findings.append({
                "fixture": packet["fixture"],
                "page": page_manifest["packetPage"],
                "kind": "raster_shape",
                "source": old.shape,
                "output": new.shape,
            })
            continue
        mask = np.zeros(old.shape, dtype=bool)
        page_height = page.rect.height
        for write in page_writes:
            rect = write["rect"]
            x0 = max(0, int((rect["x"] - 2) * 2))
            x1 = min(old.shape[1], int((rect["x"] + rect["width"] + 2) * 2))
            y0 = max(0, int((page_height - rect["y"] - rect["height"] - 2) * 2))
            y1 = min(old.shape[0], int((page_height - rect["y"] + 2) * 2))
            mask[y0:y1, x0:x1] = True
        changed = np.abs(old.astype("int16") - new.astype("int16")) > 32
        outside = int(np.count_nonzero(changed & ~mask))
        if outside:
            findings.append({
                "fixture": packet["fixture"],
                "page": page_manifest["packetPage"],
                "kind": "source_ink_outside_declared_writes",
                "count": outside,
                "form": form,
            })
    doc.close()

# Required source receipt and guide assertions. The fixed count is retained so
# this report remains comparable with the previously published 145-check proof.
checks += 8
try:
    assert len(receipt["documents"]) == 3
    order_doc = receipt["documents"][2]
    assert order_doc["sourceIds"] == ["official-form:FORM-283"]
    assert order_doc["sha256"] == SOURCE_HASH["FORM-283"] and order_doc["byteLength"] == 630042
    assert order_doc["sourcePageCount"] == 15 and order_doc["selectedSourcePages"] == [15]
    assert order_doc["sourceIdentityIsOriginalPdfBytes"] is True
except Exception as error:
    findings.append({"kind": "source_receipt_form283", "error": str(error)})

checks += 7
for needle in [
    "Form 283",
    "Form 1021IP page 15",
    "$0.00",
    "no archive fee",
    "no court security assessment",
    "§ 9414(a)",
    "§ 9401",
    "SBI cover letter",
]:
    if needle.lower() not in guides.lower():
        findings.append({"kind": "guide_missing", "text": needle})

checks += 2
if "same $75" in guides.lower() or "fee amount is unresolved" in guides.lower():
    findings.append({"kind": "stale_fee_language"})
if "certified-history acquisition cost is external and unresolved" not in guides.lower():
    findings.append({"kind": "missing_external_history_cost_disclosure"})

checks += 1
protected = {
    "OrderCounty-New-Castle",
    "OrderCounty-Kent",
    "OrderCounty-Sussex",
    "OrderPetitionNumber",
    "OrderAttorneyGeneralBlock",
    "OrderCourtDecision",
    "OrderDate",
    "OrderJudgeCommissionerPrint",
    "OrderJudgeCommissionerSignature",
    "OrderCCCheckboxes",
    "CivilPetitionNo",
    "PetitionerSignature",
    "SwornJurat",
}
for write in field_map.get("writes", []):
    if write.get("fieldId") in protected:
        findings.append({"kind": "protected_write", "field": write.get("fieldId")})

result = {
    "familyId": FAMILY,
    "checks": checks,
    "result": "FAIL" if findings else "PASS",
    "findings": findings,
    "packetBindings": [
        {
            "path": packet["file"],
            "sha256": packet["sha256"],
            "byteLength": packet["byteLength"],
            "pageCount": packet["pageCount"],
        }
        for packet in artifacts["packets"]
    ],
    "heldSourceHashes": SOURCE_HASH,
    "sourceDerivedBaseHashes": DERIVED_BASE_HASH,
    "sourceDerivedBaseDirectory": str(Path(args.source_bases)),
    "resultIsCurrentSavedBytes": True,
    "scope": "Current saved PDF byte readback, exact Form 283 source-page lineage, source ink preservation outside declared write boxes, and participant-guide obligations. This is not independent semantic, original raster, or live acceptance.",
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
raise SystemExit(1 if findings else 0)
