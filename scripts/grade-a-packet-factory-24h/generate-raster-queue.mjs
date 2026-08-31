#!/usr/bin/env node
/**
 * The raster queue, and the four lanes that consume it.
 *
 * Every packet-build lane in the fleet returned STOPPED on the same thing:
 * PF09 and PF15 on `pdftoppm ENOENT`, PF11 and PF12 on "Playwright cannot find
 * Chromium", and ENV-RAS01 then established that the Codex container cannot
 * even fetch one -- the Playwright CDN answers HTTP 403 from inside it. So the
 * visual gate is unreachable from the place the packets are built, and it has
 * been stopping lanes that had every other obligation in hand.
 *
 * The wrong fix is to weaken PASS_COMPLETE, and it is not taken here. A family
 * with no successful raster verdict is not PASS_COMPLETE, full stop. The visual
 * gate still has to prove every page rendered, no page blank, expected
 * dimensions, no clipped write, no overlapping participant text, no placeholder
 * text, no protected-field ink, and artifact hashes matching the submitted PDFs.
 *
 * The right fix is to move the render somewhere a browser exists. A builder
 * finishes every nonvisual obligation, records the exact SHA-256 of the PDFs it
 * produced, and returns BUILT_RASTER_PENDING -- a factory workflow state, not a
 * launch verdict, and one that zeroes and waives nothing. A GitHub-hosted runner
 * with a real Chrome renders those exact bytes and publishes receipts. RAS01-04
 * read the receipts, check the hashes bind to the queued PDFs, and write a
 * verdict. RASTER_PASS sends the family to independent verification;
 * RASTER_FAIL sends it to FIX.
 *
 * A family enters RASTER_PENDING only when its sources bind, its components
 * exist, both PDFs exist, and the nonvisual completeness checks pass. Queuing a
 * family whose packet is not finished would send the runner to render an
 * absence, and an absence renders as a defect.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { makeEmitter } from "../lib/generator-emit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const DIR = "data/rcap-grade-a/packet-factory-24h";
const PROMPTS = "docs/rcap/grade-a/packet-factory-24h/raster";
const OVERLAYS = "data/rcap-all50/overlays/census-v1";
const OUT = `${DIR}/RASTER_QUEUE.json`;
const WORKFLOW = ".github/workflows/rcap-packet-raster-acceptance-batch.yml";

const RASTER_STATES = ["RASTER_PENDING", "RASTER_RUNNING", "RASTER_PASS", "RASTER_FAIL", "RASTER_BLOCKED_ENVIRONMENT"];
const LANES = ["RAS01", "RAS02", "RAS03", "RAS04"];
const REQUESTED_SCALE = 2.5;

const git = (a) => { try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return null; } };
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const read = (p, d = null) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8")); } catch { return d; } };

const master = read(`${DIR}/MASTER_QUEUE.json`);
if (!master) { console.error("REFUSED: the master queue is not readable; a raster queue built from nothing would queue nothing and say so cheerfully."); process.exit(1); }
const active = read(`${DIR}/ACTIVE_ASSIGNMENTS.json`, { assignments: [] });
const builderOf = new Map();
for (const a of active.assignments ?? []) for (const f of a.items ?? []) if (typeof f === "string") builderOf.set(f, a.assignmentId);

// pdf-lib is what the builders use; the page count is read from the bytes, not
// from anyone's report about the bytes.
const pageCount = (p) => {
  const t = fs.readFileSync(p).toString("latin1");
  return (t.match(/\/Type\s*\/Page[^s]/g) ?? []).length || null;
};

const packetCommit = git(["rev-parse", "HEAD"]);
const rows = [];
const notEligible = [];

for (const f of master.families) {
  const dir = f.directory ? path.join(ROOT, f.directory) : null;
  const rel = f.directory ?? null;
  const fixtures = dir ? path.join(dir, "fixtures") : null;
  const eligibility = [];

  if (!rel || !fs.existsSync(dir)) eligibility.push("no overlay directory");
  else if (!fixtures || !fs.existsSync(fixtures)) eligibility.push("no fixtures directory");

  let canonical = null; let boundary = null;
  if (fixtures && fs.existsSync(fixtures)) {
    const pdfs = fs.readdirSync(fixtures).filter((x) => x.endsWith(".pdf")).sort();
    canonical = pdfs.find((x) => /canonical/.test(x)) ?? null;
    boundary = pdfs.find((x) => /boundary/.test(x)) ?? null;
    if (!canonical) eligibility.push("no canonical PDF");
    if (!boundary) eligibility.push("no boundary PDF");
  }

  // The four preconditions, each asked of a record rather than assumed.
  if (f.state === "SOURCE_BLOCKED") eligibility.push("sources do not bind");
  if (f.state === "LEGAL_BLOCKED") eligibility.push("an open legal input");
  const comp = f.counters ?? null;
  const nonVisual = comp
    ? Object.entries(comp).filter(([k, v]) => !/visual/i.test(k) && Number(v) > 0).map(([k]) => k)
    : null;
  if (comp && nonVisual.length) eligibility.push(`nonvisual completeness counters not zero: ${nonVisual.join(", ")}`);
  if (!comp) eligibility.push("no completeness audit");

  if (eligibility.length) { notEligible.push({ familyId: f.familyId, why: eligibility }); continue; }

  const cPath = path.join(fixtures, canonical);
  const bPath = path.join(fixtures, boundary);
  rows.push({
    familyId: f.familyId,
    packetCommitSha: packetCommit,
    canonicalPdfPath: path.relative(ROOT, cPath),
    canonicalPdfSha256: sha256(cPath),
    boundaryPdfPath: path.relative(ROOT, bPath),
    boundaryPdfSha256: sha256(bPath),
    expectedPages: pageCount(cPath),
    requestedScale: REQUESTED_SCALE,
    builderAssignment: builderOf.get(f.familyId) ?? null,
    currentRasterState: "RASTER_PENDING",
    nextOwner: null
  });
}

rows.sort((a, b) => a.familyId.localeCompare(b.familyId));
// Nonoverlapping batches, round-robin so a slow family does not concentrate in
// one lane. One family, one lane: a second claim would be two readers writing
// one verdict.
rows.forEach((r, i) => { r.nextOwner = LANES[i % LANES.length]; });

const byLane = Object.fromEntries(LANES.map((l) => [l, rows.filter((r) => r.nextOwner === l).map((r) => r.familyId)]));
const duplicated = rows.map((r) => r.familyId).filter((x, i, a) => a.indexOf(x) !== i);
if (duplicated.length) { console.error(`REFUSED: ${duplicated.length} famil(ies) queued twice: ${duplicated.slice(0, 5).join(", ")}`); process.exit(1); }

const doc = {
  schemaVersion: "rcap-raster-queue/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/generate-raster-queue.mjs",
  packetCommitSha: packetCommit,
  whyThisExists: "The Codex container cannot resolve or fetch a Chromium (ENV-RAS01: Playwright CDN answers HTTP 403), so the visual gate is unreachable from where packets are built. The render moves to a browser-equipped GitHub runner. Nothing about PASS_COMPLETE is weakened.",
  rasterStateVocabulary: RASTER_STATES,
  entryPreconditions: [
    "source binding passes",
    "packet components exist",
    "canonical and boundary PDFs exist",
    "nonvisual completeness checks pass"
  ],
  whatTheVisualGateStillProves: [
    "every page rendered",
    "no page is blank",
    "expected dimensions for the requested PDF-point scale",
    "no clipped write",
    "no overlapping participant text",
    "no placeholder text",
    "no protected-field ink",
    "artifact hashes match the submitted PDFs"
  ],
  builtRasterPending: {
    state: "BUILT_RASTER_PENDING",
    meaning: "packet construction is finished and the visual gate has not run",
    isNotALaunchVerdict: true,
    doesNotZeroOrWaive: "visualDefects stays whatever it is; BUILT_RASTER_PENDING records that nobody has looked, not that there is nothing to see",
    noPassCompleteWithout: "RASTER_PASS"
  },
  routing: {
    RASTER_PASS: "the family goes to independent verification",
    RASTER_FAIL: "the family goes to FIX",
    RASTER_BLOCKED_ENVIRONMENT: "the runner could not render at all; this is an environment defect and not a packet defect, and it never becomes RASTER_FAIL"
  },
  workflow: WORKFLOW,
  maxParallel: 20,
  lanes: LANES,
  counts: {
    queued: rows.length,
    byLane: Object.fromEntries(LANES.map((l) => [l, byLane[l].length])),
    byState: Object.fromEntries(RASTER_STATES.map((s) => [s, rows.filter((r) => r.currentRasterState === s).length])),
    notEligible: notEligible.length
  },
  byLane,
  rows,
  // Named rather than counted, because "not eligible" hides the difference
  // between a family with no packet and a family with a failing counter.
  notEligible: notEligible.slice(0, 400),
  packetPdfsModified: 0,
  bodiesCommitted: 0,
  commercialRoutesOpened: 0,
  productionTouched: false,
  grantsNothing: "A RASTER_PASS proves the pages render as measured. It is one gate of several, it promotes nothing, and it opens no commercial route."
};

const promptFor = (lane) => {
  const fams = byLane[lane];
  const p = [];
  p.push(`# ${lane}`, "");
  p.push(`**Environment:** LegalEase Packet Factory (Codex Cloud)  ·  **Lane:** raster-evidence`);
  p.push(`**Repository branch to select:** \`claude/legalease-sprint-captain-utucnw\``);
  p.push(`**Minimum required ancestor:** \`${packetCommit}\``);
  p.push(`**Execution contract:** \`docs/rcap/grade-a/launch-control/CODEX_CLOUD_PACKET_EXECUTION.md\` — read it before you start.`, "");
  p.push("> ## THIS PROMPT IS ONE INDEPENDENT CODEX CLOUD TASK.", ">",
    `> **DO NOT EXECUTE THE OTHER RAS PROMPTS IN THIS TASK.**`,
    "> **DO NOT EXECUTE ANOTHER LANE'S PROMPT IN THIS CONTAINER.**", "");
  p.push("## You do not render anything", "");
  p.push("There is no browser in this container and there is no way to get one: the Playwright CDN answers HTTP 403 from inside Codex, which ENV-RAS01 established by trying. **Do not run `playwright install`. Do not run `apt-get`. Do not use `pdftoppm`.** A Poppler fallback is not a fallback, it is a different measurement against tolerances calibrated for Chromium.", "");
  p.push(`The rendering happens in \`${WORKFLOW}\` on a browser-equipped GitHub runner, against the exact PDF bytes named below. Your job is to read what it produced and decide whether it binds.`, "");
  p.push(`## Your families (${fams.length})`, "");
  for (const f of fams) {
    const r = rows.find((x) => x.familyId === f);
    p.push(`### ${f}`, "");
    p.push(`- canonical \`${r.canonicalPdfPath}\` — \`${r.canonicalPdfSha256}\``);
    p.push(`- boundary \`${r.boundaryPdfPath}\` — \`${r.boundaryPdfSha256}\``);
    p.push(`- expected pages ${r.expectedPages ?? "unread"} · requested scale ${r.requestedScale}`);
    p.push(`- built by ${r.builderAssignment ?? "(no builder lane recorded)"}`, "");
  }
  p.push("## What you check, per family", "");
  p.push("1. The receipt names this run and this artifact, and the workflow run id is the one you were given.");
  p.push("2. **The hashes bind.** The receipt's canonical and boundary SHA-256 must equal the values above, exactly. A receipt that describes different bytes describes a different packet, and no amount of clean-looking rasters makes it this family's evidence.");
  p.push("3. Every expected page has a PNG.");
  p.push("4. No page is blank.");
  p.push("5. Dimensions match the requested PDF-point scale.");
  p.push("6. No clipped write, no overlapping participant text, no placeholder text, no protected-field ink.", "");
  p.push("All six, or the family is `RASTER_FAIL`. If the workflow could not render at all — no browser, a launch failure — that is `RASTER_BLOCKED_ENVIRONMENT` and **never** `RASTER_FAIL`: an environment that cannot look at the packet has said nothing about the packet.", "");
  p.push("## What you may write", "");
  p.push(`- \`data/rcap-grade-a/codex-cloud/${lane.toLowerCase()}-raster-evidence/**\` — and nothing else.`, "");
  p.push("## What you may not touch", "");
  p.push("- any packet PDF, overlay directory, build script or field map — you modify **no** packet bytes;");
  p.push(`- \`${OUT}\` — Captain writes the queue; you report and Captain records;`);
  p.push("- another RAS lane's evidence directory;");
  p.push("- anything in `private/`, any commercial route, any Production resource.", "");
  p.push("## One family's failure does not stop another", "");
  p.push("Write a row for every family you were assigned, `RASTER_PASS`, `RASTER_FAIL` or `RASTER_BLOCKED_ENVIRONMENT`, with the measurement behind it. A lane that returns fewer rows than it was assigned families has lost work silently.", "");
  p.push("## How you return", "");
  p.push("The diff is the return.", "", "```text",
    `LANE: ${lane}`, `FAMILIES ASSIGNED: ${fams.length}`,
    "RASTER_PASS:", "RASTER_FAIL:", "RASTER_BLOCKED_ENVIRONMENT:",
    "HASH MISMATCHES:", "PACKET PDFS MODIFIED: 0",
    "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO", "```", "");
  p.push("## What finishing does not do", "");
  p.push("A RASTER_PASS is one gate. It does not make a family PASS_COMPLETE, it does not promote anything, and it opens no commercial route.", "");
  return p.join("\n");
};

const EMIT = makeEmitter({ root: ROOT, check: CHECK, label: "raster queue" });
EMIT.emit(OUT, `${JSON.stringify(doc, null, 2)}\n`);
for (const l of LANES) EMIT.emit(`${PROMPTS}/${l}_PACKET_RASTER_EVIDENCE.md`, promptFor(l));
EMIT.sweep(PROMPTS, (n) => n.endsWith(".md"));
EMIT.finish();
if (CHECK) process.exit(0);

console.log(`Wrote ${OUT} and ${LANES.length} raster prompts into ${PROMPTS}/`);
console.log(`  ${rows.length} famil(ies) RASTER_PENDING · ${notEligible.length} not eligible`);
for (const l of LANES) console.log(`    ${l}: ${byLane[l].length} famil(ies)`);
