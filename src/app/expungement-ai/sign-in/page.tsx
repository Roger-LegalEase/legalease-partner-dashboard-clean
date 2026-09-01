import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ConsumerSignInForm } from "@/components/expungement-ai/ConsumerSignInForm";
import { LocalizedText } from "@/components/expungement-ai/LocalizationProvider";
import { safeAppRedirectPath } from "@/lib/auth/redirect";

export default async function ConsumerSignInPage({
  searchParams
}: {
  searchParams: Promise<{ mode?: string | string[]; next?: string | string[] }>;
}) {
  const search = await searchParams;
  const explicitMode = typeof search.mode === "string" ? search.mode : "";
  const next = safeAppRedirectPath(typeof search.next === "string" ? search.next : null, "");
  const initialMode = explicitMode === "create" || (
    explicitMode !== "signin" && isConversionNextPath(next)
  ) ? "create" : "signin";

  return (
    <ConsumerPageShell wilmaContext="start" headerVariant="app">
      <section className="mx-auto max-w-xl px-4 pb-16 pt-32 md:px-8">
        <div className="rounded-md border border-[#ECEFF4] bg-white p-6">
          <ConsumerSignInForm initialMode={initialMode} />
          <p className="mt-6 text-xs leading-5 text-[#5A6275]">
            <LocalizedText k="signin.disclaimer" fallback="Expungement.ai is self-help software, not a law firm. The court or agency makes the final decision." />
          </p>
        </div>
      </section>
    </ConsumerPageShell>
  );
}

function isConversionNextPath(next: string) {
  return next.startsWith("/expungement-ai/pay")
    || next.startsWith("/expungement-ai/packet-ready")
    || next.startsWith("/briefcase");
}
