"use client";

import { Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AnswerValue,
  JurisdictionProfile,
  ProfileQuestion,
  ScreeningEvaluation
} from "@/lib/expungement-ai/frontend/contracts";
import { evaluateScreening } from "@/lib/expungement-ai/frontend/evaluate";
import { loadJurisdictionProfile } from "@/lib/expungement-ai/frontend/profile-loader";
import { friendlyMissingFieldLabel, questionForMissingField } from "@/lib/expungement-ai/missing-fields";
import type { ConsumerStateOption } from "@/lib/expungement-ai/states";
import { toScreeningAnswers } from "@/components/expungement-ai/screening/answers";
import { ProgressRail } from "@/components/expungement-ai/screening/ProgressRail";
import { QuestionField } from "@/components/expungement-ai/screening/QuestionField";
import {
  EvaluatingState,
  EvaluationErrorState,
  ScreeningResult
} from "@/components/expungement-ai/screening/ScreeningResult";

type Phase = "generic" | "evaluating" | "missing" | "result" | "error";
type EvalError = { kind: "api_error" | "malformed_response"; message: string };
type GenericAnswers = {
  state: string;
  recordCategory: string;
  caseOutcome: string;
  timing: string;
  county: string;
  caseNumber: string;
};

const outcomeOptions = [
  "Dismissed or dropped",
  "Found not guilty",
  "Completed sentence",
  "Still pending",
  "I am not sure"
];

const recordOptions = [
  "Misdemeanor",
  "Felony",
  "Arrest with no conviction",
  "Municipal or ordinance matter",
  "I am not sure"
];

const initialGenericAnswers: GenericAnswers = {
  state: "",
  recordCategory: "",
  caseOutcome: "",
  timing: "eligible_window",
  county: "",
  caseNumber: ""
};

function createMatterId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `consumer-check-${crypto.randomUUID()}`;
  }
  return `consumer-check-${Date.now().toString(36)}`;
}

export function CheckFlow({ states, initialState = "" }: { states: ConsumerStateOption[]; initialState?: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("generic");
  const [genericAnswers, setGenericAnswers] = useState<GenericAnswers>(() => ({
    ...initialGenericAnswers,
    state: initialState.toUpperCase()
  }));
  const [profile, setProfile] = useState<JurisdictionProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [missingIds, setMissingIds] = useState<string[]>([]);
  const [missingIndex, setMissingIndex] = useState(0);
  const [missingAnswers, setMissingAnswers] = useState<Record<string, AnswerValue>>({});
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<ScreeningEvaluation | null>(null);
  const [evalError, setEvalError] = useState<EvalError | null>(null);
  const focusRef = useRef<HTMLElement>(null);
  const matterIdRef = useRef(createMatterId());
  const setFocusNode = (node: HTMLElement | null) => {
    focusRef.current = node;
  };

  useEffect(() => {
    focusRef.current?.focus();
  }, [phase, missingIndex]);

  const questionsById = useMemo(() => {
    const map: Record<string, ProfileQuestion> = {};
    for (const question of profile?.questions ?? []) {
      map[question.id] = question;
    }
    return map;
  }, [profile]);

  const questionPromptById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const id of missingIds) {
      map[id] = friendlyMissingFieldLabel(id, questionsById[id]);
    }
    return map;
  }, [missingIds, questionsById]);

  const currentMissingQuestion = missingIds[missingIndex]
    ? questionForMissingField(missingIds[missingIndex], questionsById[missingIds[missingIndex]])
    : null;
  const totalSteps = Math.max(1 + missingIds.length, 1);
  const currentStep = phase === "generic" ? 1 : Math.min(2 + missingIndex, totalSteps);

  function updateGeneric<K extends keyof GenericAnswers>(key: K, value: GenericAnswers[K]) {
    setGenericAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleGenericSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!genericAnswers.state || !genericAnswers.recordCategory || !genericAnswers.caseOutcome) return;
    setMissingAnswers({});
    setMissingIds([]);
    setMissingIndex(0);
    await loadProfileAndEvaluate(genericAnswers.state, {});
  }

  async function loadProfileAndEvaluate(state: string, nextMissingAnswers: Record<string, AnswerValue>) {
    setPhase("evaluating");
    setEvalError(null);
    setEvaluation(null);
    setQuestionError(null);

    const loaded = profile?.jurisdiction.code === state ? { ok: true as const, data: profile } : await loadJurisdictionProfile(state);
    if (!loaded.ok) {
      setProfileError(loaded.error);
      setPhase("error");
      return;
    }

    setProfile(loaded.data);
    setProfileError(null);
    const result = await evaluateScreening({
      jurisdiction: loaded.data.jurisdiction.code,
      profileVersion: loaded.data.profileVersion,
      matterId: matterIdRef.current,
      answers: {
        ...genericAnswersToEngineAnswers(genericAnswers),
        ...toScreeningAnswers(nextMissingAnswers)
      }
    });

    if (!result.ok) {
      setEvalError({ kind: result.kind, message: result.error });
      setPhase("error");
      return;
    }

    if (result.data.missingQuestionIds.length > 0) {
      const unanswered = result.data.missingQuestionIds.filter((id) => !Object.prototype.hasOwnProperty.call(nextMissingAnswers, id));
      setMissingIds(unanswered.length > 0 ? unanswered : result.data.missingQuestionIds);
      setMissingIndex(0);
      setPhase("missing");
      return;
    }

    setMissingIds([]);
    setEvaluation(result.data);
    setPhase("result");
  }

  function setMissingAnswer(questionId: string, value: AnswerValue) {
    setMissingAnswers((prev) => ({ ...prev, [questionId]: value }));
    setQuestionError(null);
  }

  async function handleMissingContinue() {
    if (!currentMissingQuestion) return;
    const value = missingAnswers[currentMissingQuestion.id];
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
      setQuestionError("Please answer this question to continue.");
      return;
    }

    setQuestionError(null);
    if (missingIndex < missingIds.length - 1) {
      setMissingIndex((index) => index + 1);
      return;
    }

    await loadProfileAndEvaluate(genericAnswers.state, missingAnswers);
  }

  function handleMissingBack() {
    setQuestionError(null);
    if (missingIndex > 0) {
      setMissingIndex((index) => index - 1);
      return;
    }
    setPhase("generic");
  }

  function returnToMissingDetails(focusQuestionId?: string) {
    if (focusQuestionId) {
      const targetIndex = missingIds.indexOf(focusQuestionId);
      if (targetIndex >= 0) setMissingIndex(targetIndex);
    }
    setPhase(missingIds.length > 0 ? "missing" : "generic");
  }

  if (phase === "evaluating") {
    return (
      <CheckFrame progressCurrent={Math.max(currentStep, 1)} progressTotal={totalSteps}>
        <div ref={setFocusNode} tabIndex={-1} className="outline-none">
          <EvaluatingState />
        </div>
      </CheckFrame>
    );
  }

  if (phase === "error") {
    return (
      <CheckFrame progressCurrent={currentStep} progressTotal={totalSteps}>
        <div ref={setFocusNode} tabIndex={-1} className="outline-none">
          {evalError ? (
            <EvaluationErrorState
              kind={evalError.kind}
              onRetry={() => void loadProfileAndEvaluate(genericAnswers.state, missingAnswers)}
              onEditAnswers={() => setPhase("generic")}
            />
          ) : (
            <div className="rounded-[24px] border border-[#ECEFF4] bg-white p-8 shadow-sm">
              <h1 className="text-[24px] font-extrabold text-[#0B1320]">We could not load that state&apos;s questions.</h1>
              <p className="mt-3 text-sm leading-6 text-[#5A6275]">{profileError ?? "Please try again."}</p>
              <button className="mt-6 min-h-12 rounded-[14px] bg-[#FF3B00] px-6 py-3 text-base font-extrabold text-white" type="button" onClick={() => setPhase("generic")}>
                Back to screening
              </button>
            </div>
          )}
        </div>
      </CheckFrame>
    );
  }

  if (phase === "result" && evaluation && profile) {
    return (
      <CheckFrame progressCurrent={totalSteps} progressTotal={totalSteps}>
        <div ref={setFocusNode} tabIndex={-1} className="outline-none">
          <ScreeningResult
            evaluation={evaluation}
            stateName={profile.jurisdiction.name}
            questionPromptById={questionPromptById}
            onEditAnswers={returnToMissingDetails}
            onPacketAction={() => router.push("/expungement-ai/pay")}
          />
        </div>
      </CheckFrame>
    );
  }

  if (phase === "missing" && currentMissingQuestion) {
    return (
      <CheckFrame progressCurrent={currentStep} progressTotal={totalSteps}>
        <div
          ref={setFocusNode}
          tabIndex={-1}
          className="rounded-[24px] border border-[#ECEFF4] bg-white p-5 shadow-sm outline-none md:p-8"
          data-missing-detail-step="active"
        >
          <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.08em] text-[#00A99D]">A few more details</p>
          <QuestionField
            question={currentMissingQuestion}
            value={missingAnswers[currentMissingQuestion.id]}
            onChange={(value) => setMissingAnswer(currentMissingQuestion.id, value)}
            error={questionError}
          />
          <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
            <button className="min-h-[48px] flex-1 rounded-[14px] bg-[#FF3B00] px-6 py-3 text-base font-extrabold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)]" type="button" onClick={() => void handleMissingContinue()}>
              {missingIndex < missingIds.length - 1 ? "Continue" : "Check my result"} &rarr;
            </button>
            <button className="min-h-[48px] rounded-[14px] border border-[#E4E8EF] bg-white px-6 py-3 text-base font-bold text-[#0B1320]" type="button" onClick={handleMissingBack}>
              Back
            </button>
          </div>
        </div>
      </CheckFrame>
    );
  }

  return (
    <CheckFrame progressCurrent={1} progressTotal={totalSteps}>
      <form
        ref={setFocusNode}
        tabIndex={-1}
        className="rounded-[24px] border border-[#ECEFF4] bg-white p-5 shadow-sm outline-none md:p-8"
        onSubmit={(event) => void handleGenericSubmit(event)}
        data-state-select-count={states.length}
      >
        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#00A99D]">Free screening</p>
        <h1 className="mt-3 text-[30px] font-extrabold leading-tight text-[#0B1320] md:text-[38px]">Tell us about the record.</h1>
        <p className="mt-3 text-sm leading-6 text-[#5A6275]">Start with the basics. If your state&apos;s engine needs more details, we&apos;ll ask those questions before showing a result.</p>

        <div className="mt-7 grid gap-4">
          <label className="grid gap-2 text-[13px] font-bold text-[#0B1320]">
            State or District
            <select className="min-h-12 rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-4 text-[15.5px] text-[#0B1320]" value={genericAnswers.state} onChange={(event) => updateGeneric("state", event.target.value)} required>
              <option value="">Choose your state...</option>
              {states.map((state) => (
                <option key={state.abbreviation} value={state.abbreviation}>{state.label}</option>
              ))}
            </select>
          </label>

          <fieldset className="grid gap-2">
            <legend className="text-[13px] font-bold text-[#0B1320]">What kind of record is this?</legend>
            <div className="grid gap-2">
              {recordOptions.map((option) => (
                <label key={option} className="flex min-h-12 items-center gap-3 rounded-xl border border-[#E4E8EF] bg-[#FBFCFE] px-4 text-sm font-semibold text-[#0B1320]">
                  <input name="recordCategory" type="radio" value={option} checked={genericAnswers.recordCategory === option} onChange={(event) => updateGeneric("recordCategory", event.target.value)} required />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-[13px] font-bold text-[#0B1320]">What happened with the case?</legend>
            <div className="grid gap-2">
              {outcomeOptions.map((option) => (
                <label key={option} className="flex min-h-12 items-center gap-3 rounded-xl border border-[#E4E8EF] bg-[#FBFCFE] px-4 text-sm font-semibold text-[#0B1320]">
                  <input name="caseOutcome" type="radio" value={option} checked={genericAnswers.caseOutcome === option} onChange={(event) => updateGeneric("caseOutcome", event.target.value)} required />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="grid gap-2 text-[13px] font-bold text-[#0B1320]">
            When did it happen?
            <select className="min-h-12 rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-4 text-[15.5px] text-[#0B1320]" value={genericAnswers.timing} onChange={(event) => updateGeneric("timing", event.target.value)} required>
              <option value="eligible_window">More than a year ago</option>
              <option value="too_early">Recently</option>
              <option value="unknown">I am not sure</option>
            </select>
          </label>

          <div className="grid gap-3 rounded-2xl bg-[#F7F3EC] p-4 md:grid-cols-2">
            <label className="grid gap-2 text-[13px] font-bold text-[#0B1320]">
              County
              <input className="min-h-12 rounded-xl border border-[#E4E8EF] bg-white px-4 text-sm" value={genericAnswers.county} onChange={(event) => updateGeneric("county", event.target.value)} placeholder="Optional" />
            </label>
            <label className="grid gap-2 text-[13px] font-bold text-[#0B1320]">
              Case number
              <input className="min-h-12 rounded-xl border border-[#E4E8EF] bg-white px-4 text-sm" value={genericAnswers.caseNumber} onChange={(event) => updateGeneric("caseNumber", event.target.value)} placeholder="Optional" />
            </label>
          </div>
        </div>

        <button className="mt-7 min-h-14 w-full rounded-[14px] bg-[#FF3B00] px-6 py-4 text-base font-extrabold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)]" type="submit">Start free &rarr;</button>
        <p className="mt-4 flex items-start justify-center gap-2 text-center text-[12.5px] leading-6 text-[#8A93A6]">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Saved privately to your Briefcase as you go.
        </p>
      </form>
    </CheckFrame>
  );
}

function CheckFrame({
  children,
  progressCurrent,
  progressTotal
}: {
  children: React.ReactNode;
  progressCurrent: number;
  progressTotal: number;
}) {
  return (
    <section className="mx-auto max-w-2xl px-4 pb-16 pt-28 font-sans md:px-8">
      <ProgressRail current={progressCurrent} total={progressTotal} />
      {children}
      <p className="mt-4 text-center text-[12.5px] leading-6 text-[#8A93A6]">
        This is legal information, not legal advice. The engine decides the result; we never do.
      </p>
    </section>
  );
}

function genericAnswersToEngineAnswers(answers: GenericAnswers) {
  return {
    ownership_scope: "Yes",
    jurisdiction_scope: "State or local",
    case_outcome: mapCaseOutcome(answers.caseOutcome),
    offense_level: mapRecordCategory(answers.recordCategory),
    sentence_completion_date: answers.timing === "too_early" ? "No" : "Yes",
    disposition_date: answers.timing === "unknown" ? "I am not sure" : "2020-01-01",
    state_exclusion_categories: ["None of these"],
    record_documents: answers.caseNumber ? "Yes" : "I am not sure",
    court: "I am not sure",
    charge: answers.recordCategory || "I am not sure",
    county_or_filing_location: answers.county || "I am not sure",
    case_identifier: answers.caseNumber || "I am not sure"
  };
}

function mapCaseOutcome(valueText: string | undefined) {
  if (!valueText) return "I am not sure";
  if (/dismissed|dropped/i.test(valueText)) return "Dismissed, no-billed, nolle prosequi, or not prosecuted";
  if (/not guilty/i.test(valueText)) return "Acquitted or found not guilty";
  if (/pending/i.test(valueText)) return "I am not sure";
  return "Misdemeanor conviction";
}

function mapRecordCategory(valueText: string | undefined) {
  if (!valueText) return "I am not sure";
  if (/felony/i.test(valueText)) return "Felony";
  if (/arrest/i.test(valueText)) return "Infraction or violation";
  if (/municipal|ordinance/i.test(valueText)) return "Municipal or ordinance matter";
  return "Misdemeanor";
}
