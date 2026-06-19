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
const supportAdapter = exists("src/lib/expungement-ai/support-os-adapter.ts") ? read("src/lib/expungement-ai/support-os-adapter.ts") : "";
const supportMigration = exists("supabase/phase-31-legalease-os-support-queue.sql") ? read("supabase/phase-31-legalease-os-support-queue.sql") : "";
const consumerNav = read("src/components/expungement-ai/ConsumerNav.tsx");
const briefcaseShell = read("src/components/expungement-ai/BriefcaseShell.tsx");
const packetReady = read("src/app/expungement-ai/packet-ready/page.tsx");
const packetDetail = read("src/app/briefcase/[packetId]/page.tsx");
const settingsView = read("src/components/expungement-ai/BriefcaseViews.tsx");
const readinessDoc = exists("docs/EXPUNGEMENT_AI_PRODUCTION_READINESS.md") ? read("docs/EXPUNGEMENT_AI_PRODUCTION_READINESS.md") : "";
const smokeDoc = exists("docs/EXPUNGEMENT_AI_MANUAL_SMOKE_TESTS.md") ? read("docs/EXPUNGEMENT_AI_MANUAL_SMOKE_TESTS.md") : "";
const consumerShell = read("src/components/expungement-ai/ConsumerPageShell.tsx");
const publicExpungementSources = [
  "src/app/expungement-ai/page.tsx",
  "src/app/expungement-ai/start/page.tsx",
  "src/app/expungement-ai/check/page.tsx",
  "src/app/expungement-ai/results/page.tsx",
  "src/app/expungement-ai/pay/page.tsx",
  "src/app/expungement-ai/packet-ready/page.tsx",
  "src/app/expungement-ai/pricing/page.tsx",
  "src/app/expungement-ai/contact/page.tsx",
  "src/app/expungement-ai/support/page.tsx",
  "src/app/expungement-ai/sign-in/page.tsx",
  "src/components/expungement-ai/ResultPanel.tsx"
].filter(exists);

assert(packageSource.includes('"expungement:verify-launch-polish"'), "Missing expungement:verify-launch-polish npm script.");
assert(exists("public/favicon.svg") || exists("public/favicon.ico") || exists("src/app/icon.tsx") || exists("src/app/favicon.ico"), "Favicon/app icon must exist.");
assert(exists("public/apple-touch-icon.svg") || exists("public/apple-touch-icon.png"), "Apple touch icon must exist.");
assert(expungementLayout.includes('title: "Expungement.ai"'), "Expungement.ai metadata title missing.");
assert(expungementLayout.includes("Self-help record-clearing packets and guidance"), "Expungement.ai metadata description missing.");
assert(expungementLayout.includes("openGraph") && expungementLayout.includes("hero-1500.jpg"), "Open Graph image metadata missing.");

assert(exists("src/app/expungement-ai/contact/page.tsx"), "Contact route missing.");
assert(exists("src/app/expungement-ai/support/page.tsx"), "Support route missing.");
assert(exists("src/app/api/expungement-ai/support/route.ts"), "Support API route missing.");
assert(exists("src/lib/expungement-ai/support-os-adapter.ts"), "Support OS adapter missing.");
assert(contactPage.includes("ConsumerPageShell") && supportPage.includes("ConsumerPageShell"), "Contact/support pages must use the consumer shell.");
assert(contactPage.includes("SupportRequestForm") && contactPage.includes("general_contact"), "Contact page must submit through the LegalEase OS support workflow.");
assert(contactPage.includes("Contact Expungement.ai"), "Contact headline missing.");
assert(contactPage.includes("info@legalease.law") && supportPage.includes("info@legalease.law"), "Support email must appear on contact/support pages.");
assert(contactPage.includes("907 W. Peace Street, Canton, MS 39046"), "Mailing address missing from contact page.");
assert(contactPage.includes("cannot provide legal advice") && supportPage.includes("cannot provide legal advice"), "Not legal advice language missing.");
assert(contactPage.includes("guarantee court outcomes") && supportPage.includes("Court approval is not guaranteed"), "No guaranteed outcome language missing.");
for (const label of ["Account or login", "Payment or receipt", "Packet download", "Briefcase", "Wilma", "Something else"]) {
  assert(supportPage.includes(label) || supportForm.includes(label), `Support topic missing: ${label}`);
}
assert(supportPage.includes("For urgent legal deadlines, contact a lawyer or the court directly."), "Urgent legal deadline support copy missing.");
assert(contactPage.includes("Messages sent here go to the LegalEase support team."), "Contact page must state messages go to LegalEase support.");
assert(supportPage.includes("Your request will be routed to the LegalEase support team."), "Support page must state routing to LegalEase support.");

assert(supportForm.includes('fetch("/api/expungement-ai/support"'), "Support form must post to isolated support API.");
assert(!supportForm.includes("process.env") && !supportForm.includes("SUPABASE") && !supportForm.includes("STRIPE"), "Support form must not expose server secrets/config.");
for (const field of ["category", "email", "briefcaseItemId", "message", "routeSubmittedFrom", "legalAdviceWarningAcknowledged"]) {
  assert(supportRoute.includes(field), `Support route must accept ${field}.`);
}
assert(supportRoute.includes("createLegalEaseOsSupportItem"), "Support API must call the LegalEase OS support adapter.");
assert(supportRoute.includes("status: 503"), "Support API must return a safe error if OS persistence fails.");
assert(!supportRoute.includes("console.info") && !supportRoute.includes("server-log-only"), "Support API must not be server-log-only.");
assert(!supportRoute.includes("SUPABASE_SERVICE_ROLE_KEY") && !supportRoute.includes("STRIPE_SECRET"), "Support route must not expose secrets.");
assert(!supportRoute.includes("@/lib/partners") && !supportRoute.includes("@/lib/stripe"), "Support route must stay isolated from partner/Stripe systems.");

for (const exportedName of ["createLegalEaseOsSupportItem", "normalizeSupportCategory", "buildSupportQueuePayload", "redactSupportMessage"]) {
  assert(supportAdapter.includes(`export function ${exportedName}`) || supportAdapter.includes(`export async function ${exportedName}`), `Support OS adapter must export ${exportedName}.`);
}
for (const field of [
  "source",
  "channel",
  "type",
  "category",
  "status",
  "priority",
  "user_id",
  "email",
  "briefcase_item_id",
  "message_redacted",
  "original_message_redaction_applied",
  "route_submitted_from",
  "user_agent",
  "metadata_json",
  "created_at"
]) {
  assert(supportAdapter.includes(field), `Support OS payload missing ${field}.`);
}
for (const marker of ["redacted-ssn", "redacted-full-dob", "redacted-phone", "redacted-email", "redacted-address"]) {
  assert(supportAdapter.includes(marker), `Support workflow must redact ${marker}.`);
}
assert(supportAdapter.includes('process.env.NODE_ENV === "production"'), "Production path must distinguish production from local dry-run fallback.");
assert(supportAdapter.includes('ok: false') && supportAdapter.includes("LegalEase OS support queue write failed"), "Production path must fail instead of silently accepting OS write failures.");
assert(supportAdapter.includes('from("legalease_os_support_items")'), "Support adapter must write to LegalEase OS support items.");
assert(supportAdapter.includes("dryRun: true"), "Non-production fallback must be clearly marked dryRun.");
assert(!supportAdapter.includes("console.info") && !supportAdapter.includes("server-log-only"), "Support adapter must not rely on server-log-only behavior.");

assert(exists("supabase/phase-31-legalease-os-support-queue.sql"), "LegalEase OS support queue migration missing.");
assert(supportMigration.includes("create table if not exists public.legalease_os_support_items"), "Migration must create legalease_os_support_items.");
assert(supportMigration.includes("alter table public.legalease_os_support_items enable row level security"), "Migration must enable RLS.");
assert(supportMigration.includes("internal_admin") && supportMigration.includes("support_reviewer"), "Migration must allow internal support reviewers.");
assert(supportMigration.includes("Partner users must not access consumer support items"), "Migration must document no partner access.");
assert(!supportMigration.includes("partner_slug"), "Support queue must not grant partner-scoped access.");
assert(!supportMigration.includes("consumer_read_own"), "Support queue should remain internal-only for reads in this launch patch.");

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
  "Support and correspondence routing",
  "All support/contact submissions must create LegalEase OS support items",
  "The operating source of truth is LegalEase OS",
  "No support request should be accepted in production unless it is persisted or enqueued to LegalEase OS",
  "Partner users must not access consumer support correspondence"
]) {
  assert(readinessDoc.includes(phrase), `Production readiness doc missing support routing statement: ${phrase}`);
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
for (const phrase of [
  "Submit a contact request",
  "Submit a technical support request",
  "LegalEase OS support item is created",
  "message is redacted",
  "partner user cannot access",
  "production does not return success if the LegalEase OS write fails"
]) {
assert(smokeDoc.includes(phrase), `Manual smoke tests missing LegalEase OS support check: ${phrase}`);
}

for (const sourceFile of publicExpungementSources) {
  const source = read(sourceFile);
  for (const forbidden of ["Choose your state and path", "Path type", "Add caution to packet-ready result"]) {
    assert(!source.includes(forbidden), `Public Expungement.ai scaffold string leaked in ${sourceFile}: ${forbidden}`);
  }
  assert(!source.includes("data-result-code"), `Public Expungement.ai route must not render raw result-code markers: ${sourceFile}`);
  if (sourceFile !== "src/components/expungement-ai/ResultPanel.tsx") {
    assert(!source.includes("packet_ready") && !source.includes("packet_ready_with_caution"), `Public Expungement.ai route must not expose raw packet result codes: ${sourceFile}`);
  }
}

const handoffLanding = exists("src/app/expungement-ai/ExpungementLandingHandoff.tsx") ? read("src/app/expungement-ai/ExpungementLandingHandoff.tsx") : "";
assert(handoffLanding.includes("Expungement-Landing-Full.html"), "Expungement.ai landing must use the files-6 landing handoff source.");

const allowedChangedFiles = new Set([
  "docs/EXPUNGEMENT_AI_PRODUCTION_READINESS.md",
  "docs/EXPUNGEMENT_AI_MANUAL_SMOKE_TESTS.md",
  "package.json",
  "public/favicon.svg",
  "public/apple-touch-icon.svg",
  "scripts/verify-expungement-launch-polish.mjs",
  "scripts/verify-expungement-production-readiness.mjs",
  "scripts/verify-all50-internal-preview.mjs",
  "scripts/verify-all51-launch-enabled.mjs",
  "scripts/verify-all51-final-approval.mjs",
  "scripts/verify-encrypted-pdf-rescue.mjs",
  "scripts/verify-expungement-consumer-adapter.mjs",
  "scripts/verify-expungement-consumer-checkout.mjs",
  "scripts/verify-expungement-consumer-persistence.mjs",
  "scripts/verify-expungement-post-payment-packet-generation.mjs",
  "scripts/detect-ci-scope.mjs",
  "scripts/verify-product-aware-rcap-ci.mjs",
  "scripts/test-inspect-local-record-clearing-pdfs.mjs",
  "scripts/test-nebraska-record-clearing-shadow.mjs",
  "src/lib/expungement-ai/support-os-adapter.ts",
  "supabase/phase-31-legalease-os-support-queue.sql",
  "src/app/expungement-ai/layout.tsx",
  "src/app/expungement-ai/page.tsx",
  "src/app/expungement-ai/ExpungementLandingHandoff.tsx",
  "src/app/expungement-ai/start/page.tsx",
  "src/app/expungement-ai/check/page.tsx",
  "src/app/expungement-ai/results/page.tsx",
  "src/app/expungement-ai/pay/page.tsx",
  "src/app/expungement-ai/pricing/page.tsx",
  "src/app/briefcase/page.tsx",
  "src/app/briefcase/[packetId]/page.tsx",
  "src/components/expungement-ai/ConsumerFlowCard.tsx",
  "src/components/expungement-ai/ResultPanel.tsx",
  "src/app/expungement-ai/contact/page.tsx",
  "src/app/expungement-ai/support/page.tsx",
  "src/app/api/expungement-ai/support/route.ts",
  "src/app/expungement-ai/packet-ready/page.tsx",
  "src/app/briefcase/[packetId]/page.tsx",
  "src/components/expungement-ai/BriefcaseShell.tsx",
  "src/components/expungement-ai/BriefcaseViews.tsx",
  "src/components/expungement-ai/ConsumerNav.tsx",
  "src/components/expungement-ai/SupportRequestForm.tsx",
  ".github/workflows/expungement-ai-consumer-adapter.yml",
  ".github/workflows/rcap-all50-handoff.yml"
]);
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
  ".env",
  "vercel.json",
  "next.config",
  ".github/workflows/"
];

for (const file of changedFiles()) {
  for (const prefix of restrictedPrefixes) {
    if (file === "supabase/phase-31-legalease-os-support-queue.sql") continue;
    if (allowedChangedFiles.has(file)) continue;
    if (file.startsWith("src/app/legalease/") || file.startsWith("scripts/verify-legalease-umbrella-site.mjs")) continue;
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
console.log("Support workflow validates and redacts input, creates or enqueues LegalEase OS support items, and does not expose secrets.");
console.log("Partner dashboard, partner billing, Stripe partner invoice flow, Supabase global auth/RLS/session, RCAP all51 engine, and legacy generators are untouched.");
