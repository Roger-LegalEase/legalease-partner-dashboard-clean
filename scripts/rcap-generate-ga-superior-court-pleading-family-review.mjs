// Generate and review the Georgia Superior Court pleading family — Tranche 3.
//
// Every positive fixture is generated through the REAL fulfilment path —
// resolvePacket, fulfillPacket, renderPacketComponent, the packet store, the
// artifact records and readAssembledPacket — under an explicit
// technical-fixture opt-in. Nothing is assembled outside the renderer to make a
// sample look complete, and no track is promoted: all nine stay
// `runtime_disabled`, and the opt-in is what lets a disabled track be generated
// for review at all.
//
// The participant's deliverable is one assembled PDF per route. There is no
// ZIP.
//
// Why this script registers Georgia in-process
// --------------------------------------------
// `registry.ts` and `pleading-templates.ts` are shared. `registry.ts` is a
// global generated path a worker may read but never write, and neither file is
// in this job's ownedPaths. Wiring Georgia into them permanently is the
// integration captain's step, and doing it here would enable a jurisdiction
// this job is required to leave disabled.
//
// So the Georgia pack is registered into the in-process maps for the duration
// of this run only. Nothing on disk changes; the next process starts without
// Georgia. What this buys is that the packets are produced by the real
// resolver, the real renderer and the real assembler rather than by a
// review-only copy of them, which is the whole point of generating through the
// fulfilment path.
//
// Output goes to an ignored review directory. The PDFs, the page images and the
// assembled packets are never committed; the tracked manifest records their
// hashes.
//
// Usage:
//   node scripts/rcap-generate-ga-superior-court-pleading-family-review.mjs [--skip-images]

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

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const { PLEADING_TEMPLATES } = await import("@/lib/rcap/packets/engines/pleading-templates");
const {
  GEORGIA_PLEADING_FAMILY_TRACKS,
  GA_JAIL_K2_STOP,
  GeorgiaTrackUnavailableError,
  GeorgiaBranchError,
  deriveGeorgiaFacts,
  assertGeorgiaTrackImplemented
} = await import("@/lib/rcap/packets/registry-ga-superior-court-pleading-family");
const { GEORGIA_PLEADING_TEMPLATES } = await import("@/lib/rcap/packets/engines/pleading-templates-ga");
const { fulfillPacket, readAssembledPacket } = await import("@/lib/rcap/packets/lifecycle");
const { resolvePacketStore, resetLocalPacketStore } = await import("@/lib/rcap/packets/store");
const { PacketResolutionError } = await import("@/lib/rcap/packets/resolve");

// ---------------------------------------------------------------------------
// In-process registration. See the header for why this is not a file edit.
// ---------------------------------------------------------------------------

export function registerGeorgiaInProcess() {
  if (process.env.RCAP_TECHNICAL_FIXTURES_ENABLED !== "true") {
    throw new Error("Georgia may only be registered in a technical-fixture run.");
  }
  for (const track of GEORGIA_PLEADING_FAMILY_TRACKS) {
    if (!RELIEF_TRACKS.some((entry) => entry.trackId === track.trackId)) RELIEF_TRACKS.push(track);
  }
  Object.assign(PLEADING_TEMPLATES, GEORGIA_PLEADING_TEMPLATES);
}

registerGeorgiaInProcess();

const root = process.cwd();
const OUT_ROOT = path.join(root, "tmp/packet-output-review/tranche-3");
const TRANCHE_DIR = path.join(root, "data/record-clearing/implementation-tranches");
const skipImages = process.argv.includes("--skip-images");

const tranche = readJson(path.join(TRANCHE_DIR, "tranche-3.json"));
const pins = readJson(path.join(TRANCHE_DIR, "tranche-3-authority-pins.json"));
const fixtures = readJson(path.join(TRANCHE_DIR, "tranche-3-fixtures.json"));

const positives = fixtures.positiveFixtures;
const boundaries = fixtures.boundaryFixtures;
const byFixtureId = new Map(positives.map((entry) => [entry.fixtureId, entry]));

// A deterministic owner: the same fixture must always produce the same request
// key, so a rerun proves reuse rather than producing a second artifact set.
const OWNER = "00000000-0000-4000-8000-000000000003";

fs.rmSync(OUT_ROOT, { recursive: true, force: true });
fs.mkdirSync(OUT_ROOT, { recursive: true });
resetLocalPacketStore();

const store = resolvePacketStore();
const results = [];
const failures = [];

console.log(
  `Tranche 3 — ${tranche.jurisdictionName}: ${positives.length} implemented tracks, ${boundaries.length} boundary fixtures.`
);

// ---------------------------------------------------------------------------
// Positive fixtures
// ---------------------------------------------------------------------------

for (const fixture of positives) {
  const trackDir = path.join(OUT_ROOT, fixture.trackId);
  fs.mkdirSync(trackDir, { recursive: true });

  const facts = deriveGeorgiaFacts(fixture.trackId, fixture.facts);
  const request = {
    jurisdiction: "GA",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true,
    ownerId: OWNER,
    requestKey: `tranche-3:${fixture.fixtureId}`,
    rootDir: root,
    store
  };

  const fulfillment = await fulfillPacket(request);

  // Determinism: the same input must produce the same bytes. Rendered again
  // under a different request key so the check exercises the renderer rather
  // than the idempotency cache.
  const second = await fulfillPacket({ ...request, requestKey: `tranche-3:${fixture.fixtureId}:determinism` });

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
      sourceIdentity: component.sourceIdentity,
      sourceSha256: component.sourceSha256,
      rendererStrategy: component.rendererStrategy,
      deterministic,
      warnings: component.warnings
    });
    if (!deterministic) failures.push(`${fixture.fixtureId}/${component.componentId}: non-deterministic output.`);
  }

  // The participant's actual deliverable, produced by the real assembler from
  // what was durably stored. One file, in packet order, no ZIP.
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
    fulfillmentStatus: fulfillment.status,
    runtimeStatus: fulfillment.runtimeStatus,
    outputStrategy: fulfillment.outputStrategy,
    packetSetId: fulfillment.packetSetId,
    isFilingPacket: fulfillment.isFilingPacket,
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
    `  ${fixture.fixtureId.padEnd(44)} ${String(assembled.pageCount).padStart(2)} pages  ${components.length} components  ${fulfillment.runtimeStatus}`
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
    assertGeorgiaTrackImplemented(boundary.trackId);
    const derived = deriveGeorgiaFacts(boundary.trackId, facts);
    await fulfillPacket({
      jurisdiction: "GA",
      trackId: boundary.trackId,
      facts: derived,
      allowTechnicalFixtures: true,
      ownerId: OWNER,
      requestKey: `tranche-3:${boundary.fixtureId}`,
      rootDir: root,
      store
    });
  } catch (error) {
    if (error instanceof GeorgiaTrackUnavailableError) {
      outcome = "track_unavailable";
      detail = error.blockingComponentId;
    } else if (error instanceof GeorgiaBranchError) {
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
  console.log(`  ${boundary.fixtureId.padEnd(44)} ${passed ? "stopped correctly" : "DID NOT STOP"} (${outcome})`);
}

// ---------------------------------------------------------------------------
// Technical review — assertions no visual pass can substitute for
// ---------------------------------------------------------------------------

const PROHIBITED_CONTENT = [
  { id: "expungement_vocabulary", pattern: /expunge/i, why: "Georgia restricts and seals; it does not expunge" },
  { id: "in_re_caption", pattern: /\bIN RE\b/i, why: "an IN RE caption on a filing made in an existing criminal case" },
  { id: "civil_action_number", pattern: /civil action no/i, why: "a Civil Action No. on a criminal-case filing" },
  { id: "fee_amount", pattern: /\$\s?\d/, why: "a filing fee amount, which is unresolved and county-specific" },
  // Permissive framing only. The packets are REQUIRED to carry the opposite
  // sentence — "Defendant is not entitled to state that the record does not
  // exist" — so a bare search for that phrase would flag the very caveat that
  // makes the packet safe. What is prohibited is telling a participant they
  // MAY deny the record.
  {
    id: "record_does_not_exist",
    pattern: /\b(?:may|can|are|is)\s+(?:now\s+)?(?:lawfully\s+)?(?:state|say|assert|deny|represent)\b[^.]{0,60}\b(?:record does not exist|no record exists|never arrested|never happened)/i,
    why: "copy telling a participant they may say the record does not exist"
  },
  { id: "rehabilitation_finding", pattern: /has been rehabilitated|rehabilitation (shows|establishes|warrants)/i, why: "a rehabilitation conclusion asserted by LegalEase" },
  { id: "public_safety_finding", pattern: /not a threat to public safety|poses no (danger|risk)/i, why: "a public-safety conclusion asserted by LegalEase" },
  // The balancing element must be put to the court as a question or recited as
  // the statutory standard, never asserted as fact.
  //
  // Two framings are legitimate and both must survive: "Defendant asks the
  // Court to determine WHETHER the harm ... outweighs ..." and "§ 35-3-37(m)
  // REQUIRES the court to order sealing IF it finds ... that the harm ...
  // outweighs ...". What is prohibited is the bare declarative — "The harm to
  // Defendant clearly outweighs the public's interest." — which states in
  // LegalEase's voice the conclusion the statute reserves to the judge. So the
  // test flags a sentence reaching "outweighs" that carries no framing marker
  // at all.
  {
    id: "harm_outweighs_assertion",
    test: (text) =>
      splitSentences(text).some(
        (sentence) =>
          /\boutweighs\b/i.test(sentence) &&
          !/\b(whether|determine|if|requires?|shall|provides?|asks?|must|finds?|may)\b/i.test(sentence)
      ),
    why: "the balancing conclusion asserted rather than left to the court"
  },
  { id: "attorney_recital", pattern: /by and through (his|her|their|its) attorney/i, why: "an attorney recital on a self-represented filing" },
  { id: "gjp_branding", pattern: /georgia justice project|gjp\.org/i, why: "reference-model publisher branding reproduced" },
  { id: "race_field", pattern: /\brace\s*:/i, why: "a race field" },
  { id: "ssn_field", pattern: /social security (number|no)/i, why: "a social security number field" },
  { id: "notary_block", pattern: /notary public|sworn to and subscribed/i, why: "a notary block on a route that requires no notarization" }
];

/**
 * Routes whose proposed order does not direct the Georgia Crime Information
 * Center, and must not.
 *
 * § 35-3-37(m) sealing operates on a record that is ALREADY restricted. The
 * order runs to the clerk of court and seals the clerk's file; the criminal
 * history record information was restricted by whatever route came first. An
 * order here that purported to direct GCIC would be ordering relief the
 * petition did not ask for, on a record GCIC has already restricted. Every
 * other route in the family restricts, and its order is not actionable unless
 * it names GCIC.
 */
const CLERK_SEALING_ONLY_ORDERS = new Set(["ga-seal-m"]);

const technical = [];
for (const result of results) {
  const trackDir = path.join(OUT_ROOT, result.trackId);
  const fixture = byFixtureId.get(result.fixtureId);
  const issues = [];

  const assembledText = pdfText(path.join(trackDir, result.assembledFileName));
  for (const rule of PROHIBITED_CONTENT) {
    const hit = rule.test ? rule.test(assembledText) : rule.pattern.test(assembledText);
    if (hit) issues.push(`assembled packet: ${rule.why}.`);
  }

  // The effect statement Georgia requires on every packet in this family.
  if (!/does not destroy it|do not destroy it/i.test(assembledText)) {
    issues.push("assembled packet: the restriction-does-not-destroy-the-record statement is absent.");
  }
  // Asserted positively, not merely "not absent": the packet must say the
  // participant may NOT claim the record does not exist.
  if (!/not entitled to state that the record does not exist/i.test(assembledText)) {
    issues.push("assembled packet: the may-not-deny-the-record statement is absent.");
  }
  if (!/42-8-63\.1/.test(assembledText)) {
    issues.push("assembled packet: the § 42-8-63.1 disqualification caveat is absent.");
  }
  if (!/confirm with the clerk/i.test(assembledText)) {
    issues.push("assembled packet: the confirm-the-filing-method instruction is absent.");
  }

  for (const component of result.components) {
    const file = path.join(trackDir, `${result.fixtureId}__${component.order.toString().padStart(2, "0")}-${component.componentId}.pdf`);
    const text = pdfText(file);

    if (component.role === "primary_filing") {
      for (const key of ["defendantName", "caseNumber"]) {
        const value = String(fixture.facts[key] ?? "");
        if (value && !text.includes(value)) issues.push(`${component.componentId}: participant value for ${key} is absent.`);
      }
      if (!text.includes(fixture.facts.participantNarrative)) {
        issues.push(`${component.componentId}: the participant's own statement is absent or was altered.`);
      }
      if (!/own words/i.test(text)) {
        issues.push(`${component.componentId}: participant-authored text is not identified as the participant's.`);
      }
    }

    // Third-party blocks stay blank: a proposed order must not carry a judge
    // name, a signature or a decided outcome.
    if (component.role === "proposed_order") {
      if (/\bs\/\s|\/s\//i.test(text)) issues.push(`${component.componentId}: a signature mark appears on a proposed order.`);
      if (!/\(\s*\)\s*that the relief sought should be GRANTED/i.test(text)) {
        issues.push(`${component.componentId}: the grant election is not blank.`);
      }
      if (!/\(\s*\)\s*that the relief sought should be DENIED/i.test(text)) {
        issues.push(`${component.componentId}: the denial election is not blank.`);
      }
      if (!CLERK_SEALING_ONLY_ORDERS.has(result.trackId) && !/Georgia Crime Information Center/i.test(text)) {
        issues.push(`${component.componentId}: the order does not direct the Georgia Crime Information Center, so it is not actionable.`);
      }
      // The judicial signature block must not be split by a page break. The
      // flow writer has no keep-together rule, so this is asserted rather than
      // assumed: a rule on one page and its date on the next is a block a judge
      // would sign incompletely.
      const pages = pdfPageTexts(file);
      const signaturePage = pages.find((page) => /JUDGE,/i.test(page));
      if (!signaturePage) {
        issues.push(`${component.componentId}: no judicial signature block.`);
      } else if (!/Date:/i.test(signaturePage)) {
        issues.push(`${component.componentId}: the judicial signature block is split across a page break.`);
      }
    }

    // A custom pleading carries no official source binary, by design.
    if (component.rendererStrategy === "custom_pleading" && component.sourceSha256 !== null) {
      issues.push(`${component.componentId}: a custom pleading reports an official source hash.`);
    }
    if (!component.deterministic) issues.push(`${component.componentId}: output is not deterministic.`);
    if (component.pageCount === null || component.pageCount < 1) issues.push(`${component.componentId}: no page count.`);
  }

  // Component completeness against the pinned packet definition. Conditional
  // components are only expected where the fixture switched them on.
  const pinned = pins.tracks.find((entry) => entry.trackId === result.trackId).components;
  const produced = result.components.map((c) => c.componentId);
  for (const component of pinned) {
    const expected =
      component.requirement === "required" ||
      Boolean(fixture.facts[componentConditionKey(result.trackId, component.componentId)]);
    if (expected && !produced.includes(component.componentId)) {
      issues.push(`${component.componentId}: expected component was not produced.`);
    }
  }
  const orders = result.components.map((c) => c.order);
  if (orders.some((value, index) => index > 0 && value <= orders[index - 1])) {
    issues.push("components are not in ascending packet order.");
  }
  if (!result.assemblyDeterministic) issues.push("the assembled packet is not deterministic.");

  technical.push({ fixtureId: result.fixtureId, trackId: result.trackId, passed: issues.length === 0, issues });
  failures.push(...issues.map((issue) => `${result.fixtureId}: ${issue}`));
}

// ---------------------------------------------------------------------------
// Write the review records
// ---------------------------------------------------------------------------

const technicalPassed = technical.every((entry) => entry.passed) && boundaryResults.every((entry) => entry.passed);

const generation = {
  schemaVersion: 1,
  trancheId: tranche.trancheId,
  generatedAt: new Date().toISOString(),
  authorityEdition: pins.authorityEdition,
  authorityArchiveSha256: pins.authorityArchiveSha256,
  positives: results,
  boundaries: boundaryResults,
  technical,
  technicalPassed,
  failures
};
fs.writeFileSync(path.join(OUT_ROOT, "generation-result.json"), `${JSON.stringify(generation, null, 2)}\n`);

// The tracked manifest. Records what was produced and its hashes; the bytes
// themselves stay in the ignored review directory.
const manifest = {
  schemaVersion: 1,
  trancheId: tranche.trancheId,
  jobId: tranche.jobId,
  jurisdiction: "GA",
  jurisdictionName: "Georgia",
  authorityEdition: pins.authorityEdition,
  authorityArchiveSha256: pins.authorityArchiveSha256,
  humanLegalReviewStatus: "awaiting_counsel_review",
  runtimeStatus: "runtime_disabled",
  reviewDirectory: "tmp/packet-output-review/tranche-3 (ignored; regenerate with the generation command)",
  generationCommand: "node scripts/rcap-generate-ga-superior-court-pleading-family-review.mjs",
  verificationCommand: "node scripts/verify-rcap-ga-superior-court-pleading-family-packets.mjs",
  deliverableModel:
    "One assembled participant-facing PDF per route, bound in packet order by the shared packet assembler. There is no ZIP.",
  implementedTrackCount: results.length,
  componentCount: results.reduce((total, entry) => total + entry.components.length, 0),
  assembledPageCount: results.reduce((total, entry) => total + entry.assembledPageCount, 0),
  technicalReview: {
    passed: technicalPassed,
    checks: [
      "Every component rendered through CustomPleadingRenderer and reopened as a PDF.",
      "Every component rendered twice under different request keys produced identical bytes.",
      "Every assembled packet was produced by the shared assembler from durably stored components and is byte-identical on regeneration.",
      "No prohibited content in any assembled packet: no expungement vocabulary, no IN RE caption, no Civil Action No., no fee amount, no notary block, no asserted balancing conclusion, no reference-model branding.",
      "Every packet carries the restriction-does-not-destroy-the-record statement, the § 42-8-63.1 disqualification caveat and the confirm-with-the-clerk instruction.",
      "Every proposed order leaves both elections blank, carries no signature mark and directs the Georgia Crime Information Center.",
      "Every participant statement is reproduced verbatim and attributed on the face of the document.",
      "Every boundary fixture stopped with its expected typed failure, including the ga-jail-k2 typed stop."
    ]
  },
  blockedTracks: [
    {
      trackId: GA_JAIL_K2_STOP.trackId,
      blockingComponentId: GA_JAIL_K2_STOP.blockingComponentId,
      reason: GA_JAIL_K2_STOP.reason,
      unblockedBy: GA_JAIL_K2_STOP.unblockedBy,
      provedBy: "ga-jail-k2__typed-stop boundary fixture"
    }
  ],
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
      templateId: component.sourceIdentity,
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
    "An engineering generation and technical-proof record. It is not a legal approval. Every track remains runtime_disabled at awaiting_counsel_review, no jurisdiction is enabled, and packet readiness remains 0."
};
fs.writeFileSync(path.join(TRANCHE_DIR, "tranche-3-review-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log("");
console.log(`Assembled packets: ${results.length}. Boundary fixtures: ${boundaryResults.length}.`);
console.log(`Technical review: ${technicalPassed ? "passed" : "FAILED"}.`);
if (failures.length > 0) {
  console.log("");
  for (const failure of failures.slice(0, 40)) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log(`ga-jail-k2 remains a typed stop on ${GA_JAIL_K2_STOP.blockingComponentId}.`);
console.log("No track was promoted. Every Tranche 3 track remains runtime_disabled.");

// ---------------------------------------------------------------------------

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** The fact key that switches a conditional component on, from the registry. */
function componentConditionKey(trackId, componentId) {
  const track = GEORGIA_PLEADING_FAMILY_TRACKS.find((entry) => entry.trackId === trackId);
  return track?.packetSet.components.find((entry) => entry.componentId === componentId)?.conditionKey ?? "";
}

/** Page-by-page text, for assertions about where a page break falls. */
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

/** Sentences, for assertions that turn on how a clause is framed. */
function splitSentences(text) {
  return text.split(/(?<=[.;])\s+/);
}

/** Extracted page text, used for content assertions rather than for display. */
function pdfText(file) {
  const result = spawnSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`pdftotext failed for ${file}: ${result.stderr}`);
  // Collapse the soft line breaks the layout mode introduces so a sentence that
  // wrapped across two lines still matches.
  return result.stdout.replace(/-\n\s*/g, "").replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ");
}
