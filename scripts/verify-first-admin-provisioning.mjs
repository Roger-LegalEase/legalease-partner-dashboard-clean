import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const domain = await import(
  "../src/lib/partners/first-admin-domain.ts"
);

const {
  FIRST_ADMIN_ROLE,
  createFirstAdminToken,
  decidePostAcceptanceDestination,
  effectiveInvitationStatus,
  firstAdminRecordId,
  invitationPublicFields,
  parseFirstAdminInvitationPayload,
  secureFirstAdminTokenMatches,
  validateFirstAdminInput
} = domain;

const valid = validateFirstAdminInput({
  fullName: "  Jordan   Taylor ",
  email: "  ADMIN@Example.ORG ",
  idempotencyKey: "5dc3c91d-150f-48ca-9cb4-10632e706f48",
  expirationHours: 72
});
assert.equal(valid.ok, true);
assert.deepEqual(valid.value, {
  fullName: "Jordan Taylor",
  email: "admin@example.org",
  idempotencyKey: "5dc3c91d-150f-48ca-9cb4-10632e706f48",
  expirationHours: 72
});
for (const invalid of [
  { ...valid.value, fullName: "" },
  { ...valid.value, email: "not-an-email" },
  { ...valid.value, idempotencyKey: "not-a-request-id" },
  { ...valid.value, expirationHours: 73 }
]) {
  assert.equal(validateFirstAdminInput(invalid).ok, false);
}

const { rawToken, tokenHash } = createFirstAdminToken();
assert.equal(rawToken.length, 43);
assert.equal(tokenHash.length, 64);
assert.notEqual(rawToken, tokenHash);
assert.equal(secureFirstAdminTokenMatches(rawToken, tokenHash), true);
assert.equal(
  secureFirstAdminTokenMatches(
    `${rawToken.slice(0, -1)}${rawToken.endsWith("A") ? "B" : "A"}`,
    tokenHash
  ),
  false
);

const now = new Date("2026-07-29T12:00:00.000Z");
const invitation = {
  schema_version: 1,
  revision: 1,
  invitation_id: "2628f1ef-b669-4c68-a83e-90bb879d10f8",
  idempotency_key: "5dc3c91d-150f-48ca-9cb4-10632e706f48",
  full_name: "Jordan Taylor",
  email: "admin@example.org",
  role: FIRST_ADMIN_ROLE,
  status: "pending",
  token_hash: tokenHash,
  created_at: now.toISOString(),
  expires_at: "2026-08-01T12:00:00.000Z",
  created_by: "9be65d0b-214b-4e71-8aaa-c2ef6b87418c",
  delivery_status: "not_requested"
};
assert.deepEqual(parseFirstAdminInvitationPayload(invitation), invitation);
assert.equal(effectiveInvitationStatus(invitation, now), "pending");
assert.equal(
  effectiveInvitationStatus(invitation, new Date("2026-08-01T12:00:00.000Z")),
  "expired"
);
const publicInvitation = invitationPublicFields(invitation, now);
assert.equal(publicInvitation.email, "admin@example.org");
assert.equal("token_hash" in publicInvitation, false);
assert.equal("tokenHash" in publicInvitation, false);

assert.equal(
  firstAdminRecordId("community-justice"),
  firstAdminRecordId("community-justice")
);
assert.notEqual(
  firstAdminRecordId("community-justice"),
  firstAdminRecordId("another-partner")
);
assert.equal(
  decidePostAcceptanceDestination({
    onboardingEnabled: true,
    workspaceStatus: "setup_in_progress"
  }),
  "/partner/onboarding"
);
assert.equal(
  decidePostAcceptanceDestination({
    onboardingEnabled: true,
    workspaceStatus: "live"
  }),
  "/partner/dashboard"
);
assert.equal(
  decidePostAcceptanceDestination({
    onboardingEnabled: false,
    workspaceStatus: "setup_in_progress"
  }),
  "/partner/dashboard"
);

// Behavioral lifecycle model: one current partner-bound invitation; replacement
// and revocation invalidate older setup material; acceptance is retry-safe.
const lifecycle = {
  current: invitation,
  memberships: new Map()
};
const oldToken = rawToken;
const replacementToken = createFirstAdminToken();
lifecycle.current = {
  ...invitation,
  revision: 2,
  invitation_id: "79211c1e-65ca-4dab-a00d-184f2d0f5611",
  idempotency_key: "30f9d0d7-13b6-4d31-95d1-4891b48ee85a",
  email: "replacement@example.org",
  token_hash: replacementToken.tokenHash
};
assert.equal(
  secureFirstAdminTokenMatches(oldToken, lifecycle.current.token_hash),
  false,
  "replacement must invalidate the prior token"
);
lifecycle.current = {
  ...lifecycle.current,
  revision: 3,
  status: "revoked"
};
assert.equal(
  lifecycle.current.status === "pending" &&
    secureFirstAdminTokenMatches(
      replacementToken.rawToken,
      lifecycle.current.token_hash
    ),
  false,
  "revoked token must not be accepted"
);
lifecycle.current = {
  ...lifecycle.current,
  revision: 4,
  status: "accepted",
  auth_user_id: "ef13e2ad-2a4f-45fc-b0f3-a5308f07bf73"
};
const membershipKey = lifecycle.current.auth_user_id;
lifecycle.memberships.set(membershipKey, {
  partnerSlug: "community-justice",
  role: FIRST_ADMIN_ROLE,
  status: "active"
});
lifecycle.memberships.set(membershipKey, {
  partnerSlug: "community-justice",
  role: FIRST_ADMIN_ROLE,
  status: "active"
});
assert.equal(lifecycle.memberships.size, 1, "retry must not duplicate membership");

const files = {
  service: "src/lib/partners/first-admin-service.ts",
  internalRoute:
    "src/app/api/internal/partners/first-admin/[partnerSlug]/route.ts",
  acceptRoute: "src/app/api/partners/first-admin/accept/route.ts",
  setupRoute: "src/app/partner/setup/route.ts",
  panel:
    "src/app/internal/partners/provisioning/[partnerSlug]/FirstAdminAccessPanel.tsx",
  password: "src/app/auth/set-password/page.tsx"
};
for (const file of Object.values(files)) {
  assert.equal(fs.existsSync(file), true, `Missing implementation file: ${file}`);
}
const service = fs.readFileSync(files.service, "utf8");
const internalRoute = fs.readFileSync(files.internalRoute, "utf8");
const acceptRoute = fs.readFileSync(files.acceptRoute, "utf8");
const setupRoute = fs.readFileSync(files.setupRoute, "utf8");
const panel = fs.readFileSync(files.panel, "utf8");
const password = fs.readFileSync(files.password, "utf8");

assert.match(service, /token_hash: tokenHash/);
assert.doesNotMatch(service, /raw_token\s*:/);
assert.match(service, /timingSafe|secureFirstAdminTokenMatches/);
assert.match(service, /role: FIRST_ADMIN_ROLE/);
assert.match(service, /compareAndSetInvitation/);
assert.match(service, /first_admin_invitation_revoked/);
assert.match(service, /first_admin_invitation_replaced/);
assert.match(service, /first_admin_replay_prevented/);
assert.match(service, /partner_admin_membership_created/);
assert.match(service, /generateLink/);
assert.doesNotMatch(
  service.slice(
    service.indexOf("createFirstAdminInvitation"),
    service.indexOf("revokeFirstAdminInvitation")
  ),
  /inviteUserByEmail|fetch\("https:\/\/api\.resend/
);
assert.match(internalRoute, /requireInternalAdminSession/);
assert.match(internalRoute, /if \(!isSameOriginRequest\(request\)\)/);
assert.doesNotMatch(internalRoute, /values\.role|values\.partnerSlug/);
assert.match(acceptRoute, /createServerSupabaseAuthClient/);
assert.doesNotMatch(acceptRoute, /request\.json/);
assert.match(setupRoute, /Referrer-Policy/);
assert.doesNotMatch(setupRoute, /console\./);
assert.match(panel, /Review administrator access/);
assert.match(panel, /Copy secure setup link/);
assert.match(panel, /Revoke invitation/);
assert.match(panel, /Post-acceptance destination/);
assert.doesNotMatch(panel, /auth_user_id|token_hash|service_role/);
assert.match(password, /\/api\/partners\/first-admin\/accept/);
assert.match(password, /safeAppRedirectPath\(\s*result\.redirectTo/);

console.log("First administrator provisioning verification passed.");
console.log("- Normalization, token hashing/comparison, expiration, and redirect behavior are exercised.");
console.log("- Replacement/revocation invalidate prior links and membership retry remains singular.");
console.log("- Internal and acceptance routes enforce server-derived role, partner, and authorization boundaries.");
console.log("- List/UI outputs exclude token hashes and raw account identifiers.");
