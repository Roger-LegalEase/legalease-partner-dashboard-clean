/**
 * Shared, read-only corpus access for the four TRUTH4 detectors.
 *
 * This module opens no write handle anywhere. It never touches an overlay
 * directory, a build script, a vf* directory, MASTER_QUEUE.json,
 * VERIFIER_RETURNS.json, generate.mjs or claim-ledger.json except to read.
 *
 * It deliberately does NOT implement a completeness framework: it enumerates
 * families and hands each detector the raw declarations it needs.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);

/**
 * Where the corpus is read from.
 *
 * These detectors are read-only, so the corpus may live outside the worktree
 * that holds the scripts. RCAP_CORPUS_ROOT points at a checkout of the base
 * commit; it defaults to the worktree the scripts sit in. Only reads ever go
 * here — every write goes to OUTPUT_ROOT below.
 */
export const REPO_ROOT = process.env.RCAP_CORPUS_ROOT
  ? path.resolve(process.env.RCAP_CORPUS_ROOT)
  : SCRIPT_ROOT;

/** Where TRUTH4_FINDINGS.json is written. Always this worktree, never the corpus. */
export const OUTPUT_ROOT = SCRIPT_ROOT;

export const CENSUS_ROOT = path.join(
  REPO_ROOT,
  'data/rcap-all50/overlays/census-v1',
);

export const FLEET_INDEX = path.join(
  REPO_ROOT,
  'data/rcap-grade-a/codex-5h/cb05-fleet-index/families.json',
);

export const TRACK_REGISTRY = path.join(
  REPO_ROOT,
  'data/record-clearing/legal-design-track-registry.json',
);

export const ROUTE_CANDIDATE = path.join(
  REPO_ROOT,
  'data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json',
);

export const FINDINGS_RECORD = path.join(
  OUTPUT_ROOT,
  'data/rcap-grade-a/truth-checks/TRUTH4_FINDINGS.json',
);

export function masterLibraryDir() {
  return process.env.MASTER_LIBRARY_SOURCE_DIR || null;
}

export function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function readJsonIfPresent(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function rel(p) {
  return path.relative(REPO_ROOT, p).split(path.sep).join('/');
}

/** Every family the fleet index calls live. This is the denominator: 346. */
export function fleetFamilies() {
  return readJson(FLEET_INDEX).families;
}

/**
 * Every census-v1 family directory on disk, keyed by the familyId its own
 * declarations name. Directory-name normalisation is only a fallback for the
 * one directory that carries no product-wiring.json / source-receipt.json.
 */
export function familyDirectories() {
  const rows = [];
  for (const state of fs.readdirSync(CENSUS_ROOT).sort()) {
    const stateDir = path.join(CENSUS_ROOT, state);
    if (!fs.statSync(stateDir).isDirectory()) continue;
    for (const name of fs.readdirSync(stateDir).sort()) {
      const dir = path.join(stateDir, name);
      if (!fs.statSync(dir).isDirectory()) continue;
      const wiring = readJsonIfPresent(path.join(dir, 'product-wiring.json'));
      const receipt = readJsonIfPresent(path.join(dir, 'source-receipt.json'));
      const familyId =
        wiring?.familyId ||
        receipt?.familyId ||
        null;
      rows.push({
        state,
        dir,
        dirRel: rel(dir),
        dirName: name,
        familyId,
        familyIdSource: wiring?.familyId
          ? 'product-wiring.json'
          : receipt?.familyId
            ? 'source-receipt.json'
            : 'NONE',
        wiring,
        receipt,
      });
    }
  }
  return rows;
}

/**
 * fleet family -> zero or more census directories.
 * Families with no directory are not measurable by the artifact detectors;
 * each detector says so explicitly rather than scoring them.
 */
export function familyIndex() {
  const dirs = familyDirectories();
  const byId = new Map();
  for (const d of dirs) {
    if (!d.familyId) continue;
    if (!byId.has(d.familyId)) byId.set(d.familyId, []);
    byId.get(d.familyId).push(d);
  }
  const families = fleetFamilies().map((f) => ({
    ...f,
    directories: byId.get(f.familyId) || [],
  }));
  const orphanDirs = dirs.filter(
    (d) => !d.familyId || !families.some((f) => f.familyId === d.familyId),
  );
  return { families, dirs, byId, orphanDirs };
}

/** Track registry rows, indexed by trackId and by packetSetId. */
export function trackRegistry() {
  const reg = readJson(TRACK_REGISTRY);
  const byTrack = new Map();
  const byPacketSet = new Map();
  for (const t of reg.tracks) {
    byTrack.set(t.trackId, t);
    const psid = t.packetSet?.packetSetId;
    if (psid) {
      if (!byPacketSet.has(psid)) byPacketSet.set(psid, []);
      byPacketSet.get(psid).push(t);
    }
  }
  return { registry: reg, byTrack, byPacketSet };
}

/** trackId parsed out of a route key of the form obligation:<kind>:<JX>:<track>[:<pathway>]. */
export function trackIdFromRouteKey(routeKey) {
  const parts = String(routeKey).split(':');
  return parts.length >= 4 ? parts[3] : null;
}

export function sha256File(p) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(p));
  return h.digest('hex');
}

/** Page count straight from poppler; null when the file will not open. */
export function pdfPageCount(p) {
  const r = spawnSync('pdfinfo', [p], { encoding: 'utf8', maxBuffer: 1 << 24 });
  if (r.status !== 0) return null;
  const m = /^Pages:\s+(\d+)/m.exec(r.stdout || '');
  return m ? Number(m[1]) : null;
}

/** Walk every node of a JSON tree, yielding [node, jsonPath]. */
export function* walk(node, trail = []) {
  yield [node, trail];
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) yield* walk(node[i], [...trail, i]);
  } else if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) yield* walk(node[k], [...trail, k]);
  }
}

/** Merge one detector's section into the shared findings record. */
export function writeSection(checkId, section) {
  fs.mkdirSync(path.dirname(FINDINGS_RECORD), { recursive: true });
  let doc = readJsonIfPresent(FINDINGS_RECORD);
  if (!doc || typeof doc !== 'object') doc = {};
  doc.schemaVersion = 'rcap-truth4-findings/v1';
  doc.lane = 'TRUTH4';
  doc.readOnly = true;
  doc.note =
    'Four narrow detectors run read-only across the corpus. No repair, no verdict, ' +
    'no promotion authority. Each section is written by its own detector script.';
  doc.baseSha = '726a49dfe0bdadc5f841bd4dadc871c6256418de';
  doc.corpusRoot = rel(REPO_ROOT) || '.';
  doc.checks = doc.checks || {};
  doc.checks[checkId] = section;
  doc.generatedAt = new Date().toISOString();
  fs.writeFileSync(FINDINGS_RECORD, `${JSON.stringify(doc, null, 2)}\n`);
  return FINDINGS_RECORD;
}
