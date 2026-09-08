#!/usr/bin/env python3
"""Bind retained displayed pages and independently prove previously author-only aliases.

No PDFs are generated and no duplicate raster corpus is saved. The 50 original
independent representative PNGs and five original source PNGs stay in Session08.
"""
import hashlib
import json
from pathlib import Path
import pymupdf as fitz

ROOT = Path.cwd()
BASE = ROOT / 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration'
E = BASE / 'session08'
OUT = BASE / 'session10/md-independent-review'
PAGES = E / 'md-cannabis-independent-pages'
FAMILY = ROOT / 'data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill'
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda p: json.loads(p.read_text())
identity = lambda p: {'path': str(p.relative_to(ROOT)), 'sha256': sha(p.read_bytes()), 'bytes': p.stat().st_size}
prior = read(E / 'md-cannabis-independent-measurements.json')
receipt = read(FAMILY / 'source-receipt.json')
for source in receipt['sourceCatalog'].values():
    assert sha((ROOT / source['path']).read_bytes()) == source['sha256']
for source in prior['sourcePages']:
    assert sha((PAGES / source['png']).read_bytes()) == source['pngSha256']
    assert source['sourceSha256'] == receipt['sourceCatalog'][source['documentId']]['sha256']
for name, row in prior['representatives'].items():
    assert sha((PAGES / name).read_bytes()) == row['pngSha256']
for row in prior['visualPairs']:
    assert sha((ROOT / row['path']).read_bytes()) == row['sha256']

rows, documents = [], {}
for binding in prior['pageBindings']:
    fixture = binding['fixture']
    pdf = FAMILY / 'fixtures' / (fixture + '.pdf')
    if fixture not in documents:
        raw = pdf.read_bytes()
        assert sha(raw) == binding['wholePdfSha256']
        documents[fixture] = fitz.open(stream=raw, filetype='pdf')
    representative = prior['representatives'][binding['representative']]
    is_representative = fixture == representative['fixture'] and binding['page'] == representative['page']
    if is_representative:
        method = 'prior_independent_complete_raster_rehashed'
        actual = sha((PAGES / binding['representative']).read_bytes())
    else:
        # This previously author-only exact-page assertion had not been measured
        # independently. Rasterize one complete page in memory, then discard it.
        actual = sha(documents[fixture][binding['page'] - 1].get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False).tobytes('png'))
        method = 'fresh_independent_complete_alias_raster'
    assert actual == binding['pngSha256'] == representative['pngSha256'], (fixture, binding['page'])
    rows.append({**binding, 'proofMethod': method, 'independentCompletePageHash': actual})

result = {
    'schemaVersion': 'independent-md-cannabis-alias-proof/v1',
    'reviewer': '/root/independent_md_review',
    'purpose': 'Close previously author-only alias bindings so 50 viewed complete packet pages account for all133 actual page instances.',
    'priorMeasurements': identity(E / 'md-cannabis-independent-measurements.json'),
    'script': identity(ROOT / 'scripts/rcap-packet-recovery/session10/measure-md-cannabis-page-aliases.py'),
    'sourceInputs': [identity(ROOT / s['path']) for s in receipt['sourceCatalog'].values()],
    'completePdfIdentities': [identity(FAMILY / 'fixtures' / (fixture + '.pdf')) for fixture in documents],
    'retainedIndependentRepresentativeRastersRehashed': sum(r['proofMethod'].startswith('prior_') for r in rows),
    'freshIndependentCompleteAliasRasters': sum(r['proofMethod'].startswith('fresh_') for r in rows),
    'retainedSourcePageRastersRehashed': len(prior['sourcePages']),
    'retainedCompletePageDisplayPairsRehashed': len(prior['visualPairs']),
    'pageInstances': len(rows), 'allPageBindingsMatch': True,
    'duplicateRasterFilesCreated': 0, 'pdfsGenerated': 0,
    'visualVerdict': 'Separate reviewer-authored review record; hash equality alone is not visual review.',
    'pageBindings': rows,
}
(OUT / 'cannabis-independent-page-aliases.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k:v for k,v in result.items() if not isinstance(v, (list, dict))}, indent=2))
