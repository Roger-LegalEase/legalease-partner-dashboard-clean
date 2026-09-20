#!/usr/bin/env node
/**
 * The §7 supplemental-guide control.
 *
 * Two things it exists to prevent.
 *
 * The first is an UNSOURCED INSTRUCTION. Not an authored sentence — the two are
 * different, and confusing them would break this system nationwide. Most routes
 * have no legacy approved guidance page to copy, so a rule of "it must have
 * appeared in an old PDF" would leave them with no guide at all. A newly
 * written "File the petition with the clerk of the court that handled your
 * case" is fine where the route's source says so; asserting it where nothing
 * does is not. So every entry names what supports it, and an entry that carries
 * a legal or procedural instruction must name something more than product copy.
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

const { SUPPLEMENTAL_GUIDE_SECTIONS, GUIDE_PROVENANCE_KINDS, allGuideEntries } =
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

/*
 * The schema stays a schema.
 *
 * The failure mode is gradual and comfortable: one route's wording gets a
 * special case, then another, and the shared contract becomes a content
 * warehouse that every future route has to read around. Route substance lives
 * in the route's own data file; this module holds the shape.
 */
const contractSource = fs.readFileSync(
  path.join(rootDir, "src/lib/rcap/supplemental/guide-contract.ts"), "utf8");
const jurisdictionNames = contractSource
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("*") && !line.trimStart().startsWith("//"))
  .join("\n")
  .match(/\b(Wyoming|Nevada|Mississippi|Illinois|Georgia|Florida|Kansas|Iowa|Maine|Maryland)\b/g);
check(
  jurisdictionNames === null,
  `the guide contract is route-agnostic -- no jurisdiction appears in its code${
    jurisdictionNames ? ` (found ${[...new Set(jurisdictionNames)].join(", ")})` : ""}`
);

// Stop conditions are derived from the specification, never copied into a guide.
for (const guide of guides) {
  const specification = guide.supersedesPacketComponent ? packetSpecificationFor(guide.routeKey) : null;
  const stops = (specification?.hearingAndObjectionStops ?? []).map((stop) =>
    (typeof stop === "string" ? stop : stop?.text ?? "").trim()).filter(Boolean);
  if (stops.length === 0) continue;
  const duplicated = allGuideEntries(guide).filter((entry) => stops.includes(entry.text.trim()));
  check(
    duplicated.length === 0,
    `${guide.routeKey}: no guide section duplicates a stop condition -- the renderer derives them from hearingAndObjectionStops${
      duplicated.length ? ` (${duplicated.length} duplicated)` : ""}`
  );
}

for (const guide of guides) {
  const where = guide.routeKey;

  check(guide.schemaVersion === "rcap-supplemental-guide/v1", `${where}: the guide states its schema`);

  const entries = allGuideEntries(guide);
  check(entries.length > 0, `${where}: the guide carries substance (${entries.length} entries)`);

  // Only a route that actually carried substance from an adopted artifact needs
  // to name its digest. Most routes have no legacy guidance page at all.
  const carriedFromAdopted = entries.some((entry) => entry.provenance?.kind === "adopted_artifact");
  check(
    !carriedFromAdopted || (typeof guide.adoptedDigest === "string" && /^[0-9a-f]{64}$/.test(guide.adoptedDigest)),
    `${where}: a guide carrying adopted text names the artifact digest it came from`
  );
  check(
    SUPPLEMENTAL_GUIDE_SECTIONS.every((section) => Array.isArray(guide[section.id])),
    `${where}: every one of the four sections is present, even where empty`
  );

  // Every entry declares a provenance kind from the contract's fixed set.
  const badKind = entries.filter((entry) => !GUIDE_PROVENANCE_KINDS.includes(entry.provenance?.kind));
  check(
    badKind.length === 0,
    `${where}: every guide entry declares a provenance kind the contract recognises${
      badKind.length ? ` (${badKind.length} do not)` : ""}`
  );

  // Anything but product copy has to say what supports it.
  const uncited = entries.filter((entry) =>
    entry.provenance?.kind !== "product_copy"
    && (typeof entry.provenance?.cite !== "string" || entry.provenance.cite.trim().length < 8));
  check(
    uncited.length === 0,
    `${where}: every entry beyond product copy cites its source${uncited.length ? ` (${uncited.length} do not)` : ""}`
  );

  // The invariant: no unsourced legal or procedural instruction. An entry that
  // tells the participant to do something, or states what the law requires,
  // cannot be carried by product copy — which by definition asserts nothing
  // about the law. This is a text test rather than a trusted label, because the
  // label is the thing most likely to be wrong.
  const INSTRUCTION = /\b(file|serve|mail|deliver|submit|pay|sign|notari[sz]e|ask the clerk|must|shall|required|requires|deadline|within \d+|\d+ days?|do not|cannot|may not|entitled|statute|Sec\.|section \d|§)\b/i;
  const unsupportedInstruction = entries.filter((entry) =>
    entry.provenance?.kind === "product_copy" && INSTRUCTION.test(entry.text));
  check(
    unsupportedInstruction.length === 0,
    `${where}: no legal or procedural instruction is carried as product copy${
      unsupportedInstruction.length ? `: "${unsupportedInstruction[0].text.slice(0, 70)}…"` : ""}`
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
