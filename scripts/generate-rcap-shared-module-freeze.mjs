#!/usr/bin/env node
// The shared PDF base, frozen: exact hashes for the modules every family lane
// renders through, and for the four artifacts no lane may move.
//
//   node scripts/generate-rcap-shared-module-freeze.mjs
//   node scripts/generate-rcap-shared-module-freeze.mjs --check
//
// Thirteen sessions are working the same corpus. Two of them independently
// wrote the same shared correction — decode the caption before classifying it,
// bound a heading to its own column — into the same two modules, which is how
// this manifest came to exist: the corrections were integrated once, and from
// here the shared paths belong to the integration lane rather than to whichever
// family lane needs them next.
//
// The freeze is not a claim that the modules are finished. It is a claim about
// WHO MAY EDIT THEM: a family lane that needs a shared path changed asks for it
// here, so the change is made once and every family renders through the same
// code. A family lane that edits a shared path silently makes its own artifact
// unreproducible by everyone else's base.
//
// The approved half is stricter. Four families carry current independent
// approvals, and an approval is about specific bytes: if the artifact, its map,
// its classification, its sidecar or its evidence moves, the approval is about
// something that no longer exists. Those hashes are recorded here and this
// verifier fails on any change to them, including a change this lane makes.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const OUT = "data/rcap-all50/pdf-independent-reviews/shared-module-freeze.json";

const abs = (rel) => path.join(rootDir, rel);
const digest = (rel) => (fs.existsSync(abs(rel))
  ? createHash("sha256").update(fs.readFileSync(abs(rel))).digest("hex")
  : null);

/**
 * The code every family renders through.
 *
 * A change to any of these changes every artifact in the corpus, which is why
 * they are one lane's to change and not thirteen.
 */
const SHARED_MODULES = [
  "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs",
  "scripts/rcap-official-forms/rcap-field-semantics.mjs",
  "scripts/rcap-official-forms/rcap-official-form-finalize.mjs",
  "scripts/rcap-official-forms/rcap-active-content.mjs",
  "scripts/rcap-official-forms/rcap-blank-panel.mjs",
  "scripts/rcap-official-forms/rcap-contact-sheet.mjs",
  "scripts/rcap-official-forms/rcap-artifact-provenance.mjs",
  "scripts/rcap-official-forms/rcap-evidence-contract.mjs",
  "scripts/rcap-official-forms/rcap-field-classification.mjs",
  "scripts/rcap-official-forms/rcap-pdf-rasterize.mjs",
  "scripts/rcap-official-forms/rcap-text-fitting.mjs",
  "scripts/implement-rcap-official-forms-d1.mjs"
];

/** The canaries that hold the shared modules to what they claim. */
const SHARED_CANARIES = [
  "scripts/verify-rcap-field-semantics-canaries.mjs",
  "scripts/verify-rcap-widget-geometry-canaries.mjs",
  "scripts/verify-rcap-widget-appearance-canaries.mjs",
  "scripts/verify-rcap-shared-pdf-contract.mjs"
];

/** Families carrying a current independent approval. Their bytes do not move. */
const APPROVED_FAMILIES = {
  "AK:tf-800-form-en": "data/rcap-all50/overlays/production/alaska/tf-800-form-en",
  "AK:tf-805-form-en": "data/rcap-all50/overlays/production/alaska/tf-805-form-en",
  "NC:aoc-cr-287-form-en": "data/rcap-all50/overlays/production/north-carolina/aoc-cr-287-form-en",
  "NC:aoc-cr-288-form-en": "data/rcap-all50/overlays/production/north-carolina/aoc-cr-288-form-en"
};

const APPROVED_FILES = [
  "fixtures/canonical-filled.pdf",
  "fixtures/boundary-filled.pdf",
  "contact-sheet/blank-vs-filled.pdf",
  "contact-sheet/contact-sheet-proof.json",
  "production-field-map.json",
  "field-classification.json",
  "field-census.json",
  "artifact-provenance.json",
  "source-record.json"
];

/** The committed visual evidence for an approved family, if it carries any. */
function visualEvidenceOf(familyId) {
  const slug = `${familyId.split(":")[0]}-${familyId.split(":")[1]}`;
  const candidates = [
    `data/rcap-all50/visual-evidence/${slug}.evidence.json`,
    `docs/record-clearing/pdf-visual-evidence/${slug}-contact-sheet-page-01.png`
  ];
  const dir = `docs/record-clearing/pdf-visual-evidence/all-page/${slug}`;
  if (fs.existsSync(abs(dir))) {
    for (const file of fs.readdirSync(abs(dir)).sort()) candidates.push(`${dir}/${file}`);
  }
  return Object.fromEntries(candidates.filter((c) => fs.existsSync(abs(c))).map((c) => [c, digest(c)]));
}

let headSha = null;
try { headSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim(); } catch { /* not a clone */ }

const payload = {
  schemaVersion: "rcap-shared-module-freeze/v1",
  generatedBy: "scripts/generate-rcap-shared-module-freeze.mjs",
  purpose: "The exact hashes of the shared PDF implementation modules every family lane renders through, and of the "
    + "four approved families whose bytes no lane may move.",
  notAnApproval: "This freezes ownership of paths. It approves no artifact and promotes no family.",
  ownership: {
    sharedPathsOwnedBy: "the shared-correction integration lane",
    familyLanesMayNotModify: [...SHARED_MODULES, ...SHARED_CANARIES],
    why: "a shared module changes every artifact in the corpus. Thirteen lanes editing it produce thirteen bases and "
      + "no reproducible artifact. A family lane that needs one of these changed asks the integration lane, so the "
      + "change is made once and every family renders through it.",
    howToChangeOne: "raise it against the integration lane, land it here with its canary, then re-render the families "
      + "it touches from the new base"
  },
  consumedSharedCorrections: {
    implementationBase: "e94fb456b13dacd05479641bc3c4fe37eb898d07",
    sharedCorrectionHead: "4ad59d66d331fc2f67d868e97d54098db8ccfef4",
    integratedAt: headSha,
    portedFromTheCorrectionHead: [
      "records-custody and court-agency protection: the agency rule matches the court's directive, not the agency names, so KY AOC-334's truncated caption cannot fall through to a person's name",
      "the driver's-licence cluster: DLState, DLExpires and their siblings are one government identifier, not a residence",
      "ALTERNATE_BLOCK: a caption that conditions its own block on being different never takes a primary address fact",
      "inherited XObject font resources: a Form XObject with partial /Resources inherits the page's fonts instead of shadowing them away"
    ]
  },
  sharedModules: Object.fromEntries(SHARED_MODULES.map((m) => [m, digest(m)])),
  sharedCanaries: Object.fromEntries(SHARED_CANARIES.map((m) => [m, digest(m)])),
  approvedFamilies: Object.fromEntries(Object.entries(APPROVED_FAMILIES).map(([familyId, dir]) => [familyId, {
    familyPackagePath: dir,
    artifacts: Object.fromEntries(APPROVED_FILES
      .map((f) => [f, digest(`${dir}/${f}`)])
      .filter(([, d]) => d !== null)),
    visualEvidence: visualEvidenceOf(familyId)
  }])),
  rerenderState: {
    corpusMountedWhenFrozen: fs.existsSync(abs("private")) || Boolean(process.env.RCAP_BUNDLE_EXTRACT),
    driverRan: false,
    why: "the D1 driver resolves each family's bytes under RCAP_BUNDLE_EXTRACT and the Master Library extract is not "
      + "present in this environment. The shared corrections below are frozen and canary-proven; no family artifact "
      + "was regenerated from them.",
    whatThisMeansForFamilyLanes: "this base is the code to render FROM, not a set of rendered artifacts. A lane with "
      + "the corpus mounted renders its families from these module hashes and records them."
  }
};

const json = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  if (!fs.existsSync(abs(OUT))) {
    console.error(`FAIL shared-module freeze — ${OUT} is absent; run this generator`);
    process.exit(1);
  }
  const committed = JSON.parse(fs.readFileSync(abs(OUT), "utf8"));
  const failures = [];
  for (const [group, table] of [["shared module", committed.sharedModules], ["shared canary", committed.sharedCanaries]]) {
    for (const [file, frozen] of Object.entries(table ?? {})) {
      const now = digest(file);
      if (now !== frozen) failures.push(`${group} ${file} moved: frozen ${frozen ?? "absent"}, on disk ${now ?? "absent"}`);
    }
  }
  for (const [familyId, record] of Object.entries(committed.approvedFamilies ?? {})) {
    for (const [rel, frozen] of Object.entries(record.artifacts ?? {})) {
      const now = digest(`${record.familyPackagePath}/${rel}`);
      if (now !== frozen) failures.push(`APPROVED ${familyId} ${rel} moved: frozen ${frozen}, on disk ${now ?? "absent"}`);
    }
    for (const [rel, frozen] of Object.entries(record.visualEvidence ?? {})) {
      const now = digest(rel);
      if (now !== frozen) failures.push(`APPROVED ${familyId} evidence ${rel} moved: frozen ${frozen}, on disk ${now ?? "absent"}`);
    }
  }
  if (failures.length) {
    console.error(`FAIL shared-module freeze — ${failures.length} frozen path(s) moved`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  const modules = Object.keys(committed.sharedModules ?? {}).length + Object.keys(committed.sharedCanaries ?? {}).length;
  const approved = Object.values(committed.approvedFamilies ?? {})
    .reduce((n, r) => n + Object.keys(r.artifacts ?? {}).length + Object.keys(r.visualEvidence ?? {}).length, 0);
  console.log(`OK shared-module freeze — ${modules} shared paths and ${approved} approved-family files are exactly as frozen`);
} else {
  fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
  fs.writeFileSync(abs(OUT), json);
  const approved = Object.values(payload.approvedFamilies)
    .reduce((n, r) => n + Object.keys(r.artifacts).length + Object.keys(r.visualEvidence).length, 0);
  console.log(`OK shared-module freeze — froze ${SHARED_MODULES.length} modules, ${SHARED_CANARIES.length} canaries and ${approved} approved-family files`);
}
