import { NextResponse } from "next/server";
import { createPennsylvaniaDocumentPacket } from "@/lib/rcap/documents/source-repository";
import type { PennsylvaniaDocumentPacketInput, PennsylvaniaOffenseGrade } from "@/lib/rcap/documents/types";
import { verifyRcapCaptchaToken } from "@/lib/security/rcap-captcha";

export async function POST(request: Request) {
  const body = await safeJson(request);
  const captcha = await verifyRcapCaptchaToken(body.turnstileToken);
  if (!captcha.ok) return NextResponse.json({ error: captcha.error }, { status: 403 });

  const partnerSlug = readText(body.partnerSlug) ?? "";
  const intakeSessionId = readText(body.intakeSessionId);
  const result = await createPennsylvaniaDocumentPacket({ ...readPennsylvaniaInput(body), partnerSlug, intakeSessionId, state: "PA" });
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

function readPennsylvaniaInput(body: Record<string, unknown>): Partial<PennsylvaniaDocumentPacketInput> {
  return {
    county: readText(body.county),
    judicialDistrict: readText(body.judicialDistrict),
    docketNumber: readText(body.docketNumber),
    otn: readText(body.otn),
    judgeName: readText(body.judgeName),
    judgeAddress: readText(body.judgeAddress),
    petitionerAddress: readText(body.petitionerAddress),
    otherNamesUsed: readText(body.otherNamesUsed),
    charge: readText(body.charge),
    statuteTitle: readText(body.statuteTitle),
    statuteSection: readText(body.statuteSection),
    statuteSubsection: readText(body.statuteSubsection),
    offenseGrade: readGrade(body.offenseGrade),
    disposition: readText(body.disposition),
    dispositionDate: readText(body.dispositionDate),
    arrestDate: readText(body.arrestDate),
    complaintDate: readText(body.complaintDate),
    arrestingAgency: readText(body.arrestingAgency),
    affiantName: readText(body.affiantName),
    affiantAddress: readText(body.affiantAddress),
    hasPatchReport: readBoolean(body.hasPatchReport),
    patchWithin60Days: readBoolean(body.patchWithin60Days),
    patchMissingReason: readText(body.patchMissingReason),
    restitutionPaid: readBoolean(body.restitutionPaid),
    victimRestitutionOwed: readBoolean(body.victimRestitutionOwed),
    nonRestitutionCostsOnly: readBoolean(body.nonRestitutionCostsOnly),
    waitingPeriodSatisfied: readBoolean(body.waitingPeriodSatisfied),
    noPendingProceedings: readBoolean(body.noPendingProceedings),
    noArrestOrProsecutionFiveYears: readBoolean(body.noArrestOrProsecutionFiveYears),
    convictionFreeSevenYears: readBoolean(body.convictionFreeSevenYears),
    convictionFreeTenYears: readBoolean(body.convictionFreeTenYears),
    sentenceUnderThirtyMonths: readBoolean(body.sentenceUnderThirtyMonths),
    ardCompleted: readBoolean(body.ardCompleted),
    fullPardon: readBoolean(body.fullPardon),
    ageSeventyOrOlder: readBoolean(body.ageSeventyOrOlder),
    deceasedThreeYears: readBoolean(body.deceasedThreeYears),
    excludedOffenseSignal: readBoolean(body.excludedOffenseSignal),
    sexOffenderRegistrationSignal: readBoolean(body.sexOffenderRegistrationSignal),
    firearmWeaponSignal: readBoolean(body.firearmWeaponSignal),
    familyOrDangerToPersonSignal: readBoolean(body.familyOrDangerToPersonSignal),
    federalOrOutOfStateSignal: readBoolean(body.federalOrOutOfStateSignal),
    cleanSlateAutomaticSignal: readBoolean(body.cleanSlateAutomaticSignal),
    commonwealthServiceReady: readBoolean(body.commonwealthServiceReady),
    feeWaiverRequested: readBoolean(body.feeWaiverRequested)
  };
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 300) : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function readGrade(value: unknown): PennsylvaniaOffenseGrade | undefined {
  return value === "summary" || value === "M3" || value === "M2" || value === "M1" || value === "F3_property" || value === "drug_felony" || value === "felony_other" || value === "unknown" ? value : undefined;
}
