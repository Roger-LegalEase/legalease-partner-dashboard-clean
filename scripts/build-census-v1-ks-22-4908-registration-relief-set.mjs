#!/usr/bin/env node
/**
 * PF20 native build for the Kansas drug-offender registration-relief family.
 *
 * This is a composed family: the Judicial Council registration-relief petition
 * and its KBI cover sheet are required, and the ordinary conviction
 * expungement petition is included only for the combined fixture branch
 * permitted by K.S.A. 22-4908(i). The builder emits internal review evidence;
 * it does not raster, approve, or enable a commercial route.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createKansasBuilder } from "./rcap-official-forms/kansas-statutory-builder.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);

const FAMILY_ID = "ks-22-4908-registration-relief-set";
const JURISDICTION = "KS";
const REGISTRATION_ROUTE = "obligation:unit:KS:ks-22-4908-registration-relief:ks-22-4908-registration-relief-petition";
const COMBINED_ROUTE = "obligation:unit:KS:ks-22-4908-registration-relief:ks-22-4908-combined-expungement";
const ROUTE_LABEL = "Kansas drug-offender registration relief under K.S.A. 22-4908, with conditional combined expungement under K.S.A. 21-6614";
const OUT = "data/rcap-all50/overlays/census-v1/ks/ks-22-4908-registration-relief-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ks-22-4908-registration-relief-set.mjs";
const RETURN_PATH = "data/rcap-grade-a/packet-factory-24h/pf20/ks-22-4908-registration-relief-return-20260913.json";
const OWNER_RECORD = "data/rcap-grade-a/legal-decisions/OWNER_KJC_PERMISSION_ATTESTATION_2026-09-11.json";
const SOURCE_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const SOURCE_ADMISSION = "data/rcap-grade-a/packet-factory-24h/pf20/ks-native-source-index-admission-20260913.json";
const REG_PET = "KSJC-PETITION-RELIEF-FROM-OFFENDER-REGISTRATION-06-2022";
const REG_COVER = "KSJC-ORDER-RELIEF-FROM-OFFENDER-REGISTRATION-COVER-SHEET-06-2022";
const EXP_PET = "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022";

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
    "matter.arrest_date": "2018-04-02",
    "matter.citing_or_arresting_agency": "Topeka Police Department",
    "matter.charge": "Possession of a controlled substance",
    "matter.conviction_date": "2018-06-14",
    "matter.disposition_date": "2019-07-01",
    "answers.disposition": "conviction",
    "answers.currently_required_to_register": true,
    "answers.pending_felony_proceeding": false,
    "answers.felony_in_past_two_years": false,
    "answers.specialty_court_completion": false,
    "answers.combine_expungement": true,
    "answers.not_confined": false,
    "answers.no_subsequent_crimes": null,
    "answers.drug_offense_otherwise_expungement_eligible": true,
    "answers.sex_offender": false,
    "answers.violent_offender": false
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
    "matter.arrest_date": "1998-01-31",
    "matter.citing_or_arresting_agency": "Kansas City Police Department",
    "matter.charge": "Possession of a controlled substance with an unusually long descriptive charge",
    "matter.conviction_date": "1999-02-14",
    "matter.disposition_date": "2001-12-31",
    "answers.disposition": "conviction",
    "answers.currently_required_to_register": true,
    "answers.pending_felony_proceeding": false,
    "answers.felony_in_past_two_years": false,
    "answers.specialty_court_completion": false,
    "answers.combine_expungement": true,
    "answers.not_confined": false,
    "answers.no_subsequent_crimes": null,
    "answers.drug_offense_otherwise_expungement_eligible": true,
    "answers.sex_offender": false,
    "answers.violent_offender": false
  }
};

const documents = [
  {
    componentId: "ks-22-4908-registration-relief-primary-filing-1",
    documentId: REG_PET,
    officialFormId: REG_PET,
    role: "primary_filing",
    officialTitle: "Petition for Relief from Offender Registration",
    revision: "KSJC 06/2022",
    officialSourceUrl: "https://www.kjc.ks.gov/legal-forms/drug-offender-registration-relief",
    corpusPath: "private/Nationwide Record Clearing/LegalEase Kansas/source-gated/KSJC__petition-for-relief-from-offender-registration__rev-2022-06.pdf",
    custody: "ks_historical_recovery_20260913",
    sha256: "9264dc51531cd8eea47fd99b00871ff49205e0f2c9ab10cb0d7420d6ca3cf396",
    byteLength: 401878,
    pages: 4,
    acroFieldCount: 27,
    captionOnly: false,
    participantName: "Petition for Relief from Offender Registration (KSJC 06/2022)",
    whoCompletesIt: "You verify every fact, complete the participant blanks, choose the sworn alternatives, sign and file it in the district court of the county of conviction."
  },
  {
    componentId: "ks-22-4908-registration-relief-cover-sheet-2",
    documentId: REG_COVER,
    officialFormId: REG_COVER,
    role: "cover_sheet",
    officialTitle: "Order of Relief from Offender Registration Cover Sheet",
    revision: "KSJC 06/2022",
    officialSourceUrl: "https://www.kjc.ks.gov/legal-forms/drug-offender-registration-relief",
    corpusPath: "private/Nationwide Record Clearing/LegalEase Kansas/source-gated/KSJC__order-of-relief-from-offender-registration-cover-sheet__rev-2022-06.pdf",
    custody: "ks_historical_recovery_20260913",
    sha256: "0c9c5a751086eee0098925e6e7398f2f0b13dd62cc95bcbffab8732d11b6a0bd",
    byteLength: 217564,
    pages: 1,
    acroFieldCount: 20,
    captionOnly: false,
    participantName: "Order of Relief from Offender Registration Cover Sheet (KSJC 06/2022)",
    whoCompletesIt: "The court and the participant use it for KBI processing after an order; participant identity fields remain subject to the field map and court instructions."
  },
  {
    componentId: "ks-22-4908-registration-relief-primary-filing-3",
    documentId: EXP_PET,
    officialFormId: EXP_PET,
    role: "primary_filing",
    officialTitle: "Petition for Expungement of Conviction or Diversion",
    revision: "KSJC 08/2022",
    officialSourceUrl: "https://www.kjc.ks.gov/legal-forms/expungement-adult/conviction-or-diversion",
    corpusPath: "LegalEase Kansas/Petition for Expungement of Conviction or Diversion 82022.pdf",
    custody: "nationwide_recovery_pool_2026_09_02",
    sha256: "1113f7b64a57d7ca9568f75d04922d94fabbeea6c7c5839402689ed7fc0db07c",
    byteLength: 234581,
    pages: 6,
    acroFieldCount: 35,
    captionOnly: false,
    participantName: "Petition for Expungement of Conviction or Diversion (KSJC 08/2022) — conditional combined component",
    whoCompletesIt: "Use only when the registrable offense is otherwise eligible and you elect the combined K.S.A. 22-4908(i) filing; verify its separate expungement facts and selections."
  },
  {
    componentId: "ks-22-4908-registration-relief-process-guidance-4",
    documentId: "KS-22-4908-REGISTRATION-RELIEF-PROCESS-GUIDANCE",
    officialFormId: null,
    role: "process_guidance",
    participantName: "Preparing the registration-relief and combined-expungement filing",
    whoCompletesIt: "Read it before filing. It prompts for participant facts and explains court-controlled notice, risk assessment and post-filing steps."
  }
];

const RBF = (reason, supply, extra = {}) => ({ kind: "requiredBeforeFiling", reason, supply, ...extra });
const NA = (reason, routeCondition) => ({ kind: "notApplicable", reason, routeCondition });
const ELECTION = (reason) => ({ kind: "election", selectionControl: true, reason });
const OPTIONAL = (reason) => ({ kind: "optional", reason });
const WRITE = (factId, why) => ({ kind: "write", factId, why });
const NARRATIVE = (factId, why, allowProtectedCategories = []) => ({ kind: "narrative", factId, why, ...(allowProtectedCategories.length ? { allowProtectedCategories } : {}) });
const SELECT = (basis) => ({ kind: "select", basis });
const PROTECTED = (reason, selectionControl = false) => ({ kind: "protected", reason, selectionControl });

const FIELDS = {};
const declare = (doc, name, label, policy) => { FIELDS[doc + ":" + name] = { label, ...policy }; };

function registrationPetitionFields() {
  const d = REG_PET;
  declare(d, "DISTRICT COURT OF", "Held county for the registration-relief caption", WRITE("matter.county", "the district court venue in the county where the registrable conviction occurred"));
  declare(d, "Case No", "Original criminal case number in the registration-relief caption", WRITE("matter.case_number", "the case number held for the registrable conviction"));
  declare(d, "Name", "Participant full legal name in the registration-relief caption", WRITE("participant.full_legal_name", "the caption party"));
  declare(d, "1 My full name is", "Item 1 — participant full legal name", WRITE("participant.full_legal_name", "item 1 asks for the petitioner's full name"));
  declare(d, "registration if different than 1 was", "Item 2 — full name at conviction, if different from item 1", RBF("the participant supplies the name used at the time of the registrable conviction, if it differs from item 1", "the full name the conviction record carried, or leave this blank only if it is the same as item 1"));
  declare(d, "3 I am a", "Item 3 — participant race", RBF("the participant supplies the race the verified petition should state", "the race in the words the participant wants the petition to carry"));
  declare(d, "Race", "Item 3 — participant sex", RBF("the participant supplies the sex the verified petition should state", "the sex in the words the participant wants the petition to carry"));
  declare(d, "Sex born in", "Item 3 — year of birth", NARRATIVE("participant.birth_year", "the neutral year-of-birth value derived from the held full date of birth"));
  declare(d, "4 I was convicted of", "Held charge for the registration-relief petition", NARRATIVE("matter.charge", "the held registrable conviction offense; participant must verify it against the conviction record", ["disposition_or_hearing"]));
  declare(d, "offenses requiring registration on", "Held conviction date fact", NARRATIVE("matter.conviction_date", "the held conviction date for the registrable offense; participant must verify it against the conviction record", ["disposition_or_hearing"]));
  declare(d, "Date in", "Held court fact", NARRATIVE("matter.court", "the held judicial district of the convicting court; participant must verify the complete court identity before filing"));
  declare(d, "5", "Item 5 — release-date branch control", ELECTION("the participant chooses between the most recent parole, discharge or release date and the not-confined alternative; the platform does not make that sworn election"));
  declare(d, "My most recent date of parole discharge or release was", "Held release date fact", NARRATIVE("matter.disposition_date", "the held release/discharge date supplied as a fixture fact; participant must verify that the most recent date controls and that non-counting periods are excluded", ["agency"]));
  declare(d, "I was not confined in jail or prison for the offense", "Item 5 — not-confined branch control", ELECTION("the participant makes this sworn alternative; the platform does not decide whether the offense involved confinement"));
  declare(d, "6 I am currently registered as a drug offender in the following counties", "Item 6 — current registration counties", RBF("the petition requires the counties in which the participant is currently registered", "the participant's current registration history, including every county; obtain it from the registering agency or KBI"));
  declare(d, "I have not been arrested convicted or entered into a diversion agreement for any crime", "Item 8 — no subsequent arrest, conviction or diversion alternative", ELECTION("the participant makes this sworn statement from their own registration-period record"));
  declare(d, "I have been arrested convicted or entered into a diversion agreement for the", "Item 8 — subsequent-crime alternative", ELECTION("the participant chooses the alternative if the registration-period record includes an arrest, conviction or diversion"));
  declare(d, "following crimes during the period I was required to register 1", "Item 8 — crimes during the registration period, if the second alternative is chosen", RBF("if the participant chooses the second item 8 alternative, the petition requires the crimes during the registration period", "the complete list from the participant's records; leave blank only when the no-crimes alternative is selected"));
  declare(d, "offense or offenses requiring registration 1", "Item 9 — names of treatment providers and agencies", RBF("K.S.A. 22-4908 requires the names of all treatment providers and agencies that treated the participant for mental health, substance abuse or offense-related behavior since the registrable offense", "the names from the participant's treatment records; LegalEase does not invent providers or inspect the records"));
  declare(d, "to promote the public safety because 1", "Item 10 — participant-authored rehabilitation and public-safety account", RBF("item 10 is a participant-authored showing about circumstances, behavior and treatment history; LegalEase prompts and formats it but never writes the legal account", "the participant's own account, in their own words, of rehabilitation and why registration is no longer necessary to promote public safety"));
  declare(d, "Name Print", "Participant contact block — printed name", WRITE("participant.full_legal_name", "the participant's printed name in the contact block"));
  declare(d, "Address 1", "Participant contact block — street address", WRITE("participant.street_address", "the held street address"));
  declare(d, "Address 2", "Participant contact block — second address line", OPTIONAL("optional participant-authored address content; the platform holds one street-address line and does not invent another"));
  declare(d, "City State Zip", "Participant contact block — city, state and ZIP", WRITE("participant.city_state_zip", "the held city, state and ZIP"));
  declare(d, "Telephone Number", "Participant contact block — telephone", WRITE("participant.phone", "the held telephone number"));
  declare(d, "Fax Number", "Participant contact block — fax", OPTIONAL("optional participant-authored fax content; the platform holds no fax number"));
  declare(d, "Email Address", "Participant contact block — e-mail", WRITE("participant.email", "the held participant e-mail address"));
}

function registrationCoverFields() {
  const d = REG_COVER;
  declare(d, "DEFENDANTS INFORMATION", "KBI cover sheet — participant full legal name", WRITE("participant.full_legal_name", "the participant identity shown to the KBI"));
  declare(d, "undefined", "KBI cover sheet — street address line 1", WRITE("participant.street_address", "the first address line"));
  declare(d, "ADDRESS", "KBI cover sheet — city, state and ZIP line", NARRATIVE("participant.city_state_zip", "the second address line carries the held city, state and ZIP through the native narrative channel"));
  declare(d, "DOB", "KBI cover sheet — date of birth", WRITE("participant.date_of_birth", "the held participant date of birth"));
  for (const [name, value] of [
    ["WHITE", "White"], ["BLACK", "Black"], ["ASIAN", "Asian"],
    ["PACIFIC ISLAND", "Pacific Island"], ["AMERICAN INDIANALASKAN", "American Indian or Alaskan"], ["UNKNOWN", "Unknown"]
  ]) declare(d, name, "KBI cover sheet — race " + value + " selection", ELECTION("only the participant selects the printed race category on this KBI cover sheet"));
  for (const [name, value] of [["HISPANIC", "Hispanic"], ["NONHISPANIC", "Non-Hispanic"], ["UNKNOWN_2", "Unknown"]])
    declare(d, name, "KBI cover sheet — ethnicity " + value + " selection", ELECTION("only the participant selects the printed ethnicity category on this KBI cover sheet"));
  for (let i = 1; i <= 5; i += 1)
    declare(d, "ALIAS NAMES USED " + i, "KBI cover sheet — alias name line " + i, RBF("the participant supplies any other name used in the record, or confirms that there is none", "any alias, former name or other name used in the record for line " + i + "; leave blank when none"));
  declare(d, "Text2", "KBI cover sheet — Social Security number", OPTIONAL("optional participant-authored Social Security number; the platform does not invent it; complete only if the participant chooses to provide it under the official form's instructions"));
  declare(d, "Gender", "KBI cover sheet — gender selection", ELECTION("only the participant selects the printed gender control"));
}

function combinedExpungementFields() {
  const d = EXP_PET;
  declare(d, "JUDICIAL DISTRICT", "Combined expungement caption — judicial district", WRITE("matter.court", "the judicial district held for the registrable conviction"));
  declare(d, "COUNTY KANSAS", "Combined expungement caption — Kansas county", WRITE("matter.county", "the county of the convicting district court"));
  declare(d, "Case No", "Combined expungement caption — original criminal case number", WRITE("matter.case_number", "the case number of the registrable conviction"));
  declare(d, "Name", "Combined expungement caption — participant full legal name", WRITE("participant.full_legal_name", "the caption party"));
  declare(d, "undefined", "Combined expungement item 1 — participant full legal name", WRITE("participant.full_legal_name", "item 1 asks for the petitioner's full name"));
  declare(d, "undefined_2", "Combined expungement item 2 — name at arrest or conviction, if different", RBF("the participant supplies the name the record carried if it differs from item 1", "the full name used at arrest or conviction, or leave blank only if it is the same as item 1"));
  declare(d, "Race", "Combined expungement item 3 — participant race", RBF("the participant supplies the race the petition should state", "the race in the words the participant wants the petition to carry"));
  declare(d, "Sex born in", "Combined expungement item 3 — participant sex", RBF("the participant supplies the sex the petition should state", "the sex in the words the participant wants the petition to carry"));
  declare(d, "Year of Birth", "Combined expungement item 3 — year of birth", NARRATIVE("participant.birth_year", "the neutral four-digit year derived from the held full date of birth"));
  declare(d, "County Kansas on", "Combined expungement item 4 — arrest county", WRITE("matter.county", "the held arrest county; participant must verify it against the arrest record"));
  declare(d, "Date by", "Combined expungement item 4 — arrest date", WRITE("matter.arrest_date", "the held arrest date; participant must verify it against the arrest record"));
  declare(d, "Law Enforcement Agency and charged with the", "Held arresting department fact", NARRATIVE("matter.citing_or_arresting_agency", "the held arresting agency; participant must verify the agency name", ["agency"]));
  declare(d, "undefined_3", "Held charged offense fact", NARRATIVE("matter.charge", "the held charged offense; participant must verify it against the arrest and charging record"));
  declare(d, "on", "Held charge fact", NARRATIVE("matter.charge", "the held conviction offense used for the combined route; participant must verify the journal entry"));
  declare(d, "Date", "Held conviction date fact", NARRATIVE("matter.conviction_date", "the held conviction date; participant must verify the journal entry", ["disposition_or_hearing"]));
  declare(d, "on_2", "Combined expungement item 5 — diversion alternative", NA("the combined fixture is the conviction branch; the diversion alternative is a separate disposition route", "The participant's held disposition is conviction, so this form's diversion alternative does not apply"));
  declare(d, "Date_2", "Combined expungement item 5 — diversion date", NA("the combined fixture is the conviction branch; the diversion date belongs to the unused diversion alternative", "The participant's held disposition is conviction, so the diversion alternative is not reached"));
  declare(d, "undefined_4", "Held court fact", NARRATIVE("matter.court", "the held judicial district of the convicting court; participant must verify the complete court identity"));
  declare(d, "undefined_5", "Held final discharge date fact", NARRATIVE("matter.disposition_date", "the held release/discharge date used for the combined petition's waiting-period facts; participant must verify the controlling date"));
  declare(d, "Check Box1", "Route-determined opening selection", SELECT("The fixture's held disposition is conviction and K.S.A. 21-6614(a)(1) is the conviction branch of the combined petition."));
  declare(d, "Check Box2", "Combined expungement opening request — diversion branch", NA("the diversion opening request belongs to a different disposition route", "The fixture's held disposition is conviction; marking diversion would state a different disposition"));
  declare(d, "Check Box3", "Combined expungement item 8 — ordinary Option A branch", SELECT("The fixture is the ordinary conviction branch with no specialty-court completion; Option B is a separate K.S.A. 21-6614(a)(3) route."));
  for (const [name, period] of [["Check Box4", "one"], ["Check Box5", "three"], ["Check Box6", "five"], ["Check Box7", "ten"]])
    declare(d, name, "Combined expungement item 8 Option A — " + period + "-year selection", RBF("the participant chooses the waiting period that applies to the particular offense and offense-date facts", "the applicable printed waiting-period box after reviewing the official Judicial Council chart and the offense record; LegalEase does not classify the offense"));
  declare(d, "Check Box8", "Combined expungement item 8 — specialty-court Option B", NA("Option B is the separate specialty-court route and is not the ordinary conviction branch used by this fixture", "The fixture records no specialty-court completion; use that separate route if the participant's record says otherwise"));
  declare(d, "I was convicted received a diversion for prostitution and I was acting under", "Combined expungement item 8 — prostitution-coercion alternative", NA("the prostitution-coercion route is a separate K.S.A. 21-6614(b) disposition and is not this registration-relief family", "The registrable conviction fixture is not the prostitution-coercion route"));
  declare(d, "Name Print", "Combined expungement contact block — printed name", WRITE("participant.full_legal_name", "the participant's printed name"));
  declare(d, "Address 1", "Combined expungement contact block — street address", WRITE("participant.street_address", "the held street address"));
  declare(d, "Address 2", "Combined expungement contact block — second address line", OPTIONAL("optional participant-authored address content; the platform holds one street-address line"));
  declare(d, "City State Zip", "Combined expungement contact block — city, state and ZIP", WRITE("participant.city_state_zip", "the held city, state and ZIP"));
  declare(d, "Telephone Number", "Combined expungement contact block — telephone", WRITE("participant.phone", "the held telephone number"));
  declare(d, "Fax Number", "Combined expungement contact block — fax", OPTIONAL("optional participant-authored fax content; no fax fact is held"));
  declare(d, "Email Address", "Combined expungement contact block — e-mail", WRITE("participant.email", "the held participant e-mail address"));
}

registrationPetitionFields();
registrationCoverFields();
combinedExpungementFields();

const SPEC = {
  familyId: FAMILY_ID,
  worklistGroupId: FAMILY_ID,
  trackId: "ks-22-4908-registration-relief",
  buildScript: BUILD_SCRIPT,
  outDir: OUT,
  jurisdiction: JURISDICTION,
  routeKey: REGISTRATION_ROUTE,
  routeKeys: [REGISTRATION_ROUTE, COMBINED_ROUTE],
  routeLabel: ROUTE_LABEL,
  routeSlug: "ks-22-4908-registration-relief",
  legalName: "Petition for Relief from Drug Offender Registration under K.S.A. 22-4908, combined with expungement under K.S.A. 21-6614",
  routeName: "asking the Kansas district court of the county of conviction for drug-offender registration relief and, where elected, a companion conviction expungement",
  statutes: [
    "K.S.A. 22-4908(a)", "K.S.A. 22-4908(b)", "K.S.A. 22-4908(c)", "K.S.A. 22-4908(d)",
    "K.S.A. 22-4908(e)", "K.S.A. 22-4908(f)", "K.S.A. 22-4908(g)", "K.S.A. 22-4908(h)",
    "K.S.A. 22-4908(i)", "K.S.A. 21-6614(f)", "K.S.A. 22-4901 et seq.", "K.S.A. 60-2001"
  ],
  documents,
  labels: Object.fromEntries(Object.entries(FIELDS).map(([key, value]) => [key, value.label])),
  policy: Object.fromEntries(Object.entries(FIELDS).map(([key, value]) => {
    const { label, ...policy } = value;
    return [key, policy];
  })),
  routeGuards: { currentlyRequiredToRegister: true },
  printedDateOrderByField: {
    [REG_PET + ":offenses requiring registration on"]: "month_day_year",
    [REG_PET + ":My most recent date of parole discharge or release was"]: "month_day_year",
    [REG_COVER + ":DOB"]: "month_day_year",
    [EXP_PET + ":County Kansas on"]: "month_day_year",
    [EXP_PET + ":Date"]: "month_day_year",
    [EXP_PET + ":undefined_5"]: "month_day_year"
  },
  republicationRestriction: {
    holdName: null,
    disposition: "LEGAL_CLEAR",
    evidenceType: "owner_attestation",
    documentaryPermissionStoredInRepository: false,
    decisionRecord: OWNER_RECORD,
    attribution: "Official forms: Kansas Judicial Council / Kansas Judicial Branch. Original edition labels, revisions and source hashes are preserved.",
    whatThisBuildDidAboutIt: "Applies the adopted owner attestation; it grants no production, raster, review or completeness authority."
  },
  records: [
    {
      recordId: "legal-design-track-registry:ks-22-4908-registration-relief",
      path: "data/record-clearing/legal-design-track-registry.json",
      role: "the committed legal-design track and packet contract",
      mustContain: [
        '"trackId": "ks-22-4908-registration-relief"',
        '"componentId": "ks-22-4908-registration-relief-primary-filing-1"',
        "a risk assessment at the offender's expense",
        "names of all treatment providers and agencies that have treated you for mental health, substance abuse and offence-related behaviour since the offence"
      ]
    },
    {
      recordId: "legal-design-packet-set-manifest:ks-22-4908-registration-relief-set",
      path: "data/record-clearing/legal-design-packet-set-manifests.json",
      role: "the committed packet component identities and conditional component",
      mustContain: [
        '"packetSetId": "ks-22-4908-registration-relief-set"',
        '"componentId": "ks-22-4908-registration-relief-primary-filing-3"',
        '"officialFormId": "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022"'
      ]
    },
    {
      recordId: "source-index-admission:ks-20260913",
      path: SOURCE_ADMISSION,
      role: "the committed exact-byte source admission",
      mustContain: [
        '"sourceId": "official-form:KSJC-PETITION-RELIEF-FROM-OFFENDER-REGISTRATION-06-2022"',
        '"sha256": "9264dc51531cd8eea47fd99b00871ff49205e0f2c9ab10cb0d7420d6ca3cf396"',
        '"sourceId": "official-form:KSJC-ORDER-RELIEF-FROM-OFFENDER-REGISTRATION-COVER-SHEET-06-2022"'
      ]
    },
    {
      recordId: "owner-kjc-permission-attestation",
      path: OWNER_RECORD,
      role: "adopted owner permission attestation; no documentary permission artifact is claimed",
      mustContain: [
        '"evidenceType": "owner_attestation"',
        '"dispositionOverride": "LEGAL_CLEAR"',
        FAMILY_ID
      ]
    },
    {
      recordId: "master-queue-ks-registration",
      path: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json",
      role: "current queue source and legal-resolution record",
      mustContain: [
        FAMILY_ID,
        '"sourceStatus": "SOURCE_BOUND_BY_HELD_BYTES"',
        '"currentLegalResolution": {'
      ]
    }
  ],
  routeSelectionsMade: [
    {
      document: EXP_PET,
      field: "Check Box1",
      printedContext: "I respectfully request of the Court an order of expungement of my conviction and related arrest records OR diversion record and related arrest records.",
      selected: "conviction",
      because: "The combined fixture is a conviction disposition; the diversion branch is a different disposition and remains not applicable."
    },
    {
      document: EXP_PET,
      field: "Check Box3",
      printedContext: "Item 8 Option A: the ordinary conviction waiting-period branch.",
      selected: "Option A",
      because: "The fixture records no specialty-court completion; Option B is a separate route."
    }
  ],
  routeSelectionNote: "Only the two combined-expungement route controls listed above are marked. The registration petition's release/not-confined and subsequent-crime alternatives, identity taxonomy, treatment facts, item 10 account and expungement waiting-period boxes remain participant choices or required-before-filing facts.",
  instructionsIntro: [
    "This is an internal build candidate and self-help packet. It is not legal advice or a filed petition. Check every held fact against your own records before signing the verified petition.",
    "The registration-relief route is for drug offenders currently required to register. Sex-offender and violent-offender registrants do not receive this route, and the packet does not decide eligibility or the clear-and-convincing showing."
  ],
  obligationTable: [
    ["Where is the registration petition filed?", "File the verified petition with the clerk of the district court in the county where you were convicted or adjudicated of the offense requiring registration. The companion expungement petition follows its own K.S.A. 21-6614 venue and filing rules."],
    ["What is the registration-relief waiting period?", "At least five years after the most recent parole, discharge or release, or five years from conviction if you were not confined. Incarceration and periods of noncompliance do not count."],
    ["What must the court decide?", "The participant must prove by clear and convincing evidence the statutory facts, including no recent felony other than a felony registration violation and no pending felony proceeding, sufficient rehabilitation, and that registration is no longer necessary to promote public safety. LegalEase does not make those findings."],
    ["What does the companion expungement component mean?", "The packet includes the ordinary conviction expungement petition because this fixture elects the combined K.S.A. 22-4908(i) branch and records the registrable offense as otherwise eligible. The combined filing mechanics and whether one or two docket fees apply remain a recorded release question; ask the clerk or counsel before filing."],
    ["What does it cost?", "The registration-relief petition uses the civil docket fee provided by K.S.A. 60-2001. The combined expungement petition carries its own K.S.A. 21-6614(g)(2) docket fee of $176, plus any currently authorized supreme-court charge. Do not assume a single fee or a fee waiver: confirm the current amount and waiver practice with the clerk."],
    ["Who sends notice?", "The court causes notice to the county or district attorney, who notifies any living victim whose address is known or the family of a deceased victim whose address is known. The participant does not invent or perform service."],
    ["Can the court require a risk assessment?", "Yes. The court may require a risk assessment by an agreed or court-approved professional at the participant's own expense."],
    ["What happens after denial?", "A denial bars another registration-relief petition for three years unless the court orders a shorter period."]
  ],
  routeElectionDisclosure: [
    "This candidate carries both required registration-relief forms and the conditional companion expungement form because the fixture selects the combined branch. If the registrable offense is not otherwise eligible or you do not elect to combine, stop and use the registration-only filing path after the route is reviewed.",
    "The companion petition marks the conviction opening request and ordinary Option A. It does not mark diversion, specialty-court Option B, prostitution-coercion, or a waiting-period box.",
    "The registration petition leaves the release-date versus not-confined alternative, the no-subsequent-crimes versus subsequent-crimes alternative, race, sex, aliases, registration counties, treatment providers, and item 10 rehabilitation/public-safety account for the participant."
  ],
  documentsToObtain: [
    ["Your registration history", "Ask the registering law-enforcement agency or KBI for the counties, start date and periods of compliance. The five-year period excludes incarceration and noncompliance."],
    ["Your conviction record", "Ask the clerk of the convicting district court for the offense, date, court and case number."],
    ["Your treatment-provider names", "Use your own records to list every provider or agency that treated you for mental health, substance abuse or offense-related behavior since the registrable offense. LegalEase does not inspect those records."],
    ["Current fee and filing practice", "Ask the clerk or counsel how the registration petition and any combined expungement petition are docketed and what fee or waiver practice applies."]
  ],
  steps: [
    "Read the process-guidance page and confirm that this is a drug-offender registration-relief route.",
    "Compare the printed identity, conviction and arrest facts with your records and correct anything that differs.",
    "Obtain and review your registration history, conviction record and treatment-provider names before completing the required blanks.",
    "Complete the participant elections and required facts on the registration petition, including the release or not-confined branch, subsequent-crime branch, treatment providers and item 10 account.",
    "If the registrable offense is otherwise eligible and you elect the combined route, complete the remaining expungement blanks and choose the waiting-period box from the official form and your records.",
    "Sign and verify the registration petition under penalty of perjury. Do not sign for the court, clerk, prosecutor or KBI.",
    "Ask the clerk or counsel about the combined filing sequence, docketing and fees; file in the required district court venue.",
    "After filing, follow the court's notice and hearing instructions. If the court orders a risk assessment, arrange and pay for it as directed."
  ],
  deliberatelyBlank: [
    "The registration petition signature and date; it is a verified participant statement.",
    "Race, sex, aliases, registration counties, treatment-provider names and the participant's item 10 account.",
    "The release-date versus not-confined choice and the subsequent-crime choice on the registration petition.",
    "All court, clerk, KBI and prosecutor-controlled findings, hearing information, order entries and signatures.",
    "The expungement waiting-period selection boxes; the packet does not classify the offense or choose the period.",
    "The Social Security number, gender and race/ethnicity taxonomy selections on the KBI cover sheet."
  ],
  notTold: [
    "Whether the participant is eligible for relief or has completed five years of substantial compliance.",
    "Whether the clear-and-convincing-evidence standard is met.",
    "What rehabilitation or public-safety account the participant should make.",
    "Whether the registrable offense is otherwise eligible for expungement beyond the held fixture branch.",
    "Whether the two petitions must be one document or two documents in one filing, or whether one or two docket fees apply."
  ],
  stopConditions: [
    "The participant is a sex offender or violent offender registrant.",
    "Five years of substantial compliance is disputed, or incarceration or noncompliance periods are in question.",
    "A recent felony or pending felony proceeding is present.",
    "The county or district attorney opposes the petition, a victim participates, or the court sets a contested hearing.",
    "The court orders a risk assessment.",
    "The participant asks LegalEase to write or assess the rehabilitation or public-safety showing.",
    "The combined offense is not otherwise eligible for expungement.",
    "The participant has immigration consequences or another issue requiring legal advice."
  ],
  whatThisIsNot: "This is an internal review candidate containing exact official forms and held synthetic facts. It is not legal advice, not a filed petition, not a decision that a participant is eligible, and not production approval.",
  guidance: {
    title: "Preparing a Kansas registration-relief and combined-expungement filing",
    intro: [
      "The registration-relief petition is verified. Read every printed fact against your records before you sign.",
      "This page explains the court-controlled parts of the process and the facts the participant must supply. It does not write the rehabilitation or public-safety account."
    ],
    findings: [
      "The registration-relief court applies the statutory five-year and substantial-compliance requirements, including the treatment of periods that do not count.",
      "The participant must address the recent-felony and pending-felony condition described by K.S.A. 22-4908.",
      "The participant must present the own circumstances, behavior and treatment history showing sufficient rehabilitation; the court decides it.",
      "The court decides whether registration is no longer necessary to promote public safety, and may require a risk assessment at the participant's expense."
    ],
    quoted: [
      ["Venue and filing", "The verified petition is filed in the district court of the county where the participant was convicted or adjudicated of the offense requiring registration."],
      ["Treatment providers", "The petition requires the names of all treatment providers and agencies that treated the participant for mental health, substance abuse and offense-related behavior since the offense."],
      ["Notice", "The court causes notice to the county or district attorney, who handles victim notification under the statute. The participant does not perform that service."],
      ["Risk assessment", "The court may require a risk assessment by a professional agreed upon by the parties or approved by the court, at the participant's expense."],
      ["Denial", "A denial bars another petition for three years unless the court orders a shorter period."],
      ["Combined filing", "The offense may be combined with a K.S.A. 21-6614 expungement petition when it is otherwise eligible; the two forms and filing mechanics remain separate questions for the clerk or counsel."]
    ],
    whatThisIsNot: "This page is process guidance. It does not decide eligibility, make a clear-and-convincing showing, draft item 10, or predict a court decision."
  },
  howEachCounterWasTaken: {
    knownRequiredFieldsMissing: "The native Kansas builder counts a declared held fact that its finalizer did not write.",
    requiredFactsNotCollected: "The native completeness contract checks every REQUIRED_BEFORE_FILING row against participant-instructions.md.",
    unclassifiedBlanks: "The native completeness contract classifies every canonical refusal against its declared disposition.",
    incompleteRows: "The native completeness contract groups written and blank rows with rowKeyOf and detects a written row with an unexplained required blank.",
    requiredOptionsMissing: "The native completeness contract detects route-determined selections left blank.",
    requiredComponentsMissing: "The committed packet-set manifest's four components are compared with the bytes this build produces.",
    invisibleWrites: "Saved-byte proof counts flattened widget appearances and extracted guidance text.",
    protectedWrites: "The native completeness contract classifies written labels for protected fields.",
    visualDefects: "Saved-byte measurement checks widget placement and outside-box ink.",
    everyCounterIsMeasured: "No counter is declared zero by prose; the repository's native builder reads the saved artifact bytes and source-bound rows."
  },
  buildFindings: [
    {
      finding: "The three official binaries are resolved by exact current index path, declared custody, SHA-256 and byte length.",
      detail: "Two exact source objects resolve through the admitted partial historical Kansas custody and the companion expungement petition resolves through the partial Nationwide recovery pool. Neither custody is represented as a complete operational Nationwide corpus.",
      blocksBuild: false,
      blocksApprovalForLive: false
    },
    {
      finding: "The registration petition's participant statements remain participant work.",
      detail: "The build writes only held identity/contact and case facts. It leaves the verified signature, release/not-confined choice, subsequent-crime choice, current registration counties, treatment providers and item 10 account for the participant.",
      blocksBuild: false,
      blocksApprovalForLive: false
    },
    {
      finding: "The combined expungement component is conditional and is present only because both synthetic fixtures elect it and record the registrable offense as otherwise eligible.",
      detail: "The companion is a separate K.S.A. 21-6614 petition. Its route-determined conviction and ordinary Option A branches are explicit; its waiting-period classification remains a participant decision.",
      blocksBuild: false,
      blocksApprovalForLive: false
    },
    {
      finding: "The adopted owner attestation resolves the prior KJC commercial-reuse hold for this family.",
      detail: "The owner record is an attestation, not documentary permission. It does not waive source, implementation, completeness, raster, independent-review or production gates.",
      blocksBuild: false,
      blocksApprovalForLive: true
    },
    {
      severity: "release_gate",
      finding: "Combined filing mechanics and fee treatment remain open.",
      detail: "The controlling track records that K.S.A. 22-4908(i) permits combining the petitions but does not state whether courts require one document or two documents in one filing, sequential handling, or one versus two docket fees. The packet tells the participant to confirm this with the clerk or counsel.",
      blocksBuild: false,
      blocksApprovalForLive: true
    }
  ],
  historicalBuildFindings: [],
  counselQuestions: [
    "Do Kansas district courts docket the registration-relief petition and the combined K.S.A. 21-6614 petition as one document, two documents in one filing, or sequential filings, and do they charge one or two docket fees?"
  ],
  reviewersAttention: [
    "Confirm the registration petition remains for a participant currently required to register and that the packet does not silently turn registration relief into ordinary expungement.",
    "Confirm only the conviction and ordinary Option A controls on the companion petition are marked; release/not-confined, subsequent-crime, identity taxonomy, treatment, item 10 and waiting-period controls remain blank.",
    "Read the saved PDFs and participant instructions for all required facts, conditional branch language, service/fee instructions, protected fields, overflow and unresolved combined-filing mechanics.",
    "This PF20 lane does not raster or independently approve its candidate."
  ]
};

export { SPEC, FIXTURES };
export const ROUTE_FACTS = { disposition: "conviction", specialtyCourt: false };

function applyRegistrationPolicy() {
  const permission = JSON.parse(fs.readFileSync(path.join(ROOT, OWNER_RECORD), "utf8"));
  assert.ok(permission.familyIds.includes(FAMILY_ID), "adopted owner permission does not cover the registration-relief family");
  assert.equal(permission.evidenceType, "owner_attestation");
  assert.equal(permission.dispositionOverride, "LEGAL_CLEAR");
  for (const facts of Object.values(FIXTURES)) {
    assert.match(facts["participant.date_of_birth"], /^\d{4}-\d{2}-\d{2}$/);
    facts["participant.birth_year"] = facts["participant.date_of_birth"].slice(0, 4);
    assert.equal(facts["answers.currently_required_to_register"], true);
    assert.equal(facts["answers.combine_expungement"], true);
    facts["answers.pending_felony_proceeding"] ??= false;
    facts["answers.felony_in_past_two_years"] ??= false;
    facts["answers.specialty_court_completion"] ??= false;
  }
}
applyRegistrationPolicy();

export const runFamily = createKansasBuilder(SPEC, FIXTURES, ROUTE_FACTS);

function writeNativeReturn(result) {
  const completedStatus = result.status === "COMPLETED" ? "COMPLETED" : "STOPPED";
  const counters = result.counters ?? Object.fromEntries(Object.keys(SPEC.howEachCounterWasTaken).filter((x) => x !== "everyCounterIsMeasured").map((x) => [x, null]));
  const outputEvidence = fs.existsSync(path.join(ROOT, OUT, "reports/rendered-artifacts.json"))
    ? JSON.parse(fs.readFileSync(path.join(ROOT, OUT, "reports/rendered-artifacts.json"), "utf8"))
    : null;
  const actualWrites = fs.existsSync(path.join(ROOT, OUT, "reports/actual-writes.json"))
    ? JSON.parse(fs.readFileSync(path.join(ROOT, OUT, "reports/actual-writes.json"), "utf8"))
    : null;
  const sourceReceipt = fs.existsSync(path.join(ROOT, OUT, "source-receipt.json"))
    ? JSON.parse(fs.readFileSync(path.join(ROOT, OUT, "source-receipt.json"), "utf8"))
    : null;
  const row = {
    itemId: FAMILY_ID,
    familyId: FAMILY_ID,
    status: completedStatus,
    laneKind: "packet-build",
    lane: "PF20",
    workerBranch: "pf20-ks-22-2410-arrest-20260912b",
    buildScript: BUILD_SCRIPT,
    implementationCommit: "generated-before-commit",
    routeKey: REGISTRATION_ROUTE,
    routeKeys: [REGISTRATION_ROUTE, COMBINED_ROUTE],
    counters,
    allNineCountersZero: result.nineCountersZero === true,
    directory: OUT,
    outputDirectory: OUT,
    artifacts: result.artifactHashes ?? [],
    artifactStatus: result.artifactHashes?.length ? "RENDERED" : "NOT_RENDERED",
    sourcesBound: result.sourcesBound ?? [],
    recordsBound: result.recordsBound ?? [],
    components: result.components ?? documents.map((d) => d.componentId),
    requiredBeforeFiling: result.requiredBeforeFiling ?? null,
    rasterState: "BUILT_RASTER_PENDING",
    rasterEnrolmentRefusal: "packet build candidate awaits independent semantic acceptance and central current-byte raster",
    selectedIndependentVerdict: null,
    terminalClaims: { finalAcceptance: false, terminal: false, production: false },
    commercialRoutesOpened: 0,
    generationAllowed: false,
    productionTouched: false,
    actualFindings: actualWrites,
    sourceReceipt,
    renderedArtifactsEvidence: outputEvidence,
    nextGate: "freeze current bytes and send this complete candidate to an independent semantic reviewer; raster follows the required semantic acceptance gate"
  };
  fs.mkdirSync(path.dirname(path.join(ROOT, RETURN_PATH)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, RETURN_PATH), JSON.stringify({
    schemaVersion: "rcap-packet-build-return/v1",
    recordedAt: "2026-09-13T00:00:00Z",
    lane: "PF20",
    familyId: FAMILY_ID,
    workerBranch: row.workerBranch,
    status: completedStatus,
    rows: [row]
  }, null, 2) + "\n");
}

async function main() {
  const argv = process.argv.slice(2);
  const result = await runFamily(argv);
  if (!argv.includes("--check") && !argv.includes("--verify-deterministic")) writeNativeReturn(result);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "STOPPED" || result.status === "BLOCKED_SOURCE" || result.status === "DRIFT") process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  main().catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}
