// A repaired internal candidate can await verification without restoring a terminal claim.
export function suspendedTerminalState(execution) {
  if (execution?.terminalClaimSuspended !== true) return null;
  return execution.stateOverride === "VERIFY_PENDING" ? "VERIFY_PENDING" : "FAIL_REPAIR_REQUIRED";
}
