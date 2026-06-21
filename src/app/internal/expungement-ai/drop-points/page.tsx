import { BarChart3, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getScreeningDropPointAnalytics } from "@/lib/expungement-ai/screening-drop-point-analytics";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ExpungementDropPointAnalyticsPage() {
  const access = await resolveInternalAdminPageAccess("/internal/expungement-ai/drop-points");

  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }

  const supabase = getSupabaseAdminClient();
  const rows = supabase ? await getScreeningDropPointAnalytics(supabase) : [];

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">
          <div>
            <Badge tone="blue">Internal admin only</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy md:text-5xl">Expungement.ai drop-point analytics</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-grayWilma-700">
              Aggregate ranking of saved screening sessions by the field where progress stopped.
            </p>
          </div>
          <Card className="rounded-md p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal/10 text-teal">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-navy">Aggregate only</p>
                <p className="mt-1 text-xs leading-5 text-grayWilma-600">Only grouped counts are rendered; individual saved sessions and resume secrets stay out of this report.</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="mt-8">
          <Card className="overflow-hidden rounded-md">
            <div className="flex items-center gap-2 border-b border-grayWilma-200 bg-white px-5 py-4">
              <BarChart3 className="h-5 w-5 text-teal" aria-hidden="true" />
              <h2 className="text-lg font-black text-navy">What people do not have handy</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-grayWilma-200 text-left text-sm">
                <thead className="bg-grayWilma-50 text-xs uppercase tracking-wide text-grayWilma-600">
                  <tr>
                    <th className="px-5 py-3 font-black">question_id</th>
                    <th className="px-5 py-3 font-black">jurisdiction</th>
                    <th className="px-5 py-3 font-black">furthest_stage</th>
                    <th className="px-5 py-3 text-right font-black">drop_count</th>
                    <th className="px-5 py-3 text-right font-black">resumed_count</th>
                    <th className="px-5 py-3 text-right font-black">went_dark_count</th>
                    <th className="px-5 py-3 text-right font-black">went_dark_rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grayWilma-100 bg-white">
                  {rows.map((row) => (
                    <tr key={`${row.question_id}:${row.jurisdiction}:${row.furthest_stage ?? ""}`}>
                      <td className="px-5 py-3 font-semibold text-navy">{row.question_id}</td>
                      <td className="px-5 py-3 text-grayWilma-700">{row.jurisdiction}</td>
                      <td className="px-5 py-3 text-grayWilma-700">{row.furthest_stage ?? "none"}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-grayWilma-800">{row.drop_count}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-grayWilma-800">{row.resumed_count}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-grayWilma-800">{row.went_dark_count}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-grayWilma-800">{formatRate(row.went_dark_rate)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-center text-sm text-grayWilma-600" colSpan={7}>
                        No saved screening drop points are available yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

function formatRate(value: number) {
  return `${Math.round(value * 100)}%`;
}
