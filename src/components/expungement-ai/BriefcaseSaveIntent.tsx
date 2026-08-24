"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Completes a server-verified pending-result claim after sign-in. Browser-
 * stashed result payloads are intentionally not replayed: current persistence
 * always re-evaluates stored screening inputs before writing route identity.
 */
export function BriefcaseSaveIntent() {
  const router = useRouter();

  useEffect(() => {
    const pendingId = new URLSearchParams(window.location.search).get("pending");
    if (!pendingId) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/expungement-ai/screening/pending/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pendingId, next: "/briefcase" })
        });
        const payload = await response.json().catch(() => null) as { redirectTo?: string; nextActionPath?: string } | null;
        if (!cancelled && response.ok && payload?.redirectTo) {
          router.replace(payload.nextActionPath ?? payload.redirectTo);
        }
      } catch {
        // Best effort for old pending query links. The primary sign-in handoff
        // keeps failures visible and retryable before navigating here.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
