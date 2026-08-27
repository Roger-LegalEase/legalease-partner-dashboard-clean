import fs from "node:fs";
import path from "node:path";

// Phase 48 artifact identity.
//
// A packet is not one PDF. An ordinary expungement filing is a petition, a
// proposed order, a certificate of service and - conditionally - a fee-waiver
// application: separately rendered, separately filed, separately downloadable
// documents, several of which are legitimately `court`.
//
// This verifier exists because the original migration keyed uniqueness on
// (document_packet_id, kind), which capped a packet at one court artifact and
// would have silently forced distinct components to overwrite one another.
// Identity is the component; `kind` is coarse metadata and carries no
// uniqueness.
//
// Static assertion over the migration text only. Phase 48 is held and unapplied,
// so nothing here executes SQL.

const root = process.cwd();
const migrationPath = "supabase/phase-48-rcap-document-artifact-storage.sql";
const source = fs.readFileSync(path.join(root, migrationPath), "utf8");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function includes(marker, label = marker) {
  assert(source.includes(marker), `Missing ${label}`);
}

// component_id exists and is required.
includes("component_id text not null", "required component_id column");

// New identity: packet plus component.
includes(
  "constraint rcap_document_artifacts_packet_component_unique",
  "packet-plus-component uniqueness constraint"
);
includes("unique (document_packet_id, component_id)", "packet-plus-component uniqueness columns");

// Old identity must be gone, both as a constraint name and as a column pair.
assert(
  !source.includes("rcap_document_artifacts_packet_kind_unique"),
  "Old packet-plus-kind uniqueness constraint name must not remain."
);
assert(
  !/unique\s*\(\s*document_packet_id\s*,\s*kind\s*\)/i.test(source),
  "Uniqueness on (document_packet_id, kind) must not remain: it caps a packet at one court artifact."
);

// kind must not be reintroduced as part of artifact identity.
assert(
  !/unique\s*\([^)]*\bkind\b[^)]*\)/i.test(source),
  "kind must not appear in any uniqueness rule: it is coarse metadata, not artifact identity."
);

// A commented-on object must still exist, or the migration fails at run time.
assert(
  !/comment on constraint rcap_document_artifacts_packet_kind_unique/i.test(source),
  "Migration comments on a constraint it no longer creates."
);

// Several same-kind artifacts must be able to coexist in one packet.
includes("check (kind in ('court', 'full'))", "coarse kind vocabulary");

// Structural guarantees the correction must not have disturbed.
includes("begin;", "transaction start");
includes("commit;", "transaction commit");
includes("create table if not exists public.rcap_document_artifacts", "idempotent artifact table creation");
includes("alter table public.rcap_document_artifacts enable row level security", "RLS enablement");
includes("to service_role", "service-role-only policy");

// No invented compatibility value may be smuggled in as a component default.
assert(
  !/component_id[^,;]*\bdefault\b/i.test(source),
  "component_id must not carry an invented compatibility default."
);

// The artifact table must not grant browser roles a policy.
assert(
  !/create policy[\s\S]*\bto\s+(anon|authenticated)\b/i.test(source),
  "Migration must not grant anon or authenticated a policy on artifacts."
);

if (failures.length) {
  console.error("RCAP document-artifact identity verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RCAP document-artifact identity verifier passed.");
console.log(
  "Phase 48 keys artifacts on (document_packet_id, component_id). kind is coarse, non-unique metadata, so several court artifacts may coexist in one packet."
);
