#!/usr/bin/env node
// A builder that removes its output directory before rebuilding writes the receipt
// after the prior one is gone from disk, so preserveIdentityRefresh had nothing to
// carry forward and every refresh block was dropped. When the file is absent, the
// committed receipt at HEAD is the previous receipt. Fail-safe either way.
//
//   node scripts/rcap-packet-completeness/test-identity-refresh-from-committed-receipt.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { committedReceiptText, preserveIdentityRefresh } from "./identity-refresh.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REL = "data/rcap-all50/overlays/census-v1/me/census-pending-family:me:juvenile-sealing--official-pdf-fill/source-receipt.json";
const committed = JSON.parse(fs.readFileSync(path.join(ROOT, REL), "utf8"));
const pinned = committed.committedRecords.find((r) => r.identityRefresh);
assert.ok(pinned, "control: the committed ME receipt carries at least one identityRefresh block");
const missingFs = { readFileSync: () => { const e = new Error("ENOENT"); e.code = "ENOENT"; throw e; } };
const rebuilt = () => {
  const d = structuredClone(committed);
  for (const r of d.committedRecords) delete r.identityRefresh;   // a rebuild composes pins without blocks
  return d;
};

// 1. absent on disk, committed at HEAD: the block comes back on the unmoved pin
const restored = preserveIdentityRefresh(missingFs, path.join(ROOT, REL), rebuilt(), { log: () => {} });
const back = restored.committedRecords.find((r) => r.pathInRepository === pinned.pathInRepository);
assert.deepEqual(back.identityRefresh, pinned.identityRefresh, "the committed block is carried forward");

// 2. the committed text really comes from git, not from disk
assert.equal(committedReceiptText(path.join(ROOT, REL)), fs.readFileSync(path.join(ROOT, REL), "utf8"));

// 3. fail-safe: no committed copy, git failure, or unreadable JSON leaves the document as composed
const doc = rebuilt();
assert.equal(preserveIdentityRefresh(missingFs, path.join(ROOT, "no/such/source-receipt.json"), doc), doc);
assert.equal(preserveIdentityRefresh(missingFs, path.join(ROOT, REL), doc, { git: () => { throw new Error("no git"); } }), doc);
assert.equal(preserveIdentityRefresh(missingFs, path.join(ROOT, REL), doc, { git: () => "not json" }), doc);

// 4. a file present on disk still wins over HEAD
const onDisk = { readFileSync: () => JSON.stringify(committed) };
assert.deepEqual(preserveIdentityRefresh(onDisk, path.join(ROOT, REL), rebuilt(), { git: () => { throw new Error("must not be called"); } }).committedRecords.find((r) => r.pathInRepository === pinned.pathInRepository).identityRefresh, pinned.identityRefresh);

// 5. the committed text is read at HEAD, not an older commit (HEAD~1 holds the same ME bytes, so only the arguments tell)
const calls = [];
const spyGit = (args) => { calls.push(args); return args[0] === "rev-parse" ? `${ROOT}\n` : fs.readFileSync(path.join(ROOT, REL), "utf8"); };
assert.equal(committedReceiptText(path.join(ROOT, REL), { git: spyGit }), fs.readFileSync(path.join(ROOT, REL), "utf8"));
assert.deepEqual(calls.map((a) => a[0]), ["rev-parse", "show"]);
assert.deepEqual(calls[1], ["show", `HEAD:${REL}`], "the receipt is read at HEAD by its repository-relative path");

console.log(JSON.stringify({ status: "PASS", checks: 8, carriedFromHead: pinned.pathInRepository }));
