#!/usr/bin/env node
// Proves that the production render worker is actually executing: one
// started Fly.io Machine running the exact accepted image, exporting the exact
// digest, with restart-always and no inbound services, and a production queue
// that is being served (no claimable job older than the ten-minute alert
// threshold in docs/RCAP_RENDER_WORKER_DEPLOYMENT.md).
//
// Read-only. The database check is one aggregate query through the Supabase
// Management API in read-only mode: counts only, no customer row, no write.
// Secrets are read from the environment and never printed.

import fs from "node:fs";
import path from "node:path";

const FLY_APP_NAME = process.env.FLY_APP_NAME || "legalease-rcap-render-worker";
const FLY_MACHINES_API = "https://api.machines.dev";
const PRODUCTION_PROJECT_REF = process.env.RCAP_PRODUCTION_PROJECT_REF || "wwtwtsmywnckfkdaqqeg";
const WORKER_SOURCE_SHA = process.env.RCAP_WORKER_SOURCE_SHA ?? "";
const WORKER_DIGEST = process.env.RCAP_WORKER_DIGEST ?? "";
const FLY_IMAGE_DIGEST = process.env.RCAP_FLY_IMAGE_DIGEST ?? null;
const STALE_QUEUE_MINUTES = 10;
const EVIDENCE_DIR = path.resolve("production-worker-evidence");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, "production-worker-execution.json");

const evidence = {
  schemaVersion: "rcap-production-worker-execution/v1",
  verifiedAtUtc: new Date().toISOString(),
  executionTarget: { provider: "Fly.io Machines", app: FLY_APP_NAME, config: "deploy/rcap-render-worker/fly.toml" },
  workerSourceSha: WORKER_SOURCE_SHA,
  workerDigest: WORKER_DIGEST,
  productionProjectRef: PRODUCTION_PROJECT_REF,
  productionDatabaseMutated: false,
  customerRowsRead: false,
  checks: []
};

function record(id, passed, observed) {
  evidence.checks.push({ id, passed, observed });
  console.log("  " + (passed ? "ok  " : "FAIL") + " " + id + " — " + observed);
  return passed;
}

function persist() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + "\n");
}

async function flyRequest(pathname) {
  const token = process.env.FLY_API_TOKEN;
  if (!token) throw new Error("FLY_API_TOKEN is absent");
  const response = await fetch(FLY_MACHINES_API + pathname, {
    method: "GET",
    redirect: "error",
    headers: { Authorization: "Bearer " + token, Accept: "application/json" },
    signal: AbortSignal.timeout(20_000)
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

async function managementQuery(query) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is absent");
  const response = await fetch(
    "https://api.supabase.com/v1/projects/" + encodeURIComponent(PRODUCTION_PROJECT_REF) + "/database/query",
    {
      method: "POST",
      redirect: "error",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ query, read_only: true }),
      signal: AbortSignal.timeout(20_000)
    }
  );
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

async function main() {
  if (!/^[a-f0-9]{40}$/.test(WORKER_SOURCE_SHA) || !/^sha256:[a-f0-9]{64}$/.test(WORKER_DIGEST)) {
    throw new Error("exact worker source SHA and digest are required");
  }

  const machines = await flyRequest("/v1/apps/" + encodeURIComponent(FLY_APP_NAME) + "/machines");
  const list = Array.isArray(machines.json) ? machines.json : [];
  if (!record(
    "single_production_worker_machine_exists",
    machines.status === 200 && list.length === 1,
    "status=" + machines.status + "; machines=" + list.length
  )) throw new Error("exactly one production worker machine is required");

  const machine = list[0];
  const config = machine?.config ?? {};
  const imageRef = machine?.image_ref ?? {};
  const labels = imageRef?.labels ?? {};
  evidence.machine = {
    id: machine?.id ?? null,
    region: machine?.region ?? null,
    state: machine?.state ?? null,
    image: config?.image ?? null,
    imageDigest: imageRef?.digest ?? null,
    ociRevision: labels["org.opencontainers.image.revision"] ?? null,
    restartPolicy: config?.restart?.policy ?? null,
    memoryMb: config?.guest?.memory_mb ?? null,
    services: Array.isArray(config?.services) ? config.services.length : 0
  };

  record("worker_machine_is_started", machine?.state === "started", "state=" + machine?.state);
  record(
    "worker_machine_runs_the_exact_image",
    (FLY_IMAGE_DIGEST ? imageRef?.digest === FLY_IMAGE_DIGEST : true)
      && labels["org.opencontainers.image.revision"] === WORKER_SOURCE_SHA,
    "image_ref digest " + (imageRef?.digest ?? "(none)") + (FLY_IMAGE_DIGEST ? " vs mirrored " + FLY_IMAGE_DIGEST : " (mirror digest not supplied)")
      + "; OCI revision " + (labels["org.opencontainers.image.revision"] ?? "(none)")
  );
  record(
    "worker_exports_the_accepted_digest",
    config?.env?.RCAP_WORKER_CONTAINER_DIGEST === WORKER_DIGEST
      && config?.env?.ENABLE_SUPABASE_PARTNER_DATA === "true",
    "RCAP_WORKER_CONTAINER_DIGEST " + (config?.env?.RCAP_WORKER_CONTAINER_DIGEST === WORKER_DIGEST ? "exact" : "mismatch")
      + "; ENABLE_SUPABASE_PARTNER_DATA=" + (config?.env?.ENABLE_SUPABASE_PARTNER_DATA ?? "(unset)")
  );
  record(
    "worker_machine_restarts_always_and_serves_no_inbound",
    config?.restart?.policy === "always" && (!Array.isArray(config?.services) || config.services.length === 0),
    "restart=" + (config?.restart?.policy ?? "(none)") + "; services=" + evidence.machine.services
  );
  record(
    "worker_machine_has_render_memory",
    Number(config?.guest?.memory_mb ?? 0) >= 1024,
    "memory_mb=" + (config?.guest?.memory_mb ?? "(none)")
  );

  const queue = await managementQuery(
    "select"
      + " count(*) filter (where status = 'queued' and coalesce(next_attempt_at, created_at) < now() - interval '" + STALE_QUEUE_MINUTES + " minutes') as stale_queued,"
      + " count(*) filter (where status = 'queued') as queued,"
      + " count(*) filter (where status = 'claimed') as claimed,"
      + " count(*) filter (where status = 'failed' and failure_disposition = 'terminal') as terminal_failed"
      + " from public.packet_render_jobs"
  );
  const row = Array.isArray(queue.json) ? queue.json[0] : null;
  evidence.queue = row ? {
    staleQueued: Number(row.stale_queued), queued: Number(row.queued),
    claimed: Number(row.claimed), terminalFailed: Number(row.terminal_failed)
  } : null;
  record(
    "production_queue_age_within_alert_threshold",
    queue.status === 200 && row !== null && Number(row.stale_queued) === 0,
    "status=" + queue.status + "; stale_queued=" + (row?.stale_queued ?? "(unreadable)") + "; queued=" + (row?.queued ?? "?")
      + "; claimed=" + (row?.claimed ?? "?") + " (aggregate counts only)"
  );
  record(
    "production_terminal_backlog_is_empty",
    row !== null && Number(row.terminal_failed) === 0,
    "terminal_failed=" + (row?.terminal_failed ?? "(unreadable)")
  );

  const failed = evidence.checks.filter((check) => !check.passed);
  evidence.result = failed.length ? "FAIL" : "PASS";
  persist();
  if (failed.length) {
    console.error("PRODUCTION WORKER EXECUTION NOT PROVEN — " + failed.map((check) => check.id).join(", "));
    process.exit(1);
  }
  console.log("PRODUCTION WORKER EXECUTION PROVEN — exact image running on the production execution target; queue served");
}

main().catch((error) => {
  evidence.result = "REFUSED";
  evidence.failure = String(error?.message ?? error);
  persist();
  console.error("PRODUCTION WORKER EXECUTION REFUSED — " + evidence.failure);
  process.exit(1);
});
