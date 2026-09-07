"""Run BOTH full renderers twice and compare EVERY file in the owned MI dirs."""
from pathlib import Path
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[3]
E=ROOT/'data/rcap-grade-a/chat-parallel-2026-09-07/chat9-build'
E.mkdir(parents=True,exist_ok=True)
FAMILIES=['mi_setaside_application-set','mi_setaside_first_owi-set']
DIRS=[ROOT/f'data/rcap-all50/overlays/census-v1/mi/{id.replace("_","-")}--official-pdf-fill'for id in FAMILIES]
sha=lambda b:hashlib.sha256(b).hexdigest()
commands=[]
def run(args,label):
 p=subprocess.run(args,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 f=E/(label+'.log');f.write_bytes(p.stdout)
 commands.append({'command':args,'exitCode':p.returncode,'log':str(f.relative_to(ROOT)),'logSha256':sha(p.stdout)})
 if p.returncode:raise RuntimeError(f'{label} exit {p.returncode}; inspect {f}')
def snapshot():
 return {str(p.relative_to(ROOT)):sha(p.read_bytes())for d in DIRS for p in sorted(d.rglob('*'))if p.is_file()}
shots=[]
for passno in [1,2]:
 for id in FAMILIES:run(['node',f'scripts/build-census-v1-{id}.mjs'],f'full-render-{passno}-{id}')
 run(['python','scripts/rcap-packet-recovery/chat9/inspect-michigan.py'],f'byte-proof-pass-{passno}')
 shots.append(snapshot())
changed={p:{'first':shots[0].get(p),'second':shots[1].get(p)} for p in sorted(set(shots[0])|set(shots[1]))if shots[0].get(p)!=shots[1].get(p)}
run(['node','--test','scripts/rcap-packet-recovery/chat9/test-michigan.mjs'],'michigan-tests')
for id in FAMILIES:run(['node','scripts/rcap-packet-completeness/verify-packet-completeness.mjs','--family',id],f'importer-{id}')
result={'fullRendererRuns':4,'postRenderByteProofRuns':2,'comparedFamilyFiles':len(shots[0]),'changed':changed,'allFilesIdentical':not changed,'commands':commands,'firstRunFiles':shots[0],'secondRunFiles':shots[1],'notIndependentApproval':True,'centralRasterPending':True}
(E/'repeat-build-proof.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'fullRendererRuns':4,'comparedFamilyFiles':len(shots[0]),'allFilesIdentical':not changed,'commandsExitCodes':[x['exitCode']for x in commands]}))
raise SystemExit(bool(changed))
