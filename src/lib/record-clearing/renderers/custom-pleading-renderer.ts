import type { JurisdictionCode } from "../types";

export interface PleadingStatute {
  citation: string | null;
  description: string;
}

export interface PleadingTrackConfig {
  jurisdictionCode: JurisdictionCode;
  trackId: string;
  templateGrade: "legal_ops_custom_pleading";
  templateLifecycle: "replacement_candidate";
  primaryReliefTerm: string;
  documentTitleFull: string;
  courtCaption: string;
  primaryStatutoryAuthority: PleadingStatute[];
  verificationStatute: PleadingStatute;
  includeProposedOrder: boolean;
  includeCertificateOfService: boolean;
  serviceNote: string | null;
  counselFlags: string[];
}

export interface PleadingPartyData {
  petitionerName: string;
  petitionerAddress?: string;
  otherNamesUsed?: string;
}

export interface PleadingCaseData {
  countyName: string;
  judicialDistrict?: string;
  docketNumber?: string;
  otn?: string;
  judgeName?: string;
  judgeAddress?: string;
}

export interface PleadingChargeData {
  chargeDescription?: string;
  offenseGrade?: string;
  disposition?: string;
  dispositionDate?: string;
  arrestDate?: string;
  complaintDate?: string;
  arrestingAgency?: string;
  affiantName?: string;
  affiantAddress?: string;
  statuteTitle?: string;
  statuteSection?: string;
  statuteSubsection?: string;
}

export interface PleadingEligibilityData {
  eligibilityBasisLabel: string;
  restitutionText?: string;
  patchText?: string;
  waitingPeriodText?: string;
  additionalFacts?: string[];
}

export interface PleadingRenderInput {
  config: PleadingTrackConfig;
  partyData: PleadingPartyData;
  caseData: PleadingCaseData;
  chargeData: PleadingChargeData;
  eligibilityData: PleadingEligibilityData;
  attachments?: string[];
  productName: string;
  shadowMode: boolean;
}

export interface PleadingSection {
  sectionId: string;
  heading: string;
  text: string;
}

export interface PleadingRenderResult {
  rendered: boolean;
  templateGrade: string;
  templateLifecycle: string;
  shadowMode: boolean;
  fullText: string;
  sections: PleadingSection[];
  attachmentList: string[];
  counselFlags: string[];
  warnings: string[];
  errors: string[];
}

export function renderCustomPleading(input: PleadingRenderInput): PleadingRenderResult {
  const warnings: string[] = [];
  const attachmentList = buildAttachmentList(input);
  const sections = buildSections(input, attachmentList, warnings);
  const footer = `---\nPrepared by petitioner using ${input.productName}. This is not an official court form.`;
  const bodyText = sections
    .map((s) => (s.heading ? `${s.heading}\n\n${s.text}` : s.text))
    .join("\n\n");

  return {
    rendered: true,
    templateGrade: input.config.templateGrade,
    templateLifecycle: input.config.templateLifecycle,
    shadowMode: input.shadowMode,
    fullText: `${bodyText}\n\n${footer}`,
    sections,
    attachmentList,
    counselFlags: input.config.counselFlags,
    warnings,
    errors: []
  };
}

function buildAttachmentList(input: PleadingRenderInput): string[] {
  const list: string[] = [];
  if (input.config.includeCertificateOfService) list.push("Certificate of Service");
  if (input.chargeData.affiantName) list.push(`PATCH report (affiant: ${input.chargeData.affiantName})`);
  if (input.attachments) list.push(...input.attachments);
  return list;
}

function buildSections(
  input: PleadingRenderInput,
  attachmentList: string[],
  warnings: string[]
): PleadingSection[] {
  const { config, partyData, caseData, chargeData, eligibilityData } = input;
  const sections: PleadingSection[] = [];
  const county = caseData.countyName || "[COUNTY TO BE CONFIRMED]";
  const petitioner = partyData.petitionerName || "[PETITIONER NAME TO BE CONFIRMED]";
  let p = 0;

  // Court caption
  sections.push({
    sectionId: "court_caption",
    heading: "",
    text: [
      config.courtCaption,
      `COUNTY OF ${county.toUpperCase()}`,
      "CRIMINAL DIVISION",
      "",
      "COMMONWEALTH OF PENNSYLVANIA,",
      "    Respondent,",
      "",
      "v.",
      "",
      `${petitioner.toUpperCase()},`,
      "    Petitioner."
    ].join("\n")
  });

  // Case number block
  const caseLines: string[] = [];
  if (caseData.docketNumber) {
    caseLines.push(`DOCKET NO.: ${caseData.docketNumber}`);
  } else {
    caseLines.push("DOCKET NO.: [TO BE CONFIRMED]");
    warnings.push("Docket number not provided.");
  }
  if (caseData.otn) caseLines.push(`OTN: ${caseData.otn}`);
  if (caseData.judicialDistrict) caseLines.push(`JUDICIAL DISTRICT: ${caseData.judicialDistrict}`);
  sections.push({ sectionId: "case_number_block", heading: "", text: caseLines.join("\n") });

  // Document title
  sections.push({ sectionId: "document_title", heading: "", text: config.documentTitleFull });

  // Statutory authority block
  const authLines = config.primaryStatutoryAuthority
    .map((s) =>
      s.citation
        ? `${s.citation} — ${s.description}`
        : `[CITATION REQUIRED — FLAGGED FOR COUNSEL] ${s.description}`
    )
    .join("\n");
  sections.push({ sectionId: "statutory_authority", heading: "STATUTORY AUTHORITY", text: authLines });

  // I. Jurisdiction and venue
  p += 1;
  const jv1 = `${p}. This Court has jurisdiction over this matter as the Court of Common Pleas of ${county} County, Pennsylvania, where the proceedings occurred.`;
  p += 1;
  const jv2 = `${p}. Venue is proper in this Court because the criminal proceedings that are the subject of this petition occurred in ${county} County, Pennsylvania.`;
  sections.push({ sectionId: "jurisdiction_venue", heading: "I. JURISDICTION AND VENUE", text: [jv1, "", jv2].join("\n") });

  // II. Parties
  const partyLines: string[] = [];
  p += 1;
  partyLines.push(
    `${p}. Petitioner is ${petitioner}` +
      (partyData.petitionerAddress
        ? `, whose address is ${partyData.petitionerAddress}.`
        : `. [PETITIONER ADDRESS — ADD IF REQUIRED BY LOCAL RULES]`)
  );
  p += 1;
  partyLines.push(`${p}. Respondent is the Commonwealth of Pennsylvania.`);
  if (partyData.otherNamesUsed) {
    p += 1;
    partyLines.push(`${p}. Petitioner has also been known as: ${partyData.otherNamesUsed}.`);
  }
  sections.push({ sectionId: "parties", heading: "II. PARTIES", text: partyLines.join("\n") });

  // III. Facts and case history
  const factLines: string[] = [];
  p += 1;
  if (chargeData.arrestDate) {
    factLines.push(
      `${p}. On or about ${chargeData.arrestDate}, Petitioner was charged with ${chargeData.chargeDescription || "[CHARGE DESCRIPTION TO BE CONFIRMED]"} by ${chargeData.arrestingAgency || "[ARRESTING AGENCY TO BE CONFIRMED]"}.`
    );
  } else {
    factLines.push(
      `${p}. Petitioner was charged with ${chargeData.chargeDescription || "[CHARGE DESCRIPTION TO BE CONFIRMED]"} by ${chargeData.arrestingAgency || "[ARRESTING AGENCY TO BE CONFIRMED]"}. [ARREST DATE TO BE CONFIRMED]`
    );
  }
  if (chargeData.complaintDate) {
    p += 1;
    factLines.push(`${p}. The complaint was filed on ${chargeData.complaintDate}.`);
  }
  p += 1;
  factLines.push(
    `${p}. The matter was assigned Docket Number ${caseData.docketNumber || "[TO BE CONFIRMED]"}${caseData.otn ? ` and OTN ${caseData.otn}` : ""}.`
  );
  if (caseData.judgeName) {
    p += 1;
    factLines.push(
      `${p}. The assigned judge is ${caseData.judgeName}${caseData.judgeAddress ? `, ${caseData.judgeAddress}` : ""}.`
    );
  }
  p += 1;
  if (chargeData.dispositionDate) {
    factLines.push(
      `${p}. On ${chargeData.dispositionDate}, the matter was resolved with the following disposition: ${chargeData.disposition || "[DISPOSITION TO BE CONFIRMED]"}.`
    );
  } else {
    factLines.push(
      `${p}. The matter was resolved with the following disposition: ${chargeData.disposition || "[DISPOSITION TO BE CONFIRMED]"}. [DISPOSITION DATE TO BE CONFIRMED]`
    );
  }
  if (chargeData.offenseGrade) {
    p += 1;
    factLines.push(`${p}. The offense grade was: ${chargeData.offenseGrade}.`);
  }
  const chargeStatParts: string[] = [];
  if (chargeData.statuteTitle) chargeStatParts.push(`Title ${chargeData.statuteTitle}`);
  if (chargeData.statuteSection) chargeStatParts.push(`Section ${chargeData.statuteSection}`);
  if (chargeData.statuteSubsection) chargeStatParts.push(`Subsection ${chargeData.statuteSubsection}`);
  if (chargeStatParts.length > 0) {
    p += 1;
    factLines.push(`${p}. Charge statutory reference: ${chargeStatParts.join(", ")}.`);
  }
  sections.push({ sectionId: "facts_case_history", heading: "III. FACTS AND CASE HISTORY", text: factLines.join("\n") });

  // IV. Eligibility allegations
  const eligLines: string[] = [];
  p += 1;
  eligLines.push(
    `${p}. Petitioner may be eligible for ${config.primaryReliefTerm} on the following basis: ${eligibilityData.eligibilityBasisLabel}.`
  );
  if (eligibilityData.restitutionText) {
    p += 1;
    eligLines.push(`${p}. ${eligibilityData.restitutionText}`);
  }
  if (eligibilityData.waitingPeriodText) {
    p += 1;
    eligLines.push(`${p}. ${eligibilityData.waitingPeriodText}`);
  }
  if (eligibilityData.patchText) {
    p += 1;
    eligLines.push(`${p}. ${eligibilityData.patchText}`);
  }
  for (const fact of eligibilityData.additionalFacts ?? []) {
    p += 1;
    eligLines.push(`${p}. ${fact}`);
  }
  eligLines.push(
    "",
    "IMPORTANT: Petitioner may be eligible; this document does not guarantee eligibility or a court outcome."
  );
  sections.push({
    sectionId: "eligibility_allegations",
    heading: "IV. ELIGIBILITY ALLEGATIONS",
    text: eligLines.join("\n")
  });

  // V. Requested relief
  const reliefAction =
    config.primaryReliefTerm === "expungement" ? "expunge" : "apply limited access to";
  const reliefLines = [
    "WHEREFORE, Petitioner respectfully requests that this Court:",
    `(a) Grant this Petition and enter an Order directing the ${config.primaryReliefTerm} of all arrest and criminal history records in the above-captioned matter;`,
    `(b) Direct all criminal justice agencies having custody of such records to ${reliefAction} all records relating to this matter; and`,
    "(c) Grant such other and further relief as this Court deems just and appropriate."
  ];
  sections.push({ sectionId: "requested_relief", heading: "V. REQUESTED RELIEF", text: reliefLines.join("\n") });

  // VI. Verification and signature block
  const verificationCitation =
    config.verificationStatute.citation ?? "[VERIFICATION STATUTE — CONFIRM WITH COUNSEL]";
  const verificationLines = [
    `I, ${petitioner}, verify that the statements made in this petition are true and correct to the best of my knowledge, information, and belief. I understand that false statements herein are made subject to the penalties for unsworn falsification to authorities under ${verificationCitation}.`,
    "",
    "________________________________",
    petitioner,
    partyData.petitionerAddress ?? "[PETITIONER ADDRESS]",
    "",
    "Date: ________________________________",
    "",
    "[NOTE: Date of birth and Social Security Number should be added by petitioner if required by the applicable form or local court rules.]"
  ];
  sections.push({
    sectionId: "verification_signature",
    heading: "VI. VERIFICATION",
    text: verificationLines.join("\n")
  });

  // VII. Certificate of service (config-driven)
  if (config.includeCertificateOfService && config.serviceNote) {
    const serviceLines = [
      config.serviceNote,
      "",
      "I certify that on ________________________, I served a copy of this Petition upon the attorney for the Commonwealth at the following address:",
      "",
      "[ATTORNEY FOR COMMONWEALTH ADDRESS — CONFIRM WITH CLERK OF COURTS]",
      "",
      "Service method: [personal delivery / first-class mail / other as permitted by applicable court rules]",
      "",
      "________________________________",
      petitioner,
      "",
      "Date: ________________________________"
    ];
    sections.push({
      sectionId: "certificate_of_service",
      heading: "VII. CERTIFICATE OF SERVICE",
      text: serviceLines.join("\n")
    });
  }

  // Proposed order (config-driven)
  if (config.includeProposedOrder) {
    const orderAction = config.primaryReliefTerm === "expungement" ? "expunge" : "seal";
    const orderLines = [
      config.courtCaption,
      `COUNTY OF ${county.toUpperCase()}`,
      "",
      `COMMONWEALTH OF PENNSYLVANIA v. ${petitioner.toUpperCase()}`,
      `DOCKET NO.: ${caseData.docketNumber || "[DOCKET NUMBER TO BE CONFIRMED]"}`,
      "",
      "[PROPOSED] ORDER",
      "",
      "AND NOW, this ______ day of ____________________, 20____, upon consideration of the Petition filed herein, and any response thereto, it is hereby ORDERED and DECREED that:",
      "",
      `The Pennsylvania State Police, ${county} County Court of Common Pleas, ${chargeData.arrestingAgency || "[ARRESTING AGENCY]"}, and all other criminal justice agencies with records pertaining to this matter are hereby directed to ${orderAction} all records relating to the above-captioned matter.`,
      "",
      "BY THE COURT:",
      "",
      "________________________________",
      "J."
    ];
    sections.push({ sectionId: "proposed_order", heading: "PROPOSED ORDER", text: orderLines.join("\n") });
  }

  // Attachment list
  if (attachmentList.length > 0) {
    sections.push({
      sectionId: "attachment_list",
      heading: "ATTACHMENTS",
      text:
        "Attachments submitted with this petition:\n" +
        attachmentList.map((a) => `- ${a}`).join("\n")
    });
  }

  return sections;
}
