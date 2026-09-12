#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createKansasBuilder } from "./rcap-official-forms/kansas-statutory-builder.mjs";
import { applyKansasSharedPolicy } from "./rcap-official-forms/kansas-shared-policy.mjs";
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

const ROUTE_FACTS = { disposition: "conviction" };

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
    "answers.disposition": "conviction",
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
    "answers.disposition": "conviction",
    "answers.felony_in_past_two_years": false,
    "answers.currently_required_to_register": false,
    "answers.specialty_court_completion": false
  }
};

/* ---- the six official binaries, and the one composed page ---------------- */
const DOCUMENTS = [
  {
    componentId: "ks-21-6614-conviction-cover-sheet-1", documentId: "KS-CRIMINAL-COVER-SHEET-10-14-2025",
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
    componentId: "ks-21-6614-conviction-primary-filing-2", documentId: "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022",
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
    componentId: "ks-21-6614-conviction-notice-3", documentId: "KSJC-NOTICE-OF-HEARING-12-2016",
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
    componentId: "ks-21-6614-conviction-cover-sheet-4", documentId: "KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016",
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
    componentId: "ks-21-6614-conviction-proposed-order-5", documentId: "KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022",
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
    componentId: "ks-21-6614-conviction-proposed-order-6", documentId: "KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016",
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
    componentId: "ks-21-6614-conviction-process-guidance-7", documentId: "KS-21-6614-CONVICTION-HEARING-PREPARATION",
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
  put("on", "Item 5 — the crime I was convicted of", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the offence of conviction, ${RBF_RECORD}`, supply: "the crime you were convicted of, as the journal entry states it, with the Kansas statute if the record gives one" });
  put("Date", "Item 5 — date of conviction", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the date of the conviction, ${RBF_RECORD}`, supply: "the date you were convicted" });
  put("on_2", "Item 5, second alternative — the crime for which I was granted a diversion", { kind: "notApplicable", reason: "the diversion alternative of item 5 belongs to the K.S.A. 21-6614(a)(2) diversion route", routeCondition: "Item 5 of this petition prints a conviction alternative and a diversion alternative separated by OR. This packet is built for the K.S.A. 21-6614(a)(1) conviction route and states the conviction alternative; the diversion alternative is the K.S.A. 21-6614(a)(2) route, which is a different track with a different triggering event." });
  put("Date_2", "Item 5, second alternative — the date the diversion was granted", { kind: "notApplicable", reason: "the diversion alternative of item 5 belongs to the K.S.A. 21-6614(a)(2) diversion route", routeCondition: "The same OR alternative as the line above: this packet is the K.S.A. 21-6614(a)(1) conviction route, and the date a diversion was granted is a fact of the K.S.A. 21-6614(a)(2) route." });
  put("undefined_4", "Item 6 — the convicting court or diverting authority", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the convicting court, ${RBF_RECORD}`, supply: "the court that convicted you, named as the journal entry names it" });
  put("undefined_5", "Item 7 — the date of final discharge", { kind: "requiredBeforeFiling", reason: `the participant supplies this before filing: the date of final discharge, which is the date the waiting period runs from, ${RBF_RECORD}`, supply: "the LATEST of: the date you satisfied the sentence, or the date you were discharged from probation, a community correctional services programme, parole, postrelease supervision, conditional release or a suspended sentence. This is the date the waiting period runs from — not the arrest date and not the conviction date." });
  put("Check Box1", "Item at the head of the petition — expungement of my CONVICTION and related arrest records (selection)", { kind: "select", basis: "The route determines this election. This packet is the K.S.A. 21-6614(a)(1) conviction route, and a petition built for one statutory route states which route it is rather than asking the petitioner. The held disposition is a conviction and the build refuses to run if it is anything else." });
  put("Check Box2", "Item at the head of the petition — expungement of my DIVERSION record and related arrest records (selection)", { kind: "notApplicable", selectionControl: true, reason: "the diversion alternative of the opening request belongs to the K.S.A. 21-6614(a)(2) diversion route", routeCondition: "The petition opens with two mutually exclusive boxes separated by OR. This packet states the conviction box because it is built for the K.S.A. 21-6614(a)(1) conviction route; the diversion box is the K.S.A. 21-6614(a)(2) route and marking both would ask for two different remedies at once." });
  put("Check Box3", "Item 8 — Option A (selection)", { kind: "select", basis: "The route determines this election. Item 8 says to select and complete either Option A or Option B and NOT both. Option B is the K.S.A. 21-6614(a)(3) specialty-court lane, which is its own track; the K.S.A. 21-6614(a)(1) conviction route this packet is built for is Option A. The build refuses to run over a held answer that a specialty-court programme was completed, or that a felony conviction or pending felony proceeding exists, because Option A asserts the opposite." });
  for (const [name, years] of [["Check Box4", "one"], ["Check Box5", "three"], ["Check Box6", "five"], ["Check Box7", "ten"]]) {
    put(name, `Item 8, Option A.i — ${years} year(s) have elapsed (selection)`, {
      kind: "requiredBeforeFiling", selectionControl: true,
      reason: `the participant marks the "${years}" box at item 8.A.i themselves: which of the four waiting periods applies turns on how the offence is classified in the Kansas sentencing grid and on the date the offence was committed, and the committed registry says LegalEase "does not assert that the participant is eligible, does not classify the offence into a grid severity level for them"`,
      supply: `mark this box only if ${years === "one" ? "one year has" : `${years} years have`} elapsed since your date of final discharge AND the ${years}-year period is the one your offence falls into. Which period applies depends on how your offence is classified; the Judicial Council chart printed on pages 5 and 6 of this petition works it through, and the packet does not classify the offence for you.`,
      caseDetermined: "The route is K.S.A. 21-6614(a)(1) for every one of the four boxes; what differs between them is the severity classification of this particular offence and the date it was committed, which are facts of the case. The committed track registry states in terms that LegalEase does not classify the offence into a grid severity level, and under State v. Anderson the law in effect when the offence was committed governs. Marking one of these boxes from the route alone would be asserting a legal characterisation of a code section on a petition sworn under penalty of perjury."
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
  putOrd("on", "Order paragraph 5 — the crime the petitioner was convicted of", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the offence of conviction, ${RBF_RECORD}`, supply: "the offence of conviction, copied from item 5 of the petition" });
  putOrd("Date", "Order paragraph 5 — date of conviction", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the date of the conviction, ${RBF_RECORD}`, supply: "the date of the conviction, copied from item 5 of the petition" });
  putOrd("on_2", "Order paragraph 5, second alternative — the crime for which a diversion was granted", { kind: "notApplicable", reason: "the diversion alternative of paragraph 5 belongs to the K.S.A. 21-6614(a)(2) diversion route", routeCondition: "Paragraph 5 of the order prints a conviction alternative and a diversion alternative separated by OR, mirroring item 5 of the petition. This packet is the K.S.A. 21-6614(a)(1) conviction route." });
  putOrd("Date_2", "Order paragraph 5, second alternative — the date the diversion was granted", { kind: "notApplicable", reason: "the diversion alternative of paragraph 5 belongs to the K.S.A. 21-6614(a)(2) diversion route", routeCondition: "The same OR alternative as the line above; this packet is the K.S.A. 21-6614(a)(1) conviction route." });
  putOrd("undefined_6", "Order paragraph 6 — the convicting court or diverting authority", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the convicting court, ${RBF_RECORD}`, supply: "the convicting court, copied from item 6 of the petition" });
  putOrd("undefined_7", "Order paragraph 7 — the date of final discharge", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the date of final discharge, ${RBF_RECORD}`, supply: "the date of final discharge, copied from item 7 of the petition" });
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
  putDen("5 The petitioner was convicted of", "Denial order paragraph 5 — the crime the petitioner was convicted of", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the offence of conviction, ${RBF_RECORD}`, supply: "the offence of conviction, copied from item 5 of the petition" });
  putDen("on", "Denial order paragraph 5 — date of conviction", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the date of the conviction, ${RBF_RECORD}`, supply: "the date of the conviction, copied from item 5 of the petition" });
  putDen("The petitioner was granted a diversion for the crime of", "Denial order paragraph 5, second alternative — the crime for which a diversion was granted", { kind: "notApplicable", reason: "the diversion alternative of paragraph 5 belongs to the K.S.A. 21-6614(a)(2) diversion route", routeCondition: "Paragraph 5 of the denial order prints a conviction alternative and a diversion alternative separated by OR. This packet is the K.S.A. 21-6614(a)(1) conviction route." });
  putDen("Date", "Denial order paragraph 5, second alternative — the date the diversion was granted", { kind: "notApplicable", reason: "the diversion alternative of paragraph 5 belongs to the K.S.A. 21-6614(a)(2) diversion route", routeCondition: "The same OR alternative as the line above; this packet is the K.S.A. 21-6614(a)(1) conviction route." });
  putDen("6  The convicting court or diverting authority was", "Denial order paragraph 6 — the convicting court or diverting authority", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the convicting court, ${RBF_RECORD}`, supply: "the convicting court, copied from item 6 of the petition" });
  putDen("7  The date of final discharge was", "Denial order paragraph 7 — the date of final discharge", { kind: "requiredBeforeFiling", reason: `the participant supplies this before lodging the proposed order: the date of final discharge, ${RBF_RECORD}`, supply: "the date of final discharge, copied from item 7 of the petition" });
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
  familyId: "ks-21-6614-conviction-set",
  worklistGroupId: "ks-21-6614-conviction-set",
  trackId: "ks-21-6614-conviction",
  buildScript: "scripts/build-census-v1-ks-21-6614-conviction-set.mjs",
  outDir: "data/rcap-all50/overlays/census-v1/ks/ks-21-6614-conviction-set--official-pdf-fill",
  jurisdiction: "KS",
  routeKey: "obligation:track-pathway:KS:ks-21-6614-conviction:conviction-or-diversion-216614",
  routeLabel: "Kansas conviction expungement - K.S.A. 21-6614(a)(1)",
  routeSlug: "ks-21-6614-conviction",
  legalName: "Petition for Expungement of a Kansas District Court Conviction under K.S.A. 21-6614",
  routeName: "asking the convicting Kansas district court to expunge a conviction and the related arrest records under K.S.A. 21-6614(a)(1)",
  statutes: [
    "K.S.A. 21-6614(a)(1)", "K.S.A. 21-6614(c)", "K.S.A. 21-6614(d)", "K.S.A. 21-6614(e)",
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
      "data/record-clearing/legal-design-track-registry.json, track ks-21-6614-conviction, scopeRestrictions",
      "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json, sourceReconciliation.permissionHold"
    ],
    whatThisBuildDidAboutIt: "Nothing. Building a packet is not resolving a permission hold, and this lane has no authority to resolve one. The hold stands exactly where it stood; these artifacts are internal build and review evidence, generationAllowed is false, and no commercial route is opened.",
    exactNextActionForTheOwner: "Resolve Kansas Judicial Council commercial reuse and republication treatment; all exact current source bytes are held."
  },

  records: [
    {
      recordId: "legal-design-track-registry:ks-21-6614-conviction",
      path: "data/record-clearing/legal-design-track-registry.json",
      role: "the committed legal-design track registry: this route's legal name, its statutory mechanism, its venue and destination, its recorded fee, notice and service rules, its required generation inputs, its manual-completion items, its scope restrictions and its self-help stop conditions",
      mustContain: [
        '"trackId": "ks-21-6614-conviction"',
        "Petition for Expungement of a Kansas District Court Conviction under K.S.A. 21-6614",
        "Docket fee $176 under K.S.A. 21-6614(g)(2).",
        "The supreme court may additionally impose a charge not exceeding $19 per case to fund non-judicial personnel",
        "The court sets the hearing date and causes notice to be given to the prosecutor and the arresting law enforcement agency, K.S.A. 21-6614(g)(1).",
        "The participant files the Notice of Hearing with the original plus two copies and the clerk sends them to the prosecutor and the arresting law enforcement agency. The participant does not serve and does not sign the certificate.",
        "The petitioner signs the petition, affirming under penalty of perjury that the statements are accurate to the best of their knowledge.",
        "File with the clerk of the convicting district court, docketed in the original criminal action, with the Criminal Cover Sheet and the required number of copies. Confirm the copy count with the clerk before filing.",
        KSJC_RESTRICTION,
        "LegalEase does not assert that the participant is eligible, does not classify the offence into a grid severity level for them, and does not assert that an old conviction is or is not comparable to a K.S.A. 21-6614(e) offence under paragraph (19).",
        "A person required to register under the Kansas Offender Registration Act may not expunge any conviction or any part of their criminal record while registration is required, K.S.A. 21-6614(f).",
        "The Certificate of Service and Mailing on the Notice of Hearing is left blank and visibly labelled for clerk completion.",
        "The hearing date, time, courthouse, division and room are left blank on the Notice of Hearing.",
        "The docket fee of $176, plus any non-judicial personnel charge, accompanies the petition at filing.",
        '"componentId": "ks-21-6614-conviction-cover-sheet-1"',
        '"componentId": "ks-21-6614-conviction-primary-filing-2"',
        '"componentId": "ks-21-6614-conviction-notice-3"',
        '"componentId": "ks-21-6614-conviction-cover-sheet-4"',
        '"componentId": "ks-21-6614-conviction-proposed-order-5"',
        '"componentId": "ks-21-6614-conviction-proposed-order-6"',
        '"componentId": "ks-21-6614-conviction-process-guidance-7"'
      ]
    },
    {
      recordId: "legal-design-specifications:ks-21-6614-conviction",
      path: "data/record-clearing/legal-design-specifications.json",
      role: "the committed official-form assignments: which official form each component of this family is, and the participant filing requirements the packet must disclose",
      mustContain: [
        '"trackId": "ks-21-6614-conviction"',
        '"officialFormId": "KS-CRIMINAL-COVER-SHEET-10-14-2025"',
        '"officialFormId": "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022"',
        '"officialFormId": "KSJC-NOTICE-OF-HEARING-12-2016"',
        '"officialFormId": "KSJC-ORDER-EXPUNGEMENT-COVER-SHEET-12-2016"',
        '"officialFormId": "KSJC-ORDER-FOR-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022"',
        '"officialFormId": "KSJC-ORDER-DENYING-EXPUNGEMENT-12-2016"'
      ]
    },
    {
      recordId: "route-obligation-census:obligation:track-pathway:KS:ks-21-6614-conviction:conviction-or-diversion-216614",
      path: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
      role: "the committed route-obligation census: the exact route key this family serves",
      mustContain: ["obligation:track-pathway:KS:ks-21-6614-conviction:conviction-or-diversion-216614"]
    }
  ],

  routeSelectionsMade: [
    {
      document: "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022",
      field: "Check Box1",
      printedContext: 'I respectfully request of the Court an order of expungement of my [ ] conviction and related arrest records OR [ ] diversion record and related arrest records.',
      selected: "conviction",
      because: "K.S.A. 21-6614(a)(1) is the conviction lane and is the route this family is built for. A petition built for one statutory route states which route it is."
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
    ["Which court does this go to?", "File with the clerk of the convicting district court, docketed in the original criminal action, with the Criminal Cover Sheet and the required number of copies. Confirm the copy count with the clerk before filing."],
    ["What does it cost?", "Docket fee $176 under K.S.A. 21-6614(g)(2). The supreme court may additionally impose a charge not exceeding $19 per case to fund non-judicial personnel; 2026 Senate Bill 430 carries that authority from July 1, 2026 through June 30, 2030. The docket fee is the only fee that may be collected for the case."],
    ["Can the fee be waived?", "None in this lane. The only fee waiver in K.S.A. 21-6614 is the specialty court waiver at (a)(3). 2026 House Bill 2724, which would have authorised judges to waive the expungement docket fee on a poverty affidavit, died without enactment, so no general poverty-based statutory waiver exists. Some district courts nonetheless accept a poverty affidavit in practice."],
    ["Who gets notice, and who sends it?", "The court sets the hearing date and causes notice to be given to the prosecutor and the arresting law enforcement agency, K.S.A. 21-6614(g)(1). No response or objection period is specified; the prosecutor appears at the hearing."],
    ["Do I serve anybody?", "The participant files the Notice of Hearing with the original plus two copies and the clerk sends them to the prosecutor and the arresting law enforcement agency. The participant does not serve and does not sign the certificate."],
    ["Do I sign anything, and is it sworn?", "The petitioner signs the petition, affirming under penalty of perjury that the statements are accurate to the best of their knowledge."],
    ["Does anything need notarising?", "none"],
    ["Is there anything that stops this route entirely?", "A person required to register under the Kansas Offender Registration Act may not expunge any conviction or any part of their criminal record while registration is required, K.S.A. 21-6614(f). That freezes every case in the record, not only the registrable offence. The sole exception is the K.S.A. 22-4908 drug offender route; sex offender and violent offender registrants are barred with no exception."]
  ],

  routeElectionDisclosure: [
    "This packet has marked two boxes on the petition for you, and it marked them because the route decides them, not because anyone assessed your record.",
    "On the opening request it marked **conviction**, not diversion. K.S.A. 21-6614(a)(1) is the conviction lane. If your case ended in a diversion you completed rather than in a conviction, this is the wrong packet — stop and use the diversion route.",
    "At item 8 it marked **Option A**, not Option B. Option B is for someone who completed a specialty court programme under K.S.A. 20-173, which is a different lane with no waiting period. If you completed a specialty court programme, stop and use that route.",
    "It marked nothing else. In particular it did not mark any of the one / three / five / ten year boxes at item 8.A.i, because which of those periods applies depends on how your offence is classified in the Kansas sentencing grid and on the date the offence was committed. The chart the Judicial Council prints on pages 5 and 6 of the petition works that through. The packet does not classify your offence and does not tell you which box is yours."
  ],

  documentsToObtain: [
    ["Your own case information from the convicting court", "Ask the clerk of the convicting court for the case number, the offence of conviction and the date the sentence was satisfied or supervision discharged. LegalEase never collects, inspects or authenticates these records."],
    ["Your own evidence of the intervening years, for the (h)(2) and (h)(3) findings", "Assemble your own records and letters. LegalEase formats what you supply and assesses none of it. This is recommended rather than required; the packet generates without it."]
  ],

  steps: [
    "Read the hearing-preparation page at the back of this packet first. Three of the four findings the court must make are not pleaded anywhere on the petition, and they are the ones a hearing turns on.",
    "Get your case information from the clerk of the convicting court, and fill in every blank listed under \"The items you must supply\" from that record — not from memory.",
    "Read pages 4, 5 and 6 of the petition. Page 4 lists the convictions that can never be expunged. Pages 5 and 6 are the Judicial Council chart of waiting periods. Decide from the chart which of the year boxes at item 8.A.i is yours, and mark it.",
    "Sign and date the petition. Nobody may sign it for you and it is sworn under penalty of perjury.",
    "File the petition with the Criminal Cover Sheet at the clerk of the convicting district court, with the docket fee. Ask the clerk how many copies that county wants before you go.",
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
    "Which waiting period applies to your offence, or how your offence is classified in the Kansas sentencing grid.",
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
    "The arrest county and the convicting county differ."
  ],

  whatThisIsNot: "This packet is not legal advice, not a filed petition, and not a decision that you are eligible. It is a set of official Kansas forms with the facts the platform holds printed into them and every other blank left for you or for the court, together with the platform's own account of which is which. No lawyer has reviewed your record and nothing here predicts what a judge will do.",

  guidance: {
    title: "Preparing for your K.S.A. 21-6614 expungement hearing",
    intro: [
      "The hearing on a Kansas expungement petition is real and it is required. The prosecutor appears. Any person with relevant information may testify. The court may inquire into your background and has access to Department of Corrections and Prisoner Review Board records.",
      "The petition you are filing pleads only one of the four findings the court must make. The other three are about you, and the petition has nowhere to put them. That is what this page is for.",
      "This page does not write your account of your own life and it does not predict the outcome. Both of those are outside what LegalEase does."
    ],
    findings: [
      "1. The applicable period has elapsed. This is the only one of the four the petition itself pleads, at item 8. It runs from the LATEST of satisfying the sentence or discharge from probation, a community correctional services programme, parole, postrelease supervision, conditional release or a suspended sentence. Not from the arrest and not from the conviction.",
      "2. The circumstances and behaviour of the petitioner warrant the expungement. This is about the years since. Assemble your own records: work, study, treatment, service, family, anything that shows what has changed. Bring them.",
      "3. The expungement is consistent with the public welfare. The court weighs this itself. Nothing you file decides it.",
      "4. If the petition seeks expungement of a felony conviction, that the petitioner's possession of a firearm is not likely to pose a threat to the safety of the public. This finding applies only to a felony. If your petition is for a felony conviction, this is a reason to get a Kansas lawyer before the hearing rather than after it."
    ],
    quoted: [
      ["What the committed record says about the fee, in its own words", "Docket fee $176 under K.S.A. 21-6614(g)(2). The supreme court may additionally impose a charge not exceeding $19 per case to fund non-judicial personnel; 2026 Senate Bill 430 carries that authority from July 1, 2026 through June 30, 2030. The docket fee is the only fee that may be collected for the case."],
      ["What the committed record says about notice, in its own words", "The court sets the hearing date and causes notice to be given to the prosecutor and the arresting law enforcement agency, K.S.A. 21-6614(g)(1). No response or objection period is specified; the prosecutor appears at the hearing."],
      ["What the committed record says about service, in its own words", "The participant files the Notice of Hearing with the original plus two copies and the clerk sends them to the prosecutor and the arresting law enforcement agency. The participant does not serve and does not sign the certificate."],
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
      detail: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json lists six packetComponents for ks-21-6614-conviction-set. The committed legal-design track registry declares seven for packetSet ks-21-6614-conviction-set, the seventh being ks-21-6614-conviction-process-guidance-7 with role process_guidance and requirement required, and the registry's packetInstructions say in terms that the packet carries a hearing-preparation document putting the four K.S.A. 21-6614(h) findings in plain language. This build produces all seven and counts requiredComponentsMissing against the registry, which is the controlling record. The queue row is the one that is short.",
      blocksBuild: false,
      blocksApprovalForLive: false
    },
    {
      finding: "This family cannot state its own route election, and that is why one counter is not zero.",
      detail: "The Judicial Council petition opens with two mutually exclusive boxes: \"an order of expungement of my [ ] conviction and related arrest records OR [ ] diversion record and related arrest records\". The election is determined by the statutory route, and the completeness contract is right that a packet built for one route must state which route it is rather than asking the petitioner. This build settled it from held facts and the shared field semantics refused the mark: protectCategoryOf reads the printed caption, the caption carries the word \"conviction\", and the disposition_or_hearing protect rule matches it. The rule is doing its job — it exists so a build cannot assert a disposition — and the channel that says a particular caption is one the PARTICIPANT states rather than one the court owns is PARTICIPANT_STATED_SUBJECT in scripts/rcap-official-forms/rcap-field-semantics.mjs, which carries entries for exact Alabama and Oregon captions and none for Kansas. This lane owns this family's overlay directory and its build script; it does not own that module, which forty-odd other families import, so it did not edit it and did not reword the caption to slip past the rule. The counter stands at one and the build STOPS.",
      exactRemedy: "Whoever owns scripts/rcap-official-forms/rcap-field-semantics.mjs adds one PARTICIPANT_STATED_SUBJECT entry exempting disposition_or_hearing for the exact caption of this election — the petitioner's own opening request under K.S.A. 21-6614, which the petitioner states and no court owns — in the same shape as the existing al_cr65_participant_charge entry. Rebuilding this family then marks the box and the counter goes to zero. Nothing else about this family changes.",
      blastRadiusMeasured: "Across the 295 committed census-v1 production field maps in this tree, 14,231 write and refusal labels were scanned for the phrase \"expungement of my\". Three carry it: the two Kansas boxes this finding is about, and one Vermont label reading \"expungement of my criminal history is in the interests of justice\", which a caption regex anchored on \"and related arrest records\" does not reach. A correctly anchored Kansas entry therefore moves no other family's bytes.",
      blocksBuild: true,
      blocksApprovalForLive: true
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
    "Two selections are made on the petition and both are route-determined: the conviction box on the opening request, and Option A at item 8. Four guards in the build path refuse the build over a held answer that contradicts either one.",
    "No box at item 8.A.i is marked. Which waiting period applies is a classification of the offence, and the committed registry forbids the platform from making it.",
    "The coercion box at item 8.A.iii is left unmarked and is declared not applicable on this route with a named route condition.",
    "Both proposed orders are rendered with the finalizer's captionOnly setting, so nothing but a caption fact can reach them however a field is labelled.",
    "The Certificate of Service and Mailing on the Notice of Hearing is completely blank and every one of its eight fields is labelled with the clerk's ownership.",
    "This lane did not raster anything and did not verify anything it built."
  ]
};


applyKansasSharedPolicy(SPEC, FIXTURES);
export { SPEC, FIXTURES, ROUTE_FACTS };
export const runFamily = createKansasBuilder(SPEC, FIXTURES, ROUTE_FACTS);
const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); if (r.status === "STOPPED" || r.status === "BLOCKED_SOURCE" || r.status === "DRIFT") process.exit(2); })
    .catch((e) => { console.error(e); process.exit(1); });
}
