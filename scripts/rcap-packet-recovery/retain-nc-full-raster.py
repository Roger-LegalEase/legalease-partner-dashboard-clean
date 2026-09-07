#!/usr/bin/env python3
"""Consume the completed NC ten-document central raster, not semantic approval.

Usage: retain-nc-full-raster.py ZIP RUN_JSON JOBS_JSON ARTIFACT_JSON [--admit]
The immutable packet and each of its eight selected variants remain unchanged.
All repository writes are limited to retained evidence and the one raster row.
"""
from __future__ import annotations
import copy
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import subprocess
import sys
import zipfile

FAMILY = 'nc_146_dismissal_petition-set'
COMMIT = '49ff69cdf9a110696cdf8dc5c29cb1b54ee6e54a'
RUN_ID = 34121189163
JOB_ID = 101740185655
ARTIFACT_ID = 10018791229
ZIP_SHA = '83e44710275ed350349fd130e24a67f6d0cc974721d5c2dae47b90c37752f608'
DOCS_DIGEST = '8744fb3776bda61ae2bd5e43fde5ff1ae2a921d446e8af36c203e658625838e7'
WORKFLOW = '.github/workflows/rcap-packet-raster-acceptance-batch.yml'
DIRECTORY = 'data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill'
QUEUE = Path('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')
OUT = Path('data/rcap-grade-a/completion-pass-2026-09-07/nc-full-raster')
# Exact inputs selected by the immutable ten-document manifest.
EXPECTED = {
    name: (role, DIRECTORY+'/fixtures/'+name, digest, pages)
    for name, role, digest, pages in [
        ('canonical.pdf', 'canonical', '3c4fbfc4260ee871340643b6ddcbb8351559785428fd9ff34c207893ad1fd039', 8),
        ('branches/canonical-fee_paid.pdf', 'canonical', '3512077fa889867167feaab293245fea9d2fbe5488110613aecbcf088d732d7a', 4),
        ('branches/canonical-indigency_requested.pdf', 'canonical', '739bad827110e4040c9f80d98691e750d40f66694016d0e3dd9d956fa92625f3', 6),
        ('branches/canonical-no_fee.pdf', 'canonical', 'b0eb631bb5ec212352ef841f6df5668593fa923b1a8cd3452f57ed052b410aa7', 4),
        ('branches/canonical-requested_financial_supplement.pdf', 'canonical', '3888f73d61335835dd00597f7a0b894ccb1f746987f0966d06ac9df7f6df1ac5', 8),
        ('boundary.pdf', 'boundary', '5e6e479a3dad1f85957fb16cca060c009aaee7151f70d177e2af7a44ae325717', 8),
        ('branches/boundary-fee_paid.pdf', 'boundary', '72246e0eb69dfb7a4b1a96fe0104b7b796fde2bfce2f225054e250df4c7e6028', 4),
        ('branches/boundary-indigency_requested.pdf', 'boundary', 'cbfaa98d08dcf27ea869a28f370e5616c48b6f9d64490e7d33587a1092cc4cf2', 6),
        ('branches/boundary-no_fee.pdf', 'boundary', '1ed90492e01f527cbf4dee117629dbe8e510700bc9b3a3520558210aadbf2762', 4),
        ('branches/boundary-requested_financial_supplement.pdf', 'boundary', '34b533fbec138a6fce309b49cd4cbd29bbdf92d2cdec0bfc2f204619c8efc292', 8),
    ]
}


def require(ok: bool, message: str) -> None:
    if not ok:
        raise RuntimeError(message)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def unique_row(queue: dict) -> dict:
    rows = [row for row in queue.get('rows', []) if row.get('familyId') == FAMILY]
    require(len(rows) == 1, 'Missing or duplicate NC raster row')
    row = rows[0]
    actual = {d['name']: (d['role'], d['path'], d['sha256'], d['pageCount']) for d in row['documents']}
    require(len(actual) == len(row['documents']) == 10, 'Missing or duplicate selected document')
    require(actual == EXPECTED and row.get('documentsDigest') == DOCS_DIGEST, 'Wrong complete document inventory')
    for role in ('canonical', 'boundary'):
        doc = EXPECTED[role+'.pdf']
        require(row.get(role+'PdfPath') == doc[1] and row.get(role+'PdfSha256') == doc[2], 'Wrong primary input pin')
    return row


def provenance(run: dict, jobs: dict, artifact: dict) -> None:
    require(run.get('id') == RUN_ID and run.get('status') == 'completed' and run.get('conclusion') == 'success', 'Central run not passed')
    require(run.get('path') == WORKFLOW, 'Unexpected central workflow')
    required = {'Synthetic canary and live negative controls', 'Plan the family matrix', FAMILY}
    for name in required:
        matches = [j for j in jobs.get('jobs', []) if j.get('name') == name]
        require(len(matches) == 1, 'Missing/duplicate central job: '+name)
        job = matches[0]
        require(job.get('run_id') == RUN_ID and job.get('status') == 'completed' and job.get('conclusion') == 'success', 'Unsuccessful central job: '+name)
        if name == FAMILY:
            require(job.get('id') == JOB_ID, 'Unexpected family job')
            require(any(s.get('name') == 'Refuse a modified packet byte' and s.get('conclusion') == 'success' for s in job.get('steps', [])), 'Unchanged-input gate not passed')
    require(ARTIFACT_ID > 0 and artifact.get('id') == ARTIFACT_ID, 'Wrong artifact identity')
    require(artifact.get('name') == f'rcap-raster-{FAMILY}-{RUN_ID}', 'Wrong artifact name')
    require(artifact.get('workflow_run', {}).get('id') == RUN_ID, 'Artifact from a different run')
    require(artifact.get('digest') == 'sha256:'+ZIP_SHA, 'Artifact digest identity mismatch')


def validate_verdict(v: dict, images: dict[str, bytes]) -> list[dict]:
    require(v.get('schemaVersion') == 'rcap-raster-family-verdict/v1', 'Wrong verdict schema')
    require(v.get('familyId') == FAMILY and v.get('verdict') == 'RASTER_PASS', 'Wrong family/verdict')
    require(v.get('packetCommitSha') == COMMIT and str(v.get('workflowRunId')) == str(RUN_ID), 'Wrong packet commit/run')
    require(v.get('documentsDigest') == DOCS_DIGEST, 'Wrong document-set digest')
    require(v.get('coversTheWholeFamily') is True and v.get('packetPdfsModified') == 0, 'Incomplete/modified packet')
    require(v.get('problems') == [] and v.get('environmentProblems') == [], 'Raster has problems')
    require(v.get('requestedScale') == 2.5, 'Unexpected requested scale')
    require(len(v.get('documentsRendered', [])) == 10, 'Ten actual rendered documents required')
    rendered = {d['document']: (d['role'], d['path'], d['pinned']) for d in v['documentsRendered']}
    require(rendered == {name: row[:3] for name, row in EXPECTED.items()}, 'Rendered input inventory/pins mismatch')
    primary = {role: {'path': EXPECTED[role+'.pdf'][1], 'pinned': EXPECTED[role+'.pdf'][2]} for role in ('canonical', 'boundary')}
    require(v.get('hashesBound') == primary, 'Wrong primary PDF pins')
    required_pages = {(name, page) for name, doc in EXPECTED.items() for page in range(1, doc[3]+1)}
    rows = v.get('measurements', [])
    require(len(rows) == v.get('pagesMeasured') == 60, 'Expected all sixty measured pages')
    seen, names, receipts = set(), set(), []
    finite = lambda n: type(n) in (int, float) and math.isfinite(n)
    for row in rows:
        name, number = row.get('document'), row.get('page')
        key = (name, number)
        require(type(number) is int and key in required_pages and key not in seen, 'Missing/duplicate/unexpected page')
        seen.add(key)
        require(row.get('kind') == EXPECTED[name][0], 'Wrong page role')
        directory = re.sub(r'[^A-Za-z0-9._-]', '_', name[:-4])
        expected_name = f'{FAMILY}/{directory}/page-{number:03d}.png'
        require(row.get('png') == expected_name, 'Page-image binding mismatch')
        require(row.get('nonblank') is True and row.get('croppedToThePage') is True, 'Blank or uncalibrated page')
        residual = row.get('calibrationResidualPx')
        ink = row.get('inkFractionInsidePaper')
        require(finite(residual) and 0 <= residual <= 1.5, 'Bad calibration residual')
        require(finite(ink) and .0005 < ink <= 1, 'Bad page ink measurement')
        require(row.get('pageWidthPt') == 612 and row.get('pageHeightPt') == 792, 'Wrong page geometry')
        paper = row.get('paper', {})
        require(all(finite(paper.get(k)) for k in ['x0','y0','width','height']), 'Invalid measured paper box')
        require(abs(paper['width'] - 2040) <= 20/3 and abs(paper['height'] - 2640) <= 20/3, 'Paper not calibrated at requested scale')
        body = images.get(expected_name, b'')
        require(len(body) == row.get('bytes') and body[:8] == b'\x89PNG\r\n\x1a\n' and body[12:16] == b'IHDR', 'Missing/truncated page PNG')
        require(len(body) >= 24, 'Truncated PNG header')
        width, height = struct.unpack('>II', body[16:24])
        require(width > 0 and height > 0 and paper['x0'] >= 0 and paper['y0'] >= 0 and paper['x0']+paper['width'] <= width+1 and paper['y0']+paper['height'] <= height+1, 'Measured page outside PNG')
        names.add(expected_name)
        receipts.append({'document': name, 'page': number, 'png': expected_name, 'sha256': sha(body), 'byteLength': len(body)})
    require(seen == required_pages and names == set(images), 'Incomplete/extra page-image inventory')
    return receipts


def validate_inputs(current, immutable) -> None:
    for name, doc in EXPECTED.items():
        for label, load in [('current', current), ('immutable', immutable)]:
            body = load(doc[1])
            require(body.startswith(b'%PDF-') and sha(body) == doc[2], f'{label} input bytes mismatch: {name}')


def controls(v: dict, images: dict, run: dict, jobs: dict, artifact: dict) -> int:
    # Receipt-admission controls only, not renderer trials or semantic review.
    changes = [lambda x:x.update(verdict='RASTER_FAIL'), lambda x:x.update(packetCommitSha='0'*40),
        lambda x:x.update(documentsDigest='0'*64), lambda x:x.update(workflowRunId='0'),
        lambda x:x['documentsRendered'].pop(), lambda x:x['documentsRendered'][1].update(pinned='0'*64),
        lambda x:x['measurements'].pop(), lambda x:x['measurements'].__setitem__(1,copy.deepcopy(x['measurements'][0])),
        lambda x:x['measurements'][0].update(nonblank=False), lambda x:x['measurements'][0].update(calibrationResidualPx=2),
        lambda x:x['measurements'][0].update(inkFractionInsidePaper=0), lambda x:x['measurements'][0].update(png='wrong.png'),
        lambda x:x.update(coversTheWholeFamily=False), lambda x:x.update(packetPdfsModified=1),
        lambda x:x.update(problems=['clipped']), lambda x:x.update(environmentProblems=['missing browser'])]
    tests = []
    for change in changes:
        bad = copy.deepcopy(v); change(bad)
        tests.append(lambda bad=bad: validate_verdict(bad, images))
    missing = dict(images); missing.pop(next(iter(missing)))
    broken = dict(images); broken[next(iter(broken))] = b'bad'
    tests += [lambda:validate_verdict(v,missing), lambda:validate_verdict(v,broken),
        lambda:provenance(dict(run,conclusion='failure'),jobs,artifact),
        lambda:provenance(run,{'jobs':[j for j in jobs['jobs'] if j.get('name') != FAMILY]},artifact),
        lambda:provenance(run,jobs,dict(artifact,digest='sha256:'+'0'*64))]
    for i, test in enumerate(tests):
        try: test()
        except RuntimeError: pass
        else: raise RuntimeError(f'Invalid receipt control {i+1} was accepted')
    return len(tests)


def write_once(path: Path, body: bytes) -> None:
    if path.exists():
        require(path.read_bytes() == body, 'Refusing to overwrite different evidence: '+str(path))
    else:
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(body)


def main() -> None:
    require(len(sys.argv) in (5,6) and (len(sys.argv)==5 or sys.argv[5]=='--admit'), 'Expected ZIP RUN_JSON JOBS_JSON ARTIFACT_JSON [--admit]')
    archive, run_path, jobs_path, artifact_path = map(Path, sys.argv[1:5])
    run, jobs, artifact = [json.loads(p.read_text()) for p in (run_path,jobs_path,artifact_path)]
    provenance(run,jobs,artifact)
    require(sha(archive.read_bytes()) == ZIP_SHA, 'ZIP bytes do not match observed artifact')
    original = lambda path: subprocess.check_output(['git','show',f'{COMMIT}:{path}'])
    current_queue = json.loads(QUEUE.read_text()); row = unique_row(current_queue)
    unique_row(json.loads(original(str(QUEUE))))
    validate_inputs(lambda p:Path(p).read_bytes(),original)
    inventory = json.loads(Path(DIRECTORY,'reports/rendered-artifacts.json').read_text())
    declared = {x['file']:x['sha256'] for x in inventory['pdfs']}
    require(declared == {d[1]:d[2] for d in EXPECTED.values()}, 'Current renderer inventory differs from measured inputs')
    with zipfile.ZipFile(archive) as z:
        require(len(z.namelist())==len(set(z.namelist())), 'Duplicate ZIP members')
        require(sum(i.file_size for i in z.infolist()) < 500_000_000, 'Unexpected ZIP expansion')
        raw = z.read(FAMILY+'.verdict.json'); v=json.loads(raw)
        images = {n:z.read(n) for n in z.namelist() if n.startswith(FAMILY+'/') and re.search(r'/page-\d+\.png$',n)}
    page_receipts = validate_verdict(v,images)
    caught = controls(v,images,run,jobs,artifact)
    proof = dict(schemaVersion='rcap-nc-complete-raster-receipt/v1',familyId=FAMILY,packetCommit=COMMIT,
        workflowRunId=RUN_ID,jobId=JOB_ID,artifactId=ARTIFACT_ID,artifactZipSha256=ZIP_SHA,
        artifactDigestVerified=True,currentAndImmutableInputsMatch=True,documentsDigest=DOCS_DIGEST,
        documentsMeasured=10,pagesMeasured=60,selectableBranchDocuments=8,selectableBranchPages=44,
        currentRendererInventoryComplete=True,pageImages=page_receipts,admissionNegativeControlsCaught=caught,
        independentSemanticApprovalGranted=False,newTerminalPromotions=0,packetRebuilds=0,productionTouched=False,
        priorScopedRun={'runId':34114198034,'documents':2,'pages':16,'sufficientForWholeFamily':False})
    write_once(OUT/(FAMILY+'.verdict.json'),raw)
    write_once(OUT/'verified-receipt.json',(json.dumps(proof,indent=2)+'\n').encode())
    if len(sys.argv)==6:
        previous=row.get('rasterReceipt')
        if previous and str(previous.get('workflowRunId'))!=str(RUN_ID):
            row.setdefault('supersededReceipts',[]).append(previous)
        row['currentRasterState']='RASTER_PASS'
        row['rasterReceipt']={'verdict':'RASTER_PASS','workflowRunId':str(RUN_ID),'workflow':WORKFLOW,
            'renderedCommitSha':COMMIT,'jobId':str(JOB_ID),'jobConclusion':'success',
            'boundToCanonicalSha256':row['canonicalPdfSha256'],'boundToBoundarySha256':row['boundaryPdfSha256'],
            'documentsDigest':DOCS_DIGEST,'documentsCovered':list(EXPECTED),'documentsNotCovered':[],
            'coversTheWholeFamily':True,'documentsMeasured':10,'pagesMeasured':60,'problemsFound':0,
            'receiptArtifact':{'id':str(ARTIFACT_ID),'name':artifact['name'],'zipSha256':'sha256:'+ZIP_SHA},
            'verdictPath':str(OUT/(FAMILY+'.verdict.json')),'verificationPath':str(OUT/'verified-receipt.json'),
            'receiptArtifactInspection':'Verified fixed archive, successful jobs, all sixty unique calibrated page images, all ten current and immutable inputs, and receipt-admission negative controls.',
            'admittedBy':'Chat A integration; central raster only, not independent semantic approval.'}
        QUEUE.write_text(json.dumps(current_queue,indent=2)+'\n')
    print(json.dumps({k:proof[k] for k in ['familyId','workflowRunId','documentsMeasured','pagesMeasured','admissionNegativeControlsCaught','newTerminalPromotions','packetRebuilds']}))


if __name__ == '__main__':
    main()
