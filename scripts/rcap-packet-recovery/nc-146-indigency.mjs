// NC dismissal packet fee-component contract. Selection is not eligibility,
// counsel approval, an indigency finding or permission to release the packet.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { stampDeterministic } from '../rcap-official-forms/rcap-deterministic-pdf-date.mjs';

export const NC_FEE_WAIVER_COPY = 'Where a filing fee applies and the participant requests indigency treatment, deliver AOC-G-106 (Rev. 11/24), Petition To Proceed As An Indigent. AOC-CV-226 (Rev. 4/23) is supplemental financial information only when the court specifically requests it, never the operative expunction indigency petition.';
export const NC_FEE_GUIDANCE = Object.freeze([
  'An ordinary qualifying dismissal under G.S. 15A-146 has no filing fee. The $175 fee concerns a dismissal after deferred prosecution or conditional discharge. Those cases retain this product\'s legal-review stop; a fee selection does not decide eligibility or remove that stop.',
  'When a fee applies and you ask to proceed as an indigent, the selected packet includes AOC-G-106, Petition To Proceed As An Indigent (Rev. 11/24). The court decides your request. The Expunction Petition purpose is marked because this is an expunction request, not because indigency has been granted.',
  'Check only the benefit, representation or financial-inability statement that is true for you. Sponsorship, free access, or a clinic access code establishes none of those facts. Complete the required personal information. Follow G-106\'s sworn/affirmed execution before the authorized oath officer; do not pre-sign it. Provider certifications and court findings, signatures and orders remain blank.',
  'AOC-CV-226, Petition To Proceed As An Indigent / Civil Affidavit Of Indigency (Rev. 4/23), is not a substitute for G-106. It is included only when the court has specifically requested supplemental financial information and that request is recorded. The source has civil/arbitration wording: do not sign an inapplicable oath. Ask the court for an appropriate affidavit or directions before signing any statement that does not describe your request.',
  'The no-fee and fee-paid branches contain neither G-106 nor CV-226. An indigency-requested branch contains G-106 alone unless supplemental financial information is specifically requested. Do not submit unused alternatives or a sample fixture as your own sworn statement.'
]);

export function selectNc146Components(selection) {
  assert.ok(selection && typeof selection === 'object' && !Array.isArray(selection), 'NC fee selection is required');
  const { feeStatus, requestIndigency, supplementalRequested, supplementalRequestReference } = selection;
  assert.ok(['no_fee','fee_due'].includes(feeStatus), 'Unknown NC fee status requires review');
  assert.equal(typeof requestIndigency, 'boolean', 'Indigency request must be explicit');
  assert.equal(typeof supplementalRequested, 'boolean', 'Supplement request must be explicit');
  assert.ok(feeStatus === 'fee_due' || (!requestIndigency && !supplementalRequested), 'No-fee branch cannot request fee relief');
  assert.ok(!supplementalRequested || requestIndigency, 'A financial supplement cannot replace the indigency petition');
  assert.ok(!supplementalRequested || (typeof supplementalRequestReference === 'string' && supplementalRequestReference.trim()), 'Court-requested financial supplement needs a recorded request');
  const components=['petition','instructions'];
  if(requestIndigency) components.push('fee_waiver');
  if(supplementalRequested) components.push('supplemental_financial_affidavit');
  components.push('participant_guide');
  return {
    branch: feeStatus === 'no_fee' ? 'no_fee' : !requestIndigency ? 'fee_paid' : supplementalRequested ? 'requested_financial_supplement' : 'indigency_requested',
    components, legalReviewRequired:feeStatus === 'fee_due',
    feeAssessed:false, indigencyEstablished:false, grantsEligibility:false, grantsDeliveryAuthority:false
  };
}
export const NC_BRANCH_FIXTURES = Object.freeze({
  no_fee:{feeStatus:'no_fee',requestIndigency:false,supplementalRequested:false},
  fee_paid:{feeStatus:'fee_due',requestIndigency:false,supplementalRequested:false},
  indigency_requested:{feeStatus:'fee_due',requestIndigency:true,supplementalRequested:false},
  requested_financial_supplement:{feeStatus:'fee_due',requestIndigency:true,supplementalRequested:true,supplementalRequestReference:'SYNTHETIC TEST ONLY: recorded court request for financial information'}
});

export function g106Map(h) {
  const writes = [
    ['FileNumber','File No.','matter.case_number'],['CountyName','County','matter.county'],
    ['DefendantName','Name Of Defendant','participant.full_legal_name'],
    ['PetitionerName','Name Of Petitioner','participant.full_legal_name'],
    ['PetitionerAddressStreet1','Address Of Petitioner - street address','participant.street_address'],
    ['PetitionerAddressCity','City of petitioner','participant.city'],
    ['PetitionerAddressState','State of petitioner','participant.state'],
    ['PetitionerAddressZip','Zip of petitioner','participant.zip'],
  ].map(([id,label,fact])=>h.write(id,label,fact,1));
  writes.push({...h.write('ExpunctionPetitionCbx','Expunction Petition purpose (selection)',null,1),kind:'selection_control',isSelectionControl:true,routeDetermined:true,routeBasis:'This component is the G.S. 15A-146 indigency petition, not a grant of indigency.'});
  const refusals=[
    h.rbf('PlaintiffName','Name Of Plaintiff','the plaintiff name from the existing case caption','No plaintiff identity is supplied in these fixture facts',1),
    h.optional('PetitionerAddressStreet2','Address Of Petitioner - second street line','Only used when a second street line is needed',1),
    ...['DistrictCourtDivisionCbx','SuperiorCourtDivisionCbx'].map(id=>h.election(id,`${id.startsWith('District')?'District':'Superior'} Court division (selection)`,'Division follows the existing case, not a choice inferred from sponsorship',1)),
    ...['RecipientOfCbx','SNAPCbx','TANFCbx','SSICbx','LegalServicesCbx','FinanciallyUnableCbx'].map(id=>h.election(id,`${id} - indigency basis (selection)`,'The petitioner must establish the actual applicable benefit, representation or financial facts; none is inferred or preselected',1)),
    ...['SueCbx','InmateCbx','FileMotionsCbx','AppealCbx'].map(id=>({...h.optional(id,`${id} - another petition purpose (selection)`,'This component concerns an Expunction Petition, not another proceeding',1),isSelectionControl:true,completenessDisposition:'NOT_APPLICABLE_ON_THIS_ROUTE',routeConditionThatMakesItInapplicable:'This component is exclusively a G.S. 15A-146 expunction indigency petition',routeDetermined:false})),
    h.protectedBlank('SignatureDate','Date of petitioner signature','Petitioner completes upon signing',1),
    ...['PersonTitle','CommisionExpiredDate','Signature2Date'].map(id=>h.agencyBlank(id,`Officer verification: ${id}`,'Only the officer who administers any required oath completes this block',1)),
    ...['Signature3Date','PersonName','PersonAddressStreet1','PersonAddressStreet2','PersonAddressCity','PersonAddressState','PersonAddressZip'].map(id=>h.agencyBlank(id,`Legal-services provider certification: ${id}`,'Only an actual qualifying provider may complete or execute its certification',1)),
    ...['OrderAuthorizedCbx','OrderDeniedCbx','Signature4Date','AsstCSCCbx','CSCCbx','JudgeCbx'].map(id=>h.agencyBlank(id,`Court determination: ${id}`,'The court decides; no outcome, signature, title or date is prefilled',1)),
    ...['ConsideredFollowingInfoAndEvidenceField','CourtFindsUnableToPayMeetsCriteriaCkBox','ReceivesFoodAndNutritionCkBox','ReceivesWorkFirstFamilyAssistanceCkBox','ReceivesSupplementalSecurityIncomeCkBox','RepresentedByLegalServicesOrgCkBox','RepresentedByPrivateCounselBehalfCkBox','CourtFindsNoCriteriaButUnableToPayCkBox','UnableToPayCostsOfAppealBasedOnField','PetitionerAuthorizedAppealIndigentCkBox','PetitionIsDeniedCkBox','OrderAppealFromMagSectionSignedDate','OrderAppealSectionAsstCSCCkBox','OrderAppealSectionClerkCkBox','OrderAppealSectionJudgeCkBox','OrderAppealSectionMagistrateCkBox','NotFrivolousCbx','FrivolousCbx','PetitionAuthorizedCbx','PetitionNotAuthorizedCbx','ActionDismissedCbx','Signature5Date','SuperiorCourtJudgeName','Signature6Date','DeputyCSCCbx','AsstCSC2Cbx','CSC2Cbx'].map(id=>h.agencyBlank(id,`Court-only reverse: ${id}`,'The complete reverse is reserved to the court and not completed by this packet',2))
  ];
  return {writes,refusals};
}

export async function assembleNc146Packet(componentBytes, selection) {
  const decision=selectNc146Components(selection);
  const pdf=await PDFDocument.create();stampDeterministic(pdf);pdf.setTitle(`North Carolina dismissal packet - ${decision.branch}`);
  const pageManifest=[];
  for(const id of decision.components){
    const bytes=componentBytes.get(id);assert.ok(bytes,`Selected NC component is missing: ${id}`);
    const source=await PDFDocument.load(bytes,{updateMetadata:false});
    for(const [i,page] of (await pdf.copyPages(source,source.getPageIndices())).entries()){
      pdf.addPage(page);pageManifest.push({packetPage:pdf.getPageCount(),component:id,sourcePage:i+1});
    }
  }
  return {bytes:Buffer.from(await pdf.save({useObjectStreams:false,updateMetadata:false})),pageManifest,decision};
}
export async function writeNc146BranchFixtures(components, fixture, out) {
  const records=[];fs.mkdirSync(`${out}/fixtures/branches`,{recursive:true});
  for(const [name,selection] of Object.entries(NC_BRANCH_FIXTURES)){
    const a=await assembleNc146Packet(components,selection),b=await assembleNc146Packet(components,selection);
    assert.ok(a.bytes.equals(b.bytes),`NC ${fixture}/${name} is nondeterministic`);
    const file=`${out}/fixtures/branches/${fixture}-${name}.pdf`;fs.writeFileSync(file,a.bytes);
    records.push({fixture:`${fixture}-${name}`,baseFixture:fixture,branch:name,file,sha256:crypto.createHash('sha256').update(a.bytes).digest('hex'),byteLength:a.bytes.length,pageCount:a.pageManifest.length,pageManifest:a.pageManifest,components:a.decision.components,selection,selectionResult:a.decision,syntheticFixture:true});
  }
  return records;
}
