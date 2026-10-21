#!/usr/bin/env python3
"""Bounded integration validation. Never deploys, renders, or pushes anything."""
from __future__ import annotations
import argparse, collections, copy, hashlib, json, os, pathlib, subprocess, sys
ROOT = pathlib.Path(__file__).resolve().parents[2]
PREFIX = 'scripts/grade-a-packet-factory-24h/'
MASTER = 'data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json'
FAMILIES = ['de_mandatory_expungement-set','nc_146_dismissal_petition-set','fl-early-juvenile-set']
TERMINAL = {'COMPLETE_PACKET_PROVEN','GUIDANCE_READY','HANDOFF_READY','OUT_OF_SCOPE'}
EXPECTED_STATE_CHANGES = {
 'de_mandatory_expungement-set': 'GUIDANCE_READY',
 'nc_146_dismissal_petition-set': 'FAIL_REPAIR_REQUIRED',
 'fl-early-juvenile-set': 'FAIL_REPAIR_REQUIRED',
 'ri_first_offender_felony-set': 'FAIL_REPAIR_REQUIRED',
 'ri_first_offender_misdemeanor-set': 'FAIL_REPAIR_REQUIRED',
 'ri_deferred_sentence-set': 'FAIL_REPAIR_REQUIRED',
 'ri_multiple_misdemeanors-set': 'FAIL_REPAIR_REQUIRED',
}
SCRIPT_FILES = {
 'chat-review-inputs.mjs','de-reviewed-guidance.mjs','nc-declared-delivery.mjs',
 'test-chat-review-inputs.mjs','test-de-reviewed-guidance.mjs','test-nc-declared-delivery.mjs',
 'extract-verifier-returns.mjs','generate.mjs','generate-product-wiring.mjs',
 'validate-chat1-integration.py','generate-raster-queue.mjs',
}
WIRES={
 'data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill/product-wiring.json',
 'data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill/product-wiring.json',
 'data/rcap-all50/overlays/census-v1/fl/fl-early-juvenile-set--official-pdf-fill/product-wiring.json',
}
WORKFLOW='.github/workflows/rcap-chat1-integration-current.yml'
EVIDENCE='data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/'
DOCS='docs/rcap/grade-a/chat-parallel-2026-09-07/chat1-integration/'

def git(*args: str)->bytes:
 return subprocess.check_output(['git',*args],cwd=ROOT,stderr=subprocess.PIPE)

def allowed(p: str)->bool:
 return (p in WIRES or p==WORKFLOW or p in {PREFIX+s for s in SCRIPT_FILES}
  or p.startswith(('data/rcap-grade-a/packet-factory-24h/','docs/rcap/grade-a/packet-factory-24h/',
   'data/rcap-grade-a/chat-parallel-2026-09-07/review/',
   'docs/rcap/grade-a/chat-parallel-2026-09-07/review/',EVIDENCE,DOCS)))

def changed_paths(base: str)->list[str]:
 tracked=git('diff','--name-only','-z',base).decode().split('\0')
 untracked=git('ls-files','--others','--exclude-standard','-z').decode().split('\0')
 return sorted(set(filter(None,tracked+untracked)))

def scope(base: str)->list[str]:
 paths=changed_paths(base)
 bad=[p for p in paths if not allowed(p)]
 assert not bad, f'Changes outside exact integration scope: {bad}'
 assert not [p for p in paths if p.endswith(('.pdf','.docx','.woff','.ttf'))], 'Packet or source binary changed'
 return paths

def fingerprint()->str:
 # Covers staged and unstaged differences, plus untracked file content.
 parts=[git('diff','--binary','HEAD'),git('status','--porcelain','-z')]
 for p in git('ls-files','--others','--exclude-standard','-z').decode().split('\0'):
  if p:parts.extend([p.encode(),(ROOT/p).read_bytes()])
 return hashlib.sha256(b'\0'.join(parts)).hexdigest()

def census(base: str)->dict:
 old=json.loads(git('show',f'{base}:{MASTER}'))
 now=json.loads((ROOT/MASTER).read_text())
 a={f['familyId']:f for f in old['families']};b={f['familyId']:f for f in now['families']}
 assert a.keys()==b.keys(), 'Family denominator or identities changed'
 old_proven=sorted(k for k,v in a.items() if v['state']=='COMPLETE_PACKET_PROVEN')
 new_proven=sorted(k for k,v in b.items() if v['state']=='COMPLETE_PACKET_PROVEN')
 assert old_proven==new_proven, 'Existing complete-packet set changed'
 changes={k:{'before':a[k]['state'],'after':v['state']} for k,v in b.items() if a[k]['state']!=v['state']}
 assert all(EXPECTED_STATE_CHANGES.get(k)==v['after'] for k,v in changes.items()), f'Unrelated state changes: {changes}'
 assert b['de_mandatory_expungement-set']['state']=='GUIDANCE_READY'
 assert b['de_mandatory_expungement-set']['reviewedGuidanceAdmission']['eligible'] is True
 for k in EXPECTED_STATE_CHANGES:assert b[k]['state']==EXPECTED_STATE_CHANGES[k], f'Unconsumed reviewed disposition: {k}'
 returns=json.loads((ROOT/'data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json').read_text())
 current={r['familyId']:r for r in returns['rows'] if r['isIndependentVerification'] and r['verdict'] and not r['superseded']}
 for k in ['al-felony-dwop-set','al-felony-nonconviction-90-set']:
  assert current[k]['evidencePath'].endswith('/al-two-candidate-final-disposition.json'), 'Alabama withdrawal not preserved'
  assert current[k]['failedObligationNames']==['CLIPPING_AND_OVERLAP','KNOWN_PREFILLS']
 assert len(current['il-seal-edu-set'].get('supplementalEvidence',[]))==1
 def count(d):return sum(f['state'] in TERMINAL for f in d.values())
 assert count(b)-count(a)==1, 'Unexpected terminal delta'
 return {'baselineCommit':base,'denominator':len(b),'terminalBefore':count(a),'terminalAfter':count(b),
  'terminalDelta':1,'completePacketFamiliesBefore':len(old_proven),'completePacketFamiliesAfter':len(new_proven),
  'exactCompletePacketSetPreserved':True,'stateChanges':changes,
  'states':dict(sorted(collections.Counter(f['state'] for f in b.values()).items()))}

# A consumes these exact reviews; a released stale verifier grant is not a pass.
REVIEW_ROOT='data/rcap-grade-a/chat-parallel-2026-09-07/review/'
RELEASE_REVIEWS={
 'de_mandatory_expungement-set':('GUIDANCE_READY','de-current-review-reconciliation.json'),
 'nc_146_dismissal_petition-set':('FAIL_REPAIR_REQUIRED','nc-complete-branch-independent-review.json'),
 **{f:('FAIL_REPAIR_REQUIRED','ri-independent-findings.json') for f in [
  'ri_first_offender_felony-set','ri_first_offender_misdemeanor-set',
  'ri_deferred_sentence-set','ri_multiple_misdemeanors-set']},
}

def release_plan(master:dict, returns:dict, ledger:dict, read_bytes)->list[dict]:
 families={f['familyId']:f for f in master['families']}; planned=[]
 for family,(state,filename) in RELEASE_REVIEWS.items():
  f=families[family]
  assert f['state']==state, f'{family}: no consumed expected disposition'
  rows=[r for r in returns['rows'] if r.get('familyId')==family
    and r.get('isIndependentVerification') is True and r.get('superseded') is False and r.get('verdict')]
  assert len(rows)==1, f'{family}: ambiguous or missing current review'
  r=rows[0]; expected='PASS_COMPLETE_INDEPENDENT' if state=='GUIDANCE_READY' else 'FAIL_REPAIR_REQUIRED'
  assert r['verdict']==expected and r['evidencePath']==REVIEW_ROOT+filename
  assert r.get('reviewer') and r.get('sessionIdentity') and len(r.get('verifiedAtBase',''))==40
  assert hashlib.sha256(read_bytes(r['evidencePath'])).hexdigest()==r['evidenceSha256'], 'review bytes changed'
  if state=='GUIDANCE_READY':assert f.get('reviewedGuidanceAdmission',{}).get('eligible') is True
  else:assert r.get('failedObligationNames'), 'failure lacks exact obligations'
  claims=[c for c in ledger['claims'] if c.get('subjectType')=='packet-family'
    and c.get('subjectId')==family and c.get('operation')=='independent-verification']
  assert len(claims)==1, f'{family}: ambiguous or missing claim'
  c=claims[0]
  assert c.get('laneKind')=='independent-verification' and c.get('familyIds')==[family]
  assert c.get('released') in [False,True] and type(c.get('released')) is bool
  if c['released'] is True:continue
  planned.append({'familyId':family,'lane':c['lane'],'reviewPath':r['evidencePath'],
   'reviewSha256':r['evidenceSha256'],'state':state,
   'reason':f"Chat 1 integration consumes {r['evidencePath']} at SHA-256 {r['evidenceSha256']}; "
     f"current disposition {state}. Retire the spent verifier assignment, not its evidence. "
     "The original reviewer and failure findings are preserved; no new packet, counsel or commercial approval."})
 return planned

def reconciliation_self_test()->dict:
 master={'families':[]};returns={'rows':[]};ledger={'claims':[]};data={}
 for family,(state,filename) in RELEASE_REVIEWS.items():
  p=REVIEW_ROOT+filename;data[p]=b'synthetic review binding, no release authorization'
  master['families'].append({'familyId':family,'state':state,'reviewedGuidanceAdmission':{'eligible':True}})
  returns['rows'].append({'familyId':family,'isIndependentVerification':True,'superseded':False,
   'verdict':'PASS_COMPLETE_INDEPENDENT' if state=='GUIDANCE_READY' else 'FAIL_REPAIR_REQUIRED',
   'evidencePath':p,'evidenceSha256':hashlib.sha256(data[p]).hexdigest(),'reviewer':'test reviewer',
   'sessionIdentity':'test independent session','verifiedAtBase':'a'*40,'failedObligationNames':['SERVICE']})
  ledger['claims'].append({'subjectType':'packet-family','subjectId':family,'operation':'independent-verification',
   'laneKind':'independent-verification','familyIds':[family],'lane':'VF01','released':False})
 other={'subjectType':'packet-family','subjectId':'unrelated','operation':'independent-verification',
   'laneKind':'independent-verification','familyIds':['unrelated'],'lane':'VF02','released':False}
 ledger['claims'].append(other); original=copy.deepcopy((master,returns,ledger,data))
 assert len(release_plan(master,returns,ledger,data.__getitem__))==6
 finished=copy.deepcopy(ledger)
 for c in finished['claims'][:-1]:c['released']=True
 assert release_plan(master,returns,finished,data.__getitem__)==[]
 tests=[
  ('state reverted',lambda m,r,l,d:m['families'][0].update(state='VERIFY_PENDING')),
  ('admission absent',lambda m,r,l,d:m['families'][0].update(reviewedGuidanceAdmission={'eligible':False})),
  ('duplicate review',lambda m,r,l,d:r['rows'].append(copy.deepcopy(r['rows'][0]))),
  ('superseded review',lambda m,r,l,d:r['rows'][0].update(superseded=True)),
  ('author not independent',lambda m,r,l,d:r['rows'][0].update(isIndependentVerification=False)),
  ('review hash mismatch',lambda m,r,l,d:r['rows'][0].update(evidenceSha256='0'*64)),
  ('wrong evidence path',lambda m,r,l,d:r['rows'][0].update(evidencePath='elsewhere.json')),
  ('failure without finding',lambda m,r,l,d:r['rows'][1].update(failedObligationNames=[])),
  ('duplicate claim',lambda m,r,l,d:l['claims'].append(copy.deepcopy(l['claims'][0]))),
  ('wrong operation',lambda m,r,l,d:l['claims'][0].update(operation='packet-build')),
  ('wrong lane kind',lambda m,r,l,d:l['claims'][0].update(laneKind='packet-build')),
  ('multiple family claim',lambda m,r,l,d:l['claims'][0].update(familyIds=['wrong'])),
  ('truthy released flag',lambda m,r,l,d:l['claims'][0].update(released='false')),
 ]
 caught=[]
 for name,mutate in tests:
  m,r,l,d=copy.deepcopy(original);mutate(m,r,l,d)
  try:release_plan(m,r,l,d.__getitem__)
  except (AssertionError,KeyError):caught.append(name)
  else:raise AssertionError(f'failed to refuse {name}')
 assert (master,returns,ledger,data)==original and ledger['claims'][-1]==other
 return {'positiveCases':2,'rejectionControls':len(caught),'controls':caught,
  'inputsUnchanged':True,'actualLedgerWrites':0,'status':'PASS'}

def main()->None:
 ap=argparse.ArgumentParser();ap.add_argument('--base',required=True);ap.add_argument('--out',required=True)
 ap.add_argument('--prepare',action='store_true');args=ap.parse_args()
 os.chdir(ROOT);out=pathlib.Path(args.out).resolve();out.mkdir(parents=True,exist_ok=True)
 results=[]
 def run(name:str,cmd:list[str],restore:bool=False)->None:
  before=fingerprint() if restore else None
  with (out/(name+'.log')).open('w') as stream:
   try:code=subprocess.run(cmd,cwd=ROOT,stdout=stream,stderr=subprocess.STDOUT,timeout=540).returncode
   except subprocess.TimeoutExpired:code=124
  same=fingerprint()==before if restore else None
  results.append({'name':name,'command':cmd,'exitCode':code,'worktreeRestored':same})
  print(name,code,same,flush=True)
  if code!=0 or (restore and not same):
   print((out/(name+'.log')).read_text()[-10000:],flush=True)
   raise AssertionError(f'{name} failed or modified its inputs')
 def node(script:str,*extra:str,restore:bool=False)->None:
  run(script+('-'+str(len(results))),['node',PREFIX+script+'.mjs',*extra],restore)
 summary={}
 try:
  scope(args.base)
  summary['reconciliationControls']=reconciliation_self_test()
  if args.prepare:
   node('extract-verifier-returns')
   node('generate')
   master=json.loads((ROOT/MASTER).read_text())
   returns=json.loads((ROOT/'data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json').read_text())
   ledger_path=ROOT/'data/rcap-grade-a/packet-factory-24h/claim-ledger.json'
   ledger=json.loads(ledger_path.read_text()); before=copy.deepcopy(ledger)
   releases=release_plan(master,returns,ledger,lambda p:(ROOT/p).read_bytes())
   for release in releases:
    node('claim','--release',release['lane'],release['familyId'],'--reason',release['reason'])
   after=json.loads(ledger_path.read_text()); ids={r['familyId'] for r in releases}
   assert len(after['claims'])==len(before['claims'])
   for a,b in zip(before['claims'],after['claims']):
    if a['subjectId'] in ids and a['operation']=='independent-verification':
     assert b['released'] is True and b.get('releasedAt') and b.get('releaseReason')
     assert {k:v for k,v in a.items() if k not in ['released','releasedAt','releaseReason']}=={k:v for k,v in b.items() if k not in ['released','releasedAt','releaseReason']}
    else:assert a==b, 'unrelated claim changed'
   assert after['releases'][:len(before.get('releases',[]))]==before.get('releases',[])
   assert len(after['releases'])-len(before.get('releases',[]))==len(releases)
   (out/'consumed-review-claim-releases.json').write_text(json.dumps(releases,indent=2)+'\n')
   node('generate')
   node('generate-raster-queue')
   node('generate')
   for f in FAMILIES:node('generate-product-wiring','--family',f)
   node('generate')
   for script in ['generate-source-conveyor','generate-washington-repair','generate-source-relationship-registry']:node(script)
   summary=census(args.base)
   summary['changedPaths']=scope(args.base)
  else:
   for script in ['extract-verifier-returns','generate','generate-raster-queue','generate-source-conveyor','generate-washington-repair','generate-source-relationship-registry']:node(script,'--check',restore=True)
   for f in FAMILIES:node('generate-product-wiring','--family',f,'--check',restore=True)
   for script in ['test-chat-review-inputs','test-de-reviewed-guidance','test-nc-declared-delivery','test-de-guidance-binding','test-bounded-repair-authorization','test-post-repair-reread']:node(script,restore=True)
   node('test-source-readiness-constraints','--generated',restore=True)
   node('test-conditional-raster-documents','--generated',restore=True)
   # Every actual normal/mutation suite is executed. No failed controls are ignored.
   for script in ['verify','verify-source-conveyor','verify-acq-promo-handoff','verify-lane-contracts','verify-source-relationship-model']:
    node(script,restore=True);node(script,'--mutations',restore=True)
   summary=census(args.base);summary['changedPaths']=scope(args.base)
   assert git('status','--porcelain')==b'', 'Validation did not leave a clean candidate checkout'
  summary['reconciliationControls']=reconciliation_self_test()
  summary.update({'status':'PASS','phase':'prepare' if args.prepare else 'validate'})
 except Exception as exc:
  summary.update({'status':'FAIL','error':str(exc),'phase':'prepare' if args.prepare else 'validate'})
 finally:
  summary.update({'checkedCommit':git('rev-parse','HEAD').decode().strip(),'runId':os.environ.get('GITHUB_RUN_ID'),
   'results':results,'packetRebuilds':0,'newIndependentReviewsAuthored':0,'runtimeInstalled':False,
   'productionTouched':False,'commercialRoutesOpened':0})
  (out/'results.json').write_text(json.dumps(summary,indent=2)+'\n')
  print(json.dumps(summary,indent=2),flush=True)
 if summary['status']!='PASS':raise SystemExit(1)
if __name__=='__main__':main()
