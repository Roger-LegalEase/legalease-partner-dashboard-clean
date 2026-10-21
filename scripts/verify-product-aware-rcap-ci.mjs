import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { classifyFiles } from "./detect-ci-scope.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

assertScope("pure LegalEase umbrella changes skip RCAP", [
  "src/app/legalease/page.tsx",
  "src/app/api/legalease/contact/route.ts",
  "src/lib/legalease/correspondence.ts",
  "public/legalease/brand/og-card.png",
  "docs/LEGALEASE_UMBRELLA_SITE.md",
  "docs/sql/phase-32-legalease-umbrella-correspondence.sql",
  "scripts/verify-legalease-umbrella-site.mjs"
], {
  rcapAffected: false,
  expungementAiAffected: false,
  legaleaseAffected: true,
  otherAffected: false
});

assertScope("pure Expungement.ai changes skip RCAP", [
  "src/app/expungement-ai/page.tsx",
  "src/app/briefcase/[packetId]/page.tsx",
  "src/app/api/expungement-ai/support/route.ts",
  "src/components/expungement-ai/BriefcaseShell.tsx",
  "src/lib/expungement-ai/briefcase.ts",
  "docs/EXPUNGEMENT_AI_PRODUCTION_READINESS.md",
  "scripts/verify-expungement-consumer-adapter.mjs",
  "supabase/phase-26-consumer-briefcase-items.sql",
  "supabase/phase-31-legalease-os-support-queue.sql",
  "supabase/phase-32-expungement-screening-sessions.sql",
    "supabase/phase-33-expungement-screening-resume-links.sql"
], {
  rcapAffected: false,
  expungementAiAffected: true,
  legaleaseAffected: false,
  otherAffected: false
});

assertScope("pure RCAP changes run RCAP handoff", [
  ".github/workflows/rcap-all50-handoff.yml",
  "docs/RCAP_ALL50_BUILD_STATUS.md",
  "docs/rcap/RCAP_SOURCE_OF_TRUTH_v2.md",
  "private/Nationwide Record Clearing/Wisconsin/example.pdf",
  "data/rcap-all50/all-state-build-manifest.json",
  "tmp/review-inbox/all50/wisconsin/REVIEW-MANIFEST.md",
  "src/app/internal/record-clearing/handoff/page.tsx",
  "src/lib/rcap/all51-launch-selector.ts",
  "src/lib/record-clearing/packet-planner.ts",
  "scripts/verify-all50-handoff.mjs",
  "scripts/verify-wi-state-pack.mjs",
  "supabase/phase-18-rcap-wilma-intake.sql"
], {
  rcapAffected: true,
  expungementAiAffected: false,
  legaleaseAffected: false,
  otherAffected: false
});

assertScope("mixed RCAP plus unrelated product changes stay protected", [
  "src/lib/rcap/all51-launch-selector.ts",
  "src/app/api/legalease/contact/route.ts",
  "src/app/briefcase/[packetId]/page.tsx"
], {
  rcapAffected: true,
  expungementAiAffected: true,
  legaleaseAffected: true,
  otherAffected: false
});

assertScope("ordinary unrelated changes are other scope", [
  "README.md",
  "src/lib/partners/billing/invoices.ts"
], {
  rcapAffected: false,
  expungementAiAffected: false,
  legaleaseAffected: false,
  otherAffected: true
});

assertWorkflowUsesDetector();
assertRestrictedFileChecksStillExist();
assertDetectorFailsClosedOnTruncatedDiff();

if (failures.length > 0) {
  console.error("Product-aware RCAP CI verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Product-aware RCAP CI verification passed.");
console.log("Pure LegalEase umbrella changes skip RCAP handoff: yes");
console.log("Pure Expungement.ai changes skip RCAP handoff: yes");
console.log("Pure RCAP changes run RCAP handoff: yes");
console.log("Mixed RCAP plus product changes run RCAP restricted-file checks: yes");
console.log("RCAP restricted-file checks still exist: yes");
console.log("CI scope detector fails closed on a truncated diff for every product branch prefix: yes");

function assertScope(label, files, expected) {
  const scope = classifyFiles(files);
  for (const [key, value] of Object.entries(expected)) {
    if (scope[key] !== value) {
      failures.push(`${label}: expected ${key}=${value}, found ${scope[key]}.`);
    }
  }
}

function assertWorkflowUsesDetector() {
  const workflow = readText(".github/workflows/rcap-all50-handoff.yml");
  for (const marker of [
    "node scripts/detect-ci-scope.mjs --github-output",
    "RCAP not affected; skipping RCAP handoff verification.",
    "steps.scope.outputs.rcapAffected == 'true'",
    "npm run rcap:verify-all50-handoff"
  ]) {
    if (!workflow.includes(marker)) failures.push(`RCAP workflow missing product-aware marker: ${marker}`);
  }
}

function assertRestrictedFileChecksStillExist() {
  const detector = readText("scripts/detect-ci-scope.mjs");
  const scopeHelper = readText("scripts/source-engine-change-scope.mjs");
  for (const marker of [
    "changedFilesAgainstBase",
    "isProductBranchPrefix",
    "using branch-prefix backup"
  ]) {
    if (!detector.includes(marker)) failures.push(`CI scope detector missing marker: ${marker}`);
  }

  for (const marker of [
    "assertSourceEngineChangeScope",
    "productionForbiddenPrefixes",
    "legacy generators may only be removed",
    "Restricted files changed"
  ]) {
    if (!scopeHelper.includes(marker)) failures.push(`source-engine scope helper missing restricted-file marker: ${marker}`);
  }

  for (const file of [
    "scripts/verify-all50-internal-preview.mjs",
    "scripts/verify-all50-handoff.mjs"
  ]) {
    const source = readText(file);
    for (const marker of [
      "assertNoRestrictedChanges",
      "assertSourceEngineChangeScope"
    ]) {
      if (!source.includes(marker)) failures.push(`${file} missing restricted-file marker: ${marker}`);
    }
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

// A large PR diff overflowed the detector's 1 MiB git buffer, and the branch-prefix backup turned that ENOBUFS
// into an empty file list (rcapAffected=false), skipping the RCAP guards. Forces ENOBUFS on `git diff` in a
// scratch repository and requires a throw for every product prefix; the no-base backup case must still hold.
function assertDetectorFailsClosedOnTruncatedDiff() {
  const productPrefixes = ["feat/expungement-ai-", "fix/expungement-ai-", "docs/expungement-ai-", "ci/expungement-ai-",
    "feat/legalease-", "fix/legalease-", "docs/legalease-", "ci/legalease-"];
  const forceEnobufs = "data:text/javascript," + encodeURIComponent(
    'import cp from "node:child_process"; import { syncBuiltinESMExports } from "node:module"; const real = cp.spawnSync;'
    + ' cp.spawnSync = function (cmd, args = [], options = {}) { if (cmd !== "git" || args[0] !== "diff") return real.call(this, cmd, args, options);'
    + ' process.stderr.write("ci-scope-test: forced maxBuffer=1 on git diff\\n"); return real.call(this, cmd, args, { ...options, maxBuffer: 1 }); };'
    + ' syncBuiltinESMExports();');
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ci-scope-enobufs-"));
  const git = (...args) => spawnSync("git", ["-c", "user.name=ci-scope", "-c", "user.email=ci-scope@invalid", ...args], { cwd: repo, encoding: "utf8" });
  const detect = (headRef, extra = [], imports = []) => {
    const env = { ...process.env, GITHUB_HEAD_REF: headRef, CI_BASE_REF: "main" };
    delete env.GITHUB_BASE_REF;
    return spawnSync(process.execPath, [...imports, path.join(rootDir, "scripts/detect-ci-scope.mjs"), "--json", ...extra],
      { cwd: repo, env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  };
  try {
    git("init", "-q", "-b", "main");
    fs.writeFileSync(path.join(repo, "README.md"), "base\n");
    git("add", "-A"); git("commit", "-q", "-m", "base");
    git("checkout", "-q", "-b", "feature");
    fs.mkdirSync(path.join(repo, "data/rcap-all50"), { recursive: true });
    fs.writeFileSync(path.join(repo, "data/rcap-all50/probe.json"), "{}\n");
    // Over 1 MiB of path names, so a read capped at the spawnSync default cannot return the whole list.
    fs.mkdirSync(path.join(repo, "data/rcap-all50/large-diff"));
    for (let i = 0; i < 10000; i += 1) {
      fs.writeFileSync(path.join(repo, "data/rcap-all50/large-diff", `${String(i).padStart(5, "0")}-${"x".repeat(80)}.json`), "");
    }
    git("add", "-A"); git("commit", "-q", "-m", "rcap change");

    const control = detect(`${productPrefixes[0]}probe`);
    let controlScope = {};
    try { controlScope = JSON.parse(control.stdout); } catch { /* a backup notice or no output: reported below */ }
    if (controlScope.rcapAffected !== true || controlScope.changedFiles?.length !== 10001) {
      failures.push(`CI scope detector must read the whole >1 MiB diff (10001 files, rcapAffected=true); rc ${control.status}, ${controlScope.changedFiles?.length ?? 0} files: ${control.stderr.trim().slice(0, 200)}`);
    }
    for (const prefix of productPrefixes) {
      const run = detect(`${prefix}probe`, [], ["--import", forceEnobufs]);
      if (!run.stderr.includes("ci-scope-test: forced maxBuffer=1 on git diff")) failures.push(`${prefix}: the forced git diff truncation was not applied; the check proved nothing.`);
      if (run.status === 0) failures.push(`${prefix}: CI scope detector exited 0 on a truncated git diff (fail-open): ${run.stdout.trim().slice(0, 200)}`);
    }
    const noBase = detect(`${productPrefixes[4]}probe`, ["--base=no-such-ref"]);
    if (noBase.status !== 0 || !noBase.stdout.includes("using branch-prefix backup")) {
      failures.push(`CI scope detector must keep the branch-prefix backup when no base can be compared (rc ${noBase.status}).`);
    }
    const noBaseOther = detect("codex/probe", ["--base=no-such-ref"]);
    if (noBaseOther.status === 0) failures.push("CI scope detector must throw for a non-product branch with no comparable base.");
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}
