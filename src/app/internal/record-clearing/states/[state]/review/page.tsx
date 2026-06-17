import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getAll50StatePreview } from "@/lib/rcap/all50-internal-preview";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";

export const dynamic = "force-dynamic";

const reviewFiles = [
  "REVIEW-MANIFEST.md",
  "source-inventory.json",
  "state-pack-summary.json",
  "forms-manifest.json",
  "guidance-summary.md",
  "pleading-summary.md",
  "qa-report.json",
  "attorney-review-notes.md",
  "visual-review-notes.md",
  "next-actions.md"
];

export default async function All50InternalStateReviewPage({
  params
}: {
  params: Promise<{ state: string }>;
}) {
  const { state: stateSlug } = await params;
  const access = await resolveInternalAdminPageAccess(`/internal/record-clearing/states/${stateSlug}/review`);

  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  const state = getAll50StatePreview(stateSlug);
  if (!state) notFound();

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <Link href={`/internal/record-clearing/states/${state.build.slug}`} className="inline-flex items-center gap-2 text-sm font-black text-[#31465b]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {state.build.name} detail
        </Link>

        <section className="mt-6">
          <Badge tone="blue">Internal admin only</Badge>
          <h1 className="mt-4 text-4xl font-black leading-tight text-navy md:text-5xl">{state.build.name} review artifacts</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
            File references for the QA and attorney handoff packet. These are repository paths for internal reviewers; public file routing is unchanged.
          </p>
        </section>

        <Card className="mt-8 rounded-md p-5">
          <h2 className="text-xl font-black text-navy">Review packet root</h2>
          <p className="mt-3 break-words rounded-md border border-grayWilma-200 bg-[#fbfcfa] p-3 text-sm text-grayWilma-700">{state.reviewRoot}</p>
        </Card>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {reviewFiles.map((fileName) => (
            <ArtifactCard key={fileName} fileName={fileName} path={`${state.reviewRoot}/${fileName}`} />
          ))}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="rounded-md p-5">
            <h2 className="text-lg font-black text-navy">Field maps</h2>
            <p className="mt-2 text-sm text-grayWilma-700">{state.forms.filter((form) => form.fieldMapPath).length} field-map drafts are referenced by forms-manifest.json and copied under the state field-maps folder.</p>
          </Card>
          <Card className="rounded-md p-5">
            <h2 className="text-lg font-black text-navy">Samples and blocked forms</h2>
            <p className="mt-2 text-sm text-grayWilma-700">{state.samples.length} rendered sample packets; {state.blockedArtifacts.length} blocked-form artifacts.</p>
          </Card>
        </section>
      </div>
    </main>
  );
}

function ArtifactCard({ fileName, path }: { fileName: string; path: string }) {
  return (
    <Card className="rounded-md p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="break-words text-sm font-black text-navy">{fileName}</h2>
          <p className="mt-2 break-words text-xs leading-5 text-grayWilma-700">{path}</p>
        </div>
      </div>
    </Card>
  );
}
