"use client";

/**
 * The profile-driven screening flow. It renders the jurisdiction profile and collects answers;
 * it NEVER evaluates eligibility, selects a pathway, or decides packet/payment.
 *
 * On this branch the profile comes from the mock adapter (`loadJurisdictionProfile`). Production
 * swaps that to GET /api/expungement-ai/profiles/{state} inside the adapter only.
 *
 * Milestone 2 ends the flow at a calm "ready to review" transition. The evaluate call
 * (`evaluateScreening`) and the result screens are Milestone 3; there is intentionally no
 * outcome, no payment, and no forced-result control here.
 *
 * Note (mock-only cost): importing the adapter client-side bundles the mock `all51.json` into
 * this route's client chunk. When the live `/profiles` endpoint is wired, the static JSON import
 * in `profile-loader.ts` is dropped and the data leaves the bundle.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { AnswerValue, JurisdictionProfile } from "@/lib/expungement-ai/frontend/contracts";
import {
  listAvailableStateKeys,
  loadJurisdictionProfile,
  normalizeStateKey
} from "@/lib/expungement-ai/frontend/profile-loader";
import { blocksContinue } from "@/components/expungement-ai/screening/answers";
import { deriveScreens } from "@/components/expungement-ai/screening/screens";
import { ProgressRail } from "@/components/expungement-ai/screening/ProgressRail";
import { QuestionField } from "@/components/expungement-ai/screening/QuestionField";

const PICKER_PATH = "/expungement-ai/screening";

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "malformed"; detail: string }
  | { status: "ready"; profile: JurisdictionProfile };

type SubPhase = "questions" | "review_complete";

export function ScreeningFlow({ state }: { state: string }) {
  const router = useRouter();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [subPhase, setSubPhase] = useState<SubPhase>("questions");
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The component is remounted per state (keyed by the route), so initial state is already
    // "loading"; the effect only performs the async load and sets the result in its callback.
    let active = true;
    loadJurisdictionProfile(state).then((result) => {
      if (!active) return;
      if (result.ok) {
        setLoad({ status: "ready", profile: result.data });
        return;
      }
      const known = listAvailableStateKeys().includes(normalizeStateKey(state));
      setLoad(known ? { status: "malformed", detail: result.error } : { status: "missing" });
    });
    return () => {
      active = false;
    };
  }, [state]);

  const screens = useMemo(
    () => (load.status === "ready" ? deriveScreens(load.profile) : []),
    [load]
  );

  // Move keyboard focus to the question region on each screen change and when entering review.
  useEffect(() => {
    if (load.status === "ready") {
      focusRef.current?.focus();
    }
  }, [currentIndex, subPhase, load.status]);

  if (load.status === "loading") return <LoadingState />;
  if (load.status === "missing") return <MissingProfileState state={state} onPick={() => router.push(PICKER_PATH)} />;
  if (load.status === "malformed") return <MalformedProfileState onPick={() => router.push(PICKER_PATH)} />;
  if (screens.length === 0) return <MalformedProfileState onPick={() => router.push(PICKER_PATH)} />;

  const profile = load.profile;
  const stateName = profile.jurisdiction.name;

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setError(null);
  }

  function handleContinue() {
    const question = screens[currentIndex];
    if (blocksContinue(question, answers[question.id])) {
      setError("Please answer this question to continue.");
      focusRef.current?.focus();
      return;
    }
    setError(null);
    if (currentIndex < screens.length - 1) {
      setCurrentIndex((index) => index + 1);
    } else {
      setSubPhase("review_complete");
    }
  }

  function handleBack() {
    setError(null);
    if (subPhase === "review_complete") {
      setSubPhase("questions");
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex((index) => index - 1);
      return;
    }
    router.push(PICKER_PATH);
  }

  if (subPhase === "review_complete") {
    return (
      <FlowFrame>
        <ProgressRail current={screens.length} total={screens.length} />
        <div ref={focusRef} tabIndex={-1} className="rounded-[24px] border border-[#ECEFF4] bg-white p-6 shadow-sm outline-none md:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#00A99D]">Almost there</p>
          <h1 className="mt-3 text-[26px] font-extrabold leading-tight text-[#0B1320] md:text-[32px]">
            That&apos;s everything we need to ask about your {stateName} record.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#5A6275]">
            The screening result is the next step. Nothing here is a decision about your eligibility,
            and there is no payment at this stage.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="button"
              disabled
              className="min-h-[48px] flex-1 cursor-not-allowed rounded-[14px] bg-[#E4E8EF] px-6 py-3 text-base font-extrabold text-[#8A93A6]"
              title="The result step is wired in the next milestone."
            >
              See my result (coming next)
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="min-h-[48px] rounded-[14px] border border-[#E4E8EF] bg-white px-6 py-3 text-base font-bold text-[#0B1320] hover:border-[#CBD5E1]"
            >
              Back to edit
            </button>
          </div>
        </div>
      </FlowFrame>
    );
  }

  const question = screens[currentIndex];

  return (
    <FlowFrame>
      <ProgressRail current={currentIndex + 1} total={screens.length} />
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#00A99D]">{stateName} screening</p>
        <p className="text-xs font-semibold text-[#8A93A6]">Free</p>
      </div>
      <div
        ref={focusRef}
        tabIndex={-1}
        className="rounded-[24px] border border-[#ECEFF4] bg-white p-5 shadow-sm outline-none md:p-8"
      >
        <div className="grid gap-4">
          <QuestionField
            key={question.id}
            question={question}
            value={answers[question.id]}
            onChange={(value) => setAnswer(question.id, value)}
            error={error}
          />
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleContinue}
            className="min-h-[48px] flex-1 rounded-[14px] bg-[#FF3B00] px-6 py-3 text-base font-extrabold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)]"
          >
            Continue &rarr;
          </button>
          <button
            type="button"
            onClick={handleBack}
            className="min-h-[48px] rounded-[14px] border border-[#E4E8EF] bg-white px-6 py-3 text-base font-bold text-[#0B1320] hover:border-[#CBD5E1]"
          >
            Back
          </button>
        </div>
      </div>
      <p className="mt-4 text-center text-[12.5px] leading-6 text-[#8A93A6]">
        This is legal information, not legal advice. The engine decides the result; we never do.
      </p>
    </FlowFrame>
  );
}

function FlowFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-2xl px-4 pb-16 pt-28 font-sans md:px-8">{children}</section>
  );
}

function LoadingState() {
  return (
    <FlowFrame>
      <div className="rounded-[24px] border border-[#ECEFF4] bg-white p-8 shadow-sm" aria-busy="true" aria-live="polite">
        <div className="h-2 w-1/3 animate-pulse rounded-full bg-[#E4E8EF] motion-reduce:animate-none" />
        <div className="mt-6 h-6 w-2/3 animate-pulse rounded bg-[#EEF1F6] motion-reduce:animate-none" />
        <div className="mt-4 grid gap-3">
          <div className="h-12 animate-pulse rounded-xl bg-[#F2F4F8] motion-reduce:animate-none" />
          <div className="h-12 animate-pulse rounded-xl bg-[#F2F4F8] motion-reduce:animate-none" />
          <div className="h-12 animate-pulse rounded-xl bg-[#F2F4F8] motion-reduce:animate-none" />
        </div>
        <p className="mt-6 text-sm text-[#5A6275]">Loading your state&apos;s questions…</p>
      </div>
    </FlowFrame>
  );
}

function MissingProfileState({ state, onPick }: { state: string; onPick: () => void }) {
  return (
    <FlowFrame>
      <div className="rounded-[24px] border border-[#ECEFF4] bg-white p-8 shadow-sm">
        <h1 className="text-[24px] font-extrabold text-[#0B1320]">We could not find that state.</h1>
        <p className="mt-3 text-sm leading-6 text-[#5A6275]">
          &ldquo;{state}&rdquo; does not match a state we screen yet. Pick your state to start again.
        </p>
        <button
          type="button"
          onClick={onPick}
          className="mt-6 min-h-[48px] rounded-[14px] bg-[#FF3B00] px-6 py-3 text-base font-extrabold text-white"
        >
          Choose your state
        </button>
      </div>
    </FlowFrame>
  );
}

function MalformedProfileState({ onPick }: { onPick: () => void }) {
  return (
    <FlowFrame>
      <div className="rounded-[24px] border border-[#ECEFF4] bg-white p-8 shadow-sm">
        <h1 className="text-[24px] font-extrabold text-[#0B1320]">Something went wrong loading these questions.</h1>
        <p className="mt-3 text-sm leading-6 text-[#5A6275]">
          We could not load this state&apos;s screening questions correctly, so we stopped rather than
          show you something unreliable. Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={onPick}
          className="mt-6 min-h-[48px] rounded-[14px] border border-[#E4E8EF] bg-white px-6 py-3 text-base font-bold text-[#0B1320]"
        >
          Back to states
        </button>
      </div>
    </FlowFrame>
  );
}
