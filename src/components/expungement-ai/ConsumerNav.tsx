"use client";

import Link from "next/link";
import { Briefcase, HelpCircle, LogIn, LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";
import { ExpungementWordmark } from "@/components/expungement-ai/ExpungementWordmark";
import { LocalizedText, useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export type ConsumerNavVariant = "marketing" | "app";

/**
 * Consumer header for Expungement.ai inner pages.
 *
 * The public landing page (`/expungement-ai`) renders its own handoff nav and never uses this
 * component. This header serves the inner consumer surfaces in two flavors:
 *
 * - "marketing" (default): dark nav with the full marketing menu + "Check my options" CTA. Used on the
 *   marketing/info pages that are reachable from the landing menu (pricing, support, how-it-works,
 *   contact).
 * - "app": clean light app bar with NO marketing menu and NO "Check my options". Used inside the actual
 *   product flow (screening, start, check, results, pay, packet-ready, sign-in) where a marketing
 *   CTA is wrong and would compete with the task at hand.
 *
 * Both variants show the polished branded logo (never plain fallback text) linking to
 * `/expungement-ai`.
 */
export function ConsumerNav({ variant = "marketing" }: { variant?: ConsumerNavVariant }) {
  const isAuthenticated = useConsumerAuthState();

  if (variant === "app") {
    return (
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-[#E4E8EF] bg-white/95 px-4 py-3 text-[#0B1320] backdrop-blur md:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <ExpungementWordmark tone="dark" idSuffix="app" />
          <div className="flex items-center gap-2">
            <LocaleSwitch light />
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-[#5A6275] hover:bg-[#F1F4F9] hover:text-[#0B1320]"
              href="/briefcase"
            >
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline"><LocalizedText k="briefcase.label" fallback="Briefcase" /></span>
            </Link>
            <AuthControl isAuthenticated={isAuthenticated} light />
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
          <Link href="/expungement-ai#how-it-works"><LocalizedText k="nav.how_it_works" fallback="How it works" /></Link>
          <Link href="/expungement-ai#what-you-get"><LocalizedText k="nav.what_you_get" fallback="What you get" /></Link>
          <Link href="/expungement-ai#pricing"><LocalizedText k="nav.pricing" fallback="Price" /></Link>
          <Link href="/expungement-ai#privacy"><LocalizedText k="nav.trust_privacy" fallback="Trust & privacy" /></Link>
          <Link href="/expungement-ai#faq"><LocalizedText k="nav.questions" fallback="Questions" /></Link>
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitch />
          <AuthControl isAuthenticated={isAuthenticated} />
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white/80 hover:bg-white/10 md:hidden" href="/expungement-ai/support" aria-label="Support">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#FF3B00] px-4 text-sm font-bold text-white" href="/expungement-ai/start">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            <LocalizedText k="nav.start_free" fallback="Check my options" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

/**
 * EN / ES, on every inner consumer surface.
 *
 * The landing header has carried this control for some time; nothing else did.
 * A participant who arrives straight at a screening, sign-in or Briefcase link
 * — a state link, a partner link, a saved-progress resume link, a search result
 * — never passes the landing page, so for them the product was English only
 * even though every prompt, option, helper and error already has Spanish. It is
 * placed here rather than on each surface because this header is what those
 * surfaces share, and a per-surface copy would go missing on the next one
 * added.
 *
 * It writes through the same locale store the landing control writes to, so the
 * choice follows the participant across the whole journey and survives a
 * reload. It is deliberately not a marketing-only affordance: it stays on the
 * app bar, where the task is.
 */
function LocaleSwitch({ light = false }: { light?: boolean }) {
  const { locale, setLocale, t: translate } = useLocalization();
  const buttonClass = light
    ? "min-h-10 rounded-md px-2 text-sm font-semibold text-[#5A6275] hover:bg-[#F1F4F9] aria-pressed:text-[#0B1320]"
    : "min-h-10 rounded-md px-2 text-sm font-semibold text-white/70 hover:bg-white/10 aria-pressed:text-white";
  return (
    <div
      className={`flex items-center ${light ? "text-[#5A6275]" : "text-white/50"}`}
      role="group"
      aria-label={translate("common.language_selector", "Choose language")}
    >
      <button
        type="button"
        data-lang="en"
        className={buttonClass}
        aria-label={translate("common.language_english", "Use English")}
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        EN
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        data-lang="es"
        className={buttonClass}
        aria-label={translate("common.language_spanish", "Usar español")}
        aria-pressed={locale === "es"}
        onClick={() => setLocale("es")}
      >
        ES
      </button>
    </div>
  );
}

function AuthControl({ isAuthenticated, light = false }: { isAuthenticated: boolean; light?: boolean }) {
  if (isAuthenticated) {
    return (
      <div className="hidden items-center gap-1 md:flex">
        <Link className={light ? appButtonClass : marketingButtonClass} href="/briefcase">
          <User className="h-4 w-4" aria-hidden="true" />
          <LocalizedText k="briefcase.account" fallback="Account" />
        </Link>
        <form action="/sign-out" method="post">
          <button className={light ? appButtonClass : marketingButtonClass} type="submit">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <LocalizedText k="common.sign_out" fallback="Sign out" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <Link className={light ? appButtonClass : marketingButtonClass} href="/expungement-ai/sign-in?mode=signin">
      <LogIn className="h-4 w-4" aria-hidden="true" />
      <LocalizedText k="common.sign_in" fallback="Sign in" />
    </Link>
  );
}

const marketingButtonClass = "hidden min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white/80 hover:bg-white/10 md:inline-flex";
const appButtonClass = "inline-flex min-h-10 items-center gap-2 rounded-md border border-[#E4E8EF] px-3 text-sm font-semibold text-[#0B1320] hover:bg-[#F1F4F9]";

function useConsumerAuthState() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useEffect(() => {
    let mounted = true;
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setIsAuthenticated(Boolean(data.session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setIsAuthenticated(Boolean(session));
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  return isAuthenticated;
}
