import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePartnerOnboardingContext } from "@/lib/partners/onboarding/auth-context";
import { getPartnerArtifactBoard } from "@/lib/partners/onboarding/artifact-service";
import { isRcapOnboardingLaunchPrepEnabled } from "@/lib/partners/onboarding/feature";

import { PartnerArtifactsClient } from "./PartnerArtifactsClient";

export const dynamic = "force-dynamic";

export default async function PartnerArtifactsPage() {
  if (!isRcapOnboardingLaunchPrepEnabled()) {
    notFound();
  }

  let board: Awaited<ReturnType<typeof getPartnerArtifactBoard>> | null = null;
  let role: "partner_admin" | "partner_staff" = "partner_staff";
  try {
    const context = await requirePartnerOnboardingContext();
    role = context.role;
    board = await getPartnerArtifactBoard(context);
  } catch {
    notFound();
  }

  if (!board) notFound();

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
          <h1 className="mt-2 text-3xl font-black">Program documents</h1>
          <p className="mt-2 max-w-2xl text-sm text-grayWilma-700">
            LegalEase prepares these documents from the information you provided.
            Review the facts and branding, and tell us if anything needs correcting.
          </p>
        </header>

        <PartnerArtifactsClient board={board} canReview={role === "partner_admin"} />
      </div>
    </main>
  );
}
