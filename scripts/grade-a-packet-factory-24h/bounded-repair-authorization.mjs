import { captainDealtLiveGrant } from './captain-dealt-grants.mjs';

/** Work authorization is not release authority. Honor a recorded, bounded
 * correction while retaining the exact unresolved legal hold. A live claim or
 * an unadopted research record on its own is insufficient. This reads no law
 * and grants no packet approval; it checks the existing Captain instruction. */
export function boundedRepairAuthorization(family, claim, ledger, readRecord) {
  if (!family || family.state !== 'LEGAL_BLOCKED'
    || family.legalInputStatus !== 'OPEN_LEGAL_INPUT'
    || !family.laneReturnLegalHold?.evidencePath
    || !family.laneReturnLegalHold?.why?.trim()
    || !claim || claim.released === true
    || claim.subjectType !== 'packet-family' || claim.subjectId !== family.familyId
    || !['repair', 'shared-host-repair'].includes(claim.laneKind)
    || !['rapid-repair', 'shared-host-repair'].includes(claim.operation)) return null;
  const deal = captainDealtLiveGrant(ledger, claim);
  if (!deal || deal.at <= 0) return null;
  const reason = deal.record.reason;
  if (!/bounded (?:packet )?repair/i.test(reason)
    || !/legal hold (?:stays|remains)/i.test(reason)) return null;
  const paths = [...new Set(reason.match(/data\/record-clearing\/legal-decisions\/[A-Za-z0-9_-]+\.json/g) ?? [])];
  if (paths.length !== 1) return null;
  try {
    const record = readRecord(paths[0]);
    if (record.schemaVersion !== 'rcap-legal-decisions/v1'
      || record.createsApproval !== false || record.createsOutputLevelApproval !== false) return null;
    const entries = (record.entries ?? []).filter(row => row.family === family.familyId);
    if (entries.length !== 1 || !entries[0].direction?.trim()
      || !/bounded (?:packet )?repair/i.test([entries[0].applied, entries[0].stillOwed].join(' '))) return null;
    return { familyId: family.familyId, lane: claim.lane, instructionKind: deal.kind,
      decisionPath: paths[0], decisionRecordId: record.recordId,
      legalHoldRetained: true, approvalGranted: false };
  } catch { return null; }
}
