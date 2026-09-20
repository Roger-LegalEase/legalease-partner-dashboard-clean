#!/usr/bin/env node
/**
 * The shared District of Columbia Chapter-8 custom-pleading host, and the
 * dc_seal_nonconviction-set family entry point.
 *
 *   node scripts/build-census-v1-dc_seal_nonconviction-set.mjs [--check] [--no-raster]
 *
 * This family-named module contains the bounded shared engine for the five
 * DC record-relief motion families dispatched to lane PF01 as custom_pleading
 * builds (the east-host pattern: the engine lives in one family's script and
 * the sibling entry points import runFamilyById):
 *
 *   dc_seal_nonconviction-set          Motion to seal a non-conviction record,
 *                                      D.C. Code § 16-806(a)(1)
 *   dc_seal_conviction-set             Motion to seal a conviction record,
 *                                      D.C. Code § 16-806(a)(3) — two statutory
 *                                      routes, misdemeanor 5-year and felony
 *                                      8-year, each rendered as its own fixture
 *                                      pair stating its route
 *   dc_seal_fugitive-set               Motion to seal a fugitive-from-justice
 *                                      arrest record, D.C. Code § 16-806(a)(2)
 *   dc_innocence_expungement-set       Motion for expungement on grounds of
 *                                      actual innocence, D.C. Code § 16-803
 *   dc_correct_misattributed_arrest-set Motion to correct a misattributed
 *                                      arrest record, D.C. Code § 16-806(g)
 *
 * THE SOURCE DETERMINATION, READ FROM THE RECORDS AND THE FACE
 *
 * Every MASTER_QUEUE row for these five families binds NO document source:
 * sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily NONE,
 * forms []. The legal-design intake record
 * (data/record-clearing/legal-design-intake/DC.memo.json, all five tracks,
 * reviewed as of 2026-07-30) says why in terms: "No official form exists. The
 * statute fixes the content of the motion." The packet-set manifests
 * (data/record-clearing/legal-design-packet-set-manifests.json) name one
 * required component per family, a custom_pleading primary filing, and every
 * track's legalDesignDecision is legal_design_approved_with_limitations.
 *
 * The Master Library holds exactly one DC document: the Superior Court
 * Criminal Division instruction sheet "How to Seal or Expunge Your Criminal
 * Record", Rev. April 10, 2024 — the same document every track memo cites as
 * its official source. This host binds it byte-exact as the families' shared
 * REFERENCE INSTRUMENT: its verified face grounds the filing-channel steps
 * (the MPD arrest-history appointment line, the disposition-request address,
 * the Seal Team intake mailbox that assigns the motion a case number, the
 * up-to-six-months expectation, and the five help organizations). It is NOT
 * included in any rendered packet.
 *
 * A SOURCE-FIDELITY FINDING, RECORDED RATHER THAN REPEATED: the intake memos
 * state "The court's instruction sheet states no fee." The pinned sheet's own
 * face states nothing about fees at all. This host follows the face: no packet
 * asserts that filing is free; the fee and fee-waiver questions are delegated
 * to the Criminal Division clerk's office by name and number, both printed on
 * the pinned face.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT CARRIES
 *
 * The platform holds the participant's own identity and contact facts, and it
 * writes only those — plus, on the conviction family alone, the offense-level
 * statement the statutory route determines. Every case fact — case number,
 * charge, statute section, disposition, sentence-completion date, the
 * movant's record history, every narrative — belongs to records the platform
 * has not seen, so each is a labelled dotted blank, declared
 * REQUIRED_BEFORE_FILING and disclosed by its printed label in
 * participant-instructions.md, with a named checkable authority (the
 * Criminal Division clerk's office and the Seal Team mailbox, from the pinned
 * face) for everything no held source answers. No signature, no signature
 * date, no case number of the motion itself, no judicial, clerk or court-date
 * field is ever written.
 *
 * Rasterization, when not skipped, goes through
 * scripts/raster/pdf-page-raster.mjs (Chromium, calibrated). Never Poppler.
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
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

/* The one DC document the Master Library holds, bound as the shared reference
 * instrument for all five families and included in none of their packets. */
const REFERENCE_FORM = "DC-HOW-TO-SEAL-OR-EXPUNGE-YOUR-CRIMINAL-RECOR";
const REFERENCE_FORM_TITLE =
  "Superior Court of the District of Columbia, Criminal Division - How to Seal or Expunge Your Criminal Record (Rev. April 10, 2024)";
const PINNED_SHA256 = "310381f170d1875ef7a40e9e71c8653c1ea5c847628a6c718ea9016c0e312712";

/* Each anchor is a fact a composed page RELIES ON, verified from the pinned
 * bytes on every build. The build refuses if any is no longer printed. */
const FACE_ANCHORS = [
  "How to Seal or Expunge Your Criminal Record",
  "Criminal Division",
  "500 Indiana Ave",
  "(202) 727-4245",
  "Metropolitan Police",
  "arrest history report",
  "criminalcustomerservice@dcsc.gov",
  "Room",
  "4001",
  "criminalmotionsealteam@dcsc.gov",
  "The Seal",
  "case number and assign it to a judge",
  "up to six months",
  "Christian Legal Society",
  "Legal Aid DC",
  "Neighborhood Legal",
  "Public Defender Service",
  "Rising for Justice",
  "Rev. April 10, 2024"
];

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

const COMPONENTS = ["primary_filing", "prosecutor_service", "filing_instructions"];

/* ---- fixtures -------------------------------------------------------------- *
 * Two participants. The boundary one carries a long hyphenated name with an
 * apostrophe, a long one-line mailing address, a long email and a phone
 * extension, because a value that fits the line is not evidence that every
 * value does. No case fact is held for any of the five families: every case
 * lives on records the platform has not seen.
 */
const PEOPLE = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "1400 Girard Street NW, Apartment 3, Washington, DC 20009",
    "participant.phone": "202-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "4501 Benning Ridge Crossing Road SE, Apartment 14B, Washington, District of Columbia 20019-2214",
    "participant.phone": "(202) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

/* ---- the five families ------------------------------------------------------ */

const HELP_ORGS = [
  "Christian Legal Society - 202-710-0592",
  "Legal Aid DC - 202-628-1161",
  "Neighborhood Legal Services Program - 202-832-6577",
  "Public Defender Service (ask for the Duty Day Attorney for Seal cases) - 202-824-2801",
  "Rising for Justice - 202-638-4798"
];

const CLERK_AUTHORITY =
  "the Criminal Division clerk's office, 500 Indiana Avenue NW, Room 4001, Washington, DC (202-879-1373), or the Seal Team at criminalmotionsealteam@dcsc.gov";

const FAMILIES = {
  "dc_seal_nonconviction-set": {
    familyId: "dc_seal_nonconviction-set",
    out: "data/rcap-all50/overlays/census-v1/dc/dc-seal-nonconviction-set--custom-pleading",
    buildScript: "scripts/build-census-v1-dc_seal_nonconviction-set.mjs",
    jurisdiction: "DC",
    statute: "D.C. Code § 16-806(a)(1)",
    legalName: "Motion to Seal a Non-Conviction Record, D.C. Code § 16-806(a)(1)",
    routeName: "sealing a District of Columbia non-conviction record by motion under D.C. Code § 16-806(a)(1)",
    routeSelectionId: "dc-seal-nonconviction-composed-set",
    motionTitle: "MOTION TO SEAL A NON-CONVICTION RECORD UNDER D.C. CODE Sec. 16-806(a)(1)",
    variants: [
      { variantId: "nonconviction", routeKey: "obligation:track-pathway:DC:dc_seal_nonconviction:dc_motion_seal_nonconviction_16_806", routeFacts: {} }
    ],
    kind: "seal_806"
  },
  "dc_seal_conviction-set": {
    familyId: "dc_seal_conviction-set",
    out: "data/rcap-all50/overlays/census-v1/dc/dc-seal-conviction-set--custom-pleading",
    buildScript: "scripts/build-census-v1-dc_seal_conviction-set.mjs",
    jurisdiction: "DC",
    statute: "D.C. Code § 16-806(a)(3)",
    legalName: "Motion to Seal a Conviction Record, D.C. Code § 16-806(a)(3)",
    routeName: "sealing a District of Columbia conviction record by motion under D.C. Code § 16-806(a)(3)",
    routeSelectionId: "dc-seal-conviction-composed-set",
    motionTitle: "MOTION TO SEAL A CONVICTION RECORD UNDER D.C. CODE Sec. 16-806(a)(3)",
    variants: [
      {
        variantId: "misdemeanor_5yr",
        routeKey: "obligation:track-pathway:DC:dc_seal_conviction:dc_motion_seal_misdemeanor_conviction_5yr_16_806",
        routeFacts: {
          "route.offense_level_statement":
            "a misdemeanor conviction, for which D.C. Code Sec. 16-806(a)(3) sets a waiting period of five years from completion of the sentence"
        }
      },
      {
        variantId: "felony_8yr",
        routeKey: "obligation:track-pathway:DC:dc_seal_conviction:dc_motion_seal_felony_conviction_8yr_16_806",
        routeFacts: {
          "route.offense_level_statement":
            "a felony conviction, for which D.C. Code Sec. 16-806(a)(3) sets a waiting period of eight years from completion of the sentence"
        }
      }
    ],
    kind: "seal_806"
  },
  "dc_seal_fugitive-set": {
    familyId: "dc_seal_fugitive-set",
    out: "data/rcap-all50/overlays/census-v1/dc/dc-seal-fugitive-set--custom-pleading",
    buildScript: "scripts/build-census-v1-dc_seal_fugitive-set.mjs",
    jurisdiction: "DC",
    statute: "D.C. Code § 16-806(a)(2)",
    legalName: "Motion to Seal a Fugitive-from-Justice Arrest Record, D.C. Code § 16-806(a)(2)",
    routeName: "sealing a District of Columbia fugitive-from-justice arrest record by motion under D.C. Code § 16-806(a)(2)",
    routeSelectionId: "dc-seal-fugitive-composed-set",
    motionTitle: "MOTION TO SEAL A FUGITIVE-FROM-JUSTICE ARREST RECORD UNDER D.C. CODE Sec. 16-806(a)(2)",
    variants: [
      { variantId: "fugitive", routeKey: "obligation:track-only:DC:dc_seal_fugitive", routeFacts: {} }
    ],
    kind: "seal_806"
  },
  "dc_innocence_expungement-set": {
    familyId: "dc_innocence_expungement-set",
    out: "data/rcap-all50/overlays/census-v1/dc/dc-innocence-expungement-set--custom-pleading",
    buildScript: "scripts/build-census-v1-dc_innocence_expungement-set.mjs",
    jurisdiction: "DC",
    statute: "D.C. Code § 16-803",
    legalName: "Motion for Expungement on Grounds of Actual Innocence, D.C. Code § 16-803",
    routeName: "expunging a District of Columbia record on grounds of actual innocence by motion under D.C. Code § 16-803",
    routeSelectionId: "dc-innocence-expungement-composed-set",
    motionTitle: "MOTION FOR EXPUNGEMENT OF RECORDS ON GROUNDS OF ACTUAL INNOCENCE UNDER D.C. CODE Sec. 16-803",
    variants: [
      { variantId: "innocence", routeKey: "obligation:track-pathway:DC:dc_innocence_expungement:dc_actual_innocence_expungement_16_803", routeFacts: {} }
    ],
    kind: "expunge_803"
  },
  "dc_correct_misattributed_arrest-set": {
    familyId: "dc_correct_misattributed_arrest-set",
    out: "data/rcap-all50/overlays/census-v1/dc/dc-correct-misattributed-arrest-set--custom-pleading",
    buildScript: "scripts/build-census-v1-dc_correct_misattributed_arrest-set.mjs",
    jurisdiction: "DC",
    statute: "D.C. Code § 16-806(g)",
    legalName: "Motion to Correct a Misattributed Arrest Record, D.C. Code § 16-806(g)",
    routeName: "correcting a District of Columbia arrest record wrongly attributed to you, by motion under D.C. Code § 16-806(g)",
    routeSelectionId: "dc-correct-misattributed-arrest-composed-set",
    motionTitle: "MOTION TO CORRECT A MISATTRIBUTED ARREST RECORD UNDER D.C. CODE Sec. 16-806(g)",
    variants: [
      { variantId: "misattributed", routeKey: "obligation:track-only:DC:dc_correct_misattributed_arrest", routeFacts: {} }
    ],
    kind: "correct_806g"
  }
};

const COMPOSED_TITLES = {
  primary_filing: "the composed motion (the primary filing)",
  prosecutor_service: "Copy for the Prosecuting Office",
  filing_instructions: "Filing Instructions"
};

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

/* ---- source binding ---------------------------------------------------------- */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const formNumber of [REFERENCE_FORM]) {
    const entry = all.find((e) => e.state === "DC" && e.formNumber === formNumber);
    if (!entry) { failures.push({ sourceId: `official-instructions:${formNumber}`, why: "no entry for this document in the committed corpus index" }); continue; }
    const rel = entry.path;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceId: `official-instructions:${formNumber}`, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (String(entry.sha256 ?? "") !== sha256) {
      failures.push({ sourceId: `official-instructions:${formNumber}`, pathInArchive: rel, why: `SHA-256 drift: the committed index says ${entry.sha256}, the mounted corpus holds ${sha256}` });
      continue;
    }
    if (sha256 !== PINNED_SHA256) {
      failures.push({ sourceId: `official-instructions:${formNumber}`, pathInArchive: rel, why: `SHA-256 drift against this host's pin: the host pins ${PINNED_SHA256}, the corpus holds ${sha256}` });
      continue;
    }
    resolved.push({
      formNumber, sourceId: `source-sha256:${sha256}`, pathInArchive: rel,
      title: REFERENCE_FORM_TITLE, instrumentKind: "bound_reference_instrument",
      revision: entry.revision ?? null, sha256, byteLength: bytes.length, bytes,
      pageCount: entry.pageCount ?? null
    });
  }
  return { resolved, failures };
}

async function readFace(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const lines = [];
  for (const page of doc.getPages()) {
    for (const l of groupIntoLines(extractTextItems(page))) lines.push(l.text);
  }
  const flatText = lines.join("\n");
  const missing = FACE_ANCHORS.filter((a) => !flatText.includes(a));
  return { flatText, missing };
}

/* ---- composed documents ------------------------------------------------------- *
 * Everything below is traceable to one of three records, named inline:
 *   [MEMO]     data/record-clearing/legal-design-intake/DC.memo.json, the
 *              family's own track (reviewed at source 2026-07-30)
 *   [MANIFEST] data/record-clearing/legal-design-packet-set-manifests.json,
 *              the family's own packetSetId
 *   [FACE]     the pinned instruction sheet's own printed face
 * Nothing else is stated: no service mechanics, no fee figure, no caption
 * practice and no eligibility answer is invented. Where no record answers, the
 * page says so and names the clerk.
 */
const DOTS = (n = 84) => ".".repeat(n);

function captionBlock(L, name, roleTitle) {
  L.push("SUPERIOR COURT OF THE DISTRICT OF COLUMBIA");
  L.push("CRIMINAL DIVISION", "");
  L.push(`IN THE MATTER OF THE MOTION OF ${name}, ${roleTitle}`, "");
  L.push("Case number of the case this motion addresses (copy it exactly from the court record):");
  L.push(DOTS(), "");
  L.push("Motion case number: " + DOTS(34) + "  (the Seal Team assigns it at filing)", "");
}

function contactBlock(L, facts, attestation = false) {
  const name = facts["participant.full_legal_name"];
  if (attestation) {
    L.push("SWORN ATTESTATION OF MISIDENTIFICATION", "");
    L.push(`The movant, ${name}, attests under oath that the movant was incorrectly identified or named in the arrest record described above, that as far as the movant knows the arresting agency took no fingerprints at that arrest, and that as far as the movant knows the person arrested presented no other reliable identification. The attestation is sworn when the movant signs below; nothing on this page is sworn, signed or dated for the movant.`, "");
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF MOVANT, SWORN UNDER OATH " + DOTS(24), "");
    L.push("(No held source states whether a notary or other officer must administer this oath in addition to the sworn attestation itself. Before filing, ask " + CLERK_AUTHORITY + " what oath formality the Criminal Division requires, and complete exactly that.)", "");
  } else {
    L.push("DATE " + DOTS(30) + "   SIGNATURE OF MOVANT " + DOTS(42), "");
    L.push("(The movant signs and dates this motion personally. Nothing on this page is signed or dated for the movant.)", "");
  }
  L.push(`PRINTED NAME: ${name}`);
  L.push(`MAILING ADDRESS: ${facts["participant.street_address"]}`);
  L.push(`TELEPHONE: ${facts["participant.phone"]}`);
  L.push(`EMAIL: ${facts["participant.email"]}`);
}

function historyAndScopeParagraphs(L, startNo) {
  let n = startNo;
  L.push(`${n}. As D.C. Code Sec. 16-806(c)(1) requires, the movant states every citation, arrest, charge and conviction of the movant that has not already been sealed or expunged, as reasonably known to the movant (add pages if needed; write NONE OTHER if there are none):`);
  L.push(DOTS());
  L.push(DOTS());
  L.push(DOTS(), "");
  n += 1;
  L.push(`${n}. The records the movant asks the Court to seal are the following (D.C. Code Sec. 16-806(h): the movant need not seek relief for every eligible record):`);
  L.push(DOTS());
  L.push(DOTS(), "");
  n += 1;
  L.push(`${n}. Sealing is in the interests of justice. In weighing this motion the Court considers the movant's interest in sealing, the community's interest in the movant's rehabilitation and reintegration, and the community's interest in retaining access to the record. The movant's own statement of why sealing this record is in the interests of justice, in the movant's own words (state only facts; this packet writes none of these lines for you):`);
  L.push(DOTS());
  L.push(DOTS());
  L.push(DOTS(), "");
  return n + 1;
}

function primaryFilingBody(fam, variant, facts) {
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const L = [];
  captionBlock(L, name, "MOVANT");
  L.push(fam.motionTitle, "");

  if (fam.familyId === "dc_seal_nonconviction-set") {
    L.push(`1. The movant, ${name}, date of birth ${dob}, moves this Court under D.C. Code Sec. 16-806(a)(1) to seal the record of the case identified in the caption above.`, "");
    L.push("2. Grounds for eligibility: the case was terminated by the prosecutor or reached a final disposition, did not result in a conviction, and did not result in an acquittal by reason of insanity under D.C. Code Sec. 24-501. The movant states the case facts from the court record:", "");
    L.push("Charge in the case to be sealed, worded exactly as the court record words it:");
    L.push(DOTS(), "");
    L.push("Statute section of the offence charged, copied from the court record:");
    L.push(DOTS(), "");
    L.push("Disposition of the case - how it ended, and the date of final disposition:");
    L.push(DOTS(), "");
    const next = historyAndScopeParagraphs(L, 3);
    L.push(`${next}. Prior sealing motions the movant has filed under this chapter, and when each was resolved (write NONE if none):`);
    L.push(DOTS(), "");
    L.push(`${next + 1}. The movant therefore asks the Court to seal the records relating to the case identified above, pursuant to D.C. Code Sec. 16-806.`, "");
    L.push("NOTE PRINTED FOR THE MOVANT, FROM THE RECORDED RULE: if the offence in this case is NOT on the D.C. Code Sec. 16-805(b) list, this motion must be filed BEFORE OCTOBER 1, 2027. If the offence is on that list, there is no deadline. If you do not know whether your offence is on that list, ask " + CLERK_AUTHORITY + ", or one of the legal-help organizations named in the filing instructions, before filing.", "");
  } else if (fam.familyId === "dc_seal_conviction-set") {
    L.push(`1. The movant, ${name}, date of birth ${dob}, moves this Court under D.C. Code Sec. 16-806(a)(3) to seal the record of the conviction identified in the caption above.`, "");
    L.push(`2. This motion concerns ${facts["route.offense_level_statement"]}. Under D.C. Code Sec. 16-801(2), completion of the sentence is unconditional discharge from incarceration, commitment, probation, parole, or supervised release, whichever is latest, and nonpayment of fines, restitution, or other monetary assessments does not prevent completion. The movant states the case facts from the court record:`, "");
    L.push("Offence of conviction, worded exactly as the court record words it:");
    L.push(DOTS(), "");
    L.push("Statute section of the offence of conviction, copied from the court record:");
    L.push(DOTS(), "");
    L.push("Date the movant completed the sentence - the latest of discharge from incarceration, commitment, probation, parole or supervised release:");
    L.push(DOTS(), "");
    const next = historyAndScopeParagraphs(L, 3);
    L.push(`${next}. Prior sealing motions the movant has filed under this chapter, and when each was resolved (write NONE if none):`);
    L.push(DOTS(), "");
    L.push(`${next + 1}. The waiting period stated above has run since completion of the sentence. The movant therefore asks the Court to seal the records relating to the conviction identified above, pursuant to D.C. Code Sec. 16-806.`, "");
    if (variant.variantId === "felony_8yr") {
      L.push("NOTE PRINTED FOR THE MOVANT, FROM THE RECORDED RULE: a felony in Offense Severity Group 1, 2, or 3 of the D.C. Sentencing Commission Master Grid as of March 10, 2023 is NOT eligible for sealing on this route. If you cannot establish your felony's Offense Severity Group from the record, stop and take this packet to one of the legal-help organizations named in the filing instructions before filing.", "");
    }
    L.push("NOTE PRINTED FOR THE MOVANT, FROM THE RECORDED RULE: if the waiting period has not yet run, only the prosecutor's written waiver under D.C. Code Sec. 16-806(e) can shorten it. Needing that waiver is a stop-and-get-help situation, not a blank to fill.", "");
  } else if (fam.familyId === "dc_seal_fugitive-set") {
    L.push(`1. The movant, ${name}, date of birth ${dob}, moves this Court under D.C. Code Sec. 16-806(a)(2) to seal the record of the fugitive-from-justice arrest identified in the caption above.`, "");
    L.push("2. Grounds for eligibility: the movant was arrested in the District of Columbia as a fugitive from justice; the movant waived extradition under D.C. Code Sec. 23-702(f)(1) and was released or detained under Sec. 23-702(f)(2) or (f)(3); the fugitive case reached final disposition; and the movant has appeared before the proper official in the jurisdiction that sought the movant. If any one of those is not true of you, this route is not yours - stop before filing. The movant states the case facts from the records:", "");
    L.push("Jurisdiction that sought the movant - the state or place whose warrant led to the arrest:");
    L.push(DOTS(), "");
    L.push("Date the movant waived extradition under D.C. Code Sec. 23-702(f)(1), if known:");
    L.push(DOTS(), "");
    L.push("Final disposition of the fugitive case, and the date of that disposition:");
    L.push(DOTS(), "");
    L.push("Date and place of the movant's appearance before the proper official in the jurisdiction that sought the movant:");
    L.push(DOTS(), "");
    L.push("Proof of that appearance, attached to this motion (name the document you attach - obtain it from the court or official in the originating jurisdiction):");
    L.push(DOTS(), "");
    const next = historyAndScopeParagraphs(L, 3);
    L.push(`${next}. The movant therefore asks the Court to seal the records relating to the fugitive-from-justice arrest identified above, pursuant to D.C. Code Sec. 16-806.`, "");
  } else if (fam.familyId === "dc_innocence_expungement-set") {
    L.push(`1. The movant, ${name}, date of birth ${dob}, moves this Court under D.C. Code Sec. 16-803 to expunge the record of the case identified in the caption above, on grounds of actual innocence.`, "");
    L.push("2. Grounds for eligibility: the case was terminated by the prosecutor or reached a final disposition, did not result in a conviction, and did not result in an acquittal by reason of insanity under D.C. Code Sec. 24-501. The movant asserts, and will demonstrate by a preponderance of the evidence, that the offence did not occur or was not committed by the movant. The movant states the case facts from the court record:", "");
    L.push("What the movant was charged with, worded exactly as the court record words it:");
    L.push(DOTS(), "");
    L.push("Disposition of the case - how it ended, and the date of final disposition:");
    L.push(DOTS(), "");
    L.push("3. The movant's own statement of why the offence did not occur, or why the movant was not the person who committed it, in the movant's own words (state only facts you know first-hand; this packet writes none of these lines for you):");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("4. Statement of points and authorities, exhibits, affidavits and supporting documents attached to the motion (list what you attach; the movant carries the burden and supplies the supporting material):");
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("5. Prior expungement motions like this one the movant has filed, and when each was resolved (write NONE if none):");
    L.push(DOTS(), "");
    L.push("6. The movant therefore asks the Court to expunge the records relating to the case identified above, pursuant to D.C. Code Sec. 16-803.", "");
  } else {
    L.push(`1. The movant, ${name}, date of birth ${dob}, moves this Court under D.C. Code Sec. 16-806(g) to correct the publicly available records of the arrest identified in the caption above, which is attributed to the movant although the movant was not the person arrested. This route corrects publicly available records rather than sealing them.`, "");
    L.push("2. Grounds: the movant attests under oath, in the sworn attestation below, that the movant was incorrectly identified or named; as far as the movant knows, the agency took no fingerprints at that arrest; and as far as the movant knows, the person arrested presented no other reliable identification. The movant states what is known:", "");
    L.push("Whether the agency took fingerprints at that arrest, as far as you know:");
    L.push(DOTS(), "");
    L.push("Whether the person arrested presented any other reliable identification, as far as you know:");
    L.push(DOTS(), "");
    L.push("3. The movant's own sworn statement of why this arrest was wrongly attributed to the movant, in the movant's own words (state only what you know first-hand; this packet asserts nothing about who committed any offence, and writes none of these lines for you):");
    L.push(DOTS());
    L.push(DOTS());
    L.push(DOTS(), "");
    L.push("4. The movant therefore asks the Court to order correction of the publicly available records of the arrest identified above, pursuant to D.C. Code Sec. 16-806(g).", "");
  }

  contactBlock(L, facts, fam.familyId === "dc_correct_misattributed_arrest-set");
  L.push("", `Route: ${variant.routeKey}`);
  return L.join("\n");
}

function prosecutorServiceBody(fam, variant, facts) {
  const name = facts["participant.full_legal_name"];
  const L = [];
  L.push("COPY FOR THE PROSECUTING OFFICE", "");
  L.push(`Enclosed is a copy of the motion filed by ${name} under ${fam.statute.replaceAll("§", "Sec.")}: ${fam.motionTitle}.`, "");
  L.push("Under the recorded rule for this motion, the motion is served on the prosecutor, and the prosecutor need not respond unless the Court orders it. Do not expect an opposition by default.", "");
  L.push("WHICH OFFICE, AND WHERE, IS NOT STATED HERE. Two offices prosecute District of Columbia cases - the United States Attorney's Office for the District of Columbia and the Office of the Attorney General for the District of Columbia - and no source this packet is built from states the rule for which office prosecuted a given case or its correct service address. A guessed recipient in a service instruction is worse than none. Before you serve this copy, ask " + CLERK_AUTHORITY + " which office prosecuted your case and the correct service address, and use exactly what they tell you.", "");
  L.push("NAME AND MAILING ADDRESS OF THE PROSECUTING OFFICE FOR THE CASE");
  L.push("(you write it here before service; the Criminal Division clerk's office can confirm it)");
  L.push(DOTS());
  L.push(DOTS(), "");
  L.push("DATE OF SERVICE OF THE COPY " + DOTS(48));
  L.push("SIGNATURE OF MOVANT " + DOTS(56), "");
  L.push("This page is not proof of service and does not say that anything has been served. It is completed and signed by the movant when the copy actually goes out, in the manner the clerk directs. A date or a signature written before the copy goes out would be false.");
  L.push("", `Route: ${variant.routeKey}`);
  return L.join("\n");
}

function filingInstructionsBody(fam, variant, facts) {
  const name = facts["participant.full_legal_name"];
  const L = [];
  L.push("FILING INSTRUCTIONS", "");
  L.push(`This packet is prepared for ${fam.routeName}.`, "");
  L.push(`Prepared for: ${name}`, "");
  L.push("WHAT YOU DO, IN ORDER (steps one, two and five are stated by the Criminal Division's own instruction sheet, Rev. April 10, 2024, verified byte-exact for this packet):", "");
  L.push("STEP ONE. Call (202) 727-4245 to make an appointment with the Metropolitan Police Department (MPD) to request a copy of your arrest history report.");
  L.push("STEP TWO. Request the disposition of your case from DC Superior Court: email criminalcustomerservice@dcsc.gov, or ask in person at the Criminal Division clerk's office, 500 Indiana Avenue NW, Room 4001, Washington, DC, between 8:30 a.m. and 5:00 p.m.");
  L.push("STEP THREE. Fill in every dotted blank in this packet from those records. Do not guess a date, a charge wording or a case number.");
  if (fam.familyId === "dc_correct_misattributed_arrest-set") {
    L.push("STEP FOUR. Complete the sworn attestation yourself: ask " + CLERK_AUTHORITY + " what oath formality the Criminal Division requires, complete exactly that, and sign and date the attestation yourself.");
  } else {
    L.push("STEP FOUR. Sign and date the motion yourself. The platform never signs for you and never dates a signature.");
  }
  L.push("STEP FIVE. Send all your documents - your arrest record, your case disposition, and the motion - to criminalmotionsealteam@dcsc.gov. The Seal Team gives the motion a case number and assigns it to a judge to decide. The instruction sheet states this process can take up to six months. Whether any other filing channel is available is not stated by any held source; ask the clerk's office if email will not work for you.");
  L.push("STEP SIX. Serve a copy of the motion on the prosecuting office, using the service page in this packet, after asking the clerk which office prosecuted your case and its correct service address. The prosecutor need not respond unless the Court orders it.", "");
  L.push("MONEY. No source this packet is built from states a filing fee, that filing is free, or a fee-waiver procedure for this motion. Before filing, ask " + CLERK_AUTHORITY + " whether any fee applies and, if you cannot pay it, how to ask for a waiver.", "");
  if (fam.familyId === "dc_seal_nonconviction-set") {
    L.push("THE OCTOBER 1, 2027 GATE. If the offence in your case is not on the D.C. Code Sec. 16-805(b) list, this motion must be filed before October 1, 2027. If it is on that list, there is no deadline. Ask the clerk or a legal-help organization if you are not sure.", "");
    L.push("ONE MOTION PER CASE NUMBER. File one motion per case number in the case being addressed.", "");
    L.push("REPEAT MOTIONS. After a denial, the Court entertains a second motion no sooner than one year after the first is resolved, and a third and final motion no sooner than one year after the second.", "");
  } else if (fam.familyId === "dc_seal_conviction-set") {
    L.push("ONE MOTION PER CASE NUMBER. File one motion per case number in the case being addressed.", "");
    L.push("REPEAT MOTIONS. After a denial, the Court entertains a second motion no sooner than one year after the first is resolved, and a third and final motion no sooner than one year after the second.", "");
  } else if (fam.familyId === "dc_seal_fugitive-set") {
    L.push("ONE MOTION PER CASE NUMBER. File one motion per case number in the case being addressed.", "");
    L.push("WHO CAN STILL SEE A SEALED FUGITIVE ARREST. Under the recorded rule, records sealed as fugitive-from-justice arrests are not available to the D.C. Code Sec. 16-801(5)(D), (E) and (F) licensing, school-and-childcare, and senior government employer entities.", "");
  } else if (fam.familyId === "dc_innocence_expungement-set") {
    L.push("ONE MOTION PER CASE NUMBER. File one motion per case number in the case being addressed. The filing window is any time.", "");
    L.push("THE STATUTORY WARNING, D.C. CODE Sec. 16-803(e). An acquittal or dismissal does not establish a presumption of innocence. You carry the burden of demonstrating, by a preponderance of the evidence, that the offence did not occur or was not committed by you.", "");
    L.push("REPEAT MOTIONS. A second motion no sooner than one year after the first is resolved, and a third and final motion no sooner than one year after the second - except that a motion on different grounds may be filed at any time.", "");
  } else {
    L.push("WHAT THIS ROUTE DOES. This motion corrects publicly available records rather than sealing them.", "");
  }
  L.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
  for (const stop of fam.stops) L.push(`- ${stop}`);
  L.push("", "THESE ORGANIZATIONS CAN HELP (named, with numbers, on the Criminal Division's own instruction sheet):");
  for (const org of HELP_ORGS) L.push(`- ${org}`);
  L.push("", "WHAT THIS PACKET IS NOT", "");
  L.push("This is a prepared set of composed pleading and process pages. No official court form exists for this motion - the statute fixes the motion's content, which is why these pages are composed - and this packet is not legal advice, it is not filed for you, and it does not decide whether the Court will grant relief. Expunging destroys a record; sealing hides it from public view.");
  L.push("", `Route: ${variant.routeKey}`);
  return L.join("\n");
}

/* The self-help stop conditions, from each track's own memo. */
FAMILIES["dc_seal_nonconviction-set"].stops = [
  "the prosecutor files an opposition or the court orders a response;",
  "the court sets a hearing;",
  "a victim submits a statement;",
  "the case has co-defendants and redaction is at issue;",
  "the record is federal, military, tribal, or from another jurisdiction;",
  "you are asking to attack the disposition rather than seal the record;",
  "a prior motion was denied inside the one-year window, or you are at the third and final motion;",
  "immigration, firearm, licensing, security clearance, childcare, healthcare, or law enforcement employment consequences are in play."
];
FAMILIES["dc_seal_conviction-set"].stops = [
  "the prosecutor files an opposition or the court orders a response;",
  "the court sets a hearing;",
  "a victim submits a statement;",
  "the felony Offense Severity Group cannot be established from the record;",
  "the case has co-defendants and redaction is at issue;",
  "the record is federal, military, tribal, or from another jurisdiction;",
  "you are asking to attack the conviction rather than seal it;",
  "you need the prosecutor to waive a waiting period in writing;",
  "a prior motion was denied inside the one-year window, or you are at the third and final motion;",
  "immigration, firearm, licensing, security clearance, childcare, healthcare, or law enforcement employment consequences are in play."
];
FAMILIES["dc_seal_fugitive-set"].stops = [
  "the prosecutor files an opposition or the court orders a response;",
  "the court sets a hearing;",
  "a victim submits a statement;",
  "you did not waive extradition, or you have not appeared before the proper official in the jurisdiction that sought you;",
  "the record is federal, military, tribal, or from another jurisdiction;",
  "a prior motion was denied inside the one-year window;",
  "immigration, firearm, licensing, security clearance, childcare, healthcare, or law enforcement employment consequences are in play."
];
FAMILIES["dc_innocence_expungement-set"].stops = [
  "the prosecutor files an opposition or the court orders a response;",
  "the court sets a hearing, at which both sides may present witnesses or proceed by proffer;",
  "the relief turns on an affirmative evidentiary showing of innocence on disputed facts and you are unsure of your evidence;",
  "the record is federal, military, tribal, or from another jurisdiction;",
  "a prior motion was denied inside the one-year window;",
  "immigration, firearm, licensing, security clearance, childcare, healthcare, or law enforcement employment consequences are in play."
];
FAMILIES["dc_correct_misattributed_arrest-set"].stops = [
  "the prosecutor files an opposition or the court orders a response;",
  "the court sets a hearing;",
  "you may in fact have been the person arrested, or it is unclear;",
  "fingerprints were taken at the arrest, or the person arrested presented other reliable identification;",
  "the record is federal, military, tribal, or from another jurisdiction;",
  "immigration, firearm, licensing, security clearance, childcare, healthcare, or law enforcement employment consequences are in play."
];

function composedBody(fam, componentId, variant, facts) {
  if (componentId === "primary_filing") return primaryFilingBody(fam, variant, facts);
  if (componentId === "prosecutor_service") return prosecutorServiceBody(fam, variant, facts);
  return filingInstructionsBody(fam, variant, facts);
}

function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
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
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* ---- the field maps ------------------------------------------------------------ *
 * One map per composed component, in the maps-with-canonical-and-boundary shape
 * the shared completeness contract reads. Every write names the fact it binds;
 * every blank earns its blankness against the closed vocabulary; every
 * REQUIRED_BEFORE_FILING row is declared as typed data with its printed label,
 * and disclosed by that label in participant-instructions.md.
 */
function rowHelpers(componentId) {
  const base = (id, label) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const write = (id, label, factId) => ({ ...base(id, label), factId, kind: "composed_text", document: componentId });
  const protectedBlank = (id, label, why) => ({
    ...base(id, label),
    reason: "signature or date field; never prefilled by this build",
    category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
    requiredBeforeFiling: false, document: componentId, why
  });
  const clerkBlank = (id, label, why) => ({
    ...base(id, label),
    reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
    category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
    requiredBeforeFiling: false, document: componentId, why
  });
  const rbf = (id, label, what, why) => ({
    ...base(id, label),
    reason: `the participant supplies this before filing: ${what}`,
    category: null, completenessClass: null, class: null,
    disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true, identity: `${componentId} field ${id}`, factId: null, routeDetermined: false,
    document: componentId, why, participantMustSupply: what
  });
  return { base, write, protectedBlank, clerkBlank, rbf };
}

const NOT_SEEN = "the case lives on records the platform has not seen, so its facts are the participant's to copy from the record itself";

function composedMap(fam, componentId) {
  const { write, protectedBlank, clerkBlank, rbf } = rowHelpers(componentId);
  const writes = [];
  const refusals = [];
  if (componentId === "primary_filing") {
    writes.push(
      write("movant_name", "Movant named in the caption and the opening paragraph of this motion", "participant.full_legal_name"),
      write("date_of_birth", "Movant's date of birth, printed in the motion's opening paragraph", "participant.date_of_birth"),
      write("mailing_address", "Mailing address of the movant in the contact block at the foot of the motion", "participant.street_address"),
      write("telephone", "Telephone number of the movant in the contact block at the foot of the motion", "participant.phone"),
      write("email", "Email address of the movant in the contact block at the foot of the motion", "participant.email")
    );
    if (fam.familyId === "dc_seal_conviction-set") {
      writes.push(write("offense_level_route_statement",
        "Offense level and waiting period stated in the motion, selected by the statutory route this packet variant is built for",
        "route.offense_level_statement"));
    }
    refusals.push(
      rbf("underlying_case_number", "Case number of the case this motion addresses",
        "the case number, copied exactly from the court record - the disposition you request in step two of the filing instructions states it",
        NOT_SEEN),
      clerkBlank("motion_case_number", "Motion case number, which the Seal Team assigns at filing",
        "the instruction sheet's own face states the Seal Team gives the motion a case number at filing"),
      protectedBlank("movant_signature",
        fam.familyId === "dc_correct_misattributed_arrest-set"
          ? "Signature of the movant on the sworn attestation"
          : "Signature of the movant on the motion",
        fam.familyId === "dc_correct_misattributed_arrest-set"
          ? "the movant swears and signs the attestation personally; the oath formality is the clerk's to state"
          : "the movant signs the motion personally"),
      protectedBlank("signature_date",
        fam.familyId === "dc_correct_misattributed_arrest-set"
          ? "Date beside the movant's signature on the sworn attestation"
          : "Date beside the movant's signature on the motion",
        "a date written before the motion is signed would be false")
    );
    if (fam.familyId === "dc_seal_nonconviction-set") {
      refusals.push(
        rbf("charge_description", "Charge in the case to be sealed, worded exactly as the court record words it",
          "the charge, worded exactly as the court record words it", NOT_SEEN),
        rbf("offence_statute_section", "Statute section of the offence charged, copied from the court record",
          "the statute section of the offence, copied from the court record - it also decides whether the October 1, 2027 deadline applies, so copy it exactly", NOT_SEEN),
        rbf("disposition_and_date", "Disposition of the case - how it ended, and the date of final disposition",
          "how the case ended and on what date, checked against the disposition you obtain from the court in step two - correct the packet if they disagree", NOT_SEEN),
        rbf("known_history", "Every citation, arrest, charge and conviction of yours that has not already been sealed or expunged, as reasonably known",
          "your record history as reasonably known to you, which D.C. Code Sec. 16-806(c)(1) makes part of the motion - write NONE OTHER if there are none", "the statute requires the movant's own statement of the history as reasonably known; the platform does not verify it"),
        rbf("records_to_seal", "The records you ask the Court to seal",
          "which of your records you ask the Court to seal - D.C. Code Sec. 16-806(h) says you need not seek relief for every eligible record", "the scope of relief is the participant's own choice"),
        rbf("interests_of_justice_statement", "Your own statement of why sealing this record is in the interests of justice",
          "your own words on why sealing is in the interests of justice - what the record stops you doing now; the packet does not write advocacy for you", "the recorded legal-design limitation forbids generated individualized interests-of-justice advocacy"),
        rbf("prior_motions", "Prior sealing motions you have filed under this chapter, and when each was resolved",
          "any earlier sealing motion and when it was resolved - write NONE if none; a denial less than one year old is a stop condition", NOT_SEEN)
      );
    } else if (fam.familyId === "dc_seal_conviction-set") {
      refusals.push(
        rbf("conviction_description", "Offence of conviction, worded exactly as the court record words it",
          "the offence of conviction, worded exactly as the court record words it", NOT_SEEN),
        rbf("offence_statute_section", "Statute section of the offence of conviction, copied from the court record",
          "the statute section of the offence of conviction, copied from the court record", NOT_SEEN),
        rbf("sentence_completion_date", "Date the movant completed the sentence - the latest of discharge from incarceration, commitment, probation, parole or supervised release",
          "the date you completed the sentence, which starts the waiting period - under D.C. Code Sec. 16-801(2) it is the latest discharge, and unpaid fines or restitution do not prevent completion", NOT_SEEN),
        rbf("known_history", "Every citation, arrest, charge and conviction of yours that has not already been sealed or expunged, as reasonably known",
          "your record history as reasonably known to you, which D.C. Code Sec. 16-806(c)(1) makes part of the motion - write NONE OTHER if there are none", "the statute requires the movant's own statement of the history as reasonably known; the platform does not verify it"),
        rbf("records_to_seal", "The records you ask the Court to seal",
          "which of your records you ask the Court to seal - D.C. Code Sec. 16-806(h) says you need not seek relief for every eligible record", "the scope of relief is the participant's own choice"),
        rbf("interests_of_justice_statement", "Your own statement of why sealing this record is in the interests of justice",
          "your own words on why sealing is in the interests of justice - what the record stops you doing now; the packet does not write advocacy for you", "the recorded legal-design limitation forbids generated individualized interests-of-justice advocacy"),
        rbf("prior_motions", "Prior sealing motions you have filed under this chapter, and when each was resolved",
          "any earlier sealing motion and when it was resolved - write NONE if none; a denial less than one year old is a stop condition", NOT_SEEN)
      );
    } else if (fam.familyId === "dc_seal_fugitive-set") {
      refusals.push(
        rbf("originating_jurisdiction", "Jurisdiction that sought the movant - the state or place whose warrant led to the arrest",
          "the state or place whose warrant led to your DC fugitive arrest, copied from the case papers", NOT_SEEN),
        rbf("extradition_waiver_date", "Date the movant waived extradition under D.C. Code Sec. 23-702(f)(1), if known",
          "the date you waived extradition, taken from the case papers if known - if you did not waive extradition this route is not yours, so stop", NOT_SEEN),
        rbf("disposition_and_date", "Final disposition of the fugitive case, and the date of that disposition",
          "how the fugitive case ended and on what date, checked against the disposition you obtain from the court in step two", NOT_SEEN),
        rbf("appearance_date_place", "Date and place of the movant's appearance before the proper official in the jurisdiction that sought the movant",
          "when and where you appeared before the proper official in the originating jurisdiction", NOT_SEEN),
        rbf("appearance_proof", "Proof of that appearance, attached to this motion",
          "a document confirming your appearance, obtained from the court or official in the originating jurisdiction - ask that court or official for confirmation of your appearance, and attach it", "no held source can confirm an out-of-jurisdiction appearance; the originating jurisdiction is the checkable authority"),
        rbf("known_history", "Every citation, arrest, charge and conviction of yours that has not already been sealed or expunged, as reasonably known",
          "your record history as reasonably known to you, which D.C. Code Sec. 16-806(c)(1) makes part of the motion - write NONE OTHER if there are none", "the statute requires the movant's own statement of the history as reasonably known; the platform does not verify it"),
        rbf("records_to_seal", "The records you ask the Court to seal",
          "which of your records you ask the Court to seal - D.C. Code Sec. 16-806(h) says you need not seek relief for every eligible record", "the scope of relief is the participant's own choice"),
        rbf("interests_of_justice_statement", "Your own statement of why sealing this record is in the interests of justice",
          "your own words on why sealing is in the interests of justice; the packet does not write advocacy for you", "the recorded legal-design limitation forbids generated individualized interests-of-justice advocacy")
      );
    } else if (fam.familyId === "dc_innocence_expungement-set") {
      refusals.push(
        rbf("charge_description", "What the movant was charged with, worded exactly as the court record words it",
          "what you were charged with, worded exactly as the court record words it", NOT_SEEN),
        rbf("disposition_and_date", "Disposition of the case - how it ended, and the date of final disposition",
          "how the case ended and on what date, checked against the disposition you obtain from the court in step two - correct the packet if they disagree", NOT_SEEN),
        rbf("innocence_statement", "Your own statement of why the offence did not occur, or why the movant was not the person who committed it",
          "your own first-hand account of why the offence did not occur or why you were not the person who committed it - you carry the burden of demonstrating it by a preponderance of the evidence, and the packet does not write it for you", "the showing of actual innocence is the movant's own evidentiary burden; the platform judges nothing and writes none of it"),
        rbf("supporting_materials", "Statement of points and authorities, exhibits, affidavits and supporting documents attached to the motion",
          "the supporting material you attach - points and authorities, exhibits, affidavits and supporting documents; you supply them and the platform does not judge sufficiency", "the movant carries the burden and supplies the supporting material"),
        rbf("prior_motions", "Prior expungement motions like this one you have filed, and when each was resolved",
          "any earlier motion like this one and when it was resolved - write NONE if none; a second motion waits one year after the first is resolved, a third and final one year after the second, though a motion on different grounds may be filed at any time", NOT_SEEN)
      );
    } else {
      refusals.push(
        rbf("fingerprints_answer", "Whether the agency took fingerprints at that arrest, as far as you know",
          "your answer, as far as you know, on whether fingerprints were taken at the arrest - if they were, this route is not yours, so stop", "the statute's ground exists only where no fingerprints were taken; only the participant can say what they know"),
        rbf("other_identification_answer", "Whether the person arrested presented any other reliable identification, as far as you know",
          "your answer, as far as you know, on whether the person arrested presented other reliable identification - if they did, this route is not yours, so stop", "the statute's ground exists only where no other reliable identification was presented; only the participant can say what they know"),
        rbf("misidentification_statement", "Your own sworn statement of why this arrest was wrongly attributed to the movant",
          "your own first-hand sworn account of why the arrest was wrongly attributed to you - the packet asserts nothing about who committed any offence, so these lines are yours alone", "the sworn attestation is the movant's own oath; the platform writes none of it")
      );
    }
  } else if (componentId === "prosecutor_service") {
    writes.push(write("movant_name", "Movant named on this page", "participant.full_legal_name"));
    refusals.push(
      rbf("prosecuting_office_name_address", "Name and mailing address of the prosecuting office for the case",
        "the name and mailing address of the office that prosecuted your case - the United States Attorney's Office for the District of Columbia or the Office of the Attorney General for the District of Columbia; the Criminal Division clerk's office (202-879-1373) or the Seal Team (criminalmotionsealteam@dcsc.gov) can tell you which, and the address",
        "no held source states the prosecutor-routing rule or a service address, so the participant obtains both from the named checkable authority"),
      protectedBlank("service_date", "Date of service of the copy",
        "a date written before the copy is actually served would be false"),
      protectedBlank("movant_signature", "Signature of the movant on the service page",
        "the movant signs this page when the copy actually goes out")
    );
  } else {
    writes.push(write("movant_name", "Movant named on this page", "participant.full_legal_name"));
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKeys: fam.variants.map((v) => v.routeKey) },
    structuralClass: "composed_document",
    composedFrom:
      "the legal-design intake record (data/record-clearing/legal-design-intake/DC.memo.json, track "
      + fam.familyId.replace(/-set$/, "") + "), the packet-set manifest "
      + "(data/record-clearing/legal-design-packet-set-manifests.json), and the pinned Criminal Division "
      + "instruction sheet's own face",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- byte proof of the composed writes ------------------------------------------ *
 * Read back from the saved packet bytes, never from this builder's own intent:
 * each written fact value must be found in the extracted text of the pages the
 * page manifest assigns to its component. Wrapped lines are joined on spaces
 * before matching, because the renderer wraps at word boundaries. Every page is
 * additionally asserted free of the bound reference sheet's own title, because
 * the instruction sheet is not part of any packet.
 */
async function byteProof(packetBytes, pageManifest, maps, facts, fixtureName) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  assert.equal(pages.length, pageManifest.length, "the page manifest must describe every page of the packet");
  const textOfPage = pages.map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
  const textOfComponent = new Map();
  for (const [i, m] of pageManifest.entries()) {
    textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${textOfPage[i]}`);
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const componentText = String(textOfComponent.get(map.formNumber) ?? "").replace(/\s+/g, " ");
    for (const w of map.canonicalWrites ?? []) {
      const value = sanitizePdfText(String(facts[w.factId] ?? ""));
      assert.ok(value.length > 0, `${map.formNumber}/${w.field}: no fixture value for ${w.factId}`);
      const found = componentText.includes(value);
      assert.ok(found, `${fixtureName} ${map.formNumber}/${w.field}: the value bound to ${w.factId} is not readable from the output bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: w.field, document: map.formNumber, factId: w.factId,
        expected: value, foundInOutputBytes: true,
        proof: "value read back from the extracted text of the component's own pages in the saved packet bytes"
      });
    }
  }
  for (const [i, t] of textOfPage.entries()) {
    assert.ok(!t.includes("How to Seal or Expunge Your Criminal Record"),
      `packet page ${i + 1} appears to carry the bound instruction sheet's face; the reference is not part of this packet`);
  }
  return { actualWrites, glyphs, pagesRead: pages.length };
}

/* ---- the builder's own count of the nine counters --------------------------------- */
function countCompleteness(maps, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: false,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r));
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
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || writtenInDocument.get(blank.document)?.has(normLabel(blank.label))
        || writtenInDocument.get(blank.document)?.has(normLabel(blank.name)) || false
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
    const missing = cells.filter((c) => !c.written && classifyField(c.label, false).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, false).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs ------------------------------------------------------------------------ */
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
    .sort((a, b) => (order[a.document] - order[b.document]) || a.field.localeCompare(b.field));
}

function participantInstructions(fam, maps, rbf) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const out = [];
  out.push(`# What you must do before you file — ${fam.routeName}`, "");
  out.push(`This packet is prepared for **${fam.legalName}**.`, "");
  out.push("No official court form exists for this motion — the statute fixes the motion's content, which is why the pages in this packet are composed pleadings, grounded on the family's recorded legal design and, for the filing steps, on the Criminal Division's own instruction sheet (Rev. April 10, 2024), verified byte-exact for this packet.", "");
  out.push("The platform filled in what it holds about you: your name, your date of birth, your mailing address, your telephone number and your email"
    + (fam.familyId === "dc_seal_conviction-set" ? ", and the offense-level and waiting-period statement the statutory route determines" : "")
    + ". Every case fact lives on records the platform has not seen, so every one of them is a labelled dotted blank listed below, and you fill it from the record itself, never from memory.", "");

  if (fam.familyId === "dc_seal_conviction-set") {
    out.push("## Which packet variant you file", "");
    out.push("This family carries two statutory routes and each rendered packet states its own on its face:", "");
    out.push("| Variant | The route it states |", "| --- | --- |");
    out.push("| `misdemeanor_5yr` | a misdemeanor conviction — D.C. Code § 16-806(a)(3), five years from completion of the sentence |");
    out.push("| `felony_8yr` | a felony conviction — D.C. Code § 16-806(a)(3), eight years from completion of the sentence |");
    out.push("");
    out.push("File the variant that matches your conviction. A felony in Offense Severity Group 1, 2, or 3 of the D.C. Sentencing Commission Master Grid as of March 10, 2023 is not eligible; if you cannot establish the group from the record, stop and get help instead of filing.", "");
  }

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push(`| \`primary_filing\` | ${COMPOSED_TITLES.primary_filing} under ${fam.statute} |`);
  out.push("| `prosecutor_service` | the copy that goes to the prosecuting office, with the office and address left for you to confirm with the clerk |");
  out.push("| `filing_instructions` | the steps, in order, from the court's own instruction sheet, and when to stop and get help |");
  out.push("");

  out.push("## Documents you must obtain before filing", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  out.push("| Your arrest history report | the Metropolitan Police Department — call (202) 727-4245 for an appointment (stated on the court's instruction sheet) |");
  out.push("| The disposition of your case | DC Superior Court — email criminalcustomerservice@dcsc.gov, or in person at the Criminal Division clerk's office, 500 Indiana Avenue NW, Room 4001, Washington, DC, 8:30 a.m. to 5:00 p.m. (stated on the court's instruction sheet) |");
  if (fam.familyId === "dc_seal_fugitive-set") {
    out.push("| Proof that you appeared before the proper official in the originating jurisdiction | the court or official in the jurisdiction that issued the warrant — ask for confirmation of your appearance |");
  }
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is printed on its page as a labelled dotted blank. Fill every one from the records above.", "");
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc}`, "");
    out.push("| The blank on the document | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What you do, in order", "");
  out.push("1. **Call (202) 727-4245** for an MPD appointment and get your arrest history report.");
  out.push("2. **Get your case disposition** from the Superior Court (email criminalcustomerservice@dcsc.gov, or Room 4001 in person).");
  out.push("3. **Fill in every dotted blank** from those records. Do not guess a date, a charge wording or a case number.");
  if (fam.familyId === "dc_correct_misattributed_arrest-set") {
    out.push("4. **Complete the sworn attestation yourself.** Ask the Criminal Division clerk's office (202-879-1373) what oath formality is required — no held source states whether a notary is needed in addition — then swear, sign and date the attestation yourself.");
  } else {
    out.push("4. **Sign and date the motion yourself.** The platform never signs for you and never dates a signature.");
  }
  out.push("5. **Send all your documents** — arrest record, case disposition, and the motion — to criminalmotionsealteam@dcsc.gov. The Seal Team gives the motion a case number and assigns it to a judge. The court's sheet says the process can take up to six months.");
  out.push("6. **Serve the prosecuting office**, using the service page, after asking the Criminal Division clerk's office (202-879-1373) or the Seal Team which office prosecuted your case and its correct service address. The prosecutor need not respond unless the court orders it — do not expect an opposition by default.");
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature, and every date beside a signature.** A signature is yours alone, and a date written before you sign — or before a copy is actually served — would be false.");
  out.push("- **The motion's own case number.** The Seal Team assigns it at filing.");
  out.push("- **Every line of your own statement.** The packet prints your account in your words and writes no advocacy for you.");
  out.push("- **The prosecuting office and its service address.** No held source states the routing rule between the U.S. Attorney's Office and the Office of the Attorney General; the clerk's office is the authority that can answer it.");
  out.push("- **Any filing fee or fee-waiver answer.** No held source states a fee, that filing is free, or a waiver procedure — ask the Criminal Division clerk's office (202-879-1373) before filing.", "");

  out.push("## When to stop and get help instead of filing", "");
  for (const stop of fam.stops) out.push(`- ${stop}`);
  out.push("");
  out.push("These organizations are named, with their numbers, on the court's own instruction sheet:", "");
  for (const org of HELP_ORGS) out.push(`- ${org}`);
  out.push("");

  out.push("## What this packet is not", "");
  out.push("This is a prepared set of composed pleading and process pages. It is not an official court form — none exists for this motion — and it is not legal advice, it is not filed for you, and it does not decide whether the court will grant relief. Expunging destroys a record; sealing hides it from public view."
    + (fam.familyId === "dc_correct_misattributed_arrest-set" ? " This route corrects publicly available records rather than sealing them." : ""), "");
  out.push(`_Routes: ${fam.variants.map((v) => v.routeKey).join(" ; ")}_`);
  return `${out.join("\n")}\n`;
}

/* Family-specific counsel questions and findings, recorded so the open legal
 * inputs travel with the family into review rather than being resolved here. */
function counselQuestions(fam) {
  const q = [
    "No held source states a filing fee, that filing is free, or a fee-waiver procedure for this motion. The intake memo says the court's instruction sheet states no fee, but the pinned sheet's face states nothing about fees; the packet therefore delegates the fee question to the clerk. Confirm the fee answer and correct the memo-versus-face discrepancy.",
    "Prosecutor routing: the rule for determining whether the U.S. Attorney's Office or the Office of the Attorney General is the prosecuting agency for a given case, and the correct service address for each, is an open question the packet delegates to the clerk by name. Confirm before any promotion.",
    "Filing channel: whether the Seal Team email is the exclusive or preferred channel, whether e-filing is available, and any current Chapter 8 standing order or practice guidance issued since March 1, 2025."
  ];
  if (fam.familyId === "dc_seal_nonconviction-set") {
    q.push(
      "Temporary-law expiry: which subsections of § 16-806 revert on September 11, 2026, and whether the § 16-806(a)(1)(B)(i) before-October-1-2027 route for offenses not on the § 16-805(b) list survives. The intake memo records this as a build blocker on the eligibility branch; this packet states the October 1, 2027 gate from the recorded rule and resolves nothing about the expiry.",
      "Sections 16-808 and 16-809 (applicability and savings, particularly for records predating March 1, 2025) were not read in the underlying review."
    );
  }
  if (fam.familyId === "dc_seal_conviction-set") {
    q.push(
      "Master Grid mapping: an authoritative, machine-usable source for Offense Severity Groups 1, 2 and 3 as of March 10, 2023. The packet prints the exclusion and a stop condition instead of screening for it.",
      "Temporary-law expiry: which subsections of § 16-806 revert on September 11, 2026. This packet resolves nothing about the expiry."
    );
  }
  if (fam.familyId === "dc_seal_fugitive-set") {
    q.push("Temporary-law expiry: which subsections of § 16-806 revert on September 11, 2026. This packet resolves nothing about the expiry.");
  }
  if (fam.familyId === "dc_innocence_expungement-set") {
    q.push("Product scope: the intake record leaves open whether LegalEase enables the actual-innocence motion as a self-help track at all (a scope_restriction, with early handoff on contested evidence). This build renders the approved motion structure and decides nothing about enablement.");
  }
  if (fam.familyId === "dc_correct_misattributed_arrest-set") {
    q.push("Oath formality: the motion carries a sworn attestation and no held source states whether a notary or other officer is required in addition. The packet delegates the formality to the clerk; confirm the requirement.");
  }
  return q;
}

function buildFindings(fam) {
  const F = [];
  F.push({
    finding:
      "Every MASTER_QUEUE row for this family binds no document source (sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT, "
      + "officialFormFamily NONE), and the family's own legal-design record states in terms that no official form exists "
      + "and the statute fixes the content of the motion.",
    consequence:
      "The primary filing is a composed motion, exactly as the packet-set manifest and the MASTER_QUEUE row direct. The one "
      + "DC document the Master Library holds - the Criminal Division instruction sheet, Rev. April 10, 2024 - is bound "
      + "byte-exact as the shared REFERENCE instrument: its verified face grounds the filing-channel steps and the help-"
      + "organization list, and it is not included in any rendered packet. No form was substituted and none was invented."
  });
  F.push({
    finding:
      "SOURCE-FIDELITY DISCREPANCY, memo versus face: the intake memo states \"The court's instruction sheet states no "
      + "fee.\" The pinned sheet's printed face states nothing about fees at all.",
    consequence:
      "The packet follows the face: it nowhere asserts that filing is free, and the fee and fee-waiver questions are "
      + "delegated to the Criminal Division clerk's office by name and number, both printed on the pinned face. The "
      + "discrepancy is raised as a counsel question in approval-request.json."
  });
  F.push({
    finding:
      "No held source states the caption practice for these motions, the prosecutor-routing rule between the U.S. "
      + "Attorney's Office and the Office of the Attorney General, a service address, or any filing channel beyond the "
      + "Seal Team mailbox printed on the pinned face.",
    consequence:
      "The composed caption uses a neutral in-the-matter-of form with the underlying case number as a labelled participant "
      + "blank; the service page names the two possible offices and delegates the choice and the address to the clerk by "
      + "name; and the instructions delegate any non-email filing channel to the clerk. Nothing was guessed."
  });
  if (fam.familyId === "dc_seal_nonconviction-set") {
    F.push({
      finding:
        "The intake record carries a build-blocker question on the eligibility branch: which subsections of § 16-806 "
        + "revert when the temporary amendments expire on September 11, 2026, including the § 16-806(a)(1)(B)(i) "
        + "before-October-1-2027 route for offenses not on the § 16-805(b) list. The MASTER_QUEUE row dispatches the "
        + "family legalInputStatus SETTLED.",
      consequence:
        "The motion asserts only the stable § 16-806(a)(1) grounds and states the October 1, 2027 gate from the recorded "
        + "rule as a printed note with a named authority to ask; the packet resolves nothing about the expiry, and the "
        + "question travels to counsel in approval-request.json. Build ends at state_built either way; the question blocks "
        + "approval, not the build-first artifact."
    });
  }
  if (fam.familyId === "dc_seal_conviction-set") {
    F.push({
      finding:
        "This family carries two statutory routes - misdemeanor five-year and felony eight-year sealing under "
        + "§ 16-806(a)(3) - and the Offense Severity Group 1-3 Master Grid exclusion has no machine-usable held source.",
      consequence:
        "Each route is rendered as its own fixture pair whose motion states its offense level and waiting period on its "
        + "face, so no route election is left to the participant on paper. The Master Grid exclusion is printed on the "
        + "felony variant as a stop condition naming the legal-help organizations, and the mapping question travels to "
        + "counsel."
    });
  }
  if (fam.familyId === "dc_seal_fugitive-set") {
    F.push({
      finding:
        "The § 16-806(a)(2) grounds require an out-of-jurisdiction fact - appearance before the proper official in the "
        + "originating jurisdiction - that no held source can confirm.",
      consequence:
        "The appearance, its proof, and the extradition-waiver facts are labelled participant blanks with the originating "
        + "jurisdiction's court or official named as the checkable authority, and the printed grounds paragraph tells the "
        + "movant to stop if any ground is not true of them."
    });
  }
  if (fam.familyId === "dc_innocence_expungement-set") {
    F.push({
      finding:
        "The relief turns on an affirmative evidentiary showing the movant must carry, and the intake record leaves the "
        + "product-scope enablement of this track expressly open while approving the motion identity itself.",
      consequence:
        "The packet renders the approved motion structure only: every innocence line is the movant's own, the § 16-803(e) "
        + "no-presumption warning is carried into the instructions, and the scope question travels to counsel undecided."
    });
  }
  if (fam.familyId === "dc_correct_misattributed_arrest-set") {
    F.push({
      finding:
        "§ 16-806(g) requires a sworn attestation, and no held source states whether a notary or other officer must "
        + "administer the oath in addition.",
      consequence:
        "The attestation block prints the statutory attestation in full with the signature and date left to the movant, "
        + "and both the page and the instructions delegate the oath formality to the Criminal Division clerk's office by "
        + "name and number. Nothing swears anything for the movant."
    });
  }
  return F;
}

/* ---- the entry point ------------------------------------------------------------------ */
export async function runFamilyById(familyId, argv = process.argv.slice(2)) {
  const fam = FAMILIES[familyId];
  assert.ok(fam, `unknown DC family ${familyId}`);
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  const OUT = fam.out;

  const { resolved, failures } = resolveSources();
  if (failures.length > 0) {
    return {
      familyId, status: "BLOCKED_SOURCE", failedSourceIdentities: failures,
      why: "the bound reference did not bind by exact SHA-256, so nothing may be composed against its face",
      overlayDirectoryTouched: false
    };
  }
  const source = resolved[0];

  const face = await readFace(source);
  assert.equal(face.missing.length, 0,
    `the bound reference's face no longer prints ${face.missing.length} anchor(s) this build relies on: ${JSON.stringify(face.missing)}`);

  const maps = COMPONENTS.map((c) => composedMap(fam, c));

  if (checkOnly) {
    return {
      familyId, status: "CHECK_ONLY",
      boundReference: source.formNumber, sha256: source.sha256, faceAnchorsVerified: FACE_ANCHORS.length,
      components: COMPONENTS, variants: fam.variants.map((v) => v.variantId),
      writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
      blanks: maps.reduce((n, m) => n + m.canonicalRefusals.length, 0)
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];

  const fixtures = [];
  for (const variant of fam.variants) {
    for (const person of ["canonical", "boundary"]) {
      const fixtureName = fam.variants.length > 1 ? `${person}-${variant.variantId}` : person;
      fixtures.push({ fixtureName, variant, facts: { ...PEOPLE[person], ...variant.routeFacts } });
    }
  }

  for (const { fixtureName, variant, facts } of fixtures) {
    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${fam.legalName} — ${fixtureName} fixture`);
    const pageManifest = [];
    const documents = [];

    for (const componentId of COMPONENTS) {
      const body = composedBody(fam, componentId, variant, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]),
        `${componentId}: the composed page must carry the participant's name`);
      const composedBytes = await renderComposedPdf(body, `${fam.legalName} — ${componentId}`);
      const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: componentId, documentId: componentId, sourcePage: i + 1, sourceSha256: null });
      }
      documents.push(componentId);
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    const proof = await byteProof(packetBytes, pageManifest, maps, facts, fixtureName);
    writeProofs.push({
      fixture: fixtureName,
      routeKey: variant.routeKey,
      proofMethod: "every written fact value read back from the extracted text of its component's own pages in the saved packet bytes; every page asserted free of the bound reference sheet's face",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: [],
      actualWrites: proof.actualWrites
    });

    const sha256 = crypto.createHash("sha256").update(packetBytes).digest("hex");
    artifacts.push({
      fixture: fixtureName, routeKey: variant.routeKey, file, sha256,
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: COMPONENTS
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: "assembled_packet_of_composed_pleadings",
      fixture: fixtureName, routeKey: variant.routeKey, sha256, byteLength: packetBytes.length, pageCount: packet.getPageCount()
    });

    if (!skipRaster) {
      const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packet.getPageCount(); i += 1) {
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
          component: pageManifest[i]?.component ?? null,
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
  const instructionsText = participantInstructions(fam, maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId, worklistGroupId: familyId,
    jurisdiction: fam.jurisdiction, implementationStrategy: "custom_pleading",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "committed corpus-index SHA-256 + host-pinned SHA-256 + on-disk SHA-256 + byte length + printed-face anchor verification",
    routeKeys: fam.variants.map((v) => v.routeKey), routeSelectionId: fam.routeSelectionId,
    statutoryAuthority: fam.statute, legalName: fam.legalName,
    allSourcesExact: true,
    formIdentityNote:
      "The MASTER_QUEUE row binds no document source: sourceStatus CUSTOM_PLEADING_FROM_CODIFIED_TEXT, officialFormFamily "
      + "NONE, forms []. The family's own legal-design record states that no official form exists and the statute fixes "
      + "the content of the motion, and resolves the strategy to custom_pleading. The one DC document the Master Library "
      + "holds - the Criminal Division instruction sheet 'How to Seal or Expunge Your Criminal Record', Rev. April 10, "
      + "2024 - is bound byte-exact as the shared REFERENCE instrument: its verified face grounds the filing-channel "
      + "steps, the Seal Team intake mailbox, and the help-organization list, and it is not included in any rendered "
      + "packet. The memo's claim that this sheet states no fee is contradicted by the pinned face, which states nothing "
      + "about fees; the packet follows the face and delegates the fee question to the clerk.",
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength,
      instrumentKind: r.instrumentKind,
      role: "bound reference instrument; NOT included in the rendered packet",
      faceAnchorsVerified: FACE_ANCHORS
    })),
    composedComponentsAuthoredByThisBuild: COMPONENTS,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that Rev. April 10, 2024 is the current edition of the Criminal Division instruction sheet",
      "that any output is approved for participant delivery",
      "that any record is eligible for relief under " + fam.statute,
      "which subsections of D.C. Code § 16-806 carry temporary amendments expiring September 11, 2026"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId,
    routeKeys: fam.variants.map((v) => v.routeKey), routeSelectionId: fam.routeSelectionId, renderStrategy: "composed_pleading",
    jurisdiction: fam.jurisdiction, statute: fam.statute, legalName: fam.legalName,
    implementationStrategy: "custom_pleading",
    officialForm: null,
    boundReferenceForm: REFERENCE_FORM,
    boundReferenceRole:
      "reference instrument only - the Criminal Division's own instruction sheet, whose verified face grounds the "
      + "filing-channel steps; it is not included in the packet",
    componentSet: COMPONENTS,
    dispositionVocabulary: [SIGNATURE, COURT_OWNED],
    routeSelectionsMade: fam.variants.length > 1
      ? fam.variants.map((v) => ({
        variant: v.variantId, routeKey: v.routeKey,
        selection: v.routeFacts["route.offense_level_statement"],
        statedWhere: "in the motion's own paragraph 2, written by this build; no route election is left to the participant on paper"
      }))
      : [],
    routeSelectionNote: fam.variants.length > 1
      ? "This family carries two statutory routes and each is rendered as its own fixture pair whose motion states its "
        + "offense level and waiting period on its face. The participant chooses which VARIANT matches their conviction - "
        + "a fact about their record, not a route election on the paper - and the instructions say how."
      : "The composed pages carry no election control. The statutory route is stated in the motion's own title and body, "
        + "which is where this family's route determination lives.",
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  /* A multi-variant family renders fixture pairs per route (canonical-misdemeanor_5yr,
   * canonical-felony_8yr, ...). The central raster gate refuses to guess which pair is
   * the family's primary, so the builder declares it: the first configured variant.
   * Coverage still spans every variant's documents; this only names the pair whose
   * hashes the receipt's primary binding carries. */
  if (fam.variants.length > 1) {
    for (const role of ["canonical", "boundary"]) {
      const primary = pdfsDeclared.find((p) => p.fixture === `${role}-${fam.variants[0].variantId}`);
      if (primary) pdfsDeclared.push({
        ...primary, fixture: role, role: "raster_primary_alias",
        aliasOf: primary.fixture,
        declaredBecause: "the family renders one fixture pair per variant; the first configured variant is the primary raster pair"
      });
    }
  }

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: COMPONENTS,
    boundReferenceSource: {
      formNumber: REFERENCE_FORM, sha256: source.sha256, byteLength: source.byteLength,
      role: "bound reference instrument read for the filing-channel steps; not included in any rendered artifact"
    },
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, routeKey: a.routeKey, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId, derivedFromArtifactBytes: true,
    note:
      "Every written fact value was read back from the extracted text of its component's own pages in the saved packet "
      + "bytes, not from this builder's intent; every packet page was asserted free of the bound reference sheet's face, "
      + "because the instruction sheet is not part of any packet.",
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
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions "
      + "over this family's field map, byte proof and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a hash-bound "
      + "RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: fam.buildScript,
    sharedBuildHost: "scripts/build-census-v1-dc_seal_nonconviction-set.mjs",
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1", familyId, blocking: [],
    findings: buildFindings(fam)
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: counselQuestions(fam),
    mattersForTheReviewersAttention: [
      "source-receipt.json formIdentityNote - no document source is bound because none exists; the instruction sheet is a reference only and deliberately not included. Confirm that is legible to reviewers.",
      "The memo-versus-face fee discrepancy recorded in build-findings.json: the packet follows the pinned face and asserts nothing about fees.",
      "Every case fact is required-before-filing; confirm the disclosure table in participant-instructions.md is complete against the dotted blanks on the paper."
    ]
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 6)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: "custom_pleading",
    boundReferenceForm: REFERENCE_FORM,
    boundReferenceIncludedInPacket: false,
    sourceSha256: source.sha256,
    components: COMPONENTS,
    documents: COMPONENTS,
    variants: fam.variants.map((v) => v.variantId),
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
  runFamilyById("dc_seal_nonconviction-set")
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
