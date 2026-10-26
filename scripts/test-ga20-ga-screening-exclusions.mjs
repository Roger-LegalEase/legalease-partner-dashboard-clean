// GA-20/O17: Q-bf92951c51e266f94893, Q-774a4eae87f50f3b04ee, Q-b5ae15b6b7f52ac4e85f, Q-b51b70e44d0a7884520a, Q-4f3a9ec16de93946c6a3, Q-f3986ea0ffff866b09af.
// Route-labeled Georgia sources only; preserve all existing eligibility and saved facts.
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
    + '\nexport function selectScreeningQuestionIds(profile, publicProfile, answers) { const ids = originalSelection(profile, publicProfile, answers); return profile.jurisdiction.code === "GA" && answers.possible_pathway_context !== profile.pathways[0].label ? ids.filter(id => id !== "state_exclusion_categories") : ids; }';
  const source = ts.transpileModule(mutated, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  register(`data:text/javascript,${encodeURIComponent('let d;export function initialize(data){d=data;}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c);}')}`, { data: { url: pathToFileURL(`${process.cwd()}/${file}`).href, source } });
}

if (process.argv.includes('--mutation=copy')) {
  const file = 'src/lib/rcap-engine/public-profile-projection.ts';
  const original = fs.readFileSync(file, 'utf8');
  assert(original.includes('export function projectPublicProfile('));
  const mutated = original.replace('export function projectPublicProfile(', 'function originalProjection(')
    + '\nexport function projectPublicProfile(profile) { const p = originalProjection(profile); if (profile.jurisdiction.code === "GA") p.questions.find(q => q.id === "state_exclusion_categories").helperText = "Some types follow special rules."; return p; }';
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
const id = 'state_exclusion_categories', profile = getProfileByJurisdiction('GA');
const publicProfile = projectPublicProfile(profile), question = publicProfile.questions.find(q => q.id === id);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const capture = process.argv.includes('--capture');
const output = process.argv.find(a => a.startsWith('--output='))?.slice(9);
const baseline = process.argv.find(a => a.startsWith('--baseline='))?.slice(11);
if (!capture) {
  assert.equal(hash(question.helperText), "335eb291873d0721c4005a70ae81bb18f9bd086e25de7a33e23ba1b6c8e0a141");
  assert.equal(hash(question.translations.es.helperText), "38e251197750cda46ed6db8ae041cf88f36f57624626b6cc30a1b26f7a01d0b7");
}
const cases = [
  ['selected', ['Other named excluded offense']],
  ['unselected', ['None of these']],
  ['unknown', ['I am not sure']],
  ['conflicting', ['Other named excluded offense', 'None of these']]
];
const fixtures = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.filter(f => f.pathwayKey.startsWith('GA:'));
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
    const input = { jurisdiction: 'GA', profileVersion: profile.profileVersion, matterId: 'synthetic-ga20-ga', answers };
    const a = evaluated(input);
    assert.deepEqual(answers, saved, 'reading and routing must preserve saved raw answers');
    assert.deepEqual(evaluated({ ...input, answers: JSON.parse(JSON.stringify(answers)) }), a, 'save/reload keeps the full authoritative result');
    if (kind === 'conflicting') assert(a.rejected?.invalidQuestionIds.includes(id), 'conflicting exclusive answers retain the original validation refusal');
    // Existing pardon facts take priority over the generic exclusion answer.
    const pardon = hint === 'Restriction and sealing of a pardoned felony';
    if (kind === 'selected') assert.equal(a.evaluation.resultCode, pardon ? 'needs_more_info' : 'likely_not_eligible');
    if (kind === 'unknown') assert.equal(a.evaluation.resultCode, pardon ? 'needs_more_info' : 'needs_review');
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
  const authoritative = evaluate({ jurisdiction: 'GA', profileVersion: profile.profileVersion, matterId: 'synthetic-ga20-ga', answers: fixture.answers });
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
  if (p.jurisdiction.code === 'GA') {
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
  const markup = render(question, 'GA'), helper = locale === 'es' ? question.translations.es.helperText : question.helperText;
  if (!capture) {
    const expected = helper;
    assert.equal(hash(helper), locale === 'es' ? "38e251197750cda46ed6db8ae041cf88f36f57624626b6cc30a1b26f7a01d0b7" : "335eb291873d0721c4005a70ae81bb18f9bd086e25de7a33e23ba1b6c8e0a141", 'the complete route-labeled source copy matches the reviewed text');
    const escaped = renderToStaticMarkup(React.createElement('span', null, expected)).slice(6, -7);
    assert(markup.includes(escaped), 'the actual localized control renders the complete reviewed sources');
    assert(markup.includes('aria-describedby="q-state_exclusion_categories-helper'), 'the helper stays associated with the control');
    assert(!markup.includes('<details'), 'the existing helper renders the reviewed Georgia copy');
    assert(markup.includes('whitespace-pre-line'), 'Georgia source lists retain readable lines');
    assert(!render(question, 'AK').includes('whitespace-pre-line'), 'unrelated AK helper remains unchanged');
    assert(!render({ ...question, id: 'unrelated_helper' }, 'GA').includes('whitespace-pre-line'), 'unrelated GA helpers remain unchanged');
  }
  assert.deepEqual(raw, saved); renders++;
}
const report = { status: capture ? 'BASELINE_CAPTURE_ONLY' : 'PASS', originalIds: ["Q-bf92951c51e266f94893", "Q-774a4eae87f50f3b04ee", "Q-b5ae15b6b7f52ac4e85f", "Q-b51b70e44d0a7884520a", "Q-4f3a9ec16de93946c6a3", "Q-f3986ea0ffff866b09af"], invariants, question, renders };
if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, savedScreeningCases: rows.length, protectedCases: protectedRows.length, stateControls: projections.length, actualRenders: renders, baselineCompared: Boolean(baseline) }));
