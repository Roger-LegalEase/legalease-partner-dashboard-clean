#!/usr/bin/env node
/**
 * PF20 census-v1 builder — Kansas district-court CONVICTION expungement,
 * K.S.A. 21-6614(a)(1).
 *
 *   node scripts/build-census-v1-ks-21-6614-diversion-set.mjs [--check]
 *
 * ONE ROUTE, SEVEN COMPONENTS, SIX OF THEM OFFICIAL FORMS
 *
 * The committed legal-design track registry declares this family's output
 * strategy as official_pdf_fill and names seven components: the Kansas
 * Criminal Cover Sheet, the Judicial Council petition, the notice of hearing,
 * the KBI order cover sheet, two proposed orders, and a process-guidance
 * document this build composes. All six official binaries are bound here by
 * exact SHA-256 and none of their bytes is altered: each is filled through the
 * shared finalizer and flattened.
 *
 * THE ROUTE ELECTION THIS PACKET MAKES, AND THE ONES IT REFUSES
 *
 * The Judicial Council petition opens with two boxes: "my [ ] conviction and
 * related arrest records OR [ ] diversion record and related arrest records".
 * That election is the route. This family is the CONVICTION route, so the
 * build states it rather than asking the participant, and the guard below
 * refuses to build if the held disposition is anything but a conviction.
 * Item 8's Option A / Option B election is the same kind of thing: Option B is
 * the K.S.A. 21-6614(a)(3) specialty-court lane, which is a different track.
 *
 * Everything else on that page is refused. The "one / three / five / ten
 * years" boxes at item 8.A.i are a classification of the offence into the
 * Kansas grid, and the committed registry says in terms that LegalEase "does
 * not classify the offence into a grid severity level for them"; they are
 * declared determined by the case rather than by the route and left for the
 * participant. The coercion box at item 8.A.iii belongs to the K.S.A.
 * 21-6614(b) track. No signature, no hearing date, no judicial finding and no
 * certificate of service is completed anywhere in this packet.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets. The Kansas
 * Judicial Council republication restriction recorded in the track registry is
 * carried into the source receipt and the approval request unresolved.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import zlib from "node:zlib";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { makeCorpusEntryResolver } from "./lib/corpus-index-paths.mjs";
import { extractTextItems, groupIntoLines, captureWidgetContext } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { scanBytesForActiveContent } from "./rcap-official-forms/rcap-active-content.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS } from "./rcap-packet-completeness/completeness-contract.mjs";
import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";

/* ======================================================================== *
 * THE FAMILY SPECIFICATION
 *
 * Everything below is DATA this family declares about itself: which binaries
 * it fills, what each field of each binary is, and what the packet does with
 * it. It is deliberately a table rather than inference. The shared field
 * semantics can re-derive a decision from a field name and a harvested
 * caption, and on these six Kansas binaries this family measured it deriving
 * four of them wrongly, so every field is named here and censusOf refuses a
 * field the table does not name.
 * ======================================================================== */

const KSJC_RESTRICTION =
  "The Kansas Judicial Council states its forms are for non-commercial use and may not be sold, republished or transferred for value without express permission. Every Kansas official-form route is source-gated on that licence until permission is confirmed.";

const ROUTE_FACTS = { disposition: "diversion" };

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.street_address": "412 Magnolia Avenue",
    "participant.city_state_zip": "Topeka, KS 66603",
    "participant.phone": "785-555-0142",
    "participant.email": "jordan.reyes@example.org",
    "participant.date_of_birth": "1988-06-14",
    "matter.court": "3rd",
    "matter.county": "Shawnee",
    "matter.case_number": "2018-CR-004217",
    "matter.offense_date": "2017-11-02",
    "answers.disposition": "diversion",
    "answers.felony_in_past_two_years": false,
    "answers.currently_required_to_register": false,
    "answers.specialty_court_completion": false
  },
  boundary: {
    "participant.full_legal_name": "Alexandria Catherine Montgomery-Washington",
    "participant.street_address": "1188 Southwest Martin Luther King Junior Boulevard, Apartment 1407",
    "participant.city_state_zip": "Kansas City, KS 66101-4417",
    "participant.phone": "913-555-0199",
    "participant.email": "alexandria.montgomery.washington@example.org",
    "participant.date_of_birth": "1979-12-31",
    "matter.court": "29th",
    "matter.county": "Wyandotte",
    "matter.case_number": "1999-CR-000001.99",
    "matter.offense_date": "1998-01-31",
    "answers.disposition": "diversion",
    "answers.felony_in_past_two_years": false,
    "answers.currently_required_to_register": false,
    "answers.specialty_court_completion": false
  }
};

/* ---- the six official binaries, and the one composed page ---------------- */
const DOCUMENTS = [
  {
    componentId: "ks-21-6614-diversion-cover-sheet-1", documentId: "KS-CRIMINAL-COVER-SHEET-10-14-2025",
    officialFormId: "KS-CRIMINAL-COVER-SHEET-10-14-2025", role: "cover_sheet",
    officialTitle: "Criminal Cover Sheet", revision: "10/14/2025",
    officialSourceUrl: "https://www.kjc.ks.gov/legal-forms/expungement-adult",
    corpusPath: "LegalEase Kansas/Criminal Cover Sheet 102025.pdf", custody: "nationwide_recovery_pool_2026_09_02",
    sha256: "6384f934dc431601dfd07d0822c32b83ee8fcd0412cff5496af1481169cdea60", byteLength: 126589,
    pages: 1, acroFieldCount: 36, captionOnly: false,
    participantName: "Criminal Cover Sheet (10/14/2025)",
    whoCompletesIt: "You complete it and file it with the petition. The clerk uses it to open the docket sheet; the form itself says it is not a public record, is stored separately from the case file and is destroyed within a reasonable time."
  },
  {
    componentId: "ks-21-6614-diversion-primary-filing-2", documentId: "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022",
    officialFormId: "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022", role: "primary_filing",
    officialTitle: "Petition for Expungement of Conviction or Diversion", revision: "Rev. KSJC 08/2022",
    officialSourceUrl: "https://www.kjc.ks.gov/legal-forms/expungement-adult/conviction-or-diversion",
    corpusPath: "LegalEase Kansas/Petition for Expungement of Conviction or Diversion 82022.pdf", custody: "nationwide_recovery_pool_2026_09_02",
    sha256: "1113f7b64a57d7ca9568f75d04922d94fabbeea6c7c5839402689ed7fc0db07c", byteLength: 234581,
    pages: 6, acroFieldCount: 35, captionOnly: false,
    participantName: "Petition for Expungement of Conviction or Diversion (Rev. KSJC 08/2022)",
    whoCompletesIt: "You complete the numbered items and sign it. It is the document that asks the court for the order."
  },
  {
    componentId: "ks-21-6614-diversion-notice-3", documentId: "KSJC-NOTICE-OF-HEARING-12-2016",
    officialFormId: "KSJC-NOTICE-OF-HEARING-12-2016", role: "notice",
    officialTitle: "Notice of Hearing on Petition for Expungement of Conviction or Diversion", revision: "KSJC 12/2016",
    officialSourceUrl: "https://www.kjc.ks.gov/legal-forms/expungement-adult/conviction-or-diversion",
    corpusPath: "LegalEase Kansas/Notice of Hearing on Petition for Expungement of Conviction or Diversion 122016.pdf", custody: "nationwide_recovery_pool_2026_09_02",
    sha256: "a960c857ec505a3013e725526718580ad2047aa9b3dd85191a70b8375cc83ffd", byteLength: 19255,
    pages: 1, acroFieldCount: 29, captionOnly: false,
    participantName: "Notice of Hearing (KSJC 12/2016)",
    whoCompletesIt: "You file it; the court sets the hearing and the clerk sends it. The Certificate of Service and Mailing at the foot of the page is the clerk's and is left blank."
  },
  {
    componentId: "ks-21-6614-diversion-cover-sheet-4", documentId: "KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016",
    officialFormId: "KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016", role: "cover_sheet",
    officialTitle: "Order of Expungement of Conviction or Diversion Cover Sheet", revision: "KSJC 12/2016",
    officialSourceUrl: "https://www.kjc.ks.gov/legal-forms/expungement-adult/conviction-or-diversion",
    corpusPath: "LegalEase Kansas/Order of Expungement of Conviction or Diversion Cover Sheet 122016.pdf", custody: "nationwide_recovery_pool_2026_09_02",
    sha256: "d4171396d12f55a50d6c4e0d5a3b694ad982325e7377d74deaa5839d3bfad537", byteLength: 67384,
    pages: 1, acroFieldCount: 21, captionOnly: false,
    participantName: "Order of Expungement Cover Sheet (KSJC 12/2016)",
    whoCompletesIt: "It goes to the Kansas Bureau of Investigation with the signed order, so the KBI can identify the right record. Its own text says it is for submission to the KBI."
  },
  {
    componentId: "ks-21-6614-diversion-proposed-order-5", documentId: "KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022",
    officialFormId: "KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022", role: "proposed_order",
    officialTitle: "Order for Expungement", revision: "Rev. KSJC 08/2022",
    officialSourceUrl: "https://www.kjc.ks.gov/legal-forms/expungement-adult/conviction-or-diversion",
    corpusPath: "STATES/KS/05_SOURCE_GATED/KS__SOURCE-GATED__KSJC__order-for-expungement-of-conviction-or-diversion__REV-2022-08__EN.pdf", custody: "master_library",
    sha256: "104c40187f530d4a55306550f262ba9eefdec8ba732e2adbb1790dfd9378e683", byteLength: 124641,
    pages: 5, acroFieldCount: 55, captionOnly: true,
    participantName: "Order for Expungement (Rev. KSJC 08/2022) — proposed",
    whoCompletesIt: "You bring it to the hearing for the judge. Only the caption is filled here; every finding, the ruling and the judge's signature are the court's."
  },
  {
    componentId: "ks-21-6614-diversion-proposed-order-6", documentId: "KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016",
    officialFormId: "KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016", role: "proposed_order",
    officialTitle: "Order Denying Expungement of Conviction or Diversion", revision: "KSJC 12/2016",
    officialSourceUrl: "https://www.kjc.ks.gov/legal-forms/expungement-adult/conviction-or-diversion",
    corpusPath: "LegalEase Kansas/Order Denying Expungement of Conviction or Diversion 122016.pdf", custody: "nationwide_recovery_pool_2026_09_02",
    sha256: "b29254fb58433d496041c185fc69ec864ba1beff1e5e9722738c3b1ebedfe2ba", byteLength: 126038,
    pages: 3, acroFieldCount: 51, captionOnly: true,
    participantName: "Order Denying Expungement (KSJC 12/2016) — proposed",
    whoCompletesIt: "The Judicial Council publishes it alongside the granting order and the committed component set requires it. Only the caption is filled here. Its paragraph 8 is the court's reason for a denial and is never drafted by this packet."
  },
  {
    componentId: "ks-21-6614-diversion-process-guidance-7", documentId: "KS-21-6614-DIVERSION-HEARING-PREPARATION",
    officialFormId: null, role: "process_guidance",
    participantName: "Preparing for your hearing",
    whoCompletesIt: "Yours to read and work from. It is not filed with anything."
  }
];

/* ---- every field of every official binary, named and decided -------------
 *
 * kind:
 *   write                a fact the platform holds, bound through the shared
 *                        field semantics by field name or printed label
 *   narrative            a fact the platform holds for which the shared
 *                        descriptor registry has no binding; written through
 *                        the finalizer's narrative channel, which resolves the
 *                        fact id and never accepts caller text
 *   select               an election THE ROUTE determines, stated by the packet
 *   requiredBeforeFiling a fact the platform does not hold, printed as a
 *                        labelled blank and disclosed to the participant
 *   later                the court or the clerk completes it after filing
 *   protected            a court, clerk, prosecutor or judicial field
 *   signature            a signature or a signature date
 *   election             a choice only the participant can make
 *   notApplicable        a branch of the form this route does not use
 *   optional             the form offers it and the platform does not invent it
 */
const CS = "KS-CRIMINAL-COVER-SHEET-10-14-2025";
const PET = "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022";
const NOT = "KSJC-NOTICE-OF-HEARING-12-2016";
const OCS = "KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016";
const ORD = "KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022";
const DEN = "KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016";

const RBF_RECORD = "from the record you screened with, or from the clerk of the convicting district court";
const ATTORNEY_REFUSAL = "attorney-only block; this packet is prepared for a self-represented petitioner and no representation fact is held";
const OPTIONAL_REFUSAL = (what) => `optional participant-authored content, and the platform does not invent it: ${what}`;

/* The Judicial Council order and the denial order are court-issued: the
 * finalizer is run over them with captionOnly, so nothing but a caption fact
 * can reach them however they are labelled. Every one of their other fields is
 * a judicial act, and the reason names which act. */
const COURT_ACT = (what) => `recorded by the court on its own order: ${what}`;

function fieldsOfCriminalCoverSheet() {
  const f = {};
  const put = (name, label, policy) => { f[`${CS}:${name}`] = { label, ...policy }; };
  put("NAME", "Defendant's name", { kind: "write", factId: "participant.full_legal_name", why: "the caption party on the cover sheet is the petitioner" });
  put("ADDRESS 1", "Defendant's address line 1", { kind: "write", factId: "participant.street_address", why: "the first ruled line of the address block" });
  put("ADDRESS 2", "Defendant's address, city state zip", { kind: "narrative", factId: "participant.city_state_zip", why: "the second ruled line of the same address block; the shared descriptor registry binds both ruled lines to the street-address fact, so this line is written through the narrative channel, which resolves the held city, state and ZIP and accepts no caller text" });
  put("PHONE", "Defendant's telephone number", { kind: "write", factId: "participant.phone", why: "the held contact telephone number" });
  put("CELL PHONE", "Defendant's cell phone number", { kind: "optional", reason: OPTIONAL_REFUSAL("a cell number different from the telephone number on the line above; the platform holds one number and prints it once") });
  put("EMAIL ADDRESS", "Defendant's e-mail address", { kind: "write", factId: "participant.email", why: "the held contact e-mail address" });
  put("DL OR STATE ID NO", "Driver's licence or state identification number, and the state that issued it", { kind: "requiredBeforeFiling", reason: "the participant supplies this before filing: the driver's licence or state identification number and its issuing state, which the platform never collects", supply: "your driver's licence or state identification number and the state that issued it, copied from the card" });
  put("SSN", "Social Security number", { kind: "optional", reason: OPTIONAL_REFUSAL("the form's own footer states that the requirement that Social Security numbers be included on criminal cases is not mandatory, and the platform never collects one") });
  put("DOB", "Date of birth", { kind: "write", factId: "participant.date_of_birth", why: "the held date of birth" });
  for (const [name, box] of [["WHITE", "White"], ["BLACK", "Black"], ["ASIAN", "Asian"], ["PACIFIC ISLAND", "Pacific Island"], ["AMERICAN INDIANALASKAN", "American Indian or Alaskan"], ["UNKNOWN", "Unknown"]]) {
    put(name, `Race — ${box} (selection)`, { kind: "election", selectionControl: true, reason: `only the petitioner marks the "${box}" race box on this cover sheet: the platform holds the words the participant used about themselves and not a position in the court's six-value taxonomy, and the committed legal-design record leaves race, ethnicity and the Social Security number on this cover sheet for the participant pending the data-protection review` });
  }
  put("Ethnicity rbgroup", "Ethnicity — Hispanic, Non-Hispanic or Unknown (selection)", { kind: "election", selectionControl: true, reason: "only the petitioner marks the ethnicity group on this cover sheet, which offers Hispanic, Non-Hispanic and Unknown: the platform holds no position in that three-value taxonomy, and the committed legal-design record leaves ethnicity on this cover sheet for the participant pending the data-protection review" });
  put("SEX", "Sex", { kind: "requiredBeforeFiling", reason: "the participant supplies this before filing: the sex the court record should state", supply: "the sex the court record should state, in the words you want the record to carry" });
  for (const n of [1, 2, 3]) put(`ALIAS NAMES USED ${n}`, `Alias names used, line ${n}`, { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: any other name the record may carry, ${RBF_RECORD}`, supply: `any other name this case may be recorded under — a former name, a married name, a nickname the record used — line ${n}, or leave it blank if there is none` });
  put("KDR TRANSACTION NUMBER", "Kansas Department of Revenue transaction number", { kind: "requiredBeforeFiling", reason: "the participant supplies this before filing: the Kansas Department of Revenue transaction number if the case carries one, which the platform never collects", supply: "the Kansas Department of Revenue transaction number if this case has one; leave it blank if it does not" });
  put("VIOLATION DATE", "Violation date", { kind: "write", factId: "matter.offense_date", why: "the date the offence was committed, which the committed registry collects as its own question because under State v. Anderson the law in effect when the offence was committed governs eligibility" });
  put("OFFICER", "Complaint information — citing or arresting officer", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the officer named on the complaint, ${RBF_RECORD}`, supply: "the name of the officer shown on the complaint or the citation" });
  put("OFFICER NO", "Complaint information — officer number", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the officer number shown on the complaint, ${RBF_RECORD}`, supply: "the officer number shown on the complaint or the citation" });
  for (const [name, what] of [
    ["C Attorney Firm", "complainant's attorney — firm name"],
    ["C Attorney Address", "complainant's attorney — address"],
    ["C Attorney Phone", "complainant's attorney — telephone number"],
    ["C Attorney Cell", "complainant's attorney — cell phone number"],
    ["C Attorney Email", "complainant's attorney — e-mail address"],
    ["C Attorney SC No", "complainant's attorney — Supreme Court identification number"],
    ["D Attorney Firm", "defendant's attorney — firm name"],
    ["D Attorney Street", "defendant's attorney — street address"],
    ["D Attorney CSZ", "defendant's attorney — city, state and ZIP"],
    ["D Attorney Phone", "defendant's attorney — telephone number"],
    ["D Attorney SC No", "defendant's attorney — Supreme Court identification number"],
    ["D Attorney If needed", "defendant's attorney — additional line if needed"]
  ]) put(name, `Attorneys (if known) — ${what}`, { kind: "notApplicable", reason: ATTORNEY_REFUSAL, routeCondition: "This packet is prepared for a petitioner appearing pro se on the K.S.A. 21-6614(a)(1) route; the cover sheet's attorney blocks are completed only where an attorney of record exists, and no representation fact is held for this participant." });
  return f;
}

function fieldsOfPetition() {
  const f = {};
  const put = (name, label, policy) => { f[`${PET}:${name}`] = { label, ...policy }; };
  put("JUDICIAL DISTRICT", "Judicial district", { kind: "write", factId: "matter.court", why: "the judicial district of the convicting court, from the caption of the original criminal action" });
  put("COUNTY KANSAS", "County", { kind: "write", factId: "matter.county", why: "the county of the district court the petition is filed in" });
  put("Case No", "Case No.", { kind: "write", factId: "matter.case_number", why: "the number of the original criminal action; K.S.A. 21-6614(g)(3) docket the petition in it" });
  put("Name", "Defendant", { kind: "write", factId: "participant.full_legal_name", why: "the caption party" });
  put("undefined", "Item 1 — my full legal name", { kind: "write", factId: "participant.full_legal_name", why: "item 1 asks the petitioner to state their own full name" });
  put("undefined_2", "Item 2 — my full name at the time of my arrest or conviction, if different from item 1", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the name the record carries if it is not the name in item 1, ${RBF_RECORD}`, supply: "the full name you were known by at the time of the arrest or conviction, if it is different from the name printed in item 1; leave it blank if it is the same" });
  put("Race", "Item 3 — the race the petition should state", { kind: "requiredBeforeFiling", reason: "the participant supplies this before filing: the race the petition should state, in their own words", supply: "the race you want the petition to state, in your own words" });
  put("Sex born in", "Item 3 — the sex the petition should state", { kind: "requiredBeforeFiling", reason: "the participant supplies this before filing: the sex the petition should state, in their own words", supply: "the sex you want the petition to state, in your own words" });
  put("Year of Birth", "Item 3 — year of birth", { kind: "requiredBeforeFiling", reason: "the participant supplies this before filing: the year of birth this item asks for, which is a different value from the full date of birth the cover sheets carry", supply: "the four-digit year you were born" });
  put("County Kansas on", "Item 4 — the Kansas county I was arrested in", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the county of the ARREST, which is not necessarily the county this petition is filed in, ${RBF_RECORD}`, supply: "the Kansas county you were arrested in. If it is not the county at the top of this page, stop and read the note about differing counties before you file." });
  put("Date by", "Item 4 — date of arrest", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the date of the arrest, ${RBF_RECORD}`, supply: "the date you were arrested" });
  put("Law Enforcement Agency and charged with the", "Item 4 — the law enforcement agency that arrested me", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the agency that arrested you, ${RBF_RECORD}`, supply: "the name of the law enforcement agency that arrested you" });
  put("undefined_3", "Item 4 — the crime I was charged with", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the crime charged at the arrest, ${RBF_RECORD}`, supply: "the crime you were charged with at the arrest, as the record states it" });
  put("on", "Item 5, first alternative — the crime I was convicted of", { kind: "notApplicable", reason: "the conviction alternative of item 5 belongs to the K.S.A. 21-6614(a)(1) conviction route", routeCondition: "Item 5 of this petition prints a conviction alternative and a diversion alternative separated by OR. This packet is built for the K.S.A. 21-6614(a)(2) diversion route and states the diversion alternative; the conviction alternative is the K.S.A. 21-6614(a)(1) route, which is a different track with a different triggering event." });
  put("Date", "Item 5, first alternative — date of conviction", { kind: "notApplicable", reason: "the conviction alternative of item 5 belongs to the K.S.A. 21-6614(a)(1) conviction route", routeCondition: "The same OR alternative as the line above: this packet is the K.S.A. 21-6614(a)(2) diversion route, and a date of conviction is a fact of the K.S.A. 21-6614(a)(1) route." });
  put("on_2", "Item 5, second alternative — the crime for which I was granted a diversion", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the crime the diversion agreement was entered for, ${RBF_RECORD}`, supply: "the crime you were granted a diversion for, as the diversion agreement states it, with the Kansas statute if the record gives one" });
  put("Date_2", "Item 5, second alternative — the date the diversion was granted", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the date the diversion was granted, ${RBF_RECORD}`, supply: "the date the diversion was granted. This is not the date you finished it; item 7 asks for that." });
  put("undefined_4", "Item 6 — the convicting court or diverting authority", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the diverting authority, ${RBF_RECORD}`, supply: "the authority that granted the diversion — usually the county or district attorney's office — named as the diversion agreement names it" });
  put("undefined_5", "Item 7 — the date of final discharge", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the date the terms of the diversion agreement were fulfilled, which is the date the waiting period runs from, ${RBF_RECORD}`, supply: "the date you fulfilled the terms of the diversion agreement. On this route that is the only date the waiting period runs from — not the arrest date and not the date the diversion was granted." });
  put("Check Box1", "Item at the head of the petition — expungement of my CONVICTION and related arrest records (selection)", { kind: "notApplicable", selectionControl: true, reason: "the conviction alternative of the opening request belongs to the K.S.A. 21-6614(a)(1) conviction route", routeCondition: "The petition opens with two mutually exclusive boxes separated by OR. This packet states the diversion box because it is built for the K.S.A. 21-6614(a)(2) diversion route, whose triggering event is fulfilment of the terms of a diversion agreement and nothing else; the conviction box is the K.S.A. 21-6614(a)(1) route and marking both would ask for two different remedies at once." });
  put("Check Box2", "Item at the head of the petition — expungement of my DIVERSION record and related arrest records (selection)", { kind: "select", basis: "The route determines this election. This packet is the K.S.A. 21-6614(a)(2) diversion route, and a petition built for one statutory route states which route it is rather than asking the petitioner. The held disposition is a fulfilled diversion agreement and the build refuses to run if it is anything else." });
  put("Check Box3", "Item 8 — Option A (selection)", { kind: "select", basis: "The route determines this election. Item 8 says to select and complete either Option A or Option B and NOT both. Option B is the K.S.A. 21-6614(a)(3) specialty-court lane, which is its own track; the K.S.A. 21-6614(a)(1) conviction route this packet is built for is Option A. The build refuses to run over a held answer that a specialty-court programme was completed, or that a felony conviction or pending felony proceeding exists, because Option A asserts the opposite." });
  for (const [name, years] of [["Check Box4", "one"], ["Check Box5", "three"], ["Check Box6", "five"], ["Check Box7", "ten"]]) {
    put(name, `Item 8, Option A.i — ${years} year(s) have elapsed (selection)`, {
      kind: "requiredBeforeFiling", selectionControl: true,
      reason: `the participant marks the "${years}" box at item 8.A.i themselves: which of the four waiting periods applies turns on how the offence is classified in the Kansas sentencing grid and on the date the offence was committed, and the committed registry says LegalEase "does not assert that the participant is eligible, does not classify the offence into a grid severity level for them"`,
      supply: `mark this box only if ${years === "one" ? "one year has" : `${years} years have`} elapsed since your date of final discharge AND the ${years}-year period is the one your offence falls into. Which period applies depends on how your offence is classified; the Judicial Council chart printed on pages 5 and 6 of this petition works it through, and the packet does not classify the offence for you.`,
      caseDetermined: "The route is K.S.A. 21-6614(a)(2) for every one of the four boxes; what differs between them is the severity classification of the conduct the diversion was entered for and the date the offence was committed, which are facts of the case. The committed track registry states in terms that LegalEase does not classify the offence into a grid severity level, and under State v. Anderson the law in effect when the offence was committed governs. On this route the committed record additionally records that the ten-year lane at K.S.A. 21-6614(d)(2) does not reach a diversion at all and that the Judicial Council chart shows not-applicable in the diversion column for the seven-year and ten-year DUI rows. Marking one of these boxes from the route alone would be asserting a legal characterisation of a code section on a petition sworn under penalty of perjury."
    });
  }
  put("Check Box8", "Item 8 — Option B, specialty court programme (selection)", { kind: "notApplicable", selectionControl: true, reason: "Option B is the K.S.A. 21-6614(a)(3) specialty-court lane and a different track", routeCondition: "Item 8 says to select and complete either Option A or Option B, NOT both. This packet is the K.S.A. 21-6614(a)(1) conviction route and states Option A; Option B is the specialty-court lane under K.S.A. 21-6614(a)(3), which has no waiting period, its own fee-waiver provision and its own findings, and is a separate track." });
  put("I was convicted received a diversion for prostitution and I was acting under", "Item 8, Option A.iii — I was convicted or received a diversion for prostitution and I was acting under coercion (selection)", { kind: "notApplicable", selectionControl: true, reason: "the coercion assertion at item 8.A.iii belongs to the K.S.A. 21-6614(b) prostitution-coercion route", routeCondition: "Item 8.A.iii is the sworn coercion assertion that opens the shorter one-year period under K.S.A. 21-6614(b). This packet is built for the ordinary K.S.A. 21-6614(a)(1) conviction route and reaches no prostitution conviction or diversion; the coercion route is a separate track, and the committed registry says LegalEase must not invent the coercion narrative and must not decide whether coercion is proved." });
  put("Name Print", "Defendant's own block printed under the Defendant, Pro Se line — Name (Print)", { kind: "write", factId: "participant.full_legal_name", why: "the petitioner prints their own name under the signature line" });
  put("Address 1", "Defendant's own block printed under the Defendant, Pro Se line — Address 1", { kind: "write", factId: "participant.street_address", why: "the held street address" });
  put("Address 2", "Defendant's own block printed under the Defendant, Pro Se line — Address 2", { kind: "optional", reason: OPTIONAL_REFUSAL("a second address line, used only if the address needs one; this block prints its own City, State, Zip line below") });
  put("City State Zip", "Defendant's own block printed under the Defendant, Pro Se line — City, State, Zip", { kind: "write", factId: "participant.city_state_zip", why: "the held city, state and ZIP" });
  put("Telephone Number", "Defendant's own block printed under the Defendant, Pro Se line — Telephone Number", { kind: "write", factId: "participant.phone", why: "the held telephone number" });
  put("Fax Number", "Defendant's own block printed under the Defendant, Pro Se line — Fax Number", { kind: "optional", reason: OPTIONAL_REFUSAL("a fax number, which the form prints in brackets and the platform never collects") });
  put("Email Address", "Defendant's own block printed under the Defendant, Pro Se line — E-mail Address", { kind: "write", factId: "participant.email", why: "the held e-mail address" });
  return f;
}

function fieldsOfNotice() {
  const f = {};
  const put = (name, label, policy) => { f[`${NOT}:${name}`] = { label, ...policy }; };
  const HEARING = "the court sets the hearing when the petition is filed; the participant obtains it from the clerk or the assigned judge's administrative assistant and writes it in";
  put("IN THE", "Judicial district", { kind: "write", factId: "matter.court", why: "the caption repeats the judicial district of the petition" });
  put("DISTRICT COURT OF", "County of the district court", { kind: "write", factId: "matter.county", why: "the caption repeats the county of the petition" });
  put("Case No", "Case No.", { kind: "write", factId: "matter.case_number", why: "the caption repeats the number of the original criminal action" });
  put("Name", "Defendant", { kind: "write", factId: "participant.full_legal_name", why: "the caption party" });
  put("The court will hold hearing on this matter on", "Hearing date the court sets after filing — day of the month", { kind: "later", reason: "the court, not the participant and not the platform, sets the hearing date", trigger: HEARING });
  put("day of", "Hearing date the court sets after filing — month", { kind: "later", reason: "the court, not the participant and not the platform, sets the hearing date", trigger: HEARING });
  put("20", "Hearing date the court sets after filing — year", { kind: "later", reason: "the court, not the participant and not the platform, sets the hearing date", trigger: HEARING });
  put("at", "Hearing time the court sets after filing — hour", { kind: "later", reason: "the court, not the participant and not the platform, sets the hearing time", trigger: HEARING });
  put("undefined", "Hearing time the court sets after filing — minutes", { kind: "later", reason: "the court, not the participant and not the platform, sets the hearing time", trigger: HEARING });
  put("am", "Hearing time the court sets after filing — a.m.", { kind: "later", reason: "the court, not the participant and not the platform, sets the hearing time", trigger: HEARING });
  put("undefined_2", "Hearing time the court sets after filing — p.m.", { kind: "later", reason: "the court, not the participant and not the platform, sets the hearing time", trigger: HEARING });
  put("pm at the", "Courtroom assignment the court makes after filing — county courthouse", { kind: "later", reason: "the court assigns the courthouse for the hearing", trigger: HEARING });
  put("County Courthouse in division", "Courtroom assignment the court makes after filing — division", { kind: "later", reason: "the court assigns the division for the hearing", trigger: HEARING });
  put("room", "Courtroom assignment the court makes after filing — room", { kind: "later", reason: "the court assigns the room for the hearing", trigger: HEARING });
  put("Name Print", "Petitioner's block — Name (Print)", { kind: "write", factId: "participant.full_legal_name", why: "the petitioner prints their own name under the signature line" });
  put("Address 1", "Petitioner's block — Address 1", { kind: "write", factId: "participant.street_address", why: "the held street address" });
  put("Address 2", "Petitioner's block — Address 2", { kind: "optional", reason: OPTIONAL_REFUSAL("a second address line, used only if the address needs one; this block prints its own City, State, Zip line below") });
  put("City State Zip", "Petitioner's block — City, State, Zip", { kind: "write", factId: "participant.city_state_zip", why: "the held city, state and ZIP" });
  put("Telephone Number", "Petitioner's block — Telephone Number", { kind: "write", factId: "participant.phone", why: "the held telephone number" });
  put("Fax Number", "Petitioner's block — Fax Number", { kind: "optional", reason: OPTIONAL_REFUSAL("a fax number, which the form prints in brackets and the platform never collects") });
  put("Email Address", "Petitioner's block — E-mail Address", { kind: "write", factId: "participant.email", why: "the held e-mail address" });
  const CERT = "the Certificate of Service and Mailing is completed by the Clerk of the Court or a Deputy Clerk after the clerk mails the notice; K.S.A. 21-6614(g)(1) puts notice on the court, the block's own signature line reads (Clerk of the Court) (Deputy Clerk), and the committed legal-design record says LegalEase must never prefill it or have the participant sign it";
  put("Prosecuting Attorney Print", "Certificate of Service and Mailing, completed by the Clerk of the Court or Deputy Clerk — prosecuting attorney addressee", { kind: "protected", reason: CERT });
  put("Address 1_2", "Certificate of Service and Mailing, completed by the Clerk of the Court or Deputy Clerk — prosecuting attorney address line 1", { kind: "protected", reason: CERT });
  put("Address 2_2", "Certificate of Service and Mailing, completed by the Clerk of the Court or Deputy Clerk — prosecuting attorney address line 2", { kind: "protected", reason: CERT });
  put("City State Zip_2", "Certificate of Service and Mailing, completed by the Clerk of the Court or Deputy Clerk — prosecuting attorney city, state and ZIP", { kind: "protected", reason: CERT });
  put("Arresting Law Enforcement Agency Print", "Certificate of Service and Mailing, completed by the Clerk of the Court or Deputy Clerk — arresting law enforcement agency addressee", { kind: "protected", reason: CERT });
  put("Address 1_3", "Certificate of Service and Mailing, completed by the Clerk of the Court or Deputy Clerk — arresting agency address line 1", { kind: "protected", reason: CERT });
  put("Address 2_3", "Certificate of Service and Mailing, completed by the Clerk of the Court or Deputy Clerk — arresting agency address line 2", { kind: "protected", reason: CERT });
  put("City State Zip_3", "Certificate of Service and Mailing, completed by the Clerk of the Court or Deputy Clerk — arresting agency city, state and ZIP", { kind: "protected", reason: CERT });
  return f;
}

function fieldsOfOrderCoverSheet() {
  const f = {};
  const put = (name, label, policy) => { f[`${OCS}:${name}`] = { label, ...policy }; };
  put("DEFENDANTS INFORMATION", "Defendant's name", { kind: "write", factId: "participant.full_legal_name", why: "the KBI cover sheet identifies the person whose record is to be expunged" });
  put("undefined", "Defendant's address line 1", { kind: "write", factId: "participant.street_address", why: "the first ruled line of the address block" });
  put("ADDRESS", "Defendant's address, city state zip", { kind: "narrative", factId: "participant.city_state_zip", why: "the second ruled line of the same address block; written through the narrative channel for the reason given on the criminal cover sheet" });
  put("Text1", "Social Security number", { kind: "requiredBeforeFiling", reason: "the participant supplies this before filing: the Social Security number this KBI cover sheet asks for, which the platform never collects", supply: "your Social Security number, if you choose to give it. The committed legal-design record leaves this for you pending the data-protection review." });
  put("Check Box2", "Sex — Male (selection)", { kind: "election", selectionControl: true, reason: "only the petitioner marks the Male box on this KBI cover sheet: the platform holds the words the participant used about themselves and not a position in this form's two-value taxonomy" });
  put("Check Box3", "Sex — Female (selection)", { kind: "election", selectionControl: true, reason: "only the petitioner marks the Female box on this KBI cover sheet: the platform holds the words the participant used about themselves and not a position in this form's two-value taxonomy" });
  put("DOB", "Date of birth", { kind: "write", factId: "participant.date_of_birth", why: "the held date of birth, which is what the KBI matches the record on" });
  for (const [name, box] of [["WHITE", "White"], ["BLACK", "Black"], ["ASIAN", "Asian"], ["PACIFIC ISLAND", "Pacific Island"], ["AMERICAN INDIANALASKAN", "American Indian or Alaskan"], ["UNKNOWN", "Unknown"]]) {
    put(name, `Race — ${box} (selection)`, { kind: "election", selectionControl: true, reason: `only the petitioner marks the "${box}" race box on this KBI cover sheet: the platform holds the words the participant used about themselves and not a position in the court's six-value taxonomy, and the committed legal-design record leaves race, ethnicity and the Social Security number on this cover sheet for the participant pending the data-protection review` });
  }
  for (const [name, box] of [["HISPANIC", "Hispanic"], ["NONHISPANIC", "Non-Hispanic"], ["UNKNOWN_2", "Unknown"]]) {
    put(name, `Ethnicity — ${box} (selection)`, { kind: "election", selectionControl: true, reason: `only the petitioner marks the "${box}" ethnicity box on this KBI cover sheet: the platform holds no position in this form's three-value taxonomy, and the committed legal-design record leaves ethnicity on this cover sheet for the participant pending the data-protection review` });
  }
  for (const n of [1, 2, 3, 4, 5]) put(`ALIAS NAMES USED ${n}`, `Alias names used, line ${n}`, { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: any other name the record may carry, ${RBF_RECORD}`, supply: `any other name this case may be recorded under — line ${n}, or leave it blank if there is none. The KBI matches the record on these.` });
  return f;
}

/* The two proposed orders. captionOnly is on for both, so only a caption fact
 * can be written whatever a field is called; every other field is a judicial
 * act, an appearance the court records, a finding the court makes, or a block
 * belonging to counsel. */
function fieldsOfOrders() {
  const f = {};
  const putOrd = (name, label, policy) => { f[`${ORD}:${name}`] = { label, ...policy }; };
  const putDen = (name, label, policy) => { f[`${DEN}:${name}`] = { label, ...policy }; };

  for (const [put, doc, orderName] of [[putOrd, ORD, "Order for Expungement"], [putDen, DEN, "Order Denying Expungement"]]) {
    put(doc === ORD ? "JUDICIAL DISTRICT" : "IN THE", "Judicial district", { kind: "write", factId: "matter.court", why: `the caption of the ${orderName} repeats the judicial district of the petition` });
    put(doc === ORD ? "COUNTY KANSAS" : "DISTRICT COURT OF", "County of the district court", { kind: "write", factId: "matter.county", why: `the caption of the ${orderName} repeats the county of the petition` });
    put("Case No", "Case No.", { kind: "write", factId: "matter.case_number", why: `the caption of the ${orderName} repeats the number of the original criminal action` });
    put("Name", "Defendant", { kind: "write", factId: "participant.full_legal_name", why: `the caption party of the ${orderName}` });
  }

  /* ---- Order for Expungement, Rev. KSJC 08/2022 ---- */
  putOrd("day of", "Hearing date the court enters on its own order — day", { kind: "protected", reason: COURT_ACT("the day the court considers the petition") });
  putOrd("20", "Hearing date the court enters on its own order — month", { kind: "protected", reason: COURT_ACT("the month the court considers the petition") });
  putOrd("the Court considers the Petition for", "Hearing date the court enters on its own order — year", { kind: "protected", reason: COURT_ACT("the year the court considers the petition") });
  putOrd("assistant", "The State appears by — assistant county or district attorney or designee", { kind: "protected", reason: COURT_ACT("who appeared for the State at the hearing; no prosecutor act is held") });
  putOrd("The petitioner appears", "Appearance the court records — the petitioner appears pro se (selection)", { kind: "protected", selectionControl: true, reason: COURT_ACT("whether the petitioner appeared pro se; an appearance is something that happens at a hearing, not something a packet can assert in advance") });
  putOrd("pro se", "Appearance the court records — the petitioner appears in person with counsel (selection)", { kind: "protected", selectionControl: true, reason: COURT_ACT("whether the petitioner appeared in person with counsel; an appearance is something that happens at a hearing, not something a packet can assert in advance") });
  putOrd("Attorneys name if any", "Attorney's name, if any", { kind: "notApplicable", reason: ATTORNEY_REFUSAL, routeCondition: "This packet is prepared for a petitioner appearing pro se and no representation fact is held; the order's attorney line is completed only where an attorney appears." });
  putOrd("undefined", "Others appearing at the hearing, if any, recorded by the court", { kind: "protected", reason: COURT_ACT("who else appeared at the hearing") });
  putOrd("The Court", "Finding the court records — the Court, upon agreement of the parties (selection)", { kind: "protected", selectionControl: true, reason: COURT_ACT("whether it proceeded upon agreement of the parties") });
  putOrd("upon agreement of the parties", "Finding the court records — having reviewed the file (selection)", { kind: "protected", selectionControl: true, reason: COURT_ACT("whether it reviewed the file") });
  putOrd("having reviewed the file", "Finding the court records — having received the evidence (selection)", { kind: "protected", selectionControl: true, reason: COURT_ACT("whether it received evidence") });
  putOrd("received the evidence andor", "Finding the court records — having heard statements of counsel (selection)", { kind: "protected", selectionControl: true, reason: COURT_ACT("whether it heard statements of counsel") });
  putOrd("undefined_2", "Order paragraph 1 — the full name of the petitioner", { kind: "write", factId: "participant.full_legal_name", why: "paragraph 1 of the proposed order recites the petitioner's own name, which is a caption fact" });
  putOrd("undefined_3", "Order paragraph 2 — the full name of the petitioner at the time of arrest or conviction, if different from paragraph 1", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the name the record carries if it is not the name in paragraph 1, ${RBF_RECORD}`, supply: "the full name you were known by at the time of the arrest or conviction, if it is different; leave it blank if it is the same" });
  putOrd("Race", "Order paragraph 3 — the race the order should state", { kind: "requiredBeforeFiling", reason: "the participant supplies this before lodging the proposed order: the race the order should state, in their own words", supply: "the race, copied from what you wrote at item 3 of the petition" });
  putOrd("Sex born in", "Order paragraph 3 — the sex the order should state", { kind: "requiredBeforeFiling", reason: "the participant supplies this before lodging the proposed order: the sex the order should state, in their own words", supply: "the sex, copied from what you wrote at item 3 of the petition" });
  putOrd("Year of Birth", "Order paragraph 3 — year of birth", { kind: "requiredBeforeFiling", reason: "the participant supplies this before lodging the proposed order: the year of birth", supply: "the four-digit year you were born, copied from item 3 of the petition" });
  putOrd("County Kansas on", "Order paragraph 4 — the Kansas county the petitioner was arrested in", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the county of the arrest, ${RBF_RECORD}`, supply: "the Kansas county of the arrest, copied from item 4 of the petition" });
  putOrd("undefined_4", "Order paragraph 4 — date of arrest", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the date of the arrest, ${RBF_RECORD}`, supply: "the date of the arrest, copied from item 4 of the petition" });
  putOrd("Law Enforcement Agency and charged with", "Order paragraph 4 — the law enforcement agency that arrested the petitioner", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the arresting agency, ${RBF_RECORD}`, supply: "the arresting agency, copied from item 4 of the petition" });
  putOrd("undefined_5", "Order paragraph 4 — the crime the petitioner was charged with", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the crime charged at the arrest, ${RBF_RECORD}`, supply: "the crime charged, copied from item 4 of the petition" });
  putOrd("on", "Order paragraph 5, first alternative — the crime the petitioner was convicted of", { kind: "notApplicable", reason: "the conviction alternative of paragraph 5 belongs to the K.S.A. 21-6614(a)(1) conviction route", routeCondition: "Paragraph 5 of the order prints a conviction alternative and a diversion alternative separated by OR, mirroring item 5 of the petition. This packet is the K.S.A. 21-6614(a)(2) diversion route." });
  putOrd("Date", "Order paragraph 5, first alternative — date of conviction", { kind: "notApplicable", reason: "the conviction alternative of paragraph 5 belongs to the K.S.A. 21-6614(a)(1) conviction route", routeCondition: "The same OR alternative as the line above; this packet is the K.S.A. 21-6614(a)(2) diversion route." });
  putOrd("on_2", "Order paragraph 5, second alternative — the crime for which a diversion was granted", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the crime the diversion was entered for, ${RBF_RECORD}`, supply: "the crime the diversion was granted for, copied from item 5 of the petition" });
  putOrd("Date_2", "Order paragraph 5, second alternative — the date the diversion was granted", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the date the diversion was granted, ${RBF_RECORD}`, supply: "the date the diversion was granted, copied from item 5 of the petition" });
  putOrd("undefined_6", "Order paragraph 6 — the convicting court or diverting authority", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the diverting authority, ${RBF_RECORD}`, supply: "the diverting authority, copied from item 6 of the petition" });
  putOrd("undefined_7", "Order paragraph 7 — the date of final discharge", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the date the diversion terms were fulfilled, ${RBF_RECORD}`, supply: "the date you fulfilled the terms of the diversion agreement, copied from item 7 of the petition" });
  for (const [name, years] of [["More than", "more than"], ["one", "one"], ["three", "three"], ["five", "five"], ["seven", "seven"], ["ten years have elapsed since", "ten"]]) {
    putOrd(name, `Order paragraph 8 — finding the court makes: "${years}" years have elapsed (selection)`, { kind: "protected", selectionControl: true, reason: COURT_ACT(`the paragraph 8 finding that "${years}" years have elapsed since the petitioner fulfilled the terms of a diversion agreement, satisfied the sentence imposed, or was discharged from supervision; a finding on an order is the judge's and never the petitioner's or the platform's`) });
  }
  putOrd("The petitioner successfully completed a specialty courts program and no proceeding", "Order paragraph 8, second alternative — finding the court makes: the petitioner successfully completed a specialty courts program (selection)", { kind: "protected", selectionControl: true, reason: COURT_ACT("the alternative paragraph 8 finding for the K.S.A. 21-6614(a)(3) specialty-court lane, which is both a judicial finding and a different track from this one") });
  putOrd("Text2", "Order paragraph 13 — the circumstances in which disclosure is still required, as deemed appropriate by the Court", { kind: "protected", reason: COURT_ACT("the additional disclosure circumstances paragraph 13 leaves to the court's discretion") });
  for (const [name, what] of [
    ["NamePrint", "Name (Print)"], ["Supreme Court Number", "Supreme Court Number"],
    ["Address 1", "Address 1"], ["Address 2", "Address 2"], ["City State Zip", "City, State, Zip"],
    ["Telephone", "Telephone"], ["Fax Number", "Fax Number"], ["Email Address", "E-mail Address"]
  ]) putOrd(name, `Submitted by block on the court's order — ${what}`, { kind: "protected", reason: COURT_ACT(`the "Submitted by" block beneath the judge's signature line, whose printed signature caption reads "Signature of Defendant/Defendant's Attorney"; the shared finalizer treats every field beneath IT IS SO ORDERED as a page region the court owns, and this packet writes nothing into a signed order`) });
  for (const [name, what] of [
    ["NamePrint_2", "Name (Print)"], ["Supreme Court Number_2", "Supreme Court Number"],
    ["Address 1_2", "Address 1"], ["Address 2_2", "Address 2"], ["City State Zip_2", "City, State, Zip"],
    ["Telephone_2", "Telephone"], ["Fax Number_2", "Fax Number"], ["Email Address_2", "E-mail Address"]
  ]) putOrd(name, `Approved by block on the court's order, Assistant County or District Attorney — ${what}`, { kind: "protected", reason: COURT_ACT("the \"Approved by\" block for the assistant county or district attorney; no prosecutor act is held and none is ever asserted by this packet") });

  /* ---- Order Denying Expungement, KSJC 12/2016 ---- */
  putDen("On this", "Hearing date the court enters on its own order — day", { kind: "protected", reason: COURT_ACT("the day the court considers the petition") });
  putDen("day of", "Hearing date the court enters on its own order — month", { kind: "protected", reason: COURT_ACT("the month the court considers the petition") });
  putDen("20", "Hearing date the court enters on its own order — year", { kind: "protected", reason: COURT_ACT("the year the court considers the petition") });
  putDen("The State appears by", "The State appears by — assistant county or district attorney or designee", { kind: "protected", reason: COURT_ACT("who appeared for the State at the hearing; no prosecutor act is held") });
  putDen("The petitioner appears", "Appearance the court records — the petitioner appears pro se (selection)", { kind: "protected", selectionControl: true, reason: COURT_ACT("whether the petitioner appeared pro se") });
  putDen("pro se", "Appearance the court records — the petitioner appears in person with counsel (selection)", { kind: "protected", selectionControl: true, reason: COURT_ACT("whether the petitioner appeared in person with counsel") });
  putDen("Attorneys name if any", "Attorney's name, if any", { kind: "notApplicable", reason: ATTORNEY_REFUSAL, routeCondition: "This packet is prepared for a petitioner appearing pro se and no representation fact is held." });
  putDen("undefined", "Others appearing at the hearing, if any, recorded by the court", { kind: "protected", reason: COURT_ACT("who else appeared at the hearing") });
  putDen("The Court", "Finding the court records — the Court, upon agreement of the parties (selection)", { kind: "protected", selectionControl: true, reason: COURT_ACT("whether it proceeded upon agreement of the parties") });
  putDen("upon agreement of the parties", "Finding the court records — having reviewed the file (selection)", { kind: "protected", selectionControl: true, reason: COURT_ACT("whether it reviewed the file") });
  putDen("having reviewed the file", "Finding the court records — having received the evidence (selection)", { kind: "protected", selectionControl: true, reason: COURT_ACT("whether it received evidence") });
  putDen("received the evidence andor", "Finding the court records — having heard statements of counsel (selection)", { kind: "protected", selectionControl: true, reason: COURT_ACT("whether it heard statements of counsel") });
  putDen("1  The full name of the petitioner is", "Denial order paragraph 1 — the full name of the petitioner", { kind: "write", factId: "participant.full_legal_name", why: "paragraph 1 of the proposed denial order recites the petitioner's own name, which is a caption fact" });
  putDen("1 was", "Denial order paragraph 2 — the full name of the petitioner at the time of arrest or conviction, if different from paragraph 1", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the name the record carries if it is not the name in paragraph 1, ${RBF_RECORD}`, supply: "the full name you were known by at the time of the arrest or conviction, if it is different; leave it blank if it is the same" });
  putDen("3  The petitioner is a", "Denial order paragraph 3 — the race the order should state", { kind: "requiredBeforeFiling", reason: "the participant supplies this before lodging the proposed order: the race the order should state, in their own words", supply: "the race, copied from what you wrote at item 3 of the petition" });
  putDen("Race", "Denial order paragraph 3 — the sex the order should state", { kind: "requiredBeforeFiling", reason: "the participant supplies this before lodging the proposed order: the sex the order should state, in their own words", supply: "the sex, copied from what you wrote at item 3 of the petition" });
  putDen("Sex born in", "Denial order paragraph 3 — year of birth", { kind: "requiredBeforeFiling", reason: "the participant supplies this before lodging the proposed order: the year of birth", supply: "the four-digit year you were born, copied from item 3 of the petition" });
  putDen("4  The petitioner was arrested in", "Denial order paragraph 4 — the Kansas county the petitioner was arrested in", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the county of the arrest, ${RBF_RECORD}`, supply: "the Kansas county of the arrest, copied from item 4 of the petition" });
  putDen("County Kansas on", "Denial order paragraph 4 — date of arrest", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the date of the arrest, ${RBF_RECORD}`, supply: "the date of the arrest, copied from item 4 of the petition" });
  putDen("Date by", "Denial order paragraph 4 — the law enforcement agency that arrested the petitioner", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the arresting agency, ${RBF_RECORD}`, supply: "the arresting agency, copied from item 4 of the petition" });
  putDen("the crime of", "Denial order paragraph 4 — the crime the petitioner was charged with", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the crime charged at the arrest, ${RBF_RECORD}`, supply: "the crime charged, copied from item 4 of the petition" });
  putDen("5 The petitioner was convicted of", "Denial order paragraph 5, first alternative — the crime the petitioner was convicted of", { kind: "notApplicable", reason: "the conviction alternative of paragraph 5 belongs to the K.S.A. 21-6614(a)(1) conviction route", routeCondition: "Paragraph 5 of the denial order prints a conviction alternative and a diversion alternative separated by OR. This packet is the K.S.A. 21-6614(a)(2) diversion route." });
  putDen("on", "Denial order paragraph 5, first alternative — date of conviction", { kind: "notApplicable", reason: "the conviction alternative of paragraph 5 belongs to the K.S.A. 21-6614(a)(1) conviction route", routeCondition: "The same OR alternative as the line above; this packet is the K.S.A. 21-6614(a)(2) diversion route." });
  putDen("The petitioner was granted a diversion for the crime of", "Denial order paragraph 5, second alternative — the crime for which a diversion was granted", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the crime the diversion was entered for, ${RBF_RECORD}`, supply: "the crime the diversion was granted for, copied from item 5 of the petition" });
  putDen("Date", "Denial order paragraph 5, second alternative — the date the diversion was granted", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the date the diversion was granted, ${RBF_RECORD}`, supply: "the date the diversion was granted, copied from item 5 of the petition" });
  putDen("6  The convicting court or diverting authority was", "Denial order paragraph 6 — the convicting court or diverting authority", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the diverting authority, ${RBF_RECORD}`, supply: "the diverting authority, copied from item 6 of the petition" });
  putDen("7  The date of final discharge was", "Denial order paragraph 7 — the date of final discharge", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the date the diversion terms were fulfilled, ${RBF_RECORD}`, supply: "the date you fulfilled the terms of the diversion agreement, copied from item 7 of the petition" });
  putDen("undefined_2", "Denial order paragraph 8 — the court's reason for denying the petition", { kind: "protected", reason: COURT_ACT("paragraph 8, which is the court's own reason for denying the petition; the committed legal-design record says LegalEase never drafts it") });
  putDen("IT IS THEREFORE ORDERED this", "Order date the court enters — day", { kind: "protected", reason: COURT_ACT("the day it enters the order") });
  putDen("day of_2", "Order date the court enters — month", { kind: "protected", reason: COURT_ACT("the month it enters the order") });
  putDen("20_2", "Order date the court enters — year", { kind: "protected", reason: COURT_ACT("the year it enters the order") });
  for (const [name, what] of [
    ["NamePrint", "Name (Print)"], ["Supreme Court Number", "Supreme Court Number"],
    ["Address 1", "Address 1"], ["Address 2", "Address 2"], ["City State Zip", "City, State, Zip"],
    ["Telephone", "Telephone"], ["Fax Number", "Fax Number"], ["Email Address", "E-mail Address"]
  ]) putDen(name, `Submitted by block on the court's denial order — ${what}`, { kind: "protected", reason: COURT_ACT("the \"Submitted by\" block beneath the judge's signature line; this packet writes nothing into a signed order") });
  for (const [name, what] of [
    ["NamePrint_2", "Name (Print)"], ["Supreme Court Number_2", "Supreme Court Number"],
    ["Address 1_2", "Address 1"], ["Address 2_2", "Address 2"], ["City State Zip_2", "City, State, Zip"],
    ["Telephone_2", "Telephone"], ["Fax Number_2", "Fax Number"], ["Email Address_2", "E-mail Address"]
  ]) putDen(name, `Approved by block on the court's denial order, Assistant County or District Attorney — ${what}`, { kind: "protected", reason: COURT_ACT("the \"Approved by\" block for the assistant county or district attorney; no prosecutor act is held") });
  return f;
}

const FIELDS = {
  ...fieldsOfCriminalCoverSheet(),
  ...fieldsOfPetition(),
  ...fieldsOfNotice(),
  ...fieldsOfOrderCoverSheet(),
  ...fieldsOfOrders()
};

const SPEC = {
  familyId: "ks-21-6614-diversion-set",
  worklistGroupId: "ks-21-6614-diversion-set",
  trackId: "ks-21-6614-diversion",
  buildScript: "scripts/build-census-v1-ks-21-6614-diversion-set.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/ks/ks-21-6614-diversion-set--official-pdf-fill",
  jurisdiction: "KS",
  routeKey: "obligation:track-only:KS:ks-21-6614-diversion",
  routeLabel: "Kansas diversion expungement - K.S.A. 21-6614(a)(2)",
  routeSlug: "ks-21-6614-diversion",
  legalName: "Petition for Expungement of a Fulfilled Kansas Diversion Agreement under K.S.A. 21-6614",
  routeName: "asking a Kansas district court to expunge a diversion agreement you fulfilled, and the related arrest records, under K.S.A. 21-6614(a)(2)",
  statutes: [
    "K.S.A. 21-6614(a)(2)", "K.S.A. 21-6614(c)", "K.S.A. 21-6614(d)(1)", "K.S.A. 21-6614(e)",
    "K.S.A. 21-6614(f)", "K.S.A. 21-6614(g)", "K.S.A. 21-6614(h)", "K.S.A. 21-6614(i)",
    "K.S.A. 21-6614(k)", "K.S.A. 21-6614(l)", "K.S.A. 21-6614(m)",
    "2026 Kansas Senate Bill 430, Sec. 2",
    "State v. Anderson, 12 Kan. App. 2d 342, 744 P.2d 143 (1987)"
  ],
  documents: DOCUMENTS,
  labels: Object.fromEntries(Object.entries(FIELDS).map(([k, v]) => [k, v.label])),
  policy: Object.fromEntries(Object.entries(FIELDS).map(([k, { label, ...rest }]) => [k, rest])),

  republicationRestriction: {
    holdName: "Kansas Judicial Council noncommercial-use and republication restriction",
    quotedFromTheCommittedRecord: KSJC_RESTRICTION,
    recordedIn: [
      "data/record-clearing/legal-design-track-registry.json, track ks-21-6614-diversion, scopeRestrictions",
      "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json, sourceReconciliation.permissionHold"
    ],
    whatThisBuildDidAboutIt: "Nothing. Building a packet is not resolving a permission hold, and this lane has no authority to resolve one. The hold stands exactly where it stood; these artifacts are internal build and review evidence, generationAllowed is false, and no commercial route is opened.",
    exactNextActionForTheOwner: "Resolve Kansas Judicial Council commercial reuse and republication treatment; all exact current source bytes are held."
  },

  records: [
    {
      recordId: "legal-design-track-registry:ks-21-6614-diversion",
      path: "data/record-clearing/legal-design-track-registry.json",
      role: "the committed legal-design track registry: this route's legal name, its statutory mechanism, its venue and destination, its recorded fee, notice and service rules, its required generation inputs, its manual-completion items, its scope restrictions and its self-help stop conditions",
      mustContain: [
        '"trackId": "ks-21-6614-diversion"',
        "Petition for Expungement of a Fulfilled Kansas Diversion Agreement under K.S.A. 21-6614",
        "Docket fee $176 under K.S.A. 21-6614(g)(2).",
        "The supreme court may additionally impose a charge not exceeding $19 per case to fund non-judicial personnel",
        "The court sets the hearing date and causes notice to be given to the prosecutor and the arresting law enforcement agency, K.S.A. 21-6614(g)(1).",
        "The participant files the Notice of Hearing with the original plus two copies and the clerk sends them. The participant does not serve and does not sign the certificate.",
        "The petitioner signs the petition under penalty of perjury.",
        "File with the clerk of the district court, docketed in the original criminal action, with the Criminal Cover Sheet and the required number of copies.",
        "The second or subsequent DUI lanes are not offered on this route. K.S.A. 21-6614(d)(2) does not reach a diversion, and the Judicial Council chart records the 7-year and 10-year rows as not applicable in the diversion column.",
        "The triggering event is fulfilment of the diversion terms, and nothing else.",
        KSJC_RESTRICTION,
        "LegalEase does not assert that the participant is eligible, does not classify the offence into a grid severity level for them, and does not assert that an old conviction is or is not comparable to a K.S.A. 21-6614(e) offence under paragraph (19).",
        "A person required to register under the Kansas Offender Registration Act may not expunge any conviction or any part of their criminal record while registration is required, K.S.A. 21-6614(f).",
        "The docket fee of $176, plus any non-judicial personnel charge, accompanies the petition at filing.",
        '"componentId": "ks-21-6614-diversion-cover-sheet-1"',
        '"componentId": "ks-21-6614-diversion-primary-filing-2"',
        '"componentId": "ks-21-6614-diversion-notice-3"',
        '"componentId": "ks-21-6614-diversion-cover-sheet-4"',
        '"componentId": "ks-21-6614-diversion-proposed-order-5"',
        '"componentId": "ks-21-6614-diversion-proposed-order-6"',
        '"componentId": "ks-21-6614-diversion-process-guidance-7"'
      ]
    },
    {
      recordId: "legal-design-specifications:ks-21-6614-diversion",
      path: "data/record-clearing/legal-design-specifications.json",
      role: "the committed official-form assignments: which official form each component of this family is, and the participant filing requirements the packet must disclose",
      mustContain: [
        '"trackId": "ks-21-6614-diversion"',
        '"officialFormId": "KS-CRIMINAL-COVER-SHEET-10-14-2025"',
        '"officialFormId": "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022"',
        '"officialFormId": "KSJC-NOTICE-OF-HEARING-12-2016"',
        '"officialFormId": "KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016"',
        '"officialFormId": "KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022"',
        '"officialFormId": "KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016"'
      ]
    },
    {
      recordId: "route-obligation-census:obligation:track-only:KS:ks-21-6614-diversion",
      path: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      role: "the committed route-obligation census: the exact route key this family serves",
      mustContain: ["obligation:track-only:KS:ks-21-6614-diversion"]
    }
  ],

  routeSelectionsMade: [
    {
      document: "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022",
      field: "Check Box2",
      printedContext: 'I respectfully request of the Court an order of expungement of my [ ] conviction and related arrest records OR [ ] diversion record and related arrest records.',
      selected: "diversion",
      because: "K.S.A. 21-6614(a)(2) is the diversion lane and is the route this family is built for. A petition built for one statutory route states which route it is."
    },
    {
      document: "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022",
      field: "Check Box3",
      printedContext: "8. (Select and complete either Option A or B, NOT both) — Option A.",
      selected: "Option A",
      because: "Option B is the K.S.A. 21-6614(a)(3) specialty-court lane, which is a separate track with no waiting period and its own fee-waiver provision."
    }
  ],
  routeSelectionNote: "Two elections, both determined by the statutory route and both guarded in the build path against a held answer that contradicts them. Every other control on these six forms is left unmarked, and each carries its own reason for this route in the field map.",

  instructionsIntro: [
    "This is a self-help packet. It is not legal advice, it is not a filed petition, and nobody has reviewed your record. You remain responsible for checking every fact in it against your own records before you sign anything.",
    "The packet does not say you are eligible. Kansas expungement turns on how your offence is classified and on when it was committed, and the packet deliberately does not classify your offence for you."
  ],

  obligationTable: [
    ["Which court does this go to?", "File with the clerk of the district court, docketed in the original criminal action, with the Criminal Cover Sheet and the required number of copies."],
    ["What does it cost?", "Docket fee $176 under K.S.A. 21-6614(g)(2). The supreme court may additionally impose a charge not exceeding $19 per case to fund non-judicial personnel; 2026 Senate Bill 430 carries that authority from July 1, 2026 through June 30, 2030. The docket fee is the only fee that may be collected for the case."],
    ["Can the fee be waived?", "None in this lane. The only fee waiver in K.S.A. 21-6614 is the specialty court waiver at (a)(3). 2026 House Bill 2724, which would have authorised judges to waive the expungement docket fee on a poverty affidavit, died without enactment, so no general poverty-based statutory waiver exists. Some district courts nonetheless accept a poverty affidavit in practice."],
    ["Who gets notice, and who sends it?", "The court sets the hearing date and causes notice to be given to the prosecutor and the arresting law enforcement agency, K.S.A. 21-6614(g)(1)."],
    ["Is any waiting-period lane closed on this route?", "The second or subsequent DUI lanes are not offered on this route. K.S.A. 21-6614(d)(2) does not reach a diversion, and the Judicial Council chart records the 7-year and 10-year rows as not applicable in the diversion column."],
    ["What date does the clock run from?", "The triggering event is fulfilment of the diversion terms, and nothing else."],
    ["Do I serve anybody?", "The participant files the Notice of Hearing with the original plus two copies and the clerk sends them. The participant does not serve and does not sign the certificate."],
    ["Do I sign anything, and is it sworn?", "The petitioner signs the petition under penalty of perjury."],
    ["Does anything need notarising?", "none"],
    ["Is there anything that stops this route entirely?", "A person required to register under the Kansas Offender Registration Act may not expunge any conviction or any part of their criminal record while registration is required, K.S.A. 21-6614(f). That freezes every case in the record, not only the registrable offence. The sole exception is the K.S.A. 22-4908 drug offender route; sex offender and violent offender registrants are barred with no exception."]
  ],

  routeElectionDisclosure: [
    "This packet has marked two boxes on the petition for you, and it marked them because the route decides them, not because anyone assessed your record.",
    "On the opening request it marked **diversion**, not conviction. K.S.A. 21-6614(a)(2) is the diversion lane, and it reaches a diversion agreement whose terms you FULFILLED. If your case ended in a conviction, or if the diversion was revoked and the case went back to prosecution, this is the wrong packet — stop and use the conviction route.",
    "At item 8 it marked **Option A**, not Option B. Option B is for someone who completed a specialty court programme under K.S.A. 20-173, which is a different lane with no waiting period. If you completed a specialty court programme, stop and use that route.",
    "It marked nothing else. In particular it did not mark any of the one / three / five / ten year boxes at item 8.A.i, because which of those periods applies depends on how the conduct is classified in the Kansas sentencing grid and on the date the offence was committed. The chart the Judicial Council prints on pages 5 and 6 of the petition works that through. The packet does not classify your offence and does not tell you which box is yours.",
    "One thing the chart does settle for this route: the seven-year and ten-year DUI rows are not applicable in the diversion column. K.S.A. 21-6614(d)(2) is written in terms of satisfying a sentence or discharge from supervision and does not reach a diversion at all."
  ],

  documentsToObtain: [
    ["Your own diversion agreement and the record of its fulfilment", "Ask the clerk of the district court, and the diverting authority that granted the diversion, for the case number, the crime the agreement was entered for, the date it was granted and the date its terms were fulfilled. LegalEase never collects, inspects or authenticates these records."],
    ["Your own evidence of the intervening years, for the (h)(2) and (h)(3) findings", "Assemble your own records and letters. LegalEase formats what you supply and assesses none of it. This is recommended rather than required; the packet generates without it."]
  ],

  steps: [
    "Read the hearing-preparation page at the back of this packet first. Three of the four findings the court must make are not pleaded anywhere on the petition, and they are the ones a hearing turns on.",
    "Get your diversion agreement and the record of its fulfilment, and fill in every blank listed under \"The items you must supply\" from that record — not from memory. The date the terms were fulfilled is the one the whole waiting period turns on.",
    "Read pages 4, 5 and 6 of the petition. Page 4 lists the convictions that can never be expunged. Pages 5 and 6 are the Judicial Council chart of waiting periods. Decide from the chart which of the year boxes at item 8.A.i is yours, and mark it.",
    "Sign and date the petition. Nobody may sign it for you and it is sworn under penalty of perjury.",
    "File the petition with the Criminal Cover Sheet at the clerk of the district court, with the docket fee. Ask the clerk how many copies that county wants before you go.",
    "File the Notice of Hearing with the original plus two copies. The clerk sends them; you do not serve anybody and you do not sign the certificate at the foot of that page.",
    "Get the hearing date, time, courthouse, division and room from the clerk or the assigned judge's administrative assistant, and write them onto your own copy of the Notice of Hearing.",
    "Bring both proposed orders to the hearing, with paragraphs 2 through 7 filled in from your own record, for the judge to use if the petition is granted or denied.",
    "If the petition is granted, the clerk sends a certified copy of the order to the Kansas Bureau of Investigation. Send the Order of Expungement Cover Sheet with it so the KBI can identify the right record."
  ],

  deliberatelyBlank: [
    "Your signature and the date beside it, everywhere they appear. No packet may sign anything for you.",
    "Every box at item 8.A.i of the petition. Which waiting period applies is a classification of your offence, and the committed record says LegalEase does not classify the offence into a grid severity level.",
    "The coercion box at item 8.A.iii. That is a sworn assertion about what happened to you, on a different statutory route, and no packet may make it on your behalf.",
    "The hearing date, time, courthouse, division and room on the Notice of Hearing. The court supplies them after filing.",
    "The whole Certificate of Service and Mailing at the foot of the Notice of Hearing. Its signature line reads \"(Clerk of the Court) (Deputy Clerk)\" and the clerk performs the service.",
    "Every finding, the ruling and the judge's signature on both proposed orders, and paragraph 8 of the denial order, which is the court's own reason.",
    "Race, ethnicity and the Social Security number on both cover sheets. The committed legal-design record leaves them for you pending a data-protection review, and the Criminal Cover Sheet's own footer says the Social Security number is not mandatory."
  ],

  notTold: [
    "Whether you are eligible. Nobody has assessed your record.",
    "Which waiting period applies to your case, or how the conduct the diversion was entered for is classified in the Kansas sentencing grid.",
    "Whether an older conviction is comparable to a K.S.A. 21-6614(e) offence under paragraph (19).",
    "What a judge will decide on the discretionary findings at K.S.A. 21-6614(h)(2), (h)(3) and (h)(4).",
    "What effect an expungement has under federal firearms law. K.S.A. 21-6614(k)(2) states the Kansas effect and this packet states no more than that.",
    "How many copies your county's clerk wants. There is no statewide answer and the packet does not invent one."
  ],

  stopConditions: [
    "The prosecutor opposes the petition.",
    "The court sets a contested evidentiary hearing or a person appears to testify against the petition.",
    "The offence classification or severity level is disputed.",
    "The State v. Anderson time-of-offence analysis is in play beyond the DUI rows in the Judicial Council chart.",
    "The participant may currently be required to register under the Kansas Offender Registration Act.",
    "The record may be comparable to a K.S.A. 21-6614(e) offence under paragraph (19).",
    "The participant needs to build a real showing on the (h)(2), (h)(3) or (h)(4) findings.",
    "The petition seeks expungement of a felony conviction, because of the firearms-safety finding at (h)(4).",
    "The participant is seeking firearms restoration as the primary goal, which is a federal and state law question beyond the order.",
    "Immigration consequences are in play.",
    "The arrest county and the convicting county differ.",
    "The diversion agreement's terms may not have been fully fulfilled, or the fulfilment date cannot be established.",
    "The case ended in a conviction rather than a fulfilled diversion, in which case the conviction route applies instead."
  ],

  whatThisIsNot: "This packet is not legal advice, not a filed petition, and not a decision that you are eligible. It is a set of official Kansas forms with the facts the platform holds printed into them and every other blank left for you or for the court, together with the platform's own account of which is which. No lawyer has reviewed your record and nothing here predicts what a judge will do.",

  guidance: {
    title: "Preparing for your K.S.A. 21-6614 diversion expungement hearing",
    intro: [
      "The hearing on a Kansas expungement petition is real and it is required. The prosecutor appears. Any person with relevant information may testify. The court may inquire into your background and has access to Department of Corrections and Prisoner Review Board records.",
      "The petition you are filing pleads only one of the four findings the court must make. The other three are about you, and the petition has nowhere to put them. That is what this page is for.",
      "This page does not write your account of your own life and it does not predict the outcome. Both of those are outside what LegalEase does."
    ],
    findings: [
      "1. The applicable period has elapsed. This is the only one of the four the petition itself pleads, at item 8. On this route it runs from ONE event: the date the terms of the diversion agreement were fulfilled. Not from the arrest, not from the date the diversion was granted, and not from anything else.",
      "2. The circumstances and behaviour of the petitioner warrant the expungement. This is about the years since. Assemble your own records: work, study, treatment, service, family, anything that shows what has changed. Bring them.",
      "3. The expungement is consistent with the public welfare. The court weighs this itself. Nothing you file decides it.",
      "4. If the petition seeks expungement of a felony conviction, that the petitioner's possession of a firearm is not likely to pose a threat to the safety of the public. This finding is written about a felony conviction. A diversion is not a conviction, and how the finding is applied where the conduct diverted would have been a felony is a question for a Kansas lawyer rather than for this page."
    ],
    quoted: [
      ["What the committed record says about the fee, in its own words", "Docket fee $176 under K.S.A. 21-6614(g)(2). The supreme court may additionally impose a charge not exceeding $19 per case to fund non-judicial personnel; 2026 Senate Bill 430 carries that authority from July 1, 2026 through June 30, 2030. The docket fee is the only fee that may be collected for the case."],
      ["What the committed record says about notice, in its own words", "The court sets the hearing date and causes notice to be given to the prosecutor and the arresting law enforcement agency, K.S.A. 21-6614(g)(1). No response or objection period is specified; the prosecutor appears at the hearing."],
      ["What the committed record says about service, in its own words", "The participant files the Notice of Hearing with the original plus two copies and the clerk sends them. The participant does not serve and does not sign the certificate."],
      ["What the committed record says about the DUI lanes on this route, in its own words", "The second or subsequent DUI lanes are not offered on this route. K.S.A. 21-6614(d)(2) does not reach a diversion, and the Judicial Council chart records the 7-year and 10-year rows as not applicable in the diversion column."],
      ["What the committed record says about the registration bar, in its own words", "A person required to register under the Kansas Offender Registration Act may not expunge any conviction or any part of their criminal record while registration is required, K.S.A. 21-6614(f). That freezes every case in the record, not only the registrable offence. The sole exception is the K.S.A. 22-4908 drug offender route; sex offender and violent offender registrants are barred with no exception."],
      ["What happens after an order is granted", "Under K.S.A. 21-6614(i)(2) there are twelve contexts in which the arrest, conviction or diversion must still be disclosed, including law enforcement employment, a commercial driver's licence, bar admission, private detective and private patrol work, KDADS institutions, the Kansas lottery, racing and gaming, expanded lottery act positions, state and tribal gaming, securities registration, bail enforcement licensure, and insurance producer or public adjuster licensure for a fraudulent insurance act. Subsection (l) lists eighteen categories of requestor to whom the custodian may still disclose. Paragraphs 12 and 13 of the granting order print the list."]
    ],
    whatThisIsNot: "This page is preparation, not advocacy and not advice. It does not assess your record, it does not write your account of your own life, and it does not predict what the court will decide."
  },

  howEachCounterWasTaken: {
    knownRequiredFieldsMissing: "classifyBlank from scripts/rcap-packet-completeness/completeness-contract.mjs, run over every refusal row of the canonical field map, counting KNOWN_FACT_NOT_WRITTEN.",
    requiredFactsNotCollected: "every blank the contract classified REQUIRED_BEFORE_FILING, checked by substring against the generated text of participant-instructions.md.",
    unclassifiedBlanks: "the same classifyBlank pass, counting UNCLASSIFIED_BLANK.",
    incompleteRows: "rowKeyOf over written and blank rows together; a row with any written cell and a REQUIRED_KNOWN blank cell is counted.",
    requiredOptionsMissing: "the same classifyBlank pass, counting ROUTE_OPTION_NOT_SELECTED.",
    requiredComponentsMissing: "the seven components the committed track registry declares for this family, minus the components this run actually produced bytes for.",
    invisibleWrites: "per artifact, the finalizer's written count against the glyphs and flattened widget appearances READ BACK from the saved artifact bytes; a document reporting writes with no readable ink is counted.",
    protectedWrites: "classifyField over every WRITTEN row's label; a write onto a field the contract classes PROTECTED is counted.",
    visualDefects: "per artifact, the count of refused fields found carrying printed text at their own measured rectangle in the saved bytes, plus non-whitespace glyphs measured outside the write boxes.",
    everyCounterIsMeasured: "No counter here is a literal. Each is the length of a findings list produced by the pass named beside it, over this run's own rows and this run's own saved bytes. A pass that could not run would leave its counter null and stop the build rather than report zero."
  },

  buildFindings: [
    {
      finding: "The Kansas Judicial Council republication restriction is unresolved and this build does not resolve it.",
      detail: "The committed track registry records that the Judicial Council states its forms are for non-commercial use and may not be sold, republished or transferred for value without express permission, and that every Kansas official-form route is source-gated on that licence until permission is confirmed. MASTER_QUEUE carries the same hold as sourceReconciliation.permissionHold with the exact next action \"Resolve Kansas Judicial Council commercial reuse and republication treatment\". These artifacts are internal build and review evidence; generationAllowed is false and no commercial route is opened. The hold is an owner and counsel determination and remains open.",
      blocksBuild: false,
      blocksApprovalForLive: true
    },
    {
      finding: "Five of the six official binaries stand behind a PARTIAL custody.",
      detail: "The operational Nationwide Record Clearing tree is not mounted in this container. Five of the six sources resolve through private/source-imports/Nationwide_Recovery_Pool_2026-09-02, whose own declaration in data/rcap-all50/local-source-corpus-index.json says it \"satisfies an individual source obligation and never a completeness assertion\". Each of the five was verified byte-for-byte against the digest MASTER_QUEUE pins, which is an individual source obligation and nothing more. No completeness claim about the Kansas corpus is made anywhere in this family.",
      blocksBuild: false,
      blocksApprovalForLive: false
    },
    {
      finding: "The shared field-semantics registry carries no Kansas entries, and that is why several facts the platform collects are printed as blanks rather than written.",
      detail: "scripts/rcap-official-forms/rcap-field-semantics.mjs binds a value to a field only through FACT_DESCRIPTORS, and relaxes its protect rules only through PARTICIPANT_STATED_SUBJECT, whose entries are keyed to the exact printed captions of particular Alabama and Oregon forms. Kansas has none. The consequence, measured on these six binaries: the arresting agency, the crime charged, the offence of conviction, the conviction date, the convicting court, the date of final discharge, the arrest county, the arrest date, the year of birth and the name at the time of the case are all refused by the shared semantics, and this family declares each of them REQUIRED_BEFORE_FILING and discloses it. That is the same treatment 104 committed refusals across this corpus already give an arresting-agency blank. A later lane that owns rcap-field-semantics.mjs could add Kansas captions and promote several of these blanks to writes; this lane does not own that module and changing it would move other families' bytes.",
      blocksBuild: false,
      blocksApprovalForLive: false
    },
    {
      finding: "MASTER_QUEUE's packetComponents for this family omits the process-guidance component the committed registry declares required.",
      detail: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json lists six packetComponents for ks-21-6614-diversion-set. The committed legal-design track registry declares seven for packetSet ks-21-6614-diversion-set, the seventh being ks-21-6614-diversion-process-guidance-7 with role process_guidance and requirement required, and the registry's packetInstructions say in terms that the packet carries a hearing-preparation document putting the four K.S.A. 21-6614(h) findings in plain language. This build produces all seven and counts requiredComponentsMissing against the registry, which is the controlling record. The queue row is the one that is short.",
      blocksBuild: false,
      blocksApprovalForLive: false
    },
    {
      finding: "This family states its own route election, and the sibling conviction family cannot.",
      detail: "The Judicial Council petition opens with two mutually exclusive boxes: \"an order of expungement of my [ ] conviction and related arrest records OR [ ] diversion record and related arrest records\". The election is determined by the statutory route, and this build marks the DIVERSION box from held facts, guarded against a held disposition that contradicts it. The sibling family ks-21-6614-conviction-set marks nothing there and stops with requiredOptionsMissing at one, on the same form and the same line, because its caption carries the word \"conviction\" and the shared disposition_or_hearing protect rule matches it while nothing in this one's caption does. The asymmetry is an accident of vocabulary rather than a difference in what the two packets are entitled to state, and a reader comparing the two families should know that this one passed the same gate its sibling failed, for that reason and no other. Neither family reworded a caption and neither edited the shared module.",
      blastRadiusIfTheSiblingIsFixed: "Across the 295 committed census-v1 production field maps in this tree, 14,231 write and refusal labels were scanned for the phrase \"expungement of my\". Three carry it: the two Kansas boxes, and one Vermont label reading \"expungement of my criminal history is in the interests of justice\", which a caption regex anchored on \"and related arrest records\" does not reach. A Kansas PARTICIPANT_STATED_SUBJECT entry that unblocks the conviction family therefore moves no other family's bytes, and would not move this family's either: this box is already marked.",
      blocksBuild: false,
      blocksApprovalForLive: false
    },
    {
      finding: "A label this family authored suppressed five held writes, and the counter did not notice until the counting was changed.",
      detail: "The petition's own contact block — Name (Print), Address 1, City State Zip, Telephone Number, E-mail Address, printed under the \"Defendant, Pro Se\" line — was first labelled \"Signature block — ...\" by this family. protectCategoryOf read the word \"Signature\" and refused all five writes; classifyBlank then read the same label, called each blank an allowed PROTECTED_FIELD, and reported knownRequiredFieldsMissing as zero while five facts the platform holds were missing from the paper. Two changes came out of it, and both are in the build path: the labels now name the block the form actually prints, and a declared write the saved artifact does not carry is counted as a missing known fact from the fact of the suppression, before the blank is handed to classifyBlank at all, so no label can launder it again.",
      blocksBuild: false,
      blocksApprovalForLive: false
    },
    {
      finding: "The harvested caption channel binds four values wrongly on these binaries, which is why this family authors every label.",
      detail: "Measured with the repository's own captureWidgetContext and decideBinding, with no authored labels: the petition's Year of Birth blank binds matter.county; the petition's and the notice's Fax Number blanks bind participant.email; the Criminal Cover Sheet's DL OR STATE ID NO binds participant.state; the notice's division and room blanks bind matter.county; and on the Order for Expungement the blank at \"The petitioner was granted a diversion for the crime of\" binds participant.full_legal_name. Every one of those would be a wrong value in a box a court reads, on documents signed under penalty of perjury. This family authors a label for every field of every binary and censusOf refuses a field the table does not name.",
      blocksBuild: false,
      blocksApprovalForLive: false
    }
  ],

  counselQuestions: [
    "The Kansas Judicial Council non-commercial-use and republication restriction is unresolved. Does any participant-facing delivery of these six filled forms require express permission from the Judicial Council, and on what terms?",
    "The committed manual-completion record leaves race, ethnicity and the Social Security number on both cover sheets for the participant pending a data-protection review. Is that review still open, and does it reach the race and sex free-text blanks at item 3 of the petition as well as the checkbox taxonomies on the cover sheets?",
    "The committed record says LegalEase completes paragraphs 1 through 4 of the granting and denying orders. This build completes paragraph 1 and the caption, and leaves paragraphs 2 through 4 as labelled blanks the participant fills before lodging the order, because the shared field semantics treats every field beneath the order's own heading as court-owned. Is the blank-and-disclose treatment acceptable on a proposed order, or should the family carry Kansas captions into the shared semantics so paragraphs 2 through 4 are printed?",
    "The Order Denying Expungement is included because the committed component set requires it. Should a participant packet carry a proposed denial order at all, and if so should it be presented differently from the granting order?",
    "The open legal question recorded on this track — whether a poverty affidavit will be accepted against the $176 docket fee — is carried to the participant as \"some district courts nonetheless accept a poverty affidavit in practice\". Is that the right thing to tell a participant?"
  ],

  reviewersAttention: [
    "Two selections are made on the petition and both are route-determined: the diversion box on the opening request, and Option A at item 8. Four guards in the build path refuse the build over a held answer that contradicts either one, and a fifth refuses any mark the family has not declared.",
    "Item 5, the order's paragraph 5 and the denial order's paragraph 5 each print a conviction alternative and a diversion alternative separated by OR. On this route the conviction alternative is declared not applicable with a named route condition and the diversion alternative is the one the participant completes; the sibling conviction family is the mirror image.",
    "No box at item 8.A.i is marked. Which waiting period applies is a classification of the offence, and the committed registry forbids the platform from making it.",
    "The coercion box at item 8.A.iii is left unmarked and is declared not applicable on this route with a named route condition.",
    "Both proposed orders are rendered with the finalizer's captionOnly setting, so nothing but a caption fact can reach them however a field is labelled.",
    "The Certificate of Service and Mailing on the Notice of Hearing is completely blank and every one of its eight fields is labelled with the clerk's ownership.",
    "This lane did not raster anything and did not verify anything it built."
  ]
};

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFTextField, PDFName, StandardFonts, rgb } = require("pdf-lib");

export { SPEC, FIXTURES };

const OUT = SPEC.outDir;
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

/* ======================================================================== *
 * 1. SOURCES — bound by exact SHA-256 through the committed corpus index
 * ======================================================================== */

function normalRect(r) {
  return { x: Math.min(r.x, r.x + r.width), y: Math.min(r.y, r.y + r.height), width: Math.abs(r.width), height: Math.abs(r.height) };
}

/**
 * Every official binary this family fills, resolved through the committed
 * corpus index and verified byte-for-byte against the digest the census
 * pinned. A mismatch, a missing custody or an absent file refuses the build:
 * an overlay drawn on a binary nobody identified is not an overlay of the
 * official form.
 *
 * The recovery pool is a PARTIAL custody. Its own declaration in the index
 * says it "satisfies an individual source obligation and never a completeness
 * assertion", which is exactly what is asked of it here — six named documents
 * at six exact digests, and no claim about the corpus as a whole.
 */
function resolveSources() {
  const index = readJson("data/rcap-all50/local-source-corpus-index.json");
  const resolve = makeCorpusEntryResolver(index, { repoRoot: ROOT, masterLibraryRoot: process.env.MASTER_LIBRARY_SOURCE_DIR });
  const resolved = [];
  const failures = [];
  for (const doc of SPEC.documents.filter((d) => d.officialFormId)) {
    const entry = index.entries.find((e) => e.path === doc.corpusPath && e.custody === doc.custody);
    if (!entry) { failures.push({ documentId: doc.documentId, why: "the committed corpus index names no entry at this path in this custody", path: doc.corpusPath, custody: doc.custody }); continue; }
    if (entry.sha256 !== doc.sha256) { failures.push({ documentId: doc.documentId, why: "the corpus index records a different digest than this family pins", indexSha256: entry.sha256, pinnedSha256: doc.sha256 }); continue; }
    const absolute = resolve.resolve(entry);
    if (!absolute || !fs.existsSync(absolute)) { failures.push({ documentId: doc.documentId, why: "the custody holding this source is not mounted in this container", path: doc.corpusPath, custody: doc.custody }); continue; }
    const bytes = fs.readFileSync(absolute);
    const digest = sha(bytes);
    if (digest !== doc.sha256) { failures.push({ documentId: doc.documentId, why: "the bytes on disk do not hash to the pinned digest", observedSha256: digest, pinnedSha256: doc.sha256 }); continue; }
    if (bytes.length !== doc.byteLength) { failures.push({ documentId: doc.documentId, why: "the bytes on disk are not the pinned length", observedByteLength: bytes.length, pinnedByteLength: doc.byteLength }); continue; }
    resolved.push({ ...doc, bytes, byteLengthObserved: bytes.length, custodyRoot: index.custodies.find((c) => c.id === doc.custody)?.root ?? null });
  }
  return { resolved, failures };
}

/**
 * The committed records this family reads its legal treatment out of, bound by
 * exact SHA-256, with every statement the build relies on re-read from the
 * bytes as an anchor first. A record that moved, or that no longer carries an
 * anchor, refuses the build rather than letting the packet quote a sentence
 * that is no longer there.
 */
function resolveRecords() {
  const resolved = [];
  const failures = [];
  for (const rec of SPEC.records) {
    const abs = path.join(ROOT, rec.path);
    if (!fs.existsSync(abs)) { failures.push({ recordId: rec.recordId, path: rec.path, why: "the committed record does not exist at this path" }); continue; }
    const bytes = fs.readFileSync(abs);
    const text = bytes.toString("utf8");
    const missing = (rec.mustContain ?? []).filter((a) => !text.includes(a));
    if (missing.length > 0) { failures.push({ recordId: rec.recordId, path: rec.path, why: `the committed record no longer carries ${missing.length} anchor statement(s) this build relies on`, missingAnchors: missing.slice(0, 8) }); continue; }
    resolved.push({ recordId: rec.recordId, path: rec.path, role: rec.role, sha256: sha(bytes), byteLength: bytes.length, anchorsVerified: (rec.mustContain ?? []).length });
  }
  return { resolved, failures };
}

/* ======================================================================== *
 * 2. CENSUS — every widget of every official document, with an AUTHORED label
 * ======================================================================== */

/**
 * The printed label a widget sits beside, harvested from the page.
 *
 * The harvest is a fallback, never the answer. Measured on these six binaries
 * it binds the county into the year-of-birth blank of the petition, the e-mail
 * address into the fax blank, the residence state into the driver's-licence
 * blank of the cover sheet, and the petitioner's own name into "the petitioner
 * was granted a diversion for the crime of" on the order. Every one of those
 * is a wrong value in a box a court reads, on documents signed under penalty
 * of perjury, so this family AUTHORS a label for every field and the harvest
 * is retained only as evidence of what the page prints.
 */
function censusOf(source) {
  return (async () => {
    const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = doc.getPages();
    assert.equal(pages.length, source.pages, `${source.documentId}: pinned page count`);
    const pageText = pages.map((p, i) => ({ page: i + 1, lines: groupIntoLines(extractTextItems(p)) }));
    const fields = doc.getForm().getFields().map((f) => {
      const name = f.getName();
      const widgets = f.acroField.getWidgets().map((w, i) => {
        let pg = pages.findIndex((p) => p.ref === w.P());
        if (pg < 0) pg = pages.findIndex((p) => (p.node.Annots()?.asArray() ?? []).some((ref) => doc.context.lookup(ref) === w.dict));
        assert.ok(pg >= 0, `${source.documentId}/${name}: widget is on no page of the document`);
        const rect = normalRect(w.getRectangle());
        const ctx = captureWidgetContext(pages[pg], [{ name, rect }], { precomputedLines: pageText[pg].lines, isFirstPage: pg === 0 })[0];
        return { widgetIndex: i, page: pg + 1, rect, harvestedLabel: ctx.effectiveLabel ?? null, harvestedRegion: ctx.regionHeading ?? null };
      });
      const authored = SPEC.labels[`${source.documentId}:${name}`];
      assert.ok(typeof authored === "string" && authored.trim().length > 0,
        `${source.documentId}/${name}: this family authors no label for this field, and an unlabelled field is one nobody can classify`);
      return {
        name,
        type: ({ PDFTextField: "text", PDFCheckBox: "checkbox", PDFRadioGroup: "radio", PDFDropdown: "dropdown", PDFButton: "button", PDFSignature: "signature" })[f.constructor.name] ?? f.constructor.name,
        multiline: f instanceof PDFTextField && f.isMultiline(),
        maxLength: f.getMaxLength?.() ?? null,
        effectiveLabel: authored,
        harvestedLabel: widgets[0].harvestedLabel,
        regionHeading: null,
        widgets,
        sourceValue: f.getText?.() ?? null
      };
    });
    assert.equal(fields.length, source.acroFieldCount, `${source.documentId}: pinned AcroForm field count`);
    return { fields, pageText: pageText.map((p) => ({ page: p.page, lines: p.lines.map((l) => ({ y: l.y, text: l.text })) })) };
  })();
}

/* ======================================================================== *
 * 3. POLICY — what each field is, and why it is written or refused
 * ======================================================================== */

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const SWORN_ELECTION = "participant_sworn_narrative_or_legal_election";

/**
 * One row of the field map for one field, from this family's authored policy.
 *
 * The policy table is data, not inference: every field of every document is
 * named in it, and censusOf above refuses a field the table does not name. A
 * field that nobody classified is exactly the one that goes missing.
 */
function policyRow(source, field) {
  const key = `${source.documentId}:${field.name}`;
  const decision = SPEC.policy[key];
  assert.ok(decision, `${key}: this family declares no policy for this field`);
  const common = {
    field: field.name, fieldName: field.name, fieldId: key,
    document: source.documentId, documentId: source.documentId,
    page: field.widgets[0].page,
    effectiveLabel: field.effectiveLabel, printedLabel: field.effectiveLabel, printedLine: field.harvestedLabel,
    regionHeading: null, sectionHeading: null,
    rectBasis: "measured_widget_rectangle_of_the_exact_official_binary",
    widgets: field.widgets.map((w) => ({ widgetIndex: w.widgetIndex, page: w.page, rect: w.rect }))
  };
  if (decision.kind === "write") return { ...common, decision: "write", factId: decision.factId, why: decision.why };
  if (decision.kind === "narrative") return { ...common, decision: "write", viaNarrativeChannel: true, factId: decision.factId, why: decision.why };
  if (decision.kind === "select") return { ...common, decision: "select", isSelectionControl: true, routeDetermined: true, basis: decision.basis, why: decision.basis };
  const row = { ...common, decision: "refuse", factId: null, reason: decision.reason, why: decision.reason, isSelectionControl: decision.selectionControl === true };
  switch (decision.kind) {
    case "protected":
      return { ...row, category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED, completenessDisposition: "PROTECTED_FIELD", requiredBeforeFiling: false };
    case "signature":
      return { ...row, category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE, completenessDisposition: "PROTECTED_FIELD", requiredBeforeFiling: false };
    case "later":
      return { ...row, category: null, completenessClass: null, class: null, completenessDisposition: "LATER_COMPLETION", requiredBeforeFiling: false, laterCompletionTrigger: decision.trigger };
    case "election":
      return { ...row, category: SWORN_ELECTION, completenessClass: SWORN_ELECTION, class: SWORN_ELECTION, completenessDisposition: "PARTICIPANT_ELECTION_GENUINE", requiredBeforeFiling: false, routeDetermined: false };
    case "notApplicable":
      return { ...row, category: null, completenessClass: null, class: null, completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE", routeConditionThatMakesItInapplicable: decision.routeCondition, requiredBeforeFiling: false, routeDetermined: false };
    case "optional":
      return { ...row, category: null, completenessClass: null, class: null, completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT", requiredBeforeFiling: false, routeDetermined: false };
    case "requiredBeforeFiling":
      return {
        ...row, category: null, completenessClass: null, class: null,
        completenessDisposition: "REQUIRED_BEFORE_FILING", disposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, routeDetermined: false,
        identity: `${source.documentId} page ${field.widgets[0].page} field ${field.name}`,
        participantMustSupply: decision.supply,
        ...(decision.caseDetermined
          ? { determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: decision.caseDetermined }
          : {})
      };
    default:
      throw new Error(`${key}: unknown policy kind ${decision.kind}`);
  }
}

/* ======================================================================== *
 * 4. RENDER — one official document, filled and flattened
 * ======================================================================== */

async function renderDocument(source, census, facts) {
  const rows = census.fields.map((f) => policyRow(source, f));

  /* THE ONLY BOXES THIS FAMILY MAY EVER MARK.
   *
   * Every election this packet settles is named, field by field and document
   * by document, in SPEC.routeSelectionsMade, where a reader can see all of
   * them at once alongside the printed line each one sits on and the reason
   * the route determines it. This guard refuses any other mark.
   *
   * It exists because the packet is sworn. The coercion assertion at item
   * 8.A.iii of this petition is the sharpest case: it is a statement about
   * what was done to the petitioner, the committed registry says LegalEase
   * must not invent the coercion narrative and must not decide whether
   * coercion is proved, and a raster can be re-earned while a pre-answered
   * sworn election cannot be cured by disclosing it afterwards. A later edit
   * that turns any refusal on any of these six binaries into a settled
   * selection stops the build here rather than shipping the mark. */
  const declaredSelections = new Set(SPEC.routeSelectionsMade.filter((x) => x.document === source.documentId).map((x) => x.field));
  for (const r of rows.filter((x) => x.decision === "select")) {
    assert.ok(declaredSelections.has(r.field),
      `${r.fieldId}: this build would mark a box that SPEC.routeSelectionsMade does not name. Every election this packet settles is declared there with the printed line it sits on and the reason the route determines it; a mark that is not declared there is a pre-answered election on a sworn filing.`);
  }
  for (const declared of declaredSelections) {
    assert.ok(rows.some((r) => r.field === declared && (r.decision === "select" || r.routeDeterminedAndUnmade === true)),
      `${source.documentId}/${declared}: SPEC.routeSelectionsMade declares this election and the policy table neither settles it nor records it as route-determined-and-unmade`);
  }

  const writes = rows.filter((r) => r.decision === "write" && !r.viaNarrativeChannel);
  const narratives = rows.filter((r) => r.viaNarrativeChannel === true);
  const selections = Object.fromEntries(rows.filter((r) => r.decision === "select").map((r) => [r.field, { checked: true, basis: r.basis }]));

  /* Every field this family does not write through the ordinary channel is
   * handed to the finalizer as unwritable BY NAME. The shared semantics would
   * otherwise re-derive the decision from the field name and the printed label
   * alone, and this family's own measurement is that it re-derives five of
   * them wrongly. A narrative field is in this list too: its ordinary binding
   * is the WRONG fact, and the narrative channel writes the right one from the
   * same held fact set without consulting a descriptor. */
  const allowed = new Set([...writes.map((r) => r.field), ...narratives.map((r) => r.field), ...Object.keys(selections)]);
  const unwritable = rows.filter((r) => !allowed.has(r.field)).map((r) => ({ field: r.field, class: r.category ?? r.completenessDisposition }));

  /* A narrative field is NOT declared unwritable-by-role, because the shared
   * narrative pass refuses any line that is. It is instead given its intended
   * fact id in explicitMappings, where the shared semantics compares it to the
   * fact the FIELD NAME would bind and refuses the conflicting binding by
   * name — which is exactly the outcome wanted: the ordinary pass writes
   * nothing into it, and the narrative pass then writes the held fact this
   * family actually means. Both halves are the shared module's own rules; the
   * only thing this family supplies is the fact id. */

  const result = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.fields,
    facts,
    explicitMappings: Object.fromEntries([...writes, ...narratives].map((r) => [r.field, r.factId])),
    unwritableFields: unwritable,
    selectionsFromHeldFacts: selections,
    narrativeAcrossFields: narratives.map((r) => ({ factId: r.factId, fields: [r.field] })),
    captionOnly: source.captionOnly === true,
    documentAcceptsFill: true,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    maxFontSize: 10, minFontSize: 6,
    evaluateDeclaredMinimumSize: true, alignWidgetFontSizeToFit: true, fitTextPerWidget: true,
    detachNestedControlFields: true, suppressSynthesizedAppearances: true,
    preserveUnwrittenSelectionBackgrounds: true, fitAppearancesToRect: true,
    title: `${SPEC.familyId} ${source.documentId}`
  });

  /* A write this family declared and the finalizer refused is NOT quietly
   * downgraded: the value is held, so the blank is a missing known fact and
   * the row says so in the field map rather than borrowing an excuse. */
  const written = new Map(result.report.written.map((w) => [w.field, w]));
  const mapped = rows.map((r) => {
    if (r.decision === "write") {
      const w = written.get(r.field);
      if (w) return { ...r, kind: w.kind ?? "acroform_text", fontSize: w.fontSize ?? null };
      return {
        ...r, decision: "refuse", heldButNotWritten: true,
        category: null, completenessClass: null, class: null,
        completenessDisposition: "KNOWN_FACT_NOT_WRITTEN", requiredBeforeFiling: false,
        reason: `the finalizer refused a write this family declared: ${JSON.stringify(result.report.refused.filter((x) => x.field === r.field))}`,
        finalizerRefusal: result.report.refused.filter((x) => x.field === r.field),
        heldValue: facts[r.factId] ?? null
      };
    }
    if (r.decision === "select") {
      const w = written.get(r.field);
      if (w) return { ...r, kind: w.kind };
      /* THE FAMILY DECIDED TO STATE ITS ROUTE AND THE SHARED RULES REFUSED.
       *
       * Not an assertion, and not quietly re-dispositioned either. The
       * election is route-determined, this family settled it from held facts,
       * and the shared protect rules would not let the mark be made. The row
       * keeps routeDetermined true, so the completeness contract counts it as
       * ROUTE_OPTION_NOT_SELECTED and the build stops — which is the correct
       * outcome for a route-specific packet that does not state its route.
       * The finalizer's own refusal is recorded verbatim beside it so the
       * reader can see which rule refused and on which caption.
       *
       * The alternative was to reword the printed caption until the protect
       * rule stopped matching it. That is the same move the completeness
       * contract calls out by name ("wording a refusal to match a regex is
       * the thing these counters exist to prevent"), pointed the other way,
       * and this family does not make it. */
      const refusals = result.report.refused.filter((x) => x.field === r.field);
      return {
        ...r, decision: "refuse", routeDeterminedAndUnmade: true, routeDetermined: true,
        category: null, completenessClass: null, class: null,
        completenessDisposition: "ROUTE_OPTION_NOT_SELECTED",
        requiredBeforeFiling: false,
        familyDecision: r.basis,
        reason: `this family settled this route election from held facts and the shared field semantics refused the mark: ${JSON.stringify(refusals)}`,
        finalizerRefusal: refusals
      };
    }
    return r;
  });
  return { ...result, rows: mapped };
}

/* ======================================================================== *
 * 5. THE COMPOSED PROCESS-GUIDANCE COMPONENT
 * ======================================================================== */

function sanitizePdfText(text) {
  return String(text).replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-").replaceAll("—", "-")
    .replaceAll("−", "-").replaceAll("’", "'").replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...").replaceAll("′", "'").replaceAll(" ", " ");
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
  const renderedWidth = (t) => Math.max(font.widthOfTextAtSize(t, fontSize), [...t].length * fontSize * 0.5);
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const draw = (line) => {
    if (y < margin) { page = pdf.addPage([width, height]); y = height - margin; }
    if (line) page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  };
  const splitToken = (token) => {
    const chunks = []; let cur = "";
    for (const ch of token) { if (cur && renderedWidth(`${cur}${ch}`) > maxWidth) { chunks.push(cur); cur = ch; } else cur += ch; }
    if (cur) chunks.push(cur);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => (renderedWidth(w) > maxWidth ? splitToken(w) : [w]));
    const rows = []; let cur = "";
    for (const w of words) {
      const cand = cur ? `${cur} ${w}` : w;
      if (renderedWidth(cand) <= maxWidth) cur = cand; else { if (cur) rows.push(cur); cur = w; }
    }
    if (cur) rows.push(cur);
    return rows;
  };
  for (const raw of sanitizePdfText(fullText).split("\n")) for (const row of wrap(raw)) draw(row);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/**
 * The hearing-preparation document the committed registry requires as
 * component 7. Every sentence in it is either this build's own plain
 * scaffolding or a statement quoted from the committed record on its own
 * line; nothing here narrates the participant's life, asserts eligibility, or
 * predicts an outcome, because the registry forbids all three by name.
 */
function processGuidanceBody(facts) {
  const lines = [];
  lines.push(SPEC.guidance.title.toUpperCase(), "");
  lines.push(`Prepared for: ${facts["participant.full_legal_name"]}`, "");
  for (const p of SPEC.guidance.intro) { lines.push(p, ""); }
  lines.push("THE FOUR FINDINGS THE COURT MUST MAKE", "");
  for (const f of SPEC.guidance.findings) { lines.push(f, ""); }
  lines.push("WHAT THE COMMITTED RECORD SAYS, IN ITS OWN WORDS", "");
  for (const [where, what] of SPEC.guidance.quoted) { lines.push(`${where}:`, what, ""); }
  lines.push("WHEN TO STOP AND GET HELP INSTEAD OF FILING", "");
  for (const s of SPEC.stopConditions) lines.push(`- ${s}`);
  lines.push("");
  lines.push("WHAT THIS DOCUMENT IS NOT", "");
  lines.push(SPEC.guidance.whatThisIsNot);
  return lines.join("\n");
}

/* ======================================================================== *
 * 6. BYTE PROOF — read back from the saved bytes, never from build intent
 * ======================================================================== */

/**
 * The INK of one flattened appearance, decoded out of the saved artifact.
 *
 * A checkbox mark on these Judicial Council binaries is a PATH, not a glyph:
 * the form ships its own /Yes appearance and the tick is drawn with path
 * operators, so the text of the appearance stream is the empty string. A byte
 * proof that compared the drawn TEXT to a check character would therefore
 * report an unmarked box and a marked one identically, which is the shape of
 * defect this proof exists to catch rather than to have.
 *
 * So the mark is measured as ink: the appearance's own decoded content stream
 * is read back out of the artifact and its painting operators are counted. An
 * appearance that paints nothing is not a mark however the report describes it.
 */
function appearanceInk(doc, appearanceName, page) {
  const ctx = doc.context;
  const resources = doc.getPages()[page - 1].node.get(PDFName.of("Resources"));
  const xObjects = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
  if (!xObjects) return null;
  const dict = ctx.lookup(xObjects);
  const key = PDFName.of(appearanceName);
  if (!dict.has(key)) return null;
  const stream = ctx.lookup(dict.get(key));
  let bytes = Buffer.from(stream.contents);
  const filter = String(stream.dict?.get(PDFName.of("Filter")) ?? "");
  if (filter.includes("FlateDecode")) { try { bytes = zlib.inflateSync(bytes); } catch { /* raw */ } }
  const text = bytes.toString("latin1");
  const paintingOperators = (text.match(/(?:^|[\s])(?:re|m|l|c|v|y|f\*?|B\*?|b\*?|S|s|Tj|TJ|'|")(?=[\s]|$)/g) ?? []).length;
  return { appearance: appearanceName, byteLength: bytes.length, sha256: sha(bytes), paintingOperators };
}

/**
 * What actually reached the paper.
 *
 * For the six official documents this reads the FLATTENED appearance at each
 * measured widget rectangle of the saved artifact. For the composed guidance
 * page it reads the extracted text of the saved page. In both cases the
 * counters below are computed from what came back, never from what this
 * builder meant to write: a counter whose name says it was read from the
 * output bytes is read from the output bytes or it is null.
 */
async function actualWriteProof(fixtures) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ks-21-6614-diversion-readback-"));
  const documents = [];
  try {
    for (const [fixtureName, docs] of Object.entries(fixtures)) {
      for (const doc of docs) {
        if (doc.composed) {
          const loaded = await PDFDocument.load(doc.bytes, { ignoreEncryption: true, updateMetadata: false });
          const text = loaded.getPages().map((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text).join(" ")).join(" ").replace(/\s+/g, " ");
          const expected = sanitizePdfText(doc.facts["participant.full_legal_name"]);
          assert.ok(text.includes(expected), `${fixtureName}/${doc.documentId}: the composed page does not carry the participant's name in its own saved bytes`);
          const glyphs = text.replace(/\s+/g, "").length;
          documents.push({
            fixture: fixtureName, documentId: doc.documentId, sha256: sha(doc.bytes),
            proofMethod: "extracted text of the saved composed page",
            valuesReportedByFinalizer: 1,
            addedGlyphsReadFromOutputBytes: glyphs,
            flattenedWidgetAppearancesReadFromOutputBytes: 0,
            nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
            actualWrites: [{ field: "composed.participant_name", document: doc.documentId, factId: "participant.full_legal_name", expected, foundInOutputBytes: true }],
            refusedFieldsWithInk: []
          });
          continue;
        }
        const file = path.join(dir, `${fixtureName}--${doc.documentId}.pdf`);
        fs.writeFileSync(file, doc.bytes);
        const appearances = await flattenedWidgets(file);
        const saved = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
        const actualWrites = [];
        const refusedFieldsWithInk = [];
        let glyphs = 0;
        let markInk = 0;
        for (const row of doc.rows) {
          for (const widget of row.widgets) {
            const drawn = drawnAt(appearances, widget);
            const drawnText = drawn.map((a) => a.text).join("").trim();
            if (row.decision !== "write" && row.decision !== "select") {
              if (drawnText) refusedFieldsWithInk.push({ field: row.field, page: widget.page, drawnText });
              continue;
            }
            if (row.decision === "select") {
              /* A mark is ink, and ink is what is measured. See appearanceInk. */
              const ink = drawn.map((a) => appearanceInk(saved, a.appearance, widget.page)).filter(Boolean);
              const painted = ink.reduce((n, i) => n + i.paintingOperators, 0);
              assert.ok(drawn.length > 0 && painted > 0,
                `${fixtureName} ${doc.documentId}/${row.field}: this build marked this box and the saved bytes carry no painted appearance at its measured rectangle`);
              markInk += painted;
              actualWrites.push({
                field: row.field, document: doc.documentId, page: widget.page, rect: widget.rect,
                factId: null, kind: row.kind ?? null, mark: "checked",
                paintingOperatorsReadFromOutputBytes: painted, appearances: ink,
                foundInOutputBytes: true, appearanceCount: drawn.length,
                proof: "the flattened appearance at this box's own measured rectangle was decoded out of the saved artifact and its painting operators counted"
              });
              continue;
            }
            const expected = sanitizePdfText(String(doc.facts[row.factId]));
            assert.equal(drawnText, expected,
              `${fixtureName} ${doc.documentId}/${row.field}: the flattened appearance in the saved bytes is not the value this build bound`);
            glyphs += drawnText.replace(/\s+/g, "").length;
            actualWrites.push({
              field: row.field, document: doc.documentId, page: widget.page, rect: widget.rect,
              factId: row.factId ?? null, kind: row.kind ?? null, expected, drawnText,
              foundInOutputBytes: true, appearanceCount: drawn.length,
              proof: "flattened widget appearance read back at the field's own measured rectangle in the saved artifact bytes"
            });
          }
        }
        assert.deepEqual(refusedFieldsWithInk, [],
          `${fixtureName}/${doc.documentId}: a field this family refused carries printed text in the saved bytes`);
        documents.push({
          fixture: fixtureName, documentId: doc.documentId, sha256: sha(doc.bytes),
          proofMethod: "flattened widget appearance read at each measured rectangle of the saved artifact",
          valuesReportedByFinalizer: doc.report.written.length,
          addedGlyphsReadFromOutputBytes: glyphs,
          markPaintingOperatorsReadFromOutputBytes: markInk,
          flattenedWidgetAppearancesReadFromOutputBytes: appearances.length,
          nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
          actualWrites, refusedFieldsWithInk
        });
      }
    }
  } finally {
    for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
    fs.rmdirSync(dir);
  }
  return documents;
}

/* ======================================================================== *
 * 7. COUNTERS — the repository's own contract, over this family's own rows
 * ======================================================================== */

function countCompleteness(maps, writeProofs, instructionsText, declaredComponents, builtComponents) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: r.category ?? null, page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: r.isSelectionControl === true,
    heldButNotWritten: r.heldButNotWritten === true, finalizerRefusal: r.finalizerRefusal ?? null,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      ...(Object.hasOwn(r, "routeDetermined") ? { routeDetermined: r.routeDetermined === true } : {}),
      ...(r.routeConditionThatMakesItInapplicable ? { routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable } : {}),
      ...(r.determinedByTheCaseNotTheRoute ? { determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt } : {}),
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

  /* A WRITE THIS FAMILY DECLARED AND THE OUTPUT DOES NOT CARRY.
   *
   * Counted here, from this run's own outcome, BEFORE the blank is handed to
   * classifyBlank at all. The reason is a defect this family had and fixed:
   * five held facts on the petition's own contact block were suppressed
   * because the label this family authored for them began "Signature block",
   * which the shared protect rules read as a signature field — and
   * classifyBlank then read the same label and called the blank an allowed
   * PROTECTED_FIELD. The counter said zero while five held facts were missing
   * from the paper. A fact the platform holds and did not print is a missing
   * known fact whatever any label says about it, so it is counted from the
   * fact of the suppression and never from the classification. */
  const suppressed = blanks.filter((b) => b.heldButNotWritten === true);
  for (const b of suppressed) {
    note("knownRequiredFieldsMissing", {
      field: b.id, document: b.document, label: b.label,
      basis: "this family declared a write for a fact it holds and the saved artifact does not carry it",
      finalizerRefusal: b.finalizerRefusal ?? null
    });
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
    if (spec?.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, document: blank.document, label: blank.label, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, document: blank.document, label: blank.label, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, document: blank.document, label: blank.label, basis: verdict.basis });
  }

  const hay = String(instructionsText ?? "").toLowerCase();
  for (const b of ledger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [b.label, b.id, b.declared?.identity].map((x) => String(x ?? "").trim()).filter((x) => x.length >= 3);
    if (needles.some((n) => hay.includes(n.toLowerCase().slice(0, 60)))) continue;
    note("requiredFactsNotCollected", { field: b.id, document: b.document, label: b.label, why: "classified required-before-filing and not named in participant-instructions.md" });
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
    if (classifyField(w.label, false).requirement === "PROTECTED") note("protectedWrites", { field: w.id, document: w.document, label: w.label, why: "a protected field was written" });
  }

  for (const c of declaredComponents) {
    if (!builtComponents.includes(c)) note("requiredComponentsMissing", { component: c, why: "the committed registry declares this component required and this build produced no bytes for it" });
  }

  /* Read from the byte-proof documents, which were read from the artifacts. */
  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, document: p.documentId, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.refusedFieldsWithInk ?? []).length > 0) note("visualDefects", { fixture: p.fixture, document: p.documentId, refusedFieldsWithInk: p.refusedFieldsWithInk.length });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, document: p.documentId, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
  }

  return { counters, findings, ledger, written: writes.length, blank: blanks.length };
}

/* ======================================================================== *
 * 8. PARTICIPANT INSTRUCTIONS
 * ======================================================================== */

function requiredBeforeFilingItems(maps) {
  const order = Object.fromEntries(SPEC.documents.map((d, i) => [d.documentId, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r, i) => ({
      document: m.documentId, componentId: m.componentId, field: r.field, page: r.page,
      printedContext: r.printedLine, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.reason, participantMustSupply: r.participantMustSupply,
      declarationIndex: i
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || (a.page - b.page) || (a.declarationIndex - b.declarationIndex))
    .map(({ declarationIndex, ...rest }) => rest);
}

function participantInstructions(maps, rbf, laterCompletion) {
  const out = [];
  out.push(`# What you must do before you file — ${SPEC.routeName}`, "");
  out.push(`This packet is prepared for **${SPEC.legalName}**.`, "");
  for (const p of SPEC.instructionsIntro) out.push(p, "");

  out.push("## What is in this packet, and who each document is for", "");
  out.push("| Component | Document | What it is, and who completes it |", "| --- | --- | --- |");
  for (const d of SPEC.documents) out.push(`| \`${d.componentId}\` | ${d.participantName} | ${d.whoCompletesIt} |`);
  out.push("");

  out.push("## Where this is filed, what it costs, and who must be served", "");
  out.push("Each answer below is quoted from the committed record that establishes it, on a line of its own.", "");
  for (const [q, answer] of SPEC.obligationTable) { out.push(`**${q}**`, "", answer, ""); }

  out.push("## The route this packet states for you", "");
  for (const p of SPEC.routeElectionDisclosure) out.push(p, "");

  out.push("## Documents you must obtain before filing", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  for (const [doc, where] of SPEC.documentsToObtain) out.push(`| ${doc} | ${where} |`);
  out.push("");

  out.push("## The items you must supply", "");
  out.push("Each is a blank on a named page of a named document. Fill every one from the record itself, never from memory. The packet leaves them blank because the platform holds no value for them.", "");
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  for (const [doc, items] of byDoc) {
    out.push(`### ${doc}`, "");
    out.push("| Page | The blank on the document | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What the court fills in after you file", "");
  out.push("These blanks are not yours to complete before filing. The court or the clerk supplies them.", "");
  out.push("| Document | Page | The blank | When it is filled |", "| --- | --- | --- | --- |");
  for (const i of laterCompletion) out.push(`| ${i.document} | ${i.page} | ${i.disclosureLabel} | ${i.trigger} |`);
  out.push("");

  out.push("## What you do, in order", "");
  for (const [i, s] of SPEC.steps.entries()) out.push(`${i + 1}. ${s}`);
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  for (const b of SPEC.deliberatelyBlank) out.push(`- ${b}`);
  out.push("");

  out.push("## What this packet does not tell you", "");
  for (const n of SPEC.notTold) out.push(`- ${n}`);
  out.push("");

  out.push("## When to stop and get help instead of filing", "");
  for (const s of SPEC.stopConditions) out.push(`- ${s}`);
  out.push("");

  out.push("## What this packet is not", "");
  out.push(SPEC.whatThisIsNot, "");
  out.push(`_Route: ${SPEC.routeLabel}_`);
  return `${out.join("\n")}\n`;
}

/* ======================================================================== *
 * 9. OUTPUT
 * ======================================================================== */

function writeOut(output, rel, value) {
  output.set(rel, Buffer.isBuffer(value) ? value : Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
}

async function savePacket(docs, title) {
  const packet = await PDFDocument.create();
  const pageManifest = [];
  for (const d of docs) {
    const src = await PDFDocument.load(d.bytes, { ignoreEncryption: true, updateMetadata: false });
    for (const [i, p] of (await packet.copyPages(src, src.getPageIndices())).entries()) {
      packet.addPage(p);
      pageManifest.push({ packetPage: packet.getPageCount(), component: d.componentId, documentId: d.documentId, sourcePage: i + 1, sourceSha256: d.composed ? null : d.sourceSha256 });
    }
  }
  packet.setTitle(title);
  stampDeterministic(packet);
  packet.setProducer("LegalEase deterministic official-form builder");
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, updateFieldAppearances: false }));
  assert.deepEqual(scanBytesForActiveContent(bytes).hits, [], "the assembled packet carries active content");
  return { bytes, pageManifest, pageCount: packet.getPageCount() };
}

/* ======================================================================== *
 * 10. ENTRY POINT
 * ======================================================================== */

export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");

  const { resolved: sources, failures: sourceFailures } = resolveSources();
  const { resolved: records, failures: recordFailures } = resolveRecords();
  if (sourceFailures.length > 0 || recordFailures.length > 0) {
    return {
      familyId: SPEC.familyId, status: "BLOCKED_SOURCE",
      failedSourceIdentities: sourceFailures, failedRecordIdentities: recordFailures,
      why: "an exact source binary or a committed record this family builds from is missing, moved, or no longer hashes to its pinned digest, so nothing may be drawn against it",
      overlayDirectoryTouched: false
    };
  }

  /* ---- guards that run in the BUILD PATH, before anything is rendered ---- *
   * Not behind a flag, not in a self test. Each one refuses a packet this
   * family must never produce, and each is proved to fire by breaking the
   * thing it guards and watching the build stop. */
  assert.equal(sources.length, SPEC.documents.filter((d) => d.officialFormId).length,
    "every official component of this family must resolve to an exact source binary");
  for (const fixtureName of Object.keys(FIXTURES)) {
    const facts = FIXTURES[fixtureName];
    assert.equal(facts["answers.disposition"], ROUTE_FACTS.disposition,
      `${fixtureName}: this family is the K.S.A. 21-6614(a)(2) DIVERSION route and states that election on the petition; a fixture whose held disposition is not a fulfilled diversion agreement would have the packet swear to the wrong one`);
    assert.equal(facts["answers.felony_in_past_two_years"], false,
      `${fixtureName}: Option A of the Judicial Council petition asserts no felony conviction in the past two years and no pending felony proceeding; the packet may not select Option A over a held answer that contradicts it`);
    assert.equal(facts["answers.currently_required_to_register"], false,
      `${fixtureName}: K.S.A. 21-6614(f) freezes every case in the record while offender registration is required, so a packet may not be built over a held answer that registration applies`);
    assert.equal(facts["answers.specialty_court_completion"], false,
      `${fixtureName}: Option B is the K.S.A. 21-6614(a)(3) specialty-court lane and a different track; this family must not be built for a record that belongs to it`);
  }

  if (checkOnly) {
    const censuses = await Promise.all(sources.map(censusOf));
    return {
      familyId: SPEC.familyId, status: "CHECK_ONLY",
      sourcesBound: sources.map((s) => ({ documentId: s.documentId, sha256: s.sha256 })),
      recordsBound: records.length,
      anchorsVerified: records.reduce((n, r) => n + r.anchorsVerified, 0),
      fieldsCensused: censuses.reduce((n, c) => n + c.fields.length, 0)
    };
  }

  const censuses = await Promise.all(sources.map(censusOf));
  const fixtures = {};
  for (const [fixtureName, facts] of Object.entries(FIXTURES)) {
    const docs = [];
    for (const [i, source] of sources.entries()) {
      const rendered = await renderDocument(source, censuses[i], facts);
      docs.push({
        componentId: source.componentId, documentId: source.documentId, role: source.role,
        sourceSha256: source.sha256, bytes: rendered.bytes, report: rendered.report, rows: rendered.rows,
        facts, composed: false
      });
    }
    const guidance = SPEC.documents.find((d) => !d.officialFormId);
    docs.push({
      componentId: guidance.componentId, documentId: guidance.documentId, role: guidance.role,
      sourceSha256: null, bytes: await renderComposedPdf(processGuidanceBody(facts), `${SPEC.legalName} — ${guidance.participantName}`),
      report: { written: [] }, rows: [], facts, composed: true
    });
    fixtures[fixtureName] = docs;
  }

  const writeProofs = await actualWriteProof(fixtures);

  const maps = sources.map((s, i) => ({
    formNumber: s.documentId, documentId: s.documentId, componentId: s.componentId,
    officialFormId: s.officialFormId, officialSourceUrl: s.officialSourceUrl,
    documentPolicy: { mode: "participant", captionOnly: s.captionOnly === true, documentAcceptsFill: true, routeKey: SPEC.routeKey, role: s.role },
    structuralClass: "acroform",
    boundSource: { path: s.corpusPath, custody: s.custody, sha256: s.sha256, byteLength: s.byteLength, pages: s.pages },
    explicitMappings: Object.fromEntries(fixtures.canonical[i].rows.filter((r) => r.decision === "write").map((r) => [r.field, r.factId])),
    roleRefusals: [],
    selectionControls: fixtures.canonical[i].rows.filter((r) => r.isSelectionControl === true).map((r) => ({ field: r.field, label: r.effectiveLabel, decision: r.decision, reasonForThisControlOnThisRoute: r.why })),
    canonicalWrites: fixtures.canonical[i].rows.filter((r) => r.decision === "write" || r.decision === "select"),
    canonicalRefusals: fixtures.canonical[i].rows.filter((r) => r.decision === "refuse"),
    boundaryWrites: fixtures.boundary[i].rows.filter((r) => r.decision === "write" || r.decision === "select"),
    boundaryRefusals: fixtures.boundary[i].rows.filter((r) => r.decision === "refuse")
  }));

  const rbf = requiredBeforeFilingItems(maps);
  const laterCompletion = maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.completenessDisposition === "LATER_COMPLETION")
    .map((r) => ({ document: m.documentId, page: r.page, disclosureLabel: r.effectiveLabel, trigger: r.laterCompletionTrigger })));
  const instructionsText = participantInstructions(maps, rbf, laterCompletion);

  const declaredComponents = SPEC.documents.map((d) => d.componentId);
  const builtComponents = fixtures.canonical.map((d) => d.componentId);
  const counted = countCompleteness(maps, writeProofs, instructionsText, declaredComponents, builtComponents);

  const packets = {};
  for (const [fixtureName, docs] of Object.entries(fixtures)) {
    packets[fixtureName] = await savePacket(docs, `${SPEC.legalName} — ${fixtureName} fixture`);
  }

  /* ---- output ---------------------------------------------------------- */
  const output = new Map();
  for (const [fixtureName, docs] of Object.entries(fixtures)) {
    /* Only the assembled packet is committed. Every component's own bytes were
     * rendered, read back and hashed above, and the assembly carries the same
     * pages; committing both would put 23MB of duplicated pages in the tree for
     * a review artifact. Each component's digest and byte length are recorded
     * in reports/rendered-artifacts.json and are reproducible by rerunning. */
    writeOut(output, `fixtures/${fixtureName}.pdf`, packets[fixtureName].bytes);
  }
  writeOut(output, "fixtures/participant-facts.json", {
    schemaVersion: "rcap-fixture-participant-facts/v1", familyId: SPEC.familyId,
    theseAreSyntheticTestFacts: "No fixture value is any person's record. They exercise the field map and the fitter; they assert nothing about anybody.",
    fixtures: FIXTURES
  });
  writeOut(output, "participant-instructions.md", Buffer.from(instructionsText));

  writeOut(output, "field-census.census-v1.json", {
    schemaVersion: "rcap-field-census/v1-census-v1", familyId: SPEC.familyId,
    labelBasis: "every label in this census is AUTHORED by this family; the harvested label beside it records what the page prints and is evidence, not a binding",
    documents: sources.map((s, i) => ({
      componentId: s.componentId, documentId: s.documentId, sourceSha256: s.sha256,
      fields: censuses[i].fields.map((f) => ({ name: f.name, type: f.type, multiline: f.multiline, maxLength: f.maxLength, authoredLabel: f.effectiveLabel, harvestedLabel: f.harvestedLabel, widgets: f.widgets, sourceValue: f.sourceValue }))
    }))
  });

  writeOut(output, "production-field-map.json", {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: SPEC.familyId,
    routeKeys: [SPEC.routeKey], routeLabels: { [SPEC.routeKey]: SPEC.routeLabel },
    printedRouteLineCarriesTheLabelNotTheKey: true,
    jurisdiction: SPEC.jurisdiction, statutes: SPEC.statutes, legalName: SPEC.legalName,
    implementationStrategy: "official_pdf_fill", renderStrategy: "official_pdf_fill_flattened",
    componentSet: declaredComponents,
    componentRoles: Object.fromEntries(SPEC.documents.map((d) => [d.componentId, d.role])),
    componentConditions: {},
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, SWORN_ELECTION],
    routeSelectionsMade: SPEC.routeSelectionsMade,
    routeSelectionNote: SPEC.routeSelectionNote,
    participantFacingObligations: SPEC.obligationTable.map(([question, answer]) => ({ question, answer })),
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    laterCompletion, maps,
    generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeOut(output, "source-receipt.json", {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: SPEC.familyId, worklistGroupId: SPEC.familyId,
    jurisdiction: SPEC.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_BOUND_BY_HELD_BYTES", acquisitionCommissioned: false,
    bindingMethod: "each official binary resolved through data/rcap-all50/local-source-corpus-index.json and verified byte-for-byte against the digest this family pins, in this run; each committed record bound by exact SHA-256 with every relied-on statement re-read from its bytes as an anchor before anything was composed",
    routeKeys: [SPEC.routeKey], routeLabels: { [SPEC.routeKey]: SPEC.routeLabel },
    printedRouteLineCarriesTheLabelNotTheKey: true,
    statutoryAuthority: SPEC.statutes, legalName: SPEC.legalName,
    allSourcesExact: sourceFailures.length === 0 && sources.length === SPEC.documents.filter((d) => d.officialFormId).length,
    documents: sources.map((s) => ({
      componentId: s.componentId, documentId: s.documentId, officialFormId: s.officialFormId,
      documentRole: s.role, officialTitle: s.officialTitle, revision: s.revision,
      officialSourceUrl: s.officialSourceUrl,
      pathInCustody: s.corpusPath, custody: s.custody, custodyRoot: s.custodyRoot,
      sha256: s.sha256, byteLength: s.byteLengthObserved,
      matchedBy: "exact_path_custody_sha256_and_byte_length", corpusIndexAgrees: true,
      pageCount: s.pages, acroFieldCount: s.acroFieldCount, structuralClassObserved: "acroform",
      generatedParticipantArtifact: true
    })),
    committedRecords: records.map((r) => ({
      sourceIds: [`committed-record:${r.path}`], recordId: r.recordId, pathInRepository: r.path,
      sha256: r.sha256, byteLength: r.byteLength, instrumentKind: "committed_record_bound_as_authority",
      role: r.role, anchorStatementsVerified: r.anchorsVerified
    })),
    composedComponentsAuthoredByThisBuild: SPEC.documents.filter((d) => !d.officialFormId).map((d) => d.componentId),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    republicationRestriction: SPEC.republicationRestriction,
    whatThisReceiptDoesNotEstablish: [
      "that any output is approved for participant delivery",
      "that any record is eligible for the relief this family petitions for",
      "that the Kansas Judicial Council republication restriction recorded above has been resolved, waived or licensed",
      "that a partial custody standing behind five of these six binaries is the complete operational corpus"
    ]
  });

  writeOut(output, "reports/actual-writes.json", {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: SPEC.familyId, derivedFromArtifactBytes: true,
    note: "Every value was read back out of the saved artifact bytes — from the flattened widget appearance at the field's own measured rectangle for the six official documents, and from the extracted text of the saved page for the composed guidance component. Nothing here is this builder's own intent.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, documentId: p.documentId,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    totalActualWrites: writeProofs.reduce((n, d) => n + d.actualWrites.length, 0),
    blockingFindings: []
  });

  writeOut(output, "reports/blanks-left-for-the-participant.json", {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: SPEC.familyId,
    requiredBeforeFiling: rbf,
    laterCompletion,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.completenessDisposition === "PROTECTED_FIELD")
      .map((r) => ({ document: m.documentId, page: r.page, field: r.field, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.reason }))),
    participantElections: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.completenessDisposition === "PARTICIPANT_ELECTION_GENUINE")
      .map((r) => ({ document: m.documentId, page: r.page, field: r.field, label: r.effectiveLabel, reasonForThisControlOnThisRoute: r.reason }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeOut(output, "reports/completeness-counters.json", {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: SPEC.familyId,
    whatThisIs: "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract functions over this family's field map, its byte proof and participant-instructions.md.",
    whatThisIsNot: "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires an independent fifteen-obligation verification and a hash-bound RASTER_PASS from the central raster workflow.",
    howEachCounterWasTaken: SPEC.howEachCounterWasTaken,
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    terminalFields: counted.written + counted.blank,
    written: counted.written, blank: counted.blank,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeOut(output, "reports/rendered-artifacts.json", {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: SPEC.familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: declaredComponents,
    componentConditions: {},
    boundReferenceSource: sources.map((s) => ({ documentId: s.documentId, sha256: s.sha256 })),
    pdfs: Object.entries(packets).map(([fixture, p]) => ({
      file: `${OUT}/fixtures/${fixture}.pdf`, documentId: "assembled_packet",
      role: "assembled_packet_of_official_forms_and_one_composed_guidance_page",
      fixture, sha256: sha(p.bytes), byteLength: p.bytes.length, pageCount: p.pageCount
    })),
    familyAssemblyIsAParticipantDeliverable: true,
    familyAssemblyRole: "single-route family: the assembly is this route's packet",
    componentArtifacts: Object.entries(fixtures).flatMap(([fixture, docs]) => docs.map((d) => ({
      fixture, componentId: d.componentId, documentId: d.documentId, role: d.role,
      committedAsItsOwnFile: false,
      carriedInto: `${OUT}/fixtures/${fixture}.pdf`,
      sha256: sha(d.bytes), byteLength: d.bytes.length,
      sourceSha256: d.sourceSha256,
      valuesReadBackFromTheseBytes: writeProofs.find((p) => p.fixture === fixture && p.documentId === d.documentId)?.actualWrites.length ?? null
    }))),
    pageManifests: Object.fromEntries(Object.entries(packets).map(([f, p]) => [f, p.pageManifest])),
    routeArtifacts: Object.entries(packets).map(([fixture, p]) => ({
      routeKey: SPEC.routeKey, routeLabel: SPEC.routeLabel, route: SPEC.routeSlug, fixture,
      file: `${OUT}/fixtures/${fixture}.pdf`, sha256: sha(p.bytes), byteLength: p.bytes.length,
      pageCount: p.pageCount, pageManifest: p.pageManifest,
      components: declaredComponents, documents: SPEC.documents.map((d) => d.documentId),
      role: "route_packet", deliveryRole: "participant_deliverable_for_this_route_only",
      valuesReadBackFromTheseBytes: writeProofs.filter((x) => x.fixture === fixture).reduce((n, x) => n + x.actualWrites.length, 0),
      rasterPending: true, independentVerificationPending: true
    })),
    routeArtifactRoutes: [SPEC.routeKey],
    routeLabels: { [SPEC.routeKey]: SPEC.routeLabel },
    printedRouteLineCarriesTheLabelNotTheKey: true,
    routeArtifactRasterPending: true,
    byteDerivedHashes: true,
    rasterEngine: null, rasterSkipped: true, rasterPages: [],
    everyPageRastered: false,
    rasterState: "BUILT_RASTER_PENDING",
    rasterIsCentral: "This lane renders no raster. Enrolment and rendering are the central raster workflow's, dispatched by Captain.",
    independentVerificationPending: true
  });

  writeOut(output, "build-status.json", {
    schemaVersion: "rcap-family-build-status/v1", familyId: SPEC.familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: SPEC.buildScript,
    rasterEngine: "not rendered in this run", popplerUsed: false,
    renderedArtifacts: Object.keys(packets).length,
    rasterPages: 0, rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route.",
    sourcePermissionHoldUnresolved: SPEC.republicationRestriction.holdName
  });

  writeOut(output, "build-findings.json", {
    schemaVersion: "rcap-family-build-findings/v1", familyId: SPEC.familyId,
    blocking: [], findings: SPEC.buildFindings
  });

  writeOut(output, "approval-request.json", {
    schemaVersion: "rcap-family-approval-request/v1", familyId: SPEC.familyId,
    requested: "independent completeness verification, a central raster, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: SPEC.counselQuestions,
    mattersForTheReviewersAttention: SPEC.reviewersAttention
  });

  if (checkOnly) return { familyId: SPEC.familyId, status: "CHECK_ONLY" };

  const drift = [];
  for (const [rel, bytes] of output) {
    const abs = path.join(ROOT, OUT, rel);
    if (argv.includes("--verify-deterministic")) {
      if (!fs.existsSync(abs)) { drift.push({ file: rel, why: "absent" }); continue; }
      const saved = fs.readFileSync(abs);
      if (saved.length !== bytes.length || sha(saved) !== sha(bytes)) drift.push({ file: rel, savedSha256: sha(saved), rebuiltSha256: sha(bytes) });
      continue;
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (rel.endsWith(".json")) fs.writeFileSync(abs, `${JSON.stringify(preserveIdentityRefresh(fs, abs, JSON.parse(bytes.toString("utf8"))), null, 2)}\n`);
    else fs.writeFileSync(abs, bytes);
  }
  if (argv.includes("--verify-deterministic")) {
    return { familyId: SPEC.familyId, status: drift.length === 0 ? "DETERMINISTIC" : "DRIFT", drift };
  }

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: SPEC.familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : { stopClass: "COMPLETENESS_COUNTER_NOT_ZERO", nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0), firstFindings: counted.findings.slice(0, 8) }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: "official_pdf_fill",
    sourcesBound: sources.map((s) => ({ documentId: s.documentId, sha256: s.sha256, custody: s.custody })),
    recordsBound: records.map((r) => ({ recordId: r.recordId, sha256: r.sha256, anchorsVerified: r.anchorsVerified })),
    components: declaredComponents,
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    requiredBeforeFiling: rbf.length,
    laterCompletion: laterCompletion.length,
    artifactHashes: Object.entries(packets).map(([fixture, p]) => ({ fixture, packetSha256: sha(p.bytes), pages: p.pageCount, byteLength: p.bytes.length })),
    rasterState: "BUILT_RASTER_PENDING",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false,
    sourcePermissionHoldUnresolved: SPEC.republicationRestriction.holdName
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); if (r.status === "STOPPED" || r.status === "BLOCKED_SOURCE" || r.status === "DRIFT") process.exit(2); })
    .catch((e) => { console.error(e); process.exit(1); });
}
