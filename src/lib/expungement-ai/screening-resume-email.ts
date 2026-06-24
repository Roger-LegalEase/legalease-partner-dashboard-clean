import "server-only";

import { absoluteExpungementAiUrl } from "@/lib/app-url";

export type ScreeningResumeEmail = {
  to: string;
  resumeUrl: string;
};

export type ScreeningResumeEmailResult = {
  ok: boolean;
  provider: "resend" | "disabled";
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
  const enabled = process.env.ENABLE_PARTNER_EMAIL_DELIVERY === "true";
  const provider = enabled && process.env.PARTNER_EMAIL_PROVIDER === "resend" ? "resend" : "disabled";
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.PARTNER_EMAIL_FROM;
  const replyTo = process.env.PARTNER_EMAIL_REPLY_TO;

  if (!enabled || provider !== "resend" || !resendApiKey || !from) {
    return {
      ok: true,
      provider: "disabled",
      ...rendered
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        reply_to: replyTo,
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
        ...rendered,
        error: providerError(responseBody)
      };
    }
    return {
      ok: true,
      provider: "resend",
      ...rendered,
      providerMessageId: typeof responseBody?.id === "string" ? responseBody.id : undefined
    };
  } catch (error) {
    return {
      ok: false,
      provider: "resend",
      ...rendered,
      error: error instanceof Error ? error.message : "Resume email delivery failed."
    };
  }
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
