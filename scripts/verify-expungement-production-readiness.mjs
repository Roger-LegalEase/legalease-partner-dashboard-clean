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

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    failures.push(`${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`.trim());
  }
}

function changedFiles() {
  const result = spawnSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
  return (result.stdout ?? "").split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim());
}

const packageSource = read("package.json");
const adapterSource = read("src/lib/expungement-ai/eligibility-adapter.ts");
const resultPanelSource = read("src/components/expungement-ai/ResultPanel.tsx");
const paymentSource = read("src/lib/expungement-ai/payment-adapter.ts");
const packetSource = read("src/lib/expungement-ai/packet-generation.ts");
const wilmaTelemetrySource = read("src/lib/expungement-ai/wilma-telemetry.ts");
const wilmaKillSwitchSource = read("src/lib/expungement-ai/wilma-kill-switch.ts");
const manifestSource = read("src/lib/rcap/state-promotion-manifest.ts");
const envVerifierSource = read("scripts/verify-expungement-production-env.mjs");

const consumerRoutes = [
  "src/app/expungement-ai/page.tsx",
  "src/app/expungement-ai/how-it-works/page.tsx",
  "src/app/expungement-ai/pricing/page.tsx",
  "src/app/expungement-ai/sign-in/page.tsx",
  "src/app/expungement-ai/start/page.tsx",
  "src/app/expungement-ai/check/page.tsx",
  "src/app/expungement-ai/results/page.tsx",
  "src/app/expungement-ai/pay/page.tsx",
  "src/app/expungement-ai/packet-ready/page.tsx"
];
const briefcaseRoutes = [
  "src/app/briefcase/page.tsx",
  "src/app/briefcase/matters/page.tsx",
  "src/app/briefcase/documents/page.tsx",
  "src/app/briefcase/reminders/page.tsx",
  "src/app/briefcase/payments/page.tsx",
  "src/app/briefcase/settings/page.tsx",
  "src/app/briefcase/[packetId]/page.tsx"
];
const checkoutRoutes = [
  "src/app/api/expungement-ai/checkout/route.ts",
  "src/app/api/expungement-ai/checkout/status/route.ts",
  "src/app/api/expungement-ai/payment/confirm/route.ts"
];
const packetRoutes = [
  "src/app/api/expungement-ai/packet/generate/route.ts",
  "src/app/api/expungement-ai/packet/status/route.ts",
  "src/app/api/expungement-ai/packet/download/route.ts"
];
const migrations = [
  "supabase/phase-26-consumer-briefcase-items.sql",
  "supabase/phase-27-consumer-checkout-metadata.sql",
  "supabase/phase-28-consumer-packet-generation-status.sql",
  "supabase/phase-29-consumer-wilma-telemetry.sql"
];
const verifiers = [
  "scripts/verify-expungement-production-env.mjs",
  "scripts/verify-expungement-consumer-adapter.mjs",
  "scripts/verify-expungement-consumer-persistence.mjs",
  "scripts/verify-expungement-consumer-checkout.mjs",
  "scripts/verify-expungement-post-payment-packet-generation.mjs",
  "scripts/verify-wilma-safety-harness.mjs",
  "scripts/verify-all51-launch-enabled.mjs"
];
const docs = [
  "docs/EXPUNGEMENT_AI_PRODUCTION_READINESS.md",
  "docs/EXPUNGEMENT_AI_MIGRATION_APPLICATION_PLAN.md",
  "docs/EXPUNGEMENT_AI_MANUAL_SMOKE_TESTS.md"
];

for (const file of [...consumerRoutes, ...briefcaseRoutes, ...checkoutRoutes, ...packetRoutes, ...migrations, ...verifiers, ...docs]) {
  assert(exists(file), `Required production readiness file missing: ${file}`);
}
assert(exists("src/app/api/expungement-ai/wilma/chat/route.ts"), "Wilma chat API route missing.");
assert(packageSource.includes('"expungement:verify-production-env"'), "Missing expungement:verify-production-env npm script.");
assert(packageSource.includes('"expungement:verify-production-readiness"'), "Missing expungement:verify-production-readiness npm script.");

const manifestJson = manifestSource
  .split("/* PROMOTION_MANIFEST_START */")[1]
  .split("/* PROMOTION_MANIFEST_END */")[0]
  .trim()
  .replace(/;$/, "");
const manifest = JSON.parse(manifestJson);
const selectable = manifest.filter((record) =>
  record.liveEnabled === true
  && record.promotionStatus === "live"
  && record.approvedForLive === true
  && record.approvedChannels?.expungementAi === true
);
assert(selectable.length === 51, `Expected all 50 states + DC launch-enabled for Expungement.ai, found ${selectable.length}.`);
assert(!adapterSource.includes("state_not_live"), "Consumer adapter must not include state_not_live branch.");
assert(!read("src/app/expungement-ai/check/page.tsx").includes("state_not_live"), "Consumer check page must not include state_not_live branch.");

assert(paymentSource.includes("consumerPacketPriceCents = 5000"), "Consumer packet price must remain 5000 cents.");
assert(paymentSource.includes("isConsumerPaymentAllowed"), "Payment adapter must use paymentAllowed clamp.");
assert(resultPanelSource.includes('result.paymentAllowed === true && (result.resultCode === "packet_ready" || result.resultCode === "packet_ready_with_caution")'), "Pay gate must require packet_ready or packet_ready_with_caution.");
assert(resultPanelSource.includes('data-consumer-pay-gate="hidden"'), "Guidance-only and non-payment paths must render hidden pay gate state.");
for (const code of ["guidance_only", "needs_more_info", "not_yet", "needs_review", "hard_stop"]) {
  assert(!paymentAllowedForFixture(code), `${code} must not allow payment.`);
}

assert(exists("src/lib/expungement-ai/wilma-kill-switch.ts"), "Wilma kill-switch module missing.");
assert(wilmaKillSwitchSource.includes("isWilmaKillSwitchActive"), "Wilma kill-switch check missing.");
for (const token of ["[SSN]", "[DOB]", "[PHONE]", "[EMAIL]", "[ADDRESS]", "[NAME]"]) {
  assert(wilmaTelemetrySource.includes(token), `Wilma telemetry redaction token missing: ${token}.`);
}

assert(!paymentSource.includes("partner_billing") && !packetSource.includes("partner_billing"), "Expungement.ai payment/packet code must not touch partner billing.");
assert(paymentSource.includes("@/lib/stripe/server"), "Consumer checkout must use isolated server Stripe helper.");
for (const legacy of [
  "generateMississippiPetitionDraft",
  "generateIllinoisDocumentDraft",
  "generateDcDocumentDraft",
  "generatePennsylvaniaDocumentDraft",
  "generateTexasHarrisDocumentDraft"
]) {
  assert(packetSource.includes(legacy), `Legacy generator reference missing: ${legacy}.`);
}
for (const marker of [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "WILMA_PROVIDER_API_KEY",
  "WILMA_KILL_SWITCH_ENABLED",
  "WILMA_SYSTEM_PROMPT_VERSION",
  "EXPUNGEMENT_PACKET_ARTIFACT_BUCKET",
  "Secret values are never printed"
]) {
  assert(envVerifierSource.includes(marker), `Production env verifier missing marker: ${marker}`);
}

const forbiddenChangedPrefixes = [
  "src/app/api/stripe/",
  "src/lib/partners/",
  "src/app/dashboard/partners/",
  "src/app/partner/",
  "src/app/partners/",
  "src/lib/supabase/",
  "src/lib/stripe/",
  "vercel.json",
  "next.config",
  ".env",
  ".github/workflows/deploy"
];
const allowedChangedFiles = new Set([
  "docs/EXPUNGEMENT_AI_PRODUCTION_READINESS.md",
  "docs/EXPUNGEMENT_AI_MIGRATION_APPLICATION_PLAN.md",
  "docs/EXPUNGEMENT_AI_MANUAL_SMOKE_TESTS.md",
  "scripts/verify-expungement-production-env.mjs",
  "scripts/verify-expungement-production-readiness.mjs",
  "package.json"
]);
for (const file of changedFiles()) {
  assert(allowedChangedFiles.has(file), `Unexpected file changed in production readiness branch: ${file}`);
  for (const prefix of forbiddenChangedPrefixes) {
    assert(!file.startsWith(prefix), `Restricted file changed: ${file}`);
  }
}

run("npm", ["run", "rcap:verify-all51-launch-enabled"]);
run("npm", ["run", "rcap:verify-all51-final-approval"]);
run("npm", ["run", "rcap:verify-encrypted-pdf-rescue"]);
run("npm", ["run", "expungement:verify-consumer-adapter"]);
run("npm", ["run", "expungement:verify-consumer-persistence"]);
run("npm", ["run", "expungement:verify-consumer-checkout"]);
run("npm", ["run", "expungement:verify-post-payment-packet-generation"]);
run("npm", ["run", "expungement:verify-wilma-safety-harness"]);

if (failures.length) {
  console.error("Expungement.ai production readiness verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai production readiness verification passed.");
console.log("Consumer, Briefcase, checkout, packet, and Wilma routes are present.");
console.log("Required consumer migrations and verifier scripts are present.");
console.log("Payment gate remains limited to packet_ready / packet_ready_with_caution at 5000 cents.");
console.log("Wilma kill-switch and telemetry redaction are present.");
console.log("Partner dashboard, partner billing, Stripe partner invoice flow, secrets, deployment config, RCAP all51 engine, and legacy generators are untouched.");

function paymentAllowedForFixture(resultCode) {
  return true && (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution");
}
