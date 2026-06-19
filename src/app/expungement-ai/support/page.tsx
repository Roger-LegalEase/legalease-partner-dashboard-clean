import Link from "next/link";
import { Briefcase, CreditCard, Download, HelpCircle, LogIn, MessageCircle, MoreHorizontal } from "lucide-react";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { SupportRequestForm } from "@/components/expungement-ai/SupportRequestForm";

const helpTopics = [
  { title: "Account or login", icon: LogIn },
  { title: "Payment or receipt", icon: CreditCard },
  { title: "Packet download", icon: Download },
  { title: "Briefcase", icon: Briefcase },
  { title: "Wilma", icon: MessageCircle },
  { title: "Technical issue", icon: HelpCircle },
  { title: "Something else", icon: MoreHorizontal }
];

export default async function ExpungementAiSupportPage({
  searchParams
}: {
  searchParams?: Promise<{ briefcaseItemId?: string | string[] }>;
}) {
  const params = (await searchParams) ?? {};
  const briefcaseItemId = Array.isArray(params.briefcaseItemId) ? params.briefcaseItemId[0] : params.briefcaseItemId;

  return (
    <ConsumerPageShell wilmaContext="briefcase">
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-32 md:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-xs font-bold uppercase text-[#00A99D]">Technical support</p>
            <h1 className="mt-3 text-4xl font-extrabold">What do you need help with?</h1>
            <p className="mt-4 text-sm leading-6 text-[#5A6275]">
              Your request will be routed to the LegalEase support team. Support can help with account, payment, receipt, packet access, Briefcase, and technical issues.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {helpTopics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <div key={topic.title} className="rounded-md border border-[#ECEFF4] bg-white p-4">
                    <Icon className="h-5 w-5 text-[#FF3B00]" aria-hidden="true" />
                    <p className="mt-3 text-sm font-extrabold">{topic.title}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 rounded-md border border-[#D9DEE8] bg-white p-4 text-sm leading-6 text-[#5A6275]">
              <HelpCircle className="mb-3 h-5 w-5 text-[#00A99D]" aria-hidden="true" />
              <p>For urgent legal deadlines, contact a lawyer or the court directly.</p>
              <p className="mt-2">Expungement.ai support cannot provide legal advice. Court approval is not promised.</p>
              <p className="mt-2">For technical help, contact <a className="font-bold text-[#0B1320]" href="mailto:info@legalease.law">info@legalease.law</a>.</p>
              <Link className="mt-4 inline-flex min-h-10 items-center rounded-md border border-[#D9DEE8] px-4 text-sm font-bold" href="/expungement-ai/contact">Contact page</Link>
            </div>
          </div>
          <SupportRequestForm briefcaseItemId={briefcaseItemId} routeSubmittedFrom="/expungement-ai/support" />
        </div>
      </section>
    </ConsumerPageShell>
  );
}
