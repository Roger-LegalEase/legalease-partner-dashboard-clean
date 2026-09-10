#!/usr/bin/env node
/**
 * The Colorado non-conviction sealing family — `co_motion_seal_nonconviction-set`.
 *
 *   node scripts/build-census-v1-co_motion_seal_nonconviction-set.mjs [--check] [--no-raster]
 *
 * Two official Judicial Department forms, filed together:
 *
 *   JDF-477  Motion to Seal Non-Conviction Records (simplified process)  — the filing
 *   JDF-478  Order to Seal Non-Conviction Records                        — the proposed order
 *
 * The route is `track:CO:co_motion_seal_nonconviction`, C.R.S. § 24-72-705(2)
 * and (3): the simplified backstop for records that did not end in a conviction.
 *
 * TWO THINGS ABOUT THESE FORMS SHAPED THE IMPLEMENTATION.
 *
 * First, THE PRINTED TEXT STREAM IS SCRAMBLED. Both forms interleave their glyph
 * runs, so text extracted from the content stream comes back as
 * "Motion to -CSoeanvil ctNoinon Records" and "Case NumEer". Every other family
 * in this factory checks its captions by finding the printed line at the
 * widget's recorded coordinate; on these two documents that check cannot be run,
 * because the words are not in the stream in the order they are on the paper.
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
 * `Email`, `CoS_Date`, `Sig1_Signature`, `8D.1`, `478.3C.2`. That is a
 * deliberate naming scheme keyed to the printed sections, and on a form whose
 * text cannot be read back it is the reliable channel -- which is the same
 * reasoning the shared semantics already applies when it prefers a field name
 * to a harvested caption for date components.
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

const FAMILY_ID = "co_motion_seal_nonconviction-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/co/co-motion-seal-nonconviction-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-co_motion_seal_nonconviction-set.mjs";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const TRACK_ID = "co_motion_seal_nonconviction";

const ROUTE = Object.freeze({
  jurisdiction: "CO",
  routeKey: "track:CO:co_motion_seal_nonconviction",
  routeSelectionId: "co-motion-seal-nonconviction-set-jdf-477-jdf-478",
  publicLabel: "Motion to seal non-conviction records, simplified backstop",
  authority: "C.R.S. § 24-72-705(2) and (3); Colorado Judicial Department forms JDF 477 and JDF 478",
  documents: [
    { formNumber: "JDF-477", title: "Motion to Seal Non-Conviction Records (Simplified Process)", instrumentKind: "primary_filing" },
    { formNumber: "JDF-478", title: "Order to Seal Non-Conviction Records", instrumentKind: "proposed_order" }
  ]
});

const GROUNDING_RECORDS = Object.freeze({
  packetSetManifest: "data/record-clearing/legal-design-packet-set-manifests.json"
});

/*
 * THE OFFICIAL GUIDE, BOUND BY DIGEST AND READ AT BUILD TIME.
 *
 * JDF 491 is the Colorado Judicial Department's own step-by-step guide for this
 * exact route, at the same revision as both bound forms. VF22 read it at base
 * 8db74d6e5 and found that its step 2 names FOUR forms where this packet
 * delivers two, and that nothing in this family recorded the difference: not
 * the packet-set manifest, not the track registry, not one sentence of the
 * delivered guide, which said flatly that the packet is "two Colorado Judicial
 * Department forms, filed together".
 *
 * Unlike JDF 477 and JDF 478, this guide's text stream is NOT scrambled: its
 * items concatenate to clean prose in stream order, and pdftotext agrees with
 * the stream. So every sentence this packet takes from the guide is asserted
 * here as a literal substring of the digest-bound stream, on the page it is
 * declared for. A quotation that stops matching stops the build.
 */
const GUIDE = Object.freeze({
  formNumber: "JDF-491",
  title: "Guide to Sealing Non-Conviction Records (simplified process)",
  sha256: "79dca4e720161b68ae74a8973392bbe22c05f565f704c609ec7cc7da0fcd3685"
});

const GUIDE_QUOTATIONS = Object.freeze({
  fileTheRequest: {
    page: 1,
    text: "File these forms into your criminal case:  JDF 477 Motion • Be sure to list all agency addresses you "
      + "found in Step 1.  JDF 492 Order (just do §§ A-C)  JDF 493 Notice (Just do §§ A-C)  JDF 478 Order "
      + "(just do §§ A-C)"
  },
  sendACopy: { page: 1, text: "Mail a copy of your motion to the Prosecuting Attorney\u2019s office." }
});

/*
 * The identity each undelivered component has in the guide's own list, keyed by
 * the manifest's componentId. Nothing here is inferred: the manifest names the
 * component and the guide names the form.
 */
const GUIDE_NAMES_THE_MISSING_COMPONENTS = Object.freeze({
  "co_motion_seal_nonconviction-notice-3": { formNumber: "JDF 493", asTheGuideWritesIt: "JDF 493 Notice (Just do §§ A-C)" },
  "co_motion_seal_nonconviction-second-order-4": { formNumber: "JDF 492", asTheGuideWritesIt: "JDF 492 Order (just do §§ A-C)" }
});

/*
 * Where the two undelivered binaries are recorded in the committed corpus
 * index, and why neither can be rendered. The two are NOT blocked by the same
 * thing, and this build says which is which rather than treating "missing" as
 * one condition.
 *
 * JDF 492 is blocked by IDENTITY. Its index entry carries formNumber null and
 * assetClass null, and resolveSources() binds an official form by
 * state + formNumber + assetClass "FORM" and only then hashes it -- so no build
 * can bind a binary the index does not identify, and binding by file name would
 * rest this packet's source claim on a file name.
 *
 * JDF 493 is blocked by the BYTES THEMSELVES. The copy the index holds is
 * revision 2019-08 against a guide revised 2024-08-07, it carries zero AcroForm
 * fields (structuralClassObserved flat_pdf), and it has no lettered sections at
 * all where the 2024 guide says to complete "§§ A-C". An official_pdf_fill
 * component cannot be filled from a flat PDF, and there is affirmative evidence
 * on the document's own face that it is not the revision the guide names.
 *
 * Neither reason is a mount. Lane FIX157 measured that on 2026-09-10: the
 * custody is declared in the index's own custodies array at root
 * private/source-imports/Nationwide_Recovery_Pool_2026-09-02, it was mounted in
 * the FIX157 lane worktree, and both binaries hashed there to exactly the
 * digests below. This build reads only the COMMITTED INDEX, so its output is
 * identical in a container that mounts the custody and one that does not.
 */
const RECOVERY_POOL = Object.freeze({
  custody: "nationwide_recovery_pool_2026_09_02",
  entries: Object.freeze([
    Object.freeze({
      formNumber: "JDF 493", componentId: "co_motion_seal_nonconviction-notice-3",
      path: "LegalEase Colorado/reference-only/JDF-493__order-and-notice-of-hearing-to-seal-non-conviction-records__rev-2019-08.pdf",
      sha256: "fb500eb1d0f04e7ab5a7bd1f4932cff27edb451a5c2d66c60288fad96726ef1c",
      byteLength: 51649, pageCount: 1, acroFieldCount: 0,
      blockedBy: "held_bytes_are_a_flat_pdf_at_a_superseded_revision"
    }),
    Object.freeze({
      formNumber: "JDF 492", componentId: "co_motion_seal_nonconviction-second-order-4",
      path: "LegalEase Colorado/JDF492.pdf",
      sha256: "6b7e427a9696110d6568909802ab9204f9e80d01ca33e577e71678f9514dc996",
      byteLength: 546426, pageCount: 1, acroFieldCount: 13,
      blockedBy: "committed_index_does_not_identify_the_entry",
      whatThisFormIs:
        "The order DENYING the request to seal, confirmed by lane FIX157 on 2026-09-10 from the bytes at the digest "
        + "above. Page 1 is headed \"JDF 492  Order Denying Request to Seal Non-Conviction Records\"; it carries "
        + "lettered sections A. Court, B. Parties to the Case and C. Case Details -- the \"§§ A-C\" the guide tells a "
        + "filer to complete -- and its footer reads \"JDF 492 - Order Denying Request to Seal Non-Conviction "
        + "Records   R: August 7, 2024   Page 1 of 1\", the same revision as JDF 491. So the \"second order\" the "
        + "guide lists is the denial order tendered alongside the JDF 478 grant order, not a second grant."
    })
  ])
});

/*
 * Plain-English names for the manifest's component roles. A role the manifest
 * introduces later prints as its own identifier rather than as a guess.
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

/* Read a committed record, hash the bytes that were read, and keep both. */
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
 * missing from it. Components this build renders are matched to the manifest by
 * official form id; the rest are undelivered and each must state a
 * sourceStatusBasis for the packet to disclose. If the manifest ever marks the
 * set complete while a required component cannot be rendered, the build stops
 * rather than printing a reassurance.
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
  const requiredBeforeFiling = (packetSet.requiredBeforeFiling ?? []).map((x) => String(x).trim()).filter(Boolean);
  assert.ok(requiredBeforeFiling.length > 0,
    `${FAMILY_ID} declares no requiredBeforeFiling items, and this packet may not claim to carry a list it does not have`);

  return { record, packetSet, required, delivered, undelivered, completeness, requiredBeforeFiling };
}

/*
 * The blocker for each undelivered component, proved from the committed index
 * rather than from the disk. See the RECOVERY_POOL comment for why identity and
 * revision, not the mount, are what this asserts.
 */
function assertRecoveryPoolEntriesAreRecordedAsExpected() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const measured = [];
  for (const entry of RECOVERY_POOL.entries) {
    const rows = (index.entries ?? []).filter((e) => e.path === entry.path && e.custody === RECOVERY_POOL.custody);
    assert.equal(rows.length, 1,
      `the committed corpus index carries ${rows.length} entries at ${entry.path} in custody ${RECOVERY_POOL.custody}`);
    const row = rows[0];
    assert.equal(row.sha256, entry.sha256, `${entry.path}: the committed index digest is not the one this build quotes`);
    assert.equal(row.byteLength, entry.byteLength, `${entry.path}: the committed index byte length is not the one this build quotes`);
    assert.equal(row.formNumber, null,
      `${entry.path} now carries formNumber ${JSON.stringify(row.formNumber)}: this packet's account of why the component is undelivered is stale`);
    assert.equal(row.acroFieldCount ?? 0, entry.acroFieldCount,
      `${entry.path}: the committed index records ${row.acroFieldCount} AcroForm fields and this build quotes ${entry.acroFieldCount}`);
    measured.push({ path: entry.path, formNumber: row.formNumber, assetClass: row.assetClass,
      sha256: row.sha256, byteLength: row.byteLength, pageCount: row.pageCount ?? null,
      acroFieldCount: row.acroFieldCount ?? null, structuralClassObserved: row.structuralClassObserved ?? null });
  }
  return measured;
}

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
const ATTORNEY = (why) => ({ policy: "attorney", why });
/*
 * A selection the ROUTE settles, marked by the packet rather than left to the
 * participant. It goes through the shared finalizer's selectionsFromHeldFacts
 * channel, which honours only a true, requires a basis in the same call, and
 * applies every protect gate unchanged -- so this cannot reach a signature, a
 * certificate of service, or a court-, clerk- or prosecutor-owned box.
 */
const SETTLED_SELECTION = (basis) => ({ policy: "settled_selection", basis });

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
  "JDF-477": {
    /* --- 1. Court ------------------------------------------------------- */
    Group_CourtType: {
      section: "1. Court", label: "District Court or County Court (selection)", selection: true,
      ...ELECTION("which court the case was in is a fact about your case, and the simplified sealing process runs in both; the form asks you to say which")
    },
    County: { section: "1. Court", label: "Colorado County", ...WRITE("matter.county") },
    "Court Address": {
      section: "1. Court", label: "Court Address",
      ...SUPPLY("the street address of the courthouse where the case was filed. The Colorado Judicial Department publishes it for every county; the platform holds no court directory")
    },
    "Case Number": { section: "3. Case Details", label: "Case Number", ...WRITE("matter.case_number") },
    Division: {
      section: "3. Case Details", label: "Division",
      ...PROTECT(COURT_OWNED, "the division is assigned by the court; the box beside it is marked on the form as being for court use")
    },
    Courtroom: {
      section: "3. Case Details", label: "Courtroom",
      ...PROTECT(COURT_OWNED, "the courtroom is assigned by the court; the box beside it is marked on the form as being for court use")
    },

    /* --- 2. Parties, and 5. My Information ------------------------------ */
    "∆": { section: "2. Parties to the Case", label: "Defendant — Full Name", ...WRITE("participant.full_legal_name") },
    "∆ DoB": { section: "5. My Information", label: "Birth Date", ...WRITE("participant.date_of_birth") },
    /*
     * The form's caption asks for city/state/zip on this one line and the
     * packet writes the street alone; see the FIXTURES comment. The remainder
     * is handed to the participant in participant-instructions.md rather than
     * being left for them to notice.
     */
    Address: { section: "5. My Information", label: "Current Mailing Address (with city/state/zip)", ...WRITE("participant.street_address") },
    Phone: { section: "5. My Information", label: "Phone", ...WRITE("participant.phone") },
    Email: { section: "5. My Information", label: "Email", ...WRITE("participant.email") },

    /* --- 6. Grounds for sealing ----------------------------------------- *
     * Five grounds, one form, one route. C.R.S. § 24-72-705 is the simplified
     * process for all of them, so the route does not choose between them: which
     * ground applies is a fact about how THIS case ended, and the participant
     * is the one who knows it. A packet that ticked one would be asserting a
     * disposition it does not hold. */
    Group_6_0: {
      section: "6. Grounds for Sealing Records", selection: true,
      label: "Ground for sealing — acquittal, dismissal, vacated conviction of a trafficking victim, completed diversion, or completed deferred judgment (selection)",
      ...ELECTION("C.R.S. § 24-72-705 is the simplified process for all five grounds, so the route does not choose between them; which one applies is a fact about how your case ended and you tick it")
    },
    "6_1": { section: "6. Grounds for Sealing Records", label: "Date you were acquitted of all charges", ...SUPPLY("the date you were acquitted of all charges, if that is your ground") },
    "6_2": { section: "6. Grounds for Sealing Records", label: "Date the case was completely dismissed", ...SUPPLY("the date the case was completely dismissed, if that is your ground — and remember the form's condition that the dismissal was not part of a plea agreement in a separate case") },
    "6_3": { section: "6. Grounds for Sealing Records", label: "Date you completed a diversion agreement", ...SUPPLY("the date you completed the diversion agreement, if that is your ground") },
    "6_4": { section: "6. Grounds for Sealing Records", label: "Date you completed a deferred judgment and sentence", ...SUPPLY("the date you completed the deferred judgment and sentence, if that is your ground") },

    /* --- 8. Records to be sealed: the agencies -------------------------- */
    "8A.0": { section: "8. Records to be Sealed", selection: true, label: "Prosecuting Attorney holds records (selection)", ...ELECTION("tick every agency that holds records in this case; you know which ones do") },
    "8B.0": { section: "8. Records to be Sealed", selection: true, label: "Sheriff's Department holds records (selection)", ...ELECTION("tick every agency that holds records in this case; you know which ones do") },
    "8B.1": { section: "8. Records to be Sealed", label: "Sheriff's Department — Mailing Address", ...AGENCY("the mailing address of the Sheriff's Department that holds records in this case") },
    "8C.0": { section: "8. Records to be Sealed", selection: true, label: "Colorado Bureau of Investigation holds records (selection)", ...ELECTION("the form marks the Colorado Bureau of Investigation as required and prints its address for you; tick it") },
    "8D.0": { section: "8. Records to be Sealed", selection: true, label: "Law Enforcement agency holds records (selection)", ...ELECTION("tick every agency that holds records in this case; you know which ones do") },
    "8D.1": { section: "8. Records to be Sealed", label: "Law Enforcement — Name", ...AGENCY("the name of the law enforcement agency that arrested or cited you") },
    "8D.2": { section: "8. Records to be Sealed", label: "Law Enforcement — Case Number", ...AGENCY("that agency's own case number, which is usually different from the court case number") },
    "8D.3": { section: "8. Records to be Sealed", label: "Law Enforcement — Mailing Address", ...AGENCY("that agency's mailing address") },
    "8E.0": { section: "8. Records to be Sealed", selection: true, label: "Another agency holds records (selection)", ...ELECTION("tick this if some other agency holds records in this case") },
    "8E.1": { section: "8. Records to be Sealed", label: "Other agency — Name", ...AGENCY("the name of any other agency holding records in this case") },
    "8E.2": { section: "8. Records to be Sealed", label: "Other agency — Mailing Address", ...AGENCY("that agency's mailing address") },
    "8F.1": { section: "8. Records to be Sealed", label: "Arrest number (from your fingerprint card)", ...AGENCY("the arrest number, which is printed on your fingerprint card") },
    "8F.2": { section: "8. Records to be Sealed", label: "Arrest date", ...AGENCY("the date you were arrested") },

    /* --- 9. Certificate of service --------------------------------------- */
    CoS_Date: { section: "9. Certificate of Service", label: "Certificate of Service — date of service, entered at signature", ...PROTECT(SIGNATURE, "service has not happened when the packet is prepared, and a certificate dated before the act it certifies would be false") },
    Group_CoS: { section: "9. Certificate of Service", selection: true, label: "Certificate of Service — how you sent it (selection)", ...ELECTION("you tick the method you actually used, at the time you serve the prosecuting attorney") },
    /*
     * The recipient and method lines of the certificate carry the signature
     * refusal class, not the election class, and the difference matters. The
     * election class is refused for a PARTICIPANT_CONTACT field on purpose --
     * it must not be usable to hide the participant's own contact details --
     * and the recipient line's label necessarily contains the word "address".
     * The address on it is the PROSECUTING ATTORNEY's, not the participant's,
     * and the line is completed by the participant at the moment they sign the
     * certificate, which is exactly what signature_or_date_participant_completion
     * describes.
     */
    CoS_Mail: { section: "9. Certificate of Service", label: "Certificate of Service — name and full address served by regular mail", ...PROTECT(SIGNATURE, "the certificate records who you actually served and is completed when you sign it, after service, not in advance") },
    CoS_Other: { section: "9. Certificate of Service", label: "Certificate of Service — other method, explained", ...PROTECT(SIGNATURE, "the certificate records how you actually served and is completed when you sign it, after service, not in advance") },

    /* --- 10. Verified signature ------------------------------------------ *
     * JDF-477 is VERIFIED: section 10 is a declaration under penalty of perjury
     * under the law of Colorado. The whole block -- the date, the place, the
     * printed name and the signature -- is completed by the declarant at the
     * moment of declaring, and prefilling any part of it presents a sworn
     * instrument as further along than it is. */
    Sig1_Date: { section: "10. Verified Signature", label: "Executed on this day (date), entered at signature", ...PROTECT(SIGNATURE, "part of the verification, completed when you sign under penalty of perjury") },
    Sig1_Month: { section: "10. Verified Signature", label: "Executed in this month, entered at signature", ...PROTECT(SIGNATURE, "part of the verification, completed when you sign under penalty of perjury") },
    Sig1_Year: { section: "10. Verified Signature", label: "Executed in this year, entered at signature", ...PROTECT(SIGNATURE, "part of the verification, completed when you sign under penalty of perjury") },
    Sig1_City: { section: "10. Verified Signature", label: "Executed at city (or other location), entered at signature", ...PROTECT(SIGNATURE, "part of the verification, completed when you sign under penalty of perjury") },
    Sig1_State: { section: "10. Verified Signature", label: "Executed in state (or country), entered at signature", ...PROTECT(SIGNATURE, "part of the verification, completed when you sign under penalty of perjury") },
    Sig1_Name: { section: "10. Verified Signature", label: "Print Your Name, on the verification, entered at signature", ...PROTECT(SIGNATURE, "the verification block is completed by the declarant at the moment of declaring; prefilling any part of it presents a sworn instrument as further along than it is") },
    Sig1_Signature: { section: "10. Verified Signature", label: "Your Signature", ...PROTECT(SIGNATURE, "you sign this yourself, under penalty of perjury") },
    Sig_Esq: { section: "10. Verified Signature", selection: true, label: "Counsel signature — Esq. (selection)", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    Sig_LawyerSignature: { section: "10. Verified Signature", label: "Counsel Signature (if any)", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") },
    Sig_Bar: { section: "10. Verified Signature", label: "Counsel attorney registration number", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") }
  },

  "JDF-478": {
    /* --- A. Court, B. Parties, C. Case details --------------------------- */
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
    /*
     * Labelled by the widget's DECLARED PURPOSE, not by the printed caption
     * beside it. Colorado's tooltip for this field is "Enter the Defendant's
     * street address."; the caption reads "Mailing Address", and labelling the
     * write from the caption is how a whole-address value read clean here.
     */
    "∆ Street Address": { section: "2. Defendant's Information", label: "Street Address", ...WRITE("participant.street_address") },
    "∆ City": { section: "2. Defendant's Information", label: "City", ...WRITE("participant.city") },
    "∆ State": { section: "2. Defendant's Information", label: "State", ...WRITE("participant.state") },
    "∆ Zip": { section: "2. Defendant's Information", label: "Zip Code", ...WRITE("participant.zip") },

    /* --- 3. Records to be sealed ----------------------------------------- */
    "478.3A.1": { section: "3. Records to be Sealed", selection: true, label: "County Court case records to be sealed (selection)", ...ELECTION("tick the courts and agencies that hold records in this case") },
    "478.3A.2": { section: "3. Records to be Sealed", label: "County Court case number", ...SUPPLY("the County Court case number, if the case was in County Court") },
    "478.3B.1": { section: "3. Records to be Sealed", selection: true, label: "District Court case records to be sealed (selection)", ...ELECTION("tick the courts and agencies that hold records in this case") },
    "478.3B.2": { section: "3. Records to be Sealed", label: "District Court case number", ...SUPPLY("the District Court case number, if the case was in District Court") },
    "478.3C.0": { section: "3. Records to be Sealed", selection: true, label: "Law Enforcement Agency records to be sealed (selection)", ...ELECTION("tick the courts and agencies that hold records in this case") },
    "478.3C.1": { section: "3. Records to be Sealed", label: "Law Enforcement Agency — Name", ...AGENCY("the name of the law enforcement agency, copied from the motion") },
    "478.3C.2": { section: "3. Records to be Sealed", label: "Law Enforcement Agency — Arrest number", ...AGENCY("the arrest number from your fingerprint card, copied from the motion") },
    "478.3C.3": { section: "3. Records to be Sealed", label: "Law Enforcement Agency — Arrest date", ...AGENCY("the arrest date, copied from the motion") },
    "478.3C.4": { section: "3. Records to be Sealed", label: "Law Enforcement Agency — Mailing Address", ...AGENCY("that agency's mailing address, copied from the motion") },
    /*
     * THE ONE AGENCY THE FORM ITSELF MARKS REQUIRED.
     *
     * JDF 478 prints "Colorado Bureau of Investigation (required)" in section 3
     * with the CBI's address already set out beneath it, and section 5 directs
     * the clerk to send the CBI a copy of the signed order. Nothing about which
     * case this is changes that: on this route the CBI is on the list, and the
     * form says so on its own face. Leaving it to the participant left the box
     * EMPTY on both delivered fixtures while this packet's own instructions
     * told them the CBI was not optional -- VF01 read that contradiction out of
     * the bytes at base ed0e3b308 -- and an order that omits the one agency the
     * form requires is an order that does not reach the state repository.
     *
     * It is marked from the ROUTE, not from a case fact, and the basis travels
     * with the mark into the finalizer's report and from there into the field
     * map. JDF 477's own CBI box (8C.0) is NOT marked here: the Colorado
     * Judicial Department ships that one already ticked, and marking it again
     * would claim a write over the issuer's own value.
     */
    "478.3D.0": {
      section: "3. Records to be Sealed", selection: true,
      label: "Colorado Bureau of Investigation records to be sealed (selection)",
      ...SETTLED_SELECTION(
        "JDF 478 section 3 prints \"Colorado Bureau of Investigation (required)\" and its address on the form's own "
        + "face, and section 5 directs the clerk to send the CBI a copy of the signed order. The requirement is the "
        + "form's, it holds on every case this route reaches, and it turns on no fact about this participant.")
    },
    /*
     * AND THE SHARED INSTRUMENT REFUSES THE MARK, ON PURPOSE.
     *
     * The mark above is asked for and does not happen. The finalizer's
     * settled-selection pass applies protectCategoryOf() to the field's label
     * before it will tick anything, and this label -- "Colorado Bureau of
     * Investigation records to be sealed" -- matches the shared `agency`
     * protect rule on the word "Bureau". The refusal comes back as
     * protected_category / agency and is recorded, per fixture, in
     * production-field-map.json and reports/blanks-left-for-the-participant.json.
     *
     * That rule is not a bug and this lane does not route around it. It exists
     * because a slot listing the agencies a court is ordering to seal is not
     * the participant's to fill, and KY AOC-334 proved it by printing the
     * petitioner's own name as the list of agencies ordered. The shared module
     * already carries a narrow, caption-by-caption exemption list
     * (PARTICIPANT_STATED_SUBJECT) for the cases where the participant states
     * the agency rather than owning the blank -- Alabama CR-65 items 3 and 4,
     * the Oregon set-aside citing/arresting agency -- and this Colorado caption
     * is the same shape. Adding an entry there is a change to
     * scripts/rcap-official-forms/**, the shared finalizer, which one repair
     * lane holding three families is not entitled to make: it would move every
     * family that shares the module.
     *
     * So the state of this box is: the route requires it, the packet asks for
     * it, the shared safeguard refuses it, the refusal is measured and
     * recorded, and the participant is told in plain words to tick it. The box
     * is NOT relabelled to get past the gate. A label chosen to dodge a protect
     * rule is the defect the gate exists to catch.
     */
    "478.3E.0": { section: "3. Records to be Sealed", selection: true, label: "Another agency's records to be sealed (selection)", ...ELECTION("tick this if some other agency holds records in this case") },
    "478.3E.1": { section: "3. Records to be Sealed", label: "Other agency — name and mailing address", ...AGENCY("the name and mailing address of any other agency holding records, copied from the motion") },
    "478.3F.0": { section: "3. Records to be Sealed", selection: true, label: "A second other agency's records to be sealed (selection)", ...ELECTION("tick this if a second other agency holds records in this case") },
    "478.3F.1": { section: "3. Records to be Sealed", label: "Second other agency — name and mailing address", ...AGENCY("the name and mailing address of a second other agency, if there is one") },
    "478.3G.0": { section: "3. Records to be Sealed", selection: true, label: "A third other agency's records to be sealed (selection)", ...ELECTION("tick this if a third other agency holds records in this case") },
    "478.3G.1": { section: "3. Records to be Sealed", label: "Third other agency — name and mailing address", ...AGENCY("the name and mailing address of a third other agency, if there is one") },

    /* --- 4. and 5.: the court's own orders and signature ------------------ */
    "478.4D": { section: "4. Court Orders", label: "By the Court — other orders", ...PROTECT(COURT_OWNED, "the decree is the court's; a proposed order that wrote the court's other orders would be drafting the judge's ruling") },
    "478.5A": { section: "5. So Ordered", label: "By the Court — signature", ...PROTECT(COURT_OWNED, "the judge or magistrate signs their own order") },
    "Group478.5B": { section: "5. So Ordered", selection: true, label: "By the Court — Judge or Magistrate (selection)", ...PROTECT(COURT_OWNED, "the officer who signs states which they are") },
    "478.5C": { section: "5. So Ordered", label: "By the Court — Dated", ...PROTECT(COURT_OWNED, "the court dates its own order") }
  }
};

/* ---- fixtures ------------------------------------------------------------ */
/*
 * TWO CORRECTIONS VF22 FOUND HERE, BOTH INVISIBLE TO EVERY COUNTER.
 *
 * ONE. participant.street_address used to hold the WHOLE address --
 * "412 Cherry Creek Way, Denver, CO 80202" -- because JDF 477's single line is
 * captioned "Current Mailing Address: (with city/state/zip)". JDF 478 writes the
 * same fact into a field Colorado names "∆ Street Address" and whose own tooltip
 * says "Enter the Defendant's street address.", beside separate ∆ City, ∆ State
 * and ∆ Zip boxes that this packet also fills. So delivered page 4 printed the
 * town and the ZIP twice, and the street field carried something the widget's
 * declared purpose says is not its. Every value was present, non-empty, inside
 * its rect and equal to what was expected, so nothing measured it.
 *
 * The fact now holds the street alone, which is what the shared semantic
 * registry declares participant.street_address to BE -- its descriptor at
 * scripts/rcap-official-forms/rcap-field-semantics.mjs refuses a caption naming
 * a city, a state or a ZIP -- and which is what this family's own municipal
 * sibling has always held. JDF 477's line therefore carries the street and the
 * participant completes it; the guide says so in its own section rather than
 * leaving them to notice. Composing a combined value for that one line was not
 * available: the finalizer refuses an explicit mapping that disagrees with the
 * fact the shared registry derives from the field's own name
 * (explicit_mapping_conflicts_with_field_name), so a composed-address fact would
 * have to be added to a shared module, and a repair lane holding two families
 * does not get to move every family that shares it.
 *
 * TWO. ∆ State declares "Enter the state (use two letter abbreviation)" and the
 * boundary fixture held "Colorado". It fits the 33.1pt field and renders
 * cleanly, so no geometry check sees it; it simply contradicts the field's own
 * printed instruction. The fixture now holds "CO". This packet has no
 * fact-transformation layer and should not grow one here: what it writes is what
 * it holds, so a held value in a shape the issuer's field forbids is a defect at
 * the fact, not at the write. That the shared finalizer enforces no per-field
 * FORMAT is a real gap and is recorded in build-findings.json; it is not this
 * lane's to close.
 */
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
    "participant.full_legal_name": "Maria-Alejandra O’Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Colorado Springs",
    "participant.state": "CO",
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

/*
 * Binds JDF 491 by exact SHA-256 and proves every phrase this build quotes is
 * in those bytes, on the page it is declared for. A miss throws: the build does
 * not go on to print a sentence it attributes to a document that does not carry
 * it.
 */
async function resolveGuide() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const entry = (index.entries ?? []).find((e) => e.state === "CO"
    && e.formNumber === GUIDE.formNumber && e.assetClass === "INSTRUCTIONS"
    && e.custody === "master_library");
  assert.ok(entry, `the committed corpus index carries no master_library INSTRUCTIONS entry for ${GUIDE.formNumber}`);
  const abs = path.resolve(ROOT, corpusRoot(), entry.path);
  assert.ok(fs.existsSync(abs), `${GUIDE.formNumber} is indexed at ${entry.path} and is not on disk there`);
  const bytes = fs.readFileSync(abs);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  assert.equal(sha256, GUIDE.sha256,
    `${GUIDE.formNumber} SHA-256 drift: this build quotes ${GUIDE.sha256} and the mounted bytes are ${sha256}`);
  assert.equal(sha256, String(entry.sha256 ?? ""),
    `${GUIDE.formNumber}: the committed index and the mounted bytes disagree`);

  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const streamByPage = doc.getPages().map((pg) => extractTextItems(pg).map((it) => it.text).join(""));
  const quoted = {};
  for (const [key, q] of Object.entries(GUIDE_QUOTATIONS)) {
    const stream = streamByPage[q.page - 1] ?? "";
    assert.ok(stream.includes(q.text),
      `${GUIDE.formNumber} page ${q.page} does not carry the quoted phrase ${JSON.stringify(key)}; `
      + "the guide this build quotes is not the guide it bound");
    quoted[key] = { ...q, foundInStream: true };
  }
  for (const [componentId, named] of Object.entries(GUIDE_NAMES_THE_MISSING_COMPONENTS)) {
    assert.ok((streamByPage[0] ?? "").includes(named.asTheGuideWritesIt),
      `${GUIDE.formNumber} page 1 does not name ${componentId} as ${JSON.stringify(named.asTheGuideWritesIt)}`);
  }
  /*
   * THIS PACKET ALSO PRINTS THREE CLAIMED ABSENCES, AND AN ABSENCE IS A CLAIM.
   *
   * The manifest's requiredBeforeFiling list leaves the filing fee, the fee
   * waiver and notarisation open, and the participant wording says JDF 491 does
   * not mention them. That is exactly the sentence a later revision of the guide
   * would falsify silently -- the quotations above would still match, and the
   * packet would go on telling a participant that a guide says nothing about a
   * fee waiver when it had grown a paragraph about one. So the absence is
   * asserted against the bound bytes, in both pages of the stream, the same way
   * a quotation is.
   */
  const wholeStream = streamByPage.join(" ");
  for (const [what, pattern] of Object.entries({
    "a filing fee": /fee/i, "a fee waiver": /waiv/i, "notarisation": /notar/i
  })) {
    assert.ok(!pattern.test(wholeStream),
      `${GUIDE.formNumber} now mentions ${what}: this packet tells the participant the guide is silent on it, and `
      + "that sentence is no longer true of the bound bytes");
  }

  return {
    ...GUIDE, pathInArchive: entry.path, byteLength: bytes.length, pageCount: doc.getPageCount(),
    revision: entry.revision ?? null, sha256, quoted,
    claimedAbsencesAssertedAgainstTheseBytes: ["a filing fee", "a fee waiver", "notarisation"],
    howItWasRead:
      "every quoted phrase asserted as a literal substring of the concatenated text items of the named page, in "
      + "stream order. Unlike JDF 477 and JDF 478 this document does not interleave its glyph runs; the stream is "
      + "clean prose and pdftotext agrees with it."
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
    /*
     * What the SOURCE already carries on this control, before this build touches
     * it. JDF 477 ships with the Colorado Bureau of Investigation box already
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
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase()
        .replace("textfield", "text").replace("radiogroup", "radiogroup").replace("checkbox", "checkbox"),
      isSelectionControl: entry.selection === true
        || field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      basis: entry.basis ?? null,
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
  /*
   * A route-settled selection is not unwritable by role, and listing it here
   * would make the finalizer refuse the mark with classified_unwritable_by_role
   * before the settled-selection pass ever saw it.
   */
  const settledSelections = Object.fromEntries(census.rows
    .filter((r) => r.policy === "settled_selection")
    .map((r) => [r.name, { checked: true, basis: r.basis }]));
  const unwritableFields = census.rows
    .filter((r) => !writableNames.has(r.name) && r.policy !== "settled_selection")
    .map((r) => ({ field: r.name }));

  /* CLIPPING_AND_OVERLAP, measured by VF08 at 150 dpi and recorded in
   * data/rcap-grade-a/packet-factory-24h/vf08/COHORT_MEASUREMENT.json: 5 of JDF-477's 16 and 7 of JDF-478's 11 selection widgets
   * carry an /AS state with no matching stream under /AP /N. The shared
   * sanitizer calls updateFieldAppearances() before flatten(), pdf-lib
   * regenerates an appearance for exactly that condition, and its default
   * check-box provider paints a stroked square the size of the widget --
   * so 14 widget readings across the two bound fixtures (7 per fixture, on delivered pages 2, 3 and 4)
   * delivered a black-bordered box that JDF-477 and JDF-478 does not print and that no
   * conforming viewer paints (ISO 32000-1 12.5.5). VF08's zero-write
   * baseline over the same pinned bytes painted the identical pixels, so the
   * ink is the shared step's and not this family's.
   *
   * Opting in supplies the missing state as an EMPTY appearance instead, so
   * nothing is synthesized and nothing is flattened there. It reaches only
   * unwritten selection widgets whose current state has no stream:
   * the 15 widgets that ship their own state for /AS are untouched by this, because a widget's own appearance is source-owned form structure (RI-OFF-APPEARANCE). A ticked box still renders its
   * mark from the stream the source ships for the state it is set to. */
  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    suppressSynthesizedAppearances: true,
    /* CLIPPING_AND_OVERLAP, measured by VF02 at 300 dpi on the delivered bytes and
     * recorded in data/rcap-grade-a/packet-factory-24h/vf02/rows.json: the five
     * Group_6_0 radios of JDF-477 section 6 each SHIP THEIR OWN /Off stream with
     * /BBox [0 0 18 18] against a /Rect of 13.68 x 13.68. ISO 32000-1 12.5.5 fits
     * that transformed BBox onto the /Rect, so a conforming viewer draws the
     * Judiciary's grey bevel at 13.68pt; pdf-lib's flatten() emits a translation
     * and no scale, so the packet stamped it at 18pt -- cmScale 1 x requiredScale
     * 0.76, an error of 4.32pt on each axis, putting ink outside the widget's own
     * box on packet page 1 of both fixtures. suppressSynthesizedAppearances does
     * not reach these by design: it leaves alone a widget that ships its own
     * stream for the state it is set to, which is exactly what these are.
     *
     * fitAppearancesToRect pre-composes the 12.5.5 mapping into each affected
     * appearance's own /Matrix. It is geometric -- it reads only /Rect, /BBox and
     * /Matrix, never a form, field, caption or route -- and the appearance content
     * bytes are not touched and no value is written into any field. */
    fitAppearancesToRect: true,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    /* The route's own selections. Checkbox-only, true-only, and each carries
     * its basis into the report; the protect gates apply unchanged. */
    selectionsFromHeldFacts: settledSelections,
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
async function byteProof(source, census, artifactBytes, report, fixtureName) {
  const tmp = path.join(ROOT, `.co-477-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
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
      // not a write this build made. JDF 477 ships the CBI box ticked because
      // the form marks that agency required.
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text,
          sourceValue: r.sourceValue,
          note: "the pinned source already carries this value; flattening materialises the form's own default"
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
      /*
       * A selection the ROUTE settles is not an explicit refusal and is not the
       * participant's to make. It is recorded as marked only when the finalizer
       * says it marked it, so the map can never claim a tick the bytes do not
       * carry.
       */
      if (r.policy === "settled_selection") {
        const marked = (report.selectionsMarked ?? []).find((m) => m.field === r.name) ?? null;
        selectionControls.push({
          ...base, selectionId: base.field, kind: "selection_control", type: r.type,
          widgets: r.widgets, disposition: marked ? "route_settled_and_marked" : "route_settled_and_refused",
          reason: r.basis, category: null, completenessClass: null, class: null,
          requiredBeforeFiling: marked ? false : true,
          routeDetermined: true,
          markedByThePacket: Boolean(marked),
          markBasis: marked?.basis ?? null,
          refusedBy: marked ? null : (report.refused ?? [])
            .filter((x) => x.field === r.name)
            .map((x) => ({ reason: x.reason, category: x.category ?? null })),
          whatTheParticipantMustDoInstead: marked ? null
            : "tick this box yourself before you file; the form marks it required and the packet could not mark it",
          whyThePacketCouldNotMarkIt: marked ? null
            : "the shared finalizer applies its protect rules to a selection's label before it will mark it, and this "
              + "label matches the shared `agency` rule. The rule guards a slot that lists the agencies a court is "
              + "ordering to seal, which is not the participant's to fill. Closing it needs a caption exemption in "
              + "scripts/rcap-official-forms/rcap-field-semantics.mjs (PARTICIPANT_STATED_SUBJECT), which is the "
              + "shared module and is not this family's to change."
        });
        continue;
      }
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

/*
 * WHERE SELF-HELP ENDS, TAKEN FROM THE RECORD RATHER THAN WRITTEN HERE.
 *
 * The committed track registry is the authority for the points at which this
 * route stops being a self-help route. The conditions are read at build time
 * and printed verbatim, one item per declared condition, so the packet cannot
 * drift from the record and cannot silently lose one: the build refuses if the
 * registry carries no entry for this track or declares no stop condition.
 *
 * Nothing is added to the list. The registry states no waiting period and no
 * categorical exclusion for this track; the instructions say that rather than
 * leaving the reader to assume either way.
 */
function selfHelpStops() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, TRACK_REGISTRY), "utf8"));
  const track = (registry.tracks ?? []).find((t) => t.trackId === TRACK_ID);
  assert.ok(track, `the track registry carries no entry for ${TRACK_ID}`);
  const conditions = (track.selfHelpStopConditions ?? []).map((c) => String(c).trim()).filter(Boolean);
  assert.ok(conditions.length > 0,
    `the track registry declares no selfHelpStopConditions for ${TRACK_ID}, and this packet may not state where self-help ends without them`);
  const qualifiers = (track.postGenerationHandoffs ?? [])
    .map((h) => String(h).trim()).filter((h) => h && !conditions.includes(h));
  return {
    conditions,
    qualifiers,
    waitingPeriods: (track.waitingPeriods ?? []).map((w) => (typeof w === "string" ? w : JSON.stringify(w))),
    exclusions: (track.exclusions ?? []).map((e) => (typeof e === "string" ? e : JSON.stringify(e)))
  };
}

/*
 * The manifest's requiredBeforeFiling list, rendered for a participant.
 *
 * VF22 failed this family because four of the seven items in the controlling
 * packet-set manifest reached the delivered guide neither verbatim nor in
 * substance: the CBI criminal-history report, the check of "how did the case
 * end?" against it, the notarization position and the fee-waiver position. The
 * structural cause it named is real -- the municipal sibling ships a separate
 * filing-instructions.md and carries these there, and this family ships only
 * participant-instructions.md, so items that live in a filing guide had nowhere
 * to go. They have somewhere now.
 *
 * Each item is printed WORD FOR WORD out of the manifest, so nothing on that
 * list can quietly fail to reach a participant, and each gets a second column
 * saying what it means for them. The gloss is the point of the second column:
 * VF22 also failed this family's municipal sibling for publishing the raw
 * operator sentence at a participant, and "the source review does not address a
 * fee waiver" is an operator sentence. An item this build has no gloss for is a
 * build failure rather than a silently unglossed row -- if the manifest grows an
 * item, somebody has to decide how to say it.
 */
const REQUIRED_BEFORE_FILING_GLOSS = Object.freeze({
  "Obtain Colorado criminal-history report. Request a criminal-history report from CBI and attach it if the form requires it.":
    "Ask the Colorado Bureau of Investigation for your own criminal-history report before you file, and attach it if "
    + "the form asks for a history or an exhibit. The record marks this conditional for exactly that case. The "
    + "platform holds no report for you and cannot request one on your behalf.",
  "Check your answer to \"How did the case end?\" against Colorado criminal-history report, and correct the packet if they disagree.":
    "JDF 477 section 6 is where you say how the case ended — acquittal, dismissal, a completed diversion agreement, "
    + "a completed deferred judgment, or a vacated conviction. Read your answer against the criminal-history report "
    + "before you file, and if the two disagree, correct the packet rather than swearing to it.",
  "Signature and date — JDF 477, signature block.":
    "You sign and date JDF 477 yourself. Section 10 is a declaration under penalty of perjury and no part of it is "
    + "filled in for you.",
  "The movant signs their own motion.":
    "The person asking for the sealing signs the motion. Nobody signs it for you, and the platform did not.",
  "The source review does not state a notarization requirement.":
    "No source this packet holds says the motion must be notarised, and none says it need not be. JDF 491, "
    + "Colorado's own guide for this route, does not mention notarisation anywhere, and JDF 477 section 10 is a "
    + "declaration under penalty of perjury rather than a notarised affidavit. It is a fair thing to ask the clerk "
    + "when you file; this packet will not settle it for you by guessing.",
  "The source review does not state a filing fee for the simplified motion.":
    "Ask the clerk what fee applies, if any — see “Where you file this” above. C.R.S. § 24-72-705 is the "
    + "simplified process and the fee position for it is not established in any source this packet holds, so it is "
    + "not stated here.",
  "The source review does not address a fee waiver.":
    "No source this packet holds says whether the filing fee can be waived on this route, so this packet does not "
    + "tell you either way. JDF 491 does not mention a fee or a waiver at all. If you cannot pay, say so to the "
    + "clerk and ask what the court requires — and ask specifically whether its fee-waiver forms apply to this "
    + "motion. This packet does not name those forms, because no source it holds names them for this route, and it "
    + "will not name a form it has not read."
});

function participantInstructions(maps, rbf, fitRefusals = [], packetSet = null, guide = null) {
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  /*
   * "The choices that are yours" must contain only the choices that ARE the
   * participant's. VF01 failed this family on ROUTE_OPTIONS for classifying the
   * JDF 478 CBI line as a participant legal election. production-field-map.json
   * now records it correctly as a routeDeterminedSelection, but this table was
   * still built from every selection control, so the delivered guide listed the
   * CBI line under "Why it is yours" beside a basis sentence saying it "turns on
   * no fact about this participant" -- the map and the participant's own copy
   * disagreeing about the same box. A route-settled selection the packet could
   * not mark is still a participant ACTION; it is not a participant CHOICE, and
   * it gets its own section that says which it is.
   */
  const allSelections = maps.flatMap((m) => m.selectionControls.map((c) => ({ document: m.formNumber, ...c })));
  const elections = allSelections.filter((c) => c.routeDetermined !== true);
  const settledButNotMarked = allSelections.filter((c) => c.routeDetermined === true && c.markedByThePacket !== true);

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  const undelivered = packetSet?.undelivered ?? [];
  out.push(
    "This packet is two Colorado Judicial Department forms, filed together:", "",
    "- **JDF 477**, _Motion to Seal Non-Conviction Records (Simplified Process)_ — what you file.",
    "- **JDF 478**, _Order to Seal Non-Conviction Records_ — the order you give the court to sign.", ""
  );
  if (undelivered.length > 0) {
    out.push(
      "**Two forms is not the whole filing.** Colorado's own guide for this route names four documents, and the "
      + "section immediately below names the two that are not here and tells you how to get them. Read it before "
      + "you file anything.", ""
    );
  }
  out.push(`Both are prepared for **${ROUTE.publicLabel.toLowerCase()}** under ${ROUTE.authority}.`, "");
  /*
   * The second sentence sends the reader to a section that only exists when a
   * value was refused for width, and after the street/city/state/zip repair no
   * value is. A guide that says "check that section" when there is no such
   * section is a defect a counter cannot see, so it is printed only when the
   * section it names is printed.
   */
  out.push(
    "The platform filled in what it holds about you and your case — your name, your date of birth, your address, your "
    + "phone, your e-mail, the county and the case number — **wherever the value fits the line the form prints for "
    + "it**. Everything else is yours, and every one of those blanks is listed below by the section of the form it is "
    + "in."
    + (fitRefusals.length > 0
      ? " Where a value the platform holds did NOT fit, it is named in its own section further down rather than "
        + "shrunk until it cannot be read or run off the end of the line: **check that section, because a blank "
        + "there is a blank you have to fill even though the platform knows the answer.**"
      : ""), ""
  );

  if (undelivered.length > 0) {
    out.push("## This packet is not the whole filing — read this before you file", "");
    out.push(
      `**Colorado's own guide for this route requires ${packetSet.required.length} documents, and this packet `
      + `contains ${packetSet.delivered.length} of them.** The authoritative packet-set record for this route says `
      + `so in its own words: “${packetSet.completeness.basis}” It records the state of this packet set as `
      + `**${packetSet.completeness.state}**.`, ""
    );
    out.push(
      `The ${undelivered.length} documents this packet does not contain are named below, **and this packet knows `
      + "their form numbers.** JDF 491, the Colorado Judicial Department's own guide for this route, lists all four "
      + `documents by number under its heading “File the Request”: ${GUIDE_QUOTATIONS.fileTheRequest.text}`, ""
    );
    for (const row of undelivered) {
      const named = GUIDE_NAMES_THE_MISSING_COMPONENTS[row.componentId] ?? null;
      const pool = RECOVERY_POOL.entries.find((e) => e.componentId === row.componentId) ?? null;
      let why = "It is not in this packet because the platform holds no copy of it.";
      if (pool?.blockedBy === "committed_index_does_not_identify_the_entry") {
        why = "It is not in this packet, and the reason is a filing-cabinet problem rather than a missing document. "
          + "The platform's own source index lists this exact form, at a fixed digital fingerprint, in a storage "
          + `area it calls “${RECOVERY_POOL.custody}” — but it lists it there WITHOUT recording which form `
          + "it is. The platform only ever fills in a form it can identify by its official number in that index, so "
          + "a file with no number recorded against it cannot be picked up and filled in, even when the file itself "
          + "is right there. Nothing about your case is missing, and nothing about this form is in doubt.";
      } else if (pool?.blockedBy === "held_bytes_are_a_flat_pdf_at_a_superseded_revision") {
        why = "It is not in this packet, and here the platform's copy is the wrong one. The copy it holds is the "
          + "**August 2019** version of this form, and the guide that tells you to file it was revised on "
          + "**7 August 2024**. The guide says to complete “§§ A–C” on it and the 2019 copy has no lettered "
          + "sections at all. That copy is also flat — it carries no fillable boxes at all — so the platform "
          + "could not have typed anything into it even if it were the right version. Ask for the current one.";
      }
      out.push(
        `- **${named ? named.formNumber : "(form number not established)"} — `
        + `${missingComponentLabel(row, packetSet.delivered)}.** `
        + (named ? `JDF 491 writes it “${named.asTheGuideWritesIt}”. ` : "")
        + why
      );
    }
    out.push("");
    out.push(
      "**Get both of them from Colorado, and do not file without them.** Ask the clerk of the court, or the Colorado "
      + "Judicial Department's self-help centre, for the JDF 491 guide and for the two forms it lists that are not "
      + "here. They are free and they are the same forms the guide names. Do not assume the two forms in this packet "
      + "are a complete filing, and do not assume the court will supply the missing two for you.", ""
    );
    const denial = RECOVERY_POOL.entries.find((e) => e.whatThisFormIs
      && undelivered.some((r) => r.componentId === e.componentId)) ?? null;
    if (denial) {
      out.push(
        `**What ${denial.formNumber} is, so it does not surprise you.** JDF 491 lists it simply as an order, and it `
        + `is not a second order granting your request. ${denial.formNumber} is headed **“Order Denying Request `
        + "to Seal Non-Conviction Records”**. Its body is a finding the court makes — that the motion is "
        + "insufficient on its face, or that after looking beyond the motion you are not entitled to relief under "
        + "C.R.S. §§ 24-72-705 or, for a conviction vacated through § 18-1-410.7(5)(b), § 24-72-707 — over a "
        + "signature block for a judge or a magistrate. Colorado's own guide still tells you to file it, in the same "
        + `list as the order to seal: “${GUIDE_QUOTATIONS.fileTheRequest.text}” So do not read it as a bad sign `
        + "and do not leave it out because of what it says. No source this packet holds explains why the court is "
        + "given both orders, so this packet does not explain it either; ask the clerk if you want to know. Complete "
        + "only §§ A–C on it — the caption: the court, the county, your name and the case number. The guide says "
        + `the same in its own words: “${GUIDE_NAMES_THE_MISSING_COMPONENTS[denial.componentId].asTheGuideWritesIt}”.`, ""
      );
    }
    out.push(
      "Everything else in this packet — both forms, every blank named below and every choice left to you — is "
      + "prepared and is accurate for the two documents it does contain. The gap above is about what is missing from "
      + "the set, not about what is in it.", ""
    );
  }

  if (fitRefusals.length > 0) {
    out.push("## One line the packet holds your answer for and still leaves blank", "");
    out.push(
      `The platform refused ${fitRefusals.length === 1 ? "one value" : `${fitRefusals.length} values`} on this packet, `
      + "not because it does not hold them but because they do not fit the line the Colorado Judicial Department "
      + "printed. The floor is 6 points: below that a filed document stops being readable, and text that runs past "
      + "the end of its box is worse still. So the value is left off and handed to you, in writing, here:", ""
    );
    out.push("| Form | Section | The line | What the platform holds | Why it is not printed |", "| --- | --- | --- | --- | --- |");
    for (const r of fitRefusals) {
      out.push(
        `| ${r.document} | ${r.section} | ${r.label} | ${r.value} | The line is ${r.rectWidthPt} points wide and this `
        + `value needs ${r.requiredWidthAtMinPt} points at the ${r.minFontSizePt}-point minimum. |`
      );
    }
    out.push("");
    out.push(
      "**Write it on the line yourself, by hand or before you print.** If it will not fit legibly on one line, put "
      + "what fits on the line and continue on an attached page that names the form, the section and the line it "
      + "belongs to. Do not shrink it until it cannot be read. This applies to whichever of the two forms is named "
      + "above and to that form only: the same fact may already be printed on the other one, where the form gives it "
      + "more room or splits it across separate city, state and zip lines.", ""
    );
  }

  out.push("## Where you file this", "");
  out.push(
    "File both forms with the **clerk of the Colorado court that handled the case** — the District Court or the County "
    + "Court named in section 1 of the motion, in the county already filled in for you. The Colorado Judicial Department "
    + "publishes each courthouse's address; this packet does not state one, because the platform holds no court directory "
    + "and an unsourced address in a filing instruction is worse than none.", ""
  );
  out.push(
    "**Ask the clerk what fee applies, if any.** C.R.S. § 24-72-705 is the simplified process and the fee position for it "
    + "is not established in any source this packet holds, so it is not stated here.", ""
  );

  out.push("## One line on JDF 477 you must finish by hand", "");
  out.push(
    "JDF 477 section 5 asks for your **Current Mailing Address (with city/state/zip)** on a single printed line. The "
    + "packet wrote your **street address** on that line and stopped there. It did not add the city, the state or "
    + "the ZIP.", ""
  );
  out.push(
    "That is deliberate. The order in this same packet, JDF 478 section 2c, has a box the Colorado Judicial "
    + "Department labels as the defendant's **street address** and three more boxes beside it for city, state and "
    + "ZIP. When one combined value was written into both forms, your town and your ZIP were printed twice on the "
    + "order the judge signs. The packet now holds the street on its own, which is right for the order and leaves "
    + "JDF 477's line one step short.", ""
  );
  out.push(
    "**So finish that line before you file.** Add your city, your state and your ZIP after the street address on "
    + "JDF 477 section 5. They are already printed on JDF 478 section 2c in this same packet, in their own boxes, if "
    + "you want to copy them across.", ""
  );

  out.push("## The Colorado Bureau of Investigation is not optional — and one box is yours to tick", "");
  out.push(
    "Both forms print the CBI's address for you — ATTN Identification-Seals, 690 Kipling St. STE 3000, Lakewood, CO 80215 "
    + "— and JDF 478 prints **(required)** beside it. JDF 478 also directs the court's clerk to send the CBI a copy of "
    + "the signed order within 28 days. The two forms reach you in different states, and the difference matters:", ""
  );
  out.push(
    "- **JDF 477, section 8 — already ticked, and not by us.** The Colorado Judicial Department ships this form with "
    + "the CBI box checked. Leave it as it is.",
    "- **JDF 478, section 3 — BLANK, and you must tick it.** The packet did not tick it. Look at the delivered page "
    + "and check: if that box is empty when you file, the order the judge signs leaves out the one agency the form "
    + "marks required.", ""
  );
  out.push(
    "The reason the packet left it is worth one sentence, because it is not an oversight: the platform refuses to tick "
    + "any box whose line names a law-enforcement agency, so that it can never fill in the agency list on a court's own "
    + "order. That safeguard is right in general and it costs you one tick here. Make it.", ""
  );

  out.push("## What you must do before you file", "");
  out.push("1. **Fill in every item in the tables below.** Each names the form, the section and the blank.");
  out.push("2. **Make the choices listed under _The choices that are yours_.** They are left blank on purpose.");
  out.push("3. **Serve a copy on the prosecuting attorney**, then complete the certificate of service in section 9 of JDF 477 — the date, the method, and who you sent it to. Do it after you have served, not before.");
  out.push("4. **Sign the verification in section 10 of JDF 477.** It is a declaration under penalty of perjury under the law of Colorado. The whole block — the date, the place, your printed name and your signature — is completed by you at the moment you declare, so none of it is filled in for you.");
  out.push("5. **Tick the Colorado Bureau of Investigation box in section 3 of JDF 478.** It is the one required agency and the packet left it blank — see the section above.");
  out.push("6. **Leave sections 4 and 5 of JDF 478 alone.** Those are the court's orders and the judge's or magistrate's signature.");
  out.push("7. **Add the city, state and ZIP to JDF 477's mailing-address line** — see the section above.");
  out.push("8. **Mail a copy of your motion to the Prosecuting Attorney's office.** JDF 491 § ③ Send a Copy says so in as many words: “" + GUIDE_QUOTATIONS.sendACopy.text + "” No held source states a deadline or a method for that mailing, so none is stated here.");
  out.push("");

  if (packetSet?.requiredBeforeFiling?.length) {
    out.push("## Everything the record says you must do before you file", "");
    out.push(
      "The authoritative packet-set record for this route carries its own list of what has to happen before this "
      + "motion is filed. It is printed here word for word, so that nothing on that list can quietly fail to reach "
      + "you, with what each line means for you beside it. Where a line records that a question is **open**, it is "
      + "kept open: an unanswered question you can take to the clerk is worth more than a confident answer nobody "
      + "checked.", ""
    );
    out.push("| What the record says, word for word | What that means for you |", "| --- | --- |");
    for (const item of packetSet.requiredBeforeFiling) {
      const gloss = REQUIRED_BEFORE_FILING_GLOSS[item];
      assert.ok(gloss,
        `the packet-set manifest carries a requiredBeforeFiling item this build has no participant wording for: `
        + `${JSON.stringify(item)}`);
      out.push(`| ${item.replace(/\|/g, "\\|")} | ${gloss.replace(/\|/g, "\\|")} |`);
    }
    out.push("");
  }

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

  if (settledButNotMarked.length > 0) {
    out.push("## Not your choice, and still unticked — you tick it anyway", "");
    out.push(
      "These boxes are settled by the form itself, not by anything about your case, so nothing here is asking you to "
      + "decide. The packet could not mark them, for the reason each row gives, so the tick is still yours to make "
      + "before you file. Do not treat this as an option you may leave alone.", ""
    );
    out.push("| Form | Section | The box | What the form settles | Why the packet did not mark it | What you do |",
      "| --- | --- | --- | --- | --- | --- |");
    for (const c of settledButNotMarked) {
      /*
       * The participant gets the reason in the terms of the document in front
       * of them. The engineering account of the same refusal -- which shared
       * module holds the rule and what would have to change in it -- stays in
       * production-field-map.json, which is where an auditor reads it. Build
       * rationale and module paths are not participant copy.
       */
      const categories = [...new Set((c.refusedBy ?? []).map((x) => x.category).filter(Boolean))];
      const plainReason = categories.includes("agency")
        ? "the platform will not tick a box whose line names a law-enforcement agency, so that it can never fill in "
          + "the list of agencies a court is ordering to seal. The safeguard is right in general and it costs you "
          + "this one tick"
        : "the platform refused to mark it rather than assert a value it may not assert";
      out.push(
        `| ${c.document} | ${c.sectionHeading} | ${c.effectiveLabel} | ${c.reason} | ${plainReason} | `
        + `${c.whatTheParticipantMustDoInstead ?? "tick this box yourself before you file"} |`
      );
    }
    out.push("");
  }

  out.push("## What the platform deliberately left blank", "");
  out.push("- **The verification in section 10 of JDF 477** — the date, the city, the state, your printed name and your signature. It is sworn under penalty of perjury and is completed at the moment of declaring.");
  out.push("- **The certificate of service in section 9 of JDF 477** — the date, the method and the person served. Service has not happened when this packet is prepared.");
  out.push("- **The counsel signature block.** You are filing this yourself; no attorney-representation fact is held for you.");
  out.push("- **The Division and Courtroom boxes on both forms.** The form marks that box for court use.");
  out.push("- **Sections 4 and 5 of JDF 478** — the court's orders and the judge's or magistrate's signature and date.");
  out.push("");

  const stops = selfHelpStops();
  out.push("## Where self-help ends", "");
  out.push(
    "This packet prepares JDF 477 and JDF 478 for you to review, complete, sign and file yourself. The committed track "
    + "registry records these as the points where self-help ends on this route, in its own words. If any of them "
    + "describes your case, stop before you file and take it to a lawyer rather than filing:", ""
  );
  for (const condition of stops.conditions) out.push(`- ${condition}`);
  out.push("");
  for (const qualifier of stops.qualifiers) {
    out.push(
      "The registry adds this note, in its own words, distinguishing a routine hearing from a contested one: "
      + `“${qualifier}”`, ""
    );
  }
  out.push(
    stops.waitingPeriods.length > 0
      ? `The registry states these waiting periods for this route: ${stops.waitingPeriods.join(" ")}`
      : "The registry states no waiting period for this route, so none is stated here.", ""
  );
  out.push(
    stops.exclusions.length > 0
      ? `The registry states these exclusions for this route: ${stops.exclusions.join(" ")}`
      : "The registry states no categorical exclusion for this route, so none is stated here. That is not a finding that "
        + "your own records are eligible to be sealed. This packet does not decide that, and JDF 477 sets out the grounds "
        + "and the conditions in its own words.", ""
  );
  out.push(
    "When you reach one of those points, stop and ask someone with the authority to answer. The clerk of the Colorado "
    + "court that handled your case — the same clerk you file with — answers procedural questions: filing, fees, copies "
    + "and where things must be sent. Only a lawyer licensed to practise in Colorado may advise you on whether your "
    + "records are eligible to be sealed, on what to argue, or at a contested hearing; if you cannot afford one, ask that "
    + "same clerk's office how to reach legal aid or a lawyer referral service. This packet is not legal advice, and no "
    + "lawyer has reviewed your case in preparing it.", ""
  );

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared set of official Colorado Judicial Department forms. It is not legal advice, it is not filed for "
    + "you, and it does not decide whether your records are eligible to be sealed. JDF 477 sets out the grounds and the "
    + "conditions in its own words — including the affirmations in section 7 about protective orders, underage alcohol, "
    + "marijuana and paraphernalia offences, and charges dismissed under C.R.S. § 18-1.3-101. Read them before you swear to them."
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

  /* And why the two it cannot render cannot be rendered, proved from the
   * committed index rather than asserted. See the RECOVERY_POOL comment. */
  const recoveryPoolIdentity = assertRecoveryPoolEntriesAreRecordedAsExpected();

  /* The official guide, bound by digest, with every phrase this packet quotes
   * proved present in its bytes. See GUIDE_QUOTATIONS. */
  const guide = await resolveGuide();

  const censuses = [];
  for (const source of resolved) {
    const census = await censusOf(source);
    assert.equal(census.unmapped.length, 0,
      `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 5).map((u) => u.field))}`);
    assert.equal(census.stale.length, 0,
      `${source.formNumber}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
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
      const proof = await byteProof(source, census, bytes, report, fixtureName);
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

  /*
   * A VALUE THE PLATFORM HOLDS, REFUSED FOR FIT, IS A BLANK THE PARTICIPANT
   * MUST FILL -- AND IT WAS NOT DISCLOSED.
   *
   * `maps` is built from the CANONICAL fixture alone, so a fit refusal that
   * only the boundary participant hits never reached rbf and never reached the
   * instructions. VF01 measured exactly that at base ed0e3b308: JDF 477's
   * single `Address` line is 242.67 points wide and the boundary participant's
   * mailing address needs 244.4 at the 6-point floor, so the finalizer refused
   * it -- correctly, because the alternative is clipping or unreadable ink --
   * while the instructions still told the participant their address had been
   * filled in on both forms. The refusal was right and the disclosure was
   * missing, which is the shape that hurts: a blank nobody is asked to fill.
   *
   * Every fixture's refusals are collected here, deduplicated by document and
   * field, and handed to the instructions. Nothing is shrunk below the accepted
   * floor to make the table shorter.
   */
  const fitRefusals = [];
  const seenFitRefusal = new Set();
  for (const proof of writeProofs) {
    for (const u of proof.unfittable ?? []) {
      const key = `${proof.formNumber}/${u.field}`;
      if (seenFitRefusal.has(key)) continue;
      seenFitRefusal.add(key);
      const row = censuses.find((c) => c.source.formNumber === proof.formNumber)
        ?.census.rows.find((r) => r.name === u.field) ?? null;
      fitRefusals.push({
        document: proof.formNumber, field: u.field, fixture: proof.fixture,
        section: row?.section ?? "(section not resolved)",
        label: row?.effectiveLabel ?? u.field,
        page: row?.page ?? null,
        factId: u.factId ?? null,
        value: u.value,
        reason: u.reason,
        rectWidthPt: u.rect?.width ?? null,
        requiredWidthAtMinPt: u.requiredWidthAtMin ?? null,
        minFontSizePt: u.minFontSize ?? null
      });
    }
  }

  const instructionsText = participantInstructions(maps, rbf, fitRefusals, packetSet, guide);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/component-set-delivery.json`, {
    schemaVersion: "rcap-family-component-set-delivery/v1", familyId: FAMILY_ID,
    countedFrom: `${GROUNDING_RECORDS.packetSetManifest} packetSets[packetSetId=${FAMILY_ID}].components`,
    groundingRecordSha256: packetSet.record.sha256,
    requiredByTheRoute: packetSet.required.length,
    renderedHere: packetSet.delivered.length,
    complete: false,
    packetSetCompletenessState: packetSet.completeness.state,
    packetSetCompletenessBasis: packetSet.completeness.basis,
    guide: {
      formNumber: guide.formNumber, title: guide.title, sha256: guide.sha256,
      pathInArchive: guide.pathInArchive, revision: guide.revision,
      fileTheRequest: guide.quoted.fileTheRequest.text, howItWasRead: guide.howItWasRead
    },
    undelivered: packetSet.undelivered.map((row) => {
      const named = GUIDE_NAMES_THE_MISSING_COMPONENTS[row.componentId] ?? null;
      const pool = RECOVERY_POOL.entries.find((e) => e.componentId === row.componentId) ?? null;
      return {
        componentId: row.componentId, role: row.role,
        requiredOfficialFormId: row.requiredOfficialFormId ?? null,
        identityResolvedFrom: named
          ? `${guide.formNumber} (sha256 ${guide.sha256}) names it "${named.asTheGuideWritesIt}" in its own `
            + "\"File the Request\" list, read from the guide's bytes at build time"
          : null,
        blockedBy: pool?.blockedBy ?? "no_held_source",
        binaryRecordedInCommittedIndex: pool
          ? {
            custody: RECOVERY_POOL.custody, path: pool.path, sha256: pool.sha256,
            byteLength: pool.byteLength, pageCount: pool.pageCount, acroFieldCount: pool.acroFieldCount,
            indexIdentity: recoveryPoolIdentity.find((m) => m.path === pool.path) ?? null,
            digestProvenance:
              "quoted from the committed corpus index and NOT re-hashed here, so that this build's output is the "
              + "same in a container that mounts the custody and one that does not. Lane FIX157 re-hashed both "
              + "binaries on 2026-09-10 in a worktree that DOES mount it and got these exact digests."
          }
          : null,
        whatThisFormIs: pool?.whatThisFormIs ?? null,
        sourceStatus: row.sourceStatus ?? null,
        sourceStatusBasis: row.sourceStatusBasis ?? null,
        disclosedToTheParticipant: true
      };
    }),
    whatThisBuildRefusedToDo:
      "Substitute another form for either, and fill JDF 493 from the 2019-08 flat copy the index holds. A route "
      + "sells only what a record proves it delivers.",
    grantsNothing:
      "Disclosing an absent component is not delivering it. This family remains COMPONENT_SET-incomplete and this "
      + "record is the evidence of that, not a waiver of it."
  });

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
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      }))
    }))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    finding:
      "JDF 477 and JDF 478 interleave their glyph runs. Text extracted from the content stream is scrambled at the "
      + "character level, so no printed-caption check can be run against them.",
    whyThisIsNotWorkedAround:
      "A fuzzy match loose enough to accept \"NumEer\" as \"Number\" would pass on almost anything, and a check that "
      + "cannot fail reads as evidence while proving nothing. The absence is recorded instead.",
    whatTheCaptionClaimRestsOnHere:
      "Colorado authored these widget names -- County, Court Address, Case Number, Phone, Email, CoS_Date, "
      + "Sig1_Signature, 8D.1, 478.3C.2 -- and they are keyed to the printed sections. The dictionary and the widget set "
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
    /*
     * Every route-determined selection on this packet, and what the DELIVERED
     * PAGE carries for each. An entry is a claim about ink.
     */
    routeDeterminedSelections: maps.flatMap((m) => m.selectionControls
      .filter((c) => c.routeDetermined === true)
      .map((c) => ({
        document: m.formNumber, field: c.field, printedQuestion: c.effectiveLabel,
        answerTheRouteDetermines: "the Colorado Bureau of Investigation is on the list of record holders",
        markedByThePacket: c.markedByThePacket === true,
        statedOnTheDeliveredPage: c.markedByThePacket === true,
        basis: c.reason, refusedBy: c.refusedBy ?? null,
        whyNotMarked: c.whyThePacketCouldNotMarkIt ?? null,
        carriedToTheParticipant: c.whatTheParticipantMustDoInstead ?? null
      }))),
    /*
     * The other CBI box, on the motion, is the ISSUER's own mark and not this
     * packet's. Recorded so a reader who sees a tick on JDF 477 and none on
     * JDF 478 knows which is which.
     */
    sourceAuthoredSelections: [
      {
        document: "JDF-477", field: "JDF-477/8C.0",
        printedQuestion: "Colorado Bureau of Investigation holds records (selection)",
        statedOnTheDeliveredPage: true, writtenByThisPacket: false,
        basis:
          "The Colorado Judicial Department ships JDF 477 with this box already checked, because the form marks the "
          + "CBI required. Flattening materialises the form's own value; reports/actual-writes.json records it as a "
          + "documentAuthoredAppearance. The packet does not mark it again, and marking it again would claim a write "
          + "over the issuer's own value."
      }
    ],
    routeSelectionNote:
      "C.R.S. § 24-72-705 is one simplified process covering all five grounds JDF 477 lists, so the route does not choose "
      + "between them: which ground applies is a fact about how this case ended. The packet states the route it was built "
      + "for and leaves the ground, the court type and the agency list to the participant rather than asserting a "
      + "disposition it does not hold. One selection IS route-determined and is recorded above: the CBI line, which both "
      + "forms mark required. On JDF 477 the issuer has already ticked it. On JDF 478 the packet asks the shared "
      + "finalizer to tick it, the shared `agency` protect rule refuses, the refusal is recorded per fixture, and the "
      + "participant is told to tick it before filing. The box is not relabelled to get past that rule.",
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
    /*
     * A value the platform HOLDS and could not print is a blank too, and it is
     * the one class of blank that no census row can carry: the census says the
     * field is written, and only the finalizer's fit measurement says it was
     * not. Recorded here beside the other blanks so the ledger is complete, and
     * disclosed to the participant in participant-instructions.md.
     */
    valuesRefusedForFit: fitRefusals,
    everyRequiredBeforeFilingItemIsDisclosed: true,
    everyValueRefusedForFitIsDisclosed: true,
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
      "JDF 477 sections 1, 2, 3 and 5, and JDF 478 sections A, B, C and 2: confirm the county, case number, defendant "
        + "name, birth date, address, phone and e-mail each sit under the heading they belong to. The text stream is "
        + "scrambled, so this is the check.",
      "JDF 477 section 6: all five grounds unticked and their date boxes blank.",
      "JDF 477 section 8: the agency boxes unticked and the agency names, numbers and addresses blank — EXCEPT the "
        + "Colorado Bureau of Investigation box, which the Colorado Judicial Department ships already checked. That "
        + "tick is the issuer's own and reports/actual-writes.json records it as a documentAuthoredAppearance; a "
        + "reader should confirm it is there, not that it is absent.",
      "JDF 478 section 3: every agency box unticked, INCLUDING the Colorado Bureau of Investigation box the form "
        + "marks (required). That empty box is a KNOWN, MEASURED DEFECT, not a clean page: the route requires the "
        + "tick, this packet asks the shared finalizer for it, and the shared `agency` protect rule refuses because "
        + "the label names a law-enforcement agency. See production-field-map.json routeDeterminedSelections. The "
        + "participant is told in participant-instructions.md to tick it before filing. Confirm that instruction is "
        + "present and unmissable; do not read the empty box as correct.",
      "JDF 478 section 3, the agency names, numbers and addresses: blank.",
      "JDF 477 section 9: the certificate of service blank — no date, no method, no recipient.",
      "JDF 477 section 10: the verification blank — no date, no place, no printed name, no signature — and the counsel block blank.",
      "JDF 478 sections 4 and 5: the court's orders, signature and date blank, and neither Judge nor Magistrate ticked."
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
        finding: "JDF 477 and JDF 478 interleave their glyph runs; extracted text is scrambled at the character level.",
        consequence:
          "No printed-caption check can be run on either form. The captions rest on Colorado's own authored field names "
          + "and the printed section headings; the scrambled extraction is recorded per field in "
          + "reports/caption-evidence.json, and placement is left to the visual reviewer, who can read the paper."
      },
      {
        finding: "C.R.S. § 24-72-705 is one simplified process covering five different grounds, and JDF 477 asks which one applies.",
        consequence:
          "The ground is a participant election rather than a route-determined selection. A packet built for this route "
          + "that ticked one of the five would be asserting a disposition the platform does not hold."
      },
      {
        finding: "Both forms ask for the agencies holding records, and the completeness contract refuses to let a court or clerk refusal class excuse an agency fact.",
        consequence:
          "Every agency name, number and address is declared REQUIRED_BEFORE_FILING and named to the participant in "
          + "participant-instructions.md, rather than being bundled into a protected class."
      },
      {
        finding: "JDF 477 section 10 is a verification under penalty of perjury, not a plain signature line.",
        consequence:
          "The whole block — date, city, state, printed name and signature — is left blank. Prefilling any part of a "
          + "verification presents a sworn instrument as further along than it is."
      },
      {
        finding:
          "JDF 477 ships with the Colorado Bureau of Investigation box already ticked, because the form marks that agency "
          + "required. The finished artifact therefore draws a tick at a rectangle this map refuses.",
        consequence:
          "The census reads each control's value from the pinned source, and the byte proof records ink at a control the "
          + "source already carried as a documentAuthoredAppearance rather than as ink on a refused field. Reading it the "
          + "other way would report a protected write this build never made. Nothing is softened: a control the source "
          + "leaves empty that carries ink in the output is still a blocking finding."
      },
      {
        finding:
          "participant.street_address held the WHOLE address, and two forms in this packet want it two different "
          + "ways. JDF 477's single line is captioned \"Current Mailing Address: (with city/state/zip)\"; JDF 478 "
          + "section 2c has a field Colorado names \"∆ Street Address\", whose own tooltip reads \"Enter the "
          + "Defendant's street address.\", beside separate ∆ City, ∆ State and ∆ Zip boxes this packet also fills. "
          + "So the delivered order printed the town and the ZIP twice, and the street field carried something the "
          + "widget's declared purpose says is not its. VF22 found it at base 8db74d6e5; no counter could, because "
          + "every value was present, non-empty, inside its declared rect and equal to its expected value.",
        consequence:
          "The fact now holds the street alone -- which is what the shared semantic registry declares "
          + "participant.street_address to be, and what this family's municipal sibling has always held -- so "
          + "nothing is printed twice on the order. JDF 477's line is one step short of its own caption as a result, "
          + "and participant-instructions.md carries a section telling the participant to add the city, state and "
          + "ZIP to it and where to copy them from. Composing a combined value for that one line was not available: "
          + "the shared finalizer refuses an explicit mapping that disagrees with the fact its registry derives from "
          + "the field's own name, so a composed-address fact would have to be added to a shared module, and a "
          + "repair lane holding two families does not get to move every family that shares it."
      },
      {
        finding:
          "JDF 478's ∆ State field declares \"Enter the state (use two letter abbreviation)\" and the boundary "
          + "fixture held \"Colorado\". It fits the 33.1pt field and renders cleanly, so no geometry check sees it; "
          + "it simply contradicts the field's own printed instruction.",
        consequence:
          "The fixture now holds \"CO\". THE UNDERLYING GAP IS NOT CLOSED AND IS NOT THIS LANE'S TO CLOSE: this "
          + "packet has no fact-transformation layer and should not grow one, so what it writes is what it holds -- "
          + "and nothing in this build or in the shared finalizer enforces a per-field FORMAT declared by a widget's "
          + "own tooltip. Correcting the fixture removes the contradiction from the delivered bytes; a real "
          + "participant record holding \"Colorado\" would reproduce it. Enforcing a declared field format belongs "
          + "in scripts/rcap-official-forms/**, which every family shares.",
        severity: "advisory"
      },
      {
        finding:
          "The packet-set manifest declared TWO components for this route and JDF 491, Colorado's own guide at the "
          + "same revision as both bound forms, names FOUR: \"JDF 477 Motion\", \"JDF 492 Order (just do §§ A-C)\", "
          + "\"JDF 493 Notice (Just do §§ A-C)\" and \"JDF 478 Order (just do §§ A-C)\". Nothing recorded the "
          + "difference -- no component, no completeness state, no open source item, no sentence of the delivered "
          + "guide, which said flatly that the packet is two forms filed together. VF22 found it at base 8db74d6e5 "
          + "by reading JDF 491 itself.",
        consequence:
          "Lane FIX157 added both components to the manifest with a measured sourceStatusBasis each and recorded "
          + "packetSetCompleteness incomplete; this build now reads that record, asserts the guide's own list "
          + "against the guide's bytes, and discloses the gap to the participant by form number. THE OBLIGATION IS "
          + "NOT SATISFIED: a truthful account of an absent component is honesty, not delivery, and this packet "
          + "still delivers two of four. The two are blocked differently and the record says which is which -- "
          + "JDF 492's index entry carries formNumber null and assetClass null so it cannot be bound by identity, "
          + "while the JDF 493 the index holds is a 2019-08 flat PDF with zero form fields against a 2024-08-07 "
          + "guide. Neither reason is a mount: FIX157 found the custody mounted, declared in the index's own "
          + "custodies array, and holding both binaries at exactly the digests recorded."
      },
      {
        finding:
          "Four of the seven requiredBeforeFiling items in the controlling packet-set manifest reached the delivered "
          + "guide neither verbatim nor in substance: the CBI criminal-history report, the check of the "
          + "case-ending answer against it, the notarization position and the fee-waiver position. VF22 measured "
          + "each by literal substring and then by keyword over the whole delivered file.",
        consequence:
          "participant-instructions.md now carries a section that prints every manifest requiredBeforeFiling item "
          + "word for word with a participant wording beside it, and the build REFUSES on an item it has no wording "
          + "for rather than printing an operator sentence at a participant or dropping it. The open items stay "
          + "open: JDF 491 mentions no fee, no waiver and no notarisation anywhere in its bytes, so this packet "
          + "carries all three as unsettled and names no form for a waiver on this route.",
        severity: "advisory"
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
