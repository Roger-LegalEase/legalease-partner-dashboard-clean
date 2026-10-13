import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const H = await import('../src/lib/expungement-ai/ny-16059-sealing-history.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const Q = await import('../src/lib/expungement-ai/ny-16059-case-questions.ts');
const A = await import('../src/lib/expungement-ai/question-answer-state.ts');
const { ny16059ProtectedDocumentPreparation: prepare } = await import('../src/lib/expungement-ai/ny-16059-document-preparation.ts');
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/ny-16059-pre-sealing-history-records.json', import.meta.url)));
const checks = [], check = (id, pass) => checks.push({ id, pass: !!pass });
const equal = (a, b) => { try { assert.deepEqual(a, b); return true; } catch { return false; } };
const model = r => P.protectedPacketInformationModelFor(r);
const patch = (record, answers, verify = false) => P.packetInformationPatch({ existingItem: { id: 'synthetic-history', jurisdiction: 'NY', artifactRefs: {} }, protectedVerification: record, answers, verify })?.protectedTransition.nextVerification;
const app = (id, law, outcome) => ({ ...H.emptyNyPriorApplication(id), law, outcome, courtName: 'Albany City Court', caseNumbers: '0001-2009', copyStatus: 'request_needed' });
const order = law => ({ ...H.emptyNyPriorOrder('order-1'), law, courtName: 'Albany County Court', reference: 'Earlier actual order123', enteredDate: '2016-02-29', currentStatus: 'sealed', convictions: [{ ...H.emptyNySealedConviction('sealed-1'), caseNumbers: 'earlier-2000', courtName: 'Albany City Court', charge: 'Synthetic conviction', section: 'PL synthetic', grade: 'AM', role: law === '16058' ? 'treatment' : '16059' }] });
const answer = h => ({ [H.NY_SEALING_HISTORY_ID]: H.encodeNySealingHistory(h) });
for (const f of fixtures.fixtures) {
  const before = structuredClone(f.record), m = model(f.record), prefix = f.id;
  check(prefix + '/genuine predecessor readable', !!m && equal(f.record, before));
  check(prefix + '/history editor available', m.questions.some(q => q.id === H.NY_SEALING_HISTORY_ID) && P.editablePacketInputIds(m, true).has(H.NY_SEALING_HISTORY_ID));
  check(prefix + '/missing new facts cannot reuse verification', patch(f.record, {}, true)?.status !== 'verified');
  const h = { ...H.emptyNySealingHistory(), prior16058Application: 'no' };
  if (prefix === '16058_denied' || prefix === '16058_pending') { h.prior16058Application = ''; h.applications = [app('app-1', '16058', prefix.endsWith('denied') ? 'withdrawn' : 'pending')]; }
  if (prefix.startsWith('16059_')) h.applications = prefix === '16059_mixed' ? [app('app-1', '16059', 'denied'), app('app-2', '16059', 'pending')] : [app('app-1', '16059', prefix.endsWith('denied') ? 'denied' : 'pending')];
  if (prefix === '16058_entered_order') h.orders = [order('16058')];
  const saved = patch(f.record, answer(h)), current = saved && model(saved);
  check(prefix + '/actual facts can save', !!current && equal(current.initialAnswers[H.NY_SEALING_HISTORY_ID], H.encodeNySealingHistory(h)));
  check(prefix + '/original raw records preserved', equal(current.initialAnswers.ny_16059_covered_case_records, m.initialAnswers.ny_16059_covered_case_records));
  const projection = prepare(saved);
  check(prefix + '/projection keeps actual entries', equal(projection.priorSealingRecords.applications.map(({ attachmentIncluded, ...x }) => x), h.applications));
  check(prefix + '/no invented copy or authority', projection.priorSealingRecords.applications.every(a => a.attachmentIncluded === null) && projection.priorSealingRecords.legalCapacity === null && !projection.generationAllowed);
  if (prefix === '16058_entered_order') {
    check(prefix + '/own motion does not become application', projection.priorApplications.cpl16058.occurred === false && projection.priorSealingRecords.enteredOrders.length === 1);
    check(prefix + '/maximum remains qualified review', patch(saved, {}, true)?.status !== 'verified');
  } else check(prefix + '/actual inventory restores explicit verification', patch(saved, {}, true)?.status === 'verified');
  if (prefix.startsWith('16058_') && prefix !== '16058_entered_order') check(prefix + '/known application occurrence reused', current.questions.find(q => q.id === H.NY_SEALING_HISTORY_ID).prior16058ApplicationKnown === true && projection.priorApplications.cpl16058.occurred === true);
  for (const locale of ['en', 'es']) check(prefix + '/readable ' + locale, !H.formatNySealingHistory(H.encodeNySealingHistory(h), locale).includes('"version"'));
}
const h = { ...H.emptyNySealingHistory(), prior16058Application: 'yes', applications: [app('app-1', '16058', 'denied')] };
const q = Q.nyCasePreparationQuestions().find(q => q.id === H.NY_SEALING_HISTORY_ID);
check('known complete application', A.questionAnswerState(q, H.encodeNySealingHistory(h)) === 'known_valid');
for (const copyStatus of ['', 'unknown', 'unavailable', 'request_needed', 'available']) {
  const v = structuredClone(h); v.applications[0].copyStatus = copyStatus; v.applications[0].copyExplanation = 'Custodian cannot locate the earlier application';
  check(copyStatus + '/copy task never becomes factual preparation gate', A.questionAnswerState(q, H.encodeNySealingHistory(v)) === 'known_valid');
}
for (const field of ['courtName', 'caseNumbers']) { const v = structuredClone(h); v.applications[0][field] = 'unknown'; check(field + '/unknown retained as uncertainty', A.questionAnswerState(q, H.encodeNySealingHistory(v)) === 'uncertain'); }
for (const v of [null, undefined, '', []]) check('empty ' + JSON.stringify(v), A.questionAnswerState(q, v) === 'unanswered');
for (const v of [{ value: H.encodeNySealingHistory(h) }, H.encodeNySealingHistory(h)[0], ['{}'], [JSON.stringify({ ...h, approved: true })], [JSON.stringify({ ...h, applications: [...h.applications, h.applications[0]] })], [JSON.stringify(h).replace('"version":', '"approved":true,"version":')], [JSON.stringify(h).replace('"yes"', 'true')]]) check('invalid shape ' + checks.length, A.questionAnswerState(q, v) === 'invalid');
const inherited = Q.nyCasePreparationQuestions({ ny_16059_16058_grants: { value: 'pending', unknown: false } }).find(q => q.id === H.NY_SEALING_HISTORY_ID);
const inheritedH = { ...h, prior16058Application: '', applications: [app('app-1', '16058', 'pending')] };
check('exact known wrapper reused', inherited.prior16058ApplicationKnown && A.questionAnswerState(inherited, H.encodeNySealingHistory(inheritedH)) === 'known_valid');
for (const raw of ['none', 'granted', 'unknown', { value: 'pending', unknown: true }, { value: 'denied', extra: true }]) check('no false inherited application ' + checks.length, !H.nyKnownPrior16058Application({ ny_16059_16058_grants: raw }));
for (const day of ['2016-02-30', '2016-2-29', '0000-01-01', '2099-01-01', 'unknown', '']) { const v = { ...h, orders: [order('16058')] }; v.orders[0].enteredDate = day; check(day + '/invalid or unknown date stays unready', A.questionAnswerState(q, H.encodeNySealingHistory(v), '2026-10-13') === 'uncertain'); }
const contradiction = (h, facts, code) => H.nySealingHistoryIssues({ ...answer(h), ...facts }).some(i => i.code === code);
check('none does not become actual 16058 absence', !contradiction(h, { ny_16059_16058_grants: 'none' }, 'prior_16058_order_conflict'));
check('denied cannot become pending', contradiction({ ...h, applications: [app('app-1', '16058', 'pending')] }, { ny_16059_16058_grants: 'denied' }, 'prior_16058_order_conflict'));
check('16059 none conflicts with actual filing', contradiction({ ...h, applications: [app('app-1', '16059', 'denied')] }, { ny_16059_application_status: 'none' }, 'prior_16059_application_conflict'));
check('mixed is not one pending application', contradiction({ ...h, applications: [app('app-1', '16059', 'pending')] }, { ny_16059_application_status: 'mixed' }, 'prior_16059_application_conflict'));
for (const zero of [0, '0', '00', { value: '00', unknown: false }]) check('zero prior total conflict ' + JSON.stringify(zero), contradiction({ ...h, orders: [order('16059')] }, { ny_16059_granted_total: zero }, 'prior_16059_order_conflict'));
const sameCases = { ...h, applications: [app('app-1', '16058', 'denied'), app('app-2', '16058', 'pending')] };
check('separate filings for same case retained', H.parseNySealingHistory(H.encodeNySealingHistory(sameCases)).applications.length === 2);
const result = { status: checks.every(c => c.pass) ? 'PASS' : 'FAIL', checks: checks.length, failed: checks.filter(c => !c.pass), assertions: checks };
console.log(JSON.stringify(result, null, 2)); if (result.failed.length) process.exitCode = 1;
