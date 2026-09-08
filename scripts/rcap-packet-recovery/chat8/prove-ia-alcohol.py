#!/usr/bin/env python3
"""Full deterministic builds and evidence for the two assigned alcohol forms only."""
from pathlib import Path
import argparse,subprocess,hashlib,json,tempfile,time,shutil
ROOT=Path(__file__).resolve().parents[3]
def sha(b):return hashlib.sha256(b).hexdigest()
def inventory(p):return {f.relative_to(p).as_posix():{'bytes':f.stat().st_size,'sha256':sha(f.read_bytes())} for f in sorted(p.rglob('*')) if f.is_file()}
def main():
 a=argparse.ArgumentParser();a.add_argument('--form',type=int,choices=[3,4],required=True);n=a.parse_args().form;fid=f'ia-1234{6 if n==3 else 7}-set';family=ROOT/'data/rcap-all50/overlays/census-v1/ia'/f'{fid}--official-pdf-fill';e=ROOT/'data/rcap-grade-a/chat-parallel-2026-09-07/chat8-build'/fid;e.mkdir(parents=True,exist_ok=True);records=[]
 def run(label,cmd):
  p=subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,timeout=180);(e/(label+'.stdout.log')).write_text(p.stdout);(e/(label+'.stderr.log')).write_text(p.stderr);records.append({'command':cmd,'exitCode':p.returncode,'label':label});assert p.returncode==0,(label,p.stderr,p.stdout[-4000:]);return p
 run('full-build-1',['node',f'scripts/build-census-v1-{fid}.mjs']);first=inventory(family)
 with tempfile.TemporaryDirectory(prefix='chat8-full-alcohol-') as t:
  time.sleep(1.1);run('full-build-2',['node',f'scripts/build-census-v1-{fid}.mjs','--out',t]);second=inventory(Path(t));assert first==second,[(k,first.get(k),second.get(k)) for k in first.keys()|second.keys() if first.get(k)!=second.get(k)]
 run('renderer-tests',['node','--test',f'scripts/rcap-packet-recovery/chat8/ia-1234{6 if n==3 else 7}.test.mjs'])
 run('importer-tests',['node','--test',f'scripts/rcap-packet-recovery/chat8/ia-1234{6 if n==3 else 7}-importer.test.mjs'])
 run('complete-pdf-qa',['python','scripts/rcap-packet-recovery/chat8/verify-ia-alcohol-pdfs.py','--form',str(n),'--evidence',str(e/'pdf-qa')])
 assert inventory(family)==first,'tests changed original family files'
 inputs=[f'scripts/build-census-v1-{fid}.mjs',f'scripts/rcap-packet-recovery/chat8/ia-1234{6 if n==3 else 7}.mjs',f'scripts/rcap-packet-recovery/chat8/ia-1234{6 if n==3 else 7}.test.mjs',f'scripts/rcap-packet-recovery/chat8/ia-1234{6 if n==3 else 7}-importer.test.mjs','scripts/rcap-packet-recovery/chat8/ia-901c3.mjs','scripts/rcap-packet-recovery/chat8/verify-ia-alcohol-pdfs.py','scripts/rcap-packet-recovery/chat8/prove-ia-alcohol.py','scripts/rcap-official-forms/rcap-text-fitting.mjs','scripts/rcap-official-forms/rcap-official-form-finalize.mjs','scripts/rcap-official-forms/rcap-active-content.mjs','scripts/rcap-official-forms/rcap-field-semantics.mjs','scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs','scripts/rcap-packet-completeness/completeness-contract.mjs','scripts/rcap-packet-completeness/verify-packet-completeness.mjs','data/record-clearing/legal-design-intake/IA.memo.json','package-lock.json',f'reference/chat-parallel-2026-09-07/chat8/ia-rule-2-86-form-{n}-2024-08.pdf']
 if n==4:inputs+=['scripts/rcap-packet-recovery/chat8/ia-12346.mjs','scripts/rcap-packet-recovery/chat8/form4-source-map.json']
 ids={p:{'bytes':len(b:= (ROOT/p).read_bytes()),'sha256':sha(b),'gitBlobSha1':hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()} for p in inputs}
 (e/'full-build-proof.json').write_text(json.dumps({'familyId':fid,'fullRendererRuns':2,'commands':records,'generatedFilesCompared':len(first),'allGeneratedFilesIdentical':True,'allGeneratedFilesUnchangedAfterTests':True,'outputs':first,'inputs':ids,'authorQAOnly':True,'independentReview':'PENDING_CHAT10','centralRaster':'PENDING_CHAT_A'},indent=2)+'\n');print(json.dumps({'familyId':fid,'commands':len(records),'allExit0':True,'identicalGeneratedFiles':len(first)}))
if __name__=='__main__':main()
