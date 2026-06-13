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
const approvedProductModules = [
  "Wilma Intake",
  "RecordShield",
  "Expungement.ai",
  "Partner Dashboard",
  "Weekly Reports",
  "Final Impact Report"
];
const bannedProductModules = ["StartApart", "ClaimCoach"];

loadLocalEnv();

const failures = [];
const intakeRoutePath = "src/app/intake/[partnerSlug]/page.tsx";
const intakeClientPath = "src/app/intake/[partnerSlug]/RcapWilmaIntakeChat.tsx";
const summaryPath = "src/lib/rcap-intake/pathway-summary.ts";
const questionsPath = "src/lib/rcap-intake/questions.ts";
const repositoryPath = "src/lib/rcap-intake/repository.ts";
const typesPath = "src/lib/rcap-intake/types.ts";
const migrationPath = "supabase/phase-18-rcap-wilma-intake.sql";
const docsPath = "docs/PHASE_18_RCAP_WILMA_INTAKE.md";
const landingSource = readSource("src/lib/partners/landing-page.ts");
const packagesSource = readSource("src/lib/partners/packages.ts");

for (const requiredPath of [
  intakeRoutePath,
  intakeClientPath,
  "src/app/api/rcap/intake/start/route.ts",
  "src/app/api/rcap/intake/respond/route.ts",
  "src/app/api/rcap/intake/complete/route.ts",
  "src/app/api/rcap/intake/[sessionId]/route.ts",
  summaryPath,
  questionsPath,
  repositoryPath,
  typesPath,
  migrationPath,
  docsPath
]) {
  if (!fs.existsSync(path.join(rootDir, requiredPath))) {
    failures.push(`Missing Phase 18 file: ${requiredPath}.`);
  }
}

const intakeRouteSource = readSource(intakeRoutePath);
const intakeClientSource = readSource(intakeClientPath);
const summarySource = readSource(summaryPath);
const questionsSource = readSource(questionsPath);
const repositorySource = readSource(repositoryPath);
const typesSource = readSource(typesPath);
const migrationSource = readSource(migrationPath);
const docsSource = readSource(docsPath);

if (!intakeRouteSource.includes("getPartnerRecordBySlug") || !intakeRouteSource.includes("buildPartnerLandingPageData")) {
  failures.push("Partner intake route does not load partner-specific context.");
}

if (!intakeClientSource.includes("/api/rcap/intake/start") || !intakeClientSource.includes("/api/rcap/intake/respond") || !intakeClientSource.includes("/api/rcap/intake/complete")) {
  failures.push("Guided intake flow is not connected to the RCAP intake APIs.");
}

for (const questionSignal of [
  "old_arrest",
  "charged_not_convicted",
  "past_conviction",
  "not_sure_what_shows",
  "background_check_concern",
  "case_outcome",
  "has_documents",
  "needs_record_check",
  "contact_information"
]) {
  if (!questionsSource.includes(questionSignal)) {
    failures.push(`Guided intake question flow is missing ${questionSignal}.`);
  }
}

if (!repositorySource.includes("getSupabaseAdminClient") || !repositorySource.includes("rcap_intake_sessions") || !repositorySource.includes("rcap_intake_responses")) {
  failures.push("Intake persistence does not use the server-side Supabase repository path.");
}

if (!migrationSource.includes("create table if not exists rcap_intake_sessions") || !migrationSource.includes("create table if not exists rcap_intake_responses")) {
  failures.push("Supabase intake session/response schema is missing.");
}

if (migrationSource.toLowerCase().includes("ssn") && !migrationSource.includes("No SSN")) {
  failures.push("Migration appears to collect SSN.");
}

if (/\bdate_of_birth\b|\bdob\b/i.test(migrationSource + intakeClientSource + repositorySource)) {
  failures.push("Phase 18 should not collect date of birth.");
}

if (/upload|document generator|generate document|petition/i.test(intakeClientSource + repositorySource + summarySource)) {
  failures.push("Document generation or upload behavior appears in the intake implementation.");
}

if (!typesSource.includes("This tool does not provide legal advice and does not guarantee eligibility or outcomes.")) {
  failures.push("Required legal disclaimer language is missing.");
}

if (!intakeClientSource.includes("legalDisclaimerAccepted") || !repositorySource.includes("legalDisclaimerAccepted")) {
  failures.push("Disclaimer acknowledgment is not required before intake starts.");
}

for (const unsafePhrase of ["You are eligible", "You qualify", "Your record can be cleared", "We guarantee"]) {
  if ((summarySource + intakeClientSource).includes(unsafePhrase)) {
    failures.push(`Unsafe legal outcome phrase appears in intake flow: ${unsafePhrase}.`);
  }
}

if (!summarySource.includes("may") || !summarySource.includes("possible") || !summarySource.includes("review")) {
  failures.push("Pathway summary rules do not use safe non-determinative language.");
}

if (/openai|anthropic|chatcompletion|responses\.create|AI_PROVIDER|LLM/i.test(intakeRouteSource + intakeClientSource + repositorySource + summarySource)) {
  failures.push("Live AI/LLM dependency appears in the default RCAP intake path.");
}

if (!landingSource.includes("partnerIntake(partner.partnerSlug)")) {
  failures.push("Partner landing page CTAs do not route to /intake/[partnerSlug].");
}

if ((intakeRouteSource + intakeClientSource + repositorySource + summarySource).toLowerCase().includes("expungement.ai")) {
  failures.push("RCAP intake depends on Expungement.ai naming or routing.");
}

const { seedPartners } = loadTsModule(path.join(rootDir, "src/lib/partners/seed-partners.ts"));
const { buildPartnerLandingPageData } = loadTsModule(path.join(rootDir, "src/lib/partners/landing-page.ts"));
for (const slug of ["we-must-vote", "fulton-county", "demo-partner"]) {
  const partner = seedPartners.find((record) => record.partnerSlug === slug);
  const pageData = partner ? buildPartnerLandingPageData(partner) : null;
  if (pageData?.primaryCtaHref !== `/intake/${slug}`) {
    failures.push(`Partner CTA for ${slug} is not RCAP-native.`);
  }
}

const { generateRcapPathwaySummary } = loadTsModule(path.join(rootDir, summaryPath));
const possibleSummary = generateRcapPathwaySummary({
  id: "00000000-0000-0000-0000-000000000000",
  partnerSlug: "demo-partner",
  status: "completed",
  currentStep: "completed",
  recordType: "charged_not_convicted",
  caseOutcome: "dismissed",
  hasDocuments: true,
  needsRecordCheck: false,
  legalDisclaimerAccepted: true
});
if (possibleSummary.eligibilitySignal !== "possible_pathway" || !possibleSummary.disclaimer.includes("does not provide legal advice")) {
  failures.push("Deterministic pathway summary generator did not return the expected safe signal.");
}

if (!packagesSource.includes("Full Access Program")) {
  failures.push("Full Access Program public naming is missing.");
}


if (envExampleContainsRealSecrets(readSource(".env.example"))) {
  failures.push(".env.example appears to contain real secret values.");
}

if (!docsSource.includes("RCAP document generator") || !docsSource.includes("Command Center integration") || !docsSource.includes("CRM integration")) {
  failures.push("Phase 18 docs are missing known not-yet-built items.");
}

const envLocalTracked = isGitTracked(".env.local");
if (envLocalTracked) {
  failures.push(".env.local is tracked by git.");
}

const trackedSecretsFound = trackedSecretsAppearInTrackedFiles();
if (trackedSecretsFound) {
  failures.push("Stripe, Supabase, Resend, or AI provider secret values appear in tracked files.");
}

failures.push(...verifyDashboardProductBoundary());

if (failures.length > 0) {
  console.error("RCAP Wilma intake verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("RCAP Wilma intake verification passed.");
console.log("Partner intake route: configured");
console.log("Guided intake flow: configured");
console.log("Pathway summary: deterministic");
console.log("Legal disclaimer: configured");
console.log("Expungement.ai dependency: none");
console.log("Document generation: not enabled");
console.log(`.env.local tracked: ${envLocalTracked ? "yes" : "no"}`);
console.log(`Tracked secrets found: ${trackedSecretsFound ? "yes" : "no"}`);
console.log("Dashboard product boundary: record-clearing only");

function verifyDashboardProductBoundary() {
  const boundaryFailures = [];
  const dashboardDataPath = path.join(rootDir, "src/lib/partner-dashboard-data.ts");
  const source = fs.readFileSync(dashboardDataPath, "utf8");
  const { productStarts } = loadTsModule(dashboardDataPath);
  const productNames = productStarts.map((product) => product.name);

  for (const banned of bannedProductModules) {
    if (source.includes(banned) || productNames.includes(banned)) {
      boundaryFailures.push(`${banned} appears in the partner dashboard product modules.`);
    }
  }

  const approvedSet = new Set(approvedProductModules);
  const productSet = new Set(productNames);
  const unexpectedProducts = productNames.filter((name) => !approvedSet.has(name));
  const missingProducts = approvedProductModules.filter((name) => !productSet.has(name));

  if (unexpectedProducts.length > 0) {
    boundaryFailures.push(`Unapproved dashboard product modules found: ${unexpectedProducts.join(", ")}.`);
  }

  if (missingProducts.length > 0) {
    boundaryFailures.push(`Approved dashboard product modules missing: ${missingProducts.join(", ")}.`);
  }

  return boundaryFailures;
}

function trackedSecretsAppearInTrackedFiles() {
  const secretValues = [
    process.env.STRIPE_SECRET_KEY,
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.RESEND_API_KEY,
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

function envExampleContainsRealSecrets(source) {
  const secretPatterns = [
    /sk_live_[A-Za-z0-9]/,
    /sk_test_[A-Za-z0-9]/,
    /pk_live_[A-Za-z0-9]/,
    /whsec_[A-Za-z0-9]/,
    /re_[A-Za-z0-9]{12,}/,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/
  ];

  return secretPatterns.some((pattern) => pattern.test(source));
}

function getTrackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: rootDir,
    encoding: "utf8"
  });
  const output = result.stdout ?? "";

  if (result.status !== 0 && output.length === 0) {
    throw result.error ?? new Error("Unable to list tracked git files.");
  }

  return output.split("\0").filter(Boolean);
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

  const envSource = fs.readFileSync(envPath, "utf8");
  for (const line of envSource.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
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
      return loadTsModule(path.join(rootDir, "src", request.slice(2)) + ".ts");
    }
    if (request.startsWith("./") || request.startsWith("../")) {
      const resolved = path.resolve(path.dirname(filePath), request);
      for (const extension of [".ts", ".tsx", ".js", ".mjs"]) {
        if (fs.existsSync(resolved + extension)) {
          return loadTsModule(resolved + extension);
        }
      }
    }
    return require(request);
  };
  mod._compile(compiled, filePath);
  return mod.exports;
}
