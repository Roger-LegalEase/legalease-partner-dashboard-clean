import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { getPaymentStatusLabel, getProvisioningStatusLabel } from "@/lib/partners/partner-service";
import { partnerOnboarding } from "@/lib/partners/routes";

const nextSteps = [
  "Organization setup",
  "Partner profile review",
  "Launch kit preparation",
  "Dashboard activation"
];

export default async function PartnerCheckoutSuccessPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const sessionId = typeof resolvedSearchParams.session_id === "string" ? resolvedSearchParams.session_id : "";
  const partnerSlug = typeof resolvedSearchParams.partner_slug === "string" ? resolvedSearchParams.partner_slug : "";
  const partner = partnerSlug ? await getPartnerRecordBySlug(partnerSlug) : undefined;
  const paymentConfirmed = partner?.paymentStatus === "paid";

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge tone="teal">Checkout status</Badge>
              <h1 className="mt-4 text-4xl font-black leading-tight text-navy">
                Payment received or processing.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-grayWilma-700">
                Provisioning opens after Stripe confirms payment to LegalEase. This page confirms the browser returned
                from Stripe Checkout, but query parameters are not payment proof and do not activate provisioning.
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-7 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-4">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-orange" aria-hidden="true" />
              <div>
                <p className="text-sm font-black text-navy">Webhook confirmation required</p>
                <p className="mt-1 text-sm leading-6 text-grayWilma-700">
                  LegalEase waits for Stripe webhook confirmation before paid provisioning activation. The checkout
                  session reference is {sessionId ? "present" : "not present"} on this return URL.
                </p>
              </div>
            </div>
          </div>

          {partner ? (
            <div className="mt-4 grid gap-3 rounded-md border border-grayWilma-200 bg-white p-4 sm:grid-cols-3">
              <StatusItem label="Partner" value={partner.partnerName} />
              <StatusItem label="Payment" value={getPaymentStatusLabel(partner.paymentStatus)} />
              <StatusItem label="Provisioning" value={getProvisioningStatusLabel(partner.provisioningStatus)} />
            </div>
          ) : null}

          <section className="mt-7">
            <h2 className="text-sm font-black uppercase text-grayWilma-600">Next steps after confirmation</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {nextSteps.map((step) => (
                <div
                  key={step}
                  className="rounded-md border border-grayWilma-200 bg-white px-4 py-3 text-sm font-semibold text-grayWilma-700"
                >
                  {step}
                </div>
              ))}
            </div>
          </section>

          <div className="mt-7 flex flex-col gap-3 border-t border-grayWilma-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-5 text-grayWilma-600">
              This phase does not create partners from query params or fake provisioning state.
            </p>
            <Link
              href={paymentConfirmed && partner ? partnerOnboarding(partner.partnerSlug) : "/partners/start"}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
            >
              {paymentConfirmed && partner ? "Continue to onboarding" : "Back to Partner Start"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-grayWilma-600">{label}</p>
      <p className="mt-1 text-sm font-black text-navy">{value}</p>
    </div>
  );
}
