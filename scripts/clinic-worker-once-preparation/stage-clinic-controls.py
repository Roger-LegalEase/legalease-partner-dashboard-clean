import base64, hashlib, io, json, os, pathlib, re, zipfile

NAMES = {'captainLeaseAndOperationLog', 'activeQueuedReleaseOperations', 'knownQaProducerContexts', 'knownAcceptanceConsumers', 'globalAllKindPreRetargetSnapshot'}

def stage(archive_b64, expected_hash, workspace, execution_sha):
    assert re.fullmatch(r'[a-f0-9]{64}', expected_hash)
    assert re.fullmatch(r'[a-f0-9]{40}', execution_sha)
    raw = base64.b64decode(archive_b64, validate=True)
    assert 0 < len(raw) <= 8 * 1024 * 1024
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        assert len(z.infolist()) == 7 and len(set(z.namelist())) == 7
        assert all(re.fullmatch(r'[A-Za-z0-9_-]+\.json', name) for name in z.namelist())
        assert all(0 < entry.file_size <= 2 * 1024 * 1024 for entry in z.infolist())
        files = {name: z.read(name) for name in z.namelist()}
    assert hashlib.sha256(files['binding.json']).hexdigest() == expected_hash
    binding = json.loads(files['binding.json'])
    assert binding['schemaVersion'] == 'existing-clinic-worker-control-binding/v1'
    assert binding['executionToolsSha'] == execution_sha
    assert set(binding['nativeControlFiles']) == NAMES
    assert set(files) == {'binding.json', binding['windowFile'], *binding['nativeControlFiles'].values()}
    assert hashlib.sha256(files[binding['windowFile']]).hexdigest() == binding['windowSha256']
    window = json.loads(files[binding['windowFile']])
    for key, name in binding['nativeControlFiles'].items():
        assert hashlib.sha256(files[name]).hexdigest() == window['nativeControlRecords'][key]
    root = pathlib.Path(workspace).resolve() / 'clinic-worker-input'
    root.mkdir(mode=0o700)
    for name, contents in files.items():
        fd = os.open(root / name, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'wb') as stream:
            os.fchmod(stream.fileno(), 0o600)
            stream.write(contents)
            stream.flush()
            os.fsync(stream.fileno())
    return root

if __name__ == '__main__':
    try:
        assert os.environ['GITHUB_ACTIONS'] == 'true'
        stage(os.environ['CLINIC_WORKER_CONTROL_ARCHIVE_B64'], os.environ['CLINIC_WORKER_CONTROL_BINDING_SHA256'], os.environ['GITHUB_WORKSPACE'], os.environ['GITHUB_SHA'])
        print('Exact Clinic control binding and five native controls staged privately.')
    except Exception:
        raise SystemExit('Clinic control staging held; no credential or customer operation performed.')
