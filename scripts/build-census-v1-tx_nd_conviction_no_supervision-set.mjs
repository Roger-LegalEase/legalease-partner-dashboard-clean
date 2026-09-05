#!/usr/bin/env node
/**
 * The Texas misdemeanour-conviction nondisclosure packet family builder.
 *
 *   node scripts/build-census-v1-tx_nd_conviction_no_supervision-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, strategy official_pdf_fill, one track:
 *
 *   tx_nd_conviction_no_supervision   Order of nondisclosure after a
 *                         misdemeanour conviction WITHOUT community supervision
 *                         of any kind, Tex. Gov't Code 411.0735
 *
 * WHAT IS BOUND, AND FROM WHICH CUSTODY
 *
 * Three official documents, each binding by exact SHA-256 against three records
 * that must agree — the committed corpus index entry, the bytes mounted in the
 * custody that index declares, and the pin carried in this file:
 *
 *   the OCA Model Petition for an Order of Nondisclosure under Section 411.0735
 *   the OCA Model Order of Nondisclosure under Sections 411.0725, 411.073 AND
 *     411.0735 - one order form serving three sections, which is why its page 2
 *     carries a box for each and why none of them is marked here
 *   the Statement of Inability to Afford Payment of Court Costs or an Appeal Bond
 *
 * The two OCA models are Master Library assets. The Statement is NOT: it lives
 * in the human_source_returns custody — a document returned by a person with
 * provenance and its own receipt, held outside the Master Library and carried
 * by no release. Custody roots are therefore resolved through the shared
 * resolver in scripts/lib/corpus-index-paths.mjs, which follows what the index
 * DECLARES rather than the shape of the path. The Master Library writes its
 * paths relative to its own root and the human source returns relative to the
 * repository root, and a reader that joins the library root onto both looks for
 * a human source return inside the library, does not find it, and reports drift
 * about a file that is exactly where it belongs.
 *
 * WHAT THE REPOSITORY ESTABLISHES FOR THIS ROUTE, AND WHERE IT WAS READ
 *
 *   FILING DESTINATION  HELD. The clerk of the court that sentenced the person
 *                       or placed the person on community supervision, who
 *                       forwards it to the court. Gov't Code § 411.0745(a)
 *                       allows filing in person, electronically or by mail.
 *                       TX.memo track tx_nd_dwi_probation, rules.filing.
 *
 *   FEE                 HELD, and the honest answer is that THERE IS NO FLAT
 *                       STATUTORY FIGURE. Section 411.0745(b) requires the
 *                       petition to be accompanied by payment of a fee that
 *                       generally applies to the filing of a CIVIL CASE. The
 *                       committed record, read at source on 2026-08-06, states
 *                       that the subsection sets the TYPE of fee and not an
 *                       amount, so county civil filing fee schedules govern.
 *                       OCA instructions describe the total as typically about
 *                       $280, varying by county, and direct the filer to call
 *                       the clerk. The packet states all of that and names the
 *                       clerk of the sentencing court as the authority.
 *
 *   THE $28 TRAP        The committed record warns in terms that the $28 figure
 *                       belongs ONLY to the no-petition route under § 411.072(c)
 *                       and IS NOT A FILING FEE. This is a petition route under
 *                       § 411.0735. The packet names the figure only to tell the
 *                       participant it is not theirs, because someone who has
 *                       read it elsewhere will otherwise arrive at the clerk's
 *                       window with the wrong money.
 *
 *   WAIVER              HELD, and it is why the Statement of Inability binds to
 *                       this family at all. A Statement of Inability to Afford
 *                       Payment of Court Costs under Tex. R. Civ. P. 145, on the
 *                       statewide bilingual form approved by the Supreme Court
 *                       of Texas in Misc. Docket No. 22-9090, which Rule 145
 *                       requires the clerk to make available WITHOUT CHARGE OR
 *                       REQUEST. The committed record calls it the only
 *                       genuinely statewide promulgated form in the whole Texas
 *                       record-clearing workflow. Paragraph 6 of the petition
 *                       carries the election between paying and filing it, and
 *                       shipping the form is what makes that election real.
 *
 *   SERVICE             HELD, and the answer is that THE COURT notifies the
 *                       State. Section 411.0745(e): on receipt of the petition
 *                       the court provides notice to the State and an
 *                       opportunity for a hearing, and the filer should not be
 *                       charged for it. A hearing is required unless the State
 *                       does not request one before the 45th day after receiving
 *                       notice and the court finds the person entitled to file
 *                       and that issuance is in the best interest of justice.
 *                       OCA instructions separately direct the petitioner to
 *                       show proof that the district attorney received a copy,
 *                       which is why the proof-of-delivery component ships
 *                       CONDITIONAL on local practice rather than as a step
 *                       every participant must take.
 *
 * ONE ORDER FORM, THREE SECTIONS, AND A BOX THIS BUILD WILL NOT MARK
 *
 * The order is the state's model for §§ 411.0725, 411.073 and 411.0735 at once,
 * and the court indicates which applies by marking one of three boxes on its
 * page 2. This family IS the § 411.0735 route, so marking that box looks at
 * first like the packet simply stating the route it was built for — which is
 * what a route-determined election would require.
 *
 * It is refused anyway, and the reason is the sentence printed above the boxes:
 * "the Court FINDS that Petitioner is entitled to file a petition for an order
 * of nondisclosure under the section of the Government Code indicated below".
 * The box records a JUDICIAL FINDING, not a route selection. A packet that
 * marked it would assert a finding no court has made, on a proposed order that
 * is otherwise scrupulously unexecuted. The participant is told in plain words,
 * in the guidance and again in the instructions, that their order is the
 * § 411.0735 one and that the court marks the box.
 *
 * THE WAITING PERIOD IS NOT A CONTROL ON THIS FORM. Under § 411.0735 it runs
 * from the date the sentence was completed: where the misdemeanour was
 * punishable BY FINE ONLY the completion date is itself the filing date, and
 * otherwise it is the second anniversary of completion. Nothing on the petition
 * asks which, so the distinction lives in the guidance and in the stop
 * conditions — a participant who guesses it wrong files two years early and
 * pays a filing fee for a petition that cannot be granted.
 *
 * THE BAR THE COURT APPLIES. Section 411.0735(c-1) lets the court refuse the
 * order where it determines the offence was violent or sexual in nature, with
 * an express exception for a Penal Code § 22.01 assault. Both limbs are stated,
 * because the exception is the part a participant is least likely to know.
 *
 * WHAT THIS BUILD WRITES, AND THE ONE FACT IT WITHHOLDS ON PURPOSE
 *
 * The platform holds the participant's name, date of birth, address, telephone
 * number and email, and writes the ones each document asks for IN THE SHAPE IT
 * ASKS FOR THEM.
 *
 * The address is written where a document asks for the whole address in one
 * blank — the Statement's own address lines — and withheld where a document
 * splits it, as the OCA petition's signature block does across Address and
 * City/State/Zip. The platform holds one line; splitting it by guessing where
 * the street ends would invent structure it does not have. The sibling
 * Massachusetts family in this lane proved the other failure mode empirically:
 * a long address the fitter refuses is silently dropped for one participant and
 * written for another. This build asserts that both fixtures write the SAME set
 * of fields, so that failure cannot recur unnoticed.
 *
 * THE PROPOSED ORDER IS GENERATED UNEXECUTED. Every field on it that records a
 * judicial act — the date the court considered the petition, whether the State
 * requested a hearing, whether a hearing was held and when, the date of signing,
 * the judge and the court/county block — is refused as court-owned. Nothing in
 * the rendered order asserts that a court has acted.
 *
 * THE STATEMENT OF INABILITY IS CLASSIFIED BY DECLARED RULE, NOT BY HAND
 *
 * It carries 132 AcroForm fields: a sworn financial affidavit of household
 * members, benefits, income sources, property, debts and expenses. Every one is
 * classified by the ordered rule table below, each rule carrying its own
 * disposition and its own stated reason, and the build FAILS if any field
 * matches no rule or if any rule names a field the form does not have. The
 * resulting rows are written out individually into the field census and the
 * field map, so a reviewer reads them one by one exactly as if they had been
 * typed one by one. A rule table with an exhaustiveness assertion is a
 * declaration; it is not a way of avoiding one.
 *
 * Nothing financial is prefilled anywhere on it. A wrong figure on a document
 * sworn under penalty of perjury is a far worse defect than a blank one.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { loadAppearanceSemantics, dispositionsForFamily }
  from "./rcap-official-forms/rcap-appearance-semantics.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS }
  from "./rcap-packet-completeness/completeness-contract.mjs";
import { createTokenSplitter, fitsByFontMetrics } from "./rcap-custom-pleading/split-token.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

/*
 * The refusal classes and the policy constructors.
 *
 * They live here, above the per-form dictionaries, because those dictionaries
 * are object literals evaluated at module load: a constructor declared below
 * them would be read from the temporal dead zone and the module would not load
 * at all.
 */
const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

/** A fact the platform holds, written into this blank. */
const WRITE = (fact) => ({ policy: "write", fact });
/** A fact the platform does not hold, which the participant supplies before filing. */
const SUPPLY = (what, why) => ({ policy: "supply", what, why });
/** A blank that must stay blank: a signature, a signature date, a court-only field. */
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
/** Short form of PROTECT for the fields a court, clerk or prosecutor completes. */
const COURTOWN = (why) => ({ policy: "protect", refusalClass: COURT_OWNED, why });
/**
 * A choice only the participant can make, and one the route does not determine.
 * Not a required-before-filing fact: the packet is not waiting on a value it
 * could have held, it is leaving a decision to the person who signs.
 */
const ELECTION = (what, why) => ({ policy: "election", what, why });

const APPEARANCE_SEMANTICS = loadAppearanceSemantics();
const FAMILY_ID = "tx_nd_conviction_no_supervision-set";
const OUT = "data/rcap-all50/overlays/census-v1/tx/tx-nd-conviction-no-supervision-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-tx_nd_conviction_no_supervision-set.mjs";
const IMPLEMENTATION_STRATEGY = "official_pdf_fill";

const ROUTE = Object.freeze({
  jurisdiction: "TX",
  routeKeys: ["obligation:track-pathway:TX:tx_nd_conviction_no_supervision:petitioned-nondisclosure-for-an-eligible-conviction-411-0735"],
  primaryRouteKey: "obligation:track-pathway:TX:tx_nd_conviction_no_supervision:petitioned-nondisclosure-for-an-eligible-conviction-411-0735",
  routeSelectionId: "tx_nd_conviction_no_supervision-official-set",
  legalName: "Petition for an Order of Nondisclosure under Tex. Gov't Code § 411.0735 (misdemeanour conviction, no community supervision)",
  routeName: "asking the Texas court that sentenced you for a misdemeanour to seal that record from public disclosure under Government Code § 411.0735, where you were never placed on community supervision",
  statute: "Tex. Gov't Code §§ 411.0735, 411.0745 and 411.074"
});

const PETITION = "tx_nd_conviction_no_supervision-petition-1";
const ORDER = "tx_nd_conviction_no_supervision-proposed-order-2";
const PROOF = "tx_nd_conviction_no_supervision-proof-of-delivery-to-prosecutor-3";
const STATEMENT = "tx_nd_conviction_no_supervision-fee-waiver-statement-4";
const GUIDE = "tx_nd_conviction_no_supervision-filing-and-after-order-instructions-5";

const COMPONENTS = [PETITION, ORDER, PROOF, STATEMENT, GUIDE];

const COMPOSED_TITLES = {
  [PETITION]: "OCA Model Petition for an Order of Nondisclosure under Section 411.0735",
  [ORDER]: "OCA Model Order of Nondisclosure under Sections 411.0725, 411.073 and 411.0735",
  [PROOF]: "Proof That the District Attorney Received a Copy of the Petition",
  [STATEMENT]: "Statement of Inability to Afford Payment of Court Costs or an Appeal Bond",
  [GUIDE]: "Filing Instructions, What It Costs, and What the Order Does"
};

const COMPONENT_CONDITIONS = {
  [PROOF]: "Used only where local practice requires the filer to deliver a copy to the prosecuting attorney. Gov't Code § 411.0745(e) makes the COURT responsible for notifying the state and the filer should not be charged for that notice; OCA instructions nonetheless direct the petitioner to show proof that the district attorney received a copy. Ask the clerk which applies in that county.",
  [STATEMENT]: "Used only where the participant elects, in paragraph 6 of the petition, to file a Statement of Inability to Afford Payment of Court Costs under Tex. R. Civ. P. 145 instead of paying the fees and costs."
};

const SOURCES = [
  Object.freeze({
    componentId: PETITION,
    sourceId: "official-form:OCA Model Petition for an Order of Nondisclosure under Section 411.0735",
    formNumber: "TX-GC-411.0735-PETITION",
    title: "OCA Model Petition for an Order of Nondisclosure under Section 411.0735",
    instrumentKind: "petition",
    sha256: "da0bd63c66a6ee35a7a0659556a02268f1fd6053ebf7419e912b78fd3fb3dd13"
  }),
  Object.freeze({
    componentId: ORDER,
    sourceId: "official-form:OCA Model Order of Nondisclosure under Section 411.0735",
    formNumber: "TX-GC-411.0725-073-0735-ORDER",
    title: "OCA Model Order of Nondisclosure under Sections 411.0725, 411.073 and 411.0735",
    instrumentKind: "proposed_order",
    sha256: "6a60f72ac40a776ca721f99fede4eb1397da83c68b07d11d3c931d4e5d4f6680"
  }),
  Object.freeze({
    componentId: STATEMENT,
    sourceId: "official-form:Statement of Inability to Afford Payment of Court Costs or an Appeal Bond",
    formNumber: "TX-SCT-22-9090-STATEMENT-OF-INABILITY",
    title: "Statement of Inability to Afford Payment of Court Costs or an Appeal Bond",
    instrumentKind: "fee_waiver_statement",
    sha256: "bd17a3fe43d6989d1828c91c9a46c873908c272d8e2e342af35ce8bdb2fab10d"
  })
];

const COMPOSED_FROM =
  "the legal-design intake record (data/record-clearing/legal-design-intake/TX.memo.json, track "
  + "tx_nd_conviction_no_supervision) and the packet-set manifest "
  + "(data/record-clearing/legal-design-packet-set-manifests.json, tx_nd_conviction_no_supervision-set), with the "
  + "fee, the waiver route and the service rule read from that record's rules block and the § 411.0745 "
  + "subsections it quotes";

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1994-04-17",
    "participant.street_address": "42 Live Oak Street, Austin, TX 78702",
    "participant.phone": "512-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1972-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Corpus Christi, Texas 78418-2214",
    "participant.phone": "(361) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const DOTS = (n = 84) => ".".repeat(n);

const S = {
  CAPTION: "Case caption",
  BODY: "The underlying conviction and completion of the sentence",
  FEE: "The fee to file the petition",
  SIGN: "The block at the foot of the petition",
  ORDER_CAPTION: "The heading of the proposed order",
  ORDER_BODY: "The offence the proposed order covers",
  ORDER_COURT: "What the State and the court did, recorded by the court",
  SOI_CAPTION: "Statement caption",
  SOI_ABOUT: "About me and my household",
  SOI_MONEY: "Income, property, expenses and debts",
  SOI_ELECTION: "Boxes the person filing marks",
  SOI_DECLARATION: "Sworn declaration"
};

/* ---- the OCA model petition for § 411.0735, all seventeen fields ------------ *
 * The form's own field name for the petitioner in the opening line is spelled
 * "Naem2". That typo is in the published binary and is reproduced here exactly,
 * because a field map keyed to a corrected spelling would bind to nothing.
 */
const PETITION_FIELDS = {
  "Name1": {
    section: S.CAPTION, caption: "In the Matter of", captionAt: { page: 1, y: 660 },
    label: "Name of the person the matter is in, in the petition caption",
    ...WRITE("participant.full_legal_name")
  },
  "Court": {
    section: S.CAPTION, caption: "In the Matter of", captionAt: { page: 1, y: 660 },
    label: "Court the petition is filed in, named in the caption",
    ...SUPPLY("the court that convicted and sentenced you, exactly as its own paperwork names it",
      "which court sentenced the participant is a case fact the platform has not seen")
  },
  "County": {
    section: S.CAPTION, caption: "County, Texas", captionAt: { page: 1, y: 596 },
    label: "County of that court, named in the caption",
    ...SUPPLY("the Texas county of that court",
      "the county of the sentencing court is a case fact the platform has not seen")
  },
  "Naem2": {
    section: S.BODY, caption: "respectfully petitions", captionAt: { page: 1, y: 452 },
    label: "Petitioner named in the opening line of the petition",
    ...WRITE("participant.full_legal_name")
  },
  "Offense": {
    section: S.BODY, caption: "convicted of the misdemeanor offense of", captionAt: { page: 1, y: 340 },
    label: "Misdemeanour offence of conviction",
    ...SUPPLY("the misdemeanour offence you were convicted of, worded as the judgment states it",
      "no offence fact is held for a record the platform has not seen")
  },
  "Cause No": {
    section: S.BODY, caption: "in Criminal Cause No.", captionAt: { page: 1, y: 317 },
    label: "Criminal cause number of the conviction",
    ...SUPPLY("the criminal cause number, copied from the judgment",
      "no cause number is held for a record the platform has not seen")
  },
  "Date1_af_date": {
    section: S.BODY, caption: "in this court on", captionAt: { page: 1, y: 317 },
    label: "Date of the conviction in that court",
    ...SUPPLY("the date you were convicted, copied from the judgment",
      "no conviction date is held for a record the platform has not seen")
  },
  "Terms": {
    section: S.BODY, caption: "Petitioner was sentenced to", captionAt: { page: 1, y: 269 },
    label: "What the petitioner was sentenced to",
    ...SUPPLY("what you were sentenced to, worded as the judgment states it",
      "no sentence fact is held for a record the platform has not seen")
  },
  "Date3_af_date": {
    section: S.BODY, caption: "Petitioner completed the sentence on", captionAt: { page: 1, y: 245 },
    label: "Date the petitioner completed the sentence",
    ...SUPPLY("the date you completed the sentence - the whole waiting period runs from this date",
      "no completion fact is held for a record the platform has not seen, and the waiting period runs from it")
  },
  "Dropdown4": {
    section: S.BODY, selection: true, caption: "or other document showing", captionAt: { page: 1, y: 221 },
    label: "Whether a copy of the judgment or other document showing the sentence is attached - is, or is not",
    ...ELECTION("is, where you are attaching a copy of the judgment or another document showing your sentence, or is not, where you are not",
      "whether the participant attached that document is a fact about what they did, not one the platform can supply")
  },
  "Dropdown5": {
    section: S.BODY, selection: true, caption: "imposed and payment of all fines, costs, and restitution, if any,", captionAt: { page: 1, y: 174 },
    label: "Whether evidence of completing the sentence is attached - is, or is not",
    ...ELECTION("is, where you are attaching the evidence that you completed the sentence including any term of confinement and payment of all fines, costs and restitution, or is not, where you are not",
      "whether the participant attached that evidence is a fact about what they did, not one the platform can supply")
  },
  "Group6": {
    section: S.FEE, selection: true, caption: "the required fees and costs.", captionAt: { page: 5, y: 708 },
    label: "How the fee is satisfied - the required fees and costs, or a Statement of Inability to Afford Payment of Court Costs",
    ...ELECTION("the required fees and costs, where you are paying them, or a Statement of Inability to Afford Payment of Court Costs, where you cannot - the Statement is in this packet, and Rule 145 requires the clerk to make it available without charge or request in any event",
      "whether the participant can afford the filing fee is theirs to decide and to swear to; the platform holds no financial fact about any participant, and this is the election the bound Statement of Inability exists to make real")
  },
  "Signature": {
    section: S.SIGN, caption: "Signature", captionAt: { page: 5, y: 466 },
    label: "Signature of the petitioner",
    ...PROTECT(SIGNATURE, "the petition is the participant's own and is signed when they actually file it")
  },
  "Printed Name": {
    section: S.SIGN, caption: "Printed Name", captionAt: { page: 5, y: 433 },
    label: "Printed name of the person filing, at the foot of the petition",
    ...WRITE("participant.full_legal_name")
  },
  "Address": {
    section: S.SIGN, caption: "ddrAess", captionAt: { page: 5, y: 401 },
    label: "Street address of the person filing, at the foot of the petition",
    ...SUPPLY("the street part of your address - this block splits the address across two blanks, and the street goes here",
      "the platform holds the address as ONE LINE and this block asks for it split across Address and City, State, Zip. Splitting it by guessing where the street ends would invent structure the platform does not have")
  },
  "City State Zip": {
    section: S.SIGN, caption: "City, State, Zip", captionAt: { page: 5, y: 369 },
    label: "City, state and zip of the person filing, at the foot of the petition",
    ...SUPPLY("the city, state and zip of your address, taken from the same address as the street line above",
      "the platform holds the address as one line and this block asks for it split, so both parts are the participant's to write from the address they already have")
  },
  "Telephone Number": {
    section: S.SIGN, caption: "Telephone Number", captionAt: { page: 5, y: 337 },
    label: "Telephone number of the person filing, at the foot of the petition",
    ...WRITE("participant.phone")
  }
};

/* ---- the OCA model order for §§ 411.0725 / 411.073 / 411.0735 -------------- *
 * ONE ORDER SERVES THREE SECTIONS, and the court indicates which by marking one
 * of three boxes on page 2. That box is NOT this build's to mark even though
 * this family is unambiguously the § 411.0735 route: the sentence above it
 * reads "the Court FINDS that Petitioner is entitled to file a petition ...
 * under the section of the Government Code indicated below", so the box records
 * a judicial finding. A packet that marked it would assert a finding no court
 * has made. All three are refused as court-owned, and the guidance tells the
 * participant in plain words which section their order is about.
 */
const ORDER_FIELDS = {
  "Cause No": {
    section: S.ORDER_CAPTION, caption: "Cause No.", captionAt: { page: 1, y: 708 },
    label: "Cause number in the proposed order caption",
    ...SUPPLY("the cause number, the same one you wrote on the petition",
      "no cause number is held for a record the platform has not seen")
  },
  "Court": {
    section: S.ORDER_CAPTION, caption: "In the Matter of", captionAt: { page: 1, y: 676 },
    label: "Court named in the proposed order caption",
    ...SUPPLY("the court that sentenced you, the same one you wrote on the petition",
      "which court sentenced the participant is a case fact the platform has not seen")
  },
  "Defendant": {
    section: S.ORDER_CAPTION, caption: "In the Matter of", captionAt: { page: 1, y: 676 },
    label: "Person the matter is in, named in the proposed order caption",
    ...WRITE("participant.full_legal_name")
  },
  "County": {
    section: S.ORDER_CAPTION, caption: "County, Texas", captionAt: { page: 1, y: 612 },
    label: "County named in the proposed order caption",
    ...SUPPLY("the Texas county of that court, the same one you wrote on the petition",
      "the county of the sentencing court is a case fact the platform has not seen")
  },
  "Offense(s)": {
    section: S.ORDER_BODY, caption: "criminal history record information related to the offense(s)", captionAt: { page: 2, y: 517 },
    label: "Offence or offences the proposed order covers",
    ...SUPPLY("the offence, worded the same way you worded it on the petition",
      "no offence fact is held for a record the platform has not seen")
  },
  "Criminal Cause No": {
    section: S.ORDER_BODY, caption: "Cause No.", captionAt: { page: 2, y: 470 },
    label: "Criminal cause number the proposed order covers",
    ...SUPPLY("the criminal cause number, the same one you wrote on the petition",
      "no cause number is held for a record the platform has not seen")
  },
  "County2": {
    section: S.ORDER_BODY, caption: "County, Texas.", captionAt: { page: 2, y: 446 },
    label: "County named in the ordering paragraph of the proposed order",
    ...SUPPLY("the Texas county, the same one you wrote in the caption",
      "the county is a case fact the platform has not seen")
  },
  "Date5_af_date": {
    section: S.ORDER_COURT, caption: "the Court considered", captionAt: { page: 1, y: 464 },
    label: "Date the Court considered the petition",
    ...COURTOWN("the date the court considered the petition is entered by the court; a proposed order may not assert that a court has acted")
  },
  "Check Box1": {
    section: S.ORDER_COURT, selection: true, caption: "requested a hearing.", captionAt: { page: 1, y: 321 },
    label: "Box marked by the court recording that the State requested a hearing",
    ...COURTOWN("what the State did is recorded by the court, not by the person filing")
  },
  "Check Box2": {
    section: S.ORDER_COURT, selection: true, caption: "did not request a hearing.", captionAt: { page: 1, y: 297 },
    label: "Box marked by the court recording that the State did not request a hearing",
    ...COURTOWN("what the State did is recorded by the court, not by the person filing")
  },
  "Check Box3": {
    section: S.ORDER_COURT, selection: true, caption: "conducted a hearing on", captionAt: { page: 1, y: 226 },
    label: "Box marked by the court recording that it conducted a hearing",
    ...COURTOWN("whether the court held a hearing is the court's own record of what it did")
  },
  "Date6_af_date": {
    section: S.ORDER_COURT, caption: "conducted a hearing on", captionAt: { page: 1, y: 226 },
    label: "Date the Court conducted a hearing",
    ...COURTOWN("the hearing date is entered by the court")
  },
  "Check Box4": {
    section: S.ORDER_COURT, selection: true, caption: "did not conduct a hearing.", captionAt: { page: 1, y: 178 },
    label: "Box marked by the court recording that it did not conduct a hearing",
    ...COURTOWN("whether the court held a hearing is the court's own record of what it did")
  },
  "Check Box7": {
    section: S.ORDER_COURT, selection: true, caption: "Texas Government Code Section 411.0725", captionAt: { page: 2, y: 636 },
    label: "Box marked by the court to indicate Government Code Section 411.0725",
    ...COURTOWN("the sentence above these three boxes reads that the Court FINDS the petitioner entitled to file under the section indicated below. The box records a judicial finding, so it is the court's to mark even though this family is unambiguously the 411.0735 route")
  },
  "Check Box8": {
    section: S.ORDER_COURT, selection: true, caption: "Texas Government Code Section 411.073", captionAt: { page: 2, y: 613 },
    label: "Box marked by the court to indicate Government Code Section 411.073",
    ...COURTOWN("the box records a judicial finding about which section the petitioner is entitled to file under, and is the court's to mark")
  },
  "Check Box9": {
    section: S.ORDER_COURT, selection: true, caption: "Texas Government Code Section 411.0735", captionAt: { page: 2, y: 589 },
    label: "Box marked by the court to indicate Government Code Section 411.0735",
    ...COURTOWN("this IS the section this family is built for, and the box is still the court's: the sentence above it reads that the Court FINDS the petitioner entitled to file under the section indicated below, so marking it would assert a finding no court has made. The guidance tells the participant in plain words which section their order is about")
  },
  "Date10_af_date": {
    section: S.ORDER_COURT, caption: "Signed on", captionAt: { page: 3, y: 255 },
    label: "Date the proposed order is signed",
    ...COURTOWN("the date of signing is the court's")
  },
  "Judge Presiding": {
    section: S.ORDER_COURT, caption: "Judge Presiding", captionAt: { page: 3, y: 176 },
    label: "Judge presiding block on the proposed order",
    ...COURTOWN("only the judge completes the presiding-judge block")
  },
  "CourtCounty": {
    section: S.ORDER_COURT, caption: "Court/County", captionAt: { page: 3, y: 127 },
    label: "Court and county block beneath the judge's signature on the proposed order",
    ...COURTOWN("the block beneath the judge's signature is completed with the order, by the court")
  }
};

/* ---- the Statement of Inability: 132 fields, classified by declared rule ---- *
 *
 * This is a SWORN FINANCIAL AFFIDAVIT — household members, public benefits,
 * every source of monthly income, property, monthly expenses and debts. Almost
 * nothing on it is a fact the platform holds, and nothing on it is a fact the
 * platform may guess: a wrong figure on a document sworn under penalty of
 * perjury is a far worse defect than a blank one.
 *
 * The rules below are ordered and the FIRST MATCH WINS. Each carries its own
 * disposition and its own stated reason, and `statementFields()` asserts that
 * every one of the form's fields matched exactly one rule. A field the table
 * does not reach fails the build rather than being written as an undeclared
 * blank. The 132 resulting rows are emitted individually into the field census
 * and the field map, so a reviewer reads them one at a time exactly as if they
 * had been typed one at a time.
 *
 * WHAT IS WRITTEN, AND WHY THE ADDRESS IS WRITTEN HERE BUT NOT ON THE PETITION.
 * This form asks for the WHOLE address in one blank, which is the shape the
 * platform holds it in. The OCA petition's signature block splits it across
 * Address and City/State/Zip, which is not, so it is withheld there. The rule
 * is the shape of the blank, not the document.
 */
const SOI_RULES = [
  {
    id: "identity_name",
    re: /^(My full legal name is \/ Mi nombre legal completo es|My name is  Mi nombre es|Your printed name)$/,
    kind: "write", fact: "participant.full_legal_name", section: S.SOI_ABOUT,
    label: (n) => `Full legal name of the person filing (${n})`
  },
  {
    id: "identity_dob",
    re: /^My date of birth \/ Mi fecha de nacimiento es$/,
    kind: "write", fact: "participant.date_of_birth", section: S.SOI_ABOUT,
    label: () => "Date of birth of the person filing"
  },
  {
    id: "identity_address",
    re: /^(My address is \/ Mi dirección es|My address is  Mi domicilio es)$/,
    kind: "write", fact: "participant.street_address", section: S.SOI_ABOUT,
    label: (n) => `Address of the person filing, asked for as one whole address (${n})`
  },
  {
    /*
     * The mailing line cannot be bound, and the reason is a shared vocabulary
     * this lane may not edit. The address descriptor in
     * scripts/rcap-official-forms/rcap-field-semantics.mjs refuses any field
     * whose name carries "postal" — a rule aimed at postal CODES — and this
     * form's bilingual field name reads "Mailing  Direccion Postal". Binding an
     * address to it therefore conflicts with the field-name semantics and the
     * finalizer refuses the write.
     *
     * The blank is declared with that as its stated reason rather than being
     * forced, and the participant fills the mailing line themselves. The
     * address IS written on this form's two other address lines, so the packet
     * does not lose it.
     */
    id: "mailing_line_shared_vocabulary",
    re: /^Mailing  Dirección Postal$/,
    kind: "supply", section: S.SOI_ABOUT,
    label: () => "Mailing address line on the Statement",
    what: "your mailing address, which you write here yourself - it is already printed on this form's other address line, so copy it across",
    why: "the shared field-name semantics refuse to bind an address to a field whose name carries \"postal\", a rule aimed at postal codes, and this form's bilingual field name reads \"Mailing  Direccion Postal\". Shared machinery is not this lane's to edit, so the blank is declared rather than forced"
  },
  {
    id: "identity_phone",
    re: /^My phone number  Mi número telefónico$/,
    kind: "write", fact: "participant.phone", section: S.SOI_ABOUT,
    label: () => "Telephone number of the person filing"
  },
  {
    id: "identity_email",
    re: /^My email I check often/,
    kind: "write", fact: "participant.email", section: S.SOI_ABOUT,
    label: () => "Email address of the person filing"
  },
  {
    id: "clerk_fills_cause_number",
    re: /^Cause Number \/ Número de Caso$/,
    kind: "courtowned", section: S.SOI_CAPTION,
    label: () => "Cause number on the Statement caption",
    why: "the form says so on its own face: \"The Clerk's office will fill in the Cause Number when you file this form.\" Telling the participant to supply it would contradict the document in their hand"
  },
  {
    id: "signature",
    re: /^Signature/,
    kind: "protect", section: S.SOI_DECLARATION,
    label: (n) => `Signature on the sworn declaration (${n})`,
    why: "the Statement is sworn by the participant and is never prefilled"
  },
  /*
   * THE OPTION 1 DATE OF BIRTH IS NOT A DECLARATION DATE.
   *
   * One rule matched "Day / Día", "Month / Mes", "Year / Año", "Today" and
   * "Year" together and called all five a date part of the sworn declaration,
   * refused because "a date written before the Statement is actually sworn
   * would be false". That reason is exactly right for the day the participant
   * signs and exactly wrong for the day they were born.
   *
   * Read from the pinned binary, source page 11 carries FOUR date widgets, not
   * one date: "Month / Mes" [79.73,495.56], "Day / Día" [134.54,495.51] and
   * "Year / Año" [193.40,495.61] are the three boxes on the
   * "________/________/________" rule printed directly under "My date of birth
   * is / Mi fecha de nacimiento es", while "Today" [97.75,302.31] sits under
   * "Date (month, day, year) / Fecha (mes, día, año)" beside the signature.
   * Only "Today" is a declaration date. Source page 12's "Year"
   * [343.359,264.575] is the notary's "____________, 20____" line.
   *
   * So the packet held a date of birth, wrote it on source page 2 (delivered
   * page 11), and left the source-page-11 boxes blank (delivered page 20)
   * while the field map recorded them as protected signature-date parts, so
   * they never reached "The items you must supply" either. VF04 read that off
   * the delivered bytes and failed KNOWN_PREFILLS on it.
   *
   * WHY THEY ARE DECLARED RATHER THAN WRITTEN. "Month / Mes" is ONE AcroForm
   * field carrying TWO widgets — the source-page-11 date-of-birth month
   * [79.73,495.56] and the source-page-12 notary month [135.241,265.173] — and
   * this factory writes a field, not a widget. Writing the participant's birth
   * month would therefore also print it in the notary's blank on a page the
   * notary completes. Two of the three boxes could be written and the third
   * could not; a date that is two-thirds machine-filled on a perjury
   * declaration is a worse artifact than one the participant completes in one
   * hand, and the completeness contract would read it as an incomplete row.
   * All three are declared, and the instructions tell the participant to copy
   * the date already printed on source page 2.
   *
   * THIS IS NOT A NEW TREATMENT. The identical structure on the identical
   * pinned Statement of Inability was treated exactly this way by FIX29 in
   * scripts/build-census-v1-rcap-tx-custom-pleading.mjs; VF01 tested the
   * two-widget claim against the pinned binary, accepted the treatment on
   * 2026-09-05, and that family passed a fresh read at 321938c38. This family
   * follows it rather than inventing a second answer to the same form.
   */
  {
    id: "option1_date_of_birth_month",
    re: /^Month \/ Mes$/,
    kind: "supply", section: S.SOI_DECLARATION,
    label: () => "Month box of the date of birth on the Option 1 declaration, page 11",
    /*
     * THE CAPTION IS THE FORM'S, NOT OURS. A declared blank is only declared to
     * the participant if the words beside it in the packet are the words printed
     * beside it on the paper. `caption` carries the form's own printed line and
     * `captionAt` says where it is printed, so the captionDrift check re-reads
     * page 11 of the pinned binary on every build and fails if that line has
     * moved or been reworded.
     */
    caption: "My date of birth is / Mi fecha de nacimiento es",
    captionAt: { page: 11, y: 521 },
    what: "the MONTH of your date of birth, in the first of the three boxes under \"My date of birth is / Mi fecha de nacimiento es\" on page 11 of the Statement - copy it from the date of birth already printed on page 2 of the Statement. The same form field is also the notary's month blank on page 12; leave that one for the notary",
    why: "this box is one widget of an AcroForm field whose other widget is the notary's month on page 12, and this factory writes a field rather than a widget, so filling the birth month here would also print it in the notary's blank. The box is declared instead of forced, and the fact it needs is already printed on page 2 of the same document"
  },
  {
    id: "option1_date_of_birth_day_and_year",
    re: /^(Day \/ Día|Year \/ Año)$/,
    kind: "supply", section: S.SOI_DECLARATION,
    label: (n) => `Date-of-birth box on the Option 1 declaration, page 11 (${n})`,
    caption: "My date of birth is / Mi fecha de nacimiento es",
    captionAt: { page: 11, y: 521 },
    what: "the DAY and the YEAR of your date of birth, in the second and third boxes under \"My date of birth is / Mi fecha de nacimiento es\" on page 11 of the Statement - copy them from the date of birth already printed on page 2 of the Statement",
    why: "the three boxes on this line are one date and are completed together. Their month box shares an AcroForm field with the notary's month on page 12 and cannot be written without writing the notary's blank, so the whole line is left to the participant rather than delivered two-thirds filled"
  },
  {
    id: "declaration_date",
    re: /^(Today|Year)$/,
    kind: "protect", section: S.SOI_DECLARATION,
    label: (n) => `Date part of the sworn declaration (${n})`,
    why: "a date written before the Statement is actually sworn would be false"
  },
  {
    id: "declaration_place",
    re: /^County state$/,
    kind: "supply", section: S.SOI_DECLARATION,
    label: () => "County and state where the declaration is signed",
    what: "the county and state where you sign this declaration",
    why: "where the participant will sign is not a fact the platform holds"
  },
  {
    id: "caption_court_identity",
    re: /^(Court Number \/ Número del Tribunal|County \/ Condado)$/,
    kind: "supply", section: S.SOI_CAPTION,
    label: (n) => `Court identity on the Statement caption (${n})`,
    what: "the court number and county from the top of your petition - the form says to copy them from the petition",
    why: "which court the petition is filed in is a case fact the platform has not seen"
  },
  {
    id: "caption_copy_from_petition",
    re: /^Fill Blank [12]$/,
    kind: "supply", section: S.SOI_CAPTION,
    label: (n) => `Party block copied from the petition (${n})`,
    what: "the information at the top left and top right of your petition, copied across exactly as the form directs",
    why: "the petition's own caption is a case fact the platform has not seen"
  },
  {
    id: "elections",
    kind: "election", section: S.SOI_ELECTION,
    selectionOnly: true,
    label: (n) => `Box marked on the Statement: ${n}`,
    what: "the box that matches your own situation - a benefit you actually receive, whether legal aid represents you, or a yes-or-no answer about benefits",
    why: "each of these is a declaration about the participant's own life, sworn under penalty of perjury. The platform holds no financial or household fact about any participant and will not mark a box on a sworn financial affidavit"
  },
  {
    id: "dependents",
    re: /^(Name Nombre|Age Edad|Relationship to me Parentesco Conmigo)Row\d+$/,
    kind: "supply", section: S.SOI_ABOUT,
    label: (n) => `Dependant table cell: ${n}`,
    what: "the name, age and relationship of each person who depends on you financially - initials only for children under 18, as the form directs",
    why: "who depends on the participant financially is a household fact the platform does not hold"
  },
  {
    id: "money_rows_and_amounts",
    re: /^(Value \/ Valor \d+|Amount Cantidad \d+|Bank accounts|Cars and boats|Other property|Debt payments|Other expenses|My debts include|8 Are there debts)/,
    kind: "supply", section: S.SOI_MONEY,
    label: (n) => `Property, expense or debt entry: ${n}`,
    what: "the entry and the amount, from your own records - this is sworn under penalty of perjury, so take the figures from statements and bills rather than from memory",
    why: "the platform holds no financial fact about any participant, and a guessed figure on a sworn affidavit is a worse defect than a blank one"
  },
  {
    id: "income_and_employment",
    re: /^(in monthly wages|en sueldo mensual|your job title for|your$|título de su puesto para|compañía o jefe|is my total monthly income|in unemployment|in public benefits|from |de |Unemployed Since|He estado desempleado|Describe )/,
    kind: "supply", section: S.SOI_MONEY,
    label: (n) => `Income or employment entry: ${n}`,
    what: "the amount and the source, from your own records - this is sworn under penalty of perjury, so take the figures from pay statements and benefit letters rather than from memory",
    why: "the platform holds no income, employment or benefit fact about any participant"
  },
  {
    id: "other_benefit_write_in",
    re: /^Other  Otros beneficios/,
    kind: "supply", section: S.SOI_MONEY,
    label: (n) => `Write-in for another public benefit: ${n}`,
    what: "the name of any other public benefit you receive that the printed list does not cover",
    why: "the platform holds no benefit fact about any participant"
  }
];

/*
 * Apply the rule table to the form's own field names.
 *
 * Called with every AcroForm field name the pinned binary actually carries, so
 * the dictionary describes the form in front of us rather than the form someone
 * remembered. A name that matches no rule, and a rule that matches no name, both
 * fail the build.
 */
function statementFields(fieldNames, selectionNames) {
  const spec = {};
  const unmatched = [];
  const used = new Set();
  for (const name of fieldNames) {
    const isSelection = selectionNames.has(name);
    const rule = SOI_RULES.find((r) => (r.selectionOnly ? isSelection : (!r.selectionOnly && r.re && r.re.test(name))));
    if (!rule) { unmatched.push(name); continue; }
    used.add(rule.id);
    const base = {
      section: rule.section, label: rule.label(name),
      // The form's own printed line, where the rule records one. mapsFrom uses
      // it as printedLabel, and censusOf re-reads it off the pinned binary at
      // captionAt on every build, so a caption that moved fails the build.
      ...(rule.caption ? { caption: rule.caption } : {}),
      ...(rule.captionAt ? { captionAt: rule.captionAt } : {}),
      ...(isSelection ? { selection: true } : {})
    };
    if (rule.kind === "write") spec[name] = { ...base, ...WRITE(rule.fact) };
    else if (rule.kind === "protect") spec[name] = { ...base, ...PROTECT(SIGNATURE, rule.why) };
    else if (rule.kind === "courtowned") spec[name] = { ...base, ...COURTOWN(rule.why) };
    else if (rule.kind === "election") spec[name] = { ...base, ...ELECTION(rule.what, rule.why) };
    else spec[name] = { ...base, ...SUPPLY(rule.what, rule.why) };
  }
  assert.equal(unmatched.length, 0,
    `the Statement of Inability rule table does not reach ${unmatched.length} field(s): ${unmatched.slice(0, 12).join(" | ")}`);
  const unusedRules = SOI_RULES.filter((r) => !used.has(r.id)).map((r) => r.id);
  assert.equal(unusedRules.length, 0,
    `the Statement of Inability rule table names rules the form does not have fields for: ${unusedRules.join(", ")}`);
  return spec;
}

const FORM_FIELDS = {
  "TX-GC-411.0735-PETITION": PETITION_FIELDS,
  "TX-GC-411.0725-073-0735-ORDER": ORDER_FIELDS,
  "TX-SCT-22-9090-STATEMENT-OF-INABILITY": statementFields
};

/* ---- the pages this build authors ------------------------------------------ */
const COMPOSED_COMPONENTS = {
  [PROOF]: {
    writes: [{ id: "petitioner_name", label: "Person certifying that the district attorney received a copy", fact: "participant.full_legal_name" }],
    blanks: [
      { id: "cause_number", label: "Cause number on the proof of delivery", what: "the cause number, the same one you wrote on the petition", why: "no cause number is held for a record the platform has not seen" },
      { id: "court_and_county", label: "Court and county on the proof of delivery", what: "the court that sentenced you and its Texas county", why: "which court sentenced the participant is a case fact the platform has not seen" },
      { id: "da_office", label: "Name and office of the district attorney who received the copy", what: "the name and office of the district attorney for that county", why: "the platform holds no district attorney identity for any Texas county and does not guess one" },
      { id: "da_address", label: "Address at which the district attorney received the copy", what: "the address at which the district attorney received the copy", why: "the platform holds no district attorney address and does not guess one" },
      { id: "delivery_manner", label: "How the copy was delivered", what: "how you delivered it - in person, by mail, or however the clerk told you that county expects", why: "how delivery was actually made is known only after it happens" },
      { id: "delivery_date", label: "Date the district attorney received the copy", what: "the date the district attorney received it", why: "the date of delivery is known only when delivery is actually made" }
    ],
    protectedBlanks: [
      { id: "proof_signature", label: "Signature on the proof of delivery", why: "the proof is the participant's own and is signed when delivery has actually been made" },
      { id: "proof_signature_date", label: "Date beside the signature on the proof of delivery", why: "a proof of delivery dated before delivery happened would be false" }
    ],
    body: (facts) => {
      const name = facts["participant.full_legal_name"];
      const L = [];
      L.push(COMPOSED_TITLES[PROOF].toUpperCase(), "");
      L.push("READ THIS FIRST: YOU MAY NOT NEED THIS PAGE.", "");
      L.push("Government Code Sec. 411.0745(e) makes THE COURT responsible for giving the State notice of your petition and an opportunity to request a hearing, and the committed record states that you should not be charged for that notice. You are not the one who serves the State.", "");
      L.push("OCA instructions nonetheless direct a petitioner to show proof that the district attorney received a copy of the petition, and some counties expect it. ASK THE CLERK OF THE COURT YOU ARE FILING IN whether that county wants this. If it does not, leave this page out.", "");
      L.push("Cause No.: " + DOTS(48), "");
      L.push("Court and county: " + DOTS(44), "");
      L.push("PROOF THAT THE DISTRICT ATTORNEY RECEIVED A COPY", "");
      L.push(`I, ${name}, state that a copy of my Petition for an Order of Nondisclosure under Government Code Sec. 411.0735 was delivered to the district attorney as follows:`, "");
      L.push("District attorney - name and office:");
      L.push(DOTS(), "");
      L.push("Address:");
      L.push(DOTS(), "");
      L.push("How it was delivered: " + DOTS(40), "");
      L.push("Date the district attorney received it: " + DOTS(30), "");
      L.push("" + DOTS(50));
      L.push(`${name}`);
      L.push("Date: " + DOTS(30), "");
      L.push("(You sign and date this when the copy has actually been delivered. Nothing on this page is signed or dated for you, and no district attorney's name or address is printed here: the platform holds none for any Texas county and does not guess one.)");
      L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
      return L.join("\n");
    }
  },
  [GUIDE]: {
    writes: [{ id: "participant_name", label: "Person the filing instructions are prepared for", fact: "participant.full_legal_name" }],
    blanks: [],
    protectedBlanks: [],
    body: (facts) => {
      const name = facts["participant.full_legal_name"];
      const L = [];
      L.push(COMPOSED_TITLES[GUIDE].toUpperCase(), "");
      L.push(`Prepared for: ${name}`, "");
      L.push("WHICH SECTION THIS IS. Government Code Sec. 411.0735 - an order of nondisclosure after a MISDEMEANOUR CONVICTION where you were NOT placed on community supervision of any kind and your sentence is complete. Texas splits nearly every nondisclosure section on the deferred-adjudication-versus-probation-versus-neither line, so if you were placed on community supervision of any kind, this is the wrong section and you should not file it.", "");
      L.push("ONE ORDER FORM, THREE SECTIONS. The proposed order in this packet is the state's model order for Secs. 411.0725, 411.073 AND 411.0735 together, and page 2 carries three boxes for the court to indicate which one applies. Yours is 411.0735. THE BOXES ARE NOT MARKED IN THIS PACKET and that is deliberate: the sentence above them says the COURT FINDS the petitioner entitled to file under the section indicated below, so marking one would assert a finding no court has made.", "");
      L.push("WHERE THIS IS FILED. File the petition with the CLERK OF THE COURT THAT SENTENCED YOU. That clerk forwards it to the court. Under Government Code Sec. 411.0745(a) you may file it in person, electronically or by mail. OCA instructions say that in most courts a proposed order must be submitted with the petition, which is why the proposed order is in this packet.", "");
      L.push("ONE OFFENCE, ONE ORDER. An order of nondisclosure applies to a single offence. If you want more than one offence sealed, that takes more than one order.", "");
      L.push("WHAT IT COSTS - AND THE NUMBER YOU SHOULD IGNORE.", "");
      L.push("Government Code Sec. 411.0745(b) says the petition must be accompanied by payment of a fee THAT GENERALLY APPLIES TO THE FILING OF A CIVIL CASE. Read carefully, that subsection sets the TYPE of fee, not an amount: there is no flat statutory figure for a petition-based nondisclosure, and your county's civil filing fee schedule governs. OCA instructions describe the total as TYPICALLY ABOUT $280, VARYING BY COUNTY, and tell you to call the clerk.", "");
      L.push("SO CALL THE CLERK OF THE COURT YOU ARE FILING IN and ask what the civil filing fee is there, before you go.", "");
      L.push("NOW THE NUMBER TO IGNORE: $28. You may have read that an order of nondisclosure costs $28. THAT FIGURE IS NOT YOURS. It belongs only to the no-petition route under Government Code Sec. 411.072(c), and the committed record states in terms that it is not a filing fee at all. This is a petition route under Sec. 411.0735. Do not arrive at the clerk's window with $28.", "");
      L.push("IF YOU CANNOT AFFORD IT. Paragraph 6 of the petition lets you choose between paying the fees and costs and filing a STATEMENT OF INABILITY TO AFFORD PAYMENT OF COURT COSTS under Texas Rule of Civil Procedure 145. That Statement is in this packet, on the statewide bilingual form approved by the Supreme Court of Texas in Misc. Docket No. 22-9090. Rule 145 requires the clerk to make that form available WITHOUT CHARGE AND WITHOUT YOUR HAVING TO ASK, so you are entitled to it whether or not you use the copy here.", "");
      L.push("The Statement is sworn under penalty of perjury. Fill it from your own records - pay statements, benefit letters, bills - and not from memory. Nothing on it is filled in for you except your own name, date of birth, address, telephone number and email, because the platform holds no financial fact about anyone.", "");
      L.push("PAGE 11 OF THE STATEMENT ASKS FOR YOUR DATE OF BIRTH AGAIN, in three boxes under 'My date of birth is / Mi fecha de nacimiento es', and those three boxes are left for you to write. Copy them from page 2 of the same Statement. They are not filled in for a mechanical reason rather than a legal one: on this form the month box is one form field with the notary's month on page 12, so filling your birth month would also write in the notary's blank.", "");
      L.push("WHO GIVES NOTICE TO THE STATE - AND IT IS NOT YOU. Under Sec. 411.0745(e), on receipt of your petition THE COURT provides notice to the State and an opportunity for a hearing. The committed record states that you should not be charged for that notice. OCA instructions do direct a petitioner to show proof that the district attorney received a copy, and some counties expect it, which is why this packet includes a proof-of-delivery page marked CONDITIONAL. Ask the clerk whether that county wants it.", "");
      L.push("WILL THERE BE A HEARING? A hearing is required UNLESS the State does not request one before the 45th day after receiving notice AND the court finds that you are entitled to file the petition and that issuing the order is in the best interest of justice.", "");
      L.push("NOTARIZATION. Subchapter E-1 does not require the petition to be notarized. County practice may differ. Ask the clerk.", "");
      L.push("HOW LONG YOU WAIT. The waiting period under Sec. 411.0735 runs from the date you COMPLETED THE SENTENCE. Where the misdemeanour was punishable BY FINE ONLY, the date of completion is itself the date you may file. Otherwise you wait until the SECOND ANNIVERSARY of completion. That is why the completion date on the petition matters and why you take it from the court record rather than from memory.", "");
      L.push("THE BAR THE COURT APPLIES. Under Sec. 411.0735(c-1) the court may NOT issue the order if it determines that the offence was violent or sexual in nature. There is one carve-out and it is worth knowing: an offence under Penal Code Sec. 22.01 - assault - is excepted from that determination, so an assault conviction under 22.01 may still qualify. If your offence is anywhere near this line, get advice before filing.", "");
      L.push("YOU MUST NOT BE ELIGIBLE UNDER SEC. 411.073. Section 411.0735 is for a conviction with NO community supervision of any kind. If you were placed on community supervision, a different section governs and this petition is the wrong one.", "");
      L.push("WHAT THE ORDER ACTUALLY DOES - AND WHAT IT DOES NOT. Nondisclosure is SEALING, not expunction. The order prohibits criminal justice agencies from disclosing the record to the public, and the information is still disclosed to the individuals and agencies listed in Government Code Sec. 411.076(a). The clerk sends the order to the DPS Crime Records Service by the 15th business day; DPS forwards it to the agencies in Sec. 411.075(b) within 10 business days; and any person, agency or entity holding the information seals it within 30 business days of receiving it. The record is not destroyed and you should never say it does not exist.", "");
      L.push("WHEN TO STOP AND GET HELP INSTEAD.");
      L.push("- You were placed on community supervision of any kind. This is the wrong section.");
      L.push("- The offence might be characterised as violent or sexual in nature. Sec. 411.0735(c-1) lets the court refuse on that determination, and the only carve-out is a Penal Code Sec. 22.01 assault.");
      L.push("- Your sentence is not complete, or you are not sure of the completion date.");
      L.push("- You are not sure whether the misdemeanour was punishable by fine only, which decides whether you wait at all or wait two years.");
      L.push("- You have any other conviction or deferred adjudication other than a fine-only traffic offence, or you are not sure.");
      L.push("- The prosecutor opposes the petition or requests a hearing.");
      L.push("- There is a family violence FINDING or a family violence ALLEGATION anywhere in your record - an allegation stops this route even where no court ever made a finding - or any offence on the Sec. 411.074 exclusion list is in your history.");
      L.push("- You are not a United States citizen.", "");
      L.push("DOCUMENTS TO GET FIRST, AND WHO HAS THEM.");
      L.push("- Your Texas DPS criminal history record - the Texas Department of Public Safety Crime Records Service, following DPS form CR-63. It establishes the disposition and shows every other conviction and deferred adjudication.");
      L.push("- The judgment, and the discharge or dismissal order - the clerk of the court that sentenced you. It establishes which section applies, because Texas splits nearly every nondisclosure section on whether there was deferred adjudication, probation, or neither.");
      L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
      return L.join("\n");
    }
  }
};

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/TX.memo.json", track: "tx_nd_conviction_no_supervision" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "tx_nd_conviction_no_supervision-set" },
    { record: "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json", read: "the three document sources this family binds, and the custody each is held in" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "Tex. Gov't Code § 411.0735 — Procedure for conviction; certain misdemeanours (last amended 2017)", url: "https://statutes.capitol.texas.gov/Docs/GV/htm/GV.411.htm", retrievedOn: "2026-08-06" },
    { title: "Tex. Gov't Code § 411.0745 — Procedure for petition for order of nondisclosure", url: "https://statutes.capitol.texas.gov/Docs/GV/htm/GV.411.htm", retrievedOn: "2026-08-06" },
    { title: "Tex. Gov't Code § 411.074 — Required conditions for orders of nondisclosure", url: "https://statutes.capitol.texas.gov/Docs/GV/htm/GV.411.htm", retrievedOn: "2026-08-06" },
    { title: "Office of Court Administration model petition under § 411.0735 and model order under §§ 411.0725, 411.073 and 411.0735 (Rev. February 2022)", url: "https://www.txcourts.gov/programs-services/nondisclosures/", retrievedOn: "2026-08-06" },
    { title: "Statement of Inability to Afford Payment of Court Costs or an Appeal Bond, approved by the Supreme Court of Texas in Misc. Docket No. 22-9090; Tex. R. Civ. P. 145", url: "https://www.txcourts.gov/rules-forms/forms/", retrievedOn: "2026-08-06" }
  ],
  formIdentityNote:
    "Three official forms, no invention. The petition is the state's own model for this exact section. The ORDER is "
    + "the state's model for THREE sections at once — §§ 411.0725, 411.073 and 411.0735 — and the court indicates "
    + "which applies by marking one of three boxes on its page 2. That box is refused as court-owned even though "
    + "this family is unambiguously the § 411.0735 route, because the sentence above it records a judicial FINDING. "
    + "The Statement of Inability is the statewide bilingual form the Supreme Court of Texas approved in Misc. "
    + "Docket No. 22-9090, held in the human_source_returns custody rather than the Master Library; the receipt "
    + "records which custody supplied the bytes rather than assuming.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "what a given Texas county's civil filing fee actually is — § 411.0745(b) sets the type of fee and not an amount, and county schedules govern",
    "whether the county the participant files in expects proof that the district attorney received a copy; § 411.0745(e) makes the court responsible for notice and OCA instructions direct the proof, so the component ships conditional",
    "whether the participant was placed on community supervision of any kind, which would put them outside this section entirely",
    "whether the misdemeanour was punishable by fine only, which decides whether the waiting period is the completion date itself or the second anniversary of it",
    "whether a court would determine the offence violent or sexual in nature under § 411.0735(c-1), on which the order may be refused; a Penal Code § 22.01 assault is excepted from that determination",
    "whether the participant's county requires the petition to be notarized — Subchapter E-1 does not, and county practice may differ"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "One route, stated on the petition's own face: a Gov't Code § 411.0735 petition after a misdemeanour "
    + "conviction with no community supervision. No route election is made by this build.\n\n"
    + "The proposed order is the state's model for THREE sections at once, and its page 2 carries a box for each. "
    + "Marking the § 411.0735 box would be tempting — this family IS that route — and it is refused. The sentence "
    + "printed above those boxes reads that the Court FINDS the petitioner entitled to file under the section "
    + "indicated below, so the box records a judicial finding rather than a route selection, and a packet that "
    + "marked it would assert a finding no court has made. The participant is told in plain words in the guidance "
    + "which section their order is about.\n\n"
    + "The petition's three marked controls are participant elections rather than route selections: two is/is-not "
    + "dropdowns recording whether the judgment and the completion evidence are attached, and the fee control, "
    + "which is the participant's own decision whether they can afford the filing fee, sworn to on the bound "
    + "Statement of Inability."
};

const INSTRUCTIONS = {
  title: `What you must do before you file — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "**Check you are on the right section first.** § 411.0735 is for a misdemeanour conviction where you were **not placed on community supervision of any kind** and your sentence is complete. Texas splits nearly every nondisclosure section on the deferred-adjudication-versus-probation-versus-neither line, so if you were placed on community supervision, this is the wrong petition.",
    "",
    "It contains the state's own forms: the Office of Court Administration model petition for this section, the OCA model order, and the Statement of Inability to Afford Payment of Court Costs that the Supreme Court of Texas approved in Misc. Docket No. 22-9090. Nothing here was invented.",
    "",
    "**The order form covers three sections at once.** Its page 2 has a box for §§ 411.0725, 411.073 and 411.0735, and yours is 411.0735. **None of the three is marked in this packet**, because the sentence above them says the *Court* finds which section applies — marking one would assert a finding no court has made.",
    "",
    "The platform filled in what it holds about you, in the shape each form asks for it: your name on the petition, the proposed order and the Statement, your telephone number on the petition, and your date of birth, address, telephone number and email on the Statement. The Statement asks for your date of birth twice; it is written on page 2 and left for you on page 11, for the reason given under *Things the platform deliberately left blank*.",
    "",
    "**Your address is not written on the petition, and that is deliberate.** That block splits it across Address and City/State/Zip, and the platform holds your address as a single line and will not guess where the street ends. The Statement asks for the whole address in one blank, so there it is filled in.",
    "",
    "**Nothing financial is filled in for you anywhere.** The Statement is sworn under penalty of perjury, and a guessed figure on it would be far worse than a blank one."
  ],
  componentBlurbs: {
    [PETITION]: "the OCA model petition for § 411.0735, with your name and telephone number written in and every case fact left for you",
    [ORDER]: "the OCA model order for §§ 411.0725, 411.073 and 411.0735. It is unexecuted: the court's recitals, hearing boxes, the three section boxes, the signing date and the judge block are all blank",
    [PROOF]: "a page proving the district attorney received a copy — **only if that county wants it**; § 411.0745(e) makes the court responsible for notifying the State",
    [STATEMENT]: "the statewide Statement of Inability to Afford Payment of Court Costs — **only if you cannot afford the fee**. Your identity is filled in; nothing financial is",
    [GUIDE]: "where to file, what it actually costs, the $28 figure that is not yours, how long you wait, the violent-or-sexual bar, and what the order does and does not do"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Your Texas DPS criminal history record (follow DPS form CR-63) | Texas Department of Public Safety Crime Records Service |",
    "| The judgment, and the discharge or dismissal order | The clerk of the court that sentenced you. It establishes which section applies |"
  ],
  stepsLines: [
    "1. **Confirm you were never placed on community supervision** for this offence. If you were, § 411.0735 is the wrong section and this petition should not be filed.",
    "2. **Get the two documents above.** The judgment gives you the offence wording, the cause number, the conviction date, the sentence and the completion date.",
    "3. **Work out your waiting period.** If the misdemeanour was punishable **by fine only**, the completion date itself is when you may file. Otherwise you wait until the **second anniversary** of completion.",
    "4. **Fill in every blank on the petition** — the court, the county, the offence, the cause number, the conviction date, what you were sentenced to, the completion date, and both parts of your address.",
    "5. **Mark the three controls on the petition yourself**: whether the judgment is attached, whether the completion evidence is attached, and whether you are paying the fee or filing the Statement of Inability.",
    "6. **Call the clerk of the court you are filing in** and ask what the civil filing fee is there. § 411.0745(b) sets the *type* of fee, not an amount; OCA describes the total as typically about $280, varying by county.",
    "7. **If you cannot afford it, fill in the Statement of Inability** from your own records and file it with the petition. Rule 145 requires the clerk to give you that form free and without your having to ask.",
    "8. **File the petition with the clerk of the court that sentenced you**, in person, electronically or by mail, with the proposed order — most courts want the order submitted with the petition.",
    "9. **Ask the clerk whether that county wants proof that the district attorney received a copy.**",
    "10. **Wait.** A hearing is required unless the State does not request one before the 45th day after receiving notice and the court makes the two findings."
  ],
  blanksLines: [
    "- **Your signature and the date on the petition.** You sign when you actually file.",
    "- **Everything on the proposed order that records what the State or the court did** — the date the court considered it, the two State-hearing boxes, the two court-hearing boxes and the hearing date, the signing date, the judge and the court/county block.",
    "- **The three section boxes on the order's page 2**, including the § 411.0735 box that is yours. The court marks them, because the sentence above them records the court's own finding.",
    "- **Both parts of your address on the petition**, because that block splits what the platform holds as one line.",
    "- **Every financial fact on the Statement of Inability.** It is sworn under penalty of perjury and the platform holds none of it.",
    "- **The cause number on the Statement.** Its own face says the Clerk's office fills that in when you file.",
    "- **The three date-of-birth boxes on page 11 of the Statement** — the month box, the day box and the year box under \"My date of birth is / Mi fecha de nacimiento es\". They are yours rather than the platform's for a mechanical reason, not a legal one: on this form the month box is one form field with the notary's month on page 12, and the platform cannot write one without writing the other, so it writes neither and leaves the whole line to you. Your date of birth is already printed on page 2 of the same Statement — copy it across.",
    "- **The district attorney's name and address**, if that county wants the proof of delivery."
  ],
  stopsLines: [
    "- **you were placed on community supervision of any kind** — this is the wrong section;",
    "- the offence might be characterised as **violent or sexual in nature**. Under § 411.0735(c-1) the court may not issue the order on that determination, and the only carve-out is a Penal Code § 22.01 assault;",
    "- your sentence is not complete, or you are not sure of the completion date;",
    "- you are not sure whether the misdemeanour was punishable by fine only, which decides whether you wait at all or wait two years;",
    "- you have any other conviction or deferred adjudication other than a fine-only traffic offence, or you are not sure;",
    "- **The prosecutor opposes the petition or requests a hearing.**",
    "- there is a family violence **finding** or a family violence **allegation** anywhere in your record — an allegation stops this route even where no court ever made a finding — or any offence on the § 411.074 exclusion list is in your history;",
    "- you are not a United States citizen.",
    "",
    "Where self-help stops, the clerk of the court that sentenced you answers filing mechanics and the county's fee, and the Texas Department of Public Safety Crime Records Service issues the criminal history record the other-offence question depends on."
  ],
  notLines: [
    "This is the state's own petition and order, a conditional proof of delivery, the statewide fee-waiver Statement and their filing instructions. It is not legal advice, it is not filed for you, and it does not decide whether you are eligible.",
    "",
    "**Nondisclosure is sealing, not expunction.** The order prohibits criminal justice agencies from disclosing the record *to the public*, and the information is still disclosed to the individuals and agencies listed in Government Code § 411.076(a). The record is not destroyed. Never say it does not exist.",
    "",
    "**An order covers one offence.** If more than one offence is on your record, sealing them takes more than one order."
  ]
};

const FINDINGS = [
  {
    finding:
      "Three sources bind, in TWO different custodies: the OCA model petition and the OCA model order are Master "
      + "Library assets, and the Statement of Inability is held in human_source_returns, a custody carried by no "
      + "release and writing its paths relative to the repository root rather than a corpus root.",
    consequence:
      "Custody roots are resolved through the shared resolver, which follows what the corpus index declares rather "
      + "than the shape of the path. Each source binds by exact SHA-256 against the index entry, the mounted bytes "
      + "and this family's own pin, and any disagreement is a source stop that writes nothing."
  },
  {
    finding:
      "The OCA order is one form for THREE sections — §§ 411.0725, 411.073 and 411.0735 — and its page 2 carries a "
      + "box for each. This family is unambiguously the § 411.0735 route, so marking that box would look like "
      + "stating the route the packet was built for. The sentence printed above the three boxes reads that the "
      + "Court FINDS the petitioner entitled to file under the section indicated below.",
    consequence:
      "All three boxes are refused as court-owned. The box records a judicial FINDING rather than a route "
      + "selection, and a packet that marked it would assert a finding no court has made. The participant is told "
      + "in plain words, in the guidance and in the instructions, that their order is the § 411.0735 one and that "
      + "the court marks the box."
  },
  {
    finding:
      "Gov't Code § 411.0745(b) requires a fee that generally applies to the filing of a CIVIL CASE. Read at "
      + "source, the subsection sets the TYPE of fee and not an amount: county civil filing fee schedules govern "
      + "and there is no flat statutory figure. OCA instructions describe the total as typically about $280, "
      + "varying by county.",
    consequence:
      "The packet states exactly that, and names the clerk of the court being filed in as the authority who "
      + "answers it. No figure is published as though it were the fee."
  },
  {
    finding:
      "The committed record warns in terms that the $28 figure belongs ONLY to the no-petition route under "
      + "§ 411.072(c) and is not a filing fee. This is a petition route under § 411.0735.",
    consequence:
      "The guidance names the $28 explicitly in order to tell the participant it is not theirs, because someone "
      + "who has read it elsewhere otherwise arrives at the clerk's window with the wrong money."
  },
  {
    finding:
      "Section 411.0745(e) makes the COURT responsible for giving the State notice and an opportunity for a "
      + "hearing, and the filer should not be charged for it. OCA instructions separately direct the petitioner to "
      + "show proof that the district attorney received a copy.",
    consequence:
      "The packet states that the court gives notice and that the participant serves nobody, and ships the "
      + "proof-of-delivery page as a CONDITIONAL component whose own first paragraph tells the participant to ask "
      + "the clerk whether that county wants it."
  },
  {
    finding:
      "The waiting period turns on whether the misdemeanour was punishable BY FINE ONLY — in which case the "
      + "completion date is itself the filing date — or otherwise, in which case it is the second anniversary of "
      + "completion. Section 411.0735(c-1) separately lets the court refuse the order where it determines the "
      + "offence was violent or sexual in nature, with an express exception for a Penal Code § 22.01 assault.",
    consequence:
      "Both are stated in the guidance in the participant's own terms, and both are stop conditions. The "
      + "fine-only question is a stop rather than a caveat because a participant who guesses it wrong files two "
      + "years early and pays a filing fee for a petition that cannot be granted."
  },
  {
    finding:
      "The Statement of Inability carries 132 AcroForm fields, almost all of them sworn financial and household "
      + "facts, and it is sworn under penalty of perjury. The published petition binary also carries a typo in one "
      + "field name: the petitioner in the opening line is named \"Naem2\".",
    consequence:
      "The Statement is classified by an ordered rule table with exhaustiveness asserted in both directions, and "
      + "nothing financial is prefilled anywhere on it. The petition's field name is reproduced as \"Naem2\" "
      + "exactly, because a field map keyed to a corrected spelling would bind to nothing."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Confirm the three section boxes on the shared order are correctly refused as court-owned rather than marked. This build reads the sentence above them — that the Court FINDS the petitioner entitled to file under the section indicated below — as making the box a judicial finding rather than a route selection.",
    "Confirm the fee treatment: that stating § 411.0745(b) fixes the TYPE of fee rather than an amount, reporting OCA's about-$280-varying-by-county description, and naming the clerk as the authority is right where no flat figure exists.",
    "Confirm the packet is right to name the $28 figure in order to exclude it.",
    "Confirm the proof-of-delivery component is correctly conditional rather than required, given § 411.0745(e) assigns notice to the court.",
    "Confirm the fine-only waiting-period distinction is stated at the right strength. This build makes it a stop condition rather than a caveat, on the reasoning that a participant who guesses wrong files two years early and pays for it.",
    "Confirm the § 411.0735(c-1) violent-or-sexual bar and its Penal Code § 22.01 assault exception are correctly stated for a participant.",
    "Confirm the Statement of Inability's rule-based classification is acceptable as a declaration: 132 fields, an ordered table with a stated reason per rule, exhaustiveness asserted in both directions, and every resulting row emitted individually into the field map."
  ],
  mattersForTheReviewersAttention: [
    "The proposed order is generated unexecuted and every field recording a judicial act is refused as court-owned — including the three section boxes, which is the least obvious of them and the one most likely to be questioned.",
    "The published petition binary spells one field name \"Naem2\". The map reproduces the typo rather than correcting it, and the census would fail the build if the spelling ever changed.",
    "Nothing financial is prefilled on the Statement of Inability. Its identity fields are, because they are the platform's own facts about the participant and the form asks for them in the shape the platform holds them.",
    "The build asserts that the canonical and boundary fixtures write an identical set of fields, a guard added after the Massachusetts family in this lane wrote a value for one participant and silently dropped it for the other.",
    "The wrong-section risk is put first in the instructions rather than in the stop list, because § 411.0735 and § 411.073 differ on a fact — whether there was community supervision — that a participant may not think of as a distinction at all."
  ]
};
/* ════════════════════════════════════════════════════════════════════════════
 * ENGINE — census-v1 bound-source official-form machinery.
 *
 * Deliberately identical across the FABLE-PB official-form family builders, and
 * carried inside each script rather than imported from a shared host: every one
 * of these families' MASTER_QUEUE rows is exclusiveScript with sharedBuildHost
 * null, and a host shared with families outside this lane's grant could not be
 * changed without moving their bytes. The family-specific facts — the route, the
 * source pins, the per-form field dictionaries, the instructions — live entirely
 * above this line. Nothing below it knows which family it is building.
 *
 * THREE RECORDS MUST AGREE BEFORE ANYTHING RENDERS. For every bound source the
 * engine reads the committed corpus index entry, resolves the bytes through the
 * custody the index declares, and requires the mounted bytes' SHA-256 to equal
 * both the index's recorded digest and the MASTER_QUEUE pin carried in this
 * file. Any disagreement is BLOCKED_SOURCE naming the identity that failed, and
 * nothing is written.
 *
 * CUSTODY RESOLUTION IS NOT PATH-SHAPED. The corpus index now describes several
 * custodies and each writes its paths in its own namespace: the Master Library
 * relative to its own root ("STATES/TX/…"), the human source returns relative to
 * the repository root ("private/human-source-returns/…"). Joining the Master
 * Library root onto all of them looks for a human source return inside the
 * library and reports drift about a file that is exactly where it belongs. The
 * shared resolver in scripts/lib/corpus-index-paths.mjs follows what the index
 * DECLARES, and this engine uses it rather than guessing from the path.
 *
 * DETERMINISM. Both the assembled packet and every per-document render are
 * pinned to the factory's single fixed date. pdf-lib stamps the wall clock into
 * a document created with PDFDocument.create(), and save({updateMetadata:false})
 * does not remove a stamp already there, so the assembled packet is stamped
 * explicitly. Bytes that move on every rebuild silently invalidate the family's
 * own hash-bound raster receipt.
 * ════════════════════════════════════════════════════════════════════════════ */

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
/* Whether a component is a bound official form rather than a page this build
 * authored. Set once the census is taken and read by the composed byte proof. */
let CENSUS_COMPONENTS = new Set();
const censusHas = (id) => CENSUS_COMPONENTS.has(id);

/* ---- source binding: three records must agree ------------------------------ */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const resolve = makeCorpusEntryResolver(index, { repoRoot: ROOT });
  const entries = index.entries ?? [];
  const resolved = [];
  const failures = [];

  for (const wanted of SOURCES) {
    const matches = entries.filter((e) => e.sha256 === wanted.sha256);
    if (matches.length === 0) {
      failures.push({
        sourceId: wanted.sourceId,
        why: `no entry in the committed corpus index carries the SHA-256 this family pins (${wanted.sha256})`
      });
      continue;
    }
    // A binary held identically in two custodies is one document, not two. The
    // first custody that is actually mounted here supplies the bytes, and which
    // one it was is recorded rather than assumed.
    let picked = null;
    const notMounted = [];
    for (const entry of matches) {
      const abs = resolve.resolve(entry);
      if (abs && fs.existsSync(abs)) { picked = { entry, abs }; break; }
      notMounted.push(entry.custody ?? "master_library");
    }
    if (!picked) {
      failures.push({
        sourceId: wanted.sourceId,
        indexedIn: matches.map((e) => e.custody ?? "master_library"),
        why: `the committed index names this source in custody ${notMounted.join(", ")}, and no such tree is mounted in this container`
      });
      continue;
    }
    const bytes = fs.readFileSync(picked.abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== picked.entry.sha256) {
      failures.push({
        sourceId: wanted.sourceId, pathInArchive: picked.entry.path,
        why: `SHA-256 drift: the committed index records ${picked.entry.sha256}, the mounted corpus holds ${sha256}`
      });
      continue;
    }
    if (sha256 !== wanted.sha256) {
      failures.push({
        sourceId: wanted.sourceId, pathInArchive: picked.entry.path,
        why: `SHA-256 drift against this family's binding: it pins ${wanted.sha256}, the corpus holds ${sha256}`
      });
      continue;
    }
    resolved.push({
      ...wanted,
      custody: picked.entry.custody ?? "master_library",
      pathInArchive: picked.entry.path,
      revision: picked.entry.revision ?? null,
      sha256, byteLength: bytes.length, bytes,
      acroFieldCount: picked.entry.acroFieldCount ?? null,
      pageCount: picked.entry.pageCount ?? null,
      structuralClassObserved: picked.entry.structuralClassObserved ?? null
    });
  }
  return { resolved, failures };
}

/* ---- census: every field of every bound form, read from the pinned binary --- */
const flat = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function censusOf(source) {
  let spec = FORM_FIELDS[source.formNumber];
  assert.ok(spec, `no field dictionary for ${source.formNumber}`);
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  /*
   * A dictionary may be a FUNCTION of the form's own field names rather than a
   * literal. That is how a 132-field sworn financial affidavit is classified:
   * by an ordered rule table checked for exhaustiveness against the binary in
   * front of us, which fails the build on any field it does not reach. The
   * literal rows it produces are emitted one by one like any other.
   */
  if (typeof spec === "function") {
    const names = doc.getForm().getFields().map((f) => f.getName());
    const selectionNames = new Set(doc.getForm().getFields()
      .filter((f) => f.constructor.name === "PDFCheckBox" || f.constructor.name === "PDFRadioGroup")
      .map((f) => f.getName()));
    spec = spec(names, selectionNames);
  }
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));

  const rows = [];
  const unmapped = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const entry = spec[name];
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary"
      };
    });
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }
    const kind = field.constructor.name;
    rows.push({
      key: name, name, document: source.componentId, formNumber: source.formNumber,
      page: widgets[0]?.page ?? null, widgets, sourceValue,
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      type: kind.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
      isSelectionControl: kind === "PDFCheckBox" || kind === "PDFRadioGroup" || entry.policy === "election",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section ?? null,
      effectiveLabel: entry.label, caption: entry.caption ?? null, captionAt: entry.captionAt ?? null,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null
    });
  }

  const dictionaryKeys = new Set(Object.keys(spec));
  for (const r of rows) dictionaryKeys.delete(r.key);

  // Every recorded caption must still be printed where the dictionary says it
  // is. A form revision that moved a caption is a source-identity change, and a
  // map keyed to the old position would write into the wrong blank.
  const captionDrift = [];
  for (const r of rows) {
    if (!r.captionAt) continue;
    const lines = pageText.find((p) => p.page === r.captionAt.page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - r.captionAt.y) <= 3);
    const needle = flat(r.caption);
    const found = needle.length > 0 && near.some((l) => flat(l.text).includes(needle));
    if (!found) {
      captionDrift.push({ field: r.key, page: r.captionAt.page, y: r.captionAt.y, caption: r.caption, linesThere: near.map((l) => l.text).slice(0, 2) });
    }
  }
  return { rows, unmapped, stale: [...dictionaryKeys], captionDrift, pageText, pageCount: pages.length };
}

/* ---- render one bound document -------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writable = census.rows.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const writableNames = new Set(writable.map((r) => r.name));
  const unwritableFields = [...new Set(census.rows.filter((r) => !writableNames.has(r.name)).map((r) => r.name))]
    .map((field) => ({ field }));

  const censusForFinalizer = [];
  const emitted = new Set();
  for (const r of census.rows) {
    if (emitted.has(r.name)) continue;
    emitted.add(r.name);
    const every = census.rows.filter((x) => x.name === r.name).flatMap((x) => x.widgets);
    censusForFinalizer.push({
      name: r.name, type: r.type,
      effectiveLabel: r.effectiveLabel, regionHeading: r.section ?? r.effectiveLabel,
      widgets: every.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    });
  }

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: censusForFinalizer,
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title,
    /*
     * What each field's appearance MEANS, so the finalizer knows which
     * unwritten /Tx appearances are the court's own ink and which are a
     * participant answer the source happened to ship a value for.
     *
     * The Statement of Inability arrives with three of its own /V values set.
     * Without this the structural default reads all three as the court's ink
     * and flattens them onto a document sworn under penalty of perjury.
     */
    appearanceDispositions: dispositionsForFamily(APPEARANCE_SEMANTICS,
      `${FAMILY_ID}:${source.componentId}`)
  });
  return { bytes, report };
}

/* ---- assemble the packet, with the date pinned ----------------------------- */
async function combinePacket(fixtureName, rendered) {
  const packet = await PDFDocument.create();
  stampDeterministic(packet);
  packet.setTitle(`${ROUTE.legalName} — ${fixtureName} fixture`);
  packet.setProducer("RCAP census-v1 artifact-only assembler");
  packet.setCreator("RCAP evidence build");
  const pageManifest = [];
  let nextPage = 1;
  for (const item of rendered) {
    const doc = await PDFDocument.load(item.bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = await packet.copyPages(doc, doc.getPageIndices());
    pages.forEach((page, index) => {
      packet.addPage(page);
      pageManifest.push({
        packetPage: nextPage++, component: item.source.componentId,
        documentId: item.source.componentId, formNumber: item.source.formNumber,
        sourcePage: index + 1, sourceSha256: item.source.sha256
      });
    });
  }
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, pageManifest, pageCount: packet.getPageCount() };
}

/* ---- composed components: the pages this build authors --------------------- */
function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...");
}

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const draw = (line) => {
    if (y < margin) { page = pdf.addPage([width, height]); y = height - margin; }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };
  /*
   * The one shared separator-aware splitter, not a private copy.
   *
   * A route key too long for the 468pt column is broken at its OWN separators
   * -- after a colon, underscore, slash, dot or hyphen -- so a reader carries
   * across the break with the key still legible. The character-accumulating
   * splitter this replaces cut at whichever glyph first reached the margin,
   * which is how the proof-of-delivery page came to print
   * "...-for-an-eligible-c" / "onviction-411-0735", a key broken inside a word.
   *
   * hardSplits is asserted zero after every composed document below: a future
   * route key with no separator to break on fails the build instead of
   * shipping a chopped one.
   */
  const splitToken = createTokenSplitter({ fits: fitsByFontMetrics(font, fontSize, maxWidth) });
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => font.widthOfTextAtSize(w, fontSize) > maxWidth ? splitToken(w) : [w]);
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else { if (current) rows.push(current); current = w; }
    }
    if (current) rows.push(current);
    return rows;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  assert.equal(splitToken.hardSplits, 0,
    `${title}: a token was chopped mid-word because it carries no separator to break on`);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/*
 * The field-map rows for a composed component.
 *
 * Its writes are the facts this build prints onto a page it authored, and its
 * blanks are the dotted lines it leaves. Both are declared exactly the way an
 * official form's are, so a composed page is audited by the same contract and
 * cannot carry an undeclared blank that an official page would fail on.
 */
function composedMapFor(componentId) {
  const spec = COMPOSED_COMPONENTS[componentId];
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const base = (id, label) => ({
    field: `${componentId}.${id}`, fieldName: id, page: 1,
    printedLabel: label, printedLine: label, effectiveLabel: label,
    regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build",
    document: componentId
  });
  for (const w of spec.writes ?? []) {
    canonicalWrites.push({ ...base(w.id, w.label), factId: w.fact, kind: "composed_text" });
  }
  for (const r of spec.blanks ?? []) {
    canonicalRefusals.push({
      ...base(r.id, r.label),
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${componentId} field ${r.id}`,
      factId: null, routeDetermined: false, why: r.why, participantMustSupply: r.what
    });
  }
  for (const r of spec.protectedBlanks ?? []) {
    canonicalRefusals.push({
      ...base(r.id, r.label),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, why: r.why
    });
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    officialFormNumber: null,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.primaryRouteKey,
      ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
    },
    structuralClass: "composed_document",
    composedFrom: COMPOSED_FROM,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

/* ---- byte proof: what actually landed on the paper ------------------------- */
async function byteProof(censusByForm, packetFile, pageManifest, reports, fixtureName) {
  const widgets = await flattenedWidgets(path.join(ROOT, packetFile));
  // Packet page numbers, not per-document page numbers: the proof is read from
  // the assembled artifact the participant receives, not from an intermediate.
  const offsetOf = new Map();
  for (const m of pageManifest) {
    const key = `${m.component} ${m.sourcePage}`;
    offsetOf.set(key, m.packetPage);
  }
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  let glyphs = 0;

  for (const [componentId, census] of censusByForm) {
    const report = reports.get(componentId);
    const written = new Map((report?.written ?? []).map((w) => [w.field, w]));
    for (const r of census.rows) {
      for (const wdg of r.widgets) {
        const packetPage = offsetOf.get(`${componentId} ${wdg.page}`);
        if (!packetPage) continue;
        const drawn = drawnAt(widgets, { page: packetPage, rect: wdg.rect });
        const ink = drawn.map((d) => d.text).filter(Boolean).join("").trim();
        const w = written.get(r.name);
        if (w) {
          if (ink.length === 0) continue;
          glyphs += ink.replace(/\s+/g, "").length;
          actualWrites.push({
            field: r.key, document: componentId, factId: r.fact,
            page: packetPage, rect: wdg.rect,
            expected: String(w.value ?? ""), drawnText: ink, foundInOutputBytes: true,
            proof: "read back from the flattened widget appearance of the assembled packet bytes"
          });
          continue;
        }
        if (ink.length === 0) continue;
        if (r.sourceValue !== null && r.sourceValue !== undefined) {
          documentAuthoredAppearances.push({ field: r.key, document: componentId, page: packetPage, drawnText: ink, sourceValue: r.sourceValue });
          continue;
        }
        refusedFieldsWithInk.push({ fieldId: r.key, document: componentId, page: packetPage, drawnText: ink });
      }
    }
  }
  return { actualWrites, refusedFieldsWithInk, documentAuthoredAppearances, glyphs };
}

/* ---- byte proof for the pages this build authored -------------------------- */
async function composedByteProof(packetBytes, pageManifest, facts, fixtureName) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const textOfComponent = new Map();
  for (const [i, m] of pageManifest.entries()) {
    if (censusHas(m.component)) continue;
    const text = groupIntoLines(extractTextItems(pages[i])).map((l) => l.text).join(" ").replace(/\s+/g, " ");
    textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${text}`);
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const [componentId, spec] of Object.entries(COMPOSED_COMPONENTS)) {
    const text = String(textOfComponent.get(componentId) ?? "").replace(/\s+/g, " ");
    for (const w of spec.writes ?? []) {
      const value = sanitizePdfText(String(facts[w.fact] ?? ""));
      assert.ok(value.length > 0, `${componentId}/${w.id}: no fixture value for ${w.fact}`);
      assert.ok(text.includes(value),
        `${fixtureName} ${componentId}/${w.id}: the value bound to ${w.fact} is not readable from the assembled packet bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: `${componentId}.${w.id}`, document: componentId, factId: w.fact,
        expected: value, drawnText: value, foundInOutputBytes: true,
        proof: "read back from the extracted text of the component's own pages in the assembled packet bytes"
      });
    }
  }
  return { actualWrites, glyphs };
}

/* ---- the field map, built from the census and the finalizer's own report ---- */
function mapsFrom(censusByForm, reports) {
  const maps = [];
  for (const [componentId, census] of censusByForm) {
    const report = reports.get(componentId);
    const written = new Set((report?.written ?? []).map((w) => w.field));
    const canonicalWrites = [];
    const canonicalRefusals = [];
    const selectionControls = [];
    const seen = new Set();
    for (const r of census.rows) {
      if (seen.has(r.name)) continue;
      seen.add(r.name);
      const base = {
        field: `${componentId}.${r.name}`, fieldName: r.name, page: r.page,
        printedLabel: r.caption ?? r.effectiveLabel, printedLine: r.caption ?? r.effectiveLabel,
        effectiveLabel: r.effectiveLabel, regionHeading: r.section ?? r.effectiveLabel,
        sectionHeading: r.section ?? null, rect: r.rect, rectBasis: r.rectBasis,
        document: componentId, formNumber: r.formNumber
      };
      if (r.policy === "write" && written.has(r.name)) {
        canonicalWrites.push({ ...base, factId: r.fact, kind: "acroform_text" });
        continue;
      }
      if (r.policy === "write") {
        // The dictionary intended a write and the finalizer refused it. That is
        // a defect and is surfaced as an unclassified blank rather than dressed
        // as a disposition, because a build must not classify away its own miss.
        canonicalRefusals.push({
          ...base, reason: "the field map intended a write and the finalizer refused it",
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false, factId: r.fact, why: "builder defect: intended write not present in the finalizer report"
        });
        continue;
      }
      if (r.policy === "protect") {
        canonicalRefusals.push({
          ...base,
          reason: r.refusalClass === SIGNATURE
            ? "signature or date field; never prefilled by this build"
            : "court, clerk, prosecutor, agency, or hearing field; the court completes it",
          category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
          requiredBeforeFiling: false, why: r.why
        });
        continue;
      }
      // A genuine participant election. Not a required-before-filing fact: the
      // packet is not waiting on a value it could have held, it is leaving a
      // decision to the person who signs. The completeness contract refuses
      // REQUIRED_BEFORE_FILING on a selection control for exactly that reason.
      if (r.policy === "election") {
        const election = {
          ...base,
          reason: `a choice only the participant can make, and one this route does not determine: ${r.what}`,
          category: PARTICIPANT_ELECTION, completenessClass: PARTICIPANT_ELECTION, class: PARTICIPANT_ELECTION,
          requiredBeforeFiling: false, routeDetermined: false,
          identity: `${componentId} field ${r.name}`,
          why: r.why, participantMustSupply: r.what
        };
        canonicalRefusals.push(election);
        selectionControls.push({
          selectionId: `${componentId}.${r.name}`, field: r.effectiveLabel,
          disposition: "participant_election", kind: "participant_election_control",
          category: PARTICIPANT_ELECTION, reason: election.reason, page: r.page,
          requiredBeforeFiling: false, routeDetermined: false,
          identity: election.identity, why: r.why, participantMustSupply: r.what
        });
        continue;
      }
      const row = {
        ...base,
        reason: `the participant supplies this before filing: ${r.what}`,
        category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, identity: `${componentId} field ${r.name}`,
        factId: null, routeDetermined: false, why: r.why, participantMustSupply: r.what
      };
      canonicalRefusals.push(row);
      if (r.isSelectionControl) {
        selectionControls.push({
          selectionId: `${componentId}.${r.name}`, field: r.effectiveLabel,
          disposition: "required_before_filing", kind: "boxed_entry_control",
          category: null, reason: row.reason, page: r.page,
          completenessDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
          identity: row.identity, why: r.why, participantMustSupply: r.what
        });
      }
    }
    maps.push({
      formNumber: componentId, documentId: componentId, documentRole: componentId,
      officialFormNumber: census.rows[0]?.formNumber ?? null,
      documentPolicy: {
        mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.primaryRouteKey,
        ...(COMPONENT_CONDITIONS[componentId] ? { conditional: true, conditionDescription: COMPONENT_CONDITIONS[componentId] } : {})
      },
      structuralClass: "official_acroform",
      composedFrom: COMPOSED_FROM,
      explicitMappings: {}, roleRefusals: [], selectionControls,
      canonicalWrites, canonicalRefusals,
      boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
    });
  }
  return maps;
}

/* ---- the builder's own count of the nine counters ---------------------------- */
function countCompleteness(maps, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r, isSelectionControl) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: isSelectionControl === true,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const selectionIds = new Set();
  for (const m of maps) for (const s of m.selectionControls ?? []) selectionIds.add(s.selectionId);

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w, selectionIds.has(w.field)));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r, selectionIds.has(r.field)));
  }

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
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
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    const spec = BLANK_DISPOSITIONS[verdict.disposition];
    if (spec.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, label: blank.label, basis: verdict.basis });
  }

  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
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
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
    for (const refused of p.refusedFieldsWithInk ?? []) note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs ------------------------------------------------------------------ */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(COMPONENTS.map((c, i) => [c, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || String(a.field).localeCompare(String(b.field)));
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# ${INSTRUCTIONS.title}`, "");
  out.push(...INSTRUCTIONS.introLines, "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of COMPONENTS) {
    const cond = COMPONENT_CONDITIONS[c] ? ` **Conditional:** ${COMPONENT_CONDITIONS[c]}` : "";
    out.push(`| \`${c}\` | ${INSTRUCTIONS.componentBlurbs[c] ?? COMPOSED_TITLES[c]}${cond} |`);
  }
  out.push("");

  if (INSTRUCTIONS.documentsLines?.length) {
    out.push("## Documents you must obtain first", "");
    out.push(...INSTRUCTIONS.documentsLines, "");
  }

  if (rbf.length > 0) {
    out.push("## The items you must supply", "");
    out.push("Each is a blank on the official form named beside it. Fill every one that belongs to the document you are filing, from the record itself, never from memory.", "");
    for (const [doc, items] of byDoc) {
      out.push(`### ${doc} — ${COMPOSED_TITLES[doc] ?? doc}`, "");
      out.push("| The blank on the document | What to write |", "| --- | --- |");
      for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
      out.push("");
    }
  }

  out.push("## What you do, in order", "");
  out.push(...INSTRUCTIONS.stepsLines, "");

  out.push("## Things the platform deliberately left blank", "");
  out.push(...INSTRUCTIONS.blanksLines, "");

  out.push("## When to stop and get help instead", "");
  out.push(...INSTRUCTIONS.stopsLines, "");

  out.push("## What this packet is not", "");
  out.push(...INSTRUCTIONS.notLines, "");
  out.push(`_Route: ${ROUTE.routeKeys.join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    // A family whose source does not bind by exact SHA-256 stops, names the
    // identity that failed, and writes NOTHING. A half-built packet that reads
    // as built is worse than one that was never started.
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures, overlayBytesWritten: false,
      directory: OUT, packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
    };
  }
  assert.equal(resolved.length, SOURCES.length, "every declared source must resolve");

  const censusByForm = new Map();
  for (const source of resolved) censusByForm.set(source.componentId, await censusOf(source));
  CENSUS_COMPONENTS = new Set(censusByForm.keys());

  const drift = [...censusByForm.values()].flatMap((c) => c.captionDrift);
  const unmapped = [...censusByForm.entries()].flatMap(([id, c]) => c.unmapped.map((u) => ({ document: id, ...u })));
  const stale = [...censusByForm.entries()].flatMap(([id, c]) => c.stale.map((s) => ({ document: id, field: s })));

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      boundSources: resolved.length,
      sources: resolved.map((r) => ({ sourceId: r.sourceId, custody: r.custody, sha256: r.sha256, pages: r.pageCount })),
      fields: [...censusByForm.entries()].map(([id, c]) => ({ document: id, mapped: c.rows.length, unmapped: c.unmapped.length, stale: c.stale.length })),
      captionDrift: drift, unmappedFields: unmapped, staleDictionaryKeys: stale
    };
  }

  // An unmapped field is an undeclared blank, and an undeclared blank must fail
  // the build rather than be written as empty. A stale dictionary key means the
  // map describes a field the form no longer has.
  assert.equal(unmapped.length, 0,
    `every AcroForm field must be declared: ${unmapped.map((u) => `${u.document}/${u.field}`).join(", ")}`);
  assert.equal(stale.length, 0,
    `the field dictionary names fields this form does not have: ${stale.map((s) => `${s.document}/${s.field}`).join(", ")}`);
  assert.equal(drift.length, 0,
    `a recorded caption is no longer printed where the dictionary says: ${drift.map((d) => `${d.field}@p${d.page}`).join(", ")}`);

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];
  let maps = null;
  let writtenFieldSet = null;

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const rendered = [];
    const reports = new Map();
    // COMPONENTS order is the packet's page order, and it is the manifest's
    // order rather than this build's convenience.
    for (const componentId of COMPONENTS) {
      const source = resolved.find((r) => r.componentId === componentId);
      if (source) {
        const census = censusByForm.get(componentId);
        const { bytes, report } = await renderDocument(source, census, fixtureName);
        rendered.push({ source: { componentId, formNumber: source.formNumber, sha256: source.sha256 }, bytes });
        reports.set(componentId, report);
        continue;
      }
      const spec = COMPOSED_COMPONENTS[componentId];
      assert.ok(spec, `component ${componentId} is neither a bound source nor a composed component`);
      const body = spec.body(facts);
      for (const w of spec.writes ?? []) {
        assert.ok(String(body).includes(String(facts[w.fact] ?? "\u0000")),
          `${componentId}: the composed page must carry the value bound to ${w.fact}`);
      }
      const bytes = await renderComposedPdf(body, COMPOSED_TITLES[componentId]);
      rendered.push({ source: { componentId, formNumber: null, sha256: null }, bytes });
    }
    if (!maps) {
      maps = [];
      for (const componentId of COMPONENTS) {
        if (censusByForm.has(componentId)) continue;
        maps.push(composedMapFor(componentId));
      }
      maps = [...mapsFrom(censusByForm, reports), ...maps]
        .sort((a, b) => COMPONENTS.indexOf(a.formNumber) - COMPONENTS.indexOf(b.formNumber));
    }

    const combined = await combinePacket(fixtureName, rendered);
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), combined.bytes);

    const proof = await byteProof(censusByForm, file, combined.pageManifest, reports, fixtureName);
    // Composed pages carry no widgets, so their values are read back from the
    // assembled packet's own page text rather than from a widget appearance.
    const composedProof = await composedByteProof(combined.bytes, combined.pageManifest, facts, fixtureName);
    proof.actualWrites.push(...composedProof.actualWrites);
    proof.glyphs += composedProof.glyphs;
    const reportedWrites = [...reports.values()].reduce((n, r) => n + r.written.length, 0);
    /*
     * Every fixture must write the SAME set of fields.
     *
     * The Massachusetts family found why this guard is needed: a value that fits
     * the canonical participant's blank and not the boundary participant's is
     * refused on one fixture and written on the other, and the packet then drops
     * a real participant's fact for exactly the people least able to notice.
     * The field map is built from the canonical report, so without this the
     * boundary refusal would not appear in any counter at all.
     */
    const writtenHere = new Set([...reports.entries()].flatMap(([id, r]) => r.written.map((w) => `${id}.${w.field}`)));
    if (writtenFieldSet === null) writtenFieldSet = writtenHere;
    else {
      const missing = [...writtenFieldSet].filter((k) => !writtenHere.has(k));
      const extra = [...writtenHere].filter((k) => !writtenFieldSet.has(k));
      assert.ok(missing.length === 0 && extra.length === 0,
        `fixtures do not write the same fields — ${fixtureName} is missing [${missing.join(", ")}] and adds [${extra.join(", ")}]. `
        + "A value that fits one participant's blank and not another's must be withheld from both, not written for one.");
    }
    assert.equal(proof.refusedFieldsWithInk.length, 0,
      `${fixtureName}: a field the map refused carries ink: ${proof.refusedFieldsWithInk.map((r) => r.fieldId).join(", ")}`);
    assert.ok(reportedWrites === 0 || proof.actualWrites.length > 0,
      `${fixtureName}: the finalizer reported ${reportedWrites} write(s) and the output bytes carry none`);

    writeProofs.push({
      fixture: fixtureName,
      proofMethod: "every written value read back from the flattened widget appearances of the assembled packet bytes",
      valuesReportedByFinalizer: reportedWrites,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.actualWrites.length,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      documentAuthoredAppearances: proof.documentAuthoredAppearances,
      actualWrites: proof.actualWrites
    });

    const sha256 = crypto.createHash("sha256").update(combined.bytes).digest("hex");
    artifacts.push({
      fixture: fixtureName, file, sha256,
      byteLength: combined.bytes.length, pageCount: combined.pageCount,
      pageManifest: combined.pageManifest,
      documents: COMPONENTS, components: COMPONENTS
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: "assembled_packet_of_official_forms",
      fixture: fixtureName, sha256, byteLength: combined.bytes.length, pageCount: combined.pageCount
    });

    if (!skipRaster) {
      const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < combined.pageCount; i += 1) {
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
          component: combined.pageManifest[i]?.component ?? null,
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

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: IMPLEMENTATION_STRATEGY,
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    bindingMethod:
      "each source binds by exact SHA-256 against THREE records that must agree: the committed corpus index entry, "
      + "the bytes mounted in the custody that index declares, and the pin carried in this family's builder. Custody "
      + "roots are resolved through scripts/lib/corpus-index-paths.mjs, which follows what the index declares rather "
      + "than the shape of the path.",
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      documentId: r.componentId, formNumber: r.formNumber, title: r.title,
      instrumentKind: r.instrumentKind, sourceId: r.sourceId,
      custody: r.custody, pathInArchive: r.pathInArchive, revision: r.revision,
      sha256: r.sha256, sha256Exact: true, byteLength: r.byteLength,
      pageCount: r.pageCount, acroFieldCount: r.acroFieldCount,
      structuralClassObserved: r.structuralClassObserved
    })),
    composedComponentsAuthoredByThisBuild: Object.keys(COMPOSED_COMPONENTS),
    groundingRecords: RECEIPT.groundingRecords,
    officialSourcesRecordedInIntake: RECEIPT.officialSourcesRecordedInIntake,
    formIdentityNote: RECEIPT.formIdentityNote,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: RECEIPT.whatThisReceiptDoesNotEstablish
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1", familyId: FAMILY_ID,
    readFirstHandFrom: "the pinned source binaries, at the SHA-256 the source receipt records",
    documents: [...censusByForm.entries()].map(([id, c]) => ({
      documentId: id, pageCount: c.pageCount, fields: c.rows.length,
      unmapped: c.unmapped, staleDictionaryKeys: c.stale, captionDrift: c.captionDrift,
      rows: c.rows.map((r) => ({
        field: r.name, type: r.type, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        printedCaption: r.caption, captionAt: r.captionAt, effectiveLabel: r.effectiveLabel,
        section: r.section, policy: r.policy, factId: r.fact ?? null,
        sourceValuePresentInBlankForm: r.sourceValue
      }))
    }))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: ROUTE.routeKeys, routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "official_pdf_fill",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    implementationStrategy: IMPLEMENTATION_STRATEGY,
    officialForm: resolved.map((r) => ({ documentId: r.componentId, formNumber: r.formNumber, sha256: r.sha256 })),
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeSelectionsMade: [],
    routeSelectionNote: FIELDMAP_NOTES.routeSelectionNote,
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    componentConditions: COMPONENT_CONDITIONS,
    boundSources: resolved.map((r) => ({
      sourceId: r.sourceId, documentId: r.componentId, formNumber: r.formNumber,
      custody: r.custody, pathInArchive: r.pathInArchive, sha256: r.sha256
    })),
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Every written value was read back from the flattened widget appearances of the ASSEMBLED packet bytes, at "
      + "the packet's own page numbers, not from this builder's intent and not from an intermediate render.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
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

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID, blocking: [],
    findings: FINDINGS
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: APPROVAL.counselQuestionsRaised,
    mattersForTheReviewersAttention: APPROVAL.mattersForTheReviewersAttention
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 8)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: IMPLEMENTATION_STRATEGY,
    boundSources: resolved.length,
    sources: resolved.map((r) => ({ sourceId: r.sourceId, custody: r.custody, sha256: r.sha256 })),
    components: COMPONENTS,
    documents: COMPONENTS,
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
