import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ConsumerSignInForm } from "@/components/expungement-ai/ConsumerSignInForm";

export default function ConsumerSignInPage() {
  return (
    <ConsumerPageShell wilmaContext="start" headerVariant="app">
      <section className="mx-auto max-w-xl px-4 pb-16 pt-32 md:px-8">
        <div className="rounded-md border border-[#ECEFF4] bg-white p-6">
          <p className="text-xs font-bold uppercase text-[#00A99D]">Your Expungement.ai account</p>
          <h1 className="mt-3 text-3xl font-extrabold">Sign in to continue</h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">
            Sign in to save your record-clearing result, return to your Briefcase, and keep your next steps in one place.
          </p>
          <ConsumerSignInForm />
          <p className="mt-6 text-xs leading-5 text-[#5A6275]">
            Expungement.ai is self-help software, not a law firm. Court approval is not guaranteed.
          </p>
        </div>
      </section>
    </ConsumerPageShell>
  );
}
