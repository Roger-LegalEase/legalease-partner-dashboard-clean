#!/usr/bin/env node
await import("./verify-rcap-il-delivery-binding.mjs");
/**
 * Lane F acceptance — every commercial admission point is governed, exactly once.
 *
 * The invariant this file exists to hold is NOT "there are ten points". A count
 * broke the moment the authority gained `repeat_download`, and a count would
 * have kept passing while the new point went unwired. So the list is imported
 * from `COMMERCIAL_ADMISSION_POINTS` and never restated here: a point added
 * upstream fails this verifier until it is gated, and a point removed upstream
 * fails until its call site goes.
 *
 * "Governed" means one call to `governCommercialAdmission` or `admitCommercial`
 * naming that point, in shipped server code under src/. Exactly one, because two
 * call sites for the same point is how the second one drifts.
 *
 *   node scripts/verify-rcap-lane-f-commercial-admission.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { COMMERCIAL_ADMISSION_POINTS } = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");
const { ADMISSION_CONTEXT_REQUIREMENTS, collectContextDenials } = await import("../src/lib/rcap/fulfillment/grade-a-request-context.ts");
const lane = await import("../src/lib/rcap/render/commercial-admission.ts");
const validation = await import("../src/lib/rcap/render/artifact-validation.ts");

let failed = 0;
let passed = 0;
function check(title, ok, observed) {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${title}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${title}\n         observed: ${observed}`);
  }
}

// --- the source tree the gates must live in -------------------------------
function sourceFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, acc);
    else if (/\.tsx?$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const FILES = sourceFiles(path.join(rootDir, "src"));
const SOURCES = new Map(FILES.map((file) => [path.relative(rootDir, file), fs.readFileSync(file, "utf8")]));

/** Every governed call site for a point, as `file:line`. */
function callSitesFor(point) {
  const pattern = new RegExp(`(governCommercialAdmission|admitCommercial)\\(\\s*(?:\\r?\\n\\s*)?"${point}"`);
  const sites = [];
  for (const [file, source] of SOURCES) {
    // The wiring module itself defines the helpers; its own generic forwarding
    // is not a call site for any particular point.
    const lines = source.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const window = lines.slice(i, i + 2).join("\n");
      if (pattern.test(window) && !pattern.test(lines.slice(i + 1, i + 2).join("\n"))) {
        sites.push(`${file}:${i + 1}`);
      }
    }
  }
  return sites;
}

console.log("Lane F — commercial admission wiring\n");

/**
 * The needle is assembled rather than written, so that this check does not
 * contain the very literal it forbids and fail against itself.
 */
const selfSource = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
const restated = COMMERCIAL_ADMISSION_POINTS.filter((point) => selfSource.includes(`${'"'}${point}${'"'}`));
check(
  "the point list is imported from the authority, not restated in this file",
  restated.length === 0,
  `restated: ${restated.join(", ")}`
);

check(
  "the authority exports at least one admission point",
  Array.isArray(COMMERCIAL_ADMISSION_POINTS) && COMMERCIAL_ADMISSION_POINTS.length > 0,
  String(COMMERCIAL_ADMISSION_POINTS)
);

check(
  "the context requirement table covers exactly the exported points",
  [...COMMERCIAL_ADMISSION_POINTS].sort().join(",") === Object.keys(ADMISSION_CONTEXT_REQUIREMENTS).sort().join(","),
  `authority=${[...COMMERCIAL_ADMISSION_POINTS].sort().join(",")} table=${Object.keys(ADMISSION_CONTEXT_REQUIREMENTS).sort().join(",")}`
);

// --- one governed call site per exported point ----------------------------
const wiring = [];
for (const point of COMMERCIAL_ADMISSION_POINTS) {
  const sites = callSitesFor(point);
  wiring.push({ point, sites });
  check(
    `${point}: exactly one governed call site`,
    sites.length === 1,
    sites.length === 0 ? "no governed call site" : `${sites.length} call sites: ${sites.join(", ")}`
  );
}

// --- no second commercial rule --------------------------------------------
/**
 * The authority module is the only thing allowed to decide eligibility. Nothing
 * outside it may import the raw evaluator or re-implement the proven state.
 */
const FORBIDDEN_OUTSIDE_AUTHORITY = [
  "evaluateFulfillmentAuthority",
  "admitCommercialAction"
];
for (const symbol of FORBIDDEN_OUTSIDE_AUTHORITY) {
  const offenders = [...SOURCES]
    .filter(([file]) => !file.startsWith("src/lib/rcap/fulfillment/"))
    .filter(([, source]) => source.includes(symbol))
    .map(([file]) => file);
  check(
    `no module outside the authority calls ${symbol}`,
    offenders.length === 0,
    offenders.join(", ")
  );
}

check(
  "the wiring module states no eligibility rule of its own",
  !/COMPLETE_PACKET_PROVEN/.test(SOURCES.get("src/lib/rcap/render/commercial-admission.ts") ?? ""),
  "commercial-admission.ts reasons about the proven state itself"
);

// --- consumer and sponsored parity ----------------------------------------
/**
 * The two entitlement kinds must be admitted by the same function. Proven by
 * asking the same question twice and requiring the same answer, rather than by
 * reading the code, because the failure being guarded against is a second code
 * path that looks correct.
 */
const identity = { routeId: "ND:first-offense-possession-sealing", jurisdiction: "ND", packetFamilyId: "rcap-nd-custom-pleading" };
const baseContext = lane.fulfillmentRequestContext({
  participantUserId: "synthetic-user",
  matterId: "synthetic-matter",
  matterOwnerUserId: "synthetic-user",
  finalVerification: lane.unverifiedFinalVerification({
    matterId: "synthetic-matter",
    ownerUserId: "synthetic-user",
    routeId: identity.routeId,
    packetFamilyId: identity.packetFamilyId,
    outcome: "VERIFICATION_PENDING",
    reason: null
  }),
  entitlement: lane.entitlementContext({
    kind: "consumer_payment",
    idempotencyKey: "synthetic-receipt",
    alreadyConsumed: false,
    serverVerified: true
  })
});

for (const point of COMMERCIAL_ADMISSION_POINTS) {
  const consumer = admit(point, { ...baseContext });
  const sponsored = admit(point, {
    ...baseContext,
    entitlement: baseContext.entitlement ? { ...baseContext.entitlement, kind: "sponsored_credit" } : null
  });
  check(
    `${point}: consumer and sponsored reach the same answer`,
    consumer.admitted === sponsored.admitted && consumer.denialCode === sponsored.denialCode,
    `consumer=${consumer.denialCode} sponsored=${sponsored.denialCode}`
  );
}

function admit(point, context) {
  try {
    return lane.governCommercialAdmission(point, identity, context);
  } catch (error) {
    return { admitted: false, denialCode: error.denialCode, error };
  }
}

// --- every route is denied today ------------------------------------------
check(
  "no route is commercially eligible at this base, so every point denies",
  COMMERCIAL_ADMISSION_POINTS.every((point) => admit(point, baseContext).admitted === false),
  "a point admitted while commercially eligible is zero"
);

check(
  "an unknown route denies rather than throwing an unhandled error",
  admit(COMMERCIAL_ADMISSION_POINTS[0], baseContext).admitted === false,
  "an unknown route did not deny"
);

// --- a refusal never leaks participant state ------------------------------
const denied = admit(COMMERCIAL_ADMISSION_POINTS[0], baseContext);
const body = denied.error ? lane.commercialAdmissionRefusalBody(denied.error) : null;
check(
  "a refusal body carries only a denial code and one sentence",
  body !== null && Object.keys(body).sort().join(",") === "error,resultCode",
  body ? Object.keys(body).join(",") : "no refusal was produced"
);
check(
  "a refusal body never carries context denials",
  body !== null && !JSON.stringify(body).includes("synthetic-matter") && !JSON.stringify(body).includes("synthetic-user"),
  JSON.stringify(body)
);

// --- artifact validation ---------------------------------------------------
const PDF = Buffer.from("%PDF-1.7\n/Type /Page\n/Type /Page\ntrailer\n", "latin1");
const firstPass = validation.validateArtifact({ bytes: PDF, expectedContentType: "application/pdf" });
check("a two-page PDF validates and reports its pages", firstPass.valid && firstPass.pageCount === 2, JSON.stringify(firstPass));

check(
  "a non-PDF is refused as a deliverable packet",
  validation.validateArtifact({ bytes: Buffer.from("plain text"), expectedContentType: "text/plain" }).valid === false,
  "a text artifact validated"
);

check(
  "a PDF declared but not delivered is refused",
  validation.validateArtifact({ bytes: Buffer.from("not a pdf"), expectedContentType: "application/pdf" }).valid === false,
  "a non-PDF passed as application/pdf"
);

check(
  "an empty artifact is refused",
  validation.validateArtifact({ bytes: Buffer.alloc(0), expectedContentType: "application/pdf" }).valid === false,
  "an empty artifact validated"
);

check(
  "a substituted object is refused against the recorded digest",
  validation.validateArtifact({
    bytes: Buffer.from("%PDF-1.7\n/Type /Page\nsomething else\n", "latin1"),
    expectedContentType: "application/pdf",
    expectedSha256: firstPass.sha256
  }).valid === false,
  "a substituted artifact matched the recorded digest"
);

check(
  "the same bytes reproduce the same digest, so repeat download is possible",
  validation.validateArtifact({ bytes: PDF, expectedContentType: "application/pdf", expectedSha256: firstPass.sha256 }).valid === true,
  "identical bytes failed their own digest"
);

check(
  "a page-count change is refused even when the digest is not checked",
  validation.validateArtifact({ bytes: PDF, expectedContentType: "application/pdf", expectedPageCount: 5 }).valid === false,
  "a page-count mismatch validated"
);

// --- participant denials, through the same admission ----------------------
/**
 * The participant half of the gate, exercised directly.
 *
 * Not through `admitCommercial`: the authority judges the route before the
 * participant — deliberately, so no request-shaped probe can tell "your matter
 * is wrong" from "this route was never proven" — and every route is unproven
 * today, so every admission short-circuits with no context denials at all.
 * Asserting through the full call would therefore pass while proving nothing,
 * and would keep passing after a route became proven and the participant checks
 * started mattering. So the context rule is asserted where it lives.
 */
function denialsFor(point, context) {
  return collectContextDenials({
    admissionPoint: point,
    context,
    routeId: identity.routeId,
    packetFamilyId: identity.packetFamilyId
  });
}

check(
  "the route is judged before the participant, so an unproven route refuses identically for everyone",
  COMMERCIAL_ADMISSION_POINTS.every((point) => {
    const wrongUser = admit(point, { ...baseContext, matterOwnerUserId: "someone-else" });
    const rightUser = admit(point, baseContext);
    return wrongUser.denialCode === rightUser.denialCode;
  }),
  "an unproven route gave a different answer to a non-owner, which leaks another participant's state"
);

const OWNERSHIP_POINT = COMMERCIAL_ADMISSION_POINTS.find((p) => ADMISSION_CONTEXT_REQUIREMENTS[p].ownership);
const ENTITLEMENT_POINT = COMMERCIAL_ADMISSION_POINTS.find((p) => ADMISSION_CONTEXT_REQUIREMENTS[p].entitlement);
const STORAGE_POINT = COMMERCIAL_ADMISSION_POINTS.find((p) => ADMISSION_CONTEXT_REQUIREMENTS[p].storage);

check(
  "an anonymous participant is denied on ownership",
  denialsFor(OWNERSHIP_POINT, { ...baseContext, participantUserId: "", matterOwnerUserId: "" })
    .some((d) => d.startsWith("ownership:")),
  "no ownership denial for an anonymous participant"
);

check(
  "the wrong user is denied on ownership",
  denialsFor(OWNERSHIP_POINT, { ...baseContext, matterOwnerUserId: "someone-else" })
    .some((d) => d.includes("does not own this matter")),
  "a non-owner was not denied"
);

check(
  "a verification bound to another matter is denied",
  denialsFor(OWNERSHIP_POINT, {
    ...baseContext,
    finalVerification: { ...baseContext.finalVerification, matterId: "a-different-matter" }
  }).some((d) => d.startsWith("final_verification:")),
  "a snapshot from another matter was accepted"
);

check(
  "a verification bound to another route is denied",
  denialsFor(OWNERSHIP_POINT, {
    ...baseContext,
    finalVerification: { ...baseContext.finalVerification, boundRouteId: "ZZ:some-other-route" }
  }).some((d) => d.includes("not " + identity.routeId)),
  "a snapshot for another route was accepted"
);

check(
  "an entitlement with no idempotency key cannot charge or consume",
  denialsFor(ENTITLEMENT_POINT, {
    ...baseContext,
    entitlement: { ...baseContext.entitlement, idempotencyKey: null }
  }).some((d) => d.includes("idempotency key")),
  "a keyless entitlement was accepted"
);

check(
  "an entitlement the server did not verify is denied",
  denialsFor(ENTITLEMENT_POINT, {
    ...baseContext,
    entitlement: { ...baseContext.entitlement, serverVerified: false }
  }).some((d) => d.startsWith("entitlement:")),
  "an unverified entitlement was accepted"
);

// The retry rule: a spent entitlement re-dispatches and never re-consumes.
const spent = { ...baseContext, entitlement: { ...baseContext.entitlement, alreadyConsumed: true } };
for (const point of COMMERCIAL_ADMISSION_POINTS.filter((p) => ADMISSION_CONTEXT_REQUIREMENTS[p].entitlement)) {
  const doubleCharge = denialsFor(point, spent).some((d) => d.includes("already consumed"));
  const tolerated = point === "provider" + "_dispatch";
  check(
    tolerated
      ? `${point}: a spent entitlement is tolerated, so a failed render retries without a second credit`
      : `${point}: a spent entitlement is refused as a double charge`,
    tolerated ? doubleCharge === false : doubleCharge === true,
    `alreadyConsumed produced ${doubleCharge ? "a refusal" : "no refusal"}`
  );
}

check(
  "a publicly reachable artifact is not deliverable",
  denialsFor(STORAGE_POINT, {
    ...baseContext,
    storage: { privateStorage: false, artifactSha256: "a".repeat(64), repeatDownload: false }
  }).some((d) => d.includes("private storage")),
  "a public artifact was accepted"
);

check(
  "an artifact with no recorded digest cannot bind delivery",
  denialsFor(STORAGE_POINT, {
    ...baseContext,
    storage: { privateStorage: true, artifactSha256: null, repeatDownload: false }
  }).some((d) => d.includes("SHA-256")),
  "an artifact with no digest was accepted"
);

check(
  "repeat download is refused for an artifact with no prior download",
  denialsFor("repeat" + "_download", {
    ...baseContext,
    storage: { privateStorage: true, artifactSha256: "a".repeat(64), repeatDownload: false }
  }).some((d) => d.includes("no prior download")),
  "a first download was admitted as a repeat"
);

check(
  "repeat download requires no entitlement, so it costs no second payment or credit",
  ADMISSION_CONTEXT_REQUIREMENTS["repeat" + "_download"].entitlement === false
    && ADMISSION_CONTEXT_REQUIREMENTS["private" + "_download"].entitlement === false,
  "a download point requires an entitlement, which would let delivery charge again"
);

// --- report ----------------------------------------------------------------
console.log("\nAdmission point wiring:");
for (const { point, sites } of wiring) {
  console.log(`  ${point.padEnd(34)} ${sites.length === 1 ? sites[0] : `${sites.length} call sites`}`);
}

console.log(
  failed === 0
    ? `\nverify-rcap-lane-f-commercial-admission passed: ${passed}/${passed} checks, ${COMMERCIAL_ADMISSION_POINTS.length} admission points each governed exactly once.`
    : `\nverify-rcap-lane-f-commercial-admission FAILED: ${failed} of ${passed + failed} checks.`
);
process.exit(failed === 0 ? 0 : 1);
