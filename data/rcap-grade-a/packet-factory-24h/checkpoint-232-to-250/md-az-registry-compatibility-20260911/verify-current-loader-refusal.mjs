import assert from 'node:assert/strict';
import { loadMdConditionalCandidate, MD_CONDITIONAL_FAMILIES } from '/tmp/rcap-az-guidance-repair-20260911/scripts/rcap-packet-completeness/md-conditional-native-candidates.mjs';

const root = '/tmp/rcap-az-guidance-repair-20260911';
for (const familyId of MD_CONDITIONAL_FAMILIES) {
  assert.throws(
    () => loadMdConditionalCandidate({ root, familyId }),
    /Bound MD input (length|hash) changed: scripts\/rcap-packet-completeness\/completeness-contract\.mjs/,
  );
}
console.log('CURRENT_MD_NORMAL_LOADER_EXPECTED_REFUSAL_PASS families=2 changed=contract-only renewal-required=true');
