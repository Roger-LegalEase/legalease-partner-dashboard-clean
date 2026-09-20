from pathlib import Path
import tempfile,subprocess,os,json,hashlib,shutil
repo=Path(subprocess.check_output(['git','rev-parse','--show-toplevel'],text=True).strip());scratch=Path(tempfile.mkdtemp(prefix='rcap-il-guard-'));(scratch/'scripts').mkdir();(scratch/'data/rcap-all50').mkdir(parents=True)
builder='scripts/build-census-v1-il-seal-edu-set.mjs'
for p in (repo/'scripts').iterdir():
 if p.name!=Path(builder).name:(scratch/'scripts'/p.name).symlink_to(p,target_is_directory=p.is_dir())
for p in (repo/'data').iterdir():
 if p.name!='rcap-all50':(scratch/'data'/p.name).symlink_to(p,target_is_directory=p.is_dir())
for p in (repo/'data/rcap-all50').iterdir():
 if p.name!='overlays':(scratch/'data/rcap-all50'/p.name).symlink_to(p,target_is_directory=p.is_dir())
for n in ['node_modules','private']:(scratch/n).symlink_to(repo/n,target_is_directory=True)
rel='data/rcap-all50/overlays/census-v1/il/il-seal-edu-set--official-pdf-fill';out=scratch/rel
current=(repo/builder).read_text();base='bad218e9fcd079ff90a2b266bf96644d0af38ca2';old=subprocess.check_output(['git','show',base+':'+builder],cwd=repo,text=True)
def mutation(s):
 needle='const beforeFiling = track.packetSet.requiredBeforeFiling.map((line) => `- ${line}`).join("\\n");';assert s.count(needle)==1;return s.replace(needle,'const beforeFiling = "";')
def hashes():return {str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob('*') if p.is_file()}
evidence=repo/'data/rcap-grade-a/packet-factory-24h/fixcxi1/il-evidence';evidence.mkdir(parents=True,exist_ok=True)
env=dict(os.environ,MASTER_LIBRARY_SOURCE_DIR='/workspaces/legalease-partner-dashboard-clean/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1');rows=[]
for name,s in [('original-late-guard',mutation(old)),('valid-plain',current),('fixed-guard',mutation(current))]:
 if out.exists():shutil.rmtree(out)
 shutil.copytree(repo/rel,out)
 (scratch/builder).write_text(s);before=hashes();r=subprocess.run(['node',builder],cwd=scratch,env=env,capture_output=True,text=True);(evidence/(name+'.log')).write_text(r.stdout+r.stderr);after=hashes();rows.append({'name':name,'command':'node '+builder,'exit':r.returncode,'changedFiles':[k for k in sorted(set(after)|set(before)) if after.get(k)!=before.get(k)],'before':before,'after':after});print(name,r.returncode,rows[-1]['changedFiles'],flush=True)
(evidence/'plain-entrypoint-proof.json').write_text(json.dumps({'base':base,'scratch':str(scratch),'mutation':'VF66 BREAK C: beforeFiling composition replaced with empty string; actual plain production command used','runs':rows},indent=2)+'\n')
assert rows[0]['exit']!=0 and 'participant-instructions.md' in rows[0]['changedFiles']
assert rows[1]['exit']==0 and not rows[1]['changedFiles']
assert rows[2]['exit']!=0 and not rows[2]['changedFiles']
assert 'requiredBeforeFiling must reach' in (evidence/'original-late-guard.log').read_text()
assert 'requiredBeforeFiling must reach' in (evidence/'fixed-guard.log').read_text()
shutil.rmtree(scratch)
print('PASS: original guard fails after replacing guidance; fixed guard fails before all writes; valid whole inventory identical')
