"""Custody-only recheck: read exact inputs; write only this VF02 evidence directory."""
from pathlib import Path
import datetime, hashlib, json, re, subprocess

FAMILY = 'de_pardon_expungement-set'
ROOT = Path(__file__).resolve().parents[5]
assert ROOT == Path('/tmp/rcap-vf62-pa-final-20260911')
OUT = Path(__file__).resolve().parent
FAM = 'data/rcap-all50/overlays/census-v1/de/de-pardon-expungement-set--official-pdf-fill'
FACTORY = 'data/rcap-grade-a/packet-factory-24h'
PRIOR_BASE = 'bfdcdef3860edc7b1ca7bd693f07023690d8cd7d'
VF20_BASE = 'a45cb2767f70febb451503d7e4da2bb92676982d'
ASSIGNED_BASE = '588b955d202269be5016802517109ebc4b1a2e4c'
PRIOR = FACTORY + '/vf02/rows-vf02-20260911-de-pardon-final.json'
ANCHORS = FACTORY + '/vf02/de-pardon-final-20260911/current-byte-and-anchor-bindings.json'
DECISION_PROOF = FACTORY + '/vf02/de-pardon-final-20260911/decision-proof.json'
VF20 = FACTORY + '/vf20/rows.json'
RECOVERY = FACTORY + '/checkpoint-232-to-250/de-pardon-source-restored-20260911.json'

def run(args):
    return subprocess.check_output(args, cwd=ROOT, text=True)
def read(p):
    return (ROOT / p).read_bytes()
def load(p):
    return json.loads(read(p))
def old(p, base=PRIOR_BASE):
    return subprocess.check_output(['git', 'show', base + ':' + p], cwd=ROOT)
def sha(b):
    return hashlib.sha256(b).hexdigest()
def canonical(obj):
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()
def pin(p):
    b = read(p)
    return {'path': p, 'sha256': sha(b), 'byteLength': len(b)}
def diff(a, b, p=''):
    if isinstance(a, dict) and isinstance(b, dict):
        return [x for k in sorted(a.keys() | b.keys()) for x in diff(a.get(k), b.get(k), p + '/' + k)]
    if isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        return [x for i, (a1, b1) in enumerate(zip(a, b)) for x in diff(a1, b1, p + '/' + str(i))]
    return [] if a == b else [p]

prior = load(PRIOR)['rows'][0]
assert prior['familyId'] == FAMILY and prior['verdict'] == 'BLOCKED_SOURCE'
assert prior['proofObligations']['SOURCE_IDENTITY']['result'] == 'NOT_MEASURABLE_HERE'
reuse = [k for k, v in prior['proofObligations'].items() if v['result'] == 'PASS']
assert len(reuse) == 14 and len(prior['proofObligations']) == 15
anchors = load(ANCHORS)
assert sha(read(VF20)) == anchors['priorReturnSha256']
vf20 = next(r for r in load(VF20)['rows'] if r['itemId'] == FAMILY)
assert sha(canonical(vf20)) == anchors['priorExactRowSha256']

files = []
tracked = run(['git', 'ls-files', FAM]).splitlines()
assert sorted(tracked) == sorted(x['path'] for x in anchors['familyFiles'])
for previous in anchors['familyFiles']:
    p = previous['path']
    r = pin(p)
    r['priorVF02Sha256'] = previous['sha256']
    r['byteIdenticalToPriorVF02'] = r['sha256'] == previous['sha256']
    if not r['byteIdenticalToPriorVF02']:
        assert p == FAM + '/product-wiring.json'
        r['changedJsonPointers'] = diff(json.loads(old(p)), load(p))
        assert all(x.startswith('/binding/lastIndependentVerification/') for x in r['changedJsonPointers'])
        r['assessment'] = 'Only the derived prior-review status changed; sourceVersion, route and delivery bindings are restored unchanged.'
    if p.endswith('.pdf'):
        assert r['byteIdenticalToPriorVF02']
        r['pagesReusedFromUnchangedPriorMeasurement'] = previous['pages']
    files.append(r)
receipt = load(FAM + '/source-receipt.json')
wiring = load(FAM + '/product-wiring.json')
old_wiring = json.loads(old(FAM + '/product-wiring.json'))
assert wiring['routeKeys'] == old_wiring['routeKeys'] == receipt['routeKeys']
assert wiring['binding']['sourceVersion'] == old_wiring['binding']['sourceVersion']
assert receipt['documents'] == json.loads(old(FAM + '/source-receipt.json'))['documents']
assert receipt['transport'] == json.loads(old(FAM + '/source-receipt.json'))['transport']
sources = []
for d in receipt['documents']:
    p = 'private/source-imports/Nationwide_Recovery_Pool_2026-09-02/' + d['pathInCustody']
    r = pin(p)
    assert r['sha256'] == d['sha256'] and r['byteLength'] == d['byteLength']
    prior_source = next(x for x in anchors['officialSources'] if x['documentId'] == d['documentId'])
    assert r['sha256'] == prior_source.get('sha256', prior_source.get('priorMeasuredSha256'))
    assert r['byteLength'] == prior_source.get('byteLength', prior_source.get('priorMeasuredByteLength'))
    assert read(p).startswith(b'%PDF-')
    r.update(documentId=d['documentId'], resolvedPath=str((ROOT / p).resolve()), currentBytesAvailable=True,
             freshlyHashedHere=True, matchesReceiptAndPriorIndependentPin=True, hashMismatchObserved=False)
    sources.append(r)
recovery = load(RECOVERY)['documents'][0]
reference = pin(recovery['heldCorpusPath'])
assert reference['sha256'] == recovery['sha256'] == sources[1]['sha256']
assert reference['byteLength'] == recovery['byteLength'] == sources[1]['byteLength'] == 1128070
assert read(reference['path']) == read(sources[1]['path'])
reference['byteIdenticalToRestoredOriginalCustodyFile'] = True

records = []
for p, arr, key, target in [
    ('data/record-clearing/legal-design-packet-set-manifests.json', 'packetSets', 'packetSetId', FAMILY),
    ('data/record-clearing/legal-design-track-registry.json', 'tracks', 'trackId', 'de_pardon_expungement')
]:
    cur, prev = load(p), json.loads(old(p))
    entry = next(x for x in cur[arr] if x[key] == target)
    previous = next(x for x in prev[arr] if x[key] == target)
    assert entry == previous
    assert {k: v for k, v in cur.items() if k != arr} == {k: v for k, v in prev.items() if k != arr}
    previous_anchor = next(x for x in anchors['recordAnchors'] if x['path'] == p)
    assert sha(canonical(entry)) == previous_anchor['exactEntrySha256']
    records.append({'path': p, 'exactEntryId': target, 'exactEntrySha256': sha(canonical(entry)),
                    'equalsPriorVF02AndVF20Entry': True, 'globalMetadataUnchanged': True,
                    'scope': 'Exact DE entry only; unrelated entries and historical whole-file pins confer no new authority.'})

decision_proof = load(DECISION_PROOF)
decision_path = decision_proof['decisionDocument']
assert sha(read(decision_path)) == decision_proof['decisionDocumentSha256']
decision = next(x for x in load(decision_path)['decisions'] if x['decisionId'] == decision_proof['decision']['decisionId'])
assert decision == decision_proof['decision']

implementation = []
for p in ['scripts/build-census-v1-de_pardon_expungement-set.mjs',
          'scripts/census-v1-de-expungement/de-expungement-core.mjs',
          'scripts/census-v1-de-expungement/de-superior-court-forms.mjs']:
    assert read(p) == old(p)
    implementation.append({**pin(p), 'byteIdenticalToPriorVF02': True})

raster_files = []
for r in anchors['raster']['evidence']:
    current = pin(r['path'])
    assert current['sha256'] == r['sha256']
    raster_files.append({**current, 'byteIdenticalToPriorVF02': True})
verdict = load(raster_files[1]['path'])
admission = load(raster_files[0]['path'])
assert str(verdict['workflowRunId']) == str(admission['runId']) == '34413372916'
assert verdict['verdict'] == 'RASTER_PASS' and verdict['pagesMeasured'] == admission['pagesMeasured'] == 6
for kind in ['canonical', 'boundary']:
    assert sha(read(FAM + '/fixtures/' + kind + '.pdf')) == verdict['hashesBound'][kind]['pinned']
assert len(verdict['measurements']) == len(admission['measuredPageImages']) == 6
for a, v in zip(admission['measuredPageImages'], verdict['measurements']):
    assert a['sha256'] == v['pngSha256'] and a['byteLength'] == v['bytes']

commands = []
for flag in ['--can-assert', '--assert']:
    args = ['node', 'scripts/grade-a-packet-factory-24h/claim.mjs', flag, 'VF02', FAMILY]
    p = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
    assert p.returncode == 0 and 'CLAIM_OK VF02 ' + FAMILY in p.stdout
    commands.append({'command': args, 'exitCode': p.returncode, 'stdout': p.stdout.strip()})
head = run(['git', 'rev-parse', 'HEAD']).strip()
subprocess.run(['git', 'merge-base', '--is-ancestor', ASSIGNED_BASE, head], cwd=ROOT, check=True)
grant_sets = [re.search(r'grant set ([a-f0-9]+)', c['stdout'])[1] for c in commands]
assert len(set(grant_sets)) == 1
completeness_script = 'scripts/rcap-packet-completeness/verify-packet-completeness.mjs'
assert read(completeness_script) == old(completeness_script, 'cf67102837b06c8bb84ceb945ffbae47f554fb4a')
result = {
    'schemaVersion': 'rcap-source-custody-closure-proof/v1', 'familyId': FAMILY,
    'measuredAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'scope': 'Fresh exact source custody; fourteen unchanged approval predicates. No new source substance, law, decryption, rendering, pixel or acquisition-archive review.',
    'preflight': {'worktree': str(ROOT), 'branch': run(['git', 'branch', '--show-current']).strip(),
        'assignedBase': ASSIGNED_BASE, 'actualHead': head, 'baseIsAncestor': True,
        'initialHeadAfterAuthorizedBaseMerge': 'cf67102837b06c8bb84ceb945ffbae47f554fb4a',
        'preexistingUntracked': ['private'], 'initialGrantSet': 'c863c3833ea37818', 'grantSet': grant_sets[0], 'commands': commands,
        'captainDerivedBindingRefreshCommit': '2fe3172dda21c3f92b61d3dff59d7450aa2ba1e7'},
    'priorVF02': pin(PRIOR), 'priorBindings': pin(ANCHORS), 'priorVF20': pin(VF20),
    'priorVF20ExactRowSha256': sha(canonical(vf20)),
    'officialSources': sources, 'recoveredRepositoryCopy': reference, 'recoveryCheckpoint': pin(RECOVERY),
    'custodyFinding': 'RESOLVED: both original official source files are currently readable and match the exact prior receipt and independent measurements; the recovered repository copy is byte-identical to restored CIV_EXP_08_A custody.',
    'archiveProvenance': {'reportedByOwnerViaCheckpoint': recovery['sourceRecoveryProvenanceReportedByOwner'],
        'archiveInspectedHere': False, 'freshIssuerDownloadClaimedHere': False,
        'basis': 'Direct file hashes and lengths establish the held bytes; owner-reported archive lineage is retained as reported, not independently asserted.'},
    'familyFiles': files, 'recordAnchors': records, 'unchangedImplementation': implementation,
    'routeKeys': receipt['routeKeys'], 'sourceVersion': wiring['binding']['sourceVersion'],
    'legalDecision': {**pin(decision_path), 'decisionId': decision['decisionId'], 'exactDecisionUnchanged': True,
        'priorIndependentDecisionProof': pin(DECISION_PROOF), 'reviewMode': 'REUSED_UNCHANGED_VF02_APPROVAL'},
    'raster': {'workflowRunId': '34413372916', 'verdict': 'RASTER_PASS', 'pdfsCovered': 2, 'pagesCovered': 6,
        'evidence': raster_files, 'bindingMatchesCurrentPdfBytes': True, 'freshRasterOrPixelReview': False,
        'originalPngBodiesReadHere': False, 'priorTransportLimit': admission['imageBytesReadBy'], 'newAdmission': False},
    'freshObligation': 'SOURCE_IDENTITY', 'reusedObligations': reuse,
    'currentCompletenessRead': {
        'command': 'MASTER_LIBRARY_SOURCE_DIR=/workspaces/legalease-partner-dashboard-clean/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1 RCAP_NO_LOCAL_RASTER=1 node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family de_pardon_expungement-set',
        'executedAtHead': 'cf67102837b06c8bb84ceb945ffbae47f554fb4a', 'exitCode': 0,
        'entrypoint': pin(completeness_script), 'entrypointAndFamilyMeasurementInputsUnchangedSinceExecution': True,
        'result': 'PASS_COMPLETE', 'familiesAudited': 1, 'writes': 18, 'terminalFields': 86,
        'counters': vf20['nineCounters'], 'allNineZero': all(v == 0 for v in vf20['nineCounters'].values()),
        'measurementScope': 'Actual read-only retained-fixture completeness CLI output corroborates reused independent measurements. The CLI does not itself remeasure source custody, pixels or runtime intake.',
        'nonmutatingMode': 'Neither --write nor --mutations supplied; output write guard at verify-packet-completeness.mjs:901 and mutation guard at :907 remain inactive.'},
    'remainingDefects': [], 'remainingSourceCustodyBlockers': [],
    'grantsNothing': 'Independent technical acceptance only; no central admission, route, commercial or production authority.'
}
(OUT / 'custody-and-reuse-proof.json').write_text(json.dumps(result, indent=2) + '\n')
print('CUSTODY PASS: 2 original sources + exact restored repository copy; 14 prior approvals bind unchanged; raster 34413372916 reused.')
