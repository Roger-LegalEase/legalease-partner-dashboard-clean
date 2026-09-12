import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

export const CA17_FAMILY_ID = "ca-17b-reduction-set";
export const CA17_DECISION_ID = "CA-17B-17D2-OFFENSE-BY-OFFENSE";
export const CA17_VARIANT_ID = "pc-17b-17d2-offense-by-offense";
export const CA17_ROUTE_KEY = "obligation:track-only:CA:ca-17b-reduction";
export const CA17_DECISION_PATH =
  "data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json";

const REQUIRED_KEYS = Object.freeze([
  "code", "section", "offenseType", "eligible17b", "eligible17d2",
]);
const OFFENSE_TYPES = new Set(["felony", "misdemeanor", "infraction"]);

function fieldName(row, stem) {
  return `CR-180[0].Page1[0].LI1[0].li1[0].ConvTable[0].Row${row}[0].${stem}${row}[0]`;
}

function factId(row, key) {
  return `matter.offenses.${row - 1}.${key}`;
}

export const CA17_OFFENSE_FIELD_MAPPINGS = Object.freeze(Object.fromEntries(
  Array.from({ length: 5 }, (_, offset) => {
    const row = offset + 1;
    return [
      [fieldName(row, "Code"), factId(row, "code")],
      [fieldName(row, "Section"), factId(row, "section")],
      [fieldName(row, "TypeOff"), factId(row, "offenseType")],
      [fieldName(row, "Reduce"), factId(row, "eligible17b")],
      [fieldName(row, "Offense"), factId(row, "eligible17d2")],
    ];
  }).flat(),
));

// These are visibly synthetic review inputs. They prove that each independent
// per-offense answer reaches the matching CR-180 row; they are not an offense
// classifier and are never presented as facts about a real participant.
const REVIEW_FIXTURES = Object.freeze({
  canonical: Object.freeze([
    Object.freeze({ code: "Penal", section: "TEST-1001", offenseType: "felony", eligible17b: true, eligible17d2: false }),
    Object.freeze({ code: "Penal", section: "TEST-1002", offenseType: "misdemeanor", eligible17b: false, eligible17d2: true }),
    Object.freeze({ code: "Vehicle", section: "TEST-1003", offenseType: "felony", eligible17b: true, eligible17d2: false }),
    Object.freeze({ code: "Health & Safety", section: "TEST-1004", offenseType: "misdemeanor", eligible17b: false, eligible17d2: true }),
    Object.freeze({ code: "Business & Prof.", section: "TEST-1005", offenseType: "felony", eligible17b: true, eligible17d2: false }),
  ]),
  boundary: Object.freeze([
    Object.freeze({ code: "Penal", section: "TEST-2001(a)", offenseType: "felony", eligible17b: true, eligible17d2: false }),
    Object.freeze({ code: "Penal", section: "TEST-2002(b)", offenseType: "misdemeanor", eligible17b: false, eligible17d2: true }),
    Object.freeze({ code: "Vehicle", section: "TEST-2003(c)", offenseType: "felony", eligible17b: true, eligible17d2: false }),
    Object.freeze({ code: "Health & Safety", section: "TEST-2004(d)", offenseType: "misdemeanor", eligible17b: false, eligible17d2: true }),
    Object.freeze({ code: "Business & Prof.", section: "TEST-2005(e)", offenseType: "felony", eligible17b: true, eligible17d2: false }),
  ]),
});

export function assertCa17BindingDecision(rootDir) {
  const record = JSON.parse(fs.readFileSync(path.join(rootDir, CA17_DECISION_PATH), "utf8"));
  const decision = (record.decisions ?? []).find((row) => row.decisionId === CA17_DECISION_ID);
  assert.ok(decision, `${CA17_DECISION_ID}: binding decision is absent`);
  assert.equal(decision.disposition, "LEGAL_CLEAR");
  assert.deepEqual(decision.familyIds, [CA17_FAMILY_ID]);
  assert.equal(decision.bindingProductRule,
    "There is no global either/or participant election between Penal Code 17(b) and 17(d)(2). Determine eligibility offense by offense and request every reduction legally applicable to that offense.");
  return decision;
}

export function evaluateCa17OffenseInputs(offenses) {
  const rows = Array.isArray(offenses) ? offenses : [];
  const issues = [];
  if (rows.length === 0) issues.push({ code: "OFFENSE_ROWS_MISSING", row: null });
  if (rows.length > 5) issues.push({ code: "OFFENSE_ROW_CAPACITY_EXCEEDED", row: null, count: rows.length });
  for (let index = 0; index < Math.min(rows.length, 5); index += 1) {
    if (!Object.hasOwn(rows, index)) {
      issues.push({ code: "OFFENSE_ROW_MISSING", row: index + 1 });
      continue;
    }
    const row = rows[index];
    for (const key of REQUIRED_KEYS) {
      const value = row?.[key];
      const present = key.startsWith("eligible")
        ? typeof value === "boolean"
        : typeof value === "string" && value.trim().length > 0;
      if (!present) issues.push({ code: "OFFENSE_INPUT_MISSING", row: index + 1, key });
    }
    if (typeof row?.offenseType === "string" && row.offenseType.trim().length > 0
      && !OFFENSE_TYPES.has(row.offenseType.trim().toLowerCase())) {
      issues.push({ code: "OFFENSE_TYPE_INVALID", row: index + 1,
        value: row.offenseType, allowed: [...OFFENSE_TYPES] });
    }
  }
  if (rows.length > 0 && rows.length <= 5
    && Array.from({ length: rows.length }, (_, index) => rows[index])
      .every((row) => row?.eligible17b !== true && row?.eligible17d2 !== true)) {
    issues.push({ code: "NO_APPLICABLE_REDUCTION_REQUEST", row: null });
  }
  return {
    status: issues.length === 0 ? "READY" : "NEEDS_PARTICIPANT_INPUT_OR_HANDOFF",
    rowCount: rows.length,
    requiredKeysPerRow: [...REQUIRED_KEYS],
    issues,
    routeRule: "OFFENSE_BY_OFFENSE_REQUEST_ALL_APPLICABLE",
    classifierBehavior: "PARTICIPANT_OR_COUNSEL_SUPPLIED_NEVER_INFERRED",
  };
}

export function ca17FixtureFacts(fixture) {
  const rows = REVIEW_FIXTURES[fixture];
  assert.ok(rows, `Unknown CA 17(b)/17(d)(2) review fixture ${fixture}`);
  const evaluation = evaluateCa17OffenseInputs(rows);
  assert.equal(evaluation.status, "READY", `${fixture}: synthetic offense inputs are incomplete`);
  const facts = {};
  rows.forEach((row, index) => {
    const number = index + 1;
    facts[factId(number, "code")] = row.code;
    facts[factId(number, "section")] = row.section;
    facts[factId(number, "offenseType")] = row.offenseType;
    facts[factId(number, "eligible17b")] = row.eligible17b ? "yes" : "no";
    facts[factId(number, "eligible17d2")] = row.eligible17d2 ? "yes" : "no";
  });
  return { rows, facts, evaluation };
}

export function ca17ParticipantInputStatus() {
  return {
    schemaVersion: "rcap-participant-input-status/v1",
    familyId: CA17_FAMILY_ID,
    decisionId: CA17_DECISION_ID,
    productionRule: {
      collectionUnit: "one complete answer bundle per offense listed on CR-180 item 1",
      requiredInputsPerOffense: [...REQUIRED_KEYS],
      eligibilityAnswers: "participant_or_counsel_supplied_boolean_for_each_statutory_column",
      missingInputTreatment: "stop packet completion for that row; do not infer or leave a partly completed row",
      requestTreatment: "request every reduction marked legally applicable for each offense; there is no global either/or election",
    },
    reviewFixtures: Object.fromEntries(Object.entries(REVIEW_FIXTURES).map(([fixture, rows]) => [fixture, {
      syntheticReviewData: true,
      rowCount: rows.length,
      evaluation: evaluateCa17OffenseInputs(rows),
    }])),
  };
}
