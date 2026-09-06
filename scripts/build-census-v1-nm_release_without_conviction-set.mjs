#!/usr/bin/env node
/**
 * The New Mexico release-without-conviction expungement family —
 * `nm_release_without_conviction-set`.
 *
 *   node scripts/build-census-v1-nm_release_without_conviction-set.mjs [--check] [--no-raster]
 *
 * Six official documents rendered across two filing stages, in a New Mexico
 * district court, under NMSA 1978, Section 29-3A-4 and Rule 1-077.1 NMRA, plus
 * one retained county packet that is bound by content hash and deliberately
 * NOT rendered (see below):
 *
 *   STAGE ONE, filed under seal and then served on two parties
 *     4-952 NMRA                 Petition to expunge; upon release without conviction
 *     4-955 NMRA                 Certificate of service
 *     4-222 NMRA (+ 4-223)       Application for free process          — conditional
 *
 *   STAGE TWO, sixty-three days or more after service
 *     4-959 NMRA                 Notice of completion of briefing
 *     4-960.2 NMRA               Affirmation in support of expungement
 *
 *   IF THE COURT SETS A HEARING
 *     4-960.1 NMRA               Notice of hearing                    — conditional
 *
 *   BOUND, NOT RENDERED
 *     NM-SAN-JUAN-NONCONVICTION-PACKET   the Eleventh Judicial District's
 *                                        31-page self-help packet  — conditional
 *
 * WHAT DIFFERS FROM THE CONVICTION FAMILY, AND WHY IT MATTERS HERE
 *
 * TWO PARTIES ARE SERVED, NOT THREE. Rule 1-077.1(E)(1) NMRA and the track's own
 * record: the petition and its attachments go by first-class United States mail
 * to the district attorney for the judicial district where the charge
 * originated and to the New Mexico Department of Public Safety. The arresting
 * agency is not served on this track, and Forms 4-955 and 4-959 print exactly
 * two service lines. Because somebody IS served, an objection CAN be filed, so
 * Form 4-960.1's four page-2 blocks are the petitioner's to complete for any
 * objector -- `serviceBlocksOf` is passed this track's service posture.
 *
 * THE HEARING IS CONDITIONAL. Relief is mandatory on the findings and, where no
 * objection is filed, the court may decide on the pleadings and the
 * affirmation. The packet-set manifest marks Form 4-960.1 conditional here
 * where the conviction family marks it required.
 *
 * THE PETITION IS FILED UNDER SEAL under Rule 1-079 NMRA, and combining it with
 * a conviction petition destroys the seal (Rule 1-077.1(C) NMRA). The
 * instructions say so before anything else about sequencing.
 *
 * WHICH LINE THE CASE NUMBER GOES ON, AND WHO DECIDES IT
 *
 * Form 4-952 paragraph 4 asks for the case number BY THE COURT IT WAS IN:
 * "District Court case number(s)" on one line and
 * "Metropolitan/Magistrate/Municipal Court case number(s)" on the next.
 * Paragraph 12 asks the same question again as a printed select-one over four
 * courts. A case released without conviction very commonly originated in a
 * magistrate, metropolitan or municipal court -- the track's intake asks "Where
 * was the case originally handled -- district, metropolitan, magistrate or
 * municipal court, and in what location?" as a REQUIRED question for exactly
 * that reason -- and the petition is always filed in DISTRICT court regardless.
 *
 * The build used to answer neither question and assert the second: the number
 * was written on no line at all, under a row that said the platform holds no
 * value for it, while the judicial district WAS written into the District Court
 * branch of paragraph 12 on a fixture whose case is a magistrate case.
 *
 * Both are now decided by the held answer, which travels with the fixture as
 * matter.originating_court. Where the case was disposed of in the district
 * court, the number goes on the District Court line and the district on the
 * District Court branch; where it was not, those two lines carry nothing and
 * say which branch they belong to, and the participant copies the number onto
 * the line for the court that did handle the case. That last step is still the
 * participant's because the shared field semantics protect every blank whose
 * printed line names a magistrate and refuse the write whatever fact is
 * offered; the row says so in terms rather than calling a held fact
 * unavailable.
 *
 * WHY THE SAN JUAN PACKET IS BOUND AND NOT RENDERED
 *
 * The packet-set manifest's proposed_order component is conditional: "Where the
 * participant files in San Juan County, whose non-conviction packet is the
 * retained local order. Every other district supplies its own order form". The
 * bound binary is not an order; it is the Eleventh Judicial District's whole
 * 31-page self-help packet -- instructions, a county petition, a certificate,
 * an objection, a non-objection, a notice, an affirmation, a notice of hearing
 * and, on its last five pages, the order. Its caption prints "COUNTY OF SAN
 * JUAN" and "ELEVENTH JUDICIAL DISTRICT COURT" as page content, its case-number
 * template is "D-1116-EX-____", it is dated January 28, 2022, and its order
 * recites "NMSA 1978 Sections 29-3A-4 to -7 (2019)" -- the statute BEFORE the
 * 2021 amendment this track's eligibility list is taken from. The track's own
 * record already carries, as a release blocker, the question whether the
 * district packets have been reissued to match the rule as approved October
 * 31, 2025. Neither fixture files in San Juan County, so the condition is not
 * met; the shared host renders whole pinned binaries and this lane may not
 * change it; and rendering a county-captioned, pre-amendment packet into a
 * statewide family would be promoting a county-local form statewide. So the
 * digest is resolved by content hash and recorded in the source receipt as a
 * reference that was NOT rendered, the component is reconciled against the
 * manifest as a conditional component whose condition is not met, and the
 * participant is told where the order comes from.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 * This lane runs with --no-raster; rendering is central.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runNmFamily, resolveSourcesByHash, ROOT,
  WRITE, SUPPLY, HELD_NOT_WRITTEN, PROTECT, ELECTION, ATTORNEY, INAPPLICABLE, OPTIONAL, NOT_A_BLANK, SIGNATURE
} from "./rcap-nm-flat-forms/nm-packet-host.mjs";
import { FORM_4_960_1, dictionary4960_1 } from "./rcap-nm-flat-forms/nm-form-4-960-1.mjs";
import { FORM_4_222, DICTIONARY_4_222, PRINTED_BLANKS_4_223, PRINTED_DISTRICT_FINDING, PRINTED_DISTRICT_IN_THE_CAPTION }
  from "./rcap-nm-flat-forms/nm-form-4-222.mjs";

const thisFile = fileURLToPath(import.meta.url);
const FAMILY_ID = "nm_release_without_conviction-set";
const OUT = "data/rcap-all50/overlays/census-v1/nm/nm-release-without-conviction-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-nm_release_without_conviction-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "NM",
  routeKey: "obligation:track-pathway:NM:nm_release_without_conviction:no-conviction-released-without-conviction",
  routeSelectionId: "nm-release-without-conviction-set-4-952-4-955-4-959-4-960.2-4-960.1-4-222",
  publicLabel: "Expunge a New Mexico case that did not end in a conviction",
  authority:
    "NMSA 1978, Section 29-3A-4; Rule 1-077.1 NMRA; Rule 1-079 NMRA; Forms 4-952, 4-955, 4-959, 4-960.1 and 4-960.2 "
    + "NMRA. Rule and forms approved by Supreme Court Order No. S-1-RCR-2024-00099, effective for all cases filed on or "
    + "after December 31, 2025."
});

const SERVICE_ON_THIS_TRACK =
  "by first-class United States mail on the district attorney for the judicial district where the charge originated "
  + "and on the New Mexico Department of Public Safety, P.O. Box 1628, Santa Fe, New Mexico 87504-1628";

/** The San Juan packet: bound by content hash, never rendered. */
const SAN_JUAN_PACKET = Object.freeze({
  sourceId: "official-form:NM-SAN-JUAN-NONCONVICTION-PACKET",
  documentId: "NM-SAN-JUAN-NONCONVICTION-PACKET",
  formNumber: "NM-SAN-JUAN-NONCONVICTION-PACKET",
  title: "Petition to Expunge (release without conviction): Instructions and All Forms, Eleventh Judicial District Court",
  sha256: "d804959b212e2a0df2e3aa51f17609ef237d583ff2cc189747e76b38c2520638",
  instrumentKind: "proposed_order",
  pages: 31
});

/* ------------------------------------------------------------------ *
 * Shared shapes, the same vocabulary the sibling families use.
 * ------------------------------------------------------------------ */

const HAND_BOX = (section, label, what) => ({
  section, label,
  ...ELECTION(
    "the participant marks this. The form draws the control as a printed character rather than as a stroked box or a "
    + "form field, so there is no measured control for this build to mark and no geometry to invent one from; "
    + `participant-instructions.md names it and says when to mark it: ${what}`
  )
});

const CAPTION = "Caption";

const captionRows = (keys) => ({
  [keys.county]: { section: CAPTION, label: "COUNTY OF", ...WRITE("matter.county") },
  [keys.district]: { section: CAPTION, label: "Judicial district of the district court in the caption", ...WRITE("matter.court") },
  [keys.name]: { section: CAPTION, label: "In re, the petitioner's name", ...WRITE("participant.full_legal_name") }
});

const ONE_LINE_ADDRESS_NOTE =
  "the shared fact registry has no one-line mailing-address fact; its only address descriptor is the street line, and a "
  + "street with no city on the line the court writes to is worse than a line the participant completes. Reported to the "
  + "owner of the registry in build-findings.json.";

const AGENCY_LINE_NOTE =
  "the platform's shared field semantics protect every agency, sheriff, police and law-enforcement line from being "
  + "written by a build, because a slot naming agencies is more often a court's list of who must seal than a "
  + "participant's statement of who holds. The value is in the participant's intake.";

const PROSECUTOR_LINE_NOTE =
  "the platform's shared field semantics protect every district-attorney and prosecutor line from being written by a build.";

/**
 * Which court the case was disposed of or originated in, read from the held
 * intake answer rather than guessed from the shape of the case number.
 *
 * `rwcOriginatingCourt` is a REQUIRED generation input on this track
 * (data/record-clearing/legal-design-specifications.json): "Where was the case
 * originally handled -- district, metropolitan, magistrate or municipal court,
 * and in what location?". The fixtures carry the court half of that answer,
 * which is the half that decides which branch of paragraph 4 and paragraph 12
 * the case uses. A build with no answer stops rather than picking a branch.
 */
const ORIGINATING_COURTS = new Set(["district", "metropolitan", "magistrate", "municipal"]);
const originatingCourt = (facts) => {
  const held = String(facts?.["matter.originating_court"] ?? "").toLowerCase();
  if (!ORIGINATING_COURTS.has(held)) {
    throw new Error(
      "matter.originating_court is required on this track and must be one of district, metropolitan, magistrate or "
      + `municipal; the fixture offers ${JSON.stringify(facts?.["matter.originating_court"] ?? null)}. Form 4-952 `
      + "paragraph 4 asks for the case number by the court it was in and paragraph 12 is a printed select-one over the "
      + "same four courts, and neither may be answered by assumption."
    );
  }
  return held;
};

const LOWER_COURT_LINE_NOTE =
  "the platform's shared field semantics protect every blank whose printed line names a magistrate: PROTECT_RULES "
  + "matches /magistrate/ under the \"court\" category, so \"Metropolitan/Magistrate/Municipal Court case number(s)\" "
  + "and \"[ ] Magistrate Court in ____ (location)\" refuse every write whatever fact is offered. That rule is shared "
  + "by the whole corpus and re-labelling the blank until it stops matching it would be wording a refusal to beat a "
  + "regex, so the line is left to the participant and the ground is stated. Reported in build-findings.json.";

const LOWER_COURT_LOCATION_NOTE =
  "the intake's required originating-court answer has two halves -- which court, and in what location -- and these "
  + "fixtures carry the court. The location is the participant's to write, and on a magistrate or municipal line the "
  + "shared protect rule above would refuse the write in any case. Reported in build-findings.json.";

const BULLET = NOT_A_BLANK("a short printed rule in the left margin, 15pt wide, on a baseline that carries no printed text: a paragraph mark of the form, not a place anyone writes");

/* ------------------------------------------------------------------ *
 * 4-952 NMRA — Petition to expunge arrest records and public records;
 * upon release without conviction. Four pages, ninety-nine measured blanks.
 * ------------------------------------------------------------------ */

const FORM_4_952 = Object.freeze({
  sourceId: "official-form:4-952", documentId: "NM-4-952", formNumber: "4-952",
  title: "Petition to expunge arrest records and public records; upon release without conviction",
  sha256: "951e5b8114dc6c31fa05b6230e2fe45509fa9c8f9ef99e3e6f384270a40977ca",
  strategy: "measured_flat_overlay", pages: 4, instrumentKind: "primary_filing"
});

const P1 = "1. Information about Petitioner";
const P2 = "2. Pending expungement cases";
const P3 = "3. Prior expungement applications";
const P4 = "4. The cases and records to be expunged";
const P5 = "5. Related appellate cases";
const P6 = "6. The charges Petitioner was released without conviction for";
const P7 = "7. Related cases";
const P8 = "8. One year since final disposition";
const P9 = "9. Other pending charges";
const P10 = "10. Agencies holding the records";
const P11 = "11. Who the petition will be mailed to";
const P12 = "12. Where the charges were disposed of or originated";
const P14 = "14. Additional documentation attached";
const P15 = "15. Telephonic or electronic appearance";
const SIGN = "Signature section";
const ATTY = "Attorney block (page 4)";

/**
 * Form 4-952's dictionary is a FUNCTION of the facts, and it is the only one in
 * these three families that is.
 *
 * Two of its blanks are decided by an answer the intake is required to collect
 * -- "Where was the case originally handled: district, metropolitan, magistrate
 * or municipal court, and in what location?" (rwcOriginatingCourt, requirement
 * "required", data/record-clearing/legal-design-specifications.json). Paragraph
 * 4 asks for the case number BY THE COURT IT WAS IN, on two different lines,
 * and paragraph 12 is a printed "(select one)" with four branches. A static
 * dictionary -- one blank, one fact, for every participant -- cannot answer
 * either without asserting something about a case it has not been told about,
 * which is what the delivered bytes did: the judicial district was written into
 * the District Court branch of paragraph 12 on a fixture whose case is a
 * MAGISTRATE case, and the held case number was written on neither paragraph-4
 * line under a reason that said the platform does not hold it.
 *
 * So the branch is chosen from the held answer instead. Where the case was
 * disposed of in the district court, the district-court lines carry the held
 * values and the lower-court lines are the participant's; where it was not, the
 * district-court lines are left empty as branches this case does not use, and
 * they say so.
 *
 * WHAT THIS STILL CANNOT DO, AND WHY IT IS NOT WORDED AROUND. The shared field
 * semantics protect every blank whose printed line names a magistrate:
 * PROTECT_RULES matches /magistrate/ under the "court" category, so
 * "Metropolitan/Magistrate/Municipal Court case number(s)" and "[ ] Magistrate
 * Court in ____ (location)" refuse every write, whatever fact is offered. That
 * rule is shared by every family in the corpus and is not this lane's to
 * change, and re-labelling a blank until it stops matching a protect rule is
 * the thing these counters exist to catch. On a lower-court case those two
 * lines are therefore left to the participant with the ground stated as it is:
 * the platform holds the value and the shared semantics refuse the write.
 */
const DICTIONARY_4_952 = (facts) => ({
  ...captionRows({ county: "p1-y61440-x14328", district: "p1-y59856-x7200", name: "p1-y54132-x9720" }),

  "p1-y41712-x12432": {
    section: CAPTION, label: "Petitioner is unrepresented by counsel",
    ...ELECTION("whether the petitioner is represented by counsel is a fact about them that the platform does not hold, and the attorney block on page 4 is left empty for the same reason. The form draws the control as a printed \"[ ]\" character, so there is no measured control to mark; participant-instructions.md tells the participant to mark this box if they are filing without a lawyer")
  },
  "p1-y41712-x26208": {
    section: CAPTION, label: "Petitioner is represented by counsel",
    ...ELECTION("the other half of the same election. No attorney-representation fact is held for this participant, and the form draws the control as a printed \"[ ]\" character with no measured geometry to mark")
  },

  "p1-y34416-x15960": { section: P1, label: "Date of Birth", ...WRITE("participant.date_of_birth") },
  "p1-y32832-x21336": { section: P1, label: "Current Mailing Address", ...WRITE("participant.street_address") },
  "p1-y31236-x11700": { section: P1, label: "City", ...WRITE("participant.city") },
  "p1-y31236-x28536": { section: P1, label: "State", ...WRITE("participant.state") },
  "p1-y31236-x45036": { section: P1, label: "Zip Code", ...WRITE("participant.zip") },
  "p1-y29652-x16764": { section: P1, label: "Home Phone #", ...SUPPLY("your home telephone number, if you have one", "the intake for this track asks for no telephone number and no e-mail address. Home, work and cell are three different facts, and writing one held number into any of them would assert on a petition sworn under penalty of perjury which kind of number it is.") },
  "p1-y29844-x33372": { section: P1, label: "Work Phone #", ...SUPPLY("your work telephone number, if you have one") },
  "p1-y29652-x44100": { section: P1, label: "Cell #", ...SUPPLY("your mobile telephone number, if you have one") },
  "p1-y25080-x9000": {
    section: P1, label: "Other names or aliases by which Petitioner has been known",
    ...SUPPLY("every other name your records might be under: a former name, a nickname, an alias", "the shared fact registry has no descriptor for other names or aliases: the only name descriptor whose pattern reaches a line like this is the petitioner's own FULL LEGAL NAME, so binding it would put the petitioner's legal name on the alias line of a petition sworn under penalty of perjury. Reported to the owner of the registry in build-findings.json.")
  },

  "p1-y22116-x9000": HAND_BOX(P2, "Petitioner has no pending expungement cases", "mark it if you have no other expungement case pending in this judicial district"),
  "p1-y22116-x35520": { section: P2, label: "Judicial district in which Petitioner has no pending expungement cases", ...WRITE("matter.court") },
  "p1-y20736-x9000": HAND_BOX(P2, "Petitioner has the following pending expungement cases", "mark it instead if you do have other expungement cases pending, and list their case numbers on the two lines below"),
  /*
   * THE PENDING-EXPUNGEMENT BRANCH IS NOT THIS PETITION'S BRANCH.
   *
   * The same defect the sibling families carried on Forms 4-951 and 4-953, on
   * the identically worded item 2 of this one. These two blanks belong to the
   * second branch of the either/or -- the branch that asserts the petitioner
   * HAS other expungement cases pending -- and the build wrote matter.court,
   * the district this petition is filed in, into both, with neither box marked
   * and the case-number lines below them blank. The platform holds no
   * pending-expungement fact, and the district of a pending case is a different
   * fact from the district of this filing. The first branch's blank keeps its
   * write: it names this filing's own district and asserts nothing about any
   * other case.
   */
  "p1-y20736-x43980": {
    section: P2, label: "Judicial district in which Petitioner has pending expungement cases",
    ...SUPPLY(
      "the judicial district your other expungement cases are pending in, if you have any and you mark the second box; if you have none, mark the first box and leave this line empty",
      "this line belongs to the second branch of item 2's either/or. The platform holds no pending-expungement fact -- the intake for this track collects no other expungement case, its district or its number -- and the judicial district THIS petition is filed in is a different fact from the district another case is pending in. Writing it here asserted a district for cases the participant has not claimed exist."
    )
  },
  "p1-y17976-x26868": {
    section: P2, label: "Judicial district court the pending expungement cases are before",
    ...SUPPLY(
      "the judicial district court those pending cases are before, if you marked the second box; leave it empty if you have no other expungement case pending",
      "the second half of the same unelected branch. The platform holds no pending-expungement fact, so it holds no court those cases are before."
    )
  },
  "p1-y16596-x9000": { section: P2, label: "Pending expungement case numbers, first line", ...SUPPLY("the case number of any other expungement case of yours pending in this judicial district") },
  "p1-y15216-x9000": { section: P2, label: "Pending expungement case numbers, second line", ...SUPPLY("a second pending expungement case number, if you have one") },

  "p1-y12456-x9000": HAND_BOX(P3, "Petitioner has never applied for expungement and been denied", "mark it if you have never been denied an expungement"),
  "p1-y11076-x9000": HAND_BOX(P3, "Petitioner has applied for expungement and been denied", "mark it instead if you have been denied, and give the case numbers"),
  "p1-y9696-x32184": { section: P3, label: "Expungement case numbers in which Petitioner was denied, first line", ...SUPPLY("the case number of any expungement you were denied") },
  "p2-y70344-x9000": { section: P3, label: "Expungement case numbers in which Petitioner was denied, second line", ...SUPPLY("a second case number in which you were denied, if there is one") },
  "p2-y68964-x9000": { section: P3, label: "Expungement case numbers in which Petitioner was denied, third line", ...SUPPLY("a third case number in which you were denied, if there is one") },

  /*
   * PARAGRAPH 4: THE CASE NUMBER GOES ON THE LINE FOR THE COURT THAT HELD THE
   * CASE, AND ON NO OTHER.
   *
   * The held answer decides it. On a district-court case the number is written
   * where the form asks for a district-court number; on a lower-court case that
   * line has no value in the world -- the case has no district-court number --
   * and it is left empty as a line this case does not use, rather than filled
   * or excused as a fact nobody holds.
   */
  ...(originatingCourt(facts) === "district"
    ? {
      "p2-y63444-x23856": { section: P4, label: "District Court case number(s) that are the subject of the petition", ...WRITE("matter.case_number") },
      "p2-y60684-x9000": {
        section: P4, label: "Metropolitan, Magistrate or Municipal Court case number(s)",
        ...SUPPLY(
          "the case number any metropolitan, magistrate or municipal court gave this matter, if it was in one of those courts too; your district court number is already written on the line above",
          "the held originating-court answer for this case is the district court and its number is written on the district-court line. The platform holds no second number for a lower court, and it does not invent one."
        )
      }
    }
    : {
      "p2-y63444-x23856": {
        section: P4, label: "District Court case number(s) that are the subject of the petition",
        ...INAPPLICABLE(
          `the held originating-court answer for this case is the ${originatingCourt(facts)} court, so the case has no `
          + "district court case number. This line asks for the number of a case the district court held, and paragraph "
          + "4 prints a separate line for a metropolitan, magistrate or municipal number immediately below it.",
          "the case was not a district court case, so there is no district court number to write here and none is "
          + "invented. The number this case does have belongs on the next line."
        )
      },
      "p2-y60684-x9000": {
        section: P4, label: "Metropolitan, Magistrate or Municipal Court case number(s)",
        ...HELD_NOT_WRITTEN(
          "your case number, on this line -- your case was in a metropolitan, magistrate or municipal court, and this is the line the form gives for it",
          `the platform holds this case number as matter.case_number and the write is refused rather than unavailable -- the value itself is not repeated into this record. ${LOWER_COURT_LINE_NOTE}`
        )
      }
    }),
  "p2-y59304-x29880": { section: P4, label: "Law Enforcement Agency case number(s)", ...SUPPLY("the case number the law enforcement agency gave this matter, from your records", AGENCY_LINE_NOTE) },
  "p2-y57924-x17856": { section: P4, label: "Arrest number(s)", ...SUPPLY("the arrest number from your fingerprint card or RAP sheet") },

  "p2-y53784-x25188": { section: P5, label: "Court of Appeals case number(s) related to the petition", ...OPTIONAL("most petitions have no related appellate case; the participant fills this only if theirs does, and the platform holds no appellate record") },
  "p2-y52404-x24216": { section: P5, label: "Supreme Court case number(s) related to the petition", ...OPTIONAL("most petitions have no related Supreme Court case; the participant fills this only if theirs does") },

  "p2-y46884-x17856": { section: P6, label: "Date of arrest for the first charge", ...SUPPLY("the date you were arrested on the first charge you are asking to expunge, from the record", "the intake collects an approximate date and this line goes on a petition sworn under penalty of perjury.") },
  "p2-y45504-x32124": { section: P6, label: "Name and statute or ordinance number of the first offence", ...SUPPLY("the name of the offence and the statute or ordinance number, exactly as the record states them") },
  "p2-y44124-x28656": HAND_BOX(P6, "Final disposition was an acquittal or a finding of not guilty", "mark the one way the case ended: this one if you were acquitted or found not guilty"),
  "p2-y44124-x45792": HAND_BOX(P6, "Final disposition was a nolle prosequi", "this one if the prosecutor dropped the charge by nolle prosequi"),
  "p2-y42744-x13428": HAND_BOX(P6, "Final disposition was a no bill", "this one if the grand jury returned a no bill"),
  "p2-y42744-x18240": HAND_BOX(P6, "Final disposition was a referral to a pre-prosecution diversion program", "this one if you were referred to a pre-prosecution diversion program and completed it"),
  "p2-y42744-x41652": HAND_BOX(P6, "Final disposition was an Order of Conditional Discharge under Section 31-20-13", "this one if the case ended in a conditional discharge under Section 31-20-13 NMSA 1978"),
  "p2-y41364-x35760": HAND_BOX(P6, "Final disposition was another dismissal or discharge", "this one if the case was dismissed or discharged some other way, and explain how on the two lines that follow"),
  "p2-y39984-x14256": { section: P6, label: "Explanation of the other dismissal or discharge, first line", ...SUPPLY("how the case was dismissed or discharged, if you marked the other-dismissal box; otherwise leave it empty") },
  "p2-y38604-x9000": { section: P6, label: "Explanation of the other dismissal or discharge, second line", ...SUPPLY("the rest of that explanation, if it needs a second line") },
  "p2-y37224-x45384": { section: P6, label: "Degree of the first offence, if known", ...SUPPLY("the degree of the offence if you know it -- misdemeanor, petty misdemeanor, fourth degree felony, municipal ordinance violation") },
  "p2-y35844-x9000": { section: P6, label: "Degree of the first offence, continuation line", ...SUPPLY("the rest of the degree entry, if it did not fit on the line above") },
  "p2-y34464-x21264": { section: P6, label: "Date of final disposition of the first charge", ...SUPPLY("the date the case reached its final disposition, from the court's record -- the one-year period in paragraph 8 runs from this date") },
  "p2-y31704-x9000": HAND_BOX(P6, "Additional pages of charges are attached", "mark it if you are asking to expunge more than one charge and have attached a page giving the same details for each"),

  "p2-y28944-x10404": HAND_BOX(P7, "Petitioner has no cases related to the charges sought to be expunged", "mark it if no other case was joined with this one"),
  "p2-y27564-x9000": HAND_BOX(P7, "The following cases are related to the charges sought to be expunged", "mark it instead if a case was joined with a co-defendant or as the result of a plea, and list them"),
  "p2-y23424-x9000": { section: P7, label: "Related cases, first line", ...SUPPLY("the name and number of any case joined with yours, whether with a co-defendant or as the result of a plea") },
  "p2-y22044-x9000": { section: P7, label: "Related cases, second line", ...SUPPLY("a second related case, if there is one") },
  "p2-y20664-x9000": { section: P7, label: "Related cases, third line", ...SUPPLY("a third related case, if there is one") },

  "p2-y17904-x10404": HAND_BOX(P8, "It has been one year or more since the date of the final disposition", "mark it only if a full year has passed since the final disposition date you wrote in paragraph 6. Section 29-3A-4 requires it, and if a year has not passed you are not yet eligible"),
  "p2-y13764-x10404": HAND_BOX(P9, "There is no other charge or proceeding pending against Petitioner", "mark it if nothing is pending against you anywhere. The court must find this before it can grant the petition"),

  "p2-y8244-x9000": HAND_BOX(P10, "Agency holding records: District Court", "mark it if the district court holds records of this case"),
  "p2-y8244-x20340": { section: P10, label: "Judicial district of the District Court holding the records", ...WRITE("matter.court") },
  "p3-y70344-x9000": HAND_BOX(P10, "Agency holding records: County Sheriff's Department", "mark it if the county sheriff holds records of this case"),
  "p3-y70344-x10416": { section: P10, label: "County of the Sheriff's Department holding the records", ...SUPPLY("the county whose sheriff's department holds records of this case, which need not be the county you are filing in", AGENCY_LINE_NOTE) },
  "p3-y68964-x9000": HAND_BOX(P10, "Agency holding records: District Attorney", "mark it if the district attorney holds records of this case. On this track the district attorney is served with the petition, so it almost certainly does"),
  "p3-y68964-x22320": { section: P10, label: "Judicial district of the prosecuting office that holds the records", ...SUPPLY("the judicial district of the district attorney who holds records of this case", PROSECUTOR_LINE_NOTE) },
  "p3-y67584-x9000": HAND_BOX(P10, "Agency holding records: New Mexico Department of Public Safety", "mark it if the Department of Public Safety holds records of this case. On this track it is served with the petition, so it almost certainly does"),
  "p3-y66204-x9000": HAND_BOX(P10, "Agency holding records: Law Enforcement Agency that arrested Petitioner", "mark it if a law enforcement agency holds records of this case, and write the agency's name on the line beside the box"),
  "p3-y66204-x43644": { section: P10, label: "Name of the Law Enforcement Agency that arrested Petitioner, first line", ...SUPPLY("the law enforcement agency that arrested you, which is the agency you named when you answered our questions", AGENCY_LINE_NOTE) },
  "p3-y64824-x9000": { section: P10, label: "Name of the Law Enforcement Agency that arrested Petitioner, second line", ...SUPPLY("the rest of the agency's name and its address, if the line above is not enough") },
  "p3-y63444-x9000": HAND_BOX(P10, "Agency holding records: Metropolitan, Magistrate or Municipal Court", "mark it if a metropolitan, magistrate or municipal court holds records of this case -- on this track that is usually the court the case was in"),
  "p3-y63444-x31968": { section: P10, label: "Location of the Metropolitan, Magistrate or Municipal Court holding the records", ...SUPPLY("the town or city that court sits in -- the intake collects the court and not the place it sits") },
  "p3-y62064-x9000": HAND_BOX(P10, "Agency holding records: New Mexico State Police Investigations Bureau", "mark it if the State Police Investigations Bureau holds records of this case"),
  "p3-y60684-x9000": HAND_BOX(P10, "Agency holding records: Other", "mark it if some other agency holds records of this case, and name it on the line beside the box"),
  "p3-y60492-x13428": { section: P10, label: "Other agency holding the records", ...SUPPLY("the name and address of any other agency that holds records of this case") },
  "p3-y58176-x7608": BULLET,

  "p3-y57924-x11604": HAND_BOX(P11, "A copy of this Petition will be mailed to the two responding parties", "mark it, and then actually mail it. On this track service is required: you mail the petition and everything attached to it, by first-class United States mail, to the district attorney where the charge originated and to the Department of Public Safety"),
  "p3-y55164-x30036": { section: P11, label: "Judicial district of the prosecuting office the petition will be mailed to", ...SUPPLY("the judicial district of the district attorney where your charge originated", PROSECUTOR_LINE_NOTE) },
  "p3-y51024-x16404": { section: P11, label: "Address of the prosecuting office the petition will be mailed to", ...SUPPLY("the street address of that district attorney's office, which you get from the court or from the office itself") },
  "p3-y44376-x7608": BULLET,

  /*
   * PARAGRAPH 12 IS A PRINTED "(SELECT ONE)" AND ONLY ONE BRANCH IS THIS CASE'S.
   *
   * The build wrote the judicial district into the District Court branch on
   * every participant, including one whose case is a magistrate case: the
   * delivered page 3 read "[ ] District Court in the Seventh Judicial District"
   * with no box marked and the three lower-court lines empty, which is the very
   * assertion the paragraph-4 refusal was made to avoid, one paragraph later
   * and with a different fact. The branch is now taken from the held
   * originating-court answer, and the branches the case does not use carry
   * nothing.
   */
  "p3-y39984-x9000": HAND_BOX(P12, "Charges were disposed of or originated in the District Court", "mark the one court the charges were disposed of or originated in"),
  "p3-y39984-x20340": originatingCourt(facts) === "district"
    ? { section: P12, label: "Judicial district of the District Court the charges were disposed of or originated in", ...WRITE("matter.court") }
    : {
      section: P12, label: "Judicial district of the District Court the charges were disposed of or originated in",
      ...INAPPLICABLE(
        `the held originating-court answer for this case is the ${originatingCourt(facts)} court, and paragraph 12 is a `
        + "printed select-one over four courts. The District Court branch is not the branch this case uses, and the "
        + "case was never disposed of in a district court whose judicial district could go on this line.",
        "the charges were not disposed of or originated in the district court, so this branch of the select-one carries "
        + "nothing. The participant marks the branch their case used and writes its location on that line."
      )
    },
  "p3-y38604-x9000": HAND_BOX(P12, "Charges were disposed of or originated in the Metropolitan Court", "mark it instead if they were in a metropolitan court"),
  "p3-y38604-x21228": { section: P12, label: "Location of the Metropolitan Court the charges were disposed of or originated in", ...SUPPLY("the town or city that metropolitan court sits in", LOWER_COURT_LOCATION_NOTE) },
  "p3-y37224-x9000": HAND_BOX(P12, "Charges were disposed of or originated in the Magistrate Court", "mark it instead if they were in a magistrate court"),
  "p3-y37224-x20100": { section: P12, label: "Location of the Magistrate Court the charges were disposed of or originated in", ...SUPPLY("the town or city that magistrate court sits in", LOWER_COURT_LOCATION_NOTE) },
  "p3-y35844-x9000": HAND_BOX(P12, "Charges were disposed of or originated in the Municipal Court", "mark it instead if they were in a municipal court"),
  "p3-y35844-x19908": { section: P12, label: "Location of the Municipal Court the charges were disposed of or originated in", ...SUPPLY("the town or city that municipal court sits in", LOWER_COURT_LOCATION_NOTE) },
  "p3-y33336-x7608": BULLET,
  "p3-y27816-x7608": BULLET,

  "p3-y19284-x14160": { section: P14, label: "Other documentation attached", ...SUPPLY("a list of any other documents you are attaching beyond the docket or arrest sheet and the final-disposition record the form already lists") },
  "p3-y14016-x7608": BULLET,
  "p3-y13764-x11604": HAND_BOX(P15, "Petitioner wishes to attend any hearings by telephonic or other electronic means", "mark it if you want to attend any hearing by telephone or video. Rule 1-077.1(J) NMRA allows it on this form and no separate motion is needed"),
  "p3-y8244-x7200": NOT_A_BLANK(
    "a full-width printed divider at the foot of page 3, immediately before the heading \"SIGNATURE SECTION\" that opens "
    + "page 4. It runs the whole text column, sits under no prompt and has no caption; writing on it would put a value "
    + "across the head of the signature section"
  ),

  "p4-y63444-x7200": { section: SIGN, label: "Printed name of Petitioner", ...WRITE("participant.full_legal_name") },
  "p4-y63444-x36000": { section: SIGN, label: "Date beside the printed name of Petitioner", ...PROTECT(SIGNATURE, "signature or date field; never completed by this build. The petition is affirmed under penalty of perjury under the laws of the State of New Mexico, and the date it is affirmed is the date the participant signs it") },
  "p4-y60684-x7200": { section: SIGN, label: "Signature of Petitioner", ...PROTECT(SIGNATURE, "signature or date field; the participant signs their own petition and no build signs it for them") },
  "p4-y57924-x7200": { section: SIGN, label: "Mailing Address of the Petitioner on page 4", ...SUPPLY("your full mailing address on this one line: street, city, state and ZIP. It is the same address you gave us, written out in parts in paragraph 1", ONE_LINE_ADDRESS_NOTE) },
  "p4-y55164-x7200": { section: SIGN, label: "Telephone Number of the Petitioner on page 4", ...SUPPLY("your telephone number, so the court can reach you") },
  "p4-y55164-x36000": { section: SIGN, label: "Email of the Petitioner on page 4", ...SUPPLY("your e-mail address, if you have one") },

  "p4-y51024-x7200": { section: ATTY, label: "Attorney Name (if applicable)", ...ATTORNEY("the form marks this block \"if applicable\"; no attorney-representation fact is held for this participant and this packet is prepared for a self-represented petitioner") },
  "p4-y51024-x36000": { section: ATTY, label: "Date beside the attorney's name", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant, and a date on a signature block is never completed by this build") },
  "p4-y48264-x7200": { section: ATTY, label: "Attorney Signature", ...ATTORNEY("signature field in the attorney block; no attorney-representation fact is held for this participant and no build signs for an attorney") },
  "p4-y45504-x7200": { section: ATTY, label: "Mailing Address of the attorney", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") },
  "p4-y42336-x7200": { section: ATTY, label: "Telephone Number of the attorney", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") },
  "p4-y42336-x36000": { section: ATTY, label: "Email of the attorney", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") }
});

/* ------------------------------------------------------------------ *
 * 4-955 NMRA — Certificate of service; expungement of records upon release
 * without conviction. Caption written; nothing else. Everything below the
 * caption is the petitioner certifying, under penalty of perjury, when they
 * posted the petition and to whom, and service has not happened when this
 * packet is prepared.
 * ------------------------------------------------------------------ */

const FORM_4_955 = Object.freeze({
  sourceId: "official-form:4-955", documentId: "NM-4-955", formNumber: "4-955",
  title: "Certificate of service; expungement of records upon release without conviction",
  sha256: "99482e163d9addac8440be3c5628e88501061c82adf8ea4320167bda67952e11",
  strategy: "measured_flat_overlay", pages: 2, instrumentKind: "certificate_of_service"
});

const CERT = "The certificate, completed after you have mailed";
const CERT_SIGN = "The certificate's signature block";
const CERT_ATTY = "The certificate's attorney block";

const AFTER_MAILING = (label, what) => ({
  section: CERT, label, ...SUPPLY(what, "everything below the caption of a certificate of service is the petitioner certifying under penalty of perjury when they posted the petition and to whom. Service has not happened when the packet is prepared and the platform has no knowledge of it; the shared field semantics protect a service block for the same reason.")
});

const DICTIONARY_4_955 = {
  ...captionRows({ county: "p1-y63970-x14330", district: "p1-y62590-x7202", name: "p1-y58450-x9721" }),

  "p1-y47347-x21947": AFTER_MAILING("The day of the month you mailed the petition", "the day of the month on which you posted the petition"),
  "p1-y47347-x30089": AFTER_MAILING("The month you mailed the petition", "the month in which you posted the petition"),
  "p1-y47347-x38709": AFTER_MAILING("The year you mailed the petition", "the year in which you posted the petition"),
  "p1-y44587-x22254": AFTER_MAILING("The date the petition was filed", "the date the court clerk stamped your petition as filed, which is not the date you posted it"),
  "p1-y40423-x10802": HAND_BOX(CERT, "Mailed to the New Mexico Department of Public Safety", "mark it once you have posted a copy to the Department of Public Safety at P.O. Box 1628, Santa Fe, New Mexico 87504-1628, which the form prints for you"),
  "p1-y37663-x10802": HAND_BOX(CERT, "Mailed to the district attorney", "mark it once you have posted a copy to the district attorney for the judicial district where your charge originated"),
  "p1-y37663-x27314": AFTER_MAILING("Judicial district of the prosecuting office you mailed to", "the judicial district of the district attorney you posted to"),
  "p1-y36281-x14402": AFTER_MAILING("Address of the prosecuting office you mailed to", "the street address you posted it to"),
  "p1-y32129-x7202": HAND_BOX(CERT, "Petitioner is pro se", "mark it if you are filing without a lawyer"),
  "p1-y32129-x30581": HAND_BOX(CERT, "Petitioner is represented by counsel", "mark it instead if a lawyer is representing you"),

  "p1-y24029-x7202": AFTER_MAILING("Petitioner Printed Name in the certificate", "your name, printed, beneath the declaration that the statements in the certificate are true"),
  "p1-y21269-x7202": AFTER_MAILING("Petitioner Address in the certificate", "your mailing address"),
  "p1-y18506-x7202": AFTER_MAILING("Petitioner Telephone Number in the certificate", "your telephone number"),
  "p1-y15746-x7202": { section: CERT_SIGN, label: "Petitioner Signature in the certificate", ...PROTECT(SIGNATURE, "signature or date field; the certificate is declared under penalty of perjury and the participant signs it themselves, after they have posted the petition") },
  "p1-y12986-x7202": { section: CERT_SIGN, label: "Date of Signature beneath the Petitioner's signature", ...PROTECT(SIGNATURE, "signature or date field; never completed by this build. It is the date the participant signs a statement made under penalty of perjury") },

  "p1-y24029-x30581": { section: CERT_ATTY, label: "Attorney Printed Signature in the certificate", ...ATTORNEY("the right-hand column of this certificate is the attorney's block; no attorney-representation fact is held for this participant") },
  "p1-y21269-x30581": { section: CERT_ATTY, label: "Attorney Address in the certificate", ...ATTORNEY("part of the attorney's block; no attorney-representation fact is held for this participant") },
  "p1-y18506-x30581": { section: CERT_ATTY, label: "Attorney Telephone Number in the certificate", ...ATTORNEY("part of the attorney's block; no attorney-representation fact is held for this participant") },
  "p1-y15746-x30581": { section: CERT_ATTY, label: "Attorney Signature in the certificate", ...ATTORNEY("signature field in the attorney's block; no attorney-representation fact is held for this participant and no build signs for an attorney") },
  "p1-y12986-x30581": { section: CERT_ATTY, label: "Date of Signature beneath the attorney's signature", ...ATTORNEY("part of the attorney's block; no attorney-representation fact is held for this participant") }
};

/* ------------------------------------------------------------------ *
 * 4-959 NMRA — Notice of completion of briefing; upon release without
 * conviction. Filed sixty-three days or more after service; everything it
 * states is about that period.
 * ------------------------------------------------------------------ */

const FORM_4_959 = Object.freeze({
  sourceId: "official-form:4-959", documentId: "NM-4-959", formNumber: "4-959",
  title: "Notice of completion of briefing; upon release without conviction",
  sha256: "1ec4057eef1340456e65abe4708c9b174b5ffacd313e7b52c145989963b53148",
  strategy: "measured_flat_overlay", pages: 3, instrumentKind: "second_stage_notice"
});

const NOTICE = "What the notice states";
const NOTICE_SIGN = "The notice's signature block";
const NOTICE_ATTY = "The notice's attorney block";
const NOTICE_CERT = "The certificate of service at the foot of the notice";

const SECOND_STAGE = (section, label, what) => ({
  section, label, ...SUPPLY(what, "this form is filed sixty-three days or more after the petition is served and states what happened in that period. None of it is knowable when the packet is prepared.")
});

const STRIKE = (word) => NOT_A_BLANK(
  `a short stroke drawn through the bracketed word "${word}" on the printed line beneath it: the strike-through the 2025 `
  + "amendments use to mark deleted text, not a place anyone writes. It carries no glyphs ON it because the struck word "
  + "sits below its baseline rather than above it, which is why the underline reader did not classify it"
);

const DICTIONARY_4_959 = {
  ...captionRows({ county: "p1-y62616-x14328", district: "p1-y61032-x7200", name: "p1-y55308-x9720" }),

  "p1-y36384-x10800": HAND_BOX(NOTICE, "Notice of the Petition has been provided by first-class mail", "mark it once you have posted the petition to both responding parties"),
  "p1-y34092-x14400": HAND_BOX(NOTICE, "Notice was provided to the District Attorney", "mark it once you have posted a copy to the district attorney"),
  "p1-y34092-x29400": SECOND_STAGE(NOTICE, "Judicial district of the prosecuting office the notice was provided to", "the judicial district of the district attorney you posted to"),
  "p1-y32712-x14400": HAND_BOX(NOTICE, "Notice was provided to the New Mexico Department of Public Safety", "mark it once you have posted a copy to the Department of Public Safety"),
  "p1-y29952-x10800": HAND_BOX(NOTICE, "At least sixty-three days have passed since Petitioner mailed the Petition", "mark it only when sixty-three days have actually passed. Rule 1-077.1(G) gives the responding parties sixty days from service and Rule 1-006(C) adds three for service by mail"),
  "p1-y26424-x19740": STRIKE("Attorney"),
  "p1-y26172-x11208": HAND_BOX(NOTICE, "The District Attorney's response", "mark the heading, then mark one of the three lines below it"),
  "p1-y24132-x28104": STRIKE("Has"),
  "p1-y23880-x14400": HAND_BOX(NOTICE, "The District Attorney has filed a Notice of Non-Objection", "mark it if the district attorney filed a non-objection"),
  "p1-y22500-x14400": HAND_BOX(NOTICE, "The District Attorney has filed an objection", "mark it if the district attorney objected"),
  "p1-y21120-x14400": HAND_BOX(NOTICE, "The District Attorney has not filed a response", "mark it if the district attorney did nothing"),
  "p1-y18612-x32700": STRIKE("Safety"),
  "p1-y18360-x10800": NOT_A_BLANK(
    "an empty bracket pair printed around the Department of Public Safety response heading's own tick glyph on the same "
    + "baseline -- an amendment bracket of the 2025 revision enclosing the control, not a second control. The control "
    + "itself is the symbol-font glyph measured at x112.08 on this baseline and is disposed there"
  ),
  "p1-y18360-x11208": HAND_BOX(NOTICE, "The New Mexico Department of Public Safety's response", "mark the heading, then mark one of the three lines below it"),
  "p1-y16332-x20580": STRIKE("Has"),
  "p1-y16080-x14400": HAND_BOX(NOTICE, "The Department of Public Safety has filed a Notice of Non-Objection", "mark it if the Department filed a non-objection"),
  "p1-y14700-x14400": HAND_BOX(NOTICE, "The Department of Public Safety has filed an objection", "mark it if the Department objected"),
  "p1-y13320-x14400": HAND_BOX(NOTICE, "The Department of Public Safety has not filed a response", "mark it if the Department did nothing"),
  "p1-y10560-x10800": HAND_BOX(NOTICE, "An Affirmation in Support of Expungement (Form 4-960.2) is included", "mark it, and attach the completed Form 4-960.2 that is in this packet"),

  "p2-y68964-x7200": { section: NOTICE_SIGN, label: "Printed name of Petitioner on the notice", ...WRITE("participant.full_legal_name") },
  "p2-y66204-x7200": { section: NOTICE_SIGN, label: "Signature of Petitioner on the notice", ...PROTECT(SIGNATURE, "signature or date field; the participant signs their own notice") },
  "p2-y63444-x7200": { section: NOTICE_SIGN, label: "Mailing Address of the Petitioner on the notice", ...SUPPLY("your full mailing address on this one line: street, city, state and ZIP", ONE_LINE_ADDRESS_NOTE) },
  "p2-y60684-x7200": { section: NOTICE_SIGN, label: "Telephone Number of the Petitioner on the notice", ...SUPPLY("your telephone number") },
  "p2-y57924-x7200": { section: NOTICE_SIGN, label: "Date beneath the Petitioner's signature on the notice", ...PROTECT(SIGNATURE, "signature or date field; never completed by this build. It is the date the participant signs the notice, which is at least sixty-three days after this packet is prepared") },

  "p2-y53784-x32400": { section: NOTICE_ATTY, label: "Attorney Name (if applicable) on the notice", ...ATTORNEY("the form marks this block \"if applicable\"; no attorney-representation fact is held for this participant") },
  "p2-y51024-x32400": { section: NOTICE_ATTY, label: "Attorney Signature on the notice", ...ATTORNEY("signature field in the attorney block; no attorney-representation fact is held for this participant and no build signs for an attorney") },
  "p2-y48264-x32400": { section: NOTICE_ATTY, label: "Mailing Address of the attorney on the notice", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") },
  "p2-y45504-x32400": { section: NOTICE_ATTY, label: "Telephone Number of the attorney on the notice", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") },
  "p2-y42744-x32400": { section: NOTICE_ATTY, label: "Email of the attorney on the notice", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") },

  "p2-y35808-x22332": AFTER_MAILING("The day of the month you mailed this notice", "the day of the month on which you posted this notice"),
  "p2-y35808-x31944": AFTER_MAILING("The month you mailed this notice", "the month in which you posted this notice"),
  "p2-y35808-x40956": AFTER_MAILING("The year you mailed this notice", "the year in which you posted this notice"),
  "p2-y31644-x7200": AFTER_MAILING("Name of the prosecuting office this notice was mailed to", "the district attorney's office you posted this notice to"),
  "p2-y30264-x22164": AFTER_MAILING("Judicial district of that prosecuting office", "the judicial district of that district attorney"),
  "p2-y28884-x7200": AFTER_MAILING("Address of the prosecuting office this notice was mailed to", "the street address you posted it to"),
  "p2-y26124-x7200": AFTER_MAILING("Telephone of the prosecuting office this notice was mailed to", "the telephone number of that office"),
  "p2-y15084-x10092": AFTER_MAILING("Telephone number of the New Mexico Department of Public Safety, after the printed area code", "the rest of the Department of Public Safety's telephone number; the form prints the area code (505) for you"),
  "p2-y10944-x32400": { section: NOTICE_CERT, label: "Signature of the person sending the notice", ...PROTECT(SIGNATURE, "signature or date field; whoever posts the notice signs this certificate themselves") },
  "p2-y8184-x32400": { section: NOTICE_CERT, label: "Date of signature of the person sending the notice", ...PROTECT(SIGNATURE, "signature or date field; never completed by this build. The caption \"Date of signature\" for this line is printed at the head of page 3") }
};

/* ------------------------------------------------------------------ *
 * 4-960.2 NMRA — Affirmation in support of expungement; upon release
 * without conviction.
 * ------------------------------------------------------------------ */

const FORM_4_960_2 = Object.freeze({
  sourceId: "official-form:4-960.2", documentId: "NM-4-960.2", formNumber: "4-960.2",
  title: "Affirmation in support of expungement; upon release without conviction",
  sha256: "fc22cdcb28d74dfd23de5931fc2d2825c9488589894f5ea75a284bfb4347154e",
  strategy: "measured_flat_overlay", pages: 2, instrumentKind: "second_stage_affirmation"
});

const AFF = "What the affirmation states";
const AFF_SIGN = "The affirmation's signature block";

const AFFIRMED = (label, what) => ({
  section: AFF, label,
  ...SUPPLY(`${what} -- as it is on the day you sign, which is at least sixty-three days after this packet was prepared`,
    "the affirmation is sworn under penalty of perjury and describes the participant's situation on the day they sign it. Nothing in it is knowable when the packet is prepared.")
});

const DICTIONARY_4_960_2 = {
  ...captionRows({ county: "p1-y63970-x14328", district: "p1-y62590-x7202", name: "p1-y58450-x9721" }),

  "p1-y51499-x8186": { section: AFF, label: "I, (Petitioner name), am requesting the expungement", ...WRITE("participant.full_legal_name") },
  "p1-y45967-x9002": HAND_BOX(AFF, "No charge or criminal proceeding is pending against me in any state or federal court", "mark it only if nothing at all is pending against you anywhere on the day you sign. This is the finding the court must make before it grants the petition"),
  "p1-y39019-x9002": HAND_BOX(AFF, "The following charges are pending against me in New Mexico state court", "mark it instead if something is pending in a New Mexico state court, and describe it on the two lines below"),
  "p1-y36269-x9002": AFFIRMED("Pending New Mexico state court charge or proceeding, first line", "the charge or proceeding pending against you in New Mexico state court, and where"),
  "p1-y34889-x9002": AFFIRMED("Pending New Mexico state court charge or proceeding, second line", "the rest of that description"),
  "p1-y32309-x9002": HAND_BOX(AFF, "The following charges are pending against me in another state court", "mark it if something is pending against you in the court of another state, and describe it on the two lines below"),
  "p1-y30929-x12098": AFFIRMED("Pending other-state court charge or proceeding, first line", "the charge or proceeding pending against you in another state's court, and where"),
  "p1-y29549-x9002": AFFIRMED("Pending other-state court charge or proceeding, second line", "the rest of that description"),
  "p1-y26969-x9002": HAND_BOX(AFF, "The following charges are pending against me in federal court", "mark it if something is pending against you in a federal court, and describe it on the two lines below"),
  "p1-y25589-x9002": AFFIRMED("Pending federal court charge or proceeding, first line", "the charge or proceeding pending against you in federal court, and where"),
  "p1-y24209-x9002": AFFIRMED("Pending federal court charge or proceeding, second line", "the rest of that description"),

  "p1-y17258-x7502": { section: AFF_SIGN, label: "Signature of Petitioner on the affirmation", ...PROTECT(SIGNATURE, "signature or date field; the participant affirms and signs this themselves") },
  "p1-y17258-x28805": { section: AFF_SIGN, label: "Printed name of Petitioner on the affirmation", ...WRITE("participant.full_legal_name") },
  "p1-y13298-x7202": { section: AFF_SIGN, label: "Street Address, City, State and Zip Code of the Petitioner on the affirmation, on one line", ...SUPPLY("your full mailing address on this one line: street, city, state and ZIP", ONE_LINE_ADDRESS_NOTE) },
  "p1-y9338-x7202": { section: AFF_SIGN, label: "Telephone of the Petitioner on the affirmation", ...SUPPLY("your telephone number") }
};

/* ------------------------------------------------------------------ *
 * Fixtures.
 *
 * Two synthetic participants, neither a real person. They carry exactly the
 * facts this track's intake collects and no telephone number and no e-mail
 * address. The canonical participant's case was disposed of in the DISTRICT
 * court and the boundary participant's in a MAGISTRATE court, which is the
 * ordinary shape of a case on this track; that answer -- the court half of the
 * required rwcOriginatingCourt input -- is what decides which paragraph-4 line
 * carries the case number and which branch of the paragraph-12 select-one
 * carries the district. It travels with the fixture as matter.originating_court
 * rather than being inferred from the shape of the case number, because a
 * petition affirmed under penalty of perjury is not a place to read a court off
 * a prefix.
 * ------------------------------------------------------------------ */
const compose = (f) => ({
  ...f,
  "participant.city_state_zip": `${f["participant.city"]}, ${f["participant.state"]} ${f["participant.zip"]}`
});

const FIXTURES = {
  canonical: compose({
    "participant.full_legal_name": "Elena Marisol Trujillo",
    "participant.date_of_birth": "1990-03-14",
    "participant.street_address": "745 Silver Avenue SW",
    "participant.city": "Albuquerque",
    "participant.state": "NM",
    "participant.zip": "87102",
    "matter.county": "Bernalillo",
    "matter.court": "Second",
    "matter.case_number": "D-202-CR-2021-01532",
    "matter.originating_court": "district",
    "matter.arresting_agency": "Albuquerque Police Department"
  }),
  boundary: compose({
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1961-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Rd Apt 14B",
    "participant.city": "Truth or Consequences",
    "participant.state": "NM",
    "participant.zip": "87901",
    "matter.county": "Sierra",
    "matter.court": "Seventh",
    "matter.case_number": "M-51-MR-2019-00417",
    "matter.originating_court": "magistrate",
    "matter.arresting_agency": "Sierra County Sheriff's Office"
  })
};

/* ------------------------------------------------------------------ *
 * The participant's instructions.
 *
 * Every sentence of process here is grounded in the committed legal-design
 * record for this track (data/record-clearing/legal-design-intake/NM.memo.json,
 * trackId nm_release_without_conviction) or in the printed text of the pinned
 * forms. Nothing is added from memory.
 * ------------------------------------------------------------------ */
function participantInstructions({ rbf, controls, inapplicable }) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const controlsByDoc = new Map();
  for (const c of controls) controlsByDoc.set(c.document, [...(controlsByDoc.get(c.document) ?? []), c]);

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is six official New Mexico forms for a petition to expunge the arrest records and public records of a "
    + "case that ended without a conviction, under NMSA 1978, Section 29-3A-4 and Rule 1-077.1 NMRA. **You do not file "
    + "them all at once.** They go in two stages, at least sixty-three days apart, and the court may decide your "
    + "petition without a hearing if nobody objects.", "",
    "- **Form 4-952 NMRA**, _Petition to Expunge Arrest Records and Public Records (Upon Release without Conviction)_ — what you file first, under seal.",
    "- **Form 4-955 NMRA**, _Certificate of Service_ — filed after you have mailed the petition to the two responding parties.",
    "- **Form 4-222 NMRA**, _Application for Free Process and Affidavit of Indigency_ — file this only if you cannot pay the filing fee. **Read the section below about the court name printed on it.**",
    "- **Form 4-959 NMRA**, _Notice of Completion of Briefing_ — the second stage, sixty-three days or more after service.",
    "- **Form 4-960.2 NMRA**, _Affirmation in Support of Expungement_ — attached to the notice of completion of briefing.",
    "- **Form 4-960.1 NMRA**, _Notice of Hearing_ — give this to the court so it can set a hearing if it decides to hold one.", ""
  );
  out.push(
    "The platform filled in what it holds about you: your name, your date of birth, your address, the county and the "
    + "judicial district, and -- where you told us your case was handled in the district court -- your case number, on "
    + "the one line paragraph 4 gives for a district court number. **Everything else is yours**: the way the case "
    + "ended, the agencies that hold your records, your telephone number, your e-mail, and your case number if your "
    + "case was in a metropolitan, magistrate or municipal court. Every one of those blanks is listed below by the "
    + "form and the section it is in.", ""
  );

  out.push("## Keep this petition separate from any conviction", "");
  out.push(
    "**This petition is filed under seal** under Rule 1-079 NMRA. If you also want a case that ended in a conviction "
    + "cleared, **file that as its own petition**: Rule 1-077.1(C) NMRA treats a combined filing as a conviction "
    + "petition and it loses the seal. Do not combine them.", ""
  );

  out.push("## How to gather your records first", "");
  out.push(
    "Do this before you fill anything in. Paragraph 13 of the petition says your DPS Record of Arrest and Prosecution "
    + "sheet is attached, and it has a short life:", "",
    "1. **Your New Mexico Department of Public Safety Record of Arrest and Prosecution (RAP) sheet.** Complete the DPS "
    + "Authorization for Release of Information, have it **notarized with your original signature**, and send it to DPS "
    + "with a **$15.00** money order or cashier's check per record check. **None of the court filings needs a notary** — "
    + "only this authorisation does, and the notary block on page 4 of Form 4-222 if you file that.",
    "2. **The sheet must be dated no earlier than ninety (90) days before you file** (Section 29-3A-4(C) and paragraph 13 "
    + "of the petition), so order it once the rest of the packet is nearly ready rather than first. This track does not "
    + "ask for an FBI sheet.",
    "3. **Your docket sheet, arrest sheet or other record detailing the offences**, from the court that handled the case "
    + "and the arresting agency. Use the New Mexico Courts \"Find a Case\" search to locate it; court copies run about "
    + "$0.35 per page.",
    "4. **The record of the final disposition**, from the court that handled the case, so the disposition you mark in "
    + "paragraph 6 and the date you write there match the record. **The one-year period in paragraph 8 runs from that "
    + "date.**",
    "5. **If the case ended in a pre-prosecution diversion or a conditional discharge**, a document from the district "
    + "attorney's diversion programme or from the court confirming it was completed and when.", ""
  );

  out.push("## Stage one: file under seal, then mail to two parties", "");
  out.push(
    "1. **Fill in and sign Form 4-952**, the petition, and attach the DPS RAP sheet and the disposition records.",
    "2. **File it with the clerk of the New Mexico district court for the county where the charges originated or the "
    + "arrest happened** (Rule 1-077.1(B)(2) NMRA). You file in **district court even if the case was in a metropolitan, "
    + "magistrate or municipal court**. Bring copies for yourself and for the judge and a self-addressed stamped envelope.",
    "3. The filing fee is **$132.00**, and most courts want a money order or cashier's check rather than a card or a "
    + "personal check. If you cannot pay it, file Form 4-222 instead.",
    "4. **Then mail an endorsed (file-stamped) copy of the petition and everything attached to it** " + SERVICE_ON_THIS_TRACK
    + ". Two parties, not three: the arresting agency is not served on this track, and Form 4-955 prints exactly those two.",
    "5. **Then fill in Form 4-955, the certificate of service, and file it with the court** (Rule 1-077.1(E)(3) NMRA). "
    + "Only after you have actually posted the copies — it is a statement under penalty of perjury about something you did, "
    + "and the date you write on it starts the objection window.", ""
  );

  out.push("## The sixty-day wait, and the two stages", "");
  out.push(
    "The two parties you served have **sixty days from service** to file a specific objection on Form 4-957 NMRA or a "
    + "notice of non-objection on Form 4-958 NMRA. Rule 1-077.1(G) NMRA controls, not the thirty days written in the "
    + "statute, and Rule 1-006(C) adds three days because you served by mail — **sixty-three days in total**, which is "
    + "what Form 4-959 asks you to affirm. A party that files a non-objection is excused from further participation. A "
    + "party that objects on the basis of your FBI record must give you a free copy of it with the objection.", "",
    "Once the sixty-three days have passed:", "",
    "1. **Fill in Form 4-959**, the notice of completion of briefing, saying what each of the two parties did — filed a "
    + "non-objection, filed an objection, or did nothing. **No hearing on the merits will be set before you file it** "
    + "(Rule 1-077.1(H) NMRA).",
    "2. **Fill in Form 4-960.2**, the affirmation, which states under penalty of perjury whether any charge or proceeding "
    + "is pending against you anywhere. **It describes your situation on the day you sign it**, not the day this packet "
    + "was prepared.",
    "3. **Attach the affirmation to the notice, file both, and serve them on any party that objected.**",
    "4. If, since you filed, you have been **arrested, charged or convicted of anything**, say so: the parties then get "
    + "**twenty more days** to object.", ""
  );

  out.push("## The hearing, if there is one", "");
  out.push(
    "**Relief is mandatory on the findings.** If the court finds that no other charge or proceeding is pending against "
    + "you and that you were released without conviction, it must order expungement — and **where no objection is filed "
    + "it may decide on the pleadings and the affirmation without a hearing.** Form 4-960.1, the notice of hearing, is "
    + "in this packet in case the court sets one: give it to the court with the caption and your own contact details "
    + "filled in and leave the hearing details blank.", "",
    "**Form 4-960.1 page 2 is for parties entitled to notice of the hearing.** On this track that is you and any party "
    + "that filed and served an objection to your petition. If nobody objected, leave page 2 empty. If someone did, put "
    + "their name, agency, address, telephone number and e-mail in one of the four blocks.", ""
  );

  out.push("## Which district's order form you need", "");
  out.push(
    "There is **no statewide Supreme Court order form** in the mandatory 4-951 to 4-960.3 set. Each judicial district "
    + "publishes its own _Order on Petition to Expunge_ in its expungement packet, and **this packet does not include "
    + "one.** The copy the platform holds is the **Eleventh Judicial District's San Juan County packet**: its caption "
    + "already prints \"COUNTY OF SAN JUAN\" and \"ELEVENTH JUDICIAL DISTRICT COURT\", it is dated January 2022, and it "
    + "cites the statute as it stood before the 2021 amendment. It is not a form for any other county, and even in San "
    + "Juan County you should get the **current** packet from the Eleventh Judicial District Court rather than rely on "
    + "a 2022 copy.", "",
    "**Before you file, get the expungement packet published by the judicial district you are filing in** and take the "
    + "_Order on Petition to Expunge_ (and, where the district supplies its own, the _Notice of Hearing_) from it. "
    + "**Complete only the caption** — your county, your judicial district and your name — and leave the rest blank, "
    + "because the court fills in its findings and what it is ordering.", ""
  );

  out.push("## The court name printed on the fee-waiver form", "");
  out.push(
    `**Form 4-222 and the order bound with it print \`${PRINTED_DISTRICT_IN_THE_CAPTION}\` in the caption.** That is `
    + "printed on the form itself, not a blank, so nothing can change it. If you are filing anywhere other than the Sixth "
    + "Judicial District (Grant, Hidalgo or Luna County), **cross out that line by hand and write your own judicial "
    + "district**, or ask the district court clerk for their copy of Form 4-222 NMRA. Do not file it with the wrong court "
    + "named on it.", "",
    "**The county line above it is left empty for you on purpose.** That caption reads down the page -- state, then "
    + "county, then court -- so a county printed above the wrong court name makes one caption that is wrong as a whole, "
    + "and the packet does not add to it. Write your county there yourself, in the same hand and at the same moment as "
    + "you correct the court line, or take your own district's copy of the form and complete its caption from the "
    + "start. The same is true of the county line on the order bound at the back of it.", ""
  );

  out.push("## Your case number goes on the line for the court that handled the case", "");
  out.push(
    "Paragraph 4 of Form 4-952 has one line for a **District Court** case number and another for a **Metropolitan, "
    + "Magistrate or Municipal Court** case number, and paragraph 12 asks the same question again as a choice between "
    + "four courts. Most cases on this track were in one of the lower courts even though the petition is filed in "
    + "district court, so those are not the same answer.", "",
    "The packet uses the answer you gave about which court handled your case, and nothing else. **If your case was in "
    + "the district court**, your case number is already on the District Court line of paragraph 4 and your judicial "
    + "district on the District Court line of paragraph 12; leave the lower-court lines empty. **If your case was in a "
    + "metropolitan, magistrate or municipal court**, both of those lines are deliberately empty: your case has no "
    + "district court number and was not disposed of in a district court, and nothing is written on a line that would "
    + "say otherwise on a petition you affirm under penalty of perjury. **Copy your case number onto the "
    + "Metropolitan/Magistrate/Municipal line in paragraph 4, and in paragraph 12 tick the court that handled your "
    + "case and write the town or city it sits in.**", ""
  );

  out.push("## Boxes you tick with a pen", "");
  out.push(
    "These New Mexico forms draw their tick boxes as **printed characters, not as fillable fields**, so nothing can mark "
    + "them for you. Mark these by hand, and only the ones that are true for you **on the day you sign that form**:", ""
  );
  for (const [doc, items] of controlsByDoc) {
    out.push(`### ${doc}`, "");
    for (const c of items) out.push(`- **Page ${c.page}, ${c.section}** — ${c.label}.`);
    out.push("");
  }

  out.push("## What you must do before you file", "");
  out.push("1. **Gather your records first.** See the section above; the DPS RAP sheet must be dated within ninety days of filing.");
  out.push("2. **Fill in every item in the tables below**, for the stage you are at. Each names the form, the section and the blank.");
  out.push("3. **Tick every box under _Boxes you tick with a pen_ that applies to you** — including, on Form 4-952, whether you are unrepresented by counsel, how the case ended, the one-year box, the no-other-pending-charge box, which agencies hold your records, and which court the charges came from.");
  out.push("4. **Sign and date Form 4-952 and Form 4-960.2 yourself.** Both are affirmed under penalty of perjury; the dates are the dates you sign, and they are different dates.");
  out.push("5. **Do not fill in Form 4-955 until you have actually posted the copies.** It certifies something you did.");
  out.push("6. **Leave the hearing date, time and place on Form 4-960.1 blank.** The court fills those in.");
  out.push("7. **Get the order form from your district's packet and complete only its caption.**");
  out.push("");

  for (const [doc, items] of byDoc) {
    out.push(`## ${doc} — the items you must supply`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Every signature and every signature date.** Forms 4-952 and 4-960.2 are affirmed under penalty of perjury.");
  out.push("- **Your case number, on any line for a court that did not handle your case.** The form asks for it by the court it was in, so it is written on that line and on no other; where your case was in a metropolitan, magistrate or municipal court, copying it onto that line is yours to do, for the reason in the section above.");
  out.push("- **The county in the caption of Form 4-222 and of the order bound with it.** That form prints another district's court name directly below the county line, so a county written there would help compose a caption naming a court that is not yours. Complete the whole of that caption by hand on the copy you file, or use your own district's copy of the form.");
  out.push("- **Everything below the caption of Form 4-955.** The certificate of service states, under penalty of perjury, when you posted the petition and to whom. Service has not happened when this packet is prepared and the platform knows nothing about it.");
  out.push("- **Everything Form 4-959 and Form 4-960.2 assert about the sixty-three day period** — whether each party objected, whether anything is pending against you. None of it is knowable now.");
  out.push("- **The way the case ended and the date it ended**, in paragraph 6. You mark the disposition and copy the date from the court's record.");
  out.push("- **Every agency, sheriff, police and district-attorney line.** Naming the agencies is yours to do — the packet does not do it for you, because a list of agencies on a court form is more often the court's than yours, and getting it wrong is the kind of mistake that is hard to undo. Your answers are the source; copy them onto the lines the tables above name.");
  out.push("- **The hearing details, the judge's name and the court's signature block on Form 4-960.1.**");
  out.push("- **Every attorney block, and the whole attorney certificate on page 5 of Form 4-222.** This packet is prepared for someone filing without a lawyer.");
  out.push("- **The notary block on page 4 of Form 4-222, and every financial answer on it.** That form is sworn under oath and the platform holds none of your financial facts.");
  out.push("");

  if (inapplicable.length > 0) {
    out.push("## Blanks that do not apply on this route", "");
    out.push("| Form | Page | The blank | Why it does not apply |", "| --- | --- | --- | --- |");
    for (const i of inapplicable) out.push(`| ${i.document} | ${i.page} | ${i.label} | ${i.why} |`);
    out.push("");
  }

  out.push("## After the order is signed", "");
  out.push(
    "Any expungement order must **allow at least sixty days** for the expungement to be carried out, and the court **may "
    + "not expunge court records earlier than thirty days** from the day the order is entered. An order granting the "
    + "petition must also require that **this expungement case itself be expunged**.", ""
  );

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared set of official New Mexico forms. It is not legal advice, it is not filed for you, and it does "
    + "not decide whether your records will be expunged. **Get a lawyer's help** if the district attorney or the "
    + "Department of Public Safety objects, if any charge or proceeding is pending against you anywhere, if there is any "
    + "question whether a diversion or a conditional discharge actually completed, if your records are in more than one "
    + "judicial district (each needs its own petition), if the court sets a contested hearing, if any of the records are "
    + "federal, tribal, military or from outside New Mexico, or if you are not a United States citizen — the Judiciary's "
    + "own packet tells non-citizens to seek legal advice about what expungement may mean for them. Expungement on this "
    + "track does not reach DWI citations kept by the Taxation and Revenue Department, computer-aided dispatch records or "
    + "breath-testing log books, which Section 29-3A-2(A) leaves out of \"arrest records\". It does not destroy records, "
    + "and it does not remove the disclosure obligations that FINRA and the SEC impose on people who work in securities."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/* ------------------------------------------------------------------ */

const FAMILY = {
  familyId: FAMILY_ID,
  out: OUT,
  buildScript: BUILD_SCRIPT,
  route: ROUTE,
  fixtures: FIXTURES,
  participantInstructions,
  documents: [
    { ...FORM_4_952, dictionary: DICTIONARY_4_952 },
    { ...FORM_4_955, dictionary: DICTIONARY_4_955 },
    { ...FORM_4_959, dictionary: DICTIONARY_4_959 },
    { ...FORM_4_960_2, dictionary: DICTIONARY_4_960_2 },
    {
      ...FORM_4_960_1, instrumentKind: "notice_of_hearing",
      dictionary: dictionary4960_1({ service: SERVICE_ON_THIS_TRACK, trackName: "release-without-conviction" })
    },
    {
      ...FORM_4_222, instrumentKind: "fee_waiver_application",
      dictionary: DICTIONARY_4_222, printedBlankDictionary: PRINTED_BLANKS_4_223
    }
  ],
  componentDelivery: {
    "nm_release_without_conviction-primary-filing-1": { deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-952, the first four pages of both fixtures" },
    "nm_release_without_conviction-certificate-of-service-2": { deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-955, two pages" },
    "nm_release_without_conviction-second-stage-notice-3": { deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-959, three pages" },
    "nm_release_without_conviction-second-stage-affirmation-4": { deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-960.2, two pages" },
    "nm_release_without_conviction-notice-of-hearing-5": {
      deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-960.1, three pages",
      note: "the manifest marks this CONDITIONAL on this track -- where an objection is filed and the court sets a hearing rather than deciding on the pleadings and affirmation. It is rendered so the participant has it if the court sets one, with every hearing detail left to the court."
    },
    "nm_release_without_conviction-proposed-order-6": {
      deliveredAs: "not_generated_conditional_component_condition_not_met",
      deliveredBy: "nothing. The bound binary NM-SAN-JUAN-NONCONVICTION-PACKET is resolved by content hash and recorded in source-receipt.json as a reference that was not rendered",
      section: "## Which district's order form you need",
      note: "the manifest conditions this component on the participant filing in San Juan County, and neither fixture does. The bound binary is the Eleventh Judicial District's whole 31-page self-help packet, county-captioned as page content, dated January 28, 2022, and citing the pre-2021 statute; the track's own record carries the currency of the district packets as a release blocker. The shared host renders whole pinned binaries and this lane may not change it. Rendering it would promote a county-local, pre-amendment packet statewide, so it is not rendered, and the participant is told where the order comes from."
    },
    "nm_release_without_conviction-local-order-form-instructions-7": {
      deliveredAs: "process_guidance", deliveredBy: "participant-instructions.md",
      section: "## Which district's order form you need",
      note: "required by the manifest and by the track's own record, because no statewide Supreme Court order form exists in the mandatory 4-951 to 4-960.3 set and the retained order is one district's copy."
    },
    "nm_release_without_conviction-fee-waiver-application-8": {
      deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-222 with Form 4-223, seven pages",
      note: "conditional on the participant being unable to pay the $132.00 district court filing fee. See the blocking finding about the district printed in its caption."
    },
    "nm_release_without_conviction-record-gathering-instructions-9": {
      deliveredAs: "process_guidance", deliveredBy: "participant-instructions.md",
      section: "## How to gather your records first",
      note: "the DPS RAP sheet and its ninety-day currency rule, the $15.00 DPS fee and the notarised authorisation, the docket or arrest sheet, the final-disposition record, and the diversion or conditional-discharge completion document."
    },
    "nm_release_without_conviction-sequencing-instructions-10": {
      deliveredAs: "process_guidance", deliveredBy: "participant-instructions.md",
      section: "## The sixty-day wait, and the two stages",
      note: "the objection-window diary, the two-stage structure, the twenty further days where the affirmation discloses new matters, and -- under its own heading before anything else -- the sealing warning against combining this petition with a conviction petition."
    }
  },
  routeSelectionNote:
    "Nothing in this packet is a route election. Section 29-3A-4 is one section and Rule 1-077.1 is one procedure. The "
    + "six disposition boxes in paragraph 6 of Form 4-952 look like an election and are not one the ROUTE makes: how the "
    + "case ended -- acquittal, nolle prosequi, no bill, diversion, conditional discharge or another dismissal -- is a fact "
    + "about the participant's own case, every one of them is inside the track, and the packet asks them to mark the one "
    + "that matches rather than asserting one. Everything the second-stage forms state is a fact about the sixty-three "
    + "days after the petition is served, which have not happened when the packet is prepared. The one place a route DOES "
    + "decide something is Form 4-960.1's page-2 service blocks, and this route decides they are reached: two parties are "
    + "served, so an objector can exist.",
  whatToLookAt: [
    "Form 4-952 page 1, the caption and paragraph 1: county, judicial district and name in the caption; date of birth, "
      + "mailing address, city, state and ZIP on their own rules; all three phone boxes and the alias line empty.",
    "Form 4-952 page 1, paragraph 2: the judicial district written on ONE line only -- the \"has no pending "
      + "expungement cases in the ____ Judicial District\" line -- with the two blanks on the pending-cases branch "
      + "EMPTY and both printed boxes unmarked.",
    "Form 4-952 page 2, paragraph 4: the case number on the line for the court the held intake answer names, and on no "
      + "other. On the canonical fixture, a district-court case, that is the District Court line; on the boundary "
      + "fixture, a magistrate case, EVERY case-number line is empty, including the lower-court line the number "
      + "belongs on, which the shared semantics refuse. See build-findings.json.",
    "Form 4-952 page 2, paragraph 6: every charge detail empty and every one of the six disposition boxes unmarked.",
    "Form 4-952 pages 2 and 3, paragraph 10 and paragraph 12: in paragraph 10 the judicial district is written on the "
      + "District Court line on both fixtures; in paragraph 12 it is written on the District Court branch ONLY on the "
      + "canonical fixture, and the boundary fixture's paragraph 12 carries no ink on any of its four branches. Every "
      + "sheriff, district-attorney and agency line is empty on both.",
    "Form 4-952 page 3: nothing written on the five short marginal rules, and nothing on the full-width divider at the "
      + "foot of the page.",
    "Form 4-952 page 4, the SIGNATURE SECTION: the printed name written, the date beside it empty, the signature line "
      + "empty, and the whole attorney block empty.",
    "Form 4-955: the caption written and EVERYTHING ELSE EMPTY. This is a certificate of service and service has not "
      + "happened.",
    "Form 4-959 page 1: the caption written and every one of the twelve response glyphs unmarked; nothing written on the "
      + "four short strike-through strokes. Page 2: the printed name written, and the certificate of service at the foot "
      + "entirely empty.",
    "Form 4-960.2: the caption written, the petitioner's name written in the 'I, ____' line and as the printed name in "
      + "the signature block, the signature line empty, and every pending-charge line empty.",
    "Form 4-960.1 page 1: county, district and name in the caption, the petitioner's name in the notice block; items 1 "
      + "to 5, the judge's name and the TCAA signature block empty. Page 2: EMPTY, because the four service blocks are "
      + "the petitioner's to complete for any objector.",
    "Form 4-222 pages 1 and 6: the printed \"SIXTH JUDICIAL DISTRICT COURT\" caption, which no field covers and which "
      + "this build cannot change -- and, one line above it on both pages, the COUNTY OF blank now left EMPTY. It used "
      + "to carry the participant's county, which composed with the printed district into a caption naming a court "
      + "they have not chosen; both blanks are the participant's to complete on the copy they file.",
    "Form 4-952 page 2 paragraph 4 and page 3 paragraph 12, on BOTH fixtures and read against each other. The "
      + "canonical case was disposed of in the district court, so its number is on the District Court line and its "
      + "judicial district on the District Court branch of the select-one. The boundary case is a magistrate case: "
      + "both of those lines must be EMPTY, no branch of paragraph 12 may carry ink, and no box anywhere may be "
      + "marked.",
    "No page of either fixture comes from the San Juan packet. Both fixtures are 21 pages: 4 + 2 + 3 + 2 + 3 + 7."
  ],
  blockingFindings: [PRINTED_DISTRICT_FINDING],
  findings: [
    {
      finding:
        "TWO PARTIES ARE SERVED ON THIS TRACK, NOT THREE. Rule 1-077.1(E)(1) NMRA and the committed track record name the "
        + "district attorney for the judicial district where the charge originated and the New Mexico Department of "
        + "Public Safety; the arresting agency is not served. Forms 4-955 and 4-959 print exactly two service lines.",
      consequence:
        "The instructions say two parties in terms, and Form 4-960.1's page-2 service blocks are REQUIRED_BEFORE_FILING "
        + "here -- an objector can exist because somebody is served -- through the same shared dictionary that gives the "
        + "identity-theft family NOT_APPLICABLE_ON_THIS_ROUTE for the same twenty blanks."
    },
    {
      finding:
        "THE CASE NUMBER AND THE PARAGRAPH-12 DISTRICT ARE NOW WRITTEN BY THE HELD ORIGINATING-COURT ANSWER. Form 4-952 "
        + "paragraph 4 asks for the case number by the court it was in -- a District Court line and a "
        + "Metropolitan/Magistrate/Municipal Court line -- and paragraph 12 is a printed select-one over four courts. "
        + "The track's intake collects rwcOriginatingCourt as a REQUIRED answer for exactly that reason. The previous "
        + "build had a static dictionary, one blank one fact, and it produced both halves of the same defect: the case "
        + "number was written on neither line under a row that said the platform holds no value for it, which the "
        + "finding above contradicted in terms, and the judicial district WAS written into the District Court branch of "
        + "paragraph 12 on the magistrate-court fixture.",
      consequence:
        "The dictionary for this form is now a function of the facts, and the fixtures carry matter.originating_court. "
        + "Where the held answer is the district court the case number is written on the District Court line of "
        + "paragraph 4 and the judicial district on the District Court branch of paragraph 12; where it is not, both "
        + "lines are left empty, the District Court lines are declared NOT_APPLICABLE_ON_THIS_ROUTE with the held "
        + "answer named as the condition, and the participant is told which line is theirs under a heading of its own. "
        + "This no longer diverges from nm_conviction-set on the district-court branch. What remains: the shared field "
        + "semantics protect every blank whose printed line names a magistrate (PROTECT_RULES matches /magistrate/ "
        + "under the \"court\" category), so on a lower-court case the Metropolitan/Magistrate/Municipal case-number "
        + "line and the paragraph-12 magistrate and municipal location lines refuse every write whatever fact is "
        + "offered. That row is declared KNOWN_FACT_NOT_WRITTEN on the boundary half of the field map rather than "
        + "excused as an unavailable fact -- the platform holds the number -- and it is reported for the owner of the "
        + "shared semantics. Re-labelling the blank until it stopped matching the protect rule was available and was "
        + "not done."
    },
    {
      finding:
        "The intake's required originating-court answer has two halves: which court, and in what location. These "
        + "fixtures carry the court half as matter.originating_court, which is the half that decides which branch of "
        + "paragraph 4 and paragraph 12 the case uses.",
      consequence:
        "The location half is left to the participant on every lower-court line, with the reason on the row. Holding it "
        + "would not change the delivered page: those same lines are refused by the shared protect rule above, so a held "
        + "location would be a held fact this host still could not write."
    },
    {
      finding:
        "THE PROPOSED-ORDER COMPONENT IS BOUND BY CONTENT HASH AND NOT RENDERED. The manifest conditions it on filing in "
        + "San Juan County and neither fixture does. The bound binary "
        + "(d804959b212e2a0df2e3aa51f17609ef237d583ff2cc189747e76b38c2520638) is the Eleventh Judicial District's whole "
        + "31-page self-help packet rather than an order: instructions, a county petition, a certificate, an objection, a "
        + "non-objection, a notice of completion, an affirmation, a notice of hearing, and the order on its last five "
        + "pages. Its caption prints \"COUNTY OF SAN JUAN\" and \"ELEVENTH JUDICIAL DISTRICT COURT\" as page content, its "
        + "case-number template is \"D-1116-EX-____\", it is dated January 28, 2022, and the order recites \"NMSA 1978 "
        + "Sections 29-3A-4 to -7 (2019)\" -- the statute before the 2021 amendment this track's eligibility list is taken "
        + "from. The track's record already carries the currency of the district packets as a release blocker.",
      consequence:
        "The shared host renders whole pinned binaries and this lane may not change it, so the order pages cannot be "
        + "rendered alone; rendering all thirty-one would put a county-captioned, pre-amendment petition into a statewide "
        + "family. The component is reconciled against the manifest as a conditional component whose condition is not "
        + "met, the digest is recorded in source-receipt.json under referenceSourcesBoundByHashNotRendered, and the "
        + "participant is told to take the order from their own district's current packet. A later lane could render the "
        + "order pages alone if the host gains a page-range capability and the district packet is confirmed current."
    },
    {
      finding:
        "THE HEARING IS CONDITIONAL. Relief is mandatory on the findings, and where no objection is filed the court may "
        + "decide on the pleadings and the affirmation. The manifest marks Form 4-960.1 conditional here where the "
        + "conviction family marks it required.",
      consequence:
        "The form is rendered so the participant has it if the court sets a hearing, with every hearing detail, the "
        + "judge's name and the TCAA signature block left to the court, and the instructions say a hearing may not happen."
    },
    {
      finding:
        "Form 4-959 page 1 carries four short stroked rules with no printed text ON them that are STRIKE-THROUGHS, not "
        + "blanks: the 2025 amendments mark deleted words -- \"[Attorney]\", \"[Has]\", \"[Safety]\", \"[Has]\" -- by "
        + "bracketing and striking them, and a strike sits through the word rather than under it, so the underline reader "
        + "(which looks for glyphs above a stroke) does not classify it. The same page prints an empty bracket pair around "
        + "the Department of Public Safety response heading's tick glyph.",
      consequence:
        "All five are recorded as printed rules that are not blanks, with the struck word named, and carried in the "
        + "field census rather than in the field map. Nothing is written on any of them."
    },
    {
      finding:
        "Form 4-952 page 3 prints five short 15pt rules in the left margin on baselines that carry no text, and a "
        + "full-width divider at the foot of the page immediately before the SIGNATURE SECTION heading that opens page 4.",
      consequence:
        "All six are recorded as printed rules that are not blanks. Nothing is written on any of them."
    },
    {
      finding:
        "Forms 4-955 and 4-959 carry a certificate of service. Everything below the caption of Form 4-955, and the "
        + "certificate at the foot of Form 4-959, is the petitioner certifying under penalty of perjury when they posted "
        + "a document and to whom.",
      consequence:
        "The caption is written and nothing else is. Service has not happened when this packet is prepared and the "
        + "platform has no knowledge of it; the shared field semantics protect a service block for the same reason."
    },
    {
      finding:
        "Every glyph on Form 4-222 reports inexact metrics, and one blank on Form 4-959 page 1 -- the judicial district "
        + "on the district attorney line -- sits to the right of a symbol-font tick glyph on its own baseline and so "
        + "carries fallback-advance drift.",
      consequence:
        "Measurability is decided per baseline. Nothing on Form 4-222 is positioned from text geometry; only its exact "
        + "AcroForm widget rectangles are used. The one drifting blank on Form 4-959 is a district-attorney line the "
        + "shared semantics protect from being written in any case, so it is recorded with no write box and no value is "
        + "placed there."
    },
    {
      finding:
        "The shared fact registry has no descriptor for other names or aliases and no one-line mailing-address fact. "
        + "Form 4-952 asks for aliases on one line, and four blanks in this packet -- Form 4-952 page 4, Form 4-959 page 2, "
        + "Form 4-960.2 page 1 and Form 4-960.1 page 1 -- give a single line for a whole mailing address.",
      consequence:
        "Those five are left to the participant with the reason stated. Reported for the owner of the registry alongside "
        + "the case-number gap."
    },
    {
      finding:
        "Form 4-222's caption prints a judicial district that no field covers. See the blocking finding above.",
      consequence:
        "Recorded as blocking, named for visual review, and stated to the participant. The same finding is carried by "
        + "every New Mexico family that binds this fee-waiver component."
    }
  ],
  mattersForTheReviewersAttention: [
    "BLOCKING: Form 4-222 and Form 4-223 print \"SIXTH JUDICIAL DISTRICT COURT\" in their captions with no field over "
      + "it. The build no longer writes the participant's county into the blank one line above it on either caption; "
      + "both are left for the participant, who is told to complete that caption by hand or to use their own "
      + "district's copy. Whether the component may ship statewide on this binary at all is still open and is "
      + "counsel's.",
    "Form 4-952's dictionary is a function of the held originating-court answer: paragraph 4's case number and "
      + "paragraph 12's judicial district are written on the district-court branch only where the case was disposed of "
      + "in the district court, and the other branches carry nothing. Counsel should confirm the branch rule, and the "
      + "owner of the shared field semantics should see that /magistrate/ in the \"court\" protect rule refuses the "
      + "lower-court case-number line even when the number is held.",
    "The proposed-order component is bound by hash and not rendered: the bound binary is a whole 31-page San Juan "
      + "County packet, county-captioned and citing the 2019 statute, and the manifest conditions it on San Juan County. "
      + "Counsel should confirm that not rendering it is the right disposition, and whether the family's binding should "
      + "be re-pinned to a current statewide or district order form once one is held.",
    "Two parties are served on this track. Twenty blanks on Form 4-960.1 page 2 are REQUIRED_BEFORE_FILING here on that "
      + "ground; the identity-theft family disposes the same twenty as NOT_APPLICABLE_ON_THIS_ROUTE. The two should be "
      + "read together.",
    "Forms 4-955 and 4-959 are written in their captions only. Counsel should confirm that a caption is not a "
      + "certification.",
    "The six disposition boxes in paragraph 6 are left to the participant as case facts, not route elections. Counsel "
      + "should confirm that reading, and the explanation of the one-year box in paragraph 8.",
    "The track's own record carries three release blockers unrelated to this build: whether an unfiled arrest needs its "
      + "own petition, whether the district instruction packets have been reissued to match the December 31, 2025 rule, "
      + "and how a non-vehicular deferred sentence fits the released-without-conviction definition. None was resolved here."
  ]
};

/* ------------------------------------------------------------------ *
 * The reference binary that is bound and not rendered, and the legal-design
 * records every sentence of the instructions is grounded in, both pinned into
 * the source receipt the host wrote. Additive, deterministic, and only after
 * a real build.
 * ------------------------------------------------------------------ */
const LEGAL_DESIGN_RECORDS = [
  "data/record-clearing/legal-design-intake/NM.memo.json",
  "data/record-clearing/legal-design-packet-set-manifests.json",
  "data/record-clearing/legal-design-track-registry.json"
];

function sha256File(rel) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, rel))).digest("hex");
}

function pinReferencesIntoReceipt() {
  const receiptPath = path.join(ROOT, OUT, "source-receipt.json");
  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  const { resolved, failures } = resolveSourcesByHash([{ ...SAN_JUAN_PACKET, routeKey: ROUTE.routeKey }]);
  if (failures.length > 0) {
    throw new Error(`the San Juan packet did not resolve by content hash: ${JSON.stringify(failures)}`);
  }
  const bound = resolved[0];
  receipt.referenceSourcesBoundByHashNotRendered = [{
    sourceIds: [bound.sourceId], documentId: bound.documentId, formNumber: bound.formNumber, title: bound.title,
    revision: bound.revision, custody: bound.custody, pathInCustody: bound.pathInCustody,
    custodiesCarryingThisDigest: bound.custodiesCarryingThisDigest, resolvedBy: bound.resolvedBy,
    sha256: bound.sha256, byteLength: bound.byteLength, pages: bound.pageCountFromIndex,
    acroFieldCount: bound.acroFieldCountFromIndex, structuralClassObserved: bound.structuralClassObserved,
    instrumentKind: bound.instrumentKind, rendered: false,
    manifestComponent: "nm_release_without_conviction-proposed-order-6",
    manifestCondition: "Where the participant files in San Juan County, whose non-conviction packet is the retained local order.",
    whyNotRendered:
      "Neither fixture files in San Juan County, so the manifest's condition is not met. The binary is the Eleventh "
      + "Judicial District's whole 31-page self-help packet, county-captioned as page content, dated January 28, 2022, "
      + "citing the pre-2021 statute; the shared host renders whole pinned binaries, so the order pages cannot be rendered "
      + "alone, and rendering all of it would promote a county-local, pre-amendment packet statewide. Not substituted, not "
      + "edited, not rendered."
  }];
  receipt.legalDesignRecordsPinned = LEGAL_DESIGN_RECORDS.map((rel) => ({ path: rel, sha256: sha256File(rel) }));
  receipt.legalDesignRecordsPinnedNote =
    "Every process sentence in participant-instructions.md is grounded in the nm_release_without_conviction track of "
    + "the legal-design intake memo, in this family's packet-set manifest entry, or in the printed text of the pinned "
    + "forms. These whole-file digests will go stale when an unrelated jurisdiction's record changes; they pin what was "
    + "read, not this family alone.";
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
}

export async function runFamily(argv = process.argv.slice(2)) {
  const result = await runNmFamily(FAMILY, argv);
  if (!argv.includes("--check") && result.status !== "BLOCKED_SOURCE") pinReferencesIntoReceipt();
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
