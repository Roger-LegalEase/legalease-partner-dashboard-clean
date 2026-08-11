#!/usr/bin/env node
// Structural verifier for the captain-owned GHCR publication workflow.
//
// The workflow's value is entirely in what it refuses to do: no trigger but a
// manual one, no tag but the full SHA, no deploy, no claiming. Those are
// properties worth asserting, because a later edit that adds `latest` or a push
// trigger would look harmless in review and would quietly break the immutability
// the staging action depends on.
//
//   node scripts/verify-rcap-worker-publication-workflow.mjs

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wfPath = '.github/workflows/publish-rcap-render-worker.yml';
const abs = path.join(rootDir, wfPath);

const failures = [];
function check(title, ok, detail) {
  if (ok) console.log(`  ok   ${title}`);
  else { failures.push(`${title} — ${detail}`); console.log(`  FAIL ${title}\n       ${detail}`); }
}

if (!fs.existsSync(abs)) {
  console.error(`verify-rcap-worker-publication-workflow FAILED: ${wfPath} is absent`);
  process.exit(1);
}
const src = fs.readFileSync(abs, 'utf8');
const lines = src.split('\n');

// --- trigger ----------------------------------------------------------------
check('the only trigger is workflow_dispatch',
  /^on:\s*$/m.test(src) && /^\s{2}workflow_dispatch:/m.test(src)
    && !/^\s{2}(push|pull_request|schedule|release|repository_dispatch|workflow_run):/m.test(src),
  'a non-manual trigger is present, or workflow_dispatch is missing');

check('a full integration SHA is a required input',
  /integration_sha:/.test(src) && /required:\s*true/.test(src),
  'integration_sha is not declared required');

check('an abbreviated or non-hex SHA is rejected',
  /\^\[0-9a-f\]\{40\}\$/.test(src),
  'no 40-character lowercase-hex guard on the input');

check('the SHA must resolve to a commit',
  /git cat-file -e/.test(src), 'no commit-resolution check');

check('the SHA must belong to the canonical integration history',
  /git merge-base --is-ancestor/.test(src) && /CANONICAL_INTEGRATION_BRANCH/.test(src),
  'no ancestry check against the canonical integration branch');

check('the exact supplied SHA is checked out',
  /git checkout --detach/.test(src), 'the workflow does not detach onto the supplied SHA');

// --- permissions ------------------------------------------------------------
const permBlock = src.match(/^permissions:\n((?:\s{2}\S.*\n)+)/m)?.[1] ?? '';
check('permissions are exactly contents: read and packages: write',
  /contents:\s*read/.test(permBlock) && /packages:\s*write/.test(permBlock)
    && permBlock.trim().split('\n').length === 2,
  `permissions block is: ${permBlock.trim().replace(/\n/g, ' | ') || '(absent)'}`);

// --- image identity ---------------------------------------------------------
check('the image repository is the canonical one',
  /ghcr\.io\/roger-legalease\/rcap-render-worker/.test(src), 'canonical image repository not referenced');

check('the build uses the worker Dockerfile',
  /deploy\/rcap-render-worker\/Dockerfile/.test(src), 'Dockerfile path not referenced');

// The tag rule is the load-bearing one: exactly one tag, and it is the SHA.
const tagLines = lines.filter((l) => /^\s*tags:/.test(l));
check('exactly one tag is published',
  tagLines.length === 1, `${tagLines.length} tag directives found`);
check('the only tag is the full commit SHA',
  tagLines.length === 1 && /inputs\.integration_sha/.test(tagLines[0]),
  `tag line does not interpolate the input SHA: ${tagLines[0] ?? '(none)'}`);

// A mutable alias would defeat the digest pin the staging action requires.
// Scoped to actual tag usage: `ubuntu-latest` is a runner label and
// `mutableLatestTagCreated` is an evidence field, neither of which is a tag.
// A `tags:` block form puts each tag on a continuation line, so the tag block
// is collected whole rather than reading only the `tags:` line itself.
const tagBlock = [];
for (let i = 0; i < lines.length; i += 1) {
  if (!/^\s*tags:/.test(lines[i])) continue;
  const indent = lines[i].match(/^\s*/)[0].length;
  tagBlock.push(lines[i]);
  for (let j = i + 1; j < lines.length; j += 1) {
    const l = lines[j];
    if (l.trim() === '') continue;
    if (l.match(/^\s*/)[0].length <= indent) break;
    tagBlock.push(l);
  }
}
const aliasOffenders = [
  ...tagBlock.filter((l) => /latest/i.test(l)),
  ...lines.filter((l) => /\b(docker\s+tag|docker\s+push)\b/.test(l) && /latest/i.test(l)),
  ...lines.filter((l) => /ghcr\.io\/[^\s"']+:latest/.test(l)),
];
check('no mutable latest or moving alias tag is created',
  aliasOffenders.length === 0,
  `alias tag usage: ${aliasOffenders.map((l) => l.trim()).join(' | ')}`);

// --- evidence ---------------------------------------------------------------
for (const [title, needle] of [
  ['the registry digest is captured', 'steps.build.outputs.digest'],
  ['the digest is validated as a real sha256', '^sha256:[0-9a-f]{64}$'],
  ['the source SHA is recorded', '"sourceSha"'],
  ['the Dockerfile SHA-256 is recorded', '"dockerfileSha256"'],
  ['the lockfile SHA-256 is recorded', '"lockfileSha256"'],
  ['the image reference is recorded', '"imageReference"'],
  ['the immutable digest is recorded', '"immutableRegistryDigest"'],
  ['the workflow run id is recorded', '"workflowRunId"'],
]) {
  check(title, src.includes(needle), `${needle} not present`);
}

check('a machine-readable publication artifact is emitted',
  /upload-artifact/.test(src) && /rcap-render-worker-publication\.json/.test(src),
  'no uploaded publication artifact');

// --- what it must NOT do ----------------------------------------------------
for (const [title, pattern] of [
  ['the workflow does not deploy', /\b(kubectl|helm|fly deploy|vercel deploy|aws ecs|az webapp|gcloud run deploy)\b/i],
  ['the workflow does not start worker claiming', /claim_packet_render_job|--loop\b.*run|start-worker/i],
  ['the workflow does not apply a migration', /\bpsql\b|supabase db push|supabase migration up/i],
]) {
  check(title, !pattern.test(src), 'a forbidden operation appears in the workflow');
}

console.log('');
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
if (failures.length > 0) {
  console.error(`verify-rcap-worker-publication-workflow FAILED: ${failures.length} check(s)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('verify-rcap-worker-publication-workflow passed.');
console.log(`  path    ${wfPath}`);
console.log(`  sha256  ${sha256}`);
