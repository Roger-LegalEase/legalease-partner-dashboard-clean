import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getStatePromotionRecord } from "@/lib/rcap/state-promotion-manifest";
import { canApproveForLive, canBecomeLive, getRecommendedPromotionAction } from "@/lib/rcap/state-promotion-rules";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";

export const dynamic = "force-dynamic";

export default async function RcapPromotionStatePage({
  params
}: {
  params: Promise<{ state: string }>;
}) {
  const { state: stateSlug } = await params;
  const access = await resolveInternalAdminPageAccess(`/internal/record-clearing/promotion/${stateSlug}`);

  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  const record = getStatePromotionRecord(stateSlug);
  if (!record) notFound();

  const approve = canApproveForLive(record);
  const live = canBecomeLive(record);
  const reviewArtifactPath = `tmp/review-inbox/all50/${record.slug}`;

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/internal/record-clearing/promotion" className="inline-flex items-center gap-2 text-sm font-black text-[#31465b]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Promotion index
          </Link>
          <Link href={`/internal/record-clearing/states/${record.slug}/review`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid">
            Review artifacts
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.42fr]">
          <div>
            <Badge tone="blue">Internal admin only</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy md:text-5xl">{record.jurisdiction} promotion detail</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Promotion controls for reviewed state output. A state cannot become approved_for_live until every required review gate passes and blockers are cleared.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-navy">Current promotion status</p>
                <p className="mt-1 text-xs text-grayWilma-600">{record.promotionStatus}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-grayWilma-600">Access gated to internal_admin.</p>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatusCard label="QA review" value={record.qaReview} />
          <StatusCard label="Attorney review" value={record.attorneyReview} />
          <StatusCard label="Source freshness" value={record.sourceFreshnessReview} />
          <StatusCard label="Visual review" value={record.visualReview} />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.78fr]">
          <Card className="rounded-md p-5">
            <h2 className="text-xl font-black text-navy">Promotion gate checklist</h2>
            <ChecklistItem label="QA review passed" passed={record.qaReview === "passed"} />
            <ChecklistItem label="Attorney review passed" passed={record.attorneyReview === "passed"} />
            <ChecklistItem label="Source freshness review passed" passed={record.sourceFreshnessReview === "passed"} />
            <ChecklistItem label="Visual review passed or not required" passed={record.visualReview === "passed" || record.visualReview === "not_required"} />
            <ChecklistItem label="No blockers" passed={record.blockers.length === 0} />
            <div className="mt-5 rounded-md border border-grayWilma-200 bg-[#fbfcfa] p-4">
              <p className="text-sm font-black text-navy">Eligible for approved_for_live</p>
              <Badge className="mt-3" tone={approve.eligible ? "teal" : "neutral"}>{String(approve.eligible)}</Badge>
              {approve.reasons.length > 0 ? (
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-grayWilma-700">
                  {approve.reasons.map((reason) => <li key={reason}>- {reason}</li>)}
                </ul>
              ) : null}
            </div>
          </Card>

          <Card className="rounded-md p-5">
            <h2 className="text-xl font-black text-navy">Links and paths</h2>
            <Meta label="Review artifact path" value={reviewArtifactPath} />
            <Link href={`/internal/record-clearing/states/${record.slug}`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-grayWilma-200 px-4 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100">
              Handoff detail route
            </Link>
            <Link href={`/internal/record-clearing/states/${record.slug}/review`} className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md border border-grayWilma-200 px-4 py-2 text-sm font-semibold text-navy transition hover:bg-grayWilma-100">
              Review artifact route
            </Link>
            <div className="mt-5">
              <p className="text-sm font-black text-navy">Recommended next action</p>
              <p className="mt-2 text-sm leading-6 text-grayWilma-700">{getRecommendedPromotionAction(record)}</p>
            </div>
          </Card>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <Card className="rounded-md p-5">
            <h2 className="text-xl font-black text-navy">Channel approvals</h2>
            <ChannelRow label="Internal preview" value={record.approvedChannels.internalPreview} />
            <ChannelRow label="Partner RCAP" value={record.approvedChannels.partnerRcap} />
            <ChannelRow label="Expungement.ai" value={record.approvedChannels.expungementAi} />
            <p className="mt-4 text-xs leading-5 text-grayWilma-600">Partner RCAP and Expungement.ai approvals are separate channel controls.</p>
          </Card>

          <Card className="rounded-md p-5">
            <h2 className="text-xl font-black text-navy">Live controls</h2>
            <Meta label="Approved for live" value={String(record.approvedForLive)} />
            <Meta label="Live enabled" value={String(record.liveEnabled)} />
            <Meta label="Can become live" value={String(live.eligible)} />
            {live.reasons.length > 0 ? <ReasonList reasons={live.reasons} /> : null}
          </Card>

          <Card className="rounded-md p-5">
            <h2 className="text-xl font-black text-navy">Blockers and notes</h2>
            <List items={record.blockers} empty="No blockers." />
            <div className="mt-5">
              <p className="text-sm font-black text-navy">Reviewer notes</p>
              <List items={record.reviewerNotes} empty="No reviewer notes." />
            </div>
            <Meta label="Approved at" value={record.approvedAt ?? "pending"} />
            <Meta label="Approved by" value={record.approvedBy ?? "pending"} />
          </Card>
        </section>
      </div>
    </main>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  const tone = value === "passed" || value === "not_required" ? "teal" : value === "failed" ? "orange" : "neutral";
  return (
    <Card className="rounded-md p-5">
      <p className="text-sm font-semibold text-grayWilma-700">{label}</p>
      <Badge className="mt-3" tone={tone}>{value}</Badge>
    </Card>
  );
}

function ChecklistItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-grayWilma-200 bg-[#fbfcfa] px-3 py-2">
      <span className="text-sm font-semibold text-grayWilma-700">{label}</span>
      <Badge tone={passed ? "teal" : "neutral"}>{passed ? "passed" : "pending"}</Badge>
    </div>
  );
}

function ChannelRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-grayWilma-200 bg-[#fbfcfa] px-3 py-2">
      <span className="text-sm font-semibold text-grayWilma-700">{label}</span>
      <Badge tone={value ? "teal" : "neutral"}>{value ? "approved" : "off"}</Badge>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-black uppercase text-grayWilma-600">{label}</p>
      <p className="mt-1 break-words text-sm text-grayWilma-800">{value}</p>
    </div>
  );
}

function ReasonList({ reasons }: { reasons: string[] }) {
  return (
    <ul className="mt-3 grid gap-2 text-sm leading-6 text-grayWilma-700">
      {reasons.map((reason) => <li key={reason}>- {reason}</li>)}
    </ul>
  );
}

function List({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="mt-3 text-sm text-grayWilma-700">{empty}</p>;
  return (
    <ul className="mt-3 grid gap-2 text-sm leading-6 text-grayWilma-700">
      {items.map((item) => <li key={item}>- {item}</li>)}
    </ul>
  );
}
