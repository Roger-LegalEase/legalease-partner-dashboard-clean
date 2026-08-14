import "server-only";

import type { User } from "@supabase/supabase-js";
import { absolutePartnerAppUrl } from "@/lib/app-url";
import {
  getPartnerEmailDeliveryConfig,
  sendPartnerEmailMessage
} from "@/lib/email/email-service";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  FIRST_ADMIN_ROLE,
  createFirstAdminToken,
  decidePostAcceptanceDestination,
  effectiveInvitationStatus,
  firstAdminRecordId,
  hashFirstAdminToken,
  invitationPublicFields,
  isInvitationExpired,
  normalizeEmail,
  normalizePartnerSlug,
  parseFirstAdminInvitationPayload,
  secureFirstAdminTokenMatches,
  validateFirstAdminInput,
  type FirstAdminInput,
  type FirstAdminInvitationPayload
} from "./first-admin-domain";
import { renderFirstAdminInvitationEmail } from "./first-admin-invitation-email";

const invitationEventType = "first_admin_invitation_record";
const invitationEventLabel = "First administrator invitation";
const setupMetadataKey = "legalease_first_admin_invitation";

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

type InvitationRecordRow = {
  id: string;
  partner_slug: string;
  event_type: string;
  event_label: string;
  event_payload: unknown;
  created_at: string | null;
};

type PartnerRecordRow = {
  partner_slug: string;
  partner_name: string | null;
  organization_name: string | null;
  legal_name: string | null;
  target_state: string | null;
  state: string | null;
  selected_package_name: string | null;
};

type PartnerUserRow = {
  id: string;
  auth_user_id: string;
  invited_email: string | null;
  partner_slug: string | null;
  role: string;
  status: string;
  created_at: string | null;
};

export type FirstAdminHistoryItem = {
  id: string;
  event: string;
  label: string;
  status?: string;
  email?: string;
  fullName?: string;
  occurredAt: string;
};

export type FirstAdminAccessView = {
  accessStatus:
    | "no_administrator"
    | "invitation_pending"
    | "administrator_active"
    | "invitation_expired"
    | "invitation_revoked"
    | "access_needs_attention";
  statusLabel:
    | "No administrator configured"
    | "Invitation pending"
    | "Administrator active"
    | "Invitation expired"
    | "Invitation revoked"
    | "Access needs attention";
  workspaceExists: boolean;
  emailDeliveryConfigured: boolean;
  invitation: ReturnType<typeof invitationPublicFields> | null;
  administrator: {
    fullName?: string;
    email?: string;
    role: typeof FIRST_ADMIN_ROLE;
    accountStatus: "active";
    membershipStatus: "active";
  } | null;
  history: FirstAdminHistoryItem[];
};

export class FirstAdminProvisioningError extends Error {
  constructor(
    readonly code:
      | "invalid_input"
      | "not_configured"
      | "partner_not_found"
      | "workspace_required"
      | "administrator_exists"
      | "invitation_pending"
      | "invitation_not_found"
      | "invitation_inactive"
      | "invitation_conflict"
      | "auth_conflict"
      | "auth_failed"
      | "membership_failed"
      | "delivery_unavailable"
      | "delivery_failed"
      | "write_failed",
    message: string
  ) {
    super(message);
    this.name = "FirstAdminProvisioningError";
  }
}

export async function getFirstAdminPartnerSummary(partnerSlugValue: unknown) {
  const partnerSlug = normalizePartnerSlug(partnerSlugValue);
  const supabase = admin();
  const partner = await requirePartner(supabase, partnerSlug);
  return {
    partnerSlug,
    publicName:
      partner.organization_name ?? partner.partner_name ?? partner.partner_slug,
    legalName: partner.legal_name ?? "Not recorded",
    jurisdiction:
      partner.target_state ?? partner.state ?? "Not recorded",
    selectedPackage: partner.selected_package_name ?? "Not selected"
  };
}

export async function getFirstAdminAccessView(
  partnerSlugValue: unknown,
  now = new Date()
): Promise<FirstAdminAccessView> {
  const partnerSlug = normalizePartnerSlug(partnerSlugValue);
  const supabase = admin();
  await requirePartner(supabase, partnerSlug);

  const [workspaceExists, invitation, administrators, history] =
    await Promise.all([
      hasOnboardingWorkspace(supabase, partnerSlug),
      readInvitation(supabase, partnerSlug),
      listActivePartnerAdmins(supabase, partnerSlug),
      listInvitationHistory(supabase, partnerSlug)
    ]);

  if (administrators.length > 1) {
    return baseView({
      accessStatus: "access_needs_attention",
      statusLabel: "Access needs attention",
      workspaceExists,
      invitation,
      administrator: null,
      history
    });
  }

  if (administrators.length === 1) {
    const row = administrators[0];
    return baseView({
      accessStatus: "administrator_active",
      statusLabel: "Administrator active",
      workspaceExists,
      invitation,
      administrator: {
        fullName:
          invitation?.auth_user_id === row.auth_user_id
            ? invitation.full_name
            : undefined,
        email: row.invited_email ?? invitation?.email,
        role: FIRST_ADMIN_ROLE,
        accountStatus: "active",
        membershipStatus: "active"
      },
      history
    });
  }

  if (!workspaceExists && !invitation) {
    return baseView({
      accessStatus: "access_needs_attention",
      statusLabel: "Access needs attention",
      workspaceExists,
      invitation: null,
      administrator: null,
      history
    });
  }

  if (!invitation) {
    return baseView({
      accessStatus: "no_administrator",
      statusLabel: "No administrator configured",
      workspaceExists,
      invitation: null,
      administrator: null,
      history
    });
  }

  const status = effectiveInvitationStatus(invitation, now);
  if (status === "accepted") {
    return baseView({
      accessStatus: "access_needs_attention",
      statusLabel: "Access needs attention",
      workspaceExists,
      invitation,
      administrator: null,
      history
    });
  }
  if (status === "expired") {
    return baseView({
      accessStatus: "invitation_expired",
      statusLabel: "Invitation expired",
      workspaceExists,
      invitation,
      administrator: null,
      history
    });
  }
  if (status === "revoked" || status === "superseded") {
    return baseView({
      accessStatus: "invitation_revoked",
      statusLabel: "Invitation revoked",
      workspaceExists,
      invitation,
      administrator: null,
      history
    });
  }
  if (["pending", "claiming", "claimed", "accepting"].includes(status)) {
    return baseView({
      accessStatus: "invitation_pending",
      statusLabel: "Invitation pending",
      workspaceExists,
      invitation,
      administrator: null,
      history
    });
  }
  return baseView({
    accessStatus: "access_needs_attention",
    statusLabel: "Access needs attention",
    workspaceExists,
    invitation,
    administrator: null,
    history
  });
}

export async function createFirstAdminInvitation(input: {
  partnerSlug: unknown;
  operatorUserId: string;
  values: FirstAdminInput;
  replaceCurrent?: boolean;
  now?: Date;
}) {
  const partnerSlug = normalizePartnerSlug(input.partnerSlug);
  const validated = validateFirstAdminInput(input.values);
  if (!validated.ok) {
    throw new FirstAdminProvisioningError(
      "invalid_input",
      validated.error
    );
  }
  const supabase = admin();
  await requirePartner(supabase, partnerSlug);
  if (!(await hasOnboardingWorkspace(supabase, partnerSlug))) {
    throw new FirstAdminProvisioningError(
      "workspace_required",
      "Create the partner onboarding workspace before creating administrator access."
    );
  }
  if ((await listActivePartnerAdmins(supabase, partnerSlug)).length > 0) {
    throw new FirstAdminProvisioningError(
      "administrator_exists",
      "This partner already has an active administrator."
    );
  }

  const now = input.now ?? new Date();
  const current = await readInvitation(supabase, partnerSlug);
  const currentStatus = current
    ? effectiveInvitationStatus(current, now)
    : null;
  if (
    current &&
    current.idempotency_key === validated.value.idempotencyKey
  ) {
    return {
      created: false,
      duplicatePrevented: true,
      invitation: invitationPublicFields(current, now),
      setupLink: null
    };
  }
  if (
    current &&
    ["pending", "claiming", "claimed", "accepting"].includes(
      currentStatus ?? ""
    ) &&
    !input.replaceCurrent
  ) {
    throw new FirstAdminProvisioningError(
      "invitation_pending",
      "An administrator invitation is already pending. Revoke or replace it before creating another."
    );
  }
  const createdAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + validated.value.expirationHours * 60 * 60 * 1000
  ).toISOString();
  const { rawToken, tokenHash } = createFirstAdminToken();
  const payload: FirstAdminInvitationPayload = {
    schema_version: 1,
    revision: (current?.revision ?? 0) + 1,
    invitation_id: crypto.randomUUID(),
    idempotency_key: validated.value.idempotencyKey,
    full_name: validated.value.fullName,
    email: validated.value.email,
    role: FIRST_ADMIN_ROLE,
    status: "pending",
    token_hash: tokenHash,
    created_at: createdAt,
    expires_at: expiresAt,
    created_by: input.operatorUserId,
    delivery_status: "not_requested"
  };

  const persisted = current
    ? await compareAndSetInvitation(
        supabase,
        partnerSlug,
        current.revision,
        payload
      )
    : await insertInvitation(supabase, partnerSlug, payload);
  if (!persisted) {
    throw new FirstAdminProvisioningError(
      "invitation_conflict",
      "Administrator access changed in another session. Refresh before trying again."
    );
  }

  if (current) {
    await safelyInvalidateInvitationAuthUser(supabase, current);
    await appendAudit(supabase, partnerSlug, "first_admin_invitation_replaced", {
      invitation_id: current.invitation_id,
      status: "superseded",
      occurred_at: createdAt
    });
  }
  await appendAudit(supabase, partnerSlug, "first_admin_invitation_created", {
    invitation_id: payload.invitation_id,
    full_name: payload.full_name,
    email: payload.email,
    role: payload.role,
    status: payload.status,
    expires_at: payload.expires_at
  });

  return {
    created: true,
    duplicatePrevented: false,
    invitation: invitationPublicFields(payload, now),
    setupLink: absolutePartnerAppUrl(
      `/partner/setup?token=${encodeURIComponent(rawToken)}`
    )
  };
}

export async function revokeFirstAdminInvitation(input: {
  partnerSlug: unknown;
  invitationId: unknown;
  operatorUserId: string;
  now?: Date;
}) {
  const partnerSlug = normalizePartnerSlug(input.partnerSlug);
  const invitationId =
    typeof input.invitationId === "string" ? input.invitationId : "";
  const supabase = admin();
  await requirePartner(supabase, partnerSlug);
  const current = await readInvitation(supabase, partnerSlug);
  if (!current || current.invitation_id !== invitationId) {
    throw new FirstAdminProvisioningError(
      "invitation_not_found",
      "That invitation is no longer current."
    );
  }
  const status = effectiveInvitationStatus(current, input.now ?? new Date());
  if (!["pending", "claiming", "claimed"].includes(status)) {
    throw new FirstAdminProvisioningError(
      "invitation_inactive",
      "That invitation can no longer be revoked."
    );
  }
  const revokedAt = (input.now ?? new Date()).toISOString();
  const next: FirstAdminInvitationPayload = {
    ...current,
    revision: current.revision + 1,
    status: "revoked",
    revoked_at: revokedAt
  };
  if (
    !(await compareAndSetInvitation(
      supabase,
      partnerSlug,
      current.revision,
      next
    ))
  ) {
    throw new FirstAdminProvisioningError(
      "invitation_conflict",
      "Administrator access changed in another session. Refresh before trying again."
    );
  }
  await safelyInvalidateInvitationAuthUser(supabase, current);
  await appendAudit(supabase, partnerSlug, "first_admin_invitation_revoked", {
    invitation_id: current.invitation_id,
    status: "revoked",
    occurred_at: revokedAt,
    actor_user_id: input.operatorUserId
  });
  return invitationPublicFields(next);
}

export async function claimFirstAdminSetupToken(
  rawToken: string,
  now = new Date()
) {
  const supabase = admin();
  const tokenHash = secureTokenHash(rawToken);
  const { data, error } = await supabase
    .from("partner_events")
    .select("id, partner_slug, event_type, event_label, event_payload, created_at")
    .eq("event_type", invitationEventType)
    .contains("event_payload", { token_hash: tokenHash })
    .limit(2);
  if (error) {
    throw persistenceReadFailure();
  }
  const rows = (data ?? []) as InvitationRecordRow[];
  if (rows.length !== 1) {
    throw inactiveInvitation();
  }
  const row = rows[0];
  const invitation = parseFirstAdminInvitationPayload(row.event_payload);
  if (
    !invitation ||
    !secureFirstAdminTokenMatches(rawToken, invitation.token_hash) ||
    invitation.status !== "pending"
  ) {
    throw inactiveInvitation();
  }
  if (isInvitationExpired(invitation, now)) {
    await markInvitationExpired(
      supabase,
      row.partner_slug,
      invitation,
      now
    );
    throw inactiveInvitation();
  }
  if ((await listActivePartnerAdmins(supabase, row.partner_slug)).length > 0) {
    throw inactiveInvitation();
  }

  const claiming: FirstAdminInvitationPayload = {
    ...invitation,
    revision: invitation.revision + 1,
    status: "claiming",
    claim_started_at: now.toISOString()
  };
  if (
    !(await compareAndSetInvitation(
      supabase,
      row.partner_slug,
      invitation.revision,
      claiming
    ))
  ) {
    throw inactiveInvitation();
  }

  let authUser: User | null = null;
  let createdAuthUser = false;
  let claimedInvitation: FirstAdminInvitationPayload | null = null;
  try {
    const existing = await findAuthUserByEmail(supabase, invitation.email);
    if (existing) {
      await assertAuthUserCanReceiveInvitation(
        supabase,
        existing,
        row.partner_slug
      );
    }
    const redirectTo = absolutePartnerAppUrl(
      "/auth/set-password?next=/partner/dashboard&first_admin=1"
    );
    const link = await supabase.auth.admin.generateLink(
      existing
        ? {
            type: "recovery",
            email: invitation.email,
            options: { redirectTo }
          }
        : {
            type: "invite",
            email: invitation.email,
            options: {
              redirectTo,
              data: { name: invitation.full_name }
            }
          }
    );
    authUser = link.data.user;
    createdAuthUser = !existing;
    const actionLink = link.data.properties?.action_link;
    if (link.error || !authUser?.id || !actionLink) {
      throw new Error("Supabase did not create an account setup link.");
    }
    if (normalizeEmail(authUser.email) !== invitation.email) {
      throw new Error("Supabase returned an unexpected account identity.");
    }
    const appMetadata = {
      ...(authUser.app_metadata ?? {}),
      [setupMetadataKey]: {
        invitationId: invitation.invitation_id,
        partnerSlug: row.partner_slug,
        email: invitation.email,
        role: FIRST_ADMIN_ROLE,
        expiresAt: invitation.expires_at
      }
    };
    const metadataUpdate = await supabase.auth.admin.updateUserById(
      authUser.id,
      { app_metadata: appMetadata }
    );
    if (metadataUpdate.error) {
      throw new Error("Unable to bind the setup account.");
    }
    const claimedAt = now.toISOString();
    const claimed: FirstAdminInvitationPayload = {
      ...claiming,
      revision: claiming.revision + 1,
      status: "claimed",
      auth_user_id: authUser.id,
      claimed_at: claimedAt
    };
    if (
      !(await compareAndSetInvitation(
        supabase,
        row.partner_slug,
        claiming.revision,
        claimed
      ))
    ) {
      throw new Error("Invitation state changed during setup.");
    }
    claimedInvitation = claimed;
    await appendAudit(
      supabase,
      row.partner_slug,
      "first_admin_invitation_claimed",
      {
        invitation_id: invitation.invitation_id,
        status: "claimed",
        occurred_at: claimedAt
      }
    );
    return { actionLink };
  } catch (error) {
    if (createdAuthUser && authUser?.id) {
      const deletion = await supabase.auth.admin.deleteUser(authUser.id);
      if (deletion.error) {
        throw new FirstAdminProvisioningError(
          "auth_failed",
          "Account setup failed and its unclaimed Auth user could not be removed."
        );
      }
    }
    const expectedRevision =
      claimedInvitation?.revision ?? claiming.revision;
    const recovered: FirstAdminInvitationPayload = claimedInvitation
      ? {
          ...claimedInvitation,
          revision: expectedRevision + 1,
          status: "attention"
        }
      : {
          ...invitation,
          revision: expectedRevision + 1,
          status: "pending"
        };
    if (
      !(await compareAndSetInvitation(
        supabase,
        row.partner_slug,
        expectedRevision,
        recovered
      ))
    ) {
      throw new FirstAdminProvisioningError(
        "invitation_conflict",
        "Account setup failed while invitation recovery also changed."
      );
    }
    if (error instanceof FirstAdminProvisioningError) {
      throw error;
    }
    throw inactiveInvitation();
  }
}

export async function acceptFirstAdminInvitation(
  authUser: User,
  now = new Date()
) {
  const metadata = parseSetupMetadata(
    authUser.app_metadata?.[setupMetadataKey]
  );
  if (!metadata || normalizeEmail(authUser.email) !== metadata.email) {
    throw new FirstAdminProvisioningError(
      "auth_conflict",
      "This account setup invitation is no longer active."
    );
  }
  const partnerSlug = normalizePartnerSlug(metadata.partnerSlug);
  const supabase = admin();
  const invitation = await readInvitation(supabase, partnerSlug);
  if (
    !invitation ||
    invitation.invitation_id !== metadata.invitationId ||
    invitation.role !== FIRST_ADMIN_ROLE ||
    invitation.email !== metadata.email ||
    invitation.auth_user_id !== authUser.id
  ) {
    throw new FirstAdminProvisioningError(
      "auth_conflict",
      "This account setup invitation is no longer active."
    );
  }
  if (isInvitationExpired(invitation, now)) {
    await markInvitationExpired(supabase, partnerSlug, invitation, now);
    throw new FirstAdminProvisioningError(
      "invitation_inactive",
      "This account setup invitation is no longer active."
    );
  }

  const existingMembership = await findMembershipByAuthUser(
    supabase,
    authUser.id
  );
  if (invitation.status === "accepted") {
    if (
      existingMembership?.partner_slug === partnerSlug &&
      existingMembership.role === FIRST_ADMIN_ROLE &&
      existingMembership.status === "active"
    ) {
      await appendAudit(
        supabase,
        partnerSlug,
        "first_admin_replay_prevented",
        {
          invitation_id: invitation.invitation_id,
          status: "accepted",
          occurred_at: now.toISOString()
        }
      );
      return {
        membershipCreated: false,
        replayPrevented: true,
        redirectTo: await postAcceptanceDestination(supabase, partnerSlug)
      };
    }
    throw new FirstAdminProvisioningError(
      "membership_failed",
      "Partner access could not be confirmed."
    );
  }
  if (
    invitation.status === "accepting" &&
    existingMembership?.partner_slug === partnerSlug &&
    existingMembership.role === FIRST_ADMIN_ROLE &&
    existingMembership.status === "active"
  ) {
    const acceptedAt = now.toISOString();
    if (
      !(await compareAndSetInvitation(
        supabase,
        partnerSlug,
        invitation.revision,
        {
          ...invitation,
          revision: invitation.revision + 1,
          status: "accepted",
          accepted_at: acceptedAt
        }
      ))
    ) {
      throw new FirstAdminProvisioningError(
        "invitation_conflict",
        "Partner access changed while the account was being confirmed."
      );
    }
    await appendAudit(
      supabase,
      partnerSlug,
      "first_admin_replay_prevented",
      {
        invitation_id: invitation.invitation_id,
        status: "accepted",
        occurred_at: acceptedAt
      }
    );
    return {
      membershipCreated: false,
      replayPrevented: true,
      redirectTo: await postAcceptanceDestination(supabase, partnerSlug)
    };
  }
  if (invitation.status !== "claimed") {
    throw new FirstAdminProvisioningError(
      "invitation_inactive",
      "This account setup invitation is no longer active."
    );
  }
  if (
    existingMembership &&
    (existingMembership.partner_slug !== partnerSlug ||
      existingMembership.role !== FIRST_ADMIN_ROLE ||
      existingMembership.status !== "active")
  ) {
    throw new FirstAdminProvisioningError(
      "auth_conflict",
      "Partner access could not be confirmed."
    );
  }
  const otherAdmins = (await listActivePartnerAdmins(supabase, partnerSlug)).filter(
    (row) => row.auth_user_id !== authUser.id
  );
  if (otherAdmins.length > 0) {
    throw new FirstAdminProvisioningError(
      "administrator_exists",
      "Partner access could not be confirmed."
    );
  }

  const accepting: FirstAdminInvitationPayload = {
    ...invitation,
    revision: invitation.revision + 1,
    status: "accepting"
  };
  if (
    !(await compareAndSetInvitation(
      supabase,
      partnerSlug,
      invitation.revision,
      accepting
    ))
  ) {
    throw new FirstAdminProvisioningError(
      "invitation_conflict",
      "Partner access changed while the account was being activated."
    );
  }

  let membership = existingMembership;
  let membershipCreated = false;
  if (!membership) {
    const insert = await supabase
      .from("partner_users")
      .insert({
        auth_user_id: authUser.id,
        partner_slug: partnerSlug,
        role: FIRST_ADMIN_ROLE,
        status: "active",
        invited_email: invitation.email
      })
      .select("id, auth_user_id, invited_email, partner_slug, role, status, created_at")
      .maybeSingle();
    membership = insert.data as PartnerUserRow | null;
    if (insert.error || !membership) {
      membership = await findMembershipByAuthUser(supabase, authUser.id);
      if (
        !membership ||
        membership.partner_slug !== partnerSlug ||
        membership.role !== FIRST_ADMIN_ROLE ||
        membership.status !== "active"
      ) {
        if (
          !(await compareAndSetInvitation(
            supabase,
            partnerSlug,
            accepting.revision,
            {
              ...accepting,
              revision: accepting.revision + 1,
              status: "attention"
            }
          ))
        ) {
          throw new FirstAdminProvisioningError(
            "invitation_conflict",
            "Partner access changed while activation was recovering."
          );
        }
        throw new FirstAdminProvisioningError(
          "membership_failed",
          "Partner access could not be activated."
        );
      }
    } else {
      membershipCreated = true;
    }
  }

  const acceptedAt = now.toISOString();
  const accepted: FirstAdminInvitationPayload = {
    ...accepting,
    revision: accepting.revision + 1,
    status: "accepted",
    accepted_at: acceptedAt
  };
  if (
    !(await compareAndSetInvitation(
      supabase,
      partnerSlug,
      accepting.revision,
      accepted
    ))
  ) {
    throw new FirstAdminProvisioningError(
      "invitation_conflict",
      "Partner access was created, but activation still needs confirmation. Retry account setup."
    );
  }
  if (membershipCreated) {
    await appendAudit(
      supabase,
      partnerSlug,
      "partner_admin_membership_created",
      {
        invitation_id: invitation.invitation_id,
        status: "active",
        occurred_at: acceptedAt
      }
    );
  }
  await appendAudit(
    supabase,
    partnerSlug,
    "first_admin_invitation_accepted",
    {
      invitation_id: invitation.invitation_id,
      status: "accepted",
      occurred_at: acceptedAt
    }
  );
  const metadataUpdate = await supabase.auth.admin.updateUserById(authUser.id, {
    app_metadata: {
      ...(authUser.app_metadata ?? {}),
      [setupMetadataKey]: {
        ...metadata,
        acceptedAt
      }
    }
  });
  if (metadataUpdate.error) {
    throw new FirstAdminProvisioningError(
      "auth_failed",
      "Partner access was activated, but account confirmation could not be recorded."
    );
  }
  return {
    membershipCreated,
    replayPrevented: false,
    redirectTo: await postAcceptanceDestination(supabase, partnerSlug)
  };
}

export async function sendFirstAdminInvitationEmail(input: {
  partnerSlug: unknown;
  invitationId: unknown;
  setupLink: unknown;
  operatorUserId: string;
  now?: Date;
}) {
  const partnerSlug = normalizePartnerSlug(input.partnerSlug);
  const invitationId =
    typeof input.invitationId === "string" ? input.invitationId : "";
  const setupLink =
    typeof input.setupLink === "string" ? input.setupLink.trim() : "";
  const supabase = admin();
  const partner = await requirePartner(supabase, partnerSlug);
  const invitation = await readInvitation(supabase, partnerSlug);
  if (
    !invitation ||
    invitation.invitation_id !== invitationId ||
    effectiveInvitationStatus(invitation, input.now ?? new Date()) !==
      "pending"
  ) {
    throw new FirstAdminProvisioningError(
      "invitation_inactive",
      "That invitation is no longer active."
    );
  }
  const rawToken = setupTokenFromLink(setupLink);
  if (
    !rawToken ||
    !secureFirstAdminTokenMatches(rawToken, invitation.token_hash)
  ) {
    throw new FirstAdminProvisioningError(
      "invitation_inactive",
      "That invitation is no longer active."
    );
  }
  const config = getPartnerEmailDeliveryConfig();
  if (!config.enabled || config.provider !== "resend" || !config.from) {
    await appendAudit(
      supabase,
      partnerSlug,
      "first_admin_invitation_delivery_failed",
      {
        invitation_id: invitation.invitation_id,
        status: "failed",
        error_code: "provider_not_configured",
        occurred_at: (input.now ?? new Date()).toISOString()
      }
    );
    throw new FirstAdminProvisioningError(
      "delivery_unavailable",
      "Email delivery is not configured. Copy the secure setup link instead."
    );
  }
  await appendAudit(
    supabase,
    partnerSlug,
    "first_admin_invitation_delivery_requested",
    {
      invitation_id: invitation.invitation_id,
      status: "requested",
      actor_user_id: input.operatorUserId,
      occurred_at: (input.now ?? new Date()).toISOString()
    }
  );
  const rendered = renderFirstAdminInvitationEmail({
    organizationName:
      partner.organization_name ?? partner.partner_name ?? partnerSlug,
    administratorName: invitation.full_name,
    workEmail: invitation.email,
    setupUrl: setupLink,
    expiresAt: invitation.expires_at
  });
  const delivery = await sendPartnerEmailMessage({
    recipientEmail: invitation.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html
  });
  const status = delivery.status === "sent" ? "sent" : "failed";
  const providerMessageId =
    delivery.status === "sent" ? delivery.providerMessageId : undefined;
  const errorMessage =
    delivery.status === "sent" ? undefined : delivery.error;
  const deliveryRecord = await supabase.from("partner_email_deliveries").insert({
    partner_slug: partnerSlug,
    email_type: "first_admin_invitation",
    recipient_email: invitation.email,
    recipient_name: invitation.full_name,
    subject: rendered.subject,
    status,
    provider: "resend",
    provider_message_id: providerMessageId,
    sent_at: status === "sent" ? (input.now ?? new Date()).toISOString() : null,
    failed_at:
      status === "failed" ? (input.now ?? new Date()).toISOString() : null,
    error_message: errorMessage
  });
  if (deliveryRecord.error) {
    throw new FirstAdminProvisioningError(
      "write_failed",
      "Invitation delivery completed, but its delivery record could not be saved."
    );
  }
  const next: FirstAdminInvitationPayload = {
    ...invitation,
    revision: invitation.revision + 1,
    delivery_status: status
  };
  if (
    !(await compareAndSetInvitation(
      supabase,
      partnerSlug,
      invitation.revision,
      next
    ))
  ) {
    throw new FirstAdminProvisioningError(
      "invitation_conflict",
      "Invitation delivery completed while administrator access changed."
    );
  }
  await appendAudit(
    supabase,
    partnerSlug,
    status === "sent"
      ? "first_admin_invitation_delivery_succeeded"
      : "first_admin_invitation_delivery_failed",
    {
      invitation_id: invitation.invitation_id,
      status,
      occurred_at: (input.now ?? new Date()).toISOString()
    }
  );
  if (status !== "sent") {
    throw new FirstAdminProvisioningError(
      "delivery_failed",
      "The invitation was not sent. Copy the secure setup link and try again later."
    );
  }
  return { sent: true };
}

function baseView(input: {
  accessStatus: FirstAdminAccessView["accessStatus"];
  statusLabel: FirstAdminAccessView["statusLabel"];
  workspaceExists: boolean;
  invitation: FirstAdminInvitationPayload | null;
  administrator: FirstAdminAccessView["administrator"];
  history: FirstAdminHistoryItem[];
}): FirstAdminAccessView {
  return {
    ...input,
    emailDeliveryConfigured: getPartnerEmailDeliveryConfig().enabled,
    invitation: input.invitation
      ? invitationPublicFields(input.invitation)
      : null
  };
}

function admin() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new FirstAdminProvisioningError(
      "not_configured",
      "Partner administrator provisioning is not configured."
    );
  }
  return supabase;
}

async function requirePartner(supabase: SupabaseAdmin, partnerSlug: string) {
  const { data, error } = await supabase
    .from("partner_records")
    .select(
      "partner_slug, partner_name, organization_name, legal_name, target_state, state, selected_package_name"
    )
    .eq("partner_slug", partnerSlug)
    .maybeSingle();
  if (error) {
    throw persistenceReadFailure();
  }
  if (!data) {
    throw new FirstAdminProvisioningError(
      "partner_not_found",
      "Choose an existing partner."
    );
  }
  return data as PartnerRecordRow;
}

async function hasOnboardingWorkspace(
  supabase: SupabaseAdmin,
  partnerSlug: string
) {
  const { data, error } = await supabase
    .from("partner_onboarding")
    .select("partner_slug")
    .eq("partner_slug", partnerSlug)
    .maybeSingle();
  if (error) {
    throw persistenceReadFailure();
  }
  return Boolean(data);
}

async function readInvitation(
  supabase: SupabaseAdmin,
  partnerSlug: string
) {
  const { data, error } = await supabase
    .from("partner_events")
    .select("id, partner_slug, event_type, event_label, event_payload, created_at")
    .eq("id", firstAdminRecordId(partnerSlug))
    .eq("partner_slug", partnerSlug)
    .eq("event_type", invitationEventType)
    .maybeSingle();
  if (error) {
    throw persistenceReadFailure();
  }
  if (!data) return null;
  return parseFirstAdminInvitationPayload(
    (data as InvitationRecordRow).event_payload
  );
}

async function insertInvitation(
  supabase: SupabaseAdmin,
  partnerSlug: string,
  payload: FirstAdminInvitationPayload
) {
  const { error } = await supabase.from("partner_events").insert({
    id: firstAdminRecordId(partnerSlug),
    partner_slug: partnerSlug,
    event_type: invitationEventType,
    event_label: invitationEventLabel,
    event_payload: payload
  });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw persistenceWriteFailure();
}

async function compareAndSetInvitation(
  supabase: SupabaseAdmin,
  partnerSlug: string,
  expectedRevision: number,
  payload: FirstAdminInvitationPayload
) {
  const { data, error } = await supabase
    .from("partner_events")
    .update({
      event_label: invitationEventLabel,
      event_payload: payload
    })
    .eq("id", firstAdminRecordId(partnerSlug))
    .eq("partner_slug", partnerSlug)
    .eq("event_type", invitationEventType)
    .eq("event_payload->>revision", String(expectedRevision))
    .select("id")
    .maybeSingle();
  if (error) {
    throw persistenceWriteFailure();
  }
  return Boolean(data);
}

async function listActivePartnerAdmins(
  supabase: SupabaseAdmin,
  partnerSlug: string
) {
  const { data, error } = await supabase
    .from("partner_users")
    .select(
      "id, auth_user_id, invited_email, partner_slug, role, status, created_at"
    )
    .eq("partner_slug", partnerSlug)
    .eq("role", FIRST_ADMIN_ROLE)
    .eq("status", "active")
    .limit(3);
  if (error) {
    throw persistenceReadFailure();
  }
  return (data ?? []) as PartnerUserRow[];
}

async function findMembershipByAuthUser(
  supabase: SupabaseAdmin,
  authUserId: string
) {
  const { data, error } = await supabase
    .from("partner_users")
    .select(
      "id, auth_user_id, invited_email, partner_slug, role, status, created_at"
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) {
    throw persistenceReadFailure();
  }
  return data as PartnerUserRow | null;
}

async function appendAudit(
  supabase: SupabaseAdmin,
  partnerSlug: string,
  eventType: string,
  payload: Record<string, string>
) {
  const { error } = await supabase.from("partner_events").insert({
    partner_slug: partnerSlug,
    event_type: eventType,
    event_label: auditLabel(eventType),
    event_payload: payload
  });
  if (error) {
    throw persistenceWriteFailure();
  }
}

async function listInvitationHistory(
  supabase: SupabaseAdmin,
  partnerSlug: string
): Promise<FirstAdminHistoryItem[]> {
  const eventTypes = [
    "first_admin_invitation_created",
    "first_admin_invitation_delivery_requested",
    "first_admin_invitation_delivery_succeeded",
    "first_admin_invitation_delivery_failed",
    "first_admin_invitation_replaced",
    "first_admin_invitation_revoked",
    "first_admin_invitation_expired",
    "first_admin_invitation_claimed",
    "first_admin_invitation_accepted",
    "partner_admin_membership_created",
    "first_admin_replay_prevented"
  ];
  const { data, error } = await supabase
    .from("partner_events")
    .select("id, event_type, event_label, event_payload, created_at")
    .eq("partner_slug", partnerSlug)
    .in("event_type", eventTypes)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    throw persistenceReadFailure();
  }
  return (data ?? []).map((row) => {
    const payload =
      row.event_payload && typeof row.event_payload === "object"
        ? (row.event_payload as Record<string, unknown>)
        : {};
    return {
      id: String(row.id),
      event: String(row.event_type),
      label: String(row.event_label),
      status:
        typeof payload.status === "string" ? payload.status : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
      fullName:
        typeof payload.full_name === "string"
          ? payload.full_name
          : undefined,
      occurredAt:
        typeof payload.occurred_at === "string"
          ? payload.occurred_at
          : String(row.created_at)
    };
  });
}

async function markInvitationExpired(
  supabase: SupabaseAdmin,
  partnerSlug: string,
  invitation: FirstAdminInvitationPayload,
  now: Date
) {
  if (
    !["pending", "claiming", "claimed"].includes(invitation.status)
  ) {
    return;
  }
  const expired: FirstAdminInvitationPayload = {
    ...invitation,
    revision: invitation.revision + 1,
    status: "expired"
  };
  if (
    await compareAndSetInvitation(
      supabase,
      partnerSlug,
      invitation.revision,
      expired
    )
  ) {
    await safelyInvalidateInvitationAuthUser(supabase, invitation);
    await appendAudit(
      supabase,
      partnerSlug,
      "first_admin_invitation_expired",
      {
        invitation_id: invitation.invitation_id,
        status: "expired",
        occurred_at: now.toISOString()
      }
    );
  }
}

async function safelyInvalidateInvitationAuthUser(
  supabase: SupabaseAdmin,
  invitation: FirstAdminInvitationPayload
) {
  if (!invitation.auth_user_id) return;
  const membership = await findMembershipByAuthUser(
    supabase,
    invitation.auth_user_id
  );
  if (membership) return;
  const lookup = await supabase.auth.admin.getUserById(
    invitation.auth_user_id
  );
  if (lookup.error) {
    throw new FirstAdminProvisioningError(
      "auth_failed",
      "The invitation changed, but its unclaimed account could not be invalidated."
    );
  }
  const user = lookup.data.user;
  const metadata = parseSetupMetadata(
    user?.app_metadata?.[setupMetadataKey]
  );
  if (
    user &&
    metadata?.invitationId === invitation.invitation_id &&
    normalizeEmail(user.email) === invitation.email
  ) {
    const deletion = await supabase.auth.admin.deleteUser(user.id);
    if (deletion.error) {
      throw new FirstAdminProvisioningError(
        "auth_failed",
        "The invitation changed, but its unclaimed account could not be invalidated."
      );
    }
  }
}

async function findAuthUserByEmail(
  supabase: SupabaseAdmin,
  email: string
) {
  for (let page = 1; page <= 10; page += 1) {
    const result = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000
    });
    if (result.error) {
      throw new FirstAdminProvisioningError(
        "auth_failed",
        "Account setup is temporarily unavailable."
      );
    }
    const match = result.data.users.find(
      (user) => normalizeEmail(user.email) === email
    );
    if (match) return match;
    if (result.data.users.length < 1000) return null;
  }
  throw new FirstAdminProvisioningError(
    "auth_failed",
    "Account setup is temporarily unavailable."
  );
}

async function assertAuthUserCanReceiveInvitation(
  supabase: SupabaseAdmin,
  user: User,
  partnerSlug: string
) {
  const membership = await findMembershipByAuthUser(supabase, user.id);
  if (
    membership &&
    (membership.partner_slug !== partnerSlug ||
      membership.role !== FIRST_ADMIN_ROLE ||
      membership.status !== "active")
  ) {
    throw new FirstAdminProvisioningError(
      "auth_conflict",
      "Account setup is unavailable for this invitation."
    );
  }
  if (membership) {
    throw new FirstAdminProvisioningError(
      "administrator_exists",
      "Account setup is unavailable for this invitation."
    );
  }
}

async function postAcceptanceDestination(
  supabase: SupabaseAdmin,
  partnerSlug: string
) {
  const { data, error } = await supabase
    .from("partner_onboarding")
    .select("status")
    .eq("partner_slug", partnerSlug)
    .maybeSingle();
  if (error) {
    throw persistenceReadFailure();
  }
  return decidePostAcceptanceDestination({
    onboardingEnabled: isRcapPartnerOnboardingEnabled(),
    workspaceStatus:
      data && typeof data.status === "string" ? data.status : null
  });
}

function parseSetupMetadata(value: unknown): {
  invitationId: string;
  partnerSlug: string;
  email: string;
  role: typeof FIRST_ADMIN_ROLE;
  expiresAt: string;
  acceptedAt?: string;
} | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.invitationId !== "string" ||
    typeof data.partnerSlug !== "string" ||
    typeof data.email !== "string" ||
    data.role !== FIRST_ADMIN_ROLE ||
    typeof data.expiresAt !== "string"
  ) {
    return null;
  }
  return {
    invitationId: data.invitationId,
    partnerSlug: data.partnerSlug,
    email: normalizeEmail(data.email),
    role: FIRST_ADMIN_ROLE,
    expiresAt: data.expiresAt,
    acceptedAt:
      typeof data.acceptedAt === "string" ? data.acceptedAt : undefined
  };
}

function secureTokenHash(rawToken: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) {
    throw inactiveInvitation();
  }
  return hashFirstAdminToken(rawToken);
}

function setupTokenFromLink(value: string) {
  try {
    const url = new URL(value);
    const expected = new URL(absolutePartnerAppUrl("/"));
    if (
      url.origin !== expected.origin ||
      url.pathname !== "/partner/setup"
    ) {
      return null;
    }
    return url.searchParams.get("token");
  } catch {
    return null;
  }
}

function inactiveInvitation() {
  return new FirstAdminProvisioningError(
    "invitation_inactive",
    "This account setup invitation is invalid or no longer active."
  );
}

function persistenceReadFailure() {
  return new FirstAdminProvisioningError(
    "write_failed",
    "Administrator access data could not be read right now."
  );
}

function persistenceWriteFailure() {
  return new FirstAdminProvisioningError(
    "write_failed",
    "Administrator access could not be recorded."
  );
}

function auditLabel(eventType: string) {
  const labels: Record<string, string> = {
    first_admin_invitation_created: "First administrator invitation created",
    first_admin_invitation_delivery_requested:
      "Administrator invitation delivery requested",
    first_admin_invitation_delivery_succeeded:
      "Administrator invitation delivered",
    first_admin_invitation_delivery_failed:
      "Administrator invitation delivery failed",
    first_admin_invitation_replaced:
      "Administrator invitation replaced",
    first_admin_invitation_revoked:
      "Administrator invitation revoked",
    first_admin_invitation_expired:
      "Administrator invitation expired",
    first_admin_invitation_claimed:
      "Administrator invitation claimed",
    first_admin_invitation_accepted:
      "Administrator invitation accepted",
    partner_admin_membership_created:
      "Partner administrator membership created",
    first_admin_replay_prevented:
      "Duplicate administrator acceptance prevented"
  };
  return labels[eventType] ?? "Administrator access event";
}
