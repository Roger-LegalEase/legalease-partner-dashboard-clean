/*
 * A LIVE GRANT THE CAPTAIN DEALT ON THE RECORD IS NOT A DISSOLVED OBLIGATION.
 *
 * The dispatch generator withdraws a live grant whose subject the current
 * dispatch does not name. That rule is right for grants the generator itself
 * packed: the dispatch is derived from state, so a subject it no longer names
 * is a subject whose state no longer owes the operation.
 *
 * It is wrong for a grant the Captain dealt through claim.mjs with a stated
 * reason, because the dispatch never names those subjects at all. The dispatch
 * deals repairs to FAIL families and reads to VERIFY_PENDING families; it does
 * not name a legal-blocked family whose block a shared-machinery repair
 * dissolves (FIX50 on Vermont), a proven family with a defect a later read
 * measured (FIX51 on Michigan marihuana; the VF08 checkbox cohort), or a
 * legal-blocked family re-read on repaired bytes (VF02 on Vermont). Each of
 * those grants was withdrawn while its worker was executing, and each had to be
 * re-recorded at integration so the release could be replayed. That is the
 * ledger misreporting work in flight, which is the one thing it exists not to
 * do.
 *
 * The evidence the ledger already carries decides it. claim.mjs appends a
 * transfer, reissue or grant record with the Captain's reason every time it
 * deals a claim; the generator writes no such record. So a live claim whose
 * subject and lane appear in one of those records, with a reason, dated after
 * the claim's last release, was dealt deliberately and stays until its lane
 * releases it. Nothing here touches a released claim, a generator-packed
 * grant, or the retired-lane rule for subjects the dispatch does name.
 */
export function captainDealtLiveGrant(ledger, claim) {
  if (!ledger || !claim || claim.released === true) return null;
  const same = (r, laneField) => r
    && r.subjectId === claim.subjectId
    && (r.laneKind ?? claim.laneKind) === claim.laneKind
    && r[laneField] === claim.lane
    && typeof r.reason === "string" && r.reason.trim().length > 0;
  const stamp = (r) => Date.parse(r.transferredAt ?? r.reissuedAt ?? r.grantedAt ?? "") || 0;
  const candidates = [
    ...(ledger.transfers ?? []).filter((r) => same(r, "toLane")).map((r) => ({ kind: "transfer", record: r, at: stamp(r) })),
    ...(ledger.reissues ?? []).filter((r) => same(r, "lane")).map((r) => ({ kind: "reissue", record: r, at: stamp(r) })),
    ...(ledger.grants ?? []).filter((r) => same(r, "lane")).map((r) => ({ kind: "grant", record: r, at: stamp(r) }))
  ].sort((a, b) => b.at - a.at);
  if (candidates.length === 0) return null;
  /* The deal must belong to the claim's CURRENT live tenure: later than the
   * most recent release of this subject on this lane, if any. */
  const lastRelease = (ledger.releases ?? [])
    .filter((r) => r.subjectId === claim.subjectId && r.lane === claim.lane && r.laneKind === claim.laneKind)
    .map((r) => Date.parse(r.releasedAt ?? "") || 0)
    .reduce((m, t) => Math.max(m, t), 0);
  const current = candidates.find((c) => c.at >= lastRelease);
  return current ?? null;
}
