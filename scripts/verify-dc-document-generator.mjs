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
  "src/app/documents/[partnerSlug]/form/DcMotionInformationForm.tsx",
  "src/app/api/rcap/documents/dc/create/route.ts",
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
} catch (error) {
  failures.push(`Unable to execute DC generator: ${error instanceof Error ? error.message : String(error)}.`);
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
