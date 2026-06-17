import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getStatePromotionRecords, type StatePromotionRecord } from "@/lib/rcap/state-promotion-manifest";
import { canApproveForLive, getRecommendedPromotionAction } from "@/lib/rcap/state-promotion-rules";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";

export const dynamic = "force-dynamic";

export default async function RcapPromotionPage() {
  const access = await resolveInternalAdminPageAccess("/internal/record-clearing/promotion");

  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  const records = getStatePromotionRecords();

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">
          <div>
            <Badge tone="blue">Internal admin only</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy md:text-5xl">RCAP state promotion</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Controlled state-by-state movement from state_built to approved_for_live and live. This dashboard records review gates and channel approvals without changing public routing.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-navy">Promotion gate</p>
                <p className="text-xs text-grayWilma-600">{records.length} jurisdictions gated to internal_admin</p>
              </div>
            </div>
            <Link href="/internal/record-clearing/handoff" className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid">
              Handoff dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Jurisdictions" value={records.length} />
          <SummaryCard label="State built" value={records.filter((record) => record.buildStatus === "state_built").length} />
          <SummaryCard label="Approved for live" value={records.filter((record) => record.promotionStatus === "approved_for_live").length} />
          <SummaryCard label="Live enabled" value={records.filter((record) => record.liveEnabled).length} />
          <SummaryCard label="Blocked" value={records.filter((record) => record.promotionStatus === "blocked" || record.blockers.length > 0).length} />
        </section>

        <section className="mt-8 overflow-hidden rounded-md border border-grayWilma-200 bg-white shadow-sm">
          <div className="border-b border-grayWilma-200 px-5 py-4">
            <h2 className="text-lg font-black text-navy">Promotion index</h2>
            <p className="mt-1 text-sm text-grayWilma-700">Review gates, channel approvals, blockers, and recommended next actions.</p>
          </div>
          <div className="hidden border-b border-grayWilma-200 bg-[#f7f8f6] px-5 py-3 text-xs font-black uppercase text-grayWilma-600 xl:grid xl:grid-cols-[1fr_0.62fr_0.72fr_0.72fr_0.78fr_0.7fr_0.8fr_0.7fr_0.7fr_1fr_0.45fr] xl:items-center">
            <span>State</span>
            <span>QA</span>
            <span>Attorney</span>
            <span>Source</span>
            <span>Visual</span>
            <span>Approved</span>
            <span>Live enabled</span>
            <span>Channels</span>
            <span>Blockers</span>
            <span>Next action</span>
            <span>Detail</span>
          </div>
          <div className="divide-y divide-grayWilma-200">
            {records.map((record) => (
              <PromotionRow key={record.abbreviation} record={record} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-md p-5">
      <p className="text-sm font-semibold text-grayWilma-700">{label}</p>
      <p className="mt-3 text-3xl font-black text-navy">{value}</p>
    </Card>
  );
}

function PromotionRow({ record }: { record: StatePromotionRecord }) {
  const eligible = canApproveForLive(record).eligible;
  return (
    <article className="grid gap-4 px-5 py-5 xl:grid-cols-[1fr_0.62fr_0.72fr_0.72fr_0.78fr_0.7fr_0.8fr_0.7fr_0.7fr_1fr_0.45fr] xl:items-center">
      <div>
        <p className="font-black text-navy">{record.jurisdiction}</p>
        <p className="mt-1 text-xs text-grayWilma-600">{record.abbreviation} · {record.promotionStatus}</p>
      </div>
      <StatusBadge value={record.qaReview} />
      <StatusBadge value={record.attorneyReview} />
      <StatusBadge value={record.sourceFreshnessReview} />
      <StatusBadge value={record.visualReview} />
      <Badge tone={record.approvedForLive ? "teal" : eligible ? "blue" : "neutral"}>{String(record.approvedForLive)}</Badge>
      <Badge tone={record.liveEnabled ? "teal" : "neutral"}>{String(record.liveEnabled)}</Badge>
      <p className="text-xs leading-5 text-grayWilma-700">
        Internal {flag(record.approvedChannels.internalPreview)} · Partner {flag(record.approvedChannels.partnerRcap)} · ExpAI {flag(record.approvedChannels.expungementAi)}
      </p>
      <p className="text-sm font-black text-navy">{record.blockers.length}</p>
      <p className="text-xs leading-5 text-grayWilma-700">{getRecommendedPromotionAction(record)}</p>
      <Link href={`/internal/record-clearing/promotion/${record.slug}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid">
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Open {record.jurisdiction} promotion detail</span>
      </Link>
    </article>
  );
}

function StatusBadge({ value }: { value: string }) {
  const tone = value === "passed" || value === "not_required" ? "teal" : value === "failed" ? "orange" : "neutral";
  return <Badge tone={tone}>{value}</Badge>;
}

function flag(value: boolean) {
  return value ? "yes" : "no";
}
