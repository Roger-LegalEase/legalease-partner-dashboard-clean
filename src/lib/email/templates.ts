import {
  finalReportApi,
  partnerDashboard,
  partnerLaunchKit,
  partnerOnboarding,
  partnerPublicPage,
  weeklyReportApi
} from "@/lib/partners/routes";
import type { PartnerEmailType, PartnerRecord } from "@/lib/partners/types";
import { partnerEmailTypeLabels } from "./email-types";

export type RenderedPartnerEmail = {
  emailType: PartnerEmailType;
  subject: string;
  text: string;
  html: string;
  recipientEmail: string;
  recipientName: string;
  previewUrl: string;
};

export type PartnerEmailTemplateInput = {
  partner: PartnerRecord;
  emailType: PartnerEmailType;
  appUrl?: string;
  internalNotificationsEmail?: string;
};

type TemplateCopy = {
  subject: string;
  heading: string;
  intro: string;
  body: string[];
  ctaLabel: string;
  ctaHref: string;
  note: string;
};

export function renderPartnerEmailTemplate(input: PartnerEmailTemplateInput): RenderedPartnerEmail {
  const appUrl = normalizeAppUrl(input.appUrl);
  const context = buildPartnerEmailContext(input.partner, appUrl);
  const copy = buildTemplateCopy(input.emailType, context);
  const recipient = getRecipient(input.partner, input.emailType, input.internalNotificationsEmail);
  const text = renderText(copy, context);

  return {
    emailType: input.emailType,
    subject: copy.subject,
    text,
    html: renderHtml(input.emailType, copy, context),
    recipientEmail: recipient.email,
    recipientName: recipient.name,
    previewUrl: `${appUrl}/internal/partners/admin/${input.partner.partnerSlug}/emails/${input.emailType}`
  };
}

export function getPartnerEmailRequiredInputs(emailType: PartnerEmailType): string[] {
  const shared = ["partnerSlug", "partnerName", "primaryContactEmail or contactEmail"];

  if (emailType === "internal_partner_notification") {
    return ["partnerSlug", "partnerName", "INTERNAL_LEGALEASE_NOTIFICATIONS_EMAIL or partner contact email"];
  }

  return shared;
}

function buildTemplateCopy(emailType: PartnerEmailType, context: ReturnType<typeof buildPartnerEmailContext>): TemplateCopy {
  const programName = context.programName;

  const copy: Record<PartnerEmailType, TemplateCopy> = {
    payment_confirmation: {
      subject: `Payment received for ${programName}`,
      heading: "Payment received",
      intro: `LegalEase received payment confirmation for ${context.partnerName}.`,
      body: [
        "Onboarding can continue after Stripe confirmation is recorded in the Partner Journey OS.",
        "The next step is to complete the partner setup profile so LegalEase can prepare the launch path."
      ],
      ctaLabel: "Continue onboarding",
      ctaHref: context.onboardingUrl,
      note: "This message confirms payment status only. It does not promise eligibility, filing approval, or record-clearing outcomes."
    },
    onboarding_next_steps: {
      subject: `Next steps for ${programName}`,
      heading: "Complete partner onboarding",
      intro: `${context.partnerName} can now complete onboarding for the record-clearing access program.`,
      body: [
        "The onboarding profile captures organization, contact, program, geography, audience, and launch information.",
        "LegalEase uses this profile to prepare partner pages, dashboard setup, launch kit links, and future reports."
      ],
      ctaLabel: "Open onboarding",
      ctaHref: context.onboardingUrl,
      note: "Draft saves are supported. Final submission sends the profile to LegalEase for review."
    },
    launch_kit_ready: {
      subject: `${programName} launch kit is ready`,
      heading: "Launch kit ready",
      intro: `The launch kit for ${context.partnerName} is ready to review.`,
      body: [
        "The launch kit gives your team the approved links and setup materials for the record-clearing access program.",
        "Review the launch materials before sharing them with participants or community partners."
      ],
      ctaLabel: "Open launch kit",
      ctaHref: context.launchKitUrl,
      note: "LegalEase materials are plain-language program materials, not legal advice."
    },
    dashboard_ready: {
      subject: `${programName} dashboard is ready`,
      heading: "Dashboard ready",
      intro: `The partner dashboard for ${context.partnerName} is ready.`,
      body: [
        "The dashboard gives LegalEase and partner teams visibility into referrals, screenings, routing activity, and implementation reporting.",
        "Use it to monitor program operations after launch."
      ],
      ctaLabel: "Open dashboard",
      ctaHref: context.dashboardUrl,
      note: "Production auth will be added in a later phase before live external access."
    },
    partner_page_ready: {
      subject: `${context.partnerName} partner page is ready`,
      heading: "Partner page ready",
      intro: `The co-branded landing page for ${context.partnerName} is ready for review.`,
      body: [
        `The page reflects the ${context.serviceArea} service area and uses the persisted partner profile where available.`,
        "Share the page only after LegalEase confirms the launch-ready status."
      ],
      ctaLabel: "Open partner page",
      ctaHref: context.partnerPageUrl,
      note: "The public page does not expose internal payment or private contact details."
    },
    internal_partner_notification: {
      subject: `Partner update: ${context.partnerName}`,
      heading: "Partner update",
      intro: `${context.partnerName} has a Partner Journey OS update for LegalEase review.`,
      body: [
        `Payment status: ${context.paymentStatus}.`,
        `Provisioning status: ${context.provisioningStatus}.`,
        `Onboarding status: ${context.onboardingStatus}.`
      ],
      ctaLabel: "Open internal admin",
      ctaHref: context.internalAdminUrl,
      note: "This internal notification contains operational status only and excludes provider secrets."
    },
    weekly_report_ready: {
      subject: `${programName} weekly report is ready`,
      heading: "Weekly report ready",
      intro: `A weekly implementation report is ready for ${context.partnerName}.`,
      body: [
        "The report summarizes participation, screening activity, routing signals, and implementation progress.",
        "Review the report alongside dashboard activity for operational follow-up."
      ],
      ctaLabel: "Open weekly report",
      ctaHref: context.weeklyReportUrl,
      note: "Report metrics are operational indicators and do not guarantee outcomes."
    },
    final_report_ready: {
      subject: `${programName} final impact report is ready`,
      heading: "Final impact report ready",
      intro: `The final impact report is ready for ${context.partnerName}.`,
      body: [
        "The report summarizes program activity, implementation results, and closeout context for the record-clearing access program.",
        "LegalEase will use the final report to support partner review and future program planning."
      ],
      ctaLabel: "Open final report",
      ctaHref: context.finalReportUrl,
      note: "The report is informational and does not promise eligibility, filing approval, or court acceptance."
    }
  };

  return copy[emailType];
}

function buildPartnerEmailContext(partner: PartnerRecord, appUrl: string) {
  const partnerName = partner.organizationName || partner.partnerName || "Partner";
  const programName = partner.programName || `${partnerName} record-clearing access program`;
  const serviceArea = partner.serviceArea || partner.targetCounty || partner.region || partner.state || "the partner service area";

  return {
    partnerName,
    programName,
    serviceArea,
    paymentStatus: partner.paymentStatus,
    provisioningStatus: partner.provisioningStatus,
    onboardingStatus: partner.onboardingStatus ?? "not_started",
    onboardingUrl: absoluteUrl(appUrl, partnerOnboarding(partner.partnerSlug)),
    launchKitUrl: absoluteUrl(appUrl, partnerLaunchKit(partner.partnerSlug)),
    dashboardUrl: absoluteUrl(appUrl, partnerDashboard(partner.partnerSlug)),
    partnerPageUrl: absoluteUrl(appUrl, partnerPublicPage(partner.partnerSlug)),
    internalAdminUrl: absoluteUrl(appUrl, `/internal/partners/admin/${partner.partnerSlug}`),
    weeklyReportUrl: absoluteUrl(appUrl, weeklyReportApi()),
    finalReportUrl: absoluteUrl(appUrl, finalReportApi())
  };
}

function getRecipient(partner: PartnerRecord, emailType: PartnerEmailType, internalNotificationsEmail?: string) {
  if (emailType === "internal_partner_notification" && internalNotificationsEmail?.trim()) {
    return {
      email: internalNotificationsEmail.trim(),
      name: "LegalEase internal notifications"
    };
  }

  return {
    email: partner.primaryContactEmail || partner.contactEmail || "",
    name: partner.primaryContactName || partner.contactName || partner.partnerName || "Partner contact"
  };
}

function renderText(copy: TemplateCopy, context: ReturnType<typeof buildPartnerEmailContext>) {
  return [
    copy.heading,
    "",
    copy.intro,
    "",
    ...copy.body,
    "",
    `${copy.ctaLabel}: ${copy.ctaHref}`,
    "",
    copy.note,
    "",
    `Program: ${context.programName}`,
    `Service area: ${context.serviceArea}`,
    "",
    "Powered by LegalEase."
  ].join("\n");
}

function renderHtml(emailType: PartnerEmailType, copy: TemplateCopy, context: ReturnType<typeof buildPartnerEmailContext>) {
  const body = copy.body.map((line) => `<p>${escapeHtml(line)}</p>`).join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f8f6;color:#152235;font-family:Arial,Helvetica,sans-serif;">
    <main style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <section style="background:#ffffff;border:1px solid #dde3df;border-radius:8px;padding:28px;">
        <p style="margin:0 0 12px;color:#0f766e;font-size:13px;font-weight:700;">${escapeHtml(partnerEmailTypeLabels[emailType])}</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;color:#152235;">${escapeHtml(copy.heading)}</h1>
        <p>${escapeHtml(copy.intro)}</p>
        ${body}
        <p style="margin:24px 0;">
          <a href="${escapeAttribute(copy.ctaHref)}" style="display:inline-block;background:#152235;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 18px;font-weight:700;">${escapeHtml(copy.ctaLabel)}</a>
        </p>
        <p style="font-size:13px;color:#5f6f68;">${escapeHtml(copy.note)}</p>
        <hr style="border:none;border-top:1px solid #dde3df;margin:24px 0;" />
        <p style="font-size:13px;color:#5f6f68;">Program: ${escapeHtml(context.programName)}<br />Service area: ${escapeHtml(context.serviceArea)}</p>
        <p style="font-size:13px;color:#5f6f68;">Powered by LegalEase.</p>
      </section>
    </main>
  </body>
</html>`;
}

function normalizeAppUrl(appUrl?: string) {
  const fallback = "http://localhost:3000";
  return (appUrl || fallback).replace(/\/+$/, "");
}

function absoluteUrl(appUrl: string, route: string) {
  return `${appUrl}${route.startsWith("/") ? route : `/${route}`}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}
