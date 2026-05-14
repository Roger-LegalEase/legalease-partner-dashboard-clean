import {
  WILMA_ABUSE_LIMITS,
  wilmaAbuseFallbackCopy,
  wilmaMessageCapCopy,
  type WilmaAbuseBackend,
  type WilmaAbuseDecision
} from "@/wilma/abuse/types";

export async function enforceWilmaSessionLimits(input: {
  backend: WilmaAbuseBackend;
  sessionId?: string;
  now: Date;
}): Promise<WilmaAbuseDecision> {
  if (!input.sessionId || !input.backend.getSessionUsage) {
    return { allowed: true };
  }

  const usage = await input.backend.getSessionUsage({ sessionId: input.sessionId });
  if (!usage) {
    return { allowed: true };
  }

  if (usage.userMessageCount >= WILMA_ABUSE_LIMITS.maxUserMessagesPerSession) {
    return { allowed: false, reason: "message_cap_reached", assistantMessage: wilmaMessageCapCopy };
  }

  const lastActiveAt = usage.lastMessageAt ?? usage.createdAt;
  if (lastActiveAt && input.now.getTime() - lastActiveAt.getTime() > WILMA_ABUSE_LIMITS.sessionInactivityMs) {
    return { allowed: false, reason: "session_expired", assistantMessage: wilmaAbuseFallbackCopy };
  }

  return { allowed: true };
}
