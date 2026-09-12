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
  for (const field of [
    'KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022:Year of Birth',
    'KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022:Year of Birth',
    // The denial PDF's field name is misleading. Its printed paragraph reads
    // "born in ____", and this widget is the year blank after the separate
    // race and sex widgets.
    'KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016:Sex born in'
  ]) {
    assert.ok(spec.policy[field], `${spec.familyId}: missing governed birth-year field ${field}`);
    spec.policy[field] = {
      kind: 'narrative', factId: 'participant.birth_year',
      why: 'The neutral year-of-birth field receives the four-digit year derived from the held full date of birth; this does not make any judicial finding or order selection.'
    };
  }
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
  spec.counselQuestions = spec.counselQuestions
    .filter(q => !q.includes('Judicial Council non-commercial-use'))
    .map(q => q.includes('This build completes paragraph 1 and the caption')
      ? q.replace(
          'This build completes paragraph 1 and the caption, and leaves paragraphs 2 through 4 as labelled blanks the participant fills before lodging the order',
          'This build completes the caption and neutral year-of-birth recital, and leaves the participant-stated race and sex recitals and other labelled blanks for the participant before lodging the order'
        )
      : q);
  spec.reviewersAttention = spec.reviewersAttention.map(note =>
    note.includes('nothing but a caption fact can reach them')
      ? note.replace(
          'nothing but a caption fact can reach them however a field is labelled',
          'only caption facts and the explicitly governed neutral year-of-birth recital can reach them; findings, rulings, and judicial controls remain protected'
        )
      : note
  );
}
