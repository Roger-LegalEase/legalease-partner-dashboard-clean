"""Read exact DE acceptance inputs; persist only bounded VF02 review evidence."""
from pathlib import Path
import json,hashlib,subprocess,re
OUT=Path('data/rcap-grade-a/packet-factory-24h/vf02/de-pardon-final-20260911')
FAM=Path('data/rcap-all50/overlays/census-v1/de/de-pardon-expungement-set--official-pdf-fill')
BASE='a45cb2767f70febb451503d7e4da2bb92676982d'
PRIOR=Path('data/rcap-grade-a/packet-factory-24h/vf20/rows.json')
DECISION=Path('data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json')
load=lambda p:json.loads(Path(p).read_text())
sha=lambda b:hashlib.sha256(b).hexdigest()
canon=lambda obj:json.dumps(obj,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()
def oldbytes(p):return subprocess.check_output(['git','show',BASE+':'+str(p)])
def save(name,obj):(OUT/name).write_text(json.dumps(obj,indent=2)+'\n')
def difference(a,b,p=''):
 if isinstance(a,dict) and isinstance(b,dict):
  return [q for k in a.keys()|b.keys() for q in difference(a.get(k),b.get(k),p+'/'+k)]
 if isinstance(a,list) and isinstance(b,list) and len(a)==len(b):
  return [q for i,(x,y) in enumerate(zip(a,b)) for q in difference(x,y,p+'/'+str(i))]
 return [] if a==b else [p]
prior=next(r for r in load(PRIOR)['rows'] if r.get('itemId')=='de_pardon_expungement-set')
assert len(prior['proofObligations'])==15
assert prior['proofObligations']['ROUTE_IDENTITY']['result']=='BLOCKED_LEGAL_INPUT'
assert sum(v['result']=='PASS' for v in prior['proofObligations'].values())==14
files=[]
tracked=subprocess.check_output(['git','ls-files',str(FAM)],text=True).splitlines()
for name in tracked:
 if name.endswith('.png'):continue
 p=Path(name);b=p.read_bytes();ob=oldbytes(p)
 row={'path':name,'sha256':sha(b),'byteLength':len(b),'priorSha256':sha(ob),'byteIdenticalToVF20':b==ob}
 if p.suffix=='.pdf':
  info=subprocess.check_output(['pdfinfo',str(p)],text=True)
  row['pages']=int(re.search(r'^Pages:\s+(\d+)',info,re.M)[1]);assert row['pages']==3 and b==ob
 if b!=ob:
  row['changedJsonPointers']=difference(json.loads(ob),json.loads(b))
 files.append(row)
assert {r['path'] for r in files if not r['byteIdenticalToVF20']}=={str(FAM/'source-receipt.json'),str(FAM/'product-wiring.json')}
receipt=load(FAM/'source-receipt.json');wiring=load(FAM/'product-wiring.json')
oldreceipt=json.loads(oldbytes(FAM/'source-receipt.json'));oldwiring=json.loads(oldbytes(FAM/'product-wiring.json'))
assert receipt['documents']==oldreceipt['documents'] and receipt['transport']==oldreceipt['transport']
assert wiring['binding']['sourceVersion']==oldwiring['binding']['sourceVersion']
assert wiring['routeKeys']==oldwiring['routeKeys']==receipt['routeKeys']
sources=[]
for d in receipt['documents']:
 p=Path('private/source-imports/Nationwide_Recovery_Pool_2026-09-02')/d['pathInCustody']
 if p.exists():
  b=p.read_bytes();assert sha(b)==d['sha256'] and len(b)==d['byteLength']
  sources.append({'documentId':d['documentId'],'path':str(p),'sha256':sha(b),'byteLength':len(b),'currentBytesAvailable':True,'matchesReceiptAndVF20SourcePin':True})
 else:
  sources.append({'documentId':d['documentId'],'path':str(p),'priorMeasuredSha256':d['sha256'],'priorMeasuredByteLength':d['byteLength'],'currentBytesAvailable':False,'currentHashRemeasured':False,'receiptAndTransportIdenticalToVF20':True,'reuseBasis':'VF20 historical direct original-source measurement is retained on unchanged declared source, transport and delivered PDF identities. Current original source custody is unavailable and cannot be rehashed; SOURCE_IDENTITY is NOT_MEASURABLE_HERE and overall acceptance is BLOCKED_SOURCE.'})
anchors=[]
for p,arr,key,target in [('data/record-clearing/legal-design-packet-set-manifests.json','packetSets','packetSetId','de_pardon_expungement-set'),('data/record-clearing/legal-design-track-registry.json','tracks','trackId','de_pardon_expungement')]:
 b=Path(p).read_bytes();ob=oldbytes(p);cur=json.loads(b);old=json.loads(ob)
 current=next(x for x in cur[arr] if x[key]==target);previous=next(x for x in old[arr] if x[key]==target)
 assert current==previous
 rec=next(x for x in receipt['committedRecords'] if x['pathInRepository']==p)
 anchors.append({'path':p,'exactEntryId':target,'exactEntrySha256':sha(canon(current)),'priorEntrySha256':sha(canon(previous)),'entryIdenticalToVF20':True,'currentWholeFileSha256':sha(b),'priorWholeFileSha256':sha(ob),'receiptWholeFilePin':rec['sha256'],'receiptPinMatchesCurrentWholeFile':sha(b)==rec['sha256'],'globalMetadataChangedKeys':[k for k in old.keys()|cur.keys() if k!=arr and old.get(k)!=cur.get(k)],'scope':'Only this exact DE entry is reused as authority for the fourteen prior approvals; differing unrelated entries are not reviewed or repinned.'})
assert not any(r['globalMetadataChangedKeys'] for r in anchors)
queue=next(r for r in load('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')['rows'] if r['familyId']=='de_pardon_expungement-set')
adir=Path('data/rcap-grade-a/packet-factory-24h/raster-runs/admitted/de_pardon_expungement-set')
verdict=load(adir/'de_pardon_expungement-set.verdict.json');admission=load(adir/'admission-proof.json')
assert queue['currentRasterState']==verdict['verdict']=='RASTER_PASS'
assert str(verdict['workflowRunId'])==str(admission['runId'])=='34413372916'
assert queue['rasterReceipt']['pagesMeasured']==verdict['pagesMeasured']==admission['pagesMeasured']==6
for kind in ['canonical','boundary']:
 actual=sha((FAM/'fixtures'/f'{kind}.pdf').read_bytes())
 assert actual==queue[kind+'PdfSha256']==verdict['hashesBound'][kind]['pinned']
assert len(admission['measuredPageImages'])==len(verdict['measurements'])==6
for a,v in zip(admission['measuredPageImages'],verdict['measurements']):
 assert a['sha256']==v['pngSha256'] and a['byteLength']==v['bytes']
raster={'workflowRunId':'34413372916','currentState':'RASTER_PASS','pagesCovered':6,'pdfsCovered':2,'bindingMatchesCurrentBytes':True,'queueEntrySha256':sha(canon(queue)),'evidence':[{'path':str(adir/n),'sha256':sha((adir/n).read_bytes())} for n in ['admission-proof.json','de_pardon_expungement-set.verdict.json']],'priorReceiptLimit':admission['imageBytesReadBy'],'scope':'Reuse committed admitted raster and VF20 own independent technical pixel observations. This lane did not read original PNG bodies, re-render, repeat visual measurements or grant admission.'}
save('current-byte-and-anchor-bindings.json',{'familyId':'de_pardon_expungement-set','priorReviewBase':BASE,'priorReturn':str(PRIOR),'priorReturnSha256':sha(PRIOR.read_bytes()),'priorExactRowSha256':sha(canon(prior)),'familyFiles':files,'officialSources':sources,'recordAnchors':anchors,'raster':raster,'currentCustodyAcceptance':'BLOCKED_SOURCE. The absence of original CIV_EXP_08_A in the current mount is a current availability blocker, not a conflicting-byte/source-identity determination. Retain VF20 historical measurement; no unconditional acceptance or new admission.','changedMetadataAssessment':'Only product-wiring lastIndependentVerification and manifest receipt identity refresh differ inside the family. Both exact DE authority entries and their global metadata are identical to VF20. The registry whole-file receipt pin is historical after unrelated entry changes; the unchanged exact DE entry is separately hashed here. No meaningful record/packet change invalidates the fourteen historical approvals; unavailable current source custody is separately blocked.'})

j=load(DECISION);decision=next(x for x in j['decisions'] if x['decisionId']=='DE-PARDON-EXPUNGEMENT-OFFICIAL-PETITION-WORKFLOW')
assert decision['disposition']=='LEGAL_CLEAR' and decision['familyIds']==['de_pardon_expungement-set']
text=subprocess.check_output(['pdftotext','-layout',str(FAM/'fixtures/canonical.pdf'),'-'],text=True)
selected=[line.strip() for line in text.splitlines() if any(word in line for word in ['Pursuant','CIV_EXP_02_A','CIV_EXP_08_A','4375','Procedure under'])]
assert 'CIV_EXP_02_A' in text and 'CIV_EXP_08_A' in text and '4375' in text and '4374' in text
save('decision-proof.json',{'familyId':'de_pardon_expungement-set','decisionDocument':str(DECISION),'decisionDocumentSha256':sha(DECISION.read_bytes()),'decision':decision,'priorBlockedObligation':'ROUTE_IDENTITY','priorBlockedFinding':prior['proofObligations']['ROUTE_IDENTITY']['detail'],'routeKeys':receipt['routeKeys'],'currentOfficialWorkflowDocuments':[d['documentId'] for d in receipt['documents']],'currentDeliveredCaptionLines':selected,'finding':'RESOLVED. The binding decision expressly authorizes the same official Superior Court petition workflow after an unconditional pardon with the same pardon-specific CIV_EXP_08_A order. This answers VF20 DE-5: the CIV_EXP_02_A printed section4374 caption does not require inventing a custom pleading or preserving the old legal hold on this exact section4375 route. The packet uses those exact sources; the section4375 basis remains named on the order/cover sheet and in the already-approved participant instructions. No factual attestation, county, charge, signature or judicial act is inferred from the decision.','staleHoldTreatment':'Unchanged builder comments, guide counsel-question text and registry DE-5 markers are historical status statements superseded for this route-identity question by the later binding decision. They do not change the delivered instrument. This lane does not edit them, decide eligibility or reopen the fourteen prior approvals.','authorityLimit':j['stateSemantics']['LEGAL_CLEAR'],'newLegalResearch':False,'newLegalOpinion':False,'remainingRouteIdentityDefects':[],'overallAcceptance':'BLOCKED_SOURCE: the route/instrument legal block is resolved, but current CIV_EXP_08_A original source custody is unavailable.'})
print('BINDING CHECKS PASS:2 current PDFs;2 unchanged declared source pins;1 source rehashed/1 unavailable;exact DE anchors unchanged;6-page raster binding;route block resolved. OVERALL BLOCKED_SOURCE on current CIV_EXP_08_A custody.')
