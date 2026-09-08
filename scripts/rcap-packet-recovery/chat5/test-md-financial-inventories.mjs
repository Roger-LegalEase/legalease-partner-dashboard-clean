#!/usr/bin/env node
// Exercise both actual adapters and entry points. No review or live authority.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import * as conviction from './md-conviction.mjs';
import * as cannabis from './md-cannabis.mjs';

const families = [
  {name: 'conviction', fixtures: conviction.convictionFixtures(), validate: conviction.validateMdConviction,
    render: conviction.renderMdConviction, run: conviction.runMdConviction,
    wrapper: 'scripts/build-census-v1-md_10110_conviction-set.mjs'},
  {name: 'cannabis', fixtures: cannabis.cannabisFixtures(), validate: cannabis.validateMdCannabis,
    render: cannabis.renderMdCannabis, run: cannabis.runMdCannabis,
    wrapper: 'scripts/build-census-v1-md_cannabis_petition-set.mjs'}
];
const results = [];
async function check(name, run) {
  try { await run(); results.push({name, passed: true}); }
  catch (error) { results.push({name, passed: false, error: error.stack}); }
}
const absent = [['omitted', undefined], ['null', null], ['empty string', '']];
const malformed = [['array', []], ['false', false], ['zero', 0], ['string', 'none'], ['date', new Date(0)]];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'md-financial-inventories-'));
try {
  for (const family of families) {
    const clone = () => structuredClone(family.fixtures.boundary);
    for (const inventory of ['income', 'property', 'debts']) {
      for (const [label, value] of absent) await check(`${family.name}: ${inventory} ${label} cannot be complete`, async () => {
        const facts = clone();
        if (value === undefined) delete facts.financial[inventory];
        else facts.financial[inventory] = value;
        assert.equal(facts.financial[`${inventory}Complete`], true);
        const refusal = new RegExp(`FINANCIAL_INVENTORY_REQUIRED: financial\\.${inventory}`);
        assert.throws(() => family.validate(facts), refusal);
        // Source access would fail with a different error if rendering began.
        await assert.rejects(() => family.render(facts, {
          'CC-DC-CR-072B': Buffer.alloc(0), 'CC-DC-CR-072D': Buffer.alloc(0)
        }), refusal);
      });
      for (const [label, value] of malformed) await check(`${family.name}: ${inventory} rejects ${label}`, () => {
        const facts = clone(); facts.financial[inventory] = value;
        assert.throws(() => family.validate(facts), /FINANCIAL_OBJECT_REQUIRED/);
      });
      await check(`${family.name}: unknown ${inventory} remains a disclosed draft`, async () => {
        const facts = clone();
        delete facts.financial[inventory]; delete facts.financial[`${inventory}Complete`];
        const result = await family.render(facts);
        assert.equal(result.allKnownFactsPrepared, false);
        const waiver = result.components.find(c => c.documentId === 'CC-DC-089');
        assert(waiver.blanks.some(b => b.requiredBeforeFiling && b.factId.startsWith(`financial.${inventory}.`)));
        assert(!waiver.writes.some(w => w.factId.startsWith(`financial.${inventory}`)));
        const missingFields = waiver.blanks.filter(b => b.requiredBeforeFiling && b.factId.startsWith(`financial.${inventory}.`));
        const disclosure = result.sections.flatMap(([, paragraphs]) => paragraphs).join('\n');
        for (const blank of missingFields) assert(disclosure.includes(blank.field), `Missing disclosure: ${blank.field}`);
      });
      await check(`${family.name}: inherited category names rejected in ${inventory}`, () => {
        const facts = clone();
        facts.financial[inventory] = {constructor: inventory === 'income' ? 85000 : {cents: 0, monthlyCents: 0, description: 'Invented'}};
        assert.throws(() => family.validate(facts), /UNKNOWN_(INCOME|FINANCIAL)_CATEGORY/);
      });
    }
    for (const [label, value] of malformed) await check(`${family.name}: financial section rejects ${label}`, () => {
      const facts = clone(); facts.financial = value;
      assert.throws(() => family.validate(facts), /FINANCIAL_OBJECT_REQUIRED/);
    });
    for (const [inventory, category] of [['property', 'bank'], ['debts', 'creditCard']]) {
      for (const [label, value] of [...malformed, ['null', null]]) await check(`${family.name}: ${inventory} item rejects ${label}`, () => {
        const facts = clone(); facts.financial[inventory][category] = value;
        assert.throws(() => family.validate(facts), /FINANCIAL_OBJECT_REQUIRED/);
      });
    }
    await check(`${family.name}: explicit empty inventories and zero income render truthfully`, async () => {
      const facts = clone();
      Object.assign(facts.financial, {income: {}, property: {}, debts: {}, totalCents: 0});
      const result = await family.render(facts);
      assert.equal(result.allKnownFactsPrepared, true);
      const waiver = result.components.find(c => c.documentId === 'CC-DC-089');
      assert.equal(waiver.writes.find(w => w.field === 'Total Gross Household Income').value, '0.00');
      for (const field of ['None', 'No Debt check box']) assert(waiver.writes.some(w => w.field === field));
      assert(!waiver.writes.some(w => /^financial\.(income|property|debts)\./.test(w.factId)));
    });
    await check(`${family.name}: empty income cannot support a nonzero total`, () => {
      const facts = clone(); facts.financial.income = {};
      assert.throws(() => family.validate(facts), /INCOME_TOTAL_MISMATCH/);
    });
    for (const inventory of ['income', 'property', 'debts']) {
      const facts = clone(); delete facts.financial[inventory];
      const input = path.join(tmp, `${family.name}-${inventory}.json`);
      fs.writeFileSync(input, JSON.stringify(facts));
      for (const mode of ['export', 'CLI']) for (const existing of [false, true]) {
        await check(`${family.name}: ${mode} missing ${inventory} preserves destination existing=${existing}`, async () => {
          const out = path.join(tmp, `${family.name}-${inventory}-${mode}-${existing}`);
          const sentinel = Buffer.from('preserved existing packet\0');
          if (existing) { fs.mkdirSync(out); fs.writeFileSync(path.join(out, 'sentinel.pdf'), sentinel); }
          if (mode === 'export') await assert.rejects(() => family.run({inputFile: input, outDir: out}), /FINANCIAL_INVENTORY_REQUIRED/);
          else {
            const result = spawnSync(process.execPath, [family.wrapper, '--input', input, '--out', out], {cwd: conviction.ROOT, encoding: 'utf8'});
            assert.equal(result.status, 1, result.stderr);
            assert.match(result.stderr, /FINANCIAL_INVENTORY_REQUIRED/);
            assert(!result.stdout.includes('rendererExecuted'));
          }
          if (existing) {
            assert.deepEqual(fs.readdirSync(out), ['sentinel.pdf']);
            assert.deepEqual(fs.readFileSync(path.join(out, 'sentinel.pdf')), sentinel);
          } else assert(!fs.existsSync(out));
        });
      }
    }
  }
} finally { fs.rmSync(tmp, {recursive: true, force: true}); }

const report = {scope: 'MD_FINANCIAL_INVENTORY_REGRESSION',
  passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length,
  results, independentApproval: false, terminalPromotion: false, runtimeAuthority: false};
if (process.argv[2]) fs.writeFileSync(process.argv[2], conviction.json(report));
console.log(conviction.json({passed: report.passed, failed: report.failed, failures: results.filter(r => !r.passed)}));
if (report.failed) process.exitCode = 1;
