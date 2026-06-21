"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const genericMessage = "We couldn't resume that session. Please check the link and email address, or request a new link.";

type ConfirmResponse = {
  ok: boolean;
  message: string;
  session: null | {
    sessionId: string;
    jurisdiction: string;
    answers: Record<string, unknown>;
    currentQuestionId: string | null;
    furthestStage: string | null;
    status: string;
    lastDropQuestion: string | null;
  };
  resumeUrl: string | null;
};

export function ResumeScreeningClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "failed" | "resending">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function confirmResume() {
    setStatus("checking");
    setMessage(null);
    try {
      const response = await fetch("/api/expungement-ai/screening/resume/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email })
      });
      const result = await response.json() as ConfirmResponse;
      if (!response.ok || !result.ok || !result.session) {
        setStatus("failed");
        setMessage(genericMessage);
        return;
      }
      if (result.resumeUrl) window.history.replaceState(null, "", result.resumeUrl);
      window.sessionStorage.setItem("expungement-ai:resume-session", JSON.stringify(result.session));
      router.push(`/expungement-ai/screening/${encodeURIComponent(result.session.jurisdiction)}`);
    } catch {
      setStatus("failed");
      setMessage(genericMessage);
    }
  }

  async function requestNewLink() {
    setStatus("resending");
    setMessage(null);
    try {
      const response = await fetch("/api/expungement-ai/screening/resume/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email })
      });
      const result = await response.json() as { message?: string };
      setStatus("failed");
      setMessage(result.message ?? "If that saved session can be resumed, a new link has been sent.");
    } catch {
      setStatus("failed");
      setMessage("If that saved session can be resumed, a new link has been sent.");
    }
  }

  return (
    <section className="mx-auto flex min-h-screen max-w-xl items-center px-4 pb-16 pt-28 font-sans md:px-8">
      <div className="w-full rounded-[24px] border border-[#ECEFF4] bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#00A99D]">Saved progress</p>
        <h1 className="mt-3 text-[28px] font-extrabold leading-tight text-[#0B1320]">Confirm your email to continue.</h1>
        <p className="mt-3 text-sm leading-6 text-[#5A6275]">
          Enter the email used when this progress was saved.
        </p>
        <label className="mt-6 grid gap-2 text-sm font-bold text-[#0B1320]">
          Email
          <input
            className="min-h-[48px] rounded-xl border-[1.5px] border-[#E4E8EF] px-4 text-[15.5px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>
        {message ? (
          <p className="mt-4 rounded-xl bg-[#FBFCFE] p-4 text-sm font-semibold leading-6 text-[#5A6275]">{message}</p>
        ) : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void confirmResume()}
            disabled={status === "checking" || status === "resending"}
            className="min-h-[48px] rounded-[14px] bg-[#FF3B00] px-6 py-3 text-base font-extrabold text-white disabled:opacity-60"
          >
            {status === "checking" ? "Checking..." : "Resume"}
          </button>
          <button
            type="button"
            onClick={() => void requestNewLink()}
            disabled={status === "checking" || status === "resending"}
            className="min-h-[48px] rounded-[14px] border border-[#E4E8EF] bg-white px-6 py-3 text-base font-bold text-[#0B1320] disabled:opacity-60"
          >
            {status === "resending" ? "Sending..." : "Request new link"}
          </button>
        </div>
      </div>
    </section>
  );
}
