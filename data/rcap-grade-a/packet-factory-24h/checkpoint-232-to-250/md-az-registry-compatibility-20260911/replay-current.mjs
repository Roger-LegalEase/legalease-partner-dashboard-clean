import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { auditPreparedInputs } from '/tmp/rcap-az-guidance-repair-20260911/scripts/rcap-packet-completeness/verify-packet-completeness.mjs';

const currentRoot = '/tmp/rcap-az-guidance-repair-20260911';
const baselineRoot = '/tmp/rcap-md-contract-baseline-20260911';
const out = '/tmp/rcap-md-contract-comparison-20260911';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(file);
const inputsPath = path.join(out, 'baseline-serialized-inputs.json');
const baselineResultsPath = path.join(out, 'baseline-full-raw-results.json');
const inputBytes = read(inputsPath);
const rows = JSON.parse(inputBytes);
assert.equal(rows.length, 43);
const currentResults = rows.map(row => ({
  familyId: row.familyId,
  directory: row.directory,
  fixture: row.fixture,
  raw: auditPreparedInputs(row.directory, row.familyId, row.inputs),
}));
const currentBytes = Buffer.from(`${JSON.stringify(currentResults, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'current-full-raw-results.json'), currentBytes);
const baselineBytes = read(baselineResultsPath);
const baselineResults = JSON.parse(baselineBytes);
assert.deepEqual(currentResults, baselineResults, 'current full raw audit output differs from baseline');
assert.ok(currentBytes.equals(baselineBytes), 'full raw audit serialization differs');

const bindingPath = 'scripts/rcap-packet-completeness/md-conditional-reviewed-inputs.json';
const bindingBytes = read(path.join(baselineRoot, bindingPath));
const binding = JSON.parse(bindingBytes);
assert.equal(binding.files.length, 199);
const members = binding.files.map(member => {
  const bytes = read(path.join(currentRoot, member.path));
  return {
    path: member.path,
    expectedSha256: member.sha256,
    currentSha256: sha(bytes),
    expectedBytes: member.bytes,
    currentBytes: bytes.length,
    matchesOriginalBinding: member.sha256 === sha(bytes) && member.bytes === bytes.length,
  };
});
const mismatches = members.filter(member => !member.matchesOriginalBinding);
assert.deepEqual(mismatches.map(member => member.path), ['scripts/rcap-packet-completeness/completeness-contract.mjs']);
assert.equal(mismatches[0].expectedSha256, '1ae9d4188df538a744de52138293c13301554c4ead5509d2faf716d1e30887c4');
assert.equal(mismatches[0].currentSha256, '90e774f887dea4e74ecec55b611ad7c35a28cc8c5e4a4eff5a9d1ede2f9a33e2');
fs.writeFileSync(path.join(out, 'current-bound-members.json'), `${JSON.stringify(members, null, 2)}\n`);

const pdfMembers = members.filter(member => member.path.endsWith('.pdf'));
const fixturePdfs = pdfMembers.filter(member => member.path.includes('/fixtures/'));
const sourcePdfs = pdfMembers.filter(member => !member.path.includes('/fixtures/'));
assert.equal(fixturePdfs.length, 43);
assert.equal(sourcePdfs.length, 4);
assert.ok(pdfMembers.every(member => member.matchesOriginalBinding));

const registryPath = 'scripts/rcap-packet-completeness/az-source-optional-registry.json';
const registryBytes = read(path.join(currentRoot, registryPath));
const currentContractBytes = read(path.join(currentRoot, 'scripts/rcap-packet-completeness/completeness-contract.mjs'));
assert.ok(currentContractBytes.includes(Buffer.from(`import azSourceOptionalRegistry from "./az-source-optional-registry.json" with { type: "json" };`)));
const comparison = {
  schemaVersion: 'rcap-md-az-registry-compatibility/v1',
  scope: ['md_10110_conviction-set', 'md_cannabis_petition-set'],
  baselineHead: '7ab552e8ba14dc2eece3e81b7699ff452decae66',
  currentHead: '28fb9b6a9df211c602de81482287d2343f6466ed',
  fixtureCount: rows.length,
  fullRawAuditResultsDeepEqual: true,
  serializedInputsSha256: sha(inputBytes),
  baselineFullRawResultsSha256: sha(baselineBytes),
  currentFullRawResultsSha256: sha(currentBytes),
  boundInputComparison: {
    originalMembers: members.length,
    exactMatches: members.filter(member => member.matchesOriginalBinding).length,
    mismatches,
  },
  bytePins: {
    fixturePdfs: fixturePdfs.map(({ path, expectedSha256, currentSha256, currentBytes }) => ({ path, expectedSha256, currentSha256, bytes: currentBytes })),
    sourcePdfs: sourcePdfs.map(({ path, expectedSha256, currentSha256, currentBytes }) => ({ path, expectedSha256, currentSha256, bytes: currentBytes })),
    allMatchOriginalBinding: true,
  },
  currentDependency: {
    path: registryPath,
    sha256: sha(registryBytes),
    bytes: registryBytes.length,
    importedByCurrentContract: true,
    bindingMembership: false,
  },
  originalLoaderCurrentContractOutcome: 'REFUSED_UNTIL_CAPTAIN_CONTROLLED_RENEWAL',
  admission: false,
  bindingRenewed: false,
  sourceOrPdfChanged: false,
};
fs.writeFileSync(path.join(out, 'comparison.json'), `${JSON.stringify(comparison, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'current-run.json'), `${JSON.stringify({
  exit: 0,
  fixtures: rows.length,
  fullRawDeepEqual: true,
  serializedInputsSha256: sha(inputBytes),
  baselineFullRawResultsSha256: sha(baselineBytes),
  currentFullRawResultsSha256: sha(currentBytes),
  boundMembers: members.length,
  boundExactMatches: members.length - mismatches.length,
  boundMismatches: mismatches.length,
  fixturePdfs: fixturePdfs.length,
  sourcePdfs: sourcePdfs.length,
}, null, 2)}\n`);
console.log(`CURRENT_MD_RAW_AUDIT_PASS fixtures=${rows.length} deepEqual=true results=${sha(currentBytes)} bound=${members.length} exact=${members.length-mismatches.length} changed=${mismatches.length} fixturePdfs=${fixturePdfs.length} sources=${sourcePdfs.length}`);
