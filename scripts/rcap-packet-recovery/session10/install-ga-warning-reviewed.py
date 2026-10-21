"""Install only authenticated Warning V2 members; refuse unknown destination bytes."""
import hashlib
import json
import pathlib
import stat
import zipfile

ROOT = pathlib.Path.cwd().resolve()
OUT = pathlib.Path('data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/ga-warning-closure')
ARCHIVE = pathlib.Path('inputs/session10/ga-warning-v2.zip')
ARCHIVE_SHA = 'ff09762452ace4c2cc3374416e16cd85c379a0cd2c9783feec1a0c34cdc1edf4'
FAMILY = 'data/rcap-all50/overlays/census-v1/ga/ga-nonconv-pre2013-set--official-pdf-fill/'
REVIEW = pathlib.Path('data/rcap-grade-a/chat-parallel-2026-09-07/chat4-review')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def blob(data):
    return hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()


def checked_path(name):
    p = pathlib.PurePosixPath(name)
    assert not p.is_absolute() and '..' not in p.parts and '\\' not in name, name
    current = ROOT
    for part in p.parts:
        current = current / part
        assert not current.is_symlink(), f'symlink path refused: {name}'
    assert current.resolve().is_relative_to(ROOT), name
    return ROOT / p


archive_bytes = ARCHIVE.read_bytes()
assert len(archive_bytes) == 18875317 and sha(archive_bytes) == ARCHIVE_SHA
review_bytes = (OUT / 'ga-warning-delta-04.json').read_bytes()
assert blob(review_bytes) == 'd009e0ceba86c1fdb5ea95275f652467aa2785b1'
review = json.loads(review_bytes)['rows'][0]
assert review['candidateIdentities']['v2ZipSha256Measured'] == ARCHIVE_SHA
expected_pdfs = {f"{FAMILY}fixtures/{r['fixture']}.pdf": r for r in review['wholePdfHashesMeasured']}
assert len(expected_pdfs) == 15
archive = zipfile.ZipFile(ARCHIVE)
manifest = json.loads(archive.read('MANIFEST.json'))
assert len(manifest) == 110 and len(archive.namelist()) == 111
assert len(set(archive.namelist())) == 111
assert set(archive.namelist()) == {r['path'] for r in manifest} | {'MANIFEST.json'}
selected = []
for member in manifest:
    name = member['path']
    checked_path(name)
    info = archive.getinfo(name)
    assert not stat.S_ISLNK(info.external_attr >> 16), name
    data = archive.read(name)
    assert len(data) == member['bytes'] and sha(data) == member['sha256'], name
    if name in expected_pdfs:
        assert sha(data) == expected_pdfs[name]['sha256'] and len(data) == expected_pdfs[name]['bytes'], name
    # The exact archive retains duplicate patch transport and raster custody.
    # Install code/source/all output members and small author evidence only.
    keep = name.startswith((FAMILY, 'scripts/', 'reference/')) or (
        name.startswith('data/rcap-grade-a/') and not name.endswith('.png')
        and not name.endswith(('packet-output-v2-delta.patch', 'packet-output-v2-new-files.patch')))
    if keep:
        selected.append((name, data))

assert blob(archive.read('scripts/rcap-packet-recovery/chat5/ga-pre2013.mjs')) == review['candidateIdentities']['correctedHelperGitBlobMeasured']
for name, expected in [
    ('ga-warning-delta-04.json', 'd009e0ceba86c1fdb5ea95275f652467aa2785b1'),
    ('ga-independent-review-03.json', 'b1734171305ada8da4fffe119141a9d7bdb1fd30'),
    ('ga-measurements-03.json', 'b0f59ec9f42915a269447fcd6bbdaf2625d797fe'),
]:
    data = (OUT / name).read_bytes()
    assert blob(data) == expected
    selected.append((str(REVIEW / name), data))

preflight = []
for name, data in selected:
    destination = checked_path(name)
    prior = destination.read_bytes() if destination.exists() else None
    assert prior is None or prior == data, f'unknown destination preimage: {name}'
    preflight.append({'path': name, 'beforeSha256': sha(prior) if prior is not None else None,
                      'afterSha256': sha(data), 'bytes': len(data),
                      'action': 'reuse_exact' if prior is not None else 'install_new'})

preflight_path = OUT / 'candidate-install-preflight.json'
preflight_doc = {'archive': str(ARCHIVE), 'archiveSha256': ARCHIVE_SHA, 'all110ManifestMembersVerified': True,
                 'independentReviewBlob': blob(review_bytes), 'selectedFiles': preflight,
                 'untouchedTransportAndRastersRetainedInArchive': [r['path'] for r in manifest if r['path'] not in {p for p, _ in selected}]}
if not preflight_path.exists():
    preflight_path.write_text(json.dumps(preflight_doc, indent=2) + '\n')
for name, data in selected:
    destination = checked_path(name)
    if destination.exists():
        assert destination.read_bytes() == data
        continue
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open('xb') as target:
        target.write(data)
    assert destination.read_bytes() == data

receipt = {'schemaVersion': 'rcap-exact-candidate-installation/v1', 'familyId': 'ga-nonconv-pre2013-set',
           'archive': str(ARCHIVE), 'archiveBytes': len(archive_bytes), 'archiveSha256': ARCHIVE_SHA,
           'manifestSha256': sha(archive.read('MANIFEST.json')), 'manifestMembersRehashed': 110,
           'files': preflight, 'installedFiles': sum(r['action'] == 'install_new' for r in preflight),
           'reusedExactFiles': sum(r['action'] == 'reuse_exact' for r in preflight),
           'wholePdfsInstalledOrReused': 15, 'wholePages': 108,
           'originalIndependentReviewer': 'ChatGPT, GPT-6 Astra Pro, separate Chat4 review session',
           'originalIndependentReviewSession': 'chat4-20260907-scale20-independent-04',
           'reviewPath': str(REVIEW / 'ga-warning-delta-04.json'), 'reviewSha256': sha(review_bytes),
           'packetRendererExecuted': False, 'newWholePageReviewClaimed': False,
           'sharedImporterEdited': False, 'originalOfficialDecisionsFilled': False,
           'remaining': ['Reconcile current shared importer and independent code-review evidence with installed V2 output identities.',
                         'Publish exact installed paths; current central selected-output admission and real runtime/delivery remain separate.'],
           'terminalPromotionClaimed': False, 'productionChanged': False}
(OUT / 'candidate-installation.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({k: receipt[k] for k in ['manifestMembersRehashed', 'installedFiles', 'reusedExactFiles', 'wholePdfsInstalledOrReused', 'sharedImporterEdited']}, indent=2))
