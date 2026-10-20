#!/usr/bin/env python3
"""Chain the rerendered Nevada fixtures to the bytes the 2026-09-07 review examined.

The 2026-09-07 targeted review (data/rcap-grade-a/nv-completion-2026-09-07)
examined one exact pair of PDFs. task53 removed internal route footers from the
shared renderer, so the family was rerendered. This proves the rerendered pair
differs from the reviewed pair only by removed footer ink: the text is identical
apart from the footer lines, no pixel on any page gets darker, ink disappears
only inside one short band per page, and the pages that change are exactly the
pages task53 measured as carrying a route key. Nothing here approves anything.

Usage: verify-nv-footer-rerender.py --record <successor review json> --output <json> [--self-test]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import sys

import fitz

ROOT = pathlib.Path(__file__).resolve().parents[2]
FAMILY = pathlib.Path('data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading')
PREDECESSOR_REVIEW = pathlib.Path('data/rcap-grade-a/nv-completion-2026-09-07/targeted-review.json')
FOOTER = re.compile(r'^\s*_?Route:\s*(obligation:\S*)?\s*$|^\s*obligation:track-(only|pathway):NV:\S*\s*$')


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def text_lines(doc) -> list[list[str]]:
    pages = []
    for page in doc:
        lines = [l.strip() for l in page.get_text(sort=True).splitlines()]
        pages.append([l for l in lines if l and not FOOTER.match(l)])
    return pages


def compare_pixels(old, new, dpi: int, max_band: int) -> dict:
    """Pages of `new` versus `old`: identical, or ink removed only, inside one band."""
    assert len(old) == len(new), f'page count {len(old)} != {len(new)}'
    pages, ink_added, changed = [], 0, []
    for i in range(len(old)):
        a = old[i].get_pixmap(dpi=dpi, colorspace=fitz.csGRAY)
        b = new[i].get_pixmap(dpi=dpi, colorspace=fitz.csGRAY)
        assert (a.width, a.height) == (b.width, b.height), f'page {i + 1}: size differs'
        sa, sb = a.samples, b.samples
        if sa == sb:
            pages.append({'page': i + 1, 'identical': True})
            continue
        added = sum(1 for x, y in zip(sa, sb) if y < x)
        rows = sorted({k // a.width for k, (x, y) in enumerate(zip(sa, sb)) if y > x})
        band = [rows[0], rows[-1]] if rows else None
        height = (band[1] - band[0] + 1) if band else 0
        pages.append({'page': i + 1, 'identical': False, 'inkAddedPixels': added, 'band': band, 'bandHeightPx': height, 'pageHeightPx': a.height})
        ink_added += added
        changed.append(i + 1)
    return {'dpi': dpi, 'pageCount': len(old), 'pagesIdentical': len(old) - len(changed), 'changedPages': changed,
            'inkAddedPixels': ink_added, 'maxBandHeightPx': max((p.get('bandHeightPx', 0) for p in pages), default=0),
            'inkRemovedOnly': ink_added == 0 and all(p.get('bandHeightPx', 0) <= max_band for p in pages), 'pages': pages}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--record', required=True, type=pathlib.Path)
    parser.add_argument('--output', required=True, type=pathlib.Path)
    parser.add_argument('--self-test', action='store_true', help='also prove the comparison rejects added ink (reversed pair)')
    args = parser.parse_args()
    record = json.loads((ROOT / args.record).read_bytes())
    assert record['schemaVersion'] == 'rcap-targeted-review-successor/v1', record['schemaVersion']
    assert record['familyId'] == 'rcap-nv-custom-pleading'
    pred, succ, tol = record['predecessor'], record['successor'], record['comparison']
    reviewed = json.loads((ROOT / PREDECESSOR_REVIEW).read_bytes())['afterRepair']
    assert pred['record'] == str(PREDECESSOR_REVIEW)
    expected_pages = record['cause']['pagesCarryingARouteKey']
    result = {'schemaVersion': 'rcap-nv-footer-rerender-comparison/v1', 'record': str(args.record), 'fixtures': {}}
    for fixture in ('canonical', 'boundary'):
        rel = FAMILY / 'fixtures' / f'{fixture}.pdf'
        # The reviewed bytes come from the immutable packet commit, never from a file someone could replace.
        old = subprocess.check_output(['git', 'show', f"{pred['packetCommit']}:{rel.as_posix()}"], cwd=ROOT)
        new = (ROOT / rel).read_bytes()
        assert digest(old) == reviewed[f'{fixture}Sha256'] == pred[f'{fixture}Sha256'], f'{fixture}: predecessor is not the reviewed pair'
        assert digest(new) == succ[f'{fixture}Sha256'], f'{fixture}: bytes on disk are not the recorded successor'
        od, nd = fitz.open(stream=old, filetype='pdf'), fitz.open(stream=new, filetype='pdf')
        assert len(od) == len(nd) == succ['pageCountEach'], f'{fixture}: page count'
        ot, nt = text_lines(od), text_lines(nd)
        text_identical = ot == nt
        px = compare_pixels(od, nd, tol['dpi'], tol['maxBandHeightPx'])
        pages_match = px['changedPages'] == expected_pages
        ok = text_identical and px['inkRemovedOnly'] and pages_match
        result['fixtures'][fixture] = {'predecessorSha256': digest(old), 'successorSha256': digest(new), 'textIdenticalApartFromFooters': text_identical,
                                       'changedPagesEqualTask53Measurement': pages_match, **px, 'result': 'PASS' if ok else 'FAIL'}
        if args.self_test:
            reverse = compare_pixels(nd, od, tol['dpi'], tol['maxBandHeightPx'])
            result['fixtures'][fixture]['selfTest'] = {'reversedPairRejected': not reverse['inkRemovedOnly'], 'reversedInkAddedPixels': reverse['inkAddedPixels'],
                                                       'identityAccepted': compare_pixels(od, od, tol['dpi'], tol['maxBandHeightPx'])['changedPages'] == []}
            assert result['fixtures'][fixture]['selfTest']['reversedPairRejected'], f'{fixture}: comparison failed to reject added ink'
            assert result['fixtures'][fixture]['selfTest']['identityAccepted'], f'{fixture}: comparison rejected an identical pair'
    result['result'] = 'PASS' if all(f['result'] == 'PASS' for f in result['fixtures'].values()) else 'FAIL'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    for fixture, f in result['fixtures'].items():
        print(f"{fixture}: text identical apart from footers={f['textIdenticalApartFromFooters']}; {f['pagesIdentical']} pages identical, "
              f"{len(f['changedPages'])} pages lose ink inside one band of at most {f['maxBandHeightPx']} px, {f['inkAddedPixels']} pixels gain ink; "
              f"changed pages equal the task53 measurement={f['changedPagesEqualTask53Measurement']}: {f['result']}")
    if result['result'] != 'PASS':
        sys.exit(1)
    print('PASS: the rerendered pair is the reviewed pair minus its route footers; both reviewed and successor hashes confirmed.')


if __name__ == '__main__':
    main()
