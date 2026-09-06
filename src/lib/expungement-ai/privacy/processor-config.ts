import "server-only";

export const PRIVACY_PROCESSOR_CONFIG_NAMES = [
  "PRIVACY_EMAIL_PROCESSOR_ENDPOINT",
  "PRIVACY_EMAIL_PROCESSOR_TOKEN",
  "PRIVACY_ANALYTICS_PROCESSOR_ENDPOINT",
  "PRIVACY_ANALYTICS_PROCESSOR_TOKEN"
] as const;

const LEGACY_PRIVACY_PROCESSOR_CONFIG_NAMES = {
  PRIVACY_EMAIL_PROCESSOR_ENDPOINT: "PARTICIPANT_PRIVACY_EMAIL_SUPPRESSION_URL",
  PRIVACY_EMAIL_PROCESSOR_TOKEN: "PARTICIPANT_PRIVACY_EMAIL_SUPPRESSION_TOKEN",
  PRIVACY_ANALYTICS_PROCESSOR_ENDPOINT: "PARTICIPANT_PRIVACY_ANALYTICS_ERASURE_URL",
  PRIVACY_ANALYTICS_PROCESSOR_TOKEN: "PARTICIPANT_PRIVACY_ANALYTICS_ERASURE_TOKEN"
} as const;

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
    if (parsed.username || parsed.password) return null;
    if (parsed.protocol === "https:") return parsed.toString();
    return parsed.protocol === "http:" && localOrTestProcessorHost(parsed.hostname)
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

/**
 * Plain HTTP is limited to loopback and IANA-reserved test names. Processor
 * bearer tokens and deletion identifiers must never cross a production network
 * without TLS, while local PostgreSQL-backed acceptance still needs its
 * loopback processor double.
 */
function localOrTestProcessorHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".localhost") || normalized === "[::1]") {
    return true;
  }
  if (normalized === "test" || normalized.endsWith(".test")) return true;
  const octets = normalized.split(".");
  return octets.length === 4
    && octets[0] === "127"
    && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);
}

function token(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length >= 16 ? trimmed : null;
}

function compatibleConfigValue(
  env: NodeJS.ProcessEnv,
  name: PrivacyProcessorConfigName
): string | undefined {
  const current = env[name];
  // A present current value is authoritative, including a malformed value: an
  // old fallback must not conceal a broken replacement during a rollout.
  if (current?.trim()) return current;
  return env[LEGACY_PRIVACY_PROCESSOR_CONFIG_NAMES[name]];
}

/**
 * The single processor-readiness contract used by the page, API and worker.
 * Keeping the four checks explicit is deliberate: a mutation verifier removes
 * each one in turn and proves the public readiness gate turns red.
 */
export function privacyConfigReady(
  env: NodeJS.ProcessEnv = process.env
): PrivacyProcessorConfigReadiness {
  const emailEndpoint = endpoint(compatibleConfigValue(env, "PRIVACY_EMAIL_PROCESSOR_ENDPOINT"));
  const emailToken = token(compatibleConfigValue(env, "PRIVACY_EMAIL_PROCESSOR_TOKEN"));
  const analyticsEndpoint = endpoint(compatibleConfigValue(env, "PRIVACY_ANALYTICS_PROCESSOR_ENDPOINT"));
  const analyticsToken = token(compatibleConfigValue(env, "PRIVACY_ANALYTICS_PROCESSOR_TOKEN"));
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
