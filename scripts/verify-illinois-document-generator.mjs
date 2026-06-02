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
  "src/app/documents/[partnerSlug]/form/IllinoisPetitionInformationForm.tsx",
  "src/app/api/rcap/documents/illinois/create/route.ts",
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

if (!previewSource.includes("Print / save PDF") || !previewSource.includes("Illinois Filing Notes")) {
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
if (!packagesSource.includes("STRIPE_PRICE_COUNTY_ACCESS_PROGRAM")) failures.push("Internal STRIPE_PRICE_COUNTY_ACCESS_PROGRAM compatibility is missing.");
for (const banned of ["StartApart", "ClaimCoach"]) {
  if (dashboardDataSource.includes(banned)) failures.push(`${banned} appears in dashboard modules.`);
}

const envLocalTracked = isGitTracked(".env.local");
if (envLocalTracked) failures.push(".env.local is tracked by git.");
const trackedSecretsFound = trackedSecretsAppearInTrackedFiles();
if (trackedSecretsFound) failures.push("Stripe, Supabase, Resend, CAPTCHA, auth, or AI provider secret values appear in tracked files.");

try {
  const { generateIllinoisDocumentDraft } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/illinois/generator.ts"));
  const expungement = generateIllinoisDocumentDraft(baseSession({ caseOutcome: "dismissed", recordType: "charged_not_convicted" }), { hasRapSheet: true });
  const sealing = generateIllinoisDocumentDraft(baseSession({ caseOutcome: "convicted", recordType: "past_conviction" }), { hasRapSheet: true, excludedOffenseSignal: false, sentenceTerminationDate: "2022" });
  const needsReview = generateIllinoisDocumentDraft(baseSession({ caseOutcome: "convicted", recordType: "past_conviction" }), { excludedOffenseSignal: true });
  if (expungement.remedyType !== "expungement" || !expungement.documentTypes.includes("illinois_case_list")) failures.push("Illinois expungement generation failed.");
  if (sealing.remedyType !== "sealing" || !sealing.documentTypes.includes("illinois_additional_arrests_sealing")) failures.push("Illinois sealing generation failed.");
  if (needsReview.eligibilitySignal !== "excluded_or_blocked_review_needed") failures.push("Illinois needs-review generation failed.");
  if (!expungement.safetyDisclaimer.includes("not legal advice") || !expungement.draftPlainText.includes("[SENSITIVE IDENTIFIER TO BE ADDED BY PETITIONER IF REQUIRED]")) failures.push("Illinois output is missing safety disclaimer or sensitive placeholder.");
} catch (error) {
  failures.push(`Unable to execute Illinois generator: ${error instanceof Error ? error.message : String(error)}.`);
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
