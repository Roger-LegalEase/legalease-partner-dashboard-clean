"""Read the actual DE repaired packet and its mandatory attachment handoff."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

root = Path('data/rcap-all50/overlays/census-v1/de/de-discretionary-superior-court-set--official-pdf-fill')
def normalize(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())

guide = (root / 'participant-instructions.md').read_text()
manifest = json.loads(Path('data/record-clearing/legal-design-packet-set-manifests.json').read_text())
contract = next(s for s in manifest['packetSets'] if s['packetSetId'] == 'de_discretionary_superior_court-set')
assert all(c['role'] != 'cover_sheet' for c in contract['components'])
letter = next(a for a in contract['participantActionRequired'] if a['kind'] == 'obtain_document' and 'SBI Cover Letter' in a['description'])
assert letter['requirement'] == 'required' and letter['requiredBeforeFiling'] is True
assert normalize(letter['description']) in normalize(guide), 'Mandatory SBI attachment instruction missing from guide'
assert re.search(r'manifest.injustice.{0,100}checkbox|checkbox.{0,100}manifest.injustice', guide, re.I | re.S), 'Manifest-injustice checkbox task missing'

rows = []
for fixture, name, case in [
    ('canonical', 'Danielle Rose Hargrove', 'K21-03-0455'),
    ('boundary', 'Bartholomew Nkemdirim Vandergrift-Ashworth Jr.', 'N19-11-0032-01')
]:
    pdf = root / 'fixtures' / (fixture + '.pdf')
    info = subprocess.check_output(['pdfinfo', str(pdf)], text=True)
    assert re.search(r'^Pages:\s+2\s*$', info, re.M), 'Current fixtures must contain only petition and proposed order'
    text = subprocess.check_output(['pdftotext', '-layout', str(pdf), '-'], text=True)
    for phrase in ['PLACE THE QUALIFYING SBI COVER LETTER HERE', 'SBI COVER LETTER — PARTICIPANT ATTACHMENT', 'PACKET COVER SHEET']:
        assert normalize(phrase) not in normalize(text), 'Generic attachment marker survives in delivered PDF'
    assert normalize(name) in normalize(text), 'Held participant name absent from saved PDF'
    assert normalize(case) in normalize(text), 'Held criminal case number absent from saved PDF'
    data = pdf.read_bytes()
    rows.append({'fixture': fixture, 'path': str(pdf), 'sha256': hashlib.sha256(data).hexdigest(),
                 'byteLength': len(data), 'pageCount': 2, 'result': 'PASS'})

result = {'familyId': 'de_discretionary_superior_court-set', 'phase': 'captain repair preflight',
          'method': 'Poppler read of saved PDF bytes and mandatory attachment handoff',
          'independentFinalAcceptance': False, 'result': 'PASS', 'fixtures': rows}
Path('/tmp/de-current-saved-pdf-preflight-result.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
