#!/usr/bin/env node
/**
 * The Colorado arrest-record sealing family — `co_petition_seal_arrest-set`.
 *
 *   node scripts/build-census-v1-co_petition_seal_arrest-set.mjs [--check] [--no-raster]
 *
 * Two official Judicial Department forms, filed together:
 *
 *   JDF 417  Petition to Seal Arrest and Criminal Records — No Charges Filed  — the filing
 *   JDF 418  Order to Seal Arrest and Criminal Records (no charges filed)     — the proposed order
 *
 * The route is
 * `obligation:track-pathway:CO:co_petition_seal_arrest:petition-based-non-conviction-sealing-jdf-417-24-72-704`,
 * C.R.S. § 24-72-704: sealing an arrest record where no criminal charges were
 * filed.
 *
 * FOUR THINGS ABOUT THESE FORMS SHAPED THE IMPLEMENTATION.
 *
 * First, THE TWO FORMS DO NOT EXTRACT ALIKE. JDF 417's content stream reads back
 * cleanly — "Colorado County:", "Mailing Address:", "Arrest/Summons Number:
 * (from fingerprint card)" — so its printed captions are recorded per widget as
 * genuine evidence. JDF 418's does NOT: it interleaves its glyph runs, and the
 * same extractor returns "Cit\ S7 =iS Co de" for "City, State, Zip Code" and
 * "0ailing Address" for "Mailing Address". Reporting one caption basis for both
 * forms would be false in one direction or the other, so the basis is recorded
 * per document and the scrambled extraction is kept beside each JDF 418 field
 * for the reviewer who can read the paper.
 *
 * Second, SECTION 2 OF JDF 417 IS SOMEBODY ELSE'S BLOCK. The form asks who is
 * filing — the person in interest, a designated representative, a parent, or an
 * appointed legal representative — and then says "If you are not the person in
 * interest, enter their information below". The four blanks under that sentence
 * (2.1 name, 2.2 birth date, 2.3 mailing address, 2.4 phone) are THE PERSON IN
 * INTEREST's, not the filer's. Writing the participant's own name and birth date
 * into them because they are shaped like a name and a birth date would put one
 * person's identity in another person's block on a sworn petition. They are
 * refusals, carried to the participant with the condition stated, and the
 * election in section 2 is left unmade because the build does not know which of
 * the four the filer is.
 *
 * Third, QUESTION 4(b) IS THE ROUTE AND 4(c) TO 4(e) ARE THE CASE. JDF 417 is
 * the no-charges-filed form: its own subtitle is "No Charges Filed – C.R.S.
 * § 24-72-704" and the route this packet is built for says the same. So "Were
 * charges ever filed in court?" is answered — No — because a packet built for
 * one statutory route states which route it is rather than asking the
 * participant to restate it. The other three are not the route's to answer: a
 * diversion agreement, a limitations period and an open investigation are facts
 * about this case and this participant, so each is declared required before
 * filing under the case-determined exception, with the reason the route cannot
 * settle it recorded on the row itself.
 *
 * Fourth, NEITHER FORM HIDES A WIDGET. JDF 612 in the sibling conviction family
 * ships twenty-three text widgets with the annotation Hidden flag set, and a
 * write into one of them is invisible ink. Both of these forms were read for the
 * same flag from the pinned binaries — seventy widgets on JDF 417, twenty on
 * JDF 418 — and none carries it. The census reads the flags anyway and the build
 * ASSERTS that no write lands on a hidden widget, because the assertion is what
 * makes the absence evidence rather than an assumption.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
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
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "co_petition_seal_arrest-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/co/co-petition-seal-arrest-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-co_petition_seal_arrest-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "CO",
  routeKey: "obligation:track-pathway:CO:co_petition_seal_arrest:petition-based-non-conviction-sealing-jdf-417-24-72-704",
  routeSelectionId: "co-petition-seal-arrest-set-jdf-417-jdf-418",
  publicLabel: "Petition to seal arrest and criminal records where no charges were filed",
  authority: "C.R.S. § 24-72-704; Colorado Judicial Department forms JDF 417 and JDF 418",
  documents: [
    { formNumber: "JDF-417", sourceId: "official-form:JDF-417", title: "Petition to Seal Arrest and Criminal Records — No Charges Filed", instrumentKind: "primary_filing", captionsExtractCleanly: true },
    { formNumber: "JDF-418", sourceId: "official-form:JDF-417-ORDER", title: "Order to Seal Arrest and Criminal Records (no charges filed)", instrumentKind: "proposed_order", captionsExtractCleanly: false }
  ]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SUPPLY = (what) => ({ policy: "supply", what });
/*
 * A blank the CASE decides and the ROUTE cannot.
 *
 * The completeness contract refuses a route-election-shaped field left for the
 * participant, and it is right to: a packet built for one statutory route states
 * which route it is. Three of JDF 417's four sworn questions are not that. The
 * exception is auditable or it is not available, so each carries the reason the
 * route cannot settle it, on the row, in the field map.
 */
const CASE_DETERMINED = (what, whyTheRouteCannotDetermineIt) =>
  ({ policy: "supply", what, determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
const ATTORNEY = (why) => ({ policy: "attorney", why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

/*
 * An arresting, prosecuting or custodial AGENCY is a case fact, and the
 * completeness contract refuses to let a court/clerk refusal class hide one.
 * The platform holds no agency register for this participant, so each is
 * declared and disclosed by name rather than bundled into a protected class.
 */
const AGENCY = (what) => SUPPLY(what);

const FORM_FIELDS = {
  "JDF-417": {
    /* --- caption: court, parties, case (page 1) -------------------------- */
    /*
     * The form ships with "Petition" already selected, which IS this route, and
     * the packet does not write it. The shared semantics has no allowlisted fact
     * for a document title, and inventing one to state something the pinned
     * source already states would be adding a fact rather than binding one. The
     * byte proof records the tick as a documentAuthoredAppearance, from the
     * source's own value, so the artifact is not read as carrying a write here.
     */
    Title: {
      section: "Caption", selection: true, label: "Document title — Petition or Motion (selection)",
      ...ELECTION("the pinned form already selects Petition, which is the route this packet was built for; leave it as it is")
    },
    Dropdown1: {
      section: "A. Court", selection: true, label: "District Court or County Court (selection)",
      ...ELECTION("§ 24-72-704 is filed in the district court of the county where the arrest happened, and Colorado's own county courts take some of these petitions; which court holds your record is a fact about your arrest, and the form asks you to say which")
    },
    County: { section: "A. Court", label: "Colorado County", ...WRITE("matter.county") },
    "Court Address": {
      section: "A. Court", label: "Court Address",
      ...SUPPLY("the street address of the Colorado courthouse you are filing in — the Judicial Department publishes each one")
    },
    "∆": { section: "B. Parties to the Case", label: "Petitioner (or Defendant)", ...WRITE("participant.full_legal_name") },
    "Case Number": { section: "C. Case Details", label: "Case Number", ...WRITE("matter.case_number") },
    "D/C": {
      section: "C. Case Details", label: "Division/Courtroom (court use only)",
      ...PROTECT(COURT_OWNED, "the form marks this box for court use; the division and courtroom are assigned by the court")
    },

    /* --- 1. My Information ------------------------------------------------ */
    "1.1": { section: "1. My Information", label: "Name", ...WRITE("participant.full_legal_name") },
    "1.2": { section: "1. My Information", label: "Date of Birth", ...WRITE("participant.date_of_birth") },
    "∆ Street Address": { section: "1. My Information", label: "Mailing Address", ...WRITE("participant.street_address") },
    /*
     * Bound to participant.city because that is what the shared semantics binds
     * a widget NAMED `∆ City` to, and an explicit mapping that disagrees with
     * the field name is refused as a mapping conflict rather than obeyed. The
     * VALUE offered for the fact on this document is the composed city/state/zip
     * line the printed caption asks for; see PER_DOCUMENT_FACTS.
     */
    "∆ City": { section: "1. My Information", label: "City, State, & Zip", ...WRITE("participant.city") },
    "1.5": { section: "1. My Information", label: "Phone", ...WRITE("participant.phone") },
    "1.6": { section: "1. My Information", label: "Email", ...WRITE("participant.email") },
    "Group1.7": {
      section: "1. My Information", selection: true, label: "Do you need an interpreter? (selection)",
      ...ELECTION("whether you need an interpreter, and in which language, is yours to say; the platform holds no language fact for you")
    },
    "1.8": {
      section: "1. My Information", label: "Interpreter — the language you need",
      ...SUPPLY("the language you need an interpreter in, if you ticked Yes above")
    },
    "Group1.9": {
      section: "1. My Information", selection: true, label: "Attend court events in person or virtually (selection)",
      ...ELECTION("how you want to attend court events is your choice, and the form tells you how to change it later with JDF 76")
    },

    /* --- 2. Who is filing, and the person in interest's block ------------- */
    /*
     * The four blanks below belong to the PERSON IN INTEREST, and the form asks
     * for them only when the filer is somebody else. Each label carries that
     * condition, so the disclosure the participant reads says who it is for.
     */
    "Group2.0": {
      section: "2. I am", selection: true, label: "I am the person in interest, a designated representative, a parent, or an appointed legal representative (selection)",
      ...ELECTION("who you are to these records — the person they are about, or somebody filing for them — is a fact about you and your authority, not about the statute; a packet that ticked one would be swearing to a capacity it has not seen evidence of")
    },
    "2.1": {
      section: "2. I am", label: "Person in Interest — their name (only if you are not the person in interest)",
      ...SUPPLY("the name of the person the records are about, and only if that is not you — leave it blank if you ticked the first box in section 2")
    },
    "2.2": {
      section: "2. I am", label: "Person in Interest — their date of birth (only if you are not the person in interest)",
      ...SUPPLY("the birth date of the person the records are about, and only if that is not you")
    },
    "2.3": {
      section: "2. I am", label: "Person in Interest — their mailing address (only if you are not the person in interest)",
      ...SUPPLY("the mailing address of the person the records are about, and only if that is not you")
    },
    "2.4": {
      section: "2. I am", label: "Person in Interest — their phone (only if you are not the person in interest)",
      ...SUPPLY("the phone number of the person the records are about, and only if that is not you")
    },

    /* --- 3. Records to be Sealed (page 2) --------------------------------- */
    "3A.0": {
      section: "3. Records to be Sealed", selection: true, label: "Prosecuting Attorney holds records (selection)",
      ...ELECTION("which agencies hold your records is a fact about your arrest; tick every one that does")
    },
    "3B.0": {
      section: "3. Records to be Sealed", selection: true, label: "Sheriff's Department holds records (selection)",
      ...ELECTION("which agencies hold your records is a fact about your arrest; tick every one that does")
    },
    "3B.1": { section: "3. Records to be Sealed", label: "Sheriff's Department — mailing address", ...AGENCY("the mailing address of the sheriff's department that holds your records") },
    "3C": {
      section: "3. Records to be Sealed", selection: true, label: "Colorado Bureau of Investigation holds records — the form marks this one required (selection)",
      ...ELECTION("the form marks the CBI required and prints its address for you; tick it — the signed order is what reaches the CBI")
    },
    "3D.0": {
      section: "3. Records to be Sealed", selection: true, label: "A law enforcement agency holds records (selection)",
      ...ELECTION("which agencies hold your records is a fact about your arrest; tick every one that does")
    },
    "3D.1": { section: "3. Records to be Sealed", label: "Law Enforcement — the agency's name", ...AGENCY("the name of the law enforcement agency that arrested you or holds the record") },
    "4D.2": { section: "3. Records to be Sealed", label: "Law Enforcement — the agency's mailing address", ...AGENCY("the mailing address of that law enforcement agency") },
    "3D.3": { section: "3. Records to be Sealed", label: "Law Enforcement — the agency's own case number", ...AGENCY("that agency's own case number for your arrest, which is on the paperwork they gave you") },
    "3E.0": {
      section: "3. Records to be Sealed", selection: true, label: "Another custodian holds records (selection)",
      ...ELECTION("which agencies hold your records is a fact about your arrest; tick every one that does")
    },
    "3E.1": { section: "3. Records to be Sealed", label: "Other custodian — its name", ...AGENCY("the name of any other agency holding these records") },
    "3E.2": { section: "3. Records to be Sealed", label: "Other custodian — its mailing address", ...AGENCY("the mailing address of that other agency") },
    "3F.1": { section: "3. Records to be Sealed", label: "Arrest/Summons Number (from fingerprint card)", ...SUPPLY("the arrest or summons number, which is printed on your fingerprint card") },
    "3F.2": { section: "3. Records to be Sealed", label: "Date of Arrest/Summons", ...SUPPLY("the date you were arrested or served with the summons") },

    /* --- 4a. Offences ------------------------------------------------------ */
    ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((n) => [
      [`4A.${n}A`, {
        section: "4a. List of Offenses", label: `Listed Offense (row ${n})`,
        ...SUPPLY(`the ${n === 1 ? "first" : `${n}th`} offence or charge as it is written in the records you want sealed — take it from the record, do not paraphrase it`)
      }],
      [`4A.${n}B`, {
        section: "4a. List of Offenses", label: `Misdemeanor or Felony (row ${n})`,
        ...CASE_DETERMINED(
          `whether that ${n === 1 ? "first" : `${n}th`} offence was a misdemeanor or a felony, as the record states it`,
          "the route is § 24-72-704 sealing of an arrest where no charges were filed, and it reaches both misdemeanor and felony arrest records; whether a particular listed offence was charged as one or the other is a property of that offence in the record, not of the statute this packet was built for, and answering it for you would be a legal characterisation of a record this build has not seen")
      }]
    ])),

    /* --- 4b to 4e. The sworn questions (page 3) --------------------------- */
    "4B.0": {
      section: "4b. Were charges ever filed in court?",
      label: "Were charges ever filed in court? (yes or no)",
      ...CASE_DETERMINED(
        "whether charges were ever filed in court on this arrest — yes or no",
        "the form prints both Yes and No as available answers under the same statute, so § 24-72-704 does not fix one: the section reaches an arrest where no charges followed AND a case that ended in a completed diversion agreement, which is what question 4(c) beside it is for. Which of those is this participant's history is a fact about their own case, and the route selects the statute and the form rather than the case history. The packet holds no fact for it and this build does not invent one to put a sworn answer on the paper")
    },
    "4C.0": {
      section: "4c. Diversion agreement",
      label: "Did you successfully complete a diversion agreement? (yes or no)",
      ...CASE_DETERMINED(
        "whether you completed a diversion agreement for this arrest — yes or no",
        "§ 24-72-704 seals an arrest record whether or not a diversion agreement was completed, so the route does not answer this; whether one was entered and completed is a fact about this participant's own case, held by the prosecuting attorney and by them, and a packet that answered it would be swearing to a case history it has not seen")
    },
    "4D.0": {
      section: "4d. Statute of limitations",
      label: "Has the statute of limitations passed on all these charges? (yes or no)",
      ...CASE_DETERMINED(
        "whether the limitation period has run on every charge you listed — yes or no",
        "the limitation period depends on the class of each offence listed in section 4a and on the date of the arrest, and this packet fixes neither; the route selects the statute under which sealing is sought, not the age of the individual charges, so answering it here would be a legal conclusion about dates and offence classes the build does not hold")
    },
    "4E.0": {
      section: "4e. Open investigation",
      label: "Are you still being investigated for these charges? (yes or no)",
      ...CASE_DETERMINED(
        "whether you are still under investigation for these charges — yes or no",
        "whether an investigation is still open is a present fact about this participant and the investigating agency on the day the petition is signed; no route can determine it, and no record this build holds could be current enough to")
    },

    /* --- 5. Certificate of Service ---------------------------------------- */
    CoS_Date: { section: "5. Certificate of Service", label: "Certificate of Service — the date you sent it", ...PROTECT(SIGNATURE, "service has not happened when this packet is prepared, and a certificate dated before the act it certifies would be false") },
    GroupCoS: { section: "5. Certificate of Service", selection: true, label: "Certificate of Service — how you sent it (selection)", ...PROTECT(SIGNATURE, "you tick the method after you have served, not before") },
    CoS_Other: { section: "5. Certificate of Service", label: "Certificate of Service — other method, explained", ...PROTECT(SIGNATURE, "part of the certificate of service, completed after service has happened") },

    /* --- 6. Sign & Date ---------------------------------------------------- */
    Sig: { section: "6. Sign & Date", label: "Signature", ...PROTECT(SIGNATURE, "signature or date field; never prefilled — you sign it yourself") },
    Sig_Date: { section: "6. Sign & Date", label: "Signature date", ...PROTECT(SIGNATURE, "signature or date field; never prefilled — you date it on the day you sign") },
    Sig_Aty: { section: "6. Sign & Date", label: "Counsel Signature (if any)", ...ATTORNEY("attorney-only: no attorney representation fact is held for this participant, and this block is never populated with participant data") }
  },

  "JDF-418": {
    /* --- caption ----------------------------------------------------------- */
    County: { section: "A. Court", label: "Colorado County", ...WRITE("matter.county") },
    "Court Address": { section: "A. Court", label: "Court Address", ...SUPPLY("the street address of the same Colorado courthouse you are filing the petition in") },
    "∆": { section: "B. Parties / 2. Defendant's Information", label: "Petitioner (or Defendant) — full legal name", ...WRITE("participant.full_legal_name") },
    "Case Number": { section: "C. Case Details", label: "Case Number", ...WRITE("matter.case_number") },
    Division: { section: "C. Case Details", label: "Division (court use only)", ...PROTECT(COURT_OWNED, "the form marks this box for court use; the division is assigned by the court") },
    Courtroom: { section: "C. Case Details", label: "Courtroom (court use only)", ...PROTECT(COURT_OWNED, "the form marks this box for court use; the courtroom is assigned by the court") },

    /* --- 2. Defendant's Information ---------------------------------------- */
    "∆ DoB": { section: "2. Defendant's Information", label: "Birth Date", ...WRITE("participant.date_of_birth") },
    "∆ Street Address": { section: "2. Defendant's Information", label: "Mailing Address", ...WRITE("participant.street_address") },
    "∆ City": { section: "2. Defendant's Information", label: "City", ...WRITE("participant.city") },
    "∆ State": { section: "2. Defendant's Information", label: "State", ...WRITE("participant.state") },
    "∆ Zip": { section: "2. Defendant's Information", label: "Zip Code", ...WRITE("participant.zip") },

    /* --- 3. Record to be Sealed -------------------------------------------- */
    "418.3A.1": { section: "3. Record to be Sealed", label: "Law Enforcement Agency — that agency's own case number", ...AGENCY("the same law enforcement agency case number you wrote in section 3 of the petition, copied across") },
    "418.3B.1": { section: "3. Record to be Sealed", label: "Arrest number (from fingerprint card)", ...SUPPLY("the same arrest or summons number you wrote in section 3 of the petition, copied across") },
    "418.3B.2": { section: "3. Record to be Sealed", label: "Date of the arrest ordered sealed", ...SUPPLY("the same arrest date you wrote in section 3 of the petition, copied across") },

    /* --- 4 and 5. The court's own orders ----------------------------------- */
    "418.4C": { section: "4c. Other Orders", label: "By the Court — other orders", ...PROTECT(COURT_OWNED, "the decree is the court's; a proposed order that wrote the court's other orders would be drafting the judge's ruling") },
    "418.5A": { section: "So Ordered", label: "By the Court — signature", ...PROTECT(COURT_OWNED, "the judge or magistrate signs their own order") },
    "Group418.5B": { section: "So Ordered", selection: true, label: "By the Court — Judge or Magistrate (selection)", ...PROTECT(COURT_OWNED, "the officer who signs states which they are") },
    "418.5C": { section: "So Ordered", label: "By the Court — Dated", ...PROTECT(COURT_OWNED, "the court dates its own order") }
  }
};

/* ---- fixtures ------------------------------------------------------------ */
/*
 * ONE PARTICIPANT, TWO FORM SHAPES.
 *
 * JDF 417 asks for the address on two lines -- "Mailing Address:" and "City,
 * State, & Zip:" -- and names the second box `∆ City`. JDF 418 asks for the same
 * address in four boxes and names them `∆ Street Address`, `∆ City`, `∆ State`
 * and `∆ Zip`. The shared field semantics binds a widget named `∆ City` to
 * participant.city on BOTH forms, from the field name, and the name channel
 * outranks the printed caption by design.
 *
 * So the fact is the same fact and the VALUE offered for it is shaped to what
 * the document's own caption asks for: the composed city/state/zip line on the
 * petition, the town alone on the order. Writing the town alone into a box
 * captioned "City, State, & Zip" would leave the petition without a state or a
 * zip anywhere on it, in a box that reads as completed -- which is the failure
 * this factory's completeness contract exists to catch. Nothing is invented:
 * both values are composed from the participant's own city, state and zip, and
 * reports/actual-writes.json records exactly what was drawn where.
 */
const PER_DOCUMENT_FACTS = {
  canonical: { "JDF-417": { "participant.city": "Denver, CO 80202" } },
  boundary: { "JDF-417": { "participant.city": "Colorado Springs, Colorado 80921-2214" } }
};

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "412 Cherry Creek Way",
    "participant.city": "Denver",
    "participant.state": "CO",
    "participant.zip": "80202",
    "participant.phone": "303-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.county": "Denver",
    "matter.case_number": "2019CR004217"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Colorado Springs",
    "participant.state": "Colorado",
    "participant.zip": "80921-2214",
    "participant.phone": "(719) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.county": "El Paso",
    "matter.case_number": "2024CR0011882-SUPPLEMENTAL"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ------------------------------------------------------ */
/*
 * BOUND BY CONTENT, NOT BY DECLARED PATH.
 *
 * The MASTER_QUEUE row for this family names both forms at paths inside the D
 * source packs, a custody this container does not mount. The identical binaries
 * are in the Master Library at the identical SHA-256, and the committed corpus
 * index records them in both custodies. Resolution here is by exact form number
 * within the index and then by exact digest against the bytes on disk, so an
 * absent custody stops nothing and a substituted binary still stops everything.
 */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    const candidates = all.filter((e) => e.state === "CO" && e.formNumber === wanted.formNumber && e.assetClass === "FORM");
    if (candidates.length === 0) {
      failures.push({ sourceId: wanted.sourceId, why: `no entry for form number ${wanted.formNumber} in the committed corpus index` });
      continue;
    }
    const digests = new Set(candidates.map((c) => c.sha256));
    if (digests.size !== 1) {
      failures.push({ sourceId: wanted.sourceId, why: `the committed index carries ${digests.size} different binaries under form number ${wanted.formNumber}; that is a genuine ambiguity and is refused rather than guessed` });
      continue;
    }
    const sha256Expected = [...digests][0];
    // One document at two paths is one identity: try every indexed path, in a
    // deterministic order, and bind the first whose bytes hash to the digest.
    const tried = [];
    let bound = null;
    for (const entry of candidates.slice().sort((a, b) => a.path.localeCompare(b.path))) {
      for (const abs of [path.resolve(ROOT, root, entry.path), path.resolve(ROOT, entry.path)]) {
        if (!fs.existsSync(abs)) { tried.push({ path: abs, why: "not present in this checkout" }); continue; }
        const bytes = fs.readFileSync(abs);
        const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
        if (sha256 !== sha256Expected) { tried.push({ path: abs, why: `SHA-256 drift: holds ${sha256}` }); continue; }
        bound = { entry, abs, bytes, sha256, custodyRoot: abs.startsWith(path.resolve(ROOT, root)) ? "MASTER_LIBRARY_SOURCE_DIR" : "repository" };
        break;
      }
      if (bound) break;
    }
    if (!bound) {
      failures.push({ sourceId: wanted.sourceId, formNumber: wanted.formNumber, expectedSha256: sha256Expected, pathsTried: tried, why: "no mounted path holds these exact bytes" });
      continue;
    }
    resolved.push({
      /*
       * The path is recorded RELATIVE TO ITS CUSTODY ROOT, never as a filesystem
       * path. The Master Library is mounted wherever MASTER_LIBRARY_SOURCE_DIR
       * points -- in this container that is a sibling checkout -- and writing
       * the resolved path into a committed artifact would pin one machine's
       * layout into the record and move the artifact's bytes between machines.
       * The digest is the identity; the custody and the in-archive path say
       * where to look for it.
       */
      ...wanted, pathInArchive: bound.entry.path, boundFromCustody: bound.custodyRoot,
      custody: bound.entry.custody ?? null, revision: bound.entry.revision ?? null,
      sha256: bound.sha256, byteLength: bound.bytes.length, bytes: bound.bytes,
      acroFieldCount: bound.entry.acroFieldCount ?? null, pageCount: bound.entry.pageCount ?? null
    });
  }
  return { resolved, failures };
}

/* ---- census --------------------------------------------------------------- */
async function censusOf(source) {
  const spec = FORM_FIELDS[source.formNumber];
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
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
      /*
       * WHETHER THE FORM SHOWS THIS WIDGET AT ALL. Bit 1 is Invisible, bit 2 is
       * Hidden and bit 6 is NoView; any of the three means a value written here
       * would be invisible ink. Read from the pinned binary, and asserted
       * against every write below.
       */
      let flags = null;
      try { flags = w.getFlags(); } catch { flags = null; }
      const hidden = flags !== null && ((flags & 1) !== 0 || (flags & 2) !== 0 || (flags & 32) !== 0);
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary",
        annotationFlags: flags, hiddenUntilTheFormRevealsIt: hidden
      };
    });
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getSelected === "function") { const s = field.getSelected(); sourceValue = Array.isArray(s) ? (s.length ? s : null) : (s ?? null); }
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }
    rows.push({
      key: name, name, page: widgets[0]?.page ?? null, widgets, sourceValue,
      hiddenUntilTheFormRevealsIt: widgets.some((w) => w.hiddenUntilTheFormRevealsIt === true),
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      /*
       * The SHARED type vocabulary, not pdf-lib's class name.
       *
       * rcap-field-semantics.mjs writes only WRITABLE_PDF_TYPES = {"text",
       * "dropdown"} and refuses everything else as a type_guard. pdf-lib calls a
       * text field PDFTextField, so passing the lowercased class name -- "textfield"
       * -- refuses every write on both forms with a reason that reads like a defect
       * in the form. Measured: 62 of 62 fields refused on JDF 417, nineteen of them
       * as non_text_field_type on fields that are plainly text.
       */
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
      isSelectionControl: entry.selection === true
        || field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      determinedByTheCaseNotTheRoute: entry.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: entry.whyTheRouteCannotDetermineIt ?? null,
      printedTextAtCoordinate: (pageText.find((p) => p.page === (widgets[0]?.page ?? 1))?.lines ?? [])
        .filter((l) => widgets[0] && Math.abs(l.y - widgets[0].rect.y) <= 20)
        .sort((a, b) => Math.abs(a.y - widgets[0].rect.y) - Math.abs(b.y - widgets[0].rect.y))
        .slice(0, 2).map((l) => ({ y: l.y, extracted: l.text }))
    });
  }

  const dictionaryKeys = new Set(Object.keys(spec));
  for (const r of rows) dictionaryKeys.delete(r.key);
  return { rows, unmapped, stale: [...dictionaryKeys], pageText, pageCount: pages.length };
}

/* ---- render ---------------------------------------------------------------- */
function factsFor(source, fixtureName) {
  return { ...FIXTURES[fixtureName], ...(PER_DOCUMENT_FACTS[fixtureName]?.[source.formNumber] ?? {}) };
}

async function renderDocument(source, census, fixtureName) {
  const facts = factsFor(source, fixtureName);
  const writable = census.rows.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const writableNames = new Set(writable.map((r) => r.name));
  const unwritableFields = census.rows.filter((r) => !writableNames.has(r.name)).map((r) => ({ field: r.name }));

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  if (process.env.CO417_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
async function sourceInkOf(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  try { doc.getForm().flatten(); } catch { /* a form that will not flatten leaves no source ink to compare against */ }
  const bytes = await doc.save({ useObjectStreams: false, updateMetadata: false });
  const tmp = path.join(ROOT, `.co-417-source-ink-${source.formNumber}.pdf`);
  fs.writeFileSync(tmp, bytes);
  try { return await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
}

async function byteProof(source, census, artifactBytes, report, fixtureName, sourceInk = []) {
  const facts = factsFor(source, fixtureName);
  const tmp = path.join(ROOT, `.co-417-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
  fs.writeFileSync(tmp, artifactBytes);
  let widgets = [];
  try { widgets = await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  let glyphs = 0;
  for (const r of census.rows) {
    for (const wdg of r.widgets) {
      const drawn = drawnAt(widgets, { page: wdg.page, rect: wdg.rect });
      const text = drawn.map((d) => d.text).filter(Boolean);
      const ink = text.join("").trim();
      if (written.has(r.name) && r.policy === "write") {
        glyphs += ink.length;
        actualWrites.push({
          field: r.key, factId: r.fact, page: wdg.page, rect: wdg.rect,
          section: r.section, effectiveLabel: r.effectiveLabel,
          drawnText: text, expected: facts[r.fact] ?? null,
          matchesExpected: ink === String(facts[r.fact] ?? "").trim()
        });
        continue;
      }
      if (ink.length === 0) continue;
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text, sourceValue: r.sourceValue,
          note: "the pinned source already carries this value; flattening materialises the form's own default"
        });
        continue;
      }
      const inSource = drawnAt(sourceInk, { page: wdg.page, rect: wdg.rect }).map((d) => d.text).filter(Boolean);
      if (inSource.join("").trim() === ink) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text, sourceAppearanceText: inSource,
          note: "the pinned source's own widget appearance draws exactly this text; flattening materialises the form's own hint, and this build wrote nothing here"
        });
        continue;
      }
      refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: text });
    }
  }
  return { actualWrites, refusedFieldsWithInk, documentAuthoredAppearances, glyphs, appearances: widgets.length };
}

/* ---- field map ------------------------------------------------------------- */
function mapFor(source, census, report) {
  const writtenNames = new Set(report.written.map((w) => w.field));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];
  const captionsClean = source.captionsExtractCleanly === true;

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`.replace(/\[\d+\]/g, ""),
      acroFieldName: r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      captionBasis: captionsClean
        ? "printed_caption_read_from_this_form_own_text_stream_plus_authored_acroform_field_name"
        : "authored_acroform_field_name_plus_printed_section, because this form's text stream is scrambled",
      printedTextAtCoordinate: r.printedTextAtCoordinate,
      document: source.formNumber
    };

    if (r.policy === "write") {
      if (writtenNames.has(r.name)) canonicalWrites.push({ ...base, factId: r.fact, kind: r.type });
      else {
        canonicalRefusals.push({
          ...base, reason: "the finalizer refused this write; the packet does not claim a value it did not draw",
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false, why: "reported rather than claimed, so the defect is visible to the audit"
        });
      }
      continue;
    }

    if (r.isSelectionControl && r.policy !== "supply") {
      const cls = r.policy === "protect" ? r.refusalClass : r.policy === "attorney" ? null : PARTICIPANT_ELECTION;
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type,
        widgets: r.widgets, disposition: "explicit_refusal",
        reason: r.why, category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false, routeDetermined: false
      });
      continue;
    }

    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    if (r.policy === "attorney") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    canonicalRefusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${source.formNumber} field ${r.key}`,
      factId: null, routeDetermined: false,
      ...(r.determinedByTheCaseNotTheRoute
        ? { determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt }
        : {}),
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "acroform",
    captionBasis: captionsClean ? "printed_caption_from_this_document_text_stream" : "authored_field_name_and_printed_section",
    explicitMappings: Object.fromEntries(canonicalWrites.map((w) => [w.field, w.factId])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

/* ---- the builder's own count of the nine counters --------------------------- */
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
      // Forwarded exactly as verify-packet-completeness.mjs forwards them, so
      // this count and the independent one are asking the contract the same
      // question rather than two different ones.
      determinedByTheCaseNotTheRoute: r.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt ?? null,
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  const blanks = maps.flatMap((m) => [
    ...m.canonicalRefusals.map((r) => row(r)),
    ...m.selectionControls.map((c) => row(c, true))
  ]);

  const availableFacts = new Set(writes.map((w) => w.factId).filter(Boolean));
  for (const p of writeProofs) {
    for (const w of p.actualWrites) if (w.factId && String(w.drawnText.join("")).trim()) availableFacts.add(String(w.factId));
  }
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
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, why: "ink landed outside every measured write box" });
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

/* ---- artifacts ------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply,
      determinedByTheCaseNotTheRoute: r.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt ?? null
    })));
}

function participantInstructions(maps, rbf) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const elections = maps.flatMap((m) => m.selectionControls.map((c) => ({ document: m.formNumber, ...c })));

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is two Colorado Judicial Department forms, filed together:", "",
    "- **JDF 417**, _Petition to Seal Arrest and Criminal Records — No Charges Filed_ — what you file.",
    "- **JDF 418**, _Order to Seal Arrest and Criminal Records_ — the order you give the court to sign.", "",
    `Both are prepared for one route — **${ROUTE.publicLabel}** — under ${ROUTE.authority}.`, ""
  );
  out.push(
    "The platform filled in what it holds about you and your case: your name, your date of birth, your address, your "
    + "phone, your e-mail, the county and the case number, on both forms. Everything else is yours, and every one of "
    + "those blanks is listed below by the section of the form it is in.", ""
  );

  out.push("## This is the no-charges-filed form, and the packet says so", "");
  out.push(
    "JDF 417 is titled _No Charges Filed – C.R.S. § 24-72-704_, and this packet was built for that route. So section "
    + "4(b), **\"Were charges ever filed in court?\"**, is answered **No** for you. That is the route stating itself "
    + "rather than a fact the packet guessed. **If charges WERE filed in your case, this is the wrong form** — a "
    + "dismissed or acquitted charge is sealed under a different Colorado form, and you should not file this one.", ""
  );

  out.push("## Where you file this", "");
  out.push(
    "File both forms with the **clerk of the Colorado court in the county where the arrest happened** — the District "
    + "Court or the County Court you select in section A, in the county already filled in for you. The Colorado "
    + "Judicial Department publishes each courthouse's address; this packet does not state one, because the platform "
    + "holds no court directory and an unsourced address in a filing instruction is worse than none.", ""
  );
  out.push(
    "**Ask the clerk what fee applies, and what to do if you cannot pay it.** The fee position for a petition to seal "
    + "an arrest record is not established in any source this packet holds, so it is not stated here.", ""
  );

  out.push("## The Colorado Bureau of Investigation is not optional", "");
  out.push(
    "JDF 417 prints the CBI's address for you — ATTN Identification-Seals, 690 Kipling St., STE 3000, Lakewood, CO "
    + "80215 — and marks it **required**. Tick it. The signed order is what reaches the CBI, so the agency list on the "
    + "petition is what decides who is bound by it.", ""
  );

  out.push("## Section 2 is about who is filing, and it may not be about you", "");
  out.push(
    "Section 2 asks whether you are the person the records are about, or someone filing for them. **Tick one.** The "
    + "four blanks underneath — name, date of birth, mailing address and phone — belong to the **person in interest**, "
    + "and the form asks for them only if that is not you. The packet left them blank rather than copying your own "
    + "details into them: putting one person's identity into another person's block on a sworn petition would be a "
    + "false statement, not a convenience. If you ticked the first box, leave all four blank.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in every item in the tables below.** Each names the form, the section and the blank.");
  out.push("2. **Make the choices listed under _The choices that are yours_.** They are left blank on purpose.");
  out.push("3. **Get the arrest facts from the record.** Section 3 of JDF 417 asks for the arrest or summons number from your fingerprint card, the date of the arrest, and the name, address and case number of every agency holding the records. Do not estimate any of them.");
  out.push("4. **List every offence in section 4a exactly as the record writes it**, and say for each whether it was a misdemeanor or a felony.");
  out.push("5. **Answer 4(c), 4(d) and 4(e) yourself.** They are about your case, not about the statute — see the table below.");
  out.push("6. **Copy the agency case number, the arrest number and the arrest date across onto JDF 418** so the order matches the petition.");
  out.push("7. **Serve a copy on every agency you ticked in section 3**, then complete the certificate of service in section 5 — the date, the method, and who you sent it to. Do it after you have served, not before.");
  out.push("8. **Sign JDF 417 yourself, and date it when you sign.** Neither is filled in for you.");
  out.push("9. **Leave the court's own parts of JDF 418 alone.** The other-orders box, the signature, the date, and the Judge-or-Magistrate choice are the court's.");
  out.push("");

  for (const [doc, items] of byDoc) {
    const title = ROUTE.documents.find((d) => d.formNumber === doc)?.title ?? doc;
    out.push(`## ${doc} — ${title}: the items you must supply`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  const caseDetermined = rbf.filter((i) => i.determinedByTheCaseNotTheRoute);
  if (caseDetermined.length > 0) {
    out.push("## The questions this packet will not answer for you", "");
    out.push(
      "Each of these looks like a question the route could settle, and none of them is. The reason is recorded on the "
      + "form's own row in the field map, and repeated here.", ""
    );
    out.push("| Form | The question | Why the route cannot answer it |", "| --- | --- | --- |");
    for (const i of caseDetermined) out.push(`| ${i.document} | ${i.disclosureLabel} | ${i.whyTheRouteCannotDetermineIt} |`);
    out.push("");
  }

  out.push("## The choices that are yours", "");
  out.push("| Form | Section | The choice | Why it is yours |", "| --- | --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.document} | ${c.sectionHeading} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature on JDF 417, and the date beside it.** You sign it yourself, on the day you sign.");
  out.push("- **The certificate of service in section 5** — the date, the method and the explanation. Service has not happened when this packet is prepared, and a certificate dated before the act it certifies would be false.");
  out.push("- **The counsel signature block.** You are filing this yourself; no attorney-representation fact is held for you.");
  out.push("- **The Division and Courtroom boxes on both forms.** The form marks that box for court use.");
  out.push("- **The person-in-interest block in section 2 of JDF 417.** It is somebody else's block unless you are filing for somebody else.");
  out.push("- **The court's parts of JDF 418** — the other-orders box, the signature, the date and the Judge-or-Magistrate choice.");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared set of official Colorado Judicial Department forms. It is not legal advice, it is not filed for "
    + "you, and it does not decide whether your arrest record is eligible to be sealed. JDF 417 sets out what you are "
    + "swearing to in its own words. Read it before you sign it."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point -------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "a source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false
    };
  }

  const censuses = [];
  for (const source of resolved) {
    const census = await censusOf(source);
    assert.equal(census.unmapped.length, 0,
      `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 5).map((u) => u.field))}`);
    assert.equal(census.stale.length, 0,
      `${source.formNumber}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
    const writesOntoHidden = census.rows.filter((r) => r.policy === "write" && r.hiddenUntilTheFormRevealsIt === true);
    assert.equal(writesOntoHidden.length, 0,
      `${source.formNumber}: ${writesOntoHidden.length} write(s) land on a widget the form hides: ${JSON.stringify(writesOntoHidden.map((r) => r.key))}`);
    if (source.acroFieldCount != null) {
      assert.equal(census.rows.length, source.acroFieldCount,
        `${source.formNumber}: censused ${census.rows.length} fields, the committed corpus index declares ${source.acroFieldCount}`);
    }
    censuses.push({ source, census });
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      documents: censuses.map(({ source, census }) => ({
        formNumber: source.formNumber, sha256: source.sha256, boundFromCustody: source.boundFromCustody,
        fields: census.rows.length, pages: census.pageCount,
        hiddenWidgets: census.rows.filter((r) => r.hiddenUntilTheFormRevealsIt).length,
        writes: census.rows.filter((r) => r.policy === "write").length,
        supply: census.rows.filter((r) => r.policy === "supply").length,
        elections: census.rows.filter((r) => r.policy === "election").length,
        protected: census.rows.filter((r) => r.policy === "protect").length,
        attorney: census.rows.filter((r) => r.policy === "attorney").length
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "raster"), { recursive: true });

  const sourceInkByForm = new Map();
  for (const { source } of censuses) sourceInkByForm.set(source.formNumber, await sourceInkOf(source));

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const maps = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    const pageManifest = [];
    for (const { source, census } of censuses) {
      const { bytes, report } = await renderDocument(source, census, fixtureName);
      const proof = await byteProof(source, census, bytes, report, fixtureName, sourceInkByForm.get(source.formNumber) ?? []);
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.glyphs,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        documentAuthoredAppearances: proof.documentAuthoredAppearances,
        unfittable: report.unfittable,
        actualWrites: proof.actualWrites
      });
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await packet.copyPages(doc, doc.getPageIndices());
      for (const [i, p] of copied.entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), formNumber: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
      }
      if (fixtureName === "canonical") maps.push(mapFor(source, census, report));
    }

    const packetBytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents: censuses.map((c) => c.source.formNumber)
    });

    const rasterDir = `${OUT}/raster/${fixtureName}`;
    fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
    for (let i = 0; !skipRaster && i < packet.getPageCount(); i += 1) {
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
        engine: "chromium_calibrated_scripts_lib_pdf_page_raster",
        sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
      });
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const instructionsText = participantInstructions(maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number in the committed corpus index, then exact SHA-256 against the bytes on disk, over every indexed path in deterministic order",
    whyNotByDeclaredPath:
      "The MASTER_QUEUE row for this family names both forms at paths inside the D source packs, a custody this "
      + "container does not mount. The identical binaries are in the Master Library at the identical digests, and the "
      + "committed corpus index records them in both custodies. Binding by declared path would have reported two "
      + "sources absent that are byte-exact and present; binding by content resolves them and still refuses a "
      + "substituted binary.",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, boundFromCustody: r.boundFromCustody, custody: r.custody,
      sha256: r.sha256, byteLength: r.byteLength, instrumentKind: r.instrumentKind
    })),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "PER DOCUMENT, because these two forms do not extract alike. JDF 417's content stream reads back cleanly, so its "
      + "printed captions are recorded from the form's own text at each widget's coordinate and are genuine evidence. "
      + "JDF 418 interleaves its glyph runs — the same extractor returns \"Cit\\ S7 =iS Co de\" for \"City, State, Zip "
      + "Code\" — so its captions rest on Colorado's own authored field names plus the printed section, with the "
      + "scrambled extraction recorded beside each field for the reviewer who can read the paper.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      captionsExtractCleanly: source.captionsExtractCleanly === true,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      widgetsCarryingTheHiddenFlag: census.rows.filter((r) => r.hiddenUntilTheFormRevealsIt).length,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        annotationFlags: r.widgets.map((w) => w.annotationFlags),
        hiddenUntilTheFormRevealsIt: r.hiddenUntilTheFormRevealsIt === true,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        sourceValue: r.sourceValue,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      }))
    }))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    finding:
      "The two forms in this packet do not extract alike. JDF 417's text stream returns its printed captions verbatim "
      + "— \"Colorado County:\", \"Mailing Address:\", \"Arrest/Summons Number: (from fingerprint card)\". JDF 418's "
      + "interleaves its glyph runs and returns \"0ailing Address\", \"Cit\\ S7 =iS Co de\", \"PetitionerDefendant "
      + "1umber\".",
    whyThisIsNotWorkedAround:
      "A fuzzy match loose enough to accept \"Cit\\ S7 =iS Co de\" as \"City, State, Zip Code\" would pass on almost "
      + "anything, and a check that cannot fail reads as evidence while proving nothing. One caption basis is not "
      + "claimed for both documents; the basis is recorded per document and the absence is stated where it applies.",
    perDocument: censuses.map(({ source }) => ({
      document: source.formNumber,
      captionsExtractCleanly: source.captionsExtractCleanly === true,
      basis: source.captionsExtractCleanly
        ? "the printed caption read from this document's own text stream at each widget's coordinate, corroborated by Colorado's authored field name"
        : "Colorado's authored AcroForm field names plus the printed section heading; the scrambled extraction is recorded per field as evidence of why no printed-caption check is available"
    })),
    perField: censuses.flatMap(({ source, census }) => census.rows.map((r) => ({
      document: source.formNumber, field: r.key, page: r.page, rect: r.rect,
      labelThisBuildUses: r.effectiveLabel, section: r.section,
      textExtractedAtThisCoordinate: r.printedTextAtCoordinate
    })))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "acroform_fill",
    captionBasis: "per document; see reports/caption-evidence.json",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [
      {
        document: "JDF-417", field: "JDF-417/4B.0",
        printedQuestion: "Were charges ever filed in court? (yes or no)",
        statedByThePacket: "No.",
        basis:
          "JDF 417 is the no-charges-filed form — its own subtitle is \"No Charges Filed – C.R.S. § 24-72-704\" — and "
          + "the route this packet was built for is § 24-72-704 sealing of an arrest where no charges were filed. A "
          + "packet built for one statutory route states which route it is rather than asking the participant to "
          + "restate it. The participant instructions say so plainly, and say that a case where charges WERE filed "
          + "belongs on a different Colorado form."
      },
      {
        document: "JDF-417", field: "JDF-417/Title",
        printedQuestion: "Document title — Petition or Motion",
        statedByThePacket: "Petition",
        basis:
          "The route is petition-based, the form ships with Petition already selected, and the packet writes it "
          + "explicitly so the artifact states the route rather than inheriting it from a default."
      }
    ],
    routeSelectionNote:
      "The packet states the route it was built for: sealing an arrest record where no criminal charges were filed, "
      + "under C.R.S. § 24-72-704, on JDF 417 with JDF 418 as the proposed order. Section 4(b) is answered because the "
      + "route answers it. Sections 4(c), 4(d) and 4(e) are NOT: a diversion agreement, a limitation period and an "
      + "open investigation are facts about this case and this participant rather than properties of the statute, so "
      + "each is carried to the participant under the case-determined exception with the reason the route cannot "
      + "settle it recorded on its own row. The court type, the filer's capacity, the agency list and the interpreter "
      + "and attendance choices are likewise left to the participant and disclosed by name.",
    caseDeterminedExceptions: rbf.filter((i) => i.determinedByTheCaseNotTheRoute).map((i) => ({
      document: i.document, field: i.field, label: i.disclosureLabel, why: i.whyTheRouteCannotDetermineIt
    })),
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true, rasterEngine: RASTER_ENGINE, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note: "Read back from the finalized PDF bytes at every measured widget rectangle, not from the finalizer's own report.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: writeProofs.flatMap((p) => p.refusedFieldsWithInk.map((r) => ({
      fixture: p.fixture, field: r.fieldId, finding: "a field the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    thirdPartyBlanksRefusedRatherThanFilled: [
      {
        document: "JDF-417", fields: ["2.1", "2.2", "2.3", "2.4"],
        printedCondition: "If you are not the person in interest, enter their information below:",
        finding:
          "These four blanks are the PERSON IN INTEREST's name, birth date, mailing address and phone, asked for only "
          + "when the filer is somebody else. They are shaped exactly like the participant's own identity fields in "
          + "section 1, and writing the participant's details into them would put one person's identity into another "
          + "person's block on a petition sworn under oath. Each is refused, labelled with the condition, and carried "
          + "to the participant."
      }
    ],
    participantElections: maps.flatMap((m) => m.selectionControls.map((c) => ({
      document: m.formNumber, field: c.field, page: c.page, section: c.sectionHeading, label: c.effectiveLabel, why: c.reason
    }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals.filter((r) => r.requiredBeforeFiling !== true).map((r) => ({
      document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why
    }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note:
      "Every page of both fixtures is rastered for a human who did not build this family. JDF 418 cannot be "
      + "caption-checked from its own text stream, so a reviewer reading the paper is the check that a value sits "
      + "under the heading it belongs to on that form.",
    whatToLookAt: [
      "JDF 417 page 1, the caption and section 1: the county, the case number, the petitioner name, the birth date, "
        + "the street address, the city/state/zip line, the phone and the e-mail each under the heading they belong "
        + "to. The document title reads Petition.",
      "JDF 417 page 1, section 2: NOTHING ticked, and all four person-in-interest blanks empty. This is the one to "
        + "look at hardest — those four blanks are somebody else's, and a name in 2.1 would be a defect even though it "
        + "would look like a correctly filled field.",
      "JDF 417 page 2, section 3: every agency box unticked and every agency line blank, including the CBI box the "
        + "form marks required. The packet holds no agency register and does not invent one.",
      "JDF 417 page 2, section 4a: all nine offence lines blank and all nine misdemeanor/felony dropdowns unset.",
      "JDF 417 page 3: question 4(b) reads No. Questions 4(c), 4(d) and 4(e) are blank. That asymmetry is deliberate "
        + "and is the packet stating its route without answering the case's own questions.",
      "JDF 417 page 3, section 5 and 6: no service date, no service method, no explanation, no signature, no date, "
        + "and the counsel block blank.",
      "JDF 418 page 1: the county, the case number, the name in both places it appears, the birth date, the street, "
        + "the city, the state and the zip each under the heading they belong to. The text stream is scrambled on this "
        + "form, so this is the check.",
      "JDF 418 page 1, section 3: the agency case number, the arrest number and the arrest date all blank.",
      "JDF 418 page 2: the other-orders box, the signature, the date and the Judge/Magistrate choice all blank. A tick "
        + "or a signature there would be the packet drafting the court's own order."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions "
      + "over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
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
          "The MASTER_QUEUE row for this family names both sources at paths inside the D source packs "
          + "(private/source-imports/rcap-d-source-packs-2026-08-12/D3/STATES/CO/02_PACKET_FORMS/…), a custody this "
          + "container does not mount. Binding by the declared path reports both sources absent.",
        consequence:
          "The build binds by CONTENT instead: exact form number within the committed corpus index, then exact "
          + "SHA-256 against the bytes on disk over every indexed path. Both forms resolve in the Master Library at "
          + "the digests the queue pins — e0e1aefac85269087ca0f69252c501b14020a301d2cf6e5fbcc26aa5338f6dd4 for JDF 417 "
          + "and b027be364d93a1f5b879916c144260e7aeeaadc46309bf69c9478d6ad70c7993 for JDF 418. One binary in two "
          + "custodies is one identity; this is not a substituted source, and a substituted one would still be "
          + "refused. The absent custody is stated rather than worked around, and the source receipt records the path "
          + "actually read."
      },
      {
        finding:
          "The proposed order is indexed under form number JDF-418 and the queue names it "
          + "`official-form:JDF-417-ORDER`.",
        consequence:
          "Recorded so the two identifiers are not read as two documents. The source receipt carries the queue's "
          + "source id beside the form number and the digest actually bound, and the digest is the one the queue pins "
          + "for JDF-417-ORDER."
      },
      {
        finding:
          "Section 2 of JDF 417 asks for the PERSON IN INTEREST's name, birth date, mailing address and phone, and "
          + "asks for them only when the filer is not that person. Those four blanks are shaped exactly like the "
          + "participant's own identity fields in section 1 of the same page.",
        consequence:
          "All four are refused rather than written. Writing the participant's own name and birth date into another "
          + "person's block on a petition sworn under oath would be a false statement that reads, on the paper and in "
          + "any field-count check, as a correctly completed form. Each is labelled with the printed condition — "
          + "\"only if you are not the person in interest\" — declared required before filing, and disclosed under its "
          + "own heading in participant-instructions.md. The capacity election in section 2 is left unmade for the "
          + "same reason: the build has seen no evidence of the filer's authority."
      },
      {
        finding:
          "JDF 417 asks four sworn yes-or-no questions in section 4, and the completeness contract classifies every "
          + "one of them as a route election from its printed caption.",
        consequence:
          "They are not one kind of question. 4(b) — \"Were charges ever filed in court?\" — IS the route: this form "
          + "is titled \"No Charges Filed – C.R.S. § 24-72-704\" and the packet was built for that route, so the "
          + "packet states No and says so in the participant instructions, including that a case where charges were "
          + "filed belongs on a different form. 4(c), 4(d) and 4(e) are facts about this case — a diversion "
          + "agreement, a limitation period, an open investigation — and each is carried to the participant under the "
          + "case-determined exception with its own recorded reason why the route cannot settle it. Answering those "
          + "three from a route would be swearing to a case history and a legal conclusion this build has not seen."
      },
      {
        finding:
          "Neither JDF 417 nor JDF 418 carries a widget with the annotation Hidden, Invisible or NoView flag set — "
          + "seventy widgets on the petition and twenty on the order, all visible.",
        consequence:
          "Stated as a measurement rather than assumed. The sibling family co_motion_seal_conviction-set builds on "
          + "JDF 612, which ships twenty-three hidden text widgets, and a case-number write into one of them was "
          + "reported by the finalizer while carrying no ink in the bytes. The census here reads the annotation flags "
          + "from the pinned binaries and the build ASSERTS that no write lands on a hidden widget, so the absence is "
          + "evidence and stays evidence if Colorado revises either form."
      },
      {
        finding:
          "The two forms do not extract alike. JDF 417's content stream returns its printed captions verbatim; JDF "
          + "418's interleaves its glyph runs and returns \"0ailing Address\" for \"Mailing Address\" and \"Cit\\ S7 "
          + "=iS Co de\" for \"City, State, Zip Code\".",
        consequence:
          "One caption basis is not claimed for both. JDF 417's captions are recorded from the form's own text at "
          + "each widget's coordinate and are genuine evidence; JDF 418's rest on Colorado's authored field names plus "
          + "the printed section, with the scrambled extraction recorded per field. The per-document basis is in "
          + "reports/caption-evidence.json and on every row of the field map."
      },
      {
        finding:
          "JDF 417 asks for the participant's address on two lines — \"Mailing Address:\" and \"City, State, & Zip:\" "
          + "— and JDF 418 asks for it in four boxes: street, city, state and zip.",
        consequence:
          "The packet holds both shapes and writes each form what its own caption asks for: a street-only value plus a "
          + "composed city/state/zip line on the petition, and four separate values on the order. Neither form is "
          + "given a value its caption did not ask for. The sibling co_motion_seal_conviction-set has the opposite "
          + "shape and records the duplication it produces; this family does not have it."
      },
      {
        finding:
          "Section 3 of JDF 417 asks which agencies hold the records, and for each one a name, a mailing address and "
          + "that agency's own case number. The completeness contract refuses to let a court or clerk refusal class "
          + "excuse an agency fact.",
        consequence:
          "Every agency name, address and case number is declared REQUIRED_BEFORE_FILING and named to the participant "
          + "in participant-instructions.md, rather than being bundled into a protected class. The CBI box the form "
          + "marks required is left for the participant to tick, with the instruction to tick it, because the "
          + "finalizer does not write checkboxes and a packet that claimed the tick without drawing it would be "
          + "claiming a value the paper does not show."
      },
      {
        severity: "advisory",
        finding:
          "A boundary value that does not fit its line at the minimum readable font is refused by the shared finalizer "
          + "rather than clipped.",
        consequence:
          "Recorded in reports/actual-writes.json under unfittable, with the measured width. That is the boundary "
          + "fixture doing its job; the canonical fixture writes the value."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    mattersForTheReviewersAttention: [
      "reports/blanks-left-for-the-participant.json — the four person-in-interest blanks in section 2 of JDF 417 are "
        + "refused on purpose. Confirm none of them carries the participant's own details.",
      "production-field-map.json routeDeterminedSelections — the packet answers question 4(b) No and leaves 4(c) to "
        + "4(e) to the participant. Counsel should confirm that asymmetry.",
      "reports/caption-evidence.json — JDF 418 cannot be caption-checked from its own text stream, so visual review "
        + "carries more weight on that form than on the petition."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, documents: resolved.map((r) => r.formNumber),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    participantElections: maps.reduce((n, m) => n + m.selectionControls.length, 0),
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
