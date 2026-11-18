import tarfile, json, hashlib, pathlib
root=pathlib.Path(__file__).parent
raw=(root/'native-dockerbuild').read_bytes()
assert hashlib.sha256(raw).hexdigest()=='c2484a448efcafe2e3ea6d556949b5e0e5f83b7e3bde0a5ac09801a1e8d33c8b'
with tarfile.open(root/'native-dockerbuild') as t:
    def blob(name):
        b=t.extractfile('blobs/sha256/'+name).read()
        assert hashlib.sha256(b).hexdigest()==name
        return json.loads(b)
    r=blob('2a19b627cbb87b7b63b203b6ed833e1857c43a22ab766eb176e406df4ca8511f')
    p=blob('a44fb9acecbd92b071bcd653386692170d0ddab2ed28545b992959b85b49abd0')
    image=blob('be3d579fe808b8f0c806fed303f358edfe7a3bb6112866f4484d15ca7de4382a')
    config=json.loads(r['ExporterResponse']['containerimage.config'])
    labels=config['config']['Labels']
    for key in ['org.opencontainers.image.revision','org.opencontainers.image.version']:
        assert labels[key]=='e3ac438da981c84987bd3172751e1a09e3f42309'
    report={'artifactId':11382917122,'nativeArchiveSha256':hashlib.sha256(raw).hexdigest(),'nativeBuildRef':r['Ref'],'resolvedDependencies':p['buildDefinition']['resolvedDependencies'],'imageConfigDigest':image['config']['digest'],'imageOciLabels':labels,'nodeVersion':[x for x in config['config']['Env'] if x.startswith('NODE_VERSION=')],'publicationRunId':37395051353,'historicalMaterialEquivalence':'UNKNOWN; unchanged Dockerfile/lockfile do not prove identical mutable materials','isolatedPullAndRuntimeAcceptance':'PENDING separate acceptance run'}
    (root/'materials-summary.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
