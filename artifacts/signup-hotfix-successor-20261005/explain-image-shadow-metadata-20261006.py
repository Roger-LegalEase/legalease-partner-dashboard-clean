import os,urllib.request,base64,json,pathlib,hashlib,tarfile,io
root=pathlib.Path('/workspaces/legalease-partner-dashboard-clean/artifacts/signup-hotfix-successor-20261005');r=json.loads((root/'registry-materials-readback-20261006.json').read_text());repo='roger-legalease/rcap-render-worker'
basic=base64.b64encode(('x-access-token:'+os.environ['GITHUB_TOKEN']).encode()).decode()
with urllib.request.urlopen(urllib.request.Request('https://ghcr.io/token?service=ghcr.io&scope=repository:'+repo+':pull',headers={'Authorization':'Basic '+basic}),timeout=45) as res:token=json.load(res)['token']
rows=[]
for name in ['predecessor','successor']:
    digest=r['images'][name]['layerDigests'][6]
    with urllib.request.urlopen(urllib.request.Request('https://ghcr.io/v2/'+repo+'/blobs/'+digest,headers={'Authorization':'Bearer '+token}),timeout=45) as res:b=res.read()
    assert 'sha256:'+hashlib.sha256(b).hexdigest()==digest
    with tarfile.open(fileobj=io.BytesIO(b),mode='r:gz') as t:rows.append({x.split(':')[0]:x.split(':')[1:] for x in t.extractfile('etc/shadow').read().decode().splitlines()})
names=['passwordField','lastChangeDate','minimumAge','maximumAge','warningPeriod','inactivity','expiration','reserved']
changes=[{'account':k,'changedFields':[names[i] for i in range(len(rows[0][k])) if rows[0][k][i]!=rows[1][k][i]]} for k in rows[0] if rows[0][k]!=rows[1][k]]
assert changes==[{'account':'rcapworker','changedFields':['lastChangeDate']}]
report={'readOnly':True,'passwordValuesRecorded':False,'changedFields':changes,'finding':'Only rcapworker last-change-date metadata from the unchanged useradd build step differs; password field, UID/GID-related COPY metadata and remaining shadow fields are unchanged. This is not a dependency upgrade or production secret/configuration change.'}
(root/'image-shadow-metadata-20261006.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
