// Can staging authorization be requested yet?
//
// The rule is that authorization is not asked for until every required field
// can be populated. Prose is a bad place to keep that rule: a status report
// saying "mostly ready" reads as ready, and a blank field in a markdown table
// is easy to skim past. So the thirteen fields live here as data, each either
// carrying a value or naming exactly who must supply it, and this verifier
// refuses to report readiness while any of them is unresolved.
//
// It exits 0 whether or not staging is ready — "not ready, here is why" is a
// correct and expected outcome, not a build failure. It exits NON-ZERO only
// when the record is internally dishonest: a field claiming a value it does not
// have, or a readiness claim contradicted by an unpopulated field or an open
// blocker. The failure mode being guarded against is not "staging is blocked",
// it is "staging looks unblocked when it is not".
//
// Usage: node scripts/verify-rcap-staging-authorization-readiness.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const READINESS = "data/rcap-staging-authorization-readiness.json";
const abs = path.join(rootDir, READINESS);

if (!fs.existsSync(abs)) {
  console.error(`verify-rcap-staging-authorization-readiness FAILED\n - ${READINESS} does not exist`);
  process.exit(1);
}

const record = JSON.parse(fs.readFileSync(abs, "utf8"));
const failures = [];

const REQUIRED_FIELDS = [
  "finalIntegrationSha",
  "requiredGithubChecksGreen",
  "phase49",
  "phase50",
  "phase51",
  "stagingSupabaseProject",
  "applicationDeploymentTarget",
  "workerImageSourceAndDigest",
  "workerDeploymentTarget",
  "featureFlag",
  "evidencePaths",
  "rollbackOwner",
  "observabilityDestination"
];

for (const key of REQUIRED_FIELDS) {
  const field = record.fields?.[key];
  if (!field) {
    failures.push(`required field missing from the record entirely: ${key}`);
    continue;
  }
  if (!["populated", "blank", "blocked"].includes(field.status)) {
    failures.push(`${key}: status must be populated|blank|blocked, got ${JSON.stringify(field.status)}`);
  }
  // A populated field must actually carry a value. This is the check that stops
  // a field being marked done with a promise in it.
  if (field.status === "populated" && (field.value === null || field.value === undefined || String(field.value).trim() === "")) {
    failures.push(`${key}: marked populated but carries no value`);
  }
  // A blank or blocked field must say who resolves it, or it is not actionable.
  if (field.status !== "populated" && !field.owner) {
    failures.push(`${key}: ${field.status} but names no owner to resolve it`);
  }
}

const unresolved = REQUIRED_FIELDS.filter((k) => record.fields?.[k]?.status !== "populated");
const openBlockers = (record.blockers ?? []).filter((b) => !b.resolved);

// The core invariant: readiness must agree with the fields and the blockers.
if (record.readyToRequestAuthorization === true && unresolved.length > 0) {
  failures.push(
    `readyToRequestAuthorization is true while ${unresolved.length} field(s) are unresolved: ${unresolved.join(", ")}`
  );
}
if (record.readyToRequestAuthorization === true && openBlockers.length > 0) {
  failures.push(
    `readyToRequestAuthorization is true while ${openBlockers.length} blocker(s) are open: ${openBlockers.map((b) => b.id).join(", ")}`
  );
}

if (failures.length > 0) {
  console.error("verify-rcap-staging-authorization-readiness FAILED");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

const populated = REQUIRED_FIELDS.length - unresolved.length;
console.log("verify-rcap-staging-authorization-readiness passed.");
console.log(`  fields populated: ${populated}/${REQUIRED_FIELDS.length}`);
console.log(`  ready to request staging authorization: ${record.readyToRequestAuthorization ? "YES" : "NO"}`);

if (unresolved.length > 0) {
  console.log("  unresolved fields:");
  for (const key of unresolved) {
    const f = record.fields[key];
    console.log(`    ${key.padEnd(28)} ${f.status.toUpperCase().padEnd(8)} owner: ${f.owner}`);
  }
}
if (openBlockers.length > 0) {
  console.log("  open blockers:");
  for (const b of openBlockers) console.log(`    ${b.id.padEnd(28)} [${b.severity}] ${b.summary}`);
}
