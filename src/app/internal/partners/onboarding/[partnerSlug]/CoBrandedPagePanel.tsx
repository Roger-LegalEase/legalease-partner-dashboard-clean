"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CoBrandedPageView } from "@/components/partners/onboarding/CoBrandedPageView";
import type { ArtifactBoardEntry } from "@/lib/partners/onboarding/artifact-service";

import { invalidationSummary } from "./Phase2AArtifactsPanel";

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-teal disabled:cursor-not-allowed disabled:opacity-50";
const quietButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-xs font-bold text-navy hover:border-teal hover:text-teal disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The internal co-branded page area. Its only actions are preparing a draft and
 * approving one: there is no publish control, no activate control, and no route
 * from here that could make the page reachable by a participant.
 */
export function CoBrandedPagePanel({
  entry,
  partnerSlug,
  pending,
  onMutate
}: {
  entry: ArtifactBoardEntry;
  partnerSlug: string;
  pending: boolean;
  onMutate: (action: string, payload: Record<string, unknown>) => void;
}) {
  const [ownershipReview, setOwnershipReview] = useState(false);
  const [previewVariant, setPreviewVariant] = useState<"desktop" | "mobile">(
    "desktop"
  );
  const version = entry.currentVersion;
  const preview = version?.document?.pagePreview ?? null;
  const canApprove =
    version !== null &&
    version.generationStatus === "succeeded" &&
    entry.sourceFreshness !== "stale" &&
    version.approvalStatus !== "approved";

  const logoSrc =
    preview?.logo.assetId && preview.showPartnerLogo
      ? `/api/internal/partners/onboarding/phase1/${encodeURIComponent(
          partnerSlug
        )}/assets/${encodeURIComponent(preview.logo.assetId)}`
      : null;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-navy">
              Co-branded page configuration
            </h3>
            <p className="mt-1 text-xs text-grayWilma-700">
              {version
                ? `Draft version ${version.versionNumber}`
                : "No draft prepared yet"}
            </p>
          </div>
          <Badge
            tone={
              entry.sourceFreshness === "stale"
                ? "orange"
                : entry.sourceFreshness === "current"
                  ? "teal"
                  : "neutral"
            }
          >
            {entry.sourceFreshness === "stale"
              ? "Out of date with program data"
              : entry.sourceFreshness === "current"
                ? "Current with program data"
                : "Not prepared"}
          </Badge>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <Detail term="LegalEase approval">
            {version?.approvalStatus === "approved"
              ? "Approved by LegalEase"
              : version?.approvalStatus === "changes_requested"
                ? "Changes requested"
                : version
                  ? "Awaiting LegalEase review"
                  : "—"}
          </Detail>
          <Detail term="Partner approval">
            {version?.partnerReviewStatus === "approved"
              ? "Approved by the partner"
              : version?.partnerReviewStatus === "awaiting_partner"
                ? "Awaiting partner review"
                : version?.partnerReviewStatus === "changes_requested"
                  ? "Partner requested a correction"
                  : "Not yet sent to the partner"}
          </Detail>
          <Detail term="Publication">Not published</Detail>
        </dl>

        {entry.sourceFreshness === "stale" && entry.staleFields.length > 0 ? (
          <>
            <p className="mt-3 text-xs text-orange">
              Changed since this version: {entry.staleFields.join(", ")}
            </p>
            <p className="mt-1 text-xs font-bold text-orange">
              {invalidationSummary(entry.invalidatedApprovals)}
            </p>
          </>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            disabled={pending}
            onClick={() =>
              onMutate(version ? "regenerate" : "generate", {
                artifactType: "co_branded_page_configuration"
              })
            }
          >
            {version ? "Prepare a new draft from current data" : "Prepare draft"}
          </button>
          {version && version.generationStatus === "succeeded" ? (
            <button
              type="button"
              className={quietButtonClass}
              disabled={pending || !canApprove}
              onClick={() =>
                onMutate("approve", { artifactVersionId: version.id })
              }
            >
              Approve as LegalEase
            </button>
          ) : null}
        </div>

        <p className="mt-3 text-xs text-grayWilma-700">
          Preparing and approving this configuration does not publish the page,
          activate the program, or release an access code.
        </p>
      </Card>

      {preview ? (
        <>
          <Card className="p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div>
                <h4 className="text-sm font-black uppercase tracking-wide text-navy">
                  Content ownership review
                </h4>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-grayWilma-700">
                  Enable the internal overlay to compare partner supplied,
                  LegalEase controlled, and system derived groups. The overlay
                  is not stored and never enters participant output.
                </p>
              </div>
              <button
                aria-pressed={ownershipReview}
                className={quietButtonClass}
                onClick={() => setOwnershipReview((enabled) => !enabled)}
                type="button"
              >
                {ownershipReview
                  ? "Disable ownership review"
                  : "Enable ownership review"}
              </button>
            </div>

            <h4 className="mt-5 text-sm font-black uppercase tracking-wide text-navy">
              Missing before this page can be approved
            </h4>
            {preview.missing.length === 0 ? (
              <p className="mt-2 text-sm text-grayWilma-700">
                Every field and asset this page needs has been provided.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {preview.missing.map((item) => (
                  <li
                    key={item.label}
                    className="rounded-md border border-orange/30 bg-orange/10 px-3 py-2 text-sm text-orange"
                  >
                    <span className="font-bold">{item.label}</span>. Set this in{" "}
                    {item.whereToSet}.
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <section aria-labelledby="cobranded-preview-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4
                  id="cobranded-preview-heading"
                  className="text-sm font-black uppercase tracking-wide text-navy"
                >
                  Authorized private preview
                </h4>
                <p className="mt-1 text-xs text-grayWilma-700">
                  This page is not published and participant intake is inactive.
                </p>
              </div>
              <div
                aria-label="Preview size"
                className="inline-flex border border-grayWilma-200"
                role="group"
              >
                {(["desktop", "mobile"] as const).map((variant) => (
                  <button
                    aria-pressed={previewVariant === variant}
                    className={
                      previewVariant === variant
                        ? "min-h-11 bg-navy px-4 py-2 text-xs font-bold capitalize text-white"
                        : "min-h-11 bg-white px-4 py-2 text-xs font-bold capitalize text-navy hover:text-teal"
                    }
                    key={variant}
                    onClick={() => setPreviewVariant(variant)}
                    type="button"
                  >
                    {variant}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <CoBrandedPageView
                logoSrc={logoSrc}
                ownershipReview={ownershipReview}
                preview={preview}
                variant={previewVariant}
              />
            </div>
          </section>
        </>
      ) : (
        <Card className="p-5">
          <p className="text-sm text-grayWilma-700">
            Prepare a draft to see the desktop and mobile previews built from
            this partner&rsquo;s own logo, name, and fields.
          </p>
        </Card>
      )}
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
