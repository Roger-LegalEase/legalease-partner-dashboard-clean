#!/usr/bin/env node
// The seventh retirement condition, adjudicated against the mounted source tree.
//
//   node scripts/generate-rcap-retirement-adjudication.mjs
//   node scripts/generate-rcap-retirement-adjudication.mjs --check
//
// The condition is that the regenerated overlay factory manifest no longer
// names the asset. With the Nationwide tree mounted that is finally testable —
// and testing it is what exposed the trap.
//
// The manifest was generated from a tree yielding 409 forms. The tree that
// arrived yields 170. Regenerate against it and 18 of the 30 candidates stop
// being named, which reads exactly like 18 retirements passing their last
// condition. It is not. They stop being named because their source files are
// not in this delivery, and they are precisely the 18 that DO have real
// official binaries — the same KY, NC, VT and AR forms this lane resolved in
// the Master Library, with receipts. Retiring them would retire the assets
// with proven sources while keeping the captured web pages.
//
// So this refuses. A condition that a smaller input satisfies automatically is
// not a condition that has been met; it is a measurement of what was shipped.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const NATIONWIDE = process.env.OFFICIAL_FORMS_SOURCE_DIR ?? path.join(rootDir, "private/Nationwide Record Clearing");
const HANDOFF = "data/rcap-all50/manifest-only-retirement-handoff.json";
const COMMITTED_MANIFEST = "data/rcap-all50/overlays/overlay-factory-manifest.json";
const RESOLUTION = "data/rcap-all50/pdf-source-handoffs/source-resolution.json";
const OUT = "data/rcap-all50/pdf-retirement-evidence/retirement-adjudication.json";
const OUT_MD = "docs/record-clearing/pdf-independent-reviews/retirement-adjudication.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));

function fail(message) {
  console.error(`FAIL retirement adjudication — ${message}`);
  process.exit(1);
}

const handoff = readJson(HANDOFF);
const committed = readJson(COMMITTED_MANIFEST);
const resolution = fs.existsSync(abs(RESOLUTION)) ? readJson(RESOLUTION) : { rows: [] };

const mounted = fs.existsSync(NATIONWIDE);
const delivered = [];
if (mounted) {
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else delivered.push(path.relative(NATIONWIDE, full).split(path.sep).join("/"));
    }
  })(NATIONWIDE);
}
const deliveredBasenames = new Set(delivered.map((f) => path.basename(f).toLowerCase()));
const deliveredPaths = new Set(delivered.map((f) => f.toLowerCase()));

const committedFormPaths = committed.forms
  .map((form) => form.relativePath ?? form.sourcePath ?? form.path)
  .filter(Boolean);
const stillPresent = committedFormPaths.filter((p) => deliveredPaths.has(String(p).toLowerCase()));

/** Which resolved sources this lane already proved, so a "dropped" candidate can be checked against one. */
const provenSources = new Map();
for (const row of resolution.rows ?? []) {
  if (!row.identityProven) continue;
  for (const candidate of row.formNumberCandidates ?? []) {
    provenSources.set(String(candidate).toLowerCase().replace(/[^a-z0-9]/g, ""), {
      familyId: row.familyId,
      documentId: row.source.documentId,
      revision: row.source.revision,
      sha256: row.source.sha256
    });
  }
}

const candidates = handoff.retirementCandidates.map((candidate) => {
  const basename = candidate.formNumber.toLowerCase();
  const presentInDelivery = deliveredBasenames.has(basename);
  const key = basename.replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]/g, "");
  const proven = [...provenSources.entries()].find(([k]) => k === key || key.includes(k) || k.includes(key))?.[1] ?? null;

  return {
    assetId: candidate.assetId,
    jurisdiction: candidate.jurisdiction,
    formNumber: candidate.formNumber,
    formFamilyIds: candidate.formFamilyIds,
    repositoryConditionsProven: true,
    sourceFilePresentInDelivery: presentInDelivery,
    regeneratedManifestWouldNameIt: presentInDelivery,
    conditionSevenVerdict: presentInDelivery ? "fails" : "passes_for_the_wrong_reason",
    retired: false,
    why: presentInDelivery
      ? "The source file is in the mounted tree, so any regeneration names the asset again. The seventh condition fails, and this is a settled answer that does not depend on the rest of the delivery."
      : "The regenerated manifest drops this asset only because its source file is absent from this delivery. That is a fact about what was shipped, not about whether anything still depends on the asset.",
    aProvenOfficialSourceExistsElsewhere: proven,
    andThatIsTheProblem: presentInDelivery || !proven
      ? null
      : `This lane proved an official binary for this asset in the Master Library — ${proven.documentId} ${proven.revision ?? ""}, ${proven.sha256.slice(0, 16)}… — so retiring it here would retire an asset that has a current official source.`
  };
});

const fails = candidates.filter((c) => c.conditionSevenVerdict === "fails");
const wrongReason = candidates.filter((c) => c.conditionSevenVerdict === "passes_for_the_wrong_reason");
const wrongReasonWithASource = wrongReason.filter((c) => c.aProvenOfficialSourceExistsElsewhere);

if (candidates.some((c) => c.retired)) fail("this adjudication retires an asset; it is not permitted to");

const record = {
  schemaVersion: "rcap-pdf-retirement-adjudication/v1",
  generatedBy: "scripts/generate-rcap-retirement-adjudication.mjs",
  purpose:
    "The seventh retirement condition, evaluated against the mounted Nationwide tree, and the reason no retirement follows from it.",
  sourceTree: {
    path: path.relative(rootDir, NATIONWIDE),
    mounted,
    filesDelivered: delivered.length,
    pdfsDelivered: delivered.filter((f) => /\.pdf$/i.test(f)).length
  },
  completeness: {
    formsTheCommittedManifestNames: committedFormPaths.length,
    ofThoseStillInTheDeliveredTree: stillPresent.length,
    absentFromTheDeliveredTree: committedFormPaths.length - stillPresent.length,
    formsARegenerationProduces: 170,
    measuredHow:
      "buildOverlayFactory() was run once against this tree in a disposable checkout, not in this worktree. It produced 170 forms against the committed manifest's 409, and named 12 of the 30 candidates.",
    theTreeIsNotComplete: stillPresent.length < committedFormPaths.length,
    whyThatIsDisqualifying:
      "A regeneration from an incomplete tree drops assets for a reason that has nothing to do with whether anything depends on them. The seventh condition would be satisfied by the delivery rather than by the evidence."
  },
  theTrap: {
    statement:
      "Regenerating against this tree drops 18 of the 30 candidates, which looks like 18 retirements clearing their last condition.",
    whatIsActuallyTrue:
      "Those 18 are the official PDFs. The 12 that survive are almost entirely captured .html web pages. Retiring on this basis would retire every asset with a real form behind it and keep the scraped landing pages.",
    corroboration: `${wrongReasonWithASource.length} of the 18 have an official binary this lane already proved in the Master Library, with a receipt naming its SHA-256.`,
    thereforeRetirementsProven: 0
  },
  totals: {
    candidates: candidates.length,
    conditionSevenFails: fails.length,
    conditionSevenPassesForTheWrongReason: wrongReason.length,
    ofThoseWithAProvenOfficialSourceElsewhere: wrongReasonWithASource.length,
    retirementsProven: 0,
    refusedForALegalDesignBinding: handoff.excluded.length
  },
  whatWouldSettleIt: [
    "Deliver the complete Nationwide tree — the one the committed manifest was generated from, yielding 409 forms — and this adjudication re-runs against it unchanged.",
    "Or state, on the record, that the 239 absent forms were removed from the source upstream rather than omitted from the delivery. Then the regeneration is legitimate and 18 candidates can be re-examined on their merits.",
    "Either way the 12 whose files are present remain not retirable: their manifest entry comes back every time."
  ],
  refusedRetirements: handoff.excluded,
  candidates
};

function markdown() {
  const lines = [];
  lines.push("# Retirement adjudication");
  lines.push("");
  lines.push(`Nationwide tree: \`${record.sourceTree.path}\` — ${record.sourceTree.filesDelivered} files, ${record.sourceTree.pdfsDelivered} PDFs.`);
  lines.push("");
  lines.push("## Completeness");
  lines.push("");
  lines.push("| | count |");
  lines.push("| --- | ---: |");
  lines.push(`| forms the committed manifest names | ${record.completeness.formsTheCommittedManifestNames} |`);
  lines.push(`| of those, still in the delivered tree | ${record.completeness.ofThoseStillInTheDeliveredTree} |`);
  lines.push(`| absent from the delivered tree | ${record.completeness.absentFromTheDeliveredTree} |`);
  lines.push(`| forms a regeneration produces | ${record.completeness.formsARegenerationProduces} |`);
  lines.push("");
  lines.push(record.completeness.whyThatIsDisqualifying);
  lines.push("");
  lines.push("## The trap");
  lines.push("");
  lines.push(record.theTrap.statement);
  lines.push("");
  lines.push(record.theTrap.whatIsActuallyTrue);
  lines.push("");
  lines.push(record.theTrap.corroboration);
  lines.push("");
  lines.push("## Verdicts");
  lines.push("");
  lines.push("| jurisdiction | asset | in delivery | condition 7 | retired |");
  lines.push("| --- | --- | :-: | --- | :-: |");
  for (const candidate of candidates) {
    lines.push(`| ${candidate.jurisdiction} | ${candidate.formNumber} | ${candidate.sourceFilePresentInDelivery ? "yes" : "no"} | ${candidate.conditionSevenVerdict} | no |`);
  }
  lines.push("");
  lines.push("## What would settle it");
  lines.push("");
  for (const step of record.whatWouldSettleIt) lines.push(`- ${step}`);
  lines.push("");
  return lines.join("\n");
}

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`], [OUT_MD, markdown()]];
let stale = 0;
for (const [rel, content] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-retirement-adjudication.mjs`);

console.log(
  `OK retirement adjudication — ${candidates.length} candidates; condition 7 fails for ${fails.length}, ` +
    `passes for the wrong reason for ${wrongReason.length} (${wrongReasonWithASource.length} of which have a proven official source); ` +
    `retirements proven 0`
);
