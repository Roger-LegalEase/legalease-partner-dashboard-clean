"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LaunchKitView } from "@/components/partners/onboarding/LaunchKitView";
import type { ArtifactBoardEntry } from "@/lib/partners/onboarding/artifact-service";

const quietButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-md border border-grayWilma-200 bg-white px-3 py-2 text-xs font-bold text-navy hover:border-teal hover:text-teal";

/**
 * What the partner can actually get hold of today. A resource is listed as
 * available only when LegalEase has approved the version behind it, so this
 * area never promises a partner something it cannot open.
 */
export function ResourcesPanel({
  partnerSlug,
  entries
}: {
  partnerSlug: string;
  entries: ArtifactBoardEntry[];
}) {
  const launchKit =
    entries.find((entry) => entry.artifactType === "partner_launch_kit") ?? null;
  const launchKitPayload = launchKit?.currentVersion?.document?.launchKit ?? null;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="text-base font-black text-navy">
          Resources available to this partner
        </h3>
        <p className="mt-1 text-sm text-grayWilma-700">
          A resource becomes available to the partner once LegalEase approves
          its current version. Nothing here sends a resource anywhere.
        </p>

        <ul className="mt-4 space-y-2">
          {entries.map((entry) => {
            const version = entry.currentVersion;
            const approved = version?.approvalStatus === "approved";
            return (
              <li
                key={entry.artifactType}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-grayWilma-200 px-3 py-2"
                data-resource-type={entry.artifactType}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy">{entry.label}</p>
                  <p className="text-xs text-grayWilma-700">
                    {version
                      ? `Version ${version.versionNumber}`
                      : "Not prepared yet"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={approved ? "teal" : "neutral"}>
                    {approved ? "Available to the partner" : "Not yet available"}
                  </Badge>
                  {approved && version ? (
                    <a
                      className={quietButtonClass}
                      href={`/api/internal/partners/onboarding/phase1/${encodeURIComponent(
                        partnerSlug
                      )}/artifacts/download?versionId=${encodeURIComponent(
                        version.id
                      )}`}
                    >
                      Download
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {launchKitPayload ? (
        <section aria-labelledby="internal-launch-kit-heading">
          <h3
            id="internal-launch-kit-heading"
            className="text-sm font-black uppercase tracking-wide text-navy"
          >
            Partner launch kit
          </h3>
          <div className="mt-3">
            <LaunchKitView launchKit={launchKitPayload} />
          </div>
        </section>
      ) : (
        <Card className="p-5">
          <p className="text-sm text-grayWilma-700">
            Generate the Partner Launch Kit in Artifacts to see its code and
            outreach copy here.
          </p>
        </Card>
      )}
    </div>
  );
}
