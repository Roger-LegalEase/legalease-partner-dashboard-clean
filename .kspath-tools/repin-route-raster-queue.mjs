/* Repin the two Kansas rows of the route-artifact raster queue onto the bytes
 * that exist now. Kansas only: every other row is copied through untouched. */
import fs from "node:fs";
import crypto from "node:crypto";
const QUEUE = "data/rcap-grade-a/route-artifact-acceptance/ROUTE_ARTIFACT_RASTER_QUEUE.json";
const BUILD = "data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading/reports/rendered-artifacts.json";
const q = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
const built = JSON.parse(fs.readFileSync(BUILD, "utf8"));
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const changes = [];
for (const row of q.rows) {
  if (row.packetFamilyId !== "rcap-ks-custom-pleading") continue;
  const mine = built.routeArtifacts.filter((a) => a.route === row.route);
  if (mine.length !== 2) throw new Error(`${row.route}: build declares ${mine.length} artifacts, expected canonical and boundary`);
  const documents = mine.map((a) => {
    const observed = sha(a.file);
    if (observed !== a.sha256) throw new Error(`${a.file}: on disk ${observed}, build record ${a.sha256}`);
    return { role: a.fixture, name: `${row.route}--${a.fixture}.pdf`, path: a.file, sha256: observed, pageCount: a.pageCount };
  }).sort((x, y) => x.name.localeCompare(y.name));
  const canonical = documents.find((d) => d.role === "canonical");
  const boundary = documents.find((d) => d.role === "boundary");
  changes.push({ route: row.route, canonicalWas: row.canonicalPdfSha256, canonicalNow: canonical.sha256, boundaryWas: row.boundaryPdfSha256, boundaryNow: boundary.sha256, pagesWas: row.expectedPages, pagesNow: canonical.pageCount, routeKeyWas: row.routeKey, routeKeyNow: mine[0].routeKey });
  row.routeKey = mine[0].routeKey;
  row.routeLabel = mine[0].routeLabel;
  row.canonicalPdfPath = canonical.path; row.canonicalPdfSha256 = canonical.sha256;
  row.boundaryPdfPath = boundary.path; row.boundaryPdfSha256 = boundary.sha256;
  row.expectedPages = canonical.pageCount;
  row.documents = documents;
  row.documentsDigest = crypto.createHash("sha256").update(documents.map((d) => `${d.path}:${d.sha256}`).join("\n")).digest("hex");
  row.coverage = { documents: documents.map((d) => d.name), rastered: documents.map((d) => d.name), notRastered: [], complete: true, basis: row.coverage.basis };
  row.currentRasterState = "RASTER_PENDING";
  row.repinnedBy = "FIX03 / fable/kspath, after the Kansas route line was changed from the machine key to the human label";
}
q.counts.documents = q.rows.reduce((n, r) => n + r.documents.length, 0);
q.counts.pages = q.rows.reduce((n, r) => n + r.documents.reduce((m, d) => m + d.pageCount, 0), 0);
fs.writeFileSync(QUEUE, `${JSON.stringify(q, null, 2)}\n`);
console.log(JSON.stringify(changes, null, 2));
console.log("counts", JSON.stringify(q.counts));
