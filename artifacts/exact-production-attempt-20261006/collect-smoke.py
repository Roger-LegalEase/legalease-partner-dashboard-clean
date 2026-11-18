import os,json,pathlib,urllib.request,urllib.error,zipfile,io,hashlib
out=pathlib.Path('artifacts/exact-production-attempt-20261006/smoke-native');out.mkdir(exist_ok=True);runid=37474857779;base='https://api.github.com/repos/Roger-LegalEase/legalease-partner-dashboard-clean';headers={'Authorization':'Bearer '+os.environ['RCAP_ACTIONS_DISPATCH_TOKEN'],'Accept':'application/vnd.github+json'}
def get(p):return urllib.request.urlopen(urllib.request.Request(base+p,headers=headers),timeout=30).read()
def redirected(p):
 class NoRedirect(urllib.request.HTTPRedirectHandler):
  def redirect_request(self,*a):return None
 try:
  return urllib.request.build_opener(NoRedirect).open(urllib.request.Request(base+p,headers=headers),timeout=30).read()
 except urllib.error.HTTPError as e:
  if e.code!=302:raise
  return urllib.request.urlopen(e.headers['Location'],timeout=60).read()
run=json.loads(get('/actions/runs/'+str(runid)));jobs=json.loads(get('/actions/runs/'+str(runid)+'/jobs'));(out/'closure-run.json').write_text(json.dumps(run,indent=2));(out/'closure-jobs.json').write_text(json.dumps(jobs,indent=2));print({k:run[k] for k in ['id','status','conclusion']})
for j in jobs['jobs']:
 if j['conclusion']!='skipped':
  print({k:j[k] for k in ['id','status','conclusion']});print([(s['name'],s['status'],s['conclusion']) for s in j['steps']])
if run['status']=='completed':
 artifacts=json.loads(get('/actions/runs/'+str(runid)+'/artifacts'))['artifacts'];(out/'closure-artifacts.json').write_text(json.dumps(artifacts,indent=2));print([{k:a[k] for k in ['id','name','digest']} for a in artifacts])
 for a in artifacts:
  b=redirected('/actions/artifacts/'+str(a['id'])+'/zip');assert 'sha256:'+hashlib.sha256(b).hexdigest()==a['digest'];(out/'closure-native.zip').write_bytes(b);z=zipfile.ZipFile(io.BytesIO(b));assert all(not n.startswith('/') and '..' not in n.split('/') for n in z.namelist());z.extractall(out/'closure-native');(out/'closure-artifact.json').write_text(json.dumps(a,indent=2));
  for name in ['production-canary-smoke.json']:
   p=out/'closure-native'/name
   if p.exists():
    value=json.loads(p.read_text());print(name,{k:value[k] for k in ['passed','capturedAt','machine','id','readyState','applicationSha','workflowSourceSha','toolsSha','runId','workerRollbackVerified','queueSafetyVerified','productionAliasesUnchanged','productionWrites','finishedAt','passed','failure','transactionalFixtureRolledBack','productionDatabasePersistentlyMutated'] if k in value})
 if run['conclusion']!='success':
  for j in jobs['jobs']:
   if j['conclusion']!='skipped':
    b=redirected('/actions/jobs/'+str(j['id'])+'/logs');(out/'closure-native-job.log').write_bytes(b)
    lines=b.decode(errors='replace').splitlines();interesting=[s for s in lines if any(x in s for x in ['Error:','AssertionError','HTTP ','::error::','error:','Error ['])];print('\n'.join(interesting[-15:]))
