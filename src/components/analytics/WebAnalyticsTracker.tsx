"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageview } from "@/lib/analytics/client";

// Module-level de-dupe key. Survives React Strict Mode's dev double-mount and hydration so a single
// navigation never produces two pageviews. `usePathname` (not `useSearchParams`) is used so pages are
// not opted into dynamic rendering; the query string is read from window inside the tracker helper.
let lastTrackedKey: string | null = null;

// Mounted once in the root layout, so it rides every rendered React surface —
// expungement.ai, legaleasepartner.com, and the legalease.com React pages. (The legalease.com
// static homepage is a separate file and carries its own inline snippet.)
export function WebAnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Internal admin/operator tooling is not marketing traffic — skip it.
    if (pathname?.startsWith("/internal")) return;

    const key = `${pathname}?${window.location.search}`;
    if (key === lastTrackedKey) return;
    lastTrackedKey = key;

    trackPageview({ path: pathname ?? window.location.pathname });
  }, [pathname]);

  return null;
}
