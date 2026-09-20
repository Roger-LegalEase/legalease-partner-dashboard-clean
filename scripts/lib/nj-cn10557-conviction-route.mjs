import assert from "node:assert/strict";

export const NJ_CN10557_CONVICTION_ROW_MAPPINGS = Object.freeze({
  guiltyDt: "matter.conviction_date",
  guiltyOff1: "matter.charge",
  guiltyStatute: "matter.statute_citation",
  guiltyFinal1: "matter.final_sentence",
  guiltyCrt: "matter.court",
  guiltyTimeType: "matter.incarceration_term_type",
  guiltyDocCmpltDt: "matter.incarceration_completion_date",
  guiltyProbDt: "matter.probation_completion_date",
  guiltyFineDt: "matter.fines_paid_date",
});

const TEXT_FACTS = Object.freeze([
  "matter.conviction_date", "matter.charge", "matter.statute_citation",
  "matter.final_sentence", "matter.court", "matter.incarceration_term_type",
  "matter.incarceration_completion_date", "matter.probation_completion_date",
  "matter.fines_paid_date", "matter.original_arrest_charge",
  "matter.original_arrest_statute", "matter.original_arrest_municipality",
  "matter.original_case_number",
]);
const BOOLEAN_FACTS = Object.freeze([
  "matter.parole_applicable", "nj.pending_charges",
  "nj.prior_criminal_conviction_expungement", "nj.includes_title_39_matter",
  "nj.marijuana_regrading_applies", "nj.early_pathway_compelling_circumstances",
  "nj.outstanding_financial_assessment", "nj.prosecutor_objection",
  "nj.nonexpungeable_offense", "participant.has_legal_name_change",
]);
const COMMON_REQUIRED = Object.freeze([...TEXT_FACTS, ...BOOLEAN_FACTS, "nj.disposition_kind"]);
const REQUIRED_BY_FAMILY = Object.freeze({
  "nj_disorderly_persons-set": Object.freeze([
    "nj.any_crime_conviction", "nj.disorderly_or_petty_count",
    "nj.convictions_entered_same_day", "nj.convictions_closely_related",
  ]),
  "nj_indictable_conviction-set": Object.freeze([
    "nj.indictable_conviction_count", "nj.disorderly_or_petty_count",
    "nj.subsequent_crime_conviction", "nj.convictions_single_judgment_or_same_day",
    "nj.convictions_closely_related", "nj.drug_crime_compelling_circumstances_route",
  ]),
});
const familyBooleans = (familyId) => familyId === "nj_disorderly_persons-set"
  ? ["nj.any_crime_conviction", "nj.convictions_entered_same_day", "nj.convictions_closely_related"]
  : ["nj.subsequent_crime_conviction", "nj.convictions_single_judgment_or_same_day",
    "nj.convictions_closely_related", "nj.drug_crime_compelling_circumstances_route"];
const present = (value) => value !== undefined && value !== null
  && !(typeof value === "string" && value.trim() === "");

function missingFacts(familyId, facts) {
  const familyRequired = REQUIRED_BY_FAMILY[familyId];
  assert.ok(familyRequired, `unsupported NJ CN-10557 conviction family ${familyId}`);
  const required = [...COMMON_REQUIRED, ...familyRequired,
    ...(facts["matter.parole_applicable"] === true ? ["matter.parole_completion_date"] : [])];
  return required.filter((factId) => !present(facts[factId]));
}
function fail(state, reason, extra = {}) {
  return Object.freeze({ state, authorizedSelections: Object.freeze([]), reason, ...extra });
}
function authorize(familyId, branch, latestCompletionDate) {
  const authorizedSelections = familyId === "nj_indictable_conviction-set"
    ? ["guilty", "seekJuvNever"] : ["guilty"];
  return Object.freeze({ state: "CN10557_ITEM_D_FACTUALLY_SUPPORTED",
    authorizedSelections: Object.freeze(authorizedSelections), branch, latestCompletionDate,
    reason: "Verified court-record facts complete Form A item (d), satisfy the ordinary five-year clock, and support this offense-count branch." });
}
function isoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day ? date : null;
}
function strictTypedFacts(familyId, facts) {
  for (const factId of TEXT_FACTS) {
    if (typeof facts[factId] !== "string" || facts[factId].trim() === "") {
      return fail("INVALID_FACT", `${factId} must be a nonempty court-record text value.`, { invalidFact: factId });
    }
  }
  for (const factId of [...BOOLEAN_FACTS, ...familyBooleans(familyId)]) {
    if (typeof facts[factId] !== "boolean") {
      return fail("INVALID_FACT", `${factId} must be an explicit true or false answer.`, { invalidFact: factId });
    }
  }
  if (facts["matter.parole_applicable"] === false && present(facts["matter.parole_completion_date"])) {
    return fail("INCONSISTENT_FACT", "A parole completion date cannot accompany an explicit no-parole record.");
  }
  return null;
}
function timingResult(facts, asOf) {
  const dateIds = ["matter.conviction_date", "matter.incarceration_completion_date",
    "matter.probation_completion_date", "matter.fines_paid_date",
    ...(facts["matter.parole_applicable"] ? ["matter.parole_completion_date"] : [])];
  const parsed = dateIds.map((factId) => [factId, isoDate(facts[factId])]);
  const invalid = parsed.find(([, date]) => !date);
  if (invalid) return fail("INVALID_FACT", `${invalid[0]} must be a real YYYY-MM-DD calendar date.`, { invalidFact: invalid[0] });
  const asOfDate = isoDate(asOf);
  assert.ok(asOfDate, `invalid evaluator asOf date ${asOf}`);
  const conviction = parsed[0][1];
  if (parsed.some(([, date]) => date < conviction || date > asOfDate)) {
    return fail("INVALID_CHRONOLOGY", "Completion dates must fall on or after conviction and cannot be in the future.");
  }
  const latest = parsed.reduce((best, row) => row[1] > best[1] ? row : best);
  const fifthAnniversary = new Date(Date.UTC(latest[1].getUTCFullYear() + 5,
    latest[1].getUTCMonth(), latest[1].getUTCDate()));
  if (fifthAnniversary > asOfDate) return fail("WAITING_PERIOD_NOT_SATISFIED",
    "Five years have not passed since the latest conviction, financial assessment, probation/parole completion, or release.",
    { latestCompletionDate: latest[0] });
  return { latestCompletionDate: latest[0] };
}
function relationshipVerified(facts, relevant) {
  if (!relevant) return true;
  return facts["nj.relationship_records_verified"] === true
    && Array.isArray(facts["nj.related_conviction_records"])
    && facts["nj.related_conviction_records"].length > 1
    && facts["nj.related_conviction_records"].every((row) => row && typeof row === "object"
      && isoDate(row.convictionDate) && typeof row.caseNumber === "string" && row.caseNumber.trim());
}

export function classifyNjCn10557ConvictionRoute(familyId, facts = {}, { asOf = "2026-09-12" } = {}) {
  const missing = missingFacts(familyId, facts);
  if (missing.length) return fail("MISSING_REQUIRED_FACTS",
    "The factual record is incomplete; do not create or mark a conviction petition.", { missingFacts: Object.freeze(missing) });
  const typeFailure = strictTypedFacts(familyId, facts);
  if (typeFailure) return typeFailure;
  const timing = timingResult(facts, asOf);
  if (timing.state) return timing;
  if (facts["nj.disposition_kind"] !== "convicted_or_adjudicated_delinquent") return fail("WRONG_DISPOSITION_BRANCH", "Form A item (d) is not supported by the recorded disposition.");
  if (facts["nj.pending_charges"]) return fail("SELF_HELP_STOP", "A pending charge requires review before packet generation.");
  if (facts["nj.prior_criminal_conviction_expungement"]) return fail("SELF_HELP_STOP", "Prior criminal-conviction expungement, sealing, or similar relief in any state or federal court requires review.");
  if (facts["nj.includes_title_39_matter"]) return fail("OUTSIDE_CHAPTER", "A Title 39 matter is outside this expungement chapter.");
  if (facts["nj.marijuana_regrading_applies"]) return fail("SELF_HELP_STOP", "Marijuana regrading must be resolved before offense counting.");
  if (facts["nj.outstanding_financial_assessment"] || facts["nj.prosecutor_objection"] || facts["nj.nonexpungeable_offense"]) {
    return fail("SELF_HELP_STOP", "An outstanding assessment, prosecutor objection, or potentially excluded offense requires review.");
  }
  if (/^(?:n\.?j\.?s\.?a\.?\s*)?2c:15-1$/i.test(facts["matter.statute_citation"].trim())) {
    return fail("NONEXPUNGEABLE_OFFENSE", "The supplied robbery citation is expressly outside this generated route.");
  }
  if (facts["nj.early_pathway_compelling_circumstances"]) return fail("SELF_HELP_STOP", "The early compelling-circumstances pathway requires individualized review.");
  if (facts["participant.has_legal_name_change"]) return fail("SOURCE_ALIAS_STOP", "The source aliases the name-change narrative to unrelated narratives; the build cannot fill it safely.");
  if (!["jail time", "prison time", "incarceration time"].includes(facts["matter.incarceration_term_type"])) return fail("SOURCE_VALUE_UNSUPPORTED", "The held source dropdown cannot represent the supplied incarceration answer.");
  const count = facts["nj.disorderly_or_petty_count"];
  if (!Number.isInteger(count) || count < 0) return fail("INVALID_FACT", "The disorderly-persons count must be a nonnegative integer.");
  if (familyId === "nj_disorderly_persons-set") {
    if (facts["nj.any_crime_conviction"]) return fail("WRONG_ROUTE", "A crime conviction moves the matter off this route.");
    if (count < 1) return fail("WRONG_ROUTE", "This route requires at least one disorderly or petty disorderly persons conviction.");
    if (count <= 5) return authorize(familyId, "DISORDERLY_OR_PETTY_COUNT_AT_MOST_FIVE", timing.latestCompletionDate);
    const related = facts["nj.convictions_entered_same_day"] || facts["nj.convictions_closely_related"];
    if (!relationshipVerified(facts, related)) return fail("UNVERIFIED_RELATIONSHIP", "A same-day or closely-related branch requires the underlying verified disposition records.");
    if (facts["nj.convictions_entered_same_day"]) return authorize(familyId, "SAME_DAY_CONVICTIONS", timing.latestCompletionDate);
    if (facts["nj.convictions_closely_related"]) return authorize(familyId, "CLOSELY_RELATED_SEQUENCE", timing.latestCompletionDate);
    return fail("NO_SUPPORTED_BRANCH", "The supplied offense count and relationship facts establish no governed branch.");
  }
  const indictableCount = facts["nj.indictable_conviction_count"];
  if (!Number.isInteger(indictableCount) || indictableCount < 1) return fail("WRONG_ROUTE", "This route requires an indictable conviction.");
  if (facts["nj.subsequent_crime_conviction"]) return fail("NO_SUPPORTED_BRANCH", "A subsequent crime conviction prevents the ordinary branch.");
  if (facts["nj.drug_crime_compelling_circumstances_route"]) return fail("SELF_HELP_STOP", "The drug-crime compelling-circumstances route is not generated here.");
  if (indictableCount === 1 && count <= 3) return authorize(familyId, "ONE_CRIME_WITH_AT_MOST_THREE_DISORDERLY_OR_PETTY_OFFENSES", timing.latestCompletionDate);
  const related = facts["nj.convictions_single_judgment_or_same_day"] || facts["nj.convictions_closely_related"];
  if (!relationshipVerified(facts, related)) return fail("UNVERIFIED_RELATIONSHIP", "A single-judgment, same-day, or closely-related branch requires the underlying verified disposition records.");
  if (facts["nj.convictions_single_judgment_or_same_day"]) return authorize(familyId, "SINGLE_JUDGMENT_OR_SAME_DAY", timing.latestCompletionDate);
  if (facts["nj.convictions_closely_related"]) return authorize(familyId, "CLOSELY_RELATED_SEQUENCE", timing.latestCompletionDate);
  return fail("NO_SUPPORTED_BRANCH", "The supplied conviction counts and relationship facts establish no governed branch.");
}

export function assertNjCn10557ConvictionPacketAuthorized(familyId, facts) {
  const result = classifyNjCn10557ConvictionRoute(familyId, facts);
  assert.equal(result.state, "CN10557_ITEM_D_FACTUALLY_SUPPORTED", `${familyId}: ${result.state}: ${result.reason}`);
  assert.deepEqual(result.authorizedSelections, familyId === "nj_indictable_conviction-set"
    ? ["guilty", "seekJuvNever"] : ["guilty"]);
  return result;
}
export function njCn10557RequiredFactIds(familyId) {
  assert.ok(REQUIRED_BY_FAMILY[familyId], `unsupported NJ CN-10557 conviction family ${familyId}`);
  return Object.freeze([...COMMON_REQUIRED, ...REQUIRED_BY_FAMILY[familyId]]);
}
