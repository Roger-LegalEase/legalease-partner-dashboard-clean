/** Owner scope is a release-denominator boundary, never a packet verdict. */
export const NC_SCOPE_PATH = 'data/record-clearing/legal-decisions/2026-09-14-nc-146-core-and-conditional-dna-scope.json';
export const NC_SUPPLEMENT = 'composed-treatment:nc_146_dismissal_petition';
export function conditionalFamilyScope(decision, families) {
  if (!decision) return new Map();
  const s = decision.supplement;
  const coreIds = ['nc_146_dismissal_petition-set', 'nc_146_acquittal_petition-set'];
  const supplement = families.find(f => f.familyId === NC_SUPPLEMENT);
  if (decision.decisionId !== 'NC-146-CORE-AND-CONDITIONAL-DNA-SCOPE-20260914'
    || decision.status !== 'ADOPTED_OWNER_PRODUCT_SCOPE_ONLY'
    || s?.familyId !== NC_SUPPLEMENT || s.conditional !== true || s.blocksCoreExpunction !== false
    || s.participantInstrumentOrAcceptanceProcedure !== 'UNRESOLVED'
    || s.routeKey !== 'obligation:track-branch:NC:nc_146_dismissal_petition:dna-expunction-application-15a-146-b1'
    || supplement?.state !== 'SOURCE_READY' || supplement?.routeKeys?.length !== 1 || supplement.routeKeys[0] !== s.routeKey
    || !coreIds.every(id => decision.coreFamilies?.some(f => f.familyId === id && f.state === 'COMPLETE_PACKET_PROVEN')
      && families.some(f => f.familyId === id && f.state === 'COMPLETE_PACKET_PROVEN'))) {
    throw new Error('NC conditional scope refuses changed identity, scope, or nonterminal core evidence');
  }
  return new Map([[NC_SUPPLEMENT, {
    launchRequired: false, conditional: true, blocksCoreExpunction: false,
    authority: NC_SCOPE_PATH, participantInstrumentOrAcceptanceProcedure: 'UNRESOLVED',
    packetComplete: false, inquiryRecord: s.inquiryRecord,
    reason: 'Optional DNA supplement is outside the launch-required family denominator. Native state and all unresolved evidence remain; no terminal treatment or DNA packet acceptance is inferred.'
  }]]);
}
