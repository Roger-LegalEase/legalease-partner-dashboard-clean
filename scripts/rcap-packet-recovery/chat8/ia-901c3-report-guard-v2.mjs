/**
 * Form 2 report/attachment truthfulness checks, v2.
 * Recovered v1 unit guard; adds explicit unknown receipt without guessing status.
 * The actual builder binds the interval to inspected Form 2 item 9 and measures
 * its own components. Unit-test metadata never establishes an external report.
 *
 * This is NOT a completed packet renderer, legal source approval, external-record
 * authentication, or permission to file. The current Form 2 freshness rule must
 * be bound separately from inspected primary authority. There is no default
 * number of days. An acquisition request or billing form is never a report.
 *
 * attachmentInventory must come from the packet assembler's actual input-byte
 * inventory, not a participant-facing "attached" checkbox.
 */
const allowed = (object, names, label) => {
  if (!object || typeof object !== 'object' || Array.isArray(object))
    throw new TypeError(`${label}: object required`);
  for (const key of Object.keys(object))
    if (!names.includes(key)) throw new TypeError(`${label}: unexpected ${key}`);
};
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const date = (value, label) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new TypeError(`${label}: YYYY-MM-DD required`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value)
    throw new TypeError(`${label}: invalid calendar date`);
  return parsed;
};

export function assessForm2Report(input) {
  allowed(input,
    ['receipt', 'filingAssessmentDate', 'freshnessRule', 'attachmentInventory'],
    'input');
  const { receipt, freshnessRule, attachmentInventory } = input;
  allowed(receipt, ['status', 'issuedOn', 'answerSource'], 'receipt');
  if (!['not_requested', 'requested', 'received', 'unknown'].includes(receipt.status))
    throw new TypeError('receipt.status: explicit recognized answer required');
  if (receipt.answerSource !== 'participant')
    throw new TypeError('Receipt must be the participant’s answer, not invented');
  if (!Object.hasOwn(receipt, 'issuedOn'))
    throw new TypeError('receipt.issuedOn: known date or explicit null required');
  const filing = date(input.filingAssessmentDate, 'filingAssessmentDate');
  const issued = receipt.issuedOn === null ? null : date(receipt.issuedOn, 'issuedOn');
  if (issued && issued > filing)
    throw new RangeError('Report issue date cannot follow filing assessment');
  if (receipt.status !== 'received' && issued !== null)
    throw new TypeError('A request date cannot be substituted for a report date');

  if (!Array.isArray(attachmentInventory))
    throw new TypeError('Actual attachment inventory must be explicit');
  for (const item of attachmentInventory) {
    allowed(item, ['role', 'sha256', 'byteCount', 'inventorySource'], 'attachment');
    if (!['returned_dci_history', 'dci_request', 'dci_billing', 'other'].includes(item.role))
      throw new TypeError('Unrecognized attachment role');
    if (!hash(item.sha256) || !Number.isSafeInteger(item.byteCount) || item.byteCount < 1)
      throw new TypeError('Attachment must identify actual nonempty input bytes');
    if (item.inventorySource !== 'assembler_input_bytes')
      throw new TypeError('A participant assertion is not an assembly inventory');
  }

  const reports = attachmentInventory.filter(x => x.role === 'returned_dci_history');
  if (reports.length > 1)
    throw new TypeError('Multiple returned reports require an explicit reconciled selection');
  if (reports.length && receipt.status !== 'received')
    throw new TypeError('Attached report conflicts with participant receipt answer');

  let timing = null;
  if (freshnessRule !== null) {
    allowed(freshnessRule,
      ['status', 'maxAgeDays', 'inclusive', 'sourceSha256', 'sourceLocator'],
      'freshnessRule');
    if (!['unresolved', 'source_bound'].includes(freshnessRule.status))
      throw new TypeError('Freshness status must be explicit');
    if (freshnessRule.status === 'source_bound') {
      if (!Number.isSafeInteger(freshnessRule.maxAgeDays) || freshnessRule.maxAgeDays < 0 ||
          typeof freshnessRule.inclusive !== 'boolean' ||
          !hash(freshnessRule.sourceSha256) ||
          typeof freshnessRule.sourceLocator !== 'string' ||
          !freshnessRule.sourceLocator.trim())
        throw new TypeError('A day-based timing rule needs a complete source binding');
      timing = freshnessRule;
    }
  }

  const ageDays = issued ? (filing - issued) / 86400000 : null;
  const reportInAssembly = reports.length === 1;
  const result = {
    reportReceiptIsParticipantReported: true,
    externalRecordAuthenticated: false,
    packetCompletenessEstablished: false,
    reportInAssembly,
    reportIdentity: reportInAssembly
      ? { sha256: reports[0].sha256, byteCount: reports[0].byteCount }
      : null,
    reportAgeDays: ageDays,
    mayPopulateAttachmentPresenceDeclaration: false,
    status: null,
  };

  if (receipt.status === 'unknown') {
    result.status = 'REPORT_AVAILABILITY_UNKNOWN';
  } else if (receipt.status !== 'received') {
    result.status = 'NEEDS_RETURNED_REPORT';
  } else if (issued === null) {
    result.status = 'NEEDS_REPORT_DATE';
  } else if (timing === null) {
    result.status = 'TIMING_SOURCE_UNRESOLVED';
  } else if (timing.inclusive
      ? ageDays > timing.maxAgeDays
      : ageDays >= timing.maxAgeDays) {
    result.status = 'REPORT_OUTSIDE_BOUND_TIMING';
  } else if (!reportInAssembly) {
    result.status = 'DRAFT_NEEDS_REPORT_ATTACHMENT';
  } else {
    result.status = 'REPORT_PRESENCE_AND_DATE_COHERENT';
    result.mayPopulateAttachmentPresenceDeclaration = true;
  }
  return Object.freeze(result);
}
