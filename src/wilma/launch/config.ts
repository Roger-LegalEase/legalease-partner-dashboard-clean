import { wilmaSupportedStates, type SupportedState } from "@/wilma/chat/rules";
import type { WilmaLaunchConfig } from "@/wilma/launch/types";

export function getWilmaLaunchConfig(env: Record<string, string | undefined> = process.env): WilmaLaunchConfig {
  return {
    publicEnabled: parseBoolean(env.WILMA_PUBLIC_ENABLED, true),
    betaOnly: parseBoolean(env.WILMA_BETA_ONLY, false),
    allowedStates: parseAllowedStates(env.WILMA_ALLOWED_STATES),
    rolloutPercent: parseRolloutPercent(env.WILMA_ROLLOUT_PERCENT),
    maintenanceMode: parseBoolean(env.WILMA_MAINTENANCE_MODE, false),
    killSwitch: parseBoolean(env.WILMA_KILL_SWITCH, false),
    betaAllowedEmails: parseList(env.WILMA_BETA_ALLOWED_EMAILS ?? env.BETA_APPROVED_EMAILS).map((email) =>
      email.toLowerCase()
    ),
    betaTokens: parseList(env.WILMA_BETA_TOKENS ?? env.BETA_INVITE_CODES)
  };
}

export function parseAllowedStates(value: string | undefined): SupportedState[] {
  if (!value?.trim()) {
    return [...wilmaSupportedStates];
  }

  const allowed = new Set(wilmaSupportedStates);
  return parseList(value).flatMap((state) => {
    const normalized = state.toUpperCase();
    return allowed.has(normalized as SupportedState) ? [normalized as SupportedState] : [];
  });
}

function parseRolloutPercent(value: string | undefined): number {
  if (!value?.trim()) {
    return 100;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.trunc(parsed)));
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value?.trim()) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseList(value: string | undefined): string[] {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}
