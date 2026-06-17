import Link from "next/link";
import { ArrowRight, FileCheck2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  getAll50StatePreviews,
  getLegacyGeneratorStatus,
  getRendererModes,
  type StatePreview
} from "@/lib/rcap/all50-internal-preview";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";

export const dynamic = "force-dynamic";

export default async function All50InternalStatesPage() {
  const access = await resolveInternalAdminPageAccess("/internal/record-clearing/states");

  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  const states = getAll50StatePreviews();

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">
          <div>
            <Badge tone="blue">Internal admin only</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy md:text-5xl">RCAP all-50 review states</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Internal QA, visual review, source review, and attorney-review queue for all 50 states plus DC. This surface is build-first review material and does not approve any route for live use.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-navy">Review queue</p>
                <p className="text-xs text-grayWilma-600">{states.length} jurisdictions gated to internal_admin</p>
              </div>
            </div>
            <Link href="/internal/record-clearing/handoff" className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid">
              Handoff dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Jurisdictions" value={states.length} />
          <SummaryCard label="State built" value={states.filter((state) => state.build.buildStatus === "state_built").length} />
          <SummaryCard label="Rendered samples" value={states.reduce((sum, state) => sum + state.overlay.renderedSamples, 0)} />
          <SummaryCard label="Blocked forms" value={states.reduce((sum, state) => sum + state.overlay.blockedForms, 0)} />
        </section>

        <section className="mt-8 overflow-hidden rounded-md border border-grayWilma-200 bg-white shadow-sm">
          <div className="border-b border-grayWilma-200 px-5 py-4">
            <h2 className="text-lg font-black text-navy">Jurisdiction review index</h2>
            <p className="mt-1 text-sm text-grayWilma-700">Build, overlay, review, and legacy-generator status for the all-50 internal queue.</p>
          </div>
          <div className="hidden border-b border-grayWilma-200 bg-[#f7f8f6] px-5 py-3 text-xs font-black uppercase text-grayWilma-600 xl:grid xl:grid-cols-[1.05fr_0.85fr_1fr_0.55fr_0.55fr_0.75fr_0.7fr_0.7fr_0.7fr_0.7fr_1fr_0.45fr] xl:items-center">
            <span>State</span>
            <span>Build</span>
            <span>Renderer modes</span>
            <span>Forms</span>
            <span>Samples</span>
            <span>Blocked</span>
            <span>QA</span>
            <span>Visual</span>
            <span>Counsel</span>
            <span>Source</span>
            <span>Legacy</span>
            <span>Detail</span>
          </div>
          <div className="divide-y divide-grayWilma-200">
            {states.map((state) => (
              <StateRow key={state.build.code} state={state} />
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

function StateRow({ state }: { state: StatePreview }) {
  const review = state.build.reviewStatuses;
  return (
    <article className="grid gap-4 px-5 py-5 xl:grid-cols-[1.05fr_0.85fr_1fr_0.55fr_0.55fr_0.75fr_0.7fr_0.7fr_0.7fr_0.7fr_1fr_0.45fr] xl:items-center">
      <div>
        <p className="font-black text-navy">{state.build.name}</p>
        <p className="mt-1 text-xs text-grayWilma-600">{state.build.code}</p>
      </div>
      <Badge tone="teal">{state.build.buildStatus}</Badge>
      <p className="text-sm text-grayWilma-700">{getRendererModes(state).join(", ")}</p>
      <Metric label="Forms" value={state.overlay.totalForms} />
      <Metric label="Samples" value={state.overlay.renderedSamples} />
      <Metric label="Blocked" value={state.overlay.blockedForms} />
      <Badge tone="orange">{review.qa}</Badge>
      <Badge tone="orange">{review.visual}</Badge>
      <Badge tone="orange">{review.counsel}</Badge>
      <div className="xl:contents">
        <p className="text-xs text-grayWilma-600 xl:hidden">Source freshness</p>
        <Badge tone="orange">{review.sourceFreshness}</Badge>
      </div>
      <p className="text-xs leading-5 text-grayWilma-700">{getLegacyGeneratorStatus(state)}</p>
      <Link href={`/internal/record-clearing/states/${state.build.slug}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid">
        <FileCheck2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Open {state.build.name}</span>
      </Link>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-grayWilma-600 xl:hidden">{label}</p>
      <p className="text-sm font-black text-navy">{value}</p>
    </div>
  );
}
