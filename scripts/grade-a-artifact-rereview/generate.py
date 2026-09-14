#!/usr/bin/env python3
"""Package exact existing artifacts for review. Never render or grant approval."""
import argparse, difflib, hashlib, html, json, pathlib, subprocess, tempfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'data/rcap-grade-a/artifact-rereview-20260914'
OWNER='data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json'
REGISTRY='data/rcap-grade-a/fulfillment-authority-registry.json'
SOURCE='ff9705a240c004ed7b9d2f022113abe865442d3f'
REVIEW_SOURCE='d4bcf80dbecfd5e1c7e0f2939d4b3528b12cd215'
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
 source=REVIEW_SOURCE
 if args.check:
  source=js((OUT/'manifest.json').read_bytes())['sourceSha']
  subprocess.run(['git','merge-base','--is-ancestor',source,'HEAD'],cwd=ROOT,check=True)
 registry=js(git('show',f'{REVIEW_SOURCE}:{REGISTRY}'));verifiers=js(git('show',f'{REVIEW_SOURCE}:data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json'))
 raster=js(git('show',f'{REVIEW_SOURCE}:data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json'))
 products={};packages=[]
 with tempfile.TemporaryDirectory(prefix='grade-a-rereview-',dir='/tmp') as tmp:
  for family,(state,pins) in PAIRS.items():
   rows=[r for r in registry['records'] if r['packetFamilyId']==family]
   assert rows and all(r['revocation']['revoked'] for r in rows),'revocation must remain intact'
   artifacts=[]
   for index,variant in enumerate(['canonical','boundary']):
    old=rows[0]['evidenceBindings']['approvedArtifacts'][variant]
    rel=f'data/rcap-all50/overlays/census-v1/{state}/{family}--custom-pleading/fixtures/{variant}.pdf'
    snapshot=f'data/rcap-grade-a/artifact-rereview-20260914/{family}/reviewed-pdfs/{variant}.pdf'
    current=read(snapshot);assert sha(current)==pins[index],f'{rel}: exact owner-requested digest moved'
    original=git('show',f'{SOURCE}:{rel}');assert sha(original)==old['sha256'],'historical bytes do not match approval'
    before=pathlib.Path(tmp)/'approved.pdf';after=pathlib.Path(tmp)/'current.pdf'
    before.write_bytes(original);after.write_bytes(current)
    texts=[subprocess.check_output(['pdftotext','-layout',str(f),'-']).decode() for f in [before,after]]
    delta=''.join(difflib.unified_diff(texts[0].splitlines(True),texts[1].splitlines(True),fromfile=f'approved/{variant}.txt',tofile=f'current/{variant}.txt'))
    diffpath=f'{family}/{variant}.text.diff';products[diffpath]=delta.encode()
    artifacts.append({'fixture':variant,'path':snapshot,'originalShippingPath':rel,'sha256':sha(current),'byteLength':len(current),'pageCount':metadata(after),
      'historicalApproved':{'sourceSha':SOURCE,'path':rel,'sha256':sha(original),'byteLength':len(original),'pageCount':metadata(before)},
      'textDiff':{'path':f'data/rcap-grade-a/artifact-rereview-20260914/{diffpath}','sha256':sha(delta.encode())},
      'textDiffLimit':'Extracted text comparison is an aid, not visual or legal approval. Review every page of the exact current PDF.'})
   selected=[r for r in verifiers['rows'] if r['familyId']==family and r.get('superseded') is False]
   rasters=[r for r in raster['rows'] if r.get('familyId')==family]
   package={'schemaVersion':'rcap-exact-artifact-rereview/v1','sourceSha':source,'familyId':family,'routeIds':[r['routeId'] for r in rows],
     'historicalSnapshot':True,'status':'RE_REVIEW_REQUIRED_AT_SNAPSHOT','decision':None,'reviewer':None,'reviewedAt':None,'approvalCreated':False,
     'ownerDirection':'Roger Roman confirmed on 2026-09-14 that no later exact-hash approval exists and requested fresh packages; this is a request for re-review, not approval.',
     'governingDecision':{'path':OWNER,'sha256':sha(read(OWNER)),'recordId':'OWN-ADOPT-2026-09-02-BATCH-53','rule':'Any substantive legal change, or any change to a family shipping-artifact digest, requires re-review.'},
     'artifacts':artifacts,'preservedRevocations':[{'recordId':r['recordId'],'version':r['version'],'revocation':r['revocation']} for r in rows],
     'technicalEvidence':{'selectedIndependentVerdicts':selected,'rasterRows':rasters,'grantsOwnerApproval':False},
     'decisionRequirements':['Review both complete current PDFs, including all court-owned and participant-owned blanks.','Name reviewer, review date, exact family/routes and both full SHA-256 hashes.','State APPROVE, REJECT, or required corrections and qualifications explicitly.','Do not replace historical approvals or revoke historical evidence. Bind a new decision through canonical authority generators only after review.'],
     'boundaries':{'candidateFreezeBlocked':True,'finalSuccessorPublicationBlocked':True,'authorityGatesBlocked':True,'productionAuthorized':False,'deploymentAuthorized':False,'msNonconvPaidDecisionUnaffected':True}}
   raster_file=OUT/family/'rasters.json';findings_file=OUT/family/'review-findings.json'
   if raster_file.exists() and findings_file.exists():
    raster_receipt=js(raster_file.read_bytes());findings=js(findings_file.read_bytes())
    assert findings['approvalCreated'] is False and findings['familyId']==family
    for row in raster_receipt['artifacts']:
     a=next(a for a in artifacts if a['fixture']==row['fixture'])
     expected=a if row['version']=='current' else a['historicalApproved']
     assert row['pdfSha256']==expected['sha256'] and len(row['images'])==expected['pageCount']
     for image in row['images']:assert sha(read(image['path']))==image['sha256'],'review image bytes moved'
    package['freshRasterEvidence']={'path':str(raster_file.relative_to(ROOT)),'sha256':sha(raster_file.read_bytes())}
    package['inspectionEvidence']={'path':str(findings_file.relative_to(ROOT)),'sha256':sha(findings_file.read_bytes()),'approvalCreated':False}
    parts=['<!doctype html><html lang="en"><meta charset="utf-8"><title>'+html.escape(family)+' — re-review</title>',
     '<style>body{font:16px system-ui;margin:24px;color:#182331;background:#f3f5f7}header{max-width:1100px}a{color:#164e96}code{overflow-wrap:anywhere}section{margin:32px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}img{width:100%;border:1px solid #aaa}figcaption{padding:10px;background:white}.note{background:#fff4cb;padding:16px}.changed{color:#922}pre{white-space:pre-wrap;background:white;padding:16px}nav a{margin-right:24px}@media(max-width:700px){.pair{grid-template-columns:1fr}}</style>',
     '<header><p class="note">Historical review snapshot. Subsequent owner decision: Illinois approved; this Mississippi pair rejected. See the active launch control for current bindings.</p><h1>'+html.escape(family)+'</h1><p class="note"><strong>RE-REVIEW REQUIRED. No approval recorded.</strong> Existing revocations, affected authority gates, candidate freeze and final successor publication remain blocked.</p>',
     '<p>'+html.escape(findings['classification'])+'</p><p>'+html.escape(findings['change'])+'</p>',
     '<p>'+html.escape(findings['inspectionSummary'])+'</p><ul>'+''.join('<li>'+html.escape(x)+'</li>' for x in findings['ownerReviewConcerns'])+'</ul>',
     '<p>No additional clipping, overlap or content loss was observed. This inspection does not approve the artifacts.</p><nav><a href="#canonical">Canonical pair</a><a href="#boundary">Boundary pair</a><a href="package.json">Exact evidence manifest</a></nav></header>']
    for a in artifacts:
     variant=a['fixture'];parts+=['<section id="'+variant+'"><h2>'+variant.title()+'</h2><p>Current PDF: <a href="../../../../'+a['path']+'">'+html.escape(a['path'])+'</a></p><p>Current SHA-256: <code>'+a['sha256']+'</code><br>Previously approved SHA-256: <code>'+a['historicalApproved']['sha256']+'</code></p>']
     rows={r['version']:r for r in raster_receipt['artifacts'] if r['fixture']==variant}
     for i in range(a['pageCount']):
      changed=rows['current']['images'][i]['sha256']!=rows['approved']['images'][i]['sha256']
      parts+=['<h3 class="'+('changed' if changed else '')+'">Page '+str(i+1)+(' — changed' if changed else ' — identical fresh render')+'</h3><div class="pair">']
      for kind,label in [('approved','Previously approved version'),('current','Current shipping version — awaiting approval')]:
       image=rows[kind]['images'][i];rel=str(pathlib.Path(image['path']).relative_to(OUT.relative_to(ROOT)/family))
       parts+=['<figure><figcaption>'+label+'</figcaption><a href="'+rel+'"><img loading="lazy" src="'+rel+'" alt="'+label+', '+variant+', page '+str(i+1)+'"></a></figure>']
      parts+=['</div>']
     parts+=['<details><summary>Exact extracted-text differences</summary><pre>'+html.escape(products[f'{family}/{variant}.text.diff'].decode())+'</pre></details></section>']
    products[f'{family}/review.html']='\n'.join(parts+['</html>']).encode()
   products[f'{family}/package.json']=(json.dumps(package,indent=2)+'\n').encode();packages.append(package)
   lines=[f'# Exact-artifact re-review: {family}','', '**Historical review snapshot — Illinois later approved; this Mississippi pair rejected. Consult current launch control.**','',f'Source: `{source}`','', 'Review both current PDFs below. Their shipping digests differ from the prior approval; technical and raster passes do not renew it.','', '| Fixture | Current PDF | SHA-256 | Pages | Change evidence |','| --- | --- | --- | --- | --- |']
   for a in artifacts:lines.append(f"| {a['fixture']} | {link(a['path'],'Open PDF')} | `{a['sha256']}` | {a['pageCount']} | [{a['fixture']} text diff]({a['fixture']}.text.diff) |")
   lines+=['', '[Open all current/prior page images side by side](review.html)', '', '[Inspection findings and presentation concerns](review-findings.json)', '', 'The canonical and boundary hashes identify two shipping PDFs; the boundary digest does not identify a JSON review record.', '', 'Exact routes:', '']+[f'- `{r}`' for r in package['routeIds']]
   lines+=['','Review instructions:','']+[f'{i+1}. {r}' for i,r in enumerate(package['decisionRequirements'])]
   lines+=['','Existing revocations, affected authority gates, candidate freeze and final successor publication remain blocked. This package grants no deployment or Production authority. The separate MS nonconv paid-consumer decision is unchanged.','', '[Machine-readable evidence and historical hashes](package.json)','']
   products[f'{family}/README.md']='\n'.join(lines).encode()
 manifest={'schemaVersion':'rcap-exact-artifact-rereview-index/v1','sourceSha':source,'generatedBy':'scripts/grade-a-artifact-rereview/generate.py','status':'HISTORICAL_REVIEW_SNAPSHOT','approvalCreated':False,'packages':[{'familyId':p['familyId'],'path':f"{p['familyId']}/package.json",'sha256':sha(products[f"{p['familyId']}/package.json"])} for p in packages]}
 products['manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
 products['README.md']=('# Exact-artifact re-review packages — 2026-09-14\n\nHistorical review snapshot: Illinois was subsequently approved; this Mississippi pair was rejected. Current decisions and the repaired Mississippi pair are bound separately in launch control.\n\n'+''.join(f"- [{p['familyId']}]({p['familyId']}/README.md): canonical and boundary PDFs, full hashes, historical comparison, technical evidence and required reviewer decision.\n" for p in packages)+'\nMS nonconv paid-consumer authority remains separately approved and unchanged.\n').encode()
 for rel,content in products.items():
  target=OUT/rel
  if args.check:assert target.read_bytes()==content,f'{target}: stale package'
  else:target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(content)
 print(f'{len(packages)} packages / 4 current PDFs / {len(products)} small files '+('verified current' if args.check else 'generated')+'; no approval or packet rendering.')
if __name__=='__main__':main()
