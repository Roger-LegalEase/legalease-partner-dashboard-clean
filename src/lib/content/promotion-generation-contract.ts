import { z } from "zod";

import {
  PROMOTION_CLASSIFICATIONS,
  PROMOTION_OBJECTIVES,
  PROMOTION_TONES,
  PROMOTION_VARIANTS
} from "@/lib/content/promotion-studio";
import { SOCIAL_CHANNELS, SOCIAL_TEMPLATES } from "@/lib/content/types";
import type { SocialChannel } from "@/lib/content/types";

export const PROMOTION_GENERATION_MODES = [
  "fill_empty",
  "regenerate_selected",
  "regenerate_all"
] as const;

export const promotionGenerationInputSchema = z.strictObject({
  channels: z.array(z.enum(SOCIAL_CHANNELS)).min(1).max(SOCIAL_CHANNELS.length).optional(),
  mode: z.enum(PROMOTION_GENERATION_MODES),
  classification: z.enum(PROMOTION_CLASSIFICATIONS).optional(),
  objective: z.enum(PROMOTION_OBJECTIVES).optional(),
  audience: z.string().trim().min(1).max(240).optional(),
  tone: z.enum(PROMOTION_TONES).optional(),
  cta: z.string().trim().min(1).max(240).optional(),
  includeFounderVoice: z.boolean().optional(),
  includePartnerCopy: z.boolean().optional(),
  generateAssetPlan: z.boolean().optional(),
  field: z.enum([...PROMOTION_VARIANTS, "hashtags"]).optional(),
  shortenToLimit: z.boolean().optional()
});

export type PromotionGenerationInput = z.infer<typeof promotionGenerationInputSchema>;

const generatedChannelSchema = z.strictObject({
  primaryCaption: z.string().max(10_000),
  alternateCaption: z.string().max(10_000),
  founderVoiceCaption: z.string().max(10_000),
  partnerCaption: z.string().max(10_000),
  hashtags: z.array(z.string().max(80)).max(30),
  mentionCandidates: z.array(z.string().max(160)).max(20)
});

export const promotionGenerationOutputSchema = z.strictObject({
  brief: z.strictObject({
    classification: z.enum(PROMOTION_CLASSIFICATIONS),
    objective: z.enum(PROMOTION_OBJECTIVES),
    primaryAudience: z.string().min(1).max(400),
    secondaryAudience: z.string().max(400).nullable(),
    keyMessage: z.string().min(1).max(800),
    supportingPoints: z.array(z.string().min(1).max(500)).min(3).max(5),
    tone: z.enum(PROMOTION_TONES),
    cta: z.string().min(1).max(300)
  }),
  channels: z.strictObject({
    linkedin: generatedChannelSchema,
    x: generatedChannelSchema,
    facebook: generatedChannelSchema,
    instagram: generatedChannelSchema,
    threads: generatedChannelSchema,
    email: generatedChannelSchema,
    partner_kit: generatedChannelSchema
  }),
  assetPlan: z.array(
    z.strictObject({
      template: z.enum(SOCIAL_TEMPLATES),
      headline: z.string().min(1).max(180),
      subheadline: z.string().max(240).nullable(),
      recommendedSizes: z.array(z.enum(["og", "square", "portrait"])).min(1).max(3)
    })
  ).max(6)
});

export type PromotionGenerationOutput = z.infer<typeof promotionGenerationOutputSchema>;

export type PromotionGroundingIssue = {
  severity: "warning" | "blocker";
  code:
    | "new_number"
    | "new_percentage"
    | "new_date"
    | "unknown_url"
    | "guarantee_language"
    | "fabricated_quote"
    | "legal_claim"
    | "unverified_handle"
    | "unknown_name"
    | "over_limit";
  channel: SocialChannel | null;
  field: string;
  message: string;
};

export const PROMOTION_AI_NOT_CONFIGURED_MESSAGE =
  "AI campaign drafting is not configured. You can continue drafting manually, generate branded assets, and export the promotion package.";
