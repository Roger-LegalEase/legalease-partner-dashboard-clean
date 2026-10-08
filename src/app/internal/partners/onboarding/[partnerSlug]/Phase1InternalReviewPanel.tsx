"use client";

import {
  type FormEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ONBOARDING_SECTION_DEFINITIONS,
  ONBOARDING_SECTION_ORDER
} from "@/lib/partners/onboarding/schema";
import type {
  CommercialGateOutcome,
  OnboardingSectionKey,
  OnboardingSectionStatus,
  OnboardingWorkspaceStatus
} from "@/lib/partners/onboarding/types";

type AgreementType =
  | "order_form"
  | "master_services_agreement"
  | "data_privacy_security_addendum"
  | "procurement_requirements";

export type Phase1InternalOnboardingSnapshot = {
  workspace: {
    id: string;
    status: OnboardingWorkspaceStatus;
    aggregateVersion: number;
    targetLaunchDate: string | null;
    commercialGateStatus: CommercialGateOutcome;
  } | null;
  sections: Array<{
    key: OnboardingSectionKey;
    status: OnboardingSectionStatus;
  }>;
  agreements: Array<{
    id?: string;
    type: AgreementType;
    status: string;
    required: boolean;
    partnerSafeDetail: string | null;
    finalizedAssetId: string | null;
    effectiveDate: string | null;
  }>;
  assets: Array<{
    id: string;
    category: string;
    originalFileName: string;
    mediaType: string;
  }>;
  // The authoritative partner payment read the review function checks before it accepts
  // a paid-invoice outcome. Absent (older snapshots) means unknown, never paid.
  commercialEvidence?: {
    partnerPaymentStatus: string | null;
    paidInvoiceClearable: boolean;
  };
};

export type Phase1InternalReviewPanelProps = {
  partnerSlug: string;
  snapshot: Phase1InternalOnboardingSnapshot;
  // Continuation shown once Phase 1 is complete. The parent page wires it to the
  // launch-preparation stage when that stage is available; absent, the panel says so
  // truthfully instead of pointing at a stage that is not there.
  launchPreparation?: { href: string; label?: string } | null;
};

type InternalAction =
  | "create"
  | "target_launch_date"
  | "commercial_gate"
  | "agreement"
  | "request_changes"
  | "approve_section"
  | "waive_section"
  | "ready_for_launch"
  | "close";

// Each operation card owns one feedback region; the approve and waive actions share the
// section-review card.
type CardKey =
  | "create"
  | "target_launch_date"
  | "commercial_gate"
  | "agreement"
  | "request_changes"
  | "section_review"
  | "ready_for_launch"
  | "close";

type CardFeedback =
  | { kind: "saving"; action: InternalAction }
  | {
      kind: "success";
      action: InternalAction;
      message: string;
      detail: string | null;
      status: OnboardingWorkspaceStatus | null;
      workspaceVersion: number | null;
      duplicate: boolean;
    }
  | {
      kind: "error";
      action: InternalAction;
      message: string;
      conflict: boolean;
      validation: boolean;
    };

const COMMERCIAL_OUTCOMES = [
  "blocked",
  "cleared_by_paid_invoice",
  "cleared_by_approved_purchase_order",
  "cleared_by_authorized_internal_override"
] as const satisfies readonly CommercialGateOutcome[];

const AGREEMENT_TYPES = [
  "order_form",
  "master_services_agreement",
  "data_privacy_security_addendum",
  "procurement_requirements"
] as const satisfies readonly AgreementType[];

const AGREEMENT_STATUSES = [
  "not_required",
  "not_started",
  "requested",
  "under_review",
  "finalized",
  "executed",
  "approved",
  "waived"
] as const;

const FINAL_AGREEMENT_STATUSES = new Set([
  "finalized",
  "executed",
  "approved"
]);

const REVIEWED_SECTION_STATUSES: readonly OnboardingSectionStatus[] = [
  "approved",
  "waived",
  "not_applicable"
];

const inputClassName =
  "min-h-11 w-full rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm text-navy shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25 disabled:cursor-not-allowed disabled:bg-grayWilma-100 disabled:text-grayWilma-600";
const textareaClassName = `${inputClassName} min-h-28 resize-y`;

export function Phase1InternalReviewPanel({
  partnerSlug,
  snapshot,
  launchPreparation = null
}: Phase1InternalReviewPanelProps) {
  const router = useRouter();
  const [current, setCurrent] =
    useState<Phase1InternalOnboardingSnapshot>(snapshot);
  const [pendingAction, setPendingAction] = useState<InternalAction | null>(
    null
  );
  const [cardFeedback, setCardFeedback] = useState<
    Partial<Record<CardKey, CardFeedback>>
  >({});
  const inFlightRef = useRef(false);
  const retryAttemptRef = useRef<{
    signature: string;
    requestId: string;
  } | null>(null);
  const reviewReasonRef = useRef<HTMLTextAreaElement | null>(null);
  const focusAfterReview = useRef(false);
  // Deep links from readiness must reveal the real control, not a collapsed page.
  useEffect(() => {
    const reveal = () => {
      if (!/^#internal-operation-(agreement|commercial_gate)$/.test(window.location.hash)) return;
      const details = document.getElementById("setup-review");
      if (!(details instanceof HTMLDetailsElement)) return;
      details.open = true;
      const target = document.getElementById(window.location.hash.slice(1));
      if (!target) return;
      requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start" });
        (target.querySelector<HTMLElement>("select:not([disabled]), input:not([disabled]), textarea:not([disabled])") ?? target).focus({ preventScroll: true });
      });
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);

  const [targetLaunchDate, setTargetLaunchDate] = useState(
    snapshot.workspace?.targetLaunchDate ?? ""
  );
  const [targetReason, setTargetReason] = useState("");
  const [commercialOutcome, setCommercialOutcome] =
    useState<CommercialGateOutcome>(
      snapshot.workspace?.commercialGateStatus ?? "blocked"
    );
  const [commercialEvidence, setCommercialEvidence] = useState("");
  const [commercialOverrideReason, setCommercialOverrideReason] = useState("");

  const initialAgreement = snapshot.agreements[0];
  const [agreementType, setAgreementType] = useState<AgreementType>(
    initialAgreement?.type ?? "order_form"
  );
  const [agreementStatus, setAgreementStatus] = useState(
    initialAgreement?.status ?? "not_started"
  );
  const [agreementRequired, setAgreementRequired] = useState(
    initialAgreement?.required ?? true
  );
  const [agreementDetail, setAgreementDetail] = useState(
    initialAgreement?.partnerSafeDetail ?? ""
  );
  const [agreementFinalizedAssetId, setAgreementFinalizedAssetId] = useState(
    initialAgreement?.finalizedAssetId ?? ""
  );
  const [agreementEffectiveDate, setAgreementEffectiveDate] = useState(
    initialAgreement?.effectiveDate ?? ""
  );
  const [signedFile, setSignedFile] = useState<File | null>(null);
  const signedFileInput = useRef<HTMLInputElement | null>(null);
  const [signedReviewed, setSignedReviewed] = useState(false);
  const [signedReviewReason, setSignedReviewReason] = useState("");
  const signedAttempt = useRef<{signature: string; requestId: string} | null>(null);

  const firstSection = snapshot.sections[0]?.key ?? "organization_contacts";
  const [changeSection, setChangeSection] =
    useState<OnboardingSectionKey>(firstSection);
  const [changeInstructions, setChangeInstructions] = useState("");
  const [confirmingCorrection, setConfirmingCorrection] = useState(false);
  const [reviewSection, setReviewSection] =
    useState<OnboardingSectionKey>(firstSection);
  const [reviewDecision, setReviewDecision] = useState<
    "approve_section" | "waive_section"
  >("approve_section");
  const [reviewReason, setReviewReason] = useState("");
  const [readyReason, setReadyReason] = useState("");
  const [closeReason, setCloseReason] = useState("");

  const workspace = current.workspace;
  const lockedStatus =
    workspace !== null &&
    ["live", "paused", "closed"].includes(workspace.status);
  const sharedReasons: string[] = [];
  if (pendingAction !== null) {
    sharedReasons.push("A save is in progress. Wait for its result before the next action.");
  } else if (lockedStatus && workspace) {
    sharedReasons.push(
      `Phase 1 controls are read-only while the workspace is ${humanize(workspace.status)}.`
    );
  }
  const controlsDisabled = pendingAction !== null || lockedStatus;
  useLayoutEffect(() => {
    if (focusAfterReview.current && !controlsDisabled) {
      focusAfterReview.current = false;
      reviewReasonRef.current?.focus();
    }
  }, [controlsDisabled, reviewReason, reviewSection]);

  const selectedReviewSection = current.sections.find(
    (section) => section.key === reviewSection
  );
  const reviewedCount = current.sections.filter((section) =>
    REVIEWED_SECTION_STATUSES.includes(section.status)
  ).length;
  const unreviewedSections = current.sections.filter(
    (section) => !REVIEWED_SECTION_STATUSES.includes(section.status)
  );
  const allSectionsReviewed =
    current.sections.length === ONBOARDING_SECTION_DEFINITIONS.length &&
    unreviewedSections.length === 0;
  const phase1Complete = workspace?.status === "ready_to_launch";
  const savedAgreement = current.agreements.find(
    (agreement) => agreement.type === agreementType
  );
  const commercialEvidenceRead = current.commercialEvidence ?? {
    partnerPaymentStatus: null,
    paidInvoiceClearable: false
  };

  // Stateful disabled reasons: each names the actual condition, in the card, and
  // recomputes as fields and workspace state change. A blank required field is a
  // missing field, never a permission problem.
  const targetDateReasons = [...sharedReasons];
  if (!targetReason.trim()) targetDateReasons.push("Enter the internal reason for this target-date change.");

  const commercialReasons = [...sharedReasons];
  if (
    commercialOutcome === "cleared_by_paid_invoice" &&
    !commercialEvidenceRead.paidInvoiceClearable
  ) {
    commercialReasons.push(paidInvoiceUnavailableCopy(commercialEvidenceRead.partnerPaymentStatus));
  }
  if (
    commercialOutcome === "cleared_by_approved_purchase_order" &&
    !commercialEvidence.trim()
  ) {
    commercialReasons.push("Enter the approved purchase-order reference.");
  }
  if (
    commercialOutcome === "cleared_by_authorized_internal_override" &&
    !commercialOverrideReason.trim()
  ) {
    commercialReasons.push("Enter the internal reason for the authorized override.");
  }

  const agreementReasons = [...sharedReasons];

  const correctionReasons = [...sharedReasons];
  if (workspace && workspace.status !== "ready_for_review") {
    correctionReasons.push(
      workspace.status === "waiting_on_partner"
        ? "The workspace is already with the partner for corrections. Another request can be sent after the partner responds."
        : `Corrections can be requested only while the workspace is ready for review. It is currently ${humanize(workspace.status)}.`
    );
  }
  if (!changeInstructions.trim()) {
    correctionReasons.push("Enter the partner-safe instructions for this correction.");
  }

  const reviewSectionName = sectionLabel(reviewSection);
  const reviewReasons = [...sharedReasons];
  let reviewNote: string | null = null;
  if (reviewDecision === "approve_section") {
    const status = selectedReviewSection?.status ?? "not_started";
    if (REVIEWED_SECTION_STATUSES.includes(status)) {
      reviewReasons.push(
        `${reviewSectionName} is already ${humanize(status).toLowerCase()}. No further approval is needed.`
      );
    } else if (status === "not_started" || status === "in_progress") {
      reviewReasons.push(
        `${reviewSectionName} has not been submitted by the partner yet (currently ${humanize(status).toLowerCase()}).`
      );
    } else if (status === "needs_changes") {
      reviewNote = `${reviewSectionName} has an outstanding correction request. Approving it records that you verified no correction is needed and resolves that request through the same server action; the request, your reason, the request ID and the audit history are kept.`;
    }
  }
  if (!reviewReason.trim()) {
    reviewReasons.push(
      `Enter a review reason to ${reviewDecision === "approve_section" ? "approve" : "waive"} ${reviewSectionName}.`
    );
  }

  const readyReasons = [...sharedReasons];
  if (workspace && !phase1Complete) {
    if (workspace.status !== "ready_for_review") {
      readyReasons.push(
        `The workspace must be ready for review before launch preparation. It is currently ${humanize(workspace.status)}.`
      );
    }
    if (workspace.commercialGateStatus === "blocked") {
      readyReasons.push("The commercial gate is still blocked.");
    }
    if (!allSectionsReviewed) {
      readyReasons.push(
        unreviewedSections.length > 0
          ? `${unreviewedSections.length} of ${current.sections.length} sections still need a review decision: ${unreviewedSections
              .map((section) => sectionLabel(section.key))
              .join(", ")}.`
          : "The workspace does not yet carry all eight canonical sections."
      );
    }
    if (!readyReason.trim()) readyReasons.push("Enter the review decision reason.");
  }

  const canClose =
    workspace !== null &&
    [
      "draft",
      "commercially_blocked",
      "setup_in_progress",
      "waiting_on_partner",
      "ready_for_review",
      "ready_to_launch"
    ].includes(workspace.status);
  const closeReasons: string[] = [];
  if (pendingAction !== null) {
    closeReasons.push("A save is in progress. Wait for its result before the next action.");
  }
  if (workspace && !canClose) {
    closeReasons.push(
      `A ${humanize(workspace.status).toLowerCase()} workspace cannot be closed through Phase 1 controls.`
    );
  }
  if (!closeReason.trim()) closeReasons.push("Enter the closure reason.");

  async function runOperation(
    action: InternalAction,
    payload: Record<string, unknown>,
    detail: string | null = null
  ): Promise<{ ok: boolean; snapshot: Phase1InternalOnboardingSnapshot | null }> {
    if (inFlightRef.current) return { ok: false, snapshot: null };
    const card = cardForAction(action);
    const workspaceId = current.workspace?.id;
    const expectedWorkspaceVersion =
      current.workspace?.aggregateVersion;
    const signature = JSON.stringify({
      action,
      workspaceId,
      expectedWorkspaceVersion,
      payload
    });
    const requestId =
      retryAttemptRef.current?.signature === signature
        ? retryAttemptRef.current.requestId
        : crypto.randomUUID();
    retryAttemptRef.current = { signature, requestId };

    inFlightRef.current = true;
    setPendingAction(action);
    setCardFeedback((previous) => ({
      ...previous,
      [card]: { kind: "saving", action }
    }));

    try {
      const response = await fetch(
        `/api/internal/partners/onboarding/phase1/${encodeURIComponent(partnerSlug)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            requestId,
            workspaceId,
            expectedWorkspaceVersion,
            payload
          })
        }
      );
      const body = await readJsonObject(response);
      if (!response.ok || body?.success !== true) {
        const conflict =
          response.status === 409 &&
          (body?.code === "revision_conflict" ||
            typeof body?.currentWorkspaceVersion === "number");
        setCardFeedback((previous) => ({
          ...previous,
          [card]: {
            kind: "error",
            action,
            conflict,
            validation: body?.code === "invalid_input",
            message: internalErrorMessage(response.status, body, conflict)
          }
        }));
        return { ok: false, snapshot: null };
      }

      const returnedSnapshot = parseSnapshot(body.snapshot);
      const result = objectValue(body.result);
      const resultVersion = numberValue(result?.workspaceVersion);
      const resultStatus = workspaceStatusValue(result?.status);
      const nextSnapshot =
        returnedSnapshot ??
        mergeOperationResult(current, resultVersion, resultStatus);

      if (nextSnapshot) setCurrent(nextSnapshot);
      retryAttemptRef.current = null;
      setCardFeedback((previous) => ({
        ...previous,
        [card]: {
          kind: "success",
          action,
          message: operationSuccessMessage(action),
          detail,
          status:
            nextSnapshot?.workspace?.status ??
            resultStatus ??
            current.workspace?.status ??
            null,
          workspaceVersion:
            nextSnapshot?.workspace?.aggregateVersion ??
            resultVersion ??
            current.workspace?.aggregateVersion ??
            null,
          duplicate: result?.duplicate === true
        }
      }));
      return { ok: true, snapshot: nextSnapshot };
    } catch {
      setCardFeedback((previous) => ({
        ...previous,
        [card]: {
          kind: "error",
          action,
          conflict: false,
          validation: false,
          message:
            "The operation could not be confirmed. No success is shown; retrying the unchanged form will use the same request ID."
        }
      }));
      return { ok: false, snapshot: null };
    } finally {
      inFlightRef.current = false;
      setPendingAction(null);
    }
  }

  async function createWorkspace() {
    await runOperation("create", {});
  }

  async function saveTargetDate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { ok, snapshot: next } = await runOperation("target_launch_date", {
      targetLaunchDate: targetLaunchDate || null,
      reason: targetReason.trim()
    });
    if (ok) {
      // Only this card's fields follow the confirmed save; other cards keep their unsaved input.
      setTargetLaunchDate(next?.workspace?.targetLaunchDate ?? "");
      setTargetReason("");
    }
  }

  async function saveCommercialGate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { ok, snapshot: next } = await runOperation("commercial_gate", {
      outcome: commercialOutcome,
      evidenceReference: commercialEvidence.trim() || null,
      overrideReason:
        commercialOutcome === "cleared_by_authorized_internal_override"
          ? commercialOverrideReason.trim()
          : null
    });
    if (ok) {
      setCommercialOutcome(next?.workspace?.commercialGateStatus ?? commercialOutcome);
      setCommercialEvidence("");
      setCommercialOverrideReason("");
    }
  }

  async function saveAgreement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (agreementStatus === "executed" &&
        ["order_form","master_services_agreement"].includes(agreementType)) {
      if (inFlightRef.current || pendingAction) return;
      if (!signedReviewed || !agreementEffectiveDate ||
          signedReviewReason.trim().length < 10 ||
          Boolean(signedFile) === Boolean(agreementFinalizedAssetId)) {
        setCardFeedback(previous => ({
          ...previous, agreement: {kind:"error",action:"agreement",conflict:false,
            validation:true,message:"Review the executed signatures, effective date and one private signed PDF/DOCX document before saving."}
        }));
        return;
      }
      const signature = JSON.stringify({
        agreementType, agreementEffectiveDate,
        signedReviewReason, signedFile:signedFile
          ? [signedFile.name,signedFile.size,signedFile.lastModified] : null,
        agreementFinalizedAssetId,currentVersion:current.workspace?.aggregateVersion
      });
      if (!signedAttempt.current || signedAttempt.current.signature !== signature) {
        signedAttempt.current = {signature,requestId:crypto.randomUUID()};
      }
      const form = new FormData();
      form.set("requestId", signedAttempt.current.requestId);
      form.set("expectedWorkspaceVersion", String(current.workspace?.aggregateVersion ?? 0));
      form.set("agreementType",agreementType);
      form.set("effectiveDate",agreementEffectiveDate);
      form.set("reviewReason",signedReviewReason.trim());
      form.set("confirmed","true");
      if (signedFile) form.set("file",signedFile);
      else form.set("existingAssetId",agreementFinalizedAssetId);
      inFlightRef.current = true;
      setPendingAction("agreement");
      setCardFeedback(previous => ({
        ...previous,agreement:{kind:"saving",action:"agreement"}
      }));
      try {
        const response = await fetch(
          `/api/internal/partners/onboarding/phase1/${encodeURIComponent(partnerSlug)}/signed-agreement`,
          {method:"POST",body:form}
        );
        const body = await readJsonObject(response);
        if (!response.ok || body?.success !== true) {
          setCardFeedback(previous => ({
            ...previous,agreement:{kind:"error",action:"agreement",
              conflict:response.status===409,validation:response.status===400,
              message:typeof body?.error==="string" ? body.error : "Signed agreement was not recorded."}
          }));
          return;
        }
        const next = parseSnapshot(body.snapshot);
        if (next) {
          setCurrent(next);
          const saved = next.agreements.find(a => a.type === agreementType);
          setAgreementStatus(saved?.status ?? "executed");
          setAgreementFinalizedAssetId(saved?.finalizedAssetId ?? "");
        }
        setSignedFile(null);
        if (signedFileInput.current) signedFileInput.current.value="";
        setSignedReviewed(false);
        signedAttempt.current=null;
        setCardFeedback(previous => ({
          ...previous,agreement:{kind:"success",action:"agreement",
            message:"Executed signed agreement recorded with immutable document evidence.",
            detail:"Recheck Launch Readiness; material agreement changes require renewed current-source approvals.",
            status:next?.workspace?.status??null,
            workspaceVersion:next?.workspace?.aggregateVersion??null,
            duplicate:body.duplicate===true}
        }));
        router.refresh();
      } catch {
        setCardFeedback(previous => ({
          ...previous,agreement:{kind:"error",action:"agreement",conflict:false,
            validation:false,message:"Confirmation was interrupted. Retry the unchanged form to reuse its request ID."}
        }));
      } finally {
        inFlightRef.current=false;
        setPendingAction(null);
      }
      return;
    }
    const { ok, snapshot: next } = await runOperation(
      "agreement",
      {
        agreementType,
        status: agreementStatus,
        required: agreementRequired,
        partnerSafeDetail: agreementDetail.trim() || null,
        finalizedAssetId: agreementFinalizedAssetId || null,
        // Date-only string exactly as the control holds it; blank saves no date.
        effectiveDate: agreementEffectiveDate || null
      },
      `${agreementTypeLabel(agreementType)} saved.`
    );
    if (ok) {
      const refreshed = next?.agreements.find(
        (agreement) => agreement.type === agreementType
      );
      setAgreementStatus(refreshed?.status ?? agreementStatus);
      setAgreementRequired(refreshed?.required ?? agreementRequired);
      setAgreementDetail(refreshed?.partnerSafeDetail ?? "");
      setAgreementFinalizedAssetId(refreshed?.finalizedAssetId ?? "");
      setAgreementEffectiveDate(refreshed?.effectiveDate ?? "");
    }
  }

  async function requestChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The form never submits from its first stage: the reviewer sees the section, the
    // instructions and the consequence, then confirms. Cancel changes nothing.
    if (!confirmingCorrection) {
      setConfirmingCorrection(true);
      return;
    }
    const sectionName = sectionLabel(changeSection);
    const { ok } = await runOperation(
      "request_changes",
      {
        sectionKey: changeSection,
        instructions: changeInstructions.trim()
      },
      `${sectionName} was returned to the partner for corrections. The workspace is now with the partner.`
    );
    if (ok) {
      setChangeInstructions("");
      setConfirmingCorrection(false);
    }
  }

  async function reviewSectionAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const decidedSection = reviewSection;
    const decidedName = sectionLabel(decidedSection);
    const { ok, snapshot: next } = await runOperation(
      reviewDecision,
      {
        sectionKey: decidedSection,
        reason: reviewReason.trim()
      },
      reviewDecision === "approve_section"
        ? `${decidedName} approved.`
        : `${decidedName} waived.`
    );
    if (!ok) return; // selection and reason stay for the retry
    focusAfterReview.current = true;
    setReviewReason("");
    const sections = next?.sections ?? current.sections;
    const nextPending = nextSectionAwaitingDecision(sections, decidedSection);
    if (nextPending) setReviewSection(nextPending);
    // Restore focus after React commits the enabled field and next selection.
  }

  async function markReadyForLaunch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { ok } = await runOperation("ready_for_launch", {
      reason: readyReason.trim()
    });
    if (ok) {
      setReadyReason("");
      // Server-rendered readiness on this page follows the confirmed decision; client
      // state (unsaved inputs in other cards) is kept by the router refresh.
      router.refresh();
    }
  }

  async function closeWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !window.confirm(
        "Close this onboarding workspace? Phase 1 provides no partner action to reopen it."
      )
    ) {
      return;
    }
    const { ok } = await runOperation("close", {
      reason: closeReason.trim()
    });
    if (ok) setCloseReason("");
  }

  return (
    <section
      aria-labelledby="phase1-review-panel-heading"
      className="mt-8"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge tone="orange">Internal Phase 1 controls</Badge>
          <h2
            className="mt-3 text-2xl font-black text-navy"
            id="phase1-review-panel-heading"
          >
            RCAP onboarding review
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-grayWilma-700">
            Provision and review the partner’s Phase 1 package. These controls
            do not activate a program, send invitations, publish a page, or
            change live or paused state. Each card reports its own result
            beside its action.
          </p>
        </div>
        {workspace ? (
          <Badge tone={toneForWorkspaceStatus(workspace.status)}>
            {humanize(workspace.status)}
          </Badge>
        ) : (
          <Badge>No workspace</Badge>
        )}
      </div>

      {!workspace ? (
        <Card className="rounded-md border-grayWilma-200 p-6">
          <h3 className="text-lg font-black">Create onboarding workspace</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-grayWilma-700">
            Creates the Phase 1 workspace and its canonical sections
            idempotently. It does not invite the partner or clear the commercial
            gate.
          </p>
          <Button
            className="mt-4 min-h-11"
            disabled={pendingAction !== null}
            onClick={() => void createWorkspace()}
            type="button"
          >
            {pendingAction === "create"
              ? "Creating…"
              : "Create Phase 1 workspace"}
          </Button>
          <CardStatus cardKey="create" feedback={cardFeedback.create} />
        </Card>
      ) : (
        <>
          <WorkspaceSummary snapshot={current} />

          {lockedStatus ? (
            <Card className="mt-5 border-orange/30 bg-orange/10 p-5">
              <h3 className="font-black">Phase 1 controls are read-only</h3>
              <p className="mt-2 text-sm leading-6 text-grayWilma-800">
                This workspace is {humanize(workspace.status)}. Phase 1 does not
                provide live, pause, reactivation, publication, invitation, or
                activation operations.
              </p>
            </Card>
          ) : null}

          <div className="mt-6 grid items-start gap-5 xl:grid-cols-2">
            <OperationCard
              cardKey="target_launch_date"
              description="Set or clear the planning date with an auditable internal reason."
              feedback={cardFeedback.target_launch_date}
              title="Target launch date"
            >
              <form className="grid gap-4" onSubmit={saveTargetDate}>
                <AdminField
                  helperCopy={`Saved target launch date: ${formatDate(workspace.targetLaunchDate)}. Leave blank to clear it.`}
                  label="Target launch date"
                >
                  <input
                    className={inputClassName}
                    disabled={controlsDisabled}
                    onChange={(event) =>
                      setTargetLaunchDate(event.currentTarget.value)
                    }
                    type="date"
                    value={targetLaunchDate}
                  />
                </AdminField>
                <AdminField label="Reason" required>
                  <textarea
                    className={textareaClassName}
                    disabled={controlsDisabled}
                    maxLength={5000}
                    onChange={(event) =>
                      setTargetReason(event.currentTarget.value)
                    }
                    required
                    value={targetReason}
                  />
                </AdminField>
                <OperationButton
                  action="target_launch_date"
                  cardKey="target_launch_date"
                  pendingAction={pendingAction}
                  reasons={targetDateReasons}
                >
                  Save target date
                </OperationButton>
              </form>
            </OperationCard>

            <OperationCard
              cardKey="commercial_gate"
              description="Record authoritative commercial evidence. The saved gate is shown separately from the form you are editing."
              feedback={cardFeedback.commercial_gate}
              title="Commercial gate"
            >
              <dl
                className="mb-4 grid gap-1 rounded-md bg-grayWilma-100 px-3 py-3 text-sm"
                data-saved-commercial-gate={workspace.commercialGateStatus}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="font-black">Saved commercial gate</dt>
                  <dd className="font-semibold">{humanize(workspace.commercialGateStatus)}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="font-black">Partner payment status (authoritative read)</dt>
                  <dd className="font-semibold" data-partner-payment-status={commercialEvidenceRead.partnerPaymentStatus ?? "unknown"}>
                    {commercialEvidenceRead.partnerPaymentStatus
                      ? humanize(commercialEvidenceRead.partnerPaymentStatus)
                      : "Unknown (not readable)"}
                  </dd>
                </div>
                {workspace.commercialGateStatus === "cleared_by_authorized_internal_override" ? (
                  <p className="text-xs leading-5 text-grayWilma-700">
                    The authorized override and its internal reason are on the saved record. A
                    blank reason field below is the edit form, not the saved override.
                  </p>
                ) : null}
              </dl>
              <form className="grid gap-4" onSubmit={saveCommercialGate}>
                <AdminField label="Commercial outcome" required>
                  <select
                    className={inputClassName}
                    disabled={controlsDisabled}
                    onChange={(event) =>
                      setCommercialOutcome(
                        event.currentTarget.value as CommercialGateOutcome
                      )
                    }
                    value={commercialOutcome}
                  >
                    {COMMERCIAL_OUTCOMES.map((outcome) => (
                      <option
                        disabled={
                          outcome === "cleared_by_paid_invoice" &&
                          !commercialEvidenceRead.paidInvoiceClearable &&
                          commercialOutcome !== "cleared_by_paid_invoice"
                        }
                        key={outcome}
                        value={outcome}
                      >
                        {humanize(outcome)}
                        {outcome === "cleared_by_paid_invoice" &&
                        !commercialEvidenceRead.paidInvoiceClearable
                          ? " (unavailable: partner not paid)"
                          : ""}
                      </option>
                    ))}
                  </select>
                </AdminField>
                {commercialOutcome === "cleared_by_paid_invoice" ? (
                  <ConstraintCopy>
                    {commercialEvidenceRead.paidInvoiceClearable
                      ? "Paid status is verified from the authoritative partner provisioning record; no typed evidence is needed."
                      : paidInvoiceUnavailableCopy(commercialEvidenceRead.partnerPaymentStatus)}
                  </ConstraintCopy>
                ) : null}
                {commercialOutcome === "cleared_by_approved_purchase_order" ? (
                  <AdminField
                    helperCopy="Use a bounded approved purchase-order reference. Do not paste payment credentials."
                    label="Approved purchase-order reference"
                    required
                  >
                    <input
                      className={inputClassName}
                      disabled={controlsDisabled}
                      maxLength={500}
                      onChange={(event) =>
                        setCommercialEvidence(event.currentTarget.value)
                      }
                      required
                      value={commercialEvidence}
                    />
                  </AdminField>
                ) : null}
                {commercialOutcome ===
                "cleared_by_authorized_internal_override" ? (
                  <AdminField
                    helperCopy="Give the internal reason for clearing the gate without paid or purchase-order evidence. It is kept on the audit record."
                    label="Authorized override reason"
                    required
                  >
                    <textarea
                      className={textareaClassName}
                      disabled={controlsDisabled}
                      maxLength={5000}
                      onChange={(event) =>
                        setCommercialOverrideReason(event.currentTarget.value)
                      }
                      required
                      value={commercialOverrideReason}
                    />
                  </AdminField>
                ) : null}
                <OperationButton
                  action="commercial_gate"
                  cardKey="commercial_gate"
                  pendingAction={pendingAction}
                  reasons={commercialReasons}
                >
                  Record commercial outcome
                </OperationButton>
              </form>
            </OperationCard>

            <OperationCard
              cardKey="agreement"
              description="Review documented terms and actual signed evidence. An approved order form is not itself a signed agreement and does not clear launch readiness."
              feedback={cardFeedback.agreement}
              title="Agreement and procurement metadata"
            >
              <form className="grid gap-4" onSubmit={saveAgreement}>
                <AdminField label="Agreement type" required>
                  <select
                    className={inputClassName}
                    disabled={controlsDisabled}
                    onChange={(event) => {
                      const nextType =
                        event.currentTarget.value as AgreementType;
                      const agreement = current.agreements.find(
                        (candidate) => candidate.type === nextType
                      );
                      setAgreementType(nextType);
                      setAgreementStatus(
                        agreement?.status ?? "not_started"
                      );
                      setAgreementRequired(agreement?.required ?? true);
                      setAgreementDetail(
                        agreement?.partnerSafeDetail ?? ""
                      );
                      setAgreementFinalizedAssetId(
                        agreement?.finalizedAssetId ?? ""
                      );
                      setAgreementEffectiveDate(
                        agreement?.effectiveDate ?? ""
                      );
                    }}
                    value={agreementType}
                  >
                    {AGREEMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {agreementTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Status" required>
                  <select
                    className={inputClassName}
                    disabled={controlsDisabled}
                    onChange={(event) => {
                      const nextStatus = event.currentTarget.value;
                      setAgreementStatus(nextStatus);
                      if (!FINAL_AGREEMENT_STATUSES.has(nextStatus)) {
                        setAgreementFinalizedAssetId("");
                      }
                    }}
                    value={agreementStatus}
                  >
                    {AGREEMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {humanize(status)}
                      </option>
                    ))}
                  </select>
                </AdminField>
                {savedAgreement &&
                savedAgreement.status !== agreementStatus &&
                FINAL_AGREEMENT_STATUSES.has(savedAgreement.status) &&
                !FINAL_AGREEMENT_STATUSES.has(agreementStatus) ? (
                  <ConstraintCopy>
                    Saved status for {agreementTypeLabel(agreementType)} is{" "}
                    {humanize(savedAgreement.status)}. Saving {humanize(agreementStatus)} moves it
                    backwards; confirm that is the deliberate correction before saving.
                  </ConstraintCopy>
                ) : null}
                <label className="flex min-h-11 items-center gap-3 rounded-md border border-grayWilma-200 bg-grayWilma-100 px-3 py-2 text-sm font-black">
                  <input
                    checked={agreementRequired}
                    className="h-5 w-5 accent-teal"
                    disabled={controlsDisabled}
                    onChange={(event) =>
                      setAgreementRequired(event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  Required for this partner
                </label>
                <AdminField
                  helperCopy="Visible to the partner. Do not include internal legal or commercial notes."
                  label="Partner-safe detail"
                >
                  <textarea
                    className={textareaClassName}
                    disabled={controlsDisabled}
                    maxLength={5000}
                    onChange={(event) =>
                      setAgreementDetail(event.currentTarget.value)
                    }
                    value={agreementDetail}
                  />
                </AdminField>
                {FINAL_AGREEMENT_STATUSES.has(agreementStatus) ? (
                  <AdminField
                    helperCopy="Selecting a private PDF or DOCX authorizes that reviewed file as the finalized agreement document. The partner receives only a short-lived private download."
                    label="Finalized authorized document"
                  >
                    <select
                      className={inputClassName}
                      disabled={controlsDisabled}
                      onChange={(event) =>
                        setAgreementFinalizedAssetId(event.currentTarget.value)
                      }
                      value={agreementFinalizedAssetId}
                    >
                      <option value="">No finalized document attached</option>
                      {current.assets
                        .filter((asset) =>
                          [
                            "application/pdf",
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          ].includes(asset.mediaType)
                        )
                        .map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.originalFileName} · {humanize(asset.category)}
                          </option>
                        ))}
                    </select>
                  </AdminField>
                ) : null}
                <AdminField
                  helperCopy={`Saved effective date for ${agreementTypeLabel(agreementType)}: ${
                    savedAgreement?.effectiveDate
                      ? formatDate(savedAgreement.effectiveDate)
                      : "none saved"
                  }. Leave the field blank to save no date; a greyed date is the browser's placeholder, not a saved value.`}
                  label="Effective date"
                >
                  <input
                    className={inputClassName}
                    data-saved-effective-date={savedAgreement?.effectiveDate ?? ""}
                    disabled={controlsDisabled}
                    onChange={(event) =>
                      setAgreementEffectiveDate(event.currentTarget.value)
                    }
                    type="date"
                    value={agreementEffectiveDate}
                  />
                </AdminField>
                {agreementStatus === "executed" &&
                  ["order_form","master_services_agreement"].includes(agreementType) ? (
                    <div className="space-y-3 rounded-lg border border-teal/40 bg-grayWilma-100 p-4">
                      <p className="text-sm font-semibold">Executed agreement evidence</p>
                      <p className="text-sm">Record this as signed only after inspecting the actual agreement executed by the partner and LegalEase. An approved order form without signatures does not qualify.</p>
                      <label className="block text-sm font-semibold" htmlFor="signed-agreement-file">
                        Upload the signed agreement (PDF or DOCX, up to 20 MB)
                      </label>
                      <input id="signed-agreement-file" ref={signedFileInput} type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        disabled={controlsDisabled}
                        onChange={event => {
                          setSignedFile(event.currentTarget.files?.[0] ?? null);
                          if (event.currentTarget.files?.length) setAgreementFinalizedAssetId("");
                        }} />
                      <p className="text-xs">Alternatively select an existing approved private procurement document above. Do not select both.</p>
                      <label className="block text-sm font-semibold">Reviewer evidence note
                        <textarea className={textareaClassName} value={signedReviewReason}
                          disabled={controlsDisabled} maxLength={5000}
                          onChange={event=>setSignedReviewReason(event.currentTarget.value)}
                          placeholder="Describe which parties signed and how you verified the executed copy." />
                      </label>
                      <label className="flex items-start gap-2 text-sm font-semibold">
                        <input type="checkbox" checked={signedReviewed}
                          disabled={controlsDisabled}
                          onChange={event=>setSignedReviewed(event.currentTarget.checked)} />
                        I personally inspected the executed signatures. This only records existing evidence; it does not sign or accept the agreement for the partner.
                      </label>
                    </div>
                  ) : null}
                <OperationButton
                  action="agreement"
                  cardKey="agreement"
                  pendingAction={pendingAction}
                  reasons={agreementReasons}
                >
                  {agreementStatus === "executed" && ["order_form","master_services_agreement"].includes(agreementType)
                    ? "Record verified signed agreement" : "Save agreement status"}
                </OperationButton>
              </form>
            </OperationCard>

            <OperationCard
              cardKey="request_changes"
              description="Send one consolidated, partner-safe instruction for the selected section. This returns the workspace to the partner; it is not an approval."
              feedback={cardFeedback.request_changes}
              title="Request partner corrections"
            >
              <form className="grid gap-4" onSubmit={requestChanges}>
                <SectionSelect
                  disabled={controlsDisabled || confirmingCorrection}
                  onChange={setChangeSection}
                  sections={current.sections}
                  value={changeSection}
                />
                <AdminField label="Partner-safe instructions" required>
                  <textarea
                    className={textareaClassName}
                    disabled={controlsDisabled || confirmingCorrection}
                    maxLength={5000}
                    onChange={(event) =>
                      setChangeInstructions(event.currentTarget.value)
                    }
                    required
                    value={changeInstructions}
                  />
                </AdminField>
                {confirmingCorrection ? (
                  <div
                    className="grid gap-3 rounded-md border border-orange/40 bg-orange/10 p-4"
                    data-correction-confirmation
                    role="group"
                    aria-labelledby="phase1-correction-confirm-heading"
                  >
                    <h4 className="font-black" id="phase1-correction-confirm-heading">
                      Confirm: return {sectionLabel(changeSection)} to the partner
                    </h4>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-grayWilma-800">
                      {changeInstructions.trim()}
                    </p>
                    <p className="text-sm font-black text-grayWilma-900">
                      This returns the workspace to the partner for corrections.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        className="min-h-11"
                        disabled={correctionReasons.length > 0}
                        type="submit"
                        variant="warning"
                      >
                        {pendingAction === "request_changes"
                          ? "Saving…"
                          : "Confirm and return to partner"}
                      </Button>
                      <Button
                        className="min-h-11"
                        disabled={pendingAction !== null}
                        onClick={() => setConfirmingCorrection(false)}
                        type="button"
                        variant="secondary"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <OperationButton
                    action="request_changes"
                    cardKey="request_changes"
                    onClick={() => setConfirmingCorrection(true)}
                    pendingAction={pendingAction}
                    reasons={correctionReasons}
                    type="button"
                  >
                    Request partner corrections
                  </OperationButton>
                )}
              </form>
            </OperationCard>

            <OperationCard
              cardKey="section_review"
              description="Approve a submitted section or waive it with an auditable reason. Approval is a review decision, not a correction request."
              feedback={cardFeedback.section_review}
              title="Approve or waive a section"
            >
              <p
                className="mb-4 text-sm font-semibold text-grayWilma-700"
                data-review-progress={`${reviewedCount}/${current.sections.length}`}
              >
                {reviewedCount} of {current.sections.length} sections reviewed
                {allSectionsReviewed ? ". All sections have a review decision." : "."}
              </p>
              <form className="grid gap-4" onSubmit={reviewSectionAction}>
                <SectionSelect
                  disabled={controlsDisabled}
                  onChange={setReviewSection}
                  sections={current.sections}
                  value={reviewSection}
                />
                <AdminField label="Decision" required>
                  <select
                    className={inputClassName}
                    disabled={controlsDisabled}
                    onChange={(event) =>
                      setReviewDecision(
                        event.currentTarget.value as
                          | "approve_section"
                          | "waive_section"
                      )
                    }
                    value={reviewDecision}
                  >
                    <option value="approve_section">Approve section</option>
                    <option value="waive_section">Waive section</option>
                  </select>
                </AdminField>
                <AdminField label="Review reason" required>
                  <textarea
                    className={textareaClassName}
                    disabled={controlsDisabled}
                    maxLength={5000}
                    onChange={(event) =>
                      setReviewReason(event.currentTarget.value)
                    }
                    ref={reviewReasonRef}
                    required
                    value={reviewReason}
                  />
                </AdminField>
                {reviewNote ? <ConstraintCopy>{reviewNote}</ConstraintCopy> : null}
                <OperationButton
                  action={reviewDecision}
                  cardKey="section_review"
                  pendingAction={pendingAction}
                  reasons={reviewReasons}
                >
                  {reviewDecision === "approve_section"
                    ? `Approve ${reviewSectionName}`
                    : `Waive ${reviewSectionName}`}
                </OperationButton>
              </form>
            </OperationCard>

            <OperationCard
              cardKey="ready_for_launch"
              description="Move a fully reviewed package into launch preparation. This does not activate or publish anything."
              feedback={cardFeedback.ready_for_launch}
              title="Ready for launch preparation"
            >
              {phase1Complete ? (
                <div className="grid gap-3" data-phase1-complete>
                  <p className="rounded-md border border-teal/30 bg-teal/10 px-3 py-2 text-sm font-black text-navy" role="status">
                    Phase 1 complete. All eight sections have been reviewed.
                  </p>
                  <p className="text-sm leading-6 text-grayWilma-700">
                    The ready-for-launch decision is saved once and is not repeated here. Nothing
                    has been published or activated.
                  </p>
                  {launchPreparation ? (
                    <a
                      className="inline-flex min-h-11 items-center justify-self-start rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-wilmaBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
                      data-launch-continuation
                      href={launchPreparation.href}
                    >
                      {launchPreparation.label ?? "Continue to launch preparation"}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-grayWilma-800" data-launch-continuation-unavailable>
                      The launch-preparation stage is not available for this workspace yet, so
                      there is no next step to open from here.
                    </p>
                  )}
                </div>
              ) : (
                <form className="grid gap-4" onSubmit={markReadyForLaunch}>
                  <AdminField label="Review decision reason" required>
                    <textarea
                      className={textareaClassName}
                      disabled={controlsDisabled}
                      maxLength={5000}
                      onChange={(event) =>
                        setReadyReason(event.currentTarget.value)
                      }
                      required
                      value={readyReason}
                    />
                  </AdminField>
                  <OperationButton
                    action="ready_for_launch"
                    cardKey="ready_for_launch"
                    pendingAction={pendingAction}
                    reasons={readyReasons}
                  >
                    Mark ready for launch preparation
                  </OperationButton>
                </form>
              )}
            </OperationCard>

            <OperationCard
              cardKey="close"
              description="Close an unfinished Phase 1 workspace with an auditable reason."
              feedback={cardFeedback.close}
              title="Close workspace"
              warning
            >
              <form className="grid gap-4" onSubmit={closeWorkspace}>
                <AdminField label="Closure reason" required>
                  <textarea
                    className={textareaClassName}
                    disabled={pendingAction !== null || !canClose}
                    maxLength={5000}
                    onChange={(event) =>
                      setCloseReason(event.currentTarget.value)
                    }
                    required
                    value={closeReason}
                  />
                </AdminField>
                <OperationButton
                  action="close"
                  cardKey="close"
                  pendingAction={pendingAction}
                  reasons={closeReasons}
                  warning
                >
                  Close workspace
                </OperationButton>
              </form>
            </OperationCard>
          </div>
        </>
      )}
    </section>
  );
}

function cardForAction(action: InternalAction): CardKey {
  return action === "approve_section" || action === "waive_section"
    ? "section_review"
    : action;
}

// The next section still awaiting a review decision, in canonical onboarding order,
// starting after the one just decided and wrapping to the start. Null when none remains.
function nextSectionAwaitingDecision(
  sections: Phase1InternalOnboardingSnapshot["sections"],
  decided: OnboardingSectionKey
): OnboardingSectionKey | null {
  const pending = new Set(
    sections
      .filter((section) => section.status === "submitted" || section.status === "needs_changes")
      .map((section) => section.key)
  );
  const order = ONBOARDING_SECTION_ORDER as readonly OnboardingSectionKey[];
  const start = order.indexOf(decided);
  for (let offset = 1; offset <= order.length; offset += 1) {
    const candidate = order[(start + offset) % order.length];
    if (pending.has(candidate)) return candidate;
  }
  return null;
}

function paidInvoiceUnavailableCopy(paymentStatus: string | null) {
  return paymentStatus
    ? `The paid-invoice outcome is unavailable: the partner's authoritative payment status is ${humanize(paymentStatus)}, not Paid. Typed text cannot clear this gate; use an approved purchase order or an authorized internal override with its reason.`
    : "The paid-invoice outcome is unavailable: the partner's authoritative payment status could not be read. Reload the page or use another evidence path.";
}

function WorkspaceSummary({
  snapshot
}: {
  snapshot: Phase1InternalOnboardingSnapshot;
}) {
  const workspace = snapshot.workspace;
  if (!workspace) return null;
  return (
    <Card className="rounded-md border-grayWilma-200 p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <section aria-labelledby="phase1-workspace-summary-heading">
          <h3
            className="text-lg font-black"
            id="phase1-workspace-summary-heading"
          >
            Current workspace
          </h3>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <SummaryValue label="Workspace ID" value={workspace.id} mono />
            <SummaryValue
              label="Version"
              value={String(workspace.aggregateVersion)}
            />
            <SummaryValue label="Status" value={humanize(workspace.status)} />
            <SummaryValue
              label="Commercial gate"
              value={humanize(workspace.commercialGateStatus)}
            />
            <SummaryValue
              label="Target launch"
              value={formatDate(workspace.targetLaunchDate)}
            />
          </dl>
        </section>
        <section aria-labelledby="phase1-section-summary-heading">
          <h3
            className="text-lg font-black"
            id="phase1-section-summary-heading"
          >
            Section review status
          </h3>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {snapshot.sections.map((section) => (
              <li
                className="flex items-center justify-between gap-3 rounded-md border border-grayWilma-200 bg-grayWilma-100 px-3 py-2"
                data-section-status={section.status}
                key={section.key}
              >
                <span className="text-xs font-bold">
                  {sectionLabel(section.key)}
                </span>
                <Badge tone={toneForSectionStatus(section.status)}>
                  {humanize(section.status)}
                </Badge>
              </li>
            ))}
          </ol>
        </section>
      </div>
      {snapshot.agreements.length > 0 ? (
        <section
          aria-labelledby="phase1-agreement-summary-heading"
          className="mt-5 border-t border-grayWilma-200 pt-5"
        >
          <h3
            className="text-lg font-black"
            id="phase1-agreement-summary-heading"
          >
            Agreement and procurement status
          </h3>
          <dl className="mt-3 grid gap-2 md:grid-cols-2">
            {snapshot.agreements.map((agreement) => (
              <div
                className="flex items-start justify-between gap-3 rounded-md bg-grayWilma-100 px-3 py-3"
                key={agreement.type}
              >
                <dt className="text-sm font-bold">
                  {agreementTypeLabel(agreement.type)}
                </dt>
                <dd className="text-right text-xs font-black">
                  {humanize(agreement.status)}
                  {agreement.required ? " · Required" : ""}
                  {agreement.effectiveDate ? ` · Effective ${formatDate(agreement.effectiveDate)}` : ""}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </Card>
  );
}

function OperationCard({
  cardKey,
  title,
  description,
  feedback,
  warning = false,
  children
}: {
  cardKey: CardKey;
  title: string;
  description: string;
  feedback: CardFeedback | undefined;
  warning?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={`rounded-md p-5 ${
        warning ? "border-orange/30" : "border-grayWilma-200"
      }`}
      data-operation-card={cardKey}
      id={`internal-operation-${cardKey}`}
      tabIndex={-1}
    >
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-grayWilma-700">
        {description}
      </p>
      <div className="mt-5">{children}</div>
      <CardStatus cardKey={cardKey} feedback={feedback} />
    </Card>
  );
}

// HF-003: the outcome of an action is reported inside the card that invoked it, in a
// live region that stays mounted so each change is announced. Success is shown only
// with a confirmed server result and the persisted state it returned.
function CardStatus({
  cardKey,
  feedback
}: {
  cardKey: CardKey;
  feedback: CardFeedback | undefined;
}) {
  return (
    <div
      aria-live="polite"
      className={feedback ? "mt-4" : "mt-0"}
      data-card-state={feedback?.kind ?? "idle"}
      data-card-status={cardKey}
    >
      {feedback?.kind === "saving" ? (
        <p className="rounded-md border border-grayWilma-200 bg-grayWilma-100 px-3 py-2 text-sm font-semibold text-grayWilma-800" role="status">
          Saving… waiting for the server to confirm.
        </p>
      ) : null}
      {feedback?.kind === "success" ? (
        <div className="rounded-md border border-teal/30 bg-teal/10 px-3 py-2 text-sm" role="status">
          <p className="font-black text-navy">{feedback.detail ?? feedback.message}</p>
          {feedback.detail ? <p className="mt-1 text-grayWilma-800">{feedback.message}</p> : null}
          <p className="mt-1 text-grayWilma-700">
            Persisted status:{" "}
            <strong>{feedback.status ? humanize(feedback.status) : "Created"}</strong>
            {feedback.workspaceVersion !== null
              ? ` · Workspace version ${feedback.workspaceVersion}`
              : ""}
            {feedback.duplicate ? " · Existing idempotent result returned" : ""}
          </p>
        </div>
      ) : null}
      {feedback?.kind === "error" ? (
        <div className="rounded-md border border-orange/40 bg-orange/10 px-3 py-2 text-sm" role="alert">
          <p className="font-black text-navy">
            {feedback.conflict
              ? "Not saved: a newer workspace version exists"
              : feedback.validation
                ? "Not saved: the entered information was rejected"
                : "Not confirmed"}
          </p>
          <p className="mt-1 leading-6 text-grayWilma-800">{feedback.message}</p>
          {feedback.conflict ? (
            <Button
              className="mt-3 min-h-11"
              onClick={() => window.location.reload()}
              type="button"
              variant="secondary"
            >
              Reload current workspace
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AdminField({
  label,
  helperCopy,
  required = false,
  children
}: {
  label: string;
  helperCopy?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-black">
        {label}
        {required ? (
          <>
            <span className="ml-1 text-orange" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </span>
      {helperCopy ? (
        <span className="text-xs leading-5 text-grayWilma-600">
          {helperCopy}
        </span>
      ) : null}
      {children}
    </label>
  );
}

function SectionSelect({
  sections,
  value,
  onChange,
  disabled
}: {
  sections: Phase1InternalOnboardingSnapshot["sections"];
  value: OnboardingSectionKey;
  onChange: (value: OnboardingSectionKey) => void;
  disabled: boolean;
}) {
  return (
    <AdminField label="Section" required>
      <select
        className={inputClassName}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.currentTarget.value as OnboardingSectionKey)
        }
        value={value}
      >
        {sections.map((section) => (
          <option key={section.key} value={section.key}>
            {sectionLabel(section.key)} — {humanize(section.status)}
          </option>
        ))}
      </select>
    </AdminField>
  );
}

// HF-014: a disabled action lists the actual conditions beside it; the list is tied to
// the button through aria-describedby and recomputes as the reviewer types.
function OperationButton({
  action,
  cardKey,
  pendingAction,
  reasons,
  warning = false,
  type = "submit",
  onClick,
  children
}: {
  action: InternalAction;
  cardKey: CardKey;
  pendingAction: InternalAction | null;
  reasons: string[];
  warning?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const reasonsId = `phase1-${cardKey}-disabled-reasons`;
  const disabled = reasons.length > 0;
  return (
    <div className="grid gap-2">
      <Button
        aria-describedby={disabled ? reasonsId : undefined}
        className="min-h-11 justify-self-start"
        data-action={action}
        disabled={disabled}
        onClick={onClick}
        type={type}
        variant={warning ? "warning" : "primary"}
      >
        {pendingAction === action ? "Saving…" : children}
      </Button>
      {disabled ? (
        <ul
          className="grid gap-1 rounded-md border border-orange/20 bg-orange/10 px-3 py-2 text-xs font-semibold leading-5 text-grayWilma-800"
          data-disabled-reasons={cardKey}
          id={reasonsId}
        >
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ConstraintCopy({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-orange/20 bg-orange/10 px-3 py-2 text-xs font-semibold leading-5 text-grayWilma-800">
      {children}
    </p>
  );
}

function SummaryValue({
  label,
  value,
  mono = false
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md bg-grayWilma-100 px-3 py-3">
      <dt className="text-xs font-black uppercase tracking-wide text-grayWilma-600">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm font-semibold ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function mergeOperationResult(
  current: Phase1InternalOnboardingSnapshot,
  workspaceVersion: number | null,
  status: OnboardingWorkspaceStatus | null
) {
  if (!current.workspace || (workspaceVersion === null && status === null)) {
    return null;
  }
  return {
    ...current,
    workspace: {
      ...current.workspace,
      aggregateVersion:
        workspaceVersion ?? current.workspace.aggregateVersion,
      status: status ?? current.workspace.status
    }
  };
}

function parseSnapshot(
  value: unknown
): Phase1InternalOnboardingSnapshot | null {
  const snapshot = objectValue(value);
  if (
    !snapshot ||
    !Array.isArray(snapshot.sections) ||
    !Array.isArray(snapshot.agreements) ||
    !Array.isArray(snapshot.assets)
  ) {
    return null;
  }

  const workspaceValue = snapshot.workspace;
  let workspace: Phase1InternalOnboardingSnapshot["workspace"] = null;
  if (workspaceValue !== null) {
    const candidate = objectValue(workspaceValue);
    const status = workspaceStatusValue(candidate?.status);
    const commercialGateStatus = commercialGateValue(
      candidate?.commercialGateStatus
    );
    if (
      !candidate ||
      typeof candidate.id !== "string" ||
      status === null ||
      typeof candidate.aggregateVersion !== "number" ||
      commercialGateStatus === null
    ) {
      return null;
    }
    workspace = {
      id: candidate.id,
      status,
      aggregateVersion: candidate.aggregateVersion,
      targetLaunchDate:
        typeof candidate.targetLaunchDate === "string"
          ? candidate.targetLaunchDate
          : null,
      commercialGateStatus
    };
  }

  const sections = snapshot.sections.flatMap((value) => {
    const section = objectValue(value);
    const key = sectionKeyValue(section?.key);
    const status = sectionStatusValue(section?.status);
    return key && status ? [{ key, status }] : [];
  });
  const agreements = snapshot.agreements.flatMap((value) => {
    const agreement = objectValue(value);
    const type = agreementTypeValue(agreement?.type);
    if (
      !agreement ||
      type === null ||
      typeof agreement.status !== "string" ||
      typeof agreement.required !== "boolean"
    ) {
      return [];
    }
    return [
      {
        id: typeof agreement.id === "string" ? agreement.id : undefined,
        type,
        status: agreement.status,
        required: agreement.required,
        partnerSafeDetail:
          typeof agreement.partnerSafeDetail === "string"
            ? agreement.partnerSafeDetail
            : null,
        finalizedAssetId:
          typeof agreement.finalizedAssetId === "string"
            ? agreement.finalizedAssetId
            : null,
        effectiveDate:
          typeof agreement.effectiveDate === "string"
            ? agreement.effectiveDate
            : null
      }
    ];
  });
  const assets = snapshot.assets.flatMap((value) => {
    const asset = objectValue(value);
    if (
      !asset ||
      typeof asset.id !== "string" ||
      typeof asset.category !== "string" ||
      typeof asset.originalFileName !== "string" ||
      typeof asset.mediaType !== "string"
    ) {
      return [];
    }
    return [
      {
        id: asset.id,
        category: asset.category,
        originalFileName: asset.originalFileName,
        mediaType: asset.mediaType
      }
    ];
  });
  const evidence = objectValue(snapshot.commercialEvidence);
  const commercialEvidence = {
    partnerPaymentStatus:
      typeof evidence?.partnerPaymentStatus === "string"
        ? evidence.partnerPaymentStatus
        : null,
    paidInvoiceClearable: evidence?.paidInvoiceClearable === true
  };
  return { workspace, sections, agreements, assets, commercialEvidence };
}

async function readJsonObject(response: Response) {
  if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
    return null;
  }
  try {
    return objectValue(await response.json());
  } catch {
    return null;
  }
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value)
    ? value
    : null;
}

function workspaceStatusValue(
  value: unknown
): OnboardingWorkspaceStatus | null {
  const statuses: readonly OnboardingWorkspaceStatus[] = [
    "draft",
    "commercially_blocked",
    "setup_in_progress",
    "waiting_on_partner",
    "ready_for_review",
    "ready_to_launch",
    "live",
    "paused",
    "closed"
  ];
  return typeof value === "string" &&
    statuses.includes(value as OnboardingWorkspaceStatus)
    ? (value as OnboardingWorkspaceStatus)
    : null;
}

function sectionStatusValue(
  value: unknown
): OnboardingSectionStatus | null {
  const statuses: readonly OnboardingSectionStatus[] = [
    "not_started",
    "in_progress",
    "submitted",
    "needs_changes",
    "approved",
    "waived",
    "not_applicable"
  ];
  return typeof value === "string" &&
    statuses.includes(value as OnboardingSectionStatus)
    ? (value as OnboardingSectionStatus)
    : null;
}

function sectionKeyValue(value: unknown): OnboardingSectionKey | null {
  return typeof value === "string" &&
    ONBOARDING_SECTION_DEFINITIONS.some(
      (definition) => definition.key === value
    )
    ? (value as OnboardingSectionKey)
    : null;
}

function commercialGateValue(
  value: unknown
): CommercialGateOutcome | null {
  return typeof value === "string" &&
    (COMMERCIAL_OUTCOMES as readonly string[]).includes(value)
    ? (value as CommercialGateOutcome)
    : null;
}

function agreementTypeValue(value: unknown): AgreementType | null {
  return typeof value === "string" &&
    (AGREEMENT_TYPES as readonly string[]).includes(value)
    ? (value as AgreementType)
    : null;
}

function sectionLabel(key: OnboardingSectionKey) {
  return (
    ONBOARDING_SECTION_DEFINITIONS.find(
      (definition) => definition.key === key
    )?.label ?? humanize(key)
  );
}

function agreementTypeLabel(type: AgreementType) {
  const labels: Record<AgreementType, string> = {
    order_form: "Order Form",
    master_services_agreement: "Master Services Agreement",
    data_privacy_security_addendum: "Data / Privacy / Security Addendum",
    procurement_requirements: "Procurement requirements"
  };
  return labels[type];
}

function operationSuccessMessage(action: InternalAction) {
  const messages: Record<InternalAction, string> = {
    create: "Phase 1 workspace is available.",
    target_launch_date: "Target launch date was saved.",
    commercial_gate: "Commercial gate evidence was saved.",
    agreement: "Agreement or procurement metadata was saved.",
    request_changes: "Partner corrections were requested.",
    approve_section: "Section approval was saved.",
    waive_section: "Section waiver was saved.",
    ready_for_launch: "Workspace is ready for launch preparation.",
    close: "Workspace was closed."
  };
  return messages[action];
}

function internalErrorMessage(
  status: number,
  body: Record<string, unknown> | null,
  conflict: boolean
) {
  if (conflict) {
    return "A newer workspace version exists. Reload before applying another internal decision. Nothing from this attempt was saved.";
  }
  if (status === 401) return "Your internal admin session expired.";
  if (status === 403) {
    return "This account is not authorized for internal onboarding review.";
  }
  if (typeof body?.error === "string") return body.error;
  return "The internal onboarding operation was not saved.";
}

function toneForWorkspaceStatus(
  status: OnboardingWorkspaceStatus
): "teal" | "blue" | "orange" | "neutral" {
  if (status === "ready_to_launch" || status === "live") return "teal";
  if (
    status === "commercially_blocked" ||
    status === "waiting_on_partner" ||
    status === "paused"
  ) {
    return "orange";
  }
  if (
    status === "draft" ||
    status === "setup_in_progress" ||
    status === "ready_for_review"
  ) {
    return "blue";
  }
  return "neutral";
}

function toneForSectionStatus(
  status: OnboardingSectionStatus
): "teal" | "blue" | "orange" | "neutral" {
  if (status === "approved" || status === "waived") return "teal";
  if (status === "needs_changes") return "orange";
  if (status === "submitted" || status === "in_progress") return "blue";
  return "neutral";
}

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}
