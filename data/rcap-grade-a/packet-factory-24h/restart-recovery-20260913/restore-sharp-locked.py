"""Bounded checkpoint repair. Run from repository root with python3 this-file."""
import base64, hashlib, io, json, os, pathlib, subprocess, tarfile, tempfile, urllib.request
root=pathlib.Path.cwd(); target=(root/'node_modules').resolve()
assert str(target)=='/tmp/rcap-dependencies-after-ci-20260912/node_modules'
assert target.stat().st_dev != root.stat().st_dev and os.access(target,os.W_OK)
raw=(root/'package-lock.json').read_bytes()
assert raw==subprocess.check_output(['git','show','HEAD:package-lock.json'])
lock=json.loads(raw)['packages']
keys=['node_modules/sharp','node_modules/sharp/node_modules/semver','node_modules/@img/colour','node_modules/detect-libc','node_modules/@img/sharp-linux-x64','node_modules/@img/sharp-libvips-linux-x64']
assert subprocess.check_output(['node','-p','process.platform+"/"+process.arch+"/"+Boolean(process.report.getReport().header.glibcVersionRuntime)'],text=True).strip()=='linux/x64/true'
# Verify the prior pdf-lib packages too, without overwriting any existing bytes.
prior=json.loads((root/'data/rcap-grade-a/packet-factory-24h/restart-recovery-20260913/pdf-lib-restoration.json').read_text())
keys += [p['path'] for p in prior['packages']]
rows=[]
with tempfile.TemporaryDirectory(prefix='sharp-locked-',dir='/tmp') as scratch:
 for index,key in enumerate(keys):
  spec=lock[key]; data=urllib.request.urlopen(spec['resolved']).read()
  alg,digest=spec['integrity'].split('-',1)
  assert base64.b64encode(hashlib.new(alg,data).digest()).decode()==digest,key
  archive=pathlib.Path(scratch)/f'{index}.tgz';archive.write_bytes(data)
  dest=target.parent/key; exists=dest.exists()
  stage=pathlib.Path(scratch)/str(index);stage.mkdir(); files=0
  with tarfile.open(archive,'r:gz') as tf:
   for member in tf.getmembers():
    parts=pathlib.PurePosixPath(member.name).parts
    assert parts[0]=='package' and '..' not in parts and not member.issym() and not member.islnk(),member.name
    rel=pathlib.Path(*parts[1:]); out=stage/rel
    if member.isdir():out.mkdir(parents=True,exist_ok=True);continue
    assert member.isfile(),member.name
    b=tf.extractfile(member).read();out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(b);assert out.read_bytes()==b;out.chmod(member.mode & 0o777);files+=1
    if exists: assert (dest/rel).read_bytes()==b,f'Existing conflicting bytes: {dest/rel}'
  if not exists:
   dest.parent.mkdir(parents=True,exist_ok=True);stage.rename(dest)
  rows.append({'path':key,'version':spec['version'],'resolved':spec['resolved'],'expectedIntegrity':spec['integrity'],'archiveIntegrityVerified':True,'archiveBytes':len(data),'filesVerified':files,'status':'EXISTING_BYTES_VERIFIED' if exists else 'RESTORED'})
receipt={'lockfileSha256':hashlib.sha256(raw).hexdigest(),'lockfileCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'target':str(target),'platform':'linux/x64/glibc','packages':rows,'reproduce':'python3 data/rcap-grade-a/packet-factory-24h/restart-recovery-20260913/restore-sharp-locked.py','lifecycleScriptsRun':False}
(root/'data/rcap-grade-a/packet-factory-24h/restart-recovery-20260913/sharp-restoration.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
