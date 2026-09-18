#!/usr/bin/env node
/**
 * The 2026-09-18 route-kind correction, held to exactly what was authorized.
 *
 * Four intended-paid pathways carried `guidance_only` in the committed closure
 * while the deterministic generators produced `factory_v2` for them. The
 * committed artifact was stale, not the generator: the factory_v2 registry had
 * been short by five rows for long enough that the witness sets, the
 * paid-pathway legal join and the Session A evidence packet were all short by
 * the same five, and the launch graph refused to build because its own
 * one-denominator check found them missing.
 *
 * Roger authorized adopting the regenerated state for these four routes, and
 * nothing else. That authorization is narrow on purpose, so this proves the
 * narrowness rather than asserting it:
 *
 *   ALLOWED   routeKind guidance_only -> factory_v2
 *             rendererKind none -> packet_document_v1
 *             the stale "no renderer" blocker clearing, where current
 *             generation proves the renderer produces bytes
 *
 *   REFUSED   sellable, consumer Checkout, sponsored entitlement, packet-credit
 *             consumption, participant delivery, approved_for_live, legal
 *             approval, visual approval, either remaining blocker clearing, or
 *             any fifth route joining them
 *
 * Baseline is the Production application baseline. The closure is byte
 * identical between it and HEAD, so reading HEAD's committed copy reads the
 * baseline state.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);
process.env.RCAP_EVALUATOR_TODAY ??= "2026-08-28";

const AUTHORIZATION = "data/record-clearing/legal-decisions/2026-09-18-route-kind-correction.json";
const CLOSURE = "data/rcap-ledger/sellable-pathway-closure.json";
const BASELINE_SHA = "8682bd00731e247a4fe93f39075c532476eb5c74";

const failures = [];
let checks = 0;
const ok = (label, condition, detail) => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail === undefined ? "" : ` — got ${detail}`}`);
};

const rootDir = process.cwd();
const decision = JSON.parse(fs.readFileSync(path.join(rootDir, AUTHORIZATION), "utf8"));
const AUTHORIZED = decision.routes.map((entry) => entry.pathwayKey);

/** The closure as the Production baseline committed it. */
const baselineClosure = JSON.parse(
  spawnSync("git", ["show", `${BASELINE_SHA}:${CLOSURE}`], { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).stdout
);
const currentClosure = JSON.parse(fs.readFileSync(path.join(rootDir, CLOSURE), "utf8"));
const baselineByKey = new Map(baselineClosure.pathways.map((entry) => [entry.pathwayKey, entry]));
const currentByKey = new Map(currentClosure.pathways.map((entry) => [entry.pathwayKey, entry]));

const { resolvePacketRoute, packetRouteCanRender } = await import("@/lib/rcap/documents/packet-route-resolver");
const { packetFulfillmentAuthority, assertPacketFulfillmentProven } =
  await import("@/lib/expungement-ai/packet-fulfillment-authority");
const { composablePacketSpecificationFor } = await import("@/lib/rcap/grade-a/packet-specification");
const refuses = (run) => { try { run(); return false; } catch { return true; } };

// ------------------------------------------- the authorization's own bounds
ok("the authorization names exactly four routes", AUTHORIZED.length === 4, String(AUTHORIZED.length));
ok("the authorization records who granted it and when",
  decision.authorizedBy?.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(decision.authorizedOn ?? ""));
ok("the authorization states what it does not authorize",
  Array.isArray(decision.doesNotAuthorize) && decision.doesNotAuthorize.length >= 8);

/**
 * No fifth route moved. This is the widening check, and it runs over the whole
 * closure rather than the authorized list: a route changing route kind outside
 * the authorization is exactly what this correction must not have done.
 */
const movedRouteKind = [...currentByKey.entries()]
  .filter(([key, entry]) => baselineByKey.get(key)?.route?.routeKind !== entry.route?.routeKind)
  .map(([key]) => key)
  .sort();
ok("no route outside the authorization changed route kind",
  movedRouteKind.every((key) => AUTHORIZED.includes(key)),
  movedRouteKind.filter((key) => !AUTHORIZED.includes(key)).join(", "));

const paidBaseline = baselineClosure.pathways.filter((entry) => entry.category === "paid_packet_intended").map((entry) => entry.pathwayKey).sort();
const paidCurrent = currentClosure.pathways.filter((entry) => entry.category === "paid_packet_intended").map((entry) => entry.pathwayKey).sort();
ok("the paid denominator is unchanged by this correction",
  paidBaseline.join("\n") === paidCurrent.join("\n"),
  `${paidBaseline.length} baseline vs ${paidCurrent.length} current`);

// ------------------------------------------------------ each route, in turn
for (const authorized of decision.routes) {
  const key = authorized.pathwayKey;
  const before = baselineByKey.get(key);
  const after = currentByKey.get(key);
  const [code, pathwayId] = key.split(/:(.+)/);
  const label = key.slice(0, 44);

  ok(`${label}: the pathway exists on both sides`, Boolean(before) && Boolean(after));
  if (!before || !after) continue;

  // 1. Identity.
  ok(`${label}: pathway identity unchanged`,
    before.pathwayKey === after.pathwayKey && before.jurisdiction === after.jurisdiction
    && before.pathwayId === after.pathwayId);

  // 2. Denominator membership.
  ok(`${label}: paid-denominator membership unchanged`,
    before.category === "paid_packet_intended" && after.category === "paid_packet_intended",
    `${before.category} -> ${after.category}`);

  // 3 and 5. Evaluator legal outcome and payment authority.
  ok(`${label}: evaluator legal outcome unchanged`,
    JSON.stringify(before.stages) === JSON.stringify(after.stages)
    || (before.stages.publiclyReachableSellable === after.stages.publiclyReachableSellable
      && before.stages.authoritativePacketReady === after.stages.authoritativePacketReady
      && before.stages.legallyApprovedPacket === after.stages.legallyApprovedPacket
      && before.stages.technicallyApprovedPacket === after.stages.technicallyApprovedPacket),
    `${JSON.stringify(before.stages)} -> ${JSON.stringify(after.stages)}`);
  ok(`${label}: legal approval did not move`, after.stages.legallyApprovedPacket === false);
  ok(`${label}: technical approval did not move`, after.stages.technicallyApprovedPacket === false);

  // 6, 7 and 12. The authorized change, and only it.
  ok(`${label}: route kind moved exactly guidance_only -> factory_v2`,
    before.route.routeKind === "guidance_only" && after.route.routeKind === "factory_v2",
    `${before.route.routeKind} -> ${after.route.routeKind}`);
  ok(`${label}: renderer became packet_document_v1`,
    before.route.rendererKind === "none" && after.route.rendererKind === "packet_document_v1",
    `${before.route.rendererKind} -> ${after.route.rendererKind}`);
  ok(`${label}: sellable remains false`, before.route.sellable === false && after.route.sellable === false);
  ok(`${label}: creditConsumable remains false`,
    before.route.creditConsumable === false && after.route.creditConsumable === false);

  // The live resolver, not the recorded copy.
  const track = composablePacketSpecificationFor(key)?.trackId ?? null;
  const live = resolvePacketRoute({ state: code, pathway: pathwayId, trackId: track });
  ok(`${label}: the live resolver agrees it is not sellable`, live.sellable === false, String(live.sellable));
  ok(`${label}: the live resolver agrees no credit is consumable`, live.creditConsumable === false, String(live.creditConsumable));

  // 8, 9 and 10. Every commercial surface still refuses, driven not read.
  for (const surface of ["checkout creation", "consumer payment authority", "sponsored entitlement",
    "packet credit consumption", "packet generation", "participant delivery"]) {
    ok(`${label}: ${surface} still refuses`,
      refuses(() => assertPacketFulfillmentProven(code, pathwayId, surface, { trackId: track })));
  }
  ok(`${label}: commercial admission is refused`,
    packetFulfillmentAuthority(code, pathwayId, undefined, { trackId: track }).allowed === false);

  // 11. The packet family is an existing one, not a new product.
  ok(`${label}: the packet family is the expected existing family`,
    authorized.packetFamily === null || composablePacketSpecificationFor(key)?.packetFamily === authorized.packetFamily
    || after.route.reason.includes(authorized.packetFamily ?? "\u0000"),
    `${composablePacketSpecificationFor(key)?.packetFamily ?? "none"} vs authorized ${authorized.packetFamily}`);

  // 13. Rendering is real and deterministic.
  ok(`${label}: the renderer now produces bytes`, after.render.rendered === true && after.render.bytes > 0,
    `${after.render.rendered} / ${after.render.bytes} bytes`);
  ok(`${label}: it produced none before`, before.render.rendered === false && before.render.bytes === 0);
  ok(`${label}: the recorded byte count matches the authorization`,
    after.render.bytes === authorized.renderedBytes,
    `${after.render.bytes} vs authorized ${authorized.renderedBytes}`);
  ok(`${label}: the resolver still gates delivery separately from rendering`,
    packetRouteCanRender(live) === true
    && refuses(() => assertPacketFulfillmentProven(code, pathwayId, "participant delivery", { trackId: track })));

  // 14. Exactly one blocker cleared, and it was the stale renderer one.
  const beforeBlockers = before.openBlockers.map((entry) => entry.id).sort();
  const afterBlockers = after.openBlockers.map((entry) => entry.id).sort();
  const cleared = beforeBlockers.filter((id) => !afterBlockers.includes(id));
  ok(`${label}: exactly one blocker cleared`, cleared.length === 1, cleared.join(", "));
  ok(`${label}: the cleared blocker is the stale renderer one`,
    cleared[0] === authorized.clearedBlocker, `${cleared[0]} vs authorized ${authorized.clearedBlocker}`);
  ok(`${label}: the remaining blockers are exactly the authorized ones`,
    afterBlockers.join(", ") === [...authorized.remainingBlockers].sort().join(", "),
    `${afterBlockers.join(", ")} vs authorized ${[...authorized.remainingBlockers].sort().join(", ")}`);
  ok(`${label}: no blocker was added`, afterBlockers.every((id) => beforeBlockers.includes(id)));
}

// 15. Nothing participant-facing claims these are buyable or deliverable. The
//     census is the surface that would say so, and it must refuse all four.
const census = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-ledger/commercial-packet-integrity.json"), "utf8"));
for (const key of AUTHORIZED) {
  const row = census.rows.find((entry) => entry.route === key);
  ok(`${key.slice(0, 44)}: the census still answers for it`, Boolean(row));
  ok(`${key.slice(0, 44)}: the census reports it commercially refused`,
    row?.commercialAdmissionState === "refused" && row?.checkoutState === "refused"
    && row?.sponsorshipState === "refused" && row?.creditConsumptionState === "refused");
  ok(`${key.slice(0, 44)}: no participant-facing claim of availability`,
    row?.gradeAProofValid === false && row?.fulfillmentRecordValid === false);
}

if (failures.length > 0) {
  console.error(`\n2026-09-18 route-kind correction FAILED — ${failures.length} problem(s):\n${failures.map((entry) => ` - ${entry}`).join("\n")}`);
  process.exit(1);
}
console.log(`2026-09-18 route-kind correction — ${checks} checks over ${AUTHORIZED.length} authorized routes.`);
console.log("  Four routes gained a renderer they can demonstrably drive. None of them gained a sale.");
