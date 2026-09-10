#!/usr/bin/env node
/**
 * Route-obligation census v1 — packet family `mn_petition_15218-set`.
 *
 *   node scripts/build-census-v1-mn_petition_15218-set.mjs [--check]
 *
 * Minnesota, expungement of a case discharged under the controlled-substance
 * statute. Route `obligation:track-only:MN:mn_petition_15218`, authority
 * Minn. Stat. § 152.18 and Minn. Stat. ch. 609A. Four declared components, four
 * held binaries:
 *
 *   primary-filing-1        EXP102 Rev 7/24, Notice of Hearing and Petition for
 *                           Expungement.
 *   certificate-of-service-2 EXP104 Rev 1/25, Proof of Service.
 *   proposed-order-3        EXP106 Rev 1/24, Order Concerning Sealing/Expunging
 *                           of Records (Minn. Stat. § 609A.02, subd. 1 or 2).
 *   fee-waiver-4            FEE102 Rev 07/24, Affidavit to Request Fee Waiver
 *                           (Minn. Stat. § 563.01).
 *
 * ALL FOUR BINARIES ARE FLAT. None carries an AcroForm field, so there is no
 * widget /Rect to write into. Every write box below is measured from the
 * source's own drawn horizontal rules, through the shared anchor-capture path
 * that exists for exactly this case, and every selection box is measured from
 * the source's own checkbox glyph — its advance from the page's text matrix and
 * its outline from the embedded font program's `glyf` bounding box. No
 * coordinate in this file is hand-entered.
 *
 * WHY THE TWO MINNESOTA FAMILIES BIND THE SAME FOUR FORMS, MEASURED RATHER THAN
 * ASSUMED
 *
 * `mn_petition_15218-set` and `mn_petition_juvenile_as_adult-set` declare
 * byte-identical source sets. That was re-measured against the printed face of
 * the binaries rather than taken from the queue, and the forms themselves say
 * why the pair is real:
 *
 *   EXP102 item 9 offers ten qualification boxes. The first — a controlled
 *   substance case dismissed and discharged under Minn. Stat. § 152.18 — and
 *   the second — certification or reference for prosecution as an adult for a
 *   crime committed as a juvenile — BOTH print the instruction "[Use Order
 *   Concerning Sealing/Expunging of Record - Minn. Stat. § 609A.02, subd. 1 or
 *   2 (court form EXP106).]". Every other box on item 9 routes to EXP105 or
 *   EXP107.
 *
 *   EXP106 finding 1 then carries the matching pair of branches: "was sentenced
 *   pursuant to Minn. § 152.18" and "following certification or reference to
 *   district court for prosecution pursuant to Minn. Stat. § 260B.125".
 *
 * So the two families are the same four forms and diverge at exactly two
 * measured elections. This family takes the § 152.18 branch. The divergence is
 * asserted against the printed line at build time: if a future revision stops
 * printing it, this build stops rather than marking a box whose meaning it can
 * no longer read.
 *
 * FOUR DECISIONS THAT SHAPED WHAT IS AND IS NOT WRITTEN.
 *
 * First, EXP106 IS THE COURT'S OWN INSTRUMENT AND IS FILLED TO ITS CAPTION
 * ONLY. Its body is "The Court finds:" and "IT IS ORDERED:", its selections
 * include "denied" and "granted", its paragraph 4 names the agencies the court
 * orders, and it closes over "Judge of District Court". A proposed order
 * carries the caption the petitioner supplies; every finding, every ordering
 * box and the judicial signature belong to the judge. Pre-marking finding 1
 * would be this build recording a finding the court has not made, so the route
 * election is stated where it belongs — on the petition the participant signs.
 *
 * Second, EXP104 IS A CERTIFICATE OF MAILING AND MAILING HAS NOT HAPPENED. Its
 * operative sentence is "I, ___, state that on ___ (date), I served the
 * attached documents ... by mailing true and correct copies to the parties
 * checked below at the addresses listed", and it closes under Minn. Stat.
 * § 358.116, penalty of perjury. Checking a recipient box asserts that that
 * party was served. Writing an address asserts where a copy went. Neither is
 * true when the packet is generated. So EXP104 is filled to its caption and
 * nothing else: the mailer's name, the date and city of mailing, all fifteen
 * recipient boxes, their address blanks and the signature block are left blank,
 * and the participant instructions carry them as work to be done at mailing.
 *
 * Third, ITEM 7 IS THE PARTICIPANT'S WHOLE CRIMINAL RECORD, NOT THIS MATTER.
 * The form's own words: "Minnesota law requires you to give the full record of
 * all your criminal convictions ... and criminal charges ... include
 * information from Minnesota and any other state, federal court, and foreign
 * countries". The platform holds one matter. A row carrying this case number
 * beside five blank cells reads as a completed record and is not one, so no
 * cell of the table is written and all of them are carried to the participant.
 *
 * Fourth, FEE102 IS A SWORN FINANCIAL AFFIDAVIT AND THE PLATFORM HOLDS NO
 * FINANCIAL FACT. Household size, income, public assistance, assets and monthly
 * expenses are protected categories the platform must not hold and does not
 * guess. FEE102 is filled to its caption; its one election that this packet
 * rather than the participant determines — item 2's "I am including my
 * pleadings with this Affidavit", which is a statement about what this packet
 * contains — is marked, and every other blank on its six pages is carried to
 * the participant by name. The form is captioned CONFIDENTIAL on every page and
 * the filing instructions say so.
 *
 * MEASURED HERE SO THE NEXT LANE DOES NOT RE-SURVEY
 *
 *   - The hearing date, hearing time, a.m./p.m., the Zoom meeting ID and
 *     passcode, the courthouse address and the courtroom number on EXP102 page
 *     1 are set by the court after filing. They are LATER_COMPLETION, not
 *     packet gaps, and the committed route record says so in as many words.
 *   - The checkbox on all four binaries is a single two-byte CID — <0706> in a
 *     Type0 subset of MS-Gothic, whose ToUnicode maps it to U+2610 BALLOT BOX.
 *     The shared anchor-capture path reports it as two one-byte characters,
 *     U+0007 and U+0006, each carrying half the advance. The pair's combined
 *     span is the correct glyph cell and the sum of the advances is correct, so
 *     the geometry this build measures is sound; the character decoding is not,
 *     and `metricsExact` is false on every one of them. That is a defect in a
 *     shared module, reported rather than edited from here.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { preserveGovernanceState, writeWiringChecked }
  from "./rcap-packet-completeness/governance-preservation.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFRawStream, PDFArray, decodePDFRawStream, PDFName, StandardFonts } = require("pdf-lib");
const HELVETICA = StandardFonts.Helvetica;

const FAMILY_ID = "mn_petition_15218-set";
const ROUTE_KEY = "obligation:track-only:MN:mn_petition_15218";
const ROUTE_SELECTION_ID = "mn-exp102-152-18-discharge";
const OUT = "data/rcap-all50/overlays/census-v1/mn/mn-petition-15218-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-mn_petition_15218-set.mjs";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";
const TRACK_ID = "mn_petition_15218";

/*
 * WHAT THE CONTROLLING RECORDS SAY THAT THIS PACKET WAS NOT SAYING.
 *
 * This build derived its whole participant guide from the field census -- from
 * the blanks it measured on the four PDFs -- and read neither controlling
 * record. That works for "which rules are empty" and fails for everything the
 * record knows that the paper does not show. VF56 measured the two gaps:
 *
 *   SELF_HELP_STOP. The track carries FOUR selfHelpStopConditions. Three reach
 *   the guides in substance. The fourth, "Predatory-offender registration is
 *   required.", reached them in no form at all: "predatory" and "registration"
 *   occurred zero times in either document. The same track excludes the route
 *   for a "Predatory-offender registration bar under § 609A.02, subd. 4."
 *
 *   REQUIRED_BEFORE_FILING. The packet-set manifest declares TEN entries. Two
 *   reached neither guide in any form: getting your own BCA criminal history
 *   and MCRO case history, and checking the court file number against them.
 *   The second is the check that would have caught the blank caption VF56
 *   failed this family on under KNOWN_PREFILLS.
 *
 * Held as literals and asserted verbatim against both records at build time,
 * rather than pinned by whole-file SHA-256: both files are shared and rewritten
 * by unrelated route work, so a whole-file pin goes stale within days without
 * saying whether THESE entries moved. The build then re-reads its own emitted
 * markdown and refuses to write if the participant-facing strings are not on
 * the page.
 */
const SELF_HELP_STOP_CONDITIONS = Object.freeze([
  "The prosecuting authority or an agency objects.",
  "The court sets a contested hearing.",
  "Whether the discharge was under § 152.18 is disputed.",
  "Predatory-offender registration is required."
]);
const REGISTRATION_EXCLUSION = "Predatory-offender registration bar under § 609A.02, subd. 4.";
const OWN_RECORDS_STEP = "Obtain Your own Minnesota criminal history from the Bureau of Criminal Apprehension, and your case history from MCRO. Request your own criminal history from the BCA and look your cases up on Minnesota Court Records Online. LegalEase never collects, inspects or authenticates them.";
const FILE_NUMBER_CROSSCHECK = "Check your answer to \"What is the court file number?\" against Your own Minnesota criminal history from the Bureau of Criminal Apprehension, and your case history from MCRO, and correct the packet if they disagree.";

/*
 * The strings that must be readable in the delivered markdown once those
 * entries are carried. Matched against the RAW delivered text: these guides are
 * hard-wrapped, and an independent lane greps the file as it sits on disk, so a
 * phrase broken across a line break reads as zero occurrences to that grep and
 * the disclosure has not landed. Each of these is a string VF56 counted at zero.
 */
const REQUIRED_PARTICIPANT_DISCLOSURES = Object.freeze([
  { needle: "predatory", obligation: "SELF_HELP_STOP" },
  { needle: "registration", obligation: "SELF_HELP_STOP" },
  { needle: "609A.02, subd. 4", obligation: "SELF_HELP_STOP" },
  { needle: "criminal history", obligation: "REQUIRED_BEFORE_FILING" },
  { needle: "Bureau of Criminal Apprehension", obligation: "REQUIRED_BEFORE_FILING" },
  { needle: "MCRO", obligation: "REQUIRED_BEFORE_FILING" },
  { needle: "court file number", obligation: "REQUIRED_BEFORE_FILING" }
]);

/*
 * The election this family makes on EXP102 item 9, and the line the form must
 * still print for the election to mean what this build says it means.
 */
const ROUTE_ELECTION = Object.freeze({
  form: "EXP102",
  item: "9. Qualification for Expungement",
  printedGoverningLine:
    "has been dismissed and the proceedings have been discharged under Minn. Stat. § 152.18",
  matchOptionText: /dismissed and the proceedings have\s*been discharged under Minn\. Stat\. § 152\.18/i,
  authority: "Minn. Stat. § 152.18; Minn. Stat. § 609A.02, subd. 1 or 2",
  why:
    "This packet is built for one statutory route and the petition must state which. Item 9 box 1 is the "
    + "§ 152.18 discharge, and it is the only box on item 9 besides the juvenile-certification box that "
    + "routes to EXP106, which is the proposed order this family binds."
});

/*
 * FEE102 ITEM 2 IS A PRINTED "Choose one:", AND THIS PACKET MAKES THE CHOICE.
 *
 * The affidavit is sworn under Minn. Stat. § 563.01. Item 2 offers two
 * branches under the printed instruction "Choose one:", and which one is true
 * is a fact about what is in the envelope rather than a fact about the person:
 * this packet carries the petition, the proof of service and the proposed
 * order, so the pleadings ARE being filed with the affidavit and the first
 * branch is the true one. This build marks it.
 *
 * The second branch is therefore not a choice left open. It was classified as
 * a genuine participant election and offered under "Choices only you can
 * make", which meant a reader who followed the packet's own instructions would
 * mark BOTH branches of a choose-one on a sworn affidavit. An election this
 * packet has already made is not an election it may also hand back.
 */
const FEE102_ITEM_2 = Object.freeze({
  printedInstruction: "Choose one:",
  electedBranch: /I am including my pleadings with this Affidavit/i,
  alternativeBranch: /I only want to have copy fees waived/i
});

/*
 * EXP102 ITEM 9 PRINTS ELEVEN STATUTORY GROUNDS. THIS PACKET USES ONE.
 *
 * VF61 measured what the other ten carried and refused the family for it. All
 * ten were classified NOT_APPLICABLE_ON_THIS_ROUTE, all ten carried
 * `reason: null` in both delivered records, none was named anywhere in either
 * guide, and the guide swept them up in one sentence -- "Every other box in
 * this packet is empty and is yours" -- on a petition signed under Minn. Stat.
 * § 358.116. Each of the ten states a DIFFERENT statutory basis for
 * expungement, so a participant who followed that sentence would swear to a
 * ground this petition is not built to prove.
 *
 * NO COUNTER SAW IT, AND THE REASON IS WORTH RECORDING. The shared reader in
 * `scripts/rcap-packet-completeness/verify-packet-completeness.mjs`
 * (`readFieldRows`, the anchors-and-withheld shape) reads `writableAnchors`
 * and `withheld` and does not read `selectionControls` at all: it audits 387
 * rows on this family, which is exactly 30 anchors + 357 withheld, and 0 of
 * this family's 95 selection controls. So `requiredOptionsMissing` could not
 * have been anything but 0 here whatever these boxes said. That reader is
 * shared code this lane does not own. What this lane owns is the build path,
 * and the build path now refuses to deliver a selection control that does not
 * say why it is empty.
 *
 * The ground text below is the printed face of EXP102 Rev 7/24, pages 4 and 5,
 * of the exact binary this family binds
 * (sha256 c98430f1a9c7a6d399b7d01de1ef2eee0df5f0a1a07e89a703b307977d7bf541),
 * read back through the same anchor-capture path the census uses. Each entry's
 * `routedOrder` is the bracketed instruction the form itself prints under that
 * ground. Nothing here is drafted from a statute the form does not cite.
 */
const ITEM_9_GROUNDS_NOT_USED = Object.freeze([
  {
    key: "juvenile-certification",
    match: /certified or referenced for prosecution as an adult/i,
    routedOrder: "Order Concerning Sealing/Expunging of Record - Minn. Stat. § 609A.02, subd. 1 or 2 (court form EXP106)",
    reason:
      "This box is EXP102 item 9's second ground: \"You were certified or referenced for prosecution as an "
      + "adult for a crime you committed when you were a juvenile.\" It is the one other ground on item 9 "
      + "that uses the same proposed order this packet carries — the form prints \"[Use Order Concerning "
      + "Sealing/Expunging of Record - Minn. Stat. § 609A.02, subd. 1 or 2 (court form EXP106).]\" under it "
      + "— but it is a different petition, proved by different facts, and nothing in this packet was "
      + "prepared or worded for a juvenile certification. Leave it empty here. If this is your ground and "
      + "the § 152.18 discharge is not, ask for the packet built for it instead of adding this box to this "
      + "one."
  },
  {
    key: "resolved-in-your-favor",
    match: /A criminal matter was resolved/i,
    routedOrder: "Order Concerning Sealing/Expunging of Records - Minn. Stat. § 609A.02, subd. 3 (court form EXP105)",
    reason:
      "This box is EXP102 item 9's third ground: \"A criminal matter was resolved your favor.\" The form "
      + "sends that ground to a different proposed order — it prints \"[Use Order Concerning "
      + "Sealing/Expunging of Records - Minn. Stat. § 609A.02, subd. 3 (court form EXP105).]\" under it — "
      + "and this packet carries EXP106, not EXP105. Ticking it here would ask the court for relief under a "
      + "subdivision the order in your envelope does not cover. Leave it empty. If your case was resolved "
      + "in your favour rather than dismissed and discharged under § 152.18, this is the wrong packet."
  },
  {
    key: "diversion-or-stay",
    match: /diversion program or stay of adjudication/i,
    routedOrder: "Order Concerning Sealing/Expunging of Records - Minn. Stat. § 609A.02, subd. 3 (court form EXP105)",
    reason:
      "This box is EXP102 item 9's fourth ground: \"You successfully completed the terms of a diversion "
      + "program or stay of adjudication, and you have not been charged with a new crime for at least one "
      + "year since completion of the diversion program or stay of adjudication.\" A diversion or a stay of "
      + "adjudication is not the same disposition as a § 152.18 discharge, and the form sends it to a "
      + "different proposed order — \"[Use Order Concerning Sealing/Expunging of Records - Minn. Stat. "
      + "§ 609A.02, subd. 3 (court form EXP105).]\" This packet carries EXP106. Leave it empty here."
  },
  {
    key: "petty-misdemeanor-or-misdemeanor-conviction",
    match: /convicted of a petty misdemeanor or misdemeanor/i,
    routedOrder: "Order Concerning Sealing/Expunging of Records - Minn. Stat. § 609A.02, subd. 3 (court form EXP105)",
    reason:
      "This box is EXP102 item 9's fifth ground: \"You were convicted of a petty misdemeanor or "
      + "misdemeanor, or the sentence imposed was within the limits provided by law for a misdemeanor, and "
      + "you have not been convicted of a new crime for at least two years since discharge of the sentence "
      + "for the crime.\" It is a CONVICTION ground. The box this packet ticks is a case that was dismissed "
      + "and discharged without a conviction, and the form sends a conviction to a different proposed order "
      + "— \"[Use Order Concerning Sealing/Expunging of Records - Minn. Stat. § 609A.02, subd. 3 (court "
      + "form EXP105).]\" Leave it empty here."
  },
  {
    key: "gross-misdemeanor-conviction",
    match: /convicted of a gross misdemeanor, or the sentence imposed/i,
    routedOrder: "Order Concerning Sealing/Expunging of Records - Minn. Stat. § 609A.02, subd. 3 (court form EXP105)",
    reason:
      "This box is EXP102 item 9's sixth ground: \"You were convicted of a gross misdemeanor, or the "
      + "sentence imposed was within the limits provided by law for a gross misdemeanor, and you have not "
      + "been convicted of a new crime for at least three years since discharge of the sentence for the "
      + "crime.\" It is a conviction ground with its own three-year wait and its own proposed order — "
      + "\"[Use Order Concerning Sealing/Expunging of Records - Minn. Stat. § 609A.02, subd. 3 (court form "
      + "EXP105)].\" This packet carries EXP106 and petitions on a discharge, not a conviction. Leave it "
      + "empty here."
  },
  {
    key: "gross-misdemeanor-deemed-misdemeanor",
    match: /convicted of a gross misdemeanor that is deemed to be/i,
    routedOrder: "Order Concerning Sealing/Expunging of Records - Minn. Stat. § 609A.02, subd. 3 (court form EXP105)",
    reason:
      "This box is EXP102 item 9's seventh ground: \"You were convicted of a gross misdemeanor that is "
      + "deemed to be for a misdemeanor pursuant to Minn. Stat. § 609.13, subd. 2(2), and you have not been "
      + "convicted of a new crime for at least three years since discharge of the sentence for the crime.\" "
      + "It is the ground for a gross misdemeanor that the sentence reduced to a misdemeanor by operation "
      + "of § 609.13, and the form sends it to \"[Use Order Concerning Sealing/Expunging of Records - Minn. "
      + "Stat. § 609A.02, subd. 3 (court form EXP105)].\" This packet carries EXP106. Leave it empty here."
  },
  {
    key: "felony-152-025-conviction",
    match: /convicted of a felony violation of Minn\. Stat\. § 152\.025/i,
    routedOrder: "Order Concerning Sealing/Expunging of Records - Minn. Stat. § 609A.02, subd. 3 (court form EXP105)",
    reason:
      "This box is EXP102 item 9's eighth ground: \"You were convicted of a felony violation of Minn. Stat. "
      + "§ 152.025, and you have not been convicted of a new crime for at least four years since discharge "
      + "of the sentence for the crime.\" READ THIS ONE AGAINST THE BOX THIS PACKET TICKS. Both name "
      + "§ 152.025. The box this packet ticks is a possession case that was DISMISSED and the proceedings "
      + "DISCHARGED under Minn. Stat. § 152.18; this box is a CONVICTION under § 152.025 that was served "
      + "out. They are different grounds, they have different waiting periods, and the form sends this one "
      + "to a different proposed order — \"[Use Order Concerning Sealing/Expunging of Records - Minn. Stat. "
      + "§ 609A.02, subd. 3 (court form EXP105)].\" If you were convicted rather than discharged, this is "
      + "the wrong packet."
  },
  {
    key: "felony-deemed-lesser",
    match: /convicted of a felony that is deemed to be/i,
    routedOrder: "Order Concerning Sealing/Expunging of Records - Minn. Stat. § 609A.02, subd. 3 (court form EXP105)",
    reason:
      "This box is EXP102 item 9's ninth ground: \"You were convicted of a felony that is deemed to be for "
      + "a gross misdemeanor or misdemeanor pursuant to Minn. Stat. § 609.13, subd. 1(2)\", with a wait of "
      + "four years since discharge of the sentence if the conviction was for an offence listed in Minn. "
      + "Stat. § 609A.02, subd. 3(b), or five years for any other offence. It is a conviction ground with "
      + "its own two-speed waiting period and its own proposed order — \"[Use Order Concerning "
      + "Sealing/Expunging of Records - Minn. Stat. § 609A.02, subd. 3 (court form EXP105)].\" This packet "
      + "carries EXP106. Leave it empty here."
  },
  {
    key: "felony-listed-offense",
    match: /convicted of a felony violation of an offense listed/i,
    routedOrder: "Order Concerning Sealing/Expunging of Records - Minn. Stat. § 609A.02, subd. 3 (court form EXP105)",
    reason:
      "This box is EXP102 item 9's tenth ground: \"You were convicted of a felony violation of an offense "
      + "listed in Minn. Stat. § 609A.02, subd. 3(b), and have not been convicted of a new crime for at "
      + "least four years since discharge of the sentence for the crime.\" Subdivision 3(b) is a named list "
      + "of felonies that may be expunged after four years; whether your offence is on that list is a "
      + "question about your own record, which this packet does not hold. The form sends this ground to "
      + "\"[Use Order Concerning Sealing/Expunging of Records - Minn. Stat. § 609A.02, subd. 3 (court form "
      + "EXP105)].\" This packet carries EXP106. Leave it empty here."
  },
  {
    key: "judicial-records-only",
    match: /does not qualify for expungement under/i,
    routedOrder: "Findings of Fact, Conclusions of Law and Order to Seal/Expunge Judicial Records Only (court form EXP107)",
    reason:
      "This box is EXP102 item 9's eleventh ground: \"You were convicted of an offense that does not "
      + "qualify for expungement under Minn. Stat. § 609A.02, subd. 3, but you believe you have "
      + "rehabilitated yourself. You believe that the benefit to you outweighs the disadvantage to the "
      + "public and the burden on the court.\" It asks the court to seal its own file only: the form sends "
      + "it to \"[Use Findings of Fact, Conclusions of Law and Order to Seal/Expunge Judicial Records Only "
      + "(court form EXP107).]\", which this packet does not carry, and which does not reach records held "
      + "outside the courthouse. Leave it empty here."
  }
]);

const SOURCES = Object.freeze([
  {
    key: "EXP102", formNumber: "EXP102", instrumentKind: "primary_filing",
    component: "component:mn_petition_15218-primary-filing-1",
    sourceId: "official-form:EXP102", role: "participant_filing",
    path: "LegalEase Minnesota/EXP102_Current-2.pdf",
    sha256: "c98430f1a9c7a6d399b7d01de1ef2eee0df5f0a1a07e89a703b307977d7bf541",
    title: "Notice of Hearing and Petition for Expungement", revision: "Rev 7/24"
  },
  {
    key: "EXP104", formNumber: "EXP104", instrumentKind: "certificate_of_service",
    component: "component:mn_petition_15218-certificate-of-service-2",
    sourceId: "official-form:EXP104", role: "unmailed_service_certificate",
    path: "LegalEase Minnesota/EXP104_Current.pdf",
    sha256: "0e776a93b61f28f38fc6b318a9f59b78de4e0cbec102236364cf59ab061b423c",
    title: "Proof of Service", revision: "Rev 1/25"
  },
  {
    key: "EXP106", formNumber: "EXP106", instrumentKind: "proposed_order",
    component: "component:mn_petition_15218-proposed-order-3",
    sourceId: "official-form:EXP106", role: "court_order",
    path: "LegalEase Minnesota/EXP106_Current.pdf",
    sha256: "da7080f9c0b0135a79b537545e5448da438b63ae0de5d69c25e2513f1170bd85",
    title: "Order Concerning Sealing/Expunging of Records (Minn. Stat. § 609A.02, subd. 1 or 2)",
    revision: "Rev 1/24"
  },
  {
    key: "FEE102", formNumber: "FEE102", instrumentKind: "fee_waiver",
    component: "component:mn_petition_15218-fee-waiver-4",
    sourceId: "official-form:FEE102", role: "sworn_financial_affidavit",
    path: "STATES/MN/04_SUPPORTING_PROCESS/MN__SUPPORT__FEE102__affidavit-to-request-fee-waiver__REV-2024-07__EN.pdf",
    sha256: "b8415cddaa06a9c76cf2c4949aee36efe22e3b0ba98783a74063094150c72da8",
    title: "Affidavit to Request Fee Waiver", revision: "Rev 07/24"
  }
]);

const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.first_name": "Jordan",
  "participant.middle_name": "Avery",
  "participant.last_name": "Reyes",
  "participant.date_of_birth": "1991-04-17",
  "participant.street_address": "118 Maple Street",
  "participant.city": "Springfield",
  "participant.state": "MN",
  "participant.zip": "55101",
  "participant.city_state_zip": "Springfield, MN 55101",
  "participant.phone": "555-0142",
  "participant.email": "jordan.reyes@example.com",
  "matter.county": "Example County",
  "matter.county_or_city": "Example County",
  "matter.case_number": "62-CR-20-1234",
  "matter.offense_date": "2019-08-04",
  "matter.charge": "Fifth-degree possession of a controlled substance"
};

const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran",
  "participant.first_name": "Alexandrina-Katharine",
  "participant.middle_name": "Montgomery-Vandenberg-Oyelaran",
  "participant.last_name": "Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.zip": "55101-9999",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, MN 55101-9999",
  "participant.phone": "555-0142 ext. 44821",
  "participant.email": "alexandrina.montgomery.vandenberg.oyelaran@example-long-domain-name.org",
  "matter.county": "Saint Bartholomew County",
  "matter.county_or_city": "Saint Bartholomew",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.charge":
    "Fifth-degree possession of a controlled substance, aiding and abetting, continued for dismissal"
};

// ---------------------------------------------------------------------------
// plumbing
// ---------------------------------------------------------------------------
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

/*
 * Carry the committed source-identity tier for any source the committed wiring
 * record already names. A tier is an assertion about how firmly a source was
 * identified; this builder does not compute one, it hardcodes one, so it is not
 * the authority for changing what another component recorded. A source the
 * committed record has never seen keeps the value composed here.
 */
function preservedSourceTiers(wiringPath, composed) {
  let previous = null;
  try { previous = JSON.parse(fs.readFileSync(wiringPath, "utf8")); } catch { return composed; }
  const held = new Map(((previous?.binding?.sourceVersion) ?? [])
    .filter((row) => row && typeof row.sourceId === "string")
    .map((row) => [row.sourceId, row]));
  return composed.map((row) => {
    const before = held.get(row.sourceId);
    if (!before || typeof before.tier !== "string") return row;
    /* A tier describes the identification of THESE bytes. If the source binary
     * itself moved, the committed tier no longer describes it and is dropped. */
    if (before.sha256 !== row.sha256) return row;
    return { ...row, tier: before.tier };
  });
}
const round = (n) => Number(Number(n).toFixed(2));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const absFor = (rel) => path.join(ROOT, rel);
const writeJson = (rel, value) => {
  fs.mkdirSync(path.dirname(absFor(rel)), { recursive: true });
  fs.writeFileSync(absFor(rel), `${JSON.stringify(value, null, 2)}\n`);
};
function fail(message, detail = null) {
  throw new Error(detail === null ? message : `${message}: ${detail}`);
}

const cleanText = (value) => normalizeHarvestedText(String(value ?? ""))
  .replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").replace(/[:.,;\s]+$/, "").trim();

/** Every page content stream of one page, decoded. */
function contentStringOf(page) {
  const contents = page.node.Contents();
  if (!contents) return "";
  const streams = contents instanceof PDFArray
    ? contents.asArray().map((ref) => page.node.context.lookup(ref))
    : [contents];
  let out = "";
  for (const stream of streams) {
    if (!(stream instanceof PDFRawStream)) continue;
    try { out += `${Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1")}\n`; } catch { /* skip */ }
  }
  return out;
}

// ---------------------------------------------------------------------------
// the checkbox: its cell from the page, its outline from the font program
// ---------------------------------------------------------------------------
/*
 * The ballot box these forms print is a single two-byte CID in a Type0 subset
 * of MS-Gothic. The shared extractor splits it into U+0007 and U+0006, so the
 * pair is recombined here into the one glyph it is, and the box actually
 * INKED inside that cell is read out of the subset's own `glyf` entry rather
 * than assumed to fill the em. A mark placed on the em square would overhang
 * the printed rule on three sides.
 */
/** The glyph bounding box of one GID, as fractions of the em, read from a TrueType blob. */
function glyfBoundsOf(fontBytes, gid) {
  const data = fontBytes;
  if (data.length < 12) return null;
  const numTables = data.readUInt16BE(4);
  const tables = new Map();
  for (let i = 0; i < numTables; i += 1) {
    const off = 12 + 16 * i;
    if (off + 16 > data.length) return null;
    tables.set(data.subarray(off, off + 4).toString("latin1"),
      { offset: data.readUInt32BE(off + 8), length: data.readUInt32BE(off + 12) });
  }
  const head = tables.get("head"); const loca = tables.get("loca"); const glyf = tables.get("glyf");
  if (!head || !loca || !glyf) return null;
  const unitsPerEm = data.readUInt16BE(head.offset + 18);
  if (!unitsPerEm) return null;
  const longLoca = data.readInt16BE(head.offset + 50) === 1;
  const count = longLoca ? loca.length / 4 - 1 : loca.length / 2 - 1;
  if (gid < 0 || gid >= count) return null;
  const at = (n) => (longLoca
    ? data.readUInt32BE(loca.offset + 4 * n)
    : data.readUInt16BE(loca.offset + 2 * n) * 2);
  const start = at(gid); const end = at(gid + 1);
  if (end <= start) return null;
  const base = glyf.offset + start;
  if (base + 10 > data.length) return null;
  return {
    unitsPerEm,
    xMin: data.readInt16BE(base + 2) / unitsPerEm, yMin: data.readInt16BE(base + 4) / unitsPerEm,
    xMax: data.readInt16BE(base + 6) / unitsPerEm, yMax: data.readInt16BE(base + 8) / unitsPerEm
  };
}

/** Every <cid> -> U+2610 mapping a ToUnicode stream declares. */
function ballotBoxCidsOf(toUnicodeText) {
  const cids = new Set();
  for (const block of toUnicodeText.match(/beginbfchar([\s\S]*?)endbfchar/g) ?? []) {
    for (const pair of block.matchAll(/<([0-9A-Fa-f]{4})>\s*<([0-9A-Fa-f]{4,})>/g)) {
      if (parseInt(pair[2].slice(0, 4), 16) === 0x2610) cids.add(parseInt(pair[1], 16));
    }
  }
  for (const block of toUnicodeText.match(/beginbfrange([\s\S]*?)endbfrange/g) ?? []) {
    for (const row of block.matchAll(/<([0-9A-Fa-f]{4})>\s*<([0-9A-Fa-f]{4})>\s*<([0-9A-Fa-f]{4,})>/g)) {
      const lo = parseInt(row[1], 16); const hi = parseInt(row[2], 16);
      const target = parseInt(row[3].slice(0, 4), 16);
      for (let cid = lo; cid <= hi && cid - lo <= 0xffff; cid += 1) {
        if (target + (cid - lo) === 0x2610) cids.add(cid);
      }
    }
  }
  return cids;
}

/**
 * Every ballot-box glyph this document can print, keyed by the two one-byte
 * characters the shared extractor splits its CID into.
 *
 * The CID is not the same on every Minnesota form — EXP102, EXP104 and EXP106
 * print <0706> and FEE102 prints <057F> — so it is read out of each document's
 * own ToUnicode map rather than assumed, and the box actually INKED inside the
 * em is read out of that subset's own `glyf` entry.
 */
function checkboxGlyphsOf(pdf) {
  const found = new Map();
  const seenFonts = new Set();
  for (const page of pdf.getPages()) {
    const resources = page.node.get(PDFName.of("Resources"));
    if (!resources) continue;
    const ctx = page.node.context;
    const fonts = ctx.lookup(resources).get(PDFName.of("Font"));
    if (!fonts) continue;
    for (const [, ref] of ctx.lookup(fonts).entries()) {
      const fontKey = String(ref);
      if (seenFonts.has(fontKey)) continue;
      seenFonts.add(fontKey);
      const font = ctx.lookup(ref);
      if (String(font.get(PDFName.of("Subtype"))) !== "/Type0") continue;
      const toUnicodeStream = ctx.lookup(font.get(PDFName.of("ToUnicode")));
      if (!(toUnicodeStream instanceof PDFRawStream)) continue;
      const cids = ballotBoxCidsOf(Buffer.from(decodePDFRawStream(toUnicodeStream).decode()).toString("latin1"));
      if (cids.size === 0) continue;
      const descendants = ctx.lookup(font.get(PDFName.of("DescendantFonts")));
      const descendant = ctx.lookup(descendants.get(0));
      const cidToGidMap = String(descendant.get(PDFName.of("CIDToGIDMap")) ?? "/Identity");
      const descriptor = ctx.lookup(descendant.get(PDFName.of("FontDescriptor")));
      const file = ctx.lookup(descriptor.get(PDFName.of("FontFile2")));
      const program = file instanceof PDFRawStream ? Buffer.from(decodePDFRawStream(file).decode()) : null;
      for (const cid of cids) {
        const high = String.fromCharCode((cid >> 8) & 0xff);
        const low = String.fromCharCode(cid & 0xff);
        const bounds = program && cidToGidMap === "/Identity" ? glyfBoundsOf(program, cid) : null;
        found.set(high + low, {
          cid: cid.toString(16).padStart(4, "0").toUpperCase(),
          cidToGidMap,
          outline: bounds,
          outlineBasis: bounds ? "embedded_glyf_bbox_of_the_documents_own_subset" : "no_outline_available"
        });
      }
    }
  }
  return found;
}

/** Every printed selection control on one page, recombined and measured. */
function selectionControlsOfPage(lines, pageNumber, checkboxGlyphs) {
  const controls = [];
  for (const line of lines) {
    const chars = line.chars ?? [];
    const size = Number(line.size || 12);
    for (let i = 0; i < chars.length - 1; i += 1) {
      const glyph = checkboxGlyphs.get(chars[i].c + chars[i + 1].c);
      if (!glyph) continue;
      const originX = chars[i].x;
      /*
       * AN ADVANCE THIS BUILD CANNOT MEASURE IS null, NOT ZERO.
       *
       * The ballot box decodes as two one-byte chars, and the advance is the
       * sum of their widths. The shared extractor no longer returns a per-char
       * width for these glyphs, and `(chars[i].w ?? 0) + (chars[i + 1].w ?? 0)`
       * turned that absence into the number 0 -- so every one of the 95
       * controls in this family published glyphAdvance 0, a figure that reads
       * as a measurement of a zero-width box and is in fact the absence of a
       * measurement. The geometry itself is unaffected, because every one of
       * these controls has a readable embedded outline and the outline is what
       * the cell is measured from; the advance is only the fallback. So the
       * fallback is now honest about not being available, and a control that
       * has NEITHER an outline nor an advance stops the build rather than
       * getting a cell invented for it out of a zero.
       */
      const widths = [chars[i].w, chars[i + 1].w];
      const advance = widths.every((w) => Number.isFinite(w)) ? widths[0] + widths[1] : null;
      const outline = glyph.outline;
      if (!outline && advance === null) {
        fail("a printed selection control has neither a readable glyph outline nor a measurable advance, "
          + "so its cell cannot be measured from this source",
          `page ${pageNumber} at x ${round(originX)} y ${round(line.y)}`);
      }
      const geometry = outline
        ? {
          x0: round(originX + outline.xMin * size), y0: round(line.y + outline.yMin * size),
          x1: round(originX + outline.xMax * size), y1: round(line.y + outline.yMax * size),
          basis: "glyph_origin_from_the_text_matrix_plus_the_embedded_glyf_bounding_box"
        }
        : {
          x0: round(originX), y0: round(line.y), x1: round(originX + advance), y1: round(line.y + size),
          basis: "glyph_advance_cell_because_no_outline_was_readable"
        };
      geometry.width = round(geometry.x1 - geometry.x0);
      geometry.height = round(geometry.y1 - geometry.y0);
      controls.push({
        id: `p${pageNumber}-cb-y${round(line.y)}-x${round(originX)}`,
        page: pageNumber, construction: "printed_checkbox_cid_glyph",
        printedGlyph: "☐", observedState: "unmarked",
        sourceCid: glyph.cid, outlineBasis: glyph.outlineBasis,
        decodedAsTwoOneByteCharsByTheSharedExtractor: true,
        glyphAdvance: advance === null ? null : round(advance),
        glyphAdvanceMeasured: advance !== null,
        whyGlyphAdvanceIsNull: advance === null
          ? "the shared text extractor returned no per-character width for the two bytes this ballot box "
            + "decodes as. The control's cell is measured from its embedded glyph outline instead, and this "
            + "field is null because it was not measured -- never 0, which would read as a zero-width box."
          : null,
        printedSize: round(size),
        geometry, printedContext: cleanText(line.text)
      });
      i += 1;
    }
  }
  return controls;
}

// ---------------------------------------------------------------------------
// the blanks: the source's own drawn rules
// ---------------------------------------------------------------------------
const spanOf = (line) => {
  const chars = (line?.chars ?? []).filter((ch) => String(ch.c).trim() !== "");
  if (!chars.length) return null;
  return { x0: Math.min(...chars.map((c) => c.x)), x1: Math.max(...chars.map((c) => c.x + c.w)) };
};

function inkBetween(line, x0, x1) {
  let width = 0;
  for (const ch of line.chars ?? []) {
    if (!String(ch.c).trim()) continue;
    width += Math.max(0, Math.min(ch.x + ch.w, x1) - Math.max(ch.x, x0));
  }
  return width;
}

/*
 * A PRINTED LINE UNDERLINES THE NEAREST RULE BENEATH IT, AND ONLY THAT ONE.
 *
 * The window below is generous on purpose -- it has to reach a rule drawn a
 * little under its text -- and a large heading reaches further than a small
 * one, because the window scales with the line's own size. On EXP104 page 1
 * the 14-point heading "State of Minnesota   District Court" reaches 18.25
 * points down, and TWO rules sit inside that reach: the one drawn 3.46 points
 * under it, which it really does underline, and the Judicial District rule
 * 16.66 points under it, which it does not. Without this test the heading is
 * counted as ink on both, the second measures 0.70 of its width as "printed
 * text already there", and a blank the participant has to fill is classified
 * NOT_A_FIELD and disappears from the packet's own instructions.
 *
 * Physically a rule cannot underline text that has another rule between it and
 * the text. That is the whole test: a candidate line is ignored when a second
 * horizontal rule lies between the two and shares this rule's x span. It
 * cannot turn a genuine underline into a blank -- a genuine underline has
 * nothing between it and its text -- so it only ever removes a false one.
 */
function ruleLiesBetween(rule, line, rules) {
  return (rules ?? []).some((other) => other !== rule
    && other.y > rule.y + 0.75 && other.y < line.y - 0.75
    && Math.min(other.endX, rule.endX) - Math.max(other.x, rule.x) >= 4);
}

/** How much printed text already sits on this rule. A rule under printed words is an underline. */
function inkOnRule(rule, lines, rules = []) {
  let best = { ink: 0, line: null };
  for (const line of lines) {
    const size = line.size || 12;
    if (line.y < rule.y - 0.75 || line.y > rule.y + size * 1.3) continue;
    if (ruleLiesBetween(rule, line, rules)) continue;
    const ink = inkBetween(line, rule.x, rule.endX);
    if (ink > best.ink) best = { ink, line };
  }
  const fraction = rule.width > 0 ? best.ink / rule.width : 0;
  return { fraction: round(fraction), text: cleanText(best.line?.text ?? "") };
}

/*
 * The printed words immediately left of a rule, cut at the last visible gap.
 *
 * These forms print two captioned blanks on one line — "Judicial District: ___
 * Case Type: ___" — so everything left of the second rule is both captions.
 * Collapsing the whitespace first and splitting on runs of spaces cannot work,
 * because the gap is drawn as advance rather than as space characters. The cut
 * is therefore positional: the last gap wider than a space in the printed size.
 */
function captionLeftOfRule(line, ruleX) {
  const chars = (line?.chars ?? []).filter((ch) => ch.x + ch.w <= ruleX + 0.75)
    .sort((a, b) => a.x - b.x);
  if (!chars.length) return "";
  const gap = Math.max(4, (Number(line.size) || 12) * 0.6);
  let start = 0;
  for (let i = 1; i < chars.length; i += 1) {
    if (chars[i].x - (chars[i - 1].x + chars[i - 1].w) > gap) start = i;
  }
  return cleanText(chars.slice(start).map((ch) => ch.c).join(""));
}

function textBetween(line, x0, x1) {
  return cleanText((line?.chars ?? [])
    .filter((ch) => ch.x >= x0 - 0.75 && ch.x + ch.w <= x1 + 0.75).map((ch) => ch.c).join(""));
}

/** The printed words this rule is a blank for. */
function captionForRule(rule, lines) {
  const size = 12;
  const onSameLine = lines.filter((line) => line.y >= rule.y - 0.75 && line.y <= rule.y + size * 1.3);
  for (const line of onSameLine) {
    const before = captionLeftOfRule(line, rule.x);
    if (before) return { caption: before, basis: "printed_text_left_of_the_rule_cut_at_the_last_printed_gap" };
  }
  const overlapping = (line) => {
    const span = spanOf(line);
    return span && Math.min(span.x1, rule.endX) - Math.max(span.x0, rule.x) >= 4;
  };
  const above = lines.filter((line) => line.y > rule.y + 2 && line.y <= rule.y + 34)
    .filter(overlapping).sort((a, b) => a.y - b.y)[0];
  if (above) return { caption: cleanText(above.text), basis: "nearest_printed_line_above_the_rule" };
  const below = lines.filter((line) => line.y < rule.y - 2 && line.y >= rule.y - 34)
    .filter(overlapping).sort((a, b) => b.y - a.y)[0];
  if (below) return { caption: cleanText(below.text), basis: "nearest_printed_line_below_the_rule" };
  return { caption: "", basis: "no_adjacent_printed_caption" };
}

/*
 * The full-content-width rule these forms draw above and below a page heading.
 * It is a printed divider, not a place to write, and every one of them measures
 * the same width because the same template draws them.
 */
const DIVIDER_WIDTH_MIN = 465;

// ---------------------------------------------------------------------------
// what each measured blank is
// ---------------------------------------------------------------------------
const SUPPLY = (effectiveLabel, what) => ({
  writable: false, approvedDisposition: "REQUIRED_BEFORE_FILING", requiredBeforeFiling: true,
  effectiveLabel, what
});
const WRITE = (factId, effectiveLabel) => ({ writable: true, factId, effectiveLabel });
const PROTECT = (effectiveLabel, category, reason) => ({
  writable: false, approvedDisposition: "PROTECTED_FIELD", effectiveLabel, category, reason
});
const COURT_COMPLETES = (effectiveLabel, trigger) => ({
  writable: false, approvedDisposition: "PROTECTED_FIELD", effectiveLabel,
  category: "court_prosecutor_clerk_or_agency_owned", reason: trigger,
  courtCompletesAfterFiling: true, laterCompletionTrigger: trigger
});
const ELECTION = (effectiveLabel, why) => ({
  writable: false, approvedDisposition: "PARTICIPANT_ELECTION_GENUINE", effectiveLabel,
  category: "participant_sworn_narrative_or_legal_election", reason: why
});
const NOT_A_FIELD = (why) => ({ terminal: false, writable: false, approvedDisposition: "NOT_A_FIELD", reason: why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";

/*
 * The caption band every Minnesota district-court form prints at the top of its
 * first page. The words are the form's own; the facts are the participant's and
 * the matter's, and they are the same four on all four binaries.
 */
function captionBandDecision(caption, blank) {
  const text = caption.toLowerCase();
  if (/^county of$/.test(text) || /^county$/.test(text)) return WRITE("matter.county", "County of the case");
  if (/court file number/.test(text)) return WRITE("matter.case_number", "Court File Number");
  if (/^judicial district$/.test(text)) {
    return SUPPLY("Judicial District of the court",
      "the judicial district number of the county where your case was decided. Minnesota has ten judicial "
      + "districts and www.mncourts.gov lists which counties are in each");
  }
  if (/^case type$/.test(text)) {
    /*
     * DECIDED ON THE MEASUREMENT, NOT ON THE CAPTION.
     *
     * EXP102, EXP104 and EXP106 print their own answer, Criminal, on this rule,
     * and their measured ink fractions say so: 0.23, 0.34 and 0.25. FEE102 is
     * the general civil fee-waiver affidavit, it prints no case type at all,
     * and its measured ink fraction on the same captioned rule is 0.00. Reading
     * the caption alone gave all four the same sentence, so FEE102's Case Type
     * rule carried a stated reason its own measurement contradicts, and a blank
     * the participant has to fill was named nowhere in the packet.
     *
     * This is the same shape as the Plaintiff/Petitioner rule a few lines
     * below, which FEE102 also prints empty while the three court forms print
     * it, and it is answered the same way: nothing is written, and the
     * participant is told what goes in it and where to copy it from.
     */
    if ((blank?.printedInkFractionOnTheRule ?? 0) > 0) {
      return NOT_A_FIELD("the form prints its own answer, Criminal, on this rule");
    }
    return SUPPLY("Case Type on the fee-waiver affidavit caption",
      "the case type of the criminal case this fee waiver belongs to. FEE102 is the general civil fee-waiver "
      + "form and prints no case type on its caption, while the three court forms in this packet all print "
      + "Criminal on their own faces. Copy the case type exactly as EXP102 prints it");
  }
  if (/^state of minnesota$/.test(text)) {
    return NOT_A_FIELD("the form prints the plaintiff, State of Minnesota, on this rule");
  }
  return null;
}

/*
 * The party rule beneath the printed "VS" of a Minnesota district-court caption
 * is the defendant's name line: the forms print "State of Minnesota" over the
 * first rule, "Plaintiff", "VS", then the second rule, then "Defendant". The
 * caption harvester reaches the nearest printed line above, which is "VS", so
 * the rule is named here rather than left to the harvest.
 */
const isDefendantRule = (caption) => /^vs$/i.test(caption) || /^vs\/and$/i.test(caption)
  || /^defendant/i.test(caption) || /^defendant\/respondent$/i.test(caption);

/**
 * What this build does with one measured blank on one form.
 *
 * Returns null when no rule in this table reaches it, and the caller then
 * records it as unclassified — which is a defect, and is the point: a blank
 * nobody could place is exactly the one that goes missing.
 */
function decideBlank(document, blank, captionBandFloorY) {
  const caption = cleanText(blank.printedCaption).toLowerCase();
  const { page } = blank;
  const inCaptionBand = page === 1 && blank.measured.baselineY >= captionBandFloorY;

  if (blank.construction === "printed_divider_rule") {
    return NOT_A_FIELD("a full-content-width rule the template draws above and below a page heading");
  }
  if (blank.construction === "underlined_printed_text") {
    return NOT_A_FIELD("the rule underlines printed text the form already supplies");
  }

  if (inCaptionBand) {
    const band = captionBandDecision(caption, blank);
    if (band) return band;
    if (isDefendantRule(caption)) {
      return document.role === "sworn_financial_affidavit"
        ? WRITE("participant.full_legal_name", "Defendant/Respondent")
        : WRITE("participant.full_legal_name", "Defendant");
    }
    if (/^plaintiff/i.test(caption) || /^petitioner$/i.test(caption)) {
      if (document.role !== "sworn_financial_affidavit") {
        return NOT_A_FIELD("the form prints the plaintiff, State of Minnesota, above this rule");
      }
      /*
       * A NEAR-MISS, REFUSED BY ROLE.
       *
       * FEE102 is the general civil fee-waiver affidavit and prints no party, so
       * its caption carries an empty plaintiff line. Left to the shared
       * semantics that printed caption binds participant.full_legal_name: passing
       * "Plaintiff/Petitioner" to decideBinding returns the participant's own
       * name, writable. On a criminal caption whose plaintiff is the State of
       * Minnesota that would put the participant on both sides of their own case.
       * No allowlisted fact names the plaintiff of a criminal matter, so nothing
       * is written here and the participant is told exactly what goes in it.
       */
      return SUPPLY("Plaintiff/Petitioner on the fee-waiver affidavit caption",
        "the plaintiff of the criminal case on the FEE102 caption. FEE102 is the general civil fee-waiver "
        + "form and prints no party, while the three court forms in this packet all print State of Minnesota "
        + "over Plaintiff on their own faces. Copy the plaintiff exactly as EXP102 prints it");
    }
  }

  // ---- EXP106: the court's own order, filled to its caption only -----------
  if (document.role === "court_order") {
    if (inCaptionBand && /date of birth/.test(caption)) {
      return WRITE("participant.date_of_birth", "Date of Birth");
    }
    return PROTECT("Court finding or ordering line on the proposed order", COURT_OWNED,
      "EXP106 is the order the district court signs. Its findings, its ordering paragraphs, the agencies it "
      + "names and its signature block are completed by the judge after the hearing.");
  }

  // ---- EXP104: a certificate of mailing, before mailing --------------------
  if (document.role === "unmailed_service_certificate") {
    return PROTECT("Proof-of-service line completed by whoever mails the packet", SIGNATURE,
      "EXP104 states, under Minn. Stat. § 358.116, that the signer HAS served the attached documents by mail "
      + "on the parties checked at the addresses listed. Nothing on it is true until the mailing happens, so "
      + "the mailer's name, the date and city of mailing, every recipient box, every recipient address and "
      + "the signature block are completed by whoever mails the packet.");
  }

  // ---- FEE102: a sworn financial affidavit --------------------------------
  if (document.role === "sworn_financial_affidavit") {
    if (page === 6 && blank.measured.baselineY <= 200) {
      return PROTECT("Signature block of the fee-waiver affidavit", SIGNATURE,
        "the affidavit's signature, its signing date and the block where the oath is administered");
    }
    return SUPPLY("Fee-waiver affidavit (FEE102) financial statement line",
      "your own financial details on the fee-waiver affidavit (FEE102) — household size, income, public "
      + "assistance, property and monthly expenses. LegalEase does not hold and does not ask for your "
      + "financial information, so every one of these lines is yours to complete before you file");
  }

  // ---- EXP102: the petition ------------------------------------------------
  if (page === 1) {
    // Everything below the caption band on page 1 is the notice of hearing.
    return COURT_COMPLETES("Hearing date, time, courtroom and remote-hearing credentials",
      "the district court sets the hearing and supplies its date, its time, the courtroom, the courthouse "
      + "address and the Zoom meeting ID and passcode after the petition is filed");
  }

  if (page === 2) {
    if (/^first$/.test(caption)) return WRITE("participant.first_name", "First Name");
    if (/^middle$/.test(caption)) return WRITE("participant.middle_name", "Middle Name");
    if (/^last$/.test(caption)) return WRITE("participant.last_name", "Last Name");
    if (/date of birth/.test(caption)) return WRITE("participant.date_of_birth", "Date of Birth");
    if (/street address/.test(caption)) return WRITE("participant.street_address", "Street Address");
    if (/city, state, zip/.test(caption)) return WRITE("participant.city_state_zip", "City, State, Zip");
    if (blank.measured.baselineY >= 540) {
      return SUPPLY("Item 2 list of other legal names and aliases",
        "item 2 — every other legal name or alias you have been known by");
    }
    if (blank.measured.baselineY >= 300 && blank.measured.baselineY <= 360) {
      return SUPPLY("Item 5 list of other addresses lived at since the offence",
        "item 5 — every other address you have lived at since the date of the offence, with street, city "
        + "and state, unless you check the box saying you have only lived at your current address");
    }
    return ELECTION("Item 6 statement — why you are asking for an expungement",
      "item 6 asks, in your own words, why you are asking for an expungement, under what legal authority, "
      + "and why it should be granted. It is a sworn statement in your voice and the platform does not "
      + "write it for you.");
  }

  if (page === 3) {
    if (blank.measured.baselineY >= 600) {
      return ELECTION("Item 6 statement, continued",
        "item 6 continues here. It is your own sworn statement of why you are asking for an expungement.");
    }
    if (blank.construction === "table_border_rule") {
      return NOT_A_FIELD("the printed border of the item 7 table's column headings");
    }
    if (blank.construction === "table_cell_rule") {
      return SUPPLY("Item 7 criminal-record table cell",
        "item 7 — your FULL criminal record. The form requires every conviction and every charge, from "
        + "Minnesota and from any other state, federal court or foreign country, whether it happened before "
        + "or after this offence. LegalEase holds the one case you screened and not the rest, and a row "
        + "filled in from that one case would read as a complete record when it is not, so the whole table "
        + "is left for you");
    }
    return SUPPLY("Item 8 list of earlier expungement, pardon or sealing requests",
      "item 8 — each earlier request you have made for an expungement, a pardon or a sealing of a criminal "
      + "record, if you answered Yes");
  }

  if (page === 5) {
    if (/^case #$/.test(caption)) return WRITE("matter.case_number", "Case Number of the offense to expunge");
    /*
     * A NEAR-MISS, REFUSED BY ROLE RATHER THAN AVOIDED QUIETLY.
     *
     * Item 10 asks for the "Jurisdiction/City where the offense occurred". Left
     * to the shared semantics that printed caption binds participant.city — the
     * participant's own home city — and the venue of the offence would have been
     * filled in with where the participant lives now. It is measured: passing the
     * form's own caption to decideBinding returns participant.city, writable.
     * The blank takes the county or city of the OFFENCE, so the binding label
     * names that and the fact is the matter's, not the participant's.
     */
    if (/jurisdiction\/city where the offense occurred/.test(caption)) {
      return WRITE("matter.county", "County or City where the offense occurred");
    }
    if (/type of offense/.test(caption)) return WRITE("matter.charge", "Type of offense");
    if (/date of offense/.test(caption)) return WRITE("matter.offense_date", "Date of offense");
    return SUPPLY("Item 11 list of identifiable victims",
      "item 11 — the names of any identifiable victims in this case, if you answered Yes");
  }

  if (page === 6) {
    if (blank.measured.baselineY >= 240) {
      return ELECTION("Items 13 and 16 statement — rehabilitation and mitigating or aggravating factors",
        "items 13 and 16 ask, in your own words, what steps you have taken toward personal rehabilitation "
        + "and what mitigating or aggravating factors relate to the offence. Both are sworn statements in "
        + "your voice.");
    }
    // The two rules of the declaration line share one printed caption, "Date:
    // Signature:", so they are told apart by which of the two rules they are:
    // the signature rule is the right-hand one.
    if (/signature/.test(caption)) {
      return blank.measured.x0 >= 290
        ? PROTECT("Signature on the petition", SIGNATURE, "your signature on the petition")
        : PROTECT("Signature date on the petition", SIGNATURE, "the date you sign the petition");
    }
    if (/^date$/.test(caption)) {
      return PROTECT("Signature date on the petition", SIGNATURE, "the date you sign the petition");
    }
    if (/county and state where signed/.test(caption)) {
      return PROTECT("County and state where the petition is signed", SIGNATURE,
        "the county and state where you sign, which is known only when you sign");
    }
    if (/^name$/.test(caption)) return WRITE("participant.full_legal_name", "Printed Name");
    if (/^address$/.test(caption)) return WRITE("participant.street_address", "Street Address");
    if (/city\/state\/zip/.test(caption)) return WRITE("participant.city_state_zip", "City, State, Zip");
    if (/^phone$/.test(caption)) return WRITE("participant.phone", "Telephone");
    if (/^email$/.test(caption)) return WRITE("participant.email", "Email Address");
  }

  return null;
}

/** What this build does with one measured selection control. */
function decideSelection(document, control, elected) {
  const context = cleanText(control.printedContext);
  const shortContext = context.length > 110 ? `${context.slice(0, 107)}...` : context;
  if (elected) {
    return {
      mark: true, approvedDisposition: "ROUTE_ELECTION_MADE", routeDetermined: true,
      effectiveLabel: `Route election — ${shortContext}`,
      authority: document.role === "sworn_financial_affidavit" ? "Minn. Stat. § 563.01" : ROUTE_ELECTION.authority,
      why: document.role === "sworn_financial_affidavit"
        ? "FEE102 item 2 prints \"Choose one:\" and asks whether the affidavit accompanies pleadings or asks "
          + "only for copy fees to be waived. This packet contains the petition, the proof of service and the "
          + "proposed order, so the answer is a fact about the packet rather than a choice the participant "
          + "makes. The other branch of the same choose-one says the opposite and is left empty: marking both "
          + "would swear to two contradictory statements on one affidavit under Minn. Stat. § 563.01. If you "
          + "file this affidavit without the petition, asking only for copy fees to be waived, unmark this box "
          + "and mark that one instead."
        : ROUTE_ELECTION.why
    };
  }
  if (document.role === "court_order") {
    return {
      mark: false, approvedDisposition: "PROTECTED_FIELD", category: COURT_OWNED,
      effectiveLabel: `Court finding or ordering box — ${shortContext}`,
      reason: "a finding or an ordering box on the order the district court signs"
    };
  }
  if (document.role === "unmailed_service_certificate") {
    return {
      mark: false, approvedDisposition: "PROTECTED_FIELD", category: SIGNATURE,
      effectiveLabel: `Proof-of-service recipient box — ${shortContext}`,
      reason: "checking this box states, under Minn. Stat. § 358.116 and penalty of perjury, that this party "
        + "was served by mail. The mailing has not happened when the packet is generated, so it is checked by "
        + "whoever mails the packet, after they mail it."
    };
  }
  if (document.role === "sworn_financial_affidavit" && FEE102_ITEM_2.alternativeBranch.test(context)) {
    return {
      mark: false, approvedDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      effectiveLabel: `Item 2 alternative this packet does not use — ${shortContext}`,
      routeConditionThatMakesItInapplicable:
        "FEE102 item 2 prints \"Choose one:\" and this packet carries pleadings to file with the affidavit "
        + "— the petition EXP102, the proof of service EXP104 and the proposed order EXP106 — so the first "
        + "branch is marked. This is the other branch of that same choose-one, and it says the opposite: "
        + "that there are no pleadings to file. It is not reachable while the first branch is marked.",
      reason:
        "the other branch of FEE102 item 2's printed \"Choose one:\". This packet marks the first branch, "
        + "because the pleadings are in the envelope with the affidavit. Leave this one empty: marking both "
        + "branches would swear to two contradictory statements on one affidavit under Minn. Stat. § 563.01. "
        + "If you file the affidavit WITHOUT the petition — asking only for copy fees to be waived — then "
        + "this is your branch, and you have to unmark the first one."
    };
  }
  if (document.role === "sworn_financial_affidavit") {
    return {
      mark: false, approvedDisposition: "PARTICIPANT_ELECTION_GENUINE",
      category: "participant_sworn_narrative_or_legal_election",
      effectiveLabel: `Fee-waiver affidavit sworn statement — ${shortContext}`,
      reason: "a sworn statement about your own finances or your own legal representation. The platform "
        + "holds no financial fact about you and does not answer this for you."
    };
  }
  // EXP102.
  if (control.page === 1) {
    return {
      mark: false, approvedDisposition: "PROTECTED_FIELD", category: COURT_OWNED,
      effectiveLabel: `Hearing-notice box — ${shortContext}`,
      courtCompletesAfterFiling: true,
      laterCompletionTrigger: "the district court sets the hearing and states whether it is remote or in person",
      reason: "the district court sets the hearing and states whether it is remote or in person"
    };
  }
  if (control.page === 4 || (control.page === 5 && /You were convicted|does not qualify/i.test(context))) {
    /*
     * ONE GROUND, ONE REASON. The ten boxes here are ten different statutory
     * bases, so one sentence repeated ten times is not a disclosure of any of
     * them -- it is the shape of the defect, not the repair. The ground is
     * matched against the form's own printed words and the build refuses if a
     * box matches none of them or more than one, so a revision that reworded
     * item 9 stops this build rather than shipping a reason describing a
     * ground the page no longer prints.
     */
    const matched = ITEM_9_GROUNDS_NOT_USED.filter((ground) => ground.match.test(context));
    if (matched.length !== 1) {
      fail("an EXP102 item 9 ground this build must explain matched no single printed entry",
        `${matched.length} match(es) for ${JSON.stringify(shortContext)}`);
    }
    const ground = matched[0];
    return {
      mark: false, approvedDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      effectiveLabel: `Item 9 qualification box not used on this route — ${shortContext}`,
      item9GroundKey: ground.key,
      routeConditionThatMakesItInapplicable:
        `this family is built for ${ROUTE_KEY}, the Minn. Stat. § 152.18 discharge, and binds EXP106 as its `
        + "proposed order. EXP102 item 9 offers one box per statutory basis and exactly one of them is "
        + `checked. This box is a different basis and the form directs a different order under it: "${ground.routedOrder}".`,
      reason: ground.reason
    };
  }
  return {
    mark: false, approvedDisposition: "PARTICIPANT_ELECTION_GENUINE",
    category: "participant_sworn_narrative_or_legal_election",
    effectiveLabel: `Petition sworn statement — ${shortContext}`,
    reason: "a sworn answer only you can give — whether you have lived at one address since the offence, "
      + "whether you have asked for an expungement before, whether there were identifiable victims or "
      + "protective orders, and whether you want the extra relief items 14 and 15 offer."
  };
}

/*
 * THE SELECTION-DISCLOSURE GUARD, AND WHY IT IS HERE AND NOT IN A SELF-TEST.
 *
 * This runs in the ORDINARY build path -- `node
 * scripts/build-census-v1-mn_petition_15218-set.mjs`, with no flag -- between
 * composing the two participant documents and writing the first byte. Nothing
 * in this repository's CI or integration chain runs a `--self-test`, and a
 * guard nothing runs refuses nothing: VF61 proved that by reintroducing a
 * defect a repair lane had just fixed and watching a plain `node <builder>`
 * exit 0 and write the bad values to disk.
 *
 * It refuses five things, each of which was true of the delivered bytes VF61
 * measured or is the shape those bytes could return to:
 *
 *   1. an unmarked selection control that does not say why it is empty. All
 *      ten EXP102 item 9 grounds carried `reason: null` in BOTH delivered
 *      records. `requiredOptionsMissing` read 0 throughout, because the shared
 *      reader never reaches a selection control on this field-map shape.
 *   2. two boxes leaning on one sentence. A single reason shared across many
 *      controls is the defect, not a pass -- il-seal-3yr-set carries 76 of 78
 *      controls under one boilerplate sentence.
 *   3. a box that reaches neither participant document. Both its printed words
 *      and its reason must be readable in the delivered markdown, matched
 *      against the raw file as an independent lane would grep it.
 *   4. the sweep sentence, in the exact words that were false of these bytes.
 *   5. a selection control in none of the four classes the guide describes,
 *      which is how a box goes missing from every list without any count
 *      changing.
 *
 * A COUNT IT COULD NOT TAKE WOULD BE null. Every count below is taken from the
 * rows this build is about to publish, so each is a measurement.
 */
const FALSE_SWEEP_SENTENCE = "Every other box in this packet is empty and is yours";

function auditSelectionDisclosure({ documents, selectionDispositions, otherGroundBoxes, participantInstructions }) {
  const classes = {
    marked: [], protectedField: [], otherStatutoryGround: [], participantElection: [], unclassified: []
  };
  for (const document of documents) {
    for (const row of selectionDispositions[document.key]) {
      // The rendered selection must carry the closed disposition the production
      // completeness audit consumes; a drawn tick is not an undisclosed blank.
      if (row.marked === true && row.disposition !== "selected_route_option") {
        fail("a rendered route selection lacks its completeness disposition", `${document.formNumber}/${row.selectionId}`);
      }
      const where = { form: document.formNumber, page: row.page, blankId: row.blankId, reason: row.reason ?? null };
      if (row.marked === true) classes.marked.push(where);
      else if (row.approvedDisposition === "PROTECTED_FIELD") classes.protectedField.push(where);
      else if (row.approvedDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE") classes.otherStatutoryGround.push(where);
      else if (row.approvedDisposition === "PARTICIPANT_ELECTION_GENUINE") classes.participantElection.push(where);
      else classes.unclassified.push({ ...where, approvedDisposition: row.approvedDisposition ?? null });
    }
  }
  const total = Object.values(classes).reduce((n, rows) => n + rows.length, 0);

  // (5) every box is in a class the guide describes.
  if (classes.unclassified.length > 0) {
    fail("a selection control is in none of the four classes the participant guide describes",
      JSON.stringify(classes.unclassified.slice(0, 6)));
  }

  // (1) every unmarked selection control says why it is empty.
  const withNoStatedReason = [...classes.protectedField, ...classes.otherStatutoryGround, ...classes.participantElection]
    .filter((row) => String(row.reason ?? "").trim().length === 0);
  if (withNoStatedReason.length > 0) {
    fail("a selection control is delivered empty with no stated reason, which no counter on this "
      + "field-map shape can see", `${withNoStatedReason.length}: `
      + JSON.stringify(withNoStatedReason.slice(0, 6).map((r) => `${r.form}/${r.blankId}`)));
  }

  // (2) no two boxes on another statutory ground lean on one sentence.
  const byReason = new Map();
  for (const row of classes.otherStatutoryGround) {
    const key = String(row.reason ?? "").trim();
    if (!byReason.has(key)) byReason.set(key, []);
    byReason.get(key).push(`${row.form}/${row.blankId}`);
  }
  const shared = [...byReason.entries()].filter(([, rows]) => rows.length > 1);
  if (shared.length > 0) {
    fail("boxes stating different statutory grounds share one reason; a reason that covers many grounds "
      + "explains none of them", JSON.stringify(shared.map(([, rows]) => rows)));
  }

  // (3) each of them reaches the participant, in the form's own words.
  const notInTheGuide = [];
  for (const box of otherGroundBoxes) {
    const wordsOnThePage = participantInstructions.includes(box.printedWords);
    const reasonOnThePage = participantInstructions.includes(String(box.reason ?? "").trim());
    if (!wordsOnThePage || !reasonOnThePage) {
      notInTheGuide.push({ box: `${box.form}/${box.blankId}`, wordsOnThePage, reasonOnThePage });
    }
  }
  if (notInTheGuide.length > 0) {
    fail("a box printed for another statutory ground is not named in the delivered participant guide",
      JSON.stringify(notInTheGuide.slice(0, 6)));
  }

  // (4) the sentence that swept them up is gone.
  if (participantInstructions.includes(FALSE_SWEEP_SENTENCE)) {
    fail("the delivered guide still tells the participant that every other box is theirs, while boxes "
      + "stating other statutory grounds are empty", JSON.stringify(FALSE_SWEEP_SENTENCE));
  }

  return {
    schemaVersion: "rcap-selection-disclosure-audit/v1",
    familyId: FAMILY_ID,
    whatThisIs:
      "Every selection control this family delivers, counted by what the packet says about it. It exists "
      + "because the fleet counter that should have caught a selection control with no stated reason "
      + "cannot see one on this family: the shared reader in "
      + "scripts/rcap-packet-completeness/verify-packet-completeness.mjs (readFieldRows, the "
      + "anchors-and-withheld shape) reads writableAnchors and withheld and does not read "
      + "selectionControls at all, so requiredOptionsMissing is structurally 0 here whatever these boxes "
      + "carry. That reader is shared code this lane does not own. This audit is measured in the build "
      + "path and the build refuses rather than delivering a non-zero count.",
    selectionControls: total,
    marked: classes.marked.length,
    protectedField: classes.protectedField.length,
    otherStatutoryGround: classes.otherStatutoryGround.length,
    participantElection: classes.participantElection.length,
    unclassified: classes.unclassified.length,
    selectionControlsWithNoStatedReason: withNoStatedReason.length,
    distinctReasonsAcrossOtherStatutoryGroundBoxes: byReason.size,
    otherStatutoryGroundBoxesNamedInTheParticipantGuide: otherGroundBoxes.length - notInTheGuide.length,
    requiredOptionsMissingAsTheSharedVerifierMeasuresIt: {
      value: 0,
      whyItIsNotAMeasurementOfThis:
        "the shared reader audits this family's writableAnchors and withheld rows and none of its "
        + "selection controls, so this number cannot move when a selection control loses its reason"
    }
  };
}

/** One selection control as an audited row, in the shared contract's vocabulary. */
function selectionRow(control, decision) {
  const refusalClass = TRUSTED_REFUSAL_CLASSES.has(decision.category) ? decision.category : null;
  return {
    selectionId: control.id, blankId: control.id, page: control.page,
    effectiveLabel: decision.effectiveLabel, printedContext: control.printedContext,
    construction: control.construction, sourceCid: control.sourceCid, geometry: control.geometry,
    isSelectionControl: true, marked: decision.mark === true,
    completenessDisposition: decision.mark === true ? null : decision.approvedDisposition,
    ...(decision.mark === true ? { disposition: "selected_route_option" } : {}),
    ...(refusalClass ? { refusalClass, category: refusalClass } : {}),
    ...(decision.routeDetermined ? { routeDetermined: true, authority: decision.authority } : {}),
    ...(decision.routeConditionThatMakesItInapplicable
      ? { routeConditionThatMakesItInapplicable: decision.routeConditionThatMakesItInapplicable } : {}),
    ...(decision.item9GroundKey ? { item9GroundKey: decision.item9GroundKey } : {}),
    ...(decision.courtCompletesAfterFiling
      ? { courtCompletesAfterFiling: true, laterCompletionTrigger: decision.laterCompletionTrigger } : {}),
    reason: decision.reason ?? decision.why ?? null,
    approvedDisposition: decision.approvedDisposition
  };
}

// ---------------------------------------------------------------------------
// census
// ---------------------------------------------------------------------------
/*
 * A CAPTION LABEL WITH NO RULE OF ITS OWN.
 *
 * Three of these four forms draw a rule after every caption label. EXP104 does
 * not: its caption is a bordered three-column table, and its "County" label
 * ends at x=107.88 with the next printed words 216.96 points to its right and
 * no rule anywhere on that baseline. There is nothing for the rule-based census
 * to find, so the county of the court would silently go unwritten on the proof
 * of service while it is written on the other three forms.
 *
 * The write box is still entirely measured: it starts at the label's own right
 * edge, taken from the page's text matrix, and ends at the right border of the
 * cell the label sits in, taken from the drawn rules above and below it.
 *
 * The vocabulary below is closed and is drawn from what these four forms
 * actually print in their captions. It is narrow on purpose: a general rule
 * that emitted a blank wherever printed words are followed by white space would
 * find one between "State of Minnesota" and "District Court" in the letterhead.
 */
const CAPTION_CELL_LABELS = Object.freeze([
  "county", "county of", "judicial district", "court file number", "case type", "date of birth"
]);
const CAPTION_CELL_MIN_WIDTH = 40;
const CAPTION_CELL_RULE_REACH = 40;

/** The printed chunks of one line, split at the gaps the page itself draws. */
function printedChunksOf(line, minimumGap = 6) {
  const chars = (line.chars ?? []).filter((ch) => String(ch.c).trim() !== "");
  if (!chars.length) return [];
  const chunks = [];
  let start = 0;
  for (let i = 1; i < chars.length; i += 1) {
    if (chars[i].x - (chars[i - 1].x + chars[i - 1].w) > minimumGap) {
      chunks.push({ text: cleanText(chars.slice(start, i).map((ch) => ch.c).join("")),
        x0: round(chars[start].x), x1: round(chars[i - 1].x + chars[i - 1].w) });
      start = i;
    }
  }
  chunks.push({ text: cleanText(chars.slice(start).map((ch) => ch.c).join("")),
    x0: round(chars[start].x), x1: round(chars.at(-1).x + chars.at(-1).w) });
  return chunks;
}

function captionCellBlanks(lines, rules, captionBandFloorY) {
  const out = [];
  for (const line of lines) {
    if (line.y < captionBandFloorY) continue;
    const chunks = printedChunksOf(line);
    for (const [index, chunk] of chunks.entries()) {
      if (!CAPTION_CELL_LABELS.includes(chunk.text.toLowerCase())) continue;
      // A label whose own baseline already carries a rule just to its right is
      // measured by the rule census and must not be measured twice.
      const servedByARule = rules.some((rule) => Math.abs(rule.y - line.y) <= 3
        && rule.x >= chunk.x1 - 2 && rule.x <= chunk.x1 + CAPTION_CELL_RULE_REACH);
      if (servedByARule) continue;
      // The cell's right border, from the rules drawn above and below the label.
      const bordersOverlapping = rules
        .filter((rule) => rule.x <= chunk.x1 && rule.endX > chunk.x1)
        .filter((rule) => Math.abs(rule.y - line.y) <= 40);
      const cellRight = bordersOverlapping.length
        ? Math.min(...bordersOverlapping.map((rule) => rule.endX)) : null;
      const nextChunkStart = chunks[index + 1]?.x0 ?? null;
      const right = Math.min(...[cellRight, nextChunkStart === null ? null : nextChunkStart - 3]
        .filter((value) => value !== null));
      if (!Number.isFinite(right)) continue;
      const x0 = round(chunk.x1 + 3);
      if (right - x0 < CAPTION_CELL_MIN_WIDTH) continue;
      out.push({
        blankId: `p1-cell-y${round(line.y)}-x${x0}`,
        page: 1, construction: "caption_cell_without_a_rule",
        printedCaption: chunk.text, captionBasis: "printed_caption_label_in_a_bordered_caption_cell",
        printedInkFractionOnTheRule: 0,
        measured: {
          x0, x1: round(right), baselineY: round(line.y), width: round(right - x0), thickness: 0,
          printedSize: round(Number(line.size) || 11),
          geometrySource: "label_right_edge_from_the_text_matrix_and_cell_border_from_the_drawn_rules",
          cellRightBorder: cellRight === null ? null : round(cellRight),
          nextPrintedChunkStartsAt: nextChunkStart
        }
      });
    }
  }
  return out;
}

async function censusDocument(document) {
  const pdf = await PDFDocument.load(document.bytes, { ignoreEncryption: true, updateMetadata: false });
  const checkboxGlyphs = checkboxGlyphsOf(pdf);
  const pageGeometry = [];
  const blanks = [];
  const selectionControls = [];
  const documentTextLines = [];

  /*
   * The caption band of a Minnesota district-court form runs from the top of
   * page 1 down to the last line of its party block — the printed "Defendant"
   * label, or the "Date of Birth" line where the form prints one under it. It
   * is measured on each form rather than fixed, because the four put their
   * party blocks at four different heights, and it decides which rules are
   * caption facts and which belong to the body of the document.
   */
  const firstPageLines = groupIntoLines(extractTextItems(pdf.getPage(0)));
  const partyBlockLines = firstPageLines
    .filter((line) => /^(defendant(\/respondent)?|date of birth)\b/i.test(cleanText(line.text)));
  if (partyBlockLines.length === 0) {
    fail("this form no longer prints a party block on page 1, so the caption band cannot be measured",
      document.formNumber);
  }
  const captionBandFloorY = round(Math.min(...partyBlockLines.map((line) => line.y)) - 4);

  pdf.getPages().forEach((page, index) => {
    const pageNumber = index + 1;
    const { width, height } = page.getSize();
    pageGeometry.push({ page: pageNumber, width: round(width), height: round(height) });
    const lines = groupIntoLines(extractTextItems(page));
    for (const line of lines) {
      const text = cleanText(line.text);
      if (text) documentTextLines.push(text);
    }
    selectionControls.push(...selectionControlsOfPage(lines, pageNumber, checkboxGlyphs));

    const rules = rulesOfPage(page).horizontal;
    if (pageNumber === 1) {
      blanks.push(...captionCellBlanks(lines, rules, captionBandFloorY));
    }
    // The item 7 table on EXP102 page 3 is the only place these forms draw a
    // grid: six columns whose rules share an x span on several baselines.
    const columnCounts = new Map();
    for (const rule of rules) {
      const key = `${round(rule.x)}|${round(rule.endX)}`;
      columnCounts.set(key, (columnCounts.get(key) ?? 0) + 1);
    }
    for (const rule of rules) {
      const ink = inkOnRule(rule, lines, rules);
      const columnKey = `${round(rule.x)}|${round(rule.endX)}`;
      const repeated = columnCounts.get(columnKey) ?? 0;
      let construction = "drawn_horizontal_rule";
      if (rule.width >= DIVIDER_WIDTH_MIN) construction = "printed_divider_rule";
      else if (ink.fraction >= 0.5) construction = "underlined_printed_text";
      else if (repeated >= 4 && rule.width < 120) construction = "table_cell_rule";
      const caption = captionForRule(rule, lines);
      const blank = {
        blankId: `p${pageNumber}-y${round(rule.y)}-x${round(rule.x)}`,
        page: pageNumber, construction,
        printedCaption: caption.caption, captionBasis: caption.basis,
        printedInkFractionOnTheRule: ink.fraction,
        measured: {
          x0: round(rule.x), x1: round(rule.endX), baselineY: round(rule.y),
          width: round(rule.width), thickness: round(rule.height),
          printedSize: 10, geometrySource: rule.geometrySource ?? "page_content_stream"
        }
      };
      // The two rules that fence the item 7 column headings share the grid's x
      // spans but carry the printed headings, so they are borders, not cells.
      if (construction === "table_cell_rule" && ink.fraction > 0.05) {
        blank.construction = "table_border_rule";
      }
      blanks.push(blank);
    }
  });

  return {
    formNumber: document.formNumber, sourceSha256: document.sha256,
    structuralClass: "flat_pdf", acroFieldCountReadFromBytes: document.acroFieldCount,
    captionBandFloorY,
    checkboxGlyphs: [...checkboxGlyphs.entries()].map(([, glyph]) => glyph),
    pageGeometry, blanks, selectionControls, documentTextLines
  };
}

// ---------------------------------------------------------------------------
// anchors
// ---------------------------------------------------------------------------
// Helvetica's encoded advance can exceed the fit helper's estimate at a
// boundary, so a mapped box reserves a measured right-edge guard and a boundary
// value shrinks or refuses rather than crossing the source's own rule.
const RIGHT_EDGE_GUARD = 10;
const LEFT_INSET = 2;

/*
 * One withheld blank, in the shared completeness contract's own vocabulary.
 *
 * `completenessDisposition` is the closed BLANK_DISPOSITIONS name, `refusalClass`
 * is the closed REFUSAL_CLASSES name and is emitted ONLY when one genuinely
 * applies, and `requiredBeforeFiling` travels as a boolean rather than as prose.
 * A disposition or class this build invented would fail closed there, which is
 * the behaviour that makes the counters worth reading.
 */
const TRUSTED_REFUSAL_CLASSES = new Set([
  "signature_or_date_participant_completion",
  "court_prosecutor_clerk_or_agency_owned",
  "participant_sworn_narrative_or_legal_election"
]);

function withheldRow(blank, decision) {
  const refusalClass = TRUSTED_REFUSAL_CLASSES.has(decision.category) ? decision.category : null;
  return {
    blankId: blank.blankId, page: blank.page,
    effectiveLabel: decision.effectiveLabel,
    printedCaption: blank.printedCaption,
    sourcePrintedCaption: blank.printedCaption,
    reason: decision.reason ?? decision.what ?? null,
    completenessDisposition: decision.approvedDisposition,
    ...(refusalClass ? { refusalClass, category: refusalClass } : {}),
    ...(decision.requiredBeforeFiling === true
      ? { requiredBeforeFiling: true, whatToSupply: decision.what } : {}),
    ...(decision.courtCompletesAfterFiling
      ? { courtCompletesAfterFiling: true, laterCompletionTrigger: decision.laterCompletionTrigger } : {}),
    ...(decision.routeConditionThatMakesItInapplicable
      ? { routeConditionThatMakesItInapplicable: decision.routeConditionThatMakesItInapplicable } : {}),
    approvedDisposition: decision.approvedDisposition,
    measured: blank.measured
  };
}

function anchorsFor(document, census) {
  const floor = census.captionBandFloorY;
  const anchors = [];
  const withheld = [];
  for (const blank of census.blanks) {
    const decision = decideBlank(document, blank, floor);
    if (decision === null) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, printedCaption: blank.printedCaption,
        effectiveLabel: blank.printedCaption,
        reason: "no rule in this build's decision table reaches this measured blank",
        category: null, approvedDisposition: "UNCLASSIFIED_BLANK", measured: blank.measured
      });
      continue;
    }
    blank.decision = decision;
    if (decision.terminal === false) continue;
    if (!decision.writable) {
      withheld.push(withheldRow(blank, decision));
      continue;
    }
    const x = round(blank.measured.x0 + LEFT_INSET);
    const width = round(blank.measured.x1 - RIGHT_EDGE_GUARD - x);
    // A rule is written just above the line the form draws; a caption cell has
    // no rule, so the value sits on the printed label's own baseline.
    const y = blank.construction === "caption_cell_without_a_rule"
      ? round(blank.measured.baselineY)
      : round(blank.measured.baselineY + 2);
    if (width < 20) {
      withheld.push(withheldRow(blank, SUPPLY(decision.effectiveLabel,
        `${decision.effectiveLabel} — the line the form draws here is ${round(blank.measured.width)} points `
        + "wide, which is too narrow to print the value legibly, so it is left for you to write by hand")));
      continue;
    }
    anchors.push({
      blankId: blank.blankId, printedCaption: blank.printedCaption,
      label: `${decision.effectiveLabel} [${blank.blankId}]`,
      effectiveLabel: decision.effectiveLabel, factId: decision.factId, page: blank.page,
      writeBox: { x, y, width, height: 12 },
      sourceBlankBounds: { x0: blank.measured.x0, x1: blank.measured.x1, baselineY: blank.measured.baselineY },
      fontSize: 10, captionOnly: false
    });
  }
  return { anchors, withheld };
}

/*
 * The shared semantics binds on the field NAME, and these names are measured
 * blank ids rather than authored field names, so every anchor states its fact
 * explicitly. The mapping can widen nothing: a protect rule, a type guard and a
 * caption-only document all still refuse after it.
 */
const explicitMappingsFor = (anchors) =>
  Object.fromEntries(anchors.map((anchor) => [anchor.label, anchor.factId]));

function protectedRulesFor(document, census) {
  return census.blanks
    .filter((blank) => blank.decision && blank.decision.terminal !== false && !blank.decision.writable)
    .map((blank) => ({
      page: blank.page, x: blank.measured.x0, endX: blank.measured.x1, y: blank.measured.baselineY,
      caption: blank.printedCaption,
      category: blank.decision.category ?? blank.decision.approvedDisposition
    }));
}

// ---------------------------------------------------------------------------
// what the output bytes actually say
// ---------------------------------------------------------------------------
/*
 * WHY ADDED INK IS ATTRIBUTED BY RUN AND NOT BY CHARACTER POSITION.
 *
 * The shared extractor has no width metrics for a standard-14 Helvetica — the
 * font this factory draws with — so it reports `metricsExact: false` and
 * synthesizes each character's x from a uniform half-em advance. The origin of
 * each RUN is exact, because it comes from the text matrix; the per-character
 * positions inside it drift.
 *
 * Measured, on a 94-character value drawn at 8pt from x=175.6: pdf-lib's own
 * metrics put the last glyph's right edge at 509.46, and the extractor reports
 * 555.60. That is 46.14 points of drift, and it drifts RIGHTWARD, which means
 * it manufactures exactly the defect a reviewer most needs to trust — a value
 * running past the rule the court drew — on precisely the longest values.
 *
 * So `nonWhitespaceGlyphsOutsideMeasuredWriteBoxes` is measured from the run's
 * exact origin plus the true width of its own text at its own size, taken from
 * the same font object this build draws with. The glyph COUNT still comes from
 * the character diff, which is exact.
 */
async function addedInkOf(sourceBytes, outputBytes) {
  const before = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const after = await PDFDocument.load(outputBytes, { ignoreEncryption: true, updateMetadata: false });
  const key = (page, ch, y) => `${page}|${ch.x.toFixed(1)}|${y.toFixed(1)}|${ch.c}`;
  const original = new Map();
  before.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      for (const ch of item.chars ?? []) {
        const id = key(index + 1, ch, item.y);
        original.set(id, (original.get(id) ?? 0) + 1);
      }
    }
  });
  const originalRuns = new Map();
  before.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      const id = `${index + 1}|${item.x.toFixed(1)}|${item.y.toFixed(1)}|${item.text}`;
      originalRuns.set(id, (originalRuns.get(id) ?? 0) + 1);
    }
  });
  const added = [];
  const addedRuns = [];
  after.getPages().forEach((page, index) => {
    for (const item of extractTextItems(page)) {
      const runId = `${index + 1}|${item.x.toFixed(1)}|${item.y.toFixed(1)}|${item.text}`;
      const runsLeft = originalRuns.get(runId) ?? 0;
      if (runsLeft > 0) originalRuns.set(runId, runsLeft - 1);
      else {
        addedRuns.push({
          page: index + 1, x: round(item.x), y: round(item.y), size: Number(item.size || 0),
          text: String(item.text ?? ""), metricsExact: item.metricsExact === true
        });
      }
      for (const ch of item.chars ?? []) {
        const id = key(index + 1, ch, item.y);
        const remaining = original.get(id) ?? 0;
        if (remaining > 0) { original.set(id, remaining - 1); continue; }
        added.push({ page: index + 1, x: round(ch.x), y: round(item.y), w: round(ch.w), c: ch.c });
      }
    }
  });
  return { added, addedRuns };
}

const vectorIdentity = (page, seg) =>
  [page, seg.operator, seg.paintedBy, round(seg.x), round(seg.y), round(seg.width), round(seg.height)].join("|");

async function addedVectorInkOf(sourceBytes, outputBytes) {
  const { extractPageGeometry } = await import("./rcap-official-forms/rcap-pdf-anchor-capture.mjs");
  const before = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const after = await PDFDocument.load(outputBytes, { ignoreEncryption: true, updateMetadata: false });
  const original = new Map();
  before.getPages().forEach((page, index) => {
    for (const seg of extractPageGeometry(page).paths ?? []) {
      const id = vectorIdentity(index + 1, seg);
      original.set(id, (original.get(id) ?? 0) + 1);
    }
  });
  const added = [];
  after.getPages().forEach((page, index) => {
    for (const seg of extractPageGeometry(page).paths ?? []) {
      const id = vectorIdentity(index + 1, seg);
      const remaining = original.get(id) ?? 0;
      if (remaining > 0) { original.set(id, remaining - 1); continue; }
      added.push({
        page: index + 1, operator: seg.operator, paintedBy: seg.paintedBy,
        x: round(seg.x), y: round(seg.y), width: round(seg.width), height: round(seg.height)
      });
    }
  });
  return added;
}

/** The exact right edge of one added run, from the drawing font's own metrics. */
const runExtent = (run, font) => {
  let width = null;
  try { width = font.widthOfTextAtSize(run.text, run.size); } catch { width = null; }
  return width === null
    ? { x0: run.x, x1: run.x, exact: false }
    : { x0: run.x, x1: round(run.x + width), exact: true };
};

/** Whether one added run lies inside the rule this anchor was measured from. */
const runInsideAnchor = (run, extent, anchor) => run.page === anchor.page
  && extent.x1 <= anchor.sourceBlankBounds.x1 + 1
  && extent.x0 >= anchor.sourceBlankBounds.x0 - 1
  && run.y >= anchor.writeBox.y - 3 && run.y <= anchor.writeBox.y + anchor.writeBox.height + 3;

const inkInsideAnchor = (added, anchor) => added.filter((glyph) =>
  glyph.page === anchor.page
  && glyph.x + glyph.w >= anchor.sourceBlankBounds.x0 - 1
  && glyph.x <= anchor.sourceBlankBounds.x1 + 1
  && glyph.y >= anchor.writeBox.y - 3 && glyph.y <= anchor.writeBox.y + anchor.writeBox.height + 3);

const insideControl = (rows, control, wKey = "w", hKey = null) => rows.filter((row) =>
  row.page === control.page
  && row.x + (row[wKey] ?? 0) >= control.geometry.x0 - 1 && row.x <= control.geometry.x1 + 1
  && row.y + (hKey ? row[hKey] ?? 0 : 0) >= control.geometry.y0 - 3
  && row.y <= control.geometry.y1 + 3);

// ---------------------------------------------------------------------------
// the controlling records
// ---------------------------------------------------------------------------
/*
 * Assert, against the records themselves, that the entries this build carries
 * into participant copy are still the records' own words. A mismatch stops the
 * build rather than shipping a page that attributes a stop condition or a
 * preparatory step to a record that no longer holds it.
 */
function verifyControllingRecords() {
  const registry = readJson(TRACK_REGISTRY);
  const track = (registry.tracks ?? []).find((t) => t.trackId === TRACK_ID);
  if (!track) fail(`${TRACK_REGISTRY} carries no track ${TRACK_ID}`);
  const stop = track.selfHelpStopConditions ?? [];
  if (JSON.stringify(stop) !== JSON.stringify([...SELF_HELP_STOP_CONDITIONS])) {
    fail("the track's selfHelpStopConditions are not the four conditions this packet prints",
      JSON.stringify({ inRecord: stop, inThisBuild: [...SELF_HELP_STOP_CONDITIONS] }));
  }
  if (!(track.exclusions ?? []).includes(REGISTRATION_EXCLUSION)) {
    fail("the track no longer excludes the predatory-offender registration bar this packet cites",
      REGISTRATION_EXCLUSION);
  }

  const manifests = readJson(PACKET_SET_MANIFESTS);
  const set = (manifests.packetSets ?? []).find((p) => p.packetSetId === FAMILY_ID);
  if (!set) fail(`${PACKET_SET_MANIFESTS} carries no packet set ${FAMILY_ID}`);
  const declared = set.requiredBeforeFiling ?? [];
  for (const entry of [OWN_RECORDS_STEP, FILE_NUMBER_CROSSCHECK]) {
    if (!declared.includes(entry)) {
      fail("the packet-set manifest no longer declares a requiredBeforeFiling entry this packet carries", entry);
    }
  }
  return {
    trackId: TRACK_ID,
    selfHelpStopConditions: [...SELF_HELP_STOP_CONDITIONS],
    registrationExclusion: REGISTRATION_EXCLUSION,
    manifestRequiredBeforeFilingDeclared: declared.length,
    manifestEntriesCarriedByThisBuild: [OWN_RECORDS_STEP, FILE_NUMBER_CROSSCHECK],
    verifiedVerbatimIn: [TRACK_REGISTRY, PACKET_SET_MANIFESTS],
    boundByWholeFileSha256: false,
    whyNotBoundByWholeFileSha256:
      "both records are shared and are rewritten by unrelated route work; a whole-file pin on either goes "
      + "stale within days without saying whether these entries moved. The build asserts the entries verbatim."
  };
}

/*
 * The other half of the guard: the records are checked when the build starts,
 * and the BYTES this build is about to deliver are checked before anything is
 * written. VF56 found this family's gaps by grepping the delivered markdown, so
 * the build greps the same strings out of the same text.
 */
function undisclosedRecordSentences(participant, filing) {
  const both = `${participant}\n${filing}`.toLowerCase();
  return REQUIRED_PARTICIPANT_DISCLOSURES
    .filter((d) => !both.includes(d.needle.toLowerCase()))
    .map((d) => ({ ...d, occurrencesInDeliveredText: 0 }));
}

// ---------------------------------------------------------------------------
// sources
// ---------------------------------------------------------------------------
function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

async function loadDocuments() {
  const index = readJson(CORPUS_INDEX);
  const resolver = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: corpusRoot() });
  const documents = [];
  for (const source of SOURCES) {
    const entry = (index.entries ?? []).find((row) => row.path === source.path);
    if (!entry) fail("no committed corpus-index entry at the declared path", `${source.sourceId} ${source.path}`);
    if (entry.sha256 !== source.sha256) {
      fail("the committed index pins a different binary", `${source.sourceId}: index ${entry.sha256}`);
    }
    const absolute = resolver.resolve(entry);
    if (!absolute || !fs.existsSync(absolute)) {
      fail("the custody holding this source is not mounted here", `${source.sourceId} ${source.path}`);
    }
    const bytes = fs.readFileSync(absolute);
    const digest = sha256(bytes);
    if (digest !== source.sha256) fail("SHA-256 drift against the declared digest", `${source.sourceId}: ${digest}`);
    if (entry.byteLength !== bytes.length) {
      fail("byte length disagrees with the committed index", `${source.sourceId}: ${bytes.length}`);
    }
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const pageCount = pdf.getPageCount();
    if (entry.pageCount !== pageCount) {
      fail("page count disagrees with the committed index", `${source.sourceId}: ${pageCount}`);
    }
    let acroFieldCount = 0;
    try { acroFieldCount = pdf.getForm().getFields().length; } catch { acroFieldCount = 0; }
    if (acroFieldCount !== 0) {
      fail("this engine expects a flat PDF", `${source.formNumber}: ${acroFieldCount} AcroForm fields`);
    }
    documents.push({
      ...source, bytes, byteLength: bytes.length, pageCount, acroFieldCount,
      custody: entry.custody, indexEntry: entry, resolvedFrom: absolute
    });
  }
  return documents;
}

// ---------------------------------------------------------------------------
// instructions
// ---------------------------------------------------------------------------
function renderParticipantInstructions({ documents, censuses, marks, protectedBoxes, otherGroundBoxes, requiredBeforeFiling, laterCompletion, elections, captionFileNumber }) {
  const lines = [];
  lines.push("# Your Minnesota expungement packet");
  lines.push("");
  lines.push("This packet asks a Minnesota district court to seal the record of a controlled-substance case");
  lines.push("that was dismissed and discharged under Minn. Stat. § 152.18. It is prepared for you to check,");
  lines.push("complete, sign and file. Nothing in it has been filed and no court has decided anything.");
  lines.push("");
  lines.push("## What is in the packet");
  lines.push("");
  for (const doc of documents) {
    const census = censuses[doc.key];
    lines.push(`- **${doc.formNumber} (${doc.revision})** — ${doc.title}. ${census.pageGeometry.length} page(s).`);
  }
  lines.push("");
  lines.push("FEE102 is marked CONFIDENTIAL on every page. If you file it, hand it to the court");
  lines.push("administrator separately from the petition rather than attaching it to the public papers.");
  lines.push("");
  /*
   * THE FIRST TWO OF THE MANIFEST'S TEN requiredBeforeFiling ENTRIES.
   *
   * This build derives the "You must supply these before you file" list from
   * the blanks it measured on the paper, which is why these two never appeared:
   * neither is a blank on any form. They are preparatory steps the packet-set
   * manifest declares, and the second is the check that would have caught a
   * caption this packet left empty while telling the participant it had filled
   * it in. Carried verbatim-in-substance, asserted against the manifest above.
   */
  lines.push("## Before you start: get your own records");
  lines.push("");
  lines.push("Get these two records of your own before you check anything in this packet.");
  lines.push("");
  lines.push("- **Your own Minnesota criminal history, from the Bureau of Criminal Apprehension.** You");
  lines.push("  request it from the BCA yourself.");
  lines.push("- **Your own case history, from MCRO** — Minnesota Court Records Online. You look your own");
  lines.push("  cases up there yourself.");
  lines.push("");
  lines.push("LegalEase never collects, inspects or authenticates either of them, so nothing in this packet");
  lines.push("has been checked against them.");
  lines.push("");
  lines.push("**Check the court file number in this packet against those two records, and correct the packet");
  lines.push("if they disagree.** The court file number in this packet came from the answer you gave when it");
  lines.push("was prepared, not from the court's own record of your case.");
  lines.push("");
  /*
   * Generated from the write outcomes, never asserted beside them. Where the
   * value did not fit the rule the court drew, the caption is blank and the
   * participant is the only one who can finish it, so they are told which
   * captions and what the measurement was.
   */
  if (!captionFileNumber.everyCaptionWrittenInEveryFixture && captionFileNumber.narrow.length > 0) {
    lines.push("**Some Court File Number lines in this packet may be blank, and if they are, they are yours to");
    lines.push("fill in.** A court file number is printed onto a caption only where it fits inside the rule");
    lines.push("that form draws. These three rules are narrow, and a long court file number does not fit:");
    lines.push("");
    for (const caption of captionFileNumber.narrow) {
      lines.push(`- **${caption.form} page ${caption.page} — Court File Number.** ${caption.refusal.measuredWhy}.`);
    }
    lines.push("");
    lines.push("Where that happens this packet leaves the line blank rather than printing a number that runs");
    lines.push("off the court's own rule. Look at the Court File Number line on every caption in this packet.");
    lines.push("If it is empty, write your court file number in by hand before you file.");
    lines.push("");
  }
  lines.push("## What this packet already says for you");
  lines.push("");
  /*
   * GENERATED FROM THE MARKS THIS BUILD ACTUALLY MADE, never from a sentence
   * written beside them. This section named the EXP102 item 9 mark and nothing
   * else while the build was also marking FEE102 item 2 -- a sworn statement on
   * a Minn. Stat. § 563.01 affidavit that the packet made for the participant
   * and never told them about. A hand-written disclosure goes stale the moment
   * a second mark is added; a generated one cannot.
   */
  lines.push(`This packet marks ${marks.length} box${marks.length === 1 ? "" : "es"} for you and no others. They are`);
  lines.push("listed below.");
  lines.push("");
  for (const mark of marks) {
    lines.push(`- **${mark.form} page ${mark.page} — ${mark.effectiveLabel}.** ${mark.reason}`);
  }
  lines.push("");

  /*
   * THE BOXES THAT ARE NOT THE PARTICIPANT'S, READ FROM THE SAME CLASSIFICATION
   * THAT REFUSES THEM.
   *
   * What stood here was a hand-written sentence: "Every other box on every form
   * in this packet is empty, and every one of them is yours to decide." It was
   * false of every box this build classifies PROTECTED_FIELD, and most of those
   * are on EXP106 -- the PROPOSED ORDER, where the empty boxes are the judge's
   * findings, the box granting or denying the petition, and the branch choosing
   * how the record is sealed. The guide also tells the participant to write the
   * Judicial District onto EXP106's caption, so it told them to write on that
   * form and told them every empty box on it was theirs to decide.
   *
   * NO COUNTER COULD SEE THIS. Nothing is written to a protected field, so the
   * protected-write count is a true zero and these pages are pixel-identical to
   * their pinned sources. The defect was never in the ink; it was in what the
   * participant was told about the boxes with no ink in them. The sentence is
   * therefore generated from the classification, exactly as the mark disclosure
   * above it is, so that it cannot go stale when a disposition changes.
   */
  const protectedByForm = [];
  for (const box of protectedBoxes) {
    const key = `${box.form}|${box.reason}`;
    let group = protectedByForm.find((row) => row.key === key);
    if (!group) {
      group = { key, form: box.form, reason: box.reason, pages: new Set(), count: 0 };
      protectedByForm.push(group);
    }
    group.pages.add(box.page);
    group.count += 1;
  }
  if (protectedBoxes.length > 0) {
    lines.push("## Boxes that are empty because they are not yours");
    lines.push("");
    lines.push(`${protectedBoxes.length} more boxes in this packet are empty, and they are NOT yours to decide. They`);
    lines.push("belong to the court. Marking one of them puts your answer where a judge's decision goes, on a");
    lines.push("paper you file under oath. Leave every one of them blank.");
    lines.push("");
    for (const group of protectedByForm) {
      const pages = [...group.pages].sort((a, b) => a - b);
      const where = `${group.form} page${pages.length === 1 ? "" : "s"} ${pages.join(", ")}`;
      lines.push(`- **${where} — ${group.count} box${group.count === 1 ? "" : "es"}.** ${group.reason}`);
    }
    lines.push("");
    if (protectedByForm.some((group) => group.form === "EXP106")) {
      lines.push("EXP106 is the proposed order the judge signs. You are asked further down to write the Judicial");
      lines.push("District on its caption, and on EXP106 that caption is the only thing that is yours. Whether");
      lines.push("your petition is granted or denied, what the court finds, and how your record is sealed are");
      lines.push("decisions the judge makes after the hearing.");
      lines.push("");
    }
    /*
     * THE SWEEP SENTENCE, WHICH WAS FALSE OF THE DELIVERED BYTES.
     *
     * What stood here was "Every other box in this packet is empty and is
     * yours", followed by a pointer to "Choices only you can make". VF61
     * measured what that sentence covered: ten EXP102 item 9 boxes, each
     * stating a DIFFERENT statutory ground for expungement, appearing in
     * neither list, on a petition signed under Minn. Stat. § 358.116. The
     * comment that used to sit here said the two classes were "both presented
     * below under the heading that explains them" -- and only one of them was.
     *
     * The sentence is now counted from the same dispositions the field map
     * publishes, and the second class has the section it was promised. The
     * arithmetic is asserted in the build path: if a box is in none of the four
     * classes the guide describes, nothing is written.
     */
    const other = otherGroundBoxes.length;
    lines.push("Every other box in this packet is empty, and they are NOT all yours.");
    lines.push(`${other} of them are printed for statutory grounds this packet is not built for, and they`);
    lines.push("are listed under \"Boxes printed for grounds this packet does not use\" below, with what each");
    lines.push("one says and why this packet leaves it empty. The rest are yours: they are listed under");
    lines.push("\"Choices only you can make\" below, with what each one means. No box in this packet is left");
    lines.push("unexplained.");
    lines.push("");
  }
  /*
   * THE BOXES THAT BELONG TO ANOTHER STATUTORY GROUND.
   *
   * Ten of these are EXP102 item 9's other qualification boxes and one is the
   * unused branch of FEE102 item 2's printed "Choose one:". Each carries its
   * own reason, drawn from the ground the form prints beside that box, and the
   * guide names each one in the form's own words. A single sentence covering a
   * run of them would put this section back where it started.
   */
  if (otherGroundBoxes.length > 0) {
    lines.push("## Boxes printed for grounds this packet does not use");
    lines.push("");
    lines.push(`${otherGroundBoxes.length} boxes in this packet are empty because they belong to a`);
    lines.push("different statutory ground from the one this packet is built for. They are not the court's boxes");
    lines.push("and they are not blank by oversight. Each one is a separate legal basis with its own proposed");
    lines.push("order, and this packet carries the proposed order for one basis only. Ticking one of them here");
    lines.push("would swear to a ground this petition is not built to prove, on a paper you sign under Minn.");
    lines.push("Stat. § 358.116.");
    lines.push("");
    lines.push("Read each one against your own records. **If one of these, and not the § 152.18 discharge,");
    lines.push("describes your case, this is the wrong packet.** Stop, and get the packet built for that");
    lines.push("ground, rather than adding a box to this one.");
    lines.push("");
    for (const box of otherGroundBoxes) {
      lines.push(`- **${box.form} page ${box.page} — the box printed "${box.printedWords}"** ${box.reason}`);
    }
    lines.push("");
  }
  /*
   * ALL FOUR SELF-HELP STOP CONDITIONS, IN THE RECORD'S OWN WORDS.
   *
   * What stood here was one sentence about § 152.18. It covered the case where
   * the participant KNOWS the discharge was not under § 152.18, and not the
   * case the record names, where the classification is DISPUTED; and the fourth
   * condition, predatory-offender registration, reached the participant in no
   * form at all. The conditions are printed from the literals asserted against
   * the track registry at build time, so the page and the record cannot drift.
   */
  lines.push("## Where this packet stops and you need a lawyer");
  lines.push("");
  lines.push("This packet is self-help, and the Minnesota legal-design record names four points past which");
  lines.push("it cannot take you. **If any of the following is true, stop and get a lawyer before you go");
  lines.push("further.** These are the record's own words:");
  lines.push("");
  for (const condition of SELF_HELP_STOP_CONDITIONS) lines.push(`- ${condition}`);
  lines.push("");
  lines.push("Two of them need saying plainly.");
  lines.push("");
  lines.push("**If your case was not discharged under Minn. Stat. § 152.18, this is the wrong packet and you");
  lines.push("should not file it.** And if your own records do not make it clear whether the discharge was");
  lines.push("under § 152.18, or anyone disputes that it was, do not file on a guess. That is the third");
  lines.push("condition above and it is a question for a lawyer.");
  lines.push("");
  lines.push("**If predatory-offender registration is required in your case, stop here.** The exclusions");
  lines.push("recorded for this route include a predatory-offender registration bar under Minn. Stat.");
  lines.push("§ 609A.02, subd. 4. This packet is not built for that situation and nothing in it addresses");
  lines.push("it. Talk to a lawyer before you file anything.");
  lines.push("");
  lines.push(`_The four conditions above, and the exclusion, are quoted from track \`${TRACK_ID}\` in`);
  lines.push(`\`${TRACK_REGISTRY}\`; the build fails if that`);
  lines.push("record stops carrying them word for word._");
  lines.push("");
  lines.push("## You must supply these before you file");
  lines.push("");
  if (requiredBeforeFiling.length === 0) lines.push("_None._");
  for (const row of requiredBeforeFiling) {
    // The label is printed verbatim, because it is the name the field census
    // and the completeness audit know this blank by. A packet that describes a
    // required fact without naming it is a fact nobody was asked for.
    lines.push(`- **${row.form} page ${row.page} — ${row.effectiveLabel}.** ${row.whatToSupply}.`);
  }
  lines.push("");
  lines.push("## The court fills these in after you file");
  lines.push("");
  for (const row of laterCompletion) {
    lines.push(`- **${row.form} page ${row.page} — ${row.effectiveLabel}.** ${row.laterCompletionTrigger}.`);
  }
  lines.push("");
  lines.push("These are not gaps in your packet. The hearing date, the hearing time, the courtroom, the");
  lines.push("courthouse address and the Zoom meeting ID and passcode are not known until the court sets the");
  lines.push("hearing, and the court administrator supplies them.");
  lines.push("");
  lines.push("## Choices only you can make");
  lines.push("");
  // Grouped by the reason, because one sentence covers a run of boxes and
  // repeating it under each of them buries the list of boxes it is about.
  const byReason = new Map();
  for (const row of elections) {
    if (!byReason.has(row.reason)) byReason.set(row.reason, []);
    byReason.get(row.reason).push(row);
  }
  for (const [reason, rows] of byReason) {
    lines.push(`${reason}`);
    lines.push("");
    for (const row of rows) lines.push(`- **${row.form} page ${row.page} — ${row.effectiveLabel}.**`);
    lines.push("");
  }
  lines.push("");
  lines.push("## Signing");
  lines.push("");
  lines.push("EXP102 closes with a declaration under Minn. Stat. § 358.116. You sign it, you date it and you");
  lines.push("write the county and state where you signed. This packet leaves all three blank because only you");
  lines.push("can complete them. EXP104 is signed only after you have mailed the papers, by whoever mailed");
  lines.push("them. EXP106 is signed by the judge, not by you.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

const CAPTION_FILE_NUMBER_FACT = "matter.case_number";

/*
 * WHAT THE PACKET ACTUALLY DID WITH THE COURT FILE NUMBER, PER CAPTION.
 *
 * The two filing-instructions sentences about the caption were written by hand
 * beside the build rather than generated from it, and on the boundary fixture
 * they said the opposite of what the bytes did: three of the four captions have
 * no court file number on them, and the guide told the participant that "the
 * caption of every form in this packet names that county and that court file
 * number" and, of EXP104 specifically, that "this packet writes the county and
 * the court file number onto it". The proposed order the judge signs and the
 * proof of service both went out with an unidentified case, and the page that
 * tells the participant what still needs doing said there was nothing to do.
 *
 * The sentences are now a reading of these rows. A caption counts as written
 * only when it was written in EVERY fixture this build produced: one guide
 * ships with both fixtures, so a statement it makes has to be true of both.
 */
function captionFileNumberOutcomes(fixtureResults) {
  const byCaption = new Map();
  for (const result of fixtureResults) {
    for (const doc of result.perDocument) {
      for (const write of doc.actualWrites) {
        if (write.factId !== CAPTION_FILE_NUMBER_FACT) continue;
        const key = `${doc.formNumber}|${write.page}`;
        if (!byCaption.has(key)) {
          byCaption.set(key, { form: doc.formNumber, page: write.page, writtenInEveryFixture: true, refusal: null });
        }
        const entry = byCaption.get(key);
        if (write.written !== true) {
          entry.writtenInEveryFixture = false;
          entry.refusal = entry.refusal ?? write.notWritten ?? null;
        }
      }
    }
  }
  const captions = [...byCaption.values()].sort((a, b) => a.form.localeCompare(b.form) || a.page - b.page);
  return {
    captions,
    everyCaptionWrittenInEveryFixture: captions.length > 0 && captions.every((c) => c.writtenInEveryFixture),
    narrow: captions.filter((c) => !c.writtenInEveryFixture && c.refusal)
  };
}

function renderFilingInstructions({ documents, captionFileNumber }) {
  const lines = [];
  lines.push("# Filing your Minnesota expungement packet");
  lines.push("");
  lines.push("## Where it goes");
  lines.push("");
  lines.push("File with the district court administrator in the county where the case was decided. The");
  lines.push("caption of every form in this packet names that county.");
  lines.push("");
  if (captionFileNumber.everyCaptionWrittenInEveryFixture) {
    lines.push("This packet writes the court file number onto every one of those captions. Check it against");
    lines.push("your own records before you file.");
    lines.push("");
  } else {
    lines.push("**The court file number is a different matter, and you have to look at it.** This packet");
    lines.push("writes the court file number onto a caption only where the number fits inside the rule that");
    lines.push("form prints. Those rules are narrow, and they are not the same width on every form:");
    lines.push("");
    for (const caption of captionFileNumber.narrow) {
      lines.push(`- **${caption.form} page ${caption.page}** — ${caption.refusal.usableWidthInsideTheWriteBox} points of`
        + ` usable width, and a court file number can need more than that even at the smallest readable size.`);
    }
    lines.push("");
    lines.push("Where the number does not fit, this packet leaves that Court File Number line blank rather");
    lines.push("than printing a number that runs off the court's own rule, and you write it in yourself.");
    lines.push("**Look at the Court File Number line on the caption of every form in this packet before you");
    lines.push("file. If it is empty, fill it in.** A proposed order and a proof of service that go to the");
    lines.push("court without a case number on them do not identify the case they belong to.");
    lines.push("");
  }
  lines.push("## The filing fee");
  lines.push("");
  lines.push("A district court filing fee applies unless a statutory fee waiver or a granted FEE102 waiver");
  lines.push("applies. This packet does not state the amount of the fee, because the amount is set by the");
  lines.push("court and the committed record for this route does not carry it. Ask the court administrator");
  lines.push("what the fee is, and whether the statutory waiver reaches your petition, before you pay it.");
  lines.push("");
  lines.push("FEE102 (Affidavit to Request Fee Waiver, Minn. Stat. § 563.01) is included so that you can ask");
  lines.push("for the fee to be waived. Where the court asks for further detail, it uses FEE103. FEE103 is not");
  lines.push("in this packet.");
  lines.push("");
  lines.push("## Service");
  lines.push("");
  lines.push("EXP104 is the proof of service. It lists the agencies that must be served and the agencies to");
  lines.push("serve if they are related to your case. Six of them are marked (Required) on the form itself.");
  lines.push("");
  lines.push("This packet leaves EXP104 entirely blank below its caption, and that is deliberate. EXP104 says,");
  lines.push("under penalty of perjury, that you HAVE served the parties you check at the addresses you list.");
  lines.push("Until you have actually put the envelopes in the mail, none of that is true. Complete EXP104");
  lines.push("after you mail, not before, and then file it with the court.");
  lines.push("");
  const exp104Caption = captionFileNumber.captions.find((c) => c.form === "EXP104") ?? null;
  lines.push("EXP104's caption is not finished either. This packet writes the county onto it, and writes the");
  if (exp104Caption && exp104Caption.writtenInEveryFixture) {
    lines.push("court file number onto it as well. The Judicial District line is blank and is yours to fill, on");
  } else {
    lines.push("court file number onto it only where that number fits the rule EXP104 prints, measured above.");
    lines.push("The Judicial District line is blank and is yours to fill, on");
  }
  lines.push("EXP104 exactly as on EXP102, EXP106 and FEE102. \"Blank below its caption\" above means below");
  lines.push("it, not including it — the list of blanks to fill before you file is in your participant");
  lines.push("instructions.");
  lines.push("");
  lines.push("The committed record for this route does not state a service method, a service deadline or a");
  lines.push("filing deadline, so this packet states none. Ask the court administrator.");
  lines.push("");
  lines.push("## The hearing");
  lines.push("");
  lines.push("The court sets a hearing and fills in the notice at the top of EXP102 page 1. EXP102 also");
  lines.push("carries a printed notice to law enforcement, government agencies and the prosecutor that any");
  lines.push("objection must be filed as soon as possible and within 60 days.");
  lines.push("");
  lines.push("If an agency or the prosecuting authority objects, the court sets a contested hearing.");
  lines.push("Automated assistance ends there and you need a lawyer.");
  lines.push("");
  lines.push("## What each document is");
  lines.push("");
  for (const doc of documents) {
    lines.push(`- **${doc.formNumber}** ${doc.title} — ${doc.instrumentKind.replace(/_/g, " ")}.`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------
async function buildFixture({ documents, censuses, anchorSets, facts, fixture, electedControlIds }) {
  const pages = [];
  const perDocument = [];
  const merged = await PDFDocument.create();
  for (const document of documents) {
    const census = censuses[document.key];
    const { anchors } = anchorSets[document.key];
    const selections = census.selectionControls
      .filter((control) => electedControlIds.has(control.id))
      .map((control) => ({
        label: `${document.formNumber} ${control.id}`, page: control.page, measured: true,
        box: { x0: control.geometry.x0, y0: control.geometry.y0, x1: control.geometry.x1, y1: control.geometry.y1 },
        inset: 1.2, lineWidth: 1
      }));
    const { bytes, report } = await finalizeFlatOverlay({
      sourceBytes: document.bytes, expectedSha256: document.sha256,
      anchors, selections, protectedRules: protectedRulesFor(document, census),
      explicitMappings: explicitMappingsFor(anchors), facts,
      documentTextLines: census.documentTextLines, title: document.title
    });
    const { added, addedRuns } = await addedInkOf(document.bytes, bytes);
    const addedVectors = await addedVectorInkOf(document.bytes, bytes);

    /*
     * Attribution is per RUN, against the run's exact origin and the true width
     * of its own text, because the extractor's per-character positions drift on
     * the standard-14 font this build draws with. A run that lands inside the
     * rule an anchor was measured from is that anchor's ink; anything else is
     * ink this build cannot account for, and that is blocking.
     */
    const helvetica = await (await PDFDocument.create()).embedFont(HELVETICA);
    const outsideRuns = [];
    let glyphsOutside = 0;
    for (const run of addedRuns) {
      const extent = runExtent(run, helvetica);
      if (anchors.some((anchor) => runInsideAnchor(run, extent, anchor))) continue;
      const glyphCount = [...run.text].filter((ch) => ch.trim()).length;
      if (glyphCount === 0) continue;
      glyphsOutside += glyphCount;
      outsideRuns.push({ ...run, measuredRightEdge: extent.x1, exactWidth: extent.exact });
    }
    const outsideBoxes = outsideRuns;

    const electedVectorIndexes = new Set();
    for (const [i, seg] of addedVectors.entries()) {
      for (const control of census.selectionControls) {
        if (!electedControlIds.has(control.id)) continue;
        if (insideControl([seg], control, "width", "height").length > 0) electedVectorIndexes.add(i);
      }
    }
    const strayVectors = addedVectors.filter((seg, i) => !electedVectorIndexes.has(i));

    const findings = [];
    if (outsideBoxes.length) {
      findings.push({ severity: "blocking", check: "added_glyphs_outside_every_measured_write_box",
        runCount: outsideBoxes.length, glyphCount: glyphsOutside, sample: outsideBoxes.slice(0, 20) });
    }
    if (strayVectors.length) {
      findings.push({ severity: "blocking", check: "added_vector_ink_outside_every_elected_selection_box",
        count: strayVectors.length, sample: strayVectors.slice(0, 20) });
    }
    for (const write of report.written ?? []) {
      const anchor = anchors.find((candidate) => candidate.label === write.anchor);
      if (!anchor || inkInsideAnchor(added, anchor).filter((g) => String(g.c).trim()).length === 0) {
        findings.push({ severity: "blocking", check: "reported_write_has_no_glyph_in_its_measured_box", anchor: write.anchor });
      }
    }
    /*
     * AN ANCHOR THIS BUILD OFFERED AND DID NOT WRITE.
     *
     * production-field-map.json publishes every offered anchor as a writable
     * anchor carrying a fact id, and a completeness reader counts those as
     * written. So an anchor the shared semantics refused — a label that binds no
     * descriptor, or an explicit mapping that conflicts with the one the label
     * would pick — leaves the map claiming a write the artifact does not carry.
     * Three item 10 blanks on EXP102 were exactly that, and nothing in this
     * build noticed until the produced page was read. It is blocking now.
     */
    const tooLongToFit = [];
    for (const anchor of anchors) {
      if ((report.written ?? []).some((write) => write.anchor === anchor.label)) continue;
      const unfittable = (report.unfittable ?? []).find((row) => row.anchor === anchor.label) ?? null;
      if (unfittable) {
        /*
         * A value that cannot be printed legibly inside the rule the court drew
         * is a measured outcome, not a build defect — it is what the boundary
         * fixture exists to find. It is recorded with the two numbers that
         * decide it and carried to the participant, rather than clipped.
         */
        tooLongToFit.push({
          blankId: anchor.blankId, page: anchor.page, factId: anchor.factId,
          printedCaption: anchor.printedCaption, effectiveLabel: anchor.effectiveLabel,
          measuredRuleWidth: round(anchor.sourceBlankBounds.x1 - anchor.sourceBlankBounds.x0),
          // What the refusal is actually decided on: the rule, less the guard
          // that keeps the last glyph off the court's own line, less the
          // fitter's own horizontal padding.
          measuredWriteBoxWidth: anchor.writeBox.width,
          usableWidthInsideTheWriteBox: round(anchor.writeBox.width - 4),
          requiredWidthAtSmallestReadableSize: unfittable.requiredWidthAtMin ?? null,
          smallestReadableSize: unfittable.minFontSize ?? null,
          measuredWhy: `the rule the form draws is ${round(anchor.sourceBlankBounds.x1 - anchor.sourceBlankBounds.x0)} `
            + `points wide, which leaves ${round(anchor.writeBox.width - 4)} points to print in once the `
            + `${RIGHT_EDGE_GUARD}-point guard that keeps the last glyph off the court's own rule and the `
            + "fitter's own padding are taken off, and this value needs "
            + `${unfittable.requiredWidthAtMin ?? "more"} points even at the smallest size that stays `
            + `readable (${unfittable.minFontSize ?? 6} point)`
        });
        continue;
      }
      findings.push({
        severity: "blocking", check: "offered_anchor_was_not_written", anchor: anchor.label,
        factId: anchor.factId,
        refusal: (report.refused ?? []).find((row) => row.anchor === anchor.label) ?? null
      });
    }
    for (const control of census.selectionControls) {
      const markedText = insideControl(added, control).filter((g) => String(g.c).trim());
      const markedVector = insideControl(addedVectors, control, "width", "height");
      const elected = electedControlIds.has(control.id);
      const marked = markedText.length > 0 || markedVector.length > 0;
      if (marked && !elected) {
        findings.push({ severity: "blocking", check: "selection_control_marked_without_a_route_election", controlId: control.id });
      }
      if (elected && !marked) {
        findings.push({ severity: "blocking", check: "route_election_control_was_not_marked", controlId: control.id });
      }
      if (elected && markedText.length > 0) {
        findings.push({ severity: "blocking", check: "route_election_marked_with_text_instead_of_strokes", controlId: control.id });
      }
    }

    /*
     * EVERY WRITE THIS DOCUMENT OFFERED, READ BACK OUT OF THE SAVED BYTES.
     *
     * A row that was NOT written now carries the measurement that refused it.
     * VF56 failed this family because three Court File Number rows on the
     * boundary fixture published written:false with an empty read and nothing
     * else -- no reason, no usable width, no overflow figure -- while the
     * delivered filing instructions asserted the opposite of what the bytes
     * did. The build already measured the reason into tooLongToFit; it simply
     * never reached the record that a reader consults, or the participant.
     */
    const actualWrites = anchors.map((anchor) => {
      const glyphs = inkInsideAnchor(added, anchor);
      const refusal = tooLongToFit.find((row) => row.blankId === anchor.blankId) ?? null;
      const written = (report.written ?? []).some((w) => w.anchor === anchor.label);
      return {
        field: anchor.blankId, factId: anchor.factId, kind: "overlay_text",
        expected: String(facts[anchor.factId] ?? ""), page: anchor.page,
        printedCaption: anchor.printedCaption,
        rect: anchor.writeBox, measuredSourceRule: anchor.sourceBlankBounds,
        overlayTextReadFromFinalPdfBytes: glyphs.map((g) => g.c).join("").trim(),
        glyphCountReadFromFinalPdfBytes: glyphs.filter((g) => String(g.c).trim()).length,
        written,
        ...(written ? {} : {
          notWritten: refusal
            ? {
              class: "VALUE_TOO_LONG_FOR_THE_RULE_THE_FORM_PRINTS",
              measuredRuleWidth: refusal.measuredRuleWidth,
              usableWidthInsideTheWriteBox: refusal.usableWidthInsideTheWriteBox,
              requiredWidthAtSmallestReadableSize: refusal.requiredWidthAtSmallestReadableSize,
              smallestReadableSize: refusal.smallestReadableSize,
              measuredWhy: refusal.measuredWhy,
              participantMustSupply:
                "this line is blank on your packet because the value is too long to print legibly "
                + "inside the rule the form draws. Write it in yourself before you file."
            }
            : {
              class: "NOT_OFFERED_BY_THIS_FIXTURE",
              measuredWhy: "no value was offered for this anchor in this fixture's facts"
            }
        })
      };
    });

    /*
     * TWO FIGURES IN THIS RECORD BOTH CLAIM TO BE READINGS OF THE OUTPUT BYTES,
     * AND NOTHING MADE THEM AGREE.
     *
     * addedGlyphsReadFromOutputBytes is a count of every non-whitespace glyph
     * this build added to the document. The per-write reads are counts of the
     * glyphs inside each anchor. Ink that lands inside no anchor is counted by
     * glyphsOutside, and is separately blocking. So the three have to reconcile
     * exactly, and a published document total that does not equal the sum of
     * its own per-write reads means one of the two is not a reading of these
     * bytes. The committed record was three short -- the three glyphs of "sal"
     * on a boundary charge description -- with the wrong figure quoted as the
     * proof text. Nothing noticed, because nothing compared them.
     */
    const documentGlyphTotal = added.filter((g) => String(g.c).trim()).length;
    const perWriteGlyphTotal = actualWrites.reduce((n, w) => n + w.glyphCountReadFromFinalPdfBytes, 0);
    if (perWriteGlyphTotal + glyphsOutside !== documentGlyphTotal) {
      findings.push({
        severity: "blocking", check: "per_write_glyph_reads_do_not_reconcile_with_the_document_total",
        documentGlyphTotal, perWriteGlyphTotal, glyphsOutside,
        unaccountedFor: documentGlyphTotal - (perWriteGlyphTotal + glyphsOutside),
        why: "every added glyph is either inside an anchor this build declared or outside every one of "
          + "them. A document total that does not equal the sum of the per-write reads plus the outside "
          + "count means one of the published figures is not a reading of these bytes."
      });
    }

    perDocument.push({
      fixture, formNumber: document.formNumber, sourceSha256: document.sha256,
      glyphReconciliation: {
        documentGlyphTotal, perWriteGlyphTotal, glyphsOutsideEveryMeasuredWriteBox: glyphsOutside,
        reconciles: perWriteGlyphTotal + glyphsOutside === documentGlyphTotal
      },
      proofMethod: "glyphs and vector paths present in the final packet bytes and absent from the pinned "
        + "source bytes, located against the source's own measured rules and checkbox glyph outlines",
      addedGlyphsReadFromOutputBytes: added.filter((g) => String(g.c).trim()).length,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: glyphsOutside,
      addedVectorPathsReadFromOutputBytes: addedVectors.length,
      vectorPathsOutsideElectedSelectionBoxes: strayVectors.length,
      valuesReportedByFinalizer: (report.written ?? []).length,
      selectionsMarked: (report.selections ?? []).map((s) => s.control),
      selectionsRefused: report.selectionsRefused ?? [],
      actualWrites,
      refused: report.refused ?? [], unfittable: report.unfittable ?? [], tooLongToFit,
      activeContentScan: report.activeContentScan, findings
    });

    const outPdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const copied = await merged.copyPages(outPdf, outPdf.getPageIndices());
    for (const [i, page] of copied.entries()) {
      merged.addPage(page);
      pages.push({
        packetPage: pages.length + 1, formNumber: document.formNumber,
        sourcePage: i + 1, sourceSha256: document.sha256
      });
    }
  }
  const { stampDeterministic } = await import("./rcap-official-forms/rcap-deterministic-pdf-date.mjs");
  stampDeterministic(merged);
  const bytes = Buffer.from(await merged.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, pages, perDocument };
}

async function build({ check = false } = {}) {
  /* Before anything is read off a PDF: are the record entries this packet
   * carries into participant copy still the records' own words? */
  const controllingRecords = verifyControllingRecords();
  const documents = await loadDocuments();
  const censuses = {};
  for (const document of documents) censuses[document.key] = await censusDocument(document);

  // The election this build makes is asserted against the form's own printed
  // face before anything is drawn.
  const petition = censuses.EXP102;
  const elected = petition.selectionControls.find((control) =>
    ROUTE_ELECTION.matchOptionText.test(
      // The option's printed sentence runs over several lines, so the assertion
      // reads the document's own text rather than the one line the box sits on.
      petition.documentTextLines.join(" ")
    ) && control.page === 4 && /A criminal case against you for a possession of a controlled substance/i
      .test(control.printedContext));
  if (!elected) {
    fail("EXP102 no longer prints the § 152.18 qualification option this family elects; refusing to mark a box "
      + "whose meaning this build can no longer read");
  }
  // The plaintiff written onto FEE102's blank caption is read off the printed
  // face of the three court forms in this same packet, not supplied by this
  // build. If they stop printing it, it stops being written.
  for (const key of ["EXP102", "EXP104", "EXP106"]) {
    const printsPlaintiff = censuses[key].documentTextLines
      .some((line) => /^State of Minnesota$/i.test(line.trim()));
    if (!printsPlaintiff) {
      fail(`${key} no longer prints "State of Minnesota" as the plaintiff of this case, so the caption `
        + "value FEE102 borrows from it is no longer established by the packet's own sources");
    }
  }

  const feeWaiverPleadings = censuses.FEE102.selectionControls.find((control) =>
    FEE102_ITEM_2.electedBranch.test(control.printedContext));
  if (!feeWaiverPleadings) fail("FEE102 no longer prints the item 2 pleadings option");
  /*
   * The packet marks one branch of a printed choose-one, so the build refuses
   * to run unless it can still read BOTH branches and the instruction that
   * makes them exclusive. If FEE102 stops printing either, the classification
   * of the unmarked branch stops being readable off the form and this build
   * stops rather than guessing which of them is still a choice.
   */
  const feeWaiverCopyFeesOnly = censuses.FEE102.selectionControls.find((control) =>
    FEE102_ITEM_2.alternativeBranch.test(control.printedContext));
  if (!feeWaiverCopyFeesOnly) fail("FEE102 no longer prints the item 2 copy-fees-only option");
  /* documentTextLines are cleanText()'d, which strips the trailing colon, so the
   * printed instruction is compared through the same normalisation. */
  if (!censuses.FEE102.documentTextLines.some((line) => line === cleanText(FEE102_ITEM_2.printedInstruction))) {
    fail(`FEE102 no longer prints "${FEE102_ITEM_2.printedInstruction}" over item 2, so this build can no `
      + "longer read the two options as mutually exclusive");
  }

  const electedControlIds = new Set([elected.id, feeWaiverPleadings.id]);

  const anchorSets = {};
  for (const document of documents) anchorSets[document.key] = anchorsFor(document, censuses[document.key]);

  // Selection dispositions, now that the elected ids are known. Every control is
  // an audited row: the ones this build marks travel with the writes, and the
  // ones it does not travel with the blanks and have to earn their blankness.
  const selectionDispositions = {};
  for (const document of documents) {
    selectionDispositions[document.key] = censuses[document.key].selectionControls
      .map((control) => selectionRow(control, decideSelection(document, control, electedControlIds.has(control.id))));
  }

  const unclassified = Object.entries(anchorSets)
    .flatMap(([key, set]) => set.withheld.filter((row) => row.approvedDisposition === "UNCLASSIFIED_BLANK")
      .map((row) => ({ form: key, ...row })));

  const canonical = await buildFixture({
    documents, censuses, anchorSets, facts: CANONICAL, fixture: "canonical", electedControlIds
  });
  const boundary = await buildFixture({
    documents, censuses, anchorSets, facts: BOUNDARY, fixture: "boundary", electedControlIds
  });

  const blocking = [...canonical.perDocument, ...boundary.perDocument]
    .flatMap((row) => row.findings.map((finding) => ({ fixture: row.fixture, form: row.formNumber, ...finding })));

  if (check) {
    return { familyId: FAMILY_ID, unclassified, blocking, wrote: false };
  }
  if (unclassified.length > 0) {
    fail("measured blanks this build cannot classify", `${unclassified.length}: `
      + unclassified.slice(0, 8).map((r) => `${r.form}/${r.blankId} ${JSON.stringify(r.printedCaption)}`).join(", "));
  }
  if (blocking.length > 0) {
    fail("the produced bytes disagree with what this build says it wrote",
      JSON.stringify(blocking.slice(0, 4)));
  }

  /*
   * COMPOSE BOTH PARTICIPANT DOCUMENTS BEFORE ANY BYTE IS WRITTEN.
   *
   * They used to be composed after the fixtures had already landed on disk, so
   * a build that stopped between the two left a family directory half from this
   * run and half from the last. The disclosure guard below has to be able to
   * refuse the whole write, so everything it inspects is built first.
   */
  const requiredBeforeFiling = [];
  const laterCompletion = [];
  const elections = [];
  /*
   * Every mark this build made, in the order the packet is assembled, so the
   * guide's disclosure section is a reading of the marks rather than a
   * sentence maintained beside them.
   */
  const marks = [];
  for (const document of documents) {
    for (const row of selectionDispositions[document.key].filter((row) => row.marked)) {
      marks.push({ form: document.formNumber, page: row.page, effectiveLabel: row.effectiveLabel, reason: row.reason });
    }
  }
  /*
   * Every empty box this build REFUSES because it belongs to the court, read
   * from the same dispositions the field map publishes. The guide's statement
   * about these is generated from this list rather than written beside it, for
   * the same reason the mark disclosure above is.
   */
  const protectedBoxes = [];
  for (const document of documents) {
    for (const row of selectionDispositions[document.key]
      .filter((row) => !row.marked && row.approvedDisposition === "PROTECTED_FIELD")) {
      protectedBoxes.push({ form: document.formNumber, page: row.page, effectiveLabel: row.effectiveLabel, reason: row.reason });
    }
  }
  /*
   * Every empty box that belongs to a DIFFERENT statutory ground, read from
   * the same dispositions the field map publishes. Ten are EXP102 item 9's
   * other qualification boxes; one is the unused branch of FEE102 item 2's
   * printed "Choose one:". The printed words are carried through to the guide
   * so the participant is told what the box says rather than what this build
   * calls it.
   */
  const otherGroundBoxes = [];
  for (const document of documents) {
    for (const row of selectionDispositions[document.key]
      .filter((row) => !row.marked && row.approvedDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE")) {
      otherGroundBoxes.push({
        form: document.formNumber, page: row.page, blankId: row.blankId,
        printedWords: cleanText(row.printedContext).trim(), reason: row.reason
      });
    }
  }
  for (const document of documents) {
    const rows = [
      ...anchorSets[document.key].withheld,
      ...selectionDispositions[document.key].filter((row) => !row.marked)
    ];
    for (const row of rows) {
      const entry = { form: document.formNumber, page: row.page, blankId: row.blankId, ...row };
      if (row.approvedDisposition === "REQUIRED_BEFORE_FILING") requiredBeforeFiling.push(entry);
      if (row.courtCompletesAfterFiling === true) laterCompletion.push(entry);
      if (row.approvedDisposition === "PARTICIPANT_ELECTION_GENUINE") elections.push(entry);
    }
  }
  // One instruction line per distinct thing to supply, not one per rule.
  const dedupe = (rows, keyOf) => {
    const seen = new Map();
    for (const row of rows) if (!seen.has(keyOf(row))) seen.set(keyOf(row), row);
    return [...seen.values()];
  };
  const supplyRows = dedupe(requiredBeforeFiling, (r) => `${r.form}|${r.effectiveLabel}`);
  const laterRows = dedupe(laterCompletion, (r) => `${r.form}|${r.effectiveLabel}`);
  const electionRows = dedupe(elections, (r) => `${r.form}|${r.effectiveLabel}`);

  const captionFileNumber = captionFileNumberOutcomes([canonical, boundary]);
  const participantInstructions = renderParticipantInstructions({
    documents, censuses, marks, protectedBoxes, otherGroundBoxes,
    requiredBeforeFiling: supplyRows, laterCompletion: laterRows, elections: electionRows,
    captionFileNumber
  });
  const filingInstructions = renderFilingInstructions({ documents, captionFileNumber });

  /*
   * THE DISCLOSURE GUARD. The controlling records were checked when this build
   * started; these are the BYTES it is about to deliver. Nothing is written if
   * a record sentence this packet is required to carry is not on the page.
   */
  const undisclosed = undisclosedRecordSentences(participantInstructions, filingInstructions);
  if (undisclosed.length > 0) {
    fail("a controlling-record sentence this packet must carry is not in the delivered markdown",
      JSON.stringify(undisclosed));
  }

  /* THE SELECTION-DISCLOSURE GUARD, on the bytes about to be delivered. It
   * throws rather than returning a verdict, so nothing below it runs when a
   * selection control is delivered without saying why it is empty. */
  const selectionDisclosure = auditSelectionDisclosure({
    documents, selectionDispositions, otherGroundBoxes, participantInstructions
  });

  // ---- write the overlay directory ---------------------------------------
  fs.mkdirSync(absFor(`${OUT}/fixtures`), { recursive: true });
  fs.mkdirSync(absFor(`${OUT}/reports`), { recursive: true });
  fs.writeFileSync(absFor(`${OUT}/fixtures/canonical.pdf`), canonical.bytes);
  fs.writeFileSync(absFor(`${OUT}/fixtures/boundary.pdf`), boundary.bytes);
  fs.writeFileSync(absFor(`${OUT}/participant-instructions.md`), participantInstructions);
  fs.writeFileSync(absFor(`${OUT}/filing-instructions.md`), filingInstructions);
  writeJson(`${OUT}/reports/selection-disclosure.json`, selectionDisclosure);

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID, routeSelectionId: ROUTE_SELECTION_ID,
    censusBasis: "first_hand_inspection_of_each_exact_hash_bound_source",
    whatAMeasuredBlankIs:
      "Every binary in this family is flat: no AcroForm, no widget, no /Rect. A blank here is a horizontal "
      + "rule the source's own content stream draws, and a selection control is the source's own ballot-box "
      + "glyph, whose cell comes from the page's text matrix and whose inked outline comes from the embedded "
      + "font program's glyf entry.",
    documents: documents.map((document) => {
      const census = censuses[document.key];
      return {
        formNumber: document.formNumber, sourceSha256: document.sha256,
        documentPolicy: {
          mode: document.role === "court_order" ? "court_order_caption_only"
            : document.role === "unmailed_service_certificate" ? "unmailed_service_certificate_caption_only"
              : document.role === "sworn_financial_affidavit" ? "sworn_financial_affidavit_caption_only"
                : "participant",
          captionOnly: document.role !== "participant_filing",
          documentAcceptsFill: true, routeKey: ROUTE_KEY, instrumentKind: document.instrumentKind
        },
        structuralClass: "flat_pdf",
        acroFieldCountReadFromBytes: census.acroFieldCountReadFromBytes,
        checkboxGlyphsDeclaredByTheSource: census.checkboxGlyphs,
        pageGeometry: census.pageGeometry,
        blankCount: census.blanks.length,
        selectionControlCount: census.selectionControls.length,
        blanks: census.blanks.map((blank) => ({
          blankId: blank.blankId, page: blank.page, construction: blank.construction,
          printedCaption: blank.printedCaption, captionBasis: blank.captionBasis,
          printedInkFractionOnTheRule: blank.printedInkFractionOnTheRule,
          measured: blank.measured,
          disposition: blank.decision?.approvedDisposition ?? null,
          writable: blank.decision?.writable ?? false,
          factId: blank.decision?.factId ?? null
        })),
        selectionControls: census.selectionControls.map((control) => ({
          ...control,
          disposition: selectionDispositions[document.key].find((row) => row.selectionId === control.id)?.approvedDisposition ?? null,
          marked: selectionDispositions[document.key].find((row) => row.selectionId === control.id)?.marked === true
        }))
      };
    })
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-production-field-map/v1",
    familyId: FAMILY_ID, routeKeys: [ROUTE_KEY], routeSelectionId: ROUTE_SELECTION_ID,
    implementationStrategy: "official_pdf_fill",
    factMap: CANONICAL,
    documents: documents.map((document) => ({
      documentId: document.formNumber, formNumber: document.formNumber,
      sourceSha256: document.sha256, instrumentKind: document.instrumentKind,
      writableAnchors: [
        ...anchorSets[document.key].anchors.map((anchor) => ({
          blankId: anchor.blankId, label: anchor.effectiveLabel, printedCaption: anchor.printedCaption,
          factId: anchor.factId, page: anchor.page, writeBox: anchor.writeBox,
          measuredSourceRule: anchor.sourceBlankBounds
        })),
        ...selectionDispositions[document.key].filter((row) => row.marked).map((row) => ({
          blankId: row.selectionId, label: row.effectiveLabel, printedCaption: row.printedContext,
          factId: null, page: row.page, mark: "two_diagonal_strokes_inset_in_the_source_glyph_outline",
          routeDetermined: true, authority: row.authority, why: row.reason,
          measuredSourceGlyph: row.geometry
        }))
      ],
      withheld: [
        ...anchorSets[document.key].withheld,
        ...selectionDispositions[document.key].filter((row) => !row.marked)
      ],
      selectionControls: selectionDispositions[document.key]
    })),
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID, worklistGroupId: FAMILY_ID, jurisdiction: "MN",
    implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "committed corpus-index path + index SHA-256 + on-disk SHA-256 + byte length + page count",
    routeKey: ROUTE_KEY, routeSelectionId: ROUTE_SELECTION_ID,
    statutoryAuthority: "Minn. Stat. § 152.18; Minn. Stat. ch. 609A; Minn. Stat. § 563.01 (fee waiver)",
    declaredPathsInTheQueueAreStale: {
      what: "MASTER_QUEUE and the route census declare EXP102, EXP104 and EXP106 at "
        + "private/Nationwide Record Clearing/LegalEase Minnesota/…, a path no mounted custody carries.",
      howTheyWereResolved: "by content digest, which is the binding this factory uses. All three resolve "
        + "byte-exact inside the nationwide_recovery_pool_2026_09_02 custody at LegalEase Minnesota/….",
      substitutionMade: false
    },
    documents: documents.map((document) => ({
      sourceIds: [document.sourceId], documentId: document.formNumber, formNumber: document.formNumber,
      revision: document.revision, title: document.title, instrumentKind: document.instrumentKind,
      packetComponent: document.component,
      pathInArchive: document.path, custody: document.custody,
      sha256: document.sha256, byteLength: document.byteLength, pageCount: document.pageCount,
      acroFieldCount: document.acroFieldCount, structuralClassObserved: "flat_pdf",
      exactHashVerified: true, corpusIndexAgrees: true
    })),
    allSourcesExact: true, sourceBinaryCommitted: false,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  const artifact = (fixture, result) => ({
    fixture, file: `${OUT}/fixtures/${fixture}.pdf`,
    sha256: sha256(result.bytes), byteLength: result.bytes.length,
    pageCount: result.pages.length, pageManifest: result.pages,
    activeContentScan: result.perDocument[0]?.activeContentScan ?? null,
    addedGlyphsReadFromOutputBytes: result.perDocument
      .reduce((total, row) => total + row.addedGlyphsReadFromOutputBytes, 0),
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: result.perDocument
      .reduce((total, row) => total + row.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0),
    rasterPages: [],
    rasterState: "BUILT_RASTER_PENDING",
    whyNoRasterHere: "rasterization is central (.github/workflows/rcap-packet-raster-acceptance-batch.yml). "
      + "A local render is not a receipt, so this build produces none and records the digests the central "
      + "workflow is to raster."
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts: [artifact("canonical", canonical), artifact("boundary", boundary)]
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID,
    derivedFromArtifactBytes: true, proofSource: "final canonical and boundary PDF bytes",
    documents: [...canonical.perDocument, ...boundary.perDocument]
  });

  writeJson(`${OUT}/reports/blanks.json`, {
    schemaVersion: "rcap-packet-blanks/v1", familyId: FAMILY_ID,
    whatThisIs: "every measured blank and selection control this build did not write, with the reason it is "
      + "blank and, where the participant must supply it, the words the packet uses to ask for it",
    requiredBeforeFiling: supplyRows, laterCompletion: laterRows, participantElections: electionRows,
    valuesTooLongForTheRuleTheFormDraws: {
      whatThisIs: "a held fact that cannot be printed legibly inside the rule the court drew. It is refused "
        + "rather than clipped, because a clipped value on a filing is a wrong value and not a shorter one.",
      canonical: canonical.perDocument.flatMap((row) => row.tooLongToFit.map((item) => ({ form: row.formNumber, ...item }))),
      boundary: boundary.perDocument.flatMap((row) => row.tooLongToFit.map((item) => ({ form: row.formNumber, ...item })))
    },
    protectedFields: documents.flatMap((document) => anchorSets[document.key].withheld
      .filter((row) => row.approvedDisposition === "PROTECTED_FIELD")
      .map((row) => ({ form: document.formNumber, ...row }))),
    notApplicableOnThisRoute: documents.flatMap((document) => [
      ...anchorSets[document.key].withheld.filter((row) => row.approvedDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE"),
      ...selectionDispositions[document.key]
        .filter((row) => !row.marked && row.approvedDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE")
    ].map((row) => ({ form: document.formNumber, ...row }))),
    routeElectionsMade: documents.flatMap((document) => selectionDispositions[document.key]
      .filter((row) => row.marked).map((row) => ({ form: document.formNumber, ...row })))
  });

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    whatThisIs: "the caption band of each of the four forms, the printed words this build read beside each "
      + "caption rule, and the fact written there — so a reviewer can check the caption without reopening "
      + "the binaries",
    documents: documents.map((document) => ({
      formNumber: document.formNumber, sourceSha256: document.sha256,
      captionBandPage: 1,
      printedCaptionLines: censuses[document.key].documentTextLines.slice(0, 12),
      captionRules: censuses[document.key].blanks
        .filter((blank) => blank.page === 1 && blank.measured.baselineY >= 590)
        .map((blank) => ({
          blankId: blank.blankId, printedCaption: blank.printedCaption, captionBasis: blank.captionBasis,
          construction: blank.construction, measured: blank.measured,
          disposition: blank.decision?.approvedDisposition ?? null,
          factId: blank.decision?.factId ?? null,
          canonicalValue: blank.decision?.factId ? CANONICAL[blank.decision.factId] ?? null : null
        }))
    }))
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1", familyId: FAMILY_ID, blocking: [], findingCount: 0,
    observations: [
      "All four bound binaries are flat: no AcroForm, no widget, no /Rect. Every write box is a horizontal "
        + "rule the source itself draws and every selection box is the source's own ballot-box glyph outline, "
        + "read from the embedded font program.",
      "EXP106 is the district court's own order and is filled to its caption only. Its findings, its ordering "
        + "paragraphs, the agencies it names and the judicial signature are the judge's.",
      "EXP104 is filled to its caption only. Checking a recipient box or writing a recipient address on it "
        + "asserts, under Minn. Stat. § 358.116, a mailing that has not happened.",
      "No cell of EXP102 item 7 is written. The form requires the participant's whole criminal record from "
        + "every jurisdiction; the platform holds one matter, and one row beside five blanks reads as a "
        + "complete record when it is not.",
      "FEE102 is filled to its caption only. Household size, income, public assistance, property and monthly "
        + "expenses are protected categories the platform does not hold and does not guess.",
      "Two selections are made, both determined by the packet rather than by the participant: EXP102 item 9 "
        + "box 1, the Minn. Stat. § 152.18 discharge this family is built for, and FEE102 item 2's statement "
        + "that the affidavit accompanies pleadings. Each is asserted against the form's own printed line "
        + "before it is drawn.",
      "The ballot box on these forms is one two-byte CID <0706> mapped by its own ToUnicode to U+2610. The "
        + "shared anchor-capture path reports it as two one-byte characters and marks metricsExact false. The "
        + "combined span and the summed advance are correct, so the geometry holds; the character decoding "
        + "does not. Reported to the Captain rather than edited from this lane.",
      `${supplyRows.length} item(s) the filing needs are classified required-before-filing and named in `
        + "participant-instructions.md rather than guessed.",
      `${selectionDisclosure.otherStatutoryGround} empty boxes belong to a different statutory ground from `
        + "the one this packet is built for — the ten other qualification boxes on EXP102 item 9 and the "
        + "unused branch of FEE102 item 2's printed \"Choose one:\". None is ticked, because electing a "
        + "statutory ground is the participant's oath and not this packet's; each carries its own reason "
        + "drawn from the ground the form prints beside it; and each is named in participant-instructions.md "
        + "in the form's own words.",
      `Every one of this family's ${selectionDisclosure.selectionControls} selection controls states why it `
        + "is empty, and the build refuses rather than delivering one that does not. The fleet counter that "
        + "should catch that, requiredOptionsMissing, cannot see it here: the shared reader in "
        + "scripts/rcap-packet-completeness/verify-packet-completeness.mjs reads writableAnchors and withheld "
        + "on this field-map shape and does not read selectionControls at all, so it audits 387 rows on this "
        + "family and none of these 95. That reader is shared code this lane does not own; the measurement is "
        + "in reports/selection-disclosure.json."
    ]
  });

  /*
   * THE REBUILD THAT ERASED THIS FAMILY'S GOVERNANCE STATE, STOPPED.
   *
   * This builder composed product-wiring.json wholesale, from nothing, and wrote
   * it. Six keys on the committed `binding` are authored by other components and
   * were destroyed on every rebuild -- acceptanceReceipt, lastIndependentVerification,
   * paymentEligible, sponsorshipEligible, whyPaymentIsClosed and maintenanceRelationship.
   * FIX07 lost this family's hash-bound RASTER_PASS (workflow run 34413372916)
   * to a rebuild it ran at base before any edit of its own, and FIX02 reproduced
   * the same six-key loss on an untouched sibling script with byte-identical
   * fixtures either side -- which is exactly why nothing downstream reports it.
   * The record is data/rcap-grade-a/packet-factory-24h/REBUILD_ERASES_GOVERNANCE_STATE.json.
   *
   * The write now routes through preserveGovernanceState(), which carries a
   * governance value forward when this write does not author one, and WITHDRAWS
   * an artifact-bound acceptance receipt -- recorded, with both digests -- when
   * the canonical this build produced is not the canonical the receipt binds.
   * writeWiringChecked() then refuses the write outright if anything would still
   * be lost. Preserving a value is not deciding one: nothing here issues a
   * receipt, marks a family proven, or sets any commercial guard.
   *
   * THE SOURCE TIERS ARE PRESERVED FOR THE SAME REASON, and it is not one of
   * the six. This builder hardcodes tier "exact_content_hash" for all four
   * sources. The committed record carries "exact_form_number" for FEE102, set
   * by a later component that assigns tiers from evidence, so a plain rebuild
   * silently REWROTE a source-identity claim this build did not author and is
   * not the authority for. A tier is not this builder's to strengthen; the
   * committed value is carried forward unchanged, and only a source this record
   * has never seen takes the value composed here.
   */
  const wiringPath = absFor(`${OUT}/product-wiring.json`);
  const wiring = {
    schemaVersion: "rcap-family-product-wiring/v1", familyId: FAMILY_ID, routeKeys: [ROUTE_KEY],
    routeSelectionId: ROUTE_SELECTION_ID, implementationStrategy: "official_pdf_fill",
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0,
    createsFulfillmentRecord: false, opensCommercialRoute: false,
    assignmentOwnedPath: OUT, evidenceOutputPath: OUT, builtBy: BUILD_SCRIPT,
    note: "Review artifacts and maps create no authority. A route remains closed until exact output-level "
      + "legal and independent visual approval exists in the separate control plane.",
    binding: {
      family: FAMILY_ID, jurisdiction: "MN", routeKeys: [ROUTE_KEY], deliveryType: "official_pdf_fill",
      instrumentKinds: ["certificate_of_service", "fee_waiver", "primary_filing", "proposed_order"],
      packetComponents: SOURCES.map((source) => source.component).sort(),
      fieldMap: `${OUT}/production-field-map.json`,
      instructions: `${OUT}/participant-instructions.md`,
      filingInstructions: `${OUT}/filing-instructions.md`,
      renderedArtifacts: `${OUT}/reports/rendered-artifacts.json`,
      sourceReceipt: `${OUT}/source-receipt.json`,
      sourceVersion: preservedSourceTiers(wiringPath,
        SOURCES.map((source) => ({ sourceId: source.sourceId, sha256: source.sha256, tier: "exact_content_hash" })))
    }
  };
  fs.mkdirSync(path.dirname(wiringPath), { recursive: true });
  writeWiringChecked(fs, wiringPath,
    preserveGovernanceState(fs, wiringPath, wiring, {
      canonicalSha256: sha256(canonical.bytes),
      log: (line) => console.error(line)
    }));

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1", familyId: FAMILY_ID, routeKeys: [ROUTE_KEY],
    status: "REQUESTED", grantedBy: null, exactSourceReviewComplete: true,
    independentVisualReviewRequired: true, outputLegalApprovalRequired: true,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    status: "BUILT_REVIEW_PENDING", rasterState: "BUILT_RASTER_PENDING",
    builtDocuments: documents.length, renderedArtifacts: 2, rasterPages: 0,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0,
    packetsSelfVerified: 0, productionTouched: false
  });

  return {
    familyId: FAMILY_ID, wrote: true, directory: OUT,
    canonical: { sha256: sha256(canonical.bytes), byteLength: canonical.bytes.length, pageCount: canonical.pages.length },
    boundary: { sha256: sha256(boundary.bytes), byteLength: boundary.bytes.length, pageCount: boundary.pages.length },
    documents: documents.map((d) => ({ formNumber: d.formNumber, sha256: d.sha256, pageCount: d.pageCount })),
    inkReadBackFromOutputBytes: [
      {
        fixture: "canonical",
        valuesReportedByFinalizer: canonical.perDocument.reduce((t, r) => t + r.valuesReportedByFinalizer, 0),
        addedGlyphsReadFromOutputBytes: canonical.perDocument.reduce((t, r) => t + r.addedGlyphsReadFromOutputBytes, 0),
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: canonical.perDocument.reduce((t, r) => t + r.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0),
        selectionsMarked: canonical.perDocument.flatMap((r) => r.selectionsMarked)
      },
      {
        fixture: "boundary",
        valuesReportedByFinalizer: boundary.perDocument.reduce((t, r) => t + r.valuesReportedByFinalizer, 0),
        addedGlyphsReadFromOutputBytes: boundary.perDocument.reduce((t, r) => t + r.addedGlyphsReadFromOutputBytes, 0),
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: boundary.perDocument.reduce((t, r) => t + r.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0),
        selectionsMarked: boundary.perDocument.flatMap((r) => r.selectionsMarked)
      }
    ],
    boundaryOnlyRequiredBeforeFiling: boundary.perDocument.flatMap((row) => row.tooLongToFit
      .map((item) => ({ form: row.formNumber, field: item.blankId, label: item.effectiveLabel, measuredWhy: item.measuredWhy }))),
    canonicalTooLongToFit: canonical.perDocument.flatMap((row) => row.tooLongToFit),
    requiredBeforeFiling: supplyRows.length, laterCompletion: laterRows.length,
    participantElections: electionRows.length, routeSelectionsMade: electedControlIds.size,
    unclassified: unclassified.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  build({ check: process.argv.includes("--check") })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}

export { build, FAMILY_ID, OUT, BUILD_SCRIPT };
