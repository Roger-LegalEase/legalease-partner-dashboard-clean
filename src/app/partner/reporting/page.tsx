import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePartnerSession, SessionPartnerError } from "@/lib/partners/session-partner";
import { LocalizedRuntimeText } from "@/components/expungement-ai/LocalizationProvider";

export const dynamic = "force-dynamic";
export default async function PartnerReportingPage() {
  try { await requirePartnerSession(); } catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") redirect("/sign-in?next=/partner/reporting");
    if (error instanceof SessionPartnerError) return <main className="p-8"><h1 className="text-2xl font-bold">Partner access required</h1><Link href="/partner/dashboard">Return to your dashboard</Link></main>;
    throw error;
  }
  return <main className="mx-auto w-full max-w-4xl px-4 py-10"><h1 className="text-3xl font-black"><LocalizedRuntimeText text="Program reporting" /></h1><p className="mt-4"><LocalizedRuntimeText text="Report exports are not yet available. View recorded program activity in your dashboard." /></p><Link href="/partner/dashboard" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-navy px-5 py-2 font-bold text-white"><LocalizedRuntimeText text="Open program dashboard" /></Link></main>;
}
