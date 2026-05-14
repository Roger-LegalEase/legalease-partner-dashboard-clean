export const notificationTemplateTypes = [
  "payment_received",
  "checkr_invitation_created",
  "candidate_action_required",
  "report_pending",
  "report_ready",
  "ai_summary_ready",
  "ai_summary_failed_manual_review",
  "monitoring_activated",
  "monitoring_canceled",
  "payment_failed",
  "data_deletion_request_received",
  "data_deletion_completed"
] as const;

export type NotificationTemplateType = (typeof notificationTemplateTypes)[number];

export type NotificationTemplate = {
  subject: string;
  body: string;
};

const templates: Record<NotificationTemplateType, NotificationTemplate> = {
  payment_received: {
    subject: "LegalEase RecordShield payment received",
    body: "We received your payment for your personal RecordShield self-check. Log in to see next steps."
  },
  checkr_invitation_created: {
    subject: "Your secure provider invitation is ready",
    body: "Your Checkr hosted invitation is ready. Complete it through the provider-hosted flow so your personal self-check can continue."
  },
  candidate_action_required: {
    subject: "Action needed for your RecordShield check",
    body: "The provider needs information from you through its secure hosted flow. Log in to continue."
  },
  report_pending: {
    subject: "Your RecordShield check is in progress",
    body: "Your personal record check is still processing. Log in to see status updates. Timing can vary by provider availability, jurisdiction, court data, and reporting rules."
  },
  report_ready: {
    subject: "Your RecordShield status has been updated",
    body: "Your status is ready to review. Log in to view your plain-English summary and expungement-readiness review."
  },
  ai_summary_ready: {
    subject: "Your RecordShield summary is ready",
    body: "Your plain-English summary is ready. Log in to review it. AI-generated summaries may contain errors or omissions, so verify results and consult a qualified attorney for legal advice."
  },
  ai_summary_failed_manual_review: {
    subject: "Your RecordShield summary needs review",
    body: "Your summary could not be generated automatically. The case is queued for safe manual review, and we will update your dashboard."
  },
  monitoring_activated: {
    subject: "RecordShield monitoring is active",
    body: "Monitoring is active for your account. Monitoring does not guarantee detection of every record or change."
  },
  monitoring_canceled: {
    subject: "RecordShield monitoring canceled",
    body: "Your monitoring access has been canceled. You can log in to review billing status and next steps."
  },
  payment_failed: {
    subject: "RecordShield payment needs attention",
    body: "A payment could not be completed. Log in or use the billing portal to update your payment method."
  },
  data_deletion_request_received: {
    subject: "RecordShield data request received",
    body: "We received your deletion or anonymization request. Some non-personal billing, audit, or compliance records may be retained when appropriate."
  },
  data_deletion_completed: {
    subject: "RecordShield data request completed",
    body: "Your deletion or anonymization request has been completed where supported. Log in or contact support with questions."
  }
};

const sensitiveTemplatePattern =
  /\b(ssn|social security|date of birth|dob|driver'?s? license|license number|raw payload|criminal record details)\b/i;

export function renderNotificationTemplate(type: NotificationTemplateType): NotificationTemplate {
  const template = templates[type];
  if (sensitiveTemplatePattern.test(`${template.subject} ${template.body}`)) {
    throw new Error(`Notification template ${type} includes sensitive details.`);
  }
  return template;
}
