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

const COMMON_REQUIRED = Object.freeze([
  "matter.conviction_date",
  "matter.charge",
  "matter.statute_citation",
  "matter.final_sentence",
  "matter.court",
  "matter.incarceration_term_type",
  "matter.incarceration_completion_date",
  "matter.probation_completion_date",
  "matter.fines_paid_date",
  "nj.disposition_kind",
  "nj.pending_charges",
  "nj.prior_criminal_conviction_expungement",
  "nj.includes_title_39_matter",
  "nj.marijuana_regrading_applies",
  "nj.early_pathway_compelling_circumstances",
  "participant.has_legal_name_change",
]);

const REQUIRED_BY_FAMILY = Object.freeze({
  "nj_disorderly_persons-set": Object.freeze([
    "nj.any_crime_conviction",
    "nj.disorderly_or_petty_count",
    "nj.convictions_entered_same_day",
    "nj.convictions_closely_related",
  ]),
  "nj_indictable_conviction-set": Object.freeze([
    "nj.indictable_conviction_count",
    "nj.disorderly_or_petty_count",
    "nj.subsequent_crime_conviction",
    "nj.convictions_single_judgment_or_same_day",
    "nj.convictions_closely_related",
    "nj.drug_crime_compelling_circumstances_route",
  ]),
});

const present = (value) => value !== undefined && value !== null
  && !(typeof value === "string" && value.trim() === "");

function missingFacts(familyId, facts) {
  const familyRequired = REQUIRED_BY_FAMILY[familyId];
  assert.ok(familyRequired, `unsupported NJ CN-10557 conviction family ${familyId}`);
  return [...COMMON_REQUIRED, ...familyRequired].filter((factId) => !present(facts[factId]));
}

function fail(state, reason, extra = {}) {
  return Object.freeze({ state, authorizedSelections: Object.freeze([]), reason, ...extra });
}

function authorize(familyId, branch) {
  const authorizedSelections = familyId === "nj_indictable_conviction-set"
    ? ["guilty", "seekJuvNever"]
    : ["guilty"];
  return Object.freeze({
    state: "CN10557_ITEM_D_FACTUALLY_SUPPORTED",
    authorizedSelections: Object.freeze(authorizedSelections),
    branch,
    reason: "The participant's supplied court-record facts complete Form A item (d), and the governed rules classify the applicable conviction branch.",
  });
}

export function classifyNjCn10557ConvictionRoute(familyId, facts = {}) {
  const missing = missingFacts(familyId, facts);
  if (missing.length) return fail("MISSING_REQUIRED_FACTS",
    "The factual record is incomplete; do not create or mark a conviction petition.", { missingFacts: Object.freeze(missing) });

  if (facts["nj.disposition_kind"] !== "convicted_or_adjudicated_delinquent") {
    return fail("WRONG_DISPOSITION_BRANCH", "Form A item (d) is not supported by the recorded disposition.");
  }
  if (facts["nj.pending_charges"] === true) {
    return fail("SELF_HELP_STOP", "A pending charge requires the route to stop before packet generation.");
  }
  if (facts["nj.prior_criminal_conviction_expungement"] === true) {
    return fail("SELF_HELP_STOP", "A prior criminal-conviction expungement requires route-specific review.");
  }
  if (facts["nj.includes_title_39_matter"] === true) {
    return fail("OUTSIDE_CHAPTER", "A Title 39 matter cannot be put into this expungement petition.");
  }
  if (facts["nj.marijuana_regrading_applies"] === true) {
    return fail("SELF_HELP_STOP", "Marijuana or paraphernalia regrading must be resolved before offense counting.");
  }
  if (facts["nj.early_pathway_compelling_circumstances"] !== false) {
    return fail("SELF_HELP_STOP",
      "An early compelling-circumstances narrative cannot be generated through the source's aliased narrative field.");
  }
  if (facts["participant.has_legal_name_change"] !== false) {
    return fail("SOURCE_ALIAS_STOP",
      "A name-change narrative cannot be generated through the source field shared with two unrelated compelling-circumstances paragraphs.");
  }
  if (!["jail time", "prison time", "incarceration time"].includes(facts["matter.incarceration_term_type"])) {
    return fail("SOURCE_VALUE_UNSUPPORTED",
      "The held source dropdown cannot truthfully represent the supplied incarceration-term answer.");
  }

  const count = facts["nj.disorderly_or_petty_count"];
  if (!Number.isInteger(count) || count < 0) {
    return fail("INVALID_FACT", "The disorderly-persons count must be a nonnegative integer from the official record.");
  }

  if (familyId === "nj_disorderly_persons-set") {
    if (facts["nj.any_crime_conviction"] !== false) {
      return fail("WRONG_ROUTE", "A crime conviction moves the matter off the disorderly-persons-only route.");
    }
    if (count < 1) return fail("WRONG_ROUTE", "This route requires at least one disorderly or petty disorderly persons conviction.");
    if (count <= 5) return authorize(familyId, "DISORDERLY_OR_PETTY_COUNT_AT_MOST_FIVE");
    if (facts["nj.convictions_entered_same_day"] === true) return authorize(familyId, "SAME_DAY_CONVICTIONS");
    if (facts["nj.convictions_closely_related"] === true) return authorize(familyId, "CLOSELY_RELATED_SEQUENCE");
    return fail("NO_SUPPORTED_BRANCH", "The supplied offense count and relationship facts establish no governed branch.");
  }

  const indictableCount = facts["nj.indictable_conviction_count"];
  if (!Number.isInteger(indictableCount) || indictableCount < 1) {
    return fail("WRONG_ROUTE", "The indictable-conviction route requires at least one indictable conviction.");
  }
  if (facts["nj.subsequent_crime_conviction"] === true) {
    return fail("NO_SUPPORTED_BRANCH", "A subsequent crime conviction prevents the ordinary one-crime branch.");
  }
  if (facts["nj.drug_crime_compelling_circumstances_route"] === true) {
    return fail("SELF_HELP_STOP", "The controlled-dangerous-substance compelling-circumstances route is not template output.");
  }
  if (indictableCount === 1 && count <= 3) return authorize(familyId, "ONE_CRIME_WITH_AT_MOST_THREE_DISORDERLY_OR_PETTY_OFFENSES");
  if (facts["nj.convictions_single_judgment_or_same_day"] === true) return authorize(familyId, "SINGLE_JUDGMENT_OR_SAME_DAY");
  if (facts["nj.convictions_closely_related"] === true) return authorize(familyId, "CLOSELY_RELATED_SEQUENCE");
  return fail("NO_SUPPORTED_BRANCH", "The supplied conviction counts and relationship facts establish no governed branch.");
}

export function assertNjCn10557ConvictionPacketAuthorized(familyId, facts) {
  const result = classifyNjCn10557ConvictionRoute(familyId, facts);
  assert.equal(result.state, "CN10557_ITEM_D_FACTUALLY_SUPPORTED",
    `${familyId}: ${result.state}: ${result.reason}`);
  assert.deepEqual(result.authorizedSelections, familyId === "nj_indictable_conviction-set"
    ? ["guilty", "seekJuvNever"] : ["guilty"]);
  return result;
}

export function njCn10557RequiredFactIds(familyId) {
  assert.ok(REQUIRED_BY_FAMILY[familyId], `unsupported NJ CN-10557 conviction family ${familyId}`);
  return Object.freeze([...COMMON_REQUIRED, ...REQUIRED_BY_FAMILY[familyId]]);
}
