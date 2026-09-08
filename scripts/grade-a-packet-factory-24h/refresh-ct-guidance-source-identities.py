#!/usr/bin/env python3
"""Compare exact CT source anchors and refresh source identities; grants no treatment."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/treatment-reconciliation/ct-guidance'
CENSUS = 'data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json'
COUNSEL = 'data/rcap-ledger/completed-output-counsel-manifest.json'
ROUTES = [
    'obligation:track-only:CT:ct-destruction-request',
    'obligation:track-only:CT:ct-provisional-pardon',
    'obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure',
]
BASES = {CENSUS: '21d53521ff4d6a1dd24f9d5fb0fd56a6258a6f14', COUNSEL: 'eab70f9265c837929c0b73fc208e6c5c1db80670'}
sha = lambda b: hashlib.sha256(b).hexdigest()
canonical = lambda obj: json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()


def anchors(document, source, route):
    if source == CENSUS:
        rows = [r for r in document['routes'] if r['routeKey'] == route]
        assert len(rows) == 1, 'Exact CT census identity missing or duplicated'
        return {'exactFullRouteObject': rows[0]}
    rows = [r for r in document['families'] if r['familyId'] == 'rcap-ct-guidance-implementation']
    assert len(rows) == 1, 'Exact CT counsel family missing or duplicated'
    assert route.split(':')[3] in rows[0]['tracksServed']
    # The only changed global item is the count of unrelated missing bridges.
    global_authority = {k: v for k, v in document.items() if k not in ('families', 'exceptions')}
    exceptions = {k: v for k, v in document['exceptions'].items() if k != 'pathwaysWithNoFamilyBridge'}
    return {'exactFullCounselFamily': rows[0], 'globalAuthority': global_authority, 'applicableExceptions': exceptions}


def main():
    sources = {}
    for source, base in BASES.items():
        before = subprocess.check_output(['git', 'show', base + ':' + source], cwd=ROOT)
        after = (ROOT / source).read_bytes()
        sources[source] = (before, after, json.loads(before), json.loads(after))
    pending, packet_before = [], {}
    for route in ROUTES:
        family = 'agency-application-treatment:' + route
        directory = ROOT / 'data/rcap-all50/overlays/census-v1/ct' / (family.lower().replace('_', '-') + '--official-pdf-fill')
        target = directory / 'source-receipt.json'
        before_receipt = target.read_bytes()
        receipt = json.loads(before_receipt)
        assert receipt['familyId'] == family and receipt['routeKeys'] == [route]
        changes = []
        for source, (before, after, old, new) in sources.items():
            pins = [p for p in receipt['compositionSources'] if p['path'] == source]
            assert len(pins) == 1
            pin = pins[0]
            old_anchors, new_anchors = anchors(old, source, route), anchors(new, source, route)
            assert old_anchors == new_anchors, 'Bound CT content changed: ' + source
            if pin['sha256'] == sha(after) and pin['byteLength'] == len(after):
                continue  # Preserve any existing still-current source note verbatim.
            assert pin['sha256'] == sha(before) and pin['byteLength'] == len(before), 'Unmeasured source preimage'
            pin['identityRefresh'] = {
                'refreshedOn': '2026-09-08',
                'was': {'sha256': pin['sha256'], 'byteLength': pin['byteLength']},
                'recoveredFromCommit': BASES[source],
                'previousIdentityRefresh': copy.deepcopy(pin.get('identityRefresh')),
                'routeKeys': [route],
                'anchorsCompared': len(old_anchors), 'anchorsIdentical': len(old_anchors),
                'identicalAnchorSha256': {k: sha(canonical(v)) for k, v in old_anchors.items()},
                'why': 'Compared the exact full CT route object, or exact full CT counsel family and unchanged global authority and applicable exception records, against historical bytes matching the prior pin. Only unrelated source-record contents and aggregate counts changed. This refresh changes no guide, legal determination, actor obligation, review, or acceptance.'
            }
            pin['sha256'], pin['byteLength'] = sha(after), len(after)
            changes.append({'source': source, 'beforeSha256': sha(before), 'afterSha256': sha(after), 'anchorSha256': pin['identityRefresh']['identicalAnchorSha256']})
        for pdf in sorted((directory / 'fixtures').glob('*.pdf')):
            packet_before[str(pdf.relative_to(ROOT))] = sha(pdf.read_bytes())
        encoded = (json.dumps(receipt, indent=2, ensure_ascii=False) + '\n').encode()
        pending.append((target, encoded, {'familyId': family, 'receiptPath': str(target.relative_to(ROOT)), 'beforeSha256': sha(before_receipt), 'afterSha256': sha(encoded), 'changes': changes}))
    # Validate all three before writing any receipt. Preserve all other fields.
    for target, encoded, row in pending:
        if row['changes']:
            target.write_bytes(encoded)
    assert all(sha((ROOT / path).read_bytes()) == digest for path, digest in packet_before.items())
    report = {'schemaVersion': 'rcap-source-anchor-refresh/v1', 'result': 'SOURCE_IDENTITIES_REFRESHED', 'createsAcceptance': False, 'newLegalDecision': False, 'changedPinCount': sum(len(r['changes']) for _, _, r in pending), 'receipts': [r for _, _, r in pending], 'unchangedPacketSha256': packet_before, 'scopeLimits': ['No claim that other CT census objects are unchanged.', 'No artifact approval is carried by source identity refresh.', 'Current portal handoff content, where changed separately, needs independent delta review.']}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'source-identity-refresh.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'changedPins': report['changedPinCount'], 'unchangedPDFs': len(packet_before), 'acceptanceGranted': False}))


if __name__ == '__main__':
    main()
