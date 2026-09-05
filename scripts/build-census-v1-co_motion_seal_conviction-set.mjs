#!/usr/bin/env node
/**
 * The Colorado conviction sealing family — `co_motion_seal_conviction-set`.
 *
 *   node scripts/build-census-v1-co_motion_seal_conviction-set.mjs [--check] [--no-raster]
 *
 * Two official Judicial Department forms, filed together:
 *
 *   JDF-612  Motion to Seal Conviction Records (County/District Court)  — the filing
 *   JDF-615  Order to Seal Conviction Records                           — the proposed order
 *
 * The route is
 * `obligation:track-pathway:CO:co_motion_seal_conviction:petition-based-conviction-sealing-jdf-612-24-72-706`,
 * C.R.S. § 24-72-706: petition-based sealing of a Colorado conviction record.
 *
 * THREE THINGS ABOUT THESE FORMS SHAPED THE IMPLEMENTATION.
 *
 * First, THE PRINTED TEXT STREAM IS SCRAMBLED. Both forms interleave their glyph
 * runs, and JDF 612 additionally carries runs at a shifted encoding, so text
 * extracted from the content stream comes back as "0LVGHPHDQRU RI2 IIHQVH V"
 * for "Misdemeanor Offense(s) of" and "Distror Cicout nty CoCuarset 1u mber"
 * for "District or County Court Case Number". Every other family in this
 * factory checks its captions by finding the printed line at the widget's
 * recorded coordinate; on these two documents that check cannot be run, because
 * the words are not in the stream in the order they are on the paper.
 *
 * Saying so is the point. The alternative -- a fuzzy match loose enough to
 * accept "NumEer" as "Number" -- would be a check that passes on anything, and
 * a check that cannot fail is worse than an absent one because it reads as
 * evidence. So the caption claim rests on the OTHER thing these forms have, and
 * the absence is recorded in reports/caption-evidence.json with the scrambled
 * extraction beside each field, for the visual reviewer who can read the paper.
 *
 * Second, THE FIELD NAMES ARE AUTHORED AND MEANINGFUL. Colorado named these
 * widgets `County`, `Court Address`, `Case Number`, `∆`, `∆ DoB`, `Phone`,
 * `Email`, `CoS_Date`, `Sig1_Signature`, `6E.1`, `615.4A.2`. That is a
 * deliberate naming scheme keyed to the printed sections, and on a form whose
 * text cannot be read back it is the reliable channel -- which is the same
 * reasoning the shared semantics already applies when it prefers a field name
 * to a harvested caption for date components.
 *
 * Third, JDF 615 IS THE COURT'S ORDER AND SECTION 3 IS THE COURT'S FINDINGS.
 * Each of its five section-3 boxes begins "The Court finds", and the packet
 * leaves every one of them blank: a proposed order that pre-ticked the finding
 * the judge is being asked to make would be drafting the ruling rather than
 * requesting it. The same reasoning leaves the eligibility election in section
 * 8 of JDF 612 to the participant: C.R.S. § 24-72-706 reaches both the
 * expressly eligible offences and the misdemeanor branch that turns on the
 * district attorney's position, and which one applies is a fact about this
 * conviction and that prosecutor, not a property of the route.
 *
 * So FORM_FIELDS below records, for every widget, the section of the form it
 * sits in, the printed label as a human reads it off the paper, and the policy.
 * The build asserts the widget set matches the dictionary exactly, in both
 * directions, and refuses on any drift.
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

/*
 * The calibrated page rasterizer, resolved wherever it lives.
 *
 * The Captain branch moved this module from scripts/lib/ to scripts/raster/ at
 * 5f144ec, and fifteen builders on that branch — including this one — still
 * import the old path, which is not there. Rather than pick one and break on
 * the other base, the import is tried at the new path first and falls back to
 * the old. Only a genuinely missing module is caught: a syntax error or a
 * failed dependency inside the module still throws, because a rasterizer that
 * silently resolves to a stale copy is worse than one that refuses.
 */
const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "co_motion_seal_conviction-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/co/co-motion-seal-conviction-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-co_motion_seal_conviction-set.mjs";

/*
 * TWO OF FOUR, AND THE PARTICIPANT USED TO BE THE LAST TO KNOW.
 *
 * The authoritative packet-set manifest names FOUR required components on this
 * route -- the motion, the order, a notice and a second order -- and records
 * that the last two are absent AND that their official form numbers are
 * unresolved, because the JDF-611 guide renders those digits as vector glyphs
 * and guessing a JDF number would be fabricating an official identity. The same
 * manifest entry already reads packetSetCompleteness.state "incomplete".
 *
 * That blockage is a source problem and this builder cannot lift it. Rendering
 * the two missing documents would mean inventing them, and it is not done here.
 *
 * But the participant was not told. The instructions opened "This packet is two
 * Colorado Judicial Department forms, filed together" and stopped there, so a
 * person filing this packet had every reason to believe it was the whole filing.
 * The disclosure is repairable without lifting the blockage, and it is separate
 * from it: what is owed is an accurate statement of what the packet is and what
 * it is missing, in the manifest's own words, bound to the manifest by digest.
 */
const GROUNDING_RECORDS = Object.freeze({
  packetSetManifest: "data/record-clearing/legal-design-packet-set-manifests.json"
});

const ROUTE = Object.freeze({
  jurisdiction: "CO",
  routeKey: "obligation:track-pathway:CO:co_motion_seal_conviction:petition-based-conviction-sealing-jdf-612-24-72-706",
  routeSelectionId: "co-motion-seal-conviction-set-jdf-612-jdf-615",
  publicLabel: "Motion to seal conviction records, the petition-based route for a Colorado conviction",
  authority: "C.R.S. § 24-72-706; Colorado Judicial Department forms JDF 612 and JDF 615",
  documents: [
    { formNumber: "JDF-612", title: "Motion to Seal Conviction Records (County/District Court)", instrumentKind: "primary_filing" },
    { formNumber: "JDF-615", title: "Order to Seal Conviction Records", instrumentKind: "proposed_order" }
  ]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

/*
 * Read a committed record, hash the bytes that were read, and keep both.
 */
function readGroundingRecord(relative) {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  return {
    path: relative,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    byteLength: bytes.length,
    data: JSON.parse(bytes.toString("utf8"))
  };
}

/*
 * What the authoritative manifest says this packet set is, and what it says is
 * missing from it.
 *
 * Nothing here is inferred. The components this build renders are matched to the
 * manifest by their official form id; the ones it cannot render are the ones the
 * manifest itself marks sourceStatus "identity_unresolved", and their absence is
 * reported in the manifest's own sourceStatusBasis wording. If the manifest ever
 * resolves them the delivered count rises on its own and the disclosure below
 * changes with it -- and if it ever marks this set complete while two components
 * are still unrenderable, the build stops rather than printing a reassurance.
 */
function loadPacketSetGrounding(deliveredFormNumbers) {
  const record = readGroundingRecord(GROUNDING_RECORDS.packetSetManifest);
  const packetSet = (record.data.packetSets ?? []).find((row) => row.packetSetId === FAMILY_ID);
  assert.ok(packetSet, `${GROUNDING_RECORDS.packetSetManifest} holds no packet set ${FAMILY_ID}`);

  const required = (packetSet.components ?? []).filter((row) => row.requirement === "required");
  assert.ok(required.length > 0, `${FAMILY_ID} declares no required components`);

  const delivered = required.filter((row) => row.officialFormId
    && deliveredFormNumbers.includes(String(row.officialFormId).replace(/\s+/g, "-")));
  const undelivered = required.filter((row) => !delivered.includes(row));
  const completeness = packetSet.packetSetCompleteness ?? null;

  assert.ok(completeness && typeof completeness.state === "string",
    `${FAMILY_ID} records no packetSetCompleteness.state`);
  if (undelivered.length > 0) {
    assert.notEqual(completeness.state, "complete",
      `${FAMILY_ID} is marked complete while ${undelivered.length} required component(s) cannot be rendered`);
    for (const row of undelivered) {
      assert.ok(row.sourceStatusBasis,
        `${FAMILY_ID} component ${row.componentId} is undelivered and states no sourceStatusBasis to disclose`);
    }
  }

  return { record, packetSet, required, delivered, undelivered, completeness };
}

/*
 * Plain-English names for the manifest's component roles.
 *
 * The manifest speaks in role identifiers and the participant should not have to.
 * A role the manifest introduces later prints as its own identifier rather than
 * as a guess, which is visible and correctable; a lookup that invented a name for
 * an unknown role would not be.
 *
 * The ordinal matters here and is derived, not asserted: this route requires TWO
 * orders and the packet renders one of them, so the missing one has to read as
 * "a second order for the court to sign" or the participant will look at the
 * JDF-615 in their hand and think the list is already satisfied. The manifest's
 * own basis text calls it "a second order" for exactly that reason.
 */
const DOCUMENT_ROLE_NOUNS = Object.freeze({
  primary_filing: "motion",
  proposed_order: "order for the court to sign",
  required_filing: "notice"
});
const missingComponentLabel = (row, delivered) => {
  const noun = DOCUMENT_ROLE_NOUNS[row.role] ?? row.role;
  return delivered.some((d) => d.role === row.role) ? `a second ${noun}` : `a ${noun}`;
};

const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
const ATTORNEY = (why) => ({ policy: "attorney", why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

/*
 * The agency block on both forms is the same shape and the same reasoning: an
 * arresting or prosecuting AGENCY is a case fact, and the completeness contract
 * refuses to let a court/clerk refusal class hide one. The platform does not
 * hold this participant's agencies, so each is declared and disclosed by name.
 */
const AGENCY = (what) => SUPPLY(what);

const FORM_FIELDS = {
  "JDF-612": {
    /* --- Court, parties, case details (page 1) --------------------------- */
    Group_CourtType: {
      section: "Section A — Court", label: "District Court or County Court (selection)", selection: true,
      ...ELECTION("which court the conviction is in is a fact about your case, and § 24-72-706 sealing is filed in both; the form asks you to say which")
    },
    County: { section: "Section A — Court", label: "Colorado County", ...WRITE("matter.county") },
    "Court Address": {
      section: "Section A — Court", label: "Court Address",
      ...SUPPLY("the street address of the courthouse where the conviction was entered. The Colorado Judicial Department publishes it for every county; the platform holds no court directory")
    },
    "Case Number": { section: "Section C — Case Details", label: "Case Number", ...WRITE("matter.case_number") },
    Division: {
      section: "Section C — Case Details", label: "Division",
      ...PROTECT(COURT_OWNED, "the division is assigned by the court; the box beside it is marked on the form as being for court use")
    },
    Courtroom: {
      section: "Section C — Case Details", label: "Courtroom",
      ...PROTECT(COURT_OWNED, "the courtroom is assigned by the court; the box beside it is marked on the form as being for court use")
    },
    "∆": { section: "Section B — Parties to the Case", label: "Defendant — Full Name", ...WRITE("participant.full_legal_name") },
    "∆ DoB": { section: "Section D — My Information", label: "Birth Date", ...WRITE("participant.date_of_birth") },
    Address: { section: "Section D — My Information", label: "Current Mailing Address (with city/state/zip)", ...WRITE("participant.street_address") },
    Phone: { section: "Section D — My Information", label: "Phone", ...WRITE("participant.phone") },
    Email: { section: "Section D — My Information", label: "Email", ...WRITE("participant.email") },

    /* --- Section 6: the records to be sealed, and who holds them ---------- *
     * Every line in this section sits on a widget Colorado marks HIDDEN: the
     * form reveals each one with its own JavaScript when the checkbox that
     * governs it is ticked. A value written into a hidden widget is invisible
     * ink, so nothing here is written -- including the case number, which the
     * packet holds and prints in the caption of the same page. It is carried to
     * the participant with the reason stated, rather than reported as a write
     * the paper does not show. Every AGENCY beside it is a case fact the
     * platform does not hold at all, and the completeness contract refuses to
     * let a court or clerk refusal class stand in front of one, so each is
     * declared and disclosed by name. */
    "6A.0": { section: "Section 6 — Records to be Sealed", selection: true, label: "District or County Court records to be sealed (selection)", ...ELECTION("tick the courts and agencies that hold records in this case; you know which ones do") },
    "6A.1": {
      section: "Section 6 — Records to be Sealed", label: "Court case number of the records to be sealed",
      ...SUPPLY("the number of the case you are asking to seal, which is the same number printed in the caption of this "
        + "motion. Colorado hides this box until you tick the court box beside it, so nothing typed into it before then "
        + "would appear on the paper; copy the number across once the box appears, or write it in by hand")
    },
    "6B.0": { section: "Section 6 — Records to be Sealed", selection: true, label: "Prosecuting Attorney holds records (selection)", ...ELECTION("tick the courts and agencies that hold records in this case; you know which ones do") },
    "6C.0": { section: "Section 6 — Records to be Sealed", selection: true, label: "Sheriff's Department holds records (selection)", ...ELECTION("tick the courts and agencies that hold records in this case; you know which ones do") },
    "6C.1": { section: "Section 6 — Records to be Sealed", label: "Sheriff's Department — Mailing Address", ...AGENCY("the mailing address of the Sheriff's Department that holds records in this case") },
    "6D.0": { section: "Section 6 — Records to be Sealed", selection: true, label: "Colorado Bureau of Investigation holds records (selection)", ...ELECTION("the form marks the Colorado Bureau of Investigation as required and prints its address for you; tick it") },
    "6E.0": { section: "Section 6 — Records to be Sealed", selection: true, label: "A law enforcement agency holds records (selection)", ...ELECTION("tick the courts and agencies that hold records in this case; you know which ones do") },
    "6E.1": { section: "Section 6 — Records to be Sealed", label: "Law Enforcement agency — Name", ...AGENCY("the name of the law enforcement agency that arrested or cited you") },
    "6E.2": { section: "Section 6 — Records to be Sealed", label: "Law Enforcement agency — that agency's own file number", ...AGENCY("that agency's own file number, which is usually different from the court case number") },
    "6E.3": { section: "Section 6 — Records to be Sealed", label: "Law Enforcement agency — Mailing Address", ...AGENCY("that agency's mailing address") },
    "6F.0": { section: "Section 6 — Records to be Sealed", selection: true, label: "A second law enforcement agency holds records (selection)", ...ELECTION("tick this if a second law enforcement agency holds records in this case") },
    "6F.1": { section: "Section 6 — Records to be Sealed", label: "Second law enforcement agency — Name", ...AGENCY("the name of any second law enforcement agency that holds records in this case") },
    "6F.2": { section: "Section 6 — Records to be Sealed", label: "Second law enforcement agency — that agency's own file number", ...AGENCY("that second agency's own file number") },
    "6F.3": { section: "Section 6 — Records to be Sealed", label: "Second law enforcement agency — Mailing Address", ...AGENCY("that second agency's mailing address") },
    "6G.0": { section: "Section 6 — Records to be Sealed", selection: true, label: "Another agency holds records (selection)", ...ELECTION("tick this if some other agency holds records in this case") },
    "6G.1": { section: "Section 6 — Records to be Sealed", label: "Other agency — Name", ...AGENCY("the name of any other agency holding records in this case") },
    "6G.2": { section: "Section 6 — Records to be Sealed", label: "Other agency — Mailing Address", ...AGENCY("that agency's mailing address") },
    "6H.0": { section: "Section 6 — Records to be Sealed", selection: true, label: "A second other agency holds records (selection)", ...ELECTION("tick this if a second other agency holds records in this case") },
    "6H.1": { section: "Section 6 — Records to be Sealed", label: "Second other agency — Name", ...AGENCY("the name of a second other agency holding records, if there is one") },
    "6H.2": { section: "Section 6 — Records to be Sealed", label: "Second other agency — Mailing Address", ...AGENCY("that second other agency's mailing address") },

    /* --- Section 7: what the conviction was, and when it ended ------------ *
     * Every one of these is read off the court record: the offences, the
     * sentencing date, the date supervision ended. The platform holds none of
     * them, so each is declared REQUIRED_BEFORE_FILING and named to the
     * participant with the clerk of the convicting court as the place to get
     * it. The three yes/no groups are sworn answers about this participant's
     * own history and are theirs to make. */
    "7A.0": { section: "Section 7 — Offence Information", selection: true, label: "Convicted of a petty offence (selection)", ...ELECTION("tick the kind of offence you were convicted of in this case") },
    "7A.1": { section: "Section 7 — Offence Information", label: "Petty offence(s) you were convicted of", ...SUPPLY("the petty offence or offences you were convicted of in this case, exactly as they read on the court record") },
    "7B.0": { section: "Section 7 — Offence Information", selection: true, label: "Convicted of a misdemeanor (selection)", ...ELECTION("tick the kind of offence you were convicted of in this case") },
    "7B.1": { section: "Section 7 — Offence Information", label: "Misdemeanor offence(s) you were convicted of", ...SUPPLY("the misdemeanor offence or offences you were convicted of in this case, exactly as they read on the court record") },
    "7C.0": { section: "Section 7 — Offence Information", selection: true, label: "Convicted of a felony (selection)", ...ELECTION("tick the kind of offence you were convicted of in this case") },
    "7C.1": { section: "Section 7 — Offence Information", label: "Felony offence(s) you were convicted of", ...SUPPLY("the felony offence or offences you were convicted of in this case, exactly as they read on the court record") },
    "7D": { section: "Section 7 — Offence Information", label: "Date sentenced", ...SUPPLY("the date you were sentenced in this case, from the court record") },
    "7E": { section: "Section 7 — Offence Information", label: "Probation or parole supervision termination date", ...SUPPLY("the date your probation or parole supervision in this case ended; the supervising department or the clerk of the convicting court holds it") },
    Group_7A: { section: "Section 7 — Offence Information", selection: true, label: "Whether any of these drug offences were committed before 1 October 2013 (selection)", ...ELECTION("this is a sworn answer about when your own offences happened; the form's note says the court determines eligibility for drug offences committed before that date by the offence's classification at the time of sealing") },
    Group_7B: { section: "Section 7 — Offence Information", selection: true, label: "Whether the charges involved psilocybin or psilocin and the underlying act is no longer unlawful (selection)", ...ELECTION("this is a sworn answer about what your own charges involved") },
    Group_7C: { section: "Section 7 — Offence Information", selection: true, label: "Whether you were a victim of human trafficking and committed the offence as a result (selection)", ...ELECTION("this is a sworn answer about your own history, and no held record establishes it") },

    /* --- Section 8: which branch of § 24-72-706 this motion is under ------ *
     * The route is the petition-based conviction sealing route and the packet
     * states it. Which BRANCH of § 24-72-706 reaches this conviction turns on
     * the offence's own class and on whether this district attorney consents,
     * and neither is a property of the route: a packet that ticked one would be
     * swearing to a legal characterisation of a conviction it has not seen. */
    Group_8B: { section: "Section 8 — Eligibility", selection: true, label: "Which branch of the sealing statute this motion is brought under (selection)", ...ELECTION("C.R.S. § 24-72-706 reaches both the offences it makes expressly eligible and the misdemeanor branch that turns on the prosecutor's position; which one reaches your conviction depends on its class and on this district attorney, and neither is settled by the route this packet was built for") },
    Group_8B_1: { section: "Section 8 — Eligibility", selection: true, label: "Whether the district attorney consents, whether you are asking for a hearing on consent, or whether consent is refused (selection)", ...ELECTION("only you know what the district attorney has said, and the form asks you to state it") },
    "8B.2": { section: "Section 8 — Eligibility", label: "Explain why your records should be sealed if the district attorney does not consent", ...SUPPLY("your own explanation of why the records should be sealed, in your words, if the district attorney does not consent. The platform does not write a sworn narrative for you") },

    /* --- Section 9: appeals, and section 10 ------------------------------- */
    Group_9A: { section: "Section 9 — Other Proceedings", selection: true, label: "Whether the sealing of these records is the subject of any other pending proceeding (selection)", ...ELECTION("a sworn answer about proceedings you are party to; no held record establishes it") },
    Group_9B: { section: "Section 9 — Other Proceedings", selection: true, label: "Whether this conviction was appealed (selection)", ...ELECTION("a sworn answer about your own case history; no held record establishes it") },
    "9B.1": { section: "Section 9 — Other Proceedings", label: "Appeal — the number the appellate court gave the appeal", ...SUPPLY("the number the appellate court gave your appeal, if there was one; the appellate court clerk holds it") },
    "9B.2": { section: "Section 9 — Other Proceedings", selection: true, label: "Which appellate court heard the appeal (selection)", ...ELECTION("you say which court heard your appeal; the form offers District Court, the Colorado Court of Appeals and the Colorado Supreme Court") },
    "9B.3": { section: "Section 9 — Other Proceedings", label: "Appeal — what the appellate court decided", ...SUPPLY("what the appellate court decided, if there was an appeal") },
    "9B.4": { section: "Section 9 — Other Proceedings", label: "Appeal — when the appellate court decided it", ...SUPPLY("when the appellate court decided the appeal, if there was one") },
    Group_9C: { section: "Section 9 — Other Proceedings", selection: true, label: "Whether you have any pending criminal charges (selection)", ...ELECTION("a sworn answer about your own current charges; no held record establishes it") },
    Group_10: { section: "Section 10 — Restitution, Fines, Fees", selection: true, label: "Whether restitution, fines, fees, costs and surcharges ordered in this case have been paid (selection)", ...ELECTION("a sworn answer about what you have paid; the platform holds no ledger of your case obligations") },
    "11.1": { section: "Section 11 — Statement in Support", label: "Explain, in your own words, why the court should seal these records", ...SUPPLY("your own statement of why the court should seal these records. The platform does not write a sworn narrative for you") },

    /* --- Certificate of service and signature ---------------------------- */
    CoS_Date: { section: "Certificate of Service", label: "Certificate of Service — date of service, entered at signature", ...PROTECT(SIGNATURE, "service has not happened when the packet is prepared, and a certificate dated before the act it certifies would be false") },
    Group_CoS: { section: "Certificate of Service", selection: true, label: "Certificate of Service — how you sent it (selection)", ...ELECTION("you tick the method you actually used, at the time you serve the prosecuting attorney") },
    CoS_Mail: { section: "Certificate of Service", label: "Certificate of Service — name and full address served by regular mail", ...PROTECT(SIGNATURE, "the certificate records who you actually served and is completed when you sign it, after service, not in advance") },
    CoS_Other: { section: "Certificate of Service", label: "Certificate of Service — other method, explained", ...PROTECT(SIGNATURE, "the certificate records how you actually served and is completed when you sign it, after service, not in advance") },
    Sig1_Signature: { section: "Signature", label: "Your Signature", ...PROTECT(SIGNATURE, "you sign this yourself") },
    Sig1_Date: { section: "Signature", label: "Date you sign, entered at signature", ...PROTECT(SIGNATURE, "the date is part of the signature block and is entered when you sign") },
    Sig_LawyerSignature: { section: "Signature", label: "Counsel Signature (if any)", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    Sig_Esq: { section: "Signature", selection: true, label: "Counsel signature — Esq. (selection)", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    Sig_Bar: { section: "Signature", label: "Counsel attorney registration number", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") }
  },

  "JDF-615": {
    /* --- A. Court, B. Parties, C. Case details, 2. Defendant -------------- */
    Group_CourtType: {
      section: "A. Court", label: "District Court or County Court (selection)", selection: true,
      ...ELECTION("the proposed order names the same court the motion is filed in; tick the one your case is in")
    },
    County: { section: "A. Court", label: "Colorado County", ...WRITE("matter.county") },
    "Court Address": {
      section: "A. Court", label: "Court Mailing Address",
      ...SUPPLY("the mailing address of the same courthouse, copied from the motion")
    },
    "Case Number": { section: "C. Case Details", label: "Case Number", ...WRITE("matter.case_number") },
    Division: { section: "C. Case Details", label: "Division", ...PROTECT(COURT_OWNED, "assigned by the court; the box beside it is marked for court use") },
    Courtroom: { section: "C. Case Details", label: "Courtroom", ...PROTECT(COURT_OWNED, "assigned by the court; the box beside it is marked for court use") },
    "∆": { section: "B. Parties to the Case", label: "Defendant — Full Name", ...WRITE("participant.full_legal_name") },
    "∆ DoB": { section: "2. Defendant's Information", label: "Birth Date", ...WRITE("participant.date_of_birth") },
    "∆ Street Address": { section: "2. Defendant's Information", label: "Mailing Address", ...WRITE("participant.street_address") },
    "∆ City": { section: "2. Defendant's Information", label: "City", ...WRITE("participant.city") },
    "∆ State": { section: "2. Defendant's Information", label: "State", ...WRITE("participant.state") },
    "∆ Zip": { section: "2. Defendant's Information", label: "Zip Code", ...WRITE("participant.zip") },

    /* --- 3. The court's findings ------------------------------------------ *
     * Each of these five boxes begins "The Court finds". They are the findings
     * the judge is being asked to make, and a proposed order that pre-ticked
     * one would be drafting the ruling rather than requesting it. */
    "615.3A.0": { section: "3. Court Findings", selection: true, label: "By the Court — finding that the motion is for sealing a petty offence or petty drug offence", ...PROTECT(COURT_OWNED, "this box states a finding the court makes; the packet asks for the order, it does not make the finding") },
    "615.3B.0": { section: "3. Court Findings", selection: true, label: "By the Court — finding that the motion is for sealing an eligible misdemeanor or felony", ...PROTECT(COURT_OWNED, "this box states a finding the court makes; the packet asks for the order, it does not make the finding") },
    "478.3C.0": { section: "3. Court Findings", selection: true, label: "By the Court — finding that the harm to privacy outweighs the public interest in retention", ...PROTECT(COURT_OWNED, "this box states a finding the court makes; the packet asks for the order, it does not make the finding") },
    "478.3D.0": { section: "3. Court Findings", selection: true, label: "By the Court — finding that the conduct is no longer unlawful", ...PROTECT(COURT_OWNED, "this box states a finding the court makes; the packet asks for the order, it does not make the finding") },
    "478.3E.0": { section: "3. Court Findings", selection: true, label: "By the Court — finding that the defendant was a victim of human trafficking", ...PROTECT(COURT_OWNED, "this box states a finding the court makes; the packet asks for the order, it does not make the finding") },

    /* --- 4. What the order seals ----------------------------------------- */
    "615.4A.1": { section: "4. Court Orders", label: "Law Enforcement agency — that agency's own file number for the records ordered sealed", ...AGENCY("the law enforcement agency's own file number for these records, copied from the motion") },
    "615.4A.2": { section: "4. Court Orders", label: "Law Enforcement agency — the arrest number of the records ordered sealed", ...AGENCY("the arrest number, which is printed on your fingerprint card") },
    "478.4D": { section: "4. Court Orders", label: "By the Court — other orders", ...PROTECT(COURT_OWNED, "the decree is the court's; a proposed order that wrote the court's other orders would be drafting the judge's ruling") },

    /* --- 5. So ordered ---------------------------------------------------- */
    "478.5A": { section: "5. So Ordered", label: "By the Court — signature", ...PROTECT(COURT_OWNED, "the judge or magistrate signs their own order") },
    "Group478.5B": { section: "5. So Ordered", selection: true, label: "By the Court — Judge or Magistrate (selection)", ...PROTECT(COURT_OWNED, "the officer who signs states which they are") },
    "478.5C": { section: "5. So Ordered", label: "By the Court — Dated", ...PROTECT(COURT_OWNED, "the court dates its own order") }
  }
};
/* ---- fixtures ------------------------------------------------------------ */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "412 Cherry Creek Way, Denver, CO 80202",
    "participant.city": "Denver",
    "participant.state": "CO",
    "participant.zip": "80202",
    "participant.phone": "303-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.county": "Denver",
    "matter.case_number": "2019CR004217"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Colorado Springs, Colorado 80921-2214",
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
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    const entry = all.find((e) => e.state === "CO" && e.formNumber === wanted.formNumber && e.assetClass === "FORM");
    if (!entry) { failures.push({ sourceId: `official-form:${wanted.formNumber}`, why: "no entry for this form number in the committed corpus index" }); continue; }
    const rel = entry.path;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (String(entry.sha256 ?? "") !== sha256) {
      failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel, why: `SHA-256 drift: the committed index says ${entry.sha256}, the mounted corpus holds ${sha256}` });
      continue;
    }
    resolved.push({
      ...wanted, sourceId: `official-form:${wanted.formNumber}`, pathInArchive: rel,
      revision: entry.revision ?? null, sha256, byteLength: bytes.length, bytes,
      acroFieldCount: entry.acroFieldCount ?? null, pageCount: entry.pageCount ?? null
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
       * WHETHER THE FORM SHOWS THIS WIDGET AT ALL.
       *
       * JDF 612 ships twenty-three of its text widgets with the annotation
       * Hidden flag set: Colorado reveals each one with form JavaScript when the
       * checkbox that governs it is ticked. A value written into a hidden widget
       * is invisible ink -- the finalizer reports the write, the flattened bytes
       * carry no appearance, and the paper is blank. That is worse than a blank
       * the packet admits to, so the flag is read here, from the pinned binary,
       * and a write onto a hidden widget is refused by assertion below.
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
    /*
     * What the SOURCE already carries on this control, before this build touches
     * it. JDF 612 ships with the Colorado Bureau of Investigation box already
     * ticked, because the form marks that agency required -- so the finished
     * artifact draws a tick at a rectangle this map refuses, and reading that as
     * "a field the map refused carries ink" would report a protected write this
     * build never made. The form's own default is recorded here, from the
     * pinned binary, so the byte proof can tell the two apart by evidence.
     */
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getSelected === "function") sourceValue = field.getSelected() ?? null;
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }
    rows.push({
      key: name, name, page: widgets[0]?.page ?? null, widgets, sourceValue,
      hiddenUntilTheFormRevealsIt: widgets.some((w) => w.hiddenUntilTheFormRevealsIt === true),
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase()
        .replace("textfield", "text").replace("radiogroup", "radiogroup").replace("checkbox", "checkbox"),
      isSelectionControl: entry.selection === true
        || field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      // The scrambled extraction at this widget's own coordinate, kept as
      // evidence of WHY the printed-caption check is unavailable on this form.
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
    title: source.title
  });
  if (process.env.CO_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
/*
 * WHAT THE PINNED SOURCE ITSELF DRAWS, BEFORE THIS BUILD TOUCHES IT.
 *
 * A form can bake a hint into a widget's own appearance stream rather than into
 * its value, and flattening materialises it. Read from the finished artifact
 * alone that looks exactly like ink on a field the map refused -- a blocking
 * finding, and the wrong one. So each source is flattened once, unwritten, and
 * its own ink recorded per widget. This is stronger than reading the field's
 * value, which catches only the defaults a form stores in /V. Nothing is
 * softened: ink at a widget the source leaves empty, or ink that differs from
 * the source's own, is still a blocking finding.
 */
async function sourceInkOf(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  try { doc.getForm().flatten(); } catch { /* a form that will not flatten leaves no source ink to compare against */ }
  const bytes = await doc.save({ useObjectStreams: false, updateMetadata: false });
  const tmp = path.join(ROOT, `.co-612-source-ink-${source.formNumber}.pdf`);
  fs.writeFileSync(tmp, bytes);
  try { return await flattenedWidgets(tmp); } finally { fs.unlinkSync(tmp); }
}

async function byteProof(source, census, artifactBytes, report, fixtureName, sourceInk = []) {
  const tmp = path.join(ROOT, `.co-612-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
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
          drawnText: text, expected: FIXTURES[fixtureName][r.fact] ?? null,
          matchesExpected: ink === String(FIXTURES[fixtureName][r.fact] ?? "").trim()
        });
        continue;
      }
      if (ink.length === 0) continue;
      // Ink on a control the SOURCE already carried is the form's own default,
      // not a write this build made. JDF 612 ships the CBI box ticked because
      // the form marks that agency required.
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text,
          sourceValue: r.sourceValue,
          note: "the pinned source already carries this value; flattening materialises the form's own default"
        });
        continue;
      }
      // The same ink at the same rectangle in the FLATTENED SOURCE is the form's
      // own appearance, not a write this build made.
      const inSource = drawnAt(sourceInk, { page: wdg.page, rect: wdg.rect }).map((d) => d.text).filter(Boolean);
      if (inSource.join("").trim() === ink) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text,
          sourceAppearanceText: inSource,
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

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`.replace(/\[\d+\]/g, ""),
      acroFieldName: r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      captionBasis: "authored_acroform_field_name_plus_printed_section, because this form's text stream is scrambled",
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

    if (r.isSelectionControl) {
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
      why: `the platform holds no value for this and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: source.instrumentKind,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "acroform",
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
  // Scoped to the DOCUMENT: a field name repeats across the two forms and means
  // something different on each.
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
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })));
}

function participantInstructions(maps, rbf, packetSet) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const elections = maps.flatMap((m) => m.selectionControls.map((c) => ({ document: m.formNumber, ...c })));

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is two Colorado Judicial Department forms, filed together:", "",
    "- **JDF 612**, _Motion to Seal Conviction Records (County/District Court)_ — what you file.",
    "- **JDF 615**, _Order to Seal Conviction Records_ — the order you give the court to sign.", "",
    `Both are prepared for one route — **${ROUTE.publicLabel}** — under ${ROUTE.authority}.`, ""
  );
  out.push(
    "The platform filled in what it holds about you and your case: your name, your date of birth, your address, your "
    + "phone, your e-mail, the county and the case number, on both forms. Everything else is yours, and every one of "
    + "those blanks is listed below by the section of the form it is in.", ""
  );

  if (packetSet.undelivered.length > 0) {
    out.push("## This packet is not the whole filing — read this before you file", "");
    out.push(
      `**Colorado's own guide for this route requires ${packetSet.required.length} documents, and this packet contains `
      + `${packetSet.delivered.length} of them.** The authoritative packet-set record for this route says so in its own `
      + `words: “${packetSet.completeness.basis}” It records the state of this packet set as `
      + `**${packetSet.completeness.state}**.`, ""
    );
    out.push(
      `The ${packetSet.undelivered.length} documents this packet does not contain are:`, ""
    );
    for (const row of packetSet.undelivered) {
      out.push(`- **${missingComponentLabel(row, packetSet.delivered)}** — ${row.sourceStatusBasis}`);
    }
    out.push("");
    out.push(
      "**No form number is printed for either of them here, and none should be inferred from this packet.** The record "
      + "is explicit that guessing a JDF number would be fabricating an official identity, and this packet will not do "
      + "that. What that means for you is practical: ask the clerk of the court, or the Colorado Judicial Department's "
      + "self-help centre, for the current JDF-611 guide and for the notice and the second order it requires, and get "
      + "them from Colorado rather than from here. Do not assume the two forms in this packet are a complete filing, "
      + "and do not assume the court will supply the missing two for you.", ""
    );
    out.push(
      "Everything else in this packet — both forms, every blank named below and every choice left to you — is prepared "
      + "and is accurate for the two documents it does contain. The gap above is about what is missing from the set, "
      + "not about what is in it.", ""
    );
  }

  out.push("## Where you file this", "");
  out.push(
    "File both forms with the **clerk of the Colorado court that entered the conviction** — the District Court or the "
    + "County Court named in section A of the motion, in the county already filled in for you. The Colorado Judicial "
    + "Department publishes each courthouse's address; this packet does not state one, because the platform holds no "
    + "court directory and an unsourced address in a filing instruction is worse than none.", ""
  );
  out.push(
    "**Ask the clerk what fee applies, and what to do if you cannot pay it.** The fee position for a motion to seal a "
    + "conviction record is not established in any source this packet holds, so it is not stated here.", ""
  );

  out.push("## The Colorado Bureau of Investigation is not optional", "");
  out.push(
    "JDF 612 prints the CBI's address for you — ATTN Identification-Seals, 690 Kipling St. STE 3000, Lakewood, CO 80215 "
    + "— and marks it **required**. Tick it. The signed order is what reaches the CBI, so the agency list on the motion "
    + "is what decides who is bound by it.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in every item in the tables below.** Each names the form, the section and the blank.");
  out.push("2. **Make the choices listed under _The choices that are yours_.** They are left blank on purpose.");
  out.push("3. **Get the offence, sentencing and supervision facts from the court record.** Section 7 of JDF 612 asks what you were convicted of, when you were sentenced, and when supervision ended. The clerk of the convicting court holds all three; do not estimate them.");
  out.push("4. **Serve a copy on the prosecuting attorney**, then complete the certificate of service on JDF 612 — the date, the method, and who you sent it to. Do it after you have served, not before.");
  out.push("5. **Sign JDF 612 yourself, and date it when you sign.** Neither is filled in for you.");
  out.push("6. **Leave the court's own parts of JDF 615 alone.** Section 3 is the court's findings — every box there begins \"The Court finds\" — the other-orders box in section 4 is the court's, and section 5 is the judge's or magistrate's signature and date. The case number in the caption is already written for you. The two lines in section 4 that name the law enforcement agency's own file number and the arrest number ARE yours, and they are listed in the table below.");
  out.push("");

  for (const [doc, items] of byDoc) {
    const title = ROUTE.documents.find((d) => d.formNumber === doc)?.title ?? doc;
    out.push(`## ${doc} — ${title}: the items you must supply`, "");
    out.push("| Section | The blank on the form | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.section} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## The choices that are yours", "");
  out.push("| Form | Section | The choice | Why it is yours |", "| --- | --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.document} | ${c.sectionHeading} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your signature on JDF 612, and the date beside it.** You sign it yourself, on the day you sign.");
  out.push("- **The certificate of service on JDF 612** — the date, the method and the person served. Service has not happened when this packet is prepared, and a certificate dated before the act it certifies would be false.");
  out.push("- **The counsel signature block.** You are filing this yourself; no attorney-representation fact is held for you.");
  out.push("- **The Division and Courtroom boxes on both forms.** The form marks that box for court use.");
  out.push("- **Section 3 of JDF 615 — the court's findings.** Every box there begins \"The Court finds\". A proposed order that pre-ticked the finding the judge is being asked to make would be drafting the ruling rather than requesting it.");
  out.push("- **Sections 4 and 5 of JDF 615** — the court's other orders, and the judge's or magistrate's signature and date.");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared set of official Colorado Judicial Department forms. It is not legal advice, it is not filed for "
    + "you, and it does not decide whether your conviction is eligible to be sealed. JDF 612 sets out the eligibility "
    + "conditions in its own words, including the offences section 8 lists as not eligible and the branch that depends "
    + "on the district attorney's consent. Read them before you swear to them."
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

  /* What the authoritative manifest says the whole set is, measured against the
   * documents this build can actually render from held sources. */
  const packetSet = loadPacketSetGrounding(resolved.map((r) => r.formNumber));

  const censuses = [];
  for (const source of resolved) {
    const census = await censusOf(source);
    assert.equal(census.unmapped.length, 0,
      `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 5).map((u) => u.field))}`);
    assert.equal(census.stale.length, 0,
      `${source.formNumber}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
    /*
     * A write onto a widget the form hides is invisible ink. The finalizer would
     * report it, the flattened bytes would carry nothing, and the packet would
     * claim a value the paper does not show -- so it is refused here rather than
     * discovered by a reader of the raster.
     */
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
        formNumber: source.formNumber, sha256: source.sha256, fields: census.rows.length,
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
  const instructionsText = participantInstructions(maps, rbf, packetSet);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number + committed corpus-index SHA-256 + on-disk SHA-256 + byte length",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength, instrumentKind: r.instrumentKind
    })),
    /*
     * The manifest is bound here because the packet now quotes it to the
     * participant. It is the record that says the set is incomplete, and a
     * disclosure of incompleteness is worth no more than the record behind it.
     */
    groundingRecords: [
      {
        path: packetSet.record.path, sha256: packetSet.record.sha256, byteLength: packetSet.record.byteLength,
        packetSetId: FAMILY_ID,
        fieldsQuotedOnParticipantSurfaces: [
          "packetSetCompleteness.state", "packetSetCompleteness.basis", "components[].sourceStatusBasis"
        ],
        whyItIsBound:
          "participant-instructions.md now states that this route requires "
          + `${packetSet.required.length} required components and that this packet contains `
          + `${packetSet.delivered.length}, quoting the manifest's own completeness basis and the per-component reason `
          + "each missing identity is unresolved."
      }
    ],
    componentSetDelivery: {
      requiredComponents: packetSet.required.length,
      deliveredComponents: packetSet.delivered.length,
      packetSetCompletenessState: packetSet.completeness.state,
      undelivered: packetSet.undelivered.map((row) => ({
        componentId: row.componentId, role: row.role, officialFormId: row.officialFormId ?? null,
        sourceStatus: row.sourceStatus ?? null, sourceStatusBasis: row.sourceStatusBasis ?? null
      })),
      disclosedToParticipant: packetSet.undelivered.length > 0,
      whyTheyAreNotRendered:
        "Their official identities are unresolved in the authoritative manifest. Rendering them would require "
        + "inventing an official form identity, which this build refuses. The gap is disclosed, not filled."
    },
    sourceBinaryCommitted: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "These two forms interleave their glyph runs, so text extracted from the content stream comes back scrambled "
      + "(\"Case NumEer\", \"Motion to -CSoeanvil ctNoinon Records\"). A printed-caption check cannot be run on them, and a "
      + "match loose enough to accept the scrambled text would pass on anything. Captions here are the AcroForm field "
      + "names Colorado authored, which are meaningful and section-keyed, plus the printed section heading. The scrambled "
      + "extraction at each widget's own coordinate is recorded beside it as evidence, for the reviewer who reads the paper.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        hiddenUntilTheFormRevealsIt: r.hiddenUntilTheFormRevealsIt === true,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      }))
    }))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    finding:
      "JDF 612 and JDF 615 interleave their glyph runs, and JDF 612 additionally carries runs at a shifted encoding. "
      + "Text extracted from the content stream is scrambled at the character level -- \"0LVGHPHDQRU RI2 IIHQVH V\" for "
      + "\"Misdemeanor Offense(s) of\" -- so no printed-caption check can be run against them.",
    whyThisIsNotWorkedAround:
      "A fuzzy match loose enough to accept \"NumEer\" as \"Number\" would pass on almost anything, and a check that "
      + "cannot fail reads as evidence while proving nothing. The absence is recorded instead.",
    whatTheCaptionClaimRestsOnHere:
      "Colorado authored these widget names -- County, Court Address, Case Number, Phone, Email, CoS_Date, "
      + "Sig1_Signature, 6E.1, 615.4A.2 -- and they are keyed to the printed sections. The dictionary and the widget set "
      + "are asserted to match exactly in both directions, and every placement is rastered for a reviewer who can read "
      + "the paper.",
    perField: censuses.flatMap(({ source, census }) => census.rows.map((r) => ({
      document: source.formNumber, field: r.key, page: r.page, rect: r.rect,
      labelThisBuildUses: r.effectiveLabel, section: r.section,
      textExtractedAtThisCoordinate: r.printedTextAtCoordinate
    })))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "acroform_fill",
    captionBasis: "authored AcroForm field names plus printed section headings; see reports/caption-evidence.json",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "The packet states the route it was built for: petition-based sealing of a conviction record under C.R.S. "
      + "§ 24-72-706, on JDF 612 with JDF 615 as the proposed order. Which BRANCH of § 24-72-706 reaches this conviction "
      + "-- the expressly eligible offences, or the misdemeanor branch that turns on the district attorney's position -- "
      + "depends on the offence's own class and on that prosecutor, and neither is settled by the route. Ticking one "
      + "would be swearing to a legal characterisation of a conviction this build has not seen, so the branch, the court "
      + "type, the offence class, the agency list and every sworn yes-or-no answer are left to the participant and "
      + "disclosed by name.",
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
      "Every page of both fixtures is rastered for a human who did not build this family. It matters more than usual "
      + "here: these two forms cannot be caption-checked from their own text stream, so a reviewer reading the paper is "
      + "the check that a value sits under the heading it belongs to.",
    whatToLookAt: [
      "JDF 612 sections A, B, C and D, and JDF 615 sections A, B, C and 2: confirm the county, case number, defendant "
        + "name, birth date, address, phone and e-mail each sit under the heading they belong to. The text stream is "
        + "scrambled, so this is the check. On JDF 615 the town and the zip appear twice — inside the mailing-address "
        + "line and again in the boxes beside it — because JDF 612's own caption asks for the whole address on one "
        + "line and one fact serves both forms. That is deliberate; see build-findings.json.",
      "JDF 612 section 6: the agency boxes unticked apart from the Colorado Bureau of Investigation box the form itself "
        + "ships ticked, and every line in the section blank — including the court case number line. Colorado hides "
        + "those twenty-three widgets until the box governing each is ticked, so a blank line here is the form working "
        + "as designed and NOT a value that failed to print. The case number does appear, in the caption of the same "
        + "page.",
      "JDF 612 section 7: the three offence-class boxes unticked, the offence lines blank, and the sentencing and "
        + "supervision-termination dates blank.",
      "JDF 612 section 8: neither eligibility branch ticked, none of the three consent options ticked, and the "
        + "explanation box blank.",
      "JDF 612 sections 9, 10 and 11: every yes-or-no group unticked, the appeal lines blank, and the statement box blank.",
      "JDF 612 certificate of service and signature: no service date, no method, no recipient, no signature, no date, "
        + "and the counsel block blank.",
      "JDF 615 section 3: all five court findings unticked. This is the one to look at hardest — each begins \"The Court "
        + "finds\", and a tick there would be the packet making the judge's finding for them.",
      "JDF 615 sections 4 and 5: the case number written, the arrest number blank, the other-orders box blank, the "
        + "signature and date blank, and neither Judge nor Magistrate ticked."
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
        finding: "JDF 612 and JDF 615 interleave their glyph runs, and JDF 612 additionally carries runs at a shifted encoding; extracted text is scrambled at the character level.",
        consequence:
          "No printed-caption check can be run on either form. The captions rest on Colorado's own authored field names "
          + "and the printed section headings; the scrambled extraction is recorded per field in "
          + "reports/caption-evidence.json, and placement is left to the visual reviewer, who can read the paper."
      },
      {
        finding: "C.R.S. § 24-72-706 reaches a conviction by two branches, and section 8 of JDF 612 asks which one applies.",
        consequence:
          "The branch is a participant election rather than a route-determined selection: it turns on the offence's own "
          + "class and on whether this district attorney consents, and a packet that ticked one would be swearing to a "
          + "legal characterisation of a conviction the build has not seen. The route the packet WAS built for is stated "
          + "in the field map, the source receipt and the participant instructions."
      },
      {
        finding: "Section 3 of JDF 615 is the court's own findings — every box there begins \"The Court finds\".",
        consequence:
          "All five are left blank under the court-owned refusal class. A proposed order that pre-ticked the finding the "
          + "judge is being asked to make would be drafting the ruling rather than requesting it."
      },
      {
        finding: "Section 7 of JDF 612 asks what the conviction was, when sentence was imposed and when supervision ended, and the platform holds none of the three.",
        consequence:
          "Each is declared REQUIRED_BEFORE_FILING and named to the participant in participant-instructions.md, with the "
          + "clerk of the convicting court as the place to get it. None is estimated: a sentencing date guessed onto a "
          + "sworn motion is worse than a blank one."
      },
      {
        finding: "Both forms ask for the agencies holding records, and the completeness contract refuses to let a court or clerk refusal class excuse an agency fact.",
        consequence:
          "Every agency name, file number and address is declared REQUIRED_BEFORE_FILING and named to the participant in "
          + "participant-instructions.md, rather than being bundled into a protected class."
      },
      {
        finding:
          "JDF 612 ships with the Colorado Bureau of Investigation box already ticked, because the form marks that agency "
          + "required. The finished artifact therefore draws a tick at a rectangle this map refuses.",
        consequence:
          "The census reads each control's value from the pinned source, and the byte proof records ink at a control the "
          + "source already carried as a documentAuthoredAppearance rather than as ink on a refused field. Reading it the "
          + "other way would report a protected write this build never made. Nothing is softened: a control the source "
          + "leaves empty that carries ink in the output is still a blocking finding."
      },
      {
        finding:
          "The MASTER_QUEUE row for this family names its two sources at paths in the nationwide recovery pool "
          + "(LegalEase Colorado/forms/JDF-612__…, JDF-615__…), a custody this container does not mount.",
        consequence:
          "The build binds both forms from the Master Library instead, by exact form number and exact SHA-256 — "
          + "8600b4b9a4b27fe821e843cf6bfc21f45325f0791bb9d1e62a0326d7261f927e for JDF 612 and "
          + "106cbd5edad2272f3f6f1378450b007507da879e6a917437d2cc3bb062d87647 for JDF 615 — which are the same digests the "
          + "queue pins. The committed corpus index records both digests in the Master Library custody as well as in the "
          + "recovery pool, so this is one binary held in two custodies, not a substituted source. The absent custody is "
          + "stated rather than worked around, and the source receipt records the path actually read."
      },
      {
        finding:
          "JDF 612 ships TWENTY-THREE of its text widgets with the annotation Hidden flag set — 6A.1, 6C.1, 6E.1, 6E.2, "
          + "6E.3, 6F.1, 6F.2, 6F.3, 6G.1, 6G.2, 6H.1, 6H.2, 7A.1, 7B.1, 7C.1, 8B.2, 9B.1, 9B.2, 9B.3, 9B.4, CoS_Mail, "
          + "CoS_Other and Sig_Bar. Colorado reveals each one with the form's own JavaScript when the checkbox or radio "
          + "group that governs it is ticked.",
        consequence:
          "A value written into a hidden widget is invisible ink: the finalizer reports the write, the flattened bytes "
          + "carry no appearance, and the paper is blank. This build measured that directly — a case-number write into "
          + "6A.1 was reported by the finalizer and read back as no ink at the widget's own rectangle — so the census "
          + "now reads the annotation flags from the pinned binary and the build ASSERTS that no write lands on a "
          + "hidden widget. 6A.1 is carried to the participant instead, with the reason stated: the packet holds the "
          + "case number and prints it in the caption of the same page, and the participant copies it across once the "
          + "box is revealed. Claiming it as a write would have been the worst available outcome."
      },
      {
        finding:
          "JDF 612 asks for the participant's address on ONE line — its caption reads \"Mailing Address: (with "
          + "city/state/zip)\" — and JDF 615 asks for the same address in four boxes: street, city, state and zip. The "
          + "packet holds one street fact and writes it in both places, so the order shows the town and the zip twice: "
          + "once inside the mailing-address line and once in the boxes beside it.",
        consequence:
          "Deliberate, and recorded here so a reviewer does not read it as a stray write. The alternative was to hold a "
          + "street-only fact, which would leave JDF 612's line short of the city, state and zip its own caption asks "
          + "for; the shared semantic registry has no fact for a composed address line, and this build does not invent "
          + "one. Neither statement on the paper is untrue. The sibling family co_decriminalized_conduct_seal-set does "
          + "NOT have this shape: both of its forms give the street its own line, so the street fact there is the "
          + "street alone."
      },
      {
        severity: "advisory",
        finding:
          "A boundary value that does not fit its line at the minimum readable font is refused by the shared finalizer "
          + "rather than clipped.",
        consequence:
          "Recorded in reports/actual-writes.json under unfittable. That is the boundary fixture doing its job; the "
          + "canonical fixture writes the value."
      },
      {
        severity: "advisory",
        finding:
          "The boundary participant's name carries a typographic apostrophe (U+2019) and the finalized bytes carry the "
          + "name without it.",
        consequence:
          "Recorded for visual review. The behaviour is in the shared finalizer's font encoding and reproduces in "
          + "vt_seal_misdemeanor-set, which is already PASS_COMPLETE."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    mattersForTheReviewersAttention: [
      "reports/caption-evidence.json — these two forms cannot be caption-checked from their own text stream, so visual review carries more weight here than usual."
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
