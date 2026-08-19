import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PartnerRecoveryState } from "@/components/partners/PartnerRecoveryState";
import type { PartnerRecoveryCode } from "@/lib/partners/onboarding/brand-page-presentation";

export const dynamic = "force-dynamic";

// Only the codes this flow can actually produce are accepted. Anything else,
// including a hand-edited query string, renders the generic state, so the page
// cannot be used to fish for which condition a given invitation is in.
const ALLOWED: readonly PartnerRecoveryCode[] = [
  "invitation_unavailable",
  "wrong_signed_in_email",
  "account_already_connected",
  "invitation_already_used"
];

export default async function FirstAdminClaimUnavailablePage({
  searchParams
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const raw = (await searchParams).code;
  const requested = typeof raw === "string" ? raw : "";
  const code = (ALLOWED as readonly string[]).includes(requested)
    ? (requested as PartnerRecoveryCode)
    : "invitation_unavailable";

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6">
          <Badge tone="blue">LegalEase administrator access</Badge>
          <div className="mt-6">
            <PartnerRecoveryState code={code} />
          </div>
        </Card>
      </div>
    </main>
  );
}
