// GA-20/O17: Q-a8601e373e0fa51a8cb0, Q-7d58ec67f72b021847a2,
// Q-9fe26d4838ff6522137a, Q-4c90f13f53e750b46d4a. Display only; no new exclusion predicate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
register('./lib/ts-esm-loader.mjs', import.meta.url);
if (process.argv.includes('--mutation=hint')) {
  const file = 'src/lib/rcap-engine/screening-question-selection.ts';
  const original = fs.readFileSync(file, 'utf8');
  assert(original.includes('export function selectScreeningQuestionIds('));
  const mutated = original.replace('export function selectScreeningQuestionIds(', 'function originalSelection(')
    + '\nexport function selectScreeningQuestionIds(profile, publicProfile, answers) { const ids = originalSelection(profile, publicProfile, answers); return profile.jurisdiction.code === "CO" && answers.possible_pathway_context !== profile.pathways.find(p => p.id === "petition-based-conviction-sealing-jdf-612-24-72-706").label ? ids.filter(id => id !== "state_exclusion_categories") : ids; }';
  const source = ts.transpileModule(mutated, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  register(`data:text/javascript,${encodeURIComponent('let d;export function initialize(data){d=data;}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c);}')}`, { data: { url: pathToFileURL(`${process.cwd()}/${file}`).href, source } });
}

const { getAllJurisdictionProfiles, getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { screensFromQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const file = 'src/components/expungement-ai/LocalizationProvider.tsx';
const source = ts.transpileModule(fs.readFileSync(file, 'utf8') + '\nexport { LocalizationContext };', { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
register(`data:text/javascript,${encodeURIComponent('let d;export function initialize(data){d=data;}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c);}')}`, { data: { url: pathToFileURL(`${process.cwd()}/${file}`).href, source } });
const { LocalizationContext } = await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const { QuestionField } = await import('../src/components/expungement-ai/screening/QuestionField.tsx');
const { t, resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const id = 'state_exclusion_categories', profile = getProfileByJurisdiction('CO');
const publicProfile = projectPublicProfile(profile), question = publicProfile.questions.find(q => q.id === id);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const capture = process.argv.includes('--capture');
const output = process.argv.find(a => a.startsWith('--output='))?.slice(9);
const baseline = process.argv.find(a => a.startsWith('--baseline='))?.slice(11);
const cases = [
  ['selected', ['Other named excluded offense']],
  ['unselected', ['None of these']],
  ['unknown', ['I am not sure']],
  ['conflicting', ['Other named excluded offense', 'None of these']]
];
const fixtures = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.filter(f => f.pathwayKey.startsWith('CO:'));
assert(fixtures.length >= 3);
const rows = [];
function evaluated(input) {
  try { return evaluate(input); } catch (error) {
    if (error.name !== 'InvalidAnswerError') throw error;
    return { rejected: { name: error.name, message: error.message, invalidQuestionIds: error.invalidQuestionIds } };
  }
}
for (const fixture of fixtures) for (const [kind, raw] of cases) {
  for (const hint of [undefined, ...publicProfile.questions.find(q => q.id === 'possible_pathway_context').options]) {
    const answers = JSON.parse(JSON.stringify({ ...fixture.answers, [id]: raw, possible_pathway_context: hint }));
    const saved = structuredClone(answers);
    const input = { jurisdiction: 'CO', profileVersion: profile.profileVersion, matterId: 'synthetic-ga20-co', answers };
    const a = evaluated(input);
    assert.deepEqual(answers, saved, 'reading and routing must preserve saved raw answers');
    assert.deepEqual(evaluated({ ...input, answers: JSON.parse(JSON.stringify(answers)) }), a, 'save/reload keeps the full authoritative result');
    if (kind === 'conflicting') assert(a.rejected?.invalidQuestionIds.includes(id), 'conflicting exclusive answers retain the original validation refusal');
    if (kind === 'selected') assert.equal(a.evaluation.resultCode, 'likely_not_eligible');
    if (kind === 'unknown') assert.equal(a.evaluation.resultCode, 'needs_review');
    if (kind === 'selected' || kind === 'unknown') assert.equal(a.evaluation.paymentAllowed, false);
    const selectedIds = selectScreeningQuestionIds(profile, publicProfile, answers);
    const q = screensFromQuestionIds(publicProfile, selectedIds).find(q => q.id === id);
    assert(q, 'the real screening selection must retain the exclusion helper for every input and optional hint');
    if (!capture) assert.equal(q.helperText, question.helperText, 'actual saved inputs/hints see the complete route-labeled helper');
    rows.push({ route: fixture.pathwayKey, kind, hint: hint ?? null, answers, authoritative: a });
  }
}
// Preserve existing protected priority/conflict behavior too; no model is invented for a refused route.
const fixture = fixtures.find(f => f.pathwayKey.includes('jdf-612'));
const authoritative = evaluate({ jurisdiction: 'CO', profileVersion: profile.profileVersion, matterId: 'synthetic-ga20-co', answers: fixture.answers });
const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: fixture.answers, dependencies: {}, capturedAt: '2026-10-21T00:00:00Z' });
assert(seed);
const protectedRows = [];
for (const [kind, raw] of cases) {
  const snapshot = structuredClone(seed.snapshot);
  for (const map of ['screeningAnswers', 'prefilledAnswers', 'packetAnswers']) delete snapshot[map][id];
  snapshot.screeningAnswers[id] = raw;
  if (kind === 'conflicting') { snapshot.screeningAnswers[id] = ['Other named excluded offense']; snapshot.packetAnswers[id] = ['None of these']; }
  const record = { status: 'unverified', revision: 0, draftSnapshot: snapshot, draftHash: P.protectedPacketDraftHash(snapshot) };
  const saved = structuredClone(record), model = P.protectedPacketInformationModelFor(record);
  const patch = P.packetInformationPatch({ protectedVerification: record, answers: {} });
  assert.deepEqual(record, saved, 'viewing/refusing preserves the entire protected record');
  if (patch?.protectedTransition) assert.deepEqual(patch.protectedTransition.nextVerification, saved, 'no-op save preserves the record');
  protectedRows.push({ kind, evaluation: P.evaluateProtectedPacketFacts(snapshot), model, patch });
}
const projections = getAllJurisdictionProfiles().map(p => {
  const projected = projectPublicProfile(p), copy = structuredClone(projected);
  if (p.jurisdiction.code === 'CO') {
    const q = copy.questions.find(q => q.id === id);
    delete q.helperText; delete q.translations.es.helperText;
  }
  return { state: p.jurisdiction.code, hash: hash(copy) };
});
const invariants = { rows, protectedRows, projections };
if (baseline) assert.deepEqual(JSON.parse(JSON.stringify(invariants)), JSON.parse(fs.readFileSync(baseline)).invariants, 'complete outcomes, saved records, protected models, and every other projected field equal the base');
let renders = 0;
for (const locale of ['en', 'es']) for (const [kind, raw] of cases) {
  const value = { locale, setLocale() {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (text, options) => resolveRuntimeText(locale, text, options) };
  const saved = structuredClone(raw);
  const render = (q, state) => renderToStaticMarkup(React.createElement(LocalizationContext.Provider, { value }, React.createElement(QuestionField, { question: q, stateCode: state, value: raw, onChange() { assert.fail('render must not replace a saved answer'); } })));
  const markup = render(question, 'CO'), helper = locale === 'es' ? question.translations.es.helperText : question.helperText;
  if (!capture) {
    // GA-20 reviewer F1: PDF line wraps must not split a statutory citation.
    assert(!/\d-\s+\d/.test(helper), 'statutory citations must not contain extraction line-wrap spaces');
    for (const citation of ['18-1.3-401(13)', '18-18-407', '18-3-401', '24-4.1-302(1)', '18-5-902(1)']) {
      assert(helper.includes(citation), `source citation ${citation} must remain intact in ${locale}`);
    }
    assert(helper.includes('JDF 612') && helper.includes('8(a)') && helper.includes('8(b)'));
    assert(helper.includes('19-1-306(8)') && helper.includes('13-3-117') && helper.includes('24-72-704'));
    assert.equal(helper.split('\n').filter(line => line.startsWith('• ')).length, 18);
    for (const clause of ['(a)', '(b)', '(c)', '(d)']) assert(helper.includes(clause));
    const escaped = renderToStaticMarkup(React.createElement('span', null, helper)).slice(6, -7);
    assert(markup.includes(escaped), 'the actual localized QuestionField renders the entire list');
    assert(markup.includes('whitespace-pre-line'), 'CO exclusion list preserves readable lines');
    assert(!render(question, 'AK').includes('whitespace-pre-line'), 'unrelated states keep their existing rendering');
    assert(!render({ ...question, id: 'unrelated_helper' }, 'CO').includes('whitespace-pre-line'), 'no other CO question changes rendering');
    assert(markup.includes('aria-describedby="q-state_exclusion_categories-helper'), 'helper remains associated with the control');
  }
  assert.deepEqual(raw, saved); renders++;
}
const report = { status: capture ? 'BASELINE_CAPTURE_ONLY' : 'PASS', originalIds: ['Q-a8601e373e0fa51a8cb0', 'Q-7d58ec67f72b021847a2', 'Q-9fe26d4838ff6522137a', 'Q-4c90f13f53e750b46d4a'], invariants, question, renders };
if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, savedScreeningCases: rows.length, protectedCases: protectedRows.length, stateControls: projections.length, actualRenders: renders, baselineCompared: Boolean(baseline) }));
