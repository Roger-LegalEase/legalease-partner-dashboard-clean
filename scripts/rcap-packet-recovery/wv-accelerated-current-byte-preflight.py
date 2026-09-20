"""Focused saved-byte checks for the current WV accelerated repair."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

OUT = Path('data/rcap-all50/overlays/census-v1/wv/wv-acc-treatment-job-readiness-set--custom-pleading')
FAMILY = 'wv_acc_treatment_job_readiness-set'
registry = json.loads(Path('data/record-clearing/legal-design-track-registry.json').read_text())
track = next(t for t in registry['tracks'] if t['trackId'] == 'wv_acc_treatment_job_readiness')
stops = track['selfHelpStopConditions']
assert len(stops) == 10
artifacts = json.loads((OUT / 'reports/rendered-artifacts.json').read_text())['artifacts']

def normalized(s):
    return re.sub(r'[^a-z0-9]', '', s.replace('§', 'Sec.').lower())

def pages(pdf, selected):
    return '\n'.join(subprocess.check_output([
        'pdftotext', '-f', str(n), '-l', str(n), '-layout', str(pdf), '-'
    ], text=True) for n in selected)

results = []
for fixture, dob in [('canonical', '04/17/1991'), ('boundary', '12/31/1968')]:
    a = next(a for a in artifacts if a['fixture'] == fixture)
    pdf = OUT / 'fixtures' / (fixture + '.pdf')
    raw = pdf.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == a['sha256']
    assert len(raw) == a['byteLength']
    court_pages = [p['packetPage'] for p in a['pageManifest'] if p['component'].endswith('-supplemental-pleading-3')]
    guide_pages = [p['packetPage'] for p in a['pageManifest'] if p['component'].endswith('-filing-instructions-7')]
    assert court_pages and guide_pages
    court, guide = pages(pdf, court_pages), pages(pdf, guide_pages)
    assert normalized('Date of birth (MM/DD/YYYY): ' + dob) in normalized(court), (fixture, 'held DOB absent from supplemental PDF')
    for phrase in ['governing record', 'governing determination', 'the platform',
                   'copied from your own records', 'do not infer any part',
                   'from the packet record', 'from the route record',
                   'do not file it for a single misdemeanour']:
        assert normalized(phrase) not in normalized(court), (fixture, 'internal/task prose in court PDF', phrase)
    for stop in stops:
        assert normalized(stop) in normalized(guide), (fixture, 'missing stop in saved PDF', stop)
    assert normalized('SINGLE-MISDEMEANOUR SCOPE AND TIMING HOLD') in normalized(guide)
    assert normalized('Do not tick that branch') in normalized(guide)
    results.append({'fixture': fixture, 'path': str(pdf), 'sha256': a['sha256'],
                    'byteLength': len(raw), 'courtPages': court_pages, 'guidePages': guide_pages,
                    'heldDateOfBirthReadFromPdf': dob, 'selfHelpStopsFound': len(stops),
                    'internalCourtInstructionPhrasesFound': 0, 'result': 'PASS'})

record = {'familyId': FAMILY, 'phase': 'captain repair preflight',
          'independentFinalAcceptance': False, 'method': 'Poppler text read of saved PDF bytes',
          'result': 'PASS', 'fixtures': results}
Path('/tmp/wv-focused-pdf-preflight-result.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record))
