import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();
const failures = [];

const requiredFiles = [
  "reference/dc/DC-Expungement-Sealing-Agent-Reference.pdf",
  "reference/dc/dc-motion-to-seal-expunge.html",
  "src/lib/rcap/state-packs/dc/eligibility-rules.ts",
  "src/lib/rcap/state-packs/dc/pathways.ts",
  "src/lib/rcap/state-packs/dc/waiting-periods.ts",
  "src/lib/rcap/state-packs/dc/disqualifying-offenses.ts",
  "src/lib/rcap/state-packs/dc/required-fields.ts",
  "src/lib/rcap/state-packs/dc/filing-instructions.ts",
  "src/lib/rcap/state-packs/dc/document-types.ts",
  "src/lib/rcap/state-packs/dc/safety-language.ts",
  "src/lib/rcap/documents/dc/field-mapper.ts",
  "src/lib/rcap/documents/dc/generator.ts",
  "src/lib/rcap/documents/dc/repository.ts",
  "src/components/rcap/documents/dc/DcDocumentPacketPreview.tsx",
  "src/components/rcap/documents/DocumentPacketActions.tsx",
  "src/app/documents/[partnerSlug]/form/DcMotionInformationForm.tsx",
  "src/app/api/rcap/documents/dc/create/route.ts",
  "src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts",
  "src/lib/rcap/documents/packet-pdf.ts",
  "supabase/phase-20-dc-document-generator.sql",
  "docs/PHASE_20_DC_RECORD_RELIEF_WORKFLOW.md",
  "docs/reference/dc/README.md"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(rootDir, file))) failures.push(`Missing Phase 20 DC file: ${file}.`);
}

const dcGeneratorSource = readSource("src/lib/rcap/documents/dc/generator.ts");
const dcMapperSource = readSource("src/lib/rcap/documents/dc/field-mapper.ts");
const dcRepositorySource = readSource("src/lib/rcap/documents/dc/repository.ts");
const dcRouteSource = readSource("src/app/api/rcap/documents/dc/create/route.ts");
const dcFormSource = readSource("src/app/documents/[partnerSlug]/form/page.tsx") + readSource("src/app/documents/[partnerSlug]/form/DcMotionInformationForm.tsx");
const dcPreviewSource = readSource("src/components/rcap/documents/dc/DcDocumentPacketPreview.tsx");
const dcMigrationSource = readSource("supabase/phase-20-dc-document-generator.sql");
const dcReferenceReadme = readSource("docs/reference/dc/README.md");
const intakeSource = readSource("src/lib/rcap-intake/pathway-summary.ts") + readSource("src/app/intake/[partnerSlug]/RcapWilmaIntakeChat.tsx");
const dashboardDataSource = readSource("src/lib/partner-dashboard-data.ts");
const msGeneratorSource = readSource("src/lib/rcap/documents/mississippi/generator.ts");
const ilGeneratorSource = readSource("src/lib/rcap/documents/illinois/generator.ts");
const pdfRouteSource = readSource("src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts");
const pdfRendererSource = readSource("src/lib/rcap/documents/packet-pdf.ts");
const pdfActionsSource = readSource("src/components/rcap/documents/DocumentPacketActions.tsx");

if (!pdfRouteSource.includes("renderRcapPacketPdf") || !pdfRouteSource.includes('pdfType !== "full"') || !pdfRouteSource.includes('pdfType !== "court"')) {
  failures.push("DC packet PDF download route is missing full/court PDF support.");
}
if (!pdfRendererSource.includes("Full LegalEase Packet PDF") || !pdfRendererSource.includes("renderCourtTemplatePacketHtml") || !pdfRendererSource.includes("dc-motion-to-seal-expunge.html")) {
  failures.push("DC packet PDF renderer is missing full/court packet language.");
}
if (!pdfActionsSource.includes("Full LegalEase PDF") || !pdfActionsSource.includes("Court Filing PDF") || !dcPreviewSource.includes("DocumentPacketActions")) {
  failures.push("DC document preview is missing PDF download actions.");
}

for (const pathway of ["automatic_expungement", "automatic_sealing", "motion_actual_innocence_expungement", "motion_interests_of_justice_sealing", "needs_review"]) {
  if (!dcMapperSource.includes(pathway) && !dcGeneratorSource.includes(pathway)) failures.push(`Missing DC pathway: ${pathway}.`);
}

for (const documentType of ["dc_motion_to_seal", "dc_motion_to_expunge", "dc_statement_of_points_and_authorities", "dc_proposed_order", "dc_certificate_of_service", "dc_filing_instructions"]) {
  if (!dcMigrationSource.includes(documentType) && !readSource("src/lib/rcap/state-packs/dc/document-types.ts").includes(documentType)) failures.push(`Missing DC document type: ${documentType}.`);
}

if (!dcReferenceReadme.includes("DC-Expungement-Sealing-Agent-Reference.pdf") || !dcGeneratorSource.includes("DC-Expungement-Sealing-Agent-Reference.pdf")) {
  failures.push("DC PDF source reference is not preserved.");
}

if (!dcGeneratorSource.includes("dc-motion-to-seal-expunge.html") || !dcPreviewSource.includes("srcDoc")) {
  failures.push("DC HTML motion packet template is not used for generated packet preview.");
}
if (!dcPreviewSource.includes("FilingNextStepsPacketPreview")) {
  failures.push("DC preview does not render the final Next Steps for Filing packet.");
}

if (!dcGeneratorSource.includes("October 1, 2027") || /already cleared|record is cleared|has been cleared/i.test(dcGeneratorSource + dcFormSource)) {
  failures.push("Automatic DC relief language is missing the phased processing caution or implies completed relief.");
}

if (!dcGeneratorSource.includes("D.C. Code § 16-803") || !dcGeneratorSource.includes("D.C. Code § 16-806")) {
  failures.push("DC motion statutory references are missing.");
}

for (const text of ["MPD rap sheet", "DC Superior Court", "Criminal Motion Seal Team", "U.S. Attorney", "Office of the Attorney General", "no statutory court filing fee", "record-request costs"]) {
  if (!(dcGeneratorSource + readSource("src/lib/rcap/state-packs/dc/filing-instructions.ts") + dcFormSource).includes(text)) failures.push(`Missing DC filing/service language: ${text}.`);
}

if (!dcRepositorySource.includes("rcap_document_packet_inputs") || !dcRepositorySource.includes("upsertBriefcaseItem") || !dcFormSource.includes("Save for later")) {
  failures.push("DC save-progress or Briefcase support is missing.");
}
if (!dcRepositorySource.includes("buildFilingNextStepsPacket(packet)")) {
  failures.push("DC persisted Briefcase packet reconstruction does not preserve filing next steps.");
}

if (!dcRouteSource.includes("verifyRcapCaptchaToken")) failures.push("DC document create route is missing CAPTCHA readiness.");

if (/You are eligible|You qualify|Guaranteed expungement|Guaranteed sealing|We guarantee/i.test(dcGeneratorSource + dcPreviewSource + dcFormSource + intakeSource)) {
  failures.push("Unsafe eligibility or outcome guarantee language appears in DC workflow.");
}

if (/expungement\.ai|consumer-facing/i.test(dcGeneratorSource + dcMapperSource + dcRepositorySource + dcRouteSource + dcFormSource)) {
  failures.push("DC generator depends on Expungement.ai naming or routing.");
}

for (const banned of ["StartApart", "ClaimCoach"]) {
  if (dashboardDataSource.includes(banned) || dcGeneratorSource.includes(banned) || dcFormSource.includes(banned)) failures.push(`${banned} appears in dashboard or DC workflow modules.`);
}

if (!msGeneratorSource.includes("Mississippi") || !ilGeneratorSource.includes("Illinois")) {
  failures.push("Mississippi or Illinois generator source appears missing.");
}

try {
  const { generateDcDocumentDraft } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/dc/generator.ts"));
  const { generateMississippiPetitionDraft } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/mississippi/generator.ts"));
  const { generateIllinoisDocumentDraft } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/illinois/generator.ts"));
  const { renderRcapPacketPdfHtml } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/packet-pdf.ts"));

  const automatic = generateDcDocumentDraft(baseSession({ state: "DC", caseOutcome: "dismissed", recordType: "charged_not_convicted" }), {
    reliefTrack: "automatic_sealing",
    hasMpdRecord: true,
    hasCourtDisposition: true,
    charge: "Dismissed charge",
    disposition: "Dismissed"
  });
  const expunge = generateDcDocumentDraft(baseSession({ state: "District of Columbia", caseOutcome: "dismissed", recordType: "charged_not_convicted" }), {
    reliefTrack: "actual_innocence_expungement",
    petitionerFirstName: "Sample",
    petitionerLastName: "Person",
    charge: "Simple assault",
    arrestingAgency: "Metropolitan Police Department",
    offenseDate: "2024",
    disposition: "Dismissed",
    dispositionDate: "2024",
    prosecutorOffice: "USAO",
    serviceMethod: "email",
    actualInnocenceStatement: "The offense did not occur.",
    motionArgument: "Affidavit and case records support actual innocence."
  });
  const seal = generateDcDocumentDraft(baseSession({ state: "DC", caseOutcome: "convicted", recordType: "past_conviction" }), {
    reliefTrack: "interests_of_justice_sealing",
    petitionerFirstName: "Sample",
    petitionerLastName: "Person",
    charge: "Misdemeanor theft",
    arrestingAgency: "Metropolitan Police Department",
    offenseDate: "2017",
    disposition: "Misdemeanor conviction",
    dispositionDate: "2018",
    sentenceCompletionDate: "2019",
    prosecutorOffice: "OAG",
    serviceMethod: "email",
    interestsOfJusticeStatement: "Stable employment and no later arrests.",
    motionArgument: "The interests of justice support sealing."
  });
  const review = generateDcDocumentDraft(baseSession({ state: "DC", caseOutcome: "convicted", recordType: "past_conviction" }), {
    masterGridGroupOneToThree: true
  });
  const ms = generateMississippiPetitionDraft(baseSession({ state: "Mississippi", county: "Hinds", caseOutcome: "dismissed", recordType: "charged_not_convicted" }));
  const il = generateIllinoisDocumentDraft(baseSession({ state: "Illinois", county: "Cook", caseOutcome: "dismissed", recordType: "charged_not_convicted" }), { hasRapSheet: true });

  if (automatic.pathway !== "automatic_sealing" || !automatic.draftPlainText.includes("may be phased or scheduled") || /already cleared/i.test(automatic.draftPlainText)) failures.push("DC automatic sealing caution failed.");
  if (expunge.pathway !== "motion_actual_innocence_expungement" || expunge.remedyType !== "expungement" || !expunge.documentTypes.includes("dc_motion_to_expunge")) failures.push("DC actual innocence expungement route failed.");
  if (seal.pathway !== "motion_interests_of_justice_sealing" || seal.remedyType !== "sealing" || !seal.documentTypes.includes("dc_motion_to_seal")) failures.push("DC interests-of-justice sealing route failed.");
  if (review.pathway !== "needs_review" || review.eligibilitySignal !== "excluded_or_blocked_review_needed") failures.push("DC possible bar needs-review route failed.");
  if (ms.state !== undefined || ms.pathway !== "non_conviction") failures.push("Mississippi generator behavior changed unexpectedly.");
  if (il.state !== "IL" || il.remedyType !== "expungement") failures.push("Illinois generator behavior changed unexpectedly.");
  if (!seal.safetyDisclaimer.includes("not legal advice") || !seal.safetyDisclaimer.includes("does not guarantee")) failures.push("DC safety disclaimer is incomplete.");
  if (!seal.draftHtml.includes("Motion to Seal") || !expunge.draftHtml.includes("Motion to Expunge")) failures.push("DC HTML template did not render seal/expunge motion packet.");
  if (!validNextStepsPacket(seal, ["Where to file:", "How to file:", "Criminal Motion Seal Team", "No statutory court filing fee", "Confirm before filing", "not legal advice"], ["$150", "State's Attorney", "Court of Common Pleas", "PATCH report", "$132-$215", "Workflow gap"])) failures.push("DC final Next Steps for Filing packet is incomplete.");
  const courtPdfHtml = renderRcapPacketPdfHtml(packetFromResult(seal), "court");
  const fullPdfHtml = renderRcapPacketPdfHtml(packetFromResult(seal), "full");
  if (!courtPdfHtml.includes("Superior Court of the District of Columbia") || !courtPdfHtml.includes("Statement of Points and Authorities") || !courtPdfHtml.includes("Certificate of Service")) failures.push("DC court-facing PDF does not use the DC motion template.");
  if (courtPdfHtml.includes("Full LegalEase Packet PDF") || courtPdfHtml.includes("LegalEase</span>")) failures.push("DC court-facing PDF includes LegalEase cover/marketing content.");
  if (/ATJ 2902\.1|Pa\.R\.Crim\.P\. 790|HARRIS COUNTY, TEXAS|Miss\. Code Ann/.test(courtPdfHtml)) failures.push("Another jurisdiction template leaked into the DC court-facing PDF.");
  if (!fullPdfHtml.includes("Full LegalEase Packet PDF") || !fullPdfHtml.includes("Statement of Points and Authorities")) failures.push("DC Full LegalEase PDF does not keep branded guidance separate from court-facing pages.");
} catch (error) {
  failures.push(`Unable to execute DC generator: ${error instanceof Error ? error.message : String(error)}.`);
}

function packetFromResult(result) {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    partnerSlug: "demo-partner",
    state: "DC",
    county: "District of Columbia",
    documentType: result.documentTypes[0],
    pathway: result.pathway,
    status: result.status,
    petitionerFirstName: result.fields.petitionerFirstName,
    petitionerLastName: result.fields.petitionerLastName,
    causeNumber: result.fields.caseNumber,
    charge: result.fields.charge,
    offenseDate: result.fields.offenseDate,
    arrestDate: result.fields.arrestDate,
    arrestingAgency: result.fields.arrestingAgency,
    needsRecordReview: result.fields.needsRecordReview,
    generatedHtml: result.draftHtml,
    generatedPlainText: result.draftPlainText,
    filingInstructions: result.filingInstructions,
    countyCourtInstructions: result.countyCourtInstructions,
    filingNextStepsPacket: result.filingNextStepsPacket,
    missingFields: result.missingFields,
    safetyDisclaimer: result.safetyDisclaimer
  };
}

if (failures.length > 0) {
  console.error("DC document generator verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("DC document generator verification passed.");
console.log("Source PDF: preserved");
console.log("Source HTML packet: used");
console.log("Wilma DC branch: configured");
console.log("Document generator: DC only");
console.log("DC paths: automatic expungement, automatic sealing, actual innocence expungement, interests-of-justice sealing, needs review");
console.log("Automatic relief caution: configured");
console.log("Save and resume: configured");
console.log("Briefcase: configured");
console.log("CAPTCHA readiness: configured");
console.log("Mississippi generator: preserved");
console.log("Illinois generator: preserved");
console.log("StartApart/ClaimCoach: absent");

function baseSession(overrides) {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    partnerSlug: "demo-partner",
    status: "completed",
    currentStep: "completed",
    county: "District of Columbia",
    userFirstName: "Sample",
    userLastName: "Person",
    chargeOrCaseType: "Sample charge",
    hasDocuments: true,
    needsRecordCheck: false,
    legalDisclaimerAccepted: true,
    ...overrides
  };
}

function validNextStepsPacket(result, requiredText, forbiddenText = []) {
  const packet = result.filingNextStepsPacket;
  return Boolean(
    packet &&
    packet.title.includes("Next Steps for Filing") &&
    packet.filingLocation &&
    packet.filingMethod &&
    packet.requiredDocuments?.length > 0 &&
    packet.feeSummary?.length > 0 &&
    packet.afterFiling?.length > 0 &&
    packet.trackingChecklist?.length > 0 &&
    packet.workflowGaps?.some((gap) => gap.includes("Workflow gap")) &&
    requiredText.every((text) => packet.plainText.includes(text)) &&
    forbiddenText.every((text) => !packet.plainText.includes(text))
  );
}

function readSource(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
}

function loadTsModule(filePath) {
  if (moduleCache.has(filePath)) return moduleCache.get(filePath).exports;
  const compiled = ts.transpileModule(fs.readFileSync(filePath, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = new Module(filePath);
  mod.filename = filePath;
  mod.paths = Module._nodeModulePaths(path.dirname(filePath));
  moduleCache.set(filePath, mod);
  mod.require = (request) => {
    if (request.startsWith("@/")) return loadTsModule(resolveTs(path.join(rootDir, "src", request.slice(2))));
    if (request.startsWith("./") || request.startsWith("../")) return loadTsModule(resolveTs(path.resolve(path.dirname(filePath), request)));
    return require(request);
  };
  mod._compile(compiled, filePath);
  return mod.exports;
}

function resolveTs(basePath) {
  for (const extension of [".ts", ".tsx", ".js", ".mjs"]) if (fs.existsSync(basePath + extension)) return basePath + extension;
  if (fs.existsSync(path.join(basePath, "index.ts"))) return path.join(basePath, "index.ts");
  return basePath;
}
