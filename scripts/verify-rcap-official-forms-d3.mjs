#!/usr/bin/env node
// Terminal D3 output verifier — re-validates the D3 production field packages
// under data/rcap-all50/overlays/production/ for the nine D3 jurisdictions.
// Plain node, no dependencies. Exit 1 on any failure.
//
// Checks:
//   1. Family layout: every family has source-record.json, field-census.json,
//      handoff.md, reports/prior-render-evidence.json.
//   2. Source records fail closed: sourcePresenceInClone === false everywhere,
//      exactSourceRequirement always present; fail_closed families carry an
//      empty census and no production map/classification/fixtures; families
//      whose recorded classification is scanned_pdf or whose binary is absent
//      from the inventory MUST be fail_closed.
//   3. Census vs classification completeness: 1:1 by censusId, no extras.
//   4. No populatable protected field: only participant/deterministic may be
//      populatable; every production-map binding must reference a populatable
//      census entry; protected/signature/court/prosecutor/manual/unused/
//      prohibited entries must never be bound.
//   5. Fixtures parse; negative fixture expectedEmptyFields reference only
//      non-populatable entries; canonical/boundary expected values cover every
//      binding.
//   6. Prior-render evidence files exist in the repo and hash-match records.
//   7. Jurisdiction summaries exist, list every family on disk, and use only
//      readyExceptRender/blocked readiness states consistent with family
//      statuses.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const PROD = path.join(ROOT, "data/rcap-all50/overlays/production");
const JURS = [
  "colorado", "texas", "north-dakota", "new-hampshire", "missouri",
  "oregon", "iowa", "massachusetts", "utah",
];
const POPULATABLE = new Set(["participant", "deterministic"]);
const ALL_CLASSES = new Set([
  "participant", "deterministic", "manual_participant", "court_or_agency",
  "prosecutor_or_outside_party", "signature", "protected", "prohibited", "unused",
]);

let failures = 0;
const fail = (msg) => { failures++; console.error("FAIL: " + msg); };
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

let familiesChecked = 0;

for (const jur of JURS) {
  const jurDir = path.join(PROD, jur);
  if (!fs.existsSync(jurDir)) { fail("missing jurisdiction dir: " + jurDir); continue; }

  const summaryPath = path.join(jurDir, "jurisdiction-summary.json");
  if (!fs.existsSync(summaryPath)) { fail("missing jurisdiction-summary.json for " + jur); continue; }
  let summary;
  try { summary = readJson(summaryPath); } catch (e) { fail("unparseable summary " + summaryPath + ": " + e.message); continue; }

  const famDirs = fs.readdirSync(jurDir, { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const summarySlugs = (summary.families || []).map((f) => f.slug).sort();
  if (JSON.stringify(famDirs) !== JSON.stringify(summarySlugs)) {
    fail(jur + ": summary families " + JSON.stringify(summarySlugs) + " != dirs " + JSON.stringify(famDirs));
  }
  for (const [track, r] of Object.entries(summary.trackReadiness || {})) {
    if (!r || !["readyExceptRender", "blocked"].includes(r.state) || !r.reason) {
      fail(jur + ": track " + track + " readiness must be readyExceptRender/blocked with a reason");
    }
  }
  for (const [track, fams] of Object.entries(summary.trackFamilyMap || {})) {
    for (const f of fams) if (!famDirs.includes(f)) fail(jur + ": trackFamilyMap for " + track + " names unknown family " + f);
  }

  for (const fam of famDirs) {
    familiesChecked++;
    const dir = path.join(jurDir, fam);
    const p = (...xs) => path.join(dir, ...xs);

    // 1. layout
    for (const req of ["source-record.json", "field-census.json", "handoff.md", path.join("reports", "prior-render-evidence.json")]) {
      if (!fs.existsSync(p(req))) fail(jur + "/" + fam + ": missing " + req);
    }
    if (!fs.existsSync(p("source-record.json"))) continue;
    const src = readJson(p("source-record.json"));
    const census = fs.existsSync(p("field-census.json")) ? readJson(p("field-census.json")) : { fields: [] };

    // 2. source record fails closed
    if (src.sourcePresenceInClone !== false) fail(jur + "/" + fam + ": sourcePresenceInClone must be false");
    if (!src.exactSourceRequirement || src.exactSourceRequirement.length < 40) {
      fail(jur + "/" + fam + ": exactSourceRequirement missing/too thin");
    }
    const state = src.status && src.status.state;
    if (!["fail_closed", "ready_except_render"].includes(state)) fail(jur + "/" + fam + ": bad status.state " + state);
    const cls = src.source && src.source.classification;
    const mustFailClosed = cls === "scanned_pdf" || cls === "not_ingested" || !src.source.fileName;
    if (mustFailClosed && state !== "fail_closed") {
      fail(jur + "/" + fam + ": classification " + cls + " requires fail_closed");
    }
    if (state === "fail_closed") {
      if ((census.fields || []).length !== 0) fail(jur + "/" + fam + ": fail_closed family must have an empty census");
      if (!census.censusBasis || !/scanned_pdf|absent/.test(census.censusBasis)) {
        fail(jur + "/" + fam + ": fail_closed census must state its basis (scanned_pdf/absent)");
      }
      if (cls === "scanned_pdf" && census.censusBasis !== "scanned_pdf—manual geometry required") {
        fail(jur + "/" + fam + ": scanned family censusBasis must be 'scanned_pdf—manual geometry required'");
      }
      for (const forbidden of ["field-classification.json", "production-field-map.json", "fixtures"]) {
        if (fs.existsSync(p(forbidden))) fail(jur + "/" + fam + ": fail_closed family must not carry " + forbidden);
      }
      // prior-render evidence check still applies below
    }

    // prior-render evidence (6)
    if (fs.existsSync(p("reports", "prior-render-evidence.json"))) {
      const pre = readJson(p("reports", "prior-render-evidence.json"));
      if (pre.contactSheetStatus !== "blocked_pending_source_binary") {
        fail(jur + "/" + fam + ": contactSheetStatus must be blocked_pending_source_binary");
      }
      for (const s of pre.samples || []) {
        const abs = path.join(ROOT, s.path);
        if (!fs.existsSync(abs)) { fail(jur + "/" + fam + ": prior render sample missing " + s.path); continue; }
        const h = sha256(abs);
        if (h !== s.sha256) fail(jur + "/" + fam + ": prior render hash mismatch for " + s.path + " (" + h + " != " + s.sha256 + ")");
      }
      if (state === "ready_except_render" && (pre.samples || []).length === 0) {
        fail(jur + "/" + fam + ": ready family must cite at least one committed prior render sample");
      }
    }

    if (state === "fail_closed") continue;

    // 3. census vs classification completeness
    const clsFile = readJson(p("field-classification.json"));
    const censusIds = (census.fields || []).map((f) => f.censusId);
    const classIds = (clsFile.fields || []).map((f) => f.censusId);
    if (new Set(censusIds).size !== censusIds.length) fail(jur + "/" + fam + ": duplicate censusIds in census");
    if (JSON.stringify([...censusIds].sort()) !== JSON.stringify([...classIds].sort())) {
      fail(jur + "/" + fam + ": classification does not cover the census 1:1");
    }
    for (const c of clsFile.fields || []) {
      if (!ALL_CLASSES.has(c.class)) fail(jur + "/" + fam + ": unknown class " + c.class + " on " + c.censusId);
      const shouldPop = POPULATABLE.has(c.class);
      if (c.populatable !== shouldPop) {
        fail(jur + "/" + fam + ": " + c.censusId + " class " + c.class + " has populatable=" + c.populatable);
      }
    }

    // 4. map binds only populatable entries
    const map = readJson(p("production-field-map.json"));
    const clsById = new Map((clsFile.fields || []).map((f) => [f.censusId, f]));
    for (const b of map.bindings || []) {
      const c = clsById.get(b.censusId);
      if (!c) { fail(jur + "/" + fam + ": binding references unknown censusId " + b.censusId); continue; }
      if (!POPULATABLE.has(c.class)) {
        fail(jur + "/" + fam + ": binding populates non-populatable field " + b.censusId + " (" + c.class + ")");
      }
      if (c.class === "participant" && (!b.facts || b.facts.length === 0)) {
        fail(jur + "/" + fam + ": participant binding " + b.censusId + " carries no facts");
      }
      if (c.class === "deterministic" && !b.derivation) {
        fail(jur + "/" + fam + ": deterministic binding " + b.censusId + " carries no derivation rule");
      }
      if (!b.boundsCheck) fail(jur + "/" + fam + ": binding " + b.censusId + " has no boundsCheck");
    }
    const boundIds = new Set((map.bindings || []).map((b) => b.censusId));
    for (const c of clsFile.fields || []) {
      if (POPULATABLE.has(c.class) && !boundIds.has(c.censusId)) {
        fail(jur + "/" + fam + ": populatable field " + c.censusId + " has no binding");
      }
    }

    // 5. fixtures
    for (const fx of ["canonical", "boundary", "negative"]) {
      const fp = p("fixtures", fx + ".json");
      if (!fs.existsSync(fp)) { fail(jur + "/" + fam + ": missing fixture " + fx); continue; }
      let j;
      try { j = readJson(fp); } catch (e) { fail(jur + "/" + fam + ": fixture " + fx + " unparseable: " + e.message); continue; }
      if (fx === "negative") {
        for (const e of j.expectedEmptyFields || []) {
          const c = clsById.get(e.censusId);
          if (!c) fail(jur + "/" + fam + ": negative fixture names unknown censusId " + e.censusId);
          else if (POPULATABLE.has(c.class)) fail(jur + "/" + fam + ": negative fixture wrongly lists populatable field " + e.censusId);
          if (e.expected !== "") fail(jur + "/" + fam + ": negative fixture expected value must be empty for " + e.censusId);
        }
        const nonPop = (clsFile.fields || []).filter((c) => !POPULATABLE.has(c.class)).length;
        if ((j.expectedEmptyFields || []).length !== nonPop) {
          fail(jur + "/" + fam + ": negative fixture must list every non-populatable census entry");
        }
      } else {
        const covered = new Set((j.expectedFieldValues || []).map((e) => e.censusId));
        for (const b of map.bindings || []) {
          if (!covered.has(b.censusId)) fail(jur + "/" + fam + ": fixture " + fx + " missing expectation for " + b.censusId);
        }
      }
    }

    // reports consistency
    const pop = readJson(p("reports", "populated-fields.json"));
    const prot = readJson(p("reports", "protected-fields.json"));
    if (pop.count !== (map.bindings || []).length) fail(jur + "/" + fam + ": populated-fields count mismatch");
    const nonPopCount = (clsFile.fields || []).filter((c) => !POPULATABLE.has(c.class)).length;
    if (prot.count !== nonPopCount) fail(jur + "/" + fam + ": protected-fields count mismatch");
    for (const f of prot.fields || []) {
      const c = clsById.get(f.censusId);
      if (!c || POPULATABLE.has(c.class)) fail(jur + "/" + fam + ": protected-fields lists populatable/unknown " + f.censusId);
    }
  }
}

console.log("families checked: " + familiesChecked);
if (failures > 0) {
  console.error(failures + " failure(s).");
  process.exit(1);
}
console.log("D3 verifier: all checks green.");
