"""Run unchanged --check and a read-only service-helper derivative in disposable copies.
The derivative replaces only the final run() invocation. Neither path builds PDFs.
"""
from pathlib import Path
import tempfile,subprocess,os,json,hashlib,shutil
root=Path.cwd();out=root/'data/rcap-grade-a/packet-factory-24h/vf01/fl-source-restored-20260911'
family='data/rcap-all50/overlays/census-v1/fl/fl-10yr-bridge-set--official-pdf-fill'
builder='scripts/build-census-v1-fl-10yr-bridge-set.mjs'
source=root/'reference/source-recovery/2026-09-11-wave1/CODEX-CS2-SRC2__FL-10YR-BRIDGE-SET__FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION__ced5d88f7305.pdf'
records=['data/record-clearing/legal-design-intake/FL.memo.json','data/record-clearing/legal-design-track-registry.json','data/record-clearing/legal-design-packet-set-manifests.json']
watch=[source,root/builder,*[root/p for p in records],*[p for p in (root/family).rglob('*') if p.is_file()]]
sha=lambda b:hashlib.sha256(b).hexdigest();before={str(p.relative_to(root)):sha(p.read_bytes()) for p in watch}
results=[]
with tempfile.TemporaryDirectory(prefix='fl-check-independent-') as temporary:
 temp=Path(temporary);(temp/'scripts').mkdir();(temp/builder).write_bytes((root/builder).read_bytes())
 for rel in ['node_modules','scripts/rcap-official-forms','scripts/rcap-packet-completeness']:(temp/rel).symlink_to(root/rel,target_is_directory=True)
 shutil.copytree(root/family,temp/family)
 for rel in records:
  (temp/rel).parent.mkdir(parents=True,exist_ok=True);(temp/rel).write_bytes((root/rel).read_bytes())
 original=(root/builder).read_text();needle='run().then((result) => console.log(JSON.stringify(result, null, 2)))';assert original.count(needle)==1
 tail=original.index(needle);derivative=original[:tail]+"console.log(JSON.stringify(serviceRequirement()));\n"
 (temp/'scripts/probe-service-helper.mjs').write_text(derivative)
 (temp/'guard.mjs').write_text("import fs from 'node:fs'; for (const k of ['writeFileSync','mkdirSync','appendFileSync','renameSync','unlinkSync','rmSync','rmdirSync']) fs[k] = () => {throw new Error('UNAUTHORIZED_WRITE_'+k)};\n")
 env={**os.environ,'PF17_FL_FDLE_SOURCE':str(source),'RCAP_NO_LOCAL_RASTER':'1'}
 def run(case,helper=False,source_override=None):
  args=['node','--import',str(temp/'guard.mjs'),str(temp/('scripts/probe-service-helper.mjs' if helper else builder))]+([] if helper else ['--check'])
  e={**env};
  if source_override:e['PF17_FL_FDLE_SOURCE']=source_override
  r=subprocess.run(args,cwd=temp,env=e,text=True,capture_output=True);results.append({'case':case,'entrypoint':'serviceRequirement isolated derivative' if helper else 'unchanged real builder --check','exitCode':r.returncode,'stdout':r.stdout.strip(),'error':next((x.strip() for x in r.stderr.splitlines() if 'AssertionError' in x or 'BLOCKED_SOURCE' in x or 'UNAUTHORIZED_WRITE' in x),'')})
 def reset():
  for rel in records:(temp/rel).write_bytes((root/rel).read_bytes())
 def track(j):return next(x for x in j['tracks'] if x['trackId']=='fl-10yr-bridge')
 def packet(j):return next(x for x in j['packetSets'] if x['packetSetId']=='fl-10yr-bridge-set')
 run('valid-current-source-and-records');run('valid-current-service-helper',True)
 for case in ['one-record-disagrees','serve-party-no-longer-required','service-now-names-recipient','new-certificate-component']:
  reset();js=[json.loads((temp/p).read_text()) for p in records]
  if case=='one-record-disagrees':track(js[0])['rules']['service']='A changed requirement.'
  if case=='serve-party-no-longer-required':next(x for x in packet(js[2])['participantActionRequired'] if x['kind']=='serve_party')['requirement']='optional'
  if case=='service-now-names-recipient':
   sentence='Serve the prosecutor by mail.'
   for j in js[:2]:track(j)['rules']['service']=sentence
   next(x for x in packet(js[2])['participantActionRequired'] if x['kind']=='serve_party')['description']=sentence
  if case=='new-certificate-component':packet(js[2])['components'].append({'role':'certificate_of_service'})
  for rel,j in zip(records,js):(temp/rel).write_text(json.dumps(j))
  run(case);run(case,True)
 reset();(temp/family/'participant-instructions.md').unlink();run('delivered-instructions-missing')
 (temp/family/'fixtures/canonical.pdf').write_bytes(b'not-a-pdf');run('current-canonical-pdf-corrupt')
 run('source-absent',source_override=str(temp/'missing.pdf'))
 b=bytearray(source.read_bytes());b[100]^=1;(temp/'corrupt-source.pdf').write_bytes(b);run('same-length-source-corrupt',source_override=str(temp/'corrupt-source.pdf'))
 (temp/'short-source.pdf').write_bytes(source.read_bytes()[:-1]);run('source-length-wrong',source_override=str(temp/'short-source.pdf'))
assert before=={str(p.relative_to(root)):sha(p.read_bytes()) for p in watch}
report={'schemaVersion':'rcap-independent-entrypoint-controls/v1','familyId':'fl-10yr-bridge-set','verifiedAtBase':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'builderSha256':sha((root/builder).read_bytes()),'scope':'Real --check source guard; isolated current service helper; no build/render/runtime eligibility claim','controls':results,'writesPreventedByPreload':True,'repositoryInputsUnchanged':True,'temporaryCopiesRemoved':True,'interpretation':'--check validates only exact source bytes and returns static map counts before calling serviceRequirement or reading current artifacts. Its success is not service/artifact validation. The service helper itself refuses all four changed-record controls.'}
(out/'entrypoint-controls.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
