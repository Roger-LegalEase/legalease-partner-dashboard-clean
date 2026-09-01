#!/usr/bin/env node
// Re-render named official-form families, and only those.
//
//   node scripts/render-rcap-official-form-family.mjs AR:ar-acic-order-to-seal-felony-under-act-1460-source-gated-en
//   node scripts/render-rcap-official-form-family.mjs --dry-run <family> [<family> ...]
//
// A family may be named as `JURISDICTION:family-slug` or as its repository-
// relative directory under data/rcap-all50/overlays/production.
//
// WHY A WRAPPER RATHER THAN A NEW RENDERER
//
// implement-rcap-official-forms-d1 already scopes a run: RCAP_D1_ONLY names the
// families to process and everything else is left alone. What it does not do is
// refuse a name it does not recognise. A typo matches nothing, the run processes
// zero families and reports success, and the caller believes a family was
// re-rendered when nothing happened -- which is the failure that matters when
// the thing being re-rendered is an artifact somebody is waiting to unblock.
//
// So this is the bounded entry point: it resolves and validates every name
// before the renderer starts, refuses an empty, unknown or uncommitted family,
// and afterwards checks that nothing outside the allowlist was touched. The
// rendering itself is unchanged and is still D1's.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);

const PRODUCTION = "data/rcap-all50/overlays/production";
const INDEX = `${PRODUCTION}/verified-binary-index.json`;
const RENDERER = "scripts/implement-rcap-official-forms-d1.mjs";

const JURISDICTION_SLUGS = {
  WI: "wisconsin", AL: "alabama", AR: "arkansas", VA: "virginia", AK: "alaska",
  CO: "colorado", KY: "kentucky", NC: "north-carolina", ND: "north-dakota",
  NE: "nebraska", OR: "oregon", TX: "texas", WA: "washington"
};

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const requested = args.filter((a) => !a.startsWith("--"));

function fail(message, detail = null) {
  console.error(`render-rcap-official-form-family: ${message}`);
  if (detail) console.error(`  ${detail}`);
  console.error("  Nothing was rendered.");
  process.exit(1);
}

// 1. An empty allowlist is refused. Rendering "everything" is what this exists
//    to prevent, so it is never the default.
if (requested.length === 0) {
  fail("no family was named.",
    "Name one or more families as JURISDICTION:family-slug or as a directory under data/rcap-all50/overlays/production.");
}

const index = JSON.parse(fs.readFileSync(path.join(rootDir, INDEX), "utf8"));
const known = new Map();
for (const family of index.families ?? []) {
  const slug = JURISDICTION_SLUGS[family.jurisdiction];
  if (!slug) continue;
  known.set(`${family.jurisdiction}:${family.familySlug}`.toUpperCase(), {
    id: `${family.jurisdiction}:${family.familySlug}`,
    directory: `${PRODUCTION}/${slug}/${family.familySlug}`
  });
}
const byDirectory = new Map([...known.values()].map((f) => [f.directory, f]));

/** Files git tracks under one directory. */
function trackedUnder(directory) {
  const out = execFileSync("git", ["ls-files", "--", directory], { cwd: rootDir, encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

const resolved = [];
for (const raw of requested) {
  const asDirectory = raw.replace(/\/+$/, "");
  const family = known.get(raw.toUpperCase()) ?? byDirectory.get(asDirectory) ?? null;
  // 2. An unknown family is refused rather than silently matching nothing.
  if (!family) {
    fail(`unknown family: ${JSON.stringify(raw)}`,
      `It is not in ${INDEX}. Names are JURISDICTION:family-slug, e.g. ${[...known.keys()][0]}.`);
  }
  // 3. An uncommitted family is refused: re-rendering a directory git does not
  //    track produces evidence with nothing to compare it against.
  if (!fs.existsSync(path.join(rootDir, family.directory))) {
    fail(`family directory is absent: ${family.directory}`);
  }
  if (trackedUnder(family.directory).length === 0) {
    fail(`family is not committed: ${family.directory}`,
      "Re-rendering an untracked family leaves nothing to diff the result against.");
  }
  if (resolved.some((r) => r.id === family.id)) continue;
  resolved.push(family);
}

console.log(`render-rcap-official-form-family: ${resolved.length} family(ies)`);
for (const family of resolved) console.log(`  ${family.id}  ${family.directory}`);

if (DRY_RUN) {
  console.log("\n--dry-run: the allowlist resolves and every family is known and committed. Nothing was rendered.");
  process.exit(0);
}

const before = execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", PRODUCTION],
  { cwd: rootDir, encoding: "utf8" });
if (before.trim()) {
  fail("the production overlay tree is already modified.",
    "A bounded render is only bounded if what it changed can be told from what was already changed.");
}

console.log(`\nrunning ${RENDERER} scoped to ${resolved.map((f) => f.id).join(", ")}\n`);
try {
  execFileSync("node", [RENDERER], {
    cwd: rootDir, stdio: "inherit",
    env: { ...process.env, RCAP_D1_ONLY: resolved.map((f) => f.id).join(",") }
  });
} catch (error) {
  console.error(`\nrender-rcap-official-form-family: the renderer exited non-zero (${error.status}).`);
  process.exit(error.status ?? 1);
}

// 4. Boundedness is checked rather than trusted. Anything the run changed
//    outside the allowlist is reported as a failure of this entry point.
const after = execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", PRODUCTION],
  { cwd: rootDir, encoding: "utf8" }).split("\n").filter(Boolean);
const touched = after.map((line) => line.slice(3).replace(/^"|"$/g, ""));
const allowed = resolved.map((f) => f.directory);
// The renderer also maintains one shared index at the production root; that is
// its own record of what it did and is in scope for any run.
const SHARED = [`${PRODUCTION}/implementation-index.json`, `${PRODUCTION}/verified-binary-index.json`];
const strays = touched.filter((file) => !allowed.some((dir) => file.startsWith(`${dir}/`)) && !SHARED.includes(file));

console.log("");
for (const dir of allowed) {
  const changed = touched.filter((f) => f.startsWith(`${dir}/`));
  console.log(`  ${changed.length} file(s) changed under ${dir}`);
}
if (strays.length) {
  console.error(`\nrender-rcap-official-form-family: the run changed ${strays.length} file(s) outside the allowlist:`);
  for (const file of strays.slice(0, 20)) console.error(`  ${file}`);
  console.error("Review and revert before committing.");
  process.exit(1);
}
console.log(`\nBounded: every change is under the ${resolved.length} named family(ies) or the renderer's own index.`);
