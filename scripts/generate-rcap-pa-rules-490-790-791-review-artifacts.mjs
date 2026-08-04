#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const rootDir = process.cwd();
const familyDir = path.join(
  rootDir,
  "data/record-clearing/production-factory/official-pdf-families/PA"
);
const outputDir = path.join(
  rootDir,
  "artifacts/rcap-factory/pennsylvania-rules-490-790-791"
);
const outputPdf = path.join(
  outputDir,
  "pa-rule-790-petition-synthetic-component-review.pdf"
);
const outputManifest = path.join(
  outputDir,
  "pa-rule-790-petition-synthetic-component-review.json"
);

const implementation = await import(
  pathToFileURL(
    path.join(
      rootDir,
      "src/lib/rcap/packets/jurisdictions/pennsylvania/official-pdf/index.ts"
    )
  ).href
);

const fixtures = readJson(path.join(familyDir, "fixtures.json"));
const fixture = fixtures.positiveFixtures.find(
  (candidate) => candidate.fixtureId === "pa-rule790-technical-review-positive"
);
assert.ok(fixture, "Rule 790 technical-review fixture must exist");

const sourceRequirement = implementation.PENNSYLVANIA_OFFICIAL_PDF_SOURCE_REQUIREMENTS.find(
  (candidate) => candidate.documentId === "PA-RCRIM-P-790-PETITION"
);
assert.ok(sourceRequirement, "Rule 790 exact source requirement must exist");

const before = await implementation.verifyPennsylvaniaOfficialPdfSource(
  rootDir,
  "PA-RCRIM-P-790-PETITION"
);
const first = await implementation.renderRule790PetitionReviewComponent({
  rootDir,
  facts: fixture.facts
});
const second = await implementation.renderRule790PetitionReviewComponent({
  rootDir,
  facts: fixture.facts
});
assert.equal(first.sha256, second.sha256, "Rule 790 review render hash must be deterministic");
assert.deepEqual(
  Buffer.from(first.bytes),
  Buffer.from(second.bytes),
  "Rule 790 review render bytes must be deterministic"
);
const after = await implementation.verifyPennsylvaniaOfficialPdfSource(
  rootDir,
  "PA-RCRIM-P-790-PETITION"
);
assert.equal(before.sha256, after.sha256, "Review rendering must not modify the retained source");
assert.equal(
  before.byteLength,
  after.byteLength,
  "Review rendering must not change retained source bytes"
);

fs.mkdirSync(outputDir, { recursive: true });
assertSafeArtifactPath(outputPdf);
assertSafeArtifactPath(outputManifest);
fs.writeFileSync(outputPdf, first.bytes);
fs.writeFileSync(
  outputManifest,
  `${JSON.stringify(
    {
      schemaVersion: "rcap-official-pdf-component-review-artifact/v1",
      artifactId: "pa-rule-790-petition-synthetic-component-review",
      jurisdiction: "PA",
      documentId: "PA-RCRIM-P-790-PETITION",
      fixtureId: fixture.fixtureId,
      source: {
        path: first.sourcePath,
        sha256: first.sourceSha256,
        bytes: sourceRequirement.expectedBytes,
        mediaType: sourceRequirement.expectedMediaType,
        treatment: "read_only_use_in_place_no_copy"
      },
      output: {
        path: path.relative(rootDir, outputPdf).replaceAll(path.sep, "/"),
        sha256: first.sha256,
        bytes: first.bytes.byteLength,
        pageCount: first.pageCount,
        deterministic: true,
        deterministicTimestamp: "2000-01-01T00:00:00.000Z"
      },
      fieldReview: {
        filledFieldNames: first.filledFieldNames,
        protectedBlankFieldNames: first.protectedBlankFieldNames,
        visualReview: "pending",
        sourceFreshnessReview: "pending",
        counselReview: "not_submitted"
      },
      reviewOnly: true,
      participantPacket: false,
      productionReady: false,
      generationAllowed: false
    },
    null,
    2
  )}\n`
);

process.stdout.write(
  `Generated deterministic PA Rule 790 component review artifact: ${path.relative(
    rootDir,
    outputPdf
  )}\nSHA-256: ${first.sha256}\n`
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertSafeArtifactPath(filePath) {
  const relative = path.relative(rootDir, filePath);
  assert.ok(
    !relative.startsWith("..") &&
      !path.isAbsolute(relative) &&
      relative.replaceAll(path.sep, "/").startsWith("artifacts/rcap-factory/"),
    "Review output must stay under artifacts/rcap-factory"
  );
}
