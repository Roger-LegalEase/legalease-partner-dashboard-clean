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
  searchParams: Promise<{ ai?: string; long?: string; states?: string }>;
}) {
  const requestHeaders = await headers();
  if (requestHeaders.get("x-legalease-local-verifier") !== "promotion-studio-v2") {
    notFound();
  }
  const query = await searchParams;
  const aiConfigured = query.ai !== "off";
  const longFixture = query.long === "1";
  const stateFixture = query.states === "1";
  const draft = (channel: "linkedin" | "x" | "facebook", approvalState: "approved" | "failed", updatedAt: string) => ({
    channel,
    primaryCaption: "A saved source-grounded promotion draft.",
    alternateCaption: null,
    founderVoiceCaption: null,
    partnerCaption: null,
    hashtags: ["#RecordClearing"],
    mentionTags: [],
    utmSource: channel,
    utmMedium: "social",
    utmCampaign: "practical-guide-record-clearing",
    socialAssetId: null,
    approvalState,
    approvedAt: approvalState === "approved" ? "2026-07-18T12:30:00.000Z" : null,
    updatedAt
  });

  return (
    <main className="min-h-screen bg-cream p-4 md:p-8">
      <SocialComposer
        post={{
          postId: "22222222-2222-4222-8222-222222222222",
          title: longFixture
            ? "A practical guide to record clearing for community organizations, workforce leaders, legal-service partners, and families navigating complicated next steps"
            : "A practical guide to record clearing",
          subtitle: "A plain-language look at the process",
          excerpt: "Learn what record clearing may involve and where to find reliable next steps.",
          slug: "practical-guide-record-clearing",
          destination: "expungement_ai",
          contentType: "resource_guide",
          status: "approved",
          legalSensitive: true,
          legalApprovedAt: "2026-07-18T12:00:00.000Z",
          jurisdictionCode: "MS",
          partnerSlug: longFixture ? "community-justice-and-workforce-development-partnership" : "community-partner",
          authorName: "LegalEase Editorial",
          canonicalUrl: "https://expungement.ai/blog/practical-guide-record-clearing",
          updatedAt: "2026-07-18T12:00:00.000Z",
          version: 4
        }}
        drafts={stateFixture ? [
          draft("linkedin", "approved", "2026-07-18T12:30:00.000Z"),
          draft("x", "approved", "2026-07-17T12:30:00.000Z"),
          draft("facebook", "failed", "2026-07-18T12:30:00.000Z")
        ] : []}
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
