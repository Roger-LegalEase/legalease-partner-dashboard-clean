#!/usr/bin/env python3
"""Restore the SC guidance admission's private bindings from exact held bytes.

No downloads or approval changes. CI reuses the already verified Master Library.
Every bound JSON is authenticated before following its references. All private
sources are verified before installation. Other stale bindings remain diagnostic
and are still enforced by the unchanged guidance admission/generator.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import os
import subprocess
import sys

_spec = importlib.util.spec_from_file_location('exact_sources', Path(__file__).with_name('restore-adopted-sources.py'))
exact = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(exact)
ROOT = Path(__file__).resolve().parents[2]
ADMISSION = 'data/rcap-grade-a/legal-decisions/SC_SOLICITOR_GUIDANCE_ADMISSION_2026-09-14.json'
INDEX = 'data/rcap-all50/local-source-corpus-index.json'
PREFIX = 'private/transfers/sc-223a1-current-custody-20260914/'
MASTER = 'private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1'
REGISTRY = 'data/record-clearing/legal-design-track-registry.json'


def reviewed_registry(root, row):
    # Reuse the reviewed six-track successor, never traverse unverified current JSON.
    module = (Path(__file__).resolve().parents[1] / 'grade-a-packet-factory-24h/sc-runtime-successor.mjs').as_uri()
    program = (f'import {{loadScRuntimeSuccessor}} from {json.dumps(module)};'
               'const bytes=loadScRuntimeSuccessor(process.cwd())?.historicalConsumer(JSON.parse(process.argv[1]));'
               'if(!bytes)process.exit(1);process.stdout.write(bytes);')
    try:
        return subprocess.check_output(['node', '--input-type=module', '-e', program, json.dumps(row)],
                                       cwd=root, stderr=subprocess.PIPE)
    except (OSError, subprocess.CalledProcessError):
        raise exact.Refused('reviewed SC registry successor unavailable') from None


def bindings(root, admission=ADMISSION):
    """Collect the complete transitive binding set, refusing conflicting pins."""
    refs = {}
    pending = [json.loads(exact.safe_target(root, admission).read_text())]
    while pending:
        value = pending.pop()
        if isinstance(value, list):
            pending.extend(value)
        elif isinstance(value, dict):
            if all(key in value for key in ['path', 'sha256', 'byteLength']):
                row = {key: value[key] for key in ['path', 'sha256', 'byteLength']}
                path = row['path']
                target = exact.safe_target(root, path)
                if path in refs and refs[path] != row:
                    raise exact.Refused('conflicting SC source binding: ' + path)
                if path not in refs:
                    refs[path] = row
                    if path.endswith('.json'):
                        raw = target.read_bytes()
                        try:
                            exact.verify(raw, row)
                        except exact.Refused:
                            if path != REGISTRY:
                                raise
                            raw = exact.verify(reviewed_registry(root, row), row)
                        pending.append(json.loads(raw))
            pending.extend(value.values())
    return list(refs.values())


def restore(root=ROOT, source_file=None):
    root = root.resolve()
    refs = bindings(root)
    private = [row for row in refs if row['path'].startswith('private/')]
    if not private:
        raise exact.Refused('SC admission has no private source bindings; review scope')
    index = json.loads((root / INDEX).read_text())['entries']
    pending, sources, other = [], [], []
    for row in private:
        destination = exact.writable_private_target(root, row['path'])
        if not row['path'].startswith(PREFIX):
            raise exact.Refused('SC private binding has no approved restoration mapping: ' + row['path'])
        relative = row['path'][len(PREFIX):]
        entries = [x for x in index if x.get('custody') == 'master_library' and x.get('path') == relative]
        if len(entries) != 1 or any(entries[0].get(k) != row[k] for k in ['sha256', 'byteLength']):
            raise exact.Refused('SC admission and Master Library index pins disagree: ' + relative)
        if destination.exists():
            raw = exact.verify(destination.read_bytes(), row)
            transport = 'existing exact destination'
        else:
            # An explicitly supplied local original is hash/length checked under
            # the same admission pins; CI always uses the pinned Master Library.
            source = Path(source_file) if source_file else exact.safe_target(root, MASTER + '/' + relative)
            raw = exact.verify(source.read_bytes(), row)
            transport = 'explicit local source' if source_file else 'verified Master Library'
            pending.append((destination, raw))
        sources.append({**row, 'status': 'VERIFIED', 'observedByteLength': len(raw),
                        'observedSha256': exact.hashlib.sha256(raw).hexdigest(), 'transport': transport})
    for row in refs:
        if row in private:
            continue
        try:
            exact.verify(exact.safe_target(root, row['path']).read_bytes(), row)
            status = 'VERIFIED'
        except (exact.Refused, OSError):
            status = 'MISMATCH_OR_MISSING'
        other.append({**row, 'status': status})
    for destination, raw in pending:
        exact.writable_private_target(root, str(destination.relative_to(root)))
        destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        with destination.open('xb') as output:
            os.chmod(destination, 0o600)
            output.write(raw)
    for row in private:
        exact.verify(exact.safe_target(root, row['path']).read_bytes(), row)
    return {'sourceRestoration': 'PASS', 'totalBoundFiles': len(refs), 'privateBoundFiles': len(private),
            'installedFiles': len(pending), 'sources': sources, 'otherBindings': other,
            'admissionAcceptance': 'NOT_GRANTED_BY_RESTORATION', 'commercialAuthorityChanged': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-file', help='optional local original; exact admission pins still required')
    args = parser.parse_args()
    try:
        print(json.dumps(restore(source_file=args.source_file), indent=2))
    except (exact.Refused, OSError, ValueError) as error:
        print('SC_SOURCE_RESTORATION_REFUSED: ' + (str(error) if isinstance(error, exact.Refused) else type(error).__name__), file=sys.stderr)
        sys.exit(1)
