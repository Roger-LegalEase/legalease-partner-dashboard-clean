import "server-only";
import { z } from "zod";
import { normalizePublicEnv, publicEnvSchema } from "@/lib/public-env";

const priceCents = z.coerce.number().int().positive().max(1_000_000);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
    APP_BASE_URL: z.string().url(),
    ...publicEnvSchema.shape,
    NEXTAUTH_SECRET: z.string().optional(),
    DEV_AUTH_EMAIL: z.string().email().optional(),
    DEV_AUTH_ROLE: z.enum(["CUSTOMER", "ADMIN"]).default("CUSTOMER"),
    RECORDSHIELD_BASIC_PRICE_CENTS: priceCents,
    RECORDSHIELD_FAMILY_PRICE_CENTS: priceCents,
    RECORDSHIELD_BUSINESS_PRICE_CENTS: priceCents,
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_PRICE_RECORD_CHECK: z.string().min(1),
    STRIPE_PRICE_MONITORING_LITE_MONTHLY: z.string().min(1),
    STRIPE_PRICE_MONITORING_LITE_ANNUAL: z.string().min(1),
    STRIPE_PRICE_MONITORING_PLUS_MONTHLY: z.string().min(1),
    STRIPE_PRICE_MONITORING_MONTHLY: z.string().min(1),
    STRIPE_PRICE_MONITORING_ANNUAL: z.string().min(1),
    CHECKR_API_KEY: z.string().min(1),
    CHECKR_WEBHOOK_SECRET: z.string().min(1),
    CHECKR_BASE_URL: z.string().url().default("https://api.checkr.com/v1"),
    CHECKR_PACKAGE_SLUG: z.string().min(1),
    CHECKR_NODE_CUSTOM_ID: z.string().optional(),
    CHECKR_WORK_LOCATION_COUNTRY: z.string().length(2).default("US"),
    CHECKR_WORK_LOCATION_STATE: z.string().min(2),
    CHECKR_WORK_LOCATION_CITY: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
    OPENAI_REPORT_SUMMARY_MODEL: z.string().min(1).default("gpt-5.2"),
    LAUNCH_STATE: z.string().length(2).default("CA"),
    RATE_LIMIT_REDIS_REST_URL: z.string().url().optional(),
    RATE_LIMIT_REDIS_REST_TOKEN: z.string().min(1).optional(),
    RATE_LIMIT_ALLOW_MEMORY_FALLBACK: z.enum(["true", "false"]).default("false"),
    BOT_PROTECTION_SECRET: z.string().min(1).optional(),
    WILMA_TRANSCRIPT_RETENTION_DAYS: z.coerce.number().int().positive().max(3650).default(180),
    WILMA_STORE_RAW_TRANSCRIPTS: z.enum(["true", "false"]).default("false"),
    WILMA_PUBLIC_ENABLED: z.enum(["true", "false"]).default("true"),
    WILMA_BETA_ONLY: z.enum(["true", "false"]).default("false"),
    WILMA_ALLOWED_STATES: z.string().optional(),
    WILMA_ROLLOUT_PERCENT: z.coerce.number().int().min(0).max(100).default(100),
    WILMA_MAINTENANCE_MODE: z.enum(["true", "false"]).default("false"),
    WILMA_KILL_SWITCH: z.enum(["true", "false"]).default("false"),
    WILMA_BETA_ALLOWED_EMAILS: z.string().optional(),
    WILMA_BETA_TOKENS: z.string().optional(),
	    ERROR_MONITORING_DSN: z.string().url().optional(),
	    PRODUCTION_ALERT_WEBHOOK_URL: z.string().url().optional(),
	    BETA_ACCESS_ENABLED: z.enum(["true", "false"]).default("true"),
	    BETA_INVITE_ONLY: z.enum(["true", "false"]).default("false"),
	    BETA_MAX_USERS: z.coerce.number().int().min(0).default(0),
	    BETA_APPROVED_EMAILS: z.string().optional(),
	    BETA_INVITE_CODES: z.string().optional(),
	    RECORD_CHECK_PURCHASE_ENABLED: z.enum(["true", "false"]).default("true"),
	    MONITORING_PURCHASE_ENABLED: z.enum(["true", "false"]).default("true"),
	    AI_SUMMARY_ENABLED: z.enum(["true", "false"]).default("true"),
	    ADMIN_RETRY_ENABLED: z.enum(["true", "false"]).default("true"),
	    DATA_DELETION_REQUEST_ENABLED: z.enum(["true", "false"]).default("true")
	  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "production") {
      return;
    }

    const requiredProductionKeys: Array<keyof typeof value> = [
      "DATABASE_URL",
      "APP_BASE_URL",
      "NEXTAUTH_SECRET",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_RECORD_CHECK",
      "STRIPE_PRICE_MONITORING_LITE_MONTHLY",
      "STRIPE_PRICE_MONITORING_LITE_ANNUAL",
      "STRIPE_PRICE_MONITORING_PLUS_MONTHLY",
      "CHECKR_API_KEY",
      "CHECKR_WEBHOOK_SECRET",
      "OPENAI_API_KEY",
      "BOT_PROTECTION_SECRET",
      "ERROR_MONITORING_DSN",
      "PRODUCTION_ALERT_WEBHOOK_URL"
    ];

    for (const key of requiredProductionKeys) {
      if (!value[key]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "Required in production."
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function normalizeEnv(input: Record<string, string | undefined>): Record<string, string | undefined> {
  const isProduction = input.NODE_ENV === "production";

  return {
    ...input,
    ...normalizePublicEnv(input),
    APP_BASE_URL: input.APP_BASE_URL ?? (isProduction ? undefined : input.NEXT_PUBLIC_APP_URL),
    STRIPE_PRICE_MONITORING_LITE_MONTHLY:
      input.STRIPE_PRICE_MONITORING_LITE_MONTHLY ?? input.STRIPE_PRICE_MONITORING_MONTHLY,
    STRIPE_PRICE_MONITORING_LITE_ANNUAL:
      input.STRIPE_PRICE_MONITORING_LITE_ANNUAL ?? input.STRIPE_PRICE_MONITORING_ANNUAL,
	    STRIPE_PRICE_MONITORING_MONTHLY:
	      input.STRIPE_PRICE_MONITORING_MONTHLY ??
	      input.STRIPE_PRICE_MONITORING_LITE_MONTHLY,
	    STRIPE_PRICE_MONITORING_ANNUAL:
	      input.STRIPE_PRICE_MONITORING_ANNUAL ??
	      input.STRIPE_PRICE_MONITORING_LITE_ANNUAL,
	    CHECKR_WEBHOOK_SECRET:
	      input.CHECKR_WEBHOOK_SECRET ??
	      (isProduction ? undefined : input.CHECKR_API_KEY),
	    RATE_LIMIT_REDIS_REST_URL:
	      input.RATE_LIMIT_REDIS_REST_URL ??
	      input.UPSTASH_REDIS_REST_URL ??
	      input.REDIS_REST_URL,
	    RATE_LIMIT_REDIS_REST_TOKEN:
	      input.RATE_LIMIT_REDIS_REST_TOKEN ??
	      input.UPSTASH_REDIS_REST_TOKEN ??
	      input.REDIS_REST_TOKEN
  };
}

export function parseEnv(input: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(normalizeEnv(input));
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment variables: ${details}`);
  }
  return parsed.data;
}

export function assertProductionEnv(input: Record<string, string | undefined> = process.env): Env {
  return parseEnv({ ...input, NODE_ENV: "production" });
}

export const env = parseEnv(process.env);
