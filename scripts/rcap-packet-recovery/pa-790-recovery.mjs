/** Bounded Rule 790 correction. No NJ or other PA family configuration is changed.
 * Authority: existing 2026-09-06 batch-04 contract, Rules 576/576.1/790,
 * AOPC's optional-order statement and the pinned CPCMS 2046 source.
 * These are reference component fixtures, not an approval or a live adapter.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { stampDeterministic } from '../rcap-official-forms/rcap-deterministic-pdf-date.mjs';

export const PA_790_FAMILY = 'pa_790_nonconviction-set';
export const PA_790_SERVICE = Object.freeze([
  'Serve the attorney for the Commonwealth concurrently with filing the Rule 790 petition. Rule 576 also requires service on the court administrator. Serve each represented party through its attorney, or an unrepresented party directly.',
  'Rule 576 permits service on counsel by delivery or mailing to the attorney, including the other methods the rule expressly permits. Mail to an unrepresented party must be certified, registered or first-class mail addressed to the residence, business or confinement. Service on the court administrator may be mailed or delivered as Rule 576(b)(3) provides. Party service by fax or electronic means requires a written, document-specific request; electronic service on the court administrator requires local-rule authorization. For electronic filing, follow Rule 576.1 and the authorized system. An email address on letterhead alone is not consent.',
  'Complete and sign the certificate only after service. Give the date and manner of service, and each recipient\'s name, address and telephone number. Confirm the actual county office and service addresses; LegalEase does not invent them or perform service.',
  'The Commonwealth may consent, object or take no action within 60 days after service. Opposition or a scheduled hearing remains a self-help stopping point. Do not infer consent from silence or prefill anyone\'s response.',
]);
const rows = [
  ['Commonwealth recipient name', 'Name of Commonwealth recipient served:'],
  ['Commonwealth recipient address', 'Service address of Commonwealth recipient served:'],
  ['Commonwealth recipient telephone', 'Telephone number of Commonwealth recipient served:'],
  ['Court administrator name', 'Court administrator name:'],
  ['Court administrator address', 'Court administrator service address:'],
  ['Court administrator telephone', 'Court administrator telephone number:'],
  ['Service manner', 'Manner of service (identify each recipient if different):'],
  ['Service date', 'Date of service (identify each recipient if different):'],
];
export const PA_790_CERTIFICATE = Object.freeze({
  documentId: 'pa_790_nonconviction-certificate-of-service-3',
  documentRole: 'certificate_of_service', key: 'certificate-of-service',
  ruleCitation: 'Pennsylvania Rules of Criminal Procedure 576, 576.1 and 790',
  renderText(facts) {
    return [
      'CERTIFICATE OF SERVICE',
      'Pennsylvania Rules of Criminal Procedure 576, 576.1 and 790',
      `Petitioner: ${facts['participant.full_legal_name']}`,
      `Docket number: ${facts['matter.case_number']}`, '',
      'DO NOT SIGN OR DATE UNTIL SERVICE HAS ACTUALLY OCCURRED.', '',
      'I certify that, concurrently with filing, I served the petition and included documents',
      'on the attorney for the Commonwealth and the court administrator as stated below.',
      'Add a service sheet with the same details for every additional recipient.', '',
      ...rows.flatMap(([,label]) => [label, '.'.repeat(88)]), '',
      'Signature of petitioner after service: ' + '.'.repeat(40),
      'Date signed: ' + '.'.repeat(64),
      `Printed name: ${facts['participant.full_legal_name']}`, '',
      'Use only a permitted method. Email or fax needs the applicable authorization;',
      'follow Rule 576.1 for authorized electronic filing. Never invent service facts.',
    ].join('\n');
  },
  fields: Object.freeze([
    {field:'Printed name', decision:'candidate_write', factId:'participant.full_legal_name'},
    {field:'Docket number', decision:'candidate_write', factId:'matter.case_number'},
    ...rows.map(([field, label]) => ({
      field, decision:'refuse', factId:null, blankTreatment:'REQUIRED_BEFORE_FILING',
      requiredBeforeFiling:true, routeDetermined:false,
      identity:`pa_790_nonconviction-certificate-of-service-3 field ${field}`,
      effectiveLabel:label, page:1, widgets:[], completesAfterService:true,
      reason:'REQUIRED_BEFORE_FILING: complete the actual recipient or performed-service fact after service; never infer or prefill it.',
    })),
    ...[['Signature of petitioner after service','Signature of petitioner after service:'],['Date signed','Date signed:']].map(([field,label]) => ({
      field, decision:'refuse', factId:null, refusalClass:'signature_or_date_participant_completion',
      requiredBeforeFiling:false, effectiveLabel:label, page:1, widgets:[], completesAfterService:true,
      reason:'Participant signature or execution date; never prefilled.',
    })),
  ]),
});


// Names enumerated first-hand from the pinned CPCMS 2046 source. Converting
// source-only evidence to a rendered component must replace stale source-only
// classifications, not carry them onto an actual participant filing.
const IFP_FIELDS = ["CertificationofCompliance", "JudicialDistrict", "NameofPresentEmployer", "AddressofPresentEmployer", "TypeofWorkPresentEmployer", "SalaryfromPresentEmployer", "DateofLastEmplyment", "SalaryLastEmployment", "TypeofWorkLastEmployment", "SpouseName", "SpousesEmployer", "SpousesEmployerAddress", "SpousesSalary", "SpousesTypeofWork", "SpousesLastEmployment", "SpousesSalaryLastEmployer", "SpousesLastEmploymentTypeofWork", "ContributionsfromChildren", "ContributionsfromParents", "OtherContributions", "Cash", "CertificatesofDeposits", "StocksandBonds", "SavingsAccount", "OtherAssests", "AddressofProperty", "AssessedValue", "MakeofVehicle", "ModelofVehicle", "YearofVehicle", "CostofVehicle", "Rent", "Loans", "Mortgages", "OtherObligations", "DependentSpouse", "Realtionship", "DependentsNonMinor2", "Relationship2", "Date", "AgesofDependentChildren1", "AgesofDependentChildren2", "AgesofDependentChildren3", "AgesofDependentChildren4", "AgesofDependentChildren5", "AgesofDependentChildren6", "AgesofDependentChildren7", "AgesofDependentChildren8", "AgesofDependentChildren9", "AgesofDependentChildren10", "AgesofDependentChildren11", "AgesofDependentChildren12", "CheckingAccount", "DependentsNonMinor", "DocketNumber", "PetitionerSignature", "CountyName", "Address1", "Address2", "AmountOwedRealEstate", "AmountOwedAutomobile", "Address3", "CountyCourtCity", "PA", "CountyCourtZip", "CountyCourtPhoneNumber", "DefendantName", "DefendantAddress"];
const IFP_DECLARATIONS = Object.fromEntries(IFP_FIELDS.map(field => {
  const signature = ['PetitionerSignature','Date'].includes(field);
  const election = field === 'CertificationofCompliance';
  return [field, {
    ...(signature || election ? {
      refusalClass: signature ? 'signature_or_date_participant_completion' : 'participant_sworn_narrative_or_legal_election',
      blankTreatment: 'PROTECTED', requiredBeforeFiling: false,
    } : {
      refusalClass: null, blankTreatment: 'REQUIRED_BEFORE_FILING', requiredBeforeFiling: true,
    }),
    identity: `PA-IFP-CCP field ${field}`,
    effectiveLabel: field === 'PA' ? 'CPCMS 2046 field PA (captionless source field)' : field,
    reason: signature ? 'Participant execution; never prefilled.' : election
      ? 'Participant certification election; never inferred or selected by the platform.'
      : 'REQUIRED_BEFORE_FILING: complete the actual financial, dependent, employment or court-caption information; an unknown amount is not zero.',
  }];
}));

/** Return a family-local replacement, leaving the shared NJ host's source config untouched. */
export function configurePa790Family(base) {
  assert.equal(base.jurisdiction, 'PA');
  assert.ok(base.routeKeys.every(k=>k.includes(':pa_790_nonconviction:')));
  const documents=base.documents.map(doc=>doc.documentId==='PA-IFP-CCP' ? {
    ...doc, key:'ifp-ccp', documentRole:'conditional_fee_waiver', render:true,
    // Printed identity and case reference only. Every financial field,
    // certification election, signature and execution date remains unfilled.
    allow:{DefendantName:'participant.full_legal_name', DefendantAddress:'participant.address_one_line',
      DocketNumber:'matter.case_number', CountyName:'matter.county'},
    fitTextPerWidget:true, normalizeMissingAppearanceSubtype:true,
    honorWidgetBorderStyle:true, preserveUnwrittenSelectionBackgrounds:true,
    declarations:IFP_DECLARATIONS,
  } : {...doc});
  return {
    ...base, documents, supplementalDocuments:[PA_790_CERTIFICATE],
    componentDelivery:{
      ...base.componentDelivery,
      proposed_order:{deliveredIn:'Optional convenience only: `fixtures/rule-790-order-canonical.pdf` and boundary. Include it only when selected; the AOPC says the proposed order is not mandatory. Court findings and signature stay blank.'},
      certificate_of_service:{deliveredIn:'Composed Rule 576/790 certificate: `fixtures/certificate-of-service-canonical.pdf` and boundary. Includes recipient names, addresses, telephone numbers, service date and manner; sign only after actual service.', heading:'## The certificate of service in this packet'},
      fee_waiver:{deliveredIn:'Conditional CPCMS 2046 (PA-IFP-CCP): `fixtures/ifp-ccp-canonical.pdf` and boundary. The selected IFP branch includes the actual two-page motion. No unknown financial amounts, sworn answers, certification mark, signature or execution date is invented.'},
    },
    requiredAttachments:{...base.requiredAttachments, lead:'Obtain the required case-specific records before filing. The petition calls for a Pennsylvania State Police criminal-history report obtained within 60 days before filing. The proposed order is optional, not a third mandatory filing component.'},
    feeAndWaiver:[
      'County filing fees vary. No verified county fee is supplied by this packet; obtain the filing court\'s current schedule. The county-fee and artifact-specific approval holds remain open. No statewide price is invented.',
      'When you select a request to proceed in forma pauperis, the packet includes the actual statewide Court of Common Pleas motion, CPCMS 2046 (PA-IFP-CCP), not merely a link or retained source. Complete its financial information accurately. The court decides whether relief is granted.',
      'The IFP component is omitted when you do not select it. Unknown amounts are blank, never zero. Review the form, complete any required certification, and sign and date only yourself. Do not include third-party personal identifiers contrary to the form\'s confidentiality instructions.',
    ],
    filingDestination:[
      'File the verified Rule 790 petition and required attachments with the clerk of courts of the judicial district where the charges were disposed. Obtain the required current Pennsylvania State Police history and case records.',
      'The proposed order is an OPTIONAL convenience. The AOPC states that these proposed orders are not mandatory. Include it only when selected, leaving judicial findings, signature and dates blank.',
      'Include CPCMS 2046 when the IFP request is selected. Serve the Commonwealth concurrently with filing and comply with Rule 576 service on the court administrator. Confirm local filing logistics and the county fee without guessing.',
    ],
    service:[...PA_790_SERVICE],
    notes:[
      ...base.notes.filter(s=>!s.includes('fee-waiver motion')&&!s.includes('required certificate')),
      'CPCMS 2046 is rendered and assembled only into the requested fee-waiver branch. Financial, sworn and execution fields remain for the participant.',
      'The composed certificate records all Rule 576 recipient and performed-service details. It is not represented as an official court form.',
      'The proposed order is optional; selection does not execute any court-owned finding.',
    ],
    guidance:{...base.guidance,
      afterTheTable:[
        'Complete required blanks from your actual case records. Ask the filing clerk about procedure or unknown county office addresses; ask counsel about eligibility or disputed legal facts.',
        'Service methods are governed by Rules 576 and 576.1, not left wholly unspecified. See the service section and do not infer consent to email.',
        'This reference set contains alternative components. The selected IFP branch includes the motion; the no-IFP branch excludes it. The order remains optional. Neither branch proves legal eligibility or launch approval.',
      ],
      selfHelpEnds:[
        'This packet prepares a Rule 790 petition and certificate, an optional order, and the IFP motion when requested. Review and complete the selected documents yourself.',
        'Stop for uncertain eligibility, facts you cannot establish, a Commonwealth objection, or a scheduled hearing. The clerk answers procedural questions; legal aid or Pennsylvania counsel handles legal advice and contested proceedings.',
      ],
      notYours:[
        'The IFP motion is conditional, not source-only. Complete all applicable financial information yourself; no missing value has been silently set to zero. Only you complete the certification and execute the form.',
        'The OPTIONAL proposed order carries judicial findings and execution blocks; leave them for the court.',
        'All participant signatures, execution dates and performed-service details remain unexecuted until you actually complete the required act.',
      ],
    },
  };
}

export function selectPa790Components({requestFeeWaiver,includeProposedOrder} = {}) {
  for(const [name,value] of Object.entries({requestFeeWaiver,includeProposedOrder})) {
    assert.equal(typeof value,'boolean',`${name} must be an explicit boolean; do not coerce missing or string values`);
  }
  return ['rule-790-petition','certificate-of-service',
    ...(includeProposedOrder?['rule-790-order']:[]),...(requestFeeWaiver?['ifp-ccp']:[])];
}

/** Execute the actual conditional packet assembly. Inputs are bounded fixture paths, not user paths. */
export async function assemblePa790Packet(directory, fixture, elections) {
  assert.ok(['canonical','boundary'].includes(fixture));
  const components=selectPa790Components(elections);
  const pdf=await PDFDocument.create(); const sources=[];
  for (const key of components) {
    const file=path.join(directory,'fixtures',`${key}-${fixture}.pdf`);
    const bytes=fs.readFileSync(file); const doc=await PDFDocument.load(bytes,{updateMetadata:false});
    for(const page of await pdf.copyPages(doc,doc.getPageIndices())) pdf.addPage(page);
    sources.push({component:key,fixture,file:path.relative(directory,file).split(path.sep).join('/'),
      sha256:crypto.createHash('sha256').update(bytes).digest('hex'),pageCount:doc.getPageCount()});
  }
  stampDeterministic(pdf);
  const bytes=Buffer.from(await pdf.save({useObjectStreams:false,updateMetadata:false}));
  return {bytes, components:sources, pageCount:pdf.getPageCount()};
}
export async function writePa790ConditionalFixtures(directory,{check=false}={}) {
  const branches=[];
  for(const fixture of ['canonical','boundary']) for(const requestFeeWaiver of [false,true]) for(const includeProposedOrder of [false,true]) {
    const elections={requestFeeWaiver,includeProposedOrder};
    const packet=await assemblePa790Packet(directory,fixture,elections);
    const file=`branches/${fixture}-${requestFeeWaiver?'ifp':'no-ifp'}-${includeProposedOrder?'optional-order':'no-order'}.pdf`;
    const full=path.join(directory,file);
    if(check) assert.deepEqual(fs.readFileSync(full),packet.bytes,`${file}: conditional assembly drift`);
    else {fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,packet.bytes);}
    const writes=JSON.parse(fs.readFileSync(path.join(directory,'reports/actual-writes.json'),'utf8'));
    const heldButNotPrinted=writes.artifacts.filter(a=>a.fixture===fixture && packet.components.some(c=>c.file===`fixtures/${path.basename(a.file)}`)).flatMap(a=>(a.heldButNotPrinted??[]).map(x=>({documentId:a.documentId,...x})));
    branches.push({fixture,elections,file,pageCount:packet.pageCount,components:packet.components,
      readyForParticipantDelivery:false,heldButNotPrinted,
      requiredNextStep:heldButNotPrinted.length?'Resolve disclosed held-but-not-printed values before participant delivery.':'Independent review and the existing legal/fee release requirements remain.',
      sha256:crypto.createHash('sha256').update(packet.bytes).digest('hex')});
  }
  const record={schemaVersion:'rcap-pa790-conditional-components/v1',familyId:PA_790_FAMILY,
    module:'scripts/rcap-packet-recovery/pa-790-recovery.mjs',moduleSha256:crypto.createHash('sha256').update(fs.readFileSync(new URL(import.meta.url))).digest('hex'),
    branches,sourceContract:'data/record-clearing/legal-decisions/2026-09-06-owner-relayed-research-batch-04.json',
    requiresExplicitElections:true,unknownFinancialValues:'left_blank_not_zero',
    referenceFixturesOnly:true,independentApprovalGranted:false,centralRasterAcceptanceGranted:false,
    generationAllowed:false,runtimeSelectable:false,commercialRoutesOpened:0};
  const value=JSON.stringify(record,null,2)+'\n';const file=path.join(directory,'conditional-components.json');
  if(check) assert.equal(fs.readFileSync(file,'utf8'),value); else fs.writeFileSync(file,value);
  return record;
}
