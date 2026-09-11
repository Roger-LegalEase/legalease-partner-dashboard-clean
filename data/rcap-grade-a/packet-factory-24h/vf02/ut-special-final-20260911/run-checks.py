import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path.cwd()
OUT = ROOT / 'data/rcap-grade-a/packet-factory-24h/vf02/ut-special-final-20260911'
FAMILY = ROOT / 'data/rcap-all50/overlays/census-v1/ut/ut-pet-special-certificate-set--official-pdf-fill'

def snapshot():
    return {str(p.relative_to(ROOT)): {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
            'size': p.stat().st_size, 'mtimeNs': p.stat().st_mtime_ns,
            'ctimeNs': p.stat().st_ctime_ns, 'mode': p.stat().st_mode}
            for p in sorted(FAMILY.rglob('*')) if p.is_file()}

commands = [
    ('claim-can-assert', ['node', 'scripts/grade-a-packet-factory-24h/claim.mjs', '--can-assert', 'VF02', 'ut_pet_special_certificate-set']),
    ('claim-assert', ['node', 'scripts/grade-a-packet-factory-24h/claim.mjs', '--assert', 'VF02', 'ut_pet_special_certificate-set']),
    ('builder-check', ['node', 'scripts/build-census-v1-ut_pet_special_certificate-set.mjs', '--check']),
    ('author-stage-test', ['node', 'scripts/lib/ut-special-certificate-stage-gate.test.mjs']),
    ('author-repair-test', ['node', 'scripts/rcap-packet-recovery/ut-special-certificate-repair.test.mjs']),
    ('completeness-readonly', ['node', str((OUT / 'completeness-readonly.mjs').relative_to(ROOT))]),
]
results = []
before_all = snapshot()
for name, command in commands:
    before = snapshot()
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    after = snapshot()
    log = '\n'.join(line.rstrip() for line in (result.stdout + result.stderr).splitlines()) + '\n'
    (OUT / (name + '.log')).write_text(log)
    row = {'name': name, 'command': command, 'exitCode': result.returncode,
           'familyFilesMeasured': len(before), 'unchangedBytesAndMetadata': before == after,
           'log': str((OUT / (name + '.log')).relative_to(ROOT))}
    results.append(row)
    print(json.dumps(row), flush=True)
(OUT / 'verification-results.json').write_text(json.dumps({'commands': results,
    'originalCompletenessTestNotRun': 'Original test writes a temporary corrupted source tree outside this grant. Its read-only remainder was run verbatim in completeness-readonly.mjs; exact source identity measured independently.',
    'familyBefore': before_all, 'unchangedAfterAll': before_all == snapshot()}, indent=2) + '\n')
assert all(row['exitCode'] == 0 and row['unchangedBytesAndMetadata'] for row in results)
