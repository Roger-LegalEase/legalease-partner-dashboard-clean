// Generate and review the implementation Tranche 1 (Mississippi) packets.
//
// Every positive fixture is generated through the REAL fulfilment path —
// resolvePacket, renderPacketComponent, the packet store and the artifact
// records — under an explicit technical-fixture opt-in. Nothing is assembled
// outside the renderer to make a sample look complete, and no track is promoted:
// all five stay `runtime_disabled`, and the opt-in is what lets a disabled track
// be generated for review at all.
//
// Output goes to an ignored review directory. The PDFs, the page images and the
// ZIP are never committed; the tracked manifest records their hashes.
//
// Usage:
//   node scripts/rcap-generate-tranche-1-packets.mjs [--skip-images]

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run in production.");
  process.exit(1);
}

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { fulfillPacket } = await import("@/lib/rcap/packets/lifecycle");
const { resolvePacketStore, resetLocalPacketStore } = await import("@/lib/rcap/packets/store");
const { deriveMississippiFacts, MississippiBranchError } = await import(
  "@/lib/rcap/packets/tranche-1-mississippi-facts"
);
const { PacketResolutionError } = await import("@/lib/rcap/packets/resolve");
const { PDFDocument } = await import("pdf-lib");

const root = process.cwd();
const OUT_ROOT = path.join(root, "tmp/packet-output-review/tranche-1");
const TRANCHE_DIR = path.join(root, "data/record-clearing/implementation-tranches");
const skipImages = process.argv.includes("--skip-images");
const DETERMINISTIC_TIMESTAMP = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));

const tranche = readJson(path.join(TRANCHE_DIR, "tranche-1.json"));
const pins = readJson(path.join(TRANCHE_DIR, "tranche-1-authority-pins.json"));
const fixtures = readJson(path.join(TRANCHE_DIR, "tranche-1-fixtures.json"));

const positives = fixtures.positiveFixtures;
const boundaries = fixtures.boundaryFixtures;
const byFixtureId = new Map(positives.map((entry) => [entry.fixtureId, entry]));

// A deterministic owner: the same fixture must always produce the same request
// key, so a rerun proves reuse rather than producing a second artifact set.
const OWNER = "00000000-0000-4000-8000-00000000tr1".replace("tr1", "001");

fs.rmSync(OUT_ROOT, { recursive: true, force: true });
fs.mkdirSync(OUT_ROOT, { recursive: true });
resetLocalPacketStore();

const store = resolvePacketStore();
const results = [];
const failures = [];

console.log(`Tranche 1 — ${tranche.jurisdictionName}: ${tranche.selectedTracks.length} tracks, ${positives.length} positive fixtures.`);

// ---------------------------------------------------------------------------
// Positive fixtures
// ---------------------------------------------------------------------------

for (const fixture of positives) {
  const trackDir = path.join(OUT_ROOT, fixture.trackId);
  fs.mkdirSync(trackDir, { recursive: true });

  const facts = deriveMississippiFacts(fixture.trackId, fixture.facts);
  const request = {
    jurisdiction: "MS",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true,
    ownerId: OWNER,
    requestKey: `tranche-1:${fixture.fixtureId}`,
    rootDir: root,
    store
  };

  const fulfillment = await fulfillPacket(request);

  // Determinism: the same input must produce the same bytes. Rendered again
  // under a different request key so the check exercises the renderer rather
  // than the idempotency cache.
  const second = await fulfillPacket({ ...request, requestKey: `tranche-1:${fixture.fixtureId}:determinism` });

  const components = [];
  // The merged review copy gets the same fixed metadata the renderer uses, so
  // the packet SHA recorded in the tracked manifest is reproducible rather than
  // a record of when this script last ran.
  const merged = await PDFDocument.create();
  merged.setCreationDate(DETERMINISTIC_TIMESTAMP);
  merged.setModificationDate(DETERMINISTIC_TIMESTAMP);
  merged.setProducer("LegalEase");
  merged.setCreator("LegalEase");
  for (const component of fulfillment.components) {
    const artifact = await store.repository.findArtifact(fulfillment.fulfillmentId, component.componentId);
    const bytes = await store.storage.get(artifact.objectPath);
    const secondArtifact = await store.repository.findArtifact(second.fulfillmentId, component.componentId);
    const deterministic = artifact.checksumSha256 === secondArtifact.checksumSha256;

    const fileName = `${component.order.toString().padStart(2, "0")}-${component.componentId}.pdf`;
    fs.writeFileSync(path.join(trackDir, `${fixture.fixtureId}__${fileName}`), bytes);

    const doc = await PDFDocument.load(bytes);
    const copied = await merged.copyPages(doc, doc.getPageIndices());
    copied.forEach((page) => merged.addPage(page));

    components.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      fileName,
      pageCount: component.pageCount,
      byteSize: artifact.byteSize,
      sha256: artifact.checksumSha256,
      sourceIdentity: component.sourceIdentity,
      sourceSha256: component.sourceSha256,
      rendererStrategy: component.rendererStrategy,
      downloadPath: component.downloadPath,
      deterministic,
      warnings: component.warnings
    });
    if (!deterministic) failures.push(`${fixture.fixtureId}/${component.componentId}: non-deterministic output.`);
  }

  const packetBytes = await merged.save();
  const packetName = `${fixture.fixtureId}__complete-packet.pdf`;
  fs.writeFileSync(path.join(trackDir, packetName), packetBytes);
  const packetSha = crypto.createHash("sha256").update(packetBytes).digest("hex");
  const packetPages = merged.getPageCount();

  let images = 0;
  if (!skipImages) {
    const imageDir = path.join(trackDir, `${fixture.fixtureId}__pages`);
    fs.mkdirSync(imageDir, { recursive: true });
    const rendered = spawnSync(
      "pdftoppm",
      ["-png", "-r", "110", path.join(trackDir, packetName), path.join(imageDir, "page")],
      { encoding: "utf8" }
    );
    if (rendered.status !== 0) {
      failures.push(`${fixture.fixtureId}: page rasterization failed — ${rendered.stderr}`);
    } else {
      images = fs.readdirSync(imageDir).filter((name) => name.endsWith(".png")).length;
      if (images !== packetPages) {
        failures.push(`${fixture.fixtureId}: rendered ${images} images for ${packetPages} pages.`);
      }
    }
  }

  results.push({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    branchVariantId: fixture.branchVariantId ?? null,
    description: fixture.description,
    fulfillmentStatus: fulfillment.status,
    runtimeStatus: fulfillment.runtimeStatus,
    outputStrategy: fulfillment.outputStrategy,
    packetSetId: fulfillment.packetSetId,
    isFilingPacket: fulfillment.isFilingPacket,
    completePacketFileName: packetName,
    completePacketSha256: packetSha,
    completePacketPageCount: packetPages,
    completePacketBytes: packetBytes.byteLength,
    pageImages: images,
    components
  });

  console.log(
    `  ${fixture.fixtureId.padEnd(38)} ${String(packetPages).padStart(2)} pages  ${components.length} components  ${fulfillment.runtimeStatus}`
  );
}

// ---------------------------------------------------------------------------
// Boundary fixtures — each must stop, not produce a packet
// ---------------------------------------------------------------------------

const boundaryResults = [];
for (const boundary of boundaries) {
  const base = byFixtureId.get(boundary.basedOn);
  const facts = { ...base.facts, ...(boundary.overrideFacts ?? {}) };
  for (const key of boundary.omitKeys ?? []) delete facts[key];

  let outcome = "generated_unexpectedly";
  let detail = null;
  try {
    const derived = deriveMississippiFacts(boundary.trackId, facts);
    await fulfillPacket({
      jurisdiction: "MS",
      trackId: boundary.trackId,
      facts: derived,
      allowTechnicalFixtures: true,
      ownerId: OWNER,
      requestKey: `tranche-1:${boundary.fixtureId}`,
      rootDir: root,
      store
    });
  } catch (error) {
    if (error instanceof MississippiBranchError) {
      outcome = "branch_error";
      detail = error.key;
    } else if (error instanceof PacketResolutionError) {
      outcome = "resolution_missing_required_input";
      detail = (error.detail.missingInputs ?? []).join(", ");
    } else {
      outcome = "unexpected_error";
      detail = String(error?.message ?? "").slice(0, 160);
    }
  }

  const passed = outcome === boundary.expect && (!boundary.expectDetail || String(detail).includes(boundary.expectDetail));
  if (!passed) {
    failures.push(`${boundary.fixtureId}: expected ${boundary.expect}/${boundary.expectDetail}, got ${outcome}/${detail}.`);
  }
  boundaryResults.push({ ...boundary, outcome, detail, passed });
  console.log(`  ${boundary.fixtureId.padEnd(38)} ${passed ? "stopped correctly" : "DID NOT STOP"} (${outcome})`);
}

// ---------------------------------------------------------------------------
// Technical review — assertions no visual pass can substitute for
// ---------------------------------------------------------------------------

const PROHIBITED_CONTENT = [
  { id: "fourth_district_counties", pattern: /leflore|sunflower|washington count/i, why: "Fourth District county hard-coded" },
  { id: "greenville_da_address", pattern: /greenville/i, why: "Greenville district attorney address reproduced" },
  { id: "grand_jury_allegation", pattern: /grand jury/i, why: "mandatory grand-jury allegation reproduced" },
  { id: "race_field", pattern: /\brace:/i, why: "race field reproduced" },
  { id: "ssn_field", pattern: /social security (number|no)/i, why: "social security number field reproduced" },
  { id: "dual_citation", pattern: /99-15-26\s*(and|\/|,)\s*99-19-71/i, why: "dual citation conflating two mechanisms" },
  { id: "rehabilitation_finding", pattern: /rehabilitat/i, why: "rehabilitation narrative asserted" },
  { id: "public_safety_finding", pattern: /not a threat to public safety|public safety would/i, why: "public-safety conclusion asserted" },
  { id: "best_interest_finding", pattern: /best interest(s)? of justice|interests of justice warrant/i, why: "interests-of-justice finding asserted" },
  { id: "attorney_recital", pattern: /by and through (his|her|their) attorney/i, why: "attorney recital on a self-represented pleading" },
  { id: "fee_amount", pattern: /\$\s?150|\$\s?\d{2,}\.\d{2}/i, why: "a filing fee amount was printed" }
];

const REQUIRED_PETITION_SECTIONS = ["PETITIONER AND CASE", "STATUTORY BASIS", "PETITIONER'S STATEMENT"];

const technical = [];
for (const result of results) {
  const trackDir = path.join(OUT_ROOT, result.trackId);
  const fixture = byFixtureId.get(result.fixtureId);
  const issues = [];

  for (const component of result.components) {
    const file = path.join(trackDir, `${result.fixtureId}__${component.order.toString().padStart(2, "0")}-${component.componentId}.pdf`);
    const text = pdfText(file);

    for (const rule of PROHIBITED_CONTENT) {
      if (rule.pattern.test(text)) issues.push(`${component.componentId}: ${rule.why}.`);
    }

    // Participant values actually reached the page.
    if (component.role === "primary_filing") {
      for (const key of ["petitionerName", "causeNumber", "chargeName"]) {
        const value = String(fixture.facts[key] ?? "");
        if (value && !text.includes(value)) issues.push(`${component.componentId}: participant value for ${key} is absent.`);
      }
      for (const section of REQUIRED_PETITION_SECTIONS) {
        if (!text.toUpperCase().includes(section)) issues.push(`${component.componentId}: required section ${section} is absent.`);
      }
      if (!text.includes(fixture.facts.petitionerStatement)) {
        issues.push(`${component.componentId}: the petitioner's own statement is absent.`);
      }
    }

    // Third-party blocks stay blank: the proposed order must not carry a judge
    // name, a signature or a decided outcome.
    if (component.role === "proposed_order") {
      if (/\bs\/\s|\/s\//i.test(text)) issues.push(`${component.componentId}: a signature mark appears on a proposed order.`);
      if (!/\(\s*\)\s*that the petition is well taken/i.test(text)) {
        issues.push(`${component.componentId}: the grant checkbox is not blank.`);
      }
    }

    // A custom pleading carries no official source hash, by design.
    if (component.rendererStrategy === "custom_pleading" && component.sourceSha256 !== null) {
      issues.push(`${component.componentId}: a custom pleading reports an official source hash.`);
    }
    if (!component.deterministic) issues.push(`${component.componentId}: output is not deterministic.`);
    if (component.pageCount === null || component.pageCount < 1) {
      issues.push(`${component.componentId}: no page count.`);
    }
  }

  // Component completeness against the pinned packet definition.
  const expected = pins.tracks.find((entry) => entry.trackId === result.trackId).components.map((c) => c.componentId);
  const produced = result.components.map((c) => c.componentId);
  for (const componentId of expected) {
    if (!produced.includes(componentId)) issues.push(`${componentId}: expected component was not produced.`);
  }
  const orders = result.components.map((c) => c.order);
  if (orders.some((value, index) => index > 0 && value <= orders[index - 1])) {
    issues.push("components are not in ascending packet order.");
  }

  technical.push({ fixtureId: result.fixtureId, trackId: result.trackId, passed: issues.length === 0, issues });
  failures.push(...issues.map((issue) => `${result.fixtureId}: ${issue}`));
}

// ---------------------------------------------------------------------------
// Write the review record
// ---------------------------------------------------------------------------

const review = {
  schemaVersion: 1,
  trancheId: tranche.trancheId,
  generatedAt: new Date().toISOString(),
  authorityEdition: pins.authorityEdition,
  authorityArchiveSha256: pins.authorityArchiveSha256,
  positives: results,
  boundaries: boundaryResults,
  technical,
  technicalPassed: technical.every((entry) => entry.passed) && boundaryResults.every((entry) => entry.passed),
  failures
};
fs.writeFileSync(path.join(OUT_ROOT, "generation-result.json"), `${JSON.stringify(review, null, 2)}\n`);

console.log("");
console.log(`Positive packets: ${results.length}. Boundary fixtures: ${boundaryResults.length}.`);
console.log(`Technical review: ${review.technicalPassed ? "passed" : "FAILED"}.`);
if (failures.length > 0) {
  console.log("");
  for (const failure of failures.slice(0, 30)) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log("No track was promoted. Every Tranche 1 track remains runtime_disabled.");

// ---------------------------------------------------------------------------

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Extracted page text, used for content assertions rather than for display. */
function pdfText(file) {
  const result = spawnSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`pdftotext failed for ${file}: ${result.stderr}`);
  // Collapse the soft line breaks the layout mode introduces so a sentence that
  // wrapped across two lines still matches.
  return result.stdout.replace(/-\n\s*/g, "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
}
