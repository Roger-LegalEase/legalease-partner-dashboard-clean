"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, MessageSquareText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { illinoisCaseOutcomeOptions, illinoisIntakeIntro, pennsylvaniaCaseOutcomeOptions, pennsylvaniaIntakeIntro, rcapIntakeQuestions, type RcapIntakeQuestion } from "@/lib/rcap-intake/questions";
import type { RcapIntakeSession, RcapPathwaySummary } from "@/lib/rcap-intake/types";
import { rcapIntakeDisclaimer } from "@/lib/rcap-intake/types";

type ApiResponse = {
  session?: RcapIntakeSession;
  summary?: RcapPathwaySummary;
  error?: string;
};

export function RcapWilmaIntakeChat({
  partnerSlug,
  partnerName,
  defaultState,
  defaultCounty,
  disclaimer,
  initialSessionId
}: {
  partnerSlug: string;
  partnerName: string;
  defaultState?: string;
  defaultCounty?: string;
  disclaimer: string;
  initialSessionId?: string;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [session, setSession] = useState<RcapIntakeSession | undefined>();
  const [summary, setSummary] = useState<RcapPathwaySummary | undefined>();
  const [draft, setDraft] = useState<unknown>("");
  const [contactDraft, setContactDraft] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!initialSessionId) {
      return;
    }

    let active = true;
    fetch(`/api/rcap/intake/${encodeURIComponent(initialSessionId)}`)
      .then((response) => response.json() as Promise<ApiResponse>)
      .then((payload) => {
        if (!active || !payload.session) {
          return;
        }

        setSession(payload.session);
        setAcknowledged(payload.session.legalDisclaimerAccepted);
        if (payload.session.pathwaySummary && payload.session.suggestedNextStep && payload.session.eligibilitySignal) {
          setSummary({
            eligibilitySignal: payload.session.eligibilitySignal,
            pathwaySummary: payload.session.pathwaySummary,
            suggestedNextStep: payload.session.suggestedNextStep,
            recommendedService: "Wilma Intake",
            disclaimer: rcapIntakeDisclaimer
          });
        }
      })
      .catch(() => {
        if (active) {
          setError("We could not resume that intake session.");
        }
      });

    return () => {
      active = false;
    };
  }, [initialSessionId]);

  const currentQuestion = useMemo(() => {
    if (!session || session.currentStep === "completed") {
      return undefined;
    }

    const question = rcapIntakeQuestions.find((item) => item.id === session.currentStep);
    return question ? stateSpecificQuestion(question, session) : undefined;
  }, [session]);

  async function startSession() {
    setIsSaving(true);
    setError(undefined);
    const payload = await postJson("/api/rcap/intake/start", {
      partnerSlug,
      legalDisclaimerAccepted: acknowledged
    });
    setIsSaving(false);

    if (payload.error || !payload.session) {
      setError(payload.error ?? "Unable to start intake.");
      return;
    }

    setSession(payload.session);
    setDraft(payload.session.state || defaultState || "");
  }

  async function saveCurrentAnswer(value: unknown) {
    if (!session || !currentQuestion) {
      return;
    }

    setIsSaving(true);
    setError(undefined);
    const payload = await postJson("/api/rcap/intake/respond", {
      sessionId: session.id,
      stepId: currentQuestion.id,
      value
    });

    if (payload.error || !payload.session) {
      setIsSaving(false);
      setError(payload.error ?? "Unable to save answer.");
      return;
    }

    if (payload.session.currentStep === "completed") {
      const completedPayload = await postJson("/api/rcap/intake/complete", { sessionId: session.id });
      setIsSaving(false);

      if (completedPayload.error || !completedPayload.session || !completedPayload.summary) {
        setError(completedPayload.error ?? "Unable to complete intake.");
        return;
      }

      setSession(completedPayload.session);
      setSummary(completedPayload.summary);
      return;
    }

    setSession(payload.session);
    setDraft(nextDraftValue(payload.session.currentStep, payload.session, defaultState, defaultCounty));
    setContactDraft({
      firstName: payload.session.userFirstName ?? "",
      lastName: payload.session.userLastName ?? "",
      email: payload.session.userEmail ?? "",
      phone: payload.session.userPhone ?? ""
    });
    setIsSaving(false);
  }

  return (
    <section className="rounded-md border border-grayWilma-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal">
          <MessageSquareText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-2xl font-black text-navy">Wilma eligibility chat</h2>
          <p className="mt-2 text-sm leading-6 text-grayWilma-700">
            We will ask a few structured questions, save your progress, and suggest a safe next step for {partnerName}.
          </p>
          {isPennsylvaniaState(session?.state ?? defaultState) ? (
            <p className="mt-3 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-3 text-sm leading-6 text-grayWilma-700">
              {pennsylvaniaIntakeIntro}
            </p>
          ) : isIllinoisState(session?.state ?? defaultState) ? (
            <p className="mt-3 rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-3 text-sm leading-6 text-grayWilma-700">
              {illinoisIntakeIntro}
            </p>
          ) : null}
        </div>
      </div>

      {!session ? (
        <div className="mt-6 grid gap-4">
          <div className="rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
              <div>
                <p className="text-sm font-black text-navy">Before we start</p>
                <p className="mt-2 text-sm leading-6 text-grayWilma-700">{disclaimer}</p>
              </div>
            </div>
            <label className="mt-4 flex gap-3 rounded-md bg-white p-3 text-sm font-semibold text-grayWilma-800">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              I understand this tool is informational, not legal advice, and does not guarantee eligibility or outcomes.
            </label>
          </div>
          <Button type="button" disabled={!acknowledged || isSaving} onClick={startSession} className="min-h-11">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ClipboardList className="h-4 w-4" aria-hidden="true" />}
            Start intake
          </Button>
        </div>
      ) : summary ? (
        <FinalSummary summary={summary} session={session} />
      ) : currentQuestion ? (
        <div className="mt-6">
          <div className="rounded-md border border-grayWilma-200 bg-[#f7f8f6] p-4">
            <p className="text-xs font-black uppercase text-teal">Question {rcapIntakeQuestions.findIndex((question) => question.id === currentQuestion.id) + 1} of {rcapIntakeQuestions.length}</p>
            <h3 className="mt-3 text-xl font-black text-navy">{currentQuestion.prompt}</h3>
            {currentQuestion.helper ? <p className="mt-2 text-sm leading-6 text-grayWilma-700">{currentQuestion.helper}</p> : null}
          </div>

          <div className="mt-4">
            {currentQuestion.type === "choice" ? (
              <div className="grid gap-3">
                {currentQuestion.options?.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isSaving}
                    onClick={() => saveCurrentAnswer(option.value)}
                    className="min-h-12 rounded-md border border-grayWilma-200 bg-white px-4 py-3 text-left text-sm font-black text-navy transition hover:border-teal hover:bg-teal/5 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : currentQuestion.type === "boolean" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" variant="secondary" disabled={isSaving} onClick={() => saveCurrentAnswer(true)} className="min-h-12">Yes</Button>
                <Button type="button" variant="secondary" disabled={isSaving} onClick={() => saveCurrentAnswer(false)} className="min-h-12">No / not sure</Button>
              </div>
            ) : currentQuestion.type === "contact" ? (
              <ContactFields contactDraft={contactDraft} setContactDraft={setContactDraft} disabled={isSaving} onSubmit={() => saveCurrentAnswer(contactDraft)} />
            ) : (
              <TextAnswer
                value={typeof draft === "string" ? draft : ""}
                disabled={isSaving}
                onChange={setDraft}
                onSubmit={() => saveCurrentAnswer(draft)}
              />
            )}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p> : null}
    </section>
  );
}

function TextAnswer({
  value,
  disabled,
  onChange,
  onSubmit
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-3">
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-md border border-grayWilma-200 px-3 text-sm font-semibold text-navy outline-none focus:border-teal"
      />
      <Button type="button" disabled={!value.trim() || disabled} onClick={onSubmit} className="min-h-11">
        Continue
      </Button>
    </div>
  );
}

function ContactFields({
  contactDraft,
  setContactDraft,
  disabled,
  onSubmit
}: {
  contactDraft: { firstName: string; lastName: string; email: string; phone: string };
  setContactDraft: (value: { firstName: string; lastName: string; email: string; phone: string }) => void;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <ContactInput label="First name" value={contactDraft.firstName} disabled={disabled} onChange={(firstName) => setContactDraft({ ...contactDraft, firstName })} />
        <ContactInput label="Last name" value={contactDraft.lastName} disabled={disabled} onChange={(lastName) => setContactDraft({ ...contactDraft, lastName })} />
        <ContactInput label="Email" type="email" value={contactDraft.email} disabled={disabled} onChange={(email) => setContactDraft({ ...contactDraft, email })} />
        <ContactInput label="Phone" value={contactDraft.phone} disabled={disabled} onChange={(phone) => setContactDraft({ ...contactDraft, phone })} />
      </div>
      <p className="text-xs leading-5 text-grayWilma-600">Do not enter SSN, date of birth, or detailed case narratives in this foundation.</p>
      <Button type="button" disabled={!contactDraft.firstName.trim() || (!contactDraft.email.trim() && !contactDraft.phone.trim()) || disabled} onClick={onSubmit} className="min-h-11">
        Finish intake
      </Button>
    </div>
  );
}

function ContactInput({
  label,
  value,
  disabled,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-xs font-bold uppercase text-grayWilma-600">
      {label}
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-md border border-grayWilma-200 px-3 text-sm font-semibold normal-case text-navy outline-none focus:border-teal"
      />
    </label>
  );
}

function FinalSummary({ summary, session }: { summary: RcapPathwaySummary; session: RcapIntakeSession }) {
  return (
    <div className="mt-6 rounded-md border border-teal/30 bg-teal/5 p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden="true" />
        <div>
          <p className="text-sm font-black uppercase text-teal">Pathway summary</p>
          <h3 className="mt-2 text-2xl font-black text-navy">A next step is ready for review.</h3>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        <SummaryLine label="Signal" value={summary.eligibilitySignal.replaceAll("_", " ")} />
        <SummaryLine label="Summary" value={summary.pathwaySummary} />
        <SummaryLine label="Suggested next step" value={summary.suggestedNextStep} />
        <SummaryLine label="Recommended service" value={summary.recommendedService} />
      </div>
      <p className="mt-5 rounded-md border border-grayWilma-200 bg-white p-3 text-sm leading-6 text-grayWilma-700">{summary.disclaimer}</p>
      {isSupportedDocumentState(session.state) ? (
        <a
          href={`/documents/${session.partnerSlug}/form?session=${session.id}`}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-5 py-2 text-sm font-semibold text-white transition hover:bg-navy-mid"
        >
          Continue to document information form
        </a>
      ) : null}
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white px-3 py-3">
      <p className="text-xs font-semibold uppercase text-grayWilma-600">{label}</p>
      <p className="mt-1 text-sm font-black capitalize text-navy">{value}</p>
    </div>
  );
}

function nextDraftValue(step: RcapIntakeSession["currentStep"], session: RcapIntakeSession, defaultState?: string, defaultCounty?: string) {
  if (step === "state") {
    return session.state || defaultState || "";
  }

  if (step === "county") {
    return session.county || defaultCounty || "";
  }

  return "";
}

function stateSpecificQuestion(question: RcapIntakeQuestion, session: RcapIntakeSession): RcapIntakeQuestion {
  if (isPennsylvaniaState(session.state)) {
    if (question.id === "case_outcome") {
      return {
        ...question,
        prompt: "How did the Pennsylvania case end?",
        helper: "This helps sort whether expungement, limited access / sealing, Clean Slate, or more information may be worth reviewing.",
        options: pennsylvaniaCaseOutcomeOptions
      };
    }

    if (question.id === "has_documents") {
      return {
        ...question,
        prompt: "Do you already have a PATCH report or court docket information?",
        helper: "No problem if you do not. A PATCH report may help confirm what is showing before anyone reviews next steps."
      };
    }

    if (question.id === "needs_record_check") {
      return {
        ...question,
        prompt: "Would help getting or checking your PATCH report be useful?",
        helper: "PATCH and court records can help confirm the docket, charge, grade, disposition, timing, and restitution status."
      };
    }

    if (question.id === "county") {
      return {
        ...question,
        prompt: "What Pennsylvania county was the case heard in?",
        helper: "Use the county for the Court of Common Pleas case if you know it. A best guess is okay for now."
      };
    }

    return question;
  }

  if (!isIllinoisState(session.state)) {
    return question;
  }

  if (question.id === "case_outcome") {
    return {
      ...question,
      prompt: "How did the Illinois case end?",
      helper: "This helps decide whether expungement, sealing, or more information may be worth reviewing.",
      options: illinoisCaseOutcomeOptions
    };
  }

  if (question.id === "has_documents") {
    return {
      ...question,
      prompt: "Do you already have your Illinois criminal history report, sometimes called a RAP sheet?",
      helper: "No problem if you do not. You can still start, but the next step may be marked as needing more information until those details are confirmed."
    };
  }

  if (question.id === "needs_record_check") {
    return {
      ...question,
      prompt: "Would help getting or checking your Illinois RAP sheet be useful?",
      helper: "A RAP sheet can help confirm case numbers, charges, dates, and outcomes before anything is filed."
    };
  }

  if (question.id === "county") {
    return {
      ...question,
      prompt: "What Illinois county or Cook County district was involved?",
      helper: "Use the county where the arrest or charge happened. If it was Cook County and you know the district, include it."
    };
  }

  return question;
}

function isIllinoisState(state?: string) {
  return state?.toLowerCase() === "illinois" || state?.toUpperCase() === "IL";
}

function isPennsylvaniaState(state?: string) {
  const normalized = state?.trim().toLowerCase();
  return normalized === "pa" || normalized === "pennsylvania";
}

function isSupportedDocumentState(state?: string) {
  const normalized = state?.trim().toLowerCase();
  return normalized === "mississippi" || state?.toUpperCase() === "MS" || normalized === "illinois" || state?.toUpperCase() === "IL" || normalized === "pa" || normalized === "pennsylvania" || normalized === "dc" || normalized === "d.c." || normalized === "district of columbia" || normalized === "washington, dc";
}

async function postJson(url: string, body: Record<string, unknown>): Promise<ApiResponse> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return (await response.json()) as ApiResponse;
  } catch {
    return { error: "The intake service is unavailable." };
  }
}
