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
import { parseRemediationArgs } from "./security/remediate-internal-admin-accounts.mjs";

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
    "--apply"
  ]),
  /confirm-corporate-access/u
);

const auditSource = read("scripts/security/audit-internal-admin-access.mjs");
for (const mutation of [".insert(", ".update(", ".delete(", "updateUserById(", "deleteUser(", ".signOut("]) {
  assert.ok(!auditSource.includes(mutation), `read-only audit tool must not contain ${mutation}`);
}
const remediationSource = read("scripts/security/remediate-internal-admin-accounts.mjs");
assert.ok(remediationSource.includes("if (!options.apply)"));
assert.ok(!remediationSource.includes("deleteUser("));
assert.ok(remediationSource.includes('from("content_admin_users")'), "remediation must neutralize the legacy content authority");
assert.ok(remediationSource.includes('.update({ status: "disabled" })'), "remediation must preserve legacy rows while disabling them");
assert.ok(remediationSource.indexOf('{ flag: "wx", mode: 0o600 }') < remediationSource.indexOf('await applyGrant(client, corporate)'), "apply must reserve a non-secret receipt before mutations");
assert.ok(remediationSource.includes('status: "failed"'), "failed apply attempts must preserve a receipt");
const authMetadataUpdate = remediationSource.match(/updateUserById\([\s\S]*?\n  \}\);/u)?.[0] ?? "";
assert.ok(authMetadataUpdate, "remediation must have one guarded Auth metadata update");
assert.ok(!/\n\s*email\s*:/u.test(authMetadataUpdate), "remediation must not send an Auth email update");

console.log("Internal admin audit/remediation tool guardrails passed.");

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
