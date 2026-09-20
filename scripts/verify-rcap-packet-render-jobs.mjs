await import("./verify-rcap-il-delivery-binding.mjs");
// Verifies the phase-49 durable render job contract and artifact-gated credit
// movement by applying the migration to a throwaway PostgreSQL cluster and
// running the behavioural assertions in
// supabase/tests/phase-49-packet-render-jobs.test.sql.
//
// The invariant under test is the one that protects a partner's finite
// sponsored allocation: credit cannot move unless a render job reached
// artifact_validated with stored bytes and a checksum.
//
// This verifier does not skip itself. If PostgreSQL is unavailable it fails,
// because a green check that silently tested nothing is worse than a red one.
// Set RCAP_SKIP_PG_VERIFIER=1 only for a local run where you accept the gap;
// CI must never set it.
//
// It never touches a remote database. It initialises a cluster under a
// temporary directory, runs, and tears it down.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION = path.join(rootDir, "supabase/phase-49-rcap-packet-render-jobs.sql");
const FIXTURE = path.join(rootDir, "data/rcap-render/state-machine.json");
const TESTS = path.join(rootDir, "supabase/tests/phase-49-packet-render-jobs.test.sql");
const PORT = process.env.RCAP_PG_TEST_PORT || "55499";

if (process.env.RCAP_SKIP_PG_VERIFIER === "1") {
  console.error("RCAP_SKIP_PG_VERIFIER=1 set: refusing to report a pass without running.");
  process.exit(1);
}

function which(binary) {
  const res = spawnSync("sh", ["-c", `command -v ${binary}`], { encoding: "utf8" });
  return res.status === 0 ? res.stdout.trim() : null;
}

// Locate the server binaries, which are not usually on PATH even when psql is.
function findPgBin(name) {
  const direct = which(name);
  if (direct) return direct;
  const roots = ["/usr/lib/postgresql", "/usr/local/pgsql", "/opt/homebrew/opt"];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root)) {
      const candidate = path.join(root, entry, "bin", name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

const psql = which("psql");
const initdb = findPgBin("initdb");
const pgCtl = findPgBin("pg_ctl");

if (!psql || !initdb || !pgCtl) {
  console.error("PostgreSQL is required by this verifier and was not found.");
  console.error(`  psql:   ${psql ?? "missing"}`);
  console.error(`  initdb: ${initdb ?? "missing"}`);
  console.error(`  pg_ctl: ${pgCtl ?? "missing"}`);
  process.exit(1);
}

// The server refuses to run as root, and the socket path must stay under the
// 107-byte sun_path limit, so both live at a short path owned by a real user.
const isRoot = process.getuid && process.getuid() === 0;
const runAs = isRoot ? (spawnSync("id", ["-u", "postgres"]).status === 0 ? "postgres" : null) : null;
if (isRoot && !runAs) {
  console.error("Running as root and no 'postgres' user exists to drop privileges to.");
  process.exit(1);
}

const dataDir = fs.mkdtempSync(path.join("/tmp", "rcap-pgd-"));
const sockDir = fs.mkdtempSync(path.join("/tmp", "rcap-pgs-"));

function sh(command, { quiet = true } = {}) {
  const res = spawnSync("sh", ["-c", command], { encoding: "utf8" });
  if (!quiet && res.stdout) process.stdout.write(res.stdout);
  return res;
}

function asUser(command) {
  return runAs ? `su ${runAs} -c ${JSON.stringify(command)}` : command;
}

let started = false;
function teardown() {
  if (started) sh(asUser(`${pgCtl} -D ${dataDir} -m immediate stop`));
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.rmSync(sockDir, { recursive: true, force: true });
}
process.on("exit", teardown);

if (runAs) {
  sh(`chown ${runAs} ${dataDir} ${sockDir}`);
}

let step = sh(asUser(`${initdb} -D ${dataDir} -U postgres --auth=trust`));
if (step.status !== 0) {
  console.error("initdb failed:");
  console.error(step.stderr?.trim().slice(0, 1200));
  process.exit(1);
}

step = sh(
  asUser(
    `${pgCtl} -D ${dataDir} -o '-p ${PORT} -k ${sockDir} -c listen_addresses=' -l ${dataDir}/log start -w -t 30`
  )
);
if (step.status !== 0) {
  console.error("pg_ctl start failed:");
  console.error(step.stderr?.trim().slice(0, 1200));
  console.error(fs.existsSync(`${dataDir}/log`) ? fs.readFileSync(`${dataDir}/log`, "utf8").slice(-1200) : "");
  process.exit(1);
}
started = true;

const PSQL = `${psql} -h ${sockDir} -p ${PORT} -U postgres -v ON_ERROR_STOP=1 -q`;

// Minimal stand-ins for the tables phase 49 references. Creating only the
// referenced keys keeps the verifier independent of unrelated migrations.
// service_role exists in Supabase but not in a bare cluster; the RLS policies
// reference it by name, so it has to be present for the migration to apply.
step = sh(
  `${PSQL} -c "create role service_role; create table public.partner_records(partner_slug text primary key); create table public.rcap_document_packets(id uuid primary key default gen_random_uuid());"`
);
if (step.status !== 0) {
  console.error("prerequisite stub creation failed:");
  console.error(step.stderr?.trim().slice(0, 1200));
  process.exit(1);
}

step = sh(`${PSQL} -f ${MIGRATION}`);
if (step.status !== 0) {
  console.error("phase-49 migration failed to apply:");
  console.error(step.stderr?.trim().slice(0, 2000));
  process.exit(1);
}

step = sh(`${PSQL} -f ${TESTS}`);
if (step.status !== 0) {
  console.error("phase-49 behavioural tests failed:");
  console.error(step.stderr?.trim().slice(0, 2000));
  process.exit(1);
}

// Mutation check. If the artifact gate is removed the suite must go red; a
// suite that passes without the gate is not testing the thing it claims to.
const stripGate = `
create or replace function public.consume_rcap_packet_credit(
  p_partner_slug text, p_matter_id text, p_render_job_id uuid)
returns table (ok boolean, reason text, consumption_class text, units_used integer)
language plpgsql security definer set search_path='' as $$
begin
  insert into public.rcap_packet_credit_consumptions
    (partner_slug, matter_id, render_job_id, consumption_class)
  values (p_partner_slug, p_matter_id, p_render_job_id, 'included')
  on conflict do nothing;
  return query select true, 'consumed'::text, 'included'::text, 1;
end $$;`;

fs.writeFileSync(path.join(sockDir, "mutate.sql"), stripGate, "utf8");
sh(`${PSQL} -f ${path.join(sockDir, "mutate.sql")}`);
const mutated = sh(`${PSQL} -f ${TESTS}`);
if (mutated.status === 0) {
  console.error(
    "Mutation survived: the suite passes with the artifact_validated gate removed, so it does not actually enforce it."
  );
  process.exit(1);
}

// The engine branch carries src/lib/rcap/render/job-contract.ts, which encodes
// this same state machine in TypeScript. The two branches never read each
// other; both verify against data/rcap-render/state-machine.json, so the SQL
// and the TypeScript cannot drift apart while they live separately.
{
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  const sqlText = fs.readFileSync(MIGRATION, "utf8");
  const problems = [];

  const caseBlock = /allowed := case old\.status([\s\S]*?)end;/.exec(sqlText);
  if (!caseBlock) {
    problems.push("could not locate the transition CASE block");
  } else {
    const sqlTransitions = {};
    for (const m of caseBlock[1].matchAll(/when\s+'([a-z_]+)'\s+then\s+array\[([^\]]*)\]/g)) {
      sqlTransitions[m[1]] = [...m[2].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
    }
    const sqlFrom = Object.keys(sqlTransitions).sort();
    const fixFrom = Object.keys(fixture.transitions).sort();
    if (JSON.stringify(sqlFrom) !== JSON.stringify(fixFrom)) {
      problems.push(`transition source states differ: sql=[${sqlFrom}] fixture=[${fixFrom}]`);
    } else {
      for (const from of fixFrom) {
        const a = JSON.stringify(sqlTransitions[from]);
        const b = JSON.stringify([...fixture.transitions[from]].sort());
        if (a !== b) problems.push(`transitions from '${from}' differ: sql=${a} fixture=${b}`);
      }
    }
  }

  const statusCheck = /packet_render_jobs_status_check check \(\s*status in \(([\s\S]*?)\)\s*\)/.exec(sqlText);
  if (statusCheck) {
    const sqlStatuses = [...statusCheck[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
    if (JSON.stringify(sqlStatuses) !== JSON.stringify([...fixture.statuses].sort())) {
      problems.push("status check constraint does not match the fixture");
    }
  } else {
    problems.push("status check constraint not found");
  }

  const codeCheck = /packet_render_jobs_error_code_check check \(([\s\S]*?)\n  \),/.exec(sqlText);
  if (codeCheck) {
    const sqlCodes = [...codeCheck[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
    if (JSON.stringify(sqlCodes) !== JSON.stringify([...fixture.errorCodes].sort())) {
      problems.push("error code constraint does not match the fixture");
    }
  } else {
    problems.push("error code constraint not found");
  }

  if (problems.length > 0) {
    console.error("phase-49 SQL has drifted from data/rcap-render/state-machine.json:");
    for (const p of problems) console.error(`- ${p}`);
    process.exit(1);
  }
}

console.log("RCAP packet render jobs verification passed.");
console.log("- phase-49 applies cleanly to a fresh PostgreSQL cluster");
console.log("- a job is born queued and duplicate live jobs for identical inputs are refused");
console.log("- the status machine rejects a jump straight to a creditable state");
console.log("- artifact_validated is unreachable without a stored path and checksum");
console.log("- credit is refused while a job is not validated");
console.log("- credit moves exactly once per matter; retries report already_consumed");
console.log("- the continuity reserve engages after allocation and is finite");
console.log("- a partner with no allocation row fails closed");
console.log("- claims are atomic and never cross renderer kinds");
console.log("- removing the gate turns the suite red (mutation killed)");
console.log("- SQL state machine matches data/rcap-render/state-machine.json");
