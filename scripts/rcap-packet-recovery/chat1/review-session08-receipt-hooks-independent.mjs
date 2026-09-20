#!/usr/bin/env node
/** Independent engineering delta review of the four receipt-writer hooks.
 * Exact source comparison plus real filesystem execution of the unchanged
 * installed writer bodies. No renderer, full-builder entry or source write.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {preserveIdentityRefresh} from '../../rcap-packet-completeness/identity-refresh.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const EVIDENCE = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08';
const SUBJECTS = [
  ['az_wrongful_arrest_clearance-set', 'az/az-wrongful-arrest-clearance-set--custom-pleading', '4c7a4a820639f1735510f3bbfca5b6f6fd2131c9'],
  ['nc_145_5_felony-set', 'nc/nc-145-5-felony-set--official-pdf-fill', '6b5ce0595b4e06bbb6e420b892c73981c4bff63e'],
  ['nc_146_acquittal_petition-set', 'nc/nc-146-acquittal-petition-set--official-pdf-fill', 'bd7fd7cca54654c7f0aef781e0546ef271176f3d'],
  ['rcap-wv-custom-pleading', 'wv/rcap-wv-custom-pleading--custom-pleading', '44ff9893b7fa34c878295dec6c088ec83b8c1f8b']
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update(Buffer.from(`blob ${Buffer.byteLength(bytes)}\0`)).update(bytes).digest('hex');
const serialize = value => JSON.stringify(value, null, 2) + '\n';
const clone = value => structuredClone(value);
const results = [], bindings = [], preservedFiles = new Map();
const check = (familyId, name, action) => { action(); results.push({familyId, name, verdict: 'PASS'}); };
const sourceBytes = relative => {
  const bytes = fs.readFileSync(path.join(ROOT, relative));
  if (!preservedFiles.has(relative)) preservedFiles.set(relative, hash(bytes));
  return bytes;
};
// Deliberately independent of the implementation's eachPin traversal. The
// test locates exact JSON nodes, so repeated paths could not hide lost notes.
function annotatedNodes(value, locator = [], found = []) {
  if (!value || typeof value !== 'object') return found;
  if (Object.hasOwn(value, 'identityRefresh')) found.push({locator, pin: value});
  for (const [key, child] of Object.entries(value)) if (key !== 'identityRefresh') annotatedNodes(child, [...locator, key], found);
  return found;
}
const nodeAt = (value, locator) => locator.reduce((node, key) => node[key], value);
function unannotated(value) {
  const copy = clone(value);
  for (const {locator} of annotatedNodes(copy)) delete nodeAt(copy, locator).identityRefresh;
  return copy;
}
const oldWriter = `function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), \`\${JSON.stringify(value, null, 2)}\\n\`);
}`;
const newWriter = `function writeJson(rel, value) {
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, \`\${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\\n\`);
}`;
const addition = 'import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";\n';
const importAnchor = 'import { fileURLToPath } from "node:url";\n';
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'independent-receipt-hooks-'));
try {
  for (const [familyId, fragment, previousBlob] of SUBJECTS) {
    const script = `scripts/build-census-v1-${familyId}.mjs`;
    const directory = 'data/rcap-all50/overlays/census-v1/' + fragment;
    const current = sourceBytes(script).toString('utf8');
    const previous = execFileSync('git', ['cat-file', 'blob', previousBlob], {cwd: ROOT, encoding: 'utf8', maxBuffer: 2 ** 21});
    check(familyId, 'the complete builder delta is exactly one helper import and one writer replacement', () => {
      assert.equal(gitBlob(previous), previousBlob);
      assert.equal(previous.split(oldWriter).length - 1, 1);
      assert.equal(previous.split(importAnchor).length - 1, 1);
      assert.equal(current, previous.replace(importAnchor, importAnchor + addition).replace(oldWriter, newWriter));
      assert(current.includes('writeJson(`${OUT}/source-receipt.json`, {'));
    });
    const receiptPath = directory + '/source-receipt.json';
    const retained = JSON.parse(sourceBytes(receiptPath)), plain = unannotated(retained);
    const annotations = annotatedNodes(retained);
    assert(annotations.length > 0);
    const context = vm.createContext({fs, path, ROOT: scratch, preserveIdentityRefresh});
    // The preceding complete-source equality proves these verbatim writer
    // strings are the bodies installed in the measured old and new builders.
    const installedWrite = vm.runInContext(current.match(/^function writeJson\(rel, value\) \{[\s\S]*?^\}/m)[0] + '\nwriteJson;', context);
    const historicalWrite = vm.runInContext(previous.match(/^function writeJson\(rel, value\) \{[\s\S]*?^\}/m)[0] + '\nwriteJson;', context);
    const execute = (writer, before, next, relative = familyId + '/source-receipt.json') => {
      const destination = path.join(scratch, relative);
      fs.mkdirSync(path.dirname(destination), {recursive: true});
      if (before === null) fs.rmSync(destination, {force: true});
      else fs.writeFileSync(destination, typeof before === 'string' ? before : serialize(before));
      writer(relative, clone(next));
      return fs.readFileSync(destination, 'utf8');
    };
    check(familyId, 'historical execution really erases the retained annotations', () => {
      const before = execute(historicalWrite, retained, plain);
      assert.equal(before, serialize(plain)); assert.notEqual(before, serialize(retained));
    });
    check(familyId, 'every unchanged source annotation and nested value survives verbatim', () => {
      assert.equal(execute(installedWrite, retained, plain), serialize(retained));
      assert.equal(annotatedNodes(JSON.parse(execute(installedWrite, retained, plain))).length, annotations.length);
    });
    for (const {locator, pin} of annotations) {
      const label = locator.join('.');
      for (const [name, digest] of [['moved again', 'd'.repeat(64)], ['reverted to old source', pin.identityRefresh.was.sha256]]) {
        check(familyId, `${label}: ${name} drops only its stale annotation`, () => {
          assert.notEqual(digest, pin.sha256);
          const next = clone(plain), expected = clone(retained);
          nodeAt(next, locator).sha256 = digest; nodeAt(expected, locator).sha256 = digest;
          delete nodeAt(expected, locator).identityRefresh;
          assert.equal(execute(installedWrite, retained, next), serialize(expected));
        });
      }
      check(familyId, `${label}: identical bytes under a different source path cannot borrow the note`, () => {
        const next = clone(plain), expected = clone(retained);
        const key = ['pathInRepository', 'path', 'pathInPack', 'pathInArchive', 'recordPath', 'declaredPath', 'sourcePath', 'custodyPath'].find(key => typeof pin[key] === 'string');
        assert(key);
        nodeAt(next, locator)[key] += '.unreviewed'; nodeAt(expected, locator)[key] += '.unreviewed';
        delete nodeAt(expected, locator).identityRefresh;
        assert.equal(execute(installedWrite, retained, next), serialize(expected));
      });
      for (const artifactKey of ['acceptanceReceipt', 'rasterReceipt', 'approvedBy']) {
        check(familyId, `${label}: ${artifactKey} cannot ride a source comparison`, () => {
          const before = clone(retained), expected = clone(retained);
          nodeAt(before, locator).identityRefresh[artifactKey] = 'INDEPENDENT NEGATIVE CONTROL';
          delete nodeAt(expected, locator).identityRefresh;
          assert.equal(execute(installedWrite, before, plain), serialize(expected));
        });
      }
    }
    check(familyId, 'unannotated, absent and invalid previous receipts preserve exact serialized output', () => {
      for (const before of [plain, null, '{invalid JSON']) assert.equal(execute(installedWrite, before, plain), serialize(plain));
    });
    const unannotatedOutputIdentities = [];
    for (const relative of ['production-field-map.json', 'reports/rendered-artifacts.json']) {
      const bytes = sourceBytes(directory + '/' + relative), document = JSON.parse(bytes);
      check(familyId, `${relative}: concrete unannotated output bytes are unchanged by the hook`, () => {
        assert.equal(annotatedNodes(document).length, 0);
        const old = execute(historicalWrite, document, document, familyId + '/' + relative);
        const currentOutput = execute(installedWrite, document, document, familyId + '/' + relative);
        assert.equal(currentOutput, old); assert.equal(currentOutput, bytes.toString('utf8'));
      });
      unannotatedOutputIdentities.push({path: directory + '/' + relative, sha256: hash(bytes)});
    }
    bindings.push({familyId, script, beforeGitBlob: previousBlob, afterGitBlob: gitBlob(current), afterSha256: hash(current),
      receipt: {path: receiptPath, sha256: hash(sourceBytes(receiptPath)), annotatedPins: annotations.length}, unannotatedOutputIdentities});
  }
  const priorRegression = spawnSync(process.execPath, ['scripts/rcap-packet-completeness/test-identity-refresh-preserved-on-rebuild.mjs'],
    {cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024});
  check(null, 'unchanged existing receipt-preservation regression independently passes', () => assert.equal(priorRegression.status, 0, priorRegression.stderr));
  check(null, 'every original measured builder and receipt/output remains byte-identical after review', () => {
    for (const [relative, expected] of preservedFiles) assert.equal(hash(fs.readFileSync(path.join(ROOT, relative))), expected, relative);
  });
  const report = {schemaVersion: 'independent-receipt-hooks-review/v1', reviewer: 'ASTRA6 md_importer agent independently reviewing receipt_hooks author changes',
    verdict: 'PASS', scope: 'Four writer-hook deltas and their real filesystem serialization paths. Existing source comparison semantics are retained; no fresh source applicability, raster, renderer, runtime delivery or terminal admission is claimed.',
    reviewedAt: new Date().toISOString(), cases: results.length, failures: 0, findings: [],
    bindings, helperSha256: hash(sourceBytes('scripts/rcap-packet-completeness/identity-refresh.mjs')),
    authorTestReviewed: {path: 'scripts/rcap-packet-completeness/test-receipt-hooks-write-path.mjs', sha256: hash(sourceBytes('scripts/rcap-packet-completeness/test-receipt-hooks-write-path.mjs')),
      assessment: 'Correctly scopes actual writer-body tests; historical blobs reproduce annotation loss, unchanged source pins retain notes, source drift and artifact-bound approval drop notes, originals are preserved. Independent controls additionally cover every actual annotated pin, changed paths, multiple approval-key classes and concrete non-receipt JSON outputs.'},
    existingRegression: {exitCode: priorRegression.status, stdout: priorRegression.stdout, stderr: priorRegression.stderr},
    originalMeasuredFilesUnchanged: true, unchangedSourceAnnotationsTested: bindings.reduce((sum, binding) => sum + binding.receipt.annotatedPins, 0),
    completeBuilderDiffProven: true, fullPacketRebuilds: 0, independentNewVisualReview: false, results};
  fs.writeFileSync(path.join(ROOT, EVIDENCE, 'independent-receipt-hooks-review.json'), serialize(report));
  console.log(JSON.stringify({verdict: report.verdict, cases: report.cases, annotatedPins: report.unchangedSourceAnnotationsTested,
    fullPacketRebuilds: 0, evidence: EVIDENCE + '/independent-receipt-hooks-review.json'}, null, 2));
} finally {
  fs.rmSync(scratch, {recursive: true, force: true});
}
