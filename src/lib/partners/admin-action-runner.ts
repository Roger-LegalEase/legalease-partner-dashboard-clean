import {
  type PartnerAdminAction
} from "@/lib/partners/admin-actions";
import {
  activatePartner,
  addPartnerEvent,
  addPartnerInternalNote,
  pausePartner,
  updatePartnerAssetStatus,
  updatePartnerPaymentStatus,
  updatePartnerProvisioningStatus,
  updatePartnerQualificationStatus
} from "@/lib/partners/partner-repository";
import type { PartnerAssetKey, PartnerWriteResult } from "@/lib/partners/types";

export async function runPartnerAdminAction({
  action,
  partnerSlug,
  assetKey,
  note,
  currentProvisioningStatus
}: {
  action: PartnerAdminAction;
  partnerSlug: string;
  assetKey?: string;
  note?: string;
  currentProvisioningStatus: string;
}): Promise<PartnerWriteResult> {
  if (action === "mark_qualified") {
    return runSteps(action, partnerSlug, [
      () => updatePartnerQualificationStatus(partnerSlug, "qualified"),
      () => addPartnerEvent(partnerSlug, "qualification_completed", "Qualification completed", { source: "admin_action" })
    ]);
  }

  if (action === "mark_payment_complete") {
    const steps = [
      () => updatePartnerPaymentStatus(partnerSlug, "paid"),
      ...(["provisioned", "active", "paused"].includes(currentProvisioningStatus)
        ? []
        : [() => updatePartnerProvisioningStatus(partnerSlug, "ready_for_onboarding" as const)]),
      () => addPartnerEvent(partnerSlug, "payment_confirmed", "Payment confirmed", { source: "admin_action" })
    ];

    return runSteps(action, partnerSlug, steps);
  }

  if (action === "move_to_provisioning") {
    return runSteps(action, partnerSlug, [
      () => updatePartnerProvisioningStatus(partnerSlug, "provisioning_in_progress"),
      () => addPartnerEvent(partnerSlug, "provisioning_started", "Provisioning started", { source: "admin_action" })
    ]);
  }

  if (action === "activate_partner") {
    return runSteps(action, partnerSlug, [
      () => activatePartner(partnerSlug),
      () => addPartnerEvent(partnerSlug, "partner_activated", "Partner activated", { source: "admin_action" })
    ]);
  }

  if (action === "pause_partner") {
    return runSteps(action, partnerSlug, [
      () => pausePartner(partnerSlug),
      () => addPartnerEvent(partnerSlug, "partner_paused", "Partner paused", { source: "admin_action" })
    ]);
  }

  if (action === "mark_asset_ready" && assetKey) {
    return runSteps(action, partnerSlug, [
      () => updatePartnerAssetStatus(partnerSlug, assetKey as PartnerAssetKey, "ready"),
      () => addPartnerEvent(partnerSlug, "asset_ready", "Asset ready", { source: "admin_action", assetKey })
    ]);
  }

  if (action === "mark_asset_active" && assetKey) {
    return runSteps(action, partnerSlug, [
      () => updatePartnerAssetStatus(partnerSlug, assetKey as PartnerAssetKey, "active"),
      () => addPartnerEvent(partnerSlug, "asset_activated", "Asset activated", { source: "admin_action", assetKey })
    ]);
  }

  if (action === "add_internal_note" && note) {
    return runSteps(action, partnerSlug, [() => addPartnerInternalNote(partnerSlug, note)]);
  }

  return {
    success: false,
    persisted: false,
    mode: "local_fallback",
    action,
    partnerSlug,
    message: "Unsupported admin action.",
    error: "Unsupported admin action."
  };
}

async function runSteps(
  action: PartnerAdminAction,
  partnerSlug: string,
  steps: Array<() => Promise<PartnerWriteResult>>
): Promise<PartnerWriteResult> {
  let lastResult: PartnerWriteResult | undefined;

  for (const step of steps) {
    const result = await step();
    lastResult = result;

    if (!result.success) {
      return { ...result, action };
    }
  }

  return {
    ...(lastResult ?? {
      success: false,
      persisted: false,
      mode: "local_fallback" as const,
      message: "Admin action did not run.",
      partnerSlug
    }),
    action,
    message: lastResult?.message ?? "Admin action completed."
  };
}
