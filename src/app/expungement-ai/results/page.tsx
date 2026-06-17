import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ResultPanel } from "@/components/expungement-ai/ResultPanel";
import { runExpungementAiEligibilityCheck } from "@/lib/expungement-ai/eligibility-adapter";
import type { ExpungementAiCheckInput } from "@/lib/expungement-ai/types";

export default function ResultsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ResultsContent searchParams={searchParams} />;
}

async function ResultsContent({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const pathType = value(params.pathType) as ExpungementAiCheckInput["pathType"] | undefined;
  const state = value(params.state) ?? "PA";
  const result = runExpungementAiEligibilityCheck({
    state,
    pathType: pathType ?? "packet",
    hasRequiredFacts: value(params.hasRequiredFacts) !== undefined,
    timing: value(params.timing) === "too_early" ? "too_early" : "eligible_window",
    packetAvailable: pathType !== "blocked_form",
    caution: value(params.caution) === "true"
  });

  return (
    <ConsumerPageShell wilmaContext="results">
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-32 md:px-8">
        <ResultPanel result={result} />
      </section>
    </ConsumerPageShell>
  );
}

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}
