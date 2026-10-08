import type { ArtifactSourceInput } from "./artifact-domain";
import type { LaunchReadiness } from "./launch-readiness";

/** Read-only reconciliation. Setup approval never implies payment or publication. */
export function resolveProgramPresentation(source: ArtifactSourceInput, readiness: LaunchReadiness) {
  const setupApproved = ["ready_to_launch", "live", "paused"].includes(source.workspace.status);
  const access = source.data.access_sponsorship_capacity?.participant_access_model ?? null;
  const legacyAccess = source.partnerRecord.accessMode;
  const accessConflict = Boolean(access && legacyAccess && access !== legacyAccess);
  return {
    status: source.workspace.status === "paused" ? "Paused" : source.workspace.status === "live"
      ? "Launch recorded; public verification required" : accessConflict ? "Needs LegalEase review"
      : readiness.ready ? "Ready to launch" : setupApproved ? "Setup approved; launch preparation remaining" : "Program setup in progress",
    setupApproved,
    launchReady: readiness.ready && !accessConflict,
    access: { configured: access, legacy: legacyAccess, conflict: accessConflict, owner: "legalease" as const,
      source: "partner_onboarding_sections.response_data / partner_records.access_mode" },
    funding: { commercialStatus: source.workspace.commercialGateStatus, paymentStatus: source.partnerRecord.paymentStatus ?? null,
      explanation: source.workspace.commercialGateStatus === "cleared_by_authorized_internal_override"
        ? "Program funding and terms were cleared by an authorized internal decision. This does not record a payment."
        : "Payment and program funding decisions are separate source records.",
      source: "partner_onboarding.commercial_gate_status / partner_records.payment_status" },
    screeningAllowance: { value: source.readOnlyValues.screening_allocation ?? null, source: "partner_entitlement.screenings_allowed" },
    packetAllowance: { status: source.packetAllocationSourceStatus ?? (source.readOnlyValues.packet_credits == null ? "not_configured" : "available"), value: source.readOnlyValues.packet_credits ?? null, source: "partner_packet_entitlement.packet_cap" },
    discrepancies: [
      ...(accessConflict ? ["LegalEase must reconcile the approved joining method with the legacy access setting before launch."] : []),
      ...(setupApproved && source.partnerRecord.legacyOnboardingStatus === "not_started" ? ["Setup approval is recorded in the canonical workspace; the legacy not-started label does not describe setup progress."] : [])
    ]
  };
}
export type ProgramPresentation = ReturnType<typeof resolveProgramPresentation>;
