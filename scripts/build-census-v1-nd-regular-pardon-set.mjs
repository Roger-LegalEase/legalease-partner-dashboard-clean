#!/usr/bin/env node
/**
 * The North Dakota regular-pardon family — `nd-regular-pardon-set`.
 *
 *   node scripts/build-census-v1-nd-regular-pardon-set.mjs [--check] [--no-raster]
 *
 * One official form:
 *
 *   SFN 14859 (12-2020)  North Dakota Pardon Advisory Board Application
 *
 * The route is `obligation:track-only:ND:nd-regular-pardon`, N.D.C.C. ch.
 * 12-55.1: the Pardon Advisory Board's GENERAL application, an APPLICATION TO
 * AN AGENCY rather than a filing with a court.
 *
 * THIS IS NOT THE MARIJUANA SUMMARY FAMILY AND THE TWO MUST NOT CONVERGE.
 *
 * `nd-summary-marijuana-pardon-set` is built from SFN 61663, a different
 * instrument: one page of widgets, 36 fields, a fixed printed recital that the
 * applicant seeks an unconditional pardon with removal of guilt for possession
 * of a controlled substance-marijuana, and a certification about eligible
 * marijuana offences and a five-year clean period. THIS form is SFN 14859:
 * eight pages, 229 fields, four different kinds of relief to choose between,
 * twenty-four numbered life-history questions, a nine-row criminal-record
 * table, a nine-row disposition table, a seven-row victim table, a five-row
 * employment history and a five-row residence history. It carries none of the
 * marijuana recitals and none of that certification. The two applications ask
 * for different things, recite different eligibility, and are read by the board
 * as different applications. Nothing in this build is copied from that one.
 *
 * FIVE THINGS ABOUT THIS FORM SHAPED THE IMPLEMENTATION.
 *
 * First, IT IS NOT AN EXPUNGEMENT AND THE FORM SAYS SO IN CAPITALS. Its first
 * printed instruction reads "A REQUEST FOR A PARDON WILL NOT EXPUNGE AN
 * INDIVIDUAL'S CRIMINAL HISTORY RECORD", and its closing note adds that the
 * application becomes a public record on receipt and that the hearing is
 * minuted online. participant-instructions.md leads with all of it.
 *
 * Second, TWENTY-EIGHT OF ITS BLANKS WOULD HAVE TAKEN A PARTICIPANT FACT AND
 * MEANT SOMEONE ELSE'S. Measured, not guessed: `decideBinding` was run over all
 * 229 authored field names and returns a participant fact for each of them.
 *
 *   - `NameRow1`..`NameRow7` bind participant.full_legal_name, and they are the
 *     VICTIM NAME column of item 3. Left to the name channel this packet would
 *     have named the applicant as the victim of their own offence, seven times.
 *     This is the worst single defect available on this form.
 *   - `AddressRow1`..`AddressRow5` bind participant.street_address and are the
 *     EMPLOYER'S address in item 11.
 *   - `Telephone NumberRow1`..`Row5` bind participant.phone and are the
 *     EMPLOYER'S telephone number in item 11.
 *   - `City or CountyRow1`..`Row9` bind participant.city and are the VENUE of
 *     each offence in the criminal-record table.
 *   - `Home Telephone Number` and `Work Telephone Number` both bind
 *     participant.phone, which the platform holds unqualified.
 *
 * Every one is refused BY ROLE before anything is rendered, and every one is
 * recorded in reports/blanks-left-for-the-participant.json under
 * nearMissesRefusedByRole rather than quietly avoided.
 *
 * Third, EVERY REPEATING TABLE IS FILLED COMPLETELY OR NOT AT ALL. The
 * criminal-record table asks six things per row across nine rows; the platform
 * holds none of the six. The form's own instruction says an application that is
 * not complete is RETURNED, which can postpone the hearing, so a row carrying
 * one value beside five blanks reads as finished and is not. No cell of any
 * table is written.
 *
 * Fourth, THE RESIDENCE TABLE LOOKS LIKE A FACT THE PLATFORM HOLDS AND IS NOT.
 * Item 18 asks for the last five residences as dated rows: a start date, an end
 * date and an address. The platform holds one CURRENT mailing address and no
 * date for it. A dated row of a residence history is a different fact from a
 * current address, the form does not say whether row 1 is the most recent or
 * the oldest, and writing an address with no dates beside it into an unspecified
 * row would be asserting two things nobody supplied. The whole table is carried
 * to the participant, and the reasoning is recorded rather than assumed.
 *
 * Fifth, THE RELIEF ELECTION IS THE ROUTE'S TO STATE AND IT IS STATED. The form
 * offers Pardon, Commutation of Sentence, Reprieve of Sentence and Remission of
 * Fine. This family's route is the regular pardon, so the packet ticks `Pardon`
 * through the finalizer's settled-selection channel with the route as its
 * stated basis, and declares the other three outside this route by name. A
 * packet built for one statutory route states which route it is rather than
 * asking the participant which one they are on.
 *
 * The social security number, the place of birth and the race the form asks for
 * are refused by the shared semantics before this build reaches them, and the
 * platform holds none of the three. Each is carried to the participant by name.
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
import { finalizeOfficialForm, NonFilingHoldError } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const FAMILY_ID = "nd-regular-pardon-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/nd/nd-regular-pardon-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-nd-regular-pardon-set.mjs";

/*
 * THE CUSTODY THIS FORM ACTUALLY LIVES IN.
 *
 * SFN 14859 is not in the Master Library. Its bytes were fetched on 2026-09-04,
 * the acquisition receipt recorded them, and they were never materialised into a
 * mounted custody -- which is why this family read SOURCE_GENUINELY_MISSING for
 * days while its committed index entry sat there naming the exact path. The
 * archive has since been recovered from the existing authenticated Drive
 * custody and mounted in the Nationwide Recovery Pool. Both roots are tried, in
 * order, and neither is trusted: the digest decides.
 */
const CUSTODY_ROOTS = Object.freeze([
  { id: "NATIONWIDE_RECOVERY_POOL", dir: "private/source-imports/Nationwide_Recovery_Pool_2026-09-02" },
  { id: "MASTER_LIBRARY_SOURCE_DIR", dir: null }
]);

const ROUTE = Object.freeze({
  jurisdiction: "ND",
  routeKey: "obligation:track-only:ND:nd-regular-pardon",
  routeSelectionId: "nd-regular-pardon-set-sfn-14859",
  publicLabel: "Application to the North Dakota Pardon Advisory Board for a pardon",
  authority: "N.D.C.C. ch. 12-55.1; North Dakota Department of Corrections and Rehabilitation form SFN 14859 (12-2020)",
  documents: [
    {
      formNumber: "SFN-14859",
      sourceId: "official-form:SFN-14859",
      declaredSha256: "b88cb559c375d2443c15dd33c19f3f42387010e494ade28fc25bdbfdd75e8d5b",
      declaredByteLength: 211478,
      declaredPath: "LegalEase North Dakota/source-acquisition-2026-09-04/North-Dakota-Pardon-Advisory-Board-Application-1.pdf",
      title: "North Dakota Pardon Advisory Board Application",
      instrumentKind: "primary_filing",
      captionsExtractCleanly: true
    }
  ]
});

const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
/*
 * A branch of the form this route does not use.
 *
 * The completeness contract reaches NOT_APPLICABLE_ON_THIS_ROUTE only from an
 * explicit declaration carrying a NAMED route condition, which is what its own
 * BLANK_DISPOSITIONS entry has always required. Used here for the three relief
 * types this family is not: a regular-pardon packet is not an application for a
 * commutation, a reprieve or a remission of fine.
 */
const OFF_ROUTE = (why, routeCondition) =>
  ({ policy: "off_route", why, routeConditionThatMakesItInapplicable: routeCondition });
/*
 * The one election the ROUTE determines, and which the packet therefore makes.
 *
 * Left blank and declared route-determined, the contract returns
 * ROUTE_OPTION_NOT_SELECTED and it counts -- correctly, because a packet built
 * for one statutory route must state which route it is. So it is ticked, through
 * finalizeOfficialForm's settled-selection channel, with the route as its basis.
 */
const SELECT = (basis, participantBasis) => ({ policy: "select", basis, participantBasis });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const ORDINAL = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"];

/* ---- the criminal-record table, item at the foot of page 1 ---------------- */
/*
 * Nine rows, six things each, and the platform holds none of them. The printed
 * heading is "Please list ALL cases within your North Dakota criminal record",
 * and the Pardon Requested column asks, per case, whether a pardon is sought
 * for THAT case -- which is a fact about the applicant's own record, not about
 * the statute this packet was built for.
 */
const RECORD_ROW = (n) => {
  const nth = ORDINAL[n];
  const S = "Criminal record table (all North Dakota cases)";
  return {
    [`Date SentencedRow${n}`]: {
      section: S, label: `Date Sentenced (case ${n})`,
      ...SUPPLY(`the date you were sentenced in the ${nth} case, exactly as the criminal judgment gives it`)
    },
    [`Case NumberRow${n}`]: {
      section: S, label: `Case Number (case ${n})`,
      ...SUPPLY(`the case number of the ${nth} case, from its criminal judgment`)
    },
    [`City or CountyRow${n}`]: {
      section: S, label: `City or County where the case was prosecuted (case ${n})`,
      ...SUPPLY(`the city or county where the ${nth} case was prosecuted — this is the venue of the case, NOT the city you live in`)
    },
    [`OffenseRow${n}`]: {
      section: S, label: `Offense (case ${n})`,
      ...SUPPLY(`the offence in the ${nth} case, worded as the criminal judgment words it`)
    },
    [`ProsecutorDefenseRow${n}`]: {
      section: S, label: `Prosecutor / Defense counsel (case ${n})`,
      ...SUPPLY(`the name of the prosecutor and of your defence lawyer in the ${nth} case — write "none" for defence counsel if you did not have one`)
    },
    [`undefined_${2 * n + 3}`]: {
      section: S, selection: true, label: `Pardon Requested — No (case ${n})`,
      ...ELECTION(`whether you are asking for a pardon on the ${nth} case is your decision about your own record; the route determines that this is a pardon application, not which of your cases it covers`)
    },
    [`undefined_${2 * n + 4}`]: {
      section: S, selection: true, label: `Pardon Requested — Yes (case ${n})`,
      ...ELECTION(`whether you are asking for a pardon on the ${nth} case is your decision about your own record; the route determines that this is a pardon application, not which of your cases it covers`)
    }
  };
};

/* ---- item 1, the disposition table on page 2 ------------------------------ */
const DISPOSITION_ROW = (n) => {
  const nth = ORDINAL[n];
  const S = "1. Disposition of your case(s)";
  return {
    [`Date SentencedRow${n}_2`]: {
      section: S, label: `Date Sentenced (disposition row ${n})`,
      ...SUPPLY(`the sentencing date of the ${nth} case, repeated here from the table on page 1`)
    },
    [`Case NumberRow${n}_2`]: {
      section: S, label: `Case Number (disposition row ${n})`,
      ...SUPPLY(`the case number of the ${nth} case, repeated here from the table on page 1`)
    },
    [`DispositionRow${n}`]: {
      section: S, label: `Disposition (disposition row ${n})`,
      ...SUPPLY(`what happened in the ${nth} case — the sentence imposed and how it ended. The platform holds no disposition for any case and does not infer one`)
    }
  };
};

/* ---- item 3, the victim table on page 2 ----------------------------------- */
/*
 * `NameRow1`..`NameRow7` bind participant.full_legal_name by field name. This
 * column is the VICTIM'S name. Refused by role, and named in the findings.
 */
const VICTIM_ROW = (n) => {
  const nth = ORDINAL[n];
  const S = "3. Victims";
  return {
    [`NameRow${n}`]: {
      section: S, label: `Victim's name (victim ${n})`,
      ...SUPPLY(`the name of the ${nth} victim, if any of your cases had one. This is the VICTIM'S name and never your own`)
    },
    [`RelationshipRow${n}`]: {
      section: S, label: `Your relationship to this victim (victim ${n})`,
      ...SUPPLY(`your relationship to the ${nth} victim — a stranger, a relative, a former partner, and so on`)
    },
    [`Case NumberRow${n}_3`]: {
      section: S, label: `Case Number this victim relates to (victim ${n})`,
      ...SUPPLY(`the case number the ${nth} victim's case carries`)
    },
    [`undefined_${22 + 2 * n - 1}`]: {
      section: S, selection: true, label: `Do you maintain contact — No (victim ${n})`,
      ...ELECTION("whether you are still in contact with this person is a fact about your life that the platform holds no record of")
    },
    [`undefined_${22 + 2 * n}`]: {
      section: S, selection: true, label: `Do you maintain contact — Yes (victim ${n})`,
      ...ELECTION("whether you are still in contact with this person is a fact about your life that the platform holds no record of")
    }
  };
};

/* ---- item 11, the employment table on page 4 ------------------------------ */
/*
 * `AddressRow*` binds participant.street_address and `Telephone NumberRow*`
 * binds participant.phone. Both columns describe the EMPLOYER, not the
 * applicant. Refused by role.
 */
const EMPLOYMENT_ROW = (n) => {
  const nth = ORDINAL[n];
  const S = "11. Last five employers";
  return {
    [`Date StartedRow${n}`]: { section: S, label: `Date Started (employer ${n})`, ...SUPPLY(`the date you started with the ${nth} employer`) },
    [`Date EndedRow${n}`]: { section: S, label: `Date Ended (employer ${n})`, ...SUPPLY(`the date you left the ${nth} employer, or write "present" if you are still there`) },
    [`OccupationRow${n}`]: { section: S, label: `Occupation (employer ${n})`, ...SUPPLY(`the job you did for the ${nth} employer`) },
    [`EmployerRow${n}`]: { section: S, label: `Employer (employer ${n})`, ...SUPPLY(`the name of the ${nth} employer`) },
    [`AddressRow${n}`]: { section: S, label: `Employer's address (employer ${n})`, ...SUPPLY(`the address of the ${nth} EMPLOYER — this is the employer's address, not your own`) },
    [`Telephone NumberRow${n}`]: { section: S, label: `Employer's telephone number (employer ${n})`, ...SUPPLY(`the telephone number of the ${nth} EMPLOYER — this is the employer's number, not your own`) }
  };
};

/* ---- item 18, the residence table on page 5 ------------------------------- */
const RESIDENCE_ROW = (n) => {
  const nth = ORDINAL[n];
  const S = "18. Last five residences";
  return {
    [`Start DateRow${n}`]: { section: S, label: `Start Date (residence ${n})`, ...SUPPLY(`the date you moved into the ${nth} residence`) },
    [`End DateRow${n}`]: { section: S, label: `End Date (residence ${n})`, ...SUPPLY(`the date you moved out of the ${nth} residence, or write "present" if you still live there`) },
    [`Residence AddressRow${n}`]: {
      section: S, label: `Residence Address (residence ${n})`,
      ...SUPPLY(`the address of the ${nth} residence. The platform holds your CURRENT mailing address and no date for it; a dated row of a residence history is a different fact, and the form does not say whether row 1 is your most recent address or your oldest, so no row is filled in for you`)
    }
  };
};

/* A yes/no pair plus the explanation box the form prints under it. */
const YES_NO = (S, noName, yesName, boxName, question, boxWhat) => ({
  [noName]: { section: S, selection: true, label: `${question} — No`, ...ELECTION(`the answer is a fact about your own history; the platform holds no record of it and does not guess`) },
  [yesName]: { section: S, selection: true, label: `${question} — Yes`, ...ELECTION(`the answer is a fact about your own history; the platform holds no record of it and does not guess`) },
  [boxName]: { section: S, label: `${question} — explanation`, ...SUPPLY(boxWhat) }
});

const FORM_FIELDS = {
  "SFN-14859": {
    /* --- the three boxes at the head of page 1 ---------------------------- */
    "FirstTime Applicant": {
      section: "Check All That Apply", selection: true, label: "First-Time Applicant",
      ...ELECTION("whether this is your first application to the Pardon Advisory Board is a fact about your own history with the board, and the platform holds no record of it")
    },
    "I am scheduled for or was reviewed by the Parole Board on": {
      section: "Check All That Apply", selection: true, label: "I am scheduled for or was reviewed by the Parole Board on ____",
      ...ELECTION("whether the Parole Board has reviewed you, and when, is a fact about your own history with a different board, and the platform holds no record of it")
    },
    "I was previously denied relief by the Pardon Advisory Board and have a change in circumstances see question number 26": {
      section: "Check All That Apply", selection: true,
      label: "I was previously denied relief by the Pardon Advisory Board and have a change in circumstances, since my prior application on ____",
      ...ELECTION("whether the board has denied you before, and when, is a fact about your own history with the board, and the platform holds no record of it")
    },

    /* --- the applicant block ---------------------------------------------- */
    "Applicant Name": { section: "Applicant", label: "Applicant Name", ...WRITE("participant.full_legal_name") },
    "Social Security Number": {
      section: "Applicant", label: "Social Security Number",
      ...SUPPLY("your social security number — the platform does not hold it and will not ask you for it, so write it on the form yourself")
    },
    "Date of Birth": { section: "Applicant", label: "Date of Birth", ...WRITE("participant.date_of_birth") },
    "Place of Birth": { section: "Applicant", label: "Place of Birth", ...SUPPLY("the city and state, or country, where you were born") },
    Race: { section: "Applicant", label: "Race", ...SUPPLY("your race, as you describe it — the platform holds no such fact about you and does not infer one") },
    "Applicant s Address": { section: "Applicant", label: "Applicant's Address", ...WRITE("participant.street_address") },
    City: { section: "Applicant", label: "City", ...WRITE("participant.city") },
    State: { section: "Applicant", label: "State", ...WRITE("participant.state") },
    "ZIP Code": { section: "Applicant", label: "ZIP Code", ...WRITE("participant.zip") },
    /*
     * ALL THREE PHONE BOXES ARE REFUSED, INCLUDING THE TWO THAT WOULD BIND.
     *
     * `Home Telephone Number` and `Work Telephone Number` both return
     * participant.phone from decideBinding. The platform holds ONE unqualified
     * contact number, so writing it would put the same number in two boxes
     * asking different questions and assert it was a home number in the first.
     */
    "Home Telephone Number": { section: "Applicant", label: "Home Telephone Number", ...SUPPLY("your home telephone number, if you have one") },
    "Work Telephone Number": { section: "Applicant", label: "Work Telephone Number", ...SUPPLY("your work telephone number, if you have one") },
    "Cellphone Number": { section: "Applicant", label: "Cellphone Number", ...SUPPLY("your mobile telephone number, if you have one") },
    "List of Former Names or Aliases": {
      section: "Applicant", label: "List of Former Names or Aliases",
      ...SUPPLY("every other name you have been known by, including maiden and former married names — write \"none\" if there are none. Do not repeat the name already written above")
    },
    "Prison Inmate Number": {
      section: "Applicant", label: "Prison Inmate Number",
      ...SUPPLY("your inmate number, and only if you are in custody. Leave it blank if you are not")
    },
    undefined: { section: "Applicant", selection: true, label: "Choose Location — NDSP", ...ELECTION("which facility holds you, if any, is a fact about where you are today and the platform holds no record of it") },
    undefined_2: { section: "Applicant", selection: true, label: "Choose Location — JRCC", ...ELECTION("which facility holds you, if any, is a fact about where you are today and the platform holds no record of it") },
    undefined_3: { section: "Applicant", selection: true, label: "Choose Location — MRCC", ...ELECTION("which facility holds you, if any, is a fact about where you are today and the platform holds no record of it") },
    undefined_4: { section: "Applicant", selection: true, label: "Choose Location — DWCRC", ...ELECTION("which facility holds you, if any, is a fact about where you are today and the platform holds no record of it") },

    /* --- the relief requested: the one election this route determines ------ */
    Pardon: {
      section: "Relief requested", selection: true, label: "Pardon (the relief this packet applies for)",
      ...SELECT(
        "this packet is built for the route obligation:track-only:ND:nd-regular-pardon — an application for a PARDON to "
        + "the Pardon Advisory Board under N.D.C.C. ch. 12-55.1. The route determines which of the form's four relief "
        + "types is sought, so the packet states it rather than asking the applicant which route they are on.",
        /*
         * WHAT THE PARTICIPANT IS TOLD, IN WORDS ADDRESSED TO THEM.
         *
         * The sentence above is the machine basis and it belongs in the field map,
         * the byte proof and the findings. It names a route key, and a route key is
         * this factory's vocabulary rather than the applicant's. Printing it in a
         * document addressed to the applicant would be putting internal machinery in
         * front of the person filling the form in, which is a defect no counter
         * looks for. The two say the same thing; only one of them is written to be
         * read by the applicant.
         */
        "This packet was prepared as an application for a **pardon** — the relief the North Dakota Pardon Advisory "
        + "Board grants under N.D.C.C. ch. 12-55.1 — so that box is ticked for you. Check that a pardon is what you "
        + "want before you send it.")
    },
    "Commutation of Sentence": {
      section: "Relief requested", selection: true, label: "Commutation of Sentence",
      ...OFF_ROUTE(
        "a commutation is a different relief from a pardon: N.D.C.C. 12-55.1-01(1) defines it as changing a sentence to a less severe punishment, where a pardon removes the punishment or custody",
        "this packet is built for the regular-pardon route obligation:track-only:ND:nd-regular-pardon and ticks Pardon; commutation of sentence is a separate branch of SFN 14859 that this route does not use")
    },
    "Reprieve of Sentence": {
      section: "Relief requested", selection: true, label: "Reprieve of Sentence",
      ...OFF_ROUTE(
        "a reprieve is a different relief from a pardon: N.D.C.C. 12-55.1-01(6) defines it as a temporary relief from or postponement of the execution of a sentence",
        "this packet is built for the regular-pardon route obligation:track-only:ND:nd-regular-pardon and ticks Pardon; reprieve of sentence is a separate branch of SFN 14859 that this route does not use")
    },
    "Remission of Fine": {
      section: "Relief requested", selection: true, label: "Remission of Fine",
      ...OFF_ROUTE(
        "a remission of fine is a different relief from a pardon: N.D.C.C. 12-55.1-01(5) defines it as a release or partial release of a fine",
        "this packet is built for the regular-pardon route obligation:track-only:ND:nd-regular-pardon and ticks Pardon; remission of fine is a separate branch of SFN 14859 that this route does not use")
    },

    /* --- the criminal-record table, nine rows ----------------------------- */
    ...RECORD_ROW(1), ...RECORD_ROW(2), ...RECORD_ROW(3), ...RECORD_ROW(4), ...RECORD_ROW(5),
    ...RECORD_ROW(6), ...RECORD_ROW(7), ...RECORD_ROW(8), ...RECORD_ROW(9),

    /* --- 1. the disposition table, nine rows ------------------------------ */
    ...DISPOSITION_ROW(1), ...DISPOSITION_ROW(2), ...DISPOSITION_ROW(3), ...DISPOSITION_ROW(4), ...DISPOSITION_ROW(5),
    ...DISPOSITION_ROW(6), ...DISPOSITION_ROW(7), ...DISPOSITION_ROW(8), ...DISPOSITION_ROW(9),

    /* --- 2. the applicant's own account ----------------------------------- */
    2: {
      section: "2. Your version of the crime(s)", label: "2. Tell us your version of the crime(s) for which you are seeking a pardon",
      ...SUPPLY("your own account of the offence or offences you are asking to be pardoned. This is yours to write; the platform will not draft a version of your crime for you")
    },

    /* --- 3. the victim table, seven rows ---------------------------------- */
    ...VICTIM_ROW(1), ...VICTIM_ROW(2), ...VICTIM_ROW(3), ...VICTIM_ROW(4), ...VICTIM_ROW(5),
    ...VICTIM_ROW(6), ...VICTIM_ROW(7),

    /* --- 4. victim contact ------------------------------------------------ */
    4: {
      section: "4. Recent victim contact", label: "4. If contact is maintained with the above-mentioned victims, include most recent contact information",
      ...SUPPLY("the most recent contact information for any victim you are still in contact with, and only if you are")
    },

    /* --- 5 to 10, the history questions ----------------------------------- */
    5: {
      section: "5. Age at first arrest", label: "5. How old were you when you were first arrested?",
      ...SUPPLY("how old you were when you were first arrested")
    },
    ...YES_NO("6. Juvenile correctional facility", "No", "Yes If yes please explain below", "6",
      "6. Have you ever been in a juvenile correctional facility?",
      "if you have been in a juvenile correctional facility, explain — which facility, when, and for how long"),
    ...YES_NO("7. Prison", "No_2", "Yes If yes please explain below_2", "7",
      "7. Have you ever been in prison?",
      "if you have been in prison, explain — which institution, when, and for how long"),
    ...YES_NO("8. Write-ups in prison", "No_3", "Yes If yes please explain below_3", "8",
      "8. Have you ever received write-ups while in prison?",
      "if you received write-ups in prison, explain what they were for and how they were resolved"),
    ...YES_NO("9. Probation or parole revoked", "No_4", "Yes  If yes please explain", "below",
      "9. Have you ever had probation or parole revoked (supervised or unsupervised)?",
      "if your probation or parole was revoked, explain when and why"),
    ...YES_NO("10. Record of violence", "No_5", "Yes If yes please explain below_4", "10 Do you have any record of violence",
      "10. Do you have any record of violence?",
      "if you have any record of violence, explain it"),

    /* --- 11. employment, five rows ---------------------------------------- */
    ...EMPLOYMENT_ROW(1), ...EMPLOYMENT_ROW(2), ...EMPLOYMENT_ROW(3), ...EMPLOYMENT_ROW(4), ...EMPLOYMENT_ROW(5),

    "12 What job skills do you have": {
      section: "12. Job skills", label: "12. What job skills do you have?",
      ...SUPPLY("the job skills you have")
    },
    ...YES_NO("13. Fired from employment", "No_6", "Yes If yes please explain below_5", "13 Have you ever been fired from employment",
      "13. Have you ever been fired from employment?",
      "if you have been fired from a job, explain when and why"),
    "14 Tell us about your education include high school and college": {
      section: "14. Education", label: "14. Tell us about your education (include high school and college)",
      ...SUPPLY("your education, including high school and college")
    },
    "credit rating repossessions and if you have been on any public assistance": {
      section: "15. Financial situation", label: "15. Tell us about your financial situation (income, net worth, bankruptcies, credit rating, repossessions, public assistance)",
      ...SUPPLY("your financial situation — all sources of income, estimated net worth, any bankruptcies, your credit rating, any repossessions, and whether you have been on public assistance")
    },
    "relationships your children foster care placement etc": {
      section: "16. Family and relationships", label: "16. Tell us about your childhood, your parents, siblings, marriages or relationships, your children, foster care placement",
      ...SUPPLY("your childhood, your parents and your relationship with them now, your siblings, your marriages or relationships, your children, and any foster care placement")
    },
    "17 Tell us what you do in your leisure time hobbies groups you belong to how you spend a typical day": {
      section: "17. Leisure time", label: "17. Tell us what you do in your leisure time (hobbies, groups you belong to, how you spend a typical day)",
      ...SUPPLY("what you do in your leisure time — hobbies, groups you belong to, and how you spend a typical day")
    },

    /* --- 18. residences, five rows ---------------------------------------- */
    ...RESIDENCE_ROW(1), ...RESIDENCE_ROW(2), ...RESIDENCE_ROW(3), ...RESIDENCE_ROW(4), ...RESIDENCE_ROW(5),

    "acquaintances have been involved in criminal activity": {
      section: "19. Friends", label: "19. Tell us about your friends (names of close friends, what you do together, whether they have been involved in criminal activity)",
      ...SUPPLY("your friends — the names of close friends, what you do when you are with them, and whether any friends or acquaintances have been involved in criminal activity")
    },
    "20 Tell us about your use of chemicals alcohol drugs treatment etc": {
      section: "20. Chemical use", label: "20. Tell us about your use of chemicals (alcohol, drugs, treatment)",
      ...SUPPLY("your use of alcohol and drugs, and any treatment you have had")
    },
    "medications taken suicide thoughts or attempts etc": {
      section: "21. Mental health", label: "21. Tell us about any mental health conditions (evaluations, diagnoses, medications, suicidal thoughts or attempts)",
      ...SUPPLY("any mental health conditions you have or may have had, including psychological evaluations, diagnoses, medications taken, and any suicidal thoughts or attempts")
    },
    "22 Tell us about any medical conditions": {
      section: "22. Medical conditions", label: "22. Tell us about any medical conditions",
      ...SUPPLY("any medical conditions you have")
    },
    "23 Tell us what is the reason or justification for your request be specific as to your reasons for relief": {
      section: "23. Reason for the request", label: "23. Tell us the reason or justification for your request (be specific as to your reasons for relief)",
      ...SUPPLY("why you are asking for a pardon, specifically. This is the heart of the application and it is yours to write; the platform holds no reason for your request and will not invent one")
    },
    "circumstances since your prior application that would present a compelling need for relief": {
      section: "24. Reapplication", label: "24. If reapplying: list specific changes in your circumstances since your prior application that present a compelling need for relief",
      ...SUPPLY("what has changed in your circumstances since your last application, and only if you are reapplying. Leave it blank if this is your first application")
    },

    /* --- signature -------------------------------------------------------- */
    "Signature of Applicant": {
      section: "Signature", label: "Signature of Applicant",
      ...PROTECT(SIGNATURE, "signature or date field; never prefilled — you sign it yourself, and your signature is also your consent to a criminal history background check, which may include a fingerprint-based check")
    },
    Date: {
      section: "Signature", label: "Signature date",
      ...PROTECT(SIGNATURE, "signature or date field; never prefilled — you date it on the day you sign")
    }
  }
};

/* ---- fixtures ------------------------------------------------------------ */
const PER_DOCUMENT_FACTS = { canonical: {}, boundary: {} };

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "412 Rosser Avenue",
    "participant.city": "Bismarck",
    "participant.state": "ND",
    "participant.zip": "58501"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Grand Forks",
    "participant.state": "North Dakota",
    "participant.zip": "58203-2214"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ------------------------------------------------------ */
/*
 * BOUND BY CONTENT DIGEST, AND ONLY BY CONTENT DIGEST.
 *
 * The committed corpus index carries this binary with formNumber null and
 * assetClass null -- it was indexed from the recovery pool, where the files are
 * named as they were downloaded rather than filed under a form slug. So there
 * is no form number to match on and no need for one: the index entry, the
 * queue row, the acquisition receipt and the rematerialization record all name
 * the same SHA-256. That digest is the identity, the file on disk is hashed
 * here, and a mismatch is a stop rather than a substitution.
 */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const resolved = [];
  const failures = [];

  for (const wanted of ROUTE.documents) {
    const entries = all.filter((e) => e.sha256 === wanted.declaredSha256);
    const tried = [];
    let bound = null;

    // Every indexed path that carries this digest, plus the declared path, in
    // deterministic order. The digest is re-checked at each one regardless.
    const candidatePaths = [...new Set([...entries.map((e) => e.path), wanted.declaredPath])].sort();

    for (const rel of candidatePaths) {
      for (const root of CUSTODY_ROOTS) {
        const dir = root.id === "MASTER_LIBRARY_SOURCE_DIR"
          ? (process.env.MASTER_LIBRARY_SOURCE_DIR ?? null)
          : root.dir;
        if (!dir) { tried.push({ root: root.id, why: "no directory configured for this custody in this container" }); continue; }
        const abs = path.resolve(ROOT, dir, rel);
        if (!fs.existsSync(abs)) { tried.push({ root: root.id, path: abs, why: "not present in this custody" }); continue; }
        const bytes = fs.readFileSync(abs);
        const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
        if (sha256 !== wanted.declaredSha256) { tried.push({ root: root.id, path: abs, why: `SHA-256 drift: holds ${sha256}` }); continue; }
        if (bytes.length !== wanted.declaredByteLength) {
          tried.push({ root: root.id, path: abs, why: `byte length ${bytes.length}, declared ${wanted.declaredByteLength}` });
          continue;
        }
        bound = { rel, abs, bytes, sha256, custodyRoot: root.id, indexEntry: entries.find((e) => e.path === rel) ?? null };
        break;
      }
      if (bound) break;
    }

    if (!bound) {
      failures.push({
        sourceId: wanted.sourceId, formNumber: wanted.formNumber,
        expectedSha256: wanted.declaredSha256, declaredPath: wanted.declaredPath,
        pathsTried: tried, why: "no mounted custody holds these exact bytes"
      });
      continue;
    }

    resolved.push({
      ...wanted, pathInArchive: bound.rel, boundFromCustody: bound.custodyRoot,
      custody: bound.indexEntry?.custody ?? null, custodyType: bound.indexEntry?.custodyType ?? null,
      revision: bound.indexEntry?.revision ?? null,
      sha256: bound.sha256, byteLength: bound.bytes.length, bytes: bound.bytes,
      acroFieldCount: bound.indexEntry?.acroFieldCount ?? null,
      pageCount: bound.indexEntry?.pageCount ?? null,
      absolutePath: bound.abs
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
       * WHETHER THE FORM SHOWS THIS WIDGET AT ALL. Bit 1 is Invisible, bit 2 is
       * Hidden and bit 6 is NoView; any of the three means a value written here
       * would be invisible ink. Read from the pinned binary, and asserted
       * against every write below.
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
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getSelected === "function") { const s = field.getSelected(); sourceValue = Array.isArray(s) ? (s.length ? s : null) : (s ?? null); }
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }
    rows.push({
      key: name, name, page: widgets[0]?.page ?? null, widgets, sourceValue,
      hiddenUntilTheFormRevealsIt: widgets.some((w) => w.hiddenUntilTheFormRevealsIt === true),
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      /*
       * The SHARED type vocabulary, not pdf-lib's class name. rcap-field-semantics
       * writes only WRITABLE_PDF_TYPES = {"text","dropdown"}, and pdf-lib calls a
       * text field PDFTextField, so passing the lowercased class name refuses
       * every write with a reason that reads like a defect in the form.
       */
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
      isSelectionControl: entry.selection === true
        || field.constructor.name === "PDFCheckBox" || field.constructor.name === "PDFRadioGroup",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      basis: entry.basis ?? null, participantBasis: entry.participantBasis ?? null,
      routeConditionThatMakesItInapplicable: entry.routeConditionThatMakesItInapplicable ?? null,
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
function factsFor(source, fixtureName) {
  return { ...FIXTURES[fixtureName], ...(PER_DOCUMENT_FACTS[fixtureName]?.[source.formNumber] ?? {}) };
}

async function renderDocument(source, census, fixtureName) {
  const facts = factsFor(source, fixtureName);
  const writable = census.rows.filter((r) => r.policy === "write");
  const settled = census.rows.filter((r) => r.policy === "select");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  /*
   * The settled selection must NOT appear in unwritableFields. finalizeOfficialForm
   * checks unwritableByRole first and refuses a settled selection that is in it, so
   * a build that listed every non-write field would silently fail to tick the box
   * it declared the route determines -- and then report the box as an election.
   */
  const writableNames = new Set([...writable, ...settled].map((r) => r.name));
  const unwritableFields = census.rows.filter((r) => !writableNames.has(r.name)).map((r) => ({ field: r.name }));
  const selectionsFromHeldFacts = Object.fromEntries(settled.map((r) => [r.name, { checked: true, basis: r.basis }]));

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields, selectionsFromHeldFacts,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: source.title
  });
  if (process.env.ND_DEBUG_RENDER) {
    console.log(`-- ${source.formNumber} ${fixtureName}: written=${report.written.length} refused=${report.refused.length}`);
    for (const r of report.refused) console.log(`   ${r.field ?? r.anchor}: ${r.reason}${r.category ? ` (${r.category})` : ""}`);
  }
  return { bytes, report };
}

/* ---- byte proof ------------------------------------------------------------ */
/*
 * HOW A TICK IS MEASURED, AND WHY NOT THE OBVIOUS WAY.
 *
 * The obvious way does not work. flattenedWidgets returns one item per widget
 * with its drawn TEXT, and a ticked box draws no text -- it draws an appearance.
 * Asking whether an item exists at the box's rectangle returns true for all four
 * relief boxes whether they are ticked or not, so a build that checked it would
 * report a route election as proved while the bytes might carry nothing.
 *
 * What IS decisive is the flattened appearance's own content stream. Flattening
 * stamps each widget's current appearance into a page XObject, so an unticked box
 * leaves a zero-byte stream and a ticked one leaves the operators that draw the
 * mark. Measured on this form: `Pardon` carries 34 bytes in the delivered
 * canonical bytes and 0 in the pinned source flattened the same way; every other
 * box is 0 in both.
 *
 * So both readings below come from comparing the OUTPUT's appearance stream
 * against the PINNED SOURCE's for the same widget. That also gives the general
 * check for free: any field the map refused whose appearance stream grew is a
 * mark this build made on a box it said it would not touch.
 */
async function flattenedSourceOf(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  try { doc.getForm().flatten(); } catch { /* a form that will not flatten leaves no source ink to compare against */ }
  const bytes = await doc.save({ useObjectStreams: false, updateMetadata: false });
  const tmp = path.join(ROOT, `.nd-regular-pardon-source-ink-${source.formNumber}.pdf`);
  fs.writeFileSync(tmp, bytes);
  try {
    return { widgets: await flattenedWidgets(tmp), appearanceBytes: await appearanceStreamBytes(tmp) };
  } finally { fs.unlinkSync(tmp); }
}

/** Byte length of every flattened appearance XObject, keyed `page:name`. */
async function appearanceStreamBytes(file) {
  const { PDFName } = require("pdf-lib");
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true });
  const out = new Map();
  doc.getPages().forEach((page, pi) => {
    const xo = page.node.Resources()?.get(PDFName.of("XObject"));
    if (!xo) return;
    for (const [k, ref] of xo.entries()) {
      const stream = doc.context.lookup(ref);
      let length = null;
      try { const c = stream.getContents ? stream.getContents() : null; length = c ? c.length : null; } catch { length = null; }
      out.set(`${pi + 1}:${k.asString().replace(/^\//, "")}`, length);
    }
  });
  return out;
}

const appearanceAt = (widgets, page, rect) =>
  widgets.find((w) => w.page === page && Math.abs(w.x - rect.x) < 1.5 && Math.abs(w.y - rect.y) < 1.5) ?? null;

async function byteProof(source, census, artifactBytes, report, fixtureName, pinned = { widgets: [], appearanceBytes: new Map() }) {
  const facts = factsFor(source, fixtureName);
  const sourceInk = pinned.widgets ?? [];
  const tmp = path.join(ROOT, `.nd-regular-pardon-byte-proof-${source.formNumber}-${fixtureName}.pdf`);
  fs.writeFileSync(tmp, artifactBytes);
  let widgets = [];
  let outBytes = new Map();
  try {
    widgets = await flattenedWidgets(tmp);
    outBytes = await appearanceStreamBytes(tmp);
  } finally { fs.unlinkSync(tmp); }
  /* Appearance-stream growth per widget: output minus pinned source. */
  const markGrowth = (page, rect) => {
    const o = appearanceAt(widgets, page, rect);
    const p = appearanceAt(sourceInk, page, rect);
    const ob = o ? (outBytes.get(`${page}:${o.appearance}`) ?? null) : null;
    const pb = p ? ((pinned.appearanceBytes ?? new Map()).get(`${page}:${p.appearance}`) ?? null) : null;
    return { outputAppearanceStreamBytes: ob, pinnedSourceAppearanceStreamBytes: pb, grew: (ob ?? 0) > (pb ?? 0) };
  };
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  const selectionMarks = [];
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
          drawnText: text, expected: facts[r.fact] ?? null,
          matchesExpected: ink === String(facts[r.fact] ?? "").trim()
        });
        continue;
      }
      /*
       * A TICKED BOX IS A MARK, NOT A GLYPH, AND IS MEASURED AS ITS OWN THING.
       *
       * The check mark is drawn from the widget's ZapfDingbats appearance. Counting
       * it as an added glyph would inflate addedGlyphsReadFromOutputBytes, which is
       * supposed to measure participant text; not measuring it at all would leave
       * the packet asserting a route election it never proved it made.
       */
      if (written.has(r.name) && r.policy === "select") {
        const g = markGrowth(wdg.page, wdg.rect);
        selectionMarks.push({
          field: r.key, page: wdg.page, rect: wdg.rect, section: r.section,
          effectiveLabel: r.effectiveLabel, basis: r.basis,
          ...g,
          markDrawnInOutputBytes: g.grew,
          measuredBy: "the flattened appearance XObject's own content-stream length in the delivered bytes, against the same widget in the pinned source flattened the same way. A ticked box draws operators; an unticked one leaves a zero-byte stream."
        });
        continue;
      }
      /*
       * A MARK ON A BOX THE MAP REFUSED. Measured the same way as the tick, and
       * for the same reason: a checkbox draws no text, so the ink test below can
       * never see one. Without this, a stray tick on Commutation of Sentence --
       * a different statutory relief -- would pass every counter.
       */
      if (r.isSelectionControl) {
        const g = markGrowth(wdg.page, wdg.rect);
        if (g.grew) {
          refusedFieldsWithInk.push({
            fieldId: r.key, page: wdg.page, drawnText: [],
            markGrowth: g,
            why: "a selection control the map refused carries a drawn appearance in the output bytes that the pinned source does not"
          });
        }
        continue;
      }
      if (ink.length === 0) continue;
      if (r.sourceValue !== null && r.sourceValue !== undefined) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text, sourceValue: r.sourceValue,
          note: "the pinned source already carries this value; flattening materialises the form's own default"
        });
        continue;
      }
      const inSource = drawnAt(sourceInk, { page: wdg.page, rect: wdg.rect }).map((d) => d.text).filter(Boolean);
      if (inSource.join("").trim() === ink) {
        documentAuthoredAppearances.push({
          field: r.key, page: wdg.page, rect: wdg.rect, drawnText: text, sourceAppearanceText: inSource,
          note: "the pinned source's own widget appearance draws exactly this text; flattening materialises the form's own hint, and this build wrote nothing here"
        });
        continue;
      }
      refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: text });
    }
  }
  return { actualWrites, selectionMarks, refusedFieldsWithInk, documentAuthoredAppearances, glyphs, appearances: widgets.length };
}

/* ---- field map ------------------------------------------------------------- */
function mapFor(source, census, report) {
  const writtenNames = new Set(report.written.map((w) => w.field));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];
  const routeDeterminedSelections = [];
  const captionsClean = source.captionsExtractCleanly === true;

  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`.replace(/\[\d+\]/g, ""),
      acroFieldName: r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.effectiveLabel, printedLine: r.effectiveLabel,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel,
      captionBasis: captionsClean
        ? "printed_caption_read_from_this_form_own_text_stream_plus_authored_acroform_field_name"
        : "authored_acroform_field_name_plus_printed_section, because this form's text stream is scrambled",
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

    /*
     * The route election this packet MAKES. It is a write, not a blank: it is
     * listed among canonicalWrites so the completeness count does not read it as
     * an unmade election, and separately in routeDeterminedSelections so a
     * reviewer can see the mark and the basis for it in one place.
     */
    if (r.policy === "select") {
      if (writtenNames.has(r.name)) {
        canonicalWrites.push({
          ...base, factId: null, kind: "selection_settled_from_route",
          routeDetermined: true, selectionMade: true, basis: r.basis, participantBasis: r.participantBasis
        });
        routeDeterminedSelections.push({
          document: source.formNumber, field: base.field, page: r.page,
          section: r.section, label: r.effectiveLabel, selected: true,
          basis: r.basis, participantBasis: r.participantBasis
        });
      } else {
        /* Declared route-determined and NOT marked is exactly the defect
         * requiredOptionsMissing counts. It is reported as one rather than
         * softened into an election. */
        selectionControls.push({
          ...base, selectionId: base.field, kind: "selection_control", type: r.type,
          widgets: r.widgets, disposition: "explicit_refusal",
          reason: "the route determines this election and the finalizer did not mark it",
          category: null, completenessClass: null, class: null,
          requiredBeforeFiling: false, routeDetermined: true
        });
      }
      continue;
    }

    /* A branch of the form this route does not use. */
    if (r.policy === "off_route") {
      const row = {
        ...base, reason: r.why, category: null, completenessClass: null, class: null,
        disposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
        completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
        routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable,
        requiredBeforeFiling: false, routeDetermined: false, why: r.why
      };
      if (r.isSelectionControl) selectionControls.push({ ...row, selectionId: base.field, kind: "selection_control", type: r.type, widgets: r.widgets });
      else canonicalRefusals.push(row);
      continue;
    }

    if (r.isSelectionControl && r.policy !== "supply") {
      const cls = r.policy === "protect" ? r.refusalClass : PARTICIPANT_ELECTION;
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
    captionBasis: captionsClean ? "printed_caption_from_this_document_text_stream" : "authored_field_name_and_printed_section",
    explicitMappings: Object.fromEntries(canonicalWrites.filter((w) => w.factId).map((w) => [w.field, w.factId])),
    roleRefusals: [], selectionControls, routeDeterminedSelections, canonicalWrites, canonicalRefusals,
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
      // Forwarded exactly as verify-packet-completeness.mjs forwards them, so this
      // count and the independent one ask the contract the same question.
      routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable ?? null,
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
    /*
     * A ROUTE ELECTION THE FINALIZER SAYS IT MARKED AND THE BYTES DO NOT DRAW IS
     * AN INVISIBLE WRITE. It is measured per mark rather than folded into the
     * glyph total, because a tick is an appearance and not a glyph, and a packet
     * that asserts a relief election it never drew is asserting the route.
     */
    for (const mark of p.selectionMarks ?? []) {
      if (mark.markDrawnInOutputBytes !== true) {
        note("invisibleWrites", { fixture: p.fixture, field: mark.field, why: "the finalizer reported this route-determined selection as marked and the output bytes draw no appearance at its rectangle" });
      }
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

function participantInstructions(maps, rbf) {
  const bySection = new Map();
  for (const i of rbf) bySection.set(i.section, [...(bySection.get(i.section) ?? []), i]);
  const elections = maps.flatMap((m) => m.selectionControls
    .filter((c) => c.routeDetermined !== true && c.completenessDisposition !== "NOT_APPLICABLE_ON_THIS_ROUTE")
    .map((c) => ({ document: m.formNumber, ...c })));
  const offRoute = maps.flatMap((m) => [...m.selectionControls, ...m.canonicalRefusals]
    .filter((c) => c.completenessDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE")
    .map((c) => ({ document: m.formNumber, ...c })));
  const made = maps.flatMap((m) => m.routeDeterminedSelections ?? []);

  const out = [];
  out.push(`# Filing instructions — ${ROUTE.publicLabel}`, "");
  out.push(
    "This packet is one official North Dakota form:", "",
    "- **SFN 14859 (12-2020)**, _North Dakota Pardon Advisory Board Application_ — eight pages.", "",
    `It is prepared for one route — **${ROUTE.publicLabel}** — under ${ROUTE.authority}.`, ""
  );

  out.push("## Read this first: a pardon is not an expungement", "");
  out.push(
    "The form's own first instruction is in capitals: **\"A REQUEST FOR A PARDON WILL NOT EXPUNGE AN INDIVIDUAL'S "
    + "CRIMINAL HISTORY RECORD.\"** The form's closing note adds that the Governor can only pardon North Dakota "
    + "convictions — not federal or tribal ones — and that even after a pardon with removal of guilt a criminal "
    + "history background check may continue to show the offence, though the North Dakota Bureau of Criminal "
    + "Investigation will modify the disposition to reflect the pardon and the court system's public website will "
    + "reflect it too.", ""
  );
  out.push(
    "**Your application becomes a public record.** The form says so: on the Department of Corrections and "
    + "Rehabilitation's receipt of your pardon application it is open for release to the public, and your "
    + "participation in the pardon board is documented in the agenda and meeting minutes, which are posted online. "
    + "Decide whether you want that before you send this.", ""
  );
  out.push(
    "**Signing consents to a background check.** The paragraph directly above the signature line reads that by "
    + "submitting this application you will be subject to a check of your criminal records, including criminal "
    + "history background information, that you consent to it, and that it may include a fingerprint-based check.", ""
  );

  out.push("## What this packet is not", "");
  out.push(
    "This is the Pardon Advisory Board's **general** application. It is not the board's separate marijuana "
    + "application (SFN 61663), which asks for an unconditional pardon with removal of guilt for specific marijuana "
    + "offences and carries its own eligibility certification. If the only relief you want is for a marijuana "
    + "possession, paraphernalia or ingestion offence, that is a different form and a different application — this "
    + "one does not carry those recitals and does not certify anything about them.", ""
  );

  out.push("## What the packet filled in, and what it did not", "");
  out.push(
    "The platform filled in what it holds about you: your name, your date of birth and your address. It also ticked "
    + "one box for you — see the next section. **Everything else on the eight pages is yours**, and every blank is "
    + "listed below by the section it sits in.", ""
  );

  if (made.length > 0) {
    out.push("## The one box this packet ticked, and why", "");
    out.push("| The box | Why the packet ticked it |", "| --- | --- |");
    for (const s of made) out.push(`| ${s.label} | ${s.participantBasis ?? s.basis} |`);
    out.push("");
  }
  if (offRoute.length > 0) {
    out.push(
      "The form offers four kinds of relief. This packet is built for a pardon, so the other three are left "
      + "unticked — they are different reliefs, not different wordings of the same one:", ""
    );
    out.push("| Left unticked | Why it is not this application |", "| --- | --- |");
    for (const c of offRoute) out.push(`| ${c.effectiveLabel} | ${c.why} |`);
    out.push("");
    out.push(
      "If what you actually want is a commutation, a reprieve or a remission of a fine, **do not just tick a "
      + "different box on this copy** — that is a different application and this packet was not prepared for it.", ""
    );
  }

  out.push("## The deadline is 90 days, and it is not a formality", "");
  out.push(
    "The Pardon Advisory Board meets in **April and November**, and the form must be received **90 days before** the "
    + "board convenes — the form gives that as early January for the April meeting and early August for the November "
    + "one. Work back from the meeting you are aiming at.", ""
  );

  out.push("## What you must attach", "");
  out.push(
    "The form lists these as **required attachments**, and says that if you fail to complete the application in "
    + "full, including the needed attachments, it **will be returned to you**, which could result in a postponement "
    + "of your hearing:", ""
  );
  out.push("1. A copy of the **criminal judgment** and the **criminal information, complaint, or citation** for each offence for which you seek relief, if those records are available — or an explanation of the attempts you made to obtain these items. The form notes that the required court documents may be obtained by contacting the Clerk of Court in the sentencing jurisdiction.");
  out.push("2. A **photocopy of your driver's license or state identification card**.");
  out.push("");
  out.push("If additional pages are needed for any section, the form asks you to attach them on 8½ × 11 paper and number the sections accordingly.", "");

  out.push("## Where to send it", "");
  out.push(
    "To the Pardon Advisory Board Clerk, by any one of the three channels the form names: fax **701-328-6780**; mail "
    + "to **P.O. Box 1898, Bismarck, ND 58502-1898**; or email **pardonclerk@nd.gov**. Those are the form's own "
    + "words and this packet adds nothing to them.", ""
  );

  out.push("## Two blanks the form prints with no box to type in", "");
  out.push(
    "At the top of page 1, two of the three tick-boxes end in the word \"on\" and expect a date after it — _\"I am "
    + "scheduled for or was reviewed by the Parole Board on ____\"_ and _\"...have a change in circumstances ... since "
    + "my prior application on ____\"_. The form provides **no fillable box for either date**. If you tick either "
    + "box, write the date on the printed page by hand. This is a gap in the form itself, not something the packet "
    + "left out.", ""
  );

  out.push("## What the platform deliberately left blank", "");
  out.push("- **Your social security number.** The platform does not hold it and does not ask for it. Write it on the form yourself.");
  out.push("- **Your race and your place of birth.** The form asks for both. The platform holds neither and will not infer either.");
  out.push("- **All three telephone boxes.** The form asks separately for a home, a work and a mobile number. The platform holds one contact number and no fact about which kind it is, so writing it into the home box would be asserting something nobody told us. Put your numbers in the boxes that describe them.");
  out.push("- **Every cell of the criminal-record table on page 1.** It asks six things per case across nine rows and the platform holds none of them. A row with one box filled and five empty reads as finished and is not — and an incomplete application is returned.");
  out.push("- **Every cell of the victim table in item 3.** The name column there is the **victim's** name. It is never yours.");
  out.push("- **Every cell of the employment table in item 11.** The address and telephone columns there are the **employer's**, not yours.");
  out.push("- **Every cell of the residence table in item 18.** It asks for dated rows of a residence history. The platform holds your current mailing address and no dates for it, and the form does not say whether row 1 is your most recent address or your oldest.");
  out.push("- **Every one of the twenty-four numbered questions.** They ask about your life — your account of the offence, your childhood, your finances, your health, your reasons for asking. None of them is something a platform can answer for you.");
  out.push("- **Your signature and the date beside it.** You sign on the day you sign, and your signature is also your consent to the background check.");
  out.push("");

  out.push("## What you must do before you send it", "");
  out.push("1. **Fill in every blank in the tables below.** Each one names the section of the form and the blank inside it.");
  out.push("2. **Tick the boxes at the top of page 1 that apply to you** — first-time applicant, scheduled for or reviewed by the Parole Board, previously denied with a change in circumstances. Write the dates by hand where the form leaves no box.");
  out.push("3. **List ALL cases within your North Dakota criminal record** in the page 1 table, as its heading requires — not only the ones you want pardoned. Then use the Pardon Requested column to say, case by case, which ones you are asking for.");
  out.push("4. **Answer every numbered question.** If you run out of room, attach 8½ × 11 pages numbered to match the sections.");
  out.push("5. **Attach the two required attachments** listed above.");
  out.push("6. **Sign it yourself and date it on the day you sign.** Neither is filled in for you.");
  out.push("");

  out.push("## Every blank you must fill, by section", "");
  out.push(
    `There are ${rbf.length} of them. They are listed in full rather than summarised, because the form's own `
    + "instruction is that an application which is not complete is returned to you.", ""
  );
  for (const [section, items] of bySection) {
    out.push(`### ${section}`, "");
    out.push("| The blank on the form | What to write |", "| --- | --- |");
    for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## The choices that are yours", "");
  out.push("| Section | The choice | Why it is yours |", "| --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.sectionHeading} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## Last words", "");
  out.push(
    "This is a prepared copy of an official North Dakota form. It is not legal advice, it is not sent for you, and "
    + "it does not decide whether you are eligible for a pardon. The form's own closing note says the same: it is "
    + "provided for informational purposes and not for the purpose of providing legal advice, and you should contact "
    + "your attorney to obtain advice with respect to any particular issue or problem."
  );
  out.push("");
  out.push(`_Route: ${ROUTE.routeKey} — ${ROUTE.authority}_`);
  return `${out.join("\n")}\n`;
}

/* ---- row and column ordering, measured rather than assumed ------------------ */
/*
 * AN ACROFORM INDEX IS NOT A PRINTED ROW NUMBER, AND EXTRACTED LINE ORDER IS NOT
 * COLUMN ORDER.
 *
 * Both are ways a packet passes every counter and still puts the right value on
 * the wrong line. This form is unusually exposed to the first: it carries FIVE
 * repeating tables and three of them reuse the same `Row{n}` suffix, with the
 * disposition table disambiguated only by `_2` and the victim table by `_3`.
 *
 * So neither is assumed. For each table, the authored row index is checked
 * against the widget's own y-coordinate: row n must sit strictly below row n-1
 * on the same page. And each table's columns are checked against the x-order of
 * its printed heading words. A table that fails either check is a stop, not a
 * note, because nothing downstream re-derives it.
 *
 * The tables on SFN 14859 print NO row numbers beside their rows -- there is no
 * printed number for an index to disagree with -- so the check that is available
 * is the geometric one, and that is what is recorded. The absence of printed row
 * numbers is itself recorded, so a reader does not mistake a check that could
 * not be made for one that passed.
 */
const TABLES = Object.freeze([
  { table: "Criminal record table (page 1)", page: 1, rows: 9,
    columns: ["Date SentencedRow", "Case NumberRow", "City or CountyRow", "OffenseRow", "ProsecutorDefenseRow"],
    suffix: "", printedHeading: ["Date", "Case Number", "City or County", "Offense", "Prosecutor/Defense"] },
  { table: "1. Disposition table (page 2)", page: 2, rows: 9,
    columns: ["Date SentencedRow", "Case NumberRow", "DispositionRow"],
    suffix: "_2", suffixOnlyFirstTwo: true, printedHeading: ["Date Sentenced", "Case Number", "Disposition"] },
  { table: "3. Victim table (page 2)", page: 2, rows: 7,
    columns: ["NameRow", "RelationshipRow", "Case NumberRow"],
    suffix: "_3", suffixOnlyLast: true, printedHeading: ["Name", "Relationship", "Case Number"] },
  { table: "11. Employment table (page 4)", page: 4, rows: 5,
    columns: ["Date StartedRow", "Date EndedRow", "OccupationRow", "EmployerRow", "AddressRow", "Telephone NumberRow"],
    suffix: "", printedHeading: ["Date Started", "Date Ended", "Occupation", "Employer", "Address", "Telephone Number"] },
  { table: "18. Residence table (page 5)", page: 5, rows: 5,
    columns: ["Start DateRow", "End DateRow", "Residence AddressRow"],
    suffix: "", printedHeading: ["Start Date", "End Date", "Residence Address"] }
]);

function fieldNameFor(spec, column, n) {
  if (spec.suffixOnlyLast) return column === "Case NumberRow" ? `${column}${n}${spec.suffix}` : `${column}${n}`;
  if (spec.suffixOnlyFirstTwo) return column === "DispositionRow" ? `${column}${n}` : `${column}${n}${spec.suffix}`;
  return `${column}${n}${spec.suffix}`;
}

function orderingEvidence(source, census) {
  const by = new Map(census.rows.map((r) => [r.key, r]));
  const out = [];
  for (const spec of TABLES) {
    const rowTops = [];
    const columnX = [];
    const missing = [];
    for (let n = 1; n <= spec.rows; n += 1) {
      const first = by.get(fieldNameFor(spec, spec.columns[0], n));
      if (!first) { missing.push(fieldNameFor(spec, spec.columns[0], n)); continue; }
      rowTops.push({ row: n, page: first.page, y: first.rect.y });
    }
    for (const c of spec.columns) {
      const cell = by.get(fieldNameFor(spec, c, 1));
      if (!cell) { missing.push(fieldNameFor(spec, c, 1)); continue; }
      columnX.push({ column: c, x: cell.rect.x });
    }
    const rowsDescendTheePage = rowTops.every((r, i) => i === 0 || (r.page === rowTops[i - 1].page && r.y < rowTops[i - 1].y));
    const columnsRunLeftToRight = columnX.every((c, i) => i === 0 || c.x > columnX[i - 1].x);
    /* The printed heading words, read from the page in x-order at the heading's
     * own y, so the column order is checked against the paper and not against
     * the order pdftotext happened to emit. */
    const headingLine = (census.pageText.find((p) => p.page === spec.page)?.lines ?? [])
      .map((l) => l.text)
      .find((t) => spec.printedHeading.every((w) => t.includes(w))) ?? null;
    const headingOrderMatches = headingLine === null ? null
      : spec.printedHeading.every((w, i) => i === 0
        || headingLine.indexOf(w) > headingLine.indexOf(spec.printedHeading[i - 1]));
    out.push({
      document: source.formNumber, table: spec.table, page: spec.page, rows: spec.rows,
      authoredRowIndexMatchesGeometricOrder: rowsDescendTheePage,
      rowTops, columnLeftEdges: columnX,
      authoredColumnOrderMatchesGeometricOrder: columnsRunLeftToRight,
      printedHeadingLine: headingLine,
      printedHeadingWordOrderMatchesColumnOrder: headingOrderMatches,
      printedRowNumbersOnThePaper: false,
      whyNoPrintedRowNumberCheck:
        "This table prints no number beside its rows, so there is no printed row number for the authored index to "
        + "disagree with. The check available is the geometric one above, and it is the one recorded.",
      fieldsExpectedAndNotFound: missing
    });
  }
  return out;
}

function buildFindings(resolved, censuses, maps, rbf) {
  const src = resolved[0];
  const census = censuses[0].census;
  return [
    {
      finding:
        "THE SOURCE WAS NEVER MISSING FROM THE RECORD, ONLY FROM CUSTODY, AND TWO COMMITTED RECORDS STILL SAY "
        + "OTHERWISE. MASTER_QUEUE.json's row for this family reads sourceBound true and sourceReadiness.ready true "
        + "while its own sourceReadiness.custodyClass reads SOURCE_GENUINELY_MISSING, and "
        + "SOURCE_IDENTITY_RESOLUTION_SWEEP.json answers GENUINELY_ABSENT with resolvedSourceCount 0 and "
        + "buildableToday false.",
      consequence:
        `Measured here instead: the file is mounted at ${src.pathInArchive} under custody ${src.custody}, hashes to `
        + `${src.sha256} at ${src.byteLength} bytes, and carries ${census.pageCount} pages and ${census.rows.length} `
        + "AcroForm fields — matching the committed index entry, the acquisition receipt and the rematerialization "
        + "record exactly. Both stale records predate the 2026-09-09 materialization. The build binds by digest and "
        + "not by either record's readiness flag; the disagreement is reported rather than silently resolved."
    },
    {
      finding:
        "THE COMMITTED CORPUS INDEX CARRIES THIS BINARY WITH formNumber null AND assetClass null, because the "
        + "Nationwide Recovery Pool is indexed under the filename each file was downloaded as rather than under a "
        + "form slug.",
      consequence:
        "A resolver matching the queue's `official-form:SFN-14859` against the index finds nothing while the bytes "
        + "sit there. This build resolves by SHA-256 alone — the identity all four records agree on — over every "
        + "indexed path carrying that digest plus the declared path, across both mounted custody roots. The source "
        + "receipt records the queue's sourceId and the acquisition receipt's ND-SFN-14859 together so the two names "
        + "are never read as two documents."
    },
    {
      finding:
        "TWENTY-EIGHT BLANKS ON THIS FORM BIND A PARTICIPANT FACT BY FIELD NAME AND DESCRIBE SOMEONE OR SOMETHING "
        + "ELSE. Measured by running decideBinding over all 229 authored names, not inferred: `NameRow1`..`NameRow7` "
        + "return participant.full_legal_name and are the VICTIM name column of item 3; `AddressRow1`..`Row5` and "
        + "`Telephone NumberRow1`..`Row5` return the participant's address and phone and are the EMPLOYER'S in item "
        + "11; `City or CountyRow1`..`Row9` return participant.city and are the VENUE of each offence; `Home "
        + "Telephone Number` and `Work Telephone Number` both return participant.phone.",
      consequence:
        "Each is refused BY ROLE before anything is rendered and recorded in "
        + "reports/blanks-left-for-the-participant.json under nearMissesRefusedByRole rather than quietly avoided. "
        + "Left to the name channel this packet would have named the applicant as the victim of their own offence "
        + "seven times over, given the employer the applicant's home address and telephone number, and recorded all "
        + "nine offences as prosecuted in the town the applicant happens to live in. The byte proof confirms none of "
        + "the twenty-eight carries ink in either fixture."
    },
    {
      finding:
        "ITEM 18'S RESIDENCE TABLE IS THE ONE NEAR-MISS THAT REALLY IS ABOUT THE APPLICANT, AND IT IS STILL REFUSED. "
        + "`Residence AddressRow1`..`Row5` bind participant.street_address and the column genuinely holds the "
        + "applicant's own addresses.",
      consequence:
        "The cell holds a DATED ROW of a five-row residence history — Start Date, End Date, Residence Address — and "
        + "the platform holds a current mailing address with no dates. A dated row is a different fact from a current "
        + "address; the form does not say whether row 1 is the most recent residence or the oldest; and a row with an "
        + "address and two empty date cells reads as a finished row on a form whose instruction is that an incomplete "
        + "application is RETURNED. The whole table is carried to the participant. THIS IS A JUDGEMENT RATHER THAN A "
        + "MEASUREMENT and is flagged for the reviewer to challenge in approval-request.json."
    },
    {
      finding:
        "THE RELIEF ELECTION IS DETERMINED BY THE ROUTE AND THE PACKET MAKES IT. SFN 14859 offers Pardon, Commutation "
        + "of Sentence, Reprieve of Sentence and Remission of Fine, and N.D.C.C. 12-55.1-01 defines them as four "
        + "different things: a commutation changes a sentence to a less severe punishment, a reprieve postpones "
        + "execution of a sentence, a remission releases a fine in whole or part, and a pardon removes the punishment "
        + "or custody.",
      consequence:
        "This family's route is obligation:track-only:ND:nd-regular-pardon, so the packet ticks `Pardon` through "
        + "finalizeOfficialForm's settled-selection channel with the route as its stated basis, and declares the "
        + "other three NOT_APPLICABLE_ON_THIS_ROUTE with the statutory definition that distinguishes each. Left blank "
        + "and declared route-determined, the completeness contract returns ROUTE_OPTION_NOT_SELECTED and counts it — "
        + "correctly, because a packet built for one statutory route must state which route it is rather than ask the "
        + "applicant which one they are on. The tick is measured in the OUTPUT BYTES as an appearance at its own "
        + "rectangle, not taken from the finalizer's report, and a reported-but-undrawn mark is counted as an "
        + "invisibleWrite."
    },
    {
      finding:
        "THIS FAMILY AND nd-summary-marijuana-pardon-set MUST NOT DELIVER THE SAME DOCUMENT, AND THEY DO NOT. They "
        + "are different instruments before the same board.",
      consequence:
        "Measured: this family binds SFN 14859, sha256 b88cb559…, 8 pages, 229 AcroForm fields, four relief types, "
        + "twenty-four numbered life-history questions and five repeating tables. The marijuana family binds SFN "
        + "61663, sha256 c59cd5b8…, a different digest and a different document, whose first page carries a fixed "
        + "printed recital seeking an unconditional pardon with removal of guilt for possession of a controlled "
        + "substance-marijuana and a certification about eligible marijuana offences and a five-year clean period. "
        + "SFN 14859 carries neither recital nor certification. The two route keys differ "
        + "(obligation:track-only:ND:nd-regular-pardon against "
        + "obligation:track-pathway:ND:nd-summary-marijuana-pardon:…), and this packet's instructions say in terms "
        + "that the marijuana application is a different form. No text, field map or instruction in this family was "
        + "copied from that one."
    },
    {
      finding:
        "THE FORM PRINTS TWO DATE BLANKS IT PROVIDES NO WIDGET FOR, AND CROSS-REFERENCES A QUESTION IT DOES NOT HAVE.",
      consequence:
        "Two of the three Check All That Apply lines on page 1 end in the word \"on\" and expect a date, and there is "
        + "no fillable box for either; the third reads \"(see question number 26)\" while the form ends at question "
        + "24, which is plainly the reapplication question meant. participant-instructions.md tells the applicant to "
        + "write those two dates by hand. The packet does not renumber the form, does not correct its printed text "
        + "and does not repeat the wrong cross-reference as if it were right. Both are recorded as source-fidelity "
        + "observations about the Department's form."
    },
    {
      finding:
        "THE COMPLETENESS CONTRACT'S FIELD CLASSES READ SEVERAL OF THIS FORM'S COLUMNS AS SOMEBODY ELSE'S, AND ON AN "
        + "AGENCY APPLICATION THEY ARE THE APPLICANT'S TO ANSWER. `Prosecutor/Defense` matches the prosecutor protect "
        + "category, `Disposition` matches disposition_or_hearing, and `Employer` matches outside_party.",
      consequence:
        "None of the three is written, so the protect categories cost nothing at render time. All three are declared "
        + "REQUIRED_BEFORE_FILING and printed in participant-instructions.md, because item 5's table asks the "
        + "APPLICANT to name the prosecutor and defence counsel for each case and item 1 asks the APPLICANT for each "
        + "disposition. Classifying them as somebody else's and stopping there would have excused the blanks and then "
        + "never asked the participant for items the board requires — the failure these counters exist to prevent. "
        + "Unlike the sibling family's Judge cells, none of these needed the case-determined exception: the "
        + "completeness contract's own classifyField returns UNMATCHED for each, so the ordinary declared channel "
        + "carries them."
    },
    {
      finding:
        "EVERY REPEATING TABLE'S AUTHORED ROW INDEX WAS CHECKED AGAINST THE PAPER RATHER THAN TRUSTED. Three of the "
        + "five tables reuse the same `Row{n}` suffix, distinguished only by `_2` and `_3`.",
      consequence:
        "reports/caption-evidence.json orderingChecks records, per table, that row n sits strictly below row n-1 on "
        + "the same page and that the authored column order runs left to right by widget x-coordinate, cross-checked "
        + "against the x-order of the words in the table's own printed heading line. These tables print no row "
        + "numbers, so there is no printed number for an index to disagree with; the absence of that check is "
        + "recorded rather than passed over."
    },
    {
      finding:
        "THIS IS A PARDON APPLICATION AND NOT A RECORD-CLEARING FILING, AND SIGNING IT CONSENTS TO A BACKGROUND CHECK.",
      consequence:
        "The form's own first instruction is in capitals: a request for a pardon will not expunge a criminal history "
        + "record. Its closing notes add that the application becomes a public record on receipt, that the hearing is "
        + "minuted online, and that the Governor can pardon only North Dakota convictions. The paragraph above the "
        + "signature line consents to a criminal history background check that may include fingerprints. "
        + "participant-instructions.md leads with all of it, before any instruction about how to fill the form in. A "
        + "packet that presented this relief as expungement would be misdescribing what the applicant is applying for, "
        + "and the public-record consequence is one an applicant may reasonably decide against."
    },
    {
      severity: "advisory",
      finding:
        "A SHARED FIELD CLASS READS ITEM 17 OF THIS FORM AS COURT-ASSIGNED. The completeness contract's COURT_ASSIGNED "
        + "class matches the bare word `time` — its pattern is /\\b(hearing date|date of hearing|dept\\.?|department|"
        + "time|courtroom|filed on|filing stamp)\\b/i — and item 17 reads \"Tell us what you do in your leisure "
        + "TIME (hobbies, groups you belong to, how you spend a typical day)\". classifyField returns "
        + "requirement LATER_COMPLETION, meaning a field the court fills in at or after filing.",
      consequence:
        "It costs this packet nothing: LATER_COMPLETION is an allowed disposition, and this build declares item 17 "
        + "required before filing and prints it in participant-instructions.md regardless, so the applicant is asked "
        + "for it either way. reports/completeness-counters.json shows the effect — 165 REQUIRED_BEFORE_FILING and "
        + "1 LATER_COMPLETION, the one being item 17. It is recorded because a family that relied on the classifier "
        + "alone would have this blank silently EXCUSED and therefore never disclosed, which is the failure these "
        + "counters exist to prevent, and because any label containing the word `time` on any form is exposed to the "
        + "same match. scripts/rcap-packet-completeness/completeness-contract.mjs is a shared path this lane does not "
        + "own and was not edited."
    },
    {
      severity: "advisory",
      finding:
        "A boundary value that does not fit its line at the minimum readable font is refused by the shared finalizer "
        + "rather than clipped.",
      consequence:
        "Recorded in reports/actual-writes.json under unfittable, with the measured width. That is the boundary "
        + "fixture doing its job; the canonical fixture writes the value."
    },
    {
      severity: "advisory",
      finding:
        "The lane brief names data/rcap-grade-a/packet-factory-24h/DEFECTS_NO_COUNTER_CAN_SEE.json as the record of "
        + "defects to check a finished packet against.",
      consequence:
        "That file does not exist in this worktree: it is absent from disk and untracked by git, and this checkout is "
        + "not sparse, so its absence is not a materialization gap. The four defect classes the brief describes in "
        + "prose were checked directly instead — the field map against the delivered bytes, the authored row indices "
        + "against page geometry, the column order against the printed heading, and the delivered page text against "
        + "the pinned source's own text. Reported so the record can be supplied rather than assumed to have been read."
    }
  ];
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

  const censuses = [];
  for (const source of resolved) {
    const census = await censusOf(source);
    assert.equal(census.unmapped.length, 0,
      `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 8).map((u) => u.field))}`);
    assert.equal(census.stale.length, 0,
      `${source.formNumber}: the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
    const writesOntoHidden = census.rows.filter((r) => (r.policy === "write" || r.policy === "select") && r.hiddenUntilTheFormRevealsIt === true);
    assert.equal(writesOntoHidden.length, 0,
      `${source.formNumber}: ${writesOntoHidden.length} write(s) land on a widget the form hides: ${JSON.stringify(writesOntoHidden.map((r) => r.key))}`);
    if (source.acroFieldCount != null) {
      assert.equal(census.rows.length, source.acroFieldCount,
        `${source.formNumber}: censused ${census.rows.length} fields, the committed corpus index declares ${source.acroFieldCount}`);
    }
    if (source.pageCount != null) {
      assert.equal(census.pageCount, source.pageCount,
        `${source.formNumber}: read ${census.pageCount} pages, the committed corpus index declares ${source.pageCount}`);
    }
    censuses.push({ source, census });
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      documents: censuses.map(({ source, census }) => ({
        formNumber: source.formNumber, sha256: source.sha256, boundFromCustody: source.boundFromCustody,
        fields: census.rows.length, pages: census.pageCount,
        hiddenWidgets: census.rows.filter((r) => r.hiddenUntilTheFormRevealsIt).length,
        writes: census.rows.filter((r) => r.policy === "write").length,
        routeSelections: census.rows.filter((r) => r.policy === "select").length,
        offRoute: census.rows.filter((r) => r.policy === "off_route").length,
        supply: census.rows.filter((r) => r.policy === "supply").length,
        elections: census.rows.filter((r) => r.policy === "election").length,
        protected: census.rows.filter((r) => r.policy === "protect").length
      }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "raster"), { recursive: true });

  /*
   * THE RECEIPT AND THE CENSUS ARE WRITTEN BEFORE ANY FIXTURE IS RENDERED.
   * They measure the SOURCE and claim nothing about a packet, so a build that
   * stops at the fill still leaves the measurement behind.
   */
  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_REMATERIALIZED_FROM_RECOVERED_ACQUISITION_ARCHIVE",
    acquisitionCommissioned: false,
    howTheseBytesReachedCustody:
      "Not by re-acquisition. data/rcap-grade-a/packet-factory-24h/SOURCE_REMATERIALIZATION_REQUEST.json records that the "
      + "2026-09-04 acquisition archive was recovered from the existing authenticated Drive custody and the original "
      + "delivered as a transport package; no court website was fetched and no document was converted, printed or "
      + "regenerated. This build did not acquire anything either: it hashed the bytes already on disk.",
    bindingMethod:
      "exact SHA-256 against the bytes on disk, over every committed index path carrying that digest plus the declared "
      + "path, in deterministic order, across both mounted custody roots. Not by filename and not by form number.",
    whyNotByFormNumber:
      "The committed corpus index carries this binary with formNumber null and assetClass null, because the recovery "
      + "pool is indexed by the filename the file was downloaded under rather than under a form slug. There is no form "
      + "number in the index to match SFN-14859 against. The digest is the identity and it is the same digest in the "
      + "queue row, the acquisition receipt, the index entry and the rematerialization record.",
    queueRowDisagreement:
      "MASTER_QUEUE.json's row for this family says sourceBound true and sourceReadiness.ready true while its own "
      + "sourceReadiness.custodyClass says SOURCE_GENUINELY_MISSING, and "
      + "data/rcap-grade-a/source-wave-integration/SOURCE_IDENTITY_RESOLUTION_SWEEP.json answers GENUINELY_ABSENT with "
      + "resolvedSourceCount 0. Both predate the materialization. Measured here: the file is present, hashes to the "
      + "declared digest at the declared byte length, and carries the declared 8 pages and 229 AcroForm fields.",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId, statutoryAuthority: ROUTE.authority,
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId, "ND-SFN-14859"], documentId: r.formNumber, formNumber: r.formNumber,
      revision: r.revision, pathInArchive: r.pathInArchive, boundFromCustody: r.boundFromCustody,
      custody: r.custody, custodyType: r.custodyType,
      sha256: r.sha256, byteLength: r.byteLength, instrumentKind: r.instrumentKind,
      declaredSha256: r.declaredSha256, digestMatchesDeclared: r.sha256 === r.declaredSha256,
      pageCountFromIndex: r.pageCount, acroFieldCountFromIndex: r.acroFieldCount
    })),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    grantsNothing: "Binding a source makes a build possible. It opens no route, promotes no family and approves nothing."
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "The printed caption read from this form's own text stream at each widget's coordinate, corroborated by the "
      + "AcroForm field names the North Dakota Department of Corrections and Rehabilitation authored into SFN 14859. "
      + "Those names were generated by Acrobat PDFMaker from the Department's Word original, so most are the printed "
      + "caption verbatim — `Applicant Name`, `Social Security Number`, `List of Former Names or Aliases` — while the "
      + "narrative boxes carry a fragment of the question text instead (`credit rating repossessions and if you have "
      + "been on any public assistance` is item 15) and the paired tick-boxes are autonumbered `undefined_N`. Where "
      + "the authored name is a fragment or `undefined_N`, the label this build uses comes from the printed question "
      + "read at the widget's own coordinate, and the extraction is recorded per field in "
      + "reports/caption-evidence.json so the claim is checkable rather than asserted.",
    documents: censuses.map(({ source, census }) => ({
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      captionsExtractCleanly: source.captionsExtractCleanly === true,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      corpusIndexDeclaresPageCount: source.pageCount,
      widgetsCarryingTheHiddenFlag: census.rows.filter((r) => r.hiddenUntilTheFormRevealsIt).length,
      fieldsCarryingAShippedValue: census.rows.filter((r) => r.sourceValue !== null && r.sourceValue !== undefined).length,
      pagesCarryingNoWidget: Array.from({ length: census.pageCount }, (_, i) => i + 1)
        .filter((p) => !census.rows.some((r) => r.widgets.some((w) => w.page === p))),
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        annotationFlags: r.widgets.map((w) => w.annotationFlags),
        hiddenUntilTheFormRevealsIt: r.hiddenUntilTheFormRevealsIt === true,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel, policy: r.policy, factId: r.fact,
        sourceValue: r.sourceValue,
        printedTextAtCoordinate: r.printedTextAtCoordinate
      }))
    }))
  });

  const sourceInkByForm = new Map();
  for (const { source } of censuses) sourceInkByForm.set(source.formNumber, await flattenedSourceOf(source));

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
      const proof = await byteProof(source, census, bytes, report, fixtureName, sourceInkByForm.get(source.formNumber));
      writeProofs.push({
        fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
        proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes",
        valuesReportedByFinalizer: report.written.length,
        flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
        addedGlyphsReadFromOutputBytes: proof.glyphs,
        nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
        routeSelectionMarks: proof.selectionMarks,
        refusedFieldsWithInk: proof.refusedFieldsWithInk,
        documentAuthoredAppearances: proof.documentAuthoredAppearances,
        selectionMarks: proof.selectionMarks,
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
  const instructionsText = participantInstructions(maps, rbf);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1", familyId: FAMILY_ID,
    whereTheseFieldNamesCameFrom:
      "Every AcroForm field name quoted in this packet was authored into SFN 14859 by the NORTH DAKOTA Department of "
      + "Corrections and Rehabilitation, and was read first hand from the pinned binary "
      + "b88cb559c375d2443c15dd33c19f3f42387010e494ade28fc25bdbfdd75e8d5b. They were generated by Acrobat PDFMaker 11 "
      + "for Word from the Department's own Word original, which is why the narrative boxes are named after fragments "
      + "of their printed questions and the paired tick-boxes are autonumbered `undefined_N`. No field name, caption "
      + "or label in this packet is derived from any other state's form, and no form outside this packet was consulted "
      + "for any of them.",
    finding:
      "This form's text stream extracts cleanly. Its printed captions come back verbatim — \"Applicant Name\", "
      + "\"Social Security Number\", \"Date Sentenced Case Number City or County Offense Prosecutor/Defense\" — and "
      + "for most widgets the Department's own field name IS that caption. Three groups are exceptions and are "
      + "labelled from the printed text at the widget's coordinate instead: the twenty-four narrative boxes, whose "
      + "authored names are fragments of the question (`credit rating repossessions and if you have been on any "
      + "public assistance` is item 15, `below` is item 9's explanation box); the thirty-six paired tick-boxes named "
      + "`undefined_5` .. `undefined_36`; and the four facility boxes named `undefined` .. `undefined_4`.",
    whyThisIsRecordedAnyway:
      "So the claim is checkable. A caption basis asserted without the extraction beside it cannot be told apart from "
      + "one that was guessed. The extraction at every widget's own coordinate is recorded below either way.",
    perDocument: censuses.map(({ source }) => ({
      document: source.formNumber,
      captionsExtractCleanly: source.captionsExtractCleanly === true,
      authoredBy: "North Dakota Department of Corrections and Rehabilitation",
      producer: "Acrobat PDFMaker 11 for Word / Adobe PDF Library 11.0, per the pinned binary's own metadata",
      sourceSha256: source.sha256,
      basis: "the printed caption read from THIS document's own text stream at each widget's coordinate, corroborated "
        + "by the AcroForm field name the North Dakota Department of Corrections and Rehabilitation authored into "
        + "SFN 14859. No sibling form and no other jurisdiction was used."
    })),
    orderingChecks: censuses.flatMap(({ source, census }) => orderingEvidence(source, census)),
    perField: censuses.flatMap(({ source, census }) => census.rows.map((r) => ({
      document: source.formNumber, field: r.key, page: r.page, rect: r.rect,
      labelThisBuildUses: r.effectiveLabel, section: r.section,
      labelSource: r.key === r.effectiveLabel
        ? "the authored AcroForm field name, which on this widget is the printed caption verbatim"
        : "the printed question or column heading read from this form's own text stream at this widget's coordinate; "
          + "the authored name is a fragment or an autonumber",
      textExtractedAtThisCoordinate: r.printedTextAtCoordinate
    })))
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "acroform_fill",
    captionBasis: "per document; see reports/caption-evidence.json",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeDeterminedSelections: maps.flatMap((m) => m.routeDeterminedSelections ?? []),
    routeSelectionNote:
      "SFN 14859 offers four kinds of relief — Pardon, Commutation of Sentence, Reprieve of Sentence, Remission of "
      + "Fine — and N.D.C.C. 12-55.1-01 defines them as four different things. This family's route is "
      + "obligation:track-only:ND:nd-regular-pardon, so the packet TICKS `Pardon` through the finalizer's "
      + "settled-selection channel and declares the other three outside this route by name, each with the statutory "
      + "definition that distinguishes it. Leaving the relief type to the participant on a route-specific packet "
      + "would be asking them which route they are on. Every other tick-box on this form is a fact about the "
      + "applicant's own history or their own record and is left to them.",
    offRouteBranches: maps.flatMap((m) => [...m.selectionControls, ...m.canonicalRefusals]
      .filter((c) => c.completenessDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE")
      .map((c) => ({ document: m.formNumber, field: c.field, label: c.effectiveLabel, why: c.why, routeCondition: c.routeConditionThatMakesItInapplicable }))),
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true, rasterEngine: RASTER_ENGINE, rasterPages,
    independentVerificationPending: true,
    rasterState: "BUILT_RASTER_PENDING",
    localRasterIsNotAReceipt:
      "The PNGs under raster/ are a local Chromium render for a human reader. They are not a raster receipt. Only the "
      + "central raster workflow issues one, bound to the exact SHA-256 recorded for each fixture above."
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
      routeSelectionMarksDrawn: (p.selectionMarks ?? []).filter((m) => m.markDrawnInOutputBytes === true).length,
      routeSelectionMarksReported: (p.selectionMarks ?? []).length,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    howTheTickWasMeasured:
      "A ticked box draws an appearance, not a glyph. addedGlyphsReadFromOutputBytes counts participant TEXT only, so "
      + "the Pardon tick is measured separately as an appearance present at its own rectangle in the output bytes. "
      + "A selection the finalizer reports and the bytes do not draw is counted as an invisibleWrite.",
    blockingFindings: writeProofs.flatMap((p) => p.refusedFieldsWithInk.map((r) => ({
      fixture: p.fixture, field: r.fieldId, finding: "a field the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    howTheseWereFound:
      "decideBinding from scripts/rcap-official-forms/rcap-field-semantics.mjs was run over all 229 authored field "
      + "names of this form. The near-misses below are the fields it returns a PARTICIPANT FACT for, whose printed "
      + "column describes someone or something else. Each is refused BY ROLE before rendering, and the byte proof "
      + "confirms none of them carries ink in either fixture.",
    nearMissesRefusedByRole: [
      {
        document: "SFN-14859", fields: "NameRow1 .. NameRow7", count: 7,
        wouldHaveBound: "participant.full_legal_name",
        finding:
          "Item 3's first column is named `NameRow{n}` and the shared semantics binds that name to the applicant's "
          + "own full legal name. The column is the VICTIM'S NAME — the printed heading is \"Name | Relationship | "
          + "Case Number | Do you maintain contact?\" under \"If any cases included a victim\". Left to the name "
          + "channel this packet would have named the applicant as the victim of their own offence, in seven rows. "
          + "This is the most serious defect available on this form and it is refused by role."
      },
      {
        document: "SFN-14859", fields: "AddressRow1 .. AddressRow5", count: 5,
        wouldHaveBound: "participant.street_address",
        finding:
          "Item 11's fifth column is named `AddressRow{n}` and binds the applicant's street address. The printed "
          + "heading is \"Date Started | Date Ended | Occupation | Employer | Address | Telephone Number\" under "
          + "\"List the Last Five Employers\": the address is the EMPLOYER'S. Refused by role."
      },
      {
        document: "SFN-14859", fields: "Telephone NumberRow1 .. Row5", count: 5,
        wouldHaveBound: "participant.phone",
        finding:
          "Item 11's last column binds the applicant's phone number and is the EMPLOYER'S telephone number. Refused "
          + "by role."
      },
      {
        document: "SFN-14859", fields: "City or CountyRow1 .. Row9", count: 9,
        wouldHaveBound: "participant.city",
        finding:
          "The page 1 criminal-record table's third column is named `City or CountyRow{n}` and binds the applicant's "
          + "own city. It is the VENUE where each case was prosecuted. Left alone, a Bismarck resident's nine "
          + "offences would each have been recorded as prosecuted in Bismarck. Refused by role."
      },
      {
        document: "SFN-14859", fields: "Home Telephone Number, Work Telephone Number", count: 2,
        wouldHaveBound: "participant.phone",
        finding:
          "Both bind participant.phone. The platform holds ONE unqualified contact number, so writing it would put "
          + "the same number into two boxes asking different questions and assert it was a home number in the first. "
          + "All three phone boxes — home, work and cell — are carried to the participant, who knows which of their "
          + "numbers is which."
      },
      {
        document: "SFN-14859", fields: "Residence AddressRow1 .. Row5", count: 5,
        wouldHaveBound: "participant.street_address",
        finding:
          "Item 18's third column binds the applicant's street address, and unlike the four groups above it really "
          + "is about the applicant. It is still refused. The printed heading is \"Start Date | End Date | Residence "
          + "Address\" under \"List Your Last Five Residences\": the cell holds a DATED ROW OF A RESIDENCE HISTORY, "
          + "which is a different fact from a current mailing address. The platform holds no start or end date for "
          + "where the participant lives, and the form does not say whether row 1 is the most recent residence or "
          + "the oldest. Writing the address into an unspecified row with two empty date cells beside it would "
          + "assert both an ordering and a completeness that nobody supplied, on a form whose instruction is that an "
          + "incomplete application is returned."
      },
      {
        document: "SFN-14859", fields: "Case NumberRow1 .. Row9, Row1_2 .. Row9_2, Row1_3 .. Row7_3", count: 25,
        wouldHaveBound: "matter.charges[n].case_number",
        finding:
          "Every Case Number column on this form is a repeating charge-row cell. decideBinding refuses each with "
          + "reason repeating_row_without_indexed_fact because this build supplies no indexed charge facts, so no row "
          + "is stamped with a case number it cannot stand behind. They are carried to the participant."
      }
    ],
    identifierBlanksRefusedBySharedSemantics: [
      { field: "Social Security Number", protectedCategory: "government_identifier" },
      { field: "Race", protectedCategory: "race" },
      { field: "ProsecutorDefenseRow1 .. Row9", protectedCategory: "prosecutor" },
      { field: "DispositionRow1 .. Row9", protectedCategory: "disposition_or_hearing" },
      { field: "EmployerRow1 .. Row5", protectedCategory: "outside_party" },
      { field: "I am scheduled for or was reviewed by the Parole Board on", protectedCategory: "agency" },
      { field: "Signature of Applicant", protectedCategory: "signature" }
    ],
    whyTheTablesAreEntirelyEmpty:
      "The criminal-record table asks six things per case across nine rows, the disposition table three across nine, "
      + "the victim table five across seven, the employment table six across five and the residence table three "
      + "across five. The platform holds none of those facts. The form's own instruction is that an application which "
      + "is not complete is RETURNED to the applicant, which could postpone the hearing, so a row carrying one value "
      + "beside five blanks reads as finished and is not. No cell of any table is written in either fixture.",
    formGapsCarriedToTheParticipant: [
      {
        what: "Two printed date blanks with no AcroForm widget",
        where: "page 1, the second and third of the three Check All That Apply boxes",
        detail:
          "Both printed lines end in the word \"on\" and expect a date — \"I am scheduled for or was reviewed by the "
          + "Parole Board on ____\" and \"...have a change in circumstances (see question number 26) since my prior "
          + "application on ____\". The form provides no fillable box for either. Named in "
          + "participant-instructions.md so the applicant writes them by hand rather than discovering the gap after "
          + "printing. This is a defect in the Department's form, not an omission by this packet."
      },
      {
        what: "The form's own cross-reference points at a question that does not exist",
        where: "page 1, third Check All That Apply box",
        detail:
          "It reads \"(see question number 26)\". SFN 14859 (12-2020) ends at question 24, which is the "
          + "reapplication question the cross-reference plainly means. Recorded as a source-fidelity observation. "
          + "The packet does not renumber the form, does not correct the printed text, and does not repeat the wrong "
          + "number as if it were right."
      }
    ],
    participantElections: maps.flatMap((m) => m.selectionControls
      .filter((c) => c.routeDetermined !== true && c.completenessDisposition !== "NOT_APPLICABLE_ON_THIS_ROUTE")
      .map((c) => ({ document: m.formNumber, field: c.field, page: c.page, section: c.sectionHeading, label: c.effectiveLabel, why: c.reason }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals.filter((r) => r.requiredBeforeFiling !== true && r.completenessDisposition !== "NOT_APPLICABLE_ON_THIS_ROUTE").map((r) => ({
      document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why
    }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note:
      "Every page of both fixtures is rastered for a human who did not build this family. The checks that matter most "
      + "here are the five repeating tables: every one must be entirely empty, and a single value in any of them is a "
      + "blocking finding rather than a cosmetic one.",
    whatToLookAt: [
      "Page 1, the applicant block: the name, the date of birth, the street address, the city, the state and the ZIP "
        + "each under the caption they belong to, and nothing else written anywhere in that block.",
      "Page 1, the social security number, place of birth and race boxes: ALL THREE EMPTY. The platform holds none of "
        + "them and must not.",
      "Page 1, all three telephone boxes empty. Deliberate — the form distinguishes home, work and mobile and the "
        + "platform holds one unqualified number.",
      "Page 1, the List of Former Names or Aliases box empty, and in particular NOT carrying the applicant's current "
        + "name. A field name containing the word Names is exactly the shape that attracts a name fact.",
      "Page 1, the relief line: `Pardon` TICKED and Commutation of Sentence, Reprieve of Sentence and Remission of "
        + "Fine all UNTICKED. This is the one mark this packet makes and the only box on the form the route "
        + "determines. A tick on any of the other three is a blocking finding.",
      "Page 1, the criminal-record table: EVERY ONE of its 45 text cells and 18 tick-boxes empty across all nine "
        + "rows. Look hardest at the City or County column: it binds the participant's own city by field name and is "
        + "refused by role, so a value there is blocking.",
      "Page 2, the disposition table: all 27 cells empty.",
      "Page 2, item 3, the victim table: all 21 text cells and 14 tick-boxes empty. Look hardest at the Name column — "
        + "it binds the APPLICANT'S full legal name by field name. The applicant's name appearing as a victim's name "
        + "is the worst defect this form can carry.",
      "Page 4, item 11, the employment table: all 30 cells empty, and in particular the Address and Telephone Number "
        + "columns, which bind the applicant's own address and phone and describe the employer's.",
      "Page 5, item 18, the residence table: all 15 cells empty, including the Residence Address column.",
      "Pages 2 to 7, all twenty-four numbered narrative boxes empty. None of them is a fact a platform can supply.",
      "Page 7, the signature line and the date beside it empty.",
      "Page 8 carries the text of N.D.C.C. ch. 12-55.1 and no widgets at all; it should raster identical to the "
        + "pinned source.",
      "Nothing anywhere on the eight pages that is not either the Department's own printed form, the six participant "
        + "values named above, or the single Pardon tick. No build commentary, no route key, no internal vocabulary, "
        + "no packet identifier."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING", selfVerified: false,
    generationAllowed: false, runtimeSelectable: false,
    commercialRoutesOpened: 0, productionTouched: false,
    grantsNothing: "A rendered packet is review evidence. It authorizes no fulfillment and opens no commercial route."
  });

  const counted = countCompleteness(maps, writeProofs, artifacts, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId: FAMILY_ID,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof, rendered artifacts and participant-instructions.md.",
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
    findings: buildFindings(resolved, censuses, maps, rbf)
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    mattersForTheReviewersAttention: [
      "production-field-map.json routeDeterminedSelections — this packet TICKS the `Pardon` box and declares the "
        + "other three relief types outside the route. That is the one mark the build makes and the item most worth "
        + "challenging: confirm that a regular-pardon route may state the relief type rather than ask for it, and "
        + "that Commutation, Reprieve and Remission of Fine are correctly read as different reliefs under "
        + "N.D.C.C. 12-55.1-01 rather than as wordings of the same one.",
      "reports/blanks-left-for-the-participant.json nearMissesRefusedByRole — twenty-eight blanks on this form bind a "
        + "participant fact and describe someone else, including seven that would have named the applicant as the "
        + "victim of their own offence. Confirm all five repeating tables are entirely empty in both fixtures.",
      "The residence table in item 18 is refused even though it really is about the applicant. The reasoning is that "
        + "a dated row of a residence history is a different fact from a current mailing address. A reviewer who "
        + "disagrees should say so: this is a judgement, not a measurement.",
      "participant-instructions.md — it leads with the form's own warning that a pardon does not expunge, with the "
        + "public-record consequence, and with the fact that signing consents to a fingerprint-based background "
        + "check. Counsel should confirm that framing.",
      "reports/blanks-left-for-the-participant.json formGapsCarriedToTheParticipant — the form prints two date blanks "
        + "with no widget to hold them and cross-references a question number the form does not have. Neither is "
        + "corrected by this packet."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    rasterState: "BUILT_RASTER_PENDING",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, documents: resolved.map((r) => r.formNumber),
    sourceSha256: resolved.map((r) => ({ formNumber: r.formNumber, sha256: r.sha256, byteLength: r.byteLength })),
    writes: maps.reduce((n, m) => n + m.canonicalWrites.length, 0),
    routeSelectionsMade: maps.reduce((n, m) => n + (m.routeDeterminedSelections ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    participantElections: maps.reduce((n, m) => n + m.selectionControls.length, 0),
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => {
      console.log(JSON.stringify(r, null, 2));
      /*
       * A build that did not build exits non-zero. A green exit code from a build
       * that produced no fixture is the kind of success message this factory is
       * told never to report from.
       */
      const built = r.status === "COMPLETED" || r.status === "CHECK_ONLY";
      if (!built) process.exit(2);
    })
    .catch((e) => { console.error(e); process.exit(1); });
}
