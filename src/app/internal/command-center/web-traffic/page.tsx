import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Globe, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import {
  getWebAnalyticsSummary,
  normalizeSummaryRange,
  type SummaryRange,
  type WebAnalyticsSummary
} from "@/lib/analytics/web-analytics-repository";

export const dynamic = "force-dynamic";

const RANGES: Array<{ value: SummaryRange; label: string }> = [
  { value: "1d", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" }
];

export default async function CommandCenterWebTrafficPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await resolveInternalAdminPageAccess("/internal/command-center/web-traffic");
  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  const params = (await searchParams) ?? {};
  const rangeParam = Array.isArray(params.range) ? params.range[0] : params.range;
  const range = normalizeSummaryRange(rangeParam);
  const summary = await getWebAnalyticsSummary(range);

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <Link href="/partner/dashboard" className="inline-flex items-center gap-2 text-sm font-black text-[#31465b]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Command Center
        </Link>

        <section className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge tone="blue">Internal admin only</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy md:text-5xl">Web traffic</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
              First-party, privacy-safe web analytics owned by LegalEase across expungement.ai, legalease.com, and
              legaleasepartner.com. Aggregate counts only — no raw IP, no PII, no criminal-record answers.
            </p>
          </div>
          <div className="flex gap-2">
            {RANGES.map((option) => (
              <Link
                key={option.value}
                href={`/internal/command-center/web-traffic?range=${option.value}`}
                className={`inline-flex min-h-9 items-center rounded-md px-3 text-xs font-black transition ${
                  option.value === range ? "bg-navy text-white" : "border border-grayWilma-200 bg-white text-navy hover:bg-grayWilma-50"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </section>

        {!summary ? (
          <Card className="mt-8 rounded-md p-6">
            <p className="text-sm font-black text-navy">Analytics store not available</p>
            <p className="mt-2 text-sm leading-6 text-grayWilma-700">
              The web analytics table is not readable in this environment. Confirm Supabase is configured and the
              phase-40 migration has been applied. No numbers are fabricated when the source is unavailable.
            </p>
          </Card>
        ) : (
          <WebTrafficBody summary={summary} />
        )}
      </div>
    </main>
  );
}

function WebTrafficBody({ summary }: { summary: WebAnalyticsSummary }) {
  return (
    <>
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Pageviews" value={summary.totals.pageviews} />
        <MetricCard icon={<Globe className="h-5 w-5" />} label="Unique visitors" value={summary.totals.visitors} />
        <MetricCard icon={<BarChart3 className="h-5 w-5" />} label="Sessions" value={summary.totals.sessions} />
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <PanelCard title="Traffic by domain">
          <RankedList
            rows={summary.byDomain.map((entry) => ({
              label: entry.domain,
              detail: `${entry.visitors.toLocaleString()} visitors`,
              value: entry.pageviews
            }))}
            emptyLabel="No pageviews in range."
          />
        </PanelCard>

        <PanelCard title="Top pages">
          <RankedList
            rows={summary.topPages.map((entry) => ({
              label: entry.path,
              detail: entry.domain,
              value: entry.pageviews
            }))}
            emptyLabel="No pageviews in range."
          />
        </PanelCard>

        <PanelCard title="Top referrers">
          <RankedList
            rows={summary.topReferrers.map((entry) => ({ label: entry.referrer, value: entry.pageviews }))}
            emptyLabel="No external referrers in range."
          />
        </PanelCard>

        <PanelCard title="UTM campaigns">
          <RankedList
            rows={summary.utmCampaigns.map((entry) => ({
              label: entry.campaign,
              detail: entry.source ?? undefined,
              value: entry.pageviews
            }))}
            emptyLabel="No campaign-tagged traffic in range."
          />
        </PanelCard>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <PanelCard title="Expungement.ai funnel">
          <RankedList
            rows={[
              { label: "Screening started", value: summary.funnels.expungementAi.screeningStarted },
              { label: "Result viewed", value: summary.funnels.expungementAi.resultViewed },
              { label: "Checkout started", value: summary.funnels.expungementAi.checkoutStarted },
              { label: "Checkout completed", value: summary.funnels.expungementAi.checkoutCompleted },
              { label: "Packet generated", value: summary.funnels.expungementAi.packetGenerated }
            ]}
            emptyLabel="No funnel events in range."
            preserveOrder
          />
        </PanelCard>

        <PanelCard title="RCAP partner funnel">
          <RankedList
            rows={[
              { label: "Partner landing viewed", value: summary.funnels.rcap.partnerLandingViewed },
              { label: "Partner screening started", value: summary.funnels.rcap.partnerScreeningStarted },
              { label: "Partner result viewed", value: summary.funnels.rcap.partnerResultViewed },
              { label: "Partner packet generated", value: summary.funnels.rcap.partnerPacketGenerated }
            ]}
            emptyLabel="No partner funnel events in range."
            preserveOrder
          />
        </PanelCard>
      </section>

      {summary.byPartner.length > 0 ? (
        <section className="mt-6">
          <PanelCard title="Partner traffic by slug">
            <RankedList
              rows={summary.byPartner.map((entry) => ({
                label: entry.partner_slug,
                detail: `${entry.events.toLocaleString()} events`,
                value: entry.pageviews
              }))}
              emptyLabel="No partner-attributed traffic in range."
            />
          </PanelCard>
        </section>
      ) : null}

      <p className="mt-6 text-xs text-grayWilma-500">
        Range {summary.range} · {summary.meta.rowsScanned.toLocaleString()} events scanned
        {summary.meta.truncated ? " · scan cap reached — totals are a lower bound" : ""} · generated {summary.generatedAt}
      </p>
    </>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <Card className="rounded-md p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">{icon}</span>
        <p className="text-sm font-black text-navy">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-black text-navy">{value.toLocaleString()}</p>
    </Card>
  );
}

function PanelCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="rounded-md p-5">
      <h2 className="text-lg font-black text-navy">{title}</h2>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function RankedList({
  rows,
  emptyLabel,
  preserveOrder = false
}: {
  rows: Array<{ label: string; detail?: string; value: number }>;
  emptyLabel: string;
  preserveOrder?: boolean;
}) {
  const ordered = preserveOrder ? rows : [...rows].sort((a, b) => b.value - a.value);
  if (ordered.length === 0 || (!preserveOrder && ordered.every((row) => row.value === 0))) {
    return <p className="text-sm text-grayWilma-500">{emptyLabel}</p>;
  }
  return (
    <ul className="grid gap-2.5">
      {ordered.map((row, index) => (
        <li key={`${row.label}-${index}`} className="flex items-center justify-between gap-3 border-b border-grayWilma-100 pb-2 last:border-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy">{row.label}</p>
            {row.detail ? <p className="truncate text-xs text-grayWilma-500">{row.detail}</p> : null}
          </div>
          <span className="shrink-0 text-sm font-black tabular-nums text-navy">{row.value.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
