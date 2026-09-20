#!/usr/bin/env python3
"""Scoped tests on complete outputs; neither rebuild nor independent approval."""
from pathlib import Path
import argparse
import hashlib
import json
import fitz

parser = argparse.ArgumentParser(description='Test phone placement on complete Florida packet outputs.')
parser.add_argument('--family-dir', type=Path, required=True)
parser.add_argument('--before-dir', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
root, before = args.family_dir.resolve(), args.before_dir.resolve()
reports = json.loads((root / 'reports/actual-writes.json').read_text())['documents']

def validate(data: bytes, phone: str) -> dict:
    with fitz.open(stream=data, filetype='pdf') as doc:
        assert len(doc) == 5, 'missing complete official page'
        selected = []
        for pn in (0, 1):
            spans = [s for b in doc[pn].get_text('dict')['blocks'] if 'lines' in b
                     for line in b['lines'] for s in line['spans'] if s['text'].strip() == phone]
            assert len(spans) == 1, f'phone missing/duplicated on page {pn + 1}'
            selected.append(spans[0])
        span = selected[0]
        assert span['bbox'][0] >= 384.5, 'printed-parenthesis collision'
        assert span['bbox'][2] <= 453, 'phone crosses field boundary'
        assert span['size'] >= 8.5, 'font floor reduced'
        return {'firstPagePhoneBox': span['bbox'], 'fontSize': span['size'],
                'pages': len(doc), 'phonePresentOnBothExactPages': True}

def rewrite_phone(data: bytes, phone: str, x=None, size=None) -> bytes:
    with fitz.open(stream=data, filetype='pdf') as doc:
        span = next(s for b in doc[0].get_text('dict')['blocks'] if 'lines' in b
                    for line in b['lines'] for s in line['spans'] if s['text'].strip() == phone)
        box = fitz.Rect(span['bbox']); box.x0 -= .1; box.x1 += .1
        doc[0].add_redact_annot(box); doc[0].apply_redactions()
        if x is not None:
            doc[0].insert_text((x, 219), phone, fontsize=size or 8.5, fontname='helv')
        return doc.tobytes()

rows = []
original_hashes = {}
for item in reports:
    fixture = item['fixture']
    assert fixture in ('canonical', 'boundary')
    phone = next(r['drawnText'] for r in item['actualWrites'] if r['field'].endswith('page1_phone'))
    packet = root / f'fixtures/{fixture}.pdf'
    data = packet.read_bytes()
    original_hashes[packet] = hashlib.sha256(data).hexdigest()
    measured = validate(data, phone)
    with fitz.open(stream=data, filetype='pdf') as doc:
        doc.delete_page(4); missing_page = doc.tobytes()
    cases = [
        ('original collision', (before / f'fixtures/{fixture}.pdf').read_bytes()),
        ('page-one phone missing but page-two present', rewrite_phone(data, phone)),
        ('field boundary overflow', rewrite_phone(data, phone, 420)),
        ('font floor reduced', rewrite_phone(data, phone, 386, 8)),
        ('last official page omitted', missing_page),
    ]
    caught = []
    for name, bad in cases:
        try:
            validate(bad, phone)
        except AssertionError as exc:
            caught.append({'case': name, 'reason': str(exc)})
        else:
            raise AssertionError('Defect not caught: ' + name)
    rows.append({'fixture': fixture, 'fullPdfSha256': original_hashes[packet],
                 'measured': measured, 'rejectedCompletePdfCases': caught})
assert len(rows) == 2 and {r['fixture'] for r in rows} == {'canonical', 'boundary'}
assert all(hashlib.sha256(p.read_bytes()).hexdigest() == h for p, h in original_hashes.items())
result = {'scope': 'Page-specific phone placement and complete page count on actual complete renderer outputs; not independent semantic review',
          'positiveFullPdfCases': 2, 'rejectedCompletePdfCases': 10, 'rows': rows,
          'originalCompletePdfsUnchanged': True, 'independentApproval': False}
args.out.parent.mkdir(parents=True, exist_ok=True)
args.out.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
