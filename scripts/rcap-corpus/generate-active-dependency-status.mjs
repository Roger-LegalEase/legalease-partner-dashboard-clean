#!/usr/bin/env node
/**
 * Regenerate the corpus status FROM the active dependency contract.
 *
 * The point of regenerating it rather than writing it once: "70 missing" keeps
 * resurfacing because the only generated corpus number in the repository is the
 * recovery kit's own. Give the repository a second generated number that
 * measures dependency rather than kit coverage, and the stale one stops being
 * the only thing available to read.
 *
 * Usage:
 *   node scripts/rcap-corpus/generate-active-dependency-status.mjs
 *   OFFICIAL_FORMS_SOURCE_DIR=/path/to/tree node scripts/.../generate-active-dependency-status.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { activeDependencyContract, settledByClassification } from "./active-dependency-contract.mjs";
import { operationalCorpusPath } from "../rcap-official-forms/operational-corpus-precondition.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = "data/rcap-all50/NATIONWIDE_ACTIVE_DEPENDENCY_STATUS.json";

const corpusDir = operationalCorpusPath(rootDir);
const contract = activeDependencyContract(rootDir, corpusDir);
const settled = settledByClassification(contract);

/**
 * Which census obligations resolve to a given document, read from the census.
 *
 * This matters for a reason that is easy to miss: three Florida census ids --
 * the 3.989 petition, order and sworn statement -- each resolve to ONE parent,
 * the Rules of Criminal Procedure capture, and the census says so in terms
 * ("RESOLVED_NOT_A_SEPARATE_DOCUMENT ... acquiring the parent acquires it").
 * Counted as three outstanding forms they look like three problems. They are
 * one document.
 */
const CENSUS = "data/rcap-grade-a/route-obligation-census-v1/identity-resolution/batch-1/resolved.json";
function censusConsumersOf(sha256) {
  const file = path.join(rootDir, CENSUS);
  if (!fs.existsSync(file)) return [];
  const found = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { for (const item of node) walk(item); return; }
    if (node.censusSourceId && Array.isArray(node.heldOutsideVerifiedCorpus)
      && node.heldOutsideVerifiedCorpus.some((held) => held.sha256 === sha256)) {
      found.push({
        censusSourceId: node.censusSourceId,
        role: node.role ?? null,
        documentTheRouteNeeds: node.documentTheRouteNeeds ?? null,
        resolutionStatus: node.resolutionStatus ?? null
      });
      return;
    }
    for (const key of Object.keys(node)) walk(node[key]);
  };
  walk(JSON.parse(fs.readFileSync(file, "utf8")));
  // The census records one row per family, so the same obligation appears once
  // per route that needs it. Deduplicated, because three ids repeated across
  // three families is still three obligations, not nine.
  const unique = new Map();
  for (const row of found) {
    const seen = unique.get(row.censusSourceId);
    if (seen) { seen.familiesNeedingIt += 1; continue; }
    unique.set(row.censusSourceId, { ...row, familiesNeedingIt: 1 });
  }
  return [...unique.values()];
}

const status = {
  schemaVersion: "rcap-nationwide-active-dependency-status/v1",
  generatedBy: "scripts/rcap-corpus/generate-active-dependency-status.mjs",
  regenerate: "node scripts/rcap-corpus/generate-active-dependency-status.mjs",

  question: "Of the 583 recorded Nationwide paths, which does a live route actually depend on, and is each held at its exact recorded bytes?",

  whyThisExistsBesideTheRecoveryReport: {
    theStaleNumber: "private/nationwide-corpus-recovery-report.json reports 513 of 583 recoverable, 70 missing.",
    whatThatNumberIs: "What one recovery kit could rebuild on 2026-09-19. It is a statement about that kit's coverage.",
    whatItIsNot: "A count of launch blockers. Read as one, it produces a recurring instruction to reacquire seventy files, which is work already answered on 2026-09-02.",
    theCorrection: "Dependency is decided by NATIONWIDE_RESIDUAL_EXECUTION.json, which classifies every unrecovered path. This record applies it. Neither number is wrong; they answer different questions, and only this one is about launch."
  },

  theRule: {
    failClosed: "A recorded path is an ACTIVE dependency unless the disposition names it BY SHA-256 and classifies it settled. Unclassified is active. A hash that does not match its disposition row is active.",
    custodyIsByBytes: "A dependency is held only when a file exists and hashes to the recorded SHA-256 -- in the operational tree, or at a path named by a custody record that is itself checked. Never by filename, folder or jurisdiction.",
    settledIsNotRecovered: "A settled classification says no live route depends on the path. It says nothing about whether the bytes exist, and this record does not relabel absent bytes as recovered. Dependency and custody are reported separately below and are never merged.",
    completenessUntouched: "This does not relax scripts/rcap-official-forms/operational-corpus-precondition.mjs. Condition 7 is a question about the complete tree and still requires all 583 at their recorded hashes. A partial custody still cannot assert completeness."
  },

  measuredOn: {
    operationalCorpusPath: path.relative(rootDir, corpusDir),
    operationalCorpusMounted: fs.existsSync(corpusDir),
    note: fs.existsSync(corpusDir)
      ? "The operational tree is mounted and was measured directly."
      : "The operational tree is NOT mounted in this checkout, so every dependency below is satisfied -- or not -- by checked custody records alone. An unmounted tree is not a finding about dependency, but it does mean these counts are a floor: a mounted tree can only raise the held count."
  },

  counts: contract.counts,
  howToReadTheCounts: {
    residual: "The paths the 2026-09-02 disposition classifies -- the only ones where a classification decides anything.",
    residualActive: "Of those, the ones a live route depends on. These are the launch question.",
    residualActiveUnheld: "The findings. Classified live, and held in no custody this repository can check.",
    neverInDispute: "Recorded paths the disposition does not name, because they were recovered. Not a launch question.",
    custodyNotMeasurableHere: "Never-in-dispute paths whose bytes this checkout cannot confirm because the operational tree is not mounted. This is a statement about the checkout, not about launch, and it is reported separately so it can never be added to the findings."
  },
  dependencyVerdict: contract.satisfied
    ? "Every active dependency in the residual set is held at its exact recorded bytes."
    : `${contract.counts.residualActiveUnheld} of the ${contract.counts.residualActive} active residual dependencies ${contract.counts.residualActiveUnheld === 1 ? "is" : "are"} not held in any custody this repository can check.`,

  unheldActiveDependencies: contract.findings.map((row) => ({
    relativePath: row.relativePath,
    sha256: row.sha256,
    jurisdiction: row.jurisdiction,
    classification: row.classification,
    familyIds: row.familyIds,
    obligation: row.obligation
  })),

  /*
   * The authority items, called out separately because they are the class that
   * cannot be replaced by a later edition or waved through by a route decision.
   * Their consumers are read out of the identity-resolution census rather than
   * asserted here, so this section says what the repository already established.
   */
  currentAuthorityDependencies: contract.rows
    .filter((row) => row.classification === "CURRENT_AUTHORITY_OR_INSTRUCTION")
    .map((row) => ({
      relativePath: row.relativePath,
      sha256: row.sha256,
      jurisdiction: row.jurisdiction,
      bytesHeld: row.bytesHeld,
      familyIds: row.familyIds,
      obligation: row.obligation,
      censusConsumers: censusConsumersOf(row.sha256),
      status: row.bytesHeld
        ? "Held. The authority binding resolves."
        : "UNRESOLVED. No custody this repository can check holds these bytes, and the census entries below resolve to this document rather than to separately issued forms -- so they are one acquisition, not several."
    })),

  activeDependenciesHeldOutsideTheOperationalTree: contract.rows
    .filter((row) => row.active && row.bytesHeld && row.custody?.record !== "data/rcap-all50/nationwide-restore-manifest.json")
    .map((row) => ({
      relativePath: row.relativePath,
      sha256: row.sha256,
      heldAt: row.custody.heldAt,
      provenRecord: row.custody.record,
      why: "The recovery report counts this path missing because it reads the Nationwide tree path. The bytes are held under a different filename and were bound by exact SHA-256 in the record named here. This is bookkeeping, not an acquisition."
    })),

  settled: Object.fromEntries(Object.entries(settled).map(([classification, rows]) => [classification, {
    count: rows.length,
    bytesStillAbsent: rows.filter((row) => !row.bytesHeld).length,
    meaning: {
      REFERENCE_ONLY: "Background material. No live route names the file. Preserve the historical identity; do not carry it as a launch recovery requirement.",
      ORPHANED_FROM_LIVE_ROUTES: "It was a route input once and no live route names it now. The no-live-dependency determination stands as recorded.",
      SUPERSEDED_SOURCE: "A later edition of record replaced these bytes. The successor is bound below from repository evidence; the old bytes are not to be hunted.",
      ALREADY_HELD_OTHER_CUSTODY: "The bytes are held outside the operational tree."
    }[classification] ?? "Classified settled on 2026-09-02.",
    paths: rows.map((row) => ({
      relativePath: row.relativePath,
      sha256: row.sha256,
      bytesHeld: row.bytesHeld,
      ...(row.successor
        ? {
          successorEditionOfRecord: {
            formNumber: row.successor.formNumber ?? null,
            heldAt: row.successor.heldAt ?? null,
            sha256: row.successor.currentSha256 ?? null,
            officialSourcePage: row.successor.officialSourcePage ?? null
          }
        }
        : {})
    }))
  }])),

  staleCustodyBindings: contract.staleCustodyBindings,

  whatThisDoesNotEstablish: [
    "It does not establish that any absent byte was recovered. Absent bytes are reported absent, per class, above.",
    "It does not open, promote or price any route. No family claim is asserted or released here.",
    "It does not revisit the 2026-09-02 classifications. It applies them; changing one is a separate decision with its own evidence.",
    "It does not answer condition 7, which remains a question about the complete corpus and is refused by the precondition module when the tree is partial."
  ],

  productionTouched: false,
  commercialRoutesOpened: 0
};

fs.writeFileSync(path.join(rootDir, OUT), JSON.stringify(status, null, 2) + "\n");

console.log(`wrote ${OUT}`);
console.log(`  recorded paths            ${contract.recorded}`);
console.log(`  residual (classified)     ${contract.counts.residual}   settled ${contract.counts.settled}, active ${contract.counts.residualActive}`);
console.log(`  active residual held      ${contract.counts.residualActiveHeld}`);
console.log(`  active residual UNHELD    ${contract.counts.residualActiveUnheld}   <- the findings`);
console.log(`  never in dispute          ${contract.counts.neverInDispute}   (custody not measurable here: ${contract.counts.custodyNotMeasurableHere})`);
console.log(`  verdict                   ${status.dependencyVerdict}`);
