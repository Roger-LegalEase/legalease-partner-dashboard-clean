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

const NON_GRANTS = [
  "This document opens no commercial route.",
  "It creates no fulfillment record and consumes no packet credit.",
  "It marks no packet proven and grants no output approval.",
  "It does not add this track to compiled runtime. src/lib/rcap-engine/compiled/** is untouched.",
  "It does not change any live RCAP route.",
  "Commercial authority comes from a Grade-A fulfillment record keyed to an exact route and packet family, and from nothing else. This is not that record."
];

let written = 0, skipped = 0;
for (const f of master.families) {
  const wiringPath = path.join(ROOT, f.directory, "product-wiring.json");
  const artifactsPath = path.join(ROOT, f.directory, "reports", "rendered-artifacts.json");
  if (fs.existsSync(wiringPath)) { skipped++; continue; }
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
console.log(`${written} wiring record(s) written, ${skipped} already present`);
