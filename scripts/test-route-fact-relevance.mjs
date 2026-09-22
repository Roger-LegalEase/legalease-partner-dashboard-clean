#!/usr/bin/env node
// #63: schema-aware route ownership. Mutations compile isolated in-memory copies;
// no tracked file is changed by this test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const sourcePath = 'src/lib/rcap-engine/route-fact-relevance.ts';
const source = fs.readFileSync(process.env.ROUTE_FACT_SOURCE ?? sourcePath, 'utf8');
const profiles = fs.readdirSync('src/lib/rcap-engine/compiled/profiles').filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join('src/lib/rcap-engine/compiled/profiles', f), 'utf8')));
const profile = code => profiles.find(p => p.jurisdiction.code === code);
function load(text) {
  const mod = new Module(path.resolve(sourcePath));
  mod._compile(ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, sourcePath);
  return mod.exports;
}
function checks(api) {
  const { routeDecidingFactIds: ids, routeDecidingFactScope: scope } = api;
  const facts = (code, id) => ids(profile(code), profile(code).pathways.find(p => p.id === id));
  const ndFirst = facts('ND', 'first-offense-possession-sealing');
  assert.equal(ndFirst.size, 20, 'ND first possession: exactly authored/shared facts');
  const expectedND = 'age_at_offense case_outcome charge court court_requirements_completed criminal_history disposition_date financial_obligations jurisdiction_scope new_convictions_during_waiting_period offense_category offense_level ownership_scope pardon_status pending_cases record_type resolved_timing_bucket sentence_completion_date special_preconditions_confirmed state_exclusion_categories'.split(' ');
  assert.deepEqual([...ndFirst].sort(), expectedND.sort());
  for (const id of ['residency_or_location', 'trafficking_status', 'county', 'prior_relief']) assert(!ndFirst.has(id), `ND first possession excludes ${id}`);
  const general = facts('ND', 'general-conviction-sealing-under-n-d-c-c-chapter-12-60-1');
  const pardon = facts('ND', 'marijuana-specific-summary-pardon-or-sealing-relief');
  for (const id of ['disposition_date', 'sentence_completion_date', 'court', 'residency_or_location']) assert(general.has(id), `ND general preserves ${id}`);
  for (const id of ['disposition_date', 'age_at_offense', 'trafficking_status', 'residency_or_location']) assert(pardon.has(id), `ND pardon preserves ${id}`);
  const ca = profile('CA');
  for (const way of ca.pathways) {
    const set = ids(ca, way);
    for (const [id, consumers] of Object.entries(ca.questionLifecycle.routeConsumers)) {
      assert.equal(set.has(id), consumers.includes(way.id), `CA ${way.id}: ${id} stays on its authored remedy`);
    }
  }
  for (const way of profile('HI').pathways) assert.equal(ids(profile('HI'), way).has('hi_court_order_confirmed'), ['first-time-drug-conviction', 'dui-under-21-conviction'].includes(way.id), 'Hawaii court order separation');
  assert.equal(profiles.length, 51);
  for (const p of profiles) for (const way of p.pathways) {
    const set = ids(p, way);
    for (const id of api.UNIVERSAL_PREPAY_FACT_IDS) assert(set.has(id), `${p.jurisdiction.code} universal ${id}`);
    assert(set.has('ownership_scope'), 'universal ownership survives even if the constant is mutated');
    for (const id of api.ROUTE_ESCALATION_FACT_IDS[`${p.jurisdiction.code}:${way.id}`] ?? []) assert(set.has(id), `escalation ${id}`);
    for (const id of set) assert(/^[a-z][a-z0-9_]*$/.test(id), `not a fact ID: ${p.jurisdiction.code} ${id}`);
  }
  // Contracts exercised using two remedies, not a new per-state consumer list.
  const fixture = {
    jurisdiction: { code: 'TEST' },
    pathways: [{ id: 'alpha', triggerFields: ['own_fact'], ruleClauses: ['Human readable rule text.'], waitingRules: ['Wait three years.'], exclusionRules: ['A descriptive exclusion.'] }, { id: 'beta', triggerFields: ['sibling_fact'] }],
    questionLifecycle: { routeConsumers: { lifecycle_fact: ['alpha'], global_fact: ['alpha', 'beta'], scoped_priority_fact: ['beta'] } },
    orderedDecisionRules: [{ id: 'global', when: { fieldsReferenced: ['global_fact', 'pending_cases'] } }, { id: 'unknown', when: { fieldsReferenced: ['unbound_fact'] } }, { candidatePathwayIds: ['beta'], when: { fieldIds: ['beta_decision_fact'] } }],
    waitingPeriodRules: [{ id: 'owned-wait', candidatePathwayIds: ['alpha'], fieldsReferenced: ['scoped_wait_fact', 'scoped_priority_fact'], when: { timingAnchorFactId: 'wait_anchor', timingAnchorAlternateFactIds: ['wait_alternate'] } }, { id: 'sibling-wait', fieldsReferenced: ['sibling_fact'] }],
    exclusionRules: [{ id: 'owned-exclusion', pathwayId: 'alpha', questionIds: ['scoped_exclusion_fact'] }, { id: 'sibling-exclusion', candidatePathwayIds: ['beta'], requiredFields: ['beta_exclusion_fact'] }]
  };
  const alpha = ids(fixture, fixture.pathways[0]);
  const beta = ids(fixture, fixture.pathways[1]);
  for (const id of ['own_fact', 'lifecycle_fact', 'global_fact', 'scoped_wait_fact', 'scoped_exclusion_fact', 'scoped_priority_fact', 'wait_anchor', 'wait_alternate']) assert(alpha.has(id), `alpha retains ${id}`);
  for (const id of ['sibling_fact', 'beta_decision_fact', 'beta_exclusion_fact', 'unbound_fact']) assert(!alpha.has(id), `alpha rejects ${id}`);
  assert(beta.has('global_fact') && beta.has('beta_exclusion_fact'));
  assert(!beta.has('scoped_wait_fact') && !beta.has('lifecycle_fact'));
  for (const set of [alpha, beta]) for (const id of set) assert(!/[ .]/.test(id), 'prose is never a fact');
  assert.deepEqual(scope(fixture, fixture.pathways[0]).unresolvedRules, [{ section: 'orderedDecisionRules', ruleId: 'unknown', factIds: ['unbound_fact'] }]);
  const fieldProperties = ['fields', 'fieldIds', 'fieldsReferenced', 'triggerFields', 'requiredFields', 'requiredInputIds', 'questionIds', 'screeningFactIds', 'timingAnchorAlternateFactIds', 'anchorAlternates'];
  const fieldFixture = structuredClone(fixture);
  fieldFixture.pathways[0].clauses = Object.fromEntries(fieldProperties.map((key, index) => [key, [`declared_field_${index}`]]));
  fieldFixture.pathways[0].timing = { anchorFactId: 'declared_anchor' };
  fieldFixture.pathways[0].selector = { factId: 'declared_selector' };
  const declared = ids(fieldFixture, fieldFixture.pathways[0]);
  for (let index = 0; index < fieldProperties.length; index++) assert(declared.has(`declared_field_${index}`), `preserve fact array ${fieldProperties[index]}`);
  assert(declared.has('declared_anchor') && declared.has('declared_selector'), 'preserve typed scalar facts');
  const gateOnly = { ...fixture, jurisdiction: { code: 'WI' }, pathways: [{ id: 'adult-conviction-expungement-under-wis-stat-973-015' }], orderedDecisionRules: [], waitingPeriodRules: [], exclusionRules: [], questionLifecycle: { routeConsumers: {} } };
  assert(ids(gateOnly, gateOnly.pathways[0]).has('wi_expungement_ordered_at_sentencing'), 'escalation without duplicate authored fields survives');
  return true;
}
checks(load(source));
console.log('PASS: all-51 schema checks; ND/CA/HI separation; scoped waits/exclusions; global consumers; unresolved scope; escalation/universal facts');
if (process.argv.includes('--mutations')) {
  const atReturn = '  return { factIds, unresolvedRules };';
  const inject = text => source.replace(atReturn, text + '\n' + atReturn);
  const mutants = [
    ['all-exclusion sweep', inject('  collectDecidingFieldIds(profile.exclusionRules, factIds);')],
    ['all-waiting sweep', inject('  collectDecidingFieldIds(profile.waitingPeriodRules, factIds);')],
    ['raw rule prose', source.replace('function collectDecidingFieldIds(value: unknown, into: Set<string>) {', 'function collectDecidingFieldIds(value: unknown, into: Set<string>) { if (typeof value === "string") { into.add(value); return; }')],
    ['ignore candidatePathwayIds', source.replace('if (rule.candidatePathwayIds?.length) return rule.candidatePathwayIds;', '')],
    ['ignore routeConsumers', source.replace('Object.entries(profile.questionLifecycle?.routeConsumers ?? {})', 'Object.entries({})').replace('return profile.questionLifecycle?.routeConsumers[questionId] ?? [];', 'return [];')],
    ['drop universal fact', inject('  factIds.delete("ownership_scope");')],
    ['drop legitimate waiting fact', inject('  factIds.delete("scoped_wait_fact");')],
    ['ND general cross-route', inject('  if (profile.jurisdiction.code === "ND" && pathway.id === "first-offense-possession-sealing") factIds.add("residency_or_location");')],
    ['ND pardon cross-route', inject('  if (profile.jurisdiction.code === "ND" && pathway.id === "first-offense-possession-sealing") factIds.add("trafficking_status");')],
    ['CA Prop64 cross-route', inject('  if (profile.jurisdiction.code === "CA") factIds.add("ca_prop64_branch");')],
    ['remove route escalation', source.replace('for (const id of ROUTE_ESCALATION_FACT_IDS[`${profile.jurisdiction.code}:${candidate.id}`] ?? []) bind(id, candidate.id);', '')]
  ];
  for (const [name, text] of mutants) {
    assert.notEqual(text, source, `${name}: mutation applied`);
    const candidate = load(text); // compilation failure earns no detection credit
    assert.throws(() => checks(candidate), { name: 'AssertionError' }, `${name}: must fail a behavioral assertion`);
    console.log(`KILLED: ${name}`);
  }
}

// Exercise the actual shared DTC/sponsored packet-information boundary, with no
// authority doubles and no new questions or participant data.
const { register } = await import('node:module');
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { packetCollectionFor } = await import('../src/lib/expungement-ai/packet-information.ts');
const { resolvePacketCollection, prepayGateFactIds, resolvedFactValues } = await import('../src/lib/expungement-ai/packet-collection.ts');
const unresolvedInput = { jurisdiction: 'ND', pathwayId: 'first-offense-possession-sealing', requiredInputIds: ['county'], serverFacts: {}, screeningAnswers: {} };
const unresolved = packetCollectionFor(unresolvedInput);
assert.equal(unresolved.facts[0].collection, 'unresolved');
assert.equal(unresolved.facts[0].source, 'unresolved_route_rule_scope');
assert.deepEqual(prepayGateFactIds(unresolved), ['county'], 'unknown ownership never silently waives a required input');
assert.deepEqual(resolvedFactValues(unresolved), {}, 'unknown scope cannot synthesize an answer');
const known = packetCollectionFor({ ...unresolvedInput, screeningAnswers: { county: 'Synthetic County' } });
assert.deepEqual(prepayGateFactIds(known), [], 'reuse an exact known fact despite unresolved scope');
assert.equal(resolvedFactValues(known).county, 'Synthetic County');
const protectedInput = { jurisdiction: 'TEST', pathwayId: 'alpha', requiredInputIds: ['age_at_offense'], serverFacts: {}, screeningAnswers: { date_of_birth: '1990-01-01', offense_date: '2010-01-01' }, routeDecidingFactIds: new Set(), materializationProtectedFactIds: new Set(['age_at_offense']) };
const protectedCollection = resolvePacketCollection(protectedInput);
assert.deepEqual(prepayGateFactIds(protectedCollection), ['age_at_offense']);
assert.deepEqual(resolvedFactValues(protectedCollection), {}, 'narrowing route identity cannot introduce a new evaluator input');
const unresolvedDerivation = resolvePacketCollection({ ...protectedInput, materializationProtectedFactIds: new Set(), unresolvedRouteFactIds: new Set(['age_at_offense']) });
assert.equal(unresolvedDerivation.facts[0].collection, 'unresolved');
assert.deepEqual(resolvedFactValues(unresolvedDerivation), {});
console.log('PASS: production collection reports unresolved scope, keeps required facts, reuses exact known answers, and preserves materialization protection');

// An actual waiting gate must still refuse the correct route once all its
// route-specific escalation facts have been answered.
process.env.RCAP_EVALUATOR_TODAY = '2026-09-22';
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const ny = profile('NY');
const nyWay = ny.pathways.find(p => p.id === 'discretionary-conviction-sealing-by-petition-under-cpl-160-59');
const nyAnswers = Object.fromEntries(projectPublicProfile(ny).questions.map(q => [q.id, q.type === 'multi_select' ? ['None of these'] : q.type === 'number_or_range' ? 1 : 'No']));
Object.assign(nyAnswers, { ownership_scope: 'Yes', jurisdiction_scope: 'State or local', possible_pathway_context: nyWay.label, case_outcome: 'Misdemeanor conviction', offense_level: 'Misdemeanor', sentence_completion_date: 'Yes', financial_obligations: 'Yes', court_requirements_completed: 'Yes', special_preconditions_confirmed: 'Yes', resolved_timing_bucket: 'lt_1_year', disposition_date: '2026-01-01', ny_16059_total_eligible_convictions: 1, ny_16059_felony_convictions: 0 });
const waiting = evaluateScreening({ jurisdiction: 'NY', profileVersion: ny.profileVersion, answers: nyAnswers });
assert.equal(waiting.pathwayId, nyWay.id);
assert.equal(waiting.resultCode, 'not_yet');
assert.equal(waiting.paymentAllowed, false);
assert(waiting.reasons.some(r => r.code === 'ny.timing_bucket_too_recent'));
assert(load(source).routeDecidingFactIds(ny, nyWay).has('resolved_timing_bucket'));
console.log('PASS: real NY waiting-period case retains route identity and blocks payment as not_yet');
