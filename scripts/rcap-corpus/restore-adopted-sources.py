#!/usr/bin/env python3
"""Restore exact adopted sources, never source updates or replacement PDFs.

Private upload bytes come only from the original checksum-pinned custody ZIP,
supplied locally or through an explicitly configured private release. Official downloads
are accepted only when BOTH length and SHA-256 match the adoption record.
Nothing is installed until every required source has been verified. Existing
files are verified, never overwritten. No private bytes or tokens are logged.
"""
import argparse
import hashlib
import io
import json
import os
import re
from pathlib import Path, PurePosixPath
import stat
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[2]
ADOPTION = "data/rcap-grade-a/source-wave-integration/SOURCE_USER_UPLOAD_ADOPTION_2026-09-11.json"
AZ_ADOPTION = "data/rcap-grade-a/source-wave-integration/SOURCE_AZ_R260001_ATTACHMENT_ADOPTION_2026-09-11.json"
CUSTODY = "data/rcap-grade-a/source-custody/user-upload-20260911/manifest.json"
OFFICIAL_URLS = {
    "official-form:JDF-613": "https://www.coloradojudicial.gov/sites/default/files/2024-08/JDF613.pdf",
    "official-form:JDF-492": "https://www.coloradojudicial.gov/sites/default/files/2024-08/JDF492.pdf",
}


class Refused(Exception):
    pass


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlsplit(newurl).scheme != "https":
            raise Refused("non-HTTPS redirect")
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected and urllib.parse.urlsplit(req.full_url).netloc != urllib.parse.urlsplit(newurl).netloc:
            redirected.remove_header("Authorization")
        return redirected


def download(url, limit, token=None, accept=None):
    if urllib.parse.urlsplit(url).scheme != "https":
        raise Refused("non-HTTPS download")
    if token and urllib.parse.urlsplit(url).netloc != "api.github.com":
        raise Refused("credentials may only be sent to the GitHub API")
    headers = {"User-Agent": "LegalEase-exact-source-restoration"}
    if token:
        headers["Authorization"] = "Bearer " + token
    if accept:
        headers["Accept"] = accept
    for attempt in range(3):
        try:
            with urllib.request.build_opener(SafeRedirect()).open(
                urllib.request.Request(url, headers=headers), timeout=90
            ) as response:
                data = response.read(limit + 1)
            break
        except urllib.error.HTTPError as error:
            # Actual ND court origin failures in CI: retry the same original
            # URL, never a replacement or changed identity. Integrity failures
            # and access denials are not retried.
            if error.code in (502, 503, 504, 521, 522) and attempt < 2:
                error.close()
                time.sleep(attempt + 1)
                continue
            raise Refused(f"HTTP {error.code}") from None
        except (urllib.error.URLError, TimeoutError):
            # URLs in transport exceptions can contain signed credentials.
            raise Refused("transport unavailable") from None
    if len(data) > limit:
        raise Refused("response exceeds pinned size limit")
    return data


def verify(data, record):
    if len(data) != record["byteLength"]:
        raise Refused(f"length mismatch: expected {record['byteLength']}, observed {len(data)}")
    observed = hashlib.sha256(data).hexdigest()
    if observed != record["sha256"]:
        raise Refused(f"SHA-256 mismatch: expected {record['sha256']}, observed {observed}")
    return data


def safe_target(root, relative):
    path = PurePosixPath(relative)
    if path.is_absolute() or ".." in path.parts or "\\" in relative or path.as_posix() != relative:
        raise Refused("invalid repository-relative source path")
    target = root / relative
    if not target.resolve().is_relative_to(root.resolve()):
        raise Refused("source path resolves outside repository")
    for parent in [target, *target.parents]:
        if parent == root:
            break
        if parent.is_symlink():
            raise Refused("symlink in source destination")
    return target


def writable_private_target(root, relative):
    target = safe_target(root, relative)
    if not relative.startswith("private/"):
        raise Refused("a missing tracked source must be restored from Git, not downloaded")
    ignored = subprocess.run(["git", "check-ignore", "-q", "--", relative], cwd=root).returncode == 0
    tracked = subprocess.check_output(["git", "ls-files", "--", relative], cwd=root)
    if not ignored or tracked:
        raise Refused("private destination is not ignored or is tracked by Git")
    return target


def read_bundle(data, custody):
    verify(data, custody["bundle"])
    expected = {row["name"]: row for row in custody["files"]}
    held = {}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        seen = set()
        for entry in archive.infolist():
            if entry.filename in seen:
                raise Refused("duplicate ZIP member")
            seen.add(entry.filename)
            p = PurePosixPath(entry.filename)
            if p.is_absolute() or ".." in p.parts or "\\" in entry.filename or stat.S_ISLNK(entry.external_attr >> 16):
                raise Refused("unsafe ZIP member")
        for name, row in expected.items():
            if name not in seen or archive.getinfo(name).file_size != row["byteLength"]:
                raise Refused("original custody ZIP member missing or length changed: " + name)
            held[row["sha256"]] = verify(archive.read(name), row)
    return held


def private_bundle(custody, local_zip=None):
    if local_zip:
        return read_bundle(Path(local_zip).read_bytes(), custody)
    repository = os.environ.get("SOURCE_ADOPTION_BUNDLE_REPOSITORY", "")
    tag = os.environ.get("SOURCE_ADOPTION_BUNDLE_RELEASE_TAG", "")
    if not repository or not tag:
        raise Refused("original custody ZIP transport not configured; source custodian must supply an approved private repository and release tag")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository):
        raise Refused("invalid private custody repository locator")
    token = os.environ.get("GH_TOKEN")
    if not token:
        raise Refused("SOURCE_CORPUS_READ_TOKEN is required for the private custody mirror")
    api = "https://api.github.com/repos/" + repository
    # Prevent a future visibility change from silently making this a public custody.
    repo = json.loads(download(api, 100_000, token, "application/vnd.github+json"))
    if repo.get("private") is not True:
        raise Refused("source custody repository is not private")
    release = json.loads(download(api + "/releases/tags/" + urllib.parse.quote(tag, safe=""), 1_000_000, token, "application/vnd.github+json"))
    bundle = custody["bundle"]
    assets = [a for a in release.get("assets", []) if a["name"] == bundle["fileName"]]
    if len(assets) != 1 or assets[0].get("size") != bundle["byteLength"]:
        raise Refused("original custody ZIP mirror missing or wrong length; see " + CUSTODY)
    asset = assets[0]
    if asset.get("digest") not in (None, "sha256:" + bundle["sha256"]):
        raise Refused("private asset digest differs from original custody")
    data = download(api + "/releases/assets/" + str(int(asset["id"])), bundle["byteLength"], token, "application/octet-stream")
    return read_bundle(data, custody)


def restore(root=ROOT, local_zip=None, check_only=False):
    root = root.resolve()
    records = []
    for name in [ADOPTION, AZ_ADOPTION]:
        document = json.loads((root / name).read_text())
        if document.get("schemaVersion") != "rcap-source-custody-adoption/v1":
            raise Refused("unexpected adoption schema")
        records.extend(document["sources"])
    if len(json.loads((root / ADOPTION).read_text())["sources"]) != 22:
        raise Refused("adoption scope changed; review the restoration contract")
    custody = json.loads((root / CUSTODY).read_text())
    pending, report, errors = {}, [], []
    bundle = None
    bundle_error = None
    for row in records:
        relative = row["heldCorpusPath"]
        result = {k: row[k] for k in ["sourceId", "heldCorpusPath", "byteLength", "sha256"]}
        try:
            target = safe_target(root, relative)
            if target.exists():
                data = verify(target.read_bytes(), row)
                result["transport"] = "existing exact bytes"
            elif relative in pending:
                data = verify(pending[relative], row)
                result["transport"] = "shared exact source"
            elif check_only:
                raise Refused("missing")
            else:
                writable_private_target(root, relative)
                if relative.startswith("private/source-imports/user-upload-20260911/"):
                    if bundle is None and bundle_error is None:
                        try:
                            bundle = private_bundle(custody, local_zip)
                        except Refused as error:
                            bundle_error = str(error)
                    if bundle_error:
                        raise Refused(bundle_error)
                    if row["sha256"] not in bundle:
                        raise Refused("adopted hash absent from original custody ZIP")
                    data = verify(bundle[row["sha256"]], row)
                    result["transport"] = "original pinned private custody ZIP"
                elif relative.startswith("private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/"):
                    raise Refused("pinned Master Library bootstrap must precede source restoration")
                else:
                    url = OFFICIAL_URLS.get(row["sourceId"]) or row.get("officialUrl")
                    if not url:
                        raise Refused("no original-source retrieval locator")
                    urls = [url] + ([row["alsoVerifiedAtUrl"]] if row.get("alsoVerifiedAtUrl") else [])
                    failures = []
                    for candidate in urls:
                        try:
                            data = verify(download(candidate, row["byteLength"]), row)
                            break
                        except Refused as error:
                            failures.append(str(error))
                    else:
                        raise Refused("; ".join(failures))
                    result["transport"] = "exact official bytes at recorded source URL"
                pending[relative] = data
            result["status"] = "VERIFIED"
            result["observedByteLength"] = len(data)
            result["observedSha256"] = hashlib.sha256(data).hexdigest()
        except (Refused, OSError, ValueError, zipfile.BadZipFile) as error:
            result.update(status="REFUSED", reason=str(error) if isinstance(error, Refused) else type(error).__name__)
            errors.append(result)
        report.append(result)
    if not errors:
        # Do not overwrite anything, including a file created after preflight.
        for relative, data in pending.items():
            target = writable_private_target(root, relative)
            target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            with target.open("xb") as output:
                os.chmod(target, 0o600)
                output.write(data)
        for row in records:
            verify(safe_target(root, row["heldCorpusPath"]).read_bytes(), row)
    return {"status": "REFUSED" if errors else "PASS", "adoptedRecords": 22,
            "dependentArizonaRecords": 2, "installedFiles": len(pending) if not errors else 0,
            "sources": report, "custodyRequest": custody["bundle"] if errors else None}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--upload-bundle", help="local original custody ZIP, with its original hash")
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()
    try:
        result = restore(local_zip=args.upload_bundle, check_only=args.check_only)
        print(json.dumps(result, indent=2))
        sys.exit(0 if result["status"] == "PASS" else 1)
    except (Refused, OSError, ValueError) as error:
        print("SOURCE_RESTORATION_REFUSED: " + (str(error) if isinstance(error, Refused) else type(error).__name__), file=sys.stderr)
        sys.exit(1)
