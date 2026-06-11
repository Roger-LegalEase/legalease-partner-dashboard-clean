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

const pageSource = readSource("src/app/request-pilot/page.tsx");
const formSource = readSource("src/app/request-pilot/RequestPilotForm.tsx");
const routeSource = readSource("src/app/api/request-pilot/route.ts");
const migrationSource = readSource("supabase/phase-23-partner-pilot-requests.sql");
const dashboardSource = readSource("src/app/partner/dashboard/page.tsx");

const { validatePilotRequestPayload } = loadTsModule(path.join(rootDir, "src/lib/request-pilot/validation.ts"));
const { checkPilotRequestRateLimit, resetPilotRequestRateLimitForTests, pilotRequestRateLimit } = loadTsModule(
  path.join(rootDir, "src/lib/request-pilot/rate-limit.ts")
);

verifyPageAndClientBoundary();
verifyValidation();
verifyRateLimit();
verifyApiBoundary();
verifyMigration();
verifyDashboardBoundary();

if (failures.length > 0) {
  console.error("Request pilot intake verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Request pilot intake verification passed.");
console.log("Form route: configured");
console.log("Client Supabase boundary: preserved");
console.log("API validation: configured");
console.log("Honeypot: configured");
console.log("Rate limiting: configured");
console.log("Migration RLS with zero policies: configured");
console.log("No inserted row data returned by API source.");

function verifyPageAndClientBoundary() {
  for (const marker of [
    "Request a Partner Program pilot",
    "civic, workforce, reentry, clinic, funder, and record-clearing",
    "RequestPilotForm"
  ]) {
    if (!pageSource.includes(marker)) {
      failures.push(`/request-pilot page is missing marker: ${marker}.`);
    }
  }

  for (const marker of [
    "contact_name",
    "organization_name",
    "organization_type",
    "state_or_jurisdiction",
    "community_served",
    "consent_to_contact",
    "company_website",
    'fetch("/api/request-pilot"'
  ]) {
    if (!formSource.includes(marker)) {
      failures.push(`Request pilot form is missing marker: ${marker}.`);
    }
  }

  for (const forbidden of ["@/lib/supabase", "getSupabaseAdminClient", "SUPABASE_SERVICE_ROLE_KEY", ".from("]) {
    if (pageSource.includes(forbidden) || formSource.includes(forbidden)) {
      failures.push(`/request-pilot client/page source includes forbidden Supabase marker: ${forbidden}.`);
    }
  }
}

function verifyValidation() {
  const validPayload = {
    contact_name: "  Ada Lovelace ",
    organization_name: " Civic Partner ",
    email: " ADA@EXAMPLE.ORG ",
    organization_type: "Community nonprofit",
    state_or_jurisdiction: "Mississippi",
    community_served: "Justice-impacted residents seeking record-clearing support.",
    interested_workflow: "Partner dashboard only",
    consent_to_contact: true
  };

  const valid = validatePilotRequestPayload(validPayload);
  if (!valid.ok || valid.honeypot || valid.data.email !== "ada@example.org" || valid.data.contact_name !== "Ada Lovelace") {
    failures.push("Validation did not trim and normalize a valid request.");
  }

  const missing = validatePilotRequestPayload({ contact_name: "Ada", consent_to_contact: true });
  if (missing.ok || !missing.error) {
    failures.push("Validation did not reject missing required fields.");
  }

  const invalidEmail = validatePilotRequestPayload({ ...validPayload, email: "not-an-email" });
  if (invalidEmail.ok || !invalidEmail.error) {
    failures.push("Validation did not reject invalid email.");
  }

  const missingConsent = validatePilotRequestPayload({ ...validPayload, consent_to_contact: false });
  if (missingConsent.ok || !missingConsent.error) {
    failures.push("Validation did not reject missing consent.");
  }

  const overlong = validatePilotRequestPayload({ ...validPayload, contact_name: "x".repeat(121) });
  if (overlong.ok || !overlong.error) {
    failures.push("Validation did not reject overlong fields.");
  }

  const honeypot = validatePilotRequestPayload({ ...validPayload, company_website: "https://spam.example" });
  if (!honeypot.ok || !honeypot.honeypot) {
    failures.push("Validation did not identify honeypot submissions.");
  }
}

function verifyRateLimit() {
  resetPilotRequestRateLimitForTests();
  for (let index = 0; index < pilotRequestRateLimit.maxAttempts; index += 1) {
    const result = checkPilotRequestRateLimit("203.0.113.10", 1000);
    if (!result.ok) {
      failures.push("Rate limiter rejected before the configured max attempts.");
      return;
    }
  }

  const blocked = checkPilotRequestRateLimit("203.0.113.10", 1000);
  if (blocked.ok || !blocked.retryAfterSeconds) {
    failures.push("Rate limiter did not reject repeated requests.");
  }
}

function verifyApiBoundary() {
  for (const marker of [
    "getSupabaseAdminClient",
    'from("partner_pilot_requests")',
    "validatePilotRequestPayload",
    "checkPilotRequestRateLimit",
    "checkSharedPilotRequestRateLimit",
    "derivePilotRequestRateLimitBucket",
    "maxPayloadBytes",
    "content-type",
    "content-length",
    "user-agent",
    "referer",
    "rate_limit_shared_allowed",
    "rate_limit_shared_blocked",
    'source: "legaleasepartner.com"',
    'NextResponse.json({ ok: true })'
  ]) {
    if (!routeSource.includes(marker)) {
      failures.push(`/api/request-pilot is missing marker: ${marker}.`);
    }
  }

  for (const forbidden of [".select(", "console.log", "console.info", "console.error", "return NextResponse.json({ ok: true, data", "return NextResponse.json({ ok: true, request"]) {
    if (routeSource.includes(forbidden)) {
      failures.push(`/api/request-pilot includes forbidden marker: ${forbidden}.`);
    }
  }
}

function verifyMigration() {
  if (!/create table if not exists public\.partner_pilot_requests/i.test(migrationSource)) {
    failures.push("Migration does not create public.partner_pilot_requests.");
  }

  if (!/alter table public\.partner_pilot_requests enable row level security/i.test(migrationSource)) {
    failures.push("Migration does not enable RLS on partner_pilot_requests.");
  }

  for (const column of [
    "contact_name text not null",
    "organization_name text not null",
    "email text not null",
    "consent_to_contact boolean not null default false",
    "source text not null default 'legaleasepartner.com'",
    "status text not null default 'new'",
    "user_agent text",
    "referrer text"
  ]) {
    if (!migrationSource.includes(column)) {
      failures.push(`Migration is missing column definition: ${column}.`);
    }
  }

  for (const forbidden of ["create policy", "alter policy", "drop policy", " grant ", "anon", "authenticated"]) {
    if (migrationSource.toLowerCase().includes(forbidden)) {
      failures.push(`Migration includes forbidden policy/grant marker: ${forbidden}.`);
    }
  }
}

function verifyDashboardBoundary() {
  for (const forbidden of ["partner_pilot_requests", "getSupabaseAdminClient", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (dashboardSource.includes(forbidden)) {
      failures.push(`Partner dashboard source includes forbidden request-pilot/admin marker: ${forbidden}.`);
    }
  }
}

function readSource(file) {
  return fs.readFileSync(path.join(rootDir, file), "utf8");
}

function loadTsModule(filename) {
  const resolved = path.resolve(filename);
  const cached = moduleCache.get(resolved);
  if (cached) {
    return cached.exports;
  }

  const source = fs.readFileSync(resolved, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    },
    fileName: resolved
  }).outputText;

  const mod = new Module(resolved);
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  moduleCache.set(resolved, mod);
  mod._compile(output, resolved);
  return mod.exports;
}
