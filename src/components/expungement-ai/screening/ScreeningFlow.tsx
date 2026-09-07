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
import { blocksContinue, toScreeningAnswers } from "@/components/expungement-ai/screening/answers";
import {
  sanitizeAnswersForQuestionIds,
  sanitizeResumedAnswersForQuestionIds,
  screensFromQuestionIds
} from "@/components/expungement-ai/screening/screens";
import { ProgressRail } from "@/components/expungement-ai/screening/ProgressRail";
import { QuestionField } from "@/components/expungement-ai/screening/QuestionField";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { claimHandoffPath, submitClaim } from "@/lib/expungement-ai/claim/claim-handoff";
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

function progressQuestionIds(payload: unknown): string[] | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const nested = record.data && typeof record.data === "object" && !Array.isArray(record.data)
    ? record.data as Record<string, unknown>
    : null;
  const value = record.questionIds ?? nested?.questionIds;
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : null;
}

async function requestScreeningProgress(
  profile: JurisdictionProfile,
  answers: Record<string, AnswerValue>
): Promise<string[] | null> {
  const response = await fetch("/api/expungement-ai/screening/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jurisdiction: profile.jurisdiction.code,
      profileVersion: profile.profileVersion,
      answers: toScreeningAnswers(answers)
    })
  }).catch(() => null);
  if (!response?.ok) return null;
  return progressQuestionIds(await response.json().catch(() => null));
}

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

export function ScreeningFlow({ state, initialSessionId, partnerDisplayName }: { state: string; initialSessionId?: string; partnerDisplayName?: string }) {
  const router = useRouter();
  const { t: translate, locale } = useLocalization();
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
  const [evaluatedAnswers, setEvaluatedAnswers] = useState<Record<string, AnswerValue> | null>(null);
  const [evalError, setEvalError] = useState<EvalError | null>(null);
  const [questionIds, setQuestionIds] = useState<string[] | null>(null);
  const [selectingQuestions, setSelectingQuestions] = useState(false);
  const [selectionError, setSelectionError] = useState(false);
  const [packetActionError, setPacketActionError] = useState<string | null>(null);
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
        setQuestionIds(null);
        setSelectionError(false);
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
    () => (load.status === "ready" && questionIds ? screensFromQuestionIds(load.profile, questionIds) : []),
    [load, questionIds]
  );

  const questionPromptById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const screen of screens) map[screen.id] = screen.prompt;
    return map;
  }, [screens]);

  useEffect(() => {
    if (load.status !== "ready") return;
    let active = true;
    const stored = window.sessionStorage.getItem("expungement-ai:resume-session");
    let resumedAnswers: Record<string, AnswerValue> = {};
    let resumedSessionId: string | undefined;
    let resumedQuestionId: string | null | undefined;
    let resumedFromStorage = false;
    try {
      const parsed = stored ? JSON.parse(stored) as {
        sessionId?: string;
        jurisdiction?: string;
        answers?: Record<string, AnswerValue>;
        currentQuestionId?: string | null;
      } : null;
      if (parsed?.jurisdiction === load.profile.jurisdiction.code && parsed.answers) {
        resumedAnswers = parsed.answers;
        resumedSessionId = parsed.sessionId;
        resumedQuestionId = parsed.currentQuestionId;
        resumedFromStorage = true;
      }
    } catch {
      resumedFromStorage = Boolean(stored);
    }

    void requestScreeningProgress(load.profile, resumedAnswers).then((selectedIds) => {
      if (!active) return;
      setSelectingQuestions(false);
      if (!selectedIds) {
        setSelectionError(true);
        return;
      }
      if (resumedFromStorage) window.sessionStorage.removeItem("expungement-ai:resume-session");
      const selectedScreens = screensFromQuestionIds(load.profile, selectedIds);
      const sanitizedResumedAnswers = sanitizeResumedAnswersForQuestionIds(
        load.profile,
        resumedAnswers,
        selectedIds
      );
      setQuestionIds(selectedIds);
      setAnswers(sanitizedResumedAnswers);
      setSessionId(resumedSessionId ?? effectiveInitialSessionId);
      const target = resumedQuestionId
        ? selectedScreens.findIndex((screen) => screen.id === resumedQuestionId)
        : 0;
      setCurrentIndex(target >= 0 ? target : 0);
    });
    return () => { active = false; };
  }, [load, effectiveInitialSessionId]);

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

  if (load.status === "loading" || (load.status === "ready" && questionIds === null && !selectionError)) return <LoadingState />;
  if (load.status === "missing") return <MissingProfileState state={state} onPick={() => router.push(PICKER_PATH)} />;
  if (load.status === "malformed") return <MalformedProfileState onRetry={() => {
    setLoad({ status: "loading" });
    setLoadNonce((value) => value + 1);
  }} onPick={() => router.push(PICKER_PATH)} />;
  if ((selectionError && questionIds === null) || screens.length === 0) return <MalformedProfileState onRetry={() => {
    setLoad({ status: "loading" });
    setLoadNonce((value) => value + 1);
  }} onPick={() => router.push(PICKER_PATH)} />;

  const profile = load.profile;
  const stateName = profile.jurisdiction.name;

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setError(null);
  }

  async function runEvaluation(answerSnapshot: Record<string, AnswerValue> = answers) {
    setPhase("evaluating");
    setEvalError(null);
    // The engine evaluates; we only send the collected answers (converted to the wire shape).
    // Answers are converted to the same wire shape for fresh and resumed sessions.
    const result = await evaluateScreening({
      jurisdiction: profile.jurisdiction.code,
      profileVersion: profile.profileVersion,
      matterId: matterIdRef.current,
      answers: toScreeningAnswers(answerSnapshot)
    });
    if (result.ok) {
      setEvaluatedAnswers(answerSnapshot);
      void markScreeningSessionCompleted(sessionId);
      setEvaluation(result.data);
      setPhase("result");
    } else {
      setEvalError({ kind: result.kind, message: result.error });
      setPhase("error");
    }
  }

  // The completed screening is handed to the server as inputs, never as trusted
  // route or payment identity. The server re-evaluates those inputs to write the
  // pending result, and the claim re-evaluates them again before a matter
  // exists. Nothing here is a matter or a Briefcase yet: this is a preliminary
  // result and a single-use claim token.
  async function handlePacketAction() {
    if (!evaluation) return;
    setPacketActionError(null);

    const pendingResponse = await fetch("/api/expungement-ai/screening/pending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jurisdiction: profile.jurisdiction.code,
        answers: toScreeningAnswers(evaluatedAnswers ?? answers),
        profileVersion: profile.profileVersion,
        screeningCorrelationId: matterIdRef.current,
        // The server resolves partner, program, event, campaign and consent from
        // its own record of this session. The browser only names the session.
        anonymousSessionId: sessionId ?? effectiveInitialSessionId,
        locale
      })
    }).catch(() => null);
    const pending = await pendingResponse?.json().catch(() => null) as { claimToken?: string } | null;
    if (!pendingResponse?.ok || !pending?.claimToken) {
      setPacketActionError(SAVE_RESULT_ERROR);
      return;
    }

    const claim = await submitClaim(pending.claimToken);
    if (claim.ok) {
      router.push(claim.redirectTo);
      return;
    }
    if (claim.status !== 401) {
      setPacketActionError(SAVE_RESULT_ERROR);
      return;
    }

    // Not signed in yet. The token travels through the authentication handoff
    // and the claim completes on the other side.
    router.push(claimHandoffPath(pending.claimToken, "create", locale));
  }

  async function handleContinue() {
    if (selectingQuestions) return;
    const question = screens[currentIndex];
    if (blocksContinue(question, answers[question.id])) {
      setError(translate("screening.answer_required", "Please answer this question to continue."));
      focusRef.current?.focus();
      return;
    }
    setError(null);
    setSelectingQuestions(true);
    setSelectionError(false);
    const selectedIds = await requestScreeningProgress(profile, answers);
    setSelectingQuestions(false);
    if (!selectedIds) {
      setSelectionError(true);
      focusRef.current?.focus();
      return;
    }
    const selectedScreens = screensFromQuestionIds(profile, selectedIds);
    const sanitizedAnswers = sanitizeAnswersForQuestionIds(answers, screens.map((screen) => screen.id), selectedIds);
    setQuestionIds(selectedIds);
    setAnswers(sanitizedAnswers);
    const currentPosition = selectedScreens.findIndex((screen) => screen.id === question.id);
    const nextIndex = currentPosition >= 0
      ? currentPosition + 1
      : selectedScreens.findIndex((screen) => sanitizedAnswers[screen.id] === undefined);
    if (nextIndex >= 0 && nextIndex < selectedScreens.length) {
      setCurrentIndex(nextIndex);
      return;
    }
    void runEvaluation(sanitizedAnswers);
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
    setEvaluatedAnswers(null);
    if (focusQuestionId) {
      const targetIndex = screens.findIndex((screen) => screen.id === focusQuestionId);
      if (targetIndex >= 0) setCurrentIndex(targetIndex);
    }
    setPhase("questions");
  }

  async function handleSaveProgress() {
    if (saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      const selectedIds = await requestScreeningProgress(profile, answers);
      if (!selectedIds) {
        setSaveStatus("error");
        return;
      }
      const selectedScreens = screensFromQuestionIds(profile, selectedIds);
      const sanitizedAnswers = sanitizeAnswersForQuestionIds(answers, screens.map((screen) => screen.id), selectedIds);
      const matchingIndex = selectedScreens.findIndex((screen) => screen.id === screens[currentIndex]?.id);
      const resumeIndex = matchingIndex >= 0 ? matchingIndex : Math.min(currentIndex, selectedScreens.length - 1);
      const activeQuestion = selectedScreens[resumeIndex];
      if (!activeQuestion) {
        setSaveStatus("error");
        return;
      }
      setQuestionIds(selectedIds);
      setAnswers(sanitizedAnswers);
      setCurrentIndex(resumeIndex);
      const response = await fetch("/api/expungement-ai/screening/save-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          jurisdiction: profile.jurisdiction.code,
          answers: sanitizedAnswers,
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
            hasScreeningSession={isPartnerSession}
            partnerDisplayName={partnerDisplayName}
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
        {selectionError ? (
          <p className="mt-4 rounded-xl bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#B42318]" role="alert" aria-live="assertive">
            We could not load the next question. Your answers are still here; try continuing again.
          </p>
        ) : null}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={() => void handleContinue()}
            disabled={selectingQuestions}
            className="min-h-[48px] flex-1 rounded-[14px] bg-[#FF3B00] px-6 py-3 text-base font-extrabold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1320] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {selectingQuestions ? translate("screening.loading_next", "Loading next question...") : translate("common.continue", "Continue")} &rarr;
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
          <p className="mt-3 text-sm font-semibold text-[#C2410C]" role="alert" aria-live="assertive">{translate("screening.save_progress_error", "We could not send that link right now. You can continue without saving or try again.")}</p>
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
      <div className="rounded-[24px] border border-[#ECEFF4] bg-white p-8 shadow-sm" role="alert" aria-live="assertive">
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
