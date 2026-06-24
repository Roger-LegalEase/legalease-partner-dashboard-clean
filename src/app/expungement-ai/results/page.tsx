import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ResultPanel } from "@/components/expungement-ai/ResultPanel";
import { runExpungementAiEligibilityCheck } from "@/lib/expungement-ai/eligibility-adapter";

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
  const state = value(params.state) ?? "PA";
  const result = runExpungementAiEligibilityCheck({
    state,
    matterId: `consumer-check-${state.toLowerCase()}`,
    answers: answersFromSearchParams(params)
  });

  return (
    <ConsumerPageShell wilmaContext="results" headerVariant="app">
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-32 md:px-8">
        <ResultPanel result={result} />
      </section>
    </ConsumerPageShell>
  );
}

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

function answersFromSearchParams(params: Record<string, string | string[] | undefined>) {
  const caseOutcome = value(params.caseOutcome);
  const recordCategory = value(params.recordCategory);
  const timing = value(params.timing);
  const county = value(params.county);
  const caseNumber = value(params.caseNumber);

  return {
    ownership_scope: "Yes",
    jurisdiction_scope: "State or local",
    case_outcome: mapCaseOutcome(caseOutcome),
    offense_level: mapRecordCategory(recordCategory),
    sentence_completion_date: timing === "too_early" ? "No" : "Yes",
    disposition_date: timing === "unknown" ? "I am not sure" : "2020-01-01",
    state_exclusion_categories: ["None of these"],
    record_documents: caseNumber ? "Yes" : "I am not sure",
    court: "I am not sure",
    charge: recordCategory ?? "I am not sure",
    county_or_filing_location: county || "I am not sure",
    case_identifier: caseNumber || "I am not sure"
  };
}

function mapCaseOutcome(valueText: string | undefined) {
  if (!valueText) return "I am not sure";
  if (/dismissed|dropped/i.test(valueText)) return "Dismissed, no-billed, nolle prosequi, or not prosecuted";
  if (/not guilty/i.test(valueText)) return "Acquitted or found not guilty";
  if (/pending/i.test(valueText)) return "I am not sure";
  return "Misdemeanor conviction";
}

function mapRecordCategory(valueText: string | undefined) {
  if (!valueText) return "I am not sure";
  if (/felony/i.test(valueText)) return "Felony";
  if (/arrest/i.test(valueText)) return "Infraction or violation";
  if (/municipal|ordinance/i.test(valueText)) return "Municipal or ordinance matter";
  return "Misdemeanor";
}
