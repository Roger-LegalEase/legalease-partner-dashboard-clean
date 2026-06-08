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
  "reference/texas-harris/Texas-HarrisCounty-Expunction-Nondisclosure-Agent-Reference.pdf",
  "reference/texas-harris/tx-harris-expunction-nondisclosure-forms.html",
  "src/lib/rcap/state-packs/texas-harris/pathways.ts",
  "src/lib/rcap/state-packs/texas-harris/document-types.ts",
  "src/lib/rcap/state-packs/texas-harris/required-fields.ts",
  "src/lib/rcap/state-packs/texas-harris/filing-instructions.ts",
  "src/lib/rcap/state-packs/texas-harris/safety-language.ts",
  "src/lib/rcap/documents/texas-harris/field-mapper.ts",
  "src/lib/rcap/documents/texas-harris/generator.ts",
  "src/lib/rcap/documents/texas-harris/repository.ts",
  "src/app/api/rcap/documents/texas-harris/create/route.ts",
  "src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts",
  "src/lib/rcap/documents/packet-pdf.ts",
  "src/components/rcap/documents/DocumentPacketActions.tsx",
  "src/components/rcap/documents/texas-harris/TexasHarrisDocumentPacketPreview.tsx"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(rootDir, file))) failures.push(`Missing Harris County Texas workflow file: ${file}.`);
}

assertPdf("reference/texas-harris/Texas-HarrisCounty-Expunction-Nondisclosure-Agent-Reference.pdf");
assertHtml("reference/texas-harris/tx-harris-expunction-nondisclosure-forms.html");

const generatorSource = readSource("src/lib/rcap/documents/texas-harris/generator.ts");
const mapperSource = readSource("src/lib/rcap/documents/texas-harris/field-mapper.ts");
const repositorySource = readSource("src/lib/rcap/documents/texas-harris/repository.ts");
const filingInstructionsSource = readSource("src/lib/rcap/state-packs/texas-harris/filing-instructions.ts");
const nextStepsSource = readSource("src/lib/rcap/documents/filing-next-steps.ts");
const previewSource = readSource("src/components/rcap/documents/texas-harris/TexasHarrisDocumentPacketPreview.tsx");
const briefcasePageSource = readSource("src/app/documents/[partnerSlug]/[packetId]/page.tsx");
const sharedTypesSource = readSource("src/lib/rcap/documents/mississippi/types.ts");
const sharedRepositorySource = readSource("src/lib/rcap/documents/mississippi/repository.ts");
const msGeneratorSource = readSource("src/lib/rcap/documents/mississippi/generator.ts");
const ilGeneratorSource = readSource("src/lib/rcap/documents/illinois/generator.ts");
const dcGeneratorSource = readSource("src/lib/rcap/documents/dc/generator.ts");
const paGeneratorSource = readSource("src/lib/rcap/documents/pennsylvania/generator.ts");
const pdfRouteSource = readSource("src/app/api/rcap/documents/[packetId]/pdf/[pdfType]/route.ts");
const pdfRendererSource = readSource("src/lib/rcap/documents/packet-pdf.ts");
const pdfActionsSource = readSource("src/components/rcap/documents/DocumentPacketActions.tsx");

if (!pdfRouteSource.includes("renderRcapPacketPdf") || !pdfRouteSource.includes('pdfType !== "full"') || !pdfRouteSource.includes('pdfType !== "court"')) {
  failures.push("Harris County Texas packet PDF download route is missing full/court PDF support.");
}
if (!pdfRendererSource.includes("Full LegalEase Packet PDF") || !pdfRendererSource.includes("renderCourtTemplatePacketHtml") || !pdfRendererSource.includes("tx-harris-expunction-nondisclosure-forms.html")) {
  failures.push("Harris County Texas packet PDF renderer is missing full/court packet language.");
}
if (!pdfActionsSource.includes("Full LegalEase PDF") || !pdfActionsSource.includes("Court Filing PDF") || !previewSource.includes("DocumentPacketActions")) {
  failures.push("Harris County Texas document preview is missing PDF download actions.");
}

for (const pathway of [
  "expunction_acquittal_not_guilty",
  "expunction_arrest_no_charge",
  "expunction_dismissal_or_quashed",
  "expunction_limitations_expired",
  "expunction_pardon_actual_innocence",
  "expunction_class_c_deferred_completed",
  "nondisclosure_deferred_adjudication_completed",
  "nondisclosure_eligible_conviction",
  "nondisclosure_first_offense_dwi",
  "final_conviction_pardon_review"
]) {
  if (!mapperSource.includes(pathway) && !generatorSource.includes(pathway)) failures.push(`Missing Harris County Texas disposition route: ${pathway}.`);
}

for (const requiredText of [
  "Texas Code of Criminal Procedure Chapter 55A",
  "Texas Government Code Chapter 411, Subchapter E-1",
  "not repealed Chapter 55",
  "Harris County District Clerk / 201 Caroline St.",
  "Municipal Courts / 1400 Lubbock",
  "$25-$300",
  "Statement of Inability to Afford Payment of Court Costs",
  "Workflow gap",
  "Texas Department of Public Safety",
  "Harris County District Attorney",
  "Harris County District Clerk",
  "Harris County Sheriff",
  "Houston Police Department",
  "Source-backed packet wording, verification language, default agency list, attachment notes, and nondisclosure service note",
  "Texas notary"
]) {
  if (!(generatorSource + nextStepsSource + mapperSource + filingInstructionsSource).includes(requiredText)) failures.push(`Missing Harris County Texas source-backed/gap language: ${requiredText}.`);
}

if ((generatorSource + filingInstructionsSource + nextStepsSource).includes("source files are not currently present") || (generatorSource + filingInstructionsSource).includes("missing Harris County source packet")) {
  failures.push("Harris County Texas workflow still describes source materials as missing after sources were added.");
}

if (!generatorSource.includes("Expunction may require a hearing") || !generatorSource.includes("Nondisclosure may be decided on the papers")) {
  failures.push("Harris County Texas filing outcomes are missing hearing/papers guidance.");
}
if (!previewSource.includes("FilingNextStepsPacketPreview") || !briefcasePageSource.includes("TexasHarrisDocumentPacketPreview")) {
  failures.push("Harris County Texas Briefcase/document preview does not render FilingNextStepsPacketPreview.");
}
if (!sharedTypesSource.includes('"TX"') || !sharedRepositorySource.includes('if (state === "TX") return "TX"') || !repositorySource.includes("buildFilingNextStepsPacket(packet)")) {
  failures.push("Persisted Harris County Texas packets do not reconstruct the Texas/Harris filing packet.");
}
if (/Mississippi|Illinois|District of Columbia|Pennsylvania|PATCH report|Court of Common Pleas/.test(generatorSource + mapperSource + nextStepsSource.match(/function buildTexasHarrisNextSteps[\s\S]*?function gapsFrom/)?.[0])) {
  failures.push("Non-Texas filing rules leaked into the Harris County Texas workflow.");
}
for (const leaked of ["201 Caroline St.", "1400 Lubbock", "Chapter 55A", "Harris County District Attorney"]) {
  if ((msGeneratorSource + ilGeneratorSource + dcGeneratorSource + paGeneratorSource).includes(leaked)) failures.push(`Harris County rule leaked into existing workflows: ${leaked}.`);
}

try {
  const { generateTexasHarrisDocumentDraft } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/texas-harris/generator.ts"));
  const { renderRcapPacketPdfHtml } = loadTsModule(path.join(rootDir, "src/lib/rcap/documents/packet-pdf.ts"));
  const expunction = generateTexasHarrisDocumentDraft(baseSession({ caseOutcome: "dismissed", recordType: "charged_not_convicted" }), {
    dispositionRoute: "dismissal_or_quashed",
    courtType: "district",
    caseNumber: "1234567",
    petitionerDateOfBirth: "1990-01-01",
    arrestDate: "2022-01-01",
    arrestingAgency: "Houston Police Department",
    charge: "Sample misdemeanor",
    disposition: "Dismissed",
    dispositionDate: "2023-01-01",
    statutoryRoute: "Chapter 55A dismissal route",
    waitingPeriodFacts: "Waiting period facts confirmed from user documents.",
    noDisqualifyingHistory: true,
    verificationReady: true
  });
  const nondisclosure = generateTexasHarrisDocumentDraft(baseSession({ caseOutcome: "completed_sentence", recordType: "past_conviction" }), {
    dispositionRoute: "deferred_adjudication_completed",
    courtType: "county_criminal",
    caseNumber: "2345678",
    petitionerDateOfBirth: "1990-01-01",
    charge: "Sample deferred adjudication offense",
    disposition: "Deferred adjudication completed",
    dispositionDate: "2021-01-01",
    statutoryRoute: "Government Code Chapter 411 nondisclosure route",
    waitingPeriodFacts: "Waiting period facts confirmed from user documents.",
    noDisqualifyingHistory: true,
    verificationReady: true
  });
  const municipal = generateTexasHarrisDocumentDraft(baseSession({ caseOutcome: "completed_sentence", recordType: "charged_not_convicted" }), {
    dispositionRoute: "class_c_deferred_completed",
    courtType: "municipal_class_c",
    caseNumber: "C12345",
    petitionerDateOfBirth: "1990-01-01",
    arrestDate: "2022-01-01",
    arrestingAgency: "Houston Police Department",
    charge: "Class C deferred disposition",
    disposition: "Class C deferred disposition completed",
    dispositionDate: "2023-01-01",
    statutoryRoute: "Chapter 55A Class C deferred route",
    waitingPeriodFacts: "Waiting period facts confirmed from user documents.",
    verificationReady: true
  });

  if (expunction.state !== "TX" || expunction.remedyType !== "expunction" || !expunction.filingNextStepsPacket) failures.push("Harris County expunction generation failed.");
  if (nondisclosure.remedyType !== "nondisclosure" || !nondisclosure.draftPlainText.includes("Texas Government Code Chapter 411, Subchapter E-1")) failures.push("Harris County nondisclosure generation failed.");
  if (expunction.draftPlainText === nondisclosure.draftPlainText || !expunction.draftPlainText.includes("erase, destroy, or return") || !nondisclosure.draftPlainText.includes("remains visible to law enforcement")) failures.push("Expunction and nondisclosure packet language is not distinct.");
  if (expunction.draftPlainText.includes("repealed Chapter 55") || !expunction.draftPlainText.includes("Chapter 55A")) failures.push("Chapter 55A language is missing or repealed Chapter 55 appears in generated text.");
  if (!municipal.filingNextStepsPacket.plainText.includes("Municipal Courts / 1400 Lubbock")) failures.push("Class C municipal filing location is missing.");
  if (!validNextStepsPacket(expunction, ["filingNextStepsPacket", "Harris County District Clerk / 201 Caroline St.", "$25-$300", "Confirm before filing"])) failures.push("Harris County expunction final filing next steps packet is incomplete.");
  if (!validNextStepsPacket(nondisclosure, ["Government Code", "Confirm before filing", "Statement of Inability"])) failures.push("Harris County nondisclosure final filing next steps packet is incomplete.");
  const courtPdfHtml = renderRcapPacketPdfHtml(packetFromResult(expunction), "court");
  const fullPdfHtml = renderRcapPacketPdfHtml(packetFromResult(expunction), "full");
  if (!courtPdfHtml.includes("EX PARTE") || !courtPdfHtml.includes("Verification") || !courtPdfHtml.includes("Order of Expunction") || !courtPdfHtml.includes("HARRIS COUNTY, TEXAS")) failures.push("Harris County Texas court-facing PDF does not use the uploaded Ex Parte packet template.");
  if (courtPdfHtml.includes("Full LegalEase Packet PDF") || courtPdfHtml.includes("LegalEase</span>")) failures.push("Harris County Texas court-facing PDF includes LegalEase cover/marketing content.");
  if (/ATJ 2902\.1|D\.C\. Code § 16-806|Pa\.R\.Crim\.P\. 790|Miss\. Code Ann/.test(courtPdfHtml)) failures.push("Another jurisdiction template leaked into the Harris County Texas court-facing PDF.");
  if (!fullPdfHtml.includes("Full LegalEase Packet PDF") || !fullPdfHtml.includes("EX PARTE")) failures.push("Harris County Texas Full LegalEase PDF does not keep branded guidance separate from court-facing pages.");
} catch (error) {
  failures.push(`Unable to execute Harris County Texas generator: ${error instanceof Error ? error.message : String(error)}.`);
}

function packetFromResult(result) {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    partnerSlug: "demo-partner",
    state: "TX",
    county: "Harris",
    documentType: result.documentTypes[0],
    pathway: result.pathway,
    status: result.status,
    petitionerFirstName: result.fields.petitionerFirstName,
    petitionerLastName: result.fields.petitionerLastName,
    causeNumber: result.fields.caseNumber,
    charge: result.fields.charge,
    arrestDate: result.fields.arrestDate,
    arrestingAgency: result.fields.arrestingAgency,
    agencyCaseNumber: result.fields.agencyCaseNumber,
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
  console.error("Harris County Texas document generator verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Harris County Texas document generator verification passed.");
console.log("Document generator: Harris County Texas only");
console.log("Relief paths: expunction, nondisclosure, final conviction review");
console.log("Chapter 55A and Government Code Chapter 411 language: configured");
console.log("Filing next steps packet: configured");
console.log("Workflow gap labeling: configured");
console.log("Existing state workflow isolation: configured");

function baseSession(overrides) {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    partnerSlug: "demo-partner",
    status: "completed",
    currentStep: "completed",
    state: "Texas",
    county: "Harris",
    userFirstName: "Sample",
    userLastName: "Person",
    chargeOrCaseType: "Sample charge",
    hasDocuments: true,
    needsRecordCheck: false,
    legalDisclaimerAccepted: true,
    ...overrides
  };
}

function validNextStepsPacket(result, requiredText) {
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
    !packet.plainText.includes("Workflow gap") &&
    requiredText.every((text) => text === "filingNextStepsPacket" || packet.plainText.includes(text))
  );
}

function readSource(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
}

function assertPdf(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) return;
  const content = fs.readFileSync(absolutePath);
  if (content.length < 1024) failures.push(`Harris County Texas source PDF is unexpectedly small: ${relativePath}.`);
  if (!content.subarray(0, 5).equals(Buffer.from("%PDF-"))) failures.push(`Harris County Texas source PDF does not have a PDF header: ${relativePath}.`);
  if (/fake placeholder|placeholder pdf|todo source|replace this file|not the real source/i.test(content.toString("latin1", 0, Math.min(content.length, 4096)))) {
    failures.push(`Harris County Texas source PDF appears to be a fake placeholder: ${relativePath}.`);
  }
}

function assertHtml(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) return;
  const content = fs.readFileSync(absolutePath, "utf8");
  if (content.trim().length < 1024) failures.push(`Harris County Texas source HTML/template is unexpectedly small: ${relativePath}.`);
  if (!/<html[\s>]/i.test(content) && !/<form[\s>]/i.test(content) && !/<article[\s>]/i.test(content)) {
    failures.push(`Harris County Texas source HTML/template does not look like HTML/template material: ${relativePath}.`);
  }
  if (/fake placeholder|placeholder html|todo source|replace this file|not the real source/i.test(content)) {
    failures.push(`Harris County Texas source HTML/template appears to be a fake placeholder: ${relativePath}.`);
  }
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
