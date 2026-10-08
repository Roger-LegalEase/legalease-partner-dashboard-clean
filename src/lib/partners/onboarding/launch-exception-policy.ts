import type { LaunchReadiness } from "./launch-readiness";

export type ExceptionClassification = "operational" | "conditional" | "hard_stop";
/** Proposed classifications. Conditional authority is never inferred from a role. */
export const LAUNCH_EXCEPTION_POLICY: Readonly<Record<string, {classification:ExceptionClassification;basis:string}>> = {
  commercial_gate_cleared: {classification:"hard_stop",basis:"Authentic commercial authority is required."},
  agreements_and_procurement_recorded: {classification:"hard_stop",basis:"Contract authority and genuine procurement evidence cannot be invented."},
  onboarding_sections_complete: {classification:"hard_stop",basis:"Required owner facts and approvals must exist."},
  access_model_and_capacity_present: {classification:"hard_stop",basis:"Correct access settings and authentic screening capacity are mandatory."},
  required_logo_present: {classification:"hard_stop",basis:"Approved partner identity must be reviewed; a missing asset is not an exception."},
  public_page_fields_present: {classification:"hard_stop",basis:"Public content must be complete and approved."},
  planned_partner_administrator_present: {classification:"conditional",basis:"Only a separately approved program model with an accountable alternate operator can waive administrator timing."},
  report_recipients_configured: {classification:"conditional",basis:"Requires an approved temporary reporting arrangement."},
  support_and_referral_contacts_configured: {classification:"hard_stop",basis:"Participant safety and support routes are required."},
  artifact_versions_current: {classification:"hard_stop",basis:"Stale source information must be corrected, not waived."},
  required_artifact_approvals_complete: {classification:"hard_stop",basis:"Required substantive review must actually occur."},
  staff_training_completed: {classification:"conditional",basis:"A documented approved training alternative must cover the program's operating needs."},
  communications_approved: {classification:"operational",basis:"Optional outreach timing may receive a documented exception."},
  partner_launch_approval_received: {classification:"hard_stop",basis:"Genuine partner authorization is required; alternative legal authority needs a distinct reviewed decision."},
  legalease_final_review_complete: {classification:"hard_stop",basis:"LegalEase final review cannot be forged."}
};

export type LaunchExceptionEvent = {
  id: string; kind: "grant" | "revoke"; grantId: string | null;
  partnerSlug: string; workspaceId: string; checkKey: string;
  actorAuthUserId: string; actorRole: "internal_admin"; requestId: string;
  reason: string; authorityReference: string; snapshotHash: string;
  createdAt: string; expiresAt: string | null;
};

/** Pure audit evaluation, never a mutation of a raw check or consent record. */
export function resolveEffectiveReadiness(input: {
  raw: LaunchReadiness; events: readonly LaunchExceptionEvent[]; partnerSlug:string;
  workspaceId:string; snapshotHash:string; now:string; policyAuthorized:boolean;
}) {
  const active = input.events.filter(event => {
    const policy = LAUNCH_EXCEPTION_POLICY[event.checkKey];
    return input.policyAuthorized && event.kind === "grant" && event.actorRole === "internal_admin" &&
      Boolean(policy && policy.classification !== "hard_stop") &&
      event.partnerSlug === input.partnerSlug && event.workspaceId === input.workspaceId &&
      event.snapshotHash === input.snapshotHash && event.reason.trim().length >= 10 &&
      event.authorityReference.trim().length >= 10 && Boolean(event.actorAuthUserId && event.requestId) &&
      Number.isFinite(Date.parse(event.createdAt)) && Date.parse(event.createdAt) <= Date.parse(input.now) &&
      (event.expiresAt === null || Date.parse(event.expiresAt) > Date.parse(input.now)) &&
      !input.events.some(revoke => revoke.kind === "revoke" && revoke.grantId === event.id &&
        revoke.partnerSlug === input.partnerSlug && revoke.workspaceId === input.workspaceId && revoke.actorRole === "internal_admin");
  });
  const remaining = input.raw.checks.filter(check => check.blocking && !(LAUNCH_EXCEPTION_POLICY[check.key]?.classification === "hard_stop" ? check.status === "passing" : ["passing","waived","not_applicable"].includes(check.status)) && !active.some(event=>event.checkKey===check.key));
  return { raw:input.raw, activeExceptions:active, remainingHardStops:remaining,
    ready:remaining.length === 0,
    label:remaining.length ? "Not ready to launch" : active.length ? "Ready with authorized exceptions" : "Ready to launch" };
}

export type DelegatedCapability = "prepare" | "review_operational_material" | "finance" | "legal_approval" | "grant_exception" | "launch";
export type SuccessManagerAssignment = {authUserId:string;partnerSlug:string;expiresAt:string|null;revokedAt:string|null;capabilities:readonly DelegatedCapability[]};
/** Fixture/proposal only. No live role grants or session/RLS changes. */
export function canAssignedSuccessManagerAct(input:{authUserId:string;partnerSlug:string;capability:DelegatedCapability;assignments:readonly SuccessManagerAssignment[];now:string;delegationAuthorized:boolean}) {
  if (!input.delegationAuthorized || !["prepare","review_operational_material"].includes(input.capability)) return false;
  return input.assignments.some(assignment=>assignment.authUserId===input.authUserId && assignment.partnerSlug===input.partnerSlug && assignment.revokedAt===null &&
    (assignment.expiresAt===null || Date.parse(assignment.expiresAt)>Date.parse(input.now)) && assignment.capabilities.includes(input.capability));
}
