#!/usr/bin/env node
// Applies the Lane B Grade-A migration proposal to a scratch database and runs
// its behaviour assertions.
//
//   node scripts/verify-rcap-grade-a-fulfillment-db-proposal.mjs
//   GRADE_A_PG="postgres://user@host:5432" node scripts/verify-rcap-grade-a-fulfillment-db-proposal.mjs
//
// The proposal is unnumbered and unapplied, which is exactly why it needs this:
// unvalidated SQL that nobody has run is a liability sitting in a docs
// directory, and "it looks right" is not a review. Running it found a real
// ordering bug on the first attempt — a function referenced before it was
// defined, which Postgres rejects at creation time.
//
// It creates and drops a throwaway database and touches nothing else. Where no
// server is reachable it SKIPS rather than fails: this is a proposal gate, not a
// product gate, and a machine without Postgres has not proven the SQL wrong.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const PROPOSAL = "docs/rcap/grade-a/migration-proposals/lane-b/grade-a-fulfillment-authority.sql";
const ASSERTIONS = "data/rcap-lane-b/grade-a-authority-db-behaviour.sql";
const DATABASE = "rcap_grade_a_proposal_check";

for (const rel of [PROPOSAL, ASSERTIONS]) {
  if (!fs.existsSync(path.join(rootDir, rel))) {
    console.error(`Missing ${rel}.`);
    process.exit(1);
  }
}

/** psql connection arguments, from an explicit URL or a discoverable local socket. */
function connection() {
  if (process.env.GRADE_A_PG) return ["-d", process.env.GRADE_A_PG];
  const host = process.env.PGHOST ?? "/var/run/postgresql";
  const port = process.env.PGPORT ?? "5432";
  const user = process.env.PGUSER ?? "postgres";
  return ["-h", host, "-p", port, "-U", user];
}

const base = connection();

function psql(args, { database, input, quiet = true } = {}) {
  const argv = [...base];
  if (database) argv.push("-d", database);
  if (quiet) argv.push("-q");
  argv.push("-v", "ON_ERROR_STOP=1", ...args);
  return execFileSync("psql", argv, { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"] });
}

try {
  psql(["-tAc", "select 1"]);
} catch (error) {
  console.log("SKIPPED: no reachable PostgreSQL server.");
  console.log("  Set GRADE_A_PG, or PGHOST/PGPORT/PGUSER, to validate the proposal.");
  console.log(`  (${String(error?.message ?? error).split("\n")[0]})`);
  process.exit(0);
}

let created = false;
try {
  psql(["-tAc", `drop database if exists ${DATABASE}`]);
  psql(["-tAc", `create database ${DATABASE}`]);
  created = true;

  // The proposal revokes from anon and authenticated, which Supabase provides
  // and a bare cluster does not. Created here so the proposal applies unchanged
  // rather than being edited to suit the test.
  for (const role of ["anon", "authenticated"]) {
    try { psql(["-tAc", `create role ${role}`]); } catch { /* already present cluster-wide */ }
  }

  psql(["-f", PROPOSAL], { database: DATABASE });
  const output = psql(["-tA", "-f", ASSERTIONS], { database: DATABASE, quiet: false });
  const passed = output.includes("ALL DATABASE BEHAVIOUR ASSERTIONS PASSED");
  if (!passed) {
    console.error("The proposal applied but its behaviour assertions did not report success:");
    console.error(output.trim().split("\n").slice(-10).join("\n"));
    process.exit(1);
  }
  console.log("Grade-A migration proposal: applies cleanly and every behaviour assertion passed.");
  console.log(`  proposal:   ${PROPOSAL}`);
  console.log(`  assertions: ${ASSERTIONS}`);
} catch (error) {
  const detail = String(error?.stderr ?? error?.message ?? error).trim();
  console.error("The Grade-A migration proposal failed:");
  console.error(detail.split("\n").slice(-12).join("\n"));
  process.exit(1);
} finally {
  if (created) {
    try { psql(["-tAc", `drop database if exists ${DATABASE}`]); } catch { /* leave it for inspection */ }
  }
}
