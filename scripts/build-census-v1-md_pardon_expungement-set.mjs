#!/usr/bin/env node
/**
 * Route-obligation census v1 - packet family `md_pardon_expungement-set`.
 *
 *   node scripts/build-census-v1-md_pardon_expungement-set.mjs
 *
 * Maryland, expunging a conviction the Governor later PARDONED, route
 * `obligation:track-pathway:MD:md_pardon_expungement:pardoned-conviction-expungement-under-crim-proc-10-105-a-8`.
 * Two official binaries:
 *
 *   CC-DC-CR-072B  Rev. 10/01/2025-2, Petition for Expungement of Records
 *                  (non-marijuana/cannabis related offenses) (guilty
 *                  disposition). The filing.
 *   CC-DC-089      Rev. 11/2025, Request for Waiver of Prepaid Costs,
 *                  Md. Rule 1-325. The fee-waiver component.
 *
 * THE ELECTION THIS ROUTE ANSWERS
 *
 * Item 3 of the petition lists eight grounds and says "check all that apply".
 * One of them is this family's whole identity:
 *
 *     [ ] one criminal act, which is not a crime of violence as defined in
 *         Criminal Law Article, sec. 14-101(a), and on or about ______, I was
 *         granted a full and unconditional pardon by the Governor, with respect
 *         to that conviction. Not more than 10 years have passed since the
 *         Governor signed the pardon. I am not now a defendant in any pending
 *         criminal action.
 *
 * The packet marks it, and writes the pardon date beside it from the held
 * screening fact - the same fact the route's own ten-year test is computed from.
 * The other seven grounds are NOT declared inapplicable: the form says check all
 * that apply, and whether a second ground also applies is a fact of the
 * participant's own record. They are carried as genuine participant elections
 * and disclosed.
 *
 * THE FIELD NAMES ON THIS FORM DESCRIBE THE TEXT BESIDE THEM, NOT THE FIELD
 *
 * CC-DC-CR-072B's AcroForm names were generated from whatever printed line the
 * field happened to sit near, and they are wrong about their own fields. The
 * field named "2 I was charged with the offense of" is the SECOND LINE of the
 * incident description; the field named
 * "I was convicted found guilty of check all that apply..." is the offence blank
 * of item 2; the checkbox named "a crime specified in Criminal Law Article 3203
 * common law battery or for an offense classified as a domestically related
 * crime" is the burglary-and-felony-theft ground, one row above the domestically
 * related one. Every label in this map was read off the rendered page at the
 * widget's own measured /Rect, and the field map records both.
 *
 * A COMPANION FORM THIS FAMILY HAS NO SOURCE FOR
 *
 * CC-DC-089 prints, above its first blank, that unless the filing is into one of
 * six restricted case types a Notice Regarding Restricted Information under Rule
 * 20-201.1 - form MDJ-008 - must be filed with it. Expungement is not one of the
 * six. No MDJ-008 is bound to this family by any source record, so this packet
 * does not carry one, does not imply one, and says so in the filing instructions
 * and in build-findings.json. That is a source gap, not something a guide fills.
 *
 * This build renders no raster. rasterState is BUILT_RASTER_PENDING and this
 * lane issues no verdict on its own packet.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS, classifyField }
  from "./rcap-packet-completeness/completeness-contract.mjs";
import { suppressSynthesizedSelectionAppearances }
  from "./rcap-official-forms/rcap-active-content.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFRawStream, PDFButton, StandardFonts,
  pushGraphicsState, popGraphicsState, translate, drawObject, rotateInPlace } = require("pdf-lib");

const FAMILY_ID = "md_pardon_expungement-set";
const OUT_REL = "data/rcap-all50/overlays/census-v1/md/md-pardon-expungement-set--official-pdf-fill";
const ROUTE_KEY = "obligation:track-pathway:MD:md_pardon_expungement:pardoned-conviction-expungement-under-crim-proc-10-105-a-8";
const ROUTE_KEYS = [ROUTE_KEY];
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const FIXED_DATE = new Date("2026-09-09T00:00:00.000Z");

const PETITION = "CC-DC-CR-072B";
const WAIVER = "CC-DC-089";
const DECLARED_COMPONENT_DOCUMENTS = [PETITION, WAIVER];

const SOURCES = Object.freeze({
  [PETITION]: {
    sourceId: "official-form:CC-DC-CR-072B",
    path: "LegalEase Maryland/LegalEase Maryland forms /ccdccr072B.pdf",
    sha256: "3a61136ead74ffc9a09652edf0ad4a113538f3e172c0ddea4df618cb3c0a4469",
    revision: "CC-DC-CR-072B (Rev. 10/01/2025-2)", pageCount: 1
  },
  [WAIVER]: {
    sourceId: "official-form:CC-DC-089",
    path: "STATES/MD/02_PACKET_FORMS/MD__FORM__CC-DC-089__request-for-waiver-of-prepaid-costs__REV-2025-11__EN.pdf",
    sha256: "eab9b1eb34b36beee57cb4ea3334ec7f8a6d825e853b73c87724c65066069384",
    revision: "CC-DC-089 (Rev. 11/2025)", pageCount: 3
  }
});

const SIGNATURE_CLASS = "signature_or_date_participant_completion";
const ELECTION_CLASS = "participant_sworn_narrative_or_legal_election";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

/* ------------------------------------------------------------------ *
 * THE FEE, THE STOPS AND THE REQUIRED DOCUMENT ARE READ FROM THE
 * RECORD -- THEY ARE NOT TYPED HERE
 *
 * VF20 failed this family twice on participant-facing copy that no
 * completeness counter reads.
 *
 * FEE_AND_WAIVER. filing-instructions.md told the participant "Maryland charges
 * a filing fee for an expungement petition on a guilty disposition. This packet
 * does not state an amount, because no held source establishes one; ask the
 * clerk." That sentence is Missouri's, where it is TRUE, because MO.memo.json
 * says of that track "No fee figure is published on this track". Carried into
 * Maryland it asserts an absence the controlling record contradicts:
 * MD.memo.json's md_pardon_expungement track records rules.fees "$30
 * (CC-DC-CR-072B)." -- a figure keyed to this exact form -- and the same memo's
 * fee_waiver component is conditioned "Where the participant cannot pay the $30
 * filing fee." Telling a participant no source establishes the fee, when the
 * record we build from establishes it, is a false statement about our own
 * holdings, and it is the statement that decides whether they bring money.
 *
 * The figure is therefore printed FROM the record. What genuinely stays
 * unestablished stays unestablished, and is now said precisely rather than as a
 * blanket absence: the delivered petition prints no amount at all -- its only
 * fee text is "Filing Fees Are Not Refundable" across the top of page 1 -- so
 * the form is not evidence that $30 is current, and nothing here establishes
 * what any additional cost of the filing might be.
 *
 * SELF_HELP_STOP. The stops were a hand-written prose PARAPHRASE, the same
 * shape Delaware's repair found. The record declares three conditions and the
 * paraphrase carried two of them in substance and none verbatim; the missing
 * one -- "The State's Attorney objects." -- never appeared in either
 * instruction file in any form, so a participant was given the form's victim
 * notice but never told that a prosecutor's objection is a stop-and-get-a-lawyer
 * condition. That is exactly what a paraphrase does: it keeps what its author
 * thought of.
 *
 * REQUIRED_BEFORE_FILING. The pardon document was disclosed in substance
 * ("bring the pardon document with you") but the record's own name for it and
 * the place the record says to get it were not printed, so a participant who
 * does not have it was not told where to go. It is now derived too, which is
 * what makes the regression test able to check it at all.
 *
 * None of these is visible to the nine counters: they range over this family's
 * field-map rows, and all three defects are content -- present-but-false in the
 * fee's case, absent in the others. verify-packet-completeness.mjs returned
 * PASS_COMPLETE 32/146 with all nine zero while every one of them held.
 *
 * So all three are DERIVED from MD.memo.json at build time and the build
 * REFUSES if the record stops declaring them. MD.memo.json is hashed into
 * source-receipt.json as a composition source, so this text moves only when
 * that record moves, and
 * scripts/grade-a-packet-factory-24h/test-md-pardon-record-disclosures.mjs
 * asserts the binding survived into the delivered bytes.
 * ------------------------------------------------------------------ */
const MD_MEMO_PATH = "data/record-clearing/legal-design-intake/MD.memo.json";
const MD_TRACK_ID = "md_pardon_expungement";
const MD_MEMO_BYTES = fs.readFileSync(path.join(ROOT, MD_MEMO_PATH));
const MD_MEMO_TRACK = (() => {
  const memo = JSON.parse(MD_MEMO_BYTES.toString("utf8"));
  const track = (memo.tracks ?? []).find((entry) => entry.trackId === MD_TRACK_ID);
  if (!track) throw new Error(`MD_MEMO_TRACK_ABSENT: ${MD_TRACK_ID} is not in ${MD_MEMO_PATH}`);
  return track;
})();

const FEE_RULE = MD_MEMO_TRACK.rules?.fees;
const FEE_WAIVER_RULE = MD_MEMO_TRACK.rules?.feeWaiver;
const NOTICE_RULE = MD_MEMO_TRACK.rules?.notice;
const SELF_HELP_STOP_CONDITIONS = MD_MEMO_TRACK.selfHelpStopConditions ?? [];
const REQUIRED_BEFORE_FILING_DOCUMENTS = (MD_MEMO_TRACK.supportingDocuments ?? [])
  .filter((document) => document.requiredBeforeFiling === true);

if (!FEE_RULE) {
  throw new Error("MD_MEMO_STATES_NO_FEE: refusing to build fee copy with no record behind it. If the record "
    + "genuinely stops establishing a fee, this builder must be changed deliberately to say so, not silently.");
}
if (!FEE_WAIVER_RULE) throw new Error("MD_MEMO_STATES_NO_FEE_WAIVER_RULE");
if (!SELF_HELP_STOP_CONDITIONS.length) {
  throw new Error("MD_MEMO_DECLARES_NO_SELF_HELP_STOP_CONDITIONS: refusing to build a packet with no stop conditions");
}
if (!REQUIRED_BEFORE_FILING_DOCUMENTS.length) {
  throw new Error("MD_MEMO_DECLARES_NO_REQUIRED_BEFORE_FILING_DOCUMENT");
}
for (const document of REQUIRED_BEFORE_FILING_DOCUMENTS) {
  for (const field of ["name", "obtainedFrom"]) {
    if (!document[field]) {
      throw new Error(`MD_MEMO_REQUIRED_DOCUMENT_INCOMPLETE: "${document.name ?? "(unnamed)"}" has no ${field}`);
    }
  }
}

/* The petition's own fee text, quoted. Confirmed present in the source binary
 * and in both delivered fixtures; it is the only fee wording either form
 * prints, and it names no amount. */
const PETITION_PRINTED_FEE_TEXT = "Filing Fees Are Not Refundable";

const FEE_PARAGRAPH = [
  `The Maryland record for this route states the filing fee, in these words: "${FEE_RULE}" That is $30, keyed to`,
  "this form.",
  `The petition itself prints no amount - its only fee wording is "${PETITION_PRINTED_FEE_TEXT}" across the top`,
  "of page 1 - so the form is not evidence that this figure is current, and nothing held here establishes any",
  "other cost of the filing. Confirm the amount with the clerk before you pay, and take the fee with you.",
  `If you cannot prepay it, the record names the waiver to use: "${FEE_WAIVER_RULE}" That form is in this packet.`,
  "Complete the affidavit of income on CC-DC-089 in full, sign it, and file it with the petition."
].join("\n");

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "04/17/1991",
    "participant.street_address": "412 Walnut Street, Apartment 7",
    "participant.city_state_zip": "Towson, MD 21204",
    "participant.phone": "410-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "case.court_location": "Baltimore County-Towson (DC)",
    "case.case_number": "1A0012345",
    "case.arrest_date": "06/14/2015",
    "case.arresting_agency": "Baltimore County Police Department",
    "case.arrest_city": "Towson",
    "case.incident_line_1": "a reported retail theft at a store in",
    "case.incident_line_2": "Towson. No injury and no weapon was alleged in the charging document, and no property was recovered.",
    "case.offense_charged": "Theft, less than $100, Md. Code, Crim. Law sec. 7-104",
    "case.conviction_date": "11/03/2015",
    "case.pardon_date": "05/22/2021"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "12/31/1968",
    "participant.street_address": "1188 Upper Coastal Crossing Road, Apartment 14B",
    "participant.city_state_zip": "Upper Marlboro, MD 20772-4417",
    "participant.phone": "301-555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@example.org",
    "case.court_location": "Prince George's County-Upper Marlboro (DC)",
    "case.case_number": "0D00123456789012",
    "case.arrest_date": "01/02/2009",
    "case.arresting_agency": "Prince George's County Police Department, District III (Palmer Park)",
    "case.arrest_city": "Upper Marlboro",
    "case.incident_line_1": "an allegation of remaining on the",
    "case.incident_line_2": "premises of a closed business after being asked to leave. No injury, no weapon and no property loss was alleged.",
    "case.offense_charged": "Trespass on posted property, Md. Code, Crim. Law sec. 6-402, a misdemeanor",
    "case.conviction_date": "07/19/2010",
    "case.pardon_date": "09/30/2019"
  }
};

/* ------------------------------------------------------------------ *
 * CC-DC-CR-072B - the petition.
 *
 * The eight grounds of item 3, in the order they are printed, with the AcroForm
 * name each carries. The names are the source's own and several of them name the
 * line BELOW the box they belong to; the printed text is what the label states.
 * ------------------------------------------------------------------ */
const PARDON_GROUND = "one criminal act which is not a crime of violence as defined in Criminal Law Article  14101a and on or about";
const ITEM_THREE_GROUNDS = [
  ["the charge but the conduct on which the charge is based is no longer a crime",
    "Item 3: the charge/offense, but the conduct on which the charge/offense is based is no longer a crime"],
  ["the conviction was for sodomy and the conviction is not precluded from being expunged for any of the reasons listed in",
    "Item 3: the conviction was for sodomy or unnatural or perverted sexual practices, and the conviction is not precluded from being expunged for any of the reasons listed in sec. 10-105(a-1) of the Criminal Procedure Article"],
  ["a crime specified in Criminal Procedure Article  10105a9 Three 3 years have passed since the later of the conviction or",
    "Item 3: a crime specified in Criminal Procedure Article, sec. 10-105(a)(9). Three (3) years have passed since the later of the conviction or completion of the sentence(s). I am not now a defendant in any pending criminal action"],
  [PARDON_GROUND,
    "Item 3: one criminal act, which is not a crime of violence as defined in Criminal Law Article, sec. 14-101(a), and on or about the date shown I was granted a full and unconditional pardon by the Governor, with respect to that conviction. Not more than 10 years have passed since the Governor signed the pardon. I am not now a defendant in any pending criminal action"],
  ["a misdemeanor crime specified in Criminal Procedure Article  10110 Ten years have passed since the satisfactory completion of",
    "Item 3: a misdemeanor crime specified in Criminal Procedure Article, sec. 10-110. Five (5) years have passed since the completion of the sentence(s) imposed for all convictions for which expungement is requested"],
  ["a felony crime specified in Criminal Procedure Article  10110 Fifteen years have passed since the satisfactory completion of the",
    "Item 3: a felony crime specified in Criminal Procedure Article, sec. 10-110, a crime specified in Criminal Law Article sec. 3-203, or common law battery. Seven (7) years have passed since the completion of the sentence(s)"],
  ["a crime specified in Criminal Law Article  3203 common law battery or for an offense classified as a domestically related crime",
    "Item 3: first or second degree burglary or felony theft. Ten years have passed since the completion of the sentence(s) imposed for all convictions for which expungement is requested"],
  ["Check Box1",
    "Item 3: a domestically related crime under Criminal Procedure Article, sec. 6-233. Fifteen years have passed since the completion of the sentence(s) imposed for all convictions for which expungement is requested"]
];

const CHECK_ALL_THAT_APPLY_WHY =
  "item 3 says \"check all that apply, making sure that each statement is true and correct\". It is not a "
  + "select-one, so a second ground may also be true of this record, and only the person filing knows their own "
  + "record well enough to say. The packet marks the ground the route is built on and leaves the rest to them";

/*
 * FIX01, ROUTE_OPTIONS. WHY ITEM 1 IS NO LONGER ANSWERED.
 *
 * Item 1 prints "(Check one of the following boxes) On or about ___, I was
 * [ ] arrested, [ ] served with a summons, [ ] or served with a citation by an
 * officer of the ___". This build used to tick "arrested" on the stated basis
 * that "the held case fact is an arrest rather than a summons or a citation".
 * VF01 measured at 7d6453f51 that the tick reached the delivered bytes with
 * factId null and routeDetermined false, and that it was disclosed nowhere in
 * either guide, on a petition affirmed under the penalties of perjury.
 *
 * The controlling record settles it. legal-design-track-registry.json track
 * md_pardon_expungement lists NINE generationRequirements - the court and
 * county, the case number, the charges in the incident, the disposition of
 * each, pending charges, the pardon signature date, whether there was only one
 * criminal act, whether the offence was a crime of violence, and whether a fee
 * waiver is wanted. Not one of them asks how the case began, and the words
 * arrest, summons and citation do not occur anywhere in that track record. The
 * platform does not collect the fact, so it cannot know the answer, and a
 * fixture fact named `case.arrest_date` is a fixture's name for a date and not
 * a determination of the mode.
 *
 * A sworn election made from an inference is not cured by disclosing it. All
 * three boxes are therefore left for the person who signs, and the guide says
 * so. The date, the agency and the place stay written: the form's own sentence
 * puts each of those blanks after all three alternatives ("by an officer of
 * the ___"), so they assert nothing about which alternative is true. The label
 * this build gives the agency blank was corrected to match.
 */
const HOW_THE_CASE_BEGAN_WHY =
  "item 1 says \"check one of the following boxes\" and the answer is a fact about how your case began. The "
  + "Maryland record for this route does not ask how the case began - none of its nine screening questions "
  + "covers it - so the platform does not hold the answer and will not guess it on a petition you affirm "
  + "under the penalties of perjury. Tick the one that is true: arrested, served with a summons, or served "
  + "with a citation";

/*
 * FIX01, ROUTE_OPTIONS. WHY THE COURT BOX STAYS TICKED WHERE ITEM 1 DOES NOT.
 *
 * The two court boxes are a select-one, CIRCUIT COURT against DISTRICT COURT OF
 * MARYLAND, and unlike item 1 this one IS answered by a fact the record asks
 * for: legal-design-track-registry.json track md_pardon_expungement carries the
 * generationRequirement `courtAndCounty`, "Which court heard the case, and in
 * which county or Baltimore City?", marked required. The held answer is written
 * into the caption's own chooser, whose option list is the form's, and every
 * District Court option in that list carries the suffix "(DC)".
 *
 * So the election is proved from the held fact rather than inferred: this
 * refuses to build unless the held court location actually carries that suffix,
 * and the basis it returns names the fact and the suffix. A held location that
 * is not a District Court location stops the build instead of silently ticking
 * the wrong member of a select-one on a sworn petition.
 */
const DISTRICT_COURT_OPTION_SUFFIX = "(DC)";
function districtCourtElectionBasis(facts) {
  const location = String(facts["case.court_location"] ?? "");
  if (!location.endsWith(DISTRICT_COURT_OPTION_SUFFIX)) {
    throw new Error("the held court location is not a District Court option, so the select-one between CIRCUIT "
      + `COURT and DISTRICT COURT OF MARYLAND is not determined by the held fact: ${JSON.stringify(location)}`);
  }
  return "the held case fact case.court_location is " + JSON.stringify(location) + ", an option of the caption's "
    + "own chooser on this form whose \"" + DISTRICT_COURT_OPTION_SUFFIX + "\" suffix marks it a District Court "
    + "location. The record asks for this fact by name (generationRequirement courtAndCounty, required)";
}

const ATTORNEY_REASON = "attorney-only field; no representation fact is held for this participant";
const ATTORNEY_WHY = "this packet is drafted for a self-represented petitioner and never populates an attorney block";

function petitionSpec(facts) {
  const w = (name, label, factId, size = 9, extra = {}) =>
    ({ name, label, factId, value: facts[factId], size, ...extra });
  const courtBasis = districtCourtElectionBasis(facts);
  const writes = [
    { name: "Check Box33", kind: "checkbox", label: "DISTRICT COURT OF MARYLAND FOR the city or county shown",
      routeDetermined: true, factId: "case.court_location", basis: courtBasis },
    { name: "Court's City/County", kind: "dropdown", label: "Court's City/County",
      value: facts["case.court_location"], factId: "case.court_location",
      basis: "the court location held for the case this petition is filed under" },
    w("Case No", "Case No.", "case.case_number", 10),
    w("Text24", "Defendant's name in the caption", "participant.full_legal_name", 9),
    w("Text25", "Defendant's date of birth", "participant.date_of_birth", 9),
    w("Text30", "Item 1: date of arrest, summons, or citation", "case.arrest_date", 9),
    w("Law Enforcement Agency",
      "Item 1: the law enforcement agency whose officer arrested me, served the summons, or served the citation",
      "case.arresting_agency", 9),
    w("Maryland as a result of the following incident", "Item 1: the city or town in Maryland where it happened", "case.arrest_city", 9),
    w("Text26", "Item 1: description of the incident, first line", "case.incident_line_1", 8),
    w("2 I was charged with the offense of", "Item 1: description of the incident, second line", "case.incident_line_2", 8),
    w("I was convicted found guilty of check all that apply making sure that the statement is true and",
      "Item 2: the offense I was charged with", "case.offense_charged", 8),
    w("Text27", "Item 3: date of conviction", "case.conviction_date", 9),
    { name: PARDON_GROUND, kind: "checkbox", label: ITEM_THREE_GROUNDS[3][1], routeDetermined: true,
      basis: "this family is the pardoned-conviction route under Criminal Procedure Article sec. 10-105(a)(8). "
        + "The route determines which ground of item 3 the petition proceeds on, so the packet states it" },
    w("Text35", "Item 3: the date the Governor granted the full and unconditional pardon", "case.pardon_date", 8),
    w("Printed Name_2", "Defendant's printed name", "participant.full_legal_name", 9),
    w("Address_2", "Defendant's address", "participant.street_address", 8),
    w("City State Zip_2", "Defendant's city, state and ZIP", "participant.city_state_zip", 8),
    w("Telephone_2", "Defendant's telephone", "participant.phone", 8),
    w("Email_2", "Defendant's e-mail", "participant.email", 6.5)
  ];

  const blanks = [
    { name: "Check Box32", isSelectionControl: true, label: "CIRCUIT COURT for the city or county shown",
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable:
        "the two court boxes are a select-one and the court of conviction held for this case is a District Court "
        + "location, which the packet states",
      role: "participant", reason: "the packet states the other member of this select-one" },
    { name: "Court's Address", label: "Court address",
      requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
      supply: "the street address of that court, which is printed on your own case paperwork",
      reason: "the participant supplies this before filing" },
    { name: "Court's Telephone Number", label: "Court telephone number",
      requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
      supply: "the telephone number of that court, which is printed on your own case paperwork",
      reason: "the participant supplies this before filing" },
    { name: "Tracking", label: "Tracking number",
      requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
      supply: "the tracking number from your own case record, if your record shows one",
      reason: "the participant supplies this before filing" },
    { name: "Check Box36", isSelectionControl: true, label: "Item 1: I was arrested",
      reason: `a participant election the route does not determine: ${HOW_THE_CASE_BEGAN_WHY}`,
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: "tick this one if you were arrested. See \"How your case began\" above" },
    { name: "Check Box37", isSelectionControl: true, label: "Item 1: I was served with a summons",
      reason: `a participant election the route does not determine: ${HOW_THE_CASE_BEGAN_WHY}`,
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: "tick this one if you were served with a summons. See \"How your case began\" above" },
    { name: "Check Box38", isSelectionControl: true, label: "Item 1: I was served with a citation",
      reason: `a participant election the route does not determine: ${HOW_THE_CASE_BEGAN_WHY}`,
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: "tick this one if you were served with a citation. See \"How your case began\" above" },
    { name: "The case began in one court and was transferred to another court other than juvenile court Note This petition must be filed in",
      isSelectionControl: true,
      label: "Item 4: the case began in one court and was transferred to another court other than juvenile court",
      reason: "a participant election the route does not determine: whether this case was transferred between "
        + "courts is a fact of the participant's own docket, and it decides which court the petition must be filed in",
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: "the platform does not hold the transfer history of the case, and the answer changes where the petition is filed" },
    { name: "The case was appealed to a court exercising appellate jurisdiction Note This petition must be filed in the appellate court",
      isSelectionControl: true,
      label: "Item 5: the case was appealed to a court exercising appellate jurisdiction",
      reason: "a participant election the route does not determine: whether this case was appealed is a fact of the "
        + "participant's own docket, and it decides which court the petition must be filed in",
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: "the platform does not hold the appellate history of the case, and the answer changes where the petition is filed" },
    { name: "Text29", label: "Signature of Defendant",
      reason: "signature or date field; never prefilled by this build", refusalClass: SIGNATURE_CLASS,
      role: "protected", why: "the petitioner affirms the petition under the penalties of perjury by signing it" },
    { name: "Date_4", label: "Date beside the signature of Defendant",
      reason: "signature or date field; never prefilled by this build", refusalClass: SIGNATURE_CLASS,
      role: "protected", why: "the date beside a signature is written when the document is signed, and not before" },
    { name: "Fax_2", label: "Defendant's fax number",
      reason: "optional participant-authored content; the platform does not invent it", role: "participant",
      why: "the form offers fax as an alternative contact and the packet holds none" },
    { name: "Text28", label: "Attorney's signature", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "CPF ID No", label: "Attorney Number (CPF ID)", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "Date_3", label: "Date beside the attorney's signature", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "Printed Name", label: "Attorney's printed name", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "Address", label: "Attorney's address", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "City State Zip", label: "Attorney's city, state and ZIP", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "Telephone", label: "Attorney's telephone", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "Email", label: "Attorney's e-mail", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "Fax", label: "Attorney's fax", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY }
  ];
  for (const [name, label] of ITEM_THREE_GROUNDS) {
    if (name === PARDON_GROUND) continue;
    blanks.push({
      name, label, isSelectionControl: true,
      reason: `a participant election the route does not determine: ${CHECK_ALL_THAT_APPLY_WHY}`,
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: CHECK_ALL_THAT_APPLY_WHY
    });
  }
  return { documentId: PETITION, writes, blanks, clearedSourceDefaults: [] };
}

/* ------------------------------------------------------------------ *
 * CC-DC-089 - the fee waiver.
 *
 * Nothing on the affidavit of income is a fact this platform holds. Every
 * income, property and debt line is carried as the participant's own, and every
 * one of them is disclosed. Page 3 is the court's order and every field on it
 * is refused as court-owned.
 * ------------------------------------------------------------------ */
const INCOME_LINES = [
  ["Wages check box", "Wages Amount", "Wages"],
  ["Commissions/Bonuses check box", "Commissions Amount", "Commissions or bonuses"],
  ["Social Security/SSI check box", "Social Security/SSI Amount", "Social Security or SSI"],
  ["Retirement Income check box", "Retirement Income", "Retirement income"],
  ["Unemployment Insurance check box", "Unemployment Insurance Amount", "Unemployment insurance"],
  ["Temporary Cash Assistance check box", "Temporary Cash Assistance Amount", "Temporary cash assistance"],
  ["Alimony Spousal Support check box", "Alimony/Spousal Support Amount", "Alimony or spousal support"],
  ["Rent Received From Tenants check box", "Rent From Tenants Amount", "Rent received from tenants"],
  ["Other Income check box", "Other Amount", "Any other income, not counting food stamps or SNAP"]
];
const PROPERTY_LINES = [
  ["Real Estate check box", "Value of real estate other than princical home", "Real estate other than your principal home", "Value"],
  ["Other Vehicles check box", "Value of other vehicles", "Other vehicles including boats", "Value"],
  ["Bank Accounts check box", "Balance of Accounts", "Bank accounts", "Balance"],
  ["Stocks or Other Securities check box", "Value of stocks", "Stocks or other securities", "Value"],
  ["Other Property check box", "Value of Other Property", "Other property", "Value"]
];
const DEBT_LINES = [
  ["Credit Card check box", "Name of Credit Card", "Credit Card Amount Owed", "Monthly Payment for Credit Card", "Credit card"],
  ["Car Loan check box", "Name of Car Loan", "Car Loan Amount Owed", "Monthly Payment for Car Loan", "Car loan"],
  ["Other Debt", "Describe Debt", "Debt Amount Owed", "Monthly Payment for Debt", "Other debt"]
];
const PERIOD_BOXES = [
  ["Total Gross per Week check box", "Item 2: total gross household income is stated per WEEK"],
  ["Total Gross per Month", "Item 2: total gross household income is stated per MONTH"],
  ["Total Gross per Year check box", "Item 2: total gross household income is stated per YEAR"],
  ["Itemized Gross Income per Week check box (list below)", "Item 3: the itemized income sources are stated per WEEK"],
  ["Itemized Gross Income per Month check box (list below)", "Item 3: the itemized income sources are stated per MONTH"],
  ["Itemized Gross Income per Year check box (list below)", "Item 3: the itemized income sources are stated per YEAR"]
];
const COURT_ORDER_FIELDS = [
  ["Name of Party for Court Order", "For court use only: the name of the party in the court's order"],
  ["Meets Financial Eligibility check box", "For court use only: the court finds the party meets financial eligibility"],
  ["Does Not Meet Financial Eligibility check box", "For court use only: the court finds the party does not meet financial eligibility"],
  ["Unable to Pay due to Poverty check box", "For court use only: the court finds the party unable to pay by reason of poverty"],
  ["Not Unable to Pay due Poverty check box", "For court use only: the court finds the party not unable to pay by reason of poverty"],
  ["Not Frivolous check box", "For court use only: the court finds the claim not frivolous"],
  ["Frivolous check box", "For court use only: the court finds the claim frivolous"],
  ["Other Findings check box", "For court use only: the court makes other findings"],
  ["Description of Other Findings Line 1", "For court use only: the court's other findings, first line"],
  ["Description of Other Findings Line 2", "For court use only: the court's other findings, second line"],
  ["Granted check box", "For court use only: the request is granted"],
  ["Granted In Part check box", "For court use only: the request is granted in part"],
  ["Ordered Fee to Prepay", "For court use only: the amount the court orders prepaid"],
  ["Date to Prepay", "For court use only: the date by which the ordered amount must be prepaid"],
  ["Denied check box", "For court use only: the request is denied"],
  ["Judge Signature", "Signature of Judge"],
  ["Date of Judge Signature", "Date beside the signature of Judge"],
  ["Judge ID Number", "Judge ID number"]
];
const SELF_REPORTED_WHY =
  "the platform holds no income, property or debt fact about any participant, and an affidavit of income sworn "
  + "under the penalties of perjury is the filer's own statement about their own household";

function waiverSpec(facts) {
  const w = (name, label, factId, size = 9) => ({ name, label, factId, value: facts[factId], size });
  const courtBasis = districtCourtElectionBasis(facts);
  const writes = [
    { name: "District Court check box", kind: "checkbox", label: "DISTRICT COURT OF MARYLAND FOR the city or county shown",
      routeDetermined: true, factId: "case.court_location",
      basis: `${courtBasis}, and this waiver names the same court the petition it accompanies is filed in` },
    { name: "Court's City/County", kind: "dropdown", label: "Court's City/County",
      value: facts["case.court_location"], factId: "case.court_location",
      basis: "the same court location the petition states" },
    w("Case Number", "Case No.", "case.case_number", 9),
    { name: "Petitioner/Plaintiff Full Name", label: "Petitioner/Plaintiff in the matter",
      value: "State of Maryland", factId: "route.criminal_case_plaintiff", size: 9,
      basis: "the underlying criminal case this petition is filed in is captioned STATE OF MARYLAND vs. the defendant, "
        + "which is the caption the petition itself carries" },
    w("Respondent/Defendant Full Name", "Respondent/Defendant in the matter", "participant.full_legal_name", 8),
    w("Name of Party for Request", "Name of party making this request", "participant.full_legal_name", 8),
    { name: "Request a Waiver of the Prepaid Costs check box", kind: "checkbox",
      label: "For these reasons: I request a waiver of the prepaid costs", routeDetermined: true,
      basis: "this component IS the request for a waiver of prepaid costs. A waiver form that does not request a "
        + "waiver asks the court for nothing" },
    w("Printed Full Name of Party", "Party Name", "participant.full_legal_name", 9),
    w("Street Address of Party", "Party address", "participant.street_address", 8),
    w("City, State, and Zip Code of Party Address", "Party city, state and ZIP", "participant.city_state_zip", 8),
    w("Telephone of Party/Fax of Party", "Party telephone or fax", "participant.phone", 8),
    w("E-mail Address of Party", "Party e-mail", "participant.email", 8)
  ];

  const rbf = (name, label, supply) => ({
    name, label, requiredBeforeFiling: true, disposition: "REQUIRED_BEFORE_FILING", role: "participant",
    supply, reason: "the participant supplies this before filing"
  });
  const election = (name, label) => ({
    name, label, isSelectionControl: true,
    reason: `a participant election the route does not determine: ${SELF_REPORTED_WHY}`,
    refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
    why: SELF_REPORTED_WHY
  });
  /*
   * FIX01, KNOWN_PREFILLS. WHAT ON PAGE 3 IS THE COURT'S, STATED EXACTLY.
   *
   * This reason used to read "page 3 of this form is the court's order on the
   * request and every field on it belongs to the court", and the field map
   * repeated it 18 times while the packet WROTE FIVE VALUES on that same page:
   * the DISTRICT COURT OF MARYLAND caption box ticked, and the court's city or
   * county, the case number, the petitioner and the respondent printed. VF01
   * read all five off the rendered page at 7d6453f51. The refusals array even
   * contradicted itself in place - its first page-3 entry refuses the CIRCUIT
   * COURT box because "the packet states the other member of this select-one",
   * which is the very tick the blanket sentence says does not exist.
   *
   * The caption is not the order. It identifies the court that will sign and
   * the case it will be signed in, it is the same caption the petition carries,
   * and filling it is the filer's job on every Maryland district-court filing.
   * The ORDER is the court's: the findings, the granted / granted-in-part /
   * denied election, the amount and date ordered, and the judge's signature and
   * ID. So the geometry was right and the sentence was wrong, and it is the
   * sentence that changed - here, in build-findings.json, and in the guide.
   */
  const courtOwned = (name, label) => ({
    name, label, reason: "court, clerk, prosecutor, agency, or hearing field",
    refusalClass: "court_prosecutor_clerk_or_agency_owned", role: "court",
    why: "this is a field of the ORDER on page 3 of this form, which the judge completes and signs. The caption "
      + "at the head of that page - the court, its city or county, the case number and the two parties - is not "
      + "part of the order: it identifies the case, it is the same caption the petition carries, and this packet "
      + "fills it"
  });

  const blanks = [
    { name: "Circuit Court check box", isSelectionControl: true, label: "CIRCUIT COURT for the city or county shown",
      disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      routeConditionThatMakesItInapplicable:
        "the two court boxes are a select-one and this waiver names the same District Court location the petition it "
        + "accompanies is filed in",
      role: "participant", reason: "the packet states the other member of this select-one" },
    rbf("Court Full Address", "Court address", "the street address of that court, which is printed on your own case paperwork"),
    rbf("Court Telephone Number", "Court telephone number", "the telephone number of that court, which is printed on your own case paperwork"),
    rbf("Total Number of Family Members",
      "Item 1: the number of family members living in my household, including myself",
      "the number of people living in your household, not counting renters or temporary guests"),
    rbf("Total Gross Household Income",
      "Item 2: the total gross household income before taxes",
      "the total income before taxes earned by everyone in your household, and tick whether the figure is weekly, monthly or yearly"),
    { name: "None", isSelectionControl: true, label: "Item 4: I own NONE of the property listed",
      reason: `a participant election the route does not determine: ${SELF_REPORTED_WHY}`,
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: SELF_REPORTED_WHY },
    { name: "No Debt check box", isSelectionControl: true, label: "Item 5: I owe NONE of the debts listed",
      reason: `a participant election the route does not determine: ${SELF_REPORTED_WHY}`,
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: SELF_REPORTED_WHY },
    rbf("Describe Other Property", "Item 4: description of the other property",
      "a description of any other property you own, if you ticked that line"),
    rbf("Describe Line 1", "Item 6: other information showing my inability to prepay, first line",
      "anything else you want the court to know about why you cannot prepay the costs"),
    rbf("Describe Line 2", "Item 6: other information showing my inability to prepay, second line",
      "the second line of that explanation, if you need it"),
    rbf("Describe Line 3", "Item 6: other information showing my inability to prepay, third line",
      "the third line of that explanation, if you need it"),
    { name: "No Anticipated Material Changes check box", isSelectionControl: true,
      label: "For these reasons: I do not anticipate a material change in the information provided and request a final waiver of open costs at the conclusion of the action",
      reason: "a participant election the route does not determine: whether the filer expects their circumstances to "
        + "change, and whether they want a final waiver of open costs as well as a prepaid-costs waiver, is theirs to decide",
      refusalClass: ELECTION_CLASS, disposition: "PARTICIPANT_ELECTION_GENUINE", role: "participant",
      why: "the packet does not predict a participant's future circumstances, and asking for a final waiver of open costs is a separate request" },
    { name: "Party Signature", label: "Party Signature",
      reason: "signature or date field; never prefilled by this build", refusalClass: SIGNATURE_CLASS,
      role: "protected", why: "the party affirms the affidavit of income under the penalties of perjury by signing it" },
    { name: "Date of Party Signature", label: "Date beside the Party Signature",
      reason: "signature or date field; never prefilled by this build", refusalClass: SIGNATURE_CLASS,
      role: "protected", why: "the date beside a signature is written when the document is signed, and not before" },
    { name: "Attorney Full Name", label: "Attorney's name in the attorney certification", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "On Behalf of Party Full Name", label: "Attorney certification: on behalf of which party", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "Attorney Signature", label: "Attorney Signature", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "CPF ID No", label: "Attorney Number (CPF ID)", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "Telephone/Fax for Attorney", label: "Attorney's telephone or fax", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "E-mail for Attorney", label: "Attorney's e-mail", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "Street Address of Attorney", label: "Attorney's address", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "Date of Attorney Signature", label: "Date beside the Attorney Signature", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY },
    { name: "City, State, and Zip of Attorney Address", label: "Attorney's city, state and ZIP", reason: ATTORNEY_REASON, role: "attorney", why: ATTORNEY_WHY }
  ];
  for (const [box, label] of PERIOD_BOXES) blanks.push(election(box, label));
  for (const [box, amount, name] of INCOME_LINES) {
    blanks.push(election(box, `Item 3 income source: ${name}`));
    blanks.push(rbf(amount, `Item 3 amount for ${name}`,
      `the amount of your household's ${name.toLowerCase()} before taxes, for the period you ticked`));
  }
  for (const [box, amount, name, measure] of PROPERTY_LINES) {
    blanks.push(election(box, `Item 4 property: ${name}`));
    blanks.push(rbf(amount, `Item 4 ${measure.toLowerCase()} of ${name.toLowerCase()}`,
      `the ${measure.toLowerCase()} of your ${name.toLowerCase()}, if you ticked that line`));
  }
  for (const [box, who, owed, monthly, name] of DEBT_LINES) {
    blanks.push(election(box, `Item 5 debt: ${name}`));
    blanks.push(rbf(who, `Item 5 ${name.toLowerCase()}: who it is owed to`, `who your ${name.toLowerCase()} is owed to, if you ticked that line`));
    blanks.push(rbf(owed, `Item 5 ${name.toLowerCase()}: amount owed`, `the amount you owe on that ${name.toLowerCase()}`));
    blanks.push(rbf(monthly, `Item 5 ${name.toLowerCase()}: monthly payment`, `the monthly payment you make on that ${name.toLowerCase()}`));
  }
  for (const [name, label] of COURT_ORDER_FIELDS) blanks.push(courtOwned(name, label));
  return { documentId: WAIVER, writes, blanks, clearedSourceDefaults: [] };
}

/* ---- source binding ------------------------------------------------------ */
function resolveSources() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const resolved = {};
  const failures = [];
  for (const [key, want] of Object.entries(SOURCES)) {
    const entry = (index.entries ?? []).find((row) => row.path === want.path);
    if (!entry) { failures.push({ sourceIdentity: want.sourceId, why: `no committed index entry at ${want.path}` }); continue; }
    if (entry.sha256 !== want.sha256) {
      failures.push({ sourceIdentity: want.sourceId, why: `the committed index pins ${entry.sha256}; this build binds ${want.sha256}` });
      continue;
    }
    const absolute = resolver.resolve(entry);
    if (!absolute || !fs.existsSync(absolute)) {
      failures.push({ sourceIdentity: want.sourceId, why: `the custody holding ${want.path} is not mounted here` });
      continue;
    }
    const bytes = fs.readFileSync(absolute);
    const digest = sha256(bytes);
    if (digest !== want.sha256) {
      failures.push({ sourceIdentity: want.sourceId, why: `SHA-256 drift: the corpus binary hashes ${digest}` });
      continue;
    }
    resolved[key] = {
      ...want, bytes, byteLength: bytes.length, custody: entry.custody,
      indexFormNumber: entry.formNumber, indexPageCount: entry.pageCount, indexAcroFieldCount: entry.acroFieldCount
    };
  }
  return { resolved, failures };
}

const inflate = (buf) => { try { return zlib.inflateSync(buf); } catch { return buf; } };

function contentStreamsOfPage(pdf, page) {
  const contents = page.node.Contents();
  const list = contents && contents.constructor.name === "PDFArray"
    ? contents.asArray().map((ref) => pdf.context.lookup(ref))
    : contents ? [contents] : [];
  return list.map((stream) => inflate(Buffer.from(stream.getContents())).toString("latin1"));
}

async function pageTexts(pdf) {
  const out = [];
  for (const page of pdf.getPages()) {
    const joined = contentStreamsOfPage(pdf, page).join("\n");
    let text = "";
    for (const token of joined.match(/\((?:[^()\\]|\\.)*\)|<[0-9A-Fa-f\s]{2,}>/g) ?? []) {
      text += token.startsWith("(")
        ? token.slice(1, -1).replace(/\\([()\\])/g, "$1")
        : Buffer.from(token.slice(1, -1).replace(/\s+/g, ""), "hex").toString("latin1");
    }
    out.push(text);
  }
  return out;
}

function normalizeRect(rect) {
  const x0 = Math.min(rect.x, rect.x + rect.width);
  const y0 = Math.min(rect.y, rect.y + rect.height);
  return {
    x: Number(x0.toFixed(3)), y: Number(y0.toFixed(3)),
    width: Number(Math.abs(rect.width).toFixed(3)), height: Number(Math.abs(rect.height).toFixed(3)),
    rawY: Number(rect.y.toFixed(3)), rawX: Number(rect.x.toFixed(3)),
    malformedInSource: rect.width < 0 || rect.height < 0
  };
}

function widgetPageIndex(pdf, widget) {
  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i += 1) {
    const annots = pages[i].node.Annots();
    if (!annots) continue;
    for (const ref of annots.asArray()) {
      if (pdf.context.lookup(ref) === widget.dict) return i;
    }
  }
  return -1;
}

/*
 * A STRING IN THE BYTES IS NOT A VALUE ON THE PAGE.
 *
 * A value written at a size that does not fit its widget is clipped by the
 * appearance's own clip path, and a proof that reads the string back out of the
 * stream sees the whole string while the page shows two thirds of it. Nebraska's
 * boundary fixture found this: a charge line ended "a Class IV felo" on the
 * paper and "a Class IV felony" in the bytes.
 *
 * So a size is FITTED before the value is set, measured with the same standard
 * Helvetica pdf-lib embeds when it regenerates the appearance, and the proof
 * measures every drawn run against its own box afterwards.
 */
const USABLE_PADDING_PT = 3;
const LINE_HEIGHT_FACTOR = 1.16;
const MIN_READABLE_PT = 5.5;

function fitValue(font, text, rect, requested, multiline) {
  const width = Math.max(1, rect.width - USABLE_PADDING_PT);
  const height = Math.max(1, rect.height - 2);
  let size = requested;
  const linesAt = (pt) => {
    if (!multiline) return [text];
    const lines = [];
    for (const paragraph of String(text).split("\n")) {
      let current = "";
      for (const word of paragraph.split(/\s+/)) {
        const next = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(next, pt) <= width || current === "") current = next;
        else { lines.push(current); current = word; }
      }
      lines.push(current);
    }
    return lines;
  };
  while (size > MIN_READABLE_PT) {
    const lines = linesAt(size);
    const widest = Math.max(...lines.map((line) => font.widthOfTextAtSize(line, size)));
    if (widest <= width && lines.length * size * LINE_HEIGHT_FACTOR <= height) break;
    size -= 0.25;
  }
  const lines = linesAt(size);
  const widest = Math.max(...lines.map((line) => font.widthOfTextAtSize(line, size)));
  return {
    size: Number(size.toFixed(2)),
    fits: widest <= width && lines.length * size * LINE_HEIGHT_FACTOR <= height,
    lines: lines.length, widestLinePt: Number(widest.toFixed(3)), usableWidthPt: Number(width.toFixed(3))
  };
}

/*
 * FLATTEN WITHOUT DELETING ANYTHING.
 *
 * pdf-lib's own form.flatten() ends each field with removeField(), which calls
 * context.delete() on the field's objects. The writer then emits an xref table
 * with entries for object numbers that no longer exist, and any reference left
 * pointing at one of them is dangling: copyPages reserves a slot for it and
 * writes nothing there. Poppler reported "Invalid XRef entry 93" on the first
 * Maryland artifact and had to reconstruct the table before it could draw a
 * page - on a document a court is meant to accept.
 *
 * This does the same drawing pdf-lib does, operator for operator, and then
 * DETACHES rather than deletes: the widget comes off the page's /Annots, the
 * field comes off the AcroForm's /Fields, and the AcroForm comes off the
 * catalog. Nothing is removed from the object table, so nothing can dangle, and
 * the orphans are unreachable from any page - so copyPages never carries them
 * into the assembled artifact at all.
 */
function detachAnnotation(pdf, page, dict) {
  const annots = page.node.Annots();
  if (!annots) return;
  const kept = annots.asArray().filter((ref) => pdf.context.lookup(ref) !== dict);
  if (kept.length !== annots.size()) page.node.set(PDFName.of("Annots"), pdf.context.obj(kept));
}

function flattenWithoutDeleting(pdf, form, writtenFields = new Set()) {
  /*
   * FIX01, CLIPPING_AND_OVERLAP. A BORDER THE OFFICIAL FORM DOES NOT PRINT.
   *
   * updateFieldAppearances() below regenerates an appearance for any check-box
   * or radio widget whose current /AS state has no entry in /AP /N, using
   * pdf-lib's default provider -- which paints a stroked square the size of the
   * widget /Rect. A form that ships only an on-state appearance and leaves the
   * widget at /Off has no /Off stream, so every unticked box on it acquires a
   * square, and the flatten below stamps that square onto the filing. Under
   * ISO 32000-1 12.5.5 a conforming viewer paints nothing at such a widget, so
   * the square is ink this build ADDS rather than ink the issuer authored.
   *
   * VF20 measured it on this family at 3687291a6: 50 refused widgets, a
   * directional 150 dpi diff against each page's own source page counting only
   * darker pixels, and a 300 dpi look. It is not caught by any of the nine
   * counters, because the counters read glyphs and this defect draws no glyph.
   *
   * suppressSynthesizedSelectionAppearances installs an EMPTY appearance for
   * the missing state, so needsAppearancesUpdate() is false and pdf-lib
   * regenerates nothing. A widget that ships its own /Off appearance is
   * untouched, and so is a box this run actually ticked -- hence writtenFields.
   * This is the same helper, called the same way and in the same position, that
   * the shared finalizer runs for its own callers behind
   * `suppressSynthesizedAppearances`; it is imported rather than reimplemented
   * so that this family and the finalizer's families cannot drift apart.
   */
  const synthesisSuppressed = suppressSynthesizedSelectionAppearances(pdf, form, writtenFields);
  form.updateFieldAppearances();
  const fields = form.getFields();
  for (const field of fields) {
    for (const widget of field.acroField.getWidgets()) {
      const page = form.findWidgetPage(widget);
      const appearanceRef = form.findWidgetAppearanceRef(field, widget);
      const xObjectKey = page.node.newXObject("FlatWidget", appearanceRef);
      const rectangle = widget.getRectangle();
      const operators = [
        pushGraphicsState(),
        translate(rectangle.x, rectangle.y),
        ...rotateInPlace({ ...rectangle, rotation: 0 }),
        drawObject(xObjectKey),
        popGraphicsState()
      ].filter(Boolean);
      page.pushOperators(...operators);
      detachAnnotation(pdf, page, widget.dict);
    }
    form.acroForm.removeField(field.acroField);
  }
  pdf.catalog.delete(PDFName.of("AcroForm"));
  return synthesisSuppressed;
}

async function fillDocument(sourceBytes, spec) {
  const pdf = await PDFDocument.load(sourceBytes);
  const form = pdf.getForm();
  const measuringFont = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  const unfittable = [];
  const drawn = [];
  const geometry = new Map();
  /* The source's own "Off" appearance for a checkbox, captured before anything
   * is marked, so the byte proof can compare the flattened appearance against
   * it instead of assuming a mark is always a glyph. */
  const offAppearanceOf = (widget) => {
    try {
      const ap = pdf.context.lookup(widget.dict.get(PDFName.of("AP")));
      const normal = ap && pdf.context.lookup(ap.get(PDFName.of("N")));
      if (!normal || typeof normal.get !== "function") return null;
      const off = pdf.context.lookup(normal.get(PDFName.of("Off")));
      if (!(off instanceof PDFRawStream)) return null;
      return inflate(Buffer.from(off.contents)).toString("latin1");
    } catch { return null; }
  };
  /*
   * ONE FIELD, SEVERAL WIDGETS.
   *
   * A caption field repeated on every page of a form is ONE AcroForm field with
   * one widget per page, and setting it once puts ink on all of them. A proof
   * that recorded only the first widget counted the ink on the others as
   * unexplained marks and would have failed a correctly filled form for a defect
   * it did not have. Every widget is recorded, and every one is proved.
   */
  const record = (name) => {
    const field = form.getField(name);
    const widgets = field.acroField.getWidgets();
    const placements = widgets.map((widget) => {
      const rect = normalizeRect(widget.getRectangle());
      const page = widgetPageIndex(pdf, widget) + 1;
      assert.ok(page > 0, `a widget of ${name} is on no page of ${spec.documentId}`);
      return { rect, page };
    });
    assert.ok(placements.length > 0, `${spec.documentId}:${name} has no widget`);
    geometry.set(name, placements);
    return { field, widgets, placements };
  };
  const attach = (row, placements) => {
    row.rect = placements[0].rect;
    row.page = placements[0].page;
    row.widgetCount = placements.length;
    row.placements = placements.map((pl) => ({ page: pl.page, rect: pl.rect }));
  };
  for (const row of spec.writes) {
    const { field, widgets, placements } = record(row.name);
    attach(row, placements);
    if (row.kind === "checkbox") {
      const offs = widgets.map((widget) => offAppearanceOf(widget));
      field.check();
      placements.forEach((pl, i) => drawn.push({ ...row, rect: pl.rect, page: pl.page, widgetIndex: i, text: "✓", offAppearance: offs[i] }));
      continue;
    }
    const value = String(row.value ?? "");
    assert.ok(value.length > 0, `no fixture value for ${spec.documentId}:${row.name}`);
    if (row.kind === "dropdown") {
      field.select(value);
      placements.forEach((pl, i) => drawn.push({ ...row, rect: pl.rect, page: pl.page, widgetIndex: i, text: value }));
      continue;
    }
    if (row.multiline) field.enableMultiline();
    const narrowest = placements.reduce((a, b) => (a.rect.width <= b.rect.width ? a : b)).rect;
    const fit = fitValue(measuringFont, value, narrowest, row.size ?? 9, row.multiline === true);
    if (!fit.fits) unfittable.push({ field: `${spec.documentId}:${row.name}`, value, fit, rect: narrowest });
    field.setText(value);
    field.setFontSize(fit.size);
    row.fittedFontSize = fit.size;
    placements.forEach((pl, i) => drawn.push({ ...row, rect: pl.rect, page: pl.page, widgetIndex: i, text: value, fontSize: fit.size, fit }));
  }
  assert.equal(unfittable.length, 0,
    `${unfittable.length} value(s) do not fit their own widget even at ${MIN_READABLE_PT}pt: ${JSON.stringify(unfittable).slice(0, 1200)}`);
  for (const row of spec.blanks) {
    if (row.printedSlot) continue;
    const { placements } = record(row.name);
    attach(row, placements);
  }
  /*
   * Values the SOURCE carries, cleared rather than delivered.
   *
   * A chooser prompt like "(Enter the county name)" is a field default, not
   * printed page text, and a packet that leaves it in place delivers a filed
   * document with an instruction to itself printed in the caption. Every one
   * cleared here is declared in the field map and in build-findings.json, so
   * nothing is removed from a participant's document silently.
   */
  const cleared = [];
  for (const row of spec.clearedSourceDefaults ?? []) {
    const { field, placements } = record(row.name);
    const before = typeof field.getText === "function" ? field.getText() : null;
    field.setText("");
    cleared.push({ ...row, rect: placements[0].rect, page: placements[0].page, sourceCarriedValue: before ?? null });
  }
  /*
   * VIEWER CONTROLS ARE NOT FILING CONTENT.
   *
   * "Reset", "Clear Form", "Lock & Save Form" and "Top of Page" are push buttons
   * a reader clicks on screen. Flattening draws their captions onto the page, so
   * a packet that flattens without removing them delivers a filed document with
   * a picture of a Reset button printed on it - ten glyphs of ink nobody asked
   * for, on two Maryland forms, which is how this was found. Every push button
   * is removed before flattening and every one is recorded.
   */
  const viewerControlsRemoved = [];
  for (const field of form.getFields()) {
    if (!(field instanceof PDFButton)) continue;
    const name = field.getName();
    const widgets = field.acroField.getWidgets();
    const pages = widgets.map((widget) => widgetPageIndex(pdf, widget) + 1);
    /*
     * Detached, not deleted.
     *
     * pdf-lib's form.removeField() calls context.delete() on the field's own
     * objects, and the writer then emits an xref table with entries for object
     * numbers that no longer exist: poppler reported "Invalid XRef entry 93" on
     * the first Maryland artifact built that way and had to reconstruct the
     * table. The widget is taken off the page's /Annots and the field off the
     * AcroForm's /Fields instead. Nothing is deleted, the xref stays whole, and
     * the orphaned objects are simply not reachable from any page - so
     * copyPages never carries them into the assembled artifact.
     */
    for (const page of pdf.getPages()) for (const widget of widgets) detachAnnotation(pdf, page, widget.dict);
    form.acroForm.removeField(field.acroField);
    viewerControlsRemoved.push({ name, pages, kind: "push_button", detachedNotDeleted: true });
  }
  const synthesizedSelectionAppearancesSuppressed =
    flattenWithoutDeleting(pdf, form, new Set(spec.writes.map((row) => row.name)));
  return { pdf, drawn, cleared, viewerControlsRemoved, geometry,
    synthesizedSelectionAppearancesSuppressed };
}

const PLACEMENT = /q\s*\n1 0 0 1 ([\d.-]+) ([\d.-]+) cm\s*\n(?:1 0 0 1 0 0 cm\s*\n)*\/(FlatWidget-\d+) Do\s*\nQ/g;
const DIRECT_SHOW = /1 0 0 1 (-?[\d.]+) (-?[\d.]+) Tm\s*\n<([0-9A-Fa-f]*)> Tj/g;

function decodeToken(token) {
  if (token.startsWith("(")) return token.slice(1, -1).replace(/\\([()\\])/g, "$1");
  return Buffer.from(token.slice(1, -1).replace(/\s+/g, ""), "hex").toString("latin1");
}

function runsOfAppearance(stream) {
  const runs = [];
  let font = null;
  let size = null;
  const token = "(\\((?:[^()\\\\]|\\\\.)*\\)|<[0-9A-Fa-f\\s]*>)";
  const re = new RegExp(
    `\\/(\\S+)\\s+([\\d.]+)\\s+Tf|([\\d.-]+)\\s+([\\d.-]+)\\s+Td|1 0 0 1 ([\\d.-]+)\\s+([\\d.-]+)\\s+Tm|${token}\\s*Tj`,
    "g"
  );
  let x = 0;
  let y = 0;
  let m;
  while ((m = re.exec(stream)) !== null) {
    if (m[1] !== undefined) { font = m[1]; size = Number(m[2]); continue; }
    if (m[3] !== undefined) { x = Number(m[3]); y = Number(m[4]); continue; }
    if (m[5] !== undefined) { x = Number(m[5]); y = Number(m[6]); continue; }
    if (m[7] !== undefined) runs.push({ font, size, x, y, text: decodeToken(m[7]) });
  }
  return runs;
}

/*
 * A TICK IS NOT ALWAYS TEXT.
 *
 * Missouri's FI-05 draws a marked box as a ZapfDingbats glyph; Nebraska's
 * CC 6:12 draws one as two stroked line segments, and Maryland's CC-DC-CR-072B
 * as its own path. A proof that looked only for show-text operators read the
 * second kind as an unmarked box, which is the worst direction for a route
 * election to be wrong in. So a marked box is proved three ways, and the
 * strongest available one decides: the flattened appearance must differ from
 * the source's own "Off" appearance for that same widget, and it must carry
 * ink - a show-text run, or more path moveto operators than clip paths.
 */
function markEvidence(placements, row) {
  const here = placements.filter((pl) =>
    Math.abs(pl.ox - row.rect.rawX) < 0.51 && Math.abs(pl.oy - row.rect.rawY) < 0.51);
  if (here.length === 0) return { marked: false, why: "no flattened appearance is placed at this widget's own /Rect", claimedInk: [] };
  const stream = here[0].stream;
  const runs = runsOfAppearance(stream).filter((r) => r.text.trim() !== "");
  const moveTos = (stream.match(/(?:^|[\s\n])-?[\d.]+\s+-?[\d.]+\s+m(?=[\s\n])/g) ?? []).length;
  const clips = (stream.match(/W\s*\n?\s*n/g) ?? []).length;
  const vectorMarkDrawn = moveTos > clips;
  const differsFromOff = typeof row.offAppearance === "string" ? stream !== row.offAppearance : null;
  const marked = differsFromOff === false ? false : (runs.length > 0 || vectorMarkDrawn);
  return {
    marked, differsFromOff, vectorMarkDrawn, moveToOperators: moveTos, clipPaths: clips,
    markKind: runs.length > 0 ? "show_text_glyph" : vectorMarkDrawn ? "stroked_vector_mark" : "none",
    font: runs[0]?.font ?? null,
    drawnText: runs.map((r) => r.text).join("").trim() || null,
    why: marked ? null
      : differsFromOff === false
        ? "the flattened appearance is byte-identical to the source's own Off appearance for this widget"
        : "the flattened appearance carries neither a show-text run nor path ink beyond its clip",
    claimedInk: []
  };
}

async function proveWrites(assembledBytes, sourceStreamsByPage, drawnByPage, fixtureName) {
  const pdf = await PDFDocument.load(assembledBytes, { updateMetadata: false });
  const measuringFont = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  assert.equal(pages.length, sourceStreamsByPage.length, "the assembled artifact must carry one page per source page");
  const proofs = [];
  const unproved = [];
  let addedGlyphs = 0;
  let vectorMarks = 0;
  let outsideBoxes = 0;
  for (let p = 0; p < pages.length; p += 1) {
    const page = pages[p];
    const original = new Set(sourceStreamsByPage[p]);
    const added = contentStreamsOfPage(pdf, page).filter((s) => !original.has(s));
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjectDict = resources ? pdf.context.lookup(resources).get(PDFName.of("XObject")) : null;
    const xObjects = new Map();
    if (xObjectDict) {
      for (const [name, ref] of pdf.context.lookup(xObjectDict).entries()) {
        const object = pdf.context.lookup(ref);
        if (!(object instanceof PDFRawStream)) continue;
        xObjects.set(name.asString().replace(/^\//, ""), inflate(Buffer.from(object.contents)).toString("latin1"));
      }
    }
    const placementsOnPage = [];
    const inkOnPage = [];
    for (const stream of added) {
      PLACEMENT.lastIndex = 0;
      let m;
      while ((m = PLACEMENT.exec(stream)) !== null) {
        const [ox, oy, name] = [Number(m[1]), Number(m[2]), m[3]];
        const appearance = xObjects.get(name);
        if (appearance === undefined) continue;
        placementsOnPage.push({ ox, oy, name, stream: appearance });
        for (const run of runsOfAppearance(appearance)) {
          if (run.text.trim() === "") continue;
          inkOnPage.push({ ...run, pageX: ox + run.x, pageY: oy + run.y, placementX: ox, placementY: oy, appearance: name });
        }
      }
      DIRECT_SHOW.lastIndex = 0;
      while ((m = DIRECT_SHOW.exec(stream)) !== null) {
        const text = Buffer.from(m[3], "hex").toString("latin1");
        if (text.trim() === "") continue;
        inkOnPage.push({ font: null, size: null, pageX: Number(m[1]), pageY: Number(m[2]), placementX: null, placementY: null, text, appearance: null });
      }
    }
    for (const ink of inkOnPage) addedGlyphs += ink.text.replace(/\s/g, "").length;
    const claimed = new Set();
    for (const row of (drawnByPage.get(p + 1) ?? [])) {
      if (row.kind === "checkbox") {
        const evidence = markEvidence(placementsOnPage, row);
        if (!evidence.marked) {
          unproved.push({ field: `${row.document}:${row.name}`, page: p + 1, expected: "a marked checkbox", why: evidence.why });
          continue;
        }
        if (evidence.vectorMarkDrawn) vectorMarks += 1;
        for (const ink of inkOnPage) {
          if (ink.placementX !== null
            && Math.abs(ink.placementX - row.rect.rawX) < 0.51 && Math.abs(ink.placementY - row.rect.rawY) < 0.51) claimed.add(ink);
        }
        proofs.push({
          field: `${row.document}:${row.name}`, fieldName: row.name, effectiveLabel: row.label,
          documentId: row.document, page: p + 1, factId: row.factId ?? null,
          expected: "a marked checkbox", drawnText: evidence.drawnText, markKind: evidence.markKind,
          differsFromTheSourceOffAppearance: evidence.differsFromOff,
          moveToOperators: evidence.moveToOperators, clipPaths: evidence.clipPaths,
          drawnAt: [{ x: row.rect.x, y: row.rect.y, fontSize: null, font: evidence.font }],
          declaredRect: row.rect,
          visibleInArtifactBytes: true, everyWidgetVisibleInArtifactBytes: true, insideDeclaredRect: true
        });
        continue;
      }
      const mine = inkOnPage.filter((ink) => ink.placementX !== null
        && Math.abs(ink.placementX - row.rect.rawX) < 0.51 && Math.abs(ink.placementY - row.rect.rawY) < 0.51);
      if (mine.length === 0) { unproved.push({ field: `${row.document}:${row.name}`, page: p + 1, expected: row.text }); continue; }
      for (const ink of mine) claimed.add(ink);
      const readBack = mine.map((ink) => ink.text).join(" ").replace(/\s+/g, " ").trim();
      const expected = String(row.text).replace(/\s+/g, " ").trim();
      if (readBack !== expected) {
        unproved.push({ field: `${row.document}:${row.name}`, page: p + 1, expected, readBack });
        continue;
      }
      let inside = true;
      const overruns = [];
      for (const ink of mine) {
        const top = ink.pageY + (ink.size ?? 0);
        const drawnWidth = ink.size ? measuringFont.widthOfTextAtSize(ink.text, ink.size) : 0;
        const right = ink.pageX + drawnWidth;
        if (right > row.rect.x + row.rect.width + 1) {
          inside = false;
          overruns.push({ text: ink.text, drawnWidthPt: Number(drawnWidth.toFixed(3)), rightEdgePt: Number(right.toFixed(3)), boxRightEdgePt: Number((row.rect.x + row.rect.width).toFixed(3)) });
        }
        if (ink.pageX < row.rect.x - 1 || ink.pageY < row.rect.y - 3 || top > row.rect.y + row.rect.height + 3) inside = false;
      }
      if (!inside) outsideBoxes += readBack.replace(/\s/g, "").length;
      proofs.push({
        field: `${row.document}:${row.name}`, fieldName: row.name, effectiveLabel: row.label,
        documentId: row.document, page: p + 1, factId: row.factId ?? null,
        expected, drawnText: readBack,
        drawnAt: mine.map((ink) => ({ x: Number(ink.pageX.toFixed(3)), y: Number(ink.pageY.toFixed(3)), fontSize: ink.size, font: ink.font,
          drawnWidthPt: ink.size ? Number(measuringFont.widthOfTextAtSize(ink.text, ink.size).toFixed(3)) : null })),
        runsWiderThanTheirOwnBox: overruns,
        declaredRect: row.rect,
        visibleInArtifactBytes: true, everyWidgetVisibleInArtifactBytes: true, insideDeclaredRect: inside
      });
    }
    for (const ink of inkOnPage) {
      if (claimed.has(ink)) continue;
      outsideBoxes += ink.text.replace(/\s/g, "").length;
    }
  }
  assert.equal(unproved.length, 0,
    `${unproved.length} declared write(s) are not readable in the ${fixtureName} output bytes: ${JSON.stringify(unproved).slice(0, 2000)}`);
  return { proofs, addedGlyphs, vectorMarks, outsideBoxes };
}

function builderCounters(map, artifacts, instructions) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const norm = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writes = map.writes.map((w) => ({ ...w, name: w.fieldName, label: w.effectiveLabel, document: w.documentId, isSelectionControl: false }));
  const blanks = map.refusals.map((r) => ({ ...r, name: r.fieldName, label: r.effectiveLabel, document: r.documentId, isSelectionControl: r.isSelectionControl === true }));

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  const writtenInDocument = new Map();
  for (const w of writes) {
    const doc = String(w.document ?? "");
    if (!writtenInDocument.has(doc)) writtenInDocument.set(doc, new Set());
    for (const key of [norm(w.label), norm(w.name)]) if (key.length >= 4) writtenInDocument.get(doc).add(key);
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") note("protectedWrites", { field: w.fieldId, label: w.label });
  }
  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(String(blank.document ?? "")) ?? new Set();
    const declared = {
      sourcePresentation: null,
      disposition: blank.completenessDisposition ?? null,
      ...(Object.hasOwn(blank, "requiredBeforeFiling") ? { requiredBeforeFiling: blank.requiredBeforeFiling === true } : {}),
      routeDetermined: blank.routeDetermined === true,
      factAvailable: (blank.factId ? availableFacts.has(String(blank.factId)) : false)
        || here.has(norm(blank.label)) || here.has(norm(blank.name)),
      routeConditionThatMakesItInapplicable: blank.routeConditionThatMakesItInapplicable ?? null,
      determinedByTheCaseNotTheRoute: false, whyTheRouteCannotDetermineIt: null,
      factId: blank.factId ?? null, identity: blank.identity ?? blank.field ?? blank.fieldId
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass ?? null, declared);
    ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.fieldId, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.fieldId, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.fieldId, label: blank.label, basis: verdict.basis });
  }
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.fieldId, b.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.fieldId, label: b.label });
  }
  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((c) => c.written)) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label) });
  }
  for (const a of artifacts) {
    const visible = (a.addedGlyphsReadFromOutputBytes ?? 0) + (a.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((a.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: a.fixture });
    if ((a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: a.fixture, glyphsOutsideMeasuredBoxes: a.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
    for (const r of a.refusedFieldsWithInk ?? []) note("protectedWrites", { fixture: a.fixture, field: r });
  }
  const declaredComponents = new Set(DECLARED_COMPONENT_DOCUMENTS);
  const mapped = new Set([...writes, ...blanks].map((f) => f.document).filter(Boolean));
  for (const doc of mapped) if (!declaredComponents.has(doc)) note("requiredComponentsMissing", { component: doc });
  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

async function sourcePageStreams(bytes) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  return pdf.getPages().map((page) => contentStreamsOfPage(pdf, page));
}

async function renderFixture(resolved, fixtureName, facts) {
  const { parts, agencies } = partsFor(facts);
  const filled = [];
  const clearedRows = [];
  const viewerControlsRemoved = [];
  const sourceStreamsByPage = [];
  const drawnByPage = new Map();
  let offset = 0;
  for (const part of parts) {
    const source = resolved[part.key];
    const result = await fillDocument(source.bytes, part.spec);
    for (const row of result.drawn) {
      row.document = part.documentId;
      row.packetPage = offset + row.page;
      const list = drawnByPage.get(row.packetPage) ?? [];
      list.push(row);
      drawnByPage.set(row.packetPage, list);
    }
    for (const row of part.spec.writes) row.packetPage = offset + (row.page ?? 0);
    for (const row of part.spec.blanks) row.packetPage = offset + (row.page ?? 0);
    sourceStreamsByPage.push(...(await sourcePageStreams(source.bytes)));
    for (const row of result.cleared) { row.document = part.documentId; row.packetPage = offset + row.page; clearedRows.push(row); }
    for (const control of result.viewerControlsRemoved) viewerControlsRemoved.push({ ...control, document: part.documentId });
    filled.push({ pdf: result.pdf, documentId: part.documentId, component: part.component, sourceSha256: source.sha256 });
    offset += source.pageCount;
  }
  const assembled = await assemble(filled, fixtureName);
  const proof = await proveWrites(assembled.bytes, sourceStreamsByPage, drawnByPage, fixtureName);
  const drawnCount = [...drawnByPage.values()].reduce((n, list) => n + list.length, 0);
  return { ...assembled, ...proof, parts, agencies, drawnCount, clearedRows, viewerControlsRemoved };
}

/* ---- assembly ------------------------------------------------------------ */
async function assemble(filled, fixtureName) {
  const out = await PDFDocument.create();
  const manifest = [];
  for (const part of filled) {
    const pages = await out.copyPages(part.pdf, part.pdf.getPageIndices());
    pages.forEach((page, i) => {
      out.addPage(page);
      manifest.push({
        packetPage: out.getPageCount(), component: part.component, documentId: part.documentId,
        sourcePage: i + 1, sourceSha256: part.sourceSha256
      });
    });
  }
  out.setTitle(`${FAMILY_ID} ${fixtureName}`);
  out.setAuthor("Maryland Judiciary official forms, assembled without alteration of their printed content");
  out.setSubject("Petition for Expungement of Records after a full and unconditional pardon, with a Request for Waiver of Prepaid Costs");
  out.setCreator("LegalEase deterministic official-form builder");
  out.setProducer("pdf-lib 1.17.1");
  out.setCreationDate(FIXED_DATE);
  out.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await out.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: Infinity }));
  return { bytes, manifest, pageCount: out.getPageCount() };
}

/* ---- the field map ------------------------------------------------------- */
function productionFieldMap(parts) {
  const writes = [];
  const refusals = [];
  /*
   * FIX01, ROUTE_OPTIONS. The disclosed list is DERIVED from the selections
   * actually made, so the two cannot disagree again. Each row's own `basis` is
   * the source support; a checkbox write that carries no basis stops the build
   * rather than appearing in the packet undisclosed.
   */
  const selectionsMade = [];
  for (const part of parts) {
    for (const row of part.spec.writes) {
      if (row.kind !== "checkbox") continue;
      if (typeof row.basis !== "string" || row.basis.trim() === "") {
        throw new Error(`${part.documentId}:${row.name} is ticked with no stated basis, so it cannot be disclosed`);
      }
      selectionsMade.push({ routeKey: ROUTE_KEY, documentId: part.documentId, field: row.name,
        selection: `${part.documentId}: ${row.label}`, sourceSupport: row.basis,
        routeDetermined: row.routeDetermined === true, factId: row.factId ?? null });
    }
  }
  for (const part of parts) {
    for (const row of part.spec.writes) {
      writes.push({
        fieldId: `${part.documentId}:${row.name}`, fieldName: row.name, field: row.name,
        effectiveLabel: row.label, printedLabel: row.label, sourceLabel: row.label,
        sourceFieldName: row.name,
        documentId: part.documentId, component: part.component,
        page: row.packetPage, sourcePage: row.page, widgetCount: row.widgetCount ?? 1, widgets: row.placements ?? null, factId: row.factId ?? null,
        rect: row.rect, rectBasis: `the /Rect of the AcroForm widget named ${JSON.stringify(row.name)} on page ${row.page} of the source binary${row.widgetCount > 1 ? ` (this field has ${row.widgetCount} widgets, one per page it repeats on, and every one is proved)` : ""}`,
        kind: row.kind === "checkbox" ? "selection_control" : row.kind === "dropdown" ? "acroform_chooser" : "acroform_text_field",
        disposition: row.kind === "checkbox" ? "selected_by_route" : "written",
        routeDetermined: row.routeDetermined === true,
        selectionBasis: row.basis ?? null
      });
    }
    for (const row of part.spec.blanks) {
      refusals.push({
        fieldId: `${part.documentId}:${row.name}`, fieldName: row.name, field: row.name,
        effectiveLabel: row.label, printedLabel: row.label, sourceFieldName: row.name,
        documentId: part.documentId, component: part.component,
        page: row.packetPage ?? null, sourcePage: row.page ?? null,
        rect: row.rect ?? null, printedSlot: row.printedSlot === true,
        isSelectionControl: row.isSelectionControl === true,
        kind: row.isSelectionControl === true ? "selection_control" : "acroform_text_field",
        reason: row.supply ? `the participant supplies this before filing: ${row.supply}` : row.reason,
        refusalClass: row.refusalClass ?? null,
        completenessDisposition: row.disposition ?? null,
        requiredBeforeFiling: row.requiredBeforeFiling === true,
        routeDetermined: false,
        routeConditionThatMakesItInapplicable: row.routeConditionThatMakesItInapplicable ?? null,
        factAvailable: false, factId: null,
        identity: `${part.documentId} field ${row.name}`,
        participantMustSupply: row.supply ?? null,
        role: row.role ?? "participant",
        why: row.why ?? row.reason
      });
    }
  }
  return {
    schemaVersion: "rcap-production-field-map/v2",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: "MD",
    implementationStrategy: "official_pdf_fill", routeKeys: ROUTE_KEYS,
    structuralClass: "flattened_acroform",
    captionBasis: "every write box is the /Rect of the source's own AcroForm widget, read from the binary at build time.",
    fieldNameWarning:
      "CC-DC-CR-072B's AcroForm names were generated from the printed line each field happened to sit near and "
      + "several of them name the wrong thing. sourceFieldName carries the source's own name and effectiveLabel "
      + "carries what the field is, read off the rendered page at the widget's measured /Rect.",
    routeSelectionNote:
      "Item 3 of the petition says \"check all that apply\". The packet marks the ground this family is built on - "
      + "the full and unconditional pardon under Criminal Procedure Article sec. 10-105(a)(8) - and writes the "
      + "pardon date beside it from the held screening fact. The other seven grounds are NOT declared inapplicable, "
      + "because a second ground may also be true of a given record; they are carried as genuine participant "
      + "elections and disclosed. The caption's court box is a select-one stated from the held case fact the "
      + "record asks for by name. Item 1's arrest / summons / citation select-one is NOT stated: the record asks "
      + "no question about how a case began, so the packet leaves all three boxes for the person who signs. "
      + "routeSelectionsMade is derived from the selections actually made and lists every one of them.",
    /*
     * FIX01, ROUTE_OPTIONS. EVERY SELECTION THE PACKET MAKES IS LISTED HERE.
     *
     * This array used to hold two entries while the delivered bytes carried
     * four selections, and the two it omitted were the caption's court box and
     * item 1's arrest mode. It is now generated from the writes themselves, so
     * a selection the packet makes and does not list is not possible: any
     * checkbox write with no matching entry stops the build below.
     */
    routeSelectionsMade: selectionsMade,
    dispositionVocabulary: [SIGNATURE_CLASS, ELECTION_CLASS],
    writes, refusals
  };
}

/* ---- the two participant-facing documents -------------------------------- */
function participantInstructions(ledger, selectionsMade) {
  const rbf = ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING");
  const elections = ledger.filter((x) => x.disposition === "PARTICIPANT_ELECTION_GENUINE");
  const lines = [
    "# Before you sign or file this petition",
    "",
    "This packet is Maryland form CC-DC-CR-072B, *Petition for Expungement of Records (non-marijuana/cannabis",
    "related offenses) (guilty disposition)*, drafted for a conviction the Governor later **pardoned**, together",
    "with form CC-DC-089, *Request for Waiver of Prepaid Costs*. It is a prepared draft. It is not legal advice, it",
    "is not signed, and it has not been filed.",
    "",
    "## Every box this packet has ticked for you",
    "",
    "There are " + selectionsMade.length + ", and this is all of them. Nothing else on either form is marked.",
    "",
    ...selectionsMade.map((selection) => `- **${selection.selection}** - ${selection.sourceSupport}.`),
    "",
    "Item 3 of the petition lists eight grounds and tells you to check all that apply. The packet has marked the",
    "pardon ground - one criminal act, not a crime of violence, followed by a full and unconditional pardon by the",
    "Governor - and has written the pardon date you gave beside it.",
    "",
    "**Check the pardon date against your pardon document before you sign.** You are affirming the petition under",
    "the penalties of perjury, and the ground you are relying on requires that not more than ten years have",
    "passed since the Governor signed the pardon. Nothing in this packet proves you were pardoned.",
    "",
    "The caption's court box is ticked on both forms because you told us which court heard the case and the",
    "answer names a District Court location. If that is wrong, untick DISTRICT COURT OF MARYLAND, tick CIRCUIT",
    "COURT, and correct the city or county beside it before you sign.",
    "",
    "## How your case began",
    "",
    "**Item 1 is a check-one and the packet has left all three boxes empty.** The form reads: on or about the",
    "date shown, I was arrested, or served with a summons, or served with a citation, by an officer of the agency",
    "named. The date, the agency and the place are filled in from your case facts and they read the same",
    "whichever of the three is true - but which one it is is a fact about your own case that this platform never",
    "asked you for. The Maryland record for this route sets nine screening questions and not one of them asks how",
    "a case began, so nothing here knows the answer and nothing here will guess it on a petition you affirm under",
    "the penalties of perjury. Tick the one that is true before you sign.",
    "",
    "## What you must obtain before you file",
    "",
    "The Maryland record for this route marks the following as required before filing. Have it before you file,",
    "and take it with you:",
    "",
    ...REQUIRED_BEFORE_FILING_DOCUMENTS.map((document) =>
      `- **${document.name}.** Obtained from: ${document.obtainedFrom}.`
      + (document.howToObtain ? ` ${document.howToObtain}` : "")),
    "",
    "## The filing fee",
    "",
    FEE_PARAGRAPH,
    "",
    "On CC-DC-089 the packet has ticked the request for a waiver of prepaid costs, because that is what the form is.",
    "",
    "## Something this packet does not carry, and you may need",
    "",
    "CC-DC-089 says that unless you are filing into one of six restricted case types - adoption, emergency",
    "evaluation, extreme risk protective order, guardianship, juvenile, gender declaration - you must file a Notice",
    "Regarding Restricted Information under Rule 20-201.1, **form MDJ-008**, with the request. Expungement is not",
    "one of the six. This packet does not include MDJ-008 and does not stand in for it. Get it from the Maryland",
    "Judiciary before you file the fee-waiver request.",
    "",
    "## What only you can decide, and nothing here can decide for you",
    ""
  ];
  const seen = new Set();
  for (const e of elections) {
    if (seen.has(e.label)) continue;
    seen.add(e.label);
    lines.push(`- **${e.label}.** ${e.why}`);
  }
  lines.push(
    "",
    "## What you must supply before filing",
    "",
    "The whole affidavit of income on CC-DC-089 is yours. This platform holds no income, property or debt fact",
    "about anyone, and an affidavit sworn under the penalties of perjury is your own statement about your own",
    "household. If you do not need a fee waiver, leave that form out of what you file.",
    "",
    "| Blank | What you must supply |",
    "| --- | --- |"
  );
  for (const r of rbf) {
    lines.push(`| ${String(r.label).replaceAll("|", "-")} | ${String(r.participantMustSupply ?? "").replaceAll("|", "-")} |`);
  }
  lines.push(
    "",
    "## What is deliberately left blank",
    "",
    "Your signature and the date beside it are blank on both forms. Sign and date them yourself, after you have",
    "read them. The attorney block on each form is blank because no lawyer is filing this for you.",
    "",
    "Page 3 of CC-DC-089 carries the court's order on your request. The order itself is the judge's and this",
    "packet leaves all of it blank: the findings, the granted, granted-in-part or denied election, any amount and",
    "date ordered, and the judge's signature and ID number.",
    "",
    "**The caption at the top of that page is not part of the order, and this packet has filled it** - the",
    "DISTRICT COURT OF MARYLAND box, the court's city or county, the case number, and the two parties - because",
    "it identifies your case and it is the same caption the rest of the form carries. Check it against your own",
    "case record like any other caption in this packet.",
    "",
    "## Stop conditions",
    "",
    "Stop using this self-help packet and talk to a lawyer if any of these is true. They are the conditions the",
    "Maryland record for this route states, in its own words:",
    "",
    ...SELF_HELP_STOP_CONDITIONS.map((condition) => `- ${condition}`),
    "",
    "The last of those can happen after you file, and you will not be the one who starts it. The record states the",
    `notice this way: "${NOTICE_RULE}" If the State's Attorney objects within that period, stop and talk to a`,
    "lawyer.",
    "",
    "Stop as well if the conviction was not pardoned, if the offence was a crime of violence under Criminal Law",
    "Article section 14-101(a), if you are now a defendant in any pending criminal action, or if you have any",
    "immigration matter pending or possible. Those are route boundaries rather than conditions of the record: a",
    "conviction that was not pardoned is not on this route at all, and the other three are conditions the",
    "petition's own pardon ground makes you affirm.",
    "",
    `Route: ${ROUTE_KEY}`,
    ""
  );
  return lines.join("\n");
}

function filingInstructions() {
  return `# Filing instructions - Maryland expungement after a pardon

## Before you file

1. Read the whole petition. Check the caption, the case number, the date in item 1, the agency named in item 1,
   the incident description, the offence and the conviction date against your own case record.
2. **Item 1 asks how your case began and the packet has not answered it.** The form says check one of the
   following boxes: arrested, served with a summons, or served with a citation. Tick the one that is true. The
   date, the agency and the place are already filled in and they read the same whichever box you tick; the box
   itself is a fact about your own case that this platform never asked you for, and you are affirming the whole
   petition under the penalties of perjury.
3. Check the pardon date against your pardon document.
4. Answer items 4 and 5 yourself: whether the case was transferred between courts, and whether it was appealed.
   The form says in terms that a transferred case must be filed in the court it was transferred to, and an
   appealed case in the appellate court. Those two answers decide where this petition goes.
5. Look again at the other seven grounds in item 3. The form says check all that apply. If another ground is also
   true of your record, tick it too.
6. Sign and date the petition.

## The filing fee, and asking for a waiver

${FEE_PARAGRAPH}

**CC-DC-089 requires a companion this packet does not carry.** The form says a Notice Regarding Restricted
Information under Rule 20-201.1, form MDJ-008, must be filed with it unless the case is one of six restricted
types, and an expungement is not one of them. Obtain MDJ-008 from the Maryland Judiciary and file it with the
waiver request. Nothing in this packet replaces it.

## Where it goes

File with the clerk of the court shown in the caption - the court where the conviction was entered - unless the
case was transferred or appealed, in which case the form tells you which court takes the petition.

## After filing

The petition prints a notice to victims: a victim has the right to offer objections or additional information to
the court, and the court may act as soon as thirty days after the petition is served. Keep a copy of everything
you filed.

## What this packet is not

This is a prepared set of the court's own forms. It is not legal advice, it is not filed for you, and it does not
decide whether the court will expunge your record.

Route: ${ROUTE_KEY}
`;
}

/* ---- build --------------------------------------------------------------- */
function partsFor(facts) {
  return {
    agencies: null,
    parts: [
      { key: PETITION, documentId: PETITION, component: "primary_filing", spec: petitionSpec(facts) },
      { key: WAIVER, documentId: WAIVER, component: "fee_waiver", spec: waiverSpec(facts) }
    ]
  };
}

async function build() {
  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return { familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures, overlayDirectoryTouched: false };
  }
  const fixtures = {};
  for (const [name, facts] of Object.entries(FIXTURES)) fixtures[name] = await renderFixture(resolved, name, facts);

  const map = productionFieldMap(fixtures.canonical.parts);
  /* Push buttons detached before flattening, so a viewer control is never drawn
   * onto a filed page. Declared rather than done quietly. */
  map.viewerControlsRemoved = fixtures.canonical.viewerControlsRemoved;
  const artifactCounters = Object.entries(fixtures).map(([fixture, f]) => ({
    fixture,
    valuesReportedByFinalizer: f.drawnCount,
    /*
     * FIX01. This was the literal 0, beside a real reading of the same quantity
     * carried under flattenedShowTextGlyphsReadFromOutputBytes below. Every
     * reader in this factory looks for the canonical name, so the packet
     * published a source-authored zero where it held a measurement. The number
     * is f.addedGlyphs either way: non-whitespace glyphs decoded from the show-
     * text operators of the flattened appearance streams of the SAVED bytes,
     * with the streams the source page already carried excluded. The sibling
     * key is kept so nothing that reads it breaks.
     */
    addedGlyphsReadFromOutputBytes: f.addedGlyphs,
    flattenedWidgetAppearancesReadFromOutputBytes: f.addedGlyphs + f.vectorMarks,
    flattenedShowTextGlyphsReadFromOutputBytes: f.addedGlyphs,
    flattenedVectorMarksReadFromOutputBytes: f.vectorMarks,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: f.outsideBoxes,
    refusedFieldsWithInk: []
  }));
  const preliminary = builderCounters(map, artifactCounters, "");
  const instructions = participantInstructions(preliminary.ledger, map.routeSelectionsMade);
  const audit = builderCounters(map, artifactCounters, instructions);
  const allZero = PASS_COUNTERS.every((c) => audit.counters[c] === 0);
  if (!allZero) {
    return { familyId: FAMILY_ID, status: "STOPPED", stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => audit.counters[c] > 0),
      counters: audit.counters, findings: audit.findings.slice(0, 40), overlayDirectoryTouched: false };
  }

  const out = path.join(ROOT, OUT_REL);
  fs.mkdirSync(path.join(out, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(out, "reports"), { recursive: true });
  for (const [name, f] of Object.entries(fixtures)) fs.writeFileSync(path.join(out, "fixtures", `${name}.pdf`), f.bytes);

  const artifactRows = Object.entries(fixtures).map(([fixture, f]) => ({
    fixture, file: `${OUT_REL}/fixtures/${fixture}.pdf`,
    sha256: sha256(f.bytes), byteLength: f.bytes.length, pageCount: f.pageCount,
    documents: [
      { documentId: PETITION, componentKinds: ["primary_filing"], sourceSha256: resolved[PETITION].sha256 },
      { documentId: WAIVER, componentKinds: ["fee_waiver"], sourceSha256: resolved[WAIVER].sha256 }
    ],
    pageManifest: f.manifest
  }));

  writeJson(path.join(out, "production-field-map.json"), map);
  writeJson(path.join(out, "source-receipt.json"), {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: "MD",
    implementationStrategy: "official_pdf_fill", custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false, allSourcesExact: true,
    bindingMethod: "committed corpus-index path + index SHA-256 + on-disk SHA-256, re-read at build time",
    compositionSources: [
      { path: MD_MEMO_PATH, sha256: sha256(MD_MEMO_BYTES), byteLength: MD_MEMO_BYTES.length,
        whatItSupplies: `rules.fees and rules.feeWaiver (the fee paragraph in both instruction files), the `
          + `${SELF_HELP_STOP_CONDITIONS.length} self-help stop condition(s), rules.notice, and the `
          + `${REQUIRED_BEFORE_FILING_DOCUMENTS.length} required-before-filing supporting document(s). All are `
          + "read from this record at build time and the build refuses if it stops declaring them, so that text "
          + "moves only when this hash moves." }
    ],
    documents: [
      { sourceIds: [SOURCES[PETITION].sourceId], formNumber: PETITION, documentId: PETITION,
        revision: SOURCES[PETITION].revision, pathInArchive: SOURCES[PETITION].path,
        custody: resolved[PETITION].custody, sha256: resolved[PETITION].sha256,
        byteLength: resolved[PETITION].byteLength, componentKinds: ["primary_filing"], pages: [1] },
      { sourceIds: [SOURCES[WAIVER].sourceId], formNumber: WAIVER, documentId: WAIVER,
        revision: SOURCES[WAIVER].revision, pathInArchive: SOURCES[WAIVER].path,
        custody: resolved[WAIVER].custody, sha256: resolved[WAIVER].sha256,
        byteLength: resolved[WAIVER].byteLength, componentKinds: ["fee_waiver"], pages: [1, 2, 3] }
    ],
    companionFormNamedBySourceButNotHeld: {
      form: "MDJ-008",
      whatItIs: "Notice Regarding Restricted Information Pursuant to Rule 20-201.1",
      namedBy: "CC-DC-089 prints, above its first blank, that it must be filed with this request unless the filing "
        + "is into one of six restricted case types. Expungement is not one of the six.",
      heldByThisFamily: false,
      consequence: "No MDJ-008 is bound to this family by any source record. The packet does not carry one, does not "
        + "stand in for one, and names the gap in participant-instructions.md and filing-instructions.md."
    },
    whatThisReceiptDoesNotEstablish: [
      "that any pardon was granted, or on what date",
      "that the filing fee this packet states is current. The two source binaries print no amount at all - the "
        + "petition's only fee wording is \"Filing Fees Are Not Refundable\" - so the figure comes from "
        + "MD.memo.json's rules.fees, hashed above as a composition source, and not from either form",
      "possession of form MDJ-008, which CC-DC-089 requires alongside it",
      "independent verification, raster acceptance, counsel approval, or fulfillment authority"
    ],
    commercialRoutesOpened: 0
  });
  writeJson(path.join(out, "reports", "actual-writes.json"), {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    proofMethod: "each saved fixture is re-opened, every page content stream is decompressed, the streams the "
      + "source page already carried are excluded, each remaining /FlatWidget-n Do is resolved to its XObject, that "
      + "stream is decompressed, and every show-text operator in it is decoded with the matrix or text offset that "
      + "precedes it. A marked box is proved against the source's own Off appearance for the same widget.",
    documents: Object.entries(fixtures).map(([fixture, f]) => ({ fixture, actualWrites: f.proofs })),
    artifacts: artifactCounters
  });
  writeJson(path.join(out, "reports", "rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v2", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: ["primary_filing", "fee_waiver"], componentIdentityMode: "exact",
    artifacts: artifactRows,
    packets: artifactRows.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount, documents: a.documents, pageManifest: a.pageManifest })),
    rasterEngine: null, rasterState: "BUILT_RASTER_PENDING"
  });
  writeJson(path.join(out, "reports", "builder-completeness-counters.json"), {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    thisIsNotAVerdict: "A builder verdict is not a verdict. These counters are the builder contract's own "
      + "obligation, computed with scripts/rcap-packet-completeness/completeness-contract.mjs. An independent "
      + "verification lane that did not build this packet decides whether it passes.",
    counters: audit.counters, allNineZero: allZero,
    totals: { terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank },
    blanksByDisposition: audit.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {}),
    findings: audit.findings
  });
  writeJson(path.join(out, "reports", "blanks-left-for-the-participant.json"), {
    schemaVersion: "rcap-blank-ledger/v1", familyId: FAMILY_ID,
    blanks: audit.ledger.map((b) => ({
      field: b.fieldId, documentId: b.documentId, page: b.page, label: b.effectiveLabel,
      disposition: b.disposition, basis: b.basis, participantMustSupply: b.participantMustSupply ?? null
    }))
  });
  fs.writeFileSync(path.join(out, "participant-instructions.md"), instructions);
  fs.writeFileSync(path.join(out, "filing-instructions.md"), filingInstructions());
  writeJson(path.join(out, "build-status.json"), {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending",
    builtBy: "scripts/build-census-v1-md_pardon_expungement-set.mjs",
    rasterEngine: null, popplerUsed: false, rasterState: "BUILT_RASTER_PENDING",
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });
  writeJson(path.join(out, "build-findings.json"), {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    findings: [
      { finding: "Item 3 of CC-DC-CR-072B lists eight grounds under \"check all that apply\", one of which is this family's whole identity: a single criminal act, not a crime of violence, followed by a full and unconditional pardon.",
        consequence: "The packet marks that ground and writes the pardon date beside it from the held screening fact, which is the same fact the route's own ten-year test is computed from. The other seven are carried as genuine participant elections rather than declared inapplicable, because the form is not a select-one and a second ground may also be true of a given record." },
      { finding: "CC-DC-CR-072B's AcroForm field names were generated from whichever printed line each field sat near, and several name the wrong thing: \"2 I was charged with the offense of\" is the second line of the incident description, \"I was convicted found guilty of check all that apply...\" is the offence blank of item 2, and the checkbox named for common law battery and domestically related crime is the burglary-and-felony-theft ground.",
        consequence: "Every label was read off the rendered page at the widget's measured /Rect. The field map carries both sourceFieldName and effectiveLabel and states the warning, so no later reader trusts the source's names." },
      { finding: "CC-DC-089 prints that form MDJ-008, the Notice Regarding Restricted Information under Rule 20-201.1, must be filed with it unless the case is one of six restricted types. Expungement is not one of them, and no MDJ-008 is bound to this family by any source record.",
        consequence: "The packet does not carry MDJ-008 and does not stand in for it. The gap is named in the source receipt, in participant-instructions.md and in filing-instructions.md, and it is a source obligation for whoever owns acquisition." },
      { finding: "Items 4 and 5 of the petition ask whether the case was transferred or appealed, and the form says in terms that the answer decides which court the petition must be filed in.",
        consequence: "Neither is held by the platform. Both are carried as genuine participant elections, disclosed in the participant instructions and repeated in the filing instructions, because getting them wrong sends the petition to the wrong court." },
      { finding: "The whole affidavit of income on CC-DC-089 asks for facts this platform holds none of.",
        consequence: "Every income, property and debt line is left blank and disclosed. None is filled from an inference, and the participant is told that if they do not need a fee waiver they should leave the form out of what they file." },
      { finding: "Page 3 of CC-DC-089 carries the court's ORDER on the request, under the same caption the rest of the form carries.",
        consequence: "The 18 fields of the order itself are refused as court-owned - the findings checkboxes, the granted / granted-in-part / denied election, the amount and date ordered, and the judge's signature and ID. The caption at the head of that page is NOT part of the order and IS filled by this packet: the DISTRICT COURT OF MARYLAND box is ticked and the court's city or county, the case number, the petitioner and the respondent are printed, from the same field map entries that fill the caption on pages 1 and 2. Corrected under FIX01: the refusal reason, this finding and the participant guide all used to say every field on that page belonged to the court, while the packet wrote five values there." }
    ]
  });
  writeJson(path.join(out, "approval-request.json"), {
    schemaVersion: "rcap-family-approval-request/v2", familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING", implementationStrategy: "official_pdf_fill",
    routeKeys: ROUTE_KEYS, buildStatus: "state_built",
    requested: "visual review and counsel review",
    components: [{ kind: "primary_filing", documentId: PETITION }, { kind: "fee_waiver", documentId: WAIVER }],
    artifacts: artifactRows.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    counselQuestionsRaised: [
      "The packet writes the pardon date into the sworn petition from the held screening answer. Confirm that screening evidence is a sufficient basis for a date on a petition affirmed under the penalties of perjury, with the participant's own verification against the pardon document required before signing.",
      "The other seven grounds of item 3 are left for the participant because the form says check all that apply. Confirm that a prepared draft should not attempt a second ground.",
      "CC-DC-089's caption is filled as State of Maryland versus the defendant, mirroring the criminal case caption the petition carries. Confirm that is how a Maryland clerk expects the fee-waiver caption of an expungement petition to read.",
      "MDJ-008 is required alongside CC-DC-089 and is not held. Confirm whether the fee-waiver component should ship at all until MDJ-008 is acquired."
    ],
    independentVerificationStatus: "PENDING",
    approvedForLive: false, live: false,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  });

  return {
    familyId: FAMILY_ID, status: "COMPLETED", directory: OUT_REL,
    structuralClass: "flattened_acroform",
    officialForms: [
      { formNumber: PETITION, sha256: resolved[PETITION].sha256 },
      { formNumber: WAIVER, sha256: resolved[WAIVER].sha256 }
    ],
    components: ["primary_filing", "fee_waiver"],
    terminalFields: audit.terminalFields, written: audit.written, blank: audit.blank,
    counters: audit.counters, nineCountersZero: allZero,
    blanksByDisposition: audit.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {}),
    companionFormNotHeld: "MDJ-008",
    rasterState: "BUILT_RASTER_PENDING",
    artifactHashes: artifactRows.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  build().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e); process.exit(1); });
}

export { build, FAMILY_ID, OUT_REL };
