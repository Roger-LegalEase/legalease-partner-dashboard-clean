import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { StatePicker } from "@/components/expungement-ai/screening/StatePicker";

export const metadata = {
  title: "Free screening | Expungement.ai"
};

export default function ScreeningStatePickerPage() {
  return (
    <ConsumerPageShell wilmaContext="check" headerVariant="app">
      <StatePicker />
    </ConsumerPageShell>
  );
}
