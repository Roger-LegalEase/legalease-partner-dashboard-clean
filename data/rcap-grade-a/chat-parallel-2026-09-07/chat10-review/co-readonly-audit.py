#!/usr/bin/env python3
"""Read-only independent CO candidate measurements. Never runs a packet builder.
Usage: python co-readonly-audit.py EXTRACTED_ARCHIVE JDF477_ORIGINAL JDF478_ORIGINAL OUTPUT_JSON
Requires PyMuPDF. Original inputs and candidate files are never rewritten.
"""
from __future__ import annotations
import hashlib, json, sys
from collections import Counter
from pathlib import Path
import fitz


def digest(path: Path) -> dict:
    data = path.read_bytes()
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
            "gitBlobSha1": hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()}


def norm(value: str) -> str:
    return " ".join(value.split())


def audit(root: Path, originals: list[Path]) -> dict:
    family = root / 'data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill'
    tracked = sorted(p for p in root.rglob('*') if p.is_file()) + originals
    before = {str(p): digest(p) for p in tracked}
    actual = json.loads((family / 'reports/actual-writes.json').read_text())
    checks, documents, images, source_checks = [], [], [], []
    for fixture in ('canonical', 'boundary'):
        path = family / 'fixtures' / f'{fixture}.pdf'
        doc = fitz.open(path)
        documents.append({"fixture": fixture, "path": str(path.relative_to(root)), **digest(path), "pages": len(doc)})
        assert len(doc) == 5, (fixture, 'unexpected component pages')
        for page in doc:
            png = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False).tobytes('png')
            images.append({"fixture": fixture, "page": page.number+1, "bytes": len(png), "sha256": hashlib.sha256(png).hexdigest()})
        for section in (s for s in actual['documents'] if s['fixture'] == fixture):
            offset = 0 if section['formNumber'] == 'JDF-477' else 3
            for write in section['actualWrites']:
                page = doc[write['page'] - 1 + offset]
                r = write['rect']
                box = fitz.Rect(r['x']-1, page.rect.height-r['y']-r['height']-1,
                                r['x']+r['width']+1, page.rect.height-r['y']+1)
                observed = norm(page.get_text('text', clip=box))
                checks.append({"fixture": fixture, "form": section['formNumber'], "field": write['field'],
                               "page": page.number+1, "expected": write['expected'], "observed": observed,
                               "matchesExpected": observed == norm(write['expected']),
                               "authorMatchesExpected": write['matchesExpected']})
        for original, offset in zip(originals, (0, 3)):
            source = fitz.open(original)
            for i, page in enumerate(source):
                output_words = doc[offset+i].get_text('words')
                words = page.get_text('words')
                matched = sum(any(a[4] == b[4] and max(abs(a[j]-b[j]) for j in range(4)) < 0.25
                                  for b in output_words) for a in words)
                source_checks.append({"fixture": fixture, "form": 'JDF-477' if offset == 0 else 'JDF-478',
                                      "page": offset+i+1, "sourceWordInstances": len(words),
                                      "sourceWordsRetainedAtPosition": matched})
    assert all(x['matchesExpected'] for x in checks), 'held text write mismatch'
    # Guard the independent matcher itself, not the production renderer.
    controls = {"known_text_positive": norm('Jordan Avery Reyes') == norm('Jordan Avery Reyes'),
                "wrong_value_rejected": norm('Jordan Avery Reyes') != norm('Jordan Avery Jones'),
                "apostrophe_loss_rejected": norm('O’Shaughnessy') != norm('OShaughnessy'),
                "linebreak_normalization_positive": norm('Denver\nCO') == norm('Denver CO'),
                "corrupt_digest_rejected": hashlib.sha256(b'candidate').digest() != hashlib.sha256(b'Candidate').digest()}
    assert all(controls.values())
    after = {str(p): digest(p) for p in tracked}
    assert before == after, 'review mutated an input'
    return {"schemaVersion": 'chat10-co-readonly-measurements/v1', "fitzVersion": fitz.VersionBind,
            "renderer": 'PyMuPDF Matrix(2,2), alpha=False, PNG bytes, 144 DPI',
            "packetBuilderExecuted": False, "localRasterIsCentralAcceptance": False,
            "inputFilesUnchanged": len(tracked), "wholePdfs": documents,
            "sourceOriginals": [{"filename": p.name, **digest(p), "pages": len(fitz.open(p))} for p in originals],
            "candidateFileMeasurements": {str(p.relative_to(root)): digest(p) for p in tracked if p.is_relative_to(root)},
            "pageImages": images, "textWriteChecks": checks,
            "textWriteChecksPassed": sum(c['matchesExpected'] for c in checks),
            "sourceWordPositionChecks": source_checks,
            "sourceWordPositionCoverage": 'Text-position comparison only, not graphics fidelity or legal currentness.',
            "reviewerHarnessControls": controls, "exitCode": 0}


if __name__ == '__main__':
    if len(sys.argv) != 5:
        raise SystemExit(__doc__)
    root, source1, source2, output = map(Path, sys.argv[1:])
    if not all(p.exists() for p in (root, source1, source2)):
        raise SystemExit('Missing candidate or original source input')
    if output.resolve().is_relative_to(root.resolve()) or output.resolve() in (source1.resolve(), source2.resolve()):
        raise SystemExit('Output must not replace a reviewed input')
    result = audit(root, [source1, source2])
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({"exitCode": 0, "wholePdfs": 2, "pages": 10,
                      "heldTextWrites": result['textWriteChecksPassed'],
                      "inputsUnchanged": result['inputFilesUnchanged']}))
