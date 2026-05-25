export const supportedPartnerAdminActions = [
  "mark_qualified",
  "mark_payment_complete",
  "move_to_provisioning",
  "activate_partner",
  "pause_partner",
  "mark_asset_ready",
  "mark_asset_active",
  "add_internal_note"
] as const;

export type PartnerAdminAction = (typeof supportedPartnerAdminActions)[number];

export type PartnerAdminActionRequest = {
  action?: unknown;
  partnerSlug?: unknown;
  assetKey?: unknown;
  note?: unknown;
};

export type PartnerAdminActionValidationResult =
  | {
      success: true;
      data: {
        action: PartnerAdminAction;
        partnerSlug: string;
        assetKey?: string;
        note?: string;
      };
    }
  | {
      success: false;
      error: string;
    };

export const partnerAdminActionLabels: Record<PartnerAdminAction, string> = {
  mark_qualified: "Mark Qualified",
  mark_payment_complete: "Mark Payment Complete",
  move_to_provisioning: "Move to Provisioning",
  activate_partner: "Activate Partner",
  pause_partner: "Pause Partner",
  mark_asset_ready: "Mark Asset Ready",
  mark_asset_active: "Mark Asset Active",
  add_internal_note: "Add Internal Note"
};

export function isSupportedPartnerAdminAction(action: string): action is PartnerAdminAction {
  return supportedPartnerAdminActions.includes(action as PartnerAdminAction);
}

export function requiresAssetKey(action: PartnerAdminAction): boolean {
  return action === "mark_asset_ready" || action === "mark_asset_active";
}

export function requiresNote(action: PartnerAdminAction): boolean {
  return action === "add_internal_note";
}

export function validateAdminActionRequest(payload: PartnerAdminActionRequest): PartnerAdminActionValidationResult {
  const action = typeof payload.action === "string" ? payload.action.trim() : "";
  const partnerSlug = typeof payload.partnerSlug === "string" ? payload.partnerSlug.trim() : "";
  const assetKey = typeof payload.assetKey === "string" ? payload.assetKey.trim() : undefined;
  const note = typeof payload.note === "string" ? payload.note.trim() : undefined;

  if (!partnerSlug || !isSafeToken(partnerSlug)) {
    return { success: false, error: "A valid partnerSlug is required." };
  }

  if (!action || !isSupportedPartnerAdminAction(action)) {
    return { success: false, error: "Unsupported admin action." };
  }

  if (requiresAssetKey(action) && (!assetKey || !isSafeToken(assetKey))) {
    return { success: false, error: "assetKey is required for asset admin actions." };
  }

  if (requiresNote(action) && (!note || note.length > 1000)) {
    return { success: false, error: "note is required for add_internal_note and must be 1000 characters or fewer." };
  }

  return {
    success: true,
    data: {
      action,
      partnerSlug,
      assetKey,
      note
    }
  };
}

export function getMockAdminActionMessage(action: PartnerAdminAction, partnerSlug: string) {
  return `${partnerAdminActionLabels[action]} accepted for ${partnerSlug}. Write-ready action accepted. Supabase persistence depends on server configuration.`;
}

function isSafeToken(value: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(value);
}
