/** Carry an authored specification retirement into native fulfillment history.
 * This does not create authority for the replacement configurations. Historical
 * proof and disposition remain exactly what the predecessor claimed.
 *
 * TERMINAL RETIREMENT, AND WHY supersededBy IS NOT A SPECIFICATION PATH
 *
 * `supersededBy` is a Grade-A record identity. Its only other writer sets a
 * successor record's recordId, and the runtime denial reads "was superseded by
 * X; only the current version decides". The loader validates nothing about the
 * value -- grade-a-registry.ts merely filters on truthiness -- so writing a
 * packet-specification path there would pass at runtime purely by being truthy
 * while asserting a successor Grade-A record that does not exist.
 *
 * This retirement is terminal: counsel replaced the route with three governed
 * configurations, and NONE of them receives Grade-A authority. There is no
 * successor record to name. So the fact is represented explicitly, in a
 * `terminalRetirement` object, and `supersededBy` carries a dedicated
 * terminal-retirement identifier in its own namespace -- never a filename, a
 * route id, a specification path, or an invented Grade-A record id.
 */

export const TERMINAL_RETIREMENT_ID_PREFIX = "terminal-retirement:";

/** The identifier bound into supersededBy. Its namespace is unambiguous, it is
 *  derived from the authored retirement rather than invented, and it resolves
 *  to the terminalRetirement object on the same record. */
export function terminalRetirementId(specification, supersession) {
  return `${TERMINAL_RETIREMENT_ID_PREFIX}${specification.specificationId}@${supersession.on}`;
}

export function supersedeFromSpecification(record, specification, recordHash, changedBy, changedAt = new Date().toISOString().slice(0, 10), determinationPath = null) {
  const supersession = specification?.supersededBy;
  if (!supersession) return record;
  if (specification.routeKey !== record.routeId
    || supersession.status !== 'historical_only'
    || typeof supersession.by !== 'string' || !supersession.by.trim()
    || !/^\d{4}-\d{2}-\d{2}$/.test(supersession.on ?? '')
    || !Array.isArray(supersession.configurations) || !supersession.configurations.length) {
    throw new Error(`Invalid specification supersession for ${record.routeId}`);
  }

  const retirementId = terminalRetirementId(specification, supersession);

  // Fail closed rather than overload: the identifier must be in the dedicated
  // namespace, and must not be borrowed from the specification/route/path ones.
  if (!retirementId.startsWith(TERMINAL_RETIREMENT_ID_PREFIX)
    || /\.json$/.test(retirementId)
    || retirementId.slice(TERMINAL_RETIREMENT_ID_PREFIX.length).startsWith('data/')
    || /(^|:)[A-Z]{2}:/.test(retirementId.slice(TERMINAL_RETIREMENT_ID_PREFIX.length))) {
    throw new Error(`Terminal retirement id for ${record.routeId} is borrowed from another namespace: ${retirementId}`);
  }

  if (record.supersededBy) {
    if (record.supersededBy !== retirementId || record.supersededAt !== supersession.on) {
      throw new Error(`Conflicting specification supersession for ${record.routeId}`);
    }
    return record;
  }

  const terminalRetirement = {
    kind: 'terminal_legal_retirement',
    status: 'retired_no_successor_authority',
    retirementId,
    effectiveDate: supersession.on,
    sourceSpecification: { specificationId: specification.specificationId, routeKey: specification.routeKey },
    retirementDetermination: determinationPath,
    replacementSpecification: supersession.by,
    replacementConfigurations: [...supersession.configurations],
    reason: supersession.why ?? null,
    successorAuthority: {
      grantsGradeAAuthority: false,
      successorRecordId: null,
      statement: 'No replacement configuration receives Grade-A fulfillment authority. The replacements are closed by the absence of a record, and this retirement grants them nothing.'
    }
  };

  const superseded = {
    ...record,
    version: record.version + 1,
    supersededBy: retirementId,
    supersededAt: supersession.on,
    terminalRetirement,
    history: [...record.history]
  };
  superseded.history.push({
    version: superseded.version,
    changeKind: 'superseded',
    changedAt,
    changedBy,
    reason: `Specification ${specification.specificationId} became historical_only on ${supersession.on}: ${supersession.why} Replaced by ${supersession.by} (${supersession.configurations.join(', ')}). This is a terminal legal retirement recorded as ${retirementId}: historical evidence is preserved, and no replacement receives fulfillment authority.`,
    recordSha256: recordHash(superseded),
    supersedesRecordSha256: record.history.at(-1)?.recordSha256 ?? null
  });
  return superseded;
}
