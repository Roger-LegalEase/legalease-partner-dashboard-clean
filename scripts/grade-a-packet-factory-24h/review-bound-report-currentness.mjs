import crypto from 'node:crypto';
/** An explicitly hash-bound review output may postdate the review's input SHA.
 * Only this report is exempt; source, packet, fixture and other changes still lapse.
 */
export function onlyReviewBoundReportChanged({changedPaths, directory, review, readBytes}) {
  const report = `${directory}/reports/actual-writes.json`;
  if (changedPaths.length !== 1 || changedPaths[0] !== report
    || review?.verdict !== 'PASS_COMPLETE_INDEPENDENT'
    || review.measuredActualWritesBinding?.path !== report
    || !/^[a-f0-9]{64}$/.test(review.measuredActualWritesBinding.sha256 ?? '')) return false;
  try {
    return crypto.createHash('sha256').update(readBytes(report)).digest('hex') === review.measuredActualWritesBinding.sha256;
  } catch { return false; }
}
