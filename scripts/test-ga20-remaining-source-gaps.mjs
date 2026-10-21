// GA-20/O17: 22 original associations listed in the reviewed copy's sourceGaps.
// Display-only disclosure; preserve the complete measured fixture × kind × hint table.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const states = { CA: ['California', 'California'], MI: ['Michigan', 'Michigan'], NC: ['North Carolina', 'Carolina del Norte'], OR: ['Oregon', 'Oregón'], VA: ['Virginia', 'Virginia'] };
const id = 'state_exclusion_categories';
const capture = process.argv.includes('--capture');
const output = process.argv.find(a => a.startsWith('--output='))?.slice(9);
const baselinePath = new URL('./fixtures/ga20-remaining-source-gap-baseline.json', import.meta.url);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
if (process.argv.includes('--mutation=hint')) {
  const file = 'src/lib/rcap-engine/screening-question-selection.ts';
  const original = fs.readFileSync(file, 'utf8');
  assert(original.includes('export function selectScreeningQuestionIds('));
  const mutated = original.replace('export function selectScreeningQuestionIds(', 'function originalSelection(')
    + '\nexport function selectScreeningQuestionIds(profile, publicProfile, answers) { const ids = originalSelection(profile, publicProfile, answers); if (["CA","MI","NC","OR","VA"].includes(profile.jurisdiction.code) && answers.possible_pathway_context) publicProfile.questions.find(q => q.id === "state_exclusion_categories").helperText += " [" + answers.possible_pathway_context + "]"; return ids; }';
  const source = ts.transpileModule(mutated, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'), { data: { url: pathToFileURL(`${process.cwd()}/${file}`).href, source } });
}
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { projectPublicProfile } = await import('../src/lib/rcap-engine/public-profile-projection.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { selectScreeningQuestionIds } = await import('../src/lib/rcap-engine/screening-question-selection.ts');
const { screensFromQuestionIds } = await import('../src/components/expungement-ai/screening/screens.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const file = 'src/components/expungement-ai/LocalizationProvider.tsx';
const source = ts.transpileModule(fs.readFileSync(file, 'utf8') + '\nexport { LocalizationContext };', { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'), { data: { url: pathToFileURL(`${process.cwd()}/${file}`).href, source } });
const { LocalizationContext } = await import('../src/components/expungement-ai/LocalizationProvider.tsx');
const { QuestionField } = await import('../src/components/expungement-ai/screening/QuestionField.tsx');
const { t, resolveRuntimeText } = await import('../src/lib/expungement-ai/localization.ts');
const evaluated = input => { try { return evaluate(input); } catch (error) { if (error.name !== 'InvalidAnswerError') throw error; return { rejected: { name: error.name, invalidQuestionIds: error.invalidQuestionIds } }; } };
const cases = [['selected', ['Other named excluded offense']], ['unselected', ['None of these']], ['unknown', ['I am not sure']], ['conflicting', ['Other named excluded offense', 'None of these']]];
const allFixtures = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
const catalog = JSON.parse(fs.readFileSync('src/lib/expungement-ai/frontend/reviewed-source-question-copy.json'));
const baseline = capture ? null : JSON.parse(fs.readFileSync(baselinePath));
const result = { states: {} };
let renders = 0, associations = 0;
for (const [state, names] of Object.entries(states)) {
  const profile = getProfileByJurisdiction(state), publicProfile = projectPublicProfile(profile);
  const question = publicProfile.questions.find(q => q.id === id);
  const en = `Some types follow special rules. No named-offense exclusion list is provided here for ${names[0]}.`;
  const es = `Algunos tipos tienen reglas especiales. Aquí no se proporciona una lista de delitos excluidos por nombre para ${names[1]}.`;
  if (!capture) {
    assert.equal(question.helperText, en, `${state}: explicit source-gap disclosure`);
    assert.equal(question.translations.es.helperText, es);
    const entries = catalog.entries.filter(e => e.reviewId === `GA20-${state}-EXPLICIT-SOURCE-GAP-SCREENING`);
    assert.equal(entries.length, 1);
    const entry = entries[0];
    assert.deepEqual(entry.scope, [{ surface: 'screening', state, routeKey: null }]);
    assert.equal(entry.spanishReview.entry, 69);
    assert.deepEqual(entry.sourceGaps.map(g => g.questionRecordId), entry.originalFindingIds);
    assert.equal(entry.sourceGaps.length, { CA: 8, MI: 5, NC: 3, OR: 3, VA: 3 }[state]);
    for (const gap of entry.sourceGaps) {
      assert(gap.routeKey.startsWith(state + ':'));
      assert(profile.pathways.some(p => `${state}:${p.id}` === gap.routeKey));
      assert.equal(gap.status, 'UNRESOLVED_NAMED_OFFENSE_OPTION_MAPPING');
      assert.equal(gap.approvedRouteToTrackMappingRecorded, false);
      assert.equal(createHash('sha256').update(fs.readFileSync(gap.memo)).digest('hex'), gap.memoSha256);
    }
    associations += entry.sourceGaps.length;
  }
  const rows = [], authoritativeHashes = [], protectedHashes = [];
  const fixtures = allFixtures.filter(f => f.pathwayKey.startsWith(state + ':'));
  const hints = publicProfile.questions.find(q => q.id === 'possible_pathway_context')?.options ?? [];
  for (const fixture of fixtures) for (const [kind, raw] of cases) for (const hint of [undefined, ...hints]) {
    const answers = JSON.parse(JSON.stringify({ ...fixture.answers, [id]: raw, possible_pathway_context: hint }));
    const saved = structuredClone(answers), input = { jurisdiction: state, profileVersion: profile.profileVersion, matterId: 'synthetic-verify3-ga20', answers };
    const a = evaluated(input), ev = a.evaluation;
    assert.deepEqual(answers, saved, 'Evaluation does not rewrite saved answers');
    assert.deepEqual(evaluated({ ...input, answers: JSON.parse(JSON.stringify(answers)) }), a, 'Save/reload preserves the complete authoritative result');
    const q = screensFromQuestionIds(publicProfile, selectScreeningQuestionIds(profile, publicProfile, answers)).find(q => q.id === id);
    // Some existing hints hide this question; the pinned base table preserves that behavior.
    if (!capture && q) {
      assert.equal(q.helperText, en, 'Actual helper bytes must not vary by optional hint');
      assert.equal(q.translations.es.helperText, es);
    }
    rows.push({ fixture: fixture.pathwayKey, kind, hint: hint ?? null, rejected: a.rejected?.invalidQuestionIds ?? null, resultCode: ev?.resultCode ?? null, paymentAllowed: ev?.paymentAllowed ?? null,
      routeKeys: ev ? [...new Set([ev.selectedPathwayId, ev.pathwayId, ...(ev.matchedPathwayIds ?? []), ...(ev.pathways ?? []).map(p => p.id ?? p.pathwayId)].filter(Boolean))] : null, questionSelected: !!q });
    authoritativeHashes.push(hash(a));
  }
  for (const fixture of fixtures) {
    const authoritative = evaluate({ jurisdiction: state, profileVersion: profile.profileVersion, matterId: 'synthetic-verify3-ga20', answers: fixture.answers });
    const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: fixture.answers, dependencies: {}, capturedAt: '2026-10-21T00:00:00Z' });
    if (!seed) { protectedHashes.push({ route: fixture.pathwayKey, hash: hash(null) }); continue; }
    const record = { status: 'unverified', revision: 0, draftSnapshot: seed.snapshot, draftHash: seed.hash }, saved = structuredClone(record);
    const model = P.protectedPacketInformationModelFor(record), patch = P.packetInformationPatch({ protectedVerification: record, answers: {} });
    assert.deepEqual(record, saved);
    const unchangedModel = structuredClone(model), normalizedQuestions = new Set();
    for (const questions of [unchangedModel?.questions ?? [], unchangedModel?.builderQuestions ?? []]) for (const q of questions.filter(q => q.id === id)) {
      if (normalizedQuestions.has(q)) continue;
      normalizedQuestions.add(q);
      if (!capture) {
        assert.equal(q.helperText, en, 'Saved-detail consumer shows the same approved disclosure');
        assert.equal(q.translations.es.helperText, es);
      }
      delete q.helperText; delete q.translations.es.helperText;
    }
    protectedHashes.push({ route: fixture.pathwayKey, hash: hash({ record, model: unchangedModel, patch }) });
  }
  const unchangedProjection = structuredClone(publicProfile), unchangedQuestion = unchangedProjection.questions.find(q => q.id === id);
  delete unchangedQuestion.helperText; delete unchangedQuestion.translations.es.helperText;
  result.states[state] = { rows, authoritativeHashes, protectedHashes, projectionHash: hash(unchangedProjection) };
  if (!capture) assert.deepEqual(result.states[state], baseline.states[state], `${state}: exact recorded outcomes, owner facts, protected model/no-op and all other displayed fields`);
  for (const locale of ['en', 'es']) for (const [, raw] of cases) {
    const saved = structuredClone(raw), value = { locale, setLocale() {}, t: (key, fallback, vars) => t(locale, key, fallback, vars), text: (text, options) => resolveRuntimeText(locale, text, options) };
    const markup = renderToStaticMarkup(React.createElement(LocalizationContext.Provider, { value }, React.createElement(QuestionField, { question, stateCode: state, value: raw, onChange() { assert.fail('Rendering must preserve owner facts'); } })));
    if (!capture) {
      const expected = renderToStaticMarkup(React.createElement('span', null, locale === 'es' ? es : en)).slice(6, -7);
      assert(markup.includes(expected), 'Actual localized control renders the full gap disclosure');
      assert(markup.includes('aria-describedby="q-state_exclusion_categories-helper'), 'Helper remains accessible');
    }
    assert.deepEqual(raw, saved); renders++;
  }
}
if (output) fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: capture ? 'BASELINE_CAPTURE_ONLY' : 'PASS', cases: Object.values(result.states).reduce((n, s) => n + s.rows.length, 0), protectedCases: Object.values(result.states).reduce((n, s) => n + s.protectedHashes.length, 0), associations, renders }));
