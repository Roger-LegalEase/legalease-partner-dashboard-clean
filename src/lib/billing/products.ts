import type { Env } from "@/lib/env";
import { env } from "@/lib/env";

export const monitoringPlanKeys = [
  "monitoring_monthly",
  "monitoring_annual",
  "monitoring_plus_monthly"
] as const;

export type MonitoringPlanKey = (typeof monitoringPlanKeys)[number];

export const recordCheckProductKey = "record_check" as const;
export const documentPrepProductKey = "document_prep" as const;

export function isMonitoringPlanKey(value: string): value is MonitoringPlanKey {
  return monitoringPlanKeys.includes(value as MonitoringPlanKey);
}

export function getMonitoringPriceId(planKey: MonitoringPlanKey, configEnv: Env = env): string {
  const priceIds: Record<MonitoringPlanKey, string> = {
    monitoring_monthly: configEnv.STRIPE_PRICE_MONITORING_LITE_MONTHLY,
    monitoring_annual: configEnv.STRIPE_PRICE_MONITORING_LITE_ANNUAL,
    monitoring_plus_monthly: configEnv.STRIPE_PRICE_MONITORING_PLUS_MONTHLY
  };

  return priceIds[planKey];
}
