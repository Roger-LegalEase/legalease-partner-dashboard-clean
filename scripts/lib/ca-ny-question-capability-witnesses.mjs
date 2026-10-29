// Synthetic control witnesses only: no eligibility evaluation, matter, packet or release authority.
import { caProp64ContactQuestions } from '../../src/lib/expungement-ai/ca-prop64-contact-questions.ts';
import { CA_FILER_CONTACT, CA_COURT_CONTACT, caContactContext, emptyCaContact } from '../../src/lib/expungement-ai/ca-prop64-contact-answer.ts';
import { NY_CASE_RECORDS_ID, emptyNyCourtCaseRecord, emptyNyConvictionRecord, emptyNySentenceEvent, encodeNyCourtCaseRecords } from '../../src/lib/expungement-ai/ny-16059-case-records.ts';
import { withNyClassificationAnswer } from '../../src/lib/expungement-ai/ny-16059-case-classification.ts';
import { withNyStatutoryClass } from '../../src/lib/expungement-ai/ny-16059-statutory-class.ts';
import { nyCasePreparationQuestions, NY_CASE_RECONCILIATION_ID, NY_COURT_DIRECTION_CASES_ID, NY_COURT_DIRECTION_CONFIRMATION_ID, NY_FILING_CASE_ID, NY_OTHER_COURT_NAME, NY_OTHER_COURT_COUNTY, NY_COURT_DIRECTION_BASIS_ID, NY_COURT_DIRECTION_TEXT_IDS, nyAdditionalCaseConfirmation, nyCourtDirectionConfirmation } from '../../src/lib/expungement-ai/ny-16059-case-questions.ts';
import { NY_SEALING_HISTORY_ID, emptyNySealingHistory, emptyNyPriorApplication, encodeNySealingHistory } from '../../src/lib/expungement-ai/ny-16059-sealing-history.ts';
import { NY_FUTURE_ID, emptyNyFutureApplications, emptyNyFutureCase, encodeNyFutureApplications, nyFutureReferences, nyFutureCaseReview } from '../../src/lib/expungement-ai/ny-16059-future-applications.ts';
export const CA_NY_CAPABILITY_ROUTE_IDS = { CA: 'prop-64-completed-sentence-application-11361-8', NY: 'discretionary-conviction-sealing-by-petition-under-cpl-160-59' };
function courtCase(id, number, first = false) {
  const conviction = { ...emptyNyConvictionRecord(id + '-offense'), charge: 'Synthetic offense', section: 'Synthetic section', grade: 'Misdemeanor', convictionDate: '2009-12-01', sentences: [{ ...emptyNySentenceEvent(id + '-sentence'), sentenceDate: '2010-01-01', sentenceTerms: 'Synthetic sentence terms', postSentenceCustody: 'no' }] };
  conviction.classification = withNyClassificationAnswer(conviction, 'recordClass', 'misdemeanor');
  conviction.classification = withNyClassificationAnswer(conviction, 'excluded', ['none']);
  conviction.statutoryClass = withNyStatutoryClass(conviction, 'misdemeanor_a');
  return { ...emptyNyCourtCaseRecord(id), priorCaseReference: first ? 'first' : '', caseNumbers: number, courtName: 'Synthetic ' + id + ' Court', courtCounty: 'Synthetic ' + id + ' County', certificateStatus: 'request_needed', convictions: [conviction] };
}
/** Reuses the production constructors and strict encoders used by the existing route tests. */
export function caNyQuestionCapabilityScenarios() {
  const caFacts = { ca_prop64_filer_representation: 'self_represented', participant_full_legal_name: 'Synthetic Control Witness', ca_prop64_filing_court_county: 'Yolo' }, context = caContactContext(caFacts);
  const filer = { ...emptyCaContact(CA_FILER_CONTACT, context), street: '100 Synthetic Street', city: 'Woodland', state: 'CA', zip: '95695', phone: { status: 'absent', value: '' }, fax: { status: 'absent', value: '' }, email: { status: 'absent', value: '' }, firm: { status: 'absent', value: '' } };
  const court = { ...emptyCaContact(CA_COURT_CONTACT, context), street: '1000 Synthetic Court Street', cityStateZip: 'Woodland, CA 95695', mailingRelationship: 'same' };
  const cases = [courtCase('first', '0001', true), courtCase('second', '0002')], records = encodeNyCourtCaseRecords(cases);
  const history = { ...emptyNySealingHistory(), prior16058Application: 'yes', applications: [{ ...emptyNyPriorApplication('prior-application'), law: '16058', courtName: 'Synthetic Prior Court', caseNumbers: 'PRIOR-0001', outcome: 'denied', copyStatus: 'request_needed' }] };
  const nyFacts = { [NY_CASE_RECORDS_ID]: records, ny_16059_first_case_numbers: '0001', ny_16059_additional_cases: 'Yes', ny_16059_additional_case_numbers: '0002', ny_16059_16058_grants: 'denied', ny_16059_future_application: 'Yes', ny_16059_future_case_numbers: 'FUTURE-0001', ny_16059_future_court: 'Synthetic Future Court', [NY_FILING_CASE_ID]: 'different_court', [NY_OTHER_COURT_NAME]: 'Synthetic Receiving Court', [NY_OTHER_COURT_COUNTY]: 'Synthetic Receiving County', [NY_COURT_DIRECTION_BASIS_ID]: 'court_direction', [NY_COURT_DIRECTION_TEXT_IDS[0]]: 'Synthetic issuer for control test', [NY_COURT_DIRECTION_TEXT_IDS[1]]: '2026-10-01; synthetic control reference', [NY_COURT_DIRECTION_TEXT_IDS[2]]: 'Synthetic instruction wording for control test', [NY_COURT_DIRECTION_CASES_ID]: ['case:first', 'case:second'] };
  const futureCase = { ...emptyNyFutureCase('future-case'), source: 'saved_future' }; futureCase.savedReview = nyFutureCaseReview(nyFutureReferences(nyFacts), futureCase);
  const future = { ...emptyNyFutureApplications(), applications: [{ id: 'future-application', laws: ['16059'], cases: [futureCase] }] };
  const nyQuestions = nyCasePreparationQuestions(nyFacts), caQuestions = caProp64ContactQuestions(caFacts), wire = value => [JSON.stringify(value)];
  const row = (state, id, facts, questions, valid, uncertain, malformed, prerequisiteIds = []) => ({ state, routeId: CA_NY_CAPABILITY_ROUTE_IDS[state], id, facts, question: questions.find(q => q.id === id), valid, uncertain, malformed, prerequisiteIds });
  return [
    row('CA', CA_FILER_CONTACT, caFacts, caQuestions, wire(filer), wire({ ...filer, phone: { status: 'unknown', value: 'earlier phone' } }), [wire({ ...filer, approved: true }), [JSON.stringify(filer), JSON.stringify(filer)], { value: wire(filer) }], ['ca_prop64_filer_representation', 'participant_full_legal_name']),
    row('CA', CA_COURT_CONTACT, caFacts, caQuestions, wire(court), wire({ ...court, street: 'unknown' }), [wire({ ...court, approved: true }), [JSON.stringify(court), JSON.stringify(court)], { value: wire(court) }], ['ca_prop64_filing_court_county']),
    row('NY', NY_CASE_RECORDS_ID, nyFacts, nyQuestions, records, encodeNyCourtCaseRecords([emptyNyCourtCaseRecord('incomplete')]), [encodeNyCourtCaseRecords([cases[0], cases[0]]), ['{}'], { value: records }]),
    row('NY', NY_SEALING_HISTORY_ID, nyFacts, nyQuestions, encodeNySealingHistory(history), encodeNySealingHistory({ ...history, prior16058Application: 'unknown' }), [wire({ ...history, approved: true }), wire({ ...history, applications: [history.applications[0], history.applications[0]] }), { value: encodeNySealingHistory(history) }]),
    row('NY', NY_FUTURE_ID, nyFacts, nyQuestions, encodeNyFutureApplications(future), encodeNyFutureApplications({ ...future, applications: [{ ...future.applications[0], laws: ['unknown'] }] }), [wire({ ...future, approved: true }), wire({ ...future, applications: [future.applications[0], future.applications[0]] }), { value: encodeNyFutureApplications(future) }], ['ny_16059_future_application']),
    row('NY', NY_CASE_RECONCILIATION_ID, nyFacts, nyQuestions, nyAdditionalCaseConfirmation(nyFacts), 'unknown', [[], 'confirmed:not-the-current-inventory', { value: 'Yes', extra: true }], [NY_CASE_RECORDS_ID, 'ny_16059_first_case_numbers', 'ny_16059_additional_cases', 'ny_16059_additional_case_numbers']),
    row('NY', NY_COURT_DIRECTION_CASES_ID, nyFacts, nyQuestions, ['case:first', 'case:second'], null, [['case:first', 'case:first'], ['case:unsupported'], { value: ['case:first'] }], [NY_CASE_RECORDS_ID, NY_FILING_CASE_ID]),
    row('NY', NY_COURT_DIRECTION_CONFIRMATION_ID, nyFacts, nyQuestions, nyCourtDirectionConfirmation(nyFacts), 'unknown', [[], 'reviewed:not-the-current-facts', { value: 'Yes', extra: true }], [NY_CASE_RECORDS_ID, NY_FILING_CASE_ID, NY_OTHER_COURT_NAME, NY_OTHER_COURT_COUNTY, NY_COURT_DIRECTION_BASIS_ID, ...NY_COURT_DIRECTION_TEXT_IDS, NY_COURT_DIRECTION_CASES_ID])
  ];
}
/** Returns a witness only for the same actual contract/context/options, never swaps an empty-context question. */
export function caNyQuestionCapabilityWitness(state, question) {
  const row = caNyQuestionCapabilityScenarios().find(item => item.state === state && item.id === question.id && item.question.type === question.type && item.question.answerContract === question.answerContract);
  if (!row) return null;
  if (state === 'CA' && JSON.stringify(question.contactContext) !== JSON.stringify(row.question.contactContext)) return null;
  if (['single_choice', 'multi_select'].includes(question.type) && JSON.stringify(question.options) !== JSON.stringify(row.question.options)) return null;
  return structuredClone(row.valid);
}
/** A separate dependency witness, never a known answer to the original descriptor. */
export function caNyQuestionPrerequisiteWitness(state, question) {
  const conditionalIds = state === 'CA' ? [CA_FILER_CONTACT, CA_COURT_CONTACT]
    : state === 'NY' ? [NY_CASE_RECONCILIATION_ID, NY_COURT_DIRECTION_CASES_ID, NY_COURT_DIRECTION_CONFIRMATION_ID] : [];
  if (!conditionalIds.includes(question.id)) return null;
  const original = (state === 'CA' ? caProp64ContactQuestions({}) : nyCasePreparationQuestions({})).find(q => q.id === question.id);
  const controlKeys = ['id','type','required','contextOnly','answerContract','options','optionDisplay','contactContext','caseRecordReferences','futureApplicationReferences','prior16058ApplicationKnown','awaitingNyCaseRecords'];
  if (!controlKeys.every(key => JSON.stringify(original[key]) === JSON.stringify(question[key]))) return null;
  const row = caNyQuestionCapabilityScenarios().find(r => r.state === state && r.id === question.id);
  return { prerequisiteIds: [...row.prerequisiteIds], activatingFacts: structuredClone(row.facts), activatedQuestion: structuredClone(row.question), activatedValue: structuredClone(row.valid) };
}
