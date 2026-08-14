// Verifier for the final-official-sources lane record (PA path-k, SC survivor
// expungement).
//
// Fails when:
//   - either subject is omitted (exact subjectIds);
//   - a non-official host is presented as final authority;
//   - a materialized subject's source path does not resolve;
//   - the bytes do not hash to the recorded sha256;
//   - the cited section pointer is absent from the bytes;
//   - the quoted verbatim operative span is absent from the bytes;
//   - a conclusion exceeds what the source states: a still_blocked subject
//     carrying a verified authority, a hash, a span, a currentness finding or
//     a support verdict — or a materialized subject missing any of them;
//   - a preserved retrieval packet is missing or its bytes drifted from the
//     pinned sha256.
//
// Usage: node scripts/verify-rcap-final-official-sources.mjs

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECORD = "data/rcap-crosswalk-enrichment/final-official-sources/final-official-sources.json";

const failures = [];
const assert = (cond, message) => {
  if (!cond) failures.push(message);
};
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const normalize = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[§\s.,()[\]{}–—\-"'`“”‘’*_|:;]/g, "");

const REQUIRED_SUBJECTS = [
  "compiled_pathway:PA:path-k-human-trafficking-vacatur-expungement",
  "compiled_pathway:SC:human-trafficking-survivor-expungement"
];

const OFFICIAL_HOSTS = [
  "www.legis.state.pa.us",
  "www.palegis.us",
  "www.pacodeandbulletin.gov",
  "www.pacourts.us",
  "www.pa.gov",
  "www.scstatehouse.gov",
  "www.sccourts.org",
  "sled.sc.gov"
];

const recordPath = path.join(rootDir, RECORD);
if (!fs.existsSync(recordPath)) {
  console.error(`verify-rcap-final-official-sources FAILED\n - ${RECORD} does not exist`);
  process.exit(1);
}
const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));

const byId = new Map((record.subjects ?? []).map((s) => [s.subjectId, s]));
for (const id of REQUIRED_SUBJECTS) {
  assert(byId.has(id), `subject omitted: ${id}`);
}
assert((record.subjects ?? []).length === REQUIRED_SUBJECTS.length, "unexpected extra subject in the lane record");

const hostOf = (url) => {
  try {
    return new URL(String(url).split(" ")[0]).host;
  } catch {
    return null;
  }
};

let materialized = 0;
let blocked = 0;

for (const subject of record.subjects ?? []) {
  const id = subject.subjectId;

  // Official-host discipline on any URL presented for the subject.
  if (subject.officialSourceUrl) {
    const host = hostOf(subject.officialSourceUrl);
    assert(host && OFFICIAL_HOSTS.includes(host), `${id}: officialSourceUrl host ${host} is not an official source host`);
  }

  if (subject.resolution === "still_blocked") {
    blocked += 1;
    // A blocked subject asserts nothing the missing source would have to prove.
    assert(subject.verifiedOperativeAuthority === null, `${id}: still_blocked but claims a verified operative authority`);
    assert(subject.sha256 === null && subject.sourcePath === null, `${id}: still_blocked but carries source bytes fields`);
    assert(subject.verbatimOperativeSpan === null, `${id}: still_blocked but quotes an operative span`);
    assert(subject.sourceCurrentness === null, `${id}: still_blocked but states a currentness finding`);
    assert(subject.supportsProposedRelationship === null, `${id}: still_blocked but states a support verdict`);
    assert(
      typeof subject.exactMissingEvidence === "string" && subject.exactMissingEvidence.length > 40,
      `${id}: still_blocked must name the exact missing evidence`
    );
    assert(typeof subject.blockerOwner === "string" && subject.blockerOwner.length > 0, `${id}: still_blocked must name the blocker owner`);
    // The externally owned unblocking act must be recorded as attempted from
    // here: at least one retrieval attempt with a recorded failure.
    const attempts = (record.retrievalAttempts ?? []).filter((a) => a.subjectId === id);
    assert(attempts.length > 0, `${id}: still_blocked without a recorded retrieval attempt`);
    for (const attempt of attempts) {
      const host = hostOf(attempt.url);
      assert(host && OFFICIAL_HOSTS.includes(host), `${id}: retrieval attempt against non-official host ${host}`);
      assert(/EGRESS_BLOCKED|403|000|refused|timeout/i.test(attempt.result ?? ""), `${id}: retrieval attempt lacks a recorded failure`);
    }
  } else if (subject.resolution === "materialized") {
    materialized += 1;
    assert(typeof subject.verifiedOperativeAuthority === "string", `${id}: materialized without a verified operative authority`);
    assert(typeof subject.sourcePath === "string", `${id}: materialized without a source path`);
    assert(/^[0-9a-f]{64}$/.test(subject.sha256 ?? ""), `${id}: materialized without a sha256`);
    assert(subject.retrievalTimestamp != null, `${id}: materialized without a retrieval timestamp`);
    assert(typeof subject.sectionPointer === "string" && subject.sectionPointer.length > 0, `${id}: materialized without a section pointer`);
    assert(
      typeof subject.verbatimOperativeSpan === "string" && subject.verbatimOperativeSpan.length >= 40,
      `${id}: materialized without a verbatim operative span`
    );
    assert(typeof subject.sourceCurrentness === "string", `${id}: materialized without a currentness finding`);
    assert(
      subject.supportsProposedRelationship === true || subject.supportsProposedRelationship === false,
      `${id}: materialized must state whether the source supports the proposed relationship`
    );
    const host = hostOf(subject.officialSourceUrl);
    assert(host && OFFICIAL_HOSTS.includes(host), `${id}: materialized from non-official host ${host}`);

    // Operator-provenance is mandatory on ingested receipts: bytes that were
    // not fetched by this terminal must say exactly who supplied them and how.
    const prov = subject.provenance;
    assert(prov && typeof prov === "object", `${id}: materialized receipt lacks operator provenance`);
    if (prov) {
      assert(typeof prov.bytesSuppliedBy === "string" && prov.bytesSuppliedBy.length > 0, `${id}: provenance lacks bytesSuppliedBy`);
      assert(typeof prov.transferMethod === "string" && prov.transferMethod.length > 0, `${id}: provenance lacks transferMethod`);
      assert(typeof prov.urlVerifiedFromThisEnvironment === "boolean", `${id}: provenance lacks urlVerifiedFromThisEnvironment`);
      assert(typeof prov.operatorAttestation === "string" && prov.operatorAttestation.length > 0, `${id}: provenance lacks operatorAttestation`);
    }

    const bytesPath = path.join(rootDir, subject.sourcePath ?? "");
    if (!fs.existsSync(bytesPath)) {
      failures.push(`${id}: source path ${subject.sourcePath} does not resolve`);
    } else {
      const bytes = fs.readFileSync(bytesPath);
      assert(sha256(bytes) === subject.sha256, `${id}: bytes do not hash to the recorded sha256`);
      const text = normalize(bytes.toString("utf8"));
      assert(text.includes(normalize(subject.sectionPointer)), `${id}: cited section pointer is absent from the source bytes`);
      assert(text.includes(normalize(subject.verbatimOperativeSpan)), `${id}: quoted operative span is absent from the source bytes`);
    }
  } else {
    failures.push(`${id}: unknown resolution ${subject.resolution}`);
  }

  // Retrieval packet preservation.
  const packet = subject.retrievalPacket ?? {};
  const packetPath = path.join(rootDir, packet.path ?? "");
  if (!packet.path || !fs.existsSync(packetPath)) {
    failures.push(`${id}: preserved retrieval packet missing (${packet.path})`);
  } else {
    assert(
      sha256(fs.readFileSync(packetPath)) === packet.sha256,
      `${id}: retrieval packet bytes drifted from the pinned sha256`
    );
  }
}

// No unknown bytes may sit in the files root unclaimed by a subject.
const filesRoot = path.join(rootDir, "data/rcap-crosswalk-enrichment/final-official-sources/files");
if (fs.existsSync(filesRoot)) {
  const claimed = new Set(
    (record.subjects ?? []).map((s) => s.sourcePath).filter(Boolean).map((p) => path.resolve(rootDir, p))
  );
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else assert(claimed.has(path.resolve(p)), `unclaimed bytes in files root: ${path.relative(rootDir, p)}`);
    }
  };
  walk(filesRoot);
}

if (failures.length > 0) {
  console.error("verify-rcap-final-official-sources FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("verify-rcap-final-official-sources passed.");
console.log(`  subjects: ${record.subjects.length} (materialized: ${materialized}, still_blocked: ${blocked})`);
console.log("  official-host discipline, packet preservation and conclusion bounds verified");
