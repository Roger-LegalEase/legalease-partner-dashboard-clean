import type { JurisdictionCode } from "../types";

export interface PleadingStatute {
  citation: string | null;
  description: string;
}

/**
 * Jurisdiction-specific presentation strings for the pleading body.
 *
 * When a config omits `presentation`, the renderer falls back to
 * PA_DEFAULT_PRESENTATION, which preserves the original Pennsylvania output
 * byte-for-byte. New states (e.g. DC) supply a full presentation so the
 * caption, parties, venue, verification, service, and proposed-order text use
 * the correct sovereign, court, and vocabulary.
 */
export interface PleadingPresentation {
  /** Caption + proposed-order header party, upper-case (e.g. "COMMONWEALTH OF PENNSYLVANIA"). */
  sovereignPartyName: string;
  /** Sentence-case party for the parties block (e.g. "the Commonwealth of Pennsylvania"). */
  sovereignPartyProper: string;
  /** Role label under the sovereign in the caption (e.g. "Respondent"). */
  sovereignRole: string;
  /** Movant role noun (e.g. "Petitioner" / "Movant"). */
  movantRole: string;
  /** Filing noun (e.g. "Petition" / "Motion"). */
  filingNoun: string;
  /** Division line under the court name (e.g. "CRIMINAL DIVISION"). */
  divisionLine: string;
  /** True when the caption/venue use a county line (PA); false for DC. */
  usesCounty: boolean;
  /** Full court name used in jurisdiction/venue when usesCounty is false. */
  courtName: string;
  /** Venue descriptor used when usesCounty is false (e.g. "the District of Columbia"). */
  venueDescriptor: string;
  /** Lead record custodians for the proposed order when usesCounty is false. */
  recordCustodianLead: string;
  /** Verification verb phrase (e.g. "verify" / "declare under penalty of perjury"). */
  verificationVerb: string;
  /** Penalty label appended when a verification statute citation is present. */
  verificationPenaltyLabel: string;
  /** Certificate-of-service recipient label (e.g. "the attorney for the Commonwealth"). */
  serviceRecipientLabel: string;
  /** Certificate-of-service recipient address placeholder. */
  serviceRecipientAddressLabel: string;
  /** Optional override for the requested-relief action verb (clause (b)). */
  reliefActionVerb?: string;
  /** Optional override for the proposed-order action verb. */
  orderActionVerb?: string;
}

export const PA_DEFAULT_PRESENTATION: PleadingPresentation = {
  sovereignPartyName: "COMMONWEALTH OF PENNSYLVANIA",
  sovereignPartyProper: "the Commonwealth of Pennsylvania",
  sovereignRole: "Respondent",
  movantRole: "Petitioner",
  filingNoun: "Petition",
  divisionLine: "CRIMINAL DIVISION",
  usesCounty: true,
  courtName: "",
  venueDescriptor: "",
  recordCustodianLead: "",
  verificationVerb: "verify",
  verificationPenaltyLabel: "the penalties for unsworn falsification to authorities",
  serviceRecipientLabel: "the attorney for the Commonwealth",
  serviceRecipientAddressLabel: "[ATTORNEY FOR COMMONWEALTH ADDRESS — CONFIRM WITH CLERK OF COURTS]"
};

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
  /** Optional jurisdiction presentation; defaults to PA_DEFAULT_PRESENTATION. */
  presentation?: PleadingPresentation;
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

function resolvePresentation(config: PleadingTrackConfig): PleadingPresentation {
  return config.presentation ?? PA_DEFAULT_PRESENTATION;
}

function defaultReliefAction(primaryReliefTerm: string): string {
  return primaryReliefTerm === "expungement" ? "expunge" : "apply limited access to";
}

function defaultOrderAction(primaryReliefTerm: string): string {
  return primaryReliefTerm === "expungement" ? "expunge" : "seal";
}

export function renderCustomPleading(input: PleadingRenderInput): PleadingRenderResult {
  const warnings: string[] = [];
  const pres = resolvePresentation(input.config);
  const attachmentList = buildAttachmentList(input);
  const sections = buildSections(input, attachmentList, warnings);
  const footer = `---\nPrepared by ${pres.movantRole.toLowerCase()} using ${input.productName}. This is not an official court form.`;
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
  const pres = resolvePresentation(config);
  const sections: PleadingSection[] = [];
  const county = caseData.countyName || "[COUNTY TO BE CONFIRMED]";
  const petitioner = partyData.petitionerName || "[PETITIONER NAME TO BE CONFIRMED]";
  const movantRole = pres.movantRole;
  const filingNoun = pres.filingNoun;
  const filingNounLower = filingNoun.toLowerCase();
  let p = 0;

  // Court caption
  const captionLines: string[] = [config.courtCaption];
  if (pres.usesCounty) captionLines.push(`COUNTY OF ${county.toUpperCase()}`);
  captionLines.push(
    pres.divisionLine,
    "",
    `${pres.sovereignPartyName},`,
    `    ${pres.sovereignRole},`,
    "",
    "v.",
    "",
    `${petitioner.toUpperCase()},`,
    `    ${movantRole}.`
  );
  sections.push({ sectionId: "court_caption", heading: "", text: captionLines.join("\n") });

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
  const jv1 = pres.usesCounty
    ? `${p}. This Court has jurisdiction over this matter as the Court of Common Pleas of ${county} County, Pennsylvania, where the proceedings occurred.`
    : `${p}. This Court has jurisdiction over this matter as the ${pres.courtName}, where the proceedings occurred.`;
  p += 1;
  const jv2 = pres.usesCounty
    ? `${p}. Venue is proper in this Court because the criminal proceedings that are the subject of this ${filingNounLower} occurred in ${county} County, Pennsylvania.`
    : `${p}. Venue is proper in this Court because the criminal proceedings that are the subject of this ${filingNounLower} occurred in ${pres.venueDescriptor}.`;
  sections.push({ sectionId: "jurisdiction_venue", heading: "I. JURISDICTION AND VENUE", text: [jv1, "", jv2].join("\n") });

  // II. Parties
  const partyLines: string[] = [];
  p += 1;
  partyLines.push(
    `${p}. ${movantRole} is ${petitioner}` +
      (partyData.petitionerAddress
        ? `, whose address is ${partyData.petitionerAddress}.`
        : `. [${movantRole.toUpperCase()} ADDRESS — ADD IF REQUIRED BY LOCAL RULES]`)
  );
  p += 1;
  partyLines.push(`${p}. ${pres.sovereignRole} is ${pres.sovereignPartyProper}.`);
  if (partyData.otherNamesUsed) {
    p += 1;
    partyLines.push(`${p}. ${movantRole} has also been known as: ${partyData.otherNamesUsed}.`);
  }
  sections.push({ sectionId: "parties", heading: "II. PARTIES", text: partyLines.join("\n") });

  // III. Facts and case history
  const factLines: string[] = [];
  p += 1;
  if (chargeData.arrestDate) {
    factLines.push(
      `${p}. On or about ${chargeData.arrestDate}, ${movantRole} was charged with ${chargeData.chargeDescription || "[CHARGE DESCRIPTION TO BE CONFIRMED]"} by ${chargeData.arrestingAgency || "[ARRESTING AGENCY TO BE CONFIRMED]"}.`
    );
  } else {
    factLines.push(
      `${p}. ${movantRole} was charged with ${chargeData.chargeDescription || "[CHARGE DESCRIPTION TO BE CONFIRMED]"} by ${chargeData.arrestingAgency || "[ARRESTING AGENCY TO BE CONFIRMED]"}. [ARREST DATE TO BE CONFIRMED]`
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
    `${p}. ${movantRole} may be eligible for ${config.primaryReliefTerm} on the following basis: ${eligibilityData.eligibilityBasisLabel}.`
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
    `IMPORTANT: ${movantRole} may be eligible; this document does not guarantee eligibility or a court outcome.`
  );
  sections.push({
    sectionId: "eligibility_allegations",
    heading: "IV. ELIGIBILITY ALLEGATIONS",
    text: eligLines.join("\n")
  });

  // V. Requested relief
  const reliefAction = pres.reliefActionVerb ?? defaultReliefAction(config.primaryReliefTerm);
  const reliefLines = [
    `WHEREFORE, ${movantRole} respectfully requests that this Court:`,
    `(a) Grant this ${filingNoun} and enter an Order directing the ${config.primaryReliefTerm} of all arrest and criminal history records in the above-captioned matter;`,
    `(b) Direct all criminal justice agencies having custody of such records to ${reliefAction} all records relating to this matter; and`,
    "(c) Grant such other and further relief as this Court deems just and appropriate."
  ];
  sections.push({ sectionId: "requested_relief", heading: "V. REQUESTED RELIEF", text: reliefLines.join("\n") });

  // VI. Verification and signature block
  const penaltySentence = config.verificationStatute.citation
    ? ` I understand that false statements herein are made subject to ${pres.verificationPenaltyLabel} under ${config.verificationStatute.citation}.`
    : "";
  const verificationLines = [
    `I, ${petitioner}, ${pres.verificationVerb} that the statements made in this ${filingNounLower} are true and correct to the best of my knowledge, information, and belief.${penaltySentence}`,
    "",
    "________________________________",
    petitioner,
    partyData.petitionerAddress ?? `[${movantRole.toUpperCase()} ADDRESS]`,
    "",
    "Date: ________________________________",
    "",
    `[NOTE: Date of birth and Social Security Number should be added by ${movantRole.toLowerCase()} if required by the applicable form or local court rules.]`
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
      `I certify that on ________________________, I served a copy of this ${filingNoun} upon ${pres.serviceRecipientLabel} at the following address:`,
      "",
      pres.serviceRecipientAddressLabel,
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
    const orderAction = pres.orderActionVerb ?? defaultOrderAction(config.primaryReliefTerm);
    const custodianLead = pres.usesCounty
      ? `The Pennsylvania State Police, ${county} County Court of Common Pleas`
      : pres.recordCustodianLead;
    const arrestingAgency = chargeData.arrestingAgency || "[ARRESTING AGENCY]";
    const custodianClause = custodianLead.includes(arrestingAgency)
      ? custodianLead
      : `${custodianLead}, ${arrestingAgency}`;
    const orderHeaderLines: string[] = [config.courtCaption];
    if (pres.usesCounty) orderHeaderLines.push(`COUNTY OF ${county.toUpperCase()}`);
    const orderLines = [
      ...orderHeaderLines,
      "",
      `${pres.sovereignPartyName} v. ${petitioner.toUpperCase()}`,
      `DOCKET NO.: ${caseData.docketNumber || "[DOCKET NUMBER TO BE CONFIRMED]"}`,
      "",
      "[PROPOSED] ORDER",
      "",
      `AND NOW, this ______ day of ____________________, 20____, upon consideration of the ${filingNoun} filed herein, and any response thereto, it is hereby ORDERED and DECREED that:`,
      "",
      `${custodianClause}, and all other criminal justice agencies with records pertaining to this matter are hereby directed to ${orderAction} all records relating to the above-captioned matter.`,
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
        `Attachments submitted with this ${filingNounLower}:\n` +
        attachmentList.map((a) => `- ${a}`).join("\n")
    });
  }

  return sections;
}
