#!/usr/bin/env node
/**
 * A personalized route refuses. It does not quietly become a legacy render.
 *
 * WHAT THIS IS FOR
 *
 * Two questions were being answered by one predicate:
 *
 *   A. does this route belong to personalized / Grade-A delivery?
 *   B. does this exact delivery currently hold valid fulfillment authority?
 *
 * `isPersonalizedDeliveryRoute` answered both. Mississippi counted as a
 * personalized route only while the owner's paid-consumer successor decision
 * still matched the specification bytes it pinned. The §4.2 document-contract
 * work moved those bytes -- correctly -- and Mississippi stopped being a
 * personalized route.
 *
 * `renderClaimPacket` asks that predicate and, when it is false, renders
 * through `renderRcapPacketPdf`: the legacy generator, which ADR-0004 and
 * AGENTS.md record as not an approved commercial fulfillment path. So the loss
 * of an owner approval did not produce a refusal. It produced a silent
 * substitution of the renderer, and nothing anywhere reported it, because from
 * the dispatcher's side nothing had failed.
 *
 * This control holds the separation: membership is static, authority is
 * enforced where authority lives, and a route in the first category never
 * reaches the legacy renderer regardless of the second.
 *
 * WHAT IT DOES NOT CLAIM
 *
 * It does not establish that Mississippi's authority *should* be refused --
 * that is the owner's stale approval, recorded as item 11 of the external
 * action register, and it is deliberately not repaired here. It establishes
 * only that the refusal is a refusal.
 */

import assert from "node:assert";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

const {
  isPersonalizedDeliveryRoute, msPaidSuccessorAvailable, preparePersonalizedPacket,
  PERSONALIZED_DELIVERY_ROUTE
} = await import("../src/lib/rcap/render/personalized-packet.ts");
const { MS_PAID_SUCCESSOR_ROUTE, loadMsPaidConsumerSuccessor } =
  await import("../src/lib/rcap/fulfillment/paid-consumer-successor.ts");
const { packetFulfillmentAuthority } = await import("../src/lib/expungement-ai/packet-fulfillment-authority.ts");
const { renderClaimPacket } = await import("./rcap-render-worker.mjs");

/* ---------------------------------------------------------------- identity */

check(
  isPersonalizedDeliveryRoute(MS_PAID_SUCCESSOR_ROUTE),
  "Mississippi non-conviction belongs to personalized delivery by route identity"
);
check(
  isPersonalizedDeliveryRoute(PERSONALIZED_DELIVERY_ROUTE),
  "Illinois felony-prostitution relief belongs to personalized delivery by route identity"
);
check(
  !isPersonalizedDeliveryRoute("MS:additional-justice-court-misdemeanor-relief-9-11-15-3"),
  "a sibling Mississippi route does not join by jurisdiction"
);
check(
  !isPersonalizedDeliveryRoute("WY:felony-conviction-expungement-w-s-7-13-1502"),
  "a route with a Grade-A specification does not join by resembling one"
);

/*
 * The separation itself, stated as one measurement.
 *
 * This is the whole control in a line: on this candidate Mississippi's owner
 * approval is unavailable, and the route is a personalized route anyway. If
 * these two ever move together again, membership has been made conditional
 * once more and the fallback is back.
 */
const successorLive = msPaidSuccessorAvailable();
console.log(`     (Mississippi successor approval available: ${successorLive})`);
check(
  isPersonalizedDeliveryRoute(MS_PAID_SUCCESSOR_ROUTE),
  `route membership does not depend on the successor approval (approval available: ${successorLive})`
);
check(
  successorLive === (loadMsPaidConsumerSuccessor() !== null),
  "the commercial question is still askable, through its own predicate"
);

/* --------------------------------------------------------------- authority */

const authority = packetFulfillmentAuthority(
  "MS", MS_PAID_SUCCESSOR_ROUTE.slice(3), "packet generation", { trackId: "ms-nonconv" }
);
if (!successorLive) {
  check(
    !authority.allowed,
    `with the successor approval unavailable, fulfillment authority refuses Mississippi${
      authority.allowed ? "" : ` (${authority.reason})`}`
  );
}

/*
 * An explicit refusal, raised as an error, from the preparation path.
 *
 * The snapshot below is deliberately empty of packet facts: authority is
 * checked before any of them are read, so a refusal here is the authority
 * refusing rather than composition failing for want of a fact. If authority
 * ever stops being first, this test starts failing on a different message and
 * says so.
 */
if (!authority.allowed) {
  let raised = null;
  try {
    preparePersonalizedPacket({
      authUserId: "00000000-0000-4000-8000-000000000001",
      briefcaseItemId: "00000000-0000-4000-8000-000000000002",
      personId: "00000000-0000-4000-8000-000000000003",
      matterId: "00000000-0000-4000-8000-000000000004",
      verificationHash: "a".repeat(64),
      snapshot: {
        jurisdiction: "MS", pathwayId: MS_PAID_SUCCESSOR_ROUTE.slice(3),
        selectedTrackId: "ms-nonconv", verifiedAt: "2026-09-20T00:00:00.000Z",
        screeningAnswers: {}, prefilledAnswers: {}, packetAnswers: {}, serverFacts: {}
      }
    });
  } catch (error) {
    raised = error instanceof Error ? error.message : String(error);
  }
  check(
    raised !== null && raised.startsWith("personalized render authority refused"),
    `preparing a Mississippi packet refuses explicitly${raised ? `: "${raised.slice(0, 90)}…"` : " (it did not refuse at all)"}`
  );
}

/* ------------------------------------------------- and never a legacy render */

/**
 * The dispatcher, driven for real.
 *
 * There is no Supabase in this process, so both paths fail -- and they fail
 * with DIFFERENT messages, which is what makes this a measurement rather than
 * a restatement of the source. The personalized path stops at its own storage
 * check; the legacy path stops at `packet <id> not found`. Seeing the second
 * message for a personalized route is the defect this file exists for.
 */
async function dispatch(routeId) {
  try {
    await renderClaimPacket({
      routeId, packetId: "00000000-0000-4000-8000-00000000dead",
      inputHash: "b".repeat(64), personId: null, matterId: null,
      rendererKind: "rcap_grade_a_document_v1", rendererVersion: "1.0.0",
      profileId: "x", profileVersion: 1
    });
    return { outcome: "rendered", message: "" };
  } catch (error) {
    return { outcome: "refused", message: error instanceof Error ? error.message : String(error) };
  }
}

const LEGACY_MARKER = /not found$/;

for (const routeId of [MS_PAID_SUCCESSOR_ROUTE, PERSONALIZED_DELIVERY_ROUTE]) {
  const { outcome, message } = await dispatch(routeId);
  check(outcome === "refused", `${routeId}: the dispatcher refuses rather than returning bytes`);
  check(
    !LEGACY_MARKER.test(message),
    `${routeId}: the refusal is not the legacy renderer's${
      LEGACY_MARKER.test(message) ? ` (got "${message}")` : ` (got "${message.slice(0, 70)}…")`}`
  );
}

/*
 * POSITIVE CONTROL. A route that genuinely is not personalized still takes the
 * legacy path, and the marker above genuinely identifies it. Without this, the
 * two checks above would pass on a dispatcher that refused everything.
 */
const ordinary = await dispatch("MS:additional-justice-court-misdemeanor-relief-9-11-15-3");
check(
  LEGACY_MARKER.test(ordinary.message),
  `POSITIVE control: a non-personalized route does reach the legacy path (got "${ordinary.message.slice(0, 70)}…")`
);

/*
 * NEGATIVE control on the predicate itself, run against the exact shape that
 * caused the defect. The old rule is reconstructed here rather than described,
 * so this file keeps demonstrating what was wrong with it after everyone who
 * remembers has moved on.
 */
const oldRule = (routeId) =>
  routeId === PERSONALIZED_DELIVERY_ROUTE
  || (routeId === MS_PAID_SUCCESSOR_ROUTE && loadMsPaidConsumerSuccessor() !== null);
if (!successorLive) {
  check(
    oldRule(MS_PAID_SUCCESSOR_ROUTE) === false && isPersonalizedDeliveryRoute(MS_PAID_SUCCESSOR_ROUTE) === true,
    "NEGATIVE control: the previous rule drops Mississippi out of personalized delivery here, and the current one does not"
  );
}

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
void rootDir;
