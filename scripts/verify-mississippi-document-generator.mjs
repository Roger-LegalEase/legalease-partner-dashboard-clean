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
  "reference/mississippi/Mississippi-Expungement-Agent-Reference.pdf",
  "reference/mississippi/ms-expungement-petitions.html",
  "src/lib/rcap/state-packs/mississippi/eligibility-rules.ts",
  "src/lib/rcap/state-packs/mississippi/pathways.ts",
  "src/lib/rcap/state-packs/mississippi/waiting-periods.ts",
  "src/lib/rcap/state-packs/mississippi/disqualifying-offenses.ts",
  "src/lib/rcap/state-packs/mississippi/required-fields.ts",
  "src/lib/rcap/state-packs/mississippi/filing-instructions.ts",
  "src/lib/rcap/state-packs/mississippi/fee-notes.ts",
  "src/lib/rcap/state-packs/mississippi/court-routing.ts",
  "src/lib/rcap/state-packs/mississippi/county-court-instructions.ts",
  "src/lib/rcap/state-packs/mississippi/document-types.ts",
  "src/lib/rcap/state-packs/mississippi/safety-language.ts",
  "src/lib/rcap/state-packs/mississippi/sample-data.ts",
  "src/lib/rcap/documents/mississippi/field-mapper.ts",
  "src/lib/rcap/documents/mississippi/generator.ts",
  "src/lib/rcap/documents/mississippi/repository.ts",
  "src/components/rcap/documents/mississippi/MississippiPetitionPacketPreview.tsx",
  "src/app/documents/[partnerSlug]/page.tsx",
  "src/app/documents/[partnerSlug]/form/page.tsx",
  "src/app/documents/[partnerSlug]/form/MississippiPetitionInformationForm.tsx",
  "src/app/documents/[partnerSlug]/[packetId]/page.tsx",
  "src/app/briefcase/page.tsx",
  "src/app/briefcase/[packetId]/page.tsx",
  "src/app/sign-in/page.tsx",
  "src/app/sign-out/page.tsx",
  "src/app/api/rcap/documents/mississippi/create/route.ts",
  "src/app/api/rcap/documents/[packetId]/route.ts",
  "src/app/api/rcap/documents/[packetId]/save/route.ts",
  "src/app/api/rcap/documents/[packetId]/generate/route.ts",
  "src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts",
  "src/lib/rcap/documents/packet-pdf.ts",
  "src/components/rcap/documents/DocumentPacketActions.tsx",
  "src/lib/security/rcap-captcha.ts",
  "src/lib/rcap/briefcase/auth.ts",
  "supabase/phase-19-mississippi-document-generator.sql",
  "docs/state-packs/MISSISSIPPI_RCAP_KNOWLEDGE_PACK.md",
  "docs/PHASE_19_MISSISSIPPI_DOCUMENT_GENERATOR.md",
  "docs/reference/mississippi/README.md"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(rootDir, file))) {
    failures.push(`Missing required Phase 19 file: ${file}.`);
  }
}

const generatorSource = readSource("src/lib/rcap/documents/mississippi/generator.ts");
const mapperSource = readSource("src/lib/rcap/documents/mississippi/field-mapper.ts");
const repositorySource = readSource("src/lib/rcap/documents/mississippi/repository.ts");
const previewSource = readSource("src/components/rcap/documents/mississippi/MississippiPetitionPacketPreview.tsx");
const documentsPageSource = readSource("src/app/documents/[partnerSlug]/page.tsx");
const formSource = readSource("src/app/documents/[partnerSlug]/form/page.tsx") + readSource("src/app/documents/[partnerSlug]/form/MississippiPetitionInformationForm.tsx");
const briefcaseSource = readSource("src/app/briefcase/page.tsx") + readSource("src/app/briefcase/[packetId]/page.tsx") + readSource("src/app/sign-in/page.tsx") + readSource("src/app/sign-out/page.tsx");
const routeSource = readSource("src/app/api/rcap/documents/mississippi/create/route.ts");
const saveGenerateSource = readSource("src/app/api/rcap/documents/[packetId]/save/route.ts") + readSource("src/app/api/rcap/documents/[packetId]/generate/route.ts");
const captchaSource = readSource("src/lib/security/rcap-captcha.ts") + readSource("src/app/api/rcap/intake/start/route.ts") + routeSource;
const migrationSource = readSource("supabase/phase-19-mississippi-document-generator.sql");
const dashboardSource = readSource("src/app/dashboard/partners/page.tsx") + readSource("src/app/dashboard/partners/[partnerSlug]/page.tsx") + readSource("src/app/internal/partners/admin/page.tsx");
const docsSource = readSource("docs/PHASE_19_MISSISSIPPI_DOCUMENT_GENERATOR.md") + readSource("docs/state-packs/MISSISSIPPI_RCAP_KNOWLEDGE_PACK.md");
const packagesSource = readSource("src/lib/partners/packages.ts");
const dashboardDataSource = readSource("src/lib/partner-dashboard-data.ts");
const pdfRouteSource = readSource("src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts");
const pdfRendererSource = readSource("src/lib/rcap/documents/packet-pdf.ts");
const pdfActionsSource = readSource("src/components/rcap/documents/DocumentPacketActions.tsx");

if (!pdfRouteSource.includes("renderRcapPacketPdf") || !pdfRouteSource.includes('pdfType !== "full"') || !pdfRouteSource.includes('pdfType !== "court"')) {
  failures.push("Mississippi packet PDF download route is missing full/court PDF support.");
}
if (!pdfRendererSource.includes("Full LegalEase Packet PDF") || !pdfRendererSource.includes("renderCourtTemplatePacketHtml") || !pdfRendererSource.includes("ms-expungement-petitions.html")) {
  failures.push("Mississippi packet PDF renderer is missing full/court packet language.");
}
if (!pdfActionsSource.includes("Full LegalEase PDF") || !pdfActionsSource.includes("Court Filing PDF") || !previewSource.includes("DocumentPacketActions")) {
  failures.push("Mississippi document preview is missing PDF download actions.");
}

for (const signal of ["non_conviction", "misdemeanor_conviction", "felony_conviction"]) {
  if (!mapperSource.includes(signal) && !generatorSource.includes(signal)) {
    failures.push(`Missing Mississippi petition path: ${signal}.`);
  }
}

for (const documentType of [
  "mississippi_non_conviction_petition",
  "mississippi_misdemeanor_conviction_petition",
  "mississippi_felony_conviction_petition",
  "mississippi_certificate_of_service",
  "mississippi_proposed_order_placeholder"
]) {
  if (!migrationSource.includes(documentType) && !readSource("src/lib/rcap/state-packs/mississippi/document-types.ts").includes(documentType)) {
    failures.push(`Missing document type: ${documentType}.`);
  }
}

if (!generatorSource.includes("mississippiSafetyDisclaimer") || !readSource("src/lib/rcap/state-packs/mississippi/safety-language.ts").includes("does not guarantee eligibility")) {
  failures.push("Mississippi generator does not include required safety disclaimer.");
}

if (/You are eligible|You qualify|This is ready to file|Guaranteed expungement|We guarantee/i.test(generatorSource + previewSource + documentsPageSource + formSource)) {
  failures.push("Unsafe eligibility or filing guarantee language appears in document output.");
}

if (/\bssn\b/i.test(documentsPageSource + previewSource + repositorySource + routeSource + migrationSource + formSource) && !generatorSource.includes("[SSN TO BE ADDED BY PETITIONER IF REQUIRED]") && !migrationSource.includes("No SSN")) {
  failures.push("SSN collection appears to be enabled.");
}

if (/date_of_birth|\bdob\b/i.test(documentsPageSource + previewSource + repositorySource + routeSource + migrationSource + formSource) && !generatorSource.includes("[DOB TO BE ADDED BY PETITIONER IF REQUIRED]")) {
  failures.push("DOB collection appears in Phase 19 document flow.");
}

if (/Georgia|Illinois|Maryland|Pennsylvania|District of Columbia|California|Ohio|New York/.test(generatorSource + mapperSource + repositorySource)) {
  failures.push("Unsupported states appear in the Mississippi document generator path.");
}

if (/expungement\.ai|consumer-facing/i.test(generatorSource + mapperSource + repositorySource + routeSource + documentsPageSource)) {
  failures.push("Document generator depends on Expungement.ai naming or routing.");
}

if (!previewSource.includes("DocumentPacketActions") || !pdfActionsSource.includes("Print") || !pdfActionsSource.includes("Full LegalEase PDF") || !pdfActionsSource.includes("Court Filing PDF") || !previewSource.includes("MississippiProposedOrderPlaceholder") || !previewSource.includes("FilingNextStepsPacketPreview")) {
  failures.push("Document preview is not print-friendly or export-ready.");
}

if (!documentsPageSource.includes("/intake/") || !documentsPageSource.includes("search.session") || !formSource.includes("intakeSessionId")) {
  failures.push("Document page does not hand off safely from RCAP Wilma intake.");
}

if (!repositorySource.includes("rcap_document_packets") || !migrationSource.includes("create table if not exists rcap_document_packets") || !migrationSource.includes("rcap_document_packet_inputs")) {
  failures.push("Document packet data model is not configured.");
}

if (!formSource.includes("Save for later") || !formSource.includes("Generate draft packet") || !saveGenerateSource.includes("saveMississippiDocumentPacketInputs")) {
  failures.push("Petition form save-and-resume path is missing.");
}

if (!briefcaseSource.includes("Your Briefcase") || !migrationSource.includes("rcap_briefcase_items") || !repositorySource.includes("upsertBriefcaseItem")) {
  failures.push("Briefcase foundation is missing.");
}

if (!repositorySource.includes("buildFilingNextStepsPacket(packet)") || !repositorySource.includes('if (state === "PA") return "PA"')) {
  failures.push("Persisted Briefcase packet reconstruction does not preserve state-specific filing next steps.");
}

if (!briefcaseSource.includes("/sign-in") || !briefcaseSource.includes("downloadable PDFs") || !readSource("src/lib/rcap/briefcase/auth.ts").includes("placeholder")) {
  failures.push("User auth foundation is missing.");
}

if (!captchaSource.includes("ENABLE_RCAP_CAPTCHA") || !captchaSource.includes("TURNSTILE_SECRET_KEY") || !readSource(".env.example").includes("ENABLE_RCAP_CAPTCHA=false")) {
  failures.push("CAPTCHA readiness is missing or not disabled by default.");
}

if (!readSource("src/lib/rcap/state-packs/mississippi/county-court-instructions.ts").includes("Circuit Court") || !generatorSource.includes("countyCourtInstructions")) {
  failures.push("County/court/jurisdiction filing instructions are missing.");
}

if (!dashboardSource.includes("Packet and Briefcase activity") || !dashboardSource.includes("Mississippi only") || !dashboardSource.includes("saved Mississippi packets")) {
  failures.push("Partner dashboard/admin document activity is missing.");
}

if (!docsSource.includes("Mississippi-only") || !docsSource.includes("draft/preparation aid") || !docsSource.includes("Briefcase") || !docsSource.includes("CAPTCHA") || !docsSource.includes("Command Center integration") || !docsSource.includes("CRM integration")) {
  failures.push("Phase 19 docs are incomplete.");
}

if (!packagesSource.includes("Full Access Program")) {
  failures.push("Full Access Program public naming is missing.");
}

if (!packagesSource.includes("STRIPE_PRICE_COUNTY_ACCESS_PROGRAM")) {
  failures.push("Internal STRIPE_PRICE_COUNTY_ACCESS_PROGRAM compatibility is missing.");
}

for (const banned of ["StartApart", "ClaimCoach"]) {
  if (dashboardDataSource.includes(banned)) {
    failures.push(`${banned} appears in dashboard modules.`);
  }
}

const envLocalTracked = isGitTracked(".env.local");
if (envLocalTracked) {
  failures.push(".env.local is tracked by git.");
}

const trackedSecretsFound = trackedSecretsAppearInTrackedFiles();
if (trackedSecretsFound) {
  failures.push("Stripe, Supabase, Resend, CAPTCHA, auth, or AI provider secret values appear in tracked files.");
}

try {
  const { generateMississippiPetitionDraft } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/mississippi/generator.ts"));
  const { renderRcapPacketPdfHtml } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/packet-pdf.ts"));
  const nonConviction = generateMississippiPetitionDraft(baseSession({ caseOutcome: "dismissed", recordType: "charged_not_convicted" }));
  const misdemeanor = generateMississippiPetitionDraft(baseSession({ caseOutcome: "completed_sentence", recordType: "past_conviction" }));
  const unclear = generateMississippiPetitionDraft(baseSession({ caseOutcome: "not_sure", recordType: "not_sure_what_shows" }));

  if (nonConviction.pathway !== "non_conviction" || nonConviction.documentType !== "mississippi_non_conviction_petition") {
    failures.push("Non-conviction pathway generation failed.");
  }
  if (misdemeanor.pathway !== "misdemeanor_conviction" || misdemeanor.documentType !== "mississippi_misdemeanor_conviction_petition") {
    failures.push("Misdemeanor pathway generation failed.");
  }
  if (unclear.status !== "missing_information" || unclear.pathway !== "more_information_needed") {
    failures.push("Unclear intake should return more information needed.");
  }
  if (!nonConviction.safetyDisclaimer.includes("not legal advice") || !nonConviction.draftPlainText.includes("[SSN TO BE ADDED BY PETITIONER IF REQUIRED]")) {
    failures.push("Generated output is missing safety disclaimer or SSN placeholder.");
  }
  if (!nonConviction.draftPlainText.includes("[DOB TO BE ADDED BY PETITIONER IF REQUIRED]") || !Array.isArray(nonConviction.countyCourtInstructions)) {
    failures.push("Generated output is missing DOB placeholder or county/court instructions.");
  }
  if (!validNextStepsPacket(nonConviction, ["Where to file:", "How to file:", "$150", "Confirm before filing", "What to track after submission", "not legal advice"], ["State's Attorney", "Criminal Motion Seal Team", "Court of Common Pleas", "PATCH report", "$132-$215", "Workflow gap"])) {
    failures.push("Mississippi final Next Steps for Filing packet is incomplete.");
  }
  const courtPdfHtml = renderRcapPacketPdfHtml(packetFromResult(nonConviction), "court");
  const fullPdfHtml = renderRcapPacketPdfHtml(packetFromResult(nonConviction), "full");
  if (!courtPdfHtml.includes("Petition for") || !courtPdfHtml.includes("Certificate of Service") || !courtPdfHtml.includes("MISSISSIPPI")) failures.push("Mississippi court-facing PDF does not use the Mississippi petition template.");
  if (courtPdfHtml.includes("Full LegalEase Packet PDF") || courtPdfHtml.includes("LegalEase</span>")) failures.push("Mississippi court-facing PDF includes LegalEase cover/marketing content.");
  if (/ATJ 2902\.1|D\.C\. Code|Pa\.R\.Crim\.P\. 790|HARRIS COUNTY, TEXAS/.test(courtPdfHtml)) failures.push("Another jurisdiction template leaked into the Mississippi court-facing PDF.");
  if (!fullPdfHtml.includes("Full LegalEase Packet PDF") || !fullPdfHtml.includes("Petition for")) failures.push("Mississippi Full LegalEase PDF does not keep branded guidance separate from court-facing pages.");
} catch (error) {
  failures.push(`Unable to execute Mississippi generator: ${error instanceof Error ? error.message : String(error)}.`);
}

function packetFromResult(result) {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    partnerSlug: "demo-partner",
    state: "MS",
    county: result.fields.county,
    documentType: result.documentType,
    pathway: result.pathway,
    status: result.status,
    petitionerFirstName: result.fields.petitionerFirstName,
    petitionerLastName: result.fields.petitionerLastName,
    courtType: result.fields.courtType,
    courtCounty: result.fields.courtCounty,
    courtName: result.fields.courtName,
    causeNumber: result.fields.causeNumber,
    charge: result.fields.charge,
    arrestDate: result.fields.arrestDate,
    arrestingAgency: result.fields.arrestingAgency,
    agencyCaseNumber: result.fields.agencyCaseNumber,
    dispositionDate: result.fields.dispositionDate,
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
  console.error("Mississippi document generator verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Mississippi document generator verification passed.");
console.log("State knowledge pack: configured");
console.log("Document generator: Mississippi only");
console.log("Petition form: configured");
console.log("Save and resume: configured");
console.log("Briefcase: configured");
console.log("User auth foundation: configured");
console.log("CAPTCHA readiness: configured");
console.log("Petition paths: non-conviction, misdemeanor, felony");
console.log("County/court instructions: configured");
console.log("Document preview: configured");
console.log("Safety disclaimer: configured");
console.log("Eligibility guarantees: blocked");
console.log("SSN collection: disabled");
console.log("Expungement.ai dependency: none");
console.log(`.env.local tracked: ${envLocalTracked ? "yes" : "no"}`);
console.log(`Tracked secrets found: ${trackedSecretsFound ? "yes" : "no"}`);
console.log("Dashboard product boundary: record-clearing only");

function baseSession(overrides) {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    partnerSlug: "demo-partner",
    status: "completed",
    currentStep: "completed",
    state: "Mississippi",
    county: "Hinds",
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

function trackedSecretsAppearInTrackedFiles() {
  const secretValues = [
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.RESEND_API_KEY,
    process.env.TURNSTILE_SECRET_KEY,
    process.env.INTERNAL_ADMIN_ACCESS_TOKEN,
    process.env.PARTNER_PREVIEW_ACCESS_TOKEN,
    process.env.OPENAI_API_KEY,
    process.env.ANTHROPIC_API_KEY
  ].filter((value) => typeof value === "string" && value.length > 0);
  if (secretValues.length === 0) {
    return false;
  }
  for (const file of getTrackedFiles()) {
    const absolutePath = path.join(rootDir, file);
    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
      continue;
    }
    const content = fs.readFileSync(absolutePath);
    for (const secret of secretValues) {
      if (content.includes(Buffer.from(secret))) {
        return true;
      }
    }
  }
  return false;
}

function getTrackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], { cwd: rootDir, encoding: "utf8" });
  return (result.stdout ?? "").split("\0").filter(Boolean);
}

function isGitTracked(filePath) {
  const result = spawnSync("git", ["ls-files", "--error-unmatch", filePath], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });
  return result.status === 0;
}

function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const [key, ...rest] = trimmed.split("=");
    if (key && !process.env[key]) {
      process.env[key] = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

function readSource(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
}

function loadTsModule(filePath) {
  if (moduleCache.has(filePath)) {
    return moduleCache.get(filePath).exports;
  }
  const source = fs.readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX
    }
  }).outputText;
  const mod = new Module(filePath);
  mod.filename = filePath;
  mod.paths = Module._nodeModulePaths(path.dirname(filePath));
  moduleCache.set(filePath, mod);
  mod.require = (request) => {
    if (request.startsWith("@/")) {
      return loadTsModule(resolveTs(path.join(rootDir, "src", request.slice(2))));
    }
    if (request.startsWith("./") || request.startsWith("../")) {
      return loadTsModule(resolveTs(path.resolve(path.dirname(filePath), request)));
    }
    return require(request);
  };
  mod._compile(compiled, filePath);
  return mod.exports;
}

function resolveTs(basePath) {
  for (const extension of [".ts", ".tsx", ".js", ".mjs"]) {
    if (fs.existsSync(basePath + extension)) {
      return basePath + extension;
    }
  }
  if (fs.existsSync(path.join(basePath, "index.ts"))) {
    return path.join(basePath, "index.ts");
  }
  return basePath;
}
