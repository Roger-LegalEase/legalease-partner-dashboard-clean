#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { classifyArticle9781DocumentStatus } from "../../../../../scripts/build-census-v1-la-987-set-aside-and-dismiss-set.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const family = "data/rcap-all50/overlays/census-v1/la/la-987-set-aside-and-dismiss-set--official-pdf-fill";
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sha256 = (relative) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const pdfText = (relative) => execFileSync("pdftotext", ["-layout", path.join(root, relative), "-"], { encoding: "utf8" }).replace(/\s+/g, " ");

const rendered = readJson(`${family}/reports/rendered-artifacts.json`);
const source = readJson(`${family}/source-receipt.json`);
const fields = readJson(`${family}/production-field-map.json`);
const documents = readJson(`${family}/participant-document-status.json`);
const manifest = readJson("data/rcap-grade-a/packet-factory-24h/seven-cleared-20260911/la/raster-manifest.json");

assert.equal(source.allSourcesExact, true);
assert.equal(source.sources.length, 3);
for (const item of source.sources) {
  assert.equal(sha256(item.heldCorpusPath), item.sha256, `${item.sourceId}: held source digest`);
  assert.equal(fs.statSync(path.join(root, item.heldCorpusPath)).size, item.byteLength, `${item.sourceId}: held source bytes`);
}

const formMap = fields.maps.find((row) => row.formNumber === "LA-CCRP-ART-987");
assert.ok(formMap.canonicalWrites.some((row) => row.factId === "case.charge"));
assert.ok(formMap.boundaryRefusals.some((row) => row.factId === "case.arresting_agency" && row.requiredBeforeFiling === true));
assert.equal(fields.requiredBeforeFilingByFixture.canonical.length, 0);
assert.deepEqual(fields.requiredBeforeFilingByFixture.boundary.map((row) => row.field), ["LA-CCRP-ART-987.arresting_agency"]);

for (const artifact of rendered.artifacts) {
  assert.equal(sha256(artifact.file), artifact.sha256, `${artifact.fixture}: output digest`);
  assert.equal(artifact.pageCount, 6);
  assert.deepEqual(artifact.pageManifest.filter((row) => row.documentId === "LA-CCRP-ART-987").map((row) => row.packetPage), [1, 2, 3]);
  const text = pdfText(artifact.file);
  for (const phrase of [
    "NOW INTO HONORABLE COURT, comes",
    "DOCKET NUMBER:",
    "CHARGE:",
    "DATE OF ARREST:",
    "ARRESTING AGENCY:",
    "CITY/PARISH OF ARREST:",
    "IT IS HEREBY ORDERED, that the District Attorney show cause",
    "IT IS ORDERED, ADJUDGED AND DECREED that this conviction is set aside and the prosecution dismissed for purposes of expungement.",
    "PLEASE SERVE:"
  ]) assert.ok(text.includes(phrase), `${artifact.fixture}: ${phrase}`);
  const filedPages = text.split("ARTICLE 987 PARTICIPANT AND FILING INSTRUCTIONS")[0];
  for (const forbidden of ["LA-CCRP-ART-987", "obligation:track-only", "PARTICIPANT ASSERTIONS", "Court findings:", "granting, denying, and decretal paragraphs"])
    assert.equal(filedPages.includes(forbidden), false, `${artifact.fixture}: forbidden filed-page text ${forbidden}`);
  for (const internal of [
    "LA-CCRP-ART-987",
    "obligation:track-only",
    "la-987-set-aside-and-dismiss-primary-filing-1",
    "la-987-set-aside-and-dismiss-instructions-2",
    "Assigned component identity",
    "provided_metadata_recorded"
  ]) assert.equal(text.includes(internal), false, `${artifact.fixture}: internal delivery text ${internal}`);
}

assert.deepEqual(documents.fixtures.boundary.map((row) => row.collectionStatus), ["stale", "not_provided", "provided", "not_provided"]);
assert.equal(documents.fixtures.boundary.every((row) => row.actualDocumentFabricatedOrBundledByBuilder === false), true);
assert.equal(documents.fixtures.boundary.every((row) => row.requiredForCurrentArticle987Filing === false), true);
assert.equal(documents.fixtures.boundary.every((row) => row.blocksArticle978PacketReady === true), true);
assert.match(documents.truthRule, /never creates a supporting document/);
assert.equal(documents.freshnessBasis.includes("planned Article 978 filing date"), true);

const backgroundRequirement = documents.productionRequirements.find((row) => row.id === "LA-978.1-1");
const background = (documentDate) => ({
  provided: true,
  kind: "Louisiana State Police criminal background check",
  documentDate
});
assert.equal(classifyArticle9781DocumentStatus(backgroundRequirement, background("2026-07-13"), "2026-09-11").collectionStatus, "provided", "60-day check remains current");
assert.equal(classifyArticle9781DocumentStatus(backgroundRequirement, background("2026-07-12"), "2026-09-11").collectionStatus, "stale", "61-day check is stale");
assert.equal(classifyArticle9781DocumentStatus(backgroundRequirement, background("2026-02-30"), "2026-09-11").collectionStatus, "invalid", "impossible date is rejected");
assert.equal(classifyArticle9781DocumentStatus(backgroundRequirement, background("2026-09-12"), "2026-09-11").collectionStatus, "invalid", "future date is rejected");
assert.throws(() => classifyArticle9781DocumentStatus(backgroundRequirement, background("2026-08-20"), "not-a-date"), /planned filing date/);

const rasterRow = manifest.rows[0];
assert.equal(rasterRow.canonicalPdfSha256, rendered.artifacts.find((row) => row.fixture === "canonical").sha256);
assert.equal(rasterRow.boundaryPdfSha256, rendered.artifacts.find((row) => row.fixture === "boundary").sha256);
assert.equal(rasterRow.documents.every((row) => sha256(row.path) === row.sha256 && row.pageCount === 6), true);

console.log(JSON.stringify({
  familyId: "la-987-set-aside-and-dismiss-set",
  result: "PASS",
  heldAuthoritiesRehashed: source.sources.length,
  fixturesChecked: rendered.artifacts.length,
  prescribedFormPagesPerFixture: 3,
  article9781RequirementsChecked: documents.productionRequirements.length,
  independentReviewClaimed: false,
  rasterClaimed: false
}, null, 2));
