import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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
            <Badge tone="teal">Partner request</Badge>
            <h1 className="mt-3 text-4xl font-black leading-tight text-navy">Start a Record-Clearing Access Program request.</h1>
            <p className="mt-4 text-sm leading-6 text-grayWilma-700">
              Share partner details, service geography, expected 90-day volume, and program goals before the mock payment gate.
            </p>
          </div>

          <Card className="rounded-md p-6">
            <PartnerStartForm />
          </Card>
        </section>
      </div>
    </main>
  );
}
