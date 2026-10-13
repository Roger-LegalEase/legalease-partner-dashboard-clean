import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('sc', Path(__file__).with_name('restore-sc-guidance-sources.py'))
sc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sc)


class ScRestorationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(['git', 'init', '-q', str(self.root)], check=True)
        (self.root / '.gitignore').write_text('private/\n')
        self.raw = b'synthetic source bytes'
        self.ref = {'path': sc.PREFIX + 'STATES/SC/02_PACKET_FORMS/original.pdf',
                    'byteLength': len(self.raw), 'sha256': hashlib.sha256(self.raw).hexdigest()}
        self.write(sc.MASTER + '/STATES/SC/02_PACKET_FORMS/original.pdf', self.raw)
        self.json(sc.ADMISSION, {'nested': {'bindings': [self.ref, self.ref]}})
        self.json(sc.INDEX, {'entries': [{**self.ref, 'path': 'STATES/SC/02_PACKET_FORMS/original.pdf', 'custody': 'master_library'}]})

    def write(self, name, raw):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)

    def json(self, name, value):
        self.write(name, json.dumps(value).encode())

    def test_master_restores_exact_destination_then_is_idempotent(self):
        first = sc.restore(self.root)
        self.assertEqual((first['privateBoundFiles'], first['installedFiles']), (1, 1))
        self.assertEqual((self.root / self.ref['path']).read_bytes(), self.raw)
        self.assertEqual(sc.restore(self.root)['installedFiles'], 0)
        self.assertFalse(first['commercialAuthorityChanged'])

    def test_alternate_local_original_requires_same_pin(self):
        local = self.root / 'owner.pdf'; local.write_bytes(self.raw)
        self.assertEqual(sc.restore(self.root, local)['installedFiles'], 1)

    def test_revision_or_length_mismatch_never_installs(self):
        for raw in [b'wrong', bytes([self.raw[0] ^ 1]) + self.raw[1:]]:
            self.write(sc.MASTER + '/STATES/SC/02_PACKET_FORMS/original.pdf', raw)
            with self.assertRaises(sc.exact.Refused): sc.restore(self.root)
            self.assertFalse((self.root / self.ref['path']).exists())

    def test_existing_mismatched_file_never_overwritten(self):
        self.write(self.ref['path'], b'preserve this local work')
        with self.assertRaises(sc.exact.Refused): sc.restore(self.root)
        self.assertEqual((self.root / self.ref['path']).read_bytes(), b'preserve this local work')

    def test_all_private_bindings_preflight_before_any_install(self):
        self.json(sc.ADMISSION, {'bindings': [self.ref, {**self.ref, 'path': 'private/unmapped/second.pdf'}]})
        with self.assertRaisesRegex(sc.exact.Refused, 'no approved restoration mapping'): sc.restore(self.root)
        self.assertFalse((self.root / self.ref['path']).exists())

    def test_corpus_index_disagreement_refused(self):
        self.json(sc.INDEX, {'entries': []})
        with self.assertRaisesRegex(sc.exact.Refused, 'pins disagree'): sc.restore(self.root)

    def test_conflicting_or_traversing_binding_refused(self):
        for refs in [[self.ref, {**self.ref, 'sha256': '0' * 64}], [{**self.ref, 'path': '../outside.pdf'}]]:
            self.json(sc.ADMISSION, {'bindings': refs})
            with self.assertRaises(sc.exact.Refused): sc.restore(self.root)

    def test_bound_json_authenticated_before_traversal(self):
        self.write('receipt.json', b'{}')
        self.json(sc.ADMISSION, {'bindings': [self.ref, {'path': 'receipt.json', 'byteLength': 2, 'sha256': '0' * 64}]})
        with self.assertRaises(sc.exact.Refused): sc.restore(self.root)
        self.assertFalse((self.root / self.ref['path']).exists())

    def test_runtime_drift_remains_visible_and_never_rebound(self):
        self.write('consumer.ts', b'changed code')
        ref = {'path': 'consumer.ts', 'byteLength': 0, 'sha256': hashlib.sha256(b'').hexdigest()}
        self.json(sc.ADMISSION, {'bindings': [self.ref, ref]})
        result = sc.restore(self.root)
        self.assertEqual(result['otherBindings'][0]['status'], 'MISMATCH_OR_MISSING')
        self.assertEqual(result['admissionAcceptance'], 'NOT_GRANTED_BY_RESTORATION')
        self.assertEqual((self.root / 'consumer.ts').read_bytes(), b'changed code')

    def test_symlink_destination_refused(self):
        (self.root / 'private/transfers').symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(sc.exact.Refused): sc.restore(self.root)


if __name__ == '__main__': unittest.main()
