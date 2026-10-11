import assert from 'node:assert/strict';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY = '2026-10-11';
const { protectedPacketDraftSeedFromAuthoritative: seedFor, protectedPacketInformationModelFor: modelFor,
  editablePacketInputIds, reviewEditablePacketInputIds } = await import('../src/lib/expungement-ai/packet-information.ts');
const { verificationSummary } = await import('../src/components/expungement-ai/verification-summary.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { MS_NONCONVICTION_SCREENING_ANSWERS: screening, MS_NONCONVICTION_ROUTE: route } = await import('./lib/rcap-ms-nonconviction-fixture.mjs');
const authoritative = evaluate({ jurisdiction: 'MS', profileVersion: route.profileVersion, matterId: 'synthetic-review-edit', answers: screening });
const seed = seedFor({ authoritative, screeningAnswers: screening,
  prefilledAnswers: { service_method: 'Synthetic later-service instruction', arresting_agency: 'Synthetic agency' },
  packetAnswers: { actual_arrest: 'No' }, dependencies: { commercialFlowVersion: 1 }, capturedAt: '2026-10-11T12:00:00Z' });
const model = modelFor({ status: 'unverified', reason: 'synthetic', revision: 0, draftHash: seed.hash, draftSnapshot: seed.snapshot });
assert.ok(model);
const unchanged = structuredClone(model);
const original = verificationSummary(model);
const allowed = editablePacketInputIds(model);
const reviewIds = reviewEditablePacketInputIds(model);
const projected = verificationSummary({ ...model, editableInputIds: [...reviewIds] });
assert.ok(original && projected);
const row = (summary, id) => [...summary.screeningAnswers, ...summary.packetAnswers].find(fact => fact.id === id);
assert.equal(model.initialAnswers.financial_obligations, 'Yes');
assert.equal(model.builderQuestions.some(q => q.id === 'financial_obligations'), false, 'reuse must not reintroduce intake');
assert.equal(allowed.has('financial_obligations'), true, 'the existing owner edit endpoint already permits this fact');
assert.equal(row(original, 'financial_obligations').editId, null, 'reproduces former missing navigation');
assert.equal(row(projected, 'financial_obligations').editId, 'financial_obligations');
assert.ok(model.questions.some(q => q.id === row(projected, 'financial_obligations').editId), 'link has its existing actual control');
for (const id of ['case_outcome', 'offense_level', 'offense_category', 'arresting_agency', 'service_method']) {
  assert.ok(row(original, id), `negative subject exists: ${id}`);
  assert.equal(row(projected, id).editId, row(original, id).editId, `no unrelated correction expansion: ${id}`);
}
for (const fact of projected.screeningAnswers) assert.equal(fact.editId, null, 'screening provenance is not made editable');
const allIds = model.verificationSummary.map(fact => fact.id);
const overbroad = verificationSummary({ ...model, editableInputIds: allIds });
for (const fact of overbroad.screeningAnswers) assert.equal(fact.editId, null, 'source restriction survives supplied edit metadata');
assert.deepEqual(overbroad.context, original.context, 'system contexts do not become participant questions');
const withoutLinks = summary => ({ ...summary, packetAnswers: summary.packetAnswers.map(row => ({ ...row, editId: null })) });
assert.deepEqual(withoutLinks(projected), withoutLinks(original), 'canonical facts, labels, values and manifest context unchanged');
assert.deepEqual(model, unchanged, 'display projection never mutates authority or answers');
assert.equal(reviewEditablePacketInputIds({ ...model, questions: model.questions.filter(q => q.id !== 'financial_obligations') }).has('financial_obligations'), false, 'no link without a control');
assert.equal(reviewEditablePacketInputIds({ ...model, serverFacts: { ...model.serverFacts, financial_obligations: 'Yes' } }).has('financial_obligations'), false, 'server-owned mutation cannot get a completion edit link');
assert.equal(reviewEditablePacketInputIds({ ...model, requiredInputIds: model.requiredInputIds.filter(id => id !== 'financial_obligations') }).has('financial_obligations'), false, 'non-required/unowned target cannot gain authorization');
assert.deepEqual(verificationSummary({ ...model, editableInputIds: [] }).packetAnswers.map(f => f.editId), projected.packetAnswers.map(() => null), 'explicit empty server policy does not fall back to builder');
console.log('PASS: reused completion review correction, existing control ownership, no unrelated edit expansion, source/system exclusions and unchanged canonical facts. Protected browser correction remains separate.');
