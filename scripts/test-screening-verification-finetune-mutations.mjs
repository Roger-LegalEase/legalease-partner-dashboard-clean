#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const verifier = path.join(root, "scripts/verify-screening-verification-finetune.mjs");
const render = path.join(root, "src/lib/expungement-ai/consumer-render-request.ts");
const queue = path.join(root, "src/lib/rcap/render/job-queue.ts");
const generation = path.join(root, "src/lib/expungement-ai/packet-generation.ts");
const sponsoredRoute = path.join(root, "src/app/api/expungement-ai/packet/generate/route.ts");

registerTrackedMutation("test-screening-verification-finetune-mutations.mjs", [
  "src/lib/expungement-ai/consumer-render-request.ts",
  "src/lib/rcap/render/job-queue.ts",
  "src/lib/expungement-ai/packet-generation.ts",
  "src/app/api/expungement-ai/packet/generate/route.ts"
]);

const mutations = [
  ["render packet identity drops verification versioning", render, (source) => source.replace(
    '`${CONSUMER_PACKET_NAMESPACE}:${item.id}:${verification.hash}:${payloadVersionHash}`',
    '`${CONSUMER_PACKET_NAMESPACE}:${item.id}:${payloadVersionHash}`'
  )],
  ["render packet identity omits source-version authority", render, (source) => source.replace(
    "      sourceSha256: built.spec.sourceSha256,\n",
    ""
  )],
  ["render packet identity omits an immutable row field", render, (source) => source.replace(
    '    relief_outcome: "not_recorded",\n',
    ""
  )],
  ["render enqueue drops protected verification CAS", queue, (source) => source.replace(
    "    p_expected_verification_hash: identity.expectedVerificationHash,\n",
    ""
  )],
  ["render enqueue reuses a hash that omits exact payload bytes", render, (source) => source.replace(
    "  const verifiedSpec = { ...versioned.spec, inputHash };",
    "  const verifiedSpec = versioned.spec;"
  )],
  ["consumer render bypasses the atomic payload boundary", render, (source) => source.replaceAll(
    "enqueueVerifiedConsumerRender",
    "enqueueRenderJob"
  )],
  ["sponsored artifact attaches before credit finalization", generation, (source) => source.replace(
    "    if (partnerSponsored) {",
    "    if (false) {"
  )],
  ["sponsored slot refusal is ignored", sponsoredRoute, (source) => source.replace(
    "      if (!finalization.ok) {",
    "      if (false) {"
  )]
];

const originals = new Map(mutations.map(([, file]) => [file, fs.readFileSync(file, "utf8")]));
function restore() {
  for (const [file, source] of originals) fs.writeFileSync(file, source);
}
registerMutationRestore(restore);

let caught = 0;
const survived = [];
try {
  for (const [name, file, mutate] of mutations) {
    const original = originals.get(file);
    const changed = mutate(original);
    if (changed === original) {
      survived.push(`${name} (mutation matched nothing)`);
      continue;
    }
    fs.writeFileSync(file, changed);
    try {
      execFileSync(process.execPath, [verifier], { cwd: root, stdio: "pipe" });
      survived.push(name);
    } catch {
      caught += 1;
      console.log(`  caught   ${name}`);
    } finally {
      fs.writeFileSync(file, original);
    }
  }
} finally {
  restore();
}

if (survived.length) {
  console.error(`test-screening-verification-finetune-mutations FAILED: ${survived.length} survived`);
  for (const name of survived) console.error(`  - ${name}`);
  process.exit(1);
}
console.log(`test-screening-verification-finetune-mutations: ${caught}/${mutations.length} mutations red; sources restored.`);
