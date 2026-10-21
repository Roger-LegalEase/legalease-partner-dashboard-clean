#!/usr/bin/env node
/**
 * Lane H hosted acceptance runner: preflight, journey plan and evidence index.
 *
 * The hosted run cannot start until Captain A supplies four things -- the exact
 * candidate SHA, the exact Preview URL, the exact synthetic tenant and event,
 * and the exact synthetic participant identities. Everything that does not
 * depend on them is done here in advance, so the moment they arrive the run is
 * a single command rather than a construction job.
 *
 * The preflight is a refusal surface first. Production is out of bounds for
 * this lane in every direction: no Production host, no Production Supabase
 * project, no live-mode Stripe key, no real participant, no credit consumption,
 * no activation, canary, smoke or Clinic migration tool. Those are checked
 * before any journey step is planned, and a violation stops the run.
 *
 *   node scripts/security/clinic-hosted-acceptance-runner.mjs --plan
 *   node scripts/security/clinic-hosted-acceptance-runner.mjs \
 *     --candidate-sha <40 hex> --preview-url https://<preview>.vercel.app \
 *     --tenant <slug> --event <slug> --participants a@x.test,b@x.test
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Tools this lane must never invoke, by the sprint's stop conditions. */
export const PROHIBITED_TOOLS = Object.freeze([
  "verify-rcap-production-activation",
  "verify-rcap-production-canary",
  "verify-rcap-production-smoke",
  "rcap-production-clinic-migrate",
  "verify-rcap-production-clinic-migrate",
  "rcap-hosted-clinic-migrate",
  "verify-rcap-hosted-clinic-migrate"
]);

/** Hosts and values that mean the target is Production, not a Preview. */
const PRODUCTION_HOST_PATTERNS = [
  /(^|\.)expungement\.ai$/iu,
  /(^|\.)legalease\.com$/iu,
  /(^|\.)legalease\.ai$/iu,
  /(^|\.)wilma\.legal$/iu
];

export const RCAP_JOURNEY = Object.freeze([
  "partner_or_event_entry", "screening", "result", "authentication", "atomic_claim",
  "participant_owned_matter", "sponsorship_presentation", "single_credit", "packet",
  "private_briefcase", "download", "repeat_download"
]);

export const CLINIC_JOURNEY = Object.freeze([
  "staff_entry", "participant_session", "consent", "screening_and_result",
  "participant_owned_matter", "packet_or_truthful_guidance", "reset_device",
  "back_forward_denial", "clean_second_participant"
]);

export const SECURITY_PROBES = Object.freeze([
  "cross_user_denial", "cross_matter_denial", "cross_tenant_denial", "wrong_role_denial",
  "private_artifact", "expired_signed_url", "substituted_object", "telemetry_inspection"
]);

export function parseRunnerArgs(argv, environment = process.env) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unknown argument: ${token}`);
    const key = token.slice(2);
    if (key === "plan") { args.set("plan", "true"); continue; }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`--${key} requires a value`);
    args.set(key, value);
    index += 1;
  }

  const plan = args.get("plan") === "true";
  if (plan) return { plan: true, inputs: null, environment };

  const candidateSha = args.get("candidate-sha") ?? "";
  if (!/^[0-9a-f]{40}$/u.test(candidateSha)) {
    throw new Error("--candidate-sha must be the exact 40-character candidate SHA supplied by Captain A");
  }

  const previewUrl = args.get("preview-url") ?? "";
  const preview = parsePreviewUrl(previewUrl);

  const tenant = args.get("tenant") ?? "";
  const event = args.get("event") ?? "";
  for (const [name, value] of [["--tenant", tenant], ["--event", event]]) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)) throw new Error(`${name} must be the exact synthetic slug supplied by Captain A`);
  }

  const participants = (args.get("participants") ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
  if (participants.length < 2) {
    throw new Error("--participants requires at least two synthetic identities: the handover is the point of the Clinic journey");
  }
  for (const participant of participants) assertSyntheticIdentity(participant);

  return { plan: false, inputs: { candidateSha, previewUrl: preview.href, tenant, event, participants }, environment };
}

function parsePreviewUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("--preview-url must be the exact Preview URL supplied by Captain A");
  }
  if (url.protocol !== "https:") throw new Error("--preview-url must be https");
  if (PRODUCTION_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    throw new Error(`Refusing to run: ${url.hostname} is a Production host and this lane does not touch Production`);
  }
  return url;
}

/**
 * A synthetic identity must be recognisable as synthetic. This lane never
 * creates a real participant, so an address on a deliverable domain is refused
 * rather than treated as a naming preference.
 */
function assertSyntheticIdentity(identity) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(identity)) {
    throw new Error(`Participant identity is not an address: ${identity}`);
  }
  const domain = identity.split("@")[1].toLowerCase();
  const synthetic = domain.endsWith(".test") || domain.endsWith(".invalid") || domain.endsWith(".example")
    || domain === "example.com" || domain === "example.org" || domain === "example.net";
  if (!synthetic) {
    throw new Error(`Refusing to run: ${identity} is not on a reserved synthetic domain, and this lane never creates a real participant`);
  }
}

/**
 * Environment-level refusals. These are checked separately from the arguments
 * because a correct Preview URL with a live Stripe key in the environment is
 * still a run this lane must not perform.
 */
export function assertNoProductionExposure(environment) {
  const violations = [];
  for (const [name, value] of Object.entries(environment)) {
    if (typeof value !== "string" || value === "") continue;
    if (/^STRIPE_.*(SECRET|KEY)/u.test(name) && value.startsWith("sk_live_")) {
      violations.push(`${name} holds a live-mode Stripe key`);
    }
    if (/PRODUCTION/u.test(name) && /^(1|true|yes|on)$/iu.test(value)) {
      violations.push(`${name} is enabled`);
    }
    if (/SUPABASE_URL$/u.test(name)) {
      try {
        const host = new URL(value).hostname;
        if (PRODUCTION_HOST_PATTERNS.some((pattern) => pattern.test(host))) violations.push(`${name} points at ${host}`);
      } catch {}
    }
    if (/(ALLOW|ENABLE)_(REAL_PARTICIPANTS|CREDIT_CONSUMPTION|DOMAIN_ACTIVATION)/u.test(name) && /^(1|true|yes|on)$/iu.test(value)) {
      violations.push(`${name} is enabled`);
    }
  }
  if (violations.length > 0) {
    throw new Error(`Refusing to run against Production-adjacent configuration:\n  - ${violations.join("\n  - ")}`);
  }
  return true;
}

export function buildJourneyPlan(inputs) {
  const step = (phase, id, index) => ({
    phase,
    id,
    order: index + 1,
    // Every step captures the same evidence kinds so the index is uniform and
    // a missing capture is visible rather than inferred.
    evidence: ["screenshot", "console", "network"],
    status: "pending"
  });
  return {
    schemaVersion: 1,
    lane: "H",
    generatedBy: "scripts/security/clinic-hosted-acceptance-runner.mjs",
    candidateSha: inputs?.candidateSha ?? null,
    previewUrl: inputs?.previewUrl ?? null,
    tenant: inputs?.tenant ?? null,
    event: inputs?.event ?? null,
    participants: inputs?.participants ?? [],
    productionTouched: false,
    prohibitedTools: [...PROHIBITED_TOOLS],
    steps: [
      ...RCAP_JOURNEY.map((id, index) => step("rcap", id, index)),
      ...CLINIC_JOURNEY.map((id, index) => step("clinic", id, index)),
      ...SECURITY_PROBES.map((id, index) => step("security", id, index))
    ]
  };
}

export function writeEvidenceIndex(plan, directory) {
  fs.mkdirSync(directory, { recursive: true });
  const indexPath = path.join(directory, "lane-h-hosted-acceptance-index.json");
  fs.writeFileSync(indexPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return indexPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const { plan, inputs, environment } = parseRunnerArgs(process.argv.slice(2));
    assertNoProductionExposure(environment);
    const journeyPlan = buildJourneyPlan(inputs);
    if (plan) {
      console.log(JSON.stringify(journeyPlan, null, 2));
      console.log(`\nPlan only: ${journeyPlan.steps.length} steps ready. Supply --candidate-sha, --preview-url, --tenant, --event and --participants to execute.`);
      process.exit(0);
    }
    const indexPath = writeEvidenceIndex(journeyPlan, path.join(root, "hosted-acceptance-evidence"));
    console.log(`Preflight passed for ${journeyPlan.previewUrl} at ${journeyPlan.candidateSha}.`);
    console.log(`Evidence index: ${path.relative(root, indexPath)}`);
    console.log(`${journeyPlan.steps.length} steps pending execution against the pinned Preview. Production untouched.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
