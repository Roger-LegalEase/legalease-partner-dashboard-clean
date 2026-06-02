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

const requiredPaymentFields = [
  "selectedPackageId",
  "selectedPackageName",
  "paymentStatus",
  "provisioningStatus",
  "stripeCheckoutSessionId",
  "stripeCustomerId",
  "stripePaymentIntentId",
  "paidAt",
  "paymentAmount",
  "paymentCurrency"
];
const requiredSqlFields = [
  "selected_package_id",
  "selected_package_name",
  "payment_status",
  "provisioning_status",
  "stripe_checkout_session_id",
  "stripe_customer_id",
  "stripe_payment_intent_id",
  "paid_at",
  "payment_amount",
  "payment_currency"
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
const typesSource = readSource("src/lib/partners/types.ts");
const repositorySource = readSource("src/lib/partners/partner-repository.ts");
const packagesSource = readSource("src/lib/partners/packages.ts");
const checkoutSource = readSource("src/app/api/partners/checkout/route.ts");
const webhookSource = readSource("src/app/api/stripe/webhook/route.ts");
const serviceSource = readSource("src/lib/partners/partner-service.ts");
const setupSql = readSource("supabase/partner-journey-os.sql");
const migrationSql = readSource("supabase/phase-13-paid-provisioning.sql");

for (const field of requiredPaymentFields) {
  if (!typesSource.includes(field)) {
    failures.push(`Missing payment/provisioning model field: ${field}.`);
  }
}

for (const field of requiredSqlFields) {
  if (!setupSql.includes(field) || !migrationSql.includes(field)) {
    failures.push(`Missing payment/provisioning SQL field: ${field}.`);
  }
}

for (const status of ["unpaid", "checkout_started", "paid", "failed", "refunded"]) {
  if (!typesSource.includes(status)) {
    failures.push(`Missing payment status: ${status}.`);
  }
}

for (const status of [
  "blocked_payment_required",
  "ready_for_onboarding",
  "onboarding_started",
  "provisioning_in_progress",
  "provisioned"
]) {
  if (!typesSource.includes(status)) {
    failures.push(`Missing provisioning status: ${status}.`);
  }
}

if (!packagesSource.includes("Full Access Program")) {
  failures.push("Full Access Program public naming is missing.");
}

if (!packagesSource.includes("STRIPE_PRICE_COUNTY_ACCESS_PROGRAM")) {
  failures.push("Internal STRIPE_PRICE_COUNTY_ACCESS_PROGRAM compatibility is missing.");
}

if (!checkoutSource.includes("packageName") || !checkoutSource.includes("checkout_started")) {
  failures.push("Checkout creation does not record package name and checkout_started state.");
}

if (!serviceSource.includes("void searchParams") || serviceSource.includes("searchParams.paid")) {
  failures.push("Onboarding/payment gate appears to trust query params.");
}

if (!webhookSource.includes("checkout.session.completed") || !webhookSource.includes("activatePaidPartnerProvisioning")) {
  failures.push("Webhook activation path is not configured.");
}

if (!webhookSource.includes('session.payment_status !== "paid"')) {
  failures.push("Webhook handler does not require paid Stripe session status.");
}

if (!repositorySource.includes('provisioning_status: "ready_for_onboarding"')) {
  failures.push("Paid state does not move provisioning to ready_for_onboarding.");
}

const envLocalTracked = isGitTracked(".env.local");
if (envLocalTracked) {
  failures.push(".env.local is tracked by git.");
}

if (!isGitIgnored(".env.local")) {
  failures.push(".env.local is not ignored by git.");
}

const trackedSecretsFound = trackedSecretsAppearInTrackedFiles();
if (trackedSecretsFound) {
  failures.push("Stripe or Supabase secret values appear in tracked files.");
}

failures.push(...verifyDashboardProductBoundary());

if (failures.length > 0) {
  console.error("Paid provisioning verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Paid provisioning verification passed.");
console.log("Payment gate: enabled");
console.log("Webhook activation path: configured");
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

  if (productNames.length !== approvedProductModules.length) {
    boundaryFailures.push("Dashboard product module count does not match the approved record-clearing boundary.");
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

function isGitIgnored(file) {
  const result = spawnSync("git", ["check-ignore", "-q", file], {
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
