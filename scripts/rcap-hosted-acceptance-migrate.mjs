#!/usr/bin/env node
// Hosted acceptance staging — the hash-gated migration apply and readback.
//
// Applies the schema to the NAMED acceptance Supabase project and to nothing
// else. Every statement goes through the Management API's query endpoint, so
// this holds no database password and cannot be pointed at another host by
// changing a connection string: the project ref is the only address it has,
// and the workflow pins that.
//
// Two layers, deliberately different in strictness:
//
//   BASELINE — every supabase/*.sql file before phase 49, in phase order. These
//   are already live in production, carry no staging authorization record, and
//   exist here only so the acceptance project has the schema the application
//   expects. A baseline file that fails is recorded with its error and does not
//   stop the run; what stops the run is a REQUIRED table missing afterwards.
//
//   AUTHORIZED SEQUENCE — phases 49 through 54. Each file's SHA-256 is
//   recomputed from disk and must match BOTH independent records that carry it
//   (the prepared staging action and the authorization readiness file) before
//   ANY of the six is applied. One mismatch anywhere stops the run with nothing
//   from the sequence applied. Once applying starts, a single failure is fatal:
//   the six are indivisible, and an environment that stops at 51 reintroduces
//   RCAP-SEC-001 by construction.
//
// The readback is not a catalog tour. It ends with a live negative control that
// tries the exact forgery RCAP-SEC-001 described, as the role that would
// attempt it, against this database.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_DIR = path.join(rootDir, "hosted-acceptance-evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";

if (!SUPABASE_ACCESS_TOKEN || !/^[a-z]{20}$/.test(PROJECT_REF)) {
  console.error("MIGRATE: SUPABASE_ACCESS_TOKEN and a well-formed ACCEPTANCE_SUPABASE_PROJECT_REF are required");
  process.exit(1);
}

const verdicts = new Map();
function record(caseId, passed, observed) {
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

const REQUIRED_CASES = [
  "authorized_hashes_agree_across_both_records",
  "baseline_schema_present",
  "authorized_sequence_applied_in_order",
  "render_jobs_table_secured",
  "person_namespace_hardened",
  "payment_authority_functions_present",
  "legacy_enqueue_signature_dropped",
  "consumption_unit_keyed_on_item",
  "participant_cannot_self_declare_payment"
];

const sha256File = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex");

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON surfaces through text */ }
  return { ok: res.status >= 200 && res.status < 300, status: res.status, json, text };
}

/** One scalar out of a single-row single-column result. */
async function scalar(sql) {
  const r = await query(sql);
  if (!r.ok || !Array.isArray(r.json) || r.json.length === 0) return null;
  return Object.values(r.json[0])[0];
}

const evidence = {
  schemaVersion: "rcap-hosted-acceptance-migrate/v1",
  acceptanceProjectRef: PROJECT_REF,
  baseline: [],
  authorizedSequence: [],
  readback: {}
};

// --- 1. Hash gate: both records must agree, before anything is applied -------
const action = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-staging-action.json"), "utf8"));
const readiness = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-staging-authorization-readiness.json"), "utf8"));
const sequence = action.migrationsInApplyOrder;
{
  // The readiness file carries the same six hashes in a second, independently
  // maintained place. Requiring agreement means a single edited record cannot
  // wave a changed migration through.
  const secondOpinion = readiness.blockers?.find((b) => b.id === "RCAP-SEC-001")?.resolution?.migrationSha256 ?? {};
  const rows = sequence.map((entry) => {
    const onDisk = sha256File(entry.path);
    const fromAction = entry.sha256;
    const fromReadiness = secondOpinion[`phase-${entry.phase}`] ?? null;
    return {
      phase: entry.phase,
      path: entry.path,
      onDisk,
      matchesAction: onDisk === fromAction,
      matchesReadiness: fromReadiness !== null && onDisk === fromReadiness,
      authorizationId: entry.authorizationId
    };
  });
  const bad = rows.filter((row) => !row.matchesAction || !row.matchesReadiness);
  evidence.authorizedSequence = rows;
  record(
    "authorized_hashes_agree_across_both_records",
    bad.length === 0,
    bad.length === 0
      ? `all ${rows.length} migrations recomputed from disk match both the prepared staging action and the authorization readiness record`
      : `HASH DRIFT — refusing to apply anything: ${bad.map((r) => `phase ${r.phase} (action=${r.matchesAction}, readiness=${r.matchesReadiness})`).join(", ")}`
  );
  if (bad.length > 0) {
    fs.writeFileSync(path.join(EVIDENCE_DIR, "migrate.json"), `${JSON.stringify({ ...evidence, passed: false }, null, 2)}\n`);
    console.error("\nMIGRATE REFUSED — a migration on disk does not match its authorization record. Nothing was applied.");
    process.exit(1);
  }
}

// --- 2. Baseline: everything before phase 49, in phase order ----------------
{
  const files = fs.readdirSync(path.join(rootDir, "supabase"))
    .filter((name) => name.endsWith(".sql"))
    .filter((name) => !/^phase-(49|50|51|52|53|54)-/.test(name));

  // Deterministic order: the un-numbered schema file first, phases ascending
  // (with their letter suffixes in order), and the demo seed last because it
  // inserts rows into tables the phases create.
  const phaseKey = (name) => {
    const m = /^phase-(\d+)([a-z]*)-/.exec(name);
    if (!m) return name === "partner-journey-os.sql" ? [-2, "", name] : [999, "", name];
    return [Number(m[1]), m[2], name];
  };
  const ordered = files
    .filter((name) => name !== "partner-seed-demo.sql")
    .sort((a, b) => {
      const [an, as_, af] = phaseKey(a);
      const [bn, bs, bf] = phaseKey(b);
      return an - bn || as_.localeCompare(bs) || af.localeCompare(bf);
    })
    .concat(files.includes("partner-seed-demo.sql") ? ["partner-seed-demo.sql"] : []);

  for (const name of ordered) {
    const rel = `supabase/${name}`;
    const sql = fs.readFileSync(path.join(rootDir, rel), "utf8");
    const r = await query(sql);
    evidence.baseline.push({
      file: rel,
      sha256: sha256File(rel),
      applied: r.ok,
      // Truncated hard: a database error can echo a statement, and a statement
      // in the seed file can contain values. The full text is never kept.
      error: r.ok ? null : String(r.json?.message ?? r.text).slice(0, 300)
    });
    console.log(`    ${r.ok ? "applied " : "skipped "} ${rel}${r.ok ? "" : ` — ${String(r.json?.message ?? r.text).slice(0, 160)}`}`);
  }

  // The baseline is judged on its RESULT, not on how many files were clean.
  // These are the tables the acceptance journeys and the authorized sequence
  // both need; if one is missing, the baseline failed no matter what applied.
  const REQUIRED_BASELINE_TABLES = [
    "partner_records",
    "rcap_document_packets",
    "rcap_persons",
    "consumer_briefcase_items",
    "rcap_screening_sessions",
    "rcap_partner_entitlement"
  ];
  const missing = [];
  for (const table of REQUIRED_BASELINE_TABLES) {
    const present = await scalar(`select to_regclass('public.${table}') is not null as present`);
    if (present !== true && present !== "true") missing.push(table);
  }
  const failedFiles = evidence.baseline.filter((entry) => !entry.applied);
  record(
    "baseline_schema_present",
    missing.length === 0,
    missing.length === 0
      ? `${evidence.baseline.length - failedFiles.length}/${evidence.baseline.length} baseline files applied cleanly; all ${REQUIRED_BASELINE_TABLES.length} required tables exist${failedFiles.length > 0 ? ` (non-blocking failures: ${failedFiles.map((f) => path.basename(f.file)).join(", ")})` : ""}`
      : `required baseline table(s) missing after the baseline pass: ${missing.join(", ")}`
  );
  if (missing.length > 0) {
    fs.writeFileSync(path.join(EVIDENCE_DIR, "migrate.json"), `${JSON.stringify({ ...evidence, passed: false }, null, 2)}\n`);
    console.error("\nMIGRATE STOPPED — the baseline did not produce the schema the authorized sequence builds on. Phases 49-54 were NOT applied.");
    process.exit(1);
  }
}

// --- 3. The authorized six, in order, indivisibly ---------------------------
{
  let applied = 0;
  let failure = null;
  for (const entry of sequence) {
    const sql = fs.readFileSync(path.join(rootDir, entry.path), "utf8");
    const r = await query(sql);
    const row = evidence.authorizedSequence.find((candidate) => candidate.phase === entry.phase);
    row.applied = r.ok;
    row.error = r.ok ? null : String(r.json?.message ?? r.text).slice(0, 400);
    if (!r.ok) { failure = `phase ${entry.phase} failed: ${row.error}`; break; }
    applied += 1;
    console.log(`    applied phase ${entry.phase} (${entry.authorizationId})`);
  }
  record(
    "authorized_sequence_applied_in_order",
    applied === sequence.length,
    applied === sequence.length
      ? `49 -> 50 -> 51 -> 52 -> 53 -> 54 applied in order to ${PROJECT_REF} (${applied}/${sequence.length}), each hash-gated against both records`
      : `${failure} — applied ${applied}/${sequence.length}; the sequence is indivisible, so this environment must not serve a participant`
  );
}

// --- 4. Readback -------------------------------------------------------------
{
  const rlsOn = async (table) => scalar(
    `select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = '${table}'`
  );
  const truthy = (value) => value === true || value === "true" || value === "t";

  {
    const exists = await scalar(`select to_regclass('public.rcap_packet_render_jobs') is not null`);
    const rls = await rlsOn("rcap_packet_render_jobs");
    const browserGrants = await scalar(
      `select count(*)::int from information_schema.role_table_grants
       where table_schema = 'public' and table_name = 'rcap_packet_render_jobs' and grantee in ('anon','authenticated')`
    );
    const pass = truthy(exists) && truthy(rls) && Number(browserGrants) === 0;
    record(
      "render_jobs_table_secured",
      pass,
      `rcap_packet_render_jobs exists=${truthy(exists)}, rowsecurity=${truthy(rls)}, anon/authenticated table grants=${browserGrants} (must be 0)`
    );
    evidence.readback.renderJobs = { exists: truthy(exists), rls: truthy(rls), browserGrants: Number(browserGrants) };
  }

  {
    const rls = await rlsOn("rcap_persons");
    const browserGrants = await scalar(
      `select count(*)::int from information_schema.role_table_grants
       where table_schema = 'public' and table_name = 'rcap_persons' and grantee in ('anon','authenticated')`
    );
    const trigger = await scalar(
      `select count(*)::int from pg_trigger t join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = 'partner_records' and not t.tgisinternal`
    );
    const pass = truthy(rls) && Number(browserGrants) === 0 && Number(trigger) > 0;
    record(
      "person_namespace_hardened",
      pass,
      `phase 54 on the hosted project: rcap_persons rowsecurity=${truthy(rls)}, anon/authenticated grants=${browserGrants} (must be 0), partner_records guard triggers=${trigger} (must be > 0)`
    );
    evidence.readback.personNamespace = { rls: truthy(rls), browserGrants: Number(browserGrants), triggers: Number(trigger) };
  }

  {
    const rows = await query(
      `select p.proname, p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname in ('record_consumer_packet_payment','finalize_packet_render_job','enqueue_packet_render_job')`
    );
    const found = Array.isArray(rows.json) ? rows.json : [];
    const byName = (name) => found.filter((r) => r.proname === name);
    const definer = (name) => byName(name).every((r) => truthy(r.prosecdef)) && byName(name).length > 0;
    const pass = definer("record_consumer_packet_payment") && definer("finalize_packet_render_job") && byName("enqueue_packet_render_job").length > 0;
    record(
      "payment_authority_functions_present",
      pass,
      `record_consumer_packet_payment=${byName("record_consumer_packet_payment").length} (security definer ${definer("record_consumer_packet_payment")}), finalize_packet_render_job=${byName("finalize_packet_render_job").length} (security definer ${definer("finalize_packet_render_job")}), enqueue_packet_render_job=${byName("enqueue_packet_render_job").length}`
    );
    evidence.readback.functions = found;
  }

  {
    // Phase 53 drops the 13-argument enqueue. Its survival would mean the gate
    // is bound to a signature phase 52 no longer authorizes.
    const thirteen = await scalar(
      `select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'enqueue_packet_render_job' and p.pronargs = 13`
    );
    record(
      "legacy_enqueue_signature_dropped",
      Number(thirteen) === 0,
      `13-argument enqueue_packet_render_job overloads remaining: ${thirteen} (phase 53 must leave 0)`
    );
    evidence.readback.legacyEnqueueOverloads = Number(thirteen);
  }

  {
    // G11: the consumption unit must be keyed on the item/receipt/matter, not
    // on the job id — otherwise one $50 purchase authorizes unlimited packets.
    const indexes = await query(
      `select indexname, indexdef from pg_indexes
       where schemaname = 'public' and indexdef ilike '%unique%'
         and (tablename ilike '%consumption%' or tablename ilike '%payment%' or tablename ilike '%ledger%')`
    );
    const defs = Array.isArray(indexes.json) ? indexes.json : [];
    const keyedOnItem = defs.some((row) => /item_id|receipt|matter/i.test(String(row.indexdef)));
    const keyedOnJobOnly = defs.some((row) => /\(\s*job_id\s*\)/i.test(String(row.indexdef)));
    record(
      "consumption_unit_keyed_on_item",
      keyedOnItem && !keyedOnJobOnly,
      keyedOnItem && !keyedOnJobOnly
        ? `a unique consumption-unit index keyed on the item/receipt/matter is present and no job-id-only unique index remains (${defs.length} unique index(es) inspected)`
        : `G11 shape not confirmed on the hosted project: keyedOnItem=${keyedOnItem}, jobIdOnlyIndexPresent=${keyedOnJobOnly}, indexes=${defs.map((d) => d.indexname).join(", ") || "none"}`
    );
    evidence.readback.consumptionUnitIndexes = defs.map((d) => ({ name: d.indexname, def: String(d.indexdef).slice(0, 240) }));
  }

  {
    // The live negative control. This is the exact forgery RCAP-SEC-001
    // described, attempted as the role that would attempt it, against this
    // database. A catalog assertion can be satisfied by a policy that does not
    // bite; this cannot.
    const probe = await query(`
      do $$
      declare
        probe_user uuid := gen_random_uuid();
        probe_item uuid;
        forged boolean := false;
      begin
        insert into public.consumer_briefcase_items (user_id, item_type, jurisdiction, summary, payment_status)
        values (probe_user, 'result', 'MS', 'hosted acceptance negative control', 'unpaid')
        returning id into probe_item;

        begin
          set local role authenticated;
          update public.consumer_briefcase_items set payment_status = 'paid' where id = probe_item;
          if found then forged := true; end if;
        exception when others then
          forged := false;
        end;
        reset role;

        if forged or exists (select 1 from public.consumer_briefcase_items where id = probe_item and payment_status = 'paid') then
          delete from public.consumer_briefcase_items where id = probe_item;
          raise exception 'RCAP-SEC-001 REPRODUCED ON THE HOSTED ACCEPTANCE PROJECT';
        end if;

        delete from public.consumer_briefcase_items where id = probe_item;
      end $$;
    `);
    const reproduced = !probe.ok && /RCAP-SEC-001 REPRODUCED/.test(String(probe.json?.message ?? probe.text));
    record(
      "participant_cannot_self_declare_payment",
      probe.ok,
      probe.ok
        ? "a row was inserted unpaid, the authenticated role's attempt to set payment_status='paid' on it did not take effect, and the probe row was removed — the RCAP-SEC-001 forgery does not reproduce here"
        : reproduced
          ? "CRITICAL: the forgery SUCCEEDED against the hosted acceptance project"
          : `the negative control could not be executed: ${String(probe.json?.message ?? probe.text).slice(0, 300)}`
    );
    evidence.readback.negativeControl = { executed: probe.ok, reproduced };
  }
}

// --- verdict -----------------------------------------------------------------
{
  const missing = REQUIRED_CASES.filter((caseId) => !verdicts.has(caseId));
  const failed = [...verdicts.entries()].filter(([, v]) => !v.passed).map(([caseId]) => caseId);
  evidence.requiredCases = REQUIRED_CASES;
  evidence.missingCases = missing;
  evidence.failedCases = failed;
  evidence.passed = missing.length === 0 && failed.length === 0;
  fs.writeFileSync(path.join(EVIDENCE_DIR, "migrate.json"), `${JSON.stringify(evidence, null, 2)}\n`);

  console.log("");
  if (missing.length > 0) console.error(`MIGRATE INCOMPLETE — no verdict registered for: ${missing.join(", ")}`);
  if (failed.length > 0) console.error(`MIGRATE FAILED — ${failed.join(", ")}`);
  if (evidence.passed) console.log(`MIGRATE PASSED — ${REQUIRED_CASES.length}/${REQUIRED_CASES.length} cases; 49-54 are applied and enforcing on ${PROJECT_REF}.`);
  process.exit(evidence.passed ? 0 : 1);
}
