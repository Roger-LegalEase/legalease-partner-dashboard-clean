#!/usr/bin/env node
/**
 * The §7 supplemental-guide control.
 *
 * Two things it exists to prevent.
 *
 * The first is authored guidance. Every string in a route's guide is carried
 * from that route's adopted artifact; none may be written here. A guide that
 * could be authored would be participant-facing legal instruction no legal
 * review ever saw, which is the failure the composer's first rule exists to
 * prevent, relocated one directory over.
 *
 * The second is a silent drop. A migration that loses a line looks exactly like
 * a migration that never had it, so every line of the adopted guidance page has
 * to arrive somewhere — in one of the four sections, or in `carriedElsewhere`
 * with its destination and the reason.
 *
 * It also holds the line the whole §7 lane exists for: the shared guide replaces
 * the family's own filing-instructions page, it does not accompany it. While
 * both exist, the packet component is marked superseded-pending and the two are
 * required to agree; once the guide ships, the component retires.
 */

import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { SUPPLEMENTAL_GUIDE_SECTIONS, allGuideEntries } =
  await import("../src/lib/rcap/supplemental/guide-contract.ts");
const { packetSpecificationFor } = await import("../src/lib/rcap/grade-a/packet-specification.ts");

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

const guideDir = path.join(rootDir, "data/record-clearing/supplemental-guides");
check(fs.existsSync(guideDir), "the supplemental-guide route data exists");
const guides = fs.existsSync(guideDir)
  ? fs.readdirSync(guideDir).filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(guideDir, f), "utf8")))
  : [];
check(guides.length > 0, `there are route guides to verify (${guides.length})`);

check(
  SUPPLEMENTAL_GUIDE_SECTIONS.map((section) => section.heading).join(" · ")
    === "Overview · Next Steps · Filing Checklist · Fees & Costs",
  "the guide's sections are the four the plan names, in order"
);

for (const guide of guides) {
  const where = guide.routeKey;

  check(guide.schemaVersion === "rcap-supplemental-guide/v1", `${where}: the guide states its schema`);
  check(
    typeof guide.adoptedDigest === "string" && /^[0-9a-f]{64}$/.test(guide.adoptedDigest),
    `${where}: the guide names the adopted artifact digest its substance came from`
  );

  const entries = allGuideEntries(guide);
  check(entries.length > 0, `${where}: the guide carries substance (${entries.length} entries)`);
  check(
    SUPPLEMENTAL_GUIDE_SECTIONS.every((section) => Array.isArray(guide[section.id])),
    `${where}: every one of the four sections is present, even where empty`
  );

  // Nothing authored: every entry says where in the adopted artifact it came
  // from, and none is a bare assertion with no provenance.
  const unsourced = entries.filter((entry) =>
    typeof entry.adoptedSource !== "string" || !/adopted/i.test(entry.adoptedSource));
  check(
    unsourced.length === 0,
    `${where}: every guide entry names its adopted source${unsourced.length ? ` (${unsourced.length} do not)` : ""}`
  );

  // Nothing dropped: the component the guide supersedes must still be readable,
  // and every line of it must arrive somewhere.
  if (guide.supersedesPacketComponent) {
    const specification = packetSpecificationFor(guide.routeKey);
    const component = specification.documents.find((document) => document.documentId === guide.supersedesPacketComponent);
    check(Boolean(component), `${where}: the component this guide supersedes is still in the specification`);
    if (component) {
      const adoptedLines = component.sections
        .flatMap((section) => String(section.body ?? "").split("\n"))
        .map((line) => line.trim())
        .filter(Boolean);
      const carried = new Set([
        ...entries.map((entry) => entry.text.trim()),
        ...(guide.carriedElsewhere ?? []).map((row) => row.text.trim())
      ]);
      const dropped = adoptedLines.filter((line) => !carried.has(line));
      check(
        dropped.length === 0,
        `${where}: every line of the adopted guidance page arrives somewhere${
          dropped.length ? ` (${dropped.length} dropped, first: "${dropped[0].slice(0, 60)}…")` : ""}`
      );
      check(
        adoptedLines.length > 0 && carried.size >= adoptedLines.length,
        `${where}: ${adoptedLines.length} adopted lines, ${carried.size} accounted for`
      );

      // The supersession is declared on the component too, so the packet side
      // cannot forget that this page is on its way out.
      check(
        component.supersededBy === "supplemental_guide",
        `${where}: the packet component records that the shared guide supersedes it`
      );
      check(
        typeof component.supersessionNote === "string" && component.supersessionNote.length > 40,
        `${where}: and says what happens to it when the guide ships`
      );
    }
  }

  // Every diverted line says where it went and why. "Dropped" is not a
  // destination, and neither is silence.
  const vagueDiversions = (guide.carriedElsewhere ?? []).filter((row) =>
    !row.destination || !row.why || row.why.length < 25);
  check(
    vagueDiversions.length === 0,
    `${where}: every line carried out of the guide names its destination and the reason${
      vagueDiversions.length ? ` (${vagueDiversions.length} do not)` : ""}`
  );
}

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${failures.length} failing check(s)`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exitCode = 1;
}
