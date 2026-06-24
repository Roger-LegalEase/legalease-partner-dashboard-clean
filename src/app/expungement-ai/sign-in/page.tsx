import Link from "next/link";
import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";

export default function ConsumerSignInPage() {
  return (
    <ConsumerPageShell wilmaContext="start" headerVariant="app">
      <section className="mx-auto max-w-xl px-4 pb-16 pt-32 md:px-8">
        <div className="rounded-md border border-[#ECEFF4] bg-white p-6">
          <p className="text-xs font-bold uppercase text-[#00A99D]">Consumer account</p>
          <h1 className="mt-3 text-3xl font-extrabold">Sign in to Expungement.ai</h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">This consumer shell reuses the existing auth entry point without changing partner auth, RLS, or session logic.</p>
          <Link className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href="/sign-in?next=/briefcase">Continue to sign in</Link>
        </div>
      </section>
    </ConsumerPageShell>
  );
}
