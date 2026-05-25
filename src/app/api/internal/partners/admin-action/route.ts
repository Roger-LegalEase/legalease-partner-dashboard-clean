import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getMockAdminActionMessage,
  isSupportedPartnerAdminAction
} from "@/lib/partners/admin-actions";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminActionSchema = z.object({
  action: z.string().min(1),
  partnerSlug: z.string().min(1),
  note: z.string().max(1000).optional(),
  assetKey: z.string().optional()
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid admin action request." }, { status: 400 });
  }

  const parsed = adminActionSchema.safeParse(body);
  if (!parsed.success || !isSupportedPartnerAdminAction(parsed.data.action)) {
    return NextResponse.json({ error: "Unsupported admin action." }, { status: 400 });
  }

  const partner = await getPartnerRecordBySlug(parsed.data.partnerSlug);
  if (!partner) {
    return NextResponse.json({ error: "Unknown partner." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    action: parsed.data.action,
    partnerSlug: parsed.data.partnerSlug,
    message: getMockAdminActionMessage(parsed.data.action, parsed.data.partnerSlug),
    persisted: false
  });
}
