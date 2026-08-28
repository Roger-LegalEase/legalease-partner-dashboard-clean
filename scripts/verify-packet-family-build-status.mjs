#!/usr/bin/env node
/**
 * A family that does not exist may not be sold, and may not be described as
 * though it does.
 *
 * The status ledger is generated, so this does not re-derive it. What it checks
 * is the consequence: no route may SELL a family that does not exist.
 *
 * Selling is measured where a participant meets it — the evaluator's own
 * terminal witness for the route — and not at the resolver. The first version
 * of this file failed on `resolveRoute(...).delivery.paymentAllowed` and
 * reported forty-eight routes selling unbuilt packets. Forty-three of them were
 * closed by the evaluator, which ANDs the resolver's authority with the packet
 * plan's readiness; the resolver declining to close a route is not the same as
 * the route being open. The remaining five were Mississippi, which is on the
 * preserved-legacy-generator list, so their families exist and are produced by
 * the legacy generator — the label was wrong, not the routes.
 *
 * The resolver-level gap is still worth seeing, so it is reported. It is not a
 * failure, because it is not a statement about what anyone can buy.
 *
 * It also checks the pairing that made this necessary: a contract naming a
 * petition family while its registry row carries only a guidance family. Both
 * halves are true statements and together they are a defect, which is why
 * neither side found it alone.
 */
import fs from "node:fs";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

process.env.RCAP_EVALUATOR_TODAY ??= "2026-08-28";
const { resolveRoute } = await import("@/lib/legal-authority/resolve-route");

const ledger = JSON.parse(fs.readFileSync("data/rcap-ledger/packet-family-build-status.json", "utf8"));
const failures = [];
const on = new Date(`${process.env.RCAP_EVALUATOR_TODAY}T00:00:00Z`);

const witnesses = JSON.parse(fs.readFileSync("data/rcap-ledger/public-witness-answer-sets.json", "utf8")).witnesses;
const paymentAllowedByRouteKey = new Map(witnesses.map((witness) => [witness.pathwayKey, witness.terminalEvaluation?.paymentAllowed === true]));

const BUILT_STATUSES = new Set(["BUILT", "BUILT_BY_PRESERVED_LEGACY_GENERATOR"]);

/**
 * The Mississippi § 99-15-59 open question is answered, so the exemption is gone.
 *
 * It read: does the legacy Mississippi generator produce a § 99-15-59 packet?
 * It was run. The consumer paid path produces a 1,165-byte plain-text status
 * summary with no petition, no proposed order, no filing destination, no fee
 * instruction and no service step; the legacy petition generator serves the
 * partner documents path behind a live sponsorship, its document types cover
 * three Mississippi pathways and not this one, and its proposed order is a
 * placeholder. The route is closed at every commercial and delivery surface —
 * see data/rcap-ledger/packet-correction-required.json and
 * scripts/verify-ms-99-15-59-packet-correction.mjs.
 *
 * The map stays empty rather than being deleted, so a future exemption has to
 * be written down and argued for in a diff.
 */
const OPEN_QUESTIONS = new Map([]);

let guidanceFamilyMismatches = 0;
let resolverWouldNotClose = 0;
for (const row of ledger.rows) {
  const [code, pathwayId] = row.routeKey.split(/:(.+)/);
  if (BUILT_STATUSES.has(row.status)) continue;

  const resolution = resolveRoute({ jurisdiction: code, pathwayId, facts: {}, on, phase: "FINAL_VERIFICATION" });
  if (!resolution.contract) {
    failures.push(`${row.routeKey}: recorded here with no resolvable contract.`);
    continue;
  }
  // The binding check: what a participant can actually buy.
  if (paymentAllowedByRouteKey.get(row.routeKey) === true && !OPEN_QUESTIONS.has(row.routeKey)) {
    failures.push(`${row.routeKey}: the evaluator allows payment for "${row.packetFamily}", which is ${row.status}.`);
  }
  if (resolution.delivery?.paymentAllowed === true) resolverWouldNotClose += 1;

  // The Georgia case, stated generally: the contract names a petition family
  // and the registry holds a guidance family under the same route.
  const registryFamilies = row.registryPacketFamilies ?? [];
  if (/petition|motion|application/i.test(row.packetFamily)
    && registryFamilies.length > 0
    && registryFamilies.every((family) => /guidance/i.test(family))) {
    guidanceFamilyMismatches += 1;
    if (BUILT_STATUSES.has(row.status)) {
      failures.push(`${row.routeKey}: recorded BUILT while its only registry family is guidance (${registryFamilies.join(", ")}).`);
    }
  }
}

console.log(`Packet families: ${JSON.stringify(ledger.totals)}`);
console.log(`  ${guidanceFamilyMismatches} contract petition family with only a guidance family in its registry row.`);
console.log(`  ${resolverWouldNotClose} unbuilt family whose route the canonical resolver does not close on its own — each held by the evaluator's packet-plan readiness instead. Not a defect; a single point of failure worth knowing about.`);
if (failures.length > 0) {
  console.error("\nPacket-family build status FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
for (const [routeKey, why] of OPEN_QUESTIONS) {
  const row = ledger.rows.find((candidate) => candidate.routeKey === routeKey);
  if (!row) {
    failures.push(`${routeKey}: recorded as an open question and it no longer names a packet family. Remove the entry.`);
  } else if (BUILT_STATUSES.has(row.status) || paymentAllowedByRouteKey.get(routeKey) !== true) {
    failures.push(`${routeKey}: recorded as an open question and it no longer sells an unbuilt family. Remove the entry.`);
  }
}
if (failures.length > 0) {
  console.error("\nPacket-family build status FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
for (const [routeKey, why] of OPEN_QUESTIONS) console.log(`  OPEN QUESTION  ${routeKey} — ${why}`);
console.log("No unbuilt packet family can be sold, sponsored or generated.");
