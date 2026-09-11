#!/usr/bin/env python3
"""Read current sources, PDFs, records and original raster bodies; never render."""
import hashlib, importlib.util, json, os, pathlib, shutil, struct, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[5]
os.chdir(ROOT)
OUT = pathlib.Path(__file__).resolve().parent
BASE = '1e09363c514ddfabfe493be8685bc466afd7f723'
RASTER = pathlib.Path('data/rcap-grade-a/packet-factory-24h/raster-runs/34644046027')
FAMILIES = {
 'al-pardon-set': ('al', 'al-pardon-set', 'private/source-imports/src05-worker-materialization-2026-09-02/LegalEase Alabama/AL_ABPP-3_rev-2025-06-14.pdf'),
 'census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement': ('ut', 'census-pending-family:ut:path-l-vacatur-human-trafficking-related-expungement', 'reference/utah/04_PCRA_Petition-2022-06-13.pdf')
}
def digest(b): return hashlib.sha256(b).hexdigest()
def pin(p):
 p = pathlib.Path(p); b = p.read_bytes()
 return dict(path=str(p), sha256=digest(b), byteLength=len(b))
def save(name,value): (OUT/name).write_text(json.dumps(value,indent=2)+'\n')
commands=[]
def run(name,args):
 result=subprocess.run(args,capture_output=True,text=True)
 (OUT/(name+'.stdout')).write_text(result.stdout)
 (OUT/(name+'.stderr')).write_text(result.stderr)
 commands.append(dict(id=name,argv=args,exitCode=result.returncode,stdout=str((OUT/(name+'.stdout')).relative_to(ROOT)),stderr=str((OUT/(name+'.stderr')).relative_to(ROOT))))
 return result

preflight={'base':BASE,'cwd':str(ROOT),'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'branch':subprocess.check_output(['git','branch','--show-current'],text=True).strip(),'statusBefore':subprocess.check_output(['git','status','--short'],text=True),'pythonModules':{x:bool(importlib.util.find_spec(x)) for x in ['fitz','PIL','pikepdf']},'executables':{x:shutil.which(x) for x in ['node','pdftotext','pdfinfo']},'environmentMutated':False,'localRendering':False,'oldLaneWipCheckpoint':'/tmp/vf02-de-ledger-wip-before-al-ut-20260911','claimLedger':pin('data/rcap-grade-a/packet-factory-24h/claim-ledger.json')}
assert preflight['head']==BASE
for f,(state,slug,source) in FAMILIES.items():
 assert run(state+'-claim',['node','scripts/grade-a-packet-factory-24h/claim.mjs','--assert','VF02',f]).returncode==0
save('preflight.json',preflight)
bindings=[]
for f,(state,slug,source) in FAMILIES.items():
 directory=pathlib.Path('data/rcap-all50/overlays/census-v1')/state/(slug+'--official-pdf-fill')
 rec=json.loads((RASTER/(f+'.ORIGINAL_EVIDENCE_VERIFIED.json')).read_text())
 verdict=json.loads((RASTER/(f+'.verdict.json')).read_text())
 measured={'familyId':f,'directory':str(directory),'source':pin(source),'files':[pin(p) for p in sorted(directory.rglob('*')) if p.is_file()], 'rasterReceipt':pin(RASTER/(f+'.ORIGINAL_EVIDENCE_VERIFIED.json')),'rasterVerdict':pin(RASTER/(f+'.verdict.json')),'rasterTransport':{k:rec[k] for k in ['artifact','packetCommitSha','workflowRunId','documentsDigest','logEvidence','immutableCheckoutProof']},'originalPngs':[],'currentPdfBindings':[]}
 for name,pdf in [('source',pathlib.Path(source)),('canonical',directory/'fixtures/canonical.pdf'),('boundary',directory/'fixtures/boundary.pdf')]:
  run(state+'-'+name+'-text',['pdftotext','-layout',str(pdf),'-'])
  run(state+'-'+name+'-bbox',['pdftotext','-bbox',str(pdf),'-'])
  run(state+'-'+name+'-pdfinfo',['pdfinfo',str(pdf)])
  if name!='source':
   current=pin(pdf); current['rasterPinnedSha256']=verdict['hashesBound'][name]['pinned']; current['matches']=current['sha256']==current['rasterPinnedSha256'];assert current['matches'];measured['currentPdfBindings'].append(current)
 for entry in rec['pageImages']:
  p=pathlib.Path(entry['path']); b=p.read_bytes(); width,height=struct.unpack('>II',b[16:24]); current=pin(p)
  current.update(kind=entry['kind'],actualPngDimensions={'width':width,'height':height},receiptPaperDimensions=entry['paperDimensions'],receiptReportedDimensions=entry['receiptReportedPngDimensions'],matchesReceiptSha256=current['sha256']==entry['sha256'],matchesReceiptLength=len(b)==entry['byteLength'])
  assert b[:8]==b'\x89PNG\r\n\x1a\n' and current['matchesReceiptSha256'] and current['matchesReceiptLength']
  assert {'width':width,'height':height}==entry['actualPngDimensions']
  measured['originalPngs'].append(current)
 measured['pagePngCount']=sum(x['kind']!='calibration' for x in measured['originalPngs'])
 bindings.append(measured)
 commands_to_run=[
  (state+'-builder-check',['node',f'scripts/build-census-v1-{f}.mjs','--check']),
  (state+'-completeness',['node','scripts/rcap-packet-completeness/verify-packet-completeness.mjs','--family',f]),
  (state+'-focused-test',['node','scripts/rcap-packet-recovery/'+('al-pardon.test.mjs' if state=='al' else 'ut-trafficking-pcra.test.mjs')]),
  (state+'-wiring-check',['node','scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs','--check','--family',f])]
 for name,args in commands_to_run: run(name,args)
 after=[pin(p) for p in sorted(directory.rglob('*')) if p.is_file()]
 measured['familyTreeUnchangedByCommands']=after==measured['files'];assert measured['familyTreeUnchangedByCommands']
run('ut-declaration-tests',['node','--test','scripts/grade-a-packet-factory-24h/ut-pcra-declared-delivery.test.mjs'])
save('current-bindings.json',bindings)
prior_path=pathlib.Path('data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json');prior=json.loads(prior_path.read_text())
save('prior-review-trace.json',{'index':pin(prior_path),'exactFamilyRows':{f:[r for r in prior['rows'] if r.get('familyId')==f] for f in FAMILIES},'reusedApprovals':[],'interpretation':'No indexed prior exact-family row exists in the assigned base. All 30 obligations receive fresh independent readings.'})
anchors=['docs/PRODUCT_CONTRACT.md','docs/rcap/grade-a/packet-factory-24h/VF02.md','data/rcap-grade-a/legal-decisions/UT_TRAFFICKING_PCRA_IMPLEMENTATION_2026-09-11.md','data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json','scripts/build-census-v1-al-pardon-set.mjs','scripts/build-census-v1-census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement.mjs','scripts/rcap-official-forms/rcap-official-form-finalize.mjs','scripts/rcap-official-forms/pdf-flattened-widgets.mjs','scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs','scripts/grade-a-packet-factory-24h/ut-pcra-declared-delivery.mjs','scripts/rcap-packet-completeness/verify-packet-completeness.mjs','data/record-clearing/legal-design-track-registry.json','data/record-clearing/factory-v2-route-registry.json']
anchors += [str(RASTER/x) for x in ['canary-receipt.json','negative-controls.json','runtime-receipt.json']]
save('authority-and-helper-pins.json',[pin(p) for p in anchors])
save('commands.json',commands)
print(json.dumps({'families':len(bindings),'originalPacketPngs':sum(x['pagePngCount'] for x in bindings),'commands':len(commands),'nonzero':[{k:c[k] for k in ['id','exitCode']} for c in commands if c['exitCode']],'sources':[x['source'] for x in bindings]},indent=2))
