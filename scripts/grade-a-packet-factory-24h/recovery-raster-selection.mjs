// Queue publication selects new work; receipt-only publication must not repeat
// an unchanged candidate already requested by the successful recovery wrapper.
export function selectNewPendingRasterFamilies(current, previous) {
  const prior = new Map(previous.rows.map(row => [row.familyId, row]));
  const identity = row => [row.documentsDigest, row.canonicalPdfSha256, row.boundaryPdfSha256];
  return current.rows.filter(row => {
    if (row.currentRasterState !== 'RASTER_PENDING') return false;
    const old = prior.get(row.familyId);
    return !old || old.currentRasterState !== 'RASTER_PENDING'
      || JSON.stringify(identity(row)) !== JSON.stringify(identity(old));
  }).map(row => row.familyId);
}
