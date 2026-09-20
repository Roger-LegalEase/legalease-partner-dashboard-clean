#!/usr/bin/env node
// Regression tests for custody attribution in the committed corpus index.
//
// The index attributed fourteen binaries to the Master Library that the Master
// Library has never carried. They were fetched from Google Drive by an
// ephemeral Codex worker into its own copy of the library tree and attached at
// c1ba78023; the worker's own return says the bytes were never staged or
// committed. Because the master_library custody IS mounted here, the sampled
// integrity check resolved them, found them absent, and reported the corpus as
// corrupt — a false corruption report about an intact archive, which refused
// every packet build in the container until it was corrected.
//
// The first test below is the one that would have caught it on the day it
// landed, and it is stated as the generator states the invariant: a
// "LegalEase <State>/" path is not a Master Library path.
//
//   node --test scripts/verify-corpus-index-custody-attribution.test.mjs
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { makeCorpusEntryResolver, MASTER_LIBRARY_RELATIVE } from "./lib/corpus-index-paths.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-all50/local-source-corpus-index.json"), "utf8"));
const SRC05 = "src05_worker_materialization_2026_09_02";

test("no Master Library entry carries a Nationwide-shaped path", () => {
  // The generator's own custody table: "the Master Library's top level is
  // STATES/ and 00_GOVERNANCE/, and every repository-relative custody root
  // lives under private/, so no other custody produces a 'LegalEase <State>/'
  // path." An entry that breaks it was not written by the generator.
  const wrong = INDEX.entries.filter((e) => e.custody === "master_library" && /^LegalEase /.test(e.path));
  assert.deepEqual(wrong.map((e) => e.path), [], "these are not Master Library paths and the library does not carry them");
});

test("every entry names a declared custody", () => {
  const declared = new Set(INDEX.custodies.map((c) => c.id));
  const undeclared = [...new Set(INDEX.entries.map((e) => e.custody ?? "master_library"))].filter((id) => !declared.has(id));
  assert.deepEqual(undeclared, [], "an undeclared custody resolves to null and its entries are silently unchecked");
});

test("the declared per-custody counts are the counts", () => {
  const counted = {};
  for (const e of INDEX.entries) counted[e.custody] = (counted[e.custody] ?? 0) + 1;
  assert.deepEqual(INDEX.totals.byCustody, counted);
  for (const c of INDEX.custodies) {
    assert.equal(c.binariesIndexed, counted[c.id] ?? 0, `${c.id} declares ${c.binariesIndexed} and carries ${counted[c.id] ?? 0}`);
  }
});

test("the unpersisted worker materialization is declared, and declared unheld", () => {
  const c = INDEX.custodies.find((x) => x.id === SRC05);
  assert.ok(c, `${SRC05} must stay declared: deleting it would erase the record of fourteen obligations recorded as satisfied by bytes nobody holds`);
  assert.equal(c.bytesHeldByAnyMountedCustody, false);
  assert.equal(c.custodyType, "EPHEMERAL_WORKER_MATERIALIZATION_NOT_PERSISTED");
  assert.match(c.describes, /SOURCE_MATERIALIZATION_RETURN\.json/, "the return carrying each Drive fileId is what makes re-acquisition executable");
  const entries = INDEX.entries.filter((e) => e.custody === SRC05);
  assert.equal(entries.length, 14);
  assert.ok(entries.every((e) => /^LegalEase /.test(e.path)));
});

test("its root is not mounted, so its entries are never compared as if held", () => {
  const r = makeCorpusEntryResolver(INDEX, { repoRoot: ROOT });
  const entry = INDEX.entries.find((e) => e.custody === SRC05);
  assert.equal(r.isMounted(entry), false);
  assert.ok(r.unmountedCustodies(INDEX.entries).includes(SRC05));
});

test("every Master Library entry verifies byte-exact when the library is mounted", () => {
  const root = process.env.MASTER_LIBRARY_SOURCE_DIR ?? path.join(ROOT, MASTER_LIBRARY_RELATIVE);
  if (!fs.existsSync(root)) return; // a container that does not mount it checks nothing here
  const r = makeCorpusEntryResolver(INDEX, { repoRoot: ROOT, masterLibraryRoot: root });
  const absent = [];
  const mismatched = [];
  for (const e of INDEX.entries.filter((x) => x.custody === "master_library")) {
    const p = r.resolve(e);
    if (!fs.existsSync(p)) { absent.push(e.path); continue; }
    if (crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex") !== e.sha256) mismatched.push(e.path);
  }
  assert.deepEqual(absent, [], "the index claims the library holds bytes it does not");
  assert.deepEqual(mismatched, [], "the index claims a digest the held bytes do not have");
});
