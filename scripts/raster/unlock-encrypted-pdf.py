#!/usr/bin/env python3
"""Open an encrypted PDF with qpdf and write a decrypted review derivative."""

import argparse
import importlib.util
import hashlib
import json
from pathlib import Path

import pikepdf


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_fidelity_reader():
    reader_path = Path(__file__).resolve().parents[1] / "census-v1-ca-1203-4-set" / "compare-official-vs-rescued.py"
    spec = importlib.util.spec_from_file_location("rcap_ca_pdf_fidelity", reader_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load the repository PDF fidelity reader")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


parser = argparse.ArgumentParser()
parser.add_argument("--input", required=True)
parser.add_argument("--output", required=True)
args = parser.parse_args()

source = Path(args.input).resolve()
output = Path(args.output).resolve()
if source == output:
    raise SystemExit("input and output must be different paths")

source_hash_before = sha256(source)
output.parent.mkdir(parents=True, exist_ok=True)
with pikepdf.open(source, password="") as pdf:
    if not pdf.is_encrypted:
        raise SystemExit("fallback refused: source PDF is not encrypted")
    if not pdf.user_password_matched:
        raise SystemExit("fallback refused: the empty user password did not open the source PDF")
    page_count = len(pdf.pages)
    if page_count < 1:
        raise SystemExit("source PDF reports zero pages")
    pdf.save(output, deterministic_id=True)

source_hash_after = sha256(source)
if source_hash_after != source_hash_before:
    raise SystemExit("source PDF changed while the derivative was created")

with pikepdf.open(output) as check:
    if check.is_encrypted:
        raise SystemExit("decrypted derivative is still encrypted")
    if len(check.pages) != page_count:
        raise SystemExit("decrypted derivative changed the page count")

reader = load_fidelity_reader()
source_description = reader.describe(str(source))
derivative_description = reader.describe(str(output))
differences = reader.diff(source_description, derivative_description)
equivalent = (
    differences["pageCount"] is None
    and not differences["pageGeometry"]
    and not differences["fieldsOnlyInOfficial"]
    and not differences["fieldsOnlyInDerivative"]
    and not differences["fieldDifferences"]
    and not differences["contentStreamChangedPages"]
    and source_description["xfa"] == derivative_description["xfa"]
)
if not equivalent:
    raise SystemExit("decrypted derivative failed the repository structural-fidelity contract")

print(json.dumps({
    "schemaVersion": "rcap-decrypted-raster-input/v1",
    "sourceSha256": source_hash_before,
    "derivativeSha256": sha256(output),
    "pageCount": page_count,
    "pikepdfVersion": pikepdf.__version__,
    "libqpdfVersion": pikepdf.__libqpdf_version__,
    "transformation": "empty-password decryption only; source bytes remain unchanged",
    "sourceEncrypted": True,
    "emptyUserPasswordMatched": True,
    "derivativeEncrypted": False,
    "structuralFidelity": {
        "pageGeometryEqual": True,
        "decodedPageContentStreamsEqual": True,
        "terminalFieldsAndWidgetsEqual": True,
        "xfaDigestEqual": True,
        "reader": "scripts/census-v1-ca-1203-4-set/compare-official-vs-rescued.py",
    },
}, sort_keys=True))
