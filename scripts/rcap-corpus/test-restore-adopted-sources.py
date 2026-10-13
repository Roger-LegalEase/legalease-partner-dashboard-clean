import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import urllib.request
import zipfile

spec = importlib.util.spec_from_file_location("restore", Path(__file__).with_name("restore-adopted-sources.py"))
restore = importlib.util.module_from_spec(spec)
spec.loader.exec_module(restore)


def pin(data):
    return {"byteLength": len(data), "sha256": hashlib.sha256(data).hexdigest()}


class RestorationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        (self.root / ".gitignore").write_text("private/\n")

    def write(self, relative, data):
        target = self.root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)

    def fixture(self):
        records = []
        for i in range(22):
            data = f"synthetic source {i}".encode()
            relative = f"private/source-{i}.pdf"
            records.append({"sourceId": str(i), "heldCorpusPath": relative, **pin(data)})
            self.write(relative, data)
        self.write(restore.ADOPTION, json.dumps({"schemaVersion": "rcap-source-custody-adoption/v1", "sources": records}).encode())
        self.write(restore.AZ_ADOPTION, json.dumps({"schemaVersion": "rcap-source-custody-adoption/v1", "sources": [records[0], records[0]]}).encode())
        self.write(restore.CUSTODY, b'{"bundle": {"fileName":"original.zip"}}')
        return records

    def test_length_and_hash_are_independent_guards(self):
        with self.assertRaisesRegex(restore.Refused, "length"):
            restore.verify(b"short", pin(b"original"))
        with self.assertRaisesRegex(restore.Refused, "SHA-256"):
            restore.verify(b"tampered", pin(b"original"))

    def test_path_traversal_and_symlink_refused(self):
        for name in ["../outside.pdf", "/outside.pdf", "private/../outside.pdf", "private\\file.pdf"]:
            with self.assertRaises(restore.Refused):
                restore.safe_target(self.root, name)
        (self.root / "private").symlink_to(self.root.parent, target_is_directory=True)
        with self.assertRaises(restore.Refused):
            restore.safe_target(self.root, "private/source.pdf")

    def test_only_ignored_untracked_private_destinations(self):
        for name in ["reference/missing.pdf", "public/source.pdf"]:
            with self.assertRaises(restore.Refused):
                restore.writable_private_target(self.root, name)
        self.write("private/tracked.pdf", b"synthetic")
        subprocess.run(["git", "add", "-f", "private/tracked.pdf"], cwd=self.root, check=True)
        with self.assertRaises(restore.Refused):
            restore.writable_private_target(self.root, "private/tracked.pdf")
        self.assertEqual(restore.writable_private_target(self.root, "private/new.pdf"), self.root / "private/new.pdf")

    def test_idempotent_exact_check(self):
        self.fixture()
        first = restore.restore(self.root, check_only=True)
        second = restore.restore(self.root, check_only=True)
        self.assertEqual(first, second)
        self.assertEqual(first["status"], "PASS")
        self.assertEqual(first["installedFiles"], 0)
        self.assertEqual(len(first["sources"]), 24)

    def test_existing_mismatch_never_overwritten(self):
        self.fixture()
        self.write("private/source-4.pdf", b"original bytes to preserve")
        result = restore.restore(self.root)
        self.assertEqual(result["status"], "REFUSED")
        self.assertEqual((self.root / "private/source-4.pdf").read_bytes(), b"original bytes to preserve")

    def test_missing_tracked_source_not_retrieved(self):
        records = self.fixture()
        records[1]["heldCorpusPath"] = "reference/missing.pdf"
        self.write(restore.ADOPTION, json.dumps({"schemaVersion": "rcap-source-custody-adoption/v1", "sources": records}).encode())
        with patch.object(restore, "download", side_effect=AssertionError("network should not run")):
            result = restore.restore(self.root)
        self.assertEqual(result["status"], "REFUSED")

    def test_all_verified_before_install(self):
        records = self.fixture()
        for index in [1, 2]:
            (self.root / records[index]["heldCorpusPath"]).unlink()
            records[index]["officialUrl"] = f"https://example.test/{index}"
        self.write(restore.ADOPTION, json.dumps({"schemaVersion": "rcap-source-custody-adoption/v1", "sources": records}).encode())
        with patch.object(restore, "download", side_effect=[b"synthetic source 1", b"wrong bytes"]):
            result = restore.restore(self.root)
        self.assertEqual(result["status"], "REFUSED")
        self.assertEqual(result["installedFiles"], 0)
        self.assertFalse((self.root / records[1]["heldCorpusPath"]).exists())
        with patch.object(restore, "download", side_effect=[b"synthetic source 1", b"synthetic source 2"]):
            result = restore.restore(self.root)
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["installedFiles"], 2)

    def test_zip_requires_archive_and_member_pins(self):
        body = io.BytesIO()
        with zipfile.ZipFile(body, "w") as archive:
            archive.writestr("original.pdf", b"synthetic original")
        data = body.getvalue()
        custody = {"bundle": pin(data), "files": [{"name": "original.pdf", **pin(b"synthetic original")}]}
        self.assertEqual(list(restore.read_bundle(data, custody).values()), [b"synthetic original"])
        with self.assertRaises(restore.Refused):
            restore.read_bundle(data + b"changed", custody)
        custody["files"][0].update(pin(b"wrong same length"))
        with self.assertRaises(restore.Refused):
            restore.read_bundle(data, custody)

    def test_unsafe_zip_members_refused(self):
        body = io.BytesIO()
        with zipfile.ZipFile(body, "w") as archive:
            archive.writestr("../escape.pdf", b"synthetic")
        data = body.getvalue()
        with self.assertRaises(restore.Refused):
            restore.read_bundle(data, {"bundle": pin(data), "files": []})

    def test_credentials_never_forwarded_to_asset_host(self):
        req = urllib.request.Request("https://api.github.com/repos/private/release", headers={"Authorization": "Bearer synthetic-test-token"})
        redirected = restore.SafeRedirect().redirect_request(req, None, 302, "", {}, "https://release-assets.githubusercontent.com/source")
        self.assertFalse(redirected.has_header("Authorization"))
        with self.assertRaises(restore.Refused):
            restore.SafeRedirect().redirect_request(req, None, 302, "", {}, "http://example.test/source")
        with self.assertRaises(restore.Refused):
            restore.download("https://example.test/source", 100, token="synthetic-test-token")

    def test_private_mirror_must_be_private_and_pinned(self):
        with patch.dict(restore.os.environ, {"GH_TOKEN": "synthetic-test-token", "SOURCE_ADOPTION_BUNDLE_REPOSITORY": "synthetic/private", "SOURCE_ADOPTION_BUNDLE_RELEASE_TAG": "original"}):
            with patch.object(restore, "download", return_value=b'{"private":false}'):
                with self.assertRaisesRegex(restore.Refused, "not private"):
                    restore.private_bundle({"bundle": {}})
            with patch.object(restore, "download", side_effect=[b'{"private":true}', b'{"assets":[]}']):
                with self.assertRaisesRegex(restore.Refused, "mirror missing"):
                    restore.private_bundle({"bundle": {"fileName": "original.zip", "byteLength": 20}})

    def test_unconfigured_or_invalid_custody_locator_never_contacts_network(self):
        with patch.dict(restore.os.environ, {}, clear=True), patch.object(restore, "download", side_effect=AssertionError("network should not run")):
            with self.assertRaisesRegex(restore.Refused, "transport not configured"):
                restore.private_bundle({"bundle": {}})
            restore.os.environ.update(SOURCE_ADOPTION_BUNDLE_REPOSITORY="owner/repo/../other", SOURCE_ADOPTION_BUNDLE_RELEASE_TAG="tag")
            with self.assertRaisesRegex(restore.Refused, "invalid private"):
                restore.private_bundle({"bundle": {}})


if __name__ == "__main__":
    unittest.main()
