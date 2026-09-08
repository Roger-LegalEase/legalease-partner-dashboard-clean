"""Verify only the retained juvenile candidate. Never rerender either earlier MN family.
Full CLI builds go to isolated destinations, and all existing family bytes are guarded.
Use --phase 1, --phase 2, then --phase verify in that order.
"""
from pathlib import Path
import argparse,hashlib,json,subprocess
R=Path(__file__).resolve().parents[3]
E=R/'data/rcap-grade-a/chat-parallel-2026-09-07/chat9-build/juvenile-publication-20260907'
E.mkdir(parents=True,exist_ok=True)
F='mn_petition_juvenile_as_adult-set'
D=R/'data/rcap-all50/overlays/census-v1/mn/mn-petition-juvenile-as-adult-set--official-pdf-fill'
WORK=R.parent/'chat9-juvenile-publication-renders'
sha=lambda b:hashlib.sha256(b).hexdigest()
def snap(d):return {str(p.relative_to(d)):sha(p.read_bytes())for p in sorted(d.rglob('*'))if p.is_file()}
def preserved():return {s:snap(R/'data/rcap-all50/overlays/census-v1'/s)for s in ['mi','mn']}
def save(name,data):(E/name).write_text(json.dumps(data,indent=2)+'\n')
def run(name,cmd):
 p=subprocess.run(cmd,cwd=R,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 (E/(name+'.log')).write_bytes(p.stdout)
 row={'command':cmd,'exitCode':p.returncode,'log':name+'.log','logSha256':sha(p.stdout)}
 save(name+'-command.json',row)
 if p.returncode:raise RuntimeError(str(row)+'\n'+p.stdout.decode(errors='replace')[-4000:])
 return row
p=argparse.ArgumentParser();p.add_argument('--phase',choices=['1','2','verify'],required=True);a=p.parse_args()
if a.phase in ['1','2']:
 before=preserved();expected=snap(D)
 if a.phase=='1':save('all-family-preservation-before.json',before)
 dest=WORK/('pass-'+a.phase)
 assert not dest.exists(),'refuse ambiguous pre-existing render destination'
 row=run('full-render-'+a.phase,['node','scripts/build-census-v1-'+F+'.mjs','--out',str(dest)])
 actual=snap(dest);assert actual==expected,'full juvenile build differs from retained candidate'
 assert preserved()==before,'a preserved family changed'
 save('pass-'+a.phase+'.json',{'command':row,'files':actual,'comparedToRetained':len(expected),'allIdentical':True})
 print(json.dumps({'phase':a.phase,'fullRendererExit':0,'filesMatchedToRetained':len(actual),'allPriorFamiliesUnchanged':True}))
else:
 before=json.loads((E/'all-family-preservation-before.json').read_text());assert preserved()==before
 first=json.loads((E/'pass-1.json').read_text());second=json.loads((E/'pass-2.json').read_text());assert first['files']==second['files']==snap(D)
 commands=[first['command'],second['command']]
 commands.append(run('node-tests',['node','--test','scripts/rcap-packet-recovery/chat9/test-mn-juvenile.mjs']))
 commands.append(run('completeness-importer',['node','scripts/rcap-packet-completeness/verify-packet-completeness.mjs','--family',F]))
 assert preserved()==before,'tests/importer changed retained outputs'
 inputs=[R/f'scripts/build-census-v1-{F}.mjs']
 inputs+=sorted((R/'scripts/rcap-packet-recovery/chat9').glob('mn*.mjs'))
 inputs+=[R/'scripts/rcap-packet-recovery/chat9/test-mn-juvenile.mjs',Path(__file__).resolve()]
 inputs+=sorted((R/'reference/chat-parallel-2026-09-07/chat9').glob('*'))
 report={'familyId':F,'fullRendererRuns':2,'all134FilesMatchedBothRunsAndRetainedCandidate':True,'earlierMinnesotaRendererCalls':0,'preservedMichiganFiles':len(before['mi']),'preservedMinnesotaFiles':len(before['mn']),'commands':commands,'outputs':second['files'],'inputs':{str(x.relative_to(R)):sha(x.read_bytes())for x in inputs if x.is_file()},'independentApproval':False,'repositoryInstallationAsserted':False}
 save('finish-verification.json',report);print(json.dumps({k:v for k,v in report.items()if k not in ['commands','outputs','inputs']}))
