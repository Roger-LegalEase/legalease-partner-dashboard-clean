"use client";
import { useEffect, useState } from "react";

export function LaunchSimulation({ partnerSlug }: { partnerSlug: string }) {
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const success = "Simulated launch verified. The reviewed package is current and the public page remains unavailable. No activation, payment, or contractual consent was recorded.";
  const endpoint = `/api/internal/partners/onboarding/phase1/${encodeURIComponent(partnerSlug)}/simulation`;
  useEffect(() => {
    let active = true;
    fetch(endpoint, {cache: "no-store"}).then(response => response.ok ? response.json() : null).then(body => {
      if (active && body?.verified) { setVerified(true); setMessage(success); }
    }).catch(() => {});
    return () => { active = false; };
  }, [endpoint, success]);
  async function run(launch: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(endpoint, launch ? { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: crypto.randomUUID(), snapshotHash: snapshot, confirmed }) } : undefined);
      const body = await response.json();
      if (!response.ok) throw new Error((typeof body.error === "string" ? body.error : body.error?.message) ?? "Practice verification could not finish. Please retry.");
      if (launch) { setVerified(true); setMessage(success); }
      else { setVerified(body.verified === true); setSnapshot(body.snapshotHash); setBlockers(body.blockers); setConfirmed(false); setMessage(body.verified ? success : body.blockers.length ? "Review the remaining materials before continuing." : "Practice package ready."); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Practice verification failed."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Isolated launch practice" className="my-6 rounded-xl border border-teal bg-white p-6">
    <h2 className="text-xl font-bold">Practice launch</h2>
    <p className="mt-3">Use a fictional organization and review its actual program materials. Practice does not require a signed contract, payment, or partner launch consent. It never activates or publishes a program.</p>
    <button disabled={busy} onClick={() => run(false)} className="mt-4 min-h-11 rounded border px-4 font-bold">Check practice package</button>
    <ul className="mt-3">{blockers.map(blocker => <li key={blocker}>{blocker} <a className="underline" href="#launch-prep-area-artifacts">Review package</a></li>)}</ul>
    {snapshot && !blockers.length && !verified ? <><label className="mt-4 flex gap-3"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I reviewed this fictional program and understand that this is a simulation.</label><button disabled={busy || !confirmed} onClick={() => run(true)} className="mt-4 min-h-11 rounded bg-navy px-4 font-bold text-white disabled:opacity-50">Simulate launch</button></> : null}
    <p role="status" className="mt-3">{message}</p>
  </section>;
}
