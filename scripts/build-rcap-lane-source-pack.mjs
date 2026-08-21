#!/usr/bin/env node
// Builds an installable source pack for one family-rerender lane.
//
//   node scripts/build-rcap-lane-source-pack.mjs family-rerender-1
//
// A lane that has the captain's assignment but not the bytes cannot run the
// driver at all. This assembles exactly the official PDFs that lane is assigned
// -- nothing else -- with the manifest needed to prove on arrival that the
// bytes are the ones this repository pins.
//
// It carries no LegalEase output. Not a fixture, not a contact sheet, not a
// provenance sidecar, not a rendered artifact: only the issuing courts' own
// documents, at the canonical relative paths the Master Library gives them.
// A pack that smuggled our output would let a lane render from something we
// produced and call the result source-backed.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = process.env.RCAP_BUNDLE_EXTRACT
  ?? path.join(rootDir, "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
const OVERLAY_DIR = path.join(rootDir, "data/rcap-all50/overlays/production");
// Written under private/, which is git-ignored: a pack of court PDFs is a
// working input, not a repository artifact.
const OUT_ROOT = path.join(rootDir, "private/source-packs");

const lane = process.argv[2];
if (!lane) { console.error("usage: build-rcap-lane-source-pack.mjs <lane-assignment-name>"); process.exit(1); }

const readJson = (p, fallback = null) => {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
};

const assignment = readJson(path.join(rootDir, `data/rcap-all50/gate-b-assignments/${lane}.json`));
if (!assignment) { console.error(`no assignment at data/rcap-all50/gate-b-assignments/${lane}.json`); process.exit(1); }

// Locate each assigned family's package, and from it the pinned source.
const packageOf = new Map();
for (const state of fs.readdirSync(OVERLAY_DIR).sort()) {
  const stateDir = path.join(OVERLAY_DIR, state);
  if (!fs.statSync(stateDir).isDirectory()) continue;
  for (const slug of fs.readdirSync(stateDir).sort()) {
    const record = readJson(path.join(stateDir, slug, "source-record.json"));
    if (!record) continue;
    packageOf.set(`${record.jurisdiction}:${slug}`, { record, dir: path.join(stateDir, slug) });
  }
}

const files = [];
const unresolved = [];
const seenSha = new Set();

for (const familyId of assignment.familyIds ?? []) {
  const found = packageOf.get(familyId);
  if (!found) { unresolved.push({ familyId, why: "no family package carries this id" }); continue; }
  const { record } = found;

  const bundleRelative = (record.canonicalBundlePath ?? "").split("Edition_1/")[1] ?? null;
  const absolute = bundleRelative ? path.join(CORPUS, bundleRelative) : null;
  if (!absolute || !fs.existsSync(absolute)) {
    unresolved.push({ familyId, sha256: record.sha256 ?? null, why: "the pinned source is not in the mounted corpus" });
    continue;
  }

  const bytes = fs.readFileSync(absolute);
  // Hashed here, not copied from the receipt. A receipt is a claim about bytes;
  // this is the bytes.
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== record.sha256) {
    unresolved.push({ familyId, why: `the corpus file hashes to ${sha256} and the family pins ${record.sha256}` });
    continue;
  }

  // One physical copy per distinct document; several families legitimately
  // share one source and must not each carry a duplicate of it.
  const familiesSharingIt = (assignment.familyIds ?? []).filter((id) => packageOf.get(id)?.record.sha256 === sha256);
  if (seenSha.has(sha256)) continue;
  seenSha.add(sha256);

  // What a person opening the PDF should see. Taken from the library's own
  // naming standard and the family's record, so a lane can check the form it
  // received is the form it was sent before rendering anything from it.
  const nameParts = path.basename(bundleRelative).split("__");
  files.push({
    canonicalRelativePath: bundleRelative,
    fileName: path.basename(bundleRelative),
    jurisdiction: record.jurisdiction,
    documentId: record.documentId ?? nameParts[2] ?? null,
    assetClass: nameParts[1] ?? null,
    expectedVisibleFormNumber: record.documentId ?? nameParts[2] ?? null,
    expectedVisibleRevision: record.revision ?? (nameParts[4]?.startsWith("REV-") ? nameParts[4] : null),
    language: record.language ?? nameParts[5]?.replace(/\.pdf$/i, "") ?? null,
    sha256,
    byteLength: bytes.length,
    servesFamilyIds: familiesSharingIt
  });
}

files.sort((a, b) => a.canonicalRelativePath.localeCompare(b.canonicalRelativePath));

const packDir = path.join(OUT_ROOT, lane);
fs.rmSync(packDir, { recursive: true, force: true });
fs.mkdirSync(packDir, { recursive: true });
for (const file of files) {
  const target = path.join(packDir, "STATES", file.canonicalRelativePath.replace(/^STATES\//, ""));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(CORPUS, file.canonicalRelativePath), target);
}

const manifest = {
  schemaVersion: "rcap-lane-source-pack/v1",
  lane: assignment.lane ?? lane,
  assignment: `data/rcap-all50/gate-b-assignments/${lane}.json`,
  assignmentBaseSha: assignment.baseSha ?? null,
  sourceArchive: "Expungement_AI_RCAP_Master_Library_Edition_1",
  containsOnly: "official PDFs published by the issuing courts and agencies, at their canonical Master Library paths",
  containsNoLegalEaseOutput: "no fixture, contact sheet, provenance sidecar, field map, classification or rendered artifact is included, so nothing in this pack can be mistaken for a source",
  installTo: "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  environmentVariable: "RCAP_BUNDLE_EXTRACT",
  totals: {
    familiesAssigned: (assignment.familyIds ?? []).length,
    distinctSourceDocuments: files.length,
    totalBytes: files.reduce((n, f) => n + f.byteLength, 0),
    familiesWithoutAResolvedSource: unresolved.length
  },
  verifyOnArrival: "Hash every file and compare to sha256 below. A pack whose bytes do not match is not this pack, and nothing rendered from it is source-backed.",
  files,
  unresolved
};
fs.writeFileSync(path.join(packDir, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const installer = `#!/usr/bin/env bash
# Installs this source pack into a clone and verifies every byte.
#
# It refuses rather than overwrites: a file already present at a different hash
# is a different edition, and silently replacing it would change what a family
# renders from without anyone deciding to.
set -euo pipefail

REPO="\${1:-\$(pwd)}"
DEST="\$REPO/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1"
HERE="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"

[ -d "\$REPO/.git" ] || { echo "not a git clone: \$REPO" >&2; exit 1; }
mkdir -p "\$DEST"

installed=0; matched=0; refused=0
while IFS=\$'\\t' read -r rel sha; do
  src="\$HERE/\$rel"
  dst="\$DEST/\$rel"
  [ -f "\$src" ] || { echo "missing from pack: \$rel" >&2; exit 1; }
  actual="\$(sha256sum "\$src" | cut -d' ' -f1)"
  [ "\$actual" = "\$sha" ] || { echo "pack corrupt: \$rel hashes \$actual, manifest says \$sha" >&2; exit 1; }
  if [ -f "\$dst" ]; then
    existing="\$(sha256sum "\$dst" | cut -d' ' -f1)"
    if [ "\$existing" = "\$sha" ]; then matched=\$((matched+1)); continue; fi
    echo "REFUSED \$rel — present at \$existing, pack carries \$sha" >&2
    refused=\$((refused+1)); continue
  fi
  mkdir -p "\$(dirname "\$dst")"
  cp "\$src" "\$dst"
  installed=\$((installed+1))
done < "\$HERE/FILES.tsv"

echo "installed \$installed, already present and identical \$matched, refused \$refused"
echo "export RCAP_BUNDLE_EXTRACT=\\"\$DEST\\""
[ "\$refused" -eq 0 ]
`;
fs.writeFileSync(path.join(packDir, "install.sh"), installer, { mode: 0o755 });
fs.writeFileSync(path.join(packDir, "FILES.tsv"),
  `${files.map((f) => `STATES/${f.canonicalRelativePath.replace(/^STATES\//, "")}\t${f.sha256}`).join("\n")}\n`);

console.log(JSON.stringify(manifest.totals, null, 1));
for (const u of unresolved) console.log(`  unresolved ${u.familyId}: ${u.why}`);
