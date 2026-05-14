import type { WilmaAnalyticsBackend } from "@/wilma/analytics/types";

export type WilmaAbuseBlockReason =
  | "message_cap_reached"
  | "session_expired"
  | "ip_rate_limited"
  | "email_session_limit"
  | "ip_session_limit"
  | "device_session_limit"
  | "bot_protection_failed";

export type WilmaAbuseDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: WilmaAbuseBlockReason;
      assistantMessage: string;
    };

export type WilmaAbuseIdentity = {
  ip?: string | null;
  email?: string | null;
  deviceId?: string | null;
};

export type WilmaSessionUsage = {
  userMessageCount: number;
  lastMessageAt?: Date | null;
  createdAt?: Date | null;
};

export type WilmaAbuseBackend = WilmaAnalyticsBackend & {
  getSessionUsage?(input: { sessionId: string }): Promise<WilmaSessionUsage | null>;
  countSessionsByEmailSince?(input: { email: string; since: Date }): Promise<number>;
  countSessionsByIpSince?(input: { ip: string; since: Date }): Promise<number>;
  countSessionsByDeviceSince?(input: { deviceId: string; since: Date }): Promise<number>;
  countChatRequestsByIpSince?(input: { ip: string; since: Date }): Promise<number>;
};

export const WILMA_ABUSE_LIMITS = {
  maxUserMessagesPerSession: 40,
  sessionInactivityMs: 24 * 60 * 60 * 1000,
  maxSessionsPerEmailPer30Days: 3,
  maxSessionsPerIpPerDay: 10,
  maxSessionsPerDevicePer30Days: 3,
  maxChatRequestsPerIpPerHour: 60
} as const;

export const wilmaMessageCapCopy =
  "I've reached the limit for this free eligibility screening. You can start a new screening later or continue with the next step if you already received a document-prep result.";

export const wilmaAbuseFallbackCopy =
  "We're unable to continue this screening right now. Please try again later.";
