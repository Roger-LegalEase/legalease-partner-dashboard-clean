#!/usr/bin/env node
/**
 * The Maryland § 10-105(c)(1) early-expungement family — `md_10105_early-set`.
 *
 *   node scripts/build-census-v1-md_10105_early-set.mjs [--check] [--raster]
 *
 * TWO MARYLAND JUDICIARY FORMS, AND THE SECOND ONE IS CONDITIONAL BECAUSE THE
 * FIRST ONE ALREADY CARRIES IT.
 *
 *   CC-DC-CR-072C (Rev. 01/2025)  Petition for Expungement of Records —
 *                                 Acquittal, Dismissal, Not Guilty, or Nolle
 *                                 Prosequi (LESS THAN 3 YEARS HAS PASSED SINCE
 *                                 DISPOSITION). One sheet. The lower half of
 *                                 that same sheet is "Form 4-503.2 GENERAL
 *                                 WAIVER AND RELEASE (Criminal Procedure
 *                                 §10-105)" — read out of the binary's own text
 *                                 stream at y=200 of page 1.
 *   CC-DC-CR-078  (Rev. 01/2025)  The standalone Form 4-503.2 General Waiver
 *                                 and Release.
 *
 * The committed packet-set manifest declares CC-DC-CR-078 `conditional`, and
 * states the condition in its own words: "Where the alternative route is used:
 * CC-DC-CR-072A plus a standalone waiver." That is not a footnote. The waiver
 * is what makes this route early — Crim. Proc. § 10-105(c)(1) removes the
 * three-year wait only where a written general waiver and release is filed with
 * the petition — and CC-DC-CR-072C prints one on its own face. Delivering
 * CC-DC-CR-078 as though it were a second waiver to sign alongside 072C would
 * hand the participant two releases of the same tort claims for one charge.
 *
 * So both documents are rendered, in the manifest's component order, and the
 * packet says on its own instructions page which one a 072C filer files and
 * which one is the alternative-route sheet. The condition travels with the
 * component in production-field-map.json and reports/rendered-artifacts.json.
 *
 * THE WAIVER IS THE PRODUCT DECISION THIS ROUTE TURNS ON, AND THE COMMITTED
 * RECORD SAYS SO IN TERMS
 *
 * legal-design-track-registry.json carries, for md_10105_early, a limitation
 * classified `packet_instruction` and sourced to the Maryland legal review:
 * "whenever this route is offered, tell the participant that waiting costs
 * nothing and preserves their tort claim, and that filing now trades that claim
 * for speed. Presenting this route without that comparison is a defect." The
 * participant instructions therefore lead with it, and with the § 10-105.1
 * automatic route the same record says to surface first. Both sentences are
 * generated from that record, which is hashed into the source receipt.
 *
 * THREE PHONE BOXES, TWO TREATMENTS, AND THE REASON IS THE FORM'S OWN CAPTIONS
 *
 * CC-DC-CR-072C prints one unqualified "Telephone" under the defendant column,
 * and the platform's contact number is written there. CC-DC-CR-078 prints "Home
 * Telephone" and "Work Telephone" as separate boxes; the platform holds one
 * unqualified number and no fact about which kind it is, so both are refused and
 * carried to the participant. Writing the same number into two boxes that ask
 * different questions would assert something nobody told us — the finding the
 * North Dakota pardon family measured first, applied here to Maryland's own
 * captions.
 *
 * WHAT IS MEASURED RATHER THAN ASSERTED
 *
 *   - Every source is bound by SHA-256 against the committed corpus index and
 *     then against the bytes on disk. CC-DC-CR-072C is held in the partial
 *     Nationwide recovery pool, not in the Master Library, and the receipt says
 *     which custody produced the bytes.
 *   - Every caption this build uses is checked against the printed text of the
 *     page the widget sits on. Both Maryland forms extract clean text.
 *   - Both output-byte glyph readings are MEASURED from the produced PDF:
 *     addedGlyphsReadFromOutputBytes at the measured write boxes, and
 *     nonWhitespaceGlyphsOutsideMeasuredWriteBoxes by differencing every
 *     flattened appearance in the artifact against the same document flattened
 *     with nothing written on it.
 *
 * This build rasterizes nothing by default. A local browser render is not a
 * receipt: the central raster workflow produces one, bound to the exact SHA-256
 * recorded in reports/rendered-artifacts.json. `--raster` opts in for a local
 * look and never changes the fixture bytes.
 *
 * This lane does not verify its own packets and issues no verdict.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "md_10105_early-set";
const TRACK_ID = "md_10105_early";
const OUT = "data/rcap-all50/overlays/census-v1/md/md-10105-early-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-md_10105_early-set.mjs";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

const ROUTE = Object.freeze({
  jurisdiction: "MD",
  routeKey: "obligation:track-pathway:MD:md_10105_early:adult-non-conviction-expungement-under-crim-proc-10-105",
  routeSelectionId: "md-10105-early-set-cc-dc-cr-072c-cc-dc-cr-078",
  publicLabel: "Ask the court to expunge now instead of waiting three years",
  legalName: "Petition for Expungement with General Waiver and Release under \u00a7 10-105(c)(1)",
  authority: "Md. Code, Crim. Proc. \u00a7 10-105(c)(1); Md. Rule 4-503.2; Maryland Judiciary forms CC-DC-CR-072C and CC-DC-CR-078 (Rev. 01/2025)",
  documents: [
    {
      formNumber: "CC-DC-CR-072C",
      sourceId: "official-form:CC-DC-CR-072C",
      componentId: "md_10105_early-primary-filing-1",
      title: "Petition for Expungement of Records - Acquittal, Dismissal, Not Guilty, or Nolle Prosequi (less than 3 years since disposition)",
      instrumentKind: "primary_filing",
      requirement: "required",
      condition: null,
      sha256: "9faa52511adfce4c33a63fbc983f5999d288af2579c63f4425dd39714607c5ac",
      declaredPath: "LegalEase Maryland/LegalEase Maryland forms /ccdccr072c.pdf"
    },
    {
      formNumber: "CC-DC-CR-078",
      sourceId: "official-form:CC-DC-CR-078",
      componentId: "md_10105_early-attachment-2",
      title: "General Waiver and Release (Form 4-503.2)",
      instrumentKind: "attachment",
      requirement: "conditional",
      condition: "Where the alternative route is used: CC-DC-CR-072A plus a standalone waiver.",
      sha256: "6dc8f576c2fe488b488948c6d50e0137c2fd9781a904179219c491b2f776ea1b",
      declaredPath: "STATES/MD/02_PACKET_FORMS/MD__FORM__CC-DC-CR-078__general-waiver-and-release__REV-2025-01__EN.pdf"
    }
  ]
});

/* The committed records this packet's prose is generated from. Each is hashed
 * whole, and this family's own entry is hashed separately, so an edit to a
 * shared national record is visible and an edit that touched THIS family is
 * distinguishable from one that did not. */
const RECORDS = Object.freeze({
  registry: "data/record-clearing/legal-design-track-registry.json",
  manifest: "data/record-clearing/legal-design-packet-set-manifests.json",
  census: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
  queue: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json",
  buildability: "data/rcap-grade-a/source-wave-integration/SOURCE_READY_BUILDABILITY.json"
});

/* ---- policies ------------------------------------------------------------- */
const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
const ATTORNEY = (why) => ({ policy: "attorney", why });
const VIEWER = (why) => ({ policy: "viewer", why });
const OPTIONAL = (what) => ({ policy: "optional", what });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const ATTORNEY_ONLY = "attorney-only; no attorney-representation fact is held for this participant, and this packet is prepared for a person filing without one";
const VIEWER_CONTROL = "a Reset control the Judiciary put on the form for the person reading it on screen; never a filing fact";
const SIGN_IT_YOURSELF = "you sign it yourself; a signature the packet drew would not be yours";
const DATE_IT_YOURSELF = "you date it on the day you sign; a date written in advance would be false on a document sworn under penalties of perjury";

const FORM_FIELDS = {
  "CC-DC-CR-072C": {
    Reset: { section: "Viewer controls", label: "Reset this form (viewer control)", ...VIEWER(VIEWER_CONTROL) },

    /* --- the court block at the head of the sheet ------------------------- */
    "Circuit Court": {
      section: "Court", selection: true, label: "Circuit Court (selection)",
      ...ELECTION("tick the court that heard your case. Sec. 10-105(b) puts this petition in the court where the proceeding began, and whether that was a circuit court or the District Court of Maryland is a fact about your own case")
    },
    "District Court": {
      section: "Court", selection: true, label: "District Court of Maryland (selection)",
      ...ELECTION("tick this instead if the District Court of Maryland heard your case")
    },
    "Court's City/County": {
      section: "Court", selection: true, label: "City/County of the court (selection)",
      ...ELECTION("choose, from the list the form itself offers, the city or county whose court heard your case. The list separates circuit court locations from District Court locations, so the entry you choose must match the box you ticked")
    },
    "Court's Address": {
      section: "Court", label: "Court Address",
      ...SUPPLY("the street address of that courthouse. The Maryland Judiciary publishes it; this packet holds no court directory and does not state an address it cannot source")
    },
    "Case No": { section: "Court", label: "Case No.", ...WRITE("matter.case_number") },
    "Tracking Number": {
      section: "Court", label: "Tracking #",
      ...SUPPLY("the tracking number, if your case record shows one. Maryland Judiciary Case Search prints it on the case record; leave it empty if there is none")
    },
    "Defendant Name": { section: "Caption", label: "Defendant", ...WRITE("participant.full_legal_name") },
    "Date of Birth": { section: "Caption", label: "Defendant DOB", ...WRITE("participant.date_of_birth") },

    /* --- paragraph 1: the arrest ------------------------------------------ */
    Date: {
      section: "Paragraph one - the arrest, summons or citation", label: "Date of the arrest, summons or citation",
      ...SUPPLY("the date you were arrested, served with a summons, or served with a citation. Your case record from Maryland Judiciary Case Search carries it")
    },
    arrested: {
      section: "Paragraph one - the arrest, summons or citation", selection: true, label: "I was arrested (selection)",
      ...ELECTION("tick whichever of the three happened to you. The form says to check one of the three, and which one is a fact about your own case")
    },
    "served with a summons": {
      section: "Paragraph one - the arrest, summons or citation", selection: true, label: "I was served with a summons (selection)",
      ...ELECTION("tick this instead if you were served with a summons rather than arrested")
    },
    "served with citation": {
      section: "Paragraph one - the arrest, summons or citation", selection: true, label: "I was served with a citation (selection)",
      ...ELECTION("tick this instead if you were served with a citation")
    },
    "Law Enforcement Agency": {
      section: "Paragraph one - the arrest, summons or citation", label: "Law Enforcement Agency",
      ...SUPPLY("the law enforcement agency whose officer arrested, summonsed or cited you, as the charging document names it. This is the same agency the waiver below releases, so the two must name it the same way")
    },
    "City/County of Law Enforcement Agency": {
      section: "Paragraph one - the arrest, summons or citation", label: "City or county where it happened",
      ...SUPPLY("the Maryland city or county where the arrest, summons or citation happened - this is where the incident was, not where you live")
    },
    "as the result of the following incident": {
      section: "Paragraph one - the arrest, summons or citation", label: "The incident that led to the charge - first line",
      ...SUPPLY("what happened, in your own words and in the space the form gives you. Two printed lines are provided and this is the first")
    },
    "as the result of the following incident_1": {
      section: "Paragraph one - the arrest, summons or citation", label: "The incident that led to the charge - second line",
      ...SUPPLY("the rest of that description, on the second printed line")
    },

    /* --- paragraph 2: the charge ------------------------------------------ */
    "charged with the offense of": {
      section: "Paragraph two - the charge", label: "The offense you were charged with",
      ...SUPPLY("the offense as the charging document names it. List every charge in the incident, not only the one you want cleared - \u00a7 10-107(b)(1) treats charges arising from one incident as a unit, and one ineligible charge in a unit can defeat the whole unit")
    },

    /* --- paragraph 3: the disposition ------------------------------------- */
    "Date charge was disposed": {
      section: "Paragraph three - how the charge ended", label: "Date the charge was disposed of",
      ...SUPPLY("the date the case ended, from your case record")
    },
    acquitted: {
      section: "Paragraph three - how the charge ended", selection: true, label: "I was acquitted of the charge(s) (selection)",
      ...ELECTION("tick every one of the four that is true and correct for your case. How your charge ended is a fact about your own record, and by signing you affirm each box you ticked")
    },
    "the charges was otherwise dismissed": {
      section: "Paragraph three - how the charge ended", selection: true, label: "The charge(s) was otherwise dismissed (selection)",
      ...ELECTION("tick this if the charge was otherwise dismissed")
    },
    "found not guilty": {
      section: "Paragraph three - how the charge ended", selection: true, label: "I was found not guilty (selection)",
      ...ELECTION("tick this if you were found not guilty")
    },
    "nolle prosequi": {
      section: "Paragraph three - how the charge ended", selection: true,
      label: "A nolle prosequi was entered, without a drug or alcohol treatment requirement (selection)",
      ...ELECTION("tick this only if a nolle prosequi was entered WITHOUT a requirement of drug or alcohol treatment. A nolle prosequi entered with a treatment requirement is outside this route, and so are probation before judgment and stet")
    },

    /* --- paragraphs 4 and 5: transfers ------------------------------------ */
    "Case transferred to juvenile court": {
      section: "Paragraphs four and five - transfers", selection: true,
      label: "The case was transferred to the juvenile court under Crim. Proc. \u00a7\u00a7 4-202 or 4-202.2 (selection)",
      ...ELECTION("tick this only if your case was transferred to the juvenile court. The form's own note says this petition must then be filed in the court that issued the transfer order, and that the expungement reaches the criminal records rather than the juvenile ones")
    },
    "transferred to another court": {
      section: "Paragraphs four and five - transfers", selection: true,
      label: "The case began in one court and was transferred to another (selection)",
      ...ELECTION("tick this only if your case began in one court and was transferred to another court that is not the juvenile court. The form's own note says the petition must then be filed in the court it was transferred to")
    },

    /* --- the signature block, attorney column (left) ---------------------- */
    "Signature of Attorney": { section: "Signature block - attorney column", label: "Signature of Attorney", ...ATTORNEY(ATTORNEY_ONLY) },
    "Attorney Number": { section: "Signature block - attorney column", label: "Attorney Number", ...ATTORNEY(ATTORNEY_ONLY) },
    Date_3: { section: "Signature block - attorney column", label: "Date of the attorney signature", ...ATTORNEY(ATTORNEY_ONLY) },
    "Printed Name of Attorney": { section: "Signature block - attorney column", label: "Attorney Printed Name", ...ATTORNEY(ATTORNEY_ONLY) },
    "Attorney Address": { section: "Signature block - attorney column", label: "Attorney Address", ...ATTORNEY(ATTORNEY_ONLY) },
    "City State Zip": { section: "Signature block - attorney column", label: "Attorney City, State, Zip", ...ATTORNEY(ATTORNEY_ONLY) },
    "Attorney Telephone": { section: "Signature block - attorney column", label: "Attorney Telephone", ...ATTORNEY(ATTORNEY_ONLY) },
    "Attorney Email Address": { section: "Signature block - attorney column", label: "Attorney E-mail", ...ATTORNEY(ATTORNEY_ONLY) },
    "Attorney Fax Number": { section: "Signature block - attorney column", label: "Attorney Fax", ...ATTORNEY(ATTORNEY_ONLY) },

    /* --- the signature block, defendant column (right) -------------------- */
    "Signature of Defendant": { section: "Signature block - defendant column", label: "Signature of Defendant", ...PROTECT(SIGNATURE, `${SIGN_IT_YOURSELF}, and on this petition your signature is the affirmation under penalties of perjury that every box you ticked is true`) },
    Date_4: { section: "Signature block - defendant column", label: "Date of the defendant signature", ...PROTECT(SIGNATURE, DATE_IT_YOURSELF) },
    "Printed Name of Defendant": { section: "Signature block - defendant column", label: "Defendant Printed Name", ...WRITE("participant.full_legal_name") },
    "Defendant Address": { section: "Signature block - defendant column", label: "Defendant Address", ...WRITE("participant.street_address") },
    "City State Zip_2": { section: "Signature block - defendant column", label: "Defendant City, State, Zip", ...WRITE("participant.city_state_zip") },
    "Defendant Telephone": { section: "Signature block - defendant column", label: "Defendant Telephone", ...WRITE("participant.phone") },
    "Defendant Email Address": { section: "Signature block - defendant column", label: "Defendant E-mail", ...WRITE("participant.email") },
    "Defendant Fax #": {
      section: "Signature block - defendant column", label: "Defendant Fax (optional)",
      ...OPTIONAL("a fax number, if you have one. Most people do not, and the line is left empty rather than filled with something else")
    },

    /* --- Form 4-503.2, printed on the lower half of the same sheet -------- */
    "Name of Person Signing Waiver": {
      section: "General Waiver and Release (Form 4-503.2) on the same sheet", label: "Name of the person signing the waiver",
      ...WRITE("participant.full_legal_name")
    },
    "Complainant's Name": {
      section: "General Waiver and Release (Form 4-503.2) on the same sheet", label: "Complainant",
      ...SUPPLY("the name of the complainant, as the charging document names them. This is the person the waiver releases along with the agency, and the packet does not guess at who they were")
    },
    "Law Enforcement Agency Name": {
      section: "General Waiver and Release (Form 4-503.2) on the same sheet", label: "Law Enforcement Agency named in the waiver",
      ...SUPPLY("the same law enforcement agency you named in paragraph 1, written the same way. This line is what the release runs against")
    },
    "date of arrest, detention or confinement": {
      section: "General Waiver and Release (Form 4-503.2) on the same sheet", label: "Date of the arrest, detention or confinement",
      ...SUPPLY("the date of the arrest, detention or confinement the waiver releases claims about - the same date you gave in paragraph 1")
    },
    "day of": {
      section: "General Waiver and Release (Form 4-503.2) on the same sheet", label: "Witness clause - day of the month you sign",
      ...PROTECT(SIGNATURE, DATE_IT_YOURSELF)
    },
    Month: {
      section: "General Waiver and Release (Form 4-503.2) on the same sheet", label: "Witness clause - month you sign",
      ...PROTECT(SIGNATURE, DATE_IT_YOURSELF)
    },
    Year: {
      section: "General Waiver and Release (Form 4-503.2) on the same sheet", label: "Witness clause - year you sign",
      ...PROTECT(SIGNATURE, DATE_IT_YOURSELF)
    },
    "Witness Signature": {
      section: "General Waiver and Release (Form 4-503.2) on the same sheet", label: "Witness Signature",
      ...PROTECT(SIGNATURE, "your witness signs this, in front of you, on the day you sign the waiver")
    },
    "Printed Name of Witness": {
      section: "General Waiver and Release (Form 4-503.2) on the same sheet", label: "Printed Name of Witness",
      ...SUPPLY("your witness's name, printed. The platform holds no fact about who witnesses your signature")
    },
    "Petitioner's Signature": {
      section: "General Waiver and Release (Form 4-503.2) on the same sheet", label: "Petitioner Signature",
      ...PROTECT(SIGNATURE, `${SIGN_IT_YOURSELF}. Signing this waiver gives up your tort claims against the arresting agency and its officers arising from this charge`)
    }
  },

  "CC-DC-CR-078": {
    Reset: { section: "Viewer controls", label: "Reset this form (viewer control)", ...VIEWER(VIEWER_CONTROL) },

    "Circuit Court": {
      section: "Court", selection: true, label: "Circuit Court (selection)",
      ...ELECTION("tick the same court you ticked on the petition")
    },
    "District Court": {
      section: "Court", selection: true, label: "District Court of Maryland (selection)",
      ...ELECTION("tick the same court you ticked on the petition")
    },
    "Court's City/County": {
      section: "Court", selection: true, label: "City/County of the court (selection)",
      ...ELECTION("choose the same city or county you chose on the petition")
    },
    "Court's Address": { section: "Court", label: "Court Address", ...SUPPLY("the same courthouse address you wrote on the petition") },
    "Case No": { section: "Court", label: "Case No.", ...WRITE("matter.case_number") },

    "Defendant name": { section: "Caption", label: "Defendant", ...WRITE("participant.full_legal_name") },
    "Defendant Address": { section: "Caption", label: "Defendant Address", ...WRITE("participant.street_address") },
    "City, State, Zip": { section: "Caption", label: "Defendant City, State, Zip", ...WRITE("participant.city_state_zip") },
    /*
     * BOTH PHONE BOXES ARE REFUSED, INCLUDING THE ONE THAT WOULD BIND.
     *
     * This form asks separately for a home number and a work number. The
     * platform holds one unqualified contact number and no fact about which
     * kind it is, so writing it into the home box would assert something
     * nobody told us, and writing it into both would put one number in two
     * boxes that ask different questions. CC-DC-CR-072C prints one unqualified
     * "Telephone" and that box IS written.
     */
    "Defendant Home Telephone": {
      section: "Caption", label: "Defendant Home Telephone",
      ...SUPPLY("your home telephone number, if you have one. This form asks for a home number and a work number separately, and the platform holds one contact number without knowing which it is - so you put your numbers in the boxes that describe them")
    },
    "Defendant Work Telephone": {
      section: "Caption", label: "Defendant Work Telephone",
      ...SUPPLY("your work telephone number, if you have one")
    },

    "Name Of Petitioner": {
      section: "The release", label: "Name of the person signing the waiver",
      ...WRITE("participant.full_legal_name")
    },
    "Complainant's Name": {
      section: "The release", label: "Complainant",
      ...SUPPLY("the name of the complainant, as the charging document names them - the same name you used on the petition")
    },
    "Law Enforcement Agency": {
      section: "The release", label: "Law Enforcement Agency named in the waiver",
      ...SUPPLY("the law enforcement agency the release runs against, named exactly as the charging document names it")
    },
    "Date of arrest, detention or confinement": {
      section: "The release", label: "Date of the arrest, detention or confinement",
      ...SUPPLY("the date of the arrest, detention or confinement this release covers")
    },

    Day: { section: "Witness clause", label: "Witness clause - day of the month you sign", ...PROTECT(SIGNATURE, DATE_IT_YOURSELF) },
    Month: { section: "Witness clause", label: "Witness clause - month you sign", ...PROTECT(SIGNATURE, DATE_IT_YOURSELF) },
    Year: { section: "Witness clause", label: "Witness clause - year you sign", ...PROTECT(SIGNATURE, DATE_IT_YOURSELF) },
    "Witness Signature": { section: "Witness clause", label: "Witness Signature", ...PROTECT(SIGNATURE, "your witness signs this, in front of you, on the day you sign") },
    "Printed Name of Witness": { section: "Witness clause", label: "Printed Name of Witness", ...SUPPLY("your witness's name, printed") },
    "Petitioner Signature": {
      section: "Witness clause", label: "Petitioner Signature",
      ...PROTECT(SIGNATURE, `${SIGN_IT_YOURSELF}. Signing this waiver gives up your tort claims against the arresting agency and its officers arising from this charge`)
    }
  }
};

/* ---- fixtures ------------------------------------------------------------- */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "412 Charles Street",
    "participant.city_state_zip": "Baltimore, MD 21201",
    "participant.phone": "410-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.case_number": "1B02194217"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city_state_zip": "Prince Frederick, Maryland 20678-2214",
    "participant.phone": "(410) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org",
    "matter.case_number": "C-04-CR-24-0011882-SUPPLEMENTAL"
  }
};

/* ---- small helpers -------------------------------------------------------- */
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
};
const entryDigest = (value) => sha256(Buffer.from(stable(value), "utf8"));
const flat = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function readRecord(rel) {
  const bytes = fs.readFileSync(path.join(ROOT, rel));
  return { path: rel, bytes, data: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes), byteLength: bytes.length };
}

/* ---- the committed records ------------------------------------------------ */
/*
 * Every sentence of guide prose below that states a rule, a fee, a service
 * practice or a limitation comes from one of these entries. They are hashed
 * whole and per family, and the assertions here state the shape this build was
 * written against, so a record that moves stops the build rather than silently
 * changing what the packet tells a participant.
 */
function loadControllingRecords() {
  const loaded = Object.fromEntries(Object.entries(RECORDS).map(([k, rel]) => [k, readRecord(rel)]));
  const pins = [];
  const pin = (key, pointer, entry) => {
    const record = loaded[key];
    pins.push({
      record: record.path, wholeFileSha256: record.sha256, byteLength: record.byteLength,
      thisFamilysEntry: pointer, thisFamilysEntrySha256: entryDigest(entry),
      whyBothPinsExist: "the whole-file pin detects any edit to a shared national record; the entry pin says whether the edit touched this family"
    });
    return entry;
  };

  const track = loaded.registry.data.tracks.find((t) => t.trackId === TRACK_ID);
  assert.ok(track, `${RECORDS.registry} carries no track ${TRACK_ID}`);
  assert.equal(track.jurisdiction, "MD");
  assert.equal(track.outputStrategy, "official_pdf_fill");
  assert.ok(track.rules && typeof track.rules.fees === "string" && track.rules.fees.length > 0,
    "the track registry states no fee for this route; this build states no fee it cannot source");
  assert.ok(Array.isArray(track.packetInstructions) && track.packetInstructions.length > 0);
  assert.ok(Array.isArray(track.selfHelpStopConditions) && track.selfHelpStopConditions.length > 0);
  pin("registry", `tracks[trackId=${TRACK_ID}]`, track);

  const packetSet = loaded.manifest.data.packetSets.find((p) => p.packetSetId === FAMILY_ID);
  assert.ok(packetSet, `${RECORDS.manifest} carries no packet set ${FAMILY_ID}`);
  const components = [...packetSet.components].sort((a, b) => a.order - b.order);
  assert.deepEqual(components.map((c) => c.officialFormId), ROUTE.documents.map((d) => d.formNumber),
    "the committed component set no longer names the two forms this build renders, in this order");
  assert.deepEqual(components.map((c) => c.componentId), ROUTE.documents.map((d) => d.componentId));
  assert.deepEqual(components.map((c) => c.requirement), ROUTE.documents.map((d) => d.requirement),
    "a component's requirement has changed; this build states the requirement it was written against");
  assert.equal(components[1].conditionDescription, ROUTE.documents[1].condition,
    "the condition on the CC-DC-CR-078 component has changed; the packet repeats that condition verbatim to the participant");
  pin("manifest", `packetSets[packetSetId=${FAMILY_ID}]`, packetSet);

  const routes = (loaded.census.data.routes ?? []).filter((r) => r.packetSetId === FAMILY_ID);
  assert.equal(routes.length, 1, `expected exactly one census route for ${FAMILY_ID}`);
  assert.equal(routes[0].routeKey, ROUTE.routeKey);
  pin("census", `routes[packetSetId=${FAMILY_ID}]`, routes[0]);

  const queueFamily = loaded.queue.data.families.find((f) => f.familyId === FAMILY_ID);
  assert.ok(queueFamily, `${RECORDS.queue} carries no ${FAMILY_ID}`);
  assert.equal(queueFamily.directory, OUT);
  assert.equal(queueFamily.buildScript, BUILD_SCRIPT);
  assert.equal(queueFamily.implementationStrategy, "official_pdf_fill");
  assert.deepEqual([...queueFamily.routeKeys], [ROUTE.routeKey]);
  pin("queue", `families[familyId=${FAMILY_ID}]`, queueFamily);

  const buildability = (loaded.buildability.data.rows ?? []).find((r) => r.familyId === FAMILY_ID);
  assert.ok(buildability, `${RECORDS.buildability} carries no row for ${FAMILY_ID}`);
  assert.equal(buildability.verdict, "EVERY_BOUND_SOURCE_IS_A_HELD_PDF");
  pin("buildability", `rows[familyId=${FAMILY_ID}]`, buildability);

  return { track, packetSet, components, route: routes[0], queueFamily, buildability, pins };
}

/* ---- source binding ------------------------------------------------------- */
/*
 * BOUND BY CONTENT DIGEST, ACROSS EVERY MOUNTED CUSTODY.
 *
 * The two binaries live in two different custodies. CC-DC-CR-078 is in the
 * Master Library; CC-DC-CR-072C is only in the PARTIAL Nationwide recovery pool
 * (`nationwide_recovery_pool_2026_09_02`), whose declared root is repository-
 * relative and which this sparse worktree does not materialise. So the search
 * runs over both this checkout and the main working tree of the same
 * repository -- located from git's own common directory rather than from a path
 * typed in here -- and every candidate is accepted only on an exact SHA-256
 * against the declared digest. A path is a hint; the digest is the binding.
 */
function mountedCustodies(index) {
  const repoRoots = [ROOT];
  try {
    const main = path.dirname(execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd: ROOT, encoding: "utf8" }).trim());
    if (main && main !== ROOT) repoRoots.push(main);
  } catch { /* not a git checkout, or git is unavailable: this checkout is then the only repository root */ }

  const mounts = [];
  const seen = new Set();
  const add = (custody, pathsRelativeTo, base, describes) => {
    const absolute = path.resolve(base);
    const key = `${custody}@${absolute}`;
    if (seen.has(key) || !fs.existsSync(absolute)) return;
    seen.add(key);
    mounts.push({ custody, pathsRelativeTo, base: absolute, describes });
  };

  const library = process.env.MASTER_LIBRARY_SOURCE_DIR;
  if (library) add("master_library", "custodyRoot", library, "MASTER_LIBRARY_SOURCE_DIR");

  for (const custody of index.custodies ?? []) {
    const shape = custody.pathsRelativeTo ?? "custodyRoot";
    for (const repo of repoRoots) {
      /* A custody whose paths are custody-relative is joined onto its own root.
       * A custody whose paths are already repository-relative is joined onto
       * the repository root, and its declared root only says whether the
       * custody is mounted at all. */
      if (shape === "custodyRoot") add(custody.id, shape, path.join(repo, custody.root), `${custody.id} under ${repo}`);
      else if (fs.existsSync(path.join(repo, custody.root))) add(custody.id, shape, repo, `${custody.id} (repository-relative paths) under ${repo}`);
    }
  }
  return mounts;
}

function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const mounts = mountedCustodies(index);
  const resolved = [];
  const failures = [];

  for (const wanted of ROUTE.documents) {
    /* Every indexed entry at this exact digest. The declared path is tried
     * first where the index holds it, so the receipt names the custody the
     * queue meant; any other entry at the same digest is the same bytes and is
     * accepted only after that one is found absent. */
    const entries = (index.entries ?? [])
      .filter((e) => e.sha256 === wanted.sha256)
      .sort((a, b) => (a.path === wanted.declaredPath ? -1 : b.path === wanted.declaredPath ? 1 : a.path.localeCompare(b.path)));
    if (entries.length === 0) {
      failures.push({
        sourceIdentity: wanted.sourceId, formNumber: wanted.formNumber, expectedSha256: wanted.sha256,
        declaredPath: wanted.declaredPath,
        why: "the committed corpus index carries no entry at this digest"
      });
      continue;
    }
    const tried = [];
    let bound = null;
    for (const entry of entries) {
      const custody = entry.custody ?? "master_library";
      for (const mount of mounts) {
        if (bound) break;
        if (mount.custody !== custody) continue;
        const attempt = path.join(mount.base, entry.path);
        if (!fs.existsSync(attempt)) { tried.push({ path: attempt, why: "not present in this container" }); continue; }
        const bytes = fs.readFileSync(attempt);
        const digest = sha256(bytes);
        if (digest !== wanted.sha256) { tried.push({ path: attempt, why: `SHA-256 drift: holds ${digest}` }); continue; }
        bound = { entry, custody, absolute: attempt, bytes, digest, matchedDeclaredPath: entry.path === wanted.declaredPath };
      }
      if (bound) break;
    }
    if (!bound) {
      failures.push({
        sourceIdentity: wanted.sourceId, formNumber: wanted.formNumber, expectedSha256: wanted.sha256,
        declaredPath: wanted.declaredPath, pathsTried: tried,
        why: "no mounted custody holds these exact bytes"
      });
      continue;
    }
    resolved.push({
      ...wanted,
      pathInArchive: bound.entry.path, boundFromCustody: bound.custody,
      boundAtTheDeclaredPath: bound.matchedDeclaredPath,
      absolutePath: bound.absolute, revision: bound.entry.revision ?? null,
      indexFormNumber: bound.entry.formNumber ?? null, assetClass: bound.entry.assetClass ?? null,
      acroFieldCount: bound.entry.acroFieldCount ?? null, indexPageCount: bound.entry.pageCount ?? null,
      byteLength: bound.bytes.length, bytes: bound.bytes, sha256Confirmed: bound.digest
    });
  }
  return {
    resolved, failures,
    custodiesSearched: mounts.map((m) => ({
      custody: m.custody, pathsRelativeTo: m.pathsRelativeTo, base: path.relative(ROOT, m.base) || ".", describes: m.describes
    }))
  };
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
  const flatPage = new Map(pageText.map((p) => [p.page, flat(p.lines.map((l) => l.text).join(" "))]));

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
      let flags = null;
      try { flags = w.getFlags(); } catch { flags = null; }
      /* Bit 1 Invisible, bit 2 Hidden, bit 6 NoView: any of the three means a
       * value written here would be invisible ink. Asserted against every
       * write below. */
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

    const page = widgets[0]?.page ?? 1;
    const hay = flatPage.get(page) ?? "";
    const printedCaptionFound = flat(name).length >= 4 && hay.includes(flat(name));
    rows.push({
      key: name, name, page, widgets, sourceValue,
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      hiddenUntilTheFormRevealsIt: widgets.some((w) => w.hiddenUntilTheFormRevealsIt === true),
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
      isSelectionControl: entry.selection === true
        || field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      printedCaptionFound,
      printedTextAtCoordinate: (pageText.find((p) => p.page === page)?.lines ?? [])
        .filter((l) => widgets[0] && Math.abs(l.y - widgets[0].rect.y) <= 16)
        .sort((a, b) => Math.abs(a.y - widgets[0].rect.y) - Math.abs(b.y - widgets[0].rect.y))
        .slice(0, 2).map((l) => ({ y: l.y, extracted: l.text }))
    });
  }

  const dictionaryKeys = new Set(Object.keys(spec));
  for (const r of rows) dictionaryKeys.delete(r.key);
  return { rows, unmapped, stale: [...dictionaryKeys], pageText, pageCount: pages.length };
}

/* ---- render --------------------------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
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
    title: source.title,
    /* All four are opt-in flags whose comments in the finalizer say the
     * default should flip once every family can be rebuilt together, and each
     * closes a measured defect: a fit the widget's own /DA would have ignored,
     * a value refused without the declared minimum ever being tried, a
     * pushbutton caption stamped onto the filed page, and a check-box border
     * this build invented. */
    evaluateDeclaredMinimumSize: true,
    alignWidgetFontSizeToFit: true,
    detachNestedControlFields: true,
    /*
     * FIX141, CLIPPING_AND_OVERLAP. VF06 read this family at 7d6453f51 and
     * scored the obligation FAIL on THIRTEEN SQUARES OF INK THIS PACKET ADDED
     * that neither Maryland form carries: one stroked hairline square per
     * check box, on a petition affirmed under penalties of perjury and on a
     * release of tort claims.
     *
     * Measured here first-hand on the committed bytes at 80fd3eb51 rather
     * than taken from the row. Every check-box widget on both binaries sits at
     * /AS /Off and its /AP /N dictionary holds ONLY the on state and no /Off
     * entry -- eleven on CC-DC-CR-072C (/On) and two on CC-DC-CR-078 (/Yes),
     * thirteen in all, and not one of the thirteen ships a court-authored /Off
     * stream. ISO 32000-1 12.5.5 has a conforming viewer draw the stream named
     * by /AS, so where there is none it paints nothing; pdf-lib instead treats
     * the missing state as an appearance to regenerate, and its default
     * provider strokes a square the size of the widget /Rect, which flatten()
     * then stamps onto the page. The delivered bytes carried exactly thirteen
     * flattened Form XObjects whose whole stream is "0 0 0 RG 0 w [] 0 d ...
     * h S" over an 8pt or 9pt BBox and no glyph. The forms print their own box
     * in page content at a slightly different place and size, so the
     * synthesized hairline lands offset inside the printed one: at 300 dpi,
     * grey <= 128, the thirteen rectangles carried 419 dark pixels MORE than
     * the same rectangles of the pinned sources rendered with their own
     * annotations, on both fixtures.
     *
     * suppressSynthesizedAppearances installs the empty /Off appearance the
     * two forms omit, so needsAppearancesUpdate() is false and pdf-lib
     * regenerates nothing for those thirteen widgets. It writes no participant
     * fact, marks no box and adds no ink; it withholds ink the Maryland
     * Judiciary never authored. Nothing the court draws is touched: there is no
     * /Off stream on any of the thirteen to remove, which is the distinction
     * RI-OFF-APPEARANCE and FIX134 turn on, and it was checked on both binaries
     * before the flag was set.
     *
     * THIS FAMILY ONLY. The flag is passed from this family's own builder, so
     * every other caller of the shared finalizer is byte-unaffected.
     */
    suppressSynthesizedAppearances: true
  });
  return { bytes, report };
}

/* ---- byte proof ----------------------------------------------------------- */
/*
 * THE BASELINE THE SECOND GLYPH READING IS MEASURED AGAINST.
 *
 * The same binary, flattened with nothing written on it. Every appearance in
 * the artifact that is not in this baseline is ink this build added, so ink
 * outside every measured widget rectangle can be COUNTED rather than asserted
 * to be zero.
 */
async function sourceInkOf(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  try { doc.getForm().flatten(); } catch { /* a form that will not flatten leaves no baseline to compare against */ }
  const bytes = await doc.save({ useObjectStreams: false, updateMetadata: false });
  const tmp = path.join(ROOT, `.md-10105-early-source-ink-${source.formNumber}.pdf`);
  fs.writeFileSync(tmp, bytes);
  try { return await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
}

async function byteProof(source, census, artifactBytes, report, fixtureName, sourceInk) {
  const facts = FIXTURES[fixtureName];
  const tmp = path.join(ROOT, `.md-10105-early-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
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
        glyphs += ink.replace(/\s+/g, "").length;
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
          note: "the pinned source's own widget appearance draws exactly this text; this build wrote nothing here"
        });
        continue;
      }
      refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: text });
    }
  }

  /*
   * nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, MEASURED.
   *
   * Every appearance the artifact draws that lands at no measured widget
   * rectangle on its page, minus the identical appearances the un-written
   * source draws at the same point. What is left is ink this build put
   * somewhere the census never measured.
   */
  const measured = census.rows.flatMap((r) => r.widgets.map((w) => ({ page: w.page, rect: w.rect })));
  const atAMeasuredBox = (row) => measured.some((m) => m.page === row.page
    && Math.abs(row.x - m.rect.x) <= 2 && Math.abs(row.y - m.rect.y) <= 2);
  const baseline = new Map();
  for (const row of sourceInk) {
    const key = `${row.page}|${row.x}|${row.y}|${row.text}`;
    baseline.set(key, (baseline.get(key) ?? 0) + 1);
  }
  const outside = [];
  for (const row of widgets) {
    if (atAMeasuredBox(row)) continue;
    const stripped = String(row.text ?? "").replace(/\s+/g, "");
    if (stripped.length === 0) continue;
    const key = `${row.page}|${row.x}|${row.y}|${row.text}`;
    const remaining = baseline.get(key) ?? 0;
    if (remaining > 0) { baseline.set(key, remaining - 1); continue; }
    outside.push({ page: row.page, x: row.x, y: row.y, appearance: row.appearance, text: row.text, glyphs: stripped.length });
  }

  return {
    actualWrites, refusedFieldsWithInk, documentAuthoredAppearances, glyphs,
    appearances: widgets.length,
    outsideMeasuredWriteBoxes: outside,
    glyphsOutsideMeasuredWriteBoxes: outside.reduce((n, row) => n + row.glyphs, 0)
  };
}

/* ---- field map ------------------------------------------------------------ */
/*
 * THE BOUNDARY COLUMN IS MEASURED FROM THE BOUNDARY RENDER, NOT COPIED FROM
 * THE CANONICAL ONE.
 *
 * The pattern this family was built from sets `boundaryWrites: canonicalWrites`,
 * and on this family that would be false: the boundary participant's
 * 58-character e-mail does not fit CC-DC-CR-072C's 157-point e-mail box at the
 * minimum readable font, so the shared finalizer refuses it rather than
 * clipping it, and the boundary bytes carry no e-mail. A map that listed it as
 * a boundary write would be claiming ink the boundary artifact does not have -
 * which is exactly the shape of defect the byte proof exists to catch, moved
 * one file over. Each column is therefore built from its own render report,
 * and a value that only one fixture could draw shows as written in one column
 * and refused in the other.
 */
function mapFor(source, census, report, boundaryReport) {
  const writtenNames = new Set(report.written.map((w) => w.field));
  const boundaryWrittenNames = new Set((boundaryReport?.written ?? []).map((w) => w.field));
  const boundaryUnfittable = new Map((boundaryReport?.unfittable ?? []).map((u) => [u.field, u]));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const boundaryWrites = [];
  const boundaryRefusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`.replace(/\[\d+\]/g, ""),
      acroFieldName: r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      captionBasis: r.printedCaptionFound
        ? "the AcroForm field name Maryland authored, found verbatim in the printed text of the page it sits on"
        : "the AcroForm field name Maryland authored, plus the printed section; the paper abbreviates or splits this caption, so the printed line at the widget's own coordinate is recorded beside it",
      printedCaptionFound: r.printedCaptionFound,
      printedTextAtCoordinate: r.printedTextAtCoordinate,
      document: source.formNumber,
      componentId: source.componentId,
      componentRequirement: source.requirement
    };

    if (r.policy === "write") {
      const refusedWrite = (fixture, unfittable) => ({
        ...base,
        reason: unfittable
          ? `the value bound to ${r.fact} does not fit this box at the minimum readable font, so the shared finalizer refused it rather than clipping it; the ${fixture} packet does not claim a value it did not draw`
          : `the finalizer refused this write; the ${fixture} packet does not claim a value it did not draw`,
        category: null, completenessClass: null, class: null,
        disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, identity: `${source.formNumber} field ${r.key}`,
        factId: null, routeDetermined: false,
        ...(unfittable ? { unfittable } : {}),
        why: `reported rather than claimed, so the refusal is visible to the audit; on this fixture the participant supplies it`,
        participantMustSupply: `this value yourself: the one held for you is too long for the box the form draws here`
      });
      if (writtenNames.has(r.name)) canonicalWrites.push({ ...base, factId: r.fact, kind: r.type });
      else canonicalRefusals.push(refusedWrite("canonical", null));
      if (boundaryReport) {
        if (boundaryWrittenNames.has(r.name)) boundaryWrites.push({ ...base, factId: r.fact, kind: r.type });
        else boundaryRefusals.push(refusedWrite("boundary", boundaryUnfittable.get(r.name) ?? null));
      }
      continue;
    }

    if (r.isSelectionControl && r.policy === "election") {
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type,
        widgets: r.widgets, disposition: "explicit_refusal",
        reason: r.why, category: PARTICIPANT_ELECTION, completenessClass: PARTICIPANT_ELECTION, class: PARTICIPANT_ELECTION,
        requiredBeforeFiling: false, routeDetermined: false
      });
      continue;
    }

    if (r.policy === "protect") {
      const rowValue = {
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      };
      canonicalRefusals.push(rowValue);
      boundaryRefusals.push(rowValue);
      continue;
    }

    if (r.policy === "attorney" || r.policy === "viewer") {
      const rowValue = {
        ...base, reason: r.why, category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: r.why
      };
      canonicalRefusals.push(rowValue);
      boundaryRefusals.push(rowValue);
      continue;
    }

    if (r.policy === "optional") {
      const rowValue = {
        ...base,
        reason: `optional participant-authored content; the platform does not invent it: ${r.what}`,
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, optional: true,
        why: `the form does not require this and the platform holds no value for it: ${r.what}`,
        participantMaySupply: r.what
      };
      canonicalRefusals.push(rowValue);
      boundaryRefusals.push(rowValue);
      continue;
    }

    const rbfRow = {
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${source.formNumber} field ${r.key}`,
      factId: null, routeDetermined: false,
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    };
    canonicalRefusals.push(rbfRow);
    boundaryRefusals.push(rbfRow);
  }

  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    componentId: source.componentId,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey,
      ...(source.condition ? { conditional: true, conditionDescription: source.condition } : {})
    },
    structuralClass: "acroform",
    explicitMappings: Object.fromEntries(canonicalWrites.map((w) => [w.field, w.factId])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites, boundaryRefusals,
    boundaryColumnBasis:
      "each column is built from that fixture's own render report; a value only one fixture could draw is a write in "
      + "one column and a refusal in the other"
  };
}

/* ---- the builder's own count of the nine counters -------------------------- */
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
  /* Scoped to the DOCUMENT: "Case No.", "Circuit Court", "Defendant" and
   * "Complainant" each appear on both forms. */
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
    ledger.push({ field: blank.id, label: blank.label, document: blank.document, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition].allowed) continue;
    const counter = verdict.disposition === "KNOWN_FACT_NOT_WRITTEN" ? "knownRequiredFieldsMissing"
      : verdict.disposition === "ROUTE_OPTION_NOT_SELECTED" ? "requiredOptionsMissing" : "unclassifiedBlanks";
    note(counter, { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis });
  }

  const instructions = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.field].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => instructions.includes(n.toLowerCase().slice(0, 60)))) continue;
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
      note("invisibleWrites", { fixture: p.fixture, document: p.formNumber, why: "the finalizer reported values and the output bytes carry no glyph and no flattened appearance" });
    }
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) {
      note("visualDefects", { fixture: p.fixture, document: p.formNumber, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, where: p.inkOutsideMeasuredWriteBoxes });
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

/* ---- the two instruction documents ---------------------------------------- */
function requiredBeforeFilingItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, componentId: m.componentId, field: r.field, page: r.page,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })));
}

function optionalItems(maps) {
  return maps.flatMap((m) => m.canonicalRefusals
    .filter((r) => r.optional === true)
    .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, participantMaySupply: r.participantMaySupply })));
}

function participantInstructions(record, maps, rbf, optional) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const elections = maps.flatMap((m) => m.selectionControls.map((c) => ({ document: m.formNumber, ...c })));
  const { track } = record;

  const out = [];
  out.push(`# What to do with this packet - ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is two Maryland Judiciary forms:", "",
    "- **CC-DC-CR-072C**, _Petition for Expungement of Records - Acquittal, Dismissal, Not Guilty, or Nolle Prosequi_, "
      + "for a case where **less than three years** has passed since the disposition. This is the form you file. Its "
      + "lower half is the **General Waiver and Release (Form 4-503.2)** - the waiver is printed on the same sheet as "
      + "the petition.",
    `- **CC-DC-CR-078**, the standalone _General Waiver and Release (Form 4-503.2)_. The committed component record `
      + `marks this one **conditional**, and states the condition in these words: "${ROUTE.documents[1].condition}" `
      + "**If you are filing CC-DC-CR-072C, you do not also sign this sheet** - the waiver you are signing is already "
      + "on the petition. It is included so that a filer on the alternative route has it.", "",
    `Both are prepared for one route - **${track.legalName}** - under ${track.authority.join("; ")}.`, ""
  );

  out.push("## Read this before you file anything: what the waiver costs you", "");
  const tradeoff = track.packetInstructions.find((s) => /waiting costs nothing/i.test(s));
  if (tradeoff) {
    /* Quoted and attributed rather than printed as if it were addressed to
     * you: the committed record writes its packet instructions to whoever
     * offers the route, and a participant reading "tell the participant" in
     * the second person would be reading somebody else's instruction. The
     * sentence is reproduced exactly; only its frame is this packet's. */
    out.push("The committed legal-design record for this route carries this instruction to anyone who offers it, and this page exists to comply with it:", "");
    out.push(`> ${tradeoff}`, "");
  }
  out.push(
    "In plain terms: this route is fast **because** you sign away something. Section 10-105(c)(1) removes the "
    + "three-year wait only where a written general waiver and release of all tort claims arising from the charge is "
    + "filed with the petition. Signing it gives up your right to sue the arresting agency, its officers, its agents "
    + "and its employees over this arrest, detention or confinement. **Waiting three years costs you nothing and keeps "
    + "that right.**", ""
  );
  const automatic = track.packetInstructions.find((s) => /10-105\.1/.test(s));
  if (automatic) {
    out.push("## There may be nothing for you to file at all", "");
    out.push("The same record says, in its own words:", "");
    out.push(`> ${automatic}`, "");
    out.push(
      "So check that first. If every charge in your case ended in one of those four ways and the disposition was "
      + "entered on or after 1 October 2021, waiting is free and automatic, and this packet is not the route you want.", ""
    );
  }

  out.push("## What this route covers, and what it does not", "");
  out.push(`${track.mechanism}`, "");
  out.push("The dispositions this form reaches, as the form prints them:", "");
  out.push("- you were acquitted of the charge(s);");
  out.push("- the charge(s) was otherwise dismissed;");
  out.push("- you were found not guilty;");
  out.push("- a nolle prosequi was entered **without** a requirement of drug or alcohol treatment.", "");
  out.push("What is outside it:", "");
  for (const exclusion of track.exclusions) out.push(`- ${exclusion}`);
  out.push("");
  const unitQuestion = (track.participantQuestions ?? [])[0];
  if (unitQuestion) {
    out.push(
      "**Every charge in the incident matters, not only the one you want cleared.** The record this packet is built "
      + "from puts it this way:", ""
    );
    out.push(`> ${unitQuestion}`, "");
  }

  out.push("## What the platform filled in, and what it did not", "");
  out.push(
    "The platform wrote what it holds about you and your case: your name, your date of birth, your street address, "
    + "your city, state and zip, and the case number - on both forms - and your telephone number and e-mail on the "
    + "petition. Everything else is yours, and every one of those blanks is listed below by the form and the section "
    + "it is in. Nothing was guessed.", ""
  );
  out.push(
    "**Your telephone number is on the petition and not on CC-DC-CR-078.** The petition prints one unqualified "
    + "_Telephone_ line and that is where your number went. CC-DC-CR-078 asks for a **home** number and a **work** "
    + "number in separate boxes; the platform holds one number and no fact about which kind it is, so both boxes are "
    + "left for you.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Look the case up on Maryland Judiciary Case Search** and confirm the court, the case number, every charge and the disposition. It is free. If anything on the packet disagrees with the case record, correct the packet.");
  out.push("2. **Fill in every item in the tables below.** Each names the form, the section and the blank.");
  out.push("3. **Make the choices listed under _The choices that are yours_.** Which court, which city or county, how you were charged, and how the charge ended.");
  out.push("4. **List every charge in the incident** in paragraph 2, not only the one you want cleared.");
  out.push("5. **Read paragraphs 1 to 5 and the affirmation above your signature.** By signing you affirm under penalties of perjury that the contents are true, that the charge was not a nonincarcerable vehicle or traffic matter, and that it is not part of a unit whose expungement is precluded under Crim. Proc. \u00a7 10-107.");
  out.push("6. **Sign the petition yourself, and sign the waiver in front of a witness** who prints and signs their own name. Date both on the day you sign.");
  out.push("7. **Leave the attorney column alone** - it is the left-hand column of the CC-DC-CR-072C signature block - unless a lawyer is filing for you.");
  out.push("");

  out.push("## Where it goes, what it costs, and who is told", "");
  out.push("Each line below is the committed record's own words for this route.", "");
  out.push(`- **Where:** ${track.rules.filing} ${track.destination.name}. ${track.destination.detail}`);
  out.push(`- **The fee, as the committed record states it:** ${track.rules.fees}`);
  out.push(`- **Fee waiver:** ${track.rules.feeWaiver}`);
  out.push(`- **Who serves the State's Attorney:** ${track.rules.service} ${track.rules.notice}`);
  out.push(`- **Notarization:** ${track.rules.notarization}.`);
  out.push(`- **Your signature:** ${track.rules.participantSignature}`);
  const noService = track.packetInstructions.find((s) => /certificate of service/i.test(s));
  if (noService) out.push(`- **Service by you:** ${noService}`);
  const noOrder = track.packetInstructions.find((s) => /proposed order/i.test(s));
  if (noOrder) out.push(`- **A proposed order:** ${noOrder} That is why this packet contains none.`);
  out.push("");

  for (const [doc, items] of byDoc) {
    const source = ROUTE.documents.find((d) => d.formNumber === doc);
    out.push(`## ${doc} - ${source?.title ?? doc}: the items you must supply`, "");
    if (source?.condition) out.push(`_This form is conditional: ${source.condition} If you are filing CC-DC-CR-072C, you do not fill this sheet in._`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## The choices that are yours", "");
  out.push("| Form | Section | The choice | Why it is yours |", "| --- | --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.document} | ${c.sectionHeading} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  if (optional.length > 0) {
    out.push("## Optional, and left empty on purpose", "");
    out.push("| Form | The blank | What it is for |", "| --- | --- | --- |");
    for (const o of optional) out.push(`| ${o.document} | ${o.label} | ${o.participantMaySupply} |`);
    out.push("");
  }

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature and its date, and the witness's signature and printed name**, on both forms.");
  out.push("- **The whole attorney column** on CC-DC-CR-072C. You are filing this yourself; no attorney-representation fact is held for you.");
  out.push("- **The court's address**, on both forms. The platform holds no court directory and does not state an address it cannot source.");
  out.push("- **Every tick box on both forms.** Which court heard your case, how you were charged, and how the charge ended are facts about your own record.");
  out.push("- **Both telephone boxes on CC-DC-CR-078**, for the reason given above.");
  out.push("");

  out.push("## When this is not a do-it-yourself matter", "");
  out.push("The record names these as the points where this route stops being a self-help matter. Stop and get a lawyer if any is true:", "");
  for (const stop of track.selfHelpStopConditions) out.push(`- ${stop}`);
  out.push("");
  const handoff = (track.postGenerationHandoffs ?? []).find((s) => /objection/i.test(s));
  if (handoff) out.push(`${handoff}`, "");

  const disclosure = track.packetInstructions.find((s) => /10-109/.test(s));
  if (disclosure) {
    out.push("## After an expungement is granted", "");
    out.push("One thing the record insists is surfaced, in its own words:", "");
    out.push(`> ${disclosure}`, "");
  }

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of two official Maryland Judiciary forms. It is not legal advice, it is not filed for "
    + "you, and it does not decide whether your case can be expunged or whether signing the waiver is the right "
    + "trade for you to make. Read the form against your own record before you sign it."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} - ${track.authority.join("; ")}_`);
  return `${out.join("\n")}\n`;
}

function filingInstructions(record, artifacts) {
  const { track } = record;
  const out = [];
  out.push(`# Filing instructions - ${track.legalName}`, "");
  out.push("Every sentence below is generated from the committed legal-design track record for this route, which is hashed into `source-receipt.json`. Where that record says nothing, this page says nothing.", "");

  out.push("## What you file", "");
  out.push("| Order | Form | Role | Required or conditional |", "| --- | --- | --- | --- |");
  for (const [i, d] of ROUTE.documents.entries()) {
    out.push(`| ${i + 1} | ${d.formNumber} | ${d.instrumentKind.replace(/_/g, " ")} | ${d.requirement}${d.condition ? ` - ${d.condition}` : ""} |`);
  }
  out.push("");
  out.push("**A filer on this route files CC-DC-CR-072C.** The General Waiver and Release is printed on the lower half of that same sheet, so CC-DC-CR-072C on its own carries both the petition and the waiver that \u00a7 10-105(c)(1) requires. CC-DC-CR-078 is the standalone waiver used on the alternative route the component record names.", "");

  out.push("## Venue", "");
  out.push(`${track.venue}`, "");

  out.push("## Where it is filed", "");
  out.push(`**${track.destination.kind}:** ${track.destination.name}`, "");
  out.push(`${track.destination.detail}`, "");
  out.push(`${track.rules.filing}`, "");

  out.push("## Fee", "");
  out.push(`${track.rules.fees} Fee waiver: ${track.rules.feeWaiver}`, "");

  out.push("## Service and notice", "");
  out.push(`**Service:** ${track.rules.service}`, "");
  out.push(`**Notice:** ${track.rules.notice}`, "");
  const noService = track.packetInstructions.find((s) => /certificate of service/i.test(s));
  if (noService) out.push(`${noService}`, "");

  out.push("## Signature and notarization", "");
  out.push(`**Signature:** ${track.rules.participantSignature}`, "");
  out.push(`**Notarization:** ${track.rules.notarization}`, "");
  out.push("The waiver on both forms is witnessed: the WITNESS clause carries a witness signature line and a printed name line beside the petitioner's signature. Neither is filled in by this packet.", "");

  out.push("## What is not in this packet, and why", "");
  const noOrder = track.packetInstructions.find((s) => /proposed order/i.test(s));
  if (noOrder) out.push(`- **No proposed order.** ${noOrder}`);
  if (noService) out.push(`- **No certificate of service.** ${noService}`);
  out.push("- **No filing fee instruction beyond the record's own words.** The record states the fee above; this packet states nothing further about it.");
  out.push("");

  out.push("## What the participant must obtain first", "");
  for (const item of track.participantFilingRequirements ?? []) {
    out.push(`- **${item.name}** (${item.obtainedFrom}) - ${item.howToObtain} Required before filing: ${item.requiredBeforeFiling ? "yes" : "no"}.`);
  }
  out.push("");

  out.push("## Manual completion items the record names", "");
  out.push("| Item | Where in the packet | Why the participant does it |", "| --- | --- | --- |");
  for (const item of track.manualCompletionItems ?? []) out.push(`| ${item.item} | ${item.whereInPacket} | ${item.why} |`);
  out.push("");

  out.push("## Hand off to counsel when", "");
  for (const stop of track.selfHelpStopConditions) out.push(`- ${stop}`);
  out.push("");
  for (const handoff of track.postGenerationHandoffs ?? []) out.push(`- ${handoff}`);
  out.push("");

  out.push("## The fixtures these instructions were written against", "");
  out.push("| Fixture | Pages | SHA-256 |", "| --- | --- | --- |");
  for (const a of artifacts) out.push(`| ${a.fixture} | ${a.pageCount} | \`${a.sha256}\` |`);
  out.push("");
  out.push("_These are review fixtures built from invented participant facts. They are not anybody's filing, and no packet here has been verified, approved or made sellable by this build._", "");
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const wantRaster = argv.includes("--raster");

  const record = loadControllingRecords();
  const { resolved, failures, custodiesSearched } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: failures, custodiesSearched,
      why: "a declared source did not bind by exact SHA-256, so nothing may be rendered from it",
      overlayDirectoryTouched: false,
      counters: null,
      countersAreNullBecause: "no packet was built, so no counter was measured"
    };
  }

  const censuses = [];
  for (const source of resolved) {
    const census = await censusOf(source);
    assert.equal(census.unmapped.length, 0,
      `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 5).map((u) => u.field))}`);
    assert.equal(census.stale.length, 0,
      `${source.formNumber}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
    const ontoHidden = census.rows.filter((r) => r.policy === "write" && r.hiddenUntilTheFormRevealsIt === true);
    assert.equal(ontoHidden.length, 0,
      `${source.formNumber}: ${ontoHidden.length} write(s) land on a widget the form hides: ${JSON.stringify(ontoHidden.map((r) => r.key))}`);
    if (source.acroFieldCount != null) {
      assert.equal(census.rows.length + census.unmapped.length, source.acroFieldCount,
        `${source.formNumber}: censused ${census.rows.length} fields, the committed corpus index declares ${source.acroFieldCount}`);
    }
    if (source.indexPageCount != null) {
      assert.equal(census.pageCount, source.indexPageCount,
        `${source.formNumber}: ${census.pageCount} pages, the committed corpus index declares ${source.indexPageCount}`);
    }
    censuses.push({ source, census });
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      documents: censuses.map(({ source, census }) => ({
        formNumber: source.formNumber, sha256: source.sha256, boundFromCustody: source.boundFromCustody,
        pages: census.pageCount, fields: census.rows.length,
        captionsFoundInPrintedText: census.rows.filter((r) => r.printedCaptionFound).length,
        writes: census.rows.filter((r) => r.policy === "write").length,
        supply: census.rows.filter((r) => r.policy === "supply").length,
        optional: census.rows.filter((r) => r.policy === "optional").length,
        elections: census.rows.filter((r) => r.policy === "election").length,
        protected: census.rows.filter((r) => r.policy === "protect").length,
        attorney: census.rows.filter((r) => r.policy === "attorney").length,
        viewer: census.rows.filter((r) => r.policy === "viewer").length
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const sourceInkByForm = new Map();
  for (const { source } of censuses) sourceInkByForm.set(source.formNumber, await sourceInkOf(source));

  const artifacts = [];
  const writeProofs = [];
  const maps = [];
  const renderReports = { canonical: new Map(), boundary: new Map() };

  for (const fixtureName of ["canonical", "boundary"]) {
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${ROUTE.legalName} - ${fixtureName} fixture`);
    const pageManifest = [];
    for (const { source, census } of censuses) {
      const { bytes, report } = await renderDocument(source, census, fixtureName);
      const proof = await byteProof(source, census, bytes, report, fixtureName, sourceInkByForm.get(source.formNumber) ?? []);
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, componentId: source.componentId,
        sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
        outsideBoxProofMethod:
          "every flattened appearance in the artifact that lands at no measured widget rectangle, differenced against "
          + "the same source flattened with nothing written on it, so what remains is ink this build added outside "
          + "every measured write box",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.glyphs,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.glyphsOutsideMeasuredWriteBoxes,
        inkOutsideMeasuredWriteBoxes: proof.outsideMeasuredWriteBoxes,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        documentAuthoredAppearances: proof.documentAuthoredAppearances,
        promptsSuppressed: report.promptsSuppressed ?? [],
        unfittable: report.unfittable,
        actualWrites: proof.actualWrites
      });
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await packet.copyPages(doc, doc.getPageIndices());
      for (const [i, p] of copied.entries()) {
        packet.addPage(p);
        pageManifest.push({
          packetPage: packet.getPageCount(), formNumber: source.formNumber, componentId: source.componentId,
          sourcePage: i + 1, sourceSha256: source.sha256
        });
      }
      renderReports[fixtureName].set(source.formNumber, report);
    }
    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);
    artifacts.push({
      fixture: fixtureName, file, sha256: sha256(packetBytes),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents: censuses.map((c) => c.source.formNumber),
      components: censuses.map((c) => c.source.componentId)
    });
  }

  for (const { source, census } of censuses) {
    maps.push(mapFor(source, census,
      renderReports.canonical.get(source.formNumber), renderReports.boundary.get(source.formNumber)));
  }

  const rasterPages = [];
  if (wantRaster) {
    const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
    for (const a of artifacts) {
      const rasterDir = `${OUT}/raster/${a.fixture}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < a.pageCount; i += 1) {
        const stage = path.join(ROOT, rasterDir, `page-${String(i + 1).padStart(2, "0")}`);
        const render = await rasterizePageCalibrated({ file: path.join(ROOT, a.file), pageIndex: i, keep: stage });
        for (const scrap of ["page.pdf", "page-calibration.pdf", "page-calibration.png"]) {
          const f = path.join(stage, scrap);
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
        const png = path.join(stage, "page.png");
        rasterPages.push({
          fixture: a.fixture, page: i + 1,
          file: `${rasterDir}/page-${String(i + 1).padStart(2, "0")}/page.png`,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx, paperBounds: render.paper,
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: sha256(fs.readFileSync(png))
        });
      }
    }
  }

  const rbf = requiredBeforeFilingItems(maps);
  const optional = optionalItems(maps);
  const instructionsText = participantInstructions(record, maps, rbf, optional);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), filingInstructions(record, artifacts));

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    bindingMethod:
      "the declared SHA-256 against the committed corpus index, then the same digest recomputed from the bytes on "
      + "disk, searched over every mounted custody the index declares. A declared path is a hint; the digest is the "
      + "binding.",
    custodiesSearched,
    whyTwoCustodies:
      "CC-DC-CR-078 is held in the Master Library. CC-DC-CR-072C is held only in the PARTIAL Nationwide recovery pool "
      + "(nationwide_recovery_pool_2026_09_02), whose declared root is repository-relative and which this sparse "
      + "worktree does not materialise, so the search also runs over the main working tree of the same repository. "
      + "Each document below records the custody its bytes actually came from.",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber,
      componentId: r.componentId, instrumentKind: r.instrumentKind,
      componentRequirement: r.requirement, componentCondition: r.condition,
      revision: r.revision, pathInArchive: r.pathInArchive, boundFromCustody: r.boundFromCustody,
      declaredPath: r.declaredPath, boundAtTheDeclaredPath: r.boundAtTheDeclaredPath,
      sha256: r.sha256, sha256RecomputedFromBytes: r.sha256Confirmed, byteLength: r.byteLength,
      corpusIndexFormNumber: r.indexFormNumber, corpusIndexAssetClass: r.assetClass,
      corpusIndexAcroFieldCount: r.acroFieldCount, corpusIndexPageCount: r.indexPageCount
    })),
    controllingRecords: record.pins,
    guideProseIsGeneratedFrom:
      "data/record-clearing/legal-design-track-registry.json tracks[trackId=md_10105_early]. Every fee, service rule, "
      + "notice period, self-help stop condition and packet instruction printed in participant-instructions.md and "
      + "filing-instructions.md is a string from that record, pinned above by whole-file and by entry digest.",
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "Both Maryland forms extract clean text, and Maryland authored its AcroForm field names as the printed captions "
      + "themselves. `printedCaptionFound` records, per field, whether that exact string was found in the printed text "
      + "of the page the widget sits on; where it is false the printed line at the widget's own coordinate is recorded "
      + "beside it. See reports/caption-evidence.json.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, componentId: source.componentId,
      sourceSha256: source.sha256, boundFromCustody: source.boundFromCustody,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      widgetsCarryingTheHiddenFlag: census.rows.filter((r) => r.hiddenUntilTheFormRevealsIt).length,
      captionsFoundInPrintedText: census.rows.filter((r) => r.printedCaptionFound).length,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        annotationFlags: r.widgets.map((w) => w.annotationFlags),
        hiddenUntilTheFormRevealsIt: r.hiddenUntilTheFormRevealsIt === true,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        sourceValue: r.sourceValue, printedCaptionFound: r.printedCaptionFound,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      }))
    }))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    finding:
      "Both CC-DC-CR-072C and CC-DC-CR-078 extract clean, readable text, and Maryland authored its AcroForm field "
      + "names as the printed captions - \"Law Enforcement Agency\", \"Printed Name of Witness\", \"Name of Person "
      + "Signing Waiver\". Every caption claim in this family is therefore checked against the paper rather than "
      + "asserted.",
    method:
      "The whole printed page is extracted, lowercased and flattened to alphanumeric words; the field name is "
      + "flattened the same way; `printedCaptionFound` is true when the flattened name occurs in the flattened page. "
      + "Every word and its order must still be present, so this is not a fuzzy match.",
    whereItIsFalse:
      "Maryland abbreviates and splits some captions on the paper. \"Case No\" prints as \"Case No.\"; the two "
      + "signature columns print one shared set of captions over both; the tick-box captions are sentences that run "
      + "past the box. Those are recorded false rather than explained away, and the printed line at each widget's own "
      + "coordinate is recorded beside them.",
    perDocument: censuses.map(({ source, census }) => ({
      document: source.formNumber, fields: census.rows.length,
      captionsFoundInPrintedText: census.rows.filter((r) => r.printedCaptionFound).length,
      captionsNotFound: census.rows.filter((r) => !r.printedCaptionFound).map((r) => r.key)
    })),
    perField: censuses.flatMap(({ source, census }) => census.rows.map((r) => ({
      document: source.formNumber, field: r.key, page: r.page, rect: r.rect,
      labelThisBuildUses: r.effectiveLabel, section: r.section,
      printedCaptionFound: r.printedCaptionFound,
      textExtractedAtThisCoordinate: r.printedTextAtCoordinate
    })))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "acroform_fill",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.authority, legalName: ROUTE.legalName,
    implementationStrategy: "official_pdf_fill",
    componentSet: ROUTE.documents.map((d) => d.componentId),
    componentConditions: Object.fromEntries(ROUTE.documents.filter((d) => d.condition).map((d) => [d.componentId, d.condition])),
    captionBasis: "authored AcroForm field names, checked field by field against the printed page; see reports/caption-evidence.json",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "NOTHING ON EITHER FORM IS ROUTE-DETERMINED, and the packet says which route it was built for in its own "
      + "instructions rather than by ticking a box. The petition's tick boxes ask which court heard the case, whether "
      + "the participant was arrested, summonsed or cited, how the charge ended, and whether the case was transferred "
      + "- four questions about the participant's own record, none of which \u00a7 10-105(c)(1) answers. The one box "
      + "that comes closest is the nolle prosequi line, and it is still a fact: the route excludes a nolle prosequi "
      + "entered WITH a treatment requirement, and only the case record says which kind this was. Every one is "
      + "declared a genuine participant election with its reason on its own row.",
    waiverNote:
      "CC-DC-CR-072C prints Form 4-503.2, the General Waiver and Release, on the lower half of its own single sheet - "
      + "read from the binary's text stream at y=200 of page 1. CC-DC-CR-078 is the standalone edition of the same "
      + "Form 4-503.2 and is declared CONDITIONAL by the committed component record, on the condition that record "
      + "states: \"" + ROUTE.documents[1].condition + "\" Both are rendered; the instructions tell the participant "
      + "which one a 072C filer signs, because signing both would release the same claims twice.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    optionalParticipantContent: optional,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: ROUTE.documents.map((d) => d.componentId),
    componentConditions: Object.fromEntries(ROUTE.documents.filter((d) => d.condition).map((d) => [d.componentId, d.condition])),
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    pdfs: artifacts.map((a) => ({
      file: a.file, documentId: "assembled_packet", role: "assembled_packet_of_official_forms",
      fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount
    })),
    byteDerivedHashes: true,
    everyPageRastered: rasterPages.length > 0 && rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    rasterSkipped: rasterPages.length === 0,
    rasterEngine: rasterPages.length > 0 ? "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)" : null,
    rasterPages,
    rasterState: "BUILT_RASTER_PENDING",
    whyNoLocalRasterReceipt:
      "A local browser render is not a receipt. The central raster workflow produces one, bound to the exact SHA-256 "
      + "recorded above.",
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Read back from the finalized PDF bytes at every measured widget rectangle, not from the finalizer's own "
      + "report. Both glyph readings are measurements: the added glyphs are counted at the measured write boxes, and "
      + "the glyphs outside them are counted by differencing every flattened appearance in the artifact against the "
      + "same source flattened with nothing written on it.",
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
    optionalParticipantContent: optional,
    participantElections: maps.flatMap((m) => m.selectionControls.map((c) => ({
      document: m.formNumber, field: c.field, page: c.page, section: c.sectionHeading, label: c.effectiveLabel, why: c.reason
    }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals
      .filter((r) => r.requiredBeforeFiling !== true && r.optional !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why }))),
    nearMissesRefusedByRole: [
      {
        document: "CC-DC-CR-078", field: "Defendant Home Telephone", wouldHaveBound: "participant.phone",
        finding:
          "The shared field semantics binds a widget captioned Home Telephone to the participant's contact number. "
          + "The platform holds one unqualified number and no fact about which kind it is, so writing it here would "
          + "assert it is a home number and writing it into both boxes would put one number in two boxes that ask "
          + "different questions. Both are refused by role and carried to the participant. The petition's own "
          + "unqualified Telephone box IS written."
      },
      {
        document: "CC-DC-CR-072C", field: "City/County of Law Enforcement Agency", wouldHaveBound: "participant.city",
        finding:
          "The name reads as a city, and paragraph 1 is asking where the INCIDENT happened rather than where the "
          + "participant lives. Refused by role before rendering and carried to the participant with the distinction "
          + "spelled out on its own instruction row."
      }
    ],
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);

  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: allZero,
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note:
      "Both fixtures are single-sheet forms bound into a two-page packet. No page of either fixture was rastered by "
      + "this build; the central raster workflow renders them from the hashes recorded in "
      + "reports/rendered-artifacts.json.",
    whatToLookAt: [
      "CC-DC-CR-072C, the head of the sheet: the case number on the Case No. line, the participant's name on the "
        + "defendant line and the date of birth on the DOB line. The court boxes, the city/county chooser, the court "
        + "address and the tracking number are ALL EMPTY.",
      "CC-DC-CR-072C, paragraphs 1 to 5: every tick box empty and every blank empty. There are eleven tick boxes and "
        + "all eleven are the participant's.",
      "CC-DC-CR-072C, the signature block: the RIGHT-hand defendant column carries the printed name, address, "
        + "city/state/zip, telephone and e-mail. The LEFT-hand attorney column is blank throughout, including the "
        + "attorney number. The two columns print the same captions twice, which is the placement risk on this form.",
      "CC-DC-CR-072C, the waiver on the lower half of the same sheet: the participant's name on the \"I, ____\" line "
        + "and nothing else - complainant, agency, date, the witness clause dates, both signatures and the witness's "
        + "printed name all empty.",
      "CC-DC-CR-078: the same case number and the same participant identity, and BOTH telephone boxes empty. That is "
        + "deliberate, and it is the one difference between the two sheets a reviewer should expect.",
      "Neither sheet may show the word \"Reset\": both forms carry a Reset pushbutton and a flattened pushbutton "
        + "caption is ink on a filing.",
      "The city/county chooser on both sheets ships with a run of spaces as its selected value. Confirm nothing is "
        + "drawn on that line.",
      "Boundary fixture, both sheets: the long hyphenated name, the apartment-line address and the 60-character "
        + "e-mail either fit their boxes or are reported unfittable in reports/actual-writes.json. Nothing may spill "
        + "into a neighbouring caption or off the edge of the paper."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: allZero ? "state_built" : "overlay_samples_rendered",
    reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: rasterPages.length > 0 ? "chromium_calibrated" : "not rendered in this run",
    popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false,
    stopped: !allZero,
    stopReason: allZero ? null : "A completeness counter is non-zero. See reports/completeness-counters.json.",
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId: FAMILY_ID,
    blocking: allZero ? [] : [{
      severity: "blocking",
      finding: "A completeness counter is non-zero on this build.",
      consequence: "See reports/completeness-counters.json for the counter and the finding rows behind it."
    }],
    findings: [
      {
        finding:
          "CC-DC-CR-072C prints \"Form 4-503.2 GENERAL WAIVER AND RELEASE (Criminal Procedure \u00a7 10-105)\" on the "
          + "lower half of its own single sheet, at y=200 of page 1 of the pinned binary, with its own petitioner "
          + "signature, witness signature and printed-name-of-witness lines. CC-DC-CR-078 is the standalone edition "
          + "of the same Form 4-503.2.",
        consequence:
          "The committed component record already marks CC-DC-CR-078 conditional, on the condition \"" + ROUTE.documents[1].condition
          + "\" This build renders both, in component order, and states in participant-instructions.md that a filer "
          + "on CC-DC-CR-072C signs the waiver on the petition and does NOT also sign the standalone sheet. Signing "
          + "both would release the same tort claims twice for one charge. The condition travels with the component "
          + "in production-field-map.json, reports/rendered-artifacts.json and the source receipt."
      },
      {
        finding:
          "CC-DC-CR-078 asks for a home telephone number and a work telephone number in separate boxes; "
          + "CC-DC-CR-072C prints one unqualified Telephone line.",
        consequence:
          "The unqualified box is written and both qualified boxes are refused and carried to the participant. The "
          + "platform holds one contact number and no fact about which kind it is; writing it into the home box would "
          + "assert something nobody told us, and writing it into both would put one number in two boxes asking "
          + "different questions. Recorded under nearMissesRefusedByRole rather than quietly avoided."
      },
      {
        finding:
          "MASTER_QUEUE declares CC-DC-CR-072C at path \"LegalEase Maryland/LegalEase Maryland forms /ccdccr072c.pdf\" "
          + "and the committed corpus index files those exact bytes under the custody "
          + "nationwide_recovery_pool_2026_09_02, whose declared root is repository-relative. This is a sparse "
          + "worktree that does not materialise private/, so joining that root onto this checkout finds nothing while "
          + "the binary sits in the main working tree of the same repository.",
        consequence:
          "The resolver searches every custody the index declares, under this checkout AND under the main working "
          + "tree located from git's own common directory, and binds only on an exact SHA-256. The receipt records "
          + "the custody each document's bytes actually came from. Nothing is bound by path. Note also that the "
          + "recovery pool is declared a PARTIAL custody: it satisfies an individual source obligation and never a "
          + "completeness assertion, and no completeness assertion is made from it here."
      },
      {
        finding:
          "Every check-box widget on both binaries sits at /AS /Off and its /AP /N dictionary holds only the on "
          + "state -- eleven /On boxes on CC-DC-CR-072C and two /Yes boxes on CC-DC-CR-078 -- so not one of the "
          + "thirteen ships a court-authored /Off appearance. pdf-lib reads the missing state as an appearance to "
          + "regenerate and its default provider strokes a square the size of the widget /Rect, which flatten() "
          + "stamps onto the page over the box the Maryland Judiciary already prints in page content.",
        consequence:
          "Before FIX141 the delivered bytes carried exactly thirteen flattened Form XObjects whose whole stream was "
          + "a stroked square and no glyph, and at 300 dpi, grey <= 128, those thirteen rectangles carried 419 dark "
          + "pixels more than the same rectangles of the pinned sources rendered with their own annotations, on both "
          + "fixtures. suppressSynthesizedAppearances now installs the empty /Off appearance the two forms omit, so "
          + "pdf-lib regenerates nothing there. The delivered check boxes are now pixel-identical to the sources at "
          + "every threshold measured, and no /Off stream the court authored was touched because there is none to "
          + "touch. Nothing this build writes moved: every one of the fourteen write boxes carries the same ink "
          + "before and after, and every pixel that changed on either page got lighter."
      },
      {
        finding:
          "The city/county chooser on both forms ships with a selected value of fifty space characters, which is the "
          + "first entry of its own option list.",
        consequence:
          "It is recorded per field as sourceValue in the census, and the finalizer's own chooser-prompt suppression "
          + "is reported per fixture as promptsSuppressed in reports/actual-writes.json. Either way the line draws "
          + "whitespace and no participant fact, and the byte proof treats a whitespace appearance as no ink."
      },
      {
        finding:
          "Both forms carry a Reset pushbutton. A pushbutton whose appearance is regenerated before flatten is "
          + "stamped onto the filed page as ordinary ink.",
        consequence:
          "This build passes detachNestedControlFields to the shared finalizer, which detaches suppressed controls "
          + "from a nested field tree as well as a flat one, and the visual review sheet asks the reviewer to confirm "
          + "the word \"Reset\" appears nowhere on either sheet."
      },
      {
        finding:
          "This build also passes evaluateDeclaredMinimumSize and alignWidgetFontSizeToFit, two other opt-in flags "
          + "whose comments in the shared finalizer say the default should flip once every family can be rebuilt "
          + "together.",
        consequence:
          "Each closes a measured defect - a value refused without its declared minimum ever being tried, and a "
          + "fitted font size the widget's own /DA would have ignored while the report called the write \"shrunk\". "
          + "This family is new, so no earlier bytes move on that account. Recorded so a reviewer can see the "
          + "difference from the older official_pdf_fill families rather than discover it."
      },
      {
        finding:
          "nonWhitespaceGlyphsOutsideMeasuredWriteBoxes is MEASURED here rather than declared zero. Twenty-five "
          + "overlay directories in this factory emit no such reading at all, and the two working builders this "
          + "family was patterned on emit the field with a hard-coded 0.",
        consequence:
          "The reading is produced by differencing every flattened appearance in the artifact against the same "
          + "source flattened with nothing written on it, keeping only appearances that land at no measured widget "
          + "rectangle. The method is recorded per document in reports/actual-writes.json as outsideBoxProofMethod, "
          + "and any ink it finds is listed under inkOutsideMeasuredWriteBoxes."
      },
      {
        finding:
          "Every sentence of guide prose that states a fee, a service rule, a notice period, a self-help stop "
          + "condition or a limitation is a string taken from tracks[trackId=md_10105_early] of "
          + "data/record-clearing/legal-design-track-registry.json, which is hashed whole and per entry in the source "
          + "receipt. The tort-claim comparison and the \u00a7 10-105.1 automatic-route notice lead the participant "
          + "instructions because that record classifies both as packet instructions and says presenting this route "
          + "without the comparison is a defect.",
        consequence:
          "No fee, deadline, clerk practice, service rule or review approval is stated that the record does not "
          + "state. The record says the fee is $0 and that the court serves the State's Attorney; the packet says "
          + "exactly that and nothing further."
      },
      {
        finding:
          "The boundary fixture's 58-character e-mail address does not fit CC-DC-CR-072C's 157-point e-mail box at "
          + "the minimum readable font, and the shared finalizer refuses it rather than clipping it.",
        consequence:
          "The boundary packet carries no e-mail on that line. That is the boundary fixture doing its job, and this "
          + "family's field map records it honestly: the boundary column is built from the BOUNDARY render report "
          + "rather than copied from the canonical one, so the row shows as a canonical write and a boundary refusal "
          + "with the measured required width beside it. The pattern this family was built from sets "
          + "boundaryWrites = canonicalWrites, which on this family would have claimed ink the boundary artifact "
          + "does not have."
      },
      {
        severity: "advisory",
        finding:
          "The committed track record carries four open gates for this route: output review, visual review, "
          + "technical proof, and a source gate reading \"One or more official sources have no recorded SHA-256, so "
          + "staleness cannot be detected.\"",
        consequence:
          "The source gate is answered for the two binaries this family renders - both are pinned by exact digest in "
          + "the receipt - and is NOT answered for the statute and rule URLs the same record lists with sha256 null. "
          + "The other three gates are outside a build lane entirely. None of them is closed by this build and none "
          + "is claimed to be."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, central raster acceptance, visual review and counsel review",
    buildStatus: allZero ? "state_built" : "overlay_samples_rendered",
    status: allZero ? "PENDING_INDEPENDENT_VERIFICATION" : "STOPPED_COUNTER_NON_ZERO",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    mattersForTheReviewersAttention: [
      "The two-waiver question. CC-DC-CR-072C prints Form 4-503.2 on its own sheet and CC-DC-CR-078 is the "
        + "standalone edition of the same form, declared conditional by the component record. This build renders "
        + "both and tells the participant that a 072C filer signs only the one on the petition. Counsel should "
        + "confirm that is the right delivery, and that the alternative-route sheet belongs in this packet at all.",
      "The tort-claim comparison at the head of participant-instructions.md. The committed record says presenting "
        + "this route without it is a defect; counsel should confirm the wording carries the trade honestly.",
      "The CC-DC-CR-072C signature block: two columns printing the same captions twice, attorney on the left at "
        + "x=35 and defendant on the right at x=319. A drift between them would file a petition asserting counsel "
        + "who is the petitioner."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    stopClass: allZero ? null : "COMPLETENESS_COUNTER_NOT_ZERO",
    counters: counted.counters, counterFindings: counted.findings,
    rasterState: "BUILT_RASTER_PENDING",
    directory: OUT, documents: resolved.map((r) => r.formNumber),
    components: ROUTE.documents.map((d) => d.componentId),
    boundSources: resolved.map((r) => ({ sourceId: r.sourceId, sha256: r.sha256, custody: r.boundFromCustody })),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    participantElections: maps.reduce((n, m) => n + m.selectionControls.length, 0),
    artifacts: artifacts.map((a) => ({
      fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount
    })),
    glyphReadings: writeProofs.map((p) => ({
      fixture: p.fixture, document: p.formNumber,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    })),
    rasterPages: rasterPages.length,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      const built = r.status === "COMPLETED" || r.status === "CHECK_ONLY";
      if (!built) process.exit(2);
    })
    .catch((e) => { console.error(e); process.exit(1); });
}
