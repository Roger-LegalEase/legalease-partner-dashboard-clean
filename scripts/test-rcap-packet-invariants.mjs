#!/usr/bin/env node
/**
 * The acceptance invariants, held to their own standard.
 *
 * Each of these modules exists to stop a browser run going green over a real
 * defect. A check that quietly stops checking is worse than no check, because
 * the release still reports a pass — so every rule here is proven twice: once
 * that it accepts what is correct, and once that it refuses the exact defect
 * it was written for.
 */

import assert from "node:assert/strict";

import { createPacketReadbackInvariant } from "./rcap-packet-readback-invariant.mjs";
import { createPacketUxMeasurement } from "./rcap-packet-ux-measurement.mjs";
import { reviewJourneyCopy } from "./rcap-journey-copy-review.mjs";

let passed = 0;
const it = (name, fn) => {
  try {
    fn();
    passed += 1;
  } catch (error) {
    console.error(`FAIL ${name}\n  ${error.message}`);
    process.exitCode = 1;
  }
};

// ---------------------------------------------------------------- readback

const readback = (dependents = {}, supports = {}) => createPacketReadbackInvariant({
  conditionalDependents: (id) => dependents[id] ?? [],
  supportingFacts: (id) => supports[id] ?? []
});

it("a normal section save, where the answers persist, is accepted", () => {
  const invariant = readback();
  invariant.record({ submitted: { a: "1", b: "2" }, missingInputIds: ["c", "d"] });
  invariant.record({ submitted: { c: "3", d: "4" }, missingInputIds: [] });
  assert.deepEqual(invariant.atReview().failures, []);
});

it("a value that did not persist is refused, not counted as progress", () => {
  const invariant = readback();
  // "b" was submitted and the server still calls it missing.
  invariant.record({ submitted: { a: "1", b: "2" }, missingInputIds: ["b"], label: "About you" });
  const { failures } = invariant.summary();
  assert.equal(failures.length, 1);
  assert.match(failures[0], /did not persist/);
  assert.match(failures[0], /\bb\b/);
});

it("an earlier answer that disappears is refused", () => {
  const invariant = readback();
  invariant.record({ submitted: { a: "1" }, missingInputIds: ["b"] });
  invariant.record({ submitted: { b: "2" }, missingInputIds: ["a"], label: "Your case" });
  const failure = invariant.summary().failures.find((text) => /disappeared/.test(text));
  assert.ok(failure, "a saved answer disappearing must be reported");
  assert.match(failure, /\ba\b/);
});

it("new work is accepted only when the answer just given activated it", () => {
  const invariant = readback({ has_other_cases: ["other_case_number", "other_case_court"] });
  invariant.record({ submitted: { a: "1" }, missingInputIds: ["has_other_cases"] });
  // Answering the gate legitimately ADDS its dependants. A monotonic rule
  // would have called this correct behaviour a regression.
  invariant.record({
    submitted: { has_other_cases: "yes" },
    missingInputIds: ["other_case_number", "other_case_court"]
  });
  assert.deepEqual(invariant.summary().failures, []);
});

it("a new requirement nothing in the save explains is refused", () => {
  const invariant = readback({ has_other_cases: ["other_case_number"] });
  invariant.record({ submitted: { a: "1" }, missingInputIds: ["has_other_cases"] });
  invariant.record({
    submitted: { has_other_cases: "yes" },
    missingInputIds: ["other_case_number", "something_unrelated"],
    label: "Other cases"
  });
  const failure = invariant.summary().failures.find((text) => /nothing in this save explains them/.test(text));
  assert.ok(failure, "an unexplained new missing fact must be reported");
  assert.match(failure, /something_unrelated/);
  assert.doesNotMatch(failure, /other_case_number/);
});

it("a resolved fact may go missing only when what supported it changed", () => {
  const invariant = readback({}, { age_at_offense: ["date_of_birth", "offense_date"] });
  invariant.record({ submitted: { date_of_birth: "1990-01-01", offense_date: "2015-06-01" }, missingInputIds: [] });
  // Changing an input its derivation rested on is the innocent case.
  invariant.record({ submitted: { date_of_birth: "1991-01-01" }, missingInputIds: ["age_at_offense"] });
  assert.deepEqual(invariant.summary().failures, []);
});

it("an unrelated resolved fact going missing is refused", () => {
  const invariant = readback({}, { age_at_offense: ["date_of_birth"] });
  invariant.record({ submitted: { date_of_birth: "1990-01-01" }, missingInputIds: [] });
  invariant.record({ submitted: { court_name: "Hinds" }, missingInputIds: ["age_at_offense"], label: "Court" });
  assert.ok(invariant.summary().failures.length > 0, "an unrelated fact falling out of resolution must be reported");
});

it("reaching Review with anything still unresolved is refused", () => {
  const invariant = readback();
  invariant.record({ submitted: { a: "1" }, missingInputIds: ["b"] });
  const failure = invariant.atReview().failures.find((text) => /still unresolved/.test(text));
  assert.ok(failure, "Review must not be reached with a required fact absent");
  assert.match(failure, /\bb\b/);
});

it("reaching Review having proven nothing is refused", () => {
  assert.match(readback().atReview().failures[0], /without a single server readback/);
});

// ------------------------------------------------------- screening carry

const screen = (factStates, extra = {}) => ({
  sectionId: "about_you",
  heading: "About you",
  factIds: Object.keys(factStates),
  questions: Object.keys(factStates).length,
  textInputs: 0, choiceDecisions: 0, selects: 0, conditionalControls: 0, prefilledFields: 0,
  screenHeightPx: 800, viewportHeightPx: 800,
  factStates,
  ...extra
});

it("a screening fact shown prefilled is fine — correcting a wrong answer must stay possible", () => {
  const ux = createPacketUxMeasurement({ expectedReusedFactIds: ["offense_level"] });
  ux.record(screen({ offense_level: { editable: true, answered: true, present: true } }));
  const summary = ux.summary();
  assert.deepEqual(summary.failures, []);
  assert.deepEqual(summary.screeningFactsShownPrefilledOrReadOnly, ["offense_level"]);
});

it("a screening fact shown read-only is fine", () => {
  const ux = createPacketUxMeasurement({ expectedReusedFactIds: ["offense_level"] });
  ux.record(screen({ offense_level: { editable: false, answered: false, present: true } }));
  assert.deepEqual(ux.summary().failures, []);
});

it("a screening fact shown as an empty control the participant must fill is refused", () => {
  const ux = createPacketUxMeasurement({ expectedReusedFactIds: ["offense_level"] });
  ux.record(screen({ offense_level: { editable: true, answered: false, present: true } }));
  const failure = ux.summary().failures.find((text) => /empty controls/.test(text));
  assert.ok(failure, "asking a settled screening fact again must be reported");
  assert.match(failure, /offense_level/);
});

it("a derived fact appearing at all is refused, prefilled or not", () => {
  const ux = createPacketUxMeasurement({ expectedDerivedFactIds: ["age_at_offense"] });
  ux.record(screen({ age_at_offense: { editable: true, answered: true, present: true } }));
  assert.match(ux.summary().failures.join(" "), /derived/);
});

// ------------------------------------------------------------ journey copy

const surface = (name, text, actions = ["Save and continue"], headings = ["About you"]) =>
  ({ surface: name, url: "https://example.test", text, headings, actions });

it("a clean consumer journey passes", () => {
  const review = reviewJourneyCopy([
    surface("preliminary_result", "You may be able to clear this record.\nHere is what happens next.", ["See my options"], ["Your result"]),
    surface("packet_information_section", "Tell us the name the court has on file.")
  ]);
  assert.deepEqual(review.failures, []);
});

it("implementation language that reached a real screen is a failure", () => {
  const review = reviewJourneyCopy([surface("packet_ready", "Render job queued. We will notify you.", ["Download"], ["Ready"])]);
  const failure = review.failures.find((entry) => entry.category === "INTERNAL_LANGUAGE");
  assert.ok(failure, "internal vocabulary on a live screen must fail");
  assert.match(failure.sentence, /Render job queued/);
});

it("a surface that asks for action while offering none is a failure", () => {
  const review = reviewJourneyCopy([surface("checkout_cta", "Your packet is ready to generate.", [], ["Ready"])]);
  assert.ok(review.failures.some((entry) => entry.category === "UNCLEAR_ACTION"));
});

it("controls that name no action the participant would recognise are a failure", () => {
  const review = reviewJourneyCopy([surface("checkout_cta", "Your packet is ready.", ["..."], ["Ready"])]);
  assert.ok(review.failures.some((entry) => entry.category === "UNCLEAR_ACTION"));
});

it("jargon, corporate voice and robotic copy are reported, not failed", () => {
  const review = reviewJourneyCopy([
    surface("review_and_edit", "The petitioner must utilize this form in order to proceed. An error occurred.")
  ]);
  assert.deepEqual(review.failures, [], "tone is a person's judgement, not a hard gate");
  const categories = new Set(review.advisory.map((entry) => entry.category));
  assert.ok(categories.has("LEGAL_JARGON"));
  assert.ok(categories.has("CORPORATE_LANGUAGE"));
  assert.ok(categories.has("ROBOTIC_COPY"));
});

it("the same sentence on several surfaces is reported as repetitive", () => {
  const disclaimer = "We are not a law firm and we cannot give you legal advice about your case.";
  const review = reviewJourneyCopy([
    surface("preliminary_result", disclaimer, ["Continue"], ["Result"]),
    surface("review_and_edit", disclaimer),
    surface("checkout_cta", disclaimer)
  ]);
  assert.ok(review.advisory.some((entry) => entry.category === "REPETITIVE"));
});

it("surfaces the run never reached are named rather than assumed covered", () => {
  const review = reviewJourneyCopy([surface("preliminary_result", "Hello.", ["Continue"], ["Result"])]);
  assert.ok(review.surfacesMissing.includes("packet_ready"));
});

if (process.exitCode) {
  console.error(`\n${passed} check(s) passed before the first failure.`);
} else {
  console.log(JSON.stringify({ ok: true, checks: passed }, null, 2));
}
