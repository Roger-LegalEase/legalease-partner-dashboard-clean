"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type {
  ArtifactBoard,
  ArtifactBoardEntry,
  ArtifactVersionView
} from "@/lib/partners/onboarding/artifact-service";

import { ArtifactDocumentView } from "@/components/partners/onboarding/ArtifactDocumentView";
import { CoBrandedPagePanel } from "./CoBrandedPagePanel";

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-teal disabled:cursor-not-allowed disabled:opacity-50";
const quietButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-xs font-bold text-navy hover:border-teal hover:text-teal disabled:cursor-not-allowed disabled:opacity-50";
const inputClass =
  "min-h-11 w-full rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-teal focus:ring-2 focus:ring-teal/25";

const FRESHNESS_COPY: Record<ArtifactBoardEntry["sourceFreshness"], string> = {
  unavailable: "Not yet available",
  no_version: "Not generated",
  current: "Current with program data",
  stale: "Out of date with program data"
};

const APPROVAL_COPY: Record<string, string> = {
  draft: "Draft, awaiting LegalEase review",
  ready_for_review: "Ready for LegalEase review",
  changes_requested: "Changes requested",
  approved: "Approved by LegalEase",
  superseded: "Superseded",
  generation_failed: "Generation failed"
};

const PARTNER_COPY: Record<string, string> = {
  not_requested: "Not yet sent to the partner",
  awaiting_partner: "Awaiting partner review",
  changes_requested: "Partner requested a correction",
  approved: "Approved by the partner"
};

export function Phase2AArtifactsPanel({
  partnerSlug,
  board
}: {
  partnerSlug: string;
  board: ArtifactBoard;
}) {
  const [current, setCurrent] = useState(board);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [area, setArea] = useState<"artifacts" | "co_branded_page">("artifacts");
  const [openPreview, setOpenPreview] = useState<string | null>(null);
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  async function mutate(action: string, payload: Record<string, unknown>) {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/internal/partners/onboarding/phase1/${encodeURIComponent(partnerSlug)}/artifacts`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            requestId: crypto.randomUUID(),
            payload
          })
        }
      );
      const body = (await response.json()) as {
        success?: boolean;
        error?: string;
        board?: ArtifactBoard;
      };
      if (!response.ok || !body.success) {
        setMessage(body.error ?? "That action could not be completed.");
        return;
      }
      if (body.board) setCurrent(body.board);
      setCommentFor(null);
      setComment("");
    } catch {
      setMessage("That action could not be completed.");
    } finally {
      setPending(false);
    }
  }

  const pageEntry =
    current.entries.find(
      (entry) => entry.artifactType === "co_branded_page_configuration"
    ) ?? null;

  return (
    <section className="mt-8" aria-labelledby="launch-prep-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="launch-prep-heading" className="text-xl font-black text-navy">
          Launch preparation
        </h2>
        <p className="text-xs text-grayWilma-700">
          Generated from this partner&rsquo;s current program setup data.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Launch preparation areas">
        {(
          [
            ["artifacts", "Artifacts"],
            ["co_branded_page", "Co-Branded Page"]
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`launch-prep-tab-${key}`}
            aria-selected={area === key}
            aria-controls={`launch-prep-area-${key}`}
            className={`inline-flex min-h-11 items-center rounded-md border px-4 py-2 text-sm font-bold ${
              area === key
                ? "border-navy bg-navy text-white"
                : "border-grayWilma-200 bg-white text-navy hover:border-teal hover:text-teal"
            }`}
            onClick={() => setArea(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange"
        >
          {message}
        </p>
      ) : null}

      {area === "co_branded_page" ? (
        <div
          className="mt-4"
          id="launch-prep-area-co_branded_page"
          role="tabpanel"
          aria-labelledby="launch-prep-tab-co_branded_page"
        >
          {pageEntry ? (
            <CoBrandedPagePanel
              entry={pageEntry}
              partnerSlug={partnerSlug}
              pending={pending}
              onMutate={mutate}
            />
          ) : null}
        </div>
      ) : (
      <div
        className="mt-4 space-y-4"
        id="launch-prep-area-artifacts"
        role="tabpanel"
        aria-labelledby="launch-prep-tab-artifacts"
      >
        {current.entries.map((entry) => (
          <ArtifactRow
            key={entry.artifactType}
            entry={entry}
            partnerSlug={partnerSlug}
            pending={pending}
            previewOpen={openPreview === entry.artifactType}
            historyOpen={openHistory === entry.artifactType}
            commentOpen={commentFor === entry.artifactType}
            comment={comment}
            onComment={setComment}
            onTogglePreview={() =>
              setOpenPreview(openPreview === entry.artifactType ? null : entry.artifactType)
            }
            onToggleHistory={() =>
              setOpenHistory(openHistory === entry.artifactType ? null : entry.artifactType)
            }
            onOpenComment={() =>
              setCommentFor(commentFor === entry.artifactType ? null : entry.artifactType)
            }
            onMutate={mutate}
          />
        ))}
      </div>
      )}
    </section>
  );
}

function ArtifactRow({
  entry,
  partnerSlug,
  pending,
  previewOpen,
  historyOpen,
  commentOpen,
  comment,
  onComment,
  onTogglePreview,
  onToggleHistory,
  onOpenComment,
  onMutate
}: {
  entry: ArtifactBoardEntry;
  partnerSlug: string;
  pending: boolean;
  previewOpen: boolean;
  historyOpen: boolean;
  commentOpen: boolean;
  comment: string;
  onComment: (value: string) => void;
  onTogglePreview: () => void;
  onToggleHistory: () => void;
  onOpenComment: () => void;
  onMutate: (action: string, payload: Record<string, unknown>) => void;
}) {
  const version = entry.currentVersion;
  // Reviews of the version on screen, so a change request is visible without
  // having to open version history.
  const currentReviews = version
    ? entry.reviews.filter((review) => review.versionNumber === version.versionNumber)
    : [];
  const canApprove =
    entry.available &&
    version !== null &&
    version.generationStatus === "succeeded" &&
    entry.sourceFreshness !== "stale" &&
    version.approvalStatus !== "approved";

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-navy">{entry.label}</h3>
          <p className="mt-1 text-xs text-grayWilma-700">
            {entry.available
              ? version
                ? `Version ${version.versionNumber}`
                : "No version yet"
              : "Planned for a later release"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={
              entry.sourceFreshness === "stale"
                ? "orange"
                : entry.sourceFreshness === "current"
                  ? "teal"
                  : "neutral"
            }
          >
            {FRESHNESS_COPY[entry.sourceFreshness]}
          </Badge>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Detail term="Generation">
          {!entry.available
            ? "Not yet available in this release"
            : !version
              ? "Not generated"
              : version.generationStatus === "failed"
                ? "Failed"
                : "Generated"}
        </Detail>
        <Detail term="LegalEase review">
          {version ? APPROVAL_COPY[version.approvalStatus] ?? version.approvalStatus : "—"}
        </Detail>
        <Detail term="Partner review">
          {version
            ? PARTNER_COPY[version.partnerReviewStatus] ?? version.partnerReviewStatus
            : "—"}
        </Detail>
        <Detail term="Last generated">
          {version ? version.generatedAt.slice(0, 10) : "—"}
        </Detail>
      </dl>

      {entry.blocker ? (
        <p className="mt-3 rounded-md border border-grayWilma-200 bg-[#faf9f7] px-3 py-2 text-xs font-semibold text-grayWilma-700">
          Blocked by: {entry.blocker}
        </p>
      ) : null}

      {entry.sourceFreshness === "stale" && entry.staleFields.length > 0 ? (
        <p className="mt-2 text-xs text-orange">
          Changed since this version: {entry.staleFields.join(", ")}
        </p>
      ) : null}

      {currentReviews.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {currentReviews.map((review) => (
            <li key={review.id} className="text-xs text-grayWilma-700">
              <span className="font-bold text-navy">
                {review.reviewerType === "partner" ? "Partner" : "LegalEase"} ·{" "}
                {review.decision.replace(/_/g, " ")} on version {review.versionNumber}
              </span>
              {review.comments ? ` — ${review.comments}` : ""}
            </li>
          ))}
        </ul>
      ) : null}

      {entry.available ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            disabled={pending}
            onClick={() =>
              onMutate(version ? "regenerate" : "generate", {
                artifactType: entry.artifactType
              })
            }
          >
            {version ? "Regenerate from current data" : "Generate draft"}
          </button>
          {version && version.generationStatus === "succeeded" ? (
            <>
              <button type="button" className={quietButtonClass} onClick={onTogglePreview}>
                {previewOpen ? "Hide preview" : "Preview"}
              </button>
              <button type="button" className={quietButtonClass} onClick={onOpenComment}>
                Request changes
              </button>
              <button
                type="button"
                className={quietButtonClass}
                disabled={pending || !canApprove}
                onClick={() =>
                  onMutate("approve", { artifactVersionId: version.id })
                }
              >
                Approve version
              </button>
              <button
                type="button"
                className={quietButtonClass}
                disabled={pending}
                onClick={() =>
                  onMutate("supersede", { artifactVersionId: version.id })
                }
              >
                Supersede
              </button>
              {version.approvalStatus === "approved" ? (
                <a
                  className={quietButtonClass}
                  href={`/api/internal/partners/onboarding/phase1/${encodeURIComponent(
                    partnerSlug
                  )}/artifacts/download?versionId=${encodeURIComponent(version.id)}`}
                >
                  Download approved snapshot
                </a>
              ) : null}
              {entry.versions.length > 1 ? (
                <button type="button" className={quietButtonClass} onClick={onToggleHistory}>
                  {historyOpen ? "Hide history" : `Version history (${entry.versions.length})`}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-grayWilma-200 bg-[#faf9f7] px-3 py-2 text-xs text-grayWilma-700">
          This document is not yet available in this release.
        </p>
      )}

      {commentOpen && version ? (
        <div className="mt-4 rounded-md border border-grayWilma-200 bg-[#faf9f7] p-3">
          <label
            className="text-xs font-bold text-navy"
            htmlFor={`comment-${entry.artifactType}`}
          >
            What needs to change?
          </label>
          <textarea
            id={`comment-${entry.artifactType}`}
            className={`${inputClass} mt-2 min-h-24`}
            value={comment}
            onChange={(event) => onComment(event.target.value)}
          />
          <button
            type="button"
            className={`${buttonClass} mt-2`}
            disabled={pending || comment.trim().length === 0}
            onClick={() =>
              onMutate("request_changes", {
                artifactVersionId: version.id,
                comments: comment.trim()
              })
            }
          >
            Send change request
          </button>
        </div>
      ) : null}

      {historyOpen ? (
        <div className="mt-4 space-y-2">
          {entry.versions.map((historic) => (
            <VersionHistoryRow
              key={historic.id}
              version={historic}
              partnerSlug={partnerSlug}
              reviews={entry.reviews.filter(
                (review) => review.versionNumber === historic.versionNumber
              )}
            />
          ))}
        </div>
      ) : null}

      {previewOpen && version?.document ? (
        <div className="mt-4">
          <ArtifactDocumentView document={version.document} versionNumber={version.versionNumber} />
        </div>
      ) : null}
    </Card>
  );
}

function VersionHistoryRow({
  version,
  partnerSlug,
  reviews
}: {
  version: ArtifactVersionView;
  partnerSlug: string;
  reviews: Array<{ decision: string; comments: string | null; reviewerType: string }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-grayWilma-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-navy">
          Version {version.versionNumber} · {version.generatedAt.slice(0, 10)} ·{" "}
          {APPROVAL_COPY[version.approvalStatus] ?? version.approvalStatus}
        </p>
        <button
          type="button"
          className={quietButtonClass}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Open"}
        </button>
      </div>
      {reviews.map((review, index) => (
        <p key={index} className="mt-2 text-xs text-grayWilma-700">
          <span className="font-bold text-navy">
            {review.reviewerType === "partner" ? "Partner" : "LegalEase"} ·{" "}
            {review.decision.replace(/_/g, " ")}
          </span>
          {review.comments ? ` — ${review.comments}` : ""}
        </p>
      ))}
      {open && version.document ? (
        <div className="mt-3">
          <ArtifactDocumentView
            document={version.document}
            versionNumber={version.versionNumber}
          />
          {version.approvalStatus === "approved" ? (
            <a
              className={`${quietButtonClass} mt-3`}
              href={`/api/internal/partners/onboarding/phase1/${encodeURIComponent(
                partnerSlug
              )}/artifacts/download?versionId=${encodeURIComponent(version.id)}`}
            >
              Download this version
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Detail({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.68rem] font-bold uppercase tracking-wide text-grayWilma-700">
        {term}
      </dt>
      <dd className="mt-1 text-sm text-navy">{children}</dd>
    </div>
  );
}
