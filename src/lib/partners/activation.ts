import { seedPartners } from "./seed-partners";
import type { PartnerAssetStatus, PartnerEvent, PartnerRecord } from "./types";

type ReadinessState = "ready" | "needs_attention" | "locked" | "mock_only";

export type ActivationReadinessCheck = {
  id: string;
  label: string;
  state: ReadinessState;
  detail: string;
};

export type ActivationReadiness = {
  partnerSlug: string;
  ready: boolean;
  checks: ActivationReadinessCheck[];
};

const readinessAssetKeys = [
  "partnerLandingPage",
  "onboardingHub",
  "dashboard",
  "launchKit",
  "emailSequence"
] as const;

const seedEventTypes = [
  "request_received",
  "qualification_review_started",
  "demo_payment_recorded",
  "provisioning_started",
  "asset_generated",
  "partner_activated"
] as const;

const seedEventLabels: Record<(typeof seedEventTypes)[number], string> = {
  request_received: "Request received",
  qualification_review_started: "Qualification review started",
  demo_payment_recorded: "Demo payment recorded",
  provisioning_started: "Provisioning started",
  asset_generated: "Activation asset generated",
  partner_activated: "Partner activated"
};

export function getPartnerEvents(slug: string): PartnerEvent[] {
  const partner = seedPartners.find((record) => record.partnerSlug === slug);
  if (!partner) {
    return [];
  }

  const createdAt = new Date(partner.createdAt);

  return seedEventTypes
    .map((eventType, index) => ({
      id: `${slug}-${eventType}`,
      partnerSlug: slug,
      eventType,
      eventLabel: seedEventLabels[eventType],
      eventPayload: {
        source: "local_seed",
        owner: partner.assignedOwner,
        mockOnly: true
      },
      createdAt: new Date(createdAt.getTime() + index * 36 * 60 * 60 * 1000).toISOString()
    }))
    .filter((event) => eventAppliesToPartner(event.eventType, partner));
}

export function getRecentPartnerEvents(): PartnerEvent[] {
  return seedPartners
    .flatMap((partner) => getPartnerEvents(partner.partnerSlug))
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    .slice(0, 10);
}

export function getActivationReadiness(slug: string): ActivationReadiness | undefined {
  const partner = seedPartners.find((record) => record.partnerSlug === slug);
  if (!partner) {
    return undefined;
  }

  const checks: ActivationReadinessCheck[] = [
    {
      id: "qualification",
      label: "Partner is qualified",
      state: partner.qualificationStatus === "qualified" ? "ready" : "needs_attention",
      detail: partner.qualificationStatus
    },
    {
      id: "payment",
      label: "Payment is complete or demo-paid",
      state: partner.paymentStatus === "demo_paid" || partner.paymentStatus === "paid" ? "ready" : "needs_attention",
      detail: partner.paymentStatus
    },
    ...readinessAssetKeys.map((assetKey) => {
      const asset = partner.assets[assetKey];
      return {
        id: assetKey,
        label: `${asset.label} is ready or active`,
        state: assetStatusState(asset.status),
        detail: asset.status
      } satisfies ActivationReadinessCheck;
    }),
    {
      id: "reports",
      label: "Reports asset is ready, scheduled, or active",
      state: reportsState(partner),
      detail: partner.assets.weeklyReports.status
    },
    {
      id: "mock_only",
      label: "Admin writes are write-ready in Phase 8",
      state: "mock_only",
      detail: "Persistent admin writes run only when Supabase partner data is enabled and configured."
    }
  ];

  return {
    partnerSlug: slug,
    ready: checks.every((check) => check.state === "ready" || check.state === "mock_only"),
    checks
  };
}

function eventAppliesToPartner(eventType: string, partner: PartnerRecord) {
  if (eventType === "demo_payment_recorded") {
    return partner.paymentStatus === "demo_paid" || partner.paymentStatus === "paid";
  }

  if (eventType === "provisioning_started" || eventType === "asset_generated") {
    return ["provisioning", "active"].includes(partner.provisioningStatus);
  }

  if (eventType === "partner_activated") {
    return partner.provisioningStatus === "active";
  }

  return true;
}

function assetStatusState(status: PartnerAssetStatus): ReadinessState {
  if (status === "ready" || status === "active") {
    return "ready";
  }

  if (status === "locked") {
    return "locked";
  }

  return "needs_attention";
}

function reportsState(partner: PartnerRecord): ReadinessState {
  const reportStatuses = [partner.assets.weeklyReports.status, partner.assets.finalImpactReport.status];

  if (reportStatuses.some((status) => status === "ready" || status === "active")) {
    return "ready";
  }

  if (reportStatuses.every((status) => status === "locked")) {
    return "locked";
  }

  return "needs_attention";
}
