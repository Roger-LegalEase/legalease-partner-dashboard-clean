#!/usr/bin/env python3
"""Read-only receipt/publication reconciliation for the exact 183 snapshot."""
import collections
import hashlib
import json
from pathlib import Path
import re
import runpy
import subprocess
import sys
import zipfile

sys.dont_write_bytecode = True
BASE = '9f35db281d8de2664498a7f1d849976c31b925f1'
CANDIDATE = '774e1c3e3fa7ffd8e4f2aefea384440e4b1dab90'
PUBLICATION = '34aa4f25c319afcb9ced897bc00a4875993c6351'
OUT = Path(__file__).resolve().parent
CENTRAL = Path('data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/resume-central-34232991361')
raw = lambda commit, path: subprocess.check_output(['git', 'show', commit + ':' + str(path)])
read = lambda commit, path: json.loads(raw(commit, path))
local = lambda path: json.loads(Path(path).read_text())
sha = lambda bytes: hashlib.sha256(bytes).hexdigest()
terminal = {'COMPLETE_PACKET_PROVEN', 'GUIDANCE_READY', 'HANDOFF_READY', 'OUT_OF_SCOPE'}
old = read(BASE, 'data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json')
master = read(PUBLICATION, 'data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json')
old_members = {f['familyId'] for f in old['families'] if f['state'] in terminal}
members = {f['familyId'] for f in master['families'] if f['state'] in terminal}
assert len(old_members) == 179 and len(members) == 183
assert not old_members - members
gained = sorted(members - old_members)
assert set(gained) == {'mi_setaside_application-set', 'mi_setaside_first_owi-set', 'md_10105_favorable-set', 'census-pending-family:WA:juvenile-record-sealing-under-rcw-13-50-260'}
queue = read(PUBLICATION, 'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')
helper = Path('scripts/rcap-packet-recovery/session10/admit-central-batch.py')
ns = runpy.run_path(str(helper))
assert sha(helper.read_bytes()) == 'b2e7c5ee087dfe9d00ea533c2d3ca02dec3639a929c2741a3ee808c28f61608b'
inventory = read(CANDIDATE, ns['INVENTORY'])
families = ['mi_setaside_application-set', 'mi_setaside_first_owi-set', 'md_10105_favorable-set', 'ky_nonconviction_expungement-set']
verified = []
for family in families:
    config = local(CENTRAL / family / 'config.json')
    expected = next(f for f in inventory['families'] if f['familyId'] == family)
    item = config['artifacts'][family]
    artifact = local(item['metadataPath'])
    run, jobs = local(config['runPath']), local(config['jobsPath'])
    job_id = ns['provenance'](config, family, run, jobs, artifact)
    archive = Path(item['zipPath'])
    zip_hash = sha(archive.read_bytes())
    assert artifact['digest'] == 'sha256:' + zip_hash
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
        assert len(names) == len(set(names))
        verdict_bytes = z.read(family + '.verdict.json')
        verdict = json.loads(verdict_bytes)
        images = {name: z.read(name) for name in names if re.search(r'/page-\d+\.png$', name)}
        calibrations = [name for name in names if name.endswith('/page-calibration.png')]
    pages = ns['validate'](config, expected, verdict, images)
    assert sha(archive.read_bytes()) == zip_hash
    row = next(row for row in queue['rows'] if row['familyId'] == family)
    fam = next(f for f in master['families'] if f['familyId'] == family)
    admitted = fam['state'] == 'COMPLETE_PACKET_PROVEN'
    scope = None
    if admitted:
        receipt = row['rasterReceipt']
        assert row['currentRasterState'] == 'RASTER_PASS'
        for key in ['canonicalPdfPath', 'boundaryPdfPath', 'canonicalPdfSha256', 'boundaryPdfSha256', 'documentsDigest']:
            assert row[key] == expected[key]
        assert raw(PUBLICATION, receipt['verdictPath']) == verdict_bytes
        proof = read(PUBLICATION, receipt['verificationPath'])
        assert proof['pageImages'] == pages
        assert proof['jobId'] == job_id and proof['artifactId'] == artifact['id']
        assert proof['artifactDigest'] == artifact['digest']
        for metadata_path in [item['metadataPath'], config['runPath'], config['jobsPath']]:
            assert raw(PUBLICATION, metadata_path) == Path(metadata_path).read_bytes()
        wiring = read(PUBLICATION, fam['directory'] + '/product-wiring.json')
        binding = wiring['binding']
        accepted = binding['acceptanceReceipt']
        for key in ['verdict', 'workflowRunId', 'jobId', 'boundToCanonicalSha256', 'boundToBoundarySha256', 'coversTheWholeFamily', 'documentsMeasured', 'pagesMeasured', 'documentsCovered', 'documentsDigest']:
            assert accepted[key] == receipt[key]
        assert str(accepted['artifactId']) == str(artifact['id'])
        assert wiring['status'] == 'DECLARED_NOT_INSTALLED' and wiring['authorityCreated'] == 'none'
        assert wiring['runtimeInstalled'] is False and wiring['currentState']['generationAllowed'] is False
        assert wiring['currentState']['runtimeSelectable'] is False
        assert all(binding[key] is False for key in ['paymentEligible', 'sponsorshipEligible', 'runtimeInstalled', 'generationAllowed', 'filingPermitted'])
        delivery = binding['conditionalDelivery']
        assert delivery['explicitSelectionRequired'] is True and delivery['defaultBranch'] is None
        fixtures = delivery['fixtureBindings']
        assert len(fixtures) == len(expected['documents'])
        assert {f['file']: f['sha256'] for f in fixtures} == {d['path']: d['sha256'] for d in expected['documents']}
        assert all(f['filingPermitted'] is False and f['participantExecutionCompleted'] is False and f['grantsDeliveryAuthority'] is False for f in fixtures)
        independent = delivery.get('independentReview', delivery.get('independentCandidateReview'))
        if 'file' in independent:
            assert sha(raw(PUBLICATION, independent['file'])) == independent['sha256']
            assert raw(PUBLICATION, independent['file']) == raw(CANDIDATE, independent['file'])
        scope = dict(lastIndependentVerification=binding['lastIndependentVerification'], independentReview=independent,
            fixtureOutcomes=dict(collections.Counter(f.get('expectedOutcome', 'EXPLICIT_SELECTED_UNEXECUTED_DRAFT') for f in fixtures)),
            allFilingAndDeliveryPermissionsFalse=True)
    else:
        assert family == 'ky_nonconviction_expungement-set'
        assert row['currentRasterState'] == 'RASTER_PENDING'
    verified.append(dict(familyId=family, documents=len(expected['documents']), pages=len(pages),
        calibrationImagesRetained=len(calibrations), workflowRunId=config['runId'], jobId=job_id,
        artifactId=artifact['id'], artifactZipSha256=zip_hash, immutableMetadataAndPageInventoryValid=True,
        packetCommit=config['packetCommit'], publishedTerminalAtSnapshot=admitted, receiptMatchesPublishedWiring=admitted,
        retainedScope=scope, sourceRunStatus=run['status'], sourceRunConclusion=run.get('conclusion')))

preserved_paths = [
    'scripts/rcap-packet-recovery/chat1/declared-whole-review-anchor.mjs',
    'scripts/rcap-packet-recovery/chat1/test-declared-whole-review-anchor.mjs',
    'scripts/grade-a-packet-factory-24h/chat-review-inputs.mjs',
    'scripts/grade-a-packet-factory-24h/test-chat-review-inputs.mjs',
    'scripts/grade-a-packet-factory-24h/conditional-raster-documents.mjs',
    'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/mi-mo-closure/declared-anchor-root-independent-review.json',
    'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/ga-warning-closure/plural-supersession-independent-review.json',
]
preserved = []
for path in preserved_paths:
    prior, current = raw(CANDIDATE, path), raw(PUBLICATION, path)
    assert prior == current
    preserved.append(dict(path=path, sha256=sha(current), unchangedSinceFrozenCandidate=True))
ga = next(f for f in inventory['families'] if f['familyId'] == 'ga-nonconv-pre2013-set')
assert len(ga['documents']) == 15 and sum(d['pageCount'] for d in ga['documents']) == 108
assert collections.Counter(d['selectionKind'] for d in ga['documents']) == {'diagnostic': 3, 'conditional_packet_example': 12}
assert all(d['filingReady'] is False for d in ga['documents'])
report = dict(scope='Independent actual per-family receipt, published wiring, immutable candidate and terminal membership reconciliation; no admission',
    recoveredRemote=BASE, verifiedPublication=PUBLICATION, frozenPacketCandidate=CANDIDATE,
    census=dict(before=179, after=183, delta=4, gainedFamilyIds=gained, removedFamilyIds=[],
        meaning='Three central packet admissions plus the separately published Washington guidance terminal; Kentucky is not included at this snapshot'),
    actualReceipts=verified, preservedControlsAndIndependentEvidence=preserved,
    georgia=dict(requiredWholePdfs=15, requiredPages=108, diagnostics=3, conditionalExamples=12, allFilingReadyFalse=True, actualReceiptInspected=False),
    testsRerun=False, mutationSuitesReusedUnchanged=True, blockingFindings=[],
    runtimeInstalled=False, productionChanged=False, sharedFilesEdited=False)
(OUT / 'published-batch-183-review.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(dict(publishedTerminal=183, delta=4, newPacketAdmissions=3, receiptsVerified=4,
    documents=sum(r['documents'] for r in verified), pages=sum(r['pages'] for r in verified), blockers=0,
    evidence=str(OUT / 'published-batch-183-review.json'))))
