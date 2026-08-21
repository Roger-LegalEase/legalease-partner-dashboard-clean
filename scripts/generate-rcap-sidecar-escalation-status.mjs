#!/usr/bin/env node
// Re-derives ESC-SIDECAR-NONCONFORMANT from measurement, per family.
//
//   node scripts/generate-rcap-sidecar-escalation-status.mjs
//
// The escalation has been carried globally as "open" because an older record
// says so. That record predates the sidecars now committed. An escalation is a
// statement about bytes, so it is answered here by running the canonical
// contract — the same PROVENANCE_SCHEMA and the same provenanceCoversArtifact
// the shared verifier uses — against each family's committed sidecar, and
// retained only where a current measured failure remains.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sidecarStatus, SIDECAR_REQUIRED_FIELDS } from "./generate-rcap-all-page-visual-evidence.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAY = path.join(rootDir, "data/rcap-all50/overlays/production");
const OUT = path.join(rootDir, "data/rcap-all50/visual-evidence/sidecar-escalation-status.json");

/** Every family package that carries a provenance sidecar. */
function familiesWithSidecars() {
  const out = [];
  for (const state of fs.readdirSync(OVERLAY)) {
    const stateDir = path.join(OVERLAY, state);
    if (!fs.statSync(stateDir).isDirectory()) continue;
    for (const slug of fs.readdirSync(stateDir)) {
      const dir = path.join(stateDir, slug);
      if (!fs.existsSync(path.join(dir, "artifact-provenance.json"))) continue;
      const sidecar = JSON.parse(fs.readFileSync(path.join(dir, "artifact-provenance.json"), "utf8"));
      // A sidecar missing formFamily is exactly the failure being measured, so
      // the identity falls back to the source record rather than to the
      // directory name — otherwise the families that fail hardest are also the
      // ones listed under an id no other record uses.
      let familyId = sidecar.formFamily ?? null;
      if (!familyId) {
        const sr = path.join(dir, "source-record.json");
        const jurisdiction = fs.existsSync(sr)
          ? JSON.parse(fs.readFileSync(sr, "utf8")).jurisdiction ?? null : null;
        familyId = `${jurisdiction ?? state}:${slug}`;
      }
      out.push({ familyId, dir, familyIdFromSidecar: Boolean(sidecar.formFamily) });
    }
  }
  return out.sort((a, b) => a.familyId.localeCompare(b.familyId));
}

const families = [];
for (const { familyId, dir, familyIdFromSidecar } of familiesWithSidecars()) {
  const status = await sidecarStatus(dir);
  families.push({
    familyId, familyIdFromSidecar, familyPath: path.relative(rootDir, dir),
    schemaVersion: status.schemaVersion, schemaOk: status.schemaOk,
    requiredFields: status.requiredFields, fieldsPresent: status.fieldsPresent,
    missingFields: status.missingFields,
    artifactsBound: status.artifactsBound,
    sidecarSha256: status.sidecarSha256,
    conformant: status.conformant,
    escalationStatus: status.conformant ? "resolved_for_this_family" : "open",
    basis: status.escalationBasis
  });
}

const resolved = families.filter((f) => f.conformant);
const open = families.filter((f) => !f.conformant);
const record = {
  schemaVersion: "rcap-sidecar-escalation-status/v1",
  generatedBy: "scripts/generate-rcap-sidecar-escalation-status.mjs",
  escalation: "ESC-SIDECAR-NONCONFORMANT",
  purpose: "The measured status of the provenance-sidecar escalation, family by family. Replaces a global 'open' inherited from a record written before these sidecars existed.",
  contract: {
    schema: "rcap-artifact-provenance/v1",
    requiredFields: SIDECAR_REQUIRED_FIELDS,
    requiredFieldCount: SIDECAR_REQUIRED_FIELDS.length,
    bindingRule: "provenanceCoversArtifact() from scripts/rcap-official-forms/rcap-artifact-provenance.mjs must return covered for every artifact the sidecar names, against the bytes on disk and the recorded source digest",
    note: "Sidecars may carry more fields than the contract requires; the count here is of required fields present and non-null, not of every key in the file."
  },
  totals: {
    familiesWithASidecar: families.length,
    conformant: resolved.length,
    stillFailing: open.length
  },
  readingThis: open.length === 0
    ? "No family carries a measured sidecar failure at this head. ESC-SIDECAR-NONCONFORMANT is resolved everywhere it was measured and should not be restated as globally open."
    : `${open.length} family/families carry a current measured failure and retain the escalation; the rest are resolved.`,
  stillFailing: open.map((f) => ({ familyId: f.familyId, missingFields: f.missingFields, artifactsBound: f.artifactsBound })),
  families
};
fs.writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`);
console.log(`  sidecars measured: ${families.length}`);
console.log(`  conformant: ${resolved.length}   still failing: ${open.length}`);
for (const f of open) console.log(`   OPEN ${f.familyId} missing=[${f.missingFields.join(", ")}] unbound=[${f.artifactsBound.filter((a) => !a.bound).map((a) => `${a.artifact}:${a.reason}`).join(", ")}]`);
console.log(`OK sidecar escalation status — ${resolved.length} of ${families.length} sidecars satisfy the canonical contract at this head`);
