/**
 * Command Center outbound contract — signing, replay protection, idempotency, honest disabled state.
 *
 * This is the security boundary for the only outbound integration the content platform has. The
 * properties asserted here are the ones the receiving side will depend on:
 *
 *   - HMAC-SHA256 over `${timestamp}.${canonical_json}` — the timestamp is INSIDE the signed
 *     material, so a captured request cannot be replayed later with a still-valid signature.
 *   - Canonical JSON is stable under key reordering, or every signature would fail across the wire.
 *   - The idempotency key is deterministic, so a retry (or a double-clicked "Send") cannot cause a
 *     second publish to a real social account.
 *   - With no endpoint/secret configured the module reports `unconfigured` and NEVER claims success.
 */

import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const failures = [];

const {
  canonicalJson,
  signPayload,
  verifySignature,
  buildPromotionEnvelope,
  promotionIdempotencyKey,
  buildTrackedLink,
  nextAttemptDelaySeconds,
  getCommandCenterConfig,
  deliverEnvelope,
  SIGNATURE_TOLERANCE_SECONDS
} = await import("../src/lib/content/command-center.ts");

const SECRET = "test-secret-do-not-use";
const NOW = 1_770_000_000;

// --- 1. Canonical JSON is order-independent -----------------------------------------------------

const a = canonicalJson({ b: 1, a: 2, nested: { z: 1, y: 2 } });
const b = canonicalJson({ a: 2, nested: { y: 2, z: 1 }, b: 1 });
assert(a === b, "Canonical JSON must be identical regardless of key insertion order.");
assert(a === '{"a":2,"b":1,"nested":{"y":2,"z":1}}', `Canonical JSON must sort keys recursively (got ${a}).`);
assert(canonicalJson([{ b: 1, a: 2 }]) === '[{"a":2,"b":1}]', "Canonical JSON must sort keys inside arrays.");

// --- 2. A valid signature verifies ----------------------------------------------------------------

const payload = canonicalJson({ event_type: "content.promotion.requested", payload: { post: "x" } });
const signature = signPayload(payload, SECRET, NOW);
assert(signature.startsWith(`t=${NOW},v1=`), "The signature header must carry the timestamp and a v1 digest.");

const ok = verifySignature(payload, SECRET, signature, NOW);
assert(ok.valid === true, "A freshly signed payload must verify.");

// --- 3. Tampering with the payload breaks the signature -------------------------------------------

const tampered = canonicalJson({ event_type: "content.promotion.requested", payload: { post: "EVIL" } });
const tamperResult = verifySignature(tampered, SECRET, signature, NOW);
assert(tamperResult.valid === false, "A tampered payload must fail verification.");
assert(tamperResult.reason === "mismatch", "A tampered payload must fail as a mismatch.");

// --- 4. The wrong secret fails ----------------------------------------------------------------------

assert(
  verifySignature(payload, "wrong-secret", signature, NOW).valid === false,
  "A signature made with a different secret must fail."
);

// --- 5. REPLAY: a valid, untampered signature must expire -------------------------------------------

const justInside = verifySignature(payload, SECRET, signature, NOW + SIGNATURE_TOLERANCE_SECONDS - 1);
assert(justInside.valid === true, "A signature inside the tolerance window must still verify.");

const replayed = verifySignature(payload, SECRET, signature, NOW + SIGNATURE_TOLERANCE_SECONDS + 1);
assert(replayed.valid === false, "A captured request replayed after the tolerance window must be REJECTED.");
assert(replayed.reason === "stale", "An expired signature must fail specifically as stale, not as a mismatch.");

// A signature from the future is equally suspect (clock-skew abuse).
const future = verifySignature(payload, SECRET, signature, NOW - SIGNATURE_TOLERANCE_SECONDS - 1);
assert(future.valid === false, "A signature timestamped far in the future must be rejected.");

// An attacker cannot simply rewrite the timestamp: it is part of the signed material.
const forgedTimestamp = `t=${NOW + 10_000},v1=${signature.split("v1=")[1]}`;
assert(
  verifySignature(payload, SECRET, forgedTimestamp, NOW + 10_000).valid === false,
  "Rewriting the timestamp must invalidate the signature (the timestamp is signed)."
);

// --- 6. Malformed headers -----------------------------------------------------------------------------

for (const header of [null, "", "garbage", "v1=abc", `t=${NOW}`, "t=notanumber,v1=abc"]) {
  const result = verifySignature(payload, SECRET, header, NOW);
  assert(result.valid === false, `A malformed signature header ${JSON.stringify(header)} must be rejected.`);
}

// --- 7. The digest is a real HMAC-SHA256 over the documented material ----------------------------------

const expected = createHmac("sha256", SECRET).update(`${NOW}.${payload}`).digest("hex");
assert(
  signature === `t=${NOW},v1=${expected}`,
  "The signature must be HMAC-SHA256 over `${timestamp}.${canonical_json}` — the receiver depends on this exact material."
);

// --- 8. Idempotency keys are deterministic --------------------------------------------------------------

const key1 = promotionIdempotencyKey("post-1", "campaign-1", "content.promotion.requested");
const key2 = promotionIdempotencyKey("post-1", "campaign-1", "content.promotion.requested");
assert(key1 === key2, "The idempotency key must be deterministic — a retry must reuse it.");
assert(
  key1 !== promotionIdempotencyKey("post-1", "campaign-2", "content.promotion.requested"),
  "A different campaign must produce a different idempotency key."
);
assert(
  key1 !== promotionIdempotencyKey("post-2", "campaign-1", "content.promotion.requested"),
  "A different post must produce a different idempotency key."
);

// --- 9. Envelope shape ------------------------------------------------------------------------------------

const envelope = buildPromotionEnvelope({
  eventType: "content.promotion.requested",
  idempotencyKey: key1,
  payload: { post: { id: "post-1" } }
});
for (const field of ["event_id", "event_type", "idempotency_key", "issued_at", "source", "payload"]) {
  assert(field in envelope, `The envelope must carry ${field}.`);
}
assert(envelope.source === "legalease_content", "The envelope must identify its source.");
assert(!Number.isNaN(Date.parse(envelope.issued_at)), "issued_at must be a parseable timestamp.");

// A caller-supplied event id/issued_at must be honored so a retry re-sends the IDENTICAL envelope.
const replayEnvelope = buildPromotionEnvelope({
  eventType: "content.promotion.requested",
  idempotencyKey: key1,
  payload: { post: { id: "post-1" } },
  eventId: envelope.event_id,
  issuedAt: envelope.issued_at
});
assert(
  canonicalJson(replayEnvelope) === canonicalJson(envelope),
  "A retry must be able to reproduce a byte-identical envelope."
);

// --- 10. UTM link building ---------------------------------------------------------------------------------

const link = buildTrackedLink("https://expungement.ai/blog/x", "linkedin", "launch");
const parsed = new URL(link);
assert(parsed.searchParams.get("utm_source") === "linkedin", "utm_source must be set from the channel.");
assert(parsed.searchParams.get("utm_medium") === "social", "utm_medium must default to social.");
assert(parsed.searchParams.get("utm_campaign") === "launch", "utm_campaign must be set.");
assert(
  buildTrackedLink("https://expungement.ai/blog/x", "email", "launch").includes("utm_medium=email"),
  "The email channel must use utm_medium=email."
);
// Re-tracking an already-tracked link must not duplicate params.
const twice = buildTrackedLink(link, "linkedin", "launch");
assert(
  (twice.match(/utm_source=/g) ?? []).length === 1,
  "Building a tracked link twice must not append duplicate UTM params."
);
// An existing non-UTM query param must survive.
assert(
  buildTrackedLink("https://expungement.ai/blog/x?ref=abc", "x", "launch").includes("ref=abc"),
  "Existing query params must be preserved."
);

// --- 11. Retry backoff grows and is capped -------------------------------------------------------------------

const delays = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => nextAttemptDelaySeconds(n));
for (let i = 1; i < delays.length; i += 1) {
  assert(delays[i] >= delays[i - 1], "Retry backoff must be non-decreasing.");
}
assert(delays[0] === 30, "The first retry must back off 30s.");
assert(Math.max(...delays) <= 3600, "Retry backoff must be capped at one hour.");

// --- 12. HONEST DISABLED STATE ---------------------------------------------------------------------------------

delete process.env.COMMAND_CENTER_CONTENT_EVENTS_ENABLED;
delete process.env.COMMAND_CENTER_CONTENT_EVENTS_ENDPOINT;
delete process.env.COMMAND_CENTER_CONTENT_SIGNING_SECRET;

const disabled = getCommandCenterConfig();
assert(disabled.configured === false, "With no env set, the integration must report unconfigured.");
assert(disabled.reason === "disabled", "With the flag unset, the reason must be 'disabled'.");

process.env.COMMAND_CENTER_CONTENT_EVENTS_ENABLED = "true";
const missingEndpoint = getCommandCenterConfig();
assert(
  missingEndpoint.configured === false && missingEndpoint.reason === "missing_endpoint",
  "Enabled with no endpoint must report missing_endpoint — a half-configured integration must not be treated as ready."
);

process.env.COMMAND_CENTER_CONTENT_EVENTS_ENDPOINT = "https://example.invalid/hook";
const missingSecret = getCommandCenterConfig();
assert(
  missingSecret.configured === false && missingSecret.reason === "missing_secret",
  "Enabled with an endpoint but no secret must report missing_secret — we must never send unsigned."
);

// Delivery with an unconfigured integration must NOT claim success.
delete process.env.COMMAND_CENTER_CONTENT_EVENTS_ENABLED;
const result = await deliverEnvelope(envelope);
assert(result.ok === false, "Delivery must not report success when the integration is unconfigured.");
assert(result.kind === "unconfigured", "An unconfigured delivery must be distinguishable from a failed one.");

process.env.COMMAND_CENTER_CONTENT_EVENTS_ENABLED = "true";
process.env.COMMAND_CENTER_CONTENT_SIGNING_SECRET = SECRET;

// --- report -------------------------------------------------------------------------------------------------------

if (failures.length) {
  console.error("Command Center content contract verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Command Center content contract verification passed.");
console.log("Signing: HMAC-SHA256 over `${timestamp}.${canonical_json}`; canonical JSON is stable under key reordering.");
console.log("Replay: a valid captured signature is REJECTED outside the tolerance window, and rewriting the timestamp invalidates it.");
console.log("Tamper: a modified payload or a wrong secret fails; malformed headers are rejected.");
console.log("Idempotency: promotion keys are deterministic, so a retry cannot double-publish; envelopes are byte-reproducible.");
console.log("Honest disabled state: unconfigured and half-configured integrations report a reason and never claim a send succeeded.");

function assert(condition, message) {
  if (!condition) failures.push(message);
}
