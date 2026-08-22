"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  PREFILL_SOURCE_TYPES,
  type PrefillSourceType
} from "@/lib/partners/onboarding/prefill-domain";
import {
  isActionablePrefillStatus,
  type InternalPrefillSnapshot
} from "@/lib/partners/onboarding/prefill-service";
import type { OnboardingSectionKey } from "@/lib/partners/onboarding/types";

const inputClass =
  "min-h-11 w-full rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-teal focus:ring-2 focus:ring-teal/25";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-teal disabled:cursor-not-allowed disabled:opacity-50";
const quietButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-xs font-bold text-navy hover:border-teal hover:text-teal disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Operator-facing wording for the two states this panel exists to make legible. Stored
 * status values, row ids and revisions are not operator language and are never rendered.
 */
const PARTNER_UPDATED = {
  heading: "Partner updated this information",
  explanation:
    "The partner changed the value after LegalEase prepared the original draft. Their current answer remains in place.",
  action: "Propose an updated value"
} as const;

const REVIEW_DIFFERENCE = {
  heading: "Review this difference",
  explanation:
    "The partner's current answer and the proposed LegalEase value do not match. This change will not be included when you apply the prepared setup.",
  override:
    "Replacing the partner's answer takes a deliberate override with a recorded reason, not this apply."
} as const;

const SUGGESTION_STATUS_LABELS: Record<string, string> = {
  proposed: "Awaiting review",
  approved: "Ready to apply",
  rejected: "Not proceeding",
  applied: "Applied to the workspace",
  conflict: "Needs a decision",
  superseded: "Replaced by a later preparation"
};

const PARTNER_REVIEW_LABELS: Record<string, string> = {
  not_applied: "Not yet with the partner",
  pending: "Waiting on the partner",
  confirmed: "Partner kept this value",
  modified: "Partner changed this value",
  rejected: "Partner cleared this value"
};

function suggestionStatusLabel(status: string) {
  return SUGGESTION_STATUS_LABELS[status] ?? "In review";
}

function partnerReviewLabel(status: string) {
  return PARTNER_REVIEW_LABELS[status] ?? "No partner decision recorded";
}

function preparedOn(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Date not recorded"
    : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function Phase1PrefillPanel({
  partnerSlug,
  snapshot
}: {
  partnerSlug: string;
  snapshot: InternalPrefillSnapshot;
}) {
  const [current, setCurrent] = useState(snapshot);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const firstField = current.eligibleFields[0];
  const [sectionKey, setSectionKey] = useState<OnboardingSectionKey>(
    firstField?.sectionKey ?? "organization_contacts"
  );
  const sectionFields = useMemo(
    () =>
      current.eligibleFields.filter((field) => field.sectionKey === sectionKey),
    [current.eligibleFields, sectionKey]
  );
  const [fieldKey, setFieldKey] = useState(firstField?.fieldKey ?? "");
  const selectedField =
    sectionFields.find((field) => field.fieldKey === fieldKey) ??
    sectionFields[0];
  const [proposedValue, setProposedValue] = useState("");
  const [sourceType, setSourceType] =
    useState<PrefillSourceType>("meeting");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceReferenceId, setSourceReferenceId] = useState("");
  const [confidence, setConfidence] = useState("");
  const approved = current.suggestions.filter(
    (suggestion) =>
      suggestion.reviewStatus === "approved" && !suggestion.conflict
  );
  // Applied preparations the partner has since changed, and which no one has proposed a
  // replacement for yet. Until this branch, the panel could not offer anything here at all.
  const awaitingReproposal = current.suggestions.filter(
    (suggestion) =>
      suggestion.reviewStatus === "applied" &&
      suggestion.partnerReviewStatus === "modified" &&
      !current.suggestions.some(
        (candidate) =>
          candidate.sectionKey === suggestion.sectionKey &&
          candidate.fieldKey === suggestion.fieldKey &&
          isActionablePrefillStatus(candidate.reviewStatus)
      )
  );

  function proposeUpdatedValue(suggestion: (typeof current.suggestions)[number]) {
    setSectionKey(suggestion.sectionKey);
    setFieldKey(suggestion.fieldKey);
    setProposedValue("");
    setSourceType("partner_record");
    setSourceLabel("");
    setMessage(null);
    if (typeof document !== "undefined") {
      document
        .querySelector("[data-prefill-add-form]")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  const chosen = approved.filter((suggestion) =>
    selected.includes(suggestion.id)
  );

  async function mutate(
    action: string,
    payload: Record<string, unknown>,
    options: { workspace?: boolean; version?: boolean } = {}
  ) {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/internal/partners/onboarding/phase1/${encodeURIComponent(partnerSlug)}/prefill`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            requestId: crypto.randomUUID(),
            payload,
            ...(options.workspace
              ? { workspaceId: current.workspace?.id }
              : {}),
            ...(options.version
              ? {
                  expectedWorkspaceVersion:
                    current.workspace?.aggregateVersion
                }
              : {})
          })
        }
      );
      const body = (await response.json()) as {
        snapshot?: InternalPrefillSnapshot;
        error?: { message?: string };
      };
      if (!response.ok || !body.snapshot) {
        throw new Error(body.error?.message ?? "The prefill action failed.");
      }
      setCurrent(body.snapshot);
      setSelected([]);
      setMessage("Prefill changes saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The prefill action could not be saved."
      );
    } finally {
      setPending(false);
    }
  }

  function changeSection(value: OnboardingSectionKey) {
    setSectionKey(value);
    setFieldKey(
      current.eligibleFields.find((field) => field.sectionKey === value)
        ?.fieldKey ?? ""
    );
    setProposedValue("");
  }

  function typedProposedValue() {
    if (!selectedField) return proposedValue;
    if (selectedField.dataType === "boolean") return proposedValue === "true";
    if (selectedField.dataType === "integer")
      return proposedValue === "" ? null : Number(proposedValue);
    if (selectedField.dataType.endsWith("_array")) {
      return proposedValue
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    }
    return proposedValue;
  }

  return (
    <section className="mt-8" aria-labelledby="prefill-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-orange">
            Phase 1.1
          </p>
          <h2 id="prefill-heading" className="mt-1 text-2xl font-black">
            Prefill
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-grayWilma-700">
            Prepare structured suggestions, review them, then apply only
            approved conflict-free values for the partner to confirm.
          </p>
        </div>
        <Link
          href="/partner/onboarding"
          className={quietButtonClass}
          target="_blank"
        >
          Preview as partner
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5 xl:grid-cols-9">
        {Object.entries(current.summary).map(([key, value]) => (
          <Card key={key} className="border-grayWilma-200 p-3">
            <p className="text-2xl font-black">{value}</p>
            <p className="mt-1 text-xs text-grayWilma-700">
              {humanize(key)}
            </p>
          </Card>
        ))}
      </div>

      {message ? (
        <p
          className="mt-4 rounded-md border border-grayWilma-200 bg-white px-4 py-3 text-sm"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {!current.workspace ? (
        <Card className="mt-5 border-orange/30 p-5">
          Create the Phase 1 workspace before preparing prefill.
        </Card>
      ) : (
        <>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Card className="border-grayWilma-200 p-5">
              <h3 className="text-lg font-black">Import known partner data</h3>
              <p className="mt-2 text-sm text-grayWilma-700">
                Creates reviewable suggestions from existing partner, contact,
                order-form, entitlement, and public-page records. It does not
                change onboarding answers.
              </p>
              <button
                className={`${buttonClass} mt-4`}
                disabled={pending}
                onClick={() => mutate("import_known", {})}
                type="button"
              >
                Import known partner data
              </button>
            </Card>

            <Card className="border-grayWilma-200 p-5" data-prefill-add-form>
              <h3 className="text-lg font-black">Add structured suggestion</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  Section
                  <select
                    className={`${inputClass} mt-1`}
                    value={sectionKey}
                    onChange={(event) =>
                      changeSection(event.target.value as OnboardingSectionKey)
                    }
                  >
                    {[...new Set(current.eligibleFields.map((field) => field.sectionKey))].map(
                      (key) => (
                        <option key={key} value={key}>
                          {
                            current.eligibleFields.find(
                              (field) => field.sectionKey === key
                            )?.sectionLabel
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>
                <label className="text-sm font-bold">
                  Field
                  <select
                    className={`${inputClass} mt-1`}
                    value={selectedField?.fieldKey ?? ""}
                    onChange={(event) => setFieldKey(event.target.value)}
                  >
                    {sectionFields.map((field) => (
                      <option key={field.fieldKey} value={field.fieldKey}>
                        {field.fieldLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-bold sm:col-span-2">
                  Proposed value
                  {selectedField?.enumValues.length ? (
                    <select
                      className={`${inputClass} mt-1`}
                      value={proposedValue}
                      onChange={(event) => setProposedValue(event.target.value)}
                    >
                      <option value="">Choose a value</option>
                      {selectedField.enumValues.map((value) => (
                        <option key={value} value={value}>
                          {humanize(value)}
                        </option>
                      ))}
                    </select>
                  ) : selectedField?.dataType === "boolean" ? (
                    <select
                      className={`${inputClass} mt-1`}
                      value={proposedValue}
                      onChange={(event) => setProposedValue(event.target.value)}
                    >
                      <option value="">Choose a value</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <textarea
                      className={`${inputClass} mt-1 min-h-24`}
                      data-proposed-value
                      maxLength={selectedField?.maxLength ?? 5000}
                      value={proposedValue}
                      onChange={(event) => setProposedValue(event.target.value)}
                    />
                  )}
                </label>
                <label className="text-sm font-bold">
                  Source type
                  <select
                    className={`${inputClass} mt-1`}
                    value={sourceType}
                    onChange={(event) =>
                      setSourceType(event.target.value as PrefillSourceType)
                    }
                  >
                    {PREFILL_SOURCE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {humanize(type)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-bold">
                  Short source label
                  <input
                    className={`${inputClass} mt-1`}
                    data-source-label
                    maxLength={200}
                    value={sourceLabel}
                    onChange={(event) => setSourceLabel(event.target.value)}
                  />
                </label>
                <label className="text-sm font-bold">
                  Source reference ID (optional)
                  <input
                    className={`${inputClass} mt-1`}
                    maxLength={200}
                    value={sourceReferenceId}
                    onChange={(event) =>
                      setSourceReferenceId(event.target.value)
                    }
                  />
                </label>
                <label className="text-sm font-bold">
                  Confidence (optional, 0–1)
                  <input
                    className={`${inputClass} mt-1`}
                    max="1"
                    min="0"
                    step="0.01"
                    type="number"
                    value={confidence}
                    onChange={(event) => setConfidence(event.target.value)}
                  />
                </label>
              </div>
              <button
                className={`${buttonClass} mt-4`}
                disabled={
                  pending ||
                  !selectedField ||
                  !sourceLabel.trim() ||
                  proposedValue === ""
                }
                onClick={() =>
                  mutate("add", {
                    sectionKey,
                    fieldKey: selectedField?.fieldKey,
                    proposedValue: typedProposedValue(),
                    sourceType,
                    sourceLabel,
                    sourceReferenceId,
                    confidence
                  })
                }
                data-add-suggestion
                type="button"
              >
                Add suggestion
              </button>
            </Card>
          </div>

          {awaitingReproposal.length ? (
            <Card
              className="mt-5 border-orange/40 bg-orange/5 p-5"
              data-partner-updated-band
            >
              <h3 className="text-lg font-black">{PARTNER_UPDATED.heading}</h3>
              <p className="mt-2 max-w-3xl text-sm text-grayWilma-700">
                {PARTNER_UPDATED.explanation}
              </p>
              <ul className="mt-4 grid gap-3">
                {awaitingReproposal.map((suggestion) => (
                  <li
                    className="flex flex-wrap items-end justify-between gap-3 border-b border-grayWilma-200 pb-3 last:border-b-0 last:pb-0"
                    key={suggestion.id}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold">
                        {suggestion.sectionLabel}: {suggestion.fieldLabel}
                      </p>
                      <p className="mt-1 break-words text-sm text-grayWilma-700">
                        Partner&apos;s answer: {formatValue(suggestion.currentValue)}
                      </p>
                      <p className="mt-1 break-words text-xs text-grayWilma-700">
                        LegalEase prepared {formatValue(suggestion.proposedValue)} from{" "}
                        {suggestion.sourceLabel}, applied{" "}
                        {suggestion.appliedAt ? preparedOn(suggestion.appliedAt) : "date not recorded"}.
                      </p>
                    </div>
                    <button
                      className={quietButtonClass}
                      data-propose-updated-value
                      disabled={pending}
                      onClick={() => proposeUpdatedValue(suggestion)}
                      type="button"
                    >
                      {PARTNER_UPDATED.action}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card className="mt-5 overflow-hidden border-grayWilma-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-grayWilma-200 p-5">
              <div>
                <h3 className="text-lg font-black">Suggestion review</h3>
                <p className="mt-1 text-sm text-grayWilma-700">
                  Select approved, conflict-free suggestions to preview and
                  apply.
                </p>
              </div>
              <button
                className={quietButtonClass}
                disabled={pending || approved.length === 0}
                onClick={() => setSelected(approved.map((item) => item.id))}
                type="button"
              >
                Select all approved and conflict-free
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="bg-grayWilma-50 text-xs uppercase text-grayWilma-700">
                  <tr>
                    <th className="p-3">Apply</th>
                    <th className="p-3">Section / field</th>
                    <th className="p-3">Current</th>
                    <th className="p-3">Proposed</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Partner review</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grayWilma-200">
                  {current.suggestions.map((suggestion) => (
                    <tr key={suggestion.id} className="align-top">
                      <td className="p-3">
                        <input
                          aria-label={`Apply ${suggestion.fieldLabel}`}
                          checked={selected.includes(suggestion.id)}
                          disabled={
                            suggestion.reviewStatus !== "approved" ||
                            suggestion.conflict
                          }
                          onChange={(event) =>
                            setSelected((items) =>
                              event.target.checked
                                ? [...items, suggestion.id]
                                : items.filter((id) => id !== suggestion.id)
                            )
                          }
                          type="checkbox"
                        />
                      </td>
                      <td className="p-3">
                        <p className="font-bold">{suggestion.fieldLabel}</p>
                        <p className="mt-1 text-xs text-grayWilma-700">
                          {suggestion.sectionLabel}
                        </p>
                      </td>
                      <td className="max-w-48 break-words p-3">
                        {formatValue(suggestion.currentValue)}
                      </td>
                      <td className="max-w-48 break-words p-3 font-semibold">
                        {formatValue(suggestion.proposedValue)}
                      </td>
                      <td className="max-w-52 p-3">
                        <p>{humanize(suggestion.sourceType)}</p>
                        <p className="mt-1 break-words text-xs text-grayWilma-700">
                          {suggestion.sourceLabel}
                        </p>
                        {suggestion.confidence !== null ? (
                          <p className="mt-1 text-xs">
                            Confidence {Math.round(suggestion.confidence * 100)}%
                          </p>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <Badge tone={suggestion.conflict ? "orange" : "neutral"}>
                          {suggestion.conflict
                            ? "Conflict"
                            : suggestionStatusLabel(suggestion.reviewStatus)}
                        </Badge>
                        {suggestion.conflict ? (
                          <div className="mt-2 max-w-56" data-conflict-detail>
                            <p className="text-xs font-bold text-orange">
                              {REVIEW_DIFFERENCE.heading}
                            </p>
                            <p className="mt-1 text-xs text-grayWilma-700">
                              {suggestion.conflictReason ?? REVIEW_DIFFERENCE.explanation}
                            </p>
                            <p className="mt-1 text-xs text-grayWilma-700">
                              {REVIEW_DIFFERENCE.explanation}
                            </p>
                            <p className="mt-1 text-xs text-grayWilma-700">
                              {REVIEW_DIFFERENCE.override}
                            </p>
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3">
                        <p>{partnerReviewLabel(suggestion.partnerReviewStatus)}</p>
                        {suggestion.supersedesValueId ? (
                          <p className="mt-1 text-xs text-grayWilma-700">
                            Follows an earlier LegalEase preparation
                            {suggestion.priorPartnerReviewStatus
                              ? `: ${partnerReviewLabel(suggestion.priorPartnerReviewStatus).toLowerCase()}`
                              : ""}
                            .
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-grayWilma-700">
                          Prepared by LegalEase on {preparedOn(suggestion.createdAt)}
                        </p>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {suggestion.reviewStatus === "proposed" ? (
                            <>
                              <button
                                className={quietButtonClass}
                                disabled={pending || suggestion.conflict}
                                onClick={() =>
                                  mutate(
                                    "approve",
                                    {
                                      valueId: suggestion.id,
                                      expectedBatchVersion:
                                        suggestion.batchVersion
                                    },
                                    { workspace: true }
                                  )
                                }
                                type="button"
                              >
                                Approve
                              </button>
                              <button
                                className={quietButtonClass}
                                disabled={pending}
                                onClick={() =>
                                  mutate(
                                    "reject",
                                    {
                                      valueId: suggestion.id,
                                      expectedBatchVersion:
                                        suggestion.batchVersion
                                    },
                                    { workspace: true }
                                  )
                                }
                                type="button"
                              >
                                Reject
                              </button>
                            </>
                          ) : null}
                          {!["applied", "rejected", "superseded"].includes(
                            suggestion.reviewStatus
                          ) ? (
                            <button
                              className={quietButtonClass}
                              disabled={pending}
                              onClick={() =>
                                mutate(
                                  "supersede",
                                  {
                                    valueId: suggestion.id,
                                    expectedBatchVersion:
                                      suggestion.batchVersion
                                  },
                                  { workspace: true }
                                )
                              }
                              type="button"
                            >
                              Supersede
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {current.suggestions.length === 0 ? (
              <p className="p-5 text-sm text-grayWilma-700">
                No prefill suggestions have been prepared.
              </p>
            ) : null}
          </Card>

          {chosen.length ? (
            <Card className="mt-5 border-teal/30 p-5">
              <h3 className="text-lg font-black">Apply preview</h3>
              <p className="mt-2 text-sm text-grayWilma-700">
                {chosen.length} approved field{chosen.length === 1 ? "" : "s"}{" "}
                will be added. Current conflicts and unchanged fields will be
                skipped. Prohibited fields cannot be selected.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                {chosen.map((suggestion) => (
                  <li key={suggestion.id}>
                    {suggestion.sectionLabel}: {suggestion.fieldLabel}
                  </li>
                ))}
              </ul>
              <button
                className={`${buttonClass} mt-4`}
                disabled={pending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Apply ${chosen.length} approved suggestion${chosen.length === 1 ? "" : "s"} for partner review?`
                    )
                  ) {
                    void mutate(
                      "apply",
                      { selectedValueIds: chosen.map((item) => item.id) },
                      { workspace: true, version: true }
                    );
                  }
                }}
                type="button"
              >
                Apply selected
              </button>
            </Card>
          ) : null}
        </>
      )}
    </section>
  );
}

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/gu, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "object" ? "Structured record" : String(item)
      )
      .join(", ");
  }
  if (typeof value === "object") return "Structured value";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
