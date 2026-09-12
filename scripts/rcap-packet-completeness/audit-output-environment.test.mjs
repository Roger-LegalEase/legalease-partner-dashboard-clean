import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PASS_COUNTERS } from './completeness-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const matrix = path.join(root, 'data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json');
const checker = 'scripts/rcap-packet-completeness/verify-packet-completeness.mjs';
const family = 'nh_conviction_streamlined-set';

test('missing corpus environment refuses every shared-report entry point before writes', () => {
  const paths = [matrix, path.join(root, 'data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json'),
    path.join(root, 'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json')];
  const before = paths.map(p => fs.readFileSync(p));
  const env = { ...process.env };
  delete env.MASTER_LIBRARY_SOURCE_DIR;
  delete env.RCAP_BUNDLE_EXTRACT;
  for (const argv of [[checker, '--family', family, '--write'], [checker, '--write'],
    ['scripts/grade-a-packet-factory-24h/generate.mjs'],
    ['scripts/grade-a-packet-factory-24h/generate-raster-queue.mjs'],
    ['scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs', '--family', family],
    ['scripts/grade-a-packet-factory-24h/integrate.mjs']]) {
    const result = spawnSync(process.execPath, argv, { cwd: root, env, encoding: 'utf8' });
    assert.notEqual(result.status, 0, argv.join(' '));
    assert.match(result.stderr, /CORPUS_ENVIRONMENT_REFUSED/, argv.join(' '));
    paths.forEach((p, i) => assert.deepEqual(fs.readFileSync(p), before[i], p));
  }
});

test('family write emits only current measured results in isolation and preserves national rows', (t) => {
  if (!process.env.MASTER_LIBRARY_SOURCE_DIR && !process.env.RCAP_BUNDLE_EXTRACT) {
    t.skip('Run with the verified bootstrap corpus binding for the saved-byte integration case.');
    return;
  }
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-scoped-audit-'));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const before = fs.readFileSync(matrix);
  const reportPath = path.join(scratch, 'rcap-packet-completeness', `${family}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ results: [{ familyId: 'stale-unrelated-family', result: 'PASS_COMPLETE' }] }));
  const result = spawnSync(process.execPath, [checker, '--family', family, '--write'], {
    cwd: root, env: { ...process.env, TMPDIR: scratch }, encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(fs.readFileSync(matrix), before, 'all national entries and aggregates must remain byte-identical');
  const report = JSON.parse(fs.readFileSync(reportPath));
  assert.equal(report.auditScope.nationalMatrixUpdated, false);
  assert.equal(report.auditScope.reusedResults, 0);
  assert.equal(report.auditScope.integrationRequiresFullAudit, true);
  assert.equal(report.familiesAudited, 1);
  assert.deepEqual(report.results.map(r => r.familyId), [family]);
  assert.deepEqual(report.byResult, { [report.results[0].result]: 1 });
  for (const c of PASS_COUNTERS) assert.equal(report.counterTotals[c], report.results[0].counters[c]);
});
