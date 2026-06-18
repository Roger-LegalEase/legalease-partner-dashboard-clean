import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityWarn } from "@/lib/observability/logger";
import { submitLegalEaseCorrespondence } from "@/lib/legalease/correspondence";
import { isLegalEaseProductId, productNameFor } from "@/lib/legalease/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxPayloadBytes = 8_000;

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const parsed = await readJson(request, "/api/legalease/waitlist", requestId);
  if (!parsed.ok) return parsed.response;

  const body = parsed.body as Record<string, unknown>;
  const name = cleanString(body.name, 120);
  const email = cleanString(body.email, 180).toLowerCase();
  const product = cleanString(body.product, 80);

  if (name.length < 2 || !isEmail(email) || !isLegalEaseProductId(product)) {
    logSecurityWarn({ event: "legalease_waitlist validation failed", route: "/api/legalease/waitlist", outcome: "invalid_payload", requestId });
    return NextResponse.json({ ok: false, error: "Please check your name, email, and product." }, { status: 400 });
  }

  const result = await submitLegalEaseCorrespondence({
    source: "waitlist",
    name,
    email,
    product,
    productName: productNameFor(product),
    route: "/legalease/waitlist",
    userAgent: request.headers.get("user-agent")
  });

  if (!result.ok) {
    logSecurityError({ event: "legalease_waitlist enqueue failed", route: "/api/legalease/waitlist", outcome: result.mode, requestId });
    return NextResponse.json({ ok: false, error: "Waitlist intake is temporarily unavailable. Please contact info@legalease.law." }, { status: 503 });
  }

  return NextResponse.json({ ok: true, dryRun: result.dryRun });
}

async function readJson(request: Request, route: string, requestId: string) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Invalid request." }, { status: 415 }) };
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxPayloadBytes) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 }) };
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxPayloadBytes) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 }) };
  }

  try {
    return { ok: true as const, body: JSON.parse(text) as unknown };
  } catch {
    logSecurityWarn({ event: "legalease_json parse failed", route, outcome: "invalid_json", requestId });
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 }) };
  }
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/[\r\n\t]/g, " ").trim().slice(0, maxLength) : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
