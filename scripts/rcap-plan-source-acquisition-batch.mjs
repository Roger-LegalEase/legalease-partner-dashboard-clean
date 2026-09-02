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
import { hostAllowed, ALLOWED_EXACT_HOSTS, REFUSED_HOSTS } from "./lib/official-host-policy.mjs";

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

/*
 * One policy, imported. It used to be three regexes over the acquire script's
 * own source text, which meant the planner could enforce a policy the acquirer
 * no longer held, and neither copy could be tested against a host directly.
 */
if (!fs.existsSync(path.join(ROOT, ACQUIRE_SCRIPT))) fail(`${ACQUIRE_SCRIPT} is not present`);
/* Exact hostnames, by full equality only. Never widened to their suffix. */
const EXACT = new Set(ALLOWED_EXACT_HOSTS.keys());

const entries = Array.isArray(manifest.entries) ? manifest.entries : null;
if (!entries) fail("the manifest has no entries array");
/*
 * An empty manifest validated cleanly: zero entries, zero problems, exit 0.
 * That is a generator regression sailing through the gate as a pass, and
 * "nothing to acquire" and "the manifest lost its contents" are the same
 * observation from outside. If the conveyor still has obligations, a manifest
 * with no entries is a defect rather than a quiet day.
 */
if (entries.length === 0) {
  const stillOwed = Number(manifest.counts?.sourceObligationsTotal ?? 0);
  if (stillOwed > 0) {
    fail(`the manifest has no entries while ${stillOwed} source obligation(s) are outstanding; an empty manifest is a regression, not a quiet day`);
  }
  console.log("0 manifest entries and 0 outstanding source obligations — nothing to acquire.");
}

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
    if (REFUSED_HOSTS.has(host)) problems.push(`${at}: ${host} is a commercial form site, not the issuing body`);
    else if (!hostAllowed(host)) problems.push(`${at}: ${host} is not an allowlisted official government host`);
    if (EXACT.has(host) && !/^[0-9a-f]{64}$/.test(String(e.expectedSha256 ?? ""))) {
      problems.push(`${at}: ${host} is allowed as an exact hostname only with an expected SHA-256`);
    }
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

/*
 * One canonical artifact name, produced HERE and nowhere else.
 *
 * The name was being composed inline in the workflow's upload step while the
 * materializer demanded that the receipt carry the same string. Three places
 * built it and nothing made them agree, so a handoff could only ever be refused
 * for a mismatch nobody could see. It is derived once, from the two fields the
 * manifest already proves unique, and every later step is handed the result.
 *
 * GitHub artifact names may not contain " : < > | * ? \r \n \\ /, so the
 * derivation sanitizes rather than trusting a source id to be safe.
 */
const artifactNameFor = (e) => {
  /*
   * Case-folded, because the uniqueness proof has to model the collision
   * domain it protects. GitHub's artifact store treats names
   * CASE-INSENSITIVELY, so two source ids differing only in case would pass a
   * case-sensitive Map check here and then collide at upload time — where the
   * second upload is the one that loses. Folding at derivation means the
   * check below and the platform are asking the same question.
   */
  const safe = (x) => String(x).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  const name = `rcap-source-${safe(e.jurisdiction)}-${safe(e.sourceId)}`;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]+$/.test(name)) {
    fail(`entry ${e.sourceId}: no valid artifact name can be derived from jurisdiction ${JSON.stringify(e.jurisdiction)} and source id ${JSON.stringify(e.sourceId)}`);
  }
  return name;
};

/* Unique names, checked rather than assumed: two entries whose ids differ only
 * in characters the sanitizer removes would collide into one artifact, and the
 * second upload would overwrite the first. */
/* Over EVERY entry, not the filtered subset. A dispatch narrowed by
 * jurisdiction or limit would otherwise prove uniqueness only within what it
 * happened to select, and a collision outside that window is still a collision
 * the next dispatch walks into. */
const nameOwner = new Map();
for (const e of entries) {
  const n = artifactNameFor(e);
  if (nameOwner.has(n)) fail(`${e.sourceId} and ${nameOwner.get(n)} both derive artifact name ${n}`);
  nameOwner.set(n, e.sourceId);
}

const matrix = planned.map((e) => ({
  sourceId: e.sourceId,
  jurisdiction: e.jurisdiction,
  formNumber: e.formNumber ?? e.officialTitle,
  artifactName: artifactNameFor(e),
  officialUrl: e.officialUrl,
  urlKind: e.urlKind ?? "direct_binary",
  expectedSha256: e.expectedSha256 ?? ""
}));

console.log(`${entries.length} manifest entr(ies) validated, ${matrix.length} planned${ONLY ? ` for ${ONLY}` : ""}.`);
for (const m of matrix.slice(0, 10)) console.log(`  ${m.jurisdiction} ${m.formNumber} [${m.artifactName}] — ${m.officialUrl}`);
if (matrix.length > 10) console.log(`  ... and ${matrix.length - 10} more`);

const out = process.env.GITHUB_OUTPUT;
if (out) {
  fs.appendFileSync(out, `entries=${JSON.stringify(matrix)}\n`);
  fs.appendFileSync(out, `count=${matrix.length}\n`);
}
