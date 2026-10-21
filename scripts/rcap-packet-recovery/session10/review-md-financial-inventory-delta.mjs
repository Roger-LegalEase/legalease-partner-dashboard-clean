#!/usr/bin/env node
// Independent reviewer /root/independent_md_review. This script changes no
// implementation or registry. Its PASS covers only the inventory correction.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import * as conviction from '../chat5/md-conviction.mjs';
import * as cannabis from '../chat5/md-cannabis.mjs';

const E = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration';
const OUT = `${E}/session10/md-independent-review`;
const read = p => fs.readFileSync(path.join(conviction.ROOT, p));
const json = p => JSON.parse(read(p));
const identity = p => ({path:p, sha256:conviction.hash(read(p)), bytes:read(p).length});
const repair = json(`${E}/session09/md-financial-repair-completion.json`);
const inputs = json(`${E}/session09/md-financial-current-inputs.json`);
const prior = json(`${E}/session08/md-cannabis-independent-financial-controls.json`);
const causal = json(`${E}/session09/md-financial-causal-controls.json`);
const equivalence = json(`${E}/session09/md-financial-packet-equivalence.json`);
const current = identity(repair.helper.path);
assert.equal(current.sha256, repair.helper.afterSha256);
assert.equal(identity(`${E}/session09/md-financial-helper-before.txt`).sha256, repair.helper.beforeSha256);
for (const row of inputs.files) assert.equal(identity(row.path).sha256, row.sha256, `Changed proof input: ${row.path}`);
for (const row of repair.checks) assert.equal(identity(row.report).sha256, row.sha256, `Changed check evidence: ${row.report}`);
for (const row of equivalence.packets) assert.equal(identity(row.file).sha256, row.sha256, `Changed PDF: ${row.file}`);

const cases = [];
const check = async (name, work) => {
  try { cases.push({name, passed:true, measured:await work()}); }
  catch (error) { cases.push({name, passed:false, error:error.stack}); }
};
for (const family of [
  {name:'conviction', fixtures:conviction.convictionFixtures(), validate:conviction.validateMdConviction, render:conviction.renderMdConviction, wrapper:'scripts/build-census-v1-md_10110_conviction-set.mjs'},
  {name:'cannabis', fixtures:cannabis.cannabisFixtures(), validate:cannabis.validateMdCannabis, render:cannabis.renderMdCannabis, wrapper:'scripts/build-census-v1-md_cannabis_petition-set.mjs'}
]) {
  const facts = () => structuredClone(family.fixtures.boundary);
  for (const name of ['income','property','debts']) await check(`${family.name}: original missing ${name} rejected before source access`, async () => {
    const f=facts(); delete f.financial[name];
    const old=prior.rows.find(r=>r.family===family.name&&r.removed===`financial.${name}`);
    const engineering=causal.rows.find(r=>r.family===family.name&&r.removed===`financial.${name}`);
    assert.equal(conviction.hash(Buffer.from(conviction.json(f))), engineering.factsSha256);
    assert.equal(old.sha256, engineering.before.sha256);
    assert.equal(old.allKnownFactsPrepared, true);
    let refusal;
    await assert.rejects(()=>family.render(f,{'CC-DC-CR-072B':Buffer.alloc(0),'CC-DC-CR-072D':Buffer.alloc(0)}), error=>{
      refusal=error.message; return refusal===`FINANCIAL_INVENTORY_REQUIRED: financial.${name}`;
    });
    return {factsSha256:engineering.factsSha256, originalIndependentOutputSha256:old.sha256, originalFalseCompletionReused:true, currentRefusal:refusal, sourceAccessAttempted:false};
  });
  await check(`${family.name}: all inventoried fields unknown remain disclosed and unselected`, async()=>{
    const f=facts();
    for (const key of ['income','property','debts']) { delete f.financial[key]; delete f.financial[`${key}Complete`]; }
    const result=await family.render(f), waiver=result.components.find(c=>c.documentId==='CC-DC-089');
    assert.equal(result.allKnownFactsPrepared,false);
    assert(!waiver.writes.some(w=>/^financial\.(income|property|debts)/.test(w.factId)));
    const disclosed=result.sections.flatMap(([,lines])=>lines).join('\n');
    const missing=waiver.blanks.filter(b=>b.requiredBeforeFiling&&/^financial\.(income|property|debts)\./.test(b.factId));
    for (const row of missing) assert(disclosed.includes(row.field), row.field);
    assert.equal(missing.length,17);
    assert(!waiver.writes.some(w=>['None','No Debt check box'].includes(w.field)));
    return {factsSha256:conviction.hash(Buffer.from(conviction.json(f))), allKnownFactsPrepared:false, componentSha256:waiver.sha256, unfilledFinancialCategories:missing.length, everyCategoryDisclosed:true};
  });
  await check(`${family.name}: explicit empty inventories preserve zero/none meaning`,async()=>{
    const f=facts();Object.assign(f.financial,{income:{},property:{},debts:{},totalCents:0});
    const result=await family.render(f),waiver=result.components.find(c=>c.documentId==='CC-DC-089');
    assert.equal(result.allKnownFactsPrepared,true);
    assert.equal(waiver.writes.find(w=>w.field==='Total Gross Household Income').value,'0.00');
    for (const field of ['None','No Debt check box']) assert(waiver.writes.some(w=>w.field===field&&w.value===true));
    assert(!waiver.writes.some(w=>/^financial\.(income|property|debts)\./.test(w.factId)));
    return {factsSha256:conviction.hash(Buffer.from(conviction.json(f))), allKnownFactsPrepared:true, componentSha256:waiver.sha256, explicitZero:true, explicitNone:true};
  });
  await check(`${family.name}: explicit false completeness rejected`,async()=>{
    const f=facts(); f.financial.incomeComplete=false;
    await assert.rejects(()=>family.render(f),/CONDITION_NOT_MET: financial.incomeComplete/);
    return {expectedRejection:'CONDITION_NOT_MET: financial.incomeComplete'};
  });
  await check(`${family.name}: current wrapper rejects missing inventory without output writes`,async()=>{
    const f=facts();delete f.financial.income;
    const input=`${OUT}/${family.name}-missing-income.facts.json`, output=`${OUT}/${family.name}-rejected-output`;
    assert(!fs.existsSync(output));fs.writeFileSync(input,conviction.json(f));
    const child=spawnSync(process.execPath,[family.wrapper,'--input',input,'--out',output],{cwd:conviction.ROOT,encoding:'utf8'});
    assert.equal(child.status,1);assert.match(child.stderr,/FINANCIAL_INVENTORY_REQUIRED: financial.income/);assert(!fs.existsSync(output));
    return {input:identity(input),exitStatus:child.status,outputCreated:false};
  });
}
const evidence=[`${E}/session08/md-cannabis-independent-financial-controls.json`,`${E}/session09/md-financial-causal-controls.json`,`${E}/session09/md-financial-packet-equivalence.json`,`${E}/session09/md-financial-current-inputs.json`,...repair.checks.map(r=>r.report)].map(identity);
const result={schemaVersion:'independent-md-financial-delta-review/v1',reviewer:{agent:'/root/independent_md_review',implementationAuthoredByReviewer:false,kind:'separate-executing-agent',humanOrCounselReview:false},reviewedCommit:'81ab23f8f4c56490b411255964179f37669ea2dd',scope:'ONLY_SHARED_FINANCIAL_INVENTORY_REPAIR',verdict:cases.every(c=>c.passed)?'PASS':'FAIL',currentHelper:current,script:identity('scripts/rcap-packet-recovery/session10/review-md-financial-inventory-delta.mjs'),inputsRehashed:inputs.files.length,evidence,retainedPdfIdentitiesVerified:equivalence.packets.length,existingFullRendererEquivalenceReused:true,existingChecksReused:repair.totalPassingChecks,cases,passed:cases.filter(c=>c.passed).length,failed:cases.filter(c=>!c.passed).length,reasonForFocusedExecution:'Independent current-caller confirmation of the six original failures and combined unknown/explicit-empty/false states; the unchanged exhaustive author suite and retained PDF equivalence remain attributed to their original engineering evidence.',notApproved:['whole-family source/legal/current applicability','full visual family acceptance','central acceptance','owner/matter/verification/entitlement/delivery','runtime or commercial authority'],terminalPromotion:false,productionChanged:false};
fs.writeFileSync(`${OUT}/financial-inventory-delta-review.json`,conviction.json(result));
console.log(conviction.json({verdict:result.verdict,passed:result.passed,failed:result.failed,failures:cases.filter(c=>!c.passed),report:`${OUT}/financial-inventory-delta-review.json`}));
if(result.failed)process.exitCode=1;
