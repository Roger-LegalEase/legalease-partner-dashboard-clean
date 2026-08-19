#!/usr/bin/env node
// Proves each part of the source-SHA tag guard is load-bearing.
//
// The failure being prevented already happened: two publications of source
// 664b8ddd moved the same source-SHA tag, and no record noticed. Each case below
// removes one defence and requires the verifier to go red for the right reason.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const WORKFLOW = ".github/workflows/publish-rcap-render-worker.yml";
const GUARD = "scripts/verify-rcap-worker-tag-integrity.mjs";
registerTrackedMutation("test-rcap-worker-tag-guard-mutations.mjs", [WORKFLOW, GUARD]);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TRACKED = [WORKFLOW, GUARD];
const originals = new Map(TRACKED.map((r) => [r, fs.readFileSync(path.join(rootDir, r))]));
function restore() { for (const [r, b] of originals) fs.writeFileSync(path.join(rootDir, r), b); }
const disposeGuard = registerMutationRestore(restore);

const read = (r) => fs.readFileSync(path.join(rootDir, r), "utf8");
const write = (r, s) => fs.writeFileSync(path.join(rootDir, r), s);

let caught = 0, failed = 0;
function mutation(name, mutate, marker) {
  restore();
  try { mutate(); } catch (e) { console.error(`  ERROR    ${name}: ${e.message}`); failed += 1; restore(); return; }
  const run = spawnSync(process.execPath, [path.join(rootDir, "scripts/verify-rcap-worker-tag-guard.mjs")],
    { cwd: rootDir, encoding: "utf8", timeout: 120000 });
  restore();
  const out = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  if (run.status === 0) { console.error(`  SURVIVED ${name}`); failed += 1; return; }
  if (!out.includes(marker)) {
    console.error(`  WRONG    ${name}: red, but not for the expected reason\n           expected: ${marker}`);
    failed += 1; return;
  }
  caught += 1; console.log(`  caught   ${name}`);
}

// 1 — the run is no longer serialized, so two publications can race.
mutation("the concurrency group no longer keys on the source SHA", () => {
  write(WORKFLOW, read(WORKFLOW).replace(
    "group: publish-rcap-render-worker-${{ inputs.integration_sha }}",
    "group: publish-rcap-render-worker"));
}, "publication_is_serialized_by_source_sha");

// 2 — a queued publication can be killed mid-push.
mutation("cancel-in-progress is enabled", () => {
  write(WORKFLOW, read(WORKFLOW).replace("cancel-in-progress: false", "cancel-in-progress: true"));
}, "queued_publication_is_not_cancelled");

// 3 — the pre-push re-check is removed, leaving only the pre-build lookup.
mutation("the pre-push re-check is removed", () => {
  const s = read(WORKFLOW);
  const start = s.indexOf("      - name: Re-check the source-SHA tag at the last point before pushing");
  const end = s.indexOf("      - name: Build and push by source-SHA tag only");
  write(WORKFLOW, s.slice(0, start) + s.slice(end));
}, "tag_is_rechecked_at_the_last_point_before_the_push");

// 4 — the pre-build check is removed.
mutation("the pre-build tag check is removed", () => {
  const s = read(WORKFLOW);
  const start = s.indexOf("      - name: Refuse to overwrite an existing source-SHA tag");
  const end = s.indexOf("      - name: Set up Buildx");
  write(WORKFLOW, s.slice(0, start) + s.slice(end));
}, "tag_is_checked_before_the_build");

// 5 — a mutable latest alias is pushed alongside the source-SHA tag.
mutation("a latest alias is added to the push", () => {
  write(WORKFLOW, read(WORKFLOW).replace(
    "tags: ${{ env.IMAGE_REPOSITORY }}:${{ inputs.integration_sha }}",
    "tags: |\n            ${{ env.IMAGE_REPOSITORY }}:${{ inputs.integration_sha }}\n            ${{ env.IMAGE_REPOSITORY }}:latest"));
}, "exactly_one_source_sha_tag_is_pushed");

// 6 — an abbreviated SHA is accepted, letting two commits share one alias.
mutation("the guard accepts a short SHA", () => {
  write(GUARD, read(GUARD).replace("if (!/^[0-9a-f]{40}$/.test(TAG))", "if (false && !/^[0-9a-f]{40}$/.test(TAG))"));
}, "a_short_sha_is_refused");

// 7 — a missing credential is treated as "the tag is free".
mutation("a missing credential is treated as the tag being free", () => {
  write(GUARD, read(GUARD).replace(
    'if (!TOKEN) fail("no GHCR credential in GHCR_TOKEN or GITHUB_TOKEN; refusing to report a tag as absent without being able to look");',
    'if (!TOKEN) { console.log("no credential; assuming free"); process.exit(0); }'));
}, "a_missing_credential_fails_closed");

// 8 — an existing alias can be moved without a named authorization.
//
// This must remove the defence, not rename it: excise the authorization gate so
// an existing tag falls straight through to the push, and rename every mention
// of the variable so no leftover string can keep the verifier green. An earlier
// version of this case used String.replace with a string pattern, which rewrote
// only the first of several occurrences and left the verifier's substring test
// satisfied — the mutation survived because it never actually weakened anything.
mutation("replacement no longer requires a named authorization", () => {
  const s = read(GUARD);
  const gateStart = s.indexOf("    if (REPLACEMENT_AUTHORIZATION !== `replace-${TAG}`) {");
  const gateEnd = s.indexOf("    console.log(`  authorized replacement of");
  if (gateStart < 0 || gateEnd <= gateStart) {
    throw new Error("could not locate the replacement-authorization gate to remove");
  }
  const withoutGate = s.slice(0, gateStart) + s.slice(gateEnd);
  write(GUARD, withoutGate.replaceAll("RCAP_WORKER_TAG_REPLACEMENT_AUTHORIZATION", "RCAP_UNUSED_ENV_NAME"));
}, "replacement_requires_a_named_authorization");

// 9 — a registry that refuses us is read as "the tag is absent".
//
// This is the failure the whole guard exists to prevent: "I could not see the
// tag" silently becoming "the tag is free", which would let a publication move
// an alias it never looked at. Both the token exchange and the manifest lookup
// have to be neutered, because either one alone still exits non-zero.
mutation("a registry lookup failure is treated as the tag being absent", () => {
  const s = read(GUARD);
  const tokenStart = s.indexOf("  if (!res.ok || !body?.token) {");
  const tokenEnd = s.indexOf("  return body.token;");
  if (tokenStart < 0 || tokenEnd <= tokenStart) throw new Error("could not locate the token-exchange failure path");
  const withoutTokenFail = s.slice(0, tokenStart) + s.slice(tokenEnd);
  const mutated = withoutTokenFail.replace(
    "  if (!res.ok) fail(`registry lookup for ${reference} returned ${res.status}; failing closed rather than guessing`);",
    "  if (!res.ok) return null;");
  if (mutated === withoutTokenFail) throw new Error("could not locate the manifest lookup failure path");
  write(GUARD, mutated);
}, "a_registry_that_refuses_us_fails_closed");

restore();
disposeGuard();
for (const [r, b] of originals) {
  if (!fs.readFileSync(path.join(rootDir, r)).equals(b)) { console.error(`  DIRTY    ${r}`); failed += 1; }
}
console.log("");
if (failed > 0) { console.error(`test-rcap-worker-tag-guard-mutations FAILED: ${failed} did not hold.`); process.exit(1); }
console.log(`test-rcap-worker-tag-guard-mutations passed: ${caught}/${caught} mutations red, files restored.`);
