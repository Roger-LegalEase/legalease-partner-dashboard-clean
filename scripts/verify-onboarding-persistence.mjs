import { spawnSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleCache = new Map();
const onboardingFields = [
  "organizationName",
  "legalName",
  "primaryContactName",
  "primaryContactTitle",
  "primaryContactEmail",
  "primaryContactPhone",
  "programName",
  "programDescription",
  "targetState",
  "targetCounty",
  "targetCity",
  "serviceArea",
  "expectedMonthlyParticipants",
  "expectedLaunchDate",
  "referralSources",
  "audienceDescription",
  "brandingNotes",
  "logoUrl",
  "onboardingStatus",
  "onboardingStartedAt",
  "onboardingCompletedAt"
];
const onboardingSqlFields = [
  "organization_name",
  "legal_name",
  "primary_contact_name",
  "primary_contact_title",
  "primary_contact_email",
  "primary_contact_phone",
  "program_name",
  "program_description",
  "target_state",
  "target_county",
  "target_city",
  "service_area",
  "expected_monthly_participants",
  "expected_launch_date",
  "referral_sources",
  "audience_description",
  "branding_notes",
  "logo_url",
  "onboarding_status",
  "onboarding_started_at",
  "onboarding_completed_at"
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
let readbackConfirmed = false;
let reverted = false;

const typesSource = readSource("src/lib/partners/types.ts");
const repositorySource = readSource("src/lib/partners/partner-repository.ts");
const onboardingSource = readSource("src/lib/partners/onboarding.ts");
const routeSource = readSource("src/app/api/partners/onboarding/route.ts");
const packagesSource = readSource("src/lib/partners/packages.ts");
const setupSql = readSource("supabase/partner-journey-os.sql");
const migrationSql = readSource("supabase/phase-14-onboarding-persistence.sql");

for (const field of onboardingFields) {
  if (!typesSource.includes(field)) {
    failures.push(`Missing onboarding model field: ${field}.`);
  }
}

for (const field of onboardingSqlFields) {
  if (!setupSql.includes(field) || !migrationSql.includes(field)) {
    failures.push(`Missing onboarding SQL field: ${field}.`);
  }
}

for (const status of ["not_started", "in_progress", "submitted", "needs_review", "approved"]) {
  if (!typesSource.includes(status)) {
    failures.push(`Missing onboarding status: ${status}.`);
  }
}

if (!fs.existsSync(path.join(rootDir, "src/app/api/partners/onboarding/route.ts"))) {
  failures.push("Onboarding API route is missing.");
}

if (!routeSource.includes("partner.paymentStatus !== \"paid\"") || !repositorySource.includes("readiness.partner.paymentStatus !== \"paid\"")) {
  failures.push("Payment gate is not enforced for onboarding submission.");
}

if (!onboardingSource.includes("Organization name is required") || !onboardingSource.includes("Target state or service area is required")) {
  failures.push("Final-submit validation rules are missing.");
}

if (!repositorySource.includes("onboarding_status: onboardingStatus") || !repositorySource.includes("onboarding_completed_at")) {
  failures.push("Onboarding write path is not configured.");
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

if (failures.length === 0) {
  const liveResult = await verifyLiveOnboardingWrite();
  if (!liveResult.success) {
    failures.push(liveResult.message);
  }
}

if (failures.length > 0) {
  console.error("Partner onboarding persistence verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Partner onboarding persistence verification passed.");
console.log("Onboarding write path: configured");
console.log("Payment gate: enforced");
console.log("Paid partner submission: verified");
console.log(`Readback confirmed: ${readbackConfirmed ? "yes" : "no"}`);
console.log(`Reverted: ${reverted ? "yes, if applicable" : "no"}`);
console.log("Full Access public naming: configured");
console.log(`.env.local tracked: ${envLocalTracked ? "yes" : "no"}`);
console.log(`Tracked secrets found: ${trackedSecretsFound ? "yes" : "no"}`);
console.log("Dashboard product boundary: record-clearing only");

async function verifyLiveOnboardingWrite() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, message: "Supabase env is missing for onboarding persistence verification." };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const selectColumns = [
    "payment_status",
    "provisioning_status",
    ...onboardingSqlFields
  ].join(", ");

  const { data: original, error: readError } = await supabase
    .from("partner_records")
    .select(selectColumns)
    .eq("partner_slug", "demo-partner")
    .maybeSingle();

  if (readError || !original) {
    return { success: false, message: `Onboarding read setup failed: ${readError?.message ?? "demo-partner missing"}.` };
  }

  const submittedAt = new Date().toISOString();
  const update = {
    payment_status: "paid",
    provisioning_status: "ready_for_onboarding",
    organization_name: "Demo Justice Access Partner Phase 14 Verification",
    legal_name: "Demo Justice Access Partner",
    primary_contact_name: "Avery Coleman",
    primary_contact_title: "Program Director",
    primary_contact_email: "avery.coleman@example.org",
    primary_contact_phone: "555-0100",
    program_name: "Phase 14 Verification Program",
    program_description: "Temporary onboarding verification update.",
    target_state: "GA",
    target_county: "Fulton County",
    target_city: "Atlanta",
    service_area: "Fulton County, GA",
    expected_monthly_participants: 25,
    expected_launch_date: "2026-07-15",
    referral_sources: "Verification referrals",
    audience_description: "Verification audience",
    branding_notes: "Verification branding notes",
    logo_url: "https://example.org/logo.png",
    onboarding_status: "submitted",
    onboarding_started_at: original.onboarding_started_at ?? submittedAt,
    onboarding_completed_at: submittedAt
  };

  const { error: writeError } = await supabase
    .from("partner_records")
    .update(update)
    .eq("partner_slug", "demo-partner");

  if (writeError) {
    return { success: false, message: `Onboarding write failed: ${writeError.message}.` };
  }

  const { data: readback, error: readbackError } = await supabase
    .from("partner_records")
    .select("organization_name, onboarding_status, target_state, service_area")
    .eq("partner_slug", "demo-partner")
    .maybeSingle();

  readbackConfirmed = Boolean(
    !readbackError &&
      readback?.organization_name === update.organization_name &&
      readback?.onboarding_status === "submitted" &&
      readback?.target_state === "GA" &&
      readback?.service_area === "Fulton County, GA"
  );

  const restore = {};
  for (const key of Object.keys(original)) {
    restore[key] = original[key] ?? null;
  }

  const { error: restoreError } = await supabase
    .from("partner_records")
    .update(restore)
    .eq("partner_slug", "demo-partner");

  reverted = !restoreError;

  if (!readbackConfirmed) {
    return { success: false, message: `Onboarding readback failed: ${readbackError?.message ?? "values did not match"}.` };
  }

  if (restoreError) {
    return { success: false, message: `Onboarding verification wrote data but restore failed: ${restoreError.message}.` };
  }

  return { success: true, message: "Onboarding live write/readback verified." };
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
