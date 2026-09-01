import { NextRequest, NextResponse } from "next/server";
import { clinicErrorResponse } from "@/app/api/clinic/error-response";
import { listClinicFollowUps, saveClinicFollowUp } from "@/lib/clinic-mode/reporting-service";
import type { ClinicFollowUp, SaveClinicFollowUpInput } from "@/lib/clinic-mode/types";
import { parseEventId } from "@/lib/clinic-mode/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses: ClinicFollowUp["status"][] = ["open", "waiting_on_participant", "waiting_on_staff", "completed", "cancelled"];
const communicationStates: ClinicFollowUp["communicationState"][] = ["draft", "approved", "sent", "failed", "no_contact"];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const followUps = await listClinicFollowUps(parseEventId(eventId));
    return NextResponse.json({ success: true, followUps }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return clinicErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const input = parseInput(await request.json());
    const id = await saveClinicFollowUp(parseEventId(eventId), input);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return clinicErrorResponse(error);
  }
}

export const PATCH = POST;

function parseInput(value: unknown): SaveClinicFollowUpInput {
  const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const status = String(body.status) as ClinicFollowUp["status"];
  const communicationState = String(body.communicationState) as ClinicFollowUp["communicationState"];
  if (!statuses.includes(status) || !communicationStates.includes(communicationState)) throw new Error("invalid follow-up state");
  return {
    id: body.id ? parseEventId(String(body.id)) : null,
    clinicCaseId: parseEventId(typeof body.clinicCaseId === "string" ? body.clinicCaseId : ""),
    ownerEventStaffId: body.ownerEventStaffId ? parseEventId(String(body.ownerEventStaffId)) : null,
    dueAt: body.dueAt ? validDate(body.dueAt) : null,
    status,
    communicationState,
    participantSafeMessage: limitedText(body.participantSafeMessage, 1200),
    internalNotes: limitedText(body.internalNotes, 4000)
  };
}

function validDate(value: unknown) {
  const date = new Date(String(value));
  if (!Number.isFinite(date.valueOf())) throw new Error("invalid follow-up date");
  return date.toISOString();
}

function limitedText(value: unknown, limit: number) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > limit) throw new Error("follow-up text is too long");
  return text;
}
