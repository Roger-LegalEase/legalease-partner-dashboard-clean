import Link from "next/link";
import { PlugZap } from "lucide-react";

import { ContentDenied } from "@/components/content/admin/ContentDenied";
import {
  EmptyState,
  Panel,
  Pill,
  StatCard,
  StatusPill,
  humanize
} from "@/components/content/admin/primitives";
import { resolveContentPageAccess } from "@/lib/content/auth";
import { listSocialQueue } from "@/lib/content/cms-queries";
import { getCommandCenterConfig } from "@/lib/content/command-center";
import { SOCIAL_CHANNEL_LIMITS } from "@/lib/content/types";

export const dynamic = "force-dynamic";

const UNCONFIGURED_REASONS: Record<string, string> = {
  disabled: "COMMAND_CENTER_CONTENT_EVENTS_ENABLED is not set to true in this environment.",
  missing_endpoint: "COMMAND_CENTER_CONTENT_EVENTS_ENDPOINT is not set.",
  missing_secret: "COMMAND_CENTER_CONTENT_SIGNING_SECRET is not set."
};

export default async function SocialQueuePage() {
  // GATE FIRST.
  const access = await resolveContentPageAccess("/internal/content/social");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const queue = await listSocialQueue();
  const commandCenter = getCommandCenterConfig();

  const allDrafts = queue.flatMap((entry) => entry.drafts);
  const approved = allDrafts.filter((draft) => draft.approvalState === "approved").length;
  const sent = allDrafts.filter((draft) => draft.approvalState === "sent").length;
  const failed = allDrafts.filter((draft) => draft.approvalState === "failed").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-navy">Social queue</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          LegalEase owns the copy, the assets, and the approval. The Command Center owns connected
          accounts, scheduling, and posting. Nothing on this page posts to a social network.
        </p>
      </header>

      {commandCenter.configured ? (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Connected to the Command Center. Approved promotion packages can be handed off.
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-md border border-slate-300 bg-white px-4 py-3">
          <PlugZap className="mt-0.5 h-4 w-4 text-slate-500" aria-hidden="true" />
          <div>
            <p className="text-sm font-bold text-slate-700">Not connected to the Command Center</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {UNCONFIGURED_REASONS[commandCenter.reason] ??
                "The content-events integration is not configured."}{" "}
              You can still draft, approve, and export promotion packages as JSON — sending is disabled
              and will not silently pretend to succeed.
            </p>
          </div>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Posts with drafts" value={queue.length} />
        <StatCard label="Approved channels" value={approved} />
        <StatCard label="Sent" value={sent} />
        <StatCard label="Failed" value={failed} />
      </section>

      <Panel title="Promotion drafts">
        {queue.length === 0 ? (
          <EmptyState
            message="No promotion drafts."
            hint="Open an article and write its channel copy in the promotion composer."
          />
        ) : (
          <ul className="divide-y divide-slate-200">
            {queue.map((entry) => (
              <li key={entry.post.postId} className="py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/internal/content/articles/${entry.post.postId}`}
                    className="text-sm font-bold text-navy hover:underline"
                  >
                    {entry.post.title}
                  </Link>
                  <StatusPill status={entry.post.status} />
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.drafts.map((draft) => {
                    const limit = SOCIAL_CHANNEL_LIMITS[draft.channel];
                    const length = draft.primaryCaption?.length ?? 0;
                    const over = length > limit;
                    return (
                      <div
                        key={draft.socialDraftId}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-navy">
                            {humanize(draft.channel)}
                          </span>
                          <Pill
                            tone={
                              draft.approvalState === "approved"
                                ? "ok"
                                : draft.approvalState === "failed"
                                  ? "block"
                                  : "neutral"
                            }
                          >
                            {draft.approvalState}
                          </Pill>
                        </div>
                        <p
                          className={`mt-1 text-[11px] font-bold tabular-nums ${
                            over ? "text-red-700" : "text-slate-500"
                          }`}
                        >
                          {length} / {limit}
                          {over ? " — over limit" : ""}
                        </p>
                        <p className="mt-1 max-w-xs truncate text-[11px] text-slate-600">
                          {draft.primaryCaption || "No caption yet"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
