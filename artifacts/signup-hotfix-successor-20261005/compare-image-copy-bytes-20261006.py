import os,sys,urllib.request,base64,json,pathlib,hashlib,tarfile,io
root=pathlib.Path('/workspaces/legalease-partner-dashboard-clean/artifacts/signup-hotfix-successor-20261005')
r=json.loads((root/'registry-materials-readback-20261006.json').read_text());repo='roger-legalease/rcap-render-worker'
basic=base64.b64encode(('x-access-token:'+os.environ['GITHUB_TOKEN']).encode()).decode()
req=urllib.request.Request('https://ghcr.io/token?service=ghcr.io&scope=repository:'+repo+':pull',headers={'Authorization':'Basic '+basic})
with urllib.request.urlopen(req,timeout=45) as res:token=json.load(res)['token']
def layer(digest):
    req=urllib.request.Request('https://ghcr.io/v2/'+repo+'/blobs/'+digest,headers={'Authorization':'Bearer '+token})
    with urllib.request.urlopen(req,timeout=60) as res:raw=res.read()
    assert 'sha256:'+hashlib.sha256(raw).hexdigest()==digest
    entries={}
    with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as t:
        for m in t:
            h=hashlib.sha256(t.extractfile(m).read()).hexdigest() if m.isfile() else None
            entries[m.name]={'sha256':h,'mode':m.mode,'uid':m.uid,'gid':m.gid,'type':m.type.decode(),'linkname':m.linkname,'size':m.size}
    return entries
report={'readOnly':True,'imagesStarted':False,'credentialsPersisted':False,'normalization':'Compare file bytes, names, file types, permissions, UID/GID and link targets; ignore archive mtimes. Layer hashes verified against immutable registry manifests.', 'comparisons':{}}
subjects=[('layer_'+str(i),i) for i in [5,6,8,9,10]+list(range(12,31))] if '--other' in sys.argv else [('node_modules',7),('src',11)]
for name,index in subjects:
    a=layer(r['images']['predecessor']['layerDigests'][index]);b=layer(r['images']['successor']['layerDigests'][index])
    paths=sorted(k for k in set(a)|set(b) if a.get(k)!=b.get(k))
    report['comparisons'][name]={'layerIndex':index,'entryCountBefore':len(a),'entryCountAfter':len(b),'samplePaths':list(a)[:3],'changedPaths':paths,'beforeNormalizedSha256':hashlib.sha256(json.dumps(a,sort_keys=True).encode()).hexdigest(),'afterNormalizedSha256':hashlib.sha256(json.dumps(b,sort_keys=True).encode()).hexdigest()}
file='image-other-copy-byte-comparison-20261006.json' if '--other' in sys.argv else 'image-copy-byte-comparison-20261006.json'
(root/file).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:{'entries':v['entryCountAfter'],'changedPaths':v['changedPaths']} for k,v in report['comparisons'].items()},indent=2))
