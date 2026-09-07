#!/usr/bin/env python3
"""Read-only, exact-candidate IL source-byte and text-position evidence.

Requires PyMuPDF. This does not render/build packets or approve their content.
It intentionally refuses inputs other than the reviewed thirteen-page candidate.
"""
import argparse
import hashlib
import json
from pathlib import Path
from typing import Any
import fitz

SOURCES = [
    ("EXP-AD Request", "IL__FORM__EXP-AD-REQUEST__request-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", 0, 6, "44792beaede1d03f5ea65e61dba00cdf5cb9b7c617f7ff265e55e92576cd7853"),
    ("EXP-AD Case List", "CODEX-CS2-SRC1__EXP-AD-CASE-LIST__b72d30d274b0.pdf", 6, 1, "b72d30d274b061e0671933b8bd65abf7d2c37a6f1dd4ebfbf3968bc55b9bed0c"),
    ("EXP-AD Order Granting", "IL__FORM__EXP-AD-ORDER-GRANTING__order-to-expunge-and-or-seal-criminal-records__REV-2026-06__EN.pdf", 7, 2, "52e06b58008d797aa861902bf6b85e281804af8b4a397c591fc1c270b0151305"),
    ("FW-CIV-APPLICATION", "IL__FORM__FW-CIV-APPLICATION__application-for-waiver-of-court-fees-civil__REV-2025-08__EN.pdf", 9, 4, "b2da395f5ba53eb3cec6bbd39a746f2152bf7f84987ea5f4b5c511ada17337f5"),
]
OUTPUT_PINS = {
    "canonical": "d164a1a74706174f33cf3a42d1707b7197f1ce3d0698bd8645ea3bb43d2d350b",
    "boundary": "4fd1e7ec95e07e2ea21d0369642b329859545210404da1b1f720b2178a6bc2a8",
}
RECEIPT_PIN = "fa4ce7584eb2665f273edb86470432955fddb227250b91253fd0c05a73922e90"
MANIFEST_PIN = "1d954d1676b9f52b36b1d2def6d51a96e6588f2869994effba93e8c9b92b449e"
TOLERANCE_PT = 0.25


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def check_digest(data: bytes, expected: str) -> None:
    if sha256(data) != expected:
        raise ValueError("Input SHA-256 differs from this review's exact candidate pin")


def preserve_words(source: list, target: list) -> tuple[int, int]:
    """Consume one target occurrence per source token, including its rectangle."""
    available = set(range(len(target)))
    matched = 0
    for word in source:
        candidates = [j for j in available if target[j][4] == word[4]
                      and max(abs(target[j][k] - word[k]) for k in range(4)) <= TOLERANCE_PT]
        if candidates:
            available.remove(candidates[0])
            matched += 1
    return matched, len(source) - matched


def controls(raw_source: bytes) -> list[dict[str, Any]]:
    """Perturb extracted tokens/in-memory bytes, never the source or packet files."""
    with fitz.open(stream=raw_source, filetype="pdf") as source:
        word = list(source[0].get_text("words")[0])
    changed = word.copy()
    changed[4] += "_ALTERED"
    shifted = word.copy()
    shifted[0] += 1.0
    near = word.copy()
    near[0] += 0.125
    cases = [
        ("same_token_plus_unrelated_fill", [word], [word, changed], True),
        ("missing_source_token", [word], [], False),
        ("replaced_source_token", [word], [changed], False),
        ("moved_source_token", [word], [shifted], False),
        ("duplicate_requires_two_occurrences", [word, word], [word], False),
        ("within_stated_tolerance", [word], [near], True),
    ]
    rows = []
    for name, left, right, expected in cases:
        observed = preserve_words(left, right)[1] == 0
        if observed != expected:
            raise AssertionError(f"Matcher control failed: {name}")
        rows.append({"case": name, "accepted": observed, "expected": expected})
    bad_bytes = bytearray(raw_source)
    bad_bytes[-1] ^= 1
    digest = sha256(raw_source)
    wrong_pin = ("0" if digest[0] != "0" else "1") + digest[1:]
    for name, data, pin, expected in [
        ("exact_source_digest", raw_source, digest, True),
        ("one_byte_source_corruption", bytes(bad_bytes), digest, False),
        ("wrong_expected_digest", raw_source, wrong_pin, False),
    ]:
        try:
            check_digest(data, pin)
            observed = True
        except ValueError:
            observed = False
        if observed != expected:
            raise AssertionError(f"Digest control failed: {name}")
        rows.append({"case": name, "accepted": observed, "expected": expected})
    return rows


def audit(candidate: Path, source_dir: Path) -> dict[str, Any]:
    before: dict[Path, str] = {}

    def pinned(path: Path, expected: str) -> bytes:
        data = path.read_bytes()
        check_digest(data, expected)
        before[path] = sha256(data)
        return data

    receipt = json.loads(pinned(candidate / "source-receipt.json", RECEIPT_PIN))
    manifest = json.loads(pinned(candidate / "reports/rendered-artifacts.json", MANIFEST_PIN))
    pins = {x["documentId"]: x for x in receipt["sources"]}
    expected_ids = [x[0] for x in SOURCES]
    for packet in manifest["packets"]:
        if [d["documentId"] for d in packet["documents"]] != expected_ids:
            raise ValueError("Candidate's declared component inventory differs")
    output = {"schemaVersion": "chatb-source-fidelity-measurements/v1", "familyId": "il-seal-edu-set",
              "pymupdfVersion": fitz.VersionBind, "tolerancePoints": TOLERANCE_PT,
              "sourceReceiptSha256": RECEIPT_PIN, "renderedManifestSha256": MANIFEST_PIN,
              "scope": "Exact held-source byte identity and positional source-text preservation only; not graphics, visual, legal, central-raster or family approval.",
              "sources": [], "packets": [], "comparisons": []}
    packet_bytes = {}
    for fixture, pin in OUTPUT_PINS.items():
        data = pinned(candidate / "fixtures" / f"{fixture}.pdf", pin)
        packet_bytes[fixture] = data
        with fitz.open(stream=data, filetype="pdf") as pdf:
            if len(pdf) != 13:
                raise ValueError("Candidate complete-page count differs")
            output["packets"].append({"fixture": fixture, "sha256": pin, "bytes": len(data), "pages": len(pdf)})
    for doc_id, filename, offset, pages, expected in SOURCES:
        data = pinned(source_dir / filename, expected)
        if pins[doc_id]["sha256"] != expected or pins[doc_id]["byteLength"] != len(data):
            raise ValueError("Held source does not match candidate source receipt")
        with fitz.open(stream=data, filetype="pdf") as source:
            if len(source) != pages:
                raise ValueError("Held source page count differs")
            nonblank = sum(str(w.field_value or "").strip() not in ("", "Off")
                           for page in source for w in (page.widgets() or []))
            output["sources"].append({"documentId": doc_id, "sha256": expected,
                                      "bytes": len(data), "pages": pages,
                                      "meaningfulPrefilledWidgets": nonblank})
            for fixture, raw in packet_bytes.items():
                with fitz.open(stream=raw, filetype="pdf") as packet:
                    for i, page in enumerate(source):
                        target = packet[offset + i]
                        matched, missing = preserve_words(page.get_text("words"), target.get_text("words"))
                        dimensions_match = tuple(page.rect) == tuple(target.rect)
                        output["comparisons"].append({"fixture": fixture, "documentId": doc_id,
                            "sourcePage": i + 1, "packetPage": offset + i + 1,
                            "matched": matched, "missingOrMoved": missing, "dimensionsMatch": dimensions_match})
                        if missing or not dimensions_match:
                            raise ValueError(f"Source text/dimensions differ: {doc_id}, {fixture}, page {i+1}")
    output["controls"] = controls((source_dir / SOURCES[0][1]).read_bytes())
    if any(sha256(path.read_bytes()) != digest for path, digest in before.items()):
        raise ValueError("A read input changed during the audit")
    output["summary"] = {"sourcePinsMatched": 4, "sourcePages": 13, "candidatePageComparisons": 26,
        "matchedSourceWordInstances": sum(x["matched"] for x in output["comparisons"]),
        "missingOrMoved": sum(x["missingOrMoved"] for x in output["comparisons"]),
        "controls": len(output["controls"]), "positiveControls": 3, "rejectionControls": 6,
        "readInputsUnchanged": len(before), "packetBuilderExecutions": 0}
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", required=True, type=Path, help="Exact extracted family directory")
    parser.add_argument("--sources", required=True, type=Path, help="Directory containing the four named retained blanks")
    parser.add_argument("--output", required=True, type=Path, help="New evidence file, outside input directories")
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Refusing to overwrite existing evidence")
    result = audit(args.candidate, args.sources)
    with args.output.open("x", encoding="utf-8") as handle:
        json.dump(result, handle, indent=2)
        handle.write("\n")
    print(json.dumps(result["summary"], sort_keys=True))


if __name__ == "__main__":
    main()
