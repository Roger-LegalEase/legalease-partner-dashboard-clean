import type { AppUser } from "@/lib/auth";
import type { SupportedState } from "@/wilma/chat/rules";

export type WilmaLaunchMode = "available" | "disabled" | "maintenance" | "killed" | "beta_only" | "rollout";

export type WilmaLaunchConfig = {
  publicEnabled: boolean;
  betaOnly: boolean;
  allowedStates: SupportedState[];
  rolloutPercent: number;
  maintenanceMode: boolean;
  killSwitch: boolean;
  betaAllowedEmails: string[];
  betaTokens: string[];
};

export type WilmaLaunchAccessInput = {
  state?: string;
  email?: string | null;
  betaToken?: string | null;
  anonymousId?: string | null;
  deviceId?: string | null;
  remoteIp?: string | null;
  user?: Pick<AppUser, "email" | "role"> | null;
};

export type WilmaLaunchAccessDecision = {
  allowed: boolean;
  mode: WilmaLaunchMode;
  allowedStates: SupportedState[];
  message?: string;
  reason?: WilmaLaunchBlockedReason;
};

export type WilmaLaunchBlockedReason =
  | "wilma_disabled"
  | "wilma_maintenance"
  | "wilma_kill_switch"
  | "state_not_enabled_for_beta"
  | "beta_access_required"
  | "rollout_not_selected";

export type PublicWilmaLaunchConfig = {
  available: boolean;
  mode: WilmaLaunchMode;
  allowedStates: SupportedState[];
  message?: string;
};
