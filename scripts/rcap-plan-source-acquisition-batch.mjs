#!/usr/bin/env node
/**
 * Validate the committed acquisition manifest and plan the batch matrix.
 *
 * Runs inside .github/workflows/rcap-official-source-acquisition-batch.yml,
 * before any download. Every refusal below is a refusal to START the batch,
 * not a refusal of one entry: a batch that half-ran on a manifest nobody
 * trusts is harder to reason about than one that did not start.
 *
 * The host allowlist has one authority — scripts/rcap-acquire-official-source.mjs
 * — and this reads it from there rather than restating it, so the planner and
 * the fetcher cannot disagree about what an official host is.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST = process.env.RCAP_MANIFEST || "data/rcap-grade-a/packet-factory-24h/SOURCE_ACQUISITION_MANIFEST.json";
const ONLY = (process.env.RCAP_ONLY_JURISDICTION || "").trim().toUpperCase();
const LIMIT = Number.parseInt(process.env.RCAP_LIMIT || "", 10);
const ACQUIRE_SCRIPT = "scripts/rcap-acquire-official-source.mjs";

const fail = (message) => { console.error(`FAIL source-acquisition batch plan — ${message}`); process.exit(1); };

if (!fs.existsSync(path.join(ROOT, MANIFEST))) fail(`${MANIFEST} is not committed`);
let manifest;
try { manifest = JSON.parse(fs.readFileSync(path.join(ROOT, MANIFEST), "utf8")); }
catch (e) { fail(`${MANIFEST} is not readable JSON: ${e.message}`); }

const acquireText = fs.readFileSync(path.join(ROOT, ACQUIRE_SCRIPT), "utf8");
const allowBlock = /const ALLOWED_HOST_SUFFIXES = \[([\s\S]*?)\];/.exec(acquireText);
const refuseBlock = /const REFUSED_HOSTS = new Set\(\[([\s\S]*?)\]\);/.exec(acquireText);
if (!allowBlock || !refuseBlock) fail(`cannot read the host allowlist from ${ACQUIRE_SCRIPT}`);
const ALLOWED = [...allowBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const REFUSED = new Set([...refuseBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
const hostAllowed = (h) => ALLOWED.some((s) => h === s.replace(/^\./, "") || h.endsWith(s));

const entries = Array.isArray(manifest.entries) ? manifest.entries : null;
if (!entries) fail("the manifest has no entries array");

const problems = [];
const seenUrl = new Map();
const seenSourceId = new Map();
for (const [i, e] of entries.entries()) {
  const at = `entry ${i} (${e.sourceId ?? "no source id"})`;
  if (e.commitBody === true) problems.push(`${at}: asks for the source body to be committed`);
  if (!e.jurisdiction || !/^[A-Z]{2}$/.test(String(e.jurisdiction))) problems.push(`${at}: missing or malformed jurisdiction`);
  if (!e.sourceId) problems.push(`${at}: missing source identity`);
  if (!e.formNumber && !e.officialTitle) problems.push(`${at}: neither a form number nor an official title`);
  let url = null;
  try { url = new URL(String(e.officialUrl)); } catch { problems.push(`${at}: ${e.officialUrl} is not a parsable URL`); }
  if (url) {
    if (url.protocol !== "https:") problems.push(`${at}: ${url.protocol}// is not HTTPS`);
    const host = url.hostname.toLowerCase();
    if (REFUSED.has(host)) problems.push(`${at}: ${host} is a commercial form site, not the issuing body`);
    else if (!hostAllowed(host)) problems.push(`${at}: ${host} is not an allowlisted official government host`);
    if (seenUrl.has(url.href)) problems.push(`${at}: duplicate URL, first seen at entry ${seenUrl.get(url.href)}`);
    else seenUrl.set(url.href, i);
  }
  if (e.sourceId) {
    if (seenSourceId.has(e.sourceId)) problems.push(`${at}: duplicate source id, first seen at entry ${seenSourceId.get(e.sourceId)}`);
    else seenSourceId.set(e.sourceId, i);
  }
  if (e.expectedSha256 != null && !/^[0-9a-f]{64}$/.test(String(e.expectedSha256))) problems.push(`${at}: expectedSha256 is present and is not a SHA-256`);
}

if (problems.length) {
  console.error(`FAIL source-acquisition batch plan — ${problems.length} problem(s); nothing was acquired:`);
  for (const p of problems.slice(0, 40)) console.error(`  - ${p}`);
  if (problems.length > 40) console.error(`  ... and ${problems.length - 40} more`);
  process.exit(1);
}

let planned = entries;
if (ONLY) planned = planned.filter((e) => e.jurisdiction === ONLY);
if (Number.isInteger(LIMIT) && LIMIT > 0) planned = planned.slice(0, LIMIT);

/* GitHub caps a matrix at 256 jobs. Refuse rather than silently truncating:
 * a batch that quietly dropped half its manifest reports a coverage it does
 * not have. */
if (planned.length > 256) fail(`${planned.length} entries exceeds the 256-job matrix cap; dispatch with a jurisdiction or a limit`);

const matrix = planned.map((e) => ({
  sourceId: e.sourceId,
  jurisdiction: e.jurisdiction,
  formNumber: e.formNumber ?? e.officialTitle,
  officialUrl: e.officialUrl,
  urlKind: e.urlKind ?? "direct_binary",
  expectedSha256: e.expectedSha256 ?? ""
}));

console.log(`${entries.length} manifest entr(ies) validated, ${matrix.length} planned${ONLY ? ` for ${ONLY}` : ""}.`);
for (const m of matrix.slice(0, 10)) console.log(`  ${m.jurisdiction} ${m.formNumber} — ${m.officialUrl}`);
if (matrix.length > 10) console.log(`  ... and ${matrix.length - 10} more`);

const out = process.env.GITHUB_OUTPUT;
if (out) {
  fs.appendFileSync(out, `entries=${JSON.stringify(matrix)}\n`);
  fs.appendFileSync(out, `count=${matrix.length}\n`);
}
