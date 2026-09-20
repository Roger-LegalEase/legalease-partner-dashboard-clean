import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const { evaluateNdNonconvictionFailureBranch: evaluate, computeNdNonconvictionDeadline: compute } =
  await import(path.join(root, 'scripts/rcap-packet-recovery/nd-nonconviction-timing.mjs'));
const { prepareNdNonconvictionPacketFacts: prepare } =
  await import(path.join(root, 'scripts/build-census-v1-composed-treatment:nd-nonconviction-auto-close-verify.mjs'));
const results = [];
const test = (name, fn) => {
  try { const evidence = fn(); results.push({ name, result: 'PASS', evidence: evidence ?? null }); }
  catch (error) { results.push({ name, result: 'FAIL', error: error.stack }); }
};
const calendar = (start='2025-10-01', end='2025-10-06', holidays=[]) => ({
  jurisdiction: 'ND', start, end, legalHolidays: holidays, confirmedComplete: true,
  verificationSource: 'Independent synthetic verified calendar; test input, not new legal research',
});
const base = () => ({
  orderEntryDate: '2025-08-01', asOfDate: '2025-10-02', wholeCaseDisposition: 'ALL_CHARGES_DISMISSED',
  caseWasEverAppealed: false, dismissalInPleaAgreementInvolvingConviction: false,
  unfitToProceedDisposition: false, lackCriminalResponsibilityAcquittal: false,
  calendarCoverage: calendar(), publicAccessCheckedOn: '2025-10-02',
  recordStillPublicAfterPeriod: true, publicAccessEvidence: '2025-10-02 observed public index: test evidence',
});
const mapping = {
  orderEntryDate:'case.order_entry_date', asOfDate:'case.as_of_date',
  wholeCaseDisposition:'case.whole_case_disposition', caseWasEverAppealed:'case.was_ever_appealed',
  dismissalInPleaAgreementInvolvingConviction:'case.dismissal_in_plea_involving_conviction',
  unfitToProceedDisposition:'case.unfit_to_proceed_disposition',
  lackCriminalResponsibilityAcquittal:'case.lack_criminal_responsibility_acquittal',
  calendarCoverage:'case.calendar_coverage', verifiedAdjustedExpiration:'case.verified_adjusted_expiration',
  verifiedFirstCheckDate:'case.verified_first_check_date', deadlineVerificationSource:'case.deadline_verification_source',
  publicAccessCheckedOn:'case.public_access_checked_on', recordStillPublicAfterPeriod:'case.record_still_public',
  publicAccessEvidence:'case.public_access_evidence',
};
const packet = input => ({
  'participant.full_legal_name':'Independent Review Person', 'participant.street_address':'1 Review Street',
  'participant.phone':'701-555-0100', 'participant.email':'review@example.org',
  'case.court_name':'Original District Court', 'case.court_location':'Original County, ND',
  'case.number':'TEST-ONLY', 'case.clerk_response':'Original court requires judicial action; written response retained.',
  ...Object.fromEntries(Object.entries(mapping).filter(([key])=>Object.hasOwn(input,key)).map(([key,value])=>[value,input[key]])),
});
const refuse = (name, override, code) => test(name, () => {
  const input = {...base(), ...override};
  const actual = evaluate(input);
  assert.equal(actual.eligible, false); assert.equal(actual.code, code);
  assert.throws(()=>prepare(packet(input)), error=>error.message.includes(`fail closed at ${code}`));
  return { expectedCode: code, helperCode: actual.code, productionAdapter: 'REFUSED' };
});

test('Cutoff and clock are entry-based even when generic disposition and mail facts disagree',()=>{
  const input={...base(), dispositionDate:'2025-07-01', mailingDate:'2025-08-06', serviceByMail:true, mailServiceDays:3};
  const actual=evaluate(input), prepared=prepare({...packet(input),'case.disposition_date':'2025-07-01','case.mail_service_days':3});
  assert.equal(actual.eligible,true);
  assert.deepEqual([actual.rawDay61,actual.adjustedExpiration,actual.firstAdministrativeCheckDate],['2025-10-01','2025-10-01','2025-10-02']);
  assert.deepEqual([actual.entryDateExcluded,actual.daysCounted,actual.mailServiceDaysAdded,actual.firstCheckIsProductStep],[true,61,0,true]);
  assert.equal(prepared['derived.raw_day_61'],'2025-10-01');
  return actual;
});
refuse('Old entered order cannot be rescued by a later generic disposition',{orderEntryDate:'2025-07-31',dispositionDate:'2025-08-01'},'PRE_EFFECTIVE_ORDER');
test('All-charges acquittal independently enters and produces the acquittal statement',()=>{
  const input={...base(),wholeCaseDisposition:'ALL_CHARGES_ACQUITTED'};
  assert.equal(evaluate(input).eligible,true);
  assert.equal(prepare(packet(input))['derived.whole_case_statement'],'The defendant was acquitted of all criminal charges in this case.');
});
for(const value of [null,undefined]) refuse(`Unknown whole case: ${value}`,{wholeCaseDisposition:value},'UNKNOWN_WHOLE_CASE_DISPOSITION');
for(const value of ['MIXED_OR_PARTIAL','PARTIAL_DISMISSAL','DISMISSED_AND_ACQUITTED','CONVICTED',true,false,''])
  refuse(`Excluded whole case: ${JSON.stringify(value)}`,{wholeCaseDisposition:value},'WHOLE_CASE_NOT_QUALIFYING');
for(const value of [null,undefined]) refuse(`Unknown any-appeal history: ${value}`,{caseWasEverAppealed:value},'UNKNOWN_APPEAL_HISTORY');
for(const value of [true,'false',0,'APPEAL_DISMISSED','APPEAL_WITHDRAWN'])
  refuse(`Any appeal must be boolean false: ${JSON.stringify(value)}`,{caseWasEverAppealed:value},'ANY_APPEAL_HISTORY_EXCLUDED');
for(const [key,code] of [
  ['dismissalInPleaAgreementInvolvingConviction','PLEA_AGREEMENT_CONVICTION_EXCEPTION'],
  ['unfitToProceedDisposition','UNFIT_TO_PROCEED_EXCEPTION'],
  ['lackCriminalResponsibilityAcquittal','LACK_CRIMINAL_RESPONSIBILITY_EXCEPTION'],
]) {
  for(const value of [null,undefined]) refuse(`${key} unknown: ${value}`,{[key]:value},`UNKNOWN_${code}`);
  for(const value of [true,'false',0]) refuse(`${key} excludes: ${JSON.stringify(value)}`,{[key]:value},code);
}
for(const key of ['orderEntryDate','asOfDate','publicAccessCheckedOn']) {
  const code={orderEntryDate:'INVALID_ORDER_ENTRY_DATE',asOfDate:'INVALID_AS_OF_DATE',publicAccessCheckedOn:'INVALID_PUBLIC_ACCESS_CHECK_DATE'}[key];
  for(const value of ['', '2025-02-29','2025-13-01','2025-10-02T00:00:00Z','2025-1-02'])
    refuse(`${key} rejects invalid date ${JSON.stringify(value)}`,{[key]:value},code);
}
refuse('Entry after evaluation refuses',{orderEntryDate:'2025-10-03'},'FUTURE_ORDER_ENTRY_DATE');
refuse('Observation after evaluation refuses',{publicAccessCheckedOn:'2025-10-03'},'FUTURE_PUBLIC_ACCESS_CHECK');
refuse('Check on expiration is premature',{publicAccessCheckedOn:'2025-10-01'},'PREMATURE_PUBLIC_ACCESS_CHECK');
refuse('Check before day 61 is premature',{publicAccessCheckedOn:'2025-09-30'},'PREMATURE_PUBLIC_ACCESS_CHECK');
for(const value of [null,undefined]) refuse(`Unknown access status ${value}`,{recordStillPublicAfterPeriod:value},'UNKNOWN_PUBLIC_ACCESS_STATUS');
for(const value of [false,'true',1]) refuse(`Access must be boolean true ${JSON.stringify(value)}`,{recordStillPublicAfterPeriod:value},'RECORD_NOT_PUBLIC_AFTER_PERIOD');
for(const value of [null,undefined,'','  ',23]) refuse(`Missing evidence ${JSON.stringify(value)}`,{publicAccessEvidence:value},'MISSING_PUBLIC_ACCESS_EVIDENCE');
refuse('No calendar and no verified dates refuses',{calendarCoverage:null},'MISSING_VERIFIED_CALENDAR_OR_DEADLINES');
for(const [name,coverage] of [
  ['unconfirmed',{...calendar(),confirmedComplete:false}],['wrong jurisdiction',{...calendar(),jurisdiction:'SD'}],
  ['missing source',{...calendar(),verificationSource:''}],['starts too late',calendar('2025-10-02')],
  ['bad holiday',{...calendar(),legalHolidays:['2025-02-29']}],['unbounded missing holiday array',{...calendar(),legalHolidays:null}],
]) refuse(`Calendar ${name} refuses`,{calendarCoverage:coverage},'MISSING_VERIFIED_CALENDAR_OR_DEADLINES');
refuse('Coverage ending at expiration cannot establish product check',{calendarCoverage:calendar('2025-10-01','2025-10-01')},'CALENDAR_COVERAGE_ENDS_BEFORE_FIRST_CHECK');
refuse('Weekend coverage ending before adjusted expiration refuses',{orderEntryDate:'2025-08-04',asOfDate:'2025-10-10',publicAccessCheckedOn:'2025-10-10',calendarCoverage:calendar('2025-10-04','2025-10-05')},'CALENDAR_COVERAGE_ENDS_BEFORE_ADJUSTED_EXPIRATION');
const explicit={calendarCoverage:null,verifiedAdjustedExpiration:'2025-10-01',verifiedFirstCheckDate:'2025-10-02',deadlineVerificationSource:'Independently supplied verified dates for synthetic case'};
test('Explicit verified alternative reaches actual adapter without invented calendar',()=>{
  const prepared=prepare(packet({...base(),...explicit}));
  assert.equal(prepared['derived.deadline_method'],'EXPLICITLY_COLLECTED_VERIFIED_DATES');
  assert.equal(prepared['derived.first_check_date'],'2025-10-02');
});
for(const [name,override,code] of [
  ['missing expiration',{verifiedAdjustedExpiration:null},'INVALID_VERIFIED_ADJUSTED_EXPIRATION'],
  ['missing check',{verifiedFirstCheckDate:null},'INVALID_VERIFIED_FIRST_CHECK_DATE'],
  ['missing source',{deadlineVerificationSource:''},'MISSING_DEADLINE_VERIFICATION_SOURCE'],
  ['before day 61',{verifiedAdjustedExpiration:'2025-09-30'},'VERIFIED_ADJUSTED_EXPIRATION_BEFORE_DAY_61'],
  ['same-day check',{verifiedFirstCheckDate:'2025-10-01'},'VERIFIED_FIRST_CHECK_NOT_AFTER_EXPIRATION'],
  ['Saturday expiration',{verifiedAdjustedExpiration:'2025-10-04',verifiedFirstCheckDate:'2025-10-06'},'VERIFIED_ADJUSTED_EXPIRATION_IS_WEEKEND'],
  ['Sunday expiration',{verifiedAdjustedExpiration:'2025-10-05',verifiedFirstCheckDate:'2025-10-06'},'VERIFIED_ADJUSTED_EXPIRATION_IS_WEEKEND'],
  ['Saturday check',{verifiedFirstCheckDate:'2025-10-04'},'VERIFIED_FIRST_CHECK_IS_WEEKEND'],
  ['Sunday check',{verifiedFirstCheckDate:'2025-10-05'},'VERIFIED_FIRST_CHECK_IS_WEEKEND'],
]) refuse(`Explicit dates ${name}`,{...explicit,...override},code);

test('Independent date oracle: 366 entry days, 61 calendar days, supplied holiday chains, weekend boundaries',()=>{
  const dates=[];
  for(let day=0;day<366;day++) {
    const entry=new Date('2025-08-01T00:00:00Z'); entry.setUTCDate(entry.getUTCDate()+day);
    const expected=new Date(entry); for(let i=0;i<61;i++) expected.setUTCDate(expected.getUTCDate()+1);
    const raw=expected.toISOString().slice(0,10);
    const holidays=[];
    if(day%3===0) { for(let n=0;n<3;n++) {const d=new Date(expected);d.setUTCDate(d.getUTCDate()+n);holidays.push(d.toISOString().slice(0,10));} }
    const business=d=>d.getUTCDay()>0&&d.getUTCDay()<6&&!holidays.includes(d.toISOString().slice(0,10));
    while(!business(expected)) expected.setUTCDate(expected.getUTCDate()+1);
    const expiration=expected.toISOString().slice(0,10);
    do {expected.setUTCDate(expected.getUTCDate()+1);} while(!business(expected));
    const first=expected.toISOString().slice(0,10), entered=entry.toISOString().slice(0,10);
    const coverage=calendar(raw,first,holidays);
    const actual=compute({orderEntryDate:entered,calendarCoverage:coverage});
    assert.equal(actual.eligible,true);
    assert.deepEqual([actual.rawDay61,actual.adjustedExpiration,actual.firstAdministrativeCheckDate],[raw,expiration,first]);
    const prepared=prepare(packet({...base(),orderEntryDate:entered,asOfDate:first,publicAccessCheckedOn:first,calendarCoverage:coverage}));
    assert.equal(prepared['derived.first_check_date'],first);
    dates.push({entered,raw,expiration,first,holidays});
  }
  return {cases:dates.length,first:dates[0],last:dates.at(-1),allMatched:true};
});
test('UTC default refuses a future order and future observation without explicit as-of',()=>{
  const now=new Date(), tomorrow=new Date(now);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
  const future=tomorrow.toISOString().slice(0,10), input=packet(base());delete input['case.as_of_date'];
  assert.equal(prepare(input)['derived.first_check_date'],'2025-10-02');
  assert.throws(()=>prepare({...input,'case.order_entry_date':future}),/FUTURE_ORDER_ENTRY_DATE/);
  assert.throws(()=>prepare({...input,'case.public_access_checked_on':future}),/FUTURE_PUBLIC_ACCESS_CHECK/);
  return {evaluationDateUsed:new Date().toISOString().slice(0,10),future};
});
for(const key of ['case.court_name','case.court_location','case.number','case.clerk_response'])
  test(`Full four-component packet refuses absent collected ${key}`,()=>{
    assert.throws(()=>prepare({...packet(base()),[key]:' '}),error=>error.message.includes(`required collected fact ${key}`));
  });
test('Caller-supplied derived values cannot override evaluator conclusions',()=>{
  const actual=prepare({...packet(base()),'derived.raw_day_61':'2025-09-01','derived.first_check_date':'2025-09-01','derived.appeal_history_statement':'Previously appealed'});
  assert.equal(actual['derived.raw_day_61'],'2025-10-01');
  assert.equal(actual['derived.first_check_date'],'2025-10-02');
  assert.equal(actual['derived.appeal_history_statement'],'The case was never appealed.');
  assert.equal(Object.isFrozen(actual),true);
});
const output={schemaVersion:'rcap-independent-guard-evidence/v1',familyId:'composed-treatment:nd-nonconviction-auto-close-verify',
  productionCalls:['computeNdNonconvictionDeadline','evaluateNdNonconvictionFailureBranch','prepareNdNonconvictionPacketFacts'],
  renderingPerformed:false,tests:results.length,passed:results.filter(r=>r.result==='PASS').length,failed:results.filter(r=>r.result==='FAIL').length,results};
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'independent-guards.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({tests:output.tests,passed:output.passed,failed:output.failed},null,2));
if(output.failed) process.exitCode=1;
