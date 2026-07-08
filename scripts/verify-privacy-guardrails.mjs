// Verifies the privacy guardrails of the first-party web analytics pipeline:
//  - raw IP is never stored (only a salted HMAC ip_hash)
//  - PII / criminal-record / payment keys are rejected or stripped
//  - no Supabase service-role key is reachable from client ("use client") code
//  - analytics failures never block DTC/partner user flows
//  - DNT is honored and surface is derived server-side

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(relativePath) {
  const full = path.join(rootDir, relativePath);
  if (!fs.existsSync(full)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(full, "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(relativePath, markers) {
  const source = read(relativePath);
  for (const marker of markers) {
    assert(source.includes(marker), `${relativePath} missing marker: ${marker}`);
  }
}

// 1. Raw IP is never stored — only a salted HMAC. The stored row exposes ip_hash, not ip.
assertIncludes("src/lib/analytics/build-event.ts", [
  "createHmac",
  "export function hashIp",
  "ip_hash: hashIp("
]);
// The salt is read server-side (route + server emitter) and passed into the hash, never hardcoded.
assertIncludes("src/app/api/analytics/web/route.ts", ["WEB_ANALYTICS_IP_SALT"]);
// hashIp returns null (never a weak hash) when the salt is missing.
assertIncludes("src/lib/analytics/build-event.ts", ["if (!trimmedIp || !salt)", "return null"]);
// The DB has an ip_hash column and comments that it is never the raw IP; it has no bare `ip` column.
assertIncludes("supabase/phase-40-web-analytics-events.sql", ["ip_hash text", "Never the raw IP"]);
const migration = read("supabase/phase-40-web-analytics-events.sql");
assert(!/^\s*ip\s+(text|inet)/m.test(migration), "migration must not define a raw ip column");

// 2. Forbidden PII / criminal-record / payment keys are dropped; PII strings redacted.
assertIncludes("src/lib/analytics/sanitize.ts", [
  "FORBIDDEN_META_KEY_FRAGMENTS",
  '"email"',
  '"phone"',
  '"ssn"',
  '"dob"',
  '"case"',
  '"charge"',
  '"conviction"',
  '"card"',
  '"stripe"',
  '"secret"',
  '"token"',
  "isForbiddenMetaKey",
  "redactText"
]);
// The sanitizer is actually applied to inbound metadata in the event builder.
assertIncludes("src/lib/analytics/build-event.ts", ["sanitizeEventMeta"]);

// 3. Server-only modules stay server-only; the browser bundle can't pull a service-role key.
for (const serverModule of [
  "src/lib/analytics/build-event.ts",
  "src/lib/analytics/web-analytics-repository.ts",
  "src/lib/analytics/server-events.ts"
]) {
  assertIncludes(serverModule, ['import "server-only"']);
}
// The browser tracker must not import any server-only analytics module or the supabase server client.
const client = read("src/lib/analytics/client.ts");
for (const forbiddenImport of ["build-event", "web-analytics-repository", "server-events", "supabase/server"]) {
  assert(!client.includes(forbiddenImport), `client.ts must not import server module: ${forbiddenImport}`);
}
// No service-role key reference anywhere in "use client" source.
scanClientFilesForServiceRoleKey();

// 4. Analytics never blocks a user flow.
assertIncludes("src/lib/analytics/web-analytics-repository.ts", ["NEVER throw", "catch"]);
assertIncludes("src/lib/analytics/server-events.ts", ["catch"]);
assertIncludes("src/app/api/analytics/web/route.ts", ["204", "must NEVER block"]);
assertIncludes("src/lib/analytics/client.ts", ["sendBeacon", "keepalive"]);
// The DTC checkout button fires analytics but still calls checkout regardless (fire-and-forget above
// the fetch, never awaited).
const checkout = read("src/app/expungement-ai/pay/ConsumerCheckoutButton.tsx");
assert(
  checkout.indexOf('trackFunnelEvent("checkout_started"') < checkout.indexOf('fetch("/api/expungement-ai/checkout"'),
  "checkout analytics must not gate the checkout request"
);
assert(!checkout.includes("await trackFunnelEvent"), "checkout analytics must be fire-and-forget (not awaited)");

// 4b. Server-confirmed events cannot be forged via the public beacon endpoint.
assertIncludes("src/lib/analytics/event-names.ts", ["SERVER_ONLY_EVENT_NAMES", '"checkout_completed"', "isServerOnlyEventName"]);
assertIncludes("src/app/api/analytics/web/route.ts", ["isServerOnlyEventName", "server_only_event"]);
// checkout_completed must be emitted only from the trusted server path, never the browser tracker.
assert(!read("src/lib/analytics/client.ts").includes("checkout_completed"), "client tracker must not emit checkout_completed");
assertIncludes("src/app/api/expungement-ai/payment/confirm/route.ts", ["recordServerFunnelEvent", '"checkout_completed"']);

// 5. DNT honored + surface derived server-side.
assertIncludes("src/lib/analytics/client.ts", ["doNotTrack", "analyticsEnabled"]);
assertIncludes("src/app/api/analytics/web/route.ts", ["x-forwarded-host"]);

// 6. Surface labels present for each domain so pageviews are attributable per surface.
assertIncludes("src/lib/analytics/product-surface.ts", [
  '"expungement.ai": "expungement_ai"',
  '"legalease.com": "legalease"',
  '"legaleasepartner.com": "legalease_partner"'
]);

report("verify-privacy-guardrails");

function scanClientFilesForServiceRoleKey() {
  const offenders = [];
  walk(path.join(rootDir, "src"), (file) => {
    if (!/\.(tsx?|jsx?)$/.test(file)) return;
    const source = fs.readFileSync(file, "utf8");
    const isClient = source.startsWith('"use client"') || source.startsWith("'use client'") ||
      /^\s*["']use client["']/.test(source);
    if (isClient && source.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      offenders.push(path.relative(rootDir, file));
    }
  });
  for (const offender of offenders) {
    failures.push(`service-role key referenced in client file: ${offender}`);
  }
}

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, onFile);
    else onFile(full);
  }
}

function report(name) {
  if (failures.length === 0) {
    console.log(`PASS ${name}: all privacy guardrail assertions passed.`);
    process.exit(0);
  }
  console.error(`FAIL ${name}: ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
