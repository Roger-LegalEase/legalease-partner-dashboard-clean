import { notFound } from "next/navigation";

import { BriefcaseItemCard } from "@/components/expungement-ai/BriefcaseViews";
import { matterCareState } from "@/lib/expungement-ai/frontend/briefcase-presentation";
import { BRIEFCASE_CARE_FIXTURES } from "@/lib/expungement-ai/frontend/briefcase-fixtures";

/**
 * DEVELOPMENT-ONLY route for visual QA of the Briefcase matter care states. Blocked in
 * production via `notFound()`, so it is inaccessible to consumers and there is no link to it from
 * the app. Uses static fixtures only; it adds no persistence and reads no real user data.
 */
export const metadata = {
  robots: { index: false, follow: false }
};

export default function MatterGalleryPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F7F3EC] text-[#0B1320]">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-12 font-sans md:px-8">
        <div className="mb-6 rounded-xl border border-[#F4D9C7] bg-[#FDF1E8] px-4 py-3 text-sm font-semibold text-[#9A3412]">
          Development-only Briefcase matter-state gallery. Static fixtures for visual QA, not real
          matters. This page is blocked in production builds.
        </div>
        <div className="grid gap-6">
          {BRIEFCASE_CARE_FIXTURES.map((item) => (
            <section key={item.id}>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-[#8A93A6]">
                {matterCareState(item)}
              </p>
              <BriefcaseItemCard item={item} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
