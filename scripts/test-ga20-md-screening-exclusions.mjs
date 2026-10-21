// GA-20/O17: Q-a8c8c56c12eefb8cec11, Q-f8b20a85c968ad3bfccf, Q-3869f71e5bd4f07f59cb, Q-5ade628bf4d887a5a7da, Q-2ce9054a7a11466c960e, Q-360fec2e38f1b3f39301, Q-3e21da08bf12c19031eb, Q-f0cdc3dda91b0ec12040.
// Route-labeled Maryland sources only; preserve all existing eligibility and saved facts.
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
    + '\nexport function selectScreeningQuestionIds(profile, publicProfile, answers) { const ids = originalSelection(profile, publicProfile, answers); return profile.jurisdiction.code === "MD" && answers.possible_pathway_context !== profile.pathways[0].label ? ids.filter(id => id !== "state_exclusion_categories") : ids; }';
  const source = ts.transpileModule(mutated, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  register(`data:text/javascript,${encodeURIComponent('let d;export function initialize(data){d=data;}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c);}')}`, { data: { url: pathToFileURL(`${process.cwd()}/${file}`).href, source } });
}

if (process.argv.includes('--mutation=copy')) {
  const file = 'src/lib/rcap-engine/public-profile-projection.ts';
  const original = fs.readFileSync(file, 'utf8');
  assert(original.includes('export function projectPublicProfile('));
  const mutated = original.replace('export function projectPublicProfile(', 'function originalProjection(')
    + '\nexport function projectPublicProfile(profile) { const p = originalProjection(profile); if (profile.jurisdiction.code === "MD") p.questions.find(q => q.id === "state_exclusion_categories").helperText = "Some types follow special rules."; return p; }';
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
const id = 'state_exclusion_categories', profile = getProfileByJurisdiction('MD');
const publicProfile = projectPublicProfile(profile), question = publicProfile.questions.find(q => q.id === id);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const capture = process.argv.includes('--capture');
const output = process.argv.find(a => a.startsWith('--output='))?.slice(9);
const baseline = process.argv.find(a => a.startsWith('--baseline='))?.slice(11);
if (!capture) {
  assert.equal(hash(question.helperText), "80fe631b8ccee58b0f0e2233ea5245074d067e60f94f8995c973307c2fbf70b1");
  assert.equal(hash(question.translations.es.helperText), "931265d2dc39f443285cc6ba71b13d618b3028b0260907155e1d9046fe2f15a0");
}
const cases = [
  ['selected', ['Other named excluded offense']],
  ['unselected', ['None of these']],
  ['unknown', ['I am not sure']],
  ['conflicting', ['Other named excluded offense', 'None of these']]
];
const fixtures = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.filter(f => f.pathwayKey.startsWith('MD:'));
assert(fixtures.length >= 7);
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
    const input = { jurisdiction: 'MD', profileVersion: profile.profileVersion, matterId: 'synthetic-ga20-md', answers };
    const a = evaluated(input);
    assert.deepEqual(answers, saved, 'reading and routing must preserve saved raw answers');
    assert.deepEqual(evaluated({ ...input, answers: JSON.parse(JSON.stringify(answers)) }), a, 'save/reload keeps the full authoritative result');
    if (kind === 'conflicting') assert(a.rejected?.invalidQuestionIds.includes(id), 'conflicting exclusive answers retain the original validation refusal');
    // The existing MD police-record route review takes precedence over a generic exclusion.
    const policeReview = hint === 'Police-record expungement when no charge was filed under § 10-103';
    if (kind === 'selected') assert.equal(a.evaluation.resultCode, policeReview ? 'needs_review' : 'likely_not_eligible');
    if (kind === 'unknown') assert.equal(a.evaluation.resultCode, 'needs_review');
    if (kind === 'selected' || kind === 'unknown') assert.equal(a.evaluation.paymentAllowed, false);
    const selectedIds = selectScreeningQuestionIds(profile, publicProfile, answers);
    const q = screensFromQuestionIds(publicProfile, selectedIds).find(q => q.id === id);
    assert(q, 'the real screening selection must retain the exclusion helper for every input and optional hint');
    if (!capture) assert.equal(q.helperText, question.helperText, 'actual saved inputs/hints see the complete route-labeled helper');
    rows.push({ route: fixture.pathwayKey, kind, hint: hint ?? null, answers, authoritative: a });
  }
}
// Existing protected models do not consume this helper; preserve their complete saved behavior.
const protectedRows = [];
for (const fixture of fixtures) {
  const authoritative = evaluate({ jurisdiction: 'MD', profileVersion: profile.profileVersion, matterId: 'synthetic-ga20-md', answers: fixture.answers });
  const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: fixture.answers, dependencies: {}, capturedAt: '2026-10-21T00:00:00Z' });
  if (!seed) { protectedRows.push({ route: fixture.pathwayKey, seed: null }); continue; }
  const record = { status: 'unverified', revision: 0, draftSnapshot: seed.snapshot, draftHash: P.protectedPacketDraftHash(seed.snapshot) };
  const saved = structuredClone(record), model = P.protectedPacketInformationModelFor(record);
  const patch = P.packetInformationPatch({ protectedVerification: record, answers: {} });
  assert.deepEqual(record, saved);
  assert(!model.questions.some(q => q.id === id), 'the screening source-gap helper does not create protected intake');
  protectedRows.push({ route: fixture.pathwayKey, record, model, patch });
}
const projections = getAllJurisdictionProfiles().map(p => {
  const projected = projectPublicProfile(p), copy = structuredClone(projected);
  if (p.jurisdiction.code === 'MD') {
    const q = copy.questions.find(q => q.id === id);
    delete q.helperText; delete q.translations.es.helperText;
  }
  return { state: p.jurisdiction.code, hash: hash(copy) };
});
const invariants = { rows, protectedRows, projections };
if (baseline) assert.deepEqual(JSON.parse(JSON.stringify(invariants)), JSON.parse(fs.readFileSync(baseline)).invariants, 'complete outcomes, saved records, protected models, and every other projected field equal the base');
let renders = 0;
for (const locale of ['en', 'es']) for (const [, raw] of cases) {
  const value = { locale, setLocale() {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (text, options) => resolveRuntimeText(locale, text, options) };
  const saved = structuredClone(raw);
  const render = (q, state) => renderToStaticMarkup(React.createElement(LocalizationContext.Provider, { value }, React.createElement(QuestionField, { question: q, stateCode: state, value: raw, onChange() { assert.fail('render must not replace a saved answer'); } })));
  const markup = render(question, 'MD'), helper = locale === 'es' ? question.translations.es.helperText : question.helperText;
  if (!capture) {
    const expected = helper;
    assert.equal(hash(helper), locale === 'es' ? "931265d2dc39f443285cc6ba71b13d618b3028b0260907155e1d9046fe2f15a0" : "80fe631b8ccee58b0f0e2233ea5245074d067e60f94f8995c973307c2fbf70b1", 'the complete route-labeled source copy matches the reviewed text');
    const escaped = renderToStaticMarkup(React.createElement('span', null, expected)).slice(6, -7);
    assert(markup.includes(escaped), 'the actual localized control renders the complete reviewed sources');
    assert(markup.includes('aria-describedby="q-state_exclusion_categories-helper'), 'the helper stays associated with the control');
    assert(!markup.includes('<details'), 'the existing helper renders the reviewed Maryland copy');
    assert(markup.includes('whitespace-pre-line'), 'Maryland source lists retain readable lines');
    assert(!render(question, 'AK').includes('whitespace-pre-line'), 'unrelated AK helper remains unchanged');
    assert(!render({ ...question, id: 'unrelated_helper' }, 'MD').includes('whitespace-pre-line'), 'unrelated GA helpers remain unchanged');
  }
  assert.deepEqual(raw, saved); renders++;
}
const report = { status: capture ? 'BASELINE_CAPTURE_ONLY' : 'PASS', originalIds: ["Q-a8c8c56c12eefb8cec11", "Q-f8b20a85c968ad3bfccf", "Q-3869f71e5bd4f07f59cb", "Q-5ade628bf4d887a5a7da", "Q-2ce9054a7a11466c960e", "Q-360fec2e38f1b3f39301", "Q-3e21da08bf12c19031eb", "Q-f0cdc3dda91b0ec12040"], invariants, question, renders };
if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, savedScreeningCases: rows.length, protectedCases: protectedRows.length, stateControls: projections.length, actualRenders: renders, baselineCompared: Boolean(baseline) }));
