#!/usr/bin/env python3
"""Execute two actual Form 2 builds, all-file comparison and fresh focused tests.
Writes only Chat 8 evidence and temporary outputs. Never promotes shared state.
"""
import hashlib,json,re,subprocess,tempfile,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
FAMILY=Path('data/rcap-all50/overlays/census-v1/ia/ia-901c3-set--official-pdf-fill')
E=ROOT/'data/rcap-grade-a/chat-parallel-2026-09-07/chat8-build/ia-901c3-set'
E.mkdir(parents=True,exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def inventory(p):return {str(x.relative_to(p)):{'sha256':sha(x.read_bytes()),'bytes':x.stat().st_size} for x in sorted(p.rglob('*')) if x.is_file()}
def run(name,args):
    start=time.monotonic();p=subprocess.run(args,cwd=ROOT,capture_output=True,text=True)
    (E/(name+'.stdout.log')).write_text(p.stdout);(E/(name+'.stderr.log')).write_text(p.stderr)
    row={'name':name,'command':args,'cwd':'repository root','exitCode':p.returncode,'seconds':round(time.monotonic()-start,3)}
    commands.append(row)
    if p.returncode:raise RuntimeError(f'{name}: {p.returncode}; see retained logs')
commands=[]
run('full-build-default',['node','scripts/build-census-v1-ia-901c3-set.mjs'])
with tempfile.TemporaryDirectory(prefix='chat8-form2-proof-') as t:
    a=Path(t)/'first';b=Path(t)/'second'
    run('full-build-first',['node','scripts/build-census-v1-ia-901c3-set.mjs','--out',str(a)])
    run('full-build-second',['node','scripts/build-census-v1-ia-901c3-set.mjs','--out',str(b)])
    actual=inventory(ROOT/FAMILY);one=inventory(a);two=inventory(b)
    assert actual==one==two,'Full generated file-set or byte mismatch'
run('node-tests',['node','--test','scripts/rcap-packet-recovery/chat8/ia-901c3.test.mjs'])
run('pdf-importers',['python','scripts/rcap-packet-recovery/chat8/verify-ia-901c3-pdfs.py','--evidence',str(E/'pdf-qa')])
expr="import {auditFamily} from './scripts/rcap-packet-completeness/verify-packet-completeness.mjs'; import fs from 'node:fs';const a=auditFamily('"+str(FAMILY)+"','ia-901c3-set');console.log(JSON.stringify(a,null,2));if(a.result!=='FAIL_COMPONENT_SET'||a.counters.requiredComponentsMissing!==1||Object.entries(a.counters).some(([k,v])=>k!=='requiredComponentsMissing'&&v!==0))process.exitCode=1;"
run('shared-completeness-importer',['node','--input-type=module','-e',expr])
# Resolve all local transitive imports, including the known dynamic shadow-fill helper.
roots=[ROOT/'scripts/build-census-v1-ia-901c3-set.mjs',ROOT/'scripts/rcap-packet-recovery/chat8/ia-901c3.test.mjs',ROOT/'scripts/rcap-packet-completeness/verify-packet-completeness.mjs']
seen=set();queue=roots[:]
while queue:
    p=queue.pop().resolve()
    if p in seen:continue
    assert p.is_relative_to(ROOT);seen.add(p)
    for s in re.findall(r"['\"](\.[^'\"]+\.mjs)['\"]",p.read_text()):
        q=(p.parent/s).resolve()
        if q.exists():queue.append(q)
seen.update([ROOT/'package-lock.json',ROOT/'data/record-clearing/legal-design-intake/IA.memo.json',ROOT/'reference/chat-parallel-2026-09-07/chat8/ia-rule-2-86-form-2-2024-08.pdf',Path(__file__).resolve(),ROOT/'scripts/rcap-packet-recovery/chat8/verify-ia-901c3-pdfs.py'])
inputs=[]
for p in sorted(seen):
    b=p.read_bytes();inputs.append({'path':str(p.relative_to(ROOT)),'bytes':len(b),'sha256':sha(b),'gitBlobSha1':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()})
(E/'reproducibility.json').write_text(json.dumps({'familyId':'ia-901c3-set','fullRendersExecuted':3,'twoIndependentOutputDirectoriesCompared':True,'allGeneratedFiles':actual,'generatedFiles':len(actual),'mismatches':[],'commands':commands,'inputs':inputs,'sourceApproval':False,'independentReview':False,'centralRasterAdmission':False,'externalReturnedHistoryIncluded':False},indent=2)+'\n')
print(json.dumps({'filesCompared':len(actual),'allEqual':True,'commands':commands},indent=2))
