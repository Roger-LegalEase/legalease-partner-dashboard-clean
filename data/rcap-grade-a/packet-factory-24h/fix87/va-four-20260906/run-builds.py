import os,subprocess,json,pathlib,sys,time,hashlib
os.sched_setaffinity(0,{min(os.sched_getaffinity(0))})
scratch=pathlib.Path('/tmp/codex-fix87-20260906'); mode=sys.argv[1];env=os.environ.copy();env.update(MASTER_LIBRARY_SOURCE_DIR=str(scratch/'master-subset'),NODE_PATH='/tmp/fix91-tools/node_modules',RCAP_CHROMIUM_PATH='/home/codespace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome')
families=[x+'-set' for x in json.load(open(scratch/'current-requirements.json'))];families=[f for f in families if not os.environ.get('FIX87_BUILD_FAMILIES') or f in os.environ['FIX87_BUILD_FAMILIES'].split(',')];results=[]
for family in families:
 cmd=['node','--stack-size=8192','scripts/build-census-v1-va_seal_petition_misdemeanor-set.mjs',family]+(['--'+mode] if mode in ['check','no-raster'] else [])
 host_sha=hashlib.sha256(pathlib.Path('scripts/build-census-v1-va_seal_petition_misdemeanor-set.mjs').read_bytes()).hexdigest();start=time.time();p=subprocess.run(cmd,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True);stem=scratch/(mode+'-'+family);stem.with_suffix('.stdout').write_text(p.stdout);stem.with_suffix('.stderr').write_text(p.stderr)
 try:r=json.loads(p.stdout)
 except Exception:r={'status':'INVALID_RESULT','stdout':p.stdout[-400:],'stderr':p.stderr[-1200:]}
 row={'hostSha256':host_sha,'familyId':family,'command':cmd,'exitCode':p.returncode,'seconds':round(time.time()-start,2),'result':r};results.append(row);print(json.dumps(row),flush=True)
 if p.returncode!=0 or r.get('status') not in ['CHECK_ONLY','COMPLETED']:break
(scratch/(mode+'-results.json')).write_text(json.dumps(results,indent=2)+'\n')
if len(results)!=len(families) or any(x['exitCode'] or x['result']['status'] not in ['CHECK_ONLY','COMPLETED'] for x in results):sys.exit(1)
if mode not in ['check','no-raster']:
 hashes={}
 for family in families:
  d=pathlib.Path('data/rcap-all50/overlays/census-v1/va')/(family.replace('_','-')+'--official-pdf-fill')
  for f in d.rglob('*'):
   if f.is_file():hashes[str(f)]=hashlib.sha256(f.read_bytes()).hexdigest()
 (scratch/(mode+'-sha256.json')).write_text(json.dumps(hashes,indent=2)+'\n')
