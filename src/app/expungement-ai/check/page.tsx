import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { CheckFlow } from "@/components/expungement-ai/CheckFlow";
import { getConsumerStateOptions } from "@/lib/expungement-ai/states";

export default async function CheckPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const states = getConsumerStateOptions();
  const params = (await searchParams) ?? {};
  const state = Array.isArray(params.state) ? params.state[0] : params.state;

  return (
    <ConsumerPageShell wilmaContext="check">
      <CheckFlow states={states} initialState={state} />
    </ConsumerPageShell>
  );
}
