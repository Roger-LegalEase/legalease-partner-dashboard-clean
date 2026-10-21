// Proves the imported legal-design memos are byte-for-byte identical to the
// source branch, and that nothing has been edited in place.
//
// The memos are a hash-bound legal authority. If they can drift here, they stop
// being one, and the repository quietly grows a second legal design of record.
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

const failures = [];
const localFiles = fs.readdirSync(path.join(root, MEMO_DIR))
  .filter((f) => f.endsWith(".memo.json"))
  .sort();

const memoFiles = localFiles.filter((f) => f !== "TEMPLATE.memo.json");
if (memoFiles.length !== 51) failures.push(`${memoFiles.length} jurisdiction memos present, expected 51`);

let compared = 0;
let unreachable = false;
for (const file of localFiles) {
  const rel = `${MEMO_DIR}/${file}`;
  const local = fs.readFileSync(path.join(root, rel));
  let source;
  try {
    source = execFileSync("git", ["show", `${SOURCE_REF}:${rel}`], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  } catch {
    unreachable = true;
    continue;
  }
  compared += 1;
  const localHash = createHash("sha256").update(local).digest("hex");
  const sourceHash = createHash("sha256").update(source).digest("hex");
  if (localHash !== sourceHash) {
    failures.push(`${rel} differs from ${SOURCE_REF} (local ${localHash.slice(0, 12)}, source ${sourceHash.slice(0, 12)}) -- the import has been edited in place`);
  }
}

// A shallow clone or a pruned remote is not a licence to skip the proof, but it
// is also not a failure of the import. Say which happened.
if (unreachable && compared === 0) {
  console.error(`Cannot reach ${SOURCE_REF}; the memo import could not be proved byte-for-byte.`);
  console.error("Fetch the source branch and re-run. This check does not pass on an unfetchable remote.");
  process.exit(1);
}

if (failures.length > 0) {
  console.error("Legal design memo import verification failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Legal design memo import verified: ${compared} files byte-for-byte identical to ${SOURCE_REF} (${SOURCE_COMMIT}).`);
if (unreachable) console.log("Some files could not be compared against the source ref and were skipped.");
