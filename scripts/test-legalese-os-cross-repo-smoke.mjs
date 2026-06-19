import { createHash, createHmac } from "node:crypto";

const requiredFlag = process.env.RUN_LEGALEASE_OS_CROSS_REPO_SMOKE === "true";
const endpoint = process.env.LEGALEASE_OS_EVENTS_ENDPOINT;
const secret = process.env.LEGALEASE_OS_EVENTS_SECRET;

if (!requiredFlag) {
  console.log("LegalEase OS cross-repo smoke skipped. Set RUN_LEGALEASE_OS_CROSS_REPO_SMOKE=true to run it.");
  process.exit(0);
}

if (!endpoint || !secret) {
  console.error("LegalEase OS cross-repo smoke requires LEGALEASE_OS_EVENTS_ENDPOINT and LEGALEASE_OS_EVENTS_SECRET.");
  process.exit(1);
}

const occurredAt = new Date().toISOString();
const subjectRefHash = hashReference("local-smoke-engine");
const payload = {
  source_system: "expungement_ai",
  event_type: "engine.health_changed",
  occurred_at: occurredAt,
  subject_type: "engine",
  subject_ref_hash: subjectRefHash,
  jurisdiction: "ALL",
  metrics: {
    smoke_test: true,
    db_ready: true
  },
  summary: "Local LegalEase OS exporter smoke event.",
  recommended_operator_action: "Confirm local Command Center received event.",
  pii_classification: "none",
  idempotency_key: `local-smoke-${hashReference(`local-smoke-engine:${occurredAt}`).slice(0, 24)}`
};

const body = JSON.stringify(payload);
const timestamp = new Date().toISOString();
const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-legalease-os-timestamp": timestamp,
    "x-legalease-os-signature": `sha256=${signature}`,
    "x-idempotency-key": payload.idempotency_key
  },
  body
});

const responseText = await response.text();

if (!response.ok) {
  console.error(`LegalEase OS cross-repo smoke failed with HTTP ${response.status}: ${responseText}`);
  process.exit(1);
}

console.log("LegalEase OS cross-repo smoke passed.");
console.log(`Endpoint: ${new URL(endpoint).origin}${new URL(endpoint).pathname}`);
console.log(`Idempotency key: ${payload.idempotency_key}`);

function hashReference(value) {
  return createHash("sha256").update(value.trim()).digest("hex");
}
