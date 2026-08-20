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

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const OUT_DIR = path.resolve("hosted-acceptance-evidence");
fs.mkdirSync(OUT_DIR, { recursive: true });

const PROJECT_REF = (process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "").trim();
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const WORKER_DIGEST_REF = (process.env.HOSTED_WORKER_DIGEST_REF ?? "").trim();
const JOB_ID = (process.env.CONTRADICTION_JOB_ID ?? "").trim();
const EXPECTED_PROFILE_ID = "MS";
const EXPECTED_PROFILE_VERSION = "2026-06-19-source-conversion-1";

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
  const where = JOB_ID
    ? `where id = '${JOB_ID.replace(/'/g, "''")}'`
    : `where profile_id = '${EXPECTED_PROFILE_ID}' order by created_at desc limit 1`;
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
      rootCause = "the published image admits the exact stored tuple, so the value changed between the job row and the claim";
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
console.log("");
console.log(report.verdict);
console.log(`CLASSIFICATION: ${report.classification}`);
console.log(`ROOT CAUSE: ${report.rootCause}`);

// A contradiction report is a diagnosis, not a gate: it exits 0 when it reached
// a verdict, and non-zero only when it could not.
process.exit(report.verdict === "PROBE_DID_NOT_RETURN_A_VERDICT" ? 1 : 0);
