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

const imageInputs = IMAGE_INPUT_PATHS.map((p) => {
  const abs = path.join(rootDir, p);
  if (!fs.existsSync(abs)) return { path: p, sha256: null, note: 'absent' };
  if (fs.statSync(abs).isDirectory()) {
    // Directory contents are covered by the tree hash git already maintains.
    return { path: p, treeSha: git(['rev-parse', `${CANDIDATE_SHA}:${p.replace(/\/$/, '')}`]) };
  }
  return { path: p, sha256: sha256(p) };
});

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
  workerImageDigest: { value: null, owner: 'Terminal D', why: 'An immutable registry digest, not a local image ID. Minted by the publication workflow at the final accepted SHA.' },
  workerDeploymentTarget: { value: null, owner: 'Roger', why: 'Where the worker runs, and which identity pulls the private package.' },
  featureFlagState: { value: null, owner: 'Roger', why: 'Consumer packet delivery and checkout must be provably disabled at step 1 and re-enabled only in the controlled staging scope at step 8.' },
  rollbackOwner: { value: null, owner: 'Roger', why: 'A named human who executes the documented rollback, not a role.' },
  observabilityDestination: { value: null, owner: 'Roger', why: 'Where apply logs, read-back output and worker logs land, so the evidence is retrievable after the window closes.' },
};

const action = {
  schemaVersion: 'rcap-staging-action/v1',
  generatedBy: 'scripts/generate-rcap-staging-action.mjs',
  id: 'staging-action-five-migrations',
  status: 'prepared_queued_not_authorized',
  environment: 'staging',
  note:
    'Prepared and machine-derived. This record authorizes nothing. Staging execution requires Roger to name the environment values below AND to grant staging scope on all four authorizations; production is separately queued and is not requested here.',

  canonicalIntegrationBranch: CANONICAL_BRANCH,
  // The security checkpoint the migrations were verified at. NOT the final
  // accepted SHA: the preparation that generated this record descends from it,
  // so the final SHA is a descendant to be re-derived when CI is green on it.
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
    { step: 4, action: 'Apply 49 -> 50 -> 51 -> 52 as one controlled sequence', gate: 'all four hashes match at apply time' },
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
  },

  postApplyEvidence: {
    verifier: 'scripts/verify-rcap-migration-apply-evidence.mjs',
    mustProve: [
      'all four migrations appear in the migration evidence',
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
      'Exactly the paths the Dockerfile copies. package.json changed between the recorded publication proof (abbc48a1) and the candidate SHA, so the image bytes differ from that proof and the publishable digest MUST be minted by a rebuild at the final accepted SHA.',
    dockerfile: 'deploy/rcap-render-worker/Dockerfile',
    inputs: imageInputs,
  },

  supersedes: [
    { id: 'staging-action-two-migrations', was: 'Apply phases 49 and 50 to staging', reason: 'Phase 50 alone marks every unsponsored job delivery-eligible with no payment check.' },
    { id: 'staging-action-three-migrations', was: 'Apply phases 49, 50 and 51 to staging', reason: 'Phase 51 as written is bypassable by the payer (RCAP-SEC-001).' },
    { id: 'staging-action-four-migrations', was: 'Apply phases 49, 50, 51 and 52 to staging', reason: 'Phase 52 closes the bypass but leaves the gate unreachable through the sanctioned enqueue path; a legitimate paid consumer is refused. Phase 53 must be applied in the same window.' },
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
  console.log(`staging action current — 4 migrations, ${missing.length} required environment value(s) still unpopulated`);
} else {
  fs.writeFileSync(outPath, next);
  console.log(`wrote ${outPath}`);
  for (const m of migrations) console.log(`  ${m.sequencePosition}. phase ${m.phase}  ${m.sha256.slice(0, 16)}…  ${m.authorizationId}`);
  console.log(`  readyToRequestAuthorization: ${action.readyToRequestAuthorization}`);
  if (missing.length) console.log(`  missing: ${missing.join(', ')}`);
}
