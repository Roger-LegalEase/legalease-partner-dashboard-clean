/**
 * Indiana case-type tokens: what the published rules decide, and what they
 * forbid this repository from doing.
 *
 * WHY THIS FILE EXISTS
 *
 * Two boundary fixtures carried the token "FB": one beside a Class B felony
 * conviction (in_conviction_felony-set) and one beside a Class D felony
 * conviction (in_conviction_d6-set). That pairing was recorded as a
 * contradiction. It was not one. The owner located the publication and the
 * record was corrected:
 *
 *   docs/rcap/grade-a/owner-decisions/
 *   INDIANA_CAUSE_NUMBER_TOKEN_CONTRADICTS_THE_STATED_OFFENCE.md
 *
 * THE RULES, AS SUPPLIED
 *
 *   Admin. Rule 8(B)(3)          "FB" identifies a Class B felony;
 *                                "FD" identifies a Class D felony.
 *   Admin. Rule 1(B)(4)(a)(iii)  the case category is assigned by the MOST
 *                                SERIOUS CHARGE.
 *   QCSR Instructions,           the category REMAINS after amended charges or
 *   August 2026, page 9          a conviction of a lesser offence.
 *
 * THE RULE TEXT ABOVE HAS NOT BEEN READ AGAINST A RETRIEVED DOCUMENT. It is
 * transcribed from the owner decision record. The two manifest entries that
 * would carry it -- `in-admin-rules-case-type-and-category` and
 * `in-qcsr-instructions-2026-08` -- both carry `expectedSha256: null`, and
 * network egress is blocked in the build container, so retrieval must run
 * through the central acquisition process. Until it does, every assertion below
 * is a test of THIS REPOSITORY'S CONSISTENCY WITH A STATED RULE, and not
 * evidence that the rule is stated correctly.
 *
 * WHAT THE RULES FORBID
 *
 * The category follows the most serious CHARGE and survives conviction of a
 * lesser offence, so a token that differs from the final conviction class is an
 * ordinary and correct outcome. No rule in this repository may reject or rewrite
 * an identifier because its token differs from the conviction: doing so would
 * corrupt exactly the cases these rules exist to describe. The last test below
 * is the one that guards that, and it is the reason this file is worth keeping.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILDERS = {
  d6: "scripts/build-census-v1-in_conviction_d6-set.mjs",
  felony: "scripts/build-census-v1-in_conviction_felony-set.mjs",
  misd: "scripts/build-census-v1-in_conviction_misd-set.mjs"
};
const source = (key) => fs.readFileSync(path.join(ROOT, BUILDERS[key]), "utf8");

/** Admin. Rule 8(B)(3), as supplied. Only the codes this corpus uses. */
const TOKEN_FOR_CLASS = Object.freeze({
  "Class B felony": "FB",
  "Class D felony": "FD"
});

/**
 * Admin. Rule 1(B)(4)(a)(iii) with the QCSR Instructions: the category is
 * assigned by the most serious charge, and it REMAINS after amended charges or
 * a conviction of a lesser offence. So the conviction class is not an input.
 */
function categoryToken({ mostSeriousCharge }) {
  const token = TOKEN_FOR_CLASS[mostSeriousCharge];
  assert.ok(token, `Rule 8(B)(3) as held here assigns no token to "${mostSeriousCharge}"`);
  return token;
}

/** The fixture literal, read from the builder that owns it. */
function boundaryFixtureOf(key) {
  const text = source(key);
  const cause = /"matter\.cause_number":\s*"([^"]+)"/g;
  const level = /"matter\.offense_level":\s*"([^"]+)"/g;
  const causes = [...text.matchAll(cause)].map((m) => m[1]);
  const levels = [...text.matchAll(level)].map((m) => m[1]);
  assert.equal(causes.length, 2, `${key}: expected a canonical and a boundary cause number`);
  assert.equal(levels.length, 2, `${key}: expected a canonical and a boundary offence level`);
  return { causeNumber: causes[1], offenseLevel: levels[1] };
}

const tokenOf = (causeNumber) => {
  const parts = causeNumber.split("-");
  assert.equal(parts.length, 4, `not an Indiana cause number of the shape court-YYMM-TYPE-serial: ${causeNumber}`);
  return parts[2];
};

/* ------------------------------------------------------------------ */
/* Scenario one: the simple case, which is what the d6 fixture models. */
/* ------------------------------------------------------------------ */

test("d6 boundary: Class D charged and Class D convicted takes FD under Rule 8(B)(3)", () => {
  const text = source("d6");
  const declared = /"matter\.offense_charged_most_serious":\s*"([^"]+)"/.exec(text);
  assert.ok(declared,
    "the d6 boundary fixture must state its most serious original charge in terms. " +
    "The scenario is what decides the token, and leaving it to be inferred from the " +
    "offence level is what produced the dispute this file records.");
  assert.match(declared[1], /Class D felony/);
  assert.match(declared[1], /no higher original charge/,
    "the fixture models no higher original charge, and none may be invented to give it one");

  const { causeNumber, offenseLevel } = boundaryFixtureOf("d6");
  assert.match(offenseLevel, /^Class D felony/);
  assert.equal(tokenOf(causeNumber), categoryToken({ mostSeriousCharge: "Class D felony" }));
  assert.equal(tokenOf(causeNumber), "FD");
});

test("d6 boundary keeps its width-stress serial, its offence and its statutory route", () => {
  const { causeNumber } = boundaryFixtureOf("d6");
  const [court, yymm, , serial] = causeNumber.split("-");
  assert.equal(court, "45C01");
  assert.equal(yymm, "0812");
  assert.equal(serial, "00000000000654321",
    "the 17-digit padded serial is width-stress coverage and is not to be silently shortened");
  assert.match(source("d6"), /"matter\.statutory_section":\s*"I\.C\. 35-38-9-3"/);
});

test("felony boundary: Class B charged and Class B convicted keeps FB, and is untouched", () => {
  const { causeNumber, offenseLevel } = boundaryFixtureOf("felony");
  assert.match(offenseLevel, /^Class B felony/);
  assert.equal(tokenOf(causeNumber), categoryToken({ mostSeriousCharge: "Class B felony" }));
  assert.equal(causeNumber, "45C01-0812-FB-00000000000123456");
});

/* ------------------------------------------------------------------ */
/* Scenario two: the case the rules exist to describe. Nothing in the  */
/* corpus exercises it, so it is documented here as a specimen.        */
/* ------------------------------------------------------------------ */

/**
 * A DOCUMENTED SYNTHETIC SPECIMEN, not a fixture and not a record of any real
 * case: charged at Class B, convicted of a Class D felony. Under Rule
 * 1(B)(4)(a)(iii) the category was assigned from the Class B charge, and under
 * the QCSR Instructions it REMAINS after the conviction of the lesser offence.
 * It is deliberately distinguishable from the width-stress boundary fixture: an
 * ordinary six-digit serial, and a different court and term.
 */
const HIGHER_CHARGE_SPECIMEN = Object.freeze({
  causeNumber: "49D01-1503-FB-011987",
  mostSeriousCharge: "Class B felony",
  convictionClass: "Class D felony",
  whatItModels: "charged at Class B, resolved by conviction of a Class D felony; " +
    "the category was assigned from the charge and remains after the lesser conviction"
});

test("higher charge, lesser conviction: the token follows the charge, not the conviction", () => {
  assert.equal(tokenOf(HIGHER_CHARGE_SPECIMEN.causeNumber),
    categoryToken({ mostSeriousCharge: HIGHER_CHARGE_SPECIMEN.mostSeriousCharge }));
  assert.equal(tokenOf(HIGHER_CHARGE_SPECIMEN.causeNumber), "FB");

  /* The point of the specimen: the conviction class gives a DIFFERENT token, so
   * a rule that derived the token from the conviction would call this correct
   * identifier wrong. */
  const wouldBeIfDerivedFromConviction = TOKEN_FOR_CLASS[HIGHER_CHARGE_SPECIMEN.convictionClass];
  assert.equal(wouldBeIfDerivedFromConviction, "FD");
  assert.notEqual(wouldBeIfDerivedFromConviction, tokenOf(HIGHER_CHARGE_SPECIMEN.causeNumber));
});

test("the specimen is distinguishable from the width-stress boundary input", () => {
  const { causeNumber } = boundaryFixtureOf("d6");
  const specimenSerial = HIGHER_CHARGE_SPECIMEN.causeNumber.split("-")[3];
  assert.equal(specimenSerial.length, 6);
  assert.notEqual(specimenSerial.length, causeNumber.split("-")[3].length,
    "a realistic synthetic specimen must not be confusable with the padded width-stress input");
});

/* ------------------------------------------------------------------ */
/* The guard: no production rule may equate token with conviction.     */
/* ------------------------------------------------------------------ */

test("no builder parses, derives or validates a case-type token", () => {
  /* Every family writes matter.cause_number through as an opaque string. If any
   * builder ever splits, slices, matches or rewrites it, this fails -- because
   * that is the shape a token-equals-conviction rule would have to take, and
   * such a rule would reject the specimen above, which is a correctly recorded
   * identifier. */
  for (const key of Object.keys(BUILDERS)) {
    const executable = source(key)
      .split("\n")
      .filter((line) => {
        const t = line.trim();
        return !(t.startsWith("*") || t.startsWith("/*") || t.startsWith("//"));
      })
      .join("\n");
    const parses = /cause_number[^\n]*\.(split|slice|match|replace|substring|charAt|test)\s*\(/.exec(executable);
    assert.equal(parses, null,
      `${BUILDERS[key]} parses a cause number (${parses?.[0]}). A case-type token is ` +
      "assigned from the most serious charge and survives conviction of a lesser offence, " +
      "so no code here may reject or rewrite an identifier because its token differs from " +
      "the conviction class.");
    assert.equal(/offense_level[^\n]{0,120}cause_number|cause_number[^\n]{0,120}offense_level/.exec(executable), null,
      `${BUILDERS[key]} reads the cause number and the offence level in one expression, ` +
      "which is how a token-equals-conviction rule would be written.");
  }
});

test("the misd CM pairing is left exactly as it was, and unscored", () => {
  /* Recorded by the owner as staying unscored. It is asserted here so that a
   * later change to it is deliberate and visible rather than incidental. */
  const { causeNumber, offenseLevel } = boundaryFixtureOf("misd");
  assert.equal(causeNumber, "45C01-0812-CM-00000000000123456");
  assert.match(offenseLevel, /^Class A misdemeanor reduced from a Class D felony/);
});
