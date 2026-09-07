/** A held file is not a valid source when the current identity decision rejects
 * its scope. This preserves that decision until its reconciliation row changes;
 * another form-number join or duplicate copy cannot reverse it implicitly. */
export function applyUnresolvedSourceConstraints(readiness, reconciliation) {
  const unresolved = reconciliation?.disposition === "SOURCE_BLOCKED"
    ? [...new Set((reconciliation.unresolvedObligations ?? [])
      .filter((id) => typeof id === "string" && id.startsWith("official-form:")))]
    : [];
  if (unresolved.length === 0) return readiness;
  const denied = new Set(unresolved);
  const rejectedBindings = (readiness.boundSources ?? []).filter((r) => denied.has(r.sourceId));
  const boundSources = (readiness.boundSources ?? []).filter((r) => !denied.has(r.sourceId));
  const reason = reconciliation.exactResidual ?? reconciliation.exactNextAction
    ?? "The current source identity determination remains unresolved.";
  return {
    ...readiness,
    ready: false,
    boundSources,
    boundCount: boundSources.length,
    unresolvedObligations: unresolved,
    rejectedBindings,
    reasons: [...new Set([...(readiness.reasons ?? []),
      ...unresolved.map((id) => `${id}: SOURCE_IDENTITY_DETERMINATION_UNRESOLVED — ${reason}`)])],
  };
}
