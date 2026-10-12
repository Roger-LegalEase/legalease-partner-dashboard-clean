import fs from 'node:fs';
const witness = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(w => w.jurisdiction === 'NY');
export const NY_LEGACY_BASE = { ...witness.finalAnswers, possible_pathway_context: 'Discretionary conviction sealing by petition under CPL 160.59',
 case_outcome: 'Misdemeanor conviction', offense_level: 'Misdemeanor',
 ny_16059_total_eligible_convictions: 1, ny_16059_felony_convictions: 0,
 ny_16059_ineligible_offense: 'No', ny_16059_sex_offender_registration: 'No',
 ny_16059_pending_charge: 'No', ny_16059_undisposed_arrest: 'No', ny_16059_later_conviction_entered: 'No',
 ny_16059_prior_sealing: 'No', new_convictions_during_waiting_period: 'No',
 resolved_timing_bucket: 'gt_10_years', sentencing_date: '2010-01-01' };
export const NY_HISTORY_CLOCK_FACTS = {
 ny_16059_request: 'petition', ny_16059_requested_excluded: 'No', ny_16059_history_total: 1, ny_16059_history_felonies: 0,
 ny_16059_requested_total: 1, ny_16059_requested_felonies: 0, ny_16059_grouping: 'separate',
 ny_16059_application_status: 'none', ny_16059_granted_total: 0, ny_16059_granted_felonies: 0,
 ny_16059_16058_grants: 'none', ny_16059_sentence_incarceration: 'No',
 ny_16059_incarceration_history: 'none', ny_16059_earliest_conviction_date: '2009-12-01'
};
export const NY_HISTORY_CLOCK_BASE = { ...NY_LEGACY_BASE, ...NY_HISTORY_CLOCK_FACTS };
