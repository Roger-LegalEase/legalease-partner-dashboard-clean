const SHA256 = /^[0-9a-f]{64}$/;

const pinMatches = (pin, current) => Boolean(pin)
  && ["canonical", "boundary"].includes(pin.artifact)
  && SHA256.test(String(pin.declaredSha256 ?? ""))
  && SHA256.test(String(pin.recomputedSha256 ?? ""))
  && pin.declaredSha256 === pin.recomputedSha256
  && pin.recomputedSha256 === current[pin.artifact];

const pinsMatch = (pins, current, requiredArtifacts) => Array.isArray(pins)
  && pins.length > 0
  && pins.every((pin) => pinMatches(pin, current))
  && requiredArtifacts.every((artifact) => pins.some((pin) => pin.artifact === artifact));

/**
 * product-wiring.json is generated bookkeeping, so changing it must never
 * answer a substantive packet failure. There is one deliberately narrow
 * exception: ARTIFACTS itself can fail because that bookkeeping pins bytes
 * which no longer exist. In that case no packet byte should move merely to
 * make the movement detector fire.
 *
 * The exception compares declared pins with hashes recomputed from the files.
 * A caller cannot establish it with a broad "wiring is current" assertion.
 */
export function artifactsOnlyBookkeepingRepairsFailure(evidence) {
  const failed = evidence?.failedObligationNames;
  const bookkeeping = evidence?.artifactBookkeeping;
  const current = bookkeeping?.currentArtifactHashes;
  const wiring = bookkeeping?.productWiring;
  const acceptance = wiring?.acceptanceReceipt;
  const raster = bookkeeping?.rasterReceipt;

  if (!Array.isArray(failed) || failed.length !== 1 || failed[0] !== "ARTIFACTS") return false;
  if (bookkeeping?.changedAfterVerdict !== true) return false;
  if (bookkeeping?.completedRepairNamesExactlyArtifacts !== true) return false;
  if (bookkeeping?.completedRepairHasExactlyNineZeroCounters !== true) return false;
  if (bookkeeping?.currentCompletenessHasExactlyNineZeroCounters !== true) return false;
  if (!SHA256.test(String(current?.canonical ?? ""))
    || !SHA256.test(String(current?.boundary ?? ""))) return false;
  if (wiring?.present !== true || wiring?.familyMatches !== true) return false;
  if (!pinsMatch(wiring.proposalPins, current, ["canonical"])) return false;
  if (acceptance?.verdict !== "RASTER_PASS" || acceptance?.coversTheWholeFamily !== true) return false;
  if (!pinsMatch(acceptance.pins, current, ["canonical"])) return false;
  if (raster?.currentRasterState !== "RASTER_PASS"
    || raster?.verdict !== "RASTER_PASS"
    || raster?.coverageComplete !== true
    || raster?.coversTheWholeFamily !== true) return false;
  if (!pinsMatch(raster.pins, current, ["canonical", "boundary"])) return false;
  if (!acceptance.workflowRunId || acceptance.workflowRunId !== raster.workflowRunId) return false;
  return true;
}

/**
 * Decide whether a completed repair can supersede the selected FAIL before a
 * new verifier is dealt. The ordinary path still requires packet/build bytes
 * to have moved after the verdict. The alternative is intentionally limited
 * to the exact ARTIFACTS bookkeeping proof above.
 */
export function repairSupersedesFailedVerdict(evidence) {
  const causalRepair = evidence?.completedRepairMatchesFailure === true
    && evidence.repairEvidenceChangedAfterVerdict === true
    && evidence.allNineCountersZero === true
    && evidence.releasedRepairGrantExists === true
    && evidence.liveRepairGrantExists === false;
  if (!causalRepair) return false;
  if (evidence.artifactsChangedAfterVerdict === true) return true;
  return evidence.artifactsChangedAfterVerdict === false
    && artifactsOnlyBookkeepingRepairsFailure(evidence);
}

/**
 * A prior FAIL may move to a fresh independent read only when the current
 * repository proves a completed repair answered that verdict and the reread
 * is executable. Keep this predicate pure so every prerequisite has a
 * permanent negative control.
 */
export function canRereadAfterRepair(evidence) {
  return evidence?.state === "VERIFY_PENDING"
    && repairSupersedesFailedVerdict(evidence)
    && evidence.liveVerificationGrantExists === true
    && evidence.verificationDispatchExists === true;
}
