import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import { getBriefcaseItem, mergeBriefcaseArtifactRefs } from "@/lib/expungement-ai/briefcase";
import {
  buildFilingChecklist,
  filingChecklistPatch,
  matterHasFilingChecklist,
  parseFilingChecklistAction
} from "@/lib/expungement-ai/filing-checklist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxPayloadBytes = 4_000;

/**
 * Update the consumer's filing checklist for one of their own matters.
 *
 * Writes only `artifact_refs_json.filingChecklist` through the owner-scoped
 * merge writer (the same path packet information uses). It never touches
 * eligibility, payment, packet or delivery state.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 415 });
  }

  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  const { itemId } = await context.params;
  const item = await getBriefcaseItem(auth.userId, itemId);
  if (!item) {
    return NextResponse.json({ ok: false, error: "matter_not_found" }, { status: 404 });
  }
  if (!matterHasFilingChecklist(item)) {
    return NextResponse.json({ ok: false, error: "checklist_unavailable" }, { status: 409 });
  }

  const body = await readBody(request);
  if (body === null) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  const action = parseFilingChecklistAction(body);
  if ("error" in action) {
    return NextResponse.json({ ok: false, error: action.error }, { status: 400 });
  }

  const update = filingChecklistPatch(buildFilingChecklist(item), action, {
    now: new Date(),
    newStepId: () => `cus-${randomBytes(9).toString("hex")}`
  });
  if ("error" in update) {
    const status = update.error === "step_not_found" ? 404 : update.error === "too_many_steps" ? 409 : 400;
    return NextResponse.json({ ok: false, error: update.error }, { status });
  }

  const saved = await mergeBriefcaseArtifactRefs(auth.userId, item.id, update.patch);
  if (!saved) {
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, checklist: buildFilingChecklist(saved) });
}

async function readBody(request: Request): Promise<unknown | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxPayloadBytes) return null;
  const text = await request.text().catch(() => "");
  if (new TextEncoder().encode(text).length > maxPayloadBytes) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
