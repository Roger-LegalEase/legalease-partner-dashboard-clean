import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDashed, Clock3, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  commandCenterReadinessSections,
  readinessStatusLabels,
  type ReadinessItem,
  type ReadinessStatus
} from "@/lib/partners/command-center-readiness";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";

export const dynamic = "force-dynamic";

const statusTone: Record<ReadinessStatus, "teal" | "blue" | "orange" | "neutral"> = {
  ready: "teal",
  required_before_deploy: "orange",
  not_started: "neutral",
  deferred: "blue"
};

const statusIcon = {
  ready: CheckCircle2,
  required_before_deploy: TriangleAlert,
  not_started: Clock3,
  deferred: CircleDashed
} satisfies Record<ReadinessStatus, typeof CheckCircle2>;

export default async function CommandCenterReadinessPage() {
  const access = await resolveInternalAdminPageAccess("/internal/command-center/readiness");

  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  const totals = summarizeReadiness();

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <Link href="/partner/dashboard" className="inline-flex items-center gap-2 text-sm font-black text-[#31465b]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Command Center
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.58fr]">
          <div>
            <Badge tone="blue">Internal admin only</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy md:text-5xl">Command Center readiness</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
              A launch-facing contract for LegalEase operators to confirm the Partner Journey OS acquisition pipeline is ready. This page uses a static readiness contract and does not display submitted lead data, partner contact data, environment values, or implementation internals.
            </p>
          </div>

          <Card className="rounded-md p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-navy">Readiness surface</p>
                <p className="text-xs text-grayWilma-600">Internal admin session required</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-grayWilma-700">
              Use this as an operator checklist before production launch. It is not a public status page or a diagnostic scanner.
            </p>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Ready" value={totals.ready} tone="teal" />
          <SummaryCard label="Required before deploy" value={totals.required_before_deploy} tone="orange" />
          <SummaryCard label="Not started" value={totals.not_started} tone="neutral" />
          <SummaryCard label="Deferred" value={totals.deferred} tone="blue" />
        </section>

        <section className="mt-8 grid gap-5">
          {commandCenterReadinessSections.map((section) => (
            <Card key={section.title} className="rounded-md p-5">
              <div className="grid gap-2 md:grid-cols-[260px_1fr] md:gap-6">
                <div>
                  <h2 className="text-xl font-black text-navy">{section.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-grayWilma-700">{section.description}</p>
                </div>
                <div className="grid gap-3">
                  {section.items.map((item) => (
                    <ReadinessRow key={`${section.title}-${item.label}`} item={item} />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}

function summarizeReadiness() {
  const totals: Record<ReadinessStatus, number> = {
    ready: 0,
    required_before_deploy: 0,
    not_started: 0,
    deferred: 0
  };

  for (const section of commandCenterReadinessSections) {
    for (const item of section.items) {
      totals[item.status] += 1;
    }
  }

  return totals;
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "teal" | "blue" | "orange" | "neutral" }) {
  return (
    <Card className="rounded-md p-5">
      <Badge tone={tone}>{label}</Badge>
      <p className="mt-4 text-3xl font-black text-navy">{value}</p>
    </Card>
  );
}

function ReadinessRow({ item }: { item: ReadinessItem }) {
  const Icon = statusIcon[item.status];

  return (
    <article className="grid gap-3 rounded-md border border-grayWilma-200 bg-[#fbfcfa] p-4 md:grid-cols-[1fr_auto] md:items-start">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-teal" aria-hidden="true" />
          <h3 className="text-sm font-black text-navy">{item.label}</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-grayWilma-700">{item.description}</p>
      </div>
      <Badge tone={statusTone[item.status]}>{readinessStatusLabels[item.status]}</Badge>
    </article>
  );
}
