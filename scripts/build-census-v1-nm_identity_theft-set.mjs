#!/usr/bin/env node
/**
 * The New Mexico identity-theft expungement family — `nm_identity_theft-set`.
 *
 *   node scripts/build-census-v1-nm_identity_theft-set.mjs [--check] [--no-raster]
 *
 * Four official documents, filed together in a New Mexico district court:
 *
 *   4-951 NMRA                     Petition to expunge arrest records and public
 *                                  records; identity theft            — the filing
 *   4-960.1 NMRA                   Notice of hearing                  — conditional
 *   NM-LOCAL-IDENTITY-THEFT-ORDER  Order on petition to expunge       — conditional
 *   4-222 NMRA (+ 4-223)           Application for free process       — conditional
 *
 * Route `obligation:track-only:NM:nm_identity_theft`, NMSA 1978, Section 29-3A-3
 * and Rule 1-077.1 NMRA, as approved by Supreme Court Order No.
 * S-1-RCR-2024-00099 effective for cases filed on or after 31 December 2025.
 *
 * THREE OF THE FOUR DOCUMENTS ARE FLAT
 *
 * Only Form 4-222 has an AcroForm. The three rule forms have no fillable field
 * at all, and their blanks are underscore GLYPH RUNS far more often than
 * stroked rules — the existing stroke reader finds 15 rules on Form 4-951 where
 * the form has 71 blanks, and 10 of those 15 strokes are amendment underlines
 * rather than blanks. They are measured by
 * scripts/rcap-nm-flat-forms/nm-flat-blank-measurer.mjs on every build and every
 * measured blank must carry a dictionary row, so the packet can never ship a
 * blank nothing classifies.
 *
 * WHAT THIS BUILD REFUSES TO WRITE, AND WHY IT SAYS SO OUT LOUD
 *
 * Page 4 of the retained local order asks for "Name of actual offender:" and
 * "Contact information:". This build never fills them, and the refusal is
 * stated to the participant rather than left as four unexplained blanks. Three
 * separate records forbid it and the form itself conditions the paragraph away:
 *
 *   * the form prints, immediately above the paragraph, "(For use when the
 *     correct offender was provided notice of the hearing on the Petition to
 *     expunge.)" — and on this track Rule 1-077.1(E) NMRA entitles no
 *     responding party to notice, so no correct offender is ever noticed;
 *   * the track's legal-design decision carries a self_help_boundary limitation
 *     headed "Never name an alleged identity thief in a proposed order";
 *   * that decision explains why: Rule 1-077.1 deliberately omits the Section
 *     29-3A-3(D) requirement that the court insert the true offender's name,
 *     because naming an alleged identity thief in a civil proceeding without
 *     notice to that person would violate due process;
 *   * and the track's own selfHelpStopConditions make "any suggestion, from the
 *     participant or anyone else, that LegalEase name the true offender
 *     anywhere in the packet or the proposed order" a stop condition.
 *
 * The four blanks and the box in front of that paragraph are therefore
 * classified NOT_APPLICABLE_ON_THIS_ROUTE against the named condition, listed
 * in reports/blanks-left-for-the-participant.json, and explained in
 * participant-instructions.md under a heading of their own.
 *
 * NOBODY IS SERVED ON THIS TRACK
 *
 * Form 4-960.1's four page-2 service blocks — twenty blanks — are on a branch of
 * the form this route does not reach, for the same reason: Rule 1-077.1(E)
 * entitles no responding party to notice, the track's own record states that
 * service is "required only for the release-without-conviction and conviction
 * tracks", and the form's own USE NOTES limit those blocks to a party that
 * "filed and served objections ... no later than sixty-three (63) days from the
 * date of service". A party never served can neither object nor start that
 * period. See scripts/rcap-nm-flat-forms/nm-form-4-960-1.mjs, which takes the
 * route's service posture as a parameter precisely so that the conviction and
 * release-without-conviction families, which DO serve, get the other answer.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runNmFamily, WRITE, SUPPLY, PROTECT, DECRETAL, ELECTION, ATTORNEY, INAPPLICABLE, OPTIONAL, NOT_A_BLANK,
  COURT_OWNED, SIGNATURE
} from "./rcap-nm-flat-forms/nm-packet-host.mjs";
import { FORM_4_960_1, dictionary4960_1 } from "./rcap-nm-flat-forms/nm-form-4-960-1.mjs";
import { FORM_4_222, DICTIONARY_4_222, PRINTED_BLANKS_4_223, PRINTED_DISTRICT_FINDING, PRINTED_DISTRICT_IN_THE_CAPTION }
  from "./rcap-nm-flat-forms/nm-form-4-222.mjs";

const thisFile = fileURLToPath(import.meta.url);
const FAMILY_ID = "nm_identity_theft-set";
const OUT = "data/rcap-all50/overlays/census-v1/nm/nm-identity-theft-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-nm_identity_theft-set.mjs";
const TRACK = "identity-theft";

const ROUTE = Object.freeze({
  jurisdiction: "NM",
  routeKey: "obligation:track-only:NM:nm_identity_theft",
  routeSelectionId: "nm-identity-theft-set-4-951-4-960.1-local-order-4-222",
  publicLabel: "Expunge records you were wrongly named in because of identity theft",
  authority:
    "NMSA 1978, Section 29-3A-3; Rule 1-077.1 NMRA; Form 4-951 NMRA. Rule and forms approved by Supreme Court Order No. "
    + "S-1-RCR-2024-00099, effective for all cases filed on or after December 31, 2025."
});

/* ------------------------------------------------------------------ *
 * Form 4-951 NMRA. Seventy-one measured blanks.
 * ------------------------------------------------------------------ */

const CAPTION = "Caption";
const P1 = "1. Information about Petitioner";
const P2 = "2. Pending expungement cases";
const P3 = "3. Prior expungement applications";
const P4 = "4. The criminal case Petitioner was improperly named in";
const P5 = "5. Related appellate cases";
const P6 = "6. Agencies holding the records";
const P7 = "7. Where the charges were disposed of or originated";
const P8 = "8. Telephonic or electronic appearance";
const SIGN = "Signature section";
const ATTY = "Attorney block (page 3)";

/** The judicial district, which this route's intake collects and this form asks for seven times. */
const DISTRICT = (where) => ({ section: where.section, label: where.label, ...WRITE("matter.court") });

const AGENCY_BOX = (label, what) => ({
  section: P6, label,
  ...ELECTION(
    "the participant marks the agencies that hold their records. The form draws this control as a printed \"[ ]\" "
    + "character rather than as a stroked box or a form field, so there is no measured control for this build to mark "
    + `and no geometry to invent one from; participant-instructions.md names it and says when to mark it: ${what}`
  )
});

const COURT_BOX = (section, label, what) => ({
  section, label,
  ...ELECTION(
    "the participant marks this. The form draws the control as a printed \"[ ]\" character rather than as a stroked box "
    + "or a form field, so there is no measured control for this build to mark and no geometry to invent one from; "
    + `participant-instructions.md names it and says when to mark it: ${what}`
  )
});

const DICTIONARY_4_951 = {
  /* ---- page 1, the caption --------------------------------------------- */
  "p1-y62820-x14328": { section: CAPTION, label: "COUNTY OF", ...WRITE("matter.county") },
  "p1-y61236-x7200": DISTRICT({ section: CAPTION, label: "Judicial district of the district court in the caption" }),
  "p1-y55512-x9720": { section: CAPTION, label: "In re, the petitioner's name", ...WRITE("participant.full_legal_name") },

  /* ---- page 1, the representation election ------------------------------ */
  "p1-y43092-x16068": {
    section: CAPTION, label: "Petitioner is unrepresented by counsel",
    ...ELECTION(
      "whether the petitioner is represented by counsel is a fact about them that the platform does not hold, and the "
      + "attorney block on page 3 is left empty for the same reason. The form draws the control as a printed \"[ ]\" "
      + "character, so there is no measured control to mark; participant-instructions.md tells the participant to mark "
      + "this box if they are filing without a lawyer"
    )
  },
  "p1-y43092-x29988": {
    section: CAPTION, label: "Petitioner is represented by counsel",
    ...ELECTION(
      "the other half of the same election. No attorney-representation fact is held for this participant, and the form "
      + "draws the control as a printed \"[ ]\" character with no measured geometry to mark"
    )
  },

  /* ---- page 1, section 1 ------------------------------------------------ */
  "p1-y35796-x16260": { section: P1, label: "Date of Birth", ...WRITE("participant.date_of_birth") },
  "p1-y34212-x21336": { section: P1, label: "Current Mailing Address", ...WRITE("participant.street_address") },
  "p1-y32616-x11700": { section: P1, label: "City", ...WRITE("participant.city") },
  "p1-y32616-x28536": { section: P1, label: "State", ...WRITE("participant.state") },
  "p1-y32616-x45036": { section: P1, label: "Zip Code", ...WRITE("participant.zip") },
  "p1-y31032-x16764": {
    section: P1, label: "Home Phone #",
    ...SUPPLY("your home telephone number, if you have one. The intake for this track collects your name, date of birth, mailing address and case facts and asks for no telephone number, and the platform will not put one on a petition sworn under penalty of perjury without holding it")
  },
  "p1-y31224-x33072": { section: P1, label: "Work Phone #", ...SUPPLY("your work telephone number, if you have one") },
  "p1-y31032-x43500": { section: P1, label: "Cell #", ...SUPPLY("your mobile telephone number, if you have one") },
  "p1-y26460-x9000": {
    section: P1, label: "Other names or aliases by which Petitioner has been known, first line",
    ...SUPPLY(
      "every other name your arrest records might be under -- a former name, a nickname, an alias. Your intake collected "
      + "them, and the shared fact registry has no descriptor for other names or aliases: the only name descriptor whose "
      + "pattern reaches a line like this is the petitioner's own FULL LEGAL NAME, and writing that here would put your "
      + "legal name on the alias line of a petition sworn under penalty of perjury. The registry gap is recorded in "
      + "build-findings.json"
    )
  },
  "p1-y24876-x9000": {
    section: P1, label: "Other names or aliases, second line",
    ...OPTIONAL("the second of three lines the form gives for a list of unknown length")
  },
  "p1-y23292-x9000": {
    section: P1, label: "Other names or aliases, third line",
    ...OPTIONAL("the third of three lines the form gives for a list of unknown length")
  },

  /* ---- page 1, section 2 ------------------------------------------------ */
  "p1-y20328-x9456": COURT_BOX(P2, "Petitioner has no pending expungement cases", "mark it if you have no other expungement case pending in this judicial district"),
  "p1-y20328-x35976": DISTRICT({ section: P2, label: "Judicial district in which Petitioner has no pending expungement cases" }),
  "p1-y18948-x9456": COURT_BOX(P2, "Petitioner has the following pending expungement cases", "mark it instead if you do have other expungement cases pending, and list their case numbers on the three lines below"),
  "p1-y18948-x40776": DISTRICT({ section: P2, label: "Judicial district in which Petitioner has pending expungement cases" }),
  "p1-y16188-x26784": DISTRICT({ section: P2, label: "Judicial district court the pending expungement cases are before" }),
  "p1-y14808-x9456": { section: P2, label: "Pending expungement case numbers, first line", ...SUPPLY("the case number of any other expungement case of yours that is pending in this judicial district") },
  "p1-y13428-x9456": { section: P2, label: "Pending expungement case numbers, second line", ...SUPPLY("a second pending expungement case number, if you have one") },
  "p1-y12048-x9456": { section: P2, label: "Pending expungement case numbers, third line", ...SUPPLY("a third pending expungement case number, if you have one") },

  /* ---- page 1 to 2, section 3 ------------------------------------------- */
  "p1-y9288-x9456": COURT_BOX(P3, "Petitioner has never applied for expungement and been denied", "mark it if you have never been denied an expungement"),
  "p2-y70344-x9456": COURT_BOX(P3, "Petitioner has applied for expungement and been denied", "mark it instead if you have been denied, and give the case numbers"),
  "p2-y68964-x32640": { section: P3, label: "Expungement case numbers in which Petitioner was denied, first line", ...SUPPLY("the case number of any expungement you were denied") },
  "p2-y67584-x9456": { section: P3, label: "Expungement case numbers in which Petitioner was denied, second line", ...SUPPLY("a second case number in which you were denied, if there is one") },
  "p2-y66204-x9456": { section: P3, label: "Expungement case numbers in which Petitioner was denied, third line", ...SUPPLY("a third case number in which you were denied, if there is one") },

  /* ---- page 2, section 4 ------------------------------------------------ */
  "p2-y60684-x14856": {
    section: P4, label: "Case name of the criminal case",
    ...SUPPLY("the name of the criminal case you were improperly named in, exactly as it appears on the record — the intake collects the case number, the court, the agency and the date, and not the case name, and a criminal case may be captioned under a name that is not yours")
  },
  "p2-y59304-x15924": { section: P4, label: "Case number of the criminal case", ...WRITE("matter.case_number") },
  "p2-y57924-x16092": {
    section: P4, label: "Date of filing of the criminal case",
    ...SUPPLY("the date the criminal case was filed, from the record — the intake collects the approximate date of the arrest or charge, which is not the same date, and this is a petition sworn under penalty of perjury")
  },

  /* ---- page 2, section 5 ------------------------------------------------ */
  "p2-y51804-x26088": {
    section: P5, label: "Court of Appeals case number(s) related to the petition",
    ...OPTIONAL("most petitions have no related appellate case; the participant fills this only if theirs does, and the platform holds no appellate record")
  },
  "p2-y50424-x25116": {
    section: P5, label: "Supreme Court case number(s) related to the petition",
    ...OPTIONAL("most petitions have no related Supreme Court case; the participant fills this only if theirs does")
  },

  /* ---- page 2, section 6: the agencies ---------------------------------- */
  "p2-y44904-x9000": AGENCY_BOX("Agency holding records: District Court", "mark it if the district court holds records of this case"),
  "p2-y44904-x20340": DISTRICT({ section: P6, label: "Judicial district of the District Court holding the records" }),
  "p2-y43524-x9000": AGENCY_BOX("Agency holding records: County Sheriff's Department", "mark it if the county sheriff holds records of this case"),
  "p2-y43524-x10416": {
    section: P6, label: "County of the Sheriff's Department holding the records",
    ...SUPPLY(
      "the county whose sheriff's department holds records of this case, which need not be the county you are filing in. "
      + "The platform's shared field semantics protect every sheriff, police, agency and law-enforcement line from being "
      + "written by a build, because a slot naming agencies is more often the court's than the participant's; section 6 of "
      + "this petition is one of the places where it is yours, and it is yours to complete"
    )
  },
  "p2-y42144-x9000": AGENCY_BOX("Agency holding records: District Attorney", "mark it if the district attorney holds records of this case"),
  "p2-y42144-x22320": {
    section: P6, label: "Judicial district of the prosecuting office that holds the records",
    ...SUPPLY(
      "the judicial district of the district attorney who holds records of this case -- the same district you are filing "
      + "in, unless the charges came from somewhere else. The platform's shared field semantics protect every "
      + "district-attorney and prosecutor line from being written by a build, so this one is yours to complete"
    )
  },
  "p2-y40764-x9000": AGENCY_BOX("Agency holding records: New Mexico Department of Public Safety", "mark it if the Department of Public Safety holds records of this case"),
  "p2-y39384-x9000": AGENCY_BOX("Agency holding records: Law Enforcement Agency", "mark it if a law enforcement agency holds records of this case — the agency named beside the box is the one your intake gave"),
  "p2-y39384-x31980": {
    section: P6, label: "Name of the Law Enforcement Agency holding the records",
    ...SUPPLY(
      "the law enforcement agency that holds records of this case -- the agency you named in your intake. The platform's "
      + "shared field semantics protect every agency and law-enforcement line from being written by a build, because a "
      + "slot naming agencies is more often a court's list of who must seal than a participant's statement of who holds"
    )
  },
  "p2-y38004-x9000": AGENCY_BOX("Agency holding records: Metropolitan, Magistrate or Municipal Court", "mark it if a metropolitan, magistrate or municipal court holds records of this case"),
  "p2-y38004-x31860": {
    section: P6, label: "Location of the Metropolitan, Magistrate or Municipal Court holding the records",
    ...SUPPLY("the town or city that metropolitan, magistrate or municipal court sits in — the intake collects the court and not the place it sits")
  },
  "p2-y36624-x9000": AGENCY_BOX("Agency holding records: New Mexico State Police Investigations Bureau", "mark it if the State Police Investigations Bureau holds records of this case"),
  "p2-y35244-x9000": AGENCY_BOX("Agency holding records: Other", "mark it if some other agency holds records of this case, and name it"),
  "p2-y35244-x50400": { section: P6, label: "Other agency holding the records, short entry on the printed line", ...SUPPLY("the name of any other agency that holds records of this case") },
  "p2-y35052-x13428": { section: P6, label: "Other agency holding the records, ruled line beneath", ...SUPPLY("the rest of the name and address of any other agency that holds records of this case") },

  /* ---- page 2, section 7: where the charges originated ------------------ */
  "p2-y29724-x9000": COURT_BOX(P7, "Charges were disposed of or originated in the District Court", "mark it if the charges were disposed of or originated in the district court"),
  "p2-y29724-x20340": DISTRICT({ section: P7, label: "Judicial district of the District Court the charges were disposed of or originated in" }),
  "p2-y28344-x9000": COURT_BOX(P7, "Charges were disposed of or originated in the Metropolitan Court", "mark it if the charges were disposed of or originated in a metropolitan court"),
  "p2-y28344-x21228": { section: P7, label: "Location of the Metropolitan Court the charges were disposed of or originated in", ...SUPPLY("the town or city that metropolitan court sits in") },
  "p2-y26964-x9000": COURT_BOX(P7, "Charges were disposed of or originated in the Magistrate Court", "mark it if the charges were disposed of or originated in a magistrate court"),
  "p2-y26964-x20100": { section: P7, label: "Location of the Magistrate Court the charges were disposed of or originated in", ...SUPPLY("the town or city that magistrate court sits in") },
  "p2-y25584-x9000": COURT_BOX(P7, "Charges were disposed of or originated in the Municipal Court", "mark it if the charges were disposed of or originated in a municipal court"),
  "p2-y25584-x19908": { section: P7, label: "Location of the Municipal Court the charges were disposed of or originated in", ...SUPPLY("the town or city that municipal court sits in") },

  /* ---- page 2, section 8 ------------------------------------------------ */
  "p2-y22824-x10476": COURT_BOX(P8, "Petitioner wishes to attend any hearings by telephonic or other electronic means", "mark it if you want to attend any hearing by telephone or video. Rule 1-077.1(J) NMRA allows it on this form and no separate motion is needed"),

  /* ---- page 2, the signature section ------------------------------------ */
  "p2-y18684-x7200": NOT_A_BLANK(
    "a full-width printed divider immediately above the heading \"SIGNATURE SECTION\". It runs the whole text column, "
    + "sits under no prompt and has no caption; it separates the body of the petition from the signature block. Writing "
    + "on it would put a value across the head of the signature section"
  ),
  "p2-y10404-x7200": { section: SIGN, label: "Printed name of Petitioner", ...WRITE("participant.full_legal_name") },
  "p2-y10404-x36000": {
    section: SIGN, label: "Date beside the printed name of Petitioner",
    ...PROTECT(SIGNATURE, "signature or date field; never completed by this build. The petition is affirmed under penalty of perjury under the laws of the State of New Mexico, and the date it is affirmed is the date the participant signs it")
  },
  "p2-y7644-x7200": { section: SIGN, label: "Signature of Petitioner", ...PROTECT(SIGNATURE, "signature or date field; the participant signs their own petition and no build signs it for them") },

  /* ---- page 3, the petitioner's contact block --------------------------- */
  "p3-y68964-x7200": {
    section: SIGN, label: "Mailing Address of the Petitioner on page 3",
    ...SUPPLY(
      "your full mailing address on this one line -- street, city, state and ZIP. The platform holds every part of it and "
      + "writes the street, city, state and ZIP separately in section 1 on page 1; the shared fact registry has no "
      + "one-line mailing-address fact, its only address descriptor is the street line, and a street with no city on the "
      + "line the court writes to is worse than a line you complete yourself. The gap is recorded in build-findings.json"
    )
  },
  "p3-y66204-x7200": { section: SIGN, label: "Telephone Number of the Petitioner on page 3", ...SUPPLY("your telephone number, so the court can reach you") },
  "p3-y66204-x36000": { section: SIGN, label: "Email of the Petitioner on page 3", ...SUPPLY("your e-mail address, if you have one") },

  /* ---- page 3, the attorney block --------------------------------------- */
  "p3-y62064-x7200": { section: ATTY, label: "Attorney Name (if applicable)", ...ATTORNEY("the form marks this block \"if applicable\"; no attorney-representation fact is held for this participant and this packet is prepared for a self-represented petitioner") },
  "p3-y62064-x36000": { section: ATTY, label: "Date beside the attorney's name", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant, and a date on a signature block is never completed by this build") },
  "p3-y59304-x7200": { section: ATTY, label: "Attorney Signature", ...ATTORNEY("signature field in the attorney block; no attorney-representation fact is held for this participant and no build signs for an attorney") },
  "p3-y56544-x7200": { section: ATTY, label: "Mailing Address of the attorney", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") },
  "p3-y53376-x7200": { section: ATTY, label: "Telephone Number of the attorney", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") },
  "p3-y53376-x36000": { section: ATTY, label: "Email of the attorney", ...ATTORNEY("part of the attorney block; no attorney-representation fact is held for this participant") }
};

/* ------------------------------------------------------------------ *
 * The retained local Order on Petition to Expunge (identity theft).
 *
 * Sixty-nine measured blanks: forty-one lines and boxes plus twenty-eight
 * selection controls the form draws as a symbol-font glyph rather than as
 * "[ ]", which no bracket reader and no stroked-box reader can see.
 *
 * The New Mexico Judiciary's instruction packet says the petitioner completes
 * only the CAPTION of this form and the court completes the rest, so three
 * blanks are written and every other blank and every control on the document is
 * the court's — except the four blanks and one control that would name an
 * alleged identity thief, which are refused on the ground the form and the rule
 * both state.
 * ------------------------------------------------------------------ */

const ORDER_CAPTION = "Caption of the order";
const ORDER_FINDINGS = "The court's findings";
const ORDER_DECREE = "What the court orders";
const ORDER_OFFENDER = "The paragraph that would name the correct offender";
const ORDER_SIGN = "The judge's signature";

const OFFENDER_CONDITION =
  "the form prints, immediately above this paragraph, \"(For use when the correct offender was provided notice of the "
  + "hearing on the Petition to expunge.)\" On this track no one is provided notice at all: Rule 1-077.1(E) NMRA entitles "
  + "no responding party to notice of an identity-theft petition and the track's own record states that service is "
  + "required only for the release-without-conviction and conviction tracks, so the correct offender is never noticed and "
  + "the condition the paragraph states is never met. Rule 1-077.1 also deliberately omits the NMSA 1978, Section "
  + "29-3A-3(D) requirement that the court insert the true offender's name in the records: the committee commentary "
  + "explains that publicly naming an alleged identity thief in a civil proceeding, without notice to that person, would "
  + "violate due process.";

const COURT_LINE = (section, label, why) => ({ section, label, ...PROTECT(COURT_OWNED, why) });
const COURT_CONTROL = (section, label, why) => ({
  section, label,
  ...PROTECT(COURT_OWNED, `${why}. The form draws the control as a symbol-font glyph rather than as a stroked box or a form field, so there is nothing measured for this build to mark even if it were this build's to mark`)
});

const DICTIONARY_LOCAL_ORDER = {
  /* ---- the caption, and only the caption -------------------------------- */
  "p1-y69300-x14652": { section: ORDER_CAPTION, label: "COUNTY OF in the order's caption", ...WRITE("matter.county") },
  "p1-y67716-x7200": { section: ORDER_CAPTION, label: "Judicial district of the district court in the order's caption", ...WRITE("matter.court") },
  "p1-y60600-x9996": { section: ORDER_CAPTION, label: "In re, the petitioner's name in the order's caption", ...WRITE("participant.full_legal_name") },

  /* ---- page 1, the findings --------------------------------------------- */
  "p1-y30456-x9000": COURT_CONTROL(ORDER_FINDINGS, "Finding: Petitioner was the victim of identity theft", "a finding only the court makes, on the court's own order, and the New Mexico Judiciary's instruction packet says the petitioner completes only the caption"),
  "p1-y29076-x9000": COURT_CONTROL(ORDER_FINDINGS, "Finding: Petitioner's request is denied for all charges sought to be expunged", "a finding only the court makes"),
  "p1-y23556-x9000": COURT_CONTROL(ORDER_FINDINGS, "Finding: Petitioner's request to expunge is denied for the following charges", "a finding only the court makes"),
  "p1-y22176-x9000": COURT_LINE(ORDER_FINDINGS, "Charges for which the request is denied, first line", "the court writes the charges it is denying inside its own finding"),
  "p1-y20796-x9000": COURT_LINE(ORDER_FINDINGS, "Charges for which the request is denied, second line", "the court writes the charges it is denying inside its own finding"),
  "p1-y19416-x9000": COURT_LINE(ORDER_FINDINGS, "Charges for which the request is denied, third line", "the court writes the charges it is denying inside its own finding"),
  "p1-y9924-x7200": NOT_A_BLANK(
    "the footnote separator at the foot of page 1, above the two footnotes \"1 For use when the Petition is denied in "
    + "whole.\" and \"2 For use when Petition will be granted in part, and denied in part.\" It is a printed rule in the "
    + "page margin and not a place anyone writes"
  ),

  /* ---- page 2, the findings and the decree ------------------------------ */
  "p2-y68148-x9000": COURT_CONTROL(ORDER_FINDINGS, "Finding: Petitioner has failed to provide the required information and the Petition is summarily dismissed without prejudice", "a finding only the court makes"),
  "p2-y65388-x9000": COURT_CONTROL(ORDER_FINDINGS, "Finding: Petitioner's records are not legally eligible for expungement", "a finding only the court makes"),
  "p2-y62628-x9000": COURT_CONTROL(ORDER_FINDINGS, "Finding: venue is improper because the charges did not originate in this district", "a finding only the court makes"),
  "p2-y61248-x9000": COURT_CONTROL(ORDER_FINDINGS, "Finding: Other", "a finding only the court makes"),
  "p2-y59868-x10800": COURT_LINE(ORDER_FINDINGS, "The court's other reason Petitioner is not entitled to relief, first line", "the court writes its own reason inside its own finding"),
  "p2-y58488-x10800": COURT_LINE(ORDER_FINDINGS, "The court's other reason Petitioner is not entitled to relief, second line", "the court writes its own reason inside its own finding"),
  "p2-y57108-x10800": COURT_LINE(ORDER_FINDINGS, "The court's other reason Petitioner is not entitled to relief, third line", "the court writes its own reason inside its own finding"),
  "p2-y54696-x9000": COURT_CONTROL(ORDER_FINDINGS, "Finding: Petitioner's request to expunge is granted for all charges requested", "a finding only the court makes"),
  "p2-y49176-x9456": COURT_CONTROL(ORDER_FINDINGS, "Finding: Petitioner's request to expunge is granted only for the following charges", "a finding only the court makes"),
  "p2-y47796-x10800": COURT_LINE(ORDER_FINDINGS, "Charges for which the request is granted, first line", "the court writes the charges it is granting inside its own finding"),
  "p2-y46416-x10800": COURT_LINE(ORDER_FINDINGS, "Charges for which the request is granted, second line", "the court writes the charges it is granting inside its own finding"),
  "p2-y45036-x10800": COURT_LINE(ORDER_FINDINGS, "Charges for which the request is granted, third line", "the court writes the charges it is granting inside its own finding"),
  "p2-y35556-x7200": COURT_CONTROL(ORDER_DECREE, "It is ordered that the Petition is DENIED", "a decretal paragraph only a judge may make"),
  "p2-y32772-x7200": COURT_CONTROL(ORDER_DECREE, "It is ordered that the Petition is GRANTED", "a decretal paragraph only a judge may make"),
  "p2-y30012-x7200": COURT_CONTROL(ORDER_DECREE, "It is ordered that the Petition is GRANTED IN PART AND DENIED IN PART", "a decretal paragraph only a judge may make"),
  "p2-y11064-x7200": NOT_A_BLANK(
    "the footnote separator at the foot of page 2, above the three footnotes explaining when paragraphs 3, 4 and 5 are "
    + "used. It is a printed rule in the page margin and not a place anyone writes"
  ),

  /* ---- page 3, what shall be expunged ----------------------------------- */
  "p3-y68148-x7200": COURT_CONTROL(ORDER_DECREE, "It is further ordered that the arrest records and public records relating to the charges shall be expunged", "a decretal paragraph only a judge may make"),
  "p3-y62628-x7200": COURT_CONTROL(ORDER_DECREE, "The records expunged are those for all the charges requested in the Petition", "a decretal paragraph only a judge may make"),
  "p3-y59868-x7200": COURT_CONTROL(ORDER_DECREE, "The records expunged are those for the following charges", "a decretal paragraph only a judge may make"),
  "p3-y58488-x7200": COURT_LINE(ORDER_DECREE, "Charges whose records shall be expunged, first line", "the court writes the charges inside its own decree"),
  "p3-y57108-x7200": COURT_LINE(ORDER_DECREE, "Charges whose records shall be expunged, second line", "the court writes the charges inside its own decree"),
  "p3-y55728-x7200": COURT_LINE(ORDER_DECREE, "Charges whose records shall be expunged, third line", "the court writes the charges inside its own decree"),
  "p3-y50196-x22596": COURT_LINE(ORDER_DECREE, "District Court case number in the court's decree", "the court states the case numbers its own order reaches; the petitioner completes only the caption of this form"),
  "p3-y48324-x23664": COURT_LINE(ORDER_DECREE, "Appellate Court case number in the court's decree", "the court states the case numbers its own order reaches"),
  "p3-y46248-x29388": COURT_LINE(ORDER_DECREE, "Magistrate or Municipal Court case number in the court's decree", "the court states the case numbers its own order reaches"),
  "p3-y44184-x25260": COURT_LINE(ORDER_DECREE, "Metropolitan Court case number in the court's decree", "the court states the case numbers its own order reaches"),
  "p3-y41916-x28620": DECRETAL(
    "this line sits inside the decretal paragraph of a proposed order, where the court states the law enforcement agency "
    + "case number its own order reaches. The New Mexico Judiciary's instruction packet directs the petitioner to complete "
    + "only the caption of the Order on Petition to Expunge and states that the court completes the rest of the form"
  ),
  "p3-y39852-x28128": COURT_LINE(ORDER_DECREE, "Arrest number from the fingerprint card, in the court's decree", "the court states the arrest number its own order reaches"),
  "p3-y39852-x43104": COURT_LINE(ORDER_DECREE, "Date beside the arrest number, in the court's decree", "the court states the date its own order reaches"),
  "p3-y31428-x7200": COURT_CONTROL(ORDER_DECREE, "It is further ordered that the following agencies shall expunge the necessary records", "a decretal paragraph only a judge may make"),
  "p3-y28668-x10692": COURT_LINE(ORDER_DECREE, "The number of days the agencies have to expunge the records", "the court sets the period inside its own decree, and Section 29-3A-3 requires it to allow a minimum of sixty days"),
  "p3-y20388-x9000": COURT_CONTROL(ORDER_DECREE, "Agency ordered to expunge: District Attorney", "the court directs its own order to the agencies it chooses"),
  "p3-y20388-x22296": COURT_LINE(ORDER_DECREE, "Judicial district of the District Attorney the court directs its order to", "the court names the district inside its own decree"),
  "p3-y18804-x9000": COURT_CONTROL(ORDER_DECREE, "Agency ordered to expunge: New Mexico Department of Public Safety", "the court directs its own order to the agencies it chooses"),
  "p3-y17220-x9000": COURT_CONTROL(ORDER_DECREE, "Agency ordered to expunge: Arresting agency", "the court directs its own order to the agencies it chooses"),
  "p3-y17220-x18888": DECRETAL(
    "this line sits inside the decretal paragraph of a proposed order, where the court names the arresting agency its own "
    + "order directs. The New Mexico Judiciary's instruction packet directs the petitioner to complete only the caption of "
    + "the Order on Petition to Expunge and states that the court completes the rest of the form. The agency the "
    + "participant's intake gave is written on Form 4-951 section 6, which is the petitioner's own statement of who holds "
    + "the records; this line is the court's statement of who it is ordering"
  ),
  "p3-y15636-x9000": COURT_CONTROL(ORDER_DECREE, "Agency ordered to expunge: Other, first", "the court directs its own order to the agencies it chooses"),
  "p3-y15444-x13740": DECRETAL(
    "this line sits inside the decretal paragraph of a proposed order: the first ruled line on which the court names another agency its own order directs to expunge. The New Mexico Judiciary's instruction packet directs the petitioner to complete only the caption of the Order on Petition to Expunge and states that the court completes the rest of the form"
  ),
  "p3-y14040-x9000": COURT_CONTROL(ORDER_DECREE, "Agency ordered to expunge: Other, second", "the court directs its own order to the agencies it chooses"),
  "p3-y14040-x13728": DECRETAL(
    "this line sits inside the decretal paragraph of a proposed order: the second ruled line on which the court names another agency its own order directs to expunge. The New Mexico Judiciary's instruction packet directs the petitioner to complete only the caption of the Order on Petition to Expunge and states that the court completes the rest of the form"
  ),
  "p3-y12456-x9000": COURT_CONTROL(ORDER_DECREE, "Agency ordered to expunge: Other, third", "the court directs its own order to the agencies it chooses"),
  "p3-y12456-x13728": DECRETAL(
    "this line sits inside the decretal paragraph of a proposed order: the third ruled line on which the court names another agency its own order directs to expunge. The New Mexico Judiciary's instruction packet directs the petitioner to complete only the caption of the Order on Petition to Expunge and states that the court completes the rest of the form"
  ),

  /* ---- page 4, the clerk's direction ------------------------------------ */
  "p4-y70908-x7200": COURT_CONTROL(ORDER_DECREE, "It is further ordered that the court clerk shall expunge the necessary records", "a decretal paragraph only a judge may make"),
  "p4-y68148-x18912": COURT_CONTROL(ORDER_DECREE, "The clerk directed is that of the District Court", "the court names the clerk its own order directs"),
  "p4-y68148-x30312": COURT_LINE(ORDER_DECREE, "Judicial district of the District Court clerk the order directs", "the court names the district inside its own decree"),
  "p4-y68148-x46440": COURT_CONTROL(ORDER_DECREE, "The clerk directed is that of the Metropolitan Court", "the court names the clerk its own order directs"),
  "p4-y65388-x11664": COURT_LINE(ORDER_DECREE, "Location of the Metropolitan Court whose clerk the order directs", "the court names the location inside its own decree"),
  "p4-y65388-x25260": COURT_CONTROL(ORDER_DECREE, "The clerk directed is that of the Magistrate Court", "the court names the clerk its own order directs"),
  "p4-y65388-x36720": COURT_LINE(ORDER_DECREE, "Location of the Magistrate Court whose clerk the order directs", "the court names the location inside its own decree"),
  "p4-y65388-x52920": COURT_CONTROL(ORDER_DECREE, "The clerk directed is that of the Municipal Court", "the court names the clerk its own order directs"),
  "p4-y62628-x18144": COURT_LINE(ORDER_DECREE, "Location of the Municipal Court whose clerk the order directs", "the court names the location inside its own decree"),
  "p4-y59868-x7200": COURT_LINE(ORDER_DECREE, "The number of days the court clerk has to expunge the records", "the court sets the period inside its own decree, and may not expunge court records earlier than thirty days from entry of the order"),

  /* ---- page 4, the paragraph that would name the correct offender ------- */
  "p4-y48828-x7200": {
    section: ORDER_OFFENDER,
    label: "Order that the records be corrected to reflect the name and contact information of the correct offender",
    ...INAPPLICABLE(
      OFFENDER_CONDITION,
      "this build never asks a court to name an alleged identity thief, and never leaves the request on the paper for "
      + "someone else to make. The control and the three blanks beneath it are refused on the ground the form and the rule "
      + "both state, and participant-instructions.md explains it under a heading of its own"
    )
  },
  "p4-y40548-x19524": {
    section: ORDER_OFFENDER, label: "Name of actual offender",
    ...INAPPLICABLE(
      OFFENDER_CONDITION,
      "the name of an alleged identity thief is never written into this order by anyone this packet speaks for. Naming "
      + "the true offender is a self-help stop condition for this track and a self_help_boundary limitation on the "
      + "track's legal-design decision, and the paragraph is conditioned on notice that this track never gives"
    )
  },
  "p4-y39168-x18000": {
    section: ORDER_OFFENDER, label: "Contact information of the actual offender, first line",
    ...INAPPLICABLE(OFFENDER_CONDITION, "the contact information of an alleged identity thief is never written into this order, for the same reason as their name")
  },
  "p4-y37788-x18000": {
    section: ORDER_OFFENDER, label: "Contact information of the actual offender, second line",
    ...INAPPLICABLE(OFFENDER_CONDITION, "the second line of the same refused entry")
  },
  "p4-y36408-x18000": {
    section: ORDER_OFFENDER, label: "Contact information of the actual offender, third line",
    ...INAPPLICABLE(OFFENDER_CONDITION, "the third line of the same refused entry")
  },

  /* ---- page 4, the judge's signature ------------------------------------ */
  "p4-y29316-x9804": { section: ORDER_SIGN, label: "Date the District Court Judge signs the order", ...PROTECT(SIGNATURE, "signature or date field; the judge dates their own order") },
  "p4-y29316-x32400": { section: ORDER_SIGN, label: "Signature of the District Court Judge", ...PROTECT(SIGNATURE, "signature or date field; the judge signs their own order and no build signs for a judge") }
};

/* ------------------------------------------------------------------ *
 * Fixtures.
 *
 * Two synthetic participants, neither a real person. They carry exactly the
 * facts this track's intake collects -- name, other names, date of birth,
 * mailing location, county of record, judicial district, case number and
 * arresting agency -- and no telephone number and no e-mail address, because
 * the intake for this track asks for neither and a packet that wrote one would
 * be asserting on a sworn petition something the platform does not hold.
 * ------------------------------------------------------------------ */
const compose = (f) => ({
  ...f,
  "participant.city_state_zip": `${f["participant.city"]}, ${f["participant.state"]} ${f["participant.zip"]}`,
  "participant.mailing_address_one_line":
    `${f["participant.street_address"]}, ${f["participant.city"]}, ${f["participant.state"]} ${f["participant.zip"]}`
});

const FIXTURES = {
  canonical: compose({
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.other_names": "Jordan A. Reyes; Jordy Reyes",
    "participant.date_of_birth": "1978-04-17",
    "participant.street_address": "412 Coal Avenue SW",
    "participant.city": "Albuquerque",
    "participant.state": "NM",
    "participant.zip": "87102",
    "matter.county": "Bernalillo",
    "matter.court": "Second",
    "matter.case_number": "D-202-CR-2019-01147",
    "matter.arresting_agency": "Albuquerque Police Department"
  }),
  boundary: compose({
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.other_names": "Maria A. Whitfield; M. A. O'Shaughnessy; Maria Alejandra Whitfield-Ruiz",
    "participant.date_of_birth": "1961-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Rd Apt 14B",
    "participant.city": "Truth or Consequences",
    "participant.state": "NM",
    "participant.zip": "87901",
    "matter.county": "Sierra",
    "matter.court": "Seventh",
    "matter.case_number": "D-721-CR-2014-00118"
  , "matter.arresting_agency": "Sierra County Sheriff's Office"
  })
};

/* ------------------------------------------------------------------ *
 * The participant's instructions.
 * ------------------------------------------------------------------ */
function participantInstructions({ rbf, controls, inapplicable }) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const controlsByDoc = new Map();
  for (const c of controls) controlsByDoc.set(c.document, [...(controlsByDoc.get(c.document) ?? []), c]);

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is four official New Mexico forms, prepared for a petition to expunge arrest records and public records "
    + "you were wrongly named in because of identity theft, under NMSA 1978, Section 29-3A-3 and Rule 1-077.1 NMRA.", "",
    "- **Form 4-951 NMRA**, _Petition to Expunge Arrest Records and Public Records (Identity Theft)_ — what you file.",
    "- **Form 4-960.1 NMRA**, _Notice of Hearing_ — you give this to the court so it can set a hearing if it decides to hold one.",
    "- **Order on Petition to Expunge (Identity Theft)** — the order you give the court to sign. **Read the section below about which district's order form you need.**",
    "- **Form 4-222 NMRA**, _Application for Free Process and Affidavit of Indigency_ — file this only if you cannot pay the filing fee. **Read the section below about the court name printed on it.**", ""
  );
  out.push(
    "The platform filled in what it holds about you and your case: your name, your other names, your date of birth, your "
    + "address, the county, the judicial district, the case number and the arresting agency. Everything else is yours, and "
    + "every one of those blanks is listed below by the form and the section it is in.", ""
  );

  out.push("## Nobody is served with this petition, and nobody objects to it", "");
  out.push(
    "On the identity-theft track, **Rule 1-077.1(E) NMRA entitles no responding party to notice** of your petition. You "
    + "do not serve the district attorney, the police, or anyone else, and there is no certificate of service in this "
    + "packet because none is required. That is why:", "",
    "- **Form 4-960.1 page 2 is left completely blank.** Its four blocks are for parties entitled to notice of the "
    + "hearing, and the form's own use notes say those are the petitioner and any party that filed and served an "
    + "objection within sixty-three days **of the date of service**. Nobody is served on this track, so nobody can "
    + "object, and nobody but you can be entitled to notice. Your own details are on page 1.",
    "- **The court may decide your petition on the pleadings** if no objection is filed. The notice of hearing is there "
    + "in case it sets a hearing instead.", ""
  );

  out.push("## The packet will not name the person who used your identity", "");
  out.push(
    "Page 4 of the proposed order has a paragraph asking for the **name and contact information of the correct "
    + "offender**. This packet leaves it empty on purpose, and you should leave it empty too.", "",
    "- The form itself says that paragraph is **\"for use when the correct offender was provided notice of the hearing "
    + "on the Petition to expunge\"**. On this track nobody is given notice, so that condition is never met.",
    "- **Rule 1-077.1 deliberately leaves out** the part of Section 29-3A-3(D) that would have the court insert the true "
    + "offender's name. The rule committee explained why: publicly naming an alleged identity thief in a civil case, "
    + "without giving that person notice, would violate their right to due process.",
    "- If anyone asks you to put a name there, **stop and get legal advice**. Naming someone in a court order that they "
    + "were never told about can create problems for you as well as for them.", ""
  );

  out.push("## Which district's order form you need", "");
  out.push(
    "There is **no statewide Supreme Court order form** in the mandatory 4-951 to 4-960.3 set. Each judicial district "
    + "publishes its own _Order on Petition to Expunge_ in its expungement packet, and the order in this packet is one "
    + "district's copy. **Before you file, check the expungement packet published by the judicial district you are filing "
    + "in and use that district's order form if it has one.** The caption you need is the same either way: your county, "
    + "your judicial district, and your name.", "",
    "The Judiciary's instructions also say to **complete only the caption** of the order and to leave the rest of it "
    + "blank, because the court fills in its findings and what it is ordering. That is exactly what this packet has done.", ""
  );

  out.push("## The court name printed on the fee-waiver form", "");
  out.push(
    `**Form 4-222 and the order bound with it print \`${PRINTED_DISTRICT_IN_THE_CAPTION}\` in the caption.** That is `
    + "printed on the form itself, not a blank, so nothing can change it. If you are filing anywhere other than the Sixth "
    + "Judicial District (Grant, Hidalgo or Luna County), **cross out that line by hand and write your own judicial "
    + "district**, or ask the district court clerk for their copy of Form 4-222 NMRA. Do not file it with the wrong court "
    + "named on it.", ""
  );

  out.push("## Where you file, and what it costs", "");
  out.push(
    "File with the **clerk of the New Mexico district court** for the county where the charges originated, where the "
    + "arrest happened, or where a conviction was entered — Rule 1-077.1(B)(1) NMRA. You file in **district court even if "
    + "the case was in a metropolitan, magistrate or municipal court**, and even if no case was ever filed against you.", "",
    "- Bring **copies for yourself and for the judge**, and a **self-addressed stamped envelope** so the court can mail "
    + "you the notice of hearing.",
    "- The district court filing fee is **$132.00**, and most courts want a money order or cashier's check rather than a "
    + "card or a personal check. **Whether that fee is charged on an identity-theft petition is not settled**, so ask the "
    + "clerk. If you cannot pay it, file Form 4-222 instead.",
    "- Court copies run about **$0.35 per page**.", ""
  );

  out.push("## Proving you are a victim of identity theft", "");
  out.push(
    "Section 29-3A-3(B) requires **a showing that you are a victim of identity theft**, and neither the statute, nor Rule "
    + "1-077.1, nor Form 4-951 says what satisfies it. Section 4 of the petition tells you to **attach copies of any "
    + "records you have** about the case. Bring whatever you have — a police report, a fraud affidavit, a credit bureau "
    + "letter, correspondence showing the record is not yours — and **ask the clerk or a legal aid provider what your "
    + "district expects**. This packet cannot tell you, because nothing in the official record says.", ""
  );

  out.push("## Boxes you tick with a pen", "");
  out.push(
    "These New Mexico forms draw their tick boxes as **printed characters, not as fillable fields**, so nothing can mark "
    + "them for you. Mark these by hand, and only the ones that are true for you:", ""
  );
  for (const [doc, items] of controlsByDoc) {
    out.push(`### ${doc}`, "");
    for (const c of items) out.push(`- **Page ${c.page}, ${c.section}** — ${c.label}.`);
    out.push("");
  }

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in every item in the tables below.** Each names the form, the section and the blank.");
  out.push("2. **Tick every box under _Boxes you tick with a pen_ that applies to you** — including, on Form 4-951, whether you are unrepresented by counsel, which agencies hold your records, and which court the charges came from.");
  out.push("3. **Attach copies of any records you have** about the case that was not yours.");
  out.push("4. **Sign and date Form 4-951 yourself.** Your printed name is already there; the signature and the date are yours, and the petition is affirmed under penalty of perjury.");
  out.push("5. **Leave the hearing date, time and place on Form 4-960.1 blank.** The court fills those in.");
  out.push("6. **Leave everything below the caption of the order blank.** The court fills that in.");
  out.push("7. **Do not fill in the name or contact information of the correct offender.** See above.");
  out.push("");

  for (const [doc, items] of byDoc) {
    out.push(`## ${doc} — the items you must supply`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature and its date** on Form 4-951. The petition is sworn under penalty of perjury and the date is the date you sign.");
  out.push("- **The hearing date, time, length, place and subject on Form 4-960.1**, and the judge's name and the court's signature block. The court supplies all of them.");
  out.push("- **Everything below the caption of the order**, including every finding and everything the court orders.");
  out.push("- **The attorney block on page 3 of Form 4-951 and the attorney's certificate on page 5 of Form 4-222.** This packet is prepared for someone filing without a lawyer.");
  out.push("- **The notary block on page 4 of Form 4-222.** The notary completes it when you sign.");
  out.push("- **Every financial answer on Form 4-222.** That form is sworn under oath and the platform holds none of your financial facts.");
  out.push("");

  if (inapplicable.length > 0) {
    out.push("## Blanks that do not apply on this route", "");
    out.push(
      "These are places on the forms that belong to a branch this petition does not use. They stay empty, and here is "
      + "why each one does:", ""
    );
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
    + "not decide whether your records will be expunged. **Get a lawyer's help** if anyone disputes that the record is "
    + "not yours, if any charge or proceeding is pending against you anywhere, if any party objects, if the court sets a "
    + "contested hearing, if any of the records are federal, tribal, military or from outside New Mexico, or if you are "
    + "not a United States citizen — the Judiciary's own packet tells non-citizens to seek legal advice about what "
    + "expungement may mean for them. Expungement does not reach federal, tribal, military or out-of-state records, does "
    + "not destroy records, and does not remove the disclosure obligations that FINRA and the SEC impose on people who "
    + "work in securities."
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
    {
      sourceId: "official-form:4-951", documentId: "NM-4-951", formNumber: "4-951",
      title: "Petition to expunge arrest records and public records; identity theft",
      sha256: "b8a0dba2cd21f9fed317ccea57e568a360345608782cea2a3f0e34b769ae67e4",
      instrumentKind: "primary_filing", strategy: "measured_flat_overlay",
      dictionary: DICTIONARY_4_951
    },
    {
      ...FORM_4_960_1, instrumentKind: "notice_of_hearing",
      dictionary: dictionary4960_1({ service: "none", trackName: "identity-theft" })
    },
    {
      sourceId: "official-form:NM-LOCAL-IDENTITY-THEFT-ORDER", documentId: "NM-LOCAL-IDENTITY-THEFT-ORDER",
      formNumber: "NM-LOCAL-IDENTITY-THEFT-ORDER",
      title: "Order on Petition to Expunge Arrest Records and Public Records Pursuant to NMSA 1978, Section 29-3A-3 (Identity Theft)",
      sha256: "80a70804dff453a8c1a2c775e90dc6ddec3090895aee860d0cc4474b22f39abd",
      instrumentKind: "proposed_order", strategy: "measured_flat_overlay",
      dictionary: DICTIONARY_LOCAL_ORDER
    },
    {
      ...FORM_4_222, instrumentKind: "fee_waiver_application",
      dictionary: DICTIONARY_4_222, printedBlankDictionary: PRINTED_BLANKS_4_223
    }
  ],
  /*
   * Every component the packet-set manifest names, and where this build
   * delivers it.
   *
   * Two of the six are process_guidance and the manifest marks both REQUIRED.
   * They are not documents with blanks, so no field map can carry them and the
   * completeness verifier -- which derives its component denominator from the
   * field map and the source receipt -- cannot see whether they were delivered
   * at all. They are delivered as named sections of participant-instructions.md
   * and reconciled against the manifest on every build, which refuses if a
   * component is unaccounted for or a named section is absent from the text.
   */
  componentDelivery: {
    "nm_identity_theft-primary-filing-1": {
      deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-951, pages 1 to 3 of both fixtures"
    },
    "nm_identity_theft-notice-of-hearing-2": {
      deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-960.1, pages 4 to 6 of both fixtures"
    },
    "nm_identity_theft-proposed-order-3": {
      deliveredAs: "official_pdf_fill", deliveredBy: "NM-LOCAL-IDENTITY-THEFT-ORDER, pages 7 to 10 of both fixtures",
      note: "the manifest marks this conditional on the participant filing in the judicial district that published the retained order. The instructions tell every other district's participant to obtain their own district's order form."
    },
    "nm_identity_theft-local-order-form-instructions-4": {
      deliveredAs: "process_guidance", deliveredBy: "participant-instructions.md",
      section: "## Which district's order form you need",
      note: "required by the manifest and by the track's own record, because no statewide Supreme Court order form exists in the mandatory 4-951 to 4-960.3 set and the retained order is one district's copy."
    },
    "nm_identity_theft-fee-waiver-application-5": {
      deliveredAs: "official_pdf_fill", deliveredBy: "NM-4-222 with Form 4-223, pages 11 to 17 of both fixtures",
      note: "conditional on the participant being unable to pay the district court filing fee. See the blocking finding about the district printed in its caption."
    },
    "nm_identity_theft-filing-instructions-6": {
      deliveredAs: "process_guidance", deliveredBy: "participant-instructions.md",
      section: "## Where you file, and what it costs",
      note: "which district court, what to bring, that no service is required on this track, that the court may decide on the pleadings, and the post-order timing, which is carried in the section headed 'After the order is signed'."
    }
  },
  routeSelectionNote:
    "Nothing in this packet is a route election. Rule 1-077.1 NMRA is one procedure and Section 29-3A-3 is one section; "
    + "the agencies that hold the records, the court the charges came from, whether other expungement cases are pending, "
    + "whether an expungement was ever denied, and whether the participant wants to appear by telephone are all facts "
    + "about the participant's own case and their own choices. The one place a route DOES decide something is Form "
    + "4-960.1's page-2 service blocks, and this route decides they are not reached: Rule 1-077.1(E) NMRA entitles no "
    + "responding party to notice on the identity-theft track.",
  whatToLookAt: [
    "Form 4-951 page 1, the caption: the county on the COUNTY OF rule, the judicial district on the rule that runs into "
      + "the printed word JUDICIAL, and the petitioner's name on the In re rule. Confirm each value sits ON its own "
      + "printed run and does not overlap the printed caption to its left or the word that follows it.",
    "Form 4-951 page 1, section 1: date of birth, mailing address, city, state and ZIP written on their own rules; all "
      + "three phone boxes empty; the first alias line written and the two below it empty.",
    "Form 4-951 page 1 and 2: every printed [ ] box unmarked, on the representation election, sections 2 and 3, all "
      + "seven agency boxes, all four originating-court boxes and the telephonic-appearance box.",
    "Form 4-951 page 2, section 6: the county on the Sheriff line, the judicial district on the District Court and "
      + "District Attorney lines, and the arresting agency on the Law Enforcement Agency line. These are short runs "
      + "inside a printed sentence and are the placements most likely to overlap.",
    "Form 4-951 page 2, the SIGNATURE SECTION: the printed name written, the date beside it empty, and the signature "
      + "line below empty. Confirm nothing was written on the full-width divider above the heading.",
    "Form 4-951 page 3: the mailing address written; telephone, e-mail and the whole attorney block empty.",
    "Form 4-960.1 page 1: county, district and name in the caption, and the petitioner's name and address in the "
      + "PARTIES ENTITLED TO NOTICE block; items 1 to 5, the judge's name and the TCAA signature block all empty.",
    "Form 4-960.1 page 2: COMPLETELY EMPTY. All twenty blanks of the four service blocks, on a track where nobody is served.",
    "The Order on Petition to Expunge: the caption written on page 1 and NOTHING ELSE anywhere on the four pages. In "
      + "particular page 4's \"Name of actual offender\" and \"Contact information\" lines must be empty, and the box in "
      + "front of that paragraph unmarked.",
    "Form 4-222 pages 1 and 6: the printed \"SIXTH JUDICIAL DISTRICT COURT\" caption, which no field covers and which "
      + "this build cannot change. Confirm the county and the petitioner's name are written and the respondent line and "
      + "the three case-number boxes are empty.",
    "Form 4-222 pages 1 to 3: every financial box unmarked and every financial line empty.",
    "Form 4-222 page 4: the printed name, street address and city/state/ZIP written; the signature, the telephone, both "
      + "party boxes and the whole notary block empty.",
    "Form 4-222 pages 5, 6 and 7: the attorney certificate empty, and every finding, decretal blank and the judge's "
      + "signature line on Form 4-223 empty."
  ],
  blockingFindings: [PRINTED_DISTRICT_FINDING],
  findings: [
    {
      finding:
        "Three of the four documents are FLAT PDFs with no AcroForm field: Form 4-951, Form 4-960.1 and the retained "
        + "local order. Their blanks are underscore GLYPH RUNS far more often than stroked rules -- the existing stroke "
        + "reader finds 15 rules on Form 4-951 where the form has 71 blanks -- so the shared measureRuledBlank path finds "
        + "almost none of them.",
      consequence:
        "They are measured by scripts/rcap-nm-flat-forms/nm-flat-blank-measurer.mjs, which reads underscore runs from the "
        + "per-glyph x and advance the shared anchor-capture walker reports, joins runs that abut across two text-showing "
        + "operators at 1.2pt, and locates printed \"[ ]\" pairs and symbol-font tick glyphs. Every measured blank must "
        + "carry a dictionary row and every dictionary row must match a measured blank, checked on every build in both "
        + "directions, so a blank that moves stops the build rather than moving a write box with it."
    },
    {
      finding:
        "New Mexico rule forms mark amended text by UNDERLINING and BRACKETING it, and the 2025 amendments left both "
        + "marks all over these forms. Eleven strokes on Form 4-951 and four on the local order carry printed words on "
        + "them; three bracket pairs on Form 4-951 page 2 are the renumbered old paragraph numbers \"[5.]\", \"[6.]\" and "
        + "\"[7.]\" rather than tick boxes.",
      consequence:
        "The measurer tells an underline from a blank by whether printed glyphs sit on the stroke and overlap its span by "
        + "more than two points, and tells a control from a citation by whether the bracket pair is EMPTY. Both tests were "
        + "written against a first measurement that got them wrong: a width threshold generous enough for \"[ ]\" also "
        + "admitted \"[5.]\", and a bare overlap test made the colon of \"District Court case number:\" into an amendment "
        + "mark and deleted a real blank from the map."
    },
    {
      finding:
        "The retained order is one judicial district's form. The Master Library holds it under 05_SOURCE_GATED with its "
        + "official_title recorded as \"Petitioner.\" -- the harvest could not read a title off it -- and no statewide "
        + "Supreme Court order form exists in the mandatory 4-951 to 4-960.3 set.",
      consequence:
        "The packet-set manifest already makes the component conditional on the district that published it, and the "
        + "record requires a local_order_form_instructions component telling everyone else to obtain their own district's "
        + "form. participant-instructions.md carries that instruction under a heading of its own, before the field tables. "
        + "A build that shipped the retained order unconditionally would assert one district's practice as statewide."
    },
    {
      finding:
        "Form 4-222's caption prints a judicial district that no field covers. See the blocking finding above.",
      consequence:
        "Recorded as blocking, named for visual review, and stated to the participant. Counsel should decide whether the "
        + "fee-waiver component may ship statewide on this binary."
    },
    {
      finding:
        "Every glyph on Form 4-222 reports inexact metrics: the font supplies no widths, so the shared text walker falls "
        + "back to the font size as the advance and the reported x drifts to nearly twice the truth by the end of a line. "
        + "All 11,846 glyphs on the document are affected.",
      consequence:
        "Nothing on that document is positioned from text geometry. Its 158 AcroForm widget rectangles are exact and are "
        + "what every write is placed on. The 27 blanks Form 4-223 prints on pages 6 and 7, which no widget covers, are "
        + "identified by page, baseline and position along the printed line -- an ordinal survives the drift where a "
        + "coordinate does not -- and no write box is derived from any of them. The three flat forms are checked the other "
        + "way: the build refuses if any page of a measured-overlay document reports inexact metrics."
    },
    {
      finding:
        "Form 4-222 is bound in the Master Library with Form 4-223, Order on Application for Free Process, on pages 6 and "
        + "7 of the same binary, and the manifest marks the asset packet_candidate: no.",
      consequence:
        "Both forms are censused. The order's findings and decretal blanks are printed characters with no widget behind "
        + "them and are carried in the field map as the court's, so nothing on the paper the participant receives is "
        + "unclassified. The manifest's packet_candidate flag is recorded here for counsel: the track's own "
        + "legal-design record names Form 4-222 as this route's fee-waiver component with outputStrategy "
        + "official_pdf_fill, and the two records should be reconciled before release."
    },
    {
      finding:
        "The intake this track's legal-design record defines collects the participant's name, other names, date of birth, "
        + "mailing location, county, case identifiers and the agencies holding the records. It collects NO telephone "
        + "number and NO e-mail address, and the forms ask for a telephone number six times and an e-mail three times.",
      consequence:
        "Every one of those blanks is declared required-before-filing and named in participant-instructions.md rather "
        + "than filled from a value the platform does not hold. Form 4-951's three separate boxes -- Home Phone, Work "
        + "Phone and Cell -- would in any case be three different facts, and writing one held number into any of them "
        + "would assert on a petition sworn under penalty of perjury which kind of number it is."
    },
    {
      finding:
        "The judicial district is written seven times on Form 4-951 alone, and the platform holds it: the New Mexico "
        + "state pack's required-field set for the identity_theft pathway names judicialDistrict as a required intake "
        + "field.",
      consequence:
        "It is written on every one of them, including on the two paragraph-2 lines whose boxes the participant has yet "
        + "to tick. The district is the same on either branch, so the value is correct whichever box they mark."
    },
    {
      finding:
        "No selection control anywhere in this packet is marked, including on Form 4-222 where the controls ARE AcroForm "
        + "checkboxes with measured rectangles.",
      consequence:
        "On the three flat forms there is nothing measured to mark: the controls are printed \"[ ]\" characters or "
        + "symbol-font glyphs, checkboxCandidates finds no stroked box, and a mark drawn from a derived coordinate is a "
        + "mark nobody measured. On Form 4-222 the shared finalizer writes text values only -- and every box on it is a "
        + "sworn assertion about the applicant's own finances. All of them are listed in "
        + "reports/blanks-left-for-the-participant.json and named in participant-instructions.md with what to mark."
    }
  ],
  mattersForTheReviewersAttention: [
    "BLOCKING: Form 4-222 and Form 4-223 print \"SIXTH JUDICIAL DISTRICT COURT\" in their captions with no field over it. "
      + "Counsel should decide whether the fee-waiver component may ship statewide on this binary, or must be conditioned "
      + "on the Sixth Judicial District the way the retained local order is conditioned on the district that published it.",
    "The retained Order on Petition to Expunge is one district's form and the packet-set manifest already makes it "
      + "conditional. reports/independent-visual-review.json asks the reviewer to confirm that nothing below its caption "
      + "is written.",
    "Page 4 of that order would name an alleged identity thief. Five blanks and controls there are classified "
      + "NOT_APPLICABLE_ON_THIS_ROUTE against a condition the form itself prints and Rule 1-077.1 supplies; counsel should "
      + "confirm both the classification and the way it is explained to the participant.",
    "Twenty blanks on Form 4-960.1 page 2 are classified NOT_APPLICABLE_ON_THIS_ROUTE because nobody is served on this "
      + "track. The same twenty blanks are required-before-filing on the conviction and release-without-conviction "
      + "families, which do serve; the two dispositions should be read together.",
    "Section 29-3A-3(B) requires a showing that the participant is a victim of identity theft and nothing in the official "
      + "record says what satisfies it. The instructions say so plainly rather than inventing an evidence list. This is "
      + "recorded in the track's legal-design decision as a release blocker on participant_instructions.",
    "Whether the $132.00 district court filing fee applies to an identity-theft petition is unresolved in the track's own "
      + "record. The instructions tell the participant to ask the clerk."
  ]
};

export async function runFamily(argv = process.argv.slice(2)) {
  return runNmFamily(FAMILY, argv);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
