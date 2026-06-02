"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileClock,
  Filter,
  Flag,
  Layers3,
  Map,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  campaigns,
  dateRanges,
  dropOffPoints,
  eligibilityBreakdown,
  funnelStages,
  kpiMetrics,
  partners,
  productStarts,
  recentActivity,
  stateBreakdown,
  stateFilters,
  type CampaignPerformance,
  type KpiMetric,
  type RecentActivity,
  type StateBreakdown
} from "@/lib/partner-dashboard-data";
import { seedPartners } from "@/lib/partners/seed-partners";
import { getOnboardingStatusLabel, getPaymentStatusLabel, getProvisioningStatusLabel } from "@/lib/partners/partner-service";
import { cn } from "@/lib/utils";

const kpiIcons = [
  UsersRound,
  ClipboardCheck,
  ShieldCheck,
  Flag,
  FileClock,
  Layers3,
  Activity,
  FileCheck2,
  FileClock,
  CheckCircle2,
  BarChart3,
  ArrowDownRight
];

const statusTone: Record<string, "teal" | "blue" | "orange" | "neutral"> = {
  Active: "teal",
  Completed: "blue",
  Paused: "orange",
  Draft: "neutral"
};

export default function PartnerDashboardPage() {
  const [selectedPartner, setSelectedPartner] = useState("Current Partner");
  const [dateRange, setDateRange] = useState<(typeof dateRanges)[number]>("Last 90 days");
  const [selectedState, setSelectedState] = useState<(typeof stateFilters)[number]>("All States");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingFinalReport, setIsGeneratingFinalReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const filteredStates = useMemo(() => {
    if (selectedState === "All States") {
      return stateBreakdown;
    }
    return stateBreakdown.filter((item) => item.state === selectedState);
  }, [selectedState]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const stateMatch = selectedState === "All States" || campaign.state === selectedState;
      return stateMatch;
    });
  }, [selectedState]);

  const filteredActivity = useMemo(() => {
    return recentActivity.filter((activity) => {
      const stateMatch = selectedState === "All States" || activity.state === selectedState;
      return stateMatch;
    });
  }, [selectedState]);

  async function generateWeeklyReport() {
    await generateReport({
      endpoint: "/api/partner-reports/weekly",
      fallbackError: "Could not generate weekly report.",
      filename: "legalease-weekly-report.pdf",
      setLoading: setIsGeneratingReport
    });
  }

  async function generateFinalImpactReport() {
    await generateReport({
      endpoint: "/api/partner-reports/final",
      fallbackError: "Could not generate final impact report.",
      filename: "legalease-final-impact-report.pdf",
      setLoading: setIsGeneratingFinalReport
    });
  }

  async function generateReport({
    endpoint,
    fallbackError,
    filename,
    setLoading
  }: {
    endpoint: string;
    fallbackError: string;
    filename: string;
    setLoading: (value: boolean) => void;
  }) {
    setLoading(true);
    setReportError(null);
    try {
      const selectedPartnerRecord = partners.find((partner) => partner.name === selectedPartner);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          partnerId: selectedPartnerRecord?.id ?? "current-partner",
          partnerName: selectedPartner,
          dateRange,
          state: selectedState
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? fallbackError);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setReportError(caught instanceof Error ? caught.message : fallbackError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <DashboardHeader
        selectedPartner={selectedPartner}
        selectedState={selectedState}
        dateRange={dateRange}
        onPartnerChange={setSelectedPartner}
        onStateChange={setSelectedState}
        onDateRangeChange={setDateRange}
        onExport={generateWeeklyReport}
        onFinalImpactReport={generateFinalImpactReport}
        isGeneratingReport={isGeneratingReport}
        isGeneratingFinalReport={isGeneratingFinalReport}
      />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 lg:py-8">
        {reportError ? (
          <div className="rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">
            {reportError}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="border-l-4 border-teal bg-white px-5 py-5 shadow-sm">
            <Badge tone="blue">Operating layer</Badge>
            <h1 className="mt-3 text-3xl font-black tracking-normal text-navy md:text-4xl">Partner Dashboard</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-grayWilma-600">
              Track referrals, screenings, filings, reporting, and outcomes across the Record-Clearing Access Program.
            </p>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-grayWilma-800">
              LegalEase gives partners visibility into the full service delivery pipeline — from referral and screening through packet completion, filing readiness, and outcomes where available.
            </p>
          </div>

          <Card className="rounded-md p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-navy">Service delivery infrastructure</p>
                <p className="text-xs text-grayWilma-600">Current partner · {dateRange}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-grayWilma-700">
              This dashboard is designed to help partners identify bottlenecks, measure campaign performance, and understand where justice-impacted users need additional support.
            </p>
          </Card>
        </section>

        <KpiSummary />

        <section className="grid gap-4 lg:grid-cols-3">
          {seedPartners.map((partner) => (
            <Card key={partner.partnerSlug} className="rounded-md p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-navy">{partner.organizationName ?? partner.partnerName}</h2>
                  <p className="mt-1 text-xs font-semibold text-grayWilma-600">{partner.serviceArea ?? partner.region}</p>
                </div>
                <Badge tone={partner.onboardingStatus === "submitted" || partner.onboardingStatus === "approved" ? "teal" : "blue"}>
                  {getOnboardingStatusLabel(partner.onboardingStatus)}
                </Badge>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-grayWilma-700">
                <p><span className="font-bold text-navy">Payment:</span> {getPaymentStatusLabel(partner.paymentStatus)}</p>
                <p><span className="font-bold text-navy">Provisioning:</span> {getProvisioningStatusLabel(partner.provisioningStatus)}</p>
                <p><span className="font-bold text-navy">Primary contact:</span> {partner.primaryContactName ?? partner.contactName}</p>
                <p><span className="font-bold text-navy">Expected launch:</span> {partner.expectedLaunchDate ?? partner.launchDateTarget}</p>
              </div>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <LifecycleFunnel />
          <EligibilityBreakdown />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.2fr)]">
          <ProductStartsPanel />
          <StateBreakdownTable rows={filteredStates} />
        </section>

        <CampaignPerformanceTable rows={filteredCampaigns} />

        <section className="grid gap-6 xl:grid-cols-[minmax(360px,0.75fr)_minmax(0,1.25fr)]">
          <DropOffAnalysis />
          <RecentActivityTable rows={filteredActivity} />
        </section>

        <footer className="border-t border-grayWilma-200 py-4 text-xs leading-5 text-grayWilma-600">
          Screening results are based on user-provided information and jurisdiction-specific workflow logic. They are not final legal determinations.
        </footer>
      </div>
    </main>
  );
}

function DashboardHeader({
  selectedPartner,
  selectedState,
  dateRange,
  onPartnerChange,
  onStateChange,
  onDateRangeChange,
  onExport,
  onFinalImpactReport,
  isGeneratingReport,
  isGeneratingFinalReport
}: {
  selectedPartner: string;
  selectedState: string;
  dateRange: string;
  onPartnerChange: (value: string) => void;
  onStateChange: (value: (typeof stateFilters)[number]) => void;
  onDateRangeChange: (value: (typeof dateRanges)[number]) => void;
  onExport: () => void;
  onFinalImpactReport: () => void;
  isGeneratingReport: boolean;
  isGeneratingFinalReport: boolean;
}) {
  return (
    <header className="border-b border-grayWilma-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-white">
            <Map className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-black text-navy">LegalEase</p>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">Partner reporting</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(190px,1fr)_minmax(150px,0.75fr)_minmax(150px,0.75fr)_auto_auto] xl:min-w-[980px]">
          <SelectControl label="Partner" value={selectedPartner} onChange={(value) => onPartnerChange(value)}>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.name}>{partner.name}</option>
            ))}
          </SelectControl>
          <SelectControl label="Date range" value={dateRange} onChange={(value) => onDateRangeChange(value as (typeof dateRanges)[number])}>
            {dateRanges.map((range) => (
              <option key={range} value={range}>{range}</option>
            ))}
          </SelectControl>
          <SelectControl label="State" value={selectedState} onChange={(value) => onStateChange(value as (typeof stateFilters)[number])}>
            {stateFilters.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </SelectControl>
          <Button className="min-h-[42px] self-end" disabled={isGeneratingReport || isGeneratingFinalReport} onClick={onExport} variant="warning">
            <Download className="h-4 w-4" aria-hidden="true" />
            {isGeneratingReport ? "Generating report..." : "Generate weekly report"}
          </Button>
          <Button className="min-h-[42px] self-end" disabled={isGeneratingReport || isGeneratingFinalReport} onClick={onFinalImpactReport} variant="primary">
            <Download className="h-4 w-4" aria-hidden="true" />
            {isGeneratingFinalReport ? "Generating report..." : "Generate final impact report"}
          </Button>
        </div>
      </div>
    </header>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-grayWilma-600">
        <Filter className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </span>
      <select
        className="h-[42px] w-full rounded-md border border-grayWilma-200 bg-white px-3 text-sm font-semibold text-navy shadow-sm transition focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function KpiSummary() {
  return (
    <section aria-labelledby="kpi-heading">
      <SectionHeading
        id="kpi-heading"
        title="Referral Pipeline Summary"
        description="Top-level operating metrics for partner visibility and accountability."
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {kpiMetrics.map((metric, index) => (
          <KpiCard key={metric.id} metric={metric} icon={kpiIcons[index] ?? Activity} />
        ))}
      </div>
    </section>
  );
}

function KpiCard({ metric, icon: Icon }: { metric: KpiMetric; icon: typeof Activity }) {
  return (
    <Card className="rounded-md p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-grayWilma-800">{metric.label}</p>
          <p className="mt-2 text-3xl font-black text-navy">{formatMetric(metric.value, metric.format)}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-wilmaBlue/10 text-wilmaBlue">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 min-h-10 text-xs leading-5 text-grayWilma-600">{metric.supportingLabel}</p>
      <p className="mt-2 text-xs font-bold text-teal">{metric.change}</p>
    </Card>
  );
}

function LifecycleFunnel() {
  const max = funnelStages[0]?.count ?? 1;

  return (
    <Card className="rounded-md p-5">
      <SectionHeading
        title="Lifecycle Funnel"
        description="Referral to outcome visibility, with drop-off surfaced at each workflow status."
      />
      <div className="mt-5 space-y-3">
        {funnelStages.map((stage) => (
          <div key={stage.stage} className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)_150px] md:items-center">
            <div>
              <p className="text-sm font-bold text-navy">{stage.stage}</p>
              <p className="text-xs text-grayWilma-600">{stage.count.toLocaleString()} users</p>
            </div>
            <div className="h-8 overflow-hidden rounded-md bg-grayWilma-100">
              <div
                className="flex h-full items-center justify-end rounded-md bg-gradient-to-r from-wilmaBlue to-teal pr-3 text-xs font-bold text-white"
                style={{ width: `${Math.max((stage.count / max) * 100, 8)}%` }}
              >
                {stage.overallConversion}%
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <MetricPill label="Prev" value={`${stage.previousConversion}%`} />
              <MetricPill label="Overall" value={`${stage.overallConversion}%`} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EligibilityBreakdown() {
  return (
    <Card className="rounded-md p-5">
      <SectionHeading
        title="Eligibility Breakdown"
        description="Screening result categories for operational routing. No final legal determination is shown."
      />
      <div className="mt-5 space-y-4">
        {eligibilityBreakdown.map((segment) => (
          <div key={segment.id} className="border-b border-grayWilma-200 pb-4 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-navy">{segment.label}</p>
              <p className="text-sm font-black text-navy">{segment.count.toLocaleString()} · {segment.percentage}%</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-grayWilma-100">
              <div className={cn("h-full rounded-full", segment.id === "needs_review" ? "bg-orange" : segment.id === "not_likely_eligible" ? "bg-grayWilma-400" : "bg-teal")} style={{ width: `${segment.percentage}%` }} />
            </div>
            <p className="mt-3 text-sm leading-6 text-grayWilma-600">{segment.definition}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProductStartsPanel() {
  return (
    <Card className="rounded-md p-5">
      <SectionHeading
        title="Product Starts"
        description="Record-clearing access movement from intake into review, routing, filings, and reporting."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {productStarts.map((product) => (
          <div key={product.id} className="rounded-md border border-grayWilma-200 bg-[#fbfcfb] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-navy">{product.name}</p>
                <p className="mt-1 text-sm text-grayWilma-600">{product.description}</p>
              </div>
              <Badge tone={product.status === "active" ? "teal" : "neutral"}>
                {product.metricLabel ?? `${product.starts?.toLocaleString()} starts`}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StateBreakdownTable({ rows }: { rows: StateBreakdown[] }) {
  return (
    <DataTableFrame
      title="State-Level Implementation"
      description="Referrals, screenings, filing readiness, and filed petitions by state."
      emptyMessage="No referrals found for this partner and date range."
    >
      {rows.length > 0 ? (
        <Table>
          <thead>
            <tr>
              {["State", "Referrals", "Screenings", "Likely Eligible", "RecordShield Starts", "Expungement.ai Starts", "Completed Packets", "Filed Petitions", "Conversion Rate"].map((head) => (
                <Th key={head}>{head}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.state}>
                <Td strong>{row.state}</Td>
                <Td>{row.referrals.toLocaleString()}</Td>
                <Td>{row.screenings.toLocaleString()}</Td>
                <Td>{row.likelyEligible.toLocaleString()}</Td>
                <Td>{row.recordShieldStarts.toLocaleString()}</Td>
                <Td>{row.expungementStarts.toLocaleString()}</Td>
                <Td>{row.completedPackets.toLocaleString()}</Td>
                <Td>{row.filedPetitions.toLocaleString()}</Td>
                <Td>{row.conversionRate}%</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </DataTableFrame>
  );
}

function CampaignPerformanceTable({ rows }: { rows: CampaignPerformance[] }) {
  return (
    <DataTableFrame
      title="Partner Campaign Performance"
      description="Campaigns producing movement across the referral pipeline."
      emptyMessage="No campaign data available yet."
    >
      {rows.length > 0 ? (
        <Table>
          <thead>
            <tr>
              {["Campaign", "Channel", "State", "Referrals", "Screenings", "Starts", "Completed Packets", "Filed Petitions", "Conversion Rate", "Status"].map((head) => (
                <Th key={head}>{head}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.campaign}-${row.state}`}>
                <Td strong>{row.campaign}</Td>
                <Td>{row.channel}</Td>
                <Td>{row.state}</Td>
                <Td>{row.referrals.toLocaleString()}</Td>
                <Td>{row.screenings.toLocaleString()}</Td>
                <Td>{row.starts.toLocaleString()}</Td>
                <Td>{row.completedPackets.toLocaleString()}</Td>
                <Td>{row.filedPetitions.toLocaleString()}</Td>
                <Td>{row.conversionRate}%</Td>
                <Td><Badge tone={statusTone[row.status]}>{row.status}</Badge></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </DataTableFrame>
  );
}

function DropOffAnalysis() {
  return (
    <Card className="rounded-md p-5">
      <SectionHeading
        title="Drop-off Analysis"
        description="Bottlenecks and suggested operational actions for partner coordination."
      />
      <div className="mt-5 space-y-3">
        {dropOffPoints.map((point) => (
          <div key={point.label} className="rounded-md border border-grayWilma-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-navy">{point.label}</p>
                <p className="mt-1 text-sm text-grayWilma-600">Suggested action: {point.suggestedAction}.</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-navy">{point.count.toLocaleString()}</p>
                <p className="text-xs font-bold text-orange">{point.percentage}% drop-off</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecentActivityTable({ rows }: { rows: RecentActivity[] }) {
  return (
    <DataTableFrame
      title="Recent Activity"
      description="Anonymized workflow activity across partner-referred users."
      emptyMessage="No outcomes have been reported for this period."
      footer="User records are anonymized by default. Detailed case information should only be viewed by authorized users with appropriate permissions."
    >
      {rows.length > 0 ? (
        <Table>
          <thead>
            <tr>
              {["Name or User ID", "State", "Product", "Current Status", "Last Activity", "Outcome"].map((head) => (
                <Th key={head}>{head}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId}>
                <Td strong>{row.userId}</Td>
                <Td>{row.state}</Td>
                <Td>{row.product}</Td>
                <Td>{row.status}</Td>
                <Td>{row.lastActivity}</Td>
                <Td>{row.outcome}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
    </DataTableFrame>
  );
}

function DataTableFrame({
  title,
  description,
  emptyMessage,
  footer,
  children
}: {
  title: string;
  description: string;
  emptyMessage: string;
  footer?: string;
  children: React.ReactNode;
}) {
  const hasRows = Boolean(children);

  return (
    <Card className="overflow-hidden rounded-md">
      <div className="border-b border-grayWilma-200 p-5">
        <SectionHeading title={title} description={description} />
      </div>
      <div className="overflow-x-auto">
        {hasRows ? children : <EmptyState message={emptyMessage} />}
      </div>
      {footer ? <p className="border-t border-grayWilma-200 px-5 py-3 text-xs leading-5 text-grayWilma-600">{footer}</p> : null}
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center px-5 py-8 text-center">
      <div>
        <p className="font-bold text-navy">{message}</p>
        <p className="mt-2 text-sm text-grayWilma-600">Adjust partner, state, or date range filters to review the operating pipeline.</p>
      </div>
    </div>
  );
}

function SectionHeading({ id, title, description }: { id?: string; title: string; description: string }) {
  return (
    <div>
      <h2 id={id} className="text-lg font-black text-navy">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-grayWilma-600">{description}</p>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-grayWilma-200 bg-white px-2 py-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-grayWilma-400">{label}</p>
      <p className="font-bold text-navy">{value}</p>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return <table className="min-w-full divide-y divide-grayWilma-200 text-left text-sm">{children}</table>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap bg-grayWilma-100/70 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-grayWilma-600">{children}</th>;
}

function Td({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <td className={cn("whitespace-nowrap border-t border-grayWilma-200 px-4 py-3 text-grayWilma-700", strong && "font-bold text-navy")}>
      {children}
    </td>
  );
}

function formatMetric(value: number, format: KpiMetric["format"] = "number") {
  if (format === "percent") {
    return `${value}%`;
  }
  return value.toLocaleString();
}
