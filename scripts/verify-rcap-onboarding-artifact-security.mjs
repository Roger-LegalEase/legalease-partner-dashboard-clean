import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PARTNER_ONBOARDING_FILES,
  REVIEWED_EXPUNGEMENT_SCOPE_ALLOWED_FILES
} from "./rcap-scope-allowlist.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const MIGRATION = "supabase/phase-45-rcap-onboarding-artifacts.sql";
const migration = read(MIGRATION);

const ARTIFACT_TABLES = [
  "partner_onboarding_artifacts",
  "partner_onboarding_artifact_versions",
  "partner_onboarding_artifact_reviews"
];

const SERVICE_FUNCTIONS = [
  "rcap_service_ensure_onboarding_artifacts",
  "rcap_service_generate_onboarding_artifact_version",
  "rcap_service_review_onboarding_artifact",
  "rcap_service_invalidate_onboarding_artifact_version",
  "rcap_service_supersede_onboarding_artifact_version"
];

const NEW_FILES = [
  "src/lib/partners/onboarding/artifact-domain.ts",
  "src/lib/partners/onboarding/artifact-generator.ts",
  "src/lib/partners/onboarding/artifact-service.ts",
  "src/lib/partners/onboarding/artifact-pdf.ts",
  "src/components/partners/onboarding/ArtifactDocumentView.tsx",
  "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/artifacts/route.ts",
  "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/artifacts/download/route.ts",
  "src/app/api/partners/onboarding/artifacts/route.ts",
  "src/app/api/partners/onboarding/artifacts/download/route.ts",
  "src/app/internal/partners/onboarding/[partnerSlug]/Phase2AArtifactsPanel.tsx",
  "src/app/partner/onboarding/artifacts/page.tsx",
  "src/app/partner/onboarding/artifacts/PartnerArtifactsClient.tsx"
];

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

// --- migration safety -------------------------------------------------------

check("the migration is additive with no destructive operation", () => {
  const forbidden = [
    /\bdrop\s+table\b/i,
    /\btruncate\b/i,
    /\bdelete\s+from\b/i,
    /\bdrop\s+schema\b/i,
    /\bdrop\s+database\b/i,
    /\bdrop\s+column\b/i
  ];
  for (const pattern of forbidden) {
    assert.ok(
      !pattern.test(migration),
      `phase-45 must not contain ${pattern}`
    );
  }
  // Widening an existing check constraint is the reviewed additive pattern.
  assert.ok(migration.includes("drop constraint if exists"));
});

check("Lane B2's launch tables are not created here", () => {
  assert.ok(!/create table[^;]*launch_check/i.test(migration));
  assert.ok(!/create table[^;]*launch_approval/i.test(migration));
});

check("row level security is enabled on every new table", () => {
  for (const table of ARTIFACT_TABLES) {
    assert.ok(
      migration.includes(`alter table public.${table} enable row level security`),
      `${table} must enable RLS`
    );
  }
});

check("partner reads are tenant scoped by session identity", () => {
  // Tenant scoping must come from current_partner_slug(), never from a
  // browser-supplied partner identifier.
  const partnerPolicies = migration.match(/create policy [a-z_]+_select_partner[\s\S]*?;/g) ?? [];
  assert.equal(partnerPolicies.length, 3, "each table needs a partner select policy");
  for (const policy of partnerPolicies) {
    assert.ok(
      policy.includes("public.current_partner_slug()"),
      "partner policies must scope on current_partner_slug()"
    );
    assert.ok(policy.includes("to authenticated"), "anonymous access must be denied");
  }
});

check("internal policies use the existing internal-admin boundary", () => {
  for (const table of ARTIFACT_TABLES) {
    assert.ok(
      migration.includes(`create policy ${table}_all_internal`),
      `${table} must have an internal policy`
    );
  }
  const internalCount = (migration.match(/public\.is_internal_admin\(\)/g) ?? []).length;
  assert.ok(internalCount >= 6, "internal policies must use is_internal_admin()");
});

check("browser roles lose table privileges and regain only bounded columns", () => {
  for (const table of ARTIFACT_TABLES) {
    assert.ok(
      migration.includes(`revoke all on table public.${table}\n  from public, anon, authenticated`),
      `${table} must revoke blanket privileges`
    );
  }
  assert.ok(
    !/grant\s+all\s+on\s+public\.partner_onboarding_artifact/i.test(migration),
    "no blanket grant to a browser role"
  );
  assert.ok(
    !/grant[^;]*to\s+anon/i.test(migration),
    "anon must receive no grant"
  );
  // The snapshot, provenance, and drift bookkeeping stay server-side.
  // [^)] so the match cannot span an earlier grant or an intervening comment.
  const versionGrant = migration.match(
    /grant select \(([^)]*)\) on public\.partner_onboarding_artifact_versions to authenticated;/
  )?.[1];
  assert.ok(versionGrant, "the version grant must enumerate its columns");
  for (const withheld of [
    "normalized_snapshot",
    "snapshot_hash",
    "source_section_revisions",
    "generated_by",
    "request_id"
  ]) {
    assert.ok(
      !versionGrant.includes(withheld),
      `${withheld} must not be granted to the browser`
    );
  }
});

check("internal review comments are never exposed to a partner", () => {
  const reviewPolicy = migration.match(
    /create policy partner_onboarding_artifact_reviews_select_partner[\s\S]*?;/
  )?.[0];
  assert.ok(reviewPolicy);
  assert.ok(
    reviewPolicy.includes("reviewer_type = 'partner'"),
    "a partner may read only its own review decisions"
  );
});

check("mutation functions are service-role only", () => {
  for (const fn of SERVICE_FUNCTIONS) {
    assert.ok(migration.includes(`create or replace function public.${fn}`), `${fn} missing`);
    assert.ok(
      migration.includes(`revoke execute on function public.${fn}(`),
      `${fn} must be revoked from browser roles`
    );
    assert.ok(
      new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to service_role`).test(
        migration
      ),
      `${fn} must be granted only to service_role`
    );
    assert.ok(
      !new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to (anon|authenticated|public)`).test(
        migration
      ),
      `${fn} must not be granted to a browser role`
    );
  }
  const invokerCount = (migration.match(/security invoker/g) ?? []).length;
  assert.equal(invokerCount, SERVICE_FUNCTIONS.length, "every RPC is SECURITY INVOKER");
  const searchPathCount = (migration.match(/set search_path = ''/g) ?? []).length;
  assert.ok(searchPathCount >= SERVICE_FUNCTIONS.length, "every RPC fixes an empty search_path");
});

check("invalidation is conditional so concurrent readers cannot double-write", () => {
  const fn = migration.match(
    /create or replace function public\.rcap_service_invalidate_onboarding_artifact_version[\s\S]*?\$\$;/
  )?.[0];
  assert.ok(fn);
  assert.ok(
    fn.includes("v.source_drift_invalidated_at is null"),
    "the update must be guarded on the not-yet-invalidated state"
  );
  assert.ok(
    fn.includes("v.snapshot_hash <> p_current_snapshot_hash"),
    "the update must require an actual snapshot difference"
  );
  // Database-level backstop for exactly one activity event.
  assert.ok(
    migration.includes(
      "create unique index partner_onboarding_activity_artifact_event_unique"
    ),
    "a unique partial index must make a duplicate event impossible"
  );
});

check("a stale or failed version cannot be approved", () => {
  const fn = migration.match(
    /create or replace function public\.rcap_service_review_onboarding_artifact[\s\S]*?\$\$;/
  )?.[0];
  assert.ok(fn);
  assert.ok(fn.includes("artifact_version_stale"));
  assert.ok(fn.includes("artifact_generation_failed"));
  assert.ok(
    fn.includes("p_reviewer_type = 'legalease'"),
    "reviewer authority must be branched explicitly"
  );
});

check("a failed generation can never present as approvable", () => {
  assert.ok(
    migration.includes(
      "(generation_status = 'failed') = (approval_status = 'generation_failed')"
    ),
    "a database constraint must tie the failure states together"
  );
});

// --- application safety -----------------------------------------------------

check("the launch-prep flag is server-only and never public", () => {
  const feature = read("src/lib/partners/onboarding/feature.ts");
  assert.ok(feature.startsWith('import "server-only";'));
  assert.ok(feature.includes("RCAP_ONBOARDING_LAUNCH_PREP_ENABLED"));
  assert.ok(
    !feature.includes("NEXT_PUBLIC_RCAP_ONBOARDING_LAUNCH_PREP"),
    "the browser must not be able to read or set the flag"
  );
  const env = read(".env.example");
  assert.ok(
    /^RCAP_ONBOARDING_LAUNCH_PREP_ENABLED=$/m.test(env),
    ".env.example must declare the variable with no value"
  );
});

check("no artifact route offers a generic patch entry point", () => {
  for (const file of NEW_FILES.filter((entry) => entry.includes("/api/"))) {
    const source = read(file);
    assert.ok(!/export async function PATCH/.test(source), `${file} must not expose PATCH`);
    assert.ok(!/export async function PUT/.test(source), `${file} must not expose PUT`);
    assert.ok(!/export async function DELETE/.test(source), `${file} must not expose DELETE`);
  }
});

check("mutating routes enforce same-origin and a request id", () => {
  for (const file of [
    "src/app/api/internal/partners/onboarding/phase1/[partnerSlug]/artifacts/route.ts",
    "src/app/api/partners/onboarding/artifacts/route.ts"
  ]) {
    const source = read(file);
    assert.ok(source.includes("assertSameOrigin(request)"), `${file} must check origin`);
    assert.ok(source.includes("requireRequestId("), `${file} must require a request id`);
    assert.ok(source.includes("readBoundedJson("), `${file} must bound the request body`);
  }
});

check("downloads are private, bounded, and never a public URL", () => {
  for (const file of NEW_FILES.filter((entry) => entry.includes("download"))) {
    const source = read(file);
    assert.ok(source.includes('"content-type": "application/pdf"'));
    assert.ok(source.includes("attachment; filename="));
    assert.ok(source.includes('"cache-control": "private, no-store, max-age=0"'));
    assert.ok(source.includes('"x-content-type-options": "nosniff"'));
    assert.ok(
      !source.includes("createSignedUrl") && !source.includes("getPublicUrl"),
      `${file} must not mint a shareable URL`
    );
  }
});

check("the partner download derives identity from the session, not the URL", () => {
  const source = read("src/app/api/partners/onboarding/artifacts/download/route.ts");
  assert.ok(source.includes("requirePartnerOnboardingContext()"));
  assert.ok(
    !source.includes("searchParams.get(\"partnerSlug\")"),
    "the browser must not choose the partner"
  );
});

check("only an approved version can be downloaded", () => {
  const service = read("src/lib/partners/onboarding/artifact-service.ts");
  assert.ok(service.includes('version.approval_status !== "approved"'));
  assert.ok(service.includes("Only an approved version can be downloaded."));
});

check("the partner read path cannot persist an invalidation", () => {
  const service = read("src/lib/partners/onboarding/artifact-service.ts");
  assert.ok(
    service.includes("persistInvalidation: false"),
    "the partner board must not write"
  );
  assert.ok(
    service.includes("options.persistInvalidation &&"),
    "persistence must be explicitly gated"
  );
  // An unchanged read must issue no statement at all.
  assert.ok(service.includes("!current.source_drift_invalidated_at &&"));
  assert.ok(service.includes('current.approval_status === "approved"'));
});

check("filenames are safe and carry the version and date", () => {
  const service = read("src/lib/partners/onboarding/artifact-service.ts");
  const fn = service.match(/export function approvedSnapshotFilename[\s\S]*?\n}/)?.[0];
  assert.ok(fn);
  assert.ok(fn.includes("replace(/_/g, \"-\")"));
  assert.ok(fn.includes("v${snapshot.versionNumber}"));
  assert.ok(fn.includes('/^\\d{4}-\\d{2}-\\d{2}$/'), "the date must be validated");
});

check("no external provider or AI call is introduced", () => {
  for (const file of NEW_FILES) {
    const source = read(file);
    for (const forbidden of ["openai", "anthropic", "fetch(\"http", "axios"]) {
      assert.ok(
        !source.toLowerCase().includes(forbidden),
        `${file} must not call an external provider (${forbidden})`
      );
    }
  }
});

check("no publication, invitation, or activation capability is added", () => {
  const combined = NEW_FILES.map(read).join("\n") + migration;
  for (const forbidden of [
    "partner_invitations",
    "sendInvitation",
    "publishPartnerPage",
    "activateProgram",
    "access_code"
  ]) {
    assert.ok(
      !combined.includes(forbidden),
      `this lane must not touch ${forbidden}`
    );
  }
});

check("Lane A's first-admin surface is untouched", () => {
  const combined = NEW_FILES.map(read).join("\n");
  for (const forbidden of [
    "partner_users",
    "auth.admin",
    "createUser",
    "/partner/team",
    "provisioning"
  ]) {
    assert.ok(
      !combined.includes(forbidden),
      `this lane must not reference ${forbidden}`
    );
  }
});

// --- allowlists -------------------------------------------------------------

check("the migration and every new file are allowlisted by explicit path", () => {
  assert.ok(
    PARTNER_ONBOARDING_FILES.includes(MIGRATION),
    "phase-45 must be declared in the RCAP scope allowlist"
  );
  for (const file of NEW_FILES) {
    assert.equal(
      PARTNER_ONBOARDING_FILES.filter((entry) => entry === file).length,
      1,
      `${file} must be allowlisted exactly once`
    );
  }
  assert.ok(REVIEWED_EXPUNGEMENT_SCOPE_ALLOWED_FILES.includes(MIGRATION));
  const finalApproval = read("scripts/verify-all51-final-approval.mjs");
  assert.ok(
    finalApproval.includes(`"${MIGRATION}"`),
    "phase-45 must be declared in the final-approval allowlist"
  );
});

/**
 * A wildcard or directory entry would silently admit future files that nobody
 * reviewed, which is exactly what these allowlists exist to prevent.
 */
check("allowlists remain free of wildcards and directory permissions", () => {
  for (const entry of REVIEWED_EXPUNGEMENT_SCOPE_ALLOWED_FILES) {
    assert.ok(!entry.includes("*"), `wildcard allowance is prohibited: ${entry}`);
    assert.ok(!entry.endsWith("/"), `directory allowance is prohibited: ${entry}`);
    assert.ok(!entry.includes("**"), `recursive allowance is prohibited: ${entry}`);
  }
  const finalApproval = read("scripts/verify-all51-final-approval.mjs");
  assert.ok(
    !/"supabase\/\*/.test(finalApproval),
    "the final-approval allowlist must not admit the whole supabase prefix"
  );
});

check("every new file is committed to the repository", () => {
  for (const file of [MIGRATION, ...NEW_FILES]) {
    assert.ok(
      fs.existsSync(path.join(rootDir, file)),
      `${file} must exist`
    );
  }
});

console.log(
  `\nRCAP onboarding artifact security: ${passed}/${passed} checks passed.`
);
