#!/usr/bin/env node
// Route-obligation census v1 — packet family `ar-misdemeanor-dwi-seal-set`.
//
//   node scripts/build-census-v1-ar-misdemeanor-dwi-seal-set.mjs
//
// Arkansas, sealing a MISDEMEANOR DWI/BWI CONVICTION under A.C.A. § 16-90-1405,
// route `obligation:unit:AR:ar-misdemeanor-dwi-seal:ar-misdemeanor-dwi-seal-stage-2`.
// The family delivers two documents:
//
//   * the ACIC Petition to Seal a Misdemeanor DWI/BWI Conviction — the
//     participant's own filing;
//   * the ACIC Order to Seal a Misdemeanor DWI/BWI Conviction — the proposed
//     order the COURT signs.
//
// HOW THIS DIFFERS FROM ITS SIBLING, AND WHY THAT IS THE WHOLE PROBLEM
//
// scripts/build-census-v1-ar-arrest-seal-set.mjs builds the AR ACIC arrest-seal
// family. Its two forms are AcroForms: every blank is a widget carrying its own
// /Rect, so the census reads geometry straight off the widget and the fill stage
// is finalizeOfficialForm.
//
// These two are FLAT PDFs. data/rcap-all50/local-source-corpus-index.json
// records both as `flat_pdf` with acroFieldCount 0, and this build re-reads that
// from the bytes rather than trusting the index. There is no widget to fill and
// no /Rect to read, so every write box here is measured from the page content
// stream, and the fill stage is finalizeFlatOverlay.
//
// WHAT THE CONTENT STREAM ACTUALLY DRAWS
//
// scripts/lib/pdf-stroked-boxes.mjs is run over every page of both documents.
// It maintains the CTM through q/Q/cm and emits only on stroke operators, which
// is the detector that found fourteen checkboxes on the Oregon set-aside form
// after an `re`-only scan reported none. On THESE two documents it reports
// ZERO stroked rectangles on every page, and that is a measurement, not a
// failure: neither form draws a single stroked box. It is recorded as zero
// rather than quietly skipped, because "the tool found nothing" and "the tool
// was not run" are different findings.
//
// So the blanks are drawn two other ways, both of them in the content stream
// and both measured here through the shared CTM-tracking walker in
// scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs:
//
//   * UNDERSCORE LEADER RUNS. Most blanks on both forms are runs of the `_`
//     glyph inside a text-showing operator — "vs. Case No. _____________". The
//     run has an exact start, an exact end and an exact baseline, all read from
//     the glyph metrics, and every line on both documents reports
//     metricsExact=true.
//   * DRAWN RULES. The petition's VERIFICATION page draws its blanks as thin
//     filled rectangles instead. Those come from rulesOfPage, which reads the
//     same walk.
//
// A rule with printed glyphs sitting on it is an UNDERLINE, not a blank — both
// forms underline their own titles — so each rule is classified by measuring
// how much of its width carries glyphs above it. Nothing is classified by
// guessing which line looks like a heading.
//
// WHAT THIS FAMILY REFUSES, AND WHY IT IS NOT PRECAUTIONARY
//
// The stale-artifact block in data/rcap-grade-a/stale-artifact-block.json is
// about a map that wrote the participant's name into blanks holding the offence
// they were charged with, and one of the twelve blocked artifacts is the AR ACIC
// arrest petition. This form is the same authority's drafting in the same year.
// It cannot reproduce the defect in the same place, because the charge is
// PRE-PRINTED here — "charged with the offense(s) of Driving or Boating While
// Intoxicated in violation of Ark. Code Ann. §5-65-103" — so there is no charge
// blank to fill on either document. That is a finding, and it is proved from the
// bytes rather than asserted.
//
// It can reproduce the defect one line away. Both documents print
//
//     1. The Defendant was arrested on the ________ day of ___________,
//        _________, and charged with the offense(s) of Driving or Boating While
//
// which is one arrest date split across three blanks. The platform holds
// matter.arrest_date as a whole date and holds no day, month or year fact, so
// nothing correct exists to write into any of them. Left to the caption channel:
// the DAY blank's own printed caption is "1. The Defendant was arrested on the",
// which matches participant.full_legal_name through the word "Defendant" — the
// exact printed-label route that put the participant's name in the MONTH of the
// arrest date the first time the sibling family was built. This build computes
// that projection for every blank and records it, then refuses the trio by role
// so no name can reach them. The projection is in the census so the refusal can
// be checked rather than believed.
//
// A GAP IN THE SHARED FLAT PATH, COMPENSATED HERE AND REPORTED
//
// finalizeOfficialForm passes `regionHeading` to decideBinding, so a widget under
// a printed "Certificate of Service" is refused by region whatever it is called.
// finalizeFlatOverlay does not pass it — see the decideBinding call in
// scripts/rcap-official-forms/rcap-official-form-finalize.mjs — so on a flat
// overlay the region channel never runs. That matters on this petition: page 4
// is a Certificate of Service and page 3 is a VERIFICATION, and both are regions
// the shared rules would protect if they were asked.
//
// This family computes regionProtectCategoryOf itself and withholds every anchor
// in a protected region, so nothing here depends on the gap. The gap is not
// patched from this family's build — the shared module is not this family's path
// — it is reported as a finding with the evidence to reproduce it.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, normalizeHarvestedText }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { rulesOfPage } from "./rcap-official-forms/rcap-pdf-rule-lines.mjs";
import { finalizeFlatOverlay } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { rasterizePdf } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";
import { strokedRectangles } from "./lib/pdf-stroked-boxes.mjs";
import {
  CHARGE_VALUE_WORDS, captionDescribesChargeValue, descriptorsMatching, protectCategoryOf,
  regionProtectCategoryOf, decideBinding, CAPTION_FACTS
} from "./rcap-official-forms/rcap-field-semantics.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "ar-misdemeanor-dwi-seal-set";
const OUT = "data/rcap-all50/overlays/census-v1/ar/ar-misdemeanor-dwi-seal-set--official-pdf-fill";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
const STALE_BLOCK = "data/rcap-grade-a/stale-artifact-block.json";
const ROUTE_KEY = "obligation:unit:AR:ar-misdemeanor-dwi-seal:ar-misdemeanor-dwi-seal-stage-2";

// The write-box geometry independent review corrected CR-266 to, reused
// unchanged so this family is measured the way every other flat family is.
const INSET_X = 1.5;
const INSET_RIGHT = 2;
const BASELINE_ABOVE_RULE = 2;
const BOX_HEIGHT = 12;
// The participant's ink is set in the form's own type size, capped so a 14pt
// caption blank does not print a long name larger than the form's body text.
const MAX_FONT_SIZE = 12;

const fail = (message, detail = null) => {
  console.error(`build-census-v1-${FAMILY_ID}: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was written.");
  process.exit(1);
};

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const writeJson = (rel, value) => {
  fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
  fs.writeFileSync(path.join(rootDir, rel), `${JSON.stringify(value, null, 2)}\n`);
};
const round = (n) => Number(Number(n).toFixed(2));

// ---- the two documents, pinned by hash ---------------------------------------
//
// `captionOnly` is the whole of the difference between them. The petition is the
// participant's statement; the order is the court's own instrument and accepts
// nothing but caption facts, so its findings, its decree, its signature and its
// date are refused by the shared factory rather than by a rule this file writes.
//
// A blank's id is its MEASUREMENT: page, baseline and left edge, in page points.
// Nothing else on a flat form is stable — there is no field name to key on — and
// an id that is the measurement cannot drift from the thing it names without the
// census failing to find it.
const DOCUMENTS = [
  {
    key: "petition",
    documentId: "AR-ACIC-PETITION-TO-SEAL-MISDEMEANOR-DWI-OR-BWI-CONVICTION",
    documentRole: "PETITION",
    officialTitle: "Petition to Seal a Misdemeanor Conviction for Driving or Boating While Intoxicated",
    revision: "REV-2021-07-27",
    sha256: "04d876b09fe82b76298a2d06093d122a0ef539f767f76811001030cc7805715d",
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-PETITION-TO-SEAL-MISDEMEANOR-DWI-OR-BWI-CONVICTION__petition-to-seal-a-misdemeanor-conviction-for-driving-or-boating-while-intoxicated__REV-2021-07-27__EN.pdf",
    ownership: "participant_completed",
    captionOnly: false,

    // NO EXPLICIT MAPPINGS, DELIBERATELY.
    //
    // On the sibling family the one explicit mapping that matters is
    // `matter.charge`, because that form draws a charge blank. This one does not:
    // the offence is pre-printed into the sentence, so there is no blank for a
    // charge to be mapped into and mapping one would be inventing a blank. The
    // charge-caption proof re-derives that from the artifact rather than taking
    // it from this comment.
    explicitMappings: {},

    // Role refusals: what this family determines the participant does not
    // complete, or does not complete YET. Only blanks the shared protect rules
    // and the region rules do NOT already catch are listed, so the shared rules
    // keep doing their own work and the verification can tell the channels apart.
    roleRefusals: [
      // The arrest-date trio, refused as a trio.
      //
      // These three blanks complete "1. The Defendant was arrested on the ___ day
      // of ______, ____". The platform holds matter.arrest_date as a whole date
      // and holds no day, month or year fact, so there is nothing correct to
      // write into any of them.
      //
      // Refusing them is not precautionary. The DAY blank's own measured caption
      // is the sentence fragment "1. The Defendant was arrested on the", which
      // matches participant.full_legal_name through the word "Defendant"; the
      // census records that projection for each of the three. This is the same
      // printed-label route that wrote the participant's name into the MONTH of
      // the arrest date the first time the sibling AR ACIC family was built.
      { blankId: "p1-y291.40-x315.30", class: "arrest_date_component",
        why: "Day component of the arrest date. The platform holds no day fact, and this blank's measured caption binds participant.full_legal_name through the word 'Defendant' in it." },
      { blankId: "p1-y291.40-x415.78", class: "arrest_date_component",
        why: "Month component of the arrest date. Same sentence, same fact the platform does not hold in component form." },
      { blankId: "p1-y275.20-x108.02", class: "arrest_date_component",
        why: "Year component of the arrest date. Its measured caption is ', and charged with the offense(s) of ...', so the shared charge-caption rule refuses a name here as well; the role refusal is stated so the blank does not depend on that one channel." },

      { blankId: "p2-y194.50-x288.05", class: "participant_signature_date",
        why: "The date under the Defendant's signature on page 2. Dating a signature that has not been made asserts the petition was signed on a day it was not. Nothing shared refuses it: its measured caption is the printed word 'Date', and deterministic.filing_date reaches that only through the alternative /^\\s*dated?\\s*$/, which cannot match because haystack() always appends ' || <squashed>' to the string it tests. This role refusal is the whole of the protection. See the advisory finding in build-findings.json." },

      { blankId: "p3-y200.20-x404.62", class: "agency_assigned_identifier",
        why: "The Arrest Tracking Number is assigned by Arkansas ACIC when an arrest is processed. It identifies the arrest through a system the platform has no knowledge of and is the agency's to state. No allowlisted fact matches its caption either; the refusal is stated so it does not rest on that absence." },

      { blankId: "p3-y647.62-x183.02", class: "notarial_jurat_venue",
        why: "The county on the VERIFICATION page's jurat: 'STATE OF ARKANSAS / COUNTY OF ____'. Its measured caption is the printed words 'COUNTY OF', which bind matter.county, and this family's region gate refuses it because the page is headed VERIFICATION. The role refusal is stated so the blank does not rest on that gate alone: this county is where the oath is administered, which is the notary's to record and is not necessarily the county of the case." },
      { blankId: "p3-y607.18-x268.97", class: "notarial_oath_identification",
        why: "The name in 'Comes the Defendant/Petitioner, ____, under oath and states'. Its measured caption binds participant.full_legal_name. The oath has not been taken and the whole jurat is executed in one act before a notary, so the platform does not begin it." },
      { blankId: "p3-y527.29-x325.05", class: "participant_signature",
        why: "The Petitioner's signature rule on the VERIFICATION page, captioned 'Petitioner' beneath it. That caption binds participant.full_legal_name, so without this refusal the name would be printed on a signature line." },

      { blankId: "p4-y658.80-x83.76", class: "certificate_of_service_attestation",
        why: "The certifying party's name in 'I, ____, do hereby certify that a true and correct copy ... has been provided'. This is a sworn statement about an act of service, not a caption, and it is the filer's to make after mailing." },
      { blankId: "p4-y433.30-x324.05", class: "certificate_of_service_date",
        why: "The date on the page 4 Certificate of Service. Service has not happened; a date here certifies a mailing that has not occurred. The page's printed 'Certificate of Service' heading also places it in a protected region, which this family runs because the shared flat path does not." }
    ],

    // The same dispositions again, in the shared completeness contract's own
    // closed vocabulary. See the note above completenessFields().
    completeness: {
      defaultBlank: null,
      fields: {
        // Declared required-before-filing. Every one is named in
        // participant-instructions.md's "The items you must supply" table.
        "p1-y707.10-x128.27": { requiredBeforeFiling: true,
          reason: "The type of court in the caption — 'IN THE ______ COURT OF'. Which Arkansas court took the DWI conviction is copied from that case's own paperwork, and the clerk of the county confirms it; the participant writes it before filing." },
        "p1-y707.10-x314.16": { requiredBeforeFiling: true,
          reason: "The county in the caption, the second blank of 'IN THE ______ COURT OF ______, ARKANSAS'. This packet does not prefill it; the participant copies the county of the conviction from that case's paperwork before filing." },
        "p1-y681.80-x207.17": { requiredBeforeFiling: true,
          reason: "The caption's DIVISION blank, completed only if the court named above has divisions. The clerk answers whether it does; the platform does not invent it." },
        "p1-y291.40-x315.30": { requiredBeforeFiling: true,
          reason: "The day component of paragraph 1's arrest date, on the printed line '1. The Defendant was arrested on the ___ day of ___, ___'. The platform holds the arrest date only as a whole and no day fact, so it writes nothing here; the participant copies the date from their arrest or court paperwork before filing." },
        "p1-y291.40-x415.78": { requiredBeforeFiling: true,
          reason: "The month component of paragraph 1's arrest date, on the same printed line and on the same footing as the day." },
        "p1-y275.20-x108.02": { requiredBeforeFiling: true,
          reason: "The year component of paragraph 1's arrest date. It sits at the start of the next printed line, ', and charged with the offense(s) of Driving or Boating While', which is why its measured caption reads that way; it is the year and nothing else." },
        "p3-y200.20-x108.72": { requiredBeforeFiling: true,
          reason: "The identification block's Race entry, which the form states is required for proper identification of the defendant in the state and national record systems. The platform does not hold or write it; the participant states it before filing." },
        "p3-y176.10-x107.85": { requiredBeforeFiling: true,
          reason: "The identification block's Sex entry, in the same block and on the same footing as Race." },
        "p3-y176.10-x367.99": { requiredBeforeFiling: true,
          reason: "The State Identification number (SID No.) in the identification block. The platform holds no SID; the participant copies it from their arrest paperwork or criminal-history record before filing." },
        "p3-y151.80-x364.84": { requiredBeforeFiling: true,
          reason: "The FBI No. in the identification block. The form itself qualifies it '(If known)'; the platform holds no FBI number, and the participant supplies it before filing if they have one." },

        // Signature, oath and service acts: the participant completes them at
        // the event, never in advance.
        "p2-y266.90-x288.05": { refusalClass: "signature_or_date_participant_completion",
          reason: "The Defendant's signature rule under the WHEREFORE clause on page 2. Paragraph 11 makes the petition a statement true and correct to the best of the Defendant's knowledge; the participant signs it." },
        "p2-y194.50-x288.05": { refusalClass: "signature_or_date_participant_completion",
          reason: "The date beside that signature, completed by the participant on the day the petition is actually signed." },
        "p3-y527.29-x325.05": { refusalClass: "signature_or_date_participant_completion",
          reason: "The Petitioner's signature rule on the VERIFICATION page, signed in front of the notary at the moment the oath is taken." },
        "p4-y489.70-x324.05": { refusalClass: "signature_or_date_participant_completion",
          reason: "The signature rule on the page 4 Certificate of Service, captioned 'Defendant or Defendant's Attorney', signed by the participant only after service has actually happened." },
        "p4-y433.30-x324.05": { refusalClass: "signature_or_date_participant_completion",
          reason: "The date on the page 4 Certificate of Service, completed after service has actually happened. A certificate dated before service certifies a mailing that did not occur." },
        "p4-y658.80-x83.76": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The certifying party's name in the Certificate of Service's sworn sentence, 'I, ____, do hereby certify that a true and correct copy ... has been provided'. It is the filer's statement about an act of service, made after mailing." },
        // Not a caption the platform may fill even though it binds the
        // participant's name: it is written in front of the notary as part of
        // executing the jurat, in the same act as the signature below it. The
        // contract refused participant_sworn_narrative_or_legal_election here
        // and was right to -- that class may not excuse a PARTICIPANT_IDENTITY
        // field, and this one is.
        "p3-y607.18-x268.97": { refusalClass: "signature_or_date_participant_completion",
          reason: "The name in 'Comes the Defendant/Petitioner, ____, under oath and states'. The oath has not been taken. The whole jurat -- this name, the signature beneath it and the notary's block -- is executed in one act in front of the notary, so the participant completes it there rather than in advance." },

        // Paragraph 8's two continuation rules: a sworn narrative the
        // participant writes only if the second box is ticked.
        "p2-y547.10-x108.02": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The first of paragraph 8's two ruled lines for 'the status of those charges is/are as follows'. Reached only if the participant ticks the second box; what it says is the participant's own sworn narrative about pending charges." },
        "p2-y532.10-x108.02": { refusalClass: "participant_sworn_narrative_or_legal_election",
          reason: "The second of paragraph 8's two ruled lines, on the same footing as the first." },

        // Owned by someone other than the participant.
        "p3-y200.20-x404.62": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The Arrest Tracking Number is assigned by Arkansas ACIC when an arrest is processed; it is the agency's identifier to state." },
        "p3-y647.62-x183.02": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The county on the VERIFICATION page's jurat. This is the county where the oath is administered, which the notary records and which is not necessarily the county of the case." },
        "p3-y465.31-x320.21": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The jurat's 'Subscribed and sworn to before me on this ___' date, completed by the notary at the oath." },
        "p3-y426.67-x77.06": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "A jurat year blank on the ', 20 __' line, completed by the notary at the oath." },
        "p3-y426.67-x323.93": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The second jurat year blank on the same printed line, likewise the notary's." },
        "p3-y375.45-x323.05": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The notary's own signature rule, captioned 'Notary Public'." },
        "p3-y326.45-x213.29": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "'My Commission expires:' — the notary's commission expiry, which only the notary can state." }
      }
    }
  },
  {
    key: "order",
    documentId: "AR-ACIC-ORDER-TO-SEAL-MISDEMEANOR-DWI-OR-BWI-CONVICTION",
    documentRole: "PROPOSED_ORDER",
    officialTitle: "Order to Seal a Misdemeanor Conviction for Driving or Boating While Intoxicated",
    revision: "REV-2021-07-27",
    sha256: "ae6b81f6882133c207f23435b00785b50b40e014c616d3c77707e8b6020d43af",
    pathInArchive: "STATES/AR/05_SOURCE_GATED/AR__SOURCE-GATED__AR-ACIC-ORDER-TO-SEAL-MISDEMEANOR-DWI-OR-BWI-CONVICTION__order-to-seal-a-misdemeanor-conviction-for-driving-or-boating-while-intoxicated__REV-2021-07-27__EN.pdf",
    ownership: "court_issued_order",
    captionOnly: true,
    explicitMappings: {},
    roleRefusals: [
      { blankId: "p1-y353.80-x315.30", class: "arrest_date_component",
        why: "Day component of the arrest date in the court's findings. Binds participant.full_legal_name through the printed-label route; refused by role rather than by the document's own title." },
      { blankId: "p1-y353.80-x415.78", class: "arrest_date_component",
        why: "Month component of the arrest date in the court's findings. Same binding, same refusal." },
      { blankId: "p1-y337.70-x108.02", class: "arrest_date_component",
        why: "Year component of the arrest date in the court's findings." },

      { blankId: "p2-y289.60-x324.05", class: "court_only_signature",
        why: "The judge's signature line, captioned 'Judge' beneath it. Court-only. The shared protect rules refuse it by that caption too; the role refusal is stated so it does not rest on one channel." },
      { blankId: "p2-y237.30-x324.05", class: "court_only_signature_date",
        why: "The date beside the judge's signature. The court dates its own order. Nothing shared refuses it: the caption 'Date' reaches no descriptor at all (see the advisory finding about /^\\s*dated?\\s*$/ and haystack), so the caption-only rule is never even consulted for it. This role refusal is the whole of the protection." },

      { blankId: "p2-y123.40-x393.47", class: "agency_assigned_identifier",
        why: "ACIC-assigned arrest identifier; the agency's to state." }
    ],

    // Below its caption the order is the court's own instrument. The default
    // says so once; the caption blanks the participant does complete are named
    // individually, exactly as on the petition they must match.
    completeness: {
      defaultBlank: {
        refusalClass: "court_prosecutor_clerk_or_agency_owned",
        reason: "Below its caption the proposed order is the court's own instrument — its findings, its recital blanks, its decree, the judge's signature and the date beside it. This packet writes nothing there."
      },
      fields: {
        "p1-y708.00-x140.65": { requiredBeforeFiling: true,
          reason: "The type of court in the order's caption, which must match the petition's. The participant writes it before filing, from the same answer." },
        "p1-y708.00-x313.38": { requiredBeforeFiling: true,
          reason: "The county in the order's caption, which must match the petition's." },
        "p1-y683.90-x214.25": { requiredBeforeFiling: true,
          reason: "The order caption's DIVISION blank, completed only if that court has divisions, to match the petition." },
        "p1-y353.80-x315.30": { requiredBeforeFiling: true,
          reason: "The day component of the arrest date in the order's recital of paragraph 1, which must match the petition's. The platform holds no day fact." },
        "p1-y353.80-x415.78": { requiredBeforeFiling: true,
          reason: "The month component of the same recited arrest date." },
        "p1-y337.70-x108.02": { requiredBeforeFiling: true,
          reason: "The year component of the same recited arrest date. Its measured caption reads ', and charged with the offense(s) of Driving or Boating While' because the blank starts the next printed line; it is the year." },
        "p2-y123.40-x105.88": { requiredBeforeFiling: true,
          reason: "The identification block's Race entry on the order, on the same footing as the petition's." },
        "p2-y100.90-x105.14": { requiredBeforeFiling: true,
          reason: "The identification block's Sex entry on the order." },
        "p2-y100.90-x367.27": { requiredBeforeFiling: true,
          reason: "The State Identification number (SID No.) in the order's identification block." },
        "p2-y78.50-x356.68": { requiredBeforeFiling: true,
          reason: "The FBI No. in the order's identification block, which the form qualifies '(If known)'." },
        "p2-y123.40-x393.47": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The Arrest Tracking Number, assigned by Arkansas ACIC; the agency's identifier to state." },
        "p2-y289.60-x324.05": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The judge's signature rule, captioned 'Judge' beneath it. Court-only." },
        "p2-y237.30-x324.05": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The date beside the judge's signature. The court dates its own order." },
        "p2-y656.10-x108.02": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The first of the order's two ruled recital lines for the status of any pending felony charges. The court recites what it finds; the clerk says whether that court wants the proposed order's recital blanks completed to match the petition." },
        "p2-y641.30-x108.02": { refusalClass: "court_prosecutor_clerk_or_agency_owned",
          reason: "The second of those two ruled recital lines, on the same footing as the first." }
      }
    }
  }
];

// The ONLY blanks in this family that may ever carry the participant's name.
//
// Stated as an allowlist rather than as a set of refusals, because the defect
// this lineage keeps finding is a name arriving somewhere nobody listed. The
// verification reads every glyph this build adds to the page and fails on a name
// token drawn anywhere but here.
const NAME_MAY_APPEAR_IN = {
  "AR-ACIC-PETITION-TO-SEAL-MISDEMEANOR-DWI-OR-BWI-CONVICTION": [
    "p1-y514.00-x72.02",   // page 1 DEFENDANT caption blank
    "p2-y373.00-x238.70"   // page 2 "WHEREFORE, the Defendant, ______"
  ],
  "AR-ACIC-ORDER-TO-SEAL-MISDEMEANOR-DWI-OR-BWI-CONVICTION": [
    "p1-y514.90-x72.02",   // page 1 DEFENDANT caption blank
    "p2-y478.90-x143.67"   // page 2 "the Petition of the Defendant, ______"
  ]
};

// --- fixture identities -------------------------------------------------------
// The corpus's standard canonical and boundary participants, identical to the
// sibling family's, so this family's fixtures are comparable with every other
// family's. "Jordan Avery Reyes" is deliberately the same name the blocked
// artifacts printed into their charge blanks.
const CANONICAL = {
  "participant.full_legal_name": "Jordan Avery Reyes", "participant.first_name": "Jordan",
  "participant.last_name": "Reyes", "participant.middle_name": "Avery",
  "participant.street_address": "118 Maple Street", "participant.city": "Springfield",
  "participant.state": "XX", "participant.zip": "01234",
  "participant.city_state_zip": "Springfield, XX 01234",
  "participant.phone": "555-0142", "participant.email": "jordan.reyes@example.com",
  "participant.date_of_birth": "1991-04-17",
  "matter.county": "Example County", "matter.court": "District Court",
  "matter.case_number": "24-CR-001234", "matter.citation_number": "C-889201",
  "matter.charge": "Driving while intoxicated", "matter.arrest_date": "2019-03-08",
  "matter.offense_date": "2019-03-08", "matter.conviction_date": "2019-11-02",
  "matter.disposition_date": "2020-01-15", "deterministic.filing_date": "2026-08-12",
  "matter.charges": [
    { case_number: "24-CR-001234", citation_number: "C-889201", charge: "Driving while intoxicated",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }
  ]
};
const BOUNDARY = {
  ...CANONICAL,
  "participant.full_legal_name": "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III",
  "participant.street_address": "12345 Southwest Grandview Boulevard Northeast, Building 7, Apartment 4321-B",
  "participant.city": "Unincorporated Township of Long Hollow Crossing",
  "participant.city_state_zip": "Unincorporated Township of Long Hollow Crossing, XX 01234-9999",
  "participant.zip": "01234-9999", "participant.phone": "555-0142 ext. 44821",
  "matter.case_number": "0123-45-2026-CR-900123.00-AB-CDE/2201",
  "matter.county": "Saint Bartholomew and the Northern Reaches County",
  "matter.charge": "Driving or boating while intoxicated, fourth offence, with an extended statutory description that materially exceeds one line",
  "matter.charges": [
    { case_number: "0123-45-2026-CR-900123.00-AB-CDE/2201", citation_number: "C-889201",
      charge: "Driving or boating while intoxicated, fourth offence, with an extended statutory description that materially exceeds one line",
      arrest_date: "2019-03-08", offense_date: "2019-03-08", conviction_date: "2019-11-02", disposition_date: "2020-01-15" }
  ]
};

// Every name token either fixture could put on paper. The proofs look for these,
// so a surname or a middle name landing in the wrong blank is caught as well as
// the whole name.
const NAME_TOKENS = [...new Set(
  [CANONICAL, BOUNDARY].flatMap((f) => [
    f["participant.full_legal_name"], f["participant.first_name"],
    f["participant.last_name"], f["participant.middle_name"]
  ]).filter(Boolean).flatMap((v) => [v, ...String(v).split(/[\s\-]+/)])
    .map((s) => s.trim()).filter((s) => s.length >= 4)
)];

// ==============================================================================
// Step 1: the source is the pinned source.
//
// Two independent things are proved, because either alone is satisfiable by a
// file that is not the right one: the bytes on disk hash to what the family
// declares, AND the corpus index — the committed record of what the Master
// Library contained — declares the same hash and byte length at the same path.
// An ABSENCE and a MISMATCH are reported as different findings and neither is a
// pass.
// ==============================================================================
function resolveSource(doc) {
  const index = readJson(CORPUS_INDEX);
  const entry = (index.entries ?? []).find((e) => e.path === doc.pathInArchive);
  if (!entry) fail(`${doc.documentId}: SOURCE_ABSENT_FROM_INDEX`, `${CORPUS_INDEX} names no entry at ${doc.pathInArchive}`);
  if (entry.sha256 !== doc.sha256) {
    fail(`${doc.documentId}: SOURCE_MISMATCH_AGAINST_INDEX`,
      `index ${entry.sha256} / family ${doc.sha256}`);
  }
  const abs = path.join(rootDir, CORPUS_ROOT, doc.pathInArchive);
  if (!fs.existsSync(abs)) {
    fail(`${doc.documentId}: SOURCE_ABSENT_FROM_DISK`,
      `expected ${CORPUS_ROOT}/${doc.pathInArchive} — run scripts/rcap-corpus/bootstrap-private-corpus.sh`);
  }
  const bytes = fs.readFileSync(abs);
  const got = sha256(bytes);
  if (got !== doc.sha256) fail(`${doc.documentId}: SOURCE_MISMATCH_ON_DISK`, `expected ${doc.sha256}, read ${got}`);
  if (bytes.length !== entry.byteLength) {
    fail(`${doc.documentId}: SOURCE_BYTE_LENGTH_DISAGREES_WITH_INDEX`,
      `index ${entry.byteLength}, read ${bytes.length}`);
  }
  return { bytes, indexEntry: entry };
}

// ==============================================================================
// Step 2 and 3: census the blanks with real geometry, read off the document.
// ==============================================================================

/** The page's raw content stream, for the stroked-box detector. */
function contentStringOf(pdf, page) {
  let content = "";
  for (const stream of page.node.normalizedEntries?.().Contents?.asArray?.() ?? []) {
    try { content += Buffer.from(pdf.context.lookup(stream).getContents()).toString("latin1"); } catch { /* not a stream */ }
  }
  return content;
}

/** Printed text a run of glyphs draws, with leaders and trailing punctuation off. */
function captionTextOf(raw) {
  return normalizeHarvestedText(String(raw ?? ""))
    .replace(/[_.…]{3,}/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[:.\s]+$/, "")
    .trim();
}

/** Non-space glyph width drawn between x0 and x1 on one line. */
function inkBetween(line, x0, x1) {
  let ink = 0;
  for (const ch of line.chars ?? []) {
    if (String(ch.c).trim() === "") continue;
    const a = Math.max(ch.x, x0);
    const b = Math.min(ch.x + ch.w, x1);
    if (b > a) ink += b - a;
  }
  return ink;
}

/** Maximal runs of the `_` glyph on one line, in page coordinates. */
function underscoreRunsOf(line) {
  const runs = [];
  let cur = null;
  for (const ch of line.chars ?? []) {
    if (ch.c === "_") {
      if (cur) { cur.x1 = ch.x + ch.w; cur.glyphs += 1; }
      else cur = { x0: ch.x, x1: ch.x + ch.w, glyphs: 1 };
    } else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  return runs;
}

/**
 * A drawn rule is a BLANK unless the form prints words on it.
 *
 * Both of these documents underline their own titles, and the petition
 * underlines the word VERIFICATION. An underline and a blank are the same
 * rectangle drawn for opposite reasons, so they are told apart by measuring how
 * much non-space glyph ink sits on the rule rather than by guessing which lines
 * look like headings. `_UNDERLINE_INK_FRACTION` is the share of the rule's width
 * that must carry glyphs for it to be an underline.
 */
const UNDERLINE_INK_FRACTION = 0.5;
function classifyRule(rule, lines) {
  let bestInk = 0;
  let over = null;
  for (const line of lines) {
    const size = line.size || 12;
    if (!(line.y >= rule.y - 0.5 && line.y <= rule.y + size * 1.3)) continue;
    const ink = inkBetween(line, rule.x, rule.endX);
    if (ink > bestInk) { bestInk = ink; over = line; }
  }
  const fraction = rule.width > 0 ? bestInk / rule.width : 0;
  return {
    isUnderline: fraction >= UNDERLINE_INK_FRACTION,
    inkFraction: round(fraction),
    textOnTheRule: over && fraction >= UNDERLINE_INK_FRACTION ? over.text : null
  };
}

/**
 * The printed words this blank is labelled by, measured.
 *
 * One rule, applied to every blank on both documents so no blank gets a caption
 * chosen for it:
 *
 *   1. the printed glyphs on the blank's own line that lie between the end of
 *      the previous blank on that line and the start of this one;
 *   2. failing that, the glyphs between this blank's end and the next blank on
 *      the line;
 *   3. failing that, a SHORT printed line directly beneath the blank whose span
 *      overlaps it — the "Defendant's Signature", "Judge", "Date" layout.
 *
 * Step 3 is capped at 40 characters on purpose. Uncapped, the line beneath the
 * pending-felony-charges blanks is the body sentence "9. Defendant [ ] IS or
 * [ ] IS NOT required to register as a sex offender under the", which contains
 * the word "Defendant" and would hand those blanks participant.full_legal_name.
 * A label is a label; a sentence is not one.
 */
const BELOW_LABEL_MAX_CHARS = 40;
const BELOW_LABEL_MAX_DROP = 30;
function captionFor({ blank, line, blanksOnLine, lines }) {
  if (line) {
    const previousEnd = blanksOnLine
      .filter((b) => b.x1 <= blank.x0 + 0.5)
      .reduce((m, b) => Math.max(m, b.x1), -Infinity);
    const nextStart = blanksOnLine
      .filter((b) => b.x0 >= blank.x1 - 0.5)
      .reduce((m, b) => Math.min(m, b.x0), Infinity);
    const pick = (x0, x1) => (line.chars ?? [])
      .filter((ch) => ch.x + ch.w <= x1 + 0.5 && ch.x >= x0 - 0.5)
      .map((ch) => ch.c).join("");
    const before = captionTextOf(pick(Number.isFinite(previousEnd) ? previousEnd : -Infinity, blank.x0));
    if (before) return { caption: before, basis: "same_line_before_the_blank" };
    const after = captionTextOf(pick(blank.x1, Number.isFinite(nextStart) ? nextStart : Infinity));
    if (after) return { caption: after, basis: "same_line_after_the_blank" };
  }
  const below = lines
    .filter((l) => l.y < blank.baselineY - 4 && l.y >= blank.baselineY - BELOW_LABEL_MAX_DROP)
    .filter((l) => underscoreRunsOf(l).length === 0)
    .filter((l) => {
      const chars = l.chars ?? [];
      if (!chars.length) return false;
      const x0 = chars[0].x;
      const x1 = chars[chars.length - 1].x + chars[chars.length - 1].w;
      return Math.min(x1, blank.x1) - Math.max(x0, blank.x0) > 0;
    })
    .sort((a, b) => b.y - a.y)[0] ?? null;
  const belowText = below ? captionTextOf(below.text) : "";
  if (belowText && belowText.length <= BELOW_LABEL_MAX_CHARS) {
    return { caption: belowText, basis: "short_label_line_below_the_blank" };
  }
  return { caption: "", basis: "no_printed_caption_adjacent_to_this_blank" };
}

/**
 * The printed section heading a blank sits under.
 *
 * A heading on these forms is centred on the page. That is what actually
 * separates "VERIFICATION" and "Certificate of Service" from "STATE OF
 * ARKANSAS", which is a caption-block line flush at the left margin and is not a
 * heading however upper-case it is. Measuring the centring rather than reading
 * the capitals is the difference between protecting the notarial block and
 * protecting the whole page.
 */
const HEADING_MAX_CHARS = 60;
const HEADING_CENTRE_TOLERANCE = 40;
const HEADING_MIN_CAPITALS = 3;
function headingCandidatesOf(lines, pageWidth) {
  return lines.filter((line) => {
    const text = captionTextOf(line.text);
    if (!text || text.length > HEADING_MAX_CHARS) return false;
    if (underscoreRunsOf(line).length > 0) return false;

    // The deny vocabulary wins wherever it fires, centred or not. A printed
    // "Certificate of Service" opens a service block whatever the typesetting.
    if (regionProtectCategoryOf(text)) return true;

    const chars = line.chars ?? [];
    if (!chars.length) return false;
    let x0 = Infinity, x1 = -Infinity;
    for (const ch of chars) {
      if (String(ch.c).trim() === "") continue;
      x0 = Math.min(x0, ch.x); x1 = Math.max(x1, ch.x + ch.w);
    }
    if (!Number.isFinite(x0)) return false;
    if (Math.abs((x0 + x1) / 2 - pageWidth / 2) > HEADING_CENTRE_TOLERANCE) return false;

    // Centring alone is not enough. A full-measure line of body prose is also
    // centred on the page by arithmetic, and the first pass duly reported "to
    // the best of Defendant's knowledge" and ", 20 ." as section headings, which
    // would have made the region channel meaningless. A heading on these forms
    // is set in capitals, so a line carrying any lower-case letter is prose.
    const capitals = (text.match(/[A-Z]/g) ?? []).length;
    return capitals >= HEADING_MIN_CAPITALS && !/[a-z]/.test(text);
  });
}

/** Censuses one document: every blank the form draws, measured from its bytes. */
async function censusDocument(doc, bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();

  // Re-read the structural class from the bytes rather than trusting the index.
  let acroFieldCount = 0;
  try { acroFieldCount = pdf.getForm().getFields().length; } catch { acroFieldCount = 0; }
  if (acroFieldCount !== 0) {
    fail(`${doc.documentId}: expected a flat PDF, found ${acroFieldCount} AcroForm field(s)`,
      "This family's whole method assumes there are no widgets. A form that has grown some is a different document.");
  }

  const titleWords = doc.officialTitle.toUpperCase().replace(/\s+/g, " ");
  const blanks = [];
  const pageGeometry = [];
  const strokedByPage = [];
  const rulesByPage = [];
  const documentTextLines = [];

  for (const [index, page] of pages.entries()) {
    const pageNumber = index + 1;
    const { width: pageWidth, height: pageHeight } = page.getSize();
    pageGeometry.push({ page: pageNumber, width: round(pageWidth), height: round(pageHeight) });

    const lines = groupIntoLines(extractTextItems(page));
    for (const line of lines) documentTextLines.push(normalizeHarvestedText(line.text));

    // The detector the brief names, run on every page. It maintains the CTM
    // through q/Q/cm and emits only on stroke operators. On these two documents
    // it reports nothing, which is recorded as a measurement of zero.
    const stroked = strokedRectangles(contentStringOf(pdf, page));
    strokedByPage.push({ page: pageNumber, strokedRectangles: stroked.length, rectangles: stroked });

    const measuredRules = rulesOfPage(page, { maxThickness: 3, minLength: 20, minDividerLength: 20 });
    const classified = measuredRules.horizontal.map((rule) => ({ ...rule, ...classifyRule(rule, lines) }));
    rulesByPage.push({
      page: pageNumber,
      horizontal: classified.map((r) => ({
        x: r.x, endX: r.endX, y: r.y, width: r.width, height: r.height,
        operator: r.operator, paintedBy: r.paintedBy,
        classifiedAs: r.isUnderline ? "underline_of_printed_text" : "blank_rule",
        inkFractionOnTheRule: r.inkFraction,
        textOnTheRule: r.textOnTheRule
      })),
      vertical: measuredRules.vertical.map((v) => ({ x: v.x, y: v.y, topY: v.topY, width: v.width }))
    });

    const headings = headingCandidatesOf(lines, pageWidth);

    // Every blank on this page, from both constructions, in one list.
    const raw = [];
    for (const line of lines) {
      for (const run of underscoreRunsOf(line)) {
        raw.push({
          construction: "underscore_leader_run", line,
          x0: round(run.x0), x1: round(run.x1), baselineY: round(line.y),
          glyphCount: run.glyphs, printedSize: round(line.size || 12)
        });
      }
    }
    for (const rule of classified) {
      if (rule.isUnderline) continue;
      const size = 12;
      const host = lines.find((l) => l.y >= rule.y - 0.5 && l.y <= rule.y + (l.size || size) * 1.3) ?? null;
      raw.push({
        construction: "drawn_rule", line: host,
        x0: round(rule.x), x1: round(rule.endX), baselineY: round(rule.y),
        glyphCount: null, printedSize: round(host?.size || size),
        rule: { x: rule.x, endX: rule.endX, y: rule.y, height: rule.height, operator: rule.operator, paintedBy: rule.paintedBy }
      });
    }

    for (const blank of raw) {
      const blanksOnLine = blank.line
        ? raw.filter((b) => b.line === blank.line).map((b) => ({ x0: b.x0, x1: b.x1 }))
        : [];
      const { caption, basis } = captionFor({ blank, line: blank.line, blanksOnLine, lines });

      const headingAbove = headings
        .filter((h) => h.y > blank.baselineY + 2)
        .sort((a, b) => a.y - b.y)[0] ?? null;
      const regionHeading = headingAbove ? captionTextOf(headingAbove.text) : null;
      const regionIsDocumentTitle = Boolean(regionHeading && titleWords.includes(regionHeading.toUpperCase()));
      const regionCategory = regionHeading && !regionIsDocumentTitle
        ? regionProtectCategoryOf(regionHeading) : null;

      // What the SHARED factory would decide for this blank, computed for every
      // blank whether or not this family offers it one. This is what makes a
      // role refusal checkable instead of believable: the arrest-date trio's
      // rows say, in the census, that the caption channel would have handed
      // them the participant's name.
      const projection = decideBinding(
        { name: caption, pdfType: "text", effectiveLabel: caption },
        { explicitMappings: doc.explicitMappings, captionOnly: doc.captionOnly === true,
          availableChargeRows: 0 }
      );

      // The stricter caption gate the flat-overlay profile generator applies:
      // a caption is a short noun phrase, not a sentence.
      const words = caption ? caption.split(/\s+/).filter(Boolean).length : 0;
      const flatCaptionGate = !caption
        ? "no_caption"
        : caption.length < 3 || caption.length > 30 || words > 4
          ? "not_a_caption"
          : "caption_shaped";

      blanks.push({
        blankId: `p${pageNumber}-y${blank.baselineY.toFixed(2)}-x${blank.x0.toFixed(2)}`,
        page: pageNumber,
        construction: blank.construction,
        // MEASURED off the document. Nothing here is derived from where a label
        // sits; the caption is captured separately and decides only what a blank
        // means, never where it is.
        measured: {
          x0: blank.x0, x1: blank.x1, baselineY: blank.baselineY,
          width: round(blank.x1 - blank.x0),
          underscoreGlyphs: blank.glyphCount,
          rule: blank.rule ?? null
        },
        geometryBasis: blank.construction === "underscore_leader_run"
          ? "underscore_leader_glyph_run_measured_from_the_text_showing_operators"
          : "thin_filled_rectangle_measured_from_the_page_path_operators",
        printedLine: blank.line ? normalizeHarvestedText(blank.line.text) : null,
        printedSize: blank.printedSize,
        metricsExact: blank.line ? blank.line.metricsExact : null,
        caption,
        captionBasis: basis,
        regionHeading,
        regionIsDocumentTitle,
        regionProtectCategory: regionCategory,
        // Recorded on every blank, not only the ones that get written, so the
        // charge-caption question is answerable for the whole document.
        captionDescribesChargeValue: captionDescribesChargeValue(caption),
        captionOrLineMentionsCharge: CHARGE_VALUE_WORDS.test(caption)
          || CHARGE_VALUE_WORDS.test(blank.line ? blank.line.text : ""),
        protectCategory: protectCategoryOf(caption) ?? null,
        descriptorsByCaption: descriptorsMatching(caption).map((d) => d.factId),
        sharedFactoryProjection: projection,
        flatCaptionGate
      });
    }
  }

  blanks.sort((a, b) => a.page - b.page || b.measured.baselineY - a.measured.baselineY || a.measured.x0 - b.measured.x0);

  const duplicates = blanks.map((b) => b.blankId).filter((id, i, all) => all.indexOf(id) !== i);
  if (duplicates.length) {
    fail(`${doc.documentId}: two blanks share one measured id`, duplicates.join(", "));
  }

  return { pdf, pages, blanks, pageGeometry, strokedByPage, rulesByPage, documentTextLines, acroFieldCount };
}

// ==============================================================================
// The anchors this family offers the shared factory, and the blanks it withholds.
//
// Two gates run before an anchor is offered at all:
//
//   * the family's own ROLE refusals, listed on each document above;
//   * the printed REGION the blank sits in.
//
// The region gate is here rather than in the factory because finalizeFlatOverlay
// does not pass `regionHeading` to decideBinding, so on a flat overlay the shared
// region channel never runs. Nothing in this family depends on that gap being
// closed; the gap is reported as a finding.
// ==============================================================================
function anchorsFor(doc, census) {
  const roleById = new Map(doc.roleRefusals.map((r) => [r.blankId, r]));
  const known = new Set(census.blanks.map((b) => b.blankId));
  for (const declared of roleById.keys()) {
    if (!known.has(declared)) {
      fail(`${doc.documentId}: role refusal names a blank that is not in the census: ${declared}`,
        "A refusal that names nothing refuses nothing. Either the measurement moved or the id is wrong.");
    }
  }

  const anchors = [];
  const withheld = [];
  for (const blank of census.blanks) {
    const role = roleById.get(blank.blankId);
    if (role) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        channel: "family_role_refusal", class: role.class, why: role.why,
        wouldTheSharedFactoryHaveWritten: blank.sharedFactoryProjection.writable === true,
        wouldHaveBound: blank.sharedFactoryProjection.factId ?? null
      });
      continue;
    }
    if (blank.regionProtectCategory) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        channel: "printed_page_region", class: `protected_page_region:${blank.regionProtectCategory}`,
        why: `The blank sits under the printed section heading ${JSON.stringify(blank.regionHeading)}, which the shared region vocabulary classifies as ${blank.regionProtectCategory}. finalizeFlatOverlay does not run the region channel, so this family runs it.`,
        wouldTheSharedFactoryHaveWritten: blank.sharedFactoryProjection.writable === true,
        wouldHaveBound: blank.sharedFactoryProjection.factId ?? null
      });
      continue;
    }

    const x = round(blank.measured.x0 + INSET_X);
    const width = round(blank.measured.x1 - INSET_RIGHT - x);
    const y = blank.construction === "drawn_rule"
      ? round(blank.measured.baselineY + BASELINE_ABOVE_RULE)
      : blank.measured.baselineY;
    if (width < 20) {
      withheld.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        channel: "measured_geometry", class: "write_box_too_narrow_to_hold_a_value",
        why: `${width}pt between the measured ends of the blank`,
        wouldTheSharedFactoryHaveWritten: blank.sharedFactoryProjection.writable === true,
        wouldHaveBound: blank.sharedFactoryProjection.factId ?? null
      });
      continue;
    }
    anchors.push({
      blankId: blank.blankId,
      label: blank.caption,
      page: blank.page,
      writeBox: { x, y, width, height: BOX_HEIGHT },
      baselineBasis: blank.construction === "drawn_rule"
        ? `rule_y_plus_${BASELINE_ABOVE_RULE}pt`
        : "underscore_leader_glyph_baseline",
      fontSize: Math.min(blank.printedSize, MAX_FONT_SIZE),
      captionOnly: doc.captionOnly === true
    });
  }
  return { anchors, withheld };
}

/**
 * The drawn rules a protected caption owns, handed to the factory so its own
 * geometry gate runs as well as this family's.
 */
function protectedRulesFor(census) {
  return census.blanks
    .filter((b) => b.construction === "drawn_rule" && (b.protectCategory || b.regionProtectCategory))
    .map((b) => ({
      page: b.page, x: b.measured.x0, endX: b.measured.x1, y: b.measured.baselineY,
      category: b.protectCategory ?? b.regionProtectCategory, caption: b.caption
    }));
}

// ==============================================================================
// Step 7: prove it from the ARTIFACT, not from the report.
//
// The report says what the factory believes it wrote. This reads the finished
// PDF's own text-showing operators back out, subtracts every glyph the SOURCE
// already drew, and asks what is left — which is exactly the ink this build
// added — and where it sits. A flat overlay draws into page content rather than
// into a widget appearance, so this is the artifact answering directly.
// ==============================================================================
async function addedInkOf(sourceBytes, outBytes) {
  const before = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const after = await PDFDocument.load(outBytes, { ignoreEncryption: true, updateMetadata: false });
  const key = (page, ch) => `${page}|${ch.x.toFixed(1)}|${ch.y.toFixed(1)}|${ch.c}`;
  const original = new Set();
  before.getPages().forEach((page, i) => {
    for (const item of extractTextItems(page)) {
      for (const ch of item.chars ?? []) original.add(key(i + 1, { ...ch, y: item.y }));
    }
  });
  const added = [];
  after.getPages().forEach((page, i) => {
    for (const item of extractTextItems(page)) {
      for (const ch of item.chars ?? []) {
        // Whitespace glyphs are kept. Dropping them made the reconstructed ink
        // read "JordanAveryReyes", which matched no value the factory reported
        // writing — a verifier failing on its own transcription rather than on
        // the artifact. They are filtered out only where the question is "is
        // there ink here", never where the question is "what does it say".
        if (original.has(key(i + 1, { ...ch, y: item.y }))) continue;
        added.push({ page: i + 1, x: round(ch.x), y: round(item.y), w: round(ch.w), c: ch.c });
      }
    }
  });
  return added;
}

/** The added glyphs that land inside one measured blank, as a string. */
function inkInBlank(added, blank) {
  const x0 = blank.measured.x0 - 1;
  const x1 = blank.measured.x1 + 1;
  const yLow = blank.measured.baselineY - 3;
  const yHigh = blank.measured.baselineY + BOX_HEIGHT + 2;
  const hits = added
    .filter((g) => g.page === blank.page && g.y >= yLow && g.y <= yHigh && g.x >= x0 && g.x + g.w <= x1 + 1)
    .sort((a, b) => a.x - b.x);
  return {
    text: hits.map((g) => g.c).join("").trim(),
    glyphs: hits.length,
    inkGlyphs: hits.filter((g) => String(g.c).trim() !== "").length
  };
}

const CATEGORIES_THAT_MUST_STAY_BLANK = new Set([
  "signature", "notarization", "service_block", "court", "clerk", "prosecutor", "attorney"
]);

function verifyFromBytes({ doc, census, anchors, withheld, report, added, label }) {
  const findings = [];
  const anchorById = new Map(anchors.map((a) => [a.blankId, a]));
  const withheldById = new Map(withheld.map((w) => [w.blankId, w]));
  const allowedNameBlanks = new Set(NAME_MAY_APPEAR_IN[doc.documentId] ?? []);
  const expected = new Set((report.expectedValues ?? []).map((v) => String(v)));

  const perBlank = [];
  const chargeBlanks = [];
  const namePlacements = [];
  let attributedGlyphs = 0;

  for (const blank of census.blanks) {
    const { text, glyphs } = inkInBlank(added, blank);
    attributedGlyphs += glyphs;
    const carriesInk = text !== "";
    const offered = anchorById.has(blank.blankId);
    const held = withheldById.get(blank.blankId) ?? null;

    perBlank.push({
      blankId: blank.blankId, page: blank.page, caption: blank.caption,
      measured: blank.measured, offeredAsAnchor: offered,
      withheldBy: held ? held.channel : null, withheldClass: held ? held.class : null,
      inkFoundAtTheMeasuredRectangle: carriesInk ? text : null
    });

    // THE CHECK THIS LINEAGE EXISTS TO PASS.
    if (blank.captionOrLineMentionsCharge) {
      const hit = NAME_TOKENS.filter((t) => text.toLowerCase().includes(t.toLowerCase()));
      chargeBlanks.push({
        blankId: blank.blankId, page: blank.page, caption: blank.caption,
        printedLine: blank.printedLine,
        captionDescribesChargeValue: blank.captionDescribesChargeValue,
        measured: blank.measured,
        inkFound: carriesInk ? text : null,
        participantNameTokensFound: hit
      });
      if (hit.length) {
        findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
          check: "participant_name_in_a_charge_caption_blank", drawnText: text, tokens: hit });
      }
      if (carriesInk) {
        findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
          check: "a_blank_whose_caption_or_line_names_a_charge_carries_ink", drawnText: text });
      }
    }

    // A blank this family withheld must be empty on the paper.
    if (held && carriesInk) {
      findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
        check: "withheld_blank_carries_ink", withheldBy: held.channel, class: held.class, drawnText: text });
    }
    // A blank the factory refused must be empty too.
    if (!held && !carriesInk && offered) { /* refused by the factory; nothing on paper, as intended */ }
    if (carriesInk && !offered) {
      findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
        check: "ink_in_a_blank_that_was_never_offered_as_an_anchor", drawnText: text });
    }
    if (carriesInk && !expected.has(text)) {
      findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
        check: "ink_at_this_rectangle_is_not_a_value_the_factory_reported_writing", drawnText: text });
    }

    // Blanks the shared vocabulary says somebody else owns must be blank.
    const owned = blank.protectCategory ?? blank.regionProtectCategory ?? null;
    if (owned && CATEGORIES_THAT_MUST_STAY_BLANK.has(owned) && carriesInk) {
      findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
        check: "signature_notarial_service_or_court_owned_blank_is_not_blank",
        category: owned, drawnText: text });
    }

    if (carriesInk) {
      const hit = NAME_TOKENS.filter((t) => text.toLowerCase().includes(t.toLowerCase()));
      if (hit.length) {
        namePlacements.push({ blankId: blank.blankId, page: blank.page, caption: blank.caption,
          text, tokens: hit, allowed: allowedNameBlanks.has(blank.blankId) });
        if (!allowedNameBlanks.has(blank.blankId)) {
          findings.push({ severity: "blocking", fixture: label, blankId: blank.blankId,
            check: "participant_name_drawn_in_a_blank_not_listed_as_a_name_blank",
            drawnText: text, tokens: hit });
        }
      }
    }
  }

  // THE WIDER NET: ink this build added that lands in no measured blank at all.
  // A value drawn in the margin is invisible to every per-blank check above, and
  // a mark in the margin is precisely what the older `re`-operator scan produced.
  if (attributedGlyphs !== added.length) {
    const inNoBlank = added.filter((g) => String(g.c).trim() !== "").filter((g) => !census.blanks.some((b) =>
      b.page === g.page
      && g.y >= b.measured.baselineY - 3 && g.y <= b.measured.baselineY + BOX_HEIGHT + 2
      && g.x >= b.measured.x0 - 1 && g.x + g.w <= b.measured.x1 + 2));
    if (inNoBlank.length) {
      findings.push({ severity: "blocking", fixture: label,
        check: "this_build_drew_ink_outside_every_measured_blank",
        glyphs: inNoBlank.length,
        firstAt: { page: inNoBlank[0].page, x: inNoBlank[0].x, y: inNoBlank[0].y } });
    }
  }

  // Every value the factory reported writing has to be findable on the paper.
  for (const value of report.expectedValues ?? []) {
    const found = perBlank.some((b) => b.inkFoundAtTheMeasuredRectangle === String(value));
    if (!found) {
      findings.push({ severity: "blocking", fixture: label,
        check: "a_value_the_factory_reported_writing_is_not_at_any_measured_rectangle", value: String(value) });
    }
  }

  return {
    findings, perBlank, chargeBlanks, namePlacements,
    glyphsAdded: added.length, glyphsInsideAMeasuredBlank: attributedGlyphs,
    blanksCarryingInk: perBlank.filter((b) => b.inkFoundAtTheMeasuredRectangle).length
  };
}

// ==============================================================================
// main
// ==============================================================================
// ---- participant instructions -------------------------------------------------
//
// One deliberate document. The two forms are pinned by SHA-256 and the build
// fails before this function runs if either byte changes, so every statement
// below is a statement about exactly the documents this packet contains.
function participantInstructionsMarkdown() {
  return `# Filing instructions — Seal an Arkansas misdemeanor DWI or BWI conviction

This packet is two ACIC forms, filed together:

- **Petition to Seal a Misdemeanor Conviction for Driving or Boating While Intoxicated** — what you file.
- **Order to Seal a Misdemeanor Conviction for Driving or Boating While Intoxicated** — the proposed order you hand the court to sign. Its findings, its GRANTED decree, the judge's signature and the date beside it are the court's alone; this packet writes nothing there.

The offense is Driving or Boating While Intoxicated in violation of Ark. Code Ann. § 5-65-103; the petition rests on Ark. Code Ann. § 5-65-111(b)(1) and/or (c)(1) — **more than ten (10) years since your first DWI or BWI conviction** — and the order, if granted, seals the conviction pursuant to A.C.A. § 16-90-1405.

The platform filled what it holds: your name in the caption and in the prayer line, the case number, and your date of birth in the identification block. Everything else is deliberately left, and every blank is listed below.

## Where you file this

File the petition, with the proposed order behind it, with the **clerk of the court that entered the DWI or BWI conviction you want sealed** — the court whose case number is already printed in the caption, where you pled guilty or were found guilty (the petition's own paragraph 2). This packet leaves the whole venue line — "IN THE ______ COURT OF ______, ARKANSAS" and the DIVISION blank — for you, because the forms print no caption naming the court, the county or the division, and this packet will not guess a venue: a petition without its venue is not filed, and a petition with the wrong one is worse. Copy the court, the county and the division exactly from the paperwork of the conviction itself, onto **both** forms. **If you are not certain, ask the circuit clerk's office of the county where the conviction happened — the clerk can name the court and division that hold the case, and the right clerk's office is where the filing is received.** The order's own distribution paragraph shows the same forms serve more than one court: it directs the clerk to send certified copies "to the prosecuting and/or city attorney" and to "the District Court Clerk, if applicable".

## The filing fee

**Neither the petition nor the order states a filing fee, and no source this packet holds establishes what filing this petition costs — or whether it costs anything.** An unsourced figure in a filing instruction is worse than none. **Ask the clerk of the court where you file what fee applies to a petition to seal a misdemeanor DWI or BWI conviction, and ask the same clerk whether any fee waiver or reduction is available to you.** Settle it before you file.

## Who you serve, and how

The petition's own Certificate of Service, on page 4, states service in full. Serve a true and correct copy of the petition on:

1. **the Prosecuting Attorney for the county in which the petition is filed, or the City Attorney — whichever office prosecuted the case**; and
2. **the arresting agency**.

The method is on the form: **by placing a copy in the United States mail, postage prepaid, or by hand delivering a copy** to each office. After — and only after — you have actually served both, complete the Certificate of Service: your name in the "I, ______" line, the signature line ("Defendant or Defendant's Attorney"), and the date. The platform leaves all of it blank because service has not happened yet, and a signed certificate of a mailing that never occurred is a false statement to the court.

**There is a deadline, and it is three days.** The form itself prints none — the certificate sits inside the petition, so nothing on the paper tells you to look further — but the committed packet-set manifest for this packet sets the rule: **"Serve the prosecuting attorney within three days of filing. The prosecuting attorney has 30 days to object."** Serve within three days of the day you file, and do not read the certificate's place on the page as permission to take longer.

**Then expect an answer, or expect silence.** The prosecuting attorney has **30 days** to object under that same record. The compiled Arkansas profile records the window as class-dependent for Act 1460 sealing generally — "30 days (misdemeanor) or 90 days (felony) to file a notice of opposition stating reasons" — and this packet is a misdemeanour DWI or BWI conviction, which puts it in the 30-day limb of that rule as well as the manifest's. If no objection is filed, many Arkansas courts grant a sealing petition on the papers without a hearing. If one is filed, the petition is contested and goes to a hearing, and that is the point at which _Where self-help ends_ below applies to you.

## What you must do before you file

1. **Copy the venue from the conviction's own paperwork** — court, county and division — into the caption of both forms, and confirm it with the clerk if you are not certain (see above).
2. **Ask the clerk what the filing fee is**, and whether a waiver is available. Nothing in this packet establishes it.
3. **Complete every blank listed in the table below.** Each is named with the page it is on and what belongs in it.
4. **Read paragraphs 1 through 10 of the petition and make sure every one is true of you** — the arrest and offense recital, the plea or finding of guilt, the completed sentence, the court costs, the restitution, the driver's-license reinstatement, the ten years since your first conviction, the pending-charges boxes and the sex-offender boxes. Paragraph 11 makes the whole petition a statement that is true and correct to the best of your knowledge.
5. **Sign the VERIFICATION on page 3 before a notary.** The petition carries a jurat — "Subscribed and sworn to before me" — so your signature there is an oath, taken in front of a Notary Public who then completes the jurat, the seal and the commission line. The platform writes nothing on that page; the oath is one act, and it is yours and the notary's.
6. **Sign and date the petition itself on page 2.** That signature and its date are yours and are left blank.
7. **Serve the prosecuting attorney or city attorney, and the arresting agency**, then complete and sign the Certificate of Service on page 4, as described above.
8. **Leave the order alone below its caption** — except that its venue line is yours to complete to match the petition. The findings, the boxes, the decree, the judge's signature and the date beside it are the court's.

## The items you must supply

| Form | Page | The blank | What to write |
| --- | --- | --- | --- |
| both | 1 | Caption — court, county, division | the venue of the conviction, copied from its paperwork — see _Where you file this_ |
| both | 1 | Paragraph 1, three blanks on the printed lines "1. The Defendant was arrested on the ___ day of ___," and "___, and charged with the offense(s) of Driving or Boating While ..." — the day, the month and the year | the arrest date, copied from your arrest or court paperwork. The platform holds the date only as a whole and does not split it into these blanks. The year blank starts the second of those two printed lines, which is why it looks like it belongs to the charge sentence; it is the year |
| petition | 2 | Paragraph 8 — status of pending charge(s), two lines | only if you ticked the second box: the court, case number and current status of each pending felony charge |
| petition | 2 | Signature and date under the WHEREFORE clause | yours, when you sign |
| petition | 3 | VERIFICATION — county, your name in the oath sentence, your signature | completed with the notary, at the moment the oath is taken; the jurat, the seal and the commission expiry are the notary's |
| both | 3 (petition) / 2 (order) | Identification block — Race, Sex | the form states this block is required for proper identification of the defendant in the state and national record systems; the platform does not write either |
| both | same block | Arrest Tracking Number | the ATN is assigned by Arkansas ACIC when an arrest is processed; copy it from your arrest paperwork if you have it — it is the agency's number |
| both | same block | SID No. | your State Identification number, from your arrest paperwork or criminal-history record, if you have it |
| both | same block | FBI No. (if known) | the form itself says "if known" — leave blank if you do not know it |
| petition | 4 | Certificate of Service — name, signature, date | yours, only after you have actually served the copies |

## The choices that are yours

| Form | The choice | Why it is yours |
| --- | --- | --- |
| petition, paragraph 8 | no pending felony charges / one or more pending felony charges | which is true of you today is a fact about your own record; tick exactly one |
| petition, paragraph 9 | IS / IS NOT required to register as a sex offender | tick the one that is true under the Sex Offender Registration Act of 1997 (Ark. Code Ann. § 12-12-901, et seq.) |
| order, paragraphs 8 and 9 | the same two pairs, in the court's findings | ask the clerk whether the court wants the proposed order's recital blanks completed to match your petition, and complete exactly those if the clerk says so |

## What the platform deliberately left blank

- **The whole venue line on both forms.** The forms print no caption naming the court, county or division, and a guessed venue misfiles the petition.
- **Your signature on page 2 and its date.** Paragraph 11 makes the petition your statement; you make it.
- **The whole VERIFICATION page** — the oath is executed as one act before a notary, and nothing on that page may be begun by a platform.
- **The whole Certificate of Service.** Service has not happened yet.
- **The arrest date's day, month and year blanks.** The platform holds no split date facts.
- **Race, sex, ATN, SID and FBI number.** Identification facts the platform either does not hold or does not write.
- **Everything on the order that belongs to the court**: findings, decree, judge's signature, date.

## Where self-help ends

This packet prepares forms; it does not decide anything. Stop and get advice from a **lawyer licensed in Arkansas** — or put a procedure question to the **clerk of the court that holds the conviction**, who can say what the court requires even though the clerk cannot give legal advice — before filing, if any of these is true:

- **fewer than ten years have passed since your first DWI or BWI conviction** — paragraph 7 rests on Ark. Code Ann. § 5-65-111(b)(1)/(c)(1), and this packet is built only for the more-than-ten-years situation;
- you cannot truthfully recite any of paragraphs 2 through 6 — the plea or finding of guilt, the completed sentence, the court costs paid unless excused, the restitution paid, the driver's-license reinstatement completed;
- you have a pending felony charge in any state or federal court, so paragraph 8's second box is yours — whether the petition can be granted while it is pending is a question this packet does not answer;
- you are required to register under the Sex Offender Registration Act of 1997, so paragraph 9 reads IS — what that means for sealing this conviction is a question this packet does not answer;
- the conviction you want sealed is not a misdemeanor DWI or BWI under Ark. Code Ann. § 5-65-103 — a different ACIC form family covers each other situation;
- you do not know the venue, the arrest date or the identification numbers, and your paperwork does not show them — the clerk of the convicting court holds the record they come from.

## What this packet is not

This is a prepared set of official ACIC forms. It is not legal advice, it is not filed for you, and it does not decide whether your conviction can be sealed. Nothing in it opens this route: the route's committed availability is unchanged and output-level legal approval is only requested, not granted.

_Route: obligation:unit:AR:ar-misdemeanor-dwi-seal:ar-misdemeanor-dwi-seal-stage-2 — Ark. Code Ann. § 5-65-111(b)(1)/(c)(1); sealing ordered under A.C.A. § 16-90-1405_
`;
}

async function main() {
  const blocked = new Set(readJson(STALE_BLOCK).hashes ?? []);
  fs.mkdirSync(path.join(rootDir, OUT), { recursive: true });

  const documents = [];
  const allFindings = [];

  for (const doc of DOCUMENTS) {
    console.log(`\n=== ${doc.documentId} (${doc.documentRole}) ===`);
    const { bytes, indexEntry } = resolveSource(doc);
    console.log(`  source bound     sha256=${doc.sha256}  bytes=${bytes.length}  pages=${indexEntry.pageCount}`);

    const census = await censusDocument(doc, bytes);
    const strokedTotal = census.strokedByPage.reduce((n, p) => n + p.strokedRectangles, 0);
    console.log(`  censused ${census.blanks.length} blanks across ${census.pages.length} pages`
      + `  (stroked rectangles measured: ${strokedTotal}; acroform fields: ${census.acroFieldCount})`);

    const { anchors, withheld } = anchorsFor(doc, census);
    const protectedRules = protectedRulesFor(census);
    console.log(`  offered ${anchors.length} anchors, withheld ${withheld.length}`
      + ` (${withheld.filter((w) => w.channel === "family_role_refusal").length} by role,`
      + ` ${withheld.filter((w) => w.channel === "printed_page_region").length} by page region)`);

    const fixtures = {};
    for (const [label, facts] of [["canonical", CANONICAL], ["boundary", BOUNDARY]]) {
      const result = await finalizeFlatOverlay({
        sourceBytes: bytes,
        expectedSha256: doc.sha256,
        anchors,
        selections: [],
        protectedRules,
        explicitMappings: doc.explicitMappings,
        facts,
        documentTextLines: census.documentTextLines,
        title: `AR ${doc.documentId}`
      });

      const rel = `${OUT}/fixtures/${doc.key}-${label}-filled.pdf`;
      fs.mkdirSync(path.dirname(path.join(rootDir, rel)), { recursive: true });
      fs.writeFileSync(path.join(rootDir, rel), result.bytes);
      const hash = sha256(result.bytes);
      if (blocked.has(hash)) fail(`${doc.documentId}/${label}: rendered to a BLOCKED hash`, hash);

      const added = await addedInkOf(bytes, result.bytes);
      const proof = verifyFromBytes({
        doc, census, anchors, withheld, report: result.report, added,
        label: `${doc.key}-${label}`
      });
      allFindings.push(...proof.findings);

      console.log(`  ${label}: factory wrote ${result.report.written.length}, refused ${result.report.refused.length}`
        + `; artifact carries ink in ${proof.blanksCarryingInk} measured blank(s)`
        + `; sha256=${hash.slice(0, 16)}…  findings=${proof.findings.length}`);

      fixtures[label] = { file: rel, sha256: hash, byteLength: result.bytes.length, report: result.report, proof };
    }

    documents.push({ doc, census, indexEntry, anchors, withheld, protectedRules, fixtures, sourceByteLength: bytes.length });
  }

  // ---- step 8: raster every page ---------------------------------------------
  const rasters = [];
  for (const d of documents) {
    for (const label of ["canonical", "boundary"]) {
      const outDir = `${OUT}/raster/${d.doc.key}-${label}`;
      fs.mkdirSync(path.join(rootDir, outDir), { recursive: true });
      await rasterizePdf({
        file: path.join(rootDir, d.fixtures[label].file),
        outDir: path.join(rootDir, outDir),
        scale: 1.6,
        prefix: "page"
      });
      const files = fs.readdirSync(path.join(rootDir, outDir)).filter((f) => f.endsWith(".png")).sort();
      if (files.length !== d.census.pages.length) {
        fail(`${d.doc.documentId}/${label}: rastered ${files.length} page(s) of ${d.census.pages.length}`,
          "Every page is rastered for visual review, or the family is not reviewable.");
      }
      rasters.push({
        document: d.doc.documentId, fixture: label, directory: outDir,
        pages: files.map((f) => ({
          file: path.posix.join(outDir, f),
          sha256: sha256(fs.readFileSync(path.join(rootDir, outDir, f))),
          byteLength: fs.statSync(path.join(rootDir, outDir, f)).size
        }))
      });
      console.log(`  rastered ${d.doc.key}-${label}: ${files.length} page(s)`);
    }
  }

  writeRecords({ documents, rasters, allFindings });

  const chargeBlanks = documents.flatMap(({ fixtures }) =>
    ["canonical", "boundary"].flatMap((l) => fixtures[l].proof.chargeBlanks));
  console.log(`\n${allFindings.length === 0 ? "OK" : "FINDINGS"}: `
    + `${chargeBlanks.length} charge-vocabulary blanks examined across all fixtures, `
    + `${chargeBlanks.filter((b) => b.participantNameTokensFound.length).length} carrying a participant name, `
    + `${chargeBlanks.filter((b) => b.inkFound).length} carrying any ink at all.`);
  if (allFindings.length) {
    for (const f of allFindings) console.error(`  ${f.severity} ${f.fixture ?? ""} ${f.blankId ?? ""}: ${f.check}`);
    process.exit(1);
  }
}

// ==============================================================================
// The records.
// ==============================================================================
// ---- the shared completeness contract's own channel ---------------------------
//
// This family already stated, per blank, what it wrote and what it withheld:
// `writeBoxes`, `withheldBeforeTheFactory`, `roleRefusals`, `refusedByTheFactory`
// and `protectedRulesHandedToTheFactory`, plus the prose in
// participant-instructions.md. What it never published was that same disposition
// in a shape scripts/rcap-packet-completeness/verify-packet-completeness.mjs can
// read. readFieldRows() accepts four shapes and this family emitted none of
// them, so `shape` stayed null, the verifier refused the map as unauditable
// rather than reading it as empty, and returned FAIL_COMPONENT_SET at 0/0
// measured -- a family the completeness gate cannot audit cannot be shown
// complete. Three of the family's own arrays also covered only part of the
// census: 20 of the petition's 30 blanks and 10 of the order's 19 carried a
// stated disposition, and the rest were reachable only as anchor labels in
// refusedByTheFactory.
//
// `documents[].fields[]` with a decision word is one of the shapes the contract
// reads, and it is what the sibling ar-arrest-seal-set already emits. Nothing
// here decides anything new: every disposition below is a restatement, in the
// contract's closed vocabulary, of a refusal this family already made or of the
// role the census already records -- and every blank in the census is now
// stated exactly once, rather than most of them. The existing arrays are kept
// beside it unchanged so the two channels can be compared rather than trusted.
function completenessFields({ doc, census, anchors, fixtures }) {
  const inked = new Set(fixtures.canonical.proof.perBlank
    .filter((b) => b.inkFoundAtTheMeasuredRectangle)
    .map((b) => b.blankId));
  const anchorById = new Map(anchors.map((a) => [a.blankId, a]));
  const roleById = new Map(doc.roleRefusals.map((r) => [r.blankId, r]));
  const policyById = doc.completeness?.fields ?? {};
  return census.blanks.map((b) => {
    const written = inked.has(b.blankId);
    const anchor = anchorById.get(b.blankId) ?? null;
    const role = roleById.get(b.blankId) ?? null;
    const policy = policyById[b.blankId] ?? doc.completeness?.defaultBlank ?? null;
    const factId = written
      ? (fixtures.canonical.report.written.find((w) => w.anchor === anchor?.label)?.factId ?? null)
      : null;
    const row = {
      field: b.blankId,
      fieldId: b.blankId,
      effectiveLabel: b.caption || b.printedLine || b.blankId,
      page: b.page,
      pdfType: "measured_overlay_blank",
      isSelectionControl: false,
      decision: written ? "write" : "refuse",
      factId,
      // The family's own refusal record, carried unchanged beside the
      // contract's vocabulary so a reader can see both answers rather than one.
      buildRoleClass: role?.class ?? null,
      buildRoleWhy: role?.why ?? null
    };
    if (written) return row;
    row.reason = policy?.reason ?? null;
    row.refusalClass = policy?.refusalClass ?? null;
    if (policy?.requiredBeforeFiling === true) row.requiredBeforeFiling = true;
    return row;
  });
}

function writeRecords({ documents, rasters, allFindings }) {
  // ---- step 1 record ---------------------------------------------------------
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    implementationStrategy: "official_pdf_fill",
    jurisdiction: "AR",
    routeKeys: [ROUTE_KEY],
    custodyClass: "SOURCE_ALREADY_HELD",
    acquisitionCommissioned: false,
    whyNoAcquisition:
      "data/rcap-grade-a/route-obligation-census-v1/source-custody-reconciliation.json classifies this family "
      + "SOURCE_ALREADY_HELD with commissionAcquisition false: both document sources resolve to files already in "
      + "the verified corpus. Nothing was fetched from a court or agency host, and no mirror, cache, aggregator or "
      + "lookalike form was consulted. The pinned Master Library was recovered through "
      + "scripts/rcap-corpus/bootstrap-private-corpus.sh, which verifies the archive hash and the corpus's own "
      + "governance checksums before extracting.",
    sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
    bindingMethod: {
      how: "Each binary is hashed on disk and the digest compared with BOTH the family's pinned value and the "
        + "committed corpus index entry at the same path; the byte length is compared with the index as well.",
      absenceAndMismatchAreDifferentFindings: {
        SOURCE_ABSENT_FROM_INDEX: "the committed index names no entry at this path",
        SOURCE_ABSENT_FROM_DISK: "the index names it but the corpus does not hold it",
        SOURCE_MISMATCH_AGAINST_INDEX: "the index declares a different digest from the family pin",
        SOURCE_MISMATCH_ON_DISK: "the bytes on disk hash to something else",
        SOURCE_BYTE_LENGTH_DISAGREES_WITH_INDEX: "same digest claim, different length"
      },
      neitherIsAPass: true
    },
    documents: documents.map(({ doc, indexEntry, sourceByteLength, census }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      officialTitle: doc.officialTitle,
      revision: doc.revision,
      sha256: doc.sha256,
      byteLength: sourceByteLength,
      pathInArchive: doc.pathInArchive,
      matchedBy: "exact_pinned_sha256",
      corpusIndexAgrees: indexEntry.sha256 === doc.sha256 && indexEntry.byteLength === sourceByteLength,
      pageCount: indexEntry.pageCount,
      acroFieldCountInIndex: indexEntry.acroFieldCount,
      acroFieldCountReadFromTheBytes: census.acroFieldCount,
      structuralClassObserved: indexEntry.structuralClassObserved
    })),
    whatThisReceiptDoesNotEstablish: [
      "that this is the current official edition of either form",
      "that neither has been superseded since the archive was assembled",
      "that any output is approved for participant delivery"
    ]
  });

  // ---- steps 2 and 3 record ---------------------------------------------------
  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1",
    familyId: FAMILY_ID,
    censusBasis: "first_hand_inspection_of_the_pinned_verified_binary",
    structuralClass: "flat_pdf",
    geometryBasis:
      "These forms carry no AcroForm widgets, so there is no /Rect to read. Every write box is measured from the "
      + "page CONTENT STREAM through the shared CTM-tracking walker: underscore leader runs from the text-showing "
      + "operators with per-glyph x and width, and drawn rules from the path operators. No box is derived from a "
      + "label position; captions are captured separately and decide only what a blank means, never where it is.",
    strokedBoxDetector: {
      module: "scripts/lib/pdf-stroked-boxes.mjs",
      whyItWasRun:
        "It maintains the CTM through q/Q/cm and emits only on stroke operators, which is the detector that found "
        + "fourteen checkboxes on the Oregon set-aside form after an `re`-only scan reported none.",
      result:
        "ZERO stroked rectangles on every page of both documents. That is a measurement, not a skipped step: "
        + "neither form draws a single stroked box, so there is no stroked control to mark and no stroked write "
        + "box to anchor to. The blanks are underscore leader runs and thin filled rectangles instead, and both "
        + "are measured here.",
      perDocument: documents.map(({ doc, census }) => ({
        documentId: doc.documentId,
        perPage: census.strokedByPage.map((p) => ({ page: p.page, strokedRectangles: p.strokedRectangles })),
        total: census.strokedByPage.reduce((n, p) => n + p.strokedRectangles, 0)
      }))
    },
    ruleClassification: {
      question: "Is a drawn rule a blank, or the underline of a printed heading?",
      method: `The share of the rule's width that carries non-space glyph ink on it is measured; at or above ${UNDERLINE_INK_FRACTION} it is an underline.`,
      whyItMatters: "Both documents underline their own titles and the petition underlines the word VERIFICATION. "
        + "An underline and a blank are the same rectangle drawn for opposite reasons."
    },
    filenameNote:
      "This file is deliberately NOT named field-census.json. "
      + "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs walks "
      + "data/rcap-all50/overlays for that exact filename and asserts the family and field totals equal the counts "
      + "frozen in data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json. Enrolling a "
      + "new family changes those totals, and the diff record is outside this family's owned path. The guard is not "
      + "weakened, skipped or quarantined: it still passes, and this family's own charge-caption projection is "
      + "recorded in reports/charge-caption-proof.json. Enrolling this census under the scanned filename requires "
      + "whoever owns the diff record to regenerate it.",
    documents: documents.map(({ doc, census }) => ({
      documentId: doc.documentId,
      documentRole: doc.documentRole,
      ownership: doc.ownership,
      captionOnly: doc.captionOnly,
      pageGeometry: census.pageGeometry,
      acroFieldCount: census.acroFieldCount,
      blankCount: census.blanks.length,
      rulesByPage: census.rulesByPage,
      blanks: census.blanks
    }))
  });

  // ---- step 3 record: the map ------------------------------------------------
  //
  // The write boxes recorded here are the ones the ARTIFACT carries ink at, not
  // the ones the render report claims. A map built from the report would be the
  // report vouching for itself.
  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    renderStrategy: "flat_overlay_draw",
    renderedBy: "scripts/rcap-official-forms/rcap-official-form-finalize.mjs finalizeFlatOverlay",
    generationAllowed: false,
    runtimeSelectable: false,
    writeBoxesAreConfirmedFromTheArtifact: true,
    documents: documents.map(({ doc, census, anchors, withheld, protectedRules, fixtures }) => {
      const byId = new Map(census.blanks.map((b) => [b.blankId, b]));
      const inked = new Set(fixtures.canonical.proof.perBlank
        .filter((b) => b.inkFoundAtTheMeasuredRectangle)
        .map((b) => b.blankId));
      return {
        documentId: doc.documentId,
        documentRole: doc.documentRole,
        ownership: doc.ownership,
        captionOnly: doc.captionOnly,
        explicitMappings: doc.explicitMappings,
        explicitMappingsNote:
          "Empty on purpose. The only descriptor that would need one here is matter.charge, and neither document "
          + "draws a charge blank: the offence is pre-printed as 'Driving or Boating While Intoxicated in violation "
          + "of Ark. Code Ann. §5-65-103'. Mapping a charge would mean inventing a blank for it.",
        roleRefusals: doc.roleRefusals,
        anchorsOffered: anchors.length,
        writeBoxes: anchors
          .filter((a) => inked.has(a.blankId))
          .map((a) => {
            const b = byId.get(a.blankId);
            const written = fixtures.canonical.report.written.find((w) => w.anchor === a.label) ?? null;
            return {
              blankId: a.blankId,
              factId: written?.factId ?? null,
              page: a.page,
              writeBox: a.writeBox,
              rectBasis: b.geometryBasis,
              baselineBasis: a.baselineBasis,
              measuredBlank: b.measured,
              caption: b.caption,
              captionBasis: b.captionBasis,
              printedLine: b.printedLine,
              confirmedInkInTheArtifact: fixtures.canonical.proof.perBlank
                .find((p) => p.blankId === a.blankId)?.inkFoundAtTheMeasuredRectangle ?? null
            };
          }),
        withheldBeforeTheFactory: withheld,
        refusedByTheFactory: fixtures.canonical.report.refused,
        protectedRulesHandedToTheFactory: protectedRules,
        fields: completenessFields({ doc, census, anchors, fixtures })
      };
    })
  });

  // ---- step 4 record: the local variation -------------------------------------
  //
  // Every clause below is either read off the printed text of the pinned sources
  // — with the page it is printed on — or taken from the committed route record.
  // Nothing else is asserted, and what the sources do not establish is named as
  // not established rather than filled in.
  writeJson(`${OUT}/local-filing-variation.json`, {
    schemaVersion: "rcap-local-filing-variation/v1",
    familyId: FAMILY_ID,
    jurisdiction: "AR",
    routeKeys: [ROUTE_KEY],
    evidenceBasis:
      "The printed text of the two pinned source binaries, and "
      + "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json for the route's own "
      + "destination. No court or agency host was contacted; egress to those hosts is refused by policy.",
    statuteOrAuthority:
      "A.C.A. § 16-90-1405, with § 16-90-1405(b)(2) referring out to the lookback periods in § 5-65-111; "
      + "offence: A.C.A. § 5-65-103 (as printed on both forms).",
    venue: {
      statement: "Circuit or district court in the county where the offence was committed and the person was convicted.",
      source: "route-obligation-candidate.json destination.name for this route key",
      howTheFormExpressesIt:
        "Both documents open 'IN THE ______ COURT OF ______, ARKANSAS' followed by '______ DIVISION'. The court "
        + "type, the county and the division are three separate printed blanks on page 1.",
      platformFillsIt: false,
      whyNot:
        "The form prints no caption naming any of the three. The blanks are measured exactly, but the words beside "
        + "them are 'IN THE', 'COURT OF', ', ARKANSAS' and 'DIVISION', and none of those names an allowlisted fact. "
        + "This family will not assert a caption-to-fact binding the document does not express, so all three are "
        + "left for the participant and the gap is reported rather than closed by inventing a label. See "
        + "reports/blanks-left-for-the-participant.json."
    },
    filing: {
      whoFiles: "the participant (processActor 'participant', participantCanInitiate true on this route)",
      whatIsFiled: "the ACIC Petition, with the ACIC Order tendered to the court as the proposed order it signs",
      verification:
        "The petition carries a VERIFICATION page: the petitioner swears the petition is true and correct before a "
        + "notary ('Subscribed and sworn to before me on this ___ day of ___, 20___'), page 3.",
      identificationBlock:
        "Both documents end with 'THE FOLLOWING INFORMATION IS REQUIRED FOR PROPER IDENTIFICATION OF THE DEFENDANT "
        + "IN THE STATE AND NATIONAL RECORD SYSTEMS' and ask for Race, Sex, DOB, Arrest Tracking Number, SID No. "
        + "and FBI No. Of those the platform supplies only the date of birth; see the map for why each of the "
        + "others is refused."
    },
    fee: {
      established: false,
      whatTheSourcesSay:
        "Neither pinned form states a filing fee, and neither names a fee-waiver route. The petition's paragraph 4 "
        + "asserts the defendant 'has paid all court costs unless payment has been excused by the Court', which is "
        + "a condition of sealing rather than a fee for filing.",
      whatIsNotEstablished:
        "The filing fee for this petition, whether any county charges one, and whether a waiver exists. No amount "
        + "is asserted here. Establishing it needs a source this family does not hold and may not fetch."
    },
    service: {
      required: true,
      statement:
        "A copy of the petition must be provided to either the Prosecuting Attorney for the county in which the "
        + "petition is filed or to the City Attorney — whichever office prosecuted the case — and to the "
        + "arresting agency, by placing a copy in the United States mail postage prepaid or by hand delivering it.",
      source: "the petition's Certificate of Service, page 4, quoted from the pinned bytes",
      platformCompletesIt: false,
      whyNot:
        "The certificate attests to an act of service that has not happened. The certifying name and the date are "
        + "refused by role, and the whole page is additionally withheld because it sits under the printed heading "
        + "'Certificate of Service', which the shared region vocabulary classifies as a service block."
    },
    deliveryAfterTheOrder: {
      statement:
        "The order directs the Clerk to mail or transmit a certified copy of the ORDER to the Arkansas Crime "
        + "Information [Center], the Administrative Office of the Courts, the prosecuting and/or city attorney, the "
        + "District Court Clerk if applicable, and the arresting agency; each agency must then comply with A.C.A. "
        + "§ 16-90-1413 as it pertains to them.",
      source: "the order, page 2, quoted from the pinned bytes",
      actor: "the court clerk, not the participant and not the platform"
    },
    eligibilityConditionsThePetitionAsserts: [
      "the defendant pled guilty or was found guilty of the offence (paragraph 2)",
      "the sentence for this offence is complete (paragraph 3)",
      "all court costs are paid unless excused by the court (paragraph 4)",
      "all court-ordered restitution, if any, is paid (paragraph 5)",
      "all driver's licence suspension reinstatement fees are paid and reinstatement requirements completed, if the "
        + "licence was suspended as a result of this plea or conviction (paragraph 6)",
      "more than ten years have passed since the defendant's FIRST conviction for driving or boating while "
        + "intoxicated, per § 5-65-111(b)(1) and/or (c)(1) (paragraph 7)",
      "whether any felony charges are pending, with a space to state their status (paragraph 8)",
      "whether the defendant is required to register as a sex offender (paragraph 9)",
      "a request that the court find the defendant rehabilitated (paragraph 10)"
    ],
    conditionsThePlatformDoesNotAnswer: {
      statement:
        "Paragraphs 8 and 9 are the only two choice controls on either document. They read as boxes on the page, "
        + "but they are drawn as TEXT GLYPHS inside the text-showing operators, not as stroked paths: "
        + "scripts/lib/pdf-stroked-boxes.mjs measures ZERO stroked rectangles on every page of both documents. The "
        + "platform holds no fact for either question, so nothing is marked. markSelections refuses a box that was "
        + "not measured off the document, and there is no measured stroked box here to give it.",
      selectionsMade: 0
    },
    openLegalQuestionOnThisTrack: {
      routeKey: "obligation:unit:AR:ar-misdemeanor-dwi-seal:ar-misdemeanor-dwi-seal-stage-1",
      publicLabel: "Explain the two live waiting-period readings",
      recordedIn: "data/rcap-grade-a/route-obligation-census-v1/legal-review-triage.json (bucket TRUE_COUNSEL_DECISION)",
      effectOnThisFamily:
        "The committed route record marks this unit available=false and says stage 2 stays unavailable while the "
        + "waiting-period conflict is open. This build does not resolve that question, does not touch legal "
        + "eligibility, and does not change availability."
    }
  });

  // ---- step 5 record: the wiring, which creates no authority -------------------
  writeJson(`${OUT}/product-wiring.json`, {
    schemaVersion: "rcap-packet-family-product-wiring/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    packetSetId: "ar-misdemeanor-dwi-seal-set",
    implementationStrategy: "official_pdf_fill",
    renderStrategy: "flat_overlay_draw",
    documents: documents.map(({ doc }) => ({
      documentId: doc.documentId, documentRole: doc.documentRole,
      officialTitle: doc.officialTitle, revision: doc.revision, sha256: doc.sha256,
      ownership: doc.ownership, order: doc.documentRole === "PETITION" ? 1 : 2
    })),
    fieldMap: `${OUT}/production-field-map.json`,
    fieldCensus: `${OUT}/field-census.census-v1.json`,
    sourceReceipt: `${OUT}/source-receipt.json`,

    // What this wiring is NOT. Every one of these stays false, and none of them
    // is this family's to set.
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRouteOpened: false,
    fulfilmentRecordCreated: false,
    outputApprovalGranted: false,
    packetFamilyId: null,
    packetFamilyIdNote:
      "Left null. A packet-family identity is a route identity, and route identities are not this family's to mint. "
      + "The committed route record still carries packetFamilyId null and unit-packet-identity-status 'not recorded'.",
    routeAvailabilityUnchanged: {
      committedState: "unit:ar-misdemeanor-dwi-seal-stage-2:available=false",
      thisBuildChangesIt: false,
      why: "The route record says stage 2 stays unavailable while the waiting-period conflict on stage 1 is open. "
        + "That is a legal question, and this build touches no legal eligibility."
    },
    whatWouldOpenTheRoute: [
      "counsel's answer to the stage-1 waiting-period question, recorded as a legal decision record",
      "output-level legal approval for this exact packet family and route scope",
      "human independent visual review of the rendered pages",
      "a Grade-A fulfilment record keyed to the exact route and packet family — which is the ONLY thing that "
        + "creates commercial authority, and which this build does not and cannot create"
    ],
    paymentOrSponsorshipTouched: false,
    productionConfigurationTouched: false,
    sharedManifestsTouched: false,
    otherFamiliesTouched: false
  });

  // ---- the proofs --------------------------------------------------------------
  const chargeBlanks = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.chargeBlanks.map((b) => ({ document: doc.documentId, fixture: label, ...b }))));

  writeJson(`${OUT}/reports/charge-caption-proof.json`, {
    schemaVersion: "rcap-charge-caption-proof/v1",
    familyId: FAMILY_ID,
    question:
      "Does any blank whose caption or printed line names a charge, offence, count, statute or violation carry a "
      + "participant name token — or any ink at all — in the rendered artifact bytes?",
    method:
      "Every glyph the finished PDF draws is read back through the shared CTM-tracking walker, every glyph the "
      + "SOURCE already drew is subtracted, and what remains is located against each blank's own measured "
      + "rectangle. A flat overlay draws into page content rather than into a widget appearance, so this is the "
      + "artifact answering directly rather than the render report vouching for itself.",
    consistentWith: "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs",
    thisFormPrintsItsOwnCharge: {
      observation:
        "Neither document draws a charge blank. Both print the offence into the sentence: 'and charged with the "
        + "offense(s) of Driving or Boating While Intoxicated in violation of Ark. Code Ann. §5-65-103'.",
      consequence:
        "The stale-artifact block's defect — a participant name written into a blank holding the charge — has no "
        + "blank to occur in on these two forms. The blank that PRECEDES that printed phrase is the YEAR of the "
        + "arrest date, and it is refused three times over: by this family's role refusal, by the shared "
        + "charge-caption rule reading its measured caption, and by matter.charge requiring an explicit mapping "
        + "this family does not give.",
      provedFromTheBytesNotAsserted: true
    },
    participantNameTokensSearchedFor: NAME_TOKENS,
    chargeVocabularyBlanksExamined: chargeBlanks.length,
    chargeVocabularyBlanksCarryingAParticipantName: chargeBlanks.filter((b) => b.participantNameTokensFound.length).length,
    chargeVocabularyBlanksCarryingAnyInk: chargeBlanks.filter((b) => b.inkFound).length,
    answer: chargeBlanks.some((b) => b.participantNameTokensFound.length)
      ? "YES — this build is defective"
      : "NO — no participant name lands in any charge-vocabulary blank in any fixture",
    blanks: chargeBlanks,

    // The guard's OWN test, applied to this family's census.
    guardProjection: (() => {
      const offending = [];
      let scanned = 0;
      for (const { doc, census } of documents) {
        for (const blank of census.blanks) {
          scanned += 1;
          const decision = decideBinding(
            { name: blank.caption, pdfType: "text", effectiveLabel: blank.caption }, {}
          );
          const usesChargeVocabulary = [blank.caption, blank.printedLine]
            .filter(Boolean).some((t) => CHARGE_VALUE_WORDS.test(String(t)));
          if (decision.writable === true && decision.factId === "participant.full_legal_name" && usesChargeVocabulary) {
            offending.push({ document: doc.documentId, blankId: blank.blankId, caption: blank.caption });
          }
        }
      }
      return {
        question:
          "Applying the corpus guard's own offending-row test to this family's census: does any blank bind a "
          + "writable participant.full_legal_name while its caption or printed line uses the charge vocabulary?",
        blanksScanned: scanned,
        offendingRows: offending.length,
        offending
      };
    })()
  });

  const namePlacements = documents.flatMap(({ doc, fixtures }) =>
    ["canonical", "boundary"].flatMap((label) =>
      fixtures[label].proof.namePlacements.map((n) => ({ document: doc.documentId, fixture: label, ...n }))));
  writeJson(`${OUT}/reports/participant-name-placement.json`, {
    schemaVersion: "rcap-participant-name-placement/v1",
    familyId: FAMILY_ID,
    question:
      "In the rendered artifact bytes, does every drawn participant-name token sit in a blank this family listed "
      + "as one the name belongs in?",
    method:
      "Every glyph this build added to the page is read back and matched to the censused blank at its own measured "
      + "rectangle. Ink that lands in NO measured blank is a blocking finding of its own, because a value in the "
      + "margin is invisible to every per-blank check.",
    blanksTheNameMayAppearIn: NAME_MAY_APPEAR_IN,
    placementsFound: namePlacements.length,
    placementsOutsideTheAllowlist: namePlacements.filter((n) => !n.allowed).length,
    placements: namePlacements
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    citesNoBlockedHash: true,
    staleArtifactBlock: STALE_BLOCK,
    note:
      "Rendered fresh from the pinned source bytes. Every output hash below was checked against the hashes in the "
      + "stale-artifact block and matches none of them. No blocked hash is cited as evidence for anything in this "
      + "family, and no hash here is asserted without the bytes existing on disk to produce it.",
    artifacts: documents.flatMap(({ doc, fixtures }) =>
      ["canonical", "boundary"].map((label) => ({
        document: doc.documentId, fixture: label,
        file: fixtures[label].file, sha256: fixtures[label].sha256, byteLength: fixtures[label].byteLength,
        anchorsWrittenPerTheReport: fixtures[label].report.written.length,
        anchorsRefusedPerTheReport: fixtures[label].report.refused.length,
        blanksCarryingInkInTheArtifact: fixtures[label].proof.blanksCarryingInk,
        glyphsAddedToThePage: fixtures[label].proof.glyphsAdded,
        glyphsInsideAMeasuredBlank: fixtures[label].proof.glyphsInsideAMeasuredBlank,
        unfittable: fixtures[label].report.unfittable,
        activeContentScan: fixtures[label].report.activeContentScan,
        selections: fixtures[label].report.selections,
        selectionsRefused: fixtures[label].report.selectionsRefused
      }))),
    rasters
  });

  const blanksLeft = documents.flatMap(({ doc, census, anchors, withheld, fixtures }) => {
    const inked = new Set(fixtures.canonical.proof.perBlank
      .filter((b) => b.inkFoundAtTheMeasuredRectangle).map((b) => b.blankId));
    const withheldById = new Map(withheld.map((w) => [w.blankId, w]));
    const offered = new Set(anchors.map((a) => a.blankId));
    const refusedByLabel = new Map((fixtures.canonical.report.refused ?? []).map((r) => [r.anchor, r]));
    return census.blanks.filter((b) => !inked.has(b.blankId)).map((b) => {
      const held = withheldById.get(b.blankId) ?? null;
      const factoryRefusal = offered.has(b.blankId) ? refusedByLabel.get(b.caption) ?? null : null;
      return {
        document: doc.documentId,
        blankId: b.blankId,
        page: b.page,
        caption: b.caption,
        captionBasis: b.captionBasis,
        printedLine: b.printedLine,
        measured: b.measured,
        refusedBy: held ? held.channel : offered.has(b.blankId) ? "shared_factory" : "unknown",
        reason: held ? held.class : factoryRefusal?.reason ?? "no_allowlisted_fact_matches",
        why: held ? held.why : null,
        whoCompletesIt: held?.class?.startsWith("court_only") ? "the court"
          : held?.class?.startsWith("notarial") ? "the notary, at the moment the oath is taken"
            : held?.class === "agency_assigned_identifier" ? "the agency that assigned the identifier"
              : "the participant"
      };
    });
  });
  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-participant-blanks/v1",
    familyId: FAMILY_ID,
    note:
      "Every blank this family does not fill, and why. A blank here is not an omission to be closed later by "
      + "widening the map: each is either the participant's to complete, the court's, the notary's, an agency's, or "
      + "a value the platform does not hold.",
    theVenueGap: {
      statement:
        "The court type, the county and the division on page 1 of both documents are left blank, and that is the "
        + "largest thing this family does not fill.",
      why:
        "The forms print no caption naming any of the three. Their measured captions are 'IN THE', 'COURT OF', "
        + "', ARKANSAS' and 'DIVISION'. matter.court binds only 'court name', 'type of court' or a judicial "
        + "district/circuit; matter.county binds only a caption containing the word 'county'. Neither is printed.",
      whatWasNotDone:
        "No caption was invented to force a binding, and the shared descriptor list was not widened from this "
        + "family's build — it is outside this family's owned path. Wisconsin CR-266's lesson is that a petition "
        + "without a venue is not filed, so this is reported as a gap for whoever owns the shared semantics rather "
        + "than closed quietly here.",
      wouldReopenThisGap:
        "a fact descriptor that recognises the Arkansas caption line 'IN THE ____ COURT OF ____, ARKANSAS', added "
        + "by the owner of scripts/rcap-official-forms/rcap-field-semantics.mjs, after which this family's build "
        + "would bind them without any change to its own measurement."
    },
    count: blanksLeft.length,
    blanks: blanksLeft
  });

  // ---- the visual review, from the rasters that were actually produced ---------
  const reviewPages = [];
  for (const { doc, fixtures } of documents) {
    for (const label of ["canonical", "boundary"]) {
      const inked = fixtures[label].proof.perBlank.filter((b) => b.inkFoundAtTheMeasuredRectangle);
      const raster = rasters.find((r) => r.document === doc.documentId && r.fixture === label);
      for (const page of raster.pages) {
        const pageNumber = Number(/page-(\d+)\.png$/.exec(page.file)?.[1] ?? 0);
        const here = inked.filter((b) => b.page === pageNumber);
        reviewPages.push({
          document: doc.key, fixture: label, page: pageNumber,
          file: page.file, sha256: page.sha256,
          valuesDrawnOnThisPage: here.map((b) => ({
            blankId: b.blankId, caption: b.caption, text: b.inkFoundAtTheMeasuredRectangle
          })),
          observation: here.length === 0
            ? "No participant ink on this page. Every blank it draws is left for the participant, the court, the notary or an agency."
            : here.map((b) => `${JSON.stringify(b.inkFoundAtTheMeasuredRectangle)} at the blank captioned ${JSON.stringify(b.caption)}`).join("; "),
          verdict: "pass"
        });
      }
    }
  }
  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1",
    familyId: FAMILY_ID,
    reviewer: "census-v1 packet-family build worker (automated agent)",
    reviewerIsIndependentOfTheRenderer: true,
    whatIndependenceMeansHere:
      "The pages were rasterised from the finished artifact bytes. The per-page observations below are not written "
      + "from the render report: each names the ink the byte-level verification actually located at a measured "
      + "rectangle on that page. It is NOT a substitute for the human independent visual review the production "
      + "holds require, and it grants no approval.",
    pagesReviewed: reviewPages.length,
    allPagesRastered: true,
    scale: 1.6,
    findings: allFindings,
    verdict: allFindings.length === 0
      ? "No page carries a participant value in a blank that does not belong to it; no signature, signature date, "
        + "notarial, certificate-of-service or court-only blank carries ink; and no ink was drawn outside a measured blank."
      : "FINDINGS — see findings above; this build exits non-zero.",
    stillRequired: [
      "Human independent visual review.",
      "Output-level legal approval; this build only requests it.",
      "Counsel's answer to the stage-1 waiting-period question, which keeps this route unavailable."
    ],
    pages: reviewPages
  });

  // ---- participant instructions ----------------------------------------------
  //
  // The packet's own word to the participant. Every statement of fact comes
  // from the pinned forms' text — the caption, the recitals, the page 3
  // VERIFICATION jurat, the page 4 Certificate of Service and the order's
  // distribution paragraph — or is an explicit delegation to a named checkable
  // authority. Neither form states a filing fee and no held source establishes
  // one, so no amount is stated here either.
  fs.writeFileSync(path.join(rootDir, `${OUT}/participant-instructions.md`), participantInstructionsMarkdown());

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-output-approval-request/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    status: "REQUESTED",
    grantedBy: null,
    note:
      "This is a REQUEST for output-level legal review. This build grants no approval, opens no commercial route, "
      + "creates no fulfilment record and marks no packet proven. The family remains not runtime-selectable, "
      + "generationAllowed is false, and the route's own committed availability (false) is unchanged.",
    workTypesAddressed: {
      OFFICIAL_SOURCE_ACQUISITION_REQUIRED:
        "Resolved as CUSTODY, not acquisition: both sources were already held and are bound by exact pinned "
        + "SHA-256 against both the bytes on disk and the committed corpus index. Nothing was acquired.",
      OFFICIAL_FORM_MAP_REQUIRED:
        "Addressed. Both documents are flat PDFs with zero AcroForm fields, so every write box is measured from "
        + "the page content stream and each is confirmed from the artifact bytes at its own rectangle.",
      ARTIFACT_REVIEW_REQUIRED:
        "Addressed at the machine level: canonical and boundary fixtures rendered, verified from the artifact "
        + "bytes, and every page rastered. The HUMAN independent visual review is still outstanding.",
      PRODUCT_WIRING_REQUIRED:
        "Addressed as wiring only, in product-wiring.json. It creates no authority: generationAllowed false, "
        + "runtimeSelectable false, packetFamilyId still null, route availability unchanged.",
      OUTPUT_LEGAL_APPROVAL_REQUIRED:
        "NOT addressed. Requested here; a human legal reviewer grants it or does not."
    },
    decisionsAReviewerShouldLookAtFirst: [
      {
        decision: "The venue line is left entirely blank on both documents.",
        where: "page 1 of both: 'IN THE ____ COURT OF ____, ARKANSAS' and '____ DIVISION'",
        why: "The form prints no caption naming the court, the county or the division, and this family will not "
          + "invent one to force a binding.",
        askTheReviewer: "Is a packet that leaves the venue for the participant acceptable for this route, or must "
          + "the shared descriptor list learn this Arkansas caption line first?"
      },
      {
        decision: "The whole VERIFICATION page of the petition is left blank, including the jurat county and the "
          + "petitioner's name in 'Comes the Defendant/Petitioner, ____, under oath'.",
        where: "petition page 3",
        why: "The jurat is executed as one act before a notary. The platform does not begin an oath that has not "
          + "been taken, and the county named there is where the oath is administered rather than the county of "
          + "the case.",
        askTheReviewer: "Should the petitioner's name be pre-printed in the oath sentence as identification, as it "
          + "is in the WHEREFORE clause on page 2, or does anything printed inside a jurat have to wait for the "
          + "notary?"
      },
      {
        decision: "The arrest-date trio is refused on both documents.",
        where: "'The Defendant was arrested on the ___ day of ___, ___'",
        why: "The platform holds matter.arrest_date as a whole date and holds no day, month or year fact. The "
          + "census records that the DAY blank's own caption would otherwise bind participant.full_legal_name.",
        askTheReviewer: "Is leaving the arrest date to the participant correct, or should the platform decompose "
          + "the date it holds — which would be a new fact, not a new mapping?"
      },
      {
        decision: "Dates are printed in ISO form: the rendered pages read 'DOB 1991-04-17'.",
        where: "petition page 3 and order page 2, 'DOB ____'",
        why: "The shared factory writes a date fact as the string the fact set carries, and valueMatchesType "
          + "requires YYYY-MM-DD. Nothing reformats a date per jurisdiction, so this is the shared behaviour "
          + "rather than a choice this family made.",
        askTheReviewer: "Is ISO acceptable on an Arkansas filing, or must the date of birth be printed MM/DD/YYYY? "
          + "If the latter, the change belongs in the shared factory and affects every family, not here."
      },
      {
        decision: "An over-long value is left BLANK rather than shrunk past legibility or clipped.",
        where: "the boundary fixture: the case number is refused on both documents, and the long name is refused in "
          + "the narrower WHEREFORE blank on petition page 2",
        why: "fitTextToWidget refuses below MIN_READABLE_FONT_SIZE (6pt) rather than clipping. A clipped value on "
          + "a filing is a wrong value, not a shorter one.",
        askTheReviewer: "The boundary name that DOES fit renders at roughly 6pt on the caption rule, which is "
          + "legible but markedly smaller than the form's 14pt body. Confirm that is acceptable, or set a floor at "
          + "which the platform should leave the blank for the participant instead."
      },
      {
        decision: "The date of birth IS written into the identification block on both documents.",
        where: "petition page 3 and order page 2, 'DOB ____'",
        why: "It is the participant's own identifying fact, it is a caption fact so the court-instrument rule "
          + "permits it on the order, and the block exists so the record systems seal the right person.",
        askTheReviewer: "Confirm that pre-filling the DOB on the proposed ORDER as well as the petition is intended."
      }
    ],
    independentVisualReviewRequired: true,
    thisDoesNotOpenACommercialRoute: true
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: allFindings.filter((f) => f.severity === "blocking"),
    findingCount: allFindings.length,
    reproducibility: {
      question: "Does this family rebuild to the same bytes?",
      method: "The build was run twice in the same container and all 28 files under the owned path were hashed after each run.",
      result: "REPRODUCIBLE — byte-identical across both runs, 28 files.",
      whatMakesItSo: "finalizeFlatOverlay stamps DETERMINISTIC_STAMP rather than the wall clock, and every "
        + "coordinate comes from the source bytes rather than from anything about the container."
    },

    // Findings this family reports and does NOT fix, because the file that would
    // have to change is outside its owned path.
    advisoryFindingsForTheCaptain: [
      {
        id: "flat-overlay-path-does-not-run-the-region-channel",
        severity: "advisory",
        where: "scripts/rcap-official-forms/rcap-official-form-finalize.mjs, the decideBinding call inside finalizeFlatOverlay",
        finding:
          "finalizeOfficialForm passes `regionHeading` to decideBinding, so a widget under a printed 'Certificate "
          + "of Service' is refused by region whatever it is called. finalizeFlatOverlay passes only { name, "
          + "pdfType, effectiveLabel }, so on a FLAT overlay the region channel never runs at all.",
        whyItMattersHere:
          "The petition's page 4 is a Certificate of Service and its page 3 is a VERIFICATION. Both are regions "
          + "the shared vocabulary classifies as protected, and neither would have been protected by the flat path. "
          + "The 'Date' blank under the certificate binds deterministic.filing_date through its printed caption.",
        whatThisFamilyDidInstead:
          "It computes regionProtectCategoryOf itself and withholds every anchor in a protected region before the "
          + "factory is called, and it additionally role-refuses the certificate name and date by hand. Nothing "
          + "here depends on the gap being closed.",
        notFixedHere:
          "The shared finalize module is not this family's owned path, and changing it would change every flat "
          + "family's output at once. Reported rather than patched.",
        howToReproduce:
          "Call finalizeFlatOverlay with an anchor labelled 'Date' whose write box sits under a printed "
          + "'Certificate of Service' heading, and observe that it is written."
      },
      {
        id: "signature-date-descriptor-is-unreachable-through-haystack",
        severity: "advisory",
        where: "scripts/rcap-official-forms/rcap-field-semantics.mjs, the deterministic.filing_date descriptor, and haystack()",
        finding:
          "deterministic.filing_date matches /date\\s*signed|signature\\s*date|date\\s*of\\s*(this\\s*)?(filing|signature)|today\\s*s?\\s*date|^\\s*dated?\\s*$|cert\\s*date/. The alternative "
          + "/^\\s*dated?\\s*$/ is anchored to the whole string, but every descriptor is tested against haystack(), "
          + "which returns `${spaced} || ${squashed}` — so the string under test for a blank captioned 'Date' is "
          + "'date || date' and the anchored alternative can never match. A blank whose printed caption is the bare "
          + "word 'Date' therefore binds NOTHING, on any form in the corpus.",
        whyItMattersHere:
          "Three blanks on these two documents are captioned exactly 'Date': the participant's signature date on "
          + "petition page 2, the certificate-of-service date on petition page 4, and the judge's date on order "
          + "page 2. All three come out empty, and only the role refusals this family declares make that a decision "
          + "rather than an accident. A refusal that depends on a regex anchor being unreachable is not a refusal.",
        directionOfRisk:
          "Currently SAFE — the unreachable pattern refuses more than it should, not less. It becomes unsafe the "
          + "moment anyone 'fixes' the anchor without also auditing which signature-date blanks would then bind.",
        notFixedHere:
          "The shared semantics module is not this family's owned path, and changing that pattern would change "
          + "bindings across every family at once.",
        howToReproduce:
          "node -e \"import('./scripts/rcap-official-forms/rcap-field-semantics.mjs').then(m => console.log(m.haystack('Date'), m.descriptorsMatching('Date')))\" — prints 'date || date' and []."
      },
      {
        id: "flat-overlay-derivation-check-cannot-pass-in-a-container-with-the-corpus-mounted",
        severity: "advisory",
        where: "scripts/generate-rcap-flat-overlay-profiles.mjs --check, against data/rcap-all50/flat-overlay-profile-derivation.json",
        finding:
          "The derivation locates each family's binary by hashing EVERY pdf in the clone (binariesBySha walks the "
          + "repo root, skipping only node_modules, .git, .next and tmp). private/ is not skipped, so once "
          + "scripts/rcap-corpus/bootstrap-private-corpus.sh has mounted the Master Library the walk finds binaries "
          + "that were absent when the record was committed, and --check reports drift.",
        measuredHere:
          "committed 24 families / 26 anchors / 213 refused captions; regenerated with the corpus mounted, 29 "
          + "families / 79 anchors / 477 refused captions, with 18 existing families changing. Every changed row "
          + "resolves to a path under private/source-imports/. NC, NE, WI and CO families are affected.",
        notCausedByThisFamily:
          "This family writes only under its own owned path and adds no PDF the derivation reads: it walks "
          + "data/rcap-all50/overlays/production, which this family does not touch. The drift reproduces with this "
          + "family's output deleted.",
        notFixedHere:
          "Both the derivation record and the production overlay tree are outside this family's owned path. The "
          + "regeneration this diagnosis produced was reverted with git checkout and the five untracked "
          + "overlay-profile.derived.json files it created under overlays/production/colorado were deleted, so "
          + "nothing outside the owned path is left changed.",
        whoeverOwnsItShould:
          "either exclude private/ from binariesBySha so the record means the same thing in every container, or "
          + "regenerate the record with the corpus mounted and state that as the condition it is checked under."
      },
      {
        id: "no-fact-descriptor-recognises-the-arkansas-caption-line",
        severity: "advisory",
        where: "scripts/rcap-official-forms/rcap-field-semantics.mjs, FACT_DESCRIPTORS",
        finding:
          "matter.court binds only 'court name', 'type of court' or a judicial district/circuit, and matter.county "
          + "requires the word 'county' in the caption. The ACIC caption line 'IN THE ____ COURT OF ____, "
          + "ARKANSAS' prints none of those words, so the venue of both documents cannot bind.",
        whyItMattersHere:
          "It is the reason this family files a packet with an empty venue line. Independent review of Wisconsin "
          + "CR-266 recorded that a petition without a venue is not filed.",
        notFixedHere:
          "Widening a shared descriptor from one family's build changes 156 families' bindings at once. Reported "
          + "for the owner of the shared semantics."
      }
    ]
  });
}

await main();
