// Bounded mutation review for the two repaired application assertions.
// The verifier reads changed strings in memory; application files never change.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.cwd();
const evidence = path.dirname(fileURLToPath(import.meta.url));
const verifierPath = "scripts/verify-shared-claim-boundary-app.mjs";
const handoffPath = "src/lib/expungement-ai/claim/claim-handoff.ts";
const callbackPath = "src/app/auth/set-password/page.tsx";
const subject = fs.readFileSync(path.join(root, verifierPath), "utf8");
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const originalBytes = new Map([handoffPath, callbackPath].map((file) => [file, fs.readFileSync(path.join(root, file))]));
const gate = "if ((status >= 200 && status < 300) || (status >= 400 && status < 500 && status !== 401))";
const mutations = [
  ["all-responses-strip", handoffPath, gate, "if (true)", "claim network: token retained"],
  ["never-strip", handoffPath, "      stripClaimTokenFromUrl();", "      void 0;", "claim 200: token removed"],
  ["definitive-client-errors-retained", handoffPath, gate, "if (status >= 200 && status < 300)", "claim 400: token removed"],
  ["success-retained", handoffPath, gate, "if (status >= 400 && status < 500 && status !== 401)", "claim 200: token removed"],
  ["unauthenticated-token-lost", handoffPath, " && status !== 401", "", "claim 401: token retained"],
  ["network-assumed-success", handoffPath, "let status = 0;", "let status = 200;", "claim network: token retained"],
  ["claim-parameter-not-deleted", handoffPath, "url.searchParams.delete(CLAIM_TOKEN_PARAM);", "url.searchParams.delete(\"unrelated\");", "claim 200: token removed"],
  ["callback-drops-valid-token", callbackPath, "...consumerAuthContinuationFrom(search),", "...consumerAuthContinuationFrom(search), claimToken: \"\",", "auth callback: valid token continues"],
  ["callback-skips-token-validation", callbackPath, "...consumerAuthContinuationFrom(search),", "claimToken: search.get(\"claim\"), locale: search.get(\"locale\"),", "auth callback: invalid or absent token excluded"],
  ["callback-retains-auth-fragment", callbackPath, "`${window.location.pathname}?${cleanParams.toString()}`", "`${window.location.pathname}?${cleanParams.toString()}${window.location.hash}`", "auth callback: valid token continues"],
  ["callback-retains-auth-query", callbackPath,
    "new URLSearchParams(consumerAuthContinuationQuery({\n    ...consumerAuthContinuationFrom(search),\n    nextPath: safeAppRedirectPath(nextPath)\n  }))",
    "new URLSearchParams(search)", "auth callback: valid token continues"]
];

// Relocate only the verifier's module/root references into this evidence folder.
// No import or assertion is removed. Baseline must pass after relocation.
const relocated = subject
  .replace('register("./lib/ts-esm-loader.mjs", import.meta.url);', `register(${JSON.stringify(pathToFileURL(path.join(root, "scripts/lib/ts-esm-loader.mjs")).href)}, import.meta.url);`)
  .replace('const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");', `const root = ${JSON.stringify(root)};`)
  .replace(/await import\("\.\.\/(src\/[^"\n]+)"\)/g, (_match, file) => `await import(${JSON.stringify(pathToFileURL(path.join(root, file)).href)})`);
const readAnchor = 'const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");';
assert(relocated.includes(readAnchor), "verifier read anchor exists");
const active = path.join(evidence, "active-verifier-mutant.mjs");
assert(!fs.existsSync(active), "do not overwrite retained evidence");
const results = [];
function run(name, source, expectedFailure) {
  fs.writeFileSync(active, source, { flag: "wx" });
  let execution;
  const start = performance.now();
  try {
    execution = spawnSync(process.execPath, [active], { cwd: root, encoding: "utf8", timeout: 30000 });
  } finally {
    fs.unlinkSync(active);
  }
  const output = `${execution.stdout ?? ""}${execution.stderr ?? ""}`;
  fs.writeFileSync(path.join(evidence, `${name}.log`), output);
  const failures = output.split("\n").filter((line) => line.startsWith("  FAIL "));
  assert.equal(execution.error, undefined, `${name}: process executes`);
  assert.equal(execution.status, expectedFailure ? 1 : 0, `${name}: expected verifier exit`);
  if (expectedFailure) assert(failures.some((line) => line.includes(expectedFailure)), `${name}: relevant assertion rejects mutation`);
  results.push({ name, exitCode: execution.status, elapsedSeconds: Math.round(performance.now() - start) / 1000, rejectedBy: failures, logPath: `${name}.log` });
  console.log(`${name}: ${expectedFailure ? "rejected" : "passed"}`);
}

try {
  run("baseline", relocated, null);
  for (const [name, file, before, after, expectedFailure] of mutations) {
    const original = originalBytes.get(file).toString();
    assert.equal(original.split(before).length - 1, 1, `${name}: unique mutation anchor`);
    const interceptedRead = `const read = (rel) => {
      const original = fs.readFileSync(path.join(root, rel), "utf8");
      return rel === ${JSON.stringify(file)} ? original.replace(${JSON.stringify(before)}, ${JSON.stringify(after)}) : original;
    };`;
    run(name, relocated.replace(readAnchor, interceptedRead), expectedFailure);
  }
} finally {
  for (const [file, bytes] of originalBytes) {
    assert(fs.readFileSync(path.join(root, file)).equals(bytes), `${file}: application bytes unchanged`);
  }
}

fs.writeFileSync(path.join(evidence, "mutation-results.json"), JSON.stringify({
  status: "PASS", verifierSha256: sha(subject), baselinePassed: true,
  mutationsRejected: mutations.length, sourcesUnchanged: [...originalBytes].map(([file, bytes]) => ({ path: file, sha256: sha(bytes) })),
  results, boundary: "Only verifier read results are altered in memory. No auth source, migration, database, browser installation or external service is changed."
}, null, 2) + "\n");
