import Link from "next/link";
import { CheckCircle2, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getMockPartner, getProgramTier } from "@/lib/partner-program-data";

const unlocks = [
  "Co-branded partner page",
  "Onboarding hub",
  "Partner dashboard activation",
  "Launch kit",
  "Email sequence",
  "Weekly reports",
  "Final impact report"
];

export default async function PartnerCheckoutPage({
  params
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const partner = getMockPartner(partnerId);
  const tier = getProgramTier(partner.selectedTierId);

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <Link href="/partners/start" className="text-sm font-semibold text-teal hover:text-navy">
          Back to partner request
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <Card className="rounded-md p-6">
            <Badge tone="orange">Demo payment gate</Badge>
            <h1 className="mt-4 text-4xl font-black leading-tight text-navy">Complete demo payment to unlock onboarding.</h1>
            <p className="mt-4 text-sm leading-6 text-grayWilma-700">
              This page models the payment step for {partner.name}. It does not create a Stripe session, charge a card,
              or store payment state.
            </p>

            <div className="mt-6 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-grayWilma-600">Selected tier</p>
              <h2 className="mt-2 text-2xl font-black text-navy">{tier.name}</h2>
              <p className="mt-1 text-sm font-bold text-teal">{tier.investmentRange}</p>
              <p className="mt-1 text-sm text-grayWilma-700">{tier.userVolume}</p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={`/partners/onboarding/${partner.slug}?paid=true`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
              >
                Complete Demo Payment
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </Link>
              <p className="text-xs leading-5 text-grayWilma-600">Mock unlock uses the URL query param paid=true.</p>
            </div>
          </Card>

          <Card className="rounded-md p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-orange/10 text-orange">
                <LockKeyhole className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-black text-navy">Locked before payment</p>
                <p className="text-xs text-grayWilma-600">Demo state only</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {unlocks.map((unlock) => (
                <div key={unlock} className="flex items-center gap-3 rounded-md border border-grayWilma-200 px-3 py-2 text-sm font-semibold text-grayWilma-700">
                  <LockKeyhole className="h-4 w-4 text-grayWilma-600" aria-hidden="true" />
                  {unlock}
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
