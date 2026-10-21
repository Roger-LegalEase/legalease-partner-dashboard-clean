"""Read-only cross-check of independent returns, current bytes, and native admission."""
import argparse, hashlib, json, pathlib, re, struct, subprocess, zipfile
from collections import Counter

BASE = pathlib.Path('data/rcap-grade-a/packet-factory-24h')
HERE = BASE / 'seven-cleared-20260911'
FAMILIES = {'nm_conviction-set', 'nm_identity_theft-set', 'nm_release_without_conviction-set',
            'co_motion_seal_conviction-set', 'co_motion_seal_nonconviction-set',
            'official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b',
            'la-987-set-aside-and-dismiss-set'}
OBLIGATIONS = {'ROUTE_IDENTITY','SOURCE_IDENTITY','COMPONENT_SET','KNOWN_PREFILLS',
 'REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','PROTECTED_FIELDS','ARTIFACTS',
 'PAGE_ORDER','CLIPPING_AND_OVERLAP','FEE_AND_WAIVER','FILING_DESTINATION','SERVICE','SELF_HELP_STOP'}
COUNTERS = ['knownRequiredFieldsMissing','requiredFactsNotCollected','unclassifiedBlanks',
 'incompleteRows','requiredOptionsMissing','requiredComponentsMissing','invisibleWrites','protectedWrites','visualDefects']
TERMINAL = {'COMPLETE_PACKET_PROVEN','GUIDANCE_READY','HANDOFF_READY','OUT_OF_SCOPE'}
args = argparse.ArgumentParser()
args.add_argument('--allow-pending', action='store_true')
args.add_argument('--require-terminal', action='store_true')
args = args.parse_args()
read = lambda p: json.loads(pathlib.Path(p).read_text())
sha = lambda b: hashlib.sha256(b).hexdigest()
stats = Counter(); failures = []
def check(ok, why):
    stats['assertions'] += 1
    if not ok: failures.append(why)

def pinned(obj):
    if isinstance(obj, list):
        for x in obj: pinned(x)
    elif isinstance(obj, dict):
        p, h = obj.get('path'), obj.get('sha256')
        if isinstance(p, str) and isinstance(h, str) and re.fullmatch('[a-f0-9]{64}',h) and not p.startswith('http'):
            target = pathlib.Path(p)
            check(target.is_file(), f'missing pinned path {p}')
            if target.is_file():
                b=target.read_bytes(); check(sha(b)==h, f'changed pinned path {p}')
                if 'byteLength' in obj: check(len(b)==obj['byteLength'],f'changed size {p}')
                stats['pinnedReferences'] += 1
        for key,x in obj.items():
            if key=='previousRowPreserved' and 'previousKnownFactFitFailure' in obj:
                # A preserved FAIL describes old bytes, not today's files. Bind
                # the snapshot to its immutable native return, then check its
                # PDFs at the commit that the historical reviewer actually read.
                prior=read(obj['previousKnownFactFitFailure']['path'])
                for token in obj['rowPointer'].strip('/').split('/'):
                    prior=prior[int(token)] if isinstance(prior,list) else prior[token]
                check(x==prior,'historical FAIL snapshot differs from its native return')
                for artifact in x.get('artifactsRead',[]):
                    body=subprocess.check_output(['git','show',x['verifiedAtBase']+':'+artifact['path']])
                    check(sha(body)==artifact['sha256'],'historical PDF differs at review commit')
                    check(len(body)==artifact['byteLength'],'historical PDF size differs at review commit')
                    stats['historicalPdfs']+=1
            else:
                pinned(x)

queue = {r['familyId']:r for r in read(BASE/'MASTER_QUEUE.json')['families']}
raster = {r['familyId']:r for r in read(BASE/'RASTER_QUEUE.json')['rows']}
rows={}
for f in FAMILIES:
    selected=queue[f].get('selectedIndependentVerdict') or {}
    if selected.get('verdict')!='PASS_COMPLETE_INDEPENDENT':
        if not args.allow_pending: check(False,f'{f}: current independent PASS absent')
        continue
    candidates=[r for r in read(selected['evidencePath']).get('rows',[]) if r.get('familyId',r.get('itemId'))==f]
    check(len(candidates)==1,f'{f}: native selected review is ambiguous')
    if len(candidates)==1: rows[f]=candidates[0]
if not args.allow_pending: check(set(rows)==FAMILIES, f'missing independent returns {FAMILIES-set(rows)}')
for f,r in rows.items():
    check(r['verdict']=='PASS_COMPLETE_INDEPENDENT',f'{f}: independent acceptance absent')
    check(r.get('isIndependentVerification') is True,f'{f}: independence undeclared')
    check(set(r['proofObligations'])==OBLIGATIONS,f'{f}: obligation set mismatch')
    for name,o in r['proofObligations'].items():
        check(o.get('result')=='PASS' and o.get('measured') is True,f'{f}: {name} unmeasured/not PASS')
        stats['obligations']+=1
    check(r['failedObligationNames']==[] and r['unmeasuredObligations']==[],f'{f}: residual failure')
    for c in COUNTERS: check(r['nineCounters'].get(c)==0,f'{f}: counter {c}')
    pinned(r)
    for p in r['evidenceRead']:
        check(pathlib.Path(p).is_file(),f'{f}: missing evidence {p}')
        if str(p).endswith('.json'): pinned(read(p))
    run=str(r['rasterWorkflowRunId']); root=BASE/'raster-runs'/run
    check(run!='34659754238',f'{f}: failed CA run used')
    proof=read(root/'ORIGINAL_EVIDENCE_VERIFIED.json')
    jobs=read(root/'jobs.json')['jobs']
    selected=next(j for j in jobs if j['name']==f)
    check(selected['conclusion']=='success',f'{f}: central family job unsuccessful')
    partial_ok=proof.get('partialRunAdmission') is True and proof.get('selectedFamiliesConclusion')=='success' and f in proof.get('selectedFamilies',[])
    check(proof['conclusion']=='success' or partial_ok,f'{f}: central run unsuccessful without scoped successful-job custody')
    if proof['conclusion']!='success':
        for j in jobs:
            if j['conclusion']!='success':
                failed=[s for s in j['steps'] if s['conclusion']=='failure']
                check(j['name']!=f and failed and all('upload-artifact' in s['name'] for s in failed),f'{f}: unsupported partial-run failure')
    custody=next(x for x in proof['families'] if x['familyId']==f)
    archive=pathlib.Path(custody['archivePath']); body=archive.read_bytes()
    check(sha(body)==custody['archiveSha256'],f'{f}: original ZIP changed')
    check(custody['artifact']['digest']=='sha256:'+sha(body),f'{f}: API ZIP digest mismatch')
    v=read(custody['verdictPath']); slug=re.sub(r'[^A-Za-z0-9._-]','_',f)
    log=(root/(slug+'.job.log')).read_bytes()
    check(sha(log)==custody['jobLogSha256'],f'{f}: original job log changed')
    logged=[json.loads(x.split('RCAP_RECEIPT_VERDICT ',1)[1]) for x in log.decode().splitlines() if 'RCAP_RECEIPT_VERDICT {' in x]
    check(logged==[v],f'{f}: original log/verdict disagreement')
    with zipfile.ZipFile(archive) as z:
        check(json.loads(z.read(slug+'.verdict.json'))==v,f'{f}: artifact/verdict disagreement')
        pages=read(root/(slug+'.PAGE_IMAGES_SHA256.json'))
        check(len(pages)==v['pagesMeasured'],f'{f}: PNG coverage count')
        for p in pages:
            b=z.read(p['member']);check(sha(b)==p['sha256'],f'{f}: PNG digest {p["member"]}')
            check(len(b)==p['byteLength'],f'{f}: PNG size')
            check(list(struct.unpack('>II',b[16:24]))==p['dimensions'],f'{f}: PNG geometry')
            stats['originalPngs']+=1
    check(v['verdict']=='RASTER_PASS' and v['problems']==[] and v['environmentProblems']==[],f'{f}: raster not clean')
    receipt=raster[f].get('rasterReceipt',{})
    check(str(receipt.get('workflowRunId'))==run,f'{f}: native receipt run mismatch')
    check(receipt.get('documentsDigest')==v['documentsDigest'],f'{f}: native document set mismatch')
    for d in v['documentsRendered']:
        b=pathlib.Path(d['path']).read_bytes();check(sha(b)==d['pinned'],f'{f}: current PDF changed')
        committed=subprocess.check_output(['git','show',v['packetCommitSha']+':'+d['path']])
        check(sha(committed)==d['pinned'],f'{f}: raster commit PDF mismatch');stats['pdfs']+=1
    if args.require_terminal:
        check(queue[f]['state']=='COMPLETE_PACKET_PROVEN',f'{f}: not terminal')
        check(queue[f]['selectedIndependentVerdict']['verdict']=='PASS_COMPLETE_INDEPENDENT',f'{f}: native independent selection')
        check(queue[f]['allNineCountersZero'] is True,f'{f}: native completeness')
    stats['families']+=1

starting=read(HERE/'starting-state.json')
for old in starting['families']:
    f=old['familyId']
    if f not in FAMILIES|{'az_set_aside-set'}:
        check(queue[f]['state']==old['state'],f'{f}: unrelated state changed')
        check(queue[f]['sourceHashes']==old['sourceHashes'],f'{f}: unrelated source identity changed')
check(len(queue)==346,'denominator drift')
check(not [r for r in queue.values() if r['state']=='SOURCE_BLOCKED'],'remaining source blocker')
az=queue['az_set_aside-set'];check(az['state']=='FAIL_REPAIR_REQUIRED' and az['sourceBound'], 'AZ source/repair distinction')
for x in read('.git/restart-recovery-20260911/untracked-inventory.json'):
    p=pathlib.Path(x['path']);check(p.is_file(),f'preserved file missing {p}')
    if p.is_file():
        b=p.read_bytes();check(len(b)==x['size'] and sha(b)==x['sha256'],f'preserved file changed {p}')
    stats['preservedFiles']+=1
print(json.dumps({'status':'FAIL' if failures else 'PASS','counts':dict(stats),'terminal':sum(r['state'] in TERMINAL for r in queue.values()),'denominator':len(queue),'failures':failures},indent=2))
raise SystemExit(bool(failures))
