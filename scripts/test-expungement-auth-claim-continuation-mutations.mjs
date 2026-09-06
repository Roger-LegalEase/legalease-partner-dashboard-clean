#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const root = process.cwd();
const files = [
  "src/lib/expungement-ai/auth-continuation.ts",
  "src/lib/expungement-ai/claim/claim-service.ts",
  "src/components/expungement-ai/ConsumerSignInForm.tsx"
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
    "visible recovery locale is ignored",
    files[2],
    "    if (continuation.locale) setLocale(continuation.locale);",
    "    // mutation: visible recovery state ignores the validated locale",
    "post-reset recovery must apply the validated locale to the visible handoff state"
  );
  mutation(
    "bare sign-in defaults to account creation",
    files[0],
    '  if (!requestedNext) return "signin";',
    '  if (!requestedNext) return "create";',
    "the bare sign-in route must remain in sign-in mode"
  );
  mutation(
    "server attribution is dropped",
    files[1],
    "      eventId: row.event_id,",
    "      eventId: null,",
    "server claim must preserve protected pending attribution: eventId: row.event_id"
  );
  mutation(
    "Strict Mode guard is removed",
    files[0],
    "  const existing = automaticRecoveryClaims.get(claimToken);",
    "  const existing = undefined; // mutation: automatic retry can run more than once",
    "Strict Mode replay must not submit another claim"
  );
  mutation(
    "retry flag survives cleanup",
    files[0],
    '    mode: "signin"\n  })}`;',
    '    mode: "signin", claimRetry: "1"\n  })}`;',
    "the retry flag must be consumed before the request starts"
  );
  mutation(
    "malformed retry is accepted",
    files[0],
    '    && continuation.claimToken) return "retry";',
    ') return "retry";',
    "malformed recovery handoffs must fail closed"
  );
  mutation(
    "recovery renders the password form",
    files[2],
    '  if (claimRecoveryState !== "none") {',
    '  if (claimRecoveryState === "none") {',
    "post-reset recovery must render before and instead of a second password form"
  );
} finally {
  restore();
  disposeRestore();
}

if (failures > 0) {
  console.error(`Auth continuation mutation suite failed: ${failures} mutation(s) escaped or failed incorrectly.`);
  process.exit(1);
}
console.log("Auth continuation mutation suite passed: 10/10 defects turned the behavioral verifier red.");
