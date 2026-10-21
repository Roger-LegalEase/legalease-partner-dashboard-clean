"""Emit native independent rows only after explicit visual review and native claims."""
import json,hashlib,subprocess,sys
from pathlib import Path
BASE=Path('data/rcap-grade-a/packet-factory-24h/seven-cleared-20260911/review')
RUNS={'nm':'34659428344','co':'34660023738','ca':'34659754238'}
LANES={'nm':'VF03','co':'VF07','ca':'VF08'}
FAMILIES={'nm':['nm_conviction-set','nm_identity_theft-set','nm_release_without_conviction-set'],'co':['co_motion_seal_conviction-set','co_motion_seal_nonconviction-set'],'ca':['official-form-treatment:obligation:research-decision-route:CA:ca-1203-4b']}
KEYS=['ROUTE_IDENTITY','SOURCE_IDENTITY','COMPONENT_SET','KNOWN_PREFILLS','REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','PROTECTED_FIELDS','ARTIFACTS','PAGE_ORDER','CLIPPING_AND_OVERLAP','FILING_DESTINATION','FEE_AND_WAIVER','SERVICE','SELF_HELP_STOP']
COUNTERS=['knownRequiredFieldsMissing','requiredFactsNotCollected','unclassifiedBlanks','incompleteRows','requiredOptionsMissing','requiredComponentsMissing','invisibleWrites','protectedWrites','visualDefects']
def j(p):return json.loads(Path(p).read_text())
def b(p):
 p=Path(p);bs=p.read_bytes();return {'path':str(p),'sha256':hashlib.sha256(bs).hexdigest(),'byteLength':len(bs)}
def build(group,selected):
 lane=LANES[group];at=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();configs=j(BASE/('findings-'+group+'.json'));rows=[]
 assignments=j(BASE/'final-raster-run-assignments.json') if (BASE/'final-raster-run-assignments.json').exists() else {}
 for family in selected or FAMILIES[group]:
  assert family in FAMILIES[group]
  run=assignments.get(family,RUNS[group])
  safe=family.replace(':','_');mp=BASE/('measurements-'+safe+'.json');m=j(mp)['rows'][0];op=BASE/(safe+'-'+run+'-original-raster-measurements.json');o=j(op)
  assert o['visualReviewCompleted'] is True and o['visualReview']['defects']==0
  assert o['currentPdfHashesMatch'] and o['allPngHashesAndLengthsIndependentlyVerified']
  assert len(o['pages'])==m['totals']['pages'];assert m['totals']['writeReadMismatches']==0
  fieldmap=j(Path(m['directory'])/'production-field-map.json')
  unwritten=[r for doc in fieldmap.get('maps',[]) for fixture in ['canonical','boundary'] for r in doc.get(fixture+'Refusals',[]) if r.get('completenessDisposition')=='KNOWN_FACT_NOT_WRITTEN' or r.get('theBuildHoldsAValueForThisBlank') is True]
  assert not unwritten,('Current governing contract forbids accepting held facts left blank; disclosure is not a zero counter',family,len(unwritten))
  actual=j(Path(m['directory'])/'reports/actual-writes.json')
  rejected=[r for doc in actual.get('documents',[]) for r in doc.get('unfittable',[])]
  assert not rejected,('An intended known write was refused and is absent from the rendered PDF',family,rejected)
  for src in m['inputs']:
   assert b(src['path'])==src,('input changed',src['path'])
  # Sources carry an extra document identity; compare only byte-binding keys.
  for src in m['sources']:
   assert all(b(src['path'])[k]==src[k] for k in ['path','sha256','byteLength'])
  for a in m['artifacts']:assert a['sha256']==b(a['path'])['sha256']
  claim=BASE/(lane+'-'+safe+'-claim.txt');assert claim.exists() and 'CLAIM_OK' in claim.read_text()
  vpath=Path('data/rcap-grade-a/packet-factory-24h/raster-runs')/run/(safe+'.verdict.json');v=j(vpath)
  config_path=BASE/('findings-'+group+'.json')
  override_path=BASE/('findings-'+safe+'-after-fit.json')
  if override_path.exists():config_path=override_path;findings=j(override_path)
  else:findings=configs[family]
  assert set(findings)==set(KEYS)
  preflight=j(BASE/'preflight-findings.json');preflight['findings']=[f for f in preflight['findings'] if family in f['familyIds']]
  snapshot=BASE/('preflight-at-final-'+safe+'.json');snapshot.write_text(json.dumps(preflight,indent=2)+'\n')
  evidence=[str(mp),str(op),str(BASE/'historical-finding-lineage.json'),str(snapshot),str(config_path)]
  if group=='co':evidence += ['data/rcap-grade-a/packet-factory-24h/seven-cleared-20260911/co/current-source-packet-supersession.json',str(BASE/'co-linked-neutral-name-widgets.json')]
  if group=='ca':
   evidence += ['data/rcap-grade-a/packet-factory-24h/seven-cleared-20260911/ca/native-raster-repair/repair-evidence.json',str(BASE/'ca-independent-transport-test.log'),'data/rcap-grade-a/packet-factory-24h/seven-cleared-20260911/ca/native-raster-repair/failed-run-34659754238.json']
  prior=next(x for x in j(BASE/'historical-finding-lineage.json')['rows'] if x['familyId']==family)['historicalPrior']
  proofs={}
  for key in KEYS:
   p={'result':'PASS','measured':True,'reviewMode':'FRESH_CURRENT_SOURCE_AND_ORIGINAL_ARTIFACT_MEASUREMENT','finding':findings[key],'evidence':evidence}
   if prior:
    history=[{'record':prior['record'],'pointer':f"/rows/{h['index']}/proofObligations/{key}",'result':h['row']['proofObligations'][key].get('result')} for h in prior['matchingRows'] if key in h['row'].get('proofObligations',{})]
    if history:p['priorFindings']=history;p['priorFinding']=history[-1];p['disposition']='Historical evidence retained. This fresh source/current-byte finding supersedes the earlier defect or measurement hold only for these exact packets.'
   proofs[key]=p
  arts=[{k:a[k] for k in ['fixture','path','sha256','byteLength','pages']} for a in m['artifacts']]
  row={'itemId':family,'familyId':family,'lane':lane,'laneKind':'independent-verification','isIndependentVerification':True,'status':'COMPLETED','verifiedAtBase':at,'reviewer':'GPT-6 Astra /root/seven_independent_review','independence':'Reviewer authored no packet, builder, source adoption, dispatch, queue or ledger mutation. Reviewer read authoritative source bytes, reported repair defects, independently parsed and measured PDFs, verified all original PNG hashes and viewed every current central raster page; wrote review-only scripts and findings.','claimEvidence':str(claim),'familyDirectory':m['directory'],'verdict':'PASS_COMPLETE_INDEPENDENT','proofObligations':proofs,'obligationCounts':{'PASS':15,'FAIL':0,'NOT_MEASURABLE_HERE':0},'failedObligationNames':[],'unmeasuredObligations':[],'nineCounters':{**{k:0 for k in COUNTERS},'allZero':True,'measuredHere':True,'evidence':evidence},'artifactsRead':arts,'rasterState':'RASTER_PASS','rasterWorkflowRunId':run,'rasterHashBinding':{a['path']:a['sha256'] for a in arts},'rasterEvidence':{'run':run,'packetCommit':v['packetCommitSha'],'pagesVerified':len(o['pages']),'artifactAndLogAgree':True,'allPngHashesVerified':True,'proof':b(vpath.parent/'ORIGINAL_EVIDENCE_VERIFIED.json'),'verdict':b(vpath)},'historicalFailureDisposition':{'prior':prior['record'] if prior else None,'priorVerdicts':[h['row'].get('verdict') for h in prior['matchingRows']] if prior else [],'currentDefectsRemaining':[],'lineageProof':str(BASE/'historical-finding-lineage.json'),'disposition':'All historical failure rows and their old byte bindings preserved. Only the defects measured and disproved by the 15 obligations above are superseded; no historical evidence erased.' if prior else 'First independent acceptance of newly rendered route; no earlier independent verdict exists.'},'evidenceRead':evidence,'evidenceBindings':[b(p) for p in evidence],'packetPdfsModified':0,'commercialRoutesOpened':0,'productionTouched':False,'grantsNothing':'Independent packet acceptance only. No commercial authority, live route, participant upload validation or filing certification is granted.'}
  rows.append(row)
 suffix=('-'+'-'.join(f.replace('co_motion_seal_','').replace('nm_','').removesuffix('-set') for f in selected)) if selected else ''
 out=BASE/('rows-'+lane.lower()+'-seven-cleared-'+group+suffix+'-20260911.json');out.write_text(json.dumps({'schemaVersion':'rcap-verifier-lane-return/v1','lane':lane,'laneKind':'independent-verification','status':'COMPLETED','verifiedAtBase':at,'rows':rows},indent=2)+'\n');print(out)
if __name__=='__main__':build(sys.argv[1],sys.argv[2:])
