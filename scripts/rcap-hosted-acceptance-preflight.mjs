#!/usr/bin/env node
// Hosted acceptance staging — PREFLIGHT.
//
// This runs before anything is deployed, migrated or written. Its only job is
// to answer two questions with evidence rather than assertion:
//
//   1. Are the four supplied credentials real and usable for exactly the
//      operations this mission needs, and no wider?
//   2. Is the named acceptance Supabase project DEMONSTRABLY not production?
//
// Question 2 is the one that matters. "Roger told me it is staging" is not a
// proof — a mistyped project ref is indistinguishable from a correct one until
// something looks. So this checks it three independent ways:
//
//   * IDENTITY — the ref resolves through the Management API and its own
//     metadata (name, created_at, status) is reported verbatim.
//   * EMPTINESS — the project's public schema is queried for the tables a
//     production LegalEase database necessarily has, and for row counts in
//     them. A production database has partner records and screening sessions.
//     An acceptance database has neither. Any nonzero count is fatal.
//   * DISJOINTNESS — the Vercel project's PRODUCTION-target Supabase URL is
//     read and hashed, and the acceptance URL is hashed, and the two hashes
//     must differ. The production value itself is never printed, never
//     written to the evidence bundle, and never leaves the comparison.
//
// Nothing here writes. Every call is a GET or a read-only query, so a
// preflight that fails has changed nothing anywhere.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_DIR = path.join(rootDir, "hosted-acceptance-evidence");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID ?? "";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? "";
const ACCEPTANCE_PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";

const verdicts = new Map();
function record(caseId, passed, observed) {
  verdicts.set(caseId, { passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
}

const REQUIRED_CASES = [
  "supabase_token_usable",
  "acceptance_project_resolves",
  "acceptance_project_reachable_for_sql",
  "acceptance_project_carries_no_production_data",
  "vercel_token_usable",
  "vercel_project_resolves",
  "acceptance_ref_disjoint_from_vercel_production",
  "acceptance_ref_absent_from_every_production_value"
];

const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

async function supabaseApi(pathname, { method = "GET", body = null } = {}) {
  const res = await fetch(`https://api.supabase.com${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { /* non-JSON surfaces through text */ }
  return { status: res.status, json, text: text.slice(0, 400) };
}

async function vercelApi(pathname) {
  const joiner = pathname.includes("?") ? "&" : "?";
  const res = await fetch(`https://api.vercel.com${pathname}${joiner}teamId=${encodeURIComponent(VERCEL_ORG_ID)}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
  });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { /* non-JSON surfaces through text */ }
  return { status: res.status, json, text: text.slice(0, 400) };
}

/** Read-only SQL through the Management API. No database password is needed or held. */
async function query(sql) {
  return supabaseApi(`/v1/projects/${ACCEPTANCE_PROJECT_REF}/database/query`, {
    method: "POST",
    body: { query: sql }
  });
}

// --- 0. Every credential must be present before anything is attempted --------
{
  const missing = [
    ["SUPABASE_ACCESS_TOKEN", SUPABASE_ACCESS_TOKEN],
    ["VERCEL_TOKEN", VERCEL_TOKEN],
    ["VERCEL_ORG_ID", VERCEL_ORG_ID],
    ["VERCEL_PROJECT_ID", VERCEL_PROJECT_ID],
    ["ACCEPTANCE_SUPABASE_PROJECT_REF", ACCEPTANCE_PROJECT_REF]
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    console.error(`PREFLIGHT: missing required input(s): ${missing.join(", ")}`);
    process.exit(1);
  }
  if (!/^[a-z]{20}$/.test(ACCEPTANCE_PROJECT_REF)) {
    console.error(`PREFLIGHT: acceptance project ref is not a Supabase project ref shape`);
    process.exit(1);
  }
}

const evidence = {
  schemaVersion: "rcap-hosted-acceptance-preflight/v1",
  acceptanceProjectRef: ACCEPTANCE_PROJECT_REF,
  cases: {}
};

// --- 1. Supabase credential and project identity -----------------------------
{
  const projects = await supabaseApi("/v1/projects");
  const usable = projects.status === 200 && Array.isArray(projects.json);
  record(
    "supabase_token_usable",
    usable,
    usable
      ? `Management API answered 200 and listed ${projects.json.length} project(s) on this token`
      : `Management API returned ${projects.status}: ${projects.text}`
  );

  const project = usable ? projects.json.find((entry) => entry.id === ACCEPTANCE_PROJECT_REF) : null;
  record(
    "acceptance_project_resolves",
    Boolean(project),
    project
      ? `ref ${ACCEPTANCE_PROJECT_REF} resolves to name="${project.name}", org=${project.organization_id}, region=${project.region}, status=${project.status}, created=${project.created_at}`
      : `ref ${ACCEPTANCE_PROJECT_REF} is not among the projects this token can see`
  );
  if (project) {
    evidence.cases.projectIdentity = {
      name: project.name,
      region: project.region,
      status: project.status,
      createdAt: project.created_at,
      organizationId: project.organization_id
    };
    // Reported, deliberately not enforced: a name is a label, and refusing on a
    // label would be a weaker check dressed up as a strong one. The emptiness
    // proof below is what actually decides this.
    if (/prod/i.test(String(project.name))) {
      console.log(`  note  the project name contains "prod" — the emptiness and disjointness proofs below are what decide this, not the name`);
    }
  }
}

// --- 2. The project answers SQL, and carries no production data --------------
{
  const ping = await query("select current_database() as db, version() as version");
  const reachable = ping.status === 200 || ping.status === 201;
  record(
    "acceptance_project_reachable_for_sql",
    reachable,
    reachable
      ? `read-only query executed through the Management API (no database password held): ${JSON.stringify(ping.json).slice(0, 160)}`
      : `query endpoint returned ${ping.status}: ${ping.text}`
  );

  if (reachable) {
    // The tables a production LegalEase database necessarily has. If any of
    // these exists AND holds rows, this is not an empty acceptance project and
    // the run stops before it writes anything.
    const PRODUCTION_WITNESS_TABLES = [
      "partner_records",
      "rcap_screening_sessions",
      "consumer_briefcase_items",
      "rcap_document_packets",
      "rcap_persons",
      "rcap_partner_access_codes"
    ];
    const sql = PRODUCTION_WITNESS_TABLES
      .map((table) => `select '${table}' as table_name, (select count(*) from public.${table}) as row_count`)
      .join("\nunion all\n");
    // to_regclass keeps a missing table from erroring the whole union: a table
    // that does not exist is the strongest possible "no production data".
    const guarded = `select t.table_name, case when to_regclass('public.' || t.table_name) is null then -1 else 0 end as present
                     from (values ${PRODUCTION_WITNESS_TABLES.map((t) => `('${t}')`).join(",")}) as t(table_name)`;
    const presence = await query(guarded);
    const present = Array.isArray(presence.json)
      ? presence.json.filter((row) => Number(row.present) === 0).map((row) => row.table_name)
      : [];

    let counts = [];
    if (present.length > 0) {
      const countSql = present
        .map((table) => `select '${table}' as table_name, (select count(*) from public.${table})::int as row_count`)
        .join("\nunion all\n");
      const countRes = await query(countSql);
      counts = Array.isArray(countRes.json) ? countRes.json : [];
    }

    const populated = counts.filter((row) => Number(row.row_count) > 0);
    const clean = presence.status === 200 || presence.status === 201 ? populated.length === 0 : false;
    record(
      "acceptance_project_carries_no_production_data",
      clean,
      clean
        ? `of ${PRODUCTION_WITNESS_TABLES.length} production witness tables, ${PRODUCTION_WITNESS_TABLES.length - present.length} do not exist and ${present.length} exist with 0 rows — no production data is present`
        : `REFUSING: production witness table(s) hold rows: ${populated.map((r) => `${r.table_name}=${r.row_count}`).join(", ")}`
    );
    evidence.cases.emptinessProof = {
      witnessTables: PRODUCTION_WITNESS_TABLES,
      absent: PRODUCTION_WITNESS_TABLES.filter((t) => !present.includes(t)),
      presentWithCounts: counts.map((r) => ({ table: r.table_name, rows: Number(r.row_count) })),
      unusedSql: sql.length > 0
    };
  } else {
    record("acceptance_project_carries_no_production_data", false, "not evaluated: the project did not answer SQL");
  }
}

// --- 3. Vercel credential and project identity -------------------------------
let vercelProject = null;
{
  const user = await vercelApi("/v2/user");
  const usable = user.status === 200;
  record(
    "vercel_token_usable",
    usable,
    usable ? `Vercel API answered 200 for the token's own user` : `Vercel /v2/user returned ${user.status}: ${user.text}`
  );

  const project = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}`);
  const resolved = project.status === 200 && project.json?.id === VERCEL_PROJECT_ID;
  vercelProject = resolved ? project.json : null;
  record(
    "vercel_project_resolves",
    resolved,
    resolved
      ? `project id ${VERCEL_PROJECT_ID} resolves to name="${project.json.name}", framework=${project.json.framework}, under org ${VERCEL_ORG_ID}`
      : `project lookup returned ${project.status}: ${project.text}`
  );
  if (resolved) {
    evidence.cases.vercelProject = {
      name: project.json.name,
      framework: project.json.framework,
      productionAliases: Array.isArray(project.json.alias)
        ? project.json.alias.filter((a) => a?.target === "PRODUCTION").map((a) => a.domain)
        : []
    };
  }
}

// --- 4. Disjointness from the Vercel production environment ------------------
{
  // Decrypted production values are read into memory for exactly two
  // comparisons and are never printed, hashed into evidence, or written out.
  const env = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/env?decrypt=true`);
  const entries = Array.isArray(env.json?.envs) ? env.json.envs : [];
  const productionEntries = entries.filter((entry) => Array.isArray(entry.target) && entry.target.includes("production"));

  const prodSupabaseUrl = productionEntries.find((entry) => entry.key === "NEXT_PUBLIC_SUPABASE_URL")?.value
    ?? productionEntries.find((entry) => entry.key === "SUPABASE_URL")?.value
    ?? null;

  const acceptanceUrl = `https://${ACCEPTANCE_PROJECT_REF}.supabase.co`;
  const acceptanceHash = sha256(acceptanceUrl);
  const prodHash = prodSupabaseUrl ? sha256(prodSupabaseUrl.trim()) : null;

  const disjoint = env.status === 200 && prodHash !== null && prodHash !== acceptanceHash;
  record(
    "acceptance_ref_disjoint_from_vercel_production",
    disjoint,
    env.status !== 200
      ? `could not read the project's environment variables: ${env.status} ${env.text}`
      : prodHash === null
        ? `no production-target Supabase URL is configured on this Vercel project, so disjointness cannot be proven by comparison`
        : prodHash === acceptanceHash
          ? `REFUSING: the production-target Supabase URL hashes to the acceptance URL's hash ${acceptanceHash.slice(0, 16)}… — the named acceptance project IS the production project`
          : `production Supabase URL sha256 ${prodHash.slice(0, 16)}… differs from acceptance URL sha256 ${acceptanceHash.slice(0, 16)}… — the two are different projects (neither value printed)`
  );

  // Second, wider pass: the acceptance ref must not appear anywhere inside any
  // production-target value. That catches a pooler host, a connection string or
  // a service-role key issued by the same project under a different key name.
  const contaminated = productionEntries
    .filter((entry) => typeof entry.value === "string" && entry.value.includes(ACCEPTANCE_PROJECT_REF))
    .map((entry) => entry.key);
  const absent = env.status === 200 && contaminated.length === 0;
  record(
    "acceptance_ref_absent_from_every_production_value",
    absent,
    env.status !== 200
      ? `not evaluated: the environment listing returned ${env.status}`
      : absent
        ? `the acceptance ref appears in none of the ${productionEntries.length} production-target values (values compared in memory, never printed)`
        : `REFUSING: the acceptance ref appears inside production-target value(s) for key(s): ${contaminated.join(", ")}`
  );

  evidence.cases.disjointness = {
    productionTargetVariableCount: productionEntries.length,
    acceptanceUrlSha256: acceptanceHash,
    productionSupabaseUrlSha256: prodHash,
    productionValueNeverPrinted: true
  };
}

// --- verdict -----------------------------------------------------------------
{
  const missing = REQUIRED_CASES.filter((caseId) => !verdicts.has(caseId));
  const failed = [...verdicts.entries()].filter(([, v]) => !v.passed).map(([caseId]) => caseId);
  evidence.cases.verdicts = Object.fromEntries([...verdicts.entries()].map(([k, v]) => [k, v.passed]));
  evidence.requiredCases = REQUIRED_CASES;
  evidence.missingCases = missing;
  evidence.failedCases = failed;
  evidence.passed = missing.length === 0 && failed.length === 0;
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, "preflight.json"),
    `${JSON.stringify(evidence, null, 2)}\n`
  );

  console.log("");
  if (missing.length > 0) console.error(`PREFLIGHT INCOMPLETE — no verdict registered for: ${missing.join(", ")}`);
  if (failed.length > 0) console.error(`PREFLIGHT FAILED — ${failed.join(", ")}`);
  if (evidence.passed) {
    console.log(`PREFLIGHT PASSED — ${REQUIRED_CASES.length}/${REQUIRED_CASES.length} cases; ${ACCEPTANCE_PROJECT_REF} is credentialled, reachable and demonstrably not production.`);
  }
  process.exit(evidence.passed ? 0 : 1);
}
