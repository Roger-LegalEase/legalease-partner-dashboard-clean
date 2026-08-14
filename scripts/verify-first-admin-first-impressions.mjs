import assert from "node:assert/strict";
import fs from "node:fs";
import {
  FIRST_ADMIN_ROLE_LABEL,
  FIRST_ADMIN_SUPPORT_EMAIL,
  renderFirstAdminInvitationEmail
} from "../src/lib/partners/first-admin-invitation-email.ts";
import { buildFirstAdminProvisioningPresentation } from "../src/lib/partners/first-admin-provisioning-presentation.ts";

const fixture = {
  organizationName: "Rythm Labs",
  administratorName: "Lee Roman",
  workEmail: "Roger@rythmlabs.com",
  setupUrl: "https://partners.legalease.com/partner/setup?token=[REDACTED]",
  expiresAt: "2026-08-17T18:30:00.000Z"
};
const invitation = renderFirstAdminInvitationEmail(fixture);

for (const value of [
  fixture.organizationName,
  fixture.administratorName,
  fixture.workEmail,
  FIRST_ADMIN_ROLE_LABEL,
  invitation.expiration,
  FIRST_ADMIN_SUPPORT_EMAIL
]) {
  assert.ok(invitation.html.includes(value), `HTML is missing ${value}`);
  assert.ok(invitation.text.includes(value), `Text is missing ${value}`);
}
assert.equal((invitation.html.match(/data-primary-action="true"/g) ?? []).length, 1);
assert.match(invitation.expiration, /^on August 17, 2026 at 6:30 PM UTC$/);
assert.ok(invitation.html.includes(fixture.setupUrl));
assert.ok(invitation.text.includes(fixture.setupUrl));

const panelPath = "src/app/internal/partners/provisioning/[partnerSlug]/FirstAdminAccessPanel.tsx";
const panel = fs.readFileSync(panelPath, "utf8");
assert.ok(panel.includes("View invitation history"));
assert.ok(panel.indexOf("View invitation history") > panel.indexOf("Program configuration"));
assert.doesNotMatch(panel, /replaceAll\("_", " "\)/);
assert.equal((panel.match(/data-primary-action="true"/g) ?? []).length, 1);

const baseAccess = {
  statusLabel: "Invitation pending",
  workspaceExists: true,
  emailDeliveryConfigured: true,
  invitation: null,
  administrator: null,
  history: []
};
const expected = {
  invitation_pending: ["Pending", "Ask the named administrator"],
  invitation_expired: ["Expired", "Replace the expired invitation"],
  invitation_revoked: ["Revoked", "Create a new invitation"],
  administrator_active: ["Active", "continue Program configuration"]
};
for (const [accessStatus, [label, action]] of Object.entries(expected)) {
  const active = accessStatus === "administrator_active";
  const presentation = buildFirstAdminProvisioningPresentation({
    access: {
      ...baseAccess,
      accessStatus,
      statusLabel: active ? "Administrator active" : baseAccess.statusLabel,
      administrator: active
        ? { role: "partner_admin", accountStatus: "active", membershipStatus: "active", fullName: "Lee Roman", email: "Roger@rythmlabs.com" }
        : null
    },
    jurisdiction: "Not recorded",
    selectedPackage: "Not selected",
    onboardingStatus: "in_progress",
    provisioningStatus: "provisioning_in_progress",
    onboardingHref: "/internal/partners/onboarding/rythm-labs"
  });
  assert.equal(presentation.access.label, label);
  assert.match(presentation.nextAction, new RegExp(action));
  assert.equal(presentation.configuration.label, "In progress");
  assert.equal(presentation.publication.label, "Private");
  assert.equal(presentation.activation.label, "Inactive");
  assert.equal(presentation.account, active ? "Active" : "Not established");
  assert.equal(presentation.membership, active ? "Active" : "Not established");
  assert.equal(presentation.missingInformation.length, 2);
  assert.ok(presentation.missingInformation.every((item) => item.includes("Open the onboarding workspace")));
}

for (const file of [
  "scripts/verify-first-admin-first-impressions.mjs",
  "src/lib/partners/first-admin-invitation-email.ts"
]) {
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /token=[A-Za-z0-9_-]{20,}/);
}

console.log("First administrator invitation and provisioning presentation verification passed.");
