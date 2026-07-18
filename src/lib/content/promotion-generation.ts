import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  promotionGenerationOutputSchema,
  type PromotionGenerationInput,
  type PromotionGenerationOutput,
  type PromotionGroundingIssue
} from "@/lib/content/promotion-generation-contract";
import {
  PROMOTION_CHANNEL_REGISTRY,
  normalizeHashtags,
  recommendedPromotionTemplate
} from "@/lib/content/promotion-studio";
import { canonicalUrlForPost, type PromotionPostRow } from "@/lib/content/promotion-package";
import {
  SOCIAL_CHANNELS,
  type ContentDestination,
  type ContentDoc,
  type ContentType,
  type SocialChannel
} from "@/lib/content/types";

const BODY_TEXT_LIMIT = 16_000;
const GENERATION_TIMEOUT_MS = 30_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60_000;
const RATE_LIMIT_MAX = 5;

export type PromotionProviderSource = {
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  bodyText: string;
  contentType: ContentType;
  destination: ContentDestination;
  subject: { category: string | null; tags: string[] };
  author: { name: string; title: string | null; organization: string | null } | null;
  jurisdiction: string | null;
  partner: string | null;
  canonicalUrl: string;
  featuredImage: { alt: string | null; caption: string | null } | null;
  ctas: { label: string; href: string }[];
  legalSensitive: boolean;
};

type RawPromotionSourceRow = PromotionPostRow & {
  doc: ContentDoc;
  excerpt: string | null;
  legal_sensitive: boolean;
  legal_approved_at: string | null;
  jurisdiction_code: string | null;
  partner_slug: string | null;
  category_id: string | null;
  featured_media_id: string | null;
  version: number;
  content_authors:
    | { name: string; title: string | null; organization: string | null }
    | { name: string; title: string | null; organization: string | null }[]
    | null;
};

const generationAttempts = new Map<string, number[]>();

export function promotionAiConfig():
  | { configured: true; apiKey: string; model: string }
  | { configured: false; reason: "disabled" | "missing_api_key" | "missing_model" } {
  if (process.env.CONTENT_PROMOTION_AI_ENABLED?.trim().toLowerCase() !== "true") {
    return { configured: false, reason: "disabled" };
  }
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { configured: false, reason: "missing_api_key" };
  const model = process.env.CONTENT_PROMOTION_OPENAI_MODEL?.trim();
  if (!model) return { configured: false, reason: "missing_model" };
  return { configured: true, apiKey, model };
}

export function checkPromotionGenerationRateLimit(key: string, now = Date.now()) {
  const recent = (generationAttempts.get(key) ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 1000));
    generationAttempts.set(key, recent);
    return { ok: false as const, retryAfterSeconds };
  }
  recent.push(now);
  generationAttempts.set(key, recent);
  return { ok: true as const, remaining: RATE_LIMIT_MAX - recent.length };
}

export function resetPromotionGenerationRateLimitForTests() {
  generationAttempts.clear();
}

export async function loadPromotionProviderSource(
  client: SupabaseClient,
  postId: string
): Promise<{ post: RawPromotionSourceRow; source: PromotionProviderSource } | null> {
  const { data, error } = await client
    .from("content_posts")
    .select(
      "post_id, slug, destination, content_type, status, title, subtitle, excerpt, doc, legal_sensitive, legal_approved_at, jurisdiction_code, partner_slug, category_id, featured_media_id, version, canonical_url, published_at, updated_at, content_authors:author_id ( name, title, organization )"
    )
    .eq("post_id", postId)
    .limit(1);
  if (error || !data?.length) return null;

  const post = data[0] as unknown as RawPromotionSourceRow;
  const [categoryResult, tagsResult, mediaResult] = await Promise.all([
    post.category_id
      ? client.from("content_categories").select("name").eq("category_id", post.category_id).limit(1)
      : Promise.resolve({ data: [], error: null }),
    client
      .from("content_post_tags")
      .select("content_tags:tag_id ( name )")
      .eq("post_id", postId)
      .limit(50),
    post.featured_media_id
      ? client
          .from("content_media")
          .select("alt_text, caption, public_url, permission_status")
          .eq("media_id", post.featured_media_id)
          .limit(1)
      : Promise.resolve({ data: [], error: null })
  ]);

  const relation = <T>(value: T | T[] | null | undefined): T | null =>
    Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  const author = relation(
    post.content_authors as
      | { name: string; title: string | null; organization: string | null }
      | { name: string; title: string | null; organization: string | null }[]
      | null
  );
  const categoryRow = categoryResult.data?.[0] as { name?: unknown } | undefined;
  const tagRows = (tagsResult.data ?? []) as unknown as { content_tags: { name?: unknown } | { name?: unknown }[] | null }[];
  const mediaRow = mediaResult.data?.[0] as
    | { alt_text?: unknown; caption?: unknown; public_url?: unknown; permission_status?: unknown }
    | undefined;
  const mediaPermissionAllowsSocial = ["owned", "licensed", "partner_approved", "editorial_use"].includes(
    String(mediaRow?.permission_status ?? "")
  );

  const doc: ContentDoc =
    post.doc && typeof post.doc === "object" ? post.doc : { type: "doc", content: [] };
  return {
    post,
    source: {
      title: post.title,
      subtitle: post.subtitle,
      excerpt: post.excerpt,
      bodyText: contentDocToPlainText(doc).slice(0, BODY_TEXT_LIMIT),
      contentType: post.content_type,
      destination: post.destination,
      subject: {
        category: typeof categoryRow?.name === "string" ? categoryRow.name : null,
        tags: tagRows
          .map((row) => relation(row.content_tags)?.name)
          .filter((name): name is string => typeof name === "string")
      },
      author: author
        ? { name: author.name, title: author.title ?? null, organization: author.organization ?? null }
        : null,
      jurisdiction: post.jurisdiction_code,
      partner: post.partner_slug,
      canonicalUrl: canonicalUrlForPost(post),
      featuredImage:
        mediaRow && mediaPermissionAllowsSocial
          ? {
              alt: typeof mediaRow.alt_text === "string" ? mediaRow.alt_text : null,
              caption: typeof mediaRow.caption === "string" ? mediaRow.caption : null
            }
          : null,
      ctas: extractCtas(doc),
      legalSensitive: post.legal_sensitive
    }
  };
}

export function contentDocToPlainText(doc: ContentDoc): string {
  const lines: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record.type === "text" && typeof record.text === "string") lines.push(record.text);
    if (record.type === "cta" && record.attrs && typeof record.attrs === "object") {
      const attrs = record.attrs as Record<string, unknown>;
      if (typeof attrs.label === "string") lines.push(attrs.label);
    }
    if (Array.isArray(record.content)) {
      for (const child of record.content) visit(child);
      if (["paragraph", "heading", "listItem", "blockquote", "pullQuote", "callout"].includes(String(record.type))) {
        lines.push("\n");
      }
    }
  };
  visit(doc);
  return lines.join(" ").replace(/\s*\n\s*/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function extractCtas(doc: ContentDoc): { label: string; href: string }[] {
  const ctas: { label: string; href: string }[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    if (record.type === "cta" && record.attrs && typeof record.attrs === "object") {
      const attrs = record.attrs as Record<string, unknown>;
      if (typeof attrs.label === "string" && typeof attrs.href === "string") {
        ctas.push({ label: attrs.label.slice(0, 160), href: attrs.href.slice(0, 500) });
      }
    }
    if (Array.isArray(record.content)) for (const child of record.content) visit(child);
  };
  visit(doc);
  return ctas.slice(0, 10);
}

export async function generatePromotionCampaign(options: {
  source: PromotionProviderSource;
  input: PromotionGenerationInput;
  apiKey: string;
  model: string;
  client?: Pick<OpenAI, "responses">;
}): Promise<{ output: PromotionGenerationOutput; issues: PromotionGroundingIssue[] }> {
  const requestedChannels = options.input.channels ?? [...SOCIAL_CHANNELS];
  const client = options.client ?? new OpenAI({ apiKey: options.apiKey });
  const channelRules = Object.fromEntries(
    requestedChannels.map((channel) => [
      channel,
      {
        limit: PROMOTION_CHANNEL_REGISTRY[channel].limit,
        strategy: PROMOTION_CHANNEL_REGISTRY[channel].strategy,
        hashtagLimit: PROMOTION_CHANNEL_REGISTRY[channel].hashtagLimit
      }
    ])
  );

  const response = await client.responses.create(
    {
      model: options.model,
      store: false,
      instructions: buildGenerationInstructions(options.source.legalSensitive),
      input: JSON.stringify({
        task: {
          ...options.input,
          channels: requestedChannels,
          recommendedTemplate: recommendedPromotionTemplate(options.source.contentType)
        },
        channelRules,
        savedArticle: options.source
      }),
      text: { format: zodTextFormat(promotionGenerationOutputSchema, "promotion_campaign") }
    },
    { timeout: GENERATION_TIMEOUT_MS }
  );

  let json: unknown;
  try {
    json = JSON.parse(response.output_text);
  } catch {
    throw new PromotionGenerationError("invalid_provider_output", "The drafting provider returned unreadable structured output.");
  }
  const parsed = promotionGenerationOutputSchema.safeParse(json);
  if (!parsed.success) {
    throw new PromotionGenerationError("invalid_provider_output", "The drafting provider response did not match the required campaign structure.");
  }

  const output = normalizeGeneratedCampaign(parsed.data);
  return { output, issues: guardGeneratedCampaign(options.source, output, requestedChannels) };
}

function buildGenerationInstructions(legalSensitive: boolean): string {
  return [
    "Create a complete promotion campaign using only the supplied savedArticle object.",
    "Return the exact structured schema. Generate all seven channel objects even when only some channels are requested; non-requested channel content may be concise.",
    "Do not use outside knowledge or browse. Do not invent statistics, dates, statutes, waiting periods, filing rules, eligibility, outcomes, testimonials, quotations, handles, product availability, metrics, legal effects, fees, or guarantees.",
    "Mention candidates are plain names from the saved article, never @handles.",
    "Make A/B alternatives materially different. Keep every caption within its channel limit.",
    "LegalEase is not a law firm and does not provide legal representation. Use one source-grounded CTA.",
    legalSensitive
      ? "This article is legally sensitive. Summarize only what it says; never say someone qualifies or promise expungement, sealing, dismissal, or any court result. Prefer ‘may be available,’ ‘learn about the process,’ and ‘start a free check’ only when supported by the source."
      : "Do not imply legal advice, legal representation, qualification, or a guaranteed result."
  ].join("\n");
}

function normalizeGeneratedCampaign(output: PromotionGenerationOutput): PromotionGenerationOutput {
  return {
    ...output,
    channels: Object.fromEntries(
      SOCIAL_CHANNELS.map((channel) => [
        channel,
        {
          ...output.channels[channel],
          hashtags: normalizeHashtags(output.channels[channel].hashtags, channel),
          mentionCandidates: [...new Set(output.channels[channel].mentionCandidates.map((name) => name.trim()).filter(Boolean))]
        }
      ])
    ) as PromotionGenerationOutput["channels"]
  };
}

export function guardGeneratedCampaign(
  source: PromotionProviderSource,
  output: PromotionGenerationOutput,
  channels: readonly SocialChannel[] = SOCIAL_CHANNELS
): PromotionGroundingIssue[] {
  const issues: PromotionGroundingIssue[] = [];
  const sourceText = JSON.stringify(source);
  const sourceNumbers = new Set(extractNumbers(sourceText));
  const sourceUrls = new Set([source.canonicalUrl, ...source.ctas.map((cta) => cta.href)]);
  const approvedNames = [
    "LegalEase",
    "Expungement.ai",
    source.author?.name,
    source.author?.organization,
    source.partner,
    source.subject.category,
    ...source.subject.tags
  ].filter((value): value is string => Boolean(value));
  const knownNameText = `${sourceText} ${approvedNames.join(" ")}`.toLocaleLowerCase("en-US");
  const disallowed = /\b(guarantee(?:d|s)?|you qualify|you are eligible|will (?:be )?(?:expunged|sealed|dismissed)|we (?:are|act as) (?:a )?law firm|legal representation)\b/i;

  const inspect = (text: string, channel: SocialChannel | null, field: string) => {
    for (const number of extractNumbers(text)) {
      if (sourceNumbers.has(number)) continue;
      const percentage = number.endsWith("%");
      issues.push({
        severity: "blocker",
        code: percentage ? "new_percentage" : looksLikeDateToken(number, text) ? "new_date" : "new_number",
        channel,
        field,
        message: `Review required: “${number}” does not appear in the saved article source.`
      });
    }
    for (const url of text.match(/https?:\/\/[^\s)\]}>,]+/gi) ?? []) {
      if (![...sourceUrls].some((allowed) => trimUrlPunctuation(allowed) === trimUrlPunctuation(url))) {
        issues.push({
          severity: "blocker",
          code: "unknown_url",
          channel,
          field,
          message: "Generated copy contains a URL that was not supplied by the platform."
        });
      }
    }
    if (disallowed.test(text)) {
      issues.push({
        severity: "blocker",
        code: "guarantee_language",
        channel,
        field,
        message: "Generated copy contains qualification, guarantee, law-firm, or representation language that cannot be approved."
      });
    }
  };

  inspect(JSON.stringify(output.brief), null, "brief");
  for (const channel of channels) {
    const generated = output.channels[channel];
    for (const field of ["primaryCaption", "alternateCaption", "founderVoiceCaption", "partnerCaption"] as const) {
      const text = generated[field];
      inspect(text, channel, field);
      if (text.length > PROMOTION_CHANNEL_REGISTRY[channel].limit) {
        issues.push({
          severity: "blocker",
          code: "over_limit",
          channel,
          field,
          message: `${PROMOTION_CHANNEL_REGISTRY[channel].label} ${field} exceeds the ${PROMOTION_CHANNEL_REGISTRY[channel].limit}-character limit.`
        });
      }
    }
    for (const candidate of generated.mentionCandidates) {
      if (!knownNameText.includes(candidate.toLocaleLowerCase("en-US"))) {
        issues.push({
          severity: "warning",
          code: "unknown_name",
          channel,
          field: "mentionCandidates",
          message: `“${candidate}” is not present in approved author, partner, or article metadata.`
        });
      }
    }
    for (const name of extractLikelyNamedEntities(Object.values(generated).filter((value) => typeof value === "string").join(" "))) {
      if (!knownNameText.includes(name.toLocaleLowerCase("en-US"))) {
        issues.push({
          severity: "warning",
          code: "unknown_name",
          channel,
          field: "copy",
          message: `Review the generated name “${name}”; it is not present in approved metadata.`
        });
      }
    }
  }

  return uniqueIssues(issues);
}

function extractNumbers(value: string): string[] {
  return (
    value
      .match(/\b\d{1,4}(?:[,.]\d+)*(?:%|st|nd|rd|th)?(?=\s|$|[.,;:!?)}\]])/gi)
      ?.map((token) => token.toLowerCase()) ?? []
  );
}

function looksLikeDateToken(token: string, context: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[^.!?]{0,16}\\b${escaped}\\b|\\b${escaped}\\b[^.!?]{0,16}(?:day|month|year)`, "i").test(context);
}

function extractLikelyNamedEntities(value: string): string[] {
  return value.match(/\b(?:[A-Z][a-z]+\s+){1,4}(?:Foundation|Coalition|Association|Institute|University|Department|Center|Council|Inc\.?|LLC)\b/g) ?? [];
}

function trimUrlPunctuation(value: string): string {
  return value.replace(/[.,;:!?]+$/, "");
}

function uniqueIssues(issues: PromotionGroundingIssue[]): PromotionGroundingIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.channel}:${issue.field}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class PromotionGenerationError extends Error {
  constructor(
    readonly code: "invalid_provider_output" | "timeout" | "provider_error",
    message: string
  ) {
    super(message);
    this.name = "PromotionGenerationError";
  }
}
