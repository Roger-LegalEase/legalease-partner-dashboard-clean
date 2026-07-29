import "server-only";

export const RCAP_PARTNER_ONBOARDING_FLAG = "RCAP_PARTNER_ONBOARDING_ENABLED";
export const RCAP_ONBOARDING_PREFILL_FLAG =
  "RCAP_ONBOARDING_PREFILL_ENABLED";

type FlagEnvironment = Readonly<Record<string, string | undefined>>;

export function isRcapPartnerOnboardingEnabled(
  environment: FlagEnvironment = process.env
): boolean {
  return environment[RCAP_PARTNER_ONBOARDING_FLAG]?.trim().toLowerCase() === "true";
}

export function isRcapOnboardingPrefillEnabled(
  environment: FlagEnvironment = process.env
): boolean {
  return (
    isRcapPartnerOnboardingEnabled(environment) &&
    environment[RCAP_ONBOARDING_PREFILL_FLAG]?.trim().toLowerCase() ===
      "true"
  );
}
