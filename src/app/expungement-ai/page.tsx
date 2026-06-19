import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ExpungementLandingHandoff } from "./ExpungementLandingHandoff";

export default function ExpungementAiLandingPage() {
  return (
    <ConsumerPageShell wilmaContext="landing" showWilma={false}>
      <ExpungementLandingHandoff />
    </ConsumerPageShell>
  );
}
