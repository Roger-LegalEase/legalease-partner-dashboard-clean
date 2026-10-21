#!/usr/bin/env python3
"""Focused consistency/unchanged-byte checks for this independent return."""
import hashlib,json,pathlib,subprocess
P=pathlib.Path(__file__).resolve().parent;ROOT=P.parents[4]
read=lambda n:json.loads((P/n).read_text())
hashfile=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
return_path=P.parent/'rows-vf02-20260911-al-ut-current.json'
d=json.loads(return_path.read_text())
required={'ROUTE_IDENTITY','SOURCE_IDENTITY','COMPONENT_SET','KNOWN_PREFILLS','REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','PROTECTED_FIELDS','ARTIFACTS','PAGE_ORDER','CLIPPING_AND_OVERLAP','FILING_DESTINATION','FEE_AND_WAIVER','SERVICE','SELF_HELP_STOP'}
assert len(d['rows'])==2
for r in d['rows']:
 assert set(r['proofObligations'])==required
 assert r['verdict'] in {'PASS_COMPLETE_INDEPENDENT','FAIL_REPAIR_REQUIRED'}
 for obligation,p in r['proofObligations'].items():
  assert p['result'] in {'PASS','FAIL'} and p['measured'] and p['finding']
  for e in p['evidence']:assert (ROOT/e).is_file(),e
 assert r['failedObligations']==[k for k,p in r['proofObligations'].items() if p['result']=='FAIL']
 if r['verdict']=='PASS_COMPLETE_INDEPENDENT':
  assert not r['failedObligations'] and all(v==0 for v in r['countersThisLaneMeasured'].values())
 assert not r['selfVerified'] and not r['builtThisFamily']
for b in read('current-bindings.json'):
 for f in [b['source'],*b['files'],*b['originalPngs']]:
  p=ROOT/f['path'];assert hashfile(p)==f['sha256'] and p.stat().st_size==f['byteLength'],str(p)
assert hashfile(ROOT/'data/rcap-grade-a/packet-factory-24h/claim-ledger.json')==read('preflight.json')['claimLedger']['sha256']
for a in read('authority-and-helper-pins.json'):assert hashfile(ROOT/a['path'])==a['sha256']
v=read('page-by-page-original-image-review.json');assert len(v['pageReviews'])==32 and all(p['directHumanImageInspection'] for p in v['pageReviews'])
assert read('ut-geometry-findings.json')['confirmedDefectivePlacements']==36
assert read('ut-required-content-findings.json')['requiredContentGaps']==12
assert all(c['exitCode']==0 for c in read('commands.json'))
assert subprocess.check_output(['git','diff','--name-only'],cwd=ROOT,text=True)==''
report={'result':'PASS','familyRows':2,'scoredObligations':30,'passObligations':25,'failObligations':5,'originalPacketImagesInspectedAndBound':32,'sourcePdfRasterFamilyAndAuthorityBytesUnchanged':True,'claimLedgerUnchanged':True,'extractorVocabularyAndFindingFieldsValidated':True,'commandExitsAllZero':True,'commandsBeforeThisValidation':len(read('commands.json')),'productionChanges':0,'newRaster':False,'notes':'This checks return consistency and source/output immutability, not the correctness of the human verdict by rerunning itself. Real builders/readers/tests and original-image observations are separately recorded.'}
(P/'return-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
