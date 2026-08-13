// Phase 3 verification — the imported bytes are the ones the handoff named.
//
// An import that lands the wrong revision is indistinguishable from a correct
// one until something downstream disagrees, so every file is compared to the
// owning commit's blob, and every family's source binary is re-hashed out of
// the extracted pack rather than trusted from its own record.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readSourceBinary } from "./d-v4-source-packs.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(REPO, "docs/record-clearing/d-wave/v4");

const inputs = JSON.parse(fs.readFileSync(`${OUT}/implementation-inputs.json`, "utf8"));
const git = (a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

const rows = [];
let failures = 0;
for (const f of inputs.families) {
  const pkg = path.join(REPO, f.familyPackagePath);
  const listed = git(["ls-tree", "-r", "--name-only", f.finalImplementationCommit, `${f.familyPackagePath}/`]).trim().split("\n");
  const mismatches = [];
  for (const rel of listed) {
    const onDisk = path.join(REPO, rel);
    if (!fs.existsSync(onDisk)) { mismatches.push({ rel, why: "missing on disk" }); continue; }
    const want = execFileSync("git", ["cat-file", "blob", `${f.finalImplementationCommit}:${rel}`], { cwd: REPO, maxBuffer: 512 * 1024 * 1024 });
    const got = fs.readFileSync(onDisk);
    if (sha256(want) !== sha256(got)) mismatches.push({ rel, why: "bytes differ from owning commit" });
  }
  const extra = fs.readdirSync(pkg, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => path.relative(REPO, path.join(d.parentPath ?? d.path, d.name)))
    .filter((p) => !listed.includes(p));

  // The source binary, re-hashed out of the pack rather than believed. Looking
  // it up by the hash the family declares is what makes this a check: a lookup
  // by path would confirm only that some file exists where one was expected.
  let srcOk = false;
  let srcBytesOk = false;
  let srcError = null;
  try {
    const src = readSourceBinary({ sha256: f.sourceSha256, familyId: f.familyId, byteLength: f.sourceByteLength });
    srcOk = sha256(src.bytes) === f.sourceSha256;
    srcBytesOk = f.sourceByteLength == null || src.bytes.length === f.sourceByteLength;
  } catch (e) {
    srcError = { name: e.name, reason: e.reason ?? null, message: e.message };
  }

  const ok = mismatches.length === 0 && extra.length === 0 && srcOk && srcBytesOk;
  if (!ok) failures += 1;
  rows.push({ familyId: f.familyId, files: listed.length, mismatches, extra, sourceSha256: f.sourceSha256, sourceVerified: Boolean(srcOk), sourceByteLengthVerified: Boolean(srcBytesOk), sourceError: srcError, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${f.familyId}  files=${listed.length}  src=${srcOk ? "sha+bytes verified" : "SOURCE MISMATCH"}`);
  for (const m of mismatches.slice(0, 4)) console.log(`        ${m.why}: ${m.rel}`);
  for (const e of extra.slice(0, 4)) console.log(`        unexpected extra file: ${e}`);
}
fs.writeFileSync(`${OUT}/phase3-import-verification.json`, `${JSON.stringify({ schema: "rcap-d-v4-import-verification/v1", rows }, null, 2)}\n`);
console.log(`\n${rows.length - failures}/${rows.length} families import-verified`);
process.exitCode = failures === 0 ? 0 : 1;
