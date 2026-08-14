// Frozen E2 evidence-enrichment jobs, derived from the track↔pathway crosswalk.
//
// The crosswalk resolves what the sources support and refuses to guess. What it
// leaves unresolved is a finite, named set — this writer turns that set into
// frozen work: one job per unresolved relationship, each carrying the exact
// paths to touch, the exact evidence that would close it, the exact output, and
// the exact stop condition. A worker that finds the evidence closes the row; a
// worker that proves the evidence does not exist terminalizes it. Neither is
// allowed to guess, and neither may edit the crosswalk generator to make a row
// disappear.
//
// Determinism: every field is derived from the crosswalk artifact, and the
// crosswalk's own contentHash is recorded as the input pin. No timestamps, no
// ordering by anything but id, so regenerating on an unchanged crosswalk
// produces byte-identical output.
//
// Usage:
//   node scripts/generate-rcap-e2-evidence-jobs.mjs
//   node scripts/generate-rcap-e2-evidence-jobs.mjs --check

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const crosswalkPath = path.join(rootDir, "data/rcap-ledger/track-pathway-crosswalk.json");
const outputPath = path.join(rootDir, "data/rcap-ledger/e2-evidence-jobs.json");
const reportPath = path.join(rootDir, "docs/record-clearing/e2-evidence-jobs.md");
const check = process.argv.includes("--check");

if (!fs.existsSync(crosswalkPath)) {
  console.error("No crosswalk artifact. Run: npm run rcap:track-pathway-crosswalk");
  process.exit(1);
}

const crosswalk = JSON.parse(fs.readFileSync(crosswalkPath, "utf8"));
const jobs = [];

// --- E2-A: registry tracks whose candidates stay ambiguous -------------------
// Candidates exist; nothing isolates one. The evidence that closes these is a
// discriminator, not more candidates.
for (const track of crosswalk.registryTracks) {
  if (track.compiledCoverageDisposition !== "unresolved_ambiguous_candidates") continue;
  jobs.push({
    jobId: `E2-A-${track.jurisdiction}-${track.registryTrackId}`,
    group: "E2-A",
    groupTitle: "Ambiguous registry track",
    jurisdiction: track.jurisdiction,
    subject: { kind: "registry_track", id: track.registryTrackId, legalName: track.legalName ?? null },
    mechanismAuthority: track.mechanismAuthority ?? null,
    candidateCompiledPathwayIds: [...(track.candidateCompiledPathwayIds ?? [])].sort(),
    ownedPaths: ["data/rcap-ledger/track-pathway-crosswalk.json (row only, via the generator's inputs)"],
    requiredEvidence: [
      "an operative statutory subsection that only one candidate pathway implements, or",
      "an official form number the registry track names and only one candidate carries, or",
      "a registry scope restriction that removes all but one candidate"
    ],
    expectedOutput:
      "either the discriminating evidence recorded on the registry source so the crosswalk resolves to exact_current_pathway or represented_by_compiled_variants, or a recorded terminal classification stating that the registry track has no single runtime representation and why",
    stopCondition:
      "stop when the row resolves on regenerated crosswalk output, or when the absence of a discriminator is proven and recorded; never pick a candidate on name similarity",
    owner: "crosswalk_lane",
    blocksMilestone1Item2: true
  });
}

// --- E2-B: compiled pathways with no candidate at all ------------------------
// Nothing in the jurisdiction links these to any registry track. Either the
// registry is missing a track, or the pathway is out of the registry's scope.
for (const pathway of crosswalk.compiledPathways) {
  if (pathway.registryRelation !== "unresolved_no_candidate") continue;
  jobs.push({
    jobId: `E2-B-${pathway.jurisdiction}-${pathway.compiledPathwayId}`,
    group: "E2-B",
    groupTitle: "Compiled pathway with no registry candidate",
    jurisdiction: pathway.jurisdiction,
    subject: { kind: "compiled_pathway", id: pathway.compiledPathwayId, label: pathway.label ?? null },
    compiledProfilePath: pathway.compiledProfilePath,
    routeType: pathway.routeType ?? null,
    ownedPaths: [pathway.compiledProfilePath],
    requiredEvidence: [...(pathway.missingEvidence ?? [])],
    expectedOutput:
      "one of: a statutory citation or official form added to the compiled pathway that joins it to an existing registry track; a new registry track recorded for a mechanism the registry genuinely lacks; or a terminal classification that the registry deliberately routes this authority outside its tracks (registry_scoped_out_named_authority)",
    stopCondition:
      "stop when the pathway maps, or when its exclusion from the registry is recorded with the naming authority; never delete a compiled pathway to make a jurisdiction balance",
    owner: "crosswalk_lane",
    blocksMilestone1Item2: true
  });
}

// --- E2-C: unresolved surplus jurisdictions ---------------------------------
// The runtime compiles more pathways than the registry lists, and the surplus
// cannot yet be pinned to named pathways.
for (const row of crosswalk.surplusReconciliation) {
  const pool = [...(row.unexplainedSurplusCandidates ?? [])].sort();
  if (pool.length === 0) continue; // fully identified; nothing to enrich
  jobs.push({
    jobId: `E2-C-${row.jurisdiction}`,
    group: "E2-C",
    groupTitle: "Unresolved surplus jurisdiction",
    jurisdiction: row.jurisdiction,
    subject: { kind: "jurisdiction_surplus", id: row.jurisdiction, delta: row.delta },
    candidatePoolSize: pool.length,
    candidatePool: pool,
    ownedPaths: [`src/lib/rcap-engine/compiled/profiles/${row.jurisdiction}-*.json`],
    requiredEvidence: [
      `identify exactly ${row.delta} pathway(s) in the candidate pool that claim no registry track of their own`,
      "for each, the evidence that it is a narrower variant of a named registry track, or a registry scope restriction naming its authority"
    ],
    expectedOutput:
      "the surplus accounted for as identity rather than quantity: each surplus pathway either absorbed as a variant of a named registry track or recorded as scoped out by a named registry stop condition",
    stopCondition:
      "stop when absorbedByVariantDecomposition plus absorbedByRegistryScopeRestriction equals the delta and the candidate pool empties, as WY already demonstrates; never invent a registry track and never drop a pathway to balance",
    owner: "crosswalk_lane",
    blocksMilestone1Item2: true
  });
}

// --- E2-D: the named Alaska case --------------------------------------------
// Called out by name because it is the worked example for the whole E2-B class:
// a court-filing pathway carrying its statute in its own identifier, which the
// registry still does not join.
const alaska = crosswalk.compiledPathways.find(
  (p) => p.jurisdiction === "AK" && p.compiledPathwayId.includes("as-12-55-085")
);
if (alaska) {
  jobs.push({
    jobId: "E2-D-AK-as-12-55-085",
    group: "E2-D",
    groupTitle: "Named case: Alaska AS 12.55.085 set-aside",
    jurisdiction: "AK",
    subject: { kind: "compiled_pathway", id: alaska.compiledPathwayId, label: alaska.label ?? null },
    compiledProfilePath: alaska.compiledProfilePath,
    ownedPaths: [alaska.compiledProfilePath],
    requiredEvidence: [
      "whether any of the eight Alaska registry tracks covers a suspended-imposition-of-sentence set-aside under AS 12.55.085",
      "if none does, whether the registry deliberately routes AS 12.55.085 outside its tracks, and under which stop condition",
      "if the registry should carry it, the track record that would be added"
    ],
    registryTracksInJurisdiction: crosswalk.registryTracks
      .filter((t) => t.jurisdiction === "AK")
      .map((t) => ({ id: t.registryTrackId, disposition: t.compiledCoverageDisposition }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    expectedOutput:
      "AS 12.55.085 either mapped to a registry track on cited authority, recorded as scoped out by a named registry stop condition, or recorded as a registry gap with the track that should exist",
    stopCondition:
      "stop when the relationship is supported or explicitly terminalized; the pathway carries its statute in its own identifier, so 'no citation available' is not an acceptable outcome",
    owner: "crosswalk_lane",
    blocksMilestone1Item2: true
  });
}

jobs.sort((a, b) => a.jobId.localeCompare(b.jobId));

const counts = {};
for (const job of jobs) counts[job.group] = (counts[job.group] || 0) + 1;

const document = {
  schemaVersion: "rcap-e2-evidence-jobs/v1",
  generatedBy: "scripts/generate-rcap-e2-evidence-jobs.mjs",
  purpose:
    "Frozen evidence-enrichment jobs for every unresolved relationship in the track↔pathway crosswalk. Milestone 1 item 2 stays blocked until every job here is closed by supported evidence or explicit terminalization.",
  input: {
    crosswalk: "data/rcap-ledger/track-pathway-crosswalk.json",
    crosswalkContentHash: crosswalk.contentHash ?? null,
    registryTracks: crosswalk.aggregates.registryTracks,
    compiledPathways: crosswalk.aggregates.compiledPathways
  },
  milestone1Item2: {
    status: "blocked",
    reason:
      "The crosswalk resolves 67 of 497 registry tracks and 67 of 324 compiled pathways. The remainder is a named finite set enumerated by these jobs; the block is preserved until every one is supported or terminalized.",
    closesWhen: "jobs.length === 0 on a regenerated crosswalk"
  },
  counts,
  totalJobs: jobs.length,
  jobs
};

const serialized = `${JSON.stringify(document, null, 2)}\n`;

const reportLines = [];
reportLines.push("# RCAP E2 Evidence-Enrichment Jobs");
reportLines.push("");
reportLines.push(
  `Generated by \`scripts/generate-rcap-e2-evidence-jobs.mjs\` from \`data/rcap-ledger/track-pathway-crosswalk.json\` (contentHash \`${crosswalk.contentHash}\`).`
);
reportLines.push("");
reportLines.push(
  "Every unresolved relationship in the crosswalk is one frozen job here. **Milestone 1 item 2 stays blocked** until each is closed by supported evidence or explicit terminalization. No job may be closed by name similarity, by deleting a compiled pathway, or by inventing a registry track."
);
reportLines.push("");
reportLines.push("| Group | What it covers | Jobs |");
reportLines.push("| --- | --- | ---: |");
reportLines.push(`| E2-A | Registry tracks whose candidates stay ambiguous | ${counts["E2-A"] ?? 0} |`);
reportLines.push(`| E2-B | Compiled pathways with no registry candidate | ${counts["E2-B"] ?? 0} |`);
reportLines.push(`| E2-C | Unresolved surplus jurisdictions | ${counts["E2-C"] ?? 0} |`);
reportLines.push(`| E2-D | Named case: Alaska AS 12.55.085 | ${counts["E2-D"] ?? 0} |`);
reportLines.push(`| **Total** | | **${jobs.length}** |`);
reportLines.push("");
reportLines.push("## Group E2-C detail");
reportLines.push("");
reportLines.push("| Juris | Delta | Candidate pool |");
reportLines.push("| --- | ---: | ---: |");
for (const job of jobs.filter((j) => j.group === "E2-C")) {
  reportLines.push(`| ${job.jurisdiction} | +${job.subject.delta} | ${job.candidatePoolSize} |`);
}
reportLines.push("");
reportLines.push(
  "WY is absent from this table on purpose: its surplus is already fully identified as two authorities the registry names as routed outside its tracks, so there is nothing left to enrich."
);
reportLines.push("");
reportLines.push("## Stop conditions");
reportLines.push("");
reportLines.push("- **E2-A** — resolve on a discriminator, or record that no discriminator exists.");
reportLines.push("- **E2-B** — map on cited authority, record a registry gap, or record a scope restriction.");
reportLines.push("- **E2-C** — absorb the delta as identity; the candidate pool must empty.");
reportLines.push("- **E2-D** — AS 12.55.085 carries its statute in its own identifier; 'no citation available' is not an acceptable outcome.");
reportLines.push("");

const report = `${reportLines.join("\n")}`;

if (check) {
  const currentJson = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";

  // A superseded queue is checked for INTEGRITY, not currency.
  //
  // These 363 jobs were derived from the pre-adjudication crosswalk and have
  // since been worked: nine evidence packages are keyed to these exact jobIds.
  // Final E3 then moved the crosswalk, so regenerating this file would produce a
  // different, smaller set and re-partition the jobIds the landed evidence is
  // keyed to — silently breaking intake coverage for work that is already done.
  //
  // So once the queue declares itself superseded, the honest check is not "does
  // this still match the crosswalk" (it cannot, and should not) but "is the
  // frozen record still exactly what the workers were dispatched against, and
  // does its replacement exist". Currency belongs to the successor.
  if (currentJson) {
    const committed = JSON.parse(currentJson);
    if (committed.superseded) {
      const failures = [];
      const s = committed.superseded;
      const jobsSha = crypto.createHash("sha256").update(JSON.stringify(committed.jobs)).digest("hex");
      if (jobsSha !== s.jobsSha256) {
        failures.push(`frozen job set altered: sha256 ${jobsSha.slice(0, 12)} != recorded ${String(s.jobsSha256).slice(0, 12)}`);
      }
      if (committed.totalJobs !== committed.jobs.length) {
        failures.push(`totalJobs ${committed.totalJobs} != ${committed.jobs.length} jobs present`);
      }
      if (committed.input?.crosswalkContentHash !== s.frozenAtCrosswalkContentHash) {
        failures.push("the recorded input pin no longer matches the hash this queue was frozen at");
      }
      if (s.supersededBy && !fs.existsSync(path.join(rootDir, s.supersededBy))) {
        failures.push(`successor ${s.supersededBy} does not exist; a superseded queue with no replacement leaves the work unaccounted for`);
      }
      if (failures.length > 0) {
        console.error("E2 evidence jobs (superseded) FAILED integrity check");
        for (const f of failures) console.error(` - ${f}`);
        process.exit(1);
      }
      console.log(`E2 evidence jobs SUPERSEDED and intact. ${committed.jobs.length} frozen jobs, replaced by ${s.supersededBy}.`);
      process.exit(0);
    }
  }

  const currentReport = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, "utf8") : "";
  if (currentJson !== serialized || currentReport !== report) {
    console.error("E2 evidence jobs are stale. Run: npm run rcap:e2-evidence-jobs");
    process.exit(1);
  }
  console.log(`E2 evidence jobs current. ${jobs.length} frozen jobs.`);
  process.exit(0);
}

fs.writeFileSync(outputPath, serialized);
fs.writeFileSync(reportPath, report);

console.log(`E2 evidence jobs written: ${jobs.length} frozen jobs`);
for (const [group, count] of Object.entries(counts).sort()) {
  console.log(`  ${group}: ${count}`);
}
console.log(`  milestone1Item2: ${document.milestone1Item2.status}`);
console.log(`  json:   ${path.relative(rootDir, outputPath)}`);
console.log(`  report: ${path.relative(rootDir, reportPath)}`);

const digest = crypto.createHash("sha256").update(serialized).digest("hex");
console.log(`  digest: ${digest.slice(0, 16)}`);
