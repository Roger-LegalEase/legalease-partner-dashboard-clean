// GA-20/O17: Q-91e4e9bcefd189aa35bf, Q-d4e9b2a8f9b1851fe1da,
// Q-295de026cdb8f248d77f, Q-72de1c85edff281c83ca. Display only; no new exclusion predicate.
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
    + '\nexport function selectScreeningQuestionIds(profile, publicProfile, answers) { const ids = originalSelection(profile, publicProfile, answers); return profile.jurisdiction.code === "AL" && answers.possible_pathway_context !== profile.pathways.find(p => p.id === "eligible-conviction-expungement-under-the-redeemer-act").label ? ids.filter(id => id !== "state_exclusion_categories") : ids; }';
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
const id = 'state_exclusion_categories', profile = getProfileByJurisdiction('AL');
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
const fixtures = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.filter(f => f.pathwayKey.startsWith('AL:'));
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
    const input = { jurisdiction: 'AL', profileVersion: profile.profileVersion, matterId: 'synthetic-ga20-al', answers };
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
const fixture = fixtures.find(f => f.pathwayKey.includes('redeemer'));
const authoritative = evaluate({ jurisdiction: 'AL', profileVersion: profile.profileVersion, matterId: 'synthetic-ga20-al', answers: fixture.answers });
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
  if (p.jurisdiction.code === 'AL') {
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
  const markup = render(question, 'AL'), helper = locale === 'es' ? question.translations.es.helperText : question.helperText;
  if (!capture) {
    for (const citation of ['12-25-32(15)', '17-3-30.1', '383.51', '15-20A-5']) assert(helper.includes(citation));
    assert(helper.includes('2015-185') && helper.includes('15 '), 'moral-turpitude exception retains both conditions');
    assert(helper.includes('CDL') && helper.includes('CLP') && helper.includes('CMV'), 'driving conditions retained');
    if (locale === 'en') assert(helper.includes("If the person was convicted of any of the offenses enumerated in 49 C.F.R. \u00a7 383.51, the person was not operating a commercial motor vehicle at the time of the offense, or was not holding a commercial driver license or a commercial learner permit at the time of the offense."), 'the driving condition retains the enacted disjunction verbatim');
    const renderedText = markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    for (const line of helper.split('\n').filter(Boolean)) {
      const escaped = renderToStaticMarkup(React.createElement('span', null, line)).slice(6, -7).replace(/\s+/g, ' ');
      assert(renderedText.includes(escaped), 'the actual localized control retains every reviewed source line: ' + line);
    }
    assert.equal((markup.match(/<details>/g) ?? []).length, 4, 'four separate source lists, collapsed by default');
    assert.equal((markup.match(/<summary>/g) ?? []).length, 4);
    assert(!markup.includes('<details open'), 'source lists do not obscure the answer choices by default');
    assert(markup.includes('whitespace-pre-line'), 'AL list preserves readable lines');
    assert(!render(question, 'AK').includes('whitespace-pre-line'), 'no other state gains this rendering change');
    assert(!render({ ...question, id: 'unrelated_helper' }, 'AL').includes('whitespace-pre-line'), 'no other AL question changes rendering');
    assert(markup.includes('aria-describedby="q-state_exclusion_categories-helper'), 'short guidance remains associated with the control');
    const described = markup.match(/<p id="q-state_exclusion_categories-helper"[^>]*>([\s\S]*?)<\/p>/)?.[1];
    assert(described && !described.includes('12-25-32'), 'long collapsed lists are not repeated as each input’s accessible description');
  }
  assert.deepEqual(raw, saved); renders++;
}
const report = { status: capture ? 'BASELINE_CAPTURE_ONLY' : 'PASS', originalIds: ['Q-91e4e9bcefd189aa35bf', 'Q-d4e9b2a8f9b1851fe1da', 'Q-295de026cdb8f248d77f', 'Q-72de1c85edff281c83ca'], invariants, question, renders };
if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, savedScreeningCases: rows.length, protectedCases: protectedRows.length, stateControls: projections.length, actualRenders: renders, baselineCompared: Boolean(baseline) }));
