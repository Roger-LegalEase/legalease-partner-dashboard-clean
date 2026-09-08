#!/usr/bin/env python3
"""Execute two FULL DCI builds and both suites. --with-pdf-audit also runs page QA."""
import hashlib,json,re,subprocess,time,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
FAMILY=ROOT/'data/rcap-all50/overlays/census-v1/ia/ia-dci77-set--official-pdf-fill'
EVIDENCE=ROOT/'data/rcap-grade-a/chat-parallel-2026-09-07/chat8-build/ia-dci77-set'
def sha(b):return hashlib.sha256(b).hexdigest()
def identity(p):
 b=p.read_bytes();return {'path':p.relative_to(ROOT).as_posix(),'bytes':len(b),'sha256':sha(b),'gitBlobSha1':hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()}
def snap():return {p.relative_to(FAMILY).as_posix():{'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size} for p in sorted(FAMILY.rglob('*')) if p.is_file()}
commands=[]
def run(name,args):
 p=subprocess.run(args,cwd=ROOT,capture_output=True,text=True)
 (EVIDENCE/(name+'.stdout.log')).write_text(p.stdout);(EVIDENCE/(name+'.stderr.log')).write_text(p.stderr)
 r={'name':name,'command':args,'exit':p.returncode,'stdoutSha256':sha(p.stdout.encode()),'stderrSha256':sha(p.stderr.encode())};commands.append(r)
 if p.returncode:raise RuntimeError(f'{name} failed: {p.stderr[-800:]} {p.stdout[-800:]}')
 return p
EVIDENCE.mkdir(parents=True,exist_ok=True)
# Capture the actual transitive local JS imports and lockfile before execution.
imports=set()
def visit(p):
 p=p.resolve()
 if p in imports:return
 imports.add(p)
 for token in re.findall(r'(?:from\s+|import\s+)[\'\"]([^\'\"]+)[\'\"]',p.read_text()):
  if token.startswith('.'):
   q=(p.parent/token).resolve()
   if q.is_file():visit(q)
visit(ROOT/'scripts/build-census-v1-ia-dci77-set.mjs')
inputs=[identity(p) for p in sorted(imports)]+[identity(ROOT/'package-lock.json'),identity(ROOT/'data/record-clearing/legal-design-intake/IA.memo.json'),identity(ROOT/'reference/chat-parallel-2026-09-07/chat8/ia-dci76-77-2021-09-22.pdf')]
run('full-build-1',['node','scripts/build-census-v1-ia-dci77-set.mjs']);one=snap();time.sleep(1.1)
run('full-build-2',['node','scripts/build-census-v1-ia-dci77-set.mjs']);two=snap();assert one==two,'some complete generated family file differs'
a=run('renderer-tests',['node','--test','scripts/rcap-packet-recovery/chat8/ia-dci77.test.mjs'])
b=run('importer-tests',['node','--test','scripts/rcap-packet-recovery/chat8/ia-dci77-importer.test.mjs'])
if '--with-pdf-audit' in sys.argv:run('whole-pdf-audit',['python','scripts/rcap-packet-recovery/chat8/verify-ia-dci77-pdfs.py','--evidence',str(EVIDENCE/'pdf-qa')])
assert snap()==two,'tests or read-only QA changed candidate'
for i in inputs:assert identity(ROOT/i['path'])==i,'an executed input changed'
packets=json.loads((FAMILY/'reports/rendered-artifacts.json').read_text())['packets']
r={'familyId':'ia-dci77-set','commands':commands,'completeFullBuilds':2,'allGeneratedFilesEqual':True,'generatedFamilyFiles':len(two),'allOutputs':two,'inputs':inputs,'nodeRuntime':subprocess.check_output(['node','--version'],text=True).strip(),'rendererTestsPassed':int(re.search(r'^# pass (\d+)',a.stdout,re.M)[1]),'importerTestsPassed':int(re.search(r'^# pass (\d+)',b.stdout,re.M)[1]),'completeVariants':len(packets),'completePages':sum(p['pageCount'] for p in packets),'completePdfIdentities':[{'fixture':p['fixture'],'path':p['path'],'pages':p['pageCount'],'sha256':p['sha256'],'bytes':p['bytes']} for p in packets],'sharedImporterEdited':False,'rawImporter':json.loads((FAMILY/'reports/completeness-result.json').read_text()),'authorQAOnly':True,'independentReview':'PENDING_CHAT10','installation':'PENDING_CHAT12','terminalOrProductionApproval':False}
(EVIDENCE/'execution-proof.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({k:r[k] for k in ['completeFullBuilds','generatedFamilyFiles','allGeneratedFilesEqual','rendererTestsPassed','importerTestsPassed','completeVariants','completePages','authorQAOnly']}))
