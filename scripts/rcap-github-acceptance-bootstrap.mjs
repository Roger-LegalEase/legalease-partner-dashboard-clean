#!/usr/bin/env node
// Read-only bootstrap for the GitHub Actions-hosted RCAP acceptance fallback.
//
// It proves the pinned Supabase project identity, validates the acceptance
// marker (or the original empty participant state), reads only that project's
// runtime keys and existing synthetic user IDs, and passes those acceptance-
// only values to later workflow steps. It performs no PATCH, INSERT or DELETE.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";

const ROOT = process.cwd();
const { root: EVIDENCE_DIR } = prepareHostedAcceptanceEvidenceLayout({ rootDir: ROOT });
const EVIDENCE_PATH = path.join(EVIDENCE_DIR, "github-bootstrap.json");
const RUNTIME_ENV_PATH = "/tmp/rcap-acceptance-runtime.env";

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const PROJECT_REF = process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "";
const APPLICATION_SHA = process.env.HOSTED_APPLICATION_SHA ?? "";
const EXPECTED_REF = "hyflxnlhpmiqxvvcoiia";
const EXPECTED_NAME = "legalease-rcap-acceptance";
const applicationShaExact = /^[0-9a-f]{40}$/.test(APPLICATION_SHA);
const EMAIL_A = "acceptance-consumer-a@rcap-acceptance.test";
const EMAIL_B = "acceptance-consumer-b@rcap-acceptance.test";

const evidence = {
  schemaVersion: "rcap-github-acceptance-bootstrap/v1",
  applicationSha: APPLICATION_SHA,
  acceptanceProjectRef: PROJECT_REF,
  readOnly: true,
  productionCredentialsRead: false,
  cases: {}
};

function sanitize(value) {
  return String(value ?? "")
    .split(ACCESS_TOKEN).join("***REDACTED***")
    .replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***");
}

function fail(caseId, observed) {
  evidence.cases[caseId] = { passed: false, observed: sanitize(observed) };
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  throw new Error(`${caseId}: ${sanitize(observed)}`);
}

function pass(caseId, observed) {
  evidence.cases[caseId] = { passed: true, observed: sanitize(observed) };
  console.log(`  ok   ${caseId} — ${sanitize(observed)}`);
}

async function management(pathname, { method = "GET", body = null } = {}) {
  const response = await fetch(`https://api.supabase.com${pathname}`, {
    method,
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: body === null ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* surfaced through sanitized text */ }
  return { ok: response.ok, status: response.status, json, text: sanitize(text).slice(0, 500) };
}

async function sql(query) {
  return management(`/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    body: { query }
  });
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

async function main() {
  if (!ACCESS_TOKEN) fail("required_inputs_present", "SUPABASE_ACCESS_TOKEN is absent");
  if (PROJECT_REF !== EXPECTED_REF || !applicationShaExact) {
    fail("immutable_inputs_exact", `application=${APPLICATION_SHA}; project=${PROJECT_REF}`);
  }
  pass("immutable_inputs_exact", `application=${APPLICATION_SHA}; project=${PROJECT_REF}`);

  const projects = await management("/v1/projects");
  const project = Array.isArray(projects.json)
    ? projects.json.find((candidate) => candidate.id === PROJECT_REF)
    : null;
  if (!projects.ok || project?.name !== EXPECTED_NAME || project?.status !== "ACTIVE_HEALTHY") {
    fail(
      "acceptance_project_identity_exact",
      `GET=${projects.status}; name=${JSON.stringify(project?.name ?? null)}; status=${JSON.stringify(project?.status ?? null)}`
    );
  }
  pass("acceptance_project_identity_exact", `name=${project.name}; status=${project.status}; region=${project.region}`);
  evidence.project = { name: project.name, status: project.status, region: project.region, createdAt: project.created_at };

  const markerResponse = await sql(
    "select project_ref, application_sha, stamped_at from public.rcap_acceptance_environment_marker limit 1"
  );
  const marker = Array.isArray(markerResponse.json) ? markerResponse.json[0] ?? null : null;
  const countResponse = await sql(`
    select
      (select count(*)::int from public.consumer_briefcase_items) as briefcase_items,
      (select count(*)::int from public.screening_sessions) as screening_sessions,
      (select count(*)::int from public.rcap_persons) as persons,
      (select count(*)::int from public.rcap_document_packets) as packets
  `);
  const counts = Array.isArray(countResponse.json) ? countResponse.json[0] ?? null : null;
  const empty = counts
    && [counts.briefcase_items, counts.screening_sessions, counts.persons, counts.packets]
      .every((value) => Number(value) === 0);
  const markerExact = marker?.project_ref === PROJECT_REF
    && /^[0-9a-f]{40}$/.test(String(marker?.application_sha ?? ""));
  if (!(markerExact || empty)) {
    fail("acceptance_not_production_proof", `marker=${JSON.stringify(marker)}; counts=${JSON.stringify(counts)}`);
  }
  pass(
    "acceptance_not_production_proof",
    markerExact
      ? `pipeline marker names ${PROJECT_REF}; participant counts=${JSON.stringify(counts)}`
      : `all participant witnesses are empty; counts=${JSON.stringify(counts)}`
  );
  evidence.acceptanceProof = { markerExact, counts };

  const keysResponse = await management(`/v1/projects/${PROJECT_REF}/api-keys?reveal=true`);
  const keys = Array.isArray(keysResponse.json) ? keysResponse.json : [];
  const anon = keys.find((entry) => entry.name === "anon")?.api_key ?? "";
  const service = keys.find((entry) => entry.name === "service_role")?.api_key ?? "";
  if (!keysResponse.ok || !anon || !service || anon === service) {
    fail("acceptance_runtime_keys_available", `GET=${keysResponse.status}; anon=${Boolean(anon)}; service=${Boolean(service)}`);
  }
  pass("acceptance_runtime_keys_available", "anon and service_role keys read from the pinned acceptance project");
  evidence.keyFingerprints = { anonSha256: fingerprint(anon), serviceSha256: fingerprint(service) };

  const usersResponse = await sql(`
    select id, email
      from auth.users
     where email in ('${EMAIL_A}', '${EMAIL_B}')
     order by email
  `);
  const users = Array.isArray(usersResponse.json) ? usersResponse.json : [];
  const consumerA = users.find((user) => user.email === EMAIL_A);
  const consumerB = users.find((user) => user.email === EMAIL_B);
  if (!usersResponse.ok || !consumerA?.id || !consumerB?.id || consumerA.id === consumerB.id) {
    fail("synthetic_identity_scope_resolves", `SQL=${usersResponse.status}; A=${Boolean(consumerA?.id)}; B=${Boolean(consumerB?.id)}`);
  }
  pass("synthetic_identity_scope_resolves", `consumer A and B exist; only A (${consumerA.id}) will be admitted`);
  evidence.identities = [
    { role: "consumer_a_admitted", id: consumerA.id, email: consumerA.email },
    { role: "consumer_b_outside_scope", id: consumerB.id, email: consumerB.email }
  ];

  const jwtSafe = (value) => /^eyJ[A-Za-z0-9._-]+$/.test(value);
  const uuidSafe = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  if (!jwtSafe(anon) || !jwtSafe(service) || !uuidSafe(consumerA.id) || !uuidSafe(consumerB.id)) {
    fail("acceptance_runtime_values_shell_safe", "runtime keys or synthetic UUIDs are not safe for the runner-only environment file");
  }
  pass("acceptance_runtime_values_shell_safe", "keys and UUIDs are restricted to source-safe alphabets");

  console.log(`::add-mask::${anon}`);
  console.log(`::add-mask::${service}`);
  fs.writeFileSync(RUNTIME_ENV_PATH, [
    `RCAP_ACCEPTANCE_ANON_KEY=${anon}`,
    `RCAP_ACCEPTANCE_SERVICE_ROLE_KEY=${service}`,
    `RCAP_ACCEPTANCE_CONSUMER_A_ID=${consumerA.id}`,
    `RCAP_ACCEPTANCE_CONSUMER_B_ID=${consumerB.id}`
  ].join("\n") + "\n", { mode: 0o600 });
  fs.chmodSync(RUNTIME_ENV_PATH, 0o600);
  const runtimeMode = fs.statSync(RUNTIME_ENV_PATH).mode & 0o777;
  if (runtimeMode !== 0o600) fail("acceptance_runtime_file_private", `mode=${runtimeMode.toString(8)}`);
  pass("acceptance_runtime_file_private", "acceptance-only values written to a chmod-600 runner-local file; no key entered GITHUB_ENV");

  evidence.passed = true;
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log("GITHUB ACCEPTANCE BOOTSTRAP PASSED — read-only proof complete");
}

main().catch((error) => {
  evidence.passed = false;
  evidence.failure = sanitize(error instanceof Error ? error.message : error);
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.error(`GITHUB ACCEPTANCE BOOTSTRAP FAILED — ${evidence.failure}`);
  process.exit(1);
});
