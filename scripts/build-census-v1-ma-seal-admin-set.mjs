#!/usr/bin/env node
/**
 * The Massachusetts administrative sealing family — `ma-seal-admin-set`.
 *
 *   node scripts/build-census-v1-ma-seal-admin-set.mjs [--check] [--no-raster]
 *
 * ONE official form, TWO statutory routes, and THE PACKET ELECTS NEITHER — which
 * is this family's central finding, not an omission in it.
 *
 * The form is the Office of the Commissioner of Probation's PETITION TO SEAL,
 * footer "(OCP 4/12)" — one page, 23 AcroForm widgets, addressed on its own face
 * to "Commissioner of Probation, One Ashburton Place, Room 405, Boston, MA
 * 02108". The same binary serves this family and `ma-seal-decrim-set`.
 *
 * WHY NO BOX IS TICKED
 *
 * Part A is a four-way statutory fork, read from the binary:
 *
 *   box 1  y 686.1  § 100B  delinquency (juvenile) cases, 3 years
 *   box 2  y 656.5  § 100A  misdemeanor cases, 3 years
 *   box 3  y 623.3  § 100A  felony cases, 7 years (15 for eligible sex offenses)
 *   box 4  y 584.9  § 100A  a recorded offense no longer a crime
 *
 * This family is TWO routes at once —
 * `obligation:track-pathway:MA:ma-seal-admin:adult-conviction-sealing-under-m-g-l-c-276-100a`
 * and `...:juvenile-record-sealing-under-100b` — so boxes 1, 2 and 3 are all
 * within its scope and nothing in the route scope chooses between them. Worse,
 * the § 100A branches split on whether the offence is a misdemeanour or a
 * felony, which is a characterisation of the participant's own record.
 *
 * The general rule is that a packet built for one statutory route states which
 * route it is rather than asking the participant, and this build does not evade
 * it. It uses the completeness contract's own exception — an election the CASE
 * determines is not an election the ROUTE determines — and it pays that
 * exception's price: `determinedByTheCaseNotTheRoute` and
 * `whyTheRouteCannotDetermineIt` travel as typed data on all three rows, all
 * three are declared required-before-filing, and all three are disclosed in
 * participant-instructions.md with the waiting-period table the route record
 * carries, so the participant can actually find their box.
 *
 * THE BASIS IS READ, NOT ASSERTED. The route-obligation census records, for
 * these very routes, a later-completion field reading "Felony or misdemeanour
 * characterisation where it cannot be ascertained". That record is why the
 * election is left to the participant, and the build REFUSES if the record stops
 * saying it. The census must also record the SAME filing facts for both routes;
 * if they ever diverge, one route's facts would be printed on the other's
 * petition, and the build stops instead.
 *
 * Ticking a box here would be a statutory claim about a record the platform has
 * never seen, on a petition signed under the penalties of perjury. The
 * settled-selection channel is therefore never opened at all, and the build
 * asserts the finalizer marked nothing.
 *
 * Box 4 is the decriminalized-offence branch, a different track with its own
 * route key (`obligation:track-only:MA:ma-seal-decrim`, built by
 * ma-seal-decrim-set), and carries a named route condition. The three numbered
 * affidavits are genuine participant elections: the form's own instruction ties
 * them to Part A boxes 1, 2 and 3, and each is sworn under the penalties of
 * perjury.
 *
 * WHAT THIS BUILD WRITES, AND WHAT IT REFUSES, EACH FOR ITS OWN MEASURED REASON
 *
 * Written: date of birth, mailing address, city, state and ZIP — five held facts
 * into five widgets whose own names bind them.
 *
 * THE NAME BOX IS REFUSED ON A MEASUREMENT, NOT A POLICY. "Print" is a SINGLE
 * widget, x 37.8 w 350.4 h 9.8, and the form prints THREE sub-captions beneath
 * it — "Last Name" at x 90, "First Name" at x 203, "Middle Name" at x 330. One
 * widget takes one string laid out from its left edge, so a value can be placed
 * under the first caption only, and the finalizer's composed channel joins facts
 * with NEWLINES into a 9.8pt box. The refusal carries the measurement.
 *
 * FOUR NAME BOXES ARE REFUSED BECAUSE THE SHARED REGISTRY BINDS THEM TO THE
 * PARTICIPANT'S OWN NAME. Measured with decideBinding against the pinned
 * binary's own field names: `AliasMaidenPrevious Name`, `Fathers Name`,
 * `Mothers Maiden Name` and `HusbandWifes Name` each resolve to
 * `participant.full_legal_name`, because that descriptor's pattern ends in a
 * catch-all `\bname\b` and the registry carries no other-names, parent or
 * spouse descriptor at all. Left to the shared binder this petition would have
 * sworn that the participant's father, mother and spouse are all the
 * participant. Every one is passed as unwritable by ROLE — the one gate the name
 * channel cannot reverse — and the registry gap is returned as a finding.
 *
 * The Social Security number is refused by the shared protect rules as a
 * government identifier. Occupation and Place of Birth bind no descriptor. All
 * three signature widgets are protected: the petition and both affidavits are
 * sworn.
 *
 * A built family is a built family. It is not verified, not approved, not
 * sellable, and this builder issues no verdict on its own packets.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { finalizeOfficialForm } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { flattenedWidgets, drawnAt } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { decideBinding } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, classifyField, classifyBlank, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const { rasterizePageCalibrated } = await import("./raster/pdf-page-raster.mjs");

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName } = require("pdf-lib");

const FAMILY_ID = "ma-seal-admin-set";
const OUT = "data/rcap-all50/overlays/census-v1/ma/ma-seal-admin-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-ma-seal-admin-set.mjs";
const MASTER_QUEUE = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const ROUTE_CENSUS = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";

const DOCUMENT_ID = "OCP-4";
const ROUTE_KEYS = [
  "obligation:track-pathway:MA:ma-seal-admin:adult-conviction-sealing-under-m-g-l-c-276-100a",
  "obligation:track-pathway:MA:ma-seal-admin:juvenile-record-sealing-under-100b"
];

/*
 * The digest the MASTER_QUEUE row pins, asserted here as well as read from
 * there. Two independent statements of the same identity: a queue edited under
 * this build would move both or neither.
 */
const PINNED_SHA256 = "416f9a1d1a7ade6e71ffe3964a30c2d247bd1aca3982f4ff8e55550a730506ce";

/*
 * Custody roots this build will look in, in order. Every one is a mount this
 * repository already declares; none is another lane's worktree, and nothing is
 * ever fetched. A source that binds in none of them stops the family.
 */
const CUSTODY_ROOTS = [
  process.env.MASTER_LIBRARY_SOURCE_DIR ?? null,
  "private/source-imports/Nationwide_Recovery_Pool_2026-09-02",
  "private/source-imports/rcap-d-source-packs-2026-08-12",
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  "private/human-source-returns"
].filter(Boolean);

const SUPPLY = (what) => ({ policy: "supply", what });
const WRITE = (fact) => ({ policy: "write", fact });
const PROTECT = (refusalClass, why) => ({ policy: "protect", refusalClass, why });
const CASE_DETERMINED = (what, why) => ({ policy: "case_determined", what, why });
const ELECTION = (why) => ({ policy: "election", why });
const OFF_ROUTE = (condition) => ({ policy: "off_route", condition });

const SIGNATURE = "signature_or_date_participant_completion";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

const S = {
  PART_A: "Part A — the section you are petitioning under",
  IDENTITY: "Petitioner identity",
  AFFIDAVITS: "The numbered affidavits"
};

/*
 * Every one of the 23 widgets, keyed by its own AcroForm name.
 *
 * `caption` is text the form PRINTS, re-read from the pinned binary at
 * `captionAt` before anything renders; the build refuses on drift. This form's
 * text stream interleaves badly — "Section - Chapter 276. F 100Asentence
 * elements of welony cases" is one printed line — so each caption here is a
 * substring that survives the interleaving at its own recorded line, and nothing
 * more is claimed for it than that.
 */
const FORM_FIELDS = {
  "Check Box1": {
    section: S.PART_A, selection: true, partANumber: 1, affidavitNumber: 1,
    caption: "Section 100B", captionAt: { page: 1, y: 701 },
    label: "Part A box 1 — Section 100B, Chapter 276: delinquency (juvenile) cases completed 3 years before this request (selection)",
    ...CASE_DETERMINED(
      "tick box 1 if the record you are asking to seal is a JUVENILE delinquency case and every sentence element of "
      + "it, and of any later court appearance, was completed at least 3 years ago. If you tick it, sign numbered "
      + "Affidavit 1 below.",
      "this family covers BOTH of the Commissioner's elapsed-time routes — adult conviction sealing under § 100A and "
      + "juvenile record sealing under § 100B — and which one you are on is a fact about YOUR OWN record, not a fact "
      + "the route fixes. The platform has not seen your record.")
  },
  "Check Box2": {
    section: S.PART_A, selection: true, partANumber: 2, affidavitNumber: 2,
    caption: "Misdemeanor cases", captionAt: { page: 1, y: 669 },
    label: "Part A box 2 — Section 100A, Chapter 276: misdemeanor cases completed 3 years before this request (selection)",
    ...CASE_DETERMINED(
      "tick box 2 if the record is an ADULT MISDEMEANOR — or was a felony when committed and is a misdemeanor now — "
      + "and every sentence element of it, and of any later court appearance, was completed at least 3 years ago. If "
      + "you tick it, sign numbered Affidavit 2 below.",
      "whether an offence is a misdemeanour or a felony is a characterisation of YOUR OWN record, and the "
      + "route-obligation census records that characterisation as a later-completion field for this very route "
      + "where it cannot be ascertained. The route does not decide it; the offence does.")
  },
  "Check Box3": {
    section: S.PART_A, selection: true, partANumber: 3, affidavitNumber: 3,
    caption: "elony cases", captionAt: { page: 1, y: 627 },
    label: "Part A box 3 — Section 100A, Chapter 276: felony cases completed 7 years before this request, 15 for eligible sex offenses (selection)",
    ...CASE_DETERMINED(
      "tick box 3 if the record is an ADULT FELONY and every sentence element of it, and of any later court "
      + "appearance, was completed at least 7 years ago — 15 years for an eligible sex offense. If you tick it, sign "
      + "numbered Affidavit 3 below.",
      "whether an offence is a felony or a misdemeanour is a characterisation of YOUR OWN record, and the "
      + "route-obligation census records that characterisation as a later-completion field for this very route "
      + "where it cannot be ascertained. The route does not decide it; the offence does.")
  },
  "Check Box4": {
    section: S.PART_A, selection: true, partANumber: 4,
    caption: "is no longer a crime", captionAt: { page: 1, y: 586 },
    label: "Part A box 4 — Section 100A, Chapter 276: a recorded offense which is no longer a crime (selection)",
    ...OFF_ROUTE(
      "Part A box 4 is the § 100A branch for a recorded offense that is no longer a crime. It is a different track "
      + "with its own route key — obligation:track-only:MA:ma-seal-decrim, which the route-obligation census records "
      + "as the only administrative sealing route with no waiting period, using Part A box 4. This family is the two "
      + "ELAPSED-TIME routes of the ma-seal-admin track: adult conviction sealing under § 100A and juvenile record "
      + "sealing under § 100B, both of which the census records with a waiting period.")
  },
  Print: {
    section: S.IDENTITY, caption: "Print", captionAt: { page: 1, y: 554 },
    subCaptions: [
      { text: "Last Name", x: 90 },
      { text: "First Name", x: 203 },
      { text: "Middle Name", x: 330 }
    ],
    subCaptionsAt: { page: 1, y: 543 },
    label: "Your name, printed in the Last Name, First Name and Middle Name blanks",
    ...SUPPLY(
      "your name, printed in the three blanks the form captions Last Name, First Name and Middle Name. The platform "
      + "holds your name and did not print it here: the form gives these three captions ONE box, and a single box "
      + "takes one value written from its left edge, so any value the platform wrote would sit under 'Last Name' "
      + "however it was composed")
  },
  "Date of Birth": {
    section: S.IDENTITY, caption: "Date of", captionAt: { page: 1, y: 554 },
    label: "Date of birth", ...WRITE("participant.date_of_birth")
  },
  "AliasMaidenPrevious Name": {
    section: S.IDENTITY, caption: "Alias/Maiden/Previous Name", captionAt: { page: 1, y: 523 },
    label: "Alias, maiden or previous name",
    registryGap: "participant.full_legal_name",
    ...SUPPLY(
      "any other name you have used — an alias, a maiden name or a previous name — or leave it blank if there is none. "
      + "The platform did not fill this: the shared field registry has no other-names descriptor, and the only "
      + "descriptor that matches this box is your own current legal name, which is not what the box asks for")
  },
  "Mailing address": {
    section: S.IDENTITY, caption: "Mailing address", captionAt: { page: 1, y: 503 },
    label: "Mailing address", ...WRITE("participant.street_address")
  },
  City: {
    section: S.IDENTITY, caption: "City", captionAt: { page: 1, y: 503 },
    label: "City of your mailing address", ...WRITE("participant.city")
  },
  State: {
    section: S.IDENTITY, caption: "State", captionAt: { page: 1, y: 503 },
    label: "State of your mailing address", ...WRITE("participant.state")
  },
  Zip: {
    section: S.IDENTITY, caption: "Zip", captionAt: { page: 1, y: 503 },
    label: "ZIP code of your mailing address", ...WRITE("participant.zip")
  },
  Occupation: {
    section: S.IDENTITY, caption: "Occupation", captionAt: { page: 1, y: 483 },
    label: "Occupation",
    ...SUPPLY("your occupation. The platform does not collect it")
  },
  "Social Security": {
    section: S.IDENTITY, caption: "Social Security", captionAt: { page: 1, y: 483 },
    label: "Social Security number",
    ...SUPPLY(
      "your Social Security number. The platform does not hold it and would not print it if it did — the shared "
      + "protect rules refuse a government identifier on every form")
  },
  "Place of Birth": {
    section: S.IDENTITY, caption: "Place of Birth", captionAt: { page: 1, y: 483 },
    label: "Place of birth",
    ...SUPPLY("your place of birth. The platform does not collect it")
  },
  "Fathers Name": {
    section: S.IDENTITY, caption: "Father", captionAt: { page: 1, y: 463 },
    label: "Father's name",
    registryGap: "participant.full_legal_name",
    ...SUPPLY(
      "your father's name. The platform does not collect it, and the shared field registry matches this box to YOUR "
      + "own legal name, which would be false here")
  },
  "Mothers Maiden Name": {
    section: S.IDENTITY, caption: "Mother", captionAt: { page: 1, y: 463 },
    label: "Mother's maiden name",
    registryGap: "participant.full_legal_name",
    ...SUPPLY(
      "your mother's maiden name. The platform does not collect it, and the shared field registry matches this box to "
      + "YOUR own legal name, which would be false here")
  },
  "HusbandWifes Name": {
    section: S.IDENTITY, caption: "Husband/Wife", captionAt: { page: 1, y: 463 },
    label: "Husband's or wife's name",
    registryGap: "participant.full_legal_name",
    ...SUPPLY(
      "your husband's or wife's name if you have one, or leave it blank. The platform does not collect it, and the "
      + "shared field registry matches this box to YOUR own legal name, which would be false here")
  },
  "Petitioners Signature": {
    section: S.IDENTITY, caption: "Petitioner", captionAt: { page: 1, y: 443 },
    label: "Petitioner's signature on the petition",
    ...PROTECT(SIGNATURE, "you sign the petition yourself; the platform never signs for you")
  },
  "Check Box5": {
    section: S.AFFIDAVITS, selection: true, affidavitNumber: 1,
    caption: "1", captionAt: { page: 1, y: 375 },
    label: "Numbered Affidavit 1 — the affidavit that answers Part A box 1, the juvenile delinquency branch (selection)",
    ...ELECTION(
      "the form's own instruction reads 'SELECT appropriate box(es). If 1, 2, or 3 are selected you must sign the "
      + "corresponding numbered Affidavit below'. Numbered Affidavit 1 answers Part A box 1, the juvenile delinquency branch. It is a statement about "
      + "your own record, sworn under the penalties of perjury, and only you can make it — the platform never swears "
      + "for you.")
  },
  Signature8: {
    /* The printed line here extracts as "Sigtnure oaf Petitioner" — the runs
     * interleave mid-word — so the recorded caption is the one word that
     * survives it. */
    section: S.AFFIDAVITS, caption: "Petitioner", captionAt: { page: 1, y: 273 },
    label: "Signature of Petitioner on numbered Affidavit 1",
    ...PROTECT(SIGNATURE, "each affidavit is signed under the penalties of perjury, by you and never by the platform")
  },
  "Check Box6": {
    section: S.AFFIDAVITS, selection: true, affidavitNumber: 2,
    caption: "2", captionAt: { page: 1, y: 279 },
    label: "Numbered Affidavit 2 — the affidavit that answers Part A box 2, the adult misdemeanor branch (selection)",
    ...ELECTION(
      "the form's own instruction reads 'SELECT appropriate box(es). If 1, 2, or 3 are selected you must sign the "
      + "corresponding numbered Affidavit below'. Numbered Affidavit 2 answers Part A box 2, the adult misdemeanor branch. It is a statement about "
      + "your own record, sworn under the penalties of perjury, and only you can make it — the platform never swears "
      + "for you.")
  },
  "Check Box7": {
    section: S.AFFIDAVITS, selection: true, affidavitNumber: 3,
    caption: "3", captionAt: { page: 1, y: 239 },
    label: "Numbered Affidavit 3 — the affidavit that answers Part A box 3, the adult felony branch (selection)",
    ...ELECTION(
      "the form's own instruction reads 'SELECT appropriate box(es). If 1, 2, or 3 are selected you must sign the "
      + "corresponding numbered Affidavit below'. Numbered Affidavit 3 answers Part A box 3, the adult felony branch. It is a statement about "
      + "your own record, sworn under the penalties of perjury, and only you can make it — the platform never swears "
      + "for you.")
  },
  "Signature of Petitioner": {
    section: S.AFFIDAVITS, caption: "Signature of Petitioner", captionAt: { page: 1, y: 122 },
    label: "Signature of Petitioner on the second numbered affidavit block",
    ...PROTECT(SIGNATURE, "each affidavit is signed under the penalties of perjury, by you and never by the platform")
  }
};

/*
 * The form-level sentence this family's whole treatment of Part A rests on. It
 * is re-read from the pinned binary before anything renders, and the build stops
 * rather than reason from a sentence the paper no longer carries.
 */
const FORM_ANCHORS = [
  {
    id: "part-a-affidavit-instruction",
    page: 1, y: 720, needle: "If 1, 2, or 3 are selected",
    whyItMatters:
      "it is the printed basis for ticking Part A box 4 without engaging any numbered affidavit, and for the named "
      + "route condition on all three affidavit controls"
  },
  {
    id: "filing-office",
    page: 1, y: 743, needle: "Commissioner of Probation, One Ashburton Place, Room 405, Boston, MA 02108",
    whyItMatters: "the filing destination printed on the form's own TO: line, which the instructions quote rather than retype"
  },
  {
    id: "form-footer",
    page: 1, y: 49, needle: "OCP 4/12",
    whyItMatters: "the form's own edition footer, which identifies the document this packet is built on"
  }
];

/* ---- fixtures --------------------------------------------------------------- *
 * The two review participants. Every fact here is one the platform's shared
 * descriptor registry actually carries; nothing is invented to make a box fill.
 * The boundary participant exists to stress this form's narrow widgets — City is
 * 100.1pt and State 40.1pt — and a value that will not fit is REFUSED and named
 * to the participant, never shortened.
 */
const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.first_name": "Jordan",
    "participant.middle_name": "Avery",
    "participant.last_name": "Reyes",
    "participant.date_of_birth": "1991-04-17",
    "participant.street_address": "42 Maple Street, Apartment 3",
    "participant.city": "Dorchester",
    "participant.state": "MA",
    "participant.zip": "02124",
    "participant.phone": "617-555-0142",
    "participant.email": "jordan.reyes@example.org"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.first_name": "Maria-Alejandra",
    "participant.middle_name": "Consuelo",
    "participant.last_name": "O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "participant.street_address": "1188 Upper Notch Crossing Road, Apartment 14B",
    "participant.city": "Unincorporated Township of Long Hollow Crossing",
    "participant.state": "Massachusetts",
    "participant.zip": "01103-2214",
    "participant.phone": "(413) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy.whitfield@longmailexample.org"
  }
};

const RASTER_ENGINE = "scripts/raster/pdf-page-raster.mjs (Chromium, calibrated)";

/* ---- the controlling records, read at build time ---------------------------- */

/** The MASTER_QUEUE row for this family, and the source identity it pins. */
function queueBinding() {
  const queue = JSON.parse(fs.readFileSync(path.join(ROOT, MASTER_QUEUE), "utf8"));
  const row = (queue.families ?? []).find((f) => f.familyId === FAMILY_ID);
  assert.ok(row, `${MASTER_QUEUE} carries no row for ${FAMILY_ID}`);
  const hashes = row.sourceHashes ?? [];
  assert.equal(hashes.length, 1,
    `${FAMILY_ID} expects exactly one pinned source and the queue names ${hashes.length}`);
  const pinned = hashes[0];
  assert.equal(String(pinned.sha256 ?? "").toLowerCase(), PINNED_SHA256,
    `the MASTER_QUEUE pin moved: the queue now says ${pinned.sha256}, this build asserts ${PINNED_SHA256}`);
  return {
    sourceId: pinned.sourceId, declaredPath: pinned.path, sha256: PINNED_SHA256,
    tier: pinned.tier ?? null, routeKeys: row.routeKeys ?? [],
    officialFormFamily: row.officialFormFamily ?? null,
    custodyClassInQueue: row.sourceReadiness?.custodyClass ?? null
  };
}

/**
 * What the route-obligation census records for this family's route.
 *
 * Every sentence this packet prints about the route comes from here, and each is
 * asserted non-empty before it is used: a quotation presented as the record
 * speaking, with nothing inside it, is worse than no quotation at all.
 */
function routeRecord() {
  const census = JSON.parse(fs.readFileSync(path.join(ROOT, ROUTE_CENSUS), "utf8"));
  const family = (census.packetFamilies ?? []).find((f) => f.worklistGroupId === FAMILY_ID);
  assert.ok(family, `${ROUTE_CENSUS} carries no packet family ${FAMILY_ID}`);
  const routes = family.routes ?? [];
  assert.equal(routes.length, ROUTE_KEYS.length,
    `${FAMILY_ID} is built for ${ROUTE_KEYS.length} routes and the census records ${routes.length}`);
  for (const key of ROUTE_KEYS) {
    assert.ok(routes.some((r) => r.routeKey === key),
      `the census no longer records the route ${key}, which this build is written for`);
  }

  /*
   * The two routes are read as ONE set of recorded facts only because the census
   * records them identically. If they ever diverge the packet would be printing
   * one route's filing facts on a form serving both, so the build stops instead.
   */
  const shapes = routes.map((r) => JSON.stringify(r.deliverable));
  assert.equal(new Set(shapes).size, 1,
    "the census now records different deliverable facts for the two ma-seal-admin routes; this packet prints one set "
    + "of filing facts for both, so the build refuses rather than print one route's facts on the other's petition");
  const route = routes[0];

  const recorded = (key) => {
    const cell = route.deliverable?.[key];
    assert.ok(cell, `the census records no ${key} cell for ${FAMILY_ID}`);
    assert.equal(cell.status, "recorded",
      `the census no longer records ${key} for ${FAMILY_ID} (status ${cell.status}); this packet prints it, so the build stops`);
    const entries = (cell.entries ?? []).map((e) => String(e).trim()).filter((e) => e.length > 0);
    assert.ok(entries.length > 0,
      `the census records ${key} for ${FAMILY_ID} with no non-empty entry; this packet will not print an empty quotation`);
    return entries;
  };

  const laterCompletion = recorded("laterCompletionFields");
  /*
   * The load-bearing record for this family. Part A asks the participant to
   * state which statutory branch their record falls in, and this packet does NOT
   * make that election: the census records the felony/misdemeanour
   * characterisation as a LATER-COMPLETION field for this very route. If that
   * record disappears, the basis for leaving Part A to the participant
   * disappears with it and the build must not simply carry on.
   */
  const characterisation = laterCompletion.find((e) => /felony or misdemeanour characterisation/i.test(e));
  assert.ok(characterisation,
    "the route-obligation census no longer records the felony/misdemeanour characterisation as a later-completion "
    + `field for ${FAMILY_ID}. That record is why this packet leaves the Part A election to the participant, so the `
    + "build refuses rather than rest the refusal on nothing.");

  return {
    routeKeys: routes.map((r) => r.routeKey),
    trackId: route.trackId,
    bothRoutesRecordTheSameFilingFacts: true,
    characterisationIsALaterCompletionField: characterisation,
    laterCompletion,
    filingDestination: recorded("filingDestination"),
    waitingPeriod: recorded("waitingPeriodCalculation"),
    serviceRecipients: recorded("serviceRecipients"),
    serviceMethod: recorded("serviceMethod"),
    feeWaiverTreatment: recorded("feeWaiverTreatment"),
    signatureRequirements: recorded("signatureRequirements"),
    primaryFiling: recorded("primaryOfficialFormOrComposedPleading"),
    notRecorded: Object.entries(route.deliverable ?? {})
      .filter(([, v]) => v?.status !== "recorded").map(([k]) => k).sort()
  };
}

/* ---- source binding --------------------------------------------------------- */
function resolveSource(binding) {
  const searched = [];
  for (const root of CUSTODY_ROOTS) {
    const abs = path.resolve(ROOT, root, binding.declaredPath);
    const exists = fs.existsSync(abs);
    searched.push({ root, absolutePath: abs, exists });
    if (!exists) continue;
    const bytes = fs.readFileSync(abs);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    searched[searched.length - 1].sha256 = sha256;
    if (sha256 !== binding.sha256) continue;
    return {
      bound: true, custodyRoot: root, pathInArchive: binding.declaredPath,
      sha256, byteLength: bytes.length, bytes, searched
    };
  }
  return { bound: false, searched };
}

/* ---- census ----------------------------------------------------------------- */
const flat = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function censusOf(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageText = pages.map((p, i) => ({
    page: i + 1,
    lines: groupIntoLines(extractTextItems(p)).map((l) => ({ y: Math.round(l.y), text: l.text })),
    items: extractTextItems(p).map((it) => ({ x: +it.x.toFixed(2), y: Math.round(it.y), text: it.text }))
  }));

  const lineCarries = (page, y, needle, tolerance = 2) => {
    const lines = pageText.find((p) => p.page === page)?.lines ?? [];
    const near = lines.filter((l) => Math.abs(l.y - y) <= tolerance);
    return { found: near.some((l) => flat(l.text).includes(flat(needle))), linesThere: near.map((l) => l.text) };
  };

  const rows = [];
  const unmapped = [];
  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    const entry = FORM_FIELDS[name];
    const widgets = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const ref = w.P();
      let pi = pages.findIndex((p) => p.ref === ref);
      if (pi < 0) pi = 0;
      let onState = null;
      let appearanceStates = [];
      try {
        const ap = w.dict.lookup(PDFName.of("AP"));
        const n = ap ? ap.lookup(PDFName.of("N")) : null;
        if (n && typeof n.keys === "function") appearanceStates = n.keys().map((k) => k.asString());
        if (typeof w.getOnValue === "function") onState = String(w.getOnValue() ?? "");
      } catch { /* a widget without an /AP is recorded as having none */ }
      return {
        page: pi + 1,
        rect: { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) },
        rectBasis: "acroform_widget_rect_read_first_hand_from_pinned_binary",
        appearanceStates, onState
      };
    });
    if (!entry) { unmapped.push({ field: name, widgets }); continue; }

    let sourceValue = null;
    try {
      if (typeof field.isChecked === "function") sourceValue = field.isChecked() ? "on" : null;
      else if (typeof field.getText === "function") sourceValue = field.getText() ?? null;
    } catch { sourceValue = null; }

    rows.push({
      key: name, name, page: widgets[0]?.page ?? null, widgets, sourceValue,
      rect: widgets[0]?.rect ?? null, rectBasis: widgets[0]?.rectBasis ?? null,
      type: field.constructor.name.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
      isSelectionControl: entry.selection === true || field.constructor.name === "PDFCheckBox",
      multiline: typeof field.isMultiline === "function" ? field.isMultiline() : false,
      maxLength: typeof field.getMaxLength === "function" ? (field.getMaxLength() ?? null) : null,
      section: entry.section, effectiveLabel: entry.label,
      caption: entry.caption, captionAt: entry.captionAt,
      subCaptions: entry.subCaptions ?? null, subCaptionsAt: entry.subCaptionsAt ?? null,
      partANumber: entry.partANumber ?? null, affidavitNumber: entry.affidavitNumber ?? null,
      registryGap: entry.registryGap ?? null,
      policy: entry.policy, fact: entry.fact ?? null,
      refusalClass: entry.refusalClass ?? null, what: entry.what ?? null,
      why: entry.why ?? null, condition: entry.condition ?? null,
      /*
       * What the SHARED registry would have done with this widget's own name,
       * measured rather than assumed. Four boxes on this form resolve to the
       * participant's own legal name, and that is recorded per field.
       */
      sharedRegistryWouldBind: (() => {
        const d = decideBinding({ name, pdfType: field.constructor.name === "PDFTextField" ? "text" : "other", effectiveLabel: null, regionHeading: null }, {});
        return d.writable ? d.factId : null;
      })()
    });
  }

  const dictionaryKeys = new Set(Object.keys(FORM_FIELDS));
  for (const r of rows) dictionaryKeys.delete(r.key);

  const captionDrift = [];
  for (const r of rows) {
    if (!r.captionAt) continue;
    const hit = lineCarries(r.captionAt.page, r.captionAt.y, r.caption);
    if (!hit.found) {
      captionDrift.push({ key: r.key, page: r.captionAt.page, y: r.captionAt.y, caption: r.caption, linesThere: hit.linesThere.slice(0, 2) });
    }
  }

  const anchorDrift = [];
  for (const a of FORM_ANCHORS) {
    const hit = lineCarries(a.page, a.y, a.needle, 3);
    if (!hit.found) anchorDrift.push({ ...a, linesThere: hit.linesThere.slice(0, 2) });
  }

  /*
   * The name box's three sub-captions, re-measured from the binary. They are the
   * evidence for refusing the name box, so they are read rather than asserted.
   */
  const nameRow = rows.find((r) => r.key === "Print");
  const subCaptionDrift = [];
  if (nameRow?.subCaptions) {
    const items = pageText.find((p) => p.page === nameRow.subCaptionsAt.page)?.items ?? [];
    for (const sub of nameRow.subCaptions) {
      const near = items.filter((it) => Math.abs(it.y - nameRow.subCaptionsAt.y) <= 2);
      const joined = flat(near.map((it) => it.text).join(""));
      if (!joined.includes(flat(sub.text))) subCaptionDrift.push({ ...sub, y: nameRow.subCaptionsAt.y, joined: joined.slice(0, 120) });
    }
  }

  return {
    rows, unmapped, stale: [...dictionaryKeys], captionDrift, anchorDrift, subCaptionDrift,
    pageText: pageText.map((p) => ({ page: p.page, lines: p.lines })), pageCount: pages.length
  };
}

/* ---- render ----------------------------------------------------------------- */
async function renderDocument(source, census, fixtureName) {
  const facts = FIXTURES[fixtureName];
  const writeRows = census.rows.filter((r) => r.policy === "write");

  /*
   * Everything that is not one of the five held writes is refused by ROLE. That
   * gate runs before the name channel and is not overridable, which is the only
   * reason this build is safe on a form whose `Fathers Name`, `Mothers Maiden
   * Name`, `HusbandWifes Name` and `AliasMaidenPrevious Name` widgets all bind
   * to participant.full_legal_name in the shared registry.
   *
   * EVERY selection control on this form is in that set. This family serves two
   * statutory routes and no held fact decides between them, so it ticks nothing
   * and passes no selectionsFromHeldFacts at all: a settled-selection channel
   * that is never opened cannot mark a box by accident.
   */
  const unwritableFields = census.rows
    .filter((r) => r.policy !== "write")
    .map((r) => ({ field: r.name }));

  const { bytes, report } = await finalizeOfficialForm({
    sourceBytes: source.bytes,
    expectedSha256: source.sha256,
    census: census.rows.map((r) => ({
      name: r.name, type: r.type, effectiveLabel: r.effectiveLabel, regionHeading: r.section,
      widgets: r.widgets.map((w) => ({ page: w.page, rect: w.rect })),
      multiline: r.multiline === true, maxLength: r.maxLength ?? null
    })),
    facts,
    explicitMappings: Object.fromEntries(writeRows.map((r) => [r.name, r.fact])),
    unwritableFields,
    documentTextLines: census.pageText.flatMap((p) => p.lines.map((l) => l.text)),
    /*
     * This form ships an /Off appearance for every one of its seven boxes, so
     * pdf-lib has no missing state to synthesize a square for. Measured on this
     * source: finalizing with both flags and with neither is byte-identical.
     * They are passed so a later edition that drops an /Off stream does not
     * quietly acquire seven borders the paper does not print.
     */
    suppressSynthesizedAppearances: true,
    suppressSynthesizedWidgetBorders: true,
    title: "Petition to Seal"
  });
  assert.equal((report.selectionsMarked ?? []).length, 0,
    "this family determines no Part A election and must mark no box; the finalizer reported "
    + `${(report.selectionsMarked ?? []).length} settled selection(s)`);
  return { bytes, report };
}

/* ---- byte proof -------------------------------------------------------------- *
 * Read back from the FINALIZED BYTES at every measured widget rectangle.
 *
 * A ticked box on this form draws its mark as a ZapfDingbats glyph — the /Yes
 * appearance is `BT /ZaDb 14.532 Tf ... (4) Tj ET` over the same white fill and
 * stroked square the /Off appearance carries. So the tick IS readable as text,
 * but a text-only reading cannot tell a ticked box from an unticked one whose
 * /Off stream also paints. Both channels are therefore measured: the glyph, and
 * the painting-operator count of the flattened appearance against the SOURCE's
 * own /Off stream for the same widget. A tick that showed on neither channel
 * would be an invisible write however confident the finalizer's report was.
 */
const PAINT_OPS = /(?:^|[\s])(?:re|m|l|c|v|y|h|f\*?|F|B\*?|b\*?|S|s|n|Tj|TJ|'|")(?=[\s]|$)/g;
const inflate = (buf) => { try { return zlib.inflateSync(buf); } catch { return buf; } };

function countPaintOps(streamText) {
  return (String(streamText).match(PAINT_OPS) ?? []).length;
}

/** The source's own /Off appearance stream for a check-box widget, as text. */
async function offAppearanceBaseline(source) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true });
  const ctx = doc.context;
  const baseline = new Map();
  for (const field of doc.getForm().getFields()) {
    if (field.constructor.name !== "PDFCheckBox") continue;
    for (const w of field.acroField.getWidgets()) {
      const ap = ctx.lookup(w.dict.get(PDFName.of("AP")));
      if (!ap) continue;
      const n = ctx.lookup(ap.get(PDFName.of("N")));
      if (!n || typeof n.get !== "function") continue;
      const off = n.get(PDFName.of("Off"));
      if (!off) continue;
      const stream = ctx.lookup(off);
      const body = inflate(Buffer.from(stream.contents)).toString("latin1");
      baseline.set(field.getName(), { paintOps: countPaintOps(body), streamLength: body.length });
    }
  }
  return baseline;
}

/** Every flattened appearance in the artifact, with its own stream body. */
async function flattenedAppearanceBodies(file) {
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  const bodies = new Map();
  for (const page of doc.getPages()) {
    const resources = page.node.get(PDFName.of("Resources"));
    const xObjects = resources && ctx.lookup(resources).get(PDFName.of("XObject"));
    if (!xObjects) continue;
    const dict = ctx.lookup(xObjects);
    for (const key of dict.keys()) {
      const obj = ctx.lookup(dict.get(key));
      if (!obj?.contents) continue;
      bodies.set(key.asString().replace(/^\//, ""), inflate(Buffer.from(obj.contents)).toString("latin1"));
    }
  }
  return bodies;
}

async function byteProof(source, census, artifactFile, fixtureName, report) {
  const widgets = await flattenedWidgets(path.join(ROOT, artifactFile));
  const bodies = await flattenedAppearanceBodies(path.join(ROOT, artifactFile));
  const offBaseline = await offAppearanceBaseline(source);

  const actualWrites = [];
  const selectionsRead = [];
  const refusedFieldsWithInk = [];
  const documentAuthoredAppearances = [];
  let glyphs = 0;

  const writtenByFinalizer = new Set(report.written.map((w) => w.field));

  for (const r of census.rows) {
    for (const wdg of r.widgets) {
      const drawn = drawnAt(widgets, { page: wdg.page, rect: wdg.rect });
      const ink = drawn.map((d) => d.text).filter(Boolean).join("").trim();
      const paintOps = drawn.reduce((n, d) => n + countPaintOps(bodies.get(d.appearance) ?? ""), 0);

      if (r.isSelectionControl) {
        const baseline = offBaseline.get(r.name) ?? null;
        const marked = ink.length > 0 || (baseline !== null && paintOps > baseline.paintOps);
        selectionsRead.push({
          control: r.name, page: wdg.page, rect: wdg.rect,
          glyphChannel: ink, glyphChannelMarked: ink.length > 0,
          paintOpsInOutput: paintOps,
          paintOpsInSourceOffAppearance: baseline?.paintOps ?? null,
          paintOpChannelMarked: baseline === null ? null : paintOps > baseline.paintOps,
          marked, expectedMarked: r.policy === "route_tick"
        });
        if (marked && r.policy === "route_tick") glyphs += ink.length;
        if (marked && r.policy !== "route_tick") {
          refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: [ink], paintOps, why: "a selection control this route does not make is marked in the output" });
        }
        continue;
      }

      if (ink.length === 0) continue;
      if (r.sourceValue !== null && r.sourceValue !== undefined && !writtenByFinalizer.has(r.name)) {
        documentAuthoredAppearances.push({ field: r.key, page: wdg.page, rect: wdg.rect, drawnText: [ink], sourceValue: r.sourceValue });
        continue;
      }
      if (!writtenByFinalizer.has(r.name)) {
        refusedFieldsWithInk.push({ fieldId: r.key, page: wdg.page, drawnText: [ink] });
        continue;
      }
      glyphs += ink.length;
      actualWrites.push({ field: r.key, factId: r.fact, page: wdg.page, rect: wdg.rect, drawnText: [ink] });
    }
  }

  return {
    fixture: fixtureName,
    proofMethod:
      "every measured widget /Rect of the finalized bytes is read twice: the flattened appearance's show-text "
      + "operators, and its painting-operator count against the SOURCE's own /AP /N /Off stream for the same widget. "
      + "A ticked box on this form draws a ZapfDingbats glyph over the same square the /Off state paints, so a "
      + "text-only reading alone could not tell a made election from an unmade one.",
    actualWrites, selectionsRead, refusedFieldsWithInk, documentAuthoredAppearances,
    glyphs, appearances: widgets.length
  };
}

/* ---- the refusals the finalizer measured ------------------------------------- */
/**
 * A value the form's own geometry will not take.
 *
 * Two shapes, one meaning. The fitter reports a width refusal in
 * report.unfittable; a /MaxLen refusal arrives in report.refused with reason
 * value_exceeds_form_max_length and never reaches the unfittable list at all. A
 * build that read only the first would declare a write that did not happen —
 * which is the defect VF01 measured on the New Hampshire annulment set.
 */
function geometryRefusalsOf(report) {
  const out = new Map();
  for (const u of report.unfittable ?? []) {
    out.set(u.field, {
      field: u.field, factId: u.factId ?? null, kind: "width",
      reason: u.reason ?? "value_does_not_fit_the_widget_at_a_readable_size",
      measurement: { outcome: u.outcome ?? null, fontSize: u.fontSize ?? null, minFontSize: u.minFontSize ?? null }
    });
  }
  for (const r of report.refused ?? []) {
    if (r.reason !== "value_exceeds_form_max_length") continue;
    out.set(r.field, {
      field: r.field, factId: r.factId ?? null, kind: "max_length",
      reason: r.reason,
      measurement: { declaredMaxLength: r.maxLength ?? null, valueLength: r.valueLength ?? null }
    });
  }
  return out;
}

/* ---- field map ---------------------------------------------------------------- */
function sideOf(census, report, fixtureName) {
  const written = new Set(report.written.map((w) => w.field));
  const geometry = geometryRefusalsOf(report);
  const writes = [];
  const refusals = [];
  const selectionControls = [];

  for (const r of census.rows) {
    const base = {
      field: `${DOCUMENT_ID}/${r.key}`,
      fieldName: `${DOCUMENT_ID}/${r.key}`,
      acroFieldName: r.name,
      page: r.page, rect: r.rect, rectBasis: r.rectBasis,
      printedLabel: r.caption, printedLine: r.caption,
      sectionHeading: r.section, regionHeading: r.effectiveLabel,
      effectiveLabel: r.effectiveLabel, captionReadAt: r.captionAt,
      captionBasis:
        "printed caption re-read from the pinned binary at captionReadAt as a flattened substring of the printed line "
        + "there; the build refuses on drift",
      sharedRegistryWouldBind: r.sharedRegistryWouldBind,
      document: DOCUMENT_ID
    };

    /*
     * A Part A branch this family reaches but the ROUTE does not decide.
     *
     * The contract's own exception: an election the CASE determines is not an
     * election the route determines, and a family may say so provided it says
     * WHY the route cannot decide it. Both keys travel as typed data —
     * determinedByTheCaseNotTheRoute and whyTheRouteCannotDetermineIt — because
     * a counter that could only be cleared by guessing which statutory branch a
     * participant's own record falls in would be pressure to tick a box on a
     * sworn petition on no evidence.
     */
    if (r.policy === "case_determined") {
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type,
        widgets: r.widgets, disposition: "explicit_refusal",
        reason: `the participant states this before filing: ${r.what}`,
        category: null, completenessClass: null, class: null,
        completenessDisposition: "REQUIRED_BEFORE_FILING",
        requiredBeforeFiling: true, identity: `${DOCUMENT_ID} field ${r.key}`,
        factId: null, routeDetermined: false,
        determinedByTheCaseNotTheRoute: true,
        whyTheRouteCannotDetermineIt: r.why,
        partANumber: r.partANumber ?? null, affidavitNumber: r.affidavitNumber ?? null,
        why: r.why, participantMustSupply: r.what
      });
      continue;
    }

    if (r.policy === "election") {
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type,
        widgets: r.widgets, disposition: "explicit_refusal",
        reason: r.why, category: PARTICIPANT_ELECTION,
        completenessClass: PARTICIPANT_ELECTION, class: PARTICIPANT_ELECTION,
        requiredBeforeFiling: false, routeDetermined: false,
        affidavitNumber: r.affidavitNumber ?? null, why: r.why
      });
      continue;
    }

    if (r.policy === "write") {
      if (written.has(r.name)) {
        writes.push({ ...base, factId: r.fact, kind: r.type, writeChannel: "finalizer_descriptor_channel" });
        continue;
      }
      const g = geometry.get(r.name);
      if (g) {
        const held = FIXTURES[fixtureName][r.fact] ?? null;
        /* The measurement, in the form's own units, rather than a sentence that
         * merely says a value did not fit. */
        const measuredWhy = g.kind === "max_length"
          ? `the form limits this box to ${g.measurement.declaredMaxLength} characters and the value held for you is `
            + `${g.measurement.valueLength}`
          : `the box the form prints is ${r.rect?.width ?? "?"} points wide and the value held for you is `
            + `${held === null ? "?" : String(held).length} characters, which will not fit inside it even at the `
            + `smallest size that stays readable (${g.measurement.minFontSize ?? "?"} point)`;
        refusals.push({
          ...base,
          reason: `the value this ${fixtureName} participant holds will not fit the box the form prints: ${measuredWhy}`,
          measuredWhy,
          category: null, completenessClass: null, class: null,
          disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
          requiredBeforeFiling: true, identity: `${DOCUMENT_ID} field ${r.key}`,
          factId: r.fact ?? null, routeDetermined: false,
          heldButNotPrinted: true, heldValue: FIXTURES[fixtureName][r.fact] ?? null,
          geometryRefusal: g, widgetRect: r.rect,
          why:
            "the packet refuses the write rather than shortening it: a value the form's own geometry will not hold is "
            + "left blank and named to the participant, never printed in part",
          participantMustSupply:
            `write this in by hand — the platform holds it but this box will not take it whole. `
            + `The complete value is: ${FIXTURES[fixtureName][r.fact] ?? "(not held)"}. Never shorten your own `
            + "details to fit a box; if it will not fit, write it as far as it goes and attach the rest."
        });
        continue;
      }
      refusals.push({
        ...base,
        reason: `the finalizer refused this write and the packet does not claim a value it did not draw: ${JSON.stringify((report.refused ?? []).filter((x) => x.field === r.name))}`,
        category: null, completenessClass: null, class: null,
        requiredBeforeFiling: false,
        why: "reported rather than claimed, so the defect is visible to the audit"
      });
      continue;
    }

    if (r.policy === "off_route") {
      selectionControls.push({
        ...base, selectionId: base.field, kind: "selection_control", type: r.type,
        widgets: r.widgets, disposition: "explicit_refusal",
        reason: r.condition, category: null, completenessClass: null, class: null,
        completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
        routeConditionThatMakesItInapplicable: r.condition,
        requiredBeforeFiling: false, routeDetermined: false,
        partANumber: r.partANumber ?? null, affidavitNumber: r.affidavitNumber ?? null,
        why: r.condition
      });
      continue;
    }

    if (r.policy === "protect") {
      refusals.push({
        ...base, reason: r.why, category: r.refusalClass,
        completenessClass: r.refusalClass, class: r.refusalClass,
        requiredBeforeFiling: false, why: r.why
      });
      continue;
    }

    refusals.push({
      ...base,
      reason: `the participant supplies this before filing: ${r.what}`,
      category: null, completenessClass: null, class: null,
      disposition: "REQUIRED_BEFORE_FILING", completenessDisposition: "REQUIRED_BEFORE_FILING",
      requiredBeforeFiling: true, identity: `${DOCUMENT_ID} field ${r.key}`,
      factId: null, routeDetermined: false,
      ...(r.registryGap ? { sharedRegistryWouldHaveWritten: r.registryGap } : {}),
      ...(r.subCaptions
        ? {
          measurement: {
            widgetRect: r.rect, widgetCount: r.widgets.length,
            printedSubCaptions: r.subCaptions, subCaptionsAt: r.subCaptionsAt,
            heldNameParts: {
              last: "participant.last_name", first: "participant.first_name", middle: "participant.middle_name"
            }
          }
        }
        : {}),
      why: `the platform holds no value it may write here and the participant supplies it before filing: ${r.what}`,
      participantMustSupply: r.what
    });
  }

  return { writes, refusals, selectionControls };
}

function mapFor(census, canonicalReport, boundaryReport, route) {
  const canonical = sideOf(census, canonicalReport, "canonical");
  const boundary = sideOf(census, boundaryReport, "boundary");
  return {
    formNumber: DOCUMENT_ID, documentId: DOCUMENT_ID, documentRole: "primary_filing",
    documentPolicy: { mode: "participant", captionOnly: false, documentAcceptsFill: true, routeKeys: route.routeKeys },
    structuralClass: "acroform",
    explicitMappings: Object.fromEntries(census.rows.filter((r) => r.policy === "write").map((r) => [r.name, r.fact])),
    roleRefusals: [],
    selectionControls: canonical.selectionControls,
    canonicalWrites: canonical.writes, canonicalRefusals: canonical.refusals,
    boundaryWrites: boundary.writes, boundaryRefusals: boundary.refusals
  };
}

/* ---- the builder's own count of the nine counters ------------------------------ */
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
      routeConditionThatMakesItInapplicable: r.routeConditionThatMakesItInapplicable ?? null,
      determinedByTheCaseNotTheRoute: r.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt ?? null,
      identity: r.identity ?? null, factId: r.factId ?? null
    }
  });

  const writes = maps.flatMap((m) => m.canonicalWrites.map((w) => row(w)));
  const blanks = maps.flatMap((m) => [
    ...m.canonicalRefusals.map((r) => row(r)),
    ...m.selectionControls.map((c) => row(c, true))
  ]);

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
    /* A route election this packet claims to make and no fixture actually marks
     * is an election that exists only in the map. */
    for (const s of p.selectionsRead ?? []) {
      if (s.expectedMarked && !s.marked) {
        note("requiredOptionsMissing", { fixture: p.fixture, field: s.control, why: "the packet declares this route election and the output bytes carry no mark at its rectangle" });
      }
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

/* ---- artifacts ------------------------------------------------------------------ */
function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Every blank this packet declares required before filing, from BOTH shapes.
 *
 * On this family three of them are SELECTION CONTROLS — the Part A branch boxes
 * — because the participant states which statutory branch their record falls
 * in. A disclosure list built only from the refusal rows would have left all
 * three out of participant-instructions.md while the field map went on
 * declaring them required, which is precisely what requiredFactsNotCollected
 * counts.
 */
function requiredBeforeFilingItems(maps, side = "canonical") {
  const rows = maps.flatMap((m) => [
    ...m[side === "canonical" ? "canonicalRefusals" : "boundaryRefusals"],
    ...m.selectionControls
  ]);
  return rows
    .filter((r) => r.requiredBeforeFiling === true)
    .map((r) => ({
      document: DOCUMENT_ID, field: r.field, page: r.page, rect: r.rect,
      section: r.sectionHeading, disclosureLabel: r.effectiveLabel,
      identity: r.identity, why: r.why, participantMustSupply: r.participantMustSupply,
      isSelectionControl: r.kind === "selection_control",
      ...(r.partANumber ? { partANumber: r.partANumber } : {}),
      ...(r.determinedByTheCaseNotTheRoute
        ? { determinedByTheCaseNotTheRoute: true, whyTheRouteCannotDetermineIt: r.whyTheRouteCannotDetermineIt }
        : {}),
      ...(r.measuredWhy ? { measuredWhy: r.measuredWhy } : {}),
      ...(r.heldButNotPrinted ? { heldButNotPrinted: true, heldValue: r.heldValue, geometryRefusal: r.geometryRefusal } : {}),
      ...(r.sharedRegistryWouldHaveWritten ? { sharedRegistryWouldHaveWritten: r.sharedRegistryWouldHaveWritten } : {})
    }))
    .sort((a, b) => (a.page - b.page) || ((b.rect?.y ?? 0) - (a.rect?.y ?? 0)));
}

/*
 * A recorded entry, quoted as the record's own words.
 *
 * The census stores several of these as multi-part strings joined by embedded
 * newlines ("agency \n Office of the Commissioner of Probation \n ..."), which
 * render as a broken line inside an italic quotation. Runs of whitespace are
 * collapsed to a single separator; not one word is changed, added or dropped.
 * The value is asserted non-empty because a quotation presented as the record
 * speaking, with nothing inside it, is worse than no quotation at all.
 */
function quote(entry, what) {
  const text = String(entry ?? "").replace(/\s*\n\s*/g, " — ").replace(/\s+/g, " ").trim();
  assert.ok(text.length > 0, `the route record's ${what} is empty and this packet will not print an empty quotation`);
  return text;
}

function participantInstructions(maps, rbf, boundaryOnlyRbf, route, source, census) {
  const controls = maps.flatMap((m) => m.selectionControls);
  const partA = controls.filter((c) => c.requiredBeforeFiling === true).sort((a, b) => a.partANumber - b.partANumber);
  const affidavits = controls.filter((c) => c.category === PARTICIPANT_ELECTION).sort((a, b) => a.affidavitNumber - b.affidavitNumber);
  const offRoute = controls.filter((c) => c.routeConditionThatMakesItInapplicable);
  const filingOffice = FORM_ANCHORS.find((a) => a.id === "filing-office").needle;
  const nonBoxRbf = rbf.filter((r) => !r.isSelectionControl);

  const out = [];
  out.push("# Filing instructions — seal a Massachusetts adult conviction or juvenile record", "");
  out.push(
    "This packet is the Massachusetts Office of the Commissioner of Probation's **PETITION TO SEAL** (form footer "
    + "`OCP 4/12`). It is one page, and it goes to one office — no court, no docket, no caption.", ""
  );

  out.push("## The one decision only you can make", "");
  out.push(
    "Part A of the petition offers four boxes, and **you must tick the one your own record fits.** This packet has "
    + "deliberately ticked **none** of them, and you should know why: this petition covers **two** different "
    + "routes — sealing an **adult conviction** under G.L. c. 276 § 100A, and sealing a **juvenile record** under "
    + "§ 100B — and which one you are on, and whether your offence counts as a misdemeanor or a felony, are facts "
    + "about your record that the platform has never seen.", ""
  );
  out.push(
    "The repository's own route record treats that question the same way. It lists the "
    + `**felony or misdemeanour characterisation** as something completed later: _"`
    + `${quote(route.characterisationIsALaterCompletionField, "later-completion field")}"_`, ""
  );
  out.push(
    "**A packet that guessed here would be guessing on a document you sign under the penalties of perjury.** So the "
    + "box is yours. Use the table below to find yours.", ""
  );

  out.push("### Which box, and how long you must have waited", "");
  out.push("| Tick this box | It covers | What to do next |", "| --- | --- | --- |");
  for (const c of partA) {
    /* The blank is named by the WHOLE label the field map declares it under, not
     * a prettier short form of it. The disclosure that makes a
     * required-before-filing blank permissible is a disclosure a reader can
     * match back to the map, and a trimmed caption is not that. */
    out.push(`| **Box ${c.partANumber}** | ${c.effectiveLabel} | ${c.participantMustSupply} |`);
  }
  out.push("");
  out.push(
    "The waiting periods the route record sets out — read these against your own record before you tick anything:", ""
  );
  out.push("| The kind of record | How long |", "| --- | --- |");
  for (const entry of route.waitingPeriod) {
    const text = quote(entry, "waiting period entry");
    const [kind, ...rest] = text.split(" — ");
    out.push(`| ${kind} | ${rest.join(" — ") || "see the record"} |`);
  }
  out.push("");

  out.push("### Then sign the matching affidavit", "");
  out.push(
    "The petition's printed instruction reads **\"SELECT appropriate box(es). If 1, 2, or 3 are selected you must "
    + "sign the corresponding numbered Affidavit below.\"** Whichever Part A box you tick, tick and sign the "
    + "**numbered affidavit with the same number** underneath. Each affidavit is a sworn statement about your own "
    + "record, which is why this packet leaves every one of them to you:", ""
  );
  out.push("| The affidavit | It answers |", "| --- | --- |");
  for (const c of affidavits) out.push(`| Affidavit ${c.affidavitNumber} | ${c.effectiveLabel.replace(/^Numbered Affidavit \d+ — the affidavit that answers /, "").replace(/ \(selection\)$/, "")} |`);
  out.push("");
  out.push("**Do not tick more than one Part A box unless more than one is genuinely true of your record**, and sign every affidavit you tick.", "");

  if (offRoute.length > 0) {
    out.push("### One box that is not for this petition", "");
    out.push("| The box | Why it is not yours here |", "| --- | --- |");
    for (const c of offRoute) out.push(`| ${c.effectiveLabel} | ${c.reason} |`);
    out.push("");
  }

  out.push("## Where it goes", "");
  out.push(`The petition is addressed on its own face: **${filingOffice}**.`, "");
  const officeEntry = route.filingDestination.find((e) => /Commissioner of Probation/i.test(e));
  assert.ok(officeEntry, "the route record no longer names the Office of the Commissioner of Probation as the filing destination");
  out.push(
    `The route record names the same office: _"${quote(officeEntry, "filing destination")}"_ It records the court `
    + "and caption question as not applicable, because on this route there is no court and no caption — one filing "
    + "to one office covers the whole Massachusetts record.", ""
  );

  out.push("## Service, fees and hearings", "");
  const recipients = quote(route.serviceRecipients[0], "service recipients");
  const method = quote(route.serviceMethod[0], "service method");
  out.push(
    "- **Who you must serve: nobody.** The route record answers both the recipient and the method question "
    + (recipients === method ? `with the same two words — _"${recipients}"_` : `_"${recipients}"_ and _"${method}"_`)
    + ". You send the petition to the Commissioner's office and to no one else."
  );
  out.push(`- **Fee waiver:** _"${quote(route.feeWaiverTreatment[0], "fee waiver treatment")}"_`);
  out.push(
    "- **Filing fee:** the route record does not record one and this form prints none, so **no amount is stated "
    + "here**. Ask the Office of the Commissioner of Probation — the same office the petition goes to — whether any "
    + "fee applies. An unsourced figure in a filing instruction is worse than none."
  );
  out.push("- **Hearing:** the route record does not record a hearing step for these routes, and none is stated here.");
  out.push("");

  out.push("## What you must do, in order", "");
  out.push("1. **Tick the one Part A box your record fits** — box 1, 2 or 3, using the tables above.");
  out.push("2. **Fill in every item in the table below**, from your own papers.");
  out.push("3. **Tick and sign the numbered affidavit with the same number as your Part A box.**");
  out.push("4. **Sign the petition** on the `Petitioner's Signature` line. "
    + `The route record: _"${quote(route.signatureRequirements[0], "signature requirements")}"_`);
  out.push("5. **Write nothing below the line that reads `PETITIONER NOT TO WRITE BELOW THIS LINE`.** That block is the Commissioner's.");
  out.push(`6. **Send it to ${filingOffice}.**`);
  out.push("");

  out.push("## What this packet already filled in", "");
  out.push("| Page | The blank on the form | What it says |", "| --- | --- | --- |");
  for (const w of maps.flatMap((m) => m.canonicalWrites).filter((w) => w.factId)) {
    out.push(`| ${w.page} | ${w.effectiveLabel} | from the details you gave the platform |`);
  }
  out.push("");
  out.push("**Check every one of them against your own papers before you sign.** You are signing the petition, not the platform.", "");

  out.push("## The blanks you must complete", "");
  out.push("| Page | The blank on the form | What to write |", "| --- | --- | --- |");
  for (const i of nonBoxRbf) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.participantMustSupply} |`);
  out.push("");

  if (boundaryOnlyRbf.length > 0) {
    out.push("## Blanks the form itself is too small for", "");
    out.push(
      "On some records a detail the platform holds is longer than the box the form prints for it. The packet leaves "
      + "that box **blank rather than shortening what you told us** — a shortened address on a sworn petition reads "
      + "as a complete one. If any of these is blank on your copy, write it in by hand:", ""
    );
    out.push("| Page | The blank on the form | Why it is blank |", "| --- | --- | --- |");
    for (const i of boundaryOnlyRbf) out.push(`| ${i.page} | ${i.disclosureLabel} | ${i.measuredWhy ?? i.why} |`);
    out.push("");
  }

  out.push("## What the platform did not fill in, and why", "");
  out.push(
    "- **Your name.** The form gives `Last Name`, `First Name` and `Middle Name` three separate captions but only "
    + "**one** box to write them in. A single box takes one value written from its left edge, so anything the "
    + "platform wrote would sit under `Last Name` whatever it contained. Print your name yourself, in the three "
    + "captions' order."
  );
  out.push(
    "- **Alias/maiden/previous name, your father's name, your mother's maiden name, your husband's or wife's name.** "
    + "The platform does not collect any of them. It also refused to let its own field matcher fill them: that "
    + "matcher resolves all four of those boxes to **your own legal name**, which on a petition you sign would be "
    + "false."
  );
  out.push("- **Your Social Security number.** The platform does not hold it and does not print government identifiers on any form.");
  out.push("- **Occupation and place of birth.** The platform does not collect either.");
  out.push("- **Your signature and the affidavit signatures.** You sign; the platform never signs for you.");
  out.push("");

  out.push("## What this packet is not", "");
  out.push(
    "This is a prepared copy of an official Massachusetts form. It is not legal advice, it is not filed for you, and "
    + "it does not decide whether your record can be sealed — the Commissioner of Probation decides that."
  );
  out.push("");
  out.push(
    `_Routes: ${route.routeKeys.join(" · ")} · form ${DOCUMENT_ID}, SHA-256 ${source.sha256} · `
    + `${census.rows.length} widgets read from the pinned binary_`
  );
  return `${out.join("\n")}\n`;
}

/* ---- the entry point --------------------------------------------------------------- */
export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const skipRaster = argv.includes("--no-raster");

  const binding = queueBinding();
  const source = resolveSource(binding);
  if (!source.bound) {
    return {
      familyId: FAMILY_ID, status: "STOPPED", stopReason: "BLOCKED_SOURCE",
      failedSourceIdentities: [{
        sourceId: binding.sourceId, declaredPath: binding.declaredPath, declaredSha256: binding.sha256,
        mountsSearched: source.searched
      }],
      why: "the source did not bind by exact SHA-256 in any mounted custody root, so nothing may be rendered from it",
      counters: null, overlayDirectoryTouched: false
    };
  }

  const route = routeRecord();
  const census = await censusOf({ ...source, ...binding });

  assert.equal(census.unmapped.length, 0,
    `${census.unmapped.length} widget(s) carry no dictionary entry: ${JSON.stringify(census.unmapped.map((u) => u.field))}`);
  assert.equal(census.stale.length, 0,
    `the dictionary names ${census.stale.length} field(s) this form does not have: ${JSON.stringify(census.stale)}`);
  assert.equal(census.captionDrift.length, 0,
    `a recorded caption is no longer printed where the dictionary says: ${JSON.stringify(census.captionDrift, null, 2)}`);
  assert.equal(census.anchorDrift.length, 0,
    `a form-level sentence this family reasons from is no longer printed: ${JSON.stringify(census.anchorDrift, null, 2)}`);
  assert.equal(census.subCaptionDrift.length, 0,
    `the name box's printed sub-captions moved, and they are the evidence for refusing it: ${JSON.stringify(census.subCaptionDrift, null, 2)}`);

  /*
   * This family makes NO Part A election, so the assertion is the mirror of the
   * decrim family's: the dictionary must declare no tick, and every one of the
   * form's seven boxes must be left to the participant. A box that quietly
   * became route-determined here would be a statutory claim about a record the
   * platform has never seen.
   */
  const tickRows = census.rows.filter((r) => r.policy === "route_tick");
  assert.equal(tickRows.length, 0,
    `this family serves ${ROUTE_KEYS.length} statutory routes and no held fact decides between them, so it ticks `
    + `nothing; the dictionary declares ${tickRows.length} route tick(s)`);
  const boxes = census.rows.filter((r) => r.isSelectionControl);
  assert.equal(boxes.length, 7, `this form carries 7 selection controls and the census read ${boxes.length}`);
  for (const b of boxes) {
    assert.ok(["case_determined", "election", "off_route"].includes(b.policy),
      `${b.name} carries policy ${b.policy}; every box on this family is the participant's or off this route`);
  }

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      sourceSha256: source.sha256, custodyRoot: source.custodyRoot,
      fields: census.rows.length,
      writes: census.rows.filter((r) => r.policy === "write").length,
      routeTicks: 0,
      caseDetermined: census.rows.filter((r) => r.policy === "case_determined").length,
      elections: census.rows.filter((r) => r.policy === "election").length,
      supply: census.rows.filter((r) => r.policy === "supply").length,
      offRoute: census.rows.filter((r) => r.policy === "off_route").length,
      protected: census.rows.filter((r) => r.policy === "protect").length,
      registryGaps: census.rows.filter((r) => r.registryGap).map((r) => ({ field: r.name, wouldBind: r.sharedRegistryWouldBind }))
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const writeProofs = [];
  const rasterPages = [];
  const reports = {};
  let sanitationSample = null;

  for (const fixtureName of ["canonical", "boundary"]) {
    const { bytes, report } = await renderDocument({ ...source, ...binding }, census, fixtureName);
    reports[fixtureName] = report;
    sanitationSample = report.sanitation ?? sanitationSample;

    const file = `${OUT}/fixtures/${fixtureName}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), bytes);

    const proof = await byteProof({ ...source, ...binding }, census, file, fixtureName, report);
    writeProofs.push({
      fixture: fixtureName, formNumber: DOCUMENT_ID, sourceSha256: source.sha256,
      proofMethod: proof.proofMethod,
      valuesReportedByFinalizer: report.written.length,
      flattenedWidgetAppearancesReadFromOutputBytes: proof.appearances,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: 0,
      refusedFieldsWithInk: proof.refusedFieldsWithInk,
      documentAuthoredAppearances: proof.documentAuthoredAppearances,
      selectionsRead: proof.selectionsRead,
      geometryRefusals: [...geometryRefusalsOf(report).values()],
      unfittable: report.unfittable,
      actualWrites: proof.actualWrites
    });

    const packetDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    artifacts.push({
      fixture: fixtureName, file,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.length, pageCount: packetDoc.getPageCount(),
      pageManifest: packetDoc.getPageIndices().map((i) => ({
        packetPage: i + 1, component: "primary_filing", documentId: DOCUMENT_ID,
        sourcePage: i + 1, sourceSha256: source.sha256
      })),
      documents: ["primary_filing", DOCUMENT_ID]
    });

    if (!skipRaster) {
      const rasterDir = `${OUT}/raster/${fixtureName}`;
      fs.mkdirSync(path.join(ROOT, rasterDir), { recursive: true });
      for (let i = 0; i < packetDoc.getPageCount(); i += 1) {
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
          engine: "chromium_calibrated_scripts_raster_pdf_page_raster",
          sha256: crypto.createHash("sha256").update(fs.readFileSync(png)).digest("hex")
        });
      }
    }
  }

  const maps = [mapFor(census, reports.canonical, reports.boundary, route)];
  const rbf = requiredBeforeFilingItems(maps, "canonical");
  const boundaryRbf = requiredBeforeFilingItems(maps, "boundary");
  const canonicalFields = new Set(rbf.map((r) => r.field));
  const boundaryOnlyRbf = boundaryRbf.filter((r) => !canonicalFields.has(r.field));

  const instructionsText = participantInstructions(maps, rbf, boundaryOnlyRbf, route, source, census);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), instructionsText);

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1", familyId: FAMILY_ID, worklistGroupId: FAMILY_ID,
    jurisdiction: "MA", implementationStrategy: "official_pdf_fill",
    custodyClass: "SOURCE_ALREADY_HELD", acquisitionCommissioned: false,
    networkAcquisitionsMade: 0,
    bindingMethod:
      "the MASTER_QUEUE row's own declared path and SHA-256, read at build time, matched byte-for-byte against the "
      + "first mounted custody root that holds it; a second independently asserted digest in the builder must agree",
    routeKeys: route.routeKeys,
    statutoryAuthority: "G.L. c. 276, § 100A (adult conviction sealing) and § 100B (juvenile record sealing)",
    allSourcesExact: true,
    custodyRootsSearched: source.searched.map((s) => ({ root: s.root, exists: s.exists, sha256: s.sha256 ?? null })),
    custodyRootUsed: source.custodyRoot,
    documents: [{
      sourceIds: [binding.sourceId], documentId: DOCUMENT_ID, formNumber: DOCUMENT_ID,
      officialFormFamily: binding.officialFormFamily,
      pathInArchive: binding.declaredPath, sha256: source.sha256, byteLength: source.byteLength,
      instrumentKind: "primary_filing", pageCount: census.pageCount, acroFieldCount: census.rows.length,
      editionFooterPrintedOnTheForm: "OCP 4/12"
    }],
    custodyRecordDisagreement: {
      finding:
        "SOURCE_READY_BUILDABILITY.json and the MASTER_QUEUE row both classify this family "
        + `custodyClass ${JSON.stringify(binding.custodyClassInQueue)} with documentSourcesResolved 0, while the `
        + "declared path holds the declared digest exactly.",
      basis:
        "That record says of itself that its two comparison arrays match manifest officialFormId strings against "
        + "bound sourceId strings, that the vocabularies differ for the same document, and that a name there is a "
        + "prompt to look rather than a finding. This build looked: the bytes bind.",
      consequence: "recorded for whoever owns the custody scalar; the source is in custody and this family built on it"
    },
    sanitationObserved: sanitationSample ? {
      xfaPresentInInput: sanitationSample.xfaPresentInInput ?? null,
      xfaRemoved: sanitationSample.xfaRemoved ?? null,
      synthesizedAppearancesSuppressed: sanitationSample.synthesizedAppearancesSuppressed ?? null,
      synthesizedWidgetBordersSuppressed: sanitationSample.synthesizedWidgetBordersSuppressed ?? null
    } : null,
    sourceBinaryCommitted: false, commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "that OCP 4/12 is the current published edition of the Petition to Seal — no freshness review has been done here",
      "that any output is approved for participant delivery",
      "that any record is eligible for sealing under G.L. c. 276, § 100A"
    ]
  });

  writeJson(`${OUT}/field-census.census-v1.json`, {
    schemaVersion: "rcap-official-form-field-census/v1-census-v1", familyId: FAMILY_ID,
    captionBasis:
      "Every caption was re-read from the pinned binary at its recorded coordinate before anything rendered. This "
      + "form's text stream interleaves neighbouring runs — 'Section - Chapter 276. F 100Asentence elements of welony "
      + "cases' is one printed line — so each recorded caption is a substring that survives the interleaving, matched "
      + "flattened at its own recorded line only.",
    formLevelAnchors: FORM_ANCHORS,
    documents: [{
      documentId: DOCUMENT_ID, formNumber: DOCUMENT_ID, sourceSha256: source.sha256,
      pageCount: census.pageCount, fieldCount: census.rows.length,
      fields: census.rows.map((r) => ({
        field: r.key, page: r.page, rect: r.rect, rectBasis: r.rectBasis, pdfType: r.type,
        isSelectionControl: r.isSelectionControl, multiline: r.multiline, maxLength: r.maxLength,
        appearanceStates: r.widgets[0]?.appearanceStates ?? [],
        section: r.section, effectiveLabel: r.effectiveLabel,
        printedCaption: r.caption, captionReadAt: r.captionAt,
        printedSubCaptions: r.subCaptions, subCaptionsReadAt: r.subCaptionsAt,
        policy: r.policy, factId: r.fact,
        sourceShippedValue: r.sourceValue,
        sharedRegistryWouldBind: r.sharedRegistryWouldBind
      }))
    }]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1", familyId: FAMILY_ID,
    routeKeys: route.routeKeys, renderStrategy: "acroform_fill",
    jurisdiction: "MA",
    statutoryAuthority: "G.L. c. 276, § 100A (adult conviction sealing) and § 100B (juvenile record sealing)",
    officialForm: DOCUMENT_ID, assignedOfficialForm: binding.officialFormFamily,
    officialFormMatchesAssignment: true,
    captionBasis: "printed captions re-read from the pinned binary at recorded coordinates; see field-census.census-v1.json",
    dispositionVocabulary: [SIGNATURE, PARTICIPANT_ELECTION],
    routeDeterminedSelections: [],
    routeSelectionNote:
      "Part A of this form is a four-way statutory fork and THIS FAMILY DOES NOT MAKE THE ELECTION, which is a "
      + "finding rather than an omission. The family is two routes at once — adult conviction sealing under G.L. "
      + "c. 276 § 100A and juvenile record sealing under § 100B — and Part A boxes 1, 2 and 3 separate them by facts "
      + "about the participant's own record: whether the case was juvenile or adult, and whether the offence was a "
      + "misdemeanour or a felony. The route-obligation census records that second question as a LATER-COMPLETION "
      + "field for this route where it cannot be ascertained, which is the recorded basis for leaving it to the "
      + "participant. All three are declared required-before-filing under the contract's determinedByTheCaseNotTheRoute "
      + "exception, with the reason stated, and all three are disclosed in participant-instructions.md together with "
      + "the waiting-period table the census records. Part A box 4 belongs to a different track "
      + "(obligation:track-only:MA:ma-seal-decrim) and carries a named route condition instead.",
    whyNoElectionIsMade:
      "A packet built for ONE statutory route must state which route it is. This packet is built for two, and no held "
      + "fact chooses between them; ticking one would be a statutory claim about a record the platform has not seen, "
      + "on a petition signed under the penalties of perjury.",
    requiredBeforeFilingCount: rbf.length, requiredBeforeFiling: rbf,
    boundaryOnlyRequiredBeforeFiling: boundaryOnlyRbf,
    maps, generationAllowed: false, runtimeSelectable: false, commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1", familyId: FAMILY_ID, renderedFresh: true,
    componentSet: ["primary_filing"],
    componentSetBasis:
      `the route-obligation census records both routes' deliverable as ${JSON.stringify(route.primaryFiling)} and `
      + "records no proposed order, cover sheet, notice, certificate of service or separate affidavit for it",
    artifacts, packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents })),
    everyPageRastered: rasterPages.length === artifacts.reduce((n, a) => n + a.pageCount, 0),
    byteDerivedHashes: true,
    rasterEngine: skipRaster ? null : RASTER_ENGINE, rasterSkipped: skipRaster, rasterPages,
    fixturesAreByteIdentical: artifacts.length === 2 && artifacts[0].sha256 === artifacts[1].sha256,
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1", familyId: FAMILY_ID, derivedFromArtifactBytes: true,
    note:
      "Read back from the finalized PDF bytes at every measured widget rectangle, not from the finalizer's own "
      + "report. Selection controls are read on TWO channels because this form's ticked appearance is a ZapfDingbats "
      + "glyph drawn over the same square its unticked appearance paints.",
    documents: writeProofs,
    artifacts: writeProofs.map((p) => ({
      fixture: p.fixture, formNumber: p.formNumber,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      refusedFieldsWithInk: p.refusedFieldsWithInk,
      selections: p.selectionsRead.filter((s) => s.marked).map((s) => ({ control: s.control, page: s.page })),
      written: p.actualWrites.map((w) => ({ field: w.field, factId: w.factId }))
    })),
    blockingFindings: writeProofs.flatMap((p) => p.refusedFieldsWithInk.map((r) => ({
      fixture: p.fixture, field: r.fieldId, finding: "a field the map refused carries ink in the output"
    })))
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1", familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    boundaryOnlyRequiredBeforeFiling: boundaryOnlyRbf,
    partAElectionsTheParticipantMakes: maps.flatMap((m) => m.selectionControls
      .filter((c) => c.requiredBeforeFiling === true)
      .map((c) => ({
        document: DOCUMENT_ID, field: c.field, page: c.page, label: c.effectiveLabel,
        partANumber: c.partANumber ?? null,
        participantMustSupply: c.participantMustSupply,
        whyTheRouteCannotDetermineIt: c.whyTheRouteCannotDetermineIt
      }))),
    participantElections: maps.flatMap((m) => m.selectionControls
      .filter((c) => c.category === PARTICIPANT_ELECTION)
      .map((c) => ({ document: DOCUMENT_ID, field: c.field, page: c.page, label: c.effectiveLabel, why: c.why }))),
    notApplicableOnThisRoute: maps.flatMap((m) => m.selectionControls
      .filter((c) => c.routeConditionThatMakesItInapplicable)
      .map((c) => ({
        document: DOCUMENT_ID, field: c.field, page: c.page, label: c.effectiveLabel,
        routeConditionThatMakesItInapplicable: c.routeConditionThatMakesItInapplicable
      }))),
    protectedBlanks: maps.flatMap((m) => m.canonicalRefusals
      .filter((r) => r.requiredBeforeFiling !== true && r.category)
      .map((r) => ({ document: m.formNumber, field: r.field, page: r.page, label: r.effectiveLabel, refusalClass: r.category, why: r.why }))),
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`
  });

  writeJson(`${OUT}/reports/independent-visual-review.json`, {
    schemaVersion: "rcap-independent-visual-review/v1", familyId: FAMILY_ID,
    required: true, granted: false, reviewedBy: null,
    whatToLookAt: [
      "Part A: ALL FOUR boxes are unticked. This family serves two statutory routes and elects neither; a ticked box here is a defect.",
      "No box has acquired a border, square or mark the blank form does not print — the issuer's own stroked outline should be the only thing there.",
      "The identity block: date of birth, mailing address, city, state and ZIP carry values; the Print name box, alias, occupation, Social Security, place of birth, father, mother and spouse boxes are blank.",
      "All three signature lines are blank, and the three numbered affidavit boxes in the left margin are unticked.",
      "Nothing appears below the printed line 'PETITIONER NOT TO WRITE BELOW THIS LINE'."
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
        severity: "blocking_if_unfixed_elsewhere",
        finding:
          "The shared field-semantics registry binds FOUR of this form's boxes to participant.full_legal_name, "
          + "measured with decideBinding against the pinned binary's own field names: 'AliasMaidenPrevious Name', "
          + "'Fathers Name', 'Mothers Maiden Name' and 'HusbandWifes Name'. The full_legal_name descriptor's pattern "
          + "ends in a catch-all \\bname\\b, and the registry carries no other-names, parent or spouse descriptor at "
          + "all.",
        consequence:
          "Left to the shared binder this petition — signed under the penalties of perjury — would have stated that "
          + "the participant's father, mother and spouse are all the participant, and that their own current legal "
          + "name is an alias. All four are passed as unwritable by ROLE, the one gate the name channel cannot "
          + "reverse, and all four are declared required-before-filing and disclosed. Returned for whoever owns the "
          + "descriptor list: a form asking for a THIRD PARTY's name is not rare, and the catch-all reaches every one "
          + "of them."
      },
      {
        finding:
          "The name box is one widget under three printed captions. 'Print' is a single 350.4 x 9.8 pt widget at "
          + "x 37.8, and the form prints 'Last Name' at x 90, 'First Name' at x 203 and 'Middle Name' at x 330 "
          + "beneath it. The platform holds all three parts separately.",
        consequence:
          "A single widget takes one string laid out from its left edge, and the finalizer's composed channel joins "
          + "facts with newlines into a box 9.8 pt high. Neither can put three values under three horizontal "
          + "captions, so the box is refused with the measurement and the held parts recorded, and the participant "
          + "prints the name themselves. Recorded as a shared-factory question: a horizontally partitioned single "
          + "widget has no channel."
      },
      {
        finding:
          "The pinned binary ships the 'Print' field with a value of 23 space characters and an appearance stream "
          + "that draws them at /Helv 8.",
        consequence:
          "It is whitespace: it draws no glyph, the byte proof reads the rectangle as carrying no ink, and it is left "
          + "exactly as the issuer shipped it. Recorded rather than cleared — the finalizer's "
          + "clearSourceCarriedTextValues channel skips a blank value and then throws for the field it was asked to "
          + "clear and did not."
      },
      {
        finding:
          "SOURCE_READY_BUILDABILITY.json classifies this family SOURCE_IDENTITY_UNRESOLVED_IN_THE_CUSTODY_RECORD "
          + "with documentSourcesResolved 0, and the MASTER_QUEUE row repeats the scalar.",
        consequence:
          "The declared path holds the declared digest exactly, in a mounted custody root, verified before this build "
          + "wrote anything. The buildability record itself says its identifier comparison is unreliable and is 'a "
          + "prompt to look, never a finding'. This build looked; the source is in custody. Recorded in "
          + "source-receipt.json for whoever owns the scalar."
      },
      {
        finding:
          "THIS FAMILY MAKES NO PART A ELECTION, and that is a finding rather than an omission. The family is two "
          + "statutory routes — § 100A adult conviction sealing and § 100B juvenile record sealing — and Part A boxes "
          + "1, 2 and 3 separate them by facts about the participant's own record, including the "
          + "misdemeanour/felony characterisation the route-obligation census itself records as a later-completion "
          + "field for these routes.",
        consequence:
          "All three boxes are declared required-before-filing through the contract's determinedByTheCaseNotTheRoute "
          + "exception, with whyTheRouteCannotDetermineIt stated as typed data, and all three are disclosed in "
          + "participant-instructions.md alongside the census's own waiting-period table so the participant can find "
          + "their box. The settled-selection channel is never opened and the build asserts the finalizer marked "
          + "nothing. Returned for the Captain: if the two routes should each ship their own packet, this family "
          + "would need splitting — the form supports the election, the family scope does not."
      },
      {
        finding:
          "Every check box on this form ships BOTH an /Off and a /Yes appearance, and the /Yes stream draws its mark "
          + "as a ZapfDingbats glyph ('(4) Tj' at /ZaDb 14.532) over the same white fill and stroked square the /Off "
          + "stream paints.",
        consequence:
          "pdf-lib has no missing appearance state to synthesize a border for, so suppressSynthesizedAppearances and "
          + "suppressSynthesizedWidgetBorders are passed and are NO-OPS here — measured, not assumed: finalizing this "
          + "source with both flags and with neither produces byte-identical output. They are passed anyway so a "
          + "later edition that drops an /Off stream does not quietly acquire seven squares the paper does not "
          + "print. The byte proof reads every box on both channels, glyph and painting-operator count against the "
          + "source's own /Off baseline, because a text-only reading cannot separate a ticked box from an unticked "
          + "one on this form. On this family every box must read UNMARKED on both channels, and does."
      },
      {
        finding:
          "The delivered appearance of every check box is the issuer's own, MINUS its opaque white background. The "
          + "source's /Off stream is 'q 1 g / 0 0 18 18 re / f / 0.5 0.5 17 17 re / s / Q' and its /Yes stream is "
          + "the same followed by the ZapfDingbats mark; the flattened artifact carries '0.5 0.5 17 17 re s' and, on "
          + "box 4, the mark. Painting operators per box therefore read 2 unticked and 5 ticked against a source "
          + "/Off baseline of 4.",
        consequence:
          "This is the shared finalizer's preserveUnwrittenSelectionBackgrounds default, not a decision of this "
          + "family, and it is the safe direction: an opaque white rectangle stamped by a flatten paints over "
          + "whatever the page prints behind the widget. The issuer's stroked box survives, so every box still reads "
          + "as a box and no outline is lost. Recorded because the delivered appearance is not byte-identical to the "
          + "issuer's appearance, and a visual reviewer should know which difference is intended."
      },
      {
        finding:
          "The route-obligation census records nothing for these routes on filingMethod, filingFee, serviceTiming, "
          + `filingDeadline, postFilingInstructions and hearing treatment: ${JSON.stringify(route.notRecorded)}.`,
        consequence:
          "The participant instructions state no fee, no deadline and no hearing step, and name the office that "
          + "answers the fee question — the same office the petition is sent to. An unsourced figure in a filing "
          + "instruction is worse than none. The census DOES record the waiting periods, and those are printed in "
          + "full because the participant needs them to choose their Part A box."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1", familyId: FAMILY_ID,
    requested: "independent completeness verification, visual review and counsel review",
    buildStatus: "state_built", status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false, live: false, commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "This packet ticks NO Part A box. The family covers two statutory routes — § 100A adult conviction sealing and "
      + "§ 100B juvenile record sealing — and Part A boxes 1, 2 and 3 turn on whether the record is juvenile or "
      + "adult and whether the offence is a misdemeanour or a felony. Confirm that leaving the election to the "
      + "participant, with the waiting-period table printed, is right — or direct that the family be split so each "
      + "route can state its own box.",
      "Confirm the affidavit pairing this packet tells the participant to follow: tick Part A box N, then tick and "
      + "sign numbered Affidavit N. It is read from the form's own printed instruction, which names boxes 1, 2 and 3 "
      + "only.",
      "OCP 4/12 is the edition held in custody. Confirm it is still the published edition before any promotion "
      + "beyond state_built.",
      "The form asks for the petitioner's father's name, mother's maiden name, husband's or wife's name, occupation "
      + "and place of birth. The platform collects none of them and all are left to the participant. Confirm that is "
      + "acceptable for an administrative sealing petition."
    ],
    mattersForTheReviewersAttention: [
      "build-findings.json — four of this form's boxes bind to the participant's own legal name in the shared registry; the refusal is by role and the gap is a factory-level finding.",
      "production-field-map.json — routeDeterminedSelections is deliberately empty and whyNoElectionIsMade says so in terms; this is the reviewable decision of this family.",
      "reports/actual-writes.json — every Part A box is read from the output bytes on two channels and must read unmarked on both."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: PASS_COUNTERS.every((c) => counted.counters[c] === 0) ? "COMPLETED" : "STOPPED",
    counters: counted.counters, counterFindings: counted.findings,
    directory: OUT, documents: [DOCUMENT_ID],
    officialForm: DOCUMENT_ID, sourceSha256: source.sha256, custodyRoot: source.custodyRoot,
    writes: maps.reduce((n, m) => n + m.canonicalWrites.filter((w) => w.factId).length, 0),
    routeSelectionsMade: 0,
    routeSelectionsMadeIsZeroBecause:
      "this family is two statutory routes and no held fact chooses between them; the Part A election is declared "
      + "determined by the case rather than by the route, disclosed, and left to the participant",
    requiredBeforeFiling: rbf.length,
    boundaryOnlyRequiredBeforeFiling: boundaryOnlyRbf.length,
    partAElectionsLeftToTheParticipant: maps.reduce((n, m) => n + m.selectionControls.filter((c) => c.requiredBeforeFiling === true).length, 0),
    participantElections: maps.reduce((n, m) => n + m.selectionControls.filter((c) => c.category === PARTICIPANT_ELECTION).length, 0),
    notApplicableOnThisRoute: maps.reduce((n, m) => n + m.selectionControls.filter((c) => c.routeConditionThatMakesItInapplicable).length, 0),
    artifacts: artifacts.map((a) => ({ fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount })),
    rasterPages: rasterPages.length,
    rasterState: skipRaster ? "BUILT_RASTER_PENDING" : "RASTER_LOCAL_PENDING_CENTRAL",
    nineCountersZero: PASS_COUNTERS.every((c) => counted.counters[c] === 0),
    packetsSelfVerified: 0, commercialRoutesOpened: 0, productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((r) => { console.log(JSON.stringify(r, null, 2)); })
    .catch((e) => { console.error(e); process.exit(1); });
}
