/**
 * A prior FAIL may move to a fresh independent read only when the current
 * repository proves a completed repair answered that verdict and the reread
 * is executable.  Keep this predicate pure so every prerequisite has a
 * permanent negative control.
 */
export function canRereadAfterRepair(evidence) {
  return evidence?.state === "VERIFY_PENDING"
    && evidence.completedRepairMatchesFailure === true
    && evidence.repairEvidenceChangedAfterVerdict === true
    && evidence.artifactsChangedAfterVerdict === true
    && evidence.allNineCountersZero === true
    && evidence.releasedRepairGrantExists === true
    && evidence.liveRepairGrantExists === false
    && evidence.liveVerificationGrantExists === true
    && evidence.verificationDispatchExists === true;
}
