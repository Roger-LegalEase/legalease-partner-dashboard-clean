import assert from "node:assert/strict";

export const NY_16059_ROUTE = "obligation:track-pathway:NY:ny_160_59_petition:discretionary-conviction-sealing-by-petition-under-cpl-160-59";
export const NY_16059_CURRENT_FORM_URL = "https://webfiles.nycourts.gov/public/2026-08/cpl160.59sealingapplication.pdf";
export const NY_16059_HELD_SOURCES = Object.freeze({
  "NY-CPL-160.59-APPLICATION": "73a5eeaf73ed647b9cf6ae786823aaa3cf8b3a7e483ea4aad154d7c2275caae4",
  "NY-CPL-160.59-COD-REQUEST": "68b14570db220ed79aac13a20161ddf807357dc888e524e08a1c17d410762774",
  "NY-CPL-160.59-PRO-SE-PACKET": "cf22b8ea0cb8661c8e3f17cc0f16e6b95ca889f1e994e3772dfaf867b6da0298",
  "NY-CPL-160.59-SEAL-VERIFICATION": "76c0c54ed0a80c8b5b5fddd64e2087b31f9615d5ebe7524ead803352fba3cca3",
});

// Guidance classifications only. They do not grant a typed completeness
// exception without the existing independent source-byte verification.
export function ny16059GuidanceCondition(documentId, field) {
  if (!Object.hasOwn(NY_16059_HELD_SOURCES, documentId)) return null;
  if (documentId === "NY-CPL-160.59-APPLICATION" && field === "Applicant_AKA") return "The retained six-page form asks for any AKA, including a name used on the case. The current and retained pro-se instructions concern names used in the covered case. Preserve that distinction; never invent an alias.";
  if (field === "AKAs") return "List another name only if used in a case covered by the application.";
  if (field === "NYSID") return documentId === "NY-CPL-160.59-APPLICATION"
    ? "The retained six-page instruction does not say if known; the current and retained pro-se instructions do. Resolve the form revision before using this blank; never invent a NYSID."
    : "Supply the NYSID if known; do not invent a number.";
  if (documentId === "NY-CPL-160.59-COD-REQUEST") {
    if (field === "AKA(s)") return "Use an actual applicable alias of the defendant. This is a record fact, not a signature or signing date. Never invent an alias.";
    if (["CourtAddress", "CourtCityStateZip"].includes(field)) return "Use the actual court address, not your home address.";
    if (["IDVNumber", "ArrestNumber", "OrderofProtectionNumber", "CertificateofDispositionNumber", "CriminalJusticeTrackingNumber(CJTN)", "ComplaintNumber", "TicketNumber", "NYSIDNumber", "PartialDocketNumber", "DMVIDNumber", "ArrestDateRangeEnd", "IncidentDateRangeEnd", "Other"].includes(field))
      return "The request asks for any case identifiers if known. Supply applicable known details; a range end applies only when providing a range, not an exact date. Keep arrest and incident dates distinct. Every listed identifier is not required.";
  }
  if (documentId === "NY-CPL-160.59-APPLICATION") {
    if (field === "Motorist_ID") return "The retained application labels this for VTL crimes; use an applicable actual identifier, not a made-up value.";
    if (["Docket_Indictment_SCI_Number_2", "Court_Name_2", "Conviction_Charge_2", "Law_Section_Subsection_2", "Conviction_Date_2", "Sentence_Date_2", "Sentence_Term_2"].includes(field))
      return "Complete the second row only for an additional case included in this application; retain every applicable conviction and its own facts.";
    if (["Release_Date_1", "Release_Date_2"].includes(field)) return "Use the actual release date only when the applicable sentence involved incarceration; do not invent release for a noncustodial sentence or substitute probation/parole completion. A second-row release also requires an actual second covered case.";
    if (/^Attachment_(?:[4-9]|10)$/.test(field)) return "List an additional attachment only when actually included. Optional supporting evidence does not require filling every numbered line.";
    if (["Court_Name", "Conviction_Date", "Sentence_Date"].includes(field)) return "This row concerns a separate future sealing application; complete it only if you actually intend that application.";
    if (field === "County_of") return "Use the actual venue of the service affidavit. Do not substitute the applicant's residence or the prosecuting county without evidence.";
    if (field === "Address_of_DA_2") return "Use the second address line only for actual required recipient-address content. A second printed line does not establish a second prosecutor; keep the real service recipient and event distinct.";
    if (["Address_of_Person_Serving", "Date_of_Service", "Documents_in_Support", "Address_of_DA_1", "Address_of_DA_2"].includes(field))
      return "The actual server records only applicable recipients, documents and completed service. Additional recipient/address space is used only when needed.";
    if (["Law_Section_Subsection_1", "Sentence_Date_1", "Sentence_Term_1"].includes(field)) return "Copy the applicable first case's exact conviction section and sentence facts from its record; never substitute another event or another case.";
  }
  if (documentId === "NY-CPL-160.59-PRO-SE-PACKET") {
    if (["Case Number 2", "Court Name 2"].includes(field)) return "Complete this row only for an additional case included in this application.";
    if (["Case Number 3", "Court Name 3"].includes(field)) return "Complete this future-application row only if you intend to ask to seal that separate case later.";
    if (/^Document (?:[3-9]|10)$/.test(field)) return "List an additional document only when actually included; optional evidence does not make every numbered attachment line mandatory.";
    if (field === "Serve the prosecutor") return "The applicant or actual server performs service; the prosecutor is the recipient. Check this task only after actual service, never merely because papers were prepared.";
    if (field === "Complete the affidavit of service") return "This is a task checkbox. Complete proof after actual service only when stamped in-person proof does not satisfy the source instructions.";
    if (field === "Keep copies for your records") return "This is a reminder to retain copies after filing, not a missing personal fact or a purchase prerequisite.";
    if (["Type of Service", "Server Name", "Server Address", "Service Date"].includes(field)) return "The person who actually serves supplies the actual method, identity, address and date after service; do not infer them from the applicant's contact information.";
  }
  return null;
}

export function ny16059ParticipantGuidance(config, fieldMaps, heldButNotPrinted = []) {
  assert.deepEqual(config.routeKeys, [NY_16059_ROUTE], "NY guidance must remain exact-route scoped");
  assert.deepEqual(Object.fromEntries(config.documents.map(row => [row.documentId, row.sha256])), NY_16059_HELD_SOURCES, "NY retained source contract changed");
  assert.deepEqual(fieldMaps.map(row => row.documentId).sort(), Object.keys(NY_16059_HELD_SOURCES).sort(), "NY retained document inventory changed");
  const fieldCounts = { "NY-CPL-160.59-APPLICATION": 55, "NY-CPL-160.59-COD-REQUEST": 39, "NY-CPL-160.59-PRO-SE-PACKET": 54, "NY-CPL-160.59-SEAL-VERIFICATION": 0 };
  for (const document of fieldMaps) {
    assert.equal(document.fields.length, fieldCounts[document.documentId], "NY retained field inventory changed");
    assert.equal(new Set(document.fields.map(row => row.field)).size, document.fields.length, "NY duplicated field identity");
  }
  const rows = fieldMaps.flatMap(document => document.fields.filter(row => ny16059GuidanceCondition(document.documentId, row.field) !== null || row.blankTreatment === "REQUIRED_BEFORE_FILING")
    .map(row => {
      const condition = ny16059GuidanceCondition(document.documentId, row.field);
      assert.ok(condition, `${document.documentId}/${row.field}: new requirement needs source review`);
      return { document: document.documentId, label: (row.effectiveLabel ?? row.field) + (row.effectiveLabel && row.effectiveLabel !== row.field ? ` (${row.field})` : ""), condition };
    }));
  assert.equal(rows.length, 68, "NY source condition inventory changed; review the affected requirement");
  const escape = value => String(value).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  const groups = [...new Map(rows.map(row => [`${row.document}|${row.condition}`, { document: row.document,
    labels: rows.filter(other => other.document === row.document && other.condition === row.condition).map(other => other.label), condition: row.condition }])).values()];
  const table = groups.map(row => `| ${escape(row.document.replace("NY-CPL-160.59-", ""))} | ${escape([...new Set(row.labels)].join("; "))} | ${escape(row.condition)} |`).join("\n");
  const help = config.selfHelpStop.map(line => line
    .replace("sign, have notarized, serve and file yourself", "sign, complete the applicable affirmation or affidavit, serve and file yourself")
    .replace("District Attorney objection, which turns this into a contested hearing", "District Attorney objection, which may require a hearing when the case is eligible")).join("\n\n");
  return `# Participant and reviewer instructions — CPL 160.59\n\n`
    + `These retained PDFs are historical review fixtures, not approved filing packets. They contain older affidavit and notary blocks. The court now publishes an [August 2026 packet](${NY_16059_CURRENT_FORM_URL}) with signed affirmations and an additional-statement page. The new binary and field mapping are retained for internal review; source-currency review and qualified approvals remain pending. Do not treat the old fixtures as an approved current filing packet.\n\n`
    + `Route scope: \`${NY_16059_ROUTE}\`\n\n`
    + `## Facts and documents for your application\n\n`
    + `Use the actual case number, court, conviction and sentence records for each case. Reuse known answers and correct disagreements; do not substitute arrest, conviction, sentencing and release dates for one another. A second-case or future-application row applies only when that case exists and belongs in that row. Several case numbers do not by themselves establish one criminal transaction. Prior CPL 160.58 orders, incarceration timing and transaction grouping remain subject to their separate record-specific review.\n\n`
    + `The application requires your own reasons for sealing. Do not leave the statement empty or invent rehabilitation facts. Supporting letters and other optional evidence can help but do not make every attachment line mandatory. Reuse an existing certificate of disposition for each case; request one only if needed, or provide the written explanation required by the form if you cannot obtain it. No signature, service event, notarization, certified-copy acquisition or upload becomes an intake or purchase gate merely because a later filing step requires it.\n\n`
    + `Answer prior and intended future applications separately. If you previously applied under CPL 160.58 or 160.59, attach the prior application, including one that was denied or remains pending; prior filing is not by itself a blanket denial. Give future-case details only when you actually intend another application.\n\n`
    + `## Signing and service depend on the actual form revision\n\n`
    + `The August 2026 packet uses signed, dated affirmations by the applicant and actual server. If you use additional pages for your statement, you must affirm, sign and date the last page of your statement. The retained older forms use notarized affidavits; do not remove their jurats or claim that the new form has already replaced these PDFs. Follow the current approved form's execution requirements when it is supplied. Neither execution method permits a fabricated signature or date.\n\n`
    + `Serve a complete copy before filing on each applicable prosecutor. This is usually the District Attorney; use the Attorney General or Special Narcotics Prosecutor when that office prosecuted the case. The applicant or another actual server may mail or personally deliver the papers under the source instructions. The current service affirmation states that the server is "over 18 years of age"; use an actual server who can truthfully make that declaration. Stamped in-person proof can satisfy the stated proof requirement; otherwise the actual server completes proof of service after serving. The current packet directs a separate service affirmation for each prosecutor served. Keep recipients, methods and dates distinct. Court, notary and prosecutor acts remain with their proper actors.\n\n`
    + `The retained six-page application's service instructions permit combined proof unless service occurred on different dates or by different people. The retained pro-se packet and current packet instead direct separate proof for each prosecutor. This source discrepancy remains under review; do not silently combine or substitute proofs across revisions.\n\n`
    + `The source application states a 45-day prosecutor response period. If the case is eligible and opposed, the court schedules a hearing; opposition alone does not establish eligibility. File in one appropriate court, using the most serious conviction or the most recent conviction of equal level as the source instructions direct. Keep copies and actual proof of filing.\n\n`
    + `## Costs and record requests\n\n`
    + `The retained compiled profile records no separate CPL 160.59 motion filing fee. That profile entry is not a new current fee approval. The July 2024 certificate-of-disposition request states $5 outside New York City and $10 in the five boroughs; ask the court about accepted payment methods and applicable fee-exempt or poor-person-order treatment. Do not mark a court-use fee, identity or authorization box yourself. A record-request charge is separate from a motion filing fee. Do not add a universal notary charge to the current affirmation packet.\n\n`
    + `On a certificate request, identify the actual requester. The defendant provides photo ID; a defendant's agent provides the defendant's written authorization. The sealed-case option applies to a defendant or agent who requests it. Name an agency only if actually represented, and choose the actual mail or pickup delivery preference. Do not borrow the defendant's contact details for another requester or mark the court's receipt/verification boxes.\n\n`
    + `## When the retained blanks apply\n\n`
    + `The earlier field inventory labelled these blanks as required before filing. Their source conditions differ. The typed declarations preserve these distinct obligations. The completeness consumer requires exact original source bytes and trusted applicability facts; neither missing source custody nor an unknown condition earns a blank exception. Current-form bindings and source-verified conditional acceptance remain independently owned work. Never fill an inapplicable blank just to complete a checklist.\n\n`
    + `| Retained form | Printed fields | Condition and actor |\n| --- | --- | --- |\n${table}\n\n`
    + (heldButNotPrinted.length ? `The build also reports ${heldButNotPrinted.length} held-but-unprinted entries. Resolve those exact entries in the existing actual-writes report; this guide does not excuse missing known facts.\n\n` : "")
    + `## Where self-help ends\n\n${help}\n\n`
    + `The post-order seal-verification request is used only after an actual sealing order. It is not proof that filing an application sealed the record. Existing legal, source, bilingual and delivery approvals remain pending.\n`;
}
