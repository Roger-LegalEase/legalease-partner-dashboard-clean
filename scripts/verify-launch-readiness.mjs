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
const productionDomain = "www.legaleasepartner.com";
const productionUrl = `https://${productionDomain}`;
const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ENABLE_SUPABASE_PARTNER_DATA",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "STRIPE_PRICE_STARTER_ACCESS_PROGRAM",
  "STRIPE_PRICE_COMMUNITY_ACCESS_PROGRAM",
  "STRIPE_PRICE_COUNTY_ACCESS_PROGRAM",
  "ENABLE_PARTNER_EMAIL_DELIVERY",
  "PARTNER_EMAIL_PROVIDER",
  "RESEND_API_KEY",
  "PARTNER_EMAIL_FROM",
  "PARTNER_EMAIL_REPLY_TO",
  "INTERNAL_LEGALEASE_NOTIFICATIONS_EMAIL",
  "INTERNAL_ADMIN_ACCESS_TOKEN",
  "PARTNER_PREVIEW_ACCESS_TOKEN"
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
const appUrlSource = readSource("src/lib/app-url.ts");
const envExampleSource = readSource(".env.example");
const proxySource = readSource("src/proxy.ts");
const landingDataSource = readSource("src/lib/partners/landing-page.ts");
const routesSource = readSource("src/lib/partners/routes.ts");
const deploymentDocSource = readSource("docs/PHASE_17_PRODUCTION_DEPLOYMENT.md");
const independenceDocSource = readSource("docs/RCAP_INDEPENDENCE.md");
const emailServiceSource = readSource("src/lib/email/email-service.ts");
const packagesSource = readSource("src/lib/partners/packages.ts");

if (!appUrlSource.includes(productionUrl) || !appUrlSource.includes("NEXT_PUBLIC_APP_URL")) {
  failures.push("NEXT_PUBLIC_APP_URL production domain support is missing.");
}

if (!envExampleSource.includes(`NEXT_PUBLIC_APP_URL=${productionUrl}`)) {
  failures.push(".env.example does not include the LegalEasePartner production app URL.");
}

for (const key of requiredEnvKeys) {
  if (!envExampleSource.includes(`${key}=`)) {
    failures.push(`.env.example is missing ${key}.`);
  }
}

if (envExampleContainsRealSecrets(envExampleSource)) {
  failures.push(".env.example appears to contain real secret values.");
}

if (!deploymentDocSource.includes(productionUrl) || !deploymentDocSource.includes(`${productionUrl}/api/stripe/webhook`)) {
  failures.push("Production domain or Stripe webhook endpoint is not documented.");
}

if (!fs.existsSync(path.join(rootDir, "docs/RCAP_INDEPENDENCE.md")) || !independenceDocSource.includes("/intake/[partnerSlug]")) {
  failures.push("RCAP independence documentation is missing or incomplete.");
}

if (!proxySource.includes("INTERNAL_ADMIN_ACCESS_TOKEN") || !proxySource.includes("Authorization") || !proxySource.includes("/internal/:path*")) {
  failures.push("Internal route protection is not configured.");
}

if (!proxySource.includes("NODE_ENV") || !proxySource.includes("production")) {
  failures.push("Internal route protection does not fail closed in production.");
}

if (!fs.existsSync(path.join(rootDir, "src/app/intake/[partnerSlug]/page.tsx"))) {
  failures.push("RCAP intake placeholder route is missing.");
}

if (!fs.existsSync(path.join(rootDir, "src/app/documents/[partnerSlug]/page.tsx"))) {
  failures.push("Document generator placeholder route is missing.");
}

const intakeSource = readSource("src/app/intake/[partnerSlug]/page.tsx");
const documentsSource = readSource("src/app/documents/[partnerSlug]/page.tsx");
for (const [label, source] of [["intake", intakeSource], ["documents", documentsSource]]) {
  if (!source.includes("does not provide legal advice") || !source.includes("does not guarantee eligibility or outcomes")) {
    failures.push(`${label} placeholder is missing the required disclaimer.`);
  }
}

if (!landingDataSource.includes("partnerIntake(partner.partnerSlug)") || !routesSource.includes("partnerIntake")) {
  failures.push("Partner landing page CTAs do not default to RCAP-native intake routes.");
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

if (!emailServiceSource.includes("ENABLE_PARTNER_EMAIL_DELIVERY") || !envExampleSource.includes("ENABLE_PARTNER_EMAIL_DELIVERY=false")) {
  failures.push("Live email sending is not disabled by default.");
}

if (!packagesSource.includes("Full Access Program")) {
  failures.push("Full Access Program public naming is missing.");
}

if (!packagesSource.includes("STRIPE_PRICE_COUNTY_ACCESS_PROGRAM")) {
  failures.push("Internal STRIPE_PRICE_COUNTY_ACCESS_PROGRAM compatibility is missing.");
}

const envLocalTracked = isGitTracked(".env.local");
if (envLocalTracked) {
  failures.push(".env.local is tracked by git.");
}

const trackedSecretsFound = trackedSecretsAppearInTrackedFiles();
if (trackedSecretsFound) {
  failures.push("Stripe, Supabase, or Resend secret values appear in tracked files.");
}

failures.push(...verifyDashboardProductBoundary());

if (failures.length > 0) {
  console.error("Partner Journey OS launch readiness verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Partner Journey OS launch readiness verification passed.");
console.log(`Production domain: ${productionDomain}`);
console.log("RCAP independence: documented");
console.log("Internal route protection: configured");
console.log("RCAP intake placeholder: configured");
console.log("Document generator placeholder: configured");
console.log("Partner CTAs: RCAP-native");
console.log("Live email default: disabled");
console.log(`.env.local tracked: ${envLocalTracked ? "yes" : "no"}`);
console.log(`Tracked secrets found: ${trackedSecretsFound ? "yes" : "no"}`);
console.log("Dashboard product boundary: record-clearing only");

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
    process.env.RESEND_API_KEY
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
