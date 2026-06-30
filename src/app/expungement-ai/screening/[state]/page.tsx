import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ScreeningFlow } from "@/components/expungement-ai/screening/ScreeningFlow";
import { isSafeSessionId } from "@/components/expungement-ai/screening/partner-session";

// Always render per-request. The flow's partner vs. DTC mode depends on the ?session= query, which a
// statically optimized render would not carry — that omission is what made partner mode (Briefcase
// CTA) silently fall back to the DTC "$50" branch even when the URL had a valid ?session=.
export const dynamic = "force-dynamic";

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
  const initialSessionId = typeof search.session === "string" && isSafeSessionId(search.session) ? search.session : undefined;

  // The shell's global Wilma bubble is disabled here so the flow can render a single, phase-aware
  // Wilma surface (questions vs result), avoiding a duplicate bubble.
  //
  // The key includes the session mode so a partner (session) entry and a DTC entry never reuse the
  // same ScreeningFlow instance/state.
  return (
    <ConsumerPageShell wilmaContext="check" showWilma={false} headerVariant="app">
      <ScreeningFlow key={`${state}:${initialSessionId ?? "dtc"}`} state={state} initialSessionId={initialSessionId} />
    </ConsumerPageShell>
  );
}
