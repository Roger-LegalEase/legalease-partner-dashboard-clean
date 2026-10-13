/** Logical source map from the retained official August2026 text extraction.
 * No widget, geometry, binary hash or approval is inferred from this map. */
export const NY_CURRENT_COMPONENTS = [
  { id: "checklist", pages: [1], actor: "applicant", stage: "task_tracking", obligations: ["Actual service, filing and copy retention remain later acts; preparation does not complete them."] },
  { id: "eligibility_overview", pages: [2], actor: "applicant_and_qualified_reviewer", stage: "eligibility_review", obligations: ["Printed assertions do not replace source-grounded eligibility or qualified legal decisions."] },
  { id: "procedure", pages: [3, 4], actor: "applicant_and_actual_server", stage: "filing_instructions", obligations: ["Service precedes filing; identify each actual prosecutor and source-specific proof."] },
  { id: "itemized_instructions", pages: [5, 6, 7, 8, 9], actor: "applicant_from_records", stage: "preparation", obligations: ["Keep case-used aliases, known NYSID, each actual case and all case numbers distinct.", "Prior applications, future intent, required statement and per-case certificate or explanation have separate meanings."] },
  { id: "notice_and_case_table", pages: [10], actor: "applicant", stage: "preparation", obligations: ["Actual filing court/county, applicant, case-used names, known NYSID and covered-case identifiers; no invented venue or case grouping."] },
  { id: "application_history_and_attachments", pages: [11], actor: "applicant", stage: "preparation", obligations: ["Prior and future applications are separate; no granted order does not prove no prior application.", "Certificate for each case or explanation of inability; optional supporting attachments only when actually included.", "The applicant execution block is on page12; this component does not add an execution block."] },
  { id: "required_statement", pages: [12], actor: "applicant_personally", stage: "statement_and_execution", obligations: ["Substantive applicant statement remains required; optional exhibits do not replace it.", "Actual signature, date and affirmation; a typed name does not execute a statement."] },
  { id: "service_affirmation", pages: [13], actor: "actual_server", stage: "actual_service_proof", obligations: ["Actual server must truthfully make the printed over18 declaration.", "Actual date/method, prosecutor county/address and served documents; separate proof per prosecutor without a received stamp.", "Address continuation is not a second recipient. Preserve the literal source's residual affidavit reference pending review."] },
  { id: "additional_statement", pages: [14], actor: "applicant_personally", stage: "conditional_statement_and_execution", obligations: ["Only when a continuation or separate statement is used; no mandatory extra narrative merely because the page exists.", "Each used additional page requires actual execution under the source instructions; qualified granularity review remains pending."] }
] as const;

export const NY_CURRENT_SOURCE_CONTEXT = {
  revision: "08/2026", pageCount: 14,
  url: "https://webfiles.nycourts.gov/public/2026-08/cpl160.59sealingapplication.pdf",
  retainedOfficialTextSha256: "b518e6367e66dc7a26392110ff9c795f4f3470d656e5a96af599c5bcec1b9289",
  binarySha256: null, sourceVerified: false, widgetBindings: null, qualifiedApproval: null,
  historicalGeometryReusable: false
} as const;
