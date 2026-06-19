import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityWarn } from "@/lib/observability/logger";
import { submitLegalEaseCorrespondence } from "@/lib/legalease/correspondence";
import { sourceDomainFromRequest } from "@/lib/legalease/launch-os-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxPayloadBytes = 12_000;
const topics = new Map([
  ["support", "Help with my record"],
  ["partnership", "Partnership"],
  ["press", "Press"],
  ["other", "Something else"]
]);

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const parsed = await readJson(request, "/api/legalease/contact", requestId);
  if (!parsed.ok) return parsed.response;

  const body = parsed.body as Record<string, unknown>;
  const name = cleanString(body.name, 120);
  const email = cleanString(body.email, 180).toLowerCase();
  const organization = cleanString(body.organization, 160);
  const topic = cleanString(body.topic, 40);
  const message = cleanString(body.message, 4_000);

  if (name.length < 2 || !isEmail(email) || !topics.has(topic) || message.length < 3) {
    logSecurityWarn({ event: "legalease_contact validation failed", route: "/api/legalease/contact", outcome: "invalid_payload", requestId });
    return NextResponse.json({ ok: false, error: "Please check your name, email, topic, and message." }, { status: 400 });
  }

  const result = await submitLegalEaseCorrespondence({
    source: "contact",
    name,
    email,
    organization,
    topic,
    topicLabel: topics.get(topic),
    message,
    route: "/legalease/contact",
    sourceDomain: sourceDomainFromRequest(request),
    userAgent: request.headers.get("user-agent")
  });

  if (!result.ok) {
    logSecurityError({ event: "legalease_contact enqueue failed", route: "/api/legalease/contact", outcome: result.mode, requestId });
    return NextResponse.json({ ok: false, error: "Contact intake is temporarily unavailable. Please email info@legalease.law." }, { status: 503 });
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
