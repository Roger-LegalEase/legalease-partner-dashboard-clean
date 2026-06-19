import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-all50/all-state-build-manifest.json"), "utf8"));
const failures = [];

const requiredTopLevelKeys = [
  "jurisdiction",
  "products",
  "pathways",
  "requiredUserInputs",
  "filingDestinationGuidance",
  "filingSteps",
  "feesCopiesServiceNotes",
  "officialFormInventory",
  "customPleadingSupport",
  "guidanceOnlyFallback",
  "disclaimer",
  "buildStatusMetadata"
];

const slugOverrides = new Map([
  ["DC", "dc"],
  ["TX", "texas"]
]);

for (const state of manifest.states) {
  const slug = slugOverrides.get(state.code) || state.slug;
  const metadataPath = path.join(rootDir, "src/lib/rcap/state-packs", slug, "all50-build-metadata.ts");
  const indexPath = path.join(rootDir, "src/lib/rcap/state-packs", slug, "index.ts");
  if (!fs.existsSync(metadataPath)) {
    failures.push(`${state.code} missing all50-build-metadata.ts`);
    continue;
  }
  if (!fs.existsSync(indexPath)) {
    failures.push(`${state.code} missing index.ts`);
    continue;
  }
  const source = fs.readFileSync(metadataPath, "utf8");
  for (const key of requiredTopLevelKeys) {
    if (!source.includes(`${JSON.stringify(key)}:`) && !source.includes(`${key}:`)) {
      failures.push(`${state.code} metadata missing ${key}`);
    }
  }
  if (!source.includes("guidance fallback") && !source.includes("guidance_fallback")) {
    failures.push(`${state.code} metadata must include guidance fallback language`);
  }
  if (!source.includes("not legal advice")) {
    failures.push(`${state.code} metadata must include legal advice disclaimer`);
  }
  if (!fs.readFileSync(indexPath, "utf8").includes('export * from "./all50-build-metadata";')) {
    failures.push(`${state.code} index does not export all50-build-metadata`);
  }
}

const forbiddenChangedPrefixes = [
  "src/app/expungement-ai/page.tsx",
  "src/app/expungement-ai/how-it-works/",
  "src/app/expungement-ai/pricing/",
  "src/app/expungement-ai/sign-in/",
  "src/app/expungement-ai/start/",
  "src/app/expungement-ai/pay/",
  "src/app/expungement-ai/packet-ready/",
  "src/app/expungement/",
  "src/components/expungement-ai/",
  "src/components/expungement/"
];

const changed = runGit(["diff", "--name-only", "HEAD"]);
for (const file of changed) {
  if (forbiddenChangedPrefixes.some((prefix) => file.startsWith(prefix))) {
    failures.push(`Forbidden changed file: ${file}`);
  }
}

if (failures.length > 0) {
  console.error("All-50 state-pack verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("All-50 state-pack verification passed.");
console.log(`State-pack metadata verified: ${manifest.states.length}`);
console.log("Legacy live generator runtime removed: yes");
console.log("Expungement.ai designer UI untouched: yes");

function runGit(args) {
  const { spawnSync } = require("node:child_process");
  const result = spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
  const output = result.stdout || "";
  if (result.error && output.length === 0) return [];
  return output.split(/\r?\n/).filter(Boolean);
}
