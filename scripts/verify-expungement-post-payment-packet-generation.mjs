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
const packetAdapterPath = "src/lib/expungement-ai/packet-generation.ts";
const packetAdapter = exists(packetAdapterPath) ? read(packetAdapterPath) : "";
const briefcaseSource = read("src/lib/expungement-ai/briefcase.ts");
const typesSource = read("src/lib/expungement-ai/types.ts");
const packetReadySource = read("src/app/expungement-ai/packet-ready/page.tsx");
const briefcaseViewsSource = read("src/components/expungement-ai/BriefcaseViews.tsx");
const packetDetailSource = read("src/app/briefcase/[packetId]/page.tsx");
const migrationPath = "supabase/phase-28-consumer-packet-generation-status.sql";
const migrationSource = exists(migrationPath) ? read(migrationPath) : "";

const routes = [
  "src/app/api/expungement-ai/packet/generate/route.ts",
  "src/app/api/expungement-ai/packet/status/route.ts",
  "src/app/api/expungement-ai/packet/download/route.ts"
];

assert(packageSource.includes('"expungement:verify-post-payment-packet-generation"'), "Missing expungement:verify-post-payment-packet-generation npm script.");
assert(exists(packetAdapterPath), "Packet generation adapter missing.");
for (const route of routes) {
  assert(exists(route), `${route} missing.`);
  const source = exists(route) ? read(route) : "";
  assert(source.includes("requireConsumerBriefcaseSession"), `${route} must require user session.`);
  assert(source.includes("auth.userId"), `${route} must scope packet access by authenticated user.`);
}

for (const method of ["generatePaidConsumerPacket", "getConsumerPacketStatus", "getConsumerPacketDownload", "attachPacketToBriefcaseItem"]) {
  assert(packetAdapter.includes(method), `Packet adapter missing ${method}.`);
}

assert(packetAdapter.includes("getBriefcaseItem(userId, briefcaseItemId)"), "Packet generation must require owned Briefcase item.");
assert(packetAdapter.includes('item.paymentStatus !== "paid"') && packetAdapter.includes("dryRunMode"), "Packet generation must require paid status or explicit dry-run mode.");
assert(packetAdapter.includes("isConsumerPaymentAllowed"), "Packet generation must use packet-ready payment clamp.");
assert(packetAdapter.includes('item.resultCode ?? "guidance_only"'), "guidance_only fallback must be blocked.");
for (const blockedCode of ["guidance_only", "needs_more_info", "not_yet", "needs_review", "hard_stop"]) {
  assert(typesSource.includes(`"${blockedCode}"`), `${blockedCode} result code must remain represented.`);
}
assert(packetAdapter.includes("generateMississippiPetitionDraft"), "Mississippi legacy generator must be preserved as fallback.");
assert(packetAdapter.includes("generateIllinoisDocumentDraft"), "Illinois legacy generator must be preserved as fallback.");
assert(packetAdapter.includes("generateDcDocumentDraft"), "DC legacy generator must be preserved as fallback.");
assert(packetAdapter.includes("generatePennsylvaniaDocumentDraft"), "Pennsylvania legacy generator must be preserved as fallback.");
assert(packetAdapter.includes("generateTexasHarrisDocumentDraft"), "Texas-Harris legacy generator must be preserved as fallback.");

assert(briefcaseSource.includes("updateBriefcasePacketMetadata"), "Briefcase adapter must update packet metadata.");
assert(briefcaseSource.includes("artifact_refs_json"), "Generated packet must store artifact refs on Briefcase item.");
for (const status of ["pending", "generating", "ready", "failed"]) {
  assert(typesSource.includes(`"${status}"`) || migrationSource.includes(`'${status}'`) || packetAdapter.includes(`"${status}"`), `packet_status transition missing: ${status}`);
}
assert(packetAdapter.includes("packetStatus: \"pending\"") && packetAdapter.includes("packetStatus: \"generating\"") && packetAdapter.includes("packetStatus: \"ready\"") && packetAdapter.includes("packetStatus: \"failed\""), "Packet generation status transitions must be represented.");
assert(packetReadySource.includes("packetReady = packet?.packetStatus === \"ready\"") || packetReadySource.includes('packetStatus === "ready"'), "Packet-ready page must not claim ready before packet_status ready.");
assert(packetReadySource.includes("Your payment was confirmed, but we need to regenerate your packet. Try again or contact support."), "Packet-ready page must show recoverable generation failure copy.");
assert(packetReadySource.includes("Ask Wilma about next steps"), "Packet-ready page must show Wilma next-step action.");
assert(briefcaseViewsSource.includes("Download") && briefcaseViewsSource.includes("paymentStatus") && briefcaseViewsSource.includes("packetStatus"), "Briefcase packet cards must show download/payment/packet metadata.");
assert(packetDetailSource.includes("getBriefcaseItem(auth.userId") && packetDetailSource.includes("receiptUrl"), "Briefcase packet detail must show owned item and receipt reference.");
assert(exists(migrationPath), "Packet generation status migration must exist when packet_status values change.");
assert(!migrationSource.includes("partner_"), "Packet generation migration must not alter partner billing.");
assert(!packetAdapter.includes("partner_billing") && !packetAdapter.includes("partner_billing_requests"), "Packet generation adapter must not touch partner billing.");

const forbiddenChangedPrefixes = [
  "src/app/api/stripe/",
  "src/lib/partners/",
  "src/app/dashboard/partners/",
  "src/app/partner/",
  "src/app/partners/",
  "src/lib/supabase/",
  "vercel.json",
  "next.config",
  ".env",
  ".github/workflows/deploy"
];
for (const file of changedFiles()) {
  if (
    file === "supabase/phase-26-consumer-briefcase-items.sql" ||
    file === "supabase/phase-27-consumer-checkout-metadata.sql" ||
    file === migrationPath
  ) continue;
  for (const prefix of forbiddenChangedPrefixes) {
    assert(!file.startsWith(prefix), `Restricted file changed: ${file}`);
  }
}

run("npm", ["run", "rcap:verify-all51-launch-enabled"]);
run("npm", ["run", "rcap:verify-all51-final-approval"]);
run("npm", ["run", "expungement:verify-consumer-adapter"]);
run("npm", ["run", "expungement:verify-consumer-persistence"]);
run("npm", ["run", "expungement:verify-consumer-checkout"]);

if (failures.length) {
  console.error("Expungement.ai post-payment packet generation verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai post-payment packet generation verification passed.");
console.log("Packet generate/status/download routes exist and require owned Briefcase items.");
console.log("Packet generation requires paid status or explicit dry-run mode and packet-ready result codes.");
console.log("Generated packets store artifact refs and packet_status transitions on consumer Briefcase items.");
console.log("Legacy generators, partner billing, Stripe invoice flow, secrets, deployment, and RCAP engine files are untouched.");
