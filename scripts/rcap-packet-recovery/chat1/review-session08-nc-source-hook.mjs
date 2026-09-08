import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { preserveIdentityRefresh } from '../../rcap-packet-completeness/identity-refresh.mjs';

const HOST = 'scripts/build-census-v1-nc_146_dismissal_petition-set.mjs';
const OLD_BLOB = 'e65565ce3fc32f517a8659355fb0675b2b0f00b7';
const DIRECTORY = 'data/rcap-all50/overlays/census-v1/nc/nc-146-dismissal-petition-set--official-pdf-fill';
const RECEIPT = `${DIRECTORY}/source-receipt.json`;
const REGISTRY = 'data/record-clearing/legal-design-track-registry.json';
const EVIDENCE = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session08';
const SHA = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const BLOB = bytes => crypto.createHash('sha1').update(`blob ${Buffer.byteLength(bytes)}\0`).update(bytes).digest('hex');
const serialize = value => `${JSON.stringify(value, null, 2)}\n`;
const clone = value => structuredClone(value);
const original = execFileSync('git', ['cat-file', 'blob', OLD_BLOB], { encoding: 'utf8', maxBuffer: 2 ** 21 });
const current = fs.readFileSync(HOST, 'utf8');
const receiptBytes = fs.readFileSync(RECEIPT);
const receipt = JSON.parse(receiptBytes);
const pin = value => value.committedRecords.find(item => item.pathInRepository === REGISTRY);
assert.ok(pin(receipt).identityRefresh, 'This test must exercise the real refreshed NC receipt');
const plain = clone(receipt);
delete pin(plain).identityRefresh;
const oldWriter = `function writeJson(rel, value) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), \`\${JSON.stringify(value, null, 2)}\\n\`);
}`;
const newWriter = `function writeJson(rel, value) {
  const absolute = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, \`\${JSON.stringify(preserveIdentityRefresh(fs, absolute, value), null, 2)}\\n\`);
}`;
const anchor = 'import { fileURLToPath } from "node:url";\n';
const addition = 'import { preserveIdentityRefresh } from "./rcap-packet-completeness/identity-refresh.mjs";\n';
const tests = [];
const test = (name, run) => {
  try { run(); tests.push({ name, passed: true }); }
  catch (error) { tests.push({ name, passed: false, error: error.message }); }
};
test('The whole host delta is exactly one existing-helper import and one JSON writer replacement', () => {
  assert.equal(BLOB(original), OLD_BLOB);
  assert.equal(original.split(anchor).length, 2);
  assert.equal(original.split(oldWriter).length, 2);
  assert.equal(current, original.replace(anchor, anchor + addition).replace(oldWriter, newWriter));
});
const scratch = fs.mkdtempSync(path.join(EVIDENCE, 'nc-source-hook-scratch-'));
const root = path.resolve(scratch);
try {
  const context = vm.createContext({ fs, path, ROOT: root, preserveIdentityRefresh });
  const actualOld = vm.runInContext(original.match(/^function writeJson\(rel, value\) \{[\s\S]*?^\}/m)[0] + '\nwriteJson;', context);
  const actualNew = vm.runInContext(current.match(/^function writeJson\(rel, value\) \{[\s\S]*?^\}/m)[0] + '\nwriteJson;', context);
  const execute = (writer, previous, next, relative = 'nc/source-receipt.json') => {
    const destination = path.join(root, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (previous === null) fs.rmSync(destination, { force: true });
    else fs.writeFileSync(destination, typeof previous === 'string' ? previous : serialize(previous));
    writer(relative, clone(next));
    return fs.readFileSync(destination, 'utf8');
  };
  test('Historical writer execution reproduces annotation loss with the actual refreshed receipt', () => {
    assert.equal(execute(actualOld, receipt, plain), serialize(plain));
    assert.notEqual(serialize(plain), receiptBytes.toString());
  });
  test('Installed writer preserves every source-note value and exact current receipt bytes', () => {
    assert.equal(execute(actualNew, receipt, plain), receiptBytes.toString());
  });
  for (const [name, digest] of [['changed source', 'f'.repeat(64)], ['reverted source', pin(receipt).identityRefresh.was.sha256]]) {
    test(`Installed writer drops the stale note for ${name}`, () => {
      const next = clone(plain); pin(next).sha256 = digest;
      assert.equal(execute(actualNew, receipt, next), serialize(next));
    });
  }
  test('Identical bytes under a different source path cannot borrow the old note', () => {
    const next = clone(plain); pin(next).pathInRepository += '.unreviewed';
    assert.equal(execute(actualNew, receipt, next), serialize(next));
  });
  for (const key of ['rasterReceipt', 'approvedBy', 'verdict']) {
    test(`An artifact-bound ${key} cannot ride the source-preservation path`, () => {
      const previous = clone(receipt); pin(previous).identityRefresh[key] = 'INDEPENDENT REFUSAL CONTROL';
      assert.equal(execute(actualNew, previous, plain), serialize(plain));
    });
  }
  test('Missing, invalid and unannotated previous receipts retain ordinary serialization behavior', () => {
    for (const previous of [null, '{invalid JSON', plain]) assert.equal(execute(actualNew, previous, plain), serialize(plain));
  });
  for (const relative of ['production-field-map.json', 'reports/rendered-artifacts.json']) {
    test(`The actual unannotated ${relative} output is unchanged byte-for-byte`, () => {
      const bytes = fs.readFileSync(`${DIRECTORY}/${relative}`), document = JSON.parse(bytes);
      assert.equal(execute(actualOld, document, document, relative), bytes.toString());
      assert.equal(execute(actualNew, document, document, relative), bytes.toString());
    });
  }
  test('The retained source receipt and installed host were not mutated by writer tests', () => {
    assert.equal(SHA(fs.readFileSync(RECEIPT)), SHA(receiptBytes));
    assert.equal(fs.readFileSync(HOST, 'utf8'), current);
  });
  const failed = tests.filter(item => !item.passed).length;
  const evidence = {
    schemaVersion: 'rcap-nc-source-refresh-writer-hook/v1',
    familyId: 'nc_146_dismissal_petition-set',
    author: 'release_scope source-refresh lane; Captain independently reviews this change',
    recordedAt: new Date().toISOString(),
    verdict: failed ? 'FAIL_REPAIR_REQUIRED' : 'PASS_FOCUSED_ENGINEERING_CHECKS',
    host: { path: HOST, beforeGitBlob: OLD_BLOB, afterGitBlob: BLOB(current), afterSha256: SHA(current) },
    receipt: { path: RECEIPT, sha256: SHA(receiptBytes), identityRefreshPins: 1 },
    sharedHelper: { path: 'scripts/rcap-packet-completeness/identity-refresh.mjs', sha256: SHA(fs.readFileSync('scripts/rcap-packet-completeness/identity-refresh.mjs')) },
    tests, passed: tests.length - failed, failed,
    actualWriterBodiesExecuted: true,
    sourceOnlyAnnotationPreserved: true,
    otherBuilderBehaviorChanged: false,
    fullBuilderExecuted: false,
    packetRendererRuns: 0,
    newRasterRuns: 0,
    independentCaptainReviewPending: true,
    evidencePublicationCommit: null,
    productionTouched: false
  };
  fs.writeFileSync(`${EVIDENCE}/nc-source-writer-hook.json`, serialize(evidence));
  console.log(JSON.stringify({ evidence: `${EVIDENCE}/nc-source-writer-hook.json`, verdict: evidence.verdict, passed: evidence.passed, failed, failedTests: tests.filter(item => !item.passed) }));
  if (failed) process.exitCode = 1;
} finally {
  assert.equal(fs.lstatSync(root).isSymbolicLink(), false);
  fs.rmSync(root, { recursive: true, force: true });
}
