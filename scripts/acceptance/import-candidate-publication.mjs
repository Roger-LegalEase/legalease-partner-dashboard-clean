#!/usr/bin/env node
// Import a real worker publication (and, later, its read-only image acceptance) into
// data/rcap-render/worker-publication-evidence.json, in the exact shape the lifecycle
// verifiers read, from nothing but a GitHub Actions run id. Every byte comes from the
// run: metadata, jobs, log and the publication artifact. Nothing is typed in.
//
//   node scripts/acceptance/import-candidate-publication.mjs --run-id <id> [--rehearsal-only]
//   node scripts/acceptance/import-candidate-publication.mjs --acceptance-run-id <id>
//   node scripts/acceptance/import-candidate-publication.mjs --self-test-publication <id>
//   node scripts/acceptance/import-candidate-publication.mjs --self-test-acceptance <id>
//
// --rehearsal-only is REQUIRED for a candidate publication (containedIn pull/<n>) and
// REFUSED for a release publication; it marks the evidence for the rehearsal-only rule
// in verify-pinned-worker-successor.mjs. Self-tests rebuild an existing run into a temp
// directory and compare with the committed evidence; they write nothing under data/.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createWorkerInputPlan } from "../rcap-hosted-acceptance-worker-input-plan.mjs";

const EVIDENCE = "data/rcap-render/worker-publication-evidence.json";
const PUBLISH_WORKFLOW = ".github/workflows/publish-rcap-render-worker.yml";
const ACCEPT_WORKFLOW = ".github/workflows/rcap-worker-image-acceptance.yml";
const ENTRY = "rcap-render-worker-publication.json";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const ref = (rel, bytes) => ({ path: rel, bytes: bytes.length, sha256: sha256(bytes) });
const fail = (message) => { console.error(`REFUSED: ${message}`); process.exit(2); };
const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };

const root = process.cwd();
const repo = execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf8" }).trim().replace(/.*github\.com[:/]/, "").replace(/\.git$/, "");
const gh = (args, binary = false) => execFileSync("gh", args, { cwd: root, encoding: binary ? "buffer" : "utf8", maxBuffer: 1 << 28 });

function realRunId(value, label) {
  // A placeholder is not a run: refuse anything that is not a plain run number.
  if (value === undefined) fail(`${label} is required (a real GitHub Actions run id); nothing was written`);
  if (!/^[0-9]{8,}$/.test(value)) fail(`${label} ${JSON.stringify(value)} is not a run id; a placeholder such as <RUN_ID> is never accepted`);
  return value;
}

function fetchRun(runId, workflowPath, jobName) {
  const runBytes = gh(["api", `repos/${repo}/actions/runs/${runId}`], true);
  const run = JSON.parse(runBytes);
  if (run.path !== workflowPath) fail(`run ${runId} is ${run.path}, not ${workflowPath}`);
  if (run.event !== "workflow_dispatch" || run.status !== "completed" || run.conclusion !== "success") fail(`run ${runId} is ${run.event}/${run.status}/${run.conclusion}; only a completed successful workflow_dispatch run can be imported`);
  const jobsBytes = gh(["api", `repos/${repo}/actions/runs/${runId}/jobs`], true);
  const jobs = JSON.parse(jobsBytes);
  if (jobs.jobs.length !== 1 || jobs.jobs[0].name !== jobName) fail(`run ${runId} must have exactly one job named ${JSON.stringify(jobName)}`);
  const job = jobs.jobs[0];
  if (!job.steps.every((s) => s.status === "completed" && s.conclusion === "success")) fail(`run ${runId}: not every native step succeeded`);
  const logBytes = Buffer.from(gh(["run", "view", String(runId), "--repo", repo, "--log"]), "utf8");
  return { run, runBytes, jobs, jobsBytes, job, logBytes };
}

function buildPublication(runId, { rehearsalOnly, outDir, current }) {
  const { run, runBytes, jobsBytes, job, logBytes } = fetchRun(runId, PUBLISH_WORKFLOW, "Publish rcap-render-worker by immutable digest");
  const artifacts = JSON.parse(gh(["api", `repos/${repo}/actions/runs/${runId}/artifacts`])).artifacts.filter((a) => a.name.startsWith("rcap-render-worker-publication-"));
  if (artifacts.length !== 1) fail(`run ${runId} has ${artifacts.length} publication artifacts; expected exactly one`);
  const artifactMeta = artifacts[0];
  if (artifactMeta.expired) fail(`publication artifact ${artifactMeta.id} has expired; the native bytes cannot be retained`);
  const zipBytes = gh(["api", `repos/${repo}/actions/artifacts/${artifactMeta.id}/zip`], true);
  if (artifactMeta.digest && artifactMeta.digest !== `sha256:${sha256(zipBytes)}`) fail(`downloaded ZIP sha256 does not match the GitHub artifact digest`);
  const dir = path.join(outDir, `hosted-acceptance-evidence/worker/publication-${runId}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "publication.zip"), zipBytes);
  const jsonBytes = execFileSync("unzip", ["-p", path.join(dir, "publication.zip"), ENTRY]);
  const artifact = JSON.parse(jsonBytes);
  if (artifact.schemaVersion !== "rcap-worker-publication/v1") fail(`unexpected artifact schema ${artifact.schemaVersion}`);
  if (artifactMeta.name !== `rcap-render-worker-publication-${artifact.sourceSha}`) fail(`artifact name does not name the built source ${artifact.sourceSha}`);
  if (run.head_sha !== artifact.workflowSourceSha) fail(`run head ${run.head_sha} is not the artifact's workflowSourceSha`);
  if (!/^sha256:[a-f0-9]{64}$/.test(artifact.immutableRegistryDigest)) fail(`artifact digest ${JSON.stringify(artifact.immutableRegistryDigest)} is not a sha256 digest`);
  const log = logBytes.toString("utf8");
  if (!log.includes(artifact.sourceSha) || !log.includes(artifact.immutableRegistryDigest)) fail(`native log does not name the built source and digest`);
  const candidate = /^pull\/[0-9]+$/.test(artifact.containedIn);
  if (candidate && !rehearsalOnly) fail(`${artifact.containedIn} is a candidate publication; it is admitted only with --rehearsal-only`);
  if (!candidate && rehearsalOnly) fail(`a release publication (containedIn ${artifact.containedIn}) cannot be marked rehearsal-only`);
  for (const [name, bytes] of [["run.json", runBytes], ["jobs.json", jobsBytes], ["native.log", logBytes], [ENTRY, jsonBytes]]) fs.writeFileSync(path.join(dir, name), bytes);
  const rel = (name) => `hosted-acceptance-evidence/worker/publication-${runId}/${name}`;
  const plan = createWorkerInputPlan({ rootDir: root, acceptedSourceSha: artifact.sourceSha, acceptedDigest: artifact.immutableRegistryDigest, candidateSha: artifact.sourceSha });
  const evidence = {
    ...artifact,
    workflowRunId: Number(artifact.workflowRunId),
    workflowRunAttempt: run.run_attempt,
    workflowConclusion: run.conclusion,
    jobId: job.id,
    publicationTimestamp: artifactMeta.created_at,
    publicationArtifactId: artifactMeta.id,
    publicationArtifactName: artifactMeta.name,
    publicationArtifactSha256: `sha256:${sha256(zipBytes)}`,
    originalPublicationBytes: jsonBytes.length,
    originalPublicationSha256: sha256(jsonBytes),
    originalPublicationSource: `Native publication artifact downloaded from successful run ${runId}; ZIP SHA256 matches GitHub artifact digest; exact JSON retained inline. Only workflowRunId normalized to numeric ledger representation.`,
    nativePublication: { artifactUrl: artifactMeta.url, archiveDownloadUrl: artifactMeta.archive_download_url, archiveBytes: zipBytes.length, archiveSha256: sha256(zipBytes), entry: ENTRY, originalJson: jsonBytes.toString("utf8") },
    nativeRunMetadata: ref(rel("run.json"), runBytes),
    nativeJobMetadata: ref(rel("jobs.json"), jobsBytes),
    nativeLog: ref(rel("native.log"), logBytes),
    workerInputFingerprint: plan.aggregateInputSha256,
    runtimeAccepted: false,
    supersededPublication: current,
    supersededPublicationSha256: sha256(fs.readFileSync(path.join(root, EVIDENCE))),
    supersededChain: current.supersededChain,
    nativeArchive: ref(rel("publication.zip"), zipBytes),
    originalPublicationPath: rel(ENTRY),
    originalArchivePath: rel("publication.zip"),
    ...(rehearsalOnly ? { rehearsalOnly: true } : {})
  };
  return { evidence, artifact, plan };
}

function buildAcceptance(runId, evidence, outDir) {
  const { run, runBytes, jobsBytes, job, logBytes } = fetchRun(runId, ACCEPT_WORKFLOW, "Accept the published worker image");
  const log = logBytes.toString("utf8");
  for (const marker of [`accepting ${evidence.digestPinnedReference} built from ${evidence.sourceSha}`, `tag currently resolves to: ${evidence.immutableRegistryDigest}`, "SOURCE BINDING: PASS"])
    if (!log.includes(marker)) fail(`acceptance log lacks ${JSON.stringify(marker)}; this run did not accept this publication`);
  const dir = path.join(outDir, `hosted-acceptance-evidence/worker/acceptance-${runId}`);
  fs.mkdirSync(dir, { recursive: true });
  const rel = (name) => `hosted-acceptance-evidence/worker/acceptance-${runId}/${name}`;
  const receipt = { runId: Number(runId), jobId: job.id, workflowSourceSha: run.head_sha, sourceSha: evidence.sourceSha, digest: evidence.immutableRegistryDigest, readOnly: true, conclusion: run.conclusion,
    verificationSource: "Native successful run/jobs and exact subject in native acceptance log; all workflow steps succeeded." };
  const receiptBytes = Buffer.from(JSON.stringify(receipt, null, 2) + "\n");
  for (const [name, bytes] of [["run.json", runBytes], ["jobs.json", jobsBytes], ["native.log", logBytes], ["verification-receipt.json", receiptBytes]]) fs.writeFileSync(path.join(dir, name), bytes);
  return { runId: Number(runId), jobId: job.id, runAttempt: run.run_attempt, workflowSourceSha: run.head_sha, sourceSha: evidence.sourceSha, tag: evidence.imageTag, digest: evidence.immutableRegistryDigest,
    readOnly: true, conclusion: run.conclusion, nativeRunMetadata: ref(rel("run.json"), runBytes), nativeJobMetadata: ref(rel("jobs.json"), jobsBytes), nativeLog: ref(rel("native.log"), logBytes), verificationReceipt: ref(rel("verification-receipt.json"), receiptBytes) };
}

const current = JSON.parse(fs.readFileSync(path.join(root, EVIDENCE), "utf8"));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

if (arg("--self-test-publication") !== undefined) {
  const runId = realRunId(arg("--self-test-publication"), "--self-test-publication");
  if (String(current.workflowRunId) !== runId) fail(`self-test needs the committed publication's run (${current.workflowRunId}), got ${runId}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "import-selftest-"));
  const { evidence } = buildPublication(runId, { rehearsalOnly: false, outDir: tmp, current });
  const skip = new Set(["runtimeAccepted", "imageAcceptance", "registryPullByDigestStatus", "supersededPublication", "supersededPublicationSha256", "supersededChain"]);
  const differences = Object.keys(evidence).filter((k) => !skip.has(k) && !same(evidence[k], current[k]));
  const missing = Object.keys(current).filter((k) => !skip.has(k) && !(k in evidence));
  console.log(JSON.stringify({ selfTest: "publication", runId, compared: Object.keys(evidence).length - skip.size, differences, missingFromRebuild: missing, nativeBytesIdentical: ["nativeRunMetadata", "nativeJobMetadata", "nativeLog", "nativeArchive"].every((k) => same(evidence[k], current[k])) }));
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(differences.length || missing.length ? 1 : 0);
}
if (arg("--self-test-acceptance") !== undefined) {
  const runId = realRunId(arg("--self-test-acceptance"), "--self-test-acceptance");
  if (String(current.imageAcceptance?.runId) !== runId) fail(`self-test needs the committed acceptance run (${current.imageAcceptance?.runId}), got ${runId}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "import-selftest-"));
  const acceptance = buildAcceptance(runId, current, tmp);
  const differences = Object.keys(acceptance).filter((k) => !same(acceptance[k], current.imageAcceptance[k]));
  console.log(JSON.stringify({ selfTest: "acceptance", runId, differences }));
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(differences.length ? 1 : 0);
}
if (arg("--acceptance-run-id") !== undefined) {
  const runId = realRunId(arg("--acceptance-run-id"), "--acceptance-run-id");
  if (current.runtimeAccepted) fail(`the committed publication (run ${current.workflowRunId}) is already accepted`);
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "import-acceptance-"));
  const imageAcceptance = buildAcceptance(runId, current, staging);
  fs.cpSync(staging, root, { recursive: true });
  fs.rmSync(staging, { recursive: true, force: true });
  const next = { ...current, runtimeAccepted: true, imageAcceptance, registryPullByDigestStatus: "succeeded_authenticated_read_only" };
  fs.writeFileSync(path.join(root, EVIDENCE), JSON.stringify(next, null, 2) + "\n");
  console.log(JSON.stringify({ imported: "acceptance", runId, sourceSha: next.sourceSha, digest: next.immutableRegistryDigest, rehearsalOnly: next.rehearsalOnly === true }));
  process.exit(0);
}
const runId = realRunId(arg("--run-id"), "--run-id");
if (String(current.workflowRunId) === runId) fail(`run ${runId} is already the committed publication`);
// Build and validate in a temp directory; only a fully validated import reaches the checkout.
const staging = fs.mkdtempSync(path.join(os.tmpdir(), "import-publication-"));
const { evidence, plan } = buildPublication(runId, { rehearsalOnly: process.argv.includes("--rehearsal-only"), outDir: staging, current });
fs.cpSync(staging, root, { recursive: true });
fs.rmSync(staging, { recursive: true, force: true });
fs.writeFileSync(path.join(root, EVIDENCE), JSON.stringify(evidence, null, 2) + "\n");
console.log(JSON.stringify({ imported: "publication", runId, sourceSha: evidence.sourceSha, containedIn: evidence.containedIn, rehearsalOnly: evidence.rehearsalOnly === true, digest: evidence.immutableRegistryDigest, workerInputFingerprint: evidence.workerInputFingerprint, canonicalInputs: plan.canonicalInputs.length, wrote: [EVIDENCE, evidence.originalPublicationPath, evidence.originalArchivePath, evidence.nativeRunMetadata.path, evidence.nativeJobMetadata.path, evidence.nativeLog.path] }));
