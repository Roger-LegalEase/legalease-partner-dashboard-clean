"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { claimHandoffPath, isTerminalClaimFailure, readClaimTokenFromUrl, submitClaim } from "@/lib/expungement-ai/claim/claim-handoff";

/**
 * Completes a claim that arrived here rather than at the sign-in form -- an
 * email verification opened on a second device, an OAuth callback, or a
 * bookmarked handoff link followed while already signed in.
 *
 * Contract §15: landing on an empty Briefcase is a release-blocking failure, so
 * a token that reaches this page is claimed and the participant is moved to the
 * exact matter. Browser-stashed result payloads are never replayed: the server
 * re-evaluates the stored answers before any matter exists.
 */
export function BriefcaseSaveIntent() {
  const router = useRouter();
  const [retryToken, setRetryToken] = useState("");
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function finishClaim(token: string, isCurrent: () => boolean = () => true) {
    setSaving(true);
    const claim = await submitClaim(token);
    if (!isCurrent()) return;
    setSaving(false);
    if (claim.ok) return router.replace(claim.redirectTo);
    if (claim.status === 401) return router.replace(claimHandoffPath(token, "signin"));
    setRetryToken(isTerminalClaimFailure(claim.status) ? "" : token);
    setFailed(true);
  }

  useEffect(() => {
    const claimToken = readClaimTokenFromUrl();
    if (!claimToken) return;
    let cancelled = false;
    void finishClaim(claimToken, () => !cancelled);
    return () => { cancelled = true; };
  }, [router]);

  if (!failed) return null;
  return <div role="alert" className="rounded-md border p-4">
    <p>{retryToken ? "Your result has not been confirmed saved. Retry saving it to your Briefcase." : "This result link is no longer available. Open a saved matter below or start a new screening."}</p>
    {retryToken ? <button type="button" disabled={saving} onClick={() => void finishClaim(retryToken)} className="min-h-11 underline">{saving ? "Saving…" : "Retry saving my result"}</button> : <a href="/expungement-ai/screening" className="inline-flex min-h-11 items-center underline">Start a new screening</a>}
  </div>;
}
