/**
 * GET /api/expungement-ai/profiles/[state] — route-level verification.
 *
 *   npm run expungement:verify-public-profile-route
 *
 * Drives the REAL route handler (not a re-implementation) so the assertions cover what an anonymous
 * caller actually receives over the wire: status codes, headers, and the serialized body.
 *
 * The route is intentionally unauthenticated — the screening flow calls it before a user has an
 * account. That is exactly why its payload must be an allowlist: there is no auth boundary behind
 * which a mistake can hide.
 */

import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// next/server first: the route handler imports NextResponse from it, and the ts loader cannot
// resolve that bare specifier on its own.
register("./lib/next-server-loader.mjs", import.meta.url);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const failures = [];

const { GET } = await import("../src/app/api/expungement-ai/profiles/[state]/route.ts");
const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");

const APPROVED_TOP_LEVEL_KEYS = new Set([
  "schemaVersion",
  "profileVersion",
  "jurisdiction",
  "terminology",
  "flowStages",
  "questions",
  "postPaymentPacketCompletion",
  "caseOutcomeOptions"
]);

const SAMPLE_JURISDICTIONS = ["AK", "CA", "MS", "NY", "PA", "TX", "DC", "IL", "FL", "WA", "WI", "MD", "ME", "MN", "SC"];

// --- 1. A valid jurisdiction returns 200 with an allowlisted body --------------------------------

for (const state of SAMPLE_JURISDICTIONS) {
  const response = await call(state);

  assert(response.status === 200, `${state}: expected 200, got ${response.status}.`);
  assert(
    response.headers.get("cache-control")?.includes("no-store"),
    `${state}: the profile response must remain no-store.`
  );

  const body = await response.json();

  // The exact leak this hotfix closes.
  assert(!("copyGuardrails" in body), `${state}: response body still contains copyGuardrails.`);
  assert(
    !JSON.stringify(body).includes("copyGuardrails"),
    `${state}: copyGuardrails appears somewhere in the serialized response.`
  );

  for (const key of Object.keys(body)) {
    assert(
      APPROVED_TOP_LEVEL_KEYS.has(key),
      `${state}: response contains unapproved top-level field "${key}".`
    );
  }

  // Shape the anonymous screening client depends on.
  assert(typeof body.profileVersion === "string", `${state}: profileVersion must be present.`);
  assert(body.jurisdiction?.code === state, `${state}: jurisdiction.code must echo the requested state.`);
  assert(typeof body.jurisdiction?.name === "string", `${state}: jurisdiction.name must be present.`);
  assert(typeof body.jurisdiction?.slug === "string", `${state}: jurisdiction.slug must be present.`);
  assert(
    typeof body.terminology?.primaryConsumerTerm === "string",
    `${state}: terminology.primaryConsumerTerm must be present.`
  );
  assert(Array.isArray(body.questions) && body.questions.length > 0, `${state}: questions must be a non-empty array.`);
  assert(Array.isArray(body.flowStages) && body.flowStages.length > 0, `${state}: flowStages must be non-empty.`);

  // No internal section survived into the response.
  for (const forbidden of ["source", "qa", "pathways", "orderedDecisionRules", "packetGenerator", "copyGuardrails"]) {
    assert(!(forbidden in body), `${state}: response contains internal section "${forbidden}".`);
  }

  // Nested: questions must not carry the engine's per-question `source` provenance field.
  for (const question of body.questions) {
    assert(!("source" in question), `${state}: question ${question.id} carries the internal "source" field.`);
  }
}

// --- 2. Behaviour is unchanged for a jurisdiction alias --------------------------------------------

const dcAlias = await call("district-of-columbia");
assert(
  dcAlias.status === 200,
  `The DC slug alias must still resolve (got ${dcAlias.status}) — the route normalizes jurisdiction keys.`
);

// --- 3. An invalid jurisdiction keeps its existing 404 contract --------------------------------------

for (const bad of ["ZZ", "not-a-state", ""]) {
  const response = await call(bad);
  assert(response.status === 404, `Unknown jurisdiction "${bad}" must return 404, got ${response.status}.`);
  const body = await response.json();
  assert(
    body.error === "unsupported_jurisdiction",
    `Unknown jurisdiction "${bad}" must keep the unsupported_jurisdiction error contract.`
  );
  assert(
    !JSON.stringify(body).includes("copyGuardrails"),
    `The 404 body for "${bad}" must not leak internal data.`
  );
}

// --- 4. The endpoint remains anonymous (no auth regression) --------------------------------------------

const anonymous = await call("MS");
assert(anonymous.status === 200, "The endpoint must remain usable with no auth header — the screening flow is anonymous.");
assert(anonymous.status !== 401 && anonymous.status !== 403, "The endpoint must not have become authenticated.");

// --- 5. Coverage: every compiled jurisdiction is reachable through the route -----------------------------

const profiles = getAllJurisdictionProfiles();
assert(profiles.length === 51, `Expected 51 jurisdictions, got ${profiles.length}.`);

let served = 0;
for (const profile of profiles) {
  const response = await call(profile.jurisdiction.code);
  if (response.status !== 200) {
    failures.push(`${profile.jurisdiction.code}: route returned ${response.status}.`);
    continue;
  }
  const body = await response.json();
  if (JSON.stringify(body).includes("copyGuardrails")) {
    failures.push(`${profile.jurisdiction.code}: copyGuardrails leaked through the route.`);
    continue;
  }
  served += 1;
}
assert(served === 51, `All 51 jurisdictions must serve a clean payload (clean: ${served}).`);

// --- report -----------------------------------------------------------------------------------------

if (failures.length) {
  console.error("Public state-profile route verification failed:");
  for (const failure of failures.slice(0, 30)) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Public state-profile route verification passed.");
console.log(`Route: all 51 jurisdictions return 200 with an allowlisted body and no copyGuardrails.`);
console.log("Contract preserved: no-store caching, jurisdiction/terminology/flowStages/questions intact for the");
console.log("  anonymous screening client, the DC slug alias still resolves, and unknown jurisdictions still 404");
console.log("  with the unsupported_jurisdiction error. The endpoint remains unauthenticated by design.");

// --- helpers ------------------------------------------------------------------------------------------

function call(state) {
  const request = new Request(`https://expungement.ai/api/expungement-ai/profiles/${encodeURIComponent(state)}`);
  return GET(request, { params: Promise.resolve({ state }) });
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
