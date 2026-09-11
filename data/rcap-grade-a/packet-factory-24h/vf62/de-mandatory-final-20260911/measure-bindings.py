"""Read the exact DE mandatory candidate and persist bounded independent proof."""
from pathlib import Path
import datetime, hashlib, json, re, struct, subprocess

ROOT = Path(__file__).resolve().parents[5]
assert ROOT == Path('/tmp/rcap-vf62-pa-final-20260911')
OUT = Path(__file__).resolve().parent
FAMILY = 'de_mandatory_expungement-set'
FAM = 'data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill'
FACTORY = 'data/rcap-grade-a/packet-factory-24h'
PRIOR = FACTORY + '/vf01/rows.json'
BASE = 'd4653b258e2b09eebad4ec2b51edadbf9a26ae98'
ASSIGNED = 'da0f83e4537c33baa50b2be54e518fdf1320134e'
DECISION = 'data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json'
DECISION_ID = 'DE-MANDATORY-SBI-ADMINISTRATIVE-PATHWAY'
REGISTRY = 'data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json'
ORIGINAL = Path('/tmp/rcap-original-34628970364/de-10275039881')
RASTER = FACTORY + '/raster-runs/34628970364'
def read(p): return (ROOT / p).read_bytes()
def load(p): return json.loads(read(p))
def sha(b): return hashlib.sha256(b).hexdigest()
def canon(o): return json.dumps(o, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()
def pin(p):
    b = read(p)
    return {'path': str(p), 'sha256': sha(b), 'byteLength': len(b)}
def old(p): return subprocess.check_output(['git', 'show', BASE + ':' + p], cwd=ROOT)
def diff(a, b, p=''):
    if isinstance(a, dict) and isinstance(b, dict):
        return [x for k in sorted(a.keys() | b.keys()) for x in diff(a.get(k), b.get(k), p + '/' + k)]
    if isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        return [x for i, (a1, b1) in enumerate(zip(a, b)) for x in diff(a1, b1, p + '/' + str(i))]
    return [] if a == b else [p]

head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
subprocess.run(['git', 'merge-base', '--is-ancestor', ASSIGNED, head], cwd=ROOT, check=True)
prior_index, prior = next((i, r) for i, r in enumerate(load(PRIOR)['rows'])
    if r.get('itemId') == FAMILY and r.get('verifiedAtBase') == BASE)
assert prior_index == 109 and prior['verdict'] == 'BLOCKED_LEGAL_INPUT'
assert len(prior['proofObligations']) == 15
assert prior['proofObligations']['COMPONENT_SET']['result'] == 'BLOCKED_LEGAL_INPUT'
reuse = [k for k, v in prior['proofObligations'].items() if v['result'] == 'PASS']
assert len(reuse) == 14
files = []
tracked = subprocess.check_output(['git', 'ls-files', FAM], cwd=ROOT, text=True).splitlines()
prior_tracked = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', BASE, FAM], cwd=ROOT, text=True).splitlines()
assert tracked == prior_tracked
for p in tracked:
    b, ob = read(p), old(p)
    r = {**pin(p), 'priorSha256': sha(ob), 'byteIdenticalToPriorVF01': b == ob}
    if b != ob:
        assert p in [FAM + '/source-receipt.json', FAM + '/product-wiring.json']
        r['changedJsonPointers'] = diff(json.loads(ob), json.loads(b))
    if p.endswith('.pdf'):
        info = subprocess.check_output(['pdfinfo', str(ROOT / p)], text=True)
        r['pageCount'] = int(re.search(r'^Pages:\s+(\d+)', info, re.M)[1])
        assert r['pageCount'] == 4 and b == ob
    files.append(r)
receipt = load(FAM + '/source-receipt.json')
source_bindings = []
for s in receipt['compositionSources']:
    r = pin(s['path'])
    assert r['sha256'] == s['sha256'] and r['byteLength'] == s['byteLength']
    r.update(currentBytesHashedHere=True, matchesCurrentReceipt=True,
             byteIdenticalToPriorVF01=read(s['path']) == old(s['path']), priorSha256=sha(old(s['path'])))
    if not r['byteIdenticalToPriorVF01']: assert s['path'] == REGISTRY
    source_bindings.append(r)
assert len(source_bindings) == 9

a, b = json.loads(old(REGISTRY)), load(REGISTRY)
assert {k: v for k, v in a.items() if k != 'reconciliation42'} == {k: v for k, v in b.items() if k != 'reconciliation42'}
ar, br = a['reconciliation42'], b['reconciliation42']
assert ar.keys() == br.keys()
assert {k: v for k, v in ar.items() if k not in ['families', 'acquisitionEvidencePaths']} == {
    k: v for k, v in br.items() if k not in ['families', 'acquisitionEvidencePaths']}
assert [r['familyId'] for r in ar['families']] == [r['familyId'] for r in br['families']]
changed = [x['familyId'] for x, y in zip(ar['families'], br['families']) if x != y]
assert changed == ['census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement']
added = [p for p in br['acquisitionEvidencePaths'] if p not in ar['acquisitionEvidencePaths']]
assert added == [FACTORY + '/checkpoint-232-to-250/ut-pcra-source-adoption-20260911.json']
assert [p for p in br['acquisitionEvidencePaths'] if p not in added] == ar['acquisitionEvidencePaths']
de_entry = next(x for x in br['families'] if x['familyId'] == FAMILY)
assert de_entry == next(x for x in ar['families'] if x['familyId'] == FAMILY)
registry_proof = {'path': REGISTRY, 'priorSha256': sha(old(REGISTRY)), 'currentSha256': sha(read(REGISTRY)),
    'exactDeEntrySha256': sha(canon(de_entry)), 'deEntryIdentical': True,
    'globalAuthoritySharedBindingsAndAllOtherUnlistedEntriesIdentical': True,
    'familyOrderingPreserved': True, 'changedFamilyIds': changed, 'addedEvidencePaths': added,
    'scope': 'Structural identity comparison only. No other family source or legal substance was reviewed.',
    'whyPriorRefreshNamedTwoFamilies': 'The intermediate registry also recorded the DE pardon custody hold; current restoration returns that unrelated entry to its prior-VF01 content. Direct current-versus-VF01 comparison therefore finds only UT PCRA changed.'}

records = []
for p, arr, key, target in [
    ('data/record-clearing/legal-design-track-registry.json', 'tracks', 'trackId', 'de_mandatory_expungement'),
    ('data/record-clearing/legal-design-packet-set-manifests.json', 'packetSets', 'packetSetId', FAMILY)
]:
    c, o = load(p), json.loads(old(p))
    ce = next(x for x in c[arr] if x[key] == target)
    oe = next(x for x in o[arr] if x[key] == target)
    assert ce == oe
    assert {k: v for k, v in c.items() if k != arr} == {k: v for k, v in o.items() if k != arr}
    records.append({'path': p, 'exactEntryId': target, 'exactEntrySha256': sha(canon(ce)),
                    'entryAndGlobalMetadataIdenticalToPriorVF01': True})
decision = next(x for x in load(DECISION)['decisions'] if x['decisionId'] == DECISION_ID)
assert decision['disposition'] == 'LEGAL_CLEAR' and decision['familyIds'] == [FAMILY]
assert 'SBI-controlled administrative pathway' in decision['bindingProductRule']
assert 'must not manufacture a fictional court application' in decision['bindingProductRule']
wiring = load(FAM + '/product-wiring.json')
report = load(FAM + '/reports/rendered-artifacts.json')
field_map = load(FAM + '/production-field-map.json')
assert wiring['routeKeys'] == receipt['routeKeys'] == json.loads(old(FAM + '/product-wiring.json'))['routeKeys']
assert wiring['binding']['deliveryType'] == 'process_guidance' and wiring['binding']['filingPermitted'] is False
assert report['componentSet'] == receipt['composedComponentsAuthoredByThisBuild'] == ['agency_preparation_guide']
assert wiring['binding']['packetComponents'] == ['agency_preparation_guide']
assert not wiring['binding']['paymentEligible'] and not wiring['binding']['sponsorshipEligible']
for artifact in report['artifacts']:
    assert artifact['components'] == artifact['documents'] == ['agency_preparation_guide']
    assert [p['packetPage'] for p in artifact['pageManifest']] == [1, 2, 3, 4]
    assert all(p['component'] == p['documentId'] == 'agency_preparation_guide' for p in artifact['pageManifest'])

def norm(s): return re.sub(r'\s+', ' ', s).strip()
memo = next(t for t in load('data/record-clearing/legal-design-intake/DE.memo.json')['tracks'] if t['trackId'] == 'de_mandatory_expungement')
instructions = read(FAM + '/participant-instructions.md').decode()
stops = memo['selfHelpStopConditions']
assert len(stops) == 9 and all(norm(s) in norm(instructions) for s in stops)
assert 'There is no checkout and nothing to file from this guide.' in instructions
assert 'Do not submit it to a court or agency.' in instructions
for kind in ['canonical', 'boundary']:
    text = subprocess.check_output(['pdftotext', '-layout', str(ROOT / FAM / 'fixtures' / (kind + '.pdf')), '-'], text=True)
    assert all(norm(s.replace('§', 'Sec.')) in norm(text) for s in stops)
    assert 'Certified Delaware criminal history' in text
    assert 'Do not sign or date this guide.' in text
    assert 'is not filed or submitted anywhere' in norm(text)
    assert '27S23V' in text and '27RVGT' in text and '$72' in text and '$75' in text
    assert [p.count('Check with:') for p in text.split('\f')[:4]] == [0, 0, 0, 7]

verdict_path = RASTER + '/' + FAMILY + '.verdict.json'
inventory_path = RASTER + '/' + FAMILY + '.PAGE_IMAGES_SHA256.json'
verdict = load(verdict_path)
assert read(verdict_path) == (ORIGINAL / (FAMILY + '.verdict.json')).read_bytes()
inventory = load(inventory_path)
assert inventory == json.loads((ORIGINAL / 'PAGE_IMAGES_SHA256.json').read_bytes())
assert verdict['verdict'] == 'RASTER_PASS' and verdict['pagesMeasured'] == 8
assert str(verdict['workflowRunId']) == '34628970364' and len(inventory) == 8
for fixture in ['canonical', 'boundary']:
    assert verdict['hashesBound'][fixture]['pinned'] == sha(read(FAM + '/fixtures/' + fixture + '.pdf'))
pngs = []
for item in inventory:
    data = (ORIGINAL / item['member']).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    dimensions = struct.unpack('>II', data[16:24])
    assert dimensions == (2448, 3168)
    assert len(data) == item['bytes'] and sha(data) == item['sha256']
    measurement = next(m for m in verdict['measurements'] if m['png'] == item['member'])
    assert measurement['pngSha256'] == sha(data) and measurement['bytes'] == len(data)
    assert (item['pngWidth'], item['pngHeight']) == (measurement['paper']['width'], measurement['paper']['height']) == (2040, 2640)
    pngs.append({'member': item['member'], 'sha256': sha(data), 'byteLength': len(data),
                 'actualPngIhdrDimensions': dimensions, 'receiptMeasuredPaperDimensions': [item['pngWidth'], item['pngHeight']]})
original_receipt = load(RASTER + '/ORIGINAL_EVIDENCE_VERIFIED.json')
archive = next(a for a in original_receipt['artifacts'] if str(a['id']) == '10275039881')
assert sha(Path(archive['localZip']).read_bytes()) == archive['zipSha256']
builder = 'scripts/build-census-v1-de_mandatory_expungement-set.mjs'
assert read(builder) == old(builder)
proof = {'schemaVersion': 'rcap-current-guidance-independent-binding-proof/v1', 'familyId': FAMILY,
    'measuredAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'preflight': {'assignedBase': ASSIGNED, 'actualHead': head, 'worktree': str(ROOT),
        'branch': 'vf62-pa-final-20260911', 'assignedBaseIsAncestor': True, 'preexistingUntracked': ['private'],
        'grantSet': 'a4767d19bcace15c', 'claimCanAssertExit': 0, 'claimAssertExit': 0,
        'claimResult': 'CLAIM_OK VF62 de_mandatory_expungement-set (independent-verification, grant set a4767d19bcace15c)'},
    'priorIndependentReview': {**pin(PRIOR), 'rowIndex': prior_index, 'verifiedAtBase': BASE,
        'exactRowSha256': sha(canon(prior)), 'results': {'PASS': 14, 'BLOCKED_LEGAL_INPUT': 1}},
    'familyFiles': files, 'sourceBindings': source_bindings, 'registryRefreshProof': registry_proof,
    'recordAnchors': records, 'builder': {**pin(builder), 'byteIdenticalToPriorVF01': True},
    'decision': {**pin(DECISION), 'exactDecision': decision},
    'freshComponentJudgment': {'result': 'PASS', 'priorResult': 'BLOCKED_LEGAL_INPUT',
        'basis': 'The binding final decision expressly permits preparation information/instructions on the SBI-controlled administrative pathway and forbids a fictional court application. This exact guide is one agency_preparation_guide component covering all four pages of both outputs, names SBI, disclaims filing/submission and directs the participant to SBI-controlled subsequent paperwork. The legacy primary_filing label does not create an owed participant-authored application under the resolved rule.',
        'filedInstrumentDelivered': False, 'guideCompleteness': 'One required certified-history document, seven labeled fact checkpoints, all nine memo stop conditions, SBI contact and conditional agency paperwork/fee instructions remain present in current text. Unchanged fee/waiver and substantive source approval is reused; no current-law research was performed.'},
    'priorValidApprovalsReused': reuse,
    'freshRasterBinding': {'workflowRunId': '34628970364', 'packetCommitSha': verdict['packetCommitSha'],
        'artifactId': '10275039881', 'zipSha256': archive['zipSha256'], 'verdict': 'RASTER_PASS',
        'documents': 2, 'pages': 8, 'verdictEvidence': pin(verdict_path), 'inventoryEvidence': pin(inventory_path),
        'originalArtifactRoot': str(ORIGINAL), 'originalZipHashedHere': True, 'originalPngsHashedHere': pngs,
        'dimensionProvenance': 'Actual PNG canvas IHDR is 2448x3168. Inventory pngWidth/pngHeight mean measured paper dimensions 2040x2640: the original packet-commit raster producer assigns Math.round(render.paper.width/height) to those keys. ORIGINAL_EVIDENCE_VERIFIED.json explicitly records both actualCanvasPx and measurementPaperPx. No false claim that the PNG canvas is 2040x2640 is made; pixel geometry is not remeasured here.',
        'freshPixelReview': False, 'localRender': False,
        'visualReuse': 'VF01 independently rendered and inspected all eight pages of these exact unchanged PDF hashes at d4653b258e2b09eebad4ec2b51edadbf9a26ae98. That approval remains valid. Fresh original PNG bytes and dimensions were hashed here solely to bind the accepted current raster, without repeating the visual review.'},
    'commands': [
        {'command': 'MASTER_LIBRARY_SOURCE_DIR=/workspaces/legalease-partner-dashboard-clean/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1 RCAP_NO_LOCAL_RASTER=1 node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family de_mandatory_expungement-set', 'exitCode': 0, 'result': 'PASS_COMPLETE; 5/12 written; all nine counters zero', 'scope': 'Actual read-only current CLI readings. Visual and write substance remains supported by explicitly reused prior independent measurements.'},
        {'command': 'node scripts/grade-a-packet-factory-24h/test-de-mandatory-expungement-record-disclosures.mjs', 'exitCode': 0, 'result': 'DE_MANDATORY_DISCLOSURES_OK: one required document, required-before-filing limitation, filing rule and nine stops present', 'scope': 'Read-only instructions and production body function test; actual PDF text was separately checked here.'}],
    'retainedRecordDiscrepancy': {'status': 'UNCHANGED_NONBLOCKING_PRIOR_FINDING', 'where': 'production-field-map.json requiredBeforeFiling and map refusal page metadata',
        'finding': 'Seven guide checkpoints still declare page 1 while all seven actually print together on page 4. Prior VF01 recorded this exact discrepancy without failing an obligation because all blanks are present, labeled and disclosed. Text extraction confirms the same condition; it is retained, not silently erased or represented as a repaired measurement.'},
    'historicalRasterDiscrepancyResolved': 'product-wiring now binds current fe611676/45f57fe5 four-page fixtures and accepted raster34628970364. Old three-page raster retained only as withdrawn history.',
    'remainingBlockingDefects': [], 'limits': ['No new legal or source-substance review; source currency limitations and prior case-specific stop conditions remain.', 'No new pixel review or rendering; valid prior current-byte visual findings reused.', 'Pure adapter validation does not perform admission, install runtime, permit filing or confer commercial authority.']}
(OUT / 'binding-and-decision-proof.json').write_text(json.dumps(proof, indent=2) + '\n')
print('BINDINGS PASS: nine current sources; exact two four-page PDFs; prior14 approvals reusable; component decision resolved; original eight PNG identities match.')
