"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readClaimTokenFromUrl, submitClaim } from "@/lib/expungement-ai/claim/claim-handoff";

/**
 * Completes a claim that arrived here rather than at the sign-in form -- an
 * email verification opened on a second device or a bookmarked handoff link
 * followed while already signed in. OAuth and magic-link initiation are not
 * exposed by the current consumer sign-in surface.
 *
 * Contract §15: landing on an empty Briefcase is a release-blocking failure, so
 * a token that reaches this page is claimed and the participant is moved to the
 * exact matter. Browser-stashed result payloads are never replayed: the server
 * re-evaluates the stored answers before any matter exists.
 */
export function BriefcaseSaveIntent() {
  const router = useRouter();

  useEffect(() => {
    const claimToken = readClaimTokenFromUrl();
    if (!claimToken) return;
    let cancelled = false;
    (async () => {
      const claimed = await submitClaim(claimToken);
      if (!cancelled && claimed.ok) router.replace(claimed.redirectTo);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
