/**
 * A historical request for a reread is spent once its ordered substantive
 * failure has returned. Later edits do not undo that event: the ordinary
 * repair-evidence state machine must decide whether that failure is answered.
 *
 * This helper grants no repair, reread assignment, passing verdict or delivery
 * authority. Changed passing outputs retain their prior staleness behavior.
 */
export function orderedReclassificationReadReturned({
  verdict,
  reviewIsOrdered,
  artifactsMoved,
} = {}) {
  if (reviewIsOrdered !== true || typeof verdict !== 'string' || !verdict
      || ['PASS', 'BLOCKED_BEFORE_CLAIM'].includes(verdict)) return false;
  if (verdict === 'FAIL_REPAIR_REQUIRED') return true;
  return artifactsMoved === false;
}
