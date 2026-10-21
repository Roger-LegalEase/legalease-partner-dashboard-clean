"""Two actual full renders per Michigan family; all-file comparison.
--phase 1, then 2, then verify permits bounded tool invocations without losing
exit codes or first-pass hashes. No Minnesota renderer is called.
"""
from pathlib import Path
import argparse,hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[3]
E=ROOT/'data/rcap-grade-a/chat-parallel-2026-09-07/chat9-build/mi-correction-20260907'
E.mkdir(parents=True,exist_ok=True)
FAMILIES=['mi_setaside_application-set','mi_setaside_first_owi-set']
DIRS=[ROOT/f'data/rcap-all50/overlays/census-v1/mi/{id.replace("_","-")}--official-pdf-fill'for id in FAMILIES]
MN=ROOT/'data/rcap-all50/overlays/census-v1/mn'
sha=lambda b:hashlib.sha256(b).hexdigest()
def snap(dirs):return {str(p.relative_to(ROOT)):sha(p.read_bytes())for d in dirs for p in sorted(d.rglob('*'))if p.is_file()}
def save(n,data):(E/n).write_text(json.dumps(data,indent=2)+'\n')
def run(args,label,commands):
 p=subprocess.run(args,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 f=E/(label+'.log');f.write_bytes(p.stdout)
 commands.append({'command':args,'exitCode':p.returncode,'log':str(f.relative_to(ROOT)),'logSha256':sha(p.stdout)})
 save('last-command.json',commands[-1])
 if p.returncode:raise RuntimeError(f'{label} exit {p.returncode}; inspect {f}')
def build(passno):
 commands=[]
 before=snap([MN])
 if passno==1:save('mn-preservation-before.json',before)
 for id in FAMILIES:run(['node',f'scripts/build-census-v1-{id}.mjs'],f'full-render-{passno}-{id}',commands)
 run(['python','scripts/rcap-packet-recovery/chat9/inspect-michigan.py','--out',str(E.relative_to(ROOT))],f'byte-proof-pass-{passno}',commands)
 assert snap([MN])==before,'Michigan correction changed Minnesota output bytes'
 save(f'pass-{passno}.json',{'commands':commands,'files':snap(DIRS),'minnesotaUnchangedFiles':len(before)})
 print(json.dumps({'pass':passno,'commandsExitCodes':[c['exitCode']for c in commands],'files':len(snap(DIRS))}))
def verify():
 a=json.loads((E/'pass-1.json').read_text());b=json.loads((E/'pass-2.json').read_text())
 assert a['files']==b['files'],'two full renderer passes differ'
 assert b['files']==snap(DIRS),'outputs changed after second measured pass'
 commands=a['commands']+b['commands']
 run(['node','--test','scripts/rcap-packet-recovery/chat9/test-michigan.mjs'],'michigan-tests',commands)
 for id in FAMILIES:run(['node','scripts/rcap-packet-completeness/verify-packet-completeness.mjs','--family',id],f'importer-{id}',commands)
 assert snap(DIRS)==b['files'],'test/importer mutated packet outputs'
 mn=json.loads((E/'mn-preservation-before.json').read_text());assert snap([MN])==mn
 inputpaths=[ROOT/'package-lock.json',ROOT/'reference/chat-parallel-2026-09-07/chat9/mc227.pdf']
 inputpaths+=list((ROOT/'scripts/rcap-packet-recovery/chat9').glob('*.mjs'))
 inputpaths+=list((ROOT/'scripts/rcap-official-forms').glob('*.mjs'))
 inputpaths+=list((ROOT/'scripts/rcap-packet-completeness').glob('*.mjs'))
 inputpaths+=[ROOT/'scripts/rcap-hard-form-xfa-shadow-fill.mjs']
 result={'fullRendererRuns':4,'postRenderByteProofRuns':2,'comparedFamilyFiles':len(a['files']),'changed':{},'allFilesIdentical':True,'commands':commands,'firstRunFiles':a['files'],'secondRunFiles':b['files'],'inputSha256':{str(p.relative_to(ROOT)):sha(p.read_bytes())for p in sorted(inputpaths)},'minnesotaUnchangedFiles':len(mn),'notIndependentApproval':True,'centralRasterPending':True}
 save('repeat-build-proof.json',result)
 print(json.dumps({'fullRendererRuns':4,'comparedFamilyFiles':len(a['files']),'allFilesIdentical':True,'minnesotaUnchangedFiles':len(mn),'commandsExitCodes':[x['exitCode']for x in commands]}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--phase',choices=['1','2','verify','all'],default='all');args=p.parse_args()
 if args.phase in ['1','all']:build(1)
 if args.phase in ['2','all']:build(2)
 if args.phase in ['verify','all']:verify()
