#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const familyId = "wa_vac_homicide_victim_prostitution-set";
const out = "data/rcap-all50/overlays/census-v1/wa/wa-vac-homicide-victim-prostitution-set--official-pdf-fill";
const heldStops = Object.freeze([
  "The applicant is not a family member of the person who died.",
  "The conviction may not be a RCW 9A.88.030 prostitution conviction.",
  "The person whose record is at issue is living, in which case the survivor routes apply.",
  "The applicant is distressed and needs a person rather than a packet. Ask only what is needed to route.",
]);

function abs(relativePath) {
  return path.join(rootDir, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(abs(relativePath), "utf8"));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function repairSelfHelpSection() {
  const file = `${out}/participant-instructions.md`;
  let instructions = fs.readFileSync(abs(file), "utf8");
  const start = "## Where self-help ends\n";
  const end = "This packet is prepared evidence, not legal advice.";
  const startIndex = instructions.indexOf(start);
  const endIndex = instructions.indexOf(end, startIndex);
  assert.ok(startIndex >= 0 && endIndex > startIndex, "self-help section boundaries are absent");
  const section = `## Where self-help ends

On this route, self-help ends **before filing**: the open pleading question recorded above means a lawyer or the clerk of the sentencing court must confirm the correct pleading before this packet is used at all.

The committed track record at \`data/record-clearing/legal-design-track-registry.json\`, track \`wa_vac_homicide_victim_prostitution\`, records these four exact stop conditions. If any applies, stop using the packet and follow the direction in the condition:

${heldStops.map((condition) => `- ${condition}`).join("\n")}

`;
  instructions = `${instructions.slice(0, startIndex)}${section}${instructions.slice(endIndex)}`;
  fs.writeFileSync(abs(file), instructions.endsWith("\n") ? instructions : `${instructions}\n`);
}

function assertFix13Repair() {
  const instructions = fs.readFileSync(abs(`${out}/participant-instructions.md`), "utf8");
  const section = instructions.slice(
    instructions.indexOf("## Where self-help ends"),
    instructions.indexOf("This packet is prepared evidence, not legal advice."),
  );
  for (const condition of heldStops) {
    assert.ok(section.includes(condition), `held self-help stop is absent: ${condition}`);
  }
  assert.equal(section.split("\n").filter((line) => line.startsWith("- ")).length, 4,
    "the self-help section must carry exactly four held entries");

  const rendered = readJson(`${out}/reports/rendered-artifacts.json`);
  for (const artifact of rendered.artifacts) {
    const pdfBytes = fs.readFileSync(abs(artifact.file));
    assert.equal(sha256(pdfBytes), artifact.sha256, `${artifact.file}: PDF hash differs from its artifact record`);
    assert.equal(pdfBytes.length, artifact.byteLength, `${artifact.file}: PDF length differs from its artifact record`);
  }
  for (const raster of rendered.rasters) {
    for (const page of raster.pages) {
      const rasterBytes = fs.readFileSync(abs(page.file));
      assert.equal(sha256(rasterBytes), page.sha256, `${page.file}: raster hash differs from its receipt`);
      assert.equal(rasterBytes.length, page.byteLength, `${page.file}: raster length differs from its receipt`);
    }
  }
}

const args = process.argv.slice(2);
process.chdir(rootDir);
if (args.includes("--check")) {
  const { buildWaFamily } = await import("./build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs");
  console.log(JSON.stringify(await buildWaFamily(familyId, ["--check"])));
  assertFix13Repair();
  console.log(`${familyId}: FIX13 focused assertions complete; independent verification pending`);
} else if (args.includes("--assert-fix13")) {
  assertFix13Repair();
  console.log(`${familyId}: FIX13 focused assertions complete; independent verification pending`);
} else {
  if (!args.includes("--repair-only")) {
    const { buildWaFamily } = await import("./build-census-v1-wa_blake_vacatur_and_lfo_refund-set.mjs");
    console.log(JSON.stringify(await buildWaFamily(familyId, args.filter((arg) => arg !== "--repair-only"))));
  }
  repairSelfHelpSection();
  assertFix13Repair();
  console.log(`${familyId}: FIX13 self-help instruction repair built; PDF and raster receipts preserved; independent verification pending`);
}
