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
const requiredTemplateInputs = [
  "partnerSlug",
  "partnerName",
  "organizationName",
  "partnerLogoUrl",
  "legaleaseLogoUrl",
  "state",
  "counties",
  "serviceArea",
  "programName",
  "programDescription",
  "eyebrow",
  "landingPageHeadline",
  "landingPageSubheadline",
  "primaryCtaLabel",
  "primaryCtaHref",
  "secondaryCtaLabel",
  "secondaryCtaHref",
  "trustLine",
  "trustChips",
  "heroImageUrl",
  "helpItems",
  "promiseItems",
  "quoteText",
  "quoteAttribution",
  "comparisonColumns",
  "howItWorksSteps",
  "whatYouNeedItems",
  "faqItems",
  "finalCtaHeadline",
  "finalCtaBody",
  "finalCtaImageUrl",
  "brandColor",
  "accentColor"
];
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
const templateSource = readSource("src/components/partners/PartnerLandingPageTemplate.tsx");
const landingDataSource = readSource("src/lib/partners/landing-page.ts");
const routeSource = readSource("src/app/p/[partnerSlug]/page.tsx");
const packagesSource = readSource("src/lib/partners/packages.ts");

for (const input of requiredTemplateInputs) {
  if (!templateSource.includes(input)) {
    failures.push(`Missing template input: ${input}.`);
  }
}

for (const section of ["If you do not know where to start", "The promise", "Compare your options", "How it works", "What you'll need", "FAQ", "finalCtaHeadline"]) {
  if (!templateSource.toLowerCase().includes(section.toLowerCase())) {
    failures.push(`Template is missing reference section signal: ${section}.`);
  }
}

if (!routeSource.includes("getPartnerRecordBySlug") || !routeSource.includes("PartnerLandingPageTemplate")) {
  failures.push("/p/[partnerSlug] does not use the dynamic partner landing template.");
}

if (!landingDataSource.includes("Mississippi") || !landingDataSource.includes("Fulton County")) {
  failures.push("Landing page data does not include Mississippi and Fulton County geography handling.");
}

for (const partnerSlug of ["we-must-vote", "fulton-county"]) {
  if (!landingDataSource.includes(partnerSlug)) {
    failures.push(`Landing page data is missing partner-specific support for ${partnerSlug}.`);
  }
}

const { seedPartners } = loadTsModule(path.join(rootDir, "src/lib/partners/seed-partners.ts"));
const { buildPartnerLandingPageData } = loadTsModule(path.join(rootDir, "src/lib/partners/landing-page.ts"));
for (const partnerSlug of ["we-must-vote", "fulton-county", "demo-partner"]) {
  const partner = seedPartners.find((record) => record.partnerSlug === partnerSlug);
  const pageData = partner ? buildPartnerLandingPageData(partner) : null;
  if (!pageData?.landingPageHeadline || !pageData?.counties?.length) {
    failures.push(`Landing page data did not build for ${partnerSlug}.`);
  }
}

for (const assetPath of [
  "public/assets/partners/README.md",
  "public/assets/partners/wemustvote/.gitkeep",
  "public/assets/partners/legalease/.gitkeep"
]) {
  if (!fs.existsSync(path.join(rootDir, assetPath))) {
    failures.push(`Missing public asset structure: ${assetPath}.`);
  }
}

if (!fs.existsSync(path.join(rootDir, "docs/reference/wemustvote-landing-reference.html"))) {
  failures.push("Missing We Must Vote reference landing page file.");
}

if (!packagesSource.includes("Full Access Program")) {
  failures.push("Full Access Program public naming is missing.");
}


const envLocalTracked = isGitTracked(".env.local");
if (envLocalTracked) {
  failures.push(".env.local is tracked by git.");
}

const trackedSecretsFound = trackedSecretsAppearInTrackedFiles();
if (trackedSecretsFound) {
  failures.push("Stripe or Supabase secret values appear in tracked files.");
}

failures.push(...verifyDashboardProductBoundary());

if (failures.length > 0) {
  console.error("Partner landing page verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Partner landing page verification passed.");
console.log("Dynamic template: configured");
console.log("We Must Vote Mississippi version: configured");
console.log("Fulton County Georgia version: configured");
console.log("Demo partner version: configured");
console.log("Partner asset fallbacks: configured");
console.log("Full Access public naming: configured");
console.log("Internal Stripe compatibility: preserved");
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
    process.env.SUPABASE_SERVICE_ROLE_KEY
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

function isGitTracked(file) {
  const result = spawnSync("git", ["ls-files", "--error-unmatch", file], {
    cwd: rootDir,
    encoding: "utf8"
  });

  return result.status === 0;
}

function readSource(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquote(trimmed.slice(separatorIndex + 1).trim());
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) {
    return cached.exports;
  }

  const source = fs.readFileSync(resolved, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const mod = new Module(resolved);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod.require = (request) => {
    const nextFile = resolveTsRequest(request, path.dirname(resolved));
    return nextFile ? loadTsModule(nextFile) : require(request);
  };
  mod._compile(transpiled, resolved);
  return mod.exports;
}

function resolveTsRequest(request, basedir) {
  if (request.startsWith("@/")) {
    return path.join(rootDir, "src", `${request.slice(2)}.ts`);
  }

  if (request.startsWith(".")) {
    const candidate = path.resolve(basedir, request);
    for (const extension of [".ts", ".tsx", ".js"]) {
      if (fs.existsSync(`${candidate}${extension}`)) {
        return `${candidate}${extension}`;
      }
    }
  }

  return null;
}
