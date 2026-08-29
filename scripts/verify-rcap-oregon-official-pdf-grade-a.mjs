#!/usr/bin/env node
// Focused gate on Oregon's official-PDF reference implementation.
//
//   node scripts/verify-rcap-oregon-official-pdf-grade-a.mjs
//   node scripts/verify-rcap-oregon-official-pdf-grade-a.mjs --mutations
//
// The family is OR:or-ojd-adult-set-aside-packet-motion-and-declaration — the
// Oregon Judicial Department's five-page Criminal Set-Aside (Adult Cases)
// packet, revision January 2026, sha256 b22cc346…. It is a flat PDF: no
// AcroForm, no XFA, no widget the participant's answer can be assigned to. Its
// pages 1 to 3 are the court's instructions and eligibility tables and pages 4
// and 5 are the motion and the declaration of eligibility the participant signs
// and files.
//
// What makes that dangerous, and what this gate is therefore about, is that a
// flat overlay writes at a coordinate rather than into a named field. Nothing
// in the file itself stops a value going onto the wrong page, into the court's
// signature line, into the citing agency's blank, or across the fingerprint
// number the participant is not the author of. So the checks here are not
// "did it render". They are:
//
//   1. the source is the exact document this implementation was measured from;
//   2. the census still describes that document, slot for slot;
//   3. the routes that would serve it are bound to this form and stay unsold;
//   4. every value in the finalized artifact sits at a coordinate the profile
//      declares, carries a value the fixture supplies, and lands on page 4 or 5;
//   5. no protected, court-owned, prosecutor-owned or agency-owned slot is
//      written in any fixture, and pages 1 to 3 are untouched;
//   6. the artifacts are the exact bytes the reports say they are, and all five
//      filing pages survive;
//   7. the real product path admits the route, pins the source, validates the
//      artifact and refuses to hand it to the wrong participant.
//
// Point 4 is read out of the artifact's own content streams rather than out of
// the reports, so a report that says a value was written where it was not
// cannot satisfy this gate.
//
// The source binary lives under the git-ignored private/ corpus and is never
// committed. Following the repository's settled rule that a source is judged by
// its identity rather than by whether Git holds the bytes, identity is proven
// against the committed corpus index, the source record and the pack manifest
// digest. When the corpus IS mounted the bytes are hashed and must agree; when
// it is not, that is reported as an unproven direction rather than passed over.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const MUTATIONS = process.argv.includes("--mutations");

const JURISDICTION = "OR";
const DOCUMENT_ID = "OR-OJD-ADULT-SET-ASIDE-PACKET";
const FAMILY = "or-ojd-adult-set-aside-packet-motion-and-declaration";
const SOURCE_SHA = "b22cc346caf6c38730e9992d74016e948180d92b379b6592ab333b06ac880071";
const SOURCE_BYTES = 256978;
const SOURCE_PAGES = 5;
// Pages 1 to 3 are the court's instructions. Nothing this lane writes may reach
// them, and no participant blank exists on them to write into.
const INSTRUCTION_PAGES = [1, 2, 3];
const FILING_PAGES = [4, 5];

const FAMILY_DIR = `data/rcap-all50/overlays/production/oregon/${FAMILY}`;
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const REGISTRY = "data/record-clearing/factory-v2-route-registry.json";
const PACKET_SETS = "data/record-clearing/legal-design-packet-set-manifests.json";
const CORPUS_ROOT = "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const bytesOf = (rel) => fs.readFileSync(path.join(rootDir, rel));
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const { PDFDocument, PDFName, PDFArray, StandardFonts } = await import("pdf-lib");

// Real Helvetica metrics, so "does this value fit the blank it was written into"
// is measured rather than estimated. A clipped value on a filed motion is a
// defect the participant cannot see and the clerk cannot read.
const measuringDoc = await PDFDocument.create();
const helvetica = await measuringDoc.embedFont(StandardFonts.Helvetica);
const { resolvePacketRoute, packetRouteCanRender } = await import(
  "../src/lib/rcap/documents/packet-route-resolver.ts"
);
const jobContract = await import("../src/lib/rcap/render/job-contract.ts");
const { authorizePacketDownload } = await import("../src/lib/rcap/render/packet-delivery.ts");

// ---------------------------------------------------------------------------
// Reading what the artifact actually draws.
//
// The factory writes participant values in its own ink and as hex strings, so
// the values do not appear as literals anywhere in the file. Each write is
// recovered from the page's content streams with its font size and its text
// matrix, which is the coordinate the value was placed at. Anything drawn in
// another colour is the official document's own content and is not a write this
// lane made.
// ---------------------------------------------------------------------------

const WRITE_OPERATOR =
  /0 0 0\.55 rg\s*\/(\S+)\s+([\d.]+)\s+Tf[\s\S]{0,80}?1 0 0 1 (-?[\d.]+) (-?[\d.]+) Tm\s*<([0-9A-Fa-f]*)>\s*Tj/g;

function inflate(buf) {
  try {
    return zlib.inflateSync(buf);
  } catch {
    try {
      return zlib.inflateRawSync(buf);
    } catch {
      return buf;
    }
  }
}

async function readPdf(rel) {
  const buf = bytesOf(rel);
  const doc = await PDFDocument.load(buf, { updateMetadata: false });
  const ctx = doc.context;
  const pages = doc.getPages();
  const writes = [];

  pages.forEach((page, index) => {
    const contents = page.node.get(PDFName.of("Contents"));
    const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    for (const ref of refs) {
      const stream = ctx.lookup(ref);
      if (!stream) continue;
      const raw = Buffer.from(stream.contents ?? stream.getContents());
      const text = inflate(raw).toString("latin1");
      WRITE_OPERATOR.lastIndex = 0;
      let match;
      while ((match = WRITE_OPERATOR.exec(text))) {
        writes.push({
          page: index + 1,
          fontSize: Number(match[2]),
          x: Number(match[3]),
          y: Number(match[4]),
          text: Buffer.from(match[5], "hex").toString("latin1")
        });
      }
    }
  });

  let acroFieldCount = 0;
  try {
    acroFieldCount = doc.getForm().getFields().length;
  } catch {
    acroFieldCount = 0;
  }

  return {
    bytes: buf,
    sha256: sha256(buf),
    byteLength: buf.length,
    pageCount: pages.length,
    geometry: pages.map((page, index) => {
      const size = page.getSize();
      return { page: index + 1, width: Math.round(size.width), height: Math.round(size.height) };
    }),
    acroFieldCount,
    writes
  };
}

// ---------------------------------------------------------------------------
// The evidence this gate reads. Loaded once; the mutation pass deep-clones it.
// ---------------------------------------------------------------------------

async function loadEvidence() {
  const corpusIndex = read(CORPUS_INDEX);
  return {
    corpusEntry: (corpusIndex.entries ?? []).find((entry) => entry.sha256 === SOURCE_SHA) ?? null,
    corpusVerification: corpusIndex.importVerification ?? {},
    sourceRecord: read(`${FAMILY_DIR}/source-record.json`),
    census: read(`${FAMILY_DIR}/field-census.json`),
    classification: read(`${FAMILY_DIR}/field-classification.json`),
    policy: read(`${FAMILY_DIR}/field-classification-policy.json`),
    profile: read(`${FAMILY_DIR}/overlay-profile.json`),
    canonical: read(`${FAMILY_DIR}/fixtures/canonical.json`),
    boundary: read(`${FAMILY_DIR}/fixtures/boundary.json`),
    negative: read(`${FAMILY_DIR}/fixtures/negative.json`),
    rendered: read(`${FAMILY_DIR}/reports/rendered-artifacts.json`),
    populated: read(`${FAMILY_DIR}/reports/populated-fields.json`),
    protectedFields: read(`${FAMILY_DIR}/reports/protected-fields.json`),
    protectedScan: read(`${FAMILY_DIR}/reports/protected-fields-scan.json`),
    overflow: read(`${FAMILY_DIR}/reports/overflow-and-clipping.json`),
    activeContent: read(`${FAMILY_DIR}/reports/active-content.json`),
    mutationTests: read(`${FAMILY_DIR}/reports/mutation-tests.json`),
    contactSheet: read(`${FAMILY_DIR}/reports/contact-sheet-proof.json`),
    sourceFidelity: read(`${FAMILY_DIR}/reports/source-fidelity.json`),
    visualReview: read(`${FAMILY_DIR}/reports/visual-review.json`),
    summary: read("data/rcap-all50/overlays/production/oregon/jurisdiction-summary.json"),
    registry: read(REGISTRY),
    packetSets: read(PACKET_SETS),
    artifacts: {
      canonical: await readPdf(`${FAMILY_DIR}/fixtures/canonical-filled.pdf`),
      boundary: await readPdf(`${FAMILY_DIR}/fixtures/boundary-filled.pdf`),
      contactSheet: await readPdf(`${FAMILY_DIR}/contact-sheet/blank-vs-filled.pdf`)
    }
  };
}

// ---------------------------------------------------------------------------
// The checks.
// ---------------------------------------------------------------------------

function staticFailures(evidence) {
  const out = [];
  const fail = (ok, message) => {
    if (!ok) out.push(message);
  };
  const {
    corpusEntry,
    sourceRecord,
    census,
    classification,
    policy,
    profile,
    canonical,
    boundary,
    negative,
    rendered,
    populated,
    protectedFields,
    protectedScan,
    overflow,
    activeContent,
    mutationTests,
    contactSheet,
    sourceFidelity,
    visualReview,
    summary,
    registry,
    packetSets,
    artifacts
  } = evidence;

  // -- I. Source identity ---------------------------------------------------
  // The document this implementation was measured from, named the same way by
  // every record that claims to describe it.
  fail(corpusEntry !== null, `I-corpus: no corpus-index entry carries ${SOURCE_SHA}`);
  if (corpusEntry) {
    fail(corpusEntry.state === JURISDICTION, `I-state: the corpus entry is filed under ${corpusEntry.state}`);
    fail(corpusEntry.formNumber === DOCUMENT_ID, `I-form: the corpus entry names ${corpusEntry.formNumber}`);
    fail(corpusEntry.byteLength === SOURCE_BYTES, `I-bytes: the corpus entry records ${corpusEntry.byteLength} bytes`);
    fail(corpusEntry.pageCount === SOURCE_PAGES, `I-pages: the corpus entry records ${corpusEntry.pageCount} pages`);
    fail(corpusEntry.acroFormPresent === false, "I-acroform: the corpus entry reports an AcroForm on a flat document");
    fail(corpusEntry.xfaPresent === false, "I-xfa: the corpus entry reports XFA on a flat document");
    fail(corpusEntry.acroFieldCount === 0, `I-widgets: the corpus entry counts ${corpusEntry.acroFieldCount} widgets on a flat document`);
    fail(corpusEntry.structuralClassObserved === "flat_pdf", `I-structure: the corpus entry observed ${corpusEntry.structuralClassObserved}`);
    fail(corpusEntry.loadError === null, `I-load: the corpus entry records a load error: ${corpusEntry.loadError}`);
  }
  fail(sourceRecord.sha256 === SOURCE_SHA, `I-record: the source record pins ${sourceRecord.sha256}`);
  fail(sourceRecord.declaredSha256 === SOURCE_SHA, "I-declared: the source record's declared digest is not this document");
  fail(sourceRecord.sha256VerifiedAgainstBundleManifest === true, "I-manifest: the digest was never checked against the pack manifest");
  fail(sourceRecord.byteLength === SOURCE_BYTES && sourceRecord.byteLengthMatches === true, "I-length: the source record's byte length does not agree with the manifest");
  fail(sourceRecord.documentId === DOCUMENT_ID, `I-id: the source record names ${sourceRecord.documentId}`);
  fail(sourceRecord.jurisdiction === JURISDICTION, `I-jurisdiction: the source record names ${sourceRecord.jurisdiction}`);
  fail(typeof sourceRecord.officialTitle === "string" && sourceRecord.officialTitle.trim() !== "", "I-title: the source record carries no official title");
  fail(typeof sourceRecord.revision === "string" && /^REV-/.test(sourceRecord.revision), `I-revision: the source record carries no revision, or an unrecognised one: ${sourceRecord.revision}`);
  fail(typeof sourceRecord.sourceUrl === "string" && sourceRecord.sourceUrl.includes("courts.oregon.gov"), "I-issuer: the source record does not name the Oregon Judicial Department as the issuing authority");
  fail(census.sha256 === SOURCE_SHA, `I-census-source: the census was taken from ${census.sha256}`);
  fail(profile.sha256 === SOURCE_SHA, `I-profile-source: the overlay profile is pinned to ${profile.sha256}`);
  fail(rendered.sourceSha256 === SOURCE_SHA, `I-render-source: the artifacts were rendered from ${rendered.sourceSha256}`);
  fail(sourceFidelity.sha256Matches === true && sourceFidelity.byteLengthMatches === true, "I-fidelity: the source-fidelity report does not record an exact match");
  fail(sourceFidelity.packManifestIsAuthority === true, "I-authority: the source-fidelity report does not treat the pack manifest as authority");
  // The strategy itself. A custom pleading standing in for this packet is the
  // one substitution the lane exists to prevent.
  fail(sourceRecord.renderStrategy === "flat_overlay", `I-strategy: the render strategy is ${sourceRecord.renderStrategy}, not an overlay onto the official PDF`);
  fail(sourceRecord.structuralClassAgrees === true && sourceRecord.pageCountAgrees === true && sourceRecord.fieldCountAgrees === true, "I-agrees: declared and observed structure disagree in the source record");

  // The corpus is git-ignored by design. When it is mounted the bytes decide;
  // when it is not, identity rests on the committed records above and the gate
  // says so rather than implying it hashed something.
  const mounted = corpusEntry ? path.join(rootDir, CORPUS_ROOT, corpusEntry.path) : null;
  const corpusPresent = Boolean(mounted && fs.existsSync(mounted));
  if (corpusPresent) {
    const buf = fs.readFileSync(mounted);
    fail(sha256(buf) === SOURCE_SHA, `I-bytes-mounted: the mounted binary hashes to ${sha256(buf)}`);
    fail(buf.length === SOURCE_BYTES, `I-bytes-length: the mounted binary is ${buf.length} bytes`);
  }

  // -- II. Census currentness ----------------------------------------------
  // The census is the complete inventory of the document's blanks. Every slot
  // must be classified, and the profile may not name a slot the census does not
  // have — that is how a coordinate invented for a page that does not exist, or
  // for a blank the document does not draw, is caught.
  const censusNames = new Set((census.fields ?? []).map((field) => field.name));
  const censusSlots = new Map((census.fields ?? []).map((field) => [field.name, field]));
  const classified = new Set((classification.entries ?? []).map((entry) => entry.name));
  const anchorSlots = new Set((profile.anchors ?? []).map((anchor) => anchor.slot));
  const unwritable = new Set(profile.unwritableFields ?? []);

  fail(census.fieldCount === (census.fields ?? []).length, "II-count: the census field count disagrees with its own list");
  fail(censusNames.size === (census.fields ?? []).length, "II-unique: the census repeats a slot name");
  fail(classified.size === censusNames.size && [...censusNames].every((name) => classified.has(name)), "II-coverage: the classification does not cover the census exactly");
  fail([...anchorSlots].every((slot) => censusNames.has(slot)), `II-anchor-slot: the profile writes into slots the census does not have: ${[...anchorSlots].filter((slot) => !censusNames.has(slot)).join(", ")}`);
  fail([...unwritable].every((slot) => censusNames.has(slot)), "II-unwritable-slot: the profile refuses slots the census does not have");
  fail([...anchorSlots].every((slot) => !unwritable.has(slot)), "II-partition: a slot is both written and declared unwritable");
  fail(anchorSlots.size + unwritable.size === censusNames.size, `II-partition-total: ${anchorSlots.size} written + ${unwritable.size} refused does not account for ${censusNames.size} slots`);

  const geometryOf = (list) => JSON.stringify((list ?? []).map((page) => [page.page, Math.round(page.width), Math.round(page.height)]));
  fail(geometryOf(census.pageGeometry) === geometryOf(sourceRecord.pageGeometry), "II-geometry: the census and the source record describe different pages");
  fail(geometryOf(profile.pageGeometry) === geometryOf(sourceRecord.pageGeometry), "II-geometry-profile: the overlay profile and the source record describe different pages");
  fail((sourceRecord.pageGeometry ?? []).length === SOURCE_PAGES, `II-page-count: the geometry describes ${(sourceRecord.pageGeometry ?? []).length} pages`);
  fail((sourceRecord.pageGeometry ?? []).every((page) => page.width === 612 && page.height === 792 && page.orientation === "portrait"), "II-letter: a page is not portrait US Letter");
  fail((census.fields ?? []).every((field) => field.page >= 1 && field.page <= SOURCE_PAGES), "II-page-range: a census slot sits on a page the document does not have");
  fail(sourceRecord.observedAcroFieldCount === 0 && sourceRecord.declaredFieldCount === 0, "II-flat: the source record claims widgets on a flat document");
  fail(sourceRecord.xfaPresent === false, "II-xfa-record: the source record reports XFA");
  fail(census.basis && /content stream/i.test(census.basis), "II-basis: the census does not record that it was measured from the document's own content");

  // -- III. Route and family binding ---------------------------------------
  const registryRoutes = (registry.routes ?? []).filter((route) => String(route.jurisdiction).toUpperCase() === JURISDICTION);
  fail(registryRoutes.length > 0, "III-routes: the factory_v2 registry admits no Oregon route at all");
  for (const route of registryRoutes) {
    fail((route.officialFormIds ?? []).includes(DOCUMENT_ID), `III-form ${route.pathwayKey}: the route is not bound to ${DOCUMENT_ID}`);
    fail((route.packetSetIds ?? []).length > 0, `III-set ${route.pathwayKey}: the route names no packet set`);
    fail(route.legacyGeneratorOwnsThisJurisdiction === false, `III-legacy ${route.pathwayKey}: Oregon is not a legacy-verified jurisdiction and must not be marked one`);
  }

  // Resolved through the canonical resolver, not read out of the registry file:
  // a route is admitted only if the shipped resolver says so.
  for (const route of registryRoutes) {
    const resolved = resolvePacketRoute({ state: JURISDICTION, pathway: route.pathwayId, trackId: null });
    fail(resolved.routeKind === "factory_v2", `III-resolve ${route.pathwayKey}: the resolver returned ${resolved.routeKind}`);
    fail(resolved.rendererKind === "packet_document_v1", `III-renderer ${route.pathwayKey}: the resolver returned renderer ${resolved.rendererKind}`);
    fail(packetRouteCanRender(resolved) === true, `III-render ${route.pathwayKey}: the resolved route cannot render`);
    fail((resolved.factoryV2?.officialFormIds ?? []).includes(DOCUMENT_ID), `III-resolved-form ${route.pathwayKey}: the resolved route is not bound to ${DOCUMENT_ID}`);
    // Commercial containment. Lane C produces candidate evidence; it never
    // opens a sale, and a resolver that started selling this route would be the
    // most expensive way for this work to go wrong.
    fail(resolved.sellable === false, `III-sellable ${route.pathwayKey}: the route resolved sellable`);
    fail(resolved.creditConsumable === false, `III-credit ${route.pathwayKey}: the route resolved credit-consumable`);
  }

  // Wrong state, wrong pathway and wrong family are all refused.
  const wrongState = resolvePacketRoute({ state: "WA", pathway: registryRoutes[0]?.pathwayId ?? "x", trackId: null });
  fail(wrongState.jurisdiction !== JURISDICTION, "III-wrong-state: an Oregon pathway resolved under another state's code");
  fail(wrongState.routeKind !== "factory_v2" || !(wrongState.factoryV2?.officialFormIds ?? []).includes(DOCUMENT_ID), "III-wrong-state-form: another state's route is bound to the Oregon packet");
  const wrongPathway = resolvePacketRoute({ state: JURISDICTION, pathway: "not-an-oregon-pathway", trackId: null });
  fail(wrongPathway.routeKind !== "factory_v2", `III-wrong-pathway: an unknown Oregon pathway resolved as ${wrongPathway.routeKind}`);
  fail(!(wrongPathway.factoryV2?.officialFormIds ?? []).includes(DOCUMENT_ID), "III-wrong-pathway-form: an unknown pathway is bound to the Oregon packet");

  // The packet family: the sets these routes name must place this document as a
  // filed component, through an official-PDF strategy rather than a summary.
  const setIds = new Set(registryRoutes.flatMap((route) => route.packetSetIds ?? []));
  const sets = (packetSets.packetSets ?? []).filter((set) => setIds.has(set.packetSetId));
  fail(sets.length === setIds.size, `III-manifest: ${setIds.size - sets.length} Oregon packet set(s) named by a route have no manifest`);
  for (const set of sets) {
    const components = (set.components ?? []).filter((component) => component.officialFormId === DOCUMENT_ID);
    fail(components.length > 0, `III-component ${set.packetSetId}: the packet set does not include ${DOCUMENT_ID}`);
    fail(components.every((component) => component.outputStrategy === "official_pdf_fill"), `III-strategy ${set.packetSetId}: a component using this packet does not fill the official PDF`);
    fail(components.some((component) => component.role === "primary_filing"), `III-primary ${set.packetSetId}: this packet is not the primary filing`);
    fail(components.every((component) => component.requirement === "required"), `III-required ${set.packetSetId}: a component using this packet is optional`);
    fail((set.participantActionRequired ?? []).length > 0, `III-participant-action ${set.packetSetId}: the set records no post-generation participant action`);
  }

  // -- IV. Field classification and protected-field denial ------------------
  const entryByName = new Map((classification.entries ?? []).map((entry) => [entry.name, entry]));
  const writableEntries = (classification.entries ?? []).filter((entry) => entry.writable === true);
  fail(classification.classCounts?.writable === writableEntries.length, "IV-counts: the classification's writable count disagrees with its entries");
  fail(writableEntries.length === anchorSlots.size, `IV-writable: ${writableEntries.length} slots are classified writable against ${anchorSlots.size} written by the profile`);
  fail(writableEntries.every((entry) => anchorSlots.has(entry.name)), "IV-writable-slot: a slot classified writable is not written by the profile");
  fail(writableEntries.every((entry) => FILING_PAGES.includes(entry.page)), "IV-writable-page: a slot classified writable sits outside the motion and declaration pages");
  for (const slot of unwritable) {
    const entry = entryByName.get(slot);
    fail(entry?.writable === false, `IV-refused ${slot}: refused by the profile but not classified unwritable`);
    fail(typeof entry?.reason === "string" && entry.reason.trim() !== "", `IV-reason ${slot}: refused without a recorded reason`);
  }
  // Every protected category the document actually carries is refused by name,
  // so a future re-binding cannot quietly start filling one.
  const protectedByCategory = protectedFields.byCategory ?? {};
  for (const category of ["signature", "agency", "prosecutor", "sensitive_fact"]) {
    fail((protectedByCategory[category] ?? 0) > 0, `IV-category ${category}: no slot is refused under this category, though the form carries one`);
  }
  fail(protectedFields.refusedCount === unwritable.size, `IV-refused-count: the protected-fields report counts ${protectedFields.refusedCount} refusals against ${unwritable.size} unwritable slots`);
  fail(policy.weakeningsApplied === "none — no D0 protect rule, type guard or readable-size floor was relaxed for this family", "IV-weakening: a protect rule, type guard or readable-size floor was relaxed for this family");
  fail((policy.explicitSensitiveMappingsAuthorized ?? []).length === 0, "IV-sensitive: a sensitive mapping was authorized for this family");
  fail(/Every field starts protected/i.test(policy.policy ?? ""), "IV-default: the classification policy does not start every field protected");
  fail(negative.negativeRenderPerformed === true && negative.fieldsWrittenWithNoFacts === 0, "IV-negative: the no-facts render wrote something, or was never performed");
  fail(protectedScan.performed === true && protectedScan.pass === true && (protectedScan.violations ?? []).length === 0, "IV-scan: the protected-field scan did not pass");
  fail((protectedScan.canonical?.unexplainedTokens ?? []).length === 0 && (protectedScan.boundary?.unexplainedTokens ?? []).length === 0, "IV-unexplained: a token in a finalized artifact is not explained by an expected value or the source");

  // -- V. Artifacts are the exact bytes the reports claim -------------------
  const declaredArtifacts = rendered.artifacts ?? {};
  const artifactPaths = {
    "fixtures/canonical-filled.pdf": artifacts.canonical,
    "fixtures/boundary-filled.pdf": artifacts.boundary,
    "contact-sheet/blank-vs-filled.pdf": artifacts.contactSheet
  };
  fail(Object.keys(declaredArtifacts).length === Object.keys(artifactPaths).length, "V-set: the rendered-artifacts report describes a different set of artifacts");
  for (const [name, artifact] of Object.entries(artifactPaths)) {
    const declared = declaredArtifacts[name];
    fail(declared !== undefined, `V-declared ${name}: not described by the rendered-artifacts report`);
    if (!declared) continue;
    fail(declared.sha256 === artifact.sha256, `V-hash ${name}: on disk ${artifact.sha256}, reported ${declared.sha256}`);
    fail(declared.bytes === artifact.byteLength, `V-bytes ${name}: on disk ${artifact.byteLength}, reported ${declared.bytes}`);
  }
  fail(rendered.deterministicRenderVerified === true, "V-deterministic: the render was never verified deterministic");
  fail(contactSheet.proof?.finalizedSha256 === artifacts.canonical.sha256, "V-sheet-binding: the contact sheet does not prove the canonical artifact on disk");
  fail(contactSheet.proof?.sheetSha256 === artifacts.contactSheet.sha256, "V-sheet-hash: the contact-sheet proof names a different sheet");

  // -- VI. All filing pages retained, and the document stays flat -----------
  for (const [name, artifact] of Object.entries(artifactPaths)) {
    if (name.startsWith("contact-sheet/")) continue;
    fail(artifact.pageCount === SOURCE_PAGES, `VI-pages ${name}: ${artifact.pageCount} pages, against ${SOURCE_PAGES} in the source`);
    fail(artifact.geometry.every((page) => page.width === 612 && page.height === 792), `VI-geometry ${name}: a page is not US Letter portrait`);
    fail(artifact.acroFieldCount === 0, `VI-flat ${name}: the finalized artifact carries ${artifact.acroFieldCount} form fields`);
  }
  fail(artifacts.contactSheet.pageCount === SOURCE_PAGES, `VI-sheet-pages: the contact sheet covers ${artifacts.contactSheet.pageCount} of ${SOURCE_PAGES} source pages`);
  fail(activeContent.result === "clean", `VI-active: the active-content scan returned ${activeContent.result}`);
  fail(activeContent.xfaPresentInSource === false, "VI-active-xfa: XFA in the source");
  fail((activeContent.finalizedScan?.hits ?? []).length === 0, "VI-active-hits: active content survives into the finalized artifact");

  // -- VII. Every write lands where the profile says, read from the bytes ---
  const anchorAt = new Map();
  for (const anchor of profile.anchors ?? []) {
    anchorAt.set(`${anchor.page}:${anchor.writeBox.x}:${anchor.writeBox.y}`, anchor);
  }

  const checkWrites = (label, artifact, fixture) => {
    const facts = fixture.facts ?? {};
    const written = fixture.written ?? [];
    const refused = new Set((fixture.refused ?? []).map((item) => item.anchor));

    fail(artifact.writes.length === written.length, `VII-count ${label}: the artifact carries ${artifact.writes.length} writes against ${written.length} the fixture records`);
    fail(artifact.writes.every((write) => FILING_PAGES.includes(write.page)), `VII-page ${label}: a value was written outside the motion and declaration pages`);
    for (const page of INSTRUCTION_PAGES) {
      fail(!artifact.writes.some((write) => write.page === page), `VII-instructions ${label}: page ${page} is the court's instructions and was written on`);
    }

    const seen = new Set();
    for (const write of artifact.writes) {
      const key = `${write.page}:${write.x}:${write.y}`;
      const anchor = anchorAt.get(key);
      fail(anchor !== undefined, `VII-anchor ${label}: a value was written at page ${write.page} (${write.x}, ${write.y}), which no anchor declares`);
      if (!anchor) continue;
      seen.add(anchor.label);
      fail(!refused.has(anchor.label), `VII-refused ${label}: "${anchor.label}" was refused by the fixture but appears in the artifact`);
      const expected = facts[anchor.factId];
      fail(expected !== undefined, `VII-fact ${label}: "${anchor.label}" is bound to ${anchor.factId}, which the fixture does not supply`);
      fail(write.text === expected, `VII-value ${label}: "${anchor.label}" carries ${JSON.stringify(write.text)}, not the supplied ${JSON.stringify(expected)}`);
      const record = written.find((item) => item.anchor === anchor.label);
      fail(record !== undefined, `VII-record ${label}: "${anchor.label}" is in the artifact but not in the fixture's written list`);
      if (record) {
        fail(write.fontSize === record.fontSize, `VII-size ${label}: "${anchor.label}" drawn at ${write.fontSize}pt, recorded at ${record.fontSize}pt`);
      }
      // The value has to fit the blank it was written into, at the size it was
      // drawn. A value wider than its own write box is a clipped value, and a
      // taller one runs into the rule beneath it.
      const drawnWidth = helvetica.widthOfTextAtSize(write.text, write.fontSize);
      const drawnHeight = helvetica.heightAtSize(write.fontSize);
      fail(drawnWidth <= anchor.writeBox.width, `VII-fit ${label}: "${anchor.label}" is drawn ${drawnWidth.toFixed(1)}pt wide into a ${anchor.writeBox.width}pt blank`);
      fail(drawnHeight <= anchor.writeBox.height, `VII-height ${label}: "${anchor.label}" is drawn ${drawnHeight.toFixed(1)}pt tall into a ${anchor.writeBox.height}pt blank`);
      // And it has to stay inside the rule the document itself draws, not merely
      // inside the box this profile measured for it.
      const slot = censusSlots.get(anchor.slot);
      const rect = slot?.widgets?.[0]?.rect;
      if (rect) {
        fail(write.x >= rect.x - 0.5, `VII-left ${label}: "${anchor.label}" starts left of the rule the document draws`);
        fail(write.x + drawnWidth <= rect.x + rect.width + 0.5, `VII-right ${label}: "${anchor.label}" runs past the right end of the rule the document draws`);
      }
      fail(write.fontSize >= (profile.overflowPolicy?.readableFloorPt ?? 6), `VII-floor ${label}: "${anchor.label}" drawn at ${write.fontSize}pt, below the readable floor`);
    }
    for (const record of written) {
      fail(seen.has(record.anchor), `VII-missing ${label}: the fixture records "${record.anchor}" as written, but the artifact does not carry it`);
    }
    for (const anchor of refused) {
      fail(!seen.has(anchor), `VII-refusal-honoured ${label}: "${anchor}" was refused yet reached the artifact`);
    }
  };

  checkWrites("canonical", artifacts.canonical, canonical);
  checkWrites("boundary", artifacts.boundary, boundary);
  fail(canonical.applied === true, "VII-applied: the canonical fixture was never applied");
  // Every anchor the profile declares has to be accounted for by the canonical
  // fixture — written, or refused with a reason. An anchor that is neither is
  // an unexercised coordinate, and an unexercised coordinate is one nothing has
  // ever proved writes where it claims to.
  const canonicalAccounted = new Set([
    ...(canonical.written ?? []).map((item) => item.anchor),
    ...(canonical.refused ?? []).map((item) => item.anchor)
  ]);
  for (const anchor of profile.anchors ?? []) {
    fail(canonicalAccounted.has(anchor.label), `VII-canonical-complete: the canonical fixture neither writes nor refuses "${anchor.label}"`);
  }

  // -- VIII. Overflow, shrink and refusal ----------------------------------
  const boundaryWritten = new Map((boundary.written ?? []).map((item) => [item.anchor, item]));
  fail((overflow.refusedUnfittable ?? []).length > 0, "VIII-refusals: the boundary fixture never exercises a refusal");
  fail(overflow.boundaryFixtureApplied === true, "VIII-boundary: the boundary fixture was never applied");
  for (const refusal of overflow.refusedUnfittable ?? []) {
    fail(!boundaryWritten.has(refusal.anchor), `VIII-written ${refusal.anchor}: refused as unfittable yet recorded as written`);
    fail(!artifacts.boundary.writes.some((write) => {
      const anchor = anchorAt.get(`${write.page}:${write.x}:${write.y}`);
      return anchor?.label === refusal.anchor;
    }), `VIII-artifact ${refusal.anchor}: refused as unfittable yet present in the boundary artifact`);
    fail(refusal.requiredWidthAtMin > refusal.rect.width, `VIII-basis ${refusal.anchor}: refused though it fits its blank at the minimum size`);
    fail(refusal.minFontSize === (profile.overflowPolicy?.readableFloorPt ?? 6), `VIII-floor ${refusal.anchor}: refused at a size other than the readable floor`);
  }
  for (const shrunk of overflow.shrunk ?? []) {
    const record = boundaryWritten.get(shrunk.anchor);
    fail(record !== undefined, `VIII-shrunk ${shrunk.anchor}: shrunk but not recorded as written`);
    fail(record === undefined || record.fontSize === shrunk.fontSize, `VIII-shrunk-size ${shrunk.anchor}: recorded at two different sizes`);
    fail(shrunk.fontSize < 10.5, `VIII-shrunk-basis ${shrunk.anchor}: recorded shrunk at the full size`);
  }
  fail((overflow.clippedValues ?? []).length === 0, "VIII-clipped: a value is recorded clipped");
  fail(/refuse/i.test(profile.overflowPolicy?.longText ?? ""), "VIII-policy: the overflow policy does not refuse below the readable floor");

  // -- IX. Review record completeness --------------------------------------
  for (const file of [
    "source-record.json",
    "field-census.json",
    "field-classification.json",
    "field-classification-policy.json",
    "overlay-profile.json",
    "handoff.md",
    "fixtures/canonical.json",
    "fixtures/boundary.json",
    "fixtures/negative.json",
    "fixtures/canonical-filled.pdf",
    "fixtures/boundary-filled.pdf",
    "contact-sheet/blank-vs-filled.pdf",
    "reports/rendered-artifacts.json",
    "reports/populated-fields.json",
    "reports/protected-fields.json",
    "reports/protected-fields-scan.json",
    "reports/overflow-and-clipping.json",
    "reports/active-content.json",
    "reports/mutation-tests.json",
    "reports/contact-sheet-proof.json",
    "reports/source-fidelity.json",
    "reports/visual-review.json"
  ]) {
    fail(fs.existsSync(path.join(rootDir, FAMILY_DIR, file)), `IX-record ${file}: missing from the family's evidence`);
  }
  fail(contactSheet.built === true, "IX-sheet: the page-by-page contact sheet was never built");
  fail(contactSheet.proof?.allExpectedValuesVisible === true, "IX-visible: not every expected value is visible in the finalized artifact");
  fail(contactSheet.proof?.panelsDiffer === true, "IX-differ: the blank and filled panels do not differ");
  fail(contactSheet.proof?.pages === SOURCE_PAGES, `IX-sheet-pages: the sheet proves ${contactSheet.proof?.pages} of ${SOURCE_PAGES} pages`);
  fail(mutationTests.allPassed === true, "IX-mutations: the family's own mutation tests did not all pass");
  fail((mutationTests.results ?? []).some((result) => result.mutation === "source_drift_detected" && result.passed === true), "IX-drift: no mutation proves source drift is detected");
  fail(populated.count === (populated.fields ?? []).length, "IX-populated: the populated-fields report disagrees with its own list");
  fail(populated.count === (canonical.written ?? []).length, "IX-populated-count: the populated-fields report and the canonical fixture disagree");

  // The page-by-page review record. It has to cover every page of the document,
  // agree with the artifacts it claims to have reviewed, and resolve every
  // defect it found — a review that records an open defect against the map and
  // still calls itself clean is the failure mode this check exists for.
  fail(visualReview.sourceSha256 === SOURCE_SHA, "IX-review-source: the visual review reviewed a different document");
  fail((visualReview.pages ?? []).length === SOURCE_PAGES, `IX-review-pages: the visual review covers ${(visualReview.pages ?? []).length} of ${SOURCE_PAGES} pages`);
  const reviewedPages = new Set((visualReview.pages ?? []).map((page) => page.page));
  for (let page = 1; page <= SOURCE_PAGES; page += 1) {
    fail(reviewedPages.has(page), `IX-review-page ${page}: not covered by the visual review`);
  }
  for (const [name, hash] of Object.entries(visualReview.reviewedArtifacts ?? {})) {
    const onDisk = artifactPaths[name]?.sha256;
    fail(onDisk === hash, `IX-review-artifact ${name}: the visual review reviewed ${hash}, on disk ${onDisk}`);
  }
  const reviewWrites = (visualReview.pages ?? []).reduce((total, page) => total + (page.valuesWritten ?? 0), 0);
  fail(reviewWrites === artifacts.canonical.writes.length, `IX-review-count: the visual review accounts for ${reviewWrites} values, the artifact carries ${artifacts.canonical.writes.length}`);
  for (const page of visualReview.pages ?? []) {
    const actual = artifacts.canonical.writes.filter((write) => write.page === page.page).length;
    fail(page.valuesWritten === actual, `IX-review-page-count ${page.page}: the review says ${page.valuesWritten} values, the artifact carries ${actual}`);
    const censused = (census.fields ?? []).filter((field) => field.page === page.page).length;
    fail(page.blanksCensused === censused, `IX-review-blanks ${page.page}: the review says ${page.blanksCensused} blanks, the census has ${censused}`);
  }
  fail((visualReview.clippingAndLegibility?.valuesClipped ?? -1) === 0, "IX-review-clipped: the visual review records a clipped value");
  fail((visualReview.clippingAndLegibility?.overlappingWrites ?? -1) === 0, "IX-review-overlap: the visual review records overlapping writes");
  fail((visualReview.clippingAndLegibility?.valuesDrawnBelowTheReadableFloor ?? -1) === 0, "IX-review-floor: the visual review records a value below the readable floor");
  for (const defect of visualReview.defectsFound ?? []) {
    fail(typeof defect.resolution === "string" && defect.resolution.trim() !== "", `IX-review-defect ${defect.id}: recorded without a resolution`);
    fail(defect.status !== "open_against_this_map", `IX-review-open ${defect.id}: an unresolved defect stands against this field map`);
  }
  // The review is evidence for an independent reviewer, never a substitute.
  fail(visualReview.reviewStatus === "lane_review_complete_independent_human_visual_review_still_required", `IX-review-status: the visual review claims ${visualReview.reviewStatus}`);
  fail((visualReview.doesNotEstablish ?? []).length > 0, "IX-review-scope: the visual review does not record what it fails to establish");

  // -- X. Nothing here is a commercial or live decision ---------------------
  fail(sourceRecord.generationAllowed === false, "X-generation: the source record allows generation, which is not this lane's to grant");
  fail(sourceRecord.runtimeStatus === "runtime_disabled", `X-runtime: the source record reports ${sourceRecord.runtimeStatus}`);
  fail(sourceRecord.implementationStatus === "implemented_pending_independent_review", `X-status: the implementation claims ${sourceRecord.implementationStatus} rather than pending independent review`);
  fail((sourceRecord.productionHolds ?? []).length > 0, "X-holds: the family records no production hold");
  fail(summary.approvedForLive === false, "X-live: the Oregon summary claims approval for live use");
  fail(summary.reviewStatus?.visual === "visual_review_pending" || summary.reviewStatus?.visual === "visual_review_complete", `X-visual: unrecognised visual review status ${summary.reviewStatus?.visual}`);
  fail(summary.implementationStatus === "implemented_pending_independent_review", "X-summary-status: the Oregon summary claims more than pending independent review");
  fail(sourceRecord.coBrandingRule?.includes("No LegalEase"), "X-branding: the family does not forbid branding the official form");

  return out;
}

// ---------------------------------------------------------------------------
// XI. The real product path, exercised against the real artifact.
//
// Two of the checks below deliberately hand the production validator bytes that
// are not a packet — arbitrary bytes and a truncated artifact. pdf-lib prints
// its own parse diagnostics to the console on the way to throwing, so a passing
// run of this gate still emits a few "Trying to parse invalid object" lines.
// They come from the negative tests and are the validator refusing, as intended.
// ---------------------------------------------------------------------------

async function productPathFailures() {
  const out = [];
  const fail = (ok, message) => {
    if (!ok) out.push(message);
  };

  const pathway = "set-aside-of-eligible-convictions-under-ors-137-225-1-a";
  const facts = read(`${FAMILY_DIR}/fixtures/canonical.json`).facts;

  // Admission through the canonical resolver, into a job the server derives.
  const built = jobContract.buildRenderJobSpec({
    packetId: "pk_or_lane_c_synthetic",
    state: JURISDICTION,
    pathway,
    sourceSha256: SOURCE_SHA,
    partnerSlug: null,
    briefcaseItemId: "bc_item_or_synthetic",
    trackId: null,
    packetFields: facts
  });
  fail(built.spec !== null, "XI-spec: no render job could be built for the Oregon route");
  if (!built.spec) return out;
  fail(built.spec.routeId === `${JURISDICTION}:${pathway}`, `XI-route: the job names ${built.spec.routeId}`);
  fail(built.spec.sourceSha256 === SOURCE_SHA, "XI-pin: the job does not pin the Oregon source");
  fail(built.spec.profileId === JURISDICTION, `XI-profile: the job carries profile ${built.spec.profileId}`);
  fail(String(built.spec.profileVersion ?? "").trim() !== "", "XI-version: the job carries no profile version");
  // Determinism: the same facts produce the same job, different facts do not.
  const again = jobContract.buildRenderJobSpec({
    packetId: "pk_or_lane_c_synthetic",
    state: JURISDICTION,
    pathway,
    sourceSha256: SOURCE_SHA,
    partnerSlug: null,
    briefcaseItemId: "bc_item_or_synthetic",
    trackId: null,
    packetFields: { ...facts }
  });
  fail(again.spec?.inputHash === built.spec.inputHash, "XI-idempotent: the same request produced two different jobs");
  const different = jobContract.computeInputHash({
    packetId: built.spec.packetId,
    routeId: built.spec.routeId,
    rendererKind: built.spec.rendererKind,
    rendererVersion: built.spec.rendererVersion,
    profileId: built.spec.profileId,
    profileVersion: built.spec.profileVersion,
    sourceSha256: built.spec.sourceSha256,
    packetFields: { ...facts, "matter.case_number": "21CR40818" }
  });
  fail(different !== built.spec.inputHash, "XI-sensitive: a changed case number produced the same job");
  const otherSource = jobContract.computeInputHash({
    packetId: built.spec.packetId,
    routeId: built.spec.routeId,
    rendererKind: built.spec.rendererKind,
    rendererVersion: built.spec.rendererVersion,
    profileId: built.spec.profileId,
    profileVersion: built.spec.profileVersion,
    sourceSha256: "0".repeat(64),
    packetFields: facts
  });
  fail(otherSource !== built.spec.inputHash, "XI-source-sensitive: a different source produced the same job");

  // The worker may act only inside the server's allowlists.
  const jobId = "3f7a5f2e-9d41-4c8b-b7a2-6d0f1c9e4a11";
  const claim = {
    id: jobId,
    rendererKind: built.spec.rendererKind,
    sourceSha256: SOURCE_SHA,
    profileVersion: built.spec.profileVersion
  };
  const allowlists = {
    knownJobIds: new Set([jobId]),
    allowedSourceShas: new Set([SOURCE_SHA]),
    knownProfileVersions: new Set([built.spec.profileVersion])
  };
  try {
    fail(jobContract.assertClaimAcceptable(claim, allowlists) === true, "XI-claim: a well-formed claim was not accepted");
  } catch (error) {
    fail(false, `XI-claim: a well-formed claim was refused (${error.message})`);
  }
  const refusals = [
    ["an unadmitted source", { ...claim, sourceSha256: "0".repeat(64) }],
    ["an unknown profile version", { ...claim, profileVersion: "1.3.0" }],
    ["a job the server never issued", { ...claim, id: "00000000-0000-0000-0000-000000000000" }],
    ["an unknown renderer", { ...claim, rendererKind: "something_else_v1" }]
  ];
  for (const [label, bad] of refusals) {
    let refused = false;
    try {
      jobContract.assertClaimAcceptable(bad, allowlists);
    } catch {
      refused = true;
    }
    fail(refused, `XI-refuse: the worker contract accepted ${label}`);
  }

  // The artifact itself, validated by the production validator.
  const bytes = bytesOf(`${FAMILY_DIR}/fixtures/canonical-filled.pdf`);
  const validation = await jobContract.validateRenderOutput(
    { bytes, containerDigest: "sha256:lane-c-synthetic" },
    { minimumPageCount: SOURCE_PAGES, expectedPageSize: { width: 612, height: 792 } }
  );
  fail(validation.ok === true, `XI-validate: the Oregon artifact failed production validation (${validation.errorCode ?? ""} ${validation.detail ?? ""})`);
  fail(validation.pageCount === SOURCE_PAGES, `XI-validate-pages: validation saw ${validation.pageCount} pages`);
  fail(validation.outputSha256 === sha256(bytes), "XI-validate-hash: validation reported a hash the bytes do not have");
  // A worker that reports no container digest, or bytes that are not a PDF, is
  // refused before anything is marked ready.
  const noDigest = await jobContract.validateRenderOutput({ bytes, containerDigest: "" });
  fail(noDigest.ok === false, "XI-digest: an artifact with no container digest validated");
  const notPdf = await jobContract.validateRenderOutput({ bytes: Buffer.from("not a pdf"), containerDigest: "sha256:x" });
  fail(notPdf.ok === false, "XI-notpdf: arbitrary bytes validated as a packet");
  const truncated = await jobContract.validateRenderOutput({ bytes: bytes.subarray(0, 2048), containerDigest: "sha256:x" });
  fail(truncated.ok === false, "XI-truncated: a truncated artifact validated");
  // Six pages where five are expected is a different document, not this packet.
  const tooFew = await jobContract.validateRenderOutput({ bytes, containerDigest: "sha256:x" }, { minimumPageCount: SOURCE_PAGES + 1 });
  fail(tooFew.ok === false, "XI-minpages: an artifact short of the required pages validated");

  // Private, participant-owned delivery. The Briefcase item is the claim; a
  // request from anyone else, or for anyone else's matter, learns nothing.
  const owner = "user_or_owner";
  const stranger = "user_or_stranger";
  const briefcaseItemId = "bc_item_or_synthetic";
  const outputSha256 = validation.outputSha256;
  const storagePath = jobContract.buildArtifactStoragePath({
    partnerId: null,
    matterId: "matter_or_synthetic",
    jobId,
    outputSha256
  });
  const job = {
    id: jobId,
    routeId: built.spec.routeId,
    status: "artifact_validated",
    deliveryEligibility: "eligible",
    accountingResult: "zero_charge",
    briefcaseItemId,
    outputStoragePath: storagePath,
    outputSha256
  };
  const events = [];
  const ports = {
    getJob: async (id) => (id === jobId ? job : null),
    // The ownership fact, as the database would answer it: this item belongs to
    // this participant and to nobody else.
    userOwnsBriefcaseItem: async (userId, itemId) => userId === owner && itemId === briefcaseItemId,
    storage: {
      upload: async () => ({ ok: true }),
      read: async (p) => (p === storagePath ? bytes : null)
    },
    recordEvent: async (event) => {
      events.push(event);
      return "evt";
    }
  };

  const granted = await authorizePacketDownload(ports, { jobId, userId: owner });
  fail(granted.ok === true, `XI-deliver: the owning participant was refused their own packet (${granted.ok ? "" : granted.code})`);
  if (granted.ok) {
    fail(sha256(granted.bytes) === outputSha256, "XI-deliver-bytes: the delivered bytes are not the validated artifact");
    fail(granted.filename.endsWith(".pdf"), "XI-deliver-name: the packet is not delivered as a PDF");
  }
  // Repeat download: the same participant may fetch it again, and it is the
  // same artifact both times.
  const repeat = await authorizePacketDownload(ports, { jobId, userId: owner });
  fail(repeat.ok === true, "XI-repeat: a repeat download was refused");
  fail(repeat.ok && granted.ok && sha256(repeat.bytes) === sha256(granted.bytes), "XI-repeat-bytes: a repeat download returned different bytes");

  const wrongUser = await authorizePacketDownload(ports, { jobId, userId: stranger });
  fail(wrongUser.ok === false && wrongUser.status === 403, "XI-wrong-user: another participant could download this packet");
  const anonymous = await authorizePacketDownload(ports, { jobId, userId: null });
  fail(anonymous.ok === false && anonymous.status === 401, "XI-anonymous: an unauthenticated request could download this packet");

  // Wrong matter: the same authenticated participant, a job whose Briefcase
  // item is somebody else's. A Briefcase may not be anonymous, and a packet
  // follows its item rather than its requester.
  const otherJob = { ...job, briefcaseItemId: "bc_item_someone_else" };
  const otherPorts = { ...ports, getJob: async () => otherJob };
  const wrongMatter = await authorizePacketDownload(otherPorts, { jobId, userId: owner });
  fail(wrongMatter.ok === false && wrongMatter.status === 403, "XI-wrong-matter: a packet was served for a matter the participant does not own");

  // A job with no Briefcase item at all is nobody's, and is served to nobody.
  const unclaimed = { ...job, briefcaseItemId: null };
  const unclaimedPorts = { ...ports, getJob: async () => unclaimed };
  const unclaimedResult = await authorizePacketDownload(unclaimedPorts, { jobId, userId: owner });
  fail(unclaimedResult.ok === false && unclaimedResult.status === 403, "XI-unclaimed: an unclaimed packet was delivered");

  // Accounting is a separate fact from artifact integrity.
  const unpaid = { ...job, deliveryEligibility: "accounting_blocked", accountingResult: "consumer_payment_required" };
  const unpaidPorts = { ...ports, getJob: async () => unpaid };
  const unpaidResult = await authorizePacketDownload(unpaidPorts, { jobId, userId: owner });
  fail(unpaidResult.ok === false, "XI-accounting: an accounting-blocked packet was delivered");

  // A substituted object fails on the bytes, not on the claim.
  const swappedPorts = {
    ...ports,
    storage: { upload: async () => ({ ok: true }), read: async () => Buffer.from("%PDF-1.7 not this artifact") }
  };
  const swapped = await authorizePacketDownload(swappedPorts, { jobId, userId: owner });
  fail(swapped.ok === false && swapped.code === "artifact_corrupt", "XI-substitution: a substituted object was delivered as this packet");

  return out;
}

// ---------------------------------------------------------------------------
// Run.
// ---------------------------------------------------------------------------

const evidence = await loadEvidence();

if (MUTATIONS) {
  const base = staticFailures(evidence).length;
  const clone = () => ({
    ...structuredClone({ ...evidence, artifacts: undefined }),
    artifacts: {
      canonical: { ...evidence.artifacts.canonical, writes: evidence.artifacts.canonical.writes.map((w) => ({ ...w })), geometry: evidence.artifacts.canonical.geometry.map((g) => ({ ...g })) },
      boundary: { ...evidence.artifacts.boundary, writes: evidence.artifacts.boundary.writes.map((w) => ({ ...w })), geometry: evidence.artifacts.boundary.geometry.map((g) => ({ ...g })) },
      contactSheet: { ...evidence.artifacts.contactSheet, writes: [], geometry: evidence.artifacts.contactSheet.geometry.map((g) => ({ ...g })) }
    }
  });

  const mutations = [
    ["the source digest drifts from the corpus index", (e) => { e.sourceRecord.sha256 = "0".repeat(64); }],
    ["the overlay profile is pinned to another document", (e) => { e.profile.sha256 = "0".repeat(64); }],
    ["the census is taken from another document", (e) => { e.census.sha256 = "0".repeat(64); }],
    ["the artifacts are rendered from another source", (e) => { e.rendered.sourceSha256 = "0".repeat(64); }],
    ["the source is declared a different byte length", (e) => { e.sourceRecord.byteLength = 1; e.sourceRecord.byteLengthMatches = false; }],
    ["the digest was never checked against the pack manifest", (e) => { e.sourceRecord.sha256VerifiedAgainstBundleManifest = false; }],
    ["the strategy becomes a custom pleading", (e) => { e.sourceRecord.renderStrategy = "custom_pleading"; }],
    ["the source record loses its revision", (e) => { e.sourceRecord.revision = ""; }],
    ["the source record loses its issuing authority", (e) => { e.sourceRecord.sourceUrl = "https://example.org/form.pdf"; }],
    ["a page is dropped from the census geometry", (e) => { e.census.pageGeometry.pop(); }],
    ["the census loses a slot the profile writes into", (e) => { const slot = e.profile.anchors[0].slot; e.census.fields = e.census.fields.filter((f) => f.name !== slot); e.census.fieldCount = e.census.fields.length; }],
    ["a slot is both written and refused", (e) => { e.profile.unwritableFields.push(e.profile.anchors[0].slot); }],
    ["a classified slot goes missing", (e) => { e.classification.entries.pop(); }],
    ["a refused slot is reclassified writable", (e) => { const slot = e.profile.unwritableFields[0]; const entry = e.classification.entries.find((x) => x.name === slot); entry.writable = true; }],
    ["a protected category stops being refused", (e) => { e.protectedFields.byCategory.signature = 0; }],
    ["a protect rule is relaxed for this family", (e) => { e.policy.weakeningsApplied = "signature protection relaxed"; }],
    ["a sensitive mapping is authorized", (e) => { e.policy.explicitSensitiveMappingsAuthorized = ["p4.r512.2.x134.rule"]; }],
    ["the no-facts render writes something", (e) => { e.negative.fieldsWrittenWithNoFacts = 1; }],
    ["the protected-field scan reports a violation", (e) => { e.protectedScan.violations = ["a court signature was written"]; e.protectedScan.pass = false; }],
    ["a token in the artifact is unexplained", (e) => { e.protectedScan.canonical.unexplainedTokens = ["Deputy District Attorney"]; }],
    ["the reported artifact hash no longer matches the bytes", (e) => { e.rendered.artifacts["fixtures/canonical-filled.pdf"].sha256 = "0".repeat(64); }],
    ["the reported artifact length no longer matches the bytes", (e) => { e.rendered.artifacts["fixtures/canonical-filled.pdf"].bytes = 1; }],
    ["the render stops being deterministic", (e) => { e.rendered.deterministicRenderVerified = false; }],
    ["the contact sheet proves a different artifact", (e) => { e.contactSheet.proof.finalizedSha256 = "0".repeat(64); }],
    ["a filing page is lost from the artifact", (e) => { e.artifacts.canonical.pageCount = 4; }],
    ["the artifact page size changes", (e) => { e.artifacts.canonical.geometry[0].width = 595; }],
    ["the finalized artifact acquires form fields", (e) => { e.artifacts.canonical.acroFieldCount = 3; }],
    ["active content survives into the artifact", (e) => { e.activeContent.finalizedScan.hits = ["/JavaScript"]; e.activeContent.result = "dirty"; }],
    ["a value is written onto the court's instruction pages", (e) => { e.artifacts.canonical.writes[0].page = 2; }],
    ["a value is written at a coordinate no anchor declares", (e) => { e.artifacts.canonical.writes[0].x += 40; }],
    ["a written value is not the value the participant supplied", (e) => { e.artifacts.canonical.writes[0].text = "Multnomah"; }],
    ["a value is drawn below the readable floor", (e) => { e.artifacts.canonical.writes[0].fontSize = 4; }],
    ["a value is drawn wider than the blank it goes in", (e) => { e.profile.anchors.find((a) => a.label === "Email").writeBox.width = 20; }],
    ["a value is drawn taller than the blank it goes in", (e) => { for (const a of e.profile.anchors) a.writeBox.height = 4; }],
    ["a value runs past the end of the rule the document draws", (e) => { const slot = e.profile.anchors.find((a) => a.label === "Email").slot; e.census.fields.find((f) => f.name === slot).widgets[0].rect.width = 12; }],
    ["a written value goes missing from the artifact", (e) => { e.artifacts.canonical.writes.pop(); }],
    ["a refused value reaches the boundary artifact", (e) => { const anchor = e.profile.anchors.find((a) => a.label === "Phone"); e.artifacts.boundary.writes.push({ page: anchor.page, x: anchor.writeBox.x, y: anchor.writeBox.y, fontSize: 10.5, text: "1-413-555-0199 ext. 44021" }); }],
    ["a refusal is recorded for a value that actually fits", (e) => { e.overflow.refusedUnfittable[0].requiredWidthAtMin = 1; }],
    ["a value is recorded clipped", (e) => { e.overflow.clippedValues = [{ anchor: "Defendant" }]; }],
    ["the overflow policy stops refusing below the floor", (e) => { e.profile.overflowPolicy.longText = "clip"; }],
    ["the contact sheet was never built", (e) => { e.contactSheet.built = false; }],
    ["the visual review reviewed a different document", (e) => { e.visualReview.sourceSha256 = "0".repeat(64); }],
    ["the visual review reviewed a stale artifact", (e) => { e.visualReview.reviewedArtifacts["fixtures/canonical-filled.pdf"] = "0".repeat(64); }],
    ["the visual review skips a page", (e) => { e.visualReview.pages = e.visualReview.pages.filter((p) => p.page !== 2); }],
    ["the visual review miscounts a page's values", (e) => { e.visualReview.pages.find((p) => p.page === 4).valuesWritten = 1; }],
    ["the visual review miscounts a page's blanks", (e) => { e.visualReview.pages.find((p) => p.page === 2).blanksCensused = 1; }],
    ["the visual review records a clipped value", (e) => { e.visualReview.clippingAndLegibility.valuesClipped = 1; }],
    ["a visual-review defect stands unresolved against the map", (e) => { e.visualReview.defectsFound[0].status = "open_against_this_map"; }],
    ["the visual review claims to stand in for independent review", (e) => { e.visualReview.reviewStatus = "independent_visual_review_complete"; }],
    ["an expected value is not visible in the artifact", (e) => { e.contactSheet.proof.allExpectedValuesVisible = false; }],
    ["the blank and filled panels are identical", (e) => { e.contactSheet.proof.panelsDiffer = false; }],
    ["the family's own mutation tests stop passing", (e) => { e.mutationTests.allPassed = false; }],
    ["source drift is no longer detected", (e) => { e.mutationTests.results = e.mutationTests.results.filter((r) => r.mutation !== "source_drift_detected"); }],
    ["the route stops being bound to this form", (e) => { for (const route of e.registry.routes) { if (route.jurisdiction === "OR") route.officialFormIds = ["OR-SOMETHING-ELSE"]; } }],
    ["the packet set stops filling the official PDF", (e) => { for (const set of e.packetSets.packetSets) { for (const component of set.components ?? []) { if (component.officialFormId === DOCUMENT_ID) component.outputStrategy = "composed_document"; } } }],
    ["the packet set drops this form entirely", (e) => { for (const set of e.packetSets.packetSets) { set.components = (set.components ?? []).filter((c) => c.officialFormId !== DOCUMENT_ID); } }],
    ["Oregon is claimed as a legacy generator's jurisdiction", (e) => { for (const route of e.registry.routes) { if (route.jurisdiction === "OR") route.legacyGeneratorOwnsThisJurisdiction = true; } }],
    ["generation is allowed before review", (e) => { e.sourceRecord.generationAllowed = true; }],
    ["the runtime is enabled for this family", (e) => { e.sourceRecord.runtimeStatus = "runtime_enabled"; }],
    ["the implementation claims more than pending review", (e) => { e.sourceRecord.implementationStatus = "approved_for_live"; }],
    ["every production hold is dropped", (e) => { e.sourceRecord.productionHolds = []; }],
    ["Oregon is claimed approved for live use", (e) => { e.summary.approvedForLive = true; }],
    ["branding is permitted on the official form", (e) => { e.sourceRecord.coBrandingRule = "Partner branding may be added."; }]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const mutated = clone();
    mutate(mutated);
    const caught = staticFailures(mutated).length > base;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-oregon-official-pdf-grade-a --mutations FAILED — ${undetected} undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way this Oregon packet could stop being the official document, write where it must not, lose a filing page, or be handed to the wrong participant is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

const problems = [...staticFailures(evidence), ...(await productPathFailures())];

const corpusEntry = evidence.corpusEntry;
const mountedPath = corpusEntry ? path.join(rootDir, CORPUS_ROOT, corpusEntry.path) : null;
const corpusPresent = Boolean(mountedPath && fs.existsSync(mountedPath));

console.log(
  `OR ${DOCUMENT_ID} (${evidence.sourceRecord.officialTitle}, ${evidence.sourceRecord.revision}, ${evidence.sourceRecord.jurisdiction}): ` +
  `${SOURCE_PAGES}-page flat PDF, ${evidence.census.fieldCount} blanks censused, ` +
  `${evidence.classification.classCounts?.writable} written, ${evidence.classification.classCounts?.refused} refused, ` +
  `${evidence.artifacts.canonical.writes.length} values read back out of the finalized artifact at declared anchors on pages ${FILING_PAGES.join(" and ")}, ` +
  `all ${evidence.artifacts.canonical.pageCount} filing pages retained.`
);
console.log(
  corpusPresent
    ? "Source identity: proven against the mounted binary's own bytes and the committed records."
    : "Source identity: proven against the committed corpus index, source record and pack-manifest digest. The binary itself lives under the git-ignored private/ corpus and is not mounted here, so the bytes were not re-hashed on this run."
);

if (problems.length > 0) {
  console.error(`\nverify-rcap-oregon-official-pdf-grade-a FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems.slice(0, 40)) console.error(` - ${problem}`);
  if (problems.length > 40) console.error(` … and ${problems.length - 40} more`);
  process.exit(1);
}
console.log(
  "The official PDF is the packet, every value sits where the profile says on the pages the participant signs, " +
  "no court, prosecutor, agency or signature blank is filled, and the route admits, pins, validates and delivers it only to the participant who owns it."
);
