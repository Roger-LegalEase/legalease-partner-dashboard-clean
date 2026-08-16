export const FIRST_ADMIN_ROLE_LABEL = "Partner Administrator";
export const FIRST_ADMIN_SUPPORT_EMAIL = "partners@legalease.com";

export type FirstAdminInvitationEmailInput = {
  organizationName: string;
  administratorName: string;
  workEmail: string;
  setupUrl: string;
  expiresAt: string;
};

export type FirstAdminInvitationEmail = {
  subject: string;
  html: string;
  text: string;
  organizationName: string;
  administratorName: string;
  workEmail: string;
  role: typeof FIRST_ADMIN_ROLE_LABEL;
  expiration: string;
  supportEmail: typeof FIRST_ADMIN_SUPPORT_EMAIL;
};

export function renderFirstAdminInvitationEmail(
  input: FirstAdminInvitationEmailInput
): FirstAdminInvitationEmail {
  const expiration = formatInvitationExpiration(input.expiresAt);
  const subject = `Set up administrator access for ${input.organizationName}`;
  const role = FIRST_ADMIN_ROLE_LABEL;
  const supportEmail = FIRST_ADMIN_SUPPORT_EMAIL;
  const safe = {
    organizationName: escapeHtml(input.organizationName),
    administratorName: escapeHtml(input.administratorName),
    workEmail: escapeHtml(input.workEmail),
    setupUrl: escapeHtml(input.setupUrl),
    expiration: escapeHtml(expiration),
    supportEmail: escapeHtml(supportEmail)
  };

  const text = [
    "RCAP by LegalEase",
    "",
    `Hello ${input.administratorName},`,
    "",
    `You have been invited to serve as the ${role} for ${input.organizationName}.`,
    `This invitation was sent to ${input.workEmail}.`,
    "",
    "Set up administrator access:",
    input.setupUrl,
    "",
    `This secure link expires ${expiration}. Account setup usually takes about 5 minutes.`,
    "",
    "Your access includes the partner onboarding workspace, program setup records, and partner team administration. Administrator access does not approve program configuration, publication, activation, or launch.",
    "",
    "After setup, you will sign in to the partner workspace to provide or review the remaining program information.",
    "",
    "Security notice: This link is intended only for the named administrator. Do not forward or share it. If you were not expecting this invitation, do not use the link.",
    "",
    `Need help? Contact ${supportEmail}.`
  ].join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#F7F4EE;color:#071B33;font-family:Inter,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">Set up Partner Administrator access for ${safe.organizationName}.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F7F4EE"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#FFFFFF;border:1px solid #D5D9DD">
<tr><td style="background:#071B33;padding:22px 28px;color:#FFFFFF"><p style="margin:0;font-size:20px;font-weight:800">RCAP <span style="color:#FF3B00">by LegalEase</span></p></td></tr>
<tr><td style="padding:32px 28px">
<p style="margin:0 0 8px;color:#475A6E;font-family:'IBM Plex Mono',monospace;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Administrator invitation</p>
<h1 style="margin:0 0 20px;font-size:28px;line-height:1.2">Set up administrator access</h1>
<p style="margin:0 0 16px;line-height:1.6">Hello ${safe.administratorName},</p>
<p style="margin:0 0 20px;line-height:1.6">You have been invited to serve as the <strong>${role}</strong> for <strong>${safe.organizationName}</strong>. This invitation was sent to ${safe.workEmail}.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;border-top:3px solid #0A8E9A;background:#F7F4EE"><tr><td style="padding:16px"><strong>Link expiration</strong><br><span style="color:#475A6E">This secure link expires ${safe.expiration}. Account setup usually takes about 5 minutes.</span></td></tr></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px"><tr><td style="background:#FF3B00"><a data-primary-action="true" href="${safe.setupUrl}" style="display:inline-block;padding:14px 20px;color:#FFFFFF;font-weight:800;text-decoration:none">Set up administrator access</a></td></tr></table>
<h2 style="margin:0 0 8px;font-size:18px">What this access includes</h2>
<p style="margin:0 0 20px;line-height:1.6;color:#475A6E">The partner onboarding workspace, program setup records, and partner team administration. Administrator access does not approve program configuration, publication, activation, or launch.</p>
<h2 style="margin:0 0 8px;font-size:18px">What happens after setup</h2>
<p style="margin:0 0 20px;line-height:1.6;color:#475A6E">You will sign in to the partner workspace to provide or review the remaining program information.</p>
<p style="margin:0 0 20px;padding:14px;border-left:4px solid #FF3B00;background:#F7F4EE;line-height:1.6"><strong>Security notice:</strong> This link is intended only for the named administrator. Do not forward or share it. If you were not expecting this invitation, do not use the link.</p>
<p style="margin:0 0 8px;line-height:1.6">Need help? <a href="mailto:${safe.supportEmail}" style="color:#071B33">${safe.supportEmail}</a></p>
<p style="margin:20px 0 6px;color:#475A6E;font-size:12px">If the button does not work, copy this URL into your browser:</p>
<p style="margin:0;word-break:break-all;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#475A6E">${safe.setupUrl}</p>
</td></tr></table></td></tr></table></body></html>`;

  return {
    subject,
    html,
    text,
    organizationName: input.organizationName,
    administratorName: input.administratorName,
    workEmail: input.workEmail,
    role,
    expiration,
    supportEmail
  };
}

export function formatInvitationExpiration(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "at the time shown in your secure link";
  return `on ${new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short"
  }).format(date)}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character] ?? character);
}
