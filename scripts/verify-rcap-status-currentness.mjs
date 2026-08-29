#!/usr/bin/env node
// No live status record may assert a fact the repository has moved past.
//
// WHY THIS EXISTS
//
// Status records went stale twice in this sprint, both times the same way: a
// generator held a literal — "with counsel", "8 records held", a retired branch
// name — and kept emitting it after the world changed. Each time the document
// looked authoritative and was wrong, and the second time it survived one round
// of cleanup because the cleanup edited output while leaving the generator
// producing it.
//
// So the rule is enforced rather than remembered. Each claim below is paired
// with the live source that settles it, and a live status record asserting a
// claim its source has moved past fails this check. A record that CITES the old
// state as history is fine and must be: deleting what a blocker was leaves its
// closure with no explanation. What is refused is asserting it as current.
//
//   node scripts/verify-rcap-status-currentness.mjs
//   node scripts/verify-rcap-status-currentness.mjs --mutations

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import os from "node:os";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const MUTATIONS = process.argv.includes("--mutations");

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const text = (rel) => fs.readFileSync(path.join(rootDir, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(rootDir, rel));

// The records that speak for the current state. Anything not on this list is
// either generated evidence or history, and history is allowed to be historical.
const LIVE_STATUS_RECORDS = [
  "docs/rcap/grade-a/captain/BLOCKERS.md",
  "docs/rcap/grade-a/ACTIVE_LANE_DISPATCH.md",
  "docs/rcap/grade-a/captain/decision-waiting/candidate-freeze-checklist.json",
  "docs/rcap/grade-a/captain/decision-waiting/oregon-answer-dependent-alternatives.json",
  "docs/rcap/grade-a/captain/decision-waiting/nonproduction-readiness-audit.json",
  "docs/rcap/grade-a/captain/decision-waiting/blocker-4-answer-dependent-patches.json",
  "data/rcap-verifier-dispositions.json",
  "data/rcap-all50/candidate-evidence/oregon/or-option-selection-geometry.json",
].filter(exists);

// ---- what the world actually says -------------------------------------------
const decisions = exists("data/record-clearing/legal-decisions/2026-08-29-lawrence-six-decisions.json")
  ? read("data/record-clearing/legal-decisions/2026-08-29-lawrence-six-decisions.json") : null;
const answered = new Set((decisions?.decisions ?? []).map((d) => d.questionId).filter(Boolean));
const configs = exists("data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json")
  ? read("data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json") : null;
const terminalizationFailures = (() => {
  try { execFileSync("node", ["scripts/verify-rcap-terminalize-c1.mjs"], { cwd: rootDir, stdio: "pipe" }); return 0; }
  catch (e) {
    const out = String(e.stdout ?? "") + String(e.stderr ?? "");
    return out.split("\n").filter((l) => l.trimStart().startsWith("- ") && !l.includes("working-tree change")).length;
  }
})();
const publishWorkflow = exists(".github/workflows/publish-rcap-render-worker.yml")
  ? text(".github/workflows/publish-rcap-render-worker.yml") : "";
const retiredBranch = "sprint/20260825-full-product-captain";
const supersededRoute = "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c";
const oregonGeometry = exists("data/rcap-all50/candidate-evidence/oregon/or-option-selection-geometry.json")
  ? read("data/rcap-all50/candidate-evidence/oregon/or-option-selection-geometry.json") : null;
const oregonArtifacts = exists("data/rcap-all50/oregon-disposition-artifacts.json")
  ? read("data/rcap-all50/oregon-disposition-artifacts.json") : null;

/**
 * A claim is stale when its `assertsCurrently` pattern matches AND the world has
 * moved past it. The pattern deliberately targets present-tense assertion, not
 * mention: "was red", "previously", "historical" and the like are how a record
 * carries its own history and must keep working.
 */
const CLAIMS = [
  {
    id: "oregon-questions-with-counsel",
    worldHasMovedPast: answered.has("OR-Q1-SUBSECTION") && answered.has("OR-Q2-PACKET-SCOPE"),
    assertsCurrently: /\b(both Oregon questions are with counsel|two questions are with counsel|Both questions are with counsel)\b/i,
    settledBy: "the two Oregon decisions of 2026-08-29",
  },
  {
    id: "blocker-4-questions-unanswered",
    worldHasMovedPast: ["Q-J-01", "Q-J-02", "Q-J-03", "Q-J-04"].every((q) => answered.has(q)),
    assertsCurrently: /\b(4 unanswered questions|four unanswered questions|behind 4 unanswered|questions are unanswered)\b/i,
    settledBy: "the four Blocker-4 answers of 2026-08-29",
  },
  {
    id: "terminalization-eight-failures",
    worldHasMovedPast: terminalizationFailures !== 8,
    assertsCurrently: /\b(reports 8 drift failure|8 drift failure\(s\)|stays red for them|terminalization (?:is|has) 8)\b/i,
    settledBy: `verify-rcap-terminalize-c1, which reports ${terminalizationFailures}`,
  },
  {
    id: "publication-branch-stale",
    worldHasMovedPast: !publishWorkflow.includes(retiredBranch),
    assertsCurrently: new RegExp(`"literal":\\s*"${retiredBranch}"|RELEASE_INTEGRATION_BRANCH[^\\n]*${retiredBranch}`),
    settledBy: "the publish workflow, which no longer pins the retired branch",
  },
  {
    id: "retired-oregon-route-current",
    worldHasMovedPast: configs?.supersedes?.routeId === supersededRoute,
    // Naming the route is fine — it is named in its own supersession record.
    // Asserting it as the current or selected route is not.
    assertsCurrently: new RegExp(`"(selectedRoute|routeId|currentRoute)":\\s*"${supersededRoute}"(?![^]{0,400}?(SUPERSEDED|superseded))`),
    settledBy: "the three disposition-bound configurations that replaced it",
  },
  {
    // The costliest stale fact of the sprint so far, because it did not read as
    // a gap: a detector that could not see the boxes reported confidently that
    // there were none, and a mark was derived into the margin on the strength of
    // it. The form has fourteen. Saying so once is not enough — the claim has to
    // be unable to come back.
    id: "oregon-form-has-no-checkboxes",
    worldHasMovedPast:
      (oregonGeometry?.finding?.checkboxShapedBoxesFound ?? 0) > 0
      && (oregonGeometry?.options ?? []).some((o) => o.boxIsMeasured),
    // Naming the withdrawn finding as history is how its withdrawal is
    // explained. Asserting it, or reviving the derived margin mark, is not.
    assertsCurrently:
      /(?:contains no checkbox|draws no checkbox|has no checkbox|no checkbox square anywhere|mark position is DERIVED|"kind"\s*:\s*"derived)(?![^]{0,400}?(?:withdrawn|was false|is false|wasWrong|whatItClaimed|correctedBy|superseded|SUPERSEDED|previously|historical))/i,
    settledBy: `the measured geometry, which finds ${oregonGeometry?.finding?.checkboxShapedBoxesFound ?? 0} stroked checkbox-shaped boxes on the official form and measures three of them beside the options`,
  },
  {
    // The Oregon status went from "decided but not built" to "built" in one
    // stretch of work, which is exactly the shape of the two staleness failures
    // this file was written for.
    id: "oregon-artifacts-pending",
    worldHasMovedPast:
      (oregonArtifacts?.configurations ?? []).length === 3
      && (oregonArtifacts?.configurations ?? []).every((c) => c.fixtures?.canonical?.sha256)
      && (configs?.configurations ?? []).every((c) => c.legalSectionsBound === true),
    assertsCurrently:
      /(?:no Option 2 or Option 3 artifact|artifact-pending|artifacts are missing|legal sections are unbound|sections are unbound on all three)(?![^]{0,400}?(?:withdrawn|superseded|SUPERSEDED|previously|historical|was the state))/i,
    settledBy:
      `the ${(oregonArtifacts?.configurations ?? []).length} rendered configurations, each with its own canonical and boundary artifact, and the six legal sections bound on all three`,
  },
];

const failures = [];
function scan(records) {
  const found = [];
  for (const claim of CLAIMS) {
    if (!claim.worldHasMovedPast) continue;
    for (const rel of records) {
      const body = text(rel);
      if (claim.assertsCurrently.test(body)) found.push({ claim: claim.id, record: rel, settledBy: claim.settledBy });
    }
  }
  return found;
}

if (!MUTATIONS) {
  console.log("status currentness — live records against the world they describe\n");
  console.log(`  live status records: ${LIVE_STATUS_RECORDS.length}`);
  console.log(`  terminalization drift failures: ${terminalizationFailures}`);
  console.log(`  answered questions: ${[...answered].sort().join(", ") || "(none)"}\n`);

  const stale = scan(LIVE_STATUS_RECORDS);
  for (const claim of CLAIMS) {
    const hits = stale.filter((s) => s.claim === claim.id);
    if (!claim.worldHasMovedPast) console.log(`  n/a  ${claim.id} — the world has not moved past this yet`);
    else if (hits.length === 0) console.log(`  ok   ${claim.id} — no live record asserts it`);
    else { console.log(`  FAIL ${claim.id} — asserted in ${hits.map((h) => h.record).join(", ")}`); failures.push(`${claim.id}: ${hits.map((h) => h.record).join(", ")} (settled by ${claim.settledBy})`); }
  }

  console.log("");
  if (failures.length) {
    console.error(`status currentness: ${failures.length} stale claim(s).`);
    for (const f of failures) console.error(`  ${f}`);
    console.error("\nFix the generator, then regenerate. Editing generated output while its generator still emits the stale fact is how this came back the first time.");
    process.exit(1);
  }
  console.log(`status currentness: ${LIVE_STATUS_RECORDS.length} live record(s), ${CLAIMS.filter((c) => c.worldHasMovedPast).length} superseded claim(s) checked, none asserted.`);
} else {
  // Each claim must be catchable. A currentness check nobody has watched fail is
  // the same class of thing as the stale documents it exists to catch.
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "status-currentness-"));
  const samples = {
    "oregon-questions-with-counsel": "Both questions are with counsel.",
    "blocker-4-questions-unanswered": "8 record(s) held behind 4 unanswered questions",
    "terminalization-eight-failures": "verify-rcap-terminalize-c1 reports 8 drift failure(s)",
    "publication-branch-stale": `"literal": "${retiredBranch}"`,
    "retired-oregon-route-current": `"selectedRoute": "${supersededRoute}"`,
    "oregon-form-has-no-checkboxes": "The official Oregon set-aside form contains no checkbox, so the mark position is DERIVED from the label origin.",
    "oregon-artifacts-pending": "Oregon route design: configuration-complete, artifact-pending. No Option 2 or Option 3 artifact is rendered yet and all six legal sections are unbound on all three.",
  };
  let undetected = 0;
  for (const claim of CLAIMS) {
    const file = path.join(stage, `${claim.id}.md`);
    fs.writeFileSync(file, samples[claim.id]);
    const caught = claim.worldHasMovedPast && claim.assertsCurrently.test(fs.readFileSync(file, "utf8"));
    console.log(`  ${caught ? "detected " : "UNDETECTED"} ${claim.id}`);
    if (!caught) undetected += 1;
  }
  fs.rmSync(stage, { recursive: true, force: true });
  console.log("");
  if (undetected) { console.error(`FAIL status-currentness mutations (${undetected}/${CLAIMS.length} undetected)`); process.exit(1); }
  console.log(`OK status-currentness mutations — ${CLAIMS.length}/${CLAIMS.length} stale claims are catchable.`);
}
