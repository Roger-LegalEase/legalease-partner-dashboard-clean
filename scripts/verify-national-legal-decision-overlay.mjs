// Negative tests for the national legal decision overlay.
//
// Every check here asserts that something FAILS. A guard that has never been
// seen to fire is not known to work, and the defect this suite exists for —
// "the first fenced block in the section is the product disposition" — passed
// every positive check it had while producing five wrong dispositions.
//
// Usage: node scripts/verify-national-legal-decision-overlay.mjs

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { fencedKeyValues, headingIndex, roleOf, sectionAt, sha256, subsections } from "./lib/national-report-parser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT = "docs/record-clearing/NATIONAL_LEGAL_DECISION_REPORT_2026-08-28.md";
const CROSSWALK = "data/record-clearing/legal-decisions/2026-08-28-national-report-crosswalk.json";
const REGISTER = "data/record-clearing/all51-current-legal-questions.json";
const GENERATOR = "scripts/generate-national-legal-decision-overlay.mjs";

const readText = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const readJson = (rel) => JSON.parse(readText(rel));

let passed = 0;
const failures = [];
function ok(name, condition, detail = "") {
  if (condition) { passed += 1; console.log(`  ok   ${name}`); return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

// ---------------------------------------------------------------------------
// 1. The old parser was wrong, and here is the proof for each section.
// ---------------------------------------------------------------------------

const reportText = readText(REPORT);
const lines = reportText.split("\n");
const headings = headingIndex(lines);

/** What the retired rule did: the first fenced ```text block in the whole section. */
function firstFenceInSection(headingPos) {
  const section = sectionAt(lines, headings, headingPos);
  return fencedKeyValues(section.text);
}

/** What the current rule does: the fence under the "Product disposition" heading. */
function dispositionByHeading(headingPos) {
  for (const part of subsections(lines, headings, headingPos)) {
    if (roleOf(part.heading) === "productDisposition") return fencedKeyValues(part.text);
  }
  return null;
}

function sectionPos(titlePattern) {
  const i = headings.findIndex((h) => titlePattern.test(h.title));
  if (i === -1) throw new Error(`no heading matching ${titlePattern}`);
  return i;
}

console.log("The retired first-fence rule, per section:");
const MISPARSED = [
  ["Georgia", /^LA-IMM-01 /, /LEGAL HOLD/, "the process sequence, not the disposition"],
  ["Missouri", /^LA-IMM-02 /, /SUBSTANTIVE HOLD/, "the proposed caption, not the disposition"],
  ["North Dakota", /^LA-IMM-03 /, /POST-2025-08-01 INITIAL OUTPUT/, "the service workflow, not the disposition"],
  ["South Carolina", /^LA-IMM-04 /, /LEGAL HOLD/, "the fee schedule, not the disposition"],
  ["New York", /^New York — /, /^OUTPUT$/, "the correction workflow, not the disposition"]
];

for (const [label, pattern, dispositionKey, why] of MISPARSED) {
  const pos = sectionPos(pattern);
  const oldValue = firstFenceInSection(pos);
  const newValue = dispositionByHeading(pos);
  const oldKeys = (oldValue ?? []).map((e) => e.key);
  const newKeys = (newValue ?? []).map((e) => e.key);
  ok(`${label}: the first fence in the section is ${why}`,
    !oldKeys.some((k) => dispositionKey.test(k)),
    `first fence keys: ${oldKeys.slice(0, 2).join(" | ")}`);
  ok(`${label}: the Product disposition heading yields the real disposition`,
    newKeys.some((k) => dispositionKey.test(k)),
    `heading keys: ${newKeys.join(" | ")}`);
  ok(`${label}: the two rules disagree, so the old one was load-bearing`,
    JSON.stringify(oldKeys) !== JSON.stringify(newKeys));
}

// The two operative conditions the old rule dropped.
const gaDisposition = dispositionByHeading(sectionPos(/^LA-IMM-01 /)) ?? [];
ok("Georgia's disposition carries the written-consent precondition",
  gaDisposition.some((e) => /PRECONDITION/i.test(e.key) && /WRITTEN PROSECUTOR CONSENT/i.test(e.value ?? "")));
const nyDisposition = dispositionByHeading(sectionPos(/^New York — /)) ?? [];
ok("New York's disposition carries the court-file-public effect",
  nyDisposition.some((e) => /EFFECT/i.test(e.key) && /COURT FILE PUBLIC/i.test(e.value ?? "")));

// Every section that carries a disposition must have exactly one such heading.
const dispositionSections = headings
  .map((h, i) => ({ h, i }))
  .filter(({ h }) => h.level === 2 && /`[^`]+`$/.test(h.title));
for (const { h, i } of dispositionSections) {
  const count = subsections(lines, headings, i).filter((p) => roleOf(p.heading) === "productDisposition").length;
  ok(`${h.title.slice(0, 44)}: exactly one Product disposition heading`, count === 1, `found ${count}`);
}

// ---------------------------------------------------------------------------
// 2. Holdings are complete, not truncated at the first paragraph.
// ---------------------------------------------------------------------------

const overlay = readJson("data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json");
ok("every question decision carries a holding", overlay.questionDecisions.every((d) => typeof d.holding === "string" && d.holding.length > 0));
ok("every question decision carries a holding hash", overlay.questionDecisions.every((d) => /^[0-9a-f]{64}$/.test(d.holdingSha256 ?? "")));
ok("every question decision carries its complete section text", overlay.questionDecisions.every((d) => typeof d.completeSectionText === "string" && d.completeSectionText.includes(d.reportQuestionId)));
ok("every question decision carries a report line range", overlay.questionDecisions.every((d) => Number.isInteger(d.reportLineStart) && Number.isInteger(d.reportLineEnd) && d.reportLineEnd >= d.reportLineStart));

// A holding that spans more than one paragraph must be retained whole. Q-001's
// Kentucky holding is a single paragraph; the multi-paragraph ones are the test.
const multiParagraph = overlay.questionDecisions.filter((d) => d.holding.includes("\n\n"));
ok("at least one holding spans multiple paragraphs and is retained whole", multiParagraph.length > 0, `${multiParagraph.length} multi-paragraph holdings`);

// The report's eleven product-rule labels must survive somewhere.
const ruleLabels = new Set(overlay.questionDecisions.flatMap((d) => d.productRuleSections.map((s) => s.label)));
ok("product-rule sections are retained beside the holding", ruleLabels.size >= 8, `labels: ${[...ruleLabels].sort().join(", ")}`);

// ---------------------------------------------------------------------------
// 3. Every crosswalk field is load-bearing.
// ---------------------------------------------------------------------------

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "nat-overlay-"));

/** Run the generator against a mutated copy of one input, and require failure. */
function expectFailure(name, mutate) {
  const backups = new Map();
  const save = (rel) => { if (!backups.has(rel)) backups.set(rel, readText(rel)); };
  try {
    mutate(save);
    let failedAsRequired = false;
    let output = "";
    try {
      execFileSync(process.execPath, [path.join(root, GENERATOR), "--check"], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      failedAsRequired = true;
      output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    }
    ok(name, failedAsRequired, failedAsRequired ? "" : "the generator accepted the mutation");
    if (failedAsRequired && process.env.VERBOSE) console.log(`       ${output.trim().split("\n").slice(1, 3).join(" / ")}`);
  } finally {
    for (const [rel, text] of backups) fs.writeFileSync(path.join(root, rel), text);
  }
}

const mutateJson = (save, rel, fn) => {
  save(rel);
  const doc = readJson(rel);
  fn(doc);
  fs.writeFileSync(path.join(root, rel), `${JSON.stringify(doc, null, 2)}\n`);
};

console.log("\nEvery crosswalk field, mutated:");

expectFailure("a reordered pair within one track is rejected", (save) => {
  mutateJson(save, CROSSWALK, (doc) => {
    // me-seal-survivor carries two questions that differ only in affected
    // element. Swapping which report question points at which register
    // question is exactly the silent mis-attribution position could not catch.
    const a = doc.rows.find((r) => r.trackId === "me-seal-survivor");
    const b = doc.rows.filter((r) => r.trackId === "me-seal-survivor")[1];
    const tmp = a.registerQuestionId; a.registerQuestionId = b.registerQuestionId; b.registerQuestionId = tmp;
  });
});

expectFailure("a changed affectedElement is rejected", (save) => {
  mutateJson(save, CROSSWALK, (doc) => { doc.rows[0].affectedElement = "notice_or_service"; });
});

expectFailure("a changed question text is rejected", (save) => {
  mutateJson(save, REGISTER, (doc) => {
    const row = doc.questions.find((q) => q.questionId === "Q-002");
    row.question = `${row.question} And one more clause nobody approved.`;
  });
});

expectFailure("a changed report section hash is rejected", (save) => {
  mutateJson(save, CROSSWALK, (doc) => { doc.rows[0].reportSectionHash = "0".repeat(64); });
});

expectFailure("a changed jurisdiction is rejected", (save) => {
  mutateJson(save, CROSSWALK, (doc) => { doc.rows[0].jurisdiction = "ZZ"; });
});

expectFailure("a changed track is rejected", (save) => {
  mutateJson(save, CROSSWALK, (doc) => { doc.rows[0].trackId = "ky_nonconviction_expungement"; });
});

expectFailure("a removed crosswalk row is rejected", (save) => {
  mutateJson(save, CROSSWALK, (doc) => { doc.rows.splice(10, 1); });
});

expectFailure("a duplicated register question is rejected", (save) => {
  mutateJson(save, CROSSWALK, (doc) => { doc.rows[1].registerQuestionId = doc.rows[0].registerQuestionId; });
});

expectFailure("an inserted register question with no crosswalk row is rejected", (save) => {
  mutateJson(save, REGISTER, (doc) => {
    const clone = JSON.parse(JSON.stringify(doc.questions[5]));
    clone.questionId = "Q-999";
    clone.question = "An inserted question that no crosswalk row covers.";
    doc.questions.push(clone);
  });
});

expectFailure("marking a second question out of the report's scope is rejected", (save) => {
  save(GENERATOR);
  const text = readText(GENERATOR).replace('outOfScopeQuestionIds: ["Q-018"]', 'outOfScopeQuestionIds: ["Q-018", "Q-019"]');
  fs.writeFileSync(path.join(root, GENERATOR), text);
});

expectFailure("an edited report is rejected", (save) => {
  save(REPORT);
  fs.appendFileSync(path.join(root, REPORT), "\n");
});

expectFailure("a missing Mississippi source task is rejected", (save) => {
  const rel = "data/record-clearing/legal-decisions/2026-08-28-ms-99-19-72-source-task.json";
  save(rel);
  fs.unlinkSync(path.join(root, rel));
});

expectFailure("a Mississippi source task marked answered is rejected", (save) => {
  mutateJson(save, "data/record-clearing/legal-decisions/2026-08-28-ms-99-19-72-source-task.json", (doc) => { doc.answered = true; });
});

// ---------------------------------------------------------------------------
// 4. Denominators and independence.
// ---------------------------------------------------------------------------

console.log("\nDenominators and field independence:");
const register = readJson(REGISTER);
const expected = overlay.expected;
ok("report numbered questions = 49", overlay.questionDecisions.length === 49);
ok("report research tracks = 9", overlay.researchTrackDecisions.length === 9);
ok("report immediate assignments = 4", overlay.immediateAssignments.length === 4);
ok("register historical unique = 56", register.questions.length === expected.registerHistoricalUnique && register.questions.length === 56);
ok("legally resolved = 55", register.questions.filter((q) => q.legalStatus === "RESOLVED").length === 55);
ok("legally open = 1", register.questions.filter((q) => q.legalStatus === "OPEN").length === 1);
ok("out of report scope is exactly Q-018",
  JSON.stringify(overlay.scope.registerQuestionsOutOfReportScope.map((r) => r.questionId)) === JSON.stringify(["Q-018"]));
ok("the one legally open question is Q-018",
  register.questions.filter((q) => q.legalStatus === "OPEN").every((q) => q.questionId === "Q-018"));

// Independence: legally resolved questions must appear across several delivery
// states, or the two fields are not independent in practice.
const resolvedStates = new Set(register.questions.filter((q) => q.legalStatus === "RESOLVED").map((q) => q.classification));
ok("legally resolved questions occupy more than one delivery state",
  resolvedStates.size > 1, `${resolvedStates.size} states: ${[...resolvedStates].sort().join(", ")}`);
const gatedButResolved = register.questions.filter((q) =>
  q.legalStatus === "RESOLVED" && ["SOURCE_ACQUISITION_REQUIRED", "ARTIFACT_LEGAL_REVIEW_REQUIRED"].includes(q.classification));
ok("a legally resolved question can still be held by a delivery gate",
  gatedButResolved.length > 0, `${gatedButResolved.length} resolved questions still gated`);
ok("no question is delivery-clear while legally open",
  !register.questions.some((q) => q.legalStatus === "OPEN" && /^LEGAL_DECISION_RESOLVED/.test(q.classification)));

// The seven South Carolina rows carry both authorities and still show a gate.
const dual = register.questions.filter((q) => (q.legalAuthorities ?? []).length > 1);
ok("questions answered by two authorities keep both", dual.length === 7, `${dual.length} dual-authority questions`);
ok("dual-authority questions still show their delivery gate",
  dual.every((q) => q.classification === "SOURCE_ACQUISITION_REQUIRED"));

fs.rmSync(scratch, { recursive: true, force: true });

console.log("");
if (failures.length > 0) {
  console.error(`National legal decision overlay verification FAILED — ${failures.length} of ${passed + failures.length} checks:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`National legal decision overlay verification passed: ${passed} checks.`);
