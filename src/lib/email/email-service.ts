import { getPartnerAppBaseUrl } from "@/lib/app-url";
import { addPartnerEmailDeliveryRecord } from "@/lib/partners/partner-repository";
import type { PartnerEmailStatus, PartnerEmailType, PartnerRecord } from "@/lib/partners/types";
import { type PartnerEmailMode } from "./email-types";
import { renderPartnerEmailTemplate, type RenderedPartnerEmail } from "./templates";

export type PartnerEmailDeliveryConfig = {
  enabled: boolean;
  provider: "resend" | "disabled";
  from?: string;
  replyTo?: string;
  internalNotificationsEmail?: string;
  appUrl: string;
  statusLabel: "disabled" | "dry_run" | "live_enabled";
};

export type PartnerEmailDeliveryResult = {
  success: boolean;
  mode: PartnerEmailMode;
  status: PartnerEmailStatus;
  provider: "resend" | "disabled";
  message: string;
  rendered: RenderedPartnerEmail;
  deliveryPersisted: boolean;
  providerMessageId?: string;
  error?: string;
};

export type DeliverPartnerEmailInput = {
  partner: PartnerRecord;
  emailType: PartnerEmailType;
  mode: PartnerEmailMode;
};

export function getPartnerEmailDeliveryConfig(): PartnerEmailDeliveryConfig {
  const enabled = process.env.ENABLE_PARTNER_EMAIL_DELIVERY === "true";
  const providerValue = process.env.PARTNER_EMAIL_PROVIDER;
  const provider = enabled && providerValue === "resend" ? "resend" : "disabled";
  const hasResendConfig = Boolean(process.env.RESEND_API_KEY && process.env.PARTNER_EMAIL_FROM);
  const liveEnabled = enabled && provider === "resend" && hasResendConfig;

  return {
    enabled: liveEnabled,
    provider: liveEnabled ? "resend" : "disabled",
    from: process.env.PARTNER_EMAIL_FROM,
    replyTo: process.env.PARTNER_EMAIL_REPLY_TO,
    internalNotificationsEmail: process.env.INTERNAL_LEGALEASE_NOTIFICATIONS_EMAIL,
    appUrl: getPartnerAppBaseUrl(),
    statusLabel: liveEnabled ? "live_enabled" : enabled ? "dry_run" : "disabled"
  };
}

export async function deliverPartnerEmail(input: DeliverPartnerEmailInput): Promise<PartnerEmailDeliveryResult> {
  const config = getPartnerEmailDeliveryConfig();
  const rendered = renderPartnerEmailTemplate({
    partner: input.partner,
    emailType: input.emailType,
    appUrl: config.appUrl,
    internalNotificationsEmail: config.internalNotificationsEmail
  });

  if (input.mode === "preview") {
    return {
      success: true,
      mode: "preview",
      status: "draft",
      provider: config.provider,
      message: "Email preview rendered. No delivery record was created.",
      rendered,
      deliveryPersisted: false
    };
  }

  if (!isValidEmail(rendered.recipientEmail)) {
    return recordDelivery({
      partner: input.partner,
      rendered,
      mode: input.mode,
      status: "failed",
      provider: config.provider,
      errorMessage: "A valid recipient email is required."
    });
  }

  if (input.mode === "dry_run") {
    return recordDelivery({
      partner: input.partner,
      rendered,
      mode: "dry_run",
      status: "dry_run",
      provider: config.provider,
      message: "Dry-run email recorded. No live email was sent."
    });
  }

  if (!config.enabled || config.provider !== "resend") {
    return recordDelivery({
      partner: input.partner,
      rendered,
      mode: "send",
      status: "skipped",
      provider: "disabled",
      message: "Live email delivery is disabled or not configured. No email was sent."
    });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey || !config.from) {
    return recordDelivery({
      partner: input.partner,
      rendered,
      mode: "send",
      status: "skipped",
      provider: "disabled",
      message: "Resend is missing required configuration. No email was sent."
    });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: config.from,
        to: [rendered.recipientEmail],
        reply_to: config.replyTo,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html
      })
    });

    const responseBody = await safeJson(response);
    if (!response.ok) {
      return recordDelivery({
        partner: input.partner,
        rendered,
        mode: "send",
        status: "failed",
        provider: "resend",
        errorMessage: getProviderError(responseBody)
      });
    }

    return recordDelivery({
      partner: input.partner,
      rendered,
      mode: "send",
      status: "sent",
      provider: "resend",
      providerMessageId: typeof responseBody?.id === "string" ? responseBody.id : undefined,
      message: "Email sent through Resend."
    });
  } catch (error) {
    return recordDelivery({
      partner: input.partner,
      rendered,
      mode: "send",
      status: "failed",
      provider: "resend",
      errorMessage: error instanceof Error ? error.message : "Resend delivery failed."
    });
  }
}

async function recordDelivery({
  partner,
  rendered,
  mode,
  status,
  provider,
  providerMessageId,
  message,
  errorMessage
}: {
  partner: PartnerRecord;
  rendered: RenderedPartnerEmail;
  mode: PartnerEmailMode;
  status: PartnerEmailStatus;
  provider: "resend" | "disabled";
  providerMessageId?: string;
  message?: string;
  errorMessage?: string;
}): Promise<PartnerEmailDeliveryResult> {
  const now = new Date().toISOString();
  const writeResult = await addPartnerEmailDeliveryRecord({
    partnerSlug: partner.partnerSlug,
    emailType: rendered.emailType,
    recipientEmail: rendered.recipientEmail,
    recipientName: rendered.recipientName,
    subject: rendered.subject,
    status,
    provider,
    providerMessageId,
    previewUrl: rendered.previewUrl,
    sentAt: status === "sent" ? now : undefined,
    failedAt: status === "failed" ? now : undefined,
    errorMessage
  });

  return {
    success: status !== "failed",
    mode,
    status,
    provider,
    message: message ?? errorMessage ?? "Email delivery attempt recorded.",
    rendered,
    deliveryPersisted: writeResult.persisted,
    providerMessageId,
    error: errorMessage
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function safeJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getProviderError(value: Record<string, unknown> | null) {
  if (typeof value?.message === "string") {
    return value.message;
  }

  if (typeof value?.error === "string") {
    return value.error;
  }

  return "Resend rejected the email request.";
}
