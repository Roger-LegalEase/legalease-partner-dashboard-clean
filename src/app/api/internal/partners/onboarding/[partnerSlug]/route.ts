import { NextRequest, NextResponse } from "next/server";
import { getSafeRequestId, logSecurityInfo } from "@/lib/observability/logger";
import { inviteAndMapPartnerUser } from "@/lib/partners/add-partner-user";
import {
  configureAccessMode,
  configureBilling,
  getOnboarding,
  markLandingPageReady,
  markLive,
  pauseOnboarding,
  recordAdminInvited,
  setOnboardingStatus,
  startOnboardingForExistingPartner,
  updateBranding,
  updateProfile,
  updateTask,
  type AgreementStatus,
  type OnboardingStatus,
  type TaskOwner,
  type TaskStatus
} from "@/lib/partners/partner-onboarding";
import { buildPartnerLaunchMaterials } from "@/lib/partners/partner-launch-materials";
import { recordLaunchMaterialsGenerated } from "@/lib/partners/partner-onboarding";
import type { PartnerAccessMode } from "@/lib/partners/partner-access-codes";
import { denyUnlessInternalAdmin, onboardingErrorResponse } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/partners/onboarding/[partnerSlug]";

export async function GET(request: NextRequest, { params }: { params: Promise<{ partnerSlug: string }> }) {
  const requestId = getSafeRequestId(request);
  const denied = await denyUnlessInternalAdmin(requestId);
  if (denied) return denied;
  const { partnerSlug } = await params;
  try {
    const onboarding = await getOnboarding(partnerSlug);
    return NextResponse.json({ success: true, onboarding });
  } catch (error) {
    return onboardingErrorResponse(error, requestId, "read");
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ partnerSlug: string }> }) {
  const requestId = getSafeRequestId(request);
  const denied = await denyUnlessInternalAdmin(requestId);
  if (denied) return denied;
  const { partnerSlug } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const payload = (body.payload && typeof body.payload === "object" ? body.payload : {}) as Record<string, unknown>;

  try {
    switch (action) {
      case "start":
        return ok(await startOnboardingForExistingPartner(partnerSlug));
      case "profile":
        return ok(await updateProfile(partnerSlug, {
          organizationName: optStr(payload.organizationName),
          publicDisplayName: optStr(payload.publicDisplayName),
          website: optStr(payload.website),
          organizationType: optStr(payload.organizationType),
          primaryContactName: optStr(payload.primaryContactName),
          primaryContactEmail: optStr(payload.primaryContactEmail),
          primaryContactPhone: optStr(payload.primaryContactPhone),
          targetState: optStr(payload.targetState),
          targetCounty: optStr(payload.targetCounty),
          programDescription: optStr(payload.programDescription),
          internalNotes: optStr(payload.internalNotes)
        }));
      case "billing":
        return ok(await configureBilling(partnerSlug, {
          packetCap: Number(payload.packetCap),
          packageName: optStr(payload.packageName),
          overageEnabled: payload.overageEnabled === true,
          overagePacketPriceCents: payload.overagePacketPriceCents != null ? Number(payload.overagePacketPriceCents) : undefined,
          pauseAtCap: payload.pauseAtCap === true,
          agreementStatus: optStr(payload.agreementStatus) as AgreementStatus | undefined,
          agreementDate: optStr(payload.agreementDate) ?? null,
          billingContactName: optStr(payload.billingContactName) ?? null,
          billingContactEmail: optStr(payload.billingContactEmail) ?? null,
          internalBillingNotes: optStr(payload.internalBillingNotes) ?? null
        }));
      case "access_mode":
        return ok(await configureAccessMode(partnerSlug, String(payload.accessMode) as PartnerAccessMode));
      case "branding":
        return ok(await updateBranding(partnerSlug, {
          publicDisplayName: optStr(payload.publicDisplayName),
          publicHeadline: optStr(payload.publicHeadline),
          publicSubheadline: optStr(payload.publicSubheadline),
          supportInstructions: optStr(payload.supportInstructions),
          showPartnerLogo: payload.showPartnerLogo === undefined ? undefined : payload.showPartnerLogo === true,
          showPoweredBy: payload.showPoweredBy === undefined ? undefined : payload.showPoweredBy === true,
          logoUrl: optStr(payload.logoUrl)
        }));
      case "landing_ready":
        return ok(await markLandingPageReady(partnerSlug));
      case "task":
        await updateTask(partnerSlug, String(payload.taskKey), {
          status: optStr(payload.status) as TaskStatus | undefined,
          owner: optStr(payload.owner) as TaskOwner | undefined,
          notes: optStr(payload.notes) ?? null
        });
        return ok(await getOnboarding(partnerSlug));
      case "status":
        return ok(await setOnboardingStatus(partnerSlug, String(payload.status) as OnboardingStatus));
      case "invite": {
        const result = await inviteAndMapPartnerUser({
          partnerSlug,
          email: payload.email,
          role: payload.role ?? "partner_admin",
          name: payload.name
        });
        if (!result.ok) {
          return NextResponse.json({ success: false, error: result.error, code: result.code }, { status: result.code === "invalid_input" || result.code === "partner_not_found" ? 400 : 409 });
        }
        await recordAdminInvited(partnerSlug, result.email);
        logSecurityInfo({ event: "partner onboarding admin invited", route: ROUTE, outcome: "ok", requestId });
        return ok(await getOnboarding(partnerSlug));
      }
      case "launch_materials": {
        const materials = await buildPartnerLaunchMaterials(partnerSlug);
        await recordLaunchMaterialsGenerated(partnerSlug);
        return NextResponse.json({ success: true, materials, onboarding: await getOnboarding(partnerSlug) });
      }
      case "go_live":
        return ok(await markLive(partnerSlug));
      case "pause":
        return ok(await pauseOnboarding(partnerSlug));
      default:
        return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
    }
  } catch (error) {
    return onboardingErrorResponse(error, requestId, action || "action");
  }
}

function ok(onboarding: unknown) {
  return NextResponse.json({ success: true, onboarding });
}

function optStr(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
