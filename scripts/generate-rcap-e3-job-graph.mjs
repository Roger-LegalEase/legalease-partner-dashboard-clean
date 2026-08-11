// The current job graph, derived from the final E3 crosswalk.
//
// This replaces the frozen 363-job E2 queue, which was derived from the
// pre-adjudication crosswalk and has been worked to completion. That queue is
// kept, superseded and intact, because nine evidence packages are keyed to its
// jobIds; it is no longer the description of what is left to do. This file is.
//
// Every job here is derived from the crosswalk artifact — no invented work, no
// judgement about priority that the crosswalk does not already carry. The
// crosswalk's contentHash and evidenceHash are both recorded as input pins.
//
// DEDUPLICATION. Work is keyed by SUBJECT, not by the reason it was raised.
// Seven conclusions need operative primary authority before they can close, and
// every one of them is already a subject for another reason: PA path-k and the
// SC trafficking pathway are unresolved pathways, and the five provisional
// pardon-family pins are registry gaps. Keying by subject means those land as an
// extra obligation on an existing job rather than as seven duplicate jobs
// pointing at the same work. A subject carries every obligation attached to it.
//
// Determinism: sorted by id, no timestamps, derived entirely from committed
// bytes, so regenerating on an unchanged crosswalk is byte-identical.
//
// Usage:
//   node scripts/generate-rcap-e3-job-graph.mjs
//   node scripts/generate-rcap-e3-job-graph.mjs --check

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const crosswalkPath = path.join(rootDir, "data/rcap-ledger/track-pathway-crosswalk.json");
const outputPath = path.join(rootDir, "data/rcap-ledger/e3-job-graph.json");
const reportPath = path.join(rootDir, "docs/record-clearing/e3-job-graph.md");
const check = process.argv.includes("--check");

if (!fs.existsSync(crosswalkPath)) {
  console.error("No crosswalk artifact. Run: npm run rcap:track-pathway-crosswalk");
  process.exit(1);
}

const crosswalk = JSON.parse(fs.readFileSync(crosswalkPath, "utf8"));
const pathwayById = new Map(crosswalk.compiledPathways.map((p) => [`${p.jurisdiction}:${p.compiledPathwayId}`, p]));
const trackById = new Map(crosswalk.registryTracks.map((t) => [`${t.jurisdiction}:${t.registryTrackId}`, t]));

/** Subjects, keyed so two reasons for touching the same thing become one job. */
const subjects = new Map();

function subject(kind, jurisdiction, subjectId, fields) {
  const id = `${kind}:${jurisdiction}:${subjectId}`;
  if (!subjects.has(id)) {
    subjects.set(id, { id, kind, jurisdiction, subjectId, obligations: [], ...fields });
  }
  return subjects.get(id);
}

function obligate(entry, obligation) {
  if (!entry.obligations.some((o) => o.obligation === obligation.obligation)) {
    entry.obligations.push(obligation);
  }
}

// --- 1. Unresolved compiled pathways (30) -----------------------------------
for (const key of crosswalk.unresolvedIds.compiledPathways) {
  const [jurisdiction, ...rest] = key.split(":");
  const pathwayId = rest.join(":");
  const p = pathwayById.get(key);
  const entry = subject("compiled_pathway", jurisdiction, pathwayId, {
    label: p?.label ?? null,
    profilePath: p?.compiledProfilePath ?? null,
    reason: p?.unresolvedReason ?? null
  });
  obligate(entry, {
    obligation: "resolve_or_terminalize_pathway",
    blocking: true,
    milestone1Item2: true,
    need: p?.missingEvidence ?? "evidence that identifies the registry track this pathway represents, or proof that none exists",
    stopCondition:
      "a registry track is named on cited authority, or the pathway is terminally classified (registry gap, scoped out, routing) with a published blocker"
  });
}

// --- 2. Unresolved registry tracks (8) --------------------------------------
for (const key of crosswalk.unresolvedIds.registryTracks) {
  const [jurisdiction, ...rest] = key.split(":");
  const trackId = rest.join(":");
  const t = trackById.get(key);
  const entry = subject("registry_track", jurisdiction, trackId, {
    label: t?.legalName ?? null,
    mechanismAuthority: t?.mechanismAuthority ?? null,
    reason: "candidate compiled pathways remain ambiguous"
  });
  obligate(entry, {
    obligation: "resolve_or_terminalize_track",
    blocking: true,
    milestone1Item2: true,
    need: "a discriminator that selects among the candidate pathways, or proof that no candidate represents this track",
    candidates: t?.candidateCompiledPathwayIds ?? [],
    stopCondition: "exactly one candidate is selected on cited authority, or the track is terminally classified"
  });
}

// --- 3. Registry-gap owner actions (31) -------------------------------------
for (const blocker of crosswalk.registryGapBlockers) {
  const entry = subject("compiled_pathway", blocker.jurisdiction, blocker.compiledPathwayId, {
    label: pathwayById.get(`${blocker.jurisdiction}:${blocker.compiledPathwayId}`)?.label ?? null,
    reason: "relief mechanism with no registry track"
  });
  obligate(entry, {
    obligation: "registry_owner_action",
    blocking: false,
    milestone1Item2: false,
    provisional: Boolean(blocker.provisional),
    operativeAuthority: blocker.operativeAuthority ?? null,
    ownerAction: blocker.proposedRegistryOwnerAction ?? null,
    denominatorImpact: blocker.denominatorImpact ?? null,
    runtimeImpact: blocker.runtimeImpact ?? null,
    stopCondition: "the registry owner adds or declines the track; declining must record why the mechanism is out of scope"
  });
}

// --- 4. Official-source materialization (7, material set only) --------------
//
// Named explicitly rather than inferred: E3 held this to the conclusions that
// cannot close without operative primary authority, not a blanket queue over
// every citation. Each attaches to a subject that already exists above.
const MATERIALIZATION = [
  {
    key: "compiled_pathway:PA:path-k-human-trafficking-vacatur-expungement",
    authority: "18 Pa.C.S. ch. 30 (expected § 3019)",
    note: "one fetch; egress-blocked in every lane that tried",
    surplusBlocker: true
  },
  {
    key: "compiled_pathway:SC:human-trafficking-survivor-expungement",
    authority: "S.C. Code § 16-3-2020",
    note: "not present in any committed source",
    surplusBlocker: false
  },
  ...[
    ["ME", "pardon-route"],
    ["SC", "pardon-guidance-for-otherwise-ineligible-convictions"],
    ["UT", "path-k-pardon-based-expungement"],
    ["UT", "path-m-juvenile-expungement"],
    ["WI", "executive-pardon-guidance"]
  ].map(([jurisdiction, pathwayId]) => ({
    key: `compiled_pathway:${jurisdiction}:${pathwayId}`,
    authority: null,
    note: "provisional gap blocker: needs its operative citation pinned before it can leave provisional status",
    surplusBlocker: false
  }))
];

const materializationProblems = [];
for (const item of MATERIALIZATION) {
  const entry = subjects.get(item.key);
  if (!entry) {
    // A materialization need with no subject would be work that silently
    // vanished from the graph — louder than a missing row.
    materializationProblems.push(`materialization subject not found in the crosswalk-derived graph: ${item.key}`);
    continue;
  }
  obligate(entry, {
    obligation: "materialize_official_source",
    blocking: true,
    milestone1Item2: entry.kind === "compiled_pathway" && crosswalk.unresolvedIds.compiledPathways.includes(`${entry.jurisdiction}:${entry.subjectId}`),
    authority: item.authority,
    note: item.note,
    surplusBlocker: item.surplusBlocker,
    stopCondition: "the operative primary authority is committed to the repository and cited by the conclusion that depends on it"
  });
}

// --- 5. Runtime currentness correction (Oklahoma) ---------------------------
//
// A correct crosswalk relationship does not make repealed runtime text current.
// This is a participant-treatment consequence, not a mapping defect: the mapping
// is right and the text a participant would receive is repealed.
for (const track of crosswalk.registryTracks) {
  if (track.compiledCoverageDisposition !== "represented_with_superseded_runtime_text") continue;
  const entry = subject("registry_track", track.jurisdiction, track.registryTrackId, {
    label: track.legalName ?? null,
    mechanismAuthority: track.mechanismAuthority ?? null,
    reason: "mapped, but the runtime renders superseded statutory text"
  });
  obligate(entry, {
    obligation: "correct_superseded_runtime_text",
    blocking: true,
    milestone1Item2: false,
    participantTreatment: true,
    need: "replace the repealed § 18(C)/§ 19(B) machinery text with the current § 18b/§ 19d authority in the compiled runtime",
    stopCondition:
      "the runtime renders current authority. Until then this track contributes no current coverage and must not be sold or presented as available relief"
  });
}

// --- 6. Implementation consequences: tracks with no runtime pathway (226) ---
for (const track of crosswalk.registryTracks) {
  if (track.compiledCoverageDisposition !== "missing_from_compiled_runtime") continue;
  const entry = subject("registry_track", track.jurisdiction, track.registryTrackId, {
    label: track.legalName ?? null,
    mechanismAuthority: track.mechanismAuthority ?? null,
    reason: "registry track with no compiled runtime representation"
  });
  obligate(entry, {
    obligation: "implement_runtime_pathway",
    blocking: false,
    milestone1Item2: false,
    participantTreatment: true,
    need: "a compiled pathway implementing this track, or a decision that it stays out of the runtime",
    stopCondition:
      "the track has a compiled pathway, or a recorded decision that it is intentionally unimplemented. Until then a participant eligible under this track receives nothing for it"
  });
}

// --- 7. Named non-blocking authority residuals (2) ---------------------------
//
// Preserved by name because they are real and small, and because an unnamed
// residual is indistinguishable from an oversight later.
const RESIDUALS = [
  {
    jurisdiction: "LA",
    subjectId: "trafficking-certification-paragraphs",
    need: "pin the specific paragraphs of La. C.Cr.P. arts. 977/978 that carry the trafficking certification",
    doesNotBlock: "the Louisiana trafficking mappings, which stand on the articles as committed"
  },
  {
    jurisdiction: "MS",
    subjectId: "dui-nonadjudication-subsection",
    need: "pin the nonadjudication subsection of Miss. Code § 63-11-30 (expected (14))",
    doesNotBlock: "the Mississippi DUI nonadjudication mapping, which stands on the section as committed"
  }
];

for (const residual of RESIDUALS) {
  const entry = subject("authority_residual", residual.jurisdiction, residual.subjectId, {
    label: null,
    reason: "subsection-granularity citation residual"
  });
  obligate(entry, {
    obligation: "pin_subsection_citation",
    blocking: false,
    milestone1Item2: false,
    need: residual.need,
    doesNotBlock: residual.doesNotBlock,
    stopCondition: "the subsection is cited precisely, or recorded as unavailable at subsection granularity"
  });
}

// --- facets ------------------------------------------------------------------
//
// The same 298 jobs answer different planning questions depending on who is
// asking. A dispatcher needs owned paths and dependencies; a reviewer needs the
// review requirement; a product owner needs the terminal effect. Rather than
// maintain seven hand-written lists that drift apart, each job carries its
// facets and the report projects them.

// Which registry tracks a job actually moves. A pathway job affects the tracks
// it is mapped to (or none, if it is unresolved or a gap); a track job affects
// itself. This is what stops "298 jobs" being mistaken for "298 tracks".
function affectedTracks(job) {
  if (job.kind === "registry_track") return [`${job.jurisdiction}:${job.subjectId}`];
  if (job.kind === "authority_residual") return [];
  const p = pathwayById.get(`${job.jurisdiction}:${job.subjectId}`);
  return (p?.mappedRegistryTrackIds ?? []).map((t) => `${job.jurisdiction}:${t}`);
}

const IMPLEMENTATION_FAMILY = {
  resolve_or_terminalize_pathway: "crosswalk_resolution",
  resolve_or_terminalize_track: "crosswalk_resolution",
  materialize_official_source: "source_materialization",
  registry_owner_action: "registry_governance",
  implement_runtime_pathway: "runtime_implementation",
  correct_superseded_runtime_text: "runtime_currentness",
  pin_subsection_citation: "source_materialization"
};

const REVIEW_REQUIREMENT = {
  // Resolution changes what the crosswalk asserts about the law, so counsel
  // reads it before it can be relied on. It does not ship anything by itself.
  crosswalk_resolution: "counsel_review",
  // A citation pin is checkable against the source; no legal judgement is added.
  source_materialization: "source_freshness_review",
  // Adding or declining a registry track is the registry owner's decision.
  registry_governance: "registry_owner_decision",
  // New runtime output reaches participants, so it needs both.
  runtime_implementation: "counsel_review + visual_review",
  // Replacing repealed text with current authority reaches participants.
  runtime_currentness: "counsel_review + visual_review"
};

const OWNED_PATHS = {
  crosswalk_resolution: ["data/rcap-ledger/crosswalk-adjudications.json"],
  source_materialization: ["private/Nationwide Record Clearing/", "data/rcap-ledger/crosswalk-adjudications.json"],
  registry_governance: ["data/record-clearing/legal-design-track-registry.json"],
  runtime_implementation: ["src/lib/rcap-engine/compiled/profiles/"],
  runtime_currentness: ["src/lib/rcap-engine/compiled/profiles/"]
};

function terminalEffect(job) {
  const names = job.obligations.map((o) => o.obligation);
  if (names.includes("resolve_or_terminalize_pathway") || names.includes("resolve_or_terminalize_track")) {
    return "closes one of the 38 Milestone 1 item 2 blockers; does not by itself add runtime coverage";
  }
  if (names.includes("correct_superseded_runtime_text")) {
    return "restores one track to current coverage and makes it sellable; does not change the crosswalk relationship";
  }
  if (names.includes("implement_runtime_pathway")) {
    return "moves one track from uncompiled to represented; raises runtime coverage against the 497 denominator";
  }
  if (names.includes("registry_owner_action")) {
    return "adds a registry track (raising the 497 denominator) or records the mechanism as out of scope; no runtime effect";
  }
  if (names.includes("pin_subsection_citation")) {
    return "improves citation granularity only; blocks nothing and changes no total";
  }
  return "no terminal effect recorded";
}

const jobs = [...subjects.values()].sort((a, b) => a.id.localeCompare(b.id));
for (const job of jobs) {
  job.obligations.sort((a, b) => a.obligation.localeCompare(b.obligation));

  const families = [...new Set(job.obligations.map((o) => IMPLEMENTATION_FAMILY[o.obligation]).filter(Boolean))].sort();
  const tracks = affectedTracks(job);

  // A dependency is another obligation on this same job that must land first.
  // Primary authority is the only such ordering in this graph: a conclusion that
  // needs a statute cannot be resolved before the statute is in hand.
  const dependsOn = job.obligations.some((o) => o.obligation === "materialize_official_source")
    ? ["materialize_official_source"]
    : [];

  job.facets = {
    jobClass: job.obligations.map((o) => o.obligation),
    affectedTracks: tracks,
    affectedTrackCount: tracks.length,
    dependency: dependsOn.length > 0 ? { blockedBy: dependsOn, note: "primary authority must land before this job can close" } : { blockedBy: [], note: "no intra-job dependency" },
    implementationFamily: families,
    ownedPaths: [...new Set(families.flatMap((f) => OWNED_PATHS[f] ?? []))].sort(),
    reviewRequirement: [...new Set(families.map((f) => REVIEW_REQUIREMENT[f]).filter(Boolean))].sort(),
    terminalEffect: terminalEffect(job)
  };
}

const obligationCounts = {};
for (const job of jobs) {
  for (const o of job.obligations) obligationCounts[o.obligation] = (obligationCounts[o.obligation] ?? 0) + 1;
}

const totalObligations = jobs.reduce((sum, j) => sum + j.obligations.length, 0);
const blockingJobs = jobs.filter((j) => j.obligations.some((o) => o.blocking)).length;
const milestoneJobs = jobs.filter((j) => j.obligations.some((o) => o.milestone1Item2)).length;

const artifact = {
  schemaVersion: "rcap-e3-job-graph/v1",
  generatedBy: "scripts/generate-rcap-e3-job-graph.mjs",
  purpose:
    "The exact finite work remaining after final E3, keyed by subject so that one thing needing two kinds of work is one job carrying two obligations. Supersedes the frozen 363-job E2 queue.",
  supersedes: {
    queue: "data/rcap-ledger/e2-evidence-jobs.json",
    jobs: 363,
    note:
      "That queue was derived from the pre-adjudication crosswalk and is kept frozen and intact because nine evidence packages are keyed to its jobIds. It no longer describes remaining work."
  },
  input: {
    crosswalk: "data/rcap-ledger/track-pathway-crosswalk.json",
    crosswalkContentHash: crosswalk.contentHash ?? null,
    crosswalkEvidenceHash: crosswalk.evidenceHash ?? null,
    registryTracks: crosswalk.aggregates.registryTracks,
    compiledPathways: crosswalk.aggregates.compiledPathways
  },
  milestone1Item2: {
    closed: crosswalk.aggregates.milestone1Item2Closed,
    blockedBy: {
      unresolvedPathways: crosswalk.unresolvedIds.compiledPathways.length,
      unresolvedTracks: crosswalk.unresolvedIds.registryTracks.length
    },
    note: "Item 2 closes when both sets are empty. No other obligation in this graph blocks it."
  },
  counts: {
    jobs: jobs.length,
    obligations: totalObligations,
    blockingJobs,
    milestone1Item2Jobs: milestoneJobs,
    byObligation: obligationCounts,
    bySubjectKind: jobs.reduce((acc, j) => ({ ...acc, [j.kind]: (acc[j.kind] ?? 0) + 1 }), {})
  },
  jobs
};

const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

const lines = [];
lines.push("# RCAP job graph — current work after final E3");
lines.push("");
lines.push(
  `Generated by \`scripts/generate-rcap-e3-job-graph.mjs\` from \`data/rcap-ledger/track-pathway-crosswalk.json\` (contentHash \`${crosswalk.contentHash}\`, evidenceHash \`${crosswalk.evidenceHash}\`).`
);
lines.push("");
lines.push(
  "Supersedes the frozen 363-job E2 queue, which is kept intact because nine evidence packages are keyed to its jobIds."
);
lines.push("");
lines.push(`**${jobs.length} jobs carrying ${totalObligations} obligations.** Keyed by subject: a pathway that is both unresolved and needs primary authority is one job with two obligations, not two jobs.`);
lines.push("");
lines.push("| Obligation | Jobs | Blocks Milestone 1 item 2 |");
lines.push("| --- | ---: | --- |");
for (const [name, count] of Object.entries(obligationCounts).sort()) {
  const blocksM1 = jobs.some((j) => j.obligations.some((o) => o.obligation === name && o.milestone1Item2));
  lines.push(`| \`${name}\` | ${count} | ${blocksM1 ? "yes" : "no"} |`);
}
lines.push("");
lines.push("## Milestone 1 item 2");
lines.push("");
lines.push(
  `**${crosswalk.aggregates.milestone1Item2Closed ? "CLOSED" : "BLOCKED"}** on ${crosswalk.unresolvedIds.compiledPathways.length} unresolved pathways and ${crosswalk.unresolvedIds.registryTracks.length} unresolved registry tracks. Nothing else in this graph blocks it.`
);
lines.push("");
lines.push("## Official-source materialization (7)");
lines.push("");
lines.push("Held to the conclusions that cannot close without operative primary authority — not a blanket queue over every citation. Each is an obligation on a job that already exists for another reason.");
lines.push("");
for (const job of jobs) {
  const m = job.obligations.find((o) => o.obligation === "materialize_official_source");
  if (!m) continue;
  lines.push(`- \`${job.id}\` — ${m.authority ?? "citation not yet identified"}${m.surplusBlocker ? " **(surplus blocker)**" : ""}. ${m.note}`);
}
lines.push("");
lines.push("## Participant-treatment consequences");
lines.push("");
lines.push(
  "A correct crosswalk relationship is not the same as relief a participant can actually receive. Two obligation classes carry that distinction:"
);
lines.push("");
lines.push(
  `- \`correct_superseded_runtime_text\` (${obligationCounts.correct_superseded_runtime_text ?? 0}) — Oklahoma clean-slate maps correctly and renders repealed text. It contributes no current coverage and must not be sold or presented as available relief until the runtime cites current authority.`
);
lines.push(
  `- \`implement_runtime_pathway\` (${obligationCounts.implement_runtime_pathway ?? 0}) — registry tracks with no compiled runtime representation. A participant eligible under one of these receives nothing for it today.`
);
lines.push("");
lines.push("## Non-blocking authority residuals (2)");
lines.push("");
for (const job of jobs) {
  const r = job.obligations.find((o) => o.obligation === "pin_subsection_citation");
  if (!r) continue;
  lines.push(`- \`${job.id}\` — ${r.need}. Does not block ${r.doesNotBlock}.`);
}
lines.push("");

// --- the seven facets --------------------------------------------------------
const facetTally = (pick) => {
  const acc = {};
  for (const job of jobs) {
    for (const key of [pick(job)].flat()) {
      if (key === undefined || key === null) continue;
      acc[String(key)] = (acc[String(key)] ?? 0) + 1;
    }
  }
  return acc;
};

lines.push("## Breakdown by facet");
lines.push("");
lines.push(
  `The same ${jobs.length} jobs, projected seven ways. A job appears under every facet value that applies to it, so facet columns count jobs and do not sum to ${jobs.length} where a job carries more than one value.`
);
lines.push("");

lines.push("### 1. Job class");
lines.push("");
lines.push("| Class | Jobs |");
lines.push("| --- | ---: |");
for (const [k, v] of Object.entries(facetTally((j) => j.facets.jobClass)).sort()) lines.push(`| \`${k}\` | ${v} |`);
lines.push("");

lines.push("### 2. Affected tracks");
lines.push("");
const withTracks = jobs.filter((j) => j.facets.affectedTrackCount > 0);
const distinctTracks = new Set(jobs.flatMap((j) => j.facets.affectedTracks));
lines.push(
  `${withTracks.length} of ${jobs.length} jobs touch at least one registry track; ${distinctTracks.size} distinct tracks are touched in total, out of ${crosswalk.aggregates.registryTracks}.`
);
lines.push("");
lines.push(
  `The remaining ${jobs.length - withTracks.length} jobs affect **no** track: unresolved pathways have no mapping yet, registry gaps have no track by definition, and the two residuals are citation-granularity only. This is the number to quote when asked how much of the registry this work moves — not the job count.`
);
lines.push("");

lines.push("### 3. Dependency");
lines.push("");
const blocked = jobs.filter((j) => j.facets.dependency.blockedBy.length > 0);
lines.push(
  `${blocked.length} jobs are blocked by an intra-job dependency, all of them the same one: primary authority must be materialized before the conclusion can close. Every other job is independently workable today.`
);
lines.push("");
for (const job of blocked) lines.push(`- \`${job.id}\` — blocked by \`${job.facets.dependency.blockedBy.join(", ")}\``);
lines.push("");

lines.push("### 4. Implementation family");
lines.push("");
lines.push("| Family | Jobs |");
lines.push("| --- | ---: |");
for (const [k, v] of Object.entries(facetTally((j) => j.facets.implementationFamily)).sort()) lines.push(`| ${k} | ${v} |`);
lines.push("");

lines.push("### 5. Owned paths");
lines.push("");
lines.push("What a worker on this job may write. Anything outside its family's paths is another lane's.");
lines.push("");
lines.push("| Family | Owned paths |");
lines.push("| --- | --- |");
for (const [family, paths] of Object.entries(OWNED_PATHS).sort()) {
  lines.push(`| ${family} | ${paths.map((p) => `\`${p}\``).join(", ")} |`);
}
lines.push("");

lines.push("### 6. Review requirement");
lines.push("");
lines.push("| Requirement | Jobs |");
lines.push("| --- | ---: |");
for (const [k, v] of Object.entries(facetTally((j) => j.facets.reviewRequirement)).sort()) lines.push(`| ${k} | ${v} |`);
lines.push("");

lines.push("### 7. Terminal effect");
lines.push("");
lines.push("| Effect | Jobs |");
lines.push("| --- | ---: |");
for (const [k, v] of Object.entries(facetTally((j) => j.facets.terminalEffect)).sort()) lines.push(`| ${k} | ${v} |`);
lines.push("");
lines.push(
  "Closing every job in this graph would not by itself make the product launchable: resolution closes the map, implementation builds the runtime, currentness makes one track sellable again, and registry governance changes the denominator. Those are four different kinds of done."
);
lines.push("");

const report = `${lines.join("\n")}\n`;

if (materializationProblems.length > 0) {
  console.error("generate-rcap-e3-job-graph FAILED");
  for (const problem of materializationProblems) console.error(` - ${problem}`);
  process.exit(1);
}

if (check) {
  const currentJson = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  const currentReport = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, "utf8") : "";
  if (currentJson !== serialized || currentReport !== report) {
    console.error("E3 job graph is stale. Run: npm run rcap:e3-job-graph");
    process.exit(1);
  }
  console.log(`E3 job graph current. ${jobs.length} jobs, ${totalObligations} obligations.`);
  process.exit(0);
}

fs.writeFileSync(outputPath, serialized);
fs.writeFileSync(reportPath, report);

console.log(`E3 job graph written: ${jobs.length} jobs, ${totalObligations} obligations`);
for (const [name, count] of Object.entries(obligationCounts).sort()) {
  console.log(`  ${name.padEnd(34)} ${count}`);
}
console.log(`  ${"blocking jobs".padEnd(34)} ${blockingJobs}`);
console.log(`  ${"milestone 1 item 2 jobs".padEnd(34)} ${milestoneJobs}`);
