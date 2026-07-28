import "server-only";

export const RCAP_PARTNER_ONBOARDING_FLAG = "RCAP_PARTNER_ONBOARDING_ENABLED";

type FlagEnvironment = Readonly<Record<string, string | undefined>>;

export function isRcapPartnerOnboardingEnabled(
  environment: FlagEnvironment = process.env
): boolean {
  return environment[RCAP_PARTNER_ONBOARDING_FLAG]?.trim().toLowerCase() === "true";
}
