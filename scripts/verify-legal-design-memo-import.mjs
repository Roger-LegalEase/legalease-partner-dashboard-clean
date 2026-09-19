// Proves the imported legal-design memos are either byte-for-byte identical to
// the source branch, or carried forward from it by exactly the corrections the
// lineage record names.
//
// The memos are a hash-bound legal authority. If they can drift here, they stop
// being one, and the repository quietly grows a second legal design of record.
//
// WHY THIS IS NOT A PURE IDENTITY CHECK ANY MORE
//
// It used to assert byte-identity with the import for all 52 files. Eighteen
// stopped being identical, through authorized corrections: the 2026-09-06
// owner-relayed research batches, the 2026-09-07 Rhode Island independent
// review, FIX96, FIX120 and the resolution-lane record. Each is a real commit
// citing a research handoff or decision record. So the old control asserted a
// statement that was no longer true, while the register beside it published
// hashes of the successor bytes — claiming identity and succession at once.
//
// A control may prove one truthful statement, not two contradictory ones. This
// proves succession, and the import stays the identity root:
//
//   a memo is identical to the import, OR its current bytes are reachable from
//   the import by EXACTLY the commits the lineage record names — no unrecorded
//   commit touched it, and no recorded commit is missing.
//
// That is strictly stronger than the old check against drift, because an
// unrecorded edit now fails whether or not it happens to restore the import.
//
// Usage: node scripts/verify-legal-design-memo-import.mjs

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MEMO_DIR = "data/record-clearing/legal-design-intake";
const SOURCE_REF = "origin/feat/record-clearing-production-integration";
const SOURCE_COMMIT = "3b6f4c10";
const LINEAGE = "data/record-clearing/legal-design-memo-lineage.json";

const failures = [];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

if (!fs.existsSync(path.join(root, LINEAGE))) {
  console.error(`${LINEAGE} is missing; the memo succession cannot be proved.`);
  process.exit(1);
}
const lineage = JSON.parse(fs.readFileSync(path.join(root, LINEAGE), "utf8"));
const recorded = new Map((lineage.memos ?? []).map((entry) => [entry.file, entry]));

const localFiles = fs.readdirSync(path.join(root, MEMO_DIR))
  .filter((f) => f.endsWith(".memo.json"))
  .sort();
const memoFiles = localFiles.filter((f) => f !== "TEMPLATE.memo.json");
if (memoFiles.length !== 51) failures.push(`${memoFiles.length} jurisdiction memos present, expected 51`);

let identical = 0;
let carried = 0;
let unreachable = false;

for (const file of localFiles) {
  const rel = `${MEMO_DIR}/${file}`;
  const currentSha = sha(fs.readFileSync(path.join(root, rel)));

  let importSha;
  try {
    importSha = sha(git("show", `${SOURCE_REF}:${rel}`));
  } catch {
    unreachable = true;
    continue;
  }

  if (currentSha === importSha) {
    identical += 1;
    const entry = recorded.get(rel);
    if (entry && entry.identicalToImport !== true) {
      failures.push(`${rel} is identical to the import but the lineage record says it was carried forward`);
    }
    continue;
  }

  // Carried forward. It must be recorded, the record must name these exact
  // bytes, and the commits that actually touched it must be exactly the ones
  // the record names.
  const entry = recorded.get(rel);
  if (!entry) {
    failures.push(`${rel} differs from ${SOURCE_REF} and has no lineage entry -- an unrecorded second legal design of record`);
    continue;
  }
  if (entry.currentSha256 !== currentSha) {
    failures.push(`${rel} lineage records ${String(entry.currentSha256).slice(0, 12)} but the file is ${currentSha.slice(0, 12)}; the record is stale against its own subject`);
    continue;
  }
  if (entry.importSha256 !== importSha) {
    failures.push(`${rel} lineage records an import digest ${String(entry.importSha256).slice(0, 12)} that is not ${SOURCE_REF}'s ${importSha.slice(0, 12)}`);
    continue;
  }

  const actual = git("log", "--format=%H", "--reverse", `${SOURCE_REF}..HEAD`, "--", rel)
    .trim().split("\n").filter(Boolean);
  const claimed = (entry.corrections ?? []).map((c) => c.commit);
  const missing = actual.filter((c) => !claimed.includes(c));
  const phantom = claimed.filter((c) => !actual.includes(c));
  if (missing.length > 0) {
    failures.push(`${rel} was changed by ${missing.length} commit(s) the lineage does not record: ${missing.map((c) => c.slice(0, 9)).join(", ")}`);
    continue;
  }
  if (phantom.length > 0) {
    failures.push(`${rel} lineage names ${phantom.length} commit(s) that did not touch it: ${phantom.map((c) => c.slice(0, 9)).join(", ")}`);
    continue;
  }
  carried += 1;
}

if (unreachable && identical + carried === 0) {
  console.error(`Cannot reach ${SOURCE_REF}; the memo succession could not be proved.`);
  console.error("Fetch the source branch and re-run. This check does not pass on an unfetchable remote.");
  process.exit(1);
}

if (failures.length > 0) {
  console.error("Legal design memo succession verification failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Legal design memo succession verified against ${SOURCE_REF} (${SOURCE_COMMIT}):`);
console.log(`  ${identical} memo(s) byte-for-byte identical to the import`);
console.log(`  ${carried} memo(s) carried forward by exactly their recorded corrections, and by no other commit`);
if (unreachable) console.log("Some files could not be compared against the source ref and were skipped.");
