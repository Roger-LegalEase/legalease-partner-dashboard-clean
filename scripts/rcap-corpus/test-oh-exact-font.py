"""Bounded restoration tests; positives require the real pinned upstream package."""
import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('oh', Path(__file__).with_name('restore-oh-exact-font.py'))
oh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(oh)
parser = argparse.ArgumentParser()
parser.add_argument('--package', type=Path, default=oh.ROOT / oh.PREFIX / 'arial32.exe')
args, remaining = parser.parse_known_args()
# Missing originals fail the suite, rather than skipping its positive tests.
_, PACKAGE, FONT = oh.records(oh.ROOT)
ORIGINAL = oh.exact.verify(args.package.read_bytes(), PACKAGE)
FONT_BYTES = oh.exact.verify(oh.extract_font(ORIGINAL), FONT)


class OhFontTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='oh-font-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(['git', 'init', '-q', str(self.root)], check=True)
        (self.root / '.gitignore').write_text('private/\n')
        for name in [oh.CUSTODY, oh.RECEIPT]:
            self.write(name, (oh.ROOT / name).read_bytes())
        self.original = self.root / 'original.exe'
        self.original.write_bytes(ORIGINAL)

    def write(self, name, raw):
        target = self.root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(raw)
        return target

    def restore(self):
        return oh.restore(self.root, self.original)

    def untouched(self):
        self.assertFalse((self.root / FONT['path']).exists())
        self.assertFalse((self.root / PACKAGE['path']).exists())

    def test_exact_original_install_and_idempotence(self):
        result = self.restore()
        self.assertEqual(result['installedFiles'], 2)
        self.assertEqual((self.root / FONT['path']).read_bytes(), FONT_BYTES)
        self.assertEqual((self.root / PACKAGE['path']).read_bytes(), ORIGINAL)
        self.assertEqual(oh.restore(self.root)['installedFiles'], 0)
        self.assertFalse(result['commercialAuthorityChanged'])
        self.assertFalse(result['renderedOutputsChanged'])
        self.assertEqual((self.root / FONT['path']).stat().st_mode & 0o777, 0o600)

    def test_upstream_exact_original(self):
        with patch.object(oh.exact, 'download', return_value=ORIGINAL) as fetch:
            self.assertEqual(oh.restore(self.root)['installedFiles'], 2)
            self.assertEqual(fetch.call_count, 1)

    def test_recorded_second_url_fallback_requires_original(self):
        with patch.object(oh.exact, 'download', side_effect=[oh.exact.Refused('unavailable'), ORIGINAL]) as fetch:
            self.assertEqual(oh.restore(self.root)['installedFiles'], 2)
            self.assertEqual(fetch.call_count, 2)

    def test_missing_package(self):
        self.original.unlink()
        with self.assertRaises(FileNotFoundError): self.restore()
        self.untouched()

    def test_package_wrong_length_refused_before_extraction(self):
        self.original.write_bytes(ORIGINAL[:-1])
        with patch.object(oh, 'extract_font') as extract:
            with self.assertRaisesRegex(oh.exact.Refused, 'length mismatch'): self.restore()
            extract.assert_not_called()
        self.untouched()

    def test_package_wrong_hash_refused_before_extraction(self):
        self.original.write_bytes(bytes([ORIGINAL[0] ^ 1]) + ORIGINAL[1:])
        with patch.object(oh, 'extract_font') as extract:
            with self.assertRaisesRegex(oh.exact.Refused, 'SHA-256 mismatch'): self.restore()
            extract.assert_not_called()
        self.untouched()

    def test_upstream_missing_or_different_original_refused(self):
        for effect in [oh.exact.Refused('unavailable'), b'not original']:
            with patch.object(oh.exact, 'download', side_effect=effect if isinstance(effect, Exception) else None,
                              return_value=effect):
                with self.assertRaisesRegex(oh.exact.Refused, 'original package unavailable'): oh.restore(self.root)
            self.untouched()

    def test_font_missing_or_wrong_length(self):
        for raw in [b'', FONT_BYTES[:-1]]:
            with patch.object(oh, 'extract_font', return_value=raw):
                with self.assertRaisesRegex(oh.exact.Refused, 'length mismatch'): self.restore()
            self.untouched()

    def test_font_wrong_hash(self):
        with patch.object(oh, 'extract_font', return_value=bytes([FONT_BYTES[0] ^ 1]) + FONT_BYTES[1:]):
            with self.assertRaisesRegex(oh.exact.Refused, 'SHA-256 mismatch'): self.restore()
        self.untouched()

    def test_existing_font_never_overwritten(self):
        target = self.write(FONT['path'], b'preserve existing')
        with self.assertRaises(oh.exact.Refused): self.restore()
        self.assertEqual(target.read_bytes(), b'preserve existing')
        self.assertFalse((self.root / PACKAGE['path']).exists())

    def test_existing_package_never_overwritten(self):
        target = self.write(PACKAGE['path'], b'preserve package')
        with self.assertRaises(oh.exact.Refused): self.restore()
        self.assertEqual(target.read_bytes(), b'preserve package')
        self.assertFalse((self.root / FONT['path']).exists())

    def test_original_receipts_cannot_be_changed(self):
        for name in [oh.CUSTODY, oh.RECEIPT]:
            original = (self.root / name).read_bytes()
            self.write(name, original + b' ')
            with self.assertRaisesRegex(oh.exact.Refused, 'original OH record changed'): self.restore()
            self.untouched()
            self.write(name, original)

    def test_symlink_refused(self):
        (self.root / 'private').symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(oh.exact.Refused, 'symlink'): self.restore()

    def test_unignored_private_path_refused(self):
        (self.root / '.gitignore').write_text('')
        with self.assertRaisesRegex(oh.exact.Refused, 'not ignored'): self.restore()
        self.untouched()

    def test_tracked_private_file_refused(self):
        self.write(FONT['path'], FONT_BYTES)
        subprocess.run(['git', 'add', '-f', '--', FONT['path']], cwd=self.root, check=True)
        with self.assertRaisesRegex(oh.exact.Refused, 'tracked'): self.restore()
        self.assertEqual((self.root / FONT['path']).read_bytes(), FONT_BYTES)


if __name__ == '__main__':
    unittest.main(argv=['test-oh-exact-font.py', *remaining])
