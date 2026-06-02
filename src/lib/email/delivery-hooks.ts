import { deliverPartnerEmail } from "./email-service";
import type { PartnerEmailType, PartnerRecord } from "@/lib/partners/types";

export async function recordPaymentConfirmedEmailDryRun(partner: PartnerRecord) {
  return recordPartnerEmailDryRun(partner, "payment_confirmation");
}

export async function recordOnboardingSubmittedEmailDryRun(partner: PartnerRecord) {
  return recordPartnerEmailDryRun(partner, "internal_partner_notification");
}

export async function recordLaunchKitReadyEmailDryRun(partner: PartnerRecord) {
  return recordPartnerEmailDryRun(partner, "launch_kit_ready");
}

export async function recordDashboardReadyEmailDryRun(partner: PartnerRecord) {
  return recordPartnerEmailDryRun(partner, "dashboard_ready");
}

export async function recordPartnerPageReadyEmailDryRun(partner: PartnerRecord) {
  return recordPartnerEmailDryRun(partner, "partner_page_ready");
}

export async function recordPartnerEmailDryRun(partner: PartnerRecord, emailType: PartnerEmailType) {
  return deliverPartnerEmail({
    partner,
    emailType,
    mode: "dry_run"
  });
}
