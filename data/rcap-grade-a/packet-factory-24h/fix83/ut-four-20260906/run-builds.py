from pathlib import Path
import os,subprocess,shutil,json,hashlib,time
os.sched_setaffinity(0,{min(os.sched_getaffinity(0))})
root=Path('/tmp/codex-fix83-20260906');scratch=Path('data/rcap-grade-a/packet-factory-24h/fix83/.tmp-build').resolve();scratch.mkdir(exist_ok=True)
env=os.environ.copy();env.update(MASTER_LIBRARY_SOURCE_DIR=str(root/'master-subset'),NODE_PATH='/tmp/fix91-tools/node_modules',UV_THREADPOOL_SIZE='1',VIPS_CONCURRENCY='1',TMPDIR=str(scratch))
families=['ut_pet_dismissed_with_prejudice-set','ut_pet_no_charges-set','ut_pet_limitations-set','ut_pet_dismissed_without_prejudice-set'];results=[]
for family in families:
 out=Path('data/rcap-all50/overlays/census-v1/ut')/(family.replace('_','-')+'--official-pdf-fill');before=root/'before'/family;before.mkdir(parents=True,exist_ok=True)
 for fix in ['canonical','boundary']:
  if not (before/f'{fix}.pdf').exists():shutil.copyfile(out/'fixtures'/f'{fix}.pdf',before/f'{fix}.pdf')
 for run in [1,2]:
  log=root/'builds'/f'{family}-{run}.log';start=time.time()
  with log.open('w') as f:r=subprocess.run(['node',f'scripts/build-census-v1-{family}.mjs'],env=env,stdout=f,stderr=subprocess.STDOUT)
  entry={'family':family,'run':run,'exitCode':r.returncode,'seconds':round(time.time()-start,2),'log':str(log)};results.append(entry);(root/'build-results.json').write_text(json.dumps(results,indent=2)+'\n')
  print(json.dumps(entry),flush=True)
  if r.returncode:raise SystemExit(r.returncode)
  hashes={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file()}
  (root/'builds'/f'{family}-{run}-hashes.json').write_text(json.dumps(hashes,indent=2)+'\n')
  if run==2:
   first=json.loads((root/'builds'/f'{family}-1-hashes.json').read_text());assert hashes==first,f'{family}: repeated build changed bytes'
print('All four families built twice byte-identically.',flush=True)
