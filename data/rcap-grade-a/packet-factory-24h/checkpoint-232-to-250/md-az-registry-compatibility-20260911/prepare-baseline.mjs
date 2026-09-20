import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { loadMdConditionalCandidate, MD_CONDITIONAL_FAMILIES } from '/tmp/rcap-md-contract-baseline-20260911/scripts/rcap-packet-completeness/md-conditional-native-candidates.mjs';
import { auditPreparedInputs } from '/tmp/rcap-md-contract-baseline-20260911/scripts/rcap-packet-completeness/verify-packet-completeness.mjs';

const root = '/tmp/rcap-md-contract-baseline-20260911';
const out = '/tmp/rcap-md-contract-comparison-20260911';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const loaded = MD_CONDITIONAL_FAMILIES.map(familyId => loadMdConditionalCandidate({ root, familyId }));
assert.equal(loaded.reduce((n, family) => n + family.fixtures.length, 0), 43);
assert.deepEqual(loaded.map(family => family.filesMatched), [199, 199]);

const prepared = loaded.flatMap(family => family.fixtures.map(fixture => ({
  familyId: family.familyId,
  directory: family.directory,
  fixture: fixture.fixture,
  inputs: fixture.inputs,
})));
const inputBytes = Buffer.from(`${JSON.stringify(prepared, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'baseline-serialized-inputs.json'), inputBytes);

// Audit the parsed serialization so baseline and current receive byte-identical
// serialized input content, including all source/map/write/report objects.
const replayInputs = JSON.parse(inputBytes);
const results = replayInputs.map(row => ({
  familyId: row.familyId,
  directory: row.directory,
  fixture: row.fixture,
  raw: auditPreparedInputs(row.directory, row.familyId, row.inputs),
}));
const resultBytes = Buffer.from(`${JSON.stringify(results, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'baseline-full-raw-results.json'), resultBytes);
fs.writeFileSync(path.join(out, 'baseline-run.json'), `${JSON.stringify({
  exit: 0,
  fixtures: results.length,
  familyFixtureCounts: Object.fromEntries(loaded.map(family => [family.familyId, family.fixtures.length])),
  authenticatedBoundFilesPerLoader: loaded.map(family => ({ familyId: family.familyId, filesMatched: family.filesMatched })),
  serializedInputsSha256: sha(inputBytes),
  fullRawResultsSha256: sha(resultBytes),
}, null, 2)}\n`);
console.log(`BASELINE_MD_RAW_AUDIT_PASS fixtures=${results.length} inputs=${sha(inputBytes)} results=${sha(resultBytes)}`);
