import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { StatePicker } from "@/components/expungement-ai/screening/StatePicker";

export default function CheckPage() {
  return (
    <ConsumerPageShell wilmaContext="check" headerVariant="app">
      <StatePicker />
    </ConsumerPageShell>
  );
}
