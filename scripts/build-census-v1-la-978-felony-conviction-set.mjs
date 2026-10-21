#!/usr/bin/env node
/**
 * Deterministic census-v1 builder for `la-978-felony-conviction-set`.
 *
 *   node scripts/build-census-v1-la-978-felony-conviction-set.mjs --no-raster
 *   node scripts/build-census-v1-la-978-felony-conviction-set.mjs --check
 *
 * WHAT THIS FAMILY IS
 *
 * The Louisiana Article 978 felony-conviction expungement packet. The
 * committed LA-STATUTORY-FORMS owner determination grants this family, by name,
 * composition from authority of exactly four statutory forms:
 *
 *   LA-CCRP-ART-988, LA-CCRP-ART-989, LA-CCRP-ART-991, LA-CCRP-ART-992
 *
 * and lists nothing under `remainOfficialAndMustBeHeld`. The grant is read back
 * from the record at build time and every one of those four assertions is an
 * assertion this build makes about the record rather than about itself.
 *
 * WHAT IS RENDERED AND WHAT IS NOT, AND WHY
 *
 * The authoritative packet set carries seven components. Three are required
 * statutory instruments and one is required participant guidance; those four are
 * rendered. The other three are CONDITIONAL, and the condition each record
 * states is not met by either fixture:
 *
 *   fee_waiver LA-CCRP-ART-988 -- the committed rule for THIS track is blunter
 *     than the conditional itself: "Louisiana State Police states that a person
 *     is ineligible for the exemption if they have ever been convicted of a
 *     felony, including an expunged felony. On a felony conviction track the
 *     exemption will almost never be available, and the packet says so rather
 *     than implying a waiver that will be refused." Every route this family
 *     serves is a felony-conviction route, so the component is not generated and
 *     the record's own sentence is quoted to the participant instead.
 *
 *   continuation LA-CCRP-ART-993 -- used "only where the arrest carries more
 *     charges or counts than the Article 989 motion's own fields hold". Both
 *     fixtures are single-arrest, single-count. The committed legal-design note
 *     for Article 993 also states in terms that "No template exists yet, none is
 *     counsel-approved, and no implementation is authorized here", and Article
 *     993 is NOT in this family's composedFromAuthority grant. Two independent
 *     reasons, either of which alone withholds it.
 *
 *   instructions LA-CCRP-ART-984 -- applies only where the conviction is for
 *     operating a vehicle while intoxicated. Neither fixture
 *     is an intoxicated-operation conviction. Article 984's controlling
 *     requirements are quoted in the filing instructions so a participant on
 *     that branch is told what the record says, rather than left to find out.
 *
 * A conditional component whose condition is not met is not a missing component.
 * It is recorded as not generated, with the record's own condition text, in the
 * packet set manifest and in build-findings.json.
 *
 * SOURCES ARE RESOLVED BY CONTENT HASH, NEVER BY DECLARED PATH
 *
 * The queue row declares this family's three held sources at paths inside
 * `private/source-imports/rcap-d-source-packs-2026-08-12/`, a custody that is
 * not mounted here. Every one of those digests resolves exactly inside the
 * Master Library, which is mounted. Resolution is therefore by SHA-256 across
 * the mounted corpus and the declared path is carried only as the thing that was
 * declared. A digest that resolves nowhere stops the build and is named.
 *
 * These three are AUTHORITY REFERENCES, not rendered components: Article 990 is
 * the responding agency's own affidavit and is never printed in a participant
 * packet, Article 993 is the withheld continuation sheet, and Article 984 is the
 * intoxicated-operation requirement text.
 *
 * EVERY RECORD IS PINNED TWICE
 *
 * A shared national record is pinned by whole-file SHA-256 AND by the SHA-256 of
 * this family's own entry inside it. A whole-file pin on a shared record goes
 * stale the moment an unrelated jurisdiction is productised, and a receipt that
 * has gone stale for a reason that has nothing to do with this family proves
 * nothing about this family.
 *
 * This build never rasterises, never verifies itself, opens no route and changes
 * no central state.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { stampDeterministic } from "./rcap-official-forms/rcap-deterministic-pdf-date.mjs";
import { PASS_COUNTERS, BLANK_DISPOSITIONS, classifyBlank, classifyField, rowKeyOf }
  from "./rcap-packet-completeness/completeness-contract.mjs";

const thisFile = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(thisFile), "..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

/* ---------------------------------------------------------------- identity */

const FAMILY_ID = "la-978-felony-conviction-set";
const TRACK_ID = "la-978-felony-conviction";
const JURISDICTION = "LA";
const OWNER_DECISION = "LA-STATUTORY-FORMS";
const STRATEGY = "custom_pleading";
const CUSTODY_CLASS = "SOURCE_BOUND_BY_HELD_BYTES";
const OUT = "data/rcap-all50/overlays/census-v1/la/la-978-felony-conviction-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-la-978-felony-conviction-set.mjs";

const MOTION = "LA-CCRP-ART-989";
const ORDER = "LA-CCRP-ART-991";
const EXPUNGEMENT_ORDER = "LA-CCRP-ART-992";
const GUIDE = "la-978-felony-conviction-instructions-7";

const COMPONENT = Object.freeze({
  motion: "la-978-felony-conviction-primary-filing-1",
  order: "la-978-felony-conviction-proposed-order-2",
  expungementOrder: "la-978-felony-conviction-proposed-order-3",
  feeWaiver: "la-978-felony-conviction-fee-waiver-4",
  continuation: "la-978-felony-conviction-continuation-5",
  owiInstructions: "la-978-felony-conviction-instructions-6",
  guide: "la-978-felony-conviction-instructions-7"
});

const RENDERED_COMPONENTS = [COMPONENT.motion, COMPONENT.order, COMPONENT.expungementOrder, COMPONENT.guide];
const DOCUMENT_OF = Object.freeze({
  [COMPONENT.motion]: MOTION,
  [COMPONENT.order]: ORDER,
  [COMPONENT.expungementOrder]: EXPUNGEMENT_ORDER,
  [COMPONENT.guide]: GUIDE
});
const TITLES = Object.freeze({
  [COMPONENT.motion]: "Article 989 Motion for Expungement of a Record of Arrest and Conviction of a Felony",
  [COMPONENT.order]: "Article 991 Order",
  [COMPONENT.expungementOrder]: "Article 992 Order of Expungement",
  [COMPONENT.guide]: "Article 978 Participant and Filing Instructions"
});

const SIGNATURE = "signature_or_date_participant_completion";
const COURT_OWNED = "court_prosecutor_clerk_or_agency_owned";
const DOTS = (count) => ".".repeat(count);

/* ----------------------------------------------------------- the records */

const RECORDS = Object.freeze({
  owner: "data/rcap-grade-a/legal-decisions/OWNER_DETERMINATIONS_2026-09-02.json",
  queue: "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json",
  census: "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json",
  memo: "data/record-clearing/legal-design-intake/LA.memo.json",
  registry: "data/record-clearing/legal-design-track-registry.json",
  manifest: "data/record-clearing/legal-design-packet-set-manifests.json",
  relationships: "data/record-clearing/legal-design-track-source-relationships.json"
});

const stable = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
};
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const entryDigest = (value) => sha256(Buffer.from(stable(value), "utf8"));

function readRecord(relative) {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  return { path: relative, bytes, data: JSON.parse(bytes.toString("utf8")), sha256: sha256(bytes), byteLength: bytes.length };
}

/**
 * Bind the records, and bind this family's own entry inside each of them.
 *
 * The pin that matters for a shared record is the second one. Ten receipts went
 * stale last cohort because they pinned only the whole file, and the whole file
 * moves whenever any jurisdiction in it moves.
 */
function loadAuthorityBinding() {
  const loaded = Object.fromEntries(Object.entries(RECORDS).map(([key, rel]) => [key, readRecord(rel)]));
  const pins = [];
  const pin = (key, pointer, entry) => {
    const record = loaded[key];
    pins.push({
      record: record.path,
      wholeFileSha256: record.sha256,
      byteLength: record.byteLength,
      thisFamilysEntry: pointer,
      thisFamilysEntrySha256: entryDigest(entry),
      whyBothPinsExist: "the whole-file pin detects any edit to a shared national record; the entry pin says whether the edit touched this family"
    });
    return entry;
  };

  const owner = loaded.owner.data.determinations.find((row) => row.id === OWNER_DECISION);
  assert.ok(owner, `${OWNER_DECISION} owner determination is missing`);
  assert.equal(owner.decision, "COMPOSE_FROM_AUTHORITY");
  assert.equal(owner.authorityHeld, true);
  const ownerFamily = owner.families.find((row) => row.familyId === FAMILY_ID);
  assert.ok(ownerFamily, `${OWNER_DECISION} does not name ${FAMILY_ID}`);
  assert.equal(ownerFamily.strategy, STRATEGY);
  assert.deepEqual(ownerFamily.composedFromAuthority, [MOTION.replace("989", "988"), MOTION, ORDER, EXPUNGEMENT_ORDER]);
  assert.deepEqual(ownerFamily.remainOfficialAndMustBeHeld, []);
  pin("owner", `determinations[id=${OWNER_DECISION}].families[familyId=${FAMILY_ID}]`, ownerFamily);

  const queueFamily = loaded.queue.data.families.find((row) => row.familyId === FAMILY_ID);
  assert.ok(queueFamily, `MASTER_QUEUE carries no ${FAMILY_ID}`);
  assert.equal(queueFamily.implementationStrategy, STRATEGY);
  assert.equal(queueFamily.sourceStatus, CUSTODY_CLASS);
  assert.equal(queueFamily.sourceReadiness?.ready, true);
  assert.equal(queueFamily.directory, OUT);
  assert.equal(queueFamily.buildScript, BUILD_SCRIPT);
  pin("queue", `families[familyId=${FAMILY_ID}]`, queueFamily);

  const routes = loaded.census.data.routes.filter((row) => row.packetSetId === FAMILY_ID);
  assert.equal(routes.length, queueFamily.routeKeys.length, "the census and the queue must agree on this family's route count");
  assert.deepEqual(routes.map((r) => r.routeKey).sort(), [...queueFamily.routeKeys].sort());
  pin("census", `routes[packetSetId=${FAMILY_ID}]`, routes);

  const memoTrack = loaded.memo.data.tracks.find((row) => row.trackId === TRACK_ID);
  assert.ok(memoTrack, `the LA memo carries no ${TRACK_ID}`);
  assert.ok(Array.isArray(memoTrack.selfHelpStopConditions) && memoTrack.selfHelpStopConditions.length > 0);
  pin("memo", `tracks[trackId=${TRACK_ID}]`, memoTrack);

  const registryTrack = loaded.registry.data.tracks.find((row) => row.trackId === TRACK_ID);
  assert.ok(registryTrack, `the track registry carries no ${TRACK_ID}`);
  assert.ok(registryTrack.destination?.name && registryTrack.destination?.detail && registryTrack.venue);
  assert.ok(Array.isArray(registryTrack.packetSet?.participantActionRequired));
  pin("registry", `tracks[trackId=${TRACK_ID}]`, registryTrack);

  const packetSet = loaded.manifest.data.packetSets.find((row) => row.packetSetId === FAMILY_ID);
  assert.ok(packetSet, `the packet-set manifest carries no ${FAMILY_ID}`);
  pin("manifest", `packetSets[packetSetId=${FAMILY_ID}]`, packetSet);

  const relationships = (loaded.relationships.data.relationships ?? []).filter((row) => row.trackId === TRACK_ID);
  pin("relationships", `relationships[trackId=${TRACK_ID}]`, relationships);

  const components = [...packetSet.components].sort((a, b) => a.order - b.order);
  assert.deepEqual(components.map((c) => c.componentId), [
    COMPONENT.motion, COMPONENT.order, COMPONENT.expungementOrder,
    COMPONENT.feeWaiver, COMPONENT.continuation, COMPONENT.owiInstructions, COMPONENT.guide
  ], "the authoritative component set has changed; this build states the set it was written against");
  for (const componentId of RENDERED_COMPONENTS) {
    const row = components.find((c) => c.componentId === componentId);
    assert.equal(row.requirement, "required", `${componentId} is no longer required in the authoritative packet set`);
  }
  for (const componentId of [COMPONENT.feeWaiver, COMPONENT.continuation, COMPONENT.owiInstructions]) {
    const row = components.find((c) => c.componentId === componentId);
    assert.equal(row.requirement, "conditional", `${componentId} is no longer conditional; a required component may not be withheld`);
    assert.ok(row.conditionDescription, `${componentId} states no condition, so nothing establishes it is unmet`);
  }

  return { owner, ownerFamily, queueFamily, routes, memoTrack, registryTrack, packetSet, components, relationships, pins };
}

/* ------------------------------------------- sources, resolved by content */

const CORPUS_ROOTS = [
  process.env.MASTER_LIBRARY_SOURCE_DIR ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  "private/human-source-returns"
];

function corpusByContentHash() {
  const index = new Map();
  const walk = (dir, custody) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full, custody); continue; }
      const digest = sha256(fs.readFileSync(full));
      if (!index.has(digest)) index.set(digest, { custody, path: path.relative(ROOT, full) });
    }
  };
  const mounted = [];
  for (const root of CORPUS_ROOTS) {
    const abs = path.resolve(ROOT, root);
    if (!fs.existsSync(abs)) continue;
    mounted.push(path.relative(ROOT, abs));
    walk(abs, path.basename(abs));
  }
  assert.ok(mounted.length > 0, `no source custody is mounted; tried ${CORPUS_ROOTS.join(", ")}`);
  return { index, mounted };
}

/**
 * Resolve every declared digest across whatever custody is mounted.
 *
 * A declared path is never opened. Several families have been reported
 * BLOCKED_SOURCE because their declared path pointed into a custody nobody
 * mounted while the bytes sat in the Master Library under a different name.
 */
function resolveHeldSources(queueFamily) {
  const { index, mounted } = corpusByContentHash();
  const resolved = [];
  const absent = [];
  for (const declared of queueFamily.sourceHashes ?? []) {
    const hit = index.get(declared.sha256);
    if (!hit) { absent.push({ sourceId: declared.sourceId, sha256: declared.sha256, declaredPath: declared.path }); continue; }
    const bytes = fs.readFileSync(path.join(ROOT, hit.path));
    const recomputed = sha256(bytes);
    assert.equal(recomputed, declared.sha256, `content-hash index disagrees with the file at ${hit.path}`);
    resolved.push({
      sourceId: declared.sourceId,
      declaredPath: declared.path,
      declaredCustodyMounted: false,
      resolvedPath: hit.path,
      resolvedCustody: hit.custody,
      resolvedBy: "content_hash_across_the_mounted_corpus",
      sha256: recomputed,
      byteLength: bytes.length,
      tier: declared.tier,
      sha256Exact: true
    });
  }
  return { resolved, absent, mounted };
}

/* ------------------------------------------------------------- fixtures */

const FIXTURES = Object.freeze({
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "case.court_name": "Twenty-First Judicial District Court",
    "case.parish": "Tangipahoa Parish",
    "case.docket_number": "TEST-2026-000001",
    "case.division": "Division A",
    "case.arrest_date": "2011-03-08",
    "case.arresting_law_enforcement_agency": "Tangipahoa Parish Sheriff's Office",
    "case.original_arrest_charge": "Original arrest charge exactly as it appears on the state rap sheet",
    "case.conviction_offense": "Felony offense wording from the canonical fixture court record",
    "case.conviction_statute": "Statutory citation from the canonical fixture court record",
    "case.conviction_date": "2011-09-12",
    "case.sentence_completion_date": "2014-09-12",
    "case.eligibility_basis": "Article 978(A)(2) - more than ten years have elapsed since completion of sentence, probation, parole or suspension of sentence, with the district attorney's certification attached",
    "case.background_check_ordered_on": "2026-08-20",
    "case.conviction_is_for_intoxicated_operation": "No",
    "case.charge_count": "One charge on one arrest"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "case.court_name": "Fortieth Judicial District Court for the Parish of Saint John the Baptist",
    "case.parish": "Parish of Saint John the Baptist",
    "case.docket_number": "TEST-BOUNDARY-2026-0000000000000001",
    "case.division": "Division Z-Long",
    "case.arrest_date": "2004-12-31",
    "case.arresting_law_enforcement_agency": "Saint John the Baptist Parish Sheriff's Office, Criminal Patrol Division",
    "case.original_arrest_charge": "Original arrest charge exactly as it appears on the state rap sheet, including the full charge description carried by the boundary fixture record",
    "case.conviction_offense": "Felony offense wording exactly as it appears on the boundary fixture court record, including the full court-record description",
    "case.conviction_statute": "Statutory citation exactly as it appears on the boundary fixture court record",
    "case.conviction_date": "2005-06-30",
    "case.sentence_completion_date": "2009-06-30",
    "case.eligibility_basis": "Article 978(A)(3) - the conviction is one for which a first offender pardon was granted, evidenced by the pardon itself",
    "case.background_check_ordered_on": "2026-08-01",
    "case.conviction_is_for_intoxicated_operation": "No",
    "case.charge_count": "One charge on one arrest"
  }
});

/* ------------------------------------------------------- field-map rows */

const base = (document, id, label, page) => ({
  field: `${document}.${id}`,
  fieldName: `${document}.${id}`,
  document,
  page,
  printedLabel: label,
  printedLine: label,
  effectiveLabel: label,
  regionHeading: null,
  rectBasis: "composed_statutory_instrument_authored_by_this_build_from_the_committed_authority"
});

const write = (document, id, label, factId, page = 1) => ({ ...base(document, id, label, page), factId, kind: "composed_text" });

/** A fact the platform does not hold, which the participant supplies before filing. */
const supply = (document, id, label, participantMustSupply, why, page = 1, extra = {}) => ({
  ...base(document, id, label, page),
  reason: `the participant supplies this before filing: ${participantMustSupply}`,
  category: null,
  completenessClass: null,
  class: null,
  completenessDisposition: "REQUIRED_BEFORE_FILING",
  requiredBeforeFiling: true,
  routeDetermined: false,
  identity: `${document} field ${id}`,
  factId: null,
  participantMustSupply,
  why,
  ...extra
});

const protectedRow = (document, id, label, why, page = 1) => ({
  ...base(document, id, label, page),
  reason: "signature or date field; the person whose signature it is signs it",
  category: SIGNATURE,
  completenessClass: SIGNATURE,
  class: SIGNATURE,
  completenessDisposition: "PROTECTED_FIELD",
  requiredBeforeFiling: false,
  why
});

const courtRow = (document, id, label, why, page = 1) => ({
  ...base(document, id, label, page),
  reason: "court, clerk, prosecutor, or hearing field; the court completes it",
  category: COURT_OWNED,
  completenessClass: COURT_OWNED,
  class: COURT_OWNED,
  completenessDisposition: "PROTECTED_FIELD",
  requiredBeforeFiling: false,
  why
});

const attorneyRow = (document, id, label, page = 1) => ({
  ...base(document, id, label, page),
  reason: "attorney-only block; the fixture records no representation, so it is not populated with participant data",
  category: null,
  completenessClass: null,
  class: null,
  completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
  requiredBeforeFiling: false,
  why: "the mover is unrepresented on this fixture and the attorney block belongs to counsel"
});

const CAPTION_WRITES = (document) => [
  write(document, "court_name", "Name of court with trial jurisdiction over the offense", "case.court_name"),
  write(document, "parish", "Parish of conviction", "case.parish"),
  write(document, "docket_number", "Docket or case number", "case.docket_number"),
  write(document, "division", "Division of the court", "case.division"),
  write(document, "mover_full_legal_name", "Mover full legal name", "participant.full_legal_name")
];

const CHARGE_WRITES = (document, page = 1) => [
  write(document, "arrest_date", "Date of arrest", "case.arrest_date", page),
  write(document, "arresting_law_enforcement_agency", "Arresting law enforcement agency", "case.arresting_law_enforcement_agency", page),
  write(document, "original_arrest_charge", "Original arrest charge as it appears on the state rap sheet", "case.original_arrest_charge", page),
  write(document, "conviction_offense", "Felony conviction offense", "case.conviction_offense", page),
  write(document, "conviction_statute", "Statute of conviction", "case.conviction_statute", page),
  write(document, "conviction_date", "Date of conviction", "case.conviction_date", page)
];

function motionMap() {
  const writes = [
    ...CAPTION_WRITES(MOTION),
    write(MOTION, "mover_date_of_birth", "Mover date of birth", "participant.date_of_birth"),
    ...CHARGE_WRITES(MOTION),
    write(MOTION, "sentence_completion_date", "Date the sentence, deferred adjudication, probation or parole was completed", "case.sentence_completion_date"),
    write(MOTION, "charge_count", "How many charges this arrest carries", "case.charge_count"),
    write(MOTION, "intoxicated_operation", "Whether the felony conviction is for operating a vehicle while intoxicated", "case.conviction_is_for_intoxicated_operation"),
    write(MOTION, "eligibility_basis", "Statutory basis relied on under Article 978(A)", "case.eligibility_basis"),
    write(MOTION, "background_check_ordered_on", "Date the Louisiana criminal background check was ordered", "case.background_check_ordered_on")
  ];
  const blanks = [
    supply(MOTION, "race", "Race",
      "your race, written as the state rap sheet writes it, so Part I matches the record the Bureau holds",
      "the committed track registry lists race in Part I Defendant Information as required before filing, and the platform holds no value for it"),
    supply(MOTION, "gender", "Gender",
      "your gender, written as the state rap sheet writes it, so Part I matches the record the Bureau holds",
      "the committed track registry lists gender in Part I Defendant Information as required before filing, and the platform holds no value for it"),
    supply(MOTION, "ssn_last_four", "Last four digits of the Social Security number",
      "the last four digits of your Social Security number, written on the form by hand at the moment you file",
      "the platform does not store or write a Social Security number, so no value for it exists to be written"),
    supply(MOTION, "arrest_number", "Arrest or booking number shown on the state rap sheet",
      "the arrest or booking number exactly as your Right to Review or sheriff's background check prints it",
      "the number lives on the rap sheet the participant orders, and the platform holds no copy of it"),
    attorneyRow(MOTION, "attorney_name", "Attorney name in the represented-mover block", 2),
    attorneyRow(MOTION, "attorney_bar_number", "Attorney bar number in the represented-mover block", 2),
    attorneyRow(MOTION, "attorney_address", "Attorney address in the represented-mover block", 2),
    attorneyRow(MOTION, "attorney_telephone", "Attorney telephone in the represented-mover block", 2),
    protectedRow(MOTION, "attorney_signature", "Attorney signature in the represented-mover block",
      "an attorney signs only where representation exists", 2),
    protectedRow(MOTION, "mover_signature", "Signature of the unrepresented mover",
      "the mover signs personally, after reading the completed motion", 2),
    protectedRow(MOTION, "mover_signature_date", "Date of the mover's signature",
      "a date written before signing would be false", 2),
    courtRow(MOTION, "clerk_filing_stamp", "Filed on stamp applied by the clerk",
      "the clerk stamps the motion when it is filed", 2),
    courtRow(MOTION, "clerk_certificate_of_service", "Certificate of service filed by the clerk showing the mailing date",
      "Article 979 makes service the clerk's act and the certificate the clerk's record of it", 2)
  ];
  return {
    formNumber: MOTION,
    documentId: MOTION,
    componentId: COMPONENT.motion,
    documentRole: "primary_filing",
    structuralClass: "codified_statutory_form_composed_from_authority",
    officialFormId: MOTION,
    documentPolicy: { mode: "participant", packetSetId: FAMILY_ID, documentAcceptsFill: true },
    explicitMappings: {},
    roleRefusals: [],
    selectionControls: [],
    canonicalWrites: writes,
    canonicalRefusals: blanks,
    boundaryWrites: writes,
    boundaryRefusals: blanks
  };
}

function orderMap() {
  const writes = CAPTION_WRITES(ORDER);
  const blanks = [
    courtRow(ORDER, "ordering_paragraphs", "Ordering paragraphs on the Article 991 Order",
      "the ordering paragraphs are the court's, and no relief exists until a judge enters them"),
    courtRow(ORDER, "no_contradictory_hearing_finding", "Finding that no contradictory hearing is required",
      "Article 991 lets the court make that finding where an Affidavit of No Opposition from each named entity is attached; the finding is the court's"),
    courtRow(ORDER, "return_date", "Return date set for a contradictory hearing",
      "the court sets any return date after the motion is filed"),
    courtRow(ORDER, "order_date", "Date of the court order",
      "the court dates its own order"),
    courtRow(ORDER, "order_place", "Place of the court order",
      "the court states the place of its own order"),
    courtRow(ORDER, "judge_signature", "Signature of the judge on the Article 991 Order",
      "the judge signs if and when the court enters the order")
  ];
  return {
    formNumber: ORDER,
    documentId: ORDER,
    componentId: COMPONENT.order,
    documentRole: "proposed_order",
    structuralClass: "codified_statutory_form_composed_from_authority",
    officialFormId: ORDER,
    documentPolicy: { mode: "court_issued_order_accepts_caption_facts_only", packetSetId: FAMILY_ID, documentAcceptsFill: true },
    explicitMappings: {},
    roleRefusals: [],
    selectionControls: [],
    canonicalWrites: writes,
    canonicalRefusals: blanks,
    boundaryWrites: writes,
    boundaryRefusals: blanks
  };
}

function expungementOrderMap() {
  const writes = [...CAPTION_WRITES(EXPUNGEMENT_ORDER), ...CHARGE_WRITES(EXPUNGEMENT_ORDER)];
  const blanks = [
    courtRow(EXPUNGEMENT_ORDER, "granted_or_denied", "Whether the motion is granted or denied",
      "granting or denying the motion is the court's decision and this build makes none of it"),
    courtRow(EXPUNGEMENT_ORDER, "decretal_paragraphs", "Decretal paragraphs on the Article 992 Order of Expungement",
      "the decretal paragraphs are the court's judgment"),
    courtRow(EXPUNGEMENT_ORDER, "findings", "Findings on the Article 992 Order of Expungement",
      "findings are made by the court after the Article 980 objection period"),
    courtRow(EXPUNGEMENT_ORDER, "order_date", "Date of the court order",
      "the court dates its own judgment"),
    courtRow(EXPUNGEMENT_ORDER, "order_place", "Place of the court order",
      "the court states the place of its own judgment"),
    courtRow(EXPUNGEMENT_ORDER, "judge_signature", "Signature of the judge on the Article 992 Order of Expungement",
      "the judge signs if and when the court enters the judgment")
  ];
  return {
    formNumber: EXPUNGEMENT_ORDER,
    documentId: EXPUNGEMENT_ORDER,
    componentId: COMPONENT.expungementOrder,
    documentRole: "proposed_order",
    structuralClass: "codified_statutory_form_composed_from_authority",
    officialFormId: EXPUNGEMENT_ORDER,
    documentPolicy: { mode: "court_issued_order_accepts_caption_facts_only", packetSetId: FAMILY_ID, documentAcceptsFill: true },
    explicitMappings: {},
    roleRefusals: [],
    selectionControls: [],
    canonicalWrites: writes,
    canonicalRefusals: blanks,
    boundaryWrites: writes,
    boundaryRefusals: blanks
  };
}

function guideMap() {
  const writes = [write(GUIDE, "participant_name", "Participant full legal name on the instructions", "participant.full_legal_name")];
  return {
    formNumber: GUIDE,
    documentId: GUIDE,
    componentId: COMPONENT.guide,
    documentRole: "instructions",
    structuralClass: "process_guidance",
    officialFormId: null,
    documentPolicy: { mode: "participant", packetSetId: FAMILY_ID, documentAcceptsFill: true },
    explicitMappings: {},
    roleRefusals: [],
    selectionControls: [],
    canonicalWrites: writes,
    canonicalRefusals: [],
    boundaryWrites: writes,
    boundaryRefusals: []
  };
}

const requiredBeforeFilingFields = (maps) => maps.flatMap((map) => map.canonicalRefusals
  .filter((row) => row.requiredBeforeFiling === true)
  .map((row) => ({
    document: map.formNumber,
    component: map.componentId,
    field: row.field,
    page: row.page,
    disclosureLabel: row.effectiveLabel,
    identity: row.identity,
    why: row.why,
    participantMustSupply: row.participantMustSupply
  })));

/* --------------------------------------------------------- text hygiene */

const REPLACEMENTS = Object.freeze([
  [" ", " "], ["‑", "-"], ["‒", "-"], ["–", "-"], ["—", " - "], ["−", "-"],
  ["‘", "'"], ["’", "'"], ["‚", "'"], ["“", '"'], ["”", '"'], ["„", '"'],
  ["…", "..."], ["§", "Sec. "], ["¶", "para. "], ["•", "- "], ["­", ""],
  ["é", "e"], ["è", "e"], ["ü", "u"], ["ñ", "n"], ["á", "a"], ["í", "i"],
  ["ó", "o"], ["ú", "u"], ["ç", "c"], ["⁄", "/"], ["½", "1/2"], ["″", '"']
]);

/**
 * Every glyph this build draws is a glyph the standard font can encode.
 *
 * The committed records are written with typographic punctuation. A character
 * with no mapping is a stop rather than a silent substitution: dropping a
 * character out of a quoted legal record is exactly the kind of quiet edit this
 * factory refuses, so an unmapped codepoint fails the build and names itself.
 */
function sanitize(text) {
  let out = String(text ?? "");
  for (const [from, to] of REPLACEMENTS) out = out.split(from).join(to);
  const bad = [...out].filter((ch) => ch !== "\n" && (ch.codePointAt(0) < 0x20 || ch.codePointAt(0) > 0x7e));
  assert.equal(bad.length, 0,
    `unmapped characters in composed text: ${[...new Set(bad)].map((c) => `U+${c.codePointAt(0).toString(16).padStart(4, "0")}`).join(", ")}`);
  return out;
}

/* ---------------------------------------------------------- the bodies */

/** A block is drawn whole or moved whole. A contact block never straddles a page break. */
const block = (...lines) => ({ lines: lines.flat().filter((line) => line !== undefined) });

function captionBlock(facts, documentTitle, componentId, documentId) {
  return block(
    documentId,
    documentTitle.toUpperCase(),
    `Assigned component identity: ${componentId}`,
    "",
    `${facts["case.court_name"]}, STATE OF LOUISIANA`,
    `PARISH: ${facts["case.parish"]}`,
    `STATE OF LOUISIANA v. ${facts["participant.full_legal_name"]}`,
    `DOCKET OR CASE NUMBER: ${facts["case.docket_number"]}`,
    `DIVISION OF THE COURT: ${facts["case.division"]}`,
    ""
  );
}

function chargeBlock(facts) {
  return block(
    "ARREST AND CONVICTION INFORMATION",
    `Date of arrest: ${facts["case.arrest_date"]}`,
    `Arresting law enforcement agency: ${facts["case.arresting_law_enforcement_agency"]}`,
    `Original arrest charge as it appears on the state rap sheet: ${facts["case.original_arrest_charge"]}`,
    `Felony conviction offense: ${facts["case.conviction_offense"]}`,
    `Statute of conviction: ${facts["case.conviction_statute"]}`,
    `Date of conviction: ${facts["case.conviction_date"]}`,
    ""
  );
}

function motionBody(facts) {
  return [
    captionBlock(facts, TITLES[COMPONENT.motion], COMPONENT.motion, MOTION),
    block(
      "MOTION FOR EXPUNGEMENT OF A RECORD OF ARREST AND CONVICTION OF A FELONY",
      "La. C.Cr.P. art. 978, on the statutory Article 989 form composed from the committed LA-STATUTORY-FORMS authority.",
      ""
    ),
    block(
      "PART I - DEFENDANT INFORMATION",
      `Mover full legal name: ${facts["participant.full_legal_name"]}`,
      `Mover date of birth: ${facts["participant.date_of_birth"]}`,
      `Race: ${DOTS(56)}`,
      `Gender: ${DOTS(54)}`,
      `Last four digits of the Social Security number: ${DOTS(24)}`,
      ""
    ),
    chargeBlock(facts),
    block(
      `Arrest or booking number shown on the state rap sheet: ${DOTS(18)}`,
      `How many charges this arrest carries: ${facts["case.charge_count"]}`,
      `Whether the felony conviction is for operating a vehicle while intoxicated: ${facts["case.conviction_is_for_intoxicated_operation"]}`,
      ""
    ),
    block(
      "PART II - STATUTORY BASIS",
      `Statutory basis relied on under Article 978(A): ${facts["case.eligibility_basis"]}`,
      `Date the Louisiana criminal background check was ordered: ${facts["case.background_check_ordered_on"]}`,
      "",
      "Article 978(A)(1) rests on a conviction set aside and a prosecution dismissed under Article 893(E). Article 978(A)(2) rests on more than ten years having elapsed since completion of sentence, probation, parole or suspension of sentence, with no felony conviction during that ten-year period, no pending felony charge and no misdemeanor conviction in the last five years, and it requires the district attorney's certification to be included with this motion. Article 978(A)(3) rests on a first offender pardon. Article 978(B) excludes named categories of conviction, and Article 978(B)(3) carries five exceptions for controlled dangerous substance offences.",
      ""
    ),
    block(
      `Date the sentence, deferred adjudication, probation or parole was completed: ${facts["case.sentence_completion_date"]}`,
      "",
      "The mover asks the court to expunge the record of the arrest and conviction identified above, and, where an Affidavit of No Opposition executed by each entity named in Article 979 is attached, to grant the motion without a contradictory hearing as the Article 991 Order provides.",
      ""
    ),
    block(
      "SIGNATURE BLOCKS",
      `${MOTION}, assigned component identity ${COMPONENT.motion}`,
      "",
      "IF REPRESENTED BY COUNSEL - ATTORNEY BLOCK",
      `Attorney name in the represented-mover block: ${DOTS(28)}`,
      `Attorney bar number in the represented-mover block: ${DOTS(22)}`,
      `Attorney address in the represented-mover block: ${DOTS(25)}`,
      `Attorney telephone in the represented-mover block: ${DOTS(23)}`,
      `Attorney signature in the represented-mover block: ${DOTS(23)}`,
      "",
      "This block is left entirely blank on this packet. The fixture records no representation, and an attorney block is completed by counsel or not at all.",
      ""
    ),
    block(
      "IF NOT REPRESENTED BY COUNSEL - UNREPRESENTED MOVER BLOCK",
      `Signature of the unrepresented mover: ${DOTS(34)}`,
      `Date of the mover's signature: ${DOTS(41)}`,
      `Printed name: ${facts["participant.full_legal_name"]}`,
      ""
    ),
    block(
      "FOR THE CLERK - LEAVE BLANK",
      `Filed on stamp applied by the clerk: ${DOTS(35)}`,
      `Certificate of service filed by the clerk showing the mailing date: ${DOTS(10)}`,
      "",
      "Under Article 979 the clerk serves the motion and files the certificate of service. The mover serves nobody.",
      ""
    )
  ];
}

function orderBody(facts) {
  return [
    captionBlock(facts, TITLES[COMPONENT.order], COMPONENT.order, ORDER),
    block(
      "ORDER",
      "La. C.Cr.P. art. 991, on the statutory Article 991 form composed from the committed LA-STATUTORY-FORMS authority.",
      "",
      "COURT USE ONLY - UNEXECUTED PROPOSED ORDER. Nothing on this page has been decided, and no relief exists unless and until a judge completes and signs it and the clerk enters it.",
      ""
    ),
    block(
      "Ordering paragraphs on the Article 991 Order:",
      DOTS(74), DOTS(74), DOTS(74), DOTS(74),
      ""
    ),
    block(
      `Finding that no contradictory hearing is required: ${DOTS(22)}`,
      "",
      "Where an Affidavit of No Opposition executed by each entity named in Article 979 is attached to the motion, the Article 991 Order provides that no contradictory hearing is required. That finding is the court's to make.",
      ""
    ),
    block(
      `Return date set for a contradictory hearing: ${DOTS(28)}`,
      `Date of the court order: ${DOTS(48)}`,
      `Place of the court order: ${DOTS(47)}`,
      `Signature of the judge on the Article 991 Order: ${DOTS(24)}`,
      ""
    )
  ];
}

function expungementOrderBody(facts) {
  return [
    captionBlock(facts, TITLES[COMPONENT.expungementOrder], COMPONENT.expungementOrder, EXPUNGEMENT_ORDER),
    block(
      "ORDER OF EXPUNGEMENT",
      "La. C.Cr.P. art. 992, on the statutory Article 992 form composed from the committed LA-STATUTORY-FORMS authority.",
      "",
      "COURT USE ONLY - UNEXECUTED PROPOSED ORDER. The mover supplies the caption and the identifiers of the record to be expunged, and nothing else on this page.",
      ""
    ),
    chargeBlock(facts),
    block(
      `Whether the motion is granted or denied: ${DOTS(31)}`,
      "",
      "Findings on the Article 992 Order of Expungement:",
      DOTS(74), DOTS(74),
      ""
    ),
    block(
      "Decretal paragraphs on the Article 992 Order of Expungement:",
      DOTS(74), DOTS(74), DOTS(74), DOTS(74),
      ""
    ),
    block(
      `Date of the court order: ${DOTS(48)}`,
      `Place of the court order: ${DOTS(47)}`,
      `Signature of the judge on the Article 992 Order of Expungement: ${DOTS(11)}`,
      ""
    )
  ];
}

/* ------------------------------------------------ participant guidance */

const bullet = (text) => `- ${text}`;

/**
 * The guidance is generated FROM the committed records, not written beside them.
 *
 * Every fee, waiver, service rule, filing destination, deadline and self-help
 * stop below is quoted from the record that holds it. Nothing is summarised into
 * a shorter list: a registry that lists eight stop conditions and a packet that
 * paraphrases three is a defect, so the loop below carries all of them and the
 * count is printed beside them so a reader can check the carriage was complete.
 */
function participantInstructions(binding, rbf, name) {
  const { registryTrack, memoTrack, packetSet, components, queueFamily } = binding;
  const rules = registryTrack.rules ?? {};
  const actions = registryTrack.packetSet?.participantActionRequired ?? [];
  const stops = memoTrack.selfHelpStopConditions ?? [];
  const conditional = components.filter((c) => c.requirement === "conditional");
  const requiredGuidance = memoTrack.components.find((c) => c.role === "instructions" && c.requirement === "required");
  const owiGuidance = memoTrack.components.find((c) => c.role === "instructions" && c.requirement === "conditional");
  const continuation = memoTrack.components.find((c) => c.role === "continuation");

  /*
   * The first stop condition on this track is not one stop among nine. The
   * record says counsel review is required before filing on this track WITHOUT
   * EXCEPTION and that the packet must carry that instruction prominently, so it
   * is printed under the title as well as in its place in the numbered list, and
   * asserted against the record so the two can never drift apart.
   */
  const counselStop = stops[0];
  assert.ok(/Counsel requires attorney review before filing on this track without exception/i.test(String(counselStop)),
    "the committed record no longer opens this track's stop conditions with the without-exception counsel-review instruction; the prominent notice must be re-read rather than kept from memory");

  const lines = [
    `# ${registryTrack.legalName}`,
    "",
    "## READ THIS FIRST",
    "",
    counselStop,
    "",
    `Prepared for **${name}**. Packet set \`${FAMILY_ID}\`, version ${packetSet.version}.`,
    "",
    `This packet set serves ${queueFamily.routeKeys.length} route(s):`,
    "",
    ...queueFamily.routeKeys.map((key) => bullet(`\`${key}\``)),
    "",
    "## What is in this packet",
    ""
  ];
  for (const componentId of RENDERED_COMPONENTS) {
    const row = components.find((c) => c.componentId === componentId);
    lines.push(bullet(`\`${componentId}\` - ${TITLES[componentId]} (${row.role}, ${row.requirement}).`));
  }
  lines.push("", "## What is not generated, and the condition the record states", "");
  for (const row of conditional) {
    lines.push(bullet(`\`${row.componentId}\` (${row.role}${row.officialFormId ? `, ${row.officialFormId}` : ""}): ${row.conditionDescription} This packet does not meet that condition, so the component is not generated.`));
  }
  lines.push(
    "",
    "The Article 993 supplemental sheet and the Article 998 marijuana motion are statutory forms for which the committed legal-design record states that no template exists, none is counsel-approved and no implementation is authorized. Where your arrest carries more charges or counts than the Article 989 motion holds, ask the clerk of court for the Article 993 supplemental sheet rather than adding pages of your own; Article 986(B) permits a supplemental form only so far as it adheres to the statutory form.",
    "",
    "## What you must supply before filing",
    "",
    "Check every prefilled fact against your own court record and your background check, and correct the packet where they disagree. The blanks below are deliberately empty and are yours to complete.",
    "",
    "| Document | Blank on the document | What you must supply |",
    "| --- | --- | --- |"
  );
  for (const item of rbf) lines.push(`| ${item.document} | ${item.disclosureLabel} | ${item.participantMustSupply} |`);

  lines.push("", `## What you must obtain or confirm before filing (${actions.length} item(s) held by the committed track registry)`, "");
  for (const action of actions) {
    const qualifier = action.requirement === "conditional" && action.conditionDescription ? ` Condition: ${action.conditionDescription}` : "";
    const from = action.obtainedFrom ? ` Obtained from: ${action.obtainedFrom}.` : "";
    lines.push(bullet(`**${action.kind}** (${action.requirement}${action.requiredBeforeFiling ? ", required before filing" : ""}): ${action.description}${from}${qualifier}`));
  }

  lines.push(
    "", "## Where this is filed", "",
    bullet(`Venue: ${registryTrack.venue}`),
    bullet(`Destination (${registryTrack.destination.kind}): ${registryTrack.destination.name}`),
    bullet(registryTrack.destination.detail),
    "", "## What it costs, and the fee exemption", "",
    bullet(`Fees: ${rules.fees ?? "the committed record states no fee for this track."}`),
    bullet(`Fee waiver: ${rules.feeWaiver ?? "the committed record states no fee waiver for this track."}`),
    "", "## Notice, objection and service", "",
    bullet(`Notice and objection: ${rules.notice ?? "the committed record states no notice rule for this track."}`),
    bullet(`Service: ${rules.service ?? "the committed record states no service rule for this track."}`),
    "", "## Signing", "",
    bullet(`Signature: ${rules.participantSignature ?? "the committed record states no signature rule for this track."}`),
    bullet(`Notarization: ${rules.notarization ?? "the committed record states no notarization rule for this track."}`),
    "", "## Fields deliberately left blank", "",
    bullet("Sign and date the unrepresented-mover block yourself, after reading the completed motion. If you are represented, give the packet to your attorney; the attorney block belongs to counsel and is left blank here."),
    bullet("Leave every ordering paragraph, finding, granted-or-denied election, return date, date, place and judge's signature on the Article 991 Order and the Article 992 Order of Expungement blank. Those are the court's."),
    bullet("Leave the clerk's filed-on stamp and the clerk's certificate of service blank. Article 979 makes service the clerk's act."),
    bullet("The Article 990 Affidavit of Response is the responding entity's own instrument. It is not printed in this packet and you never complete it."),
    "", `## Stop self-help and get legal help (all ${stops.length} stop conditions the record holds)`, ""
  );
  stops.forEach((stop, index) => lines.push(bullet(`Stop ${index + 1} of ${stops.length}: ${stop}`)));

  lines.push("", `## Hard eligibility boundaries the record states (${(memoTrack.exclusions ?? []).length} exclusion(s))`, "");
  for (const exclusion of memoTrack.exclusions ?? []) lines.push(bullet(exclusion));
  lines.push("", "Waiting periods:", "");
  for (const period of memoTrack.waitingPeriods ?? []) lines.push(bullet(`${period.condition}: ${period.duration}`));

  lines.push("", "## What the committed record requires these instructions to carry", "", requiredGuidance.notes, "");
  if (owiGuidance) {
    lines.push(
      `## Additional requirements where the conviction is for operating a vehicle while intoxicated (${owiGuidance.officialFormId})`,
      "",
      owiGuidance.notes,
      ""
    );
  }
  if (continuation) lines.push(`## The Article 993 supplemental sheet (${continuation.officialFormId})`, "", continuation.notes, "");

  const unresolved = memoTrack.unresolvedQuestions ?? [];
  lines.push(`## What the record does not settle (${unresolved.length} open question(s))`, "");
  for (const row of unresolved) lines.push(bullet(`${row.question} (impact: ${row.impact}; affects: ${row.affectedElement})`));

  lines.push(
    "",
    "## What this packet is not",
    "",
    "This built packet is review evidence. It is pending independent completeness verification, raster acceptance, visual review and counsel review. It is not approved for live use, it opens no route, and it is not legal advice.",
    ""
  );
  return lines.join("\n");
}

function filingInstructions(binding, name) {
  const { registryTrack } = binding;
  const rules = registryTrack.rules ?? {};
  const actions = registryTrack.packetSet?.participantActionRequired ?? [];
  const fileAction = actions.find((a) => a.kind === "file");
  const serveAction = actions.find((a) => a.kind === "serve_party");
  const feeAction = actions.find((a) => a.kind === "pay_fee");
  const waiverAction = actions.find((a) => a.kind === "apply_fee_waiver");
  return [
    `# Filing instructions - ${registryTrack.legalName}`,
    "",
    `Prepared for **${name}**.`,
    "",
    bullet(`Filing: ${rules.filing ?? "the committed record states no filing rule."}`),
    bullet(`Where: ${registryTrack.destination.name}. ${registryTrack.destination.detail}`),
    bullet(`Venue: ${registryTrack.venue}`),
    bullet(`What the registry says about filing: ${fileAction ? fileAction.description : "the committed record holds no filing action for this track."}`),
    bullet(`What it costs: ${feeAction ? feeAction.description : "the committed record holds no fee action for this track."}`),
    bullet(`Fee exemption: ${waiverAction ? waiverAction.description : "the committed record holds no fee-exemption action for this track."}`),
    bullet(`Service: ${serveAction ? serveAction.description : "the committed record holds no service action for this track."}`),
    "",
    "The order of operations the record fixes: order the background check and watch its sixty-day life; deliver any Article 988 fee exemption to the district attorney before filing and expect it back within fifteen days; request whichever certification letters the chosen basis needs; file with the clerk with the fee or the returned exemption; the clerk serves under Article 979; entities have sixty days from service to object under Article 980, extendable once by not more than thirty days; an Affidavit of No Opposition from each named entity supports an ex parte grant; if expungement is granted the clerk serves the order and judgment under Article 982.",
    "",
    `Packet set: ${FAMILY_ID}`,
    ""
  ].join("\n");
}

function markdownToPlain(markdown) {
  return String(markdown).split("\n")
    .filter((line) => !/^\|(?:\s*:?-+:?\s*\|)+$/.test(line.trim()))
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        return trimmed.slice(1, -1).split("|").map((cell) => cell.trim().replaceAll("**", "").replaceAll("`", "")).join("  |  ");
      }
      return line.replace(/^#{1,6}\s+/, "").replaceAll("**", "").replaceAll("`", "");
    })
    .join("\n");
}

/**
 * Guidance becomes one atomic block per item, and a heading rides with the item
 * beneath it.
 *
 * The first version of this split on blank lines, which made the registry's
 * twenty-one participant actions a single eighty-seven-line block that could not
 * fit on any page. A bullet, a table row and a paragraph are each one block; a
 * heading is never a block of its own, so it can never be left alone at the foot
 * of a page with its content on the next one.
 */
function guideBody(facts, participantText, filingText) {
  const blocks = [block(
    GUIDE,
    TITLES[COMPONENT.guide].toUpperCase(),
    `Assigned component identity: ${COMPONENT.guide}`,
    `Participant full legal name on the instructions: ${facts["participant.full_legal_name"]}`,
    ""
  )];
  const plainLine = (line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      return trimmed.slice(1, -1).split("|").map((cell) => cell.trim().replaceAll("**", "").replaceAll("`", "")).join("  |  ");
    }
    return line.replace(/^#{1,6}\s+/, "").replaceAll("**", "").replaceAll("`", "");
  };
  let heading = null;
  let paragraph = [];
  const emit = (lines) => {
    const carried = heading ? [heading, ""] : [];
    heading = null;
    blocks.push(block(...carried, ...lines, ""));
  };
  const flush = () => { if (paragraph.length) { const lines = paragraph; paragraph = []; emit(lines); } };
  for (const raw of `${participantText}\n\n${filingText}`.split("\n")) {
    const trimmed = raw.trim();
    if (trimmed === "") { flush(); continue; }
    if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(trimmed)) continue;
    if (/^#{1,6}\s+/.test(trimmed)) { flush(); heading = plainLine(raw); continue; }
    if (trimmed.startsWith("- ") || trimmed.startsWith("|")) { flush(); emit([plainLine(raw)]); continue; }
    paragraph.push(plainLine(raw));
  }
  flush();
  if (heading) emit([]);
  return blocks;
}

/* ------------------------------------------------------------ rendering */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 60;
const FONT_SIZE = 10.25;
const LINE_HEIGHT = 13.25;
const MAX_WIDTH = PAGE_WIDTH - (2 * MARGIN);

/**
 * Blocks are atomic.
 *
 * Twelve PDFs of one family shipped with orphan pages last cohort because a
 * contact block was allowed to straddle a page break. A block here is measured
 * before anything is drawn and moved whole when it will not fit, and a block
 * that cannot fit on an empty page stops the build rather than being split
 * quietly.
 */
async function renderComposedDocument(blocks, title, componentId) {
  const pdf = await PDFDocument.create();
  stampDeterministic(pdf);
  pdf.setTitle(title);
  pdf.setAuthor("RCAP packet factory, packet-build lane");
  pdf.setCreator("RCAP deterministic Louisiana statutory-form composer");
  pdf.setProducer("RCAP census-v1 artifact renderer");
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const top = PAGE_HEIGHT - MARGIN;
  const capacity = Math.floor((top - MARGIN) / LINE_HEIGHT) + 1;

  let hardSplits = 0;
  /*
   * A token wider than the text box is broken at a separator it already
   * contains -- a route key breaks after a colon, a path after a slash -- and a
   * mid-word break is the last resort, counted, and reported.
   */
  const splitToken = (token) => {
    const pieces = String(token).split(/(?<=[:/.\-_])/);
    const chunks = [];
    let current = "";
    for (const piece of pieces) {
      const candidate = `${current}${piece}`;
      if (current && font.widthOfTextAtSize(candidate, FONT_SIZE) > MAX_WIDTH) { chunks.push(current); current = piece; }
      else current = candidate;
    }
    if (current) chunks.push(current);
    const out = [];
    for (const chunk of chunks) {
      if (font.widthOfTextAtSize(chunk, FONT_SIZE) <= MAX_WIDTH) { out.push(chunk); continue; }
      hardSplits += 1;
      let acc = "";
      for (const char of chunk) {
        const candidate = `${acc}${char}`;
        if (acc && font.widthOfTextAtSize(candidate, FONT_SIZE) > MAX_WIDTH) { out.push(acc); acc = char; }
        else acc = candidate;
      }
      if (acc) out.push(acc);
    }
    return out;
  };
  const wrap = (raw) => {
    if (!raw) return [""];
    const words = String(raw).split(/\s+/)
      .flatMap((word) => font.widthOfTextAtSize(word, FONT_SIZE) > MAX_WIDTH ? splitToken(word) : [word]);
    const rows = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, FONT_SIZE) <= MAX_WIDTH) current = candidate;
      else { if (current) rows.push(current); current = word; }
    }
    if (current) rows.push(current);
    return rows.length ? rows : [""];
  };

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = top;
  const drawn = [];
  const newPage = () => { page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]); y = top; };

  for (const item of blocks) {
    const rows = item.lines.flatMap((line) => wrap(sanitize(line)));
    assert.ok(rows.length <= capacity,
      `${componentId}: a block of ${rows.length} lines cannot fit on one page (capacity ${capacity}); first line "${String(item.lines[0]).slice(0, 70)}"`);
    const used = Math.round((top - y) / LINE_HEIGHT);
    if (used + rows.length > capacity) newPage();
    for (const row of rows) {
      assert.ok(y >= MARGIN, `${componentId}: a line would be drawn at y=${y}, below the ${MARGIN}pt bottom margin`);
      if (row) {
        const width = font.widthOfTextAtSize(row, FONT_SIZE);
        assert.ok(width <= MAX_WIDTH + 0.01, `${componentId}: a line is ${width.toFixed(1)}pt wide, past the ${MAX_WIDTH}pt text box`);
        page.drawText(row, { x: MARGIN, y, size: FONT_SIZE, font, color: rgb(0, 0, 0) });
        drawn.push({ page: pdf.getPageCount(), x: MARGIN, baseline: y, width, text: row });
      }
      y -= LINE_HEIGHT;
    }
  }
  assert.equal(hardSplits, 0, `${componentId}: ${hardSplits} token(s) had to be broken mid-word to fit the text box`);
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
  return { bytes, pageCount: pdf.getPageCount(), drawn };
}

/** Every glyph this build drew, measured against the printable box of its page. */
function measureInk(drawn) {
  const descent = FONT_SIZE * 0.25;
  const ascent = FONT_SIZE * 0.9;
  let outside = 0;
  for (const row of drawn) {
    const insideX = row.x >= MARGIN - 0.01 && row.x + row.width <= PAGE_WIDTH - MARGIN + 0.01;
    const insideY = row.baseline - descent >= 0 && row.baseline + ascent <= PAGE_HEIGHT;
    if (!insideX || !insideY) outside += row.text.replace(/\s+/g, "").length;
  }
  return outside;
}

/* --------------------------------------------------------- byte proof */

async function proveWritesFromBytes(packetBytes, pageManifest, maps, facts, fixture) {
  const pdf = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  assert.equal(pdf.getPageCount(), pageManifest.length, "the page manifest must describe every packet page");
  const pageText = pdf.getPages().map((page) => groupIntoLines(extractTextItems(page)).map((l) => l.text).join(" ").replace(/\s+/g, " "));
  const byDocument = new Map();
  for (const [index, row] of pageManifest.entries()) {
    byDocument.set(row.documentId, `${byDocument.get(row.documentId) ?? ""} ${pageText[index]}`.replace(/\s+/g, " "));
  }
  const actualWrites = [];
  let glyphs = 0;
  for (const map of maps) {
    const haystack = byDocument.get(map.documentId) ?? "";
    for (const row of map.canonicalWrites) {
      const expected = sanitize(facts[row.factId]).replace(/\s+/g, " ").trim();
      assert.ok(expected, `${fixture}/${row.field}: the fixture holds no value for ${row.factId}`);
      assert.ok(haystack.includes(expected), `${fixture}/${row.field}: "${expected.slice(0, 60)}" is not readable from the finalized packet bytes`);
      glyphs += expected.replace(/\s+/g, "").length;
      actualWrites.push({
        field: row.field, document: map.documentId, factId: row.factId, expected,
        foundInOutputBytes: true,
        proof: "read back from the finalized packet bytes on the pages this document occupies"
      });
    }
  }
  return { actualWrites, glyphs };
}

/* ------------------------------------------------------------ counters */

function normalizedRow(row) {
  return {
    id: row.field,
    name: row.fieldName ?? row.field,
    label: row.effectiveLabel ?? "",
    reason: row.reason ?? "",
    refusalClass: row.category ?? null,
    page: row.page ?? null,
    document: row.document ?? null,
    factId: row.factId ?? null,
    isSelectionControl: row.isSelectionControl === true || row.kind === "selection_control"
      || /\[\s*\]/.test(String(row.effectiveLabel ?? "")),
    declared: {
      disposition: row.completenessDisposition ?? null,
      ...(Object.hasOwn(row, "requiredBeforeFiling") ? { requiredBeforeFiling: row.requiredBeforeFiling === true } : {}),
      routeDetermined: row.routeDetermined === true,
      determinedByTheCaseNotTheRoute: row.determinedByTheCaseNotTheRoute === true,
      whyTheRouteCannotDetermineIt: row.whyTheRouteCannotDetermineIt ?? null,
      identity: row.identity ?? row.field ?? null,
      factId: row.factId ?? null
    }
  };
}

function countCompleteness(maps, proofs, instructionsText) {
  const counters = Object.fromEntries(PASS_COUNTERS.map((key) => [key, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };
  const writes = maps.flatMap((map) => map.canonicalWrites.map(normalizedRow));
  const blanks = maps.flatMap((map) => map.canonicalRefusals.map(normalizedRow));
  const availableFacts = new Set(writes.map((row) => row.factId).filter(Boolean));
  const normalize = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const writtenInDocument = new Map();
  for (const row of writes) {
    if (!writtenInDocument.has(row.document)) writtenInDocument.set(row.document, new Set());
    for (const key of [normalize(row.label), normalize(row.name)]) if (key.length >= 4) writtenInDocument.get(row.document).add(key);
  }
  const ledger = [];
  for (const blank of blanks) {
    const beside = writtenInDocument.get(blank.document) ?? new Set();
    const declared = {
      ...blank.declared,
      factAvailable: (blank.declared.factId ? availableFacts.has(blank.declared.factId) : false)
        || beside.has(normalize(blank.label)) || beside.has(normalize(blank.name))
    };
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass, declared);
    ledger.push({ ...blank, ...verdict });
    if (BLANK_DISPOSITIONS[verdict.disposition]?.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") note("knownRequiredFieldsMissing", { field: blank.id, basis: verdict.basis });
    else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") note("requiredOptionsMissing", { field: blank.id, basis: verdict.basis });
    else note("unclassifiedBlanks", { field: blank.id, basis: verdict.basis });
  }
  const haystack = instructionsText.toLowerCase();
  for (const blank of ledger.filter((row) => row.disposition === "REQUIRED_BEFORE_FILING")) {
    const needles = [blank.label, blank.id, blank.declared?.identity].map((v) => String(v ?? "").trim()).filter((v) => v.length >= 3);
    if (!needles.some((needle) => haystack.includes(needle.toLowerCase().slice(0, 60)))) {
      note("requiredFactsNotCollected", { field: blank.id, why: "declared required before filing and not named in participant-instructions.md" });
    }
  }
  const rows = new Map();
  for (const row of [...writes.map((v) => ({ ...v, written: true })), ...blanks.map((v) => ({ ...v, written: false }))]) {
    const key = rowKeyOf(row);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(row);
  }
  for (const [key, cells] of rows) {
    if (!cells.some((cell) => cell.written)) continue;
    const missing = cells.filter((cell) => !cell.written && classifyField(cell.label, cell.isSelectionControl).requirement === "REQUIRED_KNOWN");
    if (missing.length) note("incompleteRows", { row: key, missing: missing.map((cell) => cell.label) });
  }
  for (const row of writes) {
    if (classifyField(row.label, false).requirement === "PROTECTED") note("protectedWrites", { field: row.id, label: row.label });
  }
  for (const proof of proofs) {
    const visible = (proof.addedGlyphsReadFromOutputBytes ?? 0) + (proof.flattenedWidgetAppearancesReadFromOutputBytes ?? 0);
    if (proof.valuesReportedByFinalizer > 0 && visible === 0) note("invisibleWrites", { fixture: proof.fixture });
    if ((proof.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? 0) > 0) note("visualDefects", { fixture: proof.fixture });
    if ((proof.refusedFieldsWithInk ?? []).length > 0) note("protectedWrites", { fixture: proof.fixture });
  }
  return {
    counters, findings, ledger,
    totals: { terminalFields: writes.length + blanks.length, written: writes.length, blank: blanks.length, rowsInspected: rows.size }
  };
}

function writeJson(relative, value) {
  const target = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

/* ------------------------------------------------------------- the run */

export async function runFamily(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  const noRaster = argv.includes("--no-raster");
  if (!checkOnly) {
    assert.equal(noRaster, true, "no browser resolves in this container; invoke with --no-raster and let the raster gate run centrally");
  }

  const binding = loadAuthorityBinding();
  const sources = resolveHeldSources(binding.queueFamily);
  assert.equal(sources.absent.length, 0,
    `held source bytes are absent by content hash across the mounted corpus: ${sources.absent.map((s) => `${s.sourceId} sha256=${s.sha256}`).join("; ")}`);

  const maps = [motionMap(), orderMap(), expungementOrderMap(), guideMap()];
  const rbf = requiredBeforeFilingFields(maps);

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      implementationStrategy: STRATEGY, custodyClass: CUSTODY_CLASS,
      authorityGrant: binding.ownerFamily.composedFromAuthority,
      componentsAuthoritative: binding.components.length,
      componentsRendered: RENDERED_COMPONENTS.length,
      heldSourcesResolvedByContentHash: sources.resolved.length,
      mountedCustodies: sources.mounted,
      recordsPinned: binding.pins.length,
      writes: maps.reduce((sum, m) => sum + m.canonicalWrites.length, 0),
      blanks: maps.reduce((sum, m) => sum + m.canonicalRefusals.length, 0),
      requiredBeforeFiling: rbf.length
    };
  }

  fs.mkdirSync(path.join(ROOT, OUT, "fixtures"), { recursive: true });
  fs.mkdirSync(path.join(ROOT, OUT, "reports"), { recursive: true });

  const artifacts = [];
  const proofs = [];
  for (const fixture of ["canonical", "boundary"]) {
    const facts = FIXTURES[fixture];
    const participantText = participantInstructions(binding, rbf, facts["participant.full_legal_name"]);
    const filingText = filingInstructions(binding, facts["participant.full_legal_name"]);
    const bodies = [
      { componentId: COMPONENT.motion, documentId: MOTION, blocks: motionBody(facts) },
      { componentId: COMPONENT.order, documentId: ORDER, blocks: orderBody(facts) },
      { componentId: COMPONENT.expungementOrder, documentId: EXPUNGEMENT_ORDER, blocks: expungementOrderBody(facts) },
      { componentId: COMPONENT.guide, documentId: GUIDE, blocks: guideBody(facts, participantText, filingText) }
    ];

    const packet = await PDFDocument.create();
    stampDeterministic(packet);
    packet.setTitle(`${binding.registryTrack.legalName} - ${fixture}`);
    packet.setAuthor("RCAP packet factory, packet-build lane");
    packet.setCreator("RCAP deterministic Louisiana statutory-form composer");
    packet.setProducer("RCAP census-v1 artifact renderer");

    const pageManifest = [];
    let drawnRows = [];
    for (const body of bodies) {
      const rendered = await renderComposedDocument(body.blocks, TITLES[body.componentId], body.componentId);
      drawnRows = drawnRows.concat(rendered.drawn);
      const componentPdf = await PDFDocument.load(rendered.bytes, { ignoreEncryption: true, updateMetadata: false });
      const pages = await packet.copyPages(componentPdf, componentPdf.getPageIndices());
      pages.forEach((page, index) => {
        packet.addPage(page);
        pageManifest.push({
          packetPage: packet.getPageCount(),
          component: body.componentId,
          documentId: body.documentId,
          sourcePage: index + 1,
          sourceSha256: null,
          sourceClass: "composed_from_the_committed_statutory_authority"
        });
      });
    }
    assert.deepEqual([...new Set(pageManifest.map((r) => r.component))], RENDERED_COMPONENTS);

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixture}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    const proof = await proveWritesFromBytes(packetBytes, pageManifest, maps, facts, fixture);
    const outsideBoxes = measureInk(drawnRows);
    proofs.push({
      fixture,
      proofMethod: "every declared write read back from the finalized packet bytes on the pages its document occupies",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outsideBoxes,
      linesDrawn: drawnRows.length,
      refusedFieldsWithInk: [],
      actualWrites: proof.actualWrites
    });
    artifacts.push({
      fixture, file,
      sha256: sha256(packetBytes),
      byteLength: packetBytes.length,
      pageCount: packet.getPageCount(),
      pageManifest,
      components: RENDERED_COMPONENTS,
      documents: [MOTION, ORDER, EXPUNGEMENT_ORDER, GUIDE]
    });
  }

  const canonicalFacts = FIXTURES.canonical;
  const participantText = participantInstructions(binding, rbf, canonicalFacts["participant.full_legal_name"]);
  const filingText = filingInstructions(binding, canonicalFacts["participant.full_legal_name"]);
  fs.writeFileSync(path.join(ROOT, OUT, "participant-instructions.md"), participantText);
  fs.writeFileSync(path.join(ROOT, OUT, "filing-instructions.md"), filingText);

  const counted = countCompleteness(maps, proofs, participantText);
  const allNineZero = PASS_COUNTERS.every((counter) => counted.counters[counter] === 0);
  assert.equal(allNineZero, true,
    `the builder's own completeness count is not zero: ${JSON.stringify({ counters: counted.counters, findings: counted.findings }, null, 2)}`);

  const notGenerated = binding.components
    .filter((row) => !RENDERED_COMPONENTS.includes(row.componentId))
    .map((row) => ({
      componentId: row.componentId,
      role: row.role,
      requirement: row.requirement,
      officialFormId: row.officialFormId ?? null,
      conditionTheRecordStates: row.conditionDescription,
      generated: false,
      whyNotGenerated: row.componentId === COMPONENT.feeWaiver
        ? `the committed rule for this track states: ${binding.registryTrack.rules?.feeWaiver}`
        : row.componentId === COMPONENT.continuation
          ? "both fixtures are single-arrest and single-count, so the stated condition is not met; independently, Article 993 is not in this family's composedFromAuthority grant and the committed legal-design note states that no template exists, none is counsel-approved and no implementation is authorized"
          : "neither fixture is a conviction for operating a vehicle while intoxicated, so the stated condition is not met; Article 984's controlling requirements are quoted in the participant instructions for a participant on that branch"
    }));

  writeJson(`${OUT}/packet-set-manifest.json`, {
    schemaVersion: "rcap-composed-packet-set/v1",
    familyId: FAMILY_ID,
    jurisdiction: JURISDICTION,
    trackId: TRACK_ID,
    packetSetVersion: binding.packetSet.version,
    routeKeys: binding.queueFamily.routeKeys,
    implementationStrategy: STRATEGY,
    custodyClass: CUSTODY_CLASS,
    authorityDecision: OWNER_DECISION,
    composedFromAuthority: binding.ownerFamily.composedFromAuthority,
    components: binding.components.map((row) => ({
      componentId: row.componentId,
      documentId: DOCUMENT_OF[row.componentId] ?? row.officialFormId ?? row.componentId,
      title: TITLES[row.componentId] ?? null,
      role: row.role,
      requirement: row.requirement,
      outputStrategy: row.outputStrategy,
      officialFormId: row.officialFormId ?? null,
      order: row.order,
      generated: RENDERED_COMPONENTS.includes(row.componentId)
    })),
    componentsNotGenerated: notGenerated,
    participantInstructions: `${OUT}/participant-instructions.md`,
    filingInstructions: `${OUT}/filing-instructions.md`
  });

  writeJson(`${OUT}/component-page-manifest.json`, {
    schemaVersion: "rcap-component-page-manifest/v1",
    familyId: FAMILY_ID,
    componentOrder: RENDERED_COMPONENTS,
    artifacts: artifacts.map((a) => ({
      fixture: a.fixture, file: a.file, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount, pages: a.pageManifest
    }))
  });

  writeJson(`${OUT}/reports/record-bindings.json`, {
    schemaVersion: "rcap-family-record-bindings/v1",
    familyId: FAMILY_ID,
    question: "Which committed records does this packet rest on, and did any of them move?",
    everyRecordPinnedTwice: true,
    whyTwice: "a whole-file pin on a shared national record goes stale whenever an unrelated jurisdiction is productised; the entry pin says whether the change touched this family",
    bindings: binding.pins
  });

  writeJson(`${OUT}/source-receipt.json`, {
    schemaVersion: "rcap-family-source-receipt/v1",
    familyId: FAMILY_ID,
    worklistGroupId: FAMILY_ID,
    jurisdiction: JURISDICTION,
    trackId: TRACK_ID,
    routeKeys: binding.queueFamily.routeKeys,
    implementationStrategy: STRATEGY,
    custodyClass: CUSTODY_CLASS,
    sourceStatus: CUSTODY_CLASS,
    officialFormFamily: binding.queueFamily.officialFormFamily,
    acquisitionCommissioned: false,
    sourceAcquisitionAuthorized: false,
    sourceBinariesRequired: (binding.queueFamily.sourceHashes ?? []).length,
    sourceBinariesResolved: sources.resolved.length,
    allSourcesExact: sources.absent.length === 0,
    allSourcesExactNote: "every declared digest was resolved by content hash across the mounted corpus and re-hashed from the resolved bytes",
    resolutionRule: "sources are resolved by SHA-256 across the mounted corpus and never by declared path; the declared path is recorded as the thing that was declared",
    mountedCustodies: sources.mounted,
    sources: sources.resolved.map((row) => ({
      sourceId: row.sourceId,
      officialFormId: row.sourceId.replace(/^source-sha256:/, "").replace(/^official-form:/, ""),
      declaredPath: row.declaredPath,
      declaredCustodyMounted: row.declaredCustodyMounted,
      resolvedPath: row.resolvedPath,
      resolvedCustody: row.resolvedCustody,
      resolvedBy: row.resolvedBy,
      sha256: row.sha256,
      sha256Exact: true,
      byteLength: row.byteLength,
      tier: row.tier,
      roleInThisPacket: "authority reference bound by digest; not a rendered component of this packet"
    })),
    documents: RENDERED_COMPONENTS.map((componentId) => ({
      documentId: DOCUMENT_OF[componentId],
      componentId,
      composed: true,
      sha256: null,
      compositionTreatment: "COMPOSE_FROM_AUTHORITY"
    })),
    authorityDecision: {
      id: binding.owner.id,
      decision: binding.owner.decision,
      authorityHeld: binding.owner.authorityHeld,
      text: binding.owner.text,
      scopeNote: binding.owner.scopeNote ?? null,
      composedFromAuthority: binding.ownerFamily.composedFromAuthority,
      remainOfficialAndMustBeHeld: binding.ownerFamily.remainOfficialAndMustBeHeld
    },
    authorityCurrentness: {
      reviewedAsOf: binding.registryTrack.reviewedAsOf,
      effectiveFrom: binding.registryTrack.effectiveFrom,
      effectiveTo: binding.registryTrack.effectiveTo,
      legalInputStatus: binding.queueFamily.legalInputStatus,
      legalStatus: binding.registryTrack.legalStatus
    },
    groundingRecords: binding.pins,
    composedComponentsAuthoredByThisBuild: RENDERED_COMPONENTS,
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "independent verification, raster acceptance, visual acceptance, counsel approval, or approval for participant delivery",
      "that this participant is eligible under any Article 978(A) ground, or that Article 978(B) does not exclude the conviction",
      "that the district attorney will give the Article 978(A)(2) certification, or that a first offender pardon is held",
      "that any commercial route is open"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    trackId: TRACK_ID,
    jurisdiction: JURISDICTION,
    routeKeys: binding.queueFamily.routeKeys,
    statute: "La. C.Cr.P. art. 978",
    legalName: binding.registryTrack.legalName,
    implementationStrategy: STRATEGY,
    renderStrategy: "codified_statutory_forms_composed_from_the_committed_authority",
    sourceAuthority: OWNER_DECISION,
    componentSet: RENDERED_COMPONENTS,
    pageOrder: RENDERED_COMPONENTS,
    componentsNotGenerated: notGenerated,
    routeSelectionNote: "This packet set serves every Article 978 felony-conviction route in the census, including the first offender pardon route and the human-trafficking survivor route. The statutory basis is a case fact the platform collects and writes, not an election left blank on the filing; the packet also tells the participant to check it against the order of dismissal, the pardon or the district attorney's certification.",
    routeSelectionsMade: [{
      option: "ARTICLE_978_FELONY_CONVICTION_EXPUNGEMENT",
      authority: "La. C.Cr.P. art. 978 on the Article 989 statutory form",
      routeDetermined: true
    }],
    dispositionVocabulary: [SIGNATURE, COURT_OWNED, "REQUIRED_BEFORE_FILING", "NOT_APPLICABLE_ON_THIS_ROUTE"],
    requiredBeforeFilingCount: rbf.length,
    requiredBeforeFiling: rbf,
    maps,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0
  });

  writeJson(`${OUT}/reports/rendered-artifacts.json`, {
    schemaVersion: "rcap-rendered-artifacts/v1",
    familyId: FAMILY_ID,
    renderedFresh: true,
    derivedFromBytes: true,
    componentSet: RENDERED_COMPONENTS,
    documentSet: [MOTION, ORDER, EXPUNGEMENT_ORDER, GUIDE],
    boundAuthorityReferences: sources.resolved.map((row) => ({
      sourceId: row.sourceId, resolvedPath: row.resolvedPath, sha256: row.sha256, renderedIntoThePacket: false
    })),
    pdfs: artifacts.map((a) => ({
      file: a.file, documentId: "assembled_packet", role: "assembled_packet_of_composed_statutory_forms_and_instructions",
      fixture: a.fixture, sha256: a.sha256, byteLength: a.byteLength, pageCount: a.pageCount
    })),
    artifacts,
    packets: artifacts.map((a) => ({ fixture: a.fixture, documents: a.documents, components: a.components })),
    everyPageRastered: false,
    byteDerivedHashes: true,
    rasterEngine: null,
    rasterSkipped: true,
    rasterSkippedBecause: "no browser resolves in this container; the raster gate runs centrally against the exact bytes these hashes pin",
    rasterPages: [],
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationPending: true
  });

  writeJson(`${OUT}/reports/actual-writes.json`, {
    schemaVersion: "rcap-actual-writes-byte-proof/v1",
    familyId: FAMILY_ID,
    derivedFromArtifactBytes: true,
    note: "Each declared fixture value was read back from the finalized packet bytes on the pages its document occupies.",
    documents: proofs,
    artifacts: proofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      linesDrawn: p.linesDrawn,
      refusedFieldsWithInk: p.refusedFieldsWithInk
    })),
    blockingFindings: []
  });

  writeJson(`${OUT}/reports/blanks-left-for-the-participant.json`, {
    schemaVersion: "rcap-blanks-left-for-the-participant/v1",
    familyId: FAMILY_ID,
    requiredBeforeFiling: rbf,
    protectedBlanks: maps.flatMap((map) => map.canonicalRefusals
      .filter((row) => row.requiredBeforeFiling !== true)
      .map((row) => ({
        document: map.documentId, field: row.field, page: row.page, label: row.effectiveLabel,
        disposition: row.completenessDisposition, refusalClass: row.category, why: row.why
      }))),
    everyIntentionalBlankClassified: true,
    everyRequiredBeforeFilingItemIsDisclosed: true,
    disclosedIn: `${OUT}/participant-instructions.md`,
    obtainOrConfirmBeforeFiling: (binding.registryTrack.packetSet?.participantActionRequired ?? [])
      .filter((a) => a.requiredBeforeFiling === true)
      .map((a) => ({ kind: a.kind, requirement: a.requirement, obtainedFrom: a.obtainedFrom ?? null, description: a.description })),
    selfHelpStopConditionsCarried: (binding.memoTrack.selfHelpStopConditions ?? []).length
  });

  writeJson(`${OUT}/reports/completeness-counters.json`, {
    schemaVersion: "rcap-builder-completeness-counters/v1",
    familyId: FAMILY_ID,
    whatThisIs: "the builder's own count using the repository completeness contract",
    whatThisIsNot: "independent verification, a raster verdict, or a release verdict",
    counters: counted.counters,
    allNineZero,
    findings: counted.findings,
    totals: counted.totals,
    blankDispositions: counted.ledger.reduce((acc, row) => { acc[row.disposition] = (acc[row.disposition] ?? 0) + 1; return acc; }, {})
  });

  writeJson(`${OUT}/build-status.json`, {
    schemaVersion: "rcap-family-build-status/v1",
    familyId: FAMILY_ID,
    buildStatus: "state_built",
    status: "BUILT_RASTER_PENDING",
    reviewStatus: "qa_review_pending",
    builtBy: BUILD_SCRIPT,
    implementationStrategy: STRATEGY,
    sourceStatus: CUSTODY_CLASS,
    renderedArtifacts: artifacts.length,
    rasterPages: 0,
    rasterEngine: null,
    popplerUsed: false,
    rasterState: "BUILT_RASTER_PENDING",
    independentVerificationStatus: "PENDING",
    selfVerified: false,
    generationAllowed: false,
    runtimeSelectable: false,
    commercialRoutesOpened: 0,
    productionTouched: false,
    grantsNothing: "A built packet is review evidence only. It opens no route and authorizes no fulfillment."
  });

  writeJson(`${OUT}/build-findings.json`, {
    schemaVersion: "rcap-family-build-findings/v1",
    familyId: FAMILY_ID,
    blocking: [],
    findings: [
      {
        finding: "The queue declares three held sources at paths inside a custody that is not mounted in this container.",
        treatment: `All ${sources.resolved.length} digests resolved by content hash inside ${sources.mounted.join(" and ")}. Each resolved file was re-hashed from its bytes and both the declared path and the resolved path are recorded.`
      },
      {
        finding: "The catalog names four official forms while the source status is SOURCE_BOUND_BY_HELD_BYTES and no binary exists for the four statutory forms this packet renders.",
        treatment: "The LA-STATUTORY-FORMS owner determination grants this family composition from authority of exactly LA-CCRP-ART-988, 989, 991 and 992 and lists nothing as remaining official and held. The grant is read back at build time and asserted."
      },
      {
        finding: "Three of the seven authoritative components are conditional and no fixture meets their conditions.",
        treatment: "Each is recorded as not generated with the record's own condition text in packet-set-manifest.json and production-field-map.json. Article 984's controlling requirements and the Article 993 supplemental-sheet route are both carried in the participant instructions."
      },
      {
        finding: "Article 993 and Article 998 carry a committed legal-design statement that no template exists, none is counsel-approved and no implementation is authorized.",
        treatment: "Neither is composed here. Article 993 is not in this family's authority grant and its component is conditional and unmet; Article 998 belongs to a different family entirely."
      },
      {
        finding: "The participant owns race, gender, the last four digits of the Social Security number and the arrest or booking number.",
        treatment: "All four are declared REQUIRED_BEFORE_FILING, left blank on the motion, and named verbatim in participant-instructions.md. The platform holds no Social Security number and writes none."
      },
      {
        finding: "Every ordering paragraph, finding, election, date, place and judicial signature on the Article 991 and Article 992 orders belongs to the court.",
        treatment: "Each is classified court-owned, the proposed orders are visibly unexecuted, and no court or signature field carries ink."
      },
      {
        finding: "The committed record holds this track's filing destination, venue, fee, fee exemption, notice, objection and service rules.",
        treatment: "Each is quoted from the record in the participant and filing instructions rather than replaced by an instruction to ask the clerk."
      },
      {
        finding: `The memo holds ${(binding.memoTrack.selfHelpStopConditions ?? []).length} self-help stop conditions and ${(binding.memoTrack.exclusions ?? []).length} exclusions for this track.`,
        treatment: "Every one is carried verbatim and numbered in participant-instructions.md, with the count printed beside them so short carriage is visible."
      }
    ]
  });

  writeJson(`${OUT}/approval-request.json`, {
    schemaVersion: "rcap-family-approval-request/v1",
    familyId: FAMILY_ID,
    requested: "independent completeness verification, central raster acceptance, visual review, and counsel review",
    buildStatus: "state_built",
    status: "PENDING_INDEPENDENT_VERIFICATION",
    approvedForLive: false,
    live: false,
    commercialRoutesOpened: 0,
    counselQuestionsRaised: [
      "Confirm the composed Article 989 motion carries Part I and Part II faithfully against the current codified article text for a felony conviction, and that Article 986(C) is satisfied by naming the court on its face.",
      "Confirm that writing the Article 978(A) statutory basis as a collected case fact, rather than leaving the statutory grounds as blank elections, is the right treatment for a packet set serving all four census routes.",
      "Confirm the treatment of the three conditional components as not generated, and in particular that withholding the Article 988 fee exemption on a felony-conviction track, on the strength of the committed rule that a person ever convicted of a felony is ineligible, is correct.",
      "Confirm that the Article 992 order may carry the mover-supplied identifiers of the record to be expunged while every decretal element stays blank."
    ],
    mattersForTheReviewersAttention: [
      "Every committed record is pinned twice: by whole-file SHA-256 and by the SHA-256 of this family's own entry inside it.",
      "Held sources were resolved by content hash across the mounted corpus, never by the declared path.",
      "The build status is BUILT_RASTER_PENDING. No raster ran, no self-verification is claimed, and visualDefects records that nobody has looked."
    ]
  });

  return {
    familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING",
    implementationStrategy: STRATEGY,
    custodyClass: CUSTODY_CLASS,
    routeKeys: binding.queueFamily.routeKeys,
    directory: OUT,
    componentsAuthoritative: binding.components.length,
    componentsRendered: RENDERED_COMPONENTS,
    componentsNotGenerated: notGenerated.map((row) => row.componentId),
    heldSources: sources.resolved.map((row) => ({ sourceId: row.sourceId, sha256: row.sha256, resolvedPath: row.resolvedPath })),
    recordBindings: binding.pins.map((row) => ({ record: row.record, wholeFileSha256: row.wholeFileSha256, thisFamilysEntrySha256: row.thisFamilysEntrySha256 })),
    counters: counted.counters,
    nineCountersZero: allNineZero,
    writes: maps.reduce((sum, m) => sum + m.canonicalWrites.length, 0),
    blanks: maps.reduce((sum, m) => sum + m.canonicalRefusals.length, 0),
    requiredBeforeFiling: rbf.length,
    selfHelpStopConditionsCarried: (binding.memoTrack.selfHelpStopConditions ?? []).length,
    artifactHashes: artifacts.map((a) => ({ fixture: a.fixture, packetSha256: a.sha256, byteLength: a.byteLength, pages: a.pageCount })),
    rasterPages: 0,
    rasterState: "BUILT_RASTER_PENDING",
    packetsSelfVerified: 0,
    commercialRoutesOpened: 0,
    productionTouched: false
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  runFamily()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exit(1); });
}
