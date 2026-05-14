import type { Prisma } from "@prisma/client";
import type { WilmaLaunchConfig } from "@/wilma/launch/types";

export type WilmaAdminFacts = {
  state?: string | null;
  county?: string | null;
  caseId?: string | null;
  jurisdiction?: string | null;
  offenseCategory?: string | null;
  dispositionDate?: string | null;
  sentenceCompleted?: string | null;
  hasOpenCase?: string | null;
  hasOutstandingBalance?: string | null;
};

export type WilmaAdminDecision = {
  id?: string;
  status?: string;
  documentTarget?: string;
  ruleVersion?: string;
  reasonCodes?: string[];
  reasons?: Array<{ code?: string; message?: string }>;
  evaluatedAt?: string;
};

export function asWilmaAdminFacts(value: Prisma.JsonValue): WilmaAdminFacts {
  return isRecord(value) ? (value as WilmaAdminFacts) : {};
}

export function asWilmaAdminDecision(value: Prisma.JsonValue | null): WilmaAdminDecision | null {
  return isRecord(value) ? (value as WilmaAdminDecision) : null;
}

export function wilmaReasonCodes(decision: WilmaAdminDecision | null): string[] {
  if (!decision) {
    return [];
  }
  if (decision.reasonCodes?.length) {
    return decision.reasonCodes;
  }
  return decision.reasons?.flatMap((reason) => (reason.code ? [reason.code] : [])) ?? [];
}

export function prettyWilmaJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function formatWilmaAdminDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

export function wilmaConversionLabel(
  handoffAt: Date | null,
  orderStatus: string | undefined,
  leadEmail: string | null
): string {
  if (handoffAt) {
    return "document handoff";
  }
  if (orderStatus === "PAID") {
    return "paid checkout";
  }
  if (orderStatus) {
    return `checkout ${orderStatus.toLowerCase()}`;
  }
  if (leadEmail) {
    return "email captured";
  }
  return "chat started";
}

export function wilmaLaunchConfigSummary(config: WilmaLaunchConfig): Array<{ label: string; value: string }> {
  return [
    { label: "Public enabled", value: config.publicEnabled ? "yes" : "no" },
    { label: "Beta only", value: config.betaOnly ? "yes" : "no" },
    { label: "Allowed states", value: config.allowedStates.join(", ") || "none" },
    { label: "Rollout percent", value: `${config.rolloutPercent}%` },
    { label: "Maintenance mode", value: config.maintenanceMode ? "on" : "off" },
    { label: "Kill switch", value: config.killSwitch ? "on" : "off" }
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
