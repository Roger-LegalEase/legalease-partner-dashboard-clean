import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ConsumerSignInForm } from "@/components/expungement-ai/ConsumerSignInForm";
import { LocalizedText } from "@/components/expungement-ai/LocalizationProvider";
import { consumerClaimRecoveryHandoffFrom } from "@/lib/expungement-ai/auth-continuation";

export default async function ConsumerSignInPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = toSearchParams((await searchParams) ?? {});
  const recoveryHandoff = consumerClaimRecoveryHandoffFrom(params);
  return (
    <ConsumerPageShell wilmaContext="start" headerVariant="app">
      <section className="mx-auto max-w-xl px-4 pb-16 pt-32 md:px-8">
        <div className="rounded-md border border-[#ECEFF4] bg-white p-6">
          <ConsumerSignInForm initialRecoveryHandoff={recoveryHandoff} />
          <p className="mt-6 text-xs leading-5 text-[#5A6275]">
            <LocalizedText k="signin.disclaimer" fallback="Expungement.ai is self-help software, not a law firm. The court or agency makes the final decision." />
          </p>
        </div>
      </section>
    </ConsumerPageShell>
  );
}

function toSearchParams(values: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, input] of Object.entries(values)) {
    const value = Array.isArray(input) ? input[0] : input;
    if (value !== undefined) params.set(key, value);
  }
  return params;
}
