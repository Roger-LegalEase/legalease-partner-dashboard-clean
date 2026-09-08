#!/usr/bin/env python3
"""Install only the published cannabis bytes after all preimages pass."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import os
import stat
import zipfile

ROOT = Path.cwd().resolve()
EVIDENCE = ROOT / 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08'
ARCHIVE = ROOT / 'inputs/md-cannabis-candidate.zip'
AUTHOR = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat5-build/md_cannabis_petition-set/'
FAMILY = 'data/rcap-all50/overlays/census-v1/md/md-cannabis-petition-set--official-pdf-fill/'
HELPER = 'scripts/rcap-packet-recovery/chat5/md-conviction.mjs'
CODE = {
    'scripts/build-census-v1-md_cannabis_petition-set.mjs',
    'scripts/rcap-packet-recovery/chat5/md-cannabis.mjs',
    'scripts/rcap-packet-recovery/chat5/test-md-cannabis.mjs',
    'scripts/rcap-packet-recovery/chat5/test-md-cannabis-importer.mjs',
    'scripts/rcap-packet-recovery/chat5/audit-md-cannabis.py', HELPER,
}
REUSE_ONLY = {
    'reference/chat-parallel-2026-09-07/chat5/CC-DC-089.pdf',
    'reference/chat-parallel-2026-09-07/chat5/MDJ-008.pdf',
    'scripts/rcap-packet-recovery/chat5/audit-md-conviction.py',
}
NEW_SOURCE = 'reference/chat-parallel-2026-09-07/chat5/CC-DC-CR-072D.pdf'
sha = lambda b: hashlib.sha256(b).hexdigest()
blob = lambda b: hashlib.sha1(b'blob ' + str(len(b)).encode() + b'\0' + b).hexdigest()
report_path = EVIDENCE / 'md-cannabis-installation.json'
assert not report_path.exists(), 'INSTALL_RECEIPT_ALREADY_EXISTS'
archive_bytes = ARCHIVE.read_bytes()
assert len(archive_bytes) == 28880009
assert sha(archive_bytes) == '9b08d5d36d475476bac4381a3b5337b8c90c2853d0cfaa2a170e15c56c568379'
space = os.statvfs(ROOT)
free_before = space.f_bavail * space.f_frsize
assert free_before > (350 + 1024) * 1024 * 1024, 'INSUFFICIENT_BOUNDED_BATCH_CAPACITY'

with zipfile.ZipFile(ARCHIVE) as z:
    manifest_raw = z.read('MANIFEST.json')
    manifest = json.loads(manifest_raw)
    members = manifest['files']
    assert len(members) == 166
    assert len({x['path'] for x in members}) == 166
    assert set(z.namelist()) == {x['path'] for x in members} | {'MANIFEST.json'}
    for member in members:
        name = member['path']
        p = PurePosixPath(name)
        assert not p.is_absolute() and '..' not in p.parts
        assert not stat.S_ISLNK(z.getinfo(name).external_attr >> 16)
        raw = z.read(name)
        assert len(raw) == member['bytes'] and sha(raw) == member['sha256'], name

    install_raw = z.read(AUTHOR + 'candidate-install-manifest.json')
    install = json.loads(install_raw)
    assert len(install['files']) == 89
    assert len({x['path'] for x in install['files']}) == 89
    assert sum(x['path'].startswith(FAMILY) for x in install['files']) == 79
    plans = []
    for row in install['files']:
        name = row['path']
        assert name.startswith(FAMILY) or name in CODE | REUSE_ONLY | {NEW_SOURCE}, name
        target = ROOT / name
        for ancestor in [target, *target.parents]:
            if ancestor == ROOT:
                break
            assert not ancestor.is_symlink(), 'SYMLINK_DESTINATION: ' + str(ancestor)
        raw = z.read(name)
        assert len(raw) == row['bytes'] and sha(raw) == row['sha256'] and blob(raw) == row['gitBlob'], name
        before = target.read_bytes() if target.exists() else None
        if name in REUSE_ONLY:
            assert before == raw, 'REQUIRED_IDENTICAL_DEPENDENCY: ' + name
            action = 'preserved_identical'
        elif before == raw:
            action = 'preserved_identical'
        elif name == HELPER:
            assert before is not None
            assert sha(before) == row['expectedBeforeSha256']
            assert blob(before) == row['expectedBefore'] == '052d56756be4ba9b0310f3498a964b72c159bfab'
            assert blob(raw) == 'abf6699f874ca5471ed4b7e4a1aa974ce0cbcfea'
            action = 'published_shared_helper_delta'
        else:
            assert before is None, 'UNEXPECTED_PREIMAGE: ' + name
            action = 'installed_absent'
        plans.append({**row, 'action': action, 'actualBeforeSha256': sha(before) if before is not None else None})

    before = json.loads((EVIDENCE / 'md-cannabis-preservation-before.json').read_text())
    for row in before['conviction'] + before['favorable']:
        assert sha((ROOT / row['path']).read_bytes()) == row['sha256'], 'PRESERVED_INPUT_CHANGED: ' + row['path']
    evidence = {
        'md-cannabis-archive-manifest.json': manifest_raw,
        'md-cannabis-candidate-install-manifest.json': install_raw,
        'md-cannabis-published-helper-delta.patch': z.read(AUTHOR + 'md-component-reuse.patch'),
    }
    for name in ['execution-inputs.json', 'full-output-equivalence.json', 'md-conviction-output-equivalence.json',
                 'md-conviction-predicate-equivalence.json', 'md-cannabis-tests.json', 'md-cannabis-importer.json',
                 'author-visual-review.json', 'build-summary.json', 'route-contract-input.json']:
        evidence['md-cannabis-author-' + name] = z.read(AUTHOR + name)
    evidence['md-cannabis-author-byte-audit.json'] = z.read(AUTHOR + 'author-qa/byte-audit.json')
    evidence['md-cannabis-author-page-inventory.json'] = z.read(AUTHOR + 'author-qa/page-inventory.json')
    for name in evidence:
        assert not (EVIDENCE / name).exists(), 'EVIDENCE_ALREADY_EXISTS: ' + name

    # No writes occur until every source, member, output and preimage is reconciled.
    for row in plans:
        if row['action'] == 'preserved_identical':
            continue
        target = ROOT / row['path']
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(z.read(row['path']))
    for name, raw in evidence.items():
        (EVIDENCE / name).write_bytes(raw)

    for row in plans:
        assert sha((ROOT / row['path']).read_bytes()) == row['sha256'], 'POSTIMAGE_MISMATCH: ' + row['path']
    for row in before['conviction'] + before['favorable']:
        assert sha((ROOT / row['path']).read_bytes()) == row['sha256'], 'PRESERVATION_MISMATCH: ' + row['path']
    report = {
        'familyId': 'md_cannabis_petition-set', 'scope': 'EXACT_PUBLISHED_CANDIDATE_INSTALLATION_NOT_APPROVAL',
        'publication': {'pullRequest': 231, 'head': '4e36237416a21e2bfbc3ffff122d8fc020d490c4',
                        'comment': 5578206808, 'integrationComment': 5578209782,
                        'convictionPrerequisite': '55deb25610019f9c32d7271f7300baf844819a11'},
        'archive': {'path': str(ARCHIVE.relative_to(ROOT)), 'bytes': len(archive_bytes), 'sha256': sha(archive_bytes),
                    'manifestMembersRehashed': len(members), 'manifestSha256': sha(manifest_raw)},
        'method': 'Complete archived files, not patches; patches were not applied a second time.',
        'installation': plans, 'familyFiles': 79, 'pdfs': 18, 'pages': 133,
        'preservedConvictionFiles': 107, 'preservedFavorableBindings': 56,
        'freshRendererExecutedDuringTransportInstallation': False,
        'authorEvidenceReusedUnchanged': list(evidence),
        'nativeCompatibility': 'Separate focused execution evidence follows installation; not inferred from hashes.',
        'independentReview': 'PENDING', 'centralAcceptance': False, 'runtimeAcceptance': False,
        'terminalPromotion': False, 'freeBytesBefore': free_before,
        'freeBytesAfter': os.statvfs(ROOT).f_bavail * os.statvfs(ROOT).f_frsize,
        'batchBudgetBytes': 350 * 1024 * 1024, 'safetyMarginBytes': 1024 * 1024 * 1024,
    }
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'result': 'INSTALLED_EXACT_CANDIDATE', 'archiveMembers': len(members),
                      'installationPaths': len(plans), 'written': sum(x['action'] != 'preserved_identical' for x in plans),
                      'identicalPreserved': sum(x['action'] == 'preserved_identical' for x in plans),
                      'familyFiles': 79, 'convictionPreserved': 107, 'favorablePreserved': 56}))
