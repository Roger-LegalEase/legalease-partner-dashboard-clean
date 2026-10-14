"use client";

import { ctCleanSlateContactAnswerState } from "@/lib/expungement-ai/ct-clean-slate-contact";
import { ndFirstOffenseContactAnswerState } from "@/lib/expungement-ai/nd-first-offense-family-inputs";
import { ksMunicipalContactAnswerState } from "@/lib/expungement-ai/ks-municipal-contact";
import { akCourtviewContactAnswerState } from "@/lib/expungement-ai/ak-courtview-contact";
import { oregonContactAnswerState } from "@/lib/expungement-ai/oregon-disposition-contact-answer";

import { NY_FUTURE_ID, formatNyFutureApplications } from "@/lib/expungement-ai/ny-16059-future-applications";
import { NY_SEALING_HISTORY_ID, formatNySealingHistory } from "@/lib/expungement-ai/ny-16059-sealing-history";
import { nyCasePreparationQuestions, nyCaseAssociationIssues, NY_CASE_RECONCILIATION_ID, NY_COURT_DIRECTION_CONFIRMATION_ID, NY_FILING_CASE_ID } from "@/lib/expungement-ai/ny-16059-case-questions";
import { isNy16059Packet } from "@/lib/expungement-ai/ny-16059-packet-facts";
import { caProp64JuvenileAdditionalCount } from "@/lib/expungement-ai/ca-prop64-juvenile-document-questions";
import { CA_CONTACT_IDS, formatCaContact } from "@/lib/expungement-ai/ca-prop64-contact-answer";
import { isCaProp64Pathway } from "@/lib/expungement-ai/ca-prop64-choices";
import { NY_TRANSACTION_ASSOCIATIONS_ID, formatNyTransactionAssociations } from "@/lib/expungement-ai/ny-16059-transaction-facts";
import { NY_CASE_RECORDS_ID, formatNyCourtCaseRecords } from "@/lib/expungement-ai/ny-16059-case-records";
import { ny16059CustodyRemovalAvailable } from "@/lib/expungement-ai/ny-custody-correction";

import { CA_PROP64_RECOVERY_COPY, CA_PROP64_COMPLETED, caProp64Choice } from "@/lib/expungement-ai/ca-prop64-choices";

import { useEffect, useMemo, useRef, useState } from "react";

import { usePacketDraftNavigation } from "@/components/expungement-ai/usePacketDraftNavigation";
import { QuestionField } from "@/components/expungement-ai/screening/QuestionField";
import { blocksContinue } from "@/components/expungement-ai/screening/answers";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import type { AnswerValue, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { packetScreensFor as screensFor, packetNavigationDestination, type PacketNavigationIntent } from "@/lib/expungement-ai/packet-navigation";
import { localizeProfileText } from "@/lib/expungement-ai/localization";
import { mcicIdentifierAuthority, requiresMcicIdentifierAuthority } from "@/lib/expungement-ai/sensitive-packet-facts";
import { COURT_RECORD_CONFLICT_COPY } from "@/lib/expungement-ai/record-fact-copy";
import { answerValueIsKnown, questionAnswerState, scalarAnswerText } from "@/lib/expungement-ai/question-answer-state";
import {
  changedPacketAnswers, isPacketSaveReceipt, packetSaveErrorCopy, reconcileSavedAnswers,
  type PacketSaveReceipt
} from "@/lib/expungement-ai/packet-save-contract";

export type PacketBuilderSection = {
  id: string;
  heading: string;
  description: string;
  translations: { es: { heading: string; description: string } };
  questionIds: string[];
};
type BilingualCopy = { en: string; es: string };
const bilingual = (en: string, es: string): BilingualCopy => ({ en, es });
const contactAnswerText = (answer: AnswerValue | undefined): string => answer === undefined || answer === null ? ""
  : typeof answer === "object" && !Array.isArray(answer) && answer.unknown !== true ? String(answer.value ?? "")
    : typeof answer === "string" ? answer : JSON.stringify(answer);

/** Explicit saves; every navigation waits for persistence and canonical conditions. */
export function PacketInformationBuilder({
  itemId, stateCode, pathwayId, questions: initialQuestions, sections: initialSections = [], initialAnswers,
  initiallyMissing, initialRevision, initialResumeSectionId = null, initialPendingDerivations = [], initialContactReconciliation = null, initialRecordClarificationIds = [], initialCourtRecordConflict = false, initialAccountEmailSuggestion = null, initialCaProp64Clarification = false, initialRouteChanged = false, editingFromReview = false, returnToMatterAfterCorrection = false, gaPardonPreparation = false, mtDeferredPreparation = false, caJuvenilePreparation = false
}: {
  itemId: string;
  stateCode: string;
  pathwayId?: string | null;
  questions: ProfileQuestion[];
  sections?: PacketBuilderSection[];
  initialAnswers: Record<string, AnswerValue>;
  initiallyMissing: string[];
  initialRevision: number;
  initialResumeSectionId?: string | null;
  initialPendingDerivations?: PacketSaveReceipt["pendingDerivations"];
  initialContactReconciliation?: PacketSaveReceipt["contactReconciliation"];
  initialRecordClarificationIds?: string[];
  initialCourtRecordConflict?: boolean;
  initialAccountEmailSuggestion?: string | null;
  initialCaProp64Clarification?: boolean;
  initialRouteChanged?: boolean;
  editingFromReview?: boolean;
  /** Exact guidance correction returns to its available matter, not packet review. */
  returnToMatterAfterCorrection?: boolean;
  gaPardonPreparation?: boolean;
  mtDeferredPreparation?: boolean;
  caJuvenilePreparation?: boolean;
}) {
  const { locale, text: localizeText } = useLocalization();
  const copy = (en: string, es: string) => locale === "es" ? es : en;
  const [answers, setAnswers] = useState(initialAnswers);
  const latest = useRef(initialAnswers);
  const confirmed = useRef(initialAnswers);
  const [confirmedAnswers, setConfirmedAnswers] = useState(initialAnswers);
  const revision = useRef(initialRevision);
  const [savedQuestions, setQuestions] = useState(initialQuestions);
  const questions = useMemo(() => {
    if (!isNy16059Packet(stateCode, pathwayId ?? null)) return savedQuestions;
    const current = new Map(nyCasePreparationQuestions(answers).map(question => [question.id, question]));
    return savedQuestions.map(question => current.has(question.id) ? { ...question, ...current.get(question.id) } : question);
  }, [savedQuestions, answers, stateCode, pathwayId]);
  const nyCaseIssues = isNy16059Packet(stateCode, pathwayId ?? null) ? nyCaseAssociationIssues(answers) : [];

  const editingSensitiveIdentifier = questions.some((question) => question.id === "social_security_number");
  const [sections, setSections] = useState(initialSections);
  const [pending, setPending] = useState(initialPendingDerivations);
  const [contactReconciliation, setContactReconciliation] = useState(initialContactReconciliation);
  const [courtRecordConflict, setCourtRecordConflict] = useState(initialCourtRecordConflict);
  const [caProp64Clarification, setCaProp64Clarification] = useState(initialCaProp64Clarification);
  const [accountEmailSuggestion, setAccountEmailSuggestion] = useState(initialAccountEmailSuggestion);
  const accountEmailChoice = useRef<string | null>(null);
  const [accountEmailChoicePending, setAccountEmailChoicePending] = useState(false);
  const [recordClarificationIds, setRecordClarificationIds] = useState(initialRecordClarificationIds);
  function juvenileContactReuse(targetId: string): string | null {
    if (!caJuvenilePreparation) return null;
    const sourceId = targetId === "participant_full_legal_name" ? "ca_prop64_juvenile_full_name"
      : targetId === "ca_prop64_court_case_number" ? "ca_prop64_juvenile_case_number" : null;
    if (!sourceId || recordClarificationIds.includes(sourceId)) return null;
    const raw = answers[sourceId];
    const value = raw && typeof raw === "object" && !Array.isArray(raw)
      && Object.keys(raw).every(key => key === "value" || key === "unknown") && raw.unknown !== true
      && (raw.unknown === undefined || raw.unknown === false) ? raw.value : raw;
    return typeof value === "string" && value.trim() && !/[\x00-\x1f\x7f]/.test(value)
      && answerValueIsKnown(raw) ? value : null;
  }
  const recordChoices = useRef<string[]>([]);
  const [recordChoicePending, setRecordChoicePending] = useState(false);
  const clearCustodyChoice = useRef(false);
  const contactChoice = useRef(false);
  const [contactChoicePending, setContactChoicePending] = useState(false);
  const [missing, setMissing] = useState(initiallyMissing);
  const [screenId, setScreenId] = useState(() => {
    const screens = screensFor(initialQuestions, initialSections);
    if (editingFromReview) return screens[0]?.id ?? "review";
    if (initialResumeSectionId === "review" || screens.some((screen) => screen.id === initialResumeSectionId)) return initialResumeSectionId!;
    return screens.find((screen) => screen.questions.some((question) => initiallyMissing.includes(question.id)
      || initialPendingDerivations.some((fact) => fact.inputFactIds.includes(question.id))))?.id ?? "review";
  });
  const [resumeFallbackNotice, setResumeFallbackNotice] = useState<"actionable" | "review" | null>(() =>
    !editingFromReview && typeof initialResumeSectionId === "string" && initialResumeSectionId.trim().length > 0
      && initialResumeSectionId !== "review" && !screensFor(initialQuestions, initialSections).some((screen) => screen.id === initialResumeSectionId)
      ? screenId === "review" ? "review" : "actionable" : null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, BilingualCopy>>({});
  const [saveError, setSaveError] = useState<BilingualCopy | null>(null);
  const [failureStatus, setFailureStatus] = useState<number | null>(null);
  const [recovery, setRecovery] = useState<PacketSaveReceipt | null>(null);
  const [routeChanged, setRouteChanged] = useState(initialRouteChanged);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const inflight = useRef<Promise<PacketSaveReceipt | null> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const focusNext = useRef(editingFromReview);
  const recoverySequence = useRef(0);
  const screens = useMemo(() => screensFor(questions, sections), [questions, sections]);
  const index = screens.findIndex((screen) => screen.id === screenId);
  const screen = screens[index];
  const dirty = recordChoicePending || contactChoicePending || accountEmailChoicePending || Object.keys(changedPacketAnswers(answers, confirmedAnswers)).length > 0;
  const saveRef = useRef<(resume?: string | null) => Promise<PacketSaveReceipt | null>>(async () => null);
  const screenIdRef = useRef(screenId);
  useEffect(() => { screenIdRef.current = screenId; }, [screenId]);
  const { navigate, departing } = usePacketDraftNavigation(dirty, () => saveRef.current(screenIdRef.current), () => recordChoices.current.length > 0 || contactChoice.current || accountEmailChoice.current !== null || Object.keys(changedPacketAnswers(latest.current, confirmed.current)).length > 0);


  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    root.current?.querySelector<HTMLElement>("[data-packet-step-heading]")?.focus();
  }, [screenId, questions]);

  function moveTo(id: string) { focusNext.current = true; setScreenId(id); setFieldErrors({}); setResumeFallbackNotice(null); }
  function focusQuestion(id: string) {
    requestAnimationFrame(() => {
      const field = root.current?.querySelector<HTMLElement>(`[data-packet-question="${CSS.escape(id)}"] input, [data-packet-question="${CSS.escape(id)}"] select, [data-packet-question="${CSS.escape(id)}"] textarea`);
      (field ?? root.current?.querySelector<HTMLElement>("[data-packet-step-heading]"))?.focus();
    });
  }
  async function save(resumeSectionId: string | null = screenId, navigationIntent: PacketNavigationIntent = "stay"): Promise<PacketSaveReceipt | null> {
    if (inflight.current) return inflight.current;
    const operation = async () => {
      recoverySequence.current += 1;
      setSaving(true); setSaveError(null); setFailureStatus(null); setRecovery(null); setSavedAt(null);
      try {
        // Edits remain available while saving. Drain only edits newer than the
        // receipt, with one request in flight and no stale-response overwrite.
        let receipt: PacketSaveReceipt;
        do {
          const submitted = { ...latest.current };
          const submittedRevision = revision.current;
          const submittedRecordChoices = [...recordChoices.current];
          const submittedAccountEmailChoice = accountEmailChoice.current;
          const response = await fetch(`/api/expungement-ai/briefcase/${encodeURIComponent(itemId)}/packet-information${caJuvenilePreparation ? "?preparation=ca-prop64-juvenile" : mtDeferredPreparation ? "?preparation=mt-deferred" : gaPardonPreparation ? "?preparation=ga-pardon" : ""}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: changedPacketAnswers(submitted, confirmed.current), useContactComponents: contactChoice.current, clearInactiveCustodyFacts: clearCustodyChoice.current, confirmRecordFacts: submittedRecordChoices, useAccountEmail: submittedAccountEmailChoice !== null && submitted.email_address === submittedAccountEmailChoice, expectedRevision: submittedRevision, resumeSectionId: editingFromReview ? null : resumeSectionId, navigationIntent: editingFromReview ? "stay" : navigationIntent, editingFact: editingSensitiveIdentifier ? "social_security_number" : undefined })
          });
          const payload: unknown = await response.json().catch(() => null);
          if (!response.ok || !isPacketSaveReceipt(payload) || payload.revision < submittedRevision || payload.reviewPath !== `/briefcase/${encodeURIComponent(itemId)}/review`) {
            const failure = payload && typeof payload === "object" ? payload as { error?: string; invalidFactIds?: string[] } : {};
            const message = packetSaveErrorCopy(response.ok ? 0 : response.status, failure.error);
            if (failure.error === "account_email_suggestion_changed") {
              accountEmailChoice.current = null; setAccountEmailChoicePending(false); setAccountEmailSuggestion(null);
            }
            setSaveError(message);
            setFailureStatus(response.ok ? 0 : response.status);
            if (Array.isArray(failure.invalidFactIds)) {
              const ids = failure.invalidFactIds.filter((id) => typeof id === "string");
              setFieldErrors(Object.fromEntries(ids.map((id) => [id, bilingual("Review this answer.", "Revise esta respuesta.")])));
              const target = screens.find((step) => step.questions.some((question) => ids.includes(question.id)));
              if (target) setScreenId(target.id);
              if (ids[0]) focusQuestion(ids[0]);
            }
            return null;
          }
          receipt = payload;
          clearCustodyChoice.current = false;
          if (accountEmailChoice.current === submittedAccountEmailChoice) { accountEmailChoice.current = null; setAccountEmailChoicePending(false); }
          setAccountEmailSuggestion(receipt.accountEmailSuggestion ?? null);
          setCaProp64Clarification(receipt.caProp64Clarification ?? false);
          recordChoices.current = []; setRecordChoicePending(false);
          setRecordClarificationIds(receipt.recordClarificationIds ?? []);
          setCourtRecordConflict(receipt.courtRecordConflict ?? false);
          clearCustodyChoice.current = false;
    contactChoice.current = false; setContactChoicePending(false);
          setContactReconciliation(receipt.contactReconciliation ?? null);
          const focusedConfirmation = document.activeElement?.closest("[data-record-clarification]")?.getAttribute("data-record-clarification")
            ?? (document.activeElement === document.body ? submittedRecordChoices[0] : null);
          if (focusedConfirmation && !receipt.recordClarificationIds?.includes(focusedConfirmation)) focusQuestion(focusedConfirmation);
          const focusedQuestion = document.activeElement?.closest("[data-packet-question]")?.getAttribute("data-packet-question");
          if (focusedQuestion && !(editingFromReview ? receipt.reviewQuestions : receipt.questions).some((question) => question.id === focusedQuestion)) focusNext.current = true;
          const merged = reconcileSavedAnswers(submitted, latest.current, receipt.answers);
          confirmed.current = receipt.answers; setConfirmedAnswers(receipt.answers); latest.current = merged; revision.current = receipt.revision;
          setAnswers(merged); setMissing(receipt.missingInputIds); setPending(receipt.pendingDerivations);
          setQuestions(editingFromReview ? receipt.reviewQuestions.filter((question) => initialQuestions.some((initial) => initial.id === question.id)) : receipt.questions);
          setSections(editingFromReview ? initialSections : receipt.sections);
          setRouteChanged(receipt.nextAction === "open_matter");
          if (receipt.nextAction === "open_matter") {
            if (Object.keys(changedPacketAnswers(latest.current, confirmed.current)).length) {
              setSaveError(bilingual("Your saved answers changed the available packet route. Newer edits remain on this page and have not been saved.", "Sus respuestas guardadas cambiaron la vía disponible para el paquete. Los cambios más recientes permanecen en esta página y no se guardaron."));
              return null;
            }
            setSavedAt(Date.now());
            return receipt;
          }
          // A removed conditional section returns focus to the nearest active
          // section, rather than leaving a blank screen or a detached control.
          const nextScreens = screensFor(receipt.questions, receipt.sections);
          if (!editingFromReview && screenIdRef.current !== "review" && !nextScreens.some((next) => next.id === screenIdRef.current)) {
            moveTo(packetNavigationDestination(screens, nextScreens, screenIdRef.current, "stay", merged));
          }
        } while (Object.keys(changedPacketAnswers(latest.current, confirmed.current)).length > 0);
        setSavedAt(Date.now());
        return receipt;
      } catch {
        const message = packetSaveErrorCopy(0);
        setSaveError(message);
        setFailureStatus(0);
        return null;
      } finally { setSaving(false); inflight.current = null; }
    };
    inflight.current = operation();
    return inflight.current;
  }
  useEffect(() => { saveRef.current = save; });

  async function loadSavedForComparison() {
    const requestSequence = ++recoverySequence.current;
    try {
      const response = await fetch(`/api/expungement-ai/briefcase/${encodeURIComponent(itemId)}/packet-information${caJuvenilePreparation ? "?preparation=ca-prop64-juvenile" : mtDeferredPreparation ? "?preparation=mt-deferred" : gaPardonPreparation ? "?preparation=ga-pardon" : editingSensitiveIdentifier ? "?editingFact=social_security_number" : ""}`, { cache: "no-store" });
      const payload: unknown = await response.json();
      if (requestSequence !== recoverySequence.current) return;
      if (!response.ok || !isPacketSaveReceipt(payload) || payload.revision < revision.current || payload.reviewPath !== `/briefcase/${encodeURIComponent(itemId)}/review`) throw new Error("recovery_unavailable");
      setRecovery(payload);
    } catch {
      if (requestSequence !== recoverySequence.current) return;
      setSaveError(bilingual("We could not load the saved answers. Your draft is still here. Try again.", "No pudimos cargar las respuestas guardadas. Su borrador sigue aquí. Vuelva a intentarlo."));
    }
  }
  function acceptRecovery(keepDraft: boolean) {
    if (!recovery) return;
    recoverySequence.current += 1;
    const ownEdits = changedPacketAnswers(latest.current, confirmed.current);
    const next = keepDraft ? { ...recovery.answers, ...ownEdits } : recovery.answers;
    confirmed.current = recovery.answers; setConfirmedAnswers(recovery.answers);
    latest.current = next; setAnswers(next); revision.current = recovery.revision;
    setQuestions(editingFromReview ? recovery.reviewQuestions.filter((question) => initialQuestions.some((initial) => initial.id === question.id)) : recovery.questions);
    setSections(editingFromReview ? initialSections : recovery.sections);
    setMissing(recovery.missingInputIds); setPending(recovery.pendingDerivations);
    setContactReconciliation(recovery.contactReconciliation ?? null);
    setRecordClarificationIds(recovery.recordClarificationIds ?? []);
    setCourtRecordConflict(recovery.courtRecordConflict ?? false);
    setAccountEmailSuggestion(recovery.accountEmailSuggestion ?? null);
    accountEmailChoice.current = null; setAccountEmailChoicePending(false);
    // A conflict after an uncertain save needs a fresh before/after choice;
    // retaining a draft must not silently repeat an adoption against new data.
    clearCustodyChoice.current = false;
    contactChoice.current = false; setContactChoicePending(false);
    recordChoices.current = []; setRecordChoicePending(false);
    setRouteChanged(recovery.nextAction === "open_matter");
    setCaProp64Clarification(recovery.caProp64Clarification ?? false);
    const recoveredQuestions = editingFromReview ? recovery.reviewQuestions.filter((question) => initialQuestions.some((initial) => initial.id === question.id)) : recovery.questions;
    moveTo(packetNavigationDestination(screens, screensFor(recoveredQuestions, editingFromReview ? initialSections : recovery.sections), screenIdRef.current, "stay", next));
    setRecovery(null); setSaveError(null); setFailureStatus(null); setSavedAt(null);
    // Choosing the saved version is an explicit discard, not an implicit merge.
    // Keeping local changes still requires a new Save with the displayed revision.
  }

  async function continueForward() {
    const unanswered = (screen?.questions ?? []).filter((question) => blocksContinue(question, latest.current[question.id]));
    if (unanswered.length) {
      setFieldErrors(Object.fromEntries(unanswered.map((question) => [question.id, bilingual("Please answer this question. You can choose an unsure option when available.", "Responda esta pregunta. Si no sabe la respuesta, puede elegir la opción que lo indica cuando esté disponible.")])));
      focusQuestion(unanswered[0].id);
      return;
    }
    setFieldErrors({});
    const result = await save(screenId, "next");
    if (!result) return;
    if (returnToMatterAfterCorrection) { void navigate(`/briefcase/${encodeURIComponent(itemId)}`); return; }
    if (result.nextAction === "open_matter") return;
    if (result.caProp64Clarification && (!screen || screenId === "review")) {
      const steps = screensFor(result.questions, result.sections);
      moveTo(steps.find((step) => step.questions.some((question) => result.missingInputIds.includes(question.id)))?.id ?? steps[0]?.id ?? "review");
      return;
    }
    if (editingFromReview || !screen) { void navigate(`${result.reviewPath}${editingFromReview ? "#packet-review-heading" : ""}`); return; }
    const currentScreens = screensFor(result.questions, result.sections);
    const destination = packetNavigationDestination(screens, currentScreens, screen.id, "next", latest.current);
    if (destination === "review" && result.caProp64Clarification) {
      const firstMissing = currentScreens.find((step) => step.questions.some((question) => result.missingInputIds.includes(question.id)));
      moveTo(firstMissing?.id ?? currentScreens[0]?.id ?? "review");
      if (result.missingInputIds[0]) focusQuestion(result.missingInputIds[0]);
    } else if (destination === "review") void navigate(result.reviewPath);
    else {
      moveTo(destination);
      const unanswered = currentScreens.find((step) => step.id === destination)?.questions.filter((question) => blocksContinue(question, latest.current[question.id])) ?? [];
      if (destination === screen.id && unanswered[0]) focusQuestion(unanswered[0].id);
    }
  }
  async function leave(path: string) {
    if (!Object.keys(changedPacketAnswers(latest.current, confirmed.current)).length && !inflight.current) { void navigate(path); return; }
    if (await save()) void navigate(path);
  }
  async function back() {
    const priorId = screens[index - 1]?.id;
    if (priorId) {
      if (!Object.keys(changedPacketAnswers(latest.current, confirmed.current)).length && !inflight.current) moveTo(priorId);
      else {
        const result = await save(screenId, "previous");
        if (!result || result.nextAction === "open_matter") return;
        const active = screensFor(result.questions, result.sections);
        moveTo(packetNavigationDestination(screens, active, screenId, "previous", latest.current));
      }
    }
    else await leave(`/briefcase/${encodeURIComponent(itemId)}${editingFromReview && !returnToMatterAfterCorrection ? "/review#packet-review-heading" : ""}`);
  }
  const displayedAnswerState = (question: ProfileQuestion) => {
    if (question.id === "contact_information" && contactReconciliation || recordClarificationIds.includes(question.id) || nyCaseIssues.some(issue => issue.id === question.id)) return "invalid";
    const state = oregonContactAnswerState(stateCode, pathwayId ?? null, question.id, answers[question.id], ndFirstOffenseContactAnswerState(stateCode, pathwayId ?? null, question.id, answers[question.id], ksMunicipalContactAnswerState(stateCode, pathwayId ?? null, question.id, answers[question.id], ctCleanSlateContactAnswerState(stateCode, pathwayId ?? null, question.id, answers[question.id],
      akCourtviewContactAnswerState(stateCode, pathwayId ?? null, question.id, answers[question.id], questionAnswerState(question, answers[question.id]))))));
    return caJuvenilePreparation && question.id === "ca_prop64_juvenile_additional_count" && state === "known_valid"
      && caProp64JuvenileAdditionalCount(answers[question.id]) === undefined ? "invalid" : state;
  };
  const draftMissing = questions.filter((question) => question.required && displayedAnswerState(question) !== "known_valid").length;
  const courtSectionNeedsReview = (question: ProfileQuestion) => courtRecordConflict && ["court", "court_name", "court_type"].includes(question.id);
  const status = screen ? screen.questions.map((question) => courtSectionNeedsReview(question) ? "invalid" : displayedAnswerState(question)) : [];
  const statusId = status.every((value) => value === "known_valid") ? "complete" : status.every((value) => value === "unanswered") ? "not_started" : status.some((value) => ["invalid", "uncertain", "declined"].includes(value)) ? "needs_attention" : "in_progress";
  const statusLabel = status.every((value) => value === "known_valid") ? copy("Complete", "Completo")
    : status.every((value) => value === "unanswered") ? copy("Not started", "Sin empezar")
    : status.some((value) => value === "invalid" || value === "uncertain" || value === "declined") ? copy("Needs attention", "Necesita atención") : copy("In progress", "En curso");

  return (
    <div ref={root} data-packet-information-builder="active" className="rounded-[18px] border border-[#ECEFF4] bg-white p-5 shadow-sm md:p-7">
      {ny16059CustodyRemovalAvailable(stateCode, pathwayId, confirmedAnswers) ? <div className="mb-5 rounded-xl border p-4" data-ny-custody-correction>
        <p>{copy("You saved that there was no incarceration, but earlier custody dates are still saved. If those dates were entered in error, remove them from this calculation. The earlier entries will remain in your saved history.", "Guardó que no hubo encarcelamiento, pero aún hay fechas anteriores guardadas. Si ingresó esas fechas por error, quítelas de este cálculo. Las entradas anteriores permanecerán en su historial guardado.")}</p>
        <button type="button" disabled={saving || dirty || departing} className="mt-3 min-h-11 underline disabled:opacity-50"
          onClick={() => { clearCustodyChoice.current = true; void save().finally(() => { clearCustodyChoice.current = false; }); }}>
          {copy("Remove earlier custody details from this calculation", "Quitar los datos anteriores de encarcelamiento de este cálculo")}
        </button>
        {dirty ? <p>{copy("Save your other changes first.", "Primero guarde los otros cambios.")}</p> : null}
      </div> : null}
      {caProp64Clarification ? <div role="status" data-ca-prop64-recovery-warning className="mb-5 rounded border border-amber-300 p-4 text-sm leading-6">
        <p>{CA_PROP64_RECOVERY_COPY["CA-P64-RECOVERY-WARNING-v2"][locale]}</p>
        {pathwayId !== CA_PROP64_COMPLETED && caProp64Choice("ca_prop64_branch", answers.ca_prop64_branch) === "currently-serving petition"
          && questionAnswerState({ id: "sentence_completion_date", type: "yes_no_unsure" }, answers.sentence_completion_date) === "known_valid"
          && scalarAnswerText(answers.sentence_completion_date)?.trim().toLowerCase() === "yes"
          ? <p className="mt-3" data-ca-prop64-completion-conflict>{CA_PROP64_RECOVERY_COPY["CA-P64-SENTENCE-COMPLETION-CONTRADICTION-v1"][locale]}</p> : null}
        {["currently-serving petition", "completed-sentence application"].includes(caProp64Choice("ca_prop64_branch", answers.ca_prop64_branch) ?? "")
          && caProp64Choice("ca_prop64_branch", answers.ca_prop64_branch) !== (pathwayId === CA_PROP64_COMPLETED ? "completed-sentence application" : "currently-serving petition")
          ? <p className="mt-3" data-ca-prop64-route-mismatch>{CA_PROP64_RECOVERY_COPY["CA-P64-ROUTE-MISMATCH-WARNING-v1"][locale]}</p> : null}
      </div> : null}
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#08786F]">{copy("Packet information", "Información del paquete")}</p>
        {screen ? <p className="text-xs font-semibold text-[#5E687A]">{index + 1} {copy("of", "de")} {screens.length}</p> : null}
      </div>
      {nyCaseIssues.map(issue => <p key={`${issue.id}:${issue.code}`} role="status" className="mb-5 rounded border border-amber-300 p-4 text-sm">{issue[locale]}</p>)}
      {courtRecordConflict ? <p data-court-record-conflict role="status" className="mb-5 rounded border border-amber-300 p-4 text-sm">{COURT_RECORD_CONFLICT_COPY[locale]}</p> : null}
      {routeChanged ? <div className="mb-5 rounded border border-amber-300 p-4" role="status"><p>{returnToMatterAfterCorrection ? copy("Your answers were saved. Open the updated matter to review the result and next steps.", "Se guardaron sus respuestas. Abra el caso actualizado para revisar el resultado y los próximos pasos.") : copy("Your saved answers changed which packet path is available. Review the updated matter before continuing.", "Sus respuestas guardadas cambiaron la vía disponible para el paquete. Revise el caso actualizado antes de continuar.")}</p><a className="mt-2 inline-flex min-h-11 items-center underline" href={`/briefcase/${encodeURIComponent(itemId)}`} target={dirty ? "_blank" : undefined} rel={dirty ? "noopener noreferrer" : undefined}>{dirty ? copy("Open updated matter in a new tab; keep this draft here", "Abrir el caso actualizado en otra pestaña y conservar este borrador aquí") : copy("Open updated matter", "Abrir el caso actualizado")}</a></div> : null}
      <h2 tabIndex={-1} data-packet-step-heading id="packet-step-heading" className="text-xl font-extrabold text-[#0B1320] focus-visible:outline focus-visible:outline-2">
        {screen?.section ? locale === "es" ? screen.section.translations.es.heading : screen.section.heading : screen ? copy("Packet details", "Detalles del paquete") : copy("Review your saved packet information", "Revise la información guardada de su paquete")}
      </h2>
      {resumeFallbackNotice ? <p role="status" data-packet-resume-fallback className="mt-2 text-sm">
        {resumeFallbackNotice === "review"
          ? copy("Your saved section is no longer available. Review your saved answers and any details that still need attention.", "Su sección guardada ya no está disponible. Revise sus respuestas guardadas y los detalles que aún necesiten atención.")
          : copy("Your saved section is no longer available. We opened a section that needs attention.", "Su sección guardada ya no está disponible. Abrimos una sección que necesita atención.")}
      </p> : null}
      {screen ? <>
        <p className="mt-2 text-sm" data-packet-section-status={statusId}>{statusLabel}</p>
        {screen.section ? <p className="mt-2 text-sm leading-6 text-[#5A6275]">{locale === "es" ? screen.section.translations.es.description : screen.section.description}</p> : null}
        <fieldset disabled={departing} className="mt-6 grid gap-8" aria-labelledby="packet-step-heading">
          {screen.questions.map((question) => <div key={question.id} data-packet-question={question.id}>{question.id === "contact_information" && contactReconciliation ? <div>
            <h3 className="text-lg font-bold">{copy("Review your saved contact details", "Revise sus datos de contacto guardados")}</h3>
            <p className="mt-2 text-sm">{copy("Review your earlier contact answer alongside your separate mailing address, phone number, and email before choosing which details to use.", "Revise su respuesta anterior sobre los datos de contacto junto con su dirección postal, número de teléfono y correo electrónico por separado antes de elegir qué datos usar.")}</p>
            <dl className="mt-4 grid gap-2 text-sm">
              <dt className="font-bold">{copy("Earlier saved answer", "Respuesta guardada anteriormente")}</dt><dd className="whitespace-pre-wrap break-words" data-contact-previous>{contactAnswerText(confirmedAnswers.contact_information)}</dd>
              <dt className="font-bold">{copy("Address, phone, and email", "Dirección, teléfono y correo electrónico")}</dt><dd className="whitespace-pre-wrap break-words" data-contact-components>{["mailing_address", "phone_number", "email_address"].map((id) => <div key={id}>{contactAnswerText(answers[id])}</div>)}</dd>
            </dl>
            <p className="mt-3 text-sm">{copy("This replaces the earlier combined answer when you save. Your separate contact details stay editable.", "Esto reemplaza la respuesta combinada anterior cuando guarde. Sus datos de contacto por separado seguirán siendo editables.")}</p>
            {!contactReconciliation.canUseComponents ? <p className="mt-3 text-sm" role="status">{copy("Complete or correct the separate contact details first.", "Primero complete o corrija los datos de contacto por separado.")}</p> : null}
            <button type="button" className="mt-3 min-h-11 rounded border px-4 py-2 font-semibold disabled:opacity-50" disabled={saving || !contactReconciliation.canUseComponents} onClick={() => { contactChoice.current = true; setContactChoicePending(true); void save(screenId, "stay"); }}>{copy("Use and save these contact details", "Usar y guardar estos datos de contacto")}</button>
          </div> : <QuestionField question={question} stateCode={stateCode} caJuvenilePreparation={caJuvenilePreparation} value={answers[question.id]} headingLevel={3} sensitiveInputAllowed={!requiresMcicIdentifierAuthority(stateCode, pathwayId) || mcicIdentifierAuthority(answers, new Date().toISOString()).safe} onChange={(value) => {
            recordChoices.current = []; setRecordChoicePending(false);
            if (question.id === "email_address") { accountEmailChoice.current = null; setAccountEmailChoicePending(false); }
            const next = { ...latest.current, [question.id]: value }; latest.current = next; setAnswers(next); setSavedAt(null);
            setFieldErrors((current) => { const remaining = { ...current }; delete remaining[question.id]; return remaining; });
          }} error={fieldErrors[question.id]?.[locale] ?? null} />}{juvenileContactReuse(question.id) !== null ? <div className="mt-3 rounded border border-[#D8DFE8] p-3 text-sm" data-juvenile-contact-reuse={question.id}>
            <p>{copy("You already entered this value for JV-744. Reuse it for the filing-contact declaration only if it identifies this same juvenile request. Your earlier answer stays in your saved history.", "Ya indicó este dato para JV-744. Reutilícelo en la declaración de contacto solo si identifica esta misma solicitud de menores. Su respuesta anterior permanece en el historial guardado.")}</p>
            <p className="mt-2 break-words font-semibold" dir="auto">{juvenileContactReuse(question.id)}</p>
            <button type="button" className="mt-3 min-h-11 rounded border px-4 py-2 font-semibold disabled:opacity-50" disabled={saving} onClick={() => {
              const reused = juvenileContactReuse(question.id); if (reused === null) return;
              recordChoices.current = recordClarificationIds.includes(question.id) ? [question.id] : [];
              setRecordChoicePending(recordChoices.current.length > 0);
              const next = { ...latest.current, [question.id]: reused }; latest.current = next; setAnswers(next); setSavedAt(null);
              setFieldErrors(current => { const remaining = { ...current }; delete remaining[question.id]; return remaining; });
              void save(screenId, "stay");
            }}>{question.id === "participant_full_legal_name" ? copy("Use and save the name I entered for JV-744", "Usar y guardar el nombre que indiqué para JV-744") : copy("Use and save the case number I entered for JV-744", "Usar y guardar el número de caso que indiqué para JV-744")}</button>
          </div> : null}{question.id === "email_address" && accountEmailSuggestion && contactAnswerText(answers.email_address) !== accountEmailSuggestion ? <div className="mt-3 rounded border border-[#D8DFE8] p-3 text-sm" data-account-email-suggestion>
            <p className="font-semibold">{copy("Account email suggestion", "Sugerencia de correo electrónico de su cuenta")}</p>
            <p className="mt-1 break-words" dir="auto">{accountEmailSuggestion}</p>
            <p className="mt-2" id="packet-account-email-help">{copy("Use this address only if it is safe to include in this packet. You can edit it before saving. This does not change your account email.", "Use esta dirección solo si es seguro incluirla en este paquete. Puede editarla antes de guardar. Esto no cambia el correo electrónico de su cuenta.")}</p>
            <button type="button" aria-describedby="packet-account-email-help" disabled={saving} className="mt-3 min-h-11 rounded border px-4 py-2 font-semibold disabled:opacity-50" onClick={() => {
              accountEmailChoice.current = accountEmailSuggestion; setAccountEmailChoicePending(true);
              recordChoices.current = []; setRecordChoicePending(false);
              const next = { ...latest.current, email_address: accountEmailSuggestion }; latest.current = next; setAnswers(next); setSavedAt(null);
              setFieldErrors((current) => { const remaining = { ...current }; delete remaining.email_address; return remaining; });
              focusQuestion("email_address");
            }}>{copy("Use this email in my draft", "Usar este correo electrónico en mi borrador")}</button>
          </div> : null}{recordClarificationIds.includes(question.id) && questionAnswerState(question, answers[question.id]) === "known_valid" && answerValueIsKnown(answers[question.id]) ? <div className="mt-3" data-record-clarification={question.id}>
            <p className="text-sm" id={`record-clarification-${question.id}`}>{(mtDeferredPreparation || caJuvenilePreparation) ? copy("Compare these saved details with your current records. Keep the displayed answer if it is correct, or edit it before confirming. The previous values will remain in your saved history.", "Compare estos datos guardados con sus expedientes actuales. Conserve la respuesta mostrada si es correcta o edítela antes de confirmarla. Los valores anteriores permanecerán en su historial guardado.") : copy("Compare this saved answer with the court record. Keep it if it is correct, or edit it before confirming. We will not replace it automatically.", "Compare esta respuesta guardada con el expediente judicial. Consérvela si es correcta o edítela antes de confirmarla. No la reemplazaremos automáticamente.")}</p>
            <button type="button" aria-describedby={`record-clarification-${question.id}`} className="mt-3 min-h-11 rounded border px-4 py-2 font-semibold disabled:opacity-50" disabled={saving} onClick={() => { recordChoices.current = [question.id]; setRecordChoicePending(true); void save(screenId, "stay"); }}>{copy("Confirm this answer", "Confirmar esta respuesta")}</button>
          </div> : null}{question.required && ["uncertain", "declined"].includes(questionAnswerState(question, answers[question.id])) ? <p className="mt-3 text-sm" role="status">{copy("You can continue with other questions. This answer still needs to be resolved before your packet can be prepared.", "Puede continuar con las demás preguntas. Esta respuesta aún debe aclararse antes de preparar su paquete.")}</p> : null}</div>)}
        </fieldset>
      </> : <p className="mt-3 text-sm">{copy("Open Review to check the saved answers and any details still needed before final verification.", "Abra la revisión para comprobar las respuestas guardadas y los detalles que aún falten antes de la verificación final.")}</p>}
      {!editingFromReview && screens.length > 1 ? <nav aria-label={copy("Packet sections", "Secciones del paquete")} className="mt-5"><label className="text-sm font-semibold" htmlFor="packet-section-select">{copy("Go to a section", "Ir a una sección")}</label><select id="packet-section-select" className="mt-2 block min-h-11 w-full rounded border p-2" value={screenId} disabled={saving || departing} onChange={(event) => moveTo(event.target.value)}>{screens.map((step) => <option key={step.id} value={step.id}>{step.section ? locale === "es" ? step.section.translations.es.heading : step.section.heading : locale === "es" ? step.questions[0]?.translations?.es?.prompt ?? step.questions[0]?.prompt : step.questions[0]?.prompt}{step.questions.some((question) => question.required && (courtSectionNeedsReview(question) || displayedAnswerState(question) !== "known_valid")) ? copy(" — needs attention", " — necesita atención") : copy(" — complete", " — completo")}</option>)}{screenId === "review" ? <option value="review">{copy("Review", "Revisión")}</option> : null}</select></nav> : null}
      <p className="mt-5 rounded-[10px] bg-[#F7F3EC] px-4 py-3 text-sm" aria-live="polite">
        {dirty ? copy(draftMissing === 1 ? "1 displayed answer still needs attention in this draft. Save to update the requirements." : `${draftMissing} displayed answers still need attention in this draft. Save to update the requirements.`, draftMissing === 1 ? "1 respuesta mostrada aún necesita atención en este borrador. Guarde para actualizar los requisitos." : `${draftMissing} respuestas mostradas aún necesitan atención en este borrador. Guarde para actualizar los requisitos.`)
          : copy(missing.length === 1 ? "1 participant detail still needs attention in the saved matter." : `${missing.length} participant details still need attention in the saved matter.`, missing.length === 1 ? "1 detalle del participante aún necesita atención en el caso guardado." : `${missing.length} detalles del participante aún necesitan atención en el caso guardado.`)}
      </p>
      {pending.length > 0 ? <div className="mt-3 rounded-[10px] border border-amber-200 p-4 text-sm" role="status">
        <p>{copy("Some packet details cannot yet be calculated. Check the source answers below; you do not need to enter the calculated value separately.", "Aún no se pueden calcular algunos detalles del paquete. Revise las respuestas de origen indicadas abajo; no necesita ingresar por separado el valor calculado.")}</p>
        <ul className="mt-2 list-disc pl-5">{[...new Set(pending.flatMap((fact) => fact.inputFactIds))].map((id) => {
          const source = questions.find((question) => question.id === id);
          const target = screens.find((step) => step.questions.some((question) => question.id === id));
          return <li key={id}>{target ? <button type="button" className="min-h-11 text-left underline" disabled={saving || departing} onClick={() => moveTo(target.id)}>{locale === "es" ? source?.translations?.es?.prompt ?? source?.prompt ?? copy("Source answer", "Respuesta de origen") : source?.prompt ?? "Source answer"}</button> : copy("A source answer needs review before this packet can be completed.", "Es necesario revisar una respuesta de origen antes de completar este paquete.")}</li>;
        })}</ul>
      </div> : null}
      <p className="mt-4 text-sm" aria-live="polite">{saving ? copy("Saving...", "Guardando...") : dirty ? copy("Unsaved changes. Use Save or Save and continue.", "Cambios sin guardar. Use Guardar o Guardar y continuar.") : savedAt ? copy("Saved", "Guardado") : copy("Changes are saved when you choose a save action.", "Los cambios se guardan cuando elige una opción para guardar.")}</p>
      {saveError ? <p className="mt-4 rounded-[10px] bg-[#FEF2F2] p-4 text-sm text-[#B42318]" role="alert">{saveError[locale]}</p> : null}
      {failureStatus === 401 || failureStatus === 403 ? <a className="mt-2 inline-flex min-h-11 items-center underline" href={`/expungement-ai/sign-in?mode=signin&next=${encodeURIComponent(`/briefcase/${itemId}`)}`} target="_blank" rel="noopener noreferrer">{copy("Open sign-in in a new tab", "Abrir el inicio de sesión en una pestaña nueva")}</a> : null}
      {failureStatus === 409 || failureStatus === 428 || failureStatus === 0 ? <button type="button" className="mt-2 min-h-11 underline" onClick={() => void loadSavedForComparison()}>{copy("Compare with saved answers", "Comparar con las respuestas guardadas")}</button> : null}
      {recovery ? <div className="mt-4 rounded-[10px] border p-4" role="region" aria-label={copy("Compare answers", "Comparar respuestas")}>
        <p className="text-sm">{copy("Choose which answers to keep. Keeping your draft does not save it until you choose Save.", "Elija qué respuestas conservar. Conservar su borrador no lo guarda hasta que elija Guardar.")}</p>
        <dl className="mt-3 space-y-3">{Object.entries(changedPacketAnswers(answers, confirmedAnswers)).map(([id, value]) => {
          const question = recovery.reviewQuestions.find((question) => question.id === id);
          const label = (value: string) => {
            const option = question?.optionDisplay?.[value];
            return option ? locale === "es" ? option.translations?.es?.label ?? localizeProfileText(locale, option.label, { state: stateCode, questionId: id, part: `option.${value}.label` }) : option.label : localizeText(value);
          };
          const display = (answer: unknown): string => {
            if (isCaProp64Pathway(stateCode, pathwayId ?? null) && CA_CONTACT_IDS.includes(id)) return formatCaContact(id, answer, locale, caJuvenilePreparation);
            if (isNy16059Packet(stateCode, pathwayId ?? null) && id === NY_FUTURE_ID) return formatNyFutureApplications(answer, locale, question?.futureApplicationReferences);
            if (isNy16059Packet(stateCode, pathwayId ?? null) && id === NY_SEALING_HISTORY_ID) return formatNySealingHistory(answer, locale, question?.prior16058ApplicationKnown);
            if (isNy16059Packet(stateCode, pathwayId ?? null) && id === NY_TRANSACTION_ASSOCIATIONS_ID) return formatNyTransactionAssociations(answer, locale);
            if (isNy16059Packet(stateCode, pathwayId ?? null) && id === NY_CASE_RECORDS_ID) return formatNyCourtCaseRecords(answer, locale);
            if (isNy16059Packet(stateCode, pathwayId ?? null) && [NY_CASE_RECONCILIATION_ID, NY_COURT_DIRECTION_CONFIRMATION_ID, NY_FILING_CASE_ID].includes(id)) {
              if (answer && typeof answer === "object" && !Array.isArray(answer) && (answer as { unknown?: unknown }).unknown === true) return copy("Unsure", "No estoy seguro/a");
              const scalar = answer && typeof answer === "object" && !Array.isArray(answer) ? (answer as { value?: unknown }).value : answer;
              return typeof scalar === "string" && question?.options?.includes(scalar) ? label(scalar) : copy("Review this choice against the current case list", "Revise esta selección con la lista actual de casos");
            }
            if (/social_security|ssn/i.test(id)) return copy("Sensitive value hidden", "Dato sensible oculto");
            if (answer === null || answer === undefined) return copy("Unanswered", "Sin responder");
            if (Array.isArray(answer)) return answer.map((value) => label(String(value))).join(", ");
            if (typeof answer === "object" && (answer as { unknown?: boolean }).unknown) return copy("Unsure", "No estoy seguro/a");
            const value = typeof answer === "object" ? String((answer as { value?: unknown }).value ?? "") : String(answer);
            return question && ["single_choice", "yes_no_unsure", "yes_no_prefer_not_to_say"].includes(question.type) ? label(value) : value;
          };
          return <div key={id}><dt className="font-bold">{locale === "es" ? question?.translations?.es?.prompt ?? question?.prompt : question?.prompt}</dt><dd className="whitespace-pre-wrap break-words text-sm">{copy("Your draft: ", "Su borrador: ")}{display(value)}</dd><dd className="whitespace-pre-wrap break-words text-sm">{copy("Saved answer: ", "Respuesta guardada: ")}{display(recovery.answers[id])}</dd></div>;
        })}</dl>
        <div className="mt-4 flex flex-wrap gap-3"><button className="min-h-11 rounded border px-3" type="button" onClick={() => acceptRecovery(true)}>{copy("Keep my draft to save", "Conservar mi borrador para guardarlo")}</button><button className="min-h-11 rounded border px-3" type="button" onClick={() => acceptRecovery(false)}>{copy("Discard my draft and use saved answers", "Descartar mi borrador y usar las respuestas guardadas")}</button></div>
      </div> : null}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button className="min-h-11 rounded-[10px] border px-5 text-sm font-bold disabled:opacity-60" disabled={saving || departing} onClick={() => void back()} type="button">{copy("Back", "Atrás")}</button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="min-h-11 rounded-[10px] border px-5 text-sm font-bold disabled:opacity-60" disabled={saving || departing} onClick={() => void save()} type="button">{copy("Save", "Guardar")}</button>
          <button className="min-h-11 rounded-[10px] border px-5 text-sm font-bold disabled:opacity-60" disabled={saving || departing} onClick={() => void leave(`/briefcase/${encodeURIComponent(itemId)}`)} type="button">{copy("Save and leave", "Guardar y salir")}</button>
          <button className="min-h-11 rounded-[10px] bg-[#C2350A] px-5 text-sm font-bold text-white disabled:opacity-60" disabled={saving || departing || routeChanged} onClick={() => void continueForward()} type="button">{saving ? copy("Saving...", "Guardando...") : returnToMatterAfterCorrection ? copy("Save and return to matter", "Guardar y volver al caso") : caProp64Clarification ? copy("Save and continue", "Guardar y continuar") : !screen || index === screens.length - 1 ? editingFromReview ? copy("Save and return to review", "Guardar y volver a la revisión") : copy("Review packet facts", "Revisar los datos del paquete") : copy("Save and continue", "Guardar y continuar")}</button>
        </div>
      </div>
      <button className="mt-5 min-h-11 text-sm font-semibold text-[#08786F] underline disabled:opacity-60" disabled={saving || departing} type="button" onClick={() => void leave(`/briefcase/${encodeURIComponent(itemId)}`)}>{copy("Return to this matter", "Volver a este caso")}</button>
    </div>
  );
}
