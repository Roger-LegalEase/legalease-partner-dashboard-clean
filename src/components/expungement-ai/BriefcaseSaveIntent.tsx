"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const PENDING_KEY = "expungement-ai:pending-briefcase-save";

/**
 * Completes a "Save this result to Briefcase" that was interrupted by a sign-in. When the screening
 * result CTA hits a signed-out 401, the flow stashes the result payload and routes to sign-in. After
 * login the user lands on /briefcase; this runs the saved POST once, clears it, and refreshes so the
 * new matter appears. Renders nothing.
 */
export function BriefcaseSaveIntent() {
  const router = useRouter();

  useEffect(() => {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    const pendingId = new URLSearchParams(window.location.search).get("pending");
    if (!raw && !pendingId) return;
    window.sessionStorage.removeItem(PENDING_KEY);
    let cancelled = false;
    (async () => {
      try {
        const response = pendingId
          ? await fetch("/api/expungement-ai/screening/pending/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pendingId, next: "/briefcase" })
          })
          : await fetch("/api/expungement-ai/screening/save-result", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: raw
          });
        if (!cancelled && response.ok) router.refresh();
      } catch {
        // Best effort. The result is still viewable from the screening flow if this fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
