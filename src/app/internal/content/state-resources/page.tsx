import Link from "next/link";

import { ContentDenied } from "@/components/content/admin/ContentDenied";
import { Panel, Pill, StatCard, formatDateTime, humanize } from "@/components/content/admin/primitives";
import { resolveContentPageAccess } from "@/lib/content/auth";
import { listStateEditorialRows } from "@/lib/content/cms-queries";
import { isJurisdictionPublishable } from "@/lib/content/state-resources";
import {
  getStateLandingDataBySlug,
  listStateLandingSlugs
} from "@/lib/expungement-ai/state-landing/state-landing-data";

export const dynamic = "force-dynamic";

export default async function StateResourcesPage() {
  // GATE FIRST.
  const access = await resolveContentPageAccess("/internal/content/state-resources");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const editorial = await listStateEditorialRows();

  const jurisdictions = listStateLandingSlugs()
    .map((slug) => getStateLandingDataBySlug(slug))
    .filter((data): data is NonNullable<typeof data> => Boolean(data))
    .map((data) => {
      const row = editorial.get(data.code.toUpperCase());
      return {
        code: data.code.toUpperCase(),
        name: data.name,
        slug: data.slug,
        displayTerm: data.displayTerm,
        publishable: isJurisdictionPublishable(data.code),
        status: row?.status ?? "not_started",
        legalApprovedAt: row?.legalApprovedAt ?? null,
        updatedAt: row?.updatedAt ?? null,
        hasIntro: Boolean(row?.intro?.trim()),
        faqCount: row?.faqs.length ?? 0
      };
    });

  const published = jurisdictions.filter((item) => item.status === "published").length;
  const drafted = jurisdictions.filter((item) => item.status !== "not_started").length;
  const publishable = jurisdictions.filter((item) => item.publishable).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-navy">State resources</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          One row per jurisdiction. The legal layer on each page is locked and comes from the
          record-clearing engine; only the editorial layer is authored here. A state whose promotion
          manifest does not mark it approved and live will not render a public page, however complete
          its editorial layer is.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Jurisdictions" value={jurisdictions.length} />
        <StatCard label="Approved for live" value={publishable} />
        <StatCard label="Editorial started" value={drafted} />
        <StatCard label="Editorial published" value={published} />
      </section>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Jurisdiction</th>
                <th className="py-2 pr-3">Locked term</th>
                <th className="py-2 pr-3">Public page</th>
                <th className="py-2 pr-3">Editorial status</th>
                <th className="py-2 pr-3">Legal approval</th>
                <th className="py-2 pr-3">FAQs</th>
                <th className="py-2 pr-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {jurisdictions.map((item) => (
                <tr key={item.code} className="hover:bg-slate-50">
                  <td className="py-3 pr-3">
                    <Link
                      href={`/internal/content/state-resources/${item.slug}`}
                      className="text-sm font-bold text-navy hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="font-mono text-[11px] text-slate-400">{item.code}</p>
                  </td>
                  <td className="py-3 pr-3 text-xs font-semibold text-slate-700">{item.displayTerm}</td>
                  <td className="py-3 pr-3">
                    <Pill tone={item.publishable ? "ok" : "warn"}>
                      {item.publishable ? "Approved" : "Not promoted"}
                    </Pill>
                  </td>
                  <td className="py-3 pr-3">
                    <Pill
                      tone={
                        item.status === "published" ? "ok" : item.status === "not_started" ? "neutral" : "warn"
                      }
                    >
                      {humanize(item.status)}
                    </Pill>
                  </td>
                  <td className="py-3 pr-3 text-xs text-slate-600">
                    {item.legalApprovedAt ? formatDateTime(item.legalApprovedAt) : "Not approved"}
                  </td>
                  <td className="py-3 pr-3 text-xs text-slate-600">{item.faqCount}</td>
                  <td className="py-3 pr-3 text-xs text-slate-500">{formatDateTime(item.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
