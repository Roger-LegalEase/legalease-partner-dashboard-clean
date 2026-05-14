import type { AppUser } from "@/lib/auth";
import type { Env } from "@/lib/env";
import { env } from "@/lib/env";

export type BetaAccessReason =
  | "allowed"
  | "beta_disabled"
  | "invite_required"
  | "user_limit_reached"
  | "record_check_disabled"
  | "monitoring_disabled";

export type BetaFlagStatus = {
  betaAccessEnabled: boolean;
  betaInviteOnly: boolean;
  betaMaxUsers: number;
  approvedEmailCount: number;
  inviteCodeCount: number;
  recordCheckPurchaseEnabled: boolean;
  monitoringPurchaseEnabled: boolean;
  aiSummaryEnabled: boolean;
  adminRetryEnabled: boolean;
  dataDeletionRequestEnabled: boolean;
};

type BetaEnv = Pick<
  Env,
  | "BETA_ACCESS_ENABLED"
  | "BETA_INVITE_ONLY"
  | "BETA_MAX_USERS"
  | "BETA_APPROVED_EMAILS"
  | "BETA_INVITE_CODES"
  | "RECORD_CHECK_PURCHASE_ENABLED"
  | "MONITORING_PURCHASE_ENABLED"
  | "AI_SUMMARY_ENABLED"
  | "ADMIN_RETRY_ENABLED"
  | "DATA_DELETION_REQUEST_ENABLED"
>;

function csvSet(value?: string): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getBetaFlagStatus(configEnv: BetaEnv = env): BetaFlagStatus {
  return {
    betaAccessEnabled: configEnv.BETA_ACCESS_ENABLED === "true",
    betaInviteOnly: configEnv.BETA_INVITE_ONLY === "true",
    betaMaxUsers: configEnv.BETA_MAX_USERS,
    approvedEmailCount: csvSet(configEnv.BETA_APPROVED_EMAILS).size,
    inviteCodeCount: csvSet(configEnv.BETA_INVITE_CODES).size,
    recordCheckPurchaseEnabled: configEnv.RECORD_CHECK_PURCHASE_ENABLED === "true",
    monitoringPurchaseEnabled: configEnv.MONITORING_PURCHASE_ENABLED === "true",
    aiSummaryEnabled: configEnv.AI_SUMMARY_ENABLED === "true",
    adminRetryEnabled: configEnv.ADMIN_RETRY_ENABLED === "true",
    dataDeletionRequestEnabled: configEnv.DATA_DELETION_REQUEST_ENABLED === "true"
  };
}

export function isBetaApprovedUser(
  user: Pick<AppUser, "email" | "role"> | null,
  options: { inviteCode?: string | null; currentApprovedUsers?: number; configEnv?: BetaEnv } = {}
): { allowed: boolean; reason: BetaAccessReason } {
  const configEnv = options.configEnv ?? env;
  const flags = getBetaFlagStatus(configEnv);

  if (!flags.betaAccessEnabled) {
    return { allowed: false, reason: "beta_disabled" };
  }

  if (flags.betaMaxUsers > 0 && (options.currentApprovedUsers ?? 0) >= flags.betaMaxUsers) {
    return { allowed: false, reason: "user_limit_reached" };
  }

  if (!flags.betaInviteOnly) {
    return { allowed: true, reason: "allowed" };
  }

  if (user?.role === "ADMIN") {
    return { allowed: true, reason: "allowed" };
  }

  const approvedEmails = csvSet(configEnv.BETA_APPROVED_EMAILS);
  if (user?.email && approvedEmails.has(user.email.toLowerCase())) {
    return { allowed: true, reason: "allowed" };
  }

  const inviteCodes = csvSet(configEnv.BETA_INVITE_CODES);
  if (options.inviteCode && inviteCodes.has(options.inviteCode.toLowerCase())) {
    return { allowed: true, reason: "allowed" };
  }

  return { allowed: false, reason: "invite_required" };
}

export function canStartRecordCheckCheckout(
  user: Pick<AppUser, "email" | "role"> | null,
  options: { inviteCode?: string | null; currentApprovedUsers?: number; configEnv?: BetaEnv } = {}
): { allowed: boolean; reason: BetaAccessReason } {
  const configEnv = options.configEnv ?? env;
  if (configEnv.RECORD_CHECK_PURCHASE_ENABLED !== "true") {
    return { allowed: false, reason: "record_check_disabled" };
  }
  return isBetaApprovedUser(user, options);
}

export function canStartMonitoringCheckout(
  user: Pick<AppUser, "email" | "role"> | null,
  options: { inviteCode?: string | null; currentApprovedUsers?: number; configEnv?: BetaEnv } = {}
): { allowed: boolean; reason: BetaAccessReason } {
  const configEnv = options.configEnv ?? env;
  if (configEnv.MONITORING_PURCHASE_ENABLED !== "true") {
    return { allowed: false, reason: "monitoring_disabled" };
  }
  return isBetaApprovedUser(user, options);
}

export function betaAccessMessage(reason: BetaAccessReason): string {
  switch (reason) {
    case "beta_disabled":
      return "RecordShield beta access is temporarily unavailable.";
    case "invite_required":
      return "RecordShield beta purchases are invite-only right now.";
    case "user_limit_reached":
      return "The current beta cohort is full.";
    case "record_check_disabled":
      return "Record Check purchases are temporarily paused.";
    case "monitoring_disabled":
      return "Monitoring purchases are temporarily paused.";
    default:
      return "Access allowed.";
  }
}

export function inviteCodeFromRequest(request: Request, body?: { inviteCode?: string | null } | null): string | null {
  const url = new URL(request.url);
  return body?.inviteCode ?? request.headers.get("x-beta-invite-code") ?? url.searchParams.get("inviteCode");
}

export function assertAdminCanManageBeta(user: Pick<AppUser, "role">): void {
  if (user.role !== "ADMIN") {
    throw new Error("Admin role required to change beta launch settings.");
  }
}
