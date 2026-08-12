#!/usr/bin/env node
// Canonical writer for the staging action.
//
// Everything derivable is derived here: the migration paths, their SHA-256s in
// apply order, the authorization id backing each one, the integration branch and
// SHA, and the image inputs. Nothing computable is hand-typed, so a migration
// whose bytes move cannot leave a stale hash sitting in a prepared action.
//
// The values that CANNOT be derived — the staging Supabase project, the
// deployment targets, the flag, the rollback owner, the observability
// destination — are declared as required and left explicitly unpopulated with a
// named owner. The action stays unrequestable until they are supplied.
//
//   node scripts/generate-rcap-staging-action.mjs
//   node scripts/generate-rcap-staging-action.mjs --check

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(rootDir, 'data/rcap-staging-action.json');
const checkOnly = process.argv.includes('--check');

const CANONICAL_BRANCH = 'claude/rcap-final-sprint-integration';
const CANDIDATE_SHA = '13e356c49bd484e6f946ba604076718d904bca86';

// Apply order is the definition of the action, not a comment on it. The index
// is the sequence position and the verifier asserts it.
const SEQUENCE = [
  { phase: 49, path: 'supabase/phase-49-rcap-packet-render-jobs.sql', authorizationId: 'auth-2026-08-10-phase-49-packet-render-jobs' },
  { phase: 50, path: 'supabase/phase-50-rcap-packet-delivery-hardening.sql', authorizationId: 'auth-2026-08-10-phase-50-packet-delivery-hardening' },
  { phase: 51, path: 'supabase/phase-51-rcap-consumer-payment-gate.sql', authorizationId: 'auth-2026-08-10-phase-51-consumer-payment-gate' },
  { phase: 52, path: 'supabase/phase-52-rcap-consumer-payment-authority.sql', authorizationId: 'auth-2026-08-11-phase-52-consumer-payment-authority' },
  { phase: 53, path: 'supabase/phase-53-rcap-consumer-job-binding.sql', authorizationId: 'auth-2026-08-11-phase-53-consumer-job-binding' },
  { phase: 54, path: 'supabase/phase-54-rcap-person-namespace-hardening.sql', authorizationId: 'auth-2026-08-11-phase-54-person-namespace-hardening' },
];

// Exactly the paths the Dockerfile copies. Anything outside this set cannot
// change the image, and anything inside it forces a rebuild before publication.
const IMAGE_INPUT_PATHS = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'scripts/rcap-render-worker.mjs',
  'scripts/lib/',
  'src/',
  'deploy/rcap-render-worker/Dockerfile',
];

const sha256 = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(rootDir, rel))).digest('hex');
const git = (args) => execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();

// ---------------------------------------------------------------------------
// The image-input fingerprint.
//
// Two facts used to share one constant here, and they are different facts:
//
//   * securityCheckpointSha records where the migration security lineage was
//     verified. It moves only when a new checkpoint is declared, and it must
//     NEVER be advanced merely because the worker source changed.
//   * The image-input fingerprint records what the worker image would be built
//     FROM. It must describe the accepted source tree, not the checkpoint.
//
// Deriving the fingerprint's tree hashes from the checkpoint (as this file
// once did) produced a record that pinned trees no build would use. The
// fingerprint is therefore derived from the commit being generated against —
// with one self-reference rule: a record cannot name the commit that will
// contain it. The commit that lands this record touches only non-image-input
// paths, so its image-input trees are identical to the base's; `--check`
// enforces exactly that equivalence (`git diff --quiet <base> HEAD -- <image
// inputs>`) instead of demanding the impossible byte-equal base SHA.
//
// Generation refuses a working tree that is dirty on any image-input path: a
// fingerprint must describe bytes that actually exist in a commit.
// ---------------------------------------------------------------------------

const FINGERPRINT_ALGORITHM = 'sha256-file+git-tree/v1';
const IMAGE_INPUT_DIFF_PATHS = IMAGE_INPUT_PATHS.map((p) => p.replace(/\/$/, ''));

function imageInputWorktreeDirt() {
  return execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', ...IMAGE_INPUT_DIFF_PATHS], {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim();
}

function imageInputEquivalent(baseSha) {
  const result = execFileSync('git', ['diff', '--name-only', `${baseSha}`, 'HEAD', '--', ...IMAGE_INPUT_DIFF_PATHS], {
    cwd: rootDir,
    encoding: 'utf8',
  }).trim();
  return { equivalent: result.length === 0, changed: result };
}

const problems = [];
const queue = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/rcap-authorization-queue.json'), 'utf8'));
const byId = new Map((queue.entries || []).map((e) => [e.id, e]));

const migrations = SEQUENCE.map((m, i) => {
  if (!fs.existsSync(path.join(rootDir, m.path))) {
    problems.push(`${m.path} does not exist`);
    return null;
  }
  const actual = sha256(m.path);
  const auth = byId.get(m.authorizationId);
  if (!auth) problems.push(`${m.path}: authorization ${m.authorizationId} is not in the queue`);
  else {
    const idx = (auth.authorizedPaths || []).indexOf(m.path);
    if (idx < 0) problems.push(`${m.path} is not an authorizedPath of ${m.authorizationId}`);
    else if ((auth.authorizedSha256 || [])[idx] !== actual) {
      problems.push(`${m.path}: bytes ${actual.slice(0, 12)}… do not match the hash pinned by ${m.authorizationId}`);
    }
    if (auth.decision !== 'approved') problems.push(`${m.authorizationId} decision is ${auth.decision}, not approved`);
  }
  return {
    sequencePosition: i + 1,
    phase: m.phase,
    path: m.path,
    sha256: actual,
    authorizationId: m.authorizationId,
    authorizationScope: auth?.authorizationScope ?? null,
    // Recorded because phase 49 carries a broader standing grant than the other
    // three; the constraint below is what stops that being read as permission
    // to apply a partial sequence.
    standingEnvironmentConditions: auth?.environmentConditions ?? null,
    scopedAuthorization: auth?.scopedAuthorization ?? null,
  };
}).filter(Boolean);

const dirt = imageInputWorktreeDirt();
if (dirt) {
  problems.push(`the working tree is dirty on image-input paths; a fingerprint must describe committed bytes:\n${dirt}`);
}

// In write mode the base is HEAD — the accepted tip being generated against.
// In --check mode the base is whatever the committed record claims, and the
// claim is validated by image-input equivalence to HEAD rather than identity,
// because the commit carrying the record can never be its own base.
let fingerprintBaseSha = git(['rev-parse', 'HEAD']);
if (checkOnly && fs.existsSync(outPath)) {
  const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const recordedBase = existing?.imageInputFingerprintBaseSha;
  if (typeof recordedBase === 'string' && /^[0-9a-f]{40}$/.test(recordedBase)) {
    try {
      git(['cat-file', '-e', `${recordedBase}^{commit}`]);
      const { equivalent, changed } = imageInputEquivalent(recordedBase);
      if (equivalent) {
        fingerprintBaseSha = recordedBase;
      } else {
        problems.push(
          `imageInputFingerprintBaseSha ${recordedBase.slice(0, 8)} is not image-input-equivalent to HEAD; changed: ${changed.split('\n').join(', ')} — the fingerprint is stale and must be regenerated`
        );
      }
    } catch {
      problems.push(`imageInputFingerprintBaseSha ${recordedBase.slice(0, 8)} does not resolve to a commit`);
    }
  } else {
    problems.push('the committed record carries no imageInputFingerprintBaseSha');
  }
}

const imageInputs = IMAGE_INPUT_PATHS.map((p) => {
  const abs = path.join(rootDir, p);
  if (!fs.existsSync(abs)) return { path: p, sha256: null, note: 'absent' };
  if (fs.statSync(abs).isDirectory()) {
    // Directory contents are covered by the tree hash git already maintains,
    // taken at the fingerprint base — NEVER at the security checkpoint, which
    // records lineage, not build source. With the dirty-tree guard above and
    // base equivalence enforced in --check, these hashes describe the bytes a
    // build at HEAD would actually copy.
    return { path: p, treeSha: git(['rev-parse', `${fingerprintBaseSha}:${p.replace(/\/$/, '')}`]) };
  }
  return { path: p, sha256: sha256(p) };
});

const inputByPath = new Map(imageInputs.map((i) => [i.path, i]));
const imageInputFingerprint = {
  algorithm: FINGERPRINT_ALGORITHM,
  packageJsonSha256: inputByPath.get('package.json')?.sha256 ?? null,
  packageLockSha256: inputByPath.get('package-lock.json')?.sha256 ?? null,
  tsconfigSha256: inputByPath.get('tsconfig.json')?.sha256 ?? null,
  workerEntrypointSha256: inputByPath.get('scripts/rcap-render-worker.mjs')?.sha256 ?? null,
  dockerfileSha256: inputByPath.get('deploy/rcap-render-worker/Dockerfile')?.sha256 ?? null,
  scriptsLibTreeHash: inputByPath.get('scripts/lib/')?.treeSha ?? null,
  srcTreeHash: inputByPath.get('src/')?.treeSha ?? null,
};
for (const [key, value] of Object.entries(imageInputFingerprint)) {
  if (value === null) problems.push(`imageInputFingerprint.${key} could not be derived; a partial fingerprint is not a fingerprint`);
}

// Terminal D's publication evidence, if it has been imported. The digest is
// only ever read from committed evidence that names the exact freeze SHA —
// never typed in — so a digest for the wrong source cannot be recorded here.
const PUBLICATION_EVIDENCE_PATH = path.join(rootDir, 'data/rcap-render/worker-publication-evidence.json');
let publicationEvidence = null;
if (fs.existsSync(PUBLICATION_EVIDENCE_PATH)) {
  const candidate = JSON.parse(fs.readFileSync(PUBLICATION_EVIDENCE_PATH, 'utf8'));
  const digestShape = /^sha256:[0-9a-f]{64}$/.test(String(candidate.immutableRegistryDigest || ''));
  if (!digestShape) {
    problems.push('worker publication evidence carries a malformed immutable digest');
  } else if (candidate.packageVisibility !== 'private' || candidate.mutableLatestTagCreated !== false || candidate.publishOnlyNoDeploy !== true) {
    problems.push('worker publication evidence violates the publication contract (visibility/latest/publish-only)');
  } else {
    publicationEvidence = candidate;
  }
}

// Required environment values. Anything null here keeps the action unrequestable.
const REQUIRED_ENVIRONMENT = {
  stagingSupabaseProject: { value: null, owner: 'Roger', why: 'The action names one environment. Without the project ref there is nothing to apply to and nothing to verify the connection against.' },
  applicationDeploymentTarget: { value: null, owner: 'Roger', why: 'The application must be deployed and confirmed pointing at staging before any migration runs.' },
  // Deliberately null. 13e356c4 is the security checkpoint, not the final tip:
  // this very preparation commit descends from it and changes package.json,
  // which is an image input. Pinning the deployment SHA to the checkpoint would
  // name a commit that is already superseded, so it is re-derived at the final
  // accepted tip instead.
  applicationDeploymentSha: { value: null, owner: 'captain', why: 'The application must carry the Phase 52 payment writer, and the deployed commit must be the final accepted integration SHA — a descendant of the 13e356c4 checkpoint, re-derived once this preparation lands and CI is green on it.' },
  workerImageDigest: {
    // Populated from committed publication evidence only, and only when the
    // evidence's Dockerfile and lockfile hashes agree with this record's own
    // fingerprint — the digest and the fingerprint must describe one build.
    value:
      publicationEvidence &&
      publicationEvidence.dockerfileSha256 === imageInputFingerprint.dockerfileSha256 &&
      publicationEvidence.lockfileSha256 === imageInputFingerprint.packageLockSha256
        ? publicationEvidence.immutableRegistryDigest
        : null,
    owner: 'Terminal D',
    why: 'An immutable registry digest, not a local image ID. Minted by the publication workflow at the freeze SHA and read from committed evidence (data/rcap-render/worker-publication-evidence.json), never typed.',
    evidence: publicationEvidence
      ? {
          sourceSha: publicationEvidence.sourceSha,
          imageReference: `${publicationEvidence.imageRepository}:${publicationEvidence.imageTag}`,
          digestPinnedReference: publicationEvidence.digestPinnedReference,
          workflowRunId: publicationEvidence.workflowRunId,
          registryPullByDigestStatus: publicationEvidence.registryPullByDigestStatus,
        }
      : null,
  },
  workerDeploymentTarget: { value: null, owner: 'Roger', why: 'Where the worker runs, and which identity pulls the private package.' },
  featureFlagState: { value: null, owner: 'Roger', why: 'Consumer packet delivery and checkout must be provably disabled at step 1 and re-enabled only in the controlled staging scope at step 8.' },
  rollbackOwner: { value: null, owner: 'Roger', why: 'A named human who executes the documented rollback, not a role.' },
  observabilityDestination: { value: null, owner: 'Roger', why: 'Where apply logs, read-back output and worker logs land, so the evidence is retrievable after the window closes.' },
};

const action = {
  schemaVersion: 'rcap-staging-action/v1',
  generatedBy: 'scripts/generate-rcap-staging-action.mjs',
  id: 'staging-action-six-migrations',
  status: 'prepared_queued_not_authorized',
  environment: 'staging',
  note:
    'Prepared and machine-derived. This record authorizes nothing. Staging execution requires Roger to name the environment values below AND to grant staging scope on every authorization in the sequence; production is separately queued and is not requested here.',

  canonicalIntegrationBranch: CANONICAL_BRANCH,
  // The security checkpoint the migrations were verified at. NOT the final
  // accepted SHA, and NOT the worker build source: it records the
  // security-checkpoint lineage and is never advanced merely because the worker
  // source changed. Image inputs are derived from imageInputFingerprintBaseSha
  // below, which moves with the accepted source tree; this field does not.
  securityCheckpointSha: CANDIDATE_SHA,
  finalAcceptedSha: null,
  finalAcceptedShaNote:
    'Null by construction. A record cannot name the commit that contains it. Populate from the tip once this preparation lands, CI is green on that exact SHA, and Terminal B has re-audited it.',

  migrationsInApplyOrder: migrations,

  indivisibility: {
    rule: 'Phases 51, 52 and 53 are operationally indivisible in every environment where a consumer can be charged.',
    why:
      'Phase 50 marks every unsponsored job zero_charge AND delivery-eligible with no payment check. Phase 51 gates that on a payment the payer can forge (RCAP-SEC-001, audit f82f842). Phase 52 makes the payment fact unforgeable and correctly keyed. Phase 53 makes that gate reachable by binding consumer identity in the creating INSERT — without it the gate is correct and every legitimate paid consumer is refused (re-audit 25f6b09: 19 of 19 payment cases pass, 0 of 3 reachability cases). Stopping at 50 ships free delivery; stopping at 51 ships the proven bypass; stopping at 52 ships a product that takes payment and never delivers.',
    forbiddenSequences: [
      '49 alone in an environment where consumer delivery can be enabled',
      '49 -> 50 (the superseded two-migration action)',
      '49 -> 50 -> 51 (the superseded three-migration action)',
      '49 -> 50 -> 51 -> 52 (the superseded four-migration action: correct, and unable to serve a paying consumer)',
      '51 without 52',
      '52 before 51',
      'any renamed or replacement sibling file whose bytes are not pinned above',
    ],
    phase49StandingGrantConstraint:
      'auth-2026-08-10-phase-49-packet-render-jobs carries environmentConditions applyStaging=authorized and applyProduction=authorized conditionally, which the other three do not. That grant is for phase 49 in isolation and its own doesNotAuthorize already excludes "later Supabase work of any kind". It is NOT authority to begin this sequence and stop inside it. Executing any part of this action requires staging scope on all four authorizations.',
  },

  requiredEnvironment: REQUIRED_ENVIRONMENT,

  // The ordering is the safety property, so it is data the verifier reads, not
  // prose in a runbook that can drift from it.
  executionOrder: [
    { step: 1, action: 'Confirm consumer packet delivery and checkout are disabled', gate: 'featureFlagState proves both are off before anything else runs' },
    { step: 2, action: 'Deploy the application at applicationDeploymentSha', requires: ['record_consumer_packet_payment present', 'service-role payment writer wired', 'consumer checkout writes payment facts through record_consumer_packet_payment', 'consumer enqueue calls the 15-argument Phase 53 signature', 'the server passes the authenticated user identity and the Briefcase item identity, never client input', 'no deployed application calls the old 13-argument unbound signature', 'Phase 52-compatible finalization behaviour'] },
    { step: 3, action: 'Verify the deployed application is connected to the staging project, not production', gate: 'connection check names stagingSupabaseProject' },
    {
      step: 4,
      // Derived from SEQUENCE so this line cannot drift from the migrations the
      // action actually pins, the way the hardcoded "four" did.
      action: `Apply ${SEQUENCE.map((m) => m.phase).join(' -> ')} as one controlled sequence`,
      gate: `all ${SEQUENCE.length} hashes match at apply time`,
    },
    { step: 5, action: 'Verify database objects, grants, functions and policies', gate: 'scripts/verify-rcap-migration-apply-evidence.mjs passes against the staging project' },
    { step: 6, action: 'Deploy the worker image by immutable digest with claiming disabled', gate: 'workerImageDigest is a registry digest, not a local image ID' },
    { step: 7, action: 'Run controlled sponsored and paid-consumer staging cases', gate: 'sponsored consumes partner credit; paid consumer is zero_charge and consumes none' },
    { step: 8, action: 'Enable only the controlled staging scope', gate: 'no production surface is touched' },
  ],

  hardStop: {
    condition: 'The deployed application still writes payment facts through the participant-authenticated client.',
    behaviour: 'STOP BEFORE STEP 4. Do not apply any migration.',
    why:
      'Phase 52 revokes INSERT and UPDATE on the payment columns from anon and authenticated. If the application still writes payment facts as the participant, applying the sequence makes a provider payment succeed while the application cannot record its authoritative server-side evidence: money captured, no record. The application must move to record_consumer_packet_payment first, which is why step 2 precedes step 4.',
    invariant: 'A provider payment must never succeed while the application is unable to record its authoritative server-side payment evidence.',
    repositoryStatus: 'RESOLVED IN THE REPOSITORY, NOT YET IN ANY ENVIRONMENT.',
    repositoryEvidence: [
      'The signature-verified Stripe webhook records payment through record_consumer_packet_payment under service_role (src/lib/expungement-ai/consumer-payment-authority.ts).',
      'No application path writes a payment column as the participant: the participant-authenticated payment writer is deleted, item creation no longer names payment columns, and the polled confirm path reads instead of writing.',
      'One authenticated route reaches the Phase 53 bound enqueue with server-derived identity (src/app/api/expungement-ai/packet/render/route.ts).',
      'scripts/verify-expungement-consumer-payment-http.mjs proves P1-P18 through the real routes; 7 mutations turn it red.',
    ],
    stillRequiredAtApplyTime:
      'The condition is about the DEPLOYED application, so it must be re-checked against the deployed SHA at step 2. Merged is not deployed.',
  },

  postApplyEvidence: {
    verifier: 'scripts/verify-rcap-migration-apply-evidence.mjs',
    mustProve: [
      `all ${SEQUENCE.length} migrations appear in the migration evidence`,
      'finalize_packet_render_job is the Phase 52 definition, not a familiar name',
      'record_consumer_packet_payment exists',
      'its search_path is pinned',
      'PUBLIC, anon and authenticated cannot execute it',
      'service_role holds only the intended execution authority',
      'anon and authenticated cannot write payment columns',
      'safe nonpayment Briefcase operations remain available',
      'packet_render_jobs carries the required consumer bindings',
      'consumer payment uniqueness covers the paid Briefcase item and the provider receipt',
      'a raw uniqueness conflict cannot strand a job in validating',
      'a pre-finalization refunded payment is ineligible',
      'sponsored accounting remains separate',
      'the migration authorization path and bytes still match',
    ],
    outputPaths: [
      'data/rcap-render/staging-apply-evidence.json',
      'docs/record-clearing/staging-apply-evidence.md',
    ],
  },

  imageInputs: {
    note:
      'Exactly the paths the Dockerfile copies. Derived from imageInputFingerprintBaseSha, never from securityCheckpointSha: the checkpoint records where the migration security lineage was verified, and substituting it for the build source pins trees no build would use. The publishable digest MUST be minted by a rebuild at the declared freeze SHA.',
    dockerfile: 'deploy/rcap-render-worker/Dockerfile',
    inputs: imageInputs,
  },

  imageInputFingerprint,
  // The commit the fingerprint's tree hashes were taken at. NOT the freeze SHA:
  // the freeze SHA is the follow-on commit that carries this record, and by the
  // self-reference rule it cannot appear here. Equivalence, not identity, is the
  // required relation between the two, and it is machine-checked.
  imageInputFingerprintBaseSha: fingerprintBaseSha,
  imageInputEquivalenceRequired: true,
  imageInputEquivalenceRule:
    `git diff --quiet ${'{imageInputFingerprintBaseSha}'} HEAD -- ${IMAGE_INPUT_DIFF_PATHS.join(' ')} must exit 0; a commit that changes any image-input path invalidates this fingerprint and requires regeneration.`,

  supersedes: [
    { id: 'staging-action-two-migrations', was: 'Apply phases 49 and 50 to staging', reason: 'Phase 50 alone marks every unsponsored job delivery-eligible with no payment check.' },
    { id: 'staging-action-three-migrations', was: 'Apply phases 49, 50 and 51 to staging', reason: 'Phase 51 as written is bypassable by the payer (RCAP-SEC-001).' },
    { id: 'staging-action-four-migrations', was: 'Apply phases 49, 50, 51 and 52 to staging', reason: 'Phase 52 closes the bypass but leaves the gate unreachable through the sanctioned enqueue path; a legitimate paid consumer is refused. Phase 53 must be applied in the same window.' },
    { id: 'staging-action-five-migrations', was: 'Apply phases 49 through 53 to staging', reason: 'Phase 53 puts direct-to-consumer person rows into rcap_persons, which carried no row-level security, no policies and no explicit grants. Applying 53 without 54 would place consumer identities in a table any browser role could read.' },
  ],

  authorizes: [],
  doesNotAuthorize: [
    'application of any migration to staging or production',
    'deployment of the application',
    'publication of the worker image',
    'deployment or claiming by the worker',
    'enabling any feature flag',
    'any change to production',
  ],
};

if (problems.length > 0) {
  console.error('Staging action cannot be generated:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

const missing = Object.entries(REQUIRED_ENVIRONMENT).filter(([, v]) => v.value === null).map(([k]) => k);
action.readyToRequestAuthorization = missing.length === 0;
action.missingRequiredEnvironment = missing;

const next = `${JSON.stringify(action, null, 2)}\n`;
if (checkOnly) {
  if (!fs.existsSync(outPath) || fs.readFileSync(outPath, 'utf8') !== next) {
    console.error('data/rcap-staging-action.json is stale; re-run without --check');
    process.exit(1);
  }
  // Derived, not typed: this line read "4 migrations" for a while after the
  // sequence became five, which is exactly the sort of quiet drift the rest of
  // this generator exists to prevent.
  console.log(`staging action current — ${migrations.length} migrations, ${missing.length} required environment value(s) still unpopulated`);
} else {
  fs.writeFileSync(outPath, next);
  console.log(`wrote ${outPath}`);
  for (const m of migrations) console.log(`  ${m.sequencePosition}. phase ${m.phase}  ${m.sha256.slice(0, 16)}…  ${m.authorizationId}`);
  console.log(`  readyToRequestAuthorization: ${action.readyToRequestAuthorization}`);
  if (missing.length) console.log(`  missing: ${missing.join(', ')}`);
}
