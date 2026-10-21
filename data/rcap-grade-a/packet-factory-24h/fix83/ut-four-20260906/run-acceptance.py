from pathlib import Path
import os,json,subprocess,time
os.sched_setaffinity(0,{min(os.sched_getaffinity(0))})
out=Path('/tmp/codex-fix83-20260906');env=os.environ.copy();env.update(MASTER_LIBRARY_SOURCE_DIR=str(out/'master-subset'),NODE_PATH='/tmp/fix91-tools/node_modules',UV_THREADPOOL_SIZE='1',VIPS_CONCURRENCY='1')
families=['ut_pet_dismissed_with_prejudice-set','ut_pet_no_charges-set','ut_pet_limitations-set','ut_pet_dismissed_without_prejudice-set'];results=[]
commands=[]
for family in families:
 for script in ['scripts/rcap-packet-completeness/verify-packet-completeness.mjs','scripts/rcap-official-forms/verify-source-carried-values-are-dispositioned.mjs','scripts/verify-packet-build-environment.mjs']:
  cmd=['node',script,'--family',family]
  if 'environment' in script:cmd+=['--branch','codex/fix83-ut-four-repair']
  commands.append(cmd)
commands.append(['node','scripts/rcap-packet-completeness/verify-identity-refresh-survives-rebuild.mjs','--against','f8ecf9321ccfaa50d6927515d70fc248fefd3d06'])
for i,cmd in enumerate(commands):
 log=out/'checks'/f'{i+1:02d}-{Path(cmd[1]).stem}.log';log.parent.mkdir(exist_ok=True)
 with log.open('w') as f:r=subprocess.run(cmd,env=env,stdout=f,stderr=subprocess.STDOUT)
 row={'command':cmd,'exitCode':r.returncode,'log':str(log)};results.append(row);print(json.dumps(row),flush=True)
 (out/'check-results.json').write_text(json.dumps(results,indent=2)+'\n')
