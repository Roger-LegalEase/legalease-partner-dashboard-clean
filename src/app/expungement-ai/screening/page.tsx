import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { StatePicker } from "@/components/expungement-ai/screening/StatePicker";

export const metadata = {
  title: "Check your record — Expungement.ai"
};

export default function ScreeningStatePickerPage() {
  return (
    <ConsumerPageShell wilmaContext="check">
      <StatePicker />
    </ConsumerPageShell>
  );
}
