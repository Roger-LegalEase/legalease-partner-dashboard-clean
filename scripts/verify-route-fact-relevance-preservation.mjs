#!/usr/bin/env node
// Task evidence, not a second census/consumer registry. Compare the three #63
// modules against an explicit baseline in isolated loader instances. No checkout,
// tracked mutation, remote service, or generated repository artifact.
import assert from 'node:assert/strict';
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
const sha = process.argv[process.argv.indexOf('--compare-base') + 1];
if (!process.argv.includes('--snapshot')) {
  assert(process.argv.includes('--compare-base') && /^[a-f0-9]{40}$/.test(sha), 'Supply --compare-base <exact SHA>');
  const snapshot = base => JSON.parse(execFileSync(process.execPath, [import.meta.filename, '--snapshot', ...(base ? ['--compare-base', base] : [])], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  const before = snapshot(sha);
  const after = snapshot(null);
  assert.deepEqual(after, before, 'route identity, evaluator outputs, collected values/gates, ambiguity, DTC/sponsored fulfillment and commercial authority must survive');
  assert.equal(after.length, 344);
  assert(after.some(r => r.dtc.allowed), 'at least one real DTC fulfillment positive');
  assert(after.some(r => r.cases.some(c => c.result.paymentAllowed)), 'real paymentAllowed positives, not only refusals');
  console.log(`PASS: ${after.length} routes / ${after.length * 2} evaluator cases; exact before/after equality against ${sha}`);
  console.log(`DTC fulfillment positives: ${after.filter(r => r.dtc.allowed).map(r => r.route).join(', ')}`);
  console.log(`Sponsored fulfillment positives: ${after.filter(r => r.sponsored.allowed).map(r => r.route).join(', ') || 'none; current channel holds retained'}`);
  console.log(`Snapshot SHA256: ${createHash('sha256').update(JSON.stringify(after)).digest('hex')}`);
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
    cases.push({ result: evaluate(answers), gate: collection ? prepayGateFactIds(collection) : null, values, reevaluated: evaluate({ ...answers, ...values }) });
  }
  const spec = composablePacketSpecificationFor(route);
  const binding = spec ? { trackId: spec.trackId, packetFamilyId: spec.packetFamily } : undefined;
  out.push({ route, cases, dtc: packetFulfillmentAuthority(jurisdiction, way.id, 'checkout creation', binding), sponsored: packetFulfillmentAuthority(jurisdiction, way.id, 'sponsored entitlement', binding), commercial: launchGraphCommercialStatus(route), ambiguityFacts: [...pathwayRelevantFactIds(p, way)].sort() });
}
console.log(JSON.stringify(out));
