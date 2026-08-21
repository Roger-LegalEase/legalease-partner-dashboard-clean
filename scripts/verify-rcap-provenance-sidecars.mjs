#!/usr/bin/env node
// Every committed provenance sidecar, re-derived from the bytes on disk.
//
//   node scripts/verify-rcap-provenance-sidecars.mjs
//   node scripts/verify-rcap-provenance-sidecars.mjs --mutations
//
// The factory stopped stamping its Producer into the participant's official
// form and moved provenance into a sidecar beside it. That was the right call
// -- an Info dictionary is written by whoever touched the file last -- but it
// moved the evidence somewhere nothing was reading. Today the sidecar records
// six identities and only one of them is ever checked against reality:
//
//   sourceSha256              the court's bytes the artifact was built from
//   fieldMapSha256            the map that decided what was written where
//   classificationSha256      which fields the factory was allowed to touch
//   outputSha256              the artifact's exact bytes            <- checked
//   normalizedContentSha256   what the artifact SAYS, wrapper aside
//   byteLength / pageCount    the artifact's shape
//
// `generate-rcap-finalized-artifact-audit.mjs` checks outputSha256, and is not
// in the test chain. `verify-rcap-shared-pdf-contract.mjs` proves the sidecar
// CONTRACT against a synthesized canary -- a module canary, not any family's
// current bytes. So `normalizedContentSha256` and `fieldMapSha256` are written
// by both renderers and read by nothing at all.
//
// That leaves the input side of every sidecar unfalsifiable. Edit a binding in
// a committed production-field-map.json, retarget a fact, commit it, and every
// check in this repository stays green while 63 families' artifacts no longer
// correspond to the map that claims to describe them. The sidecar's own header
// says staleness and drift read that file. Nothing did.
//
// This verifier reads the committed sidecar FROM DISK -- never an in-memory
// regeneration, which would only prove the generator agrees with itself -- and
// re-derives every hash in it against the current bytes and the current inputs.
// It distinguishes the three identities a sidecar exists to keep apart:
//
//   SOURCE IDENTITY   sourceSha256 against the family's own source record.
//                     Drift here means the court reissued the form; the remedy
//                     is re-acquire and re-render.
//   INPUT IDENTITY    fieldMapSha256 against the committed map. Drift here
//                     means someone edited the map without re-rendering; the
//                     artifacts are stale and nothing else would say so.
//   OUTPUT IDENTITY   outputSha256, byteLength, pageCount and the normalized
//                     content hash against the artifact. Drift here means the
//                     bytes are not the ones the record describes.
//
// A sidecar may be byte-accurate and still not be a canonical record. Shape is
// checked too: every key the current schema emits must be present, and null is
// accepted only where that schema leaves the field optional.
//
// Nothing here writes to the repository. The mutation pass mutates only an
// in-memory model it built itself, so the tracked tree is byte-identical
// throughout.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  artifactProvenance, provenanceCoversArtifact, normalizedContentHash,
  PROVENANCE_SCHEMA, FACTORY_VERSION
} from "./rcap-official-forms/rcap-artifact-provenance.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const MUTATIONS = process.argv.includes("--mutations");
const ROOT = "data/rcap-all50/overlays/production";
const SIDECAR = "artifact-provenance.json";

// The finalized artifacts a family may carry. A PDF in one of these two
// directories is a participant-facing document and must be bound to the record.
const ARTIFACT_DIRS = ["fixtures", "contact-sheet"];

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const hashJson = (value) => sha256(Buffer.from(JSON.stringify(value ?? null), "utf8"));
const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

// Which committed file holds the field map, and which part of it the renderer
// hashed, keyed on the map's OWN declared schema. The two flat-overlay schemas
// disagree about where the anchors live -- v5 nests them under anchorCapture,
// v8 keeps them at the top -- so the shape cannot be guessed from the file name
// and must not be guessed by trying candidates until one matches, which is a
// check that can never fail. An unrecognised schema is a failure, not a pass.
const FIELD_MAP_SHAPES = [
  { file: "production-field-map.json", schema: /^rcap-acroform-map\//, hashedPart: "bindings", pick: (m) => m.bindings },
  { file: "overlay-profile.json", schema: /^rcap-flat_overlay-map\/v5$/, hashedPart: "anchorCapture.anchors", pick: (m) => m.anchorCapture?.anchors },
  { file: "overlay-profile.json", schema: /^rcap-flat_overlay-map\/v8/, hashedPart: "anchors", pick: (m) => m.anchors }
];

/**
 * The keys and the purpose text the CURRENT schema emits, read from the module
 * rather than restated here. A sidecar is canonical when it carries what this
 * producer produces; hardcoding that list would let the two drift apart and
 * leave the verifier certifying a shape the factory no longer writes.
 */
async function canonicalShape() {
  const doc = await PDFDocument.create();
  doc.addPage();
  const bytes = Buffer.from(await doc.save());
  const record = await artifactProvenance({
    jurisdiction: "ZZ", documentId: "SHAPE-PROBE", sourceSha256: sha256(bytes),
    rendererVersion: "shape-probe", generatedAt: "2000-01-01T00:00:00.000Z",
    artifacts: [{ rel: "probe.pdf", bytes }]
  });
  return {
    keys: Object.keys(record),
    artifactKeys: Object.keys(record.artifacts[0]),
    purpose: record.purpose
  };
}

// Fields the schema fills for every artifact it describes. Everything else it
// emits may be null: those are the optional descriptive fields (publisher, URL,
// official title, the packet and review-evidence bindings) that the two
// production renderers do not supply.
const REQUIRED_NON_NULL = [
  "schemaVersion", "purpose", "jurisdiction", "assetId", "documentId",
  "sourceSha256", "fieldMapSha256", "factoryVersion", "rendererVersion",
  "generatedAt", "artifacts"
];

/** Every finalized PDF a family carries, as sidecar-relative paths. */
function artifactsOnDisk(familyDir) {
  const found = [];
  for (const sub of ARTIFACT_DIRS) {
    const dir = path.join(familyDir, sub);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).sort()) {
      if (file.toLowerCase().endsWith(".pdf")) found.push(`${sub}/${file}`);
    }
  }
  return found;
}

/**
 * The corpus as observed facts.
 *
 * Bytes are hashed here and released; the model carries only what was measured
 * from them. That keeps it small enough to clone, which is what lets the
 * mutation pass move an observation and ask whether the verifier notices.
 */
async function readCorpus(shape) {
  const families = [];
  for (const state of fs.readdirSync(ROOT).sort()) {
    const statePath = path.join(ROOT, state);
    if (!fs.statSync(statePath).isDirectory()) continue;
    for (const familyDir of fs.readdirSync(statePath).sort()) {
      const familyPath = path.join(statePath, familyDir);
      if (!fs.statSync(familyPath).isDirectory()) continue;

      const onDisk = artifactsOnDisk(familyPath);
      const record = readJson(path.join(familyPath, SIDECAR));
      if (!record && onDisk.length === 0) continue; // a family that carries no artifacts owes no record

      const family = {
        familyId: `${state}/${familyDir}`,
        record,
        artifactsOnDisk: onDisk,
        fieldMap: null,
        sourceRecordSha256: null,
        observed: []
      };

      // The committed map, and the hash the renderer would have taken of it.
      for (const cand of FIELD_MAP_SHAPES) {
        const map = readJson(path.join(familyPath, cand.file));
        if (!map || !cand.schema.test(String(map.schemaVersion ?? ""))) continue;
        family.fieldMap = {
          file: cand.file, schemaVersion: map.schemaVersion,
          hashedPart: cand.hashedPart, derivedSha256: hashJson(cand.pick(map))
        };
        break;
      }
      const anyMap = FIELD_MAP_SHAPES
        .map((c) => readJson(path.join(familyPath, c.file)))
        .find((m) => m !== null);
      family.declaredMapSchema = anyMap ? String(anyMap.schemaVersion ?? "(none)") : null;

      // The source identity the family records for itself, independently of
      // the sidecar's claim about it.
      const sourceRecord = readJson(path.join(familyPath, "source-record.json"), {});
      const profile = readJson(path.join(familyPath, "overlay-profile.json"), {});
      family.sourceRecordSha256 = sourceRecord.sha256 ?? profile.sha256 ?? null;

      for (const row of record?.artifacts ?? []) {
        const file = path.join(familyPath, String(row.artifact ?? ""));
        const observation = {
          artifact: row.artifact, exists: fs.existsSync(file),
          sha256: null, byteLength: null, normalizedContentSha256: null,
          pageCount: null, coverageReason: null
        };
        if (observation.exists) {
          const bytes = fs.readFileSync(file);
          observation.sha256 = sha256(bytes);
          observation.byteLength = bytes.length;
          observation.normalizedContentSha256 = await normalizedContentHash(bytes);
          const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
          observation.pageCount = doc.getPageCount();
          // The shipped predicate, asked about the real record and the real
          // bytes. A verifier that only ran its own arithmetic could agree with
          // itself while disagreeing with the module every consumer calls.
          const covered = provenanceCoversArtifact(record, row.artifact, bytes);
          observation.coverageReason = covered.covered ? null : covered.reason;
        }
        family.observed.push(observation);
      }
      families.push(family);
    }
  }
  return { shape, families };
}

function failures(model) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };
  const { shape } = model;

  fail(model.families.length > 0, "the corpus contains no family carrying a finalized artifact");

  const outputOwners = new Map();

  for (const family of model.families) {
    const id = family.familyId;
    const record = family.record;

    // C1 -- an artifact a participant receives is never unaccounted for.
    if (!record) {
      fail(false, `${id}: carries ${family.artifactsOnDisk.length} finalized artifact(s) and no provenance sidecar`);
      continue;
    }

    // S1..S6 -- the record is a canonical record of the current schema.
    fail(record.schemaVersion === PROVENANCE_SCHEMA,
      `${id}: sidecar declares schema ${JSON.stringify(record.schemaVersion)}, not ${PROVENANCE_SCHEMA}`);
    const missingKeys = shape.keys.filter((k) => !(k in record));
    fail(missingKeys.length === 0,
      `${id}: sidecar claims ${PROVENANCE_SCHEMA} but omits ${missingKeys.length} field(s) that schema emits (${missingKeys.join(", ")})`);
    for (const field of REQUIRED_NON_NULL) {
      fail(record[field] !== undefined && record[field] !== null, `${id}: sidecar records no ${field}`);
    }
    fail(record.purpose === shape.purpose,
      `${id}: sidecar carries a purpose statement the current schema does not write`);
    fail(record.factoryVersion === FACTORY_VERSION,
      `${id}: sidecar names factory ${JSON.stringify(record.factoryVersion)}, not the current ${FACTORY_VERSION}`);
    const stamp = Date.parse(record.generatedAt ?? "");
    fail(Number.isFinite(stamp), `${id}: generatedAt ${JSON.stringify(record.generatedAt)} is not an instant`);
    fail(!Number.isFinite(stamp) || stamp <= Date.now(),
      `${id}: generatedAt is in the future, so the record predates nothing`);
    fail(Array.isArray(record.artifacts) && record.artifacts.length > 0,
      `${id}: sidecar names no artifact, so it describes nothing`);

    // F1, F2 -- INPUT IDENTITY. The map that decided what was written.
    if (!family.fieldMap) {
      fail(false, family.declaredMapSchema === null
        ? `${id}: no field map or overlay profile on disk, so fieldMapSha256 describes an input that is not committed`
        : `${id}: the field map declares schema ${JSON.stringify(family.declaredMapSchema)}, which this verifier cannot re-derive; fieldMapSha256 is unfalsifiable until it can`);
    } else {
      fail(family.fieldMap.derivedSha256 === record.fieldMapSha256,
        `${id}: INPUT DRIFT -- ${family.fieldMap.file} (${family.fieldMap.hashedPart}) hashes to ` +
        `${family.fieldMap.derivedSha256?.slice(0, 12)}, the sidecar names ${String(record.fieldMapSha256).slice(0, 12)}. ` +
        "The committed map is not the map these artifacts were rendered from.");
    }

    // F3 -- SOURCE IDENTITY, cross-checked against the family's own record.
    if (family.sourceRecordSha256 && record.sourceSha256) {
      fail(family.sourceRecordSha256 === record.sourceSha256,
        `${id}: SOURCE DRIFT -- the family records source ${family.sourceRecordSha256.slice(0, 12)}, ` +
        `the sidecar names ${String(record.sourceSha256).slice(0, 12)}`);
    }

    // A1..A6 -- OUTPUT IDENTITY, per artifact, against the bytes on disk.
    const named = new Set();
    for (let i = 0; i < record.artifacts.length; i += 1) {
      const row = record.artifacts[i];
      const seen = family.observed[i] ?? null;
      const label = `${id}:${row.artifact}`;
      named.add(row.artifact);

      if (!seen || !seen.exists) {
        fail(false, `${label}: the sidecar names an artifact that is not on disk`);
        continue;
      }
      fail(row.outputSha256 === seen.sha256,
        `${label}: OUTPUT DRIFT -- the bytes hash to ${seen.sha256.slice(0, 12)}, the record names ${String(row.outputSha256).slice(0, 12)}`);
      fail(row.byteLength === seen.byteLength,
        `${label}: the record claims ${row.byteLength} bytes, the file is ${seen.byteLength}`);
      fail(row.normalizedContentSha256 === seen.normalizedContentSha256,
        `${label}: CONTENT DRIFT -- the page content hashes to ${seen.normalizedContentSha256.slice(0, 12)}, ` +
        `the record names ${String(row.normalizedContentSha256).slice(0, 12)}. The document says something other than what was recorded.`);
      fail(row.pageCount === seen.pageCount,
        `${label}: the record claims ${JSON.stringify(row.pageCount)} page(s), the file has ${seen.pageCount}`);
      fail(Number.isInteger(row.pageCount) && row.pageCount >= 1,
        `${label}: the record states no usable page count`);
      fail(seen.coverageReason === null,
        `${label}: provenanceCoversArtifact refuses this record for these bytes (${seen.coverageReason})`);

      // X1 -- one artifact's bytes belong to one family. Two families naming
      // the same output hash means one family's artifact was copied into the
      // other, and the copy's sidecar is describing a document it did not
      // render. Within a family this is legitimate: a form the court forbids
      // filling refuses both fixtures identically.
      if (row.outputSha256) {
        const owner = outputOwners.get(row.outputSha256);
        if (owner && owner.familyId !== id) {
          fail(false, `${label}: shares its exact bytes with ${owner.familyId}:${owner.artifact}, so one of the two records describes an artifact it did not produce`);
        } else if (!owner) {
          outputOwners.set(row.outputSha256, { familyId: id, artifact: row.artifact });
        }
      }
    }

    // A7 -- nothing a participant receives is left unbound.
    for (const rel of family.artifactsOnDisk) {
      fail(named.has(rel), `${id}: ${rel} is on disk and no sidecar row names it, so its bytes are unattested`);
    }
  }
  return out;
}

/** Families whose optional input bindings the current records leave null. */
function unboundInputs(model) {
  const census = { classification: [], packetSpec: [], sourceUrl: [], sourceRevision: [] };
  for (const family of model.families) {
    const r = family.record;
    if (!r) continue;
    if (!r.classificationSha256) census.classification.push(family.familyId);
    if (!r.packetSpecSha256) census.packetSpec.push(family.familyId);
    if (!r.sourceUrl) census.sourceUrl.push(family.familyId);
    if (!r.sourceRevision) census.sourceRevision.push(family.familyId);
  }
  return census;
}

const shape = await canonicalShape();
const model = await readCorpus(shape);

if (MUTATIONS) {
  const base = failures(model).length;
  const clone = () => JSON.parse(JSON.stringify(model));
  const withRecord = (m) => m.families.find((f) => f.record && f.observed.length > 0);

  const mutations = [
    ["the committed field map is edited without re-rendering", (m) => {
      withRecord(m).fieldMap.derivedSha256 = "0".repeat(64);
    }],
    ["the field map declares a schema the verifier cannot re-derive", (m) => {
      const f = withRecord(m); f.fieldMap = null; f.declaredMapSchema = "rcap-acroform-map/v99-invented";
    }],
    ["the field map is not committed at all", (m) => {
      const f = withRecord(m); f.fieldMap = null; f.declaredMapSchema = null;
    }],
    ["the court reissues the form and the source record moves", (m) => {
      withRecord(m).sourceRecordSha256 = "1".repeat(64);
    }],
    ["an artifact's bytes change under a record that still names the old hash", (m) => {
      withRecord(m).observed[0].sha256 = "2".repeat(64);
    }],
    ["the artifact says something else while its byte hash is left alone", (m) => {
      withRecord(m).observed[0].normalizedContentSha256 = "3".repeat(64);
    }],
    ["a page is added to the artifact", (m) => {
      withRecord(m).observed[0].pageCount += 1;
    }],
    ["the record states no page count", (m) => {
      withRecord(m).record.artifacts[0].pageCount = null;
    }],
    ["the file grows and the record keeps the old length", (m) => {
      withRecord(m).observed[0].byteLength += 1;
    }],
    ["the sidecar names an artifact that is not on disk", (m) => {
      withRecord(m).observed[0].exists = false;
    }],
    ["an artifact on disk is named by no sidecar row", (m) => {
      withRecord(m).artifactsOnDisk.push("fixtures/unattested.pdf");
    }],
    ["a family carrying artifacts loses its sidecar", (m) => {
      const f = withRecord(m); f.record = null; f.observed = [];
    }],
    ["the sidecar is relabelled to a schema it does not satisfy", (m) => {
      withRecord(m).record.schemaVersion = "rcap-artifact-provenance/v2";
    }],
    ["a record wears the current schema while omitting fields that schema emits", (m) => {
      delete withRecord(m).record.assetId;
    }],
    ["a required identity is nulled", (m) => {
      withRecord(m).record.fieldMapSha256 = null;
    }],
    ["the purpose statement is rewritten", (m) => {
      withRecord(m).record.purpose = "Provenance.";
    }],
    ["the record names a factory that no longer exists", (m) => {
      withRecord(m).record.factoryVersion = "d0-superseded-v1";
    }],
    ["generatedAt is a clock read from the future", (m) => {
      withRecord(m).record.generatedAt = new Date(Date.now() + 864e5).toISOString();
    }],
    ["the shipped coverage predicate refuses the record", (m) => {
      withRecord(m).observed[0].coverageReason = "provenance_hash_does_not_match_the_bytes";
    }],
    ["one family's artifact is copied into another family", (m) => {
      const [a, b] = m.families.filter((f) => f.record && f.record.artifacts.length > 0);
      b.record.artifacts[0].outputSha256 = a.record.artifacts[0].outputSha256;
      b.observed[0].sha256 = a.record.artifacts[0].outputSha256;
    }]
  ];

  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const m = clone();
    mutate(m);
    const caught = failures(m).length > base;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-provenance-sidecars FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way a sidecar can stop describing its source, its inputs or its bytes is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

const problems = failures(model);
if (problems.length > 0) {
  console.error(`verify-rcap-provenance-sidecars FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems.slice(0, 40)) console.error(` - ${problem}`);
  if (problems.length > 40) console.error(` ... and ${problems.length - 40} more`);
  process.exit(1);
}

const sidecars = model.families.filter((f) => f.record);
const rows = sidecars.reduce((n, f) => n + f.record.artifacts.length, 0);
const bytes = sidecars.reduce((n, f) => n + f.observed.reduce((s, o) => s + (o.byteLength ?? 0), 0), 0);
const census = unboundInputs(model);

console.log(
  `provenance sidecars: ${sidecars.length} record(s) binding ${rows} finalized artifact(s) ` +
  `(${(bytes / 1024 / 1024).toFixed(1)} MiB) across ${new Set(sidecars.map((f) => f.familyId.split("/")[0])).size} jurisdiction(s).`
);
console.log(
  `Re-derived from disk: ${rows} output hash(es), ${rows} normalized-content hash(es), ${rows} page count(s) and byte length(s), ` +
  `${sidecars.length} field-map hash(es) against the committed map, ${sidecars.filter((f) => f.sourceRecordSha256).length} source hash(es) against the family's own record.`
);
// Not a failure: the current schema leaves these optional and neither
// production renderer supplies them. Printed so the next re-emission has an
// exact worklist rather than an impression.
console.log(
  `Input bindings the current records leave null — classification ${census.classification.length}/${sidecars.length}, ` +
  `packet spec ${census.packetSpec.length}/${sidecars.length}, source URL ${census.sourceUrl.length}/${sidecars.length}, ` +
  `source revision ${census.sourceRevision.length}/${sidecars.length}.`
);
console.log("Source identity, input identity and output identity each check against something other than the record making the claim.");
