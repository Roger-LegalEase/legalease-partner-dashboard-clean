import { NextRequest, NextResponse } from "next/server";
import { createLegalEaseOsSupportItem, normalizeSupportCategory } from "@/lib/expungement-ai/support-os-adapter";
import { getServerAuthState } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categories = new Set([
  "account_login",
  "payment_receipt",
  "packet_download",
  "briefcase",
  "wilma",
  "technical_issue",
  "general_contact",
  "something_else",
  "other"
]);

type SupportPayload = {
  category?: unknown;
  email?: unknown;
  briefcaseItemId?: unknown;
  message?: unknown;
  routeSubmittedFrom?: unknown;
  legalAdviceWarningAcknowledged?: unknown;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as SupportPayload | null;
  const category = normalize(body?.category);
  const email = normalize(body?.email);
  const briefcaseItemId = normalize(body?.briefcaseItemId);
  const message = normalize(body?.message);
  const routeSubmittedFrom = normalize(body?.routeSubmittedFrom) || "/expungement-ai/support";

  if (!category || !categories.has(category)) {
    return NextResponse.json({ error: "A valid support category is required." }, { status: 400 });
  }

  if (!email || !isEmail(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (!message || message.length < 10) {
    return NextResponse.json({ error: "A support message of at least 10 characters is required." }, { status: 400 });
  }

  const auth = await optionalAuthState();
  const result = await createLegalEaseOsSupportItem({
    category: normalizeSupportCategory(category),
    email,
    message,
    userId: auth.userId,
    briefcaseItemId: briefcaseItemId || undefined,
    routeSubmittedFrom,
    userAgent: request.headers.get("user-agent") ?? undefined,
    legalAdviceWarningAcknowledged: body?.legalAdviceWarningAcknowledged === true
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "Support intake is temporarily unavailable. Please try again later." }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    supportItemId: result.supportItemId,
    ...(result.dryRun ? { dryRun: true } : {}),
    message: "Thanks — your request has been sent to LegalEase support."
  });
}

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

async function optionalAuthState() {
  try {
    return await getServerAuthState();
  } catch {
    return { isAuthenticated: false as const };
  }
}
