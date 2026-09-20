#!/usr/bin/env node
// Family-exclusive repair builder for wa_vac_felony-set.
//
// The shared Washington host owns ten families, so a SELF_HELP_STOP repair may
// not be made there. This entrypoint works only with this family's already
// rendered, source-pinned CR-08.0900 and CR-08.0920 components. It regenerates
// the participant-facing self-help section from the committed track registry,
// composes canonical and boundary packet PDFs that carry that guidance, and
// leaves rastering to the central raster worker.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAMILY_ID = "wa_vac_felony-set";
const TRACK_ID = "wa_vac_felony";
const ROUTE_KEY =
  "obligation:track-pathway:WA:wa_vac_felony:adult-felony-vacation-under-rcw-9-94a-640";
const OUT_REL =
  "data/rcap-all50/overlays/census-v1/wa/wa-vac-felony-set--official-pdf-fill";
const OUT = path.join(ROOT, OUT_REL);
const REGISTRY_REL = "data/record-clearing/legal-design-track-registry.json";
const INDEX_REL = "data/rcap-all50/local-source-corpus-index.json";
const FIXED_DATE = new Date("2026-09-04T00:00:00.000Z");
const ZERO_COUNTERS = Object.freeze({
  knownRequiredFieldsMissing: 0,
  requiredFactsNotCollected: 0,
  unclassifiedBlanks: 0,
  incompleteRows: 0,
  requiredOptionsMissing: 0,
  requiredComponentsMissing: 0,
  invisibleWrites: 0,
  protectedWrites: 0,
  visualDefects: 0,
});
const SOURCES = Object.freeze([
  Object.freeze({
    formNumber: "CR-08.0900",
    sha256: "ec8b175e3a2ccfdf247328822b7ed8ac570dacd27c8b728d09a10eca05c6559e",
    byteLength: 133614,
  }),
  Object.freeze({
    formNumber: "CR-08.0920",
    sha256: "e5ccd2e0847fc9b0c2b54ef4ff75fd8d500b7b2af5a9eed963dd3855bb0226db",
    byteLength: 160031,
  }),
]);
const COMPONENTS = Object.freeze({
  canonical: Object.freeze([
    "fixtures/cr-08-0900-canonical-filled.pdf",
    "fixtures/cr-08-0920-canonical-filled.pdf",
  ]),
  boundary: Object.freeze([
    "fixtures/cr-08-0900-boundary-filled.pdf",
    "fixtures/cr-08-0920-boundary-filled.pdf",
  ]),
});

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const normalize = (text) => String(text).replace(/\s+/g, " ").trim();
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const writeJson = (rel, value) => {
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`);
};

function trackRecord() {
  const registry = readJson(REGISTRY_REL);
  const tracks = registry.tracks ?? registry;
  const track = Array.isArray(tracks)
    ? tracks.find((candidate) => candidate.trackId === TRACK_ID)
    : tracks[TRACK_ID];
  assert.ok(track, `${TRACK_ID}: track registry record missing`);
  assert.equal(track.packetSet?.packetSetId, FAMILY_ID, "track points at a different packet family");
  assert.equal(track.selfHelpStopConditions?.length, 12, "current registry must hold exactly 12 stops");
  return track;
}

function assertSourcePins() {
  const receipt = readJson(`${OUT_REL}/source-receipt.json`);
  assert.equal(receipt.familyId, FAMILY_ID);
  assert.deepEqual(receipt.routeKeys, [ROUTE_KEY]);
  const index = readJson(INDEX_REL);
  return SOURCES.map((source) => {
    const receiptRow = receipt.documents.find((row) => row.formNumber === source.formNumber);
    assert.ok(receiptRow, `${source.formNumber}: missing from source receipt`);
    assert.equal(receiptRow.sha256, source.sha256, `${source.formNumber}: receipt hash drift`);
    assert.equal(receiptRow.byteLength, source.byteLength, `${source.formNumber}: receipt length drift`);
    const indexRows = index.entries.filter((row) => row.sha256 === source.sha256);
    assert.ok(indexRows.some((row) => row.byteLength === source.byteLength),
      `${source.formNumber}: exact source pin missing from corpus index`);

    // Use mounted custody bytes when the read-only D pack is present. A broken
    // external mount must not be papered over by copying or acquiring a source;
    // the committed receipt/index identity remains asserted either way.
    const candidates = [
      path.join(ROOT, "private/source-imports/rcap-d-source-packs-2026-08-12/D2",
        receiptRow.pathInArchive),
      process.env.MASTER_LIBRARY_SOURCE_DIR
        ? path.join(process.env.MASTER_LIBRARY_SOURCE_DIR, receiptRow.pathInArchive)
        : null,
    ].filter(Boolean);
    const mountedPath = candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
    if (mountedPath) {
      const bytes = fs.readFileSync(mountedPath);
      assert.equal(bytes.length, source.byteLength, `${source.formNumber}: mounted source length drift`);
      assert.equal(sha256(bytes), source.sha256, `${source.formNumber}: mounted source hash drift`);
    }
    return { ...source, mountedPath, byteVerified: mountedPath !== null };
  });
}

function assertAllStops(text, stops, label) {
  const haystack = normalize(text);
  const missing = stops.filter((stop) => !haystack.includes(normalize(stop)));
  assert.deepEqual(missing, [], `${label}: missing registry self-help stops`);
}

function selfHelpSection(stops) {
  const bullets = stops.map((stop) => `- ${stop}`).join("\n");
  return `## Where self-help ends

The committed track registry records these as the points where self-help ends on this route, in its own words. Each is carried word for word from \`${REGISTRY_REL}\`, track \`${TRACK_ID}\`, \`selfHelpStopConditions\`. **If any of them describes your case, stop here and take it to a lawyer, a legal-aid office or a court facilitator rather than filing:**

${bullets}

Two of those are worth naming plainly. **Immigration consequences are on that list, and this packet cannot tell you what vacating a conviction does to your immigration position** — ask an immigration lawyer before you sign or file anything. And **if what you actually want is your firearm rights back, that is a separate proceeding under RCW 9.41.041**; this motion is not it, and winning this motion does not do it.

Stop and get the same help if any of the following is also true:

- you are not sure this is the correct route or the correct court for your case — in particular, if you committed the offense because you were a victim of domestic violence, sex trafficking, prostitution, commercial sexual abuse of a minor, or sexual assault, the victim-survivor route (a different family, with different conditions) may apply instead;
- the prosecuting attorney objects to the motion; or
- anything in your court record does not match what this packet shows.

`;
}

function participantInstructions(stops) {
  const rel = `${OUT_REL}/participant-instructions.md`;
  const existing = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const start = existing.indexOf("## Where self-help ends");
  const end = existing.indexOf("\nThis packet is prepared evidence", start);
  assert.ok(start >= 0 && end > start, "participant instructions have no bounded self-help section");
  const repaired = `${existing.slice(0, start)}${selfHelpSection(stops)}${existing.slice(end + 1)}`;
  assertAllStops(repaired, stops, "participant-instructions.md");
  const repairedSection = repaired.slice(start, repaired.indexOf("\nThis packet is prepared evidence", start));
  assert.doesNotMatch(repairedSection, /possible hearing/i,
    "an ordinary possible hearing must not be turned into a self-help stop");
  fs.writeFileSync(path.join(ROOT, rel), repaired);
  return repaired;
}

function wrappedLines(font, text, size, width) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function guidancePdf(stops) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = 612;
  const height = 792;
  const left = 54;
  const bodyWidth = width - left * 2;
  let page;
  let y;
  const addPage = () => {
    page = pdf.addPage([width, height]);
    y = height - 54;
  };
  const drawLines = (lines, { font = regular, size = 9.5, leading = 12.5,
    indent = 0, gapAfter = 5 } = {}) => {
    if (y - lines.length * leading < 50) addPage();
    for (const line of lines) {
      page.drawText(line, { x: left + indent, y, size, font, color: rgb(0, 0, 0) });
      y -= leading;
    }
    y -= gapAfter;
  };
  addPage();
  drawLines(["Washington felony vacation packet"], { font: bold, size: 15, leading: 18, gapAfter: 3 });
  drawLines(["Where self-help ends"], { font: bold, size: 12, leading: 15, gapAfter: 7 });
  drawLines(wrappedLines(regular,
    "If any condition below describes your case, stop and take it to a lawyer, legal-aid office, or court facilitator rather than filing this packet.",
    9.5, bodyWidth), { gapAfter: 8 });
  for (const stop of stops) {
    const lines = wrappedLines(regular, stop, 9.5, bodyWidth - 15);
    lines[0] = `- ${lines[0]}`;
    drawLines(lines, { indent: 8, gapAfter: 3 });
  }
  drawLines(wrappedLines(regular,
    "A possible hearing is an ordinary step on this route; that fact alone is not a self-help stop. The packet does stop if the prosecuting attorney objects or the court record does not match the packet.",
    9.5, bodyWidth), { gapAfter: 7 });
  drawLines(wrappedLines(regular,
    `Route: ${ROUTE_KEY}`,
    8, bodyWidth), { size: 8, leading: 10, gapAfter: 0 });
  pdf.setTitle(`${FAMILY_ID} participant self-help instructions`);
  pdf.setAuthor("LegalEase packet factory");
  pdf.setCreator("LegalEase family-exclusive Washington repair builder");
  pdf.setProducer("pdf-lib 1.17.1");
  pdf.setCreationDate(FIXED_DATE);
  pdf.setModificationDate(FIXED_DATE);
  return Buffer.from(await pdf.save({ useObjectStreams: false, addDefaultPage: false,
    objectsPerTick: Infinity }));
}

async function composePacket(fixture, stops) {
  assert.ok(Object.hasOwn(COMPONENTS, fixture), `unsupported fixture: ${fixture}`);
  const packet = await PDFDocument.create();
  for (const rel of COMPONENTS[fixture]) {
    const component = await PDFDocument.load(fs.readFileSync(path.join(OUT, rel)));
    const pages = await packet.copyPages(component, component.getPageIndices());
    pages.forEach((page) => packet.addPage(page));
  }
  const guidance = await PDFDocument.load(await guidancePdf(stops));
  const guidancePages = await packet.copyPages(guidance, guidance.getPageIndices());
  guidancePages.forEach((page) => packet.addPage(page));
  packet.setTitle(`${FAMILY_ID} ${fixture} filing packet`);
  packet.setSubject("Official Washington forms followed by participant self-help instructions");
  packet.setAuthor("LegalEase packet factory");
  packet.setCreator("LegalEase family-exclusive Washington repair builder");
  packet.setProducer("pdf-lib 1.17.1");
  packet.setCreationDate(FIXED_DATE);
  packet.setModificationDate(FIXED_DATE);
  const bytes = Buffer.from(await packet.save({ useObjectStreams: false, addDefaultPage: false,
    objectsPerTick: Infinity }));
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), 6 + guidance.getPageCount());
  return { fixture, bytes, sha256: sha256(bytes), byteLength: bytes.length,
    pageCount: reopened.getPageCount(), instructionPageCount: guidance.getPageCount() };
}

function pdfText(file) {
  const result = spawnSync("pdftotext", [file, "-"], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, `pdftotext failed for ${file}: ${result.stderr || result.stdout}`);
  return result.stdout;
}

function bindSelfHelpStops(stops) {
  const rel = `${OUT_REL}/filing-obligations.json`;
  const obligations = readJson(rel);
  obligations.derivedFrom.selfHelpStopConditions = {
    registry: REGISTRY_REL,
    trackId: TRACK_ID,
    field: "selfHelpStopConditions",
    count: stops.length,
  };
  obligations.obligations.SELF_HELP_STOP = {
    established: true,
    basis: "the committed track registry's exact selfHelpStopConditions for this route",
    registry: REGISTRY_REL,
    trackId: TRACK_ID,
    statement: stops,
    ordinaryPossibleHearingIsNotAStop: true,
  };
  writeJson(rel, obligations);

  const completionRel = `${OUT_REL}/participant-completion-instructions.json`;
  const completion = readJson(completionRel);
  completion.selfHelpStopConditionsSource = `${rel}#/obligations/SELF_HELP_STOP`;
  completion.selfHelpStopConditions = stops;
  writeJson(completionRel, completion);
}

function writePacketRecords(packets) {
  const packetRows = packets.map(({ bytes, ...packet }) => ({
    ...packet,
    file: `${OUT_REL}/fixtures/${packet.fixture}.pdf`,
    components: COMPONENTS[packet.fixture].map((file) => `${OUT_REL}/${file}`),
    participantInstructions: `${OUT_REL}/participant-instructions.md`,
  }));
  const fixtureRel = `${OUT_REL}/fixtures/fixture-manifest.json`;
  const fixtureManifest = readJson(fixtureRel);
  fixtureManifest.packetFixtures = packetRows;
  writeJson(fixtureRel, fixtureManifest);

  const renderedRel = `${OUT_REL}/reports/rendered-artifacts.json`;
  const rendered = readJson(renderedRel);
  rendered.packetArtifacts = packetRows;
  rendered.rasterState = "BUILT_RASTER_PENDING";
  rendered.packetRasterState = "BUILT_RASTER_PENDING";
  rendered.componentPagesRastered = true;
  rendered.allPagesRastered = false;
  rendered.allPacketPagesRastered = false;
  rendered.deterministicPacketRebuilds = true;
  rendered.rasterNote = "The component rasters already present predate these packet bytes. The new canonical and boundary packet PDFs require central rastering; this builder did not raster them.";
  writeJson(renderedRel, rendered);

  const approvalRel = `${OUT_REL}/approval-request.json`;
  const approval = readJson(approvalRel);
  approval.status = "BUILT_RASTER_PENDING";
  approval.allPagesRastered = false;
  approval.packetArtifacts = packetRows;
  approval.independentVerificationStatus = "PENDING";
  writeJson(approvalRel, approval);

  const statusRel = `${OUT_REL}/build-status.json`;
  const status = readJson(statusRel);
  status.status = "BUILT_RASTER_PENDING";
  status.packetFixtureCount = packetRows.length;
  status.componentRasterPageCount = 12;
  status.rasterPageCount = 0;
  status.packetRasterPageCount = 0;
  status.packetArtifacts = packetRows;
  status.selfVerified = false;
  writeJson(statusRel, status);

  const findingsRel = `${OUT_REL}/build-findings.json`;
  const findings = readJson(findingsRel);
  findings.deterministicPacketRebuilds = true;
  findings.selfHelpStopCoverage = {
    source: `${REGISTRY_REL}#${TRACK_ID}.selfHelpStopConditions`,
    expected: 12,
    participantInstructions: 12,
    canonicalPacketText: 12,
    boundaryPacketText: 12,
    ordinaryPossibleHearingTurnedIntoStop: false,
  };
  writeJson(findingsRel, findings);
}

async function build() {
  assert.ok(process.argv.includes("--no-raster"),
    "this repair builder requires --no-raster; packet rastering is central");
  const track = trackRecord();
  const stops = track.selfHelpStopConditions;
  const sourceProof = assertSourcePins();
  const markdown = participantInstructions(stops);
  bindSelfHelpStops(stops);

  const packets = [];
  for (const fixture of ["canonical", "boundary"]) {
    const first = await composePacket(fixture, stops);
    const second = await composePacket(fixture, stops);
    assert.equal(first.sha256, second.sha256, `${fixture}: nondeterministic hash`);
    assert.equal(first.byteLength, second.byteLength, `${fixture}: nondeterministic byte length`);
    assert.equal(first.pageCount, second.pageCount, `${fixture}: nondeterministic page count`);
    const file = path.join(OUT, "fixtures", `${fixture}.pdf`);
    fs.writeFileSync(file, first.bytes);
    assertAllStops(pdfText(file), stops, `${fixture} pdftotext`);
    packets.push(first);
  }
  assertAllStops(markdown, stops, "participant-instructions.md");
  writePacketRecords(packets);
  console.log(JSON.stringify({
    familyId: FAMILY_ID,
    status: "BUILT_RASTER_PENDING",
    sourcePins: sourceProof.map(({ formNumber, sha256: digest, byteLength, byteVerified }) =>
      ({ formNumber, sha256: digest, byteLength, byteVerified })),
    stopCoverage: "12/12",
    deterministic: true,
    packets: packets.map(({ bytes, ...packet }) => packet),
    counters: ZERO_COUNTERS,
    selfVerified: false,
    commercialRoutesOpened: 0,
    productionTouched: false,
  }, null, 2));
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) await build();
