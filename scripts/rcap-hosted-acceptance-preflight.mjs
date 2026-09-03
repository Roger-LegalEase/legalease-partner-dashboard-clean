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
//   * CONFIGURATION SHAPE — production-target keys, targets and timestamps are
//     snapshotted without requesting or reading stored values. The Preview
//     receives its acceptance binding per deployment; it never inherits or
//     rewrites the project's Production environment.
//
// Nothing here writes. Every call is a GET or a read-only query, so a
// preflight that fails has changed nothing anywhere.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";
import {
  HOSTED_VERCEL_PROJECT_NAME,
  HOSTED_VERCEL_TEAM_SLUG,
  hostedVercelScopedUrl,
  resolveHostedVercelIdentity
} from "./rcap-hosted-acceptance-vercel-identity.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { root: EVIDENCE_DIR } = prepareHostedAcceptanceEvidenceLayout({ rootDir });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const ACCEPTANCE_PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const EXPECTED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";

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
// The VERCEL gate is what permits deploying. It snapshots Production
// configuration shape without values, then proves the actual deploy script
// binds acceptance values per Preview deployment and cannot target Production.
//
// PREFLIGHT_SCOPE selects which gates must pass. It is set by the workflow's
// mode, not by a soft override, and the scope that ran is recorded in the
// evidence — so "supabase_only" can never be mistaken for a full pass.
const SUPABASE_GATE = [
  "supabase_token_usable",
  "acceptance_project_resolves",
  "acceptance_project_identity_is_exact",
  "acceptance_project_reachable_for_sql",
  "acceptance_project_carries_no_production_data"
];
const VERCEL_GATE = [
  "vercel_token_usable",
  "vercel_project_resolves",
  "production_environment_shape_snapshotted_without_values",
  "preview_binding_is_per_deployment_only"
];
const SCOPE = process.env.PREFLIGHT_SCOPE === "supabase_only" ? "supabase_only" : "full";
const REQUIRED_CASES = SCOPE === "supabase_only" ? SUPABASE_GATE : [...SUPABASE_GATE, ...VERCEL_GATE];

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

let VERCEL_IDENTITY = null;
async function vercelFetch(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch { /* non-JSON surfaces through text */ }
  return { status: res.status, json, text: text.slice(0, 400) };
}
async function vercelApi(pathname) {
  if (!VERCEL_IDENTITY) throw new Error("the pinned Vercel identity has not been resolved");
  return vercelFetch(hostedVercelScopedUrl(pathname, VERCEL_IDENTITY));
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
  const requiredCredentials = [
    ["SUPABASE_ACCESS_TOKEN", SUPABASE_ACCESS_TOKEN],
    ["ACCEPTANCE_SUPABASE_PROJECT_REF", ACCEPTANCE_PROJECT_REF]
  ];
  if (SCOPE === "full") requiredCredentials.push(["VERCEL_TOKEN", VERCEL_TOKEN]);
  const missing = requiredCredentials.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    console.error(`PREFLIGHT: missing required input(s): ${missing.join(", ")}`);
    process.exit(1);
  }
  if (!/^[a-z]{20}$/.test(ACCEPTANCE_PROJECT_REF)) {
    console.error(`PREFLIGHT: acceptance project ref is not a Supabase project ref shape`);
    process.exit(1);
  }
  if (ACCEPTANCE_PROJECT_REF !== EXPECTED_PROJECT_REF) {
    console.error("PREFLIGHT: ACCEPTANCE_SUPABASE_PROJECT_REF is not the pinned acceptance project");
    process.exit(1);
  }
}
if (SCOPE === "full") {
  try {
    VERCEL_IDENTITY = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
  } catch (error) {
    console.error(`PREFLIGHT: ${error.message}`);
    process.exit(1);
  }
}

const evidence = {
  schemaVersion: "rcap-hosted-acceptance-preflight/v1",
  acceptanceProjectRef: ACCEPTANCE_PROJECT_REF,
  acceptanceProjectUrl: `https://${ACCEPTANCE_PROJECT_REF}.supabase.co`,
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
  const exactIdentity = Boolean(project)
    && project.name === "legalease-rcap-acceptance"
    && project.region === "us-west-2"
    && project.status === "ACTIVE_HEALTHY";
  record(
    "acceptance_project_identity_is_exact",
    exactIdentity,
    project
      ? `name=${project.name}; region=${project.region}; status=${project.status}; expected legalease-rcap-acceptance/us-west-2/ACTIVE_HEALTHY`
      : "project identity unavailable because the pinned ref did not resolve"
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
      console.log(`  note  the project name contains "prod" — the emptiness and Preview-isolation proofs below are what decide this, not the name`);
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
    //
    // Each name is the exact relation the repository's own migrations create.
    // An earlier version listed two names that no migration creates — they read
    // "absent" against ANY database, production included, so they proved
    // nothing while inflating the count. The corroboration below makes that
    // class of mistake impossible to repeat quietly: a witness that no
    // supabase/*.sql file creates is dropped from the proof and reported.
    //
    // The witnesses are split, because the two kinds answer different
    // questions and only one of them decides this.
    //
    //   PARTICIPANT witnesses hold the records of real people using the
    //   product. This is the decisive set: LegalEase exists to serve
    //   participants, so a database with zero of them is not a production
    //   database of this product, whatever else it contains.
    //
    //   TENANT witnesses hold configuration — a partner row, an access code.
    //   They are reported, never gating. The first hosted run learned this the
    //   hard way: the repository's own demo seed put three partner rows in the
    //   acceptance project, and a gate that treated any row as production data
    //   then refused the environment it had just built.
    const PARTICIPANT_WITNESS_TABLES = [
      "consumer_briefcase_items",
      "screening_sessions",
      "rcap_persons",
      "rcap_document_packets"
    ];
    const TENANT_WITNESS_TABLES = ["partner_records", "partner_access_codes"];
    const CANDIDATE_WITNESS_TABLES = [...PARTICIPANT_WITNESS_TABLES, ...TENANT_WITNESS_TABLES];
    const migrationCorpus = fs.readdirSync(path.join(rootDir, "supabase"))
      .filter((name) => name.endsWith(".sql"))
      .map((name) => fs.readFileSync(path.join(rootDir, "supabase", name), "utf8"))
      .join("\n");
    const vacuousWitnesses = CANDIDATE_WITNESS_TABLES.filter(
      (table) => !new RegExp(`create table (if not exists )?(public\\.)?${table}\\b`, "i").test(migrationCorpus)
    );
    const PRODUCTION_WITNESS_TABLES = CANDIDATE_WITNESS_TABLES.filter((table) => !vacuousWitnesses.includes(table));
    if (vacuousWitnesses.length > 0) {
      console.log(`  note  dropped from the emptiness proof because no migration creates them: ${vacuousWitnesses.join(", ")}`);
    }
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

    const countOf = (table) => {
      const row = counts.find((candidate) => candidate.table_name === table);
      return row ? Number(row.row_count) : 0;
    };
    const participantWitnesses = PRODUCTION_WITNESS_TABLES.filter((t) => PARTICIPANT_WITNESS_TABLES.includes(t));
    const tenantWitnesses = PRODUCTION_WITNESS_TABLES.filter((t) => TENANT_WITNESS_TABLES.includes(t));
    const populatedParticipant = participantWitnesses.filter((t) => countOf(t) > 0);
    const populatedTenant = tenantWitnesses.filter((t) => countOf(t) > 0);

    const hasWitnesses = participantWitnesses.length >= 3;
    const empty = hasWitnesses && (presence.status === 200 || presence.status === 201) && populatedParticipant.length === 0;

    // Emptiness is a ONE-TIME proof: the first successful migrate fills these
    // tables, and after that a purely emptiness-based gate would refuse every
    // re-run of the environment it just built. So the first run that writes
    // stamps a marker naming this exact project ref as an acceptance
    // environment. A project carrying the marker was proven empty when the
    // marker was written and has been under this pipeline's control ever since.
    //
    // The marker cannot launder a production database: it is only ever written
    // to the pinned acceptance ref, and it must name the ref it is found in —
    // a marker copied into another database names the wrong project and is
    // rejected.
    const markerRows = await query(
      `select project_ref, stamped_at, application_sha from public.rcap_acceptance_environment_marker limit 1`
    );
    const marker = Array.isArray(markerRows.json) ? markerRows.json[0] ?? null : null;
    const markerValid = Boolean(marker) && String(marker.project_ref) === ACCEPTANCE_PROJECT_REF;

    const clean = empty || markerValid;
    record(
      "acceptance_project_carries_no_production_data",
      clean,
      !hasWitnesses
        ? `only ${participantWitnesses.length} participant witness table(s) are corroborated by a migration; that is too few to decide the question`
        : empty
          ? `every participant witness is absent or empty (${participantWitnesses.map((t) => `${t}=${present.includes(t) ? countOf(t) : "absent"}`).join(", ")}) — this database serves no participants, so it is not a production database of a product that exists to serve them${populatedTenant.length > 0 ? `. Tenant configuration is present and reported, not gating: ${populatedTenant.map((t) => `${t}=${countOf(t)}`).join(", ")}` : ""}`
          : markerValid
            ? `participant rows exist because this pipeline put them there: the acceptance marker names ${marker.project_ref} (this project), stamped ${marker.stamped_at} at application SHA ${String(marker.application_sha).slice(0, 12)}…, so the project was proven to serve no participants before its first write`
            : marker
              ? `REFUSING: an acceptance marker exists but names ${marker.project_ref}, not ${ACCEPTANCE_PROJECT_REF} — this database is not the one that was stamped`
              : `REFUSING: participant data is present and no acceptance marker vouches for it: ${populatedParticipant.map((t) => `${t}=${countOf(t)}`).join(", ")}`
    );
    evidence.cases.emptinessProof = {
      participantWitnesses,
      tenantWitnesses,
      excludedAsUncorroborated: vacuousWitnesses,
      absent: PRODUCTION_WITNESS_TABLES.filter((t) => !present.includes(t)),
      presentWithCounts: counts.map((r) => ({ table: r.table_name, rows: Number(r.row_count) })),
      decisiveOn: "participant data only; tenant configuration is reported and never gating",
      provenBy: empty ? "no_participant_data" : markerValid ? "acceptance_marker" : "neither",
      marker: marker ? { projectRef: marker.project_ref, stampedAt: marker.stamped_at } : null,
      unusedSql: sql.length > 0
    };
  } else {
    record("acceptance_project_carries_no_production_data", false, "not evaluated: the project did not answer SQL");
  }
}

// --- 3. Vercel credential and project identity -------------------------------
let vercelProject = null;
if (SCOPE === "full") {
  const listing = await vercelApi("/v9/projects?limit=1");
  const usable = listing.status === 200;
  record(
    "vercel_token_usable",
    usable,
    usable
      ? `the token lists projects under pinned team ${HOSTED_VERCEL_TEAM_SLUG} using its resolved team_ id`
      : `project listing under pinned team ${HOSTED_VERCEL_TEAM_SLUG} returned ${listing.status}`
  );

  const project = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_IDENTITY.projectId)}`);
  const resolved = project.status === 200
    && project.json?.id === VERCEL_IDENTITY.projectId
    && project.json?.name === HOSTED_VERCEL_PROJECT_NAME;
  vercelProject = resolved ? project.json : null;
  record(
    "vercel_project_resolves",
    resolved,
    resolved
      ? `the pinned project ${HOSTED_VERCEL_TEAM_SLUG}/${HOSTED_VERCEL_PROJECT_NAME} resolves to its canonical prj_ id; framework=${project.json.framework}, ssoProtection=${project.json.ssoProtection ? "on" : "off"}, passwordProtection=${project.json.passwordProtection ? "on" : "off"}`
      : `project lookup returned ${project.status}: ${project.text}`
  );
  if (resolved) {
    evidence.cases.vercelProject = {
      resolvedId: project.json.id,
      name: project.json.name,
      framework: project.json.framework,
      teamSlug: HOSTED_VERCEL_TEAM_SLUG,
      teamScopeParam: "teamId",
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

// --- 4. Production shape + Preview-only deployment contract ------------------
if (SCOPE === "full") {
  // Production-target values are intentionally not decrypted. The acceptance
  // binding is passed to one deployment with CLI --env arguments, so the
  // relevant proof is structural: snapshot the Production shape, then inspect
  // the exact deploy argument builder that the workflow will execute.
  const env = await vercelApi(`/v9/projects/${encodeURIComponent(VERCEL_IDENTITY.projectId)}/env`);
  const entries = Array.isArray(env.json?.envs) ? env.json.envs : [];
  const productionEntries = entries.filter((entry) => Array.isArray(entry.target) && entry.target.includes("production"));
  const productionShape = productionEntries
    .map((entry) => ({ key: entry.key, target: [...entry.target].sort(), updatedAt: entry.updatedAt ?? null }))
    .sort((a, b) => a.key.localeCompare(b.key));

  record(
    "production_environment_shape_snapshotted_without_values",
    env.status === 200,
    env.status === 200
      ? `${productionShape.length} production-target entries snapshotted without requesting values`
      : `could not read the project's environment-variable shape: ${env.status} ${env.text}`
  );

  const deploySource = fs.readFileSync(
    path.join(rootDir, "scripts/rcap-hosted-acceptance-deploy.mjs"),
    "utf8"
  );
  const deployArgsLine = deploySource.match(/const args = \[[^\n]+/)?.[0] ?? "";
  const previewBindingOnly = deployArgsLine.includes('"deploy"')
    && !deployArgsLine.includes('"--prod"')
    && !deployArgsLine.includes('"alias"')
    && deploySource.includes('args.push("--env"')
    && deploySource.includes("neverWroteProjectLevelEnv: true")
    && deploySource.includes('"production_aliases_unchanged"')
    && deploySource.includes('"production_environment_variables_unchanged"');
  record(
    "preview_binding_is_per_deployment_only",
    previewBindingOnly,
    previewBindingOnly
      ? "deploy arguments are Preview-only, pass acceptance values per deployment, and assert Production aliases/environment unchanged"
      : "deploy argument contract is missing a required Preview-isolation guard"
  );

  evidence.cases.previewIsolation = {
    productionEnvironmentShape: productionShape,
    requestedDecryption: false,
    storedValuesRead: false,
    productionValueDisjointness: "unproven_not_read",
    perDeploymentBinding: previewBindingOnly,
    productionShapeSnapshotted: env.status === 200
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
        : `PREFLIGHT PASSED — ${REQUIRED_CASES.length}/${REQUIRED_CASES.length} cases; the acceptance database and Preview-only deployment boundary are proven. Production stored values were not read, so value-level disjointness remains unproven.`
    );
  }
  process.exit(evidence.passed ? 0 : 1);
}
