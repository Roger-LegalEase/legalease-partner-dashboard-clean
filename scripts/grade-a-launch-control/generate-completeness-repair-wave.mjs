#!/usr/bin/env node
// The families S1 does not touch, released now rather than after it.
//
//   node scripts/grade-a-launch-control/generate-completeness-repair-wave.mjs [--check]
//
// S1 rewrites an allowlist that 24 build scripts reach, so every family
// downstream of it has to wait for the post-S1 audit: the numbers they would be
// dispatched against are about to change. The families that reach NEITHER runner
// have no such dependency, and holding them back buys nothing.
//
// WHY THIS IS AN ADDENDUM AND NOT A NEW MANIFEST
//
// WAVE_2_ASSIGNMENTS.json is the controlling dispatch, and S1, R8 and the seven
// verification shards are already published from it against a base workers may
// already have branched from. Regenerating that manifest to add lanes would move
// their captainBaseSha underneath them. So this is a subordinate record that
// names the parent, and the collision checks run across BOTH.
//
// THE IMPORT GRAPH DECIDES OWNERSHIP, NOT THE STATE
//
// A shared build script may be owned by a repair lane only when every script
// that imports it belongs to that same lane. One of the two hosts here passes
// that test and one does not, and the difference is not visible from the family
// names.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const OUT = "data/rcap-grade-a/launch-control/COMPLETENESS_REPAIR_WAVE.json";
const PROMPT_DIR = "docs/rcap/grade-a/launch-control/completeness-repair-prompts";
const LC = "data/rcap-grade-a/launch-control";
const SCRIPTS = "scripts";
const CAPTAIN_BRANCH = "claude/legalease-sprint-captain-utucnw";

// The control-baseline commit for this addendum.
const CAPTAIN_BASE_SHA = "33dfea59fe85b9dc86469d12e04fd65c51b480fa";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const wave2 = read(`${LC}/WAVE_2_ASSIGNMENTS.json`);
const c11 = read(`${LC}/C11_RETURN_REVIEW.json`);
const matrix = read("data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json");
const repairPlan = read("data/rcap-grade-a/packet-completeness/COMPLETENESS_REPAIR_PLAN.json");

const norm = (id) => String(id).replace(/_/g, "-").toLowerCase();

// ---- the import graph, read from the scripts themselves -----------------------------
const scriptFiles = fs.readdirSync(path.join(ROOT, SCRIPTS)).filter((f) => /^build-census-v1-.+\.mjs$/.test(f));
const directImports = new Map();
for (const file of scriptFiles) {
  const src = fs.readFileSync(path.join(ROOT, SCRIPTS, file), "utf8");
  directImports.set(file, [...new Set([...src.matchAll(/from\s+["']\.\/(build-census-v1-[^"']+\.mjs)["']/g)].map((m) => m[1]))]);
}
const S1_RUNNERS = (wave2.sharedRepairSurface?.runners ?? []).map((r) => path.basename(r.file));
/** A script is S1-affected if it IS a runner or transitively reaches one. */
const reachMemo = new Map();
const reachesS1 = (file, seen = new Set()) => {
  if (reachMemo.has(file)) return reachMemo.get(file);
  if (S1_RUNNERS.includes(file)) { reachMemo.set(file, true); return true; }
  if (seen.has(file)) return false;
  seen.add(file);
  const r = (directImports.get(file) ?? []).some((d) => reachesS1(d, seen));
  reachMemo.set(file, r);
  return r;
};

const builtFamilies = c11.families.filter((f) => f.classification === "BUILT");
const scriptFor = (familyId) => scriptFiles.find((f) => norm(f.replace(/^build-census-v1-/, "").replace(/\.mjs$/, "")) === norm(familyId));

const problems = [];
const classified = builtFamilies.map((f) => {
  const script = scriptFor(f.familyId);
  if (!script) { problems.push(`${f.familyId} has no build script; its S1 exposure cannot be derived`); return null; }
  return { familyId: f.familyId, directory: f.directory, script: `${SCRIPTS}/${script}`, s1Affected: reachesS1(script) };
}).filter(Boolean);

const unaffected = classified.filter((f) => !f.s1Affected);
const affected = classified.filter((f) => f.s1Affected);

// ---- exclusions, each checked rather than assumed -----------------------------------
const r8Families = new Set(repairPlan.passRevocation.families);
const ownedPathRoots = wave2.assignments.flatMap((a) => a.ownedPaths.map((p) => p.split("(")[0].trim().replace(/\/?\*\*$/, "")));
const pathOwnedElsewhere = (target) => ownedPathRoots.some((o) => target === o || target.startsWith(`${o}/`) || o.startsWith(`${target}/`));

const excluded = [];
const eligible = unaffected.filter((f) => {
  if (r8Families.has(f.familyId)) { excluded.push({ familyId: f.familyId, why: "an R8 priority family" }); return false; }
  if (pathOwnedElsewhere(f.directory)) { excluded.push({ familyId: f.familyId, why: `its overlay directory is already owned by an active lane` }); return false; }
  if (pathOwnedElsewhere(f.script)) { excluded.push({ familyId: f.familyId, why: `its build script is already owned by an active lane` }); return false; }
  return true;
});

// ---- shared-file exclusivity, proved from the graph ---------------------------------
//
// A host is ownable by a lane only when EVERY script importing it belongs to that
// lane. One host here is imported by two C11-stopped families that belong to R3
// and R4, so no repair lane may own it and a repair needing it stops instead.
const hostsOf = (familyIds) => {
  const scripts = new Set(familyIds.map((id) => path.basename(scriptFor(id) ?? "")));
  const hosts = new Set();
  for (const s of scripts) for (const d of directImports.get(s) ?? []) hosts.add(d);
  return [...hosts];
};
const importersOf = (host) => scriptFiles.filter((f) => f !== host && (directImports.get(f) ?? []).includes(host));

// ---- the lanes, grouped by shared root cause and form family ------------------------
const LANES = [
  {
    id: "P1_UT_PETITION_EXPUNGE_COMPLETENESS", slug: "p1-ut-petition-expunge-completeness",
    formFamily: "Utah petition to expunge (1000EX/1002EX, 1020EX/1022EX, 1044XX, 1146XX, 1148XX, 1149XX)",
    rootCause: "maps-with-canonical-and-boundary field maps whose canonicalRefusals carry no approved blank disposition; the matrix reports these seven as FAIL_MISSING_PREFILLS with 11 of 628 terminal fields written",
    match: (f) => /^ut_pet_/.test(f.familyId)
  },
  {
    id: "P2_WA_VACATUR_COMPLETENESS", slug: "p2-wa-vacatur-completeness",
    formFamily: "Washington vacatur, both benches: CRRLJ-09.0100/09.0200/09.0800/09.0870 in courts of limited jurisdiction and CR-08.0900/08.0920 in superior court",
    rootCause: "anchors-and-withheld field maps whose withheld[] entries hold required participant and case facts; all nine report FAIL_MISSING_REQUIRED_FACTS at 4 to 6 fields written",
    match: (f) => /^wa_vac_/.test(f.familyId)
  },
  {
    id: "P3_WV_CONVICTION_COMPLETENESS", slug: "p3-wv-conviction-completeness",
    formFamily: "West Virginia conviction expungement, SCA-C906 and SCA-C900",
    rootCause: "maps-with-canonical-and-boundary field maps writing 2 fields of 130 and 274; FAIL_MISSING_PREFILLS",
    match: (f) => /^wv_conv_/.test(f.familyId)
  },
  {
    id: "P4_NE_SD_SETASIDE_COMPLETENESS", slug: "p4-ne-sd-setaside-completeness",
    formFamily: "Nebraska set-aside (CC-6-11, CC-6-11.2, CC-6-11A, DC-1-15) and South Dakota arrest expungement (UJS-232, UJS-391 to UJS-394)",
    rootCause: "maps-with-canonical-and-boundary field maps writing 5 of 173 and 1 of 366; FAIL_MISSING_REQUIRED_FACTS",
    match: (f) => /^(ne-setaside-custodial|sd_arrest_expungement)/.test(f.familyId)
  }
];

const assignments = LANES.map((lane) => {
  const families = eligible.filter(lane.match);
  const hosts = hostsOf(families.map((f) => f.familyId));
  const laneScripts = new Set(families.map((f) => path.basename(f.script)));
  const sharedFiles = hosts.map((host) => {
    const importers = importersOf(host);
    const outside = importers.filter((i) => !laneScripts.has(i));
    const hostIsLaneFamily = laneScripts.has(host);
    return {
      file: `${SCRIPTS}/${host}`,
      importersInLane: importers.length - outside.length,
      importersOutsideLane: outside.map((f) => f.replace(/^build-census-v1-/, "").replace(/\.mjs$/, "")),
      hostIsOneOfThisLanesFamilies: hostIsLaneFamily,
      exclusiveToThisLane: outside.length === 0,
      ownable: outside.length === 0,
      why: outside.length === 0
        ? "every script importing this host belongs to this lane, so the lane may change it"
        : `${outside.length} script(s) outside this lane import it, so no repair lane may own it`
    };
  });
  const ownableShared = sharedFiles.filter((s) => s.ownable).map((s) => s.file);
  const unownableShared = sharedFiles.filter((s) => !s.ownable);

  return {
    assignmentId: lane.id,
    wave: "completeness-repair-addendum",
    engine: "Codex",
    lane: "completeness-repair",
    workerBranch: `codex/${lane.slug}`,
    captainBaseSha: CAPTAIN_BASE_SHA,
    readAssignmentFrom: { branch: CAPTAIN_BRANCH, file: OUT, verify: `captainBaseSha must equal ${CAPTAIN_BASE_SHA}` },
    parentManifest: `${LC}/WAVE_2_ASSIGNMENTS.json`,
    formFamily: lane.formFamily,
    sharedRootCause: lane.rootCause,
    mission: `Repair ${families.length} packet famil${families.length === 1 ? "y" : "ies"} that import neither S1 runner, so none of them waits for the post-S1 audit. They share one form family and one root cause; repair them together and re-render each against its pinned source.`,
    itemKind: "familyId",
    itemCount: families.length,
    items: families.map((f) => f.familyId),
    s1Exposure: { reachesEitherRunner: false, provedBy: "transitive import graph over scripts/build-census-v1-*.mjs, recomputed at generation time" },
    familyDetail: families.map((f) => {
      const m = matrix.results.find((r) => r.familyId === f.familyId);
      return {
        familyId: f.familyId, overlayDirectory: f.directory, buildScript: f.script,
        buildScriptOwnedByThisLane: !unownableShared.some((u) => u.file === f.script),
        completenessResultNow: m.result,
        writtenNow: `${m.totals.written}/${m.totals.terminalFields}`,
        fieldMapSchema: m.totals.fieldMapSchema,
        countersToClear: Object.fromEntries(Object.entries(m.counters).filter(([, v]) => v > 0))
      };
    }),
    requiredCounterMovement: {
      rule: "Every one of the nine completeness counters must reach zero. A counter that falls but does not reach zero is not progress that ships.",
      counters: Object.keys(matrix.results[0].counters),
      acceptance: "PASS_COMPLETE"
    },
    sourceCorpusRequirement: {
      required: true,
      binding: "MASTER_LIBRARY_SOURCE_DIR, bound through scripts/rcap-corpus/bootstrap-private-corpus.sh",
      rule: "Every source binds at the exact SHA-256 its source-receipt.json records. Never commit a source binary: 59 were excluded from the C11 integration for that reason.",
      preflight: "node scripts/verify-packet-build-environment.mjs --family <family> must print PACKET_BUILD_ENVIRONMENT_READY with every registered applicable check passing before anything is written"
    },
    artifactRequirement: {
      canonical: "a canonical fixture per packet, re-rendered after the repair",
      boundary: "a boundary fixture per packet, re-rendered after the repair",
      rasters: "page rasters for every rendered document",
      actualWrites: "reports/actual-writes.json recomputed from the output bytes, not from the finalizer's own claim"
    },
    independentReVerificationOwner: {
      lane: "an independent verification shard that did not perform this repair",
      rule: "This lane may not verify its own repair. Captain assigns the re-verification to a V shard that holds none of these families, and a repair is not proven until that shard returns PASS.",
      currentShardHolders: families.map((f) => ({
        familyId: f.familyId,
        currentShard: (wave2.assignments.find((a) => a.lane === "independent-verification" && a.items.includes(f.familyId)) ?? {}).assignmentId ?? null
      }))
    },
    // A family's own build script is NOT automatically the lane's. One of these
    // families IS a shared host: ne-setaside-custodial-set's script is imported
    // by ten other scripts, two of them C11-stopped families belonging to R3 and
    // R4. Listing it as owned because the family sits in this lane put it in
    // ownedPaths and prohibitedPaths at once -- the same contradiction the R8
    // prompt carried, produced here by a different route.
    ownedPaths: [
      `data/rcap-grade-a/wave-2/${lane.slug}/**`,
      ...families.map((f) => `${f.directory}/**`),
      ...families.map((f) => f.script).filter((script) => !unownableShared.some((u) => u.file === script)),
      ...ownableShared
    ],
    sharedFileAnalysis: sharedFiles,
    prohibitedPaths: [
      ...unownableShared.map((s) => s.file),
      ...wave2.sharedRepairSurface.runners.map((r) => r.file),
      `${LC}/**`,
      "docs/rcap/grade-a/launch-control/**",
      "data/rcap-grade-a/route-obligation-census-candidate/**",
      "data/record-clearing/legal-decisions/**",
      "supabase/migrations/**",
      "package.json", "package-lock.json", ".github/workflows/**", "private/**"
    ],
    requiredInputs: [
      `${OUT}  (read from the Captain branch tip, not from the baseline)`,
      `${LC}/WAVE_2_ASSIGNMENTS.json`,
      "scripts/rcap-packet-completeness/completeness-contract.mjs",
      "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json",
      "docs/rcap/grade-a/route-obligation-census/PACKET_WORKER_BRIEF.md"
    ],
    requiredOutputs: [
      `data/rcap-grade-a/wave-2/${lane.slug}/rows.json — one row per family: itemId, status, counters before and after, every field newly written, and every blank newly given an approved disposition`,
      ...families.map((f) => `${f.directory}/ — the corrected production-field-map.json, the updated source-receipt.json, and re-rendered canonical and boundary fixtures with their page rasters`)
    ],
    outputSchema: {
      requirement: "WEC-5: the output schema is fixed, not left to the lane.",
      arrayKey: "rows", itemKeyField: "itemId", completionVocabulary: ["COMPLETED", "STOPPED"],
      rule: "Detail goes in separate fields. An unrecognised status is refused at integration rather than translated."
    },
    focusedTests: [
      "node scripts/rcap-packet-completeness/verify-packet-completeness.mjs --family <family>",
      "node scripts/verify-packet-build-environment.mjs --family <family>",
      "node scripts/grade-a-launch-control/verify-launch-control.mjs"
    ],
    stopConditions: [
      "WEC-6: every stop below states its scope. A ROW stop records that family and continues; a LANE stop says why the rest are unsafe without it.",
      "ACCEPTANCE — a family is repaired only when the completeness verifier returns PASS_COMPLETE with all nine counters at zero. A filing with a blank offence code is not 97 percent filable.",
      ...(unownableShared.length > 0
        ? [`LANE STOP — ${unownableShared.map((s) => s.file).join(", ")} is imported by ${unownableShared.flatMap((s) => s.importersOutsideLane).join(", ")}, which are outside this lane. You may NOT change it. A repair that cannot be completed without it stops and is reported to Captain, who will sequence a shared fix the way S1 was sequenced.`]
        : []),
      ...(ownableShared.length > 0
        ? [`You own ${ownableShared.join(", ")} because every script that imports it is one of your families. Changing it changes all of them, which is the point; measure every one of your families before and after.`]
        : []),
      "ROW STOP — a required fact the platform genuinely does not hold is classified required_before_filing and surfaced in the packet's own participant instructions. A disposition without that surfacing is not an approved blank.",
      "NEVER invent a fact to fill a field. A guessed arresting agency is worse than a blank one: the blank is visible and the guess is not.",
      "NEVER write a protected field — participant signature, signature date, certificate of mailing before mailing, or any court-only or prosecutor-only field.",
      "NEVER touch an S1 runner, an R8 family, or another lane's overlay directory.",
      "NEVER re-commit a private-corpus binary. Bind from MASTER_LIBRARY_SOURCE_DIR and record the SHA-256."
    ],
    returnFormat: [
      "ASSIGNMENT:", "WORKER BRANCH:", "BASE SHA:", "ASSIGNMENT READ FROM:", "COMMIT:",
      "FAMILIES REPAIRED:", "PASS_COMPLETE:", "COUNTERS REMAINING:",
      "FACTS CLASSIFIED REQUIRED_BEFORE_FILING:", "SHARED FILES MODIFIED:",
      "STOPPED AND REPORTED:", "COMMERCIAL ROUTES OPENED: 0", "PRODUCTION TOUCHED: NO"
    ],
    promptFile: `${PROMPT_DIR}/${lane.id}.md`,
    grantsNothing: "A repaired packet is a complete packet. It is not independently verified, not visually reviewed, not legally approved, and not COMPLETE_PACKET_PROVEN."
  };
});

// ---- refusals ------------------------------------------------------------------------
const allocated = new Map();
for (const a of assignments) {
  for (const item of a.items) {
    if (allocated.has(item)) problems.push(`${item} is claimed by both ${allocated.get(item)} and ${a.assignmentId}`);
    else allocated.set(item, a.assignmentId);
  }
}
for (const f of eligible) {
  if (!allocated.has(f.familyId)) problems.push(`${f.familyId} is eligible and lands in no lane`);
}
// Paths must not collide with each other or with the parent manifest.
const pathOwner = new Map();
for (const a of wave2.assignments) for (const p of a.ownedPaths) pathOwner.set(p.split("(")[0].trim().replace(/\/?\*\*$/, ""), `${a.assignmentId} (Wave 2)`);
for (const a of assignments) {
  for (const p of a.ownedPaths) {
    const root = p.replace(/\/?\*\*$/, "");
    for (const [owned, owner] of pathOwner) {
      if (root === owned || root.startsWith(`${owned}/`) || owned.startsWith(`${root}/`)) {
        problems.push(`${a.assignmentId} owns ${p}, which collides with ${owner}`);
      }
    }
    pathOwner.set(root, a.assignmentId);
  }
}
// Every output must name a path, and every path must be writable.
const pathLike = /(?:^|[\s`"'(])((?:data|scripts|docs|src|supabase)\/[A-Za-z0-9_./<>-]+)/g;
for (const a of assignments) {
  const owned = a.ownedPaths.map((p) => p.split("(")[0].trim().replace(/\/?\*\*$/, ""));
  for (const line of a.requiredOutputs) {
    const found = [...String(line).matchAll(pathLike)].map((m) => m[1].replace(/[.,;]$/, ""));
    if (found.length === 0) problems.push(`${a.assignmentId} has a required output naming no path`);
    for (const target of found) {
      if (!owned.some((o) => target === o || target.startsWith(`${o}/`) || o.startsWith(`${target}/`))) {
        problems.push(`${a.assignmentId} owes an output at ${target}, outside every path it owns`);
      }
    }
  }
}
// No lane may own an S1 runner or an R8 path, and no lane may hold an S1-affected family.
const s1Files = new Set(wave2.sharedRepairSurface.runners.map((r) => r.file));
const r8Paths = (wave2.assignments.find((a) => a.assignmentId === "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR")?.ownedPaths ?? []).map((p) => p.replace(/\/?\*\*$/, ""));
for (const a of assignments) {
  for (const p of a.ownedPaths) {
    const root = p.replace(/\/?\*\*$/, "");
    if (s1Files.has(root)) problems.push(`${a.assignmentId} owns S1 runner ${root}`);
    if (r8Paths.some((r) => root === r || root.startsWith(`${r}/`))) problems.push(`${a.assignmentId} owns R8 path ${root}`);
  }
  for (const item of a.items) {
    if (affected.some((f) => f.familyId === item)) problems.push(`${a.assignmentId} holds ${item}, which is S1-affected`);
  }
}
// A path that is owned and prohibited at once tells a worker two things at once.
// It is not a style problem: the worker either stops or picks one, and nobody
// finds out which until integration.
for (const a of assignments) {
  const owned = new Set(a.ownedPaths.map((p) => p.split("(")[0].trim().replace(/\/?\*\*$/, "")));
  const prohibited = new Set(a.prohibitedPaths.map((p) => p.replace(/\/?\*\*$/, "")));
  for (const p of owned) if (prohibited.has(p)) problems.push(`${a.assignmentId} both owns and prohibits ${p}`);
}
// A family whose build script the lane may not touch has to be told so, rather
// than left to discover it.
for (const a of assignments) {
  for (const u of a.sharedFileAnalysis.filter((x) => !x.ownable)) {
    if (!a.stopConditions.some((c) => c.includes(u.file))) {
      problems.push(`${a.assignmentId} may not change ${u.file} and no stop condition says so`);
    }
  }
}
const PLACEHOLDER = /\b(TBD|TODO|FIXME|XXX)\b|<placeholder>|__[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*__/;
for (const a of assignments) {
  const text = JSON.stringify({ ...a, requiredOutputs: undefined, focusedTests: undefined, stopConditions: undefined, requiredInputs: undefined });
  if (PLACEHOLDER.test(text)) problems.push(`${a.assignmentId} contains a placeholder value`);
  if (!/^[0-9a-f]{40}$/.test(a.captainBaseSha)) problems.push(`${a.assignmentId} has no real control-baseline SHA`);
  if (a.items.length === 0) problems.push(`${a.assignmentId} has no families`);
}
if (assignments.length < 4 || assignments.length > 6) problems.push(`${assignments.length} lanes; the wave holds 4 to 6`);

if (problems.length > 0) {
  console.error(`completeness repair wave: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 12)) console.error(`  - ${p}`);
  process.exit(1);
}

const doc = {
  schemaVersion: "rcap-completeness-repair-wave/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-completeness-repair-wave.mjs",
  question: "Which built families does S1 not touch, and can they be repaired now?",
  thisIsAnAddendum: {
    parentManifest: `${LC}/WAVE_2_ASSIGNMENTS.json`,
    why: "S1, R8 and the seven verification shards are already published against a base workers may have branched from. Regenerating that manifest to add lanes would move their captainBaseSha underneath them, so this record names the parent instead of replacing it, and every collision check runs across both.",
    parentUnchanged: ["S1_SHARED_FACT_ALLOWLIST", "R8_COMPLETENESS_REPAIR_PRIORITY_FOUR", "V1_INDEPENDENT_PACKET_VERIFICATION", "V2_INDEPENDENT_PACKET_VERIFICATION", "V3_INDEPENDENT_PACKET_VERIFICATION", "V4_INDEPENDENT_PACKET_VERIFICATION", "V5_INDEPENDENT_PACKET_VERIFICATION", "V6_INDEPENDENT_PACKET_VERIFICATION", "V7_INDEPENDENT_PACKET_VERIFICATION"]
  },
  captainBaseSha: CAPTAIN_BASE_SHA,
  captainBranch: CAPTAIN_BRANCH,
  promptDirectory: PROMPT_DIR,
  s1ExposureDerivation: {
    method: "Transitive import graph over scripts/build-census-v1-*.mjs. A script is S1-affected if it IS one of the two runners or reaches one through any chain of imports.",
    runners: wave2.sharedRepairSurface.runners.map((r) => r.file),
    buildScriptsTotal: scriptFiles.length,
    buildScriptsAffected: scriptFiles.filter((f) => reachesS1(f)).length,
    builtFamilies: builtFamilies.length,
    builtFamiliesAffected: affected.length,
    builtFamiliesUnaffected: unaffected.length,
    correctionToTheStatedCount: {
      stated: 19,
      derived: unaffected.length,
      why: `24 build scripts reach an S1 runner, but one of them — ${affected.length < 24 ? classified.filter((f) => f.s1Affected).length : "pa_6308_underage-set"} — belongs to a family that STOPPED rather than built. Among the 43 BUILT families, ${affected.length} are affected and ${unaffected.length} are not. 43 minus 24 assumes every affected script is a built family; one is not.`
    }
  },
  exclusions: { applied: excluded, r8Families: [...r8Families], note: "All four R8 families reach an S1 runner, so they were already outside the unaffected set; the exclusion is checked rather than assumed." },
  sharedFileOwnershipRule: "A shared build script may be owned by a repair lane only when every script importing it belongs to that lane. Each lane's sharedFileAnalysis records the test and its result.",
  totals: {
    lanes: assignments.length,
    familiesDispatched: allocated.size,
    collisions: 0,
    placeholders: 0,
    sharedFilesOwned: assignments.flatMap((a) => a.sharedFileAnalysis.filter((s) => s.ownable)).length,
    sharedFilesRefused: assignments.flatMap((a) => a.sharedFileAnalysis.filter((s) => !s.ownable)).length
  },
  commercialPosture: "Every lane here repairs packet content. None opens a commercial route, proves a packet, grants an approval or consumes an authorization.",
  assignments
};

const serialized = JSON.stringify(doc, null, 2) + "\n";

function promptFor(a) {
  const list = (items) => (items.length === 0 ? "_none_" : items.map((i) => `- \`${i}\``).join("\n"));
  const p = [];
  p.push(`# ${a.assignmentId}`, "");
  p.push(`**Engine:** ${a.engine}  ·  **Lane:** ${a.lane}  ·  **Families:** ${a.itemCount}`);
  p.push(`**Worker branch:** \`${a.workerBranch}\``);
  p.push(`**Branch from:** \`${a.captainBaseSha}\``);
  p.push(`**Read this assignment from:** \`origin/${a.readAssignmentFrom.branch}\` → \`${a.readAssignmentFrom.file}\``);
  p.push("**Repository:** Roger-LegalEase/legalease-partner-dashboard-clean", "");
  p.push("> The assignment manifest is NOT in the commit you branch from. Read it from the Captain branch tip and verify that its `captainBaseSha` is the commit you branched from — if it is not, stop.", "");
  p.push("## Mission", "", a.mission, "");
  p.push(`**Form family:** ${a.formFamily}`, "");
  p.push(`**Shared root cause:** ${a.sharedRootCause}`, "");
  p.push("**S1 exposure:** none. These families reach neither shared runner, proved by the transitive import graph, so they do not wait for the post-S1 audit.", "");
  p.push(`## Your families — ${a.itemCount}`, "");
  p.push("| Family | Written now | Result | Counters to clear |");
  p.push("| --- | ---: | --- | --- |");
  for (const f of a.familyDetail) {
    p.push(`| \`${f.familyId}\` | ${f.writtenNow} | ${f.completenessResultNow} | ${Object.entries(f.countersToClear).map(([k, v]) => `${k} ${v}`).join(", ")} |`);
  }
  p.push("");
  p.push("## Shared files", "");
  p.push("| File | Importers in your lane | Importers outside | You may change it |");
  p.push("| --- | ---: | --- | --- |");
  for (const s of a.sharedFileAnalysis) {
    p.push(`| \`${s.file}\` | ${s.importersInLane} | ${s.importersOutsideLane.length === 0 ? "none" : s.importersOutsideLane.join(", ")} | ${s.ownable ? "**yes**" : "**no**"} |`);
  }
  p.push("");
  p.push("## Required counter movement", "");
  p.push(a.requiredCounterMovement.rule, "");
  p.push(list(a.requiredCounterMovement.counters), "");
  p.push(`Acceptance: **${a.requiredCounterMovement.acceptance}**.`, "");
  p.push("## Source corpus", "");
  p.push(`Binding: \`${a.sourceCorpusRequirement.binding}\``);
  p.push(`Preflight: \`${a.sourceCorpusRequirement.preflight}\``);
  p.push("", a.sourceCorpusRequirement.rule, "");
  p.push("## Artifacts you must re-render", "");
  for (const [k, v] of Object.entries(a.artifactRequirement)) p.push(`- **${k}** — ${v}`);
  p.push("");
  p.push("## Independent re-verification", "");
  p.push(a.independentReVerificationOwner.rule, "");
  p.push("| Family | Shard that will re-verify |");
  p.push("| --- | --- |");
  for (const h of a.independentReVerificationOwner.currentShardHolders) p.push(`| \`${h.familyId}\` | ${h.currentShard ?? "_assigned at integration_"} |`);
  p.push("");
  p.push("## Owned paths — write only here", "", list(a.ownedPaths), "");
  p.push("## Prohibited paths — never write here", "", list(a.prohibitedPaths), "");
  p.push("## Required inputs", "", list(a.requiredInputs), "");
  p.push("## Required outputs", "", a.requiredOutputs.map((o) => `- ${o}`).join("\n"), "");
  p.push("### Output schema", "");
  p.push(`${a.outputSchema.requirement} Array key \`${a.outputSchema.arrayKey}\`, item key \`${a.outputSchema.itemKeyField}\`, completion words ${a.outputSchema.completionVocabulary.map((v) => `\`${v}\``).join(" and ")} only.`);
  p.push("", a.outputSchema.rule, "");
  p.push("## Focused tests", "", list(a.focusedTests), "");
  p.push("## Stop conditions", "", a.stopConditions.map((s) => `- ${s}`).join("\n"), "");
  p.push("Stopping with an honest account of what is missing is a complete return.", "");
  p.push("## Return format", "", "```text", a.returnFormat.join("\n"), "```", "");
  p.push("## What finishing does not do", "", a.grantsNothing, "");
  p.push("## Setup", "", "```sh");
  p.push("git fetch origin --prune");
  p.push(`git checkout -b ${a.workerBranch} ${a.captainBaseSha}`);
  p.push(`git show origin/${a.readAssignmentFrom.branch}:${a.readAssignmentFrom.file} > /tmp/repair-assignment.json`);
  p.push(`# STOP unless /tmp/repair-assignment.json captainBaseSha === ${a.captainBaseSha}`);
  p.push("npm ci --cache /tmp/legalease-npm-cache   # requires at least 4096 MiB free");
  p.push("bash scripts/rcap-corpus/bootstrap-private-corpus.sh");
  p.push("source private/source-corpus-environment.txt");
  p.push('export MASTER_LIBRARY_SOURCE_DIR="$RCAP_BUNDLE_EXTRACT"');
  p.push("```", "");
  p.push(`Commit your work and \`git push -u origin ${a.workerBranch}\`.`, "");
  return p.join("\n");
}

const outPath = path.join(ROOT, OUT);
const promptDir = path.join(ROOT, PROMPT_DIR);
const expected = new Set(assignments.map((a) => `${a.assignmentId}.md`));

if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale or missing. Run the generator.`); process.exit(1); }
  for (const a of assignments) {
    const file = path.join(ROOT, a.promptFile);
    if (!fs.existsSync(file)) { console.error(`missing prompt ${a.promptFile}`); process.exit(1); }
    if (fs.readFileSync(file, "utf8") !== promptFor(a)) { console.error(`${a.promptFile} is stale.`); process.exit(1); }
  }
  const stray = fs.existsSync(promptDir) ? fs.readdirSync(promptDir).filter((f) => f.endsWith(".md") && !expected.has(f)) : [];
  if (stray.length > 0) { console.error(`${PROMPT_DIR} carries ${stray.length} unclaimed prompt(s)`); process.exit(1); }
  console.log(`completeness repair wave current: ${assignments.length} lane(s), ${allocated.size} famil(ies), 0 collisions.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(promptDir, { recursive: true });
fs.writeFileSync(outPath, serialized);
for (const a of assignments) fs.writeFileSync(path.join(ROOT, a.promptFile), promptFor(a));
for (const f of fs.readdirSync(promptDir)) if (f.endsWith(".md") && !expected.has(f)) fs.rmSync(path.join(promptDir, f));
console.log(`Wrote ${OUT}`);
console.log(`Wrote ${assignments.length} prompt(s) under ${PROMPT_DIR}\n`);
for (const a of assignments) console.log(`  ${a.assignmentId.padEnd(40)} ${String(a.itemCount).padStart(2)} famil(ies)  shared owned ${a.sharedFileAnalysis.filter((s) => s.ownable).length} refused ${a.sharedFileAnalysis.filter((s) => !s.ownable).length}`);
console.log(`\n  unaffected ${unaffected.length} · dispatched ${allocated.size} · collisions 0 · placeholders 0`);
