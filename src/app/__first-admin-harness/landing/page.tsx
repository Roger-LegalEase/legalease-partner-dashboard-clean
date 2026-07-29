import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";

export default async function SyntheticLandingPage({
  searchParams
}: {
  searchParams: Promise<{ destination?: string }>;
}) {
  const query = await searchParams;
  const enabled = isRcapPartnerOnboardingEnabled();
  const onboarding = enabled && query.destination !== "dashboard";
  return (
    <main className="min-h-screen bg-[#FBF7F2] text-navy">
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <Badge tone="teal">Administrator activated</Badge>
        <h1 className="mt-4 text-3xl font-black md:text-4xl">
          {onboarding ? "Program setup" : "Partner dashboard"}
        </h1>
        <p className="mt-2 font-mono text-sm text-grayWilma-700">
          {onboarding ? "/partner/onboarding" : "/partner/dashboard"}
        </p>
        <Card className="mt-6 rounded-md p-6">
          <h2 className="text-xl font-black">
            Community Justice Initiative
          </h2>
          <p className="mt-3 text-sm leading-6 text-grayWilma-700">
            {onboarding
              ? "Continue the reviewed onboarding workspace and complete the remaining partner-owned setup."
              : "Administrator access is active. Review program activity and team access from the partner dashboard."}
          </p>
        </Card>
      </div>
    </main>
  );
}
