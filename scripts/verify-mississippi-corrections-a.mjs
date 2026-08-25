import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.RCAP_EVALUATOR_TODAY = "2026-08-25";
register(
  pathToFileURL(path.join(ROOT, "scripts/corrections-a/native-ts-loader.mjs")).href,
  import.meta.url
);

const sourcePath = path.join(
  ROOT,
  "src/lib/rcap/state-packs/mississippi/correction-closures.ts"
);
const { mississippiCorrectionClosures } = await import(pathToFileURL(sourcePath).href);
const { evaluateScreening } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/rcap-engine/evaluator.ts")).href
);
const { getProfileByJurisdiction } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/rcap-engine/profile-registry.ts")).href
);
const { projectPublicProfile } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/rcap-engine/public-profile-projection.ts")).href
);
const checkoutState =
  "fail_closed_pending_formal_legal_approval_and_hosted_acceptance";

assert.deepStrictEqual(mississippiCorrectionClosures, {
  additionalJusticeOrMunicipalMisdemeanor: {
    routeId: "additional-justice-or-municipal-court-misdemeanor-relief",
    remedy: "Additional justice-court or municipal-court misdemeanor relief",
    authorities: [
      "Miss. Code Ann. § 9-11-15(3)",
      "Miss. Code Ann. § 21-23-7(6)"
    ],
    timing: [
      {
        id: "two_years_good_conduct",
        duration: "2 years",
        anchor: "last_conviction_date_any_court",
        rule:
          "Two years of good conduct must run from the person's last conviction in any court."
      }
    ],
    requiredFacts: [
      "justice_or_municipal_court",
      "target_cases_in_that_court",
      "complete_conviction_history_anywhere",
      "last_conviction_date_any_court",
      "two_year_good_conduct_confirmation",
      "rehabilitation_evidence",
      "societal_best_interest_facts",
      "prosecutor_notice_date"
    ],
    packetFamily: [
      "justice_court_additional_misdemeanor_petition",
      "municipal_court_additional_misdemeanor_petition"
    ],
    checkoutState
  },
  firstOffenseDui: {
    routeId: "first-offense-dui-expungement",
    remedy: "First-offense DUI expungement",
    authorities: ["Miss. Code Ann. § 63-11-30(13)"],
    timing: [
      {
        id: "five_years_after_successful_sentence_completion",
        duration: "5 years",
        anchor: "successful_completion_of_all_sentence_terms_date",
        rule:
          "Five years must run after successful completion of every term and condition of the sentence."
      }
    ],
    requiredFacts: [
      "qualifying_first_offense_under_subsection_2_or_3",
      "circuit_court_county_of_conviction",
      "successful_completion_of_all_sentence_terms_date",
      "no_cdl_or_clp_at_offense",
      "no_blood_or_breath_test_refusal",
      "bac_below_point_16_if_available",
      "no_other_or_pending_dui",
      "no_prior_dui_nonadjudication",
      "no_prior_dui_expunction",
      "justification_for_relief"
    ],
    packetFamily: ["circuit_court_first_offense_dui_expungement_petition"],
    checkoutState
  },
  minorInPossessionUnderageAlcohol: {
    routeId: "minor-in-possession-underage-alcohol-expungement",
    remedy: "Minor-in-possession or underage-alcohol expungement",
    authorities: [
      "Miss. Code Ann. § 67-3-70(1)",
      "Miss. Code Ann. § 67-3-70(2)",
      "Miss. Code Ann. § 67-3-70(6)"
    ],
    timing: [
      {
        id: "one_year_after_dismissal_or_discharge",
        duration: "1 year",
        anchor: "dismissal_or_discharge_date",
        rule: "The dismissal branch opens one year after dismissal and discharge."
      },
      {
        id: "latest_of_sentence_completion_or_fine_payment",
        duration: "1 year",
        anchor: "latest_of_sentence_completion_or_fine_payment",
        rule:
          "The conviction branch opens one year after the latest applicable sentence-completion or fine-payment date."
      }
    ],
    requiredFacts: [
      "charge_under_67_3_70_subsection_1_or_2",
      "age_at_offense",
      "dismissal_or_conviction_branch",
      "dismissal_or_discharge_date",
      "sentence_completion_date",
      "fine_imposed_or_not_applicable",
      "fine_payment_date",
      "related_charges_outside_67_3_70"
    ],
    packetFamily: ["section_67_3_70_6_expungement_petition"],
    checkoutState
  }
});

const runtimeFixture = JSON.parse(fs.readFileSync(
  path.join(ROOT, "data/expungement-ai/corrections-a/runtime-fixtures.json"),
  "utf8"
));
const mississippiRuntimeRows = runtimeFixture.routes.filter(
  (row) => row.jurisdiction === "MS"
);
assert.equal(mississippiRuntimeRows.length, 3, "all three assigned Mississippi routes need runtime fixtures");
const exactIntegratedFacts = {
  "MS:additional-justice-or-municipal-court-misdemeanor-relief": {
    ms_last_conviction_date_any_court: "2000-01-01"
  },
  "MS:first-offense-dui-expungement": {
    ms_successful_sentence_completion_date: "2000-01-01"
  },
  "MS:minor-in-possession-underage-alcohol-expungement": {
    ms_mip_sentence_completion_date: "2000-01-01",
    ms_mip_fine_imposed: "Yes",
    ms_mip_fine_payment_date: "2000-01-01"
  }
};
for (const row of mississippiRuntimeRows) {
  const profile = getProfileByJurisdiction(row.jurisdiction);
  assert.ok(profile, `${row.routeKey}: Mississippi runtime profile missing`);
  const publicQuestionIds = new Set(
    projectPublicProfile(profile).questions.map((question) => question.id)
  );
  const supportedIntegratedFacts = Object.fromEntries(
    Object.entries(exactIntegratedFacts[row.routeKey] ?? {})
      .filter(([questionId]) => publicQuestionIds.has(questionId))
  );
  const evaluation = evaluateScreening({
    jurisdiction: row.jurisdiction,
    profileVersion: row.profileVersion,
    matterId: `corrections-a-ms-${row.pathwayId}`,
    answers: { ...row.answers, ...supportedIntegratedFacts }
  });
  assert.equal(
    evaluation.pathwayId,
    row.pathwayId,
    `${row.routeKey}: actual evaluator selected another Mississippi route`
  );
  assert.equal(
    evaluation.paymentAllowed,
    false,
    `${row.routeKey}: actual evaluator must fail closed before formal approval and hosted acceptance`
  );
  assert.equal(
    evaluation.resultCode,
    "needs_review",
    `${row.routeKey}: actual evaluator must return review rather than a paid packet`
  );
}

console.log("verify-mississippi-corrections-a: GREEN");
console.log(JSON.stringify({
  structuredClosures: Object.keys(mississippiCorrectionClosures).length,
  actualEvaluatorRoutesProven: mississippiRuntimeRows.length,
  paymentAllowed: false
}, null, 2));
