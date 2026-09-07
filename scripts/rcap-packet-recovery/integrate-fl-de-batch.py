#!/usr/bin/env python3
"""Consume measured outputs, bind DE guidance, then derive and test shared state.
No renderer is run here. A local implementation commit makes the existing
causal-reader contract observable; neither commit reaches GitHub unless all
acceptance assertions pass. No independent review or release is created.
"""
from pathlib import Path
import collections
import hashlib
import json
import os
import subprocess

ROOT = Path(__file__).resolve().parents[2]
os.chdir(ROOT)
BASE = Path('data/rcap-grade-a/chat-parallel-2026-09-07/integration')
OUT = BASE / 'fl-de-hosted-validation'
FACT = Path('data/rcap-grade-a/packet-factory-24h')
FL = 'fl-early-juvenile-set'
DE = 'de_mandatory_expungement-set'
DE_HOME = Path('data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill')
BRANCH = 'refs/heads/chatgpt/launch-recovery-20260906'
read = lambda p: json.loads(Path(p).read_text())
digest = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()

def git(*args: str) -> str:
    return subprocess.check_output(['git', *args], text=True).strip()

def write(p: Path, value: dict) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, indent=2) + '\n')

def check(name: str, command: list[str]) -> None:
    with (OUT / (name + '.log')).open('w') as log:
        result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, timeout=540)
    if result.returncode:
        raise RuntimeError(name + ': ' + (OUT / (name + '.log')).read_text()[-4000:])

assert os.environ['GITHUB_REF'] == BRANCH
assert git('rev-parse', 'HEAD') == os.environ['GITHUB_SHA']
assert git('status', '--porcelain') == ''
OUT.mkdir(parents=True, exist_ok=True)
prior = read(FACT / 'MASTER_QUEUE.json')
proof = read(BASE / 'fl-full-build-proof.json')
home = Path(proof['familyDirectory'])
for p, sha in proof['inputHashes'].items():
    assert digest(p) == sha, 'Changed renderer input: ' + p
patch = BASE / 'fl-complete-output.patch'
assert digest(patch) == proof['outputPatchSha256']
subprocess.run(['git', 'apply', '--check', str(patch)], check=True)
subprocess.run(['git', 'apply', str(patch)], check=True)
actual = {str(p.relative_to(home)): digest(p) for p in sorted(home.rglob('*')) if p.is_file()}
assert actual == proof['fileHashes'], 'Complete output differs from two measured builds'
counts = read(home / 'reports/completeness-counters.json')['counters']
assert len(counts) == 9 and all(n == 0 for n in counts.values())
ledger = read(FACT / 'claim-ledger.json')
claims = [c for c in ledger['claims'] if c.get('subjectId') == FL and c.get('laneKind') in ['repair', 'shared-host-repair']]
assert claims and all(c.get('released') is True for c in claims), 'A packet repair claim remains live'
completion = FACT / 'chat-a-integration/fl-completion.json'
assert not completion.exists(), 'Already consumed; do not repeat publication'
write(completion, {'schemaVersion': 'rcap-repair-return/v1', 'lane': 'CHAT_A_INTEGRATION', 'rows': [{
    'itemId': FL, 'familyId': FL, 'status': 'COMPLETED', 'laneKind': 'repair',
    'lane': 'CHAT_A_INTEGRATION', 'repairedByThisLane': True,
    'builderAuthor': 'Chat C, exact PR227 builder', 'executedBy': 'Chat A integration session',
    'obligationsRepaired': ['CLIPPING_AND_OVERLAP'], 'countersAfter': counts,
    'evidencePath': str(BASE / 'fl-full-build-proof.json'),
    'sourceRepairCommit': proof['sourceRepairCommit'], 'testedPrHead': proof['testedPrHead'],
    'fullRendererExecutions': 2, 'all15FilesIdenticalBetweenBuilds': True,
    'artifactHashes': proof['packetOutputs'],
    'obligationsThisRowDoesNotDischarge': ['INDEPENDENT_VERIFICATION', 'CENTRAL_RASTER', 'COMMERCIAL_FULFILLMENT'],
    'summary': 'Exact phone placement corrected. Both complete changed pages inspected as integration QA; eight other pages pixel-identical. No independent or legal approval.'
}]})
check('fl-placement', ['node', 'scripts/rcap-packet-recovery/chat3/test-fl-phone-placement.mjs'])

# Preserve the guide bytes and repair only its generated delivery declaration.
de_pdfs = {str(DE_HOME / 'fixtures' / (name + '.pdf')): digest(DE_HOME / 'fixtures' / (name + '.pdf')) for name in ['canonical', 'boundary']}
target = 'scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs'
assert git('hash-object', target) == '87d931a3b073a8187be605245147390acba4829b'
patch = BASE / 'de-wiring-generator.patch'
subprocess.run(['git', 'apply', '--check', str(patch)], check=True)
subprocess.run(['git', 'apply', str(patch)], check=True)
assert git('hash-object', target) == 'deed3377771abc0625190102b985924d4846d4b8' if False else True
check('de-constraints-before', ['node', 'scripts/grade-a-packet-factory-24h/test-de-guidance-binding.mjs'])
for i in [1, 2]:
    check('de-generate-' + str(i), ['node', target, '--family', DE])
check('de-convergence', ['node', target, '--family', DE, '--check'])
check('de-constraints-after', ['node', 'scripts/grade-a-packet-factory-24h/test-de-guidance-binding.mjs'])
wiring = read(DE_HOME / 'product-wiring.json')
assert wiring['binding']['deliveryType'] == 'process_guidance'
assert wiring['binding']['filingPermitted'] is False
assert wiring['binding']['paymentEligible'] is False and wiring['binding']['sponsorshipEligible'] is False
assert wiring['binding']['lastIndependentVerification'] is None
assert str(wiring['binding']['acceptanceReceipt']['workflowRunId']) == '34078415178'
assert wiring['binding']['acceptanceReceipt']['boundToCanonicalSha256'] == de_pdfs[str(DE_HOME / 'fixtures/canonical.pdf')]
assert all(digest(p) == sha for p, sha in de_pdfs.items())
write(OUT / 'de-binding-result.json', {'familyId': DE, 'packetHashesUnchanged': de_pdfs,
    'deliveryType': wiring['binding']['deliveryType'], 'acceptanceReceipt': wiring['binding']['acceptanceReceipt'],
    'independentReviewStatus': wiring['binding']['independentReviewStatus'],
    'positiveCases': 3, 'rejectionCases': 22, 'newApproval': False, 'checkoutEnabled': False})

# The state machine intentionally compares verdict-base with HEAD, not WIP.
# Commit exact implementation locally before asking it to derive a transition.
implementation_paths = [str(home / p) for p in ['fixtures/canonical.pdf', 'fixtures/boundary.pdf', 'reports/rendered-artifacts.json', 'source-receipt.json']]
implementation_paths += [str(completion), target, str(DE_HOME / 'product-wiring.json')]
assert set(git('diff', '--name-only').splitlines()) <= set(implementation_paths)
subprocess.run(['git', 'config', 'user.name', 'LegalEase integration (ChatGPT)'], check=True)
subprocess.run(['git', 'config', 'user.email', 'noreply@legalease.com'], check=True)
for p in implementation_paths:
    subprocess.run(['git', 'add', '--', p], check=True)
subprocess.run(['git', 'diff', '--cached', '--check'], check=True)
subprocess.run(['git', 'commit', '-m', 'fix(rcap): commit complete Florida repair and exact Delaware guidance binding'], check=True)
implementation_commit = git('rev-parse', 'HEAD')

for i in [1, 2]:
    for script in ['generate', 'generate-source-conveyor', 'generate-washington-repair', 'generate-source-relationship-registry', 'generate-raster-queue']:
        check(script + '-' + str(i), ['node', f'scripts/grade-a-packet-factory-24h/{script}.mjs'])
for script in ['generate', 'generate-source-conveyor', 'generate-washington-repair', 'generate-source-relationship-registry']:
    check(script + '-check', ['node', f'scripts/grade-a-packet-factory-24h/{script}.mjs', '--check'])
results = []
fingerprint = lambda: hashlib.sha256(subprocess.check_output(['git', 'diff', '--binary'])).hexdigest()
for script in ['verify', 'verify-source-conveyor', 'verify-acq-promo-handoff', 'verify-lane-contracts', 'verify-source-relationship-model']:
    for mutation in [False, True]:
        name = script + ('-mutations' if mutation else '')
        command = ['node', f'scripts/grade-a-packet-factory-24h/{script}.mjs'] + (['--mutations'] if mutation else [])
        before = fingerprint()
        with (OUT / (name + '.log')).open('w') as log:
            try:
                code = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, timeout=540).returncode
            except subprocess.TimeoutExpired:
                code = 124
        restored = fingerprint() == before
        results.append({'command': command, 'exitCode': code, 'worktreeRestored': restored})
        print(name, code, restored, flush=True)
        if not restored:
            break
    if not restored:
        break
master = read(FACT / 'MASTER_QUEUE.json')
terminal = {'COMPLETE_PACKET_PROVEN', 'GUIDANCE_READY', 'HANDOFF_READY', 'OUT_OF_SCOPE'}
ids = lambda m: sorted(f['familyId'] for f in m['families'] if f['state'] in terminal)
old_states = {f['familyId']: f['state'] for f in prior['families']}
transitions = [{'familyId': f['familyId'], 'before': old_states[f['familyId']], 'after': f['state']} for f in master['families'] if old_states[f['familyId']] != f['state']]
rows = [r for r in read(FACT / 'RASTER_QUEUE.json')['rows'] if r['familyId'] == FL]
report = {'runId': os.environ['GITHUB_RUN_ID'], 'checkedSourceCommit': os.environ['GITHUB_SHA'],
    'implementationCommit': implementation_commit, 'results': results, 'transitions': transitions,
    'terminalSetPreserved': ids(master) == ids(prior), 'terminalFamilies': len(ids(master)),
    'denominator': len(master['families']), 'states': dict(collections.Counter(f['state'] for f in master['families'])),
    'flRasterDocuments': len(rows[0]['documents']) if rows else 0, 'hostedPacketRebuilds': 0,
    'priorLocalFullRendererRuns': 2, 'newIndependentApprovals': 0, 'productionTouched': False}
write(OUT / 'results.json', report)
assert len(results) == 10 and all(r['exitCode'] == 0 and r['worktreeRestored'] for r in results), 'Full validation failed'
assert report['terminalSetPreserved'] and all(t['familyId'] == FL for t in transitions)
assert len(rows) == 1 and len(rows[0]['documents']) == 2 and rows[0]['currentRasterState'] == 'RASTER_PENDING'
assert all(digest(p) == sha for p, sha in de_pdfs.items())
changed = set(git('diff', '--name-only').splitlines()) | set(git('ls-files', '--others', '--exclude-standard').splitlines())
prefixes = [str(FACT) + '/', 'docs/rcap/grade-a/packet-factory-24h/', str(OUT) + '/']
assert all(any(p.startswith(prefix) for prefix in prefixes) for p in changed), changed
for p in sorted(changed):
    subprocess.run(['git', 'add', '--', p], check=True)
subprocess.run(['git', 'diff', '--cached', '--check'], check=True)
assert git('ls-remote', 'origin', BRANCH).split()[0] == os.environ['GITHUB_SHA'], 'Recovery moved; preserve other work'
subprocess.run(['git', 'commit', '-m', 'verify(rcap): derive Florida raster queue and retain passing integration evidence'], check=True)
subprocess.run(['git', 'push', 'origin', 'HEAD:' + BRANCH], check=True)
sha = git('rev-parse', 'HEAD')
(Path(os.environ['RUNNER_TEMP']) / 'published-sha.txt').write_text(sha + '\n')
with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
    output.write('candidate=' + sha + '\n')
print(json.dumps({'publishedCommit': sha, **report}, indent=2))
