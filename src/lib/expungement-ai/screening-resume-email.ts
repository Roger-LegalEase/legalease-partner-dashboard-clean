import "server-only";

import { absoluteExpungementAiUrl } from "@/lib/app-url";

export type ScreeningResumeEmail = {
  to: string;
  resumeUrl: string;
};

export type ScreeningResumeEmailResult = {
  ok: boolean;
  provider: "resend" | "disabled";
  deliveryAttempted: boolean;
  subject: string;
  text: string;
  html: string;
  providerMessageId?: string;
  error?: string;
};

export const resumeEmailSubject = "Your saved progress";

export function renderScreeningResumeEmail(input: ScreeningResumeEmail) {
  const text = [
    "You asked to save your progress.",
    "",
    "Use this secure link to continue where you left off:",
    input.resumeUrl,
    "",
    "This link expires in 7 days.",
    "",
    "If you did not request this, you can ignore this email."
  ].join("\n");

  const html = [
    "<p>You asked to save your progress.</p>",
    `<p><a href="${escapeHtml(input.resumeUrl)}">Continue where you left off</a></p>`,
    "<p>This link expires in 7 days.</p>",
    "<p>If you did not request this, you can ignore this email.</p>"
  ].join("");

  return {
    subject: resumeEmailSubject,
    text,
    html
  };
}

export function screeningResumeUrl(rawToken: string) {
  return absoluteExpungementAiUrl(`/screening/resume?token=${encodeURIComponent(rawToken)}`);
}

export async function sendScreeningResumeEmail(input: ScreeningResumeEmail): Promise<ScreeningResumeEmailResult> {
  const rendered = renderScreeningResumeEmail(input);
  const config = getScreeningResumeEmailConfig();
  if (config.mock) {
    return {
      ok: true,
      provider: "disabled",
      deliveryAttempted: false,
      ...rendered
    };
  }

  if (!config.enabled || config.provider !== "resend" || !config.resendApiKey || !config.from) {
    return {
      ok: false,
      provider: "disabled",
      deliveryAttempted: false,
      ...rendered,
      error: "Resume email delivery is disabled or missing required configuration."
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: config.from,
        to: [input.to],
        reply_to: config.replyTo,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html
      })
    });
    const responseBody = await safeJson(response);
    if (!response.ok) {
      return {
        ok: false,
        provider: "resend",
        deliveryAttempted: true,
        ...rendered,
        error: providerError(responseBody)
      };
    }
    return {
      ok: true,
      provider: "resend",
      deliveryAttempted: true,
      ...rendered,
      providerMessageId: typeof responseBody?.id === "string" ? responseBody.id : undefined
    };
  } catch (error) {
    return {
      ok: false,
      provider: "resend",
      deliveryAttempted: true,
      ...rendered,
      error: error instanceof Error ? error.message : "Resume email delivery failed."
    };
  }
}

function getScreeningResumeEmailConfig() {
  const explicitProvider = normalizeProvider(process.env.EXPUNGEMENT_EMAIL_PROVIDER);
  const legacyProvider = normalizeProvider(process.env.PARTNER_EMAIL_PROVIDER);
  const provider = explicitProvider ?? (process.env.ENABLE_PARTNER_EMAIL_DELIVERY === "true" ? legacyProvider : null);
  const from = process.env.EXPUNGEMENT_EMAIL_FROM || process.env.PARTNER_EMAIL_FROM;
  const replyTo = process.env.EXPUNGEMENT_EMAIL_REPLY_TO || process.env.PARTNER_EMAIL_REPLY_TO;
  const resendApiKey = process.env.RESEND_API_KEY;

  return {
    enabled: provider === "resend" && Boolean(resendApiKey && from),
    provider: provider === "resend" ? "resend" as const : "disabled" as const,
    resendApiKey,
    from,
    replyTo,
    mock: provider === "mock" && process.env.NODE_ENV !== "production"
  };
}

function normalizeProvider(value: string | undefined) {
  if (value === "resend" || value === "mock") return value;
  return null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function safeJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

function providerError(value: Record<string, unknown> | null) {
  if (typeof value?.message === "string") return value.message;
  if (typeof value?.error === "string") return value.error;
  return "Resume email provider rejected the request.";
}
