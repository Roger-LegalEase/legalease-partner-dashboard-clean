import Link from "next/link";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";

export default function StartPage() {
  return (
    <ConsumerPageShell wilmaContext="start">
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-32 md:px-8">
        <p className="text-xs font-bold uppercase text-[#00A99D]">Start</p>
        <h1 className="mt-3 text-4xl font-extrabold">Create your check and save it to Briefcase</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5A6275]">Every user has an account and every screening path creates a Briefcase record, including guidance-only and non-packet outcomes.</p>
        <Link className="mt-8 inline-flex min-h-11 items-center rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href="/expungement-ai/check">Begin eligibility check</Link>
      </section>
    </ConsumerPageShell>
  );
}
