import { spawnSync } from "node:child_process";
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

loadLocalEnv();

const requiredFiles = [
  "reference/illinois/Illinois-Expungement-Sealing-Agent-Reference.pdf",
  "reference/illinois/il-expungement-companion-forms.html",
  "src/lib/rcap/state-packs/illinois/eligibility-rules.ts",
  "src/lib/rcap/state-packs/illinois/pathways.ts",
  "src/lib/rcap/state-packs/illinois/waiting-periods.ts",
  "src/lib/rcap/state-packs/illinois/disqualifying-offenses.ts",
  "src/lib/rcap/state-packs/illinois/required-fields.ts",
  "src/lib/rcap/state-packs/illinois/filing-instructions.ts",
  "src/lib/rcap/state-packs/illinois/fee-notes.ts",
  "src/lib/rcap/state-packs/illinois/court-routing.ts",
  "src/lib/rcap/state-packs/illinois/county-court-instructions.ts",
  "src/lib/rcap/state-packs/illinois/document-types.ts",
  "src/lib/rcap/state-packs/illinois/safety-language.ts",
  "src/lib/rcap/state-packs/illinois/clean-slate-transition.ts",
  "src/lib/rcap/state-packs/illinois/sample-data.ts",
  "src/lib/rcap/documents/illinois/field-mapper.ts",
  "src/lib/rcap/documents/illinois/generator.ts",
  "src/lib/rcap/documents/illinois/repository.ts",
  "src/components/rcap/documents/illinois/IllinoisDocumentPacketPreview.tsx",
  "src/components/rcap/documents/DocumentPacketActions.tsx",
  "src/app/documents/[partnerSlug]/form/IllinoisPetitionInformationForm.tsx",
  "src/app/api/rcap/documents/illinois/create/route.ts",
  "src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts",
  "src/lib/rcap/documents/packet-pdf.ts",
  "supabase/phase-19i-illinois-document-generator.sql",
  "docs/state-packs/ILLINOIS_RCAP_KNOWLEDGE_PACK.md",
  "docs/PHASE_19I_ILLINOIS_DOCUMENT_GENERATOR.md",
  "docs/reference/illinois/README.md"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(rootDir, file))) failures.push(`Missing Phase 19I file: ${file}.`);
}

const questionsSource = readSource("src/lib/rcap-intake/questions.ts");
const summarySource = readSource("src/lib/rcap-intake/pathway-summary.ts");
const intakeClientSource = readSource("src/app/intake/[partnerSlug]/RcapWilmaIntakeChat.tsx");
const generatorSource = readSource("src/lib/rcap/documents/illinois/generator.ts");
const mapperSource = readSource("src/lib/rcap/documents/illinois/field-mapper.ts");
const repositorySource = readSource("src/lib/rcap/documents/illinois/repository.ts");
const routeSource = readSource("src/app/api/rcap/documents/illinois/create/route.ts");
const formSource = readSource("src/app/documents/[partnerSlug]/form/page.tsx") + readSource("src/app/documents/[partnerSlug]/form/IllinoisPetitionInformationForm.tsx");
const previewSource = readSource("src/components/rcap/documents/illinois/IllinoisDocumentPacketPreview.tsx");
const migrationSource = readSource("supabase/phase-19i-illinois-document-generator.sql");
const docsSource = readSource("docs/PHASE_19I_ILLINOIS_DOCUMENT_GENERATOR.md") + readSource("docs/state-packs/ILLINOIS_RCAP_KNOWLEDGE_PACK.md");
const dashboardSource = readSource("src/app/dashboard/partners/page.tsx") + readSource("src/app/dashboard/partners/[partnerSlug]/page.tsx") + readSource("src/app/internal/partners/admin/page.tsx");
const packagesSource = readSource("src/lib/partners/packages.ts");
const dashboardDataSource = readSource("src/lib/partner-dashboard-data.ts");
const pdfRouteSource = readSource("src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts");
const pdfRendererSource = readSource("src/lib/rcap/documents/packet-pdf.ts");
const pdfActionsSource = readSource("src/components/rcap/documents/DocumentPacketActions.tsx");

if (!pdfRouteSource.includes("renderRcapPacketPdf") || !pdfRouteSource.includes('pdfType !== "full"') || !pdfRouteSource.includes('pdfType !== "court"')) {
  failures.push("Illinois packet PDF download route is missing full/court PDF support.");
}
if (!pdfRendererSource.includes("Full LegalEase Packet PDF") || !pdfRendererSource.includes("renderCourtTemplatePacketHtml") || !pdfRendererSource.includes("il-expungement-companion-forms.html")) {
  failures.push("Illinois packet PDF renderer is missing full/court packet language.");
}
if (!pdfActionsSource.includes("Full LegalEase PDF") || !pdfActionsSource.includes("Court Filing PDF") || !previewSource.includes("DocumentPacketActions")) {
  failures.push("Illinois document preview is missing PDF download actions.");
}

if (!questionsSource.includes("illinoisIntakeIntro") || !questionsSource.includes("illinoisCaseOutcomeOptions") || !summarySource.includes("possible_expungement_path")) {
  failures.push("Wilma Illinois branch is missing.");
}

if (!(questionsSource + intakeClientSource).includes("RAP sheet") || !summarySource.includes("needs_rap_sheet") || !formSource.includes("Illinois criminal history report")) {
  failures.push("RAP sheet readiness step is missing.");
}

for (const signal of ["expungement_non_conviction", "expungement_supervision_or_qualified_probation", "sealing_conviction", "excluded_or_needs_review"]) {
  if (!mapperSource.includes(signal) && !generatorSource.includes(signal)) failures.push(`Missing Illinois path: ${signal}.`);
}

for (const documentType of ["illinois_request_to_expungeseal_packet", "illinois_case_list", "illinois_additional_arrests_expungement", "illinois_additional_arrests_sealing", "illinois_order_granting_placeholder", "illinois_order_denying_reference", "illinois_notice_of_filing_placeholder", "illinois_fee_waiver_instructions"]) {
  if (!migrationSource.includes(documentType) && !readSource("src/lib/rcap/state-packs/illinois/document-types.ts").includes(documentType)) failures.push(`Missing Illinois document type: ${documentType}.`);
}

if (!routeSource.includes("createIllinoisDocumentPacket") || !readSource("src/app/documents/[partnerSlug]/form/page.tsx").includes("IllinoisPetitionInformationForm")) {
  failures.push("Illinois document routes or form support are missing.");
}

if (!formSource.includes("Save for later") || !repositorySource.includes("rcap_document_packet_inputs") || !repositorySource.includes("upsertBriefcaseItem")) {
  failures.push("Illinois save-and-resume or Briefcase path is missing.");
}
if (!repositorySource.includes("buildFilingNextStepsPacket(packet)")) {
  failures.push("Illinois persisted Briefcase packet reconstruction does not preserve filing next steps.");
}

if (!readSource("src/app/briefcase/page.tsx").includes("Your Briefcase") || !readSource("src/app/sign-in/page.tsx").includes("Sign in")) {
  failures.push("Briefcase/auth foundation is missing.");
}

if (!readSource("src/lib/security/rcap-captcha.ts").includes("ENABLE_RCAP_CAPTCHA") || !readSource(".env.example").includes("ENABLE_RCAP_CAPTCHA=false")) {
  failures.push("CAPTCHA readiness is missing or not disabled by default.");
}

if (!readSource("src/lib/rcap/state-packs/illinois/county-court-instructions.ts").includes("Circuit Court") || !generatorSource.includes("countyCourtInstructions")) {
  failures.push("Illinois county/court instructions are missing.");
}

if (!readSource("src/lib/rcap/state-packs/illinois/clean-slate-transition.ts").includes("2029") || !generatorSource.includes("illinoisCleanSlateTransition.warning")) {
  failures.push("Clean Slate automatic sealing is not future-dated.");
}

if (/\bssn\b/i.test(generatorSource + formSource + routeSource + repositorySource + migrationSource) && !generatorSource.includes("[SENSITIVE IDENTIFIER TO BE ADDED BY PETITIONER IF REQUIRED]") && !migrationSource.includes("No SSN")) {
  failures.push("SSN collection appears to be enabled.");
}

if (/Georgia|Maryland|Pennsylvania|District of Columbia|California|Ohio|New York/.test(generatorSource + mapperSource + repositorySource)) {
  failures.push("Unsupported states appear in Illinois generator path.");
}

if (/expungement\.ai|consumer-facing/i.test(generatorSource + mapperSource + repositorySource + routeSource + formSource)) {
  failures.push("Illinois generator depends on Expungement.ai naming or routing.");
}

if (/You are eligible|You qualify|This is ready to file|Guaranteed expungement|Guaranteed sealing|We guarantee/i.test(generatorSource + previewSource + formSource)) {
  failures.push("Unsafe eligibility or outcome guarantee language appears.");
}

if (!previewSource.includes("DocumentPacketActions") || !pdfActionsSource.includes("Print") || !pdfActionsSource.includes("Full LegalEase PDF") || !pdfActionsSource.includes("Court Filing PDF") || !previewSource.includes("FilingNextStepsPacketPreview")) {
  failures.push("Illinois document preview is not print-friendly/export-ready.");
}

if (!dashboardSource.includes("Illinois") || !dashboardSource.includes("MS/IL")) {
  failures.push("Partner dashboard/admin document activity does not include Illinois.");
}

if (!readSource("src/lib/rcap/documents/mississippi/generator.ts").includes("Mississippi") || !readSource("src/lib/rcap/documents/mississippi/repository.ts").includes("Document generation for this state is not available yet.")) {
  failures.push("Mississippi generator was not preserved.");
}

if (!docsSource.includes("Illinois-only") || !docsSource.includes("RAP sheet") || !docsSource.includes("Clean Slate") || !docsSource.includes("Briefcase")) {
  failures.push("Phase 19I docs are incomplete.");
}

if (!packagesSource.includes("Full Access Program")) failures.push("Full Access Program public naming is missing.");
for (const banned of ["StartApart", "ClaimCoach"]) {
  if (dashboardDataSource.includes(banned)) failures.push(`${banned} appears in dashboard modules.`);
}

const envLocalTracked = isGitTracked(".env.local");
if (envLocalTracked) failures.push(".env.local is tracked by git.");
const trackedSecretsFound = trackedSecretsAppearInTrackedFiles();
if (trackedSecretsFound) failures.push("Stripe, Supabase, Resend, CAPTCHA, auth, or AI provider secret values appear in tracked files.");

try {
  const { generateIllinoisDocumentDraft } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/illinois/generator.ts"));
  const { renderRcapPacketPdfHtml } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/packet-pdf.ts"));
  const expungement = generateIllinoisDocumentDraft(baseSession({ caseOutcome: "dismissed", recordType: "charged_not_convicted" }), { hasRapSheet: true });
  const sealing = generateIllinoisDocumentDraft(baseSession({ caseOutcome: "convicted", recordType: "past_conviction" }), { hasRapSheet: true, excludedOffenseSignal: false, sentenceTerminationDate: "2022" });
  const needsReview = generateIllinoisDocumentDraft(baseSession({ caseOutcome: "convicted", recordType: "past_conviction" }), { excludedOffenseSignal: true });
  if (expungement.remedyType !== "expungement" || !expungement.documentTypes.includes("illinois_case_list")) failures.push("Illinois expungement generation failed.");
  if (sealing.remedyType !== "sealing" || !sealing.documentTypes.includes("illinois_additional_arrests_sealing")) failures.push("Illinois sealing generation failed.");
  if (needsReview.eligibilitySignal !== "excluded_or_blocked_review_needed") failures.push("Illinois needs-review generation failed.");
  if (!expungement.safetyDisclaimer.includes("not legal advice") || !expungement.draftPlainText.includes("[SENSITIVE IDENTIFIER TO BE ADDED BY PETITIONER IF REQUIRED]")) failures.push("Illinois output is missing safety disclaimer or sensitive placeholder.");
  if (!validNextStepsPacket(expungement, ["Where to file:", "How to file:", "Fee waiver", "60-day window", "Confirm before filing", "not legal advice"], ["$150", "Criminal Motion Seal Team", "Court of Common Pleas", "PATCH report", "$132-$215", "Workflow gap"])) failures.push("Illinois final Next Steps for Filing packet is incomplete.");
  const courtPdfHtml = renderRcapPacketPdfHtml(packetFromResult(expungement), "court");
  const fullPdfHtml = renderRcapPacketPdfHtml(packetFromResult(expungement), "full");
  if (!courtPdfHtml.includes("Case List for Request to Expunge and/or Seal Criminal Records") || !courtPdfHtml.includes("ATJ 2902.1") || !courtPdfHtml.includes("Illinois Supreme Court")) failures.push("Illinois court-facing PDF does not use the Illinois companion form template.");
  if (courtPdfHtml.includes("Full LegalEase Packet PDF") || courtPdfHtml.includes("LegalEase</span>")) failures.push("Illinois court-facing PDF includes LegalEase cover/marketing content.");
  if (/D\.C\. Code|Pa\.R\.Crim\.P\. 790|HARRIS COUNTY, TEXAS|Miss\. Code Ann/.test(courtPdfHtml)) failures.push("Another jurisdiction template leaked into the Illinois court-facing PDF.");
  if (!fullPdfHtml.includes("Full LegalEase Packet PDF") || !fullPdfHtml.includes("ATJ 2902.1")) failures.push("Illinois Full LegalEase PDF does not keep branded guidance separate from court-facing pages.");
} catch (error) {
  failures.push(`Unable to execute Illinois generator: ${error instanceof Error ? error.message : String(error)}.`);
}

function packetFromResult(result) {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    partnerSlug: "demo-partner",
    state: "IL",
    county: result.fields.county,
    documentType: result.documentTypes[0],
    pathway: result.pathway,
    status: result.status,
    petitionerFirstName: result.fields.petitionerFirstName,
    petitionerLastName: result.fields.petitionerLastName,
    causeNumber: result.fields.caseOrArrestNumber,
    charge: result.fields.charge,
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
  console.error("Illinois document generator verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Illinois document generator verification passed.");
console.log("State knowledge pack: configured");
console.log("Wilma Illinois branch: configured");
console.log("RAP sheet readiness: configured");
console.log("Document generator: Illinois only");
console.log("Remedy paths: expungement, sealing, needs review");
console.log("Document form: configured");
console.log("Save and resume: configured");
console.log("Briefcase: configured");
console.log("CAPTCHA readiness: configured");
console.log("County/court instructions: configured");
console.log("Clean Slate automatic sealing: future-dated");
console.log("Document preview: configured");
console.log("Safety disclaimer: configured");
console.log("Eligibility guarantees: blocked");
console.log("SSN collection: disabled");
console.log("Expungement.ai dependency: none");
console.log("Mississippi generator: preserved");
console.log(`.env.local tracked: ${envLocalTracked ? "yes" : "no"}`);
console.log(`Tracked secrets found: ${trackedSecretsFound ? "yes" : "no"}`);
console.log("Dashboard product boundary: record-clearing only");

function baseSession(overrides) {
  return { id: "00000000-0000-0000-0000-000000000000", partnerSlug: "demo-partner", status: "completed", currentStep: "completed", state: "Illinois", county: "Cook", userFirstName: "Sample", userLastName: "Person", chargeOrCaseType: "Sample charge", hasDocuments: true, needsRecordCheck: false, legalDisclaimerAccepted: true, ...overrides };
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

function trackedSecretsAppearInTrackedFiles() {
  const secretValues = [process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET, process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.RESEND_API_KEY, process.env.TURNSTILE_SECRET_KEY, process.env.INTERNAL_ADMIN_ACCESS_TOKEN, process.env.PARTNER_PREVIEW_ACCESS_TOKEN, process.env.OPENAI_API_KEY, process.env.ANTHROPIC_API_KEY].filter((value) => typeof value === "string" && value.length > 0);
  if (secretValues.length === 0) return false;
  for (const file of getTrackedFiles()) {
    const absolutePath = path.join(rootDir, file);
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) continue;
    const content = fs.readFileSync(absolutePath);
    for (const secret of secretValues) if (content.includes(Buffer.from(secret))) return true;
  }
  return false;
}

function getTrackedFiles() {
  return (spawnSync("git", ["ls-files", "-z"], { cwd: rootDir, encoding: "utf8" }).stdout ?? "").split("\0").filter(Boolean);
}

function isGitTracked(filePath) {
  return spawnSync("git", ["ls-files", "--error-unmatch", filePath], { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).status === 0;
}

function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && !process.env[key]) process.env[key] = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
  }
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
