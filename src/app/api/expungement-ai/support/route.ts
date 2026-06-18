import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categories = new Set([
  "account_login",
  "payment_receipt",
  "packet_download",
  "briefcase",
  "wilma",
  "something_else"
]);

type SupportPayload = {
  category?: unknown;
  email?: unknown;
  briefcaseItemId?: unknown;
  message?: unknown;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as SupportPayload | null;
  const category = normalize(body?.category);
  const email = normalize(body?.email);
  const briefcaseItemId = normalize(body?.briefcaseItemId);
  const message = normalize(body?.message);

  if (!category || !categories.has(category)) {
    return NextResponse.json({ error: "A valid support category is required." }, { status: 400 });
  }

  if (!email || !isEmail(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (!message || message.length < 10) {
    return NextResponse.json({ error: "A support message of at least 10 characters is required." }, { status: 400 });
  }

  const sanitized = sanitizeSupportMessage(message);
  const supportRequestId = `support_${Date.now().toString(36)}`;

  console.info("expungement_ai_support_request dry_run", {
    supportRequestId,
    category,
    hasBriefcaseItemId: Boolean(briefcaseItemId),
    piiDetected: sanitized.piiDetected,
    messageRedacted: sanitized.messageRedacted
  });

  return NextResponse.json({
    ok: true,
    mode: "dry_run",
    supportRequestId,
    piiDetected: sanitized.piiDetected,
    message: "Support request captured for server-log-only triage. Email sending and database persistence are not configured for this launch-polish patch."
  });
}

export function sanitizeSupportMessage(input: string) {
  const collapsed = input.replace(/\s+/g, " ").trim().slice(0, 2000);
  let messageRedacted = collapsed
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[redacted-ssn]")
    .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, "[redacted-full-dob]")
    .replace(/\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Drive|Dr\.?|Lane|Ln\.?|Boulevard|Blvd\.?|Court|Ct\.?)\b/gi, "[redacted-full-address]");

  const piiDetected = messageRedacted !== collapsed;
  messageRedacted = messageRedacted.replace(/[<>]/g, "");

  return { messageRedacted, piiDetected };
}

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}
