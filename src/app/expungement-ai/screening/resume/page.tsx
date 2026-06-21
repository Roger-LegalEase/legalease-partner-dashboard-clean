import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ResumeScreeningClient } from "@/components/expungement-ai/screening/ResumeScreeningClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Resume saved progress - Expungement.ai"
};

export default function ResumeScreeningPage() {
  return (
    <ConsumerPageShell wilmaContext="check" showWilma={false}>
      <ResumeScreeningClient />
    </ConsumerPageShell>
  );
}
