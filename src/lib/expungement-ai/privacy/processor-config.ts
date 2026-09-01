import "server-only";

export const PRIVACY_PROCESSOR_CONFIG_NAMES = [
  "PRIVACY_EMAIL_PROCESSOR_ENDPOINT",
  "PRIVACY_EMAIL_PROCESSOR_TOKEN",
  "PRIVACY_ANALYTICS_PROCESSOR_ENDPOINT",
  "PRIVACY_ANALYTICS_PROCESSOR_TOKEN"
] as const;

export type PrivacyProcessorConfigName = (typeof PRIVACY_PROCESSOR_CONFIG_NAMES)[number];
export type RequiredPrivacyProcessorKey = "email_delivery" | "product_analytics";

export type PrivacyProcessorConfig = {
  email: { endpoint: string; token: string };
  analytics: { endpoint: string; token: string };
};

export type PrivacyProcessorConfigReadiness = {
  ready: boolean;
  missing: PrivacyProcessorConfigName[];
  checked: Record<PrivacyProcessorConfigName, boolean>;
  config: PrivacyProcessorConfig | null;
};

export class PrivacyProcessorConfigError extends Error {
  readonly code = "privacy_processor_config_unavailable";

  constructor(readonly missing: readonly PrivacyProcessorConfigName[]) {
    super("Required participant-deletion processors are not configured.");
    this.name = "PrivacyProcessorConfigError";
  }
}

function endpoint(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function token(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length >= 16 ? trimmed : null;
}

/**
 * The single processor-readiness contract used by the page, API and worker.
 * Keeping the four checks explicit is deliberate: a mutation verifier removes
 * each one in turn and proves the public readiness gate turns red.
 */
export function privacyConfigReady(
  env: NodeJS.ProcessEnv = process.env
): PrivacyProcessorConfigReadiness {
  const emailEndpoint = endpoint(env.PRIVACY_EMAIL_PROCESSOR_ENDPOINT);
  const emailToken = token(env.PRIVACY_EMAIL_PROCESSOR_TOKEN);
  const analyticsEndpoint = endpoint(env.PRIVACY_ANALYTICS_PROCESSOR_ENDPOINT);
  const analyticsToken = token(env.PRIVACY_ANALYTICS_PROCESSOR_TOKEN);
  const missing: PrivacyProcessorConfigName[] = [];

  if (!emailEndpoint) missing.push("PRIVACY_EMAIL_PROCESSOR_ENDPOINT");
  if (!emailToken) missing.push("PRIVACY_EMAIL_PROCESSOR_TOKEN");
  if (!analyticsEndpoint) missing.push("PRIVACY_ANALYTICS_PROCESSOR_ENDPOINT");
  if (!analyticsToken) missing.push("PRIVACY_ANALYTICS_PROCESSOR_TOKEN");

  const checked = {
    PRIVACY_EMAIL_PROCESSOR_ENDPOINT: Boolean(emailEndpoint),
    PRIVACY_EMAIL_PROCESSOR_TOKEN: Boolean(emailToken),
    PRIVACY_ANALYTICS_PROCESSOR_ENDPOINT: Boolean(analyticsEndpoint),
    PRIVACY_ANALYTICS_PROCESSOR_TOKEN: Boolean(analyticsToken)
  };

  return {
    ready: missing.length === 0,
    missing,
    checked,
    config: missing.length === 0
      ? {
          email: { endpoint: emailEndpoint as string, token: emailToken as string },
          analytics: { endpoint: analyticsEndpoint as string, token: analyticsToken as string }
        }
      : null
  };
}

export function requireProcessorConfig(
  processorKey?: RequiredPrivacyProcessorKey,
  env: NodeJS.ProcessEnv = process.env
): PrivacyProcessorConfig | PrivacyProcessorConfig["email"] | PrivacyProcessorConfig["analytics"] {
  const readiness = privacyConfigReady(env);
  if (!readiness.ready || !readiness.config) throw new PrivacyProcessorConfigError(readiness.missing);
  if (processorKey === "email_delivery") return readiness.config.email;
  if (processorKey === "product_analytics") return readiness.config.analytics;
  return readiness.config;
}
