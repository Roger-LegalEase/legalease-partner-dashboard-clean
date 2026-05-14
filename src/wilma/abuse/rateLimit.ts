import {
  WILMA_ABUSE_LIMITS,
  wilmaAbuseFallbackCopy,
  type WilmaAbuseBackend,
  type WilmaAbuseDecision,
  type WilmaAbuseIdentity
} from "@/wilma/abuse/types";

export async function enforceWilmaAbuseRateLimits(input: {
  backend: WilmaAbuseBackend;
  identity: WilmaAbuseIdentity;
  isNewSession: boolean;
  now: Date;
}): Promise<WilmaAbuseDecision> {
  const hourAgo = new Date(input.now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(input.now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(input.now.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (input.identity.ip && input.backend.countChatRequestsByIpSince) {
    const chatRequests = await input.backend.countChatRequestsByIpSince({ ip: input.identity.ip, since: hourAgo });
    if (chatRequests >= WILMA_ABUSE_LIMITS.maxChatRequestsPerIpPerHour) {
      return { allowed: false, reason: "ip_rate_limited", assistantMessage: wilmaAbuseFallbackCopy };
    }
  }

  if (!input.isNewSession) {
    return { allowed: true };
  }

  if (input.identity.email && input.backend.countSessionsByEmailSince) {
    const sessions = await input.backend.countSessionsByEmailSince({ email: input.identity.email, since: thirtyDaysAgo });
    if (sessions >= WILMA_ABUSE_LIMITS.maxSessionsPerEmailPer30Days) {
      return { allowed: false, reason: "email_session_limit", assistantMessage: wilmaAbuseFallbackCopy };
    }
  }

  if (input.identity.deviceId && input.backend.countSessionsByDeviceSince) {
    const sessions = await input.backend.countSessionsByDeviceSince({ deviceId: input.identity.deviceId, since: thirtyDaysAgo });
    if (sessions >= WILMA_ABUSE_LIMITS.maxSessionsPerDevicePer30Days) {
      return { allowed: false, reason: "device_session_limit", assistantMessage: wilmaAbuseFallbackCopy };
    }
  }

  if (input.identity.ip && input.backend.countSessionsByIpSince) {
    const sessions = await input.backend.countSessionsByIpSince({ ip: input.identity.ip, since: dayAgo });
    if (sessions >= WILMA_ABUSE_LIMITS.maxSessionsPerIpPerDay) {
      return { allowed: false, reason: "ip_session_limit", assistantMessage: wilmaAbuseFallbackCopy };
    }
  }

  return { allowed: true };
}
