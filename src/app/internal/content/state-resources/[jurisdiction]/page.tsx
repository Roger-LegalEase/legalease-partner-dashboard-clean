import Link from "next/link";

import StateResourceEditor from "@/components/content/admin/StateResourceEditor";
import { ContentDenied } from "@/components/content/admin/ContentDenied";
import { EmptyState, Panel } from "@/components/content/admin/primitives";
import { resolveContentPageAccess } from "@/lib/content/auth";
import { getStateEditorialRow } from "@/lib/content/cms-queries";
import {
  assertNoInternalLeak,
  isJurisdictionPublishable,
  type LockedStateLayer
} from "@/lib/content/state-resources";
import { roleHasCapability } from "@/lib/content/types";
import {
  getStateLandingDataByCode,
  getStateLandingDataBySlug,
  type StateLandingData
} from "@/lib/expungement-ai/state-landing/state-landing-data";

export const dynamic = "force-dynamic";

type Params = Promise<{ jurisdiction: string }>;

/**
 * The locked layer, built field by field from the approved public projection — never spread from the
 * engine object, and re-checked by the leak gate before it is handed to a component. This is the same
 * seven-field boundary the public resources page uses; the CMS does not get a wider one just because
 * it is internal.
 */
function toLockedLayer(data: StateLandingData): LockedStateLayer {
  const locked: LockedStateLayer = {
    code: data.code,
    name: data.name,
    slug: data.slug,
    displayTerm: data.displayTerm,
    termBlurb: data.termBlurb,
    allowedStateTerms: [...data.allowedStateTerms],
    pathwayHighlights: [...data.pathwayHighlights],
    screeningHref: `/expungement-ai/screening/${data.code.toUpperCase()}`,
    statePickerHref: "/expungement-ai/screening"
  };
  assertNoInternalLeak(locked);
  return locked;
}

export default async function StateResourceDetailPage({ params }: { params: Params }) {
  // GATE FIRST.
  const access = await resolveContentPageAccess("/internal/content/state-resources");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const { jurisdiction } = await params;
  const data =
    getStateLandingDataBySlug(jurisdiction) ?? getStateLandingDataByCode(jurisdiction.toUpperCase());

  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/internal/content/state-resources" className="text-xs font-bold text-navy underline">
          ← State resources
        </Link>
        <Panel title="Unknown jurisdiction">
          <EmptyState message={`No jurisdiction matches “${jurisdiction}”.`} />
        </Panel>
      </div>
    );
  }

  const code = data.code.toUpperCase();
  const row = await getStateEditorialRow(code);
  const locked = toLockedLayer(data);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/internal/content/state-resources" className="text-xs font-bold text-navy underline">
          ← State resources
        </Link>
        <h1 className="mt-2 text-3xl font-black text-navy">{data.name} resources</h1>
        <p className="mt-1 text-sm text-slate-600">
          Two layers. The engine owns the law. You own the voice.
        </p>
      </header>

      <StateResourceEditor
        code={code}
        locked={locked}
        status={row?.status ?? "draft"}
        publishable={isJurisdictionPublishable(code)}
        legalApprovedAt={row?.legalApprovedAt ?? null}
        canEdit={
          roleHasCapability(access.session.role, "content.edit_any") ||
          roleHasCapability(access.session.role, "content.edit_own")
        }
        initial={{
          intro: row?.intro ?? "",
          overview: row?.overview ?? "",
          featuredMediaId: row?.featuredMediaId ?? "",
          faqs: row?.faqs ?? [],
          relatedSlugs: (row?.relatedSlugs ?? []).join(", "),
          partnerQuote: row?.partnerQuote ?? "",
          partnerSlug: row?.partnerSlug ?? "",
          announcement: row?.announcement ?? "",
          seoTitle: row?.seoTitle ?? "",
          seoDescription: row?.seoDescription ?? "",
          ctaLabel: row?.ctaLabel ?? "",
          ctaHref: row?.ctaHref ?? ""
        }}
      />
    </div>
  );
}
