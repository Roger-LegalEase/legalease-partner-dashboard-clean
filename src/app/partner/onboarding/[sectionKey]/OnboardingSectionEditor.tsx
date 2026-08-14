"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { decideConfirmedSectionSave } from "@/lib/partners/onboarding/client-save-order";
import { canAnnounceGuidedSaveSuccess } from "@/lib/partners/onboarding/guided-save-state";
import {
  getGuidedSection,
  guidedFieldRoot,
  guidedSectionHref,
  guidedSubstepForField,
  guidedSubstepProgress,
  resolveGuidedStep,
  SECTION_CHANGE_REQUEST_STEP,
  substepOwnsField,
  type GuidedStepResolution,
  type GuidedSubstepDefinition,
  type GuidedSubstepSurface,
  type PartnerFacingChangeRequest
} from "@/lib/partners/onboarding/guided-substeps";
import {
  onboardingOptionLabel,
  sectionStatusLabel
} from "@/lib/partners/onboarding/partner-labels";
import {
  ACCESS_CODE_STRUCTURES,
  CONTACT_ROLES,
  DASHBOARD_SPECIAL_PERMISSIONS,
  getFieldDefinition,
  ONBOARDING_ASSET_DEFINITIONS,
  ONBOARDING_FIELD_LIMITS,
  ONBOARDING_SCHEMA_REGISTRY,
  ONBOARDING_SECTION_DEFINITIONS,
  ORGANIZATION_TYPES,
  OUT_OF_AREA_POLICIES,
  PARTICIPANT_ACCESS_MODELS,
  PROGRAM_MODELS,
  REQUESTED_DASHBOARD_ROLES
} from "@/lib/partners/onboarding/schema";
import type {
  OnboardingSectionKey,
  OnboardingSectionStatus,
  OrganizationalAssetCategory
} from "@/lib/partners/onboarding/types";

type DisplayValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly string[];

export type OnboardingCanonicalReference = {
  fieldKey: string;
  label: string;
  value: DisplayValue;
  editHref: string;
  helperCopy?: string;
  options?: Array<{
    id: string;
    label: string;
    detail?: string;
  }>;
};

export type OnboardingReadOnlyValue = {
  fieldKey: string;
  label: string;
  value: DisplayValue;
  helperCopy?: string;
};

export type OnboardingEditorAsset = {
  id: string;
  category: OrganizationalAssetCategory;
  originalFileName?: string;
  fileName?: string;
  byteSize?: number;
  sizeBytes?: number;
  lifecycleStatus?: string;
  reviewStatus?: string;
  mediaType?: string | null;
  status?: string;
  previewHref?: string | null;
  downloadHref?: string | null;
  contentType?: string | null;
  width?: number | null;
  height?: number | null;
  uploadedAt?: string;
};

export type OnboardingSectionEditorProps = {
  sectionKey: OnboardingSectionKey;
  sectionStatus: OnboardingSectionStatus;
  title: string;
  purpose: string;
  initialData: Readonly<Record<string, unknown>>;
  initialRevision: number;
  initialWorkspaceVersion: number;
  canEdit: boolean;
  isPartnerStaff: boolean;
  commercialBlocked: boolean;
  changeRequestInstructions: string | null;
  changeRequestStatus: "open" | "partner_responded" | null;
  changeRequests: PartnerFacingChangeRequest[];
  canonicalReferences: OnboardingCanonicalReference[];
  readOnlyValues: OnboardingReadOnlyValue[];
  assets: OnboardingEditorAsset[];
  previousHref: string | null;
  nextHref: string;
  pendingPrefillFieldKeys: string[];
  initialStepId: string;
  missingRequiredKeys: string[];
  completionHref: string;
  sectionSummary: {
    completedSections: number;
    totalSections: number;
    openPartnerChanges: number;
    waitingOnLegalEase: number;
  };
};

type ValidationIssue = {
  fieldKey: string;
  message: string;
  rowId?: string;
};

type SaveMode = "draft_save" | "substep_continue" | "section_complete";

type SaveResult =
  | { kind: "success"; currentSnapshotConfirmed: boolean }
  | { kind: "validation" | "conflict" | "failure" | "superseded" };

type SaveOperation = {
  sequence: number;
  requestId: string;
  mode: SaveMode;
  guidedStepId: string | null;
  snapshot: Record<string, unknown>;
  resolve: (result: SaveResult) => void;
};

type SaveIndicator =
  | { kind: "idle"; message: string }
  | { kind: "saving"; message: string }
  | { kind: "saved"; message: string }
  | {
      kind: "error";
      message: string;
      recovery: "retry" | "sign_in" | "conflict";
    };

type GuidedRenderContextValue = {
  activeStep: GuidedSubstepDefinition;
  activeSurface: GuidedSubstepSurface;
  requestedFieldKey: string | null;
  activeChangeRequest: PartnerFacingChangeRequest | null;
};

type OnboardingStaffSection = {
  key: OnboardingSectionKey;
  title: string;
  status: OnboardingSectionStatus;
  changeRequestStatus: "open" | "partner_responded" | null;
  changeRequests: PartnerFacingChangeRequest[];
};

type FieldRendererProps = {
  data: Record<string, unknown>;
  editable: boolean;
  issues: ValidationIssue[];
  canonicalReferences: OnboardingCanonicalReference[];
  readOnlyValues: OnboardingReadOnlyValue[];
  assets: OnboardingEditorAsset[];
  assetBusyCategory: OrganizationalAssetCategory | null;
  assetErrors: Partial<Record<OrganizationalAssetCategory, string>>;
  updateField: (fieldKey: string, value: unknown) => void;
  uploadAsset: (
    category: OrganizationalAssetCategory,
    file: File,
    input: HTMLInputElement
  ) => Promise<void>;
  deleteAsset: (asset: OnboardingEditorAsset) => Promise<void>;
  guardUnsavedNavigation: (event: MouseEvent<HTMLAnchorElement>) => void;
};

const inputClassName =
  "min-h-11 w-full rounded-none border border-grayWilma-200 bg-white px-3 py-2 text-sm text-navy shadow-none outline-none transition placeholder:text-grayWilma-500 focus:border-teal focus:ring-2 focus:ring-teal/25 disabled:cursor-not-allowed disabled:bg-grayWilma-100 disabled:text-grayWilma-600";
const textareaClassName = `${inputClassName} min-h-28 resize-y`;
const PrefillFieldContext = createContext<ReadonlySet<string>>(new Set());
const GuidedRenderContext = createContext<GuidedRenderContextValue | null>(null);

export function OnboardingSectionEditor({
  sectionKey,
  sectionStatus,
  title,
  purpose,
  initialData,
  initialRevision,
  initialWorkspaceVersion,
  canEdit,
  commercialBlocked,
  changeRequestStatus,
  changeRequests,
  canonicalReferences,
  readOnlyValues,
  assets: initialAssets,
  pendingPrefillFieldKeys,
  initialStepId,
  missingRequiredKeys,
  completionHref,
  sectionSummary
}: OnboardingSectionEditorProps) {
  const router = useRouter();
  const firstData = useMemo(() => cloneRecord(initialData), [initialData]);
  const guidedSection = useMemo(
    () => getGuidedSection(sectionKey),
    [sectionKey]
  );
  const activeChangeRequest = useMemo(
    () =>
      changeRequests.find(
        (request) =>
          request.status === "open" || request.status === "partner_responded"
      ) ?? null,
    [changeRequests]
  );
  const [activeStepId, setActiveStepId] = useState(initialStepId);
  const [data, setData] = useState<Record<string, unknown>>(firstData);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [indicator, setIndicator] = useState<SaveIndicator>({
    kind: "idle",
    message: commercialBlocked
      ? "Editing opens after commercial clearance."
      : canEdit
        ? "Changes save automatically."
        : "Editing is currently locked."
  });
  const [dirty, setDirty] = useState(false);
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  const [currentAssets, setCurrentAssets] =
    useState<OnboardingEditorAsset[]>(initialAssets);
  const [assetBusyCategory, setAssetBusyCategory] =
    useState<OrganizationalAssetCategory | null>(null);
  const [assetErrors, setAssetErrors] = useState<
    Partial<Record<OrganizationalAssetCategory, string>>
  >({});

  const revisionRef = useRef(initialRevision);
  const workspaceVersionRef = useRef(initialWorkspaceVersion);
  const dataRef = useRef(firstData);
  const lastSavedDataRef = useRef(cloneRecord(firstData));
  const lastSavedSerializedRef = useRef(serialize(firstData));
  const inFlightRef = useRef(false);
  const queuedRef = useRef<SaveOperation | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextSequenceRef = useRef(0);
  const appliedSequenceRef = useRef(0);
  const mountedRef = useRef(true);
  const completingRef = useRef(false);
  const completionAttemptRef = useRef<{
    serialized: string;
    operationKey: string;
    requestId: string;
  } | null>(null);
  const pendingFocusRef = useRef<ValidationIssue | null>(null);
  const failedSaveRef = useRef<{
    mode: SaveMode;
    guidedStepId: string | null;
  } | null>(null);
  const assetOperationsRef = useRef(new Set<OrganizationalAssetCategory>());
  const assetUploadRequestRef = useRef(
    new Map<
      OrganizationalAssetCategory,
      {
        fingerprint: string;
        requestId: string;
        expectedWorkspaceVersion: number;
      }
    >()
  );
  const assetDeleteRequestRef = useRef(
    new Map<
      string,
      { requestId: string; expectedWorkspaceVersion: number }
    >()
  );
  const editable = canEdit && !commercialBlocked && conflictRevision === null;
  const controlsEnabled = editable && !completing;
  const guidedResolution = resolveGuidedStep({
    sectionKey,
    requestedStep: activeStepId,
    missingRequiredKeys,
    pendingPrefillFieldKeys,
    changeRequest: activeChangeRequest
      ? {
          status: activeChangeRequest.status,
          targetFieldKey: activeChangeRequest.targetFieldKey
        }
      : null,
    canEdit: editable
  });
  const requestOverview = guidedResolution.requestOverview;
  const activeStep = guidedResolution.substep;
  const activeStepIndex = guidedResolution.index;
  const progress = guidedSubstepProgress(
    sectionKey,
    missingRequiredKeys,
    pendingPrefillFieldKeys,
    data
  );
  const activeStepProgress = progress.find(
    (candidate) => candidate.id === activeStep.id
  );
  const activeRequestedFieldKey =
    guidedResolution.containsRequestedChange &&
    !guidedResolution.sectionLevelRequest
      ? guidedResolution.requestedFieldKey
      : null;
  const guidedRenderValue = useMemo<GuidedRenderContextValue>(
    () => ({
      activeStep,
      activeSurface: activeStep.surface,
      requestedFieldKey: activeRequestedFieldKey,
      activeChangeRequest
    }),
    [activeChangeRequest, activeRequestedFieldKey, activeStep]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const currentStep = new URL(window.location.href).searchParams.get("step");
    if (currentStep === activeStepId) return;
    window.history.replaceState(
      window.history.state,
      "",
      guidedSectionHref(sectionKey, activeStepId)
    );
  }, [activeStepId, sectionKey]);

  useEffect(() => {
    const restoreStepFromHistory = () => {
      const requested = new URL(window.location.href).searchParams.get("step");
      const restored = resolveGuidedStep({
        sectionKey,
        requestedStep: requested,
        missingRequiredKeys,
        pendingPrefillFieldKeys,
        changeRequest: activeChangeRequest
          ? {
              status: activeChangeRequest.status,
              targetFieldKey: activeChangeRequest.targetFieldKey
            }
          : null,
        canEdit: editable
      });
      setActiveStepId(
        restored.requestOverview
          ? SECTION_CHANGE_REQUEST_STEP
          : restored.substep.id
      );
    };
    window.addEventListener("popstate", restoreStepFromHistory);
    return () => window.removeEventListener("popstate", restoreStepFromHistory);
  }, [
    activeChangeRequest,
    editable,
    missingRequiredKeys,
    pendingPrefillFieldKeys,
    sectionKey
  ]);

  const navigateToStep = useCallback(
    (stepId: string, replace = false) => {
      const href = guidedSectionHref(sectionKey, stepId);
      if (replace) {
        window.history.replaceState(window.history.state, "", href);
      } else {
        window.history.pushState(window.history.state, "", href);
      }
      setActiveStepId(stepId);
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    },
    [sectionKey]
  );

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending || issues.length === 0) return;
    const targetStep = guidedSubstepForField(sectionKey, pending.fieldKey);
    if (targetStep && targetStep.id !== activeStep.id) return;
    const target = document.getElementById(
      controlId(pending.fieldKey, pending.rowId)
    );
    if (target instanceof HTMLElement) {
      target.focus();
      pendingFocusRef.current = null;
    }
  }, [activeStep.id, issues, sectionKey]);

  const performSave = useCallback(
    async function runSave(operation: SaveOperation): Promise<void> {
      inFlightRef.current = true;
      if (mountedRef.current) {
        setIndicator({
          kind: "saving",
          message:
            operation.mode === "section_complete"
              ? "Checking and saving this section"
              : "Saving"
        });
      }

      let result: SaveResult = { kind: "failure" };
      let continueQueue = true;

      try {
        const response = await fetch(
          `/api/partners/onboarding/sections/${encodeURIComponent(sectionKey)}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              requestId: operation.requestId,
              expectedRevision: revisionRef.current,
              expectedWorkspaceVersion: workspaceVersionRef.current,
              mode:
                operation.mode === "section_complete"
                  ? "section_complete"
                  : "draft_save",
              ...(operation.mode === "substep_continue" &&
              operation.guidedStepId
                ? { guidedStepId: operation.guidedStepId }
                : {}),
              data: operation.snapshot
            })
          }
        );
        const payload = await readJsonObject(response);

        if (
          response.status === 409 &&
          (payload?.code === "revision_conflict" ||
            numberValue(payload?.currentRevision) !== null)
        ) {
          const currentRevision = numberValue(payload?.currentRevision);
          if (mountedRef.current) {
            setConflictRevision(currentRevision ?? revisionRef.current);
            setIndicator({
              kind: "error",
              message:
                "A newer version of this section exists. Review the newer version before saving. Your entries remain on this page.",
              recovery: "conflict"
            });
          }
          result = { kind: "conflict" };
          continueQueue = false;
        } else if (!response.ok || payload?.success !== true) {
          const responseIssues = parseIssues(payload?.issues);
          const exposeValidation = operation.mode !== "draft_save";
          if (mountedRef.current) {
            if (exposeValidation) {
              const firstIssue = responseIssues[0] ?? null;
              pendingFocusRef.current = firstIssue;
              if (firstIssue) {
                const issueStep = guidedSubstepForField(
                  sectionKey,
                  firstIssue.fieldKey
                );
                if (issueStep && issueStep.id !== activeStep.id) {
                  navigateToStep(issueStep.id);
                }
              }
              setIssues(responseIssues);
            }
            setIndicator({
              kind: "error",
              message: requestErrorMessage(response.status, payload),
              recovery: response.status === 401 ? "sign_in" : "retry"
            });
          }
          failedSaveRef.current =
            responseIssues.length === 0
              ? {
                  mode: operation.mode,
                  guidedStepId: operation.guidedStepId
                }
              : null;
          result =
            responseIssues.length > 0
              ? { kind: "validation" }
              : { kind: "failure" };
        } else {
          failedSaveRef.current = null;
          const section = objectValue(payload.section);
          const serverData = objectValue(section?.data) ?? operation.snapshot;
          const serverRevision = numberValue(section?.revision);
          const workspaceVersion = numberValue(payload.workspaceVersion);
          const sentSerialized = serialize(operation.snapshot);
          const saveDecision = decideConfirmedSectionSave({
            operationSequence: operation.sequence,
            latestAppliedSequence: appliedSequenceRef.current,
            sentSerialized,
            currentSerialized: serialize(dataRef.current)
          });

          if (saveDecision.applyServerVersion) {
            appliedSequenceRef.current = operation.sequence;
            if (serverRevision !== null) revisionRef.current = serverRevision;
            if (workspaceVersion !== null) {
              workspaceVersionRef.current = workspaceVersion;
            }
            lastSavedSerializedRef.current = serialize(serverData);
            lastSavedDataRef.current = cloneRecord(serverData);

            if (mountedRef.current) {
              if (saveDecision.replaceLocalData) {
                const normalizedServerData = cloneRecord(serverData);
                dataRef.current = normalizedServerData;
                setData(normalizedServerData);
                setDirty(false);
                const confirmedSaved = canAnnounceGuidedSaveSuccess({
                  responseAccepted: response.ok,
                  authoritativePersistenceSucceeded: payload?.success === true,
                  serverVersionApplied: saveDecision.applyServerVersion,
                  currentSnapshotConfirmed: saveDecision.replaceLocalData
                });
                setIndicator(
                  confirmedSaved
                    ? {
                        kind: "saved",
                        message: `Saved at ${formatLocalSaveTime(new Date())}`
                      }
                    : {
                        kind: "idle",
                        message: "Waiting for the current save to be confirmed."
                      }
                );
              } else {
                setDirty(true);
                setIndicator({
                  kind: "idle",
                  message: "New changes are waiting to save."
                });
              }
              setIssues([]);
            }
          }

          result = {
            kind: "success",
            currentSnapshotConfirmed: saveDecision.replaceLocalData
          };
        }
      } catch {
        failedSaveRef.current = {
          mode: operation.mode,
          guidedStepId: operation.guidedStepId
        };
        if (mountedRef.current) {
          setIndicator({
            kind: "error",
            message:
              "Could not save. Nothing changed. Your entries remain on this page. Check your connection and retry.",
            recovery: "retry"
          });
          setDirty(true);
        }
        result = { kind: "failure" };
      } finally {
        operation.resolve(result);
        inFlightRef.current = false;

        const queued = queuedRef.current;
        queuedRef.current = null;
        if (continueQueue && queued) {
          void runSave(queued);
        } else if (!continueQueue && queued) {
          queued.resolve({ kind: "conflict" });
        }
      }
    },
    [activeStep.id, navigateToStep, sectionKey]
  );

  const enqueueSave = useCallback(
    (
      mode: SaveMode,
      snapshot: Record<string, unknown>,
      guidedStepId: string | null = null
    ) =>
      new Promise<SaveResult>((resolve) => {
        const operation: SaveOperation = {
          sequence: ++nextSequenceRef.current,
          requestId: requestIdForSave(
            mode,
            snapshot,
            guidedStepId,
            completionAttemptRef
          ),
          mode,
          guidedStepId,
          snapshot: cloneRecord(snapshot),
          resolve
        };

        if (!inFlightRef.current) {
          void performSave(operation);
          return;
        }

        if (queuedRef.current) {
          queuedRef.current.resolve({ kind: "superseded" });
        }
        queuedRef.current = operation;
      }),
    [performSave]
  );

  const updateField = useCallback((fieldKey: string, value: unknown) => {
    setData((current) => {
      const next = { ...current, [fieldKey]: value };
      dataRef.current = next;
      return next;
    });
    setIssues((current) =>
      current.filter((issue) => issue.fieldKey !== fieldKey)
    );
    setDirty(true);
    setIndicator({
      kind: "idle",
      message: "Changes are waiting to save."
    });
  }, []);

  useEffect(() => {
    if (!editable) return;
    setData((current) => {
      const withStableIds = ensureCollectionStableIds(sectionKey, current);
      if (withStableIds === current) return current;
      dataRef.current = withStableIds;
      return withStableIds;
    });
  }, [editable, sectionKey]);

  useEffect(() => {
    const serialized = serialize(data);
    const hasUnsavedChanges = serialized !== lastSavedSerializedRef.current;
    setDirty(hasUnsavedChanges);

    if (!editable || !hasUnsavedChanges) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void enqueueSave("draft_save", dataRef.current);
    }, 1000);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [data, editable, enqueueSave]);

  useEffect(() => {
    if (!dirty) return;
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnAboutUnsavedChanges);
    return () =>
      window.removeEventListener("beforeunload", warnAboutUnsavedChanges);
  }, [dirty]);

  async function handleSaveAndContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestOverview) {
      navigateToStep(activeStep.id);
      return;
    }
    if (!controlsEnabled || completingRef.current) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    completingRef.current = true;
    setCompleting(true);
    const completingSection = activeStep.nextSubstep === null;
    const result = await enqueueSave(
      completingSection ? "section_complete" : "substep_continue",
      dataRef.current,
      completingSection ? null : activeStep.id
    );
    completingRef.current = false;
    if (mountedRef.current) setCompleting(false);
    if (result.kind === "success" && result.currentSnapshotConfirmed) {
      completionAttemptRef.current = null;
      if (completingSection) {
        router.push(completionHref);
      } else if (activeStep.nextSubstep) {
        navigateToStep(activeStep.nextSubstep);
      }
    }
  }

  async function retryDraftSave() {
    if (!editable) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const failed = failedSaveRef.current;
    await enqueueSave(
      failed?.mode ?? "draft_save",
      dataRef.current,
      failed?.guidedStepId ?? null
    );
  }

  function returnToLastSavedVersion() {
    if (
      !window.confirm(
        "Return to the last confirmed save? Entries made after that save will be removed from this view."
      )
    ) {
      return;
    }
    const confirmed = cloneRecord(lastSavedDataRef.current);
    dataRef.current = confirmed;
    setData(confirmed);
    setDirty(false);
    setIssues([]);
    failedSaveRef.current = null;
    setIndicator({
      kind: "idle",
      message: "Showing the last confirmed saved version."
    });
  }

  function guardUnsavedNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (
      dirty &&
      !window.confirm(
        "Some changes have not been saved yet. Leave this section anyway?"
      )
    ) {
      event.preventDefault();
    }
  }

  async function uploadAsset(
    category: OrganizationalAssetCategory,
    file: File,
    input: HTMLInputElement
  ) {
    if (
      !controlsEnabled ||
      assetOperationsRef.current.size > 0
    ) {
      return;
    }
    const definition = ONBOARDING_ASSET_DEFINITIONS.find(
      (candidate) => candidate.category === category
    );
    if (!definition) return;
    if (file.size > definition.maxBytes) {
      setAssetErrors((current) => ({
        ...current,
        [category]: `Choose a file no larger than ${formatBytes(
          definition.maxBytes
        )}.`
      }));
      input.value = "";
      return;
    }

    assetOperationsRef.current.add(category);
    setAssetBusyCategory(category);
    setAssetErrors((current) => ({ ...current, [category]: undefined }));
    const formData = new FormData();
    const fingerprint = `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
    const previousRequest = assetUploadRequestRef.current.get(category);
    const request =
      previousRequest?.fingerprint === fingerprint
        ? previousRequest
        : {
            fingerprint,
            requestId: crypto.randomUUID(),
            expectedWorkspaceVersion: workspaceVersionRef.current
          };
    assetUploadRequestRef.current.set(category, request);
    formData.set("requestId", request.requestId);
    formData.set(
      "expectedWorkspaceVersion",
      String(request.expectedWorkspaceVersion)
    );
    formData.set("category", category);
    formData.set("file", file);

    try {
      const response = await fetch("/api/partners/onboarding/assets", {
        method: "POST",
        body: formData
      });
      const payload = await readJsonObject(response);
      if (!response.ok || payload?.success !== true) {
        throw new Error(assetErrorMessage(response.status, payload));
      }

      const returnedAssets = parseAssets(payload.assets);
      const returnedAsset = parseAsset(payload.asset);
      if (returnedAssets) {
        setCurrentAssets(returnedAssets);
      } else if (returnedAsset) {
        setCurrentAssets((current) => [
          ...current.filter((asset) => asset.category !== returnedAsset.category),
          returnedAsset
        ]);
      } else {
        throw new Error(
          "The file was stored, but its saved details could not be displayed. Refresh this page."
        );
      }
      const workspaceVersion = numberValue(payload.workspaceVersion);
      if (workspaceVersion !== null) {
        workspaceVersionRef.current = workspaceVersion;
      }
      assetUploadRequestRef.current.delete(category);
    } catch (error) {
      setAssetErrors((current) => ({
        ...current,
        [category]:
          error instanceof Error
            ? error.message
            : "Could not upload this file."
      }));
    } finally {
      input.value = "";
      assetOperationsRef.current.delete(category);
      setAssetBusyCategory(null);
    }
  }

  async function deleteAsset(asset: OnboardingEditorAsset) {
    if (
      !controlsEnabled ||
      assetOperationsRef.current.size > 0
    ) {
      return;
    }
    if (
      !window.confirm(
        `Remove ${assetFileName(asset)}? This removes the current private onboarding asset.`
      )
    ) {
      return;
    }

    assetOperationsRef.current.add(asset.category);
    setAssetBusyCategory(asset.category);
    setAssetErrors((current) => ({
      ...current,
      [asset.category]: undefined
    }));
    try {
      const previousRequest = assetDeleteRequestRef.current.get(asset.id);
      const request =
        previousRequest ?? {
          requestId: crypto.randomUUID(),
          expectedWorkspaceVersion: workspaceVersionRef.current
        };
      assetDeleteRequestRef.current.set(asset.id, request);
      const response = await fetch(
        `/api/partners/onboarding/assets/${encodeURIComponent(asset.id)}`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requestId: request.requestId,
            expectedWorkspaceVersion: request.expectedWorkspaceVersion
          })
        }
      );
      const payload = await readJsonObject(response);
      if (!response.ok || payload?.success !== true) {
        throw new Error(assetErrorMessage(response.status, payload));
      }
      const returnedAssets = parseAssets(payload.assets);
      setCurrentAssets((current) =>
        returnedAssets ??
        current.filter((candidate) => candidate.id !== asset.id)
      );
      const workspaceVersion = numberValue(payload.workspaceVersion);
      if (workspaceVersion !== null) {
        workspaceVersionRef.current = workspaceVersion;
      }
      assetDeleteRequestRef.current.delete(asset.id);
    } catch (error) {
      setAssetErrors((current) => ({
        ...current,
        [asset.category]:
          error instanceof Error
            ? error.message
            : "Could not remove this file."
      }));
    } finally {
      assetOperationsRef.current.delete(asset.category);
      setAssetBusyCategory(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl text-[#071B33]">
      <header className="border-b-4 border-[#071B33] pb-6">
        <Link
          className="inline-flex min-h-11 items-center text-sm font-bold text-[#0A6E77] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2"
          href="/partner/onboarding#program-configuration"
          onClick={guardUnsavedNavigation}
        >
          Return to implementation center
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge
            tone={sectionBadgeTone(sectionStatus, changeRequestStatus)}
          >
            {changeRequestStatus === "open"
              ? "Changes requested"
              : changeRequestStatus === "partner_responded"
                ? "Updates submitted"
                : sectionStatusLabel(sectionStatus)}
          </Badge>
          {!canEdit &&
          !commercialBlocked &&
          !["approved", "waived", "not_applicable"].includes(sectionStatus) ? (
            <Badge>Editing locked</Badge>
          ) : null}
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-[#0A8E9A] [font-family:var(--font-rcap-mono)]">
          Program configuration | Section {guidedSectionIndex(sectionKey)} of 8
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-[#475A6E]">
          {purpose}
        </p>
      </header>

      <div className="sticky top-0 z-20 -mx-4 mt-5 border-y border-[#B8C1C7] bg-[#F7F4EE] px-4 py-3 lg:hidden">
        <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,auto)] sm:items-center sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
              {requestOverview
                ? "Requested update"
                : `Step ${activeStepIndex + 1} of ${guidedSection.substeps.length}`}
            </p>
            <p className="truncate text-sm font-extrabold text-[#071B33]">
              {requestOverview ? "LegalEase request" : activeStep.title}
            </p>
          </div>
          <SaveState indicator={indicator} compact />
        </div>
      </div>

      <div className="mt-7 grid min-w-0 gap-7 lg:grid-cols-[300px_minmax(0,1fr)]">
        <GuidedTaskRail
          activeStepId={activeStepId}
          changeRequestStatus={changeRequestStatus}
          issueFieldKeys={issues.map((issue) => issue.fieldKey)}
          onNavigate={navigateToStep}
          progress={progress}
          sectionKey={sectionKey}
          steps={guidedSection.substeps}
        />

        <div className="min-w-0">
          {commercialBlocked ? (
            <div
              className="mb-5 border-l-[6px] border-[#FF3B00] bg-white p-5"
              role="status"
              aria-labelledby="commercial-block-heading"
            >
              <h2 id="commercial-block-heading" className="font-extrabold text-[#071B33]">
                Setup is waiting on commercial clearance
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#475A6E]">
                You can review this task. Editing opens after LegalEase confirms
                the applicable commercial arrangement.
              </p>
            </div>
          ) : null}

          {conflictRevision !== null ? (
            <div
              className="mb-5 border-l-[6px] border-[#FF3B00] bg-white p-5"
              role="alert"
              aria-labelledby="revision-conflict-heading"
            >
              <h2 id="revision-conflict-heading" className="font-extrabold text-[#071B33]">
                A newer version of this section exists
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#475A6E]">
                Review the newer version before saving. Your entries remain in
                this view and did not overwrite revision {conflictRevision}.
              </p>
              <Button
                className="mt-4 min-h-11 rounded-none"
                onClick={() => window.location.reload()}
                type="button"
                variant="secondary"
              >
                Review newer version
              </Button>
            </div>
          ) : null}

          {issues.length > 0 ? (
            <ErrorSummary
              issues={issues}
              onNavigate={navigateToStep}
              sectionKey={sectionKey}
            />
          ) : null}

          {requestOverview ? (
            <GuidedChangeRequestPanel
              requests={changeRequests}
              sectionLevel
            />
          ) : (
            <form noValidate onSubmit={handleSaveAndContinue}>
              <section
                aria-labelledby="guided-task-heading"
                className="border border-[#B8C1C7] bg-white"
                data-guided-substep={activeStep.id}
              >
                <div className="border-b border-[#B8C1C7] p-5 md:p-7">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#0A8E9A] [font-family:var(--font-rcap-mono)]">
                        Step {activeStepIndex + 1} of {guidedSection.substeps.length}
                      </p>
                      <h2 className="mt-2 text-2xl font-extrabold text-[#071B33]" id="guided-task-heading">
                        {activeStep.title}
                      </h2>
                    </div>
                    <p className="text-xs font-bold text-[#475A6E] [font-family:var(--font-rcap-mono)]">
                      {activeStepProgress?.needsAttention
                        ? "Needs information"
                        : activeStepProgress?.complete
                          ? "Saved task"
                          : "Current task"}
                    </p>
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#475A6E]">
                    {activeStep.purpose}
                  </p>
                  <p className="mt-3 border-l-4 border-[#0A8E9A] pl-3 text-sm leading-6 text-[#071B33]">
                    After Save and Continue: {activeStep.outcome}
                  </p>
                </div>

                {activeStep.ownedFieldKeys.some((fieldKey) =>
                  pendingPrefillFieldKeys.some(
                    (pending) =>
                      guidedFieldRoot(pending) ===
                      guidedFieldRoot(String(fieldKey))
                  )
                ) ? (
                  <div className="border-b border-[#0A8E9A] bg-[#EEF7F6] p-5 text-sm leading-6 text-[#071B33] md:px-7">
                    <p className="font-bold">Review the pre-filled information in this task.</p>
                    <p className="mt-1 text-[#475A6E]">
                      Correct or clear anything that changed before continuing.
                    </p>
                  </div>
                ) : null}

                <div className="p-5 md:p-7">
                  <GuidedRenderContext.Provider value={guidedRenderValue}>
                    <PrefillFieldContext.Provider value={new Set(pendingPrefillFieldKeys)}>
                      <GuidedSurfaceContent
                        canonicalReferences={canonicalReferences}
                        sectionSummary={sectionSummary}
                        step={activeStep}
                      />
                      <SectionFields
                        assetBusyCategory={assetBusyCategory}
                        assetErrors={assetErrors}
                        assets={currentAssets}
                        canonicalReferences={canonicalReferences}
                        data={data}
                        deleteAsset={deleteAsset}
                        editable={controlsEnabled}
                        guardUnsavedNavigation={guardUnsavedNavigation}
                        issues={issues}
                        readOnlyValues={readOnlyValues}
                        sectionKey={sectionKey}
                        updateField={updateField}
                        uploadAsset={uploadAsset}
                      />
                    </PrefillFieldContext.Provider>
                  </GuidedRenderContext.Provider>
                </div>
              </section>

              <GuidedActionBar
                activeStep={activeStep}
                completing={completing}
                completionHref={completionHref}
                controlsEnabled={controlsEnabled}
                dirty={dirty}
                indicator={indicator}
                issueCount={issues.length}
                onNavigate={navigateToStep}
                onRetry={() => void retryDraftSave()}
                onReturnToSaved={returnToLastSavedVersion}
                sectionKey={sectionKey}
              />
            </form>
          )}

          {requestOverview ? (
            <div className="sticky bottom-0 z-10 mt-5 border border-[#B8C1C7] border-t-4 border-t-[#071B33] bg-[#F7F4EE] p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <p className="text-sm leading-6 text-[#475A6E]">
                  Review the request, then open the first task. The section-level
                  model does not identify one authoritative field.
                </p>
                <a
                  className="inline-flex min-h-12 items-center justify-center bg-[#FF3B00] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#D93400] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2"
                  data-primary-guided-action
                  href={guidedSectionHref(sectionKey, activeStep.id)}
                  onClick={(event) => {
                    event.preventDefault();
                    navigateToStep(activeStep.id);
                  }}
                >
                  Review section tasks
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function GuidedTaskRail({
  activeStepId,
  changeRequestStatus,
  issueFieldKeys,
  onNavigate,
  progress,
  sectionKey,
  steps
}: {
  activeStepId: string;
  changeRequestStatus: "open" | "partner_responded" | null;
  issueFieldKeys: string[];
  onNavigate: (stepId: string) => void;
  progress: Array<{ id: string; complete: boolean; needsAttention: boolean }>;
  sectionKey: OnboardingSectionKey;
  steps: readonly GuidedSubstepDefinition[];
}) {
  const issueSteps = new Set(
    issueFieldKeys
      .map((fieldKey) => guidedSubstepForField(sectionKey, fieldKey)?.id)
      .filter((stepId): stepId is string => Boolean(stepId))
  );
  return (
    <nav
      aria-label="Section tasks"
      className="hidden border border-[#B8C1C7] bg-white lg:sticky lg:top-6 lg:block lg:self-start"
    >
      <div className="border-b border-[#B8C1C7] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
          Section tasks
        </p>
      </div>
      <ol>
        {changeRequestStatus ? (
          <li className="border-b border-[#D8DDDF]">
            <GuidedStepLink
              active={activeStepId === SECTION_CHANGE_REQUEST_STEP}
              href={guidedSectionHref(sectionKey, SECTION_CHANGE_REQUEST_STEP)}
              label="LegalEase request"
              marker="CR"
              onActivate={() => onNavigate(SECTION_CHANGE_REQUEST_STEP)}
              state={
                changeRequestStatus === "open"
                  ? "Correction required"
                  : "Waiting on LegalEase"
              }
            />
          </li>
        ) : null}
        {steps.map((step, index) => {
          const state = progress.find((candidate) => candidate.id === step.id);
          return (
            <li className="border-b border-[#D8DDDF] last:border-b-0" key={step.id}>
              <GuidedStepLink
                active={activeStepId === step.id}
                href={guidedSectionHref(sectionKey, step.id)}
                label={step.title}
                marker={String(index + 1).padStart(2, "0")}
                onActivate={() => onNavigate(step.id)}
                state={
                  issueSteps.has(step.id)
                    ? "Review errors"
                    : state?.needsAttention
                      ? "Needs information"
                      : state?.complete
                        ? "Saved"
                        : "Not finished"
                }
              />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function GuidedStepLink({
  active,
  href,
  label,
  marker,
  onActivate,
  state
}: {
  active: boolean;
  href: string;
  label: string;
  marker: string;
  onActivate: () => void;
  state: string;
}) {
  return (
    <a
      aria-current={active ? "step" : undefined}
      className={`grid min-h-12 grid-cols-[32px_minmax(0,1fr)] gap-x-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#0A8E9A] ${
        active
          ? "border-l-4 border-[#FF3B00] bg-[#EEF7F6]"
          : "border-l-4 border-transparent hover:bg-[#F7F4EE]"
      }`}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onActivate();
      }}
    >
      <span className="text-xs font-bold text-[#0A8E9A] [font-family:var(--font-rcap-mono)]">
        {marker}
      </span>
      <span className="min-w-0">
        <span className="block break-words text-sm font-extrabold text-[#071B33]">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-[#475A6E]">{state}</span>
      </span>
    </a>
  );
}

function GuidedSurfaceContent({
  canonicalReferences,
  sectionSummary,
  step
}: {
  canonicalReferences: OnboardingCanonicalReference[];
  sectionSummary: OnboardingSectionEditorProps["sectionSummary"];
  step: GuidedSubstepDefinition;
}) {
  if (step.surface === "program_summary") {
    return (
      <div className="grid border border-[#B8C1C7] sm:grid-cols-2">
        <SummaryFact
          label="Sections with all required setup information"
          value={`${sectionSummary.completedSections} of ${sectionSummary.totalSections}`}
        />
        <SummaryFact
          label="Open partner changes"
          value={String(sectionSummary.openPartnerChanges)}
        />
      </div>
    );
  }
  if (step.surface === "exceptions") {
    return (
      <div className="grid gap-4">
        <div className="grid border border-[#B8C1C7] sm:grid-cols-2">
          <SummaryFact
            label="Partner corrections required"
            value={String(sectionSummary.openPartnerChanges)}
          />
          <SummaryFact
            label="Waiting on LegalEase"
            value={String(sectionSummary.waitingOnLegalEase)}
          />
        </div>
        <Link className={secondaryActionClass} href="/partner/onboarding/review">
          Open decision summary
        </Link>
      </div>
    );
  }
  if (step.surface === "private_preview") {
    return (
      <div className="border-l-4 border-[#0A8E9A] bg-[#EEF7F6] p-5">
        <h3 className="font-extrabold text-[#071B33]">Private preview handoff</h3>
        <p className="mt-2 text-sm leading-6 text-[#475A6E]">
          Saved brand information can be used in the authorized private preview.
          This task does not publish the page or activate participant intake.
        </p>
        <Link className={`${secondaryActionClass} mt-4`} href="/partner/onboarding/review">
          Review saved brand decisions
        </Link>
      </div>
    );
  }
  if (step.surface === "submission") {
    return (
      <div className="mb-6 border-l-4 border-[#0A8E9A] bg-[#EEF7F6] p-5">
        <h3 className="font-extrabold text-[#071B33]">Decision summary comes first</h3>
        <p className="mt-2 text-sm leading-6 text-[#475A6E]">
          Save this section, then open the final review to see decisions,
          exceptions, publication, activation, and the one current next action.
        </p>
      </div>
    );
  }
  if (step.surface === "canonical_reuse" && canonicalReferences.length === 0) {
    return (
      <p className="border-l-4 border-[#475A6E] pl-4 text-sm leading-6 text-[#475A6E]">
        No reusable public identity has been saved yet. Return to the source
        sections to provide it.
      </p>
    );
  }
  return null;
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#D8DDDF] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
        {label}
      </p>
      <p className="mt-2 text-xl font-extrabold text-[#071B33]">{value}</p>
    </div>
  );
}

function GuidedActionBar({
  activeStep,
  completing,
  completionHref,
  controlsEnabled,
  dirty,
  indicator,
  issueCount,
  onNavigate,
  onRetry,
  onReturnToSaved,
  sectionKey
}: {
  activeStep: GuidedSubstepDefinition;
  completing: boolean;
  completionHref: string;
  controlsEnabled: boolean;
  dirty: boolean;
  indicator: SaveIndicator;
  issueCount: number;
  onNavigate: (stepId: string) => void;
  onRetry: () => void;
  onReturnToSaved: () => void;
  sectionKey: OnboardingSectionKey;
}) {
  const backHref = activeStep.previousSubstep
    ? guidedSectionHref(sectionKey, activeStep.previousSubstep)
    : "/partner/onboarding#program-configuration";
  const nextHref = activeStep.nextSubstep
    ? guidedSectionHref(sectionKey, activeStep.nextSubstep)
    : completionHref;
  return (
    <div className="sticky bottom-0 z-10 mt-5 border border-[#B8C1C7] border-t-4 border-t-[#071B33] bg-[#F7F4EE] p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <SaveState indicator={indicator} />
          {indicator.kind === "error" &&
          indicator.recovery === "retry" &&
          issueCount === 0 ? (
            <div className="mt-2 flex flex-wrap gap-4">
              <button className={recoveryButtonClass} onClick={onRetry} type="button">
                Retry
              </button>
              {dirty ? (
                <button className={recoveryButtonClass} onClick={onReturnToSaved} type="button">
                  Return to last saved version
                </button>
              ) : null}
            </div>
          ) : null}
          {indicator.kind === "error" && indicator.recovery === "sign_in" ? (
            <Link
              className={`${recoveryButtonClass} mt-2`}
              href={`/sign-in?next=${encodeURIComponent(
                guidedSectionHref(sectionKey, activeStep.id)
              )}`}
            >
              Sign in again
            </Link>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <a
            className={secondaryActionClass}
            href={backHref}
            onClick={(event) => {
              if (!activeStep.previousSubstep) return;
              event.preventDefault();
              onNavigate(activeStep.previousSubstep);
            }}
          >
            {activeStep.previousSubstep ? "Back" : "Implementation center"}
          </a>
          {controlsEnabled ? (
            <button
              className="inline-flex min-h-12 items-center justify-center bg-[#FF3B00] px-6 py-3 text-sm font-extrabold text-white hover:bg-[#D93400] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
              data-primary-guided-action
              disabled={completing}
              type="submit"
            >
              {completing
                ? "Saving"
                : activeStep.nextSubstep
                  ? "Save and Continue"
                  : "Save section"}
            </button>
          ) : (
            <a
              className="inline-flex min-h-12 items-center justify-center bg-[#FF3B00] px-6 py-3 text-sm font-extrabold text-white hover:bg-[#D93400] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2"
              data-primary-guided-action
              href={nextHref}
              onClick={(event) => {
                if (!activeStep.nextSubstep) return;
                event.preventDefault();
                onNavigate(activeStep.nextSubstep);
              }}
            >
              {activeStep.nextSubstep ? "Continue" : "Return to implementation center"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveState({
  indicator,
  compact = false
}: {
  indicator: SaveIndicator;
  compact?: boolean;
}) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className={`${compact ? "sm:text-right" : ""} text-xs font-bold ${
        indicator.kind === "error" ? "text-[#C42E00]" : "text-[#475A6E]"
      } [font-family:var(--font-rcap-mono)]`}
      data-save-state={indicator.kind}
      role="status"
    >
      {indicator.message}
    </div>
  );
}

const secondaryActionClass =
  "inline-flex min-h-12 items-center justify-center border border-[#071B33] bg-white px-5 py-3 text-center text-sm font-extrabold text-[#071B33] hover:border-[#0A8E9A] hover:text-[#0A8E9A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2";
const recoveryButtonClass =
  "inline-flex min-h-11 items-center text-sm font-bold text-[#0A6E77] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2";

function SectionFields({
  sectionKey,
  ...props
}: FieldRendererProps & { sectionKey: OnboardingSectionKey }) {
  switch (sectionKey) {
    case "organization_contacts":
      return <OrganizationContactsFields {...props} />;
    case "program_goals":
      return <ProgramGoalsFields {...props} />;
    case "geography_audience_language_accessibility":
      return <GeographyFields {...props} />;
    case "access_sponsorship_capacity":
      return <AccessPlanFields {...props} />;
    case "brand_public_page":
      return <BrandFields {...props} />;
    case "staff_dashboard_plan":
      return <StaffPlanFields {...props} />;
    case "support_referrals_reporting":
      return <SupportReportingFields {...props} />;
    case "review_authorization":
      return <AuthorizationFields {...props} />;
  }
}

function sectionBadgeTone(
  status: OnboardingSectionStatus,
  changeRequestStatus: "open" | "partner_responded" | null
): "teal" | "blue" | "orange" | "neutral" {
  if (changeRequestStatus === "open" || status === "needs_changes") {
    return "orange";
  }
  if (
    changeRequestStatus === "partner_responded" ||
    status === "approved" ||
    status === "waived"
  ) {
    return "teal";
  }
  if (status === "in_progress" || status === "submitted") return "blue";
  return "neutral";
}

function OrganizationContactsFields(props: FieldRendererProps) {
  const contacts = objectRows(props.data.contacts);
  const setContacts = (next: Record<string, unknown>[]) =>
    props.updateField("contacts", next);
  const updateContact = (index: number, fieldKey: string, value: unknown) => {
    const next = contacts.map((contact, contactIndex) =>
      contactIndex === index ? { ...contact, [fieldKey]: value } : contact
    );
    setContacts(next);
  };

  return (
    <div className="grid gap-8">
      <FieldGroup
        title="Organization"
        description="Use the official name for agreements and the public names participants should see."
        fieldKeys={[
          "legal_organization_name",
          "public_organization_name",
          "organization_type",
          "website",
          "primary_address",
          "main_phone",
          "public_program_name",
          "partner_slug_preference"
        ]}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <TextField fieldKey="legal_organization_name" {...props} />
          <TextField fieldKey="public_organization_name" {...props} />
          <SelectField
            fieldKey="organization_type"
            options={ORGANIZATION_TYPES}
            {...props}
          />
          <TextField
            autoComplete="url"
            fieldKey="website"
            type="url"
            {...props}
          />
          <TextAreaField
            className="md:col-span-2"
            fieldKey="primary_address"
            {...props}
          />
          <TextField
            autoComplete="tel"
            fieldKey="main_phone"
            type="tel"
            {...props}
          />
          <TextField fieldKey="public_program_name" {...props} />
          <TextField
            className="md:col-span-2"
            fieldKey="partner_slug_preference"
            {...props}
          />
        </div>
      </FieldGroup>

      <FieldGroup
        title="Program contacts"
        description="These addresses record responsibilities only. Saving them does not send invitations."
        fieldKeys={["contacts"]}
      >
        <div className="grid gap-4" id={controlId("contacts")} tabIndex={-1}>
          <FieldIssueList
            fieldIssues={issuesForField(props.issues, "contacts")}
            id={controlId("contacts")}
          />
          {contacts.map((contact, index) => {
            const rowId = stringValue(contact.stable_row_id) || String(index);
            return (
              <Card
                className="border-grayWilma-200 bg-grayWilma-100/40 p-4 shadow-none"
                key={rowId}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-black">Contact {index + 1}</h3>
                  <Button
                    disabled={!props.editable}
                    onClick={() =>
                      setContacts(
                        contacts.filter(
                          (_candidate, candidateIndex) =>
                            candidateIndex !== index
                        )
                      )
                    }
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <RowSelectField
                    fieldKey="contacts[].role"
                    onChange={(value) => updateContact(index, "role", value)}
                    options={CONTACT_ROLES}
                    rowId={rowId}
                    value={contact.role}
                    {...props}
                  />
                  <RowTextField
                    fieldKey="contacts[].name"
                    onChange={(value) => updateContact(index, "name", value)}
                    rowId={rowId}
                    value={contact.name}
                    {...props}
                  />
                  <RowTextField
                    fieldKey="contacts[].title"
                    onChange={(value) => updateContact(index, "title", value)}
                    rowId={rowId}
                    value={contact.title}
                    {...props}
                  />
                  <RowTextField
                    fieldKey="contacts[].organization"
                    onChange={(value) =>
                      updateContact(index, "organization", value)
                    }
                    rowId={rowId}
                    value={contact.organization}
                    {...props}
                  />
                  <RowTextField
                    autoComplete="email"
                    fieldKey="contacts[].work_email"
                    onChange={(value) =>
                      updateContact(index, "work_email", value)
                    }
                    rowId={rowId}
                    type="email"
                    value={contact.work_email}
                    {...props}
                  />
                  <RowTextField
                    autoComplete="tel"
                    fieldKey="contacts[].phone"
                    onChange={(value) => updateContact(index, "phone", value)}
                    rowId={rowId}
                    type="tel"
                    value={contact.phone}
                    {...props}
                  />
                </div>
              </Card>
            );
          })}
          <Button
            className="min-h-11 justify-self-start"
            disabled={
              !props.editable ||
              contacts.length >= ONBOARDING_FIELD_LIMITS.arrayRows
            }
            onClick={() =>
              setContacts([
                ...contacts,
                {
                  stable_row_id: crypto.randomUUID(),
                  role: "",
                  name: "",
                  title: "",
                  organization: "",
                  work_email: "",
                  phone: ""
                }
              ])
            }
            type="button"
            variant="secondary"
          >
            Add contact
          </Button>
        </div>
      </FieldGroup>
    </div>
  );
}

function ProgramGoalsFields(props: FieldRendererProps) {
  const ongoing = booleanValue(props.data.ongoing);
  const knownBarriers = stringArrayValue(props.data.known_barriers);
  const barrierOptions = [
    "technology_access",
    "documentation",
    "transportation",
    "language",
    "community_trust",
    "legal_referral_capacity",
    "other"
  ];

  return (
    <div className="grid gap-8">
      <FieldGroup
        title="Goals and audience"
        description="Describe what the program should accomplish in concrete, plain language."
        fieldKeys={["primary_goal", "definition_of_success", "target_population"]}
      >
        <div className="grid gap-5">
          <TextAreaField fieldKey="primary_goal" {...props} />
          <TextAreaField fieldKey="definition_of_success" {...props} />
          <TextAreaField fieldKey="target_population" {...props} />
        </div>
      </FieldGroup>

      <FieldGroup
        title="Expected reach"
        description="Use your best planning estimate. These values do not change contracted allocations."
        fieldKeys={[
          "expected_screening_volume",
          "expected_screening_period",
          "expected_packet_volume",
          "expected_packet_period"
        ]}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <NumberField fieldKey="expected_screening_volume" {...props} />
          <TextField fieldKey="expected_screening_period" {...props} />
          <NumberField fieldKey="expected_packet_volume" {...props} />
          <TextField fieldKey="expected_packet_period" {...props} />
        </div>
      </FieldGroup>

      <FieldGroup
        fieldKeys={["program_model", "program_start_date", "ongoing", "program_end_date"]}
        title="Program timing and model"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <SelectField
            fieldKey="program_model"
            options={PROGRAM_MODELS}
            {...props}
          />
          <TextField
            fieldKey="program_start_date"
            type="date"
            {...props}
          />
          <BooleanField fieldKey="ongoing" {...props} />
          {!ongoing ? (
            <TextField
              fieldKey="program_end_date"
              type="date"
              {...props}
            />
          ) : null}
        </div>
      </FieldGroup>

      <FieldGroup
        title="Outreach, workflow, and barriers"
        description="Enter one outreach channel per line and identify barriers the operating plan should address."
        fieldKeys={[
          "outreach_channels",
          "current_workflow",
          "known_barriers",
          "known_barriers_other",
          "partner_side_outcome_tracking"
        ]}
      >
        <div className="grid gap-5">
          <LinesField fieldKey="outreach_channels" {...props} />
          <TextAreaField fieldKey="current_workflow" {...props} />
          <MultiCheckField
            fieldKey="known_barriers"
            options={barrierOptions}
            {...props}
          />
          {knownBarriers.includes("other") ? (
            <TextAreaField fieldKey="known_barriers_other" {...props} />
          ) : null}
          <TextAreaField
            fieldKey="partner_side_outcome_tracking"
            {...props}
          />
        </div>
      </FieldGroup>
    </div>
  );
}

function GeographyFields(props: FieldRendererProps) {
  const counties = stringArrayValue(props.data.counties);
  const spanishEnabled = booleanValue(props.data.enable_spanish);
  const jurisdictionSuggestions = referenceOptions(
    props.canonicalReferences,
    "jurisdictions"
  );

  return (
    <div className="grid gap-8">
      <FieldGroup
        title="Geography and service area"
        description="Jurisdictions configure the participant path. County settings support routing and reporting; they are not eligibility promises."
        fieldKeys={[
          "jurisdictions",
          "service_area_description",
          "counties",
          "default_county",
          "out_of_area_policy"
        ]}
      >
        <div className="grid gap-5">
          <LinesField
            fieldKey="jurisdictions"
            suggestions={jurisdictionSuggestions.map((option) => option.label)}
            {...props}
          />
          <TextAreaField fieldKey="service_area_description" {...props} />
          <LinesField fieldKey="counties" {...props} />
          {counties.length > 1 ? (
            <SelectField
              fieldKey="default_county"
              options={counties}
              {...props}
            />
          ) : counties.length === 1 ? (
            <ReadOnlyNotice
              label="Default county"
              value={counties[0]}
              helperCopy="A single-county program uses its only configured county by default."
            />
          ) : null}
          <SelectField
            fieldKey="out_of_area_policy"
            options={OUT_OF_AREA_POLICIES}
            {...props}
          />
        </div>
      </FieldGroup>

      <FieldGroup
        title="Language and accessibility"
        description="These settings configure the participant program experience; they do not change the language of this partner portal."
        fieldKeys={[
          "primary_language",
          "enable_spanish",
          "additional_languages",
          "accessibility_accommodations",
          "community_specific_terminology",
          "population_restrictions"
        ]}
      >
        <div className="grid gap-5">
          <TextField fieldKey="primary_language" {...props} />
          <BooleanField fieldKey="enable_spanish" {...props} />
          {spanishEnabled ? (
            <div className="rounded-md border border-teal/25 bg-teal/10 px-4 py-3 text-sm leading-6 text-grayWilma-800">
              Spanish participant-program configuration will be included in
              launch preparation. LegalEase will review translated controlled
              content separately.
            </div>
          ) : null}
          <LinesField fieldKey="additional_languages" {...props} />
          <TextAreaField
            fieldKey="accessibility_accommodations"
            {...props}
          />
          <TextAreaField
            fieldKey="community_specific_terminology"
            {...props}
          />
          <TextAreaField fieldKey="population_restrictions" {...props} />
        </div>
      </FieldGroup>
    </div>
  );
}

function AccessPlanFields(props: FieldRendererProps) {
  const accessModel = stringValue(props.data.participant_access_model);
  const requiresCodePlan =
    accessModel === "optional_code" ||
    accessModel === "required_code" ||
    accessModel === "invite_only";
  const overageReference = props.canonicalReferences.find(
    (reference) => reference.fieldKey === "overage_approver_contact_id"
  );
  const showOverageApprover =
    Boolean(overageReference) ||
    Boolean(stringValue(props.data.overage_approver_contact_id));

  return (
    <div className="grid gap-8">
      <FieldGroup
        title="Participant access plan"
        description="This records the intended access model only. No access code or invitation is created here."
        fieldKeys={[
          "participant_access_model",
          "code_structure",
          "code_source_groups",
          "code_expiration",
          "code_level_capacity",
          "overage_approver_contact_id"
        ]}
      >
        <SelectField
          fieldKey="participant_access_model"
          options={PARTICIPANT_ACCESS_MODELS}
          {...props}
        />
        {requiresCodePlan ? (
          <div className="mt-5 grid gap-5 rounded-lg border border-grayWilma-200 bg-grayWilma-100/40 p-4 md:grid-cols-2">
            <SelectField
              fieldKey="code_structure"
              options={ACCESS_CODE_STRUCTURES}
              {...props}
            />
            <LinesField fieldKey="code_source_groups" {...props} />
            <TextField fieldKey="code_expiration" type="date" {...props} />
            <NumberField fieldKey="code_level_capacity" {...props} />
            {showOverageApprover ? (
              <ReferenceSelectField
                fieldKey="overage_approver_contact_id"
                references={props.canonicalReferences}
                {...props}
              />
            ) : null}
          </div>
        ) : accessModel === "open" ? (
          <p className="mt-4 rounded-md border border-teal/25 bg-teal/10 px-4 py-3 text-sm leading-6 text-grayWilma-800">
            Participants can enter through the open program path. Code-planning
            fields are not active.
          </p>
        ) : null}
      </FieldGroup>

      <FieldGroup
        title="Capacity escalation"
        description="What happens as the program approaches its cap. This is your operating procedure; it does not change the contracted capacity."
        fieldKeys={[
          "capacity_escalation_procedure",
          "capacity_escalation_response_expectation"
        ]}
      >
        <div className="grid gap-5">
          <TextAreaField fieldKey="capacity_escalation_procedure" {...props} />
          <TextField
            fieldKey="capacity_escalation_response_expectation"
            {...props}
          />
        </div>
      </FieldGroup>

      <ReadOnlyValues
        description="Contract, billing, and provisioning records control these values. Partner edits cannot change them."
        title="Sponsored scope and capacity"
        values={props.readOnlyValues}
      />
    </div>
  );
}

function BrandFields(props: FieldRendererProps) {
  const canonicalPublicValues = props.canonicalReferences.filter(
    (reference) =>
      [
        "public_organization_name",
        "website",
        "public_program_name",
        "enable_spanish",
        "jurisdictions",
        "service_area_description"
      ].includes(reference.fieldKey) &&
      reference.value !== ""
  );

  return (
    <div className="grid gap-8">
      {canonicalPublicValues.length > 0 ? (
        <CanonicalReferenceValues
          onNavigate={props.guardUnsavedNavigation}
          values={canonicalPublicValues}
        />
      ) : null}

      <FieldGroup
        title="Approved public-page copy"
        description="Provide plain text approved by your organization. LegalEase-controlled legal and product language remains read-only."
        fieldKeys={[
          "approved_organization_description",
          "program_headline",
          "program_subheadline",
          "primary_cta_label",
          "participant_support_copy",
          "partner_privacy_url",
          "accessibility_url",
          "impact_reporting_url"
        ]}
      >
        <div className="grid gap-5">
          <TextAreaField
            fieldKey="approved_organization_description"
            {...props}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <TextField fieldKey="program_headline" {...props} />
            <TextField fieldKey="program_subheadline" {...props} />
            <TextField fieldKey="primary_cta_label" {...props} />
          </div>
          <TextAreaField fieldKey="participant_support_copy" {...props} />
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              fieldKey="partner_privacy_url"
              type="url"
              {...props}
            />
            <TextField
              fieldKey="accessibility_url"
              type="url"
              {...props}
            />
            <TextField
              fieldKey="impact_reporting_url"
              type="url"
              {...props}
            />
          </div>
        </div>
      </FieldGroup>

      <AssetFields {...props} />

      <FieldGroup
        title="LegalEase-controlled content"
        description="Legal disclaimers, self-help boundaries, eligibility and outcome claims, platform privacy and security statements, payment logic, participant routing, and LegalEase legal links are reviewed and controlled by LegalEase."
        surface="private_preview"
      >
        <div className="rounded-md border border-grayWilma-200 bg-grayWilma-100 px-4 py-3 text-sm font-semibold leading-6 text-grayWilma-700">
          These items are not editable in partner onboarding.
        </div>
      </FieldGroup>
    </div>
  );
}

function StaffPlanFields(props: FieldRendererProps) {
  const users = objectRows(props.data.planned_users);
  const setUsers = (next: Record<string, unknown>[]) =>
    props.updateField("planned_users", next);
  const updateUser = (index: number, fieldKey: string, value: unknown) => {
    setUsers(
      users.map((user, userIndex) =>
        userIndex === index ? { ...user, [fieldKey]: value } : user
      )
    );
  };
  const userOptions = users.map((user, index) => ({
    id: stringValue(user.stable_row_id),
    label: stringValue(user.name) || `Planned user ${index + 1}`,
    detail: stringValue(user.work_email)
  }));

  return (
    <div className="grid gap-8">
      <FieldGroup
        title="Planned dashboard users"
        description="This is an access plan only. Saving it does not create a membership or send an invitation."
        fieldKeys={["planned_users"]}
      >
        <div
          className="grid gap-4"
          id={controlId("planned_users")}
          tabIndex={-1}
        >
          <FieldIssueList
            fieldIssues={issuesForField(props.issues, "planned_users")}
            id={controlId("planned_users")}
          />
          {users.map((user, index) => {
            const rowId = stringValue(user.stable_row_id) || String(index);
            return (
              <Card
                className="border-grayWilma-200 bg-grayWilma-100/40 p-4 shadow-none"
                key={rowId}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-black">Planned user {index + 1}</h3>
                  <Button
                    disabled={!props.editable}
                    onClick={() =>
                      setUsers(
                        users.filter(
                          (_candidate, candidateIndex) =>
                            candidateIndex !== index
                        )
                      )
                    }
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <RowTextField
                    fieldKey="planned_users[].name"
                    onChange={(value) => updateUser(index, "name", value)}
                    rowId={rowId}
                    value={user.name}
                    {...props}
                  />
                  <RowTextField
                    autoComplete="email"
                    fieldKey="planned_users[].work_email"
                    onChange={(value) =>
                      updateUser(index, "work_email", value)
                    }
                    rowId={rowId}
                    type="email"
                    value={user.work_email}
                    {...props}
                  />
                  <RowSelectField
                    fieldKey="planned_users[].requested_role"
                    onChange={(value) =>
                      updateUser(index, "requested_role", value)
                    }
                    options={REQUESTED_DASHBOARD_ROLES}
                    rowId={rowId}
                    value={user.requested_role}
                    {...props}
                  />
                  <RowBooleanField
                    fieldKey="planned_users[].training_attendee"
                    onChange={(value) =>
                      updateUser(index, "training_attendee", value)
                    }
                    rowId={rowId}
                    value={user.training_attendee}
                    {...props}
                  />
                  <RowMultiCheckField
                    className="md:col-span-2"
                    fieldKey="planned_users[].special_permissions"
                    onChange={(value) =>
                      updateUser(index, "special_permissions", value)
                    }
                    options={DASHBOARD_SPECIAL_PERMISSIONS}
                    rowId={rowId}
                    value={user.special_permissions}
                    {...props}
                  />
                </div>
              </Card>
            );
          })}
          <Button
            className="min-h-11 justify-self-start"
            disabled={
              !props.editable ||
              users.length >= ONBOARDING_FIELD_LIMITS.arrayRows
            }
            onClick={() =>
              setUsers([
                ...users,
                {
                  stable_row_id: crypto.randomUUID(),
                  name: "",
                  work_email: "",
                  requested_role: "",
                  special_permissions: [],
                  training_attendee: false
                }
              ])
            }
            type="button"
            variant="secondary"
          >
            Add planned user
          </Button>
        </div>
      </FieldGroup>

      <FieldGroup
        title="Access responsibilities"
        description="Choose the planned administrator and the roles responsible for recurring access tasks."
        fieldKeys={[
          "primary_dashboard_administrator_row_id",
          "user_invitation_authority_role",
          "code_management_authority_role",
          "report_export_authority_role",
          "access_review_frequency"
        ]}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <OptionReferenceField
            fieldKey="primary_dashboard_administrator_row_id"
            options={userOptions}
            {...props}
          />
          <SelectField
            fieldKey="user_invitation_authority_role"
            options={REQUESTED_DASHBOARD_ROLES}
            {...props}
          />
          <SelectField
            fieldKey="code_management_authority_role"
            options={REQUESTED_DASHBOARD_ROLES}
            {...props}
          />
          <SelectField
            fieldKey="report_export_authority_role"
            options={REQUESTED_DASHBOARD_ROLES}
            {...props}
          />
          <TextField fieldKey="access_review_frequency" {...props} />
        </div>
      </FieldGroup>

      <ReadOnlyValues
        description="Training, invitation, and membership truth comes from LegalEase systems. This plan cannot activate an account."
        title="Current implementation status"
        values={props.readOnlyValues}
      />
    </div>
  );
}

function SupportReportingFields(props: FieldRendererProps) {
  const recipients = objectRows(props.data.report_recipients);
  const setRecipients = (next: Record<string, unknown>[]) =>
    props.updateField("report_recipients", next);
  const updateRecipient = (
    index: number,
    fieldKey: string,
    value: unknown
  ) => {
    setRecipients(
      recipients.map((recipient, recipientIndex) =>
        recipientIndex === index
          ? { ...recipient, [fieldKey]: value }
          : recipient
      )
    );
  };

  return (
    <div className="grid gap-8">
      <FieldGroup
        fieldKeys={[
          "participant_support_email",
          "participant_support_phone",
          "partner_staff_support_contact_id",
          "urgent_escalation_contact_id"
        ]}
        title="Participant and staff support"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            autoComplete="email"
            fieldKey="participant_support_email"
            type="email"
            {...props}
          />
          <TextField
            autoComplete="tel"
            fieldKey="participant_support_phone"
            type="tel"
            {...props}
          />
          <ReferenceSelectField
            fieldKey="partner_staff_support_contact_id"
            references={props.canonicalReferences}
            {...props}
          />
          <ReferenceSelectField
            fieldKey="urgent_escalation_contact_id"
            references={props.canonicalReferences}
            {...props}
          />
        </div>
      </FieldGroup>

      <FieldGroup
        title="Legal referral and escalation"
        description="When a prosecutor objects, a contested hearing is scheduled, or individualized legal advocacy is required, the self-help path must stop and this approved referral process applies."
        fieldKeys={[
          "legal_services_referral_organization",
          "referral_intake_method",
          "referral_intake_details",
          "contested_matter_procedure"
        ]}
      >
        <div className="grid gap-5">
          <TextField
            fieldKey="legal_services_referral_organization"
            {...props}
          />
          <TextField fieldKey="referral_intake_method" {...props} />
          <TextAreaField fieldKey="referral_intake_details" {...props} />
          <TextAreaField fieldKey="contested_matter_procedure" {...props} />
        </div>
      </FieldGroup>

      <FieldGroup
        title="Escalation routes, owners, and response expectations"
        description="The Operations and Escalation Plan names each of these routes with the person who owns it and how quickly they respond. Anything left blank is shown in the plan as a named gap rather than filled in for you."
        fieldKeys={[
          "participant_support_response_expectation",
          "referral_response_expectation",
          "contested_matter_response_expectation",
          "media_inquiry_response_expectation",
          "privacy_request_route",
          "privacy_request_owner_contact_id",
          "privacy_request_response_expectation",
          "security_concern_route",
          "security_concern_response_expectation",
          "program_pause_route",
          "program_pause_authority_contact_id",
          "program_pause_response_expectation"
        ]}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            fieldKey="participant_support_response_expectation"
            {...props}
          />
          <TextField fieldKey="referral_response_expectation" {...props} />
          <TextField
            fieldKey="contested_matter_response_expectation"
            {...props}
          />
          <TextField
            fieldKey="media_inquiry_response_expectation"
            {...props}
          />
        </div>
        <div className="mt-5 grid gap-5">
          <TextAreaField fieldKey="privacy_request_route" {...props} />
          <div className="grid gap-5 md:grid-cols-2">
            <ReferenceSelectField
              fieldKey="privacy_request_owner_contact_id"
              references={props.canonicalReferences}
              {...props}
            />
            <TextField
              fieldKey="privacy_request_response_expectation"
              {...props}
            />
          </div>
          <TextAreaField fieldKey="security_concern_route" {...props} />
          <TextField
            fieldKey="security_concern_response_expectation"
            {...props}
          />
          <TextAreaField fieldKey="program_pause_route" {...props} />
          <div className="grid gap-5 md:grid-cols-2">
            <ReferenceSelectField
              fieldKey="program_pause_authority_contact_id"
              references={props.canonicalReferences}
              {...props}
            />
            <TextField
              fieldKey="program_pause_response_expectation"
              {...props}
            />
          </div>
        </div>
      </FieldGroup>

      <FieldGroup
        title="Reporting recipients"
        description="These rows define intended report delivery only; saving them sends nothing."
        fieldKeys={["report_recipients"]}
      >
        <div
          className="grid gap-4"
          id={controlId("report_recipients")}
          tabIndex={-1}
        >
          <FieldIssueList
            fieldIssues={issuesForField(props.issues, "report_recipients")}
            id={controlId("report_recipients")}
          />
          {recipients.map((recipient, index) => {
            const rowId =
              stringValue(recipient.stable_row_id) || String(index);
            return (
              <Card
                className="border-grayWilma-200 bg-grayWilma-100/40 p-4 shadow-none"
                key={rowId}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-black">Recipient {index + 1}</h3>
                  <Button
                    disabled={!props.editable}
                    onClick={() =>
                      setRecipients(
                        recipients.filter(
                          (_candidate, candidateIndex) =>
                            candidateIndex !== index
                        )
                      )
                    }
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <RowTextField
                    fieldKey="report_recipients[].name"
                    onChange={(value) =>
                      updateRecipient(index, "name", value)
                    }
                    rowId={rowId}
                    value={recipient.name}
                    {...props}
                  />
                  <RowTextField
                    autoComplete="email"
                    fieldKey="report_recipients[].work_email"
                    onChange={(value) =>
                      updateRecipient(index, "work_email", value)
                    }
                    rowId={rowId}
                    type="email"
                    value={recipient.work_email}
                    {...props}
                  />
                </div>
              </Card>
            );
          })}
          <Button
            className="min-h-11 justify-self-start"
            disabled={
              !props.editable ||
              recipients.length >= ONBOARDING_FIELD_LIMITS.arrayRows
            }
            onClick={() =>
              setRecipients([
                ...recipients,
                {
                  stable_row_id: crypto.randomUUID(),
                  name: "",
                  work_email: ""
                }
              ])
            }
            type="button"
            variant="secondary"
          >
            Add report recipient
          </Button>
        </div>
      </FieldGroup>

      <FieldGroup
        fieldKeys={[
          "reporting_cadence",
          "funder_required_metrics",
          "data_use_restrictions",
          "external_outcome_data_description"
        ]}
        title="Reporting plan"
      >
        <div className="grid gap-5">
          <TextField fieldKey="reporting_cadence" {...props} />
          <LinesField fieldKey="funder_required_metrics" {...props} />
          <LinesField fieldKey="data_use_restrictions" {...props} />
          <TextAreaField
            fieldKey="external_outcome_data_description"
            {...props}
          />
        </div>
      </FieldGroup>

      <ReadOnlyValues
        title="LegalEase technical support"
        values={props.readOnlyValues}
      />
    </div>
  );
}

function AuthorizationFields(props: FieldRendererProps) {
  const acknowledgements = [
    "organization_information_accurate",
    "program_scope_approved_for_configuration",
    "brand_assets_authorized_for_use",
    "no_eligibility_or_outcome_guarantee_understood",
    "contested_and_representation_matters_follow_escalation_plan",
    "dashboard_users_authorized",
    "legalease_may_prepare_draft_implementation_materials"
  ];

  return (
    <div className="grid gap-8">
      <FieldGroup
        title="Required acknowledgments"
        description="Review each statement carefully. These acknowledgments authorize implementation preparation; they are not an e-signature or a replacement for an agreement."
        fieldKeys={acknowledgements}
      >
        <div className="grid gap-3">
          {acknowledgements.map((fieldKey) => (
            <BooleanField fieldKey={fieldKey} key={fieldKey} {...props} />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup fieldKeys={["approver_name", "approver_title"]} title="Authorized approver">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            autoComplete="name"
            fieldKey="approver_name"
            {...props}
          />
          <TextField fieldKey="approver_title" {...props} />
        </div>
      </FieldGroup>

      <ReadOnlyValues
        description="The authenticated user, work email, server timestamp, and schema version are recorded by the server at final submission."
        title="Submission audit details"
        values={props.readOnlyValues}
      />
    </div>
  );
}

function AssetFields(props: FieldRendererProps) {
  const procurementRequired =
    props.assets.some((asset) => asset.category === "procurement_document") ||
    props.readOnlyValues.some(
      (value) =>
        value.fieldKey === "procurement_required" &&
        isAffirmativeDisplayValue(value.value)
    );
  const activeDefinitions = ONBOARDING_ASSET_DEFINITIONS.filter(
    (definition) =>
      definition.category !== "procurement_document" || procurementRequired
  );

  return (
    <FieldGroup
      title="Private organizational assets"
      description="Files remain private. Upload only approved organization, brand, and requested procurement materials. Never upload participant or case files."
      surface="private_assets"
    >
      <div className="grid gap-4">
        {activeDefinitions.map((definition) => {
          const asset = props.assets.find(
            (candidate) => candidate.category === definition.category
          );
          const busy = props.assetBusyCategory !== null;
          const error = props.assetErrors[definition.category];
          const inputId = `asset-${definition.category}`;
          return (
            <Card
              className="grid gap-4 border-grayWilma-200 p-4 shadow-none md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              data-asset-category={definition.category}
              key={definition.category}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black">{definition.label}</h3>
                  {definition.requirement === "required" ? (
                    <Badge tone="orange">Required</Badge>
                  ) : (
                    <Badge>
                      {definition.requirement === "conditional"
                        ? "When requested"
                        : "Optional"}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs leading-5 text-grayWilma-600">
                  {definition.allowedExtensions
                    .map((extension) => extension.toUpperCase())
                    .join(", ")}{" "}
                  · up to {formatBytes(definition.maxBytes)}
                </p>

                {asset ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-grayWilma-100 p-3">
                    {assetPreviewHref(asset) && isImageAsset(asset) ? (
                      <Image
                        alt={`Preview of ${definition.label}`}
                        className="h-16 w-28 rounded-md border border-grayWilma-200 bg-white object-contain"
                        height={64}
                        src={assetPreviewHref(asset)}
                        unoptimized
                        width={112}
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {assetFileName(asset)}
                      </p>
                      <p className="text-xs text-grayWilma-600">
                        {formatBytes(assetByteSize(asset))}
                        {assetLifecycleStatus(asset)
                          ? ` | ${onboardingOptionLabel(assetLifecycleStatus(asset))}`
                          : " | Private"}
                      </p>
                      {assetDownloadHref(asset) ? (
                        <a
                          className="mt-1 inline-flex min-h-8 items-center text-xs font-bold text-teal underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                          href={assetDownloadHref(asset)}
                          rel="noopener noreferrer"
                        >
                          Download private file
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-grayWilma-600">
                    No current file.
                  </p>
                )}

                {error ? (
                  <p
                    className="mt-2 text-sm font-semibold text-orange"
                    id={`${inputId}-error`}
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                <label
                  className={`inline-flex min-h-11 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-4 py-2 text-sm font-semibold transition ${
                    props.editable && !busy
                      ? "cursor-pointer text-navy hover:bg-grayWilma-100 focus-within:ring-2 focus-within:ring-teal focus-within:ring-offset-2"
                      : "cursor-not-allowed text-grayWilma-500 opacity-60"
                  }`}
                  htmlFor={inputId}
                >
                  {busy
                    ? "Working…"
                    : asset
                      ? "Replace file"
                      : "Choose file"}
                  <input
                    accept={definition.allowedExtensions
                      .map((extension) => `.${extension}`)
                      .join(",")}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    className="sr-only"
                    disabled={!props.editable || busy}
                    id={inputId}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) {
                        void props.uploadAsset(
                          definition.category,
                          file,
                          event.currentTarget
                        );
                      }
                    }}
                    type="file"
                  />
                </label>
                {asset ? (
                  <Button
                    disabled={!props.editable || busy}
                    onClick={() => void props.deleteAsset(asset)}
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </FieldGroup>
  );
}

function FieldGroup({
  title,
  description,
  children,
  fieldKeys,
  surface
}: {
  title: string;
  description?: string;
  children: ReactNode;
  fieldKeys?: readonly string[];
  surface?: GuidedSubstepSurface;
}) {
  const guided = useContext(GuidedRenderContext);
  const visible =
    !guided ||
    (surface ? guided.activeSurface === surface : false) ||
    (fieldKeys
      ? fieldKeys.some((fieldKey) =>
          substepOwnsField(guided.activeStep, fieldKey)
        )
      : !surface);
  if (!visible) return null;
  return (
    <section>
      <h3 className="text-xl font-extrabold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-3xl text-sm leading-6 text-grayWilma-600">
          {description}
        </p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TextField({
  fieldKey,
  data,
  updateField,
  ...props
}: FieldRendererProps & {
  fieldKey: string;
  type?: "text" | "email" | "tel" | "url" | "date";
  autoComplete?: string;
  className?: string;
}) {
  return (
    <RowTextField
      fieldKey={fieldKey}
      onChange={(value) => updateField(fieldKey, value)}
      value={data[fieldKey]}
      {...props}
    />
  );
}

function RowTextField({
  fieldKey,
  value,
  onChange,
  editable,
  issues,
  rowId,
  type = "text",
  autoComplete,
  className
}: Pick<FieldRendererProps, "editable" | "issues"> & {
  fieldKey: string;
  value: unknown;
  onChange: (value: string) => void;
  rowId?: string;
  type?: "text" | "email" | "tel" | "url" | "date";
  autoComplete?: string;
  className?: string;
}) {
  const metadata = fieldMetadata(fieldKey);
  const id = controlId(fieldKey, rowId);
  const fieldIssues = issuesForField(issues, fieldKey, rowId);
  return (
    <FieldFrame
      className={className}
      fieldKey={fieldKey}
      fieldIssues={fieldIssues}
      helperCopy={metadata?.helperCopy}
      id={id}
      label={metadata?.label ?? "Onboarding information"}
      required={metadata?.requirement !== "optional"}
    >
      <input
        aria-describedby={describedBy(id, metadata?.helperCopy, fieldIssues)}
        aria-invalid={fieldIssues.length > 0}
        autoComplete={autoComplete}
        className={inputClassName}
        disabled={!editable}
        id={id}
        maxLength={metadata?.maxLength}
        onChange={(event) => onChange(event.currentTarget.value)}
        type={type}
        value={stringValue(value)}
      />
    </FieldFrame>
  );
}

function NumberField({
  fieldKey,
  data,
  updateField,
  editable,
  issues
}: FieldRendererProps & { fieldKey: string }) {
  const metadata = fieldMetadata(fieldKey);
  const id = controlId(fieldKey);
  const fieldIssues = issuesForField(issues, fieldKey);
  const value = data[fieldKey];
  return (
    <FieldFrame
      fieldKey={fieldKey}
      fieldIssues={fieldIssues}
      helperCopy={metadata?.helperCopy}
      id={id}
      label={metadata?.label ?? "Onboarding information"}
      required={metadata?.requirement !== "optional"}
    >
      <input
        aria-describedby={describedBy(id, metadata?.helperCopy, fieldIssues)}
        aria-invalid={fieldIssues.length > 0}
        className={inputClassName}
        disabled={!editable}
        id={id}
        inputMode="numeric"
        min={0}
        onChange={(event) =>
          updateField(
            fieldKey,
            event.currentTarget.value === ""
              ? undefined
              : Number(event.currentTarget.value)
          )
        }
        step={1}
        type="number"
        value={typeof value === "number" ? value : ""}
      />
    </FieldFrame>
  );
}

function TextAreaField({
  fieldKey,
  data,
  updateField,
  editable,
  issues,
  className
}: FieldRendererProps & { fieldKey: string; className?: string }) {
  const metadata = fieldMetadata(fieldKey);
  const id = controlId(fieldKey);
  const fieldIssues = issuesForField(issues, fieldKey);
  return (
    <FieldFrame
      className={className}
      fieldKey={fieldKey}
      fieldIssues={fieldIssues}
      helperCopy={metadata?.helperCopy}
      id={id}
      label={metadata?.label ?? "Onboarding information"}
      required={metadata?.requirement !== "optional"}
    >
      <textarea
        aria-describedby={describedBy(id, metadata?.helperCopy, fieldIssues)}
        aria-invalid={fieldIssues.length > 0}
        className={textareaClassName}
        disabled={!editable}
        id={id}
        maxLength={metadata?.maxLength}
        onChange={(event) =>
          updateField(fieldKey, event.currentTarget.value)
        }
        value={stringValue(data[fieldKey])}
      />
    </FieldFrame>
  );
}

function SelectField({
  fieldKey,
  options,
  data,
  updateField,
  ...props
}: FieldRendererProps & {
  fieldKey: string;
  options: readonly string[];
}) {
  return (
    <RowSelectField
      fieldKey={fieldKey}
      onChange={(value) => updateField(fieldKey, value)}
      options={options}
      value={data[fieldKey]}
      {...props}
    />
  );
}

function RowSelectField({
  fieldKey,
  options,
  value,
  onChange,
  editable,
  issues,
  rowId
}: Pick<FieldRendererProps, "editable" | "issues"> & {
  fieldKey: string;
  options: readonly string[];
  value: unknown;
  onChange: (value: string) => void;
  rowId?: string;
}) {
  const metadata = fieldMetadata(fieldKey);
  const id = controlId(fieldKey, rowId);
  const fieldIssues = issuesForField(issues, fieldKey, rowId);
  return (
    <FieldFrame
      fieldKey={fieldKey}
      fieldIssues={fieldIssues}
      helperCopy={metadata?.helperCopy}
      id={id}
      label={metadata?.label ?? "Onboarding information"}
      required={metadata?.requirement !== "optional"}
    >
      <select
        aria-describedby={describedBy(id, metadata?.helperCopy, fieldIssues)}
        aria-invalid={fieldIssues.length > 0}
        className={inputClassName}
        disabled={!editable}
        id={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={stringValue(value)}
      >
        <option value="">Choose an option</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {onboardingOptionLabel(option)}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

function BooleanField({
  fieldKey,
  data,
  updateField,
  ...props
}: FieldRendererProps & { fieldKey: string }) {
  return (
    <RowBooleanField
      fieldKey={fieldKey}
      onChange={(value) => updateField(fieldKey, value)}
      value={data[fieldKey]}
      {...props}
    />
  );
}

function RowBooleanField({
  fieldKey,
  value,
  onChange,
  editable,
  issues,
  rowId
}: Pick<FieldRendererProps, "editable" | "issues"> & {
  fieldKey: string;
  value: unknown;
  onChange: (value: boolean) => void;
  rowId?: string;
}) {
  const visible = useGuidedFieldVisibility(fieldKey);
  const metadata = fieldMetadata(fieldKey);
  const id = controlId(fieldKey, rowId);
  const fieldIssues = issuesForField(issues, fieldKey, rowId);
  if (!visible) return null;
  return (
    <div
      className="border border-[#B8C1C7] bg-white p-4"
      data-guided-field={guidedFieldRoot(fieldKey)}
    >
      <label className="flex min-h-11 cursor-pointer items-start gap-3" htmlFor={id}>
        <input
          aria-describedby={describedBy(id, metadata?.helperCopy, fieldIssues)}
          aria-invalid={fieldIssues.length > 0}
          checked={booleanValue(value)}
          className="mt-1 h-5 w-5 shrink-0 accent-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
          disabled={!editable}
          id={id}
          onChange={(event) => onChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>
          <span className="text-sm font-black">
            {metadata?.label ?? "Onboarding information"}
            {metadata?.requirement !== "optional" ? (
              <span className="ml-1 text-orange" aria-hidden="true">
                *
              </span>
            ) : null}
          </span>
          {metadata?.helperCopy ? (
            <span
              className="mt-1 block text-xs leading-5 text-grayWilma-600"
              id={`${id}-help`}
            >
              {metadata.helperCopy}
            </span>
          ) : null}
        </span>
      </label>
      <FieldIssueList fieldIssues={fieldIssues} id={id} />
    </div>
  );
}

function LinesField({
  fieldKey,
  data,
  updateField,
  editable,
  issues,
  suggestions = []
}: FieldRendererProps & {
  fieldKey: string;
  suggestions?: string[];
}) {
  const metadata = fieldMetadata(fieldKey);
  const id = controlId(fieldKey);
  const fieldIssues = issuesForField(issues, fieldKey);
  const canonicalValue = stringArrayValue(data[fieldKey]).join("\n");
  const [draftValue, setDraftValue] = useState(canonicalValue);
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) setDraftValue(canonicalValue);
  }, [canonicalValue]);

  return (
    <FieldFrame
      fieldKey={fieldKey}
      fieldIssues={fieldIssues}
      helperCopy={
        metadata?.helperCopy ??
        "Enter one item per line. Duplicate entries are removed when saved."
      }
      id={id}
      label={metadata?.label ?? "Onboarding information"}
      required={metadata?.requirement !== "optional"}
    >
      <textarea
        aria-describedby={describedBy(
          id,
          metadata?.helperCopy ??
            "Enter one item per line. Duplicate entries are removed when saved.",
          fieldIssues
        )}
        aria-invalid={fieldIssues.length > 0}
        className={textareaClassName}
        disabled={!editable}
        id={id}
        onBlur={() => {
          editingRef.current = false;
          setDraftValue(
            stringArrayValue(data[fieldKey]).join("\n")
          );
        }}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          setDraftValue(nextValue);
          updateField(fieldKey, parseLineValues(nextValue));
        }}
        onFocus={() => {
          editingRef.current = true;
        }}
        placeholder={
          suggestions.length > 0
            ? `For example:\n${suggestions.slice(0, 3).join("\n")}`
            : undefined
        }
        value={draftValue}
      />
    </FieldFrame>
  );
}

function MultiCheckField({
  fieldKey,
  options,
  data,
  updateField,
  ...props
}: FieldRendererProps & {
  fieldKey: string;
  options: readonly string[];
}) {
  return (
    <RowMultiCheckField
      fieldKey={fieldKey}
      onChange={(value) => updateField(fieldKey, value)}
      options={options}
      value={data[fieldKey]}
      {...props}
    />
  );
}

function RowMultiCheckField({
  fieldKey,
  options,
  value,
  onChange,
  editable,
  issues,
  rowId,
  className
}: Pick<FieldRendererProps, "editable" | "issues"> & {
  fieldKey: string;
  options: readonly string[];
  value: unknown;
  onChange: (value: string[]) => void;
  rowId?: string;
  className?: string;
}) {
  const visible = useGuidedFieldVisibility(fieldKey);
  const metadata = fieldMetadata(fieldKey);
  const id = controlId(fieldKey, rowId);
  const selected = stringArrayValue(value);
  const fieldIssues = issuesForField(issues, fieldKey, rowId);
  if (!visible) return null;
  return (
    <fieldset
      aria-describedby={describedBy(id, metadata?.helperCopy, fieldIssues)}
      className={className}
      data-guided-field={guidedFieldRoot(fieldKey)}
    >
      <legend className="text-sm font-black">
        {metadata?.label ?? "Onboarding information"}
        {metadata?.requirement !== "optional" ? (
          <span className="ml-1 text-orange" aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      {metadata?.helperCopy ? (
        <p className="mt-1 text-xs leading-5 text-grayWilma-600" id={`${id}-help`}>
          {metadata.helperCopy}
        </p>
      ) : null}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const optionId = `${id}-${slugify(option)}`;
          return (
            <label
              className="flex min-h-11 items-center gap-3 rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm font-semibold"
              htmlFor={optionId}
              key={option}
            >
              <input
                checked={selected.includes(option)}
                className="h-5 w-5 accent-teal"
                disabled={!editable}
                id={optionId}
                onChange={(event) =>
                  onChange(
                    event.currentTarget.checked
                      ? [...selected, option]
                      : selected.filter((item) => item !== option)
                  )
                }
                type="checkbox"
              />
              {onboardingOptionLabel(option)}
            </label>
          );
        })}
      </div>
      <FieldIssueList fieldIssues={fieldIssues} id={id} />
    </fieldset>
  );
}

function ReferenceSelectField({
  fieldKey,
  references,
  ...props
}: FieldRendererProps & {
  fieldKey: string;
  references: OnboardingCanonicalReference[];
}) {
  return (
    <OptionReferenceField
      fieldKey={fieldKey}
      options={referenceOptions(references, fieldKey)}
      {...props}
    />
  );
}

function OptionReferenceField({
  fieldKey,
  options,
  data,
  updateField,
  editable,
  issues
}: FieldRendererProps & {
  fieldKey: string;
  options: Array<{ id: string; label: string; detail?: string }>;
}) {
  const metadata = fieldMetadata(fieldKey);
  const id = controlId(fieldKey);
  const value = stringValue(data[fieldKey]);
  const fieldIssues = issuesForField(issues, fieldKey);
  return (
    <FieldFrame
      fieldKey={fieldKey}
      fieldIssues={fieldIssues}
      helperCopy={metadata?.helperCopy}
      id={id}
      label={metadata?.label ?? "Onboarding information"}
      required={metadata?.requirement !== "optional"}
    >
      <select
        aria-describedby={describedBy(id, metadata?.helperCopy, fieldIssues)}
        aria-invalid={fieldIssues.length > 0}
        className={inputClassName}
        disabled={!editable}
        id={id}
        onChange={(event) =>
          updateField(fieldKey, event.currentTarget.value)
        }
        value={value}
      >
        <option value="">Choose a person</option>
        {value && !options.some((option) => option.id === value) ? (
          <option value={value}>Current saved selection</option>
        ) : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
            {option.detail ? ` | ${option.detail}` : ""}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}

function FieldFrame({
  id,
  fieldKey,
  label,
  helperCopy,
  required,
  fieldIssues,
  children,
  className
}: {
  id: string;
  fieldKey: string;
  label: string;
  helperCopy?: string;
  required: boolean;
  fieldIssues: ValidationIssue[];
  children: ReactNode;
  className?: string;
}) {
  const guided = useContext(GuidedRenderContext);
  const visible = useGuidedFieldVisibility(fieldKey);
  const prefilled = useContext(PrefillFieldContext).has(fieldKey);
  const requested = Boolean(
    guided?.requestedFieldKey &&
      guidedFieldRoot(guided.requestedFieldKey) === guidedFieldRoot(fieldKey)
  );
  if (!visible) return null;
  return (
    <div
      className={`${className ?? ""} ${
        prefilled
          ? "border border-[#0A8E9A] bg-[#EEF7F6] p-3"
          : ""
      } ${requested ? "border-l-[6px] border-[#FF3B00] bg-[#FFF5F1] p-4" : ""}`}
      data-change-request-field={requested ? "true" : undefined}
      data-guided-field={guidedFieldRoot(fieldKey)}
    >
      <label className="text-sm font-black" htmlFor={id}>
        {label}
        {required ? (
          <>
            <span className="ml-1 text-orange" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </label>
      {prefilled ? (
        <p className="mt-1 text-xs font-semibold text-teal">
          Pre-filled by LegalEase. Please review.
        </p>
      ) : null}
      {requested && guided?.activeChangeRequest ? (
        <div
          aria-label="LegalEase requested correction"
          className="mt-3 border-y border-[#FF3B00] py-3 text-sm leading-6 text-[#071B33]"
        >
          <p className="font-extrabold">LegalEase requested an update to this field.</p>
          <dl className="mt-2 grid gap-2">
            <div>
              <dt className="font-bold text-[#475A6E]">Requested by</dt>
              <dd>{guided.activeChangeRequest.requestedByLabel}</dd>
            </div>
            <div>
              <dt className="font-bold text-[#475A6E]">Requested on</dt>
              <dd>
                {formatRecordedTimestamp(
                  guided.activeChangeRequest.requestedAt
                )}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-[#475A6E]">Reason</dt>
              <dd className="whitespace-pre-wrap">
                {guided.activeChangeRequest.requestedCorrection}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-[#475A6E]">Requested correction</dt>
              <dd className="whitespace-pre-wrap">
                {guided.activeChangeRequest.requestedCorrection}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-[#475A6E]">Current value</dt>
              <dd>The saved value is shown in the field below.</dd>
            </div>
            <div>
              <dt className="font-bold text-[#475A6E]">Partner response</dt>
              <dd>
                {guided.activeChangeRequest.partnerResponse ||
                  "No response recorded"}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-[#475A6E]">Resolution status</dt>
              <dd>
                {guided.activeChangeRequest.status === "open"
                  ? "Partner correction required"
                  : "Waiting on LegalEase"}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
      {helperCopy ? (
        <p className="mt-1 text-xs leading-5 text-grayWilma-600" id={`${id}-help`}>
          {helperCopy}
        </p>
      ) : null}
      <div className="mt-1.5">{children}</div>
      <FieldIssueList fieldIssues={fieldIssues} id={id} />
    </div>
  );
}

function useGuidedFieldVisibility(fieldKey: string): boolean {
  const guided = useContext(GuidedRenderContext);
  return !guided || substepOwnsField(guided.activeStep, fieldKey);
}

function FieldIssueList({
  id,
  fieldIssues
}: {
  id: string;
  fieldIssues: ValidationIssue[];
}) {
  if (fieldIssues.length === 0) return null;
  return (
    <div className="mt-1.5 grid gap-1" id={`${id}-error`}>
      {fieldIssues.map((issue, index) => (
        <p className="text-sm font-semibold text-orange" key={`${issue.message}-${index}`}>
          {issue.message}
        </p>
      ))}
    </div>
  );
}

function ErrorSummary({
  issues,
  onNavigate,
  sectionKey
}: {
  issues: ValidationIssue[];
  onNavigate: (stepId: string) => void;
  sectionKey: OnboardingSectionKey;
}) {
  return (
    <div
      aria-labelledby="section-errors-heading"
      className="mb-5 border-l-[6px] border-[#FF3B00] bg-white p-5"
      role="alert"
    >
      <h2 id="section-errors-heading" className="font-extrabold">
        Fix this information before continuing
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#475A6E]">
        Your entries remain in place. The first invalid field receives focus.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
        {issues.map((issue, index) => {
          const step = guidedSubstepForField(sectionKey, issue.fieldKey);
          const targetId = controlId(issue.fieldKey, issue.rowId);
          return (
            <li key={`${issue.fieldKey}-${issue.rowId ?? "field"}-${index}`}>
              <a
                className="font-semibold text-[#071B33] underline decoration-[#FF3B00] underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A]"
                href={
                  step
                    ? guidedSectionHref(sectionKey, step.id, targetId)
                    : `#${targetId}`
                }
                onClick={(event) => {
                  if (!step) return;
                  event.preventDefault();
                  onNavigate(step.id);
                  window.setTimeout(() => {
                    document.getElementById(targetId)?.focus();
                  }, 0);
                }}
              >
                {issue.message}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CanonicalReferenceValues({
  values,
  onNavigate
}: {
  values: OnboardingCanonicalReference[];
  onNavigate: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <FieldGroup
      title="Information reused from earlier sections"
      description="Each concept is stored once. Use its edit link to update the canonical source."
      surface="canonical_reuse"
    >
      <dl className="grid gap-3 md:grid-cols-2">
        {values.map((item) => (
          <div
            className="rounded-md border border-grayWilma-200 bg-grayWilma-100 p-4"
            key={item.fieldKey}
          >
            <dt className="text-xs font-black uppercase tracking-wide text-grayWilma-600">
              {item.label}
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {formatDisplayValue(item.value)}
            </dd>
            {item.helperCopy ? (
              <p className="mt-1 text-xs leading-5 text-grayWilma-600">
                {item.helperCopy}
              </p>
            ) : null}
            <Link
              className="mt-2 inline-flex min-h-8 items-center text-xs font-bold text-teal underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              href={item.editHref}
              onClick={onNavigate}
            >
              Edit source
            </Link>
          </div>
        ))}
      </dl>
    </FieldGroup>
  );
}

function ReadOnlyValues({
  title,
  description,
  values
}: {
  title: string;
  description?: string;
  values: OnboardingReadOnlyValue[];
}) {
  const guided = useContext(GuidedRenderContext);
  const visibleValues = guided
    ? values.filter((item) =>
        substepOwnsField(guided.activeStep, item.fieldKey)
      )
    : values;
  if (visibleValues.length === 0) return null;
  return (
    <FieldGroup
      description={description}
      fieldKeys={visibleValues.map((item) => item.fieldKey)}
      title={title}
    >
      <dl className="grid gap-3 md:grid-cols-2">
        {visibleValues.map((item) => (
          <div
            className="rounded-md border border-grayWilma-200 bg-grayWilma-100 p-4"
            key={item.fieldKey}
          >
            <dt className="text-xs font-black uppercase tracking-wide text-grayWilma-600">
              {item.label}
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {formatDisplayValue(item.value)}
            </dd>
            {item.helperCopy ? (
              <p className="mt-1 text-xs leading-5 text-grayWilma-600">
                {item.helperCopy}
              </p>
            ) : null}
          </div>
        ))}
      </dl>
    </FieldGroup>
  );
}

function ReadOnlyNotice({
  label,
  value,
  helperCopy
}: {
  label: string;
  value: DisplayValue;
  helperCopy?: string;
}) {
  return (
    <div className="rounded-md border border-grayWilma-200 bg-grayWilma-100 p-4">
      <p className="text-sm font-black">{label}</p>
      <p className="mt-1 text-sm font-semibold">{formatDisplayValue(value)}</p>
      {helperCopy ? (
        <p className="mt-1 text-xs leading-5 text-grayWilma-600">
          {helperCopy}
        </p>
      ) : null}
    </div>
  );
}

function fieldMetadata(fieldKey: string) {
  return ONBOARDING_SCHEMA_REGISTRY.find(
    (field) => field.key === fieldKey
  );
}

function issuesForField(
  issues: ValidationIssue[],
  fieldKey: string,
  rowId?: string
) {
  return issues.filter(
    (issue) =>
      issue.fieldKey === fieldKey &&
      (rowId === undefined || issue.rowId === undefined || issue.rowId === rowId)
  );
}

function controlId(fieldKey: string, rowId?: string) {
  return `field-${slugify(fieldKey)}${rowId ? `-${slugify(rowId)}` : ""}`;
}

function describedBy(
  id: string,
  helperCopy: string | undefined,
  issues: ValidationIssue[]
) {
  const values = [];
  if (helperCopy) values.push(`${id}-help`);
  if (issues.length > 0) values.push(`${id}-error`);
  return values.length > 0 ? values.join(" ") : undefined;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "value"
  );
}

function cloneRecord(value: Readonly<Record<string, unknown>>) {
  return structuredClone(value) as Record<string, unknown>;
}

function serialize(value: Record<string, unknown>) {
  return JSON.stringify(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown) {
  return value === true;
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : null;
}

function objectRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value
        .map((item) => objectValue(item))
        .filter((item): item is Record<string, unknown> => item !== null)
    : [];
}

function parseLineValues(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function ensureCollectionStableIds(
  sectionKey: OnboardingSectionKey,
  data: Record<string, unknown>
) {
  const collectionKey =
    sectionKey === "organization_contacts"
      ? "contacts"
      : sectionKey === "staff_dashboard_plan"
        ? "planned_users"
        : sectionKey === "support_referrals_reporting"
          ? "report_recipients"
          : null;
  if (!collectionKey) return data;

  const rows = objectRows(data[collectionKey]);
  let changed = false;
  const withIds = rows.map((row) => {
    if (stringValue(row.stable_row_id)) return row;
    changed = true;
    return { ...row, stable_row_id: crypto.randomUUID() };
  });
  return changed ? { ...data, [collectionKey]: withIds } : data;
}

function requestIdForSave(
  mode: SaveMode,
  snapshot: Record<string, unknown>,
  guidedStepId: string | null,
  completionAttemptRef: {
    current: {
      serialized: string;
      operationKey: string;
      requestId: string;
    } | null;
  }
) {
  if (mode === "draft_save") return crypto.randomUUID();
  const serialized = serialize(snapshot);
  const operationKey = `${mode}:${guidedStepId ?? "section"}`;
  if (
    completionAttemptRef.current?.serialized === serialized &&
    completionAttemptRef.current.operationKey === operationKey
  ) {
    return completionAttemptRef.current.requestId;
  }
  const requestId = crypto.randomUUID();
  completionAttemptRef.current = { serialized, operationKey, requestId };
  return requestId;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true;
}

function formatLocalSaveTime(value: Date) {
  return value.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatRecordedTimestamp(value: string | null) {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return parsed.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function guidedSectionIndex(sectionKey: OnboardingSectionKey) {
  return (
    ONBOARDING_SECTION_DEFINITIONS.findIndex(
      (section) => section.key === sectionKey
    ) + 1
  );
}

function parseIssues(value: unknown): ValidationIssue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const issue = objectValue(candidate);
    if (
      !issue ||
      typeof issue.fieldKey !== "string" ||
      typeof issue.message !== "string"
    ) {
      return [];
    }
    return [
      {
        fieldKey: issue.fieldKey,
        message: issue.message,
        rowId: typeof issue.rowId === "string" ? issue.rowId : undefined
      }
    ];
  });
}

function parseAsset(value: unknown): OnboardingEditorAsset | null {
  const asset = objectValue(value);
  if (
    !asset ||
    typeof asset.id !== "string" ||
    !isAssetCategory(asset.category) ||
    !(
      typeof asset.originalFileName === "string" ||
      typeof asset.fileName === "string"
    ) ||
    !(
      typeof asset.byteSize === "number" ||
      typeof asset.sizeBytes === "number"
    )
  ) {
    return null;
  }

  return {
    id: asset.id,
    category: asset.category,
    originalFileName:
      typeof asset.originalFileName === "string"
        ? asset.originalFileName
        : undefined,
    fileName: typeof asset.fileName === "string" ? asset.fileName : undefined,
    byteSize: typeof asset.byteSize === "number" ? asset.byteSize : undefined,
    sizeBytes:
      typeof asset.sizeBytes === "number" ? asset.sizeBytes : undefined,
    lifecycleStatus:
      typeof asset.lifecycleStatus === "string"
        ? asset.lifecycleStatus
        : undefined,
    reviewStatus:
      typeof asset.reviewStatus === "string" ? asset.reviewStatus : undefined,
    mediaType:
      typeof asset.mediaType === "string" ? asset.mediaType : null,
    status: typeof asset.status === "string" ? asset.status : undefined,
    previewHref:
      typeof asset.previewHref === "string" ? asset.previewHref : null,
    downloadHref:
      typeof asset.downloadHref === "string" ? asset.downloadHref : null,
    contentType:
      typeof asset.contentType === "string" ? asset.contentType : null,
    width: typeof asset.width === "number" ? asset.width : null,
    height: typeof asset.height === "number" ? asset.height : null,
    uploadedAt:
      typeof asset.uploadedAt === "string" ? asset.uploadedAt : undefined
  };
}

function parseAssets(value: unknown): OnboardingEditorAsset[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map(parseAsset);
  return parsed.every(
    (asset): asset is OnboardingEditorAsset => asset !== null
  )
    ? parsed
    : null;
}

function isAssetCategory(
  value: unknown
): value is OrganizationalAssetCategory {
  return (
    typeof value === "string" &&
    ONBOARDING_ASSET_DEFINITIONS.some(
      (definition) => definition.category === value
    )
  );
}

function referenceOptions(
  references: OnboardingCanonicalReference[],
  fieldKey: string
) {
  return references.find((reference) => reference.fieldKey === fieldKey)
    ?.options ?? [];
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

function requestErrorMessage(
  status: number,
  payload: Record<string, unknown> | null
) {
  if (status === 401) {
    return "Your session expired. Sign in again to continue. Your last confirmed save is still available.";
  }
  if (status === 403) {
    return "Could not save. Nothing changed. This role cannot edit the onboarding section.";
  }
  if (status === 413) {
    return "Could not save. Nothing changed. Shorten long entries and retry.";
  }
  if (Array.isArray(payload?.issues) && payload.issues.length > 0) {
    return "Review the marked information. Nothing has been discarded.";
  }
  if (typeof payload?.error === "string") {
    return `Could not save. Nothing changed. ${payload.error}`;
  }
  return "Could not save. Nothing changed. Your entries remain on this page. Retry when your connection is available.";
}

function assetErrorMessage(
  status: number,
  payload: Record<string, unknown> | null
) {
  if (status === 401) return "Your session expired. Sign in and try again.";
  if (status === 403) return "You do not have permission to manage this file.";
  if (status === 413) return "This file is larger than the allowed limit.";
  if (typeof payload?.error === "string") return payload.error;
  return "Could not update this private file.";
}

function formatDisplayValue(value: DisplayValue) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "Not provided";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }
  return String(value);
}

function isAffirmativeDisplayValue(value: DisplayValue) {
  return (
    value === true ||
    (typeof value === "string" &&
      ["true", "yes", "required"].includes(value.trim().toLowerCase()))
  );
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 0) return "Unknown size";
  if (value >= 1024 * 1024) {
    return `${Math.round((value / (1024 * 1024)) * 10) / 10} MiB`;
  }
  if (value >= 1024) return `${Math.round(value / 1024)} KiB`;
  return `${value} bytes`;
}

function isImageAsset(asset: OnboardingEditorAsset) {
  const mediaType = asset.mediaType ?? asset.contentType;
  return (
    mediaType?.startsWith("image/") === true ||
    /\.(?:png|jpe?g|webp)$/i.test(assetFileName(asset))
  );
}

function assetFileName(asset: OnboardingEditorAsset) {
  return asset.originalFileName ?? asset.fileName ?? "Organizational asset";
}

function assetByteSize(asset: OnboardingEditorAsset) {
  return asset.byteSize ?? asset.sizeBytes ?? 0;
}

function assetLifecycleStatus(asset: OnboardingEditorAsset) {
  return asset.lifecycleStatus ?? asset.status ?? "";
}

function assetDownloadHref(asset: OnboardingEditorAsset) {
  return (
    asset.downloadHref ??
    `/api/partners/onboarding/assets/${encodeURIComponent(asset.id)}`
  );
}

function assetPreviewHref(asset: OnboardingEditorAsset) {
  return (
    asset.previewHref ??
    `/api/partners/onboarding/assets/${encodeURIComponent(asset.id)}`
  );
}

export function GuidedChangeRequestPanel({
  requests,
  currentValue,
  fieldLabel,
  sectionLevel
}: {
  requests: readonly PartnerFacingChangeRequest[];
  currentValue?: unknown;
  fieldLabel?: string | null;
  sectionLevel: boolean;
}) {
  const active = requests.find(
    (request) =>
      request.status === "open" || request.status === "partner_responded"
  );
  const history = requests.filter(
    (request) =>
      request.status === "resolved" || request.status === "cancelled"
  );

  if (!active && history.length === 0) return null;

  return (
    <div className="grid gap-5">
      {active ? (
        <section
          aria-labelledby={`change-request-${active.id}`}
          className={`border-l-[6px] bg-white p-5 md:p-6 ${
            active.status === "open"
              ? "border-[#FF3B00]"
              : "border-[#0A8E9A]"
          }`}
          data-active-change-request={active.status}
        >
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
            LegalEase review request
          </p>
          <h2
            className="mt-2 text-xl font-extrabold text-[#071B33]"
            id={`change-request-${active.id}`}
          >
            {active.status === "open"
              ? "A correction is required"
              : "Your correction is with LegalEase"}
          </h2>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#071B33]">
            This request applies to this part of the section.
          </p>
          {sectionLevel ? (
            <p className="mt-2 text-sm leading-6 text-[#475A6E]">
              The current request is attached to the section rather than one
              authoritative field. No field-level target has been inferred
              from the request text.
            </p>
          ) : null}

          <dl className="mt-5 grid border border-[#B8C1C7] sm:grid-cols-2">
            <RequestFact label="Requested by" value={active.requestedByLabel} />
            <RequestFact
              label="Requested on"
              value={formatTimestamp(active.requestedAt)}
            />
            <RequestFact
              label="Reason"
              value={active.requestedCorrection}
              wide
            />
            <RequestFact
              label="Current value"
              value={
                sectionLevel
                  ? "Review the section tasks. The request is not tied to one field."
                  : `${fieldLabel || "Requested field"}: ${formatRequestValue(
                      currentValue
                    )}`
              }
              wide
            />
            <RequestFact
              label="Requested correction"
              value={active.requestedCorrection}
              wide
            />
            <RequestFact
              label="Partner response"
              value={active.partnerResponse || "No response recorded"}
              wide
            />
            <RequestFact
              label="Resolution status"
              value={changeRequestStatusLabel(active.status)}
              wide
            />
          </dl>

          {active.status === "open" ? (
            <p className="mt-4 border-t border-[#D8DDDF] pt-4 text-sm leading-6 text-[#475A6E]">
              Correct the relevant task, then submit the section. The current
              authoritative workflow records the partner response when that
              submission succeeds.
            </p>
          ) : (
            <p className="mt-4 border-t border-[#D8DDDF] pt-4 text-sm leading-6 text-[#475A6E]">
              No further partner action is required unless LegalEase requests
              another correction.
            </p>
          )}
        </section>
      ) : null}

      {history.length > 0 ? (
        <details className="border border-[#B8C1C7] bg-white p-5">
          <summary className="min-h-11 cursor-pointer text-sm font-extrabold text-[#071B33] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2">
            View resolved request history ({history.length})
          </summary>
          <ol className="mt-4 grid gap-4">
            {history.map((request) => (
              <li className="border-l-4 border-[#475A6E] pl-4" key={request.id}>
                <p className="text-sm font-bold text-[#071B33]">
                  {changeRequestStatusLabel(request.status)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#475A6E]">
                  {request.requestedCorrection}
                </p>
                <p className="mt-2 text-xs text-[#475A6E] [font-family:var(--font-rcap-mono)]">
                  Requested {formatTimestamp(request.requestedAt)}
                  {request.resolvedAt
                    ? ` | Resolved ${formatTimestamp(request.resolvedAt)}`
                    : ""}
                </p>
                {request.partnerResponse ? (
                  <p className="mt-2 text-sm leading-6 text-[#475A6E]">
                    Partner response: {request.partnerResponse}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}

function RequestFact({
  label,
  value,
  wide = false
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`min-w-0 border-b border-[#D8DDDF] p-4 sm:border-r ${
        wide ? "sm:col-span-2 sm:border-r-0" : "sm:even:border-r-0"
      }`}
    >
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
        {label}
      </dt>
      <dd className="mt-2 break-words whitespace-pre-wrap text-sm leading-6 text-[#071B33]">
        {value}
      </dd>
    </div>
  );
}

function changeRequestStatusLabel(
  status: PartnerFacingChangeRequest["status"]
): string {
  const labels: Record<PartnerFacingChangeRequest["status"], string> = {
    open: "Partner correction required",
    partner_responded: "Waiting on LegalEase",
    resolved: "Resolved",
    cancelled: "Closed without a correction"
  };
  return labels[status];
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recorded time unavailable";
  return `${new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(date)} UTC`;
}

function formatRequestValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0
      ? value
          .map((item) =>
            item && typeof item === "object"
              ? "Saved list item"
              : String(item)
          )
          .join(", ")
      : "Not provided";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value.trim() || "Not provided";
  if (typeof value === "number") return String(value);
  return "Not provided";
}

export function OnboardingStaffSectionSummary({
  resolution,
  section,
  values,
  readOnlyValues,
  administratorName,
  lastDecisionAt,
  organizationName
}: {
  resolution: GuidedStepResolution;
  section: OnboardingStaffSection;
  values: Readonly<Record<string, unknown>>;
  readOnlyValues: Readonly<Record<string, unknown>>;
  administratorName: string | null;
  lastDecisionAt: string | null;
  organizationName: string;
}) {
  const currentStepId = resolution.requestOverview
    ? SECTION_CHANGE_REQUEST_STEP
    : resolution.substep.id;
  const displayFields = resolution.substep.ownedFieldKeys.map((fieldKey) => {
    const key = String(fieldKey);
    const definition = getFieldDefinition(
      fieldKey as Parameters<typeof getFieldDefinition>[0]
    );
    return {
      key,
      label: definition?.label ?? "Saved information",
      dataType: definition?.dataType ?? null,
      value:
        definition?.ownership === "partner_editable"
          ? values[definition.dataKey]
          : readOnlyValues[definition?.dataKey ?? key]
    };
  });

  return (
    <div className="mx-auto max-w-6xl text-[#071B33]">
      <header className="border-b-4 border-[#071B33] pb-6">
        <Link
          className={staffUtilityLinkClass}
          href="/partner/onboarding#program-configuration"
        >
          Return to implementation center
        </Link>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-[#0A8E9A] [font-family:var(--font-rcap-mono)]">
          Staff program summary
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] md:text-4xl">
          {section.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#475A6E]">
          You can read the submitted or approved implementation record because
          your active {organizationName} staff role includes this workspace. A
          partner administrator manages corrections and submission.
        </p>
        <dl className="mt-5 grid border border-[#B8C1C7] bg-white sm:grid-cols-3">
          <StaffFact
            label="Section state"
            value={sectionStatusLabel(section.status)}
          />
          <StaffFact
            label="Partner administrator"
            value={administratorName || "Not recorded"}
          />
          <StaffFact
            label="Last submitted or approved"
            value={formatStaffDate(lastDecisionAt)}
          />
        </dl>
      </header>

      <div className="sticky top-0 z-20 -mx-4 mt-5 border-y border-[#B8C1C7] bg-[#F7F4EE] px-4 py-3 lg:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
          {resolution.requestOverview
            ? "Requested update"
            : `Step ${resolution.index + 1} of ${resolution.section.substeps.length}`}
        </p>
        <p className="mt-1 break-words text-sm font-extrabold text-[#071B33]">
          {resolution.requestOverview
            ? "LegalEase request"
            : resolution.substep.title}
        </p>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav
          aria-label="Section tasks"
          className="hidden border border-[#B8C1C7] bg-white lg:sticky lg:top-6 lg:block lg:self-start"
        >
          <div className="border-b border-[#B8C1C7] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
              Read-only section
            </p>
          </div>
          <ol>
            {section.changeRequestStatus ? (
              <li className="border-b border-[#D8DDDF]">
                <StaffStepLink
                  active={currentStepId === SECTION_CHANGE_REQUEST_STEP}
                  href={guidedSectionHref(
                    section.key,
                    SECTION_CHANGE_REQUEST_STEP
                  )}
                  label="LegalEase request"
                  marker="CR"
                />
              </li>
            ) : null}
            {resolution.section.substeps.map((substep, index) => (
              <li
                className="border-b border-[#D8DDDF] last:border-b-0"
                key={substep.id}
              >
                <StaffStepLink
                  active={currentStepId === substep.id}
                  href={guidedSectionHref(section.key, substep.id)}
                  label={substep.title}
                  marker={String(index + 1).padStart(2, "0")}
                />
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0">
          {resolution.requestOverview ? (
            <GuidedChangeRequestPanel
              requests={section.changeRequests}
              sectionLevel
            />
          ) : (
            <section
              aria-labelledby="staff-summary-step"
              className="border border-[#B8C1C7] bg-white p-5 md:p-7"
            >
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#0A8E9A] [font-family:var(--font-rcap-mono)]">
                Step {resolution.index + 1} of {resolution.section.substeps.length}
              </p>
              <h2
                className="mt-2 text-2xl font-extrabold"
                id="staff-summary-step"
              >
                {resolution.substep.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#475A6E]">
                {resolution.substep.purpose}
              </p>

              {displayFields.length > 0 ? (
                <dl className="mt-6 divide-y divide-[#D8DDDF] border-y border-[#D8DDDF]">
                  {displayFields.map((field) => (
                    <div
                      className="grid gap-2 py-4 sm:grid-cols-[minmax(180px,0.38fr)_minmax(0,1fr)] sm:gap-6"
                      key={field.key}
                    >
                      <dt className="text-sm font-bold text-[#475A6E]">
                        {field.label}
                      </dt>
                      <dd className="break-words whitespace-pre-wrap text-sm leading-6 text-[#071B33]">
                        {formatStaffValue(field.value, field.dataType)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="mt-6 border-l-4 border-[#0A8E9A] bg-[#EEF7F6] p-4 text-sm leading-6 text-[#475A6E]">
                  This task explains the implementation decision and has no
                  staff-editable field.
                </div>
              )}

              <p className="mt-6 border-t border-[#D8DDDF] pt-4 text-sm leading-6 text-[#475A6E]">
                {resolution.substep.outcome}
              </p>
            </section>
          )}

          <div className="mt-5 border-t-4 border-[#071B33] pt-5">
            <p className="text-sm leading-6 text-[#475A6E]">
              Need a correction? Contact {administratorName || "your partner administrator"}.
              Staff access cannot edit or submit this record.
            </p>
            <Link
              className="mt-4 inline-flex min-h-12 items-center justify-center border border-[#071B33] bg-[#071B33] px-5 py-3 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2"
              href="/partner/onboarding#program-configuration"
            >
              Return to implementation center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-[#D8DDDF] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#475A6E] [font-family:var(--font-rcap-mono)]">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-extrabold text-[#071B33]">
        {value}
      </dd>
    </div>
  );
}

function StaffStepLink({
  active,
  href,
  label,
  marker
}: {
  active: boolean;
  href: string;
  label: string;
  marker: string;
}) {
  return (
    <Link
      aria-current={active ? "step" : undefined}
      className={`grid min-h-12 grid-cols-[32px_minmax(0,1fr)] items-center gap-3 px-4 py-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#0A8E9A] ${
        active
          ? "border-l-4 border-[#FF3B00] bg-[#EEF7F6] text-[#071B33]"
          : "border-l-4 border-transparent text-[#475A6E] hover:text-[#0A8E9A]"
      }`}
      href={href}
    >
      <span className="text-xs [font-family:var(--font-rcap-mono)]">
        {marker}
      </span>
      <span className="break-words">{label}</span>
    </Link>
  );
}

function formatStaffValue(
  value: unknown,
  dataType: string | null = null
): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "Not provided";
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          const row = item as Record<string, unknown>;
          const parts = [
            row.name,
            typeof row.role === "string"
              ? onboardingOptionLabel(row.role)
              : row.role,
            typeof row.requested_role === "string"
              ? onboardingOptionLabel(row.requested_role)
              : row.requested_role,
            row.work_email
          ].filter(
            (part): part is string =>
              typeof part === "string" && part.trim().length > 0
          );
          return parts.join(" | ") || "Saved list item";
        }
        return String(item);
      })
      .join("\n");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (!value.trim()) return "Not provided";
    return dataType === "enum" ? onboardingOptionLabel(value) : value;
  }
  return "Not provided";
}

function formatStaffDate(value: string | null): string {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recorded date unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(date);
}

const staffUtilityLinkClass =
  "inline-flex min-h-11 items-center text-sm font-bold text-[#0A6E77] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A8E9A] focus-visible:ring-offset-2";
