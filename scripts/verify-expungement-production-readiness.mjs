import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
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

const readinessDoc = read("docs/EXPUNGEMENT_AI_PRODUCTION_READINESS.md");
const packageSource = read("package.json");

assert(packageSource.includes('"expungement:verify-production-readiness"'), "Missing expungement:verify-production-readiness npm script.");
assert(readinessDoc.includes("Stripe hardening status"), "Production readiness doc must include Stripe hardening status.");
assert(readinessDoc.includes("Partner invoice Stripe flow remains unchanged"), "Production readiness doc must preserve partner invoice Stripe flow.");
assert(readinessDoc.includes("Expungement.ai consumer checkout plumbing is isolated"), "Production readiness doc must state consumer checkout isolation.");
assert(readinessDoc.includes("Do not switch from test keys to live keys until final go/no-go"), "Production readiness doc must block live key switch before go/no-go.");
assert(readinessDoc.includes("verify the webhook secret and checkout success/cancel URLs") || readinessDoc.includes("Verify the webhook secret and checkout success/cancel URLs"), "Production readiness doc must call out webhook and checkout URL verification.");
assert(readinessDoc.includes("Support and correspondence routing"), "Production readiness doc must include support and correspondence routing.");
assert(readinessDoc.includes("All support/contact submissions must create LegalEase OS support items"), "Production readiness doc must require LegalEase OS support items.");
assert(readinessDoc.includes("No support request should be accepted in production unless it is persisted or enqueued to LegalEase OS"), "Production readiness doc must block production success when OS persistence fails.");
assert(readinessDoc.includes("Partner users must not access consumer support correspondence"), "Production readiness doc must state partner users cannot access support correspondence.");

run("npm", ["run", "expungement:verify-consumer-checkout"]);

if (failures.length) {
  console.error("Expungement.ai production readiness verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai production readiness verification passed.");
console.log("Stripe hardening status is documented and consumer checkout remains isolated from partner invoice flow.");
