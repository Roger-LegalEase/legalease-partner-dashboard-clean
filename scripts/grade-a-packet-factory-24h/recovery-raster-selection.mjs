// Queue publication selects new work; receipt-only publication must not repeat
// an unchanged candidate already requested by the successful recovery wrapper.
export function selectNewPendingRasterFamilies(current, previous) {
  const prior = new Map(previous.rows.map(row => [row.familyId, row]));
  const identity = row => [row.documentsDigest, row.canonicalPdfSha256, row.boundaryPdfSha256];
  return current.rows.filter(row => {
    if (row.currentRasterState !== 'RASTER_PENDING') return false;
    const old = prior.get(row.familyId);
    return !old || !['RASTER_PENDING', 'RASTER_PASS'].includes(old.currentRasterState)
      || JSON.stringify(identity(row)) !== JSON.stringify(identity(old));
  }).map(row => row.familyId);
}

export const sameRasterInputs = (a, b) => a.familyId === b.familyId
  && ['documentsDigest', 'canonicalPdfSha256', 'boundaryPdfSha256'].every(key => a[key] === b[key]);

export const dispatchStepStarted = jobs => jobs.some(job => (job.steps ?? []).some(step =>
  step.name === 'Dispatch eligible families through the existing central raster workflow'
  && step.started_at && step.status !== 'pending'));
