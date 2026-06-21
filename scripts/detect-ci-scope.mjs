import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootDir = findGitRoot(process.cwd()) || scriptRootDir;

const rcapPrefixes = [
  ".github/workflows/rcap-all50-handoff.yml",
  "data/rcap-all50/",
  "data/record-clearing/",
  "docs/RCAP_",
  "docs/PHASE_18_RCAP_WILMA_INTAKE.md",
  "docs/LegalEase-Master-Build-Plan-v2.md/",
  "docs/rcap/",
  "docs/rcap-promotion/",
  "docs/record-clearing/",
  "docs/state-packs/",
  "private/Nationwide Record Clearing/",
  "scripts/build-all50-",
  "scripts/generate-all50-",
  "scripts/ingest-nationwide-all50.mjs",
  "scripts/inspect-local-record-clearing-pdfs.mjs",
  "scripts/rcap-",
  "scripts/rescue-encrypted-rcap-pdfs.mjs",
  "scripts/retry-all50-field-maps.mjs",
  "scripts/test-inspect-local-record-clearing-pdfs.mjs",
  "scripts/test-nebraska-record-clearing-shadow.mjs",
  "scripts/verify-all50-",
  "scripts/verify-all51-",
  "scripts/verify-encrypted-pdf-rescue.mjs",
  "scripts/verify-nebraska-record-clearing-shadow.mjs",
  "scripts/verify-official-pdf-",
  "scripts/verify-pleading-state.mjs",
  "scripts/verify-rcap-",
  "scripts/verify-state-promotion",
  "src/app/api/rcap/",
  "src/app/internal/record-clearing/",
  "src/components/rcap/",
  "src/lib/rcap/",
  "src/lib/rcap-intake/",
  "src/lib/record-clearing/",
  "supabase/phase-18-rcap-wilma-intake.sql",
  "supabase/phase-22-enable-rls-rcap-user-profiles.sql",
  "tmp/review-inbox/all50/"
];

const rcapPatterns = [
  /^scripts\/verify-[a-z-]+-state-pack\.mjs$/,
  /^scripts\/verify-[a-z-]+-pleading-state\.mjs$/,
  /^scripts\/verify-[a-z-]+-document-generator\.mjs$/,
  /^docs\/RCAP_[^/]+\.md$/,
  /^docs\/.*RCAP.*\.md$/,
  /^docs\/sql\/.*rcap.*\.sql$/,
  /^supabase\/.*rcap.*\.sql$/
];

const expungementAiPrefixes = [
  ".github/workflows/expungement-ai-consumer-adapter.yml",
  "design-handoff/expungement-ai-frontend/",
  "public/expungement-ai/",
  "src/app/expungement-ai/",
  "src/app/briefcase/",
  "src/app/api/expungement-ai/",
  "src/components/expungement-ai/",
  "src/lib/expungement-ai/",
  "supabase/phase-26-consumer-briefcase-items.sql",
  "supabase/phase-27-consumer-checkout-metadata.sql",
  "supabase/phase-28-consumer-packet-generation-status.sql",
  "supabase/phase-29-consumer-wilma-telemetry.sql",
  "supabase/phase-31-legalease-os-support-queue.sql",
  "supabase/phase-32-expungement-screening-sessions.sql"
];

const expungementAiPatterns = [
  /^docs\/EXPUNGEMENT_AI_[^/]+\.md$/,
  /^scripts\/verify-expungement-[^/]+\.mjs$/,
  /^scripts\/verify-wilma-safety-harness\.mjs$/
];

const legaleasePrefixes = [
  "design-handoff/legalease-suite-page/",
  "src/app/legalease/",
  "src/app/api/legalease/",
  "src/lib/legalease/",
  "public/legalease/",
  "docs/LEGALEASE_UMBRELLA_SITE.md",
  "docs/sql/phase-32-legalease-umbrella-correspondence.sql",
  "scripts/verify-legalease-umbrella-site.mjs"
];

export function classifyFiles(files) {
  const normalizedFiles = [...new Set(files.map(normalizeFile).filter(Boolean))].sort();
  const groups = {
    rcap: [],
    expungementAi: [],
    legalease: [],
    other: []
  };

  for (const file of normalizedFiles) {
    const matched = {
      rcap: isRcapFile(file),
      expungementAi: isExpungementAiFile(file),
      legalease: isLegalEaseFile(file)
    };

    if (matched.rcap) groups.rcap.push(file);
    if (matched.expungementAi) groups.expungementAi.push(file);
    if (matched.legalease) groups.legalease.push(file);
    if (!matched.rcap && !matched.expungementAi && !matched.legalease) groups.other.push(file);
  }

  return {
    changedFiles: normalizedFiles,
    rcapAffected: groups.rcap.length > 0,
    expungementAiAffected: groups.expungementAi.length > 0,
    legaleaseAffected: groups.legalease.length > 0,
    otherAffected: groups.other.length > 0,
    groups
  };
}

export function changedFilesAgainstBase(options = {}) {
  const baseRef = options.baseRef || resolveBaseRef();
  if (!baseRef) throw new Error(`Could not resolve base ref for CI scope detection from ${rootDir}.`);

  ensureRefAvailable(baseRef);

  const mergeBase = gitOneLine(["merge-base", "HEAD", baseRef]);
  if (!mergeBase) throw new Error(`Could not compute merge base between HEAD and ${baseRef}.`);

  return git(["diff", "--name-only", mergeBase, "HEAD"]);
}

export function isRcapFile(file) {
  return matchesAny(file, rcapPrefixes, rcapPatterns);
}

export function isExpungementAiFile(file) {
  return matchesAny(file, expungementAiPrefixes, expungementAiPatterns);
}

export function isLegalEaseFile(file) {
  return matchesAny(file, legaleasePrefixes, []);
}

function main() {
  const args = new Set(process.argv.slice(2));
  const jsonOnly = args.has("--json");
  const githubOutput = args.has("--github-output");
  const debug = args.has("--debug");
  const baseArg = process.argv.find((arg) => arg.startsWith("--base="));
  const baseRef = baseArg ? baseArg.slice("--base=".length) : undefined;
  if (debug) printBaseDebug();
  const changedFiles = changedFilesWithBranchBackup({ baseRef });
  const scope = classifyFiles(changedFiles);

  if (githubOutput) writeGithubOutput(scope);

  if (jsonOnly) {
    console.log(JSON.stringify(scope, null, 2));
    return;
  }

  console.log("CI scope detection complete.");
  console.log(`Changed files: ${scope.changedFiles.length}`);
  console.log(`rcapAffected=${scope.rcapAffected}`);
  console.log(`expungementAiAffected=${scope.expungementAiAffected}`);
  console.log(`legaleaseAffected=${scope.legaleaseAffected}`);
  console.log(`otherAffected=${scope.otherAffected}`);
  printGroup("RCAP files", scope.groups.rcap);
  printGroup("Expungement.ai files", scope.groups.expungementAi);
  printGroup("LegalEase files", scope.groups.legalease);
  printGroup("Other files", scope.groups.other);
}

function changedFilesWithBranchBackup({ baseRef } = {}) {
  try {
    return changedFilesAgainstBase({ baseRef });
  } catch (error) {
    const branch = currentBranchName();
    if (isProductBranchPrefix(branch)) {
      console.log(`CI scope detector could not compare against the base ref; using branch-prefix backup for ${branch}.`);
      return [];
    }
    throw error;
  }
}

function writeGithubOutput(scope) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;

  const lines = [
    `rcapAffected=${scope.rcapAffected}`,
    `expungementAiAffected=${scope.expungementAiAffected}`,
    `legaleaseAffected=${scope.legaleaseAffected}`,
    `otherAffected=${scope.otherAffected}`,
    `changedFileCount=${scope.changedFiles.length}`
  ];
  fs.appendFileSync(outputPath, `${lines.join("\n")}\n`);
}

function printGroup(label, files) {
  if (files.length === 0) return;
  console.log(`${label}:`);
  for (const file of files) console.log(`- ${file}`);
}

function matchesAny(file, prefixes, patterns) {
  return prefixes.some((prefix) => file === prefix || file.startsWith(prefix)) || patterns.some((pattern) => pattern.test(file));
}

function normalizeFile(file) {
  return file.trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function currentBranchName() {
  return process.env.GITHUB_HEAD_REF || gitOneLine(["branch", "--show-current"]) || "";
}

function isProductBranchPrefix(branch) {
  return [
    "feat/expungement-ai-",
    "fix/expungement-ai-",
    "docs/expungement-ai-",
    "ci/expungement-ai-",
    "feat/legalease-",
    "fix/legalease-",
    "docs/legalease-",
    "ci/legalease-"
  ].some((prefix) => branch.startsWith(prefix));
}

function findGitRoot(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function resolveBaseRef() {
  const candidates = [
    process.env.CI_BASE_REF,
    process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null,
    "origin/main",
    "main"
  ].filter(Boolean);

  for (const ref of candidates) {
    if (gitOneLine(["rev-parse", "--verify", ref])) return ref;
  }
  return null;
}

function printBaseDebug() {
  console.error(`rootDir=${rootDir}`);
  for (const ref of [
    process.env.CI_BASE_REF,
    process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null,
    "origin/main",
    "main"
  ].filter(Boolean)) {
    const result = spawnSync("git", ["rev-parse", "--verify", ref], { cwd: rootDir, encoding: "utf8" });
    console.error(`${ref}: status=${result.status} stdout=${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr)} error=${result.error?.message || ""}`);
  }
}

function ensureRefAvailable(ref) {
  if (gitOneLine(["rev-parse", "--verify", ref])) return;
  if (!ref.startsWith("origin/")) return;
  const branch = ref.slice("origin/".length);
  spawnSync("git", ["fetch", "--no-tags", "origin", branch], { cwd: rootDir, encoding: "utf8" });
}

function git(args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.error?.message || `git ${args.join(" ")} failed`);
  }
  return (result.stdout || "").split(/\r?\n/).filter(Boolean);
}

function gitOneLine(args) {
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  if (result.status !== 0) return null;
  return result.stdout.trim() || null;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main();
}
