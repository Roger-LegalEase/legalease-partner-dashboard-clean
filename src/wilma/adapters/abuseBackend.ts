import type { WilmaAbuseBlockReason } from "@/wilma/abuse/types";
import type { WilmaRiskFlag } from "@/wilma/analytics/types";

export function riskFlagForWilmaAbuseReason(reason: WilmaAbuseBlockReason): WilmaRiskFlag {
  switch (reason) {
    case "message_cap_reached":
      return "message_cap_reached";
    case "session_expired":
      return "session_expired";
    case "bot_protection_failed":
      return "bot_protection_failed";
    case "email_session_limit":
    case "ip_session_limit":
    case "device_session_limit":
      return "repeat_screening_abuse";
    case "ip_rate_limited":
      return "rate_limit_hit";
  }
}
