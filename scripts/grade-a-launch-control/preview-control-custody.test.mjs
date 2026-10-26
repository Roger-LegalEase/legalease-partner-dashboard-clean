import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {previewControl, successorResponsibilities, verifySuccessorResponsibilities} from './pinned-successor-responsibilities.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const control = 'scripts/rcap-hosted-acceptance-deploy.mjs';
const publicationPath = 'data/rcap-render/worker-publication-evidence.json';

test('only exact reviewed Preview and customer continuation files are classified as controls', () => {
  for (const file of [control, 'scripts/rcap-hosted-ordinary-admin.mjs', 'scripts/rcap-hosted-ordinary-participant.mjs', 'scripts/rcap-configured-sandbox-preview-contract.mjs', 'scripts/rcap-managed-start-preview-phase.test.mjs', 'scripts/rcap-hosted-existing-dtc-continuation.mjs', 'scripts/verify-rcap-commercial-browser.mjs', 'scripts/lib/rcap-clinic-claim-prerequisite-contract.json', 'scripts/sql/rcap-clinic-claim-prerequisites.sql']) assert.equal(previewControl(file), true, file);
  for (const file of ['scripts/unreviewed.mjs', control + '.bak', '../' + control, 'scripts/./rcap-hosted-acceptance-deploy.mjs', 'src/app/page.ts', publicationPath, 'supabase/migrations/unreviewed.sql', 'scripts/lib/unknown.json']) assert.equal(previewControl(file), false, file);
});

for (const runtimeImport of [false, true]) test(`control classification preserves application-input enforcement (runtime import ${runtimeImport})`, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rcap-preview-control-custody-'));
  const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: 'pipe'}).trim();
  const write = (file, value) => {fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true}); fs.writeFileSync(path.join(root, file), value);};
  const commit = message => {git('add', '.'); git('commit', '--quiet', '-m', message); return git('rev-parse', 'HEAD');};
  try {
    git('init', '--quiet'); git('config', 'user.name', 'Synthetic custody test'); git('config', 'user.email', 'synthetic@example.test');
    write('src/app/page.ts', `${runtimeImport ? "import '../../scripts/rcap-hosted-acceptance-deploy.mjs';\n" : ''}export const publication = '${publicationPath}';\n`);
    write(control, 'export const synthetic = 1;\n'); write(publicationPath, '{}\n');
    for (const workflow of ['publish-rcap-render-worker', 'rcap-worker-image-acceptance']) write(`.github/workflows/${workflow}.yml`, '# Synthetic bytes; never executable provider evidence\n');
    const sourceSha = commit('synthetic source');
    const ref = name => {const file = `hosted-acceptance-evidence/worker/synthetic-preview-control/${name}`; const value = JSON.stringify({synthetic: true, name}); write(file, value); return {path: file, bytes: Buffer.byteLength(value), sha256: hash(value)};};
    const digest = 'sha256:' + '1'.repeat(64);
    const original = ref('original.json');
    const publication = {sourceSha, runtimeAccepted: true, immutableRegistryDigest: digest, workflowSourceSha: sourceSha,
      nativeArchive: ref('archive.txt'), nativeRunMetadata: ref('run.json'), nativeJobMetadata: ref('jobs.json'), nativeLog: ref('log.txt'),
      originalPublicationPath: original.path, originalPublicationBytes: original.bytes, originalPublicationSha256: original.sha256,
      imageAcceptance: {sourceSha, digest, conclusion: 'success', workflowSourceSha: sourceSha, verificationReceipt: ref('receipt.json')}};
    write(publicationPath, JSON.stringify(publication)); const applicationSha = commit('synthetic accepted evidence shape');
    write(control, 'export const synthetic = 2;\n'); const toolsSha = commit('synthetic named control change');
    const options = {releaseBaseSha: sourceSha, sourceSha, applicationSha, toolsSha, reviewedFiles: {}};
    const classified = successorResponsibilities(root, options);
    assert.equal(classified.controlFiles[control], hash(fs.readFileSync(path.join(root, control))));
    const verify = () => verifySuccessorResponsibilities(root, {releaseBaseSha: sourceSha, sourceCommit: sourceSha, files: {}}, {toolsSha, successorInputs: classified.inputs, successorTools: {files: classified.controlFiles}});
    if (runtimeImport) assert.throws(verify, /current application inputs match authorized runtime successor/);
    else assert.deepEqual(verify(), classified.inputs);
  } finally {fs.rmSync(root, {recursive: true, force: true});} // This test's disposable synthetic repository only.
});
