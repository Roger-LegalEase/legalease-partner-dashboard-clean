import Link from "next/link";
import { Briefcase, LogIn, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";

export default function BriefcasePage() {
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
              <Badge tone="blue">Your Briefcase</Badge>
              <h1 className="mt-4 text-4xl font-black text-navy">Save your record review progress</h1>
              <p className="mt-4 text-sm leading-6 text-grayWilma-700">
                Your Briefcase keeps saved forms, draft packets, filing next steps, fee summaries, and downloadable PDFs in one place so you can return when you are ready.
              </p>
            </div>
          </div>

          {!auth.isAuthenticated ? (
            <div className="mt-6 rounded-md border border-orange/30 bg-orange/10 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange" aria-hidden="true" />
                <p className="text-sm leading-6 text-grayWilma-800">
                  Sign in before using a shared device, and sign out when you are finished reviewing private record-clearing information.
                </p>
              </div>
            </div>
          ) : null}

          <Link href="/sign-in" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Link>
        </Card>
      </div>
    </main>
  );
}
