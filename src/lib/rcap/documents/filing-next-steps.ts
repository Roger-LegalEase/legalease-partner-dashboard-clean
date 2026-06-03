import type { RcapDocumentPacket, RcapFilingNextStepsPacket } from "@/lib/rcap/documents/mississippi/types";

type FilingNextStepsInput = Pick<
  RcapDocumentPacket,
  | "state"
  | "county"
  | "courtType"
  | "courtCounty"
  | "courtName"
  | "documentType"
  | "pathway"
  | "filingInstructions"
  | "countyCourtInstructions"
  | "safetyDisclaimer"
>;

export function buildFilingNextStepsPacket(packet: FilingNextStepsInput): RcapFilingNextStepsPacket {
  if (packet.state === "MS") return buildMississippiNextSteps(packet);
  if (packet.state === "IL") return buildIllinoisNextSteps(packet);
  if (packet.state === "DC") return buildDcNextSteps(packet);
  if (packet.state === "PA") return buildPennsylvaniaNextSteps(packet);
  const exhaustiveState: never = packet.state;
  return exhaustiveState;
}

function buildMississippiNextSteps(packet: FilingNextStepsInput): RcapFilingNextStepsPacket {
  const court = [packet.courtType, packet.courtCounty || packet.county ? `${packet.courtCounty || packet.county} County` : undefined, "Mississippi"].filter(Boolean).join(", ");
  return packetFromSections({
    title: "Next Steps for Filing - Mississippi",
    filingLocation: packet.courtType && (packet.courtCounty || packet.county) ? court : "Workflow gap: confirm the Mississippi court of origin and county before filing.",
    filingMethod: "Workflow gap: the preserved Mississippi source materials do not provide a universal in-person, mail, online, or e-filing method. Confirm the filing method with the clerk of the court of origin.",
    requiredDocuments: [
      "Generated petition packet.",
      "Supporting court records when available.",
      "For conviction petitions, a zero-balance or account sheet may be needed to show fines, fees, costs, and restitution are complete.",
      "Any copies, account sheets, certified dispositions, or local cover pages required by the clerk."
    ],
    serviceAndCopies: [
      "For felony conviction petitions, district attorney notice is required before any hearing.",
      "Workflow gap: required copy counts and notarization requirements are not stated as universal requirements in the preserved Mississippi materials. Ask the clerk before filing.",
      "A proposed order may be needed by some courts; confirm local practice before including it as a final filing document."
    ],
    feeSummary: [
      "Predictable statutory filing fee: generally $150 per petition under Mississippi law.",
      "Certified copies, record retrieval, and clerk charges can vary by court.",
      "Workflow gap: county-specific fees and payment method are not provided in the preserved Mississippi materials."
    ],
    courtContactOrLocationGuidance: packet.countyCourtInstructions,
    afterFiling: [
      "The court reviews the petition under current Mississippi law and local procedure.",
      "For felony conviction petitions, confirm district attorney notice before any hearing.",
      "After a judge signs an order, confirm who sends copies to agencies that maintain the record."
    ],
    trackingChecklist: [
      "Filed-stamped petition copy.",
      "Receipt for filing fee or clerk payment.",
      "Any clerk instructions about hearing dates, agency notice, or signed orders.",
      "Any copies sent to recordkeeping agencies after an order is signed."
    ],
    workflowGaps: gapsFrom("Mississippi", packet),
    safetyDisclaimer: packet.safetyDisclaimer
  });
}

function buildIllinoisNextSteps(packet: FilingNextStepsInput): RcapFilingNextStepsPacket {
  const county = packet.county || packet.courtCounty;
  return packetFromSections({
    title: "Next Steps for Filing - Illinois",
    filingLocation: county ? `${county} County Circuit Court, where the arrest or charge happened.` : "Workflow gap: confirm the Illinois Circuit Court county where the arrest or charge happened before filing.",
    filingMethod: "Workflow gap: the preserved Illinois source materials do not provide one statewide filing method for in-person, mail, online, or e-filing. Confirm the method with the circuit clerk.",
    requiredDocuments: [
      "Generated Illinois Request to Expunge and/or Seal packet.",
      "Case List.",
      "Additional arrest/case pages needed for expungement or sealing.",
      "Notice of Filing.",
      "Proposed order forms if required by the court.",
      "RAP sheet or Illinois criminal history report when available for checking the filing."
    ],
    serviceAndCopies: [
      "Notice usually goes to the State's Attorney, arresting agency, chief legal officer of the arresting unit of local government, and Illinois State Police.",
      "Workflow gap: required copy counts, notarization, and county cover sheets are county/court-specific in this workflow and must be confirmed with the clerk."
    ],
    feeSummary: [
      "Filing and notification costs vary by county. Treat any fee estimate as a range, not a fixed quote.",
      "Fee waiver application should be surfaced for users who cannot afford filing costs.",
      "Workflow gap: exact county filing fees and payment method are not provided in the preserved Illinois materials."
    ],
    courtContactOrLocationGuidance: packet.countyCourtInstructions,
    afterFiling: [
      "Agencies generally have a 60-day window to object after notice.",
      "If an agency objects, the court may set a hearing.",
      "After an order is entered, agencies may have up to 60 days to process it."
    ],
    trackingChecklist: [
      "Filed-stamped request packet.",
      "Proof or record of notices sent.",
      "Agency objection deadline.",
      "Any hearing date.",
      "Signed order and agency processing deadline."
    ],
    workflowGaps: gapsFrom("Illinois", packet),
    safetyDisclaimer: packet.safetyDisclaimer
  });
}

function buildDcNextSteps(packet: FilingNextStepsInput): RcapFilingNextStepsPacket {
  return packetFromSections({
    title: "Next Steps for Filing - District of Columbia",
    filingLocation: "DC Superior Court Criminal Division / Criminal Motion Seal Team where appropriate.",
    filingMethod: "Workflow gap: the preserved DC source materials in this workflow do not provide a single confirmed in-person, mail, online, or e-filing method. Check current DC Superior Court filing instructions before submitting.",
    requiredDocuments: [
      "Generated DC motion packet.",
      "DC arrest record / MPD rap sheet.",
      "DC Superior Court case disposition.",
      "Motion.",
      "Statement of Points and Authorities.",
      "Proposed Order.",
      "Certificate of Service.",
      "Exhibits supporting the motion."
    ],
    serviceAndCopies: [
      "Serve the prosecutor connected to the case: U.S. Attorney's Office for DC or DC Office of the Attorney General.",
      "Workflow gap: required copy counts and notarization requirements are not stated as universal requirements in the preserved DC materials."
    ],
    feeSummary: [
      "No statutory court filing fee is identified in this workflow for a DC seal or expunge motion.",
      "Record-request costs may still apply.",
      "Workflow gap: exact MPD record, certified copy, or payment-method costs are not fixed in the preserved DC materials."
    ],
    courtContactOrLocationGuidance: packet.countyCourtInstructions,
    afterFiling: [
      "The process may take months.",
      "The court may review the motion, prosecutor response, exhibits, and any hearing requirements.",
      "Automatic relief processing may be phased and should be checked rather than assumed complete."
    ],
    trackingChecklist: [
      "Filed-stamped motion packet.",
      "Proof of prosecutor service.",
      "Court notices or hearing settings.",
      "Any order entered by the court.",
      "Follow-up with agencies if an order is granted."
    ],
    workflowGaps: gapsFrom("DC", packet),
    safetyDisclaimer: packet.safetyDisclaimer
  });
}

function buildPennsylvaniaNextSteps(packet: FilingNextStepsInput): RcapFilingNextStepsPacket {
  const county = packet.county || packet.courtCounty;
  const isCleanSlate = String(packet.pathway).startsWith("clean_slate");
  return packetFromSections({
    title: "Next Steps for Filing - Pennsylvania",
    filingLocation: isCleanSlate ? "Clean Slate automatic sealing may not require a court filing where it applies; verify the record with PATCH." : county ? `Court of Common Pleas in ${county} County, where the case was heard.` : "Workflow gap: confirm the Pennsylvania county where the case was heard before filing in the Court of Common Pleas.",
    filingMethod: isCleanSlate
      ? "Automatic Clean Slate sealing may be free and automatic where it applies. If an eligible record was missed, petition-based limited access may be the corrective route and county filing method must be confirmed."
      : "File petition-based Pennsylvania court relief with the Clerk of Courts for the Court of Common Pleas. Workflow gap: the preserved Pennsylvania materials do not provide one statewide in-person, mail, online, or e-filing method.",
    requiredDocuments: [
      isCleanSlate ? "PATCH report for verification." : "Generated Pa.R.Crim.P. 790 petition packet or limited-access review packet, as applicable.",
      "PATCH report from Pennsylvania State Police, often obtained within 60 days before petition filing.",
      "Court docket, OTN, charge rows, disposition, sentence, and restitution/payment information.",
      "Proposed order when appropriate."
    ],
    serviceAndCopies: [
      "Serve a copy on the attorney for the Commonwealth / District Attorney when the petition is filed with the Clerk of Courts.",
      "Keep proof of service with the packet.",
      "Workflow gap: required copy counts and notarization requirements are county/court-specific unless stated by the current form or clerk."
    ],
    feeSummary: [
      "Clean Slate automatic sealing is described as free in this workflow.",
      "PATCH report is about $22, but the current fee should be verified before a user pays.",
      "Petition filing fees vary by county and are often about $132-$215.",
      "A fee waiver / in forma pauperis request may be available if filing costs are a barrier."
    ],
    courtContactOrLocationGuidance: packet.countyCourtInstructions,
    afterFiling: [
      "The District Attorney has 30 days to consent, object, or take no action.",
      "The court may grant on the papers if unopposed.",
      "The court may schedule a hearing if the District Attorney objects."
    ],
    trackingChecklist: [
      "PATCH report date.",
      "Filed-stamped petition copy.",
      "Proof of service on the attorney for the Commonwealth / District Attorney.",
      "30-day District Attorney response window.",
      "Any hearing notice.",
      "Signed order and agency processing follow-up."
    ],
    workflowGaps: gapsFrom("Pennsylvania", packet),
    safetyDisclaimer: packet.safetyDisclaimer
  });
}

function gapsFrom(state: string, packet: FilingNextStepsInput) {
  const gaps: string[] = [];
  const instructions = [...packet.filingInstructions, ...packet.countyCourtInstructions].join(" ");
  if (/Workflow gap/i.test(instructions)) gaps.push(...instructions.split(/(?<=\.)\s+/).filter((line) => /Workflow gap/i.test(line)));
  if (!packet.county && !packet.courtCounty && state !== "DC") gaps.push(`Workflow gap: ${state} county or court location still needs confirmation from the user record or source-backed court materials.`);
  return Array.from(new Set(gaps));
}

function packetFromSections(packet: Omit<RcapFilingNextStepsPacket, "plainText">): RcapFilingNextStepsPacket {
  const workflowGaps = Array.from(new Set([
    ...packet.workflowGaps,
    ...[
      packet.filingLocation,
      packet.filingMethod,
      ...packet.requiredDocuments,
      ...packet.serviceAndCopies,
      ...packet.feeSummary,
      ...packet.courtContactOrLocationGuidance,
      ...packet.afterFiling,
      ...packet.trackingChecklist
    ].filter((item) => /Workflow gap/i.test(item))
  ]));
  const plainText = [
    packet.title.toUpperCase(),
    "",
    "1. Generated petition/form packet",
    "Review the generated petition, motion, or form packet before treating it as ready to file.",
    "",
    "2. Filing instructions / next steps packet",
    `Where to file: ${packet.filingLocation}`,
    `How to file: ${packet.filingMethod}`,
    "",
    "Documents to include:",
    ...packet.requiredDocuments.map((item) => `- ${item}`),
    "",
    "Copies, notarization, service, prosecutor notice, or proposed orders:",
    ...packet.serviceAndCopies.map((item) => `- ${item}`),
    "",
    "3. Fee summary",
    ...packet.feeSummary.map((item) => `- ${item}`),
    "",
    "4. Court/contact/location guidance",
    ...packet.courtContactOrLocationGuidance.map((item) => `- ${item}`),
    "",
    "What happens after filing:",
    ...packet.afterFiling.map((item) => `- ${item}`),
    "",
    "What to track after submission:",
    ...packet.trackingChecklist.map((item) => `- ${item}`),
    "",
    workflowGaps.length > 0 ? "Workflow gaps to resolve before filing:" : "Workflow gaps to resolve before filing: none identified from the preserved workflow instructions.",
    ...workflowGaps.map((item) => `- ${item}`),
    "",
    "5. LegalEase safety disclaimer",
    packet.safetyDisclaimer
  ].join("\n");

  return { ...packet, workflowGaps, plainText };
}
