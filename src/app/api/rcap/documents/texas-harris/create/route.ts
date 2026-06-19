import { NextResponse } from "next/server";
import { createTexasHarrisDocumentPacket } from "@/lib/rcap/documents/source-repository";
import type { TexasHarrisCourtType, TexasHarrisDispositionRoute, TexasHarrisDocumentPacketInput } from "@/lib/rcap/documents/types";
import { verifyRcapCaptchaToken } from "@/lib/security/rcap-captcha";

export async function POST(request: Request) {
  const body = await safeJson(request);
  const captcha = await verifyRcapCaptchaToken(body.turnstileToken);
  if (!captcha.ok) return NextResponse.json({ error: captcha.error }, { status: 403 });

  const partnerSlug = readText(body.partnerSlug) ?? "";
  const intakeSessionId = readText(body.intakeSessionId);
  const result = await createTexasHarrisDocumentPacket({ ...readTexasHarrisInput(body), partnerSlug, intakeSessionId, state: "TX", county: "Harris" });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ packet: result.packet, persisted: result.persisted });
}

async function safeJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readTexasHarrisInput(body: Record<string, unknown>): Partial<TexasHarrisDocumentPacketInput> {
  return {
    courtType: readCourtType(body.courtType),
    courtName: readText(body.courtName),
    caseNumber: readText(body.caseNumber),
    petitionerFirstName: readText(body.petitionerFirstName),
    petitionerLastName: readText(body.petitionerLastName),
    petitionerAddress: readText(body.petitionerAddress),
    petitionerDateOfBirth: readText(body.petitionerDateOfBirth),
    petitionerDriverLicenseOrId: readText(body.petitionerDriverLicenseOrId),
    petitionerSsnLastFour: readText(body.petitionerSsnLastFour),
    otherNamesUsed: readText(body.otherNamesUsed),
    arrestDate: readText(body.arrestDate),
    arrestingAgency: readText(body.arrestingAgency),
    agencyCaseNumber: readText(body.agencyCaseNumber),
    charge: readText(body.charge),
    statuteOrOffenseCode: readText(body.statuteOrOffenseCode),
    disposition: readText(body.disposition),
    dispositionDate: readText(body.dispositionDate),
    dispositionRoute: readDispositionRoute(body.dispositionRoute),
    statutoryRoute: readText(body.statutoryRoute),
    waitingPeriodFacts: readText(body.waitingPeriodFacts),
    dpsCriminalHistoryReady: readBoolean(body.dpsCriminalHistoryReady),
    certifiedDispositionReady: readBoolean(body.certifiedDispositionReady),
    noPendingCharges: readBoolean(body.noPendingCharges),
    noDisqualifyingHistory: readBoolean(body.noDisqualifyingHistory),
    disqualifierNotes: readText(body.disqualifierNotes),
    harrisDaNotice: readBoolean(body.harrisDaNotice),
    includeHoustonPoliceDepartment: readBoolean(body.includeHoustonPoliceDepartment),
    additionalAgencies: readStringList(body.additionalAgencies),
    verificationReady: readBoolean(body.verificationReady),
    feeWaiverRequested: readBoolean(body.feeWaiverRequested)
  };
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function readStringList(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim().slice(0, 160));
}

function readDispositionRoute(value: unknown): TexasHarrisDispositionRoute | undefined {
  return value === "acquittal_not_guilty" ||
    value === "arrest_no_charge" ||
    value === "dismissal_or_quashed" ||
    value === "limitations_expired" ||
    value === "pardon_actual_innocence" ||
    value === "class_c_deferred_completed" ||
    value === "deferred_adjudication_completed" ||
    value === "eligible_conviction" ||
    value === "first_offense_dwi" ||
    value === "final_conviction" ||
    value === "unknown" ? value : undefined;
}

function readCourtType(value: unknown): TexasHarrisCourtType | undefined {
  return value === "district" || value === "county_criminal" || value === "municipal_class_c" || value === "justice" || value === "unknown" ? value : undefined;
}
