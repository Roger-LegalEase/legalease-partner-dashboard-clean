#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const root = process.cwd();
const files = [
  "src/lib/expungement-ai/auth-continuation.ts",
  "src/lib/expungement-ai/claim/claim-service.ts"
];
const originals = new Map(files.map((file) => [file, fs.readFileSync(path.join(root, file))]));
const restore = () => {
  for (const [file, bytes] of originals) fs.writeFileSync(path.join(root, file), bytes);
};

registerTrackedMutation("test-expungement-auth-claim-continuation-mutations.mjs", files);
const disposeRestore = registerMutationRestore(restore);
let failures = 0;

function mutation(name, file, before, after, expected) {
  restore();
  const absolute = path.join(root, file);
  const source = fs.readFileSync(absolute, "utf8");
  if (!source.includes(before)) {
    console.error(`  ERROR ${name}: mutation marker not found`);
    failures += 1;
    return;
  }
  fs.writeFileSync(absolute, source.replace(before, after));
  const child = spawnSync(process.execPath, ["scripts/verify-expungement-auth-claim-continuation.mjs"], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 10 * 1024 * 1024
  });
  const output = `${child.stdout ?? ""}${child.stderr ?? ""}`;
  if (child.status === 0 || !output.includes(expected)) {
    console.error(`  FAIL ${name}: ${child.status === 0 ? "mutation survived" : "wrong failure"}`);
    if (child.status !== 0) console.error(output);
    failures += 1;
  } else {
    console.log(`  caught ${name}`);
  }
}

try {
  mutation(
    "Forgot Password drops the claim",
    files[0],
    "    params.set(CLAIM_TOKEN_PARAM, continuation.claimToken);",
    "    // mutation: claim omitted",
    "Forgot Password must preserve the claim"
  );
  mutation(
    "callback alters the claim",
    files[0],
    "    params.set(CLAIM_TOKEN_PARAM, continuation.claimToken);",
    "    params.set(CLAIM_TOKEN_PARAM, `${continuation.claimToken}A`);",
    "Forgot Password must preserve the claim"
  );
  mutation(
    "locale is dropped",
    files[0],
    '    params.set("locale", continuation.locale);',
    "    // mutation: locale omitted",
    "Forgot Password must preserve locale"
  );
  mutation(
    "server attribution is dropped",
    files[1],
    "      eventId: row.event_id,",
    "      eventId: null,",
    "server claim must preserve protected pending attribution: eventId: row.event_id"
  );
} finally {
  restore();
  disposeRestore();
}

if (failures > 0) {
  console.error(`Auth continuation mutation suite failed: ${failures} mutation(s) escaped or failed incorrectly.`);
  process.exit(1);
}
console.log("Auth continuation mutation suite passed: 4/4 defects turned the behavioral verifier red.");
