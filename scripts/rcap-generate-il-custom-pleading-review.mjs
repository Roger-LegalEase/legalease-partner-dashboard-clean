// Generate and review the Illinois custom-pleading routes — Tranche 4.
//
// Every positive fixture is generated through the REAL fulfilment path —
// resolvePacket, fulfillPacket, renderPacketComponent, the packet store, the
// artifact records and readAssembledPacket — under an explicit
// technical-fixture opt-in. Nothing is assembled outside the renderer to make a
// sample look complete, and no track is promoted.
//
// The participant's deliverable is one assembled PDF per route. There is no
// ZIP.
//
// Why this script registers Illinois in-process
// ---------------------------------------------
// `registry.ts` and `pleading-templates.ts` are shared. `registry.ts` is a
// global generated path a worker may read but never write, and neither file is
// in this job's ownedPaths. Illinois also has live routes of its own, and
// wiring these two runtime-disabled tracks into the aggregate registry is the
// integration captain's step. So the pack is registered into the in-process
// maps for the duration of this run only. Nothing on disk changes; the next
// process starts without it. What this buys is that the packets are produced by
// the real resolver, renderer and assembler rather than by a review-only copy.
//
// Output goes to an ignored review directory. The PDFs and page images are
// never committed; the tracked manifest records their hashes.
//
// Usage:
//   node scripts/rcap-generate-il-custom-pleading-review.mjs [--skip-images]

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run in production.");
  process.exit(1);
}

register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const { PLEADING_TEMPLATES } = await import("@/lib/rcap/packets/engines/pleading-templates");
const { ILLINOIS_CUSTOM_PLEADING_TRACKS } = await import("@/lib/rcap/packets/registry-il-custom-pleading");
const {
  ILLINOIS_PLEADING_TEMPLATES,
  deriveIllinoisFacts,
  IllinoisBranchError,
  IllinoisEligibilityStopError
} = await import("@/lib/rcap/packets/jurisdictions/illinois/custom-pleading");
const { fulfillPacket, readAssembledPacket } = await import("@/lib/rcap/packets/lifecycle");
const { resolvePacketStore, resetLocalPacketStore } = await import("@/lib/rcap/packets/store");
const { PacketResolutionError } = await import("@/lib/rcap/packets/resolve");

if (process.env.RCAP_TECHNICAL_FIXTURES_ENABLED !== "true") {
  throw new Error("Illinois may only be registered in a technical-fixture run.");
}
for (const track of ILLINOIS_CUSTOM_PLEADING_TRACKS) {
  if (!RELIEF_TRACKS.some((entry) => entry.trackId === track.trackId)) RELIEF_TRACKS.push(track);
}
Object.assign(PLEADING_TEMPLATES, ILLINOIS_PLEADING_TEMPLATES);

const root = process.cwd();
const OUT_ROOT = path.join(root, "tmp/packet-output-review/tranche-4");
const TRANCHE_DIR = path.join(root, "data/record-clearing/implementation-tranches");
const skipImages = process.argv.includes("--skip-images");

const tranche = readJson(path.join(TRANCHE_DIR, "tranche-4.json"));
const pins = readJson(path.join(TRANCHE_DIR, "tranche-4-authority-pins.json"));
const fixtures = readJson(path.join(TRANCHE_DIR, "tranche-4-fixtures.json"));

const positives = fixtures.positiveFixtures;
const boundaries = fixtures.boundaryFixtures;
const byFixtureId = new Map(positives.map((entry) => [entry.fixtureId, entry]));

const OWNER = "00000000-0000-4000-8000-000000000005";

fs.rmSync(OUT_ROOT, { recursive: true, force: true });
fs.mkdirSync(OUT_ROOT, { recursive: true });
resetLocalPacketStore();

const store = resolvePacketStore();
const results = [];
const failures = [];

console.log(`Tranche 4 — ${tranche.jurisdictionName}: ${positives.length} positive fixtures, ${boundaries.length} boundary fixtures.`);

// ---------------------------------------------------------------------------
// Positive fixtures
// ---------------------------------------------------------------------------

for (const fixture of positives) {
  const trackDir = path.join(OUT_ROOT, fixture.trackId);
  fs.mkdirSync(trackDir, { recursive: true });

  const facts = deriveIllinoisFacts(fixture.trackId, fixture.facts);
  const request = {
    jurisdiction: "IL",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true,
    ownerId: OWNER,
    requestKey: `tranche-4:${fixture.fixtureId}`,
    rootDir: root,
    store
  };

  const fulfillment = await fulfillPacket(request);
  const second = await fulfillPacket({ ...request, requestKey: `tranche-4:${fixture.fixtureId}:determinism` });

  const components = [];
  for (const component of fulfillment.components) {
    const artifact = await store.repository.findArtifact(fulfillment.fulfillmentId, component.componentId);
    const bytes = await store.storage.get(artifact.objectPath);
    const secondArtifact = await store.repository.findArtifact(second.fulfillmentId, component.componentId);
    const deterministic = artifact.checksumSha256 === secondArtifact.checksumSha256;

    const fileName = `${component.order.toString().padStart(2, "0")}-${component.componentId}.pdf`;
    fs.writeFileSync(path.join(trackDir, `${fixture.fixtureId}__${fileName}`), bytes);

    components.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      fileName,
      pageCount: component.pageCount,
      byteSize: artifact.byteSize,
      sha256: artifact.checksumSha256,
      templateId: component.sourceIdentity,
      sourceSha256: component.sourceSha256,
      rendererStrategy: component.rendererStrategy,
      deterministic,
      warnings: component.warnings
    });
    if (!deterministic) failures.push(`${fixture.fixtureId}/${component.componentId}: non-deterministic output.`);
  }

  const assembled = await readAssembledPacket({
    fulfillmentId: fulfillment.fulfillmentId,
    caseReference: fixture.caseReference,
    store
  });
  if (!assembled) {
    failures.push(`${fixture.fixtureId}: the assembled packet could not be read back.`);
    continue;
  }
  const assembledAgain = await readAssembledPacket({
    fulfillmentId: second.fulfillmentId,
    caseReference: fixture.caseReference,
    store
  });
  const assemblyDeterministic = assembled.sha256 === assembledAgain?.sha256;
  if (!assemblyDeterministic) failures.push(`${fixture.fixtureId}: assembly is not deterministic.`);

  fs.writeFileSync(path.join(trackDir, assembled.fileName), assembled.bytes);

  let images = 0;
  if (!skipImages) {
    const imageDir = path.join(trackDir, `${fixture.fixtureId}__pages`);
    fs.mkdirSync(imageDir, { recursive: true });
    const rendered = spawnSync(
      "pdftoppm",
      ["-png", "-r", "110", path.join(trackDir, assembled.fileName), path.join(imageDir, "page")],
      { encoding: "utf8" }
    );
    if (rendered.status !== 0) {
      failures.push(`${fixture.fixtureId}: page rasterization failed — ${rendered.stderr}`);
    } else {
      images = fs.readdirSync(imageDir).filter((name) => name.endsWith(".png")).length;
      if (images !== assembled.pageCount) {
        failures.push(`${fixture.fixtureId}: rendered ${images} images for ${assembled.pageCount} pages.`);
      }
    }
  }

  results.push({
    fixtureId: fixture.fixtureId,
    trackId: fixture.trackId,
    description: fixture.description,
    runtimeStatus: fulfillment.runtimeStatus,
    packetSetId: fulfillment.packetSetId,
    assembledFileName: assembled.fileName,
    assembledSha256: assembled.sha256,
    assembledPageCount: assembled.pageCount,
    assembledBytes: assembled.byteSize,
    assemblyDeterministic,
    componentRanges: assembled.componentRanges,
    pageImages: images,
    components
  });

  console.log(
    `  ${fixture.fixtureId.padEnd(46)} ${String(assembled.pageCount).padStart(2)} pages  ${components.length} components  ${fulfillment.runtimeStatus}`
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
    const derived = deriveIllinoisFacts(boundary.trackId, facts);
    await fulfillPacket({
      jurisdiction: "IL",
      trackId: boundary.trackId,
      facts: derived,
      allowTechnicalFixtures: true,
      ownerId: OWNER,
      requestKey: `tranche-4:${boundary.fixtureId}`,
      rootDir: root,
      store
    });
  } catch (error) {
    if (error instanceof IllinoisEligibilityStopError) {
      outcome = "eligibility_stop";
      detail = error.stopId;
    } else if (error instanceof IllinoisBranchError) {
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

  const passed =
    outcome === boundary.expect && (!boundary.expectDetail || String(detail).includes(boundary.expectDetail));
  if (!passed) {
    failures.push(`${boundary.fixtureId}: expected ${boundary.expect}/${boundary.expectDetail}, got ${outcome}/${detail}.`);
  }
  boundaryResults.push({ ...boundary, outcome, detail, passed });
  console.log(`  ${boundary.fixtureId.padEnd(46)} ${passed ? "stopped correctly" : "DID NOT STOP"} (${outcome})`);
}

// ---------------------------------------------------------------------------
// Technical review
// ---------------------------------------------------------------------------

const PROHIBITED = [
  { id: "fee_amount", pattern: /\$\s?\d/, why: "a fee amount, which is county-specific and unresolved statewide" },
  { id: "notary_block", pattern: /notary public|sworn to and subscribed/i, why: "a notary block on a route requiring no notarisation" },
  { id: "cannabis_suite", pattern: /cannabis/i, why: "cannabis form-suite language mapped onto a non-cannabis route" },
  { id: "success_prediction", pattern: /will be granted|you will succeed|the court will grant/i, why: "a prediction of success on a discretionary motion" },
  { id: "ssn_field", pattern: /social security (number|no)/i, why: "a social security number field" },
  { id: "race_field", pattern: /\brace\s*:/i, why: "a race field" },
  { id: "attorney_recital", pattern: /by and through (his|her|their) attorney,\s*\w/i, why: "a prefilled attorney recital" }
];

/** Copy that would tell an immediate-sealing participant they may file it themselves. */
const SELF_FILE_CLAIMS =
  /(you|the participant|movant)\s+(may|can)\s+file (this|the petition)|file (this|it) yourself|self-file/i;

const technical = [];
for (const result of results) {
  const trackDir = path.join(OUT_ROOT, result.trackId);
  const fixture = byFixtureId.get(result.fixtureId);
  const issues = [];

  const assembledText = pdfText(path.join(trackDir, result.assembledFileName));
  for (const rule of PROHIBITED) {
    if (rule.pattern.test(assembledText)) issues.push(`assembled packet: ${rule.why}.`);
  }

  if (result.trackId === "il-immediate-seal") {
    if (SELF_FILE_CLAIMS.test(assembledText)) {
      issues.push("assembled packet: tells the participant they may file an attorney-filed petition themselves.");
    }
    if (!/cannot file this petition yourself/i.test(assembledText)) {
      issues.push("assembled packet: does not say the participant cannot file the petition themselves.");
    }
    if (!/5\.2\(c\)\(3\)\(A\)/.test(assembledText)) {
      issues.push("assembled packet: the ordinary-sealing fallback is absent.");
    }
    if (!/nothing permanent/i.test(assembledText)) {
      issues.push("assembled packet: does not say that missing the window costs nothing permanent.");
    }
    if (!/not a court filing/i.test(assembledText)) {
      issues.push("assembled packet: the instruction sheet is not marked as not a court filing.");
    }
    if (!/ARDC No\./.test(assembledText)) {
      issues.push("assembled packet: no attorney block on an attorney-filed petition.");
    }
  }

  if (result.trackId === "il-prostitution-j-vacate") {
    // Citation discipline: only (j)(3), (d)(9)(A) and (j)(8) may appear.
    const citations = [...assembledText.matchAll(/5\.2\(([a-z])\)\(([0-9]+)\)(\([A-Za-z]+\))?/g)].map((m) => m[0]);
    const allowed = new Set(["5.2(j)(3)", "5.2(d)(9)(A)", "5.2(j)(8)"]);
    for (const citation of new Set(citations)) {
      if (!allowed.has(citation)) issues.push(`assembled packet: cites ${citation}, which is outside the approved citation set.`);
    }
    if (/verif/i.test(assembledText)) {
      issues.push("assembled packet: carries verification language on a subsection that requires none.");
    }
    if (!/pro se/i.test(assembledText)) {
      issues.push("assembled packet: no pro se designation on a participant-filed motion.");
    }
  }

  for (const component of result.components) {
    const file = path.join(
      trackDir,
      `${result.fixtureId}__${component.order.toString().padStart(2, "0")}-${component.componentId}.pdf`
    );
    const text = pdfText(file);

    if (component.role === "primary_filing") {
      for (const key of ["petitionerName", "caseNumber"]) {
        const value = String(fixture.facts[key] ?? "");
        if (value && !text.includes(value)) issues.push(`${component.componentId}: participant value for ${key} is absent.`);
      }
      const narrative = fixture.facts.adverseConsequences;
      if (narrative && !text.includes(narrative)) {
        issues.push(`${component.componentId}: the participant's own statement is absent or was altered.`);
      }
      if (narrative && !/own words/i.test(text)) {
        issues.push(`${component.componentId}: participant-authored text is not identified as the participant's.`);
      }
    }

    if (component.role === "proposed_order") {
      if (/\bs\/\s|\/s\//i.test(text)) issues.push(`${component.componentId}: a signature mark appears on a proposed order.`);
      if (!/\(\s*\)\s*that the (petition|motion) should be GRANTED/i.test(text)) {
        issues.push(`${component.componentId}: the grant election is not blank.`);
      }
      if (!/\(\s*\)\s*that the (petition|motion) should be DENIED/i.test(text)) {
        issues.push(`${component.componentId}: the denial election is not blank.`);
      }
      const pages = pdfPageTexts(file);
      const signaturePage = pages.find((page) => /JUDGE/.test(page));
      if (!signaturePage) issues.push(`${component.componentId}: no judicial signature block.`);
      else if (!/Date:/i.test(signaturePage)) {
        issues.push(`${component.componentId}: the judicial signature block is split across a page break.`);
      }
    }

    if (component.rendererStrategy === "custom_pleading" && component.sourceSha256 !== null) {
      issues.push(`${component.componentId}: a custom pleading reports an official source hash.`);
    }
    if (!component.deterministic) issues.push(`${component.componentId}: output is not deterministic.`);
    if (component.pageCount === null || component.pageCount < 1) issues.push(`${component.componentId}: no page count.`);
  }

  const pinned = pins.tracks.find((entry) => entry.trackId === result.trackId).components;
  const produced = result.components.map((c) => c.componentId);
  for (const component of pinned) {
    if (!produced.includes(component.componentId)) {
      issues.push(`${component.componentId}: expected component was not produced.`);
    }
  }
  if (!result.assemblyDeterministic) issues.push("the assembled packet is not deterministic.");

  technical.push({ fixtureId: result.fixtureId, trackId: result.trackId, passed: issues.length === 0, issues });
  failures.push(...issues.map((issue) => `${result.fixtureId}: ${issue}`));
}

// ---------------------------------------------------------------------------
// Write the review records
// ---------------------------------------------------------------------------

const technicalPassed = technical.every((entry) => entry.passed) && boundaryResults.every((entry) => entry.passed);

fs.writeFileSync(
  path.join(OUT_ROOT, "generation-result.json"),
  `${JSON.stringify({ schemaVersion: 1, trancheId: tranche.trancheId, positives: results, boundaries: boundaryResults, technical, technicalPassed, failures }, null, 2)}\n`
);

const manifest = {
  schemaVersion: 1,
  trancheId: tranche.trancheId,
  jobId: tranche.jobId,
  jurisdiction: "IL",
  jurisdictionName: "Illinois",
  authorityEdition: pins.authorityEdition,
  authorityArchiveSha256: pins.authorityArchiveSha256,
  humanLegalReviewStatus: "awaiting_counsel_adoption",
  runtimeStatus: "runtime_disabled",
  reviewDirectory: "tmp/packet-output-review/tranche-4 (ignored; regenerate with the generation command)",
  generationCommand: "node scripts/rcap-generate-il-custom-pleading-review.mjs",
  verificationCommand: "node scripts/verify-rcap-il-custom-pleading-packets.mjs",
  deliverableModel:
    "One assembled participant-facing PDF per route, bound in packet order by the shared packet assembler. There is no ZIP.",
  implementedTrackCount: new Set(results.map((entry) => entry.trackId)).size,
  assembledPacketCount: results.length,
  componentCount: results.reduce((total, entry) => total + entry.components.length, 0),
  assembledPageCount: results.reduce((total, entry) => total + entry.assembledPageCount, 0),
  deliveryModels: pins.tracks.map((track) => ({ trackId: track.trackId, deliveryModel: track.deliveryModel })),
  technicalReview: {
    passed: technicalPassed,
    checks: [
      "Every component rendered through CustomPleadingRenderer and reopened as a PDF.",
      "Every component rendered twice under different request keys produced identical bytes.",
      "Every assembled packet was produced by the shared assembler from durably stored components and is byte-identical on regeneration.",
      "No fee amount, notary block, cannabis-suite language, success prediction, prefilled attorney recital, social security or race field in any assembled packet.",
      "il-immediate-seal: the packet never says the participant may file it themselves, says in terms that they cannot, carries the § 5.2(c)(3)(A) fallback and the nothing-permanent statement, marks the instruction sheet as not a court filing, and draws a blank attorney block.",
      "il-prostitution-j-vacate: only § 5.2(j)(3), (d)(9)(A) and (j)(8) appear; no verification language; a pro se designation is present.",
      "Every proposed order leaves both elections blank, carries no signature mark, and keeps its judicial signature block on one page.",
      "Every participant statement is reproduced verbatim and attributed on the face of the motion.",
      "Every boundary fixture stopped with its expected typed failure."
    ]
  },
  samplePackets: results.map((entry) => ({
    fixtureId: entry.fixtureId,
    trackId: entry.trackId,
    assembledFileName: entry.assembledFileName,
    assembledSha256: entry.assembledSha256,
    assembledPageCount: entry.assembledPageCount,
    assembledBytes: entry.assembledBytes,
    pageImages: entry.pageImages,
    runtimeStatus: entry.runtimeStatus,
    componentRanges: entry.componentRanges,
    components: entry.components.map((component) => ({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      templateId: component.templateId,
      pageCount: component.pageCount,
      sha256: component.sha256,
      byteSize: component.byteSize,
      deterministic: component.deterministic,
      warnings: component.warnings
    }))
  })),
  boundaryFixtures: boundaryResults.map((entry) => ({
    fixtureId: entry.fixtureId,
    trackId: entry.trackId,
    expected: entry.expect,
    outcome: entry.outcome,
    detail: entry.detail,
    passed: entry.passed,
    why: entry.why
  })),
  note:
    "An engineering generation and technical-proof record. It is not a legal approval. Both tracks remain runtime_disabled at awaiting_counsel_adoption, no jurisdiction is enabled, and packet readiness remains 0."
};
fs.writeFileSync(path.join(TRANCHE_DIR, "tranche-4-review-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log("");
console.log(`Assembled packets: ${results.length}. Boundary fixtures: ${boundaryResults.length}.`);
console.log(`Technical review: ${technicalPassed ? "passed" : "FAILED"}.`);
if (failures.length > 0) {
  console.log("");
  for (const failure of failures.slice(0, 40)) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log("No track was promoted. Both Tranche 4 tracks remain runtime_disabled.");

// ---------------------------------------------------------------------------

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function pdfPageTexts(file) {
  const pageCount = Number(
    (spawnSync("pdfinfo", [file], { encoding: "utf8" }).stdout.match(/^Pages:\s+(\d+)/m) ?? [])[1] ?? 0
  );
  const pages = [];
  for (let page = 1; page <= pageCount; page += 1) {
    const result = spawnSync("pdftotext", ["-layout", "-f", String(page), "-l", String(page), file, "-"], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024
    });
    if (result.status !== 0) throw new Error(`pdftotext failed for ${file} page ${page}: ${result.stderr}`);
    pages.push(result.stdout);
  }
  return pages;
}

function pdfText(file) {
  const result = spawnSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`pdftotext failed for ${file}: ${result.stderr}`);
  return result.stdout.replace(/-\n\s*/g, "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
}
