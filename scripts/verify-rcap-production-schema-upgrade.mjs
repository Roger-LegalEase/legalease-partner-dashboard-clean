#!/usr/bin/env node
// Proves the forward-only Production schema upgrade still does what it claims:
// starting from the recovered Production baseline and applying only the committed
// forward migrations reaches the accepted repository schema exactly, does it the
// same way twice, and never weakens the security posture on the way.
//
// Nothing here connects to Supabase. Every database is local and disposable.
//
//   node scripts/verify-rcap-production-schema-upgrade.mjs
//
// The replay builds three databases on a local PostgreSQL 17 cluster, so a full run
// takes a few minutes. Static checks run first and fail fast.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lab = path.join(root, "scripts", "rcap-schema-upgrade-lab.sh");
const migrationsDir = path.join(root, "supabase", "migrations");

const BASELINE = "20260728213131_remote_schema.sql";
const BASELINE_BYTES = 177_074;
const BASELINE_SHA256 = "3d8695920577a2982ce4748839d091e987fa43baac917c97e2a79ba6a55f2452";

/** Every forward step, in the order they must run. */
const FORWARD_CHAIN = [
  "20260818200000_rcap_upgrade_00_roles.sql",
  "20260818201000_rcap_upgrade_01_tables_and_columns.sql",
  "20260818202000_rcap_upgrade_02_functions.sql",
  "20260818203000_rcap_upgrade_03_constraints_and_indexes.sql",
  "20260818204000_rcap_upgrade_04_views.sql",
  "20260818205000_rcap_upgrade_05_triggers.sql",
  "20260818206000_rcap_upgrade_06_rls_and_policies.sql",
  "20260818207000_rcap_upgrade_07_grants.sql",
  "20260818208000_rcap_upgrade_08_storage_buckets.sql",
];

// A destructive operation is not banned outright — it is banned until somebody has
// written down which statement it is and why it is safe. Each entry pins the exact
// normalized statement, so a new destructive statement cannot hide behind an
// existing disposition.
const REVIEWED_DESTRUCTIVE_DISPOSITIONS = [
  {
    file: "20260818203000_rcap_upgrade_03_constraints_and_indexes.sql",
    statement:
      'alter table "public"."rcap_intake_sessions" drop constraint "rcap_intake_sessions_eligibility_signal_check";',
    why: "re-added in the same step accepting 9 values instead of 5, so no existing row can be rejected",
  },
  {
    file: "20260818203000_rcap_upgrade_03_constraints_and_indexes.sql",
    statement:
      'alter table "public"."rcap_record_events" drop constraint "rcap_record_events_record_type_check";',
    why: "re-added in the same step accepting 5 values instead of 2, so no existing row can be rejected",
  },
];

// A browser role gaining access to a table Production already has is the change most
// worth catching, so it is banned unless it is written down here, pinned to the exact
// table, grantee and privilege. RLS is what actually decides which rows that role can
// reach, and every_browser_reachable_table_has_rls proves RLS is still on.
const REVIEWED_BROWSER_GRANTS = [
  {
    table: "rcap_record_events",
    grantee: "authenticated",
    privileges: ["INSERT", "SELECT"],
    why:
      "supabase/phase-28-rcap-record-audit-trail.sql revokes everything from anon and " +
      "authenticated and then grants exactly SELECT and INSERT. The table has row level " +
      "security enabled AND forced with no permissive policy, so the grant exposes no row; " +
      "UPDATE and DELETE are additionally blocked by triggers.",
  },
];

const BANNED = [
  /\bdrop\s+table\b/i,
  /\bdrop\s+schema\b/i,
  /\bdrop\s+database\b/i,
  /\btruncate\b(?!\s*(,|\)|\s+on\b))/i,
  /\bdrop\s+column\b/i,
  /\bdrop\s+policy\b/i,
  /\bdisable\s+row\s+level\s+security\b/i,
  /\bno\s+force\s+row\s+level\s+security\b/i,
  /\bdrop\s+constraint\b/i,
  /\bdrop\s+function\b/i,
  /\bdrop\s+view\b/i,
  /\bdrop\s+trigger\b/i,
  /\bdrop\s+index\b/i,
];

const failures = [];
const check = (name, fn) => {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`  FAIL ${name}`);
    console.log(`         ${error.message.split("\n")[0]}`);
  }
};

const sh = (args, options = {}) =>
  execFileSync("bash", [lab, ...args], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, ...options });

// --- static checks ----------------------------------------------------------

check("recovered_baseline_is_untouched", () => {
  const payload = readFileSync(path.join(migrationsDir, BASELINE));
  assert.equal(payload.byteLength, BASELINE_BYTES, "baseline byte length changed");
  assert.equal(
    createHash("sha256").update(payload).digest("hex"),
    BASELINE_SHA256,
    "baseline payload changed; the upgrade's starting point must stay the validated payload",
  );
});

check("forward_chain_is_exactly_the_committed_migrations", () => {
  const onDisk = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  assert.deepEqual(onDisk, [BASELINE, ...FORWARD_CHAIN].sort(), "migration set changed");
  const versions = FORWARD_CHAIN.map((f) => f.slice(0, 14));
  assert.deepEqual([...versions].sort(), versions, "forward steps are not in ascending version order");
  assert.ok(versions.every((v) => v > "20260728213131"), "a forward step sorts before the baseline");
});

check("no_unreviewed_destructive_operation", () => {
  const normalize = (s) => s.replace(/\s+/g, " ").trim();
  const allowed = new Set(
    REVIEWED_DESTRUCTIVE_DISPOSITIONS.map((d) => `${d.file} ${normalize(d.statement)}`),
  );
  const seen = new Set();
  for (const file of FORWARD_CHAIN) {
    const text = readFileSync(path.join(migrationsDir, file), "utf8");
    const body = text
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    for (const raw of body.split(";")) {
      const statement = normalize(raw);
      if (!statement) continue;
      if (!BANNED.some((pattern) => pattern.test(statement))) continue;
      const key = `${file} ${statement};`;
      assert.ok(
        allowed.has(key),
        `destructive statement with no reviewed disposition in ${file}:\n    ${statement.slice(0, 200)}`,
      );
      seen.add(key);
    }
  }
  assert.equal(
    seen.size,
    allowed.size,
    "a reviewed destructive disposition no longer matches any statement; remove the stale entry",
  );
});

if (failures.length) {
  console.error(`\nverify-rcap-production-schema-upgrade FAILED\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}

// --- replay -----------------------------------------------------------------

console.log("  ..   building baseline, target and two upgrade replays (a few minutes)");
sh(["build", "baseline", "verify_base"], { stdio: "pipe" });
sh(["build", "stacked", "verify_target"], { stdio: "pipe" });
sh(["build", "upgrade", "verify_up1"], { stdio: "pipe" });
sh(["build", "upgrade", "verify_up2"], { stdio: "pipe" });

const catalog = (db) => sh(["catalog", db], { stdio: ["pipe", "pipe", "pipe"] });
const digest = (text) => createHash("sha256").update(text).digest("hex");

const baseCatalog = catalog("verify_base");
const targetCatalog = catalog("verify_target");
const up1 = catalog("verify_up1");
const up2 = catalog("verify_up2");

const parse = (text) => {
  const rows = new Map();
  for (const line of text.split("\n")) {
    if (!line) continue;
    const [cls, identity, ...rest] = line.split("\t");
    rows.set(`${cls} ${identity}`, rest.join("\t"));
  }
  return rows;
};
const baseRows = parse(baseCatalog);
const targetRows = parse(targetCatalog);
const upRows = parse(up1);

const firstDifference = (left, right) => {
  for (const [key, value] of left) {
    if (!right.has(key)) return `only in the target: ${key}`;
    if (right.get(key) !== value) return `differs: ${key}`;
  }
  for (const key of right.keys()) {
    if (!left.has(key)) return `only in the upgraded database: ${key}`;
  }
  return null;
};

check("replay_is_deterministic", () => {
  assert.equal(digest(up1), digest(up2), "two replays of the same chain produced different catalogs");
});

check("upgrade_reaches_the_accepted_target_schema", () => {
  const difference = firstDifference(targetRows, upRows);
  assert.equal(
    difference,
    null,
    `baseline plus the forward chain does not equal the accepted repository schema — ${difference}`,
  );
});

const state = (rows, cls) =>
  new Map([...rows].filter(([key]) => key.startsWith(`${cls} `)).map(([key, value]) => [key, value]));

check("rls_stays_enabled_everywhere_it_was", () => {
  for (const [key, value] of state(baseRows, "rls")) {
    const after = upRows.get(key);
    assert.ok(after, `a table lost its RLS record entirely: ${key}`);
    if (value.includes("enabled t")) {
      assert.ok(after.includes("enabled t"), `RLS was disabled on ${key}`);
    }
    if (value.includes("forced t")) {
      assert.ok(after.includes("forced t"), `forced RLS was removed on ${key}`);
    }
  }
});

check("every_browser_reachable_table_has_rls", () => {
  const exposed = new Set();
  for (const key of upRows.keys()) {
    if (!key.startsWith("grant.relation ")) continue;
    const identity = key.split(" ")[1];
    const parts = identity.split(".");
    const grantee = parts[parts.length - 2];
    if (grantee === "anon" || grantee === "authenticated" || grantee === "PUBLIC") {
      exposed.add(parts.slice(0, parts.length - 2).join("."));
    }
  }
  for (const name of exposed) {
    const rls = upRows.get(`rls ${name}`);
    if (rls === undefined) continue; // views and sequences carry no RLS of their own
    assert.ok(
      rls.includes("enabled t"),
      `${name} is reachable by a browser role but has row level security disabled`,
    );
  }
});

check("no_baseline_policy_was_dropped_or_weakened", () => {
  for (const [key, value] of state(baseRows, "policy")) {
    assert.equal(upRows.get(key), value, `policy changed or disappeared: ${key}`);
  }
});

check("no_unreviewed_browser_grant_on_a_table_the_baseline_already_had", () => {
  const baselineTables = new Set(
    [...state(baseRows, "table")].map(([key]) => key.split(" ")[1]),
  );
  const allowed = new Map(
    REVIEWED_BROWSER_GRANTS.map((g) => [`${g.table}.${g.grantee}`, new Set(g.privileges)]),
  );
  const used = new Set();
  for (const key of upRows.keys()) {
    if (!key.startsWith("grant.relation ") || baseRows.has(key)) continue;
    const parts = key.split(" ")[1].split(".");
    const privilege = parts[parts.length - 1];
    const grantee = parts[parts.length - 2];
    const table = parts.slice(0, parts.length - 2).join(".");
    if (!baselineTables.has(table)) continue;
    if (grantee !== "anon" && grantee !== "authenticated" && grantee !== "PUBLIC") continue;
    const disposition = allowed.get(`${table}.${grantee}`);
    assert.ok(
      disposition?.has(privilege),
      `the chain grants ${grantee} ${privilege} on the pre-existing table ${table} with no reviewed disposition`,
    );
    used.add(`${table}.${grantee}`);
  }
  for (const key of allowed.keys()) {
    assert.ok(used.has(key), `reviewed browser grant ${key} no longer happens; remove the stale entry`);
  }
});

check("storage_stays_private", () => {
  for (const [key, value] of state(upRows, "storage.bucket")) {
    assert.ok(value.includes("public false"), `${key} is not private`);
  }
  for (const [key, value] of state(baseRows, "storage.rls")) {
    assert.equal(upRows.get(key), value, `storage RLS state changed on ${key}`);
  }
});

if (failures.length) {
  console.error(`\nverify-rcap-production-schema-upgrade FAILED\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}

console.log(
  `\nverify-rcap-production-schema-upgrade passed: ` +
    `${FORWARD_CHAIN.length} forward steps, ${targetRows.size} catalog definitions matched, ` +
    `replay catalog sha256 ${digest(up1)}`,
);
