#!/usr/bin/env node
// D2 lane self-verifier: re-validates the production field packages under
// data/rcap-all50/overlays/production/ for the nine D2 jurisdictions.
// Plain node, no dependencies. Exit 1 on any failure.
//
// Checks:
//  1. Every family directory carries source-record.json, field-census.json, handoff.md,
//     reports/prior-render-evidence.json.
//  2. Buildable families: field-classification.json covers the census exactly (same
//     names, no extras, no dupes); classes come from the allowed vocabulary.
//  3. No populatable field may carry a protected class; production-field-map bindings
//     reference only census fields classified participant/deterministic; every
//     non-populatable census field appears in neverPopulate or manualParticipantFields.
//  4. Fixtures parse; canonical/boundary expectedFieldValues keys are populatable
//     census fields; negative expectedEmptyFields equals the set of non-populatable fields.
//  5. Prior-render evidence: recorded sample paths exist on disk and sha256-match.
//  6. Fail-closed families: failClosed true, empty census with a censusBasis, no
//     production-field-map.json.
//  7. Jurisdiction summaries list exactly the family dirs on disk; readiness values valid.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PROD = path.join(ROOT, 'data/rcap-all50/overlays/production');
const JURS = ['arizona', 'illinois', 'washington', 'kansas', 'minnesota', 'new-jersey', 'florida', 'louisiana', 'new-mexico'];
const CLASSES = new Set(['participant', 'deterministic', 'manual_participant', 'court_or_agency', 'prosecutor_or_outside_party', 'signature', 'protected', 'prohibited', 'unused']);
const POPULATABLE = new Set(['participant', 'deterministic']);
const NEVER_POPULATABLE = new Set(['court_or_agency', 'prosecutor_or_outside_party', 'signature', 'protected', 'prohibited', 'unused']);

let failures = 0;
const fail = (msg) => { failures++; console.error('FAIL: ' + msg); };
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

let familiesChecked = 0, buildableChecked = 0, fieldsChecked = 0;

for (const jur of JURS) {
  const jdir = path.join(PROD, jur);
  if (!fs.existsSync(jdir)) { fail(`missing jurisdiction dir ${jur}`); continue; }

  const famDirs = fs.readdirSync(jdir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
  const summaryPath = path.join(jdir, 'jurisdiction-summary.json');
  if (!fs.existsSync(summaryPath)) { fail(`${jur}: missing jurisdiction-summary.json`); continue; }
  let summary;
  try { summary = readJson(summaryPath); } catch (e) { fail(`${jur}: unparseable summary: ${e.message}`); continue; }

  const summaryFams = (summary.families || []).map(f => f.familySlug).sort();
  if (JSON.stringify(summaryFams) !== JSON.stringify(famDirs)) {
    fail(`${jur}: summary families ${JSON.stringify(summaryFams)} != dirs ${JSON.stringify(famDirs)}`);
  }
  for (const [track, r] of Object.entries(summary.trackReadiness || {})) {
    if (!['readyExceptRender', 'blocked'].includes(r.status)) fail(`${jur}/${track}: bad readiness status ${r.status}`);
    if (!r.reason) fail(`${jur}/${track}: readiness missing reason`);
  }

  for (const fam of famDirs) {
    familiesChecked++;
    const fdir = path.join(jdir, fam);
    const p = (n) => path.join(fdir, n);

    for (const req of ['source-record.json', 'field-census.json', 'handoff.md', 'reports/prior-render-evidence.json']) {
      if (!fs.existsSync(p(req))) { fail(`${jur}/${fam}: missing ${req}`); }
    }
    if (!fs.existsSync(p('source-record.json')) || !fs.existsSync(p('field-census.json'))) continue;

    let src, census;
    try { src = readJson(p('source-record.json')); census = readJson(p('field-census.json')); }
    catch (e) { fail(`${jur}/${fam}: unparseable core file: ${e.message}`); continue; }

    if (src.sourcePresenceInClone !== false) fail(`${jur}/${fam}: sourcePresenceInClone must be false in this clone`);
    if (!src.exactSourceRequirement) fail(`${jur}/${fam}: missing exactSourceRequirement`);
    if (!src.sha256) fail(`${jur}/${fam}: missing sha256 record`);
    if (!src.currentnessBasis || !String(src.currentnessBasis.registryPin || '').startsWith('3b6f4c10')) fail(`${jur}/${fam}: missing registry pin`);

    const buildable = src.buildStatus === 'buildable';
    const failClosedExpected = ['fail_closed_geometry', 'fail_closed_absent_source'].includes(src.buildStatus);

    if (failClosedExpected) {
      if (src.failClosed !== true) fail(`${jur}/${fam}: buildStatus ${src.buildStatus} but failClosed !== true`);
      if (!src.failReason) fail(`${jur}/${fam}: fail-closed family missing failReason`);
      if (census.fieldCount !== 0 || (census.fields || []).length !== 0) fail(`${jur}/${fam}: fail-closed family must have empty census`);
      if (!census.censusBasis) fail(`${jur}/${fam}: fail-closed census missing censusBasis`);
      if (fs.existsSync(p('production-field-map.json'))) fail(`${jur}/${fam}: fail-closed family must not carry a production-field-map`);
    }
    if (src.buildStatus === 'instructions_component') {
      if (census.fieldCount !== 0) fail(`${jur}/${fam}: instructions component must have empty census`);
      if (fs.existsSync(p('production-field-map.json'))) fail(`${jur}/${fam}: instructions component must not carry a production-field-map`);
    }

    // prior-render evidence hashes
    try {
      const pre = readJson(p('reports/prior-render-evidence.json'));
      if (pre.contactSheetStatus !== 'blocked_pending_source_binary') fail(`${jur}/${fam}: contactSheetStatus must be blocked_pending_source_binary`);
      for (const s of pre.samples || []) {
        const sp = path.join(ROOT, s.path);
        if (!fs.existsSync(sp)) { fail(`${jur}/${fam}: recorded sample ${s.path} missing on disk`); continue; }
        const h = sha256(sp);
        if (h !== s.sha256) fail(`${jur}/${fam}: sample hash mismatch for ${s.path} (${h} != ${s.sha256})`);
      }
      if (src.buildStatus === 'fail_closed_absent_source' && (pre.samples || []).length > 0) {
        fail(`${jur}/${fam}: absent-source family cannot have sample evidence`);
      }
    } catch (e) { fail(`${jur}/${fam}: prior-render-evidence unreadable: ${e.message}`); }

    if (!buildable) continue;
    buildableChecked++;

    // classification vs census
    let cls, map;
    try { cls = readJson(p('field-classification.json')); map = readJson(p('production-field-map.json')); }
    catch (e) { fail(`${jur}/${fam}: buildable family missing classification or map: ${e.message}`); continue; }

    const censusNames = census.fields.map(f => f.name);
    const clsNames = cls.fields.map(f => f.name);
    const censusSet = new Set(censusNames);
    if (censusNames.length !== censusSet.size) fail(`${jur}/${fam}: duplicate names in census`);
    if (clsNames.length !== new Set(clsNames).size) fail(`${jur}/${fam}: duplicate names in classification`);
    if (JSON.stringify([...censusNames].sort()) !== JSON.stringify([...clsNames].sort())) {
      fail(`${jur}/${fam}: classification does not cover census exactly`);
    }
    fieldsChecked += censusNames.length;

    const byName = Object.fromEntries(cls.fields.map(f => [f.name, f]));
    for (const f of cls.fields) {
      if (!CLASSES.has(f.class)) fail(`${jur}/${fam}/${f.name}: unknown class ${f.class}`);
      const shouldPopulate = POPULATABLE.has(f.class);
      if (f.populatable !== shouldPopulate) fail(`${jur}/${fam}/${f.name}: populatable flag inconsistent with class ${f.class}`);
      if (NEVER_POPULATABLE.has(f.class) && (f.factId || f.derivation)) {
        fail(`${jur}/${fam}/${f.name}: protected-class field carries a population binding`);
      }
    }

    // map bindings
    const bindingFields = (map.bindings || []).map(b => b.field);
    if (bindingFields.length !== new Set(bindingFields).size) fail(`${jur}/${fam}: duplicate map bindings`);
    for (const b of map.bindings || []) {
      if (!censusSet.has(b.field)) fail(`${jur}/${fam}: map binds unknown field "${b.field}"`);
      const c = byName[b.field];
      if (!c || !POPULATABLE.has(c.class)) fail(`${jur}/${fam}: map binds non-populatable field "${b.field}" (${c ? c.class : 'unclassified'})`);
      if (!b.boundsCheck) fail(`${jur}/${fam}: binding "${b.field}" missing boundsCheck`);
      if (!b.binding || (!b.binding.factId && !b.binding.derivation)) fail(`${jur}/${fam}: binding "${b.field}" has no fact/derivation`);
    }
    const populatableSet = new Set(cls.fields.filter(f => f.populatable).map(f => f.name));
    for (const name of populatableSet) {
      if (!bindingFields.includes(name)) fail(`${jur}/${fam}: populatable field "${name}" missing from map bindings`);
    }
    const covered = new Set([...bindingFields, ...(map.manualParticipantFields || []), ...(map.neverPopulate || []).map(x => x.field)]);
    for (const name of censusNames) {
      if (!covered.has(name)) fail(`${jur}/${fam}: census field "${name}" not covered by map (bindings/manual/neverPopulate)`);
    }
    for (const x of map.neverPopulate || []) {
      const c = byName[x.field];
      if (!c || POPULATABLE.has(c.class)) fail(`${jur}/${fam}: neverPopulate lists populatable/unknown field "${x.field}"`);
    }

    // fixtures
    let canonical, boundary, negative;
    try {
      canonical = readJson(p('fixtures/canonical.json'));
      boundary = readJson(p('fixtures/boundary.json'));
      negative = readJson(p('fixtures/negative.json'));
    } catch (e) { fail(`${jur}/${fam}: fixtures unreadable: ${e.message}`); continue; }
    for (const [kind, fx] of [['canonical', canonical], ['boundary', boundary]]) {
      for (const k of Object.keys(fx.expectedFieldValues || {})) {
        if (!populatableSet.has(k)) fail(`${jur}/${fam}: ${kind} fixture expects value in non-populatable field "${k}"`);
      }
      if (Object.keys(fx.expectedFieldValues || {}).length === 0) fail(`${jur}/${fam}: ${kind} fixture is empty`);
    }
    const expectedEmpty = new Set(negative.expectedEmptyFields || []);
    const nonPopulatable = cls.fields.filter(f => !f.populatable).map(f => f.name);
    for (const n of nonPopulatable) if (!expectedEmpty.has(n)) fail(`${jur}/${fam}: negative fixture missing protected field "${n}"`);
    for (const n of expectedEmpty) if (populatableSet.has(n)) fail(`${jur}/${fam}: negative fixture lists populatable field "${n}" as expected-empty`);

    // reports coherence
    try {
      const pop = readJson(p('reports/populated-fields.json'));
      const prot = readJson(p('reports/protected-fields.json'));
      if (pop.count !== populatableSet.size) fail(`${jur}/${fam}: populated-fields count mismatch`);
      const protTotal = Object.values(prot.byClass || {}).reduce((a, v) => a + v.length, 0);
      if (protTotal !== nonPopulatable.length) fail(`${jur}/${fam}: protected-fields count mismatch`);
    } catch (e) { fail(`${jur}/${fam}: reports unreadable: ${e.message}`); }
  }
}

console.log(`checked ${familiesChecked} families (${buildableChecked} buildable, ${fieldsChecked} classified fields) across ${JURS.length} jurisdictions`);
if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log('OK: all D2 production field packages verify clean.');
