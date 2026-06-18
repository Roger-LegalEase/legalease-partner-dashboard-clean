import Link from "next/link";
import { Briefcase, HelpCircle, Mail, MapPin, PlayCircle } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";

export default function ExpungementAiContactPage() {
  return (
    <ConsumerPageShell wilmaContext="landing">
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-32 md:px-8">
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-bold uppercase text-[#00A99D]">Product contact</p>
            <h1 className="mt-3 text-4xl font-extrabold">Contact Expungement.ai</h1>
            <p className="mt-4 text-sm leading-6 text-[#5A6275]">
              Contact us about Expungement.ai accounts, payments, packet access, Briefcase, Wilma, or technical issues with the product.
            </p>
            <p className="mt-4 rounded-md border border-[#D9DEE8] bg-white p-4 text-sm leading-6 text-[#5A6275]">
              We can help with account, payment, packet access, and technical issues. We cannot provide legal advice or guarantee court outcomes.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#FF3B00] px-4 text-sm font-bold text-white" href="/expungement-ai/support">
                <HelpCircle className="h-4 w-4" aria-hidden="true" /> Technical support
              </Link>
              <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] bg-white px-4 text-sm font-bold" href="/briefcase">
                <Briefcase className="h-4 w-4" aria-hidden="true" /> Briefcase
              </Link>
              <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#D9DEE8] bg-white px-4 text-sm font-bold" href="/expungement-ai/check">
                <PlayCircle className="h-4 w-4" aria-hidden="true" /> Start a new check
              </Link>
            </div>
          </div>
          <aside className="rounded-md border border-[#ECEFF4] bg-white p-5">
            <h2 className="text-xl font-extrabold">LegalEase</h2>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-[#5A6275]">
              <p className="flex gap-3">
                <Mail className="mt-1 h-4 w-4 shrink-0 text-[#00A99D]" aria-hidden="true" />
                <a className="font-bold text-[#0B1320]" href="mailto:info@legalease.law">info@legalease.law</a>
              </p>
              <p className="flex gap-3">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#00A99D]" aria-hidden="true" />
                <span>907 W. Peace Street, Canton, MS 39046</span>
              </p>
            </div>
          </aside>
        </div>
      </section>
    </ConsumerPageShell>
  );
}
