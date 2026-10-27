# Existing private GitHub archive custody; exact metadata only, no credentials or answers.
import base64,hashlib,io,json,os,pathlib,re,zipfile

def stage(raw,expected,workspace,head):
    assert re.fullmatch('[a-f0-9]{64}',expected or '')
    root=pathlib.Path(workspace)/'ordinary-full-input'
    assert root.is_absolute() and not root.exists()
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        names=z.namelist()
        assert len(names)==len(set(names)) and 1<=len(names)<=20
        assert all(re.fullmatch(r'[a-z0-9.-]+\.json',n) for n in names)
        assert sum(i.file_size for i in z.infolist())<=8*1024*1024
        assert all(0<i.file_size<=2*1024*1024 and not(i.flag_bits&1) for i in z.infolist())
        files={name:z.read(name) for name in names}
    assert hashlib.sha256(files['binding.json']).hexdigest()==expected
    b=json.loads(files['binding.json']);assert b['schemaVersion']=='ordinary-full-control-binding/v1' and b['executionToolsSha']==head
    assert set(files)=={'binding.json',*b['filePins']}
    for name,pin in b['filePins'].items():
        assert re.fullmatch('[a-f0-9]{64}',pin) and hashlib.sha256(files[name]).hexdigest()==pin
    root.mkdir(mode=0o700);root.chmod(0o700)
    for name,data in files.items():
        fd=os.open(root/name,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'wb') as f:f.write(data);f.flush();os.fsync(f.fileno())
    fd=os.open(root,os.O_RDONLY)
    try:os.fsync(fd)
    finally:os.close(fd)
if __name__=='__main__':
    stage(base64.b64decode(os.environ['ORDINARY_FULL_INPUT_ARCHIVE_B64'],validate=True),os.environ['ORDINARY_FULL_CONTROL_BINDING_SHA256'],os.environ['GITHUB_WORKSPACE'],os.environ['GITHUB_SHA'])
