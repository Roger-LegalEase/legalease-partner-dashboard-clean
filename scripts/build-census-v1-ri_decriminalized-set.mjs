#!/usr/bin/env node
/**
 * The Rhode Island expungement packet host — five census-v1 families.
 *
 *   node scripts/build-census-v1-ri_decriminalized-set.mjs [--check] [--no-raster]
 *   node scripts/build-census-v1-ri_first_offender_misdemeanor-set.mjs
 *   node scripts/build-census-v1-ri_multiple_misdemeanors-set.mjs
 *   node scripts/build-census-v1-ri_first_offender_felony-set.mjs
 *   node scripts/build-census-v1-ri_deferred_sentence-set.mjs
 *
 * WHY ONE HOST, AND WHY IT IS A FAMILY FILE RATHER THAN A NEW ONE
 *
 * Rhode Island publishes ONE District Court form and ONE Superior Court felony
 * form, and each carries every statutory branch as a numbered PART of a single
 * affidavit. Three of these families are the same DC-33 binary read on three
 * different Parts; two are the same Superior-55 binary read on two. The
 * composed proposed order is likewise ONE District Court document shared by
 * three families and ONE Superior Court document shared by two — the owner's
 * decision requires each variant to be composed once, which is why all five
 * families were consolidated onto one lane.
 *
 * The host lives inside an OWNED family script rather than a new shared file
 * because PF02's owned paths are the five family scripts. Every family that
 * imports it is granted to this one lane, so the objection the Texas builder
 * records against a shared host — that it could not be changed without moving
 * the bytes of families outside the grant — does not arise here.
 *
 * WHAT IS BOUND, AND HOW
 *
 * Two official binaries, each bound by exact SHA-256 looked up in a CONTENT
 * INDEX of the mounted custodies rather than by any declared path:
 *
 *   DC-33        342337451d61e363e03febb384431dba2f9bb08b44ee46380b94fc91901e9908
 *                District Court Motion, Affidavit and Instructions to Expunge
 *                or Seal Record, revised February 2025, 4 pages, 77 AcroForm
 *                fields.
 *   Superior-55  e5805c5482e61ef39a88d8b50ea5a3556b5ffc40d3abb2200973016af4a9afca
 *                Superior Court Motion, Affidavit and Instructions to Expunge
 *                or Seal Record - Felony, revised February 2025, 4 pages, 74
 *                AcroForm fields.
 *
 * Path resolution is not used to FIND the bytes. Every mounted custody is
 * walked once and indexed by digest, and a family's pin is looked up in that
 * index; the committed corpus index is then consulted for the metadata it
 * records about the same digest. An empty index is a stop in itself, because a
 * scan that resolves nothing is indistinguishable from a scan with no
 * denominator.
 *
 * THE PROPOSED ORDER, AND THE DECISION THAT ALLOWS IT
 *
 * Page 1 of both forms, instruction 7, reads: "Bring the Order for Expungement
 * or Sealing of Record to the hearing." Rhode Island publishes no template for
 * it. On 2026-09-05 the owner approved LegalEase composing it as a CUSTOM
 * PARTICIPANT-PREPARED PROPOSED ORDER
 * (data/rcap-grade-a/legal-decisions/OWNER_RI_PROPOSED_ORDER_2026-09-05.json,
 * record OWN-RI-PROPOSED-ORDER-2026-09-05), on these terms, which this build
 * follows literally:
 *
 *   * official-form:DC-33-ORDER and official-form:Superior-55-ORDER are
 *     RETIRED. They named published forms that do not exist. Nothing here
 *     tries to acquire them and nothing here binds a source under them.
 *   * The parent motion-and-affidavit packet is NEVER bound under an order
 *     identity. That circular acquisition was made once in this repository and
 *     corrected; the order components below bind no source binary at all.
 *   * No official order identity is invented — not Superior-27-ORDER, not any
 *     other.
 *   * The composed order is never presented as an official Rhode Island form.
 *     Its own first lines say so, it carries no form number, and it names
 *     itself the moving party's document.
 *   * LegalEase populates OBJECTIVE CASE AND ROUTE FACTS ONLY. Judicial
 *     findings, the grant or denial, the signature, the entry date, the
 *     certification, the seal and any court-selected compliance terms stay
 *     blank. The decretal section is therefore printed as a block the COURT
 *     completes: unmarked boxes for granted and denied, unmarked boxes for
 *     each item of relief the motion requests, and an empty line for any
 *     further terms the court sets. Printing an option for a court to mark is
 *     not asserting it; pre-writing "IT IS ORDERED" would be.
 *
 *   THREE COURT-SPECIFIC VARIANTS ARE REQUIRED BY THAT DECISION AND TWO ARE
 *   BUILT HERE. The District Court variant serves ri_decriminalized,
 *   ri_first_offender_misdemeanor and ri_multiple_misdemeanors. The Superior
 *   Court felony-and-deferred-sentence variant serves ri_first_offender_felony
 *   and ri_deferred_sentence. The third variant — Superior Court MISDEMEANOR —
 *   is NOT composed, because no family on this roster takes it: Rhode Island's
 *   Superior Court misdemeanor route runs on form Superior-27, which no family
 *   here binds. Composing an order nothing uses would put an unreviewed
 *   participant document in the tree with no route to check it against.
 *
 * WHAT THIS BUILD WRITES, AND THE MUCH LONGER LIST OF WHAT IT DOES NOT
 *
 * The platform holds two facts about a Rhode Island participant that these
 * forms ask for: the person's full legal name and their date of birth. Both
 * are written into the caption of the motion, the caption of the affidavit and
 * the caption of the composed order.
 *
 * THE NAME IS WRITTEN THROUGH A MEASURED APPEARANCE, NOT THROUGH THE SHARED
 * DESCRIPTOR CHANNEL, AND THE REASON IS A DEFECT THIS BUILD REFUSED TO SHIP.
 * The caption blank under the printed word "Defendant" is named, by the form's
 * own author, "State of Rhode Island v Defendant". Run through
 * scripts/rcap-official-forms/rcap-field-semantics.mjs that name resolves to
 * participant.state, so the shared finalizer would have printed the
 * participant's STATE OF RESIDENCE on the line that holds the defendant's
 * name, on both the motion and the sworn affidavit. Explicit mapping cannot
 * correct it — decideBinding refuses an explicit mapping that disagrees with
 * the name channel — so every field on both binaries is classified unwritable
 * by role, the finalizer writes nothing and only sanitizes and flattens, and
 * the two held facts are then placed as Form XObject appearances inside the
 * widget rectangles measured first-hand off the pinned binary. Each such write
 * is additionally required to pass the shared protect rules
 * (protectCategoryOf) before it is placed, so the protection channel still
 * governs even though the descriptor channel does not choose the fact.
 *
 * Everything else on these forms is a case fact the platform has not seen, a
 * sworn statement only the participant may make, a block the court or the
 * clerk completes, or the notary's own certificate:
 *
 *   * The case number, the BCI number, and every count, charge and disposition
 *     row are REQUIRED_BEFORE_FILING, declared and disclosed.
 *   * The hearing date and the courtroom are the CLERK'S. Instruction 2 on
 *     page 1 of both forms says so in terms: "The Clerk's Office will fill in
 *     the hearing date for the motion."
 *   * The certification that notice has been given to the Office of the
 *     Attorney General and to the charging police is completed by the person
 *     filing AFTER notice has actually been given. Neither its date nor the
 *     name of the police force is written here; a certification dated before
 *     the act it certifies is false.
 *   * The Rhode Island Bar Number block belongs to an attorney filing the
 *     motion. No representation fact is held for a self-help participant.
 *   * NOT ONE AFFIDAVIT BOX IS MARKED. Instruction 5 reads "Put a check mark
 *     in the box for each statement that is true under the Part applicable to
 *     your motion." Every one of those boxes is a statement sworn under oath
 *     about the participant's own criminal history, financial obligations,
 *     pending proceedings and moral character. The platform holds no criminal
 *     history record and no docket, and "I have exhibited good moral
 *     character" is not a fact any platform can hold. Marking one would be
 *     swearing for the participant.
 *   * The whole notarial certificate — the state and county of the oath, the
 *     day, the month, the year, the name of the person who appeared, the
 *     identification relied on, the notary's signature, commission expiry and
 *     identification number, and the personally-known/satisfactory-evidence
 *     election — is completed by the notary public or the clerk who takes the
 *     oath. None of it is written and none of it is dated.
 *
 * WHAT IS SELECTED, BECAUSE THE ROUTE DETERMINES IT
 *
 * A packet built for one statutory route states which route it is. Two marks
 * are made on the motion, each drawn as two diagonal strokes strictly inside
 * the control's own measured rectangle — never a new box, never over the
 * court's own stroke:
 *
 *   * "expunged", not "sealed". All five families are expungement routes on
 *     their own committed legal names.
 *   * The second relief bullet — "All records and records of conviction
 *     relating to the conviction of the above-referenced case be expunged ...
 *     pursuant to G.L. 1956 Sec. 12-1.3-3(c) or (e)" — and not the first,
 *     which is the Sec. 12-1-12 / Sec. 12-1-12.1 destruction-and-sealing
 *     relief for a case that did not end in a conviction. Every family here is
 *     a conviction or deferred-sentence route, and ri_decriminalized's own
 *     committed authority is Sec. 12-1.3-3(e), which that bullet names.
 *
 * The affidavit PART is likewise route-determined and is stated — in the field
 * map, in the participant instructions and in the composed guidance — while
 * the boxes inside it stay for the participant. The Parts this route does not
 * use are declared NOT_APPLICABLE_ON_THIS_ROUTE, each naming the branch of the
 * form that puts it outside the route.
 *
 * TWO DISCREPANCIES ON RHODE ISLAND'S OWN FORMS, CARRIED RATHER THAN RESOLVED
 *
 *   1. SUPERIOR-55 PART TWO. Page 1 of the form says "Part Two: If you were
 *      convicted of a single FELONY offence and have not been previously
 *      convicted of or placed on probation for a felony or a misdemeanor."
 *      The Part Two box on page 3 of the same form reads "That I was convicted
 *      of a single MISDEMEANOR offense, and I have not been previously
 *      convicted of or placed on probation for a felony or a misdemeanor."
 *      The surrounding Part Two boxes carry the TEN-year period, which is the
 *      felony period, and Rhode Island publishes a separate Superior Court
 *      MISDEMEANOR form (Superior-27), so the wording reads as a drafting
 *      error carried over from the District Court form. This build does not
 *      decide that. It marks nothing, reproduces the form as published, tells
 *      the participant exactly what the two texts say and that they must not
 *      swear to a statement that is not true of their case, and raises it for
 *      counsel.
 *
 *   2. DC-33 PART THREE B. Page 1 says Part Three B is for a person "convicted
 *      of more than one (1) but less than six (6) misdemeanor offenses", while
 *      the Part Three B box on page 4 reads "That I have not been convicted of
 *      more than six (6) misdemeanors preceding the filing of this motion".
 *      More than one and fewer than six is at most five; not more than six is
 *      six. The committed track registry already records the ceiling as
 *      unresolved and names any count near it as a point where self-help ends.
 *      The packet carries both texts and that stop condition.
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

import { extractTextItems, groupIntoLines, extractPageGeometry }
  from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm, finalizeFlatOverlay, PARTICIPANT_INK_RGB }
  from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { loadAppearanceSemantics, dispositionsForFamily }
  from "./rcap-official-forms/rcap-appearance-semantics.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { protectCategoryOf } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { fitTextToWidget } from "./rcap-official-forms/rcap-text-fitting.mjs";
import { scanBytesForActiveContent } from "./rcap-official-forms/rcap-active-content.mjs";
import { classifyField, classifyBlank, rowKeyOf, PASS_COUNTERS, BLANK_DISPOSITIONS }
  from "./rcap-packet-completeness/completeness-contract.mjs";
import { createTokenSplitter, fitsByFontMetrics } from "./rcap-custom-pleading/split-token.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const {
  PDFDocument, StandardFonts, rgb,
  pushGraphicsState, popGraphicsState, translate, drawObject
} = require("pdf-lib");

const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";
const APPEARANCE_SEMANTICS = loadAppearanceSemantics();

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const DOTS = (n = 84) => ".".repeat(n);

/* ---- the refusal classes and the policy constructors ------------------------ */
const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

/** A fact the platform holds, written into this blank. */
const WRITE = (fact) => ({ policy: "write", fact });
/** A fact the platform does not hold, which the participant supplies before filing. */
const SUPPLY = (what, why) => ({ policy: "supply", what, why });
/** A blank that must stay blank: a signature, a signature date. */
const PROTECT = (why) => ({ policy: "protect", refusalClass: SIGNATURE, why });
/** A block the court, the clerk or the notary who takes the oath completes. */
const COURTOWN = (why) => ({ policy: "protect", refusalClass: COURT_OWNED, why });
/** A choice only the participant can make, which this route does not determine. */
const ELECTION = (what, why) => ({ policy: "election", what, why });
/** A blank on a branch of the form this route does not use. */
const OFFROUTE = (condition, why) => ({ policy: "offroute", condition, why });
/** An attorney-only block on a self-help packet. */
const ATTORNEY_ONLY = (why) => ({ policy: "attorney", why });
/** A control this build marks, because the route determines it. */
const SELECT = (why) => ({ policy: "select", why });

/* ---- the two bound binaries ------------------------------------------------- */
const FORMS = {
  "DC-33": Object.freeze({
    formNumber: "DC-33",
    sourceId: "official-form:DC-33",
    title: "District Court Motion, Affidavit and Instructions to Expunge or Seal Record",
    revisionPrinted: "DC-33 (revised February 2025)",
    court: "the Rhode Island District Court",
    courtShort: "District Court",
    instrumentKind: "motion_affidavit_and_instructions",
    sha256: "342337451d61e363e03febb384431dba2f9bb08b44ee46380b94fc91901e9908",
    pageCount: 4,
    motionPages: [1, 2],
    affidavitPages: [3, 4]
  }),
  "Superior-55": Object.freeze({
    formNumber: "Superior-55",
    sourceId: "official-form:Superior-55",
    title: "Superior Court Motion, Affidavit and Instructions to Expunge or Seal Record - Felony",
    revisionPrinted: "Superior-55 (revised February 2025)",
    court: "the Rhode Island Superior Court",
    courtShort: "Superior Court",
    instrumentKind: "motion_affidavit_and_instructions",
    sha256: "e5805c5482e61ef39a88d8b50ea5a3556b5ffc40d3abb2200973016af4a9afca",
    pageCount: 4,
    motionPages: [1, 2],
    affidavitPages: [3, 4]
  })
};

const S = {
  CAPTION: "Case caption on the motion",
  COURTHOUSE: "The judicial complex where the case is heard",
  RELIEF: "The relief the motion asks the court for",
  TABLE: "Counts, charges and dispositions",
  HEARING: "The hearing the Clerk's Office sets",
  NOTICE: "The certification that notice has been given",
  SIGN: "The block at the foot of the motion",
  AFF_CAPTION: "Case caption on the affidavit",
  AFF_SIGN: "The sworn signature block of the affidavit",
  NOTARY: "The notarial certificate"
};

/* Windows, in points, within which a field's pinned printed anchor must be found
 * above or below the widget's own rectangle. Wider for the charge table, whose
 * four rows all sit under one printed header. */
const NEAR = Object.freeze({ below: 16, above: 34 });
const NEAR_TABLE = Object.freeze({ below: 16, above: 70 });

/* ---- the motion page, shared in shape by both binaries ---------------------- */
const CLERK_SETS_THE_DATE =
  "instruction 2 on page 1 of this form says it in terms: \"The Clerk's Office will fill in the hearing date "
  + "for the motion. The date will be at least ten (10) days from the date the motion is filed\"";

const NOTICE_NOT_YET_GIVEN =
  "this line certifies that notice has ALREADY been given. Notice cannot be given until the Clerk's Office has "
  + "set the hearing date, so at the moment this packet is generated the fact does not exist. The person filing "
  + "completes it after notice has actually been given, and a certification completed in advance would be false";

const NOTARY_COMPLETES =
  "the notarial certificate is completed by the notary public or the clerk who administers the oath, at the "
  + "moment the affidavit is sworn. It is never completed by the person swearing, and a date written on it "
  + "before the oath is taken would be false";

function motionFields(form) {
  const T = {};
  T["State of Rhode Island v Defendant"] = {
    section: S.CAPTION, anchor: "Defendant",
    label: "Name of the Defendant, on the caption line of the motion",
    ...WRITE("participant.full_legal_name")
  };
  T["Case Number"] = {
    section: S.CAPTION, anchor: "Case Number",
    label: "Case number of the case the motion asks to expunge, in the caption of the motion",
    ...SUPPLY("the case number exactly as the court's own docket writes it",
      "the platform has not seen this participant's court record and holds no case number for it")
  };
  T["Date of Birth"] = {
    section: S.CAPTION, anchor: "Date of Birth",
    label: "Date of birth of the Defendant, in the caption of the motion",
    ...WRITE("participant.date_of_birth")
  };
  T["Bureau of Criminal Identification Number"] = {
    section: S.CAPTION, anchor: "Bureau of Criminal Identification Number",
    label: "Bureau of Criminal Identification number, in the caption of the motion",
    ...SUPPLY("your BCI number, copied from the Rhode Island criminal history record you obtain from the "
      + "Department of Attorney General's Bureau of Criminal Identification",
      "the BCI number is printed on a criminal history record the platform has never held for anyone")
  };
  for (const row of [1, 2, 3, 4]) {
    T[`1 Counts ${row}`] = {
      section: S.TABLE, anchor: "1. Count(s):", near: NEAR_TABLE,
      label: `Row ${row} of the charge table - the count number`,
      ...SUPPLY("the count number for this row, copied from the court's own docket",
        "the platform has not seen this participant's court record and holds no count number from it")
    };
    T[`2 Charges ${row}`] = {
      section: S.TABLE, anchor: "2. Charge(s):", near: NEAR_TABLE,
      label: `Row ${row} of the charge table - the charge`,
      ...SUPPLY("the charge for this row, written exactly as the court's own docket writes it",
        "the platform has not seen this participant's court record and holds no charge from it")
    };
    T[`3 Dispositions ${row}`] = {
      section: S.TABLE, anchor: "3. Disposition(s):", near: NEAR_TABLE,
      label: `Row ${row} of the charge table - how that count ended`,
      ...SUPPLY("how that count ended, written exactly as the court's own docket writes it",
        "the platform has not seen this participant's court record and holds no outcome from it")
    };
  }
  return T;
}

/* The tail of the motion page. The two binaries print the same blanks and name
 * them differently, because each form's field names were generated from the
 * sentence its widget happens to sit inside. Every name below was read
 * first-hand from the pinned binary and is checked against the printed line the
 * `anchor` pins, so a renamed or moved blank fails the build. */
const MOTION_TAIL = {
  "DC-33": {
    hearingDate: "the motion is filed by an attorney and the offense is not under GL 1956  311118 This motion",
    hearingTime: null,
    courtroom: "at 900 am in courtroom",
    noticeDate: "I hereby certify that pursuant to GL 1956  121121b1 or  12133a on",
    policeDepartment: "notified of this motion and the court date is at least ten 10 days prior to the hearing date",
    filerSignature: "s",
    barNumber: "Rhode Island Bar Number",
    signatureDate: "Date",
    affidavitSignature: "Text1",
    affidavitSignatureDate: "Date_2",
    notaryChoice: "Group2"
  },
  "Superior-55": {
    hearingDate: "An Affidavit is submitted in support of this motion except for decriminalized offenses when",
    hearingTime: "the motion is filed by an attorney This motion is called for a hearing on",
    courtroom: "in courtroom",
    noticeDate: "I hereby certify that pursuant to GL 1956  121121b1 or  12133a on",
    policeDepartment: "notified of this motion and the court date is at least ten 10 days prior to the hearing date",
    filerSignature: "s",
    barNumber: "Rhode Island Bar Number",
    signatureDate: "Date",
    affidavitSignature: "Text3",
    affidavitSignatureDate: "Date_2",
    notaryChoice: "Group4"
  }
};

function motionTailFields(form) {
  const N = MOTION_TAIL[form.formNumber];
  const T = {};
  T[N.hearingDate] = {
    section: S.HEARING, anchor: "is called for a hearing on",
    label: "Date the motion is called for a hearing",
    ...COURTOWN(CLERK_SETS_THE_DATE)
  };
  if (N.hearingTime) {
    T[N.hearingTime] = {
      section: S.HEARING, anchor: "in courtroom",
      label: "Hour at which the motion is called for a hearing",
      ...COURTOWN(CLERK_SETS_THE_DATE)
    };
  }
  T[N.courtroom] = {
    section: S.HEARING, anchor: "in courtroom",
    label: "Courtroom in which the motion is called for a hearing",
    ...COURTOWN(CLERK_SETS_THE_DATE)
  };
  T[N.noticeDate] = {
    section: S.NOTICE, anchor: "the Office of the Attorney General and the",
    label: "Date on which notice of this motion was given, on the certification line",
    ...SUPPLY("the date on which you actually gave notice - fill it in after you have given notice, never before",
      NOTICE_NOT_YET_GIVEN)
  };
  T[N.policeDepartment] = {
    section: S.NOTICE, anchor: "Police Department, which originally brought this charge",
    label: "Name of the police that originally brought this charge, on the certification line",
    ...SUPPLY("the name of the police force that brought the charge, copied from the court's own docket",
      "the platform has not seen this participant's court record and holds no charging police force from it")
  };
  T[N.filerSignature] = {
    section: S.SIGN, anchor: "Attorney for the Defendant or the Defendant",
    label: "Signature line at the foot of the motion",
    ...PROTECT("the motion is the participant's own and is signed when they actually file it")
  };
  T[N.barNumber] = {
    section: S.SIGN, anchor: "Rhode Island Bar Number",
    label: "Rhode Island Bar Number block at the foot of the motion",
    ...ATTORNEY_ONLY("attorney-only: the Rhode Island Bar Number block is completed only where an attorney files "
      + "the motion, and no attorney-representation fact is held for a participant filing for themselves")
  };
  T[N.signatureDate] = {
    section: S.SIGN, anchor: "Date",
    label: "Date beside the signature at the foot of the motion",
    ...PROTECT("the motion is dated by the person who signs it, on the day they sign it")
  };
  return T;
}

function affidavitCaptionAndOathFields(form) {
  const N = MOTION_TAIL[form.formNumber];
  const T = {};
  T["State of Rhode Island v Defendant_2"] = {
    section: S.AFF_CAPTION, anchor: "Defendant",
    label: "Name of the Defendant, on the caption line of the affidavit",
    ...WRITE("participant.full_legal_name")
  };
  T["Case Number_2"] = {
    section: S.AFF_CAPTION, anchor: "Case Number",
    label: "Case number in the caption of the affidavit",
    ...SUPPLY("the case number, the same one you wrote on the motion",
      "the platform has not seen this participant's court record and holds no case number for it")
  };
  T["Date of Birth_2"] = {
    section: S.AFF_CAPTION, anchor: "Date of Birth",
    label: "Date of birth of the Defendant, in the caption of the affidavit",
    ...WRITE("participant.date_of_birth")
  };
  T["Bureau of Criminal Identification Number_2"] = {
    section: S.AFF_CAPTION, anchor: "Bureau of Criminal Identification Number",
    label: "Bureau of Criminal Identification number, in the caption of the affidavit",
    ...SUPPLY("your BCI number, the same one you wrote on the motion",
      "the BCI number is printed on a criminal history record the platform has never held for anyone")
  };
  T[N.affidavitSignature] = {
    section: S.AFF_SIGN, anchor: "Signature of the Defendant",
    label: "Signature of the Defendant on the affidavit",
    ...PROTECT("the affidavit is sworn under oath and is signed in the presence of a notary public or a clerk, "
      + "never in advance")
  };
  T[N.affidavitSignatureDate] = {
    section: S.AFF_SIGN, anchor: "Date:",
    label: "Date beside the signature on the sworn affidavit",
    ...PROTECT("a date written on a document sworn under oath before the oath is taken would be false")
  };
  T["State of"] = {
    section: S.NOTARY, anchor: "State of", label: "State named in the notarial certificate",
    ...COURTOWN(NOTARY_COMPLETES)
  };
  T["County of"] = {
    section: S.NOTARY, anchor: "County of", label: "County named in the notarial certificate",
    ...COURTOWN(NOTARY_COMPLETES)
  };
  T["On this"] = {
    section: S.NOTARY, anchor: "day of", label: "Day of the month on which the oath is taken, in the notarial certificate",
    ...COURTOWN(NOTARY_COMPLETES)
  };
  T["day of"] = {
    section: S.NOTARY, anchor: "day of", label: "Month in which the oath is taken, in the notarial certificate",
    ...COURTOWN(NOTARY_COMPLETES)
  };
  T["20"] = {
    section: S.NOTARY, anchor: "day of", label: "Year in which the oath is taken, in the notarial certificate",
    ...COURTOWN(NOTARY_COMPLETES)
  };
  T["public personally appeared"] = {
    section: S.NOTARY, anchor: "personally appeared",
    label: "Name of the person who appeared, recorded in the notarial certificate",
    ...COURTOWN(NOTARY_COMPLETES)
  };
  T["which was"] = {
    section: S.NOTARY, anchor: "which was",
    label: "Identification relied on, recorded in the notarial certificate",
    ...COURTOWN(NOTARY_COMPLETES)
  };
  T["Notary Public"] = {
    section: S.NOTARY, anchor: "Notary Public:", label: "Signature line of the notary public",
    ...COURTOWN(NOTARY_COMPLETES)
  };
  T["My commission expires"] = {
    section: S.NOTARY, anchor: "My commission expires:", label: "Expiry of the notary's commission",
    ...COURTOWN(NOTARY_COMPLETES)
  };
  T["Notary identification number"] = {
    section: S.NOTARY, anchor: "Notary identification number:", label: "Identification number of the notary public",
    ...COURTOWN(NOTARY_COMPLETES)
  };
  T[N.notaryChoice] = {
    section: S.NOTARY, anchor: "personally known to me or", selection: true,
    label: "How the notary identified the person who appeared - personally known, or satisfactory evidence",
    ...COURTOWN(NOTARY_COMPLETES)
  };
  return T;
}

/* ---- the judicial complexes, and the two route-determined marks ------------- */
const COMPLEXES = {
  "DC-33": [
    ["Murray Judicial Complex", "Murray Judicial", "Murray Judicial Complex, 2nd Division, 45 Washington Square, Newport"],
    ["Noel Judicial Complex", "Noel Judicial", "Noel Judicial Complex, 3rd Division, 222 Quaker Lane, Warwick"],
    ["McGrath Judicial Complex", "McGrath Judicial", "McGrath Judicial Complex, 4th Division, 4800 Tower Hill Road, Wakefield"],
    ["Garrahy Judicial Complex", "Garrahy Judicial", "Garrahy Judicial Complex, 6th Division, One Dorrance Plaza, Providence"]
  ],
  "Superior-55": [
    ["Murray Judicial Complex", "Murray Judicial", "Murray Judicial Complex, Newport County, 45 Washington Square, Newport"],
    ["Noel Judicial Complex", "Noel Judicial", "Noel Judicial Complex, Kent County, 222 Quaker Lane, Warwick"],
    ["McGrath Judicial Complex", "McGrath Judicial", "McGrath Judicial Complex, Washington County, 4800 Tower Hill Road, Wakefield"],
    ["Licht Judicial Complex", "Licht Judicial", "Licht Judicial Complex, Providence/Bristol County, 250 Benefit Street, Providence"]
  ]
};

const RELIEF_NONCONVICTION = {
  "DC-33": "Pursuant to GL 1956  12112 any fingerprints photographs physical measurements or",
  "Superior-55": "Pursuant to GL 1956  12112 any fingerprints photographs physical measurements"
};
const RELIEF_CONVICTION_EXPUNGEMENT =
  "All records and records of conviction relating to the conviction of the abovereferenced";

function selectionFields(form, route) {
  const T = {};
  for (const [name, anchor, where] of COMPLEXES[form.formNumber]) {
    T[name] = {
      section: S.COURTHOUSE, anchor, selection: true,
      label: `Box marking that the case is in the ${where}`,
      ...ELECTION(`mark the one box for the ${form.courtShort} location where your case was heard`,
        "which of the four locations heard the case is a fact of the participant's own case, printed on the "
        + "docket. The platform has not seen that record, the route is statewide and does not determine it, and "
        + "the form asks for it as a box to mark rather than a value to write")
    };
  }
  T.expunged = {
    section: S.RELIEF, anchor: "expunged", selection: true,
    label: "Box electing EXPUNGEMENT of the record rather than sealing",
    ...SELECT(`this packet is built for ${route.legalName}, whose committed legal name and statutory authority `
      + "are an EXPUNGEMENT. A packet built for one statutory route states which route it is rather than asking "
      + "the participant to choose between remedies")
  };
  T.sealed = {
    section: S.RELIEF, anchor: "sealed", selection: true,
    label: "Box electing SEALING of the record rather than expungement",
    ...OFFROUTE(
      `this packet is built for ${route.legalName} under ${route.statute}, which is an expungement route, and the `
      + "expungement box beside this one is the box this route marks. Sealing under G.L. 1956 Sec. 12-1-12.1 is a "
      + "different remedy on a different branch of Chapter 12-1, and no family on this route asks for it",
      "electing sealing on an expungement route would ask the court for relief the motion does not plead")
  };
  T[RELIEF_NONCONVICTION[form.formNumber]] = {
    section: S.RELIEF, anchor: "Pursuant to G.L. 1956 § 12-1-12,", selection: true,
    label: "Box asking that fingerprints and identification records be destroyed and records sealed under "
      + "G.L. 1956 Sec. 12-1-12 and Sec. 12-1-12.1",
    ...OFFROUTE(
      "this is the destruction-and-sealing relief of G.L. 1956 Sec. 12-1-12 and Sec. 12-1-12.1, which is the "
      + `branch of this form for a case that did not end in a conviction. ${route.notAConvictionBranchWhy}`,
      "asking for the non-conviction destruction-and-sealing relief on a conviction route would plead a remedy "
      + "under a section this route does not run on")
  };
  T[RELIEF_CONVICTION_EXPUNGEMENT] = {
    section: S.RELIEF, anchor: "All records and records of conviction", selection: true,
    label: "Box asking that all records and records of conviction in the case be expunged and every index and "
      + "other reference removed from public inspection under G.L. 1956 Sec. 12-1.3-3(c) or (e)",
    ...SELECT("this is the relief this route asks for, on the section this route runs on. "
      + `${route.convictionExpungementWhy}`)
  };
  return T;
}

/* ---- the affidavit, Part by Part -------------------------------------------- *
 * Every box below was read first-hand from the pinned binary: the AcroForm field
 * name, and the printed statement standing beside it on the page. The statement
 * is reproduced here verbatim from the form and is checked against the printed
 * line at build time, so a revision that reworded a box fails the build rather
 * than shipping a stale label.
 *
 * NOT ONE OF THEM IS MARKED. Instruction 5 on page 1 reads "Put a check mark in
 * the box for each statement that is TRUE under the Part applicable to your
 * motion". Each is sworn under oath about the participant's own criminal
 * history, financial obligations, pending proceedings and character.
 */
const PARTS = {
  "DC-33": [
    {
      id: "ONE",
      printedName: "Part One: Acquittals, Dismissals, No True Bill, No Information",
      appliesWhen: "the case ended in an acquittal, a dismissal, a no true bill or no information filed",
      boxes: [
        ["That I was charged with the crimes listed in Box 2 of the motion",
          "That I was charged with the crime(s) listed in Box 2 of the motion.",
          "That I was charged with the crime(s) listed in Box 2 of the motion."],
        ["That I was acquitted or otherwise exonerated of this offenses",
          "That I was acquitted or otherwise exonerated of this offense(s).",
          "That I was acquitted or otherwise exonerated of this offense(s)."],
        ["That the case was dismissed against me",
          "That the case was dismissed against me.",
          "That the case was dismissed against me."],
        ["That a no true bill was returned",
          "That a no true bill was returned.",
          "That a no true bill was returned."],
        ["That no information was filed",
          "That no information was filed.",
          "That no information was filed."]
      ]
    },
    {
      id: "TWO",
      printedName: "Part Two: Decriminalized Offense",
      appliesWhen: "the offence has been decriminalized since the date of the conviction",
      boxes: [
        ["That I was charged with the crime listed in Box 2 of the motion",
          "That I was charged with the crime listed in Box 2 of the motion.",
          "That I was charged with the crime listed in Box 2 of the motion."],
        ["That I received the disposition listed in Box 3 of the motion",
          "That I received the disposition listed in Box 3 of the motion.",
          "That I received the disposition listed in Box 3 of the motion."],
        ["That all conditions of the original criminal sentence have been",
          "That all conditions of the original criminal sentence have been",
          "That all conditions of the original criminal sentence have been completed."],
        ["That I have satisfied in full any and all outstanding courtimposed andor",
          "That I have satisfied in full any and all outstanding court-imposed and/or",
          "That I have satisfied in full any and all outstanding court-imposed and/or court-related fines, fees, costs, assessments, and/or charges."],
        ["That the offense has been decriminalized subsequent to the date of my",
          "That the offense has been decriminalized subsequent to the date of my",
          "That the offense has been decriminalized subsequent to the date of my conviction."]
      ]
    },
    {
      id: "THREE_A",
      printedName: "Part Three A: Single Conviction",
      appliesWhen: "the person was convicted of a single misdemeanor offence and has not previously been convicted of, or placed on probation for, a felony or a misdemeanor",
      boxes: [
        ["That I was charged with the crime listed in Box 2 of the motion_2",
          "That I was charged with the crime listed in Box 2 of the motion.",
          "That I was charged with the crime listed in Box 2 of the motion."],
        ["That I received the disposition listed in Box 3 of the motion_2",
          "That I received the disposition listed in Box 3 of the motion.",
          "That I received the disposition listed in Box 3 of the motion."],
        ["That the disposition listed in Box 3 of this motion is not a conviction for a",
          "That the disposition listed in Box 3 of this motion is not a conviction for a",
          "That the disposition listed in Box 3 of this motion is not a conviction for a crime of violence."],
        ["That the charge was reclassified from a felony to a misdemeanor if applicable",
          "That the charge was reclassified from a felony to a misdemeanor, if applicable.",
          "That the charge was reclassified from a felony to a misdemeanor, if applicable."],
        ["That I was convicted of a single misdemeanor offense and I have not been",
          "That I was convicted of a single misdemeanor offense, and I have not been",
          "That I was convicted of a single misdemeanor offense, and I have not been previously convicted of or placed on probation for a felony or a misdemeanor."],
        ["That more than five 5 years have passed from the date of the completion of my",
          "That more than five (5) years have passed from the date of the completion of my",
          "That more than five (5) years have passed from the date of the completion of my last sentence."],
        ["That in the five 5 years preceding the filing of this motion I have not been",
          "That in the five (5) years preceding the filing of this motion, I have not been",
          "That in the five (5) years preceding the filing of this motion, I have not been convicted of nor arrested for any felony or misdemeanor."],
        ["That there are no criminal proceedings pending against me and I have exhibited",
          "That there are no criminal proceedings pending against me, and I have exhibited",
          "That there are no criminal proceedings pending against me, and I have exhibited good moral character."],
        ["That I have satisfied in full any and all outstanding courtimposed andor court",
          "That I have satisfied in full any and all outstanding court-imposed and/or court-",
          "That I have satisfied in full any and all outstanding court-imposed and/or court-related fines, fees, costs, assessments, and/or charges."]
      ]
    },
    {
      id: "THREE_B",
      printedName: "Part Three B: Multiple Convictions",
      appliesWhen: "the person was convicted of more than one but fewer than six misdemeanor offences and has not been convicted of a felony",
      boxes: [
        ["That I was charged with the crimes listed in Box 2 of the motion_2",
          "That I was charged with the crimes listed in Box 2 of the motion.",
          "That I was charged with the crimes listed in Box 2 of the motion."],
        ["That I received the dispositions listed in Box 3 of the motion",
          "That I received the dispositions listed in Box 3 of the motion.",
          "That I received the dispositions listed in Box 3 of the motion."],
        ["That none of the dispositions listed in Box 3 of this motion are convictions for",
          "That none of the dispositions listed in Box 3 of this motion are convictions for",
          "That none of the dispositions listed in Box 3 of this motion are convictions for a crime violence."],
        ["That the charge was reclassified from a felony to a misdemeanor if applicable_2",
          "That the charge was reclassified from a felony to a misdemeanor, if applicable.",
          "That the charge was reclassified from a felony to a misdemeanor, if applicable."],
        ["That none of the dispositions listed in Box 3 of this motion are convictions under",
          "That none of the dispositions listed in Box 3 of this motion are convictions under",
          "That none of the dispositions listed in Box 3 of this motion are convictions under Chapter 29 of Title 12 (Domestic Violence Prevention Act), G.L. 1956 Sec. 31-27-2 (Driving Under the Influence of Liquor or Drugs), or G.L. 1956 Sec. 31-27-2.1 (Refusal to Submit to Chemical Test)."],
        ["That I have not been convicted of more than six 6 misdemeanors preceding the",
          "That I have not been convicted of more than six (6) misdemeanors preceding the",
          "That I have not been convicted of more than six (6) misdemeanors preceding the filing of this motion and have not been convicted of a felony."],
        ["That more than ten 10 years have passed from the date of the completion of",
          "That more than ten (10) years have passed from the date of the completion of",
          "That more than ten (10) years have passed from the date of the completion of my last sentence."],
        ["That in the ten 10 years preceding the filing of this motion I have not been",
          "That in the ten (10) years preceding the filing of this motion I have not been",
          "That in the ten (10) years preceding the filing of this motion I have not been convicted of nor arrested for any felony or misdemeanor."],
        ["That there are no criminal proceedings pending against me and I have exhibited_2",
          "That there are no criminal proceedings pending against me, and I have exhibited",
          "That there are no criminal proceedings pending against me, and I have exhibited good moral character."],
        ["That I have satisfied in full any and all outstanding courtimposed andor court_2",
          "That I have satisfied in full any and all outstanding court-imposed and/or court-",
          "That I have satisfied in full any and all outstanding court-imposed and/or court-related fines, fees, costs, assessments, and/or charges."]
      ]
    }
  ],
  "Superior-55": [
    {
      id: "ONE",
      printedName: "Part One: Acquittals, Dismissals, No True Bill, No Information",
      appliesWhen: "the case ended in an acquittal, a dismissal, a no true bill or no information filed",
      boxes: [
        ["That I was charged with the crimes listed in Box 2 of the motion",
          "That I was charged with the crime(s) listed in Box 2 of the motion.",
          "That I was charged with the crime(s) listed in Box 2 of the motion."],
        ["That I was acquitted or otherwise exonerated of this offenses",
          "That I was acquitted or otherwise exonerated of this offense(s).",
          "That I was acquitted or otherwise exonerated of this offense(s)."],
        ["That the case was dismissed against me",
          "That the case was dismissed against me.",
          "That the case was dismissed against me."],
        ["That a no true bill was returned",
          "That a no true bill was returned.",
          "That a no true bill was returned."],
        ["That no information was filed",
          "That no information was filed.",
          "That no information was filed."]
      ]
    },
    {
      id: "TWO",
      printedName: "Part Two: Single Conviction",
      appliesWhen: "page 1 of this form says Part Two is for a person convicted of a single FELONY offence who has not previously been convicted of, or placed on probation for, a felony or a misdemeanor - while the fourth box of Part Two itself reads MISDEMEANOR. The two texts disagree and this packet resolves nothing; see the discrepancy note in the participant instructions",
      boxes: [
        ["That I was charged with the crime listed in Box 2 of the motion",
          "That I was charged with the crime listed in Box 2 of the motion.",
          "That I was charged with the crime listed in Box 2 of the motion."],
        ["That I received the disposition listed in Box 3 of the motion",
          "That I received the disposition listed in Box 3 of the motion.",
          "That I received the disposition listed in Box 3 of the motion."],
        ["That the disposition listed in Box 3 of this motion is not a conviction for a",
          "That the disposition listed in Box 3 of this motion is not a conviction for a",
          "That the disposition listed in Box 3 of this motion is not a conviction for a crime of violence."],
        ["That I was convicted of a single misdemeanor offense and I have not been",
          "That I was convicted of a single misdemeanor offense, and I have not been",
          "That I was convicted of a single misdemeanor offense, and I have not been previously convicted of or placed on probation for a felony or a misdemeanor."],
        ["That more than ten 10 years have passed from the date of the completion of",
          "That more than ten (10) years have passed from the date of the completion of",
          "That more than ten (10) years have passed from the date of the completion of my last sentence."],
        ["That in the ten 10 years preceding the filing of this motion I have not been",
          "That in the ten (10) years preceding the filing of this motion, I have not been",
          "That in the ten (10) years preceding the filing of this motion, I have not been convicted of nor arrested for any felony or misdemeanor."],
        ["That there are no criminal proceedings pending against me and I have",
          "That there are no criminal proceedings pending against me, and I have",
          "That there are no criminal proceedings pending against me, and I have exhibited good moral character."],
        ["That I have satisfied in full any and all outstanding courtimposed andor court",
          "That I have satisfied in full any and all outstanding court-imposed and/or court-",
          "That I have satisfied in full any and all outstanding court-imposed and/or court-related fines, fees, costs, assessments, and/or charges."]
      ]
    },
    {
      id: "THREE",
      printedName: "Part Three: Deferred Sentence",
      appliesWhen: "the person pled guilty or nolo contendere and the sentence was deferred under a written deferral agreement",
      boxes: [
        ["That I was charged with the crime listed in Box 2 of the motion_2",
          "That I was charged with the crime listed in Box 2 of the motion.",
          "That I was charged with the crime listed in Box 2 of the motion."],
        ["That I pled guilty or nolo contendere to the crime listed in Box 2 of this",
          "That I pled guilty or nolo contendere to the crime listed in Box 2 of this",
          "That I pled guilty or nolo contendere to the crime listed in Box 2 of this motion."],
        ["That my sentence for the crime listed in Box 2 of this motion was deferred by",
          "That my sentence for the crime listed in Box 2 of this motion was deferred by",
          "That my sentence for the crime listed in Box 2 of this motion was deferred by the court pursuant to a written deferral agreement filed with the clerk of court.",
          /* Curated label. The verbatim statement carries the words "by the court"
           * and "clerk", which the completeness contract's field classifier reads
           * as a court-only field. This box is not court-only: it is the
           * participant's own sworn statement, and it is classified as one. The
           * verbatim text still travels on the row as its printed line. */
          "Sworn statement in Part Three that the sentence for the charge in Box 2 was deferred under a written deferral agreement filed with the court"],
        ["That I have completed my deferment sentence",
          "That I have completed my deferment sentence.",
          "That I have completed my deferment sentence."],
        ["That I have complied with all the terms and conditions of my deferral",
          "That I have complied with all the terms and conditions of my deferral",
          "That I have complied with all the terms and conditions of my deferral agreement, including, but not limited to, the payment of any and all outstanding court-imposed and/or court-related fines, fees, costs, assessments, and/or charges."],
        ["That I have not been convicted of a crime of violence",
          "That I have not been convicted of a crime of violence.",
          "That I have not been convicted of a crime of violence."],
        ["That there are no criminal proceedings pending against me and I have_2",
          "That there are no criminal proceedings pending against me, and I have",
          "That there are no criminal proceedings pending against me, and I have exhibited good moral character."]
      ]
    },
    {
      id: "FOUR",
      printedName: "Part Four: Decriminalized Offense",
      appliesWhen: "the offence has been decriminalized since the date of the conviction",
      boxes: [
        ["That I was charged with the crime listed in Box 2 of the motion_3",
          "That I was charged with the crime listed in Box 2 of the motion.",
          "That I was charged with the crime listed in Box 2 of the motion."],
        ["That I received the disposition listed in Box 3 of the motion_2",
          "That I received the disposition listed in Box 3 of the motion.",
          "That I received the disposition listed in Box 3 of the motion."],
        ["That all conditions of the original criminal sentence have been",
          "That all conditions of the original criminal sentence have been",
          "That all conditions of the original criminal sentence have been completed."],
        ["That I have satisfied in full any and all outstanding courtimposed",
          "That I have satisfied in full any and all outstanding court-imposed",
          "That I have satisfied in full any and all outstanding court-imposed and/or court-related fines, fees, costs, assessments, and/or charges."],
        ["That the offense has been decriminalized subsequent to the date of my",
          "That the offense has been decriminalized subsequent to the date of my",
          "That the offense has been decriminalized subsequent to the date of my conviction."]
      ]
    }
  ]
};

function affidavitPartFields(form, onRoutePartId) {
  const T = {};
  const parts = PARTS[form.formNumber];
  const onRoute = parts.find((p) => p.id === onRoutePartId);
  assert.ok(onRoute, `${form.formNumber}: no affidavit Part ${onRoutePartId}`);
  for (const part of parts) {
    const n = part.boxes.length;
    part.boxes.forEach(([name, anchor, statement, curatedLabel], index) => {
      const label = curatedLabel
        ?? `${part.printedName} - sworn statement ${index + 1} of ${n}: ${statement}`;
      T[name] = {
        section: part.printedName, anchor, selection: true, label, printedStatement: statement,
        ...(part.id === onRoutePartId
          ? ELECTION(
            "mark this box only if the statement is true of your own case, and leave it unmarked if it is not",
            "this is a statement sworn under oath about the participant's own record, financial obligations, "
            + "pending proceedings or character. The platform holds no Rhode Island criminal history record and "
            + "no court docket for anyone, and marking it would be swearing for the participant. Instruction 5 "
            + "on page 1 of this form asks the person filing to mark each statement that is TRUE")
          : OFFROUTE(
            `this box belongs to ${part.printedName} of this form's affidavit, which applies where `
            + `${part.appliesWhen}. This packet is built on ${onRoute.printedName}, and page 1 of this form `
            + "directs the person filing to identify the one Part applicable to their motion",
            "a box in a Part this route does not use is outside this route, and marking or asking for it would "
            + "put a statement from another statutory branch on a sworn affidavit"))
      };
    });
  }
  return T;
}

/* ---- what the committed record says, read at build time --------------------- */
const TRACK_REGISTRY = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/record-clearing/legal-design-track-registry.json"), "utf8"));

function trackRecord(trackId) {
  const track = (TRACK_REGISTRY.tracks ?? []).find((row) => row.trackId === trackId);
  assert.ok(track, `${trackId}: no committed track registry entry`);
  const stops = (track.selfHelpStopConditions ?? []).map((c) => String(c).trim()).filter(Boolean);
  assert.ok(stops.length, `${trackId}: the track registry holds no self-help stop condition`);
  const exclusions = (track.exclusions ?? []).map((c) => String(c).trim()).filter(Boolean);
  assert.ok(exclusions.length, `${trackId}: the track registry holds no exclusion`);
  const waits = (track.waitingPeriods ?? []).map((w) => `${w.condition}: ${w.duration}`);
  assert.ok(waits.length, `${trackId}: the track registry holds no waiting period`);
  const docs = (track.participantFilingRequirements ?? [])
    .filter((d) => d.requirement === "required")
    .map((d) => ({ name: String(d.name), from: String(d.obtainedFrom ?? ""), how: String(d.howToObtain ?? "") }));
  assert.ok(docs.length, `${trackId}: the track registry names no document the participant must obtain`);
  return Object.freeze({
    legalName: track.legalName, publicName: track.publicName, authority: track.authority ?? [],
    venue: track.venue, mechanism: track.mechanism,
    rules: track.rules ?? {}, stops: Object.freeze(stops), exclusions: Object.freeze(exclusions),
    waits: Object.freeze(waits), documents: Object.freeze(docs),
    officialSources: track.officialSources ?? []
  });
}

/* ---- the composed proposed order -------------------------------------------- *
 * One District Court variant and one Superior Court felony-and-deferred-sentence
 * variant, each composed once and shared by the families that use it. See the
 * header: the owner's decision of 2026-09-05 is what allows this document to
 * exist at all, and it is what keeps the whole decretal block empty.
 */
const ORDER_NOT_AN_OFFICIAL_FORM =
  "THIS IS NOT A FORM PUBLISHED BY THE RHODE ISLAND JUDICIARY. Instruction 7 on page 1 of the court's own "
  + "motion says \"Bring the Order for Expungement or Sealing of Record to the hearing\", and Rhode Island "
  + "publishes no template for that order. This page is the moving party's OWN proposed order. The Court may "
  + "sign it, change it, refuse it, or enter an order of its own instead.";

const ORDER_COURT_BLOCK_NOTICE =
  "EVERYTHING BELOW THIS LINE IS THE COURT'S. It is left blank on purpose. No finding, no grant, no denial, no "
  + "condition, no signature, no date of entry, no certification and no seal is written here by the moving "
  + "party or by LegalEase.";

const ORDER_VARIANTS = {
  DISTRICT_COURT: {
    variantId: "ri-district-court-proposed-order",
    heading: "ORDER FOR EXPUNGEMENT OR SEALING OF RECORD",
    courtLine: "DISTRICT COURT OF THE STATE OF RHODE ISLAND",
    usedBy: ["ri_decriminalized-set", "ri_first_offender_misdemeanor-set", "ri_multiple_misdemeanors-set"],
    divisionPrompt: "Division and judicial complex"
  },
  SUPERIOR_COURT_FELONY_AND_DEFERRED: {
    variantId: "ri-superior-court-felony-and-deferred-sentence-proposed-order",
    heading: "ORDER FOR EXPUNGEMENT OR SEALING OF RECORD",
    courtLine: "SUPERIOR COURT OF THE STATE OF RHODE ISLAND",
    usedBy: ["ri_first_offender_felony-set", "ri_deferred_sentence-set"],
    divisionPrompt: "County and judicial complex"
  }
};

/** The relief the motion pleads, quoted from the court's own motion page. */
const RELIEF_QUOTED_FROM_THE_MOTION =
  "that all records and records of conviction relating to the conviction of the above-referenced case be "
  + "expunged and all index and other references to the case be removed from public inspection pursuant to "
  + "G.L. 1956 Sec. 12-1.3-3(c) or (e)";

function proposedOrderBody(route, facts) {
  const variant = ORDER_VARIANTS[route.orderVariant];
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const L = [];
  L.push(variant.heading, "(PROPOSED - brought to the hearing by the moving party)", "");
  L.push(ORDER_NOT_AN_OFFICIAL_FORM, "");
  L.push(variant.courtLine, "");
  L.push("STATE OF RHODE ISLAND");
  L.push("v.");
  L.push(name);
  L.push("Defendant", "");
  L.push(`${variant.divisionPrompt}: ${DOTS(46)}`);
  L.push("Case Number: " + DOTS(40));
  L.push(`Date of Birth: ${dob}`);
  L.push("Bureau of Criminal Identification Number: " + DOTS(28), "");
  L.push("THE MOTION THIS ORDER IS PROPOSED ON", "");
  L.push(`This order is proposed on the Defendant's Motion to Expunge or Seal Record filed in the `
    + `above-referenced case under ${route.statute}, and on the Affidavit in Support of that Motion, `
    + `${route.partPrintedName}.`, "");
  L.push("The counts, charges and dispositions the motion asks to expunge, as they are listed in Boxes 1, 2 and "
    + "3 of the motion. Copy them from the motion; they are not filled in here because the platform has not seen "
    + "the court record they come from.", "");
  for (const row of [1, 2, 3, 4]) {
    L.push(`  ${row}.  Count: ${DOTS(12)}   Charge: ${DOTS(30)}   Disposition: ${DOTS(20)}`);
  }
  L.push("");
  L.push("Date of the hearing on the motion, as the Clerk's Office set it: " + DOTS(24), "");
  /*
   * The page's own disclaimer and the machine route trailer CLOSE THE MOVING
   * PARTY'S HALF OF THE ORDER, above the rule, and are never printed below it.
   *
   * They used to be the last two lines of this document, which put them under
   * "Certification or attestation by the Clerk" - so a Rhode Island justice was
   * handed internal identifiers beneath the clerk's certification line, inside
   * the block ORDER_COURT_BLOCK_NOTICE says on its face is the court's and is
   * left blank on purpose. Everything below the rule is the court's; the
   * trailer belongs to the party's section, so it stays in it. Nothing in the
   * decretal block moves, gains or loses a character: findings, grant, denial,
   * relief marks, further terms, signature, date of entry, certification and
   * seal are the same empty lines OWN-RI-PROPOSED-ORDER-2026-09-05 requires.
   */
  L.push(`Composed by LegalEase for ${name}, as the moving party's own proposed order. It is not an official `
    + "Rhode Island form, and no part of it is a finding, a grant, a denial, a signature, an entry, a "
    + "certification or a seal.", "");
  L.push(`Route: ${route.routeKeys.join(" ; ")}`, "");
  L.push(DOTS(96), "");
  L.push(ORDER_COURT_BLOCK_NOTICE, "");
  L.push("The Court's findings:");
  L.push(DOTS(96));
  L.push(DOTS(96));
  L.push(DOTS(96), "");
  L.push("[  ]  The motion is GRANTED.          [  ]  The motion is DENIED.", "");
  L.push("If the motion is granted, the Court orders the relief it marks below:", "");
  L.push(`[  ]  ${RELIEF_QUOTED_FROM_THE_MOTION};`, "");
  L.push("[  ]  other relief the Court orders: " + DOTS(50), "");
  L.push("Any further terms or conditions the Court sets:");
  L.push(DOTS(96));
  L.push(DOTS(96), "");
  L.push("Entered as an order of the Court:", "");
  L.push(DOTS(52) + "        Date of entry: " + DOTS(22));
  L.push("Justice / Judge", "");
  L.push("Certification or attestation by the Clerk: " + DOTS(44));
  return L.join("\n");
}

/* ---- the composed guidance pages -------------------------------------------- */
const INSTRUCTION_7 = "Bring the Order for Expungement or Sealing of Record to the hearing.";
const INSTRUCTION_8 =
  "If your motion is granted, all financial obligations owed (fines, fees, costs, restitution, and assessments) "
  + "must be paid in full to complete the expungement process. Upon all conditions being satisfied, the clerk's "
  + "office will prepare three (3) certified copies of the order. One (1) copy is for your records, one (1) copy "
  + "is for the Office of the Attorney General's Bureau of Criminal Identification Unit (BCI), and one (1) copy "
  + "is for the police department that charged the case. You are responsible for delivering the copies to these "
  + "agencies.";

function noticeSection(route) {
  const L = [];
  L.push("WHO MUST BE TOLD, AND WHEN.", "");
  L.push("The motion's own certification line says that, under G.L. 1956 Sec. 12-1-12.1(b)(1) or Sec. 12-1.3-3(a), "
    + "the Office of the Attorney General AND the police department that originally brought the charge have been "
    + "notified of the motion, and that the court date is at least ten (10) days after they were notified.", "");
  L.push("THE ORDER OF EVENTS MATTERS, AND IT IS NOT THE ORDER THE PAGE READS IN.", "");
  L.push("1. You file the motion. 2. The Clerk's Office sets the hearing date, at least ten days out - "
    + "instruction 2 on page 1 says the Clerk's Office fills that date in, not you. 3. You give notice to the "
    + "Office of the Attorney General and to the police that brought the charge. 4. Only then do you complete "
    + "the certification line: the date you gave notice, and the name of that police force.", "");
  L.push("Nothing on that certification line is filled in for you. A certification that notice has been given, "
    + "signed and dated before notice was actually given, is a false statement to a court.", "");
  L.push("NO ADDRESS IS PRINTED HERE. The platform holds no service address for the Office of the Attorney "
    + "General and none for any Rhode Island police department, and it does not guess one. Ask the clerk of the "
    + `${route.courtShort} division where you file how that division expects notice to be given and to whom, and `
    + "get the addresses from the clerk or from the offices themselves.", "");
  return L;
}

function certifiedCopySection() {
  const L = [];
  L.push("WHAT HAPPENS AFTER THE COURT GRANTS THE MOTION - AND THE PART THAT IS YOURS TO DO.", "");
  L.push(`The court's own form says it, on page 1, instruction 8: "${INSTRUCTION_8}"`, "");
  L.push("So, in order:", "");
  L.push("1. PAY EVERYTHING OFF. Fines, fees, costs, restitution and assessments must be paid in full before "
    + "the expungement is complete. A granted motion with an unpaid balance is not a finished expungement.");
  L.push("2. ASK THE CLERK'S OFFICE FOR THE THREE CERTIFIED COPIES. The clerk's office prepares them once every "
    + "condition is satisfied. Certified copies are the clerk's to make; do not photocopy the order yourself and "
    + "expect it to be accepted.");
  L.push("3. KEEP ONE COPY.");
  L.push("4. DELIVER ONE COPY to the Office of the Attorney General's Bureau of Criminal Identification Unit.");
  L.push("5. DELIVER ONE COPY to the police department that charged the case.");
  L.push("6. THE DELIVERY IS YOURS, NOT THE COURT'S. The form says you are responsible for delivering the "
    + "copies. Until they arrive, those records are not expunged, whatever the order says.", "");
  L.push("Keep proof of what you delivered and when.", "");
  return L;
}

function feeSection(route) {
  const L = [];
  L.push("WHAT IT COSTS.", "");
  if (route.trackId === "ri_decriminalized") {
    L.push("The committed record for this route states: \"No cost to the petitioner. Where the conditions of the "
      + "original sentence are complete and all fines, fees and costs related to the conviction are paid in full, "
      + "the court orders the expungement without cost.\"", "");
    L.push("Read that carefully. The no-cost expungement is CONDITIONED on the original sentence being complete "
      + "and every fine, fee and cost related to the conviction being paid in full. It is not a fee waiver and it "
      + "does not clear an outstanding balance. Ask the clerk for a record showing the balance is zero before you "
      + "file.", "");
  } else {
    L.push("THE HONEST ANSWER IS THAT NO HELD RECORD STATES A FILING FEE FOR THIS MOTION. The committed record "
      + "for this route says, in terms: \"Unresolved. No filing fee for a Chapter 12-1.3 motion is stated in the "
      + "controlling review or located in the Judiciary materials. Do not quote a price until it is confirmed.\"", "");
    L.push("So no figure is printed here. Ask the clerk of the division you are filing in what, if anything, it "
      + "costs, before you go.", "");
    L.push("A SEPARATE MONEY QUESTION, WHICH IS NOT THE FILING FEE. Court-imposed and court-related fines, fees, "
      + "costs, assessments and charges on the underlying case must be satisfied in full - the affidavit asks you "
      + "to swear to that. The committed record adds that those obligations may be waived or reduced by court "
      + "order, and that a waiver or reduction satisfies the eligibility condition. If you cannot pay them, that "
      + "is a question to raise with the court rather than a reason to swear that they are paid.", "");
  }
  return L;
}

function filingInstructionsBody(route, facts) {
  const name = facts["participant.full_legal_name"];
  const t = route.track;
  const L = [];
  L.push("FILING INSTRUCTIONS", route.legalName, "");
  L.push(`Prepared for: ${name}`, "");
  L.push("WHAT IS IN THIS PACKET.", "");
  for (const c of route.components) L.push(`- ${c.id}: ${c.blurb}`);
  L.push("");
  L.push(`THE ROUTE. ${t.publicName}. ${route.legalName}. Authority: ${t.authority.join("; ")}.`, "");
  L.push(t.mechanism, "");
  L.push(`WHERE IT GOES. ${t.venue} ${t.rules.filing ?? ""}`, "");
  L.push(`Mark the one judicial complex on the motion where your case was heard. The ${route.courtShort} form `
    + "lists four; the platform has not seen your docket and does not know which one is yours.", "");
  L.push("THE AFFIDAVIT, AND THE ONE PART THAT IS YOURS.", "");
  L.push("Page 1 of the court's form, instruction 4, tells you to identify the Part of the affidavit applicable "
    + `to your motion. For this route that is ${route.partPrintedName}, which applies where `
    + `${route.partAppliesWhen}.`, "");
  L.push("Instruction 5 then says: \"Put a check mark in the box for each statement that is true under the Part "
    + "applicable to your motion.\" NOT ONE OF THOSE BOXES IS MARKED FOR YOU, in that Part or in any other. Each "
    + "one is a statement you swear to under oath about your own record, your own unpaid balances, whether any "
    + "case is pending against you, and your own character. LegalEase holds no Rhode Island criminal history "
    + "record and no court docket for anyone, and it will not swear for you. Read each statement in your Part, "
    + "and mark it only if it is true of your case.", "");
  L.push("If a statement in your Part is not true of your case, do not mark it and do not file until you have "
    + "advice. An unmarked box is a gap; a marked box that is not true is a false statement under oath.", "");
  L.push("WHERE IT IS SWORN. " + (t.rules.notarization ?? "") + " " + (t.rules.participantSignature ?? ""), "");
  L.push("The whole notarial certificate at the foot of the affidavit - the state, the county, the day, the "
    + "month, the year, the name of the person who appeared, the identification relied on, the notary's "
    + "signature, commission expiry and identification number - is completed by the notary or the clerk who "
    + "takes your oath, at the moment you swear it. None of it is filled in here.", "");
  L.push(...feeSection(route));
  L.push("DOCUMENTS TO GET FIRST, AND WHO HAS THEM.", "");
  for (const d of t.documents) L.push(`- ${d.name}. From: ${d.from}. ${d.how}`);
  L.push("");
  L.push("THE WAITING PERIOD AND THE LOOKBACK, AS THE COMMITTED RECORD STATES THEM.", "");
  for (const w of t.waits) L.push(`- ${w}`);
  L.push("");
  L.push("THE HEARING, AND THE PAGE YOU MUST NOT LEAVE AT HOME.", "");
  L.push(`Page 1 of the court's form, instruction 7, says: "${INSTRUCTION_7}" Rhode Island publishes no template `
    + "for that order, so this packet contains one composed for you. It is NOT an official Rhode Island form, it "
    + "says so on its own face, and the court may sign it, change it, refuse it or use an order of its own. "
    + "Everything on it that is the court's - the findings, whether the motion is granted or denied, any terms "
    + "the court sets, the signature, the date of entry, the certification - is blank, because none of that is "
    + "yours or ours to write.", "");
  if (route.discrepancies.length) {
    L.push("A DISAGREEMENT ON THE COURT'S OWN FORM. READ THIS BEFORE YOU SWEAR TO ANYTHING.", "");
    for (const d of route.discrepancies) L.push(d, "");
  }
  L.push("WHO IS EXCLUDED FROM THIS ROUTE, IN THE COMMITTED RECORD'S OWN WORDS.", "");
  for (const e of t.exclusions) L.push(`- ${e}`);
  L.push("");
  L.push("WHEN TO STOP AND GET HELP INSTEAD.", "");
  L.push("The committed track registry records these as the points where self-help ends, in its own words:", "");
  for (const s of t.stops) L.push(`- ${s}`);
  L.push("");
  if (route.singleGuidanceComponent) {
    L.push(...noticeSection(route));
    L.push(...certifiedCopySection());
  }
  L.push("WHAT THIS PACKET IS NOT. It is the state's own motion and affidavit, a proposed order composed for the "
    + "hearing because the state publishes none, and instructions. It is not legal advice, it is not filed for "
    + "you, and it does not decide whether you are eligible.", "");
  L.push(`Route: ${route.routeKeys.join(" ; ")}`);
  return L.join("\n");
}

function noticePackageBody(route, facts) {
  const name = facts["participant.full_legal_name"];
  const L = [];
  L.push("NOTICE TO THE OFFICE OF THE ATTORNEY GENERAL AND THE CHARGING POLICE", "");
  L.push(`Prepared for: ${name}`, "");
  L.push("This page is guidance. It is not a filing and there is nothing here to hand to a clerk.", "");
  L.push(...noticeSection(route));
  L.push("WHAT THE COMMITTED RECORD SAYS ABOUT SERVICE.", "");
  L.push(route.track.rules.service ?? "", "");
  L.push("WHAT THE COMMITTED RECORD SAYS ABOUT THE HEARING.", "");
  L.push(route.track.rules.notice ?? "", "");
  L.push("Two of the findings in that sentence - good moral character, and rehabilitation to the court's "
    + "satisfaction - are the court's to make. They are not facts LegalEase can supply and nothing in this "
    + "packet asserts them.", "");
  L.push(`Route: ${route.routeKeys.join(" ; ")}`);
  return L.join("\n");
}

function certifiedCopyChecklistBody(route, facts) {
  const name = facts["participant.full_legal_name"];
  const L = [];
  L.push("CERTIFIED COPIES OF THE ORDER - WHAT TO DELIVER, AND TO WHOM", "");
  L.push(`Prepared for: ${name}`, "");
  L.push("This page is guidance. It is not a filing and there is nothing here to hand to a clerk.", "");
  L.push(...certifiedCopySection());
  L.push("Nothing on this checklist can be done before the court grants the motion, and none of it is done by "
    + "the court for you.", "");
  L.push(`Route: ${route.routeKeys.join(" ; ")}`);
  return L.join("\n");
}

/* ---- the five families ------------------------------------------------------ */
const OFFICIAL = "official_slice";
const COMPOSED = "composed";

function officialComponents(familyId, form, split) {
  if (!split) {
    return [{
      id: `${familyId.replace(/-set$/, "")}-primary-filing-1`,
      kind: OFFICIAL, role: "primary_filing", requirement: "required", conditionDescription: null,
      pages: [1, 2, 3, 4], sourceForm: form.formNumber,
      title: form.title,
      blurb: "the state's own motion, affidavit and filing instructions, as published, with your name and date "
        + "of birth written into both captions and every case fact left for you"
    }];
  }
  return [
    {
      id: `${familyId.replace(/-set$/, "")}-primary-filing-1`,
      kind: OFFICIAL, role: "primary_filing", requirement: "required", conditionDescription: null,
      pages: form.motionPages, sourceForm: form.formNumber,
      title: `${form.title} - filing instructions and Motion`,
      blurb: "the state's own filing instructions and Motion to Expunge or Seal Record, as published, with your "
        + "name and date of birth in the caption and every case fact left for you"
    },
    {
      id: `${familyId.replace(/-set$/, "")}-decriminalization-affidavit-3`,
      kind: OFFICIAL, role: "decriminalization_affidavit", requirement: "conditional",
      conditionDescription:
        "The committed packet specification marks this component conditional: prepared where the court requires "
        + "the petitioner to demonstrate that the prior conviction would qualify as a decriminalized offence "
        + "under current law. It is shipped in every packet all the same, because the motion's own face excuses "
        + "the affidavit only \"for decriminalized offenses when the motion is filed by an attorney and the "
        + "offense is not under G.L. 1956 Sec. 31-11-18\" - and a participant filing for themselves is not an "
        + "attorney.",
      pages: form.affidavitPages, sourceForm: form.formNumber,
      title: `${form.title} - Affidavit in Support`,
      blurb: "the state's own Affidavit in Support of the motion, pages 3 and 4 of the same published form, with "
        + "your name and date of birth in its caption and not one sworn box marked"
    }
  ];
}

function composedComponents(familyId, single) {
  const base = familyId.replace(/-set$/, "");
  const order = {
    id: `${base}-proposed-order-2`, kind: COMPOSED, role: "proposed_order",
    requirement: "required", conditionDescription: null,
    title: "Order for Expungement or Sealing of Record (proposed, prepared by the moving party)",
    body: proposedOrderBody,
    blurb: "the proposed order the court's own instruction 7 tells you to bring to the hearing. Rhode Island "
      + "publishes no template for it, so it is composed here; it says on its face that it is not an official "
      + "Rhode Island form, and every line that is the court's is blank"
  };
  if (single) {
    return [order, {
      id: `${base}-filing-instructions-4`, kind: COMPOSED, role: "filing_instructions",
      requirement: "required", conditionDescription: null,
      title: "Filing instructions, notice, the hearing and the certified copies",
      body: filingInstructionsBody,
      blurb: "where it goes, which Part of the affidavit is yours, what it costs, who must be told and when, "
        + "what to bring to the hearing, and what you deliver after a grant"
    }];
  }
  return [order, {
    id: `${base}-notice-package-3`, kind: COMPOSED, role: "notice_package",
    requirement: "required", conditionDescription: null,
    title: "Notice to the Office of the Attorney General and the charging police",
    body: noticePackageBody,
    blurb: "who must be notified, when, in what order, and why the certification line on the motion is completed "
      + "only after notice has actually been given"
  }, {
    id: `${base}-filing-instructions-4`, kind: COMPOSED, role: "filing_instructions",
    requirement: "required", conditionDescription: null,
    title: "Filing instructions",
    body: filingInstructionsBody,
    blurb: "where it goes, which Part of the affidavit is yours, what the record says about cost, what to get "
      + "first, and where self-help ends"
  }, {
    id: `${base}-certified-copy-delivery-checklist-5`, kind: COMPOSED, role: "certified_copy_delivery_checklist",
    requirement: "required", conditionDescription: null,
    title: "Certified copies of the order - what to deliver, and to whom",
    body: certifiedCopyChecklistBody,
    blurb: "the three certified copies the clerk prepares after a grant, and the two you must deliver yourself"
  }];
}

const CONVICTION_ROUTE_RELIEF =
  "This is a Chapter 12-1.3 expungement of a record of conviction, and G.L. 1956 Sec. 12-1.3-3(c) is the "
  + "subsection of that chapter which governs it. It is the only one of the motion's two relief bullets that "
  + "cites the chapter this route runs on.";

const NOT_A_NONCONVICTION_ROUTE =
  "This route is a motion to expunge the record of a case that ended in a conviction, brought under Chapter "
  + "12-1.3, so the non-conviction branch of the motion is outside it.";

const FAMILIES = {
  "ri_decriminalized-set": {
    trackId: "ri_decriminalized", form: "DC-33", partId: "TWO", orderVariant: "DISTRICT_COURT",
    splitAffidavitComponent: true, singleGuidanceComponent: true,
    routeKeys: ["obligation:track-pathway:RI:ri_decriminalized:path-g-decriminalized-offense-expungement"],
    routeSelectionId: "ri_decriminalized-set-district-court-part-two",
    statute: "R.I. Gen. Laws Sec. 12-1.3-2(g) and Sec. 12-1.3-3(e)",
    routeName: "asking the Rhode Island District Court that convicted you to expunge the record of a conviction "
      + "for conduct that Rhode Island has since decriminalized",
    convictionExpungementWhy:
      "This route's own committed authority is G.L. 1956 Sec. 12-1.3-3(e), which is one of the two subsections "
      + "this bullet names on its own face.",
    notAConvictionBranchWhy: NOT_A_NONCONVICTION_ROUTE,
    discrepancies: []
  },
  "ri_first_offender_misdemeanor-set": {
    trackId: "ri_first_offender_misdemeanor", form: "DC-33", partId: "THREE_A", orderVariant: "DISTRICT_COURT",
    splitAffidavitComponent: false, singleGuidanceComponent: false,
    routeKeys: [
      "obligation:unit:RI:ri_first_offender_misdemeanor:ri-first-offender-misdemeanor-stage-1-bci-and-docket",
      "obligation:unit:RI:ri_first_offender_misdemeanor:ri-first-offender-misdemeanor-stage-2-court-motion-and-affidavit",
      "obligation:unit:RI:ri_first_offender_misdemeanor:ri-first-offender-misdemeanor-stage-3-notice-hearing-and-certified-copies"
    ],
    routeSelectionId: "ri_first_offender_misdemeanor-set-district-court-part-three-a",
    statute: "R.I. Gen. Laws Sec. 12-1.3-2, Sec. 12-1.3-1 and Sec. 12-1.3-3",
    routeName: "asking the Rhode Island District Court that convicted you to expunge a single misdemeanor "
      + "conviction, as a first offender",
    convictionExpungementWhy: CONVICTION_ROUTE_RELIEF,
    notAConvictionBranchWhy: NOT_A_NONCONVICTION_ROUTE,
    discrepancies: []
  },
  "ri_multiple_misdemeanors-set": {
    trackId: "ri_multiple_misdemeanors", form: "DC-33", partId: "THREE_B", orderVariant: "DISTRICT_COURT",
    splitAffidavitComponent: false, singleGuidanceComponent: false,
    routeKeys: [
      "obligation:unit:RI:ri_multiple_misdemeanors:ri-multiple-misdemeanors-stage-1-bci-and-docket",
      "obligation:unit:RI:ri_multiple_misdemeanors:ri-multiple-misdemeanors-stage-2-court-motion-and-affidavit",
      "obligation:unit:RI:ri_multiple_misdemeanors:ri-multiple-misdemeanors-stage-3-notice-hearing-and-certified-copies"
    ],
    routeSelectionId: "ri_multiple_misdemeanors-set-district-court-part-three-b",
    statute: "R.I. Gen. Laws Sec. 12-1.3-2, Sec. 12-1.3-1, chapter 12-29, Sec. 31-27-2 and Sec. 31-27-2.1",
    routeName: "asking the Rhode Island District Court that convicted you to expunge more than one but fewer "
      + "than six misdemeanor convictions",
    convictionExpungementWhy: CONVICTION_ROUTE_RELIEF,
    notAConvictionBranchWhy: NOT_A_NONCONVICTION_ROUTE,
    discrepancies: [
      "HOW MANY MISDEMEANORS THIS PART REACHES IS NOT SETTLED, AND THE FORM DISAGREES WITH ITSELF. Page 1 of the "
      + "court's own form says Part Three B is for a person \"convicted of more than one (1) but less than six "
      + "(6) misdemeanor offenses\". The sixth box of Part Three B on page 4 of the same form reads \"That I have "
      + "not been convicted of more than six (6) misdemeanors preceding the filing of this motion\". More than "
      + "one and fewer than six is at most FIVE; not more than six is SIX. The committed record already records "
      + "the ceiling as unresolved, and names any count near it as a point where self-help ends - together with "
      + "the separate, unresolved question of whether the count includes convictions you are not asking to "
      + "expunge. If your count is five or six, get advice before you swear to that box."
    ]
  },
  "ri_first_offender_felony-set": {
    trackId: "ri_first_offender_felony", form: "Superior-55", partId: "TWO",
    orderVariant: "SUPERIOR_COURT_FELONY_AND_DEFERRED",
    splitAffidavitComponent: false, singleGuidanceComponent: false,
    routeKeys: [
      "obligation:unit:RI:ri_first_offender_felony:ri-first-offender-felony-stage-1-bci-and-docket",
      "obligation:unit:RI:ri_first_offender_felony:ri-first-offender-felony-stage-2-court-motion-and-affidavit",
      "obligation:unit:RI:ri_first_offender_felony:ri-first-offender-felony-stage-3-notice-hearing-and-certified-copies"
    ],
    routeSelectionId: "ri_first_offender_felony-set-superior-court-part-two",
    statute: "R.I. Gen. Laws Sec. 12-1.3-2, Sec. 12-1.3-1 and Sec. 12-1.3-3",
    routeName: "asking the Rhode Island Superior Court that convicted you to expunge a single felony conviction, "
      + "as a first offender",
    convictionExpungementWhy: CONVICTION_ROUTE_RELIEF,
    notAConvictionBranchWhy: NOT_A_NONCONVICTION_ROUTE,
    discrepancies: [
      "PART TWO OF THIS FORM DISAGREES WITH THE FORM'S OWN INSTRUCTION PAGE, AND YOU MUST NOT SWEAR PAST IT. "
      + "Page 1 of Superior-55 says: \"Part Two: If you were convicted of a single FELONY offense and have not "
      + "been previously convicted of or placed on probation for a felony or a misdemeanor.\" The fourth box of "
      + "Part Two, on page 3 of the same form, reads: \"That I was convicted of a single MISDEMEANOR offense, and "
      + "I have not been previously convicted of or placed on probation for a felony or a misdemeanor.\" Those "
      + "two texts cannot both describe your case. The rest of Part Two carries the TEN-year period, which is the "
      + "felony period, and Rhode Island publishes a separate Superior Court misdemeanor form, so the box reads "
      + "like a drafting error carried over from the District Court form. LegalEase does not decide that and has "
      + "marked nothing. Do not mark a box that says something untrue of your case: ask the clerk of the "
      + "Superior Court division you are filing in, or a lawyer, which text that court applies, before you swear "
      + "to this affidavit.",
      "ONE MORE NUMBER THAT DOES NOT AGREE WITH ITSELF. The committed record's exclusion list for this route "
      + "carries the sentence \"Any felony or misdemeanor arrest or conviction during the five-year lookback\", "
      + "while the same record's waiting-period entry for this route says TEN years from completion of sentence "
      + "and a TEN-year clean lookback - and the Part Two boxes on the court's own form say ten years in both "
      + "places. The exclusion sentence reads like a copy from the misdemeanor route. Ten years is what the form "
      + "asks you to swear to. Do not rely on five."
    ]
  },
  "ri_deferred_sentence-set": {
    trackId: "ri_deferred_sentence", form: "Superior-55", partId: "THREE",
    orderVariant: "SUPERIOR_COURT_FELONY_AND_DEFERRED",
    splitAffidavitComponent: false, singleGuidanceComponent: false,
    routeKeys: [
      "obligation:unit:RI:ri_deferred_sentence:ri-deferred-sentence-stage-1-bci-and-docket",
      "obligation:unit:RI:ri_deferred_sentence:ri-deferred-sentence-stage-2-court-motion-and-affidavit",
      "obligation:unit:RI:ri_deferred_sentence:ri-deferred-sentence-stage-3-notice-hearing-and-certified-copies"
    ],
    routeSelectionId: "ri_deferred_sentence-set-superior-court-part-three",
    statute: "R.I. Gen. Laws Sec. 12-19-19 and Sec. 12-1.3-2(e)",
    routeName: "asking the Rhode Island Superior Court to expunge the records of a deferred sentence you have "
      + "completed and complied with",
    convictionExpungementWhy:
      "This route runs on Chapter 12-1.3 through Sec. 12-1.3-2(e), and Sec. 12-1.3-3(c) is that chapter's "
      + "expungement procedure. It is the only one of the motion's two relief bullets that cites the chapter "
      + "this route runs on; the other is the Sec. 12-1-12 destruction-of-identification-records branch.",
    notAConvictionBranchWhy:
      "This route is brought under Chapter 12-1.3, through Sec. 12-1.3-2(e), together with Sec. 12-19-19, and "
      + "the motion's other relief bullet is the Sec. 12-1-12 and Sec. 12-1-12.1 branch, which cites neither.",
    discrepancies: [
      "THE RELIEF BULLET THIS PACKET MARKS SAYS \"CONVICTION\", AND YOUR ROUTE IS A DEFERRED SENTENCE. The "
      + "Superior Court motion page offers exactly two forms of relief. The second - the one this packet marks - "
      + "asks that \"all records and records of conviction relating to the conviction of the above-referenced "
      + "case be expunged ... pursuant to G.L. 1956 Sec. 12-1.3-3(c) or (e)\". It is marked because it is the "
      + "only one of the two that cites Chapter 12-1.3, which is the chapter your route runs on through Sec. "
      + "12-1.3-2(e); the other bullet is the Sec. 12-1-12 destruction-of-identification-records relief. No held "
      + "record in this repository states which bullet a Rhode Island Superior Court expects on a deferred-"
      + "sentence motion, and whether a completed deferred sentence is a \"conviction\" for this chapter is a "
      + "question of Rhode Island law that this packet does not answer. It is a mark on YOUR motion: ask the "
      + "clerk of the division you are filing in, and change it before you file if that division says otherwise."
    ]
  }
};

/* ════════════════════════════════════════════════════════════════════════════
 * ENGINE
 *
 * SOURCES ARE RESOLVED BY CONTENT, NEVER BY PATH. Only two of the five
 * custodies this operation describes are mounted here, and every BLOCKED_SOURCE
 * this factory has produced from a declared path has been wrong. So each
 * mounted custody is walked once and indexed by SHA-256, a family's pin is
 * looked up in that index, and the committed corpus index is then read for what
 * it records about the same digest. An index with no entries is a stop in
 * itself: a scan that resolves nothing and a scan with no denominator are the
 * same report.
 * ════════════════════════════════════════════════════════════════════════════ */

const CUSTODY_ROOTS = [
  { custody: "master_library", root: "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1" },
  { custody: "human_source_returns", root: "private/human-source-returns" }
];

function contentIndex() {
  const byDigest = new Map();
  const mounted = [];
  const notMounted = [];
  let files = 0;
  const walk = (dir, custody) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(p, custody); continue; }
      if (!entry.isFile()) continue;
      const bytes = fs.readFileSync(p);
      files += 1;
      const digest = sha256(bytes);
      if (!byDigest.has(digest)) byDigest.set(digest, []);
      byDigest.get(digest).push({ custody, absolutePath: p, byteLength: bytes.length });
    }
  };
  for (const { custody, root } of CUSTODY_ROOTS) {
    const abs = path.join(ROOT, root);
    if (!fs.existsSync(abs)) { notMounted.push(custody); continue; }
    mounted.push(custody);
    walk(abs, custody);
  }
  return { byDigest, files, mounted, notMounted };
}

function resolveSource(form, index) {
  if (index.files === 0) {
    return { failure: { sourceId: form.sourceId, why: "the content index is EMPTY: no custody named in "
      + `${CUSTODY_ROOTS.map((c) => c.root).join(" or ")} is mounted here, so a universal negative would be a `
      + "broken denominator rather than a finding" } };
  }
  const hits = index.byDigest.get(form.sha256) ?? [];
  if (hits.length === 0) {
    return { failure: { sourceId: form.sourceId, sha256: form.sha256,
      why: `no file in the ${index.files} indexed by content across custodies [${index.mounted.join(", ")}] `
        + `carries this family's pinned SHA-256; custodies not mounted here: [${index.notMounted.join(", ") || "none"}]` } };
  }
  const bytes = fs.readFileSync(hits[0].absolutePath);
  const digest = sha256(bytes);
  if (digest !== form.sha256) {
    return { failure: { sourceId: form.sourceId, why: `re-read drift: the indexed file now hashes to ${digest}` } };
  }
  const committed = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const entry = (committed.entries ?? []).find((e) => e.sha256 === form.sha256) ?? null;
  return {
    resolved: {
      ...form, bytes, byteLength: bytes.length,
      custody: hits[0].custody,
      absolutePath: path.relative(ROOT, hits[0].absolutePath),
      pathInArchive: entry?.path ?? null,
      revision: entry?.revision ?? null,
      committedIndexAgrees: Boolean(entry) && entry.sha256 === form.sha256,
      acroFieldCountIndexed: entry?.acroFieldCount ?? null,
      pageCountIndexed: entry?.pageCount ?? null,
      structuralClassObserved: entry?.structuralClassObserved ?? null,
      alsoHeldIn: hits.slice(1).map((h) => h.custody)
    }
  };
}

/* ---- census: every field of the bound form, read from the pinned binary ----- */
const flat = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function censusOf(source, spec) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));
  const rows = [];
  const unmapped = [];
  const anchorDrift = [];
  const sourceCarried = [];
  const hiddenWidgets = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const kind = field.constructor.name;
    const widgets = field.acroField.getWidgets().map((w, widgetIndex) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      const flags = typeof w.getFlags === "function" ? w.getFlags() : 0;
      if ((flags & 2) !== 0 || (flags & 32) !== 0) hiddenWidgets.push({ field: name, flags });
      return {
        widgetIndex, page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary"
      };
    });
    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getSelected === "function") {
        const chosen = field.getSelected();
        sourceValue = chosen && chosen.length ? String(chosen) : null;
      } else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }
    if (sourceValue !== null) sourceCarried.push({ field: name, sourceValue });
    const entry = spec[name];
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }

    /* The anchor: the printed line this blank belongs to, found within a
     * measured window of the widget's own rectangle. Exactly one line in that
     * window may carry it. A revision that moved or reworded the line fails
     * the build rather than shipping a map keyed to the old page. */
    const near = entry.near ?? NEAR;
    const w0 = widgets[0];
    const candidates = (pageText[w0.page - 1]?.lines ?? [])
      .filter((l) => l.y >= w0.rect.y - near.below && l.y <= w0.rect.y + near.above)
      .filter((l) => flat(l.text).includes(flat(entry.anchor)));
    if (candidates.length !== 1) {
      anchorDrift.push({ field: name, page: w0.page, anchor: entry.anchor, matches: candidates.length });
    }
    rows.push({
      key: name, name, formNumber: source.formNumber,
      page: w0.page, widgets, sourceValue,
      rect: w0.rect, rectBasis: w0.rectBasis,
      type: kind.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
      isSelectionControl: kind === "PDFCheckBox" || kind === "PDFRadioGroup" || entry.selection === true,
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section ?? null,
      effectiveLabel: entry.label,
      printedLine: candidates[0]?.text ?? entry.anchor,
      printedStatement: entry.printedStatement ?? null,
      anchor: entry.anchor, anchorAt: candidates[0] ? { page: w0.page, y: candidates[0].y } : null,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null, why: entry.why ?? null,
      routeCondition: entry.condition ?? null
    });
  }
  const stale = Object.keys(spec).filter((k) => !rows.some((r) => r.key === k));
  return { rows, unmapped, stale, anchorDrift, sourceCarried, hiddenWidgets, pageText, pageCount: pages.length };
}

/* ---- render the bound binary ------------------------------------------------ *
 * Three passes, in this order and for the reasons in the header:
 *
 *   1. the shared finalizer with EVERY field classified unwritable by role, so
 *      it writes nothing and does what it is here to do - strip XFA and every
 *      action, repair default appearances, neutralize any chooser prompt,
 *      flatten, preserve the source metadata and refuse on active-content
 *      residue;
 *   2. the two held participant facts, placed as Form XObject appearances
 *      inside the widget rectangles measured off the pinned binary, which is
 *      the construction flatten itself emits and the one every evidence reader
 *      on this host decodes;
 *   3. the route-determined marks, two diagonal strokes struck strictly inside
 *      each control's own measured rectangle by the shared selection finalizer.
 *      It never draws a box and never touches the court's own stroke.
 */
function placeExactFactAppearance({ pdf, page, font, widget, fit }) {
  const n = (v) => +Number(v).toFixed(3);
  const lineHeight = fit.fontSize * 1.15;
  const firstBaseline = fit.lines.length === 1
    ? Math.max(1, (widget.rect.height - fit.fontSize) / 2)
    : widget.rect.height - fit.fontSize - 1;
  const ink = PARTICIPANT_INK_RGB;
  const content = [
    "BT", `${n(ink.r)} ${n(ink.g)} ${n(ink.b)} rg`, `/F0 ${n(fit.fontSize)} Tf`,
    ...fit.lines.flatMap((line, index) => [
      `1 0 0 1 2 ${n(firstBaseline - index * lineHeight)} Tm`,
      `${font.encodeText(line).toString()} Tj`
    ]),
    "ET"
  ].join("\n");
  const stream = pdf.context.stream(content, {
    Type: "XObject", Subtype: "Form",
    BBox: [0, 0, n(widget.rect.width), n(widget.rect.height)],
    Resources: { Font: { F0: font.ref } }
  });
  const key = page.node.newXObject("ExactFactOverlay", pdf.context.register(stream));
  page.pushOperators(pushGraphicsState(), translate(n(widget.rect.x), n(widget.rect.y)),
    drawObject(key), popGraphicsState());
  return { renderedAs: "form_xobject_appearance", xObject: key.toString() };
}

async function paintedPaths(bytes) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  return pdf.getPages().flatMap((page, index) => extractPageGeometry(page).paths
    .filter((row) => /^(S|s|f|F|f\*|B|B\*|b|b\*)$/.test(String(row.paintedBy ?? "")))
    .map((row) => ({
      page: index + 1, operator: row.operator, paintedBy: row.paintedBy,
      x: +row.x.toFixed(3), y: +row.y.toFixed(3),
      width: +row.width.toFixed(3), height: +row.height.toFixed(3)
    })));
}

async function addedPaintedPaths(beforeBytes, afterBytes) {
  const before = await paintedPaths(beforeBytes);
  const after = await paintedPaths(afterBytes);
  const key = (row) => [row.page, row.operator, row.paintedBy, row.x, row.y, row.width, row.height].join("|");
  const counts = new Map();
  for (const row of before) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);
  return after.filter((row) => {
    const fingerprint = key(row);
    const remaining = counts.get(fingerprint) ?? 0;
    if (remaining <= 0) return true;
    counts.set(fingerprint, remaining - 1);
    return false;
  });
}

function pathsInsideBox(paths, page, box) {
  const inset = Math.max(0.4, Math.min(1.5, (box.x1 - box.x0) * 0.15, (box.y1 - box.y0) * 0.15));
  return paths.filter((row) => {
    if (row.page !== page) return false;
    const rowX1 = row.x + row.width;
    const rowY1 = row.y + row.height;
    return rowX1 >= box.x0 + inset && row.x <= box.x1 - inset
      && rowY1 >= box.y0 + inset && row.y <= box.y1 - inset;
  });
}

async function renderOfficialForm(source, census, facts, familyId) {
  const censusForFinalizer = census.rows.map((r) => ({
    name: r.name, type: r.type, effectiveLabel: r.effectiveLabel,
    regionHeading: r.section ?? r.effectiveLabel,
    widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
    multiline: r.multiline === true, maxLength: r.maxLength ?? null
  }));
  const { bytes: flattened, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: censusForFinalizer,
    facts: {},
    explicitMappings: {},
    // Every field, by role. See the header: the shared descriptor channel
    // resolves this form's defendant-name blank to participant.state, and an
    // explicit mapping cannot correct a name-channel match. So the finalizer
    // writes nothing at all and the two held facts are placed below.
    unwritableFields: census.rows.map((r) => ({ field: r.name, class: "written_as_a_measured_appearance_instead" })),
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: `${source.formNumber} ${familyId} review artifact`,
    /* FIX59. DC-33 and Superior-55 both ship every selection widget at /AS /Off
     * with /On as the only state in /AP /N, except one radio group on the last
     * page of each that carries its own /Off stream. The shared sanitizer calls
     * updateFieldAppearances() before flatten, pdf-lib regenerates an appearance
     * for exactly the condition of a current state with no stream, and its
     * default provider paints a stroked square -- so 37 boxes on DC-33 and 33 on
     * Superior-55 were delivered inside a border the court's paper does not
     * print and no conforming viewer paints (ISO 32000-1 12.5.5). VF08 proved
     * the ink is not this family's: a zero-write baseline over the same pinned
     * bytes paints the same pixels. Opting in supplies the missing state as an
     * EMPTY appearance instead, so nothing is synthesized there.
     *
     * The radio group that ships its own /Off appearance is untouched by this:
     * that stream is the court's own and stays, which is what RI-OFF-APPEARANCE
     * settles. */
    suppressSynthesizedAppearances: true,
    appearanceDispositions: dispositionsForFamily(APPEARANCE_SEMANTICS, `${familyId}:${source.formNumber}`)
  });
  assert.deepEqual(report.written, [],
    `${source.formNumber}: the shared finalizer wrote a field although every field was classified unwritable`);

  const pdf = await PDFDocument.load(flattened, { ignoreEncryption: true, updateMetadata: false });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const written = [];
  const refusedWrites = [];
  for (const row of census.rows.filter((r) => r.policy === "write")) {
    assert.equal(row.type, "text", `${row.name}: a held fact may only be written into a text blank`);
    const protectedAs = protectCategoryOf(row.effectiveLabel) ?? protectCategoryOf(row.name);
    assert.equal(protectedAs, null,
      `${row.name}: the shared protect rules class this blank as ${protectedAs}; nothing is written into it`);
    const value = facts[row.fact];
    assert.ok(value != null && String(value).trim() !== "", `${row.name}: no fixture value for ${row.fact}`);
    const widgetWrites = [];
    let refused = null;
    for (const widget of row.widgets) {
      const fit = fitTextToWidget({
        font, text: String(value), rect: widget.rect, multiline: row.multiline === true,
        maxFontSize: 9, minFontSize: 6
      });
      if (fit.outcome === "refused") { refused = { field: row.name, factId: row.fact, reason: fit.reason }; break; }
      widgetWrites.push({ widget, fit });
    }
    if (refused) { refusedWrites.push(refused); continue; }
    const placed = [];
    for (const { widget, fit } of widgetWrites) {
      const page = pdf.getPages()[widget.page - 1];
      assert.ok(page, `${row.name}: measured widget page ${widget.page} is absent`);
      const appearance = placeExactFactAppearance({ pdf, page, font, widget, fit });
      placed.push({
        widgetIndex: widget.widgetIndex, page: widget.page, rect: widget.rect,
        fontSize: fit.fontSize, outcome: fit.outcome, ...appearance
      });
    }
    written.push({ field: row.name, factId: row.fact, kind: "exact_measured_fact_overlay", widgets: placed });
  }
  // A value that fits one participant's blank and not another's must be
  // withheld from both, never written for one. A refusal here is a build stop.
  assert.deepEqual(refusedWrites, [],
    `${source.formNumber}: a held fact does not fit its measured blank at a readable size`);
  const overlaid = Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
  const overlayScan = scanBytesForActiveContent(overlaid);
  assert.equal(overlayScan.inspectable, true, "the measured-appearance overlay is not byte-inspectable");
  assert.deepEqual(overlayScan.hits, [], "the measured-appearance overlay introduced active content");

  const selections = census.rows.filter((r) => r.policy === "select").map((r) => {
    assert.equal(r.widgets.length, 1, `${r.name}: a marked control must have exactly one measured widget`);
    const w = r.widgets[0];
    return {
      label: r.name, page: w.page, measured: true,
      measurementBasis: "existing AcroForm widget /Rect read first-hand from the pinned source",
      box: {
        x0: w.rect.x, y0: w.rect.y,
        x1: +(w.rect.x + w.rect.width).toFixed(3), y1: +(w.rect.y + w.rect.height).toFixed(3)
      }
    };
  });
  let bytes = overlaid;
  let selectionReport = { selections: [], selectionsRefused: [] };
  if (selections.length > 0) {
    const marked = await finalizeFlatOverlay({
      sourceBytes: overlaid, expectedSha256: sha256(overlaid), anchors: [], selections,
      facts: {}, documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
      title: `${source.formNumber} ${familyId} measured route-selection artifact`
    });
    bytes = marked.bytes;
    selectionReport = marked.report;
    assert.equal(selectionReport.selectionsRefused.length, 0,
      `${source.formNumber}: a measured route selection was refused: `
      + JSON.stringify(selectionReport.selectionsRefused));
    assert.equal(selectionReport.selections.length, selections.length,
      `${source.formNumber}: not every measured route selection was drawn`);
  }
  const addedPaths = selections.length > 0 ? await addedPaintedPaths(overlaid, bytes) : [];
  const selectionProof = (selectionReport.selections ?? []).map((selection) => {
    const marks = pathsInsideBox(addedPaths, selection.page, selection.box);
    return { ...selection, artifactDerivedMarkPaths: marks.length, markObservedInArtifactBytes: marks.length >= 2 };
  });
  assert.ok(selectionProof.every((row) => row.markObservedInArtifactBytes),
    `${source.formNumber}: a reported route selection is absent from the artifact's own vector paths`);
  return { bytes, report, written, selectionProof };
}

/* ---- the pages this build authors ------------------------------------------- */
function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§§", "Secs. ").replaceAll("§", "Sec. ")
    .replaceAll("Secs.  ", "Secs. ").replaceAll("Sec.  ", "Sec. ").replaceAll("…", "...");
}

/*
 * Paginated BY BLOCK, so a heading is never stranded from the list it
 * introduces and no page is left carrying a single drawn line. Nothing
 * truncates: a long token is split to the measured width and a long line is
 * wrapped to it, so a value that does not fit is carried onto the next row
 * rather than cut.
 */
const MIN_ROWS_EITHER_SIDE = 2;

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;

  /*
   * THE SHARED SEPARATOR-AWARE SPLITTER, IMPORTED RATHER THAN COPIED.
   *
   * The private copy that stood here accumulated one CHARACTER at a time and
   * cut at whichever character first reached the margin. Rhode Island's unit
   * route keys are longer than the 468pt column, so it broke them mid-word on
   * the delivered pages: "...-stage-2-court-motion-and-affidav" measured at
   * 467.3pt with "it" alone on the next line, and
   * "...-stage-3-notice-hearing-and-certif" at 466.2pt with "ied-copies" after
   * it. A participant cannot read that key off the page, type it, or recognise
   * it as one identifier, and no completeness counter and no raster gate can
   * see it, because every character is present and every glyph is inside the
   * column.
   *
   * scripts/rcap-custom-pleading/split-token.mjs breaks at the token's OWN
   * separators - after a colon, underscore, slash, dot or hyphen - so the same
   * keys break as "...-court-motion-and-" / "affidavit" and
   * "...-notice-hearing-and-" / "certified-copies", and hard-splits only a run
   * that carries no separator at all. It takes a fits() predicate rather than a
   * font handle, which is why it serves this host unchanged.
   */
  const splitToken = createTokenSplitter({ fits: fitsByFontMetrics(font, fontSize, maxWidth) });
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => (font.widthOfTextAtSize(w, fontSize) > maxWidth ? splitToken(w) : [w]));
    const out = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) current = candidate;
      else { if (current) out.push(current); current = w; }
    }
    if (current) out.push(current);
    return out;
  };

  /*
   * Rows carry which SOURCE LINE they came from and whether that line is the
   * machine route trailer, so the pull-down below can recognise a page that
   * holds nothing else and so a whole block can be moved as one. Nothing about
   * how rows are wrapped or how blocks are formed changes: a block is still a
   * run of consecutive non-blank rows, and a blank line is still its own block.
   */
  const TRAILER_LINE = /^Route: /;
  const rows = [];
  for (const raw of sanitizePdfText(fullText).split("\n")) {
    const trailer = TRAILER_LINE.test(raw);
    for (const row of wrap(raw)) rows.push({ text: row, trailer });
  }
  let capacity = 0;
  for (let y = height - margin; y >= margin; y -= lineHeight) capacity += 1;

  const blocks = [];
  for (const row of rows) {
    const blank = row.text === "";
    const last = blocks[blocks.length - 1];
    if (blank) blocks.push({ blank: true, rows: [row] });
    else if (last && !last.blank) last.rows.push(row);
    else blocks.push({ blank: false, rows: [row] });
  }
  blocks.forEach((block, index) => { block.index = index; for (const row of block.rows) row.block = index; });

  const pages = [[]];
  const room = () => capacity - pages[pages.length - 1].length;
  const newPage = () => { pages.push([]); };
  for (const block of blocks) {
    if (block.blank) {
      if (pages[pages.length - 1].length === 0) continue;
      if (room() <= 0) { newPage(); continue; }
      pages[pages.length - 1].push({ text: "", trailer: false, block: block.index });
      continue;
    }
    if (block.rows.length <= room()) { pages[pages.length - 1].push(...block.rows); continue; }
    if (block.rows.length <= capacity) { newPage(); pages[pages.length - 1].push(...block.rows); continue; }
    let rest = block.rows;
    while (rest.length) {
      let take = Math.min(room(), rest.length);
      const leftOver = rest.length - take;
      if (take < MIN_ROWS_EITHER_SIDE || (leftOver > 0 && leftOver < MIN_ROWS_EITHER_SIDE)) {
        if (pages[pages.length - 1].length === 0) take = Math.max(MIN_ROWS_EITHER_SIDE, rest.length - MIN_ROWS_EITHER_SIDE);
        else { newPage(); continue; }
      }
      pages[pages.length - 1].push(...rest.slice(0, take));
      rest = rest.slice(take);
      if (rest.length) newPage();
    }
  }

  const trim = (rowsOnPage) => { const copy = [...rowsOnPage]; while (copy.length && copy[copy.length - 1].text === "") copy.pop(); return copy; };
  const laid = pages.map(trim).filter((rowsOnPage) => rowsOnPage.some((r) => r.text !== ""));

  /*
   * THE TRAILER PULL-DOWN. A page whose every drawn row is the machine route
   * trailer is not a page a participant can be handed: page 8 of the notice
   * package shipped five lines of "obligation:unit:RI:..." at x=72 with no
   * heading, no route name in words and no prose to say what it was. The block
   * that ended the page before is pulled down onto it, so the trailer arrives
   * under the text it closes.
   *
   * This is the sole-occupant pull-down the Oklahoma and Washington composers
   * already carry (scripts/build-census-v1-rcap-ok-custom-pleading.mjs), moved
   * onto this host's own block pagination rather than a new scheme: it runs
   * AFTER the layout above has settled, moves whole blocks only, and refuses to
   * move one that would not fit - so it fires only where the defect is and is
   * inert everywhere else.
   */
  const soleOccupant = (rowsOnPage) => rowsOnPage.length > 0 && rowsOnPage.every((r) => r.trailer || r.text === "");
  for (let guard = 0; guard < blocks.length && laid.length > 1 && soleOccupant(laid[laid.length - 1]); guard++) {
    const last = laid[laid.length - 1];
    const previous = laid[laid.length - 2];
    const moving = previous[previous.length - 1].block;
    const moved = [];
    while (previous.length > 0 && previous[previous.length - 1].block === moving) moved.unshift(previous.pop());
    if (moved.length === 0 || moved.length + last.length > capacity) { previous.push(...moved); break; }
    last.unshift(...moved);
    const kept = trim(previous);
    if (kept.length === 0) { laid.splice(laid.length - 2, 1); break; }
    laid[laid.length - 2] = kept;
  }

  for (const rowsOnPage of laid) {
    const page = pdf.addPage([width, height]);
    let y = height - margin;
    for (const row of rowsOnPage) { if (row.text) page.drawText(row.text, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) }); y -= lineHeight; }
  }
  if (!laid.length) pdf.addPage([width, height]);
  const drawnPerPage = laid.map((rowsOnPage) => rowsOnPage.filter((r) => r.text !== "").length);
  /* A key long enough to need a hard split would be one a reader cannot follow
   * across the break. There is none in Rhode Island once the separators are
   * used; this fails the build loudly rather than shipping one. */
  assert.equal(splitToken.hardSplits, 0,
    `renderComposedPdf hard-split a token with no separator to break on in "${title}"`);
  return { bytes: Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false })), drawnPerPage };
}

/* ---- assemble the packet, with the date pinned ------------------------------ */
async function combinePacket(route, slices, fixtureName) {
  const packet = await PDFDocument.create();
  stampDeterministic(packet);
  packet.setTitle(`${route.legalName} — ${fixtureName} fixture`);
  packet.setProducer("RCAP census-v1 artifact-only assembler");
  packet.setCreator("RCAP evidence build");
  const pageManifest = [];
  let nextPage = 1;
  for (const slice of slices) {
    const doc = await PDFDocument.load(slice.bytes, { ignoreEncryption: true, updateMetadata: false });
    const indices = slice.pages
      ? slice.pages.map((p) => p - 1)
      : doc.getPageIndices();
    const copied = await packet.copyPages(doc, indices);
    copied.forEach((page, i) => {
      packet.addPage(page);
      pageManifest.push({
        packetPage: nextPage++, component: slice.componentId, documentId: slice.componentId,
        formNumber: slice.formNumber ?? null,
        sourcePage: indices[i] + 1, sourceSha256: slice.sourceSha256 ?? null
      });
    });
  }
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, pageManifest, pageCount: packet.getPageCount() };
}

/* ---- byte proof: what actually landed on the paper -------------------------- */
async function byteProof(route, census, packetFile, pageManifest) {
  const widgets = await flattenedWidgets(path.join(ROOT, packetFile));
  const officialComponentOf = new Map();
  for (const m of pageManifest) {
    if (m.formNumber === null) continue;
    officialComponentOf.set(m.sourcePage, { component: m.component, packetPage: m.packetPage });
  }
  const actualWrites = [];
  const refusedFieldsWithInk = [];
  let glyphs = 0;
  for (const r of census.rows) {
    for (const wdg of r.widgets) {
      const placed = officialComponentOf.get(wdg.page);
      if (!placed) continue;
      const drawn = drawnAt(widgets, { page: placed.packetPage, rect: wdg.rect });
      const ink = drawn.map((d) => d.text).filter(Boolean).join("").trim();
      if (r.policy === "write") {
        if (ink.length === 0) continue;
        glyphs += ink.replace(/\s+/g, "").length;
        actualWrites.push({
          field: r.key, document: placed.component, factId: r.fact,
          page: placed.packetPage, rect: wdg.rect, drawnText: ink, foundInOutputBytes: true,
          proof: "read back from the flattened widget appearance of the assembled packet bytes"
        });
        continue;
      }
      if (ink.length === 0) continue;
      refusedFieldsWithInk.push({ fieldId: r.key, document: placed.component, page: placed.packetPage, drawnText: ink });
    }
  }
  return { actualWrites, refusedFieldsWithInk, glyphs };
}

async function composedByteProof(route, packetBytes, pageManifest, facts, fixtureName) {
  const doc = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = doc.getPages();
  const textOfComponent = new Map();
  for (const [i, m] of pageManifest.entries()) {
    if (m.formNumber !== null) continue;
    const text = groupIntoLines(extractTextItems(pages[i])).map((l) => l.text).join(" ").replace(/\s+/g, " ");
    textOfComponent.set(m.component, `${textOfComponent.get(m.component) ?? ""} ${text}`);
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const component of route.components.filter((c) => c.kind === COMPOSED)) {
    const text = String(textOfComponent.get(component.id) ?? "").replace(/\s+/g, " ");
    for (const w of composedWritesFor(component)) {
      const value = sanitizePdfText(String(facts[w.fact] ?? ""));
      assert.ok(value.length > 0, `${component.id}/${w.id}: no fixture value for ${w.fact}`);
      assert.ok(text.includes(value),
        `${fixtureName} ${component.id}/${w.id}: the value bound to ${w.fact} is not readable from the packet bytes`);
      glyphs += value.replace(/\s+/g, "").length;
      actualWrites.push({
        field: `${component.id}.${w.id}`, document: component.id, factId: w.fact,
        expected: value, drawnText: value, foundInOutputBytes: true,
        proof: "read back from the extracted text of the component's own pages in the assembled packet bytes"
      });
    }
  }
  return { actualWrites, glyphs };
}

/* ---- the field map ---------------------------------------------------------- */
function composedWritesFor(component) {
  if (component.role === "proposed_order") {
    return [
      { id: "caption_defendant_name", label: "Name of the Defendant, in the caption of the proposed order",
        fact: "participant.full_legal_name" },
      { id: "caption_date_of_birth", label: "Date of birth of the Defendant, in the caption of the proposed order",
        fact: "participant.date_of_birth" }
    ];
  }
  return [{ id: "prepared_for", label: `Person this ${component.role.replaceAll("_", " ")} page is prepared for`,
    fact: "participant.full_legal_name" }];
}

function composedBlanksFor(route, component) {
  if (component.role !== "proposed_order") return { blanks: [], courtBlanks: [] };
  const variant = ORDER_VARIANTS[route.orderVariant];
  const blanks = [
    { id: "order_division", label: `${variant.divisionPrompt} of the proposed order caption`,
      what: "the judicial complex where your case is heard, the same one you marked on the motion",
      why: "which of the four locations heard the case is a fact of the participant's own docket, and the "
        + "platform has not seen it" },
    { id: "order_case_number", label: "Case number in the caption of the proposed order",
      what: "the case number, the same one you wrote on the motion",
      why: "the platform has not seen this participant's court record and holds no case number for it" },
    { id: "order_bci_number", label: "Bureau of Criminal Identification number in the caption of the proposed order",
      what: "your BCI number, the same one you wrote on the motion",
      why: "the BCI number is printed on a criminal history record the platform has never held for anyone" }
  ];
  for (const line of [1, 2, 3, 4]) {
    blanks.push({
      id: `order_charge_line_${line}`,
      label: `Line ${line} of the counts, charges and dispositions the proposed order covers`,
      what: "the count, the charge and how it ended, copied from Boxes 1, 2 and 3 of your motion",
      why: "the platform has not seen this participant's court record and holds no count, charge or outcome from it"
    });
  }
  const courtBlanks = [
    { id: "order_hearing_date", label: "Date of the hearing, stated in the proposed order", why: CLERK_SETS_THE_DATE },
    { id: "order_findings", label: "The findings of the Court, on the proposed order",
      why: "a finding is the court's own. A packet that pre-writes one writes the court's words for it, and the "
        + "owner's decision of 2026-09-05 requires this block to be blank" },
    { id: "order_granted", label: "Box recording that the Court GRANTED the motion",
      why: "whether relief is granted is the court's decision and no part of it is written here" },
    { id: "order_denied", label: "Box recording that the Court DENIED the motion",
      why: "whether relief is refused is the court's decision and no part of it is written here" },
    { id: "order_relief_marked", label: "Box recording the relief the Court orders",
      why: "the relief a court orders is marked by the court when it grants the motion" },
    { id: "order_other_relief", label: "Other relief the Court orders, on the proposed order",
      why: "relief beyond what the motion pleads is the court's to state" },
    { id: "order_further_terms", label: "Further terms or conditions the Court sets, on the proposed order",
      why: "any compliance term is selected by the court, and the owner's decision of 2026-09-05 requires a "
        + "court-selected term to be left blank" },
    { id: "order_signature", label: "Signature line of the Justice or Judge on the proposed order",
      why: "the order is signed by the court and never in advance" },
    { id: "order_entry_date", label: "Date of entry of the proposed order",
      why: "an order is dated when the court enters it" },
    { id: "order_certification", label: "Certification or attestation block of the proposed order",
      why: "the certification and any seal are the clerk's, after entry" }
  ];
  return { blanks, courtBlanks };
}

function composedMapFor(route, component) {
  const base = (id, label) => ({
    field: `${component.id}.${id}`, fieldName: id, page: 1,
    printedLabel: label, printedLine: label, effectiveLabel: label,
    regionHeading: component.title, sectionHeading: component.title,
    rectBasis: "composed_document_authored_by_this_build", document: component.id
  });
  const canonicalWrites = composedWritesFor(component)
    .map((w) => ({ ...base(w.id, w.label), factId: w.fact, kind: "composed_text" }));
  const { blanks, courtBlanks } = composedBlanksFor(route, component);
  const canonicalRefusals = [
    ...blanks.map((r) => ({
      ...base(r.id, r.label),
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, routeDetermined: false, factAvailable: false,
      identity: `${component.id} field ${r.id}`, factId: null,
      why: r.why, participantMustSupply: r.what
    })),
    ...courtBlanks.map((r) => ({
      ...base(r.id, r.label),
      reason: "court, clerk, prosecutor, agency, or hearing field; the court completes it",
      category: COURT_OWNED, completenessClass: COURT_OWNED, class: COURT_OWNED,
      requiredBeforeFiling: false, why: r.why
    }))
  ];
  return {
    formNumber: component.id, documentId: component.id, documentRole: component.role,
    officialFormNumber: null,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true,
      routeKey: route.primaryRouteKey, requirement: component.requirement,
      ...(component.conditionDescription
        ? { conditional: true, conditionDescription: component.conditionDescription } : {})
    },
    structuralClass: "composed_document",
    composedFrom: route.composedFrom,
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

function officialMapFor(route, component, census, written) {
  const writtenNames = new Set(written.map((w) => w.field));
  const rows = census.rows.filter((r) => component.pages.includes(r.page));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];
  for (const r of rows) {
    const b = {
      field: `${component.id}.${r.name}`, fieldName: r.name, page: r.page,
      printedLabel: r.printedLine, printedLine: r.printedLine,
      effectiveLabel: r.effectiveLabel, regionHeading: r.section ?? r.effectiveLabel,
      sectionHeading: r.section ?? null, rect: r.rect, rectBasis: r.rectBasis,
      document: component.id, formNumber: r.formNumber,
      isSelectionControl: r.isSelectionControl === true
    };
    if (r.policy === "write") {
      assert.ok(writtenNames.has(r.name), `${r.name}: the field map intends a write the render did not make`);
      canonicalWrites.push({ ...b, factId: r.fact, kind: "measured_appearance_overlay" });
      continue;
    }
    if (r.policy === "select") {
      canonicalWrites.push({ ...b, factId: null, kind: "measured_route_selection" });
      selectionControls.push({
        selectionId: `${component.id}.${r.name}`, field: r.effectiveLabel,
        disposition: "selected_by_the_route", kind: "selection_control",
        isSelectionControl: true, page: r.page, reason: r.why,
        routeDetermined: true, requiredBeforeFiling: false
      });
      continue;
    }
    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...b,
        reason: r.refusalClass === SIGNATURE
          ? "signature or date field; never prefilled by this build"
          : "court, clerk, prosecutor, agency, or hearing field; the court completes it",
        category: r.refusalClass, completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }
    if (r.policy === "attorney") {
      canonicalRefusals.push({
        ...b, reason: r.why, category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }
    if (r.policy === "offroute") {
      /*
       * A blank on a branch of the form this route does not use.
       *
       * The row DECLARES NOT_APPLICABLE_ON_THIS_ROUTE and names the route
       * condition, on the terms NOT_APPLICABLE_CONDITIONS states. It also
       * carries the trusted refusal class for what the control IS - a legal
       * election on a document the participant signs, and on the affidavit a
       * statement sworn under oath - because that is true of it either way and
       * because the declared channel does not reach a packet.
       *
       * IT DOES NOT REACH A PACKET, AND THAT IS MEASURED RATHER THAN ASSUMED.
       * classifyBlank enters the declared not-applicable gate only when
       * `dec.routeConditionThatMakesItInapplicable` is present, and the reader
       * that builds `dec` -- normalizeRow in
       * scripts/rcap-packet-completeness/verify-packet-completeness.mjs --
       * forwards eight keys and not that one. So a row that declares the
       * disposition and names its condition falls past the gate and lands on
       * UNCLASSIFIED_BLANK, which is a defect counter. It is the same shape of
       * gap that reader's own comments record for
       * determinedByTheCaseNotTheRoute: reachable from the contract's unit test
       * and from no packet at all. This lane may not write in
       * scripts/rcap-packet-completeness/**, so the finding is reported rather
       * than patched, and the declaration is carried in full so it starts
       * working the day the reader forwards the key.
       */
      const row = {
        ...b,
        reason: `a legal election on a branch of this form the route does not use: ${r.routeCondition}`,
        category: PARTICIPANT_ELECTION, completenessClass: PARTICIPANT_ELECTION, class: PARTICIPANT_ELECTION,
        disposition: "NOT_APPLICABLE_ON_THIS_ROUTE", completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
        routeConditionThatMakesItInapplicable: r.routeCondition,
        routeDetermined: false, requiredBeforeFiling: false, factAvailable: false,
        identity: `${component.id} field ${r.name}`, why: r.why
      };
      canonicalRefusals.push(row);
      if (r.isSelectionControl) {
        selectionControls.push({
          selectionId: `${component.id}.${r.name}`, field: r.effectiveLabel,
          disposition: "not_applicable_on_this_route", kind: "selection_control",
          isSelectionControl: true, page: r.page, reason: row.reason,
          category: PARTICIPANT_ELECTION, completenessClass: PARTICIPANT_ELECTION,
          completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
          routeConditionThatMakesItInapplicable: r.routeCondition,
          routeDetermined: false, requiredBeforeFiling: false, why: r.why
        });
      }
      continue;
    }
    if (r.policy === "election") {
      const row = {
        ...b,
        reason: `a choice only the participant can make, and one this route does not determine: ${r.what}`,
        category: PARTICIPANT_ELECTION, completenessClass: PARTICIPANT_ELECTION, class: PARTICIPANT_ELECTION,
        requiredBeforeFiling: false, routeDetermined: false,
        identity: `${component.id} field ${r.name}`, why: r.why, participantMustSupply: r.what
      };
      canonicalRefusals.push(row);
      selectionControls.push({
        selectionId: `${component.id}.${r.name}`, field: r.effectiveLabel,
        disposition: "participant_election", kind: "selection_control",
        isSelectionControl: true, category: PARTICIPANT_ELECTION, completenessClass: PARTICIPANT_ELECTION,
        reason: row.reason, page: r.page,
        requiredBeforeFiling: false, routeDetermined: false,
        identity: row.identity, why: r.why, participantMustSupply: r.what
      });
      continue;
    }
    canonicalRefusals.push({
      ...b,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, routeDetermined: false, factAvailable: false,
      identity: `${component.id} field ${r.name}`, factId: null,
      why: r.why, participantMustSupply: r.what
    });
  }
  return {
    formNumber: component.id, documentId: component.id, documentRole: component.role,
    officialFormNumber: component.sourceForm,
    documentPolicy: {
      mode: "participant", captionOnly: false, documentAcceptsFill: true,
      routeKey: route.primaryRouteKey, requirement: component.requirement,
      ...(component.conditionDescription
        ? { conditional: true, conditionDescription: component.conditionDescription } : {})
    },
    structuralClass: "official_acroform",
    composedFrom: route.composedFrom,
    explicitMappings: {}, roleRefusals: [], selectionControls,
    canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

/* ---- the builder's own count of the nine counters --------------------------- */
function countCompleteness(maps, writeProofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  const row = (r, isSelectionControl) => ({
    id: r.field, name: r.fieldName ?? r.field, label: r.effectiveLabel ?? "", reason: r.reason ?? "",
    refusalClass: Object.hasOwn(r, "completenessClass") ? r.completenessClass : (r.category ?? null),
    page: r.page ?? null, document: r.document ?? null,
    factId: r.factId ?? null, isSelectionControl: isSelectionControl === true || r.isSelectionControl === true,
    declared: {
      disposition: r.completenessDisposition ?? null,
      ...(Object.hasOwn(r, "requiredBeforeFiling") ? { requiredBeforeFiling: r.requiredBeforeFiling === true } : {}),
      routeDetermined: r.routeDetermined === true,
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const selectionIds = new Set();
  for (const m of maps) for (const s of m.selectionControls ?? []) selectionIds.add(s.selectionId);

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w, selectionIds.has(w.field)));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r, selectionIds.has(r.field)));
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
    const here = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared?.factId ? availableFacts.has(String(blank.declared.factId)) : false)
        || here.has(normLabel(blank.label)) || here.has(normLabel(blank.name))
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
    const missing = cells.filter((c) => !c.written && classifyField(c.label, c.isSelectionControl === true).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6) });
  }

  for (const w of writes) {
    if (classifyField(w.label, w.isSelectionControl === true).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  for (const p of writeProofs) {
    const visible = (p.addedGlyphsReadFromOutputBytes ?? 0) + (p.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if ((p.valuesReportedByFinalizer ?? 0) > 0 && visible === 0) note("invisibleWrites", { fixture: p.fixture, reportedByFinalizer: p.valuesReportedByFinalizer });
    if ((p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: p.fixture, glyphsOutside: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes });
    for (const refused of p.refusedFieldsWithInk ?? []) note("protectedWrites", { fixture: p.fixture, field: refused.fieldId, why: "a field the map refused carries ink in the output" });
  }

  return { counters, findings, ledger, terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length };
}

/* ---- outputs ---------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(route, maps) {
  const order = Object.fromEntries(route.components.map((c, i) => [c.id, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (order[a.document] - order[b.document]) || String(a.field).localeCompare(String(b.field)));
}

function participantElections(route, maps) {
  const order = Object.fromEntries(route.components.map((c, i) => [c.id, i]));
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.category === PARTICIPANT_ELECTION && r.completenessDisposition !== "NOT_APPLICABLE_ON_THIS_ROUTE")
    .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel, what: r.participantMustSupply })))
    .sort((a, b) => (order[a.document] - order[b.document]) || String(a.field).localeCompare(String(b.field)));
}

function participantInstructions(route, maps, rbf, elections) {
  const t = route.track;
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const titleOf = new Map(route.components.map((c) => [c.id, c.title]));
  const out = [];
  out.push(`# What you must do before you file — ${route.routeName}`, "");
  out.push(`This packet is prepared for **${route.legalName}**.`, "");
  out.push(`It contains ${route.form.court}'s own published form — ${route.form.title}, ${route.form.revisionPrinted} — `
    + "and a proposed order composed for you, because Rhode Island publishes no template for the order its own "
    + "instruction 7 tells you to bring to the hearing. Nothing else here was invented.", "");
  out.push("**The platform filled in two facts, and only two: your name and your date of birth,** in the caption "
    + "of the motion, the caption of the affidavit and the caption of the proposed order. Everything else on "
    + "these pages is a fact about your case that the platform has never seen, a statement only you may swear to, "
    + "or a block the court, the clerk or the notary completes.", "");
  out.push("**Two boxes on the motion are marked for you, because the route decides them and not you.** The "
    + "packet marks *expunged* rather than *sealed*, and it marks the second relief bullet — the expungement of "
    + "the records of the case under G.L. 1956 § 12-1.3-3(c) or (e) — rather than the first, which is the "
    + "§ 12-1-12 destruction-of-identification-records relief for a case that did not end in a conviction.", "");
  out.push("**Not one box on the affidavit is marked.** Every one of them is a statement you swear to under "
    + "oath, and the platform holds no Rhode Island criminal history record and no court docket for anyone.", "");
  out.push("", "## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  for (const c of route.components) {
    const cond = c.requirement === "conditional" ? ` **Conditional:** ${c.conditionDescription}` : "";
    out.push(`| \`${c.id}\` | ${c.blurb}${cond} |`);
  }
  out.push("");
  out.push("## The Part of the affidavit that is yours", "");
  out.push("Page 1 of the court's form, instruction 4, tells you to identify the Part of the affidavit that "
    + `applies to your motion. For this route it is **${route.partPrintedName}**, which applies where `
    + `${route.partAppliesWhen}.`, "");
  out.push("Instruction 5 then tells you to put a check mark in the box for each statement in that Part that is "
    + "**true**. Read them one by one. Mark a statement only if it is true of your case. If one of them is not "
    + "true, do not mark it and do not file until you have advice: an unmarked box is a gap a court can ask you "
    + "about, and a marked box that is not true is a false statement under oath.", "");
  out.push("The boxes in the other Parts of the same affidavit belong to other statutory branches. They are "
    + "recorded in this packet's field map as outside this route, and you leave them alone.", "");
  if (route.discrepancies.length) {
    out.push("## Read this before you swear to anything", "");
    for (const d of route.discrepancies) out.push(d, "");
  }
  out.push("## Documents you must obtain first", "");
  out.push("| Document | Where you get it |", "| --- | --- |");
  for (const d of t.documents) out.push(`| ${d.name} | ${d.from}. ${d.how} |`);
  out.push("");
  if (rbf.length > 0) {
    out.push("## The items you must supply", "");
    out.push("Each is a blank on the document named beside it. Fill every one that belongs to the document you "
      + "are filing, from the record itself, never from memory.", "");
    for (const [doc, items] of byDoc) {
      out.push(`### \`${doc}\` — ${titleOf.get(doc) ?? doc}`, "");
      out.push("| The blank on the document | What to write |", "| --- | --- |");
      for (const i of items) out.push(`| ${i.disclosureLabel} | ${i.participantMustSupply} |`);
      out.push("");
    }
  }
  if (elections.length > 0) {
    out.push("## The boxes you mark yourself", "");
    out.push("None of these is marked for you, and none of them is a choice this route makes.", "");
    out.push("| The box | What to do with it |", "| --- | --- |");
    for (const e of elections) out.push(`| ${e.label} | ${e.what} |`);
    out.push("");
  }
  out.push("## What you do, in order", "");
  out.push("1. **Get your Rhode Island BCI criminal history record** from the Department of Attorney General's "
    + "Bureau of Criminal Identification, and **get the docket and judgment** from the clerk of the court that "
    + "handled the case. Every blank in the table above comes off one of those two records.");
  out.push("2. **Fill in the motion**: the case number, the BCI number, the judicial complex, and every count, "
    + "charge and disposition you are asking the court to expunge.");
  out.push(`3. **Fill in the affidavit's ${route.partPrintedName}** — the boxes that are true of your case — and `
    + "leave the other Parts alone.");
  out.push("4. **Sign the affidavit in front of a notary public or a clerk.** It is sworn, and the signature "
    + "must be witnessed in person. Do not sign it in advance and do not date it in advance; the notary "
    + "completes the whole certificate at the foot of it.");
  out.push("5. **File the motion, the affidavit and the proposed order** with the clerk of the court where the "
    + "case was heard.");
  out.push("6. **The Clerk's Office sets the hearing date**, at least ten days out. You do not fill that in.");
  out.push("7. **Give notice** to the Office of the Attorney General and to the police that brought the charge, "
    + "at least ten days before the hearing — then, and only then, complete the certification line on the motion "
    + "with the date you gave notice and the name of that police force.");
  out.push("8. **Take the proposed order with you to the hearing.** Instruction 7 on page 1 says so.");
  out.push("9. **After a grant**, pay every fine, fee, cost, assessment and restitution in full, ask the clerk's "
    + "office for the three certified copies, keep one, and deliver one to the Attorney General's BCI unit and "
    + "one to the police department that charged the case. Delivering them is your responsibility.", "");
  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature, and every date beside it**, on the motion and on the sworn affidavit.");
  out.push("- **Every box on the affidavit**, in your Part and in every other.");
  out.push("- **The hearing date and the courtroom.** The Clerk's Office fills those in.");
  out.push("- **The certification that notice has been given** — both its date and the name of the police force. "
    + "A certification of something that has not happened yet is false.");
  out.push("- **The Rhode Island Bar Number block**, which belongs to an attorney filing the motion.");
  out.push("- **The whole notarial certificate** at the foot of the affidavit.");
  out.push("- **Everything on the proposed order below the line** — the findings, whether the motion is granted "
    + "or denied, the relief marked, any further terms, the signature, the date of entry and the certification. "
    + "That block is the court's, and a packet that pre-writes a finding writes the court's words for it.", "");
  out.push("## When to stop and get help instead", "");
  out.push("The committed track registry for this route records these as the points where self-help ends, in its "
    + "own words. If any of them describes your case, stop here and get advice before you file:", "");
  for (const s of t.stops) out.push(`- ${s}`);
  out.push("");
  out.push("## What this packet is not", "");
  out.push("It is Rhode Island's own motion and affidavit, a proposed order composed for the hearing because the "
    + "state publishes none, and instructions. It is not legal advice, it is not filed for you, and it does not "
    + "decide whether you are eligible. Expungement under Chapter 12-1.3 does not resolve immigration "
    + "consequences and does not reach federal, out-of-state, military or tribal records.", "");
  out.push(`_Route: ${route.routeKeys.join(" · ")}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the route, assembled from the family table and the committed record ---- */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1994-04-17"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1972-12-31"
  }
};

function routeOf(familyId) {
  const cfg = FAMILIES[familyId];
  assert.ok(cfg, `${familyId}: not one of the five Rhode Island families this host builds`);
  const form = FORMS[cfg.form];
  const track = trackRecord(cfg.trackId);
  const part = PARTS[cfg.form].find((p) => p.id === cfg.partId);
  assert.ok(part, `${familyId}: no affidavit Part ${cfg.partId} on ${cfg.form}`);
  const components = [
    ...officialComponents(familyId, form, cfg.splitAffidavitComponent),
    ...composedComponents(familyId, cfg.singleGuidanceComponent)
  ];
  const variant = ORDER_VARIANTS[cfg.orderVariant];
  assert.ok(variant.usedBy.includes(familyId),
    `${familyId}: the ${cfg.orderVariant} proposed order variant does not list this family`);
  return {
    ...cfg,
    familyId, jurisdiction: "RI", form, track, components,
    legalName: track.legalName,
    courtShort: form.courtShort,
    partPrintedName: part.printedName,
    partAppliesWhen: part.appliesWhen,
    primaryRouteKey: cfg.routeKeys.length > 1 ? cfg.routeKeys[1] : cfg.routeKeys[0],
    outDir: `data/rcap-all50/overlays/census-v1/ri/${familyId.replaceAll("_", "-")}--official-pdf-fill`,
    buildScript: `scripts/build-census-v1-${familyId}.mjs`,
    composedFrom:
      "the committed legal-design track registry (data/record-clearing/legal-design-track-registry.json, track "
      + `${cfg.trackId}), the route-obligation census candidate record for this route, and the owner decision `
      + "OWN-RI-PROPOSED-ORDER-2026-09-05 (data/rcap-grade-a/legal-decisions/OWNER_RI_PROPOSED_ORDER_2026-09-05.json)"
  };
}

function fieldSpecFor(route) {
  return {
    ...motionFields(route.form),
    ...motionTailFields(route.form),
    ...selectionFields(route.form, route),
    ...affidavitCaptionAndOathFields(route.form),
    ...affidavitPartFields(route.form, route.partId)
  };
}

/* ---- the entry point --------------------------------------------------------- */
export async function runRhodeIslandFamily(familyId, argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");
  const route = routeOf(familyId);
  const OUT = route.outDir;

  const index = contentIndex();
  const { resolved, failure } = resolveSource(route.form, index);
  if (failure) {
    return {
      familyId, status: "STOPPED", stopClass: "BLOCKED_SOURCE",
      failedSourceIdentities: [failure], overlayBytesWritten: false,
      directory: OUT, packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
    };
  }
  assert.equal(resolved.byteLength > 0, true, "a bound source with no bytes is not a bound source");

  const spec = fieldSpecFor(route);
  const census = await censusOf(resolved, spec);

  if (checkOnly) {
    return {
      familyId, status: "CHECK_ONLY", indexedFiles: index.files,
      source: {
        sourceId: resolved.sourceId, custody: resolved.custody, sha256: resolved.sha256,
        pages: census.pageCount, fields: census.rows.length
      },
      unmappedFields: census.unmapped, staleDictionaryKeys: census.stale,
      anchorDrift: census.anchorDrift, sourceCarried: census.sourceCarried,
      hiddenWidgets: census.hiddenWidgets,
      byPolicy: census.rows.reduce((acc, r) => { acc[r.policy] = (acc[r.policy] ?? 0) + 1; return acc; }, {})
    };
  }

  assert.equal(census.unmapped.length, 0,
    `every AcroForm field must be declared: ${census.unmapped.map((u) => u.field).join(" | ")}`);
  assert.equal(census.stale.length, 0,
    `the field dictionary names fields this form does not have: ${census.stale.join(" | ")}`);
  assert.equal(census.anchorDrift.length, 0,
    "a pinned printed anchor is no longer where the dictionary says: "
    + census.anchorDrift.map((d) => `${d.field}@p${d.page} (${d.matches} matches)`).join(" | "));
  assert.equal(census.hiddenWidgets.length, 0,
    "this build refuses to write on a form carrying a hidden or no-view widget: "
    + census.hiddenWidgets.map((h) => h.field).join(" | "));
  assert.equal(census.sourceCarried.length, 0,
    "the pinned source ships a value of its own, which would flatten as ink: "
    + census.sourceCarried.map((s) => `${s.field}=${s.sourceValue}`).join(" | "));

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const pdfsDeclared = [];
  let maps = null;
  let writtenFieldSet = null;
  let selectionProof = null;

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const official = await renderOfficialForm(resolved, census, facts, familyId);
    selectionProof = official.selectionProof;

    const slices = [];
    for (const component of route.components) {
      if (component.kind === OFFICIAL) {
        slices.push({
          componentId: component.id, bytes: official.bytes, pages: component.pages,
          formNumber: component.sourceForm, sourceSha256: resolved.sha256
        });
        continue;
      }
      const body = component.body(route, facts);
      for (const w of composedWritesFor(component)) {
        const value = String(facts[w.fact] ?? "");
        assert.ok(value.length > 0 && String(body).includes(value),
          `${component.id}: the composed page must carry the value bound to ${w.fact}`);
      }
      const composed = await renderComposedPdf(body, component.title);
      const lonely = composed.drawnPerPage.map((n, i) => ({ page: i + 1, n })).filter((x) => x.n <= 1);
      assert.equal(lonely.length, 0,
        `${component.id} (${fixtureName}): a composed page carries a single drawn line: `
        + lonely.map((x) => `page ${x.page} (${x.n})`).join(", "));
      slices.push({ componentId: component.id, bytes: composed.bytes, pages: null, formNumber: null });
    }

    if (!maps) {
      maps = route.components.map((component) => (component.kind === OFFICIAL
        ? officialMapFor(route, component, census, official.written)
        : composedMapFor(route, component)));
    }

    const combined = await combinePacket(route, slices, fixtureName);
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), combined.bytes);

    const proof = await byteProof(route, census, file, combined.pageManifest);
    const composedProof = await composedByteProof(route, combined.bytes, combined.pageManifest, facts, fixtureName);
    proof.actualWrites.push(...composedProof.actualWrites);
    proof.glyphs += composedProof.glyphs;

    const writtenHere = new Set(official.written.map((w) => w.field));
    if (writtenFieldSet === null) writtenFieldSet = writtenHere;
    else {
      const missing = [...writtenFieldSet].filter((k) => !writtenHere.has(k));
      const extra = [...writtenHere].filter((k) => !writtenFieldSet.has(k));
      assert.ok(missing.length === 0 && extra.length === 0,
        `fixtures do not write the same fields - ${fixtureName} is missing [${missing.join(", ")}] `
        + `and adds [${extra.join(", ")}]. A value that fits one participant's blank and not another's must be `
        + "withheld from both, not written for one.");
    }
    assert.equal(proof.refusedFieldsWithInk.length, 0,
      `${fixtureName}: a field the map refused carries ink: `
      + proof.refusedFieldsWithInk.map((r) => r.fieldId).join(", "));
    const intendedWrites = official.written.reduce((n, w) => n + w.widgets.length, 0)
      + route.components.filter((c) => c.kind === COMPOSED)
        .reduce((n, c) => n + composedWritesFor(c).length, 0);
    assert.equal(proof.actualWrites.length, intendedWrites,
      `${fixtureName}: ${intendedWrites} write(s) were intended and ${proof.actualWrites.length} are readable `
      + "from the assembled packet bytes");

    writeProofs.push({
      fixture: fixtureName,
      proofMethod: "every written value read back from the flattened widget appearances of the assembled packet "
        + "bytes, and every composed value from the extracted text of its own pages",
      valuesReportedByFinalizer: official.written.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.actualWrites.length,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      routeSelectionsDrawn: official.selectionProof,
      actualWrites: proof.actualWrites
    });

    const digest = sha256(combined.bytes);
    artifacts.push({
      fixture: fixtureName, file, sha256: digest,
      byteLength: combined.bytes.length, pageCount: combined.pageCount,
      pageManifest: combined.pageManifest,
      documents: route.components.map((c) => c.id), components: route.components.map((c) => c.id)
    });
    pdfsDeclared.push({
      file, documentId: "assembled_packet", role: "assembled_packet_of_official_and_composed_components",
      fixture: fixtureName, sha256: digest, byteLength: combined.bytes.length, pageCount: combined.pageCount
    });

    if (!skipRaster) {
      const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < combined.pageCount; i += 1) {
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
          component: combined.pageManifest[i]?.component ?? null,
          pageWidthPt: render.pageWidth, pageHeightPt: render.pageHeight,
          pixelsPerPoint: Number(render.pxPerPt.toFixed(4)),
          calibrationResidualPx: render.calibrationResidualPx,
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: sha256(fs.readFileSync(png))
        });
      }
    }
  }

  return finishFamily({
    route, resolved, census, index, maps, artifacts, writeProofs, rasterPages,
    pdfsDeclared, selectionProof, skipRaster, OUT
  });
}

/* ---- the records this build leaves behind ------------------------------------ */
function finishFamily({ route, resolved, census, index, maps, artifacts, writeProofs, rasterPages,
  pdfsDeclared, selectionProof, skipRaster, OUT }) {
  const familyId = route.familyId;
  const rbf = requiredBeforeFilingItems(route, maps);
  const elections = participantElections(route, maps);
  const instructionsText = participantInstructions(route, maps, rbf, elections);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  const officialComponentIds = route.components.filter((c) => c.kind === OFFICIAL).map((c) => c.id);
  const composedComponentIds = route.components.filter((c) => c.kind === COMPOSED).map((c) => c.id);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId, worklistGroupId: familyId,
    jurisdiction: route.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    bindingMethod:
      "the source is found BY CONTENT and never by a declared path. Every mounted custody is walked once and "
      + "indexed by SHA-256, this family's pinned digest is looked up in that index, and the committed corpus "
      + "index is then read for what it records about the same digest. An index with no entries is refused as a "
      + "broken denominator rather than reported as a missing source.",
    contentIndex: {
      filesIndexed: index.files, custodiesMounted: index.mounted, custodiesNotMounted: index.notMounted,
      committedIndexConsulted: CORPUS_INDEX
    },
    routeKeys: route.routeKeys, routeSelectionId: route.routeSelectionId,
    statutoryAuthority: route.statute, legalName: route.legalName,
    allSourcesExact: true,
    documents: [{
      documentId: officialComponentIds[0], formNumber: resolved.formNumber, title: resolved.title,
      instrumentKind: resolved.instrumentKind, sourceId: resolved.sourceId,
      custody: resolved.custody, pathInArchive: resolved.pathInArchive, revision: resolved.revision,
      sha256: resolved.sha256, sha256Exact: true, byteLength: resolved.byteLength,
      pageCount: census.pageCount, acroFieldCount: census.rows.length,
      structuralClassObserved: resolved.structuralClassObserved ?? "acroform",
      committedIndexAgrees: resolved.committedIndexAgrees,
      acroFieldCountRecordedInCommittedIndex: resolved.acroFieldCountIndexed,
      pageCountRecordedInCommittedIndex: resolved.pageCountIndexed,
      componentsCarvedFromThisBinary: officialComponentIds,
      generatedParticipantArtifact: true
    }],
    composedComponentsAuthoredByThisBuild: composedComponentIds,
    retiredSourceIdentitiesThisFamilyDoesNotBind: [
      "official-form:DC-33-ORDER", "official-form:Superior-55-ORDER"
    ],
    whyTheOrderBindsNoSource:
      "The owner's decision of 2026-09-05, record OWN-RI-PROPOSED-ORDER-2026-09-05, retired both order "
      + "identities: they named published forms that do not exist. The proposed order in this packet is a "
      + "custom participant-prepared document, it binds no source binary, and the parent motion-and-affidavit "
      + "packet is never rebound under an order identity.",
    groundingRecords: [
      { record: "data/record-clearing/legal-design-track-registry.json", track: route.trackId,
        read: "the legal name, the authority, the venue, the mechanism, the rules block, the exclusions, the "
          + "waiting periods, the documents the participant must obtain and the self-help stop conditions, "
          + "reproduced word for word" },
      { record: "data/rcap-grade-a/legal-decisions/OWNER_RI_PROPOSED_ORDER_2026-09-05.json",
        recordId: "OWN-RI-PROPOSED-ORDER-2026-09-05",
        read: "the approval to compose the proposed order, the list of what stays blank on it, and the "
          + "requirement that it never be presented as an official Rhode Island form" },
      { record: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
        read: "the route keys, the destination and the component set this family owes" }
    ],
    officialSourcesRecordedInIntake: route.track.officialSources,
    formIdentityNote:
      `One official binary, used as published: ${resolved.title}, ${resolved.revisionPrinted}. Rhode Island `
      + "publishes one motion-and-affidavit form per court and carries every statutory branch as a numbered Part "
      + `of one affidavit, so this family binds ${resolved.formNumber} and builds on `
      + `${route.partPrintedName}. No form number is invented and no order identity is acquired.`,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that any output is approved for participant delivery",
      "that the revision held here is the revision the Rhode Island Judiciary publishes today",
      "what, if anything, it costs to file a Chapter 12-1.3 motion - no held record states a filing fee",
      "which relief bullet a particular Rhode Island division expects on a deferred-sentence motion",
      "whether the Part Two wording on Superior-55 that reads 'misdemeanor' where page 1 of the same form reads "
        + "'felony' is a drafting error, which is a question of Rhode Island practice this build does not answer",
      "whether the participant is eligible on this route"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1", familyId,
    readFirstHandFrom: "the pinned source binary, at the SHA-256 the source receipt records",
    documents: [{
      documentId: resolved.formNumber, pageCount: census.pageCount, fields: census.rows.length,
      unmapped: census.unmapped, staleDictionaryKeys: census.stale, anchorDrift: census.anchorDrift,
      hiddenOrNoViewWidgets: census.hiddenWidgets, sourceCarriedValues: census.sourceCarried,
      rows: census.rows.map((r) => ({
        field: r.name, type: r.type, page: r.page, rect: r.rect, rectBasis: r.rectBasis,
        component: route.components.find((c) => c.kind === OFFICIAL && c.pages.includes(r.page))?.id ?? null,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        printedAnchor: r.anchor, printedLine: r.printedLine, anchorAt: r.anchorAt,
        printedStatement: r.printedStatement,
        effectiveLabel: r.effectiveLabel, section: r.section, policy: r.policy, factId: r.fact ?? null,
        sourceValuePresentInBlankForm: r.sourceValue
      }))
    }]
  });

  const routeSelectionsMade = maps.flatMap((m) => (m.selectionControls ?? [])
    .filter((s) => s.disposition === "selected_by_the_route")
    .map((s) => ({ document: m.formNumber, selectionId: s.selectionId, control: s.field, why: s.reason })));

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId,
    routeKeys: route.routeKeys, routeSelectionId: route.routeSelectionId,
    renderStrategy: "official_pdf_fill", jurisdiction: route.jurisdiction,
    statute: route.statute, legalName: route.legalName, implementationStrategy: "official_pdf_fill",
    officialForm: [{ documentId: officialComponentIds[0], formNumber: resolved.formNumber, sha256: resolved.sha256 }],
    componentSet: route.components.map((c) => c.id),
    componentRoles: Object.fromEntries(route.components.map((c) => [c.id, c.role])),
    componentConditions: Object.fromEntries(route.components
      .filter((c) => c.conditionDescription).map((c) => [c.id, c.conditionDescription])),
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    affidavitPartOnThisRoute: route.partPrintedName,
    routeSelectionsMade,
    routeSelectionNote:
      "Two controls on the motion are marked by this build because the route decides them: EXPUNGED rather than "
      + "SEALED, and the second relief bullet - the expungement of the records of the case under G.L. 1956 Sec. "
      + "12-1.3-3(c) or (e) - rather than the first, which is the Sec. 12-1-12 and Sec. 12-1-12.1 "
      + "destruction-and-sealing branch for a case that did not end in a conviction. Each mark is two diagonal "
      + "strokes struck strictly inside the control's own measured rectangle; no box is drawn and the court's own "
      + `stroke is untouched. The affidavit Part is likewise route-determined and is stated - ${route.partPrintedName} `
      + "- while every box inside it is left for the participant, because each is sworn under oath. The boxes in "
      + "the other Parts are declared outside this route, each naming the branch of the form that puts it there. "
      + "The four judicial-complex boxes are the participant's: which location heard the case is a fact of their "
      + "own docket and the route is statewide.",
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    participantElections: elections,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId,
    renderedFresh: true, derivedFromBytes: true,
    componentSet: route.components.map((c) => c.id),
    componentConditions: Object.fromEntries(route.components
      .filter((c) => c.conditionDescription).map((c) => [c.id, c.conditionDescription])),
    boundSources: [{
      sourceId: resolved.sourceId, documentId: officialComponentIds[0], formNumber: resolved.formNumber,
      custody: resolved.custody, pathInArchive: resolved.pathInArchive, sha256: resolved.sha256
    }],
    pdfs: pdfsDeclared,
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    routeSelectionsDrawn: selectionProof,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId, derivedFromArtifactBytes: true,
    note:
      "Every written value was read back from the ASSEMBLED packet bytes at the packet's own page numbers - from "
      + "the flattened widget appearances for the official pages, and from the extracted page text for the pages "
      + "this build authored. Nothing here is the builder's intent and nothing is read from an intermediate.",
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
    participantElections: elections,
    protectedBlanks: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.requiredBeforeFiling !== true && r.category !== PARTICIPANT_ELECTION)
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel,
        refusalClass: r.category ?? null, why: r.why ?? r.reason }))),
    blanksOutsideThisRoute: maps.flatMap((m) => (m.canonicalRefusals ?? [])
      .filter((r) => r.completenessDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE")
      .map((r) => ({ document: m.formNumber, field: r.field, label: r.effectiveLabel,
        routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  const counted = countCompleteness(maps, writeProofs, instructionsText);
  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1", familyId,
    whatThisIs:
      "The BUILDER's own count of the nine completeness counters, computed with the repository's own contract "
      + "functions over this family's field map, byte proof and participant-instructions.md.",
    whatThisIsNot:
      "A verdict. This lane does not verify its own packets, and PASS_COMPLETE additionally requires a "
      + "hash-bound RASTER_PASS from the central raster workflow.",
    counters: counted.counters,
    allNineZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    findings: counted.findings,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: route.buildScript,
    buildHost: "scripts/build-census-v1-ri_decriminalized-set.mjs",
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
    findings: buildFindings(route, resolved, census, index)
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: counselQuestions(route),
    mattersForTheReviewersAttention: reviewerNotes(route, resolved)
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 10)
    }),
    counters: counted.counters,
    directory: OUT,
    implementationStrategy: "official_pdf_fill",
    boundSources: 1,
    sources: [{ sourceId: resolved.sourceId, custody: resolved.custody, sha256: resolved.sha256,
      byteLength: resolved.byteLength, pathInArchive: resolved.pathInArchive }],
    components: route.components.map((c) => c.id),
    documents: route.components.map((c) => c.id),
    affidavitPart: route.partPrintedName,
    proposedOrderVariant: ORDER_VARIANTS[route.orderVariant].variantId,
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    terminalFields: counted.terminalFields,
    blankDispositions: counted.ledger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {}),
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, pages: a.pageCount,
      byteLength: a.byteLength })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

function buildFindings(route, resolved, census, index) {
  const findings = [
    {
      finding:
        `The one bound binary was found BY CONTENT: ${index.files} files across the mounted custodies `
        + `[${index.mounted.join(", ")}] were indexed by SHA-256 and this family's pin was looked up in that `
        + `index. Custodies not mounted here: [${index.notMounted.join(", ") || "none"}].`,
      consequence:
        "No BLOCKED_SOURCE in this family can come from a wrong declared path, and a scan that resolved nothing "
        + "would be refused as a broken denominator rather than reported as a missing source."
    },
    {
      finding:
        "The shared field semantics resolve this form's defendant-name blank - named, by the form's own author, "
        + "\"State of Rhode Island v Defendant\" - to participant.state. Left to the shared descriptor channel, "
        + "the finalizer would have printed the participant's state of residence on the line that holds the "
        + "defendant's name, on both the motion and the sworn affidavit. An explicit mapping cannot correct it: "
        + "decideBinding refuses an explicit mapping that disagrees with the name channel.",
      consequence:
        "Every field on the binary is classified unwritable by role, so the shared finalizer writes nothing and "
        + "only sanitizes and flattens. The two held facts are then placed as Form XObject appearances inside the "
        + "widget rectangles measured off the pinned binary - the same construction flatten emits - and each is "
        + "required to pass protectCategoryOf before it is placed, so the protection channel still governs. This "
        + "is a defect in the shared vocabulary as applied to this form, and it is reported rather than patched: "
        + "the vocabulary is shared with families outside this lane's grant."
    },
    {
      finding:
        "Rhode Island publishes no template for the Order for Expungement or Sealing of Record that instruction 7 "
        + "on page 1 of its own motion tells the participant to bring to the hearing. official-form:DC-33-ORDER "
        + "and official-form:Superior-55-ORDER named published forms that do not exist and are retired.",
      consequence:
        "The proposed order is composed under owner decision OWN-RI-PROPOSED-ORDER-2026-09-05, binds no source "
        + "binary, states on its own face that it is not an official Rhode Island form, and carries objective "
        + "case and route facts only. Its whole decretal block - findings, grant, denial, relief marked, further "
        + "terms, signature, date of entry, certification - is printed as an empty block the court completes. "
        + "The parent motion-and-affidavit packet is not rebound under an order identity."
    },
    {
      finding:
        "The owner's decision requires three court-specific variants: District Court; Superior Court felony and "
        + "deferred-sentence; Superior Court misdemeanor. Two are composed. NO FAMILY ON THIS ROSTER TAKES THE "
        + "SUPERIOR COURT MISDEMEANOR VARIANT: Rhode Island's Superior Court misdemeanor route runs on form "
        + "Superior-27, which none of the five families binds.",
      consequence:
        "The third variant is not composed. An order nothing uses would sit in the tree with no route to check "
        + "it against and no packet to review it in."
    },
    {
      finding:
        `Not one of the ${census.rows.filter((r) => r.isSelectionControl).length} selection controls on the `
        + "affidavit is marked by this build. Instruction 5 on page 1 asks the person filing to mark each "
        + "statement that is TRUE under the Part applicable to their motion, and every one of those statements "
        + "is sworn under oath about the participant's own criminal history, unpaid balances, pending "
        + "proceedings or moral character.",
      consequence:
        "The packet states which Part the route uses, declares the other Parts' boxes as outside the route, and "
        + "leaves every box in the applicable Part for the participant. The platform holds no Rhode Island "
        + "criminal history record and no court docket for anyone, and 'I have exhibited good moral character' "
        + "is not a fact any platform can hold."
    },
    {
      finding:
        "Two controls on the motion ARE marked, because the route determines them: EXPUNGED rather than SEALED, "
        + "and the second relief bullet - expungement of the records of the case under G.L. 1956 Sec. "
        + "12-1.3-3(c) or (e) - rather than the first, which is the Sec. 12-1-12 and Sec. 12-1-12.1 "
        + "destruction-and-sealing branch for a case that did not end in a conviction.",
      consequence:
        "Each mark is two diagonal strokes struck strictly inside the control's own measured rectangle by the "
        + "shared selection finalizer, which draws no box and never touches the court's own stroke, and each is "
        + "proved against the artifact's own vector paths rather than against the finalizer's report."
    },
    {
      finding:
        "The whole certification of notice on the motion - the date and the name of the charging police - is "
        + "left for the participant, and so is the notarial certificate at the foot of the affidavit.",
      consequence:
        "Notice cannot be given until the Clerk's Office has set the hearing date, so at generation time the "
        + "fact does not exist; a certification completed in advance would be false. The notarial certificate is "
        + "completed by the notary or the clerk who administers the oath, and no date is written on a document "
        + "sworn under oath."
    },
    {
      finding:
        "The completeness contract's declared NOT_APPLICABLE_ON_THIS_ROUTE channel cannot be reached from a "
        + "packet. classifyBlank enters that gate only when dec.routeConditionThatMakesItInapplicable is "
        + "present, and normalizeRow in scripts/rcap-packet-completeness/verify-packet-completeness.mjs builds "
        + "dec from eight keys that do not include it.",
      consequence:
        "Every off-route row here carries the declaration AND the named route condition, so it starts working "
        + "the day the reader forwards the key, and it also carries the trusted refusal class for what the "
        + "control is - a legal election on a document the participant signs. This lane may not write in "
        + "scripts/rcap-packet-completeness/**, so the gap is reported rather than patched."
    }
  ];
  for (const d of route.discrepancies) {
    findings.push({
      finding: "A discrepancy on Rhode Island's own published form, carried to the participant rather than "
        + "resolved by this build.",
      consequence: d
    });
  }
  return findings;
}

function counselQuestions(route) {
  const q = [
    "Confirm the composed proposed order. It is a custom participant-prepared document under owner decision "
    + "OWN-RI-PROPOSED-ORDER-2026-09-05, it says on its face that it is not an official Rhode Island form, and "
    + "its whole decretal block is printed as unmarked boxes and empty lines for the court. Confirm that "
    + "printing the grant and denial boxes, and the relief bullet quoted verbatim from the court's own motion, "
    + "for the court to mark, is on the right side of the line the decision draws - and that a proposed order "
    + "with no pre-written ordering clause is still usable at a Rhode Island hearing.",
    "Confirm the two marks this build makes on the motion: EXPUNGED rather than SEALED, and the Sec. 12-1.3-3(c) "
    + "or (e) relief bullet rather than the Sec. 12-1-12 bullet.",
    `Confirm that ${route.partPrintedName} is the Part of the affidavit this route uses, and that leaving every `
    + "box in it unmarked - with the other Parts declared outside the route - is the right treatment for a "
    + "document sworn under oath.",
    "Confirm that writing only the participant's name and date of birth, and treating the case number, the BCI "
    + "number and every count, charge and disposition as required-before-filing, is the right division for a "
    + "Rhode Island packet."
  ];
  if (route.trackId !== "ri_decriminalized") {
    q.push("Confirm that publishing no filing-fee figure is right. The committed record says no filing fee for a "
      + "Chapter 12-1.3 motion is stated in the controlling review or located in the Judiciary materials, and "
      + "instructs that no price be quoted until it is confirmed.");
  }
  for (const d of route.discrepancies) q.push(`Resolve, or confirm the packet's handling of, this: ${d}`);
  return q;
}

function reviewerNotes(route, resolved) {
  return [
    `One official binary is bound - ${resolved.title}, ${resolved.revisionPrinted}, SHA-256 ${resolved.sha256} - `
    + "and it is used as published. Rhode Island carries every statutory branch as a numbered Part of one "
    + `affidavit, so this family builds on ${route.partPrintedName}.`,
    "The proposed order is generated unexecuted and unfilled below its caption. Every line that records a "
    + "judicial act is blank: the findings, the grant, the denial, the relief marked, any further terms, the "
    + "signature, the date of entry and the certification.",
    "The build asserts that the canonical and boundary fixtures write an identical set of fields, so a value "
    + "that fits one participant's blank and not another's cannot be written for one and dropped for the other.",
    "The two participant facts are written as measured Form XObject appearances rather than through the shared "
    + "descriptor channel, because that channel resolves this form's defendant-name blank to participant.state. "
    + "Each write still passes the shared protect rules before it is placed.",
    "Nothing on the affidavit is marked. Nothing on the notarial certificate is written. Nothing on the "
    + "certification of notice is written or dated."
  ];
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runRhodeIslandFamily("ri_decriminalized-set")
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
