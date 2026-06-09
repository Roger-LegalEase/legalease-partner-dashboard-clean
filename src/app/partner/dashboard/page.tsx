import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { BarChart3, BriefcaseBusiness, FileText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getPartnerDashboardRlsData, type PartnerDashboardRlsData } from "@/lib/partners/partner-dashboard-rls-repository";
import { SessionPartnerError } from "@/lib/partners/session-partner";

export const dynamic = "force-dynamic";

export default async function PartnerDashboardPage() {
  const dashboard = await loadDashboard();

  if (dashboard.kind === "redirect") {
    redirect(dashboard.href);
  }

  if (dashboard.kind === "denied") {
    return <DeniedDashboard title={dashboard.title} body={dashboard.body} />;
  }

  const partnerLabel = dashboard.partner?.organizationName ?? dashboard.partner?.partnerName ?? dashboard.partnerSlug;

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy" data-partner-dashboard-role={dashboard.role} data-partner-dashboard-slug={dashboard.partnerSlug}>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <section className="rounded-md border border-grayWilma-200 bg-white p-6 shadow-sm">
          <Badge tone="teal">Partner dashboard</Badge>
          <h1 className="mt-4 text-3xl font-black text-navy">Partner access for {partnerLabel}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
            This route is scoped from your authenticated LegalEase partner identity. It does not accept partner slugs from the URL, query string, form input, or request headers.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Meta label="Partner slug" value={dashboard.partnerSlug} />
            <Meta label="Role" value={dashboard.role.replace("_", " ")} />
            <Meta label="Program" value={dashboard.partner?.programName ?? "Not provided"} />
            <Meta label="Service area" value={dashboard.partner?.serviceArea ?? "Not provided"} />
            <Meta label="Target state" value={dashboard.partner?.targetState ?? "Not provided"} />
            <Meta label="Target county" value={dashboard.partner?.targetCounty ?? "Not provided"} />
          </div>
        </section>

        {dashboard.warnings.length > 0 ? (
          <section className="mt-5 rounded-md border border-orange/30 bg-orange/10 p-4 text-sm font-semibold text-orange">
            Some dashboard tables are unavailable or empty through RLS. No fallback service-role data was used.
          </section>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Referrals" value={dashboard.metrics?.referrals ?? 0} />
          <MetricCard label="Screenings" value={dashboard.metrics?.screenings ?? 0} />
          <MetricCard label="Likely eligible" value={dashboard.metrics?.likelyEligible ?? 0} />
          <MetricCard label="Packets ready" value={dashboard.metrics?.packetsReady ?? 0} />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <SummaryCard
            icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
            title="Intake activity"
            rows={[
              ["Total sessions", dashboard.intake.totalSessions.toLocaleString()],
              ["Completed", dashboard.intake.completedSessions.toLocaleString()],
              ["Needs review", dashboard.intake.needsReviewSessions.toLocaleString()],
              ["Latest intake", formatDate(dashboard.intake.latestIntakeDate)]
            ]}
          />
          <SummaryCard
            icon={<FileText className="h-5 w-5" aria-hidden="true" />}
            title="Document packets"
            rows={[
              ["Total packets", dashboard.documents.totalPackets.toLocaleString()],
              ["Missing info", dashboard.documents.missingInformationPackets.toLocaleString()],
              ["Ready for review", dashboard.documents.readyForReviewPackets.toLocaleString()],
              ["Latest packet", formatDate(dashboard.documents.latestPacketDate)]
            ]}
          />
          <SummaryCard
            icon={<BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />}
            title="Briefcase"
            rows={[["Briefcase items", dashboard.briefcaseItems.toLocaleString()]]}
          />
        </section>
      </div>
    </main>
  );
}

type DashboardLoadResult =
  | Extract<PartnerDashboardRlsData, { kind: "partner" }>
  | { kind: "redirect"; href: string }
  | { kind: "denied"; title: string; body: string };

async function loadDashboard(): Promise<DashboardLoadResult> {
  try {
    const dashboard = await getPartnerDashboardRlsData();

    if (dashboard.kind === "internal_admin") {
      return { kind: "redirect", href: dashboard.redirectTo };
    }

    return dashboard;
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      if (error.code === "unauthenticated") {
        return { kind: "redirect", href: "/sign-in?next=/partner/dashboard" };
      }

      return {
        kind: "denied",
        title: "Partner dashboard access denied",
        body: "Your authenticated account does not have an active partner dashboard identity."
      };
    }

    throw error;
  }
}

function DeniedDashboard({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-orange" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-black text-navy">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">{body}</p>
          <Link href="/sign-in" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white">
            Sign in with another account
          </Link>
        </Card>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f8f6] px-3 py-3">
      <p className="text-xs font-semibold uppercase text-grayWilma-600">{label}</p>
      <p className="mt-1 text-sm font-black capitalize text-navy">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="rounded-md p-5">
      <p className="text-3xl font-black text-navy">{value.toLocaleString()}</p>
      <p className="mt-2 text-sm font-semibold text-grayWilma-700">{label}</p>
    </Card>
  );
}

function SummaryCard({ icon, title, rows }: { icon: ReactNode; title: string; rows: Array<[string, string]> }) {
  return (
    <Card className="rounded-md p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal/10 text-teal">{icon}</span>
        <h2 className="text-lg font-black text-navy">{title}</h2>
      </div>
      <div className="mt-4 grid gap-2">
        {rows.map(([label, value]) => (
          <Meta key={label} label={label} value={value} />
        ))}
      </div>
    </Card>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "None yet";
  }

  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
