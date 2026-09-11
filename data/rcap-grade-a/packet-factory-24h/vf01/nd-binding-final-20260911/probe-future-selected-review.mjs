// Exercise the real test with a coherent future selection in disposable copies.
// This does not author an independent pass or alter any repository artifact.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';

const root = process.cwd();
const familyId = 'composed-treatment:nd-nonconviction-auto-close-verify';
const directory = `data/rcap-all50/overlays/census-v1/nd/${familyId}--custom-pleading`;
const queueDirectory = 'data/rcap-grade-a/packet-factory-24h';
const suite = 'scripts/grade-a-packet-factory-24h/test-nd-declared-binding.mjs';
const read = p => fs.readFileSync(path.join(root, p));
const json = p => JSON.parse(read(p));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const watch = [`${directory}/product-wiring.json`, `${queueDirectory}/MASTER_QUEUE.json`,
  `${queueDirectory}/RASTER_QUEUE.json`, `${directory}/fixtures/canonical.pdf`, `${directory}/fixtures/boundary.pdf`];
const before = Object.fromEntries(watch.map(p => [p, sha(read(p))]));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'nd-future-review-check-'));
let report;
try {
  fs.mkdirSync(path.join(temporary, path.dirname(directory)), {recursive: true});
  fs.cpSync(path.join(root, directory), path.join(temporary, directory), {recursive: true});
  fs.mkdirSync(path.join(temporary, queueDirectory), {recursive: true});
  const family = structuredClone(json(`${queueDirectory}/MASTER_QUEUE.json`).families.find(f => f.familyId === familyId));
  const selected = {verdict: 'PASS_COMPLETE_INDEPENDENT', lane: 'vf01', verifiedAtBase: 'b'.repeat(40)};
  family.selectedIndependentVerdict = {...family.selectedIndependentVerdict, ...selected};
  fs.writeFileSync(path.join(temporary, queueDirectory, 'MASTER_QUEUE.json'), JSON.stringify({families: [family]}));
  fs.writeFileSync(path.join(temporary, queueDirectory, 'RASTER_QUEUE.json'), read(`${queueDirectory}/RASTER_QUEUE.json`));
  const wiring = json(`${directory}/product-wiring.json`);
  wiring.binding.lastIndependentVerification = selected;
  fs.writeFileSync(path.join(temporary, directory, 'product-wiring.json'), JSON.stringify(wiring));
  const result = spawnSync(process.execPath, ['--test', path.join(root, suite)], {
    cwd: root, env: {...process.env, RCAP_TEST_ROOT: temporary}, encoding: 'utf8'
  });
  report = {schemaVersion: 'rcap-isolated-future-review-probe/v1', familyId,
    verifiedAtBase: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
    suite, suiteSha256: sha(read(suite)), hypotheticalSelectedTuple: selected,
    changesConfinedToTemporaryCopies: ['MASTER_QUEUE exact family selectedIndependentVerdict', 'product-wiring binding.lastIndependentVerification'],
    expectedExitCode: 0, actualExitCode: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim(),
    probeDoesNotCreateActualApproval: true, sourceOrPdfChanges: false};
} finally {
  fs.rmSync(temporary, {recursive: true, force: true});
}
assert.deepEqual(Object.fromEntries(watch.map(p => [p, sha(read(p))])), before);
report.repositoryInputsUnchanged = true;
report.temporaryCopiesRemoved = true;
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
