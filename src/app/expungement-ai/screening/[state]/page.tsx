import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ScreeningFlow } from "@/components/expungement-ai/screening/ScreeningFlow";

/**
 * Per-state screening route. The client `ScreeningFlow` loads the jurisdiction profile through the
 * adapter (mock on this branch) and handles its own loading / missing / malformed states, so the
 * live swap to GET /profiles/{state} stays isolated to the adapter.
 */
export default async function ScreeningStatePage({
  params,
  searchParams
}: {
  params: Promise<{ state: string }>;
  searchParams: Promise<{ session?: string | string[] }>;
}) {
  const [{ state }, search] = await Promise.all([params, searchParams]);
  const initialSessionId = typeof search.session === "string" && isSafeUuid(search.session) ? search.session : undefined;

  // The shell's global Wilma bubble is disabled here so the flow can render a single, phase-aware
  // Wilma surface (questions vs result), avoiding a duplicate bubble.
  return (
    <ConsumerPageShell wilmaContext="check" showWilma={false} headerVariant="app">
      <ScreeningFlow key={state} state={state} initialSessionId={initialSessionId} />
    </ConsumerPageShell>
  );
}

function isSafeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}
