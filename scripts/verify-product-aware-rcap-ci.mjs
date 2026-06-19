import fs from "node:fs";
import path from "node:path";
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
  "supabase/phase-31-legalease-os-support-queue.sql"
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
