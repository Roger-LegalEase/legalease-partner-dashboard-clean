import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ScreeningFlow } from "@/components/expungement-ai/screening/ScreeningFlow";

/**
 * Per-state screening route. The client `ScreeningFlow` loads the jurisdiction profile through the
 * adapter (mock on this branch) and handles its own loading / missing / malformed states, so the
 * live swap to GET /profiles/{state} stays isolated to the adapter.
 */
export default async function ScreeningStatePage({
  params
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;

  // The shell's global Wilma bubble is disabled here so the flow can render a single, phase-aware
  // Wilma surface (questions vs result), avoiding a duplicate bubble.
  return (
    <ConsumerPageShell wilmaContext="check" showWilma={false}>
      <ScreeningFlow key={state} state={state} />
    </ConsumerPageShell>
  );
}
