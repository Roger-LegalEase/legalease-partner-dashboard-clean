import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const R = await import('../src/lib/expungement-ai/ny-16059-case-records.ts');
const C = await import('../src/lib/expungement-ai/ny-16059-case-classification.ts');
const S = await import('../src/lib/expungement-ai/ny-16059-statutory-class.ts');
const Q = await import('../src/lib/expungement-ai/ny-16059-case-questions.ts');
const V = await import('../src/lib/expungement-ai/ny-16059-filing-venue.ts');
const { ny16059ProtectedDocumentPreparation: prepare } = await import('../src/lib/expungement-ai/ny-16059-document-preparation.ts');
const { displayVerificationAnswer, verificationSummary } = await import('../src/components/expungement-ai/verification-summary.ts');
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/ny-16059-pre-venue-records.json', import.meta.url)));
const checks = [], check = (id, pass) => checks.push({ id, pass: !!pass });
const same = (a, b) => { try { assert.deepEqual(a, b); return true; } catch { return false; } };
const item = { id: 'synthetic-venue', jurisdiction: 'NY', artifactRefs: {} };
const patch = (record, answers, verify = false) => P.packetInformationPatch({ existingItem: item, protectedVerification: record, answers, verify })?.protectedTransition.nextVerification;
const model = record => P.protectedPacketInformationModelFor(record);
const cases = record => R.parseNyCourtCaseRecords(model(record).initialAnswers[R.NY_CASE_RECORDS_ID]);
const exactClasses = records => {
  for (const record of records) for (const conviction of record.convictions) conviction.statutoryClass = S.withNyStatutoryClass(conviction,
    conviction.classification.recordClass.value === 'felony' ? 'felony_e' : 'misdemeanor_a');
  return records;
};
for (const fixture of fixtures.fixtures) {
  const old = structuredClone(fixture.record), before = structuredClone(old), prefix = fixture.id;
  check(prefix + '/genuine engine predecessor retained', old.status === 'verified' && fixtures.head === '20b2f0adc3b893f948bbe3dadcb39b740e2742a9');
  const current = model(old);
  check(prefix + '/predecessor remains owner readable', !!current && same(old, before));
  check(prefix + '/all prior raw case facts reach editor', same(current.initialAnswers[R.NY_CASE_RECORDS_ID], old.snapshot.packetAnswers[R.NY_CASE_RECORDS_ID]));
  check(prefix + '/new facts remain editable', Q.NY_VENUE_FACT_IDS.every(id => P.editablePacketInputIds(current, true).has(id)));
  if (prefix !== 'same_case_changed_court_after_verified') check(prefix + '/same counterexample cannot verify', !current.reviewSafety.safe && patch(old, {}, true)?.status !== 'verified');
  if (prefix === 'equal_class_older_court') {
    check(prefix + '/raw grade never parsed into class', current.nyCaseIssues.some(issue => issue.code === 'filing_class_detail_required') && cases(old).every(record => !record.convictions[0].statutoryClass));
    const classified = exactClasses(cases(old)), wire = R.encodeNyCourtCaseRecords(classified);
    const wrong = patch(old, { [R.NY_CASE_RECORDS_ID]: wire });
    check(prefix + '/exact same classes expose earlier court contradiction', model(wrong).nyCaseIssues.some(issue => issue.code === 'filing_destination_conflict') && patch(wrong, {}, true)?.status !== 'verified');
    const correct = patch(wrong, { [Q.NY_FILING_CASE_ID]: 'case:second' });
    check(prefix + '/correct latest conviction court permits explicit verification', model(correct).reviewSafety.safe && patch(correct, {}, true)?.status === 'verified');
    check(prefix + '/whole prior case array archived', correct.draftSnapshot.dependencies.semanticAnswerHistory.some(entry => entry.factId === R.NY_CASE_RECORDS_ID && same(entry.value, old.snapshot.packetAnswers[R.NY_CASE_RECORDS_ID])));
    const projection = prepare(correct);
    check(prefix + '/source and judicial authority remain separate', !projection.generationAllowed && !projection.casePreparation.filingDestination.legallyReviewed && projection.casePreparation.legalConvictionGroupCount === null);
    const detached = prepare(correct); detached.casePreparation.records[0].statutoryClass = 'mutant'; detached.casePreparation.filingDestination.comparison.candidateCaseIds.push('mutant');
    check(prefix + '/projection is isolated', same(prepare(correct), projection));
    for (const locale of ['en', 'es']) check(prefix + '/readable class summary ' + locale, R.formatNyCourtCaseRecords(wire, locale).includes(locale === 'en' ? 'Class A misdemeanor' : 'Delito menor de clase A') && !R.formatNyCourtCaseRecords(wire, locale).includes('convictionId'));
  }
  if (prefix === 'felony_recent_misdemeanor_court') {
    check(prefix + '/broad felony proves wrong misdemeanor destination', current.nyCaseIssues.some(issue => issue.code === 'filing_destination_conflict'));
    const correct = patch(old, { [Q.NY_FILING_CASE_ID]: 'case:first' });
    check(prefix + '/single felony court needs no redundant letter class', !model(correct).nyCaseIssues.some(issue => issue.code === 'filing_class_detail_required') && patch(correct, {}, true)?.status === 'verified');
  }
  if (prefix === 'same_case_changed_court_after_verified') check(prefix + '/single actual court remains supported', patch(old, {}, true)?.status === 'verified');
  if (prefix === 'single_unrelated_court') {
    const directionFacts = { [Q.NY_COURT_DIRECTION_BASIS_ID]: 'court_direction', [Q.NY_COURT_DIRECTION_TEXT_IDS[0]]: { value: 'Synthetic clerk of Albany City Court', unknown: false },
      [Q.NY_COURT_DIRECTION_TEXT_IDS[1]]: { value: '2026-10-01; synthetic letter reference 123', unknown: false },
      [Q.NY_COURT_DIRECTION_TEXT_IDS[2]]: { value: 'Synthetic instruction to submit the identified application at the named destination.', unknown: false },
      [Q.NY_COURT_DIRECTION_CASES_ID]: ['case:first'] };
    let directed = patch(old, directionFacts);
    const token = Q.nyCourtDirectionConfirmation(model(directed).initialAnswers);
    check(prefix + '/exact saved direction can be acknowledged', typeof token === 'string' && token.startsWith('reviewed:'));
    const reorderedFacts = structuredClone(model(directed).initialAnswers);
    for (const id of Q.NY_COURT_DIRECTION_TEXT_IDS) reorderedFacts[id] = Object.fromEntries(Object.entries(reorderedFacts[id]).reverse());
    check(prefix + '/object key order is not a new fact', Q.nyCourtDirectionConfirmation(reorderedFacts) === token);
    reorderedFacts[R.NY_CASE_RECORDS_ID] = cases(directed).map(record => JSON.stringify(Object.fromEntries(Object.entries(record).reverse())));
    check(prefix + '/case object key order is not a new fact', Q.nyCourtDirectionConfirmation(reorderedFacts) === token);
    reorderedFacts[Q.NY_COURT_DIRECTION_TEXT_IDS[0]].unknown = true;
    check(prefix + '/unknown flag remains an exact owner fact', Q.nyCourtDirectionConfirmation(reorderedFacts) !== token);
    directed = patch(directed, { [Q.NY_COURT_DIRECTION_CONFIRMATION_ID]: token });
    check(prefix + '/prose and owner confirmation never bypass source review', model(directed).nyCaseIssues.some(issue => issue.code === 'filing_direction_review_required') && patch(directed, {}, true)?.status !== 'verified');
    const projection = prepare(directed).casePreparation;
    check(prefix + '/direction and original cases preserved', projection.filingDestination.directionReview.status === 'unresolved_source_and_assignment_review' && !projection.filingDestination.directionReview.sourceAccepted
      && projection.records[0].courtName === 'Albany City Court' && projection.filingDestination.courtName === 'Buffalo City Court');
    check(prefix + '/confirmation displays readable label', !displayVerificationAnswer(token, model(directed).questions.find(q => q.id === Q.NY_COURT_DIRECTION_CONFIRMATION_ID)).includes('reviewed:'));
    for (const [name, answers] of [['destination', { [Q.NY_OTHER_COURT_COUNTY]: { value: 'Different county', unknown: false } }], ['instruction', { [Q.NY_COURT_DIRECTION_TEXT_IDS[2]]: 'Changed instruction' }], ['scope', { [Q.NY_COURT_DIRECTION_CASES_ID]: ['case:removed'] }], ['case facts', { [R.NY_CASE_RECORDS_ID]: R.encodeNyCourtCaseRecords(cases(directed).map(record => ({ ...record, courtName: 'Changed court' }))) }]]) {
      const changed = patch(directed, answers), m = model(changed);
      check(prefix + '/changed ' + name + ' stales exact review', m.nyCaseIssues.some(issue => issue.code === 'filing_direction_scope_review'));
      check(prefix + '/changed ' + name + ' keeps old confirmation', m.initialAnswers[Q.NY_COURT_DIRECTION_CONFIRMATION_ID] === token);
      check(prefix + '/changed ' + name + ' never shows binding JSON', !displayVerificationAnswer(token, m.questions.find(q => q.id === Q.NY_COURT_DIRECTION_CONFIRMATION_ID)).includes('reviewed:'));
    }
    const corrected = patch(directed, { [Q.NY_FILING_CASE_ID]: 'case:first' });
    check(prefix + '/ordinary correction remains supported', patch(corrected, {}, true)?.status === 'verified');
    check(prefix + '/inactive direction evidence retained', same(model(corrected).initialAnswers[Q.NY_COURT_DIRECTION_TEXT_IDS[2]], directionFacts[Q.NY_COURT_DIRECTION_TEXT_IDS[2]]));
    const summarize = record => { const m = model(record); return verificationSummary({ ...m, editableInputIds: [...P.editablePacketInputIds(m, true)] }); };
    const preserved = structuredClone(corrected), inactive = summarize(corrected).packetAnswers.filter(row => [Q.NY_OTHER_COURT_NAME, Q.NY_OTHER_COURT_COUNTY, ...Q.NY_VENUE_FACT_IDS].includes(row.id));
    check(prefix + '/all eight inactive facts clearly identified EN', inactive.length === 8 && inactive.every(row => row.value.startsWith('Saved from an earlier different-court choice; not used')));
    check(prefix + '/all eight inactive facts clearly identified ES', inactive.every(row => row.valueEs.startsWith('Guardado de una selección anterior de otro tribunal; no se usa')));
    check(prefix + '/inactive display never rewrites source', same(corrected, preserved));
    check(prefix + '/active direction not falsely labeled inactive', summarize(directed).packetAnswers.every(row => !row.value.startsWith('Saved from an earlier different-court choice')));
    check(prefix + '/unknown destination not falsely labeled inactive', summarize(patch(corrected, { [Q.NY_FILING_CASE_ID]: 'unknown' })).packetAnswers.every(row => !row.value.startsWith('Saved from an earlier different-court choice')));
  }
}
const fixtureRecords = exactClasses(cases(fixtures.fixtures.find(f => f.id === 'equal_class_older_court').record));
const compare = (records, expected, label) => {
  check(label, same(V.nyFilingVenueComparison(records).candidateCaseIds.slice().sort(), expected.slice().sort()));
  check(label + '/order independent', same(V.nyFilingVenueComparison([...records].reverse()).candidateCaseIds.slice().sort(), expected.slice().sort()));
};
compare(fixtureRecords, ['second'], 'same class uses last conviction');
const sameCourt = structuredClone(fixtureRecords); sameCourt[1].courtName = sameCourt[0].courtName; sameCourt[1].courtCounty = sameCourt[0].courtCounty;
for (const record of sameCourt) delete record.convictions[0].statutoryClass;
compare(sameCourt, ['first', 'second'], 'same actual court accepts every stable case without class');
const dateTie = structuredClone(fixtureRecords); dateTie[0].convictions[0].convictionDate = dateTie[1].convictions[0].convictionDate;
compare(dateTie, ['first', 'second'], 'equal dates preserve candidate courts');
const laterSentence = structuredClone(fixtureRecords); laterSentence[0].convictions[0].sentences[0].sentenceDate = '2025-01-01';
compare(laterSentence, ['second'], 'later resentencing cannot choose earlier conviction court');
const aVersusB = structuredClone(fixtureRecords); aVersusB[1].convictions[0].statutoryClass = S.withNyStatutoryClass(aVersusB[1].convictions[0], 'misdemeanor_b');
compare(aVersusB, ['first'], 'A misdemeanor dominates newer B misdemeanor');
for (const unknown of ['', 'unknown', 'misdemeanor_unclassified']) {
  const records = structuredClone(fixtureRecords); records[0].convictions[0].statutoryClass = S.withNyStatutoryClass(records[0].convictions[0], unknown);
  compare(records, ['first', 'second'], unknown + ' is never ranked by sentence length');
  if (unknown === 'misdemeanor_unclassified') check('unclassified competing severity remains review', V.nyFilingVenueComparison(records).reviewReason === 'incomparable_classes');
}
for (const field of ['id', 'charge', 'section', 'grade']) {
  const conviction = structuredClone(fixtureRecords[0].convictions[0]); conviction[field] += '-changed';
  check(field + '/raw identity change stales exact class', !S.nyStatutoryClassCurrent(conviction));
  conviction.classification = C.withNyClassificationAnswer(conviction, 'recordClass', 'misdemeanor');
  check(field + '/broad-class renewal cannot renew exact class', !S.nyStatutoryClassCurrent(conviction));
}
const changedBroad = structuredClone(fixtureRecords[0].convictions[0]); changedBroad.classification = C.withNyClassificationAnswer(changedBroad, 'recordClass', 'felony');
check('changing broad class invalidates fine class', !S.nyStatutoryClassCurrent(changedBroad));
for (const mutate of [value => value.approved = true, value => value.version = 'approved', value => value.record.convictionId = [], value => value.value = 'Class A misdemeanor', value => value.record.sourceApproved = true]) {
  const records = structuredClone(fixtureRecords); mutate(records[0].convictions[0].statutoryClass);
  check('malformed detail rejected/' + checks.length, R.parseNyCourtCaseRecords(R.encodeNyCourtCaseRecords(records)) === null);
}
const conflict = structuredClone(fixtureRecords); conflict[0].convictions[0].statutoryClass = S.withNyStatutoryClass(conflict[0].convictions[0], 'felony_e');
check('contradictory fine class never silently reclassifies', V.nyFilingVenueComparison(conflict).conflictingClassConvictionIds.includes('first-conviction'));
const classA = structuredClone(fixtureRecords); const a = classA[0].convictions[0];
a.classification = C.withNyClassificationAnswer(a, 'recordClass', 'felony'); a.statutoryClass = S.withNyStatutoryClass(a, 'felony_a');
check('class A cannot coexist with no excluded categories', Q.nyCaseAssociationIssues({ [R.NY_CASE_RECORDS_ID]: R.encodeNyCourtCaseRecords(classA) }).some(issue => issue.code === 'statutory_class_a_category_conflict'));
const report = { status: checks.every(c => c.pass) ? 'PASS' : 'FAIL', checks: checks.length, failed: checks.filter(c => !c.pass), details: checks,
  limits: ['Independent source/legal/language approval and actual authenticated persistence are separate.', 'Ties, unclassified rankings and court directions are retained for review, never agent approval.'] };
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, checks: report.checks, failed: report.failed }, null, 2)); assert.equal(report.failed.length, 0);
