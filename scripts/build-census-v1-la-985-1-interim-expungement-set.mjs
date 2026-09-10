#!/usr/bin/env node
/**
 * Deterministic census-v1 builder for `la-985-1-interim-expungement-set`.
 *
 *   node scripts/build-census-v1-la-985-1-interim-expungement-set.mjs --no-raster
 *   node scripts/build-census-v1-la-985-1-interim-expungement-set.mjs --check
 *
 * WHAT THIS FAMILY IS, AND WHAT IT DOES NOT DO
 *
 * INTERIM expungement of a FELONY ARREST from the criminal history of a person
 * who was convicted of a MISDEMEANOUR offence arising out of that same original
 * felony arrest, under La. C.Cr.P. art. 985.1, on the Article 994 motion form
 * and the Article 995 order form.
 *
 * The thing this track most needs said plainly is what it does NOT reach.
 * Article 985.1(A) expunges only the ORIGINAL FELONY ARREST entry. The
 * misdemeanour conviction stays on the record unless it is separately cleared
 * under Article 977, and the committed legal-design limitation says in terms
 * that "the packet must say so plainly". It does, on the face of the motion, on
 * the proposed order and three times in the guide.
 *
 * What it also does, which no sibling track does:
 *
 *   - Article 985.1(B) makes the interim motion separate and distinct from
 *     expungement of a final conviction under Articles 976, 977 and 978.
 *   - Article 985.1(D) disapplies the Article 977(A)(2) five-year and Article
 *     978(A)(2) ten-year time limitations, so there is NO waiting period, and
 *     expressly permits more than one interim expungement, so there is NO cap.
 *   - Article 977(C)(1) preserves interim expungement even where the
 *     misdemeanour conviction itself is barred by the sex-offence exclusion.
 *
 * None of those three is true of Articles 976, 977, 977(D) or 978, and a
 * caption template that flattened this track into its siblings would lose all
 * of them.
 *
 * THE ORDER IS COMPOSED FROM THE ARTICLE 995 BYTES THIS BUILD HOLDS
 *
 * The committed component note for Article 995 requires that a rendering
 * reproduce the Legislature's own words rather than paraphrase them, because
 * Article 986(A) makes the statutory forms exclusive and Article 986(C) allows
 * only the court name to vary. This family's second bound source IS the Article
 * 995 statutory text, held byte-exact. So the order is composed from those
 * bytes: thirteen structural anchors asserted against them before anything is
 * drawn, and the Legislature's own decretal paragraphs -- the grant paragraph
 * naming the Bureau, and the further-ordered paragraph reaching the clerk, the
 * district attorney and the arresting agency -- lifted verbatim.
 *
 * ONE LINE OF THAT SOURCE IS NOT LIFTED, AND THE REASON IS RECORDED
 *
 * The retained Article 995 capture is a browser print, and its text layer
 * INTERLEAVES the "THUS ORDERED AND SIGNED this ___ day of ___, 20___ at ___,
 * Louisiana." line with the year and place blanks. Extracted, it reads
 * "20 ______ aTHUS ORDtERE___, LD AND SIGNED this ____ day of ___,ouisiana."
 * That is a defect in the capture's text layer, not in the statute. This build
 * refuses to lift a mangled line onto a proposed order a judge signs, so it
 * renders that line's constituent blanks -- day, month, year, place -- as the
 * court-owned fields they are, and records the caveat in the source receipt and
 * in build-findings.json for the reader who needs it.
 *
 * THE JUDICIAL BOUNDARY IS THE CONTROLLING CONSTRAINT ON THIS ORDER
 *
 * The committed note states it exactly: "the judge signs, so the rendering
 * carries NO SIGNATURE LABEL AT ALL, and every decretal election, the
 * granted-or-denied choice, both reasons-for-denial boxes, the date, the place
 * and the judge's signature must render blank. LegalEase supplies the caption
 * and the felony charge identifiers and nothing else."
 *
 * So the signature line on the Article 995 order carries no invented label. It
 * carries the statute's own word, JUDGE, over a blank rule, exactly as the
 * statutory form prints it. Both denial-reason boxes -- that the mover was not
 * arrested for a felony, and that the mover was not convicted of a misdemeanour
 * offence -- are judicial findings and render blank.
 *
 * THE TENSION THIS BUILD COULD NOT RESOLVE, AND DID NOT HIDE
 *
 * The same note says LegalEase supplies "the felony charge identifiers". The
 * same committed memo makes originalFelonyArrestCharges a REQUIRED PARTICIPANT
 * INPUT, and the packet set makes checking that answer against the rap sheet a
 * required-before-filing action. The platform holds no value for it. A prompt
 * is not an answer and a guess at a felony charge on a proposed order is worse
 * than a blank, so the identifiers render as the statute's OWN blank lines --
 * "La. R.S. ____ : ____ / Name of Offense ____" -- are declared
 * REQUIRED_BEFORE_FILING, and reach the participant through the guide's supply
 * table. The tension is recorded and put to counsel rather than resolved by
 * this lane.
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

const FAMILY_ID = "la-985-1-interim-expungement-set";
const TRACK_ID = "la-985-1-interim-expungement";
const JURISDICTION = "LA";
const OWNER_DECISION = "LA-STATUTORY-FORMS";
const STRATEGY = "custom_pleading";
const CUSTODY_CLASS = "SOURCE_BOUND_BY_HELD_BYTES";
const OUT = "data/rcap-all50/overlays/census-v1/la/la-985-1-interim-expungement-set--custom-pleading";
const BUILD_SCRIPT = "scripts/build-census-v1-la-985-1-interim-expungement-set.mjs";

const FEE_EXEMPTION = "LA-CCRP-ART-988";
const MOTION = "LA-CCRP-ART-994";
const ORDER = "LA-CCRP-ART-995";
const GUIDE = "la-985-1-interim-expungement-instructions-4";

/* The digest of the Article 995 statutory text this build composes the order
 * from. Not a path: the digest MASTER_QUEUE.json pins for this family. */
const ORDER_SOURCE_SHA256 = "b90e8cc62a2762c7d52b0a2b0f712147ca2ead4703fe091e26e9927cbab71c39";

/* FOUR authoritative components. The sibling tracks carry an Article 991 order
 * and an Article 992 order of expungement; this track carries neither, because
 * Article 986 makes Articles 994 and 995 the forms for it. The build asserts
 * the exact set rather than assuming a sibling's shape. */
const COMPONENT = Object.freeze({
  motion: "la-985-1-interim-expungement-primary-filing-1",
  order: "la-985-1-interim-expungement-proposed-order-2",
  feeExemption: "la-985-1-interim-expungement-fee-waiver-3",
  guide: "la-985-1-interim-expungement-instructions-4"
});

const RENDERED_COMPONENTS = [COMPONENT.motion, COMPONENT.order, COMPONENT.guide];
const DOCUMENT_OF = Object.freeze({
  [COMPONENT.motion]: MOTION,
  [COMPONENT.order]: ORDER,
  [COMPONENT.feeExemption]: FEE_EXEMPTION,
  [COMPONENT.guide]: GUIDE
});
const TITLES = Object.freeze({
  [COMPONENT.motion]: "Article 994 Motion for Interim Expungement of a Felony Arrest, under Article 985.1",
  [COMPONENT.order]: "Article 995 Order of Expungement of Interim Arrest Record",
  [COMPONENT.feeExemption]: "Article 988 Motion for Fee Exemption under Article 983(F)",
  [COMPONENT.guide]: "Article 985.1 Participant and Filing Instructions"
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
  assert.deepEqual(ownerFamily.remainOfficialAndMustBeHeld, []);

  /*
   * THE AUTHORITY DISCREPANCY THIS FAMILY CARRIES, MEASURED AND NAMED.
   *
   * This family's composedFromAuthority names Articles 988 and 994. It does NOT
   * name Article 995 -- which is the officialFormId of the REQUIRED proposed
   * order on the same owner's packet-set manifest, and which is one of this
   * family's two bound sources. The determination's own operative text names it
   * inside a numbered range: "The statutory forms prescribed by Louisiana
   * C.Cr.P. arts. 987 through 995 and 998 are treated uniformly as
   * COMPOSE_FROM_AUTHORITY."
   *
   * Both halves are asserted so neither can drift silently, the reading is
   * recorded rather than assumed, and it is put to counsel.
   */
  assert.deepEqual(ownerFamily.composedFromAuthority, [FEE_EXEMPTION, MOTION],
    "this family's authority grant has changed; the recorded discrepancy about Article 995 was measured against the grant as it stood");
  assert.match(owner.text, /arts\. 987 through 995 and 998/,
    "the owner determination's operative text no longer names arts. 987 through 995; Article 995 would then be inside neither the family grant nor the determination text, and this build must stop rather than compose it");
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
  /* buildBlockers is the field that withholds a build. The Article 995
   * component note carries a "no implementation is authorized here" sentence
   * that would otherwise be read as one; the record classifies its outstanding
   * gates as review and release gates instead, and the memo's own rule is that
   * only a legal_design_blocker withholds a track. If either list ever fills,
   * this build stops rather than reading past it. */
  assert.deepEqual(registryTrack.buildBlockers ?? [], [],
    "the committed record now carries a build blocker for this track; a build blocker withholds the build and this one stops");
  assert.deepEqual(registryTrack.legalDesignBlockers ?? [], [],
    "the committed record now carries a legal-design blocker for this track; only a legal_design_blocker withholds a track and this one stops");
  pin("registry", `tracks[trackId=${TRACK_ID}]`, registryTrack);

  const packetSet = loaded.manifest.data.packetSets.find((row) => row.packetSetId === FAMILY_ID);
  assert.ok(packetSet, `the packet-set manifest carries no ${FAMILY_ID}`);
  pin("manifest", `packetSets[packetSetId=${FAMILY_ID}]`, packetSet);

  const relationships = (loaded.relationships.data.relationships ?? []).filter((row) => row.trackId === TRACK_ID);
  pin("relationships", `relationships[trackId=${TRACK_ID}]`, relationships);

  const components = [...packetSet.components].sort((a, b) => a.order - b.order);
  assert.deepEqual(components.map((c) => c.componentId), [
    COMPONENT.motion, COMPONENT.order, COMPONENT.feeExemption, COMPONENT.guide
  ], "the authoritative component set has changed; this build states the set it was written against");
  for (const componentId of RENDERED_COMPONENTS) {
    const row = components.find((c) => c.componentId === componentId);
    assert.equal(row.requirement, "required", `${componentId} is no longer required in the authoritative packet set`);
  }
  const feeRow = components.find((c) => c.componentId === COMPONENT.feeExemption);
  assert.equal(feeRow.requirement, "conditional", "the Article 988 component is no longer conditional; a required component may not be withheld");
  assert.ok(feeRow.conditionDescription, "the Article 988 component states no condition, so nothing establishes it is unmet");
  assert.match(String(feeRow.conditionDescription), /may qualify for the Article 983\(F\) exemption/i,
    "the Article 988 condition no longer turns on whether the participant may qualify for the Article 983(F) exemption; the reason this build withholds the component has gone and the decision must be re-taken");

  /* THE FORM CHECK. Article 986 makes Articles 994 and 995 the forms for this
   * track. If either stops being the declared form, this build is composing the
   * wrong instrument. */
  assert.equal(components.find((c) => c.componentId === COMPONENT.motion).officialFormId, MOTION,
    `the required primary filing is no longer ${MOTION}`);
  assert.equal(components.find((c) => c.componentId === COMPONENT.order).officialFormId, ORDER,
    `the required proposed order is no longer ${ORDER}`);
  assert.match(String(registryTrack.rules?.filing ?? ""), /Article 986 makes Articles 994 and 995 the forms to be used/i,
    "the committed filing rule no longer names Articles 994 and 995 as this track's forms");

  const printedLists = {
    "packetSet.requiredBeforeFiling": packetSet.requiredBeforeFiling,
    "packetSet.participantActionRequired": packetSet.participantActionRequired,
    "registryTrack.authority": registryTrack.authority,
    "memoTrack.selfHelpStopConditions": memoTrack.selfHelpStopConditions,
    "memoTrack.exclusions": memoTrack.exclusions,
    "memoTrack.waitingPeriods": memoTrack.waitingPeriods,
    "memoTrack.unresolvedQuestions": memoTrack.unresolvedQuestions,
    "memoTrack.manualCompletionItems": memoTrack.manualCompletionItems,
    "memoTrack.supportingDocuments": memoTrack.supportingDocuments,
    "memoTrack.components": memoTrack.components,
    "registryTrack.legalDesignLimitations": registryTrack.legalDesignLimitations
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

  /* THE ARTICLE CHECK, and the two statements this track exists to make. */
  assert.match(String(registryTrack.legalName ?? ""), /art\. 985\.1/i,
    "the committed record no longer names Article 985.1 as this track's authority");
  assert.match(String(memoTrack.controllingAuthority?.summary ?? ""), /Article 985\.1\(A\)/,
    "the committed memo no longer recites Article 985.1(A); this packet's eligibility recitals come from it");
  assert.equal(memoTrack.controllingAuthority.citations[0], "La. C.Cr.P. art. 985.1");
  assert.ok((memoTrack.exclusions ?? []).some((row) => /misdemeanour conviction itself is not expunged/i.test(String(row))),
    "the committed record no longer states that the misdemeanour conviction is not expunged by this track; the packet says so on three surfaces and the record is where it comes from");
  assert.ok((memoTrack.waitingPeriods ?? []).some((row) => /disapplies the Article 977\(A\)\(2\)/i.test(String(row?.duration ?? ""))),
    "the committed record no longer states that Article 985.1(D) disapplies the sibling time limitations; the packet prints that there is no waiting period on the strength of it");

  return { owner, ownerFamily, queueFamily, routes, memoTrack, registryTrack, packetSet, components, relationships, pins, printedLists };
}

/* ------------------------------------------- sources, resolved by content */

/*
 * `private/` is gitignored, so it is not a git path and its absence from a
 * worktree proves nothing about custody. The declared custody is listed FIRST,
 * so when it is mounted the declared path and the resolved path are the same
 * file and the receipt says so.
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

/* ------------------------------ the Legislature's own words, from the bytes */

const ARTICLE_995_ANCHORS = Object.freeze([
  "Art. 995. Order of interim expungement form to be used",
  "ORDER OF EXPUNGEMENT OF INTERIM ARREST RECORD",
  "Considering the Motion for Expungement",
  "The hearing conducted and evidence adduced herein, OR",
  "Affidavits of No Opposition filed,",
  "IT IS ORDERED, ADJUDGED AND DECREED",
  "THE MOTION IS DENIED for the following reasons (check all that apply):",
  "Mover was not arrested for a felony.",
  "Mover was not convicted of a misdemeanor offense.",
  "Name of Offense",
  "JUDGE",
  "PLEASE SERVE",
  "Acts 2014, No. 145"
]);

/**
 * Open the Article 995 source by DIGEST and lift the Legislature's own decretal
 * paragraphs out of its bytes.
 *
 * One line of the source is deliberately NOT lifted. The retained capture is a
 * browser print whose text layer interleaves the "THUS ORDERED AND SIGNED" line
 * with the year and place blanks, extracting as
 * "20 ______ aTHUS ORDtERE___, LD AND SIGNED this ____ day of ___,ouisiana."
 * A mangled line does not go onto a proposed order a judge signs. Its
 * constituent blanks are rendered as court-owned fields instead, and the caveat
 * is recorded rather than smoothed over.
 */
async function readArticle995FromItsOwnBytes(sources) {
  const row = sources.resolved.find((entry) => entry.sha256 === ORDER_SOURCE_SHA256);
  assert.ok(row,
    `the Article 995 statutory text is not among this family's resolved sources; expected sha256=${ORDER_SOURCE_SHA256}. The order is composed from these bytes and is not composed without them.`);
  const bytes = fs.readFileSync(row.resolvedPath);
  assert.equal(sha256(bytes), ORDER_SOURCE_SHA256, "the Article 995 source changed under the build between resolution and read");
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const text = pdf.getPages()
    .map((page) => groupIntoLines(extractTextItems(page)).map((line) => line.text).join(" "))
    .join(" ").replace(/\s+/g, " ");

  const anchorsFound = [];
  for (const anchor of ARTICLE_995_ANCHORS) {
    assert.ok(text.includes(anchor),
      `the Article 995 source no longer carries the anchor "${anchor}"; a mandatory statutory form is reproduced from its own words or not at all`);
    anchorsFound.push(anchor);
  }

  const grantParagraph = /THE MOTION IS HEREBY GRANTED[\s\S]*?following felony charge\(s\):/.exec(text);
  assert.ok(grantParagraph, "the Article 995 source no longer carries its own grant paragraph");
  const furtherOrdered = /IT IS FURTHER ORDERED[\s\S]*?enumerated charge\(s\)\./.exec(text);
  assert.ok(furtherOrdered, "the Article 995 source no longer carries its own further-ordered paragraph");

  /* The interleaving is asserted rather than assumed, so that if a clean
   * capture ever replaces this one the caveat stops being printed on the
   * strength of a stale observation. */
  const thusOrderedRegion = /enumerated charge\(s\)\.([\s\S]{0,200})/.exec(text)?.[1] ?? "";
  const thusOrderedIsInterleaved = !/THUS ORDERED AND SIGNED this/.test(thusOrderedRegion);

  return {
    sha256: ORDER_SOURCE_SHA256,
    resolvedPath: row.resolvedPath,
    declaredPath: row.declaredPath,
    byteLength: bytes.length,
    pageCount: pdf.getPageCount(),
    anchorsAsserted: anchorsFound,
    considering: "Considering the Motion for Expungement",
    hearingOrAffidavits: ["The hearing conducted and evidence adduced herein, OR", "Affidavits of No Opposition filed,"],
    decreed: "IT IS ORDERED, ADJUDGED AND DECREED",
    deniedHeading: "THE MOTION IS DENIED for the following reasons (check all that apply):",
    denialReasons: ["Mover was not arrested for a felony.", "Mover was not convicted of a misdemeanor offense."],
    grantParagraph: grantParagraph[0].trim(),
    furtherOrdered: furtherOrdered[0].trim(),
    statutorySourceNote: "Acts 2014, No. 145, Sec. 1.",
    thusOrderedIsInterleaved,
    thusOrderedAsExtracted: thusOrderedRegion.trim().slice(0, 160)
  };
}

/* ------------------------------------------------------------- fixtures */

/*
 * A fixture holds answers a participant gave. It does not hold a restatement of
 * the question, a description of the fixture, or a guess at a sworn averment
 * about a criminal record.
 *
 * Absent on purpose: the original FELONY arrest charges and their statutes, the
 * misdemeanour offence convicted of, whether that conviction arose out of this
 * same felony arrest, whether the rap sheet shows more than one arrest event,
 * whether an interim expungement has been obtained before, race, gender, the
 * last four digits of the Social Security number, and the rap-sheet
 * identifiers. Each prints as an empty line and reaches the participant through
 * the guide's supply table.
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
    "case.misdemeanor_conviction_date": "2019-09-12",
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
    "case.misdemeanor_conviction_date": "2014-06-30",
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
  rectBasis: document === ORDER
    ? "mandatory_statutory_form_composed_by_this_build_from_the_article_995_source_bytes_bound_by_digest"
    : "composed_statutory_instrument_authored_by_this_build_from_the_committed_authority"
});

const write = (document, id, label, factId, page = 1) => ({ ...base(document, id, label, page), factId, kind: "composed_text" });

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
  reason: "attorney-only block; this packet holds no record that the mover is represented, so it is not populated with participant data",
  category: null,
  completenessClass: null,
  class: null,
  completenessDisposition: "NOT_APPLICABLE_ON_THIS_ROUTE",
  requiredBeforeFiling: false,
  why: "this packet holds no record that the mover is represented, and the attorney block belongs to counsel"
});

const CAPTION_WRITES = (document) => [
  write(document, "court_name", "Name of court with trial jurisdiction over the misdemeanour conviction", "case.court_name"),
  write(document, "parish", "Parish of arrest and conviction", "case.parish"),
  write(document, "docket_number", "Docket or case number", "case.docket_number"),
  write(document, "division", "Division of the court", "case.division"),
  write(document, "mover_full_legal_name", "Mover full legal name", "participant.full_legal_name")
];

/**
 * The felony charge identifiers: the thing this track expunges.
 *
 * The committed component note for Article 995 says LegalEase supplies "the
 * felony charge identifiers". The same committed memo makes
 * originalFelonyArrestCharges a REQUIRED PARTICIPANT INPUT and the packet set
 * makes checking that answer against the rap sheet a required-before-filing
 * action. The platform holds no value for it, and a guessed felony charge on a
 * proposed order is worse than a blank, so it renders as the statute's own
 * blank lines and is disclosed. The tension between those two record statements
 * is recorded in build-findings.json and put to counsel.
 */
const FELONY_CHARGES_SUPPLY = (document, page = 1) => supply(document, "original_felony_arrest_charges",
  "La. R.S. statute and name of offense for each felony charge on the original arrest",
  "the statute and the offence name for every felony charge you were arrested for ORIGINALLY, taken from the arrest record rather than from the charge you were finally convicted of - this is the entry being expunged, so it must match your rap sheet exactly",
  "the committed memo makes originalFelonyArrestCharges a required participant input and the packet set makes checking it against the background check a required-before-filing action; the platform holds no value for it, and the committed limitation says in terms to capture the ORIGINAL arrest charge rather than the amended charge because on this track the original felony arrest charge is the thing being expunged",
  page);

const SAME_ARREST_SUPPLY = (document, page = 1) => supply(document, "same_arrest_event",
  "Whether the misdemeanour conviction arose out of that same original felony arrest",
  "whether the misdemeanour you were convicted of arose out of that SAME original felony arrest",
  "the committed memo makes sameArrestEvent a required participant input, Article 985.1(A) turns on it, the platform holds no value for it, and the committed record makes it the first condition on which self-help stops when the answer is unclear",
  page,
  {
    determinedByTheCaseNotTheRoute: true,
    whyTheRouteCannotDetermineIt: "the route determines the ARTICLE and the forms - Article 985.1 on the Article 994 motion and the Article 995 order - and not whether this particular misdemeanour conviction in fact arose out of this particular felony arrest. That is a fact of the case, established by the bill of information and the minute entry, and the committed record makes it a self-help stop condition when it is unclear rather than something a packet decides."
  });

function motionMap() {
  const writes = [
    ...CAPTION_WRITES(MOTION),
    write(MOTION, "mover_date_of_birth", "Mover date of birth", "participant.date_of_birth"),
    write(MOTION, "arrest_date", "Date of the original felony arrest as it appears on the state rap sheet", "case.arrest_date"),
    write(MOTION, "arresting_law_enforcement_agency", "Arresting law enforcement agency", "case.arresting_law_enforcement_agency"),
    write(MOTION, "charge_count", "How many separate charges or counts this arrest carries", "case.charge_count"),
    write(MOTION, "misdemeanor_conviction_date", "Date the mover was convicted of the misdemeanour", "case.misdemeanor_conviction_date"),
    write(MOTION, "hard_labor_custody", "Whether the mover is now in the physical custody of the Department of Public Safety and Corrections serving a sentence at hard labour", "case.hard_labor_custody"),
    write(MOTION, "background_check_ordered_on", "Date the Louisiana criminal background check was ordered", "case.background_check_ordered_on")
  ];
  const blanks = [
    FELONY_CHARGES_SUPPLY(MOTION),
    supply(MOTION, "misdemeanor_conviction_offense", "Misdemeanour offence the mover was convicted of out of that arrest",
      "the misdemeanour offence you were convicted of out of that arrest, in the words your own court record uses",
      "the committed memo makes misdemeanorConvictionOffense a required participant input and the platform holds no value for it; it is the mover's own averment about a conviction"),
    SAME_ARREST_SUPPLY(MOTION),
    supply(MOTION, "multiple_arrest_events", "Whether the state rap sheet shows more than one arrest event that might be confused with this one",
      "whether your rap sheet shows more than one arrest event that might be confused with this one",
      "the committed memo makes multipleArrestEvents a required participant input and the platform holds no value for it; the committed record makes a rap sheet that conflates more than one arrest event a self-help stop condition, because the felony arrest to be expunged must be identifiable unambiguously"),
    supply(MOTION, "prior_interim_expungements", "Whether the mover has obtained an interim expungement before",
      "whether you have obtained an interim expungement before - Article 985.1(D) expressly permits more than one, so a previous one does not disqualify you",
      "the committed memo makes priorInterimExpungements a required participant input and the platform holds no value for it"),
    supply(MOTION, "race", "Race",
      "your race, written as the state rap sheet writes it, so the defendant information section matches the record the Bureau holds",
      "the committed manual-completion record classifies race on Articles 989 and 994 as a manual completion item pending a data-protection review, so the packet prints it blank for the participant to complete by hand"),
    supply(MOTION, "gender", "Gender",
      "your gender, written as the state rap sheet writes it, so the defendant information section matches the record the Bureau holds",
      "the committed manual-completion record classifies gender on Articles 989 and 994 as a manual completion item pending a data-protection review, so the packet prints it blank for the participant to complete by hand"),
    supply(MOTION, "ssn_last_four", "Last four digits of the Social Security number",
      "the last four digits of your Social Security number, written on the form by hand at the moment you file",
      "the platform does not store or write a Social Security number, so no value for it exists to be written"),
    supply(MOTION, "drivers_license_number", "Driver's licence number",
      "your driver's licence number, or leave it blank if you have never held one",
      "the committed memo asks for it only where the participant holds or held a licence; the platform holds no licence number"),
    supply(MOTION, "sid_number", "SID number shown on the state rap sheet",
      "your SID number exactly as your rap sheet prints it, or leave it blank if your rap sheet shows none",
      "it lives on the rap sheet the participant orders and the platform holds no copy of it"),
    supply(MOTION, "arrest_number", "Arrest or booking number shown on the state rap sheet",
      "the arrest number (ATN) exactly as your Right to Review or sheriff's background check prints it",
      "the number lives on the rap sheet the participant orders, and the platform holds no copy of it"),
    supply(MOTION, "agency_item_number", "Arresting law enforcement item number for this arrest",
      "the arresting agency's item number for this arrest, from your rap sheet or the agency's own report",
      "the item number is the arresting agency's internal reference; the platform holds no copy of it"),
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

/**
 * The Article 995 order.
 *
 * "LegalEase supplies the caption and the felony charge identifiers and nothing
 * else." The grant-or-deny election, BOTH denial-reason boxes, the date, the
 * place and the judge's signature all render blank, and the signature carries
 * NO INVENTED LABEL: the statute's own word, JUDGE, over a blank rule.
 *
 * The arresting agency on the PLEASE SERVE list IS written, because the
 * platform holds it and because the completeness contract refuses to let an
 * agency name hide inside a court-owned refusal class -- correctly, since the
 * mover knows which agency arrested them.
 */
function orderMap() {
  const writes = [
    ...CAPTION_WRITES(ORDER),
    write(ORDER, "serve_arresting_agency", "Arresting Agency to be served", "case.arresting_law_enforcement_agency")
  ];
  const blanks = [
    FELONY_CHARGES_SUPPLY(ORDER),
    courtRow(ORDER, "hearing_or_affidavits_election",
      "Whether the order rests on the hearing conducted and evidence adduced herein, or on Affidavits of No Opposition filed",
      "the statutory form offers the court the two alternatives and the court elects between them; the mover elects neither"),
    courtRow(ORDER, "granted_or_denied", "Whether the motion is granted or denied",
      "granting or denying the motion is the court's decision and this build makes none of it"),
    courtRow(ORDER, "denial_reason_not_arrested_for_a_felony",
      "Reason for denial: the mover was not arrested for a felony",
      "the committed record states that the two denial reasons are judicial findings; the court checks them if it denies the motion"),
    courtRow(ORDER, "denial_reason_not_convicted_of_a_misdemeanor",
      "Reason for denial: the mover was not convicted of a misdemeanor offense",
      "the committed record states that the two denial reasons are judicial findings; the court checks them if it denies the motion"),
    courtRow(ORDER, "order_day", "Day of the month on which the order is signed",
      "the court dates its own order"),
    courtRow(ORDER, "order_month_and_year", "Month and year in which the order is signed",
      "the court dates its own order"),
    courtRow(ORDER, "order_place", "Place in Louisiana at which the order is signed",
      "the court states the place of its own order"),
    courtRow(ORDER, "JUDGE", "JUDGE",
      "the statutory form prints the word JUDGE beneath a blank rule and nothing else; the committed record states that the judge signs, so this rendering carries no signature label of its own and no ink"),
    courtRow(ORDER, "serve_district_attorney", "District Attorney to be served",
      "Article 979 makes service the clerk's act; the serve list is completed by the clerk"),
    courtRow(ORDER, "serve_bureau", "Louisiana Bureau of Criminal Identification and Information to be served",
      "Article 979 makes service the clerk's act; the serve list is completed by the clerk")
  ];
  return {
    formNumber: ORDER,
    documentId: ORDER,
    componentId: COMPONENT.order,
    documentRole: "proposed_order",
    structuralClass: "mandatory_codified_statutory_form_composed_from_its_own_source_bytes",
    officialFormId: ORDER,
    sourceBoundBySha256: ORDER_SOURCE_SHA256,
    documentPolicy: { mode: "court_issued_order_accepts_caption_and_charge_identifiers_only", packetSetId: FAMILY_ID, documentAcceptsFill: true },
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

function sanitize(text) {
  let out = String(text ?? "");
  for (const [from, to] of REPLACEMENTS) out = out.split(from).join(to);
  const bad = [...out].filter((ch) => ch !== "\n" && (ch.codePointAt(0) < 0x20 || ch.codePointAt(0) > 0x7e));
  assert.equal(bad.length, 0,
    `unmapped characters in composed text: ${[...new Set(bad)].map((c) => `U+${c.codePointAt(0).toString(16).padStart(4, "0")}`).join(", ")}`);
  return out;
}

/* ---------------------------------------------------------- the bodies */

const block = (...lines) => ({ lines: lines.flat().filter((line) => line !== undefined) });

function captionBlock(facts, documentTitle, documentId) {
  return block(
    documentId,
    documentTitle.toUpperCase(),
    "",
    `${facts["case.court_name"]}, STATE OF LOUISIANA`,
    `JUDICIAL DISTRICT FOR THE PARISH OF: ${facts["case.parish"]}`,
    `STATE OF LOUISIANA v. ${facts["participant.full_legal_name"]}`,
    `No.: ${facts["case.docket_number"]}`,
    `Division: ${facts["case.division"]}`,
    ""
  );
}

/** What this track reaches, and what it leaves behind. Printed on every surface. */
const ONLY_THE_FELONY_ARREST =
  "This motion clears ONLY the entry of the original FELONY ARREST from the criminal history. The misdemeanour conviction that arose out of that arrest is not expunged by it and stays on the record unless it is separately cleared under Article 977.";

function motionBody(facts, binding) {
  const { memoTrack } = binding;
  return [
    captionBlock(facts, TITLES[COMPONENT.motion], MOTION),
    block(
      "MOTION FOR INTERIM EXPUNGEMENT OF A FELONY ARREST FROM CRIMINAL HISTORY",
      "La. C.Cr.P. art. 985.1, on the statutory Article 994 form. Article 986 makes Articles 994 and 995 the forms to be used on this track.",
      "",
      "NOW INTO COURT comes mover, who provides the court with the following information in connection with this request. Mover moves for an interim expungement of the record of the original felony arrest identified below, pursuant to Louisiana Code of Criminal Procedure Article 985.1, and states the following in support.",
      "",
      ONLY_THE_FELONY_ARREST,
      ""
    ),
    block(
      "DEFENDANT INFORMATION",
      `Mover full legal name: ${facts["participant.full_legal_name"]}`,
      `Mover date of birth: ${facts["participant.date_of_birth"]}`,
      `Race: ${DOTS(56)}`,
      `Gender: ${DOTS(54)}`,
      `Last four digits of the Social Security number: ${DOTS(24)}`,
      `Driver's licence number: ${DOTS(45)}`,
      "",
      "Race and gender are left blank for the mover to complete by hand.",
      ""
    ),
    block(
      "THE ORIGINAL FELONY ARREST TO BE EXPUNGED",
      `Date of the original felony arrest as it appears on the state rap sheet: ${facts["case.arrest_date"]}`,
      `Arresting law enforcement agency: ${facts["case.arresting_law_enforcement_agency"]}`,
      `How many separate charges or counts this arrest carries: ${facts["case.charge_count"]}`,
      "La. R.S. statute and name of offense for each felony charge on the original arrest:",
      DOTS(74), DOTS(74),
      "",
      "These two lines are the mover's own and are left blank. Enter the ORIGINAL felony arrest charge rather than the amended or finally convicted charge: under Article 985.1(A) the entry being expunged is the original felony arrest, and what is written here must match the state rap sheet exactly.",
      ""
    ),
    block(
      `Arrest or booking number shown on the state rap sheet: ${DOTS(18)}`,
      `SID number shown on the state rap sheet: ${DOTS(31)}`,
      `Arresting law enforcement item number for this arrest: ${DOTS(18)}`,
      ""
    ),
    block(
      "THE MISDEMEANOUR CONVICTION THAT AROSE OUT OF THAT ARREST",
      "Misdemeanour offence the mover was convicted of out of that arrest:",
      DOTS(74),
      `Date the mover was convicted of the misdemeanour: ${facts["case.misdemeanor_conviction_date"]}`,
      `Whether the misdemeanour conviction arose out of that same original felony arrest: ${DOTS(10)}`,
      "",
      "Article 985.1(A) permits this interim motion for a person who was convicted of a misdemeanour offence arising out of the original felony arrest. Whether this conviction arose out of THIS arrest is the mover's own answer to give. If it is unclear, stop and get a lawyer's advice before filing anything.",
      ""
    ),
    block(
      `Whether the state rap sheet shows more than one arrest event that might be confused with this one: ${DOTS(10)}`,
      "",
      "The felony arrest to be expunged has to be identifiable unambiguously. If the rap sheet conflates more than one arrest event, stop and get a lawyer's advice before filing anything.",
      ""
    ),
    block(
      "WHAT ARTICLE 985.1 DOES NOT REQUIRE",
      `Whether the mover has obtained an interim expungement before: ${DOTS(10)}`,
      "",
      "Article 985.1(D) provides that this motion is not subject to the time limitations of Article 977(A)(2) or Article 978(A)(2), so there is no waiting period, and expressly permits more than one interim expungement, so a previous one does not disqualify the mover. Article 985.1(B) makes this motion separate and distinct from expungement of a final conviction under Articles 976, 977 and 978. Article 977(C)(1) preserves interim expungement even where the misdemeanour conviction itself is barred by the sex-offence exclusion.",
      ""
    ),
    block(
      "ARTICLE 975 - CUSTODY BAR",
      `Whether the mover is now in the physical custody of the Department of Public Safety and Corrections serving a sentence at hard labour: ${facts["case.hard_labor_custody"]}`,
      "",
      "Article 975 bars a person in the physical custody of the Department of Public Safety and Corrections serving a sentence at hard labour from filing. If that answer is yes, this motion may not be filed.",
      ""
    ),
    block(
      `Date the Louisiana criminal background check was ordered: ${facts["case.background_check_ordered_on"]}`,
      "",
      "The Article 994 form requires a Louisiana criminal background check on its face, dated within the past sixty days. Order it so it is still inside that life on the day the motion is filed.",
      ""
    ),
    block(
      "PRAYER",
      "The mover prays that the court order the Louisiana Bureau of Criminal Identification and Information to expunge the entry of the felony charge or charges identified above from the mover's criminal history, and that the clerk of court, the district attorney and the arresting agency expunge that entry from any public indices, as the Article 995 Order of Expungement of Interim Arrest Record filed with this motion provides.",
      "",
      ONLY_THE_FELONY_ARREST,
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
      "Article 985.1(C) applies the Article 979 et seq. procedures, so under Article 979 the clerk serves the motion on the district attorney, the Louisiana Bureau of Criminal Identification and Information and the arresting law enforcement agency, and files the certificate of service. The mover serves nobody.",
      ""
    )
  ];
}

/**
 * The Article 995 order, in the statutory form's own order and in the
 * Legislature's own words wherever those words extract cleanly from the bound
 * source.
 */
function orderBody(facts, article995) {
  return [
    captionBlock(facts, TITLES[COMPONENT.order], ORDER),
    block(
      "ORDER OF EXPUNGEMENT OF INTERIM ARREST RECORD",
      "La. C.Cr.P. art. 995. Article 986(A) makes the statutory forms exclusive and Article 986(C) allows only the name of the court to vary.",
      "",
      "COURT USE ONLY - UNEXECUTED PROPOSED ORDER. The mover supplies the caption and the felony charge identifiers and nothing else on this page. Nothing here has been decided, and no relief exists unless and until a judge completes and signs it and the clerk enters it.",
      ""
    ),
    block(
      article995.considering,
      ...article995.hearingOrAffidavits.map((line) => `${DOTS(4)} ${line}`),
      "",
      "The election between those two alternatives is the court's.",
      ""
    ),
    block(
      article995.decreed,
      ""
    ),
    block(
      `${DOTS(4)} ${article995.deniedHeading}`,
      ...article995.denialReasons.map((line) => `${DOTS(8)} ${line}`),
      "",
      "Both reasons for denial are judicial findings. The court checks them if it denies the motion; the mover checks neither.",
      ""
    ),
    block(
      `${DOTS(4)} ${article995.grantParagraph}`,
      "",
      `La. R.S. ${DOTS(12)} : ${DOTS(12)}`,
      `Name of Offense ${DOTS(48)}`,
      `La. R.S. ${DOTS(12)} : ${DOTS(12)}`,
      `Name of Offense ${DOTS(48)}`,
      "",
      "These four lines are the felony charge identifiers. They are the mover's own to complete before the motion is filed, taken from the original arrest record rather than from the charge finally convicted of.",
      ""
    ),
    block(
      article995.furtherOrdered,
      ""
    ),
    block(
      "THUS ORDERED AND SIGNED",
      `Day of the month on which the order is signed: ${DOTS(25)}`,
      `Month and year in which the order is signed: ${DOTS(27)}`,
      `Place in Louisiana at which the order is signed: ${DOTS(24)}`,
      "",
      DOTS(40),
      "JUDGE",
      ""
    ),
    block(
      "PLEASE SERVE:",
      `1. District Attorney ${DOTS(48)}`,
      `2. Louisiana Bureau of Criminal Identification and Information ${DOTS(10)}`,
      `3. Arresting Agency ${facts["case.arresting_law_enforcement_agency"]}`,
      "",
      `Statutory source note: ${article995.statutorySourceNote}`,
      ""
    )
  ];
}

/* ------------------------------------------------ participant guidance */

const bullet = (text) => `- ${text}`;

function participantInstructions(binding, rbf, name, article995) {
  const { registryTrack, memoTrack, packetSet, components, queueFamily } = binding;
  const rules = registryTrack.rules ?? {};
  const actions = registryTrack.packetSet?.participantActionRequired ?? [];
  const stops = memoTrack.selfHelpStopConditions ?? [];
  const notGenerated = components.filter((c) => !RENDERED_COMPONENTS.includes(c.componentId));
  const requiredGuidance = memoTrack.components.find((c) => c.role === "instructions" && c.requirement === "required");
  const recordRequiredBeforeFiling = packetSet.requiredBeforeFiling ?? [];

  const renderedArticles = new Set(RENDERED_COMPONENTS
    .map((componentId) => /ART-(\d+)/.exec(DOCUMENT_OF[componentId] ?? "")?.[1])
    .filter(Boolean));
  const notGeneratedFormsByArticle = new Map();
  for (const row of notGenerated) {
    const article = /ART-(\d+)/.exec(row.officialFormId ?? "")?.[1];
    if (article) notGeneratedFormsByArticle.set(article, row);
  }

  /* A record line that claims this packet contains a component it does not
   * generate is printed whole and corrected beneath. */
  const reconcileNotGeneratedFormClaim = (text) => {
    const claimed = [...String(text).matchAll(/packet gives you the Article (\d+) form/gi)].map((m) => m[1]);
    const corrections = [];
    for (const article of new Set(claimed)) {
      const row = notGeneratedFormsByArticle.get(article);
      if (!row) continue;
      corrections.push(
        `**This packet does not give you the Article ${article} form.** \`${row.componentId}\` is ${row.requirement} on the record, and the condition the record states is "${row.conditionDescription}" Article 985.1(C) applies the ordinary Article 983 fee provisions, and the Article 983(F) grounds are non-conviction grounds, so nothing establishes the condition and no Article ${article} form is enclosed. Everything else the item says still applies: if you believe the exemption reaches you, ask the clerk of court or the district attorney's office for the Article ${article} form and take or send it to the district attorney before the motion is filed. If you file without it you pay the fee, and Article 983 makes the fee non-refundable even if the motion is denied.`
      );
    }
    return corrections;
  };

  /*
   * A RECORD LINE THAT NAMES A SIBLING TRACK'S FORM IS PRINTED WHOLE AND THEN
   * CORRECTED.
   *
   * registryTrack.rules.notice for this track says "the Article 991 Order
   * states that no contradictory hearing is required". There is no Article 991
   * order on this track: Article 986 makes Articles 994 and 995 the forms, the
   * same registry's filing rule says so, and the Article 995 form carries its
   * OWN alternative -- "Affidavits of No Opposition filed," -- which the
   * packet-set's own item 6 names correctly. The correction is generated by
   * comparing the article a line names against the forms this packet actually
   * renders, so a sibling's form number anywhere else is caught by the same
   * code rather than by the next reader.
   */
  const reconcileWrongFormClaim = (text) => {
    const named = [...String(text).matchAll(/Article (\d+) (Motion|Order)\b/gi)].map((m) => [m[1], m[2]]);
    const corrections = [];
    const seen = new Set();
    for (const [article, kind] of named) {
      if (renderedArticles.has(article) || notGeneratedFormsByArticle.has(article) || seen.has(article)) continue;
      seen.add(article);
      corrections.push(
        `**There is no Article ${article} ${kind} in this packet, and none is used on this track.** The committed record names one here, and that is a slip carried in from a sibling Louisiana track. Article 986 makes the **Article ${MOTION.replace("LA-CCRP-ART-", "")} Motion** and the **Article ${ORDER.replace("LA-CCRP-ART-", "")} Order** the forms to be used on this track, and the same registry's own filing rule says so. The Article ${ORDER.replace("LA-CCRP-ART-", "")} order carries its own alternative to a hearing on its face - "Affidavits of No Opposition filed," - which is what the item is describing. Read it against the Article ${ORDER.replace("LA-CCRP-ART-", "")} Order enclosed with this packet.`
      );
    }
    return corrections;
  };

  const reconcile = (text) => [...reconcileNotGeneratedFormClaim(text), ...reconcileWrongFormClaim(text)];

  const lines = [
    `# ${registryTrack.legalName}`,
    "",
    `Prepared for **${name}**. Packet set \`${FAMILY_ID}\`, version ${packetSet.version}.`,
    "",
    `This packet set serves ${queueFamily.routeKeys.length} route(s):`,
    "",
    ...queueFamily.routeKeys.map((key) => bullet(`\`${key}\``)),
    "",
    "## What this packet clears, and what it leaves behind",
    "",
    ONLY_THE_FELONY_ARREST,
    "",
    "That is the most important sentence in this packet, and the committed legal-design record requires it to be said plainly. If what you want cleared is the misdemeanour conviction itself, this is not the packet for it: that is Article 977, and it is a separate motion on a separate form.",
    "",
    "## The article this packet proceeds under, and the forms it uses",
    "",
    `Louisiana runs separate expungement tracks off separate articles, and they are not interchangeable. This packet is the **Article 985.1** interim track, and Article 986 makes the **Article 994** motion and the **Article 995** order the forms to be used on it. It does not use the Article 989 motion, the Article 991 order or the Article 992 order that the sibling tracks use. An arrest without conviction is Article 976, a misdemeanour conviction is Article 977, a first offence possession of marijuana is Article 977(D) on the Article 998 form, a felony conviction is Article 978, and a record naming more than one person is Article 985 redaction.`,
    "",
    registryTrack.mechanism,
    "",
    `The committed record lists ${(registryTrack.authority ?? []).length} authorities for this track:`,
    "",
    ...(registryTrack.authority ?? []).map((cite) => bullet(cite)),
    "",
    "## What this track does that no sibling track does",
    "",
    bullet("**No waiting period.** Article 985.1(D) disapplies the Article 977(A)(2) five-year and Article 978(A)(2) ten-year time limitations."),
    bullet("**No cap.** Article 985.1(D) expressly permits more than one interim expungement, so a previous one does not disqualify you."),
    bullet("**It survives the sex-offence exclusion.** Article 977(C)(1) preserves interim expungement even where the misdemeanour conviction itself is barred by that exclusion."),
    bullet("**It is separate and distinct.** Article 985.1(B) makes this motion separate and distinct from expungement of a final conviction under Articles 976, 977 and 978, so obtaining it neither uses up nor replaces any of those."),
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
    `The Article 995 order in this packet is composed from the Legislature's own text of Article 995, bound to this packet by the content digest \`${article995.sha256}\`. Its decretal paragraphs are the statute's own words, lifted from those bytes rather than paraphrased, because Article 986(A) makes the statutory forms exclusive and Article 986(C) allows only the name of the court to vary.`,
    "",
    "## What is not generated, and the condition the record states",
    ""
  );
  for (const row of notGenerated) {
    lines.push(bullet(`\`${row.componentId}\` (${row.role}${row.officialFormId ? `, ${row.officialFormId}` : ""}): ${row.conditionDescription} This packet does not meet that condition, so the component is not generated.`));
  }
  lines.push(
    "",
    "## Internal record text: what the record says, and why it is here rather than on the filing",
    "",
    "The two documents you file - the Article 994 motion and the Article 995 order - recite statute and rule text and nothing else. This build's own identifiers and the committed record's own words are internal record text, and they are set out here instead, so that the pages a clerk stamps and a judge signs carry only what the Legislature put on them.",
    "",
    bullet(`**Component identities.** The motion is \`${COMPONENT.motion}\`, the proposed order is \`${COMPONENT.order}\` and these instructions are \`${COMPONENT.guide}\`. Those are this factory's own identifiers for the three documents. They used to be printed in the caption of the motion and of the order and on the motion's signature-block page; they are not printed on either filed document now.`),
    bullet("**Where the Article 994 motion text comes from.** It is composed from the committed LA-STATUTORY-FORMS authority. The motion itself now cites only Article 985.1 and Article 986."),
    bullet(`**Where the Article 995 order text comes from.** It is composed from the Article 995 statutory text this packet is bound to by the content digest \`${article995.sha256}\`, which is what Article 986(A) requires of a rendering of a mandatory statutory form. The order itself now cites only Article 986(A) and Article 986(C).`),
    bullet("**Race and gender on the motion.** The committed manual-completion record classifies both, on Articles 989 and 994, as manual completion items pending a data-protection review. That is why the packet prints them blank and the motion says only that you write them by hand."),
    bullet("**The original arrest charge.** The committed record directs in terms that the ORIGINAL arrest charge be captured rather than the amended charge. The motion now states the instruction and its statutory reason without quoting the record."),
    bullet("**The two self-help stops printed on the motion.** Whether the misdemeanour conviction arose out of that same original felony arrest, and whether the rap sheet conflates more than one arrest event, are both conditions on which the committed record says self-help stops. The motion now tells you to stop and get a lawyer's advice, which is what the condition means for you."),
    bullet("**The attorney block.** This packet holds no record that you are represented by counsel, which is why the block is blank. The motion now says only that counsel completes it or nobody does."),
    bullet("**The four felony-charge identifier lines on the order.** This packet writes none of them. The order now says only that they are yours to complete before the motion is filed, and where to take them from."),
    ""
  );

  lines.push(
    "",
    `## Everything the committed record requires to be in place before filing (all ${recordRequiredBeforeFiling.length} item(s) it lists)`,
    "",
    "This list is the packet set's own. Some items are yours, some belong to the district attorney, the clerk or the judge. Every one of them is reproduced here, in the record's own words and in the record's own order, so that nothing on it reaches you shortened. Where an item describes a document this packet does not contain, or names a form this track does not use, the record's words are printed unchanged and a correction is added beneath them.",
    ""
  );
  recordRequiredBeforeFiling.forEach((item, index) => {
    lines.push(bullet(`Item ${index + 1} of ${recordRequiredBeforeFiling.length}: ${item}`));
    for (const correction of reconcile(item)) lines.push(`  - ${correction}`);
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
    "The blanks on that list the record singles out are the ORIGINAL felony arrest charges and whether the misdemeanour conviction arose out of that same arrest. The first is the entry being expunged, so it must match your rap sheet exactly and must be the original arrest charge rather than the charge you were finally convicted of; the committed record says so in terms. The second is a condition on which self-help stops if it is unclear, and so is a rap sheet that conflates more than one arrest event.",
    "",
    `## What you must obtain or confirm before filing (${actions.length} item(s) held by the committed track registry)`,
    ""
  );
  for (const action of actions) {
    const qualifier = action.requirement === "conditional" && action.conditionDescription ? ` Condition: ${action.conditionDescription}` : "";
    const from = action.obtainedFrom ? ` Obtained from: ${action.obtainedFrom}.` : "";
    lines.push(bullet(`**${action.kind}** (${action.requirement}${action.requiredBeforeFiling ? ", required before filing" : ""}): ${action.description}${from}${qualifier}`));
    for (const correction of reconcile(`${action.description} ${action.howToObtain ?? ""}`)) lines.push(`  - ${correction}`);
  }

  lines.push("", `## The documents the record says you obtain and attach (${(memoTrack.supportingDocuments ?? []).length} item(s))`, "");
  for (const doc of memoTrack.supportingDocuments ?? []) {
    lines.push(bullet(`**${doc.name}** (${doc.requirement}${doc.requiredBeforeFiling ? ", required before filing" : ""}). From: ${doc.obtainedFrom}. ${doc.conditionDescription ? `Condition: ${doc.conditionDescription} ` : ""}${doc.howToObtain}`));
    for (const correction of reconcile(`${doc.name} ${doc.howToObtain ?? ""}`)) lines.push(`  - ${correction}`);
  }

  lines.push(
    "", "## Where this is filed", "",
    bullet(`Venue: ${registryTrack.venue}`),
    bullet(`Destination (${registryTrack.destination.kind}): ${registryTrack.destination.name}`),
    bullet(registryTrack.destination.detail),
    "", "## What it costs, and the fee exemption", "",
    bullet(`Fees: ${rules.fees}`),
    bullet(`Fee waiver: ${rules.feeWaiver}`),
    "", "## Notice, objection and service", ""
  );
  lines.push(bullet(`Notice and objection: ${rules.notice}`));
  for (const correction of reconcile(rules.notice)) lines.push(`  - ${correction}`);
  lines.push(bullet(`Service: ${rules.service}`));
  lines.push(
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
    bullet("Sign and date the unrepresented-mover block on the Article 994 motion yourself, after reading it. If you are represented, give the packet to your attorney; the attorney block belongs to counsel and is left blank here."),
    bullet("Leave the whole decretal section of the Article 995 Order blank: the election between a hearing and Affidavits of No Opposition, the granted-or-denied choice, BOTH reasons for denial, the date, the place, and the signature line above the word JUDGE. Every one of those is the court's, and the two denial reasons are judicial findings."),
    bullet("Leave the clerk's filed-on stamp, the clerk's certificate of service and the district attorney and Bureau lines of the PLEASE SERVE list blank. Article 979 makes service the clerk's act."),
    bullet("The Article 990 Affidavit of Response is the responding entity's own instrument. It is not printed in this packet and you never complete it."),
    "", `## Stop self-help and get legal help (all ${stops.length} stop conditions the record holds)`, ""
  );
  stops.forEach((stop, index) => lines.push(bullet(`Stop ${index + 1} of ${stops.length}: ${stop}`)));

  lines.push("", `## Hard eligibility boundaries the record states (${(memoTrack.exclusions ?? []).length} exclusion(s))`, "");
  for (const exclusion of memoTrack.exclusions ?? []) lines.push(bullet(exclusion));
  lines.push("", `Waiting periods (${(memoTrack.waitingPeriods ?? []).length}):`, "");
  for (const period of memoTrack.waitingPeriods ?? []) lines.push(bullet(`${period.condition}: ${period.duration}`));

  lines.push("", `## The limitations counsel attached to the legal design (all ${(registryTrack.legalDesignLimitations ?? []).length})`, "");
  (registryTrack.legalDesignLimitations ?? []).forEach((limit, index) => {
    lines.push(bullet(`Limitation ${index + 1} of ${(registryTrack.legalDesignLimitations ?? []).length} (${limit.classification}): ${limit.statement}`));
  });

  lines.push("", "## What the committed record requires these instructions to carry", "", requiredGuidance.notes, "");
  lines.push("## What the committed record says about the Article 995 order itself", "", memoTrack.components.find((c) => c.role === "proposed_order").notes, "");

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
    ONLY_THE_FELONY_ARREST,
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
 * FIX142. The wrap used to measure against MAX_WIDTH exactly, and
 * `widthOfTextAtSize` on a standard-14 font is a sum of AFM ADVANCE widths, not
 * the extent of the ink a renderer actually lays down. Measured on this
 * family's own delivered bytes at 300 dpi with pdftoppm -gray, the rendered ink
 * of a full line runs up to ~0.6% past the advance sum -- so a line the build
 * measured at 491.87pt drew ink to 494.88pt, 2.88pt outside the 492pt text box
 * the build declares. It was inside the paper and inside every clipping margin,
 * but the build was asserting a box it was not in fact holding. Lines are now
 * wrapped against a slightly narrower width so the RENDERED ink stays inside
 * the declared box; the assertion below still checks MAX_WIDTH, so the two
 * numbers cannot drift apart silently.
 */
const WRAP_SAFETY = 8;
const WRAP_WIDTH = MAX_WIDTH - WRAP_SAFETY;

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

async function proveWritesFromBytes(packetBytes, pageManifest, maps, facts, fixture, article995) {
  const pdf = await PDFDocument.load(packetBytes, { ignoreEncryption: true, updateMetadata: false });
  assert.equal(pdf.getPageCount(), pageManifest.length, "the page manifest must describe every packet page");
  const pageLines = pdf.getPages().map((page) => groupIntoLines(extractTextItems(page)).map((l) => l.text));
  const pageText = pageLines.map((lines) => lines.join(" ").replace(/\s+/g, " "));
  const byDocument = new Map();
  const linesByDocument = new Map();
  for (const [index, row] of pageManifest.entries()) {
    byDocument.set(row.documentId, `${byDocument.get(row.documentId) ?? ""} ${pageText[index]}`.replace(/\s+/g, " "));
    linesByDocument.set(row.documentId, [...(linesByDocument.get(row.documentId) ?? []), ...pageLines[index]]);
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
  /* The Legislature's own decretal words are proved from the output bytes too.
   * They are not participant writes and are not counted as added glyphs. */
  const orderText = byDocument.get(ORDER) ?? "";
  const statutoryTextProof = [
    { what: "Article 995 grant paragraph", sourceSha256: article995.sha256, chars: article995.grantParagraph.length, foundInOutputBytes: orderText.includes(sanitize(article995.grantParagraph).replace(/\s+/g, " ").trim()) },
    { what: "Article 995 further-ordered paragraph", sourceSha256: article995.sha256, chars: article995.furtherOrdered.length, foundInOutputBytes: orderText.includes(sanitize(article995.furtherOrdered).replace(/\s+/g, " ").trim()) },
    { what: "Article 995 denial-reason boxes", sourceSha256: article995.sha256, chars: article995.denialReasons.join(" ").length, foundInOutputBytes: article995.denialReasons.every((line) => orderText.includes(sanitize(line).replace(/\s+/g, " ").trim())) }
  ];
  for (const row of statutoryTextProof) {
    assert.equal(row.foundInOutputBytes, true,
      `${fixture}: the ${row.what} lifted from the bound Article 995 bytes is not readable from the finalized packet bytes`);
  }
  /*
   * NO INK ON THE JUDICIAL SIGNATURE LINE, MEASURED LINE BY LINE.
   *
   * The committed note makes this the controlling constraint on any rendering
   * of this order, so it is proved from the output rather than assumed from
   * intent -- and it is measured on the LINES of the order rather than on the
   * document's flattened text, because a flattened string runs the word JUDGE
   * straight into whatever follows it on the next line and would report ink
   * that is not there.
   */
  const orderLines = (linesByDocument.get(ORDER) ?? []).map((line) => line.trim()).filter((line) => line.length > 0);
  const judgeIndex = orderLines.findIndex((line) => line === "JUDGE");
  assert.ok(judgeIndex > 0,
    `${fixture}: the Article 995 order does not carry the statute's own JUDGE line alone on its own line; the committed note requires the rendering to carry that word and no signature label of its own`);
  const judgeRule = orderLines[judgeIndex - 1];
  const ruleHasInk = /[A-Za-z0-9]/.test(judgeRule);
  assert.equal(ruleHasInk, false,
    `${fixture}: the rule above the Article 995 JUDGE line carries ink ("${judgeRule.slice(0, 60)}")`);
  const labelledSignature = orderLines.some((line) => /signature/i.test(line) && /judge/i.test(line));
  assert.equal(labelledSignature, false,
    `${fixture}: the Article 995 order carries a judicial signature LABEL; the committed note states the rendering carries no signature label at all`);
  return {
    actualWrites, glyphs, statutoryTextProof,
    judicialSignatureLine: {
      statutesOwnWordFoundAloneOnItsLine: "JUDGE",
      ruleAboveIt: judgeRule,
      ruleCarriesInk: false,
      anySignatureLabelOfThisBuildsOwn: false,
      measuredFrom: "the lines of the Article 995 order read back out of the finalized packet bytes"
    }
  };
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
  const article995 = await readArticle995FromItsOwnBytes(sources);

  const maps = [motionMap(), orderMap(), guideMap()];
  const rbf = requiredBeforeFilingFields(maps);

  if (checkOnly) {
    return {
      familyId: FAMILY_ID, status: "CHECK_ONLY",
      implementationStrategy: STRATEGY, custodyClass: CUSTODY_CLASS,
      authorityGrant: binding.ownerFamily.composedFromAuthority,
      proposedOrderComposedFromItsOwnBytes: { formId: ORDER, sha256: article995.sha256, anchorsAsserted: article995.anchorsAsserted.length, thusOrderedIsInterleaved: article995.thusOrderedIsInterleaved },
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
    const participantText = participantInstructions(binding, rbf, facts["participant.full_legal_name"], article995);
    const filingText = filingInstructions(binding, facts["participant.full_legal_name"]);
    const bodies = [
      { componentId: COMPONENT.motion, documentId: MOTION, blocks: motionBody(facts, binding) },
      { componentId: COMPONENT.order, documentId: ORDER, blocks: orderBody(facts, article995) },
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
          sourceSha256: body.documentId === ORDER ? article995.sha256 : null,
          sourceClass: body.documentId === ORDER
            ? "composed_from_the_article_995_statutory_text_bound_by_digest"
            : "composed_from_the_committed_statutory_authority"
        });
      });
    }
    assert.deepEqual([...new Set(pageManifest.map((r) => r.component))], RENDERED_COMPONENTS);

    const packetBytes = Buffer.from(await packet.save({ useObjectStreams: false, updateMetadata: false }));
    const file = `${OUT}/fixtures/${fixture}.pdf`;
    fs.writeFileSync(path.join(ROOT, file), packetBytes);

    const proof = await proveWritesFromBytes(packetBytes, pageManifest, maps, facts, fixture, article995);
    const outsideBoxes = measureInk(drawnRows);
    proofs.push({
      fixture,
      proofMethod: "every declared write read back from the finalized packet bytes on the pages its document occupies; the Legislature's own decretal paragraphs read back the same way; and the judicial signature line measured for ink from the same bytes",
      valuesReportedByFinalizer: proof.actualWrites.length,
      addedGlyphsReadFromOutputBytes: proof.glyphs,
      flattenedWidgetAppearancesReadFromOutputBytes: 0,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: outsideBoxes,
      linesDrawn: drawnRows.length,
      refusedFieldsWithInk: [],
      statutoryTextReadBackFromOutputBytes: proof.statutoryTextProof,
      judicialSignatureLine: proof.judicialSignatureLine,
      actualWrites: proof.actualWrites
    });
    artifacts.push({
      fixture, file,
      sha256: sha256(packetBytes),
      byteLength: packetBytes.length,
      pageCount: packet.getPageCount(),
      pageManifest,
      components: RENDERED_COMPONENTS,
      documents: [MOTION, ORDER, GUIDE]
    });
  }

  const canonicalFacts = FIXTURES.canonical;
  const participantText = participantInstructions(binding, rbf, canonicalFacts["participant.full_legal_name"], article995);
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
      whyNotGenerated: "the condition is that the participant may qualify for the Article 983(F) exemption, and Article 985.1(C) applies the ordinary Article 983 fee provisions. The Article 983(F) grounds are non-conviction grounds - acquittal of all charges, no prosecution within the time limitation, dismissal or refusal, factual innocence, or a juvenile drug-court exemption - and this track's own predicate is a MISDEMEANOUR CONVICTION arising out of the felony arrest, so no fixture establishes any of them. The record's own words about the exemption and the non-refundable fee are carried in the participant and filing instructions, and item 5 of the record's required-before-filing list, which claims the packet gives the participant this form, is printed unchanged and corrected beneath."
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
    controllingArticle: "La. C.Cr.P. art. 985.1",
    whatThisTrackReaches: "only the entry of the ORIGINAL FELONY ARREST in the criminal history. The misdemeanour conviction that arose out of that arrest is not expunged by this track and stays on the record unless separately cleared under Article 977. The packet says so on the motion, on the proposed order, in the filing instructions and three times in the guide.",
    mandatoryForms: {
      motion: { officialFormId: MOTION, composedFrom: "the committed authority; no binary of Article 994 is retained by any Master Library edition" },
      order: {
        officialFormId: ORDER,
        composedFrom: "the Article 995 statutory text held byte-exact in custody and bound to this packet by content digest",
        sha256: article995.sha256,
        anchorsAssertedAgainstTheSourceBytes: article995.anchorsAsserted,
        legislaturesOwnWordsReproduced: ["the grant paragraph", "the further-ordered paragraph", "both denial-reason boxes", "the hearing-or-affidavits alternatives"],
        oneLineNotReproduced: {
          line: "THUS ORDERED AND SIGNED this ___ day of ___, 20___ at ___, Louisiana.",
          why: "the retained capture is a browser print whose text layer interleaves that line with the year and place blanks; extracted it reads as a mangled string. A mangled line does not go onto a proposed order a judge signs.",
          whatWasRenderedInstead: "its constituent blanks - day, month and year, and place - as the court-owned fields they are, beneath the heading THUS ORDERED AND SIGNED.",
          detectedAtBuildTime: article995.thusOrderedIsInterleaved,
          asExtracted: article995.thusOrderedAsExtracted
        },
        judicialBoundary: "the committed note states that the judge signs, so the rendering carries no signature label of its own: the statute's own word JUDGE sits beneath a blank rule. The election between a hearing and Affidavits of No Opposition, the granted-or-denied choice, both reasons for denial, the date and the place all render blank, and the absence of ink on the signature line is proved from the output bytes rather than asserted."
      }
    },
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
    allSourcesExactNote: "every declared digest was resolved by content digest across the mounted corpus and re-hashed from the resolved bytes",
    resolutionRule: "sources are resolved by SHA-256 across the mounted corpus and never by declared path; the declared path is recorded as the thing that was declared",
    priorCustodyClassOnTheQueueRow: binding.queueFamily.sourceReadiness?.custodyClass ?? null,
    priorCustodyClassContradicted: "the queue row's nested sourceReadiness.custodyClass reads SOURCE_IDENTITY_UNRESOLVED while its own top-level sourceStatus reads SOURCE_BOUND_BY_HELD_BYTES with sourceBound true. This build resolved both declared digests byte-exact and re-hashed each from its resolved bytes, so the nested class is wrong. It is recorded here rather than reconciled by this lane; MASTER_QUEUE.json is generated centrally and was not modified.",
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
      roleInThisPacket: row.sha256 === ORDER_SOURCE_SHA256
        ? "THE STATUTORY TEXT THIS PACKET'S PROPOSED ORDER IS COMPOSED FROM. Its structural anchors are asserted against these bytes at build time and the Legislature's own decretal paragraphs are lifted from them onto the Article 995 order."
        : "authority reference bound by digest; the Article 990 affidavit of response is the responding entity's own instrument and is not a rendered component of this packet"
    })),
    proposedOrderComposedFromSourceBytes: {
      documentId: ORDER,
      componentId: COMPONENT.order,
      sha256: article995.sha256,
      resolvedPath: article995.resolvedPath,
      declaredPath: article995.declaredPath,
      sourceByteLength: article995.byteLength,
      sourcePageCount: article995.pageCount,
      anchorsAsserted: article995.anchorsAsserted,
      statutorySourceNote: article995.statutorySourceNote,
      reproducedVerbatim: {
        grantParagraphChars: article995.grantParagraph.length,
        furtherOrderedChars: article995.furtherOrdered.length,
        denialReasons: article995.denialReasons
      },
      sourceFidelityCaveat: {
        line: "THUS ORDERED AND SIGNED this ___ day of ___, 20___ at ___, Louisiana.",
        problem: "the retained Article 995 capture is a legis.la.gov browser print whose text layer INTERLEAVES this line with the year and place blanks.",
        asExtracted: article995.thusOrderedAsExtracted,
        interleavingDetectedAtBuildTime: article995.thusOrderedIsInterleaved,
        treatment: "the line is NOT lifted verbatim. Its constituent blanks - day, month and year, and place - are rendered as court-owned fields beneath the heading THUS ORDERED AND SIGNED. This is a defect in the capture's text layer rather than in the statute, and it is one more reason the record's own open question about a court-ready rendering of these articles is not answered by this build."
      }
    },
    documents: RENDERED_COMPONENTS.map((componentId) => ({
      documentId: DOCUMENT_OF[componentId],
      componentId,
      composed: true,
      sha256: componentId === COMPONENT.order ? article995.sha256 : null,
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
    authorityGrantDiscrepancy: {
      what: "This family's composedFromAuthority names LA-CCRP-ART-988 and LA-CCRP-ART-994. It does not name LA-CCRP-ART-995, which is the officialFormId of the REQUIRED proposed order on the same owner's packet-set manifest and is the second of this family's two bound sources.",
      whereItIsNamed: "the determination's own operative text names it inside a numbered range: 'The statutory forms prescribed by Louisiana C.Cr.P. arts. 987 through 995 and 998 are treated uniformly as COMPOSE_FROM_AUTHORITY.'",
      alsoOmittedBy: "MASTER_QUEUE.json for this family lists forms, sourceIds and sourceReadiness.satisfiedByAuthority of 988 and 994 only, while its own sourceHashes bind the Article 995 text.",
      howThisBuildTreatedIt: "It composed the Article 995 order under the determination's numbered range rather than under this family's own summary of it, asserted both halves at build time so neither can drift silently, and recorded the reading here and in build-findings.json rather than assuming it. It is put to counsel in approval-request.json. The same discrepancy shape appears on la-977d-marijuana-first-offense-set for Article 998.",
      notEditedHere: "OWNER_DETERMINATIONS_2026-09-02.json and MASTER_QUEUE.json are central records and were not modified by this lane."
    },
    authorityCurrentness: {
      reviewedAsOf: binding.registryTrack.reviewedAsOf,
      effectiveFrom: binding.registryTrack.effectiveFrom,
      effectiveTo: binding.registryTrack.effectiveTo,
      legalInputStatus: binding.queueFamily.legalInputStatus,
      legalStatus: binding.registryTrack.legalStatus,
      articleAmendmentHistory: "the committed memo records that Article 985.1 has not been amended since Acts 2014, No. 145, and that the mechanism was confirmed against the current official text."
    },
    groundingRecords: binding.pins,
    composedComponentsAuthoredByThisBuild: RENDERED_COMPONENTS,
    commercialRoutesOpened: 0,
    whatThisReceiptDoesNotEstablish: [
      "independent verification, raster acceptance, visual acceptance, counsel approval, or approval for participant delivery",
      "that this participant's misdemeanour conviction in fact arose out of the original felony arrest, which Article 985.1(A) requires and which is left blank",
      "that the original felony arrest can be identified unambiguously on the participant's rap sheet",
      "that the misdemeanour conviction is cleared by anything in this packet: it is not, and the packet says so",
      "that this composition is the court-ready rendering of Articles 994 and 995 the record says must be confirmed before release",
      "that any commercial route is open"
    ]
  });

  writeJson(`${OUT}/production-field-map.json`, {
    schemaVersion: "rcap-official-form-field-map/v1-census-v1",
    familyId: FAMILY_ID,
    trackId: TRACK_ID,
    jurisdiction: JURISDICTION,
    routeKeys: binding.queueFamily.routeKeys,
    statute: "La. C.Cr.P. art. 985.1",
    mandatoryForms: [MOTION, ORDER],
    legalName: binding.registryTrack.legalName,
    implementationStrategy: STRATEGY,
    renderStrategy: "the mandatory Article 995 order composed from its own source bytes, with the Article 994 motion composed from the committed authority",
    sourceAuthority: OWNER_DECISION,
    componentSet: RENDERED_COMPONENTS,
    pageOrder: RENDERED_COMPONENTS,
    componentsNotGenerated: notGenerated,
    routeSelectionNote: "This packet is built for exactly one route: INTERIM expungement of an original FELONY ARREST from the criminal history, under La. C.Cr.P. art. 985.1, where the mover was convicted of a misdemeanour arising out of that arrest. The route is stated on the face of the motion in its title and recitals and again on the proposed Article 995 order, and what the route does NOT reach - the misdemeanour conviction itself - is stated on both documents and in the guide rather than left for a reader to infer. What is NOT stated by the packet is whether this particular misdemeanour conviction in fact arose out of this particular felony arrest: the route fixes the article and the forms, the case fixes that answer, so the election is declared determinedByTheCaseNotTheRoute with the reason recorded, left blank, and disclosed beside the record's own first self-help stop condition.",
    routeSelectionsMade: [{
      option: "ARTICLE_985_1_INTERIM_EXPUNGEMENT_OF_A_FELONY_ARREST",
      authority: "La. C.Cr.P. art. 985.1, on the Article 994 statutory motion and the Article 995 statutory order",
      statedOnTheFaceOfThePacket: "the motion is titled and prayed as a motion for interim expungement of a felony arrest under Article 985.1, and the proposed order is the Article 995 Order of Expungement of Interim Arrest Record",
      routeDetermined: true
    }],
    electionsLeftToTheParticipantAndWhy: [{
      field: `${MOTION}.same_arrest_event`,
      option: "WHETHER_THE_MISDEMEANOUR_CONVICTION_AROSE_OUT_OF_THAT_FELONY_ARREST",
      determinedByTheCaseNotTheRoute: true,
      whyTheRouteCannotDetermineIt: "the route determines the ARTICLE and the forms and not whether this particular misdemeanour conviction arose out of this particular felony arrest. That is established by the bill of information and the minute entry, and the committed record makes it a self-help stop condition when it is unclear rather than something a packet decides."
    }],
    judicialBoundaryOnTheOrder: {
      statedByTheRecord: "the judge signs, so the rendering carries no signature label at all, and every decretal election, the granted-or-denied choice, both reasons-for-denial boxes, the date, the place and the judge's signature must render blank. LegalEase supplies the caption and the felony charge identifiers and nothing else.",
      howThisBuildHonouredIt: "the signature line carries the statute's own word JUDGE beneath a blank rule and no invented label; both denial-reason boxes, the hearing-or-affidavits election, the granted-or-denied choice, the day, the month and year and the place are all classified court-owned and print blank; and the absence of ink on the signature line is measured from the finalized packet bytes on every fixture."
    },
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
    documentSet: [MOTION, ORDER, GUIDE],
    boundAuthorityReferences: sources.resolved.map((row) => ({
      sourceId: row.sourceId,
      resolvedPath: row.resolvedPath,
      sha256: row.sha256,
      renderedIntoThePacket: row.sha256 === ORDER_SOURCE_SHA256,
      howRendered: row.sha256 === ORDER_SOURCE_SHA256
        ? "its structural anchors were asserted and the Legislature's own decretal paragraphs were lifted from these bytes onto the Article 995 order; no page image of the source is in the packet"
        : "bound by digest as an authority reference; no part of it is in the packet"
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
    note: "Each declared fixture value was read back from the finalized packet bytes on the pages its document occupies. The Legislature's own decretal paragraphs, lifted from the bound Article 995 source, were read back the same way and are reported separately because they are statutory text rather than participant writes. The judicial signature line was measured for ink from the same bytes.",
    documents: proofs,
    artifacts: proofs.map((p) => ({
      fixture: p.fixture,
      valuesReportedByFinalizer: p.valuesReportedByFinalizer,
      addedGlyphsReadFromOutputBytes: p.addedGlyphsReadFromOutputBytes,
      flattenedWidgetAppearancesReadFromOutputBytes: p.flattenedWidgetAppearancesReadFromOutputBytes,
      nonWhitespaceGlyphsOutsideMeasuredWriteBoxes: p.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes,
      linesDrawn: p.linesDrawn,
      refusedFieldsWithInk: p.refusedFieldsWithInk,
      statutoryTextReadBackFromOutputBytes: p.statutoryTextReadBackFromOutputBytes,
      judicialSignatureLine: p.judicialSignatureLine
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
    question: "Is the caption, the controlling authority, the eligibility recital, the FORMS and the prayer on this packet this family's own, or a sibling's?",
    whyItIsAsked: "Louisiana runs six expungement tracks off six articles that share a caption shape. This track uses two forms no sibling uses, and one line of its own committed record names a sibling's Article 991 order.",
    controllingArticle: "La. C.Cr.P. art. 985.1",
    mandatoryForms: [MOTION, ORDER],
    legalNameFromTheRecord: binding.registryTrack.legalName,
    assertedAtBuildTime: [
      "registryTrack.legalName matches /art\\. 985\\.1/i",
      "memoTrack.controllingAuthority.summary matches /Article 985\\.1\\(A\\)/",
      "memoTrack.controllingAuthority.citations[0] === 'La. C.Cr.P. art. 985.1'",
      "the required primary filing component's officialFormId === 'LA-CCRP-ART-994'",
      "the required proposed order component's officialFormId === 'LA-CCRP-ART-995'",
      "registryTrack.rules.filing names Articles 994 and 995 as this track's forms",
      "the committed exclusions still state that the misdemeanour conviction itself is not expunged by this track",
      "the committed waiting periods still state that Article 985.1(D) disapplies the sibling time limitations",
      `all ${ARTICLE_995_ANCHORS.length} Article 995 structural anchors are present in the bound source bytes`
    ],
    captionFieldsWrittenOnEveryFilingDocument: CAPTION_WRITES(MOTION).map((row) => ({ id: row.field.split(".").pop(), label: row.effectiveLabel, factId: row.factId })),
    documentsCarryingTheCaption: [MOTION, ORDER],
    articleSpecificText: {
      motionTitle: "MOTION FOR INTERIM EXPUNGEMENT OF A FELONY ARREST FROM CRIMINAL HISTORY",
      orderTitle: "ORDER OF EXPUNGEMENT OF INTERIM ARREST RECORD",
      eligibilityRecital: "Article 985.1(A)'s felony arrest that resulted in a misdemeanour conviction arising out of that same arrest, with Article 985.1(B)'s separate-and-distinct rule, Article 985.1(D)'s disapplication of the sibling time limitations and its permission of more than one interim expungement, and Article 977(C)(1)'s preservation of the route through the sex-offence exclusion",
      prayer: "an order directing the Bureau to expunge the entry of the named felony charges from the criminal history and directing the clerk, the district attorney and the arresting agency to expunge them from public indices - in the Legislature's own Article 995 words",
      theSentenceThisTrackMustCarry: "only the original felony arrest is expunged; the misdemeanour conviction stays unless separately cleared under Article 977",
      whatIsNotOnThisPacket: "no Article 989 motion, no Article 991 order, no Article 992 order of expungement, no arrest-without-conviction grounds list, no first-offence-marijuana recital and no Article 985 redaction paragraph."
    },
    recordLinesThatNameASiblingsFormAndAreCorrectedInTheGuide: [
      "registryTrack.rules.notice: \"...the Article 991 Order states that no contradictory hearing is required and the motion may be granted ex parte.\" There is no Article 991 order on this track; the Article 995 order carries its own alternative to a hearing on its face."
    ],
    howTheyAreTreated: "printed verbatim and corrected beneath, by code that compares the article a line names against the forms this packet actually renders rather than by a hardcoded exception.",
    siblingFamiliesThisPacketMustNotResemble: [
      "la-976-arrest-no-conviction-set", "la-977-misdemeanor-conviction-set", "la-977d-marijuana-first-offense-set",
      "la-978-felony-conviction-set", "la-985-expungement-by-redaction-set", "la-987-set-aside-and-dismiss-set"
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
        treatment: "Its absence from a sparse worktree is a resolver artefact and never evidence that a source is missing, so this build resolves by content digest across every custody root that IS mounted and records, per source, whether the declared path was among them."
      },
      {
        finding: "This family's composedFromAuthority names Articles 988 and 994 and does NOT name Article 995, which is the officialFormId of the required proposed order on the same owner's packet-set manifest and is one of this family's two bound sources. MASTER_QUEUE.json omits it the same way.",
        treatment: "The determination's own operative text names arts. 987 through 995 by number and directs that they be generated faithfully from the current codified article text. This build composed the Article 995 order under that numbered range rather than under this family's own summary of it, asserted both halves at build time so neither can drift silently, and recorded the reading in source-receipt.json and as the first counsel question. The same discrepancy shape appears on la-977d-marijuana-first-offense-set for Article 998. No central record was modified."
      },
      {
        finding: "registryTrack.rules.notice for this track says that 'the Article 991 Order states that no contradictory hearing is required'. There is no Article 991 order on this track.",
        treatment: "Article 986 makes Articles 994 and 995 the forms for this track and the same registry's filing rule says so; the Article 995 order carries its own alternative to a hearing on its face, 'Affidavits of No Opposition filed,', which the packet set's own item 6 names correctly. The record's words are printed unchanged in the guide and corrected beneath them, by code that compares the article a line names against the forms this packet actually renders. The registry is a central record and was not modified."
      },
      {
        finding: "The Article 995 proposed order is a mandatory statutory form whose committed note requires that a rendering reproduce the Legislature's own words rather than paraphrase them.",
        treatment: `The Article 995 statutory text is this family's second bound source and is held byte-exact. It is opened by digest at build time, ${article995.anchorsAsserted.length} structural anchors are asserted against its bytes before anything is drawn, and the Legislature's own grant paragraph, further-ordered paragraph, denial-reason boxes and hearing-or-affidavits alternatives are lifted from those bytes and printed verbatim. Each is then read back from the finalized packet bytes and reported in reports/actual-writes.json.`
      },
      {
        finding: "ONE LINE OF THE ARTICLE 995 SOURCE IS NOT REPRODUCED, AND THIS IS A DEFECT IN THE RETAINED CAPTURE RATHER THAN IN THE STATUTE. The retained Article 995 asset is a legis.la.gov browser print whose text layer INTERLEAVES the 'THUS ORDERED AND SIGNED this ___ day of ___, 20___ at ___, Louisiana.' line with the year and place blanks. Extracted, it reads as a mangled string.",
        treatment: `The line is not lifted. Its constituent blanks - day, month and year, and place - are rendered as the court-owned fields they are, beneath the heading THUS ORDERED AND SIGNED. The interleaving is DETECTED at build time rather than assumed from a stale observation (${article995.thusOrderedIsInterleaved}), so a clean capture would stop the caveat being printed. It is recorded in source-receipt.json and is one more reason the record's own open question about a court-ready rendering of these articles is not answered here.`
      },
      {
        finding: "The committed note for the Article 995 order fixes the judicial boundary in terms: the judge signs, so the rendering carries NO SIGNATURE LABEL AT ALL, and every decretal election, the granted-or-denied choice, both reasons-for-denial boxes, the date, the place and the judge's signature must render blank.",
        treatment: "The signature line carries the statute's own word JUDGE beneath a blank rule and no invented label of this build's own. The hearing-or-affidavits election, the granted-or-denied choice, both denial-reason boxes, the day, the month and year and the place are all classified court-owned and print blank. The absence of ink on the judicial signature line is MEASURED from the finalized packet bytes on both fixtures rather than asserted from intent."
      },
      {
        finding: "A TENSION IN THE RECORD THIS BUILD COULD NOT RESOLVE. The Article 995 component note says LegalEase supplies 'the felony charge identifiers'. The same committed memo makes originalFelonyArrestCharges a REQUIRED PARTICIPANT INPUT, and the packet set makes checking that answer against the background check a required-before-filing action. The platform holds no value for it.",
        treatment: "The identifiers render as the statute's own blank lines - La. R.S. ____ : ____ and Name of Offense ____ - are declared REQUIRED_BEFORE_FILING, and reach the participant through the guide's supply table with the record's own warning to take the ORIGINAL arrest charge rather than the amended one. A guessed felony charge on a proposed order is worse than a blank. The tension is recorded and put to counsel rather than resolved by this lane."
      },
      {
        finding: "What this track does NOT reach is the thing most easily lost. Article 985.1 expunges only the original felony arrest entry; the misdemeanour conviction stays on the record unless separately cleared under Article 977, and the committed limitation says the packet must say so plainly.",
        treatment: "It is said on the face of the motion twice, in the motion's prayer, on the proposed order's own preamble by implication of its title, at the head of the filing instructions, and three times in the participant guide including as the first substantive section. The build also asserts that the committed exclusion still states it before printing it."
      },
      {
        finding: "The Article 988 fee-exemption component is conditional and its condition is not met on this track.",
        treatment: "It is not generated. Article 985.1(C) applies the ordinary Article 983 fee provisions and the Article 983(F) grounds are non-conviction grounds, while this track's own predicate is a misdemeanour conviction arising out of the felony arrest. Item 5 of the record's required-before-filing list nonetheless says 'The packet gives you the Article 988 form with your own fields filled in'; those words are printed unchanged and corrected beneath them everywhere they appear, with the non-refundable fee consequence stated."
      },
      {
        finding: `The memo holds ${(binding.memoTrack.selfHelpStopConditions ?? []).length} self-help stop conditions, ${(binding.memoTrack.exclusions ?? []).length} exclusions, ${(binding.memoTrack.waitingPeriods ?? []).length} waiting-period entr(y/ies), ${(binding.memoTrack.manualCompletionItems ?? []).length} manual-completion items and ${(binding.memoTrack.supportingDocuments ?? []).length} supporting documents; the registry holds ${(binding.registryTrack.packetSet?.participantActionRequired ?? []).length} participant actions, ${(binding.packetSet.requiredBeforeFiling ?? []).length} required-before-filing items and ${(binding.registryTrack.legalDesignLimitations ?? []).length} legal-design limitations.`,
        treatment: "Every one is carried verbatim and numbered in participant-instructions.md, with the count printed beside it so short carriage is visible to the participant rather than only to a report."
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
      "THE AUTHORITY GRANT QUESTION THIS BUILD COULD NOT SETTLE: this family's composedFromAuthority names Articles 988 and 994 and omits Article 995, while the same owner's packet-set manifest makes the Article 995 order the REQUIRED proposed order and the determination's own operative text names arts. 987 through 995 by number. MASTER_QUEUE.json omits 995 the same way. This build composed the Article 995 order under the determination's numbered range. Confirm that reading, or correct the family grant. The identical shape appears on la-977d-marijuana-first-offense-set for Article 998.",
      "THE TENSION IN THE RECORD ABOUT THE FELONY CHARGE IDENTIFIERS: the Article 995 component note says LegalEase supplies them; the same memo makes originalFelonyArrestCharges a required participant input and the packet set makes confirming it against the rap sheet a required-before-filing action, and the platform holds no value for it. This build printed the statute's own blank lines and disclosed them rather than guessing a felony charge onto a proposed order. Confirm that treatment, or tell us where the identifiers are supposed to come from.",
      "THE RETAINED ARTICLE 995 CAPTURE HAS AN INTERLEAVED TEXT LAYER on the 'THUS ORDERED AND SIGNED this ___ day of ___, 20___ at ___, Louisiana.' line. This build did not lift a mangled line onto a proposed order and rendered its constituent blanks instead. Confirm the treatment, and treat the capture itself as needing replacement before any court-ready rendering is adopted.",
      "THE OPEN RELEASE-BLOCKING QUESTION THE RECORD ALREADY HOLDS: Articles 987, 988, 989, 991, 992 and 994 are retained by no Master Library Edition 1.1 asset. Article 994 is this track's REQUIRED primary filing and this build composed it from the committed authority alone, with no source binary of any kind. Confirm the canonical source form before release.",
      "registryTrack.rules.notice for this track names the Article 991 Order, which this track does not use. The guide prints it verbatim and corrects it. Confirm the correction and have the registry repaired centrally; this lane did not modify it.",
      "Confirm that leaving whether the misdemeanour conviction arose out of that same felony arrest blank, as determinedByTheCaseNotTheRoute, is right, rather than the packet asserting the Article 985.1(A) predicate.",
      "Confirm the Article 994 motion, composed from a description rather than from a source binary, carries the defendant-information and arrest sections faithfully against the current codified article text, and that Article 986(C) is satisfied by naming the court on its face.",
      "The committed record notes that Title XXXIV was amended three times in the 2024 Regular Session after the reviewed source notes, and recommends a scheduled annual re-verification for Louisiana. That re-verification has not run against this build, though the memo records that Article 985.1 itself has not been amended since Acts 2014, No. 145."
    ],
    mattersForTheReviewersAttention: [
      "Every committed record is pinned twice: by whole-file SHA-256 and by the SHA-256 of this family's own entry inside it.",
      "The proposed order is composed from its own statutory source bytes, bound by digest, with thirteen structural anchors asserted against them and the Legislature's own decretal paragraphs reproduced verbatim and read back from the output.",
      "The judicial signature line carries the statute's own word JUDGE and no invented label, and its absence of ink is measured from the output bytes on both fixtures.",
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
    proposedOrderComposedFromSourceBytes: {
      documentId: ORDER, sha256: article995.sha256,
      anchorsAsserted: article995.anchorsAsserted.length,
      thusOrderedLineNotLiftedBecauseTheCaptureInterleavesIt: article995.thusOrderedIsInterleaved
    },
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
