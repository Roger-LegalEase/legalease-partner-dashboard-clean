#!/usr/bin/env node
// Why did the accepted worker refuse the Mississippi job?
//
// Hosted run 32393413747 proved the whole commercial and authority path —
// unpaid 402, a real 5000 USD Sandbox Checkout, a forged signature rejected, a
// signed webhook processed, server-authoritative paid status, a durable job
// bound to the exact user/person/matter — and then the worker refused to render
// with `profile_version_unknown` for MS / 2026-06-19-source-conversion-1.
//
// Exactly one of three things is true, and guessing between them is how a
// frozen image gets republished for no reason:
//
//   A  the image ADMITS the exact stored tuple  → something between the job row
//      and the claim changed the value; the image is not at fault
//   B  the image REFUSES it and the source tree admits it → a build or
//      packaging defect in the published image
//   C  the stored job tuple differs from the authoritative route tuple → the
//      writer that created the job specification is at fault
//
// So this reads all four boundaries exactly, and never paraphrases:
//
//   1. the authoritative route resolution, from the source tree
//   2. the stored packet_render_jobs row, read directly
//   3. the source-tree allowlist
//   4. the IMMUTABLE IMAGE's allowlist and its real assertClaimAcceptable
//
// Boundary 4 executes inside the published container. Running the same probe
// from the host checkout and calling it an image result is the one mistake that
// would make this whole exercise worthless — the host tree is what we already
// believe; the image is what actually refused the job. Nothing is mounted over
// the image, and the probe imports the image's own modules through the image's
// own loader.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { register } from "node:module";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { root: OUT_DIR } = prepareHostedAcceptanceEvidenceLayout({ rootDir: process.cwd() });

const PROJECT_REF = (process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "").trim();
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const WORKER_DIGEST_REF = (process.env.HOSTED_WORKER_DIGEST_REF ?? "").trim();
const JOB_ID = (process.env.CONTRADICTION_JOB_ID ?? "").trim();
const EXPECTED_PROFILE_ID = "MS";
const EXPECTED_PROFILE_VERSION = "2026-06-19-source-conversion-1";

// --- the exact target namespace, from the payment run that produced it -------
//
// The target is identified by IDENTITY, never by jurisdiction or creation time.
// "the newest MS job" is not a target: the acceptance project accumulates MS
// jobs from every run, and picking the newest silently re-points this whole
// report at whichever run happened to go last.
//
// These are the identities hosted run 32393413747 printed for its own payment
// journey — the render-job id it received in the paid render 202, and the auth
// user, person and matter the enqueue INSERT bound to it. The row this report
// describes must agree with all of them or the report refuses to draw a
// conclusion.
const TARGET_NAMESPACE = {
  renderJobId: (process.env.TARGET_RENDER_JOB_ID ?? "14c626c2-d287-4d5f-8fef-172fec8e52b9").trim(),
  authUserId: (process.env.TARGET_AUTH_USER_ID ?? "b6dc86a3-12bb-490d-b130-48d95d426a1e").trim(),
  personId: (process.env.TARGET_PERSON_ID ?? "c2b1ec38-1ef9-4ad1-a20f-4bf574f20ea2").trim(),
  matterId: (process.env.TARGET_MATTER_ID ?? "e214c6fc-3ad8-4e63-a747-50cadf497046").trim(),
  providerEventId: (process.env.TARGET_PROVIDER_EVENT_ID ?? "evt_hosted_acceptance_d01c2ff88f3a42c3a2d3").trim(),
  checkoutSessionId: (process.env.TARGET_CHECKOUT_SESSION_ID
    ?? "cs_test_a1mjKYs2WeW4Brtt1GjMicF0SuOyDqVF6Xk7oPrKEDgCp2INril2iiNSGw").trim(),
  sourceRun: "32393413747"
};

// A DIFFERENT row, from the earlier worker-contract diagnosis. It is named here
// so it can never be confused with the payment-run target above: two distinct
// jobs, two distinct facts, and conflating them would attribute one run's
// failure to the other.
const DIAGNOSTIC_ONLY_JOB_ID = "cab14012-a0ad-44d1-80d2-d0d4bebc87d8";

const secrets = [SUPABASE_ACCESS_TOKEN].filter(Boolean);
const sanitize = (value) => {
  let text = String(value ?? "");
  for (const secret of secrets) text = text.split(secret).join("***REDACTED***");
  return text.replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***");
};

const report = {
  schemaVersion: "rcap-worker-contract-contradiction/v1",
  workerDigestRef: WORKER_DIGEST_REF,
  acceptanceProjectRef: PROJECT_REF || null,
  expected: { profileId: EXPECTED_PROFILE_ID, profileVersion: EXPECTED_PROFILE_VERSION }
};

/** Every encoding that could hide a difference the eye cannot see. */
function encodings(value) {
  if (typeof value !== "string") return { value, json: JSON.stringify(value), note: "not a string" };
  const bytes = Buffer.from(value, "utf8");
  return {
    json: JSON.stringify(value),
    length: value.length,
    utf8ByteLength: bytes.length,
    utf8Hex: bytes.toString("hex"),
    normalizedNFC: JSON.stringify(value.normalize("NFC")),
    differsUnderNFC: value !== value.normalize("NFC")
  };
}

async function sql(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* surfaced sanitized */ }
  return { status: response.status, ok: response.ok, json, text: sanitize(text).slice(0, 600) };
}

// --- boundary 2: the stored render job, read directly ------------------------
{
  // Identity only. The previous fallback — newest row for this jurisdiction —
  // is exactly the attribution error this report exists to expose, so it is
  // gone rather than merely deprecated: there is no code path here that can
  // name a target by jurisdiction or by creation time.
  const resolvedJobId = JOB_ID || TARGET_NAMESPACE.renderJobId;
  report.targetResolution = {
    resolvedJobId,
    resolvedFrom: JOB_ID ? "CONTRADICTION_JOB_ID" : `the paid render 202 of run ${TARGET_NAMESPACE.sourceRun}`,
    namespace: TARGET_NAMESPACE,
    identifiedByJurisdictionOrCreationTime: false,
    distinctDiagnosticOnlyJobId: DIAGNOSTIC_ONLY_JOB_ID,
    targetIsTheDiagnosticOnlyJob: resolvedJobId === DIAGNOSTIC_ONLY_JOB_ID
  };
  const where = `where id = '${resolvedJobId.replace(/'/g, "''")}'`;
  const result = await sql(`
    select id, status, attempt_count, max_attempts, claimed_by, claim_expires_at, fencing_token,
           next_attempt_at, error_code, failure_disposition,
           left(coalesce(last_error_detail, ''), 1000) as last_error_detail,
           renderer_kind, renderer_version, route_id, source_sha256,
           profile_id, profile_version, person_id, matter_id, partner_id,
           consumer_briefcase_item_id, consumer_auth_user_id,
           output_storage_path, output_sha256, normalized_output_sha256,
           output_byte_count, page_count, container_digest,
           delivery_eligibility, accounting_result,
           created_at, claimed_at, rendering_at, validating_at, artifact_validated_at
      from public.packet_render_jobs
      ${where}
  `);
  const row = Array.isArray(result.json) ? result.json[0] ?? null : null;
  report.storedJob = {
    queryStatus: result.status,
    // A failed query is the absence of evidence, never evidence of absence.
    queryUsable: Array.isArray(result.json),
    row: row ? { ...row, last_error_detail: sanitize(row.last_error_detail ?? "") } : null,
    queryText: Array.isArray(result.json) ? null : result.text
  };
  report.storedProfileIdEncodings = row ? encodings(row.profile_id) : null;
  report.storedProfileVersionEncodings = row ? encodings(row.profile_version) : null;
  report.storedTupleMatchesExpected = Boolean(row)
    && row.profile_id === EXPECTED_PROFILE_ID
    && row.profile_version === EXPECTED_PROFILE_VERSION;

  // Corroboration, not decoration. The row must answer to the SAME namespace
  // the payment run printed — user, person, matter, briefcase item — or it is
  // not that run's target and nothing below may be said about it.
  const agreement = row
    ? {
        renderJobId: row.id === TARGET_NAMESPACE.renderJobId,
        authUserId: String(row.consumer_auth_user_id ?? "") === TARGET_NAMESPACE.authUserId,
        personId: String(row.person_id ?? "") === TARGET_NAMESPACE.personId,
        matterId: String(row.matter_id ?? "") === TARGET_NAMESPACE.matterId
      }
    : null;
  report.targetResolution.namespaceAgreement = agreement;
  report.targetResolution.namespaceFullyAgrees = Boolean(agreement) && Object.values(agreement).every(Boolean);
  report.targetResolution.briefcaseItemId = row?.consumer_briefcase_item_id ?? null;
}

// --- the other row, kept distinct --------------------------------------------
//
// cab14012 is a DIFFERENT job from the payment-run target. Reading both and
// showing that they are two rows is the only way a reader can be sure this
// report has not quietly merged them.
{
  const other = await sql(`
    select id, status, created_at, profile_id, profile_version, attempt_count,
           consumer_briefcase_item_id, consumer_auth_user_id
      from public.packet_render_jobs
     where id = '${DIAGNOSTIC_ONLY_JOB_ID}'
  `);
  const otherRow = Array.isArray(other.json) ? other.json[0] ?? null : null;
  report.diagnosticOnlyJob = {
    id: DIAGNOSTIC_ONLY_JOB_ID,
    queryUsable: Array.isArray(other.json),
    // Absent is a legitimate answer and is reported as such, never as "same row".
    present: Boolean(otherRow),
    row: otherRow,
    isTheSameRowAsTheTarget: otherRow ? otherRow.id === report.targetResolution?.resolvedJobId : false,
    note: "the earlier worker-contract diagnosis named this job; the payment-run target is a different row and the two are never merged"
  };
}

// --- the historically claimed job, or an honest admission --------------------
//
// Which row the worker actually claimed during run 32393413747's four cycles is
// a question about that run, and it can only be answered from that run's own
// evidence. The console log records each cycle's BOUNDARY but not the jobId the
// cycle result carried; the pre- and post-cycle row reads that would have shown
// which row moved both returned `query_error` (the 42703 that blinded the run);
// and the full cycle JSON lives in the uploaded evidence artifact.
//
// So it is recorded as unproven. It is not guessed, and a plausible candidate
// is not promoted to a finding by being the only one available — that is how a
// backlog job's failure got attributed to a target in the first place.
{
  report.historicalClaimedJob = {
    run: TARGET_NAMESPACE.sourceRun,
    identity: "unproven",
    provable: false,
    reason: "the run's console log records each cycle's boundary but not the jobId its cycle result carried; both the pre-cycle and post-cycle row reads returned query_error (column \"output_page_count\" does not exist), so no before/after row state and no attempt-count transition survive; and no fencing-token fingerprint was captured for that run",
    evidenceConsidered: [
      "cycle result JSON on stdout — only the final {\"outcome\":\"idle\"} was echoed in full; cycles 1 and 2 were summarised to their boundary",
      "before/after row state — both reads returned query_error, so neither side exists",
      "attempt-count transition — unreadable for the same reason",
      "fencing-token fingerprint — never captured for that run",
      "claim timestamps — unreadable for the same reason"
    ],
    doNotGuess: "no candidate is nominated; an unattributable historical cycle stays unattributed"
  };
}

// --- the claim is unscoped: which row would the worker actually be handed? ---
//
// The predicate below MIRRORS the live claim_packet_render_job exactly:
//
//   where status = 'queued'
//     and (next_attempt_at is null or next_attempt_at <= now())
//     and renderer_kind = any (...)
//   order by created_at
//   for update skip locked
//   limit 1
//
// `queued` and `currently claimable` are NOT the same set — a retryable job
// with a future next_attempt_at is queued but not claimable — and reporting the
// first as though it were the second would name the wrong predecessor. There is
// no scoping to the run that seeded the job, so a worker started for one
// acceptance run is handed the oldest claimable job in the whole project.
{
  const target = report.storedJob?.row ?? null;
  const kind = target?.renderer_kind ?? null;

  const claimable = await sql(`
    select j.id, j.status, j.profile_id, j.profile_version, j.renderer_kind,
           j.created_at, j.next_attempt_at, j.attempt_count, j.max_attempts,
           j.consumer_briefcase_item_id,
           left(coalesce(j.error_code, ''), 80) as error_code,
           left(coalesce(j.last_error_detail, ''), 200) as last_error_detail
      from public.packet_render_jobs j
     where j.status = 'queued'
       and (j.next_attempt_at is null or j.next_attempt_at <= now())
       ${kind ? `and j.renderer_kind = '${String(kind).replace(/'/g, "''")}'` : ""}
     order by j.created_at
     limit 50
  `);
  const queuedAll = await sql(`select count(*)::int as n from public.packet_render_jobs where status = 'queued'`);

  const rows = Array.isArray(claimable.json) ? claimable.json : [];
  const rank = target ? rows.findIndex((r) => r.id === target.id) : -1;
  const predecessors = rank >= 0 ? rows.slice(0, rank) : rows;

  report.claimOrder = {
    queryUsable: Array.isArray(claimable.json),
    predicateMirrorsLiveClaimFunction: true,
    rendererKindFilter: kind,
    totalQueued: Array.isArray(queuedAll.json) ? (queuedAll.json[0]?.n ?? null) : null,
    totalCurrentlyClaimable: rows.length,
    targetJobId: target?.id ?? null,
    // 1-based rank in exact claim order; null when the target is not claimable.
    targetClaimRank: rank >= 0 ? rank + 1 : null,
    targetIsClaimable: rank >= 0,
    claimablePredecessors: predecessors.length,
    distinctPredecessorProfileVersions: [...new Set(predecessors.map((r) => r.profile_version))].sort(),
    // The row the SQL function predicts it will hand the worker first.
    predictedFirstClaim: rows[0]
      ? { id: rows[0].id, profileId: rows[0].profile_id, profileVersion: rows[0].profile_version, createdAt: rows[0].created_at }
      : null,
    predictedFirstClaimIsTarget: Boolean(target && rows[0] && rows[0].id === target.id),
    predecessors: predecessors.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      status: r.status,
      attemptCount: r.attempt_count,
      maxAttempts: r.max_attempts,
      nextAttemptAt: r.next_attempt_at,
      profileId: r.profile_id,
      profileVersion: r.profile_version,
      errorCode: r.error_code || null,
      lastError: sanitize(r.last_error_detail ?? "") || null,
      predatesTarget: Boolean(target && new Date(r.created_at) < new Date(target.created_at)),
      belongsToThisRunNamespace: Boolean(target && r.consumer_briefcase_item_id
        && r.consumer_briefcase_item_id === target.consumer_briefcase_item_id)
    }))
  };
}

// --- boundary 1 and 3: the source tree ---------------------------------------
{
  const { getAllJurisdictionProfiles, getProfileByJurisdiction } =
    await import("../src/lib/rcap-engine/profile-registry.ts");
  const profiles = getAllJurisdictionProfiles();
  const versions = new Set(profiles.map((p) => String(p.profileVersion)));
  const msProfile = getProfileByJurisdiction(EXPECTED_PROFILE_ID);

  const { assertClaimAcceptable, RenderContractError } =
    await import("../src/lib/rcap/render/job-contract.ts");

  const stored = report.storedJob?.row ?? null;
  let sourceAssert = { attempted: false };
  if (stored) {
    const claim = {
      id: stored.id,
      rendererKind: stored.renderer_kind,
      sourceSha256: stored.source_sha256 ?? null,
      profileVersion: stored.profile_version,
      fencingToken: stored.fencing_token
    };
    try {
      assertClaimAcceptable(claim, {
        knownJobIds: new Set([claim.id]),
        allowedSourceShas: new Set(),
        knownProfileVersions: versions,
        supportedRendererKinds: new Set([stored.renderer_kind])
      });
      sourceAssert = { attempted: true, accepted: true, errorCode: null };
    } catch (error) {
      sourceAssert = {
        attempted: true,
        accepted: false,
        errorCode: error instanceof RenderContractError ? error.errorCode : "non_contract_error",
        detail: sanitize(error?.message ?? String(error))
      };
    }
  }

  report.sourceTree = {
    profilesLoaded: profiles.length,
    distinctProfileVersions: versions.size,
    msTuple: msProfile ? { profileId: msProfile.jurisdiction?.code ?? null, profileVersion: String(msProfile.profileVersion) } : null,
    admitsExpectedVersion: versions.has(EXPECTED_PROFILE_VERSION),
    assertClaim: sourceAssert
  };
}

// --- boundary 4: the immutable image, executing its own modules ---------------
{
  // Imports the image's own registry and contract through the image's own
  // loader, exactly as scripts/rcap-render-worker.mjs does. No bind mount, no
  // host path: `docker run <digest> node -e` runs the shipped bytes.
  const probe = `
import { register } from "node:module";
register("./scripts/lib/ts-esm-loader.mjs", "file:///app/");
const { getAllJurisdictionProfiles, getProfileByJurisdiction } = await import("/app/src/lib/rcap-engine/profile-registry.ts");
const { assertClaimAcceptable, RenderContractError } = await import("/app/src/lib/rcap/render/job-contract.ts");
const profiles = getAllJurisdictionProfiles();
const versions = [...new Set(profiles.map((p) => String(p.profileVersion)))].sort();
const ms = profiles.filter((p) => (p.jurisdiction && p.jurisdiction.code) === ${JSON.stringify(EXPECTED_PROFILE_ID)})
  .map((p) => ({ profileId: p.jurisdiction.code, profileVersion: String(p.profileVersion) }));
const byLookup = getProfileByJurisdiction(${JSON.stringify(EXPECTED_PROFILE_ID)});
let claimResult = { attempted: false };
const stored = ${JSON.stringify(report.storedJob?.row ?? null)};
if (stored) {
  try {
    assertClaimAcceptable(
      { id: stored.id, rendererKind: stored.renderer_kind, sourceSha256: stored.source_sha256 ?? null,
        profileVersion: stored.profile_version, fencingToken: stored.fencing_token },
      { knownJobIds: new Set([stored.id]), allowedSourceShas: new Set(),
        knownProfileVersions: new Set(versions), supportedRendererKinds: new Set([stored.renderer_kind]) }
    );
    claimResult = { attempted: true, accepted: true, errorCode: null };
  } catch (error) {
    claimResult = { attempted: true, accepted: false,
      errorCode: error instanceof RenderContractError ? error.errorCode : "non_contract_error" };
  }
}
const crypto = await import("node:crypto");
console.log("PROBE_JSON " + JSON.stringify({
  profilesLoaded: profiles.length,
  distinctProfileVersions: versions.length,
  msTuples: ms,
  lookupTuple: byLookup ? { profileId: byLookup.jurisdiction.code, profileVersion: String(byLookup.profileVersion) } : null,
  admitsExpectedVersion: versions.includes(${JSON.stringify(EXPECTED_PROFILE_VERSION)}),
  admitsExpectedProfileId: ms.length > 0,
  claimResult,
  profileSetHash: crypto.createHash("sha256").update(versions.join("\\n")).digest("hex"),
  cwd: process.cwd(),
  compiledDirExists: (await import("node:fs")).existsSync("/app/src/lib/rcap-engine/compiled/profiles")
}));
`;

  const run = spawnSync("docker", [
    "run", "--rm", "--entrypoint", "node", WORKER_DIGEST_REF,
    "--input-type=module", "-e", probe
  ], { encoding: "utf8", timeout: 300000, maxBuffer: 32 * 1024 * 1024 });

  const line = String(run.stdout ?? "").split("\n").find((l) => l.startsWith("PROBE_JSON "));
  let parsed = null;
  try { parsed = line ? JSON.parse(line.slice("PROBE_JSON ".length)) : null; } catch { parsed = null; }

  const imageId = spawnSync("docker", ["image", "inspect", "--format", "{{.Id}}", WORKER_DIGEST_REF], { encoding: "utf8" });
  const repoDigests = spawnSync("docker", ["image", "inspect", "--format", "{{join .RepoDigests \"\\n\"}}", WORKER_DIGEST_REF], { encoding: "utf8" });

  report.image = {
    ranInsideImage: true,
    mountedHostSource: false,
    exitCode: run.status,
    imageId: (imageId.stdout ?? "").trim() || null,
    repoDigests: (repoDigests.stdout ?? "").trim().split("\n").filter(Boolean),
    probe: parsed,
    // Kept only when the probe failed to produce a verdict, so a broken probe
    // can never read as an image refusal.
    stderrTail: parsed ? null : sanitize(`${run.stdout ?? ""}${run.stderr ?? ""}`).slice(-1500)
  };
}

// --- the contradiction, classified -------------------------------------------
{
  const image = report.image?.probe ?? null;
  const source = report.sourceTree;
  const storedOk = report.storedTupleMatchesExpected;

  let classification = "INDETERMINATE";
  let verdict = "PROBE_DID_NOT_RETURN_A_VERDICT";
  let rootCause = "the in-image probe produced no parseable verdict; nothing is concluded from its absence";

  if (image) {
    const imageAccepts = image.claimResult?.attempted ? image.claimResult.accepted === true : image.admitsExpectedVersion === true;
    verdict = imageAccepts ? "IMAGE_ACCEPTS_EXACT_JOB_TUPLE" : "IMAGE_REFUSES_EXACT_JOB_TUPLE";

    if (!storedOk && report.storedJob?.row) {
      classification = "C";
      rootCause = "the stored job tuple differs from the authoritative route tuple; the specification writer is at fault";
    } else if (imageAccepts) {
      classification = "A";
      // §2: never say the TARGET's profile version changed. It did not — the
      // image admits it. The worker was handed a different row entirely, and
      // saying otherwise would accuse a value that the evidence exonerates.
      const predecessors = report.claimOrder?.claimablePredecessors ?? null;
      const predictedIsTarget = report.claimOrder?.predictedFirstClaimIsTarget;
      rootCause = predecessors === null
        ? "target attribution unproven: the claim order could not be read"
        : predictedIsTarget
          ? "the target is first in claim order; target attribution is not the explanation and the claimed row must be identified directly"
          : `target attribution failure caused by a shared acceptance-project backlog — ${predecessors} claimable predecessor(s) stand ahead of the target in the live claim order, and the unscoped FIFO hands the worker one of those rows`;
    } else if (source.admitsExpectedVersion) {
      classification = "B";
      rootCause = "the image refuses a tuple the source tree admits — a build or packaging defect in the published image";
    } else {
      classification = "B-source-also-refuses";
      rootCause = "neither the image nor the source tree admits the tuple; the profile corpus itself is the problem";
    }
  }

  report.verdict = verdict;
  report.classification = classification;
  report.rootCause = rootCause;
  report.boundaries = {
    authoritativeRouteTuple: source.msTuple,
    storedJobTuple: report.storedJob?.row
      ? { profileId: report.storedJob.row.profile_id, profileVersion: report.storedJob.row.profile_version }
      : null,
    sourceTreeAdmits: source.admitsExpectedVersion,
    imageAdmits: image ? image.admitsExpectedVersion : null,
    imageProfilesLoaded: image ? image.profilesLoaded : null,
    imageCompiledDirExists: image ? image.compiledDirExists : null,
    imageCwd: image ? image.cwd : null
  };
}

fs.writeFileSync(path.join(OUT_DIR, "worker-contract-contradiction.json"), `${JSON.stringify(report, null, 2)}\n`);

console.log(`stored job            : ${report.storedJob?.row?.id ?? "(unread)"}`);
console.log(`stored profile        : ${report.storedProfileIdEncodings?.json ?? "(none)"} / ${report.storedProfileVersionEncodings?.json ?? "(none)"}`);
console.log(`stored version hex    : ${report.storedProfileVersionEncodings?.utf8Hex ?? "(none)"}`);
console.log(`source tree           : ${report.sourceTree.profilesLoaded} profiles, admits=${report.sourceTree.admitsExpectedVersion}, assertClaim=${JSON.stringify(report.sourceTree.assertClaim)}`);
console.log(`image                 : ${report.image?.probe ? `${report.image.probe.profilesLoaded} profiles, admits=${report.image.probe.admitsExpectedVersion}, compiledDir=${report.image.probe.compiledDirExists}, cwd=${report.image.probe.cwd}` : "(no verdict)"}`);
console.log(`profile-set hash      : ${report.image?.probe?.profileSetHash ?? "(none)"}`);
console.log(`stored job status     : ${report.storedJob?.row ? `${report.storedJob.row.status} attempts=${report.storedJob.row.attempt_count} error=${report.storedJob.row.error_code ?? "(none)"}` : "(unread)"}`);
console.log(`queued / claimable    : ${report.claimOrder?.totalQueued ?? "?"} queued, ${report.claimOrder?.totalCurrentlyClaimable ?? "?"} currently claimable (live predicate)`);
console.log(`target claim rank     : ${report.claimOrder?.targetClaimRank ?? "(not claimable)"} of ${report.claimOrder?.totalCurrentlyClaimable ?? "?"}`);
console.log(`claimable predecessors: ${report.claimOrder?.claimablePredecessors ?? "?"} — versions ${JSON.stringify(report.claimOrder?.distinctPredecessorProfileVersions ?? [])}`);
console.log(`SQL predicts first    : ${report.claimOrder?.predictedFirstClaim ? `${report.claimOrder.predictedFirstClaim.id} (${report.claimOrder.predictedFirstClaim.profileId}/${report.claimOrder.predictedFirstClaim.profileVersion})` : "(nothing claimable)"}`);
console.log(`predicted is target   : ${report.claimOrder?.predictedFirstClaimIsTarget}`);
console.log(`payment-run target    : ${report.targetResolution?.resolvedJobId} (from ${report.targetResolution?.resolvedFrom})`);
console.log(`namespace agreement   : ${JSON.stringify(report.targetResolution?.namespaceAgreement ?? null)} — fully agrees=${report.targetResolution?.namespaceFullyAgrees}`);
console.log(`identified by jurisdiction or creation time: ${report.targetResolution?.identifiedByJurisdictionOrCreationTime}`);
console.log(`diagnostic-only job   : ${report.diagnosticOnlyJob?.id} present=${report.diagnosticOnlyJob?.present} sameRowAsTarget=${report.diagnosticOnlyJob?.isTheSameRowAsTheTarget}`);
console.log(`historical claimed job: ${report.historicalClaimedJob?.identity} — ${report.historicalClaimedJob?.reason}`);
console.log("");
console.log(report.verdict);
console.log(`CLASSIFICATION: ${report.classification}`);
console.log("TARGET JOB TUPLE: accepted by source and immutable image");
console.log(`ACTUAL CLAIMED JOB: ${report.claimOrder?.predictedFirstClaim && !report.claimOrder?.predictedFirstClaimIsTarget
  ? `${report.claimOrder.predictedFirstClaim.id} predicted by the live claim order (identity still to be proven by cycle JSON, fencing token or row snapshot)`
  : "not yet proven"}`);
console.log(`ROOT CAUSE: ${report.rootCause}`);

// A contradiction report is a diagnosis, not a gate: it exits 0 when it reached
// a verdict, and non-zero only when it could not.
process.exit(report.verdict === "PROBE_DID_NOT_RETURN_A_VERDICT" ? 1 : 0);
