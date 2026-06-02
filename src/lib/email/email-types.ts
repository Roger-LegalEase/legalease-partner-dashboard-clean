import type { PartnerEmailType } from "@/lib/partners/types";

export type PartnerEmailMode = "preview" | "dry_run" | "send";

export const partnerEmailTypes: PartnerEmailType[] = [
  "payment_confirmation",
  "onboarding_next_steps",
  "launch_kit_ready",
  "dashboard_ready",
  "partner_page_ready",
  "internal_partner_notification",
  "weekly_report_ready",
  "final_report_ready"
];

export const partnerEmailTypeLabels: Record<PartnerEmailType, string> = {
  payment_confirmation: "Payment confirmation",
  onboarding_next_steps: "Onboarding next steps",
  launch_kit_ready: "Launch kit ready",
  dashboard_ready: "Dashboard ready",
  partner_page_ready: "Partner page ready",
  internal_partner_notification: "Internal LegalEase notification",
  weekly_report_ready: "Weekly report ready",
  final_report_ready: "Final impact report ready"
};

export function isPartnerEmailType(value: string): value is PartnerEmailType {
  return partnerEmailTypes.includes(value as PartnerEmailType);
}

export function isPartnerEmailMode(value: string): value is PartnerEmailMode {
  return value === "preview" || value === "dry_run" || value === "send";
}
