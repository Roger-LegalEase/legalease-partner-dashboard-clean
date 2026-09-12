"""Read-only closure validation for the exact six Alabama repairs."""
import hashlib
import json
import pathlib
import subprocess
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[5]
LANE = pathlib.Path(__file__).resolve().parent
FACT = ROOT / 'data/rcap-grade-a/packet-factory-24h'
checks = 0
def require(value, message):
    global checks
    checks += 1
    if not value:
        raise AssertionError(message)
def read(path):
    return json.loads(pathlib.Path(path).read_text())
def sha(body):
    return hashlib.sha256(body).hexdigest()

baseline = read(LANE / 'starting-evidence.json')
manifest = read(LANE / 'raster-manifest.json')
request = read(LANE / 'dispatch-request.json')['inputs']
families = set(baseline['scope'])
require(len(families) == 6, 'exact six-family scope')
require({r['familyId'] for r in manifest['rows']} == families, 'manifest scope')
proof = read(FACT / 'raster-runs/34664588051/ORIGINAL_EVIDENCE_VERIFIED.json')
require(proof['conclusion'] == 'success' and not proof['partialRunAdmission'], 'whole batch passed')
require(proof['inputs'] == request, 'original evidence dispatch inputs')
require({r['familyId'] for r in proof['families']} == families, 'six original artifacts')
old_manifest, old_request, old_proof = manifest, request, proof
fresh_manifest = read(LANE / 'guidance-ink-repair/raster-manifest.json')
fresh_request = read(LANE / 'guidance-ink-repair/dispatch-request.json')['inputs']
fresh_scope = {'al-diversion-set', 'al-misd-conviction-set', 'al-misd-dwop-set'}
require({r['familyId'] for r in fresh_manifest['rows']} == fresh_scope, 'exact three changed families')
fresh_run = str(read(LANE / 'guidance-ink-repair/current-raster-run.json')['runId'])
fresh_proof = read(FACT / ('raster-runs/' + fresh_run + '/ORIGINAL_EVIDENCE_VERIFIED.json'))
require(fresh_proof['conclusion'] == 'success' and not fresh_proof['partialRunAdmission'], 'fresh selective batch passed')
require(fresh_proof['inputs'] == fresh_request, 'fresh exact dispatch inputs')
require({r['familyId'] for r in fresh_proof['families']} == fresh_scope, 'fresh artifact scope')
initial_fail = FACT / 'vf02/rows-vf02-al-clerk-caption-six-initial-fail-20260912.json'
require(sha(initial_fail.read_bytes()) == '01cc1f3f4d160e06e520a65ea6c3b8f44016583605c76b3bff80216faee03761', 'initial independent failures preserved')
queue = read(FACT / 'MASTER_QUEUE.json')
raster = read(FACT / 'RASTER_QUEUE.json')
ledger = read(FACT / 'claim-ledger.json')
pages = 0
for old in baseline['rows']:
    fid = old['familyId']
    manifest, request, proof = (fresh_manifest, fresh_request, fresh_proof) if fid in fresh_scope else (old_manifest, old_request, old_proof)
    expected_run = fresh_run if fid in fresh_scope else '34664588051'
    historical = old['currentSelectedReview']
    body = (ROOT / historical['path']).read_bytes()
    require(sha(body) == historical['sha256'], fid + ': historical native return unchanged')
    index = int(historical['rowPointer'].split('/')[-1])
    require(json.loads(body)['rows'][index] == historical['row'], fid + ': historical row unchanged')
    for packet in old['historicalPackets']:
        body = subprocess.check_output(['git', 'show', packet['atCommit'] + ':' + packet['path']], cwd=ROOT)
        require(sha(body) == packet['sha256'] and len(body) == packet['sizeBytes'], fid + ': historical PDF available')
    current = next(r for r in queue['families'] if r['familyId'] == fid)
    require(current['state'] == 'COMPLETE_PACKET_PROVEN', fid + ': terminal')
    require(current['sourceBound'] and len(current['counters']) == 9 and all(v == 0 for v in current['counters'].values()), fid + ': source and nine counters')
    verdict = current['selectedIndependentVerdict']
    require(verdict['verdict'] == 'PASS_COMPLETE_INDEPENDENT', fid + ': independent acceptance')
    native = read(ROOT / verdict['evidencePath'])
    selected = [r for r in native['rows'] if r.get('itemId', r.get('familyId')) == fid and r.get('verifiedAtBase', native.get('verifiedAtBase')) == verdict['verifiedAtBase']]
    require(len(selected) == 1, fid + ': one authoritative independent row')
    review = selected[0]
    obligations = review['proofObligations']
    require(len(obligations) == 15 and all(r.get('measured') is True and r.get('result') == 'PASS' for r in obligations.values()), fid + ': all fifteen measured obligations pass')
    require(review.get('packetPdfsModified') == 0, fid + ': independent reviewer did not modify PDFs')
    require(str(review.get('rasterWorkflowRunId')) == expected_run, fid + ': reviewer read current raster')
    for claim in ledger['claims']:
        if claim.get('familyId') == fid and claim.get('laneKind') in ['repair', 'independent-verification']:
            require(claim['released'] is True, fid + ': claim released')
    mr = next(r for r in manifest['rows'] if r['familyId'] == fid)
    rr = next(r for r in raster['rows'] if r['familyId'] == fid)
    require(rr['currentRasterState'] == 'RASTER_PASS' and rr['documentsDigest'] == mr['documentsDigest'], fid + ': current receipt digest')
    require(str(rr['rasterReceipt']['workflowRunId']) == expected_run, fid + ': current run')
    for document in mr['documents']:
        body = (ROOT / document['path']).read_bytes()
        committed = subprocess.check_output(['git', 'show', request['commit_sha'] + ':' + document['path']], cwd=ROOT)
        require(sha(body) == sha(committed) == document['sha256'], fid + ': current and dispatched PDF hash')
        pins = [p for p in review['artifactsRead'] if p['path'] == document['path']]
        require(len(pins) == 1 and pins[0]['sha256'] == document['sha256'] and pins[0]['byteLength'] == len(body), fid + ': independent current PDF pin')
    original = next(r for r in proof['families'] if r['familyId'] == fid)
    archive = ROOT / original['archivePath']
    require(sha(archive.read_bytes()) == original['archiveSha256'] == original['artifact']['digest'].removeprefix('sha256:'), fid + ': exact API-pinned ZIP')
    v = read(ROOT / original['verdictPath'])
    require(v['packetCommitSha'] == request['commit_sha'] and v['verdict'] == 'RASTER_PASS' and v['packetPdfsModified'] == 0, fid + ': raster accepted unchanged packet')
    expected = {(d['name'], p) for d in mr['documents'] for p in range(1, d['pageCount'] + 1)}
    require(len(v['measurements']) == len(expected) == 22, fid + ': all canonical and boundary pages')
    require({(m['document'], m['page']) for m in v['measurements']} == expected, fid + ': exact page set')
    with zipfile.ZipFile(archive) as z:
        for m in v['measurements']:
            body = z.read(m['png'])
            require(sha(body) == m['pngSha256'] and len(body) == m['bytes'], fid + ': original PNG hash and size')
            pages += 1
source_proof = read(LANE / 'current-byte-proof.json')
for source in source_proof['sourceBindings']:
    require(sha((ROOT / source['path']).read_bytes()) == source['sha256'], 'unchanged exact official source')
protected = read(ROOT / '.git/restart-recovery-20260911/untracked-inventory.json')
require(len(protected) == 121, 'protected inventory remains exact')
for item in protected:
    body = (ROOT / item['path']).read_bytes()
    require(sha(body) == item['sha256'] and len(body) == item['size'], 'protected file: ' + item['path'])
require(pages == 132, 'all 132 original pages')
print(json.dumps({'result': 'PASS', 'checksPassed': checks, 'checksFailed': 0, 'familiesTerminal': 6, 'pdfs': 12, 'originalPages': pages, 'protectedFiles': len(protected)}, indent=2))
