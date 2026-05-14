import { wilmaSupportedStates, type SupportedState } from "@/wilma/chat/rules";
import type {
  PublicWilmaLaunchConfig,
  WilmaLaunchAccessDecision,
  WilmaLaunchAccessInput,
  WilmaLaunchConfig
} from "@/wilma/launch/types";

export const WILMA_UNAVAILABLE_COPY = "Wilma is not available right now. Please check back soon.";
export const WILMA_MAINTENANCE_COPY = "Wilma is temporarily offline while we make updates. Please check back soon.";

export function evaluateWilmaLaunchAccess(
  config: WilmaLaunchConfig,
  input: WilmaLaunchAccessInput = {}
): WilmaLaunchAccessDecision {
  if (config.killSwitch) {
    return blocked(config, "killed", "wilma_kill_switch", WILMA_UNAVAILABLE_COPY);
  }

  if (config.maintenanceMode) {
    return blocked(config, "maintenance", "wilma_maintenance", WILMA_MAINTENANCE_COPY);
  }

  if (!config.publicEnabled) {
    return blocked(config, "disabled", "wilma_disabled", WILMA_UNAVAILABLE_COPY);
  }

  if (input.state && isSupportedState(input.state) && !config.allowedStates.includes(input.state)) {
    return blocked(config, "available", "state_not_enabled_for_beta", WILMA_UNAVAILABLE_COPY);
  }

  if (config.betaOnly && !hasBetaAccess(config, input)) {
    return blocked(config, "beta_only", "beta_access_required", WILMA_UNAVAILABLE_COPY);
  }

  if (!isInRollout(config, input)) {
    return blocked(config, "rollout", "rollout_not_selected", WILMA_UNAVAILABLE_COPY);
  }

  return {
    allowed: true,
    mode: "available",
    allowedStates: config.allowedStates
  };
}

export function toPublicWilmaLaunchConfig(decision: WilmaLaunchAccessDecision): PublicWilmaLaunchConfig {
  return {
    available: decision.allowed,
    mode: decision.mode,
    allowedStates: decision.allowedStates,
    message: decision.message
  };
}

function hasBetaAccess(config: WilmaLaunchConfig, input: WilmaLaunchAccessInput): boolean {
  if (input.user?.role === "ADMIN") {
    return true;
  }

  const email = (input.email ?? input.user?.email)?.trim().toLowerCase();
  if (email && config.betaAllowedEmails.includes(email)) {
    return true;
  }

  const token = input.betaToken?.trim();
  return Boolean(token && config.betaTokens.includes(token));
}

function isInRollout(config: WilmaLaunchConfig, input: WilmaLaunchAccessInput): boolean {
  if (config.rolloutPercent >= 100) {
    return true;
  }
  if (config.rolloutPercent <= 0) {
    return false;
  }
  if (input.user?.role === "ADMIN") {
    return true;
  }

  const key = input.deviceId ?? input.anonymousId ?? input.email ?? input.remoteIp ?? "anonymous";
  return stableBucket(key) < config.rolloutPercent;
}

function stableBucket(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

function blocked(
  config: WilmaLaunchConfig,
  mode: WilmaLaunchAccessDecision["mode"],
  reason: NonNullable<WilmaLaunchAccessDecision["reason"]>,
  message: string
): WilmaLaunchAccessDecision {
  return {
    allowed: false,
    mode,
    reason,
    message,
    allowedStates: config.allowedStates
  };
}

function isSupportedState(state: string): state is SupportedState {
  return (wilmaSupportedStates as readonly string[]).includes(state);
}
