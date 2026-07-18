import { headers } from "next/headers";
import { notFound } from "next/navigation";

import SocialComposer from "@/components/content/admin/SocialComposer";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/**
 * Header-gated Playwright fixture for the real client component. Ordinary requests always answer
 * 404 and the fixture contains no database content or authorization bypass.
 */
export default async function PromotionStudioVerificationPage({
  searchParams
}: {
  searchParams: Promise<{ ai?: string }>;
}) {
  const requestHeaders = await headers();
  if (requestHeaders.get("x-legalease-local-verifier") !== "promotion-studio-v2") {
    notFound();
  }
  const aiConfigured = (await searchParams).ai !== "off";

  return (
    <main className="min-h-screen bg-cream p-4 md:p-8">
      <SocialComposer
        post={{
          postId: "22222222-2222-4222-8222-222222222222",
          title: "A practical guide to record clearing",
          subtitle: "A plain-language look at the process",
          excerpt: "Learn what record clearing may involve and where to find reliable next steps.",
          slug: "practical-guide-record-clearing",
          destination: "expungement_ai",
          contentType: "resource_guide",
          status: "approved",
          legalSensitive: true,
          legalApprovedAt: "2026-07-18T12:00:00.000Z",
          jurisdictionCode: "MS",
          partnerSlug: "community-partner",
          authorName: "LegalEase Editorial",
          canonicalUrl: "https://expungement.ai/blog/practical-guide-record-clearing",
          updatedAt: "2026-07-18T12:00:00.000Z",
          version: 4
        }}
        drafts={[]}
        assets={[]}
        commandCenter={{ connected: false, reason: "Content delivery is disabled in this environment." }}
        ai={{ configured: aiConfigured, reason: aiConfigured ? null : "disabled" }}
        canDraft
        canApprove
        canSend
      />
    </main>
  );
}
