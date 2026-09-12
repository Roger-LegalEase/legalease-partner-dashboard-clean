import assert from 'node:assert/strict';
import fs from 'node:fs';

export const KANSAS_PERMISSION_RECORD = 'data/rcap-grade-a/legal-decisions/OWNER_KJC_PERMISSION_ATTESTATION_2026-09-11.json';

/** Shared data corrections; no eligibility inference or participant election. */
export function applyKansasSharedPolicy(spec, fixtures) {
  const permission = JSON.parse(fs.readFileSync(KANSAS_PERMISSION_RECORD, 'utf8'));
  assert.ok(permission.familyIds.includes(spec.familyId));
  assert.equal(permission.evidenceType, 'owner_attestation');
  assert.equal(permission.dispositionOverride, 'LEGAL_CLEAR');
  for (const facts of Object.values(fixtures)) {
    const dob = facts['participant.date_of_birth'];
    assert.match(dob, /^\d{4}-\d{2}-\d{2}$/);
    facts['participant.birth_year'] = dob.slice(0, 4);
    // Synthetic fixtures explicitly exercise the no-pending-proceeding branch.
    facts['answers.pending_felony_proceeding'] ??= false;
  }
  const year = 'KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022:Year of Birth';
  if (spec.policy[year]) spec.policy[year] = {
    kind: 'narrative', factId: 'participant.birth_year',
    why: 'The printed year-of-birth field receives the year derived from the held full date of birth.'
  };
  spec.republicationRestriction = {
    historicalRestriction: spec.republicationRestriction,
    holdName: null, disposition: 'LEGAL_CLEAR', evidenceType: 'owner_attestation',
    documentaryPermissionStoredInRepository: false, decisionRecord: KANSAS_PERMISSION_RECORD,
    attribution: 'Official forms: Kansas Judicial Council / Kansas Judicial Branch. Original edition labels and source hashes are preserved.',
    whatThisBuildDidAboutIt: 'Applies the existing owner attestation; no change to permission policy and no commercial or review authority granted.'
  };
  spec.records.push({ recordId: 'owner-kjc-permission-attestation', path: KANSAS_PERMISSION_RECORD,
    role: 'Binding existing owner attestation; not a written permission artifact',
    mustContain: ['"evidenceType": "owner_attestation"', '"dispositionOverride": "LEGAL_CLEAR"', spec.familyId] });
  spec.historicalBuildFindings = spec.buildFindings;
  spec.buildFindings = [];
  spec.historicalCounselQuestions = spec.counselQuestions;
  spec.counselQuestions = spec.counselQuestions.filter(q => !q.includes('Judicial Council non-commercial-use'));
}
