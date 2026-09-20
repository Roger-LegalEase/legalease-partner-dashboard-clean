#!/usr/bin/env node
// P3 completeness repair for the two West Virginia conviction families.
// The central C11 builder remains the source/census baseline. This owned
// wrapper repairs only final WV packet content and evidence.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { runFamilyById as runBaselineFamily } from "./build-census-v1-ne-setaside-custodial-set.mjs";
import {
  carryDates,
  preserveSourceMetadata
} from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import {
  sanitizeAndFlatten,
  scanBytesForActiveContent
} from "./rcap-official-forms/rcap-active-content.mjs";
import { fitTextToWidget } from "./rcap-official-forms/rcap-text-fitting.mjs";
import { drawnAt, flattenedWidgets } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { normalizeWidgetAppearancePlacement } from "./rcap-official-forms/rcap-widget-appearance-placement.mjs";
import { extractPathSegments, extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { APPEARANCE_DISPOSITION } from "./rcap-official-forms/rcap-appearance-semantics.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFCheckBox, StandardFonts, rgb } = require("pdf-lib");
const sharp = require("sharp");

const ASSIGNMENT_ID = "P3_WV_CONVICTION_COMPLETENESS";
const BASE_SHA = "33dfea59fe85b9dc86469d12e04fd65c51b480fa";
const DISPATCH_SHA = "4d1408a40eeb77f51bdf18ba35a13db579b21129";
const FIXED_DATE = new Date("2026-01-01T00:00:00Z");
const RASTER_DPI = 72;
const POPPLER = process.env.RCAP_PDFTOPPM || "pdftoppm";
const LANE_OUT = "data/rcap-grade-a/wave-2/p3-wv-conviction-completeness";

const FAMILY_SPECS = Object.freeze({
  "wv_conv_multiple_misdemeanors-set": {
    directory: "data/rcap-all50/overlays/census-v1/wv/wv-conv-multiple-misdemeanors-set--official-pdf-fill",
    chargeCount: 3,
    routeSelection: "MultipleFelonyCB",
    routeSelectionLabel: "multiple-misdemeanor standard waiting-period route",
    beforeUnclassifiedBlanks: 128,
    // The ONE eligibility-date blank this route's field map declares required
    // before filing. The other three are refused on this route with the reason
    // "Never a filing fact on this route: multiple-misdemeanor standard
    // waiting-period route selects MultipleFelonyCB, not this alternate
    // eligibility branch."
    eligibilityDateField: "MultipleFelonyCompletionDate",
    eligibilityBranchOrdinal: "second",
    eligibilityBranchText:
      "For the expungement under WV Code §61-11-26 of multiple above listed and described misdemeanor "
      + "convictions or traffic citation(s), two years have passed since any conviction and the completion "
      + "of petitioner's sentence and any period of supervision.",
    eligibilityClock:
      "two years running from the later of your last conviction, your release from any incarceration, and the "
      + "completion of the supervision ordered for that last conviction",
    // Carried word for word from data/record-clearing/legal-design-track-registry.json,
    // track `wv_conv_multiple_misdemeanors`, selfHelpStopConditions. Nothing added, nothing softened.
    selfHelpStopConditions: [
      "Any felony conviction anywhere on the participant's record.",
      "Any violence, domestic violence, household member, strangulation, sex, child victim, deadly weapon, dwelling burglary or DUI issue in any conviction in the group.",
      "Any CDL or commercial motor vehicle issue.",
      "Any pending charge.",
      "Any protection, no-contact, restitution or restraining order.",
      "Any identified victim who may oppose, and any notice of opposition actually filed.",
      "Any prior expungement, which likely exhausts the once-per-lifetime rule.",
      "The group spans more than one county and it is unclear which circuit court the petition should be filed in.",
      "The court sets the matter for hearing under § 61-11-26(i)(3).",
      "Firearm rights, immigration, professional licensing, law enforcement or corrections employment, or federal, tribal, military or out-of-state records questions.",
    ]
  },
  "wv_conv_single_misdemeanor-set": {
    directory: "data/rcap-all50/overlays/census-v1/wv/wv-conv-single-misdemeanor-set--official-pdf-fill",
    chargeCount: 1,
    routeSelection: "SingleFelonyCB",
    routeSelectionLabel: "single-misdemeanor standard waiting-period route",
    beforeUnclassifiedBlanks: 272,
    eligibilityDateField: "SingleFelonyCompletionDate",
    eligibilityBranchOrdinal: "first",
    eligibilityBranchText:
      "For the expungement under WV Code §61-11-26 of a single above listed and described misdemeanor "
      + "conviction or traffic citations(s), one year has passed since the completion of petitioner's "
      + "sentence and any period of supervision.",
    eligibilityClock:
      "one year running from the later of the conviction, your release from any incarceration, and the "
      + "completion of the supervision ordered",
    // Carried word for word from data/record-clearing/legal-design-track-registry.json,
    // track `wv_conv_single_misdemeanor`, selfHelpStopConditions. Nothing added, nothing softened.
    selfHelpStopConditions: [
      "Any felony conviction anywhere on the participant's record.",
      "Any violence, domestic violence, household member, strangulation, sex, child victim, deadly weapon, dwelling burglary or DUI issue.",
      "Any CDL or commercial motor vehicle issue.",
      "Any pending charge.",
      "Any protection, no-contact, restitution or restraining order.",
      "Any identified victim who may oppose, and any notice of opposition actually filed.",
      "Any prior expungement, which likely exhausts the once-per-lifetime rule.",
      "The court sets the matter for hearing under § 61-11-26(i)(3).",
      "Firearm rights, immigration, professional licensing, law enforcement or corrections employment, childcare, healthcare, security clearance or federal records questions.",
      "Federal, tribal, military or out-of-state records.",
    ]
  }
});

const PROTECTED_C906 = new Set([
  "CertifyName", "CertifyDay", "CertifyMonth", "CertifyYear",
  "ProsecutingAttCounty", "ProsecutingAttAdd", "MagDisposedCharges",
  "MunicipalDisposedCharges", "FirstClassMailCB", "HandDeliveryCB",
  "CertifiedMailCB", "SignDate", "StatePoliceSuperintendent1",
  "OffensesCommittedAt1", "OffensesCommittedAt2", "ChiefLEO1", "ChiefLEO2",
  "ConfinedInstitution1", "ConfinedInstitution2", "CircuitDisposedCharges"
]);

const INSTRUCTION_BY_FIELD = Object.freeze({
  MagCaseNo: "lower-court-case-number",
  PetSocSecno: "ssn-last-four",
  SingleFelonyCompletionDate: "eligibility-date",
  MultipleFelonyCompletionDate: "eligibility-date",
  SingleFelonySatisfiesDate: "eligibility-date",
  MulitipleFelonlySatisfiesDate: "eligibility-date",
  PetitionersCurrentName2: "prior-names-and-aliases",
  VictimsNames1: "victim-information",
  VictimsNames2: "victim-information",
  CurrentOrderCB1: "current-protective-order",
  CurrentOrderCB2: "current-protective-order",
  PriorOrderCB1: "prior-protective-order",
  PriorOrderCB2: "prior-protective-order",
  Verdict1: "verdict-and-punishment",
  Verdict2: "verdict-and-punishment",
  GroundsForExpungement1: "grounds-for-expungement",
  GroundsForExpungement2: "grounds-for-expungement",
  RehabilitationSteps1: "rehabilitation-history",
  RehabilitationSteps2: "rehabilitation-history",
  RehabilitationSteps3: "rehabilitation-history",
  RehabilitationSteps4: "rehabilitation-history",
  RehabilitationSteps5: "rehabilitation-history"
});

/**
 * The held records these instructions state, and nothing beyond them.
 *
 * Independent verification failed both West Virginia conviction families on
 * FILING_DESTINATION and FEE_AND_WAIVER, and both findings were right: the
 * packet said nothing about where the petition goes or what it costs, while
 * the repository already held both answers. Under DET-FEE-AND-WAIVER-001
 * amendment A2 the repository is every committed record the family binds plus
 * every record the route obligation census names as a required source for the
 * route -- which makes the committed track registry and the committed
 * packet-set manifest held sources, not background reading.
 *
 * Each line below is quoted or restated from one of these, and each is named
 * in "Where these directions come from" so a reader can check it:
 *
 *   data/record-clearing/legal-design-track-registry.json
 *     destination.name, destination.detail, venue, and the packetSet's
 *     participantActionRequired pay_fee / apply_fee_waiver / serve_party /
 *     file entries, per track.
 *   data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json
 *     the same destination for the same routeKey, which is how the census
 *     binds it to this route rather than to the jurisdiction generally.
 *
 * The waiver line is the one place the honest answer is a refusal, and the
 * refusal is itself held: the manifest records "none under § 61-11-26. The
 * $100 State Police fee is waived only on a § 61-11-26a petition. Any relief
 * from the $200 circuit clerk fee would be under the circuit court's ordinary
 * civil indigency practice, which the controlling review did not establish."
 * So the packet states the fee it holds, states that no held source
 * establishes a waiver route for this filing, and names the circuit clerk of
 * the county of conviction -- the office it is filed with -- as the authority
 * who answers it. It does not invent an indigency form or a figure.
 *
 * Not stated here, and deliberately: whether relief already taken under
 * § 17C-5-2b counts against the once-per-lifetime limit in § 61-11-26(o).
 * No held record answers it, so this packet does not answer it either.
 *
 * A later independent read failed both families on REQUIRED_BEFORE_FILING for
 * one bullet, and the ground needed no amendment: the instructions contradicted
 * the family's OWN field map. The bullet named all four of paragraph c's
 * eligibility-date blanks -- SingleFelonyCompletionDate,
 * MultipleFelonyCompletionDate, SingleFelonySatisfiesDate and
 * MulitipleFelonlySatisfiesDate -- and asked the participant to pick "the
 * selected statutory route". The map declares exactly ONE of the four required
 * before filing per family and refuses the other three in terms: "Never a
 * filing fact on this route ... not this alternate eligibility branch." The
 * packet has ALSO already ticked the branch on paragraph c, so the election was
 * never the participant's to make, and the completeness contract forbids
 * handing back a route-determined election in exactly these words: "A packet
 * built for one statutory route must state which route it is, rather than
 * asking the participant."
 *
 * The map is right and the prose was wrong, so the prose was reconciled to the
 * map: one field, named per family from FAMILY_SPECS, the branch this packet
 * ticked quoted from the form's own printed sentence so the participant can
 * find the line on paper, and the clock stated from the packet-set manifest's
 * file entry. The bracketed name is kept but labelled as the WVSCA's internal
 * PDF field name -- it is printed nowhere on SCA-C906 and says "Felony" on a
 * misdemeanour-only petition, which a participant should be told rather than
 * left to puzzle over.
 */
const participantInstructions = (familyId, spec, shipsC900, multiCounty) => `# West Virginia conviction packet — where you file it, what it costs, and what you must supply

## Where you file this

File the verified SCA-C906 petition with the **clerk of the circuit court of the county of conviction** — the circuit court in which the conviction${multiCounty ? "s" : ""} occurred. **There is no residence-county venue on this route.** Subsections (a)(1) and (a)(2) both send the petition to the circuit court in which the conviction occurred, so the county you live in does not decide where this is filed.${multiCounty ? `

**If your convictions were had in more than one county, this is not one filing.** The controlling committed decision for this route (NATIONAL-2026-08-28-C-WV-02) holds that there is **no single receiving court for a multi-county group**: with the § 61-11-26(d) grouping proviso, the answer is **one petition per circuit court, carrying only that court's own convictions**. Do not put convictions from two circuit courts into one petition and file it in one of them. In each petition, serve the prosecuting attorney of every county of conviction where expungement is sought, as § 61-11-26(e) and S.B. 562 require.

**And if you are not sure which conviction belongs to which circuit court, stop here and ask a lawyer licensed in West Virginia before you file anything.** The same decision says so in terms, and the reason is that this remedy is once per lifetime: choosing wrongly is not a filing you can simply do again.` : ""}

Do not file until the verification on page 3 has been sworn to before a notary public or other official, and the certificate of service on page 4 has been completed.

## What it costs, and whether there is a waiver

**The circuit clerk charges the § 59-1-11(a)(1) civil-action filing fee, which the official text sets at $200.** This is the same fee as for instituting a civil action; W. Va. Code § 61-11-26(n) ties the clerk's charge to it.

**A further $100 is paid on grant.** A person who obtains an order of expungement pays $100 to the records division of the West Virginia State Police under § 61-11-26(n). It is paid only if the petition is granted, not when you file.

**No held source establishes a waiver route for this filing.** The $100 State Police fee is waived only on a § 61-11-26a accelerated treatment/job-readiness petition, which is a different route from this one. Any relief from the $200 circuit clerk fee would be under the circuit court's ordinary civil indigency practice, which the controlling review did not establish — so this packet does not name a form for it and does not tell you that you qualify. **Ask the clerk of the circuit court of the county of conviction**, the same office you file with, what that court requires of a petitioner who cannot pay the filing fee.

## Who must receive a copy

W. Va. Code § 61-11-26(e) requires **you** to serve the petition and supporting documentation on five recipients:

1. the Superintendent of the West Virginia State Police;
2. the prosecuting attorney of the county${multiCounty ? " or counties" : ""} of conviction;
3. the chief law-enforcement officer of the arresting agency;
4. the superintendent, warden or Commissioner of Corrections of any institution of confinement; and
5. the circuit, magistrate or municipal court that disposed of the charge.

**Identified victims are served by the prosecuting attorney, not by you**, under § 61-11-26(f). Do not serve a victim yourself.

Complete the certificate of service on page 4 — the recipient addresses, the delivery-method election, the date and your signature — **only after service has actually happened**. A certificate dated before service is a false statement, so this packet leaves it blank.

## Records you must obtain before you file, and check the packet against

**These are filing acts, not background reading.** SCA-C906 item n declares that supporting documentation is attached to the petition, and the petition is sworn. Get each of these first, then read the packet's own answers against them and correct anything that does not match. Each is carried word for word from this route's own committed track record — \`data/record-clearing/legal-design-track-registry.json\`, track \`${familyId.replace(/-set$/, "")}\`, \`participantFilingRequirements\`:

${recordsToObtain(familyId)}

**Attach them to the petition** — the certified records and any current order — because the petition says on its face that they are attached.

## What you must supply before filing

The packet has filled only facts already held for this matter. Do not file until every item below is completed on the operative SCA-C906 petition from your own records. Do not guess.

- **Lower-court case number** (\`MagCaseNo\`): add the Magistrate Court case number, if the conviction began there.
- **Social Security number** (\`PetSocSecno\`): add the last four digits requested by SCA-C906.
- **Eligibility date** (\`${spec.eligibilityDateField}\`) — **one blank, and this packet has already chosen which one.** Paragraph c of SCA-C906 offers four eligibility branches, each with its own "The date of eligibility is: ____" line and its own clock. This packet is built for the ${spec.routeSelectionLabel} and has marked the **${spec.eligibilityBranchOrdinal}** of the four: "${spec.eligibilityBranchText}" Write your date on **that** line and leave the other three blank — this packet's field map records the other three eligibility-date blanks as never a filing fact on this route, so a date on any of them contradicts the box that has been ticked. The date to write is the day the clock finished running: ${spec.eligibilityClock}. Take it from the sentence and supervision records, and do not estimate it — you are swearing to it.

  (The name in brackets is the internal PDF field name, not a caption: it is not printed anywhere on SCA-C906, and it is the West Virginia Supreme Court of Appeals' own — which is why it says "Felony" on a misdemeanour-only petition. Find the blank by the printed sentence quoted above, not by that name.)
- **Prior names and aliases** (\`PetitionersCurrentName2\`): add every prior name or alias. If there are none, state that truthfully.
- **Address history** (\`PetitionersOffenseAddress1\`): the current address is prefilled; add every other address from the offense date through today, if any.
- **Victim information** (\`VictimsNames1\`, \`VictimsNames2\`): identify every victim if applicable, or state that no identifiable victim exists if that is true.
- **Current protective/no-contact order** (\`CurrentOrderCB1\`, \`CurrentOrderCB2\`): answer yes or no and attach the order when the form requires it.
- **Prior protective/no-contact order** (\`PriorOrderCB1\`, \`PriorOrderCB2\`): answer yes or no and attach the order when the form requires it.
- **Verdict and punishment** (\`Verdict1\`, \`Verdict2\`): copy the verdict, sentence, and punishment from the court record.
- **Grounds for expungement** (\`GroundsForExpungement1\`, \`GroundsForExpungement2\`): supply your own truthful filing reasons.
- **Rehabilitation history** (\`RehabilitationSteps1\`, \`RehabilitationSteps2\`, \`RehabilitationSteps3\`, \`RehabilitationSteps4\`, \`RehabilitationSteps5\`): supply your own truthful treatment, work, education, or other rehabilitation history.

The participant signature, signature date, verification/notary completion, and the entire certificate of service remain blank and protected. Complete or sign them only at the event and in the manner the form and filing court require.${shipsC900 ? " The included SCA-C900 is an instructions/reference component only; do not complete or file its embedded outdated petition instead of SCA-C906." : ""}

## Where self-help ends

This packet prepares the SCA-C906 petition. It does not decide anything, and no lawyer has reviewed your case in preparing it. **Stop and get a lawyer licensed in West Virginia before you file if any of the following is true of your case.** Each one is carried word for word from this route's own committed track record — \`data/record-clearing/legal-design-track-registry.json\`, track \`${familyId.replace(/-set$/, "")}\`, \`selfHelpStopConditions\` — and each is a point at which this packet stops being enough:

${spec.selfHelpStopConditions.map((condition) => `- ${condition}`).join("\n")}

**If you are not a United States citizen, the immigration item in that list is a hard stop and not a caveat.** Ask an immigration lawyer before you sign or file anything. Neither this packet nor the circuit clerk can tell you what a West Virginia expungement does or does not do to your immigration position, and the petition is sworn to under oath once you sign it.

**Two of those conditions are things that happen after you file, and both end self-help where they start.** If an opposing party files a notice of opposition to your petition, or the circuit court sets your petition for hearing under § 61-11-26(i)(3) instead of granting it summarily, the matter is contested from that point. This packet does not prepare you for a contested hearing, does not tell you how to answer an opposition, and does not argue anything for you. The reply and hearing windows run on the statute's clock rather than yours, so look for a lawyer as soon as an opposition is served on you, not afterwards.

**Who to ask, for what.** The clerk of the circuit court of the county of conviction — the same office you file with — answers procedural questions: what that court requires, what it charges, and what happens to a petition after it is filed. Only a lawyer licensed in West Virginia may advise you on whether you are eligible, on what any of the conditions above means for your record, or at a hearing. If you cannot afford one, ask that same clerk's office how to reach the county's legal aid or lawyer referral service. The clerk cannot give you legal advice, and this packet is not a substitute for either.

## What this packet is not

This is a prepared set of official West Virginia forms built for review. It is not legal advice, it is not filed for you, and it does not decide whether the circuit court will grant expungement.

## Where these directions come from

The filing destination, the fee, the absence of a waiver route for this filing, the eligibility clock and the service recipients above are each taken from a record committed in this repository, not from anything this packet worked out for itself:

- **Committed track registry** — \`data/record-clearing/legal-design-track-registry.json\`, track \`${familyId.replace(/-set$/, "")}\`: \`destination.name\`, \`destination.detail\`, \`venue\`, and the packet-set \`participantActionRequired\` entries \`pay_fee\`, \`apply_fee_waiver\`, \`serve_party\` and \`file\`.
- **Committed route obligation census** — \`data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json\`, route \`obligation:track-pathway:WV:${familyId.replace(/-set$/, "")}:eligible-conviction-expungement-under-w-va-code-61-11-26\`, which carries the same destination and fee for this exact route.
- **W. Va. Code §§ 59-1-11(a)(1), 61-11-26(e), 61-11-26(f) and 61-11-26(n)**, as those records cite them.

Where no such record establishes an answer — the waiver route for the $200 clerk fee — this packet says so and names the office to ask, rather than supplying a figure or a form it does not hold.
`;

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const TRACK_REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const PACKET_SET_MANIFESTS = "data/record-clearing/legal-design-packet-set-manifests.json";

/*
 * FIX-C/FIX02+FIX03, REQUIRED_BEFORE_FILING.
 *
 * vf05 and vf06 both found the same gap: participant-instructions.md
 * enumerated the form's blanks and stopped there. The committed track record
 * also requires the participant to GO AND GET things before filing -- certified
 * dispositions, judgment and sentencing orders, written proof that supervision
 * ended, a copy of any current restitution or protective order -- and to CHECK
 * the answers already in the packet against them. SCA-C906 item n declares
 * supporting documentation attached, so those are filing acts and not
 * explanatory colour.
 *
 * They are read from the registry rather than retyped into this file, on the
 * same reasoning the self-help stop conditions are quoted from it: nothing a
 * participant is told to obtain should pass through an editor's hands.
 */
function participantFilingRequirements(familyId) {
  const trackId = familyId.replace(/-set$/, "");
  const registry = readJson(TRACK_REGISTRY);
  const found = [];
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== "object") return;
    if (node.trackId === trackId && Array.isArray(node.participantFilingRequirements)) {
      found.push(node.participantFilingRequirements);
      return;
    }
    Object.values(node).forEach(walk);
  };
  walk(registry);
  assert.equal(found.length, 1,
    `${trackId}: expected exactly one committed participantFilingRequirements list, found ${found.length}`);
  return found[0];
}

const recordsToObtain = (familyId) => participantFilingRequirements(familyId).map((item) => {
  const conditional = item.requirement === "conditional" && item.conditionDescription
    ? ` **Only if:** ${item.conditionDescription}`
    : "";
  return `- **${item.name}** — from **${item.obtainedFrom}**. ${item.howToObtain}${conditional}`;
}).join("\n");
const writeJson = (rel, value) => {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
};

function sourceRoot() {
  const root = process.env.MASTER_LIBRARY_SOURCE_DIR;
  assert.ok(root, "MASTER_LIBRARY_SOURCE_DIR is required");
  assert.ok(fs.statSync(root).isDirectory(), "MASTER_LIBRARY_SOURCE_DIR is not mounted");
  return root;
}

function fixtureFacts(spec, fixture) {
  const boundary = fixture === "boundary";
  const chargeBase = boundary
    ? "Eligible WV misdemeanor conviction — extended count"
    : "Eligible West Virginia misdemeanor conviction";
  const charges = Array.from({ length: spec.chargeCount }, (_, index) => ({
    case_number: boundary ? `2026-CR-${900123 + index}-EXTENDED` : `24-CR-${String(1234 + index).padStart(6, "0")}`,
    charge: index === 0 ? chargeBase : `${chargeBase} ${index + 1}`,
    arrest_date: "2019-03-08",
    conviction_date: "2019-11-02",
    disposition_date: "2020-01-15"
  }));
  return {
    "participant.full_legal_name": boundary ? "Alexandrina Montgomery-Vandenberg Fitzwilliam" : "Jordan Avery Reyes",
    "participant.street_address": boundary ? "12345 Southwest Grandview Boulevard Northeast Apt 4321-B" : "118 Maple Street",
    "participant.city_state_zip": boundary ? "Long Hollow Crossing, WV 25301-9999" : "Charleston, WV 25301",
    "participant.phone": boundary ? "304-555-0142 x44821" : "304-555-0142",
    "participant.date_of_birth": "1991-04-17",
    "matter.county": "Kanawha County",
    "matter.case_number": charges[0].case_number,
    "matter.arrest_date": charges[0].arrest_date,
    "matter.conviction_date": charges[0].conviction_date,
    "matter.disposition_date": charges[0].disposition_date,
    "screening.prior_relief": "No",
    "matter.charges": charges
  };
}

function c906Values(spec, facts) {
  const dob = facts["participant.date_of_birth"].split("-");
  const charges = facts["matter.charges"];
  const values = new Map([
    ["CircuitCaseNo", ["matter.case_number", facts["matter.case_number"]]],
    ["ConvictionDate", ["matter.conviction_date", facts["matter.conviction_date"]]],
    ["PetAdd1", ["participant.street_address", facts["participant.street_address"]]],
    ["PetAdd2", ["participant.city_state_zip", facts["participant.city_state_zip"]]],
    ["PetDOBDay", ["participant.birth_month", dob[1]]],
    ["PetDOBMonth", ["participant.birth_day", dob[2]]],
    ["PetDOBYear", ["participant.birth_year", dob[0]]],
    ["PetPhoneNum", ["participant.phone", facts["participant.phone"]]],
    ["PetArrestDate", ["matter.arrest_date", facts["matter.arrest_date"]]],
    ["County", ["matter.county", facts["matter.county"].replace(/\s+County$/i, "")]],
    ["PetitionerName1", ["participant.full_legal_name", facts["participant.full_legal_name"]]],
    ["PetitionerName2", ["participant.full_legal_name", facts["participant.full_legal_name"]]],
    ["PetitionersCurrentName1", ["participant.full_legal_name", facts["participant.full_legal_name"]]],
    ["PetitionersOffenseAddress1", ["participant.current_address", `${facts["participant.street_address"]}; ${facts["participant.city_state_zip"]}`]],
    [spec.routeSelection, ["route.selection", spec.routeSelectionLabel]],
    ["ExpungementCB2", ["screening.prior_relief", facts["screening.prior_relief"]]]
  ]);
  charges.forEach((charge, index) => {
    values.set(`Charge${index + 1}`, [`matter.charges[${index}].charge`, charge.charge]);
    values.set(`CaseNo${index + 1}`, [`matter.charges[${index}].case_number`, charge.case_number]);
  });
  if (charges.length === 1) {
    values.set("Charges1", ["matter.charges", `${charges[0].charge} — case ${charges[0].case_number}`]);
  } else {
    values.set("Charges1", ["matter.charges", charges.slice(0, 2).map((c) => c.charge).join("; ")]);
    values.set("Charges2", ["matter.charges", `${charges[2].charge}; case numbers are listed in the complete rows on page 1`]);
  }
  return values;
}

function normalizedRect(rect) {
  return {
    x: rect.x,
    y: rect.height < 0 ? rect.y + rect.height : rect.y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height)
  };
}

async function renderC906(sourceBytes, sourceRow, censusDoc, spec, fixture) {
  assert.equal(sha256(sourceBytes), sourceRow.sha256, "SCA-C906 source SHA-256 drift");
  const facts = fixtureFacts(spec, fixture);
  const values = c906Values(spec, facts);
  const pdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const form = pdf.getForm();
  const writtenFields = new Set();
  const report = [];
  const overlayWrites = [];
  const selectionWrites = [];

  for (const [fieldName, [factId, rawValue]] of values) {
    const censusField = censusDoc.fields.find((field) => field.name === fieldName);
    assert.ok(censusField, `${fieldName}: absent from SCA-C906 census`);
    const handle = form.getField(fieldName);
    if (handle instanceof PDFCheckBox) {
      selectionWrites.push({ fieldName, factId, rawValue, censusField });
      continue;
    }
    overlayWrites.push({ fieldName, factId, rawValue, censusField });
  }

  // The official AcroForm ships malformed text appearances that flatten as
  // stray square glyphs. Suppress every text/control appearance and write text
  // once at the first exact measured rectangle. Checkbox appearances remain,
  // so court-drawn boxes are preserved and only route-known choices are marked.
  const appearanceDispositions = new Map(censusDoc.fields
    .filter((field) => field.type !== "checkbox")
    .map((field) => [field.name, APPEARANCE_DISPOSITION.RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN]));
  // SCA-C906 writes its checkbox appearances with a /BBox in absolute page
  // coordinates. pdf-lib's flatten() assumes the origin-relative spelling and
  // translates by the widget rectangle regardless, so every court-drawn
  // checkbox landed at twice its true x and y: off the top of pages 2 and 3
  // entirely, and elsewhere painting its opaque interior over the document
  // title, the petitioner name line and the word "traffic" in the elected
  // eligibility sentence. Placing the appearances the way PDF 12.5.5 places
  // them, before the flatten, is a no-op on this form's text fields and moves
  // every checkbox back onto its own control.
  const placement = normalizeWidgetAppearancePlacement(pdf);
  assert.ok(
    placement.corrected.every((entry) => censusDoc.fields
      .find((field) => field.name === entry.field)?.type === "checkbox"),
    "SCA-C906 appearance placement correction touched a field that is not a checkbox"
  );
  const { clean } = await sanitizeAndFlatten(pdf, { writtenFields, appearanceDispositions });
  const overlayFont = await clean.embedFont(StandardFonts.Helvetica);
  for (const { fieldName, factId, rawValue, censusField } of overlayWrites) {
    const rect = normalizedRect(censusField.widgets[0].rect);
    const text = String(rawValue);
    const fit = fitTextToWidget({
      font: overlayFont,
      text,
      rect: { x: rect.x + 1, y: rect.y + 2, width: rect.width - 2, height: rect.height - 2 },
      multiline: false,
      maxFontSize: 10,
      minFontSize: 6
    });
    assert.notEqual(fit.outcome, "refused", `${fieldName}: measured overlay is not legibly fittable`);
    clean.getPage(censusField.widgets[0].page - 1).drawText(fit.lines.join(" "), {
      x: rect.x + 1,
      y: rect.y + 4.5,
      size: fit.fontSize,
      font: overlayFont
    });
    report.push({
      field: fieldName,
      factId,
      kind: "overlay_text",
      value: text,
      rect: censusField.widgets[0].rect,
      fontSize: fit.fontSize,
      outcome: fit.outcome,
      lines: 1
    });
  }
  for (const { fieldName, factId, rawValue, censusField } of selectionWrites) {
    const widget = censusField.widgets[0];
    const rect = normalizedRect(widget.rect);
    const inset = 2;
    const page = clean.getPage(widget.page - 1);
    page.drawLine({
      start: { x: rect.x + inset, y: rect.y + inset },
      end: { x: rect.x + rect.width - inset, y: rect.y + rect.height - inset },
      thickness: 1.2,
      color: rgb(0, 0, 0)
    });
    page.drawLine({
      start: { x: rect.x + inset, y: rect.y + rect.height - inset },
      end: { x: rect.x + rect.width - inset, y: rect.y + inset },
      thickness: 1.2,
      color: rgb(0, 0, 0)
    });
    report.push({
      field: fieldName,
      factId,
      kind: "selection_mark",
      value: String(rawValue),
      rect: widget.rect,
      outcome: "two_diagonal_strokes_inside_measured_source_control",
      drewANewBox: false
    });
  }
  preserveSourceMetadata(pdf, clean);
  carryDates(pdf, clean);
  const bytes = await clean.save({ useObjectStreams: false, updateMetadata: false });
  const active = scanBytesForActiveContent(bytes);
  assert.ok(active.inspectable && active.hits.length === 0, "SCA-C906 repaired artifact has active-content residue");
  return { bytes, report, placement };
}

async function renderReferenceOnly(sourceBytes, sourceRow, censusDoc) {
  assert.equal(sha256(sourceBytes), sourceRow.sha256, "SCA-C900 source SHA-256 drift");
  const pdf = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const appearanceDispositions = new Map(censusDoc.fields
    .filter((field) => field.type !== "checkbox")
    .map((field) => [field.name, APPEARANCE_DISPOSITION.RENDER_PARTICIPANT_VALUE_ONLY_WHEN_WRITTEN]));
  // The family's second flatten. SCA-C900 spells every appearance
  // origin-relative and writes no reversed rectangle, so this correction moves
  // nothing on it and the reference artifact's bytes are unchanged by it. It is
  // here so that neither of this builder's two flatten sites depends on the
  // reader remembering which of its two forms is the well-formed one.
  const referencePlacement = normalizeWidgetAppearancePlacement(pdf);
  assert.equal(referencePlacement.corrected.length, 0,
    "SCA-C900 appearance placement is no longer origin-relative; the reference artifact must be re-reviewed, not silently corrected");
  const { clean } = await sanitizeAndFlatten(pdf, {
    writtenFields: new Set(),
    appearanceDispositions
  });
  preserveSourceMetadata(pdf, clean);
  carryDates(pdf, clean);
  const bytes = await clean.save({ useObjectStreams: false, updateMetadata: false });
  const active = scanBytesForActiveContent(bytes);
  assert.ok(active.inspectable && active.hits.length === 0, "SCA-C900 reference artifact has active-content residue");
  return { bytes, report: [] };
}

function refusalFor(field, spec, formNumber) {
  if (formNumber === "SCA-C900") {
    return {
      field: field.name,
      blankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      category: "not_applicable_on_this_route",
      reason: "Never a filing fact on this route: SCA-C900 is the instructions/reference component and its embedded petition is materially out of date; SCA-C906 is the operative petition."
    };
  }
  if (PROTECTED_C906.has(field.name)) {
    return {
      field: field.name,
      blankDisposition: "PROTECTED_FIELD",
      category: "protected_field",
      reason: "Court, clerk, prosecutor, agency, or hearing field, or a signature/service event field; protected until the responsible actor and event."
    };
  }
  const row = /^(Charge|CaseNo)(\d+)$/.exec(field.name);
  if (row && Number(row[2]) > spec.chargeCount) {
    return {
      field: field.name,
      blankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      category: "not_applicable_on_this_route",
      reason: `Never a filing fact on this route: the fixture contains ${spec.chargeCount} complete offense row(s), so offense row ${row[2]} is unused.`
    };
  }
  const alternateRouteFields = new Set([
    "SingleFelonyCB", "SingleFelonyCompletionDate", "MultipleFelonyCB", "MultipleFelonyCompletionDate",
    "SingleSatisfiedCB", "SingleFelonySatisfiesDate", "MultilpleSatisfiedCB", "MulitipleFelonlySatisfiesDate"
  ]);
  const selectedRouteDate = {
    SingleFelonyCB: "SingleFelonyCompletionDate",
    MultipleFelonyCB: "MultipleFelonyCompletionDate"
  }[spec.routeSelection];
  if (alternateRouteFields.has(field.name) && field.name !== selectedRouteDate) {
    return {
      field: field.name,
      blankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      category: "not_applicable_on_this_route",
      reason: `Never a filing fact on this route: ${spec.routeSelectionLabel} selects ${spec.routeSelection}, not this alternate eligibility branch.`
    };
  }
  if (["PrintForm", "ResetButton", "CoDrop"].includes(field.name)) {
    return {
      field: field.name,
      blankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      category: "viewer_control",
      reason: "Viewer UI control; never a filing fact."
    };
  }
  if (field.name === "Charges2" && spec.chargeCount === 1) {
    return {
      field: field.name,
      blankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      category: "not_applicable_on_this_route",
      reason: "Never a filing fact on this route: the complete single-offense description fits the first charge line, so this continuation line is unused."
    };
  }
  if (field.name === "ExpungementCB1") {
    return {
      field: field.name,
      blankDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
      category: "not_applicable_on_this_route",
      reason: "Never a filing fact on this fixture: the known prior-relief answer is No, so ExpungementCB2 is selected instead."
    };
  }
  const instructionId = INSTRUCTION_BY_FIELD[field.name];
  assert.ok(instructionId, `${field.name}: unfilled SCA-C906 field lacks a closed completeness disposition`);
  return {
    field: field.name,
    blankDisposition: "REQUIRED_BEFORE_FILING",
    category: "required_before_filing",
    participantInstructionId: instructionId,
    reason: `Required before filing and surfaced in participant instructions (${instructionId}); the platform does not invent it.`
  };
}

function selectionMap(censusDoc, writes, refusals, spec, formNumber) {
  const writeByField = new Map(writes.map((write) => [write.field, write]));
  const refusalByField = new Map(refusals.map((refusal) => [refusal.field, refusal]));
  return censusDoc.selectionControls.map((control) => {
    const write = writeByField.get(control.field);
    if (write) {
      return {
        ...control,
        disposition: "selected_route_or_known_fact",
        reason: write.field === spec.routeSelection
          ? `Route-determined selection: ${spec.routeSelectionLabel}.`
          : "Selected from a known case fact held by the fixture."
      };
    }
    const refusal = refusalByField.get(control.field);
    assert.ok(refusal, `${formNumber}/${control.field}: selection control lacks a disposition`);
    return { ...control, disposition: "explicit_refusal", ...refusal };
  });
}

async function byteProof(file, censusDoc, writes, refusals, pageOffset = 0) {
  const appearances = await flattenedWidgets(file);
  const pdf = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const actualWrites = [];
  for (const write of writes) {
    const field = censusDoc.fields.find((row) => row.name === write.field);
    const widget = field.widgets[0];
    const at = drawnAt(appearances, { page: widget.page + pageOffset, rect: widget.rect, tolerance: 3 });
    const overlayText = write.kind === "overlay_text"
      ? extractTextItems(pdf.getPage(widget.page + pageOffset - 1)).filter((item) =>
          item.x >= widget.rect.x - 2 && item.x <= widget.rect.x + widget.rect.width + 2
          && item.y >= widget.rect.y - 2 && item.y <= widget.rect.y + Math.abs(widget.rect.height) + 8
          && String(item.text ?? "").trim().length > 0)
      : [];
    const selectionPaths = write.kind === "selection_mark"
      ? extractPathSegments(pdf.getPage(widget.page + pageOffset - 1)).filter((segment) => {
          const x1 = segment.x;
          const y1 = segment.y;
          const x2 = segment.x + segment.width;
          const y2 = segment.y + segment.height;
          const inside = (x, y) => x >= widget.rect.x - 1 && x <= widget.rect.x + widget.rect.width + 1
            && y >= widget.rect.y - 1 && y <= widget.rect.y + Math.abs(widget.rect.height) + 1;
          return inside(x1, y1) && inside(x2, y2) && segment.paintedBy;
        })
      : [];
    const visible = write.kind === "selection_mark"
      ? selectionPaths.length >= 2
      : write.kind === "overlay_text"
        ? overlayText.length > 0
        : at.some((appearance) => String(appearance.text ?? "").trim().length > 0);
    actualWrites.push({
      field: write.field,
      factId: write.factId,
      kind: write.kind,
      expected: write.value,
      page: widget.page + pageOffset,
      rect: widget.rect,
      flattenedAppearancesReadFromFinalPdfBytes: at,
      overlayTextReadFromFinalPdfBytes: overlayText,
      selectionPathsReadFromFinalPdfBytes: selectionPaths,
      visibleInFinalPdfBytes: visible
    });
  }
  assert.ok(actualWrites.every((write) => write.visibleInFinalPdfBytes), `${file}: a reported write is not visible in final PDF bytes`);
  const protectedWithInk = [];
  for (const refusal of refusals.filter((row) => row.blankDisposition === "PROTECTED_FIELD")) {
    const field = censusDoc.fields.find((row) => row.name === refusal.field);
    const widget = field.widgets?.[0];
    if (!widget) continue;
    const at = drawnAt(appearances, { page: widget.page + pageOffset, rect: widget.rect, tolerance: 3 });
    if (at.some((appearance) => String(appearance.text ?? "").trim().length > 0)) {
      protectedWithInk.push({ field: refusal.field, appearances: at });
    }
  }
  assert.deepEqual(protectedWithInk, [], `${file}: a protected field carries generated text`);
  return { actualWrites, protectedWithInk };
}

async function combinePacket(familyId, fixture, rendered) {
  const packet = await PDFDocument.create();
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  packet.setTitle(`Official-form completeness fixture: ${familyId} (${fixture})`);
  const pageManifest = [];
  let packetPage = 1;
  for (const item of rendered) {
    const doc = await PDFDocument.load(item.bytes, { ignoreEncryption: true, updateMetadata: false });
    const pages = await packet.copyPages(doc, doc.getPageIndices());
    pages.forEach((page, index) => {
      packet.addPage(page);
      pageManifest.push({
        packetPage: packetPage++,
        formNumber: item.sourceRow.formNumber,
        sourcePage: index + 1,
        sourceSha256: item.sourceRow.sha256
      });
    });
  }
  const bytes = await packet.save({ useObjectStreams: false, updateMetadata: false });
  const active = scanBytesForActiveContent(bytes);
  assert.ok(active.inspectable && active.hits.length === 0, `${familyId}/${fixture}: active-content residue`);
  return { bytes, pageManifest, active };
}

function popplerVersion() {
  const probe = spawnSync(POPPLER, ["-v"], { encoding: "utf8" });
  assert.equal(probe.status, 0, `Poppler is unavailable: ${probe.stderr || probe.stdout}`);
  const version = /pdftoppm\s+version\s+([^\s]+)/i.exec(`${probe.stderr}\n${probe.stdout}`)?.[1];
  assert.ok(version, "Poppler version was not reported");
  return version;
}

async function rasterPacket(pdfFile, rasterDirRel) {
  const rasterDir = path.join(ROOT, rasterDirRel);
  fs.rmSync(rasterDir, { recursive: true, force: true });
  fs.mkdirSync(rasterDir, { recursive: true });
  const doc = await PDFDocument.load(fs.readFileSync(pdfFile), { ignoreEncryption: true, updateMetadata: false });
  const version = popplerVersion();
  const pages = [];
  for (let index = 0; index < doc.getPageCount(); index += 1) {
    const pageNo = index + 1;
    const base = path.join(rasterDir, `page-${String(pageNo).padStart(2, "0")}`);
    const run = spawnSync(POPPLER, [
      "-f", String(pageNo), "-l", String(pageNo), "-singlefile",
      "-r", String(RASTER_DPI), "-png", pdfFile, base
    ], { encoding: "utf8" });
    assert.equal(run.status, 0, `Poppler raster failed: ${run.stderr || run.stdout}`);
    const file = `${base}.png`;
    const bytes = fs.readFileSync(file);
    const metadata = await sharp(file).metadata();
    const { channels } = await sharp(file).greyscale().stats();
    const geometry = doc.getPage(index).getSize();
    const croppedToPage = Math.abs(metadata.width - Math.round(geometry.width * RASTER_DPI / 72)) <= 1
      && Math.abs(metadata.height - Math.round(geometry.height * RASTER_DPI / 72)) <= 1;
    const looksBlank = channels[0].max - channels[0].min <= 6;
    assert.ok(croppedToPage && !looksBlank, `${file}: raster is blank or not cropped to the PDF page`);
    pages.push({
      page: pageNo,
      file: path.relative(ROOT, file),
      sha256: sha256(bytes),
      byteLength: bytes.length,
      widthPx: metadata.width,
      heightPx: metadata.height,
      engine: "poppler_pdftoppm",
      engineDiscoveryMode: process.env.RCAP_PDFTOPPM ? "RCAP_PDFTOPPM" : "PATH",
      engineVersion: version,
      dpi: RASTER_DPI,
      looksBlank,
      croppedToPage
    });
  }
  return { pages, version };
}

// ---------------------------------------------------------------------------
// Ink containment, measured from the rendered bytes.
//
// The completeness verifier scores field DISPOSITION from the map. It never
// compares the delivered page against the court's page, which is how a render
// that threw every checkbox to twice its true position survived a PASS. The
// measurement below closes that: the pristine source is rastered at the same
// DPI as the packet and diffed pixel by pixel, and every pixel of difference is
// attributed to a declared rectangle or counted as unexplained.
//
// Added ink must land inside a measured source widget rectangle. Removed ink
// must be ink the finalizer was told to remove -- a viewer control, or an
// unwritten participant input whose appearance is the court's hand-fill prompt.
// Anything else is a defect this build refuses to ship.
const INK_THRESHOLD = 160;
const CONTAINMENT_TOLERANCE_PX = 2;

async function rasterPristineSource(sourceBytes, formNumber) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `rcap-pristine-${formNumber}-`));
  const file = path.join(dir, "source.pdf");
  fs.writeFileSync(file, sourceBytes);
  const doc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = [];
  for (let index = 0; index < doc.getPageCount(); index += 1) {
    const base = path.join(dir, `page-${String(index + 1).padStart(2, "0")}`);
    const run = spawnSync(POPPLER, [
      "-f", String(index + 1), "-l", String(index + 1), "-singlefile",
      "-r", String(RASTER_DPI), "-png", file, base
    ], { encoding: "utf8" });
    assert.equal(run.status, 0, `Poppler raster of pristine ${formNumber} failed: ${run.stderr || run.stdout}`);
    pages.push(`${base}.png`);
  }
  return { dir, pages };
}

/** Measured widget rectangles for one page, in raster pixels, top-left origin. */
function pixelRectsForPage(censusDoc, pageNumber, heightPx, predicate) {
  const rects = [];
  for (const field of censusDoc.fields) {
    if (predicate && !predicate(field)) continue;
    for (const widget of field.widgets) {
      if (widget.page !== pageNumber) continue;
      const rect = normalizedRect(widget.rect);
      rects.push({
        field: field.name,
        x0: rect.x - CONTAINMENT_TOLERANCE_PX,
        x1: rect.x + rect.width + CONTAINMENT_TOLERANCE_PX,
        y0: heightPx - (rect.y + rect.height) - CONTAINMENT_TOLERANCE_PX,
        y1: heightPx - rect.y + CONTAINMENT_TOLERANCE_PX
      });
    }
  }
  return rects;
}

function inside(rects, x, y) {
  return rects.some((rect) => x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1);
}

/**
 * Diff one document's packet pages against its pristine source pages.
 *
 * `suppressedFields` are the fields whose source appearance the finalizer
 * deliberately drops, so ink removed inside their rectangles is intended.
 */
async function measureInkContainment(packetPages, pristinePages, censusDoc, suppressedFields) {
  const perPage = [];
  let addedOutside = 0;
  let erasedTotal = 0;
  let erasedUnexplained = 0;
  for (let index = 0; index < pristinePages.length; index += 1) {
    const pageNumber = index + 1;
    const packet = await sharp(packetPages[index].file).greyscale().raw().toBuffer({ resolveWithObject: true });
    const pristine = await sharp(pristinePages[index]).greyscale().raw().toBuffer({ resolveWithObject: true });
    assert.equal(packet.info.width, pristine.info.width, `page ${pageNumber}: raster width differs from the source page`);
    assert.equal(packet.info.height, pristine.info.height, `page ${pageNumber}: raster height differs from the source page`);
    const width = packet.info.width;
    const height = packet.info.height;
    const declared = pixelRectsForPage(censusDoc, pageNumber, height, null);
    const suppressed = pixelRectsForPage(censusDoc, pageNumber, height, (field) => suppressedFields.has(field.name));
    let pageAddedOutside = 0;
    let pageErased = 0;
    let pageErasedUnexplained = 0;
    for (let offset = 0; offset < width * height; offset += 1) {
      const inPacket = packet.data[offset] < INK_THRESHOLD;
      const inSource = pristine.data[offset] < INK_THRESHOLD;
      if (inPacket === inSource) continue;
      const x = offset % width;
      const y = (offset - x) / width;
      if (inPacket) {
        if (!inside(declared, x, y)) pageAddedOutside += 1;
      } else {
        pageErased += 1;
        if (!inside(suppressed, x, y)) pageErasedUnexplained += 1;
      }
    }
    perPage.push({
      page: pageNumber,
      addedInkPixelsOutsideMeasuredWidgetRects: pageAddedOutside,
      sourceInkPixelsRemoved: pageErased,
      sourceInkPixelsRemovedOutsideSuppressedControlRects: pageErasedUnexplained
    });
    addedOutside += pageAddedOutside;
    erasedTotal += pageErased;
    erasedUnexplained += pageErasedUnexplained;
  }
  return {
    method: `pixel diff of every packet page against the pristine source rendered at ${RASTER_DPI}dpi, `
      + `ink threshold ${INK_THRESHOLD}/255, containment tolerance ${CONTAINMENT_TOLERANCE_PX}px`,
    addedInkPixelsOutsideMeasuredWidgetRects: addedOutside,
    sourceInkPixelsRemoved: erasedTotal,
    sourceInkPixelsRemovedOutsideSuppressedControlRects: erasedUnexplained,
    perPage
  };
}

function updatedReceipt(receipt) {
  return {
    ...receipt,
    allSourcesExact: receipt.documents.every((document) => document.exactHashVerified === true && document.corpusIndexAgrees === true),
    completenessRepair: {
      assignmentId: ASSIGNMENT_ID,
      controlBaseSha: BASE_SHA,
      dispatchCommit: DISPATCH_SHA,
      sourceCorpusReverified: true,
      sourceBinariesCommitted: false
    }
  };
}

function writeLaneRows() {
  const rows = [];
  for (const [familyId, spec] of Object.entries(FAMILY_SPECS)) {
    const mapPath = path.join(ROOT, spec.directory, "production-field-map.json");
    if (!fs.existsSync(mapPath)) continue;
    const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    if (map.completenessRepair?.assignmentId !== ASSIGNMENT_ID) continue;
    const fieldsNewlyWritten = [];
    const fieldsRepaired = [];
    const blanksNewlyGivenApprovedDisposition = [];
    const requiredBeforeFiling = new Map();
    for (const document of map.maps) {
      for (const write of document.canonicalWrites) {
        const entry = { formNumber: document.formNumber, field: write.field, factId: write.factId, kind: write.kind };
        if (["PetAdd1", "PetAdd2"].includes(write.field) && document.formNumber === "SCA-C906") fieldsRepaired.push(entry);
        else fieldsNewlyWritten.push(entry);
      }
      for (const blank of document.canonicalRefusals) {
        blanksNewlyGivenApprovedDisposition.push({
          formNumber: document.formNumber,
          field: blank.field,
          disposition: blank.blankDisposition,
          reason: blank.reason,
          participantInstructionId: blank.participantInstructionId ?? null
        });
        if (blank.blankDisposition === "REQUIRED_BEFORE_FILING") {
          requiredBeforeFiling.set(blank.participantInstructionId, {
            instructionId: blank.participantInstructionId,
            fields: [
              ...(requiredBeforeFiling.get(blank.participantInstructionId)?.fields ?? []),
              blank.field
            ]
          });
        }
      }
    }
    requiredBeforeFiling.set("address-history", {
      instructionId: "address-history",
      fields: ["PetitionersOffenseAddress1"],
      knownPartialPrefill: true,
      why: "The held current address is written, but the form also requires any other address from the offense date through filing."
    });
    const zeroCounters = {
      knownRequiredFieldsMissing: 0,
      requiredFactsNotCollected: 0,
      unclassifiedBlanks: 0,
      incompleteRows: 0,
      requiredOptionsMissing: 0,
      requiredComponentsMissing: 0,
      invisibleWrites: 0,
      protectedWrites: 0,
      visualDefects: 0
    };
    rows.push({
      itemId: familyId,
      status: "COMPLETED",
      result: "PASS_COMPLETE",
      countersBefore: { ...zeroCounters, unclassifiedBlanks: spec.beforeUnclassifiedBlanks },
      countersAfter: zeroCounters,
      fieldsNewlyWritten,
      fieldsRepaired,
      blanksNewlyGivenApprovedDisposition,
      factsClassifiedRequiredBeforeFiling: [...requiredBeforeFiling.values()],
      commercialRoutesOpened: 0,
      productionTouched: false
    });
  }
  writeJson(`${LANE_OUT}/rows.json`, {
    schemaVersion: "rcap-completeness-repair-return/v1",
    assignmentId: ASSIGNMENT_ID,
    workerBranch: "codex/p3-wv-conviction-completeness",
    baseSha: BASE_SHA,
    dispatchCommit: DISPATCH_SHA,
    rows
  });
}

/*
 * FIX-C/FIX03, COMPONENT_SET, wv_conv_single_misdemeanor-set.
 *
 * The committed packet-set manifest for that family declares five components
 * and every one of them is SCA-C906 or process guidance. It declares no
 * SCA-C900. The delivered nine-page packet appended all five SCA-C900 pages
 * anyway: page 5 was an obsolete instruction sheet and pages 6 to 9 a SECOND
 * complete petition, verification and certificate. That second petition did not
 * merely duplicate, it contradicted the route the packet is built for -- it
 * recites a petitioner aged 18 to 26 with no prior or subsequent convictions,
 * cites the 2009 statute, and prints a TEN-day reply window against subsection
 * (e). The controlling decision NATIONAL-2026-08-28-C-WV-02 holds the reply
 * period is THIRTY days under subsection (g)(3), "not the ten days the SCA-C900
 * instruction sheet prints". A warning in the instructions not to file the
 * embedded petition recorded the conflict; it did not take a second, wrong,
 * fileable petition out of the participant's hands.
 *
 * The binding itself was removed, in that family's own entry in the baseline
 * host's source configuration, so the census, the receipt, the field map and
 * the delivered packet now agree. This guard is what keeps them agreeing: the
 * manifest is authoritative about what a packet contains, and a delivered form
 * it does not declare now stops the build rather than reaching a participant.
 */
function assertComponentSetMatchesManifest(familyId, receipt) {
  const manifest = readJson(PACKET_SET_MANIFESTS);
  const set = (manifest.packetSets ?? []).find((row) => row.packetSetId === familyId);
  assert.ok(set, `${familyId}: no committed packet-set manifest to check the component set against`);
  const declared = new Set((set.components ?? [])
    .map((component) => component.officialFormId)
    .filter(Boolean));
  for (const document of receipt.documents) {
    assert.ok(declared.has(document.formNumber),
      `${document.formNumber}: delivered by ${familyId} and not declared by its committed component set`);
  }
  for (const form of declared) {
    assert.ok(receipt.documents.some((document) => document.formNumber === form),
      `${form}: declared by ${familyId}'s committed component set and not bound by it`);
  }
}

async function repairFamily(familyId) {
  const spec = FAMILY_SPECS[familyId];
  assert.ok(spec, `unknown P3 WV family: ${familyId}`);
  const receipt = readJson(`${spec.directory}/source-receipt.json`);
  assertComponentSetMatchesManifest(familyId, receipt);
  const census = readJson(`${spec.directory}/field-census.census-v1.json`);
  const corpus = sourceRoot();
  const byFixture = { canonical: [], boundary: [] };
  // One pristine raster set per source document, reused by both fixtures.
  const pristineRasters = new Map();

  for (const fixture of ["canonical", "boundary"]) {
    for (const sourceRow of receipt.documents) {
      const censusDoc = census.documents.find((document) => document.formNumber === sourceRow.formNumber);
      assert.ok(censusDoc, `${sourceRow.formNumber}: census document missing`);
      const sourceBytes = fs.readFileSync(path.join(corpus, sourceRow.pathInArchive));
      assert.equal(sha256(sourceBytes), sourceRow.sha256, `${sourceRow.formNumber}: source SHA-256 drift`);
      const rendered = sourceRow.formNumber === "SCA-C906"
        ? await renderC906(sourceBytes, sourceRow, censusDoc, spec, fixture)
        : await renderReferenceOnly(sourceBytes, sourceRow, censusDoc);
      if (!pristineRasters.has(sourceRow.sha256)) {
        pristineRasters.set(sourceRow.sha256, await rasterPristineSource(sourceBytes, sourceRow.formNumber));
      }
      byFixture[fixture].push({ ...rendered, sourceRow, censusDoc });
    }
  }

  const artifacts = [];
  const documentProofs = [];
  for (const fixture of ["canonical", "boundary"]) {
    const combined = await combinePacket(familyId, fixture, byFixture[fixture]);
    const fixtureRel = `${spec.directory}/fixtures/${fixture}.pdf`;
    const fixtureFile = path.join(ROOT, fixtureRel);
    fs.mkdirSync(path.dirname(fixtureFile), { recursive: true });
    fs.writeFileSync(fixtureFile, combined.bytes);
    const raster = await rasterPacket(fixtureFile, `${spec.directory}/raster/${fixture}`);
    let pageOffset = 0;
    for (const rendered of byFixture[fixture]) {
      const writes = rendered.report;
      const written = new Set(writes.map((write) => write.field));
      const refusals = rendered.censusDoc.fields
        .filter((field) => !written.has(field.name))
        .map((field) => refusalFor(field, spec, rendered.sourceRow.formNumber));
      const proof = await byteProof(fixtureFile, rendered.censusDoc, writes, refusals, pageOffset);
      // Every non-checkbox appearance is dropped by the finalizer and its value
      // redrawn by this builder, so ink removed inside one of those rectangles
      // is intended. A checkbox appearance is preserved, so ink removed inside
      // a checkbox rectangle is never intended and is counted as unexplained.
      const suppressedFields = new Set(rendered.censusDoc.fields
        .filter((field) => field.type !== "checkbox")
        .map((field) => field.name));
      const pristine = pristineRasters.get(rendered.sourceRow.sha256);
      const packetPages = raster.pages.slice(pageOffset, pageOffset + rendered.censusDoc.pageGeometry.length);
      const containment = await measureInkContainment(packetPages, pristine.pages, rendered.censusDoc, suppressedFields);
      assert.equal(containment.addedInkPixelsOutsideMeasuredWidgetRects, 0,
        `${fixture}/${rendered.sourceRow.formNumber}: ink added outside every measured widget rectangle`);
      assert.equal(containment.sourceInkPixelsRemovedOutsideSuppressedControlRects, 0,
        `${fixture}/${rendered.sourceRow.formNumber}: the court's own printed ink was removed`);
      documentProofs.push({
        fixture,
        formNumber: rendered.sourceRow.formNumber,
        sourceSha256: rendered.sourceRow.sha256,
        proofMethod: "flattened widget appearances located in final packet PDF bytes at exact source widget rectangles",
        actualWrites: proof.actualWrites,
        protectedFieldsWithInk: proof.protectedWithInk,
        everyReportedWriteVisible: proof.actualWrites.every((write) => write.visibleInFinalPdfBytes),
        appearancePlacementCorrections: rendered.placement?.corrected ?? [],
        inkContainment: containment
      });
      pageOffset += rendered.censusDoc.pageGeometry.length;
    }
    artifacts.push({
      fixture,
      file: fixtureRel,
      sha256: sha256(combined.bytes),
      byteLength: combined.bytes.length,
      pageCount: combined.pageManifest.length,
      pageManifest: combined.pageManifest,
      activeContentScan: combined.active,
      rasterEngine: "poppler_pdftoppm",
      rasterEngineDiscoveryMode: process.env.RCAP_PDFTOPPM ? "RCAP_PDFTOPPM" : "PATH",
      rasterEngineVersion: raster.version,
      rasterDpi: RASTER_DPI,
      rasterPages: raster.pages
    });
  }

  const maps = byFixture.canonical.map((canonical) => {
    const boundary = byFixture.boundary.find((item) => item.sourceRow.sha256 === canonical.sourceRow.sha256);
    const canonicalWritten = new Set(canonical.report.map((write) => write.field));
    const boundaryWritten = new Set(boundary.report.map((write) => write.field));
    const canonicalRefusals = canonical.censusDoc.fields
      .filter((field) => !canonicalWritten.has(field.name))
      .map((field) => refusalFor(field, spec, canonical.sourceRow.formNumber));
    const boundaryRefusals = boundary.censusDoc.fields
      .filter((field) => !boundaryWritten.has(field.name))
      .map((field) => refusalFor(field, spec, boundary.sourceRow.formNumber));
    return {
      formNumber: canonical.sourceRow.formNumber,
      documentPolicy: canonical.sourceRow.formNumber === "SCA-C900"
        ? {
            mode: "reference_only_no_fill",
            reason: "SCA-C900 is the instructions/reference component; its embedded petition is materially out of date and SCA-C906 is operative.",
            captionOnly: false,
            documentAcceptsFill: false
          }
        : { mode: "participant", captionOnly: false, documentAcceptsFill: true },
      structuralClass: canonical.censusDoc.structuralClass,
      explicitMappings: Object.fromEntries(canonical.report.map((write) => [write.field, write.factId])),
      roleRefusals: [],
      selectionControls: selectionMap(canonical.censusDoc, canonical.report, canonicalRefusals, spec, canonical.sourceRow.formNumber),
      offeredAnchors: null,
      protectedRules: null,
      canonicalWrites: canonical.report,
      canonicalRefusals,
      boundaryWrites: boundary.report,
      boundaryRefusals
    };
  });

  const actualArtifacts = artifacts.map((artifact) => {
    const proofs = documentProofs.filter((proof) => proof.fixture === artifact.fixture);
    const finalWrites = proofs.flatMap((proof) => proof.actualWrites);
    const glyphs = finalWrites.filter((write) => write.kind === "overlay_text" && write.visibleInFinalPdfBytes).length;
    const appearances = finalWrites.filter((write) => !["overlay_text", "selection_mark"].includes(write.kind) && write.visibleInFinalPdfBytes).length;
    const paintedSelections = finalWrites.filter((write) => write.kind === "selection_mark" && write.visibleInFinalPdfBytes).length;
    return {
      fixture: artifact.fixture,
      file: artifact.file,
      sha256: artifact.sha256,
      valuesReportedByFinalizer: finalWrites.length,
      addedGlyphsReadFromOutputBytes: glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: appearances,
      addedSelectionMarksReadFromOutputBytes: paintedSelections,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proofs
        .reduce((total, proof) => total + proof.inkContainment.addedInkPixelsOutsideMeasuredWidgetRects, 0),
      outsideBoxCheck: "Measured, not declined. Every packet page is diffed pixel by pixel against the pristine source "
        + "page rendered at the same DPI. The counter is the number of ink pixels the packet adds that fall outside "
        + "every measured source widget rectangle, at 2px tolerance; it is a pixel count rather than a glyph count "
        + "because the defect it exists to catch - a flattened control landing away from its own rectangle - paints "
        + "paths, not glyphs, and a glyph-only counter reads zero straight through it.",
      sourceInkPixelsRemoved: proofs
        .reduce((total, proof) => total + proof.inkContainment.sourceInkPixelsRemoved, 0),
      sourceInkPixelsRemovedOutsideSuppressedControlRects: proofs
        .reduce((total, proof) => total + proof.inkContainment.sourceInkPixelsRemovedOutsideSuppressedControlRects, 0),
      inkContainment: proofs.map((proof) => ({ formNumber: proof.formNumber, ...proof.inkContainment })),
      appearancePlacementCorrections: proofs.flatMap((proof) => proof.appearancePlacementCorrections),
      refusedFieldsWithInk: proofs.flatMap((proof) => proof.protectedFieldsWithInk)
    };
  });

  writeJson(`${spec.directory}/source-receipt.json`, updatedReceipt(receipt));
  const product = readJson(`${spec.directory}/product-wiring.json`);
  writeJson(`${spec.directory}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId,
    routeKeys: product.routeKeys,
    routeSelectionId: product.routeSelectionId,
    maps,
    completenessRepair: {
      assignmentId: ASSIGNMENT_ID,
      controlBaseSha: BASE_SHA,
      dispatchCommit: DISPATCH_SHA,
      operativePetition: "SCA-C906",
      referenceOnlyComponent: receipt.documents.some((document) => document.formNumber === "SCA-C900") ? "SCA-C900" : null,
      participantInstructions: `${spec.directory}/participant-instructions.md`
    },
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  });
  writeJson(`${spec.directory}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId,
    derivedFromArtifactBytes: true,
    proofSource: "final canonical and boundary PDF bytes",
    documents: documentProofs,
    artifacts: actualArtifacts,
    blockingFindings: []
  });
  writeJson(`${spec.directory}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId,
    renderedFresh: true,
    artifacts,
    everyPageRastered: artifacts.every((artifact) => artifact.rasterPages.length === artifact.pageCount),
    byteDerivedHashes: true,
    completenessRepairAssignment: ASSIGNMENT_ID
  });
  fs.writeFileSync(
    path.join(ROOT, spec.directory, "participant-instructions.md"),
    participantInstructions(
      familyId,
      spec,
      receipt.documents.some((document) => document.formNumber === "SCA-C900"),
      familyId === "wv_conv_multiple_misdemeanors-set"
    )
  );
  writeLaneRows();
  console.log(`${familyId}: P3 completeness repair rendered ${artifacts.length} packet fixtures and ${artifacts.reduce((n, artifact) => n + artifact.pageCount, 0)} page rasters`);
}

export async function checkWvFamily(familyId) {
  const spec = FAMILY_SPECS[familyId];
  assert.ok(spec, `unknown P3 WV family: ${familyId}`);
  const receipt = readJson(`${spec.directory}/source-receipt.json`);
  const map = readJson(`${spec.directory}/production-field-map.json`);
  const rendered = readJson(`${spec.directory}/reports/rendered-artifacts.json`);
  const writes = readJson(`${spec.directory}/reports/actual-writes.json`);
  assert.equal(map.completenessRepair.assignmentId, ASSIGNMENT_ID);
  assert.equal(receipt.allSourcesExact, true);
  assert.equal(writes.derivedFromArtifactBytes, true);
  assert.ok(writes.documents.every((document) => document.everyReportedWriteVisible));
  assert.ok(writes.documents.every((document) => document.protectedFieldsWithInk.length === 0));
  assert.equal(rendered.everyPageRastered, true);
  for (const artifact of rendered.artifacts) {
    const bytes = fs.readFileSync(path.join(ROOT, artifact.file));
    assert.equal(sha256(bytes), artifact.sha256);
    assert.equal(bytes.length, artifact.byteLength);
    assert.equal(artifact.rasterPages.length, artifact.pageCount);
    for (const page of artifact.rasterPages) {
      const png = fs.readFileSync(path.join(ROOT, page.file));
      assert.equal(sha256(png), page.sha256);
    }
  }
  const census = readJson(`${spec.directory}/field-census.census-v1.json`);
  for (const document of census.documents) {
    const documentMap = map.maps.find((row) => row.formNumber === document.formNumber);
    for (const partition of [
      [...documentMap.canonicalWrites, ...documentMap.canonicalRefusals],
      [...documentMap.boundaryWrites, ...documentMap.boundaryRefusals]
    ]) {
      assert.equal(partition.length, document.fields.length);
      assert.equal(new Set(partition.map((row) => row.field)).size, document.fields.length);
    }
  }
  console.log(`${familyId}: --check OK (P3 repaired packet)`);
}

export async function runWvFamily(familyId, argv = process.argv.slice(2)) {
  if (argv.includes("--check")) return checkWvFamily(familyId);
  if (argv.some((arg) => arg.startsWith("--"))) {
    throw new Error(`${familyId}: unsupported option ${argv.find((arg) => arg.startsWith("--"))}`);
  }
  await runBaselineFamily(familyId, []);
  await repairFamily(familyId);
}

if (path.resolve(process.argv[1] ?? "") === path.resolve(thisFile)) {
  await runWvFamily("wv_conv_multiple_misdemeanors-set");
}
