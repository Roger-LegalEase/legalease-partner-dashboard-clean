import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditExactEmail,
  legacyAllowlistAudit,
  parseArgs,
  relevantMetadata
} from "./security/audit-internal-admin-access.mjs";
import {
  buildRemediationPlan,
  parseRemediationArgs
} from "./security/remediate-internal-admin-accounts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const corporateUuid = "30000000-0000-4000-8000-000000000001";
const personalUuid = "30000000-0000-4000-8000-000000000002";

assert.deepEqual(parseArgs(["--email", "ADMIN@EXAMPLE.TEST", "--json", "--redact"]), {
  email: "admin@example.test",
  json: true,
  redact: true,
  help: false
});
assert.throws(() => parseArgs([]), /one exact email/u);
assert.throws(() => parseArgs(["--email", "not-an-email"]), /one exact email/u);
assert.throws(() => parseArgs(["--email", "admin@example.test", "--apply"]), /Unknown option/u);

assert.deepEqual(
  relevantMetadata({ role: "internal_admin", favorite_color: "blue", permissions: ["content.read"] }),
  { role: "internal_admin", permissions: ["content.read"] }
);
assert.equal(
  legacyAllowlistAudit("admin@example.test", { INTERNAL_ADMIN_EMAILS: "other@example.test,ADMIN@EXAMPLE.TEST" })
    .find((entry) => entry.name === "INTERNAL_ADMIN_EMAILS")?.exactMatch,
  true
);

const audit = await auditExactEmail({
  email: "admin@example.test",
  client: syntheticReadOnlyClient({
    authUsers: [{
      id: corporateUuid,
      email: "admin@example.test",
      email_confirmed_at: "2026-08-23T00:00:00.000Z",
      app_metadata: { role: "internal_admin" },
      user_metadata: {}
    }],
    tables: {
      partner_users: [
        { id: "membership-active", auth_user_id: corporateUuid, partner_slug: null, role: "internal_admin", status: "active" },
        { id: "membership-disabled", auth_user_id: corporateUuid, partner_slug: null, role: "internal_admin", status: "disabled" }
      ],
      content_admin_users: [],
      partner_onboarding_activity: [],
      content_audit_events: []
    }
  }),
  env: {}
});
assert.equal(audit.readOnly, true);
assert.equal(audit.auth.matchCount, 1);
assert.equal(audit.auth.user.id, corporateUuid);
assert.equal(audit.canonicalAuthorization.activeInternalAdminRecords.length, 1);
assert.equal(audit.canonicalAuthorization.revokedOrExpiredRecords.length, 1);
assert.ok(audit.conflicts.includes("Auth metadata contains an internal/admin role claim."));
assert.equal(audit.sessions.supported, false);

const dryRun = parseRemediationArgs([
  "--mode", "grant",
  "--corporate-email", "admin@corp.test",
  "--personal-email", "admin@personal.test",
  "--expected-corporate-uuid", corporateUuid,
  "--expected-personal-uuid", personalUuid
]);
assert.equal(dryRun.apply, false, "remediation must default to dry-run");
assert.equal(dryRun.mode, "grant");
assert.throws(
  () => parseRemediationArgs([
    "--mode", "grant",
    "--corporate-email", "admin@corp.test",
    "--personal-email", "admin@personal.test",
    "--expected-corporate-uuid", corporateUuid,
    "--expected-personal-uuid", corporateUuid
  ]),
  /separate Auth user UUIDs/u
);
assert.throws(
  () => parseRemediationArgs([
    "--mode", "revoke",
    "--corporate-email", "admin@corp.test",
    "--personal-email", "admin@personal.test",
    "--expected-corporate-uuid", corporateUuid,
    "--expected-personal-uuid", personalUuid,
    "--receipt-output", "/secure/evidence/revoke.json",
    "--apply"
  ]),
  /confirm-corporate-access/u
);
assert.throws(
  () => parseRemediationArgs([
    "--mode", "grant",
    "--corporate-email", "admin@corp.test",
    "--personal-email", "admin@personal.test",
    "--expected-corporate-uuid", corporateUuid,
    "--expected-personal-uuid", personalUuid,
    "--apply"
  ]),
  /explicit --receipt-output/u
);

const auditSource = read("scripts/security/audit-internal-admin-access.mjs");
for (const mutation of [".insert(", ".update(", ".delete(", "updateUserById(", "deleteUser(", ".signOut("]) {
  assert.ok(!auditSource.includes(mutation), `read-only audit tool must not contain ${mutation}`);
}
const remediationSource = read("scripts/security/remediate-internal-admin-accounts.mjs");
verifyRemediationSource(remediationSource);
for (const [label, marker, replacement] of [
  ["tracked receipt refusal", '["ls-files", "--error-unmatch", "--", relative]', '["status", "--porcelain"]'],
  ["exclusive receipt creation", 'fs.openSync(receiptPath, "wx", 0o600)', 'fs.openSync(receiptPath, "w", 0o600)'],
  ["post-plan recovery invariant", "assertPostPlanRecoverySet(plannedActive, options.expectedCorporateUuid);", "void plannedActive;"],
  ["post-apply recovery invariant", "assertAppliedInvariant({ options, corporate: corporateAfter, personal: personalAfter, activeAdmins: activeAdminsAfter });", "void activeAdminsAfter;"]
]) {
  const mutated = remediationSource.replace(marker, replacement);
  assert.notEqual(mutated, remediationSource, `mutation fixture missing for ${label}`);
  assert.throws(() => verifyRemediationSource(mutated), undefined, `${label} mutation must make this verifier fail`);
}
const authMetadataUpdate = remediationSource.match(/updateUserById\([\s\S]*?\n  \}\);/u)?.[0] ?? "";
assert.ok(authMetadataUpdate, "remediation must have one guarded Auth metadata update");
assert.ok(!/\n\s*email\s*:/u.test(authMetadataUpdate), "remediation must not send an Auth email update");

const basePlanInputs = {
  options: {
    mode: "revoke",
    expectedCorporateUuid: corporateUuid,
    expectedPersonalUuid: personalUuid
  },
  corporate: syntheticAuditReport(corporateUuid, true),
  personal: syntheticAuditReport(personalUuid, true)
};
assert.throws(
  () => buildRemediationPlan({ ...basePlanInputs, activeAdmins: [{
    auth_user_id: personalUuid,
    partner_slug: null,
    role: "internal_admin",
    status: "active"
  }] }),
  /authoritative active global internal administrator/u
);

console.log("Internal admin audit/remediation tool guardrails passed.");

function verifyRemediationSource(source) {
  assert.ok(source.includes("if (!options.apply)"));
  assert.ok(!source.includes("deleteUser("));
  assert.ok(source.includes('from("content_admin_users")'), "remediation must neutralize the legacy content authority");
  assert.ok(source.includes('.update({ status: "disabled" })'), "remediation must preserve legacy rows while disabling them");
  assert.ok(source.includes('["ls-files", "--error-unmatch", "--", relative]'), "tracked receipt targets must be refused");
  assert.ok(source.includes('["check-ignore", "-q", "--no-index", "--", relative]'), "repository-local receipts must be gitignored");
  assert.ok(source.includes("isSymbolicLink()"), "receipt paths must refuse symlink traversal");
  assert.ok(source.includes('fs.openSync(receiptPath, "wx", 0o600)'), "receipt creation must be exclusive and restrictive");
  assert.ok(source.indexOf("reserveReceipt(receiptPath, receipt)") < source.indexOf("await applyGrant(client, corporate, recordAction)"), "apply must reserve a non-secret receipt before mutations");
  assert.ok(source.includes('status: "failed"'), "failed apply attempts must preserve a receipt");
  assert.ok(source.includes("assertPostPlanRecoverySet(plannedActive, options.expectedCorporateUuid);"), "the complete plan must retain a recovery administrator");
  assert.ok(source.includes("assertAppliedInvariant({ options, corporate: corporateAfter, personal: personalAfter, activeAdmins: activeAdminsAfter });"), "the applied state must be re-audited");
}

function syntheticAuditReport(id, active) {
  return {
    auth: { matchCount: 1, user: { id, emailVerified: true, bannedUntil: null } },
    canonicalAuthorization: {
      activeInternalAdminRecords: active ? [{ auth_user_id: id, partner_slug: null, role: "internal_admin", status: "active" }] : [],
      revokedOrExpiredRecords: [],
      partnerMemberships: []
    },
    contentRoles: { rows: [], unavailable: null },
    metadataClaims: { app_metadata: {}, user_metadata: {} }
  };
}

function syntheticReadOnlyClient({ authUsers, tables }) {
  return {
    auth: {
      admin: {
        async listUsers({ page }) {
          return { data: { users: page === 1 ? authUsers : [] }, error: null };
        }
      }
    },
    from(table) {
      const filters = [];
      let limit = Number.POSITIVE_INFINITY;
      const query = {
        select() { return query; },
        eq(column, value) { filters.push([column, value]); return query; },
        order() { return query; },
        limit(value) { limit = value; return query; },
        then(resolve, reject) {
          const rows = (tables[table] ?? [])
            .filter((row) => filters.every(([column, value]) => row[column] === value))
            .slice(0, limit);
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
        }
      };
      return query;
    }
  };
}
