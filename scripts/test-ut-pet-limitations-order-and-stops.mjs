#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const familyId = "ut_pet_limitations-set";
const outputDir = path.join(
  rootDir,
  "data/rcap-all50/overlays/census-v1/ut/ut-pet-limitations-set--official-pdf-fill"
);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

const packetSets = readJson("data/record-clearing/legal-design-packet-set-manifests.json");
const registry = readJson("data/record-clearing/legal-design-track-registry.json");
const receipt = JSON.parse(fs.readFileSync(path.join(outputDir, "source-receipt.json"), "utf8"));
const rendered = JSON.parse(fs.readFileSync(path.join(outputDir, "reports/rendered-artifacts.json"), "utf8"));
const findings = JSON.parse(fs.readFileSync(path.join(outputDir, "build-findings.json"), "utf8"));
const instructions = fs.readFileSync(path.join(outputDir, "participant-instructions.md"), "utf8");

const packetSet = packetSets.packetSets.find((row) => row.packetSetId === familyId);
assert.ok(packetSet, `${familyId}: missing packet-set manifest`);
const pagesByForm = new Map(receipt.documents.map((document) => [document.formNumber, document.pageCount]));
const expectedPageForms = packetSet.components
  .filter((component) => component.officialFormId)
  .sort((left, right) => left.order - right.order)
  .flatMap((component) => {
    const pageCount = pagesByForm.get(component.officialFormId);
    assert.ok(pageCount, `${component.officialFormId}: missing source-receipt page count`);
    return Array(pageCount).fill(component.officialFormId);
  });

assert.equal(rendered.artifacts.length, 2, `${familyId}: expected canonical and boundary artifacts`);
for (const artifact of rendered.artifacts) {
  assert.deepEqual(
    artifact.pageManifest.map((page) => page.formNumber),
    expectedPageForms,
    `${familyId} ${artifact.fixture}: delivered pages are not in committed manifest order`
  );
}

const track = registry.tracks.find((row) => row.trackId === "ut_pet_limitations");
assert.ok(track, "ut_pet_limitations: missing track registry entry");
assert.equal(track.selfHelpStopConditions.length, 8, "ut_pet_limitations: expected eight recorded stop conditions");

const heading = "## When to stop and get a lawyer";
assert.equal(instructions.split(heading).length - 1, 1, `${familyId}: expected exactly one stop-and-get-help section`);
const sectionStart = instructions.indexOf(heading);
const nextHeading = instructions.indexOf("\n## ", sectionStart + heading.length);
const section = instructions.slice(sectionStart, nextHeading === -1 ? instructions.length : nextHeading);
const deliveredConditions = section.split("\n")
  .filter((line) => line.startsWith("- "))
  .map((line) => line.slice(2));
assert.deepEqual(
  deliveredConditions,
  track.selfHelpStopConditions,
  `${familyId}: stop-and-get-help bullets do not exactly match the registry`
);
assert.equal(
  instructions.includes("if the court schedules a hearing, attend it"),
  false,
  `${familyId}: instructions still direct self-representation at a recorded stop condition`
);
assert.equal(
  instructions.includes("This packet is built for an arrest the prosecutor decided not to charge"),
  false,
  `${familyId}: instructions use the no-charges route closing`
);
assert.ok(
  instructions.includes("LegalEase does not calculate whether the limitations period has run; the BCI certificate is the answer."),
  `${familyId}: instructions omit the limitations-specific closing`
);

const findingsText = JSON.stringify(findings);
assert.ok(findingsText.includes("sworn declaration on packet page 2"),
  `${familyId}: build findings do not identify the declaration's current packet page`);
assert.equal(findingsText.includes("sworn declaration on packet page 18"), false,
  `${familyId}: build findings retain the pre-reorder declaration page`);

console.log(`${familyId}: manifest order and eight registry stop conditions OK`);
