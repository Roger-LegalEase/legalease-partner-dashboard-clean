/** The printed CR-65 page-6 completion choices, not platform attestations.
 * Shared only by the two assigned Alabama family hosts. No PDF is written here.
 */
import assert from 'node:assert/strict';

export const PRIOR_CHOICE_FIELDS = ['Check Box2.0', 'Check Box2.1'];
export const PRIOR_DETAIL_FIELDS = ['COUNTY and it was given Court Case Number', 'was     granted', 'Check Box3.0', 'Check Box3.1.0'];
export const PRO_SE_FIELD = 'Check Box3.1.1';
const PRIOR = Object.freeze({ factId: 'participant.previously_applied_for_expungement', equals: true });
const labels = {
  'Check Box2.0': 'CR-65 page 6, item (3): select exactly one truthful statement about previous expungement applications; first box means you have not previously applied in this or any other jurisdiction',
  'Check Box2.1': 'CR-65 page 6, item (3): second box means you have previously filed for an expungement; never select both boxes',
  'COUNTY and it was given Court Case Number': 'Only if you tick the second box in CR-65 page 6, item (3): county where that previous expungement petition was filed',
  'was     granted': 'Only if you tick the second box in CR-65 page 6, item (3): court case number of that previous petition, not the current case number',
  'Check Box3.0': 'Only if you tick the second box in CR-65 page 6, item (3): select granted if that previous petition was granted',
  'Check Box3.1.0': 'Only if you tick the second box in CR-65 page 6, item (3): select denied if that previous petition was denied; do not guess an unresolved result',
  [PRO_SE_FIELD]: 'CR-65 page 6: confirm representation; check pro se (Not represented by an attorney) only if true'
};

export function cr65CompletionRefusal(documentId, fieldName, page) {
  if (documentId !== 'CR-65' || page !== 6 || !Object.hasOwn(labels, fieldName)) return null;
  const conditional = PRIOR_DETAIL_FIELDS.includes(fieldName);
  return {
    effectiveLabel: labels[fieldName],
    reason: 'The participant supplies the truthful answer before filing; the platform neither infers history or representation nor makes a sworn attestation.',
    completenessDisposition: 'REQUIRED_BEFORE_FILING',
    requiredBeforeFiling: true,
    requiredWhen: conditional ? { ...PRIOR } : null,
    completionGroup: PRIOR_CHOICE_FIELDS.includes(fieldName) ? 'previous_application_select_one'
      : fieldName === PRO_SE_FIELD ? 'representation_confirmation' : 'previous_application_details',
    completionActor: 'participant',
    isSelectionControl: fieldName.startsWith('Check Box'),
    factAvailable: false, routeDetermined: false, role: 'participant'
  };
}

export function cr65CompletionInstructions() {
  return `### CR-65 page 6: previous applications and representation\n\nBefore signing, complete sworn item (3), which says "Select one of the following." Select exactly one truthful answer. The first box states that you have not previously applied for an expungement in this or any other jurisdiction. The second states that you have previously filed for an expungement. The platform leaves both blank because it does not hold your history. Never mark both, and do not assume the first box is true merely because no prior application is recorded here.\n\nOnly if you tick the second box in item (3), enter the county and court case number of that previous petition and select whether it was granted or denied. Do not copy the current case number into the previous-petition fields. If you tick the first box, leave the previous county, case number, and granted/denied boxes blank. If a previous matter is pending, its result is uncertain, or several previous applications cannot be described accurately in the printed space, stop and obtain help; do not invent a result or omit a previous application.\n\nOn the same page, check "pro se (Not represented by an attorney)" only if you are not represented by an attorney in this petition. If an attorney represents you, do not check pro se; have that attorney complete the attorney block. Missing attorney details do not establish that you are pro se. The platform does not choose your representation status.\n\nThe participant signs only after checking every fact and completing the applicable answers. Leave the signature, oath date, notary/officer signature, commission details, and attorney execution fields for their proper signers. Follow the printed oath/jurat; a prepared name is not a signature or a completed notarial act.\n\n`;
}

export function conditionalCompletionRequirements({ previouslyApplied = null, representation = null } = {}) {
  assert.ok([null, true, false].includes(previouslyApplied), 'previous application status must be true, false or unknown');
  assert.ok([null, 'pro_se', 'attorney'].includes(representation), 'representation must be confirmed pro_se, attorney or unknown');
  return {
    previousApplicationChoiceRequired: true,
    previousDetailsRequired: previouslyApplied === true,
    previousDetailsMustRemainBlank: previouslyApplied === false,
    resolvePreviousApplicationStatus: previouslyApplied === null,
    proSeMarkRequired: representation === 'pro_se',
    proSeMarkForbidden: representation === 'attorney',
    confirmRepresentation: representation === null,
    automaticallyAttestedFields: []
  };
}
