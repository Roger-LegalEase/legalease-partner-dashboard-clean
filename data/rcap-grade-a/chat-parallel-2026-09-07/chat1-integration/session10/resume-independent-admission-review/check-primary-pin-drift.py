#!/usr/bin/env python3
"""Exercise main's immutable/current queue pin checks with isolated synthetic IO."""
import contextlib
import copy
import hashlib
import io
import json
from pathlib import Path
import runpy
import sys
import tempfile
import types
import zipfile

OUT = Path(__file__).resolve().parent
seed = runpy.run_path(str(OUT / 'check_admission_controls.py'))
ns = seed['ns']
g = ns['main'].__globals__
checks = []
with tempfile.TemporaryDirectory(prefix='session10-independent-pin-controls-', dir='/tmp') as temp:
    scratch = Path(temp)
    expected = copy.deepcopy(seed['expected'])
    verdict = copy.deepcopy(seed['verdict'])
    old_queue = dict(rows=[])
    originals = {}
    for doc in expected['documents']:
        body = b'%PDF-'
        doc['path'] = str(scratch / doc['name'])
        doc['sha256'] = hashlib.sha256(body).hexdigest()
        Path(doc['path']).write_bytes(body)
        originals[doc['path']] = body
        expected[doc['role'] + 'PdfPath'] = doc['path']
        expected[doc['role'] + 'PdfSha256'] = doc['sha256']
    verdict['documentsRendered'] = [dict(role=d['role'], document=d['name'], path=d['path'], pinned=d['sha256']) for d in expected['documents']]
    verdict['hashesBound'] = {role: dict(path=expected[role + 'PdfPath'], pinned=expected[role + 'PdfSha256']) for role in ['canonical', 'boundary']}
    keys = ['canonicalPdfPath', 'canonicalPdfSha256', 'boundaryPdfPath', 'boundaryPdfSha256']
    row = {key: expected[key] for key in ['familyId', 'documentsDigest', *keys]}
    row['documents'] = [{k: v for k, v in d.items() if k not in ['byteLength', 'pageSizesPt']} for d in expected['documents']]
    queue_path, inventory_path = scratch / 'queue.json', scratch / 'inventory.json'
    inventory_path.write_text(json.dumps(dict(families=[expected])))
    originals[str(inventory_path)] = inventory_path.read_bytes()
    archive = scratch / 'synthetic.zip'
    with zipfile.ZipFile(archive, 'w') as z:
        z.writestr(seed['family'] + '.verdict.json', json.dumps(verdict))
        for name, body in seed['images'].items():
            z.writestr(name, body)
    artifact = dict(seed['artifact'], digest='sha256:' + hashlib.sha256(archive.read_bytes()).hexdigest())
    for name, content in [('artifact', artifact), ('run', seed['run']), ('jobs', seed['jobs'])]:
        (scratch / (name + '.json')).write_text(json.dumps(content))
    config = dict(seed['config'], out=str(scratch / 'out'), runPath=str(scratch / 'run.json'), jobsPath=str(scratch / 'jobs.json'),
        artifacts={seed['family']: dict(metadataPath=str(scratch / 'artifact.json'), zipPath=str(archive))})
    config_path = scratch / 'config.json'
    config_path.write_text(json.dumps(config))
    g['QUEUE'], g['INVENTORY'] = queue_path, str(inventory_path)
    g['subprocess'] = types.SimpleNamespace(
        check_output=lambda args: originals[args[2].split(':', 1)[1]],
        run=lambda args, check: None)
    saved_argv = sys.argv
    sys.argv = [str(seed['SCRIPT']), str(config_path)]
    try:
        queue_path.write_text(json.dumps(dict(rows=[row])))
        originals[str(queue_path)] = queue_path.read_bytes()
        with contextlib.redirect_stdout(io.StringIO()):
            ns['main']()
        checks.append(dict(target='baseline', field='all primary pins', passed=True, reason='matching isolated inputs accepted'))
        for target in ['current', 'immutable']:
            for key in keys:
                current = copy.deepcopy(row)
                old = copy.deepcopy(row)
                changed = current if target == 'current' else old
                changed[key] = '0' * 64 if key.endswith('Sha256') else 'different.pdf'
                queue_path.write_text(json.dumps(dict(rows=[current])))
                originals[str(queue_path)] = json.dumps(dict(rows=[old])).encode()
                try:
                    ns['main']()
                except ValueError as error:
                    accepted = False
                    reason = str(error)
                else:
                    accepted = True
                    reason = 'Unexpected acceptance'
                checks.append(dict(target=target, field=key, passed=not accepted, reason=reason))
    finally:
        sys.argv = saved_argv

result = dict(scope='Synthetic main() negative controls using isolated scratch and stubbed immutable reads; no real receipt or admission',
    reviewedScriptSha256=hashlib.sha256(seed['SCRIPT'].read_bytes()).hexdigest(),
    checks=checks, passed=sum(c['passed'] for c in checks), total=len(checks), sharedFilesModified=False)
(OUT / 'primary-pin-controls.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(dict(passed=result['passed'], total=result['total'], reviewedScriptSha256=result['reviewedScriptSha256'])))
assert all(c['passed'] for c in checks)
