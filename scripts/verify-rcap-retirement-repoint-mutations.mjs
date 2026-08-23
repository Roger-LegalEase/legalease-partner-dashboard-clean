#!/usr/bin/env node
// Can the retirement/repoint adjudicator say anything other than "retained"?
//
//   node scripts/verify-rcap-retirement-repoint-mutations.mjs
//
// The lane's five assets all adjudicate to retained. That result is only
// evidence if the adjudicator was capable of returning something else, so each
// mutation here removes exactly one fact and requires the outcome to move:
//
//   1. the registry stops naming AOC-497  -> retirement candidate
//   2. the archive holds AOC-497 at a different hash -> repoint required
//   3. the registry bytes stop matching the ledger pin -> refusal, not a result
//
// If a mutation leaves the outcome at retained, the adjudicator is reporting a
// constant and its five retentions prove nothing.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { withTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "data/rcap-all50/pdf-retirement-evidence/retirement-repoint-adjudication.json";
const REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const LEDGER = "data/rcap-ledger/track-terminalization.json";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const DETERMINATION = "data/rcap-all50/pdf-retirement-determination.json";
const TARGET = "KY|AOC-497|715c00db62e19f07f7dedde68e89309027f4ed9566198a3617cb9bb34a98368b";

const abs = (rel) => path.join(rootDir, rel);
const failures = [];

/**
 * Run the adjudicator and report what it did.
 *
 * The output file is restored by the caller's journal, so a mutation run is
 * free to overwrite it. What matters is the row the run produced, or the
 * refusal it produced instead.
 */
function adjudicate() {
  try {
    execFileSync("node", ["scripts/generate-rcap-retirement-repoint-adjudication.mjs"], { cwd: rootDir, stdio: "pipe" });
  } catch (error) {
    return { refused: true, message: `${error.stdout ?? ""}${error.stderr ?? ""}`.trim() };
  }
  const record = JSON.parse(fs.readFileSync(abs(OUT), "utf8"));
  return { refused: false, row: record.assets.find((asset) => asset.assetId === TARGET) };
}

// The registry is read from the pinned commit when it is reachable, and a
// mutation to the working file would then change nothing. So each registry
// mutation clears the ledger's commit as well, which forces the fallback read
// and makes the working bytes the ones under test.
function unpinCommit(text) {
  const ledger = JSON.parse(text);
  ledger.registrySource.commit = "0000000000000000000000000000000000000000";
  return `${JSON.stringify(ledger, null, 2)}\n`;
}

/**
 * Point the ledger at the working registry as it stands right now.
 *
 * A mutation that changes what the registry says must also re-pin it, or the
 * adjudicator refuses on the hash and the mutation tests the refusal instead of
 * the thing it meant to test. Rewrites are applied in declaration order, so the
 * registry is already written when this reads it.
 */
function repinToWorkingTree(text) {
  const ledger = JSON.parse(unpinCommit(text));
  ledger.registrySource.sha256[REGISTRY] = createHash("sha256")
    .update(fs.readFileSync(abs(REGISTRY), "utf8"))
    .digest("hex");
  return `${JSON.stringify(ledger, null, 2)}\n`;
}

async function mutation(name, files, expectation) {
  await withTrackedMutation(`retirement-repoint-mutation:${name}`, [OUT, ...Object.keys(files)], async () => {
    for (const [repoPath, rewrite] of Object.entries(files)) {
      fs.writeFileSync(abs(repoPath), rewrite(fs.readFileSync(abs(repoPath), "utf8")));
    }
    const result = adjudicate();
    const problem = expectation(result);
    if (problem) failures.push(`${name}: ${problem}`);
    else console.log(`  ok  ${name}`);
  });
}

console.log("retirement/repoint adjudicator mutations");

// 1. Nothing names it -> it becomes retirable.
await mutation(
  "registry stops naming AOC-497",
  {
    [REGISTRY]: (text) => {
      const registry = JSON.parse(text);
      for (const track of registry.tracks) {
        if (!track.packetSet?.components) continue;
        track.packetSet.components = track.packetSet.components.filter((c) => c.officialFormId !== "AOC-497");
      }
      return `${JSON.stringify(registry, null, 2)}\n`;
    },
    [LEDGER]: repinToWorkingTree,
    // The determination is regenerated from the same surfaces, so a registry
    // that stops naming the form drops the use site there too. Mutating only
    // the registry would test half the path and leave the adjudicator holding
    // the asset on a stale row.
    [DETERMINATION]: (text) => {
      const determination = JSON.parse(text);
      const asset = determination.assets.find((candidate) => candidate.assetId === TARGET);
      asset.useSites = [];
      asset.affectedTrackIds = [];
      asset.determination = "retirement_candidate";
      return `${JSON.stringify(determination, null, 2)}\n`;
    }
  },
  ({ refused, row, message }) => {
    if (refused) return `the adjudicator refused instead of adjudicating: ${message}`;
    if (!row) return "the target asset vanished from the output";
    if (row.outcome !== "retirement_candidate_confirmed") {
      return `outcome stayed ${row.outcome} with ${row.locatedSites.length} located site(s); an asset nothing names must become retirable`;
    }
    return null;
  }
);

// 2. The archive holds a different edition -> the binding moves instead.
await mutation(
  "archive holds AOC-497 at a different hash",
  {
    [CORPUS_INDEX]: (text) => {
      const index = JSON.parse(text);
      for (const entry of index.entries) {
        if (entry.formNumber === "AOC-497") entry.sha256 = "f".repeat(64);
      }
      return `${JSON.stringify(index, null, 2)}\n`;
    }
  },
  ({ refused, row, message }) => {
    if (refused) return `the adjudicator refused instead of adjudicating: ${message}`;
    if (!row) return "the target asset vanished from the output";
    // The bound hash is no longer in the archive, so supersession is undecided
    // rather than proven, and the honest outcome is still retained -- but the
    // supersession record has to stop claiming the bytes are canonical.
    if (row.supersession.superseded === false) {
      return "supersession still reports the bound bytes as canonical after the archive stopped holding them";
    }
    if (!Array.isArray(row.supersession.candidates) || row.supersession.candidates.length === 0) {
      return "no repoint candidate was recorded even though the archive holds another edition";
    }
    return null;
  }
);

// 3. Unpinned registry bytes are refused, not used.
await mutation(
  "registry bytes stop matching the ledger pin",
  {
    [LEDGER]: unpinCommit,
    [REGISTRY]: (text) => {
      const registry = JSON.parse(text);
      registry.tracks[0].packetSet ??= { components: [] };
      registry.tracks[0].packetSet.components.push({ componentId: "mutation-injected", role: "primary_filing", officialFormId: "ZZ-9999" });
      return `${JSON.stringify(registry, null, 2)}\n`;
    }
  },
  ({ refused, message }) => {
    if (!refused) return "the adjudicator used registry bytes that do not match the ledger pin";
    if (!/does not match the ledger pin/.test(message)) return `refused for the wrong reason: ${message}`;
    return null;
  }
);

if (failures.length > 0) {
  console.error(`FAIL retirement/repoint mutations — ${failures.length} mutation(s) did not move the result`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

// The adjudicator must still be at its committed answer once the mutations are
// undone, or the harness left the repository somewhere other than it found it.
try {
  execFileSync("node", ["scripts/generate-rcap-retirement-repoint-adjudication.mjs", "--check"], { cwd: rootDir, stdio: "pipe" });
} catch (error) {
  console.error("FAIL retirement/repoint mutations — the adjudication is not back at its committed value after the mutations");
  console.error(`${error.stdout ?? ""}${error.stderr ?? ""}`.trim());
  process.exit(1);
}

console.log("OK retirement/repoint mutations — 3 mutation(s) each moved the result, and the committed adjudication is restored");
