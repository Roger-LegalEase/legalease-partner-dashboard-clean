import Link from "next/link";
import { Briefcase, LogIn } from "lucide-react";

export function ConsumerNav() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-[#0B1320]/90 px-4 py-3 text-white backdrop-blur md:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link className="text-base font-extrabold tracking-tight" href="/expungement-ai">
          Expungement.ai
        </Link>
        <div className="hidden items-center gap-6 text-sm font-semibold text-white/75 md:flex">
          <Link href="/expungement-ai/how-it-works">How it works</Link>
          <Link href="/expungement-ai/pricing">Pricing</Link>
          <Link href="/briefcase">Briefcase</Link>
        </div>
        <div className="flex items-center gap-2">
          <Link className="hidden min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white/80 hover:bg-white/10 md:inline-flex" href="/expungement-ai/sign-in">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Link>
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#FF3B00] px-4 text-sm font-bold text-white" href="/expungement-ai/start">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            Start free
          </Link>
        </div>
      </nav>
    </header>
  );
}
