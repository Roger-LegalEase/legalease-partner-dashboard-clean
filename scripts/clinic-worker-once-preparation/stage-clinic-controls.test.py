import base64, hashlib, importlib.util, io, json, pathlib, tempfile, zipfile

spec = importlib.util.spec_from_file_location('stage_clinic', pathlib.Path(__file__).with_name('stage-clinic-controls.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
sha = 'a' * 40
files = {name + '.json': b'{"mock":true}' for name in sorted(module.NAMES)}
window = {'nativeControlRecords': {name: hashlib.sha256(files[name + '.json']).hexdigest() for name in module.NAMES}}
files['window.json'] = json.dumps(window).encode()
binding = {'schemaVersion': 'existing-clinic-worker-control-binding/v1', 'executionToolsSha': sha, 'windowFile': 'window.json', 'windowSha256': hashlib.sha256(files['window.json']).hexdigest(), 'nativeControlFiles': {name: name + '.json' for name in module.NAMES}}
files['binding.json'] = json.dumps(binding).encode()
expected = hashlib.sha256(files['binding.json']).hexdigest()

def archive(entries):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w') as z:
        for name, data in entries.items():
            z.writestr(name, data)
    return base64.b64encode(buffer.getvalue()).decode()

checks = 0
with tempfile.TemporaryDirectory(prefix='clinic-controls-test-', dir='/tmp') as root:
    staged = module.stage(archive(files), expected, root, sha)
    assert len(list(staged.iterdir())) == 7
    checks += 1
    assert all((p.stat().st_mode & 0o777) == 0o600 and p.read_bytes() == files[p.name] for p in staged.iterdir())
    checks += 1
for entries, pin, head in [(files, 'b' * 64, sha), (files, expected, 'b' * 40), ({**files, 'extra.json': b'{}'}, expected, sha), ({**files, 'window.json': b'{}'}, expected, sha), ({**files, '../escape.json': b'{}'}, expected, sha)]:
    with tempfile.TemporaryDirectory(prefix='clinic-controls-refusal-', dir='/tmp') as root:
        try:
            module.stage(archive(entries), pin, root, head)
        except (AssertionError, KeyError):
            assert not (pathlib.Path(root) / 'clinic-worker-input').exists()
            checks += 1
        else:
            raise AssertionError('malformed or mismatched controls were staged')
print(f'{checks} focused Clinic control ZIP/hash/head/permissions/path checks PASS; synthetic files only, no native custody asserted.')
