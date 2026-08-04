#!/usr/bin/env node

// Generate ignored visual-review artifacts for the two implemented D.C.
// custom pleadings. The tracked review manifest is immutable input to this
// helper: rendered component and assembled-packet hashes must match it.
//
// Usage:
//   node scripts/rcap-generate-dc-custom-pleading-review.mjs

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { spawnSync } from "node:child_process";

process.env.RCAP_TECHNICAL_FIXTURES_ENABLED = "true";
process.env.RCAP_PACKET_STORE_DRIVER = "local";
if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to generate D.C. review artifacts in production.");
}
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { RELIEF_TRACKS } = await import("@/lib/rcap/packets/registry");
const { PLEADING_TEMPLATES } = await import(
  "@/lib/rcap/packets/engines/pleading-templates"
);
const { resolvePacket } = await import("@/lib/rcap/packets/resolve");
const { renderPacketComponent } = await import(
  "@/lib/rcap/packets/engines/index"
);
const { assemblePacketPdf } = await import("@/lib/rcap/packets/assemble");
const {
  DC_PLEADING_TEMPLATES,
  DISTRICT_OF_COLUMBIA_CUSTOM_PLEADING_TRACKS,
  deriveDistrictOfColumbiaFacts
} = await import(
  "@/lib/rcap/packets/jurisdictions/district-of-columbia/custom-pleading"
);

const root = process.cwd();
const trancheDirectory = path.join(
  root,
  "data/record-clearing/implementation-tranches"
);
const outputDirectory = path.join(
  root,
  "tmp/packet-output-review/tranche-5"
);
const fixtures = readJson("tranche-5-fixtures.json");
const manifest = readJson("tranche-5-review-manifest.json");
const expectedByFixture = new Map(
  manifest.samplePackets.map((entry) => [entry.fixtureId, entry])
);
const skipImages = process.argv.includes("--skip-images");
const pdftoppmProbe = spawnSync("pdftoppm", ["-v"], {
  encoding: "utf8"
});
const renderImages = !skipImages && !pdftoppmProbe.error;

for (const track of DISTRICT_OF_COLUMBIA_CUSTOM_PLEADING_TRACKS) {
  if (!RELIEF_TRACKS.some((entry) => entry.trackId === track.trackId)) {
    RELIEF_TRACKS.push(track);
  }
}
Object.assign(PLEADING_TEMPLATES, DC_PLEADING_TEMPLATES);

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });

let packetCount = 0;
let pageCount = 0;

for (const fixture of fixtures.positiveFixtures) {
  const expected = expectedByFixture.get(fixture.fixtureId);
  if (!expected) {
    throw new Error(`${fixture.fixtureId} is absent from the review manifest.`);
  }
  const facts = deriveDistrictOfColumbiaFacts(
    fixture.trackId,
    fixture.facts
  );
  const resolved = resolvePacket({
    jurisdiction: "DC",
    trackId: fixture.trackId,
    facts,
    allowTechnicalFixtures: true
  });
  const fixtureDirectory = path.join(outputDirectory, fixture.fixtureId);
  fs.mkdirSync(fixtureDirectory, { recursive: true });

  const components = [];
  for (const component of resolved.components) {
    const output = await renderPacketComponent({
      component,
      jurisdiction: "DC",
      geography: null,
      facts,
      rootDir: root
    });
    const expectedComponent = expected.components.find(
      (entry) => entry.componentId === component.componentId
    );
    const actual = crypto
      .createHash("sha256")
      .update(output.bytes)
      .digest("hex");
    if (actual !== expectedComponent?.sha256) {
      throw new Error(
        `${fixture.fixtureId}/${component.componentId} hash ${actual} does not match the review manifest.`
      );
    }
    fs.writeFileSync(
      path.join(
        fixtureDirectory,
        `${String(component.order).padStart(2, "0")}-${component.componentId}.pdf`
      ),
      output.bytes
    );
    components.push({
      componentId: component.componentId,
      role: component.role,
      order: component.order,
      bytes: output.bytes
    });
  }

  const assembled = await assemblePacketPdf({
    jurisdiction: "DC",
    jurisdictionName: "District of Columbia",
    packetName: resolved.track.assembledPacketName,
    caseReference: fixture.caseReference,
    title: resolved.track.assembledPacketTitle,
    components
  });
  if (
    assembled.sha256 !== expected.assembledSha256 ||
    assembled.pageCount !== expected.assembledPageCount
  ) {
    throw new Error(
      `${fixture.fixtureId} assembled packet does not match the tracked review manifest.`
    );
  }

  const assembledPath = path.join(fixtureDirectory, assembled.fileName);
  fs.writeFileSync(assembledPath, assembled.bytes);
  if (renderImages) {
    const pagesDirectory = path.join(fixtureDirectory, "pages");
    fs.mkdirSync(pagesDirectory, { recursive: true });
    const raster = spawnSync(
      "pdftoppm",
      [
        "-png",
        "-r",
        "120",
        assembledPath,
        path.join(pagesDirectory, "page")
      ],
      { encoding: "utf8" }
    );
    if (raster.status !== 0) {
      throw new Error(
        `${fixture.fixtureId} rasterization failed: ${(raster.stderr ?? raster.error?.message ?? "unknown error").trim()}`
      );
    }
    const renderedPages = fs
      .readdirSync(pagesDirectory)
      .filter((name) => name.endsWith(".png"))
      .sort();
    if (renderedPages.length !== assembled.pageCount) {
      throw new Error(
        `${fixture.fixtureId} rendered ${renderedPages.length} page images for ${assembled.pageCount} PDF pages.`
      );
    }
  }

  packetCount += 1;
  pageCount += assembled.pageCount;
  console.log(
    `${fixture.fixtureId}: ${assembled.pageCount} pages, ${assembled.sha256}`
  );
}

if (
  packetCount !== manifest.assembledPacketCount ||
  pageCount !== manifest.assembledPageCount
) {
  throw new Error(
    `Generated ${packetCount} packets / ${pageCount} pages; manifest records ${manifest.assembledPacketCount} / ${manifest.assembledPageCount}.`
  );
}

console.log(
  `D.C. review artifacts generated under ${path.relative(root, outputDirectory)}: ${packetCount} packets, ${pageCount} pages, page images ${renderImages ? "rendered" : "skipped (pdftoppm unavailable or --skip-images)"}.`
);

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(trancheDirectory, fileName), "utf8")
  );
}
