from pathlib import Path
import json,hashlib,subprocess
B=Path(__file__).resolve().parent.relative_to(Path.cwd());P=Path('data/rcap-grade-a/packet-factory-24h/vf67/rows-vf67-kansas-current-three-20260912.json');x=json.loads(P.read_text());passed=0
N=['knownRequiredFieldsMissing','requiredFactsNotCollected','unclassifiedBlanks','incompleteRows','requiredOptionsMissing','requiredComponentsMissing','invisibleWrites','protectedWrites','visualDefects']
O=['ROUTE_IDENTITY','SOURCE_IDENTITY','COMPONENT_SET','KNOWN_PREFILLS','REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','PROTECTED_FIELDS','ARTIFACTS','PAGE_ORDER','CLIPPING_AND_OVERLAP','FILING_DESTINATION','FEE_AND_WAIVER','SERVICE','SELF_HELP_STOP']
def ck(v):
 global passed
 assert v;passed+=1
ck(x['lane']=='VF67' and len(x['rows'])==3)
for r in x['rows']:
 ck(r['verdict']=='FAIL_REPAIR_REQUIRED' and r['isIndependentVerification'])
 ck(list(r['proofObligations'])==O)
 ck(all(o['measured'] and o['result'] in ['PASS','FAIL'] for o in r['proofObligations'].values()))
 ck([k for k,o in r['proofObligations'].items() if o['result']=='FAIL']==['KNOWN_PREFILLS','REQUIRED_BEFORE_FILING'])
 ck(r['obligationCounts']=={'total':15,'pass':13,'fail':2,'notMeasurableHere':0})
 ck(r['unmeasuredObligations']==[] and r['nineCounters']['knownRequiredFieldsMissing']==4)
 ck(all(r['nineCounters'][k]==0 for k in N[1:]))
 ck(r['rasterEvidence']['pagesVerified']==40 and r['rasterEvidence']['rawCoversTheWholeFamily'] is None)
 ck(r['rasterEvidence']['familyJobPassed'] and not r['rasterEvidence']['wholeRunPassed'])
 ck('CLAIM_OK VF67 '+r['familyId'] in Path(r['claimEvidence']).read_text())
 for e in r['evidenceBindings']:
  v=Path(e['path']).read_bytes();ck(hashlib.sha256(v).hexdigest()==e['sha256'] and len(v)==e['byteLength'])
 for a in r['artifactsRead']:
  v=subprocess.check_output(['git','show',x['verifiedAtBase']+':'+a['path']]);ck(hashlib.sha256(v).hexdigest()==a['sha256'] and len(v)==a['byteLength'])
 o=json.loads((B/(r['familyId']+'-original-measurements.json')).read_text())
 ck(o['visualReviewCompleted'] and len(o['pages'])==40)
 for fixture in ['canonical','boundary']:
  ck(sorted(p['page'] for p in o['pages'] if p['kind']==fixture)==list(range(1,21)))
 ck(r['packetPdfsModified']==0 and not r['productionTouched'])
findings=json.loads((B/'all-three-findings.json').read_text());ck(findings['knownBirthYearMissingOccurrences']==12 and findings['originalPagesViewed']==120)
result={'schemaVersion':'rcap-independent-review-validation/v1','nativeReturn':str(P),'nativeReturnSha256':hashlib.sha256(P.read_bytes()).hexdigest(),'pass':passed,'fail':0,'scope':'Three immutable KS family review rows; all45 obligations measured; all evidence binding files verified; six PDF hashes verified from pinned git object, not current worker files; all120 original-page coverage preserved.','noPacketOrBuilderChanges':True}
(B/'native-return-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
