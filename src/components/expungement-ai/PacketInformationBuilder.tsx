"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { QuestionField } from "@/components/expungement-ai/screening/QuestionField";
import { blocksContinue } from "@/components/expungement-ai/screening/answers";
import type { AnswerValue, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

export function PacketInformationBuilder({
  itemId,
  stateCode,
  questions,
  initialAnswers,
  initiallyMissing
}: {
  itemId: string;
  stateCode: string;
  questions: ProfileQuestion[];
  initialAnswers: Record<string, AnswerValue>;
  initiallyMissing: string[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState(initialAnswers);
  const [index, setIndex] = useState(0);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [missing, setMissing] = useState(initiallyMissing);
  const [saving, setSaving] = useState(false);
  const question = questions[index];

  async function save(reviewed: boolean) {
    if (saving) return null;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(`/api/expungement-ai/briefcase/${encodeURIComponent(itemId)}/packet-information`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, reviewed })
      });
      const payload = await response.json().catch(() => null) as {
        missingInputIds?: string[];
        reviewPath?: string;
      } | null;
      if (!response.ok || !payload) {
        setSaveError("We could not save your packet information. Your matter is still in your Briefcase. Please try again.");
        return null;
      }
      setMissing(payload.missingInputIds ?? []);
      return payload;
    } catch {
      setSaveError("We could not save your packet information. Your matter is still in your Briefcase. Please try again.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function continueForward() {
    if (question && blocksContinue(question, answers[question.id])) {
      setFieldError("Please answer this question. You can choose the unsure option when one is available.");
      return;
    }
    setFieldError(null);
    const result = await save(index >= questions.length - 1);
    if (!result) return;
    if (index < questions.length - 1) {
      setIndex((current) => current + 1);
      return;
    }
    router.push(result.reviewPath ?? `/briefcase/${encodeURIComponent(itemId)}/review`);
  }

  async function saveAndLeave() {
    const result = await save(false);
    if (result) router.push(`/briefcase/${encodeURIComponent(itemId)}`);
  }

  if (!question) {
    return (
      <div className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
        <h2 className="text-xl font-extrabold text-[#0B1320]">Your saved screening already has the packet information we need.</h2>
        <p className="mt-2 text-sm leading-6 text-[#5A6275]">Review the matter for accuracy before deciding whether to generate a packet.</p>
        <button className="mt-5 min-h-11 rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white" onClick={() => void continueForward()} type="button">
          Review for accuracy
        </button>
      </div>
    );
  }

  return (
    <div data-packet-information-builder="active" className="rounded-[18px] border border-[#ECEFF4] bg-white p-5 shadow-sm md:p-7">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#00A99D]">Packet information</p>
        <p className="text-xs font-semibold text-[#8A93A6]">{index + 1} of {questions.length}</p>
      </div>

      <QuestionField
        question={question}
        stateCode={stateCode}
        value={answers[question.id]}
        onChange={(value) => {
          setAnswers((current) => ({ ...current, [question.id]: value }));
          setFieldError(null);
        }}
        error={fieldError}
      />

      {missing.length > 0 ? (
        <p className="mt-5 rounded-[10px] bg-[#F7F3EC] px-4 py-3 text-[13px] leading-5 text-[#5A6275]">
          {missing.length} required {missing.length === 1 ? "detail is" : "details are"} still missing. You can review what remains before generation.
        </p>
      ) : null}
      {saveError ? <p className="mt-4 rounded-[10px] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#B42318]" role="alert">{saveError}</p> : null}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          className="min-h-11 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320] disabled:opacity-60"
          disabled={saving}
          onClick={() => {
            setFieldError(null);
            setIndex((current) => Math.max(0, current - 1));
          }}
          type="button"
        >
          Back
        </button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="min-h-11 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320] disabled:opacity-60" disabled={saving} onClick={() => void saveAndLeave()} type="button">
            Save and leave
          </button>
          <button className="min-h-11 rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white disabled:opacity-60" disabled={saving} onClick={() => void continueForward()} type="button">
            {saving ? "Saving..." : index === questions.length - 1 ? "Review for accuracy" : "Save and continue"}
          </button>
        </div>
      </div>
      <Link className="mt-5 inline-block text-sm font-semibold text-[#00A99D]" href={`/briefcase/${encodeURIComponent(itemId)}`}>
        Return to this matter
      </Link>
    </div>
  );
}
