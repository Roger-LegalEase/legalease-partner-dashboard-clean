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
  "reference/pennsylvania/Pennsylvania-Expungement-Sealing-Agent-Reference.pdf",
  "reference/pennsylvania/pa-petition-expungement-790.html",
  "reference/pennsylvania/222612-petitionforexpungement790030912-000077.pdf",
  "src/lib/rcap/state-packs/pennsylvania/eligibility-rules.ts",
  "src/lib/rcap/state-packs/pennsylvania/pathways.ts",
  "src/lib/rcap/state-packs/pennsylvania/waiting-periods.ts",
  "src/lib/rcap/state-packs/pennsylvania/disqualifying-offenses.ts",
  "src/lib/rcap/state-packs/pennsylvania/required-fields.ts",
  "src/lib/rcap/state-packs/pennsylvania/filing-instructions.ts",
  "src/lib/rcap/state-packs/pennsylvania/fee-notes.ts",
  "src/lib/rcap/state-packs/pennsylvania/county-court-instructions.ts",
  "src/lib/rcap/state-packs/pennsylvania/document-types.ts",
  "src/lib/rcap/state-packs/pennsylvania/safety-language.ts",
  "src/lib/rcap/state-packs/pennsylvania/sample-data.ts",
  "src/lib/rcap/documents/pennsylvania/field-mapper.ts",
  "src/lib/rcap/documents/pennsylvania/generator.ts",
  "src/lib/rcap/documents/pennsylvania/repository.ts",
  "src/components/rcap/documents/pennsylvania/PennsylvaniaDocumentPacketPreview.tsx",
  "src/components/rcap/documents/DocumentPacketActions.tsx",
  "src/app/documents/[partnerSlug]/form/PennsylvaniaPetitionInformationForm.tsx",
  "src/app/api/rcap/documents/pennsylvania/create/route.ts",
  "src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts",
  "src/lib/rcap/documents/packet-pdf.ts",
  "docs/state-packs/PENNSYLVANIA_RCAP_KNOWLEDGE_PACK.md",
  "docs/PHASE_21_PENNSYLVANIA_RECORD_RELIEF_WORKFLOW.md",
  "docs/reference/pennsylvania/README.md"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(rootDir, file))) failures.push(`Missing Phase 21 file: ${file}.`);
}

const questionsSource = readSource("src/lib/rcap-intake/questions.ts");
const summarySource = readSource("src/lib/rcap-intake/pathway-summary.ts");
const intakeClientSource = readSource("src/app/intake/[partnerSlug]/RcapWilmaIntakeChat.tsx");
const generatorSource = readSource("src/lib/rcap/documents/pennsylvania/generator.ts");
const mapperSource = readSource("src/lib/rcap/documents/pennsylvania/field-mapper.ts");
const repositorySource = readSource("src/lib/rcap/documents/pennsylvania/repository.ts");
const routeSource = readSource("src/app/api/rcap/documents/pennsylvania/create/route.ts");
const formSource = readSource("src/app/documents/[partnerSlug]/form/page.tsx") + readSource("src/app/documents/[partnerSlug]/form/PennsylvaniaPetitionInformationForm.tsx");
const previewSource = readSource("src/components/rcap/documents/pennsylvania/PennsylvaniaDocumentPacketPreview.tsx");
const docsSource = readSource("docs/PHASE_21_PENNSYLVANIA_RECORD_RELIEF_WORKFLOW.md") + readSource("docs/state-packs/PENNSYLVANIA_RCAP_KNOWLEDGE_PACK.md");
const sourceReadme = readSource("docs/reference/pennsylvania/README.md");
const dashboardDataSource = readSource("src/lib/partner-dashboard-data.ts");
const msGeneratorSource = readSource("src/lib/rcap/documents/mississippi/generator.ts");
const ilGeneratorSource = readSource("src/lib/rcap/documents/illinois/generator.ts");
const dcGeneratorSource = readSource("src/lib/rcap/documents/dc/generator.ts");
const pdfRouteSource = readSource("src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts");
const pdfRendererSource = readSource("src/lib/rcap/documents/packet-pdf.ts");
const pdfActionsSource = readSource("src/components/rcap/documents/DocumentPacketActions.tsx");

if (!pdfRouteSource.includes("renderRcapPacketPdf") || !pdfRouteSource.includes('pdfType !== "full"') || !pdfRouteSource.includes('pdfType !== "court"')) {
  failures.push("Pennsylvania packet PDF download route is missing full/court PDF support.");
}
if (!pdfRendererSource.includes("Full LegalEase Packet PDF") || !pdfRendererSource.includes("renderCourtTemplatePacketHtml") || !pdfRendererSource.includes("pa-petition-expungement-790.html")) {
  failures.push("Pennsylvania packet PDF renderer is missing full/court packet language.");
}
if (!pdfActionsSource.includes("Full LegalEase PDF") || !pdfActionsSource.includes("Court Filing PDF") || !previewSource.includes("DocumentPacketActions")) {
  failures.push("Pennsylvania document preview is missing PDF download actions.");
}

for (const sourcePath of [
  "Pennsylvania-Expungement-Sealing-Agent-Reference.pdf",
  "pa-petition-expungement-790.html",
  "222612-petitionforexpungement790030912-000077.pdf"
]) {
  if (!sourceReadme.includes(sourcePath) || !generatorSource.includes(sourcePath)) failures.push(`Pennsylvania source material is not preserved in docs/generator: ${sourcePath}.`);
}

if (!questionsSource.includes("pennsylvaniaIntakeIntro") || !intakeClientSource.includes("PATCH report") || !summarySource.includes("Pennsylvania limited access or Clean Slate")) {
  failures.push("Wilma Pennsylvania branch is missing.");
}

for (const pathway of [
  "expungement_non_conviction",
  "expungement_no_disposition_18_months",
  "expungement_summary_5_years",
  "expungement_ard",
  "expungement_pardon",
  "expungement_age_70",
  "limited_access_misdemeanor",
  "limited_access_property_felony",
  "clean_slate_automatic_misdemeanor",
  "clean_slate_automatic_drug_felony",
  "excluded_or_needs_review"
]) {
  if (!mapperSource.includes(pathway) && !generatorSource.includes(pathway)) failures.push(`Missing Pennsylvania pathway: ${pathway}.`);
}

for (const documentType of [
  "pennsylvania_rule_790_expungement_petition",
  "pennsylvania_limited_access_review_notes",
  "pennsylvania_clean_slate_verification_notes",
  "pennsylvania_patch_attachment_checklist",
  "pennsylvania_commonwealth_service_certificate",
  "pennsylvania_filing_instructions"
]) {
  if (!readSource("src/lib/rcap/state-packs/pennsylvania/document-types.ts").includes(documentType)) failures.push(`Missing Pennsylvania document type: ${documentType}.`);
}

for (const requiredText of ["18 Pa.C.S. § 9122", "18 Pa.C.S. § 9122.1", "18 Pa.C.S. § 9122.2", "Pa.R.Crim.P. 790", "18 Pa.C.S. § 4904"]) {
  if (!(generatorSource + docsSource + readSource("src/lib/rcap/state-packs/pennsylvania/eligibility-rules.ts")).includes(requiredText)) failures.push(`Missing Pennsylvania legal source signal: ${requiredText}.`);
}

for (const requiredText of ["PATCH report", "within 60 days", "Court of Common Pleas", "attorney for the Commonwealth", "District Attorney", "30 days", "fee waiver", "$22", "$132-$215"]) {
  if (!(generatorSource + formSource + readSource("src/lib/rcap/state-packs/pennsylvania/filing-instructions.ts") + readSource("src/lib/rcap/state-packs/pennsylvania/fee-notes.ts")).includes(requiredText)) failures.push(`Missing Pennsylvania filing/service language: ${requiredText}.`);
}

if (!repositorySource.includes("rcap_document_packet_inputs") || !repositorySource.includes("upsertBriefcaseItem") || !formSource.includes("Save for later")) {
  failures.push("Pennsylvania save-progress or Briefcase path is missing.");
}
if (!repositorySource.includes("buildFilingNextStepsPacket(packet)") || !readSource("src/lib/rcap/documents/mississippi/repository.ts").includes('if (state === "PA") return "PA"')) {
  failures.push("Pennsylvania persisted Briefcase packet reconstruction does not preserve Pennsylvania filing next steps.");
}
if (!previewSource.includes("FilingNextStepsPacketPreview")) {
  failures.push("Pennsylvania preview does not render the final Next Steps for Filing packet.");
}

if (!routeSource.includes("verifyRcapCaptchaToken")) failures.push("Pennsylvania document create route is missing CAPTCHA readiness.");

if (/You are eligible|You qualify|Guaranteed expungement|Guaranteed sealing|We guarantee|already sealed|has been sealed/i.test(generatorSource + previewSource + formSource + summarySource)) {
  failures.push("Unsafe eligibility, outcome, or completed-Clean-Slate language appears in Pennsylvania workflow.");
}

if (!generatorSource.includes("should not be read as proof that a record has already been sealed") || !generatorSource.includes("data or alias gaps") || !summarySource.includes("not treated as already complete")) {
  failures.push("Automatic Clean Slate caution is incomplete.");
}

if (!mapperSource.includes('return "limited_access_misdemeanor"') || !generatorSource.includes("This conviction relief path is limited access / sealing, not expungement")) {
  failures.push("Pennsylvania conviction relief may be mislabeled as expungement.");
}

if (/expungement\.ai|consumer-facing/i.test(generatorSource + mapperSource + repositorySource + routeSource + formSource + summarySource)) {
  failures.push("Pennsylvania generator depends on Expungement.ai naming or routing.");
}

for (const banned of ["StartApart", "ClaimCoach"]) {
  if (dashboardDataSource.includes(banned) || generatorSource.includes(banned) || formSource.includes(banned)) failures.push(`${banned} appears in dashboard or Pennsylvania workflow modules.`);
}

if (!msGeneratorSource.includes("Mississippi") || !ilGeneratorSource.includes("Illinois") || !dcGeneratorSource.includes("DC-Expungement-Sealing-Agent-Reference.pdf")) {
  failures.push("Mississippi, Illinois, or DC generator source appears missing.");
}

try {
  const { generatePennsylvaniaDocumentDraft } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/pennsylvania/generator.ts"));
  const { generateMississippiPetitionDraft } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/mississippi/generator.ts"));
  const { generateIllinoisDocumentDraft } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/illinois/generator.ts"));
  const { generateDcDocumentDraft } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/dc/generator.ts"));
  const { renderRcapPacketPdfHtml } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/packet-pdf.ts"));

  const nonConviction = generatePennsylvaniaDocumentDraft(baseSession({ caseOutcome: "dismissed", recordType: "charged_not_convicted" }), {
    hasPatchReport: true,
    patchWithin60Days: true,
    docketNumber: "CP-02-CR-0001234-2022",
    arrestingAgency: "Pittsburgh Bureau of Police",
    arrestDate: "2022",
    commonwealthServiceReady: true
  });
  const misdemeanor = generatePennsylvaniaDocumentDraft(baseSession({ caseOutcome: "convicted", recordType: "past_conviction" }), {
    hasPatchReport: true,
    docketNumber: "CP-02-CR-0001234-2022",
    offenseGrade: "M2",
    restitutionPaid: true,
    convictionFreeSevenYears: true,
    excludedOffenseSignal: false,
    commonwealthServiceReady: true
  });
  const cleanSlate = generatePennsylvaniaDocumentDraft(baseSession({ caseOutcome: "convicted", recordType: "past_conviction" }), {
    hasPatchReport: true,
    docketNumber: "CP-51-CR-0007777-2017",
    offenseGrade: "drug_felony",
    convictionFreeTenYears: true,
    sentenceUnderThirtyMonths: true,
    excludedOffenseSignal: false,
    cleanSlateAutomaticSignal: true
  });
  const excluded = generatePennsylvaniaDocumentDraft(baseSession({ caseOutcome: "convicted", recordType: "past_conviction" }), {
    offenseGrade: "M1",
    hasPatchReport: true,
    sexOffenderRegistrationSignal: true
  });
  const ms = generateMississippiPetitionDraft(baseSession({ state: "Mississippi", county: "Hinds", caseOutcome: "dismissed", recordType: "charged_not_convicted" }));
  const il = generateIllinoisDocumentDraft(baseSession({ state: "Illinois", county: "Cook", caseOutcome: "dismissed", recordType: "charged_not_convicted" }), { hasRapSheet: true });
  const dc = generateDcDocumentDraft(baseSession({ state: "DC", county: "District of Columbia", caseOutcome: "dismissed", recordType: "charged_not_convicted" }), { reliefTrack: "automatic_sealing", hasMpdRecord: true, hasCourtDisposition: true });

  if (nonConviction.remedyType !== "expungement" || !nonConviction.documentTypes.includes("pennsylvania_rule_790_expungement_petition")) failures.push("Pennsylvania non-conviction expungement generation failed.");
  if (misdemeanor.remedyType !== "limited_access" || misdemeanor.draftTitle.toLowerCase().includes("expungement")) failures.push("Pennsylvania misdemeanor conviction should route to limited access, not expungement.");
  if (cleanSlate.remedyType !== "clean_slate" || !cleanSlate.draftPlainText.includes("should not be read as proof")) failures.push("Pennsylvania Clean Slate caution generation failed.");
  if (excluded.pathway !== "excluded_or_needs_review" || excluded.eligibilitySignal !== "excluded_or_blocked_review_needed") failures.push("Pennsylvania excluded-offense review route failed.");
  if (!nonConviction.draftPlainText.includes("PATCH report") || !nonConviction.draftPlainText.includes("Court of Common Pleas") || !nonConviction.draftPlainText.includes("attorney for the Commonwealth")) failures.push("Pennsylvania generated packet is missing PATCH, court, or DA service language.");
  if (!nonConviction.safetyDisclaimer.includes("not legal advice") || !nonConviction.safetyDisclaimer.includes("does not guarantee")) failures.push("Pennsylvania safety disclaimer is incomplete.");
  if (!validNextStepsPacket(nonConviction, ["Where to file:", "How to file:", "Court of Common Pleas", "$132-$215", "30-day District Attorney response window", "Confirm before filing", "not legal advice"], ["$150", "State's Attorney", "Criminal Motion Seal Team", "RAP sheet", "Workflow gap"])) failures.push("Pennsylvania final Next Steps for Filing packet is incomplete.");
  const courtPdfHtml = renderRcapPacketPdfHtml(packetFromResult(nonConviction), "court");
  const fullPdfHtml = renderRcapPacketPdfHtml(packetFromResult(nonConviction), "full");
  if (!courtPdfHtml.includes("Petition for Expungement Pursuant to Pa.R.Crim.P. 790") || !courtPdfHtml.includes("PETITIONER INFORMATION") || !courtPdfHtml.includes("AOPC Form")) failures.push("Pennsylvania court-facing PDF does not use the Pa.R.Crim.P. 790 template.");
  if (courtPdfHtml.includes("Full LegalEase Packet PDF") || courtPdfHtml.includes("LegalEase</span>")) failures.push("Pennsylvania court-facing PDF includes LegalEase cover/marketing content.");
  if (/ATJ 2902\.1|D\.C\. Code|HARRIS COUNTY, TEXAS|Miss\. Code Ann/.test(courtPdfHtml)) failures.push("Another jurisdiction template leaked into the Pennsylvania court-facing PDF.");
  if (!fullPdfHtml.includes("Full LegalEase Packet PDF") || !fullPdfHtml.includes("Pa.R.Crim.P. 790")) failures.push("Pennsylvania Full LegalEase PDF does not keep branded guidance separate from court-facing pages.");
  if (ms.pathway !== "non_conviction" || il.state !== "IL" || dc.state !== "DC") failures.push("Existing MS/IL/DC generators changed unexpectedly.");
} catch (error) {
  failures.push(`Unable to execute Pennsylvania generator: ${error instanceof Error ? error.message : String(error)}.`);
}

function packetFromResult(result) {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    partnerSlug: "demo-partner",
    state: "PA",
    county: result.fields.county,
    documentType: result.documentTypes[0],
    pathway: result.pathway,
    status: result.status,
    petitionerFirstName: result.fields.petitionerFirstName,
    petitionerLastName: result.fields.petitionerLastName,
    courtName: result.fields.judgeName,
    causeNumber: result.fields.docketNumber,
    charge: result.fields.charge,
    arrestDate: result.fields.arrestDate,
    arrestingAgency: result.fields.arrestingAgency,
    agencyCaseNumber: result.fields.otn,
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

const envLocalTracked = isGitTracked(".env.local");
if (envLocalTracked) failures.push(".env.local is tracked by git.");
const trackedSecretsFound = trackedSecretsAppearInTrackedFiles();
if (trackedSecretsFound) failures.push("Stripe, Supabase, Resend, CAPTCHA, auth, or AI provider secret values appear in tracked files.");

if (failures.length > 0) {
  console.error("Pennsylvania document generator verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Pennsylvania document generator verification passed.");
console.log("State knowledge pack: configured");
console.log("Wilma Pennsylvania branch: configured");
console.log("Document generator: Pennsylvania only");
console.log("Remedy paths: expungement, limited access, Clean Slate, needs review");
console.log("PATCH report requirement: configured");
console.log("Court of Common Pleas filing: configured");
console.log("Attorney for Commonwealth / DA service: configured");
console.log("Clean Slate caution: configured");
console.log("Save and resume: configured");
console.log("Briefcase: configured");
console.log("CAPTCHA readiness: configured");
console.log("Mississippi generator: preserved");
console.log("Illinois generator: preserved");
console.log("DC generator: preserved");
console.log("StartApart/ClaimCoach: absent");
console.log(`.env.local tracked: ${envLocalTracked ? "yes" : "no"}`);
console.log(`Tracked secrets found: ${trackedSecretsFound ? "yes" : "no"}`);

function baseSession(overrides) {
  return { id: "00000000-0000-0000-0000-000000000000", partnerSlug: "demo-partner", status: "completed", currentStep: "completed", state: "Pennsylvania", county: "Allegheny", userFirstName: "Sample", userLastName: "Person", chargeOrCaseType: "Sample charge", hasDocuments: true, needsRecordCheck: false, legalDisclaimerAccepted: true, ...overrides };
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
