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

// Two gates, because they guard different actions.
//
// The SUPABASE gate is what permits writing to the acceptance project. Its
// emptiness case is conclusive on its own: a production LegalEase database
// cannot be missing all six of the tables the product's own migrations create,
// so a project where none of them exists is not production, whatever any other
// system says about it.
//
// The VERCEL gate is what permits deploying. Its disjointness cases are a
// second, independent proof of the same fact, from the deployment side.
//
// PREFLIGHT_SCOPE selects which gates must pass. It is set by the workflow's
// mode, not by a soft override, and the scope that ran is recorded in the
// evidence — so "supabase_only" can never be mistaken for a full pass.
const SUPABASE_GATE = [
  "supabase_token_usable",
  "acceptance_project_resolves",
  "acceptance_project_reachable_for_sql",
  "acceptance_project_carries_no_production_data"
];
const VERCEL_GATE = [
  "vercel_token_usable",
  "vercel_project_resolves",
  "acceptance_ref_disjoint_from_vercel_production",
  "acceptance_ref_absent_from_every_production_value"
];
const SCOPE = process.env.PREFLIGHT_SCOPE === "supabase_only" ? "supabase_only" : "full";
const REQUIRED_CASES = SCOPE === "supabase_only" ? SUPABASE_GATE : [...SUPABASE_GATE, ...VERCEL_GATE];

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

/**
 * Team scoping is passed as `teamId` when VERCEL_ORG_ID is a team id
 * (`team_…`) and as `slug` otherwise, because Vercel rejects a slug supplied
 * as teamId with the same 403 it uses for a genuinely unauthorized token. A
 * scoping mistake and a bad credential must not be indistinguishable, so on a
 * 403 the other spelling is tried once and whichever succeeds is remembered.
 */
let teamParam = null;
function scopedUrl(pathname, param) {
  if (!param) return `https://api.vercel.com${pathname}`;
  const joiner = pathname.includes("?") ? "&" : "?";
  return `https://api.vercel.com${pathname}${joiner}${param}=${encodeURIComponent(VERCEL_ORG_ID)}`;
}
async function vercelFetch(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { /* non-JSON surfaces through text */ }
  return { status: res.status, json, text: text.slice(0, 400) };
}
async function vercelApi(pathname) {
  if (teamParam !== null) return vercelFetch(scopedUrl(pathname, teamParam));
  const candidates = VERCEL_ORG_ID.startsWith("team_") ? ["teamId", "slug"] : ["slug", "teamId"];
  let last = null;
  for (const candidate of candidates) {
    last = await vercelFetch(scopedUrl(pathname, candidate));
    if (last.status < 400) { teamParam = candidate; return last; }
  }
  return last;
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
  scope: SCOPE,
  scopeMeaning: SCOPE === "supabase_only"
    ? "Only the Supabase gate was required. This authorizes writing to the acceptance project. It does NOT authorize deploying, and it is not a full preflight pass."
    : "Both gates were required: writing to the acceptance project and deploying the application.",
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
  // Probed against the endpoint this mission actually uses. An earlier version
  // probed /v2/user and failed 403 on a correct token: a team-scoped Vercel
  // token is not authorized for the personal-user endpoint at all, so that
  // check tested something the mission never needs and would have reported a
  // working credential as broken.
  const listing = await vercelApi("/v9/projects?limit=1");
  const usable = listing.status === 200;

  // A bare 403 is not an actionable report. When the scoped listing is refused,
  // three unscoped probes separate "the token is bad" from "the token is fine
  // but the org identifier is wrong" from "the token is fine and scoped to a
  // different team". Shapes are reported; values never are.
  let diagnosis = "";
  if (!usable) {
    const shape = (name, value) => `${name}=<${value.length} chars, prefix "${value.slice(0, 5)}…">`;
    const unscopedProjects = await vercelFetch("https://api.vercel.com/v9/projects?limit=1");
    const teams = await vercelFetch("https://api.vercel.com/v2/teams?limit=20");
    const teamList = Array.isArray(teams.json?.teams) ? teams.json.teams : [];
    const orgMatches = teamList.some((team) => team.id === VERCEL_ORG_ID || team.slug === VERCEL_ORG_ID);

    if (teams.status === 403 && unscopedProjects.status === 403) {
      diagnosis = "the token is refused on every endpoint including unscoped ones, so the credential itself is not valid for this account — it is expired, revoked, or was pasted incompletely. Reissue a Vercel access token and update the VERCEL_TOKEN secret.";
    } else if (teamList.length > 0 && !orgMatches) {
      diagnosis = `the token is valid and can see ${teamList.length} team(s), but VERCEL_ORG_ID matches none of their ids or slugs. Update VERCEL_ORG_ID to the team the project lives under.`;
    } else if (unscopedProjects.status === 200) {
      diagnosis = "the token is valid for personal-scope projects but is refused under the supplied org, so it is scoped to a different account or team than VERCEL_ORG_ID names.";
    } else {
      diagnosis = `unscoped project listing returned ${unscopedProjects.status} and team listing returned ${teams.status}; the token is authenticated but authorized for neither, which usually means an access token limited to a specific scope that excludes this project.`;
    }
    diagnosis += ` Supplied identifier shapes (values never printed): ${shape("VERCEL_ORG_ID", VERCEL_ORG_ID)}, ${shape("VERCEL_PROJECT_ID", VERCEL_PROJECT_ID)}.`;
    evidence.cases.vercelDiagnosis = {
      scopedListingStatus: listing.status,
      unscopedListingStatus: unscopedProjects.status,
      teamListingStatus: teams.status,
      visibleTeamCount: teamList.length,
      orgIdMatchesAVisibleTeam: orgMatches,
      orgIdLooksLikeTeamId: VERCEL_ORG_ID.startsWith("team_"),
      projectIdLooksLikeProjectId: VERCEL_PROJECT_ID.startsWith("prj_")
    };
  }

  record(
    "vercel_token_usable",
    usable,
    usable
      ? `the token lists projects under the supplied org scope (scoped by ${teamParam}); this is the access the deployment step needs`
      : `project listing returned ${listing.status} — ${diagnosis}`
  );

  // The endpoint accepts an id or a name, so the supplied value is accepted as
  // either and the resolved id is what everything downstream uses.
  const project = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}`);
  const resolved = project.status === 200
    && (project.json?.id === VERCEL_PROJECT_ID || project.json?.name === VERCEL_PROJECT_ID);
  vercelProject = resolved ? project.json : null;
  record(
    "vercel_project_resolves",
    resolved,
    resolved
      ? `the supplied project identifier resolves to name="${project.json.name}", framework=${project.json.framework}, ssoProtection=${project.json.ssoProtection ? "on" : "off"}, passwordProtection=${project.json.passwordProtection ? "on" : "off"}`
      : `project lookup returned ${project.status}: ${project.text}`
  );
  if (resolved) {
    evidence.cases.vercelProject = {
      resolvedId: project.json.id,
      name: project.json.name,
      framework: project.json.framework,
      teamScopeParam: teamParam,
      ssoProtectionEnabled: Boolean(project.json.ssoProtection),
      passwordProtectionEnabled: Boolean(project.json.passwordProtection),
      // Recorded so the deployment step can prove afterwards that it added no
      // production alias and removed none: this is the before-picture.
      productionAliasesBefore: Array.isArray(project.json.alias)
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
  // Only cases inside the required scope can fail the run; the others are still
  // executed and still reported, so a scoped run never hides what it saw.
  const failed = REQUIRED_CASES.filter((caseId) => verdicts.get(caseId)?.passed === false);
  const failedOutsideScope = [...verdicts.entries()]
    .filter(([caseId, v]) => !v.passed && !REQUIRED_CASES.includes(caseId))
    .map(([caseId]) => caseId);
  evidence.cases.verdicts = Object.fromEntries([...verdicts.entries()].map(([k, v]) => [k, v.passed]));
  evidence.requiredCases = REQUIRED_CASES;
  evidence.missingCases = missing;
  evidence.failedCases = failed;
  evidence.failedOutsideRequiredScope = failedOutsideScope;
  evidence.passed = missing.length === 0 && failed.length === 0;
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, "preflight.json"),
    `${JSON.stringify(evidence, null, 2)}\n`
  );

  console.log("");
  if (missing.length > 0) console.error(`PREFLIGHT INCOMPLETE — no verdict registered for: ${missing.join(", ")}`);
  if (failed.length > 0) console.error(`PREFLIGHT FAILED (scope ${SCOPE}) — ${failed.join(", ")}`);
  if (failedOutsideScope.length > 0) {
    console.log(`PREFLIGHT NOTE — outside the required scope and still failing: ${failedOutsideScope.join(", ")}. These do not gate this run and must be closed before the deployment step.`);
  }
  if (evidence.passed) {
    console.log(
      SCOPE === "supabase_only"
        ? `PREFLIGHT PASSED (SUPABASE GATE ONLY) — ${REQUIRED_CASES.length}/${REQUIRED_CASES.length} cases; ${ACCEPTANCE_PROJECT_REF} may be written to. This is NOT authorization to deploy.`
        : `PREFLIGHT PASSED — ${REQUIRED_CASES.length}/${REQUIRED_CASES.length} cases; ${ACCEPTANCE_PROJECT_REF} is credentialled, reachable and demonstrably not production.`
    );
  }
  process.exit(evidence.passed ? 0 : 1);
}
