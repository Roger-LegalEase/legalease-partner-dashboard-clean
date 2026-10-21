"""Bounded FIX93 source review; invoke from repository root before rebuilding."""
import hashlib
import json
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent
FAMILY = Path('data/rcap-all50/overlays/census-v1/il/composed-treatment:obligation:runtime-only:il:criminal-identity-theft-mistaken-identity-relief--custom-pleading')
ROUTE = 'obligation:runtime-only:IL:criminal-identity-theft-mistaken-identity-relief'
sha = lambda data: hashlib.sha256(data).hexdigest()
prior = json.loads(Path('data/rcap-grade-a/packet-factory-24h/vf01/il-identity-current-20260906/census-source-comparison.json').read_text())
old_bytes = subprocess.check_output(['git', 'show', f"{prior['pinnedSourceCommit']}:{prior['path']}"])
current_bytes = Path(prior['path']).read_bytes()
assert sha(old_bytes) == prior['pinnedSha256']
assert sha(current_bytes) == prior['currentSha256']
old_rows = [r for r in json.loads(old_bytes)['routes'] if r['routeKey'] == ROUTE]
new_rows = [r for r in json.loads(current_bytes)['routes'] if r['routeKey'] == ROUTE]
assert len(old_rows) == len(new_rows) == 1
assert old_rows == prior['oldRow'] and new_rows == prior['currentRow']
old, new = old_rows[0], new_rows[0]
changed = sorted(k for k in old.keys() | new.keys() if old.get(k) != new.get(k))
assert changed == ['currentImplementationEvidence', 'packetFamilyId', 'packetSetId', 'requiredSourceIds']
projection = {k: new[k] for k in prior['unchangedLegalProjection']}
assert projection == {k: old[k] for k in projection} == prior['unchangedLegalProjection']

def exact_objects(value, key, expected):
    found = []
    if isinstance(value, dict):
        if value.get(key) == expected:
            found.append(value)
        for child in value.values():
            found.extend(exact_objects(child, key, expected))
    elif isinstance(value, list):
        for child in value:
            found.extend(exact_objects(child, key, expected))
    return found

records = []
for declared in json.loads((FAMILY/'source-receipt.json').read_text())['committedRecords']:
    raw = Path(declared['pathInRepository']).read_bytes()
    records.append({
        'path': declared['pathInRepository'], 'beforeDeclaredSha256': declared['sha256'],
        'actualSha256': sha(raw), 'byteLength': len(raw),
        'beforePinMatches': declared['sha256'] == sha(raw),
    })
assert [r['beforePinMatches'] for r in records] == [True, True, False]
contract = exact_objects(json.loads(Path(records[0]['path']).read_text()), 'routeKey', ROUTE.removeprefix('obligation:runtime-only:'))
profile = exact_objects(json.loads(Path(records[1]['path']).read_text()), 'id', 'criminal-identity-theft-mistaken-identity-relief')
assert len(contract) == len(profile) == 1
for name, obj in [('route-contract-reviewed.json', contract[0]), ('compiled-pathway-reviewed.json', profile[0])]:
    (OUT/name).write_text(json.dumps(obj, indent=2, ensure_ascii=False) + '\n')
proof = {
    'base': subprocess.check_output(['git','rev-parse','HEAD'], text=True).strip(),
    'routeKey': ROUTE, 'sourceRecordCount': len(records), 'records': records,
    'historicalCensusCommit': prior['pinnedSourceCommit'], 'historicalCensusSha256': sha(old_bytes),
    'currentCensusSha256': sha(current_bytes), 'wholeRowsEqual': old == new,
    'changedFields': {k: {'before': old[k], 'after': new[k]} for k in changed},
    'unchangedLegalProjection': projection,
    'reviewConclusion': 'The four changes add family/set ownership and packet-specification/integration evidence. They do not alter the exact route, authority, participant instrument, recorded destination, legal-review state or LD-IL-04 association. Complete rows are not equivalent. The unchanged contract and compiled pathway are reviewed separately for the actual arrest-circuit destination and participant-supplied arrest-circuit fact.',
    'captionClassification': 'The dotted IN THE ... COURT line is a required participant-supplied arrest-circuit caption. Neither fixture holds an arrest circuit. The destination remains the chief judge of the circuit where the arrest occurred; no circuit name may be invented.',
    'globalPreflight': 'NOT_READY: missing national corpus mount/completeness/index checks. This codified-text family binds the three measured repository records and needs no external document source.',
    'approval': 'No legal approval or route promotion is created by this engineering source-binding repair.'
}
(OUT/'source-review.json').write_text(json.dumps(proof, indent=2, ensure_ascii=False) + '\n')
manifest = {str(p.relative_to(FAMILY)): {'sha256': sha(p.read_bytes()), 'byteLength': p.stat().st_size} for p in sorted(FAMILY.rglob('*')) if p.is_file()}
(OUT/'before-family-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'records':len(records), 'beforeMatchingPins':2, 'changedFields':changed, 'wholeRowsEqual':old == new, 'legalProjectionEqual':True}))
