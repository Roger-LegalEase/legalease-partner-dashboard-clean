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
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const master = read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const rasterQueue = (() => { try { return read("data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json"); } catch { return { rows: [] }; } })();
const verifierReturns = (() => { try { return read("data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json"); } catch { return { rows: [] }; } })();
const rasterByFamily = new Map((rasterQueue.rows ?? []).map((r) => [r.familyId, r]));
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
  const raster = rasterByFamily.get(f.familyId) ?? null;
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

const NON_GRANTS = [
  "This document opens no commercial route.",
  "It creates no fulfillment record and consumes no packet credit.",
  "It marks no packet proven and grants no output approval.",
  "It does not add this track to compiled runtime. src/lib/rcap-engine/compiled/** is untouched.",
  "It does not change any live RCAP route.",
  "Commercial authority comes from a Grade-A fulfillment record keyed to an exact route and packet family, and from nothing else. This is not that record."
];

let written = 0, skipped = 0, refreshed = 0;
for (const f of master.families) {
  const wiringPath = path.join(ROOT, f.directory, "product-wiring.json");
  const artifactsPath = path.join(ROOT, f.directory, "reports", "rendered-artifacts.json");
  /*
   * A wiring record written before bindings existed carries no binding, and a
   * binding goes stale the moment a receipt or a verdict moves. So an existing
   * record is refreshed in place rather than skipped: its identity, its
   * proposal and its non-grants are untouched, and only the binding is
   * rewritten from current evidence.
   */
  if (fs.existsSync(wiringPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(wiringPath, "utf8"));
      const binding = bindingFor(f);
      if (JSON.stringify(existing.binding ?? null) !== JSON.stringify(binding)) {
        existing.binding = binding;
        fs.writeFileSync(wiringPath, `${JSON.stringify(existing, null, 2)}\n`);
        refreshed++;
      } else skipped++;
    } catch { skipped++; }
    continue;
  }
  if (!fs.existsSync(artifactsPath)) continue;
  let art;
  try { art = JSON.parse(fs.readFileSync(artifactsPath, "utf8")); } catch { continue; }
  /* Fixture labels vary by host era: "canonical", "tf810-canonical", …
   * A canonical fixture is one whose label says canonical. */
  const docs = (art.artifacts ?? art.pdfs ?? []).filter((a) => /(^|-)canonical$/.test(String(a.fixture ?? "")));
  if (docs.length === 0) continue;
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
      components: docs.map((d, i) => ({
        componentId: `${f.familyId}-component-${i + 1}`,
        role: i === 0 ? "primary_filing" : "companion_document",
        order: i + 1,
        documentId: d.documentId ?? d.document ?? path.basename(d.file ?? "", ".pdf"),
        file: d.file ?? null,
        sha256: d.sha256 ?? null,
        requirement: "required"
      }))
    }
  };
  fs.writeFileSync(wiringPath, `${JSON.stringify(wiring, null, 2)}\n`);
  console.log(`wrote ${f.directory}/product-wiring.json (${docs.length} component(s))`);
  written++;
}
console.log(`${written} wiring record(s) written, ${refreshed} binding(s) refreshed, ${skipped} unchanged`);
