import { ConsumerPageShell } from "@/components/expungement-ai/ConsumerPageShell";
import { ConsumerFlowCard, FlowButton } from "@/components/expungement-ai/ConsumerFlowCard";

export default function StartPage() {
  return (
    <ConsumerPageShell wilmaContext="start">
      <ConsumerFlowCard
        eyebrow="Free eligibility check"
        title="Let's see if there may be a path."
        lead="Answer a few plain questions. Your check saves privately to Briefcase as you go, and you only pay if a self-help packet is available."
      >
        <div className="mt-7">
          <FlowButton href="/expungement-ai/check">Start free &rarr;</FlowButton>
        </div>
        <p className="mt-4 text-center text-[12.5px] leading-6 text-[#8A93A6]">This is legal information, not legal advice. Court approval is not guaranteed.</p>
      </ConsumerFlowCard>
    </ConsumerPageShell>
  );
}
