#!/usr/bin/env node
/*
 * Product wiring, generated from build evidence instead of installed by hand.
 *
 * The simplification directive: one route-to-deliverable registry entry per
 * family, with hashes and provenance produced automatically in the background.
 * This emits a DECLARED_NOT_INSTALLED wiring for every family that has a
 * master-queue row and declared rendered artifacts but no wiring yet. It
 * derives the component list from the family's own rendered-artifacts.json.
 * It opens nothing: the explicit non-grants travel on every record.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const master = read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");

let checkOnly = false;
let selectedFamilyId = null;
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === "--check") {
    checkOnly = true;
    continue;
  }
  if (arg === "--family") {
    if (selectedFamilyId !== null || !process.argv[i + 1] || process.argv[i + 1].startsWith("--")) {
      console.error("usage: node generate-product-wiring.mjs [--check] [--family <familyId>]");
      process.exit(2);
    }
    selectedFamilyId = process.argv[++i];
    continue;
  }
  console.error(`unknown argument: ${arg}`);
  console.error("usage: node generate-product-wiring.mjs [--check] [--family <familyId>]");
  process.exit(2);
}

const selectedFamilies = selectedFamilyId === null
  ? master.families
  : master.families.filter((f) => f.familyId === selectedFamilyId);
if (selectedFamilyId !== null && selectedFamilies.length !== 1) {
  console.error(`family not found in MASTER_QUEUE.json: ${selectedFamilyId}`);
  process.exit(2);
}

const rasterQueue = (() => { try { return read("data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json"); } catch { return { rows: [] }; } })();
const verifierReturns = (() => { try { return read("data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json"); } catch { return { rows: [] }; } })();
const rasterCandidatesByFamily = new Map();
for (const r of [...(rasterQueue.historicalRasterRows ?? []), ...(rasterQueue.rows ?? [])]) {
  if (!r.familyId) continue;
  const candidates = rasterCandidatesByFamily.get(r.familyId) ?? [];
  candidates.push(r);
  rasterCandidatesByFamily.set(r.familyId, candidates);
}
const fileMatchesDigest = (rel, digest) => {
  if (!rel || !/^[0-9a-f]{64}$/.test(String(digest ?? ""))) return false;
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return false;
  return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex") === digest;
};
const exactRasterFor = (familyId) => {
  const candidates = rasterCandidatesByFamily.get(familyId) ?? [];
  for (let i = candidates.length - 1; i >= 0; i--) {
    const candidate = candidates[i];
    const receipt = candidate.rasterReceipt;
    if (!receipt || receipt.coversTheWholeFamily !== true) continue;
    if (!fileMatchesDigest(candidate.canonicalPdfPath, receipt.boundToCanonicalSha256)) continue;
    if (receipt.boundToBoundarySha256
      && !fileMatchesDigest(candidate.boundaryPdfPath, receipt.boundToBoundarySha256)) continue;
    return candidate;
  }
  return null;
};
const currentVerdict = new Map();
for (const r of verifierReturns.rows ?? []) {
  if (!r.isIndependentVerification || !r.verdict || r.superseded) continue;
  currentVerdict.set(r.familyId, r);
}

/*
 * WHAT A BINDING RECORDS, AND WHAT IT STILL REFUSES.
 *
 * A family is not operationally complete because its packet passed. The
 * binding is the record a route resolver would read: what the participant
 * receives, which components carry it, where the field map and the
 * instructions are, which acceptance receipt proves the pixels, which source
 * version it was built from, and when it was last independently read.
 *
 * PAYMENT STAYS FAIL-CLOSED, and that is not a formality. Commercial authority
 * comes from a Grade-A fulfillment record keyed to an exact route and packet
 * family and from nothing else, so every binding written here says
 * paymentEligible: false and sponsorshipEligible: false, and says why. A
 * binding is a description of a deliverable, not a grant to sell it.
 */
const bindingFor = (f) => {
  const raster = exactRasterFor(f.familyId);
  const verdict = currentVerdict.get(f.familyId) ?? null;
  const has = (rel) => fs.existsSync(path.join(ROOT, f.directory, rel));
  return {
    family: f.familyId,
    jurisdiction: f.jurisdiction,
    routeKeys: f.routeKeys,
    deliveryType: f.implementationStrategy,
    instrumentKinds: f.instrumentKinds ?? [],
    packetComponents: f.packetComponents ?? [],
    fieldMap: has("production-field-map.json") ? `${f.directory}/production-field-map.json` : null,
    instructions: has("participant-instructions.md") ? `${f.directory}/participant-instructions.md` : null,
    renderedArtifacts: has("reports/rendered-artifacts.json") ? `${f.directory}/reports/rendered-artifacts.json` : null,
    sourceReceipt: has("source-receipt.json") ? `${f.directory}/source-receipt.json` : null,
    sourceVersion: (f.sourceReadiness?.boundSources ?? []).map((b) => ({ sourceId: b.sourceId, sha256: b.sha256, tier: b.tier })),
    acceptanceReceipt: raster?.rasterReceipt
      ? {
          verdict: raster.rasterReceipt.verdict,
          workflowRunId: raster.rasterReceipt.workflowRunId,
          jobId: raster.rasterReceipt.jobId,
          artifactId: raster.rasterReceipt.receiptArtifact?.id ?? null,
          boundToCanonicalSha256: raster.rasterReceipt.boundToCanonicalSha256,
          coversTheWholeFamily: raster.rasterReceipt.coversTheWholeFamily === true
        }
      : null,
    lastIndependentVerification: verdict
      ? { verdict: verdict.verdict, lane: verdict.lane, verifiedAtBase: verdict.verifiedAtBase ?? null }
      : null,
    paymentEligible: false,
    sponsorshipEligible: false,
    whyPaymentIsClosed: "Commercial authority comes from a Grade-A fulfillment record keyed to an exact route and packet family, and from nothing else. This binding is not that record, and nothing in this repository has produced one.",
    maintenanceRelationship: {
      rebuiltFrom: f.buildScript,
      sharedBuildHost: f.sharedBuildHost ?? null,
      reRasterRequiredWhen: "any fixture byte moves; the acceptance receipt binds exact hashes and refuses a packet nobody rendered",
      reVerificationRequiredWhen: "the packet bytes, its bound source, or its legal treatment changes"
    }
  };
};

/*
 * A product-specific installed binding is not a cache of the factory queue.
 * It can carry a different, narrower route identity plus exact delivery
 * artifacts, authenticated review, and operational holds that the generic
 * census binding cannot reconstruct.  In particular, the Mississippi Clinic
 * Mode record is generated by its own packet workflow and binds the two
 * participant-delivery PDFs, not the census fixtures in RASTER_QUEUE.json.
 * Preserve such bindings byte-for-byte; their owning generator is the only
 * component allowed to replace them.
 */
const hasBespokeInstalledBinding = (record) =>
  /^INSTALLED_/.test(String(record?.status ?? ""))
  && record?.generatedBy !== "scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs"
  && typeof record?.binding?.packetSpecification === "string"
  && record?.binding?.artifacts
  && typeof record.binding.artifacts === "object";

const NON_GRANTS = [
  "This document opens no commercial route.",
  "It creates no fulfillment record and consumes no packet credit.",
  "It marks no packet proven and grants no output approval.",
  "It does not add this track to compiled runtime. src/lib/rcap-engine/compiled/** is untouched.",
  "It does not change any live RCAP route.",
  "Commercial authority comes from a Grade-A fulfillment record keyed to an exact route and packet family, and from nothing else. This is not that record."
];

let written = 0, skipped = 0, refreshed = 0, bespokeBindingsPreserved = 0;
const digestsRepinned = [];
const digestFileMissing = [];
for (const f of selectedFamilies) {
  const wiringPath = path.join(ROOT, f.directory, "product-wiring.json");
  const artifactsPath = path.join(ROOT, f.directory, "reports", "rendered-artifacts.json");
  /*
   * A wiring record written before bindings existed carries no binding, and a
   * binding goes stale the moment a receipt or a verdict moves. So an existing
   * record is refreshed in place rather than skipped: its identity and its
   * non-grants are untouched, and the binding is rewritten from current
   * evidence.
   *
   * The component digests in proposedRepresentation are refreshed too, and this
   * is not an exception to leaving the proposal alone. Everything else in that
   * block is a proposal -- which components, in what order, in what role, at
   * what path. A sha256 is not a proposal about anything; it is a measurement
   * of the bytes at the path the proposal names, and a measurement that no
   * longer matches the bytes is simply wrong.
   *
   * It was wrong on ten of seventy-nine records. Every one of them is a family
   * repaired after its wiring was first written: the packet was rebuilt, the
   * fixture changed, and the digest kept naming the superseded bytes -- in one
   * case three lines above an acceptanceReceipt that recorded the new hash, so
   * the same file disagreed with itself. An independent verifier failed the AK
   * treatment on ARTIFACTS for exactly this and was right to: a route installs
   * from this record, and a stale pin installs the wrong document or nothing.
   *
   * The refresh only ever answers the question the field already asks. A named
   * file that is absent keeps its declared digest and is reported, because a
   * missing component is a build problem and silently blanking its hash would
   * bury it.
   */
  if (fs.existsSync(wiringPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(wiringPath, "utf8"));
      const before = JSON.stringify(existing);
      if (hasBespokeInstalledBinding(existing)) bespokeBindingsPreserved++;
      else existing.binding = bindingFor(f);
      for (const c of existing.proposedRepresentation?.components ?? []) {
        if (!c.file || !/^[0-9a-f]{64}$/.test(String(c.sha256 ?? ""))) continue;
        const abs = path.join(ROOT, c.file);
        if (!fs.existsSync(abs)) { digestFileMissing.push({ family: f.familyId, file: c.file }); continue; }
        const actual = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
        if (actual === c.sha256) continue;
        digestsRepinned.push({ family: f.familyId, componentId: c.componentId ?? null, file: c.file, was: c.sha256, now: actual });
        c.sha256 = actual;
      }
      if (JSON.stringify(existing) !== before) {
        if (!checkOnly) fs.writeFileSync(wiringPath, `${JSON.stringify(existing, null, 2)}\n`);
        refreshed++;
      } else skipped++;
    } catch { skipped++; }
    continue;
  }
  if (!fs.existsSync(artifactsPath)) continue;
  let art;
  try { art = JSON.parse(fs.readFileSync(artifactsPath, "utf8")); } catch { continue; }
  /* Fixture labels vary by host era: "canonical", "tf810-canonical",
   * "canonical-misdemeanor_5yr". A canonical fixture is one whose label
   * carries `canonical` as a hyphen-delimited segment.
   *
   * The anchored form missed only the third shape, and only dc_seal_conviction
   * wears it -- which is why that family alone reached VERIFIED_PASS with no
   * wiring record at all, and so could never be proven. Every other family
   * matched by this test already matched the anchored one, so widening it
   * writes exactly one record that was previously skipped and rewrites none.
   */
  const docs = (art.artifacts ?? art.pdfs ?? art.packets ?? []).filter((a) => /(^|-)canonical(-|$)/.test(String(a.fixture ?? "")));
  if (docs.length === 0) continue;
  /*
   * A component is a document a participant files. It is NOT a rendering, and
   * on DC the two are not even the same shape.
   *
   * Almost every family renders one canonical fixture per document, so the
   * fixture list and the component list coincide and the ordinary branch below
   * is right. DC does something else: it assembles its whole packet into ONE
   * fixture and renders that fixture once per route -- the misdemeanor
   * five-year track and the felony eight-year track. Each of those fixtures
   * declares the same three documents inside it: primary_filing,
   * prosecutor_service, filing_instructions.
   *
   * Reading the fixtures as components would have said this family files two
   * documents named canonical-misdemeanor_5yr and canonical-felony_8yr, one of
   * them a "companion_document" -- so a route installer would represent a
   * participant filing a misdemeanor motion AND a felony motion. The family
   * files three documents, and which assembled bytes carry them depends on
   * which route the participant is on.
   *
   * So where a canonical fixture declares the documents inside it, those are
   * the components, and the per-route assembled renderings are recorded beside
   * them as what actually carries the bytes.
   */
  const assembled = docs.filter((d) => Array.isArray(d.documents ?? d.components) && (d.documents ?? d.components).length > 0);
  const isAssembledPacket = assembled.length === docs.length && docs.length > 0
    && new Set(docs.map((d) => d.routeKey ?? "")).size === docs.length;
  const componentGroups = [];
  const groupIndex = new Map();
  if (isAssembledPacket) {
    for (const d of docs) for (const document of (d.documents ?? d.components)) {
      const documentId = typeof document === "string" ? document : document?.documentId;
      if (!documentId) continue;
      if (!groupIndex.has(documentId)) { groupIndex.set(documentId, componentGroups.length); componentGroups.push({ key: documentId, renderings: [] }); }
      componentGroups[groupIndex.get(documentId)].renderings.push(d);
    }
  } else {
    for (const d of docs) {
      const key = d.documentId ?? d.document ?? path.basename(d.file ?? "", ".pdf");
      if (!groupIndex.has(key)) { groupIndex.set(key, componentGroups.length); componentGroups.push({ key, renderings: [] }); }
      componentGroups[groupIndex.get(key)].renderings.push(d);
    }
  }
  const wiring = {
    schemaVersion: "rcap-census-v1-product-wiring/v1",
    family: f.familyId,
    routeKey: f.routeKeys[0] ?? null,
    routeKeys: f.routeKeys,
    workType: "PRODUCT_WIRING_REQUIRED",
    status: "DECLARED_NOT_INSTALLED",
    authorityCreated: "none",
    generatedBy: "scripts/grade-a-packet-factory-24h/generate-product-wiring.mjs",
    derivedFrom: `${f.directory}/reports/rendered-artifacts.json`,
    explicitNonGrants: NON_GRANTS,
    currentState: {
      serviceDisposition: "missing_from_compiled_runtime",
      commercialState: "NO_ROUTE_LEVEL_GRADE_A_AUTHORITY_FROM_TRACK_MEMBERSHIP",
      existingArtifactIds: [],
      generationAllowed: false
    },
    binding: bindingFor(f),
    proposedRepresentation: {
      note: "A specification for a later lane, derived from the family's own declared render. Installing it would still represent in runtime a packet whose output no human has reviewed or approved.",
      packetSetId: f.familyId,
      outputStrategy: f.implementationStrategy,
      components: componentGroups.map((g, i) => {
        const perRoute = g.renderings.length > 1;
        const only = g.renderings[0];
        return {
          componentId: `${f.familyId}-component-${i + 1}`,
          role: i === 0 ? "primary_filing" : "companion_document",
          order: i + 1,
          documentId: g.key,
          file: perRoute ? null : (only.file ?? null),
          sha256: perRoute ? null : (only.sha256 ?? null),
          requirement: "required",
          ...(perRoute ? {
            carriedByAssembledPacketPerRoute: g.renderings.map((d) => ({
              routeKey: d.routeKey ?? null,
              fixture: d.fixture ?? null,
              file: d.file ?? null,
              sha256: d.sha256 ?? null,
              pagesInThatPacket: (d.pageManifest ?? []).filter((p) => (p.documentId ?? p.component) === g.key).map((p) => p.packetPage)
            })),
            whyThereIsNoSingleDigest: "This family assembles its whole packet into one fixture and renders that fixture once per route, so this component has no bytes of its own to pin. A route installs the assembled packet whose routeKey it matches; the digests are on those packets, and the pages above say where this component sits inside each."
          } : {})
        };
      })
    }
  };
  if (!checkOnly) fs.writeFileSync(wiringPath, `${JSON.stringify(wiring, null, 2)}\n`);
  console.log(`${checkOnly ? "would write" : "wrote"} ${f.directory}/product-wiring.json (${componentGroups.length} component(s) across ${docs.length} canonical rendering(s))`);
  written++;
}
console.log(checkOnly
  ? `${written} wiring record(s) need creation, ${refreshed} record(s) need refresh, ${skipped} unchanged`
  : `${written} wiring record(s) written, ${refreshed} record(s) refreshed, ${skipped} unchanged`);
if (bespokeBindingsPreserved) console.log(`  ${bespokeBindingsPreserved} bespoke installed binding(s) preserved`);
if (digestsRepinned.length) {
  console.log(`  ${digestsRepinned.length} component digest(s) re-pinned to the bytes on disk:`);
  for (const d of digestsRepinned) console.log(`    ${d.family} ${d.file.split("/").pop()} ${d.was.slice(0, 12)} -> ${d.now.slice(0, 12)}`);
}
for (const m of digestFileMissing) console.log(`  MISSING component file, digest left as declared: ${m.family} ${m.file}`);
if (checkOnly && (written > 0 || refreshed > 0)) process.exitCode = 1;
