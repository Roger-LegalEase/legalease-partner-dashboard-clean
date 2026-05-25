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

export function getMockAdminActionMessage(action: PartnerAdminAction, partnerSlug: string) {
  return `${partnerAdminActionLabels[action]} accepted for ${partnerSlug}. Mock action only. Persistent admin writes will be enabled in the Supabase write phase.`;
}
