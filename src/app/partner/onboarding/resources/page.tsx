import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { getPartnerLaunchReadiness } from "@/lib/partners/onboarding/launch-readiness-service";
import { isRcapOnboardingLaunchPrepEnabled } from "@/lib/partners/onboarding/feature";

import { PartnerResourcesClient } from "./PartnerResourcesClient";

export const dynamic = "force-dynamic";

export default async function PartnerResourcesPage() {
  if (!isRcapOnboardingLaunchPrepEnabled()) {
    notFound();
  }

  let view: Awaited<ReturnType<typeof getPartnerLaunchReadiness>> | null = null;
  let role: "partner_admin" | "partner_staff" | "partner_viewer" = "partner_staff";
  try {
    const context = await requirePartnerOnboardingContext();
    role = context.role;
    view = await getPartnerLaunchReadiness(context);
  } catch {
    notFound();
  }

  if (!view) notFound();

  return (
    <main className="min-h-screen break-words bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <Link
          href="/partner/onboarding"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-teal hover:text-navy"
        >
          Back to program setup
        </Link>
        <header className="mt-4">
          <p className="text-xs font-black uppercase tracking-wide text-orange">
            Program setup
          </p>
          <h1 className="mt-2 text-3xl font-black">Resources and launch readiness</h1>
          <p className="mt-2 max-w-2xl text-sm text-grayWilma-700">
            Everything LegalEase has approved for your program, and where your
            launch preparation stands. Nothing on this page publishes your page
            or starts your program.
          </p>
        </header>

        <PartnerResourcesClient
          readiness={view.readiness}
          entries={view.board.entries}
          canReview={role === "partner_admin"}
        />
      </div>
    </main>
  );
}
