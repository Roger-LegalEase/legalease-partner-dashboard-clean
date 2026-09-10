#!/usr/bin/env node
/**
 * The Massachusetts § 100K expungement family — `ma-expunge-k-set`.
 *
 *   node scripts/build-census-v1-ma-expunge-k-set.mjs [--check] [--no-raster]
 *
 * ONE official Trial Court form: PETITION FOR EXPUNGEMENT, G.L. c. 276, § 100K,
 * footer "(Rev. 12.20.18)". Two pages, 26 AcroForm widgets. Page 1 is the
 * petition; page 2 is the court's own INSTRUCTIONS TO PETITIONER sheet with an
 * "Additional Information:" continuation box at its foot. The route-obligation
 * census records this family's single route's deliverable as the primary filing
 * alone, and this packet is that filing and nothing else.
 *
 * THIS IS EXPUNGEMENT, NOT SEALING, AND THE PAPER SAYS SO
 *
 * § 100K is the non-time-based EXPUNGEMENT section: the judge orders the record
 * permanently DESTROYED, on clear and convincing evidence that it was created
 * on one of eight enumerated grounds and that expungement is in the interests of
 * justice. It is a different remedy, under a different section, on a different
 * petition, from the § 100C court-requested SEALING this lane also builds
 * (`ma-seal-court-set`, form TC0057). Nothing is shared between the two builds
 * but the state: different statute, different printed caption, different
 * eligibility recitals, different consequence. Both petitions do go to a clerk's
 * office, and that shared destination is the one thing that could flatten them
 * into each other, so every sentence this packet prints about its own remedy is
 * read from THIS form's own binary or from THIS route's own census record.
 *
 * THE EIGHT GROUNDS ARE DETERMINED BY THE CASE, NOT BY THE ROUTE
 *
 * Part of page 1 reads "I make this request because the records were created as
 * a result of:" over eight boxes — false use of my identification, unauthorized
 * use of my identity, theft of my identity, the offense(s) is/are no longer a
 * crime, errors by law enforcement, errors by civilian or expert witness(es),
 * errors by Court employees, fraud perpetrated upon the Court.
 *
 * They LOOK like a route fork and they are not one. This family's single route
 * key is
 * `obligation:track-pathway:MA:ma-expunge-k:non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k`
 * — it spans all eight grounds, and the route-obligation census records the
 * waiting-period basis for it as "A record created on one of the eight statutory
 * grounds | None" without naming one. Which ground created a particular
 * participant's record is a fact of that record. So each of the eight is
 * declared REQUIRED_BEFORE_FILING with `determinedByTheCaseNotTheRoute` and the
 * reason the route cannot determine it, which is the completeness contract's
 * own auditable exception. Ticking one from nothing would be a legal
 * characterisation this build has no record for, on a petition sworn under the
 * pains and penalties of perjury.
 *
 * WHAT THIS BUILD WRITES: ONE BOX, FROM THREE HELD FACTS
 *
 * `YOUR NAME AND ADDRESS` is a single multiline widget, 245.6 x 75.3 points, and
 * the form gives it no sub-captions. The platform holds the name and the address
 * as separate descriptors, so this is the composed channel's case exactly: the
 * builder names FACT IDS — participant.full_legal_name, participant.street_address,
 * participant.city_state_zip — and the finalizer resolves each against the same
 * fact set every other write is resolved from and joins them one per line. No
 * caller text reaches the page, and a fact that is not held refuses the whole
 * box rather than composing a partial contact block.
 *
 * EVERY OTHER WIDGET IS REFUSED, EACH FOR ITS OWN MEASURED REASON
 *
 *   - DOCKET NO., the charge list and COURT DIVISION are case facts on a court
 *     record the platform has not seen.
 *   - The four COURT DEPARTMENT boxes say where the case was HEARD. The census
 *     records the destination as "File in the clerk's office in the court where
 *     the case was heard" — a case fact, not a route election.
 *   - The "Specifically" narrative and the page-2 continuation box are the
 *     participant's own sworn words. The census records the narrative as a
 *     later-completion field in terms.
 *   - The interpreter request, the hearing request, the more-space box and the
 *     documents-attached box are genuine participant elections.
 *   - The two service-method boxes and the service DATE certify an act that has
 *     not happened when the packet is prepared. The form's own instruction sheet
 *     puts it "on or before the day that this petition is filed in the court",
 *     which is after this build. The date is protected; the method boxes are the
 *     participant's.
 *
 * THE PETITION HAS NO SIGNATURE WIDGET AT ALL. Page 1 prints "DATE:" and
 * "PETITIONER'S SIGNATURE" on a rule at y 62 and the AcroForm carries no field
 * there. There is nothing for this build to protect and nothing for it to write;
 * the participant signs the paper. Recorded rather than passed over, because a
 * signature line with no widget is invisible to every field counter.
 *
 * THE BINARY IS AN XFA HYBRID. pdf-lib announces "Removing XFA form data" on
 * load, and the sanitation report records xfaPresentInInput / xfaRemoved. The
 * source-identity sweep records `xfaPresent: false` for these same bytes; that
 * disagreement is measured here and returned as a finding rather than resolved
 * silently. The AcroForm side of the hybrid is complete, so the ordinary
 * fill-and-flatten path applies and the delivered artifact is the flattened
 * rendering of the static pages.
 *
 * EVERY CHECK BOX ON THIS FORM SHIPS ONLY A "/1" APPEARANCE AND NO "/Off". That
 * is the Vermont defect's precondition: pdf-lib regenerates an appearance for
 * any widget whose current /AS has no /AP /N entry, with its default provider,
 * which paints a stroked square the size of the rectangle. Twenty-two unticked
 * boxes would each acquire a border this court's form does not print. Both
 * suppression flags are therefore passed, and the byte proof reads every
 * rectangle of the output to confirm it.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { decideBinding } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName } = require("pdf-lib");

const FAMILY_ID = "ma-expunge-k-set";
const OUT = "data/rcap-all50/overlays/census-v1/ma/ma-expunge-k-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ma-expunge-k-set.mjs";
const MASTER_QUEUE = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const ROUTE_CENSUS = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";
const SWEEP = "data/rcap-grade-a/source-wave-integration/SOURCE_IDENTITY_RESOLUTION_SWEEP.json";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";

/*
 * The form prints no form number anywhere on either page — only the edition
 * footer "(Rev. 12.20.18)". The document id below is this packet's own handle
 * for it and is built from the caption the form does print.
 */
const DOCUMENT_ID = "MA-PETITION-FOR-EXPUNGEMENT-100K";
const ROUTE_KEY =
  "obligation:track-pathway:MA:ma-expunge-k:non-time-based-expungement-for-false-identity-error-fraud-or-decriminalized-conduct-100k";
const STATUTORY_AUTHORITY = "G.L. c. 276, § 100K";

/*
 * The digest the MASTER_QUEUE row pins, asserted here as well as read from
 * there, and asserted a third time against the source-identity sweep's own
 * per-source measurement. Three independent statements of the same identity.
 */
const PINNED_SHA256 = "19842819786d812c82c0b310aed8a5065e516a95122a59e0662a7ca67159a5ce";

const CUSTODY_ROOTS = [
  process.env.MASTER_LIBRARY_SOURCE_DIR ?? null,
  "private/source-imports/Nationwide_Recovery_Pool_2026-09-02",
  "private/source-imports/rcap-d-source-packs-2026-08-12",
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  "private/human-source-returns"
].filter(Boolean);

const SUPPLY = (what) => ({ policy: "supply", what });
const COMPOSED = (factIds) => ({ policy: "composed", factIds });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
const CASE_GROUND = (what, why) => ({ policy: "case_ground", what, whyTheRouteCannotDetermineIt: why });

const SIGNATURE = "signature_or_date_participant_completion";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const S = {
  CAPTION: "The caption block — docket, your details and the court",
  INTERPRETER: "The interpreter request",
  CHARGES: "The charges you are asking the court to expunge",
  GROUNDS: "Why the records were created — the eight statutory grounds",
  NARRATIVE: "Your explanation",
  ELECTIONS: "Hearing, extra space and supporting documents",
  SERVICE: "Your statement that the district attorney has a copy",
  CONTINUATION: "The continuation sheet on page 2"
};

/*
 * WHY THE ROUTE CANNOT PICK A GROUND. Quoted into every one of the eight
 * ground rows, and asserted against the census record at build time.
 */
const WHY_THE_ROUTE_CANNOT_DETERMINE_A_GROUND =
  "G.L. c. 276, § 100K lists eight alternative grounds and this family's SINGLE route "
  + `(${ROUTE_KEY}) spans all eight — its own name carries "false-identity-error-fraud-or-decriminalized-conduct". `
  + "The route-obligation census records the waiting-period basis for this route as a record created on one of the "
  + "eight statutory grounds and names none of them. Which ground created a particular participant's record is a fact "
  + "of that record, held on a CORI and a court file this platform has never seen, and the judge must find it on clear "
  + "and convincing evidence. Ticking one from nothing would be a legal characterisation with no record behind it, on "
  + "a petition sworn under the pains and penalties of perjury.";

/*
 * Every one of the 26 widgets, keyed by its own AcroForm name.
 *
 * `caption` is text the form PRINTS, re-read from the pinned binary at
 * `captionAt` before anything renders; the build refuses on drift. This form's
 * text stream interleaves adjacent runs — "YOUR NAME AND ADDRESSCOURT
 * DEPARTMENT" is one extracted line and so is "Boston Municipal CourtJuvenile
 * Court" — so each caption here is a substring that survives the interleaving at
 * its own recorded line, and nothing more is claimed for it than that.
 */
const FORM_FIELDS = {
  "form1[0].#subform[0].TextField1[0]": {
    section: S.CAPTION, caption: "DOCKET NO.", captionAt: { page: 1, y: 764 },
    label: "Docket number of the case you are asking the court to expunge",
    ...SUPPLY(
      "the docket number of the case, copied from your own court papers or from your CORI. The platform does not hold "
      + "a docket number and will not write one: a docket number written from anything but the court's own record "
      + "points the petition at the wrong file")
  },
  "form1[0].#subform[0].TextField1[1]": {
    section: S.CAPTION, caption: "YOUR NAME AND ADDRESS", captionAt: { page: 1, y: 719 },
    label: "Your name and address",
    ...COMPOSED(["participant.full_legal_name", "participant.street_address", "participant.city_state_zip"])
  },
  "form1[0].#subform[0].CheckBox1[0]": {
    section: S.CAPTION, selection: true, courtDepartment: "Boston Municipal Court",
    caption: "Boston Municipal Court", captionAt: { page: 1, y: 705 },
    label: "Court department — Boston Municipal Court (selection)",
    ...CASE_GROUND(
      "tick this only if the case was heard in the Boston Municipal Court",
      "the court department is where the CASE WAS HEARD, not a branch of the statute. The route-obligation census "
      + "records this route's filing destination as the clerk's office of the court where the case was heard, per the "
      + "form's own department checkboxes; one route reaches all four departments and the case decides which.")
  },
  "form1[0].#subform[0].CheckBox1[1]": {
    section: S.CAPTION, selection: true, courtDepartment: "Juvenile Court",
    caption: "Juvenile Court", captionAt: { page: 1, y: 705 },
    label: "Court department — Juvenile Court (selection)",
    ...CASE_GROUND(
      "tick this only if the case was heard in the Juvenile Court",
      "the court department is where the CASE WAS HEARD, not a branch of the statute. The route-obligation census "
      + "records this route's filing destination as the clerk's office of the court where the case was heard, per the "
      + "form's own department checkboxes; one route reaches all four departments and the case decides which.")
  },
  "form1[0].#subform[0].CheckBox2[0]": {
    section: S.CAPTION, selection: true, courtDepartment: "District Court",
    caption: "District Court", captionAt: { page: 1, y: 691 },
    label: "Court department — District Court (selection)",
    ...CASE_GROUND(
      "tick this only if the case was heard in the District Court",
      "the court department is where the CASE WAS HEARD, not a branch of the statute. The route-obligation census "
      + "records this route's filing destination as the clerk's office of the court where the case was heard, per the "
      + "form's own department checkboxes; one route reaches all four departments and the case decides which.")
  },
  "form1[0].#subform[0].CheckBox1[2]": {
    section: S.CAPTION, selection: true, courtDepartment: "Superior Court",
    caption: "Superior Court", captionAt: { page: 1, y: 691 },
    label: "Court department — Superior Court (selection)",
    ...CASE_GROUND(
      "tick this only if the case was heard in the Superior Court",
      "the court department is where the CASE WAS HEARD, not a branch of the statute. The route-obligation census "
      + "records this route's filing destination as the clerk's office of the court where the case was heard, per the "
      + "form's own department checkboxes; one route reaches all four departments and the case decides which.")
  },
  "form1[0].#subform[0].DropDownList1[0]": {
    section: S.CAPTION, caption: "COURT DIVISION", captionAt: { page: 1, y: 674 },
    label: "Court division in which the case was heard",
    ...SUPPLY(
      "the division of that court department where the case was heard — the division named on your own court papers. "
      + "The platform holds no division for you: the shared field registry's court descriptor binds a court NAME, a "
      + "type of court or a judicial district, and a Massachusetts Trial Court division is none of those")
  },
  "form1[0].#subform[0].CheckBox9[0]": {
    section: S.INTERPRETER, selection: true,
    caption: "I request the assistance of an interpreter", captionAt: { page: 1, y: 624 },
    label: "Request for an interpreter (selection)",
    ...ELECTION(
      "whether you want an interpreter is yours to decide and nobody else's. The form prints beside it that there is "
      + "no charge to you for interpreter or translation services")
  },
  "form1[0].#subform[0].TextField1[3]": {
    section: S.INTERPRETER, caption: "for the following language", captionAt: { page: 1, y: 624 },
    label: "The language you are requesting an interpreter for",
    ...ELECTION(
      "the language you would want an interpreter in, if you ticked the box beside it. The platform does not hold a "
      + "language preference for you and will not guess one")
  },
  "form1[0].#subform[0].TextField1[2]": {
    section: S.CHARGES, caption: "records of the following charges be expunged", captionAt: { page: 1, y: 592 },
    label: "The charges you are asking the court to expunge",
    ...SUPPLY(
      "every charge connected to this case that you want expunged, listed from your own court papers or CORI. The "
      + "form's own instruction sheet says to include ALL of the charges connected to the case, and to file a "
      + "separate petition for a different case. The platform has not seen your record and will not list a charge it "
      + "cannot read")
  },
  "form1[0].#subform[0].CheckBox3[0]": {
    section: S.GROUNDS, selection: true, groundNumber: 1,
    caption: "False use of my identification", captionAt: { page: 1, y: 466 },
    label: "Ground 1 — the records were created as a result of false use of my identification (selection)",
    ...CASE_GROUND(
      "tick this ground only if the records were created because someone made false use of your identification",
      WHY_THE_ROUTE_CANNOT_DETERMINE_A_GROUND)
  },
  "form1[0].#subform[0].CheckBox3[1]": {
    section: S.GROUNDS, selection: true, groundNumber: 2,
    caption: "Unauthorized use of my identity", captionAt: { page: 1, y: 448 },
    label: "Ground 2 — the records were created as a result of unauthorized use of my identity (selection)",
    ...CASE_GROUND(
      "tick this ground only if the records were created because someone made unauthorized use of your identity",
      WHY_THE_ROUTE_CANNOT_DETERMINE_A_GROUND)
  },
  "form1[0].#subform[0].CheckBox3[2]": {
    section: S.GROUNDS, selection: true, groundNumber: 3,
    caption: "Theft of my identity", captionAt: { page: 1, y: 430 },
    label: "Ground 3 — the records were created as a result of theft of my identity (selection)",
    ...CASE_GROUND(
      "tick this ground only if the records were created because your identity was stolen",
      WHY_THE_ROUTE_CANNOT_DETERMINE_A_GROUND)
  },
  "form1[0].#subform[0].CheckBox3[3]": {
    section: S.GROUNDS, selection: true, groundNumber: 4,
    caption: "no longer a crime", captionAt: { page: 1, y: 412 },
    label: "Ground 4 — the offense or offenses described above is or are no longer a crime (selection)",
    ...CASE_GROUND(
      "tick this ground only if the offense or offenses you listed above are no longer a crime",
      WHY_THE_ROUTE_CANNOT_DETERMINE_A_GROUND)
  },
  "form1[0].#subform[0].CheckBox3[4]": {
    section: S.GROUNDS, selection: true, groundNumber: 5,
    caption: "Errors by law enforcement", captionAt: { page: 1, y: 394 },
    label: "Ground 5 — the records were created as a result of errors by law enforcement (selection)",
    ...CASE_GROUND(
      "tick this ground only if the records were created by an error made by law enforcement",
      WHY_THE_ROUTE_CANNOT_DETERMINE_A_GROUND)
  },
  "form1[0].#subform[0].CheckBox3[5]": {
    section: S.GROUNDS, selection: true, groundNumber: 6,
    caption: "Errors by civilian or expert witness", captionAt: { page: 1, y: 376 },
    label: "Ground 6 — the records were created as a result of errors by civilian or expert witnesses (selection)",
    ...CASE_GROUND(
      "tick this ground only if the records were created by an error made by a civilian or expert witness",
      WHY_THE_ROUTE_CANNOT_DETERMINE_A_GROUND)
  },
  "form1[0].#subform[0].CheckBox3[6]": {
    section: S.GROUNDS, selection: true, groundNumber: 7,
    caption: "Errors by Court employees", captionAt: { page: 1, y: 358 },
    label: "Ground 7 — the records were created as a result of errors by court employees (selection)",
    ...CASE_GROUND(
      "tick this ground only if the records were created by an error made by a court employee",
      WHY_THE_ROUTE_CANNOT_DETERMINE_A_GROUND)
  },
  "form1[0].#subform[0].CheckBox3[7]": {
    section: S.GROUNDS, selection: true, groundNumber: 8,
    caption: "Fraud perpetrated upon the Court", captionAt: { page: 1, y: 340 },
    label: "Ground 8 — the records were created as a result of fraud perpetrated upon the court (selection)",
    ...CASE_GROUND(
      "tick this ground only if the records were created by a fraud perpetrated upon the court",
      WHY_THE_ROUTE_CANNOT_DETERMINE_A_GROUND)
  },
  "form1[0].#subform[0].TextField1[4]": {
    section: S.NARRATIVE, caption: "Specifically (provide as much detail as possible", captionAt: { page: 1, y: 322 },
    label: "Your explanation of the reasons for your request, in as much detail as possible",
    ...SUPPLY(
      "your own explanation of why the records were created on the ground you ticked, in as much detail as you can "
      + "give. These are the words the judge reads, and they must be yours: the platform holds no narrative for you "
      + "and would not print one if it did. The route-obligation census records this as a later-completion field in "
      + "terms")
  },
  "form1[0].#subform[0].CheckBox6[0]": {
    section: S.ELECTIONS, selection: true,
    caption: "I request that the Court hold a hearing on my petition", captionAt: { page: 1, y: 213 },
    label: "Request that the court hold a hearing on the petition (selection)",
    ...ELECTION(
      "whether to ask for a hearing is yours. The court's own instruction sheet on page 2 describes what a hearing is "
      + "for: to tell the judge why your petition fits one of the grounds and why granting it would be in the "
      + "interests of justice")
  },
  "form1[0].#subform[0].CheckBox4[0]": {
    section: S.ELECTIONS, selection: true,
    caption: "If you need more space to explain, check this box", captionAt: { page: 1, y: 196 },
    label: "Continuing your explanation on the back of the sheet (selection)",
    ...ELECTION(
      "tick this only if you actually continue your explanation on the back of the sheet. Only you know whether you "
      + "ran out of room")
  },
  "form1[0].#subform[0].CheckBox5[0]": {
    section: S.ELECTIONS, selection: true,
    caption: "If you have documents that support your petition, check this box", captionAt: { page: 1, y: 169 },
    label: "Documents supporting the petition are attached (selection)",
    ...ELECTION(
      "tick this only if you are actually attaching supporting documents. The platform holds none of your documents "
      + "and cannot say whether you attached any")
  },
  "form1[0].#subform[0].CheckBox7[0]": {
    section: S.SERVICE, selection: true, serviceMethod: "in hand",
    caption: "by delivering a copy in hand", captionAt: { page: 1, y: 136 },
    label: "You gave the district attorney's office a copy by delivering it in hand (selection)",
    ...ELECTION(
      "tick this only after you have actually delivered a copy in hand. This sentence is a statement that you already "
      + "did it, and when this packet was prepared it had not happened")
  },
  "form1[0].#subform[0].CheckBox8[0]": {
    section: S.SERVICE, selection: true, serviceMethod: "first class mail",
    caption: "by mailing a copy via first class mail", captionAt: { page: 1, y: 136 },
    label: "You gave the district attorney's office a copy by mailing it first class (selection)",
    ...ELECTION(
      "tick this only after you have actually posted a copy by first class mail. This sentence is a statement that "
      + "you already did it, and when this packet was prepared it had not happened")
  },
  "form1[0].#subform[0].TextField1[5]": {
    section: S.SERVICE, caption: "date", captionAt: { page: 1, y: 110 },
    label: "The date you gave the district attorney's office a copy",
    ...PROTECT(SIGNATURE,
      "this date certifies an act of delivery that has not happened when the packet is prepared. The form's own "
      + "instruction sheet puts it on or before the day the petition is filed, which is after this build. You write "
      + "the date on the day you actually deliver or post the copy")
  },
  "form1[0].#subform[1].TextField1[6]": {
    section: S.CONTINUATION, caption: "Additional Information", captionAt: { page: 2, y: 196 },
    label: "Additional information continuing your explanation, on page 2",
    ...ELECTION(
      "the rest of your explanation, if it did not fit on page 1. These are your own sworn words and the platform "
      + "writes none of them")
  }
};

/*
 * Form-level sentences this family reasons from or quotes. Each is re-read from
 * the pinned binary before anything renders, and the build stops rather than
 * reason from a sentence the paper no longer carries.
 */
const FORM_ANCHORS = [
  {
    id: "petition-caption", page: 1, y: 755, needle: "PETITION FOR EXPUNGEMENT",
    whyItMatters: "the remedy this petition asks for — expungement, not sealing — printed in the form's own caption"
  },
  {
    id: "statutory-authority", page: 1, y: 740, needle: "G.L. c. 276, § 100K",
    whyItMatters: "the section this petition is brought under, printed under the caption; it is what separates this family from the § 100C sealing family"
  },
  {
    id: "grounds-stem", page: 1, y: 484, needle: "I make this request because the records were created as a result of",
    quoteSpan: { fromY: 484, toY: 484, sentences: 1, terminator: ":" },
    whyItMatters: "the printed stem of the eight-ground list, which is the basis for treating each ground as a case fact rather than a route election"
  },
  {
    id: "perjury-clause", page: 1, y: 94, needle: "I swear under the pains and penalty of perjury",
    whyItMatters: "the petition is sworn, which is why nothing on it is written from anything but a held fact"
  },
  {
    id: "where-to-file", page: 2, y: 429, needle: "You should file this petition in the clerk's office in the court where the case was heard",
    quoteSpan: { fromY: 429, toY: 429, sentences: 1 },
    whyItMatters: "the filing destination printed on the court's own instruction sheet, which the instructions quote rather than retype"
  },
  {
    id: "multiple-charges", page: 2, y: 477, needle: "you should include all of the charges connected to the case",
    quoteSpan: { fromY: 477, toY: 477, sentences: 1 },
    whyItMatters: "the court's own instruction on what to list in the charges box, quoted to the participant"
  },
  {
    id: "separate-petitions", page: 2, y: 465, needle: "you should file separate petitions for each case",
    quoteSpan: { fromY: 465, toY: 465, sentences: 1 },
    whyItMatters: "the court's own instruction that a second case needs a second petition, quoted to the participant"
  },
  {
    id: "da-copy-timing", page: 2, y: 381, needle: "prosecuted the case on or before the day that this petition is filed in the court",
    /* The sentence runs across three printed lines and STARTS on the line above
     * the needle. Quoting the needle's own line alone delivered a fragment
     * beginning "prosecuted the case ..." as though it were the court speaking. */
    quoteSpan: { fromY: 393, toY: 369, sentences: 1 },
    whyItMatters: "the court's own deadline for giving the district attorney a copy, and the basis for protecting the service date"
  },
  {
    id: "records-destroyed", page: 2, y: 333, needle: "requires the clerk of the court where the record was created to destroy",
    quoteSpan: { fromY: 333, toY: 273, sentences: 1 },
    whyItMatters: "what an order under this section actually does, which the participant is told before they file it"
  },
  {
    id: "copies-warning", page: 2, y: 237, needle: "you must make copies before the court orders expungement",
    quoteSpan: { fromY: 249, toY: 225, sentences: 2 },
    whyItMatters: "the court's own warning that the record cannot be recovered afterwards"
  },
  {
    id: "form-footer", page: 1, y: 10, needle: "Rev. 12.20.18",
    whyItMatters: "the form's own edition footer, which identifies the document this packet is built on"
  }
];

/* ---- fixtures --------------------------------------------------------------- *
 * The two review participants. Every fact here is one the platform's shared
 * descriptor registry actually carries; nothing is invented to make a box fill.
 * The boundary participant exists to stress the one box this build writes — a
 * 245.6 x 75.3pt multiline block — with a long name and a long address, and a
 * value that will not fit is REFUSED and named to the participant, never
 * shortened.
 */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.first_name": "Jordan",
    "participant.middle_name": "Avery",
    "participant.last_name": "Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Maple Street, Apartment 3",
    "participant.city": "Dorchester",
    "participant.state": "MA",
    "participant.zip": "02124",
    "participant.city_state_zip": "Dorchester, MA 02124",
    "participant.phone": "617-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.first_name": "Maria-Alejandra",
    "participant.middle_name": "Consuelo",
    "participant.last_name": "O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Unincorporated Township of Long Hollow Crossing",
    "participant.state": "Massachusetts",
    "participant.zip": "01103-2214",
    "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, Massachusetts 01103-2214",
    "participant.phone": "(413) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- the controlling records, read at build time ---------------------------- */

/** The MASTER_QUEUE row for this family, and the source identity it pins. */
function queueBinding() {
  const queue = JSON.parse(fs.readFileSync(path.join(ROOT, MASTER_QUEUE), "utf8"));
  const row = (queue.families ?? []).find((f) => f.familyId === FAMILY_ID);
  assert.ok(row, `${MASTER_QUEUE} carries no row for ${FAMILY_ID}`);
  const hashes = row.sourceHashes ?? [];
  assert.equal(hashes.length, 1,
    `${FAMILY_ID} expects exactly one pinned source and the queue names ${hashes.length}`);
  const pinned = hashes[0];
  assert.equal(String(pinned.sha256 ?? "").toLowerCase(), PINNED_SHA256,
    `the MASTER_QUEUE pin moved: the queue now says ${pinned.sha256}, this build asserts ${PINNED_SHA256}`);
  assert.deepEqual(row.routeKeys, [ROUTE_KEY],
    `the queue's route keys for ${FAMILY_ID} moved: ${JSON.stringify(row.routeKeys)}`);
  return {
    sourceId: pinned.sourceId, declaredPath: pinned.path, sha256: PINNED_SHA256,
    tier: pinned.tier ?? null, routeKeys: row.routeKeys ?? [],
    officialFormFamily: row.officialFormFamily ?? null,
    custodyClassInQueue: row.sourceReadiness?.custodyClass ?? null
  };
}

/**
 * The source-identity sweep's own per-source measurement for this family.
 *
 * The dispatch that staffed this family rests on that sweep rather than on the
 * custody scalar, so the sweep is read here and its digest asserted against the
 * queue's. If the two disagree the build stops: a family staffed on a
 * measurement must be built on the same measurement.
 */
function sweepMeasurement() {
  const sweep = JSON.parse(fs.readFileSync(path.join(ROOT, SWEEP), "utf8"));
  const family = (sweep.families ?? []).find((f) => f.familyId === FAMILY_ID);
  assert.ok(family, `${SWEEP} carries no family ${FAMILY_ID}`);
  assert.equal(family.answer, "RESOLVED_BY_CONTENT",
    `${SWEEP} no longer answers RESOLVED_BY_CONTENT for ${FAMILY_ID} (${family.answer})`);
  assert.equal(family.sources?.length, 1,
    `${SWEEP} measures ${family.sources?.length} sources for ${FAMILY_ID}; this build is written for one`);
  const measured = family.sources[0];
  assert.equal(String(measured.actualSha256 ?? "").toLowerCase(), PINNED_SHA256,
    `the sweep's measured digest for ${FAMILY_ID} is ${measured.actualSha256}, not the pinned ${PINNED_SHA256}`);
  return {
    sourceId: measured.sourceId,
    priorCustodyClass: family.priorCustodyClass ?? null,
    actualPath: measured.actualPath ?? null,
    copiesInCustody: measured.copiesInCustody ?? null,
    custodies: measured.custodies ?? [],
    pageCount: measured.identityEvidence?.pageCount ?? null,
    acroFieldCount: measured.identityEvidence?.acroFieldCount ?? null,
    byteLength: measured.identityEvidence?.byteLength ?? null,
    xfaPresentInTheSweep: measured.identityEvidence?.xfaPresent ?? null,
    firstPageText: measured.identityEvidence?.firstPageText ?? null
  };
}

/**
 * What the route-obligation census records for this family's route.
 *
 * Every sentence this packet prints about the route comes from here, and each is
 * asserted non-empty before it is used: a quotation presented as the record
 * speaking, with nothing inside it, is worse than no quotation at all.
 */
function routeRecord() {
  const census = JSON.parse(fs.readFileSync(path.join(ROOT, ROUTE_CENSUS), "utf8"));
  const family = (census.packetFamilies ?? []).find((f) => f.worklistGroupId === FAMILY_ID);
  assert.ok(family, `${ROUTE_CENSUS} carries no packet family ${FAMILY_ID}`);
  assert.equal(family.routes?.length, 1,
    `${FAMILY_ID} is a single-route family and the census records ${family.routes?.length} routes`);
  const route = family.routes[0];
  assert.equal(route.routeKey, ROUTE_KEY,
    `the census route key moved: it now reads ${route.routeKey}, this build is written for ${ROUTE_KEY}`);

  const recorded = (key) => {
    const cell = route.deliverable?.[key];
    assert.ok(cell, `the census records no ${key} cell for ${ROUTE_KEY}`);
    assert.equal(cell.status, "recorded",
      `the census no longer records ${key} for ${ROUTE_KEY} (status ${cell.status}); this packet prints it, so the build stops`);
    const entries = (cell.entries ?? []).map((e) => String(e).trim()).filter((e) => e.length > 0);
    assert.ok(entries.length > 0,
      `the census records ${key} for ${ROUTE_KEY} with no non-empty entry; this packet will not print an empty quotation`);
    return entries;
  };

  const filingDestination = recorded("filingDestination");
  const clerkBasis = filingDestination.find((e) => /clerk'?s office/i.test(e));
  assert.ok(clerkBasis,
    `the route-obligation census no longer names a clerk's office as the filing destination for ${ROUTE_KEY}; this `
    + "packet tells the participant where to file, so the build refuses rather than name a destination nothing declares.");
  const heardBasis = filingDestination.find((e) => /where the case was heard/i.test(e));
  assert.ok(heardBasis,
    `the route-obligation census no longer records that this route files where the case was heard. The four court `
    + "department boxes are declared case-determined on exactly that record, so the build refuses.");

  const waitingPeriod = recorded("waitingPeriodCalculation");
  /*
   * The load-bearing assertion of this family. The census is what says the
   * route rests on ONE OF the eight grounds without naming one; if it starts
   * naming one, the eight case-determined declarations below have to be
   * revisited rather than carried forward.
   */
  const eightGroundsBasis = waitingPeriod.find((e) => /eight statutory grounds/i.test(e));
  assert.ok(eightGroundsBasis,
    `the route-obligation census no longer records this route as resting on one of the eight statutory grounds. Every `
    + "one of the eight ground boxes is declared determined-by-the-case on that record, so the build refuses rather "
    + "than carry a declaration whose basis has moved.");

  const laterCompletion = recorded("laterCompletionFields");
  const narrativeBasis = laterCompletion.find((e) => /Specifically/i.test(e));
  assert.ok(narrativeBasis,
    "the route-obligation census no longer records the 'Specifically' narrative as a later-completion field; the "
    + "packet cites that record when it leaves the narrative blank.");

  return {
    routeKey: route.routeKey,
    trackId: route.trackId,
    filingDestination, clerkBasis, heardBasis,
    waitingPeriod, eightGroundsBasis,
    laterCompletion, narrativeBasis,
    signatureRequirements: recorded("signatureRequirements"),
    primaryFiling: recorded("primaryOfficialFormOrComposedPleading"),
    uncontestedHearing: recorded("uncontestedHearingTreatment"),
    contestedHandoff: recorded("contestedHearingOrOppositionHandoff"),
    notRecorded: Object.entries(route.deliverable ?? {})
      .filter(([, v]) => v?.status !== "recorded").map(([k]) => k).sort()
  };
}

/* ---- source binding --------------------------------------------------------- */
function resolveSource(binding) {
  const searched = [];
  for (const root of CUSTODY_ROOTS) {
    const abs = path.resolve(ROOT, root, binding.declaredPath);
    const exists = fs.existsSync(abs);
    searched.push({ root, absolutePath: abs, exists });
    if (!exists) continue;
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    searched[searched.length - 1].sha256 = sha256;
    if (sha256 !== binding.sha256) continue;
    return {
      bound: true, custodyRoot: root, pathInArchive: binding.declaredPath,
      sha256, byteLength: bytes.length, bytes, searched
    };
  }
  return { bound: false, searched };
}

/* ---- census ----------------------------------------------------------------- */
const flat = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function censusOf(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));

  const acroBefore = doc.catalog.lookup(PDFName.of("AcroForm"));
  const xfaInInputDict = Boolean(acroBefore && acroBefore.get(PDFName.of("XFA")) !== undefined);

  const lineCarries = (page, y, needle, tolerance = 2) => {
    const lines = pageText.find((p) => p.page === page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - y) <= tolerance);
    return { found: near.some((l) => flat(l.text).includes(flat(needle))), linesThere: near.map((l) => l.text) };
  };

  const rows = [];
  const unmapped = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const entry = FORM_FIELDS[name];
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      let onState = null;
      let appearanceStates = [];
      try {
        const ap = w.dict.lookup(PDFName.of("AP"));
        const n = ap ? ap.lookup(PDFName.of("N")) : null;
        if (n && typeof n.keys === "function") appearanceStates = n.keys().map((k) => k.asString());
        if (typeof w.getOnValue === "function") onState = String(w.getOnValue() ?? "");
      } catch { /* a widget without an /AP is recorded as having none */ }
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary",
        appearanceStates, onState
      };
    });
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }

    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }

    rows.push({
      key: name, name, page: widgets[0]?.page ?? null, widgets, sourceValue,
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
      isSelectionControl: entry.selection === true || field.constructor.name === "PDFCheckBox",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      caption: entry.caption, captionAt: entry.captionAt,
      groundNumber: entry.groundNumber ?? null,
      courtDepartment: entry.courtDepartment ?? null,
      serviceMethod: entry.serviceMethod ?? null,
      policy: entry.policy, factIds: entry.factIds ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null,
      why: entry.why ?? null,
      whyTheRouteCannotDetermineIt: entry.whyTheRouteCannotDetermineIt ?? null,
      /*
       * What the SHARED registry would have done with this widget's own name.
       * These are XFA-era names — "form1[0].#subform[0].TextField1[3]" — and
       * they carry no word a descriptor can match, so the registry binds
       * nothing from the name alone. Measured rather than assumed, because the
       * finalizer is also given this build's own effectiveLabel, and that DOES
       * match descriptors: the role gate below is what stops it.
       */
      sharedRegistryWouldBindFromName: (() => {
        const d = decideBinding({ name, pdfType: field.constructor.name === "PDFTextField" ? "text" : "other", effectiveLabel: null, regionHeading: null }, {});
        return d.writable ? d.factId : null;
      })(),
      sharedRegistryWouldBindFromThisBuildsLabel: (() => {
        const d = decideBinding({
          name, pdfType: field.constructor.name === "PDFTextField" ? "text" : "other",
          effectiveLabel: entry.label, regionHeading: entry.section
        }, {});
        return d.writable ? d.factId : null;
      })()
    });
  }

  const dictionaryKeys = new Set(Object.keys(FORM_FIELDS));
  for (const r of rows) dictionaryKeys.delete(r.key);

  const captionDrift = [];
  for (const r of rows) {
    if (!r.captionAt) continue;
    const hit = lineCarries(r.captionAt.page, r.captionAt.y, r.caption);
    if (!hit.found) {
      captionDrift.push({ key: r.key, page: r.captionAt.page, y: r.captionAt.y, caption: r.caption, linesThere: hit.linesThere.slice(0, 2) });
    }
  }

  /*
   * A QUOTATION IS A WHOLE SENTENCE OR IT IS NOT A QUOTATION.
   *
   * The first pass of this builder quoted the single extracted LINE the anchor
   * needle sat on, and this form's instruction sheet wraps its sentences over
   * three and four lines. The participant was handed
   * _"prosecuted the case on or before the day that this petition is filed in
   * the court. You can do this by bringing a copy to the District"_ as the
   * court's own words on the deadline: a fragment that begins mid-clause and
   * stops mid-clause, presented as the record speaking.
   *
   * So a quoted anchor names a SPAN of printed lines. The lines in that span are
   * read from the binary in reading order, joined, and cut at the end of the
   * sentence — never inside one. Not a word is changed, added or dropped, and
   * the assembled quotation is asserted to end on a sentence terminator and to
   * still contain the needle it was anchored on.
   */
  const sentencesOf = (text, count) => {
    const parts = String(text).split(/(?<=\.)\s+/);
    return parts.slice(0, count).join(" ").trim();
  };
  const anchorDrift = [];
  const anchorText = {};
  for (const a of FORM_ANCHORS) {
    const hit = lineCarries(a.page, a.y, a.needle, 3);
    if (!hit.found) { anchorDrift.push({ ...a, linesThere: hit.linesThere.slice(0, 2) }); continue; }
    if (!a.quoteSpan) { anchorText[a.id] = hit.linesThere.join(" ").replace(/\s+/g, " ").trim(); continue; }
    const { fromY, toY, sentences, terminator = "." } = a.quoteSpan;
    const lines = (pageText.find((p) => p.page === a.page)?.lines ?? [])
      .filter((l) => l.y <= fromY + 2 && l.y >= toY - 2)
      .sort((x, y) => y.y - x.y)
      .map((l) => l.text);
    const joined = lines.join(" ").replace(/\s+/g, " ").trim();
    const quoted = terminator === ":" ? joined : sentencesOf(joined, sentences);
    if (!quoted.endsWith(terminator) || !flat(quoted).includes(flat(a.needle))) {
      anchorDrift.push({
        ...a, assembled: quoted.slice(0, 200), linesInSpan: lines.length,
        why: "the printed sentence this packet quotes could not be assembled whole from the span recorded for it"
      });
      continue;
    }
    anchorText[a.id] = quoted;
  }

  return {
    rows, unmapped, stale: [...dictionaryKeys], captionDrift, anchorDrift, anchorText,
    xfaInInputDict,
    pageText, pageCount: pages.length
  };
}

/* ---- render ----------------------------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const composedRows = census.rows.filter((r) => r.policy === "composed");

  /*
   * EVERY widget that is not the composed contact block is refused by ROLE.
   *
   * That gate runs before the descriptor channel and is not overridable. It is
   * the only reason this build is safe on a form whose widgets this build
   * labels "Your explanation...", "The charges you are asking the court to
   * expunge" and "Court division in which the case was heard": the finalizer is
   * handed those labels, and the shared registry matches several of them. The
   * per-field measurement of exactly what it would have bound is recorded in
   * the field census, not assumed.
   */
  const unwritableFields = census.rows
    .filter((r) => r.policy !== "composed")
    .map((r) => ({ field: r.name }));

  const composedFieldValues = Object.fromEntries(composedRows.map((r) => [r.name, { factIds: r.factIds }]));

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts,
    explicitMappings: {},
    unwritableFields,
    composedFieldValues,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    /*
     * Load-bearing here, unlike on the OCP petition where the same two flags
     * are no-ops: EVERY check box on this form ships a "/1" appearance and NO
     * "/Off". Without suppression pdf-lib synthesizes an appearance for all
     * twenty-two unticked boxes and flatten stamps a stroked square at each,
     * ink this court's form does not print. The byte proof below reads every
     * rectangle to confirm the suppression actually held.
     */
    suppressSynthesizedAppearances: true,
    suppressSynthesizedWidgetBorders: true,
    title: "Petition for Expungement"
  });
  return { bytes, report };
}

/* ---- byte proof -------------------------------------------------------------- *
 * Read back from the FINALIZED BYTES at every measured widget rectangle, and
 * then over the whole artifact.
 *
 * Two readings are emitted per artifact and both are measured rather than
 * asserted: the glyphs this build ADDED inside its own write boxes, and the
 * non-whitespace glyphs drawn ANYWHERE ELSE by a flattened widget appearance. On
 * this form the second is the one that matters: a synthesized square draws no
 * glyph, so the selection controls are read on a second channel too — the
 * painting-operator count of each flattened appearance, against the source's own
 * appearance for the same widget.
 */
/*
 * OPERATORS THAT ACTUALLY MARK THE PAGE, AND THE ONES THAT ONLY DESCRIBE A PATH.
 *
 * This distinction is load-bearing on this form and it was measured rather than
 * assumed. `m l c v y h re` CONSTRUCT a path, `W` sets a clip and `n` ends the
 * path WITHOUT painting it (ISO 32000-1 8.5.3.3, Table 60). None of them puts
 * ink anywhere. Only `S s f F f* B B* b b*`, the shading and XObject operators,
 * and the five show-text operators mark the page.
 *
 * Every TEXT field on this binary ships with NO /AP at all, so pdf-lib generates
 * one, and every generated appearance opens with a construction-and-clip
 * preamble — about thirteen of those operators per field — and closes with an
 * EMPTY show-text operator, `<> Tj`. Neither puts ink anywhere. A reading that
 * counted the preamble as painting reported twenty-two clean boxes and seven
 * clean text fields as ink this court's form does not print; a reading that
 * counted `Tj` by operator rather than by operand reported the seven again. The
 * first two passes of this builder did exactly that, and the counter both
 * inflated was visualDefects — the one that would have stopped a correct packet.
 *
 * So INK is measured two ways and neither is an operator census. A stroke, fill,
 * shading or XObject operator marks the page whatever its operand. Show-text
 * marks the page only if it has an operand: the glyphs are read from the stream's
 * own string operands by `flattenedWidgets`, and an empty one reads as nothing,
 * which is what it draws.
 */
const INK_OPS = /(?:^|[\s])(?:S|s|f\*?|F|B\*?|b\*?|sh|Do)(?=[\s]|$)/g;
const SHOW_TEXT_OPS = /(?:^|[\s])(?:Tj|TJ|'|")(?=[\s]|$)/g;
const PATH_ONLY_OPS = /(?:^|[\s])(?:re|m|l|c|v|y|h|W\*?|n)(?=[\s]|$)/g;
const inflate = (buf) => { try { return zlib.inflateSync(buf); } catch { return buf; } };

/** Operators that put ink on the page regardless of their operand. */
function countInkOps(streamText) {
  return (String(streamText).match(INK_OPS) ?? []).length;
}

/** Show-text operators, counted for the record; an empty operand draws nothing. */
function countShowTextOps(streamText) {
  return (String(streamText).match(SHOW_TEXT_OPS) ?? []).length;
}

function countPathOnlyOps(streamText) {
  return (String(streamText).match(PATH_ONLY_OPS) ?? []).length;
}

/**
 * The source's own appearance streams for every check-box widget, by state.
 *
 * This form ships ONLY a "/1" (on) appearance for each box and no "/Off", so
 * the unticked baseline is "no stream at all" — which is exactly why the
 * suppression flags matter, and why the baseline is measured rather than
 * assumed to be an /Off square.
 */
async function checkBoxAppearanceBaseline(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const ctx = doc.context;
  const baseline = new Map();
  for (const field of doc.getForm().getFields()) {
    if (field.constructor.name !== "PDFCheckBox") continue;
    for (const w of field.acroField.getWidgets()) {
      const ap = ctx.lookup(w.dict.get(PDFName.of("AP")));
      if (!ap) { baseline.set(field.getName(), { states: [], offStreamPresent: false, offPaintOps: null }); continue; }
      const n = ctx.lookup(ap.get(PDFName.of("N")));
      if (!n || typeof n.get !== "function") continue;
      const states = typeof n.keys === "function" ? n.keys().map((k) => k.asString()) : [];
      const off = n.get(PDFName.of("Off"));
      let offInkOps = null;
      if (off) {
        const stream = ctx.lookup(off);
        offInkOps = countInkOps(inflate(Buffer.from(stream.contents)).toString("latin1"));
      }
      const on = states.find((s) => s !== "/Off");
      let onInkOps = null;
      if (on) {
        const stream = ctx.lookup(n.get(PDFName.of(on.replace(/^\//, ""))));
        if (stream?.contents) onInkOps = countInkOps(inflate(Buffer.from(stream.contents)).toString("latin1"));
      }
      baseline.set(field.getName(), { states, offStreamPresent: Boolean(off), offInkOps, onInkOps });
    }
  }
  return baseline;
}

/** Every flattened appearance in the artifact, with its own stream body. */
async function flattenedAppearanceBodies(file) {
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  const bodies = new Map();
  for (const page of doc.getPages()) {
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjects = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
    if (!xObjects) continue;
    const dict = ctx.lookup(xObjects);
    for (const key of dict.keys()) {
      const obj = ctx.lookup(dict.get(key));
      if (!obj?.contents) continue;
      bodies.set(key.asString().replace(/^\//, ""), inflate(Buffer.from(obj.contents)).toString("latin1"));
    }
  }
  return bodies;
}

const nonWhitespaceGlyphs = (s) => (String(s).match(/\S/g) ?? []).length;

async function byteProof(source, census, artifactFile, fixtureName, report) {
  const widgets = await flattenedWidgets(path.join(ROOT, artifactFile));
  const bodies = await flattenedAppearanceBodies(path.join(ROOT, artifactFile));
  const boxBaseline = await checkBoxAppearanceBaseline(source);

  const actualWrites = [];
  const selectionsRead = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  const synthesizedAppearancesFound = [];
  let glyphs = 0;

  const writtenByFinalizer = new Set(report.written.map((w) => w.field));
  /* Appearances accounted for by a measured WRITE box, so the residue count
   * below is over ink this build did not put in a box it measured. */
  const accountedFor = new Set();

  for (const r of census.rows) {
    for (const wdg of r.widgets) {
      const drawn = drawnAt(widgets, { page: wdg.page, rect: wdg.rect });
      const ink = drawn.map((d) => d.text).filter(Boolean).join("").trim();
      const inkOps = drawn.reduce((n, d) => n + countInkOps(bodies.get(d.appearance) ?? ""), 0);
      const showTextOps = drawn.reduce((n, d) => n + countShowTextOps(bodies.get(d.appearance) ?? ""), 0);
      const pathOnlyOps = drawn.reduce((n, d) => n + countPathOnlyOps(bodies.get(d.appearance) ?? ""), 0);

      if (r.isSelectionControl) {
        const baseline = boxBaseline.get(r.name) ?? null;
        selectionsRead.push({
          control: r.name, page: wdg.page, rect: wdg.rect,
          glyphChannel: ink, glyphChannelMarked: ink.length > 0,
          appearancesStampedInOutput: drawn.length,
          inkOperatorsInOutput: inkOps,
          showTextOperatorsInOutput: showTextOps,
          pathConstructionAndClipOperatorsInOutput: pathOnlyOps,
          sourceAppearanceStates: baseline?.states ?? [],
          sourceShipsAnOffAppearance: baseline?.offStreamPresent ?? null,
          inkOperatorsInSourceOnAppearance: baseline?.onInkOps ?? null,
          marked: ink.length > 0 || inkOps > 0,
          expectedMarked: false,
          basisForReadingItUnmarked:
            "the appearance stamped at this rectangle carries no stroke, fill, shading or XObject operator, and its "
            + "show-text operands are empty, so it draws nothing — however many path and clip operators its preamble "
            + "carries. The source's own ON appearance for the same box does stroke, so a real tick would read here"
        });
        if (ink.length > 0 || inkOps > 0) {
          synthesizedAppearancesFound.push({
            field: r.key, page: wdg.page, rect: wdg.rect, inkOps,
            sourceOnStateInkOps: baseline?.onInkOps ?? null,
            why:
              "this form ships no /Off appearance for its check boxes, so an appearance that MARKS the page at an "
              + "unticked box is ink the court's form does not print"
          });
          refusedFieldsWithInk.push({
            fieldId: r.key, page: wdg.page, drawnText: [ink], inkOps,
            why: "a selection control this packet does not make marks the page in the output"
          });
        }
        for (const d of drawn) accountedFor.add(`${d.page}::${d.appearance}`);
        continue;
      }

      if (drawn.length === 0) continue;
      if (r.sourceValue !== null && r.sourceValue !== undefined && !writtenByFinalizer.has(r.name)) {
        documentAuthoredAppearances.push({ field: r.key, page: wdg.page, rect: wdg.rect, drawnText: [ink], sourceValue: r.sourceValue });
        for (const d of drawn) accountedFor.add(`${d.page}::${d.appearance}`);
        continue;
      }
      if (!writtenByFinalizer.has(r.name)) {
        if (ink.length > 0 || inkOps > 0) {
          refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: [ink], inkOps, showTextOps, pathOnlyOps });
        }
        for (const d of drawn) accountedFor.add(`${d.page}::${d.appearance}`);
        continue;
      }
      glyphs += nonWhitespaceGlyphs(ink);
      const composedWrite = (report.composedWrites ?? []).find((c) => c.field === r.name) ?? null;
      actualWrites.push({
        field: r.key, factId: null,
        composedFrom: composedWrite?.composedFrom ?? null,
        composedValues: composedWrite?.composedValues ?? null,
        drawnLinesReportedByFinalizer: composedWrite?.drawnLines ?? null,
        page: wdg.page, rect: wdg.rect, drawnText: [ink]
      });
      for (const d of drawn) accountedFor.add(`${d.page}::${d.appearance}`);
    }
  }

  /*
   * The second output-byte reading: every non-whitespace glyph a flattened
   * widget appearance draws that did NOT land at one of this build's measured
   * write boxes. Measured over the artifact, not inferred from the write list.
   */
  const outsideWriteBoxes = [];
  let outsideGlyphs = 0;
  const writeRects = census.rows.filter((r) => writtenByFinalizer.has(r.name))
    .flatMap((r) => r.widgets.map((w) => ({ page: w.page, rect: w.rect })));
  for (const w of widgets) {
    const insideAWriteBox = writeRects.some((b) => b.page === w.page
      && Math.abs(w.x - b.rect.x) <= 2 && Math.abs(w.y - b.rect.y) <= 2);
    if (insideAWriteBox) continue;
    const count = nonWhitespaceGlyphs(w.text ?? "");
    if (count === 0) continue;
    outsideGlyphs += count;
    outsideWriteBoxes.push({ page: w.page, x: w.x, y: w.y, appearance: w.appearance, text: w.text, glyphs: count });
  }

  return {
    fixture: fixtureName,
    proofMethod:
      "every measured widget /Rect of the finalized bytes is read for the flattened appearance stamped there, its "
      + "show-text OPERANDS and its count of stroke, fill, shading and XObject operators — the ones that mark the "
      + "page whatever their operand — kept apart from the path-construction and clipping operators, which mark "
      + "nothing. Then every flattened appearance in the whole artifact is read again and any non-whitespace glyph "
      + "outside a measured write box is counted. Selection controls are read on the ink-operator channel as well as "
      + "the glyph channel because a synthesized border draws no glyph, and this form ships no /Off appearance for "
      + "any of its twenty-two boxes; the source's own ON appearance strokes, so a real tick reads on that channel. "
      + "Every text field on this binary ships no /AP at all, so each generated appearance opens with a "
      + "construction-and-clip preamble and closes with an EMPTY '<> Tj'; counting either as ink is what this "
      + "reading is written not to do.",
    actualWrites, selectionsRead, refusedFieldsWithInk, documentAuthoredAppearances,
    synthesizedAppearancesFound,
    glyphs, outsideGlyphs, outsideWriteBoxes,
    appearances: widgets.length,
    appearancesAccountedForByACensusWidget: accountedFor.size
  };
}

/* ---- the refusals the finalizer measured ------------------------------------- */
function geometryRefusalsOf(report) {
  const out = new Map();
  for (const u of report.unfittable ?? []) {
    out.set(u.field, {
      field: u.field, composedFrom: u.composedFrom ?? null, kind: "width",
      reason: u.reason ?? "value_does_not_fit_the_widget_at_a_readable_size",
      measurement: { outcome: u.outcome ?? null, fontSize: u.fontSize ?? null, minFontSize: u.minFontSize ?? null }
    });
  }
  for (const r of report.refused ?? []) {
    if (r.reason !== "value_exceeds_form_max_length") continue;
    out.set(r.field, {
      field: r.field, composedFrom: r.composedFrom ?? null, kind: "max_length",
      reason: r.reason,
      measurement: { declaredMaxLength: r.maxLength ?? null, valueLength: r.valueLength ?? null }
    });
  }
  return out;
}

/* ---- field map ---------------------------------------------------------------- */
function sideOf(census, report, fixtureName) {
  const written = new Set(report.written.map((w) => w.field));
  const geometry = geometryRefusalsOf(report);
  const writes = [];
  const refusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: `${DOCUMENT_ID}/${r.key}`,
      fieldName: `${DOCUMENT_ID}/${r.key}`,
      acroFieldName: r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt,
      captionBasis:
        "printed caption re-read from the pinned binary at captionReadAt as a flattened substring of the printed line "
        + "there; the build refuses on drift",
      sharedRegistryWouldBindFromName: r.sharedRegistryWouldBindFromName,
      sharedRegistryWouldBindFromThisBuildsLabel: r.sharedRegistryWouldBindFromThisBuildsLabel,
      document: DOCUMENT_ID
    };

    if (r.policy === "composed") {
      if (written.has(r.name)) {
        const c = (report.composedWrites ?? []).find((x) => x.field === r.name) ?? null;
        writes.push({
          ...base, factId: null, kind: `${r.type}_composed`,
          writeChannel: "finalizer_composed_fact_channel",
          composedFrom: r.factIds,
          composedValues: c?.composedValues ?? null,
          drawnLines: c?.drawnLines ?? null,
          fontSize: c?.fontSize ?? null, outcome: c?.outcome ?? null
        });
        continue;
      }
      const g = geometry.get(r.name);
      const held = r.factIds.map((f) => FIXTURES[fixtureName][f] ?? null);
      const measuredWhy = g && g.kind === "max_length"
        ? `the form limits this box to ${g.measurement.declaredMaxLength} characters and the block held for you is `
          + `${held.join(" / ").length} characters`
        : `the box the form prints is ${r.rect?.width ?? "?"} by ${r.rect?.height ?? "?"} points and the name and `
          + "address held for you will not fit inside it even at the smallest size that stays readable "
          + `(${g?.measurement?.minFontSize ?? "?"} point)`;
      refusals.push({
        ...base,
        reason: `the details this ${fixtureName} participant holds will not fit the box the form prints: ${measuredWhy}`,
        measuredWhy,
        category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, identity: `${DOCUMENT_ID} field ${r.key}`,
        factId: null, routeDetermined: false,
        heldButNotPrinted: true, heldValue: held.filter(Boolean).join(" / "),
        geometryRefusal: g ?? null, widgetRect: r.rect,
        why:
          "the packet refuses the write rather than shortening it: a value the form's own geometry will not hold is "
          + "left blank and named to the participant, never printed in part",
        participantMustSupply:
          "write your name and address in this box by hand — the platform holds them but this box will not take them "
          + `whole. What it holds: ${held.filter(Boolean).join(" / ")}. Never shorten your own details to fit a box.`
      });
      continue;
    }

    if (r.policy === "election") {
      const row = {
        ...base,
        reason: `this is your own election and the platform does not make it for you: ${r.why}`,
        category: PARTICIPANT_ELECTION, completenessClass: PARTICIPANT_ELECTION, class: PARTICIPANT_ELECTION,
        requiredBeforeFiling: false, routeDetermined: false,
        why: r.why,
        participantMustSupply: r.why
      };
      if (r.isSelectionControl) {
        selectionControls.push({
          ...row, selectionId: base.field, kind: "selection_control", type: r.type,
          widgets: r.widgets, disposition: "participant_election",
          serviceMethod: r.serviceMethod ?? null
        });
      } else {
        refusals.push(row);
      }
      continue;
    }

    if (r.policy === "case_ground") {
      const row = {
        ...base,
        reason: `the case decides this, not the route: ${r.what}`,
        category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, identity: `${DOCUMENT_ID} field ${r.key}`,
        factId: null, routeDetermined: false,
        determinedByTheCaseNotTheRoute: true,
        whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt,
        groundNumber: r.groundNumber ?? null, courtDepartment: r.courtDepartment ?? null,
        why: r.whyTheRouteCannotDetermineIt,
        participantMustSupply: r.what
      };
      if (r.isSelectionControl) {
        selectionControls.push({
          ...row, selectionId: base.field, kind: "selection_control", type: r.type, widgets: r.widgets
        });
      }
      refusals.push(row);
      continue;
    }

    if (r.policy === "protect") {
      refusals.push({
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, routeDetermined: false, why: r.why
      });
      continue;
    }

    refusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${DOCUMENT_ID} field ${r.key}`,
      factId: null, routeDetermined: false,
      why: `the platform holds no value it may write here and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return { writes, refusals, selectionControls };
}

function mapFor(census, canonicalReport, boundaryReport, route) {
  const canonical = sideOf(census, canonicalReport, "canonical");
  const boundary = sideOf(census, boundaryReport, "boundary");
  return {
    formNumber: DOCUMENT_ID, documentId: DOCUMENT_ID, documentRole: "primary_filing",
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: route.routeKey },
    structuralClass: "acroform_xfa_hybrid",
    explicitMappings: {},
    composedMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "composed").map((r) => [r.name, r.factIds])),
    roleRefusals: [],
    selectionControls: canonical.selectionControls,
    canonicalWrites: canonical.writes, canonicalRefusals: canonical.refusals,
    boundaryWrites: boundary.writes, boundaryRefusals: boundary.refusals
  };
}

/* ---- the builder's own count of the nine counters ------------------------------ */
function countCompleteness(maps, writeProofs, artifacts, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r, selection = false) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: selection,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable ?? null,
      determinedByTheCaseNotTheRoute: r.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt ?? null,
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  /*
   * A case-determined ground appears in BOTH canonicalRefusals and
   * selectionControls, deliberately: it is a refusal the participant must act
   * on and a selection control a reviewer must see unticked. It is classified
   * once here, keyed by its field id, so the ledger counts it once.
   */
  const blanks = [];
  const seen = new Set();
  for (const m of maps) {
    for (const r of m.canonicalRefusals) { if (seen.has(r.field)) continue; seen.add(r.field); blanks.push(row(r, false)); }
    for (const c of m.selectionControls) { if (seen.has(c.field)) continue; seen.add(c.field); blanks.push(row(c, true)); }
  }

  const availableFacts = new Set(writes.flatMap((w) => w.factId ? [w.factId] : []));
  const normLabel = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const w of writes) {
    if (!writtenInDocument.has(w.document)) writtenInDocument.set(w.document, new Set());
    for (const k of [normLabel(w.label), normLabel(w.name)]) if (k.length >= 4) writtenInDocument.get(w.document).add(k);
  }

  const ledger = [];
  for (const blank of blanks) {
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ field: blank.id, label: blank.label, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing" : "unclassifiedBlanks";
    note(counter, { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }

  const instructions = String(instructionsText ?? "");
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.field].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.toLowerCase().includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.field, label: b.label, why: "declared required-before-filing and not named in participant-instructions.md" });
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

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) {
      note("invisibleWrites", { fixture: p.fixture, why: "the finalizer reported values and the output bytes carry no glyph and no flattened appearance" });
    }
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && (p.addedGlyphsReadFromOutputBytes ?? 0) === 0) {
      note("invisibleWrites", { fixture: p.fixture, why: "the finalizer reported values and no glyph was read from the output bytes inside any measured write box" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) {
      note("visualDefects", { fixture: p.fixture, why: "ink landed outside every measured write box", where: p.glyphsOutsideMeasuredWriteBoxes });
    }
    for (const s of p.synthesizedAppearancesFound ?? []) {
      note("visualDefects", { fixture: p.fixture, field: s.field, why: s.why });
    }
    for (const refused of p.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  const rendered = artifacts.map((a) => `${a.file} ${(a.documents ?? []).join(" ")}`).join(" ").toLowerCase();
  const loose = (x) => String(x).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const m of maps) {
    if (!rendered.includes(String(m.formNumber).toLowerCase()) && !loose(rendered).includes(loose(m.formNumber))) {
      note("requiredComponentsMissing", { component: m.formNumber, why: "the field map names this document and it appears in no rendered artifact" });
    }
  }

  return { counters, findings, ledger };
}

/* ---- artifacts ------------------------------------------------------------------ */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps, side = "canonicalRefusals") {
  const seen = new Set();
  return maps.flatMap((m) => m[side]
    .filter((r) => r.requiredBeforeFiling === true)
    .filter((r) => { if (seen.has(r.field)) return false; seen.add(r.field); return true; })
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page, rect: r.rect,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply,
      ...(r.determinedByTheCaseNotTheRoute ? { determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt } : {}),
      ...(r.groundNumber ? { groundNumber: r.groundNumber } : {}),
      ...(r.courtDepartment ? { courtDepartment: r.courtDepartment } : {}),
      ...(r.measuredWhy ? { measuredWhy: r.measuredWhy } : {}),
      ...(r.heldButNotPrinted ? { heldButNotPrinted: true, heldValue: r.heldValue, geometryRefusal: r.geometryRefusal } : {})
    })))
    .sort((a, b) => (a.page - b.page) || ((b.rect?.y ?? 0) - (a.rect?.y ?? 0)));
}

/**
 * A recorded entry, quoted as the record's own words.
 *
 * The census stores several of these as multi-part strings joined by embedded
 * newlines, which render as a broken line inside an italic quotation. Runs of
 * whitespace are collapsed to a single separator; not one word is changed, added
 * or dropped. The value is asserted non-empty because a quotation presented as
 * the record speaking, with nothing inside it, is worse than no quotation at all.
 */
function quote(entry, what) {
  const text = String(entry ?? "").replace(/\s*\n\s*/g, " — ").replace(/\s+/g, " ").trim();
  assert.ok(text.length > 0, `the record's ${what} is empty and this packet will not print an empty quotation`);
  return text;
}

/** A line the FORM prints, read from the pinned binary at build time. */
function printed(census, anchorId) {
  const text = String(census.anchorText[anchorId] ?? "").replace(/\s+/g, " ").trim();
  assert.ok(text.length > 0,
    `the form anchor ${anchorId} was matched but carries no text; this packet will not print an empty quotation`);
  return text;
}

/*
 * The participant acts the committed packet-set manifest marks
 * requiredBeforeFiling.
 *
 * This build previously read only the route-obligation census and the form
 * itself. Neither carries participantActionRequired, so the manifest's FIRST
 * required-before-filing item for this packet set -- obtain your own CORI from
 * DCJIS -- and the confirm_answer cross-check paired with it reached no page of
 * the guide. The three places a CORI was mentioned all named it as an optional
 * alternative source to COPY FROM, which is the opposite role.
 *
 * No counter sees this. reports/blanks-left-for-the-participant.json asserts
 * everyRequiredBeforeFilingItemIsDisclosed true, and it is true of its own
 * sixteen entries -- every one a blank on the petition face. The manifest's
 * participant acts were never in its scope.
 *
 * FIX153. The paragraph that used to stand here said only the two
 * document-shaped kinds are surfaced, and that the manifest's other required
 * entries "carry descriptions such as" empty ones. "Such as" was doing work it
 * could not do. The manifest marks SEVEN entries requiredBeforeFiling for this
 * packet set. Three carry descriptions that say nothing standing alone --
 * "Required.", "None identified in the review.", "None identified." -- and two
 * do not: "Petitioner signature - Petition signature block." and "The
 * 'Specifically' narrative - Petition narrative section." are substantive
 * complete_field acts, and a kinds allowlist dropped them silently.
 *
 * That would have been a guidance gap only. What made it a defect is that
 * reports/blanks-left-for-the-participant.json set
 * everyRequiredBeforeFilingItemIsDisclosed true and then described its own
 * scope as excluding three entries when it excluded five. A report that
 * certifies its own completeness and miscounts its own exclusions is a
 * misleading signature block, and no counter looks at it.
 *
 * So the filter is gone. Every entry the manifest marks requiredBeforeFiling is
 * read, carried into the guide verbatim, and measured there. The three bare
 * descriptions are printed as the record writes them, under the record's own
 * name for the kind of act each is, so that a line reading "None identified in
 * the review." is legible as the record reporting an absence rather than as an
 * instruction with nothing in it. Nothing is resolved into an amount, a
 * deadline or a procedure: the record holds none, and neither does this build.
 */
const DOCUMENT_SHAPED_ACT_KINDS = ["obtain_document", "confirm_answer"];

/*
 * A verbatim disclosure is a WHOLE LINE of the delivered guide, not a substring
 * of one. "Required." is short enough to occur inside an unrelated sentence --
 * it already does, in the ordered list, quoting the route census's signature
 * requirement -- so a substring test would score it disclosed no matter what
 * this guide printed. The line-anchored test is the one the flag is worth.
 */
function disclosedAsItsOwnLine(markdown, description) {
  const wanted = String(description).trim();
  return String(markdown).split("\n")
    .some((line) => line.replace(/^\s*(?:>\s*|-\s*|\d+\.\s*)/, "").trim() === wanted);
}

function participantActsRequiredBeforeFiling() {
  const bytes = fs.readFileSync(path.join(ROOT, PACKET_SET_MANIFESTS));
  const manifest = JSON.parse(bytes.toString("utf8"));
  const set = (manifest.packetSets ?? []).find((row) => row.packetSetId === FAMILY_ID);
  assert.ok(set, `${PACKET_SET_MANIFESTS} carries no packetSet ${FAMILY_ID}`);
  /* Every entry, filtered on requiredBeforeFiling alone. No kind is dropped. */
  const acts = (set.participantActionRequired ?? []).filter((a) => a.requiredBeforeFiling === true);
  assert.ok(acts.length > 0,
    `${PACKET_SET_MANIFESTS} marks no participant act required before filing for ${FAMILY_ID}`);
  for (const act of acts) {
    assert.ok(String(act.description ?? "").trim().length > 0,
      `a required-before-filing ${act.kind} for ${FAMILY_ID} carries an empty description; this packet will not print an empty instruction`);
    /* The manifest's own strings must also be the ones the guide prints. */
    assert.ok((set.requiredBeforeFiling ?? []).includes(act.description),
      `a required-before-filing ${act.kind} is absent from ${FAMILY_ID}'s own requiredBeforeFiling list: ${act.description}`);
  }
  /*
   * The two lists must account for each other exactly. If the manifest ever
   * grows a requiredBeforeFiling line with no participant act behind it, or an
   * act with no line, this build stops rather than publish a disclosure list
   * that is a selection from the record while claiming to be the whole of it.
   */
  assert.strictEqual(acts.length, (set.requiredBeforeFiling ?? []).length,
    `${FAMILY_ID}: the manifest marks ${acts.length} participant acts required before filing but its own `
    + `requiredBeforeFiling list carries ${(set.requiredBeforeFiling ?? []).length} lines; the disclosure list `
    + "cannot claim to be the whole record while the two disagree");
  const documentShaped = acts.filter((a) => DOCUMENT_SHAPED_ACT_KINDS.includes(a.kind));
  assert.ok(documentShaped.length > 0,
    `${PACKET_SET_MANIFESTS} marks no document-shaped participant act required before filing for ${FAMILY_ID}`);
  return { acts, documentShaped, digest: crypto.createHash("sha256").update(bytes).digest("hex") };
}

function participantInstructions(maps, rbf, boundaryOnlyRbf, route, source, census) {
  const elections = maps.flatMap((m) => m.selectionControls.filter((c) => c.disposition === "participant_election"));
  const grounds = rbf.filter((r) => r.groundNumber).sort((a, b) => a.groundNumber - b.groundNumber);
  const departments = rbf.filter((r) => r.courtDepartment);
  const otherRbf = rbf.filter((r) => !r.groundNumber && !r.courtDepartment);
  const writes = maps.flatMap((m) => m.canonicalWrites);

  const out = [];
  out.push("# Filing instructions — ask a Massachusetts judge to expunge a court record under G.L. c. 276, § 100K", "");
  out.push(
    "This packet is the Massachusetts Trial Court's **PETITION FOR EXPUNGEMENT, G.L. c. 276, § 100K** (form footer "
    + `\`${printed(census, "form-footer")}\`). Page 1 is the petition you file. Page 2 is the court's own instruction `
    + "sheet, with a continuation box at the foot of it.", ""
  );

  out.push("## Expungement is not sealing. Read this first.", "");
  out.push(
    "**An order under this section destroys the record.** The court's own instruction sheet says so: "
    + `_\"${printed(census, "records-destroyed")}\"_`, ""
  );
  out.push(
    `And it warns you: _\"${printed(census, "copies-warning")}\"_ If you want a copy of anything in that file — the `
    + "petition, your own documents, the record itself — **make the copies before you file, not after**.", ""
  );
  out.push(
    "Massachusetts also has a separate **sealing** process, which limits who may see a record instead of destroying "
    + "it. Sealing is a different remedy under a different section on a different form, and this packet is not it. If "
    + "sealing is what you want, do not file this petition.", ""
  );

  out.push("## Which ground you are claiming, and why this packet has not ticked one", "");
  out.push(
    `Page 1 prints _\"${printed(census, "grounds-stem")}\"_ over eight boxes. **You must tick the one that fits your `
    + "record. This packet has deliberately ticked none.**", ""
  );
  out.push(
    "That is not an omission. This packet was built for a single route, and that route covers all eight grounds — the "
    + "repository's own route record puts the eligibility basis for it at "
    + `_\"${quote(route.eightGroundsBasis, "the eight-ground basis")}\"_ and names no ground. Which ground created `
    + "your record is a fact of **your** record, and the judge has to find it on clear and convincing evidence. "
    + "Nobody at this platform has seen your file, so ticking one for you would be putting a legal conclusion on a "
    + "petition you sign under the pains and penalties of perjury.", ""
  );
  out.push("| # | The ground the form prints | Tick it only if |", "| --- | --- | --- |");
  for (const g of grounds) out.push(`| ${g.groundNumber} | ${g.disclosureLabel} | ${g.participantMustSupply} |`);
  out.push("");

  out.push("## Which court department heard the case", "");
  out.push(
    "The four department boxes at the top of page 1 say where the case was **heard**, not which law you are using. "
    + `The route record puts the destination at _\"${quote(route.heardBasis, "filing destination")}\"_ Tick the one `
    + "department that heard your case, and write the division beside it.", ""
  );
  out.push("| The box | Tick it only if |", "| --- | --- |");
  for (const d of departments) out.push(`| ${d.disclosureLabel} | ${d.participantMustSupply} |`);
  out.push("");

  out.push("## Where it goes", "");
  out.push(`The court's own instruction sheet on page 2: _"${printed(census, "where-to-file")}"_`, "");
  out.push(`The route record says the same: _"${quote(route.clerkBasis, "filing destination")}"_`, "");
  out.push(
    `On what to list: _\"${printed(census, "multiple-charges")}\"_ And on a second case: `
    + `_\"${printed(census, "separate-petitions")}\"_`, ""
  );

  out.push("## Giving the district attorney a copy", "");
  out.push(
    `The court's own instruction sheet: _\"${printed(census, "da-copy-timing")}\"_`, ""
  );
  out.push(
    "At the foot of page 1 you state that you did it, tick **in hand** or **first class mail**, and write the date. "
    + "**All three are blank on your copy on purpose.** When this packet was prepared you had not delivered anything "
    + "yet, and this platform will not certify an act that has not happened. Tick and date them on the day you "
    + "actually deliver or post the copy.", ""
  );

  out.push("## Fees, service and hearings — what this packet does NOT tell you", "");
  out.push(
    "- **Filing fee:** the route record records none for this route and the form prints none, so **no amount is "
    + "stated here**. Ask the clerk's office you file in. An unsourced figure in a filing instruction is worse than "
    + "none."
  );
  out.push(
    "- **Anyone else to serve, and by when:** the route record records no service recipient, method or timing for "
    + "this route beyond the district attorney's copy the form itself describes, so nothing more is stated here."
  );
  out.push(
    `- **Hearing:** the route record's words are _"${quote(route.uncontestedHearing[0], "hearing treatment")}"_ `
    + "Whether to ASK for one is a box on page 1 and it is yours to tick."
  );
  out.push(
    `- **If the district attorney opposes:** _"${quote(route.contestedHandoff[0], "contested handoff")}"_`
  );
  out.push("");

  const { acts: participantActs, digest: manifestDigest } = participantActsRequiredBeforeFiling();
  const obtain = participantActs.filter((a) => a.kind === "obtain_document");
  const confirm = participantActs.filter((a) => a.kind === "confirm_answer");

  out.push("## Get this before you start", "");
  out.push(
    "The committed packet-set record for this packet marks the item below **required before filing**. It is not "
    + "one of the blanks on the form and no part of this packet supplies it: you obtain it yourself, before you "
    + "fill anything in. Quoted verbatim from "
    + `\`${PACKET_SET_MANIFESTS}\`, packetSet \`${FAMILY_ID}\` (sha256 ${manifestDigest}):`, ""
  );
  for (const act of obtain) {
    out.push(`> ${act.description}`, "");
    if (act.obtainedFrom) out.push(`**Where from:** ${act.obtainedFrom}`, "");
  }
  if (confirm.length > 0) {
    out.push("The same record pairs it with a check, also marked required before filing:", "");
    for (const act of confirm) out.push(`> ${act.description}`, "");
    out.push(
      "That check is the reason to get it first. The docket number is the blank that points the petition at a file, "
      + "and this packet holds no docket number to check yours against.", ""
    );
  }

  /*
   * FIX153. Above, the two document-shaped acts are set out in full because
   * they are the ones a participant has to go and DO before touching the form.
   * Below is the whole of what the record marks required before filing, so the
   * guide cannot be read as disclosing a selection while a committed report
   * certifies it disclosed everything. Each line is printed as its own line, so
   * the flag in reports/blanks-left-for-the-participant.json can measure it.
   */
  out.push("## Everything the committed record marks required before filing", "");
  out.push(
    `The packet-set record marks **${participantActs.length}** entries required before filing for this packet. `
    + `All ${participantActs.length} are printed below, word for word as the record writes them, each under the `
    + "record's own name for the kind of act it is. The two set out in full above are repeated here so that this is "
    + "the whole of what the record requires and not a selection from it.", ""
  );
  for (const act of participantActs) {
    out.push(
      `**\`${act.kind}\`** — ${act.requirement}`
      + `${act.conditionDescription ? ` — ${act.conditionDescription}` : ""}`, ""
    );
    out.push(`> ${act.description}`, "");
  }

  const completeFieldActs = participantActs.filter((a) => a.kind === "complete_field");
  if (completeFieldActs.length > 0) {
    out.push(
      `The ${completeFieldActs.length} \`complete_field\` entries are blanks on the petition's own face. The table `
      + "further down, **The blanks you must complete**, is where each is set out with what to write in it. They "
      + "appear here as well because the record marks them required before filing, and this list is that record's, "
      + "unabridged.", ""
    );
  }

  const bareActs = participantActs.filter((a) =>
    !DOCUMENT_SHAPED_ACT_KINDS.includes(a.kind) && a.kind !== "complete_field");
  if (bareActs.length > 0) {
    out.push(
      `${bareActs.length} of those lines say almost nothing standing alone. That is the record speaking, not an `
      + "omission here: "
      + bareActs.map((a) => `its \`${a.kind}\` entry reads _"${a.description}"_`).join(", ")
      + ". **They are printed as the record writes them and are not resolved into an amount, a deadline or a "
      + "procedure.** What this packet is able to say about each is elsewhere on this page: signing and dating is a "
      + "numbered step in the list below, done by hand on paper because that rule carries no fillable box; and on a "
      + "filing fee, no amount is stated anywhere in this packet, because none is recorded — the clerk's office you "
      + "file in is the place to ask.", ""
    );
  }

  out.push("## What you must do, in order", "");
  let step = 0;
  for (const act of obtain) {
    out.push(`${++step}. **Get it before you write anything.** ${act.description}`
      + `${act.obtainedFrom ? ` **Where from:** ${act.obtainedFrom}` : ""}`);
  }
  out.push(`${++step}. **Write in the docket number and the charges** from your own court papers or your CORI.`);
  for (const act of confirm) {
    out.push(`${++step}. **Check it against what you obtained.** ${act.description}`);
  }
  out.push(`${++step}. **Tick the one court department that heard the case**, and write its division.`);
  out.push(`${++step}. **Tick the ground or grounds that fit your record**, from the table above.`);
  out.push(`${++step}. **Write your explanation** in the \`Specifically\` box — as much detail as you can give.`);
  out.push(`${++step}. **Decide whether to ask for a hearing**, and whether you are attaching documents.`);
  out.push(`${++step}. **Sign and date the petition.** The route record: _"${quote(route.signatureRequirements[0], "signature requirements")}"_ `
    + "Page 1 prints `DATE:` and `PETITIONER'S SIGNATURE` on a rule at the foot — **that rule carries no fillable "
    + "box at all**, on this form, so you sign and date it by hand on paper.");
  out.push(`${++step}. **Give the district attorney's office a copy**, then tick the method and write the date on page 1.`);
  out.push(`${++step}. **File it at the clerk's office of the court where the case was heard.**`);
  out.push("");

  out.push("## What this packet already filled in", "");
  if (writes.length === 0) {
    out.push("Nothing. Every blank on this form is one you complete.", "");
  } else {
    out.push("| Page | The blank on the form | What it says |", "| --- | --- | --- |");
    for (const w of writes) {
      out.push(`| ${w.page} | ${w.effectiveLabel} | from the details you gave the platform |`);
    }
    out.push("");
    out.push("**Check every one of them against your own papers before you sign.** You are signing the petition, not the platform.", "");
  }

  out.push("## The blanks you must complete", "");
  out.push("| Page | The blank on the form | What to write |", "| --- | --- | --- |");
  for (const i of otherRbf) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
  for (const i of departments) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
  for (const i of grounds) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
  out.push("");

  if (boundaryOnlyRbf.length > 0) {
    out.push("## Blanks the form itself is too small for", "");
    out.push(
      "On some records a detail the platform holds is longer than the box the form prints for it. The packet leaves "
      + "that box **blank rather than shortening what you told us** — a shortened address on a sworn petition reads "
      + "as a complete one. If any of these is blank on your copy, write it in by hand:", ""
    );
    out.push("| Page | The blank on the form | Why it is blank |", "| --- | --- | --- |");
    for (const i of boundaryOnlyRbf) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.measuredWhy ?? i.why} |`);
    out.push("");
  }

  out.push("## Boxes that are yours to tick, and nobody else's", "");
  out.push("| The box | Why the packet left it to you |", "| --- | --- |");
  for (const c of elections) out.push(`| ${c.effectiveLabel} | ${c.why} |`);
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of an official Massachusetts Trial Court form. It is not legal advice, it is not filed "
    + "for you, and it does not decide whether your record can be expunged. The court's own instruction sheet sets "
    + "out what the judge must find, and only the judge makes that finding."
  );
  out.push("");
  out.push(`_Route: ${route.routeKey} · ${STATUTORY_AUTHORITY} · source SHA-256 ${source.sha256} · `
    + `${census.rows.length} widgets read from the pinned binary_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point --------------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const binding = queueBinding();
  const sweep = sweepMeasurement();
  const source = resolveSource(binding);
  if (!source.bound) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopReason: "BLOCKED_SOURCE",
      failedSourceIdentities: [{
        sourceId: binding.sourceId, declaredPath: binding.declaredPath, declaredSha256: binding.sha256,
        sweepMeasuredPath: sweep.actualPath, mountsSearched: source.searched
      }],
      why: "the source did not bind by exact SHA-256 in any mounted custody root, so nothing may be rendered from it",
      counters: null, overlayDirectoryTouched: false
    };
  }

  const route = routeRecord();
  const census = await censusOf({ ...source, ...binding });

  assert.equal(census.unmapped.length, 0,
    `${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.map((u) => u.field))}`);
  assert.equal(census.stale.length, 0,
    `the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
  assert.equal(census.captionDrift.length, 0,
    `a recorded caption is no longer printed where the dictionary says: ${JSON.stringify(census.captionDrift, null, 2)}`);
  assert.equal(census.anchorDrift.length, 0,
    `a form-level sentence this family reasons from is no longer printed: ${JSON.stringify(census.anchorDrift, null, 2)}`);
  assert.equal(census.rows.length, sweep.acroFieldCount,
    `the sweep measured ${sweep.acroFieldCount} AcroForm fields and this build reads ${census.rows.length}`);
  assert.equal(census.pageCount, sweep.pageCount,
    `the sweep measured ${sweep.pageCount} pages and this build reads ${census.pageCount}`);

  /* No box on this form is ticked by the route: § 100K's eight grounds are
   * determined by the case. Asserted so a later edit cannot introduce a tick
   * without also removing this line. */
  assert.equal(census.rows.filter((r) => r.policy === "route_tick").length, 0,
    "this route makes no election on this form and the dictionary declares one");
  const composedRows = census.rows.filter((r) => r.policy === "composed");
  assert.equal(composedRows.length, 1, `this build writes exactly one box and the dictionary declares ${composedRows.length}`);
  for (const c of composedRows) {
    assert.ok(c.multiline, `${c.name} is the composed contact block and the form does not declare it multiline`);
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      sourceSha256: source.sha256, custodyRoot: source.custodyRoot,
      fields: census.rows.length, pages: census.pageCount,
      xfaInInputDict: census.xfaInInputDict, sweepSaysXfaPresent: sweep.xfaPresentInTheSweep,
      composedWrites: composedRows.length,
      supply: census.rows.filter((r) => r.policy === "supply").length,
      caseGrounds: census.rows.filter((r) => r.policy === "case_ground").length,
      elections: census.rows.filter((r) => r.policy === "election").length,
      protected: census.rows.filter((r) => r.policy === "protect").length,
      labelsTheSharedRegistryWouldHaveBound: census.rows
        .filter((r) => r.policy !== "composed" && r.sharedRegistryWouldBindFromThisBuildsLabel)
        .map((r) => ({ field: r.name, wouldBind: r.sharedRegistryWouldBindFromThisBuildsLabel }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const reports = {};
  let sanitationSample = null;

  for (const fixtureName of ["canonical", "boundary"]) {
    const { bytes, report } = await renderDocument({ ...source, ...binding }, census, fixtureName);
    reports[fixtureName] = report;
    sanitationSample = report.sanitation ?? sanitationSample;

    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), bytes);

    const proof = await byteProof({ ...source, ...binding }, census, file, fixtureName, report);
    writeProofs.push({
      fixture: fixtureName, formNumber: DOCUMENT_ID, sourceSha256: source.sha256,
      proofMethod: proof.proofMethod,
      valuesReportedByFinalizer: report.written.length,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outsideGlyphs,
      glyphsOutsideMeasuredWriteBoxes: proof.outsideWriteBoxes,
      synthesizedAppearancesFound: proof.synthesizedAppearancesFound,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      documentAuthoredAppearances: proof.documentAuthoredAppearances,
      selectionsRead: proof.selectionsRead,
      geometryRefusals: [...geometryRefusalsOf(report).values()],
      unfittable: report.unfittable,
      composedWrites: report.composedWrites ?? [],
      actualWrites: proof.actualWrites
    });

    const packetDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.length, pageCount: packetDoc.getPageCount(),
      pageManifest: packetDoc.getPageIndices().map((i) => ({
        packetPage: i + 1, component: "primary_filing", documentId: DOCUMENT_ID,
        sourcePage: i + 1, sourceSha256: source.sha256
      })),
      documents: ["primary_filing", DOCUMENT_ID]
    });

    if (!skipRaster) {
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packetDoc.getPageCount(); i += 1) {
        const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
        const render = await rasterizePageCalibrated({ file: path.join(ROOT, file), pageIndex: i, keep: stage });
        for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
          const f = path.join(stage, scrap);
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture: fixtureName, page: i + 1,
          file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx,
          paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const maps = [mapFor(census, reports.canonical, reports.boundary, route)];
  const rbf = requiredBeforeFilingItems(maps, "canonicalRefusals");
  const boundaryRbf = requiredBeforeFilingItems(maps, "boundaryRefusals");
  const canonicalFields = new Set(rbf.map((r) => r.field));
  const boundaryOnlyRbf = boundaryRbf.filter((r) => !canonicalFields.has(r.field));

  const participantActs = participantActsRequiredBeforeFiling();
  const instructionsText = participantInstructions(maps, rbf, boundaryOnlyRbf, route, source, census);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  /*
   * A required-before-filing act the record holds must reach the page the
   * participant reads, verbatim, and it must be an instruction to OBTAIN the
   * document rather than a mention of it in some other role.
   *
   * Both assertions fire on the guide this family shipped before this repair:
   * the manifest's CORI sentence appeared nowhere in it, and its three
   * references to a CORI were all "copy the docket number from your court
   * papers or your CORI" -- an alternative source, not a document to get.
   */
  for (const act of participantActs.acts) {
    assert.ok(disclosedAsItsOwnLine(instructionsText, act.description),
      `a required-before-filing ${act.kind} the packet-set manifest holds is not carried into the guide verbatim as a line of its own: ${act.description}`);
    if (act.obtainedFrom) {
      assert.ok(instructionsText.includes(act.obtainedFrom),
        `the guide names no source for a required-before-filing document: ${act.obtainedFrom}`);
    }
  }
  assert.match(instructionsText, /^## Get this before you start$/m,
    "the guide must carry a section naming what the participant obtains before filling anything in");
  assert.match(instructionsText, /^\d+\. \*\*Get it before you write anything\.\*\*/m,
    "obtaining the required document must be a numbered step in the guide's own ordered list, not only a section");
  /*
   * FIX153. The section that carries the whole of the record's
   * required-before-filing list, and the count it announces, are both asserted
   * here: a guide that quietly dropped back to disclosing a subset would
   * otherwise still build, and a committed report would still certify it.
   */
  assert.match(instructionsText, /^## Everything the committed record marks required before filing$/m,
    "the guide must carry the section that discloses the whole of the record's required-before-filing list");
  assert.ok(
    instructionsText.includes(`marks **${participantActs.acts.length}** entries required before filing`),
    `the guide must announce the number of required-before-filing entries the manifest actually holds (${participantActs.acts.length})`);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: "MA", implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    networkAcquisitionsMade: 0,
    bindingMethod:
      "the MASTER_QUEUE row's own declared path and SHA-256, read at build time, matched byte-for-byte against the "
      + "first mounted custody root that holds it. Two further independent statements of the same identity must "
      + "agree before anything renders: a digest asserted in the builder itself, and the per-source measurement in "
      + "SOURCE_IDENTITY_RESOLUTION_SWEEP.json.",
    routeKey: route.routeKey, statutoryAuthority: STATUTORY_AUTHORITY,
    allSourcesExact: true,
    custodyRootsSearched: source.searched.map((s) => ({ root: s.root, exists: s.exists, sha256: s.sha256 ?? null })),
    custodyRootUsed: source.custodyRoot,
    documents: [{
      sourceIds: [binding.sourceId], documentId: DOCUMENT_ID, formNumber: DOCUMENT_ID,
      officialFormFamily: binding.officialFormFamily,
      pathInArchive: binding.declaredPath, sha256: source.sha256, byteLength: source.byteLength,
      instrumentKind: "primary_filing", pageCount: census.pageCount, acroFieldCount: census.rows.length,
      editionFooterPrintedOnTheForm: census.anchorText["form-footer"] ?? null,
      formNumberPrintedOnTheForm: null,
      formNumberNote:
        "the form prints no form number on either page. The document id above is this packet's own handle for it and "
        + "is built from the caption the form does print."
    }],
    sweepMeasurement: {
      sourceId: sweep.sourceId, priorCustodyClass: sweep.priorCustodyClass,
      actualPath: sweep.actualPath, copiesInCustody: sweep.copiesInCustody, custodies: sweep.custodies,
      pageCount: sweep.pageCount, acroFieldCount: sweep.acroFieldCount, byteLength: sweep.byteLength,
      agreesWithThisBuild: sweep.acroFieldCount === census.rows.length && sweep.pageCount === census.pageCount
    },
    custodyRecordDisagreement: {
      finding:
        "SOURCE_READY_BUILDABILITY.json and the MASTER_QUEUE row both classify this family "
        + `custodyClass ${JSON.stringify(binding.custodyClassInQueue)} with documentSourcesResolved 0, while the `
        + "declared path holds the declared digest exactly.",
      basis:
        "That record says of itself that its two comparison arrays match manifest officialFormId strings against "
        + "bound sourceId strings, that the vocabularies differ for the same document, and that a name there is a "
        + "prompt to look rather than a finding. The same row also carries kind 'held_pdf', firstBytes '%PDF-' and "
        + "resolvedBy 'declared_path' for this very source, which contradicts its own scalar. This build looked: the "
        + "bytes bind.",
      consequence: "recorded for whoever owns the custody scalar; the source is in custody and this family built on it"
    },
    sanitationObserved: sanitationSample ? {
      xfaPresentInInput: sanitationSample.xfaPresentInInput ?? null,
      xfaRemoved: sanitationSample.xfaRemoved ?? null,
      synthesizedAppearancesSuppressed: sanitationSample.synthesizedAppearancesSuppressed ?? null,
      synthesizedWidgetBordersSuppressed: sanitationSample.synthesizedWidgetBordersSuppressed ?? null
    } : null,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that (Rev. 12.20.18) is the current published edition of this petition — no freshness review has been done here",
      "that any output is approved for participant delivery",
      "that any record is eligible for expungement under G.L. c. 276, § 100K"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "Every caption was re-read from the pinned binary at its recorded coordinate before anything rendered. This "
      + "form's text stream interleaves adjacent runs — 'YOUR NAME AND ADDRESSCOURT DEPARTMENT' and 'Boston Municipal "
      + "CourtJuvenile Court' are each one extracted line — so each recorded caption is a substring that survives the "
      + "interleaving, matched flattened at its own recorded line only.",
    formLevelAnchors: FORM_ANCHORS.map((a) => ({ ...a, textReadFromTheBinary: census.anchorText[a.id] ?? null })),
    documents: [{
      documentId: DOCUMENT_ID, formNumber: DOCUMENT_ID, sourceSha256: source.sha256,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      xfaPresentInTheAcroFormDictionary: census.xfaInInputDict,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        appearanceStates: r.widgets[0]?.appearanceStates ?? [],
        section: r.section, effectiveLabel: r.effectiveLabel,
        printedCaption: r.caption, captionReadAt: r.captionAt,
        policy: r.policy, composedFrom: r.factIds,
        groundNumber: r.groundNumber, courtDepartment: r.courtDepartment,
        sourceShippedValue: r.sourceValue,
        sharedRegistryWouldBindFromName: r.sharedRegistryWouldBindFromName,
        sharedRegistryWouldBindFromThisBuildsLabel: r.sharedRegistryWouldBindFromThisBuildsLabel
      }))
    }]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [route.routeKey], renderStrategy: "acroform_fill",
    jurisdiction: "MA",
    statutoryAuthority: `${STATUTORY_AUTHORITY} — non-time-based expungement on one of eight enumerated grounds`,
    remedy: "expungement (the record is destroyed), not sealing",
    officialForm: DOCUMENT_ID, assignedOfficialForm: binding.officialFormFamily,
    officialFormMatchesAssignment: true,
    captionBasis: "printed captions re-read from the pinned binary at recorded coordinates; see field-census.census-v1.json",
    dispositionVocabulary: [SIGNATURE, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "This form carries NO route fork. Its eight ground boxes look like one and are not: this family's single route "
      + `(${route.routeKey}) spans all eight, and the route-obligation census records its basis as `
      + `"${quote(route.eightGroundsBasis, "the eight-ground basis")}" without naming a ground. Each of the eight is `
      + "therefore declared REQUIRED_BEFORE_FILING with determinedByTheCaseNotTheRoute and a stated reason, which is "
      + "the completeness contract's own auditable exception. The four court-department boxes carry the same "
      + "declaration on the census's filing-destination record: the department is where the case was HEARD.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    boundaryOnlyRequiredBeforeFiling: boundaryOnlyRbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: ["primary_filing"],
    componentSetBasis:
      `the route-obligation census records this route's deliverable as ${JSON.stringify(route.primaryFiling)} and `
      + "records no proposed order, cover sheet, notice, certificate of service or separate affidavit for it; the "
      + "packet-set manifest declares one component, ma-expunge-k-primary-filing-1",
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    fixturesAreByteIdentical: artifacts.length === 2 && artifacts[0].sha256 === artifacts[1].sha256,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Read back from the finalized PDF bytes at every measured widget rectangle, not from the finalizer's own "
      + "report, and then over the whole artifact for ink outside those rectangles. Selection controls are read on "
      + "the INK-operator channel as well as the glyph channel: this form ships a '/1' appearance and NO '/Off' for "
      + "every one of its twenty-two boxes, so an appearance stamped at an unticked box would be a synthesized "
      + "border rather than reproduced ink, and it would draw no glyph to be read. Stroke, fill, shading and XObject "
      + "operators are counted apart from path-construction and clipping operators and from show-text, because the "
      + "first mark the page whatever their operand and the other two do not: every text field here ships no /AP, "
      + "and each generated appearance is a construction-and-clip preamble around an empty '<> Tj'.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk,
      synthesizedAppearancesFound: p.synthesizedAppearancesFound,
      selections: p.selectionsRead.filter((s) => s.marked).map((s) => ({ control: s.control, page: s.page })),
      written: p.actualWrites.map((w) => ({ field: w.field, composedFrom: w.composedFrom }))
    })),
    blockingFindings: writeProofs.flatMap((p) => p.refusedFieldsWithInk.map((r) => ({
      fixture: p.fixture, field: r.fieldId, finding: "a field the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    boundaryOnlyRequiredBeforeFiling: boundaryOnlyRbf,
    notApplicableOnThisRoute: [],
    notApplicableNote:
      "This form has no branch this route does not use, so nothing is declared not-applicable-on-this-route. Its "
      + "eight ground boxes and its four department boxes are determined by the CASE and are declared "
      + "required-before-filing with that reason stated, not declared inapplicable.",
    participantElections: maps.flatMap((m) => m.selectionControls
      .filter((c) => c.disposition === "participant_election")
      .map((c) => ({ document: m.formNumber, field: c.field, page: c.page, label: c.effectiveLabel, why: c.why }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals
      .filter((r) => r.requiredBeforeFiling !== true && r.category === SIGNATURE)
      .map((r) => ({ document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why }))),
    /*
     * The manifest's participant ACTS, which are required before filing and are
     * not blanks on the form. They were outside this report's scope entirely
     * until FIX02, which is why the flag below could read true while the guide
     * never told the participant to obtain a CORI at all; and FIX02 admitted
     * only two of the manifest's seven, which is why the flag's own scope
     * sentence then named three exclusions where there were five. Every entry
     * is now listed, and each carries its own measured result.
     */
    participantActsRequiredBeforeFiling: participantActs.acts.map((a) => ({
      kind: a.kind, requirement: a.requirement, description: a.description,
      ...(a.conditionDescription ? { conditionDescription: a.conditionDescription } : {}),
      ...(a.obtainedFrom ? { obtainedFrom: a.obtainedFrom } : {}),
      source: `${PACKET_SET_MANIFESTS}#packetSets[packetSetId=${FAMILY_ID}]`,
      sourceSha256: participantActs.digest,
      disclosedVerbatimInGuide: disclosedAsItsOwnLine(instructionsText, a.description)
    })),
    participantActsRequiredBeforeFilingDeclared: participantActs.acts.length,
    participantActsRequiredBeforeFilingDisclosed:
      participantActs.acts.filter((a) => disclosedAsItsOwnLine(instructionsText, a.description)).length,
    participantActsExcludedFromTheFlag: [],
    /*
     * MEASURED, not asserted. Every form blank this report lists, and EVERY
     * participant act the manifest marks required before filing -- no kind
     * filtered out -- tested against the delivered guide.
     */
    everyRequiredBeforeFilingItemIsDisclosed:
      [...rbf, ...boundaryOnlyRbf].every((r) => instructionsText.includes(r.effectiveLabel ?? r.label ?? ""))
      && participantActs.acts.every((a) => disclosedAsItsOwnLine(instructionsText, a.description)),
    whatThatFlagCovers:
      "every form blank listed in requiredBeforeFiling and boundaryOnlyRequiredBeforeFiling, AND every "
      + "participantActionRequired entry the committed packet-set manifest marks requiredBeforeFiling for this "
      + `packet set -- all ${participantActs.acts.length} of them, of kinds `
      + `${participantActs.acts.map((a) => a.kind).join(", ")}. No entry is excluded, by kind or by anything else; `
      + "participantActsExcludedFromTheFlag is empty and is generated from the same array this flag measures. A "
      + "participant act counts as disclosed only when its description is a WHOLE LINE of the delivered guide, not "
      + "merely a substring of one: \"Required.\" is short enough to fall inside an unrelated sentence, and a "
      + "substring test would have scored it disclosed whatever the guide printed.",
    howTheScopeOfThatFlagIsDerived:
      `read at build time from ${PACKET_SET_MANIFESTS}#packetSets[packetSetId=${FAMILY_ID}].participantActionRequired `
      + "and filtered on requiredBeforeFiling === true alone. The sentence above counts the same array it measures, "
      + "so this report can no longer state a different number of exclusions than it makes.",
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    whatToLookAt: [
      "Page 1, YOUR NAME AND ADDRESS: the block carries the participant's name, street address and city/state/ZIP on separate lines, inside the box and not over the rule beneath it.",
      "NOT ONE of the twenty-two check boxes carries a mark, and none of them has acquired a square, border or outline the blank form does not print. This form ships no /Off appearance, so a synthesized border is the defect to look for here.",
      "The eight ground boxes under 'I make this request because the records were created as a result of' are ALL empty.",
      "The four court-department boxes are all empty and the COURT DIVISION line is blank.",
      "DOCKET NO., the charges box, the Specifically box and the page-2 Additional Information box are all blank.",
      "The service block at the foot of page 1 — both method boxes and the date — is blank.",
      "The DATE / PETITIONER'S SIGNATURE rule at the foot of page 1 is blank; this form carries no widget there at all.",
      "Page 2 is the court's instruction sheet and carries no participant ink above the Additional Information box."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: [
      {
        finding:
          "SOURCE_READY_BUILDABILITY.json classifies this family SOURCE_IDENTITY_UNRESOLVED_IN_THE_CUSTODY_RECORD "
          + "with documentSourcesResolved 0, and the MASTER_QUEUE row repeats the scalar as custodyClass "
          + `${JSON.stringify(binding.custodyClassInQueue)} — beside sourceStatus SOURCE_BOUND_BY_HELD_BYTES and `
          + "sourceBound true in the SAME row.",
        consequence:
          "The declared path holds the declared digest exactly, in a mounted custody root, verified before this build "
          + "wrote anything, and the buildability row's own per-source entry for it reads kind 'held_pdf', firstBytes "
          + "'%PDF-' and resolvedBy 'declared_path'. The row contradicts itself and the scalar is the wrong half. "
          + "Recorded in source-receipt.json for whoever owns it."
      },
      {
        finding:
          "SOURCE_IDENTITY_RESOLUTION_SWEEP.json records identityEvidence.xfaPresent false for these bytes. The "
          + "AcroForm dictionary of the pinned binary carries an /XFA entry, and pdf-lib announces 'Removing XFA form "
          + `data' on load. This build reads xfaPresentInTheAcroFormDictionary ${census.xfaInInputDict}.`,
        consequence:
          "The binary is an XFA HYBRID. Its AcroForm side is complete — 26 widgets over static page content that "
          + "extracts cleanly — so the ordinary fill-and-flatten path applies and the delivered artifact is the "
          + "flattened rendering of the static pages after the XFA packet is removed. The sanitation report records "
          + "xfaPresentInInput and xfaRemoved. The sweep's scalar is wrong about this binary and is recorded rather "
          + "than resolved here: the same disagreement was measured on TC0021 by ma-expunge-mj-set, so it is a "
          + "property of how that field is generated rather than of this file."
      },
      {
        severity: "blocking_if_unfixed_elsewhere",
        finding:
          "This form's AcroForm names are XFA-era and carry no word a descriptor can match — every one of the 26 "
          + "measures sharedRegistryWouldBindFromName null. The finalizer is also handed this build's own "
          + "effectiveLabel, and the shared registry DOES match several of those: the measurement per field is "
          + "recorded in field-census.census-v1.json as sharedRegistryWouldBindFromThisBuildsLabel.",
        consequence:
          "Every widget except the one composed contact block is passed as unwritable by ROLE, which is the one gate "
          + "the descriptor channel cannot reverse, so no label of this build's own writing can cause a write. "
          + "Recorded because a family that labelled its fields for the participant's benefit and did NOT pass the "
          + "role list would have written participant facts into the charges box and the narrative box on a sworn "
          + "petition."
      },
      {
        finding:
          "Every check box on this form ships an appearance for its ON state ('/1') and NO '/Off' appearance at all.",
        consequence:
          "That is the precondition of the measured Vermont defect: pdf-lib's updateFieldAppearances regenerates an "
          + "appearance for a widget whose current /AS has no /AP /N entry, using its default check-box provider, "
          + "which paints a stroked square the size of the rectangle — twenty-two of them here, on a petition that "
          + "ticks none. suppressSynthesizedAppearances and suppressSynthesizedWidgetBorders are both passed, and "
          + "reports/actual-writes.json reads every one of the twenty-two rectangles in the output on the "
          + "INK-operator channel to confirm nothing paints there. What is stamped at each is the EMPTY appearance "
          + "the suppression installs: measured at zero stroke, fill, shading and XObject operators, against the "
          + "source's own on-state stream for the same box, which strokes."
      },
      {
        finding:
          "Page 1 prints 'DATE:' and \"PETITIONER'S SIGNATURE\" on a rule at y 62 and the AcroForm carries NO widget "
          + "at either.",
        consequence:
          "There is nothing for this build to protect and nothing for it to write, and no field counter would ever "
          + "have shown the gap. The participant is told in participant-instructions.md that the signature rule has "
          + "no fillable box on this form and is signed by hand. Recorded because a signature line invisible to the "
          + "field census is exactly the kind of omission these packets exist to prevent."
      },
      {
        finding:
          "The route-obligation census records nothing for this route on proposedOrder, coverSheet, notice, "
          + "certificateOfService, affidavitOrVerification, schedulesOrContinuationPages, "
          + "requiredParticipantAttachments, notarizationRequirements, filingMethod, filingFee, feeWaiverTreatment, "
          + `serviceRecipients, serviceMethod, serviceTiming, filingDeadline and postFilingInstructions: `
          + `${JSON.stringify(route.notRecorded)}.`,
        consequence:
          "The participant instructions state no filing fee, no fee waiver, no deadline and no service recipient "
          + "beyond the district attorney's copy the FORM ITSELF describes, and they name the clerk's office as the "
          + "place to ask about a fee. Every sentence about giving the district attorney a copy is quoted from the "
          + "court's own instruction sheet on page 2 of the pinned binary, read at build time. An unsourced figure "
          + "in a filing instruction is worse than none."
      },
      {
        finding:
          "MASTER_QUEUE lists this family's officialFormFamily as the free-text string 'Petition for Expungement, "
          + "G.L. c. 276, § 100K'. The form itself prints no form number on either page — only the edition footer "
          + `${JSON.stringify(census.anchorText["form-footer"] ?? null)}.`,
        consequence:
          "The document id used throughout this family's artifacts is this packet's own handle, built from the "
          + "caption the form does print, and source-receipt.json records formNumberPrintedOnTheForm as null rather "
          + "than inventing one."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "This packet ticks NONE of the eight § 100K grounds and declares each one determined by the case rather than by "
      + "the route, on the route-obligation census record that this route rests on 'one of the eight statutory "
      + "grounds' without naming one. Confirm that is the right treatment, and that no ground may be inferred from a "
      + "screening answer without a court record behind it.",
      "The four court-department boxes and the COURT DIVISION line are left to the participant on the same reasoning "
      + "— the department is where the case was heard. Confirm.",
      "This packet writes the participant's name, street address and city/state/ZIP into the single YOUR NAME AND "
      + "ADDRESS block and nothing else. Confirm that a name-and-address block with no telephone number is complete "
      + "for this court's purposes; the form prints no telephone caption.",
      "(Rev. 12.20.18) is the edition held in custody. Confirm it is still the published edition before any "
      + "promotion beyond state_built.",
      "This family and ma-seal-court-set are different remedies under different sections. Confirm the participant "
      + "instructions here draw that line clearly enough for someone who came in wanting 'my record cleared'."
    ],
    mattersForTheReviewersAttention: [
      "build-findings.json — the sweep records xfaPresent false for a binary whose AcroForm dictionary carries /XFA.",
      "build-findings.json — every check box ships only a '/1' appearance and no '/Off'; both suppression flags are passed and the output bytes are read at all twenty-two rectangles to confirm nothing was synthesized.",
      "reports/actual-writes.json — both output-byte glyph readings are measured from the artifact, including the count of non-whitespace glyphs outside every measured write box."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, documents: [DOCUMENT_ID],
    officialForm: DOCUMENT_ID, sourceSha256: source.sha256, custodyRoot: source.custodyRoot,
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    routeSelectionsMade: 0,
    requiredBeforeFiling: rbf.length,
    boundaryOnlyRequiredBeforeFiling: boundaryOnlyRbf.length,
    participantElections: maps.reduce((n, m) => n + m.selectionControls.filter((c) => c.disposition === "participant_election").length, 0),
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
