"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { QuestionField } from "@/components/expungement-ai/screening/QuestionField";
import { blocksContinue } from "@/components/expungement-ai/screening/answers";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import type { AnswerValue, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

/**
 * Packet-information completion, as PRODUCT_CONTRACT.md Stage 6 describes it.
 *
 * The contract names the sections — About you, Your case, Court and case
 * number, Outcome and dates, Sentence or program completion, Financial
 * obligations, Other cases and prior relief, Required documents, Filing
 * details — and requires each to show one of Not started, In progress,
 * Complete or Needs attention. It also requires autosave to be truthful:
 * "Never display 'Saved' from a client-side state update before the server
 * confirms persistence."
 *
 * The builder used to render one screen per required packet fact, which is how
 * the Mississippi non-conviction route came to ask 54 sequential questions. It
 * now renders one SECTION per screen. Which facts are asked at all, and which
 * section each belongs to, is decided server-side by the collection policy;
 * this component only lays out what it is given.
 *
 * Accessibility: the page owns the `<h1>`, each section heading is an `<h2>`
 * and each question below it an `<h3>`, so the screen reads as one outline
 * rather than a run of competing top-level headings. Every control keeps its
 * `q-<factId>` identity,
 * its label association and its error association, so a field is addressed the
 * same way it always was.
 *
 * Single-question edit mode is unchanged. The review page deep-links
 * `?edit=<questionId>`, the page passes exactly that one question, and Back and
 * the primary action both return to the review at the same position, as Stage 7
 * requires.
 */

export type PacketBuilderSection = {
  id: string;
  heading: string;
  description: string;
  translations: { es: { heading: string; description: string } };
  questionIds: string[];
};

type SectionStatus = "not_started" | "in_progress" | "complete" | "needs_attention";

export function PacketInformationBuilder({
  itemId,
  stateCode,
  questions,
  sections = [],
  initialAnswers,
  initiallyMissing,
  editingFromReview = false,
  reviewReturnRow
}: {
  itemId: string;
  stateCode: string;
  questions: ProfileQuestion[];
  sections?: PacketBuilderSection[];
  initialAnswers: Record<string, AnswerValue>;
  initiallyMissing: string[];
  editingFromReview?: boolean;
  reviewReturnRow?: string;
}) {
  const router = useRouter();
  const reviewPath = `/briefcase/${encodeURIComponent(itemId)}/review`;
  const editReturnPath = editingFromReview && reviewReturnRow
    ? `${reviewPath}#${encodeURIComponent(`review-${reviewReturnRow}`)}`
    : reviewPath;
  const { t: translate } = useLocalization();
  const [answers, setAnswers] = useState(initialAnswers);
  const [index, setIndex] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [missing, setMissing] = useState(initiallyMissing);
  const [saving, setSaving] = useState(false);
  /** Set only once the server has confirmed the write, never from local state. */
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions]
  );

  /**
   * The screens. A section carries the questions the server placed in it; a
   * question in no section — single-question edit mode, or a route the
   * collection policy could not group — is its own screen, which is exactly
   * the behaviour this builder had before sections existed.
   */
  const screens = useMemo(() => {
    const grouped = sections
      .map((section) => ({
        section,
        questions: section.questionIds
          .map((id) => questionById.get(id))
          .filter((question): question is ProfileQuestion => Boolean(question))
      }))
      .filter((screen) => screen.questions.length > 0);
    const placed = new Set(grouped.flatMap((screen) => screen.questions.map((question) => question.id)));
    const ungrouped = questions
      .filter((question) => !placed.has(question.id))
      .map((question) => ({ section: null, questions: [question] }));
    return [...grouped, ...ungrouped];
  }, [sections, questions, questionById]);

  const screen = screens[index];
  const missingSet = useMemo(() => new Set(missing), [missing]);

  function statusFor(screenQuestions: ProfileQuestion[]): SectionStatus {
    const answered = screenQuestions.filter((question) => !blocksContinue(question, answers[question.id]));
    if (screenQuestions.some((question) => fieldErrors[question.id])) return "needs_attention";
    if (answered.length === 0) return "not_started";
    if (answered.length < screenQuestions.length) return "in_progress";
    return screenQuestions.some((question) => missingSet.has(question.id)) ? "needs_attention" : "complete";
  }

  const STATUS_COPY: Record<SectionStatus, { key: string; english: string }> = {
    not_started: { key: "packet.section.not_started", english: "Not started" },
    in_progress: { key: "packet.section.in_progress", english: "In progress" },
    complete: { key: "packet.section.complete", english: "Complete" },
    needs_attention: { key: "packet.section.needs_attention", english: "Needs attention" }
  };

  async function save(reviewed: boolean) {
    if (saving) return null;
    setSaving(true);
    setSaveError(null);
    setSavedAt(null);
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
      // The server has confirmed persistence. Only now is "Saved" true.
      setSavedAt(Date.now());
      return payload;
    } catch {
      setSaveError("We could not save your packet information. Your matter is still in your Briefcase. Please try again.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function continueForward() {
    const unanswered = (screen?.questions ?? []).filter((question) => blocksContinue(question, answers[question.id]));
    if (unanswered.length > 0) {
      setFieldErrors(Object.fromEntries(unanswered.map((question) => [
        question.id,
        "Please answer this question. You can choose the unsure option when one is available."
      ])));
      return;
    }
    setFieldErrors({});
    const result = await save(false);
    if (!result) return;
    if (index < screens.length - 1) {
      setIndex((current) => current + 1);
      return;
    }
    router.push(editingFromReview ? editReturnPath : result.reviewPath ?? reviewPath);
  }

  async function saveAndLeave() {
    const result = await save(false);
    if (result) router.push(`/briefcase/${encodeURIComponent(itemId)}`);
  }

  if (!screen) {
    return (
      <div className="rounded-[16px] border border-[#ECEFF4] bg-white p-6">
        <h2 className="text-xl font-extrabold text-[#0B1320]">Your free screening already has the information we need.</h2>
        <p className="mt-2 text-sm leading-6 text-[#5A6275]">Review your information before continuing.</p>
        <button className="mt-5 min-h-11 rounded-[10px] bg-[#FF3B00] px-5 text-sm font-bold text-white" onClick={() => void continueForward()} type="button">
          Review packet facts
        </button>
      </div>
    );
  }

  const status = statusFor(screen.questions);
  const statusCopy = STATUS_COPY[status];
  const sectionHeadingId = screen.section ? `packet-section-${screen.section.id}` : undefined;

  return (
    <div data-packet-information-builder="active" className="rounded-[18px] border border-[#ECEFF4] bg-white p-5 shadow-sm md:p-7">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#00A99D]">
          {translate("packet.eyebrow", "Packet information")}
        </p>
        <p className="text-xs font-semibold text-[#8A93A6]">{index + 1} of {screens.length}</p>
      </div>

      {screen.section ? (
        <div className="mb-6" data-packet-section={screen.section.id} data-packet-section-status={status}>
          <div className="flex flex-wrap items-center gap-3">
            <h2 id={sectionHeadingId} className="text-[19px] font-extrabold leading-[1.3] text-[#0B1320] md:text-[22px]">
              <SectionHeading section={screen.section} />
            </h2>
            <span className="rounded-full bg-[#F3F5F9] px-3 py-1 text-xs font-bold text-[#5A6275]">
              {translate(statusCopy.key, statusCopy.english)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#5A6275]">
            <SectionDescription section={screen.section} />
          </p>
        </div>
      ) : null}

      <div className="grid gap-8" role={screen.section ? "group" : undefined} aria-labelledby={sectionHeadingId}>
        {screen.questions.map((question) => (
          <QuestionField
            key={question.id}
            question={question}
            stateCode={stateCode}
            value={answers[question.id]}
            headingLevel={screen.section ? 3 : 1}
            onChange={(value) => {
              setAnswers((current) => ({ ...current, [question.id]: value }));
              setFieldErrors((current) => {
                if (!current[question.id]) return current;
                const next = { ...current };
                delete next[question.id];
                return next;
              });
              setSavedAt(null);
            }}
            error={fieldErrors[question.id] ?? null}
          />
        ))}
      </div>

      {missing.length > 0 ? (
        <p className="mt-5 rounded-[10px] bg-[#F7F3EC] px-4 py-3 text-[13px] leading-5 text-[#5A6275]">
          {missing.length} required {missing.length === 1 ? "detail is" : "details are"} still missing. You can review what remains before generation.
        </p>
      ) : null}
      {saving ? (
        <p className="mt-4 text-[13px] font-semibold text-[#5A6275]" aria-live="polite">
          {translate("packet.saving", "Saving...")}
        </p>
      ) : savedAt ? (
        <p className="mt-4 text-[13px] font-semibold text-[#0B7B6B]" aria-live="polite">
          {translate("packet.saved", "Saved")}
        </p>
      ) : null}
      {saveError ? <p className="mt-4 rounded-[10px] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#B42318]" role="alert" aria-live="assertive">{saveError}</p> : null}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          className="min-h-11 rounded-[10px] border border-[#D9DEE8] px-5 text-sm font-bold text-[#0B1320] disabled:opacity-60"
          disabled={saving}
          onClick={() => {
            setFieldErrors({});
            if (editingFromReview && index === 0) router.push(editReturnPath);
            else setIndex((current) => Math.max(0, current - 1));
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
            {saving ? "Saving..." : index === screens.length - 1 ? editingFromReview ? "Save and return to review" : "Review packet facts" : "Save and continue"}
          </button>
        </div>
      </div>
      <Link className="mt-5 inline-block text-sm font-semibold text-[#00A99D]" href={`/briefcase/${encodeURIComponent(itemId)}`}>
        Return to this matter
      </Link>
    </div>
  );
}

/**
 * The section heading, in the participant's language. The Spanish text travels
 * with the section from the server, so a section can never reach a participant
 * in one language only.
 */
function SectionHeading({ section }: { section: PacketBuilderSection }) {
  const { locale } = useLocalization();
  return <>{locale === "es" ? section.translations.es.heading : section.heading}</>;
}

function SectionDescription({ section }: { section: PacketBuilderSection }) {
  const { locale } = useLocalization();
  return <>{locale === "es" ? section.translations.es.description : section.description}</>;
}
