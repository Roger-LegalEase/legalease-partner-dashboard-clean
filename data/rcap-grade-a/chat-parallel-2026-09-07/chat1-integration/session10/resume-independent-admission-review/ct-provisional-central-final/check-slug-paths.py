#!/usr/bin/env python3
"""Independent read-only actual-receipt and slug refusal controls; never admission."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
import time
import zipfile

sys.dont_write_bytecode = True
started = time.monotonic()
here = Path(__file__).resolve().parent
root = Path.cwd()
held = here.parent.parent / 'resume-ct-provisional-central'
helper = root / 'scripts/rcap-packet-recovery/admit-completed-fixture-raster.py'
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda p: json.loads(Path(p).read_text())
spec = importlib.util.spec_from_file_location('fixture_admission_review', helper)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
config = read(held / 'config.json')
pre = read(held / 'pre-admission-queue.json')
row = pre['immutableRow']
run = read(held / 'run.json')
jobs = read(held / 'jobs.json')['jobs']
artifact = read(held / 'artifact.json')
archive = held / 'artifact.zip'
family = config['familyId']
slug = module.family_path(family)
assert artifact['digest'] == 'sha256:' + sha(archive.read_bytes()) == 'sha256:' + config['zipSha256']
assert artifact['id'] == config['artifactId']
assert artifact['name'] == f'rcap-raster-{slug}-{config["runId"]}'
renderer = (root / 'scripts/rcap-raster-batch.mjs').read_text()
assert 'replace(/[^A-Za-z0-9._-]/g, "_")' in renderer
with zipfile.ZipFile(archive) as z:
    names = z.namelist()
    assert len(names) == len(set(names))
    verdict = json.loads(z.read(slug + '.verdict.json'))
    pattern = re.escape(slug) + r'/(canonical|boundary)/page-\d+\.png'
    images = {n: z.read(n) for n in names if re.fullmatch(pattern, n)}
assert len(images) == 4
before = {str(p): sha(p.read_bytes()) for p in [module.Q, helper, archive]}
receipts = module.validate(config, row, verdict, images, run, jobs)
assert len(receipts) == 4
safe_names = ['fl-9430585-set', 'Family_ABC-123.4', 'canonical', 'mi_setaside_first_owi-set']
assert all(module.family_path(n) == n for n in safe_names)
safe_args = copy.deepcopy([config, row, verdict, images, run, jobs])
safe_family = safe_names[1]
safe_args[0]['familyId'] = safe_args[1]['familyId'] = safe_args[2]['familyId'] = safe_family
next(j for j in safe_args[5] if j['name'] == family)['name'] = safe_family
safe_args[3] = {n.replace(slug, safe_family, 1): b for n, b in safe_args[3].items()}
for measurement in safe_args[2]['measurements']:
    measurement['png'] = measurement['png'].replace(slug, safe_family, 1)
assert len(module.validate(*safe_args)) == 4
controls = []

def refuses(name, change):
    args = copy.deepcopy([config, row, verdict, images, run, jobs])
    change(args)
    try:
        module.validate(*args)
    except ValueError as exc:
        controls.append({'control': name, 'result': 'REFUSED', 'reason': str(exc)})
    else:
        raise AssertionError('Corrupt input accepted: ' + name)

refuses('verdict logical family changed to matching slug', lambda a: a[2].update(familyId=slug))
refuses('queue logical family changed to matching slug', lambda a: a[1].update(familyId=slug))
refuses('config logical family changed to matching slug', lambda a: a[0].update(familyId=slug))
collision = family.replace(':', '/')
assert collision != family and module.family_path(collision) == slug
refuses('slug collision verdict retains different logical family', lambda a: a[2].update(familyId=collision))

for name, path in [
    ('unslugged PNG path', family + '/canonical/page-001.png'),
    ('wrong family PNG path', 'different_family/canonical/page-001.png'),
    ('traversal PNG path', '../' + slug + '/canonical/page-001.png'),
    ('absolute PNG path', '/' + slug + '/canonical/page-001.png'),
    ('backslash PNG path', slug + '\\canonical\\page-001.png'),
    ('un-padded numbered PNG path', slug + '/canonical/page-1.png'),
    ('calibration image as packet page', slug + '/canonical/page-calibration.png'),
]:
    refuses(name, lambda a, path=path: a[2]['measurements'][0].update(png=path))
first = next(iter(images))
refuses('missing required numbered PNG', lambda a: a[3].pop(first))
refuses('extra numbered PNG', lambda a: a[3].update({slug + '/canonical/page-003.png': images[first]}))
refuses('wrong family image substituted', lambda a: a[3].update({'different_family/canonical/page-001.png': a[3].pop(first)}))
refuses('path traversal image substituted', lambda a: a[3].update({'../' + first: a[3].pop(first)}))
for job_name in ['Synthetic canary and live negative controls', 'Plan the family matrix', family]:
    refuses('failed required job: ' + job_name, lambda a, job_name=job_name: next(j for j in a[5] if j['name'] == job_name).update(conclusion='failure'))
refuses('own job metadata run mismatch', lambda a: next(j for j in a[5] if j['name'] == family).update(run_id=0))
refuses('run metadata mismatch', lambda a: a[4].update(id=0))

# The ZIP collection remains the renderer's exact slug + role + numbered-page pattern.
path_cases = [slug + '/canonical/page-001.png', slug + '/boundary/page-002.png',
              family + '/canonical/page-001.png', '../' + slug + '/canonical/page-001.png',
              slug + '/canonical/page-calibration.png', 'different_family/canonical/page-001.png']
assert [bool(re.fullmatch(pattern, n)) for n in path_cases] == [True, True, False, False, False, False]
pdfs = []
for role, pin in config['expectedPdfs'].items():
    path = Path(pin['path'])
    current = path.read_bytes()
    committed = subprocess.check_output(['git', 'show', config['packetCommit'] + ':' + str(path)])
    assert sha(current) == sha(committed) == pin['sha256']
    info = subprocess.check_output(['pdfinfo', str(path)], text=True)
    assert int(re.search(r'^Pages:\s+(\d+)', info, re.M).group(1)) == pin['pages'] == 2
    pdfs.append({'role': role, **pin, 'currentAndCommittedBytesMatch': True})
for path, digest in before.items():
    assert sha(Path(path).read_bytes()) == digest, 'Shared/retained file changed during read-only controls'
result = {
    'schemaVersion': 'session10-independent-ct-slug-review/v1',
    'reviewer': 'session10_admission_review; independent of Captain implementation and admission',
    'reviewedHelperSha256': sha(helper.read_bytes()),
    'reviewedHelperCommit': subprocess.check_output(['git', 'log', '-1', '--format=%H', '--', str(helper)], text=True).strip(),
    'rendererFilenameRegexExactMatch': True,
    'packetCommit': config['packetCommit'], 'runId': config['runId'], 'artifactId': config['artifactId'],
    'archiveSha256': config['zipSha256'], 'logicalFamilyId': family, 'filenameSegment': slug,
    'actualReceiptReadOnlyValidation': 'PASS', 'actualDocuments': 2, 'actualNumberedPacketPages': 4,
    'calibrationImagesRetainedInArchiveExcludedFromPacketCount': 2,
    'pdfs': pdfs, 'measuredPageReceipts': receipts,
    'negativeControls': controls, 'negativeControlsRefused': len(controls),
    'unchangedSafeFilenameIdentitiesChecked': safe_names,
    'syntheticSafeFamilyReceiptContract': 'PASS; synthetic consistent family-name substitution only, no semantic approval',
    'zipSelectionBoundaryCasesPassed': 6, 'sharedFilesChanged': False,
    'original18Controls': 'Executed by Captain in retained admission proof; not repeated by this review.',
    'independentSemanticApproval': False, 'newTerminalPromotions': 0,
    'conclusion': 'PASS: only filename segments change; exact logical-family, immutable input and shared-job checks remain enforced.',
    'elapsedSeconds': round(time.monotonic() - started, 3),
}
(here / 'slug-path-review.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: result[k] for k in ['reviewedHelperSha256', 'actualReceiptReadOnlyValidation', 'actualDocuments', 'actualNumberedPacketPages', 'negativeControlsRefused', 'zipSelectionBoundaryCasesPassed', 'sharedFilesChanged', 'elapsedSeconds']}))
