import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(
  root,
  "supabase/migrations/20260728213131_remote_schema.sql",
);
const reconciliationPath = path.join(
  root,
  "docs/rcap/production/MIGRATION_20260728213131_RECONCILIATION.md",
);
const schemaDiffPath = path.join(
  root,
  "docs/rcap/production/MIGRATION_20260728213131_SCHEMA_DIFF.tsv",
);

const expectedMigrationBytes = 177_074;
const expectedMigrationSha256 =
  "3d8695920577a2982ce4748839d091e987fa43baac917c97e2a79ba6a55f2452";
const expectedSchemaDiffSha256 =
  "7fd2cabff4d757d00e8dd767ba96a5936fcbbc66810e9ecb24eba99a48105e7a";

const [migration, reconciliation, schemaDiff] = await Promise.all([
  readFile(migrationPath),
  readFile(reconciliationPath, "utf8"),
  readFile(schemaDiffPath, "utf8"),
]);

assert.equal(migration.byteLength, expectedMigrationBytes, "candidate byte length changed");
assert.equal(
  createHash("sha256").update(migration).digest("hex"),
  expectedMigrationSha256,
  "candidate payload changed",
);

for (const requiredText of [
  "RECOVERED MIGRATION VALIDATED LOCALLY",
  "20260728213131",
  "883",
  "177,074",
  expectedMigrationSha256,
  "2026-08-16T22:17:34Z",
  "Original Git provenance remains unavailable",
]) {
  assert.ok(
    reconciliation.includes(requiredText),
    `reconciliation is missing: ${requiredText}`,
  );
}

assert.equal(
  createHash("sha256").update(schemaDiff).digest("hex"),
  expectedSchemaDiffSha256,
  "schema comparison artifact changed",
);

const diffRows = schemaDiff.trimEnd().split("\n").slice(1);
assert.equal(diffRows.length, 1_310, "schema comparison row count changed");
assert.equal(
  diffRows.filter((row) => row.startsWith("changed_common\t")).length,
  90,
  "changed-common definition count changed",
);
assert.equal(
  diffRows.filter((row) => row.startsWith("repository_only\t")).length,
  1_220,
  "repository-only definition count changed",
);
assert.equal(
  diffRows.filter((row) => row.startsWith("production_only\t")).length,
  0,
  "unexpected Production-only definitions recorded",
);

console.log("PASS recovered migration payload and reconciliation evidence");
