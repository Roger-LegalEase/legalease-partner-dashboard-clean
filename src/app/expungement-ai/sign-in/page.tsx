import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ConsumerSignInForm } from "@/components/expungement-ai/ConsumerSignInForm";
import { LocalizedText } from "@/components/expungement-ai/LocalizationProvider";
import { isGoogleSignInAvailable } from "@/lib/supabase/auth-provider-availability";

export const dynamic = "force-dynamic";

export default async function ConsumerSignInPage() {
  const googleAvailable = await isGoogleSignInAvailable();
  return (
    <ConsumerPageShell wilmaContext="start" headerVariant="app">
      <section className="mx-auto max-w-xl px-4 pb-16 pt-32 md:px-8">
        <div className="rounded-md border border-[#ECEFF4] bg-white p-6">
          <ConsumerSignInForm googleAvailable={googleAvailable} />
          <p className="mt-6 text-xs leading-5 text-[#5A6275]">
            <LocalizedText k="signin.disclaimer" fallback="Expungement.ai is self-help software, not a law firm. The court or agency makes the final decision." />
          </p>
        </div>
      </section>
    </ConsumerPageShell>
  );
}
