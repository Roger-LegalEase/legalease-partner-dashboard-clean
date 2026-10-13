// Exact adult Prop64 source fields. This changes completion guidance, not PDF ink,
// eligibility, source bytes, route approval, or a participant's legal elections.
export const CA_PROP64_FAMILY = "ca-prop64-set";
export const CA_PROP64_COMPLETION_OBLIGATIONS = Object.freeze([
  { id: "cr400-signing", form: "CR-400", actor: "petitioner_applicant_or_attorney", trigger: "before_filing_executed_request", required: true, sourceAnchor: "page 1 signature line: signature of petitioner/applicant or attorney", manualNonWidgetAct: true, intakeOrPurchaseGate: false },
  { id: "cr401-service", form: "CR-401", actor: "actual_nonparty_adult_server", trigger: "after_actual_service_before_filing_executed_proof", required: true, sourceAnchor: "page 1 items 1-3 and signature of declarant", manualNonWidgetAct: true, intakeOrPurchaseGate: false, requirements: ["actual server over the age of 18 and not a party (printed declaration)", "actual recipient, address, date and time", "actual personal or mail service method", "mail city/state and one actual deposit method only for mail service", "actual declarant signature, printed name and date"] },
  { id: "cr400-sections", form: "CR-400", actor: "preparer_from_confirmed_record", trigger: "preparing_request", required: true, sourceAnchor: "page 1 item 1: check all that apply", knownFactBinding: "PENDING_SOURCE_BOUND_SUCCESSOR", intakeOrPurchaseGate: false },
  { id: "caption-reuse", form: "CR-400/CR-401/CR-403", actor: "preparer_from_record", trigger: "preparing_caption", required: true, sourceAnchor: "attorney or party without attorney / court / case / defendant captions", knownFactBinding: "PENDING_SOURCE_BOUND_SUCCESSOR", intakeOrPurchaseGate: false },
]);

export function caProp64RefusalDisposition(field, { familyId, formNumber } = {}) {
  if (familyId !== CA_PROP64_FAMILY || !["CR-400", "CR-401", "CR-403"].includes(formNumber)) return null;
  const name = field.name;
  if (!name.startsWith(`${formNumber}[0].`)) throw new Error(`${formNumber}: unexpected source field ${name}`);
  const result = (completionActor, completionStage, reason, extra = {}) => ({
    completionActor, completionStage, reason, blankTreatment: null,
    ...(field.fieldType === "/Btn" && !field.flags?.includes("pushButton") ? { isSelectionControl: true } : {}),
    requiredBeforeFiling: false, routeDetermined: false, ...extra,
  });
  if (field.flags?.includes("pushButton") || /\.(?:Warning|CourtLink)\[0\]$/.test(name)) {
    return result("source_document", "not_an_answer", "Official viewer control or privacy notice; not a participant answer.");
  }
  if (name.includes(".CrtUse[0].")) {
    return result("court", "court_assignment", "Court-use-only hearing date, time or department. Leave blank for the court; never invent an assignment to complete a packet.");
  }
  if (name.includes(".AttyPartyInfo[0].")) {
    if (/\.(?:AttyBarNo|AttyFirm|AttyFor)\[0\]$/.test(name)) {
      return result("attorney", "represented_filing_only", "Attorney-specific caption information. Do not substitute the participant's identity for a lawyer's bar number, firm or represented-party field.");
    }
    if (/\.(?:Name|Street|City|State|Zip|Phone|Fax|Email)\[0\]$/.test(name)) {
      return result("self_represented_party_or_attorney", "caption_preparation", "The caption says attorney OR party without attorney. Use the actual filer's known name and contact information; a self-represented party may complete these fields. Do not invent unavailable contact details.", { knownFactBinding: "PENDING_SOURCE_BOUND_SUCCESSOR" });
    }
  }
  if (name.includes(".CourtInfo[0].") || name.includes(".CaseNumber[0].")
      || name.includes(".TitlePartyName[0].") || name.includes(".Party[0].")
      || name.includes(".P2Header_sf[0].")) {
    return result("preparer_from_record", "caption_preparation", "Neutral court, case or party caption: prepare from verified record facts, including a distinct mailing address only when applicable. This is not a judicial finding or a completed service event.", { knownFactBinding: "PENDING_SOURCE_BOUND_SUCCESSOR" });
  }
  if (formNumber === "CR-403") {
    return result("court", "judicial_action", "Judicial order, finding, relief selection, sentence, supervision term or judicial date. The court completes this field; screening eligibility cannot supply a court decision.");
  }
  if (formNumber === "CR-401") {
    return result("actual_nonparty_adult_server", "actual_service", "The actual server, over the age of 18 and not a party, completes only the applicable service facts and declaration after service. The petitioner/applicant does not sign as the server. Record the method, recipients, date and time actually used; mail-only statements apply only to actual mail service.", {
      conditionDescription: name.includes(".li3b[0].")
        ? "Only for actual mail service; select the actual deposit method, not both alternatives."
        : "Only after actual service, and only where this field applies to that service method.",
      ...(field.fieldType === "/Tx" ? { requiredBeforeFiling: true, blankTreatment: "REQUIRED_BEFORE_FILING" } : {}),
      completionObligationId: "cr401-service",
    });
  }
  if (/\.LI[34]\[0\]/.test(name)) {
    return result("petitioner_or_applicant", "explicit_optional_election", "Optional waiver of the original sentencing judge or personal appearance. Leave unchecked unless the participant affirmatively chooses that specific waiver; neither waiver is a filing or purchase prerequisite.");
  }
  if (name.includes(".SigBlock[0].")) {
    return result("petitioner_applicant_or_attorney", "actual_signing", "CR-400 permits the petitioner/applicant OR attorney to sign. Supply the actual signer's printed name and actual signing date; never generate a signature or require signing before intake verification or purchase.", {
      requiredBeforeFiling: true, blankTreatment: "REQUIRED_BEFORE_FILING", completionObligationId: "cr400-signing",
      conditionDescription: "Complete for the actual signer when executing CR-400 before filing; not an intake or purchase gate.",
    });
  }
  if (name.includes(".LI1[0].")) {
    return result("preparer_from_confirmed_record", "record_section_selection", "CR-400 item 1: check every applicable section from the confirmed case record. The existing review fixture leaves these controls blank; source-bound automatic reuse of the new section facts remains required.", { knownFactBinding: "PENDING_SOURCE_BOUND_SUCCESSOR" });
  }
  throw new Error(`${formNumber}: unclassified Prop64 field ${name}`);
}

export function caProp64ParticipantInstructions(config, fieldMap, { stopConditions = "", heldGuidance = "" } = {}) {
  const writes = fieldMap.writes ?? [];
  const selections = Object.entries(fieldMap.statutorySelectionsByVariant ?? {});
  const escape = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  const table = (rows) => "| Form / page | Printed field | Who completes it | When it applies |\n| --- | --- | --- | --- |\n"
    + rows.map((row) => `| ${row.formNumber} / ${(row.widgets?.[0]?.pageIndex ?? 0) + 1} | ${escape(row.effectiveLabel)} (\`${row.fieldName}\`) | ${row.completionActor} | ${escape(row.reason)} ${escape(row.conditionDescription)} |`).join("\n") + "\n";
  const groups = [
    ["Caption and record information", ["caption_preparation", "represented_filing_only", "record_section_selection"]],
    ["Optional waivers and CR-400 signing", ["explicit_optional_election", "actual_signing"]],
    ["CR-401: the actual server's entries", ["actual_service"]],
    ["Court-only entries", ["court_assignment", "judicial_action"]],
  ];
  // Keep the existing source-backed filing/fee sections. Replace only the adult
  // service paragraph, which previously assigned the server's acts to the party.
  const serviceHeading = "## Who you must serve, and by when";
  const feeHeading = "## What this costs";
  const start = heldGuidance.indexOf(serviceHeading);
  const end = heldGuidance.indexOf(feeHeading, start);
  if (start < 0 || end < 0) throw new Error("Prop64 held filing/service/fee guidance changed; review before updating it");
  const service = `${serviceHeading}\n\nArrange service on the prosecuting agency and file CR-401 proof of service. CR-401 is completed by the person who actually serves the papers, who must be over the age of 18 and not a party. The form provides personal-service and mail-service declarations; the server records only what actually happened. Confirm the applicable method, timing and local filing practice with the Superior Court in the county of conviction.\n\nThe caption may be prepared from known facts before service. The server completes the actual service details and signs the declaration after service; the participant does not sign as the server. Court-use-only date, time and department remain for the court.\n\n`;
  heldGuidance = heldGuidance.slice(0, start) + service + heldGuidance.slice(end);
  return `# Participant and reviewer instructions — Proposition 64 adult CR-400 / CR-401 / CR-403\n\n`
    + `These are review fixtures, not approved filing packets. This correction assigns the existing fields to their proper actors. Qualified legal review, source-bound reuse of remaining known facts and final participant-language review remain open.\n\n`
    + config.routeKeys.map((route) => `- Route scope: \`${route}\``).join("\n") + "\n\n"
    + `## What the current fixtures fill\n\n`
    + `The current field map writes exactly ${writes.length} fields: ${writes.map((row) => `\`${row.factId}\` on ${row.formNumber}`).join(", ")}. It does not fill date of birth, other contact details or every recorded offense fact. Remaining known facts must be bound through a reviewed successor; this guide does not claim they were printed.\n\n`
    + selections.map(([variant, rows]) => `- \`${variant}\`: ${rows.length} route controls, ${rows.map((row) => `\`${row.fieldName}\``).join(", ")}.`).join("\n") + "\n\n"
    + `Check the printed branch against your case. Item 1 asks for every applicable statute section. Items 3 and 4 are separate optional waivers: leave each unchecked unless you affirmatively choose to give up that particular right. A waiver is not required to finish intake or buy a packet.\n\n`
    + `## Who completes each form\n\n`
    + `- **CR-400:** The petitioner/applicant or attorney prepares the request and signs and dates the signature block when actually signing. The combined attorney-or-party caption also applies to a self-represented filer. State Bar number, law firm and attorney-for fields apply to a lawyer.\n`
    + `- **CR-401:** A preparer may fill the neutral caption from known facts. The actual adult nonparty server completes applicable service details and signs the declaration after serving. Do not fill mail-only details for personal service or claim both mailing alternatives.\n`
    + `- **CR-403:** A preparer may supply the neutral case caption. Leave judicial findings, grants or denials, relief selections, sentence, supervision, sealing, date and signature for the court. The current fixtures leave this form unchanged.\n`
    + `- **Every form:** Court-use-only hearing date, time and department belong to the court. A blank court field is not an instruction to invent an answer.\n\n`
    + `The tables identify fields and their actors. They are not a claim that every blank is mandatory in every case. Complete only applicable entries; do not invent missing facts, service, signatures or legal consent.\n\n`
    + stopConditions + heldGuidance + "\n"
    + groups.map(([title, stages]) => `## ${title}\n\n${table(fieldMap.refusals.filter((row) => stages.includes(row.completionStage)))}`).join("\n");
}
