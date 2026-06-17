import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, FileWarning, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  getAll50StatePreview,
  getLegacyGeneratorStatus,
  getRendererModes,
  type OverlayForm,
  type StatePreview
} from "@/lib/rcap/all50-internal-preview";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";

export const dynamic = "force-dynamic";

export default async function All50InternalStateDetailPage({
  params
}: {
  params: Promise<{ state: string }>;
}) {
  const { state: stateSlug } = await params;
  const access = await resolveInternalAdminPageAccess(`/internal/record-clearing/states/${stateSlug}`);

  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  const state = getAll50StatePreview(stateSlug);
  if (!state) notFound();

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/internal/record-clearing/states" className="inline-flex items-center gap-2 text-sm font-black text-[#31465b]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All states
          </Link>
          <Link href={`/internal/record-clearing/states/${state.build.slug}/review`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid">
            Review artifact packet
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.45fr]">
          <div>
            <Badge tone="blue">Internal admin only</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy md:text-5xl">{state.build.name} review detail</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Jurisdiction summary, state-pack metadata, form overlay status, sample packets, blocked forms, and pending review checklists for QA and attorney handoff.
            </p>
            <p className="mt-3 max-w-3xl rounded-md border border-grayWilma-200 bg-[#fbfcfa] px-3 py-2 text-xs leading-5 text-grayWilma-700">
              These are repository review artifact paths for internal QA/attorney review. Listed file and form locations are repository paths, not clickable downloads. Open the{" "}
              <Link href={`/internal/record-clearing/states/${state.build.slug}/review`} className="font-black text-[#31465b] underline">
                review artifact packet
              </Link>{" "}
              for the full file reference list.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <p className="text-sm font-black text-navy">Jurisdiction summary</p>
            <div className="mt-4 grid gap-3 text-sm text-grayWilma-700">
              <Meta label="Code" value={state.build.code} />
              <Meta label="Build status" value={state.build.buildStatus} />
              <Meta label="Renderer modes" value={getRendererModes(state).join(", ")} />
              <Meta label="Legacy generator" value={getLegacyGeneratorStatus(state)} />
              <Meta label="Review root" value={state.reviewRoot} />
            </div>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Forms found" value={state.overlay.totalForms} />
          <SummaryCard label="PDF forms" value={state.overlay.pdfForms} />
          <SummaryCard label="Rendered samples" value={state.overlay.renderedSamples} />
          <SummaryCard label="Blocked forms" value={state.overlay.blockedForms} />
          <SummaryCard label="Visual pending" value={state.overlay.visualReviewPending} />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <Card className="rounded-md p-5">
            <h2 className="text-xl font-black text-navy">State-pack metadata</h2>
            <InfoList label="Products" items={state.statePackSummary.products ?? state.build.outputTypes} />
            <InfoList label="Pathways" items={(state.statePackSummary.pathways ?? []).map((pathway) => `${pathway.label} (${pathway.output})`)} />
            <InfoList label="Required user inputs" items={state.statePackSummary.requiredUserInputs ?? []} />
          </Card>

          <Card className="rounded-md p-5">
            <h2 className="text-xl font-black text-navy">Filing guidance summary</h2>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Guidance fallback: {state.statePackSummary.guidanceOnlyFallback?.status ?? "built"}. Custom pleading support: {state.statePackSummary.customPleadingSupport?.status ?? "draft_config_allowed"}.
            </p>
            <div className="mt-4 grid gap-2">
              <StatusBadge label="QA" value={state.build.reviewStatuses.qa} />
              <StatusBadge label="Visual" value={state.build.reviewStatuses.visual} />
              <StatusBadge label="Counsel" value={state.build.reviewStatuses.counsel} />
              <StatusBadge label="Source freshness" value={state.build.reviewStatuses.sourceFreshness} />
            </div>
          </Card>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
          <Card className="rounded-md p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-black text-navy">Official form inventory</h2>
              <span className="text-xs font-black uppercase text-grayWilma-600">{state.forms.length} forms total</span>
            </div>
            <div className="mt-4 grid gap-3">
              {state.forms.slice(0, 24).map((form) => (
                <FormRow key={`${form.relativePath}-${form.status}`} form={form} />
              ))}
            </div>
            <p className="mt-4 text-xs text-grayWilma-600">
              {state.forms.length > 24
                ? `Showing first 24 of ${state.forms.length} forms. The complete inventory is in forms-manifest.json under the review packet root (${state.reviewRoot}/forms-manifest.json).`
                : `All ${state.forms.length} forms shown. Full inventory is also in forms-manifest.json under ${state.reviewRoot}.`}
            </p>
          </Card>

          <div className="grid gap-5">
            <Card className="rounded-md p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="flex items-center gap-2 text-xl font-black text-navy">
                  <ListChecks className="h-5 w-5 text-teal" aria-hidden="true" />
                  Sample packet list
                </h2>
                <span className="text-xs font-black uppercase text-grayWilma-600">{state.samples.length} samples total</span>
              </div>
              <PathList paths={state.samples.slice(0, 18)} empty="No rendered samples for this state." />
              {state.samples.length > 18 ? (
                <p className="mt-3 text-xs text-grayWilma-600">
                  Showing first 18 of {state.samples.length} rendered samples. Full set lives under {state.reviewRoot}/sample-packets/.
                </p>
              ) : state.samples.length > 0 ? (
                <p className="mt-3 text-xs text-grayWilma-600">
                  All {state.samples.length} rendered samples shown, under {state.reviewRoot}/sample-packets/.
                </p>
              ) : null}
            </Card>
            <Card className="rounded-md p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="flex items-center gap-2 text-xl font-black text-navy">
                  <FileWarning className="h-5 w-5 text-orange" aria-hidden="true" />
                  Blocked forms
                </h2>
                <span className="text-xs font-black uppercase text-grayWilma-600">{state.blockedArtifacts.length} blocked total</span>
              </div>
              <PathList paths={state.blockedArtifacts} empty="No blocked form artifacts for this state." />
              {state.blockedArtifacts.length > 0 ? (
                <p className="mt-3 text-xs text-grayWilma-600">Blocked-form artifacts live under {state.reviewRoot}/blocked-forms/.</p>
              ) : null}
            </Card>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <ChecklistCard title="QA report summary" items={qaSummaryItems(state)} />
          <ChecklistCard title="Attorney-review checklist" items={["Confirm legal pathway language", "Confirm eligibility caveats", "Confirm filing destination guidance", "Approve or revise guidance fallback before live use"]} />
          <ChecklistCard title="Visual-review checklist" items={["Open rendered sample packets", "Confirm text alignment", "Confirm field-map labels", "Mark blocked forms for replacement or fallback"]} />
        </section>

        <Card className="mt-8 rounded-md p-5">
          <h2 className="text-xl font-black text-navy">Next actions</h2>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">
            Complete QA, visual review, counsel review, and source freshness review before this jurisdiction is considered approved for live use. Public routing remains unchanged.
          </p>
        </Card>
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-grayWilma-600">{label}</p>
      <p className="mt-1 break-words text-sm text-grayWilma-800">{value}</p>
    </div>
  );
}

function InfoList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-black text-navy">{label}</p>
      <ul className="mt-2 grid gap-2 text-sm leading-6 text-grayWilma-700">
        {items.length > 0 ? items.map((item) => <li key={item}>- {item}</li>) : <li>- Pending source detail</li>}
      </ul>
    </div>
  );
}

function StatusBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-grayWilma-200 bg-[#fbfcfa] px-3 py-2">
      <span className="text-sm font-semibold text-grayWilma-700">{label}</span>
      <Badge tone="orange">{value}</Badge>
    </div>
  );
}

function FormRow({ form }: { form: OverlayForm }) {
  return (
    <article className="rounded-md border border-grayWilma-200 bg-[#fbfcfa] p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-navy">{form.fileName}</p>
          <p className="mt-1 break-words text-xs text-grayWilma-600">{form.relativePath}</p>
        </div>
        <Badge tone={form.status === "blocked" ? "orange" : form.status === "mapped" ? "teal" : "blue"}>{form.status}</Badge>
      </div>
      <p className="mt-2 text-xs text-grayWilma-700">
        {form.classification} · {form.mapKind ?? "inventory"} · visual review {form.visualReview ?? "pending"}
      </p>
    </article>
  );
}

function PathList({ paths, empty }: { paths: string[]; empty: string }) {
  if (paths.length === 0) return <p className="mt-3 text-sm text-grayWilma-700">{empty}</p>;
  return (
    <ul className="mt-3 grid gap-2 text-xs leading-5 text-grayWilma-700">
      {paths.map((item) => (
        <li key={item} className="break-words rounded-md border border-grayWilma-200 bg-[#fbfcfa] p-2">
          {item}
        </li>
      ))}
    </ul>
  );
}

function ChecklistCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="rounded-md p-5">
      <h2 className="text-lg font-black text-navy">{title}</h2>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-grayWilma-700">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </Card>
  );
}

function qaSummaryItems(state: StatePreview) {
  const failed = state.qaReport.failedChecks ?? [];
  return [
    `QA generated pass flag: ${state.qaReport.pass === true ? "pass" : "review required"}`,
    `Failed generated checks: ${failed.length}`,
    `Overlay status: ${state.formsManifest.overlay ?? "pending_overlay_samples"}`,
    `Pending review is not a build failure`
  ];
}
