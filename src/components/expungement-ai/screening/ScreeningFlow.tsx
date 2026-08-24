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
import { useRouter } from "next/navigation";

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

/** UX-GLOBAL-017 — where an in-progress answer set is kept for this session. */
const IN_PROGRESS_STORAGE_KEY = "expungement-ai:in-progress-screening";
import { blocksContinue, toScreeningAnswers } from "@/components/expungement-ai/screening/answers";
import { deriveScreens } from "@/components/expungement-ai/screening/screens";
import { ProgressRail } from "@/components/expungement-ai/screening/ProgressRail";
import { QuestionField } from "@/components/expungement-ai/screening/QuestionField";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { trackFunnelEvent } from "@/lib/analytics/client";
import {
  EvaluatingState,
  EvaluationErrorState,
  ScreeningResult
} from "@/components/expungement-ai/screening/ScreeningResult";

const PICKER_PATH = "/expungement-ai/screening";
const PROFILE_LOAD_GUARD_MS = 12_000;
const SAVE_RESULT_ERROR = "We could not save this matter right now. Please try again.";

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
  const { t: translate } = useLocalization();
  // Only the server-validated active-benefit session prop enables partner
  // presentation. A syntactically valid UUID in the URL is not authority.
  const effectiveInitialSessionId = initialSessionId;
  const isPartnerSession = Boolean(effectiveInitialSessionId);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [loadNonce, setLoadNonce] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("questions");
  const [evaluation, setEvaluation] = useState<ScreeningEvaluation | null>(null);
  const [evalError, setEvalError] = useState<EvalError | null>(null);
  const [packetActionError, setPacketActionError] = useState<string | null>(null);
  // UX-GLOBAL-002 — handlePacketAction runs two sequential POSTs. Without an
  // in-flight state the control was never disabled, never relabelled and never
  // debounced, and a second click started a second pending row.
  const [packetActionPending, setPacketActionPending] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(effectiveInitialSessionId);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveEmail, setSaveEmail] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "sent" | "error">("idle");
  const focusRef = useRef<HTMLDivElement>(null);
  const matterIdRef = useRef<string>(createMatterId());
  const screeningStartTrackedRef = useRef(false);
  const resultViewTrackedRef = useRef(false);

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

  // UX-GLOBAL-017 — persist the in-progress answer set so a refresh, a
  // back-forward navigation or a tab restore does not silently drop every answer
  // and return the participant to question one. The read path already existed;
  // nothing ever wrote it except the emailed resume link.
  //
  // sessionStorage, not localStorage: this is a record-clearing questionnaire,
  // and the answers should not outlive the browser session on a shared machine.
  useEffect(() => {
    if (load.status !== "ready" || screens.length === 0) return;
    if (Object.keys(answers).length === 0) return;
    try {
      window.sessionStorage.setItem(IN_PROGRESS_STORAGE_KEY, JSON.stringify({
        sessionId,
        jurisdiction: load.profile.jurisdiction.code,
        profileVersion: load.profile.profileVersion,
        answers,
        currentQuestionId: screens[currentIndex]?.id ?? null,
        phase
      }));
    } catch {
      // A full or blocked store must never break the questionnaire.
    }
  }, [answers, currentIndex, phase, sessionId, load, screens]);

  // Restore an in-progress set on mount. The emailed resume link still wins:
  // it is handled by the effect below and clears this one.
  useEffect(() => {
    if (load.status !== "ready" || screens.length === 0) return;
    if (Object.keys(answers).length > 0) return;
    let stored: string | null = null;
    try { stored = window.sessionStorage.getItem(IN_PROGRESS_STORAGE_KEY); } catch { stored = null; }
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        sessionId?: string;
        jurisdiction?: string;
        profileVersion?: string;
        answers?: Record<string, AnswerValue>;
        currentQuestionId?: string | null;
        phase?: Phase;
      };
      // A stored set from another state, or from a profile version whose
      // questions have changed, is discarded rather than half-applied.
      if (parsed.jurisdiction !== load.profile.jurisdiction.code) return;
      if (parsed.profileVersion && parsed.profileVersion !== load.profile.profileVersion) {
        window.sessionStorage.removeItem(IN_PROGRESS_STORAGE_KEY);
        return;
      }
      if (!parsed.answers || Object.keys(parsed.answers).length === 0) return;
      queueMicrotask(() => {
        if (parsed.sessionId) setSessionId(parsed.sessionId);
        setAnswers(parsed.answers ?? {});
        if (parsed.currentQuestionId) {
          const target = screens.findIndex((screen) => screen.id === parsed.currentQuestionId);
          if (target >= 0) setCurrentIndex(target);
        }
      });
    } catch {
      try { window.sessionStorage.removeItem(IN_PROGRESS_STORAGE_KEY); } catch { /* ignore */ }
    }
    // Restores once, on the first ready render for this profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load.status, screens.length]);

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

  // Funnel: screening started (fires once when the state's questions are ready). Partner-session
  // screenings emit the partner event so RCAP traffic is never counted as DTC.
  useEffect(() => {
    if (load.status !== "ready" || screeningStartTrackedRef.current) return;
    screeningStartTrackedRef.current = true;
    trackFunnelEvent(isPartnerSession ? "partner_screening_started" : "screening_started", {
      state: load.profile.jurisdiction.code,
      product_surface: isPartnerSession ? "legalease_partner" : "expungement_ai"
    });
  }, [load, isPartnerSession]);

  // Funnel: screening result viewed (fires once when the result phase renders). No answers or record
  // details are ever sent — only the state code and the engine's public result code.
  useEffect(() => {
    if (phase !== "result" || resultViewTrackedRef.current) return;
    resultViewTrackedRef.current = true;
    trackFunnelEvent(isPartnerSession ? "partner_result_viewed" : "screening_result_viewed", {
      state: load.status === "ready" ? load.profile.jurisdiction.code : undefined,
      result_code: evaluation?.resultCode,
      product_surface: isPartnerSession ? "legalease_partner" : "expungement_ai"
    });
  }, [phase, isPartnerSession, evaluation, load]);

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

  // Every completed result is handed to the server as inputs, not as trusted
  // route or payment identity. The pending endpoint re-evaluates those inputs;
  // the authenticated claim does it again and lands on the exact saved matter.
  async function handlePacketAction() {
    if (!evaluation || packetActionPending) return;
    setPacketActionError(null);
    setPacketActionPending(true);
    try {
      await runPacketAction();
    } finally {
      // Left pending on a successful navigation would be a lie the moment the
      // route changes; cleared here so a failure returns a usable control.
      setPacketActionPending(false);
    }
  }

  async function runPacketAction() {
    if (!evaluation) return;

    const pendingResponse = await fetch("/api/expungement-ai/screening/pending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: isPartnerSession ? "rcap_partner" : "expungement_ai_dtc",
        jurisdiction: profile.jurisdiction.code,
        answers: toScreeningAnswers(answers),
        profileVersion: profile.profileVersion,
        matterId: matterIdRef.current,
        sourceSessionId: isPartnerSession ? effectiveInitialSessionId : undefined
      })
    }).catch(() => null);
    const pending = await pendingResponse?.json().catch(() => null) as { pendingId?: string } | null;
    if (!pendingResponse?.ok || !pending?.pendingId) {
      setPacketActionError(SAVE_RESULT_ERROR);
      return;
    }

    const claimResponse = await fetch("/api/expungement-ai/screening/pending/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendingId: pending.pendingId, next: "/briefcase" })
    }).catch(() => null);
    const claimed = await claimResponse?.json().catch(() => null) as { redirectTo?: string; nextActionPath?: string } | null;
    if (claimResponse?.ok && claimed?.redirectTo) {
      // The answers now live on the saved matter; the session copy would only
      // resurrect a stale set if the participant started the flow again.
      try { window.sessionStorage.removeItem(IN_PROGRESS_STORAGE_KEY); } catch { /* ignore */ }
      router.push(claimed.nextActionPath ?? claimed.redirectTo);
      return;
    }
    if (claimResponse?.status !== 401) {
      setPacketActionError(SAVE_RESULT_ERROR);
      return;
    }

    const params = new URLSearchParams({ mode: "create", next: "/briefcase" });
    params.set("pending", pending.pendingId);
    router.push(`/expungement-ai/sign-in?${params.toString()}`);
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
    setPacketActionError(null);
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
      const result = await response.json() as { ok?: boolean; sessionId?: string; message?: string };
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
            actionError={packetActionError}
            actionPending={packetActionPending}
            hasScreeningSession={isPartnerSession}
          />
        </div>
      </FlowFrame>
    );
  }

  const question = screens[currentIndex];

  return (
    <FlowFrame
      currentQuestion={question.prompt}
      activeQuestion={{ id: question.id, prompt: question.prompt, ...(question.helperText ? { helperText: question.helperText } : {}), ...(question.stage ? { stage: question.stage } : {}) }}
      state={state}
    >
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
            {translate("screening.save_progress_sent", "Check your email for a saved-progress link.")}
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
          <p className="mt-3 text-sm font-semibold text-[#C2410C]">{translate("screening.save_progress_error", "We could not send that link right now. You can continue without saving or try again.")}</p>
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
  activeQuestion,
  wilmaContext = "check",
  state
}: {
  children: React.ReactNode;
  currentQuestion?: string;
  /** UX-GLOBAL-011 — the question on screen, for the help surface. */
  activeQuestion?: { id: string; prompt: string; helperText?: string; stage?: string };
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
      <WilmaBubble context={wilmaContext} currentQuestion={currentQuestion} activeQuestion={activeQuestion} state={state} />
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
