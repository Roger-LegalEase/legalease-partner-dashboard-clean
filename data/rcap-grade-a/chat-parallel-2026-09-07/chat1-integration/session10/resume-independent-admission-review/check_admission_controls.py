#!/usr/bin/env python3
"""Independent synthetic controls only; no real receipt or admission is created."""
import contextlib
import copy
import hashlib
import io
import json
from pathlib import Path
import re
import runpy
import struct
import subprocess
import sys
import tempfile
import zipfile
import zlib

sys.dont_write_bytecode = True
ROOT = Path.cwd()
OUT = Path(__file__).resolve().parent
SCRIPT = ROOT / 'scripts/rcap-packet-recovery/session10/admit-central-batch.py'
ns = runpy.run_path(str(SCRIPT))
checks = []


def check(name, fn, rejected=False):
    try:
        fn()
        passed = not rejected
    except ValueError:
        passed = rejected
    checks.append(dict(name=name, passed=passed, expectedRejection=rejected))


run_id = 990000001
family = 'ky_nonconviction_expungement-set'
config = dict(runId=run_id, packetCommit='7' * 40)
run = dict(id=run_id, path=ns['WORKFLOW'], status='in_progress', conclusion=None)
jobs = dict(jobs=[dict(id=i + 1, run_id=run_id, name=name, status='completed', conclusion='success',
    steps=[dict(name='Refuse a modified packet byte', conclusion='success')])
    for i, name in enumerate(['Synthetic canary and live negative controls', 'Plan the family matrix', family])])
artifact = dict(id=999, name=f'rcap-raster-{family}-{run_id}', expired=False,
    workflow_run=dict(id=run_id), digest='sha256:' + 'a' * 64)
provenance = ns['provenance']
check('own successful receipt while other jobs are running', lambda: provenance(config, family, run, jobs, artifact))
check('own successful receipt when overall run failed for another family',
    lambda: provenance(config, family, dict(run, status='completed', conclusion='failure'), jobs, artifact))
for gate in range(3):
    for state in ['failure', 'cancelled', 'skipped', 'neutral']:
        altered = copy.deepcopy(jobs)
        altered['jobs'][gate]['conclusion'] = state
        check(f'gate {gate} conclusion {state} refused', lambda altered=altered: provenance(config, family, run, altered, artifact), True)
    altered = copy.deepcopy(jobs)
    altered['jobs'][gate]['status'] = 'in_progress'
    check(f'incomplete gate {gate} refused', lambda altered=altered: provenance(config, family, run, altered, artifact), True)
altered = copy.deepcopy(jobs)
altered['jobs'][2]['steps'][0]['conclusion'] = 'skipped'
check('skipped unchanged-byte step refused', lambda: provenance(config, family, run, altered, artifact), True)
check('artifact from another run refused', lambda: provenance(config, family, run, jobs, dict(artifact, workflow_run=dict(id=1))), True)
check('expired artifact refused', lambda: provenance(config, family, run, jobs, dict(artifact, expired=True)), True)
check('artifact without immutable digest refused', lambda: provenance(config, family, run, jobs, dict(artifact, digest='')), True)
check('run metadata identity mismatch refused', lambda: provenance(config, family, dict(run, id=1), jobs, artifact), True)
check('wrong workflow refused', lambda: provenance(config, family, dict(run, path='other.yml'), jobs, artifact), True)
check('queued unexecuted run refused', lambda: provenance(config, family, dict(run, status='queued'), jobs, artifact), True)
for gate in range(3):
    altered = copy.deepcopy(jobs)
    altered['jobs'][gate]['run_id'] = 1
    check(f'gate {gate} run mismatch refused', lambda altered=altered: provenance(config, family, run, altered, artifact), True)


def chunk(kind, value):
    return struct.pack('>I', len(value)) + kind + value + struct.pack('>I', zlib.crc32(kind + value))


# This synthetic bitmap exercises only consumer structure/pin checks. It is not
# central raster evidence and is never persisted as a real family receipt.
width, height = 2040, 2640
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 0, 0, 0, 0))
png += chunk(b'IDAT', zlib.compress((b'\0' + b'\xff' * width) * height)) + chunk(b'IEND', b'')
expected = dict(familyId=family, documentsDigest='d' * 64, documents=[])
images = {}
measurements = []
for role in ['canonical', 'boundary']:
    name = role + '.pdf'
    expected[role + 'PdfPath'] = name
    expected[role + 'PdfSha256'] = 'a' * 64
    expected['documents'].append(dict(name=name, role=role, path=name, sha256='a' * 64,
        pageCount=1, byteLength=5, pageSizesPt=[[612, 792]]))
    image_name = f'{family}/{role}/page-001.png'
    images[image_name] = png
    measurements.append(dict(document=name, page=1, png=image_name, kind=role, nonblank=True,
        croppedToThePage=True, calibrationResidualPx=0.1, inkFractionInsidePaper=0.1,
        pageWidthPt=612, pageHeightPt=792, paper=dict(x0=0, y0=0, width=width, height=height), bytes=len(png)))
verdict = dict(schemaVersion='rcap-raster-family-verdict/v1', familyId=family, verdict='RASTER_PASS',
    workflowRunId=run_id, packetCommitSha=config['packetCommit'], documentsDigest=expected['documentsDigest'],
    problems=[], environmentProblems=[], packetPdfsModified=0, coversTheWholeFamily=True, requestedScale=2.5,
    documentsRendered=[dict(role=d['role'], document=d['name'], path=d['path'], pinned=d['sha256']) for d in expected['documents']],
    hashesBound={role: dict(path=expected[role + 'PdfPath'], pinned=expected[role + 'PdfSha256']) for role in ['canonical', 'boundary']},
    measurements=measurements, pagesMeasured=2)
validate = ns['validate']
check('synthetic complete inventory structure accepted', lambda: validate(config, expected, verdict, images))
changes = {
    'document omitted': lambda v: v['documentsRendered'].pop(),
    'primary pin altered': lambda v: v['hashesBound']['canonical'].update(pinned='b' * 64),
    'duplicate page': lambda v: v['measurements'].__setitem__(1, copy.deepcopy(v['measurements'][0])),
    'page geometry altered': lambda v: v['measurements'][0].update(pageWidthPt=700),
    'paper outside image': lambda v: v['measurements'][0]['paper'].update(x0=10),
    'NaN calibration': lambda v: v['measurements'][0].update(calibrationResidualPx=float('nan')),
    'wrong scale': lambda v: v.update(requestedScale=2),
}
for name, alter in changes.items():
    changed = copy.deepcopy(verdict)
    alter(changed)
    check(name + ' refused', lambda changed=changed: validate(config, expected, changed, images), True)

actual_inventory = json.loads((ROOT / ns['INVENTORY']).read_text())
actual_queue = json.loads(subprocess.check_output(['git', 'show', '774e1c3e3fa7ffd8e4f2aefea384440e4b1dab90:' + str(ns['QUEUE'])]))
inventory_summary = []
for item in actual_inventory['families']:
    row = next(row for row in actual_queue['rows'] if row['familyId'] == item['familyId'])
    mismatches = [key for key in ['canonicalPdfPath', 'canonicalPdfSha256', 'boundaryPdfPath', 'boundaryPdfSha256', 'documentsDigest'] if row[key] != item[key]]
    inventory_summary.append(dict(familyId=item['familyId'], documents=len(item['documents']),
        pages=sum(d['pageCount'] for d in item['documents']), primaryPinMismatches=mismatches,
        diagnosticDocuments=sum(d.get('selectionKind') == 'diagnostic' for d in item['documents']),
        conditionalExamples=sum(d.get('selectionKind') == 'conditional_packet_example' for d in item['documents'])))

result = dict(scope='Independent consumer code review and synthetic controls; no actual raster/semantic admission',
    candidateCommit='774e1c3e3fa7ffd8e4f2aefea384440e4b1dab90',
    reviewedScriptSha256=hashlib.sha256(SCRIPT.read_bytes()).hexdigest(), checks=checks,
    passed=sum(c['passed'] for c in checks), total=len(checks), inventory=inventory_summary,
    modifiesSharedFiles=False, createsIndependentSemanticReview=False, runtimeChanged=False, productionChanged=False)
(OUT / 'admission-controls.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(dict(passed=result['passed'], total=result['total'], resultPath=str(OUT / 'admission-controls.json'))))
assert all(c['passed'] for c in checks)
