"use client";

/**
 * The profile-driven screening flow. It renders the jurisdiction profile and collects answers;
 * it NEVER evaluates eligibility, selects a pathway, or decides packet/payment.
 *
 * On this branch the profile comes from the mock adapter (`loadJurisdictionProfile`). Production
 * swaps that to GET /api/expungement-ai/profiles/{state} inside the adapter only.
 *
 * At the end of the questions the flow calls the `evaluateScreening` adapter (mock on this branch)
 * and renders whatever result the engine returns. It never computes the outcome, and the
 * packet/payment action is clamped to the engine's `paymentAllowed` (see ScreeningResult).
 *
 * Note (mock-only cost): importing the adapter client-side bundles the mock `all51.json` into
 * this route's client chunk. When the live `/profiles` endpoint is wired, the static JSON import
 * in `profile-loader.ts` is dropped and the data leaves the bundle.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type {
  AnswerValue,
  JurisdictionProfile,
  ScreeningEvaluation
} from "@/lib/expungement-ai/frontend/contracts";
import {
  listAvailableStateKeys,
  loadJurisdictionProfile,
  normalizeStateKey
} from "@/lib/expungement-ai/frontend/profile-loader";
import { evaluateScreening } from "@/lib/expungement-ai/frontend/evaluate";
import type { WilmaPageContext } from "@/lib/expungement-ai/wilma";
import { WilmaBubble } from "@/components/expungement-ai/WilmaBubble";
import { blocksContinue, toScreeningAnswers } from "@/components/expungement-ai/screening/answers";
import { deriveScreens } from "@/components/expungement-ai/screening/screens";
import { ProgressRail } from "@/components/expungement-ai/screening/ProgressRail";
import { QuestionField } from "@/components/expungement-ai/screening/QuestionField";
import { resolvePartnerSessionId } from "@/components/expungement-ai/screening/partner-session";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import {
  EvaluatingState,
  EvaluationErrorState,
  ScreeningResult
} from "@/components/expungement-ai/screening/ScreeningResult";

const PICKER_PATH = "/expungement-ai/screening";
const PACKET_PATH = "/expungement-ai/packet-ready";
const PROFILE_LOAD_GUARD_MS = 12_000;
// Where the packet action sends a partner/session-mode user. The direct-to-consumer
// pay-and-generate flow (PACKET_PATH) does not apply when screening began through a partner.
const BRIEFCASE_PATH = "/briefcase";

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "malformed"; detail: string }
  | { status: "ready"; profile: JurisdictionProfile };

type Phase = "questions" | "evaluating" | "result" | "error";
type EvalError = { kind: "api_error" | "malformed_response"; message: string };

function createMatterId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `matter-${crypto.randomUUID()}`;
  }
  return `matter-${Date.now().toString(36)}`;
}

function packetTypeForPlan(mode: string | undefined): "official_pdf_overlay" | "custom_pleading" | "guidance_packet" | undefined {
  if (mode === "automatic_relief_verification_and_guidance") return "guidance_packet";
  if (mode === "official_form_overlay_or_source_form_set") return "official_pdf_overlay";
  if (mode === "state_specific_custom_packet_from_source_rules") return "custom_pleading";
  return undefined;
}

async function markScreeningSessionCompleted(sessionId: string | undefined) {
  if (!sessionId) return;
  try {
    await fetch("/api/expungement-ai/screening/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });
  } catch {
    // Completion marking is best-effort; the screening result must not fail because telemetry failed.
  }
}

export function ScreeningFlow({ state, initialSessionId }: { state: string; initialSessionId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t: translate } = useLocalization();
  // Partner/session mode follows the session the user *arrived* with: the server-provided prop, or —
  // when the server render did not carry it (e.g. a statically optimized response) — a valid
  // ?session= UUID read from the URL on the client. It is intentionally NOT derived from the live
  // `sessionId` state, so a DTC user who later saves progress (which mints a sessionId) keeps the
  // $50 consumer flow.
  const effectiveInitialSessionId = resolvePartnerSessionId(initialSessionId, searchParams.get("session"));
  const isPartnerSession = Boolean(effectiveInitialSessionId);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [loadNonce, setLoadNonce] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("questions");
  const [evaluation, setEvaluation] = useState<ScreeningEvaluation | null>(null);
  const [evalError, setEvalError] = useState<EvalError | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(effectiveInitialSessionId);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveEmail, setSaveEmail] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "sent" | "error">("idle");
  const focusRef = useRef<HTMLDivElement>(null);
  const matterIdRef = useRef<string>(createMatterId());

  useEffect(() => {
    let active = true;
    let timedOut = false;
    Promise.resolve().then(() => {
      if (active) setLoad({ status: "loading" });
    });
    const guardId = window.setTimeout(() => {
      if (!active) return;
      timedOut = true;
      const known = listAvailableStateKeys().includes(normalizeStateKey(state));
      setLoad(known
        ? { status: "malformed", detail: "Profile request timed out before the screening questions loaded." }
        : { status: "missing" });
    }, PROFILE_LOAD_GUARD_MS);

    loadJurisdictionProfile(state).then((result) => {
      window.clearTimeout(guardId);
      if (!active || timedOut) return;
      if (result.ok) {
        setLoad({ status: "ready", profile: result.data });
        return;
      }
      const known = listAvailableStateKeys().includes(normalizeStateKey(state));
      setLoad(known ? { status: "malformed", detail: result.error } : { status: "missing" });
    }).catch(() => {
      window.clearTimeout(guardId);
      if (!active || timedOut) return;
      const known = listAvailableStateKeys().includes(normalizeStateKey(state));
      setLoad(known
        ? { status: "malformed", detail: "Profile request failed before the screening questions loaded." }
        : { status: "missing" });
    });
    return () => {
      active = false;
      window.clearTimeout(guardId);
    };
  }, [state, loadNonce]);

  const screens = useMemo(
    () => (load.status === "ready" ? deriveScreens(load.profile) : []),
    [load]
  );

  const questionPromptById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const screen of screens) map[screen.id] = screen.prompt;
    return map;
  }, [screens]);

  useEffect(() => {
    if (load.status !== "ready" || screens.length === 0) return;
    const stored = window.sessionStorage.getItem("expungement-ai:resume-session");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        sessionId?: string;
        jurisdiction?: string;
        answers?: Record<string, AnswerValue>;
        currentQuestionId?: string | null;
      };
      if (parsed.jurisdiction !== load.profile.jurisdiction.code || !parsed.answers) return;
      window.sessionStorage.removeItem("expungement-ai:resume-session");
      queueMicrotask(() => {
        setSessionId(parsed.sessionId);
        setAnswers(parsed.answers ?? {});
        if (parsed.currentQuestionId) {
          const target = screens.findIndex((screen) => screen.id === parsed.currentQuestionId);
          if (target >= 0) setCurrentIndex(target);
        }
      });
    } catch {
      window.sessionStorage.removeItem("expungement-ai:resume-session");
    }
  }, [load, screens]);

  // Move keyboard focus to the active region on each screen/phase change.
  useEffect(() => {
    if (load.status === "ready") {
      focusRef.current?.focus();
    }
  }, [currentIndex, phase, load.status]);

  if (load.status === "loading") return <LoadingState />;
  if (load.status === "missing") return <MissingProfileState state={state} onPick={() => router.push(PICKER_PATH)} />;
  if (load.status === "malformed") return <MalformedProfileState onRetry={() => {
    setLoad({ status: "loading" });
    setLoadNonce((value) => value + 1);
  }} onPick={() => router.push(PICKER_PATH)} />;
  if (screens.length === 0) return <MalformedProfileState onRetry={() => {
    setLoad({ status: "loading" });
    setLoadNonce((value) => value + 1);
  }} onPick={() => router.push(PICKER_PATH)} />;

  const profile = load.profile;
  const stateName = profile.jurisdiction.name;

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setError(null);
  }

  async function runEvaluation() {
    setPhase("evaluating");
    setEvalError(null);
    // The engine evaluates; we only send the collected answers (converted to the wire shape).
    // Answers are converted to the same wire shape for fresh and resumed sessions.
    const result = await evaluateScreening({
      jurisdiction: profile.jurisdiction.code,
      profileVersion: profile.profileVersion,
      matterId: matterIdRef.current,
      answers: toScreeningAnswers(answers)
    });
    if (result.ok) {
      void markScreeningSessionCompleted(sessionId);
      setEvaluation(result.data);
      setPhase("result");
    } else {
      setEvalError({ kind: result.kind, message: result.error });
      setPhase("error");
    }
  }

  // Partner result CTA: save the completed result as a real Briefcase matter, then open Briefcase.
  // DTC (no partner session) keeps the existing pay-and-generate route, unchanged.
  async function handlePacketAction() {
    if (!isPartnerSession || !evaluation) {
      router.push(PACKET_PATH);
      return;
    }
    // Only the result is sent. Raw answers are never included in this payload.
    const payload = {
      jurisdiction: stateName,
      resultCode: evaluation.resultCode,
      pathwayLabel: `${stateName} record-clearing`,
      packetType: packetTypeForPlan(evaluation.packetPlan?.mode),
      paymentAllowed: evaluation.paymentAllowed,
      summary: `${stateName} record-clearing result saved from your screening.`,
      nextSteps: evaluation.nextSteps,
      sourceSessionId: effectiveInitialSessionId
    };
    try {
      const response = await fetch("/api/expungement-ai/screening/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.status === 401) {
        // Preserve the intent to save, then send the user to sign in and come back to Briefcase.
        window.sessionStorage.setItem("expungement-ai:pending-briefcase-save", JSON.stringify(payload));
        router.push("/expungement-ai/sign-in?next=/briefcase");
        return;
      }
    } catch {
      // Best effort: still take the user to their Briefcase.
    }
    router.push(BRIEFCASE_PATH);
  }

  function handleContinue() {
    const question = screens[currentIndex];
    if (blocksContinue(question, answers[question.id])) {
      setError(translate("screening.answer_required", "Please answer this question to continue."));
      focusRef.current?.focus();
      return;
    }
    setError(null);
    if (currentIndex < screens.length - 1) {
      setCurrentIndex((index) => index + 1);
    } else {
      void runEvaluation();
    }
  }

  function handleBack() {
    setError(null);
    if (currentIndex > 0) {
      setCurrentIndex((index) => index - 1);
      return;
    }
    router.push(PICKER_PATH);
  }

  function goToQuestions(focusQuestionId?: string) {
    setEvalError(null);
    setEvaluation(null);
    if (focusQuestionId) {
      const targetIndex = screens.findIndex((screen) => screen.id === focusQuestionId);
      if (targetIndex >= 0) setCurrentIndex(targetIndex);
    }
    setPhase("questions");
  }

  async function handleSaveProgress() {
    if (saveStatus === "saving") return;
    const activeQuestion = screens[currentIndex];
    setSaveStatus("saving");
    try {
      const response = await fetch("/api/expungement-ai/screening/save-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          jurisdiction: profile.jurisdiction.code,
          answers,
          currentQuestionId: activeQuestion.id,
          furthestStage: activeQuestion.stage,
          lastDropQuestion: activeQuestion.id,
          email: saveEmail
        })
      });
      const result = await response.json() as { ok?: boolean; sessionId?: string };
      if (!response.ok || !result.ok) {
        setSaveStatus("error");
        return;
      }
      if (result.sessionId) setSessionId(result.sessionId);
      setSaveStatus("sent");
    } catch {
      setSaveStatus("error");
    }
  }

  if (phase === "evaluating") {
    return (
      <FlowFrame state={state}>
        <ProgressRail current={screens.length} total={screens.length} />
        <div ref={focusRef} tabIndex={-1} className="outline-none">
          <EvaluatingState />
        </div>
      </FlowFrame>
    );
  }

  if (phase === "error" && evalError) {
    return (
      <FlowFrame state={state}>
        <ProgressRail current={screens.length} total={screens.length} />
        <div ref={focusRef} tabIndex={-1} className="outline-none">
          <EvaluationErrorState
            kind={evalError.kind}
            onRetry={() => void runEvaluation()}
            onEditAnswers={() => goToQuestions()}
          />
        </div>
      </FlowFrame>
    );
  }

  if (phase === "result" && evaluation) {
    return (
      <FlowFrame wilmaContext="results" state={state}>
        <ProgressRail current={screens.length} total={screens.length} />
        <div ref={focusRef} tabIndex={-1} className="outline-none">
          <ScreeningResult
            evaluation={evaluation}
            stateName={stateName}
            questionPromptById={questionPromptById}
            onEditAnswers={goToQuestions}
            onPacketAction={() => void handlePacketAction()}
            hasScreeningSession={isPartnerSession}
          />
        </div>
      </FlowFrame>
    );
  }

  const question = screens[currentIndex];

  return (
    <FlowFrame currentQuestion={question.prompt} state={state}>
      <ProgressRail current={currentIndex + 1} total={screens.length} />
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#00A99D]">{translate("screening.state_screening", "{state} screening", { state: stateName })}</p>
        <p className="text-xs font-semibold text-[#8A93A6]">{translate("common.free", "Free")}</p>
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
            stateCode={profile.jurisdiction.code}
            value={answers[question.id]}
            onChange={(value) => setAnswer(question.id, value)}
            error={error}
          />
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleContinue}
            className="min-h-[48px] flex-1 rounded-[14px] bg-[#FF3B00] px-6 py-3 text-base font-extrabold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1320] focus-visible:ring-offset-2"
          >
            {translate("common.continue", "Continue")} &rarr;
          </button>
          <button
            type="button"
            onClick={() => {
              setSaveOpen(true);
              setSaveStatus("idle");
            }}
            className="min-h-[48px] rounded-[14px] border border-[#D7DEE8] bg-[#FBFCFE] px-6 py-3 text-base font-bold text-[#0B1320] hover:border-[#CBD5E1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D] focus-visible:ring-offset-2"
          >
            {translate("screening.save_progress", "Save progress")}
          </button>
          <button
            type="button"
            onClick={handleBack}
            className="min-h-[48px] rounded-[14px] border border-[#E4E8EF] bg-white px-6 py-3 text-base font-bold text-[#0B1320] hover:border-[#CBD5E1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D] focus-visible:ring-offset-2"
          >
            {translate("common.back", "Back")}
          </button>
        </div>
      </div>
      {saveOpen ? (
        <SaveProgressDialog
          email={saveEmail}
          status={saveStatus}
          onEmailChange={setSaveEmail}
          onClose={() => setSaveOpen(false)}
          onSave={() => void handleSaveProgress()}
        />
      ) : null}
      <p className="mt-4 text-center text-[12.5px] leading-6 text-[#8A93A6]">
        {translate("screening.legal_info", "This is legal information, not legal advice. Expungement.ai prepares self-help materials based on your answers; the court or agency makes the final decision.")}
      </p>
    </FlowFrame>
  );
}

function SaveProgressDialog({
  email,
  status,
  onEmailChange,
  onClose,
  onSave
}: {
  email: string;
  status: "idle" | "saving" | "sent" | "error";
  onEmailChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t: translate } = useLocalization();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0B1320]/50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#ECEFF4] bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="save-progress-title">
        <h2 id="save-progress-title" className="text-xl font-extrabold text-[#0B1320]">{translate("screening.save_progress", "Save your progress")}</h2>
        <p className="mt-2 text-sm leading-6 text-[#5A6275]">
          {translate("screening.save_progress_email", "We'll only use this email to send you a link back to your saved progress.")}
        </p>
        {status === "sent" ? (
          <p className="mt-4 rounded-xl bg-[#E7F7F4] p-4 text-sm font-semibold text-[#0B1320]">
            {translate("screening.save_progress_sent", "If the email is valid, a saved-progress link has been sent.")}
          </p>
        ) : (
          <label className="mt-4 grid gap-2 text-sm font-bold text-[#0B1320]">
            {translate("screening.email", "Email")}
            <input
              className="min-h-[48px] rounded-xl border-[1.5px] border-[#E4E8EF] px-4 text-[15.5px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              autoComplete="email"
            />
          </label>
        )}
        {status === "error" ? (
          <p className="mt-3 text-sm font-semibold text-[#C2410C]">{translate("screening.save_progress_error", "We couldn't save that progress right now.")}</p>
        ) : null}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row-reverse">
          {status === "sent" ? (
            <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl bg-[#FF3B00] px-5 py-2 text-sm font-extrabold text-white">
              {translate("common.continue", "Continue")}
            </button>
          ) : (
            <button type="button" onClick={onSave} disabled={status === "saving"} className="min-h-[44px] rounded-xl bg-[#FF3B00] px-5 py-2 text-sm font-extrabold text-white disabled:opacity-60">
              {status === "saving" ? translate("screening.sending", "Sending...") : translate("screening.send_link", "Send link")}
            </button>
          )}
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-[#E4E8EF] px-5 py-2 text-sm font-bold text-[#0B1320]">
            {translate("screening.continue_without_saving", "Continue without saving")}
          </button>
        </div>
      </div>
    </div>
  );
}

function FlowFrame({
  children,
  currentQuestion,
  wilmaContext = "check",
  state
}: {
  children: React.ReactNode;
  currentQuestion?: string;
  wilmaContext?: WilmaPageContext;
  // The screening jurisdiction, threaded to Wilma so the check/result surfaces send a
  // case-aware payload (verified state content injection). Undefined on pre-case states.
  state?: string;
}) {
  // A single, phase-aware Wilma surface for the flow. The result phase uses the "results" opener
  // ("Want me to explain this result?"); every other phase uses the question opener. Render-only.
  return (
    <>
      <section className="mx-auto max-w-2xl px-4 pb-16 pt-28 font-sans md:px-8">{children}</section>
      <WilmaBubble context={wilmaContext} currentQuestion={currentQuestion} state={state} />
    </>
  );
}

function LoadingState() {
  const { t: translate } = useLocalization();
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
        <p className="mt-6 text-sm text-[#5A6275]">{translate("screening.loading", "Loading your state's questions...")}</p>
      </div>
    </FlowFrame>
  );
}

function MissingProfileState({ state, onPick }: { state: string; onPick: () => void }) {
  const { t: translate } = useLocalization();
  return (
    <FlowFrame>
      <div className="rounded-[24px] border border-[#ECEFF4] bg-white p-8 shadow-sm">
        <h1 className="text-[24px] font-extrabold text-[#0B1320]">{translate("screening.missing_state_title", "We could not find that state.")}</h1>
        <p className="mt-3 text-sm leading-6 text-[#5A6275]">
          {translate("screening.missing_state_body", "\"{state}\" does not match a supported state or district. Pick from the state list to start again.", { state })}
        </p>
        <button
          type="button"
          onClick={onPick}
          className="mt-6 min-h-[48px] rounded-[14px] bg-[#FF3B00] px-6 py-3 text-base font-extrabold text-white"
        >
          {translate("screening.choose_state", "Choose your state")}
        </button>
      </div>
    </FlowFrame>
  );
}

function MalformedProfileState({ onRetry, onPick }: { onRetry: () => void; onPick: () => void }) {
  const { t: translate } = useLocalization();
  return (
    <FlowFrame>
      <div className="rounded-[24px] border border-[#ECEFF4] bg-white p-8 shadow-sm">
        <h1 className="text-[24px] font-extrabold text-[#0B1320]">{translate("screening.malformed_title", "Something went wrong loading these questions.")}</h1>
        <p className="mt-3 text-sm leading-6 text-[#5A6275]">
          {translate("screening.malformed_body", "We could not load this state's screening questions correctly, so we stopped rather than show you something unreliable. Please try again in a moment.")}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[48px] rounded-[14px] bg-[#FF3B00] px-6 py-3 text-base font-extrabold text-white"
          >
            {translate("common.try_again", "Try again")}
          </button>
          <button
            type="button"
            onClick={onPick}
            className="min-h-[48px] rounded-[14px] border border-[#E4E8EF] bg-white px-6 py-3 text-base font-bold text-[#0B1320]"
          >
            {translate("screening.back_to_states", "Back to states")}
          </button>
        </div>
      </div>
    </FlowFrame>
  );
}
