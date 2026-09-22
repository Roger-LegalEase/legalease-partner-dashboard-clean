/** Carry an authored specification retirement into native fulfillment history.
 * This does not create authority for the replacement configurations. Historical
 * proof and disposition remain exactly what the predecessor claimed.
 */
export function supersedeFromSpecification(record, specification, recordHash, changedBy, changedAt = new Date().toISOString().slice(0, 10)) {
  const supersession = specification?.supersededBy;
  if (!supersession) return record;
  if (specification.routeKey !== record.routeId
    || supersession.status !== 'historical_only'
    || typeof supersession.by !== 'string' || !supersession.by.trim()
    || !/^\d{4}-\d{2}-\d{2}$/.test(supersession.on ?? '')
    || !Array.isArray(supersession.configurations) || !supersession.configurations.length) {
    throw new Error(`Invalid specification supersession for ${record.routeId}`);
  }
  if (record.supersededBy) {
    if (record.supersededBy !== supersession.by || record.supersededAt !== supersession.on) {
      throw new Error(`Conflicting specification supersession for ${record.routeId}`);
    }
    return record;
  }
  const superseded = {
    ...record,
    version: record.version + 1,
    supersededBy: supersession.by,
    supersededAt: supersession.on,
    history: [...record.history]
  };
  superseded.history.push({
    version: superseded.version,
    changeKind: 'superseded',
    changedAt,
    changedBy,
    reason: `Specification ${specification.specificationId} became historical_only on ${supersession.on}: ${supersession.why} Replaced by ${supersession.by} (${supersession.configurations.join(', ')}). Historical evidence is preserved; no replacement receives fulfillment authority.`,
    recordSha256: recordHash(superseded),
    supersedesRecordSha256: record.history.at(-1)?.recordSha256 ?? null
  });
  return superseded;
}
