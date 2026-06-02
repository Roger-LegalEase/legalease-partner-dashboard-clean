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
const requiredEmailTypes = [
  "payment_confirmation",
  "onboarding_next_steps",
  "launch_kit_ready",
  "dashboard_ready",
  "partner_page_ready",
  "internal_partner_notification",
  "weekly_report_ready",
  "final_report_ready"
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
const templatesSource = readSource("src/lib/email/templates.ts");
const serviceSource = readSource("src/lib/email/email-service.ts");
const typeSource = readSource("src/lib/email/email-types.ts");
const apiRouteSource = readSource("src/app/api/internal/partners/send-email/route.ts");
const repositorySource = readSource("src/lib/partners/partner-repository.ts");
const schemaSource = readSource("supabase/partner-journey-os.sql");
const migrationSource = readSource("supabase/phase-16-email-delivery.sql");
const packagesSource = readSource("src/lib/partners/packages.ts");

for (const emailType of requiredEmailTypes) {
  if (!templatesSource.includes(emailType) || !typeSource.includes(emailType)) {
    failures.push(`Missing supported email type: ${emailType}.`);
  }
}

for (const phrase of ["subject", "text", "html", "Required", "record-clearing access program"]) {
  if (!templatesSource.includes(phrase)) {
    failures.push(`Email templates are missing ${phrase}.`);
  }
}

if (!serviceSource.includes("ENABLE_PARTNER_EMAIL_DELIVERY") || !serviceSource.includes("dry_run")) {
  failures.push("Email service does not default through disabled/dry-run configuration.");
}

if (!serviceSource.includes("PARTNER_EMAIL_PROVIDER") || !serviceSource.includes("resend") || !serviceSource.includes("RESEND_API_KEY")) {
  failures.push("Resend provider foundation is missing or not optional.");
}

if (!serviceSource.includes("Live email delivery is disabled") || !serviceSource.includes("skipped")) {
  failures.push("Email service does not have a safe disabled-send path.");
}

if (!serviceSource.includes("addPartnerEmailDeliveryRecord")) {
  failures.push("Email service does not record delivery attempts.");
}

if (!apiRouteSource.includes("mode") || !apiRouteSource.includes("preview") || !apiRouteSource.includes("dry_run") || !apiRouteSource.includes("send")) {
  failures.push("Email send route does not support preview, dry_run, and send modes.");
}

if (!fs.existsSync(path.join(rootDir, "src/app/internal/partners/admin/[partnerSlug]/emails/page.tsx"))) {
  failures.push("Missing internal email template index route.");
}

if (!fs.existsSync(path.join(rootDir, "src/app/internal/partners/admin/[partnerSlug]/emails/[emailType]/page.tsx"))) {
  failures.push("Missing internal email template preview route.");
}

if (!fs.existsSync(path.join(rootDir, "src/app/internal/partners/admin/[partnerSlug]/emails/[emailType]/EmailDryRunButton.tsx"))) {
  failures.push("Missing internal dry-run action component.");
}

if (!schemaSource.includes("partner_email_deliveries") || !migrationSource.includes("partner_email_deliveries")) {
  failures.push("Email delivery records schema is missing.");
}

if (!repositorySource.includes("getPartnerEmailDeliveryRecords") || !repositorySource.includes("addPartnerEmailDeliveryRecord")) {
  failures.push("Email delivery repository read/write path is missing.");
}

if (!fs.existsSync(path.join(rootDir, "src/lib/email/delivery-hooks.ts"))) {
  failures.push("Safe email delivery hooks are missing.");
}

const deliveryHooksSource = readSource("src/lib/email/delivery-hooks.ts");
if (!deliveryHooksSource.includes("mode: \"dry_run\"")) {
  failures.push("Delivery hooks do not default to dry-run mode.");
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
  console.error("Partner email delivery verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Partner email delivery verification passed.");
console.log("Email templates: configured");
console.log("Dry-run mode: enabled");
console.log("Live sending default: disabled");
console.log("Email preview routes: configured");
console.log("Dry-run delivery path: configured");
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
