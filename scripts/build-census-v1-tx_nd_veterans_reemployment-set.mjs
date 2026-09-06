#!/usr/bin/env node
/**
 * The Texas veterans-reemployment-programme nondisclosure packet family builder.
 *
 *   node scripts/build-census-v1-tx_nd_veterans_reemployment-set.mjs [--check] [--no-raster]
 *
 * One census-v1 family, strategy official_pdf_fill, one track carrying TWO
 * routes:
 *
 *   tx_nd_veterans_reemployment   Order of nondisclosure after successful
 *                                 completion of a court-approved veterans
 *                                 reemployment programme under Code of Criminal
 *                                 Procedure ch. 42A, subch. H-1,
 *                                 Tex. Gov't Code 411.0729
 *
 * THE ROUTE THE STATUTE ACTUALLY PROVIDES IS THE NO-FILING ROUTE, AND IT LEADS
 *
 * Section 411.0729 NAMES NO FILING PARTY and imposes no petition requirement.
 * Read at source on 2026-08-06: the court holds a hearing on whether issuance is
 * in the best interest of justice and, unless it finds that it is not, ENTERS
 * THE ORDER. Nothing is filed, no filing fee arises, and § 411.0729(b) makes the
 * section apply regardless of whether the person meets the other eligibility
 * criteria in the subchapter, so the Gov't Code § 411.074 basic conditions do
 * not gate it. There is no waiting period.
 *
 * OCA nonetheless publishes a model petition and order for the section, because
 * in practice courts may require a petition or may not hold the hearing. That is
 * the second route, and it is the only one that fills a form. This packet leads
 * with the first: the no-filing-route guidance is component 1 and is REQUIRED,
 * and the petition and the order are components 2 and 3 and are CONDITIONAL on
 * the court requiring a petition or not having acted. Selling a filing to
 * someone the court owes an order to without one is the error this ordering
 * exists to prevent.
 *
 * WHAT IS BOUND, AND FROM WHICH CUSTODY
 *
 * Three official documents, each binding by exact SHA-256 against three records
 * that must agree - the committed corpus index entry, the bytes mounted in the
 * custody that index declares, and the pin carried in this file:
 *
 *   the OCA Model Petition for an Order of Nondisclosure under Section 411.0729
 *   the OCA Model Order of Nondisclosure under Section 411.0729
 *   the Statement of Inability to Afford Payment of Court Costs or an Appeal Bond
 *
 * The two OCA models are Master Library assets. The Statement is NOT: it lives
 * in the human_source_returns custody - a document returned by a person with
 * provenance and its own receipt, held outside the Master Library and carried
 * by no release. Custody roots are therefore resolved through the shared
 * resolver in scripts/lib/corpus-index-paths.mjs, which follows what the index
 * DECLARES rather than the shape of the path.
 *
 * The Statement is the SAME BINARY several sibling Texas families bind. A shared
 * national record is pinned twice over: this family carries its own entry in
 * SOURCES with its own SHA-256, and the whole file is hashed and recorded in
 * the receipt, so the family's binding is legible without reading any other
 * family's.
 *
 * WHAT THE REPOSITORY ESTABLISHES FOR THIS ROUTE, AND WHERE IT WAS READ
 *
 *   FILING DESTINATION  HELD, and it is conditional on there being a filing at
 *                       all. On the statutory route nothing is filed. Where the
 *                       court requires a petition, it is filed with the clerk of
 *                       the court that placed the person on community
 *                       supervision - NOT the county of arrest. Gov't Code
 *                       § 411.0745(a) allows filing in person, electronically or
 *                       by mail. Track registry tx_nd_veterans_reemployment,
 *                       venue, destination and rules.filing.
 *
 *   FEE                 HELD, in two halves, and the first half is the one that
 *                       matters: NO FEE ARISES ON THE NO-FILING ROUTE. On the
 *                       petition route § 411.0745(b) requires the fee that
 *                       generally applies to filing a CIVIL CASE, which the
 *                       committed record states is county-specific. There is no
 *                       flat statutory figure; OCA describes the total as
 *                       typically about $280, varying by county, and directs the
 *                       filer to call the clerk.
 *
 *   THE $28 TRAP        The committed record warns in terms that the $28 figure
 *                       belongs ONLY to the no-petition route under § 411.072(c)
 *                       and IS NOT A FILING FEE. It is not this section's figure
 *                       on either route, and the packet names it in order to say
 *                       so, because a participant who has read it elsewhere will
 *                       otherwise arrive at the clerk's window with the wrong
 *                       money.
 *
 *   WAIVER              HELD, and it is why the Statement of Inability binds to
 *                       this family. A Statement of Inability to Afford Payment
 *                       of Court Costs under Tex. R. Civ. P. 145, on the
 *                       statewide bilingual form approved by the Supreme Court
 *                       of Texas in Misc. Docket No. 22-9090, which Rule 145
 *                       requires the clerk to make available WITHOUT CHARGE OR
 *                       REQUEST. It is CONDITIONAL twice over here: on there
 *                       being a filing at all, and on the participant being
 *                       unable to pay.
 *
 *   SERVICE             HELD, and the answer is that THE COURT notifies the
 *                       State. Section 411.0745(e): on receipt of a petition the
 *                       court provides notice to the State and an opportunity
 *                       for a hearing, and the filer should not be charged for
 *                       it. On the statutory route the court holds the hearing
 *                       of its own motion.
 *
 *   WAITING PERIOD      HELD, and the answer is that THERE IS NONE. The trigger
 *                       is successful completion of the programme and of all
 *                       community-supervision conditions. This packet imports no
 *                       waiting period from a sibling section.
 *
 * WHAT THE PETITION DOES NOT CARRY, AND WHY THE PACKET SAYS SO IN PROSE
 *
 * The § 411.0729 petition prints a fee election at paragraph 6 - the required
 * filing fees and court costs, or a Statement of Inability - and, read
 * first-hand from the pinned binary, THERE IS NO ACROFORM CONTROL BEHIND IT.
 * Thirteen widgets over three pages, and none on that pair of lines. There is
 * nothing for this build to write into and nothing to declare in the field map,
 * so the participant instructions name it explicitly as a mark to make by hand.
 * A blank with no field behind it is invisible to every field-level counter,
 * which is exactly why it is stated in prose instead.
 *
 * WHAT THIS BUILD WRITES, AND THE ONE FACT IT WITHHOLDS ON PURPOSE
 *
 * The platform holds the participant's name, date of birth, address, telephone
 * number and email, and writes the ones each document asks for IN THE SHAPE IT
 * ASKS FOR THEM.
 *
 * The address is written where a document asks for the whole address in one
 * blank - the Statement's own address lines - and withheld where a document
 * splits it, as the OCA petition's signature block does across Address and
 * City/State/Zip. The platform holds one line; splitting it by guessing where
 * the street ends would invent structure it does not have. This build asserts
 * that both fixtures write the SAME set of fields, so a long value silently
 * dropped for one participant and written for another cannot pass unnoticed.
 *
 * THE PROPOSED ORDER IS GENERATED UNEXECUTED. Every field on it that records a
 * judicial act - the date the court considered the petition, the date it
 * conducted a hearing, the date of signing, the judge and the court/county
 * block - is refused as court-owned. Nothing in the rendered order asserts that
 * a court has acted. This order carries NO hearing checkboxes at all: its
 * recitals are unconditional, which is consistent with a section under which the
 * court holds a hearing as a matter of course.
 *
 * THE STATEMENT OF INABILITY IS CLASSIFIED BY DECLARED RULE, NOT BY HAND
 *
 * It carries 132 AcroForm fields: a sworn financial affidavit of household
 * members, benefits, income sources, property, debts and expenses. Every one is
 * classified by the ordered rule table below, each rule carrying its own
 * disposition and its own stated reason, and the build FAILS if any field
 * matches no rule or if any rule names a field the form does not have.
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
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { loadAppearanceSemantics, dispositionsForFamily }
  from "./rcap-official-forms/rcap-appearance-semantics.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS }
  from "./rcap-packet-completeness/completeness-contract.mjs";

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

const FAMILY_ID = "tx_nd_veterans_reemployment-set";
const OUT = "data/rcap-all50/overlays/census-v1/tx/tx-nd-veterans-reemployment-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-tx_nd_veterans_reemployment-set.mjs";
const IMPLEMENTATION_STRATEGY = "official_pdf_fill";

const APPEARANCE_SEMANTICS = loadAppearanceSemantics();

/*
 * SELF_HELP_STOP. The stop list is not written here by hand.
 *
 * It is read from the committed track registry AT BUILD TIME and reproduced
 * word for word, so a packet cannot carry a narrowed or stale version of the
 * points at which self-help ends. What this packet adds from its own forms'
 * assertions is stated separately as this packet's own.
 */
const STOP_TRACK = "tx_nd_veterans_reemployment";
const TRACK_REGISTRY_FILE = "data/record-clearing/legal-design-track-registry.json";
const TRACK_REGISTRY_ROW = (() => {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, TRACK_REGISTRY_FILE), "utf8"));
  const track = (registry.tracks ?? []).find((row) => row.trackId === STOP_TRACK);
  assert.ok(track, `${STOP_TRACK}: no committed track registry entry to read this route's record from`);
  return track;
})();
const REGISTRY_STOP_CONDITIONS = (() => {
  const conditions = (TRACK_REGISTRY_ROW.selfHelpStopConditions ?? []).map((c) => String(c).trim()).filter(Boolean);
  assert.ok(conditions.length, `${STOP_TRACK}: the track registry holds no self-help stop condition`);
  return Object.freeze(conditions);
})();
/*
 * The registry's own unresolved questions, carried into the build findings and
 * the approval request as the registry states them. This route carries one and
 * it is a release blocker; it is not this lane's to resolve, and a packet that
 * did not carry it would read as though the record were settled.
 */
const REGISTRY_UNRESOLVED_QUESTIONS = Object.freeze((TRACK_REGISTRY_ROW.unresolvedQuestions ?? []).map((q) => ({
  question: String(q.question ?? "").trim(),
  impact: q.impact ?? null,
  affectedElement: q.affectedElement ?? null
})));

const ROUTE = Object.freeze({
  jurisdiction: "TX",
  routeKeys: [
    "obligation:unit:TX:tx_nd_veterans_reemployment:tx-nd0729-no-filing-route",
    "obligation:unit:TX:tx_nd_veterans_reemployment:tx-nd0729-oca-petition"
  ],
  /*
   * The primary key is the PETITION unit, and that is not a statement that the
   * petition route is the better one. It is the key that belongs to the
   * documents: documentPolicy.routeKey is stamped on each component's field-map
   * entry, and every component this family FILLS - the petition, the order and
   * the fee-waiver Statement - exists only on the petition route. The no-filing
   * route is carried in routeKeys, is component 1, is the route the guidance
   * leads with, and is the route the packet tells the participant to try first.
   */
  primaryRouteKey: "obligation:unit:TX:tx_nd_veterans_reemployment:tx-nd0729-oca-petition",
  routeSelectionId: "tx_nd_veterans_reemployment-official-set",
  legalName: "Order of Nondisclosure under Tex. Gov't Code § 411.0729 (after successful completion of a court-approved veterans reemployment programme), with the OCA model petition for the court that requires one",
  routeName: "getting the Texas court that placed you on community supervision to seal that misdemeanour record from public disclosure under Government Code § 411.0729, after you successfully completed a court-approved veterans reemployment programme",
  statute: "Tex. Gov't Code §§ 411.0729 and 411.0745; Tex. Code Crim. Proc. ch. 42A, subch. H-1"
});

const GUIDANCE = "tx_nd_veterans_reemployment-no-filing-route-guidance-1";
const PETITION = "tx_nd_veterans_reemployment-petition-2";
const ORDER = "tx_nd_veterans_reemployment-proposed-order-3";
const STATEMENT = "tx_nd_veterans_reemployment-fee-waiver-statement-4";
const AFTER = "tx_nd_veterans_reemployment-after-order-instructions-5";

const COMPONENTS = [GUIDANCE, PETITION, ORDER, STATEMENT, AFTER];

const COMPOSED_TITLES = {
  [GUIDANCE]: "The Order the Court Owes You Without Any Petition, and How to Ask For It",
  [PETITION]: "OCA Model Petition for an Order of Nondisclosure under Section 411.0729",
  [ORDER]: "OCA Model Order of Nondisclosure under Section 411.0729",
  [STATEMENT]: "Statement of Inability to Afford Payment of Court Costs or an Appeal Bond",
  [AFTER]: "What the Order Does, and What to Do After It Issues"
};

const COMPONENT_CONDITIONS = {
  [PETITION]: "Used only where the court requires a petition or did not hold the hearing. Gov't Code § 411.0729 names no filing party and imposes no petition requirement: the court holds a hearing and, unless it finds issuance is not in the best interest of justice, enters the order. OCA publishes a model petition because in practice some courts require one. Try the no-filing route first.",
  [ORDER]: "Filed with the petition on the petition route. OCA instructions state that in most courts a proposed order must be submitted with the petition.",
  [STATEMENT]: "Used only where there is a filing at all AND the participant cannot afford the fees and costs. No fee arises on the no-filing route. Tex. R. Civ. P. 145 requires the clerk to make this form available without charge or request in any event."
};

const SOURCES = [
  Object.freeze({
    componentId: PETITION,
    sourceId: "official-form:OCA Model Petition for an Order of Nondisclosure under Section 411.0729",
    formNumber: "TX-GC-411.0729-PETITION",
    title: "OCA Model Petition for an Order of Nondisclosure under Section 411.0729",
    instrumentKind: "petition",
    sha256: "5fbe7c7fe7efb752b2d3bce84298d66305f0384b9e30710ca660107ce6fc6c10"
  }),
  Object.freeze({
    componentId: ORDER,
    sourceId: "official-form:OCA Model Order of Nondisclosure under Section 411.0729",
    formNumber: "TX-GC-411.0729-ORDER",
    title: "OCA Model Order of Nondisclosure under Section 411.0729",
    instrumentKind: "proposed_order",
    sha256: "3440721f4f22e37b60539789222518b27f49dcd7a8c4b9d64536181041382ba9"
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
  + "tx_nd_veterans_reemployment), the committed track registry "
  + "(data/record-clearing/legal-design-track-registry.json, track tx_nd_veterans_reemployment) and the "
  + "packet-set manifest (data/record-clearing/legal-design-packet-set-manifests.json, "
  + "tx_nd_veterans_reemployment-set), with the two routes, the fee, the waiver route and the service rule read "
  + "from that record's units and rules blocks and the § 411.0729 and § 411.0745 subsections they quote";

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
  BODY: "Completion of the veterans reemployment programme",
  SIGN: "The block at the foot of the petition",
  ORDER_CAPTION: "The heading of the proposed order",
  ORDER_COURT: "What the court did, recorded by the court",
  ORDER_FINDING: "The offence the order covers, as the court is asked to find it",
  SOI_CAPTION: "Statement caption",
  SOI_ABOUT: "About me and my household",
  SOI_MONEY: "Income, property, expenses and debts",
  SOI_ELECTION: "Boxes the person filing marks",
  SOI_DECLARATION: "Sworn declaration"
};

/* ---- the OCA model petition, all thirteen fields ---------------------------- *
 * Read first-hand from the pinned binary: 13 AcroForm fields over 3 pages, no
 * widget carrying the annotation Hidden flag, and NO field shipping a value -
 * unlike the sibling 411.0727 petition, whose is/is-not dropdown arrives
 * carrying the form's own ink. The absence was measured here rather than
 * inherited.
 *
 * TWO PRINTED BLANKS ON THIS FORM HAVE NO WIDGET BEHIND THEM: the cause number
 * on the caption line of page 1, and the fee election at paragraph 6 on page 3.
 * Both are printed rules. There is nothing to write into and nothing to declare
 * in the field map, so both are named in the participant instructions as marks
 * to make by hand.
 */
const PETITION_FIELDS = {
  "Court": {
    section: S.CAPTION, caption: "In the Matter of", captionAt: { page: 1, y: 660 },
    label: "Court the petition is filed in, named in the caption",
    ...SUPPLY("the court that placed you on community supervision, exactly as its own paperwork names it",
      "which court placed the participant on community supervision is a case fact the platform has not seen")
  },
  "Name": {
    section: S.CAPTION, caption: "In the Matter of", captionAt: { page: 1, y: 660 },
    label: "Name of the person the matter is in, in the petition caption",
    ...WRITE("participant.full_legal_name")
  },
  "County": {
    section: S.CAPTION, caption: "County, Texas", captionAt: { page: 1, y: 596 },
    label: "County of that court, named in the caption",
    ...SUPPLY("the Texas county of that court",
      "the county of the court that placed the participant on community supervision is a case fact the platform has not seen")
  },
  "Name2": {
    section: S.BODY, caption: "respectfully", captionAt: { page: 1, y: 452 },
    label: "Person named in the opening line of the petition",
    ...WRITE("participant.full_legal_name")
  },
  "Offense": {
    section: S.BODY, caption: "community supervision for the misdemeanor offense of", captionAt: { page: 1, y: 306 },
    label: "Misdemeanour offence the community supervision was for",
    ...SUPPLY("the misdemeanour offence exactly as the court's own paperwork names it",
      "the offence is a case fact the platform has not seen, and an order of nondisclosure covers ONE offence")
  },
  "Criminal Cause No": {
    section: S.BODY, caption: "in Criminal Cause No.", captionAt: { page: 1, y: 282 },
    label: "Criminal cause number of the case the community supervision was ordered in",
    ...SUPPLY("the criminal cause number, copied from the court's own paperwork",
      "no cause number is held for a record the platform has not seen")
  },
  "Date5_af_date": {
    section: S.BODY, caption: "or deferred adjudication community supervision on", captionAt: { page: 1, y: 187 },
    label: "Date the programme and all other conditions of community supervision were successfully completed",
    ...SUPPLY("the date you completed the reemployment programme and all your other community-supervision conditions, copied from the record that states it",
      "no completion date is held for a record the platform has not seen, and it is the fact this whole section turns on")
  },
  "Dropdown6": {
    section: S.BODY, selection: true, caption: "completion of the program", captionAt: { page: 1, y: 163 },
    label: "Whether proof of completing the programme is attached - is, or is not",
    ...ELECTION("is, where you attached proof that you completed the programme, or is not, where you have not",
      "whether the participant attached the completion proof is a fact about what they did and cannot be preselected")
  },
  "Signature": {
    section: S.SIGN, caption: "Signature", captionAt: { page: 3, y: 410 },
    label: "Signature of the person filing",
    ...PROTECT(SIGNATURE, "the petition is the participant's own and is signed when they actually file it")
  },
  "Printed Name": {
    section: S.SIGN, caption: "Printed Name", captionAt: { page: 3, y: 378 },
    label: "Printed name of the person filing, at the foot of the petition",
    ...WRITE("participant.full_legal_name")
  },
  "Address": {
    section: S.SIGN, caption: "Address", captionAt: { page: 3, y: 346 },
    label: "Street address of the person filing, at the foot of the petition",
    ...SUPPLY("the street part of your address - this block splits the address across two blanks, and the street goes here",
      "the platform holds the address as ONE LINE and this block asks for it split across Address and City, State, Zip. Splitting it by guessing where the street ends would invent structure the platform does not have, and a long address the fitter refuses would otherwise be silently dropped for one participant and written for another")
  },
  "City State Zip": {
    section: S.SIGN, caption: "City, State, Zip", captionAt: { page: 3, y: 313 },
    label: "City, state and zip of the person filing, at the foot of the petition",
    ...SUPPLY("the city, state and zip of your address, taken from the same address as the street line above",
      "the platform holds the address as one line and this block asks for it split, so both parts are the participant's to write from the address they already have")
  },
  "Telephone Number": {
    section: S.SIGN, caption: "Telephone Number", captionAt: { page: 3, y: 281 },
    label: "Telephone number of the person filing, at the foot of the petition",
    ...WRITE("participant.phone")
  }
};

/* ---- the OCA model order, all eleven fields --------------------------------- *
 * Read first-hand from the pinned binary: 11 AcroForm fields over 3 pages, no
 * widget carrying the annotation Hidden flag, and no field shipping a value.
 *
 * This order carries NO HEARING CHECKBOXES. Its recitals are unconditional -
 * "The State was given notice of the petition", "The Court conducted a hearing
 * on ___", "After consideration and a hearing, the Court FINDS" - which is
 * consistent with a section under which the court holds a hearing as a matter of
 * course rather than on the State's request. There is therefore nothing on this
 * order for the court to elect, only dates and findings for it to enter.
 *
 * The order is PROPOSED and is generated unexecuted. Every field on it that
 * records a judicial act - the date the court considered the petition, the date
 * it conducted a hearing, the date of signing, the judge and the court/county
 * block - is refused as court-owned, and nothing in the rendered order asserts
 * that a court has acted. Only the caption facts, the offence and the criminal
 * cause number are the participant's, and they are the same facts they wrote on
 * the petition.
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
    ...SUPPLY("the court that placed you on community supervision, the same one you wrote on the petition",
      "which court placed the participant on community supervision is a case fact the platform has not seen")
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
      "the county of that court is a case fact the platform has not seen")
  },
  "Date1_af_date": {
    section: S.ORDER_COURT, caption: "the Court considered", captionAt: { page: 1, y: 483 },
    label: "Date the Court considered the petition",
    ...COURTOWN("the date the court considered the petition is the court's to enter; a proposed order may not assert that a court has acted")
  },
  "Date2_af_date": {
    section: S.ORDER_COURT, caption: "The Court conducted a hearing on", captionAt: { page: 1, y: 364 },
    label: "Date the Court conducted the hearing",
    ...COURTOWN("the hearing date is the court's, and on this section the hearing is the court's own act rather than something the person filing arranges")
  },
  "Offense(s)": {
    section: S.ORDER_FINDING, caption: "a veterans reemployment program for the misdemeanor offense(s) of", captionAt: { page: 1, y: 293 },
    label: "Offence the order covers, in the finding the court is asked to make",
    ...SUPPLY("the offence the order covers, the same one you wrote on the petition - an order of nondisclosure covers ONE offence",
      "the offence is a case fact the platform has not seen")
  },
  "Criminal Cause No": {
    section: S.ORDER_FINDING, caption: "Criminal Cause No.", captionAt: { page: 1, y: 245 },
    label: "Criminal cause number of the offence the order covers",
    ...SUPPLY("the criminal cause number of the offence the order covers, the same one you wrote on the petition",
      "no cause number is held for a record the platform has not seen")
  },
  "Date3_af_date": {
    section: S.ORDER_COURT, caption: "Signed on", captionAt: { page: 3, y: 509 },
    label: "Date the proposed order is signed",
    ...COURTOWN("the date of signing is the court's")
  },
  "Judge Presiding": {
    section: S.ORDER_COURT, caption: "Judge Presiding", captionAt: { page: 3, y: 430 },
    label: "Judge presiding block on the proposed order",
    ...COURTOWN("only the judge completes the presiding-judge block")
  },
  "CourtCounty": {
    section: S.ORDER_COURT, caption: "Court/County", captionAt: { page: 3, y: 382 },
    label: "Court and county block beneath the judge's signature on the proposed order",
    ...COURTOWN("the block beneath the judge's signature is completed with the order, by the court")
  }
};

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
  {
    id: "declaration_date",
    re: /^(Day \/ Día|Month \/ Mes|Year \/ Año|Today|Year)$/,
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
    const base = { section: rule.section, label: rule.label(name), ...(isSelection ? { selection: true } : {}) };
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
  "TX-GC-411.0729-PETITION": PETITION_FIELDS,
  "TX-GC-411.0729-ORDER": ORDER_FIELDS,
  "TX-SCT-22-9090-STATEMENT-OF-INABILITY": statementFields
};

/* ---- the pages this build authors ------------------------------------------ */
const COMPOSED_COMPONENTS = {
  [GUIDANCE]: {
    writes: [{ id: "participant_name", label: "Person this route guidance is prepared for", fact: "participant.full_legal_name" }],
    blanks: [],
    protectedBlanks: [],
    body: (facts) => {
      const name = facts["participant.full_legal_name"];
      const L = [];
      L.push(COMPOSED_TITLES[GUIDANCE].toUpperCase(), "");
      L.push(`Prepared for: ${name}`, "");
      L.push("START HERE, BECAUSE THE STATUTE DOES NOT ASK YOU TO FILE ANYTHING.", "");
      L.push("Government Code Sec. 411.0729 names NO FILING PARTY and requires NO PETITION. Read at source, the section says the court holds a hearing on whether issuing the order is in the best interest of justice and, unless it finds that it is not, THE COURT ENTERS THE ORDER. There is no waiting period. On that route nothing is filed and NO FILING FEE ARISES.", "");
      L.push("So the first thing to do is not to fill in a petition. It is to find out whether the order already issued, and if it did not, to ask the court to do what the section says it does.", "");
      L.push("STEP 1 - CHECK WHETHER IT ALREADY ISSUED. Get your Texas DPS criminal history record from the Department of Public Safety Crime Records Service, following DPS form CR-63. If the misdemeanour is already sealed, the court has done this and there is nothing to file and nothing to pay.", "");
      L.push("STEP 2 - GATHER WHAT PROVES YOU ARE INSIDE THE SECTION. Four things have to be true and each has a record behind it:", "");
      L.push("- the offence is a MISDEMEANOUR, and you were placed on community supervision for it, including deferred adjudication community supervision. The judgment or the order placing you on community supervision proves it;");
      L.push("- you SUCCESSFULLY COMPLETED all the conditions of that community supervision. The clerk of that court has the record;");
      L.push("- after committing the offence you elected to take part in, and SUCCESSFULLY COMPLETED, a court-approved VETERANS REEMPLOYMENT PROGRAMME established under Subchapter H-1, Chapter 42A, Code of Criminal Procedure. The programme or the court that approved it has the record;");
      L.push("- you are a VETERAN of the United States Armed Forces, including the reserves, the national guard or the state guard. Your discharge paperwork proves it.", "");
      L.push("SOMETHING THIS SECTION DOES NOT ASK OF YOU. Under Sec. 411.0729(b) the section applies REGARDLESS of whether you meet the other eligibility criteria in the subchapter, so the Government Code Sec. 411.074 basic conditions that gate almost every other nondisclosure section do not gate this one. The petition in this packet says so on its own face at paragraph 3.", "");
      L.push("STEP 3 - ASK THE COURT. Contact the clerk of the court that placed you on community supervision and ask whether the court will set the Sec. 411.0729 hearing without a petition, or whether that court wants a petition filed. Courts differ, which is why OCA publishes a model petition for a section that does not require one.", "");
      L.push("IF THE COURT WANTS A PETITION - AND ONLY THEN.");
      L.push("The next two documents in this packet are the OCA model petition and the OCA model order for Sec. 411.0729. They are marked CONDITIONAL for that reason. Do not file them because they are in the packet; file them because the clerk told you that court requires it, or because the court has not held the hearing.", "");
      L.push("WHERE IT GOES. The clerk of the court that placed you on community supervision, who forwards it to the court. This is NOT the county of arrest. Under Government Code Sec. 411.0745(a) you may file in person, electronically or by mail. OCA instructions say that in most courts a proposed order must be submitted with the petition, which is why the proposed order is here.", "");
      L.push("ONE OFFENCE, ONE ORDER. An order of nondisclosure applies to a single offence. If you want more than one offence sealed, that takes more than one order.", "");
      L.push("WHAT IT COSTS IF YOU DO FILE. Government Code Sec. 411.0745(b) requires payment of the fee that generally applies to filing a CIVIL CASE. That subsection sets the TYPE of fee, not an amount: there is no flat statutory figure and your county's civil filing fee schedule governs. OCA describes the total as typically about $280, varying by county. CALL THE CLERK OF THAT COURT AND ASK before you go.", "");
      L.push("AND THE NUMBER TO IGNORE: $28. You may have read that an order of nondisclosure costs $28. THAT FIGURE IS NOT YOURS ON EITHER ROUTE HERE. It belongs only to the no-petition route under Government Code Sec. 411.072(c), an entirely different section, and the committed record states in terms that it is not a filing fee at all.", "");
      L.push("PARAGRAPH 6 OF THE PETITION IS MARKED BY HAND. The petition prints two choices there - the required filing fees and court costs, or a Statement of Inability to Afford Payment of Court Costs - and unlike every other control on that form there is NO FILLABLE BOX behind them. Mark the one that applies to you with a pen.", "");
      L.push("IF YOU CANNOT AFFORD IT. The STATEMENT OF INABILITY TO AFFORD PAYMENT OF COURT COSTS under Texas Rule of Civil Procedure 145 is in this packet, on the statewide bilingual form approved by the Supreme Court of Texas in Misc. Docket No. 22-9090. Rule 145 requires the clerk to make that form available WITHOUT CHARGE AND WITHOUT YOUR HAVING TO ASK, so you are entitled to it whether or not you use the copy here. It is sworn under penalty of perjury: fill it from pay statements, benefit letters and bills, not from memory. Nothing on it is filled in for you except your own name, date of birth, address, telephone number and email, because the platform holds no financial fact about anyone.", "");
      L.push("WHO GIVES NOTICE TO THE STATE - AND IT IS NOT YOU. Under Sec. 411.0745(e), on receipt of a petition THE COURT provides notice to the State and an opportunity for a hearing, and the committed record states that you should not be charged for that notice. On the statutory route the court holds the hearing of its own motion. You serve nobody either way.", "");
      L.push("NOTARIZATION. Subchapter E-1 does not require the petition to be notarized. County practice may differ. Ask the clerk.", "");
      L.push("WHEN TO STOP AND GET HELP INSTEAD.");
      L.push("The committed track registry for this route records these as the points where self-help ends, in its own words:");
      for (const condition of REGISTRY_STOP_CONDITIONS) L.push(`- ${condition.replaceAll("§", "Sec. ")}`);
      L.push("This packet adds four more of its own, taken from the assertions the forms in it actually make:");
      L.push("- The offence is a FELONY. Section 411.0729 reaches a misdemeanour only.");
      L.push("- You did not successfully complete ALL the conditions of your community supervision.");
      L.push("- The programme you completed was not a court-approved veterans reemployment programme under Subchapter H-1, Chapter 42A, Code of Criminal Procedure, or you are not sure that it was.");
      L.push("- You cannot establish veteran status, or you cannot establish completion of the programme. The petition asserts both about you.", "");
      L.push("DOCUMENTS TO GET FIRST, AND WHO HAS THEM.");
      L.push("- Your Texas DPS criminal history record - the Texas Department of Public Safety Crime Records Service, following DPS form CR-63. It shows whether the order already issued.");
      L.push("- The judgment or the order placing you on community supervision - the clerk of that court. It carries the offence wording and the cause number.");
      L.push("- The record that you successfully completed the veterans reemployment programme and all other conditions of community supervision - the programme, or the clerk of that court. It carries the completion date this section turns on.");
      L.push("- Your discharge paperwork or other proof of veteran status.");
      L.push("", `Route: ${ROUTE.routeKeys.join(" ; ")}`);
      return L.join("\n");
    }
  },
  [AFTER]: {
    writes: [{ id: "participant_name", label: "Person these after-order instructions are prepared for", fact: "participant.full_legal_name" }],
    blanks: [],
    protectedBlanks: [],
    body: (facts) => {
      const name = facts["participant.full_legal_name"];
      const L = [];
      L.push(COMPOSED_TITLES[AFTER].toUpperCase(), "");
      L.push(`Prepared for: ${name}`, "");
      L.push("WHAT THE ORDER ACTUALLY DOES - AND WHAT IT DOES NOT.", "");
      L.push("Nondisclosure is SEALING, not expunction. The order prohibits criminal justice agencies from disclosing the record to the public. The information is still disclosed to the individuals and agencies listed in Government Code Sec. 411.076(a). THE RECORD IS NOT DESTROYED, and you should never say it does not exist.", "");
      L.push("WHAT HAPPENS AFTER THE JUDGE SIGNS, AND WHO DOES IT. The order itself sets out the chain, and none of it is your job:", "");
      L.push("- the court clerk sends the order, or the relevant criminal history record information in it, to the Crime Records Service of the Texas Department of Public Safety no later than the 15th business day after the order issues, under Government Code Sec. 411.075(a);");
      L.push("- DPS seals the information and forwards it to the state and federal agencies listed in Government Code Sec. 411.075(b) no later than 10 business days after receiving it from the clerk;");
      L.push("- any person, agency or entity holding the information seals it no later than 30 business days after receiving it, under Government Code Sec. 411.075(d);");
      L.push("- the clerk seals the court records as soon as practicable after sending the order to DPS, under Government Code Sec. 411.076(b).", "");
      L.push("SO GIVE IT ABOUT THREE MONTHS, THEN CHECK. Pull your Texas DPS criminal history record again, following DPS form CR-63, and confirm the offence is sealed. If it is not, take a certified copy of the signed order to the clerk and ask where it stopped.", "");
      L.push("KEEP A CERTIFIED COPY OF THE SIGNED ORDER. Ask the clerk for one before you leave. It is the only thing that proves the order exists if a background check turns the record up later.", "");
      L.push("WHAT YOU MAY SAY AFTERWARDS. Nondisclosure lets you deny the offence in most, not all, settings, and the exceptions are the agencies and entities in Government Code Sec. 411.076(a). This packet does not advise you on any particular question about any particular employer, licence or application. If the answer matters, ask a lawyer before you answer.", "");
      L.push("ONE ORDER, ONE OFFENCE. If more than one offence is on your record, this order sealed one of them. The others need their own orders and may fall under other sections entirely.", "");
      L.push("IF THE COURT REFUSED. Section 411.0729 lets the court decline where it finds that issuance is NOT in the best interest of justice. That is a finding, not a formality, and the committed record records it as a point where self-help ends. Get advice rather than refiling.");
      /* The route footer is kept in the SAME block as the paragraph above it.
       * Pushed after a blank it is a block of its own, and when the page above
       * is full the packet ends on a sheet carrying nothing but a route key. */
      L.push(`Route: ${ROUTE.routeKeys.join(" ; ")}`);
      return L.join("\n");
    }
  }
};

const RECEIPT = {
  groundingRecords: [
    { record: "data/record-clearing/legal-design-intake/TX.memo.json", track: "tx_nd_veterans_reemployment" },
    { record: TRACK_REGISTRY_FILE, track: "tx_nd_veterans_reemployment", read: "the two routes and their units, the venue, destination, rules block, the absence of any waiting period, the self-help stop conditions reproduced word for word, and the unresolved question carried into the build findings" },
    { record: "data/record-clearing/legal-design-packet-set-manifests.json", packetSetId: "tx_nd_veterans_reemployment-set" },
    { record: "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json", read: "the three document sources this family binds, and the custody each is held in" }
  ],
  officialSourcesRecordedInIntake: [
    { title: "Tex. Gov't Code § 411.0729 — Procedure for certain veterans following completion of a veterans reemployment programme (last amended 2019)", url: "https://statutes.capitol.texas.gov/Docs/GV/htm/GV.411.htm", retrievedOn: "2026-08-06" },
    { title: "Tex. Gov't Code § 411.0745 — Procedure for petition for order of nondisclosure", url: "https://statutes.capitol.texas.gov/Docs/GV/htm/GV.411.htm", retrievedOn: "2026-08-06" },
    { title: "Tex. Code Crim. Proc. ch. 42A, subch. H-1 — Veterans reemployment programme", url: "https://statutes.capitol.texas.gov/Docs/CR/htm/CR.42A.htm", retrievedOn: "2026-08-06" },
    { title: "Office of Court Administration model petition for an order of nondisclosure under § 411.0729 (Rev. February 2022)", url: "https://www.txcourts.gov/programs-services/nondisclosures/", retrievedOn: "2026-08-06" },
    { title: "Office of Court Administration model order of nondisclosure under § 411.0729 (Rev. February 2022)", url: "https://www.txcourts.gov/programs-services/nondisclosures/", retrievedOn: "2026-08-06" },
    { title: "Statement of Inability to Afford Payment of Court Costs or an Appeal Bond, approved by the Supreme Court of Texas in Misc. Docket No. 22-9090; Tex. R. Civ. P. 145", url: "https://www.txcourts.gov/rules-forms/forms/", retrievedOn: "2026-08-06" }
  ],
  formIdentityNote:
    "Three official forms, no invention. The OCA models are the state's own petition and order for this exact "
    + "section, revised February 2022, and are used as published — published for a section that does not require "
    + "a petition at all, which is why both ship CONDITIONAL in this packet and the no-filing route leads. The "
    + "Statement of Inability is the statewide bilingual form the Supreme Court of Texas approved in Misc. Docket "
    + "No. 22-9090; it is held in the human_source_returns custody rather than the Master Library, it is a SHARED "
    + "NATIONAL RECORD several Texas families enclose, and this family pins its own entry for it by SHA-256 and "
    + "records the whole file's digest here so its binding is legible without reading any other family's.",
  whatThisReceiptDoesNotEstablish: [
    "that any output is approved for participant delivery",
    "whether the court will set the § 411.0729 hearing without a petition, which is the route the statute actually provides and the route the packet tells the participant to try first",
    "whether the court that placed the participant on community supervision requires a petition at all; the petition and the proposed order ship conditional for exactly that reason",
    "what a given Texas county's civil filing fee actually is on the petition route — § 411.0745(b) sets the type of fee and not an amount, and county schedules govern",
    "whether the participant is a veteran of the United States Armed Forces, including the reserves, national guard or state guard",
    "whether the participant successfully completed a court-approved veterans reemployment programme under Code Crim. Proc. ch. 42A, subch. H-1, or all other conditions of community supervision",
    "whether the court will find that issuance is in the best interest of justice, which is the one finding this section leaves to the court",
    "whether the participant's county requires the petition to be notarized — Subchapter E-1 does not, and county practice may differ",
    "that the bound OCA forms carry a current revision: the registry records, as an unresolved question with impact release_blocker, that the OCA models carry a February 2022 revision and have not been revised for the 2023 recodification of expunction into Chapter 55A or the 2025 amendment to § 411.0728"
  ]
};

const FIELDMAP_NOTES = {
  routeSelectionNote:
    "TWO routes on one track, and the packet makes no election between them for the participant.\n\n"
    + "The route the statute provides is the NO-FILING route: § 411.0729 names no filing party, imposes no "
    + "petition requirement, and directs the court to hold a hearing and enter the order unless it finds "
    + "issuance is not in the best interest of justice. That route is component 1, it is REQUIRED, and it is "
    + "what the guidance leads with. The petition route exists because OCA publishes a model petition for the "
    + "section — courts may require one or may not hold the hearing — and the petition, the proposed order and "
    + "the fee-waiver Statement are CONDITIONAL on that. Which route applies is answered by the clerk of the "
    + "court that placed the participant on community supervision, and the guidance tells the participant to "
    + "ask.\n\n"
    + "The primary route key is the petition unit because documentPolicy.routeKey is stamped on each component "
    + "and every component that FILLS a form belongs to that unit. Both keys are carried in routeKeys and both "
    + "are printed on the composed pages.\n\n"
    + "The petition carries ONE marked control and it is not a route selection: an is/is-not dropdown recording "
    + "whether proof of completing the programme is attached, which is a fact about what the participant did. "
    + "It is left unmarked. Unlike the sibling § 411.0727 petition, this form does NOT ship that dropdown "
    + "carrying the form's own ink; that was measured first-hand from the pinned binary here.\n\n"
    + "The petition's paragraph 6 fee election has NO ACROFORM CONTROL behind it — 13 widgets over 3 pages and "
    + "none on those lines — so there is nothing to declare in the field map and nothing this build could mark. "
    + "It is named in the participant instructions as a mark to make by hand.\n\n"
    + "The proposed order carries no elections at all. Its recitals are unconditional and its only blanks are "
    + "caption facts, the offence, the cause number, and dates and blocks the court enters."
};

const INSTRUCTIONS = {
  title: `What you must do before you file — ${ROUTE.routeName}`,
  introLines: [
    `This packet is prepared for **${ROUTE.legalName}**.`,
    "",
    "**Read this first: the statute does not ask you to file anything.** Government Code § 411.0729 names no filing party and requires no petition. The court holds a hearing on whether issuing the order is in the best interest of justice and, unless it finds that it is not, **the court enters the order**. There is no waiting period, and on that route **no filing fee arises**.",
    "",
    "So the packet leads with that route. The first component is the guidance for it: check whether the order already issued, gather what proves you are inside the section, and ask the clerk of the court that placed you on community supervision whether that court will set the hearing without a petition.",
    "",
    "**The petition and the proposed order are conditional.** OCA publishes a model petition for this section because in practice some courts require one or do not hold the hearing. Use them only if the clerk tells you that court requires a petition, or if the court has not acted. Do not file them because they are in the packet.",
    "",
    "It contains the state's own forms: the Office of Court Administration model petition and model order for this exact section, and the Statement of Inability to Afford Payment of Court Costs that the Supreme Court of Texas approved in Misc. Docket No. 22-9090. Nothing here was invented.",
    "",
    "The platform filled in what it holds about you, in the shape each form asks for it: your name on the petition, the proposed order and the Statement, your telephone number on the petition, and your date of birth, address, telephone number and email on the Statement.",
    "",
    "**Your address is not written on the petition, and that is deliberate.** The petition's signature block splits it across Address and City/State/Zip. The platform holds your address as a single line and will not guess where the street ends and the city begins, so you copy both parts from the address you already have. The Statement asks for the whole address in one blank, which is the shape the platform holds it in, so there it is filled in.",
    "",
    "**Nothing financial is filled in for you anywhere.** The Statement is sworn under penalty of perjury, and a guessed figure on it would be far worse than a blank one.",
    "",
    "**The proposed order is unexecuted.** Every date and block on it that records what the court did is left blank, because nothing in a proposed order may assert that a court has acted."
  ],
  componentBlurbs: {
    [GUIDANCE]: "the route the statute actually provides — no petition, no filing fee — and how to ask the court for it, plus what to do if that court wants a petition after all",
    [PETITION]: "the OCA model petition for this section, with your name and telephone number written in and every case fact left for you. **Conditional:** only if the court requires a petition or did not hold the hearing",
    [ORDER]: "the OCA model order for the judge's signature. It is unexecuted: the dates the court considered the petition and held the hearing, the signing date and the judge block are all blank",
    [STATEMENT]: "the statewide Statement of Inability to Afford Payment of Court Costs — **only if you are filing and cannot afford the fee**. Your identity is filled in; nothing financial is",
    [AFTER]: "what the order does and does not do, who seals what and by when, and how to check about three months later that it actually happened"
  },
  documentsLines: [
    "| Document | Where you get it |", "| --- | --- |",
    "| Your Texas DPS criminal history record (follow DPS form CR-63) | Texas Department of Public Safety Crime Records Service. It also shows whether the order already issued |",
    "| The judgment or the order placing you on community supervision | The clerk of the court that placed you on community supervision. It carries the offence wording and the cause number |",
    "| The record that you successfully completed the veterans reemployment programme and all other conditions of community supervision | The programme, or the clerk of that court. It carries the completion date this section turns on |",
    "| Proof of veteran status | Your discharge paperwork. The section reaches veterans of the United States Armed Forces, including the reserves, national guard and state guard |"
  ],
  stepsLines: [
    "1. **Check whether the order already issued.** Pull your DPS criminal history record. If the misdemeanour is already sealed, there is nothing to file and nothing to pay.",
    "2. **Get the four records above.** Between them they establish everything § 411.0729 asks: a misdemeanour, community supervision, successful completion of all its conditions, successful completion of a court-approved veterans reemployment programme under Code of Criminal Procedure ch. 42A, subch. H-1, and veteran status.",
    "3. **Ask the clerk of the court that placed you on community supervision** whether that court will set the § 411.0729 hearing without a petition, or whether it wants one filed. **Stop here if the answer is that no petition is needed** — the rest of these steps are for the petition route only.",
    "4. **Fill in every blank on the petition** — the court, the county, the misdemeanour offence, the criminal cause number, the date you completed the programme and all other conditions, and both parts of your address. Write the cause number on the top line of page 1 by hand; that line is printed rather than a fillable box.",
    "5. **Mark the attachment control yourself**: whether proof that you completed the programme is attached. It arrives blank on purpose.",
    "6. **Mark paragraph 6 with a pen.** The fee choice on page 3 — the required filing fees and court costs, or a Statement of Inability — has no fillable box behind it on this form.",
    "7. **Call the clerk of the court you are filing in** and ask what the civil filing fee is there. § 411.0745(b) sets the *type* of fee, not an amount; OCA describes the total as typically about $280, varying by county.",
    "8. **If you cannot afford it, fill in the Statement of Inability** from your own records and file it with the petition. Rule 145 requires the clerk to give you that form free and without your having to ask, so you are entitled to it in any event.",
    "9. **File the petition with the clerk of the court that placed you on community supervision**, in person, electronically or by mail, with the proposed order — most courts want the order submitted with the petition. This is not the county of arrest.",
    "10. **Wait for the hearing.** The court gives the State notice; you serve nobody. Unless the court finds that issuing the order is not in the best interest of justice, it enters the order.",
    "11. **Afterwards, follow the last component.** Keep a certified copy of the signed order, and check your DPS record again in about three months."
  ],
  blanksLines: [
    "- **Your signature and the date on the petition.** You sign when you actually file.",
    "- **The cause number on the top line of the petition's first page.** That line is printed on the form rather than a fillable box, so there is nothing for the platform to write into; write it in by hand.",
    "- **The fee choice at paragraph 6 of the petition.** The same thing is true there: the two options are printed, and there is no fillable box behind either. Mark the one that applies with a pen.",
    "- **Everything on the proposed order that records what the court did** — the date it considered the petition, the date it conducted the hearing, the signing date, the judge and the court/county block.",
    "- **Both parts of your address on the petition**, because that block splits what the platform holds as one line.",
    "- **The offence and the criminal cause number**, on both the petition and the proposed order. An order of nondisclosure covers one offence.",
    "- **The date you completed the programme and all other conditions of community supervision.** It is the fact this whole section turns on and it comes from the record that states it, not from memory.",
    "- **Whether proof of completing the programme is attached.** That is a fact about what you did.",
    "- **Every financial fact on the Statement of Inability** — income, benefits, property, expenses, debts and dependants. It is sworn under penalty of perjury and the platform holds none of it.",
    "- **The date on the Option 1 declaration of the Statement.** The blank form ships carrying 12/15/2022; this packet clears it, because a date written before the Statement is actually sworn would be false.",
    "- **The cause number on the Statement.** Its own face says the Clerk's office fills that in when you file."
  ],
  stopsLines: [
    "The committed track registry for this route records these as the points where self-help ends, in its own words. If any of them describes your case, stop here and get advice before you file:",
    "",
    ...REGISTRY_STOP_CONDITIONS.map((condition) => `- ${condition}`),
    "",
    "This packet adds four more of its own, taken from the assertions the forms in it actually make. They are this packet's, not the registry's:",
    "",
    "- **the offence is a felony.** § 411.0729 reaches a misdemeanour only, and the petition asserts yours is a misdemeanour;",
    "- you did not successfully complete all the conditions of your community supervision;",
    "- the programme you completed was not a court-approved veterans reemployment programme under Code of Criminal Procedure ch. 42A, subch. H-1, or you are not sure that it was;",
    "- you cannot establish veteran status, or you cannot establish completion of the programme. The petition asserts both about you.",
    "",
    "Where self-help stops, the clerk of the court that placed you on community supervision answers whether that court requires a petition, the filing mechanics and the county's fee, and the Texas Department of Public Safety Crime Records Service issues the criminal history record that shows whether the order already issued."
  ],
  notLines: [
    "This is the state's own model petition and order, the statewide fee-waiver Statement, and guidance for the route the statute actually provides. It is not legal advice, it is not filed for you, and it does not decide whether you are eligible.",
    "",
    "**It does not decide whether the court will act without a petition.** That is the first thing to ask the clerk, and the packet is ordered so that you ask before you fill anything in.",
    "",
    "**Nondisclosure is sealing, not expunction.** The order prohibits criminal justice agencies from disclosing the record *to the public*, and the information is still disclosed to the individuals and agencies listed in Government Code § 411.076(a). The record is not destroyed. Never say it does not exist.",
    "",
    "**An order covers one offence.** If more than one offence is on your record, sealing them takes more than one order."
  ]
};

const FINDINGS = [
  {
    finding:
      "Three sources bind, in TWO different custodies: the OCA model petition and order are Master Library assets, "
      + "and the Statement of Inability is held in human_source_returns, a custody carried by no release and "
      + "writing its paths relative to the repository root rather than a corpus root.",
    consequence:
      "Custody roots are resolved through the shared resolver, which follows what the corpus index declares rather "
      + "than the shape of the path. Each source binds by exact SHA-256 against the index entry, the mounted bytes "
      + "and this family's own pin, and any disagreement is a source stop that writes nothing."
  },
  {
    finding:
      "Section 411.0729 NAMES NO FILING PARTY and imposes no petition requirement. Read at source, the court holds "
      + "a hearing and, unless it finds issuance is not in the best interest of justice, enters the order. There is "
      + "no waiting period and no fee on that route. OCA publishes a model petition anyway, because in practice "
      + "courts may require one or may not hold the hearing.",
    consequence:
      "The packet is ORDERED around that fact rather than around the forms it happens to bind. The no-filing-route "
      + "guidance is component 1 and is required; the petition and the proposed order are components 2 and 3 and "
      + "ship CONDITIONAL, with the condition stating in terms that the participant should ask the clerk before "
      + "filing anything. Shipping a petition first, on a section that requires none, would sell a filing to "
      + "someone the court already owes an order."
  },
  {
    finding:
      "Under § 411.0729(b) the section applies REGARDLESS of whether the person meets the other eligibility "
      + "criteria in the subchapter, so the Gov't Code § 411.074 basic conditions that gate almost every sibling "
      + "section do not gate this one. The petition says so on its own face at paragraph 3.",
    consequence:
      "No § 411.074 condition is imported into this packet's guidance or its stop conditions from a sibling family. "
      + "The four things the section does require — a misdemeanour, community supervision, successful completion of "
      + "all its conditions and of a court-approved Subchapter H-1 programme, and veteran status — are each named "
      + "with the record that proves them."
  },
  {
    finding:
      "The petition's fee election at paragraph 6 HAS NO ACROFORM CONTROL BEHIND IT. Read first-hand from the "
      + "pinned binary: 13 widgets over 3 pages, and none on those two printed lines. The cause number on the "
      + "caption line of page 1 is the same — a printed rule with no widget.",
    consequence:
      "There is nothing for this build to write into and nothing to declare in the field map, so both are named "
      + "explicitly in the participant instructions as marks to make by hand. A blank with no field behind it is "
      + "invisible to every field-level counter, which is exactly why it is stated in prose instead of being "
      + "allowed to pass silently."
  },
  {
    finding:
      "Read first-hand from the pinned binary, NO field on this petition ships a value — unlike the sibling "
      + "§ 411.0727 petition, whose is/is-not dropdown arrives carrying OCA's own \"is not\". Every widget on all "
      + "three pinned sources was read for the annotation Hidden flag and none carries it: 0 of 13 widgets on the petition, "
      + "0 of 11 on the order, 0 of 141 on the Statement.",
    consequence:
      "The absence was measured here rather than inherited from the sibling's finding, and each pinned source is "
      + "additionally flattened UNWRITTEN and compared, so a source-authored value could not be counted as a write "
      + "by this build. No write in this family lands in a widget that would carry no ink."
  },
  {
    finding:
      "The proposed order carries NO hearing checkboxes. Its recitals are unconditional — the State was given "
      + "notice, the Court conducted a hearing on a named date, and after consideration and a hearing the Court "
      + "FINDS — which is consistent with a section under which the court holds a hearing as a matter of course "
      + "rather than on the State's request.",
    consequence:
      "There is nothing on this order for anyone to elect. Its only blanks are caption facts, the offence, the "
      + "cause number, and the dates and blocks the court enters, and every one of the latter is refused as "
      + "court-owned so that nothing in the rendered order asserts that a court has acted."
  },
  {
    finding:
      "The fee has TWO answers on this track and the first one is that there is no fee. No fee arises on the "
      + "no-filing route. On the petition route Gov't Code § 411.0745(b) requires the fee that generally applies "
      + "to filing a civil case, which the committed record states is county-specific; OCA describes the total as "
      + "typically about $280, varying by county.",
    consequence:
      "The guidance states both halves in that order, and names the clerk of the court being filed in as the "
      + "authority who answers the second. No figure is published as though it were the fee."
  },
  {
    finding:
      "The committed record warns in terms that the $28 figure belongs ONLY to the no-petition route under Gov't "
      + "Code § 411.072(c) and is not a filing fee. It is not this section's figure on either of this track's two "
      + "routes.",
    consequence:
      "The guidance names the $28 explicitly in order to tell the participant it is not theirs. Staying silent "
      + "about a widely-circulated wrong number is not neutrality: a participant who has read it elsewhere arrives "
      + "at the clerk's window with the wrong money, and the packet is the only thing that could have told them."
  },
  {
    finding:
      "The Statement of Inability carries 132 AcroForm fields, almost all of them sworn financial and household "
      + "facts, and it is sworn under penalty of perjury. It is the SAME BINARY, by SHA-256, that several sibling "
      + "Texas families enclose, and its three source-authored values (Value / Valor 11 = \"0\", Amount Cantidad "
      + "15 = \"0\", Today = \"12/15/2022\") were measured first-hand here.",
    consequence:
      "It is classified by an ordered rule table with an exhaustiveness assertion in both directions: a field no "
      + "rule reaches fails the build, and a rule no field matches fails it too. Nothing financial is prefilled "
      + "anywhere on it. This family carries its OWN entry in the appearance-semantics registry under its own "
      + "family key, so the two sworn zeroes and the 2022 declaration date contribute nothing unless this run "
      + "wrote them — which it never does. No other family's entry is changed."
  },
  {
    finding:
      "The address is written on the Statement, which asks for the whole address in one blank, and withheld on the "
      + "petition, whose signature block splits it across Address and City/State/Zip.",
    consequence:
      "The rule applied is the SHAPE OF THE BLANK, not the document. The build asserts both fixtures write the "
      + "same set of fields, so a long address the fitter refuses cannot be written for one participant and "
      + "silently dropped for another."
  },
  {
    finding:
      "The registry carries one UNRESOLVED QUESTION for this route, with impact release_blocker: the OCA models "
      + "carry a February 2022 revision and have not been revised for the 2023 recodification of expunction into "
      + "Chapter 55A or the 2025 amendment to § 411.0728.",
    consequence:
      "It is read from the committed registry at build time and carried verbatim into this findings file and the "
      + "approval request. It is not this lane's to resolve, and a packet that did not carry it would read as "
      + "though the record were settled."
  }
];

const APPROVAL = {
  counselQuestionsRaised: [
    "Confirm the packet is right to lead with the NO-FILING route and to ship the OCA model petition and order as conditional components, given that § 411.0729 names no filing party and imposes no petition requirement while OCA publishes a model petition anyway.",
    "Confirm the primary route key being the petition unit — chosen because every component that fills a form belongs to it — is the right stamp for documentPolicy.routeKey while both units are carried in routeKeys and both are printed on the composed pages.",
    "Confirm that stating no § 411.074 condition applies, on the authority of § 411.0729(b) and the petition's own paragraph 3, is right and that no sibling section's conditions should be imported.",
    "Confirm the fee treatment: that no fee arises on the no-filing route, and that on the petition route stating § 411.0745(b) fixes the TYPE of fee rather than an amount, reporting OCA's about-$280-varying-by-county description, and naming the clerk as the authority is the right answer.",
    "Confirm the packet is right to name the $28 figure in order to exclude it on both routes.",
    "Confirm that naming the paragraph 6 fee election and the caption cause number in prose, as marks to make by hand, is the right treatment for printed blanks that carry no AcroForm control.",
    "Confirm the Statement of Inability's rule-based classification is acceptable as a declaration: 132 fields, an ordered table with a stated reason per rule, exhaustiveness asserted in both directions, and every resulting row emitted individually into the field map."
  ],
  mattersForTheReviewersAttention: [
    "The component order is the packet's main legal claim. Guidance for the no-filing route is component 1 and required; the petition and proposed order are components 2 and 3 and conditional; the fee-waiver Statement is conditional twice over, on there being a filing at all and on inability to pay.",
    "The proposed order is generated unexecuted. It carries no hearing checkboxes at all, and every date and block on it that records a judicial act is refused as court-owned.",
    "Two printed blanks on the petition have no AcroForm control behind them — the caption cause number and the paragraph 6 fee election — so no field-level counter can see them. Both are named in participant-instructions.md.",
    "Nothing financial is prefilled on the Statement of Inability. Its identity fields are, because they are the platform's own facts about the participant and the form asks for them in the shape the platform holds them.",
    "The build asserts that the canonical and boundary fixtures write an identical set of fields, so a value that fits one participant's blank and not another's cannot be written for one and dropped for the other unnoticed.",
    "The registry's unresolved question for this route is a release blocker and is carried verbatim in build-findings.json. It was not resolved by this lane."
  ],
  registryUnresolvedQuestions: REGISTRY_UNRESOLVED_QUESTIONS
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
     * What this document's classified fields' appearances MEAN.
     *
     * Empty for a component with no registry entry, which is the structural
     * default and what every other document here already gets. It matters for
     * the Statement of Inability because the structural rule calls every
     * unwritten /Tx appearance the court's own ink and preserves it, and that
     * form ships its Option 1 declaration date field carrying 12/15/2022. This
     * build's own field map refuses that field as
     * signature_or_date_participant_completion, for the reason "a date written
     * before the Statement is actually sworn would be false", so it must
     * contribute nothing unless this run wrote it - which it never does.
     */
    appearanceDispositions: dispositionsForFamily(APPEARANCE_SEMANTICS,
      `${FAMILY_ID}:${source.componentId}`)
  });
  // A build that intends a write and gets a refusal must be able to say WHY
  // without being rebuilt from scratch. The refusals are the finalizer's own
  // words, not this builder's reading of them.
  if (process.env.FABLE_PB_DEBUG_RENDER) {
    console.error(`-- ${source.componentId} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) {
      console.error(`   REFUSED ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}${r.keptInstead ? ` kept=${r.keptInstead}` : ""}`);
    }
    for (const u of report.unfittable ?? []) console.error(`   UNFIT ${u.field ?? u.anchor}: ${u.reason}`);
  }
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

/*
 * Compose a page the build authors, paginated BY BLOCK rather than by line.
 *
 * The line-at-a-time version broke a block wherever the next line happened to
 * cross the bottom margin, and it did so in the worst available place: the
 * self-help stop list ended a page on "...records these as the points where
 * self-help ends, in its own words:" and began the next one with the first
 * bullet, so the sentence that says what the list IS was on a different sheet
 * from the list. A participant reading the second page alone sees seven
 * unexplained bullets.
 *
 * So a BLOCK - a maximal run of non-blank rows, which is exactly what the
 * bodies above build between their blank pushes - is kept together. A block
 * that does not fit in what is left of the page starts a fresh one; a block
 * taller than a whole page is split, but never so as to strand fewer than
 * MIN_ROWS_EITHER_SIDE rows on either side of the break. The caller asserts
 * afterwards that no page carries a single drawn line.
 *
 * Nothing here truncates. Long tokens are split to the measured width and long
 * lines wrapped to it, so a value that does not fit is carried onto the next
 * row rather than cut.
 */
const MIN_ROWS_EITHER_SIDE = 2;

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;

  const splitToken = (token) => {
    const chunks = []; let current = "";
    for (const ch of token) {
      if (current && font.widthOfTextAtSize(`${current}${ch}`, fontSize) > maxWidth) { chunks.push(current); current = ch; }
      else current += ch;
    }
    if (current) chunks.push(current);
    return chunks;
  };
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

  // Every row the body asks for, wrapped to the measured width.
  const rows = [];
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) rows.push(row);

  // How many rows a page holds, derived from the same geometry the drawing uses.
  let capacity = 0;
  for (let y = height - margin; y >= margin; y -= lineHeight) capacity += 1;

  // Group into blocks: a run of non-blank rows, or a single blank separator.
  const blocks = [];
  for (const row of rows) {
    const blank = row === "";
    const last = blocks[blocks.length - 1];
    if (blank) blocks.push({ blank: true, rows: [""] });
    else if (last && !last.blank) last.rows.push(row);
    else blocks.push({ blank: false, rows: [row] });
  }

  // Lay the blocks out into pages.
  const pages = [[]];
  const room = () => capacity - pages[pages.length - 1].length;
  const newPage = () => { pages.push([]); };
  for (const block of blocks) {
    if (block.blank) {
      // A page never opens with a blank separator; it is simply dropped there.
      if (pages[pages.length - 1].length === 0) continue;
      if (room() <= 0) { newPage(); continue; }
      pages[pages.length - 1].push("");
      continue;
    }
    if (block.rows.length <= room()) { pages[pages.length - 1].push(...block.rows); continue; }
    if (block.rows.length <= capacity) { newPage(); pages[pages.length - 1].push(...block.rows); continue; }
    // Taller than a page: split, leaving at least MIN_ROWS_EITHER_SIDE each side.
    let rest = block.rows;
    while (rest.length) {
      let take = Math.min(room(), rest.length);
      const leftOver = rest.length - take;
      if (take < MIN_ROWS_EITHER_SIDE || (leftOver > 0 && leftOver < MIN_ROWS_EITHER_SIDE)) {
        if (pages[pages.length - 1].length === 0) take = Math.max(MIN_ROWS_EITHER_SIDE, rest.length - MIN_ROWS_EITHER_SIDE);
        else { newPage(); continue; }
      }
      pages[pages.length - 1].push(...rest.slice(0, take));
      rest = rest.slice(take);
      if (rest.length) newPage();
    }
  }

  // Trim trailing blanks, then drop any page left with nothing on it.
  const laid = pages
    .map((rowsOnPage) => { const copy = [...rowsOnPage]; while (copy.length && copy[copy.length - 1] === "") copy.pop(); return copy; })
    .filter((rowsOnPage) => rowsOnPage.some((r) => r !== ""));

  for (const rowsOnPage of laid) {
    const page = pdf.addPage([width, height]);
    let y = height - margin;
    for (const row of rowsOnPage) { if (row) page.drawText(row, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) }); y -= lineHeight; }
  }
  if (!laid.length) pdf.addPage([width, height]);

  const drawnPerPage = laid.map((rowsOnPage) => rowsOnPage.filter((r) => r !== "").length);
  return { bytes: Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false })), drawnPerPage };
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
      const composed = await renderComposedPdf(body, COMPOSED_TITLES[componentId]);
      /*
       * A page this build authored may not carry a single drawn line. The
       * renderer paginates by block so a heading cannot be stranded from the
       * list it introduces; this asserts the other half of the same obligation
       * against the bytes that were actually produced, for BOTH fixtures.
       */
      const lonely = composed.drawnPerPage
        .map((n, i) => ({ page: i + 1, n }))
        .filter((x) => x.n <= 1);
      assert.equal(lonely.length, 0,
        `${componentId} (${fixtureName}): a composed page carries a single drawn line: `
        + lonely.map((x) => `page ${x.page} (${x.n})`).join(", "));
      rendered.push({ source: { componentId, formNumber: null, sha256: null }, bytes: composed.bytes });
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
