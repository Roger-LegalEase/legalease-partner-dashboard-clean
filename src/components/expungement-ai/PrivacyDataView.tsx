"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, ShieldAlert, Trash2 } from "lucide-react";

import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";
import { RETENTION_EXPLANATION } from "@/lib/expungement-ai/privacy/contract";

/**
 * Privacy and data — the three controls, kept visibly separate.
 *
 * Downloading a copy, deleting one matter, and deleting the account are three
 * different decisions with three different consequences, so they are three
 * panels rather than a row of buttons: nobody should be able to reach the
 * irreversible one by mis-clicking the reversible one. The two destructive
 * panels ask for the password at the moment of the action, not at page load,
 * because a proof minted when the page opened would still be sitting there when
 * the participant walks away.
 */

export type PrivacyRequestSummary = {
  requestId: string;
  type: string;
  status: string;
  requestedAt: string;
  completedAt: string | null;
  receiptCode: string | null;
  heldForLegalReason: string | null;
};

const ACCOUNT_CONFIRMATION = "DELETE MY ACCOUNT";

function newIdempotencyKey(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}-${random}`.slice(0, 200);
}

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body)
  });
  return response;
}

async function requestProof(purpose: "matter_deletion" | "account_deletion", password: string) {
  const response = await postJson("/api/expungement-ai/privacy/reauth", { purpose, password });
  const payload = (await response.json().catch(() => ({}))) as { proof?: string; error?: string };
  if (!response.ok || !payload.proof) {
    return { ok: false as const, error: payload.error ?? "We could not confirm your password." };
  }
  return { ok: true as const, proof: payload.proof };
}

export function PrivacyDataView({
  accountDeletionReady,
  items = [],
  requests = []
}: {
  accountDeletionReady: boolean;
  items?: ConsumerBriefcaseItem[];
  requests?: PrivacyRequestSummary[];
}) {
  // The history is rendered from server-loaded props rather than fetched on
  // mount: a receipt list that appears a beat after the page does reads as a
  // glitch on the one screen where a participant most needs to trust what they
  // are looking at. A completed action refreshes the server component instead.
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      <section className="rounded-[14px] border border-[#ECEFF4] bg-white p-6">
        <h1 className="text-[22px] font-extrabold text-[#0B1320]">Privacy and data</h1>
        <p className="mt-3 text-[14px] leading-6 text-[#5A6275]">
          Your information belongs to you. You can take a copy of it, remove one matter, or close your account
          permanently. Downloading a copy never deletes anything.
        </p>
      </section>

      <ExportPanel />
      <MatterDeletionPanel items={items} onDone={refresh} />
      <AccountDeletionPanel onDone={refresh} ready={accountDeletionReady} />
      <RetentionPanel />
      <HistoryPanel requests={requests} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ExportPanel() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function download() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await postJson("/api/expungement-ai/privacy/export", {
        idempotencyKey: newIdempotencyKey("export")
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "We could not prepare your copy. Try again in a few minutes.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `expungement-ai-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("Your copy has been downloaded. Nothing was deleted.");
    } catch {
      setError("We could not prepare your copy. Try again in a few minutes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-privacy-control="export" className="rounded-[14px] border border-[#ECEFF4] bg-white p-6">
      <h2 className="text-[17px] font-bold text-[#0B1320]">Download a copy of my data</h2>
      <p className="mt-2 text-[14px] leading-6 text-[#5A6275]">
        A single file with your profile, your saved checks and answers, your matters, your packet history, who
        sponsored your matters if anyone did, and every privacy request you have made. It does not include our
        internal security records or anything belonging to another person or organization.
      </p>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#0B1320] px-5 text-sm font-bold text-white disabled:opacity-60"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {busy ? "Preparing your copy…" : "Download a copy of my data"}
      </button>
      {message ? <p className="mt-3 text-[13px] font-semibold text-[#1F9D6B]">{message}</p> : null}
      {error ? <p className="mt-3 text-[13px] font-semibold text-[#B23036]">{error}</p> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function MatterDeletionPanel({ items, onDone }: { items: ConsumerBriefcaseItem[]; onDone: () => void }) {
  const [matterId, setMatterId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function deleteMatter() {
    if (!matterId) {
      setError("Choose which matter to delete.");
      return;
    }
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const proof = await requestProof("matter_deletion", password);
      if (!proof.ok) {
        setError(proof.error);
        return;
      }
      const response = await postJson("/api/expungement-ai/privacy/matter", {
        matterId,
        proof: proof.proof,
        idempotencyKey: newIdempotencyKey(`matter-${matterId}`)
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; receiptCode?: string };
      if (!response.ok) {
        setError(payload.error ?? "We could not delete this matter.");
        return;
      }
      setMessage(`This matter has been deleted. Your receipt is ${payload.receiptCode ?? "recorded in your history"}.`);
      setPassword("");
      setMatterId("");
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-privacy-control="matter-deletion" className="rounded-[14px] border border-[#ECEFF4] bg-white p-6">
      <h2 className="text-[17px] font-bold text-[#0B1320]">Delete one matter</h2>
      <p className="mt-2 text-[14px] leading-6 text-[#5A6275]">
        Removes one matter, its answers and any packet made for it. Your account and your other matters stay as they
        are. This cannot be undone, so download a copy first if you may want it.
      </p>

      {items.length === 0 ? (
        <p className="mt-4 text-[13px] text-[#8A93A6]">You have no saved matters to delete.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-[13px] font-bold text-[#0B1320]" htmlFor="privacy-matter">
            Which matter?
          </label>
          <select
            id="privacy-matter"
            value={matterId}
            onChange={(event) => setMatterId(event.target.value)}
            className="min-h-11 w-full rounded-[10px] border border-[#D9DEE8] px-3 text-sm text-[#0B1320]"
          >
            <option value="">Choose a matter</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} — {item.state}
              </option>
            ))}
          </select>

          <label className="block text-[13px] font-bold text-[#0B1320]" htmlFor="privacy-matter-password">
            Confirm your password
          </label>
          <input
            id="privacy-matter-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-11 w-full rounded-[10px] border border-[#D9DEE8] px-3 text-sm text-[#0B1320]"
          />

          <button
            type="button"
            onClick={deleteMatter}
            disabled={busy || !matterId || !password}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[#E5484D] px-5 text-sm font-bold text-[#B23036] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {busy ? "Deleting…" : "Delete this matter"}
          </button>
        </div>
      )}
      {message ? <p className="mt-3 text-[13px] font-semibold text-[#1F9D6B]">{message}</p> : null}
      {error ? <p className="mt-3 text-[13px] font-semibold text-[#B23036]">{error}</p> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function AccountDeletionPanel({ onDone, ready }: { onDone: () => void; ready: boolean }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function deleteAccount() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const proof = await requestProof("account_deletion", password);
      if (!proof.ok) {
        setError(proof.error);
        return;
      }
      const response = await postJson("/api/expungement-ai/privacy/account", {
        proof: proof.proof,
        confirmation,
        idempotencyKey: newIdempotencyKey("account")
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; receiptCode?: string };
      if (!response.ok) {
        setError(payload.error ?? "We could not delete your account.");
        return;
      }
      setMessage(
        `Your account and personal data have been deleted. Your receipt is ${payload.receiptCode ?? "recorded"}. You are now signed out.`
      );
      setPassword("");
      setConfirmation("");
      onDone();
      // The account no longer exists; staying on an authenticated page would
      // only produce a confusing redirect on the next click.
      window.setTimeout(() => window.location.assign("/expungement-ai?accountDeleted=1"), 4000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      data-privacy-control="account-deletion"
      className="rounded-[14px] border border-[#F3C8C9] bg-[#FEF7F7] p-6"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B23036]" aria-hidden="true" />
        <div>
          <h2 className="text-[17px] font-bold text-[#0B1320]">Delete my account and personal data</h2>
          <p className="mt-2 text-[14px] leading-6 text-[#5A6275]">
            This is permanent. Everything you saved is deleted, your files and packets are removed, reminders stop,
            any help a partner or clinic was giving you ends, and you will not be able to sign in again. Records of
            payments and security events are kept without your name attached, because accounting has to balance —
            the section below explains exactly what that means.
          </p>
        </div>
      </div>

      {!ready ? (
        <p
          className="mt-4 rounded-[10px] border border-[#F3C8C9] bg-white px-4 py-3 text-sm font-semibold text-[#B23036]"
          role="status"
        >
          Account deletion is temporarily unavailable. You can still download your data or delete one matter.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-[13px] font-bold text-[#0B1320]" htmlFor="privacy-account-password">
            Confirm your password
          </label>
          <input
            id="privacy-account-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-11 w-full rounded-[10px] border border-[#D9DEE8] bg-white px-3 text-sm text-[#0B1320]"
          />

          <label className="block text-[13px] font-bold text-[#0B1320]" htmlFor="privacy-account-confirm">
            Type {ACCOUNT_CONFIRMATION} to confirm
          </label>
          <input
            id="privacy-account-confirm"
            type="text"
            autoComplete="off"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className="min-h-11 w-full rounded-[10px] border border-[#D9DEE8] bg-white px-3 text-sm text-[#0B1320]"
          />

          <button
            type="button"
            onClick={deleteAccount}
            disabled={busy || !password || confirmation.trim() !== ACCOUNT_CONFIRMATION}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#B23036] px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {busy ? "Deleting your account…" : "Delete my account and personal data"}
          </button>
        </div>
      )}
      {message ? <p className="mt-3 text-[13px] font-semibold text-[#1F9D6B]">{message}</p> : null}
      {error ? <p className="mt-3 text-[13px] font-semibold text-[#B23036]">{error}</p> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function RetentionPanel() {
  return (
    <section className="rounded-[14px] border border-[#ECEFF4] bg-white p-6">
      <h2 className="text-[17px] font-bold text-[#0B1320]">What we keep, and why</h2>
      <dl className="mt-3 space-y-3">
        {RETENTION_EXPLANATION.map((entry) => (
          <div key={entry.recordClass}>
            <dt className="text-[13px] font-bold text-[#0B1320]">{entry.recordClass}</dt>
            <dd className="text-[13px] leading-6 text-[#5A6275]">{entry.explanation}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function HistoryPanel({ requests }: { requests: PrivacyRequestSummary[] }) {
  if (requests.length === 0) return null;
  return (
    <section className="rounded-[14px] border border-[#ECEFF4] bg-white p-6">
      <h2 className="text-[17px] font-bold text-[#0B1320]">Your privacy requests</h2>
      <ul className="mt-3 space-y-2 text-[13px] leading-6 text-[#5A6275]">
        {requests.map((request) => (
          <li key={request.requestId}>
            <b className="text-[#0B1320]">{humanRequestType(request.type)}</b> — {humanStatus(request.status)} on{" "}
            {new Date(request.completedAt ?? request.requestedAt).toLocaleDateString()}
            {request.receiptCode ? <> · receipt {request.receiptCode}</> : null}
            {request.heldForLegalReason ? <> · {request.heldForLegalReason}</> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function humanRequestType(type: string) {
  if (type === "export") return "Copy of your data";
  if (type === "matter_deletion") return "Matter deleted";
  if (type === "account_deletion") return "Account deleted";
  return type;
}

function humanStatus(status: string) {
  if (status === "completed") return "completed";
  if (status === "blocked_legal_hold") return "on hold";
  if (status === "failed") return "did not finish";
  if (status === "in_progress") return "in progress";
  return status;
}
