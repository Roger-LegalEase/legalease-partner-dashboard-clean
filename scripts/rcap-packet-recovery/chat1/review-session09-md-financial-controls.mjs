#!/usr/bin/env node
// Reproduce the six retained failures with exact old helper bytes, then exercise
// the corrected public renderers. This is engineering evidence, not approval.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as currentConviction from '../chat5/md-conviction.mjs';
import * as currentCannabis from '../chat5/md-cannabis.mjs';

const root = currentConviction.ROOT;
const evidence = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session09';
const helper = 'scripts/rcap-packet-recovery/chat5/md-conviction.mjs';
const cannabis = 'scripts/rcap-packet-recovery/chat5/md-cannabis.mjs';
const read = file => fs.readFileSync(path.join(root, file));
const before = read(`${evidence}/md-financial-helper-before.txt`);
const beforeSha256 = currentConviction.hash(before);
assert.equal(beforeSha256, '1f7e3baa1acc84b5c9fe30b99b5d7aad54b87dfe4aaf35a821fc04acb7197296');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'md-financial-baseline-'));
const tag = path.basename(scratch);
const helperPath = path.join(root, path.dirname(helper), `.${tag}-conviction.mjs`);
const cannabisPath = path.join(root, path.dirname(cannabis), `.${tag}-cannabis.mjs`);
const rows = [];
try {
  fs.writeFileSync(helperPath, before, {flag: 'wx'});
  const cannabisSource = read(cannabis).toString();
  assert.equal(cannabisSource.split("'./md-conviction.mjs'").length, 2);
  fs.writeFileSync(cannabisPath, cannabisSource.replace("'./md-conviction.mjs'", `'./${path.basename(helperPath)}'`), {flag: 'wx'});
  const oldConviction = await import(pathToFileURL(helperPath));
  const oldCannabis = await import(pathToFileURL(cannabisPath));
  for (const [family, fixtures, oldRender, newRender] of [
    ['conviction', currentConviction.convictionFixtures(), oldConviction.renderMdConviction, currentConviction.renderMdConviction],
    ['cannabis', currentCannabis.cannabisFixtures(), oldCannabis.renderMdCannabis, currentCannabis.renderMdCannabis]
  ]) for (const inventory of ['income', 'property', 'debts']) {
    const facts = structuredClone(fixtures.boundary);
    delete facts.financial[inventory];
    const prior = await oldRender(facts);
    assert.equal(prior.allKnownFactsPrepared, true, 'Original completion defect must reproduce');
    assert.equal(prior.missing.length, 0);
    let refusal;
    await assert.rejects(() => newRender(facts), error => {
      refusal = error.message;
      return error.message === `FINANCIAL_INVENTORY_REQUIRED: financial.${inventory}`;
    });
    rows.push({family, fixture: 'boundary', removed: `financial.${inventory}`,
      factsSha256: currentConviction.hash(Buffer.from(currentConviction.json(facts))),
      completeFlag: facts.financial[`${inventory}Complete`],
      before: {allKnownFactsPrepared: prior.allKnownFactsPrepared, missing: prior.missing, sha256: prior.sha256, pages: prior.pageCount},
      after: {refused: true, error: refusal, packetEmitted: false}});
  }
} finally {
  for (const file of [helperPath, cannabisPath]) if (fs.existsSync(file)) fs.unlinkSync(file);
  fs.rmSync(scratch, {recursive: true, force: true});
}
const report = {scope: 'MD_FINANCIAL_REPAIR_CAUSAL_ENGINEERING_CONTROLS',
  baseline: {file: `${evidence}/md-financial-helper-before.txt`, sha256: beforeSha256,
    loadedFromExactCopiedBytes: true, cannabisImportRedirectedOnlyToBaselineHelper: true},
  current: {file: helper, sha256: currentConviction.hash(read(helper)), cannabisSha256: currentConviction.hash(read(cannabis))},
  reproducedFailures: rows.length, repairedRefusals: rows.length, rows,
  independentApproval: false, terminalPromotion: false, runtimeAuthority: false};
fs.writeFileSync(path.join(root, evidence, 'md-financial-causal-controls.json'), currentConviction.json(report));
console.log(currentConviction.json({reproducedFailures: rows.length, repairedRefusals: rows.length}));
