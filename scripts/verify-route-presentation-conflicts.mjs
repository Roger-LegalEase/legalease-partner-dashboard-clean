#!/usr/bin/env node
/**
 * A held route is only held if the hold fires.
 *
 * Georgia's legacy first-offender route was already returning guidance_only for
 * an unrelated reason when this hold was added, so a check placed anywhere
 * downstream would have looked present and proved nothing. This runs the real
 * evaluator for every recorded route and requires the recorded reason code —
 * not merely a closed checkout, which the route already had.
 *
 * It also refuses a row whose route no longer exists, and a row missing the
 * evidence that makes it reviewable, so the ledger cannot rot into a list of
 * routes nobody can re-examine.
 */
import fs from "node:fs";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

process.env.RCAP_EVALUATOR_TODAY ??= "2026-08-28";
const { getProfileByJurisdiction } = await import("@/lib/rcap-engine/profile-registry");
const { projectPublicProfile } = await import("@/lib/rcap-engine/public-profile-projection");
const { evaluateScreening } = await import("@/lib/rcap-engine/evaluator");
const { resolveRoute } = await import("@/lib/legal-authority/resolve-route");

const LEDGER = "data/rcap-ledger/route-presentation-conflicts.json";
const ledger = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
const failures = [];
const REQUIRED = ["classification", "provenStatute", "provenBy", "whatIsConflated", "whyItIsHeld"];

for (const row of ledger.rows) {
  const [code, pathwayId] = row.routeKey.split(/:(.+)/);
  for (const field of REQUIRED) {
    if (typeof row[field] !== "string" || row[field].length === 0) {
      failures.push(`${row.routeKey}: ${field} is missing; a held route must stay reviewable.`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row.raisedOn))) failures.push(`${row.routeKey}: raisedOn is not a date.`);
  if (row.status !== "held") continue;

  const profile = getProfileByJurisdiction(code);
  const pathway = profile?.pathways.find((candidate) => candidate.id === pathwayId);
  if (!pathway) {
    failures.push(`${row.routeKey}: the route no longer exists; remove the row.`);
    continue;
  }

  // A complete-enough answer set, filled from each question's own options so
  // the run reaches the hold rather than stalling on missing facts.
  const publicProfile = projectPublicProfile(profile);
  const answers = { ownership_scope: "yes", jurisdiction_scope: "yes", possible_pathway_context: pathway.label };
  for (const question of publicProfile.questions) {
    if (answers[question.id] !== undefined || question.required !== true) continue;
    const options = question.options ?? [];
    const benign = options.find((option) => /none of these|^no$|^none$/i.test(option))
      ?? options.find((option) => !/not sure|unknown/i.test(option));
    // Several required questions carry no options — yes/no prompts and free
    // text. Skipping them leaves the run stuck on missing_required_facts, which
    // would hide the very hold this file exists to prove.
    answers[question.id] = benign
      ?? (/^yes_no/.test(String(question.type)) ? "no" : "not applicable");
  }
  const evaluation = evaluateScreening({ jurisdiction: code, profileVersion: profile.profileVersion, answers });
  const codes = (evaluation.reasons ?? []).map((entry) => entry.code);
  if (!codes.includes(`${code.toLowerCase()}.route_presentation_conflicts_with_its_contract`)) {
    failures.push(`${row.routeKey}: the hold does not fire — reasons were ${codes.join(", ") || "none"}. A hold that another hold hides is not a hold.`);
  }
  if (evaluation.paymentAllowed === true) failures.push(`${row.routeKey}: checkout is open on a held route.`);

  // The reason the row exists: the resolver would sell this route on its own.
  const resolution = resolveRoute({ jurisdiction: code, pathwayId, facts: {}, on: new Date(`${process.env.RCAP_EVALUATOR_TODAY}T00:00:00Z`), phase: "PRELIMINARY_SCREENING" });
  if (resolution.contract && resolution.delivery?.paymentAllowed !== true && row.contractIsCorrect === true) {
    failures.push(`${row.routeKey}: the canonical resolver already holds this route, so the row claims a risk that is not there. Re-check it or remove it.`);
  }
}

console.log(`Route presentation conflicts: ${ledger.rows.filter((row) => row.status === "held").length} held, ${ledger.rows.length} recorded.`);
if (failures.length > 0) {
  console.error("\nRoute presentation conflict FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("Every recorded conflict holds its own route, on its own reason, with checkout closed.");
