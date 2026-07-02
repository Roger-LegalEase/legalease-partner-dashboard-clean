import Link from "next/link";
import { Briefcase, HelpCircle, LogIn } from "lucide-react";
import { ExpungementWordmark } from "@/components/expungement-ai/ExpungementWordmark";
import { LocalizedText } from "@/components/expungement-ai/LocalizationProvider";

export type ConsumerNavVariant = "marketing" | "app";

/**
 * Consumer header for Expungement.ai inner pages.
 *
 * The public landing page (`/expungement-ai`) renders its own handoff nav and never uses this
 * component. This header serves the inner consumer surfaces in two flavors:
 *
 * - "marketing" (default): dark nav with the full marketing menu + "Start free" CTA. Used on the
 *   marketing/info pages that are reachable from the landing menu (pricing, support, how-it-works,
 *   contact).
 * - "app": clean light app bar with NO marketing menu and NO "Start free". Used inside the actual
 *   product flow (screening, start, check, results, pay, packet-ready, sign-in) where a marketing
 *   CTA is wrong and would compete with the task at hand.
 *
 * Both variants show the polished branded logo (never plain fallback text) linking to
 * `/expungement-ai`.
 */
export function ConsumerNav({ variant = "marketing" }: { variant?: ConsumerNavVariant }) {
  if (variant === "app") {
    return (
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-[#E4E8EF] bg-white/95 px-4 py-3 text-[#0B1320] backdrop-blur md:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <ExpungementWordmark tone="dark" idSuffix="app" />
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[#5A6275] hover:bg-[#F1F4F9] hover:text-[#0B1320]"
              href="/briefcase"
            >
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline"><LocalizedText k="briefcase.label" fallback="Briefcase" /></span>
            </Link>
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#E4E8EF] px-3 text-sm font-semibold text-[#0B1320] hover:bg-[#F1F4F9]"
              href="/expungement-ai/sign-in?mode=signin"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <LocalizedText k="common.sign_in" fallback="Sign in" />
            </Link>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-[#0B1320]/90 px-4 py-3 text-white backdrop-blur md:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <ExpungementWordmark tone="light" idSuffix="marketing" />
        <div className="hidden items-center gap-6 text-sm font-semibold text-white/75 md:flex">
          <Link href="/expungement-ai/how-it-works"><LocalizedText k="nav.how_it_works" fallback="How it works" /></Link>
          <Link href="/expungement-ai/pricing"><LocalizedText k="nav.pricing" fallback="Pricing" /></Link>
          <Link href="/expungement-ai/support"><LocalizedText k="common.support" fallback="Support" /></Link>
          <Link href="/briefcase"><LocalizedText k="briefcase.label" fallback="Briefcase" /></Link>
        </div>
        <div className="flex items-center gap-2">
          <Link className="hidden min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white/80 hover:bg-white/10 md:inline-flex" href="/expungement-ai/sign-in?mode=signin">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <LocalizedText k="common.sign_in" fallback="Sign in" />
          </Link>
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white/80 hover:bg-white/10 md:hidden" href="/expungement-ai/support" aria-label="Support">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#FF3B00] px-4 text-sm font-bold text-white" href="/expungement-ai/start">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            <LocalizedText k="nav.start_free" fallback="Start free" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
