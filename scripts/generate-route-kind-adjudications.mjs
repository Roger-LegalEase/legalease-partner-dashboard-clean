#!/usr/bin/env node
/**
 * The disagreement set, written down with both verdicts and both result codes.
 *
 * Regenerates the pending rows of data/rcap-ledger/route-kind-adjudications.json
 * from the code. Applied rows are preserved exactly: an adjudication is a
 * decision a person made, and a generator does not get to rewrite one. What it
 * does is keep the pending list honest — every disagreement present, each with
 * the result code the change would produce, so adjudicating one is reading a
 * row rather than re-deriving it.
 *
 * `--check` fails if the file on disk differs from what this would write.
 */
import fs from "node:fs";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

process.env.RCAP_EVALUATOR_TODAY ??= "2026-08-28";
const { getAllJurisdictionProfiles } = await import("@/lib/rcap-engine/profile-registry");
const { projectPublicProfile } = await import("@/lib/rcap-engine/public-profile-projection");
const { evaluateScreening, isCourtFiledPetitionRoute, contractDeclaresParticipantPacket } = await import("@/lib/rcap-engine/evaluator");
const { legalRouteContract } = await import("@/lib/legal-authority/index");

const LEDGER = "data/rcap-ledger/route-kind-adjudications.json";
const existing = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
const appliedByKey = new Map(existing.rows.filter((row) => row.status === "applied").map((row) => [row.routeKey, row]));
const pendingByKey = new Map(existing.rows.filter((row) => row.status !== "applied").map((row) => [row.routeKey, row]));

/**
 * The result code the route reaches today, from a complete set of answers.
 *
 * Answers are filled from each public question's own options so the run does
 * not stall on missing_required_facts; where a question offers no options it is
 * left out, because inventing a free-text answer would be inventing a fact.
 */
function resultCodeFor(profile, pathway) {
  const publicProfile = projectPublicProfile(profile);
  const answers = { ownership_scope: "yes", jurisdiction_scope: "yes", possible_pathway_context: pathway.label };
  for (const question of publicProfile.questions) {
    if (answers[question.id] !== undefined) continue;
    if (question.required !== true) continue;
    const options = question.options ?? [];
    const benign = options.find((option) => /none of these|^no$|^none$/i.test(option))
      ?? options.find((option) => !/not sure|unknown/i.test(option));
    if (benign) answers[question.id] = benign;
  }
  try {
    return evaluateScreening({ jurisdiction: profile.jurisdiction.code, profileVersion: profile.profileVersion, answers }).resultCode;
  } catch (error) {
    return `error:${String(error.message ?? error).slice(0, 60)}`;
  }
}

const rows = [];
for (const profile of getAllJurisdictionProfiles()) {
  const code = profile.jurisdiction.code;
  for (const pathway of profile.pathways ?? []) {
    if (!contractDeclaresParticipantPacket(code, pathway.id)) continue;
    if (isCourtFiledPetitionRoute(profile, pathway, { ignoreContractDeclaration: true })) continue;
    const routeKey = `${code}:${pathway.id}`;
    const applied = appliedByKey.get(routeKey);
    if (applied) { rows.push(applied); continue; }
    const contract = legalRouteContract(code, pathway.id);
    const prior = resultCodeFor(profile, pathway);
    const previous = pendingByKey.get(routeKey);
    rows.push({
      routeKey,
      status: "pending",
      adjudicatedOn: null,
      decisionId: contract?.decisionId ?? null,
      contractSays: `outcomeMode ${contract?.outcomeMode}, packetFamily ${JSON.stringify(contract?.packetFamily)}, statute ${contract?.statute ?? "unrecorded"}`,
      heuristicSaid: "not a user-filed court petition",
      priorResultCode: prior,
      // `needs_more_info` here usually means the generated answer set did not
      // reach the guidance branch at all, not that the route is held there. A
      // number that can mean two things is worse than one that says which, so
      // the row says so rather than letting the count read as a finding.
      priorResultCodeIsConclusive: prior === "guidance_only",
      proposedResultCode: "unmeasured until adjudicated",
      evidence: previous?.evidence
        ?? `Generated. The contract for ${routeKey} declares a participant packet and names the family it produces; the pre-contract heuristics read the pathway label ${JSON.stringify(pathway.label)} and do not. A generated answer set reaches ${prior}${prior === "guidance_only" ? ", which is the disagreement showing" : " — the run stops before the guidance branch, so this run does not measure the disagreement's effect"}. Adjudicating this row means reading the contract's own statement, running the route with real answers, and recording what the change produces — especially if it produces a ready-packet presentation for a packet that does not exist.`
    });
  }
}
rows.sort((a, b) => a.routeKey.localeCompare(b.routeKey));

const next = { ...existing, rows, pending: undefined };
delete next.pending;
const serialized = `${JSON.stringify(next, null, 2)}\n`;

if (process.argv.includes("--check")) {
  if (fs.readFileSync(LEDGER, "utf8") !== serialized) {
    console.error(`${LEDGER} is stale; regenerate with node scripts/generate-route-kind-adjudications.mjs`);
    process.exit(1);
  }
  console.log(`Route-kind adjudication ledger is current: ${rows.length} disagreements, ${appliedByKey.size} applied.`);
} else {
  fs.writeFileSync(LEDGER, serialized);
  console.log(`Wrote ${LEDGER}: ${rows.length} disagreements, ${appliedByKey.size} applied, ${rows.length - appliedByKey.size} pending.`);
}
