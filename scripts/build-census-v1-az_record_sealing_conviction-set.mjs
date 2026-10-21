#!/usr/bin/env node
/**
 * The Arizona record-sealing-on-conviction packet family.
 *
 *   node scripts/build-census-v1-az_record_sealing_conviction-set.mjs
 *   node scripts/build-census-v1-az_record_sealing_conviction-set.mjs --check
 *
 * One census-v1 family, strategy official_pdf_fill, one track:
 *
 *   az_record_sealing_conviction   Petition to seal criminal case records after a
 *                                  judgment of guilt, A.R.S. section 13-911
 *
 * WHAT IS BOUND, AND UNDER WHICH IDENTITY
 *
 * Two official binaries, each resolved BY CONTENT HASH across the mounted
 * custodies and never by declared path. The queue row declares both at paths
 * inside the Master Library; three of the five custodies this repository knows
 * about are not mounted here, and every wrong BLOCKED_SOURCE this operation has
 * produced came from trusting a declared path. A SHA-256 index is built over
 * the mounted trees on every run, asserted non-empty before any negative is
 * believed, and each digest is looked up in it.
 *
 * The identity under which they are bound is not the identity their filenames
 * carry. CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json,
 * DET-AZ-SEALING-PRINTED-IDENTITY-IS-050625, determines that the Supreme Court
 * administrative order 2025-07 appendix prints AOCCRSL1F-050625 and
 * AOCCRSL2F-050625, that the held files whose names end 050825 carry those exact
 * current bytes, and that the two binaries are to be bound by content hash under
 * their printed 050625 identities.
 *
 * THIS BUILD FOLLOWS THAT DETERMINATION AND RECORDS ONE MEASUREMENT BESIDE IT.
 * Read first-hand with pdftotext over every page of both held binaries, the
 * page footers print AOCCRSL1F-050825 (five pages) and AOCCRSL2F-050825 (three
 * pages) and print no 050625 string anywhere. That is a fact about the bytes,
 * not an argument about the identity: the determination is followed, the
 * binding is by digest, and the observation is carried in source-receipt.json
 * so the next reader is not surprised by a footer that disagrees with the
 * identity above it. Nothing here re-opens the determination.
 *
 * THE CONTINUATION IS NOT A DOCUMENT
 *
 * DET-AZ-CONT-IS-NOT-A-DOCUMENT-AOCCRSL1F-050825-CONT removes the phantom
 * official-form obligation: the continuation is a region of the parent
 * instrument, composed by the packet. So nothing is acquired for it, and the
 * third component of the committed packet set is a composed continuation sheet
 * carrying the counts beyond the four the petition's own item 2c holds. The
 * petition's own "Additional counts continue on a separate page" control is the
 * thing that makes it part of the parent, and this build marks it only when the
 * sheet is actually generated.
 *
 * WHAT THE HELD RECORD ESTABLISHES FOR THIS ROUTE, AND WHERE IT WAS READ
 *
 *   FILING DESTINATION  HELD. The court of conviction. One petition per case;
 *                       each convicting court needs its own. A limited
 *                       jurisdiction appeal needs a second superior court
 *                       petition. AZ.memo track az_record_sealing_conviction,
 *                       destination.detail and rules.filing.
 *
 *   FEE                 HELD, and the honest answer is that there is NO
 *                       STATEWIDE FIGURE. The record states that no statutory
 *                       filing fee is identified, that multiple municipal
 *                       courts publish that they charge none, that the question
 *                       is unresolved statewide and must be confirmed per court,
 *                       and that DPS may charge an investigation fee under
 *                       section 13-911(H) and a record-correction fee under
 *                       section 13-911(I)(3). Every clause of that is printed in
 *                       the packet verbatim. No dollar figure is invented.
 *
 *   WAIVER              HELD, and it is a DPS-fee waiver rather than a filing-fee
 *                       waiver: waived for an indigent petitioner and for a
 *                       petitioner found not guilty or whose case was dismissed
 *                       or not prosecuted under section 13-911(C)(2) or (C)(3).
 *                       The packet prints it and says plainly that the second
 *                       limb is not this route, because a conviction route
 *                       reaches neither (C)(2) nor (C)(3).
 *
 *   SERVICE             HELD, and the answer is that the petitioner serves
 *                       NOBODY. The court notifies DPS and requests a report;
 *                       the clerk gives the prosecutor a copy; a victim who
 *                       asked for post-conviction notice is notified by the
 *                       prosecutor and may be heard; and the court may not grant
 *                       or deny for sixty days unless it has notice that nobody
 *                       objects. Printed in full.
 *
 * WHAT THIS BUILD MARKS ON A SWORN PETITION, AND WHAT IT WILL NOT
 *
 * The petition is declared under penalty of perjury. Three rules govern every
 * control on it and each is applied field by field below:
 *
 *   1. The route's own election is STATED, not asked. A packet built for the
 *      conviction route says so: item 4's third option, "a judgment of guilt was
 *      entered on", is marked, because a petition that does not say which of the
 *      three situations it is asking about is not a petition for this route.
 *   2. A participant fact the platform HOLDS is transcribed. The committed
 *      registry's manualCompletionItems for this track name exactly two manual
 *      items - the signature and the ongoing duty to report new charges - and no
 *      box among them. An answer the participant gave at intake, written back
 *      onto the form, is transcription and not a decision by the platform.
 *   3. A fact the platform DOES NOT HOLD is never marked, however inviting the
 *      box. The absolute discharge from ADOC, the discharge from probation, a
 *      prior petition in this case, a later conviction, the request for a
 *      hearing and the attachment list are all left to the participant and all
 *      named in participant-instructions.md.
 *
 * THE FORM'S OWN INK. Both binaries ship with the text field `County` already
 * carrying "MOHAVE" - a value some earlier hand left in the published file, sitting
 * on the line that names the county the petition is filed in. It is the form's
 * ink and not a write by this build, and it is on a line the participant must
 * answer. This build writes the participant's own county over it on both
 * documents and asserts, from the OUTPUT BYTES, that no artifact carries the
 * string MOHAVE anywhere. An unwritten field would also have been dropped by the
 * shared widget-contribution rule; the assertion is here because a defect this
 * specific deserves a check of its own rather than a dependency on a default.
 *
 * NO DATE IS WRITTEN ON THE DECLARATION. Page 5's `Date` sits beside "I declare
 * under penalty of perjury"; it is the date of the declaration and it is the
 * participant's to make. The printed name and address in the same block ARE
 * written, because they restate identity the participant has already given and
 * neither is an act of attesting.
 *
 * THE PROPOSED ORDER IS GENERATED UNEXECUTED. Its caption, the petitioner's
 * identifying block and the recital of WHAT THE PETITION REQUESTS are written,
 * so the order the participant lodges matches the petition it accompanies. Every
 * finding, every decretal election, the date and the judge's signature line are
 * refused as court-owned. Nothing in the rendered order asserts that a court has
 * acted.
 *
 * FIT OR REFUSE. Every value is measured against its narrowest widget and
 * written at a size that fits or not at all. Nothing is truncated, and a value
 * that will not fit is a refusal that names itself.
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

import { sanitizeAndFlatten, scanBytesForActiveContent, ensureDefaultAppearances }
  from "./rcap-official-forms/rcap-active-content.mjs";
import { preserveSourceMetadata, metadataOfBytes, brandingInMetadata, carryDates,
  sourceMetadataFingerprint } from "./rcap-official-forms/rcap-official-form-finalize.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { flattenedWidgets } from "./rcap-official-forms/pdf-flattened-widgets.mjs";
import { PASS_COUNTERS } from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFNumber, StandardFonts, rgb } = require("pdf-lib");

/* ------------------------------------------------------------------ identity */

const FAMILY_ID = "az_record_sealing_conviction-set";
const TRACK_ID = "az_record_sealing_conviction";
const JURISDICTION = "AZ";
const STRATEGY = "official_pdf_fill";
const OUT = "data/rcap-all50/overlays/census-v1/az/az-record-sealing-conviction-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-az_record_sealing_conviction-set.mjs";
const ROUTE_KEY = "obligation:track-only:AZ:az_record_sealing_conviction";

const PETITION = "az_record_sealing_conviction-primary-filing-1";
const ORDER = "az_record_sealing_conviction-proposed-order-2";
const CONTINUATION = "az_record_sealing_conviction-continuation-3";

const PETITION_FORM = "AOCCRSL1F-050625";
const ORDER_FORM = "AOCCRSL2F-050625";
const CONTINUATION_ID = "AZ-AOCCRSL1F-CONTINUATION-OF-COUNTS";

const REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const MEMO = "data/record-clearing/legal-design-intake/AZ.memo.json";
const MANIFEST = "data/record-clearing/legal-design-packet-set-manifests.json";
const DETERMINATIONS = "data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";

/* The two held binaries, by digest. The filename each carries ends 050825; the
 * identity each is bound under is the 050625 identity the administrative order
 * prints, per DET-AZ-SEALING-PRINTED-IDENTITY-IS-050625. */
const SOURCES = Object.freeze([
  Object.freeze({
    componentId: PETITION,
    documentId: PETITION_FORM,
    sourceId: `official-form:${PETITION_FORM}`,
    boundIdentity: PETITION_FORM,
    supersededIdentity: "AOCCRSL1F-050825",
    title: "Petition to Seal Criminal Case Records",
    instrumentKind: "petition",
    sha256: "32c1e54d8a4135cfefe5d85d25f62afdb7c212f6a475e18664188524de34db05",
    expectedBytes: 299110,
    expectedPages: 5,
    expectedFields: 71,
    printedFooterIdentity: "AOCCRSL1F-050825"
  }),
  Object.freeze({
    componentId: ORDER,
    documentId: ORDER_FORM,
    sourceId: `official-form:${ORDER_FORM}`,
    boundIdentity: ORDER_FORM,
    supersededIdentity: "AOCCRSL2F-050825",
    title: "Order Regarding Petition to Seal Criminal Case Records",
    instrumentKind: "proposed_order",
    sha256: "436df2e10722ff26b30069d4b0913825fa304202d6538a70e45ad8bafbca61b1",
    expectedBytes: 213882,
    expectedPages: 3,
    expectedFields: 41,
    printedFooterIdentity: "AOCCRSL2F-050825"
  })
]);

/* ------------------------------------------- the record, asserted not assumed */

const PINNED = Object.freeze({
  venue: "Statewide Arizona law; file in the court of conviction.",
  destinationName: "The court of conviction",
  destinationDetail: "One petition per case. Each court where the person was convicted needs its own petition. If the person appealed from a limited jurisdiction court, a separate superior court petition is needed to reach those records.",
  filing: "File in the court identified by § 13-911(C) for the situation — here, the court of conviction.",
  fees: "No statutory filing fee identified, and multiple municipal courts publish that they charge none for this petition. Confirm per court. Unresolved statewide. Under § 13-911(H) the DPS director may charge an investigation fee, and under § 13-911(I)(3) DPS may charge a successful petitioner a record-correction fee.",
  feeWaiver: "DPS fees are waived for an indigent petitioner and for a petitioner found not guilty or whose case was dismissed or not prosecuted where the petition is filed under § 13-911(C)(2) or (C)(3).",
  notice: "The court notifies DPS and requests a report of the petitioner's state and federal arrests, prosecutions, and convictions. The clerk provides a copy of the petition to the prosecutor. If the victim requested post-conviction notice, the prosecutor notifies the victim, who has a right to be present and heard. The court may not grant or deny for at least 60 days unless it has notice that the prosecutor and all noticed victims do not object.",
  service: "none by the petitioner. The court provides the copy to the prosecuting agency.",
  participantSignature: "Signature under penalty of perjury.",
  notarization: "none",
  handoff: "A routine hearing contemplated by statute does not prevent packet generation. Opposition, disputed evidence, or a contested hearing is a post_generation_handoff."
});

function readRecord() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  const track = (registry.tracks ?? []).find((row) => row.trackId === TRACK_ID);
  assert.ok(track, `${FAMILY_ID}: the track registry no longer carries ${TRACK_ID}`);
  assert.equal(track.jurisdiction, JURISDICTION);
  assert.equal(track.packetSet?.packetSetId, FAMILY_ID,
    `${FAMILY_ID}: the registry track no longer names this packet set`);
  assert.equal(track.venue, PINNED.venue, `${FAMILY_ID}: registry venue moved`);
  assert.equal(track.destination?.name, PINNED.destinationName, `${FAMILY_ID}: registry destination name moved`);
  assert.equal(track.destination?.detail, PINNED.destinationDetail, `${FAMILY_ID}: registry destination detail moved`);
  for (const key of ["filing", "fees", "feeWaiver", "notice", "service", "participantSignature", "notarization"]) {
    assert.equal(track.rules?.[key], PINNED[key], `${FAMILY_ID}: registry rules.${key} moved`);
  }
  const stops = (track.selfHelpStopConditions ?? []).map((s) => String(s).trim()).filter(Boolean);
  assert.ok(stops.length > 1, `${FAMILY_ID}: the registry holds no self-help stop condition`);
  assert.deepEqual(track.postGenerationHandoffs, [PINNED.handoff],
    `${FAMILY_ID}: registry post-generation handoff moved`);

  /* The memo is the intake record the registry was normalised from. Both are
   * read, because a packet that quotes one while the other has moved is quoting
   * a record that no longer exists in the shape it claims. */
  const memo = JSON.parse(fs.readFileSync(MEMO, "utf8"));
  const memoTrack = (memo.tracks ?? []).find((row) => row.trackId === TRACK_ID);
  assert.ok(memoTrack, `${FAMILY_ID}: AZ.memo.json no longer carries ${TRACK_ID}`);
  for (const key of ["filing", "fees", "feeWaiver", "notice", "service"]) {
    assert.equal(memoTrack.rules?.[key], PINNED[key], `${FAMILY_ID}: AZ.memo rules.${key} disagrees with the registry`);
  }
  assert.equal(memoTrack.destination?.detail, PINNED.destinationDetail,
    `${FAMILY_ID}: AZ.memo destination.detail disagrees with the registry`);

  const manifests = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const packetSet = (manifests.packetSets ?? []).find((row) => row.packetSetId === FAMILY_ID);
  assert.ok(packetSet, `${FAMILY_ID}: the committed packet-set manifest no longer carries this family`);
  const componentIds = (packetSet.components ?? []).map((c) => c.componentId);
  assert.deepEqual([...componentIds].sort(), [PETITION, ORDER, CONTINUATION].sort(),
    `${FAMILY_ID}: the packet-set manifest names a different component set: ${componentIds.join(", ")}`);

  const determinations = JSON.parse(fs.readFileSync(DETERMINATIONS, "utf8"));
  const identity = (determinations.determinations ?? []).find((d) => d.id === "DET-AZ-SEALING-PRINTED-IDENTITY-IS-050625");
  const phantom = (determinations.determinations ?? []).find((d) => d.id === "DET-AZ-CONT-IS-NOT-A-DOCUMENT-AOCCRSL1F-050825-CONT");
  assert.ok(identity && (identity.families ?? []).includes(FAMILY_ID),
    `${FAMILY_ID}: the printed-identity determination no longer governs this family`);
  assert.ok(phantom && (phantom.families ?? []).includes(FAMILY_ID),
    `${FAMILY_ID}: the continuation determination no longer governs this family`);

  return { track, memoTrack, packetSet, stops, identity, phantom };
}

/* -------------------------------------- sources, resolved by content hash only */

const MOUNTED_CUSTODY_ROOTS = [
  "private/source-imports",
  "private/human-source-returns"
];

function buildDigestIndex() {
  const index = new Map();
  let files = 0;
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      if (stat.isDirectory()) { walk(full); continue; }
      if (!stat.isFile()) continue;
      const bytes = fs.readFileSync(full);
      const digest = crypto.createHash("sha256").update(bytes).digest("hex");
      if (!index.has(digest)) index.set(digest, []);
      index.get(digest).push(full);
      files += 1;
    }
  };
  for (const root of MOUNTED_CUSTODY_ROOTS) walk(path.join(ROOT, root));
  /*
   * A scan that indexed nothing once reported every digest in the repository as
   * missing. An empty index proves nothing about any source, so it stops the
   * build here rather than producing a family full of confident refusals.
   */
  assert.ok(files > 0,
    `${FAMILY_ID}: the SHA-256 index over the mounted custodies is EMPTY. No negative may be believed from it; `
    + `the mounted roots are ${MOUNTED_CUSTODY_ROOTS.join(", ")}`);
  return { index, files, digests: index.size };
}

function resolveSources() {
  const scan = buildDigestIndex();
  const corpus = JSON.parse(fs.readFileSync(CORPUS_INDEX, "utf8"));
  const mountedCustodies = [];
  for (const custody of corpus.custodies ?? []) {
    mountedCustodies.push({ id: custody.id, root: custody.root, mounted: fs.existsSync(path.join(ROOT, custody.root)) });
  }
  const resolved = [];
  for (const source of SOURCES) {
    const hits = scan.index.get(source.sha256) ?? [];
    assert.ok(hits.length > 0,
      `${FAMILY_ID}: ${source.sourceId} (${source.sha256}) resolves to no bytes in any mounted custody. `
      + `The index carries ${scan.files} files and ${scan.digests} digests, so this is a real absence and not an empty scan.`);
    const file = hits.slice().sort()[0];
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.length, source.expectedBytes,
      `${FAMILY_ID}: ${source.sourceId} resolved to ${bytes.length} bytes, expected ${source.expectedBytes}`);
    /* The corpus index's declared path is recorded as the thing that was
     * DECLARED, never used to find the file. */
    const declared = (corpus.entries ?? []).filter((e) => e.sha256 === source.sha256)
      .map((e) => ({ custody: e.custody, path: e.path }));
    resolved.push({
      ...source, bytes,
      resolvedPath: path.relative(ROOT, file),
      declaredPaths: declared,
      resolvedBy: "sha256_index_over_mounted_custodies"
    });
  }
  return { resolved, scan, mountedCustodies };
}

/* -------------------------------------------------------------- the fixtures */

const FIXTURES = {
  canonical: {
    "participant.full_legal_name": "Dana Marie Whitfield",
    "participant.date_of_birth": "03/14/1988",
    "participant.street_address": "417 North Cordova Avenue",
    "participant.city_state_zip": "Tucson, AZ 85705",
    "participant.phone": "520-555-0147",
    "participant.email": "dana.whitfield@example.org",
    "participant.name_at_time_of_arrest": "Dana Marie Alvarez",
    "matter.court_name": "PIMA COUNTY SUPERIOR",
    "matter.county": "PIMA",
    "matter.case_number": "CR2016-004821",
    "matter.offense_description": "Possession of a dangerous drug, A.R.S. 13-3407(A)(1), a class 4 felony",
    "matter.judgment_of_guilt_date": "09/22/2017",
    "matter.sentence_completion_date": "11/30/2020",
    "matter.monetary_obligations_satisfied": "yes",
    "matter.nonmonetary_terms_completed": "yes",
    "matter.prior_sealing_in_arizona": "no",
    "matter.pending_charges": "no",
    "matter.best_interests_statement":
      "Sealing this record is in my best interests and consistent with public safety. I completed every term of my sentence in 2020, I have had no contact with law enforcement since, and I have held the same job for four years. The record blocks me from the state licence my employer now requires.",
    /* The petition prints "Count I:", "Count II:" and so on beside each of item
     * 2c's four lines, so a value that repeats the numbering would print it
     * twice. Each entry is the offence and nothing else; the continuation sheet
     * supplies its own numbering for the counts past the fourth. */
    "matter.counts": [
      "Possession of a dangerous drug, A.R.S. 13-3407(A)(1), class 4 felony",
      "Possession of drug paraphernalia, A.R.S. 13-3415(A), class 6 felony",
      "Possession of marijuana, A.R.S. 13-3405(A)(1), class 6 felony",
      "Criminal damage, A.R.S. 13-1602(A)(1), class 2 misdemeanour",
      "Failure to appear in the second degree, A.R.S. 13-2506(A), class 1 misdemeanour"
    ]
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "12/31/1972",
    "participant.street_address": "1188 West Upper Notch Crossing Road, Apartment 14B",
    "participant.city_state_zip": "Fountain Hills, Arizona 85268-2214",
    "participant.phone": "(928) 555-0199 ext. 4417",
    "participant.email": "maria.alejandra.oshaughnessy@longmailexample.org",
    "participant.name_at_time_of_arrest": "Maria-Alejandra Del Carmen O'Shaughnessy",
    "matter.court_name": "MARICOPA COUNTY SUPERIOR",
    "matter.county": "MARICOPA",
    "matter.case_number": "CR2011-158834-002",
    "matter.offense_description": "Theft of means of transportation, A.R.S. 13-1814(A)(5), a class 3 felony",
    "matter.judgment_of_guilt_date": "06/04/2013",
    "matter.sentence_completion_date": "08/17/2019",
    "matter.monetary_obligations_satisfied": "yes",
    "matter.nonmonetary_terms_completed": "yes",
    "matter.prior_sealing_in_arizona": "no",
    "matter.pending_charges": "no",
    "matter.best_interests_statement":
      "I ask the court to seal these records because the conviction is now more than ten years old, every monetary and non-monetary term was completed in 2019, and I have not been charged with anything since. I care for two grandchildren and the record prevents me from being approved as their school's volunteer driver, which is the only reason I am asking.",
    "matter.counts": [
      "Theft of means of transportation, A.R.S. 13-1814(A)(5), class 3 felony",
      "Unlawful use of means of transportation, A.R.S. 13-1803(A)(1), class 5 felony",
      "Criminal trespass in the first degree, A.R.S. 13-1504(A)(1), class 6 felony",
      "Possession of burglary tools, A.R.S. 13-1505(A)(1), class 6 felony",
      "Criminal damage, A.R.S. 13-1602(A)(1), class 4 felony",
      "Resisting arrest, A.R.S. 13-2508(A)(2), class 6 felony",
      "Failure to appear in the first degree, A.R.S. 13-2507(A), class 5 felony"
    ]
  }
};

/* The count rows item 2c of the petition itself holds. Anything past this goes
 * onto the composed continuation sheet, which is what makes the sheet a region
 * of the parent rather than a document of its own. */
const COUNTS_ON_THE_FORM = 4;

/* ------------------------------------------------------- refusal vocabularies */

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const PARTICIPANT_ELECTION = "participant_sworn_narrative_or_legal_election";

/* A blank outside this route's branch of the form. The named condition is the
 * whole of the declaration: a statement that the build does not fill it is
 * refused by the contract, and rightly. */
const OUTSIDE = (condition) => ({
  policy: "refuse",
  completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
  routeConditionThatMakesItInapplicable: condition,
  reason: condition
});
/* A choice only the participant can make, which this route does not determine. */
const ELECTION = (why) => ({
  policy: "refuse", isSelectionControl: true,
  refusalClass: PARTICIPANT_ELECTION, category: PARTICIPANT_ELECTION, reason: why
});
/* A field the form itself marks optional, whose value the platform does not hold. */
const OPTIONAL = (why) => ({
  policy: "refuse",
  completenessDisposition: "OPTIONAL_PARTICIPANT_CONTENT",
  reason: `${why} The platform holds no value for it and the platform does not invent it.`
});
/* A court, clerk or prosecutor field. */
const COURTOWN = (why) => ({
  policy: "refuse", refusalClass: COURT_OWNED, category: COURT_OWNED,
  reason: `court, clerk, prosecutor, agency, or hearing field; the court completes it. ${why}`
});
/* A signature or the date of a signature. */
const PROTECT = (why) => ({
  policy: "refuse", refusalClass: SIGNATURE, category: SIGNATURE,
  reason: `signature or date field; never prefilled. ${why}`
});
/* A viewer control that is not a filing fact at all. */
const VIEWER = () => ({
  policy: "refuse", reason: "viewer ui control; never a filing fact"
});

const WRITE = (factId) => ({ policy: "write", factId });
/* A control this route determines, marked on the named widget's own on-state. */
const MARK = (widget, state, why, { routeDetermined = false, factId = null } = {}) =>
  ({ policy: "mark", widget, state, why, routeDetermined, factId });

/* -------------------------------------------------- the petition, field by field */

const S1 = "Person filing block";
const S2 = "Caption";
const S3 = "What the petition asks to be sealed";
const S4 = "Section I - Petitioner's information";
const S5 = "Section I item 2 - Case record information";
const S6 = "Section 3 - Additional case record information (if known)";
const S7 = "Section I item 4 - Describe your situation";
const S8 = "Section II - Sentence compliance";
const S9 = "Section III - Prior sealing of record(s)";
const S10 = "Section IV - Other information for the court";
const S11 = "Declarations and acknowledgements";

const PETITION_PLAN = [
  { field: "Reset", section: S1, label: "Reset this form", ...VIEWER() },
  { field: "Filer", section: S1, label: "Person Filing", ...WRITE("participant.full_legal_name") },
  { field: "Address", section: S1, label: "Address (if not protected)", ...WRITE("participant.street_address") },
  { field: "City", section: S1, label: "City, State, Zip Code", ...WRITE("participant.city_state_zip") },
  { field: "Telephone", section: S1, label: "Telephone", ...WRITE("participant.phone") },
  { field: "Email", section: S1, label: "Email Address", ...WRITE("participant.email") },
  { field: "Check Box1", section: S1, label: "Representing [ ] Self",
    ...MARK(0, "Yes",
      "This is a self-help packet prepared for a participant filing on their own behalf; the attorney block on the same line is refused as attorney-only on the same reasoning. The route determines it and the participant is not asked.",
      { routeDetermined: true }) },
  { field: "AttorneyFor", section: S1, label: "Attorney for (the party an attorney represents)",
    policy: "refuse", reason: "attorney-only block; no attorney representation fact is held for this participant" },
  { field: "Bar", section: S1, label: "Attorney Bar Number",
    policy: "refuse", reason: "attorney-only identifier; the participant is not named as their own attorney and no representation fact is held" },

  { field: "Court", section: S2, label: "Name of court", ...WRITE("matter.court_name") },
  { field: "County", section: S2, label: "County of the court", ...WRITE("matter.county") },
  { field: "Case", section: S2, label: "Case Number", ...WRITE("matter.case_number") },
  { field: "Defendant", section: S2, label: "Defendant (FIRST, MI, LAST)", ...WRITE("participant.full_legal_name") },
  { field: "Plaintiff", section: S2, label: "In Re the Matter of, the caption used where no charges were filed",
    ...OUTSIDE("The petition prints two alternative captions and this is the second: 'OR if no charges were filed: In Re the Matter of'. This route is a judgment of guilt entered on a filed charge, so the caption used is the STATE OF ARIZONA versus Defendant caption above and the alternative is not reached.") },
  { field: "Check Box2", section: S2, label: "[ ] Amended (corrected) petition",
    ...ELECTION("Whether this filing amends an existing petition is a fact about what the participant has already filed. The platform holds no earlier petition of theirs, and marking it would assert a filing history the record does not establish.") },

  { field: "Check Box3", section: S3, label: "[ ] Arrest records of an arrest occurring on or about (request box one)",
    ...ELECTION("Which of the three request boxes to add beyond the case-records request is the participant's to choose. The arrest date and the arresting agency it needs are facts the platform does not hold, and a request box marked over blanks asks the court for records nobody has identified.") },
  { field: "ArrestOccured", section: S3, label: "Date of the arrest named in request box one",
    ...OUTSIDE("Request box one, the arrest-records request, is not marked on this packet; the blanks that belong to it are the blanks of a request this petition does not make.") },
  { field: "Agency", section: S3, label: "Law enforcement agency named in request box one",
    ...OUTSIDE("Request box one, the arrest-records request, is not marked on this packet; the blanks that belong to it are the blanks of a request this petition does not make.") },
  { field: "Check Box4", section: S3, label: "[ ] Charging documents created by the following prosecuting agency (request box two)",
    ...ELECTION("The second request box needs the name of the prosecuting agency, which the platform does not hold, and the form's own words warn against checking it where no charges were filed. The choice is the participant's.") },
  { field: "ProAgency", section: S3, label: "Prosecuting agency named in request box two",
    ...OUTSIDE("Request box two, the charging-documents request, is not marked on this packet; the blanks that belong to it are the blanks of a request this petition does not make.") },
  { field: "Check Box5", section: S3, label: "[ ] All records relating to the eligible charge(s) in court case number (request box three)",
    ...MARK(0, "Yes",
      "The route is a petition to seal the case records of an adjudicated case under A.R.S. section 13-911, and the case number those records sit under is held. A petition that marks none of the three request boxes asks the court for nothing.",
      { routeDetermined: true }) },
  { field: "CourtCase", section: S3, label: "Court case number in request box three", ...WRITE("matter.case_number") },

  { field: "PetName", section: S4, label: "Petitioner's name", ...WRITE("participant.full_legal_name") },
  { field: "PetAddr", section: S4, label: "Petitioner's address", ...WRITE("participant.street_address") },
  { field: "PetDOB", section: S4, label: "Petitioner's date of birth", ...WRITE("participant.date_of_birth") },
  { field: "PetEmail", section: S4, label: "Petitioner's email address", ...WRITE("participant.email") },
  { field: "PetName1", section: S4, label: "Petitioner's name at the time of arrest, if not the same as above",
    ...WRITE("participant.name_at_time_of_arrest") },

  { field: "Charge", section: S5, label: "What the petitioner was charged with", ...WRITE("matter.offense_description") },
  { field: "CourtAdj1", section: S5, label: "Court that adjudicated the charge(s)", ...WRITE("matter.court_name") },
  { field: "CourtAdj2", section: S5, label: "Second ruled line the form prints under item 2b",
    ...OUTSIDE("Item 2b prints two ruled lines for one answer. The court that adjudicated the charges is written on the first and fits there; the second line is the form's own overflow for a name too long for one line, and this packet does not reach it.") },
  { field: "CourtCaseNum", section: S5, label: "Court case number if charge(s) were filed", ...WRITE("matter.case_number") },
  { field: "Count1", section: S5, label: "Count I", ...WRITE("matter.count_1") },
  { field: "Count2", section: S5, label: "Count II", ...WRITE("matter.count_2") },
  { field: "Count3", section: S5, label: "Count III", ...WRITE("matter.count_3") },
  { field: "Count4", section: S5, label: "Count IV", ...WRITE("matter.count_4") },
  { field: "Check Box6", section: S5, label: "[ ] Additional counts continue on a separate page",
    ...MARK(0, "Yes",
      "Marked only when this packet actually generates the continuation sheet, which happens when the case carries more counts than item 2c's four lines hold. The control is what makes the composed sheet a region of this petition rather than a separate document, per DET-AZ-CONT-IS-NOT-A-DOCUMENT-AOCCRSL1F-050825-CONT.",
      { routeDetermined: true }) },
  { field: "Check Box7", section: S5, label: "[ ] Yes / [ ] No, did you have an initial appearance (item 2d)",
    ...OUTSIDE("Item 2d opens with 'If no charges were filed'. On this route charges were filed and a judgment of guilt was entered, so the whole of item 2d is the branch of the form this route does not use.") },
  { field: "Check Box8", section: S5, label: "[ ] Yes / [ ] No, was the initial appearance in this court (item 2d)",
    ...OUTSIDE("Item 2d opens with 'If no charges were filed'. On this route charges were filed and a judgment of guilt was entered, so the whole of item 2d is the branch of the form this route does not use.") },

  { field: "ArrestLoc", section: S6, label: "Location of arrest, in the section the form marks (if known)",
    ...OPTIONAL("Section 3 of the petition is headed ADDITIONAL CASE RECORD INFORMATION (if known), so the form itself marks every blank in it optional.") },
  { field: "AgencyName", section: S6, label: "Name of the arresting agency, in the section the form marks (if known)",
    ...OPTIONAL("Section 3 of the petition is headed ADDITIONAL CASE RECORD INFORMATION (if known), so the form itself marks every blank in it optional.") },
  { field: "AgencyDate", section: S6, label: "Date of arrest, in the section the form marks (if known)",
    ...OPTIONAL("Section 3 of the petition is headed ADDITIONAL CASE RECORD INFORMATION (if known), so the form itself marks every blank in it optional.") },
  { field: "ProsAgency1", section: S6, label: "Name of the prosecuting agency, in the section the form marks (if known)",
    ...OPTIONAL("Section 3 of the petition is headed ADDITIONAL CASE RECORD INFORMATION (if known), so the form itself marks every blank in it optional.") },
  { field: "ProsAgency2", section: S6, label: "Second ruled line the form prints for the prosecuting agency in section 3",
    ...OPTIONAL("Section 3 of the petition is headed ADDITIONAL CASE RECORD INFORMATION (if known), and this is the overflow line of an optional blank.") },
  { field: "JusticeCourt1", section: S6, label: "Justice court name and justice court case number where a case moved up, in the section the form marks (if known)",
    ...OPTIONAL("Section 3 of the petition is headed ADDITIONAL CASE RECORD INFORMATION (if known), and it applies only where a case was filed in a justice court and transferred to the superior court.") },

  { field: "Check Box9", section: S7, label: "[ ] I was charged with a criminal offense and a judgment of guilt was entered (item 4, third option)",
    ...MARK(2, "3",
      "This is the route election. Item 4 offers three situations - an arrest with no charges, a dismissal or acquittal, and a judgment of guilt - and each is a different A.R.S. section 13-911 track. This packet is built for the conviction track, so the packet states which one it is rather than asking the participant to choose between three tracks on a petition they sign under penalty of perjury.",
      { routeDetermined: true }) },
  { field: "EnteredOn", section: S7, label: "Date a dismissal or not guilty verdict was entered (item 4, second option)",
    ...OUTSIDE("Item 4's second option is the dismissal-or-acquittal situation, which is a different A.R.S. section 13-911 track with its own packet family. This packet marks the third option, so the second option's date blank is not reached.") },
  { field: "EnteredOn1", section: S7, label: "Date the judgment of guilt was entered", ...WRITE("matter.judgment_of_guilt_date") },

  { field: "Check Box10", section: S8, label: "[ ] Yes / [ ] No / [ ] N/A - I have satisfied all required monetary terms of the sentence (Section II question 1)",
    ...MARK(0, "1",
      "The participant answered this at intake: the committed registry's generationRequirements carry the question 'Have all fines, fees and victim restitution been paid?' as required. Writing their own answer back onto the form is transcription, and section 13-911(G) makes it a filing condition the packet must state.",
      { factId: "matter.monetary_obligations_satisfied" }) },
  { field: "Check Box11", section: S8, label: "[ ] Yes / [ ] No / [ ] N/A - I have completed all other terms of the sentence (Section II question 2)",
    ...MARK(0, "1",
      "The participant answered this at intake: the committed registry's generationRequirements carry the question about the date they completed the nonmonetary terms of probation or sentence and were discharged, as required. The completion date is written on this same packet.",
      { factId: "matter.nonmonetary_terms_completed" }) },
  { field: "Check Box12", section: S8, label: "[ ] Yes / [ ] No / [ ] N/A - I have received an absolute discharge from the Arizona Department of Corrections (Section II question 3)",
    ...ELECTION("Whether this participant ever received an absolute discharge from ADOC is not a fact the platform holds: the committed packet-set manifest assigns the certificate of absolute discharge to the participant as a conditional document to obtain and assigns the answer itself to them as a required-before-filing act. Marking it would assert a custody history the record does not establish, on a petition sworn under penalty of perjury.") },
  { field: "Check Box13", section: S8, label: "[ ] Yes / [ ] No / [ ] N/A - I have been discharged from probation (Section II question 4)",
    ...ELECTION("Whether this participant was discharged from probation, as against completing a sentence with no probation term, is not a fact the platform holds. The committed packet-set manifest assigns the order of discharge to the participant as a conditional document to obtain and assigns the answer itself to them as a required-before-filing act.") },

  { field: "Check Box14", section: S9, label: "[ ] Yes / [ ] No - have you previously filed a petition to seal case records in this case (Section III question 1)",
    ...ELECTION("Whether an earlier petition was filed in THIS case is a filing history of the participant's own case that the platform does not hold. The intake question the registry carries is about a prior DENIAL within three years, which is a different question from this one, and answering one with the other would put a wrong answer on a sworn petition.") },
  { field: "PetDate", section: S9, label: "Date of your last petition, where Section III question 1 is answered yes",
    ...ELECTION("This blank belongs to the yes branch of a question this packet leaves to the participant, and its value is a date the platform does not hold.") },
  { field: "Check Box15", section: S9, label: "[ ] Yes / [ ] No - have you had case records sealed under A.R.S. section 13-911 in a previous case (Section III question 2)",
    ...MARK(1, "2",
      "The participant answered this at intake: the committed registry's generationRequirements carry the question 'Have you had records sealed in Arizona before?' as required. Both fixtures answer no, and the no widget carries its own on-state so nothing else on the line is marked.",
      { factId: "matter.prior_sealing_in_arizona" }) },
  { field: "Discharge", section: S9, label: "Date the non-monetary conditions were completed and the court discharged you, in the previous sealed case",
    ...OUTSIDE("The blank belongs to the yes branch of Section III question 2. This packet answers that question no - the participant has had no case records sealed in Arizona before - so there is no previous sealed case for the date to be about.") },

  { field: "Check Box16", section: S10, label: "[ ] Yes / [ ] No / [ ] N/A - have you been convicted of any other offense since the conviction you are asking to seal (Section IV question 1)",
    ...ELECTION("A later conviction anywhere is a fact about the participant's whole record. The platform holds the conviction this petition is about and the answer to whether charges are pending now; it does not hold a complete later-conviction history, and a wrong answer here on a sworn petition is worse than a blank one the participant completes.") },
  { field: "Check Box17", section: S10, label: "[ ] Yes / [ ] No / [ ] Unknown - are there any pending charges filed against you (Section IV question 2)",
    ...MARK(1, "2",
      "The participant answered this at intake: the committed registry's generationRequirements carry the question 'Do you have any charge pending now?' as required, and pending charges are a self-help stop condition the packet screens on.",
      { factId: "matter.pending_charges" }) },
  { field: "Jurisdiction", section: S10, label: "Jurisdiction of an additional pending charge (Section IV question 2a)",
    ...OUTSIDE("Item 2a opens 'If you have additional pending charges'. This packet answers Section IV question 2 no, so the sub-item is the branch of the form this packet does not use.") },
  { field: "ChargesFiled", section: S10, label: "Charges filed, for an additional pending charge (Section IV question 2a)",
    ...OUTSIDE("Item 2a opens 'If you have additional pending charges'. This packet answers Section IV question 2 no, so the sub-item is the branch of the form this packet does not use.") },
  { field: "DateofCharge", section: S10, label: "Date of an additional pending charge (Section IV question 2a)",
    ...OUTSIDE("Item 2a opens 'If you have additional pending charges'. This packet answers Section IV question 2 no, so the sub-item is the branch of the form this packet does not use.") },
  { field: "Check Box18", section: S10, label: "[ ] Yes / [ ] No - do you request a hearing (Section IV question 3)",
    ...ELECTION("Whether to ask for a hearing is the participant's decision about how they want their own case handled. The form's own words are that unless the petitioner, prosecutor or victim requests one the court may decide without a hearing, so a mark here changes the shape of the proceeding and is not the platform's to make.") },
  { field: "Consider1", section: S10, label: "Anything else you would like the court to consider, first line",
    ...WRITE("matter.best_interests_line_1") },
  { field: "Consider2", section: S10, label: "Anything else you would like the court to consider, second line",
    ...WRITE("matter.best_interests_line_2") },
  { field: "Consider3", section: S10, label: "Anything else you would like the court to consider, third line",
    ...WRITE("matter.best_interests_line_3") },
  { field: "Check Box19", section: S10, label: "[ ] Attached is other pertinent documentation (non-originals) (Section IV question 5)",
    ...ELECTION("Whether the participant attaches other documents, and which, is theirs to decide at the moment of filing. The packet names in participant-instructions.md the two documents the record encourages and leaves the box to them.") },
  { field: "Doc1", section: S10, label: "List of attached documents, first line",
    ...OPTIONAL("The list belongs to the attachments box, which is the participant's own election made at filing time.") },
  { field: "Doc2", section: S10, label: "List of attached documents, second line",
    ...OPTIONAL("The list belongs to the attachments box, which is the participant's own election made at filing time.") },
  { field: "Doc3", section: S10, label: "List of attached documents, third line",
    ...OPTIONAL("The list belongs to the attachments box, which is the participant's own election made at filing time.") },

  { field: "Date", section: S11, label: "Date beside the Petitioner's signature",
    ...PROTECT("The block is headed DECLARATIONS AND ACKNOWLEDGEMENTS and opens 'I declare under penalty of perjury'. The date is the date the declaration is made, and it is made by the person signing, on the day they sign.") },
  { field: "Print", section: S11, label: "Printed Name in the declaration block", ...WRITE("participant.full_legal_name") },
  { field: "Addr", section: S11, label: "Address in the declaration block", ...WRITE("participant.street_address") }
];

/* --------------------------------------------------- the proposed order, unexecuted */

const O1 = "Order caption";
const O2 = "What the petition requests, recited on the order";
const O3 = "Section I - Petitioner's information as recited on the order";
const O4 = "Section II - The court's findings of fact and conclusions of law";
const O5 = "Section III - Therefore, it is ordered";

const ORDER_PLAN = [
  { field: "Reset", section: O1, label: "Reset this form", ...VIEWER() },
  { field: "Court", section: O1, label: "Name of court", ...WRITE("matter.court_name") },
  { field: "County", section: O1, label: "County of the court", ...WRITE("matter.county") },
  { field: "Case", section: O1, label: "Case Number", ...WRITE("matter.case_number") },
  { field: "Defendant", section: O1, label: "Defendant (FIRST, MI, LAST)", ...WRITE("participant.full_legal_name") },
  { field: "DName", section: O1, label: "In Re the Matter of, the caption used where no charges were filed",
    ...OUTSIDE("The order prints the same two alternative captions as the petition it accompanies, and this is the second, used where no charges were filed. This route is a judgment of guilt entered on a filed charge, so the alternative caption is not reached.") },

  { field: "Check Box1", section: O2, label: "[ ] Arrest records of an arrest occurring on or about (recital of request box one)",
    ...OUTSIDE("The order recites what the petition requests. This packet's petition does not mark its first request box, so the recital of that request is not reached on the order either.") },
  { field: "ArrestOn", section: O2, label: "Date of the arrest recited in request box one",
    ...OUTSIDE("The order recites what the petition requests. This packet's petition does not mark its first request box, so the recital of that request is not reached on the order either.") },
  { field: "ArrestBy", section: O2, label: "Law enforcement agency recited in request box one",
    ...OUTSIDE("The order recites what the petition requests. This packet's petition does not mark its first request box, so the recital of that request is not reached on the order either.") },
  { field: "ArrestBy1", section: O2, label: "Second ruled line the order prints for the law enforcement agency in request box one",
    ...OUTSIDE("The order recites what the petition requests. This packet's petition does not mark its first request box, so the recital of that request is not reached on the order either.") },
  { field: "Check Box2", section: O2, label: "[ ] Charging documents created by the following prosecuting agency (recital of request box two)",
    ...OUTSIDE("The order recites what the petition requests. This packet's petition does not mark its second request box, so the recital of that request is not reached on the order either.") },
  { field: "Agency", section: O2, label: "Prosecuting agency recited in request box two",
    ...OUTSIDE("The order recites what the petition requests. This packet's petition does not mark its second request box, so the recital of that request is not reached on the order either.") },
  { field: "Agency1", section: O2, label: "Second ruled line the order prints for the prosecuting agency in request box two",
    ...OUTSIDE("The order recites what the petition requests. This packet's petition does not mark its second request box, so the recital of that request is not reached on the order either.") },
  { field: "Check Box3", section: O2, label: "[ ] All records relating to the eligible charge(s) in court case number (recital of request box three)",
    ...MARK(0, "Yes",
      "The order's opening words are 'Based on the information presented to the court, pursuant to ARS section 13-911, the petition requests sealing of the following records'. This is a recital of what the petition asks for, not a finding, and the petition this order accompanies marks its third request box. An order whose recital does not match its petition is worse than one that leaves the recital blank.",
      { routeDetermined: true }) },
  { field: "CaseNo", section: O2, label: "Court case number recited in request box three", ...WRITE("matter.case_number") },

  { field: "PetName", section: O3, label: "Petitioner's name", ...WRITE("participant.full_legal_name") },
  { field: "PetDOB", section: O3, label: "Petitioner's date of birth", ...WRITE("participant.date_of_birth") },
  { field: "NameArrest", section: O3, label: "Petitioner's name at the time of arrest, if not the same as above",
    ...WRITE("participant.name_at_time_of_arrest") },

  { field: "Check Box4", section: O4, label: "[ ] The court is initially unable to act for want of a sufficient description of the records",
    ...COURTOWN("A finding of fact the court makes on reading the petition.") },
  { field: "Check Box5", section: O4, label: "[ ] The court provided a copy of the petition to the prosecuting agency, and [ ] the sixty-day period has run or nobody objects",
    ...COURTOWN("Two findings about what the court itself did and how long has passed since filing.") },
  { field: "Check Box6", section: O4, label: "[ ] The court has reviewed any report provided by the Department of Public Safety under A.R.S. section 13-911(H)",
    ...COURTOWN("A finding about a report sent to the court, which the participant never sees.") },
  { field: "Check Box7", section: O4, label: "[ ] The offense(s) described in the petition is eligible to be sealed under A.R.S. section 13-911",
    ...COURTOWN("The eligibility conclusion the petition asks the court to reach.") },
  { field: "Check Box8", section: O4, label: "[ ] The petitioner is requesting sealing of records for a conviction and",
    ...COURTOWN("The heading of a pair of findings the court makes about the conviction.") },
  { field: "Check Box9", section: O4, label: "[ ] The timeframes required by A.R.S. section 13-911 have passed",
    ...COURTOWN("A finding about the statutory waiting period.") },
  { field: "Check Box10", section: O4, label: "[ ] The petitioner has completed all terms and conditions of sentencing, including all monetary obligations and restitution",
    ...COURTOWN("A finding about compliance, made by the court on the evidence before it.") },
  { field: "Check Box11", section: O4, label: "[ ] Granting the petition is in the best interests of the petitioner and the public's safety",
    ...COURTOWN("The discretionary conclusion the whole petition asks the court to reach.") },
  { field: "Check Box12", section: O4, label: "[ ] Granting the petition is not in the best interests of the petitioner or the public's safety, or the petitioner is not entitled to the requested sealing because",
    ...COURTOWN("The adverse conclusion and the heading of the reasons for it.") },
  { field: "Check Box13", section: O4, label: "[ ] The offense(s) described in the petition is not eligible to be sealed under A.R.S. section 13-911",
    ...COURTOWN("A reason for refusing the petition.") },
  { field: "Check Box14", section: O4, label: "[ ] The timeframes required by A.R.S. section 13-911 have not passed for a conviction",
    ...COURTOWN("A reason for refusing the petition.") },
  { field: "Check Box15", section: O4, label: "[ ] The petitioner has not completed all terms and conditions of sentencing",
    ...COURTOWN("A reason for refusing the petition.") },
  { field: "Check Box16", section: O4, label: "[ ] Other, as a reason the petitioner is not entitled to the requested sealing",
    ...COURTOWN("A reason for refusing the petition, in the court's own words.") },
  { field: "Other", section: O4, label: "Other reason the petitioner is not entitled to the requested sealing, in the court's own words",
    ...COURTOWN("Written by the court beside the box above it.") },
  { field: "Check Box17", section: O4, label: "[ ] Other findings",
    ...COURTOWN("Any further finding the court chooses to make.") },
  { field: "OtherFindings", section: O4, label: "Other findings, in the court's own words",
    ...COURTOWN("Written by the court beside the box above it.") },

  { field: "Check Box18", section: O5, label: "[ ] DISMISSING the petition to seal criminal case records",
    ...COURTOWN("A decretal election. Nothing on this page may assert that a court has acted.") },
  { field: "Check Box19", section: O5, label: "[ ] Failure to provide sufficient information, as a reason for dismissal",
    ...COURTOWN("A decretal election. Nothing on this page may assert that a court has acted.") },
  { field: "Check Box20", section: O5, label: "[ ] The petition was not filed in the correct court, and [ ] Other, as reasons for dismissal",
    ...COURTOWN("Decretal elections. Nothing on this page may assert that a court has acted.") },
  { field: "OtherDismiss", section: O5, label: "Other reason for dismissing the petition, in the court's own words",
    ...COURTOWN("Written by the court beside the box above it.") },
  { field: "Check Box21", section: O5, label: "[ ] DENYING the petition to seal criminal case records",
    ...COURTOWN("A decretal election. Nothing on this page may assert that a court has acted.") },
  { field: "Check Box22", section: O5, label: "[ ] GRANTING the petition to seal criminal case records",
    ...COURTOWN("The decretal election this petition asks for. It is the judge's to make and the packet is generated unexecuted.") },
  { field: "Date", section: O5, label: "Date beside the Judicial Officer signature line",
    ...COURTOWN("The date a judicial officer signs the order. The order is generated unexecuted and carries no date.") }
];

/* A fact-driven mark picks its widget and on-state from the participant's own
 * answer. Hard-coding one would mean a fixture answering "no" still marked
 * "yes", which is the shape of defect this whole factory exists to catch. */
const MARK_CHOICES = Object.freeze({
  "Check Box10": { yes: [0, "1"], no: [1, "2"], "n/a": [2, "3"] },
  "Check Box11": { yes: [0, "1"], no: [1, "2"], "n/a": [2, "3"] },
  "Check Box15": { yes: [0, "1"], no: [1, "2"] },
  "Check Box17": { yes: [0, "1"], no: [1, "2"], unknown: [2, "3"] }
});

/* ---------------------------------------------------------- derived facts */

function derivedFacts(base) {
  const facts = { ...base };
  const counts = base["matter.counts"] ?? [];
  for (let i = 0; i < COUNTS_ON_THE_FORM; i += 1) {
    if (counts[i] !== undefined) facts[`matter.count_${i + 1}`] = counts[i];
  }
  facts["matter.counts_beyond_the_form"] = counts.slice(COUNTS_ON_THE_FORM);
  return facts;
}

/* -------------------------------------------------------------- fitting */

const MAX_SIZE = 10;
const MIN_SIZE = 6.5;
const SIZE_STEP = 0.5;
const HORIZONTAL_PADDING = 4;
const VERTICAL_PADDING = 3;

function widgetRects(field) {
  return field.acroField.getWidgets().map((w) => {
    const r = w.getRectangle();
    return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) };
  });
}

/** The narrowest and shortest box the value has to live in. A field holds one
 *  string however many places it is printed, so it must fit in all of them. */
function narrowestRect(rects) {
  return {
    width: Math.min(...rects.map((r) => r.width)),
    height: Math.min(...rects.map((r) => r.height))
  };
}

function fitOneLine(font, text, rect) {
  const available = rect.width - HORIZONTAL_PADDING;
  for (let size = MAX_SIZE; size >= MIN_SIZE - 1e-9; size -= SIZE_STEP) {
    if (size > rect.height - VERTICAL_PADDING) continue;
    if (font.widthOfTextAtSize(text, size) <= available) {
      return { fits: true, size: +size.toFixed(2), outcome: size === MAX_SIZE ? "fit" : "shrunk" };
    }
  }
  return { fits: false, size: null, outcome: "refused_would_not_fit" };
}

/** Wrap a value across a fixed number of ruled lines, or refuse. Never truncate. */
function fitAcrossLines(font, text, rect, lineCount) {
  const available = rect.width - HORIZONTAL_PADDING;
  const words = String(text).split(/\s+/).filter(Boolean);
  for (let size = MAX_SIZE; size >= MIN_SIZE - 1e-9; size -= SIZE_STEP) {
    if (size > rect.height - VERTICAL_PADDING) continue;
    const lines = [];
    let current = "";
    let overflowed = false;
    for (const word of words) {
      if (font.widthOfTextAtSize(word, size) > available) { overflowed = true; break; }
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= available) current = candidate;
      else { lines.push(current); current = word; }
    }
    if (overflowed) continue;
    if (current) lines.push(current);
    if (lines.length <= lineCount) {
      return { fits: true, size: +size.toFixed(2), lines, outcome: size === MAX_SIZE ? "fit" : "shrunk" };
    }
  }
  return { fits: false, size: null, lines: null, outcome: "refused_would_not_fit" };
}

/* --------------------------------------------------------- the fill engine */

function setFontSize(field, size) {
  const da = `/Helv ${size} Tf 0 g`;
  field.acroField.setDefaultAppearance(da);
  for (const widget of field.acroField.getWidgets()) {
    const existing = widget.dict.get(PDFName.of("DA"));
    if (existing !== undefined) widget.dict.set(PDFName.of("DA"), field.acroField.dict.context.obj(da));
  }
}

function markCheckbox(form, name, widgetIndex, state) {
  const field = form.getField(name);
  const widgets = field.acroField.getWidgets();
  assert.ok(widgets[widgetIndex],
    `${name}: the source carries ${widgets.length} widget(s); this build asked to mark widget ${widgetIndex}`);
  const statesOf = (widget) => {
    const normal = widget.getAppearances()?.normal;
    if (!normal || typeof normal.keys !== "function") return [];
    return normal.keys().map((k) => k.asString().replace(/^\//, ""));
  };
  const target = widgets[widgetIndex];
  const measured = statesOf(target);
  assert.ok(measured.includes(state),
    `${name}: widget ${widgetIndex} carries no /${state} appearance state; measured [${measured.join(", ")}]`);
  const flagsObj = target.dict.get(PDFName.of("F"));
  const flags = flagsObj instanceof PDFNumber ? flagsObj.asNumber() : 0;
  assert.equal(flags & 2, 0, `${name}: widget ${widgetIndex} is Hidden in the source and must never be written on`);
  assert.equal(flags & 32, 0, `${name}: widget ${widgetIndex} is NoView in the source and must never be written on`);

  field.acroField.dict.set(PDFName.of("V"), PDFName.of(state));
  const perWidget = [];
  for (const [i, widget] of widgets.entries()) {
    const here = statesOf(widget);
    const applied = here.includes(state) ? state : "Off";
    widget.dict.set(PDFName.of("AS"), PDFName.of(applied));
    perWidget.push({ widget: i, statesMeasured: here, appearanceStateApplied: applied });
  }
  return { field: name, onState: state, widgetMarked: widgetIndex, widgets: perWidget };
}

/**
 * Fill one official binary and return the flattened bytes plus a write report.
 *
 * The census is this build's own plan rather than a re-derivation, so the map
 * and the bytes cannot disagree about which field carried which value.
 */
async function fillDocument({ source, plan, facts: baseFacts, marks, narratives = [] }) {
  const facts = { ...baseFacts };
  const digest = crypto.createHash("sha256").update(source.bytes).digest("hex");
  assert.equal(digest, source.sha256, `${source.sourceId}: source drift; read ${digest}`);

  const pdfDoc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  assert.equal(pdfDoc.getPageCount(), source.expectedPages,
    `${source.sourceId}: expected ${source.expectedPages} pages`);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  assert.equal(fields.length, source.expectedFields,
    `${source.sourceId}: expected ${source.expectedFields} AcroForm fields, read ${fields.length}`);

  /* Every field of the source is named by the plan, and every field the plan
   * names is in the source. A plan that has drifted from the document decides
   * about fields that are not there and leaves fields nobody decided about. */
  const inSource = new Set(fields.map((f) => f.getName()));
  const inPlan = new Set(plan.map((row) => row.field));
  const unplanned = [...inSource].filter((n) => !inPlan.has(n));
  const phantom = [...inPlan].filter((n) => !inSource.has(n));
  assert.deepEqual(unplanned, [], `${source.sourceId}: the source carries fields this build decides nothing about: ${unplanned.join(", ")}`);
  assert.deepEqual(phantom, [], `${source.sourceId}: the plan names fields the source does not carry: ${phantom.join(", ")}`);

  /*
   * The form's own ink, enumerated rather than remembered.
   *
   * Both AZ binaries ship with exactly one text field already filled - `County`,
   * carrying MOHAVE. A later edition that arrives with a second one would ride
   * through a flatten as ordinary ink and read as an answer the participant
   * gave, so the set is asserted rather than assumed. Every field named here is
   * written over by this build, which is what keeps the source value out of the
   * artifact.
   */
  const sourceCarried = [];
  for (const field of fields) {
    if (typeof field.getText !== "function") continue;
    let carried = null;
    try { carried = field.getText() ?? null; } catch { carried = null; }
    if (carried !== null && String(carried).trim() !== "") sourceCarried.push({ field: field.getName(), value: carried });
  }
  assert.deepEqual(sourceCarried.map((c) => c.field), ["County"],
    `${source.sourceId}: the source carries values in fields this build has not accounted for: `
    + `${JSON.stringify(sourceCarried)}. Each would flatten as ordinary ink and read as the participant's own answer.`);
  const writesOverCarried = plan.find((r) => r.field === "County" && r.policy === "write");
  assert.ok(writesOverCarried,
    `${source.sourceId}: the source ships a value in County and this build does not write over it`);

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  ensureDefaultAppearances(form);

  const written = [];
  const markedRows = [];
  const refused = [];
  const writtenNames = new Set();
  const narrativeFits = [];

  /* A value the form prints across several ruled lines is wrapped once, at one
   * size, across exactly those lines. If it will not fit on them at a readable
   * size the whole value is refused rather than shortened: a narrative cut off
   * mid-sentence on a sworn petition is worse than one the participant writes
   * out themselves. */
  for (const group of narratives) {
    const value = facts[group.factId];
    assert.ok(value !== undefined && String(value).trim() !== "",
      `${source.sourceId}: the narrative group ${group.fields.join("/")} has no value for ${group.factId}`);
    const boxes = group.fields.map((name) => narrowestRect(widgetRects(form.getField(name))));
    const box = { width: Math.min(...boxes.map((b) => b.width)), height: Math.min(...boxes.map((b) => b.height)) };
    const fit = fitAcrossLines(helvetica, String(value), box, group.fields.length);
    assert.ok(fit.fits,
      `${source.sourceId}: "${group.factId}" does not fit across the ${group.fields.length} ruled lines the form prints `
      + `(${box.width}x${box.height}pt each) at or above ${MIN_SIZE}pt. Fit or refuse - this build never truncates.`);
    assert.equal(fit.lines.length, group.fields.length,
      `${source.sourceId}: the narrative wrapped onto ${fit.lines.length} of the ${group.fields.length} ruled lines the form prints. `
      + "The field map states that every one of them carries a line, so a fixture that leaves one empty would make the map describe bytes that do not exist.");
    group.fields.forEach((name, i) => {
      const line = fit.lines[i];
      if (line !== undefined) facts[group.lineFacts[i]] = line;
    });
    narrativeFits.push({ factId: group.factId, fields: group.fields, fontSize: fit.size,
      linesUsed: fit.lines.length, linesAvailable: group.fields.length, outcome: fit.outcome });
  }

  for (const row of plan) {
    if (row.policy !== "write") continue;
    const value = facts[row.factId];
    const field = form.getField(row.field);
    const rects = widgetRects(field);
    const box = narrowestRect(rects);
    if (value === undefined || String(value).trim() === "") {
      refused.push({ ...row, refusedBecause: "the platform holds no value for this fact in this fixture" });
      continue;
    }
    /* A widget the source itself marks Hidden or NoView is never shown to a
     * person, so a value written on one is a value nobody can read on the
     * filing. The document's own display flag decides, not the field name. */
    for (const [i, widget] of field.acroField.getWidgets().entries()) {
      const flagsObj = widget.dict.get(PDFName.of("F"));
      const flags = flagsObj instanceof PDFNumber ? flagsObj.asNumber() : 0;
      assert.equal(flags & 2, 0, `${source.sourceId} ${row.field}: widget ${i} is Hidden in the source and must never be written on`);
      assert.equal(flags & 32, 0, `${source.sourceId} ${row.field}: widget ${i} is NoView in the source and must never be written on`);
    }
    const fit = fitOneLine(helvetica, String(value), box);
    assert.ok(fit.fits,
      `${source.sourceId} ${row.field}: "${String(value)}" does not fit in ${box.width}x${box.height}pt at or above ${MIN_SIZE}pt. `
      + "Fit or refuse - this build never truncates a participant's value.");
    setFontSize(field, fit.size);
    field.setText(String(value));
    writtenNames.add(row.field);
    written.push({
      field: row.field, factId: row.factId, label: row.label, section: row.section,
      value: String(value), fontSize: fit.size, outcome: fit.outcome,
      widgets: rects, kind: "text"
    });
  }

  for (const mark of marks) {
    const row = plan.find((r) => r.field === mark.field);
    assert.ok(row && row.policy === "mark", `${source.sourceId}: ${mark.field} is marked but the plan does not declare a mark on it`);
    const applied = markCheckbox(form, mark.field, mark.widget, mark.state);
    writtenNames.add(mark.field);
    markedRows.push({ ...applied, label: row.label, section: row.section, why: row.why,
      routeDetermined: row.routeDetermined === true, factId: row.factId ?? null });
  }

  const { clean, report: sanitation } = await sanitizeAndFlatten(pdfDoc, {
    defaultFont: helvetica, writtenFields: writtenNames
  });
  const fingerprint = sourceMetadataFingerprint(pdfDoc);
  const metadataCarried = preserveSourceMetadata(pdfDoc, clean);
  const dates = carryDates(pdfDoc, clean);
  stampDeterministic(clean);

  const bytes = Buffer.from(await clean.save({ useObjectStreams: false, updateMetadata: false }));
  const residue = scanBytesForActiveContent(bytes);
  assert.ok(residue.inspectable, `${source.sourceId}: finalized artifact is not byte-inspectable`);
  assert.equal(residue.hits.length, 0, `${source.sourceId}: active-content residue remains: ${residue.hits.join(", ")}`);
  const metadata = await metadataOfBytes(bytes);
  const branding = brandingInMetadata(metadata);
  assert.equal(branding.length, 0,
    `${source.sourceId}: refusing to emit partner branding on a participant's official form (${branding.map((b) => b.field).join(", ")})`);

  return {
    bytes, written, marked: markedRows, refused, narrativeFits,
    sanitation, fingerprint, metadataCarried, dates, metadata,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    pageCount: clean.getPageCount()
  };
}

/* ------------------------------------- the continuation: a region of the parent */

const REPLACEMENTS = new Map([
  ["’", "'"], ["‘", "'"], ["“", '"'], ["”", '"'],
  ["—", " - "], ["–", "-"], ["…", "..."], ["§", "Sec. "],
  [" ", " "], ["•", "- "], ["é", "e"], ["ü", "u"]
]);

/**
 * Every glyph this build draws is a glyph the standard font can encode. An
 * unmapped codepoint stops the build rather than being quietly dropped: losing
 * a character out of a count description is exactly the kind of silent edit this
 * factory refuses.
 */
function sanitizePdfText(text) {
  let out = String(text ?? "");
  for (const [from, to] of REPLACEMENTS) out = out.split(from).join(to);
  const bad = [...out].filter((ch) => ch !== "\n" && (ch.codePointAt(0) < 0x20 || ch.codePointAt(0) > 0x7e));
  assert.equal(bad.length, 0,
    `unmapped characters in composed text: ${[...new Set(bad)].map((c) => `U+${c.codePointAt(0).toString(16).padStart(4, "0")}`).join(", ")}`);
  return out;
}

/* ---- block-aware page breaking -----------------------------------------------
 *
 * This is the repaired composer, taken from the fix16-composer-clipping branch
 * rather than from the copy that sits in about ninety build scripts. The copy
 * carries three faults, each of which shipped pages a participant cannot read:
 * splitToken chopped an unbreakable token at whichever character reached the
 * margin, page breaking was row-by-row and blind to logical lines so a wrapped
 * value could be widowed from its label, and the route trailer could become the
 * sole occupant of a participant-facing page. Nothing is dropped to make
 * anything fit; where a block is genuinely taller than a page it continues onto
 * the next, which is continuation and not truncation.
 */
const TRAILER_LINE = /^(Route: |Route:$|Routes this set serves \()/;
const CONTACT_LINE = /^(PETITIONER|CASE NUMBER|COURT|COUNTY):/;

async function renderComposedPdf(fullText, title) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setProducer("RCAP census-v1 artifact-only renderer");
  pdf.setCreator("RCAP evidence build");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontSize = 11, lineHeight = 14.5, width = 612, height = 792, margin = 72;
  const maxWidth = width - 2 * margin;
  const rowsPerPage = Math.floor((height - 2 * margin) / lineHeight) + 1;
  const fits = (s) => font.widthOfTextAtSize(s, fontSize) <= maxWidth;

  const splitToken = (token) => {
    const chunks = [];
    let current = "";
    const flushOversized = () => {
      while (!fits(current)) {
        let cut = current.length - 1;
        while (cut > 1 && !fits(current.slice(0, cut))) cut--;
        chunks.push(current.slice(0, cut));
        current = current.slice(cut);
      }
    };
    for (const piece of token.split(/(?<=[:_/.-])/)) {
      if (current && !fits(`${current}${piece}`)) { chunks.push(current); current = piece; }
      else current += piece;
      flushOversized();
    }
    if (current) chunks.push(current);
    return chunks;
  };
  const wrap = (line) => {
    if (!line) return [""];
    const words = line.split(/\s+/).flatMap((w) => fits(w) ? [w] : splitToken(w));
    const rows = []; let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (fits(candidate)) current = candidate;
      else { if (current) rows.push(current); current = w; }
    }
    if (current) rows.push(current);
    return rows;
  };

  const source = sanitizePdfText(fullText).split("\n");
  const blocks = [];
  for (let i = 0; i < source.length; i++) {
    const raw = source[i];
    if (CONTACT_LINE.test(raw)) {
      const run = [];
      while (i < source.length && CONTACT_LINE.test(source[i])) run.push(...wrap(source[i++]));
      i--;
      blocks.push({ index: blocks.length, rows: run, trailer: false });
      continue;
    }
    blocks.push({ index: blocks.length, rows: wrap(raw), trailer: TRAILER_LINE.test(raw) });
  }
  const pages = [[]];
  for (const block of blocks) {
    let page = pages[pages.length - 1];
    if (block.rows.length <= rowsPerPage && page.length + block.rows.length > rowsPerPage) {
      pages.push([]);
      page = pages[pages.length - 1];
    }
    for (const text of block.rows) {
      if (page.length === rowsPerPage) { pages.push([]); page = pages[pages.length - 1]; }
      page.push({ text, block: block.index, trailer: block.trailer });
    }
  }

  const soleOccupant = (page) => page.length > 0 && page.every((r) => r.trailer || r.text === "");
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

  for (const rows of pages) {
    const page = pdf.addPage([width, height]);
    for (const [index, row] of rows.entries()) {
      if (row.text) {
        page.drawText(row.text, { x: margin, y: height - margin - index * lineHeight, size: fontSize, font, color: rgb(0, 0, 0) });
      }
    }
  }
  return Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
}

const DOTS = (n = 84) => ".".repeat(n);

function continuationText(facts, petitionIdentity) {
  const extra = facts["matter.counts_beyond_the_form"] ?? [];
  const lines = [
    "CONTINUATION OF ITEM 2c - ADDITIONAL COUNTS",
    `A continuation of the Petition to Seal Criminal Case Records, form ${petitionIdentity}`,
    "",
    "This page is not a separate document. Item 2c of the petition prints four count lines and",
    "this case carries more than four, so the petition's own control - \"Additional counts continue",
    "on a separate page\" - is marked and the counts beyond the fourth are set out here. File this",
    "page with the petition it continues.",
    "",
    `COURT: ${facts["matter.court_name"]}`,
    `COUNTY: ${facts["matter.county"]}`,
    `CASE NUMBER: ${facts["matter.case_number"]}`,
    `PETITIONER: ${facts["participant.full_legal_name"]}`,
    "",
    "ADDITIONAL COUNTS IN THIS CASE",
    ""
  ];
  extra.forEach((count, i) => lines.push(`${COUNTS_ON_THE_FORM + i + 1}. ${count}`));
  lines.push(
    "",
    "Counts one to four are printed on the petition itself, at item 2c. Nothing on this page",
    "repeats them and nothing on this page replaces them.",
    "",
    "IF ANY COUNT ABOVE IS WRONG OR MISSING",
    "Correct it before you sign the petition. You sign the petition under penalty of perjury and",
    "this page is part of what you are signing.",
    "",
    `Signature of the Petitioner: ${DOTS(40)}`,
    `Date: ${DOTS(63)}`,
    "",
    "The signature and its date are left blank because the declaration on the petition is made by",
    "the person signing, on the day they sign it.",
    "",
    `Route: ${ROUTE_KEY}`
  );
  return lines.join("\n");
}

/* ---------------------------------------------- what the participant is told */

function participantInstructions(record, plannedElections) {
  const stops = record.stops.map((s) => `- ${s}`).join("\n");
  const elections = plannedElections.map((e) => `- **${e.document}, ${e.label}** — ${e.why}`).join("\n");
  return `# Petition to Seal Criminal Case Records — what you do next

Packet family: \`${FAMILY_ID}\`
Route: \`${ROUTE_KEY}\`
Authority: A.R.S. § 13-911

This packet was prepared for one situation: a criminal case in which **a judgment of
guilt was entered**. Item 4 of the petition says so, and this packet marks it. If that is
not your situation — if you were arrested and no charges were filed, or the charges were
dismissed or you were found not guilty — this is the wrong packet and a different one
applies.

## Where you file this

The track record states the venue: *"${PINNED.venue}"*

It names the destination as **${PINNED.destinationName}**, and states how far one petition
reaches: *"${PINNED.destinationDetail}"*

Read that last sentence twice. **One petition per case.** If you were convicted in more
than one court, each court needs its own petition, and this packet is one petition. If you
appealed from a limited jurisdiction court, reaching those records needs a second petition
in the superior court.

## What this costs

The track record states the fee for this route in one line: *"${PINNED.fees}"*

There is no dollar figure anywhere in this packet, and that is deliberate: the record
answers this question with an unresolved and a "confirm per court", not with an amount, and
this build does not write a figure no record establishes. **Ask the clerk of the court you
are filing in what, if anything, they charge for this petition.**

The record states the waiver as: *"${PINNED.feeWaiver}"*

Note what that waiver is and is not. It waives **DPS fees**, not a court filing fee, and its
second limb — found not guilty, or dismissed or not prosecuted — is § 13-911(C)(2) and
(C)(3), which are not this route. This packet is a conviction route under § 13-911(C)(1).
If you cannot pay a fee the court asks for, ask the clerk about the court's own fee-deferral
or fee-waiver application; that is a different form and it is not in this packet.

## Who must be served, and how

The track record states: *"${PINNED.service}"*

**You serve nobody.** What happens after you file is the court's job, and the record
describes it: *"${PINNED.notice}"*

Two things in that sentence matter to you. The court will not grant or deny for at least
sixty days unless it has notice that nobody objects, so a wait is normal and is not a sign
that something is wrong. And a victim who asked for post-conviction notice has a right to
be heard.

## Before you sign: the blanks this packet leaves to you

This packet does not answer a question about you that you have not already answered, and it
does not mark a box on a document you swear to unless the route itself settles it. Every
item below is yours to complete before filing.

**Sign the declaration.** The block on the last page of the petition is headed
DECLARATIONS AND ACKNOWLEDGEMENTS and begins "I declare under penalty of perjury". Your
signature and **the date beside it** are both blank, because the declaration is made by the
person signing, on the day they sign. Your printed name and address are already filled in
above the signature line; check them.

**Read the whole petition before you sign it.** The record states the signature rule as
*"${PINNED.participantSignature}"* and the notarization rule as *"${PINNED.notarization}"*, so
there is nothing to have notarised — but there is everything to have read. If any answer
this packet filled in is wrong, correct it on the form before you sign.

${elections}

**Two documents the form strongly encourages.** The committed packet record names both:
a certificate of absolute discharge from the Arizona Department of Corrections, requested
from ADOC; and an order of discharge from probation, asked for from the clerk of the court
that placed you on probation. Each is conditional — you need it only if it applies to you —
and each is required before filing where it does. Both confirm the date you completed the
non-monetary terms of your sentence, so check that date on the petition against the document
and correct the packet if they disagree.

**A duty that continues after you file.** The committed record names it as a manual item:
the form imposes an ongoing duty to notify the court of new charges after filing. Filing is
not the end of it.

## When to stop and get help

The track record lists the conditions under which this packet is not the right tool and the
matter should go to a person:

${stops}

The record draws one distinction on that list and it is printed here in the record's own
words: *"${PINNED.handoff}"* A hearing the statute contemplates is a normal step, not a sign
that something has gone wrong; opposition or a contested hearing is where this stops being a
self-help packet.

## What is in this packet

- **The Petition to Seal Criminal Case Records** — the document you file.
- **The Order Regarding Petition to Seal Criminal Case Records** — the proposed order, which
  you lodge with the petition. It is generated **unexecuted**: every finding, every ordering
  box, the date and the judge's signature are blank, because they are the court's to make.
  Nothing on it says a court has decided anything.
- **The continuation of item 2c** — a page carrying the counts beyond the four the petition's
  own item 2c holds. It is part of the petition, not a separate document, and the petition's
  own "Additional counts continue on a separate page" box is marked to say so. File it with
  the petition.
`;
}

/* ------------------------------------------------------------------- emission */

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
const writeJson = (rel, value) => {
  ensureDir(path.dirname(rel));
  fs.writeFileSync(rel, `${JSON.stringify(value, null, 2)}\n`);
};
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

/** The marks this packet makes on one fixture, resolved from that fixture's own facts. */
function marksFor(plan, facts) {
  const marks = [];
  for (const row of plan) {
    if (row.policy !== "mark") continue;
    if (row.field === "Check Box6") {
      const extra = facts["matter.counts_beyond_the_form"] ?? [];
      if (extra.length === 0) continue;
      marks.push({ field: row.field, widget: row.widget, state: row.state, drivenBy: "counts_beyond_the_form" });
      continue;
    }
    const choices = MARK_CHOICES[row.field];
    if (choices) {
      const answer = String(facts[row.factId] ?? "").trim().toLowerCase();
      const chosen = choices[answer];
      assert.ok(chosen,
        `${row.field}: the fixture answers "${answer}" for ${row.factId}, which is not one of the on-states this control offers `
        + `(${Object.keys(choices).join(", ")}). A mark is never guessed.`);
      marks.push({ field: row.field, widget: chosen[0], state: chosen[1], drivenBy: row.factId });
      continue;
    }
    marks.push({ field: row.field, widget: row.widget, state: row.state, drivenBy: "route" });
  }
  return marks;
}

/**
 * What the OUTPUT BYTES carry, read back from the flattened artifact.
 *
 * No finalizer assertion substitutes for this. A build that reports fifteen
 * values and emits none is the defect invisibleWrites exists to catch, and the
 * only way to catch it is to open the bytes that were emitted.
 */
async function evidenceFromBytes({ file, written, marked, plan, form: formName, facts }) {
  const widgets = await flattenedWidgets(file);
  const drawnText = widgets.filter((w) => w.text && w.text.trim() !== "");
  /* The accepted boxes are every widget rectangle this build wrote in OR marked.
   * A marked control draws the form's own check glyph inside its own box, and it
   * is ink this build put there on purpose; counting it as ink outside a
   * measured box reported eight correct check marks as visual defects. */
  const writtenBoxes = [];
  for (const w of written) for (const rect of w.widgets) writtenBoxes.push({ ...rect, field: w.field });
  const markedBoxes = [];
  for (const m of marked) {
    const row = plan.find((r) => r.field === m.field);
    for (const rect of row?.rects ?? []) {
      markedBoxes.push({ ...rect, field: m.field });
      writtenBoxes.push({ ...rect, field: m.field });
    }
  }

  const inSomeWrittenBox = (item) => writtenBoxes.some((box) =>
    Math.abs(item.x - box.x) <= 2 && Math.abs(item.y - box.y) <= 2);

  const outside = drawnText.filter((item) => !inSomeWrittenBox(item));

  /* Every refusal is checked against the bytes in the other direction: a field
   * the map refused that nevertheless carries ink is a protected write, and it
   * is found here rather than believed absent. */
  const refusedWithInk = [];
  const markedNames = new Set(marked.map((m) => m.field));
  const writtenNames = new Set(written.map((w) => w.field));
  for (const row of plan) {
    if (row.policy === "write" && writtenNames.has(row.field)) continue;
    if (row.policy === "mark" && markedNames.has(row.field)) continue;
    const boxes = row.rects ?? [];
    for (const box of boxes) {
      const hits = widgets.filter((item) => Math.abs(item.x - box.x) <= 2 && Math.abs(item.y - box.y) <= 2
        && item.text && item.text.trim() !== "");
      for (const hit of hits) refusedWithInk.push({ fieldId: row.field, drawn: hit.text, page: hit.page });
    }
  }

  /* The form's own ink, checked by name. Both AZ binaries ship with `County`
   * already carrying MOHAVE. */
  const county = String(facts["matter.county"] ?? "").toUpperCase();
  const strayMohave = county === "MOHAVE" ? [] : drawnText.filter((w) => /MOHAVE/i.test(w.text));
  assert.deepEqual(strayMohave, [],
    `${formName}: the form's own County value survived into the artifact: ${JSON.stringify(strayMohave)}`);

  return {
    flattenedWidgetAppearancesReadFromOutputBytes: widgets.length,
    addedGlyphsReadFromOutputBytes: drawnText.reduce((n, w) => n + w.text.replace(/\s+/g, "").length, 0),
    valuesReportedByFinalizer: written.length + marked.length,
    nonWhitespaceGlyphsOutsideMeasuredWriteBoxes:
      outside.reduce((n, w) => n + w.text.replace(/\s+/g, "").length, 0),
    refusedFieldsWithInk: refusedWithInk,
    appearancesDrawnForMarkedControls: marked.length,
    measuredWriteBoxes: writtenBoxes.length,
    drawnValues: drawnText.map((w) => ({ page: w.page, x: w.x, y: w.y, text: w.text }))
  };
}

/* ---------------------------------------------------------------------- main */

async function build({ check = false } = {}) {
  const record = readRecord();
  const { resolved, scan, mountedCustodies } = resolveSources();
  const petitionSource = resolved.find((s) => s.componentId === PETITION);
  const orderSource = resolved.find((s) => s.componentId === ORDER);

  const NARRATIVES = [{
    fields: ["Consider1", "Consider2", "Consider3"],
    factId: "matter.best_interests_statement",
    lineFacts: ["matter.best_interests_line_1", "matter.best_interests_line_2", "matter.best_interests_line_3"]
  }];

  const packets = {};
  for (const [fixture, base] of Object.entries(FIXTURES)) {
    const facts = derivedFacts(base);
    const petition = await fillDocument({
      source: petitionSource, plan: PETITION_PLAN, facts,
      marks: marksFor(PETITION_PLAN, facts), narratives: NARRATIVES
    });
    const order = await fillDocument({
      source: orderSource, plan: ORDER_PLAN, facts,
      marks: marksFor(ORDER_PLAN, facts)
    });
    const extra = facts["matter.counts_beyond_the_form"] ?? [];
    const continuation = extra.length > 0
      ? await renderComposedPdf(continuationText(facts, PETITION_FORM),
        "Continuation of item 2c - additional counts")
      : null;
    packets[fixture] = { facts, petition, order, continuation };
  }

  /* Both fixtures must write the SAME set of fields and mark the SAME set of
   * controls. A value silently dropped for one participant and written for
   * another is the failure this assertion exists to make impossible. */
  const shape = (p) => ({
    petitionWrites: p.petition.written.map((w) => w.field).sort(),
    petitionMarks: p.petition.marked.map((m) => m.field).sort(),
    orderWrites: p.order.written.map((w) => w.field).sort(),
    orderMarks: p.order.marked.map((m) => m.field).sort(),
    continuation: p.continuation !== null
  });
  assert.deepEqual(shape(packets.canonical), shape(packets.boundary),
    `${FAMILY_ID}: the two fixtures do not produce the same packet shape`);

  if (check) {
    for (const [fixture, packet] of Object.entries(packets)) {
      for (const [name, doc] of [["petition", packet.petition], ["order", packet.order]]) {
        const onDisk = path.join(OUT, "fixtures", fixture, `${name}.pdf`);
        assert.ok(fs.existsSync(onDisk), `${FAMILY_ID}: ${onDisk} is missing`);
        assert.equal(sha256(fs.readFileSync(onDisk)), doc.sha256,
          `${FAMILY_ID}: ${onDisk} does not match a fresh build of the same inputs`);
      }
      if (packet.continuation) {
        const onDisk = path.join(OUT, "fixtures", fixture, "continuation.pdf");
        assert.equal(sha256(fs.readFileSync(onDisk)), sha256(packet.continuation),
          `${FAMILY_ID}: ${onDisk} does not match a fresh build of the same inputs`);
      }
    }
    console.log(`CHECK_OK ${FAMILY_ID}`);
    return;
  }

  ensureDir(OUT);
  ensureDir(path.join(OUT, "reports"));

  const artifacts = [];
  const actualWriteArtifacts = [];
  for (const [fixture, packet] of Object.entries(packets)) {
    ensureDir(path.join(OUT, "fixtures", fixture));
    const files = [
      { name: "petition.pdf", doc: packet.petition, documentId: PETITION_FORM, componentId: PETITION },
      { name: "order.pdf", doc: packet.order, documentId: ORDER_FORM, componentId: ORDER }
    ];
    for (const entry of files) {
      const rel = path.join(OUT, "fixtures", fixture, entry.name);
      fs.writeFileSync(rel, entry.doc.bytes);
      const evidence = await evidenceFromBytes({
        file: rel, written: entry.doc.written, marked: entry.doc.marked,
        plan: entry.componentId === PETITION ? PETITION_PLAN : ORDER_PLAN,
        form: entry.documentId, facts: packet.facts
      });
      artifacts.push({
        fixture, componentId: entry.componentId, documentId: entry.documentId,
        formNumber: entry.documentId, file: rel, sha256: entry.doc.sha256,
        byteLength: entry.doc.bytes.length, pageCount: entry.doc.pageCount,
        valuesWrittenFromOutputBytes: evidence.addedGlyphsReadFromOutputBytes > 0
          ? entry.doc.written.length : 0,
        controlsMarked: entry.doc.marked.length,
        finalizerRefusals: entry.doc.refused.length
      });
      actualWriteArtifacts.push({
        fixture, componentId: entry.componentId, documentId: entry.documentId,
        outputFile: rel, sha256: entry.doc.sha256, byteLength: entry.doc.bytes.length,
        ...evidence,
        marks: entry.doc.marked,
        actualWrites: entry.doc.written.map((w) => ({
          field: w.field, factId: w.factId, label: w.label, drawnText: w.value,
          fontSize: w.fontSize, outcome: w.outcome
        }))
      });
    }
    if (packet.continuation) {
      const rel = path.join(OUT, "fixtures", fixture, "continuation.pdf");
      fs.writeFileSync(rel, packet.continuation);
      const doc = await PDFDocument.load(packet.continuation);
      artifacts.push({
        fixture, componentId: CONTINUATION, documentId: CONTINUATION_ID,
        formNumber: CONTINUATION_ID, file: rel, sha256: sha256(packet.continuation),
        byteLength: packet.continuation.length, pageCount: doc.getPageCount(),
        valuesWrittenFromOutputBytes: (packet.facts["matter.counts_beyond_the_form"] ?? []).length,
        controlsMarked: 0, finalizerRefusals: 0
      });
    }
  }
  return { record, resolved, scan, mountedCustodies, packets, artifacts, actualWriteArtifacts };
}

/**
 * Measure every planned field off the source document once.
 *
 * The coordinates in the field map are a first-hand measurement made again from
 * the exact bound bytes on every build, never a remembered number. A plan row
 * whose rectangle cannot be measured is a row about a field that is not there.
 */
async function measurePlanRects(source, plan) {
  const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: true, updateMetadata: false });
  const form = doc.getForm();
  const pages = doc.getPages();
  const pageOf = new Map(pages.map((p, i) => [p.ref.tag, i + 1]));
  for (const row of plan) {
    const field = form.getField(row.field);
    row.rects = field.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      const parent = w.P();
      return {
        page: parent ? (pageOf.get(parent.tag) ?? null) : null,
        x: +r.x.toFixed(2), y: +r.y.toFixed(2),
        width: +r.width.toFixed(2), height: +r.height.toFixed(2)
      };
    });
    row.page = row.rects[0]?.page ?? null;
    row.pdfType = field.constructor.name.replace(/^PDF/, "");
  }
}

/* ---------------------------------------------------------- the field map */

function fieldMapRows(plan, documentId) {
  const writes = [];
  const refusals = [];
  for (const row of plan) {
    const common = {
      fieldId: `${documentId}::${row.field}`,
      fieldName: row.field,
      field: row.field,
      documentId,
      formNumber: documentId,
      page: row.page,
      effectiveLabel: row.label,
      printedLabel: row.label,
      sectionHeading: row.section ?? null,
      pdfType: row.pdfType ?? null,
      widgets: row.rects ?? [],
      rectBasis: "measured_from_the_bound_source_bytes_on_this_build"
    };
    if (row.policy === "write") {
      writes.push({ ...common, factId: row.factId, kind: "acroform_text" });
    } else if (row.policy === "mark") {
      writes.push({
        ...common, kind: "selection_control", isSelectionControl: true,
        disposition: "selected", factId: row.factId ?? null,
        routeDetermined: row.routeDetermined === true, why: row.why
      });
    } else {
      refusals.push({
        ...common,
        kind: row.isSelectionControl ? "selection_control" : "acroform_text",
        isSelectionControl: row.isSelectionControl === true,
        reason: row.reason,
        refusalClass: row.refusalClass ?? null,
        requiredBeforeFiling: false,
        routeDetermined: false,
        ...(row.completenessDisposition ? { completenessDisposition: row.completenessDisposition } : {}),
        ...(row.routeConditionThatMakesItInapplicable
          ? { routeConditionThatMakesItInapplicable: row.routeConditionThatMakesItInapplicable } : {})
      });
    }
  }
  return { writes, refusals };
}

function emit(result) {
  const { record, resolved, scan, mountedCustodies, packets, artifacts, actualWriteArtifacts } = result;

  const petitionRows = fieldMapRows(PETITION_PLAN, PETITION_FORM);
  const orderRows = fieldMapRows(ORDER_PLAN, ORDER_FORM);

  /* The composed continuation carries its own rows, so the map describes every
   * page the participant receives rather than only the two acquired ones. */
  const continuationRows = {
    writes: [
      { fieldId: `${CONTINUATION_ID}::court`, fieldName: "court", field: "court", documentId: CONTINUATION_ID,
        formNumber: CONTINUATION_ID, page: 1, effectiveLabel: "Name of court", printedLabel: "COURT",
        factId: "matter.court_name", kind: "composed_text",
        rectBasis: "composed_document_authored_by_this_build" },
      { fieldId: `${CONTINUATION_ID}::county`, fieldName: "county", field: "county", documentId: CONTINUATION_ID,
        formNumber: CONTINUATION_ID, page: 1, effectiveLabel: "County of the court", printedLabel: "COUNTY",
        factId: "matter.county", kind: "composed_text",
        rectBasis: "composed_document_authored_by_this_build" },
      { fieldId: `${CONTINUATION_ID}::case-number`, fieldName: "case-number", field: "case-number",
        documentId: CONTINUATION_ID, formNumber: CONTINUATION_ID, page: 1,
        effectiveLabel: "Case Number", printedLabel: "CASE NUMBER",
        factId: "matter.case_number", kind: "composed_text",
        rectBasis: "composed_document_authored_by_this_build" },
      { fieldId: `${CONTINUATION_ID}::petitioner`, fieldName: "petitioner", field: "petitioner",
        documentId: CONTINUATION_ID, formNumber: CONTINUATION_ID, page: 1,
        effectiveLabel: "Petitioner's name", printedLabel: "PETITIONER",
        factId: "participant.full_legal_name", kind: "composed_text",
        rectBasis: "composed_document_authored_by_this_build" },
      { fieldId: `${CONTINUATION_ID}::additional-counts`, fieldName: "additional-counts", field: "additional-counts",
        documentId: CONTINUATION_ID, formNumber: CONTINUATION_ID, page: 1,
        effectiveLabel: "Additional counts in this case, beyond the four the petition holds",
        printedLabel: "ADDITIONAL COUNTS IN THIS CASE",
        factId: "matter.counts", kind: "composed_text",
        rectBasis: "composed_document_authored_by_this_build" }
    ],
    refusals: [
      { fieldId: `${CONTINUATION_ID}::signature`, fieldName: "signature", field: "signature",
        documentId: CONTINUATION_ID, formNumber: CONTINUATION_ID, page: 1,
        effectiveLabel: "Signature of the Petitioner on the continuation",
        printedLabel: "Signature of the Petitioner", kind: "composed_text", isSelectionControl: false,
        reason: "signature or date field; never prefilled. The continuation is part of the petition the participant signs under penalty of perjury.",
        refusalClass: SIGNATURE, requiredBeforeFiling: false, routeDetermined: false,
        rectBasis: "composed_document_authored_by_this_build" },
      { fieldId: `${CONTINUATION_ID}::signature-date`, fieldName: "signature-date", field: "signature-date",
        documentId: CONTINUATION_ID, formNumber: CONTINUATION_ID, page: 1,
        effectiveLabel: "Date beside the Petitioner's signature on the continuation",
        printedLabel: "Date", kind: "composed_text", isSelectionControl: false,
        reason: "signature or date field; never prefilled. The date of a declaration made under penalty of perjury is made by the person signing, on the day they sign.",
        refusalClass: SIGNATURE, requiredBeforeFiling: false, routeDetermined: false,
        rectBasis: "composed_document_authored_by_this_build" }
    ]
  };

  const factMap = {};
  for (const [factId, value] of Object.entries(packets.canonical.facts)) {
    if (Array.isArray(value)) { factMap[factId] = `${value.length} value(s) held`; continue; }
    if (typeof value === "string" && value.trim()) factMap[factId] = "held";
  }

  writeJson(path.join(OUT, "production-field-map.json"), {
    schemaVersion: "rcap-production-field-map/v1",
    familyId: FAMILY_ID,
    jurisdiction: JURISDICTION,
    trackId: TRACK_ID,
    implementationStrategy: STRATEGY,
    routeKeys: [ROUTE_KEY],
    buildScript: BUILD_SCRIPT,
    documents: [
      { documentId: PETITION_FORM, componentId: PETITION, boundBySha256: petitionSourceOf(resolved).sha256 },
      { documentId: ORDER_FORM, componentId: ORDER, boundBySha256: orderSourceOf(resolved).sha256 },
      { documentId: CONTINUATION_ID, componentId: CONTINUATION, boundBySha256: null,
        composed: "A region of the petition, composed by the packet. DET-AZ-CONT-IS-NOT-A-DOCUMENT-AOCCRSL1F-050825-CONT removes the phantom official-form obligation, so nothing is acquired for it and no binary is bound." }
    ],
    factMap,
    writes: [...petitionRows.writes, ...orderRows.writes, ...continuationRows.writes],
    refusals: [...petitionRows.refusals, ...orderRows.refusals, ...continuationRows.refusals]
  });

  writeJson(path.join(OUT, "reports/actual-writes.json"), {
    schemaVersion: "rcap-actual-writes-from-output-bytes/v1",
    familyId: FAMILY_ID,
    method: "Every artifact is reopened after it is written and its flattened widget appearance streams are read out of the bytes with their drawn text and page coordinates. A value the build reports and the bytes do not carry is a defect the build reports on itself; a field the map refuses that carries ink in the bytes is a protected write.",
    artifacts: actualWriteArtifacts,
    documents: actualWriteArtifacts.map((a) => ({
      documentId: a.documentId, fixture: a.fixture, actualWrites: a.actualWrites
    }))
  });

  writeJson(path.join(OUT, "reports/rendered-artifacts.json"), {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    derivedFromBytes: true,
    componentSet: [PETITION, ORDER, CONTINUATION],
    documentSet: [PETITION_FORM, ORDER_FORM, CONTINUATION_ID],
    packets: Object.keys(FIXTURES).map((fixture) => ({
      fixture,
      documents: artifacts.filter((a) => a.fixture === fixture)
        .map((a) => ({ componentId: a.componentId, documentId: a.documentId, file: a.file, sha256: a.sha256, pageCount: a.pageCount }))
    })),
    artifacts
  });

  const identityNote =
    "Bound under the printed 050625 identity per DET-AZ-SEALING-PRINTED-IDENTITY-IS-050625. MEASURED HERE, and recorded because it disagrees with the identity above it: the page footers of the held bytes print the 050825 string on every page and print no 050625 string anywhere. The determination governs the identity; this line records what the bytes say, so the next reader is not surprised by it. Nothing here re-opens the determination.";

  writeJson(path.join(OUT, "source-receipt.json"), {
    schemaVersion: "rcap-source-receipt/v2",
    familyId: FAMILY_ID,
    jurisdiction: JURISDICTION,
    allSourcesExact: true,
    resolutionMethod: "sha256_index_over_mounted_custodies",
    resolutionNote: "Every source is resolved by CONTENT HASH and never by declared path. Three of the five custodies this repository declares are not mounted here, and every wrong BLOCKED_SOURCE this operation has produced came from trusting a path. The index is asserted non-empty before any absence is believed.",
    indexScan: { filesIndexed: scan.files, distinctDigests: scan.digests, roots: MOUNTED_CUSTODY_ROOTS },
    custodies: mountedCustodies,
    sources: resolved.map((s) => ({
      componentId: s.componentId,
      documentId: s.documentId,
      sourceId: s.sourceId,
      boundIdentity: s.boundIdentity,
      supersededIdentity: s.supersededIdentity,
      title: s.title,
      instrumentKind: s.instrumentKind,
      sha256: s.sha256,
      sha256Exact: true,
      byteLength: s.expectedBytes,
      pageCount: s.expectedPages,
      acroFieldCount: s.expectedFields,
      resolvedPath: s.resolvedPath,
      declaredPaths: s.declaredPaths,
      resolvedBy: s.resolvedBy,
      printedFooterIdentityMeasuredHere: s.printedFooterIdentity,
      identityDetermination: "DET-AZ-SEALING-PRINTED-IDENTITY-IS-050625",
      identityNote
    })),
    documents: resolved.map((s) => ({ documentId: s.documentId, sha256: s.sha256 })).concat([
      { documentId: CONTINUATION_ID, sha256: null,
        composedNotAcquired: "DET-AZ-CONT-IS-NOT-A-DOCUMENT-AOCCRSL1F-050825-CONT: the continuation names no published document. It is a region of the parent instrument, composed by the packet, so no binary is owed and none is bound." }
    ]),
    determinationsFollowed: [
      "DET-AZ-SEALING-PRINTED-IDENTITY-IS-050625",
      "DET-AZ-CONT-IS-NOT-A-DOCUMENT-AOCCRSL1F-050825-CONT"
    ]
  });

  writeJson(path.join(OUT, "packet-set-manifest.json"), {
    schemaVersion: "rcap-packet-set-manifest/v1",
    familyId: FAMILY_ID,
    trackId: TRACK_ID,
    jurisdiction: JURISDICTION,
    committedManifestVersion: record.packetSet.version,
    components: record.packetSet.components.map((c) => ({
      componentId: c.componentId,
      role: c.role,
      requirement: c.requirement,
      conditionDescription: c.conditionDescription,
      officialFormIdInTheCommittedManifest: c.officialFormId,
      officialFormIdAsBuilt: c.componentId === PETITION ? PETITION_FORM
        : c.componentId === ORDER ? ORDER_FORM : CONTINUATION_ID,
      generated: true,
      generatedBecause: c.componentId === CONTINUATION
        ? "Both fixtures carry more counts than item 2c's four lines hold, so the conditional continuation's condition - 'For additional counts.' - is met and the sheet is generated. A case with four counts or fewer would not generate it and the petition's own control would stay unmarked."
        : "Required or conditional-and-met on this route."
    })),
    componentsNotGenerated: []
  });

  writeJson(path.join(OUT, "product-wiring.json"), {
    schemaVersion: "rcap-product-wiring/v1",
    familyId: FAMILY_ID,
    routeKeys: [ROUTE_KEY],
    implementationStrategy: STRATEGY,
    buildScript: BUILD_SCRIPT,
    directory: OUT,
    commercialAuthority: "none. A built family is a built family: it is not verified, not approved, not sellable, and this build opens no route.",
    requiredFactsForGeneration: (record.track.generationRequirements ?? []).map((g) => ({ key: g.key, question: g.question, requirement: g.requirement }))
  });

  fs.writeFileSync(path.join(OUT, "participant-instructions.md"),
    participantInstructions(record, plannedElections()));

  writeJson(path.join(OUT, "build-status.json"), {
    schemaVersion: "rcap-build-status/v1",
    familyId: FAMILY_ID,
    buildStatus: "state_built",
    reviewStatus: { qa: "qa_review_pending", visual: "visual_review_pending", counsel: "counsel_review_pending" },
    approvedForLive: false, live: false,
    builtBy: BUILD_SCRIPT
  });
  return { petitionRows, orderRows, continuationRows };
}

const petitionSourceOf = (resolved) => resolved.find((s) => s.componentId === PETITION);
const orderSourceOf = (resolved) => resolved.find((s) => s.componentId === ORDER);

/** The controls this packet deliberately leaves unmarked, for the participant page. */
function plannedElections() {
  const rows = [];
  for (const [documentLabel, plan] of [["the petition", PETITION_PLAN], ["the proposed order", ORDER_PLAN]]) {
    for (const row of plan) {
      if (row.policy !== "refuse") continue;
      if (row.refusalClass !== PARTICIPANT_ELECTION) continue;
      rows.push({ document: documentLabel, label: row.label, why: row.reason });
    }
  }
  return rows;
}

/* ------------------------------------------------------------ build findings */

function buildFindings(result) {
  const { record, resolved, scan, packets } = result;
  const petitionSource = petitionSourceOf(resolved);
  const orderSource = orderSourceOf(resolved);
  return {
    schemaVersion: "rcap-build-findings/v1",
    familyId: FAMILY_ID,
    buildScript: BUILD_SCRIPT,
    findings: [
      {
        id: "AZ-SEALING-PRINTED-FOOTER-DISAGREES-WITH-BOUND-IDENTITY",
        severity: "recorded_observation",
        finding: `Both binaries are bound under their 050625 identities per DET-AZ-SEALING-PRINTED-IDENTITY-IS-050625, and both print the 050825 string in their own page footers on every page - ${petitionSource.printedFooterIdentity} on all five pages of the petition and ${orderSource.printedFooterIdentity} on all three pages of the order - and print no 050625 string anywhere.`,
        whatThisBuildDid: "Followed the determination: bound both binaries by content hash, recorded them under the 050625 identities, and recorded this measurement beside them in source-receipt.json rather than quietly reconciling it. The determination is not re-opened here.",
        whyItMatters: "The bytes the participant files carry the 050825 footer, because they are the exact published bytes and this build changes no footer. A reader comparing the receipt with the artifact will see the difference and should not have to rediscover it."
      },
      {
        id: "AZ-SEALING-FORM-SHIPS-A-COUNTY-ALREADY-FILLED-IN",
        severity: "defect_in_the_official_form",
        finding: "Both published binaries ship with the AcroForm text field `County` already carrying the value \"MOHAVE\" - on the line that names the county the petition is filed in, directly under the form's own printed instruction \"Select a county.\"",
        whatThisBuildDid: "Writes the participant's own county over it on both documents, and then asserts from the OUTPUT BYTES that no artifact carries the string MOHAVE anywhere unless the participant's county actually is Mohave.",
        whyItMatters: "Flattened unchanged, that value would put a wrong county on the face of a petition sworn under penalty of perjury, for every participant in the other fourteen Arizona counties. The shared widget-contribution rule would also have dropped an unwritten field, but a defect this specific earns a check of its own rather than a dependency on a default."
      },
      {
        id: "AZ-SEALING-ORDER-CARRIES-TWO-SHARED-VALUE-FINDING-CONTROLS",
        severity: "defect_in_the_official_form",
        finding: "On the order, `Check Box5` carries two widgets and `Check Box20` carries two widgets, and in each case BOTH widgets have the same /Yes appearance state. Marking either one marks both: on Check Box5 that is the finding that the court served the prosecuting agency AND the finding about the sixty-day period, and on Check Box20 it is 'not filed in the correct court' AND 'Other'.",
        whatThisBuildDid: "Nothing. Every control on pages 2 and 3 of the order is court-owned and this build marks none of them, so the defect is recorded rather than encountered.",
        whyItMatters: "A court or a later build that marks either control through the AcroForm will silently make a second finding it did not intend. Every control this build DOES mark was measured first and each carries its own distinct on-state."
      },
      {
        id: "AZ-SEALING-PACKET-SET-MANIFEST-COMPONENT-CHECK",
        severity: "checked_directly",
        finding: `The committed packet-set manifest at data/record-clearing/legal-design-packet-set-manifests.json names exactly three components for this family - ${PETITION} (required), ${ORDER} (conditional) and ${CONTINUATION} (conditional) - and this build generates all three.`,
        whatThisBuildDid: "Opened the manifest and compared it component by component, because requiredComponentsMissing derives its denominator from this family's own field map and receipt and never opens that file. The counter cannot report a component the manifest names and the build never mentions.",
        whyItMatters: "A Colorado packet passed with nine zeros while shipping two of four required components. The check is here so this family's answer is a measurement rather than a silence."
      },
      {
        id: "AZ-SEALING-CONTINUATION-IS-CONDITIONAL-AND-ITS-CONDITION-IS-MET",
        severity: "recorded_decision",
        finding: `The continuation component is conditional on 'For additional counts.' Both fixtures carry more than the ${COUNTS_ON_THE_FORM} counts item 2c holds (${packets.canonical.facts["matter.counts"].length} and ${packets.boundary.facts["matter.counts"].length}), so the condition is met, the sheet is generated, and the petition's own 'Additional counts continue on a separate page' control is marked.`,
        whatThisBuildDid: "Generated the sheet as a composed region of the petition and marked the parent's control. A case with four counts or fewer generates no sheet and leaves that control unmarked; the mark and the sheet are driven by the same fact so they can never disagree.",
        whyItMatters: "DET-AZ-CONT-IS-NOT-A-DOCUMENT-AOCCRSL1F-050825-CONT removes the phantom official-form obligation. The sheet is part of the petition, and the control is what says so on the face of the filing."
      },
      {
        id: "AZ-SEALING-WHAT-THIS-BUILD-WILL-NOT-MARK",
        severity: "recorded_decision",
        finding: "Eight controls on the petition are left unmarked on purpose: the amended-petition box, request boxes one and two, the ADOC absolute-discharge and probation-discharge answers, the prior-petition-in-this-case answer, the later-conviction answer, the hearing request and the attachments box.",
        whatThisBuildDid: "Left each blank, classified each as a genuine participant election, and named every one of them in participant-instructions.md so the participant is asked rather than surprised.",
        whyItMatters: "Each is a fact about the participant's record or a decision about their own case that the platform does not hold. A mark on a document sworn under penalty of perjury that the record does not establish is the worst defect this factory can ship, and it is worse than a blank."
      },
      {
        id: "AZ-SEALING-WHAT-THIS-BUILD-DOES-MARK-AND-WHY",
        severity: "recorded_decision",
        finding: "Seven controls are marked. Four are route-determined - representing self, request box three, item 4's judgment-of-guilt option, and the additional-counts control - and three transcribe an intake answer the committed registry's generationRequirements name as required: monetary terms satisfied, other terms completed, prior sealing in Arizona, and pending charges.",
        whatThisBuildDid: "Measured each control's own appearance states off the bound bytes on this build, asserted the target widget carries the on-state being applied and is neither Hidden nor NoView, set the field value and every widget's appearance state explicitly, and drove each fact-driven mark from the fixture's own answer rather than from a hard-coded state.",
        whyItMatters: "A petition that never says which of item 4's three situations it is about is not a petition for this route. And a control whose widgets share one on-state marks more than one thing at once, which is why every state is measured rather than assumed."
      },
      {
        id: "AZ-SEALING-WHITE-PLACEHOLDER-TEXT-READS-AS-AN-OVERLAP-AND-IS-NOT-ONE",
        severity: "measured_and_recorded_for_the_next_reader",
        finding: "The petition draws the placeholder 'Click to enter a date' inside nine date fields and 'Select a county.' inside the county field, and every one of those runs is drawn with the fill colour operator `1 g` - WHITE INK ON A WHITE PAGE. It is page content, not a field value: a copy of the source with the AcroForm and every annotation deleted still carries all nine.",
        whatThisBuildDid: "Measured the fill colour off the page content stream rather than trusting a text extraction. Two written fields - the date of birth and the date the judgment of guilt was entered - sit exactly on top of a placeholder run, and the county field's value can reach the start of another; none of the three is a visible overlap because none of the placeholders has a visible colour.",
        whyItMatters: "pdftotext reports text a reader cannot see. Any text-based visual check over these artifacts will report three overlaps that are not there, and a lane that repairs them will be repairing nothing. The measurement is recorded here so the next reader checks the colour before believing the extraction."
      },
      {
        id: "AZ-SEALING-SOURCES-RESOLVED-BY-HASH-NOT-BY-PATH",
        severity: "recorded_method",
        finding: `The SHA-256 index built over the mounted custodies on this build carries ${scan.files} files and ${scan.digests} distinct digests, and both source digests resolve inside it.`,
        whatThisBuildDid: "Refused to believe any absence from an index it had not first proved non-empty, and recorded the declared paths as the thing that was declared rather than using them to find anything.",
        whyItMatters: "A scan that indexed zero files once reported every digest in the repository as missing."
      }
    ],
    selfHelpStopConditionsCarried: record.stops.length,
    reviewStatus: "qa_review_pending"
  };
}

function approvalRequest(result) {
  return {
    schemaVersion: "rcap-family-approval-request/v1",
    familyId: FAMILY_ID,
    directory: OUT,
    requested: "independent completeness verification, central raster acceptance, visual review, and counsel review",
    buildStatus: "state_built",
    status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false,
    live: false,
    commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Confirm that marking item 4's third option - a judgment of guilt was entered - is right for a packet built for this route, given the petition is signed under penalty of perjury and the other two options belong to other packet families.",
      "Confirm that transcribing the participant's own intake answers onto Section II questions 1 and 2, Section III question 2 and Section IV question 2 is right, and that leaving Section II questions 3 and 4, Section III question 1 and Section IV question 1 blank is right on the same reasoning.",
      "Confirm that marking request box three alone - all records relating to the eligible charge(s) in the court case number - is the correct scope for a conviction route, and that leaving the arrest-records and charging-documents boxes to the participant does not under-request relief the participant wanted.",
      "Confirm that writing the petitioner's printed name and address into the declaration block while leaving the signature and its date blank is the right treatment for a declaration made under penalty of perjury.",
      "Confirm that reciting the petition's own request on the proposed order, while leaving every finding and every decretal election blank, is right for an order the participant lodges unexecuted.",
      "Confirm the fee treatment: the record establishes no statewide figure, the packet names the clerk of the filing court, and the packet states in terms that the section 13-911(C)(2) and (C)(3) limb of the DPS-fee waiver is not this route."
    ],
    mattersForTheReviewersAttention: [
      "The two bound binaries print 050825 in their own page footers on every page while being bound under their 050625 identities, per the captain determination. See source-receipt.json and build-findings.json.",
      "Both published binaries ship with the County field already carrying MOHAVE. The build overwrites it and asserts from the output bytes that it does not survive.",
      "Two controls on the proposed order carry two widgets sharing one on-state, so marking either marks both. This build marks neither; the finding is recorded for whoever does."
    ],
    verifiedByThisBuild: "nothing. This builder issues no verdict on its own packets."
  };
}

/* ------------------------------------------------------------------ the CLI */

const argv = process.argv.slice(2);
if (argv.includes("--check")) {
  const record = readRecord();
  const { resolved } = resolveSources();
  await measurePlanRects(petitionSourceOf(resolved), PETITION_PLAN);
  await measurePlanRects(orderSourceOf(resolved), ORDER_PLAN);
  await build({ check: true });
  void record;
} else {
  const pre = resolveSources();
  await measurePlanRects(petitionSourceOf(pre.resolved), PETITION_PLAN);
  await measurePlanRects(orderSourceOf(pre.resolved), ORDER_PLAN);
  const result = await build({});
  emit(result);
  writeJson(path.join(OUT, "build-findings.json"), buildFindings(result));
  writeJson(path.join(OUT, "approval-request.json"), approvalRequest(result));
  writeJson(path.join(OUT, "reports/blanks-left-for-the-participant.json"), {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1",
    familyId: FAMILY_ID,
    everyOneOfTheseIsNamedInParticipantInstructions: true,
    elections: plannedElections(),
    protectedBlanks: [...PETITION_PLAN, ...ORDER_PLAN]
      .filter((r) => r.refusalClass === SIGNATURE || r.refusalClass === COURT_OWNED)
      .map((r) => ({ field: r.field, label: r.label, reason: r.reason }))
  });
  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, "measured by the independent verifier, never by this build"]));
  writeJson(path.join(OUT, "reports/what-this-build-does-not-decide.json"), {
    schemaVersion: "rcap-build-self-limits/v1",
    familyId: FAMILY_ID,
    counters,
    note: "This builder renders and records. It runs no completeness audit, issues no verdict, opens no route and changes no central state."
  });
  console.log(`BUILD_OK ${FAMILY_ID}`);
  for (const a of result.artifacts) {
    console.log(`  ${a.fixture.padEnd(9)} ${a.documentId.padEnd(38)} ${a.sha256}  ${a.pageCount}pp  ${a.byteLength}B`);
  }
}
