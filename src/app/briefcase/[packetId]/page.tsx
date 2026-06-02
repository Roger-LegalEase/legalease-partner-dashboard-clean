import Link from "next/link";
import { Briefcase, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";

export default async function BriefcasePacketPage({
  params
}: {
  params: Promise<{ packetId: string }>;
}) {
  const { packetId } = await params;
  const auth = getRcapBriefcaseAuthState();

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6 md:p-8">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
              <Briefcase className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <Badge tone="orange">Auth required</Badge>
              <h1 className="mt-4 text-4xl font-black text-navy">Open your Briefcase</h1>
              <p className="mt-4 text-sm leading-6 text-grayWilma-700">
                This private packet route is structured for user-scoped access. Production auth must verify the signed-in user before packet details are shown.
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
            <p className="text-sm leading-6 text-grayWilma-700">
              Packet reference: {packetId}. Auth mode: {auth.mode}. Sensitive packet fields are not displayed without production user protection.
            </p>
          </div>
          <Link href="/sign-in" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white">
            Sign in to continue
          </Link>
        </Card>
      </div>
    </main>
  );
}
