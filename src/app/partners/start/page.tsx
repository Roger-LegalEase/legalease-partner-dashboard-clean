import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { partnerPackages } from "@/lib/partners/packages";
import { PartnerStartForm } from "./PartnerStartForm";

export default function PartnerStartPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <Link href="/partners" className="text-sm font-semibold text-teal hover:text-navy">
          Back to program overview
        </Link>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Badge tone="teal">Partner checkout</Badge>
            <h1 className="mt-3 text-4xl font-black leading-tight text-navy">Choose a Record-Clearing Access Program package.</h1>
            <p className="mt-4 text-sm leading-6 text-grayWilma-700">
              Select the implementation package that matches your organization&apos;s record-clearing access goals. Payment is required
              before LegalEase begins provisioning partner setup, launch materials, and dashboard activation.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-grayWilma-700">
              <div className="rounded-md border border-grayWilma-200 bg-white p-4">
                <p className="font-black text-navy">Provisioning starts after confirmation</p>
                <p className="mt-1 leading-6">
                  Checkout creates a Stripe test-mode payment session. The app waits for confirmed payment before paid
                  provisioning activation is introduced.
                </p>
              </div>
            </div>
          </div>

          <Card className="rounded-md p-6">
            <PartnerStartForm packages={partnerPackages} />
          </Card>
        </section>
      </div>
    </main>
  );
}
