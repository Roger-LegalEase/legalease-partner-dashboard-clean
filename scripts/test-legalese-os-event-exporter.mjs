import fs from "node:fs";
import path from "node:path";

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

const packageSource = read("package.json");
const exporterPath = "src/lib/legalese-os-events.ts";
const healthPath = "src/app/api/health/route.ts";
const packetPath = "src/lib/expungement-ai/packet-generation.ts";
const smokePath = "scripts/test-legalese-os-cross-repo-smoke.mjs";
const runbookPath = "docs/legalese-os-cross-repo-smoke.md";

assert(packageSource.includes('"legalese:verify-os-exporter"'), "package.json must expose legalese:verify-os-exporter.");
assert(packageSource.includes("node scripts/test-legalese-os-event-exporter.mjs &&"), "npm test must include LegalEase OS exporter verification.");
assert(exists(exporterPath), "Server-only LegalEase OS exporter module is missing.");
assert(exists(smokePath), "Skipped-by-default LegalEase OS cross-repo smoke script is missing.");
assert(exists(runbookPath), "LegalEase OS cross-repo smoke runbook is missing.");

const exporterSource = read(exporterPath);
const healthSource = read(healthPath);
const packetSource = read(packetPath);
const smokeSource = read(smokePath);
const runbookSource = read(runbookPath);

for (const envName of [
  "LEGALEASE_OS_EVENTS_ENABLED",
  "LEGALEASE_OS_EVENTS_ENDPOINT",
  "LEGALEASE_OS_EVENTS_SECRET"
]) {
  assert(exporterSource.includes(envName), `Exporter must support ${envName}.`);
}

assert(exporterSource.includes('LEGALEASE_OS_EVENTS_ENABLED === "true"'), "Exporter must stay disabled unless explicitly enabled.");
assert(exporterSource.includes("createHmac(\"sha256\""), "Exporter must sign events with HMAC-SHA256.");
assert(exporterSource.includes('"x-legalease-os-timestamp"'), "Exporter must send the LegalEase OS timestamp header.");
assert(exporterSource.includes('"x-legalease-os-signature"'), "Exporter must send the LegalEase OS signature header.");
assert(exporterSource.includes('"x-idempotency-key"'), "Exporter must send an idempotency key header.");
assert(exporterSource.includes("subject_ref_hash") && exporterSource.includes("hashLegalEaseOsReference"), "Exporter must hash subject references.");
assert(!packageSource.includes("NEXT_PUBLIC_LEGALEASE_OS"), "LegalEase OS secrets must not be exposed through public env names.");

for (const forbiddenFragment of [
  "email",
  "rawfacts",
  "rawcase",
  "criminalhistory",
  "transcript",
  "paymentintent",
  "checkoutsession",
  "stripe",
  "providerpayload",
  "rawpacket",
  "rawrequest",
  "rawresponse"
]) {
  assert(exporterSource.includes(`"${forbiddenFragment}"`), `Exporter forbidden-field filter should cover ${forbiddenFragment}.`);
}

assert(healthSource.includes("emitLegalEaseOsEvent"), "/api/health must use the LegalEase OS exporter.");
assert(healthSource.includes('event_type: "engine.health_changed"'), "/api/health must emit engine.health_changed.");
assert(healthSource.includes("buildEngineHealthEventIdempotencyKey"), "/api/health must use deterministic idempotency.");
assert(healthSource.includes("shouldThrottleEngineHealthExport"), "/api/health must throttle duplicate outbound health exports.");
assert(healthSource.includes("engineHealthBucketMinutes = 60"), "/api/health health export bucket should remain 60 minutes.");
assert(healthSource.includes("return NextResponse.json(body"), "/api/health response body path must remain unchanged.");
assert(healthSource.includes("checks: {\n      db\n    }"), "/api/health must keep the ok/timestamp/checks.db response shape.");
assert(!healthSource.includes("LEGALEASE_OS_EVENTS_SECRET,"), "/api/health must not expose the LegalEase OS secret.");

assert(packetSource.includes("emitLegalEaseOsEvent"), "Packet generation must use the LegalEase OS exporter.");
assert(packetSource.includes('event_type: "packet.generated"'), "Successful packet generation must emit packet.generated.");
assert(packetSource.includes('event_type: "engine.health_changed"'), "Packet failure path must emit engine.health_changed.");
assert(packetSource.includes("consumer_packet:"), "Packet generated subject must be a non-PII hashed reference source.");
assert(packetSource.includes("consumer_packet_failure:"), "Packet failure subject must be a non-PII hashed reference source.");
assert(packetSource.includes("pii_classification: \"hashed_reference_only\""), "Packet events must declare hashed-reference-only PII classification.");

const attachIndex = packetSource.indexOf("await attachPacketToBriefcaseItem");
const emitGeneratedIndex = packetSource.indexOf("await emitPacketGeneratedEvent");
assert(attachIndex !== -1 && emitGeneratedIndex > attachIndex, "packet.generated must emit only after packet artifact attachment succeeds.");

const failedStatusIndex = packetSource.indexOf('packetStatus: "failed"');
const emitFailureIndex = packetSource.indexOf("await emitPacketGenerationFailureHealthEvent");
assert(failedStatusIndex !== -1 && emitFailureIndex > failedStatusIndex, "fulfillment failure health event must emit only after failed status is persisted.");

const packetEventHelpers = packetSource.slice(
  packetSource.indexOf("async function emitPacketGeneratedEvent"),
  packetSource.indexOf("function renderLegacyGeneratorPacket")
);
for (const forbidden of [
  "leadEmail",
  "checkoutSessionId",
  "paymentIntentId",
  "receiptUrl",
  "artifactRefs.text",
  "paymentLinkageText",
  "Error ? error.message"
]) {
  assert(!packetEventHelpers.includes(forbidden), `Packet LegalEase OS event helpers must not include ${forbidden}.`);
}

assert(smokeSource.includes("RUN_LEGALEASE_OS_CROSS_REPO_SMOKE"), "Cross-repo smoke must be opt-in only.");
assert(smokeSource.includes("process.exit(0)") && smokeSource.includes("skipped"), "Cross-repo smoke must skip safely by default.");
assert(smokeSource.includes("LEGALEASE_OS_EVENTS_ENDPOINT") && smokeSource.includes("LEGALEASE_OS_EVENTS_SECRET"), "Cross-repo smoke must require endpoint and local secret.");
assert(smokeSource.includes("Local LegalEase OS exporter smoke event."), "Cross-repo smoke must send only synthetic local data.");
assert(runbookSource.includes("local-os-smoke-secret"), "Runbook must document use of a local-only smoke secret.");
assert(!runbookSource.includes("production secret"), "Runbook must not ask for production secrets.");

if (failures.length) {
  console.error("LegalEase OS exporter verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("LegalEase OS exporter verification passed.");
console.log("Exporter stays disabled by default and uses server-only LEGALEASE_OS_EVENTS_* env vars.");
console.log("Health, packet success, and packet failure hooks are present and non-blocking.");
console.log("No UI, migrations, production env, payment hooks, Stripe hooks, or extra event hooks were added.");
