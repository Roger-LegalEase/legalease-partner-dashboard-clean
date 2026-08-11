#!/usr/bin/env node
// Official-source discipline mutations for the two license-verified registry
// gaps that closed Milestone 1 item 2 (PA 18 Pa.C.S. § 3019(d)-(g), SC
// S.C. Code § 16-3-2020(F)).
//
// The canonical crosswalk may carry these classifications only while the
// preserved official bytes, their receipts, the registry-absence of the
// operative authority, and the compiled pathway's mechanism text all hold.
// Each class below breaks exactly one of those conditions and requires the
// canonical generator's check mode to turn red. If any mutation survives, the
// closure is not evidence-conditional and this suite fails the build.
//
//   node scripts/verify-rcap-official-source-mutations.mjs

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const RECORD = "data/rcap-crosswalk-enrichment/final-official-sources/final-official-sources.json";
const PA_BYTES = "data/rcap-crosswalk-enrichment/final-official-sources/files/PA/PA_18_PaCS_3019_d-g_official_2026-08-11.txt";
const SC_BYTES = "data/rcap-crosswalk-enrichment/final-official-sources/files/SC/SC_Code_16-3-2020_F_official_2026-08-11.txt";
const ADJUDICATIONS = "data/rcap-ledger/crosswalk-adjudications.json";
const PROJECTION = "data/rcap-ledger/registry-crosswalk-projection.json";
const PA_PROFILE = "src/lib/rcap-engine/compiled/profiles/PA-pennsylvania.json";

const MUTATED_FILES = [RECORD, PA_BYTES, SC_BYTES, ADJUDICATIONS, PROJECTION, PA_PROFILE];

const abs = (rel) => path.join(rootDir, rel);
const originals = new Map(MUTATED_FILES.map((rel) => [rel, fs.readFileSync(abs(rel))]));
const restoreAll = () => {
  for (const [rel, bytes] of originals) fs.writeFileSync(abs(rel), bytes);
};

const editJson = (rel, edit) => {
  const doc = JSON.parse(fs.readFileSync(abs(rel), "utf8"));
  edit(doc);
  fs.writeFileSync(abs(rel), `${JSON.stringify(doc, null, 2)}\n`);
};

const MUTATIONS = [
  [
    "PA official bytes drift: a byte appended after receipt",
    () => fs.appendFileSync(abs(PA_BYTES), "x"),
  ],
  [
    "SC official bytes drift: operative tail truncated",
    () => {
      const text = originals.get(SC_BYTES).toString("utf8");
      fs.writeFileSync(abs(SC_BYTES), text.slice(0, Math.floor(text.length / 2)));
    },
  ],
  [
    "receipt hash drift: subject sha256 rewritten",
    () =>
      editJson(RECORD, (doc) => {
        const s = doc.subjects.find((x) => x.jurisdiction === "PA");
        s.sha256 = "0".repeat(64);
      }),
  ],
  [
    "receipt support verdict withdrawn",
    () =>
      editJson(RECORD, (doc) => {
        const s = doc.subjects.find((x) => x.jurisdiction === "SC");
        s.supportsProposedRelationship = false;
      }),
  ],
  [
    "receipt subject removed from the record",
    () =>
      editJson(RECORD, (doc) => {
        doc.subjects = doc.subjects.filter((x) => x.jurisdiction !== "PA");
      }),
  ],
  [
    "false closure: license-verified gap adjudication deleted while the E4 lift stands",
    () =>
      editJson(ADJUDICATIONS, (doc) => {
        doc.adjudications = doc.adjudications.filter(
          (r) => !(r.jurisdiction === "PA" && r.compiledPathwayId === "path-k-human-trafficking-vacatur-expungement")
        );
      }),
  ],
  [
    "operative authority becomes registered: a PA track claims § 3019",
    () =>
      editJson(PROJECTION, (doc) => {
        const t = doc.tracks.find((x) => x.jurisdiction === "PA");
        t.authority = ["18 Pa.C.S. § 3019", ...(t.authority || []).slice(1)];
      }),
  ],
  [
    "profile drift: the compiled pathway loses its mechanism text",
    () => {
      const text = originals.get(PA_PROFILE).toString("utf8");
      fs.writeFileSync(abs(PA_PROFILE), text.replace(/vacatur/gi, "relief"));
    },
  ],
];

let failures = 0;
for (const [name, mutate] of MUTATIONS) {
  restoreAll();
  try {
    mutate();
    let red = false;
    try {
      execFileSync(process.execPath, [path.join(rootDir, "scripts/generate-rcap-track-pathway-crosswalk.mjs"), "--check"], {
        cwd: rootDir,
        stdio: "pipe",
      });
    } catch {
      red = true;
    }
    if (red) {
      console.log(`  caught   ${name}`);
    } else {
      console.error(`  MISSED   ${name}`);
      failures += 1;
    }
  } finally {
    restoreAll();
  }
}

// The unmutated tree must still verify — the harness itself may not leave red.
try {
  execFileSync(process.execPath, [path.join(rootDir, "scripts/generate-rcap-track-pathway-crosswalk.mjs"), "--check"], {
    cwd: rootDir,
    stdio: "pipe",
  });
} catch {
  console.error("  MISSED   unmutated tree fails check mode (harness restore defect)");
  failures += 1;
}

if (failures > 0) {
  console.error(`verify-rcap-official-source-mutations FAILED: ${failures} mutation(s) survived`);
  process.exit(1);
}
console.log("Official-source discipline proven: all 8 mutations turn the canonical crosswalk check red.");
