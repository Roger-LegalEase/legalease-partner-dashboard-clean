// Audits how much substantive legal content each RCAP state pack actually
// carries, as opposed to the auto-generated build metadata that every state
// receives from scripts/generate-all50-state-pack-batch.mjs.
//
// Why this exists: scripts/verify-all50-state-packs.mjs checks only that the
// generated metadata file exists and contains the required top-level keys. A
// state whose pack is nothing but that generated metadata therefore passes,
// even though it carries no eligibility rules, no waiting periods, and no
// filing detail. The build manifest then reports it as `state_built`, which
// reads to QA and counsel as finished work.
//
// This script does not judge legal correctness and does not change any build
// status. It reports coverage so the gap is visible before review.
//
// Exit code is 0 by default. Pass --strict to exit non-zero when any state is
// metadata-only, for use in CI once the gap is closed.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packRoot = path.join(rootDir, "src/lib/rcap/state-packs");
const manifestPath = path.join(rootDir, "data/rcap-all50/all-state-build-manifest.json");
const reportPath = path.join(rootDir, "docs/record-clearing/state-pack-substance-audit.md");

const strict = process.argv.includes("--strict");
const writeReport = !process.argv.includes("--no-report");

// Slug overrides mirror scripts/verify-all50-state-packs.mjs so the two agree
// on which directory belongs to which jurisdiction code.
const slugOverrides = new Map([
  ["DC", "dc"],
  ["TX", "texas"]
]);

// The module names used by the fully built state packs. Two families of pack
// exist: form/pathway states expose official-forms.ts, while pleading states
// expose court-routing.ts and county-court-instructions.ts instead.
const SUBSTANTIVE_MODULES = [
  "eligibility-rules",
  "waiting-periods",
  "pathways",
  "disqualifying-offenses",
  "required-fields",
  "filing-instructions",
  "document-types",
  "fee-notes",
  "safety-language",
  "sample-data",
  "official-forms",
  "court-routing",
  "county-court-instructions"
];

// A state pack is only useful downstream if it can answer "who qualifies" and
// "how long do they wait". Those two modules are the floor for `substantive`.
const CORE_MODULES = ["eligibility-rules", "waiting-periods"];

// One of the generic sentences emitted for every state by the batch generator.
// Counting how many packs still contain it verbatim shows how much of the
// corpus is untouched template text.
const BOILERPLATE_MARKER =
  "Use the court, clerk, agency, or official filing destination identified in the selected Nationwide resource packet or official form.";

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const rows = [];

for (const state of manifest.states) {
  const slug = slugOverrides.get(state.code) || state.slug;
  const dir = path.join(packRoot, slug);

  if (!fs.existsSync(dir)) {
    rows.push({
      code: state.code,
      name: state.name,
      slug,
      missing: true,
      modules: [],
      contentLines: 0,
      boilerplate: false,
      buildStatus: state.buildStatus,
      tier: "missing"
    });
    continue;
  }

  const present = SUBSTANTIVE_MODULES.filter((mod) =>
    fs.existsSync(path.join(dir, `${mod}.ts`))
  );

  // Count only lines that carry content: skip blanks and comment-only lines so
  // a large licence header cannot masquerade as legal substance.
  let contentLines = 0;
  for (const mod of present) {
    const text = fs.readFileSync(path.join(dir, `${mod}.ts`), "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line === "") continue;
      if (line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) continue;
      contentLines += 1;
    }
  }

  const metadataPath = path.join(dir, "all50-build-metadata.ts");
  const boilerplate = fs.existsSync(metadataPath)
    ? fs.readFileSync(metadataPath, "utf8").includes(BOILERPLATE_MARKER)
    : false;

  const hasCore = CORE_MODULES.every((mod) => present.includes(mod));
  let tier;
  if (present.length === 0) tier = "metadata_only";
  else if (hasCore) tier = "substantive";
  else tier = "partial";

  rows.push({
    code: state.code,
    name: state.name,
    slug,
    missing: false,
    modules: present,
    contentLines,
    boilerplate,
    buildStatus: state.buildStatus,
    tier
  });
}

const byTier = (tier) => rows.filter((r) => r.tier === tier);
const substantive = byTier("substantive");
const partial = byTier("partial");
const metadataOnly = byTier("metadata_only");
const missing = byTier("missing");
const boilerplateCount = rows.filter((r) => r.boilerplate).length;

// The integrity issue worth surfacing: a state claiming a build status at or past
// `state_built` while carrying no substantive modules at all.
const BUILT_STATUSES = new Set([
  "state_built",
  "qa_review_pending",
  "visual_review_pending",
  "counsel_review_pending",
  "approved_for_live",
  "live"
]);
const overstated = rows.filter(
  (r) => r.tier === "metadata_only" && BUILT_STATUSES.has(r.buildStatus)
);

console.log("RCAP all-50 state-pack substance audit");
console.log("");
console.log(`States audited          : ${rows.length}`);
console.log(`Substantive packs       : ${substantive.length}`);
console.log(`Partial packs           : ${partial.length}`);
console.log(`Metadata-only packs     : ${metadataOnly.length}`);
if (missing.length > 0) console.log(`Missing directories     : ${missing.length}`);
console.log(`Packs still carrying generated boilerplate: ${boilerplateCount}`);
console.log("");

if (metadataOnly.length > 0) {
  console.log("Metadata-only states (no eligibility rules, no waiting periods):");
  for (const row of metadataOnly) {
    console.log(`- ${row.code} ${row.name} (build status: ${row.buildStatus})`);
  }
  console.log("");
}

if (partial.length > 0) {
  console.log("Partial states (some modules, missing eligibility rules or waiting periods):");
  for (const row of partial) {
    console.log(`- ${row.code} ${row.name}: ${row.modules.join(", ")}`);
  }
  console.log("");
}

if (overstated.length > 0) {
  console.log(
    `Build-status overstatement: ${overstated.length} state(s) report a status of \`state_built\` or later while carrying no substantive legal modules.`
  );
  console.log("These will read as finished work to QA and counsel reviewers.");
  console.log("");
}

if (writeReport) {
  const lines = [];
  lines.push("# RCAP All-50 State-Pack Substance Audit");
  lines.push("");
  lines.push(
    "Generated by `scripts/audit-all50-state-pack-substance.mjs`. This audit measures how much substantive legal content each state pack carries. It does not assess legal correctness and it does not change any build status."
  );
  lines.push("");
  lines.push(
    "`scripts/verify-all50-state-packs.mjs` checks only that the generated metadata file exists and contains the required top-level keys, so a pack consisting solely of that generated metadata passes it. This audit exists to show what that check cannot see."
  );
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Tier | States | Meaning |");
  lines.push("| --- | ---: | --- |");
  lines.push(
    `| Substantive | ${substantive.length} | Has eligibility rules and waiting periods |`
  );
  lines.push(
    `| Partial | ${partial.length} | Has some modules but is missing eligibility rules or waiting periods |`
  );
  lines.push(
    `| Metadata-only | ${metadataOnly.length} | Generated build metadata only; no legal content |`
  );
  if (missing.length > 0) {
    lines.push(`| Missing | ${missing.length} | No state-pack directory |`);
  }
  lines.push("");
  lines.push(
    `${boilerplateCount} of ${rows.length} packs still contain the generated filing-destination boilerplate verbatim.`
  );
  lines.push("");

  if (overstated.length > 0) {
    lines.push("## Build-status overstatement");
    lines.push("");
    lines.push(
      `${overstated.length} state(s) report a build status of \`state_built\` or later while carrying no substantive legal modules:`
    );
    lines.push("");
    for (const row of overstated) {
      lines.push(`- **${row.code} ${row.name}** — \`${row.buildStatus}\``);
    }
    lines.push("");
    lines.push(
      "Downgrading these statuses is a tracking decision for Roger, not an automated one. This audit only reports the discrepancy."
    );
    lines.push("");
  }

  lines.push("## Per-state detail");
  lines.push("");
  lines.push("| Code | State | Tier | Modules | Content lines | Build status |");
  lines.push("| --- | --- | --- | ---: | ---: | --- |");
  for (const row of [...rows].sort((a, b) => a.code.localeCompare(b.code))) {
    lines.push(
      `| ${row.code} | ${row.name} | ${row.tier} | ${row.modules.length} | ${row.contentLines} | ${row.buildStatus} |`
    );
  }
  lines.push("");

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Report written: ${path.relative(rootDir, reportPath)}`);
}

if (strict && (metadataOnly.length > 0 || missing.length > 0)) {
  console.error("");
  console.error(
    `Strict mode: ${metadataOnly.length + missing.length} state(s) carry no substantive legal content.`
  );
  process.exit(1);
}
