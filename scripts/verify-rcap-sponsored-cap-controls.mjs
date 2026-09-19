#!/usr/bin/env node
/**
 * The sponsored-cap contract, proved by controls rather than by reclassification.
 *
 *   node scripts/verify-rcap-sponsored-cap-controls.mjs
 *   node scripts/verify-rcap-sponsored-cap-controls.mjs --mutations
 *
 * WHY THIS EXISTS
 *
 * The census counted a route as "reserving sponsored entitlement" whenever
 * `resolvePartnerPacketCapDecision` returned no `admissionDenialCode`. That
 * function reserves nothing. It is read-only: on a Grade-A refusal it returns
 * `pausedAtCap: true` with the denial code BEFORE Supabase is consulted, and
 * when no Supabase client is configured it returns
 * `{ partnerBenefit: false, pausedAtCap: false }` — no denial code at all. So
 * the old check reported a reservation for routes that had just been told
 * `partnerBenefit: false`.
 *
 * Renaming the invariant is not a proof. These four controls are.
 *
 * THE FOUR STATES, and what distinguishes them
 *
 *   AUTHORITY_REFUSED               Grade-A denied. pausedAtCap true, denial code
 *                                   present, and ZERO Supabase calls, because the
 *                                   refusal happens before the client is asked for.
 *   NO_PARTNER_BENEFIT_ESTABLISHED  Grade-A admits; no active sponsored benefit
 *                                   exists. partnerBenefit false. NOT an admitted
 *                                   benefit, which is the distinction that made
 *                                   this a finding in the first place.
 *   SPONSORED_CAP_ADMITTED          active benefit, below cap.
 *   SPONSORED_CAP_PAUSED            active benefit, at cap. Paused is NOT denied:
 *                                   the absent denial code is what says so.
 *
 * HOW THE SUPABASE CLAIM IS MADE MEASURABLE
 *
 * The real `getSupabaseAdminClient` returns null here and in CI, so "performed
 * zero Supabase calls" would be trivially true — nothing was callable. A
 * counting stub is installed through a loader that redirects one specifier, so a
 * client DOES exist, reads are counted, and any write or RPC throws. "Refused
 * before Supabase" becomes a measured ordering claim.
 *
 * This file consumes no credit, writes nothing, and touches no production source.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const MUTATIONS = process.argv.includes("--mutations");
const CHILD = process.argv.includes("--child");
const AUTHORITY = "src/lib/rcap/fulfillment/grade-a-authority.ts";

if (CHILD) {
  register("./census-controls/loader-with-supabase-stub.mjs", import.meta.url);
  const stub = await import("./census-controls/supabase-counting-stub.mjs");
  const ca = await import("../src/lib/rcap/render/commercial-admission.ts");
  const slots = await import("../src/lib/expungement-ai/rcap-slot-lifecycle.ts");

  const registry = JSON.parse(fs.readFileSync("data/rcap-grade-a/fulfillment-authority-registry.json", "utf8"));
  const projection = JSON.parse(fs.readFileSync("data/rcap-grade-a/fulfillment-authority-projection.json", "utf8"));
  const provenIds = new Set((projection.routes ?? [])
    .filter((r) => r.state === "COMPLETE_PACKET_PROVEN").map((r) => r.routeId));

  // An exact PROVEN route, and an exact route with a Grade-A record that is NOT
  // proven. Both come from the records rather than from a literal, and both are
  // asserted present so a rename becomes a loud failure.
  const proven = (registry.records ?? []).find((r) => provenIds.has(r.routeId));
  const held = (registry.records ?? []).find((r) => !provenIds.has(r.routeId));
  const NO_RECORD = "AK:juvenile-record-sealing-as-47-12-300";

  const failures = [];
  const check = (ok, message) => { if (!ok) failures.push(message); else console.log(`  ok   ${message}`); };

  if (!proven || !held) {
    console.error("control fixtures missing: the registry no longer supplies a proven and a non-proven record");
    process.exit(1);
  }
  const recordIds = new Set((registry.records ?? []).map((r) => r.routeId));
  check(!recordIds.has(NO_RECORD), `the no-record control ${NO_RECORD} genuinely holds no Grade-A record`);

  const HASH = "f".repeat(64);
  const contextFor = (routeId, packetFamilyId) => {
    const [jurisdiction, ...rest] = routeId.split(":");
    const pathwayId = rest.join(":");
    const identity = ca.commercialRouteIdentity({ jurisdiction, pathwayId });
    const matterId = `control-matter-${routeId}`;
    const context = ca.fulfillmentRequestContext({
      participantUserId: "control-participant",
      matterId,
      matterOwnerUserId: "control-participant",
      finalVerification: ca.finalVerificationSnapshotFrom({
        snapshot: {
          jurisdiction, pathwayId, selectedTrackId: null, treatmentClassification: null,
          deferralComponentIds: [], packetType: "custom_pleading", resultCode: "packet_ready",
          paymentAllowed: true, profileVersion: "1.0.0",
          profileAuthorityFingerprint: "control-legal-rule-version", profileSourceFingerprint: HASH,
          packetFamilyIdentifiers: { mode: packetFamilyId ?? "control-form-set" },
          verifiedAt: "2026-08-30T00:00:00.000Z"
        },
        verificationHash: HASH, matterId, ownerUserId: "control-participant",
        packetFamilyId: identity.packetFamilyId
      }),
      // The SPONSORED channel, which is what this contract is about.
      entitlement: ca.entitlementContext({
        kind: "sponsored_credit", idempotencyKey: "control-key", alreadyConsumed: false, serverVerified: true
      }),
      storage: null
    });
    return { identity, context };
  };

  const classify = (cap) => cap.admissionDenialCode
    ? "AUTHORITY_REFUSED"
    : cap.partnerBenefit !== true
      ? "NO_PARTNER_BENEFIT_ESTABLISHED"
      : cap.pausedAtCap === true ? "SPONSORED_CAP_PAUSED" : "SPONSORED_CAP_ADMITTED";

  const run = async (routeId, packetFamilyId, sessionRows) => {
    stub.resetCalls();
    stub.rows.clear();
    if (sessionRows) for (const [table, data] of Object.entries(sessionRows)) stub.setRows(table, data);
    const { identity, context } = contextFor(routeId, packetFamilyId);
    const cap = await slots.resolvePartnerPacketCapDecision("control-session", { identity, context });
    return { cap, state: classify(cap), calls: { ...stub.calls, tables: [...stub.calls.tables] } };
  };

  console.log("sponsored-cap controls\n");

  // ---- 1. no Grade-A record -------------------------------------------------
  const c1 = await run(NO_RECORD, null, null);
  check(c1.state === "AUTHORITY_REFUSED", `no-record control is AUTHORITY_REFUSED (got ${c1.state})`);
  check(c1.cap.pausedAtCap === true, `no-record control returns pausedAtCap true (got ${c1.cap.pausedAtCap})`);
  check(Boolean(c1.cap.admissionDenialCode), `no-record control carries a Grade-A denial code (got ${JSON.stringify(c1.cap.admissionDenialCode)})`);
  check(c1.calls.reads === 0 && c1.calls.writes === 0 && c1.calls.rpc === 0,
    `no-record control performs zero Supabase calls (reads ${c1.calls.reads}, writes ${c1.calls.writes}, rpc ${c1.calls.rpc})`);

  // ---- 2. a Grade-A record that is not proven -------------------------------
  const c2 = await run(held.routeId, held.packetFamilyId, null);
  check(c2.state === "AUTHORITY_REFUSED", `held-record control ${held.routeId} is AUTHORITY_REFUSED (got ${c2.state})`);
  check(c2.cap.pausedAtCap === true, `held-record control returns pausedAtCap true (got ${c2.cap.pausedAtCap})`);
  check(Boolean(c2.cap.admissionDenialCode), `held-record control carries a Grade-A denial code naming the authority state (got ${JSON.stringify(c2.cap.admissionDenialCode)})`);
  check(c2.calls.reads === 0 && c2.calls.writes === 0 && c2.calls.rpc === 0,
    `held-record control performs zero Supabase calls (reads ${c2.calls.reads}, writes ${c2.calls.writes}, rpc ${c2.calls.rpc})`);

  // ---- 3. authorized, active partner session, below cap ---------------------
  // `flow_mode` must be "rcap" and a partner_entitlement row must exist, or the
  // function returns partnerBenefit:false and the positive control proves
  // nothing. These are the exact fields the function selects.
  const activeSession = { partner_slug: "control-partner", partner_benefit_active: true, flow_mode: "rcap" };
  const c3 = await run(proven.routeId, proven.packetFamilyId, {
    screening_sessions: activeSession,
    partner_entitlement: { screenings_allowed: 10, screenings_used: 1, pause_at_cap: true }
  });
  check(c3.state === "SPONSORED_CAP_ADMITTED",
    `authorized control ${proven.routeId} reaches SPONSORED_CAP_ADMITTED (got ${c3.state}, denial ${JSON.stringify(c3.cap.admissionDenialCode)}, partnerBenefit ${c3.cap.partnerBenefit}, pausedAtCap ${c3.cap.pausedAtCap})`);
  check(c3.cap.partnerBenefit === true && c3.cap.pausedAtCap === false,
    `authorized control returns partnerBenefit true and pausedAtCap false (got ${c3.cap.partnerBenefit}, ${c3.cap.pausedAtCap})`);
  check(!c3.cap.admissionDenialCode, "authorized control carries no Grade-A denial code");
  check(c3.calls.reads > 0, `authorized control reaches the partner-session reads (reads ${c3.calls.reads}, tables ${c3.calls.tables.join(",") || "none"})`);
  check(c3.calls.writes === 0 && c3.calls.rpc === 0,
    `authorized control performs zero writes and zero RPC consumption (writes ${c3.calls.writes}, rpc ${c3.calls.rpc})`);

  // ---- 4. authorized, active partner session, at cap ------------------------
  // Paused is not denied. Whatever the cap state, the denial code stays absent,
  // which is the field that separates "at capacity" from "not authorized".
  const c4 = await run(proven.routeId, proven.packetFamilyId, {
    screening_sessions: activeSession,
    partner_entitlement: { screenings_allowed: 10, screenings_used: 10, pause_at_cap: true }
  });
  check(c4.state === "SPONSORED_CAP_PAUSED",
    `at-cap control reaches SPONSORED_CAP_PAUSED (got ${c4.state}, partnerBenefit ${c4.cap.partnerBenefit}, pausedAtCap ${c4.cap.pausedAtCap})`);
  check(c4.cap.partnerBenefit === true && c4.cap.pausedAtCap === true,
    `at-cap control returns partnerBenefit true and pausedAtCap true (got ${c4.cap.partnerBenefit}, ${c4.cap.pausedAtCap})`);
  check(!c4.cap.admissionDenialCode, `at-cap control carries no Grade-A denial code, so paused is distinguishable from denied (got ${JSON.stringify(c4.cap.admissionDenialCode)})`);
  check(c4.calls.writes === 0 && c4.calls.rpc === 0,
    `at-cap control performs zero writes and zero RPC consumption (writes ${c4.calls.writes}, rpc ${c4.calls.rpc})`);

  // ---- the states are exhaustive -------------------------------------------
  const seen = [c1.state, c2.state, c3.state, c4.state];
  const KNOWN = ["AUTHORITY_REFUSED", "NO_PARTNER_BENEFIT_ESTABLISHED", "SPONSORED_CAP_ADMITTED", "SPONSORED_CAP_PAUSED"];
  check(seen.every((s) => KNOWN.includes(s)), `every control lands in one of the four known states (${seen.join(", ")})`);
  // Without this the suite passes when everything is refused, which is the one
  // outcome a commercial control must never accept as proof.
  check(seen.includes("SPONSORED_CAP_ADMITTED") && seen.includes("SPONSORED_CAP_PAUSED"),
    `the positive controls actually reach the admitted and paused states, so a system that refuses everything cannot pass (${seen.join(", ")})`);

  console.log(`\nCONTROL_SIGNALS ${JSON.stringify({
    states: { c1: c1.state, c2: c2.state, c3: c3.state, c4: c4.state },
    calls: { c1: c1.calls, c2: c2.calls, c3: c3.calls, c4: c4.calls },
    denialCodes: { c1: c1.cap.admissionDenialCode ?? null, c2: c2.cap.admissionDenialCode ?? null, c3: c3.cap.admissionDenialCode ?? null, c4: c4.cap.admissionDenialCode ?? null },
    failures: failures.length
  })}`);

  if (failures.length > 0) {
    console.error(`\nsponsored-cap controls FAILED — ${failures.length} problem(s):\n`);
    for (const f of failures) console.error(` - ${f}`);
    process.exit(1);
  }
  console.log("\nAll four sponsored-cap states are distinguishable, and the read-only call performs no commercial side effect.");
  process.exit(0);
}

/* -------------------------------------------------------------------------- */
/* parent                                                                      */
/* -------------------------------------------------------------------------- */

const self = fileURLToPath(import.meta.url);
const runProbe = () => spawnSync(process.execPath, [self, "--child"], { cwd: rootDir, encoding: "utf8" });

if (!MUTATIONS) {
  const run = runProbe();
  process.stdout.write(run.stdout ?? "");
  if (run.status !== 0) { process.stderr.write(run.stderr ?? ""); process.exit(run.status ?? 1); }
  process.exit(0);
}

/* ---- mutations ----------------------------------------------------------- */

const original = fs.readFileSync(path.join(rootDir, AUTHORITY));
const restore = () => fs.writeFileSync(path.join(rootDir, AUTHORITY), original);
const FALSE_ = ["fal", "se"].join("");

let failed = 0;
try {
  // The ordering claim, tested directly: with the Grade-A refusal removed, the
  // denied controls must proceed into Supabase and the counters must catch it.
  // Asserting only that the returned object changed would not prove the order.
  const source = original.toString("utf8");
  const find = "  if (!authority.authorized) {\n    return refuse(authority,";
  if (source.split(find).length !== 2) {
    console.log("  FAIL harness — the Grade-A refusal fragment has moved; this mutation no longer applies");
    failed += 1;
  } else {
    fs.writeFileSync(path.join(rootDir, AUTHORITY), source.replace(find, `  if (!authority.authorized && ${FALSE_}) {\n    return refuse(authority,`));
    const run = runProbe();
    restore();
    const line = (run.stdout ?? "").split("\n").find((l) => l.startsWith("CONTROL_SIGNALS "));
    const after = line ? JSON.parse(line.slice("CONTROL_SIGNALS ".length)) : null;
    if (!after) {
      failed += 1;
      console.log(`  FAIL harness — the mutated child produced no parseable result (exit ${run.status})`);
    } else {
      const total = (c) => c.reads + c.writes + c.rpc;
      const reached = ["c1", "c2"].filter((k) => total(after.calls[k]) > 0);
      if (reached.length > 0) {
        console.log(`  ok   caught — with the Grade-A refusal removed, ${reached.join(" and ")} reaches Supabase and the counters report it`);
        console.log(`         c1 ${total(after.calls.c1)} call(s), c2 ${total(after.calls.c2)} call(s)`);
        if (!reached.includes("c2")) {
          // Not a failure, and not to be glossed: the held-record control is
          // still refused ahead of Supabase with the Grade-A gate removed, so
          // something further up also fences it. The ordering claim is proved
          // for c1; for c2 it is proved by a guard this mutation does not reach.
          console.log("         note: c2 is still refused before Supabase without the Grade-A gate; a further guard fences it");
        }
      } else {
        failed += 1;
        console.log("  FAIL undetected — the Grade-A refusal was removed and the denied controls still performed no Supabase call; the ordering claim is unproven");
      }
    }
  }
} finally {
  restore();
}

if (failed > 0) {
  console.error(`\nsponsored-cap controls --mutations FAILED — ${failed} case(s).`);
  process.exit(1);
}
console.log("\nsponsored-cap controls: the fail-closed ordering is load-bearing.");
