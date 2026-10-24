#!/usr/bin/env python3
"""Preflight the complete reviewed generator source inventory, collecting all gaps.

Existing corpus/adoption/font bootstraps remain authoritative. Only missing
private sources with recorded official transports are downloaded here. All rows
are verified before installation; no existing source or approval is overwritten.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import re
import sys

spec = importlib.util.spec_from_file_location('exact', Path(__file__).with_name('restore-adopted-sources.py'))
exact = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exact)
ROOT = Path(__file__).resolve().parents[2]
MANIFEST = 'data/rcap-grade-a/source-custody/generator-preflight-20261013/manifest.json'


def pointer(document, value):
    for part in value.split('/')[1:]:
        part = part.replace('~1', '/').replace('~0', '~')
        document = document[int(part)] if isinstance(document, list) else document[part]
    return document


def inventory(root, manifest):
    if manifest['schemaVersion'] != 'rcap-generator-source-preflight/v1':
        raise exact.Refused('unknown generator inventory schema')
    # A changed module closure requires reviewing its source dependencies, not
    # quietly retaining a now-incomplete list. No generator behavior is modified.
    modules = {r['path']: r for r in manifest['moduleClosure']}
    if len(modules) != len(manifest['moduleClosure']):
        raise exact.Refused('duplicate generator module')
    visited, pending = set(), list(manifest['entrypoints']) + list(manifest.get('subprocessEntrypoints', []))
    while pending:
        name = pending.pop()
        if name in visited:
            continue
        if name not in modules:
            raise exact.Refused('unreviewed generator module: ' + name)
        raw = exact.verify(exact.safe_target(root, name).read_bytes(), modules[name])
        visited.add(name)
        for match in re.finditer(r'''(?:from\s*|import\s*)['"](\.[^'"]+)['"]''', raw.decode()):
            dependency = (root / name).parent / match[1]
            pending.append(str(dependency.resolve().relative_to(root.resolve())))
    if visited != set(modules):
        raise exact.Refused('generator module closure changed')
    records = {}
    for ref in manifest['records']:
        if ref['path'] in records:
            raise exact.Refused('duplicate custody record')
        records[ref['path']] = json.loads(exact.verify(exact.safe_target(root, ref['path']).read_bytes(), ref))
    required = set()
    for ref in manifest['records']:
        for value in ref['sourcePointers']:
            row = pointer(records[ref['path']], value)
            required.add(row.get('heldCorpusPath') or row.get('path') or row.get('pathInRepository'))
    paths = set()
    for source in manifest['sources']:
        name = source['path']
        exact.safe_target(root, name)
        if name in paths or not source['evidence']:
            raise exact.Refused('duplicate or unbound source: ' + name)
        paths.add(name)
        if not re.fullmatch('[0-9a-f]{64}', source['sha256']) or not isinstance(source['byteLength'], int) or source['byteLength'] <= 0:
            raise exact.Refused('invalid source identity: ' + name)
        original_urls = set()
        for ref in source['evidence']:
            row = pointer(records[ref['record']], ref['pointer'])
            original = row.get('heldCorpusPath') or row.get('path') or row.get('pathInRepository')
            if original != name or row.get('sha256') != source['sha256'] or row.get('byteLength', source['byteLength']) != source['byteLength']:
                raise exact.Refused('source and original custody disagree: ' + name)
            original_urls.update(filter(None, [row.get('officialUrl'), row.get('url')]))
        if set(source['recordedUrls']) != original_urls:
            raise exact.Refused('transport not bound by original source record: ' + name)
        if source['transport'] not in ['tracked-checkout', 'existing-bootstrap', 'recorded-official-url']:
            raise exact.Refused('unknown restoration transport: ' + name)
        if source['transport'] == 'recorded-official-url' and (not name.startswith('private/') or not original_urls):
            raise exact.Refused('download requires private destination and original locator')
    if paths != required:
        raise exact.Refused('source inventory does not cover every declared receipt dependency')
    return manifest['sources']


def corpus_inventory(root, manifest):
    ref = manifest.get('conditionalCorpusIndex')
    if not ref:
        return []
    index = json.loads(exact.verify(exact.safe_target(root, ref['path']).read_bytes(), ref))
    custodies = {c['id']: c for c in index['custodies']}
    rows = {}
    for entry in index['entries']:
        custody = custodies[entry.get('custody', 'master_library')]
        name = (custody['root'] + '/' + entry['path']) if custody['pathsRelativeTo'] == 'custodyRoot' else entry['path']
        exact.safe_target(root, name)
        row = {'path': name, 'sha256': entry['sha256'], 'byteLength': entry['byteLength']}
        if name in rows and rows[name] != row:
            raise exact.Refused('conflicting indexed source: ' + name)
        rows[name] = row
    return list(rows.values())


def restore(root=ROOT, check_only=False, manifest=None):
    root = root.resolve()
    manifest = manifest or json.loads(exact.safe_target(root, MANIFEST).read_text())
    sources = inventory(root, manifest)
    report, pending = [], []
    for source in sources:
        result = {k: source[k] for k in ['path', 'sha256', 'byteLength']}
        try:
            target = exact.safe_target(root, source['path'])
            if source['path'].startswith('private/'):
                target = exact.writable_private_target(root, source['path'])
            if target.exists():
                raw = exact.verify(target.read_bytes(), source)
                result['transport'] = 'existing exact bytes'
            elif check_only:
                raise exact.Refused('missing source')
            elif source['transport'] == 'recorded-official-url':
                failures = []
                for url in source['recordedUrls']:
                    try:
                        raw = exact.verify(exact.download(url, source['byteLength']), source)
                        result['transport'] = url
                        break
                    except exact.Refused as error:
                        failures.append(str(error))
                else:
                    raise exact.Refused('recorded original unavailable: ' + '; '.join(failures))
                pending.append((source, raw))
            else:
                raise exact.Refused('missing prerequisite from ' + source['transport'])
            result.update(status='VERIFIED', observedSha256=exact.hashlib.sha256(raw).hexdigest(), observedByteLength=len(raw))
        except (exact.Refused, OSError) as error:
            result.update(status='REFUSED', reason=str(error) if isinstance(error, exact.Refused) else type(error).__name__,
                          custodianAction='Restore the original bytes to this exact path using the retained custody record; expected length and SHA-256 are listed here.',
                          evidence=source['evidence'])
        report.append(result)
    conditional = []
    for row in corpus_inventory(root, manifest):
        result = dict(row)
        try:
            target = exact.safe_target(root, row['path'])
            if target.exists():
                exact.verify(target.read_bytes(), row)
                result['status'] = 'VERIFIED'
            else:
                result['status'] = 'NOT_PRESENT_NOT_READ'
        except (exact.Refused, OSError) as error:
            result.update(status='REFUSED', reason=str(error))
        conditional.append(result)
    errors = [r for r in report + conditional if r['status'] == 'REFUSED']
    if not errors:
        for source, raw in pending:
            target = exact.writable_private_target(root, source['path'])
            target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            with target.open('xb') as output:
                os.chmod(target, 0o600)
                output.write(raw)
        for source in sources:
            exact.verify(exact.safe_target(root, source['path']).read_bytes(), source)
    return {'status': 'REFUSED' if errors else 'PASS', 'sourceCount': len(sources),
            'installedFiles': len(pending) if not errors else 0, 'sources': report,
            'conditionalIndexedSources': conditional,
            'allMissingOrMismatched': errors, 'commercialAuthorityChanged': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-only', action='store_true')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    try:
        result = restore(check_only=args.check_only)
    except (exact.Refused, OSError, KeyError, ValueError) as error:
        result = {'status': 'REFUSED', 'inventoryError': str(error), 'installedFiles': 0}
    text = json.dumps(result, indent=2) + '\n'
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(text)
    summary = {k:v for k,v in result.items() if k != 'conditionalIndexedSources'}
    if 'conditionalIndexedSources' in result:
        summary['conditionalIndexedSourceCounts'] = {status: sum(r['status'] == status for r in result['conditionalIndexedSources']) for status in ['VERIFIED', 'NOT_PRESENT_NOT_READ', 'REFUSED']}
    print(json.dumps(summary, indent=2))
    sys.exit(0 if result['status'] == 'PASS' else 1)
