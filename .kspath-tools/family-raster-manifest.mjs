/* A lane-local raster manifest for the Kansas FAMILY ASSEMBLY.
 *
 * data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json is the Captain's and is
 * not written by this lane, and its Kansas row pins the pre-label bytes. This
 * manifest exists so the family assembly can still be rendered against the bytes
 * that exist now, and so the receipt binds to those bytes and no others.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const BUILD = "data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading/reports/rendered-artifacts.json";
const built = JSON.parse(fs.readFileSync(BUILD, "utf8"));
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const documents = built.artifacts.map((a) => {
  const observed = sha(a.file);
  if (observed !== a.sha256) throw new Error(`${a.file}: on disk ${observed}, build record ${a.sha256}`);
  return { role: a.fixture, name: `family-assembly--${a.fixture}.pdf`, path: a.file, sha256: observed, pageCount: a.pageCount };
}).sort((x, y) => x.name.localeCompare(y.name));
const canonical = documents.find((d) => d.role === "canonical");
const boundary = documents.find((d) => d.role === "boundary");
const row = {
  familyId: "rcap-ks-custom-pleading",
  unitOfDelivery: "family_assembly",
  /* The commit that actually carries these bytes, not HEAD. A receipt that
   * names a commit whose Kansas bytes are different bytes is the same defect
   * as a receipt that names a hash nobody can produce. */
  packetCommitSha: execFileSync("git", ["log", "-1", "--format=%H", "--",
    "data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading/fixtures"],
    { encoding: "utf8" }).trim(),
  canonicalPdfPath: canonical.path, canonicalPdfSha256: canonical.sha256,
  boundaryPdfPath: boundary.path, boundaryPdfSha256: boundary.sha256,
  expectedPages: canonical.pageCount,
  documents,
  documentsDigest: crypto.createHash("sha256").update(documents.map((d) => `${d.path}:${d.sha256}`).join("\n")).digest("hex"),
  coverage: { documents: documents.map((d) => d.name), rastered: documents.map((d) => d.name), notRastered: [], complete: true,
    basis: "both family-assembly fixtures are rendered. The family assembly is build and review evidence on this two-route family and is not itself a participant deliverable; the route artifacts are." },
  requestedScale: 2.5,
  currentRasterState: "RASTER_PENDING",
};
const doc = {
  schemaVersion: "rcap-route-artifact-raster-queue/v1",
  generatedBy: ".kspath-tools/family-raster-manifest.mjs (FIX03, fable/kspath)",
  whyThisExists: "The Kansas family assembly moved when the printed route line changed from the machine key to the human label. RASTER_QUEUE.json is the Captain's and still pins the pre-label bytes, so this lane renders the assembly against a manifest of its own rather than writing the Captain's queue.",
  thisIsNotTheCaptainsQueue: "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json and MASTER_QUEUE.json are the Captain's and are not written by this lane.",
  consumedBy: "node scripts/rcap-raster-batch.mjs --manifest <this file> --family rcap-ks-custom-pleading --out <dir>",
  requestedScale: 2.5,
  counts: { rows: 1, documents: documents.length, pages: documents.reduce((n, d) => n + d.pageCount, 0) },
  rows: [row],
  packetPdfsModified: 0, packetContentChanged: false, commercialRoutesOpened: 0, productionTouched: false
};
const OUT = "data/rcap-grade-a/packet-factory-24h/fix03-kansas/FAMILY_ASSEMBLY_RASTER_MANIFEST.json";
fs.mkdirSync("data/rcap-grade-a/packet-factory-24h/fix03-kansas", { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`);
console.log(OUT, JSON.stringify(doc.counts));
