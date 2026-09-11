import json,pathlib,hashlib,re,subprocess
O=pathlib.Path('data/rcap-grade-a/packet-factory-24h/vf08/tx-eight-current-20260911');A=pathlib.Path('data/rcap-grade-a/packet-factory-24h/vf90/tx-current-stream-accounting-20260911');R=pathlib.Path('data/rcap-grade-a/packet-factory-24h/raster-runs/34644046027')
def read(p):return json.loads(pathlib.Path(p).read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def bind(p):p=pathlib.Path(p);b=p.read_bytes();return {'path':str(p),'sha256':sha(b),'bytes':len(b)}
m=read(O/'current-measurements.json');s=read(O/'stream-measurements.json');custody=[]
for f in read(A/'CUSTODY.json')['files']:
 p=A/f['path'];b=bind(p);b['matchesCustody']=b['sha256']==f['sha256'] and b['bytes']==f['byteLength'];custody.append(b)
primaries=[];original=[]
for f in m:
 sf=next(x for x in s if x['familyId']==f['familyId'])
 for fix in f['fixtures']:
  p=A/'primary'/(f['familyId']+'--'+fix['fixture']+'.pdf.json');a=read(p);sm=next(x for x in sf['fixtures']if x['fixture']==fix['fixture']);primaries.append({**bind(p),'familyId':f['familyId'],'fixture':fix['fixture'],'currentPdfSha256':fix['sha256'],'primaryPdfSha256':a['fixtureSha256'],'currentMatchesPrimary':fix['sha256']==a['fixtureSha256'],'independentCounts':sm['counts'],'primaryStrokeOnlyCount':len(a['strokeOnly']),'sourceReceiptMatchesCurrent':a['sourceReceiptSha256']==bind(pathlib.Path(sf['dir'])/'source-receipt.json')['sha256']})
 v=read(R/(f['familyId']+'.verdict.json'));p=read(R/(f['familyId']+'.ORIGINAL_EVIDENCE_VERIFIED.json'));log=pathlib.Path(p['logEvidence']['path']);zipfile=pathlib.Path(p['artifact']['zipPath']);external=[]
 for file in [log,zipfile]:
  if file.exists():
   b=bind(file);b['matchesOriginal']=b['sha256']==(p['immutableCheckoutProof']['originalLogSha256'] if file==log else p['artifact']['apiDigest'].removeprefix('sha256:'));external.append(b)
  else:external.append({'path':str(file),'available':False,'retainedCustody':str(R/(f['familyId']+'.ORIGINAL_EVIDENCE_VERIFIED.json'))})
 original.append({'familyId':f['familyId'],'verdict':v['verdict'],'verdictBinding':bind(R/(f['familyId']+'.verdict.json')),'packetCommitSha':v['packetCommitSha'],'pagesMeasured':v['pagesMeasured'],'problems':v['problems'],'environmentProblems':v['environmentProblems'],'externalOriginalFiles':external,'originalPacketPngCount':sum(x['isPacketPage'] for x in f['originalPngs']),'originalExtraPngCount':sum(not x['isPacketPage'] for x in f['originalPngs']),'allOriginalPngHashesMatch':all(x['matches']for x in f['originalPngs']),'actualCanvasDimensions':sorted(set(tuple(x['dimensions'])for x in f['originalPngs'])),'paperDimensions':[2040,2640],'apiDigest':p['artifact']['apiDigest'],'logSha256':p['immutableCheckoutProof']['originalLogSha256']})
controls=[{'binding':bind(R/x),'content':read(R/x)}for x in ['runtime-receipt.json','canary-receipt.json','negative-controls.json']]
results={'streamCustody':custody,'primaryBindings':primaries,'originalRasterBindings':original,'rasterControls':controls,'inputBindings':[bind(x) for x in ['AGENTS.md','docs/PRODUCT_CONTRACT.md','docs/rcap/grade-a/packet-factory-24h/VF08.md','data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json','data/rcap-grade-a/packet-factory-24h/fix06/tx-route-copy-20260911/repair-evidence.json','data/rcap-grade-a/packet-factory-24h/fix07/tx-source-restored-20260911/repair-evidence.json','data/rcap-grade-a/packet-factory-24h/vf90/rows-vf90-border-byte-accounting-20260910.json']]}
(O/'evidence-bindings.json').write_text(json.dumps(results,indent=2)+'\n')
print('custody',len(custody),all(x['matchesCustody']for x in custody),'primary',len(primaries),all(x['currentMatchesPrimary']and x['sourceReceiptMatchesCurrent']for x in primaries),'pngs',sum(x['originalPacketPngCount']for x in original),'originals missing',sum(x.get('available')is False for r in original for x in r['externalOriginalFiles']))
