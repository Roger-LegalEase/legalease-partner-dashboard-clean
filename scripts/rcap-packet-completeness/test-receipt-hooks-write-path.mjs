#!/usr/bin/env node
/**
 * Execute the installed four builders' exact writeJson bodies against copies
 * of their real source receipts, with the installed preservation helper.
 * This is a filesystem write-path test, not a renderer or full-family rebuild.
 * No original receipt, source, output PDF or acceptance artifact is written.
 *
 * node scripts/rcap-packet-completeness/test-receipt-hooks-write-path.mjs
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { eachPin, preserveIdentityRefresh } from "./identity-refresh.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SUBJECTS = [
  ["az_wrongful_arrest_clearance-set", "az/az-wrongful-arrest-clearance-set--custom-pleading", "4c7a4a820639f1735510f3bbfca5b6f6fd2131c9"],
  ["nc_145_5_felony-set", "nc/nc-145-5-felony-set--official-pdf-fill", "6b5ce0595b4e06bbb6e420b892c73981c4bff63e"],
  ["nc_146_acquittal_petition-set", "nc/nc-146-acquittal-petition-set--official-pdf-fill", "bd7fd7cca54654c7f0aef781e0546ef271176f3d"],
  ["rcap-wv-custom-pleading", "wv/rcap-wv-custom-pleading--custom-pleading", "44ff9893b7fa34c878295dec6c088ec83b8c1f8b"]
];
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const blob = (bytes) => crypto.createHash("sha1").update(`blob ${Buffer.byteLength(bytes)}\0`).update(bytes).digest("hex");
const serialized = (doc) => `${JSON.stringify(doc, null, 2)}\n`;
const strip = (doc) => {
  const next = structuredClone(doc);
  eachPin(next, (pin) => { delete pin.identityRefresh; });
  return next;
};
const annotations = (doc) => {
  const found = [];
  eachPin(doc, (pin, at) => { if (pin.identityRefresh) found.push({ at, pin }); });
  return found;
};
const modifyPin = (doc, target, change) => {
  let changed = 0;
  eachPin(doc, (pin, at) => { if (at === target) { change(pin); changed += 1; } });
  assert.equal(changed, 1, "negative control must alter exactly one held pin");
};

// Extract only the writer, without executing renderer entry points or replacing
// its body. Dependencies are the real filesystem, node:path and installed helper.
function writerOf(source, script, scratch) {
  const matches = [...source.matchAll(/^function writeJson\(rel, value\) \{[\s\S]*?^\}/gm)];
  assert.equal(matches.length, 1, `${script}: one exact writer must be present`);
  assert.ok(source.includes('writeJson(`${OUT}/source-receipt.json`, {'),
    `${script}: actual source-receipt emission must use that writer`);
  return new Function("fs", "path", "ROOT", "preserveIdentityRefresh",
    `${matches[0][0]}\nreturn writeJson;`)(fs, path, scratch, preserveIdentityRefresh);
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-receipt-hooks-"));
const results = [];
const bindings = [];
const it = (name, fn) => { fn(); results.push(name); console.log(`ok ${name}`); };
try {
  for (const [family, directory, beforeBlob] of SUBJECTS) {
    const script = `scripts/build-census-v1-${family}.mjs`;
    const source = fs.readFileSync(path.join(ROOT, script), "utf8");
    assert.match(source, /import \{ preserveIdentityRefresh \} from "\.\/rcap-packet-completeness\/identity-refresh\.mjs";/,
      `${script}: the writer must import the installed helper`);
    const receipt = `data/rcap-all50/overlays/census-v1/${directory}/source-receipt.json`;
    const retainedBytes = fs.readFileSync(path.join(ROOT, receipt));
    const held = JSON.parse(retainedBytes);
    const heldAnnotations = annotations(held);
    assert.ok(heldAnnotations.length > 0, `${family}: actual annotated receipt required`);
    const plain = strip(held);
    const rel = `${family}/source-receipt.json`;
    const target = path.join(scratch, rel);
    const writeJson = writerOf(source, script, scratch);
    const write = (previous, next, writer = writeJson) => {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      if (previous === null) fs.rmSync(target, { force: true });
      else fs.writeFileSync(target, serialized(previous));
      writer(rel, structuredClone(next));
      return fs.readFileSync(target, "utf8");
    };

    it(`${family}: exact pre-repair writer erases the real annotations`, () => {
      const original = execFileSync("git", ["cat-file", "blob", beforeBlob], { cwd: ROOT, encoding: "utf8", maxBuffer: 2 ** 21 });
      assert.equal(blob(original), beforeBlob);
      const beforeWriter = writerOf(original, `${script}@${beforeBlob}`, scratch);
      const actual = write(held, plain, beforeWriter);
      assert.equal(actual, serialized(plain));
      assert.notEqual(actual, serialized(held), "negative control reproduces annotation loss");
    });
    it(`${family}: unchanged pins retain all annotations and nested bytes`, () => {
      assert.equal(write(held, plain), serialized(held));
    });
    it(`${family}: a source moved again does not borrow its old comparison`, () => {
      const first = heldAnnotations[0];
      const next = structuredClone(plain);
      const changedHash = first.pin.sha256 === "f".repeat(64) ? "e".repeat(64) : "f".repeat(64);
      modifyPin(next, first.at, (pin) => { pin.sha256 = changedHash; });
      const expected = structuredClone(held);
      modifyPin(expected, first.at, (pin) => { pin.sha256 = changedHash; delete pin.identityRefresh; });
      assert.equal(write(held, next), serialized(expected));
    });
    it(`${family}: reverting to pre-refresh source bytes refuses the annotation`, () => {
      const first = heldAnnotations[0];
      const next = structuredClone(plain);
      modifyPin(next, first.at, (pin) => { pin.sha256 = first.pin.identityRefresh.was.sha256; });
      const expected = structuredClone(held);
      modifyPin(expected, first.at, (pin) => {
        pin.sha256 = first.pin.identityRefresh.was.sha256;
        delete pin.identityRefresh;
      });
      assert.equal(write(held, next), serialized(expected));
    });
    it(`${family}: artifact-bound approval cannot ride a source annotation`, () => {
      const first = heldAnnotations[0];
      const previous = structuredClone(held);
      modifyPin(previous, first.at, (pin) => { pin.identityRefresh.approvedBy = "synthetic negative control"; });
      const expected = structuredClone(held);
      modifyPin(expected, first.at, (pin) => { delete pin.identityRefresh; });
      assert.equal(write(previous, plain), serialized(expected));
    });
    it(`${family}: unannotated and absent previous receipts serialize unchanged`, () => {
      assert.equal(write(plain, plain), serialized(plain));
      assert.equal(write(null, plain), serialized(plain));
    });
    it(`${family}: original receipt stays byte-identical after write-path tests`, () => {
      assert.equal(digest(fs.readFileSync(path.join(ROOT, receipt))), digest(retainedBytes));
    });
    bindings.push({
      family, script, beforeBlob, afterBlob: blob(source), afterSha256: digest(source),
      receipt, receiptSha256: digest(retainedBytes), annotatedPins: heldAnnotations.length
    });
  }
  const report = {
    schemaVersion: "rcap-receipt-hooks-write-path/v1", status: "PASS", cases: results.length,
    measuredAt: new Date().toISOString(), nodeVersion: process.version,
    scope: "Exact installed writeJson bodies and installed helper executed with the real filesystem on temporary receipt copies. Four exact historical builder blobs are negative controls. No renderer or full builder execution is claimed.",
    originalReceiptsUnchanged: true, packetsRebuilt: 0,
    helperSha256: digest(fs.readFileSync(path.join(ROOT, "scripts/rcap-packet-completeness/identity-refresh.mjs"))),
    bindings, results
  };
  const reportFlag = process.argv.indexOf("--report");
  if (reportFlag !== -1) {
    assert.ok(process.argv[reportFlag + 1], "--report needs a destination");
    const destination = path.resolve(ROOT, process.argv[reportFlag + 1]);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, serialized(report));
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  // Only this invocation's generated, small receipt copies are disposable.
  fs.rmSync(scratch, { recursive: true, force: true });
}
