#!/usr/bin/env node
// Prove the two claims the Colorado supplement rests on.
//
// FIRST: the archive digest pins the documents, not the run.
//
// The supplement is identified by a SHA-256 over a tar.gz. If that digest
// changed between two runs over identical documents, it would pin the machine
// and the clock rather than the bytes, and a consumer who rebuilt to check
// would get a mismatch that meant nothing. So this builds the same tree twice,
// under different creation orders and different mtimes, and requires the same
// digest -- and then changes one byte and requires a different one.
//
// SECOND: the verifier fails when it should.
//
// A verifier nobody has watched fail is a verifier nobody should trust. This
// feeds verify-colorado-supplement.mjs a series of indexes broken one way each
// -- a supplement claiming the base tag, a digest with no documents behind it,
// a half-measured record, a path that collides with the base corpus -- and
// requires a non-zero exit from every one.
//
//   node scripts/rcap-corpus/test-colorado-supplement.mjs

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { packSupplement, sha256 } from "./supplement-archive.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERIFIER = path.join(rootDir, "scripts/rcap-corpus/verify-colorado-supplement.mjs");
const INDEX = path.join(rootDir, "scripts/rcap-corpus/colorado-supplement-index.json");

let passed = 0;
const failures = [];
const skipped = [];
const check = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ok    ${name}`);
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
    console.log(`  FAIL  ${name}: ${err.message}`);
  }
};
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const work = fs.mkdtempSync(path.join(os.tmpdir(), "co-supplement-test-"));
process.on("exit", () => fs.rmSync(work, { recursive: true, force: true }));

const TOP = "Expungement_AI_RCAP_CO_Supplement_2026-08-29";
const MTIME = 1756425600;

// A minimal stand-in for the real tree: the packer does not care what the bytes
// are, only that identical inputs produce an identical archive.
const buildTree = (dir, order, bump) => {
  const files = [
    ["STATES/CO/02_PACKET_FORMS/a.pdf", "%PDF-1.7 alpha\n"],
    ["STATES/CO/02_PACKET_FORMS/b.pdf", `%PDF-1.7 beta${bump ? " changed" : ""}\n`],
    ["STATES/CO/04_SUPPORTING_PROCESS/c.pdf", "%PDF-1.7 gamma\n"],
    ["00_GOVERNANCE/CO_SUPPLEMENT_CHECKSUMS.sha256", "placeholder\n"],
  ];
  const ordered = order === "reverse" ? [...files].reverse() : files;
  for (const [rel, body] of ordered) {
    const abs = path.join(dir, TOP, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
    // Different wall-clock mtimes on each build: the recipe has to override them.
    const t = order === "reverse" ? new Date("2001-02-03T04:05:06Z") : new Date();
    fs.utimesSync(abs, t, t);
  }
};

console.log("archive determinism");

const A = path.join(work, "a");
const B = path.join(work, "b");
const C = path.join(work, "c");
buildTree(A, "forward", false);
buildTree(B, "reverse", false);
buildTree(C, "forward", true);

const packA = packSupplement(A, TOP, MTIME);
const packB = packSupplement(B, TOP, MTIME);
const packC = packSupplement(C, TOP, MTIME);

check("identical documents produce an identical archive digest", () => {
  assert(packA.sha256 === packB.sha256, `${packA.sha256} !== ${packB.sha256} despite identical contents`);
});
check("a changed document changes the archive digest", () => {
  assert(packA.sha256 !== packC.sha256, "one changed byte did not change the archive digest");
});
check("re-packing the same tree is stable", () => {
  assert(packSupplement(A, TOP, MTIME).sha256 === packA.sha256, "the same tree packed twice gave two digests");
});
check("the archive is a real gzip", () => {
  assert(packA.bytes[0] === 0x1f && packA.bytes[1] === 0x8b, "not gzip-framed");
  assert(sha256(packA.bytes) === packA.sha256, "the reported digest is not a digest of the returned bytes");
});

console.log("\nverifier mutations");

const base = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const runVerifier = (idx) => {
  const file = path.join(work, `index-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, JSON.stringify(idx, null, 2));
  try {
    execFileSync("node", [VERIFIER, "--index", file], { stdio: "pipe" });
    return 0;
  } catch (err) {
    return err.status ?? 1;
  }
};

const mutation = (name, mutate) => {
  check(name, () => {
    const idx = structuredClone(base);
    mutate(idx);
    assert(runVerifier(idx) !== 0, "the verifier accepted it");
  });
};

// The collision check can only fire against a mounted base corpus. Reporting it
// as skipped is honest; reporting it as passed when nothing was compared is not.
const BASE_ROOT = path.join(rootDir, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
const baseMounted = fs.existsSync(BASE_ROOT);
const mutationNeedingBase = (name, mutate) => {
  if (!baseMounted) {
    skipped.push(name);
    console.log(`  skip  ${name} (base corpus not mounted)`);
    return;
  }
  mutation(name, mutate);
};

mutation("rejects a supplement that claims the base release tag", (i) => {
  i.release.tag = i.relationshipToBaseCorpus.baseReleaseTag;
});
mutation("rejects a supplement that claims the base archive digest", (i) => {
  i.release.archiveSha256 = i.relationshipToBaseCorpus.baseArchiveSha256;
});
mutation("rejects a declared modification of the base corpus", (i) => {
  i.relationshipToBaseCorpus.baseIsModified = true;
});
mutation("rejects a declared republication of the base corpus", (i) => {
  i.relationshipToBaseCorpus.baseIsRepublished = true;
});
mutation("rejects installation into the base tree", (i) => {
  i.relationshipToBaseCorpus.installsIntoBaseTree = true;
});
mutation("rejects an archive digest while documents are still pending", (i) => {
  i.release.archiveSha256 = "0".repeat(64);
});
mutation("rejects a malformed archive digest", (i) => {
  i.release.archiveSha256 = "not-a-digest";
  for (const d of i.documents) {
    d.sha256 = "a".repeat(64);
    d.byteSize = 1;
    d.pageCount = 1;
    d.contentType = "application/pdf";
    d.formTechnology = "flat";
    d.retrievedAt = "2026-08-29T00:00:00Z";
  }
});
mutation("rejects a half-measured document", (i) => {
  i.documents[0].sha256 = "b".repeat(64);
});
mutation("rejects a malformed document digest", (i) => {
  Object.assign(i.documents[0], {
    sha256: "nope", byteSize: 1, pageCount: 1, contentType: "application/pdf",
    formTechnology: "flat", retrievedAt: "2026-08-29T00:00:00Z",
  });
});
mutation("rejects an unknown form technology", (i) => {
  Object.assign(i.documents[0], {
    sha256: "c".repeat(64), byteSize: 1, pageCount: 1, contentType: "application/pdf",
    formTechnology: "LiveCycle", retrievedAt: "2026-08-29T00:00:00Z",
  });
});
mutation("rejects a non-official source URL", (i) => {
  i.documents[0].sourceUrl = "https://example.com/JDF613.pdf";
});
mutation("rejects an unknown requiredness", (i) => {
  i.documents[0].requiredness = "probably";
});
mutation("rejects two documents claiming the same corpus path", (i) => {
  i.documents[1].plannedCorpusRelativePath = i.documents[0].plannedCorpusRelativePath;
});
mutation("rejects a duplicated document id", (i) => {
  i.documents[1].documentId = i.documents[0].documentId;
});
mutation("rejects a document with no planned corpus path", (i) => {
  i.documents[0].plannedCorpusRelativePath = null;
});
mutationNeedingBase("rejects a path that collides with a base corpus document", (i) => {
  // JDF 612 is in the base corpus; a supplement claiming it would shadow it.
  i.documents[0].documentId = "JDF-612";
  i.documents[0].plannedCorpusRelativePath =
    "STATES/CO/02_PACKET_FORMS/CO__FORM__JDF-612__motion-to-seal-conviction-records-district-or-county-court-conviction__REV-2024-08-07__EN.pdf";
});
mutation("rejects an empty document list", (i) => {
  i.documents = [];
});

check("accepts the committed index unchanged", () => {
  assert(runVerifier(base) === 0, "the verifier rejected the committed index");
});

console.log("");
if (failures.length) {
  console.error(`Colorado supplement tests: ${failures.length} failure(s), ${passed} passed${skipped.length ? `, ${skipped.length} skipped` : ""}.`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`Colorado supplement tests: ${passed} passed${skipped.length ? `, ${skipped.length} skipped (base corpus not mounted)` : ""}.`);
