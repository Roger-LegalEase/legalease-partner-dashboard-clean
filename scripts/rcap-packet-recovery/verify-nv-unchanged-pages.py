#!/usr/bin/env python3
"""Compare untouched Nevada pages with the pre-repair packet, without approval.

Default base is the immutable pre-repair Git snapshot. --base-directory accepts
an already checked-out copy for offline review; both old PDF hashes are verified.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import subprocess

import fitz

ROOT = pathlib.Path(__file__).resolve().parents[2]
FAMILY = pathlib.Path('data/rcap-all50/overlays/census-v1/nv/rcap-nv-custom-pleading--custom-pleading')
BASE = 'fdd5c842147d9da245f78ccb42f0e66b75353183'
BASE_HASHES = {
    'canonical': '0f054975494d0bb97d66418cc4ba84f6ca3da146e48b3182072bbda3d35e944e',
    'boundary': '6dc6ddc9242f0818237154075c5b0a2074ec60081d43f38eb259c5b4c7775048',
}
SPECIAL = ('nv_seal_decrim-', 'nv_seal_pardon-')


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-directory', type=pathlib.Path)
    parser.add_argument('--output', required=True, type=pathlib.Path)
    args = parser.parse_args()

    def old_bytes(relative: pathlib.Path) -> bytes:
        if args.base_directory is not None:
            return (args.base_directory.resolve() / relative).read_bytes()
        return subprocess.check_output(
            ['git', 'show', f'{BASE}:{relative.as_posix()}'], cwd=ROOT,
            stderr=subprocess.PIPE,
        )

    manifest_path = FAMILY / 'reports/rendered-artifacts.json'
    before = json.loads(old_bytes(manifest_path))
    after = json.loads((ROOT / manifest_path).read_bytes())
    reviewed = json.loads((ROOT / 'data/rcap-grade-a/nv-completion-2026-09-07/targeted-review.json').read_bytes())['afterRepair']
    pages = []
    changed = []
    hashes = {}
    for fixture in ('canonical', 'boundary'):
        relative = FAMILY / 'fixtures' / f'{fixture}.pdf'
        old = old_bytes(relative)
        new = (ROOT / relative).read_bytes()
        assert digest(old) == BASE_HASHES[fixture], f'{fixture}: unexpected pre-repair PDF'
        assert digest(new) == reviewed[fixture + 'Sha256'], f'{fixture}: changed since visual review'
        hashes[fixture] = {'before': digest(old), 'after': digest(new)}
        old_manifest = next(row for row in before['artifacts'] if row['fixture'] == fixture)
        new_manifest = next(row for row in after['artifacts'] if row['fixture'] == fixture)

        def index(manifest: dict) -> dict:
            rows = manifest['pageManifest']
            result = {(row['documentId'], row['sourcePage']): row['packetPage'] for row in rows}
            assert len(result) == len(rows), 'Duplicate component page identity'
            assert sorted(result.values()) == list(range(1, manifest['pageCount'] + 1)), 'Incomplete page coverage'
            return result

        old_index, new_index = index(old_manifest), index(new_manifest)
        ordinary = lambda key: not key[0].startswith(SPECIAL)
        assert {key for key in old_index if ordinary(key)} == {key for key in new_index if ordinary(key)}, 'Untouched component set changed'
        with fitz.open(stream=old, filetype='pdf') as old_doc, fitz.open(stream=new, filetype='pdf') as new_doc:
            assert len(old_doc) == old_manifest['pageCount'] == 50
            assert len(new_doc) == new_manifest['pageCount'] == 44
            for key, number in new_index.items():
                new_page = new_doc[number - 1]
                if not ordinary(key):
                    words = new_page.get_text('words')
                    assert words, f'{fixture} page {number}: empty changed page'
                    for word in words:
                        x0, y0, x1, y1 = word[:4]
                        assert x0 >= -0.5 and y0 >= -0.5 and x1 <= new_page.rect.width + 0.5 and y1 <= new_page.rect.height + 0.5, f'{fixture} page {number}: text outside paper'
                    changed.append({'fixture': fixture, 'component': key[0], 'componentPage': key[1], 'packetPage': number, 'nonblankAndTextWithinPaper': True})
                    continue
                old_number = old_index[key]
                old_pix = old_doc[old_number - 1].get_pixmap(matrix=fitz.Matrix(1, 1), colorspace=fitz.csRGB, alpha=False)
                new_pix = new_page.get_pixmap(matrix=fitz.Matrix(1, 1), colorspace=fitz.csRGB, alpha=False)
                assert (old_pix.width, old_pix.height, old_pix.n) == (new_pix.width, new_pix.height, new_pix.n)
                assert old_pix.samples == new_pix.samples, f'{fixture}: untouched component {key} changed pixels'
                pages.append({'fixture': fixture, 'component': key[0], 'componentPage': key[1], 'oldPacketPage': old_number, 'newPacketPage': number, 'pixelSha256': digest(new_pix.samples)})
    assert len(pages) == 68 and len(changed) == 20, 'Unexpected comparison coverage'
    result = {
        'schemaVersion': 'rcap-nv-page-non-regression/v1',
        'baseCommit': BASE, 'renderer': f'PyMuPDF {fitz.VersionBind}',
        'comparisonDpi': 72, 'pdfHashes': hashes,
        'ordinaryRoutePagesPixelIdentical': len(pages),
        'changedPagesBoundsChecked': len(changed), 'pages': pages,
        'changedPages': changed, 'independentApprovalGranted': False,
        'grantsTerminalStatus': False,
        'limitation': 'Pixel identity establishes non-regression of the four untouched routes, not their legal correctness. Text bounds are not a substitute for visual review.',
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print('PASS: 68 untouched pages pixel-identical; 20 changed pages nonblank with text within paper; both exact reviewed PDF hashes confirmed.')


if __name__ == '__main__':
    main()
