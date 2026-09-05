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
/**
 * Does a completed repair row discharge every obligation a verdict failed?
 *
 * A repair return may name the obligations it did NOT repair, and an honest
 * row does exactly that -- FIX24 closed the sworn-zero class on
 * rcap-tx-custom-pleading and wrote that KNOWN_PREFILLS and SELF_HELP_STOP
 * "remain open". The old test was string inclusion over the whole row, so a
 * row that named an obligation as still open was read as having repaired it,
 * and the family moved out of FAIL with seventeen stop conditions missing.
 *
 * Where the row states what it repaired (obligationsRepaired, or the older
 * obligationRepaired as a string or array), that statement decides: every
 * failed name must be in it, and nothing the row lists as not discharged may
 * be among the failed names. Only a row with no such statement falls back to
 * text inclusion, which is what every earlier return relied on.
 */
export function repairRowDischargesFailure(row, failedObligationNames) {
  const failed = Array.isArray(failedObligationNames) ? failedObligationNames : [];
  if (!row || failed.length === 0) return false;
  /* An array holds exact names. The older singular form is sometimes prose
   * that opens with the name ("REQUIRED_BEFORE_FILING. The guide said ..."),
   * so a string contributes every obligation-shaped token it carries: in the
   * field that states what was repaired, naming an obligation is the claim. */
  const NAME = /\b[A-Z][A-Z_]{2,}\b/g;
  const namesIn = (v) => Array.isArray(v) ? v.flatMap(namesIn) : typeof v === "string" ? (v.match(NAME) ?? []) : [];
  const notDischarged = namesIn(row.obligationsThisRowDoesNotDischarge ?? row.obligationsNotRepaired ?? row.obligationsStillOpen);
  if (failed.some((name) => notDischarged.includes(name))) return false;
  const repaired = namesIn(row.obligationsRepaired ?? row.obligationRepaired);
  if (repaired.length > 0) return failed.every((name) => repaired.includes(name));
  const text = JSON.stringify(row);
  return failed.every((name) => text.includes(name));
}

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
