#!/usr/bin/env node
/**
 * Deterministic census-v1 builder for `la-976-arrest-no-conviction-set`.
 *
 *   MASTER_LIBRARY_SOURCE_DIR=/home/user/corpus-x/Expungement_AI_RCAP_Master_Library_Edition_1 \
 *     node scripts/build-census-v1-la-976-arrest-no-conviction-set.mjs --no-raster
 *   node scripts/build-census-v1-la-976-arrest-no-conviction-set.mjs --check
 *
 * WHAT THIS FAMILY IS, AND WHY ITS ARTICLE IS NOT INTERCHANGEABLE WITH ITS
 * NEIGHBOURS
 *
 * Expungement of a record of ARREST THAT DID NOT RESULT IN A CONVICTION, under
 * La. C.Cr.P. art. 976. Louisiana runs four separate expungement tracks off four
 * separate articles, and this repository builds several of them: Article 977 for
 * a misdemeanour conviction, Article 977(D) on the Article 998 form for a first
 * offence possession of marijuana, Article 978 for a felony conviction, Article
 * 985 for expungement by redaction and Article 985.1 for an interim expungement.
 * They share the Article 989/991/992 statutory instruments and they share a
 * caption. They do NOT share a controlling authority, an eligibility recital or
 * a prayer, and a caption template that flattens them would put an Article 977
 * conviction recital on an Article 976 arrest motion.
 *
 * So every recital on the face of this packet is Article 976's own:
 *
 *   - Article 976(A) reaches an arrest for a felony or misdemeanour that did not
 *     result in conviction on one of seven grounds: no prosecution and the time
 *     limitation expired; the district attorney declined to prosecute every
 *     offence arising out of the arrest, including because a pretrial diversion
 *     programme was completed; final disposition by dismissal, by sustaining a
 *     motion to quash, or by acquittal; or a judicial determination of factual
 *     innocence with entitlement to compensation under R.S. 15:572.8.
 *   - Article 976(B) bars expungement of an arrest for operating a vehicle while
 *     intoxicated, or a parish or municipal equivalent, where the person was
 *     placed in a pretrial diversion programme, until five years have elapsed
 *     from the date of arrest.
 *   - Article 975 bars filing by a person in the physical custody of the
 *     Department of Public Safety and Corrections serving a sentence at hard
 *     labour.
 *
 * WHICH OF THE SEVEN GROUNDS APPLIES IS THE PARTICIPANT'S, NOT THE PACKET'S
 *
 * The route determines the ARTICLE. It does not determine the GROUND. The
 * committed memo makes dispositionType a required participant input and the
 * component note for the Article 989 motion says in terms that the Part II
 * eligibility selection "is a legal conclusion the participant owns - Louisiana
 * State Police names choosing the wrong eligibility basis as a common fatal
 * error". So the ground is left blank, declared determinedByTheCaseNotTheRoute
 * with the reason recorded, printed as an empty line on the motion, and carried
 * into the guide's supply table with the record's own warning beside it.
 *
 * THE ARTICLE 988 FEE EXEMPTION IS GENERATED ON THIS TRACK, AND WAS NOT ON THE
 * NEIGHBOURING ONE
 *
 * The Article 988 component is conditional on every Louisiana track, but the
 * condition each track states is different and this one is met. This track's
 * condition reads "Generated wherever the participant may qualify for the
 * Article 983(F) exemption, which on this track is common"; the committed rules
 * say the exemption "is very often available on this track and must be screened
 * before filing rather than after"; the Article 983(F) grounds ARE non-conviction
 * grounds and this is the non-conviction track; the legal-design limitation says
 * "Route every participant through Art. 988 before filing"; the manual-completion
 * record describes what LegalEase completes on the form and what the district
 * attorney completes; and item 2 of the packet set's own required-before-filing
 * list tells the participant "The packet gives you the Article 988 form with your
 * own fields filled in."
 *
 * A neighbouring family shipped that same sentence in its guide while not
 * generating the component, and an independent lane recorded it as a false
 * statement about the packet with the Article 983(A) five-hundred-and-fifty-dollar
 * non-refundable cap behind it. This build generates the component instead, so
 * the record's sentence is true of this packet. Only the identifying fields the
 * record names are written; every certification box and the district attorney's
 * signature are left blank and classified prosecutor-owned, because the form's own
 * instruction assigns them there.
 *
 * The reconciliation code that corrects a "the packet gives you the Article N
 * form" claim is still present and still runs. It now finds nothing to correct
 * for Article 988 and would correct Article 993 if the record ever claimed it.
 *
 * WHAT IS NOT GENERATED
 *
 * The Article 993 supplemental sheet (`...-continuation-5`) is conditional on a
 * count that exceeds the Article 989 motion's own fields, which neither fixture
 * establishes. Independently, Article 993 is not in this family's
 * composedFromAuthority grant and the committed legal-design note states in terms
 * that "No template exists yet, none is counsel-approved, and no implementation
 * is authorized here". Two reasons, either alone sufficient. The instructions
 * send a participant with more counts than the motion holds to the clerk for the
 * statutory sheet rather than to pages of their own, because Article 986(B)
 * permits a supplemental form only so far as it adheres to the statutory form.
 *
 * A PROMPT IS NOT AN ANSWER
 *
 * Six required participant inputs on the neighbouring family were written as
 * restatements of their own printed questions, and five of them printed a second
 * time onto a proposed order a judge signs. Nothing here writes a fact the
 * platform does not hold. Where the platform holds no value, the field prints as
 * an empty dot leader, is classified REQUIRED_BEFORE_FILING, and reaches the
 * participant through the guide's supply table.
 *
 * SOURCES ARE RESOLVED BY CONTENT DIGEST, NEVER BY DECLARED PATH
 *
 * Both declared digests are resolved by SHA-256 across whatever custody is
 * mounted and re-hashed from the resolved bytes. The declared path is carried
 * only as the thing that was declared. A digest that resolves nowhere stops the
 * build and is named. Both are AUTHORITY REFERENCES rather than rendered
 * components: Article 990 is the responding entity's own affidavit and is never
 * printed in a participant packet, and Article 993 is the withheld continuation
 * sheet.
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

const FAMILY_ID = "la-976-arrest-no-conviction-set";
const TRACK_ID = "la-976-arrest-no-conviction";
const JURISDICTION = "LA";
const OWNER_DECISION = "LA-STATUTORY-FORMS";
const STRATEGY = "official_pdf_fill";
const CUSTODY_CLASS = "SOURCE_BOUND_BY_HELD_BYTES";
const OUT = "data/rcap-all50/overlays/census-v1/la/la-976-arrest-no-conviction-set--official-pdf-fill";
const BUILD_SCRIPT = "scripts/build-census-v1-la-976-arrest-no-conviction-set.mjs";

const FEE_EXEMPTION = "LA-CCRP-ART-988";
const MOTION = "LA-CCRP-ART-989";
const ORDER = "LA-CCRP-ART-991";
const EXPUNGEMENT_ORDER = "LA-CCRP-ART-992";
const CONTINUATION = "LA-CCRP-ART-993";
const GUIDE = "la-976-arrest-no-conviction-instructions-6";

/* SIX authoritative components. Five are rendered; the Article 993 continuation
 * is conditional, unmet, ungranted and has no authorized template. */
const COMPONENT = Object.freeze({
  motion: "la-976-arrest-no-conviction-primary-filing-1",
  order: "la-976-arrest-no-conviction-proposed-order-2",
  expungementOrder: "la-976-arrest-no-conviction-proposed-order-3",
  feeExemption: "la-976-arrest-no-conviction-fee-waiver-4",
  continuation: "la-976-arrest-no-conviction-continuation-5",
  guide: "la-976-arrest-no-conviction-instructions-6"
});

const RENDERED_COMPONENTS = [
  COMPONENT.motion, COMPONENT.order, COMPONENT.expungementOrder, COMPONENT.feeExemption, COMPONENT.guide
];
const DOCUMENT_OF = Object.freeze({
  [COMPONENT.motion]: MOTION,
  [COMPONENT.order]: ORDER,
  [COMPONENT.expungementOrder]: EXPUNGEMENT_ORDER,
  [COMPONENT.feeExemption]: FEE_EXEMPTION,
  [COMPONENT.guide]: GUIDE
});
const TITLES = Object.freeze({
  [COMPONENT.motion]: "Article 989 Motion for Expungement of a Record of Arrest That Did Not Result in a Conviction, under Article 976",
  [COMPONENT.order]: "Article 991 Order",
  [COMPONENT.expungementOrder]: "Article 992 Order of Expungement of Arrest Record",
  [COMPONENT.feeExemption]: "Article 988 Motion for Fee Exemption under Article 983(F)",
  [COMPONENT.guide]: "Article 976 Participant and Filing Instructions"
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
 * A whole-file pin on a shared national record goes stale the moment an
 * unrelated jurisdiction is productised, so the entry pin is the one that says
 * whether an edit touched THIS family.
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
  /* Every instrument this build composes is inside this family's own grant.
   * Article 993 is deliberately outside it and is deliberately not composed. */
  assert.deepEqual(ownerFamily.composedFromAuthority, [FEE_EXEMPTION, MOTION, ORDER, EXPUNGEMENT_ORDER],
    "this family's authority grant has changed; this build composes exactly the instruments the grant names");
  assert.equal(ownerFamily.composedFromAuthority.includes(CONTINUATION), false,
    "Article 993 has entered the grant; the withholding reason in this build names the grant and must be re-read before it is composed");
  assert.deepEqual(ownerFamily.remainOfficialAndMustBeHeld, []);
  pin("owner", `determinations[id=${OWNER_DECISION}].families[familyId=${FAMILY_ID}]`, ownerFamily);

  const queueFamily = loaded.queue.data.families.find((row) => row.familyId === FAMILY_ID);
  assert.ok(queueFamily, `MASTER_QUEUE carries no ${FAMILY_ID}`);
  assert.equal(queueFamily.implementationStrategy, STRATEGY);
  assert.equal(queueFamily.sourceStatus, CUSTODY_CLASS);
  assert.equal(queueFamily.directory, OUT);
  assert.equal(queueFamily.buildScript, BUILD_SCRIPT);
  pin("queue", `families[familyId=${FAMILY_ID}]`, queueFamily);

  const routes = loaded.census.data.routes.filter((row) => row.packetSetId === FAMILY_ID);
  assert.equal(routes.length, queueFamily.routeKeys.length, "the census and the queue must agree on this family's route count");
  assert.deepEqual(routes.map((r) => r.routeKey).sort(), [...queueFamily.routeKeys].sort());
  pin("census", `routes[packetSetId=${FAMILY_ID}]`, routes);

  const memoTrack = loaded.memo.data.tracks.find((row) => row.trackId === TRACK_ID);
  assert.ok(memoTrack, `the LA memo carries no ${TRACK_ID}`);
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
    COMPONENT.feeExemption, COMPONENT.continuation, COMPONENT.guide
  ], "the authoritative component set has changed; this build states the set it was written against");
  for (const componentId of [COMPONENT.motion, COMPONENT.order, COMPONENT.expungementOrder, COMPONENT.guide]) {
    const row = components.find((c) => c.componentId === componentId);
    assert.equal(row.requirement, "required", `${componentId} is no longer required in the authoritative packet set`);
  }
  for (const componentId of [COMPONENT.feeExemption, COMPONENT.continuation]) {
    const row = components.find((c) => c.componentId === componentId);
    assert.equal(row.requirement, "conditional", `${componentId} is no longer conditional; a required component may not be withheld`);
    assert.ok(row.conditionDescription, `${componentId} states no condition, so nothing establishes whether it is met`);
  }
  /* This build GENERATES the Article 988 component, so the record's condition
   * for it is asserted rather than only quoted. If the record stops saying the
   * exemption is common on this track, the reason for generating it has gone
   * and the decision must be re-taken rather than inherited. */
  const feeRow = components.find((c) => c.componentId === COMPONENT.feeExemption);
  assert.match(String(feeRow.conditionDescription), /on this track is common/i,
    "the Article 988 condition no longer says the exemption is common on this track; this build generates the component on the strength of that sentence");
  assert.match(String(registryTrack.rules?.fees ?? ""), /very often available on this track/i,
    "the committed fee rule no longer says the exemption is very often available on this track");

  /*
   * EVERY LIST THE GUIDE PRINTS IS READ AT BUILD TIME AND COUNTED ON THE PAGE.
   *
   * The failure this guards against is not a record that disappears; it is a
   * record that shrinks while a builder keeps printing the shape it was written
   * against. Each list is asserted non-empty here and printed in full with its
   * count beside it, so short carriage is visible on the page a participant
   * reads rather than only in a report nobody opens.
   */
  const printedLists = {
    "packetSet.requiredBeforeFiling": packetSet.requiredBeforeFiling,
    "packetSet.participantActionRequired": packetSet.participantActionRequired,
    "registryTrack.authority": registryTrack.authority,
    "memoTrack.selfHelpStopConditions": memoTrack.selfHelpStopConditions,
    "memoTrack.exclusions": memoTrack.exclusions,
    "memoTrack.waitingPeriods": memoTrack.waitingPeriods,
    "memoTrack.unresolvedQuestions": memoTrack.unresolvedQuestions,
    "memoTrack.manualCompletionItems": memoTrack.manualCompletionItems,
    "memoTrack.eligibleDispositions": memoTrack.eligibleDispositions,
    "memoTrack.supportingDocuments": memoTrack.supportingDocuments,
    "memoTrack.components": memoTrack.components
  };
  for (const [name, list] of Object.entries(printedLists)) {
    assert.ok(Array.isArray(list) && list.length > 0,
      `the committed record no longer declares ${name}; this packet PRINTS it, so an empty declaration is a stop rather than a shorter guide`);
  }
  for (const key of ["filing", "notice", "service", "participantSignature", "notarization", "fees", "feeWaiver"]) {
    assert.ok(String(registryTrack.rules?.[key] ?? "").trim().length > 0,
      `the committed record no longer declares registryTrack.rules.${key}; this packet prints it`);
  }
  assert.ok(String(registryTrack.mechanism ?? "").trim().length > 0, "the committed record no longer declares this track's mechanism; this packet prints it");

  /* THE ARTICLE CHECK. This packet's recitals, prayer and title are Article
   * 976's. If the controlling record stops naming Article 976 as this track's
   * authority, the recitals on the page are no longer the record's. */
  assert.match(String(registryTrack.legalName ?? ""), /art\. 976/i,
    "the committed record no longer names Article 976 as this track's authority");
  assert.match(String(memoTrack.controllingAuthority?.summary ?? ""), /Article 976\(A\)/,
    "the committed memo no longer recites Article 976(A); this packet's eligibility recitals come from it");
  assert.equal(memoTrack.controllingAuthority.citations[0], "La. C.Cr.P. art. 976");

  return { owner, ownerFamily, queueFamily, routes, memoTrack, registryTrack, packetSet, components, relationships, pins, printedLists };
}

/* ------------------------------------------- sources, resolved by content */

/*
 * WHERE BYTES ARE LOOKED FOR.
 *
 * `private/` is gitignored, so it is not a git path and its absence from a
 * worktree proves nothing about custody: `git sparse-checkout add private`
 * would never produce it. A lane that reads an unmounted custody as a missing
 * source is reading a resolver artefact. The declared custody
 * (rcap-d-source-packs-2026-08-12) is listed FIRST here, so when it is mounted
 * the declared path and the resolved path are the same file and the receipt
 * says so; the other roots are fallbacks for the case where it is not.
 */
const CORPUS_ROOTS = [
  "private/source-imports/rcap-d-source-packs-2026-08-12",
  process.env.MASTER_LIBRARY_SOURCE_DIR ?? "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  "private/source-imports/Nationwide_Recovery_Pool_2026-09-02",
  "private/human-source-returns",
  "/home/user/corpus-x/Expungement_AI_RCAP_Master_Library_Edition_1"
];

function corpusByContentHash() {
  const index = new Map();
  const walk = (dir, custody) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { walk(full, custody); continue; }
      if (!entry.isFile()) continue;
      const digest = sha256(fs.readFileSync(full));
      if (!index.has(digest)) index.set(digest, { custody, path: full });
    }
  };
  const mounted = [];
  const seen = new Set();
  for (const root of CORPUS_ROOTS) {
    const abs = path.resolve(ROOT, root);
    if (!fs.existsSync(abs) || seen.has(abs)) continue;
    seen.add(abs);
    mounted.push(abs);
    walk(abs, path.basename(abs));
  }
  assert.ok(mounted.length > 0, `no source custody is mounted; tried ${CORPUS_ROOTS.join(", ")}`);
  return { index, mounted };
}

/**
 * Resolve every declared digest across whatever custody is mounted.
 *
 * A declared path is never opened. This family was recorded
 * SOURCE_IDENTITY_UNRESOLVED and was held out of the build queue for it, while
 * both digests sat byte-exact in the Master Library the whole time; the
 * resolution gate was returning before it reached the digest fallback. Resolving
 * by digest first is the correction.
 */
function resolveHeldSources(queueFamily) {
  const { index, mounted } = corpusByContentHash();
  const resolved = [];
  const absent = [];
  for (const declared of queueFamily.sourceHashes ?? []) {
    const hit = index.get(declared.sha256);
    if (!hit) { absent.push({ sourceId: declared.sourceId, sha256: declared.sha256, declaredPath: declared.path }); continue; }
    const bytes = fs.readFileSync(hit.path);
    const recomputed = sha256(bytes);
    assert.equal(recomputed, declared.sha256, `content-hash index disagrees with the file at ${hit.path}`);
    resolved.push({
      sourceId: declared.sourceId,
      declaredPath: declared.path,
      declaredCustodyMounted: fs.existsSync(path.join(ROOT, declared.path)),
      resolvedPath: hit.path,
      resolvedCustody: hit.custody,
      resolvedBy: "content_digest_across_the_mounted_corpus",
      sha256: recomputed,
      byteLength: bytes.length,
      tier: declared.tier,
      sha256Exact: true
    });
  }
  return { resolved, absent, mounted };
}

/* ------------------------------------------------------------- fixtures */

/*
 * WHAT A FIXTURE MAY HOLD, AND WHAT IT MAY NOT.
 *
 * A fixture holds answers a participant gave. It does not hold a restatement of
 * the question, a description of the fixture, or a plausible guess at a sworn
 * averment about a criminal record. Every required participant input for which
 * this build holds no answer is absent from these tables ON PURPOSE and prints
 * as an empty line: the original arrest charges, how each charge ended, whether
 * the arrest was vehicle-while-intoxicated, whether a pretrial diversion
 * programme was entered on such an arrest, whether the record names anyone
 * besides the mover, race, gender, the last four digits of the Social Security
 * number, the arrest or booking number, the SID number, the agency item number
 * and the driver's licence number.
 *
 * The original arrest charge is the cell the Louisiana State Police list of
 * common fatal errors singles out, and the eligibility ground is the second.
 * Neither is guessed here.
 */
const FIXTURES = Object.freeze({
  canonical: {
    "participant.full_legal_name": "Jordan Avery Reyes",
    "participant.date_of_birth": "1991-04-17",
    "case.court_name": "Twenty-First Judicial District Court",
    "case.parish": "Tangipahoa Parish",
    "case.docket_number": "TEST-2026-000001",
    "case.division": "Division A",
    "case.arrest_date": "2019-03-08",
    "case.arresting_law_enforcement_agency": "Tangipahoa Parish Sheriff's Office",
    "case.charge_count": "One charge on one arrest",
    "case.disposition_date": "2019-09-12",
    "case.any_conviction_on_this_arrest": "No",
    "case.hard_labor_custody": "No",
    "case.background_check_ordered_on": "2026-08-20"
  },
  boundary: {
    "participant.full_legal_name": "Maria-Alejandra O'Shaughnessy-Whitfield",
    "participant.date_of_birth": "1968-12-31",
    "case.court_name": "Municipal and Traffic Court of New Orleans, Traffic Division",
    "case.parish": "Parish of Saint John the Baptist",
    "case.docket_number": "TEST-BOUNDARY-2026-0000000000000001",
    "case.division": "Division Z-Long",
    "case.arrest_date": "2013-12-31",
    "case.arresting_law_enforcement_agency": "Saint John the Baptist Parish Sheriff's Office, Criminal Patrol Division",
    "case.charge_count": "Three charges on one arrest",
    "case.disposition_date": "2014-06-30",
    "case.any_conviction_on_this_arrest": "No",
    "case.hard_labor_custody": "No",
    "case.background_check_ordered_on": "2026-08-01"
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
  reason: "court, clerk, prosecutor, or hearing field; the court or the prosecutor completes it",
  category: COURT_OWNED,
  completenessClass: COURT_OWNED,
  class: COURT_OWNED,
  completenessDisposition: "PROTECTED_FIELD",
  requiredBeforeFiling: false,
  why
});

const attorneyRow = (document, id, label, page = 1) => ({
  ...base(document, id, label, page),
  reason: "attorney-only block; this packet holds no record that the mover is represented, so it is not populated with participant data",
  category: null,
  completenessClass: null,
  class: null,
  completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
  requiredBeforeFiling: false,
  why: "this packet holds no record that the mover is represented, and the attorney block belongs to counsel"
});

const CAPTION_WRITES = (document) => [
  write(document, "court_name", "Name of court with trial jurisdiction over the offense", "case.court_name"),
  write(document, "parish", "Parish of arrest", "case.parish"),
  write(document, "docket_number", "Docket or case number", "case.docket_number"),
  write(document, "division", "Division of the court", "case.division"),
  write(document, "mover_full_legal_name", "Mover full legal name", "participant.full_legal_name")
];

/* The identifiers of the arrest, on every document that prints them. */
const ARREST_WRITES = (document, page = 1) => [
  write(document, "arrest_date", "Date of arrest as it appears on the state rap sheet", "case.arrest_date", page),
  write(document, "arresting_law_enforcement_agency", "Arresting law enforcement agency", "case.arresting_law_enforcement_agency", page),
  write(document, "charge_count", "How many separate charges or counts this arrest carries", "case.charge_count", page),
  write(document, "disposition_date", "Date each charge on this arrest ended", "case.disposition_date", page)
];

/*
 * The two mover averments only the participant can give, on every document that
 * prints them.
 *
 * The original arrest charge carries its own warning because the memo's own
 * question carries it: the ORIGINAL charge for EVERY count, not the amended
 * charge and not the charge finally convicted of. The eligibility ground is
 * declared determinedByTheCaseNotTheRoute with the reason recorded, because the
 * route picks the ARTICLE and the case picks which of the seven Article 976(A)
 * grounds the mover proceeds on.
 */
const ARREST_SUPPLIES = (document, page = 1) => [
  supply(document, "original_arrest_charges", "Original arrest charge and statute for every count as they appear on the state rap sheet",
    "each charge at the time of arrest - the original arrest charge and statute for every count, exactly as the state rap sheet writes them, not the charge that was later amended and not leaving a count out",
    "the committed memo makes originalArrestCharges a required participant input and the platform holds no value for it; the Louisiana State Police list of common fatal errors names using the amended charge and omitting counts, so no packet may supply it",
    page),
  supply(document, "eligibility_ground", "Which Article 976(A) ground applies to each charge on this arrest",
    "which Article 976(A) ground each charge ended on - never prosecuted and the time limitation ran out, the district attorney refused the charges, a pretrial diversion programme was completed, the case was dismissed, a motion to quash was sustained, an acquittal, or a judicial determination of factual innocence with entitlement to compensation under R.S. 15:572.8",
    "the committed memo makes dispositionType a required participant input and the component note for the Article 989 motion states that the Part II eligibility selection is a legal conclusion the participant owns, which Louisiana State Police names as a common fatal error when chosen wrongly",
    page,
    {
      determinedByTheCaseNotTheRoute: true,
      whyTheRouteCannotDetermineIt: "the route determines the ARTICLE and not the GROUND: Article 976(A) lists seven separate grounds and which one a charge ended on is a fact of the case, established by the minute entry and the district attorney's certification, not by the route the packet was built for. Writing a ground the record does not establish would put an unsupported legal conclusion on a motion the mover signs, and choosing the wrong eligibility basis is on the Louisiana State Police list of common fatal errors."
    })
];

function motionMap() {
  const writes = [
    ...CAPTION_WRITES(MOTION),
    write(MOTION, "mover_date_of_birth", "Mover date of birth", "participant.date_of_birth"),
    ...ARREST_WRITES(MOTION),
    write(MOTION, "any_conviction_on_this_arrest", "Whether any charge on this arrest ended in a misdemeanour or felony conviction", "case.any_conviction_on_this_arrest"),
    write(MOTION, "hard_labor_custody", "Whether the mover is now in the physical custody of the Department of Public Safety and Corrections serving a sentence at hard labour", "case.hard_labor_custody"),
    write(MOTION, "background_check_ordered_on", "Date the Louisiana criminal background check was ordered", "case.background_check_ordered_on")
  ];
  const blanks = [
    ...ARREST_SUPPLIES(MOTION),
    supply(MOTION, "dwi_related_arrest", "Whether this arrest was for operating a vehicle while intoxicated, or for a parish or municipal ordinance version of that offence",
      "whether this arrest was for operating a vehicle while intoxicated, or for a parish or city ordinance version of that offence",
      "the committed memo makes dwiRelatedArrest a required participant input and the platform holds no value for it; Article 976(B) turns on the answer and the committed record makes a vehicle-while-intoxicated arrest in any form a self-help stop condition"),
    supply(MOTION, "dwi_pretrial_diversion", "Whether a pretrial diversion programme was entered on a vehicle-while-intoxicated arrest",
      "whether you entered a pretrial diversion programme on that vehicle-while-intoxicated arrest, if this arrest was one",
      "the committed memo makes dwiPretrialDiversion a participant input and the platform holds no value for it; Article 976(B) bars expungement for five years from the date of arrest where it happened"),
    supply(MOTION, "co_defendants_on_record", "Whether the record of this arrest names anyone besides the mover",
      "whether the record of this arrest names anyone besides you",
      "the committed memo makes coDefendantsOnRecord a required participant input and the platform holds no value for it; the committed record makes a record naming anyone else the Article 985 redaction question and a self-help stop condition on this track"),
    supply(MOTION, "race", "Race",
      "your race, written as the state rap sheet writes it, so Part I matches the record the Bureau holds",
      "the committed manual-completion record classifies race as a manual completion item pending a data-protection review, so the packet prints it blank for the participant to complete by hand"),
    supply(MOTION, "gender", "Gender",
      "your gender, written as the state rap sheet writes it, so Part I matches the record the Bureau holds",
      "the committed manual-completion record classifies gender as a manual completion item pending a data-protection review, so the packet prints it blank for the participant to complete by hand"),
    supply(MOTION, "ssn_last_four", "Last four digits of the Social Security number",
      "the last four digits of your Social Security number, written on the form by hand at the moment you file",
      "the platform does not store or write a Social Security number, so no value for it exists to be written"),
    supply(MOTION, "arrest_number", "Arrest or booking number shown on the state rap sheet",
      "the arrest or booking number (ATN) exactly as your Right to Review or sheriff's background check prints it",
      "the number lives on the rap sheet the participant orders, and the platform holds no copy of it"),
    supply(MOTION, "sid_number", "SID number shown on the state rap sheet",
      "your SID number exactly as your rap sheet prints it, or leave it blank if your rap sheet shows none",
      "the committed memo asks for the SID number only because the Article 989 form provides the field; it lives on the rap sheet the participant orders and the platform holds no copy of it"),
    supply(MOTION, "agency_item_number", "Arresting law enforcement item number for this arrest",
      "the arresting agency's item number for this arrest, from your rap sheet or the agency's own report",
      "the item number is the arresting agency's internal reference; the platform holds no copy of it"),
    supply(MOTION, "drivers_license_number", "Louisiana driver's licence number",
      "your Louisiana driver's licence number, or leave it blank if you have never held one",
      "the committed memo asks for it only where the participant holds or held a Louisiana licence; the platform holds no licence number"),
    attorneyRow(MOTION, "attorney_name", "Attorney name in the represented-mover block", 2),
    attorneyRow(MOTION, "attorney_bar_number", "Attorney bar roll number in the represented-mover block", 2),
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
    courtRow(ORDER, "objection_window_direction", "Direction setting the sixty-day objection window and directing service",
      "Article 991 has the court set the objection window and direct the clerk to serve; both are the court's"),
    courtRow(ORDER, "no_contradictory_hearing_finding", "Finding that no contradictory hearing is required",
      "Article 991 lets the court make that finding where an Affidavit of No Opposition executed by each named entity is attached; the finding is the court's"),
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
  const writes = [...CAPTION_WRITES(EXPUNGEMENT_ORDER), ...ARREST_WRITES(EXPUNGEMENT_ORDER)];
  const blanks = [
    /* The mover-supplied identifiers this page carries are blanks here for the
     * same reason they are blanks on the motion. Nothing on a proposed order a
     * judge signs may carry a restatement of its own question in place of a fact. */
    ...ARREST_SUPPLIES(EXPUNGEMENT_ORDER),
    courtRow(EXPUNGEMENT_ORDER, "granted_or_denied", "Whether the motion is granted or denied",
      "granting or denying the motion is the court's decision and this build makes none of it"),
    courtRow(EXPUNGEMENT_ORDER, "decretal_paragraphs", "Decretal paragraphs on the Article 992 Order of Expungement",
      "the decretal paragraphs are the court's judgment"),
    courtRow(EXPUNGEMENT_ORDER, "findings", "Findings on the Article 992 Order of Expungement",
      "findings are made by the court after the Article 980 objection period"),
    courtRow(EXPUNGEMENT_ORDER, "service_direction", "Direction to serve the order and judgment after expungement is granted",
      "Article 982 places service of the order and judgment on the clerk of court"),
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

/**
 * The Article 988 Motion for Fee Exemption.
 *
 * The committed manual-completion record fixes the split exactly: "LegalEase
 * completes only the participant-owned identifying fields", and "Every
 * certification box and the district attorney's signature" belong to the
 * district attorney or a designee. Only the fields the memo names are written
 * here -- name, date of birth, the last four of the Social Security number, the
 * date of arrest, the docket number and the charge -- and of those the platform
 * holds four; the Social Security digits and the original charge are the
 * participant's to write, exactly as they are on the motion.
 */
function feeExemptionMap() {
  const writes = [
    ...CAPTION_WRITES(FEE_EXEMPTION),
    write(FEE_EXEMPTION, "mover_date_of_birth", "Mover date of birth", "participant.date_of_birth"),
    write(FEE_EXEMPTION, "arrest_date", "Date of arrest as it appears on the state rap sheet", "case.arrest_date")
  ];
  const blanks = [
    supply(FEE_EXEMPTION, "ssn_last_four", "Last four digits of the Social Security number",
      "the last four digits of your Social Security number, written on the form by hand before you take it to the district attorney",
      "the platform does not store or write a Social Security number, so no value for it exists to be written"),
    supply(FEE_EXEMPTION, "original_arrest_charges", "Original arrest charge and statute for every count as they appear on the state rap sheet",
      "each charge at the time of arrest, written the same way you wrote it on the Article 989 motion so the two documents match",
      "the committed memo makes originalArrestCharges a required participant input and the platform holds no value for it; the committed manual-completion record names the charge as one of the participant-owned identifying fields on this form"),
    courtRow(FEE_EXEMPTION, "certification_no_felony_convictions",
      "Certification that the mover has no felony convictions, completed by the district attorney",
      "the form's own instruction assigns every certification to the district attorney or a designee; Article 983(F) makes the exemption turn on that certification"),
    courtRow(FEE_EXEMPTION, "certification_no_pending_felony_charge",
      "Certification that no felony charge is pending under a bill of information or indictment, completed by the district attorney",
      "the form's own instruction assigns every certification to the district attorney or a designee"),
    courtRow(FEE_EXEMPTION, "certification_non_conviction_ground",
      "Certification of the Article 983(F) non-conviction ground relied on, completed by the district attorney",
      "the form's own instruction assigns every certification to the district attorney or a designee, and which listed ground is certified is the district attorney's statement rather than the mover's"),
    protectedRow(FEE_EXEMPTION, "district_attorney_signature", "Signature of the district attorney or designee on the fee exemption",
      "the district attorney or a designee signs, and returns the form within fifteen days"),
    protectedRow(FEE_EXEMPTION, "district_attorney_signature_date", "Date of the district attorney's signature",
      "the district attorney dates their own signature"),
    protectedRow(FEE_EXEMPTION, "mover_signature", "Signature of the mover on the fee exemption",
      "the mover signs personally, after reading the completed form"),
    protectedRow(FEE_EXEMPTION, "mover_signature_date", "Date of the mover's signature on the fee exemption",
      "a date written before signing would be false")
  ];
  return {
    formNumber: FEE_EXEMPTION,
    documentId: FEE_EXEMPTION,
    componentId: COMPONENT.feeExemption,
    documentRole: "fee_waiver",
    structuralClass: "codified_statutory_form_composed_from_authority",
    officialFormId: FEE_EXEMPTION,
    documentPolicy: { mode: "participant_completes_identifying_fields_prosecutor_certifies", packetSetId: FAMILY_ID, documentAcceptsFill: true },
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
  [" ", " "], ["‑", "-"], ["‒", "-"], ["–", "-"], ["—", " - "], ["−", "-"],
  ["‘", "'"], ["’", "'"], ["‚", "'"], ["“", '"'], ["”", '"'], ["„", '"'],
  ["…", "..."], ["§", "Sec. "], ["¶", "para. "], ["•", "- "], ["­", ""],
  ["é", "e"], ["è", "e"], ["ü", "u"], ["ñ", "n"], ["á", "a"], ["í", "i"],
  ["ó", "o"], ["ú", "u"], ["ç", "c"], ["⁄", "/"], ["½", "1/2"], ["″", '"'],
  ["¤", "Sec. "]
]);

/**
 * Every glyph this build draws is a glyph the standard font can encode.
 *
 * An unmapped codepoint fails the build and names itself. Dropping a character
 * out of a quoted legal record is exactly the kind of quiet edit this factory
 * refuses.
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

/*
 * FIX146. `Assigned component identity` used to print here, so it appeared in
 * the caption of the Article 989 motion, the Article 991 order, the Article 992
 * order and the Article 988 fee-exemption motion -- four FILED pages, one of
 * which goes to a district attorney's office before filing. A component
 * identity is this factory's own identifier for a document; it is neither
 * statute text nor rule text, and Article 986 provides that the statutory forms
 * shall be used with no local variant. It is not deleted: the guide now carries
 * every component identity in a labelled internal-record-text section. The
 * parameter is gone rather than ignored so no caller can print it by habit.
 */
function captionBlock(facts, documentTitle, documentId) {
  return block(
    documentId,
    documentTitle.toUpperCase(),
    "",
    `${facts["case.court_name"]}, STATE OF LOUISIANA`,
    `PARISH: ${facts["case.parish"]}`,
    `STATE OF LOUISIANA v. ${facts["participant.full_legal_name"]}`,
    `DOCKET OR CASE NUMBER: ${facts["case.docket_number"]}`,
    `DIVISION OF THE COURT: ${facts["case.division"]}`,
    ""
  );
}

/** The identifiers of the arrest for which expungement is sought. */
function arrestBlock(facts) {
  return block(
    "THE ARREST FOR WHICH EXPUNGEMENT IS SOUGHT",
    `Date of arrest as it appears on the state rap sheet: ${facts["case.arrest_date"]}`,
    `Arresting law enforcement agency: ${facts["case.arresting_law_enforcement_agency"]}`,
    "Original arrest charge and statute for every count as they appear on the state rap sheet:",
    DOTS(74), DOTS(74),
    `How many separate charges or counts this arrest carries: ${facts["case.charge_count"]}`,
    `Date each charge on this arrest ended: ${facts["case.disposition_date"]}`,
    ""
  );
}

/** The Article 976(A) grounds, and the one ground the mover must name. */
function groundsBlock(memoTrack) {
  return block(
    "PART II - ARREST THAT DID NOT RESULT IN A CONVICTION, ARTICLE 976(A)",
    memoTrack.controllingAuthority.summary,
    "",
    "Which Article 976(A) ground applies to each charge on this arrest:",
    DOTS(74), DOTS(74),
    "",
    "This line is the mover's to complete and is left blank. Article 976(A) lists separate grounds, and which one a charge ended on is established by the minute entry and by the district attorney's certification. Louisiana State Police names choosing the wrong eligibility basis as a common fatal error.",
    ""
  );
}

function motionBody(facts, binding) {
  const { memoTrack } = binding;
  return [
    captionBlock(facts, TITLES[COMPONENT.motion], MOTION),
    block(
      "MOTION FOR EXPUNGEMENT OF A RECORD OF ARREST THAT DID NOT RESULT IN A CONVICTION",
      "La. C.Cr.P. art. 976, on the statutory Article 989 form.",
      "",
      "NOW INTO COURT comes mover, who provides the court with the following information in connection with this request. Mover is entitled to expunge the record of the arrest identified below pursuant to Louisiana Code of Criminal Procedure Article 971 et seq., and states the following in support.",
      "",
      "Article 986 provides that only the statutory forms shall be used, so there is no drafted pleading and no local variant; Article 986(C) lets a clerk alter the form only to show the name of that court.",
      ""
    ),
    block(
      "PART I - DEFENDANT INFORMATION",
      `Mover full legal name: ${facts["participant.full_legal_name"]}`,
      `Mover date of birth: ${facts["participant.date_of_birth"]}`,
      `Race: ${DOTS(56)}`,
      `Gender: ${DOTS(54)}`,
      `Last four digits of the Social Security number: ${DOTS(24)}`,
      `Louisiana driver's licence number: ${DOTS(36)}`,
      "",
      "Race and gender are left blank for the mover to complete by hand.",
      ""
    ),
    arrestBlock(facts),
    block(
      `Arrest or booking number shown on the state rap sheet: ${DOTS(18)}`,
      `SID number shown on the state rap sheet: ${DOTS(31)}`,
      `Arresting law enforcement item number for this arrest: ${DOTS(18)}`,
      ""
    ),
    groundsBlock(memoTrack),
    block(
      `Whether any charge on this arrest ended in a misdemeanour or felony conviction: ${facts["case.any_conviction_on_this_arrest"]}`,
      "",
      "Article 976 reaches only an arrest that did not result in a conviction, which is why the answer above is printed rather than left as an election. A charge on this arrest that ended in a misdemeanour or felony conviction falls outside Article 976 and under Article 977 or Article 978 instead. If any charge on this arrest ended in a conviction, stop and get a lawyer's advice before filing anything.",
      ""
    ),
    block(
      "ARTICLE 976(B) - ARREST FOR OPERATING A VEHICLE WHILE INTOXICATED",
      `Whether this arrest was for operating a vehicle while intoxicated, or for a parish or municipal ordinance version of that offence: ${DOTS(10)}`,
      `Whether a pretrial diversion programme was entered on a vehicle-while-intoxicated arrest: ${DOTS(10)}`,
      "",
      "Article 976(B) bars expungement of an arrest for operating a vehicle while intoxicated, or a parish or municipal ordinance equivalent, where the person was placed in a pretrial diversion programme, until five years have elapsed from the date of arrest. If this arrest was for operating a vehicle while intoxicated in any form, stop and get a lawyer's advice before filing anything.",
      ""
    ),
    block(
      "WHO ELSE THE RECORD OF THIS ARREST NAMES",
      `Whether the record of this arrest names anyone besides the mover: ${DOTS(10)}`,
      "",
      "If the record of this arrest names anyone besides the mover, that is the Article 985 expungement-by-redaction question and Article 985 rather than Article 976 governs it. If the record names anyone besides the mover, stop and get a lawyer's advice before filing anything.",
      ""
    ),
    block(
      "ARTICLE 975 - CUSTODY BAR",
      `Whether the mover is now in the physical custody of the Department of Public Safety and Corrections serving a sentence at hard labour: ${facts["case.hard_labor_custody"]}`,
      "",
      "Article 975 bars a person in the physical custody of the Department of Public Safety and Corrections serving a sentence at hard labour from filing. If that answer is yes, this motion may not be filed. It is a bar that turns on custody status and lifts when that status changes, not a permanent bar to eligibility.",
      ""
    ),
    block(
      `Date the Louisiana criminal background check was ordered: ${facts["case.background_check_ordered_on"]}`,
      "",
      "The Article 989 form marks the Louisiana criminal background check required on its face, and the check has a sixty-day life. Order it so it is still inside that life on the day the motion is filed.",
      ""
    ),
    block(
      "PRAYER",
      "The mover prays that if there is no objection timely filed by the arresting law enforcement agency, the district attorney's office, or the Louisiana Bureau of Criminal Identification and Information, an order be issued herein ordering the expungement of the record of the arrest set forth above, including all photographs, fingerprints, disposition, or any other such information.",
      "",
      "If an Affidavit of No Opposition executed by each entity named herein is attached hereto and made a part hereof, the mover requests that no contradictory hearing be required and that the motion be granted ex parte, as the Article 991 Order provides.",
      ""
    ),
    block(
      "SIGNATURE BLOCKS",
      MOTION,
      "",
      "IF REPRESENTED BY COUNSEL - ATTORNEY BLOCK",
      `Attorney name in the represented-mover block: ${DOTS(28)}`,
      `Attorney bar roll number in the represented-mover block: ${DOTS(18)}`,
      `Attorney address in the represented-mover block: ${DOTS(25)}`,
      `Attorney telephone in the represented-mover block: ${DOTS(23)}`,
      `Attorney signature in the represented-mover block: ${DOTS(23)}`,
      "",
      "This block is left blank. An attorney block is completed by counsel, or not at all.",
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
      "Under Article 979 the clerk serves the motion on the district attorney of the parish of conviction, the Louisiana Bureau of Criminal Identification and Information and the arresting law enforcement agency, and files the certificate of service. The mover serves nobody.",
      ""
    )
  ];
}

function orderBody(facts) {
  return [
    captionBlock(facts, TITLES[COMPONENT.order], ORDER),
    block(
      "ORDER",
      "La. C.Cr.P. art. 991, on the statutory Article 991 form.",
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
      `Direction setting the sixty-day objection window and directing service: ${DOTS(10)}`,
      DOTS(74),
      "",
      "The Article 991 Order sets the objection window for the district attorney, the arresting law enforcement agency and the Louisiana Bureau of Criminal Identification and Information, and directs the clerk to serve. Each is the court's to write.",
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
    captionBlock(facts, TITLES[COMPONENT.expungementOrder], EXPUNGEMENT_ORDER),
    block(
      "ORDER OF EXPUNGEMENT OF ARREST RECORD",
      "La. C.Cr.P. art. 992, on the statutory Article 992 form.",
      "",
      "COURT USE ONLY - UNEXECUTED PROPOSED ORDER. The mover supplies the caption and the identifiers of the arrest, and nothing else on this page.",
      ""
    ),
    arrestBlock(facts),
    block(
      "Which Article 976(A) ground applies to each charge on this arrest:",
      DOTS(74), DOTS(74),
      "",
      "This line carries the mover's own answer forward onto the proposed order so the court has it in front of the decree. It is the mover's to complete before the motion is filed, and it is left blank here.",
      ""
    ),
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
      `Direction to serve the order and judgment after expungement is granted: ${DOTS(10)}`,
      "",
      "Under Article 982, if expungement is granted the clerk of court serves the order and judgment on the district attorney, the Louisiana Bureau of Criminal Identification and Information, the sheriff of the parish of conviction and the arresting law enforcement agency.",
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

/*
 * FIX146. THE COMMITTED FEE RULE, MINUS ITS ROUTING SENTENCE.
 *
 * registryTrack.rules.fees ends with "The exemption is very often available on
 * this track and must be screened before filing rather than after." Everything
 * before it is statute: the Article 983(A) cap, the non-refundability, and the
 * enumerated Article 983(F) grounds. That last sentence is not. "This track" is
 * this build's routing vocabulary, and the sentence is the record telling a
 * builder how often to expect the exemption -- printed, until now, on the face
 * of the form the participant hands to a district attorney's office.
 *
 * It is removed from the filed page and NOT from the packet: the guide prints
 * registryTrack.rules.fees whole, verbatim and labelled as internal record
 * text, and the participant instruction the sentence carries ("screen it before
 * filing rather than after") already reaches the participant in plain words at
 * the foot of the same page. The split is asserted rather than attempted: if
 * the record's wording changes, this build stops instead of quietly printing a
 * sentence it meant to withhold or silently dropping one it meant to print.
 */
export const TRACK_SENTENCE_IN_THE_FEE_RULE =
  "The exemption is very often available on this track and must be screened before filing rather than after.";

export function feeRuleWithoutTheTrackSentence(fees) {
  const text = String(fees ?? "");
  assert.ok(text.includes(TRACK_SENTENCE_IN_THE_FEE_RULE),
    "the committed fee rule no longer ends with the routing sentence this build withholds from the filed page; re-read the record before printing it");
  const kept = text.replace(TRACK_SENTENCE_IN_THE_FEE_RULE, "").replace(/\s+/g, " ").trim();
  assert.ok(!kept.includes("this track"),
    `the committed fee rule still carries routing vocabulary after the known sentence is removed: ${kept.slice(-160)}`);
  assert.match(kept, /Article 983\(A\) caps the total cost/,
    "the Article 983(A) cap is no longer at the head of the committed fee rule; the filed page prints it");
  assert.match(kept, /Article 983\(G\)\.$/,
    "the committed fee rule no longer ends on the Article 983(G) clause once the routing sentence is removed");
  return kept;
}

function feeExemptionBody(facts, binding) {
  /* Read and asserted rather than printed, on the same ground as the memo note
   * below: the component row's conditionDescription is a GENERATION condition,
   * written to tell a builder when to produce this component, and it used to be
   * quoted onto the face of this form. The row is still required to exist and
   * to state its condition -- the binding loader asserts its wording -- and the
   * condition still reaches the participant, in the guide's own words, in
   * participant-instructions.md. */
  const feeRow = binding.components.find((c) => c.componentId === COMPONENT.feeExemption);
  assert.ok(String(feeRow?.conditionDescription ?? "").trim().length > 0,
    "the committed record no longer states a condition for the fee-exemption component; the guide states it to the participant");
  /* Read and asserted rather than printed: the memo's own note for this
   * component is record commentary in build vocabulary ("Track A", "the track
   * is not composed") and is carried into the guide, not onto the face of a
   * form the participant hands to a district attorney. */
  const feeComponent = binding.memoTrack.components.find((c) => c.role === "fee_waiver");
  assert.ok(String(feeComponent?.notes ?? "").trim().length > 0,
    "the committed memo no longer carries a note for the fee-waiver component; the guide prints it");
  return [
    captionBlock(facts, TITLES[COMPONENT.feeExemption], FEE_EXEMPTION),
    block(
      "MOTION FOR FEE EXEMPTION",
      "La. C.Cr.P. arts. 983(F) and 988, on the statutory Article 988 form.",
      "",
      "The form's own instruction: To be completed by defendant and submitted to the District Attorney's Office prior to filing. Append completed form to Motion of Expungement at filing only if eligible.",
      ""
      /* REMOVED FROM THE FACE OF THIS FORM: a paragraph headed "Why this
       * component is in this packet", which recited this build's own generation
       * condition in quotation marks ("Generated wherever the participant may
       * qualify for the Article 983(F) exemption, which on this track is
       * common.") and then cited two internal build records by name -- "the
       * committed fee rule" and "the committed legal-design record".
       *
       * None of that is statute text or rule text. It is the builder's
       * justification for including the component, addressed to a reviewer, and
       * the quoted sentence is an instruction telling a BUILDER when to generate
       * a component. It was printed on a document the participant hands to a
       * district attorney's office before filing and appends to the motion at
       * filing. Article 986 provides that the statutory forms shall be used with
       * no local variant, and Article 986(C) lets a clerk alter the form only to
       * show the name of the court -- which this packet prints on its own page 1
       * and then argued against here.
       *
       * This is the DEFECTS_NO_COUNTER_CAN_SEE class
       * internal-record-text-printed-on-a-filing: present, non-empty, inside its
       * write box and accurately quoted, so every counter passes it. The comment
       * eight lines above already states the rule -- record commentary in build
       * vocabulary belongs in the guide, not on the face of a form the
       * participant hands to a district attorney -- and this block was the one
       * place that broke it.
       *
       * Nothing is lost to the participant. participant-instructions.md already
       * carries the reason and the condition in the guide's own words: "The
       * Article 988 Motion for Fee Exemption is conditional on the record and is
       * generated here because the condition the record states is met on this
       * track: the record says the Article 983(F) exemption is common on this
       * track and must be screened before filing rather than after." The
       * condition also remains in the build reports. What stays on the form is
       * what belongs on it: the statutory citation and the form's own printed
       * instruction. */
    ),
    block(
      "PARTICIPANT-COMPLETED IDENTIFYING FIELDS",
      `Mover full legal name: ${facts["participant.full_legal_name"]}`,
      `Mover date of birth: ${facts["participant.date_of_birth"]}`,
      `Last four digits of the Social Security number: ${DOTS(24)}`,
      `Date of arrest as it appears on the state rap sheet: ${facts["case.arrest_date"]}`,
      `Docket or case number: ${facts["case.docket_number"]}`,
      "Original arrest charge and statute for every count as they appear on the state rap sheet:",
      DOTS(74), DOTS(74),
      "",
      "The two blank lines above are the mover's own. Write them the same way they are written on the Article 989 motion, so the two documents match.",
      ""
    ),
    block(
      "FOR THE DISTRICT ATTORNEY - CERTIFICATION SECTION, LEAVE BLANK",
      `Certification that the mover has no felony convictions, completed by the district attorney: ${DOTS(10)}`,
      `Certification that no felony charge is pending under a bill of information or indictment, completed by the district attorney: ${DOTS(10)}`,
      `Certification of the Article 983(F) non-conviction ground relied on, completed by the district attorney: ${DOTS(10)}`,
      `Signature of the district attorney or designee on the fee exemption: ${DOTS(10)}`,
      `Date of the district attorney's signature: ${DOTS(28)}`,
      "",
      "Every certification box and the signature on this form belong to the district attorney or a designee, who returns the form within fifteen days. Nothing in this section is the mover's to complete, and every line of it is left blank here.",
      ""
    ),
    block(
      "WHAT ARTICLE 983(F) REQUIRES TO BE CERTIFIED",
      feeRuleWithoutTheTrackSentence(binding.registryTrack.rules.fees),
      "",
      /* FIX146. The record's value was printed with no lead-in, so this
       * paragraph opened on a filed page as the headless fragment "Article
       * 983(F), claimed through the Article 988 Motion for Fee Exemption." The
       * heading states nothing the paragraph does not; it restores the lead-in
       * the record field's own name carried and the page had dropped. */
      "HOW THE EXEMPTION IS CLAIMED",
      binding.registryTrack.rules.feeWaiver,
      ""
    ),
    block(
      "SIGNATURE",
      `Signature of the mover on the fee exemption: ${DOTS(24)}`,
      `Date of the mover's signature on the fee exemption: ${DOTS(20)}`,
      `Printed name: ${facts["participant.full_legal_name"]}`,
      "",
      "Take or send this form to the district attorney's office BEFORE the Article 989 motion is filed. It comes back within fifteen days. Append it to the motion at filing only if you are found eligible; filing without it means paying the fee, and Article 983 makes the fee non-refundable even if the motion is denied.",
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
 * a shorter list: a registry that lists nine stop conditions and a packet that
 * paraphrases three is a defect, so every loop below carries all of them and the
 * count is printed beside them so a reader can check the carriage was complete.
 */
function participantInstructions(binding, rbf, name) {
  const { registryTrack, memoTrack, packetSet, components, queueFamily } = binding;
  const rules = registryTrack.rules ?? {};
  const actions = registryTrack.packetSet?.participantActionRequired ?? [];
  const stops = memoTrack.selfHelpStopConditions ?? [];
  const notGenerated = components.filter((c) => !RENDERED_COMPONENTS.includes(c.componentId));
  const requiredGuidance = memoTrack.components.find((c) => c.role === "instructions" && c.requirement === "required");
  const continuation = memoTrack.components.find((c) => c.role === "continuation");
  const recordRequiredBeforeFiling = packetSet.requiredBeforeFiling ?? [];

  /*
   * A RECORD LINE THAT DESCRIBES A DOCUMENT THIS PACKET DOES NOT CONTAIN IS
   * CARRIED WHOLE AND THEN RECONCILED, NEVER TRIMMED.
   *
   * A neighbouring family printed the record's line "The packet gives you the
   * Article 988 form with your own fields filled in" while not generating the
   * component, and an independent lane recorded it as a false statement about
   * the packet with the Article 983(A) non-refundable cap behind it. This build
   * generates the Article 988 component, so that line is true here. The
   * reconciliation still runs, generated by matching the record's own claim
   * against the components this build actually rendered, so the next component
   * that stops being generated is reconciled by the same code rather than by
   * the next verifier.
   */
  const notGeneratedFormsByArticle = new Map();
  for (const row of notGenerated) {
    const article = /ART-(\d+)/.exec(row.officialFormId ?? "")?.[1];
    if (article) notGeneratedFormsByArticle.set(article, row);
  }
  const reconcileNotGeneratedFormClaim = (text) => {
    const claimed = [...String(text).matchAll(/packet gives you the Article (\d+) form/gi)].map((m) => m[1]);
    const corrections = [];
    for (const article of new Set(claimed)) {
      const row = notGeneratedFormsByArticle.get(article);
      if (!row) continue;
      corrections.push(
        `**This packet does not give you the Article ${article} form.** \`${row.componentId}\` is ${row.requirement} on the record, and the condition the record states is "${row.conditionDescription}" - a condition this packet does not meet, so the component is not generated and no Article ${article} form is enclosed. Where that condition applies to you, ask the clerk of court or the district attorney's office for the Article ${article} form.`
      );
    }
    return corrections;
  };

  const lines = [
    `# ${registryTrack.legalName}`,
    "",
    `Prepared for **${name}**. Packet set \`${FAMILY_ID}\`, version ${packetSet.version}.`,
    "",
    `This packet set serves ${queueFamily.routeKeys.length} route(s):`,
    "",
    ...queueFamily.routeKeys.map((key) => bullet(`\`${key}\``)),
    "",
    `## The article this packet proceeds under`,
    "",
    "Louisiana runs separate expungement tracks off separate articles, and they are not interchangeable. This packet is the **Article 976** track: a record of ARREST that did not result in a conviction. A misdemeanour conviction is Article 977, a first offence possession of marijuana is Article 977(D) on the Article 998 form, a felony conviction is Article 978, a record that names more than one person is Article 985 redaction, and a felony arrest that ended in a misdemeanour conviction is the Article 985.1 interim expungement. If any charge on your arrest ended in a conviction, this is the wrong packet.",
    "",
    registryTrack.mechanism,
    "",
    `The committed record lists ${(registryTrack.authority ?? []).length} authorities for this track:`,
    "",
    ...(registryTrack.authority ?? []).map((cite) => bullet(cite)),
    "",
    "## What is in this packet",
    ""
  ];
  for (const componentId of RENDERED_COMPONENTS) {
    const row = components.find((c) => c.componentId === componentId);
    lines.push(bullet(`\`${componentId}\` - ${TITLES[componentId]} (${row.role}, ${row.requirement}).`));
  }
  lines.push(
    "",
    "The Article 988 Motion for Fee Exemption is conditional on the record and is generated here because the condition the record states is met on this track: the record says the Article 983(F) exemption is common on this track and must be screened before filing rather than after. Your own identifying fields are filled in on it. Every certification box and the district attorney's signature are left blank, because the form's own instruction assigns them to the district attorney.",
    "",
    "## What is not generated, and the condition the record states",
    ""
  );
  for (const row of notGenerated) {
    lines.push(bullet(`\`${row.componentId}\` (${row.role}${row.officialFormId ? `, ${row.officialFormId}` : ""}): ${row.conditionDescription} This packet does not meet that condition, so the component is not generated.`));
  }
  lines.push(
    "",
    "The Article 993 supplemental sheet is a statutory form for which the committed legal-design record states that no template exists, none is counsel-approved and no implementation is authorized, and it is not in this family's authority grant. Where your arrest carries more charges or counts than the Article 989 motion holds, ask the clerk of court for the Article 993 supplemental sheet rather than adding pages of your own; Article 986(B) permits a supplemental form only so far as it adheres to the statutory form.",
    "",
    "## Internal record text: what the record says, and why it is here rather than on the filing",
    "",
    "The four documents you file - the Article 989 motion, the Article 991 order, the Article 992 order and the Article 988 fee-exemption motion - recite statute text, rule text and your own answers, and nothing else. This build's own identifiers and the committed record's own words are internal record text. They are set out here instead, in full, so that the pages a clerk stamps, a judge signs and a district attorney certifies carry only what the Legislature put on them. Nothing in this section has been shortened, and nothing that used to be on a filed page has been dropped from the packet.",
    "",
    bullet(`**Component identities.** The Article 989 motion is \`${COMPONENT.motion}\`, the Article 991 order is \`${COMPONENT.order}\`, the Article 992 order is \`${COMPONENT.expungementOrder}\`, the Article 988 fee-exemption motion is \`${COMPONENT.feeExemption}\` and these instructions are \`${COMPONENT.guide}\`. Those are this factory's own identifiers for the five documents. They used to be printed in the caption of each of the four filed documents and again on the motion's signature-block page; they are printed on no filed page now.`),
    bullet("**Where the four statutory form texts come from.** All four are composed from the committed LA-STATUTORY-FORMS authority. Each filed document now cites only its own Article."),
    bullet("**Race and gender on the Article 989 motion.** The committed manual-completion record classifies both as manual completion items pending a data-protection review. That is why the packet prints them blank and the motion says only that you write them by hand."),
    bullet("**The Article 976(A) ground line.** The route this packet was built for fixes the ARTICLE, not the GROUND: the packet elects no Article 976(A) ground for you, because which ground a charge ended on is a legal conclusion you own. The motion now states the instruction and its reason without quoting the record."),
    bullet("**Why the conviction answer is printed rather than left blank.** This packet is built for one statutory route and states it on the form rather than leaving it as a blank election. The committed record puts any charge on the arrest that ended in a misdemeanour or felony conviction outside Article 976 and inside Article 977 or Article 978, so a conviction on this arrest means this is the wrong packet for it."),
    bullet("**The three self-help stops printed on the motion.** A vehicle-while-intoxicated arrest in any form, a record of this arrest that names anyone besides you, and a charge on this arrest that ended in a conviction are each conditions on which the committed record says self-help stops. The motion now tells you to stop and get a lawyer's advice, which is what each condition means for you."),
    bullet("**The Article 975 custody bar.** The committed record records it as a status bar that lifts when custody status changes rather than a permanent eligibility bar. The motion now says the same thing in its own words."),
    bullet("**The sixty-day life of the background check.** The sixty-day life is the committed record's, not the Article 989 form's. The form marks the check required on its face; the motion now states the sixty-day life without attributing it to the record."),
    bullet("**The attorney block on the motion.** This packet holds no record that you are represented by counsel, which is why the block is blank. The motion now says only that counsel completes it or nobody does."),
    bullet("**The Article 976(A) ground line carried onto the Article 992 order.** This packet writes none of it. The order now says only that it is yours to complete before the motion is filed and that it is left blank."),
    bullet("**The identifying-field split on the Article 988 fee-exemption motion.** The committed manual-completion record fixes it: LegalEase completes only the participant-owned identifying fields on that form. That sentence used to be printed on the form itself, which put both the record's vocabulary and the vendor's name on a page you hand to a district attorney. The form now says only that the two blank lines are yours and how to write them."),
    bullet("**The district attorney's certification section.** Nothing in it is written by this packet. The form now says only that nothing in that section is yours to complete and that every line of it is left blank."),
    bullet(`**The committed fee rule, in full.** The filed Article 988 page prints this rule without its last sentence, because that sentence is written in this build's routing vocabulary. Here it is whole, as the record holds it: "${registryTrack.rules.fees}"`),
    bullet(`**The committed fee-exemption rule, in full.** "${registryTrack.rules.feeWaiver}"`),
    "",
    `## Everything the committed record requires to be in place before filing (all ${recordRequiredBeforeFiling.length} item(s) it lists)`,
    "",
    "This list is the packet set's own. Some items are yours, some belong to the district attorney, the clerk or the judge. Every one of them is reproduced here, in the record's own words and in the record's own order, so that nothing on it reaches you shortened.",
    ""
  );
  recordRequiredBeforeFiling.forEach((item, index) => {
    lines.push(bullet(`Item ${index + 1} of ${recordRequiredBeforeFiling.length}: ${item}`));
    for (const correction of reconcileNotGeneratedFormClaim(item)) lines.push(`  - ${correction}`);
  });

  lines.push(
    "",
    "## What you must supply before filing",
    "",
    "Check every prefilled fact against your own court record and your background check, and correct the packet where they disagree. The blanks below are deliberately empty and are yours to complete.",
    "",
    "| Document | Blank on the document | What you must supply |",
    "| --- | --- | --- |"
  );
  for (const item of rbf) lines.push(`| ${item.document} | ${item.disclosureLabel} | ${item.participantMustSupply} |`);

  lines.push(
    "",
    "The two blanks on that list the record singles out are the original arrest charge and the Article 976(A) ground. Louisiana State Police names both among the common fatal errors on a Louisiana expungement: using the amended charge instead of the original arrest charge, omitting counts, and choosing the wrong eligibility basis. Neither is guessed by this packet and neither should be guessed by you: take them from the minute entry, the bill of information and your own rap sheet.",
    "",
    `## What you must obtain or confirm before filing (${actions.length} item(s) held by the committed track registry)`,
    ""
  );
  for (const action of actions) {
    const qualifier = action.requirement === "conditional" && action.conditionDescription ? ` Condition: ${action.conditionDescription}` : "";
    const from = action.obtainedFrom ? ` Obtained from: ${action.obtainedFrom}.` : "";
    lines.push(bullet(`**${action.kind}** (${action.requirement}${action.requiredBeforeFiling ? ", required before filing" : ""}): ${action.description}${from}${qualifier}`));
    for (const correction of reconcileNotGeneratedFormClaim(`${action.description} ${action.howToObtain ?? ""}`)) lines.push(`  - ${correction}`);
  }

  lines.push(
    "",
    `## The Article 976(A) grounds, in the record's own classification vocabulary (all ${(memoTrack.eligibleDispositions ?? []).length} of them)`,
    "",
    "These are the eligible dispositions the committed record lists for this Article. They are the record's own internal vocabulary rather than words to copy onto the motion: write the ground on the motion the way your own minute entry and the district attorney's certification put it.",
    ""
  );
  (memoTrack.eligibleDispositions ?? []).forEach((ground, index) => {
    lines.push(bullet(`Ground ${index + 1} of ${(memoTrack.eligibleDispositions ?? []).length}: \`${ground}\``));
  });

  const feeComponentNote = memoTrack.components.find((c) => c.role === "fee_waiver");
  lines.push(
    "",
    "## What the committed record says about the Article 988 fee exemption in this packet",
    "",
    feeComponentNote.notes,
    ""
  );

  lines.push("", `## The documents the record says you obtain and attach (${(memoTrack.supportingDocuments ?? []).length} item(s))`, "");
  for (const doc of memoTrack.supportingDocuments ?? []) {
    lines.push(bullet(`**${doc.name}** (${doc.requirement}${doc.requiredBeforeFiling ? ", required before filing" : ""}). From: ${doc.obtainedFrom}. ${doc.conditionDescription ? `Condition: ${doc.conditionDescription} ` : ""}${doc.howToObtain}`));
    for (const correction of reconcileNotGeneratedFormClaim(`${doc.name} ${doc.howToObtain ?? ""}`)) lines.push(`  - ${correction}`);
  }

  lines.push(
    "", "## Where this is filed", "",
    bullet(`Venue: ${registryTrack.venue}`),
    bullet(`Destination (${registryTrack.destination.kind}): ${registryTrack.destination.name}`),
    bullet(registryTrack.destination.detail),
    "", "## What it costs, and the fee exemption", "",
    bullet(`Fees: ${rules.fees}`),
    bullet(`Fee waiver: ${rules.feeWaiver}`),
    "", "## Notice, objection and service", "",
    bullet(`Notice and objection: ${rules.notice}`),
    bullet(`Service: ${rules.service}`),
    "", "## Signing", "",
    bullet(`Signature: ${rules.participantSignature}`),
    bullet(`Notarization: ${rules.notarization}`),
    "", `## Fields deliberately left blank (all ${(memoTrack.manualCompletionItems ?? []).length} manual-completion item(s) the record holds)`, ""
  );
  (memoTrack.manualCompletionItems ?? []).forEach((item, index) => {
    lines.push(bullet(`Item ${index + 1} of ${(memoTrack.manualCompletionItems ?? []).length}: ${item.item}. Where: ${item.whereInPacket}. Why: ${item.why}`));
  });
  lines.push(
    "",
    bullet("Sign and date the unrepresented-mover block yourself, after reading the completed motion. If you are represented, give the packet to your attorney; the attorney block belongs to counsel and is left blank here."),
    bullet("Leave every ordering paragraph, finding, granted-or-denied election, return date, date, place and judge's signature on the Article 991 Order and the Article 992 Order of Expungement blank. Those are the court's."),
    bullet("Leave every certification box and the signature on the Article 988 Motion for Fee Exemption blank. Those belong to the district attorney or a designee."),
    bullet("Leave the clerk's filed-on stamp and the clerk's certificate of service blank. Article 979 makes service the clerk's act."),
    bullet("The Article 990 Affidavit of Response is the responding entity's own instrument. It is not printed in this packet and you never complete it."),
    "", `## Stop self-help and get legal help (all ${stops.length} stop conditions the record holds)`, ""
  );
  stops.forEach((stop, index) => lines.push(bullet(`Stop ${index + 1} of ${stops.length}: ${stop}`)));

  lines.push("", `## Hard eligibility boundaries the record states (${(memoTrack.exclusions ?? []).length} exclusion(s))`, "");
  for (const exclusion of memoTrack.exclusions ?? []) lines.push(bullet(exclusion));
  lines.push("", `Waiting periods (${(memoTrack.waitingPeriods ?? []).length}):`, "");
  for (const period of memoTrack.waitingPeriods ?? []) lines.push(bullet(`${period.condition}: ${period.duration}`));

  lines.push("", "## What the committed record requires these instructions to carry", "", requiredGuidance.notes, "");
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
  const guidance = binding.memoTrack.components.find((c) => c.role === "instructions" && c.requirement === "required");
  return [
    `# Filing instructions - ${registryTrack.legalName}`,
    "",
    `Prepared for **${name}**.`,
    "",
    bullet(`Filing: ${rules.filing}`),
    bullet(`Where: ${registryTrack.destination.name}. ${registryTrack.destination.detail}`),
    bullet(`Venue: ${registryTrack.venue}`),
    bullet(`What the registry says about filing: ${fileAction ? fileAction.description : "the committed record holds no filing action for this track."}`),
    bullet(`What it costs: ${feeAction ? feeAction.description : "the committed record holds no fee action for this track."}`),
    bullet(`Fee exemption: ${waiverAction ? waiverAction.description : "the committed record holds no fee-exemption action for this track."}`),
    bullet(`Service: ${serveAction ? serveAction.description : "the committed record holds no service action for this track."}`),
    "",
    "## The order of operations the committed record fixes",
    "",
    guidance.notes,
    "",
    `Packet set: ${FAMILY_ID}`,
    ""
  ].join("\n");
}

/**
 * Guidance becomes one atomic block per item, and a heading rides with the item
 * beneath it, so a heading can never be left alone at the foot of a page.
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
/*
 * FIX146, matching FIX142 on the sibling family la-985-1.
 *
 * The wrap measured against MAX_WIDTH exactly, and `widthOfTextAtSize` on a
 * standard-14 font sums AFM ADVANCE widths -- not the extent of the ink the
 * renderer lays down. Measured on this family's own delivered bytes at 300 dpi
 * with pdftoppm -gray (PGM, annotations not hidden, ink threshold gray<200),
 * rendered ink reached 553.92pt on ten of twenty-four pages against a text box
 * whose right edge is MARGIN + MAX_WIDTH = 552pt, worst overhang 1.92pt.
 *
 * Nothing was clipped and nothing overlapped -- the overhang was inside the
 * paper by 58pt and touched no other ink -- so this is a build-integrity
 * defect, not a visual one: the build was asserting a box it was not holding,
 * and a line that measures within 0.13pt of the wrap width crosses it. Lines
 * are now wrapped against a slightly narrower width so the RENDERED ink stays
 * inside the declared box.
 *
 * The assertion below still checks MAX_WIDTH and is NOT a proof about ink: it
 * measures the same advance sum the wrap does, so wrapping narrower makes it
 * pass by construction. The proof that the ink is inside the box is the
 * measurement on the delivered bytes, recorded in this lane's return.
 */
const WRAP_SAFETY = 8;
const WRAP_WIDTH = MAX_WIDTH - WRAP_SAFETY;

/**
 * Blocks are atomic: measured before anything is drawn, moved whole when they
 * will not fit, and a block that cannot fit on an empty page stops the build
 * rather than being split quietly.
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
  const splitToken = (token) => {
    const pieces = String(token).split(/(?<=[:/.\-_])/);
    const chunks = [];
    let current = "";
    for (const piece of pieces) {
      const candidate = `${current}${piece}`;
      if (current && font.widthOfTextAtSize(candidate, FONT_SIZE) > WRAP_WIDTH) { chunks.push(current); current = piece; }
      else current = candidate;
    }
    if (current) chunks.push(current);
    const out = [];
    for (const chunk of chunks) {
      if (font.widthOfTextAtSize(chunk, FONT_SIZE) <= WRAP_WIDTH) { out.push(chunk); continue; }
      hardSplits += 1;
      let acc = "";
      for (const char of chunk) {
        const candidate = `${acc}${char}`;
        if (acc && font.widthOfTextAtSize(candidate, FONT_SIZE) > WRAP_WIDTH) { out.push(acc); acc = char; }
        else acc = candidate;
      }
      if (acc) out.push(acc);
    }
    return out;
  };
  const wrap = (raw) => {
    if (!raw) return [""];
    const words = String(raw).split(/\s+/)
      .flatMap((word) => font.widthOfTextAtSize(word, FONT_SIZE) > WRAP_WIDTH ? splitToken(word) : [word]);
    const rows = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, FONT_SIZE) <= WRAP_WIDTH) current = candidate;
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
    `held source bytes are absent by content digest across the mounted corpus: ${sources.absent.map((s) => `${s.sourceId} sha256=${s.sha256}`).join("; ")}`);

  const maps = [motionMap(), orderMap(), expungementOrderMap(), feeExemptionMap(), guideMap()];
  const rbf = requiredBeforeFilingFields(maps);

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      implementationStrategy: STRATEGY, custodyClass: CUSTODY_CLASS,
      authorityGrant: binding.ownerFamily.composedFromAuthority,
      componentsAuthoritative: binding.components.length,
      componentsRendered: RENDERED_COMPONENTS.length,
      heldSourcesResolvedByContentDigest: sources.resolved.length,
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
      { componentId: COMPONENT.motion, documentId: MOTION, blocks: motionBody(facts, binding) },
      { componentId: COMPONENT.order, documentId: ORDER, blocks: orderBody(facts) },
      { componentId: COMPONENT.expungementOrder, documentId: EXPUNGEMENT_ORDER, blocks: expungementOrderBody(facts) },
      { componentId: COMPONENT.feeExemption, documentId: FEE_EXEMPTION, blocks: feeExemptionBody(facts, binding) },
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
      documents: [MOTION, ORDER, EXPUNGEMENT_ORDER, FEE_EXEMPTION, GUIDE]
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
      whyNotGenerated: "the stated condition is a count that exceeds the Article 989 motion's own fields, and neither fixture establishes it; independently, Article 993 is not in this family's composedFromAuthority grant and the committed legal-design note states in terms that no template exists, none is counsel-approved and no implementation is authorized. The instructions tell a participant with more counts than the motion holds to ask the clerk for the statutory sheet."
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
    controllingArticle: "La. C.Cr.P. art. 976",
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
    conditionalComponentGenerated: {
      componentId: COMPONENT.feeExemption,
      officialFormId: FEE_EXEMPTION,
      conditionTheRecordStates: binding.components.find((c) => c.componentId === COMPONENT.feeExemption).conditionDescription,
      whyTheConditionIsMetOnThisTrack: "the Article 983(F) grounds are non-conviction grounds and this is the non-conviction track; the committed fee rule states the exemption is very often available on this track and must be screened before filing rather than after; the committed legal-design limitation directs that every participant on this track is routed through Article 988 before filing; and item 2 of the packet set's own required-before-filing list tells the participant the packet gives them the Article 988 form with their own fields filled in.",
      whatIsWrittenOnIt: "only the participant-owned identifying fields the committed manual-completion record names, of which the platform holds the mover's name, date of birth, date of arrest and docket number; the last four digits of the Social Security number and the original arrest charge are the participant's and print blank.",
      whatIsNotWrittenOnIt: "every certification box and the district attorney's signature, which the form's own instruction assigns to the district attorney or a designee."
    },
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
    allSourcesExactNote: "every declared digest was resolved by content digest across the mounted corpus and re-hashed from the resolved bytes",
    resolutionRule: "sources are resolved by SHA-256 across the mounted corpus and never by declared path; the declared path is recorded as the thing that was declared",
    priorCustodyClassOnTheQueueRow: binding.queueFamily.sourceReadiness?.custodyClass ?? null,
    priorCustodyClassContradicted: "the queue row's nested sourceReadiness.custodyClass reads SOURCE_IDENTITY_UNRESOLVED while its own top-level sourceStatus reads SOURCE_BOUND_BY_HELD_BYTES. This build resolved both declared digests byte-exact and re-hashed each from its resolved bytes, so the nested class is wrong and is recorded here rather than reconciled by this lane. MASTER_QUEUE.json is generated centrally and was not modified.",
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
      "that this participant's arrest ended on any of the Article 976(A) grounds, which is the mover's own averment and is left blank",
      "that no charge on this arrest resulted in a conviction beyond the route this packet was built for",
      "that the arrest was not for operating a vehicle while intoxicated, which Article 976(B) turns on and which is left blank",
      "that the district attorney will certify the Article 983(F) fee exemption",
      "that any commercial route is open"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    trackId: TRACK_ID,
    jurisdiction: JURISDICTION,
    routeKeys: binding.queueFamily.routeKeys,
    statute: "La. C.Cr.P. art. 976",
    legalName: binding.registryTrack.legalName,
    implementationStrategy: STRATEGY,
    renderStrategy: "codified_statutory_forms_composed_from_the_committed_authority",
    sourceAuthority: OWNER_DECISION,
    componentSet: RENDERED_COMPONENTS,
    pageOrder: RENDERED_COMPONENTS,
    componentsNotGenerated: notGenerated,
    routeSelectionNote: "This packet is built for exactly one route: expungement of a record of ARREST that did not result in a conviction, under La. C.Cr.P. art. 976. The route is stated on the face of the motion, in its title, in its recitals and in its prayer, and again on the proposed Article 992 order, rather than left as a blank election. What is NOT stated by the packet is which of the Article 976(A) grounds the mover proceeds on: the route fixes the article and the case fixes the ground, so that election is declared determinedByTheCaseNotTheRoute with the reason recorded, left blank, and disclosed in the guide's supply table with the Louisiana State Police common-fatal-error warning beside it.",
    routeSelectionsMade: [{
      option: "ARTICLE_976_ARREST_THAT_DID_NOT_RESULT_IN_A_CONVICTION",
      authority: "La. C.Cr.P. art. 976, on the Article 989 statutory motion with the Article 991 and Article 992 statutory orders",
      statedOnTheFaceOfThePacket: "the motion is titled, recited and prayed as a motion to expunge a record of arrest that did not result in a conviction under Article 976; the Article 992 proposed order carries the same identification of the arrest",
      routeDetermined: true
    }],
    electionsLeftToTheParticipantAndWhy: [{
      field: `${MOTION}.eligibility_ground`,
      option: "WHICH_ARTICLE_976A_GROUND",
      determinedByTheCaseNotTheRoute: true,
      whyTheRouteCannotDetermineIt: "Article 976(A) lists seven separate grounds and which one a charge ended on is a fact of the case established by the minute entry and the district attorney's certification, not by the route. The committed component note states that the Part II eligibility selection is a legal conclusion the participant owns and that Louisiana State Police names choosing the wrong eligibility basis as a common fatal error."
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
    documentSet: [MOTION, ORDER, EXPUNGEMENT_ORDER, FEE_EXEMPTION, GUIDE],
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

  writeJson(`${OUT}/reports/caption-evidence.json`, {
    schemaVersion: "rcap-caption-evidence/v1",
    familyId: FAMILY_ID,
    question: "Is the caption, the controlling authority, the eligibility recital and the prayer on this packet this family's own, or a sibling's?",
    whyItIsAsked: "Louisiana runs six expungement tracks off six articles that share the Article 989/991/992 instruments and a caption shape. A shared caption template would put a conviction recital on an arrest motion.",
    controllingArticle: "La. C.Cr.P. art. 976",
    legalNameFromTheRecord: binding.registryTrack.legalName,
    assertedAtBuildTime: [
      "registryTrack.legalName matches /art\\. 976/i",
      "memoTrack.controllingAuthority.summary matches /Article 976\\(A\\)/",
      "memoTrack.controllingAuthority.citations[0] === 'La. C.Cr.P. art. 976'"
    ],
    captionFieldsWrittenOnEveryFilingDocument: CAPTION_WRITES(MOTION).map((row) => ({ id: row.field.split(".").pop(), label: row.effectiveLabel, factId: row.factId })),
    documentsCarryingTheCaption: [MOTION, ORDER, EXPUNGEMENT_ORDER, FEE_EXEMPTION],
    articleSpecificText: {
      motionTitle: "MOTION FOR EXPUNGEMENT OF A RECORD OF ARREST THAT DID NOT RESULT IN A CONVICTION",
      eligibilityRecital: "the Article 976(A) grounds as the committed memo states them, printed in full with the count beside them, plus the Article 976(B) five-year vehicle-while-intoxicated bar and the Article 975 hard-labour custody bar",
      prayer: "an order expunging the record of the ARREST, with an ex parte grant requested where an Affidavit of No Opposition executed by each named entity is attached",
      whatIsNotOnThisPacket: "no conviction recital, no set-aside-and-dismiss language, no redaction paragraph and no interim-expungement decree; those belong to Articles 977, 977(D), 978, 985, 985.1 and 987 respectively"
    },
    siblingFamiliesThisPacketMustNotResemble: [
      "la-977-misdemeanor-conviction-set", "la-977d-marijuana-first-offense-set", "la-978-felony-conviction-set",
      "la-985-expungement-by-redaction-set", "la-985-1-interim-expungement-set", "la-987-set-aside-and-dismiss-set"
    ]
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
        finding: "This family was recorded SOURCE_IDENTITY_UNRESOLVED on the nested sourceReadiness.custodyClass of its own queue row, while the same row's top-level sourceStatus read SOURCE_BOUND_BY_HELD_BYTES and sourceBound true. It was held out of the build queue for that nested class.",
        treatment: `Both declared digests resolved by content digest across ${sources.mounted.length} mounted custody root(s) and were re-hashed from the resolved bytes. ${sources.resolved.filter((r) => r.declaredCustodyMounted).length} of ${sources.resolved.length} resolved at the DECLARED path itself, in the declared custody, carrying the declared digest. The nested class is contradicted by measurement and is recorded in source-receipt.json rather than reconciled by this lane; MASTER_QUEUE.json is generated centrally and was not modified.`
      },
      {
        finding: "The custody that holds the declared paths lives under private/, which is gitignored and therefore is not a git path at all.",
        treatment: "Its absence from a sparse worktree is a resolver artefact and never evidence that a source is missing, so this build resolves by content digest across every custody root that IS mounted and records, per source, whether the declared path was among them. A digest that resolves nowhere stops the build and is named with its sourceId; no similarly named file, revision or locator page is ever substituted."
      },
      {
        finding: "The two bound sources are Article 990 and Article 993. Neither is an instrument this packet renders.",
        treatment: "Both are carried as authority references bound by digest. Article 990 is the responding entity's own affidavit of response and is never printed in a participant packet; Article 993 is the withheld continuation sheet. The receipt records roleInThisPacket for each rather than implying either was rendered."
      },
      {
        finding: "No binary exists for the Article 988, 989, 991 or 992 statutory forms this packet renders; the committed memo records that Edition 1.1 retains the Louisiana statutory text only for Articles 990, 993, 995, 998 and 999.1.",
        treatment: "The LA-STATUTORY-FORMS owner determination grants this family composition from authority of exactly Articles 988, 989, 991 and 992 and lists nothing as remaining official and held. The grant is read back at build time and asserted element by element, and the corresponding release-blocking open question is carried verbatim into the participant instructions and into approval-request.json."
      },
      {
        finding: "The Article 988 fee-exemption component is conditional, and on this track the condition is met.",
        treatment: "It is GENERATED. The record's condition reads that the exemption is common on this track; the committed fee rule says it is very often available here and must be screened before filing rather than after; the Article 983(F) grounds are non-conviction grounds and this is the non-conviction track; and item 2 of the packet set's own required-before-filing list tells the participant the packet gives them the Article 988 form with their own fields filled in. Only the participant-owned identifying fields the committed manual-completion record names are written. Every certification box and the district attorney's signature are left blank and classified prosecutor-owned. A neighbouring Louisiana family printed that same record sentence while not generating the component and an independent lane recorded it as a false statement about the packet; the reconciliation code that would correct such a claim is still present and still runs."
      },
      {
        finding: "The Article 993 continuation component is conditional, its condition is unmet, and two further reasons withhold it.",
        treatment: "It is not composed. Article 993 is not in this family's composedFromAuthority grant, and the committed legal-design note states in terms that no template exists, none is counsel-approved and no implementation is authorized. It is recorded as not generated with the record's own condition text in packet-set-manifest.json and production-field-map.json, and the instructions send a participant with more counts than the motion holds to the clerk for the statutory sheet rather than to pages of their own."
      },
      {
        finding: "Which of the Article 976(A) grounds the mover proceeds on is the one election on this packet that most looks like the packet's to make.",
        treatment: "It is left blank, declared determinedByTheCaseNotTheRoute with the reason recorded in the field map, printed as an empty line on the motion and again on the proposed Article 992 order, and disclosed in the guide's supply table. The route fixes the ARTICLE; the case fixes the GROUND, which is established by the minute entry and the district attorney's certification. The committed component note states that the Part II eligibility selection is a legal conclusion the participant owns and that Louisiana State Police names choosing the wrong eligibility basis as a common fatal error."
      },
      {
        finding: "Six required participant inputs are facts the platform does not hold: the original arrest charges, the eligibility ground, whether the arrest was vehicle-while-intoxicated, whether a pretrial diversion programme was entered on such an arrest, whether the record names anyone besides the mover, and the rap-sheet identifiers.",
        treatment: "Not one of them is written. Each is declared REQUIRED_BEFORE_FILING, prints as an empty dot leader, and is named verbatim in the guide's supply table with what to write and why the packet holds no value. A restatement of a field's own printed question is not an answer and none is written here."
      },
      {
        finding: "Race and gender are fields the Article 989 statutory form provides.",
        treatment: "Both are printed blank. The committed manual-completion record classifies each as a manual completion item pending a data-protection review, and that reason is printed on the motion beside them and carried into the guide. The platform holds no Social Security number and writes none."
      },
      {
        finding: "Every ordering paragraph, finding, election, date, place and judicial signature on the Article 991 and Article 992 orders belongs to the court, and every certification on the Article 988 belongs to the district attorney.",
        treatment: "Each is classified court-, clerk- or prosecutor-owned, the proposed orders are visibly unexecuted, and no court, prosecutor or signature field carries ink."
      },
      {
        finding: `The memo holds ${(binding.memoTrack.selfHelpStopConditions ?? []).length} self-help stop conditions, ${(binding.memoTrack.exclusions ?? []).length} exclusions, ${(binding.memoTrack.waitingPeriods ?? []).length} waiting periods, ${(binding.memoTrack.manualCompletionItems ?? []).length} manual-completion items and ${(binding.memoTrack.supportingDocuments ?? []).length} supporting documents for this track, and the registry holds ${(binding.registryTrack.packetSet?.participantActionRequired ?? []).length} participant actions and ${(binding.packetSet.requiredBeforeFiling ?? []).length} required-before-filing items.`,
        treatment: "Every one is carried verbatim and numbered in participant-instructions.md, with the count printed beside it so short carriage is visible to the participant rather than only to a report."
      },
      {
        finding: "Louisiana runs six expungement tracks off six articles that share the Article 989, 991 and 992 instruments and a caption shape.",
        treatment: "reports/caption-evidence.json records what on this packet is Article 976's own - the title, the eligibility recital, the bars and the prayer - and names the sibling families this packet must not resemble. Three assertions on the controlling record's own text run at build time and stop the build if the record stops naming Article 976 as this track's authority."
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
      "THE OPEN RELEASE-BLOCKING QUESTION THE RECORD ALREADY HOLDS: Articles 987, 988, 989, 991, 992 and 994 are retained by no Master Library Edition 1.1 asset and the repository holds them only as generic legis.la.gov browser-print HTML captures. Confirm the canonical source form for each and adopt them in a successor edition before any Louisiana packet is released. This build answers it in no way and composes from the committed authority under the LA-STATUTORY-FORMS determination.",
      "Confirm that GENERATING the conditional Article 988 fee-exemption component on this track is right. The condition the record states is that the exemption is common here, the committed fee rule says it must be screened before filing rather than after, and item 2 of the packet set's own required-before-filing list tells the participant the packet gives them the form. A neighbouring family withheld it and an independent lane recorded the resulting guide sentence as a false statement about the packet.",
      "Confirm the composed Article 988 form carries only the participant-owned identifying fields the manual-completion record names, and that printing the Article 983(F) certification headings from the committed fee rule while leaving every box blank is faithful rather than an invention of certification language this build does not hold.",
      "Confirm that leaving the Article 976(A) ground blank as determinedByTheCaseNotTheRoute is right, rather than the packet electing a ground. The committed component note calls the Part II eligibility selection a legal conclusion the participant owns.",
      "Confirm that writing 'No' for whether any charge on this arrest ended in a conviction is the correct treatment of the route predicate, rather than leaving it blank. It is written because a packet built for one statutory route states which route it is, and the committed exclusion puts any convicted charge inside Article 977 or 978.",
      "Confirm the composed Article 989 motion carries Part I and Part II faithfully against the current codified article text, and that Article 986(C) is satisfied by naming the court on its face.",
      "The committed record notes that Title XXXIV was amended three times in the 2024 Regular Session after the reviewed source notes, and recommends a scheduled annual re-verification for Louisiana on the same footing as Kansas. That re-verification has not run against this build."
    ],
    mattersForTheReviewersAttention: [
      "Every committed record is pinned twice: by whole-file SHA-256 and by the SHA-256 of this family's own entry inside it.",
      "Held sources were resolved by content digest across the mounted corpus, never by the declared path. The queue row's nested custodyClass reads SOURCE_IDENTITY_UNRESOLVED and is contradicted by that measurement; the contradiction is recorded, not reconciled.",
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
    glyphReadings: proofs.map((p) => ({
      fixture: p.fixture,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes
    })),
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
