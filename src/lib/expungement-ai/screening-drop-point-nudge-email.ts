import "server-only";

import { absoluteExpungementAiUrl } from "@/lib/app-url";

export type ScreeningDropPointNudgeTouch = 1 | 2;

export type ScreeningDropPointNudgeEmail = {
  to: string;
  touch: ScreeningDropPointNudgeTouch;
  dropQuestionId: string | null;
  resumeUrl: string;
  optOutUrl: string;
};

export type ScreeningDropPointNudgeEmailResult = {
  ok: boolean;
  provider: "resend" | "disabled";
  subject: string;
  text: string;
  html: string;
  providerMessageId?: string;
  error?: string;
};

export function renderScreeningDropPointNudgeEmail(input: ScreeningDropPointNudgeEmail) {
  const subject = input.touch === 1 ? "Your saved progress" : "Your progress is still here";
  const body = input.touch === 1
    ? touch1Body(input.dropQuestionId)
    : "No rush - we saved where you left off, and it'll be here when you're ready. If you got stuck because court records were hard to track down, you're not alone; that's the most common reason people pause. Continue when you're ready. And if you'd rather not get these reminders, you can turn them off anytime.";

  const text = [
    body,
    "",
    `Continue: ${input.resumeUrl}`,
    "",
    `Turn off these reminders: ${input.optOutUrl}`
  ].join("\n");

  const html = [
    `<p>${escapeHtml(body)}</p>`,
    `<p><a href="${escapeHtml(input.resumeUrl)}">Continue where you left off</a></p>`,
    `<p><a href="${escapeHtml(input.optOutUrl)}">Turn off these reminders</a></p>`
  ].join("");

  return { subject, text, html };
}

export async function sendScreeningDropPointNudgeEmail(input: ScreeningDropPointNudgeEmail): Promise<ScreeningDropPointNudgeEmailResult> {
  const rendered = renderScreeningDropPointNudgeEmail(input);
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
      error: error instanceof Error ? error.message : "Drop-point nudge email delivery failed."
    };
  }
}

export function screeningDropPointNudgeOptOutUrl(rawToken: string) {
  return absoluteExpungementAiUrl(`/api/expungement-ai/screening/nudge/opt-out?token=${encodeURIComponent(rawToken)}`);
}

export function touch1Body(questionId: string | null) {
  if (matchesQuestion(questionId, ["case_number", "case_identifier"])) {
    return "You're almost through. The last thing you stopped on was your case number - that's the docket, cause, or arrest number on your paperwork. If you don't have it handy, most courts let you look it up free online by your name. Pick up where you left off - your progress is saved.";
  }
  if (matchesQuestion(questionId, ["charge"])) {
    return "You stopped at the charge on your record. It's okay if you're not sure of the exact wording - you can use whatever your paperwork says, or the general description. Continue where you left off.";
  }
  if (matchesQuestion(questionId, ["disposition_date", "sentence_completion_date", "arrest_date", "dates"])) {
    return "You're close. You stopped on a date - when the case ended or was completed. An approximate date is fine if you're not certain; you don't need it exact to keep going. Pick up where you left off.";
  }
  if (matchesQuestion(questionId, ["record_documents", "criminal_history"])) {
    return "You stopped at the step about having your court records. Good news: you don't need them all in front of you to keep going, and if you can't easily get them, you're not stuck. Continue, and we'll help you figure out the rest.";
  }
  return "You're almost through your screening. You stopped partway, and your progress is saved. Pick up right where you left off whenever you're ready.";
}

function matchesQuestion(questionId: string | null, candidates: string[]) {
  const normalized = questionId?.trim().toLowerCase() ?? "";
  return candidates.some((candidate) => normalized === candidate || normalized.includes(candidate));
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
  return "Drop-point nudge email provider rejected the request.";
}
