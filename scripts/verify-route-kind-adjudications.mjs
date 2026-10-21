#!/usr/bin/env node
/**
 * Where the legal contract and the evaluator's route-kind heuristics disagree.
 *
 * The heuristics in `isCourtFiledPetitionRoute` are per-jurisdiction lists and
 * keyword tests over a pathway's own label and summary. They exist for routes
 * that carry no contract. Where a contract does exist and declares a
 * participant packet with a named family, the contract is the authority — but
 * applying that to every route at once would move twenty-five routes across
 * sixteen jurisdictions in one step, four of them straight to a ready-packet
 * presentation. So each disagreement is adjudicated on its own row.
 *
 * This computes the disagreement set from the code rather than restating it,
 * and fails if a route disagrees with no row to its name. The pending list can
 * shrink by adjudication; it cannot grow by accident.
 */
import fs from "node:fs";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles } = await import("@/lib/rcap-engine/profile-registry");
const { isCourtFiledPetitionRoute, contractDeclaresParticipantPacket } = await import("@/lib/rcap-engine/evaluator");

const LEDGER = "data/rcap-ledger/route-kind-adjudications.json";
const ledger = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
const rowByKey = new Map(ledger.rows.map((row) => [row.routeKey, row]));

const failures = [];
const disagreements = [];

for (const profile of getAllJurisdictionProfiles()) {
  const code = profile.jurisdiction.code;
  for (const pathway of profile.pathways ?? []) {
    if (!contractDeclaresParticipantPacket(code, pathway.id)) continue;
    // The verdict the heuristics reach on their own, with the contract muted.
    const heuristic = isCourtFiledPetitionRoute(profile, pathway, { ignoreContractDeclaration: true });
    if (heuristic) continue;
    disagreements.push(`${code}:${pathway.id}`);
  }
}

for (const routeKey of disagreements) {
  const row = rowByKey.get(routeKey);
  if (!row) {
    failures.push(`${routeKey}: the contract declares a participant packet and the heuristics do not, with no adjudication row. Add one to ${LEDGER}.`);
  }
}

for (const row of ledger.rows) {
  if (!disagreements.includes(row.routeKey)) {
    failures.push(`${row.routeKey}: has an adjudication row but the contract and the heuristics no longer disagree. Remove the row rather than leaving it to rot.`);
  }
  if (!["applied", "pending"].includes(row.status)) {
    failures.push(`${row.routeKey}: status ${JSON.stringify(row.status)} is neither applied nor pending.`);
  }
  if (row.status === "pending" && typeof row.priorResultCodeIsConclusive !== "boolean") {
    failures.push(`${row.routeKey}: a pending row must say whether its measured prior result code actually shows the disagreement.`);
  }
  for (const field of ["contractSays", "heuristicSaid", "priorResultCode", "proposedResultCode", "evidence"]) {
    if (typeof row[field] !== "string" || row[field].length === 0) {
      failures.push(`${row.routeKey}: ${field} is missing.`);
    }
  }
  if (row.status === "applied") {
    if (typeof row.adjudicatedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.adjudicatedOn)) {
      failures.push(`${row.routeKey}: an applied row needs the date it was adjudicated.`);
    }
    if (typeof row.decisionId !== "string" || row.decisionId.length === 0) {
      failures.push(`${row.routeKey}: an applied row needs the decision that authorises it.`);
    }
  }
}

const applied = ledger.rows.filter((row) => row.status === "applied");
const pending = disagreements.filter((key) => rowByKey.get(key)?.status !== "applied");

console.log(`Route-kind adjudications: ${disagreements.length} contract/heuristic disagreements, ${applied.length} applied, ${pending.length} pending.`);
if (process.argv.includes("--report")) {
  for (const key of disagreements) {
    const row = rowByKey.get(key);
    console.log(`  ${row?.status === "applied" ? "APPLIED" : "pending"}  ${key} — ${row?.priorResultCode ?? "?"} -> ${row?.proposedResultCode ?? "?"}`);
  }
}

if (failures.length > 0) {
  console.error("\nRoute-kind adjudication FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("Every contract/heuristic disagreement is on the record, and only adjudicated ones govern.");
