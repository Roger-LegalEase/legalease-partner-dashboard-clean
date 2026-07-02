import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ConsumerSignInForm } from "@/components/expungement-ai/ConsumerSignInForm";
import { LocalizedText } from "@/components/expungement-ai/LocalizationProvider";

export default function ConsumerSignInPage() {
  return (
    <ConsumerPageShell wilmaContext="start" headerVariant="app">
      <section className="mx-auto max-w-xl px-4 pb-16 pt-32 md:px-8">
        <div className="rounded-md border border-[#ECEFF4] bg-white p-6">
          <ConsumerSignInForm />
          <p className="mt-6 text-xs leading-5 text-[#5A6275]">
            <LocalizedText k="signin.disclaimer" fallback="Expungement.ai is self-help software, not a law firm. Court approval is not guaranteed." />
          </p>
        </div>
      </section>
    </ConsumerPageShell>
  );
}
