/**
 * Record-driven venue mapping for Arizona A.R.S. § 13-911 packets.
 *
 * A missing or contradictory record is deliberately ambiguous. Callers must
 * stop before selecting a court; this module never falls back to a remembered
 * courthouse, county default, or form heading.
 */
export function mapArizonaRecordSealingCourt({ familyId, record }) {
  const r = record && typeof record === 'object' ? record : {};
  const text = (v) => typeof v === 'string' ? v.trim() : '';
  const ambiguous = (reason) => ({ status: 'AMBIGUOUS', court: null, reason });

  if (familyId === 'az_record_sealing_arrest_no_charges-set') {
    if (r.noChargesFiled !== true) {
      return ambiguous(r.noChargesFiled === false
        ? 'arrest route record contradicts the no-charges route'
        : 'no-charges record is not established');
    }
    if (r.initialAppearanceOccurred === true) {
      const court = text(r.initialAppearanceCourt);
      return court
        ? { status: 'ROUTED', court, basis: 'initial-appearance record identifies the court' }
        : ambiguous('initial appearance is recorded, but its court is absent');
    }
    if (r.initialAppearanceOccurred === false) {
      const county = text(r.countyOfArrest);
      return county
        ? { status: 'ROUTED', court: `Superior Court of ${county} County`, basis: 'record establishes no initial appearance and county of arrest' }
        : ambiguous('no initial appearance is recorded, but county of arrest is absent');
    }
    return ambiguous('initial-appearance occurrence is not established by the record');
  }

  if (familyId === 'az_record_sealing_dismissal_not_guilty-set') {
    const progression = text(r.chargingInstrumentProgression);
    if (!['justice_complaint_then_information', 'direct_charging_document'].includes(progression)) {
      return ambiguous('charging-instrument progression is missing or unsupported');
    }
    if (progression === 'justice_complaint_then_information' && r.justiceCourtComplaintFollowedByInformation !== true) {
      return ambiguous('record contradicts the justice-complaint-to-information progression');
    }
    if (progression === 'direct_charging_document' && r.justiceCourtComplaintFollowedByInformation !== false) {
      return ambiguous('record contradicts the direct charging-document progression');
    }
    if (r.justiceCourtComplaintFollowedByInformation === true) {
      const superiorCourt = text(r.superiorCourt);
      return superiorCourt
        ? { status: 'ROUTED', court: superiorCourt, basis: 'justice-court complaint followed by an information; superior court identified' }
        : ambiguous('an information followed the justice-court complaint, but the superior court is absent');
    }
    if (r.justiceCourtComplaintFollowedByInformation === false) {
      const court = text(r.chargingDocumentCourt);
      return court
        ? { status: 'ROUTED', court, basis: 'charging document identifies the filing court' }
        : ambiguous('charging-document history does not identify the filing court');
    }
    return ambiguous('charging-document history does not establish whether an information followed');
  }

  return ambiguous(`unsupported Arizona record-sealing family: ${String(familyId)}`);
}
