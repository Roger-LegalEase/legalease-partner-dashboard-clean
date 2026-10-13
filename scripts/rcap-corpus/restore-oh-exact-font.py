#!/usr/bin/env python3
"""Install the original OH font privately; never execute or redistribute the EXE.

Reuse immutable custody and source receipts. Verify the complete original package
before extracting, verify the font before installation, and never overwrite local
bytes. The retained package includes its original notices/license. No rendering.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

spec = importlib.util.spec_from_file_location('exact', Path(__file__).with_name('restore-adopted-sources.py'))
exact = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exact)
ROOT = Path(__file__).resolve().parents[2]
CUSTODY = 'data/rcap-grade-a/packet-factory-24h/prerequisite-resolution-20260914/oh-exact-arial-custody-release.json'
CUSTODY_SHA = 'c8f9754af652ef49452a2062bbb2d2dc763487e7ff3d8691945296bf0f779c48'
RECEIPT = 'data/rcap-all50/overlays/census-v1/oh/rcap-oh-custom-pleading-clean-tracks--custom-pleading/source-receipt.json'
RECEIPT_SHA = '040d18294b21cea9b9aa603a7f93b571e3fc8ed1df3751afb17054fbebeb8b6a'
PREFIX = 'private/source-imports/oh-exact-fonts-20260914/'


def pinned_json(root, name, digest):
    raw = exact.safe_target(root, name).read_bytes()
    if exact.hashlib.sha256(raw).hexdigest() != digest:
        raise exact.Refused('original OH record changed: ' + name)
    return json.loads(raw)


def records(root):
    custody = pinned_json(root, CUSTODY, CUSTODY_SHA)
    receipt = pinned_json(root, RECEIPT, RECEIPT_SHA)
    package = next(r for r in custody['custody'] if r['path'] == PREFIX + 'arial32.exe')
    font = next(r for r in custody['custody'] if r['path'] == PREFIX + 'Arial.TTF')
    source = next(r for r in receipt['documents'] if r['sourceId'] == 'font:ArialMT')
    if source['path'] != font['path'] or source['sha256'] != font['sha256'] or receipt['fontCustody'] != CUSTODY:
        raise exact.Refused('OH font source receipt and custody disagree')
    return custody, package, font


def extract_font(raw):
    # Only called after exact package verification. Never execute the installer.
    with tempfile.TemporaryDirectory(prefix='oh-font-extract-') as directory:
        package = Path(directory) / 'arial32.exe'
        package.write_bytes(raw)
        result = subprocess.run(['cabextract', '-q', '-p', '-F', 'Arial.TTF', str(package)],
                                capture_output=True, check=True, timeout=30)
        return result.stdout


def restore(root=ROOT, source_package=None):
    root = root.resolve()
    custody, package, font = records(root)
    targets = {r['path']: exact.writable_private_target(root, r['path']) for r in [package, font]}
    # Validate every existing destination first; mismatches are never overwritten.
    for record in [package, font]:
        target = targets[record['path']]
        if target.exists():
            exact.verify(target.read_bytes(), record)
    if source_package is not None:
        raw = exact.verify(Path(source_package).read_bytes(), package)
        transport = 'explicit exact original package'
    elif targets[package['path']].exists():
        raw = exact.verify(targets[package['path']].read_bytes(), package)
        transport = 'retained exact original package'
    else:
        failures = []
        for url in dict.fromkeys([custody['sourcePackageUrl'], custody['resolvedDownloadUrl']]):
            try:
                raw = exact.verify(exact.download(url, package['byteLength']), package)
                transport = url
                break
            except exact.Refused as error:
                failures.append(str(error))
        else:
            raise exact.Refused('recorded upstream original package unavailable: ' + '; '.join(failures))
    font_bytes = exact.verify(extract_font(raw), font)
    installed = 0
    for record, data in [(package, raw), (font, font_bytes)]:
        target = exact.writable_private_target(root, record['path'])
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            with target.open('xb') as output:
                os.chmod(target, 0o600)
                output.write(data)
            installed += 1
        exact.verify(target.read_bytes(), record)
    return {'fontRestoration': 'PASS', 'installedFiles': installed, 'transport': transport,
            'sources': [{**r, 'status': 'VERIFIED'} for r in [package, font]],
            'fontIdentity': custody['font'], 'licenseUrl': custody['licenseUrl'],
            'originalPackageRetained': True, 'standaloneFontsRedistributed': False,
            'renderedOutputsChanged': False, 'commercialAuthorityChanged': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package', type=Path, help='Optional held original; same length/hash gates apply')
    args = parser.parse_args()
    try:
        print(json.dumps(restore(source_package=args.package), indent=2))
    except (exact.Refused, OSError, subprocess.SubprocessError) as error:
        print('OH_FONT_RESTORATION_REFUSED: ' + str(error), file=sys.stderr)
        sys.exit(1)
