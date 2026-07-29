import "server-only";

export const RCAP_PARTNER_ONBOARDING_FLAG = "RCAP_PARTNER_ONBOARDING_ENABLED";
export const RCAP_ONBOARDING_PREFILL_FLAG =
  "RCAP_ONBOARDING_PREFILL_ENABLED";
export const RCAP_ONBOARDING_LAUNCH_PREP_FLAG =
  "RCAP_ONBOARDING_LAUNCH_PREP_ENABLED";

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

// Phase 2A launch-preparation artifacts. Absent means false, only a normalized
// "true" enables it, and it cannot enable while the Phase 1 onboarding flag is
// off. It is read on the server only and is never exposed to the browser, so
// merging this code changes no production behavior and rollback is disabling
// the flag.
export function isRcapOnboardingLaunchPrepEnabled(
  environment: FlagEnvironment = process.env
): boolean {
  return (
    isRcapPartnerOnboardingEnabled(environment) &&
    environment[RCAP_ONBOARDING_LAUNCH_PREP_FLAG]?.trim().toLowerCase() ===
      "true"
  );
}
