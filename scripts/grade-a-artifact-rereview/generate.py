#!/usr/bin/env python3
"""Package exact existing artifacts for review. Never render or grant approval."""
import argparse, difflib, hashlib, json, pathlib, subprocess, tempfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'data/rcap-grade-a/artifact-rereview-20260914'
OWNER='data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json'
REGISTRY='data/rcap-grade-a/fulfillment-authority-registry.json'
SOURCE='ff9705a240c004ed7b9d2f022113abe865442d3f'
PAIRS={
 'il-prostitution-j-vacate-set':('il',['d4cb765983ed2ed180a74feb1a70b7b5cc43134419b2c497746d8fd188bd2657','ea728bba06d2112537e99846f12d78a1c3d7f49eb8ae0f101a94291920bbf25e']),
 'ms-misd-addl-set':('ms',['3c7588be6f1734cab76c30035cb9eb404dc6e0d78eeb9e3971415ed2cedf1399','e2b8cebcb089a20777cfb31bcd5b70340729690bf5232894e7e8adf81fcada36'])}
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return (ROOT/p).read_bytes()
def js(b):return json.loads(b)
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
def link(p,label):return f'[{label}](../../../../{p})'
def metadata(file):
 text=subprocess.check_output(['pdfinfo',str(file)],text=True)
 return int(next(l.split(':',1)[1].strip() for l in text.splitlines() if l.startswith('Pages:')))
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
 source=git('rev-parse','HEAD').decode().strip()
 if args.check:
  source=js((OUT/'manifest.json').read_bytes())['sourceSha']
  subprocess.run(['git','merge-base','--is-ancestor',source,'HEAD'],cwd=ROOT,check=True)
 registry=js(read(REGISTRY));verifiers=js(read('data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json'))
 raster=js(read('data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json'))
 products={};packages=[]
 with tempfile.TemporaryDirectory(prefix='grade-a-rereview-',dir='/tmp') as tmp:
  for family,(state,pins) in PAIRS.items():
   rows=[r for r in registry['records'] if r['packetFamilyId']==family]
   assert rows and all(r['revocation']['revoked'] for r in rows),'revocation must remain intact'
   artifacts=[]
   for index,variant in enumerate(['canonical','boundary']):
    old=rows[0]['evidenceBindings']['approvedArtifacts'][variant]
    rel=f'data/rcap-all50/overlays/census-v1/{state}/{family}--custom-pleading/fixtures/{variant}.pdf'
    current=read(rel);assert sha(current)==pins[index],f'{rel}: exact owner-requested digest moved'
    original=git('show',f'{SOURCE}:{rel}');assert sha(original)==old['sha256'],'historical bytes do not match approval'
    before=pathlib.Path(tmp)/'approved.pdf';after=pathlib.Path(tmp)/'current.pdf'
    before.write_bytes(original);after.write_bytes(current)
    texts=[subprocess.check_output(['pdftotext','-layout',str(f),'-']).decode() for f in [before,after]]
    delta=''.join(difflib.unified_diff(texts[0].splitlines(True),texts[1].splitlines(True),fromfile=f'approved/{variant}.txt',tofile=f'current/{variant}.txt'))
    diffpath=f'{family}/{variant}.text.diff';products[diffpath]=delta.encode()
    artifacts.append({'fixture':variant,'path':rel,'sha256':sha(current),'byteLength':len(current),'pageCount':metadata(after),
      'historicalApproved':{'sourceSha':SOURCE,'path':rel,'sha256':sha(original),'byteLength':len(original),'pageCount':metadata(before)},
      'textDiff':{'path':f'data/rcap-grade-a/artifact-rereview-20260914/{diffpath}','sha256':sha(delta.encode())},
      'textDiffLimit':'Extracted text comparison is an aid, not visual or legal approval. Review every page of the exact current PDF.'})
   selected=[r for r in verifiers['rows'] if r['familyId']==family and r.get('superseded') is False]
   rasters=[r for r in raster['rows'] if r.get('familyId')==family]
   package={'schemaVersion':'rcap-exact-artifact-rereview/v1','sourceSha':source,'familyId':family,'routeIds':[r['routeId'] for r in rows],
     'status':'RE_REVIEW_REQUIRED','decision':None,'reviewer':None,'reviewedAt':None,'approvalCreated':False,
     'ownerDirection':'Roger Roman confirmed on 2026-09-14 that no later exact-hash approval exists and requested fresh packages; this is a request for re-review, not approval.',
     'governingDecision':{'path':OWNER,'sha256':sha(read(OWNER)),'recordId':'OWN-ADOPT-2026-09-02-BATCH-53','rule':'Any substantive legal change, or any change to a family shipping-artifact digest, requires re-review.'},
     'artifacts':artifacts,'preservedRevocations':[{'recordId':r['recordId'],'version':r['version'],'revocation':r['revocation']} for r in rows],
     'technicalEvidence':{'selectedIndependentVerdicts':selected,'rasterRows':rasters,'grantsOwnerApproval':False},
     'decisionRequirements':['Review both complete current PDFs, including all court-owned and participant-owned blanks.','Name reviewer, review date, exact family/routes and both full SHA-256 hashes.','State APPROVE, REJECT, or required corrections and qualifications explicitly.','Do not replace historical approvals or revoke historical evidence. Bind a new decision through canonical authority generators only after review.'],
     'boundaries':{'candidateFreezeBlocked':True,'finalSuccessorPublicationBlocked':True,'authorityGatesBlocked':True,'productionAuthorized':False,'deploymentAuthorized':False,'msNonconvPaidDecisionUnaffected':True}}
   products[f'{family}/package.json']=(json.dumps(package,indent=2)+'\n').encode();packages.append(package)
   lines=[f'# Exact-artifact re-review: {family}','', '**RE-REVIEW REQUIRED — no approval recorded.**','',f'Source: `{source}`','', 'Review both current PDFs below. Their shipping digests differ from the prior approval; technical and raster passes do not renew it.','', '| Fixture | Current PDF | SHA-256 | Pages | Change evidence |','| --- | --- | --- | --- | --- |']
   for a in artifacts:lines.append(f"| {a['fixture']} | {link(a['path'],'Open PDF')} | `{a['sha256']}` | {a['pageCount']} | [{a['fixture']} text diff]({a['fixture']}.text.diff) |")
   lines+=['','Exact routes:','']+[f'- `{r}`' for r in package['routeIds']]
   lines+=['','Review instructions:','']+[f'{i+1}. {r}' for i,r in enumerate(package['decisionRequirements'])]
   lines+=['','Existing revocations, affected authority gates, candidate freeze and final successor publication remain blocked. This package grants no deployment or Production authority. The separate MS nonconv paid-consumer decision is unchanged.','', '[Machine-readable evidence and historical hashes](package.json)','']
   products[f'{family}/README.md']='\n'.join(lines).encode()
 manifest={'schemaVersion':'rcap-exact-artifact-rereview-index/v1','sourceSha':source,'generatedBy':'scripts/grade-a-artifact-rereview/generate.py','status':'RE_REVIEW_REQUIRED','approvalCreated':False,'packages':[{'familyId':p['familyId'],'path':f"{p['familyId']}/package.json",'sha256':sha(products[f"{p['familyId']}/package.json"])} for p in packages]}
 products['manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
 products['README.md']=('# Exact-artifact re-review packages — 2026-09-14\n\nNo approval is recorded. Existing revocations and the candidate-freeze/final-publication blocks remain in force.\n\n'+''.join(f"- [{p['familyId']}]({p['familyId']}/README.md): canonical and boundary PDFs, full hashes, historical comparison, technical evidence and required reviewer decision.\n" for p in packages)+'\nMS nonconv paid-consumer authority remains separately approved and unchanged.\n').encode()
 for rel,content in products.items():
  target=OUT/rel
  if args.check:assert target.read_bytes()==content,f'{target}: stale package'
  else:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(content)
 print(f'{len(packages)} packages / 4 current PDFs / {len(products)} small files '+('verified current' if args.check else 'generated')+'; no approval or packet rendering.')
if __name__=='__main__':main()
