import { NextResponse } from "next/server";
import { z } from "zod";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import { jsonError, requireSupabase, storageFailure, UUID_PATTERN, type RouteContext } from "@/lib/content/route-support";
import { recordAudit } from "@/lib/content/workflow";
import { getSafeRequestId, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/content/state-editorial/[code]";

const SELECT =
  "jurisdiction_code, intro, overview, featured_media_id, faqs, related_slugs, partner_quote, partner_slug, announcement, seo_title, seo_description, og_media_id, cta_label, cta_href, status, legal_approved_at, legal_approved_by, updated_by, created_at, updated_at";

/**
 * The LOCKED legal layer (eligibility rules, statutes, waiting periods, pathway data, the state's
 * own vocabulary) is derived from the approved engine projection at render time — it is deliberately
 * not stored in this table and is NOT editable here. An attempt to write one of these is refused
 * loudly rather than silently dropped, so nobody believes they have edited the law.
 */
const LOCKED_FIELDS = [
  "code",
  "name",
  "slug",
  "displayTerm",
  "termBlurb",
  "allowedStateTerms",
  "pathwayHighlights",
  "screeningHref",
  "statePickerHref",
  "locked",
  "eligibility",
  "eligibilityRules",
  "statutes",
  "waitingPeriods",
  "filingSteps",
  "fees",
  "forms",
  "pathways"
];

const uuidField = z.string().regex(UUID_PATTERN, "Must be a UUID.");

const patchSchema = z.strictObject({
  intro: z.string().trim().max(4000).nullish(),
  overview: z.string().trim().max(20000).nullish(),
  featuredMediaId: uuidField.nullish(),
  faqs: z
    .array(z.strictObject({ question: z.string().trim().min(1).max(300), answer: z.string().trim().min(1).max(4000) }))
    .max(30)
    .optional(),
  relatedSlugs: z.array(z.string().trim().min(1).max(160)).max(20).optional(),
  partnerQuote: z.string().trim().max(2000).nullish(),
  partnerSlug: z.string().trim().max(120).nullish(),
  announcement: z.string().trim().max(1000).nullish(),
  seoTitle: z.string().trim().max(200).nullish(),
  seoDescription: z.string().trim().max(400).nullish(),
  ogMediaId: uuidField.nullish(),
  ctaLabel: z.string().trim().max(120).nullish(),
  ctaHref: z.string().trim().max(500).nullish(),
  status: z.enum(["draft", "in_legal_review", "approved", "published", "archived"]).optional()
});

function normalizeCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("content.read", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);
  if (!code) return jsonError(400, "A jurisdiction code is two letters.");

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const { data, error } = await client.from("content_state_editorial").select(SELECT).eq("jurisdiction_code", code).limit(1);
  if (error) return storageFailure(context, "content state editorial read failed", error);

  return NextResponse.json({
    success: true,
    jurisdictionCode: code,
    editorial: data?.[0] ?? null,
    lockedFields: LOCKED_FIELDS
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const requestId = getSafeRequestId(request);
  const context: RouteContext = { route: ROUTE, requestId };

  const gate = await denyUnlessContentCapability("content.edit_any", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);
  if (!code) return jsonError(400, "A jurisdiction code is two letters.");

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const attempted = LOCKED_FIELDS.filter((field) => field in (raw as Record<string, unknown>));
    if (attempted.length) {
      logSecurityWarn({ event: "content state editorial locked field", route: ROUTE, outcome: "forbidden_field", requestId });
      return jsonError(
        422,
        "The locked legal layer is derived from the approved state engine and cannot be edited here.",
        { code: "locked_field", rejectedFields: attempted }
      );
    }
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, "Invalid request payload.", {
      problems: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    });
  }
  const input = parsed.data;

  const patch: Record<string, unknown> = { jurisdiction_code: code, updated_by: gate.session.userId };
  if (input.intro !== undefined) patch.intro = input.intro ?? null;
  if (input.overview !== undefined) patch.overview = input.overview ?? null;
  if (input.featuredMediaId !== undefined) patch.featured_media_id = input.featuredMediaId ?? null;
  if (input.faqs !== undefined) patch.faqs = input.faqs;
  if (input.relatedSlugs !== undefined) patch.related_slugs = input.relatedSlugs;
  if (input.partnerQuote !== undefined) patch.partner_quote = input.partnerQuote ?? null;
  if (input.partnerSlug !== undefined) patch.partner_slug = input.partnerSlug ?? null;
  if (input.announcement !== undefined) patch.announcement = input.announcement ?? null;
  if (input.seoTitle !== undefined) patch.seo_title = input.seoTitle ?? null;
  if (input.seoDescription !== undefined) patch.seo_description = input.seoDescription ?? null;
  if (input.ogMediaId !== undefined) patch.og_media_id = input.ogMediaId ?? null;
  if (input.ctaLabel !== undefined) patch.cta_label = input.ctaLabel ?? null;
  if (input.ctaHref !== undefined) patch.cta_href = input.ctaHref ?? null;
  if (input.status !== undefined) patch.status = input.status;

  const { client, response } = requireSupabase(context);
  if (!client) return response;

  const { data, error } = await client
    .from("content_state_editorial")
    .upsert(patch, { onConflict: "jurisdiction_code" })
    .select(SELECT)
    .limit(1);

  if (error) {
    // State editorial is inherently legal content: the DB refuses to publish it unreviewed.
    if (error.message?.includes("content_state_editorial_legal_required_check")) {
      return jsonError(
        422,
        "State editorial cannot be published without a recorded legal approval.",
        { code: "legal_review_required" }
      );
    }
    return storageFailure(context, "content state editorial upsert failed", error);
  }

  await recordAudit({
    actorId: gate.session.userId,
    actorRole: gate.session.role,
    action: "saved",
    entityType: "content_state_editorial",
    entityId: code,
    detail: { fields: Object.keys(patch).filter((key) => key !== "jurisdiction_code" && key !== "updated_by") }
  });

  logSecurityInfo({ event: "content state editorial saved", route: ROUTE, outcome: "ok", requestId, metadata: { row_id: code } });

  return NextResponse.json({ success: true, editorial: data?.[0] ?? null });
}
