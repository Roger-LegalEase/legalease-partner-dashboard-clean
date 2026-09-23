#!/usr/bin/env node
// Bounded currentness evidence for the MS non-conviction route only. Compare
// accepted task #63 against its parent in separate processes. This records
// collection classification movement; it grants no new runtime authority.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const modules = [
  'src/lib/rcap-engine/route-fact-relevance.ts',
  'src/lib/expungement-ai/packet-information.ts',
  'src/lib/expungement-ai/packet-collection.ts'
];
const sha = 'eee8654389334be519ce1c791d5abda20d6282da'; // Parent of accepted task #63.
if (!process.argv.includes('--snapshot')) {
  const snapshot = base => JSON.parse(execFileSync(process.execPath, [import.meta.filename, '--snapshot', ...(base ? ['--compare-base', base] : [])], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  const before = snapshot(sha);
  const after = snapshot(null);
  assert.equal(after.length, 1);
  const changes = [];
  for (let i = 0; i < after[0].cases.length; i++) {
    const previous = before[0].cases[i].collection;
    const current = after[0].cases[i].collection;
    const moved = ['county', 'participant_full_legal_name'];
    for (const id of moved) {
      const oldFact = previous.facts.find(f => f.factId === id);
      const fact = current.facts.find(f => f.factId === id);
      assert.equal(oldFact.collection, 'prepay_confirmation');
      assert.equal(fact.collection, 'render_required');
      assert.equal(fact.phase, 'render');
      // The fact stays in the same participant section, and remains collected.
      assert.equal(fact.group, oldFact.group);
      assert(before[0].cases[i].gate.includes(id));
      assert(after[0].cases[i].gate.includes(id));
      changes.push({ case: i, fact: id, from: oldFact.collection, to: fact.collection, gatePreserved: true });
    }
    const unchanged = collection => ({ ...collection,
      facts: collection.facts.filter(f => !moved.includes(f.factId)),
      prepayQuestions: collection.prepayQuestions.filter(id => !moved.includes(id)),
      renderQuestions: collection.renderQuestions.filter(id => !moved.includes(id))
    });
    assert.deepEqual(unchanged(current), unchanged(previous), 'only the two recorded collection classifications may change');
  }
  const omit = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
  const withoutCollection = rows => rows.map(row => ({ ...row, cases: row.cases.map(value => omit(value, ['collection'])) }));
  assert.deepEqual(withoutCollection(after), withoutCollection(before), 'same route, evaluator/payment, collected values/gates, DTC/sponsored authority and ambiguity');
  assert(after[0].dtc.allowed);
  assert.equal(after[0].sponsored.allowed, false);
  assert(after[0].cases.some(c => c.result.paymentAllowed));
  register('./lib/ts-esm-loader.mjs', import.meta.url);
  const { loadMsPaidConsumerSuccessor } = await import('../src/lib/rcap/fulfillment/paid-consumer-successor.ts');
  const { stableStringify } = await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
  const { loadMsPaidPacketProof, MS_PAID_PACKET_PROOF } = await import('./lib/ms-paid-packet-proof.mjs');
  const approval = loadMsPaidConsumerSuccessor();
  assert(approval, 'current successor must load without a fallback');
  const { proof, sha256: proofSha256 } = loadMsPaidPacketProof({ stableStringify, approval });
  assert.equal(Object.keys(proof.inputs).length, 76);
  const prior = JSON.parse(execFileSync('git', ['show', `995b5a17c611f580440f834bc3478b85e54d3321:${MS_PAID_PACKET_PROOF}`], { encoding: 'utf8' }));
  const substantive = value => omit(value, ['sourceSha', 'inputs']);
  assert.deepEqual(substantive(proof), substantive(prior), 'the two-pin refresh changes no authority or substantive proof result');
  const manifestPath = 'data/record-clearing/legal-design-packet-set-manifests.json';
  const priorManifest = JSON.parse(execFileSync('git', ['show', `117b469c453a403fbd217f1c441a08c7c68f6b3a:${manifestPath}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  const currentManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const select = manifest => manifest.packetSets.find(entry => entry.packetSetId === 'ms-nonconv-set');
  assert(select(currentManifest), 'the scoped packet set must exist');
  assert.deepEqual(select(currentManifest), select(priorManifest), 'other families cannot create MS authority movement');
  const selectedHash = createHash('sha256').update(stableStringify(select(currentManifest))).digest('hex');
  assert.equal(selectedHash, proof.sourceAuthority.boundInputs.authorityInputs.find(input => input.role === 'packet_set_authority').sha256);
  console.log(JSON.stringify({ baseline: sha, route: after[0].route, cases: 2, changes, preservedScopeSha256: createHash('sha256').update(JSON.stringify(withoutCollection(after))).digest('hex') }, null, 2));
  console.log('PASS: MS scoped packet-information movement; 2 cases; exact recorded classification changes only');
  console.log(`PASS: current V3 loader; ${Object.keys(proof.inputs).length}/76 input hashes; ${proof.results.length}/3 approved artifact bindings; proof SHA256 ${proofSha256}`);
  console.log(`PASS: regenerated proof substantive fields unchanged; selected MS packet-set SHA256 ${selectedHash}`);
  process.exit(0);
}
register('./lib/ts-esm-loader.mjs', import.meta.url);
if (process.argv.includes('--compare-base')) {
  const sources = Object.fromEntries(modules.map(file => [pathToFileURL(`${process.cwd()}/${file}`).href, ts.transpileModule(execFileSync('git', ['show', `${sha}:${file}`], { encoding: 'utf8' }), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText]));
  register(`data:text/javascript,${encodeURIComponent('let sources; export function initialize(data) { sources = data; } export async function load(url, context, next) { return url in sources ? { format: "module", source: sources[url], shortCircuit: true } : next(url, context); }')}`, { data: sources });
}
process.env.RCAP_EVALUATOR_TODAY = '2026-09-22';
const { getAllJurisdictionProfiles } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { evaluateScreening } = await import('../src/lib/rcap-engine/evaluator.ts');
const { packetPlanForPathway } = await import('../src/lib/rcap-engine/packet-planner.ts');
const { pathwayRelevantFactIds } = await import('../src/lib/rcap-engine/route-fact-relevance.ts');
const { packetCollectionFor } = await import('../src/lib/expungement-ai/packet-information.ts');
const { prepayGateFactIds, resolvedFactValues } = await import('../src/lib/expungement-ai/packet-collection.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const { composablePacketSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const { launchGraphCommercialStatus } = await import('../src/lib/rcap/render/commercial-admission.ts');
const out = [];
for (const p of getAllJurisdictionProfiles()) for (const way of p.pathways) {
  const jurisdiction = p.jurisdiction.code;
  const route = `${jurisdiction}:${way.id}`;
  if (route !== 'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal') continue;
  const questions = projectPublicProfile(p).questions;
  const published = new Set(questions.map(q => q.id));
  const allowed = answers => Object.fromEntries(Object.entries(answers).filter(([id]) => published.has(id)));
  const complete = Object.fromEntries(questions.map(q => [q.id, q.type === 'multi_select' ? ['None of these'] : q.type === 'number_or_range' ? 1 : q.options?.find(o => !/unknown|not sure/i.test(o)) ?? 'No']));
  Object.assign(complete, { ownership_scope: 'Yes', jurisdiction_scope: 'State or local', offense_level: 'Misdemeanor', state_exclusion_categories: ['None of these'], pending_cases: 'No', new_convictions_during_waiting_period: 'No', sentence_completion_date: 'Completed', financial_obligations: 'Paid in full', court_requirements_completed: 'Yes', special_preconditions_confirmed: 'Yes', resolved_timing_bucket: 'gt_10_years', disposition_date: '2010-01-01' });
  const cases = [];
  for (const initial of [{ ownership_scope: 'Yes', jurisdiction_scope: 'State or local' }, complete]) {
    const answers = allowed({ ...initial, possible_pathway_context: way.label });
    // A throw is a failed proof, never a preserved evaluator result.
    const evaluate = a => evaluateScreening({ jurisdiction, profileVersion: p.profileVersion, answers: allowed(a) });
    const collection = packetCollectionFor({ jurisdiction, pathwayId: way.id, requiredInputIds: packetPlanForPathway(p, way.id)?.requiredInputIds ?? [], serverFacts: {}, screeningAnswers: answers });
    const values = collection ? resolvedFactValues(collection) : null;
    cases.push({ collection, result: evaluate(answers), gate: collection ? prepayGateFactIds(collection) : null, values, reevaluated: evaluate({ ...answers, ...values }) });
  }
  const spec = composablePacketSpecificationFor(route);
  const binding = spec ? { trackId: spec.trackId, packetFamilyId: spec.packetFamily } : undefined;
  out.push({ route, cases, dtc: packetFulfillmentAuthority(jurisdiction, way.id, 'checkout creation', binding), sponsored: packetFulfillmentAuthority(jurisdiction, way.id, 'sponsored entitlement', binding), commercial: launchGraphCommercialStatus(route), ambiguityFacts: [...pathwayRelevantFactIds(p, way)].sort() });
}
console.log(JSON.stringify(out));
