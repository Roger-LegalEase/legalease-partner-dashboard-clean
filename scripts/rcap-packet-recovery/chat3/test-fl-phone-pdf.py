#!/usr/bin/env python3
"""Isolated phone-ink regression against the exact held official PDF.

These diagnostic PDFs contain only the two phone writes. They are NOT complete
participant fixtures, a pdf-lib rebuild, independent review, or a release gate.
Requires PyMuPDF, pypdf and reportlab; no source or repo family file is modified.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
from pathlib import Path
import fitz
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen.canvas import Canvas

SOURCE_SHA = 'd9417ea382c9c1ea170153b5aa25e63230799de836b8aefca0ee80a47e23f6eb'


def build_probe(source: bytes, phone: str, x: float, y: float = 573,
                size: float = 8.5, omit_first: bool = False,
                pages: int = 5) -> bytes:
    writer = PdfWriter(clone_from=io.BytesIO(source))
    for index, px, py in [(0, x, y), (1, 441, 670)]:
        if index == 0 and omit_first:
            continue
        overlay = io.BytesIO()
        canvas = Canvas(overlay, pagesize=(612, 792), invariant=1)
        canvas.setFont('Helvetica', size if index == 0 else 8.5)
        canvas.drawString(px, py, phone)
        canvas.save()
        writer.pages[index].merge_page(PdfReader(overlay).pages[0])
    while len(writer.pages) > pages:
        del writer.pages[-1]
    writer.add_metadata({'/Title': 'PHONE GEOMETRY PROBE ONLY - not a participant packet'})
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def check_probe(data: bytes, phone: str, printed_close: fitz.Rect) -> dict:
    with fitz.open(stream=data, filetype='pdf') as doc:
        assert len(doc) == 5, 'Official packet pages omitted'
        measured = []
        for index in (0, 1):
            words = [w for w in doc[index].get_text('words') if w[4] == phone]
            assert len(words) == 1, f'Phone missing/duplicated on page {index + 1}'
            box = fitz.Rect(words[0][:4])
            spans = [s for b in doc[index].get_text('dict')['blocks']
                     for line in b.get('lines', []) for s in line['spans']
                     if phone in s['text']]
            assert len(spans) == 1 and abs(spans[0]['size'] - 8.5) < 0.01, 'Phone font changed'
            if index == 0:
                assert not box.intersects(printed_close), 'Phone overprints the official parenthesis'
                assert box.x0 >= printed_close.x1 + 0.25, 'Insufficient printed-glyph clearance'
                assert box.x1 <= 453, 'Phone leaves safe cell edge'
                assert 209 <= box.y0 <= 211 and 221 <= box.y1 <= 223, 'Phone moved out of row'
            measured.append({'page': index + 1, 'phone': phone, 'bbox': list(box), 'size': spans[0]['size']})
        return {'phonePages': measured, 'pageCount': len(doc)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--placement-json', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    source = args.source.read_bytes()
    assert len(source) == 22449 and hashlib.sha256(source).hexdigest() == SOURCE_SHA, 'Wrong official source'
    args.out.mkdir(parents=True, exist_ok=True)
    with fitz.open(stream=source, filetype='pdf') as doc:
        chars = [c for b in doc[0].get_text('rawdict')['blocks']
                 for line in b.get('lines', []) for span in line['spans']
                 for c in span['chars'] if c['c'] == ')' and 375 < c['bbox'][0] < 390 and 200 < c['bbox'][1] < 225]
        assert len(chars) == 1, 'Cannot uniquely bind the printed closing parenthesis'
        printed_close = fitz.Rect(chars[0]['bbox'])
    placement = json.loads(args.placement_json.read_text())
    results, negatives = [], []
    for row in placement['observations']:
        fixture, phone = row['fixture'], row['phone']
        first = build_probe(source, phone, row['x'], row['y'], row['fontSize'])
        second = build_probe(source, phone, row['x'], row['y'], row['fontSize'])
        assert first == second, 'Probe serialization was not deterministic'
        measured = check_probe(first, phone, printed_close)
        pdf = args.out / f'{fixture}-phone-probe.pdf'
        pdf.write_bytes(first)
        with fitz.open(stream=first, filetype='pdf') as doc:
            clip = fitz.Rect(345, 195, 460, 230)
            doc[0].get_pixmap(matrix=fitz.Matrix(5, 5), clip=clip).save(str(args.out / f'{fixture}-phone-probe.png'))
        results.append({'fixture': fixture, 'probeSha256': hashlib.sha256(first).hexdigest(),
                        'deterministicProbeOnly': True, **measured})
        bad = {
            'prior-overlap': build_probe(source, phone, 359),
            'missing-page1-phone-present-page2': build_probe(source, phone, row['x'], omit_first=True),
            'cross-cell-edge': build_probe(source, phone, 430),
            'font-shrunk': build_probe(source, phone, row['x'], size=5),
            'page-omitted': build_probe(source, phone, row['x'], pages=4),
        }
        for name, data in bad.items():
            try:
                check_probe(data, phone, printed_close)
            except AssertionError as exc:
                negatives.append({'fixture': fixture, 'mutation': name, 'caught': str(exc)})
            else:
                raise AssertionError(f'Negative control missed: {fixture} {name}')
        # Retain the actual old-overlap image for visual comparison, not for filing.
        with fitz.open(stream=bad['prior-overlap'], filetype='pdf') as doc:
            doc[0].get_pixmap(matrix=fitz.Matrix(5, 5), clip=fitz.Rect(345, 195, 460, 230)).save(
                str(args.out / f'{fixture}-prior-overlap.png'))
    assert args.source.read_bytes() == source, 'Held source was changed'
    report = {'scope': 'isolated phone-ink probes, not complete packet fixtures',
              'sourceSha256': SOURCE_SHA, 'printedClosingParenthesisBbox': list(printed_close),
              'probes': results, 'pdfNegativeControls': negatives,
              'fullBuilderExecuted': False, 'independentApproval': False, 'familyClosed': False}
    (args.out / 'phone-pdf-probes.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
