#!/usr/bin/env node
/**
 * Every file the worker Dockerfile COPYs must survive the build context.
 *
 * WHAT WENT WRONG WITHOUT THIS
 *
 * The render worker's build context is an allowlist: `Dockerfile.dockerignore`
 * excludes `*` and re-includes exactly the runtime closure, so a new file under
 * `data/` cannot drift into the image. That is a good design and it has one
 * failure mode -- the Dockerfile and the allowlist are two lists that must
 * agree, and nothing made them.
 *
 * Commit b26a2bf45 added three COPY instructions for the Mississippi successor
 * decision, its review evidence and its three approved PDFs, and did not extend
 * the allowlist. The result was a Dockerfile that cannot build at all:
 *
 *   ERROR: failed to compute cache key: failed to calculate checksum of ref ...
 *   "/data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-es.pdf": not found
 *
 * It sat undetected because no publication reached the build step in between --
 * the one attempt failed earlier, at the integration-history gate. The defect
 * was only discovered by publishing the approved release candidate, which is
 * the worst possible moment to discover it.
 *
 * WHAT THIS CHECKS
 *
 * Three lists, and whether they agree:
 *
 *   1. every COPY source in the Dockerfile is INCLUDED by the allowlist, so the
 *      build context actually carries it;
 *   2. every COPY source exists on disk, so the allowlist is not permitting a
 *      path nothing provides;
 *   3. every runtime file the manifest says the worker reads is COPYed, so the
 *      image cannot be missing something the worker opens at render time.
 *
 * The first is the one that breaks the build. The third is the one that breaks
 * a participant's packet quietly, which is worse.
 *
 *   node scripts/test-worker-image-copy-context-agreement.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCKERFILE = "deploy/rcap-render-worker/Dockerfile";
const DOCKERIGNORE = "deploy/rcap-render-worker/Dockerfile.dockerignore";
const MANIFEST = "deploy/rcap-render-worker/runtime-data-manifest.json";

const read = (rel) => fs.readFileSync(path.join(rootDir, rel), "utf8");

const failures = [];
let ran = 0;
const check = (passed, message, detail) => {
  ran += 1;
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) {
    if (detail) for (const line of detail) console.log(`       ${line}`);
    failures.push(message);
  }
};

/**
 * The COPY sources, read out of the Dockerfile.
 *
 * Line continuations are joined first, `--from=` stages are skipped (those copy
 * from an earlier build stage, not from the context), and the final argument of
 * each instruction is the destination rather than a source.
 */
function dockerfileCopySources(dockerfile) {
  const joined = dockerfile.replace(/\\\r?\n\s*/g, " ");
  const sources = [];
  for (const line of joined.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!/^COPY\s/i.test(trimmed)) continue;
    const args = trimmed.slice(5).trim().split(/\s+/);
    // A COPY from a previous stage does not read the build context at all.
    if (args.some((arg) => arg.startsWith("--from="))) continue;
    const positional = args.filter((arg) => !arg.startsWith("--"));
    // The last positional argument is the destination.
    for (const source of positional.slice(0, -1)) sources.push(source);
  }
  return sources;
}

/**
 * Whether the allowlist includes a path, by the same last-match-wins rule
 * BuildKit applies.
 *
 * Deliberately a re-implementation rather than a call into Docker: the point is
 * to answer the question in CI without a daemon, and the patterns this file
 * uses are the simple prefix and `**` forms. A pattern shape it cannot model is
 * reported rather than silently treated as a match -- a checker that guesses
 * would be worse than none here.
 */
function includedByAllowlist(rules, filePath) {
  let included = true;
  for (const { negated, pattern } of rules) {
    if (!matches(pattern, filePath)) continue;
    included = negated;
  }
  return included;
}

function matches(pattern, filePath) {
  if (pattern === "*") return true;
  if (pattern === filePath) return true;
  // A directory pattern covers everything beneath it.
  if (filePath.startsWith(`${pattern}/`)) return true;
  if (pattern.includes("*")) {
    const expression = new RegExp(`^${pattern
      .split("**").map((part) => part.split("*")
        .map((piece) => piece.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*"))
      .join(".*")}$`);
    if (expression.test(filePath)) return true;
    // A `**` pattern naming a directory also covers its contents.
    if (pattern.endsWith("/**") && filePath.startsWith(`${pattern.slice(0, -3)}/`)) return true;
  }
  return false;
}

function allowlistRules(dockerignore) {
  return dockerignore.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.startsWith("!")
      ? { negated: true, pattern: line.slice(1).replace(/\/$/, "") }
      : { negated: false, pattern: line.replace(/\/$/, "") });
}

const rules = allowlistRules(read(DOCKERIGNORE));
const sources = [...new Set(dockerfileCopySources(read(DOCKERFILE)))];

check(sources.length > 0, `the Dockerfile's COPY sources were parsed (${sources.length})`);

// ---------------------------------------------- 1. the context carries them

/**
 * Whether the context carries this COPY source.
 *
 * A FILE source is carried when the allowlist includes that exact path. A
 * DIRECTORY source is carried when the allowlist includes at least one file
 * beneath it -- `!data/rcap-all50/composed-routes/**\/route.json` never matches
 * the directory itself, and copying that directory is nonetheless correct and
 * works, because the context holds the route.json files it re-included.
 *
 * Asking the stricter question would have failed a directory the real build
 * copies happily, which is how a checker earns a reputation for crying wolf and
 * then gets ignored on the day it is right.
 */
function contextCarries(source) {
  const clean = source.replace(/\/$/, "");
  const onDisk = path.join(rootDir, clean);
  const isDirectory = fs.existsSync(onDisk) && fs.statSync(onDisk).isDirectory();
  if (!isDirectory) return includedByAllowlist(rules, clean);
  for (const filePath of walk(onDisk)) {
    if (includedByAllowlist(rules, path.relative(rootDir, filePath))) return true;
  }
  return false;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const excluded = sources.filter((source) => !contextCarries(source));
check(excluded.length === 0,
  "every Dockerfile COPY source is included by the build-context allowlist",
  excluded.map((source) => `excluded by Dockerfile.dockerignore, so the build fails on it: ${source}`));

// --------------------------------------------- 2. and something provides them

const absent = sources.filter((source) => !fs.existsSync(path.join(rootDir, source.replace(/\/$/, ""))));
check(absent.length === 0,
  "every Dockerfile COPY source exists in the repository",
  absent.map((source) => `the Dockerfile copies a path nothing provides: ${source}`));

// ------------------------------- 3. and the worker's runtime reads are COPYed

/*
 * The manifest is the instrumented record of what the worker actually opens.
 * A file it names that the image does not carry is a render that fails, or
 * worse, a loader that returns null and quietly withdraws an owner's approval
 * rather than crashing.
 */
const manifest = JSON.parse(read(MANIFEST));
const copiedPrefixes = sources.map((source) => source.replace(/\/$/, ""));
const isCopied = (filePath) => copiedPrefixes.some((prefix) =>
  prefix === filePath || filePath.startsWith(`${prefix}/`));

const uncopied = (manifest.files ?? []).map((entry) => entry.path).filter((filePath) => !isCopied(filePath));
check(uncopied.length === 0,
  `every runtime file the manifest names is COPYed into the image (${(manifest.files ?? []).length} files)`,
  uncopied.slice(0, 20).map((filePath) => `the worker reads it, the image does not carry it: ${filePath}`));

console.log(`\n${failures.length === 0
  ? `PASS — ${ran} controls; the Dockerfile, the context allowlist and the runtime manifest agree`
  : `FAIL — ${failures.length} of ${ran} controls`}`);
process.exit(failures.length === 0 ? 0 : 1);
