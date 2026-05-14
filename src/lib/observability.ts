import type { Env } from "@/lib/env";
import { env } from "@/lib/env";
import { redactForLog } from "@/lib/security/redaction";

export type ProductionAlertKind = "error" | "rate_limit_closed" | "bot_blocked";

export async function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
  dependencies: { configEnv?: Env; fetcher?: typeof fetch } = {}
): Promise<void> {
  const configEnv = dependencies.configEnv ?? env;
  const payload = {
    kind: "error",
    message: error instanceof Error ? error.message : "unknown_error",
    context: redactForLog(context),
    stack: error instanceof Error ? redactForLog(error.stack) : undefined
  };

  if (process.env.NODE_ENV !== "test") {
    console.error("request_failed", redactForLog(payload));
  }

  await sendProductionAlert("error", payload, { configEnv, fetcher: dependencies.fetcher });
}

export async function sendProductionAlert(
  kind: ProductionAlertKind,
  payload: Record<string, unknown>,
  dependencies: { configEnv?: Env; fetcher?: typeof fetch } = {}
): Promise<void> {
  const configEnv = dependencies.configEnv ?? env;

  if (configEnv.NODE_ENV !== "production" || !configEnv.PRODUCTION_ALERT_WEBHOOK_URL) {
    return;
  }

  await (dependencies.fetcher ?? fetch)(configEnv.PRODUCTION_ALERT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      payload: redactForLog(payload)
    })
  }).catch(() => undefined);
}
