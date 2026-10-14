import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const F = await import('../src/lib/expungement-ai/ny-16059-future-applications.ts');
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const Q = await import('../src/lib/expungement-ai/ny-16059-case-questions.ts');
const A = await import('../src/lib/expungement-ai/question-answer-state.ts');
const { ny16059ProtectedDocumentPreparation: prepare } = await import('../src/lib/expungement-ai/ny-16059-document-preparation.ts');
const { ny16059OwnedCompletionDiagnostic: diagnose } = await import('../src/lib/expungement-ai/ny-16059-owned-completion.ts');
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/ny-16059-pre-future-application-records.json', import.meta.url)));
const checks = [], check = (id, pass) => checks.push({ id, pass: !!pass });
const equal = (a, b) => { try { assert.deepEqual(a, b); return true; } catch { return false; } };
const model = r => P.protectedPacketInformationModelFor(r);
const patch = (record, answers, verify = false) => P.packetInformationPatch({ existingItem: { id: 'synthetic-future', jurisdiction: 'NY', artifactRefs: {} }, protectedVerification: record, answers, verify })?.protectedTransition.nextVerification;
// Retained predecessor fixtures predate these source-owned caption fields.
// Supply explicit new synthetic facts through the ordinary protected transition;
// do not rewrite old snapshots or weaken their verification hold.
const supplyCurrentCaptionFacts = (record, prefix) => {
 const facts = {date_of_birth:{value:'1980-02-03',unknown:false},street_address:{value:'123 Synthetic Example Street',unknown:false},city_state_zip:{value:'Albany, NY 12207',unknown:false},phone_number:{value:'202-555-0101',unknown:false}};
 const ids = Object.keys(facts), before = structuredClone(record), missing = P.protectedPacketInformationModelFor(record).missingInputIds;
 check(prefix+'/old fixture lacks exactly the four current caption facts', equal(missing.filter(id=>ids.includes(id)).sort(), [...ids].sort()));
 check(prefix+'/missing caption facts cannot reuse final verification', patch(record,{},true)?.status !== 'verified');
 const saved = patch(record,facts), current = P.protectedPacketInformationModelFor(saved);
 check(prefix+'/explicit caption save preserves other missing obligations', equal(current.missingInputIds, missing.filter(id=>!ids.includes(id))));
 check(prefix+'/explicit caption save records each new fact', ids.every(id=>equal(saved.draftSnapshot.packetAnswers[id],facts[id])));
 check(prefix+'/caption transition leaves historical record unchanged', equal(record,before));
 return saved;
};
const make = (answers, manual = false) => {
 const c = { ...F.emptyNyFutureCase('case-first'), source: manual ? 'additional' : 'saved_future', ...(manual ? { caseNumbers: 'corrected-older-2001', courtName: 'Corrected Court' } : {}) };
 c.savedReview = F.nyFutureCaseReview(F.nyFutureReferences(answers), c);
 return { ...F.emptyNyFutureApplications(), applications: [{ id: 'future-first', laws: ['16059'], cases: [c] }] };
};
const wire = v => ({ [F.NY_FUTURE_ID]: F.encodeNyFutureApplications(v) });
for (const f of fixtures.fixtures) {
 const old = structuredClone(f.record), m = model(old), id = f.id;
 check(id + '/genuine predecessor readable unchanged', !!m && equal(old, f.record));
 check(id + '/future editor installed', m.questions.some(q => q.id === F.NY_FUTURE_ID));
 const intent = F.nyFutureIntent(m.initialAnswers);
 check(id + '/intent known independently', intent === (id.startsWith('no_future') ? false : id.startsWith('unknown') ? null : true));
 const captioned = supplyCurrentCaptionFacts(old, id);
 if (intent === true) {
  check(id + '/old missing law cannot retain verification', patch(captioned, {}, true)?.status !== 'verified');
  const v = make(m.initialAnswers), saved = patch(captioned, wire(v)), current = saved && model(saved);
  check(id + '/actual intent saves', !!current && equal(current.initialAnswers[F.NY_FUTURE_ID], F.encodeNyFutureApplications(v)));
  check(id + '/old raw case and court preserved', equal(current.initialAnswers.ny_16059_future_case_numbers, m.initialAnswers.ny_16059_future_case_numbers) && equal(current.initialAnswers.ny_16059_future_court, m.initialAnswers.ny_16059_future_court));
  check(id + '/history inventory preserved', equal(current.initialAnswers.ny_16059_prior_sealing_records, m.initialAnswers.ny_16059_prior_sealing_records));
  const p = prepare(saved);
  check(id + '/projection complete and no authority', p.futureApplications.complete && !p.futureApplications.legallyReviewed && !p.generationAllowed && p.futureApplications.applications[0].filed === null);
  check(id + '/explicit verification outcome', (patch(saved, {}, true)?.status === 'verified') === (id !== 'multiple_future_cases_complete_history_held'));
  const changed = patch(saved, { ny_16059_future_court: 'Changed actual court' });
  check(id + '/changed saved source requires review', prepare(changed).futureApplications.associationIssues.some(i => i.code === 'future_saved_case_review') && patch(changed, {}, true)?.status !== 'verified');
  const manual = patch(captioned, wire(make(m.initialAnswers, true)));
  check(id + '/manual correction retains old evidence', prepare(manual).futureApplications.complete && prepare(manual).futureApplications.applications[0].cases[0].resolvedCourtName === 'Corrected Court' && equal(model(manual).initialAnswers.ny_16059_future_court, m.initialAnswers.ny_16059_future_court));
  const multiple = structuredClone(v); multiple.applications.push({ id: 'future-second', laws: ['16058', '16059'], cases: [{ ...v.applications[0].cases[0], id: 'case-second' }, { ...F.emptyNyFutureCase('case-other'), caseNumbers: '000004 / SCI-004', courtName: 'Another actual court' }] });
  const multi = patch(saved, wire(multiple));
  check(id + '/multiple intentions cases retained without dedup', prepare(multi).futureApplications.applications.length === 2 && prepare(multi).futureApplications.applications[1].cases.length === 2);
  check(id + '/multiple cannot flatten single printed row', diagnose('synthetic-future', multi).rows.filter(r => ['Court_Name', 'Court Name 3', 'Case Number 3'].includes(r.field)).every(r => r.disposition !== 'KNOWN_FACT_NOT_WRITTEN'));
  const no = patch(multi, { ny_16059_future_application: 'No' });
  check(id + '/No retains inactive records', equal(model(no).initialAnswers[F.NY_FUTURE_ID], F.encodeNyFutureApplications(multiple)) && !prepare(no).futureApplications.active && !prepare(no).futureApplications.complete);
  check(id + '/No does not require inactive records', !model(no).missingInputIds.includes(F.NY_FUTURE_ID));
  const removed = patch(multi, wire({ ...multiple, applications: [] }));
  check(id + '/explicit removal archives original facts', removed.draftSnapshot.dependencies.semanticAnswerHistory.some(e => e.factId === F.NY_FUTURE_ID && equal(e.value, F.encodeNyFutureApplications(multiple))));
  for (const locale of ['en', 'es']) check(id + '/readable ' + locale, F.formatNyFutureApplications(F.encodeNyFutureApplications(multiple), locale, F.nyFutureReferences(m.initialAnswers)).includes('CPL 160.58') && !F.formatNyFutureApplications(F.encodeNyFutureApplications(multiple), locale).includes('reviewed:'));
 } else if (intent === false) {
  check(id + '/No needs no added question', !m.missingInputIds.includes(F.NY_FUTURE_ID) && !P.reviewEditablePacketInputIds(m).has(F.NY_FUTURE_ID));
  check(id + '/No positive verification preserved', patch(captioned, {}, true)?.status === 'verified');
 } else check(id + '/unknown retains hold', patch(captioned, {}, true)?.status !== 'verified');
}
const facts = { ny_16059_future_application: 'Yes', ny_16059_future_case_numbers: '0001', ny_16059_future_court: 'Albany Court' };
const v = make(facts), q = Q.nyCasePreparationQuestions(facts).find(q => q.id === F.NY_FUTURE_ID);
check('complete reference state', A.questionAnswerState(q, F.encodeNyFutureApplications(v)) === 'known_valid');
for (const bad of [{ value: F.encodeNyFutureApplications(v) }, [JSON.stringify({ ...v, approved: true })], [JSON.stringify(v).replace('"version":', '"version":"extra","version":')], [JSON.stringify({ ...v, applications: [v.applications[0], v.applications[0]] })], [JSON.stringify({ ...v, applications: [{ ...v.applications[0], laws: ['unknown', '16059'] }] })], F.encodeNyFutureApplications(v)[0], ['{}'], [JSON.stringify(v), JSON.stringify(v)]]) check('strict wire ' + checks.length, A.questionAnswerState(q, bad) === 'invalid');
for (const laws of [[], ['unknown']]) { const x = structuredClone(v); x.applications[0].laws = laws; check('unknown law ' + checks.length, A.questionAnswerState(q, F.encodeNyFutureApplications(x)) === 'uncertain'); }
for (const raw of [undefined, null, '', []]) check('unanswered ' + String(raw), A.questionAnswerState(q, raw) === 'unanswered');
for (const raw of [{ value: 'No', unknown: true }, { value: 'No', extra: true }, 'I am not sure']) check('not falsely No ' + checks.length, F.nyFutureIntent({ ny_16059_future_application: raw }) === null);
for (const locale of ['en', 'es']) check('localized new question ' + locale, !!(locale === 'en' ? q.prompt : q.translations.es.prompt));
const result = { status: checks.every(c => c.pass) ? 'PASS' : 'FAIL', checks: checks.length, failed: checks.filter(c => !c.pass), assertions: checks };
console.log(JSON.stringify(result, null, 2)); if (result.failed.length) process.exitCode = 1;
