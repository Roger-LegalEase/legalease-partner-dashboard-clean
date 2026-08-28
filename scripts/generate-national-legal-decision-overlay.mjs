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
//      beside them as a later controlling decision layer, exactly as the
//      2026-08-28 controlling decisions do.
//   2. It does not invent coverage. The report answers 49 numbered questions.
//      The register currently holds 50 undecided questions, because binding the
//      two Mississippi misdemeanor routes surfaced the § 99-19-72 filing-fee
//      question after the report's intake was taken. That question is recorded
//      as out of the report's scope rather than quietly folded in.
//   3. It does not renumber anything. The report's Q-001..Q-049 and the
//      register's Q-001..Q-056 are different numbering schemes: the register
//      interleaves the six already-decided questions and the new Mississippi
//      one. The mapping between them is computed and verified, never assumed.
//
// Usage: node scripts/generate-national-legal-decision-overlay.mjs [--check]

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const REPORT = "docs/record-clearing/NATIONAL_LEGAL_DECISION_REPORT_2026-08-28.md";
const OUT_JSON = "data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json";
const OUT_MD = "docs/record-clearing/NATIONAL_LEGAL_DECISION_OVERLAY.md";
const REGISTER = "data/record-clearing/all51-current-legal-questions.json";

/**
 * The report as imported. If the file changes, every transcription below is
 * suspect, so the generator refuses to run rather than emit an overlay that
 * claims to reflect a document it has not read.
 */
const REPORT_SHA256 = "84ef2b61126aa26cd66dec5dfb39a112d87c5a92397ab92efd452cc1e5ad1336";
const REVIEWED_THROUGH = "2026-08-28";

const readText = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const readJson = (rel) => JSON.parse(readText(rel));

const reportText = readText(REPORT);
const actualSha = crypto.createHash("sha256").update(reportText, "utf8").digest("hex");
if (actualSha !== REPORT_SHA256) {
  console.error(`The imported report does not match the transcribed one.`);
  console.error(`  expected ${REPORT_SHA256}`);
  console.error(`  found    ${actualSha}`);
  console.error(`Re-read ${REPORT} and re-derive this overlay before changing the pin.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Parse the report.
// ---------------------------------------------------------------------------

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

const lines = reportText.split("\n");

/** The body of a section, from its heading to the next heading at or above its level. */
function sectionBody(startLine, level) {
  const out = [];
  const stop = new RegExp(`^#{1,${level}} `);
  for (let i = startLine + 1; i < lines.length; i += 1) {
    if (stop.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join("\n").trim();
}

/** A fenced ```text block parsed as KEY: VALUE pairs, preserving order. */
function dispositionBlock(body) {
  const fence = body.match(/```text\n([\s\S]*?)```/);
  if (!fence) return null;
  const entries = [];
  for (const raw of fence[1].split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    const at = line.indexOf(":");
    if (at === -1) { entries.push({ key: line, value: null }); continue; }
    entries.push({ key: line.slice(0, at).trim(), value: line.slice(at + 1).trim() });
  }
  return entries;
}

// Part I — the four immediate assignments.
const immediateAssignments = [];
lines.forEach((line, i) => {
  const m = line.match(/^## (LA-IMM-\d+) — (.+?) `([^`]+)`\s*$/);
  if (!m) return;
  const body = sectionBody(i, 2);
  const jurisdiction = STATE_CODES[m[2]];
  if (!jurisdiction) throw new Error(`unknown state name in Part I: ${m[2]}`);
  immediateAssignments.push({
    assignmentId: m[1],
    jurisdiction,
    trackId: m[3],
    reportLine: i + 1,
    productDisposition: dispositionBlock(body)
  });
});

// Part II — Q-001 through Q-049.
const reportQuestions = [];
lines.forEach((line, i) => {
  const m = line.match(/^### (Q-\d{3}) — `([^`]+)`\s*$/);
  if (!m) return;
  const body = sectionBody(i, 3);
  const holding = body.match(/^\*\*Holding:\*\*\s*([\s\S]*?)(?=\n\n)/m);
  const disposition = body.match(/^\*\*Disposition:\*\*\s*([\s\S]*?)(?=\n\n|$)/m);
  reportQuestions.push({
    reportQuestionId: m[1],
    trackId: m[2],
    reportLine: i + 1,
    holding: holding ? holding[1].trim() : null,
    dispositionText: disposition ? disposition[1].trim() : null
  });
});

// Part III — the nine additional tracks.
const partThreeStart = lines.findIndex((l) => l.startsWith("# Part III"));
const partThreeEnd = lines.findIndex((l) => l.startsWith("# Part IV"));
const researchTracks = [];
lines.forEach((line, i) => {
  if (i < partThreeStart || i > partThreeEnd) return;
  const m = line.match(/^## (.+?) — `([^`]+)`\s*$/);
  if (!m) return;
  const jurisdiction = STATE_CODES[m[1]];
  if (!jurisdiction) throw new Error(`unknown state name in Part III: ${m[1]}`);
  researchTracks.push({
    jurisdiction,
    trackId: m[2],
    reportLine: i + 1,
    productDisposition: dispositionBlock(sectionBody(i, 2))
  });
});

// Part IV — the implementation matrix.
const matrix = [];
for (const line of lines) {
  const m = line.match(/^\| (Q-\d{3}) \| ([A-Z]{2}) \| (.+?) \| (.+?) \|\s*$/);
  if (!m) continue;
  matrix.push({
    reportQuestionId: m[1],
    jurisdiction: m[2],
    controllingProductDecision: m[3].trim(),
    reportDisposition: m[4].trim()
  });
}

// ---------------------------------------------------------------------------
// Normalise the report's dispositions onto the delivery vocabulary.
// ---------------------------------------------------------------------------

/**
 * The report writes a disposition as prose with qualifiers ("RELEASE — PACKET;
 * contested timing to counsel"). The leading term is the controlling one and the
 * qualifier is preserved verbatim beside it rather than discarded.
 */
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

function normaliseDisposition(text) {
  for (const [pattern, code] of DISPOSITION_RULES) {
    if (pattern.test(text)) return code;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Map the report's numbering onto the register's.
// ---------------------------------------------------------------------------

const register = readJson(REGISTER);

/**
 * Questions the report does not reach, with the reason. A question may only be
 * listed here if it entered the register after the report's intake was taken.
 */
const OUT_OF_REPORT_SCOPE = {
  "Q-018": "Entered the register after the report's intake. Binding MS:additional-justice-court-misdemeanor-relief-9-11-15-3 and MS:additional-municipal-court-misdemeanor-relief-21-23-7-6 to ms-misd-addl surfaced the Miss. Code Ann. § 99-19-72 filing-fee question, which the report's controlling intake did not carry and which it therefore does not answer."
};

const registerOpen = register.questions.filter((q) => !q.decidedDirectly);
const mappable = registerOpen.filter((q) => !(q.questionId in OUT_OF_REPORT_SCOPE));

const mapping = [];
const mappingProblems = [];
if (mappable.length !== reportQuestions.length) {
  mappingProblems.push(`register has ${mappable.length} in-scope open questions, report answers ${reportQuestions.length}`);
} else {
  for (let i = 0; i < reportQuestions.length; i += 1) {
    const r = reportQuestions[i];
    const q = mappable[i];
    const matrixRow = matrix.find((m) => m.reportQuestionId === r.reportQuestionId);
    if (r.trackId !== q.trackId) {
      mappingProblems.push(`${r.reportQuestionId} is ${r.trackId}, register ${q.questionId} is ${q.trackId}`);
      continue;
    }
    if (matrixRow && matrixRow.jurisdiction !== q.jurisdiction) {
      mappingProblems.push(`${r.reportQuestionId} is ${matrixRow.jurisdiction} in the matrix, register ${q.questionId} is ${q.jurisdiction}`);
      continue;
    }
    mapping.push({
      registerQuestionId: q.questionId,
      reportQuestionId: r.reportQuestionId,
      jurisdiction: q.jurisdiction,
      trackId: q.trackId,
      affectedElement: q.affectedElement,
      memoPath: q.memoPath,
      memoSha256: q.memoSha256,
      reviewedThrough: REVIEWED_THROUGH,
      holding: r.holding,
      controllingProductDecision: matrixRow?.controllingProductDecision ?? null,
      reportDisposition: matrixRow?.reportDisposition ?? r.dispositionText,
      deliveryDisposition: normaliseDisposition(matrixRow?.reportDisposition ?? r.dispositionText ?? ""),
      previousClassification: q.classification,
      reportLine: r.reportLine
    });
  }
}

const deliveryCounts = {};
for (const row of mapping) deliveryCounts[row.deliveryDisposition ?? "UNMAPPED"] = (deliveryCounts[row.deliveryDisposition ?? "UNMAPPED"] ?? 0) + 1;

const overlay = {
  schemaVersion: 1,
  generatedBy: "scripts/generate-national-legal-decision-overlay.mjs",
  createsApproval: false,
  authority: {
    document: REPORT,
    sha256: REPORT_SHA256,
    currentThrough: REVIEWED_THROUGH,
    kind: "owner_supplied_controlling_legal_authority",
    note: "Transcribed, not evaluated. The report's conclusions are controlling; this overlay adds no legal judgement of its own and edits no imported memo."
  },
  scope: {
    reportAnswers: reportQuestions.length,
    registerOpenQuestions: registerOpen.length,
    registerQuestionsOutOfReportScope: Object.entries(OUT_OF_REPORT_SCOPE).map(([questionId, reason]) => ({ questionId, reason })),
    note: "The report and the register number questions differently. The register interleaves the six already-decided questions and one that entered after the report's intake, so report Q-001..Q-049 do not align with register Q-001..Q-049. The mapping below is computed by position within the in-scope open questions and verified on jurisdiction and track at every pair."
  },
  deliveryCounts,
  immediateAssignments,
  questionDecisions: mapping,
  researchTrackDecisions: researchTracks,
  implementationMatrix: matrix
};

const serialized = `${JSON.stringify(overlay, null, 2)}\n`;
const markdown = renderMarkdown(overlay);

const problems = [...mappingProblems];
if (reportQuestions.length !== 49) problems.push(`parsed ${reportQuestions.length} question sections, expected 49`);
if (matrix.length !== 49) problems.push(`parsed ${matrix.length} implementation-matrix rows, expected 49`);
if (immediateAssignments.length !== 4) problems.push(`parsed ${immediateAssignments.length} immediate assignments, expected 4`);
if (researchTracks.length !== 9) problems.push(`parsed ${researchTracks.length} research tracks, expected 9`);
for (const row of mapping) {
  if (!row.deliveryDisposition) problems.push(`${row.registerQuestionId} (${row.reportQuestionId}) has no delivery disposition for "${row.reportDisposition}"`);
  if (!row.holding) problems.push(`${row.registerQuestionId} (${row.reportQuestionId}) has no holding`);
}
for (const q of registerOpen) {
  const covered = mapping.some((m) => m.registerQuestionId === q.questionId);
  if (!covered && !(q.questionId in OUT_OF_REPORT_SCOPE)) {
    problems.push(`${q.questionId} is neither mapped to the report nor recorded as out of its scope`);
  }
}

if (CHECK) {
  for (const [rel, expected] of [[OUT_JSON, serialized], [OUT_MD, markdown]]) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) problems.push(`${rel} has not been generated`);
    else if (fs.readFileSync(abs, "utf8") !== expected) problems.push(`${rel} is stale; regenerate it`);
  }
}

if (problems.length > 0) {
  console.error("National legal decision overlay failed:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

if (CHECK) {
  console.log(`National legal decision overlay verified: ${mapping.length} questions mapped, ${immediateAssignments.length} immediate assignments, ${researchTracks.length} research tracks.`);
  process.exit(0);
}

fs.mkdirSync(path.join(root, path.dirname(OUT_JSON)), { recursive: true });
fs.writeFileSync(path.join(root, OUT_JSON), serialized);
fs.writeFileSync(path.join(root, OUT_MD), markdown);
console.log(`Wrote ${OUT_JSON} and ${OUT_MD}`);
console.log(`questions mapped: ${mapping.length} of ${registerOpen.length} open (${Object.keys(OUT_OF_REPORT_SCOPE).length} out of report scope)`);
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
  L.push("## Numbering");
  L.push("");
  L.push(data.scope.note);
  L.push("");
  for (const row of data.scope.registerQuestionsOutOfReportScope) {
    L.push(`- **${row.questionId} is out of the report's scope.** ${row.reason}`);
  }
  L.push("");
  L.push("## Delivery disposition after the report");
  L.push("");
  L.push("| Disposition | Questions |");
  L.push("|---|---:|");
  for (const [k, v] of Object.entries(data.deliveryCounts).sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${v} |`);
  L.push(`| **TOTAL** | **${data.questionDecisions.length}** |`);
  L.push("");
  L.push("## Question decisions");
  L.push("");
  L.push("| Register | Report | State | Track | Controlling product decision | Delivery disposition |");
  L.push("|---|---|---|---|---|---|");
  for (const row of data.questionDecisions) {
    L.push(`| \`${row.registerQuestionId}\` | ${row.reportQuestionId} | ${row.jurisdiction} | \`${row.trackId}\` | ${row.controllingProductDecision} | ${row.deliveryDisposition} |`);
  }
  L.push("");
  L.push("## Immediate assignments");
  L.push("");
  for (const a of data.immediateAssignments) {
    L.push(`### ${a.assignmentId} — ${a.jurisdiction} \`${a.trackId}\``);
    L.push("");
    for (const e of a.productDisposition ?? []) L.push(`- **${e.key}**: ${e.value ?? ""}`);
    L.push("");
  }
  L.push("## Research tracks");
  L.push("");
  for (const t of data.researchTrackDecisions) {
    L.push(`### ${t.jurisdiction} \`${t.trackId}\``);
    L.push("");
    for (const e of t.productDisposition ?? []) L.push(`- **${e.key}**: ${e.value ?? ""}`);
    L.push("");
  }
  return `${L.join("\n")}\n`;
}
