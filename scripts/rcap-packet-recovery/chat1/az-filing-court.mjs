/**
 * Record-driven packet-preparation selector for two existing AZ families.
 * Implements legal-design-track-registry.recordDrivenFilingCourtSelection.
 * Authority checked 2026-09-07: https://www.azleg.gov/ars/13/00911.htm C(2)-(4).
 * Receives established record facts; does not fetch records, decide eligibility,
 * select an account/matter, create entitlement, or authorize packet delivery.
 */
export const AZ_SEALING_ROUTES = Object.freeze({
  'az_record_sealing_arrest_no_charges-set': 'obligation:track-pathway:AZ:az_record_sealing_arrest_no_charges:remedy-1-record-sealing',
  'az_record_sealing_dismissal_not_guilty-set': 'obligation:track-only:AZ:az_record_sealing_dismissal_not_guilty'
});
const nonempty = value => typeof value === 'string' && value.trim().length > 0
  && !/^(?:unknown|not sure|n\/?a|none|tbd)$/i.test(value.trim());
const noGrants = { grantsEligibility:false, generationAllowed:false, grantsDeliveryAuthority:false };
const stop = code => ({ status:'STOPPED', code, court:null, caseNumber:null, ...noGrants });
const established = (evidence, recordKey) => evidence && evidence.complete === true
  && evidence.consistent === true && nonempty(evidence.recordReference)
  && (recordKey === undefined || evidence.recordKey === recordKey);
const courtValid = court => court && nonempty(court.id) && nonempty(court.name)
  && nonempty(court.county) && court.jurisdiction === 'AZ'
  && ['justice','municipal','superior'].includes(court.level);
const selected = (court, caseNumber, basis, references) => ({
  status:'SELECTED', code:basis, court:{id:court.id,name:court.name,county:court.county,jurisdiction:court.jurisdiction,level:court.level}, caseNumber,
  supportingRecordReferences:[...new Set(references)], ...noGrants
});

/**
 * @param {unknown} value Explicit facts from this arrest/case's record history.
 * @returns {{status:string,code:string,court:object|null,caseNumber:string|null,
 *   grantsEligibility:boolean,generationAllowed:boolean,grantsDeliveryAuthority:boolean}}
 */
export function resolveArizonaSealingFilingCourt(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return stop('INVALID_INPUT');
  const { familyId, routeKey, recordKey, chargingHistory: history } = value;
  if (!nonempty(recordKey)) return stop('RECORD_IDENTITY_NOT_ESTABLISHED');
  if (!Object.hasOwn(AZ_SEALING_ROUTES, familyId) || AZ_SEALING_ROUTES[familyId] !== routeKey)
    return stop('ROUTE_FAMILY_MISMATCH');
  if (!established(history, recordKey) || typeof history.chargesFiled !== 'boolean'
    || !Array.isArray(history.instruments)) return stop('CHARGING_HISTORY_NOT_ESTABLISHED');
  if (!history.chargesFiled && history.instruments.length > 0) return stop('INCONSISTENT_CHARGING_HISTORY');
  const noCharges = familyId === 'az_record_sealing_arrest_no_charges-set';
  if (noCharges) {
    if (history.chargesFiled) return stop('STOP_TRACK_MISMATCH');
    const appearance = value.initialAppearance;
    if (!established(appearance, recordKey) || typeof appearance.occurred !== 'boolean')
      return stop('INITIAL_APPEARANCE_HISTORY_NOT_ESTABLISHED');
    if (appearance.occurred) {
      if (!courtValid(appearance.court) || !nonempty(appearance.caseNumber))
        return stop('INITIAL_APPEARANCE_COURT_NOT_ESTABLISHED');
      return selected(appearance.court, appearance.caseNumber, 'SELECT_INITIAL_APPEARANCE_COURT',
        [history.recordReference, appearance.recordReference]);
    }
    if (appearance.court != null || appearance.caseNumber != null)
      return stop('INCONSISTENT_INITIAL_APPEARANCE_HISTORY');
    const arrest = value.arrestRecord;
    const directory = value.superiorCourtDirectoryEntry;
    if (!established(arrest, recordKey) || !nonempty(arrest.countyOfArrest)) return stop('COUNTY_OF_ARREST_NOT_ESTABLISHED');
    // Use an explicit directory entry, not a constructed address/court name.
    if (!established(directory) || !courtValid(directory.court)
      || directory.court.level !== 'superior'
      || directory.court.county !== arrest.countyOfArrest)
      return stop('ARREST_COUNTY_SUPERIOR_COURT_NOT_ESTABLISHED');
    return selected(directory.court, null, 'SELECT_SUPERIOR_COURT_IN_COUNTY_OF_ARREST',
      [history.recordReference, appearance.recordReference, arrest.recordReference, directory.recordReference]);
  }
  if (!history.chargesFiled || history.instruments.length === 0) return stop('STOP_TRACK_MISMATCH');
  // Complete ordered history is needed to distinguish a later information
  // from the original complaint. Never infer that no later document exists.
  if (history.laterInformationSearchComplete !== true) return stop('LATER_INFORMATION_HISTORY_NOT_ESTABLISHED');
  const instruments = history.instruments;
  const ids = new Set();
  for (let i = 0; i < instruments.length; i++) {
    const instrument = instruments[i];
    if (!instrument || instrument.recordKey !== recordKey || !nonempty(instrument.id) || ids.has(instrument.id)
      || instrument.sequence !== i + 1 || !nonempty(instrument.recordReference)
      || !['indictment','information','citation','complaint'].includes(instrument.type)
      || !courtValid(instrument.court) || !nonempty(instrument.caseNumber))
      return stop('INCONSISTENT_CHARGING_INSTRUMENT');
    ids.add(instrument.id);
  }
  const original = instruments[0];
  if (original.type === 'complaint' && original.court.level === 'justice') {
    const later = instruments.slice(1).filter(i => i.type === 'information');
    if (later.length > 1) return stop('AMBIGUOUS_SUPERIOR_COURT_INFORMATION');
    if (later.length === 1) {
      const info = later[0];
      if (info.court.level !== 'superior' || info.followsInstrumentId !== original.id)
        return stop('INFORMATION_PROGRESSION_NOT_ESTABLISHED');
      if (instruments.some(i => i !== original && i !== info
        && (i.court.id !== info.court.id || i.caseNumber !== info.caseNumber)))
        return stop('AMBIGUOUS_CHARGING_DESTINATION');
      return selected(info.court, info.caseNumber, 'SELECT_SUPERIOR_COURT_NAMED_BY_INFORMATION',
        [history.recordReference, original.recordReference, info.recordReference]);
    }
  }
  // Multiple filings with divergent destinations or any unhandled later
  // information require reconciliation, not an arbitrary first/last match.
  if (instruments.slice(1).some(i => i.type === 'information'
    || i.court.id !== original.court.id || i.caseNumber !== original.caseNumber))
    return stop('AMBIGUOUS_CHARGING_DESTINATION');
  return selected(original.court, original.caseNumber, 'SELECT_COURT_WHERE_CHARGING_INSTRUMENT_WAS_FILED',
    [history.recordReference, ...instruments.map(i => i.recordReference)]);
}

/** Bind the executable preparation rule without granting runtime installation. */
export function arizonaFilingCourtBinding(family) {
  if (!family || !Object.hasOwn(AZ_SEALING_ROUTES, family.familyId)) return null;
  if (!Array.isArray(family.routeKeys) || family.routeKeys.length !== 1
    || family.routeKeys[0] !== AZ_SEALING_ROUTES[family.familyId])
    throw new Error('Arizona filing-court binding cannot broaden family route scope');
  return {
    module:'scripts/rcap-packet-recovery/chat1/az-filing-court.mjs',
    export:'resolveArizonaSealingFilingCourt',
    familyId:family.familyId,routeKey:family.routeKeys[0],
    status:'IMPLEMENTED_NOT_INSTALLED',
    purpose:'Resolve filing-court metadata from established record facts; not eligibility or participant delivery.',
    missingOrInconsistentRecord:'STOPPED',
    evidenceBinding:'Each charging/appearance/arrest fact must share the supplied recordKey; no address-based fallback.',
    grantsEligibility:false,generationAllowed:false,grantsDeliveryAuthority:false
  };
}
