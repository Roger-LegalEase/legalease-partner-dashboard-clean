#!/usr/bin/env node
// The eight answer-dependent patch bundles, prepared and proven without applying.
//
// WHY THIS EXISTS
//
// Four legal questions are with counsel, and each has two answers. Eight of the
// eighteen terminalization records are held behind them, and they must stay held:
// re-pinning a record asserts that a decision still holds when the profile it was
// made against has moved, and for these eight the profile carries substantive
// pathway changes. verify-rcap-terminalize-c1 stays red for exactly those eight,
// which is the correct state and not a defect.
//
// What can be done while waiting is everything except deciding. Each branch of
// each question has one exact, mechanical consequence, and that consequence can
// be written down now, checked against the repository as it stands now, and
// proved to produce what it claims -- so that when an answer arrives the work is
// an application rather than a fresh piece of engineering done under time
// pressure with a decision in hand.
//
// WHAT "PROVEN WITHOUT APPLYING" MEANS HERE
//
// Every bundle is applied to an in-memory copy of the records and the result is
// checked. Nothing is written to a tracked file, and the check that nothing was
// written is itself one of the assertions: the worktree digest of every target is
// recomputed after the dry runs and required to be unchanged.
//
//   node scripts/verify-rcap-answer-dependent-patches.mjs
//   node scripts/verify-rcap-answer-dependent-patches.mjs --write   (regenerates the manifest)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const WRITE = process.argv.includes("--write");

const MATRIX = "docs/rcap/grade-a/lane-j/blocker-4-decision-matrix.json";
const QUESTIONS = "docs/rcap/grade-a/lane-j/BLOCKER-4-LEGAL-OWNER-QUESTIONS.md";
const OUT = "docs/rcap/grade-a/captain/decision-waiting/blocker-4-answer-dependent-patches.json";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const digest = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex");

const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) console.log(`  ok   ${name}`);
  else { failures.push(`${name}${detail ? `: ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? `: ${detail}` : ""}`); }
};

const matrix = read(MATRIX);
const held = matrix.records.filter((r) => r.classification === "INSUFFICIENT_AUTHORITY");
const profileByFile = Object.fromEntries(matrix.profiles.map((p) => [p.profile, p]));

// Which branch, if any, the decision owner actually chose. Read from the
// decision record, because the decision is the authority and the bundle is only
// its consequence. Before an answer this is empty and every bundle is pending;
// after one, exactly one branch per question is applied and the other must not be.
const DECISIONS = "data/record-clearing/legal-decisions/2026-08-29-lawrence-six-decisions.json";
const decisionRecord = fs.existsSync(path.join(rootDir, DECISIONS)) ? read(DECISIONS) : null;
const chosenBundleByQuestion = new Map();
for (const d of decisionRecord?.decisions ?? []) {
  if (d.questionId && d.appliedBundle) chosenBundleByQuestion.set(d.questionId, { bundleId: d.appliedBundle, decisionId: d.decisionId });
}

/** Which held records each question governs, and what each answer does to them. */
const QUESTION_SET = [
  {
    questionId: "Q-J-01",
    owner: "Lawrence (counsel)",
    subject: "Illinois 20 ILCS 2630/5.2(g) immediate sealing at disposition",
    question:
      "Does the intentional_unsupported decision on the Illinois § 5.2 adult non-conviction expungement route also place the § 5.2(g) immediate-sealing-at-disposition pleading out of scope — yes or no?",
    records: ["data/rcap-all50/pleadings/illinois/il-immediate-seal/pleading-config.json"],
    profile: "src/lib/rcap-engine/compiled/profiles/IL-illinois.json",
    branches: { yes: "retire", no: "repin" }
  },
  {
    questionId: "Q-J-02",
    owner: "Lawrence (counsel)",
    subject: "Kentucky KRS 218A.275 void-and-seal",
    question:
      "The KRS 431.078 misdemeanour expungement route is now intentional_unsupported. Does that scope decision extend to the KRS 218A.275 void-and-seal motion, which cites KRS 431.078(2) procedurally but is a different statutory relief — yes or no?",
    records: ["data/rcap-all50/pleadings/kentucky/ky_void_seal_controlled_substance/pleading-config.json"],
    profile: "src/lib/rcap-engine/compiled/profiles/KY-kentucky.json",
    branches: { yes: "retire", no: "repin" }
  },
  {
    questionId: "Q-J-03",
    owner: "Lawrence (counsel)",
    subject: "Kentucky KRS 218A.276 void-and-seal",
    question:
      "Same question as Q-J-02, for KRS 218A.276. Does intentional_unsupported on KRS 431.078 extend to the KRS 218A.276 void-and-seal motion — yes or no?",
    records: ["data/rcap-all50/pleadings/kentucky/ky_void_seal_marijuana_synthetic_salvia/pleading-config.json"],
    profile: "src/lib/rcap-engine/compiled/profiles/KY-kentucky.json",
    branches: { yes: "retire", no: "repin" }
  },
  {
    questionId: "Q-J-04",
    owner: "Lawrence (counsel)",
    subject: "West Virginia § 17C-5-2b(g) versus § 61-11-25",
    question:
      "After NATIONAL-2026-08-28-C-WV-03, is the dismissal entered under W. Va. Code § 17C-5-2b(c) expunged by the § 17C-5-2b(g) application as its own vehicle (A), or does it now route through § 61-11-25 and its SCA-C903 packet family (B)?",
    records: held
      .filter((r) => r.recordPath.includes("west-virginia"))
      .map((r) => r.recordPath),
    profile: "src/lib/rcap-engine/compiled/profiles/WV-west-virginia.json",
    branches: { A: "repin", B: "retire" }
  }
];

console.log("answer-dependent patch bundles — prepared, not applied\n");

// ---- the two mechanical consequences ---------------------------------------
//
// A repin moves one field and nothing else. A retirement moves no hash at all:
// the record leaves the terminalization contract rather than having its
// provenance asserted current, which is the whole point of the distinction.
function repin(doc, to) {
  const next = JSON.parse(JSON.stringify(doc));
  next.provenance.profileSha256 = to;
  return next;
}
function retire(doc, questionId, answer) {
  const next = JSON.parse(JSON.stringify(doc));
  next.retirement = {
    retiredBy: questionId,
    answer,
    retiredOn: "<the date the answer is recorded>",
    reason:
      "The legal-design owner placed this relief out of scope. The record no longer represents a live route, so its provenance hash is not re-pinned: re-pinning would assert that a decision still holds, and the decision is that there is no route.",
    profileSha256Unchanged: true,
    artifactsMoveTo: "data/rcap-all50/review-artifacts/manifest-only-retirement-handoff.json"
  };
  return next;
}

const bundles = [];
const preDigests = new Map();

for (const q of QUESTION_SET) {
  for (const rel of q.records) preDigests.set(rel, digest(rel));
  const profile = profileByFile[q.profile];
  check(`${q.questionId}: its profile is one the matrix measured`, Boolean(profile), q.profile);
  if (!profile) continue;

  const liveProfileDigest = digest(q.profile);
  check(`${q.questionId}: that profile still hashes to what the matrix recorded`,
    liveProfileDigest === profile.currentSha256,
    `live ${liveProfileDigest.slice(0, 12)}, matrix ${String(profile.currentSha256).slice(0, 12)}`);

  for (const [answer, kind] of Object.entries(q.branches)) {
    const targets = [];
    for (const rel of q.records) {
      const doc = read(rel);
      const from = doc.provenance.profileSha256;
      const after = kind === "repin" ? repin(doc, profile.currentSha256) : retire(doc, q.questionId, answer);

      // Field-by-field, so a bundle that would also move a legal or service
      // disposition is caught here rather than after it lands.
      const moved = [];
      const walk = (a, b, p = "") => {
        for (const k of new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])) {
          const av = a?.[k], bv = b?.[k], at = p ? `${p}.${k}` : k;
          if (av && bv && typeof av === "object" && typeof bv === "object" && !Array.isArray(av)) walk(av, bv, at);
          else if (JSON.stringify(av) !== JSON.stringify(bv)) moved.push(at);
        }
      };
      walk(doc, after);

      const chosen = chosenBundleByQuestion.get(q.questionId) ?? null;
      const isChosen = chosen?.bundleId === `${q.questionId}-${answer}`;
      const label = path.basename(path.dirname(rel));

      if (isChosen) {
        // The owner chose this branch, so it is applied and the assertion is
        // about the applied state rather than about a dry run. The dry run
        // produces no further change, which is what "already applied" looks like.
        if (kind === "repin") {
          check(`${q.questionId}/${answer}: ${label} is repinned to the profile's live digest`,
            doc.provenance.profileSha256 === liveProfileDigest,
            `${doc.provenance.profileSha256} vs ${liveProfileDigest}`);
          check(`${q.questionId}/${answer}: ${label} records which decision repinned it`,
            doc.provenance.repinnedBy?.decisionId === chosen.decisionId,
            String(doc.provenance.repinnedBy?.decisionId));
        } else {
          check(`${q.questionId}/${answer}: ${label} carries a retirement naming the decision`,
            doc.retirement?.retiredBy === chosen.decisionId, String(doc.retirement?.retiredBy));
          check(`${q.questionId}/${answer}: ${label}'s retirement moved no provenance hash`,
            doc.provenance.profileSha256 === (matrix.records.find((r) => r.recordPath === rel)?.patch?.from
              ?? doc.provenance.profileSha256) && doc.retirement?.profileSha256Unchanged === true,
            doc.provenance.profileSha256);
          check(`${q.questionId}/${answer}: ${label} keeps the pathway in the service model`,
            doc.retirement?.pathwayRemainsInServiceModel === true);
        }
      } else if (chosen) {
        // The other branch of an answered question. It must NOT be applied: a
        // record carrying both a repin and a retirement, or the branch the owner
        // did not choose, is the failure this check exists for.
        if (kind === "repin") {
          check(`${q.questionId}/${answer}: the branch the owner did NOT choose is not applied to ${label}`,
            doc.provenance.repinnedBy === undefined || doc.provenance.repinnedBy?.decisionId === chosen.decisionId);
        } else {
          check(`${q.questionId}/${answer}: the branch the owner did NOT choose is not applied to ${label}`,
            doc.retirement === undefined || doc.retirement?.retiredBy === chosen.decisionId);
        }
      } else {
        // Unanswered: the bundle is pending and the dry run must produce exactly
        // its stated effect and nothing else.
        const expected = kind === "repin" ? ["provenance.profileSha256"] : ["retirement"];
        check(`${q.questionId}/${answer}: ${label} changes exactly ${expected.join(", ")}`,
          JSON.stringify(moved.sort()) === JSON.stringify(expected), moved.join(", ") || "(nothing)");
        if (kind === "repin") {
          check(`${q.questionId}/${answer}: ${label} still carries the expected old hash`,
            from === (matrix.records.find((r) => r.recordPath === rel)?.patch?.from ?? from) && /^[0-9a-f]{64}$/.test(from), from);
          check(`${q.questionId}/${answer}: the new hash is the profile's live digest, not a literal`,
            after.provenance.profileSha256 === liveProfileDigest);
        } else {
          check(`${q.questionId}/${answer}: retirement moves no provenance hash`,
            after.provenance.profileSha256 === from, `${from} -> ${after.provenance.profileSha256}`);
        }
      }

      targets.push({
        record: rel,
        effect: kind,
        applied: isChosen,
        profileSha256Before: from,
        profileSha256After: after.provenance.profileSha256,
        fieldsChanged: moved
      });
    }

    bundles.push({
      bundleId: `${q.questionId}-${answer}`,
      questionId: q.questionId,
      answer,
      status: chosenBundleByQuestion.get(q.questionId)
        ? (chosenBundleByQuestion.get(q.questionId).bundleId === `${q.questionId}-${answer}` ? "APPLIED" : "NOT_CHOSEN")
        : "PREPARED_NOT_APPLIED",
      chosenByDecision: chosenBundleByQuestion.get(q.questionId)?.bundleId === `${q.questionId}-${answer}`
        ? chosenBundleByQuestion.get(q.questionId).decisionId : null,
      effect: kind,
      recordsAffected: targets.length,
      appliesTo: q.records,
      profile: q.profile,
      profileSha256Current: profile.currentSha256,
      substantivePathwayChangesInThatProfile: profile.substantivePathwayChanges,
      whatItDoes: kind === "repin"
        ? "Sets provenance.profileSha256 to the profile's current digest on every listed record, and changes nothing else. Identical in shape to the ten DECISION_UNCHANGED patches already applied."
        : "Adds a retirement block naming the answer that caused it and leaves provenance.profileSha256 exactly where it is. A retired record's hash is never re-pinned: re-pinning asserts a decision still holds, and the decision is that there is no route.",
      terminalizationEffect: kind === "repin"
        ? `verify-rcap-terminalize-c1 loses ${targets.length} drift failure(s).`
        : `verify-rcap-terminalize-c1 loses ${targets.length} drift failure(s) once the retired record leaves the contract; the retirement handoff is a separate, non-mechanical step and is NOT prepared here.`,
      targets
    });
  }
}

// ---- nothing was written ----------------------------------------------------
let untouched = true;
for (const [rel, before] of preDigests) {
  if (digest(rel) !== before) { untouched = false; console.log(`  FAIL ${rel} changed on disk`); }
}
check("every dry run left its target byte-identical on disk", untouched);
check("no record carries two answers at once",
  held.every((r) => {
    const d = read(r.recordPath);
    return !(d.retirement && d.provenance?.repinnedBy);
  }), "a record that is both retired and repinned asserts a decision and its opposite");

const expectedBundles = QUESTION_SET.reduce((n, q) => n + Object.keys(q.branches).length, 0);
check(`all ${expectedBundles} bundles are prepared`, bundles.length === expectedBundles, `${bundles.length}`);
check("the bundles cover exactly the eight held records",
  new Set(bundles.flatMap((b) => b.appliesTo)).size === held.length, `${new Set(bundles.flatMap((b) => b.appliesTo)).size} of ${held.length}`);
check("exactly one branch per answered question is applied",
  [...chosenBundleByQuestion.keys()].every((qid) => bundles.filter((b) => b.questionId === qid && b.status === "APPLIED").length === 1),
  `${bundles.filter((b) => b.status === "APPLIED").length} applied across ${chosenBundleByQuestion.size} answered question(s)`);

const doc = {
  schemaVersion: "rcap-blocker-4-answer-dependent-patches/v1",
  generatedBy: "scripts/verify-rcap-answer-dependent-patches.mjs",
  status: chosenBundleByQuestion.size === 0 ? "PREPARED_NOT_APPLIED" : "APPLIED_BY_RECORDED_DECISION",
  posture: chosenBundleByQuestion.size === 0
    ? "Every bundle below is written, checked against the repository as it stands, and dry-run applied in memory. None is applied. The eight records stay exactly where they are and verify-rcap-terminalize-c1 stays red for them until a legal-design owner answers."
    : "The decision owner has answered. For each question, exactly one branch is applied and the other is asserted NOT to be. This file is now the record of which branch was taken and on whose authority, and the checks above are what stop a record carrying two answers at once.",
  decisionRecord: decisionRecord ? DECISIONS : null,
  decisionOwner: "Lawrence (counsel)",
  sourceQuestions: QUESTIONS,
  sourceMatrix: MATRIX,
  heldRecords: held.length,
  bundles,
  howToApplyOneWhenAnAnswerArrives: [
    "Record the answer in data/record-clearing/legal-decisions/route-ratification-registry.json first. The decision is the authority; the patch is its consequence.",
    "Re-run this script. It re-checks that each target still carries its expected pre-answer hash and that the profile still hashes to what the matrix measured. A drift in either means the bundle is stale and must be re-derived, not forced.",
    "Apply only the bundle whose questionId and answer match what was recorded.",
    "Re-run verify-rcap-terminalize-c1.mjs and confirm the failure count fell by exactly recordsAffected, and by nothing more."
  ],
  whatIsDeliberatelyNotPrepared: [
    "The retirement handoff itself. Moving a record's artifacts into the manifest-only retirement handoff is a judgement about live routes and evidence, not a mechanical edit, and preparing it in advance of the decision would prejudge it.",
    "Any change to a route's commercial status. No bundle opens or closes checkout, and none touches a fulfillment record."
  ]
};

const outPath = path.join(rootDir, OUT);
const serialized = `${JSON.stringify(doc, null, 2)}\n`;
if (WRITE) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, serialized);
  console.log(`\n  wrote ${OUT}`);
} else if (fs.existsSync(outPath)) {
  check("the committed bundle manifest is exactly what this run derives",
    fs.readFileSync(outPath, "utf8") === serialized, "differs");
} else {
  check("a committed bundle manifest exists", false, `${OUT} is absent; run with --write`);
}

console.log("");
if (failures.length) {
  console.error(`answer-dependent patches: ${failures.length} problem(s).`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
const applied = bundles.filter((b) => b.status === "APPLIED").length;
console.log(
  applied === 0
    ? `answer-dependent patches: ${bundles.length} bundle(s) prepared for ${QUESTION_SET.length} question(s), covering ${held.length} held record(s). None applied.`
    : `answer-dependent patches: ${applied} of ${bundles.length} bundle(s) applied by recorded decision, covering ${held.length} record(s); every unchosen branch is asserted not applied.`,
);
