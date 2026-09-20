// The National Record-Clearing Legal Decision Report of 2026-08-28, as a
// machine-readable overlay.
//
// The report is owner-supplied controlling legal authority. This generator does
// not evaluate, revise or second-guess its conclusions; it transcribes them into
// a form the register and the route layer can read, and it fails closed if the
// report it transcribed is not the report on disk.
//
// Three things it deliberately does NOT do:
//
//   1. It does not edit the imported hash-bound jurisdiction memos. Those record
//      what the law said as of their own reviewedAsOf date. This report sits
//      beside them as a later controlling decision layer.
//   2. It does not invent coverage. The report answers 49 numbered questions.
//      The register holds 50 undecided questions, because binding the two
//      Mississippi misdemeanor routes surfaced the § 99-19-72 filing-fee
//      question after the report's intake was taken. That question is recorded
//      as out of scope, with its own source-acquisition task, rather than
//      quietly folded in.
//   3. It does not derive the report-to-register mapping. Position in an array
//      is not identity: it survives an inserted question, a reorder within a
//      track, a changed affected element and a rewritten question, all of which
//      would silently re-point a holding at the wrong question. The mapping is
//      a controlling crosswalk with a hash on both sides of every row, and this
//      generator verifies it rather than recomputing it.
//
// Usage:
//   node scripts/generate-national-legal-decision-overlay.mjs [--check]
//   node scripts/generate-national-legal-decision-overlay.mjs --bootstrap-crosswalk
//
// --bootstrap-crosswalk writes the crosswalk from the current alignment. It is
// a one-time act for a new report, never part of a normal run, and it refuses
// to overwrite an existing crosswalk without --force.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  fencedKeyValues, headingIndex, labelledBlocks, normaliseText, roleOf, sectionAt, sha256, subsections
} from "./lib/national-report-parser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const BOOTSTRAP = process.argv.includes("--bootstrap-crosswalk");
const FORCE = process.argv.includes("--force");

const REPORT = "docs/record-clearing/NATIONAL_LEGAL_DECISION_REPORT_2026-08-28.md";
const CROSSWALK = "data/record-clearing/legal-decisions/2026-08-28-national-report-crosswalk.json";
const SOURCE_TASK = "data/record-clearing/legal-decisions/2026-08-28-ms-99-19-72-source-task.json";
const OUT_JSON = "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json";
const OUT_MD = "docs/record-clearing/NATIONAL_LEGAL_DECISION_OVERLAY.md";
const REGISTER = "data/record-clearing/all51-current-legal-questions.json";

const REPORT_SHA256 = "84ef2b61126aa26cd66dec5dfb39a112d87c5a92397ab92efd452cc1e5ad1336";
const REVIEWED_THROUGH = "2026-08-28";

/** Required totals. Each is a fact about the report or the register, not a preference. */
const EXPECTED = {
  reportNumberedQuestions: 49,
  reportResearchTracks: 9,
  reportImmediateAssignments: 4,
  registerHistoricalUnique: 56,
  legallyResolved: 55,
  legallyOpen: 1,
  outOfScopeQuestionIds: ["Q-018"]
};

const readText = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const readJson = (rel) => JSON.parse(readText(rel));
const exists = (rel) => fs.existsSync(path.join(root, rel));

const problems = [];
const fail = (message) => problems.push(message);

// ---------------------------------------------------------------------------
// The report, pinned.
// ---------------------------------------------------------------------------

const reportText = readText(REPORT);
const actualSha = sha256(reportText);
if (actualSha !== REPORT_SHA256) {
  console.error("The imported report does not match the transcribed one.");
  console.error(`  expected ${REPORT_SHA256}`);
  console.error(`  found    ${actualSha}`);
  console.error(`Re-read ${REPORT} and re-derive this overlay before changing the pin.`);
  process.exit(1);
}

const lines = reportText.split("\n");
const headings = headingIndex(lines);

const STATE_CODES = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY", "District of Columbia": "DC"
};

/**
 * Turn a level-2 section into a decision record: every subsection retained
 * verbatim, the known roles named, and the product disposition taken from the
 * heading that says so and from nowhere else.
 */
function decisionRecord(headingPos, { assignmentId = null, jurisdiction, trackId }) {
  const section = sectionAt(lines, headings, headingPos);
  const parts = subsections(lines, headings, headingPos);
  const roles = {};
  const other = [];
  for (const part of parts) {
    const role = roleOf(part.heading);
    const captured = {
      heading: part.heading,
      lineStart: part.lineStart,
      lineEnd: part.lineEnd,
      text: part.text,
      sha256: part.sha256,
      fencedKeyValues: fencedKeyValues(part.text)
    };
    if (!role) { other.push(captured); continue; }
    if (!roles[role]) roles[role] = [];
    roles[role].push(captured);
  }

  const disposition = roles.productDisposition ?? [];
  if (disposition.length === 0) {
    fail(`${assignmentId ?? `${jurisdiction}:${trackId}`} has no "Product disposition" heading`);
  } else if (disposition.length > 1) {
    fail(`${assignmentId ?? `${jurisdiction}:${trackId}`} has ${disposition.length} "Product disposition" headings`);
  } else if (!disposition[0].fencedKeyValues) {
    fail(`${assignmentId ?? `${jurisdiction}:${trackId}`} product disposition carries no fenced block`);
  }

  return {
    ...(assignmentId ? { assignmentId } : {}),
    jurisdiction,
    trackId,
    reportSection: {
      heading: section.heading,
      lineStart: section.lineStart,
      lineEnd: section.lineEnd,
      sha256: section.sha256
    },
    // Named roles, each carrying its own line range and hash.
    decision: roles.decision ?? [],
    filingVehicle: roles.filingVehicle ?? [],
    packetOrDeliverable: roles.packetOrDeliverable ?? [],
    serviceWorkflow: roles.serviceWorkflow ?? [],
    selfHelpBoundary: roles.selfHelpBoundary ?? [],
    productDisposition: disposition[0] ?? null,
    // Nothing in the report is dropped. A subsection this parser has no role
    // for is still carried, so a later reader can see it exists.
    otherSections: other,
    completeSectionText: section.text
  };
}

// Part I — the four immediate assignments.
const immediateAssignments = [];
headings.forEach((h, i) => {
  const m = h.title.match(/^(LA-IMM-\d+) — (.+?) `([^`]+)`$/);
  if (!m || h.level !== 2) return;
  const jurisdiction = STATE_CODES[m[2]];
  if (!jurisdiction) { fail(`unknown state name in Part I: ${m[2]}`); return; }
  immediateAssignments.push(decisionRecord(i, { assignmentId: m[1], jurisdiction, trackId: m[3] }));
});

// Part III — the nine additional tracks.
const partThree = headings.findIndex((h) => h.level === 1 && h.title.startsWith("Part III"));
const partFour = headings.findIndex((h) => h.level === 1 && h.title.startsWith("Part IV"));
const researchTrackDecisions = [];
headings.forEach((h, i) => {
  if (i < partThree || i > partFour || h.level !== 2) return;
  const m = h.title.match(/^(.+?) — `([^`]+)`$/);
  if (!m) return;
  const jurisdiction = STATE_CODES[m[1]];
  if (!jurisdiction) { fail(`unknown state name in Part III: ${m[1]}`); return; }
  researchTrackDecisions.push(decisionRecord(i, { jurisdiction, trackId: m[2] }));
});

// Part II — Q-001 through Q-049, with every labelled block retained.
const reportQuestions = [];
headings.forEach((h, i) => {
  const m = h.title.match(/^(Q-\d{3}) — `([^`]+)`$/);
  if (!m || h.level !== 3) return;
  const section = sectionAt(lines, headings, i);
  const blocks = labelledBlocks(section.text);
  const holding = blocks.find((b) => /^holding$/i.test(b.label)) ?? null;
  const disposition = blocks.find((b) => /^disposition$/i.test(b.label)) ?? null;
  const productRules = blocks.filter((b) => !/^(holding|disposition)$/i.test(b.label));
  if (!holding) fail(`${m[1]} has no **Holding:** block`);
  if (!disposition) fail(`${m[1]} has no **Disposition:** block`);
  reportQuestions.push({
    reportQuestionId: m[1],
    trackId: m[2],
    lineStart: section.lineStart,
    lineEnd: section.lineEnd,
    sectionSha256: section.sha256,
    // The complete holding, not its first paragraph. Several holdings state an
    // operative condition after a paragraph break; truncating at the first one
    // would drop the condition and keep the conclusion.
    holding: holding?.value ?? null,
    holdingSha256: holding?.sha256 ?? null,
    dispositionText: disposition?.value ?? null,
    productRuleSections: productRules,
    completeSectionText: section.text,
    fencedBlocks: (section.text.match(/```text\n[\s\S]*?```/g) ?? [])
  });
});

// Part IV — the implementation matrix.
const implementationMatrix = [];
for (const line of lines) {
  const m = line.match(/^\| (Q-\d{3}) \| ([A-Z]{2}) \| (.+?) \| (.+?) \|\s*$/);
  if (!m) continue;
  implementationMatrix.push({
    reportQuestionId: m[1],
    jurisdiction: m[2],
    controllingProductDecision: m[3].trim(),
    reportDisposition: m[4].trim()
  });
}

// ---------------------------------------------------------------------------
// Normalise the report's dispositions onto the delivery vocabulary.
// ---------------------------------------------------------------------------

const DISPOSITION_RULES = [
  [/^ARTIFACT REVIEW STILL REQUIRED/i, "ARTIFACT_LEGAL_REVIEW_REQUIRED"],
  [/^CONDITIONAL — SOURCE GATE/i, "SOURCE_ACQUISITION_REQUIRED"],
  [/^CONDITIONAL — FORM-CONFLICT GATE/i, "SOURCE_ACQUISITION_REQUIRED"],
  [/^CONDITIONAL \/ ATTORNEY/i, "ATTORNEY_OR_PARTNER_HANDOFF"],
  [/^ATTORNEY \/ MULTI-PACKET/i, "ATTORNEY_OR_PARTNER_HANDOFF"],
  [/^ATTORNEY \/ PARTNER HANDOFF/i, "ATTORNEY_OR_PARTNER_HANDOFF"],
  [/^RELEASE — PACKET/i, "LEGAL_DECISION_RESOLVED_PACKET"],
  [/^RELEASE — GUIDANCE/i, "LEGAL_DECISION_RESOLVED_GUIDANCE"],
  [/^FUTURE EFFECTIVE/i, "FUTURE_EFFECTIVE"]
];

const normaliseDisposition = (text) =>
  DISPOSITION_RULES.find(([pattern]) => pattern.test(text ?? ""))?.[1] ?? null;

// ---------------------------------------------------------------------------
// The controlling crosswalk.
// ---------------------------------------------------------------------------

const register = readJson(REGISTER);
const registerOpen = register.questions.filter((q) => !q.decidedDirectly);
const registerById = new Map(register.questions.map((q) => [q.questionId, q]));

function crosswalkRow(reportQuestion, registerQuestion) {
  return {
    reportQuestionId: reportQuestion.reportQuestionId,
    registerQuestionId: registerQuestion.questionId,
    jurisdiction: registerQuestion.jurisdiction,
    trackId: registerQuestion.trackId,
    affectedElement: registerQuestion.affectedElement,
    normalizedQuestionTextHash: sha256(normaliseText(registerQuestion.question)),
    reportSectionHash: reportQuestion.sectionSha256
  };
}

if (BOOTSTRAP) {
  if (exists(CROSSWALK) && !FORCE) {
    console.error(`${CROSSWALK} already exists. Bootstrapping would replace the controlling mapping.`);
    console.error("If a new report genuinely requires a new crosswalk, pass --force and say so in the commit.");
    process.exit(1);
  }
  const mappable = registerOpen.filter((q) => !outOfScope.has(q.questionId));
  if (mappable.length !== reportQuestions.length) {
    console.error(`cannot bootstrap: ${mappable.length} in-scope register questions, ${reportQuestions.length} report questions`);
    process.exit(1);
  }
  const rows = reportQuestions.map((r, i) => {
    const q = mappable[i];
    if (r.trackId !== q.trackId) {
      console.error(`cannot bootstrap: ${r.reportQuestionId} is ${r.trackId}, ${q.questionId} is ${q.trackId}`);
      process.exit(1);
    }
    return crosswalkRow(r, q);
  });
  const doc = {
    schemaVersion: 1,
    purpose: "The controlling mapping between the national report's Q-001..Q-049 and this register's question ids. Position in an array is not identity; every row is verified on jurisdiction, track, affected element, question text hash and report section hash before any holding is attached to any question.",
    reportDocument: REPORT,
    reportSha256: REPORT_SHA256,
    bootstrappedOn: REVIEWED_THROUGH,
    outOfReportScope: [...outOfScope],
    rows
  };
  fs.writeFileSync(path.join(root, CROSSWALK), `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`Bootstrapped ${CROSSWALK} with ${rows.length} rows.`);
  process.exit(0);
}

if (!exists(CROSSWALK)) {
  console.error(`${CROSSWALK} is missing. Run --bootstrap-crosswalk once for a new report.`);
  process.exit(1);
}
const crosswalk = readJson(CROSSWALK);
// Out-of-scope ids are recorded in the crosswalk, which is where the decision
// about a question's scope belongs, with EXPECTED as the floor that stops one
// silently disappearing.
const outOfScope = new Set([...EXPECTED.outOfScopeQuestionIds, ...(crosswalk.outOfReportScope ?? [])]);

if (crosswalk.reportSha256 !== REPORT_SHA256) {
  fail(`the crosswalk is pinned to report ${crosswalk.reportSha256}, this generator to ${REPORT_SHA256}`);
}

const reportById = new Map(reportQuestions.map((r) => [r.reportQuestionId, r]));
const matrixById = new Map(implementationMatrix.map((m) => [m.reportQuestionId, m]));
const seenRegisterIds = new Set();
const seenReportIds = new Set();
const trackQuestionHashes = new Map();

const retiredRegisterIds = new Set(crosswalk.retiredFromTheLiveRegister?.questionIds ?? []);
const retiredMapped = [];
const questionDecisions = [];
for (const row of crosswalk.rows) {
  const r = reportById.get(row.reportQuestionId);
  const q = registerById.get(row.registerQuestionId);
  if (!r) { fail(`${row.reportQuestionId} is in the crosswalk but not in the report`); continue; }
  if (!q) {
    /**
     * Answered, not missing.
     *
     * A crosswalk row points at a register question. When the ratification
     * correction removed thirty-nine routes from the legal-review queue —
     * counsel had already ratified them — the questions attached to those
     * routes stopped being OPEN and left the live register. The row still
     * means the question it named, and the id still resolves in the durable
     * ledger, so this is a resolution rather than a dangling pointer. Each one
     * is listed by id in the crosswalk's own retiredFromTheLiveRegister block;
     * anything not listed there is still a real dangling pointer.
     */
    if (retiredRegisterIds.has(row.registerQuestionId)) { retiredMapped.push(row.registerQuestionId); continue; }
    fail(`${row.registerQuestionId} is in the crosswalk but not in the register, and is not recorded as retired`);
    continue;
  }
  if (seenRegisterIds.has(row.registerQuestionId)) fail(`${row.registerQuestionId} appears twice in the crosswalk`);
  if (seenReportIds.has(row.reportQuestionId)) fail(`${row.reportQuestionId} appears twice in the crosswalk`);
  seenRegisterIds.add(row.registerQuestionId);
  seenReportIds.add(row.reportQuestionId);

  // Every recorded value must still hold. Any one of these changing means the
  // row no longer describes the pair it was written for.
  if (r.trackId !== row.trackId) fail(`${row.reportQuestionId}: report track is ${r.trackId}, crosswalk says ${row.trackId}`);
  if (q.trackId !== row.trackId) fail(`${row.registerQuestionId}: register track is ${q.trackId}, crosswalk says ${row.trackId}`);
  if (q.jurisdiction !== row.jurisdiction) fail(`${row.registerQuestionId}: register jurisdiction is ${q.jurisdiction}, crosswalk says ${row.jurisdiction}`);
  if (q.affectedElement !== row.affectedElement) fail(`${row.registerQuestionId}: affected element is ${q.affectedElement}, crosswalk says ${row.affectedElement}`);
  const textHash = sha256(normaliseText(q.question));
  if (textHash !== row.normalizedQuestionTextHash) fail(`${row.registerQuestionId}: question text has changed since the crosswalk was written`);
  if (r.sectionSha256 !== row.reportSectionHash) fail(`${row.reportQuestionId}: the report section has changed since the crosswalk was written`);

  // A track that carries more than one question must carry a distinct question
  // on each row, or two holdings could land on the same question.
  const perTrack = trackQuestionHashes.get(row.trackId) ?? new Set();
  if (perTrack.has(textHash)) fail(`${row.trackId} is used twice in the crosswalk for the same question text`);
  perTrack.add(textHash);
  trackQuestionHashes.set(row.trackId, perTrack);

  const matrixRow = matrixById.get(row.reportQuestionId) ?? null;
  if (matrixRow && matrixRow.jurisdiction !== row.jurisdiction) {
    fail(`${row.reportQuestionId}: the matrix says ${matrixRow.jurisdiction}, the crosswalk says ${row.jurisdiction}`);
  }
  const deliveryDisposition = normaliseDisposition(matrixRow?.reportDisposition ?? r.dispositionText);
  if (!deliveryDisposition) fail(`${row.reportQuestionId} has no delivery disposition for "${matrixRow?.reportDisposition ?? r.dispositionText}"`);

  questionDecisions.push({
    registerQuestionId: row.registerQuestionId,
    reportQuestionId: row.reportQuestionId,
    jurisdiction: row.jurisdiction,
    trackId: row.trackId,
    affectedElement: row.affectedElement,
    normalizedQuestionTextHash: row.normalizedQuestionTextHash,
    reportSectionHash: row.reportSectionHash,
    memoPath: q.memoPath,
    memoSha256: q.memoSha256,
    reviewedThrough: REVIEWED_THROUGH,
    holding: r.holding,
    holdingSha256: r.holdingSha256,
    productRuleSections: r.productRuleSections,
    controllingProductDecision: matrixRow?.controllingProductDecision ?? null,
    reportDisposition: matrixRow?.reportDisposition ?? r.dispositionText,
    deliveryDisposition,
    reportLineStart: r.lineStart,
    reportLineEnd: r.lineEnd,
    completeSectionText: r.completeSectionText
  });
}

for (const q of registerOpen) {
  if (seenRegisterIds.has(q.questionId)) continue;
  if (!outOfScope.has(q.questionId)) fail(`${q.questionId} is neither in the crosswalk nor recorded as out of the report's scope`);
}
for (const id of outOfScope) {
  if (seenRegisterIds.has(id)) fail(`${id} is recorded as out of the report's scope and is also in the crosswalk`);
  if (!registerById.has(id)) fail(`${id} is recorded as out of the report's scope but is not in the register`);
}

// ---------------------------------------------------------------------------
// The Mississippi source-acquisition task, which the report does not answer.
// ---------------------------------------------------------------------------

const sourceTask = exists(SOURCE_TASK) ? readJson(SOURCE_TASK) : null;
if (!sourceTask) fail(`${SOURCE_TASK} is missing; Q-018 has no source-acquisition record`);
else {
  for (const field of [
    "questionId", "question", "authoritativeIssuingBody", "exactExpectedSource",
    "acquisitionOwner", "feeOrWaiverQuestion", "receivingCourtDistinction",
    "legalEscalationIfSilentOrConflicting", "blocksOnlyTheseRoutes"
  ]) {
    if (sourceTask[field] === undefined || sourceTask[field] === null) fail(`${SOURCE_TASK} is missing ${field}`);
  }
  if (sourceTask.answered !== false) fail(`${SOURCE_TASK} must record answered:false`);
  if (sourceTask.questionId !== "Q-018") fail(`${SOURCE_TASK} names ${sourceTask.questionId}, expected Q-018`);
}

// ---------------------------------------------------------------------------
// Denominators.
// ---------------------------------------------------------------------------

if (reportQuestions.length !== EXPECTED.reportNumberedQuestions) fail(`report numbered questions ${reportQuestions.length}, expected ${EXPECTED.reportNumberedQuestions}`);
if (implementationMatrix.length !== EXPECTED.reportNumberedQuestions) fail(`implementation matrix rows ${implementationMatrix.length}, expected ${EXPECTED.reportNumberedQuestions}`);
if (researchTrackDecisions.length !== EXPECTED.reportResearchTracks) fail(`report research tracks ${researchTrackDecisions.length}, expected ${EXPECTED.reportResearchTracks}`);
if (immediateAssignments.length !== EXPECTED.reportImmediateAssignments) fail(`immediate assignments ${immediateAssignments.length}, expected ${EXPECTED.reportImmediateAssignments}`);
/**
 * Historical identity, not live membership.
 *
 * This compared the LIVE register's length against a historical count, which
 * only worked while no question had ever been answered. The ratification
 * correction answered thirteen — counsel had already ratified the routes they
 * were attached to — and the live register shrank while the historical set did
 * not. A question that has been answered is still a question the report asked.
 *
 * The durable id ledger is the historical record, so the count is taken there.
 */
const questionIdLedger = readJson("data/record-clearing/all51-legal-question-ids.json");
const historicalUnique = Object.keys(questionIdLedger.ids).length;
if (historicalUnique < EXPECTED.registerHistoricalUnique) {
  fail(`the historical question register shrank: ${historicalUnique} ids, and it carried ${EXPECTED.registerHistoricalUnique}. An id is never removed.`);
}
// Every numbered report question is still accounted for: it either produced a
// decision here, or its register question has been answered and retired. The sum
// is what must hold; the split between the two moves as questions get answered.
if (questionDecisions.length + retiredMapped.length !== EXPECTED.reportNumberedQuestions) {
  fail(`mapped questions ${questionDecisions.length} plus ${retiredMapped.length} retired-and-answered is ${questionDecisions.length + retiredMapped.length}, expected ${EXPECTED.reportNumberedQuestions}`);
}

const deliveryCounts = {};
for (const row of questionDecisions) deliveryCounts[row.deliveryDisposition] = (deliveryCounts[row.deliveryDisposition] ?? 0) + 1;

const overlay = {
  schemaVersion: 2,
  generatedBy: "scripts/generate-national-legal-decision-overlay.mjs",
  createsApproval: false,
  authority: {
    document: REPORT,
    sha256: REPORT_SHA256,
    currentThrough: REVIEWED_THROUGH,
    kind: "owner_supplied_controlling_legal_authority",
    note: "Transcribed, not evaluated. The report's conclusions are controlling; this overlay adds no legal judgement of its own and edits no imported memo."
  },
  crosswalk: {
    document: CROSSWALK,
    rows: crosswalk.rows.length,
    note: "Every row is verified on jurisdiction, track, affected element, normalized question text hash and report section hash. A question inserted, reordered within a track, re-elemented, rewritten, or a report section edited, each fails this generator."
  },
  independentFields: {
    note: "legalStatus and the delivery disposition are separate and neither implies the other. A question may be legally resolved and still require source acquisition, local configuration, artifact generation, artifact legal review, future-effective enforcement, a scheduled re-read, or an attorney handoff.",
    legalStatusLivesIn: REGISTER,
    deliveryDispositionLivesIn: OUT_JSON
  },
  expected: EXPECTED,
  scope: {
    reportAnswers: reportQuestions.length,
    registerOpenQuestions: registerOpen.length,
    registerQuestionsOutOfReportScope: [...outOfScope].map((questionId) => ({
      questionId,
      reason: sourceTask?.outOfReportScopeReason ?? null,
      sourceTask: SOURCE_TASK
    })),
    note: "The report and the register number questions differently. The register interleaves the six already-decided questions and one that entered after the report's intake, so report Q-001..Q-049 do not align with register Q-001..Q-049."
  },
  deliveryCounts,
  immediateAssignments,
  questionDecisions,
  researchTrackDecisions,
  implementationMatrix
};

const serialized = `${JSON.stringify(overlay, null, 2)}\n`;
const markdown = renderMarkdown(overlay);

if (CHECK) {
  for (const [rel, expected] of [[OUT_JSON, serialized], [OUT_MD, markdown]]) {
    if (!exists(rel)) fail(`${rel} has not been generated`);
    else if (readText(rel) !== expected) fail(`${rel} is stale; regenerate it`);
  }
}

if (problems.length > 0) {
  console.error("National legal decision overlay failed:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

if (CHECK) {
  console.log(`National legal decision overlay verified: ${questionDecisions.length} questions crosswalked, ${immediateAssignments.length} immediate assignments, ${researchTrackDecisions.length} research tracks.`);
  process.exit(0);
}

fs.mkdirSync(path.join(root, path.dirname(OUT_JSON)), { recursive: true });
fs.writeFileSync(path.join(root, OUT_JSON), serialized);
fs.writeFileSync(path.join(root, OUT_MD), markdown);
console.log(`Wrote ${OUT_JSON} and ${OUT_MD}`);
console.log(`questions crosswalked: ${questionDecisions.length} of ${registerOpen.length} open (${outOfScope.size} out of report scope)`);
for (const [k, v] of Object.entries(deliveryCounts).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);

function renderMarkdown(data) {
  const L = [];
  L.push("# The national legal decision report, projected");
  L.push("");
  L.push("**Generated by** `scripts/generate-national-legal-decision-overlay.mjs`. Do not edit by hand.");
  L.push("");
  L.push(`Controlling authority: [\`${data.authority.document}\`](../../${data.authority.document}), sha256 \`${data.authority.sha256}\`, current through ${data.authority.currentThrough}.`);
  L.push("");
  L.push(data.authority.note);
  L.push("");
  L.push("## The mapping is a crosswalk, not a position");
  L.push("");
  L.push(data.crosswalk.note);
  L.push("");
  L.push(data.scope.note);
  L.push("");
  for (const row of data.scope.registerQuestionsOutOfReportScope) {
    L.push(`- **${row.questionId} is out of the report's scope.** ${row.reason ?? ""} Source task: \`${row.sourceTask}\`.`);
  }
  L.push("");
  L.push("## Legal status and delivery state are independent");
  L.push("");
  L.push(data.independentFields.note);
  L.push("");
  L.push("| Disposition | Questions |");
  L.push("|---|---:|");
  for (const [k, v] of Object.entries(data.deliveryCounts).sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);
  L.push(`| **TOTAL** | **${data.questionDecisions.length}** |`);
  L.push("");
  L.push("## Question decisions");
  L.push("");
  L.push("| Register | Report | State | Track | Element | Lines | Delivery disposition |");
  L.push("|---|---|---|---|---|---|---|");
  for (const row of data.questionDecisions) {
    L.push(`| \`${row.registerQuestionId}\` | ${row.reportQuestionId} | ${row.jurisdiction} | \`${row.trackId}\` | ${row.affectedElement} | ${row.reportLineStart}–${row.reportLineEnd} | ${row.deliveryDisposition} |`);
  }
  L.push("");
  L.push("## Immediate assignments");
  L.push("");
  for (const a of data.immediateAssignments) {
    L.push(`### ${a.assignmentId} — ${a.jurisdiction} \`${a.trackId}\``);
    L.push("");
    L.push(`Report lines ${a.reportSection.lineStart}–${a.reportSection.lineEnd}, section sha256 \`${a.reportSection.sha256.slice(0, 16)}\`.`);
    L.push("");
    L.push("**Product disposition** (from the `Product disposition` heading, not the first fenced block in the section):");
    L.push("");
    for (const e of a.productDisposition?.fencedKeyValues ?? []) L.push(`- **${e.key}**${e.value === null ? "" : `: ${e.value}`}`);
    L.push("");
    for (const [role, label] of [["decision", "Decision"], ["filingVehicle", "Filing vehicle"], ["packetOrDeliverable", "Packet or deliverable"], ["serviceWorkflow", "Service workflow"], ["selfHelpBoundary", "Self-help boundary"]]) {
      for (const part of a[role]) L.push(`- *${label}*: \`${part.heading}\`, lines ${part.lineStart}–${part.lineEnd}`);
    }
    L.push("");
  }
  L.push("## Research tracks");
  L.push("");
  for (const t of data.researchTrackDecisions) {
    L.push(`### ${t.jurisdiction} \`${t.trackId}\``);
    L.push("");
    L.push(`Report lines ${t.reportSection.lineStart}–${t.reportSection.lineEnd}, section sha256 \`${t.reportSection.sha256.slice(0, 16)}\`.`);
    L.push("");
    for (const e of t.productDisposition?.fencedKeyValues ?? []) L.push(`- **${e.key}**${e.value === null ? "" : `: ${e.value}`}`);
    L.push("");
  }
  return `${L.join("\n")}\n`;
}
