import { NextResponse } from "next/server";
import {
  type PartnerAdminAction,
  validateAdminActionRequest
} from "@/lib/partners/admin-actions";
import {
  activatePartner,
  addPartnerEvent,
  addPartnerInternalNote,
  getPartnerRecordBySlug,
  pausePartner,
  updatePartnerAssetStatus,
  updatePartnerPaymentStatus,
  updatePartnerProvisioningStatus,
  updatePartnerQualificationStatus
} from "@/lib/partners/partner-repository";
import type { PartnerWriteResult, PartnerAssetKey } from "@/lib/partners/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid admin action request." }, { status: 400 });
  }

  const validation = validateAdminActionRequest(body && typeof body === "object" ? body : {});
  if (!validation.success) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  const { action, partnerSlug, assetKey, note } = validation.data;
  const partner = await getPartnerRecordBySlug(partnerSlug);
  if (!partner) {
    return NextResponse.json({ success: false, error: "Unknown partner." }, { status: 404 });
  }

  const result = await runAdminAction({ action, partnerSlug, assetKey, note, currentProvisioningStatus: partner.provisioningStatus });
  const status = result.success ? 200 : 500;

  return NextResponse.json(
    {
      success: result.success,
      persisted: result.persisted,
      mode: result.mode,
      action,
      partnerSlug,
      message: result.message,
      error: result.error
    },
    { status }
  );
}

async function runAdminAction({
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
      () => updatePartnerPaymentStatus(partnerSlug, "demo_paid"),
      ...(["active", "paused"].includes(currentProvisioningStatus)
        ? []
        : [() => updatePartnerProvisioningStatus(partnerSlug, "payment_complete" as const)]),
      () => addPartnerEvent(partnerSlug, "demo_payment_recorded", "Demo payment recorded", { source: "admin_action" })
    ];

    return runSteps(action, partnerSlug, steps);
  }

  if (action === "move_to_provisioning") {
    return runSteps(action, partnerSlug, [
      () => updatePartnerProvisioningStatus(partnerSlug, "provisioning"),
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
