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
 * THE RULES, AND THE DOCUMENTS THEY WERE READ FROM
 *
 * The rule text below was transcribed from an owner decision record until
 * 2026-09-10. It has since been READ AGAINST TWO HELD DOCUMENTS, hashed in this
 * worktree at private/human-source-returns/IN/ and receipted at
 * data/rcap-grade-a/packet-factory-24h/INDIANA_CASE_TYPE_SOURCES_IN_CUSTODY.json.
 *
 *   Case Type Quick Reference Guide, revision 1/1/2025, 14pp
 *   sha256 d1dcef6e3415657387e58bc31ab85a6921f9d0beb8b7ebd343819b9c1080a113
 *   printed page 8, CRIMINAL, INFRACTIONS & ORDINANCE VIOLATIONS table:
 *       "Felony Class B | ... | B Felony | FB"
 *       "Felony Class D | ... | D Felony | FD"
 *       "Criminal Misdemeanor | | Criminal Misdemeanor | CM"
 *
 *   QCSR Application Guide, edition August 2026, 67pp
 *   sha256 b0adb89723794d22f74db42fe457164de51619e99eaba7e0f78ed2313296ae9e
 *   physical page 10 / printed folio 9, citing Admin. Rule 1(B)(4):
 *       "only one new filing will be reported in the category of the most
 *        serious charge against the defendant. The case will remain in that
 *        category even if charges are later amended or if the defendant is
 *        convicted of a lesser offense."
 *   and the descending order of seriousness, in which Class D felony stands
 *   above Class A misdemeanor -- which is on the NEXT page, not this one: the
 *   sentence begins at the foot of physical page 10 ("...includes the most
 *   serious charge of") and completes at the head of physical page 11, printed
 *   folio 10. This header said "the same page" and was wrong; VF50 caught it.
 *
 * WHAT IS STILL NOT HELD, said here so no reader over-reads the above.
 * Administrative Rule 8(B)(3) and Rule 1(B)(4)(a) THEMSELVES, as published at
 * rules.incourts.gov, are unretrieved. The QCSR guide CITES Rule 1(B)(4) and the
 * quick reference states the token table, so both propositions rest on a held
 * document -- but neither held document IS the rule, and the Indiana petitions
 * assert Rule 8(B)(3) to a court as settled authority. That remains a recorded
 * blocker for approved_for_live and is not resolved by this file.
 *
 * Neither held document is an independently fetched issuer copy: the digests
 * identify the bytes held, and assert no byte-for-byte match to a copy fetched
 * from the issuer.
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

/**
 * The token table, read off the Case Type Quick Reference Guide, printed page 8
 * (sha256 d1dcef6e...c1080a113). Only the codes this corpus uses.
 *
 * "Class A misdemeanor" is present ONLY so the tests below can show what a token
 * derived from the CONVICTION class would have been, and that it is the wrong
 * answer. Nothing in this repository may use this table that way.
 */
const TOKEN_FOR_CLASS = Object.freeze({
  "Class B felony": "FB",
  "Class D felony": "FD",
  "Class A misdemeanor": "CM"
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

/* ------------------------------------------------------------------ */
/* The misd boundary: the higher-charge, lesser-conviction case, now    */
/* carried by a real fixture rather than only by the specimen above.    */
/* ------------------------------------------------------------------ */

/**
 * This fixture read "CM" -- the CONVICTION's own token -- until 2026-09-10. On
 * the two held documents that is the one pairing the rules affirmatively forbid:
 * the most serious ORIGINAL charge was a Class D felony, so the category is "FD"
 * and REMAINS "FD" after conviction of the lesser offence. The token was moved to
 * "FD". The modelled case was NOT changed to fit the token: the scenario was
 * already the higher-charge one, which is why "FD" is right for it.
 */
test("misd boundary: charged Class D felony, convicted Class A misdemeanor, keeps FD", () => {
  const text = source("misd");
  const declared = /"matter\.offense_charged_most_serious":\s*"([^"]+)"/.exec(text);
  assert.ok(declared,
    "the misd boundary fixture must state its most serious original charge in terms. " +
    "The charge, not the conviction, is what decides the token, so leaving the charge " +
    "to be inferred is what lets the conviction quietly decide it instead.");
  assert.match(declared[1], /Class D felony/);
  assert.match(declared[1], /most serious original charge/);

  const { causeNumber, offenseLevel } = boundaryFixtureOf("misd");

  /* The conviction is preserved exactly: a Class A misdemeanour reached by
   * reduction from the Class D felony under I.C. 35-50-2-7. */
  assert.match(offenseLevel, /^Class A misdemeanor reduced from a Class D felony under I\.C\. 35-50-2-7$/);

  assert.equal(tokenOf(causeNumber), categoryToken({ mostSeriousCharge: "Class D felony" }));
  assert.equal(tokenOf(causeNumber), "FD");

  /* The point of this fixture: deriving the token from the CONVICTION would give
   * "CM", which is what the fixture wrongly carried and what the rules forbid. */
  const wouldBeIfDerivedFromConviction = TOKEN_FOR_CLASS["Class A misdemeanor"];
  assert.equal(wouldBeIfDerivedFromConviction, "CM");
  assert.notEqual(wouldBeIfDerivedFromConviction, tokenOf(causeNumber));
});

test("misd boundary keeps its width-stress serial, its statutory route and a distinct sequence", () => {
  const { causeNumber } = boundaryFixtureOf("misd");
  const [court, yymm, , serial] = causeNumber.split("-");
  assert.equal(court, "45C01");
  assert.equal(yymm, "0812");
  assert.equal(serial, "00000000000123456",
    "the 17-digit padded serial is width-stress coverage and is not to be silently shortened; " +
    "it is also not a realistic docket number");
  assert.match(source("misd"), /"matter\.statutory_section":\s*"I\.C\. 35-38-9-2"/);

  /* Distinct from the sibling boundary it now shares a court, term and token
   * with. The sequence is the only thing separating them, so it is load-bearing. */
  const sibling = boundaryFixtureOf("d6").causeNumber;
  assert.notEqual(causeNumber, sibling);
  assert.notEqual(serial, sibling.split("-")[3]);
});

test("the misd CANONICAL fixture is a simple misdemeanour and correctly keeps CM", () => {
  /* Guards against a token sweep: CM beside a Class A misdemeanour is CORRECT
   * where the misdemeanour IS the most serious charge, which is the canonical
   * fixture's case. Only the boundary fixture models a reduced higher charge. */
  const text = source("misd");
  const causes = [...text.matchAll(/"matter\.cause_number":\s*"([^"]+)"/g)].map((m) => m[1]);
  const levels = [...text.matchAll(/"matter\.offense_level":\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(tokenOf(causes[0]), "CM");
  assert.equal(levels[0], "Class A misdemeanor");
  assert.equal(tokenOf(causes[0]), categoryToken({ mostSeriousCharge: "Class A misdemeanor" }));
});
