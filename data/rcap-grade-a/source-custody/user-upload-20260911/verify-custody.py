#!/usr/bin/env python3
"""Read-only verification of the owner-pinned source archive and adopted bodies."""
import hashlib
import json
import pathlib
import re
import subprocess
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[4]
HERE = pathlib.Path(__file__).resolve().parent
load = lambda path: json.loads(path.read_text())
digest = lambda data: hashlib.sha256(data).hexdigest()
manifest = load(HERE / 'manifest.json')
local = load(HERE / 'local-verification.json')
adoption = load(ROOT / 'data/rcap-grade-a/source-wave-integration/SOURCE_USER_UPLOAD_ADOPTION_2026-09-11.json')
archive = ROOT / local['bundle']['heldPath']
assert digest(archive.read_bytes()) == manifest['bundle']['sha256'] == '6d741583740ba6cdc4daec17d12abcd350257bf3eaea550ecee988bed0cb6d02'
assert archive.stat().st_size == manifest['bundle']['byteLength'] == 3669331
by_name = {row['name']: row for row in local['files']}
with zipfile.ZipFile(archive) as bundle:
    assert sorted(bundle.namelist()) == sorted(row['name'] for row in manifest['files'])
    for row in manifest['files']:
        data = bundle.read(row['name'])
        assert len(data) == row['byteLength']
        assert digest(data) == row['sha256']
        assert data == (ROOT / by_name[row['name']]['heldCorpusPath']).read_bytes()
        if row.get('duplicateBytesOf'):
            assert data == bundle.read(row['duplicateBytesOf'])
assert len(by_name) == 14
assert len({row['sha256'] for row in by_name.values()}) == 12
assert len({row['sourceId'] for row in adoption['sources']}) == len(adoption['sources']) == 12
for source in adoption['sources']:
    data = (ROOT / source['heldCorpusPath']).read_bytes()
    assert len(data) == source['byteLength'] and digest(data) == source['sha256']
    for name in source.get('uploadedNames', []):
        assert by_name[name]['sha256'] == source['sha256']
def text(name):
    return subprocess.check_output(['pdftotext', '-layout', str(ROOT / by_name[name]['heldCorpusPath']), '-'], text=True)
nm = text('4-222-new(2).pdf')
assert re.search(r'STATE OF NEW MEXICO\s+COUNTY OF_+\s+_+ COURT', nm)
assert not re.search(r'SIXTH|6TH JUDICIAL', nm, re.I)
az = ROOT / by_name['R260001(2).PDF']['heldCorpusPath']
assert subprocess.check_output(['pdfdetach', '-list', str(az)], text=True).strip() == '0 embedded files'
assert re.search(r'Pages:\s+2\b', subprocess.check_output(['pdfinfo', str(az)], text=True))
assert 'attachment to this order' in text('R260001(2).PDF')
yuma = text('SC - Application and Order(2).pdf')
assert 'IN YUMA COUNTY' in yuma and 'CR41FORM31A-103023' in yuma and 'CR41FORM31B-103023' in yuma
assert 'Rule' in text('CRIMINAL Certificate of Compliance(2).pdf')
assert 'July 1, 2023' in text('JDF615(2).pdf')
current615 = next(source for source in adoption['sources'] if source['sourceId'] == 'official-form:JDF-615')
assert current615['sha256'] == '106cbd5edad2272f3f6f1378450b007507da879e6a917437d2cc3bb062d87647'
assert 'August 7, 2024' in subprocess.check_output(['pdftotext', '-layout', str(ROOT / current615['heldCorpusPath']), '-'], text=True)
assert len(adoption['duplicateUploads']) == 2
assert len(adoption['notAdoptedAsCurrentForms']) == 4
assert adoption['terminalPromotions'] == adoption['commercialRoutesOpened'] == 0
print('PASS: archive SHA/size; 14/14 uploads; 12 unique PDFs; 12/12 adopted source bindings; two duplicate aliases; statewide NM caption; stale JDF615/Yuma excluded; Arizona amended forms absent.')
