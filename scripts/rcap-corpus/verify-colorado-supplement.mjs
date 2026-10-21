#!/usr/bin/env node
// Verify the Colorado supplement: its contract always, its bytes when mounted.
//
// WHY TWO MODES
//
// The contract can be checked with no network and no corpus, so it is checked on
// every run and can gate CI. The bytes can only be checked where they are
// installed, so that half runs when a supplement root is present and is skipped
// -- loudly, not silently -- when it is not.
//
// WHAT THE CONTRACT HAS TO SATISFY
//
// The supplement's whole justification is that it adds to source-corpus-2026-08-28
// without disturbing it. That is a property, not a promise, and these are the
// checks that hold it:
//
//   - it never claims the base tag or the base archive digest as its own
//   - no supplement path collides with a base path, so it can never shadow a
//     base document
//   - a document is either fully measured or fully pending; a half-filled record
//     is how an unverified digest gets mistaken for a verified one
//   - the archive digest is absent until an archive exists, and the bootstrap
//     refuses to run while it is absent
//
// Usage, from the repository root:
//   node scripts/rcap-corpus/verify-colorado-supplement.mjs
//   node scripts/rcap-corpus/verify-colorado-supplement.mjs --root /path/to/supplement
//   node scripts/rcap-corpus/verify-colorado-supplement.mjs --base /path/to/master-library
//   node scripts/rcap-corpus/verify-colorado-supplement.mjs --index other-index.json
//   node scripts/rcap-corpus/verify-colorado-supplement.mjs --json report.json

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};

// --index exists so the mutation test can point this at a deliberately broken
// copy. A verifier nobody has watched fail is a verifier nobody should trust.
const INDEX = path.resolve(flag("--index", path.join(rootDir, "scripts/rcap-corpus/colorado-supplement-index.json")));

const index = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const docs = index.documents ?? [];

const supplementRoot = path.resolve(
  flag("--root", path.join(rootDir, "private/source-imports", index.archiveContract.topLevelDirectory)),
);
const baseRoot = path.resolve(
  flag("--base", path.join(rootDir, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1")),
);

const failures = [];
const notes = [];
const fail = (what) => failures.push(what);

// ---- contract ---------------------------------------------------------------

console.log(`supplement : ${index.supplementId}`);
console.log(`base       : ${index.relationshipToBaseCorpus.baseReleaseTag}`);
console.log(`release    : ${index.release.tag}  [${index.release.status}]`);
console.log("");

if (index.release.tag === index.relationshipToBaseCorpus.baseReleaseTag) {
  fail(`the supplement claims the base tag ${index.release.tag}; a supplement must never republish the pinned release`);
}
if (index.release.archiveSha256 && index.release.archiveSha256 === index.relationshipToBaseCorpus.baseArchiveSha256) {
  fail("the supplement claims the base archive digest as its own");
}
if (index.relationshipToBaseCorpus.baseIsModified || index.relationshipToBaseCorpus.baseIsRepublished) {
  fail("the index declares the base corpus modified or republished; that is exactly what this supplement exists to avoid");
}
if (index.relationshipToBaseCorpus.installsIntoBaseTree) {
  fail("the index declares installation into the base tree, which would break the base bootstrap's file-count invariant");
}

if (!docs.length) fail("the index names no documents");

const seenPaths = new Set();
const seenIds = new Set();
const MEASURED = ["sha256", "byteSize", "pageCount", "contentType", "formTechnology", "retrievedAt"];

for (const d of docs) {
  const where = d.documentId ?? "(document with no id)";
  for (const required of ["documentId", "formNumber", "officialTitle", "sourceUrl", "filingSetRole", "requiredness", "routeIds", "plannedCorpusRelativePath"]) {
    if (d[required] === undefined || d[required] === null || d[required] === "") fail(`${where}: missing ${required}`);
  }
  if (seenIds.has(d.documentId)) fail(`${where}: duplicated in the index`);
  seenIds.add(d.documentId);

  if (!["required", "conditional", "optional"].includes(d.requiredness)) {
    fail(`${where}: requiredness ${JSON.stringify(d.requiredness)} is not one of required, conditional, optional`);
  }
  if (d.sourceUrl && !/^https:\/\/(www\.)?coloradojudicial\.gov\//.test(d.sourceUrl)) {
    fail(`${where}: sourceUrl is not an official Colorado Judicial Branch URL`);
  }
  if (seenPaths.has(d.plannedCorpusRelativePath)) fail(`${where}: two documents claim ${d.plannedCorpusRelativePath}`);
  seenPaths.add(d.plannedCorpusRelativePath);

  // A record is either fully measured or fully pending. Anything between the two
  // lets a digest that was never computed sit beside fields that were, and read
  // as if it had been.
  const measured = MEASURED.filter((k) => d[k] !== null && d[k] !== undefined);
  if (measured.length && measured.length !== MEASURED.length) {
    fail(`${where}: partially measured (${measured.join(", ")}); a document is measured in full or pending in full`);
  }
  if (d.sha256 && !/^[0-9a-f]{64}$/.test(d.sha256)) fail(`${where}: sha256 is not a 64-character hex digest`);
  if (d.formTechnology && !["AcroForm", "XFA", "flat"].includes(d.formTechnology)) {
    fail(`${where}: formTechnology ${JSON.stringify(d.formTechnology)} is not AcroForm, XFA or flat`);
  }
}

const measuredDocs = docs.filter((d) => d.sha256);
const pendingDocs = docs.filter((d) => !d.sha256);

// The archive digest and the documents have to agree about whether acquisition
// happened. A digest with pending documents would pin an archive that cannot
// contain them.
if (index.release.archiveSha256 && pendingDocs.length) {
  fail(`the release records an archive digest while ${pendingDocs.length} document(s) are still pending`);
}
if (index.release.archiveSha256 && !/^[0-9a-f]{64}$/.test(index.release.archiveSha256)) {
  fail("release.archiveSha256 is not a 64-character hex digest");
}
if (!index.release.archiveSha256 && index.release.status !== "UNPUBLISHED") {
  fail(`release.status is ${index.release.status} with no archive digest`);
}

// ---- base disjointness ------------------------------------------------------

const supersessions = [];
if (fs.existsSync(baseRoot)) {
  let collisions = 0;
  for (const d of docs) {
    if (fs.existsSync(path.join(baseRoot, d.plannedCorpusRelativePath))) {
      fail(`${d.documentId}: ${d.plannedCorpusRelativePath} already exists in the base corpus; the supplement would shadow it`);
      collisions += 1;
    }
  }
  // Path equality is the strict test, but a base copy under a different revision
  // in its name would still be the same document arriving twice.
  const baseCo = path.join(baseRoot, "STATES/CO");
  if (fs.existsSync(baseCo)) {
    const baseNames = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else baseNames.push(e.name);
      }
    };
    walk(baseCo);
    for (const d of docs) {
      const hit = baseNames.find((n) => n.includes(`__${d.documentId}__`));
      if (!hit) continue;
      // One document in this supplement is deliberately an identity collision:
      // the court reissued a guide the pinned corpus already holds, and Grade-A
      // provenance may not keep binding the superseded revision once the current
      // one is identified. That is a legitimate supersession -- but only when it
      // is DECLARED, in full, naming the exact base file and digest it stands
      // against. An undeclared collision is still a corpus refresh wearing a
      // supplement's clothes, and still fails.
      const sup = d.supersedesBaseDocument;
      if (!sup) {
        fail(`${d.documentId}: the base corpus already carries ${hit} under a different revision, and no supersedesBaseDocument is declared; this is a corpus refresh, not a supplement`);
        collisions += 1;
        continue;
      }
      const missing = ["reason", "baseCorpusRelativePath", "baseSha256", "baseRevision", "supersedingRevision"]
        .filter((k) => sup[k] === undefined || sup[k] === null || sup[k] === "");
      if (missing.length) {
        fail(`${d.documentId}: supersedesBaseDocument is incomplete (missing ${missing.join(", ")}); a supersession is declared in full or not at all`);
        collisions += 1;
        continue;
      }
      // The declaration has to be true of the corpus on disk, not merely
      // plausible: the named base file must exist and hash to the named digest.
      // A supersession pointing at a file that is not there supersedes nothing.
      const baseFile = path.join(baseRoot, sup.baseCorpusRelativePath);
      if (!fs.existsSync(baseFile)) {
        fail(`${d.documentId}: supersedesBaseDocument names ${sup.baseCorpusRelativePath}, which is not in the mounted base corpus`);
        collisions += 1;
        continue;
      }
      const baseDigest = crypto.createHash("sha256").update(fs.readFileSync(baseFile)).digest("hex");
      if (baseDigest !== sup.baseSha256) {
        fail(`${d.documentId}: supersedesBaseDocument records base digest ${sup.baseSha256}, but the installed base file hashes to ${baseDigest}`);
        collisions += 1;
        continue;
      }
      if (path.basename(baseFile) !== path.basename(hit)) {
        fail(`${d.documentId}: supersedesBaseDocument names ${path.basename(baseFile)}, but the base copy carrying this identity is ${hit}`);
        collisions += 1;
        continue;
      }
      // Superseding runs one way. A supplement revision that is not strictly
      // newer than the base's is not a supersession, it is a downgrade or a
      // duplicate.
      if (!(String(sup.supersedingRevision) > String(sup.baseRevision))) {
        fail(`${d.documentId}: supersedingRevision ${sup.supersedingRevision} is not newer than baseRevision ${sup.baseRevision}; a supersession only runs forward`);
        collisions += 1;
        continue;
      }
      if (d.plannedCorpusRelativePath === sup.baseCorpusRelativePath) {
        fail(`${d.documentId}: the superseding copy claims the base document's own path; it must install beside the pinned copy, never over it`);
        collisions += 1;
        continue;
      }
      if (sup.baseCopyRemains === false) {
        fail(`${d.documentId}: supersedesBaseDocument declares the base copy does not remain; the pinned release is immutable and its bytes are never removed`);
        collisions += 1;
        continue;
      }
      supersessions.push(`${d.documentId} supersedes ${sup.baseRevision} with ${sup.supersedingRevision} (base copy retained)`);
    }
  }
  notes.push(`base corpus mounted; ${collisions === 0 ? "no undeclared path or identity collisions" : `${collisions} collision(s)`}`);
  for (const s of supersessions) notes.push(`declared supersession: ${s}`);
} else {
  notes.push(`base corpus not mounted at ${baseRoot}; disjointness not re-checked this run`);
}

// ---- bytes, when mounted ----------------------------------------------------

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

if (fs.existsSync(supplementRoot)) {
  if (!measuredDocs.length) {
    fail(`a supplement is mounted at ${supplementRoot} but the index records no digests to check it against`);
  }
  for (const d of measuredDocs) {
    const file = path.join(supplementRoot, d.plannedCorpusRelativePath);
    if (!fs.existsSync(file)) {
      fail(`${d.documentId}: MISSING from the mounted supplement (${d.plannedCorpusRelativePath})`);
      continue;
    }
    const got = sha256(file);
    if (got !== d.sha256) {
      fail(`${d.documentId}: CHANGED -- index ${d.sha256}, installed ${got}`);
      continue;
    }
    const size = fs.statSync(file).size;
    if (d.byteSize !== null && size !== d.byteSize) {
      fail(`${d.documentId}: byte size ${size} does not match the recorded ${d.byteSize}`);
    }
  }
  notes.push(`supplement mounted at ${supplementRoot}; ${measuredDocs.length} document(s) rehashed`);
} else {
  notes.push(`supplement not mounted at ${supplementRoot}; bytes not checked this run`);
}

// ---- report -----------------------------------------------------------------

for (const n of notes) console.log(`  ${n}`);
console.log(`  ${docs.length} document(s): ${measuredDocs.length} measured, ${pendingDocs.length} pending`);
if (pendingDocs.length) {
  console.log(`  pending: ${pendingDocs.map((d) => d.documentId).join(", ")}`);
  console.log(`  reason : ${index.acquisition?.blocker ?? "not recorded"}`);
}
console.log("");

const jsonOut = flag("--json");
if (jsonOut) {
  fs.writeFileSync(jsonOut, `${JSON.stringify({
    supplementId: index.supplementId,
    checkedAt: new Date().toISOString(),
    releaseStatus: index.release.status,
    documents: docs.length,
    measured: measuredDocs.map((d) => d.documentId),
    pending: pendingDocs.map((d) => d.documentId),
    supersessions,
    failures,
    notes,
  }, null, 2)}\n`);
  console.log(`Wrote ${jsonOut}`);
}

if (failures.length) {
  console.error(`Colorado supplement: ${failures.length} problem(s).`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log(
  pendingDocs.length
    ? `Colorado supplement contract verified. Acquisition is incomplete and the index says so; nothing here claims otherwise.`
    : `Colorado supplement verified: ${measuredDocs.length} document(s), all measured.`,
);
