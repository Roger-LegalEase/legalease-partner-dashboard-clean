#!/usr/bin/env python3
"""Measure delivered CT guide text and complete pages; author evidence, not review."""
import hashlib
import json
from pathlib import Path
import subprocess
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/treatment-reconciliation/ct-guidance'
sha = lambda b: hashlib.sha256(b).hexdigest()
FAMILIES = {
    'provisional': 'agency-application-treatment:obligation:track-only:ct:ct-provisional-pardon',
    'absolute': 'agency-application-treatment:obligation:track-pathway:ct:ct-absolute-pardon:absolute-pardon-resulting-in-erasure',
}
baseline = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
rows = []
(OUT / 'pages').mkdir(exist_ok=True)
for name, slug in FAMILIES.items():
    directory = ROOT / 'data/rcap-all50/overlays/census-v1/ct' / (slug + '--official-pdf-fill')
    markdown = (directory / 'participant-instructions.md').read_text()
    assert 'https://epardonportal.ct.gov/portal' in markdown
    for fixture in ['canonical', 'boundary']:
        path = directory / 'fixtures' / (fixture + '.pdf')
        rel = str(path.relative_to(ROOT))
        raw = path.read_bytes()
        prior_raw = subprocess.check_output(['git', 'show', baseline + ':' + rel], cwd=ROOT)
        prior = pymupdf.open(stream=prior_raw, filetype='pdf')
        current = pymupdf.open(path)
        text = ' '.join(p.get_text() for p in current)
        compact = ''.join(text.split())
        assert 'https://epardonportal.ct.gov/portal' in compact
        assert 'NOTANOFFICIALFORMANDNOTACOURTFILING' in compact
        if name == 'provisional':
            for phrase in ['more than 90 days', 'apply through your probation officer', 'Exactly 90 days', 'remaining period is unknown', 'Background Investigation Authorization', 'unsigned to a notary', 'officer must complete the required questionnaire']:
                assert ''.join(phrase.split()) in compact, phrase
        else:
            assert 'expeditedreviewwithoutone' in compact
            assert 'application-process-and-instructions' in compact
        pages = []
        for index, page in enumerate(current):
            pix = page.get_pixmap(matrix=pymupdf.Matrix(1.4, 1.4), alpha=False)
            image = OUT / 'pages' / f'{name}-{fixture}-page-{index + 1:02}.png'
            pix.save(image)
            clipped = [w[:4] for w in page.get_text('words') if not page.rect.contains(pymupdf.Rect(w[:4]))]
            assert not clipped, f'Off-page text: {rel} p{index + 1}'
            old_pix = prior[index].get_pixmap(matrix=pymupdf.Matrix(1.4, 1.4), alpha=False) if index < len(prior) else None
            pages.append({'page': index + 1, 'completePageImage': str(image.relative_to(ROOT)), 'imageSha256': sha(image.read_bytes()), 'pagePixelsUnchangedFromBaseline': old_pix is not None and old_pix.samples == pix.samples, 'offPageWords': len(clipped), 'wordsMeasured': len(page.get_text('words'))})
        (OUT / f'{name}-{fixture}.txt').write_text(text)
        rows.append({'path': rel, 'sha256': sha(raw), 'oldSha256': sha(prior_raw), 'pageCount': len(current), 'priorPageCount': len(prior), 'pages': pages})
refresh = json.loads((OUT / 'source-identity-refresh.json').read_text())
destruction = {p: digest for p, digest in refresh['unchangedPacketSha256'].items() if 'ct-destruction-request' in p}
assert len(destruction) == 2
assert all(sha((ROOT / p).read_bytes()) == digest for p, digest in destruction.items())
report = {'schemaVersion': 'rcap-guide-delivered-delta-measurement/v1', 'authorship': 'implementation lane; no independent acceptance', 'baselineCommit': baseline, 'measuredCurrentPDFs': rows, 'destructionPDFsUnchanged': destruction, 'finalGuidePages': sum(r['pageCount'] for r in rows), 'uninspectedWholePagesByAuthor': sum(r['pageCount'] for r in rows), 'independentReview': 'PENDING', 'scope': 'Actual saved PDF text, full-page raster custody, bounds and old/new page equivalence; root independently inspects these complete pages.'}
(OUT / 'delivered-delta-measurements.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'pdfs': len(rows), 'completePages': report['finalGuidePages'], 'destructionPDFsUnchanged': len(destruction), 'independentReview': 'PENDING'}))
