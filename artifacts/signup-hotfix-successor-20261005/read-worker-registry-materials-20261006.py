import os,urllib.request,urllib.error,base64,json,pathlib,hashlib
out=pathlib.Path('/workspaces/legalease-partner-dashboard-clean/artifacts/signup-hotfix-successor-20261005/registry-materials-readback-20261006.json')
repo='roger-legalease/rcap-render-worker';report={'readOnly':True,'credentialPersisted':False,'imagesStarted':False}
def get(url,headers):
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=45) as r:return r.read()
try:
    credential=os.environ.get('GITHUB_TOKEN')
    if not credential:raise RuntimeError('existing GITHUB_TOKEN unavailable')
    basic=base64.b64encode(('x-access-token:'+credential).encode()).decode()
    auth=json.loads(get('https://ghcr.io/token?service=ghcr.io&scope=repository:'+repo+':pull',{'Authorization':'Basic '+basic}))['token']
    headers={'Authorization':'Bearer '+auth,'Accept':'application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.index.v1+json'}
    images={}
    for name,digest in [('predecessor','sha256:6b6a60fc5b2d0060028526013ce37c69f748e2cccb4cfb10943f2af6cf26cfe1'),('successor','sha256:be3d579fe808b8f0c806fed303f358edfe7a3bb6112866f4484d15ca7de4382a')]:
        raw=get('https://ghcr.io/v2/'+repo+'/manifests/'+digest,headers)
        assert 'sha256:'+hashlib.sha256(raw).hexdigest()==digest
        manifest=json.loads(raw)
        if 'manifests' in manifest:
            child=next(x for x in manifest['manifests'] if x.get('platform',{}).get('architecture')=='amd64')
            raw=get('https://ghcr.io/v2/'+repo+'/manifests/'+child['digest'],headers);assert 'sha256:'+hashlib.sha256(raw).hexdigest()==child['digest'];manifest=json.loads(raw)
        cfg=get('https://ghcr.io/v2/'+repo+'/blobs/'+manifest['config']['digest'],headers)
        assert 'sha256:'+hashlib.sha256(cfg).hexdigest()==manifest['config']['digest']
        config=json.loads(cfg)
        images[name]={'digest':digest,'configDigest':manifest['config']['digest'],'revision':config['config'].get('Labels',{}).get('org.opencontainers.image.revision'),'layerDigests':[x['digest'] for x in manifest['layers']],'rootfsDiffIds':config['rootfs']['diff_ids'],'nodeVersion':[x for x in config['config'].get('Env',[]) if x.startswith('NODE_VERSION=')],'manifestAndConfigAvailable':True}
    report['images']=images
    a=images['predecessor']['rootfsDiffIds'];b=images['successor']['rootfsDiffIds'];report['differentRootfsIndices']=[i for i in range(max(len(a),len(b))) if (a[i] if i<len(a) else None)!=(b[i] if i<len(b) else None)]
except urllib.error.HTTPError as e:report['accessError']={'operation':'Authenticated GHCR read-only token/manifest/config GET','httpStatus':e.code,'bodyNotRecorded':True}
except Exception as e:report['accessError']={'type':type(e).__name__,'message':str(e)[:200]}
out.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
