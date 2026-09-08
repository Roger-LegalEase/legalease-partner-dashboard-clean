#!/usr/bin/env python3
"""Validate Session10's exact full-document central receipts; optionally admit.

Usage: admit-central-batch.py CONFIG [--admit]
CONFIG names retained API metadata, six artifact ZIPs and the committed reviewed
document inventory. A successful dispatch alone supplies none of this proof.
"""
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

QUEUE = Path('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')
WORKFLOW = '.github/workflows/rcap-packet-raster-acceptance-batch.yml'
INVENTORY = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/resume-required-document-inventory.json'
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda p: json.loads(Path(p).read_text())


def require(ok, message):
    if not ok:
        raise ValueError(message)


def provenance(config, family, run, jobs, artifact):
    run_id = config['runId']
    # Shared gates and this family's immutable successful job decide admission.
    # Another family still running or failing cannot erase this family's proof.
    require(run.get('id') == run_id and run.get('status') in ['in_progress', 'completed'], 'central run has not executed')
    require(run.get('path') == WORKFLOW, 'wrong central workflow')
    for name in ['Synthetic canary and live negative controls', 'Plan the family matrix', family]:
        found = [j for j in jobs['jobs'] if j.get('name') == name]
        require(len(found) == 1 and found[0].get('run_id') == run_id and found[0].get('status') == 'completed' and found[0].get('conclusion') == 'success', 'central job failed or absent: '+name)
        if name == family:
            require(any(s.get('name') == 'Refuse a modified packet byte' and s.get('conclusion') == 'success' for s in found[0]['steps']), 'unchanged-packet gate absent')
            job_id = found[0]['id']
    require(artifact.get('workflow_run', {}).get('id') == run_id, 'artifact run mismatch')
    require(artifact.get('name') == f'rcap-raster-{family}-{run_id}' and artifact.get('expired') is False, 'artifact identity/expiry mismatch')
    require(re.fullmatch(r'sha256:[0-9a-f]{64}', artifact.get('digest', '')) is not None, 'artifact has no immutable digest')
    return job_id


def validate(config, expected, verdict, images):
    family = expected['familyId']
    require(verdict.get('schemaVersion') == 'rcap-raster-family-verdict/v1' and verdict.get('familyId') == family, 'wrong family/schema')
    require(verdict.get('verdict') == 'RASTER_PASS' and str(verdict.get('workflowRunId')) == str(config['runId']) and verdict.get('packetCommitSha') == config['packetCommit'], 'wrong verdict/run/commit')
    require(verdict.get('documentsDigest') == expected['documentsDigest'], 'wrong document digest')
    require(verdict.get('problems') == [] and verdict.get('environmentProblems') == [] and verdict.get('packetPdfsModified') == 0 and verdict.get('coversTheWholeFamily') is True, 'incomplete or failed raster')
    require(verdict.get('requestedScale') == 2.5, 'wrong scale')
    docs = expected['documents']
    require(verdict.get('documentsRendered') == [dict(role=d['role'], document=d['name'], path=d['path'], pinned=d['sha256']) for d in docs], 'omitted, reordered or altered document')
    require(verdict.get('hashesBound') == {r: dict(path=expected[r+'PdfPath'], pinned=expected[r+'PdfSha256']) for r in ['canonical', 'boundary']}, 'wrong primary pins')
    by_name = {d['name']: d for d in docs}
    required = {(d['name'], p) for d in docs for p in range(1, d['pageCount']+1)}
    measurements = verdict.get('measurements', [])
    require(len(measurements) == verdict.get('pagesMeasured') == len(required), 'page coverage incomplete')
    observed, names, proof = set(), set(), []
    finite = lambda n: type(n) in (int, float) and math.isfinite(n)
    for p in measurements:
        key = (p.get('document'), p.get('page'))
        require(type(p.get('page')) is int and key in required and key not in observed, 'wrong or duplicate page')
        observed.add(key)
        d = by_name[key[0]]
        directory = re.sub(r'[^A-Za-z0-9._-]', '_', d['name'][:-4])
        name = f'{family}/{directory}/page-{key[1]:03d}.png'
        require(p.get('png') == name and p.get('kind') == d['role'], 'wrong image binding')
        require(p.get('nonblank') is True and p.get('croppedToThePage') is True, 'blank or uncropped page')
        residual, ink = p.get('calibrationResidualPx'), p.get('inkFractionInsidePaper')
        require(finite(residual) and 0 <= residual <= 1.5 and finite(ink) and .0005 < ink <= 1, 'bad calibration or ink measurement')
        width_pt, height_pt = d['pageSizesPt'][key[1]-1]
        require([p.get('pageWidthPt'), p.get('pageHeightPt')] == [width_pt, height_pt], 'page geometry mismatch')
        paper = p.get('paper', {})
        require(all(finite(paper.get(k)) for k in ['x0', 'y0', 'width', 'height']), 'invalid paper box')
        require(abs(paper['width']-width_pt*10/3) <= 20/3 and abs(paper['height']-height_pt*10/3) <= 20/3, 'paper scale mismatch')
        body = images.get(name, b'')
        require(len(body) >= 24 and len(body) == p.get('bytes') and body[:8] == b'\x89PNG\r\n\x1a\n' and body[12:16] == b'IHDR', 'missing or corrupt PNG')
        w, h = struct.unpack('>II', body[16:24])
        require(w > 0 and h > 0 and paper['x0'] >= 0 and paper['y0'] >= 0 and paper['x0']+paper['width'] <= w+1 and paper['y0']+paper['height'] <= h+1, 'paper outside image')
        names.add(name)
        proof.append(dict(document=key[0], page=key[1], path=name, sha256=sha(body), byteLength=len(body)))
    require(observed == required and names == set(images), 'extra or missing images')
    return proof


def controls(config, expected, verdict, images, run, jobs, artifact):
    changes = [lambda v: v.update(verdict='RASTER_FAIL'), lambda v: v.update(packetCommitSha='0'*40),
        lambda v: v.update(workflowRunId='0'), lambda v: v.update(documentsDigest='0'*64),
        lambda v: v['documentsRendered'].pop(), lambda v: v['measurements'].pop(),
        lambda v: v['measurements'].__setitem__(1, copy.deepcopy(v['measurements'][0])),
        lambda v: v['measurements'][0].update(nonblank=False), lambda v: v['measurements'][0].update(calibrationResidualPx=2),
        lambda v: v['measurements'][0].update(inkFractionInsidePaper=0), lambda v: v.update(coversTheWholeFamily=False),
        lambda v: v.update(problems=['clipped']), lambda v: v.update(environmentProblems=['missing browser']),
        lambda v: v.update(packetPdfsModified=1)]
    tests = []
    for change in changes:
        bad = copy.deepcopy(verdict); change(bad)
        tests.append(lambda bad=bad: validate(config, expected, bad, images))
    missing = dict(images); missing.pop(next(iter(missing)))
    corrupt = dict(images); corrupt[next(iter(corrupt))] = b'bad'
    tests += [lambda: validate(config, expected, verdict, missing), lambda: validate(config, expected, verdict, corrupt),
        lambda: provenance(config, expected['familyId'], dict(run, id=0), jobs, artifact),
        lambda: provenance(config, expected['familyId'], run, {'jobs': []}, artifact)]
    for test in tests:
        try: test()
        except ValueError: pass
        else: raise ValueError('corrupt receipt control was accepted')
    return len(tests)


def main():
    require(len(sys.argv) in [2, 3] and (len(sys.argv) == 2 or sys.argv[2] == '--admit'), 'expected CONFIG [--admit]')
    config = read(sys.argv[1]); commit = config['packetCommit']
    require(re.fullmatch(r'[0-9a-f]{40}', commit) is not None, 'immutable commit required')
    original = lambda p: subprocess.check_output(['git', 'show', f'{commit}:{p}'])
    subprocess.run(['git', 'merge-base', '--is-ancestor', commit, 'HEAD'], check=True)
    inventory_bytes = Path(INVENTORY).read_bytes()
    require(inventory_bytes == original(INVENTORY), 'reviewed inventory differs from dispatched commit')
    inventory = json.loads(inventory_bytes)
    queue = read(QUEUE); old_queue = json.loads(original(str(QUEUE)))
    run, jobs = read(config['runPath']), read(config['jobsPath'])
    out = Path(config['out']); out.mkdir(parents=True, exist_ok=True)
    outcomes = []
    require(bool(config['artifacts']) and set(config['artifacts']) <= {f['familyId'] for f in inventory['families']}, 'unknown or empty family inventory')
    for expected in [f for f in inventory['families'] if f['familyId'] in config['artifacts']]:
        family = expected['familyId']; item = config['artifacts'][family]
        artifact = read(item['metadataPath']); job_id = provenance(config, family, run, jobs, artifact)
        archive = Path(item['zipPath']); require('sha256:'+sha(archive.read_bytes()) == artifact['digest'], 'archive digest mismatch')
        rows = [r for r in queue['rows'] if r['familyId'] == family]
        old = [r for r in old_queue['rows'] if r['familyId'] == family]
        require(len(rows) == len(old) == 1, 'family row absent or duplicated')
        row = rows[0]
        for candidate in [row, old[0]]:
            require(candidate['documentsDigest'] == expected['documentsDigest'], 'queued inventory digest changed')
            require(all(candidate[k] == expected[k] for k in ['canonicalPdfPath', 'canonicalPdfSha256', 'boundaryPdfPath', 'boundaryPdfSha256']), 'queued primary input pins changed')
            require(candidate['documents'] == [{k: v for k, v in d.items() if k not in ['byteLength', 'pageSizesPt']} for d in expected['documents']], 'queued inventory changed')
        for d in expected['documents']:
            body = Path(d['path']).read_bytes()
            require(body == original(d['path']) and sha(body) == d['sha256'] and len(body) == d['byteLength'], 'current or immutable PDF mismatch')
        with zipfile.ZipFile(archive) as z:
            require(len(z.namelist()) == len(set(z.namelist())) and sum(i.file_size for i in z.infolist()) < 500_000_000, 'duplicate or oversized ZIP')
            verdict_bytes = z.read(family+'.verdict.json'); verdict = json.loads(verdict_bytes)
            # As in the existing NC full-set consumer, page-calibration.png
            # is renderer evidence, not an additional packet page. Preserve it
            # in the immutable ZIP while validating every numbered page image.
            images = {n: z.read(n) for n in z.namelist() if re.search(r'/page-\d+\.png$', n)}
        pages = validate(config, expected, verdict, images)
        caught = controls(config, expected, verdict, images, run, jobs, artifact)
        verdict_path = out/(family+'.verdict.json'); proof_path = out/(family+'.verified.json')
        verdict_path.write_bytes(verdict_bytes)
        proof = dict(familyId=family, packetCommit=commit, workflowRunId=config['runId'], jobId=job_id,
            artifactId=artifact['id'], artifactDigest=artifact['digest'], runStatus=run['status'], runConclusion=run.get('conclusion'), documentsMeasured=len(expected['documents']),
            pagesMeasured=len(pages), pageImages=pages, admissionNegativeControlsCaught=caught,
            independentSemanticReviewCreated=False, runtimeInstalled=False, productionChanged=False)
        proof_path.write_text(json.dumps(proof, indent=2)+'\n')
        if len(sys.argv) == 3:
            previous = row.get('rasterReceipt')
            if previous and str(previous.get('workflowRunId')) != str(config['runId']): row.setdefault('supersededReceipts', []).append(previous)
            row['currentRasterState'] = 'RASTER_PASS'
            row['rasterReceipt'] = dict(verdict='RASTER_PASS', workflowRunId=str(config['runId']), workflow=WORKFLOW,
                renderedCommitSha=commit, jobId=str(job_id), jobConclusion='success',
                boundToCanonicalSha256=row['canonicalPdfSha256'], boundToBoundarySha256=row['boundaryPdfSha256'],
                documentsDigest=expected['documentsDigest'], documentsCovered=[d['name'] for d in expected['documents']],
                documentsNotCovered=[], coversTheWholeFamily=True, documentsMeasured=len(expected['documents']),
                pagesMeasured=len(pages), problemsFound=0, receiptArtifact=dict(id=str(artifact['id']), name=artifact['name'], zipSha256=artifact['digest']),
                verdictPath=str(verdict_path), verificationPath=str(proof_path),
                admittedBy='Session10 Captain; actual central raster only; original independent review attribution preserved.')
        outcomes.append({k: v for k, v in proof.items() if k != 'pageImages'})
    if len(sys.argv) == 3: QUEUE.write_text(json.dumps(queue, indent=2)+'\n')
    (out/'admission-results.json').write_text(json.dumps(outcomes, indent=2)+'\n')
    print(json.dumps(dict(families=len(outcomes), documents=sum(r['documentsMeasured'] for r in outcomes),
        pages=sum(r['pagesMeasured'] for r in outcomes), controls=sum(r['admissionNegativeControlsCaught'] for r in outcomes), admitted=len(sys.argv) == 3)))


if __name__ == '__main__':
    main()
