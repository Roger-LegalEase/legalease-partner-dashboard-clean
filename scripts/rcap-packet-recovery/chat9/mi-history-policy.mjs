/** MC227-specific prior-application treatment. This is not an eligibility engine.
 * A truthful item 2.c answer and permission to file again are separate questions.
 * Denials/pending matters produce preparation-only attorney handoffs, never a
 * finding that reapplication is authorized. No judicial order is generated. */
import assert from 'node:assert/strict';

export const FIRST_OWI_STATEMENT = 'I have not previously applied to have and had a first violation operating while intoxicated offense conviction set aside.';
export const HISTORY_OUTCOMES = ['granted', 'denied', 'pending', 'withdrawn', 'unknown'];
const iso = (value, label) => {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), `invalid ${label}`);
  const d = new Date(value + 'T00:00:00Z');
  assert(Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value, `invalid ${label}`);
  return value;
};
export function thirdAnniversary(value) {
  iso(value, 'denial date');
  const [y,m,d] = value.split('-').map(Number);
  // Preserve the calendar anniversary; February 29 becomes the last day of
  // February in a non-leap year. This calculation never authorizes a new filing.
  return new Date(Date.UTC(y + 3,m - 1,Math.min(d,new Date(Date.UTC(y + 3,m,0)).getUTCDate()))).toISOString().slice(0,10);
}
export function denialTiming(row, asOf) {
  iso(asOf,'review date');
  if (!row.decisionDate) {
    assert(!row.earlierReapplyDate, 'earlier order date requires the denial date');
    return {status:'DENIAL_DATE_UNKNOWN',notBefore:null,orderReviewRequired:true};
  }
  const denied = iso(row.decisionDate,'denial date');
  assert(denied >= iso(row.date,'conviction date') && denied <= asOf,'denial date outside known case chronology');
  const ordinaryDate = thirdAnniversary(denied);
  const earlier = row.earlierReapplyDate == null ? null : iso(row.earlierReapplyDate,'order-specified earlier date');
  if (earlier) assert(earlier >= denied && earlier < ordinaryDate,'order-specified date must be before the three-year date and not before denial');
  const notBefore = earlier ?? ordinaryDate;
  const status = asOf < notBefore
    ? (earlier ? 'BEFORE_ORDER_SPECIFIED_DATE' : 'BEFORE_THREE_YEARS_UNLESS_ORDER_SPECIFIES_EARLIER')
    : (earlier ? 'ORDER_DATE_REACHED_REVIEW_STILL_REQUIRED' : 'THREE_YEARS_ELAPSED_REVIEW_STILL_REQUIRED');
  return {status,denialDate:denied,ordinaryDate,notBefore,earlierDateReported:earlier,
    orderReviewRequired:true,denialOrderAttached:false};
}
export function assessPriorApplications(input) {
  const asOf = iso(input.reviewAsOf,'review date');
  const firstOwi = input.familyId === 'mi_setaside_first_owi-set';
  const reasons = [];
  let priorFirstOwiReliefReceived = false;
  for (const scope of ['previousSame','previousOther']) {
    assert(Array.isArray(input[scope]),`${scope} must be an explicit array`);
    for (const [index,row] of input[scope].entries()) {
      // Item 3 refers to this OWI. Item 4's category must be explicitly supplied.
      const isOwi = firstOwi && (scope === 'previousSame' || row.category === 'firstOwi');
      if (firstOwi && scope === 'previousOther') assert(['felony','seriousMisdemeanor','ordinaryMisdemeanor','firstOwi'].includes(row.category),'prior conviction category must be explicit');
      if (isOwi) assert(HISTORY_OUTCOMES.includes(row.outcome),'prior first-OWI application outcome must be explicit; no inference from disposition wording');
      if (row.outcome != null) assert(HISTORY_OUTCOMES.includes(row.outcome),'unsupported prior-application outcome');
      if (isOwi && row.outcome === 'granted') priorFirstOwiReliefReceived = true;
      // Preserve every item 3 disclosure. An unclassified disposition is a
      // review task, not an invented denial, grant, or permission to reapply.
      if (scope === 'previousSame' || isOwi) {
        const reason = {scope,row:index+1,caseNumber:row.caseNumber,outcome:row.outcome ?? 'unclassified',
          disposition:row.disposition,status:'PRIOR_APPLICATION_REVIEW_REQUIRED'};
        if (row.outcome === 'denied') Object.assign(reason,denialTiming(row,asOf));
        else if (row.outcome === 'pending') reason.status = 'PENDING_APPLICATION_NO_DUPLICATE_FILING';
        else if (row.outcome === 'granted') reason.status = isOwi ? 'PRIOR_FIRST_OWI_RELIEF_RECEIVED' : 'PRIOR_GRANTED_APPLICATION_REVIEW_REQUIRED';
        else if (row.outcome === 'withdrawn') reason.status = 'WITHDRAWAL_AND_ORDER_REVIEW_REQUIRED';
        else if (row.outcome === 'unknown') reason.status = 'PRIOR_OUTCOME_UNKNOWN';
        if (scope === 'previousOther' && isOwi) reason.additionalReview = 'Other OWI conviction also requires first-violation and complete-history review.';
        reasons.push(reason);
      }
    }
  }
  return {priorFirstOwiReliefReceived,
    status: priorFirstOwiReliefReceived ? 'REFUSE_PRIOR_FIRST_OWI_RELIEF' : reasons.length ? 'STOP_BEFORE_REAPPLICATION_ATTORNEY_REVIEW' : 'NO_PRIOR_LISTED_APPLICATION_HANDOFF_IDENTIFIED',
    reasons,permissionToReapply:false,denialOrdersSupplied:false};
}
export function historyInstructions(input) {
  const review = assessPriorApplications(input);
  const firstOwi = input.familyId === 'mi_setaside_first_owi-set';
  const distinction = firstOwi
    ? `MC227 item 2.c says: "${FIRST_OWI_STATEMENT}" A prior filing that was denied is not a prior grant of first-OWI relief. All earlier applications must still be disclosed accurately in items 3 and 4.`
    : 'Disclose earlier applications accurately in items 3 and 4. A prior denial does not by itself authorize another application.';
  const rows = review.reasons.map(r => `- Item ${r.scope === 'previousSame' ? 3 : 4}, row ${r.row}, ${r.caseNumber}: ${r.disposition}. ${r.status.replaceAll('_',' ')}.${r.notBefore ? ` Reported timing date: ${r.notBefore}.` : ''}${r.additionalReview ? ' '+r.additionalReview : ''}`).join('\n');
  return `## Prior applications and renewed filing\n\n${distinction}\n\nIf an application for the same conviction was denied, MCL 780.621d(5) generally bars another application for three years after the denial order, unless the court specified an earlier date in that order. Read the actual denial order with an attorney or legal-aid provider. An elapsed interval or a reported earlier date is not a new eligibility determination or permission to file. Pending, withdrawn, unclear or previously granted applications also require disposition/order review; do not file a duplicate pending application. No denial order is supplied by this packet.\n\n${rows ? '**STOP BEFORE REAPPLICATION: attorney/legal-aid review required.** These are unsigned preparation materials, not renewed-filing authorization.\n\n'+rows+'\n' : 'No earlier application for a listed conviction is reported in this fixture. This does not replace checking the complete history or the other statutory conditions.\n'}`;
}
