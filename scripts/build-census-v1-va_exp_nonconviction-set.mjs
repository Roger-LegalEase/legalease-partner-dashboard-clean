#!/usr/bin/env node
/**
 * The Virginia non-conviction expungement family — `va_exp_nonconviction-set`.
 *
 *   node scripts/build-census-v1-va_exp_nonconviction-set.mjs [--check] [--no-raster]
 *
 * One official circuit court form, CC-1473, _Petition for Expungement Filed in
 * a Circuit Court — Acquittal/Dismissal_ (MASTER, Rev. 07/26). The form prints
 * its own authority across its caption — VA. CODE § 19.2-392.2(A) — and that is
 * the section this track is recorded under in
 * data/rcap-ledger/track-pathway-crosswalk.json ("Petition for Expungement of
 * Police and Court Records of a Non-Conviction, Va. Code § 19.2-392.2(A)").
 * The MASTER_QUEUE assignment names CC-1473 and the form agrees with it, so —
 * unlike the CC-1201/CC-1203 finding the sealing builders returned — there is
 * no discrepancy to report here. THE ASSIGNED FORM IS THE FORM BUILT ON. A
 * prior VA builder substituted a neighbouring form number and it went to
 * counsel; nothing of the kind happens in this lane.
 *
 * Modeled on scripts/build-census-v1-va_seal_petition_misdemeanor-set.mjs (the
 * completed VA sealing builders — same state, same CC-14xx corpus family) with
 * the newer single-family shape of build-census-v1-mi_setaside_marihuana-set.mjs.
 *
 * FOUR THINGS ABOUT THIS FORM SHAPED THE IMPLEMENTATION.
 *
 * First, the widget NAMES lie, exactly as they did on CC-1201. `User.Title` is
 * the NAME OF PETITIONER line; `User.Officer` is the STREET ADDRESS OF COURT
 * line; `User.PetitionerName` is the petitioner's full name AT THE TIME OF
 * ARREST, which is not the name the platform holds. Every caption in this
 * dictionary is read off the page at recorded coordinates and the build
 * refuses on drift; every name-channel binding that would have written the
 * wrong fact is refused by role.
 *
 * Second, `User.City` is the CITY OR COUNTY line of the circuit court caption
 * — the filing court's venue — but the shared field-semantics name channel
 * binds a field named "City" to participant.city, and an explicit mapping that
 * conflicts with the name channel is refused by design. The platform therefore
 * CANNOT write the venue through the shared finalizer, the line is declared
 * required-before-filing with the reason stated, and no matter.* fact is held
 * in this family's fixtures — a packet must not claim to hold a value it can
 * put nowhere. Recorded in build-findings as a field-semantics fidelity note.
 *
 * Third, two checkbox names carry TWO boxes each: `User.Check0` is the
 * acquitted / nolle-or-dismissed pair, `User.Check5` is the
 * warrant-attached / warrant-not-available pair. Those rows are keyed by name
 * plus measured coordinate, the CC-1201 lesson.
 *
 * Fourth, the signing block prints paired [ ] PETITIONER / [ ] ATTORNEY boxes
 * on four lines. This packet is prepared for the petitioner to file without
 * counsel, so the four PETITIONER boxes are the route's own election — marked
 * after flattening with two diagonals struck inside the court's own box, each
 * mark read back out of the output bytes as painted paths inside its measured
 * box — and the four ATTORNEY boxes are refused as a branch this route does
 * not use.
 *
 * Rasterization goes through scripts/raster/pdf-page-raster.mjs. Never Poppler.
 * A built family is a built family: not verified, not approved, not sellable,
 * and this builder issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines, extractPageGeometry } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm, PARTICIPANT_INK, SELECTION_INSET, SELECTION_LINE_WIDTH } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { createTokenSplitter, fitsByFontMetrics } from "./rcap-custom-pleading/split-token.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const FAMILY_ID = "va_exp_nonconviction-set";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const OUT = "data/rcap-all50/overlays/census-v1/va/va-exp-nonconviction-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-va_exp_nonconviction-set.mjs";

const ROUTE = Object.freeze({
  jurisdiction: "VA",
  routeKey: "obligation:track-only:VA:va_exp_nonconviction",
  routeSelectionId: "va-exp-nonconviction-cc-1473-complete-set",
  legalName: "Petition for Expungement of Police and Court Records of a Non-Conviction, Va. Code § 19.2-392.2(A)",
  routeName: "expunging the police and court records of a charge that ended without a conviction, under Va. Code § 19.2-392.2(A)",
  statute: "Va. Code § 19.2-392.2(A)",
  officialForm: "CC-1473",
  assignedOfficialForm: "CC-1473",
  formMatchesAssignment: true
});

// The MASTER_QUEUE row's own binding, asserted against the committed index and
// the mounted bytes so three records agree before anything is rendered.
const PINNED_SHA256 = "6176c2f55bdb320682acecf0a79931bd5e496c4c93b5696645d4ef447fa67219";

const FORM_TITLE = "Petition for Expungement Filed in a Circuit Court - Acquittal/Dismissal";

const COMPONENTS = [
  "primary_filing",
  "commonwealth_service_and_stipulation_request",
  "ccre_forwarding_request",
  "records_checklist",
  "filing_instructions"
];

const COMPOSED_TITLES = {
  commonwealth_service_and_stipulation_request: "Copy for the Attorney for the Commonwealth, and Request for the Commonwealth's Position",
  ccre_forwarding_request: "Request to the Central Criminal Records Exchange to Forward a Criminal History Record",
  records_checklist: "Records Checklist for this Petition",
  filing_instructions: "Filing Instructions"
};

function corpusRoot() {
  const configured = process.env.MASTER_LIBRARY_SOURCE_DIR
    ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";
  assert.ok(fs.existsSync(configured), `the Master Library is not mounted at ${configured}`);
  return configured;
}

const WRITE = (fact) => ({ policy: "write", fact });
const SUPPLY = (what) => ({ policy: "supply", what });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const ELECTION = (why) => ({ policy: "election", why });
const SELECT = (why) => ({ policy: "select", routeReason: why });
const OFFROUTE = (why) => ({ policy: "offroute", routeReason: why });

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const S = {
  CAPTION: "Caption",
  BASIS: "Part 1 - basis of the petition",
  FACTS: "Part 2 - facts of the charge",
  SIGN: "Signature block",
  CLERK: "Clerk's certification",
  CHECKLIST: "Checklist for petitioner (page 2)",
  VIEWER: "Viewer control"
};

/*
 * Every AcroForm field of CC-1473 — 40 fields, 42 widgets. The dictionary KEY
 * is the widget name, or name@coordinate where one name carries two boxes.
 * `caption` is the text the court prints for the blank, re-read from the
 * binary at `captionAt` before anything renders; the build refuses on drift.
 */
const FORM_FIELDS = {
  "ResetButton": { section: S.VIEWER, caption: null, captionAt: null, label: "Reset this form (viewer control)", ...OFFROUTE("a viewer control the reader clicks, never a filing fact") },

  /* --- caption ----------------------------------------------------------- */
  "User.CaseNumber": {
    section: S.CAPTION, caption: "Case No.", captionAt: { page: 1, y: 738 },
    label: "Case Number of this petition (the circuit court clerk assigns it at filing)",
    ...PROTECT(COURT_OWNED, "the circuit court clerk assigns the civil case number when the petition is filed")
  },
  "User.City": {
    section: S.CAPTION, caption: "CITY OR COUNTY", captionAt: { page: 1, y: 668 },
    label: "City or county of the circuit court where this petition is filed",
    ...SUPPLY("the city or county of the circuit court where you are filing — the court in the county or city in which the charge was disposed of. The shared field semantics binds a field named 'City' to the participant's own city, so the platform cannot write the court's venue here; see build-findings")
  },
  "User.Officer": {
    section: S.CAPTION, caption: "STREET ADDRESS OF COURT", captionAt: { page: 1, y: 641 },
    label: "Street address of the court",
    ...SUPPLY("the street address of that circuit court — the clerk's office can give it to you")
  },
  "User.Title": {
    section: S.CAPTION, caption: "NAME OF PETITIONER", captionAt: { page: 1, y: 613 },
    label: "Name of Petitioner in the style of the case",
    ...WRITE("participant.full_legal_name")
  },

  /* --- part 1: basis ------------------------------------------------------ */
  "User.Check0@p1y563": {
    field: "User.Check0", at: { page: 1, y: 563.2, x: 89.6 },
    section: S.BASIS, selection: true, caption: "has been acquitted of the charge", captionAt: { page: 1, y: 567 },
    label: "I have been acquitted of the charge (check one) (selection)",
    ...ELECTION("how your charge ended — acquittal, or nolle prosequi / dismissal — is a fact about your own court record, and the form says CHECK ONE; tick the one your disposition paperwork shows")
  },
  "User.Check0@p1y552": {
    field: "User.Check0", at: { page: 1, y: 551.7, x: 89.9 },
    section: S.BASIS, selection: true, caption: "a nolle prosequi of the charge has been taken or the charge has been otherwise dismissed", captionAt: { page: 1, y: 555 },
    label: "A nolle prosequi has been taken or the charge was otherwise dismissed (check one) (selection)",
    ...ELECTION("how your charge ended — acquittal, or nolle prosequi / dismissal — is a fact about your own court record, and the form says CHECK ONE; tick the one your disposition paperwork shows")
  },

  /* --- part 2: facts of the charge ---------------------------------------- */
  "User.DOB": {
    section: S.FACTS, caption: "Petitioner's date of birth is", captionAt: { page: 1, y: 495 },
    label: "Petitioner's date of birth",
    ...WRITE("participant.date_of_birth")
  },
  "User.PetitionerName": {
    section: S.FACTS, caption: "Petitioner's full name at the time of arrest", captionAt: { page: 1, y: 478 },
    label: "My full name when I was arrested on this charge",
    ...SUPPLY("the full name you were arrested under, exactly as it appears on the arrest record — even if it is the same name you go by now, and especially if it is not")
  },
  "User.SpecificCharge": {
    section: S.FACTS, caption: "Specific charge(s) to be expunged", captionAt: { page: 1, y: 461 },
    label: "Specific charge(s) to be expunged",
    ...SUPPLY("the specific charge or charges you are asking the court to expunge, worded exactly as they appear on your court record")
  },
  "User.CaseNumbers": {
    section: S.FACTS, caption: "If matter was heard on appeal from General District Court, list applicable General District Court case number(s)", captionAt: { page: 1, y: 443 },
    label: "General District Court case number(s), if the matter was heard on appeal",
    ...SUPPLY("the General District Court case number or numbers — only if the matter was heard in circuit court on appeal from a General District Court")
  },
  "User.Check5@p1y407": {
    field: "User.Check5", at: { page: 1, y: 407.0, x: 89.9 },
    section: S.FACTS, selection: true, caption: "A copy of the warrant or indictment is attached to this petition", captionAt: { page: 1, y: 410 },
    label: "A copy of the warrant or indictment is attached to this petition (selection)",
    ...ELECTION("whether you can attach the charging document is a fact about your own records; tick this if the copy really is attached")
  },
  "User.UnderlyingCaseNumbers": {
    section: S.FACTS, caption: "Underlying Case No.(s)", captionAt: { page: 1, y: 410 },
    label: "Underlying case number(s) of the attached warrant or indictment",
    ...SUPPLY("the case number or numbers on the attached warrant or indictment — only if you ticked the box saying the copy is attached")
  },
  "User.DateOfArrest": {
    section: S.FACTS, caption: "Date of arrest", captionAt: { page: 1, y: 394 },
    label: "Date of arrest for the charge to be expunged",
    ...SUPPLY("the date you were arrested on this charge, from your arrest or court record")
  },
  "User.ArrestingAgency": {
    section: S.FACTS, caption: "Name of arresting agency", captionAt: { page: 1, y: 394 },
    label: "Name of the arresting agency for the charge to be expunged",
    ...SUPPLY("the name of the police or sheriff's department that arrested you on this charge")
  },
  "User.Check5@p1y377": {
    field: "User.Check5", at: { page: 1, y: 377.4, x: 89.9 },
    section: S.FACTS, selection: true, caption: "A copy of the warrant or indictment", captionAt: { page: 1, y: 380 },
    label: "The copy of the warrant or indictment is not reasonably available (selection)",
    ...ELECTION("whether the charging document can reasonably be found is a fact about your own records; tick this only if it cannot, and say why on the line below")
  },
  "User.Check7": {
    section: S.FACTS, selection: true, caption: "date of arrest or name of arresting agency is not reasonably available", captionAt: { page: 1, y: 380 },
    label: "The date of arrest or the arresting agency is not reasonably available (selection)",
    ...ELECTION("whether that information can reasonably be found is a fact about your own records; tick this only if it cannot, and say why on the line below")
  },
  "User.Because": {
    section: S.FACTS, caption: "because (state reason this information is not available)", captionAt: { page: 1, y: 369 },
    label: "Why the warrant, indictment or arrest information is not reasonably available",
    ...SUPPLY("why the warrant or indictment, the date of arrest, or the arresting agency cannot reasonably be found — only if you ticked one of the not-reasonably-available boxes. Say what you tried; do not guess")
  },
  "User.DateOfFinalDisposition1": {
    section: S.FACTS, caption: "Date(s) of final disposition of charge(s)", captionAt: { page: 1, y: 334 },
    label: "Date(s) of final disposition of the charge(s)",
    ...SUPPLY("the date the charge was finally disposed of — acquitted, nolle prossed or dismissed — from your court record")
  },
  "User.DisposingCourt1": {
    section: S.FACTS, caption: "Court disposing of charge(s)", captionAt: { page: 1, y: 334 },
    label: "Court disposing of the charge(s)",
    ...SUPPLY("the court that disposed of the charge, as named on your court record")
  },
  "User.DateOfFinalDisposition2": {
    section: S.FACTS, caption: "Date(s) of final disposition of charge(s)", captionAt: { page: 1, y: 334 },
    label: "Date(s) of final disposition — continuation line",
    ...SUPPLY("more disposition dates, if the charges were disposed of on more than one date")
  },
  "User.DisposingCourt2": {
    section: S.FACTS, caption: "Court disposing of charge(s)", captionAt: { page: 1, y: 334 },
    label: "Court disposing of the charge(s) — continuation line",
    ...SUPPLY("more disposing courts, if more than one court disposed of the charges")
  },

  /* --- signature block ----------------------------------------------------- */
  "User.Date": {
    section: S.SIGN, caption: "DATE", captionAt: { page: 1, y: 240 },
    label: "Date of signature",
    ...PROTECT(SIGNATURE, "you date the petition when you sign it; a date written in advance would be false")
  },
  "User.CheckPetitioner": {
    section: S.SIGN, selection: true, caption: "SIGNATURE OF", captionAt: { page: 1, y: 240 },
    label: "The petition is signed by the Petitioner (selection)",
    ...SELECT("this packet is prepared for the petitioner to file without counsel, so the petitioner signs it")
  },
  "User.CheckAttorney": {
    section: S.SIGN, selection: true, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 1, y: 240 },
    label: "The petition is signed by the attorney for the petitioner (selection)",
    ...OFFROUTE("attorney-only; no representation fact is held for this participant")
  },
  "User.PrintName": {
    section: S.SIGN, caption: "PRINT NAME", captionAt: { page: 1, y: 207 },
    label: "Printed name of the petitioner",
    ...WRITE("participant.full_legal_name")
  },
  "User.AddressOf": {
    section: S.SIGN, caption: "ADDRESS OF", captionAt: { page: 1, y: 181 },
    label: "Address of the petitioner",
    ...WRITE("participant.street_address")
  },
  "User.CheckPetitionerContact": {
    section: S.SIGN, selection: true, caption: "ADDRESS OF [ ] PETITIONER", captionAt: { page: 1, y: 181 },
    label: "The address given is the Petitioner's (selection)",
    ...SELECT("the address in this block is the petitioner's, because this packet is filed without counsel")
  },
  "User.CheckAttorneyContact": {
    section: S.SIGN, selection: true, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 1, y: 181 },
    label: "The address given is the attorney's (selection)",
    ...OFFROUTE("attorney-only; no representation fact is held for this participant")
  },
  "User.PetetionerPhoneNumber": {
    section: S.SIGN, caption: "TELEPHONE NUMBER OF", captionAt: { page: 1, y: 154 },
    label: "Telephone number of the petitioner",
    ...WRITE("participant.phone")
  },
  "User.CheckPetitionerPhone": {
    section: S.SIGN, selection: true, caption: "TELEPHONE NUMBER OF [ ] PETITIONER", captionAt: { page: 1, y: 154 },
    label: "The telephone number given is the Petitioner's (selection)",
    ...SELECT("the telephone number in this block is the petitioner's, because this packet is filed without counsel")
  },
  "User.CheckAttorneyPhone": {
    section: S.SIGN, selection: true, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 1, y: 154 },
    label: "The telephone number given is the attorney's (selection)",
    ...OFFROUTE("attorney-only; no representation fact is held for this participant")
  },
  "User.PetetionerEmail": {
    section: S.SIGN, caption: "EMAIL ADDRESS OF", captionAt: { page: 1, y: 128 },
    label: "Email address of the petitioner",
    ...WRITE("participant.email")
  },
  "User.CheckPetitionerEmail": {
    section: S.SIGN, selection: true, caption: "EMAIL ADDRESS OF [ ] PETITIONER", captionAt: { page: 1, y: 128 },
    label: "The email address given is the Petitioner's (selection)",
    ...SELECT("the email address in this block is the petitioner's, because this packet is filed without counsel")
  },
  "User.CheckAttorneyEmail": {
    section: S.SIGN, selection: true, caption: "ATTORNEY FOR PETITIONER", captionAt: { page: 1, y: 128 },
    label: "The email address given is the attorney's (selection)",
    ...OFFROUTE("attorney-only; no representation fact is held for this participant")
  },
  "User.PetetionerVSB": {
    section: S.SIGN, caption: "VSB NUMBER OF ATTORNEY FOR PETITIONER (IF APPLICABLE)", captionAt: { page: 1, y: 102 },
    label: "VSB number of the attorney for the petitioner",
    ...OFFROUTE("attorney-only; no representation fact is held for this participant")
  },

  /* --- clerk's certification ------------------------------------------------ */
  "User.CBCertify": {
    section: S.CLERK, selection: true, caption: "I certify that I provided the petitioner a certified copy of this petition", captionAt: { page: 1, y: 82 },
    label: "Clerk's certification that the petitioner was provided a certified copy (selection)",
    ...PROTECT(COURT_OWNED, "this is the clerk's own certification, made by the clerk after filing; it is not the petitioner's to complete")
  },
  "User.HearDateTime": {
    section: S.CLERK, caption: "Hearing date and time", captionAt: { page: 1, y: 82 },
    label: "Hearing date and time set by the clerk",
    ...PROTECT(COURT_OWNED, "the court sets the hearing and the clerk records it; this build never writes a court date")
  },
  "User.EndDate": {
    section: S.CLERK, caption: "DATE", captionAt: { page: 1, y: 41 },
    label: "Date of the clerk's certification",
    ...PROTECT(COURT_OWNED, "the clerk dates their own certification; it is not the petitioner's to complete")
  },

  /* --- page 2: the form's own checklist for the petitioner ------------------- */
  "User.CB1": {
    section: S.CHECKLIST, selection: true, caption: "File completed PETITION FOR EXPUNGEMENT", captionAt: { page: 2, y: 705 },
    label: "Checklist: I filed the completed petition in the circuit court where the charge was disposed of (selection)",
    ...ELECTION("the form's own checklist; tick it as you complete the step — filing in the circuit court of the county or city in which the charge was disposed of, with circuit court form CC-1416 if the clerk requires it")
  },
  "User.CB2": {
    section: S.CHECKLIST, selection: true, caption: "Request that the Central Criminal Records Exchange electronically forward a copy of your Virginia criminal history", captionAt: { page: 2, y: 669 },
    label: "Checklist: I asked the Central Criminal Records Exchange to forward my record to the court (selection)",
    ...ELECTION("the form's own checklist; tick it as you complete the step — this packet includes a page for making that request")
  },
  "User.CB3": {
    section: S.CHECKLIST, selection: true, caption: "Have a copy of this petition served on the Commonwealth", captionAt: { page: 2, y: 643 },
    label: "Checklist: a copy of the petition was served on the Commonwealth's Attorney (selection)",
    ...ELECTION("the form's own checklist; tick it as you complete the step — service happens after filing, so it cannot be pre-ticked")
  }
};

/* ---- fixtures --------------------------------------------------------------- *
 * Two participants. The boundary one carries a long hyphenated name with an
 * apostrophe, a long one-line mailing address, a long email and a phone
 * extension, because a value that fits the box is not evidence that every value
 * does. CC-1473 prints ONE address line, so participant.street_address holds
 * the whole mailing address (the mi_setaside_marihuana-set precedent for a
 * single-line address box).
 *
 * No matter.* fact is held: the one place a court fact could go on this form —
 * the CITY OR COUNTY venue line — cannot bind through the shared semantics
 * (see the header), and a packet must not claim to hold a value it can put
 * nowhere. No signature, no dates of signature, no docket or case number.
 */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Maple Street, Richmond, VA 23219",
    "participant.phone": "804-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B, Virginia Beach, Virginia 23456-2214",
    "participant.phone": "(757) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- source binding ----------------------------------------------------------- */
function resolveSources() {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const all = index.entries ?? [];
  const root = corpusRoot();
  const resolved = [];
  const failures = [];
  for (const formNumber of [ROUTE.officialForm]) {
    const entry = all.find((e) => e.state === "VA" && e.formNumber === formNumber && e.assetClass === "FORM");
    if (!entry) { failures.push({ sourceId: `official-form:${formNumber}`, why: "no entry for this form number in the committed corpus index" }); continue; }
    const rel = entry.path;
    const abs = path.resolve(ROOT, root, rel);
    if (!fs.existsSync(abs)) { failures.push({ sourceId: `official-form:${formNumber}`, pathInArchive: rel, why: `the indexed path does not exist on disk: ${rel}` }); continue; }
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    if (String(entry.sha256 ?? "") !== sha256) {
      failures.push({ sourceId: `official-form:${formNumber}`, pathInArchive: rel, why: `SHA-256 drift: the committed index says ${entry.sha256}, the mounted corpus holds ${sha256}` });
      continue;
    }
    if (sha256 !== PINNED_SHA256) {
      failures.push({ sourceId: `official-form:${formNumber}`, pathInArchive: rel, why: `SHA-256 drift against the MASTER_QUEUE binding: the queue pins ${PINNED_SHA256}, the corpus holds ${sha256}` });
      continue;
    }
    resolved.push({
      formNumber, sourceId: `official-form:${formNumber}`, pathInArchive: rel,
      title: FORM_TITLE, instrumentKind: "primary_filing",
      revision: entry.revision ?? null, sha256, byteLength: bytes.length, bytes,
      acroFieldCount: entry.acroFieldCount ?? null, pageCount: entry.pageCount ?? null
    });
  }
  return { resolved, failures };
}

/* ---- census -------------------------------------------------------------------- */
const flat = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function normalizeRect(r) {
  const x = Math.min(r.x, r.x + r.width);
  const y = Math.min(r.y, r.y + r.height);
  return {
    x: Number(x.toFixed(2)), y: Number(y.toFixed(2)),
    width: Number(Math.abs(r.width).toFixed(2)), height: Number(Math.abs(r.height).toFixed(2))
  };
}

async function censusOf(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text }))
  }));

  // Index the dictionary by widget name so a name carrying two boxes can be
  // matched to the right one by measured coordinate.
  const byName = new Map();
  for (const [key, entry] of Object.entries(FORM_FIELDS)) {
    const fieldName = entry.field ?? key;
    if (!byName.has(fieldName)) byName.set(fieldName, []);
    byName.get(fieldName).push({ key, entry });
  }

  const rows = [];
  const unmapped = [];
  const usedKeys = new Set();
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const candidates = byName.get(name) ?? [];
    for (const w of field.acroField.getWidgets()) {
      const raw = w.getRectangle();
      const rect = normalizeRect(raw);
      const ref = w.P();
      let pageIndex = pages.findIndex((p) => p.ref === ref);
      if (pageIndex < 0) pageIndex = 0;
      const page = pageIndex + 1;
      let chosen = null;
      if (candidates.length === 1) chosen = candidates[0];
      else {
        chosen = candidates.find((c) => c.entry.at && c.entry.at.page === page
          && Math.abs(c.entry.at.y - rect.y) < 0.6 && Math.abs(c.entry.at.x - rect.x) < 0.6) ?? null;
      }
      if (!chosen || usedKeys.has(chosen.key)) {
        unmapped.push({ field: name, page, rect, why: chosen ? "the dictionary key it matched was already used by another widget" : "no dictionary entry matches this widget's name and coordinate" });
        continue;
      }
      usedKeys.add(chosen.key);
      const entry = chosen.entry;
      let sourceValue = null;
      try {
        if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
        else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
      } catch { sourceValue = null; }
      rows.push({
        key: chosen.key, name, page, rect, sourceValue,
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary_and_normalized",
        type: field.constructor.name.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
        isSelectionControl: entry.selection === true || field.constructor.name === "PDFCheckBox",
        multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
        maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
        section: entry.section, effectiveLabel: entry.label,
        caption: entry.caption, captionAt: entry.captionAt,
        policy: entry.policy, fact: entry.fact ?? null,
        refusalClass: entry.refusalClass ?? null, what: entry.what ?? null,
        why: entry.why ?? null, routeReason: entry.routeReason ?? null
      });
    }
  }

  const missingKeys = Object.keys(FORM_FIELDS).filter((k) => !usedKeys.has(k));

  // Every recorded caption must still be printed where the dictionary says.
  const captionDrift = [];
  for (const r of rows) {
    if (!r.captionAt) continue;
    const lines = pageText.find((p) => p.page === r.captionAt.page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - r.captionAt.y) <= 2);
    const needle = flat(r.caption);
    const found = needle.length > 0 && near.some((l) => flat(l.text).includes(needle));
    if (!found) captionDrift.push({ key: r.key, page: r.captionAt.page, y: r.captionAt.y, caption: r.caption, linesThere: near.map((l) => l.text).slice(0, 2) });
  }
  return { rows, unmapped, missingKeys, captionDrift, pageText, pageCount: pages.length };
}

/* ---- render the official form --------------------------------------------------- */
async function renderPrimary(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  // The finalizer works by field NAME. A name hosting two boxes hosts only
  // elections on this form, and the build refuses if that stops being true.
  const byName = new Map();
  for (const r of census.rows) {
    const existing = byName.get(r.name);
    if (!existing) { byName.set(r.name, r); continue; }
    assert.ok(existing.policy !== "write" && r.policy !== "write",
      `widget name ${r.name} hosts several boxes and one of them is a write; a name-keyed fill cannot address them separately`);
  }
  const unique = [...byName.values()];
  const writable = unique.filter((r) => r.policy === "write");
  const explicitMappings = Object.fromEntries(writable.map((r) => [r.name, r.fact]));
  const unwritableFields = unique.filter((r) => r.policy !== "write").map((r) => ({ field: r.name }));

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: unique.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.effectiveLabel,
      widgets: [{ page: r.page, rect: r.rect }],
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts, explicitMappings, unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    title: FORM_TITLE
  });
  const writtenNames = new Set(report.written.map((w) => w.field));
  for (const r of writable) {
    assert.ok(writtenNames.has(r.name),
      `${source.formNumber} ${fixtureName}: ${r.key} is mapped as a write and the finalizer did not write it: ${JSON.stringify(report.refused.filter((x) => x.field === r.name))}`);
  }
  return { bytes, report, writable };
}

/* ---- route selections, marked on the court's own boxes --------------------------- */
async function markRouteSelections(flattenedBytes, selections) {
  if (selections.length === 0) return { bytes: Buffer.from(flattenedBytes), marks: [] };
  const pdf = await PDFDocument.load(flattenedBytes, { ignoreEncryption: true, updateMetadata: false });
  const pages = pdf.getPages();
  const marks = [];
  for (const s of selections) {
    const page = pages[s.page - 1];
    assert.ok(page, `route selection ${s.key} names page ${s.page}, which is not in the document`);
    const { x, y, width, height } = s.rect;
    const inset = SELECTION_INSET;
    assert.ok(width > inset * 2 + 1 && height > inset * 2 + 1,
      `route selection ${s.key} is ${width}x${height}pt, too small to mark inside the court's own stroke`);
    const a = { x: x + inset, y: y + inset };
    const b = { x: x + width - inset, y: y + height - inset };
    page.drawLine({ start: a, end: b, thickness: SELECTION_LINE_WIDTH, color: PARTICIPANT_INK });
    page.drawLine({ start: { x: a.x, y: b.y }, end: { x: b.x, y: a.y }, thickness: SELECTION_LINE_WIDTH, color: PARTICIPANT_INK });
    marks.push({
      key: s.key, field: s.name, page: s.page, box: { x0: x, y0: y, x1: x + width, y1: y + height },
      inset, lineWidth: SELECTION_LINE_WIDTH, mark: "two_diagonal_strokes_inset",
      drewANewBox: false, redrewTheCourtsBox: false, routeReason: s.routeReason
    });
  }
  const bytes = await pdf.save({ useObjectStreams: false, updateMetadata: false });
  return { bytes: Buffer.from(bytes), marks };
}

/* Painted paths, so a claimed mark can be read back out of the bytes. */
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
  const key = (r) => [r.page, r.operator, r.paintedBy, r.x, r.y, r.width, r.height].join("|");
  const counts = new Map();
  for (const r of before) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1);
  return after.filter((r) => {
    const remaining = counts.get(key(r)) ?? 0;
    if (remaining <= 0) return true;
    counts.set(key(r), remaining - 1);
    return false;
  });
}

function pathInsideBox(row, box) {
  const pad = 0.75;
  return row.x >= box.x0 - pad && row.x + Math.abs(row.width) <= box.x1 + pad
    && row.y >= box.y0 - pad && row.y + Math.abs(row.height) <= box.y1 + pad;
}

/* ---- byte proof of the primary filing --------------------------------------------- */
async function byteProof(source, census, primaryFile, report, fixtureName, marks, preMarkBytes, postMarkBytes) {
  const widgets = await flattenedWidgets(path.join(ROOT, primaryFile));
  const written = new Map(report.written.map((w) => [w.field, w]));
  const actualWrites = [];
  let glyphs = 0;
  const refusedFieldsWithInk = [];
  for (const r of census.rows) {
    const drawn = drawnAt(widgets, { page: r.page, rect: r.rect });
    const text = drawn.map((d) => d.text).filter(Boolean);
    const ink = text.join("").trim();
    if (r.policy === "write" && written.has(r.name)) {
      glyphs += ink.length;
      actualWrites.push({
        field: r.key, widgetName: r.name, factId: r.fact, page: r.page, rect: r.rect,
        printedCaption: r.caption, drawnText: text,
        expected: FIXTURES[fixtureName][r.fact] ?? null
      });
      continue;
    }
    if (ink.length === 0) continue;
    if (r.sourceValue !== null && r.sourceValue !== undefined) continue;
    refusedFieldsWithInk.push({ fieldId: r.key, page: r.page, drawnText: text });
  }
  // Ink that landed nowhere the map measured, counted rather than assumed zero.
  const measured = census.rows.map((r) => ({ page: r.page, rect: r.rect }));
  let outside = 0;
  for (const w of widgets) {
    const at = measured.some((m) => m.page === w.page
      && Math.abs(w.x - m.rect.x) <= 2 && Math.abs(w.y - m.rect.y) <= 2);
    if (!at) outside += String(w.text ?? "").replace(/\s+/g, "").length;
  }
  // Every route mark must be readable in the bytes and must be inside its box.
  const added = marks.length > 0 ? await addedPaintedPaths(preMarkBytes, postMarkBytes) : [];
  const markProof = marks.map((m) => {
    const inside = added.filter((row) => row.page === m.page && pathInsideBox(row, m.box));
    return { ...m, paintedStrokesInsideTheBox: inside.length };
  });
  const strayMarkStrokes = added.filter((row) => !marks.some((m) => m.page === row.page && pathInsideBox(row, m.box))).length;
  return { actualWrites, glyphs, refusedFieldsWithInk, appearances: widgets.length, outside, markProof, strayMarkStrokes };
}

/* ---- composed companion documents --------------------------------------------------- *
 * The route names five components and the official form is only one of them.
 * Nothing here states a fee or a deadline, and no manner-of-service rule is
 * invented: CC-1473's own checklist establishes THAT a copy must be served on
 * the Commonwealth's Attorney and THAT the CCRE must be asked to forward the
 * record; it establishes no amount, no day-count and no service mechanics, so
 * those are delegated to the circuit court clerk by name.
 */
function composedBody(componentId, facts) {
  const name = facts["participant.full_legal_name"];
  const dob = facts["participant.date_of_birth"];
  const L = [];
  L.push(COMPOSED_TITLES[componentId].toUpperCase(), "");
  L.push(`Petitioner: ${name}`);
  L.push(`Petition: CC-1473 — ${FORM_TITLE}`);
  L.push(`Statutory route: ${ROUTE.statute}`);
  L.push("CIRCUIT COURT (copy it from the petition's caption once you have written it there)");
  L.push("....................................................................................", "");
  if (componentId === "commonwealth_service_and_stipulation_request") {
    L.push("To: the Attorney for the Commonwealth for the county or city where this petition is filed.", "");
    L.push(`Enclosed is a copy of the petition for expungement filed by ${name}. The petition's own checklist (CC-1473, page 2) requires that a copy of the petition be served on the Commonwealth's Attorney in the county or city in which the petition is filed. This is that copy.`, "");
    L.push("The petitioner asks the Attorney for the Commonwealth to state, in writing and to the court, whether the Commonwealth objects to the expungement sought by the enclosed petition. A statement that the Commonwealth does not object is not required for the petition to proceed, and nothing in this request asks the Attorney for the Commonwealth to agree to anything.", "");
    L.push("The petition itself does not say how service must be made, and neither does this page. Ask the clerk of the circuit court where you file how the copy must be served, and use that method. The petitioner is not represented by counsel; correspondence about this petition should go to the address printed on the petition's signature block.", "");
    L.push("NAME AND MAILING ADDRESS OF THE ATTORNEY FOR THE COMMONWEALTH");
    L.push("(the petitioner writes it here before service; the circuit court clerk can provide it)");
    L.push("....................................................................................", "");
    L.push("DATE OF SERVICE OF THE COPY ......................................................");
    L.push("SIGNATURE OF PETITIONER ..........................................................", "");
    L.push("This page is not proof of service and does not say that anything has been served. It is completed and signed by the petitioner when the copy actually goes out, in the manner the clerk directs.");
  } else if (componentId === "ccre_forwarding_request") {
    L.push("To: the Central Criminal Records Exchange, Virginia Department of State Police.", "");
    L.push(`The petition's own checklist (CC-1473, page 2) requires the petitioner to request that the Central Criminal Records Exchange electronically forward a copy of the petitioner's Virginia criminal history record to the circuit court where the petition for expungement was filed. This page is that request.`, "");
    L.push(`Please forward the Virginia criminal history record of ${name}, date of birth ${dob}, to the circuit court named above, for the expungement petition identified above.`, "");
    L.push("The form on which the Department of State Police accepts this request, the identification it requires, and any charge for it are not stated on this page, because the petition does not establish them. The Department of State Police publishes the current procedure; ask the circuit court clerk if you cannot find it.", "");
    L.push("DATE OF THIS REQUEST .............................................................");
    L.push("SIGNATURE OF PETITIONER ..........................................................", "");
    L.push("File the petition first. The checklist words this request around the court where the petition WAS filed, so it is made after filing, not before.");
  } else if (componentId === "records_checklist") {
    L.push("The petition asks for facts that live on your own court and arrest records. Gather these before you fill it in, and keep them together with the packet.", "");
    L.push("[ ] The specific charge or charges to be expunged, worded exactly as your court record words them.");
    L.push("[ ] The disposition of each charge: acquitted, nolle prosequi, or otherwise dismissed - the petition makes you check exactly one basis.");
    L.push("[ ] The date or dates of final disposition, and the court that disposed of the charge or charges.");
    L.push("[ ] The date of arrest, and the name of the agency that arrested you.");
    L.push("[ ] Your full name at the time of arrest, as the arrest record states it.");
    L.push("[ ] A copy of the warrant or indictment, and its underlying case number or numbers - the petition asks whether the copy is attached.");
    L.push("[ ] If the matter reached circuit court on appeal from a General District Court: the General District Court case number or numbers.");
    L.push("[ ] The city or county of the circuit court where you will file, and that court's street address - the clerk's office can confirm both.");
    L.push("[ ] Circuit court form CC-1416, COVER SHEET FOR FILING CIVIL ACTIONS, completed - the checklist says to include it if the clerk of the court requires it. Ask the clerk.", "");
    L.push("If a record cannot be found, the petition has boxes for that: they ask you to say why the information is not reasonably available. Say what you tried. Do not guess a date.");
  } else {
    L.push(`This packet is prepared for ${ROUTE.routeName}.`, "");
    L.push("WHERE THIS GOES", "");
    L.push("File the petition with the CIRCUIT COURT of the county or city in which the charge was disposed of - the petition's own checklist says so. Write that court's city or county and street address into the petition's caption; the clerk's office can confirm both. If the clerk requires it, include a completed COVER SHEET FOR FILING CIVIL ACTIONS, circuit court form CC-1416.", "");
    L.push("WHAT YOU DO, IN ORDER", "");
    L.push("1. Complete every item this packet's participant instructions list. Each one names the page and the words printed beside the blank.");
    L.push("2. Check exactly one basis box - acquitted, or nolle prosequi / otherwise dismissed - to match how your charge actually ended.");
    L.push("3. Sign and date the petition yourself, and mark nothing in the clerk's certification block at the foot of page 1: that block is the clerk's.");
    L.push("4. File the petition with the circuit court clerk.");
    L.push("5. Ask the Central Criminal Records Exchange to forward your Virginia criminal history record to that court, using the page in this packet headed for that purpose.");
    L.push("6. Have a copy of the petition served on the Attorney for the Commonwealth for that county or city, using the page in this packet headed for that purpose, in the manner the clerk directs.", "");
    L.push("TWO THINGS THIS PACKET DOES NOT TELL YOU", "");
    L.push("- The filing fee, and whether it can be waived. Ask the circuit court clerk. No amount is stated here because none is established by the petition, and an unsourced figure in a filing instruction is worse than no figure.");
    L.push("- How long you have, and exactly how service must be made. The petition sets no filing deadline and states no service mechanics; neither does this page. Ask the same clerk.", "");
    L.push("WHAT THIS PACKET IS NOT", "");
    L.push("This is a prepared set of an official Virginia circuit court form and companion pages. It is not legal advice, it is not filed for you, and it does not decide whether the court will grant expungement.");
  }
  L.push("", `Route: ${ROUTE.routeKey}`);
  return L.join("\n");
}

function sanitizePdfText(text) {
  return text.replaceAll(" ", " ").replaceAll("‑", "-").replaceAll("–", "-")
    .replaceAll("—", "-").replaceAll("−", "-").replaceAll("’", "'")
    .replaceAll("‘", "'").replaceAll("“", '"').replaceAll("”", '"')
    .replaceAll("§", "Sec. ").replaceAll("…", "...").replaceAll("¼", " 1/4");
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
  /* The same 45 rows a page this composer has always drawn: the old loop broke
   * when the next baseline fell below the bottom margin, and this is that count
   * stated once instead of rediscovered per page. */
  const rowsPerPage = Math.floor((height - 2 * margin) / lineHeight) + 1;
  /* The one separator-aware splitter, shared, in place of the private
   * character-accumulating copy this builder carried. */
  const splitToken = createTokenSplitter({ fits: fitsByFontMetrics(font, fontSize, maxWidth) });
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

  /* The route trailer is internal machine metadata rather than participant
   * text, and it must never be the only thing on a delivered page: this packet
   * ended on a sheet carrying "Route: obligation:track-only:VA:va_exp_nonconviction"
   * and nothing else. The layout is settled first so that page can be caught
   * while it is still a plan, and the block above it is pulled down to keep the
   * trailer company. This is the sole-occupant pull-down
   * scripts/build-census-v1-rcap-ok-custom-pleading.mjs already carries, moved
   * onto this composer's own row-by-row pagination rather than a new scheme:
   * where the rows fall is unchanged, blocks move whole or not at all, and a
   * move that would not fit is refused. */
  const TRAILER_LINE = /^Route: /;
  /* A HEADING AND THE PARAGRAPH IT INTRODUCES ARE ONE BLOCK.
   *
   * The pull-down above moves whole blocks, and a block was one source line, so
   * a heading and the paragraph under it were two blocks and only the lower one
   * moved. VF07 read the result off the delivered bytes: page 6 ended on the
   * heading "WHAT THIS PACKET IS NOT" with two inches of clear sheet under it
   * and nothing else, and page 7 - the last sheet the participant is handed -
   * opened on the two sentences that answer it with no heading above them. Four
   * row slots still stood free on page 6 and the moved block needed three. The
   * pull-down was right to fire; it moved the wrong half of the unit.
   *
   * A heading now carries the blank separator and the paragraph it introduces
   * with it, as one block, so the pair moves together or not at all. This is a
   * block boundary, not a pagination scheme: the rows are the same rows, wrapped
   * by the same rule, laid out by the same row-by-row loop onto the same 45-row
   * pages. Only what counts as one unit changed. */
  const HEADING_LINE = /^[A-Z][A-Z ,'()-]*$/;
  const source = sanitizePdfText(fullText).split("\n");
  const blocks = [];
  for (let i = 0; i < source.length; i++) {
    if (HEADING_LINE.test(source[i])) {
      const rows = wrap(source[i]);
      let j = i + 1;
      while (j < source.length && source[j] === "") rows.push(...wrap(source[j++]));
      if (j < source.length && !HEADING_LINE.test(source[j]) && !TRAILER_LINE.test(source[j])) rows.push(...wrap(source[j++]));
      blocks.push({ index: blocks.length, rows, trailer: false, heading: true });
      i = j - 1;
      continue;
    }
    blocks.push({ index: blocks.length, rows: wrap(source[i]), trailer: TRAILER_LINE.test(source[i]), heading: false });
  }
  const pages = [[]];
  for (const block of blocks) {
    let page = pages[pages.length - 1];
    /* A heading block that fits on a page is never split across a page break:
     * it moves whole to the next page or stays where it is. */
    if (block.heading && block.rows.length <= rowsPerPage && page.length + block.rows.length > rowsPerPage) {
      pages.push([]); page = pages[pages.length - 1];
    }
    for (const text of block.rows) {
      if (page.length === rowsPerPage) { pages.push([]); page = pages[pages.length - 1]; }
      page.push({ text, block: block.index, trailer: block.trailer });
    }
  }
  const soleOccupant = (rows) => rows.length > 0 && rows.every((r) => r.trailer || r.text === "");
  for (let guard = 0; guard < blocks.length && pages.length > 1 && soleOccupant(pages[pages.length - 1]); guard++) {
    const last = pages[pages.length - 1];
    const previous = pages[pages.length - 2];
    const moving = previous[previous.length - 1].block;
    const moved = [];
    while (previous.length > 0 && previous[previous.length - 1].block === moving) moved.unshift(previous.pop());
    if (moved.length === 0 || moved.length + last.length > rowsPerPage) { previous.push(...moved); break; }
    last.unshift(...moved);
    if (previous.length === 0) pages.splice(pages.length - 2, 1);
  }
  assert.equal(soleOccupant(pages[pages.length - 1]), false,
    `${title}: the delivered packet still ends on a page carrying only the route trailer`);
  /* Proof, not intention: every heading block that fits on a page was drawn on
   * one page, so no page can end on a heading whose paragraph opens the next. */
  for (const block of blocks) {
    if (!block.heading || block.rows.length > rowsPerPage) continue;
    const drawn = pages.flatMap((rows, index) => rows
      .filter((r) => r.block === block.index && r.text !== "").map(() => index));
    for (const index of drawn) {
      assert.equal(index, drawn[0],
        `${title}: a heading was split from the paragraph it introduces across a page break at ${JSON.stringify(block.rows[0].slice(0, 60))}`);
    }
  }

  for (const rows of pages) {
    const page = pdf.addPage([width, height]);
    let y = height - margin;
    for (const row of rows) {
      if (row.text) page.drawText(row.text, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }
  /* Nothing in this family's text is long enough to need chopping, and the
   * assertion says so rather than assuming it: a future route key with no
   * separator to break on fails the build instead of shipping unreadable. */
  assert.equal(splitToken.hardSplits, 0, `${title}: a token was hard-split with no separator to break on`);
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

/* The completion points each composed component carries, as map rows. */
function composedMap(componentId) {
  const base = (id, label) => ({
    field: `${componentId}.${id}`, fieldName: `${componentId}.${id}`, page: 1,
    printedLabel: label, printedLine: label,
    effectiveLabel: label, regionHeading: label, sectionHeading: null,
    rectBasis: "composed_document_authored_by_this_build"
  });
  const writes = [
    { ...base("petitioner_name", "Petitioner named on this page"), factId: "participant.full_legal_name", kind: "composed_text", document: componentId }
  ];
  if (componentId === "ccre_forwarding_request") {
    writes.push({ ...base("petitioner_dob", "Petitioner's date of birth, printed on this page"), factId: "participant.date_of_birth", kind: "composed_text", document: componentId });
  }
  const refusals = [
    {
      ...base("circuit_court", "Circuit Court named on this page"),
      reason: "the participant supplies this before filing: the circuit court of the county or city in which the charge was disposed of, copied from the petition's caption",
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${componentId} field circuit_court`, factId: null, routeDetermined: false,
      document: componentId,
      why: "the shared field semantics cannot write the venue onto the petition itself, so the platform does not claim it on the companion pages either; the participant copies the court they wrote in the petition's caption",
      participantMustSupply: "the circuit court's city or county, copied from the petition's caption once you have written it there"
    }
  ];
  if (componentId === "commonwealth_service_and_stipulation_request" || componentId === "ccre_forwarding_request") {
    refusals.push({
      ...base("signature", "Signature of the petitioner on this page"),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId,
      why: "the petitioner signs this page themselves when the request or copy actually goes out"
    });
  }
  if (componentId === "commonwealth_service_and_stipulation_request") {
    refusals.push({
      ...base("service_date", "Date of service of the copy"),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId,
      why: "a date written before the copy is actually served would be false"
    });
    refusals.push({
      ...base("commonwealth_attorney_address", "Name and mailing address of the Attorney for the Commonwealth"),
      reason: "the participant supplies this before filing: the name and mailing address of the Attorney for the Commonwealth for the county or city where the petition is filed",
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${componentId} field commonwealth_attorney_address`, factId: null, routeDetermined: false,
      document: componentId,
      why: "the platform holds no address for the Attorney for the Commonwealth and the participant writes it before service",
      participantMustSupply: "the name and mailing address of the Attorney for the Commonwealth for the county or city where you file — the circuit court clerk can give it to you"
    });
  }
  if (componentId === "ccre_forwarding_request") {
    refusals.push({
      ...base("request_date", "Date of the request to the Central Criminal Records Exchange"),
      reason: "signature or date field; never prefilled by this build",
      category: SIGNATURE, completenessClass: SIGNATURE, class: SIGNATURE,
      requiredBeforeFiling: false, document: componentId,
      why: "the request is made after the petition is filed, so its date is not known when the packet is built"
    });
  }
  return {
    formNumber: componentId, documentId: componentId, documentRole: componentId,
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "composed_document",
    composedFrom: "CC-1473's own page-2 checklist and the route's recorded component list",
    explicitMappings: {}, roleRefusals: [], selectionControls: [],
    canonicalWrites: writes, canonicalRefusals: refusals,
    boundaryWrites: writes, boundaryRefusals: refusals
  };
}

/* ---- the official form's field map ---------------------------------------------------- */
const OFFROUTE_REASON = (why) => `${why}; this branch of the form is never populated with participant data on this route`;

function officialFieldMap(source, census, report, marks) {
  const written = new Set(report.written.map((w) => w.field));
  const markedKeys = new Set(marks.map((m) => m.key));
  const canonicalWrites = [];
  const canonicalRefusals = [];
  const selectionControls = [];
  for (const r of census.rows) {
    const base = {
      field: `${source.formNumber}/${r.key}`,
      fieldName: `${source.formNumber}/${r.key}`,
      acroFieldName: r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt,
      captionBasis: "printed caption re-read from the pinned binary at captionReadAt; the build refuses on drift",
      document: source.formNumber
    };
    if (r.policy === "write") {
      assert.ok(written.has(r.name), `${source.formNumber} ${r.key} is mapped as a write and the finalizer did not write it`);
      canonicalWrites.push({ ...base, factId: r.fact, kind: r.type });
      continue;
    }
    if (r.policy === "select") {
      assert.ok(markedKeys.has(r.key), `${source.formNumber} ${r.key} is a route selection and no mark was drawn for it`);
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, rect: r.rect, rectBasis: r.rectBasis }],
        disposition: "selected_by_route",
        reason: r.routeReason, routeDetermined: true, requiredBeforeFiling: false,
        why: r.routeReason
      });
      continue;
    }
    if (r.isSelectionControl) {
      const offroute = r.policy === "offroute";
      const protect = r.policy === "protect";
      const cls = protect ? r.refusalClass : (offroute ? null : PARTICIPANT_ELECTION);
      selectionControls.push({
        ...base, selectionId: r.key, kind: "selection_control", type: "checkbox",
        widgets: [{ page: r.page, rect: r.rect, rectBasis: r.rectBasis }],
        disposition: "explicit_refusal",
        reason: protect ? r.why
          : offroute ? OFFROUTE_REASON(r.routeReason)
            : r.why,
        category: cls, completenessClass: cls, class: cls,
        requiredBeforeFiling: false, routeDetermined: false,
        why: protect ? r.why : offroute ? r.routeReason : r.why
      });
      continue;
    }
    if (r.policy === "protect") {
      canonicalRefusals.push({
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, document: source.formNumber, why: r.why
      });
      continue;
    }
    if (r.policy === "offroute") {
      canonicalRefusals.push({
        ...base, reason: OFFROUTE_REASON(r.routeReason),
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false, routeDetermined: false, document: source.formNumber,
        why: r.routeReason
      });
      continue;
    }
    canonicalRefusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${source.formNumber} field ${r.key}`,
      factId: null, routeDetermined: false, document: source.formNumber,
      why: `the platform holds no value it may write here and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }
  return {
    formNumber: source.formNumber, documentId: source.formNumber, documentRole: "primary_filing",
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKey: ROUTE.routeKey },
    structuralClass: "acroform",
    explicitMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "write").map((r) => [r.name, r.fact])),
    roleRefusals: [], selectionControls, canonicalWrites, canonicalRefusals,
    boundaryWrites: canonicalWrites, boundaryRefusals: canonicalRefusals
  };
}

/* ---- the builder's own count of the nine counters -------------------------------------- */
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

  const writes = [];
  const blanks = [];
  for (const m of maps) {
    for (const w of m.canonicalWrites ?? []) writes.push(row(w));
    for (const r of m.canonicalRefusals ?? []) blanks.push(row(r));
    for (const c of m.selectionControls ?? []) {
      if (String(c.disposition ?? "").toLowerCase().startsWith("select")) {
        // A route selection the build MADE is a completed cell, not a blank.
        // Its label here is the field key, deliberately: the caption is a
        // sentence about a signature block, and reading it as a field label
        // misclassifies a made mark as a protected write.
        writes.push({ ...row(c), label: c.field, isSelectionControl: false });
      } else {
        blanks.push(row(c, true));
      }
    }
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
    for (const m of p.routeSelectionMarks ?? []) {
      if ((m.paintedStrokesInsideTheBox ?? 0) < 2) {
        note("invisibleWrites", { fixture: p.fixture, field: m.key, why: "a route selection claims a mark and the output bytes carry fewer than two painted strokes inside its box" });
      }
    }
    if ((p.strayRouteSelectionStrokes ?? 0) > 0) {
      note("visualDefects", { fixture: p.fixture, why: "a route-selection stroke landed outside every measured selection box" });
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

/* ---- outputs ----------------------------------------------------------------------------- */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

function requiredBeforeFilingItems(maps) {
  return maps.flatMap((m) => (m.canonicalRefusals ?? [])
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: m.formNumber, field: r.field, page: r.page,
      y: r.rect?.y ?? null, section: r.sectionHeading,
      printedContext: r.printedLabel, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply
    })))
    .sort((a, b) => (a.document === b.document ? 0 : a.document === "CC-1473" ? -1 : b.document === "CC-1473" ? 1 : a.document.localeCompare(b.document))
      || (a.page - b.page) || ((b.y ?? 0) - (a.y ?? 0)));
}

function participantInstructions(maps, rbf, routeSelections) {
  const byDoc = new Map();
  for (const item of rbf) byDoc.set(item.document, [...(byDoc.get(item.document) ?? []), item]);
  const elections = maps.flatMap((m) => (m.selectionControls ?? [])
    .filter((c) => c.category === PARTICIPANT_ELECTION)
    .map((c) => ({ document: m.formNumber, ...c })));

  const out = [];
  out.push(`# What you must do before you file — ${ROUTE.routeName}`, "");
  out.push(`This packet is prepared for **${ROUTE.legalName}**.`, "");
  out.push(`The petition in it is **CC-1473**, the Virginia circuit court form headed *${FORM_TITLE}*. That is the form this route is filed on: the petition prints ${ROUTE.statute} on its own face, the build assignment names CC-1473, and the two agree.`, "");
  out.push("The platform filled in what it holds about you: your name (in the caption and printed in the signature block), your date of birth, your address, your telephone number and your email. Everything else on the petition is yours, and this page lists every item by the words printed beside the blank.", "");

  out.push("## Where you file this", "");
  out.push("File the completed packet with the **Circuit Court of the county or city in which the charge was disposed of** — the petition's own checklist on page 2 says so. Write that court's **city or county** and **street address** into the petition's caption; the clerk's office can confirm both. If the clerk requires it, include a completed **COVER SHEET FOR FILING CIVIL ACTIONS, circuit court form CC-1416**.", "");
  out.push("Two things this packet does **not** tell you, because neither is established by the petition and an unsourced figure in a filing instruction is worse than none:", "");
  out.push("- **The filing fee, and whether it can be waived.** Ask the clerk of the circuit court above.");
  out.push("- **How long you have, and exactly how the copy must be served.** The petition sets no filing deadline, and its checklist says a copy must be *served* on the Commonwealth's Attorney without saying how. Ask the same clerk.", "");

  out.push("## What is in this packet", "");
  out.push("| Component | What it is |", "| --- | --- |");
  out.push("| `primary_filing` | CC-1473, the petition itself |");
  out.push("| `commonwealth_service_and_stipulation_request` | the copy that goes to the Attorney for the Commonwealth, with a request that they state the Commonwealth's position |");
  out.push("| `ccre_forwarding_request` | the request that the Central Criminal Records Exchange forward your Virginia criminal history record to the court, made after filing |");
  out.push("| `records_checklist` | the records you need in front of you to complete the petition |");
  out.push("| `filing_instructions` | where the packet goes and in what order |");
  out.push("");

  out.push("## What you must do", "");
  out.push("1. **Fill in every item listed below.** Each one names the document, the page and the printed words next to the blank.");
  out.push(`2. **Read every checkbox and tick the ones that are true for you.** Each is a statement about your own record or a choice only you can make, and the platform ticks none of them for you except the ${routeSelections.length} boxes the route decides — set out under *What the packet answered for you* below. In Part 1, the form says **CHECK ONE**: acquitted, or nolle prosequi / otherwise dismissed.`);
  out.push("3. **Sign and date the petition yourself.** The platform never signs for you and never dates a signature, so those lines are deliberately blank. Leave the clerk's certification block at the foot of page 1 completely alone — it is the clerk's.");
  out.push("4. **File the petition with the circuit court clerk.**");
  out.push("5. **Ask the Central Criminal Records Exchange to forward your record to that court**, using the page in this packet headed for that purpose. The petition's checklist words the request around the court where the petition *was* filed, so it comes after filing.");
  out.push("6. **Have a copy of the petition served on the Attorney for the Commonwealth** for that county or city, using the page in this packet headed for that purpose, in the manner the clerk directs.");
  out.push("");

  out.push("## The items you must supply", "");
  for (const [doc, items] of byDoc) {
    const title = doc === "CC-1473" ? FORM_TITLE : (COMPOSED_TITLES[doc] ?? doc);
    out.push(`### ${doc} — ${title}`, "");
    out.push("| Page | The blank on the document | What to write |", "| --- | --- | --- |");
    for (const i of items) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
    out.push("");
  }

  out.push("## What the packet answered for you", "");
  out.push(`This packet is built for one statutory route — ${ROUTE.statute} — and for filing without a lawyer, so it states which of each petitioner/attorney pair applies rather than asking you:`, "");
  for (const sel of routeSelections) {
    out.push(`- **Page ${sel.page}, ${sel.printedLabel}.** ${sel.why[0].toUpperCase()}${sel.why.slice(1)}.`);
  }
  out.push("");
  out.push("Nothing about the **basis of the petition** is decided for you. Whether you were acquitted, or the charge was nolle prossed or otherwise dismissed, is a fact about your own record, so both Part 1 boxes are left for you to read and tick — exactly one of them.", "");
  out.push("Check each marked box against your own situation before you file. If any of them is wrong for you — for example, a lawyer is filing this for you — this is the wrong packet and you should not file it.", "");

  out.push("## The choices that are yours", "");
  out.push("| Document | The choice | Why it is yours |", "| --- | --- | --- |");
  for (const c of elections) out.push(`| ${c.document} | ${c.effectiveLabel} | ${c.reason} |`);
  out.push("");

  out.push("## Things the platform deliberately left blank", "");
  out.push("- **Your signature and the date you sign.** A signature is yours alone, and a date written before you sign would be false.");
  out.push("- **The case number at the top of the petition.** The circuit court clerk assigns it when the petition is filed.");
  out.push("- **The whole clerk's certification block at the foot of page 1** — the certification, the hearing date and time, and its date line. The clerk completes all of it.");
  out.push("- **The city or county of the circuit court, and its street address.** The shared field semantics cannot write the court's venue into a field the form names `City`, so you copy it from the clerk's confirmation — the reason is recorded in this family's build findings.");
  out.push("- **Your full name at the time of arrest.** The arrest record's wording controls, and only you can check it.");
  out.push("- **Every attorney box, and the VSB number.** This packet is prepared for you to file without a lawyer, so the petitioner boxes are marked and the attorney boxes are not.");
  out.push("");

  out.push("## What this packet is not", "");
  out.push("This is a prepared set of an official Virginia circuit court form and companion pages. It is not legal advice, it is not filed for you, and it does not decide whether the court will grant expungement.", "");
  out.push(`_Route: ${ROUTE.routeKey}_`);
  return `${out.join("\n")}\n`;
}

/* ---- the entry point ----------------------------------------------------------------------- */
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

  const source = resolved[0];
  const census = await censusOf(source);
  assert.equal(census.unmapped.length, 0,
    `${source.formNumber}: ${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.slice(0, 5), null, 2)}`);
  assert.equal(census.missingKeys.length, 0,
    `${source.formNumber}: the dictionary names ${census.missingKeys.length} key(s) this form does not have: ${JSON.stringify(census.missingKeys)}`);
  assert.equal(census.captionDrift.length, 0,
    `a recorded caption is no longer printed where the dictionary says: ${JSON.stringify(census.captionDrift.slice(0, 3), null, 2)}`);
  if (source.acroFieldCount != null) {
    const uniqueNames = new Set(census.rows.map((r) => r.name)).size;
    assert.equal(uniqueNames, source.acroFieldCount,
      `${source.formNumber}: censused ${uniqueNames} named fields, the committed corpus index declares ${source.acroFieldCount}`);
  }

  if (checkOnly) {
    const by = (p) => census.rows.filter((r) => r.policy === p).length;
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY", officialForm: source.formNumber, sha256: source.sha256,
      widgets: census.rows.length,
      write: by("write"), supply: by("supply"), protect: by("protect"),
      election: by("election"), select: by("select"), offroute: by("offroute")
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "raster"), { recursive: true });

  const maps = [];
  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];

  for (const fixtureName of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixtureName];
    const { bytes: filled, report } = await renderPrimary(source, census, fixtureName);
    const selections = census.rows.filter((r) => r.policy === "select")
      .map((r) => ({ key: r.key, name: r.name, page: r.page, rect: r.rect, routeReason: r.routeReason }));
    const { bytes: marked, marks } = await markRouteSelections(filled, selections);
    assert.equal(marks.length, selections.length, "every route selection must carry a mark");

    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    const pageManifest = [];
    const documents = [];

    const primary = await PDFDocument.load(marked, { ignoreEncryption: true, updateMetadata: false });
    for (const [i, p] of (await packet.copyPages(primary, primary.getPageIndices())).entries()) {
      packet.addPage(p);
      pageManifest.push({ packetPage: packet.getPageCount(), component: "primary_filing", documentId: source.formNumber, sourcePage: i + 1, sourceSha256: source.sha256 });
    }
    documents.push("primary_filing", source.formNumber);

    for (const componentId of COMPONENTS.filter((c) => c !== "primary_filing")) {
      const body = composedBody(componentId, facts);
      assert.ok(body.includes(facts["participant.full_legal_name"]),
        `${componentId}: the composed page must carry the petitioner's name`);
      const composedBytes = await renderComposedPdf(body, COMPOSED_TITLES[componentId]);
      const composed = await PDFDocument.load(composedBytes, { ignoreEncryption: true, updateMetadata: false });
      for (const [i, p] of (await packet.copyPages(composed, composed.getPageIndices())).entries()) {
        packet.addPage(p);
        pageManifest.push({ packetPage: packet.getPageCount(), component: componentId, documentId: componentId, sourcePage: i + 1, sourceSha256: null });
      }
      documents.push(componentId);
      if (fixtureName === "canonical") maps.push(composedMap(componentId));
    }

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    const primaryFile = `${OUT}/fixtures/${fixtureName}--${source.formNumber}-primary-filing.pdf`;
    fs.writeFileSync(path.join(ROOT, primaryFile), marked);
    const proof = await byteProof(source, census, primaryFile, report, fixtureName, marks, filled, marked);
    for (const m of proof.markProof) {
      assert.ok(m.paintedStrokesInsideTheBox >= 2,
        `route selection ${m.key} claims a mark and the output bytes carry ${m.paintedStrokesInsideTheBox} painted stroke(s) inside its box`);
    }
    assert.equal(proof.strayMarkStrokes, 0, `${proof.strayMarkStrokes} route-selection stroke(s) landed outside every measured box`);
    assert.equal(proof.refusedFieldsWithInk.length, 0,
      `field(s) the map refused carry ink in the output: ${JSON.stringify(proof.refusedFieldsWithInk)}`);

    writeProofs.push({
      fixture: fixtureName, formNumber: source.formNumber, sourceSha256: source.sha256,
      proofMethod: "flattened widget appearances read back at every measured /Rect of the finalized bytes, and route-selection marks read back as painted paths inside their own measured boxes",
      valuesReportedByFinalizer: report.written.length,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: proof.outside,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      routeSelectionMarks: proof.markProof,
      strayRouteSelectionStrokes: proof.strayMarkStrokes,
      unfittable: report.unfittable,
      actualWrites: proof.actualWrites
    });

    if (fixtureName === "canonical") maps.unshift(officialFieldMap(source, census, report, marks));

    artifacts.push({
      fixture: fixtureName, file, primaryFilingFile: primaryFile,
      sha256: crypto.createHash("sha256").update(packetBytes).digest("hex"),
      primaryFilingSha256: crypto.createHash("sha256").update(marked).digest("hex"),
      byteLength: packetBytes.length, pageCount: packet.getPageCount(), pageManifest,
      documents, components: COMPONENTS
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

  const rbf = requiredBeforeFilingItems(maps);
  const routeSelections = (maps[0]?.selectionControls ?? [])
    .filter((c) => c.disposition === "selected_by_route")
    .map((c) => ({ field: c.field, page: c.page, printedLabel: c.effectiveLabel, why: c.why }))
    .sort((a, b) => (a.page - b.page) || a.printedLabel.localeCompare(b.printedLabel));
  const instructionsText = participantInstructions(maps, rbf, routeSelections);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: ROUTE.jurisdiction, implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    corpusRootFromEnvironment: "MASTER_LIBRARY_SOURCE_DIR",
    bindingMethod: "exact form number + committed corpus-index SHA-256 + MASTER_QUEUE-pinned SHA-256 + on-disk SHA-256 + byte length",
    routeKey: ROUTE.routeKey, routeSelectionId: ROUTE.routeSelectionId,
    statutoryAuthority: ROUTE.statute, legalName: ROUTE.legalName,
    officialFormAssigned: ROUTE.assignedOfficialForm,
    officialFormBuilt: source.formNumber,
    officialFormMatchesAssignment: ROUTE.formMatchesAssignment,
    formIdentityNote:
      "The assignment names CC-1473 and CC-1473 prints this route's own authority — VA. CODE § 19.2-392.2(A) — across "
      + "its caption, agreeing with the track's recorded authority in data/rcap-ledger/track-pathway-crosswalk.json. "
      + "The packet is built on the assigned form, with no substitution.",
    allSourcesExact: true,
    documents: resolved.map((r) => ({
      sourceIds: [r.sourceId], documentId: r.formNumber, formNumber: r.formNumber, revision: r.revision,
      pathInArchive: r.pathInArchive, sha256: r.sha256, byteLength: r.byteLength, instrumentKind: r.instrumentKind
    })),
    composedComponentsAuthoredByThisBuild: COMPONENTS.filter((c) => c !== "primary_filing"),
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that Rev. 07/26 is the current published edition of CC-1473",
      "that any output is approved for participant delivery",
      "that any charge is eligible for expungement under Va. Code § 19.2-392.2(A)"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "Every caption was re-read from the pinned binary at its recorded coordinate before anything rendered, as a "
      + "flattened substring at the recorded line; the build refuses on drift. Two widget names carry two boxes each "
      + "(User.Check0, User.Check5) and those rows are keyed by name plus measured coordinate.",
    documents: [{
      documentId: source.formNumber, formNumber: source.formNumber, sourceSha256: source.sha256,
      pageCount: census.pageCount, fieldCount: new Set(census.rows.map((r) => r.name)).size,
      widgetCount: census.rows.length,
      corpusIndexDeclaresFieldCount: source.acroFieldCount,
      fields: census.rows.map((r) => ({
        field: r.key, acroFieldName: r.name, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        section: r.section, effectiveLabel: r.effectiveLabel,
        printedCaption: r.caption, captionReadAt: r.captionAt,
        policy: r.policy, factId: r.fact
      }))
    }]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: [ROUTE.routeKey], routeSelectionId: ROUTE.routeSelectionId, renderStrategy: "acroform_fill",
    jurisdiction: ROUTE.jurisdiction, statute: ROUTE.statute, legalName: ROUTE.legalName,
    officialForm: source.formNumber,
    assignedOfficialForm: ROUTE.assignedOfficialForm,
    officialFormMatchesAssignment: ROUTE.formMatchesAssignment,
    componentSet: COMPONENTS,
    captionBasis:
      "every printed caption in this map was read from the official form's own content stream at the recorded "
      + "coordinates; captionReadAt records where, and the build refuses if a caption is no longer there",
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, PARTICIPANT_ELECTION],
    routeSelectionsMade: maps.flatMap((m) => (m.selectionControls ?? []).filter((c) => c.disposition === "selected_by_route").map((c) => ({ document: m.formNumber, field: c.field, page: c.page, printedLabel: c.printedLabel, why: c.why }))),
    routeSelectionNote:
      "The four marked boxes are the petitioner/attorney pairs of the signature block, decided by this packet being "
      + "prepared for filing without counsel. The Part 1 basis pair — acquitted, or nolle prosequi / otherwise "
      + "dismissed — is NOT route-determined: the route covers both ways a charge ends without a conviction, and which "
      + "one is the participant's own record. Selecting one would be guessing a legal answer, which this lane never does.",
    venueNote:
      "The CITY OR COUNTY venue line cannot be written through the shared field semantics (a field named 'City' binds "
      + "to participant.city and an explicit conflicting mapping is refused by design), so it is declared "
      + "required-before-filing and no matter.* fact is held in this family's fixtures. See build-findings.json.",
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: COMPONENTS,
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note: "Read back from the finalized PDF bytes at every measured widget rectangle, not from the finalizer's own report; route-selection marks read back as painted paths inside their own measured boxes.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      routeSelectionMarks: p.routeSelectionMarks,
      strayRouteSelectionStrokes: p.strayRouteSelectionStrokes,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: writeProofs.flatMap((p) => (p.refusedFieldsWithInk ?? []).map((r) => ({
      fixture: p.fixture, field: r.fieldId, finding: "a field the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    participantElections: maps.flatMap((m) => (m.selectionControls ?? []).filter((c) => c.category === PARTICIPANT_ELECTION).map((c) => ({
      document: m.formNumber, field: c.field, page: c.page, section: c.sectionHeading, label: c.effectiveLabel, why: c.reason
    }))),
    protectedBlanks: maps.flatMap((m) => [
      ...(m.canonicalRefusals ?? []).filter((r) => r.requiredBeforeFiling !== true),
      ...(m.selectionControls ?? []).filter((c) => c.disposition === "explicit_refusal" && c.category !== PARTICIPANT_ELECTION)
    ].map((r) => ({
      document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category ?? null, why: r.why ?? r.reason
    }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    note: "Every value this build wrote, and all four route-selection marks, should be checked on the paper by a human who did not build this family.",
    whatToLookAt: [
      "Page 1, the caption: NAME OF PETITIONER written; Case No., CITY OR COUNTY and STREET ADDRESS OF COURT blank.",
      "Page 1, Part 1: BOTH basis boxes unticked — acquitted, and nolle prosequi / dismissed — because the basis is the participant's own record.",
      "Page 1, Part 2: date of birth written; every charge-fact line blank — name at arrest, specific charges, case numbers, arrest date, agency, dispositions.",
      "Page 1, the signature block: DATE blank; the four PETITIONER boxes marked with two inset diagonals each; the four ATTORNEY boxes untouched; PRINT NAME, ADDRESS, TELEPHONE and EMAIL written; VSB blank.",
      "Page 1, the clerk's certification at the foot: certification box, hearing date and time, and DATE line all untouched.",
      "Page 2: the checklist unticked, three boxes.",
      "The four composed pages: petitioner's name printed (and date of birth on the CCRE page); the circuit court line dotted for the participant to copy; signature and date lines blank."
    ],
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, file: a.file, sha256: a.sha256, pageCount: a.pageCount })),
    rasterPages: rasterPages.map((p) => ({ fixture: p.fixture, page: p.page, file: p.file, sha256: p.sha256 }))
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1", familyId: FAMILY_ID,
    buildStatus: "state_built", reviewStatus: "qa_review_pending", builtBy: BUILD_SCRIPT,
    rasterEngine: skipRaster ? "not rendered in this run" : "chromium_calibrated", popplerUsed: false,
    renderedArtifacts: artifacts.length, rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
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
    findings: [
      {
        finding:
          "The assignment names CC-1473 and CC-1473 prints this route's own authority — VA. CODE § 19.2-392.2(A) — "
          + "across its caption, agreeing with the track's recorded authority in "
          + "data/rcap-ledger/track-pathway-crosswalk.json.",
        consequence:
          "The packet is built on the assigned form with no substitution. The CC-1201/CC-1203 discrepancy the sealing "
          + "builders returned does not arise on this family."
      },
      {
        finding:
          "The widget names lie about the blanks, as they did on CC-1201: User.Title is the NAME OF PETITIONER line, "
          + "User.Officer is the STREET ADDRESS OF COURT line, and User.PetitionerName is the full name AT THE TIME OF "
          + "ARREST.",
        consequence:
          "Every caption was read off the page at recorded coordinates and the build refuses on drift; the "
          + "name-at-arrest line is left to the participant because the arrest record's wording controls, not the "
          + "name the platform holds."
      },
      {
        finding:
          "User.City is the CITY OR COUNTY line of the circuit court caption — the filing venue — but the shared "
          + "field-semantics name channel binds a field named 'City' to participant.city, and an explicit mapping that "
          + "conflicts with the name channel is refused by design (explicit_mapping_conflicts_with_field_name).",
        consequence:
          "The venue line is declared required-before-filing with the reason stated, no matter.* fact is held in this "
          + "family's fixtures — a packet must not claim to hold a value it can put nowhere — and the composed pages "
          + "print a dotted line for the participant to copy the court from the petition's caption. This is a "
          + "field-semantics fidelity note for whoever owns the descriptor list: a venue-line descriptor "
          + "(e.g. matter.court binding a CITY OR COUNTY caption) would let this family write the venue."
      },
      {
        finding:
          "User.Check0 and User.Check5 each carry one name and two boxes asking two different questions — "
          + "acquitted / nolle-or-dismissed, and warrant-attached / warrant-not-available.",
        consequence:
          "Those rows are keyed by widget name plus measured coordinate (the CC-1201 lesson), and neither pair is "
          + "route-determined: the route covers both ways a charge ends without a conviction, so the basis boxes stay "
          + "the participant's own election, disclosed with the form's own CHECK ONE instruction."
      },
      {
        finding:
          "CC-1473 prints one ADDRESS line for the petitioner, not separate street and city-state-zip boxes.",
        consequence:
          "participant.street_address carries the whole mailing address in this family's fixtures (the "
          + "mi_setaside_marihuana-set precedent for a one-line address box), so the value written matches the box "
          + "the court printed."
      },
      {
        finding:
          "The clerk's certification block at the foot of page 1 — the certification checkbox, the hearing date and "
          + "time, and its DATE line — is the clerk's, and the form's checklist requires service on the Commonwealth's "
          + "Attorney without stating the manner of service.",
        consequence:
          "All three clerk fields are protected as court-owned; no hearing date and no court date is ever written; "
          + "and the service page delegates the manner of service to the circuit court clerk by name rather than "
          + "inventing mechanics the form does not establish."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "CC-1473 Rev. 07/26 (MASTER edition): confirm it is still the published edition before any promotion beyond state_built.",
      "The composed Commonwealth's-Attorney page requests the Commonwealth state its position in writing; confirm that request page is appropriate to serve alongside the § 19.2-392.2(A) petition."
    ],
    mattersForTheReviewersAttention: [
      "production-field-map.json venueNote — the CITY OR COUNTY line is participant-supplied because the shared semantics cannot bind it; confirm the instructions make that legible.",
      "reports/actual-writes.json routeSelectionMarks — four petitioner boxes are marked by the route; confirm each mark sits inside the court's own box on the paper."
    ]
  });

  const allZero = PASS_COUNTERS.every((c) => counted.counters[c] === 0);
  return {
    familyId: FAMILY_ID,
    status: allZero ? "COMPLETED" : "STOPPED",
    ...(allZero ? {} : {
      stopClass: "COMPLETENESS_COUNTER_NOT_ZERO",
      nonZeroCounters: PASS_COUNTERS.filter((c) => counted.counters[c] > 0),
      firstFindings: counted.findings.slice(0, 6)
    }),
    counters: counted.counters,
    directory: OUT,
    officialForm: source.formNumber,
    officialFormAssigned: ROUTE.assignedOfficialForm,
    officialFormMatchesAssignment: ROUTE.formMatchesAssignment,
    sourceSha256: source.sha256,
    components: COMPONENTS,
    documents: [source.formNumber, ...COMPONENTS.filter((c) => c !== "primary_filing")],
    writes: maps.reduce((n, m) => n + (m.canonicalWrites ?? []).length, 0),
    requiredBeforeFiling: rbf.length,
    routeSelectionsMade: routeSelections.length,
    participantElections: maps.reduce((n, m) => n + (m.selectionControls ?? []).filter((c) => c.category === PARTICIPANT_ELECTION).length, 0),
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, primaryFilingSha256: a.primaryFilingSha256, pages: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: allZero,
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
