import assert from 'node:assert/strict';
import fs from 'node:fs';

export const KANSAS_PERMISSION_RECORD = 'data/rcap-grade-a/legal-decisions/OWNER_KJC_PERMISSION_ATTESTATION_2026-09-11.json';

export const KANSAS_SUBMITTED_BY_DOCUMENTS = [
  'KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022',
  'KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016'
];

const SUBMITTED_BY_HELD_FACTS = {
  NamePrint: 'participant.full_legal_name',
  'Address 1': 'participant.street_address',
  'City State Zip': 'participant.city_state_zip',
  Telephone: 'participant.phone',
  'Email Address': 'participant.email'
};

/**
 * The order footer has two adjacent actor blocks. "Submitted by" is signed by
 * the defendant or defendant's attorney; "Approved by" belongs to the
 * prosecutor. Sitting below IT IS SO ORDERED does not transfer the defendant
 * block to the judge. This opt-in policy reaches only the two pinned Kansas
 * order form IDs and leaves the separately named prosecutor fields untouched.
 */
export function applyKansasSubmittedByActorPolicy(spec) {
  for (const documentId of KANSAS_SUBMITTED_BY_DOCUMENTS) {
    for (const [field, factId] of Object.entries(SUBMITTED_BY_HELD_FACTS)) {
      const key = `${documentId}:${field}`;
      assert.ok(spec.policy[key], `${spec.familyId}: missing Submitted by field ${key}`);
      spec.policy[key] = {
        kind: 'narrative', factId,
        why: 'The source prints this neutral value in the Submitted by block signed by the defendant or defendant’s attorney. The participant is self-represented in these fixtures, and this write makes no judicial or prosecutor act.',
        ...(field === 'Address 1' ? { standardFontFallback: 'Times-Roman' } : {})
      };
    }
    const supremeCourtNumber = `${documentId}:Supreme Court Number`;
    assert.ok(spec.policy[supremeCourtNumber], `${spec.familyId}: missing ${supremeCourtNumber}`);
    spec.policy[supremeCourtNumber] = {
      kind: 'notApplicable',
      reason: 'The Supreme Court registration number belongs to an attorney; this packet is prepared for a self-represented participant and holds no attorney fact.',
      routeCondition: 'No attorney represents the participant in either fixture.'
    };
    const address2 = `${documentId}:Address 2`;
    assert.ok(spec.policy[address2], `${spec.familyId}: missing ${address2}`);
    spec.policy[address2] = {
      kind: 'notApplicable',
      reason: 'No separate second-line address fact is held; the complete structured street address, including any apartment, is written in Address 1.',
      routeCondition: 'The canonical participant address model has one complete street-address value and no independently drifting Address 2 answer.'
    };
    const fax = `${documentId}:Fax Number`;
    assert.ok(spec.policy[fax], `${spec.familyId}: missing ${fax}`);
    spec.policy[fax] = {
      kind: 'optional',
      reason: 'optional participant-authored content, and the platform does not invent it: the source offers a Submitted by fax number and this packet holds no participant fax number'
    };
  }
  const signatureHandback = '**The “Signature of Defendant/Defendant’s Attorney” line in each proposed order’s Submitted by block.** The platform never signs it. Follow the court’s instructions on whether and when you or your attorney should sign and lodge each proposed order.';
  if (!spec.deliberatelyBlank.includes(signatureHandback)) spec.deliberatelyBlank.push(signatureHandback);
}

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
  applyKansasSubmittedByActorPolicy(spec);
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
          'only caption facts, the explicitly governed neutral year-of-birth recital, and neutral participant facts in the source-labelled Submitted by block can reach them; findings, rulings, judicial controls, and the separate prosecutor Approved by block remain protected'
        )
      : note
  );
}
