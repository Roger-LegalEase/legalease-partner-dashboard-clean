"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ArtifactDocumentView } from "@/components/partners/onboarding/ArtifactDocumentView";
import { CoBrandedPageView } from "@/components/partners/onboarding/CoBrandedPageView";
import { ACTION_FAILURE_COPY } from "@/lib/partners/onboarding/partner-copy";
import type {
  ArtifactBoard,
  ArtifactBoardEntry
} from "@/lib/partners/onboarding/artifact-service";

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-teal disabled:cursor-not-allowed disabled:opacity-50";
const quietButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-xs font-bold text-navy hover:border-teal hover:text-teal disabled:cursor-not-allowed disabled:opacity-50";
const inputClass =
  "min-h-11 w-full rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-sm text-navy outline-none focus:border-teal focus:ring-2 focus:ring-teal/25";

/**
 * The partner sees its own asset through the existing tenant-scoped asset
 * route. No public or signed URL is placed in the page.
 */
function partnerLogoSrc(
  preview: NonNullable<
    NonNullable<ArtifactBoardEntry["currentVersion"]>["document"]
  >["pagePreview"]
): string | null {
  if (!preview?.logo.assetId || !preview.showPartnerLogo) return null;
  return `/api/partners/onboarding/assets/${encodeURIComponent(
    preview.logo.assetId
  )}`;
}

export function PartnerArtifactsClient({
  board,
  canReview
}: {
  board: ArtifactBoard;
  canReview: boolean;
}) {
  const [current, setCurrent] = useState(board);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [openPreview, setOpenPreview] = useState<string | null>(null);
  const [correctionFor, setCorrectionFor] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const awaiting = current.entries.filter(
    (entry) =>
      entry.currentVersion?.partnerReviewStatus === "awaiting_partner" &&
      entry.currentVersion.approvalStatus === "approved"
  );
  const approved = current.entries.filter(
    (entry) =>
      entry.currentVersion?.partnerReviewStatus === "approved" &&
      entry.currentVersion.approvalStatus === "approved"
  );

  async function mutate(action: string, payload: Record<string, unknown>) {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/partners/onboarding/artifacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, requestId: crypto.randomUUID(), payload })
      });
      const body = (await response.json()) as {
        success?: boolean;
        error?: string;
        board?: ArtifactBoard;
      };
      if (!response.ok || !body.success) {
        setMessage(ACTION_FAILURE_COPY);
        return;
      }
      if (body.board) setCurrent(body.board);
      setCorrectionFor(null);
      setComment("");
    } catch {
      setMessage(ACTION_FAILURE_COPY);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {message ? (
        <p
          role="alert"
          className="rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange"
        >
          {message}
        </p>
      ) : null}

      <section aria-labelledby="awaiting-heading">
        <h2 id="awaiting-heading" className="text-lg font-black text-navy">
          Waiting for your review
        </h2>
        {awaiting.length === 0 ? (
          <p className="mt-2 text-sm text-grayWilma-700">
            Nothing is waiting for your review right now.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {awaiting.map((entry) => (
              <PartnerArtifactCard
                key={entry.artifactType}
                entry={entry}
                canReview={canReview}
                pending={pending}
                previewOpen={openPreview === entry.artifactType}
                correctionOpen={correctionFor === entry.artifactType}
                comment={comment}
                onComment={setComment}
                onTogglePreview={() =>
                  setOpenPreview(
                    openPreview === entry.artifactType ? null : entry.artifactType
                  )
                }
                onOpenCorrection={() =>
                  setCorrectionFor(
                    correctionFor === entry.artifactType ? null : entry.artifactType
                  )
                }
                onMutate={mutate}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="approved-heading">
        <h2 id="approved-heading" className="text-lg font-black text-navy">
          Approved and available to download
        </h2>
        {approved.length === 0 ? (
          <p className="mt-2 text-sm text-grayWilma-700">
            Approved documents will appear here.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {approved.map((entry) => (
              <PartnerArtifactCard
                key={entry.artifactType}
                entry={entry}
                canReview={canReview}
                pending={pending}
                previewOpen={openPreview === entry.artifactType}
                correctionOpen={correctionFor === entry.artifactType}
                comment={comment}
                onComment={setComment}
                onTogglePreview={() =>
                  setOpenPreview(
                    openPreview === entry.artifactType ? null : entry.artifactType
                  )
                }
                onOpenCorrection={() =>
                  setCorrectionFor(
                    correctionFor === entry.artifactType ? null : entry.artifactType
                  )
                }
                onMutate={mutate}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PartnerArtifactCard({
  entry,
  canReview,
  pending,
  previewOpen,
  correctionOpen,
  comment,
  onComment,
  onTogglePreview,
  onOpenCorrection,
  onMutate
}: {
  entry: ArtifactBoardEntry;
  canReview: boolean;
  pending: boolean;
  previewOpen: boolean;
  correctionOpen: boolean;
  comment: string;
  onComment: (value: string) => void;
  onTogglePreview: () => void;
  onOpenCorrection: () => void;
  onMutate: (action: string, payload: Record<string, unknown>) => void;
}) {
  const version = entry.currentVersion;
  if (!version) return null;
  const partnerApproved = version.partnerReviewStatus === "approved";

  return (
    <Card className="p-5" data-artifact-type={entry.artifactType}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-navy">{entry.label}</h3>
          <p className="mt-1 text-xs text-grayWilma-700">
            Version {version.versionNumber} · prepared{" "}
            {version.generatedAt.slice(0, 10)}
          </p>
        </div>
        <Badge tone={partnerApproved ? "teal" : "orange"}>
          {partnerApproved ? "You approved this" : "Needs your review"}
        </Badge>
      </div>

      {version.partnerVisibleInstructions ? (
        <p className="mt-3 rounded-md border border-grayWilma-200 bg-[#faf9f7] px-3 py-2 text-sm text-grayWilma-700">
          {version.partnerVisibleInstructions}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={quietButtonClass} onClick={onTogglePreview}>
          {previewOpen ? "Hide preview" : "Preview"}
        </button>
        {canReview && !partnerApproved ? (
          <>
            <button
              type="button"
              className={buttonClass}
              disabled={pending}
              onClick={() =>
                onMutate("approve", { artifactVersionId: version.id })
              }
            >
              Approve facts and branding
            </button>
            <button type="button" className={quietButtonClass} onClick={onOpenCorrection}>
              Request correction
            </button>
          </>
        ) : null}
        {partnerApproved ? (
          <a
            className={quietButtonClass}
            href={`/api/partners/onboarding/artifacts/download?versionId=${encodeURIComponent(
              version.id
            )}`}
          >
            Download approved resource
          </a>
        ) : null}
      </div>

      {!canReview ? (
        <p className="mt-3 text-xs text-grayWilma-700">
          Your account can view these documents. A partner administrator approves
          them.
        </p>
      ) : null}

      {correctionOpen ? (
        <div className="mt-4 rounded-md border border-grayWilma-200 bg-[#faf9f7] p-3">
          <label
            className="text-xs font-bold text-navy"
            htmlFor={`correction-${entry.artifactType}`}
          >
            What is incorrect?
          </label>
          <textarea
            id={`correction-${entry.artifactType}`}
            className={`${inputClass} mt-2 min-h-24`}
            value={comment}
            onChange={(event) => onComment(event.target.value)}
          />
          <button
            type="button"
            className={`${buttonClass} mt-2`}
            disabled={pending || comment.trim().length === 0}
            onClick={() =>
              onMutate("request_correction", {
                artifactVersionId: version.id,
                comments: comment.trim()
              })
            }
          >
            Send correction request
          </button>
        </div>
      ) : null}

      {previewOpen && version.document ? (
        <div className="mt-4 space-y-5">
          {version.document.pagePreview ? (
            <>
              <p className="text-xs text-grayWilma-700">
                This is how the co-branded participant page would look. The page
                is not published and participant intake is inactive. LegalEase
                controls the legal and product language.
              </p>
              <CoBrandedPageView
                preview={version.document.pagePreview}
                variant="desktop"
                logoSrc={partnerLogoSrc(version.document.pagePreview)}
              />
              <CoBrandedPageView
                preview={version.document.pagePreview}
                variant="mobile"
                logoSrc={partnerLogoSrc(version.document.pagePreview)}
              />
            </>
          ) : null}
          <ArtifactDocumentView
            document={version.document}
            versionNumber={version.versionNumber}
          />
        </div>
      ) : null}
    </Card>
  );
}
