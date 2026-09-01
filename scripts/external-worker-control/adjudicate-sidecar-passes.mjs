#!/usr/bin/env node
/*
 * Adjudicate an independently-returned PASS_COMPLETE_INDEPENDENT before it is
 * allowed to mean anything.
 *
 * A verdict is integrated only when every condition holds. Where one does not,
 * the single missing condition is recorded and the family continues -- a
 * near-pass is not a pass, and naming exactly what is missing is more useful
 * than a re-audit.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FACT = "data/rcap-grade-a/packet-factory-24h";
const OUT = "data/rcap-grade-a/launch-control/SIDECAR_PASS_ADJUDICATION.json";
const read = (r) => JSON.parse(fs.readFileSync(path.join(ROOT, r), "utf8"));
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

const FIFTEEN = ["ROUTE_IDENTITY", "SOURCE_IDENTITY", "COMPONENT_SET", "KNOWN_PREFILLS",
  "REQUIRED_BEFORE_FILING", "ROUTE_OPTIONS", "REPEATING_ROWS", "PROTECTED_FIELDS",
  "ARTIFACTS", "PAGE_ORDER", "CLIPPING_AND_OVERLAP", "FILING_DESTINATION",
  "FEE_AND_WAIVER", "SERVICE", "SELF_HELP_STOP"];
const SCREAM = (k) => k.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();

const ledger = read(`${FACT}/claim-ledger.json`);
const queue = read(`${FACT}/RASTER_QUEUE.json`);
const rowByFamily = new Map(queue.rows.map((r) => [r.familyId, r]));
const sha256 = (abs) => crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");

/* Collect every claimed pass from every return directory, wherever it lives.
 * My readiness scan only walked packet-factory-24h and missed ten verdicts
 * sitting in codex-cloud. */
const claimed = [];
for (const root of ["data/rcap-grade-a/codex-cloud", FACT]) {
  const abs = path.join(ROOT, root);
  if (!fs.existsSync(abs)) continue;
  for (const d of fs.readdirSync(abs)) {
    const p = path.join(abs, d, "rows.json");
    if (!fs.existsSync(p)) continue;
    let doc;
    try { doc = JSON.parse(fs.readFileSync(p, "utf8")); } catch { continue; }
    for (const r of doc.rows ?? []) {
      if (r.verdict !== "PASS_COMPLETE_INDEPENDENT") continue;
      claimed.push({ laneDir: `${root}/${d}`, doc, row: r, familyId: r.itemId ?? r.familyId });
    }
  }
}

const verdicts = [];
for (const c of claimed) {
  const f = c.familyId;
  const missing = [];

  // 1. the return exists in the tree (it is what we are reading) and names its base
  const baseSha = c.doc.baseSha ?? c.doc.shiftBaseSha ?? null;
  if (!baseSha) missing.push("the return names no base commit, so what it measured cannot be located");

  // 2. all fifteen obligations scored
  const scored = new Set((JSON.stringify(c.row).match(/[A-Z][A-Z_]{4,}/g) ?? []));
  for (const k of Object.keys(c.row.proofObligations ?? {})) scored.add(SCREAM(k));
  const unscored = FIFTEEN.filter((o) => !scored.has(o));
  if (unscored.length) missing.push(`${unscored.length} of 15 obligations unscored: ${unscored.slice(0, 5).join(", ")}`);

  // 3. current complete-document-set RASTER_PASS
  const row = rowByFamily.get(f);
  if (!row) missing.push("the family is not in the raster queue at all");
  else if (row.currentRasterState !== "RASTER_PASS") missing.push(`raster state is ${row.currentRasterState}`);
  else if (row.coverage?.complete !== true) missing.push("the raster receipt does not cover the whole document set");

  // 4. the packet hashes the verifier measured still describe the packet
  const measured = [];
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "string" && /^[0-9a-f]{64}$/.test(v) && /sha256|digest|hash/i.test(k)) measured.push(v);
      else walk(v);
    }
  };
  walk(c.row);
  const current = new Set();
  if (row) for (const d of row.documents ?? []) current.add(d.sha256);
  const stale = measured.filter((h) => current.size && !current.has(h));
  if (!measured.length) missing.push("the return records no artifact hash, so it cannot be bound to any bytes");
  else if (current.size && stale.length === measured.length) {
    missing.push(`none of the ${measured.length} hash(es) it measured matches the packet's current bytes`);
  }

  // 5. the verifier neither built nor repaired the family
  const laneName = (c.doc.lane ?? c.doc.assignmentId ?? c.laneDir.split("/").pop() ?? "").toUpperCase();
  const wrote = ledger.claims.filter((x) => x.subjectId === f
    && ["packet-build", "repair", "shared-host-repair"].includes(x.laneKind)
    && laneName.includes(x.lane));
  if (wrote.length) missing.push(`the verifier's lane also holds a ${wrote[0].laneKind} claim on this family`);

  verdicts.push({
    familyId: f, returnedBy: c.laneDir, claimedVerdict: "PASS_COMPLETE_INDEPENDENT",
    integrated: missing.length === 0,
    missingConditions: missing,
    theSingleMissingCondition: missing.length === 1 ? missing[0] : null,
    obligationsScored: FIFTEEN.length - unscored.length,
    hashesMeasured: measured.length,
    rasterState: row?.currentRasterState ?? null,
    rasterCoversWholeFamily: row?.coverage?.complete ?? null,
  });
}

const integrated = verdicts.filter((v) => v.integrated);
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify({
  schemaVersion: "rcap-sidecar-adjudication/v1",
  adjudicatedAt: now, captainSha: head,
  claimedPasses: verdicts.length,
  integrated: integrated.length,
  refused: verdicts.length - integrated.length,
  theFiveConditions: [
    "the return exists and names the base it measured",
    "all fifteen proof obligations scored",
    "a current RASTER_PASS covering the whole document set",
    "the hashes it measured still describe the packet's bytes",
    "the verifier neither built nor repaired the family",
  ],
  whyThisIsNotACensus: "Each claimed pass is checked against five conditions and nothing else. A family that fails one is recorded with the condition it failed and continues; no broad re-audit is triggered.",
  verdicts,
  ceiling: "Integrating a verdict records that a family passed independent verification. It does not open a commercial route; COMMERCIAL_READY_CANDIDATE is a separate recording and Production remains owner-authorized.",
  commercialRoutesOpened: 0,
  productionTouched: false,
}, null, 2)}\n`);

console.log(`adjudicated ${verdicts.length} claimed pass(es): ${integrated.length} integrated, ${verdicts.length - integrated.length} refused`);
for (const v of verdicts) {
  console.log(`  ${v.integrated ? "INTEGRATE" : "REFUSE   "} ${v.familyId.padEnd(42)} ${v.obligationsScored}/15 obligations, raster ${v.rasterState ?? "none"}`);
  for (const m of v.missingConditions) console.log(`              - ${m}`);
}
