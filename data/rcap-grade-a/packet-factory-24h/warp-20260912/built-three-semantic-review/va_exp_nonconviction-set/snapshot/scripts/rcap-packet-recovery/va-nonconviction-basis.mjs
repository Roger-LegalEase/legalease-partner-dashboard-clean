/**
 * CC-1473 basis screening, not an eligibility determination or release grant.
 * Implements the existing 2026-09-06 owner-relayed research contract:
 * docs/rcap/grade-a/research/2026-09-06-batch-04/Virginia_Deferred_Disposition_Exception_Contract.md
 * Current authority: Va. Code 19.2-298.02(D), version preceding 2026-12-01.
 * Agreement to defer and later prosecutorial non-opposition NEVER substitute
 * for the separate subsection-D agreement. Its actual documentary reference
 * need not be a final disposition order, but ambiguous evidence needs review.
 */
export const VA_BASIS_POLICY = Object.freeze({
  reviewedAsOf: '2026-09-06',
  futureVersionStarts: '2026-12-01',
  factKey: 'va.nonconviction.basis_record',
  authority: 'Va. Code 19.2-298.02(D) and 19.2-392.2; current 2026-09-06 versions',
});

export const VA_BASIS_GUIDANCE = Object.freeze([
  'A deferred dismissal needs a closer check. A plea, stipulation, judicial finding of facts sufficient for guilt, or deferral does not by itself establish that a charge is otherwise dismissed for expungement.',
  'For a dismissal under Virginia Code 19.2-298.02, evaluate the subsection D exception when the record establishes that all parties agreed to that expungement treatment. Identify the actual agreement document or reference; it may be recorded in the final disposition order, but that order is not the only possible evidence. This is permission to evaluate the existing route and its remaining requirements, not an order granting expungement.',
  'Agreement to defer the case, agreement to subsection D treatment, and the Commonwealth\'s later response to the expungement petition are three separate facts. A dismissal label, silence, or a later statement of no objection does not establish the subsection D agreement. If its existence, meaning or legal basis is absent, ambiguous or disputed, obtain legal review before selecting the dismissal ground or filing.',
  'Do not apply this exception to a different first-offender statute such as 18.2-251. That disposition needs its own route and legal review. Do not use the replacement wording effective December 1, 2026 for an earlier filing. Every other 19.2-392.2 requirement and the opposition, presumption, immigration, juvenile and federal self-help boundaries remain.',
]);

const result = (status, reason, basis = null) => Object.freeze({
  status, reason, basis,
  continueExistingChecks: status === 'ORDINARY_BASIS_CONTINUE' || status === 'SUBSECTION_D_EXCEPTION_CONTINUE',
  eligibilityDetermined: false,
  automaticallySelectsBox: false,
  grantsFilingOrCommercialAuthority: false,
});
const nonempty = (x) => typeof x === 'string' && x.trim().length > 0;
const validDay = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)
  && Number.isFinite(Date.parse(`${x}T00:00:00Z`))
  && new Date(`${x}T00:00:00Z`).toISOString().slice(0, 10) === x;

/**
 * @param {unknown} record Facts established from the actual case record.
 * @param {{asOf: string}} options Date of the proposed filing; required, not the system clock.
 * @returns {{status:string,reason:string,basis:string|null,continueExistingChecks:boolean,
 * eligibilityDetermined:false,automaticallySelectsBox:false,grantsFilingOrCommercialAuthority:false}}
 */
export function evaluateVaNonconvictionBasis(record, { asOf } = {}) {
  if (!validDay(asOf) || asOf < VA_BASIS_POLICY.reviewedAsOf || asOf >= VA_BASIS_POLICY.futureVersionStarts) {
    return result('POLICY_REVIEW_REQUIRED', 'This version does not decide a filing outside its reviewed current-law window.');
  }
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return result('RECORD_REVIEW_REQUIRED', 'The disposition and separate agreement facts have not been established.');
  }
  if (record.basisVersion === VA_BASIS_POLICY.futureVersionStarts) {
    return result('FUTURE_LAW_NOT_ENABLED', 'The December 1, 2026 replacement wording is not enabled for this filing.');
  }
  if (record.basisVersion != null && record.basisVersion !== VA_BASIS_POLICY.reviewedAsOf) {
    return result('POLICY_REVIEW_REQUIRED', 'Unrecognized authority version.');
  }
  if (['objection', 'answer'].includes(record.prosecutionResponse)
      || (Array.isArray(record.reviewFlags) && record.reviewFlags.length > 0)) {
    return result('SELF_HELP_STOP', 'An existing opposition or legal-review boundary is present.');
  }
  if (record.prosecutionResponse != null && !['none', 'no_objection', 'consent', 'objection', 'answer'].includes(record.prosecutionResponse)) {
    return result('RECORD_REVIEW_REQUIRED', 'An unrecognized prosecutor-response value cannot bypass the opposition stop.');
  }
  if (record.reviewFlags != null && !Array.isArray(record.reviewFlags)) {
    return result('RECORD_REVIEW_REQUIRED', 'Legal-review flags must not be coerced from an unknown value.');
  }
  if (!['acquitted', 'nolle_prosequi', 'dismissed'].includes(record.disposition)) {
    return result('RECORD_REVIEW_REQUIRED', 'An exact supported non-conviction disposition is required.');
  }
  if (record.deferredStatute === '19.2-298.02') {
    if (record.disposition !== 'dismissed') {
      return result('RECORD_REVIEW_REQUIRED', 'The subsection D branch requires an actual dismissal under this section.');
    }
    if (record.subsectionDAgreement !== 'established' || !nonempty(record.agreementEvidence)) {
      return result('RECORD_REVIEW_REQUIRED', 'A separate established all-party subsection D agreement and its actual documentary reference are required.');
    }
    return result('SUBSECTION_D_EXCEPTION_CONTINUE', 'Evaluate the statutory exception and all remaining route requirements.', 'otherwise_dismissed');
  }
  if (record.deferredStatute != null) {
    return result('OTHER_ROUTE_REVIEW', 'Do not import subsection D into another or unidentified deferred-disposition statute.');
  }
  if (record.admittedFactsOrFinding !== false) {
    return result('RECORD_REVIEW_REQUIRED', 'The facts-sufficient/deferral screen is affirmative or unknown; do not infer an ordinary dismissal.');
  }
  return result('ORDINARY_BASIS_CONTINUE', 'Continue the existing exact route and all remaining checks.',
    record.disposition === 'acquitted' ? 'acquitted' : 'otherwise_dismissed');
}

/** Reference templates leave Part 1 unselected. A supplied record cannot use that exception to bypass a stop. */
export function assertVaBasisPreparation(facts, { asOf, referenceTemplate = false } = {}) {
  const record = facts?.[VA_BASIS_POLICY.factKey];
  if (record === undefined && referenceTemplate === true) {
    return result('REFERENCE_TEMPLATE_UNSELECTED', 'Case-specific facts and the Part 1 election remain for record review.');
  }
  const decision = evaluateVaNonconvictionBasis(record, { asOf });
  if (!decision.continueExistingChecks) {
    const error = new Error(`VA_BASIS_STOP:${decision.status}: ${decision.reason}`);
    error.code = 'VA_BASIS_STOP';
    error.decision = decision;
    throw error;
  }
  return decision;
}
