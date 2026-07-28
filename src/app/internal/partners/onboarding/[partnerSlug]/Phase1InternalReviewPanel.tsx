"use client";

import {
  type FormEvent,
  useRef,
  useState
} from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ONBOARDING_SECTION_DEFINITIONS } from "@/lib/partners/onboarding/schema";
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
};

export type Phase1InternalReviewPanelProps = {
  partnerSlug: string;
  snapshot: Phase1InternalOnboardingSnapshot;
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

type Feedback =
  | { kind: "idle" }
  | {
      kind: "success";
      action: InternalAction;
      message: string;
      status: OnboardingWorkspaceStatus | null;
      workspaceVersion: number | null;
      duplicate: boolean;
    }
  | {
      kind: "error";
      message: string;
      conflict: boolean;
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

const inputClassName =
  "min-h-11 w-full rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm text-navy shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25 disabled:cursor-not-allowed disabled:bg-grayWilma-100 disabled:text-grayWilma-600";
const textareaClassName = `${inputClassName} min-h-28 resize-y`;

export function Phase1InternalReviewPanel({
  partnerSlug,
  snapshot
}: Phase1InternalReviewPanelProps) {
  const [current, setCurrent] =
    useState<Phase1InternalOnboardingSnapshot>(snapshot);
  const [pendingAction, setPendingAction] = useState<InternalAction | null>(
    null
  );
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle" });
  const inFlightRef = useRef(false);
  const retryAttemptRef = useRef<{
    signature: string;
    requestId: string;
  } | null>(null);

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

  const firstSection = snapshot.sections[0]?.key ?? "organization_contacts";
  const [changeSection, setChangeSection] =
    useState<OnboardingSectionKey>(firstSection);
  const [changeInstructions, setChangeInstructions] = useState("");
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
  const controlsDisabled = pendingAction !== null || lockedStatus;
  const selectedReviewSection = current.sections.find(
    (section) => section.key === reviewSection
  );
  const canApproveSelected =
    reviewDecision === "waive_section" ||
    selectedReviewSection?.status === "submitted" ||
    selectedReviewSection?.status === "needs_changes";
  const allSectionsReviewed =
    current.sections.length === ONBOARDING_SECTION_DEFINITIONS.length &&
    current.sections.every((section) =>
      ["approved", "waived", "not_applicable"].includes(section.status)
    );
  const canMarkReady =
    workspace?.status === "ready_for_review" &&
    workspace.commercialGateStatus !== "blocked" &&
    allSectionsReviewed;
  const canRequestChanges = workspace?.status === "ready_for_review";
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

  async function runOperation(
    action: InternalAction,
    payload: Record<string, unknown>
  ) {
    if (inFlightRef.current) return false;
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
    setFeedback({ kind: "idle" });

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
        setFeedback({
          kind: "error",
          conflict,
          message: internalErrorMessage(response.status, body, conflict)
        });
        return false;
      }

      const returnedSnapshot = parseSnapshot(body.snapshot);
      const result = objectValue(body.result);
      const resultVersion = numberValue(result?.workspaceVersion);
      const resultStatus = workspaceStatusValue(result?.status);
      const nextSnapshot =
        returnedSnapshot ??
        mergeOperationResult(current, resultVersion, resultStatus);

      if (nextSnapshot) {
        setCurrent(nextSnapshot);
        setTargetLaunchDate(
          nextSnapshot.workspace?.targetLaunchDate ?? ""
        );
        setCommercialOutcome(
          nextSnapshot.workspace?.commercialGateStatus ?? "blocked"
        );
        const refreshedAgreement = nextSnapshot.agreements.find(
          (agreement) => agreement.type === agreementType
        );
        setAgreementStatus(refreshedAgreement?.status ?? "not_started");
        setAgreementRequired(refreshedAgreement?.required ?? true);
        setAgreementDetail(
          refreshedAgreement?.partnerSafeDetail ?? ""
        );
        setAgreementFinalizedAssetId(
          refreshedAgreement?.finalizedAssetId ?? ""
        );
        setAgreementEffectiveDate(
          refreshedAgreement?.effectiveDate ?? ""
        );
      }
      retryAttemptRef.current = null;
      setFeedback({
        kind: "success",
        action,
        message: operationSuccessMessage(action),
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
      });
      return true;
    } catch {
      setFeedback({
        kind: "error",
        conflict: false,
        message:
          "The operation could not be confirmed. No success is shown; retrying the unchanged form will use the same request ID."
      });
      return false;
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
    const saved = await runOperation("target_launch_date", {
      targetLaunchDate: targetLaunchDate || null,
      reason: targetReason.trim()
    });
    if (saved) setTargetReason("");
  }

  async function saveCommercialGate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await runOperation("commercial_gate", {
      outcome: commercialOutcome,
      evidenceReference: commercialEvidence.trim() || null,
      overrideReason:
        commercialOutcome === "cleared_by_authorized_internal_override"
          ? commercialOverrideReason.trim()
          : null
    });
    if (saved) {
      setCommercialEvidence("");
      setCommercialOverrideReason("");
    }
  }

  async function saveAgreement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runOperation("agreement", {
      agreementType,
      status: agreementStatus,
      required: agreementRequired,
      partnerSafeDetail: agreementDetail.trim() || null,
      finalizedAssetId: agreementFinalizedAssetId || null,
      effectiveDate: agreementEffectiveDate || null
    });
  }

  async function requestChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await runOperation("request_changes", {
      sectionKey: changeSection,
      instructions: changeInstructions.trim()
    });
    if (saved) setChangeInstructions("");
  }

  async function reviewSectionAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await runOperation(reviewDecision, {
      sectionKey: reviewSection,
      reason: reviewReason.trim()
    });
    if (saved) setReviewReason("");
  }

  async function markReadyForLaunch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await runOperation("ready_for_launch", {
      reason: readyReason.trim()
    });
    if (saved) setReadyReason("");
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
    const saved = await runOperation("close", {
      reason: closeReason.trim()
    });
    if (saved) setCloseReason("");
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
            change live or paused state.
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

      {feedback.kind === "success" ? (
        <Card
          aria-live="polite"
          className="mb-5 border-teal/30 bg-teal/10 p-4"
          role="status"
        >
          <p className="font-black text-navy">{feedback.message}</p>
          <p className="mt-1 text-sm text-grayWilma-700">
            Persisted status:{" "}
            <strong>
              {feedback.status ? humanize(feedback.status) : "Created"}
            </strong>
            {feedback.workspaceVersion !== null
              ? ` · Workspace version ${feedback.workspaceVersion}`
              : ""}
            {feedback.duplicate
              ? " · Existing idempotent result returned"
              : ""}
          </p>
        </Card>
      ) : null}

      {feedback.kind === "error" ? (
        <Card
          className="mb-5 border-orange/40 bg-orange/10 p-4"
          role="alert"
          aria-labelledby="phase1-operation-error-heading"
        >
          <h3 className="font-black" id="phase1-operation-error-heading">
            Operation not confirmed
          </h3>
          <p className="mt-1 text-sm leading-6 text-grayWilma-800">
            {feedback.message}
          </p>
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
        </Card>
      ) : null}

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
              description="Set or clear the planning date with an auditable internal reason."
              title="Target launch date"
            >
              <form className="grid gap-4" onSubmit={saveTargetDate}>
                <AdminField label="Target launch date">
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
                  disabled={controlsDisabled || !targetReason.trim()}
                  pendingAction={pendingAction}
                >
                  Save target date
                </OperationButton>
              </form>
            </OperationCard>

            <OperationCard
              description="Record authoritative commercial evidence. Only the authorized override outcome accepts an override reason."
              title="Commercial gate"
            >
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
                      <option key={outcome} value={outcome}>
                        {humanize(outcome)}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField
                  helperCopy={
                    commercialOutcome === "cleared_by_paid_invoice"
                      ? "Paid status is verified from the authoritative partner provisioning record; typed text cannot clear this gate."
                      : "Use a bounded approved purchase-order reference. Do not paste payment credentials."
                  }
                  label="Evidence reference"
                  required={
                    commercialOutcome ===
                      "cleared_by_approved_purchase_order"
                  }
                >
                  <input
                    className={inputClassName}
                    maxLength={500}
                    onChange={(event) =>
                      setCommercialEvidence(event.currentTarget.value)
                    }
                    disabled={
                      controlsDisabled ||
                      commercialOutcome === "cleared_by_paid_invoice"
                    }
                    required={
                      commercialOutcome ===
                        "cleared_by_approved_purchase_order"
                    }
                    value={commercialEvidence}
                  />
                </AdminField>
                {commercialOutcome ===
                "cleared_by_authorized_internal_override" ? (
                  <AdminField label="Authorized override reason" required>
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
                  disabled={
                    controlsDisabled ||
                    (commercialOutcome ===
                      "cleared_by_approved_purchase_order" &&
                      !commercialEvidence.trim()) ||
                    (commercialOutcome ===
                      "cleared_by_authorized_internal_override" &&
                      !commercialOverrideReason.trim())
                  }
                  pendingAction={pendingAction}
                >
                  Record commercial outcome
                </OperationButton>
              </form>
            </OperationCard>

            <OperationCard
              description="Record partner-safe agreement or procurement status. This does not provide e-signature."
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
                <AdminField label="Effective date">
                  <input
                    className={inputClassName}
                    disabled={controlsDisabled}
                    onChange={(event) =>
                      setAgreementEffectiveDate(event.currentTarget.value)
                    }
                    type="date"
                    value={agreementEffectiveDate}
                  />
                </AdminField>
                <OperationButton
                  action="agreement"
                  disabled={controlsDisabled}
                  pendingAction={pendingAction}
                >
                  Save agreement status
                </OperationButton>
              </form>
            </OperationCard>

            <OperationCard
              description="Send one consolidated, partner-safe instruction for the selected section."
              title="Request section changes"
            >
              <form className="grid gap-4" onSubmit={requestChanges}>
                <SectionSelect
                  disabled={controlsDisabled || !canRequestChanges}
                  onChange={setChangeSection}
                  sections={current.sections}
                  value={changeSection}
                />
                <AdminField label="Partner-safe instructions" required>
                  <textarea
                    className={textareaClassName}
                    disabled={controlsDisabled || !canRequestChanges}
                    maxLength={5000}
                    onChange={(event) =>
                      setChangeInstructions(event.currentTarget.value)
                    }
                    required
                    value={changeInstructions}
                  />
                </AdminField>
                {!canRequestChanges ? (
                  <ConstraintCopy>
                    Change requests are available only while the workspace is
                    ready for review.
                  </ConstraintCopy>
                ) : null}
                <OperationButton
                  action="request_changes"
                  disabled={
                    controlsDisabled ||
                    !canRequestChanges ||
                    !changeInstructions.trim()
                  }
                  pendingAction={pendingAction}
                >
                  Request changes
                </OperationButton>
              </form>
            </OperationCard>

            <OperationCard
              description="Approve a submitted section or waive it with an auditable reason."
              title="Approve or waive a section"
            >
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
                    required
                    value={reviewReason}
                  />
                </AdminField>
                {!canApproveSelected ? (
                  <ConstraintCopy>
                    Approval requires a submitted or changes-requested section.
                    Waiver remains available with a reason.
                  </ConstraintCopy>
                ) : null}
                <OperationButton
                  action={reviewDecision}
                  disabled={
                    controlsDisabled ||
                    !reviewReason.trim() ||
                    !canApproveSelected
                  }
                  pendingAction={pendingAction}
                >
                  {reviewDecision === "approve_section"
                    ? "Approve section"
                    : "Waive section"}
                </OperationButton>
              </form>
            </OperationCard>

            <OperationCard
              description="Move a fully reviewed package into launch preparation. This does not activate or publish anything."
              title="Ready for launch preparation"
            >
              <form className="grid gap-4" onSubmit={markReadyForLaunch}>
                <AdminField label="Review decision reason" required>
                  <textarea
                    className={textareaClassName}
                    disabled={controlsDisabled || !canMarkReady}
                    maxLength={5000}
                    onChange={(event) =>
                      setReadyReason(event.currentTarget.value)
                    }
                    required
                    value={readyReason}
                  />
                </AdminField>
                {!canMarkReady ? (
                  <ConstraintCopy>
                    Requires a commercially cleared, ready-for-review workspace
                    with all eight sections approved, waived, or not applicable.
                  </ConstraintCopy>
                ) : null}
                <OperationButton
                  action="ready_for_launch"
                  disabled={
                    controlsDisabled || !canMarkReady || !readyReason.trim()
                  }
                  pendingAction={pendingAction}
                >
                  Mark ready for launch preparation
                </OperationButton>
              </form>
            </OperationCard>

            <OperationCard
              description="Close an unfinished Phase 1 workspace with an auditable reason."
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
                {!canClose ? (
                  <ConstraintCopy>
                    The current workspace state cannot be closed through Phase
                    1 controls.
                  </ConstraintCopy>
                ) : null}
                <OperationButton
                  action="close"
                  disabled={
                    pendingAction !== null ||
                    !canClose ||
                    !closeReason.trim()
                  }
                  pendingAction={pendingAction}
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
  title,
  description,
  warning = false,
  children
}: {
  title: string;
  description: string;
  warning?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={`rounded-md p-5 ${
        warning ? "border-orange/30" : "border-grayWilma-200"
      }`}
    >
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-grayWilma-700">
        {description}
      </p>
      <div className="mt-5">{children}</div>
    </Card>
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

function OperationButton({
  action,
  pendingAction,
  disabled,
  warning = false,
  children
}: {
  action: InternalAction;
  pendingAction: InternalAction | null;
  disabled: boolean;
  warning?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      className="min-h-11 justify-self-start"
      disabled={disabled}
      type="submit"
      variant={warning ? "warning" : "primary"}
    >
      {pendingAction === action ? "Saving…" : children}
    </Button>
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
  return { workspace, sections, agreements, assets };
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
    request_changes: "Partner-safe section changes were requested.",
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
    return "A newer workspace version exists. Reload before applying another internal decision.";
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
