import Link from "next/link";
import { redirect } from "next/navigation";

import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { requireConsumerBriefcaseSession } from "@/lib/expungement-ai/auth";

/**
 * Compatibility route for bookmarks and Stripe cancel URLs created by older
 * builds. The commercial gate now lives on the exact matter's accuracy review.
 */
export default async function PayPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  await requireConsumerBriefcaseSession(`/expungement-ai/pay${queryString(params)}`);
  const briefcaseItemId = value(params.briefcaseItemId);
  if (briefcaseItemId) {
    redirect(`/briefcase/${encodeURIComponent(briefcaseItemId)}/review`);
  }

  return (
    <ConsumerPageShell wilmaContext="pay" headerVariant="app">
      <section className="mx-auto flex min-h-screen max-w-3xl items-center px-4 pb-16 pt-28 font-sans md:px-8">
        <div className="w-full rounded-[24px] border border-[#ECEFF4] bg-white p-6 shadow-sm md:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#00A99D]">Matter required</p>
          <h1 className="mt-3 text-[32px] font-extrabold leading-tight text-[#0B1320]">Open the matter you want to review.</h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">Packet information and the final payment action belong to one exact Briefcase matter.</p>
          <Link className="mt-6 inline-flex min-h-11 items-center rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white" href="/briefcase/matters">Open my matters</Link>
        </div>
      </section>
    </ConsumerPageShell>
  );
}

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

function queryString(params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();
  for (const [key, input] of Object.entries(params)) {
    const item = value(input);
    if (item) search.set(key, item);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
