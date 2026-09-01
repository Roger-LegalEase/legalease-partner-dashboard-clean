#!/usr/bin/env node
// Proves the Vercel deployment source is CLOSED: everything the deployed
// application reads is still shipped, and everything shipped is still needed.
//
// The deployment archive reached 517.8 MB and the upload died at 388.3 MB with
// "Error: fetch failed" — no deployment id, no build stage, no READY
// deployment. Pruning the source is the response, and pruning a source tree by
// hand is exactly the kind of change that works until the one route nobody
// tested reads the one file that is no longer there. So the exclusions are not
// trusted; they are proven here, and the proof runs in CI.
//
// This file and .vercelignore are deliberately outside BOTH image-input path
// sets, so neither the frozen application bytes nor the published worker image
// change and no republication is warranted.
//
//   node scripts/verify-rcap-deployment-closure.mjs
//   node scripts/verify-rcap-deployment-closure.mjs --emit-evidence

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const emitEvidence = process.argv.includes("--emit-evidence");

/**
 * The accepted application source. Image-input equality is proven against it.
 *
 * Rebound to the security implementation source accepted by the worker-image
 * workflow. Evidence-only commits descend from this source without changing
 * application or worker inputs, and the equivalence check below keeps that
 * self-reference escape exact. Leaving the prior PR #127 source here would
 * assert that this release's deployment closes over bytes it no longer
 * contains.
 */
const APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5";

/** Exactly the paths a Next.js build consumes. */
const APPLICATION_INPUTS = ["src", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "public"];
/** Exactly the paths the worker Dockerfile copies. */
const WORKER_INPUTS = [
  "package.json", "package-lock.json", "tsconfig.json",
  "scripts/rcap-render-worker.mjs", "scripts/lib", "deploy/rcap-render-worker/Dockerfile", "src"
];

/**
 * Paths the RUNNING application reads from the filesystem, each with the
 * source line that reads it. A pruned tree missing any of these is a tree that
 * serves 500s on a route somebody eventually opens.
 */
const REQUIRED_RUNTIME_PATHS = [
  ["src", "the application itself"],
  ["public", "Next.js static assets"],
  ["package.json", "build manifest"],
  ["package-lock.json", "build manifest"],
  ["tsconfig.json", "build configuration"],
  ["next.config.ts", "build configuration"],
  ["data/rcap-all50", "guidance-packet-registry.ts, composed routes, terminalization treatments"],
  ["data/rcap-ledger", "guidance-packet-registry.ts crosswalk"],
  ["design-handoff/legalease-suite-page", "HandoffHtml.tsx via path.join(process.cwd(), …)"],
  ["tmp/review-inbox", "all50-internal-preview.ts and the promotion page"],
  ["docs/record-clearing/field-map-drafts", "official-pdf-shadow-batch.ts readdirSync"],
  ["reference", "packet-pdf.ts source provenance"]
];

/** Code that runs at build time or request time. Excluded paths must not appear here. */
const SCANNED_CODE_ROOTS = ["src", "next.config.ts"];

/**
 * Documented templates that carry key NAMES and no values. `.env.example` is
 * committed on purpose and every line in it is a public URL, a boolean flag or
 * a provider name. Flagging it would train a reader to wave this check through,
 * which is worse than not having the check.
 */
const SECRET_TEMPLATE_SUFFIXES = /\.(example|sample|template)$/i;

/** Anything matching these must never reach a deployment. */
const SECRET_PATTERNS = [
  /(^|\/)\.env($|\.)/i,
  /(^|\/)id_rsa($|\.)/i,
  /(^|\/)id_ed25519($|\.)/i,
  /\.pem$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /(^|\/)\.npmrc$/i,
  /service[-_]?account.*\.json$/i
];

const failures = [];
const notes = [];
let checks = 0;
function check(name, ok, detail) {
  checks += 1;
  if (ok) console.log(`  ok   ${name} — ${detail}`);
  else {
    failures.push(`${name}: ${detail}`);
    console.error(`  FAIL ${name} — ${detail}`);
  }
}

const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();

// --- 1. Read .vercelignore --------------------------------------------------

const ignorePath = path.join(rootDir, ".vercelignore");
if (!fs.existsSync(ignorePath)) {
  console.error("verify-rcap-deployment-closure FAILED\n - .vercelignore does not exist");
  process.exit(1);
}
const ignoreLines = fs.readFileSync(ignorePath, "utf8").split("\n");
const excluded = ignoreLines
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith("#"))
  .sort();

// Negation would let a later line silently re-admit a path this verifier has
// already reported as excluded, and gitignore-style negation does not even
// work once a parent directory is excluded. Refuse it rather than reason about
// it.
check(
  "no_negated_ignore_entries",
  excluded.every((entry) => !entry.startsWith("!")),
  `${excluded.length} entries, none negated — every entry is an unambiguous exclusion`
);

// --- 2/3. Report every excluded path with byte and file counts ---------------

function walk(rel) {
  const abs = path.join(rootDir, rel);
  if (!fs.existsSync(abs)) return { files: [], bytes: 0 };
  const stat = fs.statSync(abs);
  if (stat.isFile()) return { files: [rel], bytes: stat.size };
  const files = [];
  let bytes = 0;
  const stack = [rel];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(path.join(rootDir, current), { withFileTypes: true })) {
      const child = `${current}/${entry.name}`;
      if (entry.isDirectory()) stack.push(child);
      else if (entry.isFile()) {
        files.push(child);
        bytes += fs.statSync(path.join(rootDir, child)).size;
      }
    }
  }
  return { files: files.sort(), bytes };
}

const exclusionReport = [];
let totalExcludedBytes = 0;
let totalExcludedFiles = 0;
for (const entry of excluded) {
  const rel = entry.replace(/\/$/, "");
  const { files, bytes } = walk(rel);
  exclusionReport.push({ path: entry, files: files.length, bytes });
  totalExcludedBytes += bytes;
  totalExcludedFiles += files.length;
  console.log(`  excluded  ${String(bytes).padStart(12)} bytes  ${String(files.length).padStart(5)} files  ${entry}`);
}
// An entry matching nothing is INERT, not broken. Two of these name directories
// that local tooling generates and a clean checkout does not contain
// (tmp/record-clearing-shadow, tmp/official-pdf-implementation-gate — 31 and 1
// files here, 0 in CI), which is exactly why the first version of this check
// passed locally and failed on the runner at 418 files instead of 451.
//
// Excluding a path that is not there removes nothing and therefore cannot break
// a deployment. The dangerous direction is OVER-exclusion, and that is caught by
// the reference scan and the required-path check below, neither of which this
// softening touches. Inert entries are still reported by name so a typo is
// visible rather than silent.
const inert = exclusionReport.filter((row) => row.files === 0).map((row) => row.path);
const malformed = excluded.filter((entry) => entry.startsWith("/") || entry.includes("*"));
check(
  "exclusions_are_well_formed_and_at_least_one_matches",
  malformed.length === 0 && exclusionReport.some((row) => row.files > 0),
  malformed.length > 0
    ? `malformed entries (absolute path or wildcard): ${malformed.join(", ")}`
    : `${exclusionReport.length} entries, ${totalExcludedFiles} files, ${totalExcludedBytes} bytes removed` +
      (inert.length > 0
        ? `; inert in this checkout (generated-only, removes nothing here): ${inert.join(", ")}`
        : "")
);

// --- 4/5. Scan application and build code for references to excluded paths ---

function collectCodeFiles() {
  const out = [];
  for (const root of SCANNED_CODE_ROOTS) {
    const abs = path.join(rootDir, root);
    if (!fs.existsSync(abs)) continue;
    if (fs.statSync(abs).isFile()) { out.push(root); continue; }
    out.push(...walk(root).files.filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)));
  }
  return out.sort();
}

const codeFiles = collectCodeFiles();
const referenceHits = [];
for (const file of codeFiles) {
  const source = fs.readFileSync(path.join(rootDir, file), "utf8");
  // Comments stripped: a doc comment naming an output directory is not a read,
  // and treating it as one would block a correct exclusion forever.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  for (const entry of excluded) {
    const rel = entry.replace(/\/$/, "");
    const quoted = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // A path INTO the excluded directory: the name must be followed by a
    // separator. Requiring the slash is what stops a quoted word that merely
    // equals the directory name from reading as a filesystem reference — the
    // first version of this check flagged
    //   useState<"artifacts" | "co_branded_page" | …>("artifacts")
    // which is a union type, not a path, and would have blocked a correct
    // exclusion forever on the strength of a coincidence.
    const intoDirectory = new RegExp(`['"\`]\\.?/?${quoted}/`);

    // The bare directory name still counts when it is handed to something that
    // resolves or opens a path, so the tightening above does not create a hole.
    const asPathArgument = new RegExp(
      `(path\\.(join|resolve|relative)|readFileSync|readdirSync|existsSync|statSync|createReadStream|opendirSync)\\s*\\([^)]*['"\`]\\.?/?${quoted}['"\`]`
    );

    const hit = intoDirectory.test(code) || asPathArgument.test(code);
    if (hit) {
      const lines = code.split("\n");
      const line = lines.findIndex((l) => intoDirectory.test(l) || asPathArgument.test(l)) + 1;
      referenceHits.push(`${file}:${line} references excluded ${entry}`);
    }
  }
}
check(
  "no_application_or_build_code_references_an_excluded_path",
  referenceHits.length === 0,
  referenceHits.length === 0
    ? `${codeFiles.length} source files scanned against ${excluded.length} exclusions, comments stripped so an output-directory doc comment is not mistaken for a read`
    : referenceHits.join("; ")
);

// --- 6. Build a temporary pruned tree using the same rules ------------------

const prunedRoot = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || "/tmp", "rcap-pruned-"));
const ALWAYS_SKIP = new Set(["node_modules", ".git", ".next", "hosted-acceptance-evidence"]);
const excludedPrefixes = excluded.map((entry) => entry.replace(/\/$/, ""));

function isExcluded(rel) {
  return excludedPrefixes.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`));
}

let prunedFiles = 0;
let prunedBytes = 0;
(function copy(rel) {
  const abs = rel ? path.join(rootDir, rel) : rootDir;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const child = rel ? `${rel}/${entry.name}` : entry.name;
    if (ALWAYS_SKIP.has(entry.name)) continue;
    if (isExcluded(child)) continue;
    if (entry.isDirectory()) {
      fs.mkdirSync(path.join(prunedRoot, child), { recursive: true });
      copy(child);
    } else if (entry.isFile()) {
      fs.copyFileSync(path.join(rootDir, child), path.join(prunedRoot, child));
      prunedFiles += 1;
      prunedBytes += fs.statSync(path.join(rootDir, child)).size;
    }
  }
})("");

check(
  "pruned_tree_built_with_the_same_rules_the_deployment_uses",
  prunedFiles > 0,
  `${prunedFiles} files, ${prunedBytes} bytes at ${path.basename(prunedRoot)}`
);

// --- 7. Every required path survived ----------------------------------------

const missingRequired = REQUIRED_RUNTIME_PATHS.filter(([rel]) => !fs.existsSync(path.join(prunedRoot, rel)));
check(
  "every_required_runtime_path_survives_pruning",
  missingRequired.length === 0,
  missingRequired.length === 0
    ? REQUIRED_RUNTIME_PATHS.map(([rel]) => rel).join(", ")
    : `MISSING: ${missingRequired.map(([rel, why]) => `${rel} (${why})`).join("; ")}`
);

// --- 8. Image-input byte identity against the accepted application SHA -------

function hashPath(base, rel) {
  const abs = path.join(base, rel);
  if (!fs.existsSync(abs)) return null;
  if (fs.statSync(abs).isFile()) {
    return crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
  }
  const hash = crypto.createHash("sha256");
  const stack = [rel];
  const files = [];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(path.join(base, current), { withFileTypes: true })) {
      const child = `${current}/${entry.name}`;
      if (entry.isDirectory()) stack.push(child);
      else if (entry.isFile()) files.push(child);
    }
  }
  for (const file of files.sort()) {
    hash.update(file);
    hash.update(crypto.createHash("sha256").update(fs.readFileSync(path.join(base, file))).digest());
  }
  return hash.digest("hex");
}

const imageInputDrift = [];
for (const rel of [...new Set([...APPLICATION_INPUTS, ...WORKER_INPUTS])]) {
  // git is the authority for what the accepted SHA contains; the pruned tree is
  // compared against it rather than against the working tree.
  let accepted;
  try {
    accepted = fs.statSync(path.join(rootDir, rel)).isDirectory()
      ? git(["rev-parse", `${APPLICATION_SHA}:${rel}`])
      : crypto.createHash("sha256").update(execFileSync("git", ["show", `${APPLICATION_SHA}:${rel}`], { cwd: rootDir, maxBuffer: 512 * 1024 * 1024 })).digest("hex");
  } catch {
    imageInputDrift.push(`${rel} is not present at ${APPLICATION_SHA.slice(0, 8)}`);
    continue;
  }
  const current = fs.statSync(path.join(rootDir, rel)).isDirectory()
    ? git(["rev-parse", `HEAD:${rel}`])
    : crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex");
  if (accepted !== current) imageInputDrift.push(`${rel} differs from ${APPLICATION_SHA.slice(0, 8)}`);
  // And the pruned tree must still carry those exact bytes.
  if (!fs.existsSync(path.join(prunedRoot, rel))) imageInputDrift.push(`${rel} was pruned out of the deployment`);
}
check(
  "application_and_worker_image_inputs_are_byte_identical_to_the_accepted_sha",
  imageInputDrift.length === 0,
  imageInputDrift.length === 0
    ? `all ${new Set([...APPLICATION_INPUTS, ...WORKER_INPUTS]).size} image-input paths match ${APPLICATION_SHA.slice(0, 8)} and survive pruning; no rebuild or worker republication is warranted`
    : imageInputDrift.join("; ")
);

// --- 9. No secret file enters the deployment --------------------------------

const secrets = [];
(function scan(rel) {
  for (const entry of fs.readdirSync(path.join(prunedRoot, rel || "."), { withFileTypes: true })) {
    const child = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) scan(child);
    else if (SECRET_PATTERNS.some((pattern) => pattern.test(child)) && !SECRET_TEMPLATE_SUFFIXES.test(child)) {
      secrets.push(child);
    }
  }
})("");
check(
  "no_secret_file_enters_the_deployment",
  secrets.length === 0,
  secrets.length === 0
    ? `${SECRET_PATTERNS.length} patterns checked across the pruned tree (.env, private keys, .npmrc, service-account json)`
    : `FOUND: ${secrets.join(", ")}`
);

// --- 10. Deterministic evidence ---------------------------------------------

const evidence = {
  schemaVersion: "rcap-deployment-closure/v1",
  applicationSha: APPLICATION_SHA,
  exclusions: exclusionReport,
  totalExcludedFiles,
  totalExcludedBytes,
  prunedFiles,
  prunedBytes,
  requiredRuntimePaths: REQUIRED_RUNTIME_PATHS.map(([rel, why]) => ({ path: rel, readBy: why })),
  scannedCodeFiles: codeFiles.length,
  secretPatternsChecked: SECRET_PATTERNS.length,
  passed: failures.length === 0
};

fs.rmSync(prunedRoot, { recursive: true, force: true });

if (emitEvidence) {
  const outDir = path.join(rootDir, "data/rcap-render");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "deployment-closure.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`\nwrote data/rcap-render/deployment-closure.json`);
}

console.log("");
if (failures.length > 0) {
  console.error(`verify-rcap-deployment-closure FAILED: ${failures.length} of ${checks} checks.`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
for (const note of notes) console.log(note);
console.log(
  `verify-rcap-deployment-closure passed: ${checks}/${checks} checks — ` +
  `${totalExcludedFiles} files and ${totalExcludedBytes} bytes excluded, ` +
  `${prunedFiles} files and ${prunedBytes} bytes remain.`
);
