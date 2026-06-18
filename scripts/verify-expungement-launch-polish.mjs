import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function changedFiles() {
  const result = spawnSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
  return (result.stdout ?? "").split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim());
}

const packageSource = read("package.json");
const expungementLayout = exists("src/app/expungement-ai/layout.tsx") ? read("src/app/expungement-ai/layout.tsx") : "";
const contactPage = exists("src/app/expungement-ai/contact/page.tsx") ? read("src/app/expungement-ai/contact/page.tsx") : "";
const supportPage = exists("src/app/expungement-ai/support/page.tsx") ? read("src/app/expungement-ai/support/page.tsx") : "";
const supportForm = exists("src/components/expungement-ai/SupportRequestForm.tsx") ? read("src/components/expungement-ai/SupportRequestForm.tsx") : "";
const supportRoute = exists("src/app/api/expungement-ai/support/route.ts") ? read("src/app/api/expungement-ai/support/route.ts") : "";
const consumerNav = read("src/components/expungement-ai/ConsumerNav.tsx");
const briefcaseShell = read("src/components/expungement-ai/BriefcaseShell.tsx");
const packetReady = read("src/app/expungement-ai/packet-ready/page.tsx");
const packetDetail = read("src/app/briefcase/[packetId]/page.tsx");
const settingsView = read("src/components/expungement-ai/BriefcaseViews.tsx");
const readinessDoc = exists("docs/EXPUNGEMENT_AI_PRODUCTION_READINESS.md") ? read("docs/EXPUNGEMENT_AI_PRODUCTION_READINESS.md") : "";
const smokeDoc = exists("docs/EXPUNGEMENT_AI_MANUAL_SMOKE_TESTS.md") ? read("docs/EXPUNGEMENT_AI_MANUAL_SMOKE_TESTS.md") : "";
const consumerShell = read("src/components/expungement-ai/ConsumerPageShell.tsx");

assert(packageSource.includes('"expungement:verify-launch-polish"'), "Missing expungement:verify-launch-polish npm script.");
assert(exists("public/favicon.svg") || exists("public/favicon.ico") || exists("src/app/icon.tsx") || exists("src/app/favicon.ico"), "Favicon/app icon must exist.");
assert(exists("public/apple-touch-icon.svg") || exists("public/apple-touch-icon.png"), "Apple touch icon must exist.");
assert(expungementLayout.includes('title: "Expungement.ai"'), "Expungement.ai metadata title missing.");
assert(expungementLayout.includes("Self-help record-clearing packets and guidance"), "Expungement.ai metadata description missing.");
assert(expungementLayout.includes("openGraph") && expungementLayout.includes("hero-1500.jpg"), "Open Graph image metadata missing.");

assert(exists("src/app/expungement-ai/contact/page.tsx"), "Contact route missing.");
assert(exists("src/app/expungement-ai/support/page.tsx"), "Support route missing.");
assert(exists("src/app/api/expungement-ai/support/route.ts"), "Support API route missing.");
assert(contactPage.includes("ConsumerPageShell") && supportPage.includes("ConsumerPageShell"), "Contact/support pages must use the consumer shell.");
assert(contactPage.includes("Contact Expungement.ai"), "Contact headline missing.");
assert(contactPage.includes("info@legalease.law") && supportPage.includes("info@legalease.law"), "Support email must appear on contact/support pages.");
assert(contactPage.includes("907 W. Peace Street, Canton, MS 39046"), "Mailing address missing from contact page.");
assert(contactPage.includes("cannot provide legal advice") && supportPage.includes("cannot provide legal advice"), "Not legal advice language missing.");
assert(contactPage.includes("guarantee court outcomes") && supportPage.includes("Court approval is not guaranteed"), "No guaranteed outcome language missing.");
for (const label of ["Account or login", "Payment or receipt", "Packet download", "Briefcase", "Wilma", "Something else"]) {
  assert(supportPage.includes(label) || supportForm.includes(label), `Support topic missing: ${label}`);
}
assert(supportPage.includes("For urgent legal deadlines, contact a lawyer or the court directly."), "Urgent legal deadline support copy missing.");

assert(supportForm.includes('fetch("/api/expungement-ai/support"'), "Support form must post to isolated support API.");
assert(!supportForm.includes("process.env") && !supportForm.includes("SUPABASE") && !supportForm.includes("STRIPE"), "Support form must not expose server secrets/config.");
for (const field of ["category", "email", "briefcaseItemId", "message"]) {
  assert(supportRoute.includes(field), `Support route must accept ${field}.`);
}
assert(supportRoute.includes("sanitizeSupportMessage"), "Support route must sanitize messages.");
assert(supportRoute.includes("redacted-ssn") && supportRoute.includes("redacted-full-dob") && supportRoute.includes("redacted-full-address"), "Support route must redact SSN, full DOB, and full address patterns.");
assert(supportRoute.includes("dry_run") && supportRoute.includes("server-log-only"), "Support route must document dry-run/server-log-only behavior.");
assert(!supportRoute.includes("SUPABASE_SERVICE_ROLE_KEY") && !supportRoute.includes("STRIPE_SECRET") && !supportRoute.includes("process.env"), "Support route must not expose or depend on secrets.");
assert(!supportRoute.includes("@/lib/partners") && !supportRoute.includes("@/lib/supabase") && !supportRoute.includes("@/lib/stripe"), "Support route must stay isolated from partner/Supabase/Stripe systems.");

assert(consumerShell.includes("<WilmaBubble") && briefcaseShell.includes("<WilmaBubble"), "Wilma bubble must remain global on Expungement.ai and Briefcase shells.");
assert(consumerNav.includes("/expungement-ai/support"), "Expungement.ai nav should include support link.");
assert(briefcaseShell.includes("/expungement-ai/support"), "Briefcase shell should include support link.");
assert(packetReady.includes("/expungement-ai/support"), "Packet-ready page should link to support.");
assert(packetDetail.includes("/expungement-ai/support"), "Packet detail page should link to support.");
assert(settingsView.includes("/expungement-ai/support"), "Briefcase settings should link to support.");

assert(readinessDoc.includes("Stripe hardening status"), "Production readiness doc missing Stripe hardening status section.");
for (const phrase of [
  "Stripe hardening is functionally complete",
  "Partner invoice Stripe flow remains unchanged",
  "Expungement.ai consumer checkout plumbing is isolated",
  "Do not switch from test keys to live keys until final go/no-go",
  "Verify the webhook secret and checkout success/cancel URLs"
]) {
  assert(readinessDoc.includes(phrase), `Production readiness doc missing: ${phrase}`);
}
for (const phrase of [
  "checkout loads",
  "$50 amount",
  "payment confirmation returns to the packet-ready flow",
  "receipt/payment metadata appears in Briefcase",
  "failed or canceled payment does not generate a packet",
  "guidance_only cannot access checkout"
]) {
  assert(smokeDoc.includes(phrase), `Manual smoke tests missing Stripe/payment check: ${phrase}`);
}

const allowedChangedFiles = new Set([
  "docs/EXPUNGEMENT_AI_PRODUCTION_READINESS.md",
  "docs/EXPUNGEMENT_AI_MANUAL_SMOKE_TESTS.md",
  "package.json",
  "public/favicon.svg",
  "public/apple-touch-icon.svg",
  "scripts/verify-expungement-launch-polish.mjs",
  "scripts/verify-expungement-production-readiness.mjs",
  "src/app/expungement-ai/layout.tsx",
  "src/app/expungement-ai/contact/page.tsx",
  "src/app/expungement-ai/support/page.tsx",
  "src/app/api/expungement-ai/support/route.ts",
  "src/app/expungement-ai/packet-ready/page.tsx",
  "src/app/briefcase/[packetId]/page.tsx",
  "src/components/expungement-ai/BriefcaseShell.tsx",
  "src/components/expungement-ai/BriefcaseViews.tsx",
  "src/components/expungement-ai/ConsumerNav.tsx",
  "src/components/expungement-ai/SupportRequestForm.tsx"
]);
const allowedUntrackedDirs = [
  "src/app/api/expungement-ai/support/",
  "src/app/expungement-ai/contact/",
  "src/app/expungement-ai/support/"
];
const restrictedPrefixes = [
  "src/app/partner/",
  "src/app/partners/",
  "src/app/dashboard/partners/",
  "src/app/internal/billing/",
  "src/app/api/partners/",
  "src/app/api/stripe/",
  "src/lib/partners/",
  "src/lib/supabase/",
  "src/lib/stripe/",
  "src/lib/rcap/",
  "src/lib/record-clearing/",
  "src/app/api/rcap/",
  "src/app/api/rcap/documents/",
  "src/app/documents/",
  "supabase/",
  ".env",
  "vercel.json",
  "next.config",
  ".github/workflows/"
];

for (const file of changedFiles()) {
  assert(allowedChangedFiles.has(file) || allowedUntrackedDirs.includes(file), `Unexpected file changed for launch-polish patch: ${file}`);
  for (const prefix of restrictedPrefixes) {
    assert(!file.startsWith(prefix), `Restricted file changed: ${file}`);
  }
}

if (failures.length) {
  console.error("Expungement.ai launch polish verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai launch polish verification passed.");
console.log("Favicon/app icon, contact route, support route/API, support links, docs, and smoke checks are present.");
console.log("Support workflow validates and redacts input, stays dry-run/server-log-only, and does not expose secrets.");
console.log("Partner dashboard, partner billing, Stripe partner invoice flow, Supabase global auth/RLS/session, RCAP all51 engine, and legacy generators are untouched.");
