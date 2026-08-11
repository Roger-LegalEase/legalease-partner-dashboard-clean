// Official-source store verifier.
//
// The store (data/record-clearing/official-sources/<JUR>/) materializes the
// official statute, rule and form sources cited by a jurisdiction's registry
// tracks. Each jurisdiction carries a manifest whose entries are either
// checksum-pinned (sha256 known from the nationwide private-folder inventory)
// or identity-only (the identity is carried by the registry-crosswalk
// projection but no checksum exists anywhere yet). Bytes land in files/
// beside the manifest.
//
// The verifier proves, for every manifest:
//   - structural integrity (unique ids, legal enums, sha256 shapes);
//   - provenance anchors: the generatedFrom hashes equal the current
//     projection and inventory bytes, and every pinned checksum equals the
//     inventory's checksum for that file name;
//   - track coverage: every registry track listed for the jurisdiction is
//     cited by at least one source, and no source cites an unknown track;
//   - official-host discipline: an expectedUrl may only point at an official
//     government, court or legislature host — a mirror can never satisfy an
//     entry;
//   - byte integrity: a file present under files/ must hash to its pinned
//     checksum and be marked materialized with a retrieval date; a missing
//     file must be marked bytes-pending; no unknown bytes may appear.
//
// Usage: node scripts/verify-rcap-official-source-store.mjs

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storeDir = path.join(rootDir, "data/record-clearing/official-sources");

const failures = [];
const assert = (cond, message) => {
  if (!cond) failures.push(message);
};
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

const OFFICIAL_HOSTS = [
  "www.legis.state.pa.us",
  "www.pacodeandbulletin.gov",
  "www.pacourts.us",
  "www.pa.gov",
  "www.psp.pa.gov",
  "www.scstatehouse.gov",
  "www.sccourts.org",
  "sled.sc.gov"
];

const CLASSES = new Set([
  "statute_html",
  "court_rule_html",
  "court_form_pdf",
  "agency_form_pdf",
  "official_web_page",
  "session_law"
]);
const STATUSES = new Set(["materialized", "pinned_checksum_bytes_pending", "identity_only_bytes_pending"]);

if (!fs.existsSync(storeDir)) {
  console.error("verify-rcap-official-source-store: no store at data/record-clearing/official-sources");
  process.exit(1);
}

// Provenance anchors shared by all manifests.
const projPath = "data/rcap-ledger/registry-crosswalk-projection.json";
const invPath = "data/rcap-all50/nationwide-source-inventory.json";
const projSha = sha256(fs.readFileSync(path.join(rootDir, projPath)));
const invSha = sha256(fs.readFileSync(path.join(rootDir, invPath)));
const projection = JSON.parse(fs.readFileSync(path.join(rootDir, projPath), "utf8"));
const inventory = JSON.parse(fs.readFileSync(path.join(rootDir, invPath), "utf8"));

const projTracks = new Map(); // jurisdiction -> Set(trackId)
for (const t of projection.tracks) {
  const j = String(t.jurisdiction ?? "");
  const id = t.registryTrackId ?? t.trackId ?? t.id;
  if (!projTracks.has(j)) projTracks.set(j, new Set());
  projTracks.get(j).add(id);
}
const invByState = new Map(); // code -> Map(fileName -> {sha256,sizeBytes})
for (const s of inventory.states) {
  invByState.set(s.code, new Map(s.files.map((f) => [f.fileName, f])));
}

const totals = { manifests: 0, sources: 0, materialized: 0, pinnedPending: 0, identityPending: 0 };

for (const jur of fs.readdirSync(storeDir).sort()) {
  const manifestPath = path.join(storeDir, jur, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    failures.push(`${jur}: no manifest.json`);
    continue;
  }
  totals.manifests += 1;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  assert(manifest.schemaVersion === "rcap-official-source-store/v1", `${jur}: unknown schemaVersion`);
  assert(manifest.jurisdiction === jur, `${jur}: manifest jurisdiction mismatch (${manifest.jurisdiction})`);
  assert(
    manifest.generatedFrom?.registryCrosswalkProjection?.sha256 === projSha,
    `${jur}: projection anchor hash drifted — regenerate the manifest against the current projection`
  );
  assert(
    manifest.generatedFrom?.nationwideSourceInventory?.sha256 === invSha,
    `${jur}: inventory anchor hash drifted — regenerate the manifest against the current inventory`
  );

  const knownTracks = projTracks.get(jur) ?? new Set();
  for (const tid of manifest.trackCoverage ?? []) {
    assert(knownTracks.has(tid), `${jur}: trackCoverage names unknown registry track ${tid}`);
  }
  assert(
    (manifest.trackCoverage ?? []).length === knownTracks.size,
    `${jur}: trackCoverage lists ${(manifest.trackCoverage ?? []).length} tracks; the projection carries ${knownTracks.size}`
  );

  const ids = new Set();
  const cited = new Set();
  const fileNames = new Set();
  const invFiles = invByState.get(jur) ?? new Map();

  for (const src of manifest.sources ?? []) {
    totals.sources += 1;
    assert(!ids.has(src.sourceId), `${jur}: duplicate sourceId ${src.sourceId}`);
    ids.add(src.sourceId);
    assert(CLASSES.has(src.class), `${jur}:${src.sourceId}: unknown class ${src.class}`);
    assert(STATUSES.has(src.retrievalStatus), `${jur}:${src.sourceId}: unknown retrievalStatus ${src.retrievalStatus}`);
    assert(typeof src.issuingBody === "string" && src.issuingBody.length > 0, `${jur}:${src.sourceId}: issuingBody required`);

    if (src.expectedSha256 != null) {
      assert(/^[0-9a-f]{64}$/.test(src.expectedSha256), `${jur}:${src.sourceId}: malformed expectedSha256`);
      const invRow = src.fileName ? invFiles.get(src.fileName) : null;
      if (invRow) {
        assert(
          invRow.sha256 === src.expectedSha256,
          `${jur}:${src.sourceId}: pinned checksum disagrees with the nationwide inventory for ${src.fileName}`
        );
      }
      assert(
        src.retrievalStatus !== "identity_only_bytes_pending",
        `${jur}:${src.sourceId}: has a pinned checksum but is marked identity-only`
      );
    } else {
      assert(
        src.retrievalStatus === "identity_only_bytes_pending",
        `${jur}:${src.sourceId}: no checksum pinned yet must be identity_only_bytes_pending`
      );
    }

    if (src.expectedUrl != null) {
      let host = null;
      try {
        host = new URL(src.expectedUrl).host;
      } catch {
        failures.push(`${jur}:${src.sourceId}: expectedUrl is not a URL`);
      }
      if (host) {
        assert(
          OFFICIAL_HOSTS.includes(host),
          `${jur}:${src.sourceId}: expectedUrl host ${host} is not an official source host — mirrors can never satisfy an entry`
        );
      }
    }

    for (const tid of src.citedByTracks ?? []) {
      assert(knownTracks.has(tid), `${jur}:${src.sourceId}: cites unknown registry track ${tid}`);
      cited.add(tid);
    }

    if (src.fileName) {
      assert(!fileNames.has(src.fileName), `${jur}: two sources claim file ${src.fileName}`);
      fileNames.add(src.fileName);
      const bytesPath = path.join(storeDir, jur, "files", src.fileName);
      const present = fs.existsSync(bytesPath);
      if (present) {
        const actual = sha256(fs.readFileSync(bytesPath));
        assert(
          src.expectedSha256 != null,
          `${jur}:${src.sourceId}: bytes present but no checksum pinned — pin the checksum in the manifest with the retrieval record`
        );
        if (src.expectedSha256 != null) {
          assert(
            actual === src.expectedSha256,
            `${jur}:${src.sourceId}: bytes at files/${src.fileName} hash ${actual.slice(0, 12)}, expected ${src.expectedSha256.slice(0, 12)}`
          );
        }
        assert(src.retrievalStatus === "materialized", `${jur}:${src.sourceId}: bytes present but status is ${src.retrievalStatus}`);
        assert(src.retrievedAt != null, `${jur}:${src.sourceId}: materialized without a retrieval date`);
        totals.materialized += 1;
      } else {
        assert(
          src.retrievalStatus !== "materialized",
          `${jur}:${src.sourceId}: marked materialized but files/${src.fileName} is absent`
        );
      }
    } else {
      assert(
        src.retrievalStatus !== "materialized",
        `${jur}:${src.sourceId}: materialized entries must name their file`
      );
    }

    if (src.retrievalStatus === "pinned_checksum_bytes_pending") totals.pinnedPending += 1;
    if (src.retrievalStatus === "identity_only_bytes_pending") totals.identityPending += 1;
  }

  // Every registry track for the jurisdiction is covered by at least one source.
  for (const tid of knownTracks) {
    assert(cited.has(tid), `${jur}: registry track ${tid} is cited by no source entry`);
  }

  // No unknown bytes in files/.
  const filesDir = path.join(storeDir, jur, "files");
  if (fs.existsSync(filesDir)) {
    for (const f of fs.readdirSync(filesDir)) {
      assert(fileNames.has(f), `${jur}: files/${f} is not named by any manifest entry`);
    }
  }
}

if (failures.length > 0) {
  console.error("verify-rcap-official-source-store FAILED");
  for (const failure of failures.slice(0, 40)) console.error(` - ${failure}`);
  if (failures.length > 40) console.error(` … and ${failures.length - 40} more`);
  process.exit(1);
}

console.log("verify-rcap-official-source-store passed.");
console.log(
  `  manifests: ${totals.manifests}; sources: ${totals.sources}; materialized: ${totals.materialized}; checksum-pinned pending bytes: ${totals.pinnedPending}; identity-only pending: ${totals.identityPending}`
);
console.log("  provenance anchors verified against the projection and the nationwide inventory; official-host discipline enforced");
