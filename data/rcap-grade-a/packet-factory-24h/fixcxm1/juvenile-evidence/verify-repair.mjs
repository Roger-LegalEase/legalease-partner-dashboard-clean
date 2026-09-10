import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const repo = process.cwd();
const family = 'mn_petition_juvenile_as_adult-set';
const outputRel = 'data/rcap-all50/overlays/census-v1/mn/mn-petition-juvenile-as-adult-set--official-pdf-fill';
const builderRel = 'scripts/build-census-v1-mn_petition_juvenile_as_adult-set.mjs';
const evidenceRel = 'data/rcap-grade-a/packet-factory-24h/fixcxm1/juvenile-evidence';
const BASE_COMMIT = '40626a9ee9faf9513778dc50a4e7882f62680f33';
const resultPath = path.join(repo, evidenceRel, 'production-guard-proof.json');
const logPath = path.join(repo, evidenceRel, 'production-guard-proof.log');

function sha(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function inventory(root) {
  const rows = [];
  function walk(dir, prefix = '') {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const rel = path.posix.join(prefix, name);
      const stat = fs.lstatSync(full);
      if (stat.isDirectory()) walk(full, rel);
      else if (stat.isFile()) {
        const bytes = fs.readFileSync(full);
        rows.push({ path: rel, byteLength: bytes.length, sha256: sha(bytes) });
      } else throw new Error(`unexpected non-file output entry: ${rel}`);
    }
  }
  walk(root);
  return rows;
}
function sameInventory(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function mkdir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function copyDir(source, target) { fs.cpSync(source, target, { recursive: true }); }
function link(source, target) { fs.symlinkSync(source, target, 'dir'); }

function mutateBuilder(source, mutation) {
  if (mutation === 'selected-disposition') {
    const needle = '...(decision.mark === true ? { disposition: "selected_route_option" } : {}),';
    if (!source.includes(needle)) throw new Error('selected disposition mutation anchor missing');
    return source.replace(needle, '...(decision.mark === true ? {} : {}),');
  }
  if (mutation === 'missing-ground-reason') {
    const needle = 'reason: ground.reason';
    if (!source.includes(needle)) throw new Error('ground reason mutation anchor missing');
    return source.replace(needle,
      'reason: ground.key === "controlled-substance-152-18" ? null : ground.reason');
  }
  if (mutation === 'missing-guide-ground') {
    const needle = 'elections: electionRows, otherGroundBoxes, recordActions';
    if (!source.includes(needle)) throw new Error('participant guide mutation anchor missing');
    return source.replace(needle,
      'elections: electionRows, otherGroundBoxes: otherGroundBoxes.slice(1), recordActions');
  }
  return source;
}

function seedScratch(mutation) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-fixcxm1-juvenile-'));
  mkdir(path.join(scratch, 'scripts'));
  const originalBuilder = fs.readFileSync(path.join(repo, builderRel), 'utf8');
  fs.mkdirSync(path.dirname(path.join(scratch, builderRel)), { recursive: true });
  fs.writeFileSync(path.join(scratch, builderRel), mutateBuilder(originalBuilder, mutation));
  for (const dir of ['rcap-official-forms', 'lib', 'rcap-packet-completeness']) {
    link(path.join(repo, 'scripts', dir), path.join(scratch, 'scripts', dir));
  }
  mkdir(path.join(scratch, 'data', 'rcap-all50'));
  fs.copyFileSync(path.join(repo, 'data/rcap-all50/local-source-corpus-index.json'),
    path.join(scratch, 'data/rcap-all50/local-source-corpus-index.json'));
  mkdir(path.join(scratch, 'data', 'rcap-all50', 'overlays', 'census-v1', 'mn'));
  copyDir(path.join(repo, outputRel), path.join(scratch, outputRel));
  link(path.join(repo, 'data', 'record-clearing'), path.join(scratch, 'data', 'record-clearing'));
  link(path.join(repo, 'private'), path.join(scratch, 'private'));
  link(path.join(repo, 'node_modules'), path.join(scratch, 'node_modules'));
  return scratch;
}

function runProduction(name, mutation) {
  const scratch = seedScratch(mutation);
  try {
    const output = path.join(scratch, outputRel);
    const before = inventory(output);
    const command = `node ${builderRel}`;
    const proc = spawnSync(process.execPath, [builderRel], {
      cwd: scratch, encoding: 'utf8',
      env: {
        ...process.env,
        MASTER_LIBRARY_SOURCE_DIR: path.join(repo, 'private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1')
      }
    });
    const after = inventory(output);
    return {
      name, mutation: mutation ?? null, command, exit: proc.status,
      signal: proc.signal, stdout: proc.stdout, stderr: proc.stderr,
      finalOutputInventoryBefore: before, finalOutputInventoryAfter: after,
      finalOutputInventoryPreserved: sameInventory(before, after),
      replacementAttempted: !sameInventory(before, after)
    };
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

const valid = runProduction('valid', null);
if (valid.exit !== 0) throw new Error(`valid production build failed: ${valid.stderr}`);
const selected = runProduction('original-selected-disposition-defect', 'selected-disposition');
const ground = runProduction('original-missing-ground-reason-defect', 'missing-ground-reason');
const guide = runProduction('original-missing-ground-guide-defect', 'missing-guide-ground');

for (const run of [selected, ground, guide]) {
  if (run.exit !== 1 || !run.finalOutputInventoryPreserved) {
    throw new Error(`${run.name} did not refuse before replacement: ${JSON.stringify({ exit: run.exit, preserved: run.finalOutputInventoryPreserved })}`);
  }
}

const result = {
  schemaVersion: 'fixcxm1-juvenile-production-guard-proof/v1',
  family, baseCommit: BASE_COMMIT,
  productionPath: `node ${builderRel}`,
  stagingRule: 'The builder composes PDFs and both instruction documents in memory; the ordinary audit runs before any final output write. Each scratch starts from the known candidate output inventory and mounts source/dependency links without copying or modifying source bytes.',
  valid: { exit: valid.exit, replacementAttempted: valid.replacementAttempted, pdfInventory: valid.finalOutputInventoryAfter.filter(x => x.path.startsWith('fixtures/')) },
  mutations: [selected, ground, guide].map((run) => ({
    name: run.name, mutation: run.mutation, exit: run.exit,
    refusalObserved: run.exit === 1,
    finalOutputInventoryPreserved: run.finalOutputInventoryPreserved,
    replacementAttempted: run.replacementAttempted,
    stderr: run.stderr,
    finalOutputInventoryBefore: run.finalOutputInventoryBefore,
    finalOutputInventoryAfter: run.finalOutputInventoryAfter
  })),
  allDefectsRefusedBeforeReplacement: [selected, ground, guide].every((run) => run.exit === 1 && run.finalOutputInventoryPreserved)
};
fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
const durableLog = [
  `BASE_COMMIT ${BASE_COMMIT}`,
  `COMMAND node ${builderRel}`,
  `VALID exit=${valid.exit} replacementAttempted=${valid.replacementAttempted}`,
  `VALID stdout:\n${valid.stdout}`,
  `VALID stderr:\n${valid.stderr}`,
  ...[selected, ground, guide].map((run) => [
    `${run.name} mutation=${run.mutation} exit=${run.exit} replacementAttempted=${run.replacementAttempted} finalOutputInventoryPreserved=${run.finalOutputInventoryPreserved}`,
    `stdout:\n${run.stdout}`,
    `stderr:\n${run.stderr}`
  ].join('\n'))
].join('\n');
fs.writeFileSync(logPath, `${durableLog}\n`);
console.log(JSON.stringify({ baseCommit: BASE_COMMIT, validExit: valid.exit,
  mutationExits: [selected.exit, ground.exit, guide.exit],
  allDefectsRefusedBeforeReplacement: result.allDefectsRefusedBeforeReplacement,
  evidence: [resultPath, logPath] }, null, 2));
