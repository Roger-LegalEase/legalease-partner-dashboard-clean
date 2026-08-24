import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  applyGrant,
  buildRemediationPlan,
  buildRemediationReceipt,
  parseRemediationArgs,
  reserveReceipt,
  resolveReceiptOutput
} from "./remediate-internal-admin-accounts.mjs";

const corporateUuid = "30000000-0000-4000-8000-000000000001";
const personalUuid = "30000000-0000-4000-8000-000000000002";
const recoveryUuid = "30000000-0000-4000-8000-000000000003";
const repositoryRoot = path.resolve(import.meta.dirname, "../..");

const revokeOptions = options("revoke");
const grantOptions = options("grant");
const corporate = report(corporateUuid, { activeGlobal: true });
const personal = report(personalUuid, { activeGlobal: true });

assert.throws(
  () => buildRemediationPlan({ options: revokeOptions, corporate, personal, activeAdmins: [] }),
  /authoritative active global internal administrator/u,
  "zero administrators after the plan must be refused"
);
assert.throws(
  () => buildRemediationPlan({
    options: revokeOptions,
    corporate,
    personal,
    activeAdmins: [activeRow(personalUuid)]
  }),
  /authoritative active global internal administrator/u,
  "the personal account cannot be removed when it is the only authoritative administrator"
);

const oneRemaining = buildRemediationPlan({
  options: revokeOptions,
  corporate,
  personal,
  activeAdmins: [activeRow(corporateUuid), activeRow(personalUuid)]
});
assert.equal(oneRemaining.recoveryAdministratorCountAfter, 1);
assert.deepEqual(oneRemaining.actions, [
  "disable_personal_internal_admin",
  "disable_personal_legacy_content_roles",
  "neutralize_personal_internal_metadata",
  "revoke_personal_refresh_sessions"
]);

let personalDisableCalls = 0;
await assert.rejects(
  applyGrant(failingGrantClient(() => { personalDisableCalls += 1; }), report(corporateUuid, {
    activeGlobal: false,
    inactiveGlobal: true
  })),
  /Corporate authorization update failed/u
);
assert.equal(personalDisableCalls, 0, "a failed corporate grant must never start personal-account disablement");

assert.throws(
  () => buildRemediationPlan({
    options: grantOptions,
    corporate: report(corporateUuid, { activeGlobal: false, partnerScoped: true }),
    personal,
    activeAdmins: [activeRow(personalUuid)]
  }),
  /partner-scoped membership/u
);
assert.throws(
  () => buildRemediationPlan({
    options: grantOptions,
    corporate: report(corporateUuid, { activeGlobal: false, verified: false }),
    personal,
    activeAdmins: [activeRow(personalUuid)]
  }),
  /email is not verified/u
);

const twoRemaining = buildRemediationPlan({
  options: revokeOptions,
  corporate,
  personal,
  activeAdmins: [activeRow(corporateUuid), activeRow(personalUuid), activeRow(recoveryUuid)]
});
assert.equal(twoRemaining.recoveryAdministratorCountAfter, 2);

assert.throws(
  () => parseRemediationArgs(cliArgs("grant", { corporateUuid, personalUuid: corporateUuid })),
  /separate Auth user UUIDs/u
);

const statusBeforeDryRun = git(["status", "--porcelain=v1"], repositoryRoot);
const parsedDryRun = parseRemediationArgs(cliArgs("grant"));
assert.equal(parsedDryRun.apply, false);
assert.equal(parsedDryRun.receiptOutput, "");
buildRemediationPlan({
  options: parsedDryRun,
  corporate: report(corporateUuid, { activeGlobal: false }),
  personal,
  activeAdmins: [activeRow(personalUuid)]
});
assert.equal(git(["status", "--porcelain=v1"], repositoryRoot), statusBeforeDryRun, "dry-run planning must leave the tree unchanged");
assert.throws(
  () => parseRemediationArgs([...cliArgs("grant"), "--apply"]),
  /explicit --receipt-output/u
);

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-admin-receipts-"));
try {
  git(["init", "-q"], fixtureRoot);
  fs.writeFileSync(path.join(fixtureRoot, ".gitignore"), "/secure-receipts/\n", "utf8");

  const trackedPath = path.join(fixtureRoot, "tracked-receipt.json");
  fs.writeFileSync(trackedPath, "candidate\n", "utf8");
  git(["add", "tracked-receipt.json"], fixtureRoot);
  fs.unlinkSync(trackedPath);
  assert.throws(
    () => resolveReceiptOutput(trackedPath, { repoRoot: fixtureRoot }),
    /tracked by Git/u
  );

  assert.throws(
    () => resolveReceiptOutput(path.join(fixtureRoot, "unignored", "operation.json"), { repoRoot: fixtureRoot }),
    /unignored repository path/u
  );

  const securePath = path.join(fixtureRoot, "secure-receipts", "operation.json");
  const resolvedSecurePath = resolveReceiptOutput(securePath, { repoRoot: fixtureRoot });
  const safeReceipt = sampleReceipt();
  reserveReceipt(resolvedSecurePath, safeReceipt);
  assert.equal(fs.statSync(resolvedSecurePath).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(fs.readFileSync(resolvedSecurePath, "utf8")), safeReceipt);

  const trackedArea = path.join(fixtureRoot, "tracked-area");
  fs.mkdirSync(trackedArea);
  const symlinkPath = path.join(fixtureRoot, "secure-link");
  fs.symlinkSync(trackedArea, symlinkPath, "dir");
  assert.throws(
    () => resolveReceiptOutput(path.join(symlinkPath, "escaped.json"), { repoRoot: fixtureRoot }),
    /symbolic link/u
  );

  const existingPath = path.join(fixtureRoot, "secure-receipts", "existing.json");
  fs.writeFileSync(existingPath, "preserve-me", { encoding: "utf8", mode: 0o600 });
  assert.throws(
    () => resolveReceiptOutput(existingPath, { repoRoot: fixtureRoot }),
    /already exists/u
  );
  assert.equal(fs.readFileSync(existingPath, "utf8"), "preserve-me");
  assert.throws(() => reserveReceipt(existingPath, safeReceipt), /EEXIST/u);
  assert.equal(fs.readFileSync(existingPath, "utf8"), "preserve-me");
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

const receiptWithHostileInputs = buildRemediationReceipt({
  options: revokeOptions,
  plan: oneRemaining,
  corporate: report(corporateUuid, { activeGlobal: true, secret: "service-role-secret-value" }),
  personal: report(personalUuid, { activeGlobal: true, secret: "session-cookie-jwt-value" }),
  activeAdmins: [activeRow(corporateUuid), activeRow(personalUuid)],
  startedAt: "2026-08-23T00:00:00.000Z",
  operationId: "operation-123",
  candidateSha: "c1b65603eba80c19f48919f70ae7cccfb3f5c026",
  operatorId: "security.operator"
});
const serializedReceipt = JSON.stringify(receiptWithHostileInputs);
for (const secret of [
  "service-role-secret-value",
  "session-cookie-jwt-value",
  "admin@corp.test",
  "admin@personal.test"
]) {
  assert.ok(!serializedReceipt.includes(secret), `receipt leaked ${secret}`);
}
assert.equal(receiptWithHostileInputs.operationId, "operation-123");
assert.deepEqual(receiptWithHostileInputs.targetUserUuids, { corporate: corporateUuid, personal: personalUuid });
assert.equal(receiptWithHostileInputs.tool.candidateSha, "c1b65603eba80c19f48919f70ae7cccfb3f5c026");
assert.equal(receiptWithHostileInputs.sessionRevocation, "pending");

console.log("Internal admin remediation safety passed: 8 lockout cases and 8 receipt controls.");

function options(mode) {
  return {
    mode,
    corporateEmail: "admin@corp.test",
    personalEmail: "admin@personal.test",
    expectedCorporateUuid: corporateUuid,
    expectedPersonalUuid: personalUuid,
    apply: false,
    confirmCorporateAccess: false,
    receiptOutput: "",
    operatorId: "",
    help: false
  };
}

function cliArgs(mode, overrides = {}) {
  return [
    "--mode", mode,
    "--corporate-email", "admin@corp.test",
    "--personal-email", "admin@personal.test",
    "--expected-corporate-uuid", overrides.corporateUuid ?? corporateUuid,
    "--expected-personal-uuid", overrides.personalUuid ?? personalUuid
  ];
}

function report(id, {
  activeGlobal = false,
  inactiveGlobal = false,
  partnerScoped = false,
  verified = true,
  secret = ""
} = {}) {
  return {
    auth: {
      matchCount: 1,
      user: {
        id,
        email: id === corporateUuid ? "admin@corp.test" : "admin@personal.test",
        emailVerified: verified,
        bannedUntil: null
      }
    },
    canonicalAuthorization: {
      activeInternalAdminRecords: activeGlobal ? [{ ...activeRow(id), id: `active-${id}` }] : [],
      revokedOrExpiredRecords: inactiveGlobal ? [{ ...activeRow(id), id: `inactive-${id}`, status: "disabled" }] : [],
      partnerMemberships: partnerScoped
        ? [{ id: `partner-${id}`, auth_user_id: id, partner_slug: "tenant-a", role: "partner_admin", status: "active" }]
        : []
    },
    contentRoles: { rows: [], unavailable: null },
    metadataClaims: {
      app_metadata: secret ? { service_role_key: secret } : {},
      user_metadata: secret ? { session_cookie: secret } : {}
    }
  };
}

function activeRow(authUserId) {
  return { auth_user_id: authUserId, partner_slug: null, role: "internal_admin", status: "active" };
}

function failingGrantClient(onPersonalDisable) {
  return {
    from(table) {
      const query = {
        update() {
          if (table !== "partner_users") onPersonalDisable();
          return query;
        },
        eq() { return query; },
        then(resolve, reject) {
          return Promise.resolve({ data: null, error: new Error("synthetic grant failure") }).then(resolve, reject);
        }
      };
      return query;
    }
  };
}

function sampleReceipt() {
  return {
    operationId: "fixture-operation",
    timestamp: "2026-08-23T00:00:00.000Z",
    targetUserUuids: [corporateUuid, personalUuid],
    actionsAttempted: [],
    actionsCompleted: []
  };
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}
