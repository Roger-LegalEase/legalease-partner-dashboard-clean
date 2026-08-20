#!/usr/bin/env node
// The hosted harness may only select columns packet_render_jobs actually has.
//
//   node scripts/verify-rcap-hosted-job-read-columns.mjs
//   node scripts/verify-rcap-hosted-job-read-columns.mjs --mutations
//
// Hosted run 32393413747 spent a real Stripe Sandbox Checkout, a signed
// webhook, a durable job and four worker cycles, and then could not say what
// happened to the job:
//
//   ERROR: 42703: column "output_page_count" does not exist
//   HINT:  Perhaps you meant to reference "packet_render_jobs.output_byte_count"
//
// `output_page_count` has never been a column. It is the NAME OF A FUNCTION
// PARAMETER — `p_output_page_count` — which finalize_packet_render_job writes
// into the real column, `page_count` (phase 49). The harness read the parameter
// name back as though it were storage.
//
// The column set is derived here from the authorized migration files rather
// than restated, so it cannot drift: a column added by a later phase is picked
// up automatically, and a column that exists only in someone's memory is not.
//
// The second half matters as much as the first. A query error is not evidence
// about the job; it is the absence of evidence. The harness must keep saying so
// rather than letting `no rows` and `the query was invalid` collapse into one
// verdict — that collapse is what turns a broken diagnostic into "no job".
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");
const HARNESS = "scripts/rcap-hosted-acceptance-payment.mjs";

/** Migrations that create or extend packet_render_jobs, in apply order. */
const SCHEMA_FILES = [
  "supabase/phase-49-rcap-packet-render-jobs.sql",
  "supabase/phase-50-rcap-packet-delivery-hardening.sql",
  "supabase/phase-51-rcap-consumer-payment-gate.sql",
  "supabase/phase-52-rcap-consumer-payment-authority.sql",
  "supabase/phase-53-rcap-consumer-enqueue.sql",
  "supabase/phase-54-rcap-delivery-control.sql",
  "supabase/phase-55-rcap-matter-payment-binding.sql"
];

const read = (p) => {
  const full = path.join(rootDir, p);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
};

/**
 * Derive the real column set. Two shapes only: the CREATE TABLE body, and
 * `alter table … add column if not exists`. Function parameters (`p_*`) are
 * deliberately not a source — mistaking one for a column is the whole defect.
 */
function declaredColumns() {
  const columns = new Set();
  for (const file of SCHEMA_FILES) {
    const sql = read(file);
    if (!sql) continue;

    const create = sql.match(/create table if not exists public\.packet_render_jobs\s*\(([\s\S]*?)\n\);/);
    if (create) {
      for (const line of create[1].split("\n")) {
        const bare = line.trim();
        if (!bare || bare.startsWith("--") || /^(constraint|primary key|unique|check|foreign key|references)\b/i.test(bare)) continue;
        const name = bare.match(/^([a-z_][a-z0-9_]*)\s+/);
        if (name) columns.add(name[1]);
      }
    }
    for (const [, name] of sql.matchAll(/add column if not exists\s+([a-z_][a-z0-9_]*)/g)) columns.add(name);
  }
  return columns;
}

/**
 * Columns the harness selects from packet_render_jobs.
 *
 * Anchored by walking BACK from the table reference to the nearest preceding
 * `select`. Matching forward from the first `select` in the file spans hundreds
 * of lines of unrelated SQL and prose, and every stray word in them reads as a
 * column — a verifier that reports two dozen imaginary columns is not stricter,
 * it is broken, and nobody would trust its real finding.
 */
function selectedColumns(harness) {
  const table = harness.indexOf("from public.packet_render_jobs");
  if (table === -1) return null;
  const before = harness.slice(0, table);
  const selectAt = before.lastIndexOf("select ");
  if (selectAt === -1) return null;

  const body = before.slice(selectAt + "select ".length);
  const selected = new Set();
  for (const rawLine of body.split("\n")) {
    const line = rawLine.replace(/--.*$/, "").trim();
    if (!line) continue;
    for (let piece of line.split(",")) {
      piece = piece.trim();
      if (!piece) continue;
      // `left(coalesce(col, ''), 1000) as alias` — the real column is inside.
      const wrapped = piece.match(/^(?:[a-z_]+\s*\()+\s*([a-z_][a-z0-9_]*)/);
      if (wrapped) { selected.add(wrapped[1]); continue; }
      const plain = piece.match(/^([a-z_][a-z0-9_]*)$/);
      if (plain) selected.add(plain[1]);
    }
  }
  return selected;
}

function failures(harness) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  const columns = declaredColumns();
  fail(columns.size > 20, `only ${columns.size} columns were derived from the migrations; the schema contract is not being read`);
  fail(columns.has("page_count"), "page_count is not in the derived column set, so this verifier cannot police it");
  fail(!columns.has("output_page_count"),
    "output_page_count appears as a real column; if that ever becomes true this verifier's premise must be revisited");

  const selected = selectedColumns(harness);
  fail(selected !== null, "could not find the packet_render_jobs job read in the harness");
  if (selected) {
    for (const column of selected) {
      fail(columns.has(column),
        `the hosted job read selects "${column}", which packet_render_jobs does not have — the diagnostic will fail with 42703 and the run will be unable to say what happened to the job`);
    }
    // The page proof is meaningless without the column it compares against.
    fail(selected.has("page_count"),
      "the job read omits page_count, so the page proof has nothing authoritative to compare the rendered page count against");
  }

  // The page proof must read the stored column, not a parameter name.
  fail(/job\?\.page_count/.test(harness),
    "the page proof does not read job.page_count");
  fail(!/job\?\.output_page_count/.test(harness),
    "the page proof still reads job.output_page_count, which is a function parameter name and never a stored column");

  // A failed query is the absence of evidence, not evidence of absence.
  fail(/query_error/.test(harness),
    "the harness no longer distinguishes a failed job query from a missing job row");
  fail(/this is the diagnostic failing, NOT evidence that no job exists/.test(harness),
    "the harness no longer states that a query error is the diagnostic failing rather than proof the job is absent");

  return out;
}

const harness = read(HARNESS);
const base = failures(harness);

if (MUTATIONS) {
  if (base.length > 0) {
    console.error("baseline is not green; mutations would prove nothing:\n");
    for (const p of base) console.error(` - ${p}`);
    process.exit(1);
  }
  const M = [
    ["output_page_count substituted for page_count", (h) =>
      h.replace("           output_byte_count, page_count, container_digest,", "           output_byte_count, output_page_count, container_digest,")],
    ["output_byte_count substituted for page_count", (h) =>
      h.replace("           output_byte_count, page_count, container_digest,", "           output_byte_count, output_byte_count, container_digest,")],
    ["page_count omitted from the job read", (h) =>
      h.replace("           output_byte_count, page_count, container_digest,", "           output_byte_count, container_digest,")],
    ["a query error is reported as no job row", (h) => h.replace(/query_error/g, "no_job")],
    ["the harness stops distinguishing a broken diagnostic from an absent job", (h) =>
      h.replace("this is the diagnostic failing, NOT evidence that no job exists", "no job exists")],
    ["the page proof reads the function parameter name again", (h) =>
      h.replace("Number(job?.page_count ?? -1)", "Number(job?.output_page_count ?? -1)")],
    ["an invented column is added to the job read", (h) =>
      h.replace("           renderer_kind, renderer_version, route_id, source_sha256,", "           renderer_kind, renderer_version, route_id, source_sha256, worker_profile_digest,")]
  ];

  let undetected = 0;
  for (const [label, mutate] of M) {
    const mutated = mutate(harness);
    if (mutated === harness) { console.log(`MISSED   ${label} (anchor did not match)`); undetected += 1; continue; }
    let caught;
    try { caught = failures(mutated).length > base.length; } catch { caught = true; }
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-hosted-job-read-columns FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nThe hosted job read cannot select a column packet_render_jobs does not have (${M.length}/${M.length}).`);
  process.exit(0);
}

if (base.length > 0) {
  console.error(`verify-rcap-hosted-job-read-columns FAILED — ${base.length} problem(s):\n`);
  for (const p of base) console.error(` - ${p}`);
  process.exit(1);
}

const columns = declaredColumns();
const selected = selectedColumns(harness);
console.log("verify-rcap-hosted-job-read-columns passed.");
console.log(`  ${columns.size} packet_render_jobs columns derived from the authorized migrations, not restated.`);
console.log(`  ${selected.size} columns selected by the hosted job read; every one of them exists.`);
console.log("  page_count is the stored column; p_output_page_count is a function parameter and is never read back as storage.");
console.log("  A failed query stays distinguishable from a missing job row.");
