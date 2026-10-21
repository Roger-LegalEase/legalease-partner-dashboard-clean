#!/usr/bin/env node
// Production environment keys for the Legal Aid protected field, through the
// Vercel project environment store (the same store every other Production
// secret lives in). Two phases:
//   read   — lists the NAMES and targets of the variables this feature and its
//            verification depend on; values are never requested.
//   create — creates LEGAL_AID_RESTRICTED_FIELD_KEY (32 random bytes, base64,
//            generated in this run, type "sensitive": Vercel encrypts it and
//            never returns it) and LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION=v1
//            for the Production target only, and only when neither exists.
//            An existing key is never overwritten: saved data would become
//            unreadable. Nothing is printed except names and identifiers.
// Preview/acceptance never uses these values: the acceptance Preview carries
// its own derived key per deployment.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { HOSTED_VERCEL_PROJECT_ID, hostedVercelScopedUrl, resolveHostedVercelIdentity } from "./rcap-hosted-acceptance-vercel-identity.mjs";

const PHASE = (process.env.RCAP_LEGAL_AID_KEYS_PHASE ?? "").trim();
const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const EVIDENCE_DIR = path.resolve(process.env.RCAP_PRODUCTION_EVIDENCE_DIR ?? "production-canary-evidence");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, `production-legal-aid-keys-${PHASE || "unknown"}.json`);
const KEY_NAME = "LEGAL_AID_RESTRICTED_FIELD_KEY";
const VERSION_NAME = "LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION";
// Legal Aid registrations and intakes key the participant by an HMAC
// pseudonym (src/lib/expungement-ai/privacy/pseudonym.ts), which throws in
// production without this secret. Production has never carried it (keys read
// run 35114542930), so it is created once here, sensitive, Production only,
// and never overwritten: every pseudonym written afterwards depends on it.
const PSEUDONYM_NAME = "PARTICIPANT_PRIVACY_PSEUDONYM_SECRET";
const OBSERVED_NAMES = [
  KEY_NAME, VERSION_NAME, "PARTICIPANT_PRIVACY_PSEUDONYM_SECRET", "RESEND_API_KEY", "PARTNER_EMAIL_FROM", "ENABLE_PARTNER_EMAIL_DELIVERY",
  "PARTNER_EMAIL_PROVIDER", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ENABLE_SUPABASE_PARTNER_DATA"
];

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
const verdicts = [];
const evidence = {
  schemaVersion: "rcap-production-legal-aid-keys/v1",
  phase: PHASE,
  startedAt: new Date().toISOString(),
  projectId: HOSTED_VERCEL_PROJECT_ID,
  secretValuesIncluded: false,
  environmentVariableCreated: false,
  environmentVariableOverwritten: false,
  deploymentTriggered: false,
  aliasChanged: false,
  productionDatabaseMutated: false,
  observed: null,
  verdicts
};

function record(caseId, passed, observed) {
  verdicts.push({ caseId, passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
  if (!passed) throw new Error(caseId);
}
function persist(passed, failure = null) {
  evidence.finishedAt = new Date().toISOString();
  evidence.passed = passed;
  evidence.failure = failure;
  fs.writeFileSync(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);
}
async function vercel(method, pathname, identity, body) {
  const response = await fetch(hostedVercelScopedUrl(pathname, identity), {
    method,
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000)
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* reported below */ }
  return { status: response.status, json };
}
function summarize(envs) {
  return envs
    .filter((entry) => OBSERVED_NAMES.includes(entry.key))
    .map((entry) => ({ key: entry.key, id: entry.id, type: entry.type, target: entry.target, gitBranch: entry.gitBranch ?? null, updatedAt: entry.updatedAt ?? null }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

try {
  if (PHASE !== "read" && PHASE !== "create") throw new Error("phase must be read or create");
  if (!VERCEL_TOKEN) throw new Error("VERCEL_TOKEN is required");
  const identity = await resolveHostedVercelIdentity({ token: VERCEL_TOKEN });
  record("exact_vercel_project_is_bound", identity.projectId === HOSTED_VERCEL_PROJECT_ID, `project ${identity.projectName} (${identity.projectId}) in team ${identity.teamId}`);

  const listing = await vercel("GET", `/v9/projects/${encodeURIComponent(identity.projectId)}/env?decrypt=false`, identity);
  record("environment_names_listed_without_values", listing.status === 200 && Array.isArray(listing.json?.envs), `HTTP ${listing.status}; ${Array.isArray(listing.json?.envs) ? listing.json.envs.length : 0} variables; values not requested`);
  const before = summarize(listing.json.envs);
  const present = (name) => before.filter((entry) => entry.key === name && (entry.target ?? []).includes("production"));
  evidence.observed = {
    before,
    productionHas: Object.fromEntries(OBSERVED_NAMES.map((name) => [name, present(name).length > 0]))
  };
  console.log(`  production has: ${OBSERVED_NAMES.map((name) => `${name}=${present(name).length > 0}`).join(", ")}`);

  if (PHASE === "read") {
    persist(true);
    console.log("PRODUCTION LEGAL AID KEYS READ — names recorded; nothing changed");
  } else {
    const existingKey = present(KEY_NAME);
    const existingVersion = present(VERSION_NAME);
    const existingPseudonym = present(PSEUDONYM_NAME);
    record("existing_pseudonym_secret_is_never_overwritten", true, existingPseudonym.length ? `${PSEUDONYM_NAME} already exists for Production (id ${existingPseudonym[0].id}); it is retained` : `${PSEUDONYM_NAME} absent for Production; it will be created`);
    record("existing_key_is_never_overwritten", true, existingKey.length ? `${KEY_NAME} already exists for Production (id ${existingKey[0].id}); it is retained` : `${KEY_NAME} absent for Production; it will be created`);
    if (existingKey.length === 0 || existingVersion.length === 0) {
      const body = [];
      if (existingKey.length === 0) body.push({ key: KEY_NAME, value: crypto.randomBytes(32).toString("base64"), type: "sensitive", target: ["production"] });
      if (existingVersion.length === 0) body.push({ key: VERSION_NAME, value: "v1", type: "plain", target: ["production"] });
      if (existingPseudonym.length === 0) body.push({ key: PSEUDONYM_NAME, value: crypto.randomBytes(32).toString("base64url"), type: "sensitive", target: ["production"] });
      const created = await vercel("POST", `/v10/projects/${encodeURIComponent(identity.projectId)}/env?upsert=false`, identity, body);
      const createdEnvs = Array.isArray(created.json?.created) ? created.json.created : [];
      record("production_keys_created_once", created.status === 200 || created.status === 201, `HTTP ${created.status}; created ${createdEnvs.map((entry) => entry.key).join(", ") || "(none reported)"}; failed ${(created.json?.failed ?? []).length}`);
      evidence.environmentVariableCreated = createdEnvs.length > 0;
    }
    const after = await vercel("GET", `/v9/projects/${encodeURIComponent(identity.projectId)}/env?decrypt=false`, identity);
    const afterSummary = summarize(after.json?.envs ?? []);
    evidence.observed.after = afterSummary;
    const keyNow = afterSummary.filter((entry) => entry.key === KEY_NAME && (entry.target ?? []).includes("production"));
    const versionNow = afterSummary.filter((entry) => entry.key === VERSION_NAME && (entry.target ?? []).includes("production"));
    record("production_key_present_exactly_once", keyNow.length === 1 && keyNow[0].type === "sensitive", `${KEY_NAME}: ${keyNow.length} Production entries, type ${keyNow[0]?.type ?? "none"}`);
    record("production_key_version_present", versionNow.length === 1, `${VERSION_NAME}: ${versionNow.length} Production entries`);
    const pseudonymNow = afterSummary.filter((entry) => entry.key === PSEUDONYM_NAME && (entry.target ?? []).includes("production"));
    record("production_pseudonym_secret_present_exactly_once", pseudonymNow.length === 1 && pseudonymNow[0].type === "sensitive", `${PSEUDONYM_NAME}: ${pseudonymNow.length} Production entries, type ${pseudonymNow[0]?.type ?? "none"}`);
    record("pseudonym_secret_retained_if_it_existed", existingPseudonym.length === 0 || pseudonymNow[0].id === existingPseudonym[0].id, existingPseudonym.length ? "same variable id as before" : "newly created");
    record("key_retained_if_it_existed", existingKey.length === 0 || keyNow[0].id === existingKey[0].id, existingKey.length ? "same variable id as before" : "newly created");
    persist(true);
    console.log("PRODUCTION LEGAL AID KEYS READY — the next Production build carries them; no deployment was created");
  }
} catch (error) {
  const failure = error instanceof Error ? error.message : String(error);
  persist(false, failure);
  console.error(`PRODUCTION LEGAL AID KEYS REFUSED — ${failure}`);
  process.exit(1);
}
