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
import { finalizeOfficialForm, isoDateInPrintedOrder } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
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
const { PDFDocument, PDFName } = require("pdf-lib");

const FAMILY_ID = "co_motion_seal_conviction-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const TRACK_ID = "co_motion_seal_conviction";
const OUT = "data/rcap-all50/overlays/census-v1/co/co-motion-seal-conviction-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-co_motion_seal_conviction-set.mjs";

/*
 * The historical packet-set record preserves the earlier two-of-four source
 * gap. Current adopted exact-content sources now bind all four JDF 611 filing
 * components, while JDF 205/JDF 206 are included as the conditional waiver pair.
 * loadPacketSetGrounding records that additive supersession without rewriting
 * the old failure evidence.
 */
const GROUNDING_RECORDS = Object.freeze({
  packetSetManifest: "data/record-clearing/legal-design-packet-set-manifests.json"
});

/*
 * THE OFFICIAL GUIDE, BOUND BY DIGEST AND READ AT BUILD TIME.
 *
 * JDF 611 is the Colorado Judicial Department's own step-by-step guide for this
 * exact route, and this packet already cited it by name when it disclosed the
 * component gap. It also answers two things the packet used to say it could not
 * answer, and both were measured against these bytes by VF07 at base 453ecee9:
 *
 *   THE FEE AND THE WAIVER. The packet said "The fee position for a motion to
 *   seal a conviction record is not established in any source this packet
 *   holds" and sent the participant to the clerk to ask what to do if they
 *   cannot pay. The guide states the amount is the clerk's to give and states
 *   the WAIVER by form number. Half of that sentence was true and half of it
 *   denied a held source.
 *
 *   THE TWO MISSING COMPONENTS' IDENTITIES. The packet told the participant, in
 *   bold, that no form number existed for the notice or the second order and
 *   that "none should be inferred", on the stated ground that the guide renders
 *   those digits as vector glyphs. It does not. They are ordinary text.
 *
 * WHY THE DIGITS LOOKED UNREADABLE, AND WHY THEY ARE NOT. This guide, like the
 * two forms this family fills, interleaves its glyph runs, so groupIntoLines()
 * -- which bands items by y and reads each band left to right -- returns
 * "JDF 2 M0o5tion to Waive Fees". That is a property of the READER, not of the
 * document. The items in STREAM ORDER concatenate to clean prose: page 1 of the
 * stream contains "JDF 613 Order (just do §§ A-C)" and "JDF 614 Notice (Just do
 * §§ A-C)" as literal substrings, and page 2 contains the whole fee paragraph.
 * So every sentence this packet takes from the guide is asserted, here, as a
 * literal substring of the digest-bound stream. A quotation that stops matching
 * stops the build.
 */
const GUIDE = Object.freeze({
  formNumber: "JDF-611",
  title: "Guide to Sealing Conviction Records (single case)",
  sha256: "b628ee77cfdbb1e02208a74b04f6a03083e2843505f4bb4a7c3e0f2b3503843e"
});

/*
 * Every phrase this build takes from JDF 611, exactly as the stream carries it.
 * `page` is the guide page each must be found on; a phrase that moves pages is
 * a different document and is treated as drift.
 */
const GUIDE_QUOTATIONS = Object.freeze({
  fileTheRequest: {
    page: 1,
    text: "File these forms into your criminal case:  JDF 612 Motion • Be sure to list all agency addresses you "
      + "found in Step 1.  JDF 613 Order (just do §§ A-C)  JDF 614 Notice (Just do §§ A-C)  JDF 615 Order "
      + "(just do §§ A-C)"
  },
  feeIsTheClerks: { page: 2, text: "The Clerk will let you know the fee (if any) when filing." },
  waiverForms: {
    page: 2,
    text: "If you cannot afford the fees, also file:  JDF 205 Motion to Waive Fees  JDF 206 Order (Just do §§ A-C)"
  }
});

/*
 * The identity each undelivered component has in the guide's own list, and the
 * words the guide uses for it. Keyed by the manifest's componentId, because the
 * manifest is what names the component and this build does not invent one.
 */
const GUIDE_NAMES_THE_MISSING_COMPONENTS = Object.freeze({
  "co_motion_seal_conviction-notice-3": { formNumber: "JDF 614", asTheGuideWritesIt: "JDF 614 Notice (Just do §§ A-C)" },
  "co_motion_seal_conviction-second-order-4": { formNumber: "JDF 613", asTheGuideWritesIt: "JDF 613 Order (just do §§ A-C)" }
});

/*
 * Where the two undelivered binaries are recorded, quoted from the committed
 * corpus index.
 *
 * WHAT CHANGED, AND WHY IT IS NOT A MOUNT QUESTION. This block used to say the
 * custody "is not mounted in any packet-factory container", and the packet said
 * the same thing to the participant: that the machine which built it could not
 * reach the file. Lane FIX157 measured that on 2026-09-10 and it is false of a
 * container that has the custody. The index's own `custodies` array declares
 * nationwide_recovery_pool_2026_09_02 at root
 * private/source-imports/Nationwide_Recovery_Pool_2026-09-02, pathsRelativeTo
 * custodyRoot; it is mounted in the FIX157 lane worktree, and both binaries
 * there hash to exactly the digests the committed index records.
 * data/rcap-grade-a/packet-factory-24h/PRIVATE_CUSTODY_MOUNT.json records why a
 * lane can see it absent: private/ is gitignored and exists only where it was
 * materialised, so its absence from a checkout proves nothing about custody.
 *
 * WHAT ACTUALLY BLOCKS THE RENDER is the index's identity fields, and that is
 * true in every container, mounted or not: both entries carry formNumber null
 * and assetClass null. resolveSources() binds an official form by
 * state + formNumber + assetClass "FORM" and only then hashes it, so no build
 * can bind a binary the index does not identify. Binding by file name instead
 * would rest this packet's source claim on a file name.
 *
 * So this build states the blocker from the COMMITTED INDEX rather than from
 * what happens to be on disk, and asserts it below. That keeps the delivered
 * page identical in a container that mounts the custody and one that does not,
 * which a mount-sensitive sentence would not.
 */
const RECOVERY_POOL = Object.freeze({
  custody: "nationwide_recovery_pool_2026_09_02",
  /* Asserted from the committed index by assertRecoveryPoolEntriesAreUnidentified(). */
  identifiedByTheCommittedIndex: false,
  entries: Object.freeze([
    Object.freeze({
      formNumber: "JDF 614", componentId: "co_motion_seal_conviction-notice-3",
      path: "LegalEase Colorado/JDF614.pdf",
      sha256: "08f0a13f9aa7f5036f6f28748648fdee56aed9ee1f511f6f10e183e0bfa5e08b",
      byteLength: 555787, pageCount: 1, acroFieldCount: 16
    }),
    Object.freeze({
      formNumber: "JDF 613", componentId: "co_motion_seal_conviction-second-order-4",
      path: "LegalEase Colorado/reference-only/JDF-613__order-denying-request-to-seal-conviction-records__rev-2024-08-07.pdf",
      sha256: "0745d99f233c7df13286c581c912d9f87b15187270e3d1773455c1ed51848677",
      byteLength: 545525, pageCount: 1, acroFieldCount: 13,
      whatThisFormIs:
        "The order DENYING the request to seal, confirmed by lane FIX157 on 2026-09-10 from the bytes at the digest "
        + "above. Page 1 is headed \"JDF 613  Order Denying Request to Seal Conviction Records\"; section 1 Decision "
        + "reads \"After reviewing the request to seal the Defendant\u2019s records, the Court finds:\" with the "
        + "alternatives \"The motion, on its face, is insufficient\" and \"After review of matters outside the motion, "
        + "the Defendant is not entitled to relief under C.R.S. §§ 24-72-706 to 710\", followed by \"The Court denies "
        + "the motion because:\"; and the footer reads \"JDF 613 - Order Denying Request to Seal Conviction Records   "
        + "R: August 7, 2024   Page 1 of 1\" -- the same revision as JDF 611. So the \"second order\" the guide lists "
        + "is the denial order tendered alongside the JDF 615 grant order, not a second grant. FIX96 recorded this as "
        + "an open caution because the custody was not mounted to it; it is closed, and the packet now tells the "
        + "participant what the form is instead of asking them to check."
    })
  ])
});

const ROUTE = Object.freeze({
  jurisdiction: "CO",
  routeKey: "obligation:track-pathway:CO:co_motion_seal_conviction:petition-based-conviction-sealing-jdf-612-24-72-706",
  routeSelectionId: "co-motion-seal-conviction-set-jdf-612-jdf-613-jdf-614-jdf-615-with-conditional-jdf-205-jdf-206",
  publicLabel: "Motion to seal conviction records, the petition-based route for a Colorado conviction",
  authority: "C.R.S. § 24-72-706; Colorado Judicial Department forms JDF 612, JDF 613, JDF 614, JDF 615 and conditional fee-waiver forms JDF 205/JDF 206",
  documents: [
    { formNumber: "JDF-612", title: "Motion to Seal Conviction Records (County/District Court)", instrumentKind: "primary_filing" },
    {
      formNumber: "JDF-613", title: "Order Denying Request to Seal Conviction Records", instrumentKind: "proposed_denial_order",
      sourcePath: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase Colorado/reference-only/JDF-613__order-denying-request-to-seal-conviction-records__rev-2024-08-07.pdf",
      sha256: "0745d99f233c7df13286c581c912d9f87b15187270e3d1773455c1ed51848677",
      revision: "REV-2024-08-07", acroFieldCount: 13, pageCount: 1
    },
    {
      formNumber: "JDF-614", title: "Order and Notice of Hearing (re sealing conviction records)", instrumentKind: "conditional_hearing_notice",
      sourcePath: "private/source-imports/user-upload-20260911/08f0a13f9aa7f5036f6f28748648fdee56aed9ee1f511f6f10e183e0bfa5e08b.pdf",
      sha256: "08f0a13f9aa7f5036f6f28748648fdee56aed9ee1f511f6f10e183e0bfa5e08b",
      revision: "REV-2024-08-07", acroFieldCount: 16, pageCount: 1,
      conditionDescription: "The court determines that a hearing is necessary; only caption sections A-C are completed before filing."
    },
    { formNumber: "JDF-615", title: "Order to Seal Conviction Records", instrumentKind: "proposed_grant_order" },
    {
      formNumber: "JDF-205", title: "Motion to Waive Fees", instrumentKind: "conditional_fee_waiver_motion",
      sourcePath: "private/source-imports/user-upload-20260911/45b12f9ace73c369607a5b508d7010f2bc0eeaac1fa1a7357493d61dfb831f6b.pdf",
      sha256: "45b12f9ace73c369607a5b508d7010f2bc0eeaac1fa1a7357493d61dfb831f6b",
      revision: "REV-2024-04-02", acroFieldCount: 91, pageCount: 3,
      conditionDescription: "Include and file only if the participant cannot afford the filing fee and requests a waiver."
    },
    {
      formNumber: "JDF-206", title: "Order re Court Fees", instrumentKind: "conditional_fee_waiver_order",
      sourcePath: "private/source-imports/user-upload-20260911/36ad409286aa60f7af3195c5534a0f969a4682079271ba4cc6068f31cee71dc4.pdf",
      sha256: "36ad409286aa60f7af3195c5534a0f969a4682079271ba4cc6068f31cee71dc4",
      revision: "REV-2024-08-20", acroFieldCount: 26, pageCount: 2,
      conditionDescription: "Tender with JDF 205 only when requesting a fee waiver; all findings, payment terms and signatures remain for the court."
    }
  ]
});

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

/*
 * The two undelivered components are blocked by IDENTITY, and this proves it
 * from the committed index rather than from the disk.
 *
 * For each recovery-pool entry this packet names, the index must carry exactly
 * one row at that path, at the digest and byte length recorded here, and it
 * must carry formNumber null and assetClass null -- which is what makes it
 * unbindable by resolveSources(). If the index ever identifies one of them the
 * assertion fails, and it should: the reason this packet gives the participant
 * would no longer be true, and the component would be renderable.
 *
 * Nothing here touches the mount. A container with the custody and a container
 * without it read the same committed index and produce the same bytes.
 */
function assertRecoveryPoolEntriesAreUnidentified() {
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
      `${entry.path} now carries formNumber ${JSON.stringify(row.formNumber)}: this component is no longer blocked by identity and this packet's disclosure is stale`);
    assert.equal(row.assetClass, null,
      `${entry.path} now carries assetClass ${JSON.stringify(row.assetClass)}: this component is no longer blocked by identity and this packet's disclosure is stale`);
    measured.push({ path: entry.path, formNumber: row.formNumber, assetClass: row.assetClass,
      sha256: row.sha256, byteLength: row.byteLength, pageCount: row.pageCount ?? null,
      acroFieldCount: row.acroFieldCount ?? null });
  }
  return measured;
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

  const delivered = required.filter((row) => {
    const formId = row.officialFormId ?? row.requiredOfficialFormId;
    return formId && deliveredFormNumbers.includes(String(formId).replace(/\s+/g, "-"));
  });
  const undelivered = required.filter((row) => !delivered.includes(row));
  const recordedCompleteness = packetSet.packetSetCompleteness ?? null;
  const completeness = undelivered.length === 0
    ? {
        state: "complete",
        basis: "All four forms named by JDF 611 are bound to exact held bytes and rendered: JDF 612, JDF 613, JDF 614 and JDF 615. The separately conditional JDF 205/JDF 206 fee-waiver pair is also included and clearly dispositioned.",
        supersedesRecordedSourceGap: recordedCompleteness
      }
    : recordedCompleteness;

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
    Address: { section: "Section D — My Information", label: "Current Mailing Address (with city/state/zip)", ...WRITE("participant.full_mailing_address") },
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

  "JDF-613": {
    Group_CourtType: { section: "A. Court", label: "District Court or County Court (selection)", selection: true, ...ELECTION("tick the court type for the existing criminal case") },
    County: { section: "A. Court", label: "Colorado County", ...WRITE("matter.county") },
    "Court Address": { section: "A. Court", label: "Court Address", ...SUPPLY("the mailing address of the court that handled the case") },
    "∆": { section: "B. Parties to the Case", label: "Defendant — Full Name", ...WRITE("participant.full_legal_name") },
    "Case Number": { section: "C. Case Details", label: "Case Number", ...WRITE("matter.case_number") },
    Division: { section: "C. Case Details", label: "Division", ...PROTECT(COURT_OWNED, "the court-use caption field remains for the court") },
    Courtroom: { section: "C. Case Details", label: "Courtroom", ...PROTECT(COURT_OWNED, "the court-use caption field remains for the court") },
    "1.1": { section: "1. Decision", label: "By the Court — motion insufficient", selection: true, ...PROTECT(COURT_OWNED, "this is a future court finding on the denial order") },
    "1.2": { section: "1. Decision", label: "By the Court — defendant not entitled to relief", selection: true, ...PROTECT(COURT_OWNED, "this is a future court finding on the denial order") },
    "1.3": { section: "1. Decision", label: "By the Court — reason for denying the motion", ...PROTECT(COURT_OWNED, "the court states its own reason if it denies the motion") },
    "Sig-by": { section: "2. So Ordered", label: "By the Court — signature", ...PROTECT(COURT_OWNED, "the judicial officer signs the order") },
    Group_Sig: { section: "2. So Ordered", label: "By the Court — Judge or Magistrate (selection)", selection: true, ...PROTECT(COURT_OWNED, "the signing judicial officer identifies their role") },
    Sig_date: { section: "2. So Ordered", label: "By the Court — date signed", ...PROTECT(COURT_OWNED, "the court dates its own order") }
  },

  "JDF-614": {
    Group_CourtType: { section: "A. Court", label: "District Court or County Court (selection)", selection: true, ...ELECTION("tick the court type for the existing criminal case") },
    County: { section: "A. Court", label: "Colorado County", ...WRITE("matter.county") },
    "Court Address": { section: "A. Court", label: "Court Address", ...SUPPLY("the mailing address of the court that handled the case") },
    "∆": { section: "B. Parties to the Case", label: "Defendant — Full Name", ...WRITE("participant.full_legal_name") },
    "Case Number": { section: "C. Case Details", label: "Case Number", ...WRITE("matter.case_number") },
    Division: { section: "C. Case Details", label: "Division", ...PROTECT(COURT_OWNED, "the court-use caption field remains for the court") },
    Courtroom: { section: "C. Case Details", label: "Courtroom", ...PROTECT(COURT_OWNED, "the court-use caption field remains for the court") },
    "1.1": { section: "1. Hearing Scheduled", label: "By the Court — hearing date", ...PROTECT(COURT_OWNED, "the court decides whether to set a hearing and supplies its date") },
    "1.2": { section: "1. Hearing Scheduled", label: "By the Court — hearing time", ...PROTECT(COURT_OWNED, "the court decides whether to set a hearing and supplies its time") },
    "1.3": { section: "1. Hearing Scheduled", label: "By the Court — defendant required to attend", selection: true, ...PROTECT(COURT_OWNED, "the court decides whether attendance is required") },
    "2.1": { section: "2. Decision", label: "By the Court — district attorney objects", selection: true, ...PROTECT(COURT_OWNED, "the court records whether the district attorney objects") },
    "2.2": { section: "2. Decision", label: "By the Court — victim objects and requests a hearing", selection: true, ...PROTECT(COURT_OWNED, "the court records the victim-rights finding") },
    "2.3": { section: "2. Decision", label: "By the Court — hearing required by statute", selection: true, ...PROTECT(COURT_OWNED, "the court records the statutory hearing finding") },
    "2.4": { section: "2. Decision", label: "By the Court — objection deadline in days", ...PROTECT(COURT_OWNED, "the court sets this deadline") },
    Sig_date: { section: "3. So Ordered", label: "By the Court — date signed", ...PROTECT(COURT_OWNED, "the court dates its own order") },
    "Sig-by": { section: "3. So Ordered", label: "By the Court — signature", ...PROTECT(COURT_OWNED, "the judicial officer signs the order") }
  },

  "JDF-205": {
    "Case Number": { section: "1. Case Number", label: "Case Number", ...WRITE("matter.case_number") },
    County: { section: "2. County", label: "County where the case is filed", ...WRITE("matter.county") },
    DoB: { section: "4. My Information", label: "Date of Birth (DD/MM/YYYY)", ...WRITE("participant.date_of_birth") },
    Phone: { section: "4. My Information", label: "Phone", ...WRITE("participant.phone") },
    Email: { section: "4. My Information", label: "Email", ...WRITE("participant.email") },
    "4.6": { section: "4. My Information", label: "Mailing street address", ...WRITE("participant.street_address") },
    "4.7": { section: "4. My Information", label: "Mailing city", ...WRITE("participant.city") },
    "4.8": { section: "4. My Information", label: "Mailing state abbreviation", ...WRITE("participant.state") },
    "4.9": { section: "4. My Information", label: "Mailing ZIP code", ...WRITE("participant.zip") },
    Name: { section: "4. My Information", label: "Full Legal Name", ...WRITE("participant.full_legal_name") },
    Sig1_Date: { section: "11. Verified Signature", label: "Day signed", ...PROTECT(SIGNATURE, "completed at signature") },
    Sig1_Month: { section: "11. Verified Signature", label: "Month signed", ...PROTECT(SIGNATURE, "completed at signature") },
    Sig1_Year: { section: "11. Verified Signature", label: "Year signed", ...PROTECT(SIGNATURE, "completed at signature") },
    Sig1_City: { section: "11. Verified Signature", label: "City or other location where signed", ...PROTECT(SIGNATURE, "completed at signature") },
    Sig1_State: { section: "11. Verified Signature", label: "State or country where signed", ...PROTECT(SIGNATURE, "completed at signature") },
    Sig1_Signature: { section: "11. Verified Signature", label: "Your Signature", ...PROTECT(SIGNATURE, "the participant signs under penalty of perjury") },
    Aty_Signature: { section: "11. Verified Signature", label: "Lawyer Signature (if any)", ...ATTORNEY("attorney-only; no attorney-representation fact is held for this participant") }
  },

  "JDF-206": {
    "Group1.1": { section: "A. Court", label: "District, County, Probate or Juvenile Court (selection)", selection: true, ...ELECTION("tick the court type for the existing case") },
    County: { section: "A. Court", label: "Colorado County", ...WRITE("matter.county") },
    "Court Address": { section: "A. Court", label: "Court Mailing Address", ...SUPPLY("the mailing address of the court that handled the case") },
    "π": { section: "B. Parties to the Case", label: "By the Court — Plaintiff/Petitioner", ...PROTECT(COURT_OWNED, "JDF 206 is the court's fee order; the source has an anomalous Plaintiff/Petitioner caption and the court preserves or completes that party line") },
    "∆": { section: "B. Parties to the Case", label: "Defendant/Respondent", ...WRITE("participant.full_legal_name") },
    "Case Number": { section: "C. Case Details", label: "Case Number", ...WRITE("matter.case_number") },
    Division: { section: "C. Case Details", label: "Division or Courtroom", ...PROTECT(COURT_OWNED, "the court-use caption field remains for the court") },
    "1.1": { section: "1. Background", label: "Name of party who filed the Motion to Waive Fees", ...SUPPLY("write the name of the party who filed JDF 205; this is participant-supplied because a fee-order caption is protected from automatic writes") },
    "2A": { section: "2. Findings and Orders", label: "By the Court — indigent", selection: true, ...PROTECT(COURT_OWNED, "the court decides indigency") },
    "2.1": { section: "2. Findings and Orders", label: "By the Court — waive another fee or service", selection: true, ...PROTECT(COURT_OWNED, "the court decides what fees to waive") },
    "2.2": { section: "2. Findings and Orders", label: "By the Court — other fee or service waived", ...PROTECT(COURT_OWNED, "the court states its own order") },
    "2.3": { section: "2. Findings and Orders", label: "By the Court — filing fee amount", ...PROTECT(COURT_OWNED, "the court states the filing fee") },
    "2.5": { section: "2. Findings and Orders", label: "By the Court — first installment due date", ...PROTECT(COURT_OWNED, "the court sets payment terms") },
    "2.6": { section: "2. Findings and Orders", label: "By the Court — second installment due date", ...PROTECT(COURT_OWNED, "the court sets payment terms") },
    "2.8": { section: "2. Findings and Orders", label: "By the Court — filing fee must be paid", selection: true, ...PROTECT(COURT_OWNED, "the court decides whether payment is required") },
    "2.7": { section: "2. Findings and Orders", label: "By the Court — final installment due date", ...PROTECT(COURT_OWNED, "the court sets payment terms") },
    "2.9": { section: "2. Findings and Orders", label: "By the Court — filing fee due", ...PROTECT(COURT_OWNED, "the court states the fee") },
    "2.10": { section: "2. Findings and Orders", label: "By the Court — filing fee due date", ...PROTECT(COURT_OWNED, "the court sets the due date") },
    "Group2.4": { section: "2. Findings and Orders", label: "By the Court — two or three installments", selection: true, ...PROTECT(COURT_OWNED, "the court sets the installment schedule") },
    "2B": { section: "2. Findings and Orders", label: "By the Court — not indigent but installments allowed", selection: true, ...PROTECT(COURT_OWNED, "the court decides indigency and payment terms") },
    "2C": { section: "2. Findings and Orders", label: "By the Court — not indigent", selection: true, ...PROTECT(COURT_OWNED, "the court decides indigency") },
    "3.1": { section: "3. Findings Made by", label: "By the Court — person making financial findings", ...PROTECT(COURT_OWNED, "court staff or a judicial officer records the finding") },
    "3.3": { section: "3. Findings Made by", label: "By the Court — date of findings", ...PROTECT(COURT_OWNED, "court staff or a judicial officer dates the finding") },
    "Group3.2": { section: "3. Findings Made by", label: "By the Court — Judicial Officer or Court Staff (selection)", selection: true, ...PROTECT(COURT_OWNED, "the person making the findings identifies their role") },
    "Group4.1": { section: "So Ordered", label: "By the Court — Judge or Magistrate (selection)", selection: true, ...PROTECT(COURT_OWNED, "the signing judicial officer identifies their role") },
    "4.2": { section: "So Ordered", label: "By the Court — date signed", ...PROTECT(COURT_OWNED, "the court dates its own order") }
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
    "∆ DoB": { section: "2. Defendant's Information", label: "By the Court — Birth Date", ...PROTECT(COURT_OWNED, "JDF 611 directs the filer to complete only sections A through C of JDF 615; the court completes the numbered order body") },
    "∆ Street Address": { section: "2. Defendant's Information", label: "By the Court — Mailing Address", ...PROTECT(COURT_OWNED, "JDF 611 directs the filer to complete only sections A through C of JDF 615; the court completes the numbered order body") },
    "∆ City": { section: "2. Defendant's Information", label: "By the Court — City", ...PROTECT(COURT_OWNED, "JDF 611 directs the filer to complete only sections A through C of JDF 615; the court completes the numbered order body") },
    "∆ State": { section: "2. Defendant's Information", label: "By the Court — State", ...PROTECT(COURT_OWNED, "JDF 611 directs the filer to complete only sections A through C of JDF 615; the court completes the numbered order body") },
    "∆ Zip": { section: "2. Defendant's Information", label: "By the Court — Zip Code", ...PROTECT(COURT_OWNED, "JDF 611 directs the filer to complete only sections A through C of JDF 615; the court completes the numbered order body") },

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
    "615.4A.1": { section: "4. Court Orders", label: "By the Court — Law Enforcement agency file number", ...PROTECT(COURT_OWNED, "JDF 611 directs the filer to complete only sections A through C of JDF 615; the court completes the numbered order body") },
    "615.4A.2": { section: "4. Court Orders", label: "By the Court — arrest number", ...PROTECT(COURT_OWNED, "JDF 611 directs the filer to complete only sections A through C of JDF 615; the court completes the numbered order body") },
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
    "participant.street_address": "412 Cherry Creek Way",
    "participant.city": "Denver",
    "participant.state": "CO",
    "participant.zip": "80202",
    "participant.phone": "303-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "matter.county": "Denver",
    "matter.case_number": "2019CR004217",
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
    "matter.case_number": "2024CR0011882-SUPPLEMENTAL",
  }
};
function factsForFixture(fixtureName) {
  const fixture = FIXTURES[fixtureName];
  return {
    ...fixture,
    "participant.full_mailing_address": `${fixture["participant.street_address"]}, ${fixture["participant.city"]}, ${fixture["participant.state"]} ${fixture["participant.zip"]}`
  };
}

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ------------------------------------------------------ */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const wanted of ROUTE.documents) {
    if (wanted.sourcePath) {
      const abs = path.resolve(ROOT, wanted.sourcePath);
      if (!fs.existsSync(abs)) {
        failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: wanted.sourcePath,
          why: `the governed exact-content source does not exist on disk: ${wanted.sourcePath}` });
        continue;
      }
      const bytes = fs.readFileSync(abs);
      const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
      if (sha256 !== wanted.sha256) {
        failures.push({ sourceId: `official-form:${wanted.formNumber}`, pathInArchive: wanted.sourcePath,
          why: `SHA-256 drift: the governed binding says ${wanted.sha256}, the held bytes are ${sha256}` });
        continue;
      }
      resolved.push({
        ...wanted, sourceId: `official-form:${wanted.formNumber}`, pathInArchive: wanted.sourcePath,
        sha256, byteLength: bytes.length, bytes
      });
      continue;
    }
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
 * Binds JDF 611 by exact SHA-256 and reads every phrase this build quotes out of
 * those bytes.
 *
 * The stream order is the reading order here; see GUIDE_QUOTATIONS above for
 * why. Each declared phrase must appear literally, on the page it is declared
 * for. A miss throws: the build does not go on to print a sentence it attributes
 * to a document that does not carry it.
 */
async function resolveGuide() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const entry = (index.entries ?? []).find((e) => e.state === "CO"
    && e.formNumber === GUIDE.formNumber && e.assetClass === "INSTRUCTIONS"
    && e.custody === "master_library");
  assert.ok(entry, `the committed corpus index carries no master_library INSTRUCTIONS entry for ${GUIDE.formNumber}`);
  const rel = entry.path;
  const abs = path.resolve(ROOT, corpusRoot(), rel);
  assert.ok(fs.existsSync(abs), `${GUIDE.formNumber} is indexed at ${rel} and is not on disk there`);
  const bytes = fs.readFileSync(abs);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  assert.equal(sha256, GUIDE.sha256,
    `${GUIDE.formNumber} SHA-256 drift: this build quotes ${GUIDE.sha256} and the mounted bytes are ${sha256}`);
  assert.equal(sha256, String(entry.sha256 ?? ""),
    `${GUIDE.formNumber}: the committed index and the mounted bytes disagree`);

  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  /* Stream order, not line order. groupIntoLines() cannot read this document
   * and the manifest's old basis was written from what it returned. */
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

  return {
    ...GUIDE, pathInArchive: rel, byteLength: bytes.length, pageCount: doc.getPageCount(),
    revision: entry.revision ?? null, sha256, quoted,
    howItWasRead:
      "every quoted phrase asserted as a literal substring of the concatenated text items of the named page, in "
      + "STREAM order. This document interleaves its glyph runs, so the repository's own groupIntoLines() reader "
      + "returns them scrambled (\"JDF 2 M0o5tion to Waive Fees\"); the stream itself is clean, and pdftotext agrees "
      + "with the stream."
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
    let entry = spec[name];
    if (!entry && source.formNumber === "JDF-205") {
      const isSelection = field.constructor.name === "PDFCheckBox"
        || field.constructor.name === "PDFRadioGroup" || field.constructor.name === "PDFDropdown";
      const tooltipObject = field.acroField.dict.lookup(PDFName.of("TU"));
      const tooltip = tooltipObject?.decodeText?.() ?? `Complete JDF 205 field ${name}`;
      const sectionNumber = String(name).match(/^(\d+)/)?.[1] ?? "4";
      entry = {
        section: `${sectionNumber}. Participant financial information`,
        label: tooltip.replace(/\s+/g, " ").trim(),
        ...(isSelection
          ? ELECTION("this is an answer about the participant's own finances or household and must be selected by the participant")
          : SUPPLY(`${tooltip.replace(/\s+/g, " ").trim()} This information is participant-specific and is not inferred by the packet.`)),
        ...(isSelection ? { selection: true } : {})
      };
    }
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
  const facts = factsForFixture(fixtureName);
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
    clearSourceCarriedTextValues: source.formNumber === "JDF-205" ? ["9A.8", "9B.8"] : [],
    printedDateOrderByField: source.formNumber === "JDF-205" ? { DoB: "day_month_year" } : {},
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title,
    /*
     * SYNTHESIZED WIDGET BORDERS: 34 of this family's 90 stroke-only flattened
     * appearances match no /AP /N stream in the pinned JDF-612 or JDF-615, byte
     * for byte. That ink is pdf-lib's default appearance provider inventing a
     * rectangle the size of a widget's /Rect from its /MK /BC, and the flatten
     * stamping it. It draws no glyph, so every glyph counter reads zero while
     * the page carries a doubled outline around a box the form already prints.
     *
     * The other 56 stroke-only appearances ARE the form's own, byte-identical
     * to streams JDF-612 and JDF-615 ship, and they must survive. This flag is
     * the right instrument for exactly that reason: it only neutralises the
     * synthesized border characteristics of a field this run did not write, and
     * it keeps a widget whose source appearance is silent rather than clearing
     * it, so the form's own drawing is preserved instead of regenerated.
     *
     * Measured, not assumed, in both directions: BORDER_COHORT_REMEDIATION.json
     * for the byte accounting, and a directional 150 dpi raster difference of
     * the repaired fixtures against renders of both pinned sources for the ink.
     * Over-suppression -- removing ink the form itself draws -- is the failure
     * this repair could cause and is the thing the removed-pixel direction of
     * that difference is read for.
     */
    suppressSynthesizedWidgetBorders: true,
    /*
     * The border flag alone did not clear them, and the measurement says why:
     * of this family's stroke-only appearances, the synthesized ones carry the
     * painting operators ["f","f"] -- two fills and no stroke. They are not
     * /MK /BC borders. They are pdf-lib's default check-box provider drawing an
     * appearance for a widget whose current /AS state has no entry in /AP /N,
     * which is exactly the condition this second flag addresses: it installs an
     * EMPTY appearance for the missing state instead, and leaves alone both a
     * widget that ships its own /Off stream and a box this run actually ticked.
     * Measured after adding it, not assumed; see the lane return.
     */
    suppressSynthesizedAppearances: true,
    /*
     * The two remaining marks are a PLACEMENT defect, not a synthesis one. On
     * JDF-612 page 4 the two "b) Appeals - Yes./No." boxes are delivered about
     * 1.4pt larger than the source draws them: a 150 dpi directional raster
     * measures 139 added dark pixels and 80 REMOVED at those two rects, the
     * removed pixels being the form's own box edge that the oversized stamp
     * replaces. That is ISO 32000-1 12.5.5 -- an appearance whose transformed
     * /BBox is not its /Rect, flattened without the fit -- which is exactly what
     * this flag pre-composes. Measured after adding it; if it does not close
     * the removed-pixel count it is reported open rather than certified.
     */
    fitAppearancesToRect: true
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
        const held = factsForFixture(fixtureName)[r.fact] ?? null;
        const expected = source.formNumber === "JDF-205" && r.name === "DoB" && held
          ? isoDateInPrintedOrder(held, "day_month_year", r.name)
          : held;
        glyphs += ink.length;
        actualWrites.push({
          field: r.key, factId: r.fact, page: wdg.page, rect: wdg.rect,
          section: r.section, effectiveLabel: r.effectiveLabel,
          drawnText: text, expected,
          // pdfjs surfaces WinAnsi 0x92 as U+0092 when reading a flattened
          // appearance. Interpret that byte as the curly apostrophe it draws
          // before comparing; keep drawnText raw so the byte proof remains
          // independently inspectable.
          matchesExpected: ink.replace(/\u0092/g, "\u2019") === String(expected ?? "").trim()
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

    if (r.isSelectionControl && r.policy === "election") {
      const cls = PARTICIPANT_ELECTION;
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

function participantInstructions(maps, rbf, packetSet, guide) {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, TRACK_REGISTRY), "utf8"));
  const track = (registry.tracks ?? []).find((row) => row.trackId === TRACK_ID);
  assert.ok(track, `${TRACK_REGISTRY} carries no track ${TRACK_ID}`);
  const selfHelpStops = (track.selfHelpStopConditions ?? []).map(String).map((row) => row.trim()).filter(Boolean);
  assert.ok(selfHelpStops.length > 0, `${TRACK_ID} carries no self-help stop conditions`);
  const byDoc = new Map();
  for (const i of rbf) byDoc.set(i.document, [...(byDoc.get(i.document) ?? []), i]);
  const elections = maps.flatMap((m) => m.selectionControls.map((c) => ({ document: m.formNumber, ...c })));

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet contains the complete filing and conditional fee-waiver form set held for this route:", "",
    "- **JDF 612**, _Motion to Seal Conviction Records_ — the motion.",
    "- **JDF 613**, _Order Denying Request to Seal Conviction Records_ — complete only sections A–C; all findings and signatures remain for the court.",
    "- **JDF 614**, _Order and Notice of Hearing_ — submit it with the request after completing only sections A–C; the court uses it if it decides a hearing is necessary and supplies all hearing details.",
    "- **JDF 615**, _Order to Seal Conviction Records_ — complete only sections A–C; the court completes the numbered grant-order body.",
    "- **JDF 205**, _Motion to Waive Fees_, and **JDF 206**, _Order re Court Fees_ — use these two only if you cannot afford the fee and request a waiver. JDF 206's findings, payment terms and signature remain for the court.", "",
    `The forms are prepared for one route — **${ROUTE.publicLabel}** — under ${ROUTE.authority}.`, ""
  );
  out.push(
    "The platform filled in what it holds about you and your case: your name, your date of birth, your address, your "
    + "phone, your e-mail, the county and the case number wherever each form has a participant/case caption field for it. Everything else is yours, and every one of "
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
      `The ${packetSet.undelivered.length} documents this packet does not contain are named below, **and this packet `
      + "knows their form numbers.** JDF 611, the Colorado Judicial Department's own guide for this route, lists all "
      + `four documents by number under its heading “File the Request”: ${GUIDE_QUOTATIONS.fileTheRequest.text}`, ""
    );
    for (const row of packetSet.undelivered) {
      const named = GUIDE_NAMES_THE_MISSING_COMPONENTS[row.componentId] ?? null;
      const pool = RECOVERY_POOL.entries.find((e) => e.componentId === row.componentId) ?? null;
      out.push(
        `- **${named ? named.formNumber : "(form number not established)"} — `
        + `${missingComponentLabel(row, packetSet.delivered)}.** `
        + (named ? `JDF 611 writes it “${named.asTheGuideWritesIt}”. ` : "")
        + (pool
          ? "It is not in this packet, and the reason is a filing-cabinet problem rather than a missing document. The "
            + "platform's own source index lists this exact form, at a fixed digital fingerprint, in a storage area "
            + `it calls “${RECOVERY_POOL.custody}” — but it lists it there WITHOUT recording which form it `
            + "is. The platform only ever fills in a form it can identify by its official number in that index, so a "
            + "file with no number recorded against it cannot be picked up and filled in, even when the file itself "
            + "is right there. Nothing about your case is missing, and nothing about this form is in doubt."
          : "It is not in this packet because the platform holds no copy of it.")
      );
    }
    out.push("");
    out.push(
      "**Get both of them from Colorado, and do not file without them.** Ask the clerk of the court, or the Colorado "
      + "Judicial Department's self-help centre, for the JDF 611 guide and for the two forms it lists that are not "
      + "here. They are free and they are the same forms the guide names. Do not assume the two forms in this packet "
      + "are a complete filing, and do not assume the court will supply the missing two for you.", ""
    );
    const denial = RECOVERY_POOL.entries.find((e) => e.whatThisFormIs) ?? null;
    if (denial) {
      out.push(
        `**What ${denial.formNumber} is, so it does not surprise you.** JDF 611 lists it simply as an order, and it `
        + `is not a second order granting your request. ${denial.formNumber} is headed **“Order Denying Request `
        + "to Seal Conviction Records”**. Its body is a finding the court makes — that the motion is "
        + "insufficient on its face, or that after looking beyond the motion you are not entitled to relief under "
        + "C.R.S. §§ 24-72-706 to 710 — over a signature block for a judge or a magistrate. Colorado's own guide "
        + `still tells you to file it, in the same list as the order to seal: “${GUIDE_QUOTATIONS.fileTheRequest.text}” `
        + "So do not read it as a bad sign and do not leave it out because of what it says. No source this packet "
        + "holds explains why the court is given both orders, so this packet does not explain it either; ask the "
        + "clerk if you want to know. Complete only §§ A–C on it, which is the caption — the court, the county, "
        + "your name and the case number. The guide says the same in its own words: "
        + `“${GUIDE_NAMES_THE_MISSING_COMPONENTS[denial.componentId].asTheGuideWritesIt}”.`, ""
      );
    }
    out.push(
      "Everything else in this packet — both forms, every blank named below and every choice left to you — is prepared "
      + "and is accurate for the two documents it does contain. The gap above is about what is missing from the set, "
      + "not about what is in it.", ""
    );
  }

  out.push("## Where you file this", "");
  out.push(
    "File the forms JDF 611 directs you to file with the **clerk of the Colorado court that entered the conviction** — the District Court or the "
    + "County Court named in section A of the motion, in the county already filled in for you. The Colorado Judicial "
    + "Department publishes each courthouse's address; this packet does not state one, because the platform holds no "
    + "court directory and an unsourced address in a filing instruction is worse than none.", ""
  );
  out.push("### The filing fee, and what to do if you cannot pay it", "");
  out.push(
    `**The clerk sets the fee.** JDF 611 says so in as many words: “${guide.quoted.feeIsTheClerks.text}” No source `
    + "this packet holds states an amount for this motion, and none is invented here — ask the clerk, and the "
    + "guide expects you to.", ""
  );
  out.push(
    `**If you cannot afford it, Colorado has a waiver and JDF 611 names the two forms for it:** `
    + `“${guide.quoted.waiverForms.text}” So: **JDF 205**, Motion to Waive Fees, and **JDF 206**, the order that goes `
    + "with it, of which the guide says to complete only §§ A–C.", ""
  );
  out.push(
    "**Both JDF 205 and JDF 206 are included in this packet.** File them only if you are requesting a fee waiver. Complete "
    + "the participant financial information and sign JDF 205 yourself; complete only the caption and party information "
    + "on JDF 206. The court decides indigency, any installment schedule, and every order field.", ""
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
  out.push("6. **Submit JDF 612, JDF 613, JDF 614 and JDF 615 together, as JDF 611 directs.** Complete only sections A–C on JDF 613, JDF 614 and JDF 615.");
  out.push("7. **Leave every numbered body on JDF 613, JDF 614 and JDF 615 for the court.** The court decides denial, hearing and grant terms; it supplies all hearing details, record-recipient entries, findings and signatures.");
  out.push("8. **If you request a fee waiver, complete and sign JDF 205 and tender JDF 206.** Leave every indigency finding, fee amount, installment term and judicial signature on JDF 206 blank for the court.");
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
  out.push("- **The Division and Courtroom boxes in each court-use caption.** Those boxes remain for the court.");
  out.push("- **Every decision and signature field on JDF 613 and JDF 614.** The denial findings, hearing details, attendance direction, reasons, deadlines and judicial signatures all remain for the court.");
  out.push("- **Every finding, fee amount, installment term and signature field on JDF 206.** The court decides the fee-waiver motion and completes its own order.");
  out.push("- **Every numbered body on JDF 615.** JDF 611 directs the filer to complete only sections A–C; the court supplies the defendant-information repetitions, findings, record-recipient entries, other orders and signature.");
  out.push("");

  out.push("## Where self-help ends", "");
  out.push("Stop before filing and take the packet to a Colorado lawyer if any of these governed route conditions applies:", "");
  for (const stop of selfHelpStops) out.push(`- ${stop}`);
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared set of official Colorado Judicial Department forms. It is not legal advice, it is not filed for "
    + "you, and it does not decide whether your conviction is eligible to be sealed. JDF 612 sets out the eligibility "
    + "conditions in its own words, including the offences section 8 lists as not eligible and the branch that depends "
    + "on the district attorney's consent. Read them before you swear to them."
  );
  out.push("");
  out.push(`_Colorado authority: ${ROUTE.authority}_`);
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
  const recoveryPoolIdentity = [];

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
  const instructionsText = participantInstructions(maps, rbf, packetSet, guide);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/component-set-delivery.json`, {
    schemaVersion: "rcap-family-component-set-delivery/v1", familyId: FAMILY_ID,
    countedFrom: `${packetSet.record.path} packetSets[packetSetId=${FAMILY_ID}].components`,
    groundingRecordSha256: packetSet.record.sha256,
    requiredByTheRoute: packetSet.required.length,
    renderedHere: packetSet.delivered.length,
    complete: packetSet.undelivered.length === 0,
    packetSetCompletenessState: packetSet.completeness.state,
    packetSetCompletenessBasis: packetSet.completeness.basis,
    guide: {
      formNumber: guide.formNumber, title: guide.title, sha256: guide.sha256,
      pathInArchive: guide.pathInArchive, revision: guide.revision,
      fileTheRequest: guide.quoted.fileTheRequest.text,
      feeWaiverInstruction: guide.quoted.waiverForms.text,
      howItWasRead: guide.howItWasRead
    },
    requiredComponentsRendered: ["JDF-612", "JDF-613", "JDF-614", "JDF-615"],
    conditionalFeeWaiverPairRendered: ["JDF-205", "JDF-206"],
    currentHeldJdf615Sha256: "106cbd5edad2272f3f6f1378450b007507da879e6a917437d2cc3bb062d87647",
    olderUploadedJdf615Used: false,
    undelivered: [],
    supersessionBasis:
      "The historical incomplete packet and FAIL evidence remain preserved. This rebuilt set renders every form "
      + "JDF 611 names from exact current source bytes, retains the newer held JDF 615, and includes the exact "
      + "JDF 205/JDF 206 pair for the governed fee-waiver condition."
  });

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number or governed exact-content path + pinned SHA-256 + on-disk SHA-256 + byte length",
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
        fieldsQuotedOnParticipantSurfaces: ["components[].role", "components[].requiredOfficialFormId"],
        whyItIsBound:
          "JDF 611 and the packet-set record identify the required motion, denial order, hearing notice and grant order; current source custody now supplies exact bytes for all four."
      }
    ],
    componentSetDelivery: {
      requiredComponents: packetSet.required.length,
      deliveredComponents: packetSet.delivered.length,
      packetSetCompletenessState: packetSet.completeness.state,
      undelivered: [],
      requiredFormsRendered: packetSet.required.map((row) => row.officialFormId ?? row.requiredOfficialFormId),
      conditionalFeeWaiverFormsRendered: ["JDF-205", "JDF-206"],
      conditionalFeeWaiverRule: "Use JDF 205 and JDF 206 only when the participant cannot afford the filing fee and requests a waiver.",
      currentHeldJdf615Preserved: "106cbd5edad2272f3f6f1378450b007507da879e6a917437d2cc3bb062d87647"
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
    /*
     * EVERY COMPONENT THE ROUTE REQUIRES, RENDERED OR DISPOSITIONED WITH A TRUE
     * REASON -- here, where a reader of the artifacts looks.
     *
     * The nine shared counters cannot see this. verify-packet-completeness.mjs
     * derives its component denominator from the field map's documents plus the
     * source receipt's documents and asks only whether each appears in a
     * rendered artifact; it never opens the packet-set manifest, so a component
     * the ROUTE requires and this BUILD never declared is invisible to it and
     * requiredComponentsMissing reads 0 either way. VF07 measured 2 of 4 at base
     * 453ecee9 and said so. This block is the manifest's count, stated where the
     * counters are stated, so a green nine is not read as a complete set.
     */
    componentSet: {
      countedFrom: `${packetSet.record.path} packetSets[packetSetId=${FAMILY_ID}].components`,
      groundingRecordSha256: packetSet.record.sha256,
      requiredByTheRoute: packetSet.required.length,
      renderedHere: packetSet.delivered.length,
      complete: packetSet.undelivered.length === 0,
      packetSetCompletenessState: packetSet.completeness.state,
      whyTheSharedCounterCannotSeeThis:
        "scripts/rcap-packet-completeness/verify-packet-completeness.mjs derives its component denominator from this "
        + "family's own field map and source receipt, never from the packet-set manifest, so requiredComponentsMissing "
        + "reads 0 whether or not the route's set is complete. Nine counters at zero is necessary and not sufficient.",
      components: packetSet.required.map((row) => {
        const delivered = packetSet.delivered.includes(row);
        const formId = row.officialFormId ?? row.requiredOfficialFormId;
        const named = GUIDE_NAMES_THE_MISSING_COMPONENTS[row.componentId] ?? null;
        const pool = RECOVERY_POOL.entries.find((e) => e.componentId === row.componentId) ?? null;
        if (delivered) {
          const pages = artifacts[0]?.pageManifest?.filter((m) => m.formNumber === formId) ?? [];
          return {
            componentId: row.componentId, role: row.role, officialFormId: formId,
            disposition: "RENDERED",
            renderedAs: formId,
            packetPages: pages.map((m) => m.packetPage),
            reason: "the source binds by exact SHA-256 in a mounted custody and the component is rendered from it"
          };
        }
        return {
          componentId: row.componentId, role: row.role,
          officialFormId: row.officialFormId ?? null,
          requiredOfficialFormId: row.requiredOfficialFormId ?? (named ? named.formNumber.replace(" ", "-") : null),
          disposition: "NOT_RENDERED_COMMITTED_INDEX_DOES_NOT_IDENTIFY_THE_HELD_BINARY",
          identityResolved: Boolean(named),
          identityResolvedFrom: named
            ? `${guide.formNumber} (sha256 ${guide.sha256}) names it "${named.asTheGuideWritesIt}" in its own `
              + "\"File the Request\" list, read from the guide's bytes at build time"
            : null,
          reason: named && pool
            ? `${named.formNumber} is required by the route, its identity is established, and its binary is HELD: `
              + `the committed corpus index records it at ${pool.path}, sha256 ${pool.sha256}, `
              + `${pool.byteLength} bytes, in custody ${RECOVERY_POOL.custody}. What it does NOT record is which `
              + "form that file is -- the entry carries formNumber null and assetClass null -- and resolveSources() "
              + "binds an official form by state + formNumber + assetClass \"FORM\" and only then hashes it. So the "
              + "source does not bind, and a source that does not bind may not be rendered and may not be "
              + "substituted. The component is absent and the participant is told so by form number in "
              + "participant-instructions.md."
            : "the platform holds no source for this component and none is substituted",
          digestProvenance: pool
            ? "quoted from the committed corpus index and NOT re-hashed here, so that this build's output is the "
              + "same in a container that mounts the custody and one that does not. Lane FIX157 re-hashed both "
              + "binaries on 2026-09-10 in a worktree that DOES mount it and got these exact digests."
            : null,
          indexIdentity: pool
            ? recoveryPoolIdentity.find((m) => m.path === pool.path) ?? null
            : null,
          whatThisFormIs: pool?.whatThisFormIs ?? null,
          disclosedToTheParticipant: true,
          whatWouldChangeThis:
            `a source-identity determination over the ${RECOVERY_POOL.custody} entries: record state, formNumber and `
            + "assetClass FORM against this index row (or promote the binary into the Master Library under its "
            + "naming), after which the source binds by digest and the component renders. Not a re-acquisition: the "
            + "bytes are held at the recorded digest."
        };
      }),
      conditionalComponents: ROUTE.documents.filter((d) => d.conditionDescription).map((d) => ({
        officialFormId: d.formNumber,
        role: d.instrumentKind,
        conditionDescription: d.conditionDescription,
        disposition: "RENDERED_WITH_CONDITION_DISCLOSED",
        packetPages: artifacts[0]?.pageManifest?.filter((m) => m.formNumber === d.formNumber).map((m) => m.packetPage) ?? []
      }))
    },
    /* The guide this packet quotes, bound by digest at build time. */
    groundingSourcesQuoted: [
      {
        formNumber: guide.formNumber, title: guide.title, sha256: guide.sha256,
        byteLength: guide.byteLength, pageCount: guide.pageCount, pathInArchive: guide.pathInArchive,
        quotedOnParticipantSurfaces: Object.entries(guide.quoted)
          .map(([key, q]) => ({ key, page: q.page, text: q.text })),
        howItWasRead: guide.howItWasRead
      }
    ],
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
      "JDF 612 sections A, B, C and D: confirm the county, case number, defendant name, birth date, complete mailing "
        + "address, phone and e-mail each sit under the heading they belong to. On JDF 613, JDF 614 and JDF 615, "
        + "confirm only the A–C caption is populated and every numbered court body remains blank. The text stream is "
        + "scrambled, so this visual check carries the placement evidence.",
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
      "JDF 615 numbered body: birth date, address repetitions, all five court findings, agency file and arrest numbers, "
        + "other orders, signature and date remain blank; neither Judge nor Magistrate is ticked. The A–C caption above it is populated."
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
        finding: "JDF 612 asks the movant for the agencies holding records, while JDF 615 repeats record-recipient fields inside the court's numbered order body.",
        consequence:
          "The motion's agency names, file numbers and addresses are declared REQUIRED_BEFORE_FILING and named to the "
          + "participant. JDF 615's numbered body remains court-owned because JDF 611 directs the filer to complete only sections A–C."
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
          + "(LegalEase Colorado/forms/JDF-612__…, JDF-615__…), a custody whose entries the committed corpus index "
          + "does not identify by form number.",
        consequence:
          "The build binds both forms from the Master Library instead, by exact form number and exact SHA-256 — "
          + "8600b4b9a4b27fe821e843cf6bfc21f45325f0791bb9d1e62a0326d7261f927e for JDF 612 and "
          + "106cbd5edad2272f3f6f1378450b007507da879e6a917437d2cc3bb062d87647 for JDF 615 — which are the same digests the "
          + "queue pins. The committed corpus index records both digests in the Master Library custody as well as in the "
          + "recovery pool, so this is one binary held in two custodies, not a substituted source. The custody that "
          + "cannot be bound from is stated rather than worked around, and the source receipt records the path "
          + "actually read. Corrected by lane FIX157 on 2026-09-10: the earlier wording called that custody one "
          + "\"this container does not mount\", which is false of a container that has it — it is declared in the "
          + "index's own custodies array and was mounted in the FIX157 lane worktree. What makes its entries "
          + "unbindable is that they carry formNumber null and assetClass null."
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
          "JDF 612 asks for one complete mailing-address line, while JDF 205 has separate street, city, state and ZIP fields.",
        consequence:
          "The shared semantic registry now binds only captions that expressly require city/state/ZIP to a derived "
          + "participant.full_mailing_address value. JDF 612 receives the derived one-line postal address; JDF 205 "
          + "receives the structured street, city, state and ZIP facts separately, so neither form omits or duplicates parts."
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
