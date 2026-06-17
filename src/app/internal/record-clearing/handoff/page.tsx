import Link from "next/link";
import { ArrowLeft, ClipboardCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getAll50HandoffSummary, type HandoffSummary } from "@/lib/rcap/all50-internal-preview";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";

export const dynamic = "force-dynamic";

export default async function All50InternalHandoffPage() {
  const access = await resolveInternalAdminPageAccess("/internal/record-clearing/handoff");

  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  const handoff = getAll50HandoffSummary();

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <Link href="/internal/record-clearing/states" className="inline-flex items-center gap-2 text-sm font-black text-[#31465b]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All states
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.45fr]">
          <div>
            <Badge tone="blue">Internal admin only</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy md:text-5xl">RCAP all-50 QA attorney handoff</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Final internal dashboard for QA, visual review, source freshness review, and attorney review. Pending review does not block state_built status and does block live approval.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-navy">Review artifact root</p>
                <p className="mt-1 break-words text-xs text-grayWilma-600">{handoff.reviewArtifactRootPath}</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Total jurisdictions" value={handoff.totalJurisdictions} />
          <SummaryCard label="State built" value={handoff.jurisdictionsStateBuilt} />
          <SummaryCard label="Forms found" value={handoff.totalFormsFound} />
          <SummaryCard label="PDF forms" value={handoff.totalPdfForms} />
          <SummaryCard label="Rendered samples" value={handoff.renderedSamples} />
          <SummaryCard label="Fully mapped forms" value={handoff.fullyMappedForms} />
          <SummaryCard label="Partial field maps" value={handoff.partialFieldMaps} />
          <SummaryCard label="Blocked forms" value={handoff.blockedForms} />
          <SummaryCard label="Visual pending" value={handoff.visualReviewPending} />
          <SummaryCard label="Counsel pending" value={handoff.counselReviewPending} />
          <SummaryCard label="QA pending" value={handoff.qaReviewPending} />
          <SummaryCard label="Source freshness pending" value={handoff.sourceFreshnessPending} />
        </section>

        <section className="mt-8 grid gap-5">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-teal" aria-hidden="true" />
            <h2 className="text-2xl font-black text-navy">Recommended review order</h2>
          </div>
          {handoff.recommendedReviewOrder.map((group, index) => (
            <ReviewOrderGroup key={group.group} index={index + 1} group={group} />
          ))}
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

function ReviewOrderGroup({
  index,
  group
}: {
  index: number;
  group: HandoffSummary["recommendedReviewOrder"][number];
}) {
  return (
    <Card className="rounded-md p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-black text-navy">{index}. {group.group}</h3>
        <Badge tone="neutral">{group.states.length} jurisdictions</Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {group.states.map((state) => (
          <Link key={state.build.code} href={`/internal/record-clearing/states/${state.build.slug}`} className="rounded-md border border-grayWilma-200 bg-[#fbfcfa] p-3 transition hover:bg-grayWilma-100">
            <p className="font-black text-navy">{state.build.name}</p>
            <p className="mt-1 text-xs text-grayWilma-600">
              {state.overlay.renderedSamples} samples · {state.overlay.blockedForms} blocked · counsel {state.build.reviewStatuses.counsel}
            </p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
