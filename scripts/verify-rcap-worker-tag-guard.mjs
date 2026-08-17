#!/usr/bin/env node
// Proves the publication workflow cannot move a source-SHA tag by accident.
//
// Two successful publications of source 664b8ddd wrote the same source-SHA tag.
// The scheme called that tag immutable; it never was. A tag is an alias, and
// the second push moved it. These checks make the alias behave like the
// promise: publication refuses when the alias already exists, refuses when it
// cannot tell, and cannot be raced by a second run.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = ".github/workflows/publish-rcap-render-worker.yml";
const GUARD = "scripts/verify-rcap-worker-tag-integrity.mjs";

const failures = [];
let checks = 0;
function check(name, ok, detail) {
  checks += 1;
  if (ok) console.log(`  ok   ${name} — ${detail}`);
  else { failures.push(`${name}: ${detail}`); console.error(`  FAIL ${name} — ${detail}`); }
}

const source = fs.readFileSync(path.join(rootDir, WORKFLOW), "utf8");
const doc = yaml.load(source);
const steps = doc.jobs.publish.steps;
const names = steps.map((s) => s.name ?? "");
const idx = (needle) => names.findIndex((n) => n.includes(needle));

// --- serialization: a preflight cannot see a push that has not happened yet ---
check(
  "publication_is_serialized_by_source_sha",
  typeof doc.concurrency?.group === "string" && doc.concurrency.group.includes("integration_sha"),
  `concurrency group ${JSON.stringify(doc.concurrency?.group ?? null)} keys on the integration SHA, so two runs for one SHA queue instead of racing`
);
check(
  "queued_publication_is_not_cancelled",
  doc.concurrency?.["cancel-in-progress"] === false,
  "cancel-in-progress is false; a second request waits rather than killing a publication midway"
);

// --- the check must bracket the push, not merely precede a long build --------
const preBuild = idx("Refuse to overwrite an existing source-SHA tag");
const prePush = idx("Re-check the source-SHA tag at the last point before pushing");
const buildPush = idx("Build and push");
check(
  "tag_is_checked_before_the_build",
  preBuild >= 0 && preBuild < buildPush,
  `a doomed publication fails in seconds rather than after a full build (step ${preBuild} before ${buildPush})`
);
check(
  "tag_is_rechecked_at_the_last_point_before_the_push",
  prePush >= 0 && prePush === buildPush - 1,
  prePush >= 0 && prePush === buildPush - 1
    ? `re-checked immediately before the push (step ${prePush} then ${buildPush}), so the window where another run could publish is minimal`
    : `the pre-push re-check is missing or not adjacent to the push (recheck=${prePush}, push=${buildPush})`
);

// --- no second alias ---------------------------------------------------------
const tags = JSON.stringify(steps[buildPush]?.with?.tags ?? "");
check(
  "exactly_one_source_sha_tag_is_pushed",
  tags.includes("integration_sha") && !/latest/i.test(tags),
  `tags=${tags} — one source-SHA alias and no latest`
);

// --- the guard itself fails closed ------------------------------------------
function runGuard(env) {
  const result = spawnSync(process.execPath, [path.join(rootDir, GUARD), "--guard"], {
    cwd: rootDir, encoding: "utf8", timeout: 60000,
    env: { ...process.env, GHCR_TOKEN: "", GITHUB_TOKEN: "", ...env }
  });
  return { status: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

const shortSha = runGuard({ RCAP_WORKER_TAG: "664b8ddd", GHCR_TOKEN: "x" });
check(
  "a_short_sha_is_refused",
  shortSha.status !== 0 && /full 40-character/.test(shortSha.output),
  "an abbreviated SHA could let two commits share one alias, so it is refused before any lookup"
);

const noCredential = runGuard({ RCAP_WORKER_TAG: "0".repeat(40) });
check(
  "a_missing_credential_fails_closed",
  noCredential.status !== 0 && /refusing to report a tag as absent/.test(noCredential.output),
  "without a credential the guard cannot see the tag, and 'cannot see' must never read as 'free'"
);

const badRegistry = runGuard({ RCAP_WORKER_TAG: "0".repeat(40), GHCR_TOKEN: "not-a-real-token" });
check(
  "a_registry_that_refuses_us_fails_closed",
  badRegistry.status !== 0,
  "a denied or unreachable registry exits non-zero rather than proceeding to publish"
);

// --- the guard source states the alias rule rather than assuming it ----------
const guardSource = fs.readFileSync(path.join(rootDir, GUARD), "utf8");
check(
  "an_existing_latest_alias_is_refused",
  /latestDigest\)\s*fail\(/.test(guardSource) || guardSource.includes("a mutable latest tag exists"),
  "publication refuses outright when a latest alias exists"
);
check(
  "replacement_requires_a_named_authorization",
  guardSource.includes("RCAP_WORKER_TAG_REPLACEMENT_AUTHORIZATION") && guardSource.includes("`replace-${TAG}`"),
  "an existing alias can only be moved by an explicitly named replace-<sha> authorization"
);

console.log("");
if (failures.length > 0) {
  console.error(`verify-rcap-worker-tag-guard FAILED: ${failures.length} of ${checks}.`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`verify-rcap-worker-tag-guard passed: ${checks}/${checks}.`);
