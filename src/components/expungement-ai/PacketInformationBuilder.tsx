"use client";

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
import { answerValueIsKnown, questionAnswerState } from "@/lib/expungement-ai/question-answer-state";
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
  initiallyMissing, initialRevision, initialResumeSectionId = null, initialPendingDerivations = [], initialContactReconciliation = null, initialRecordClarificationIds = [], initialCourtRecordConflict = false, editingFromReview = false
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
  editingFromReview?: boolean;
}) {
  const { locale, text: localizeText } = useLocalization();
  const copy = (en: string, es: string) => locale === "es" ? es : en;
  const [answers, setAnswers] = useState(initialAnswers);
  const latest = useRef(initialAnswers);
  const confirmed = useRef(initialAnswers);
  const [confirmedAnswers, setConfirmedAnswers] = useState(initialAnswers);
  const revision = useRef(initialRevision);
  const [questions, setQuestions] = useState(initialQuestions);
  const editingSensitiveIdentifier = questions.some((question) => question.id === "social_security_number");
  const [sections, setSections] = useState(initialSections);
  const [pending, setPending] = useState(initialPendingDerivations);
  const [contactReconciliation, setContactReconciliation] = useState(initialContactReconciliation);
  const [courtRecordConflict, setCourtRecordConflict] = useState(initialCourtRecordConflict);
  const [recordClarificationIds, setRecordClarificationIds] = useState(initialRecordClarificationIds);
  const recordChoices = useRef<string[]>([]);
  const [recordChoicePending, setRecordChoicePending] = useState(false);
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, BilingualCopy>>({});
  const [saveError, setSaveError] = useState<BilingualCopy | null>(null);
  const [failureStatus, setFailureStatus] = useState<number | null>(null);
  const [recovery, setRecovery] = useState<PacketSaveReceipt | null>(null);
  const [routeChanged, setRouteChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const inflight = useRef<Promise<PacketSaveReceipt | null> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const focusNext = useRef(false);
  const recoverySequence = useRef(0);
  const screens = useMemo(() => screensFor(questions, sections), [questions, sections]);
  const index = screens.findIndex((screen) => screen.id === screenId);
  const screen = screens[index];
  const dirty = recordChoicePending || contactChoicePending || Object.keys(changedPacketAnswers(answers, confirmedAnswers)).length > 0;
  const saveRef = useRef<(resume?: string | null) => Promise<PacketSaveReceipt | null>>(async () => null);
  const screenIdRef = useRef(screenId);
  useEffect(() => { screenIdRef.current = screenId; }, [screenId]);
  const { navigate, departing } = usePacketDraftNavigation(dirty, () => saveRef.current(screenIdRef.current), () => recordChoices.current.length > 0 || contactChoice.current || Object.keys(changedPacketAnswers(latest.current, confirmed.current)).length > 0);


  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    root.current?.querySelector<HTMLElement>("[data-packet-step-heading]")?.focus();
  }, [screenId, questions]);

  function moveTo(id: string) { focusNext.current = true; setScreenId(id); setFieldErrors({}); }
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
          const response = await fetch(`/api/expungement-ai/briefcase/${encodeURIComponent(itemId)}/packet-information`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: changedPacketAnswers(submitted, confirmed.current), useContactComponents: contactChoice.current, confirmRecordFacts: submittedRecordChoices, expectedRevision: submittedRevision, resumeSectionId: editingFromReview ? null : resumeSectionId, navigationIntent: editingFromReview ? "stay" : navigationIntent, editingFact: editingSensitiveIdentifier ? "social_security_number" : undefined })
          });
          const payload: unknown = await response.json().catch(() => null);
          if (!response.ok || !isPacketSaveReceipt(payload) || payload.revision < submittedRevision || payload.reviewPath !== `/briefcase/${encodeURIComponent(itemId)}/review`) {
            const failure = payload && typeof payload === "object" ? payload as { error?: string; invalidFactIds?: string[] } : {};
            const message = packetSaveErrorCopy(response.ok ? 0 : response.status, failure.error);
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
          recordChoices.current = []; setRecordChoicePending(false);
          setRecordClarificationIds(receipt.recordClarificationIds ?? []);
          setCourtRecordConflict(receipt.courtRecordConflict ?? false);
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
      const response = await fetch(`/api/expungement-ai/briefcase/${encodeURIComponent(itemId)}/packet-information${editingSensitiveIdentifier ? "?editingFact=social_security_number" : ""}`, { cache: "no-store" });
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
    // A conflict after an uncertain save needs a fresh before/after choice;
    // retaining a draft must not silently repeat an adoption against new data.
    contactChoice.current = false; setContactChoicePending(false);
    recordChoices.current = []; setRecordChoicePending(false);
    setRouteChanged(recovery.nextAction === "open_matter");
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
    if (!result || result.nextAction === "open_matter") return;
    if (editingFromReview || !screen) { void navigate(result.reviewPath); return; }
    const currentScreens = screensFor(result.questions, result.sections);
    const destination = packetNavigationDestination(screens, currentScreens, screen.id, "next", latest.current);
    if (destination === "review") void navigate(result.reviewPath);
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
    else await leave(`/briefcase/${encodeURIComponent(itemId)}${editingFromReview ? "/review" : ""}`);
  }
  const displayedAnswerState = (question: ProfileQuestion) => (question.id === "contact_information" && contactReconciliation || recordClarificationIds.includes(question.id)) ? "invalid" : questionAnswerState(question, answers[question.id]);
  const draftMissing = questions.filter((question) => question.required && displayedAnswerState(question) !== "known_valid").length;
  const courtSectionNeedsReview = (question: ProfileQuestion) => courtRecordConflict && ["court", "court_name", "court_type"].includes(question.id);
  const status = screen ? screen.questions.map((question) => courtSectionNeedsReview(question) ? "invalid" : displayedAnswerState(question)) : [];
  const statusId = status.every((value) => value === "known_valid") ? "complete" : status.every((value) => value === "unanswered") ? "not_started" : status.some((value) => ["invalid", "uncertain", "declined"].includes(value)) ? "needs_attention" : "in_progress";
  const statusLabel = status.every((value) => value === "known_valid") ? copy("Complete", "Completo")
    : status.every((value) => value === "unanswered") ? copy("Not started", "Sin empezar")
    : status.some((value) => value === "invalid" || value === "uncertain" || value === "declined") ? copy("Needs attention", "Necesita atención") : copy("In progress", "En curso");

  return (
    <div ref={root} data-packet-information-builder="active" className="rounded-[18px] border border-[#ECEFF4] bg-white p-5 shadow-sm md:p-7">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#08786F]">{copy("Packet information", "Información del paquete")}</p>
        {screen ? <p className="text-xs font-semibold text-[#5E687A]">{index + 1} {copy("of", "de")} {screens.length}</p> : null}
      </div>
      {courtRecordConflict ? <p data-court-record-conflict role="status" className="mb-5 rounded border border-amber-300 p-4 text-sm">{COURT_RECORD_CONFLICT_COPY[locale]}</p> : null}
      {routeChanged ? <div className="mb-5 rounded border border-amber-300 p-4" role="status"><p>{copy("Your saved answers changed which packet path is available. Review the updated matter before continuing.", "Sus respuestas guardadas cambiaron la vía disponible para el paquete. Revise el caso actualizado antes de continuar.")}</p><a className="mt-2 inline-flex min-h-11 items-center underline" href={`/briefcase/${encodeURIComponent(itemId)}`} target={dirty ? "_blank" : undefined} rel={dirty ? "noopener noreferrer" : undefined}>{dirty ? copy("Open updated matter in a new tab; keep this draft here", "Abrir el caso actualizado en otra pestaña y conservar este borrador aquí") : copy("Open updated matter", "Abrir el caso actualizado")}</a></div> : null}
      <h2 tabIndex={-1} data-packet-step-heading id="packet-step-heading" className="text-xl font-extrabold text-[#0B1320] focus-visible:outline focus-visible:outline-2">
        {screen?.section ? locale === "es" ? screen.section.translations.es.heading : screen.section.heading : screen ? copy("Packet details", "Detalles del paquete") : copy("Review your saved packet information", "Revise la información guardada de su paquete")}
      </h2>
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
          </div> : <QuestionField question={question} stateCode={stateCode} value={answers[question.id]} headingLevel={3} sensitiveInputAllowed={!requiresMcicIdentifierAuthority(stateCode, pathwayId) || mcicIdentifierAuthority(answers, new Date().toISOString()).safe} onChange={(value) => {
            recordChoices.current = []; setRecordChoicePending(false);
            const next = { ...latest.current, [question.id]: value }; latest.current = next; setAnswers(next); setSavedAt(null);
            setFieldErrors((current) => { const remaining = { ...current }; delete remaining[question.id]; return remaining; });
          }} error={fieldErrors[question.id]?.[locale] ?? null} />}{recordClarificationIds.includes(question.id) && questionAnswerState(question, answers[question.id]) === "known_valid" && answerValueIsKnown(answers[question.id]) ? <div className="mt-3" data-record-clarification={question.id}>
            <p className="text-sm" id={`record-clarification-${question.id}`}>{copy("Compare this saved answer with the court record. Keep it if it is correct, or edit it before confirming. We will not replace it automatically.", "Compare esta respuesta guardada con el expediente judicial. Consérvela si es correcta o edítela antes de confirmarla. No la reemplazaremos automáticamente.")}</p>
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
      {failureStatus === 401 || failureStatus === 403 ? <a className="mt-2 inline-flex min-h-11 items-center underline" href={`/expungement-ai/sign-in?next=${encodeURIComponent(`/briefcase/${itemId}`)}`} target="_blank" rel="noopener noreferrer">{copy("Open sign-in in a new tab", "Abrir el inicio de sesión en una pestaña nueva")}</a> : null}
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
            if (/social_security|ssn/i.test(id)) return copy("Sensitive value hidden", "Dato sensible oculto");
            if (answer === null || answer === undefined) return copy("Unanswered", "Sin responder");
            if (Array.isArray(answer)) return answer.map((value) => label(String(value))).join(", ");
            if (typeof answer === "object" && (answer as { unknown?: boolean }).unknown) return copy("Unsure", "No estoy seguro/a");
            const value = typeof answer === "object" ? String((answer as { value?: unknown }).value ?? "") : String(answer);
            return question && ["single_choice", "yes_no_unsure", "yes_no_prefer_not_to_say"].includes(question.type) ? label(value) : value;
          };
          return <div key={id}><dt className="font-bold">{locale === "es" ? question?.translations?.es?.prompt ?? question?.prompt : question?.prompt}</dt><dd className="break-words text-sm">{copy("Your draft: ", "Su borrador: ")}{display(value)}</dd><dd className="break-words text-sm">{copy("Saved answer: ", "Respuesta guardada: ")}{display(recovery.answers[id])}</dd></div>;
        })}</dl>
        <div className="mt-4 flex flex-wrap gap-3"><button className="min-h-11 rounded border px-3" type="button" onClick={() => acceptRecovery(true)}>{copy("Keep my draft to save", "Conservar mi borrador para guardarlo")}</button><button className="min-h-11 rounded border px-3" type="button" onClick={() => acceptRecovery(false)}>{copy("Discard my draft and use saved answers", "Descartar mi borrador y usar las respuestas guardadas")}</button></div>
      </div> : null}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button className="min-h-11 rounded-[10px] border px-5 text-sm font-bold disabled:opacity-60" disabled={saving || departing} onClick={() => void back()} type="button">{copy("Back", "Atrás")}</button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="min-h-11 rounded-[10px] border px-5 text-sm font-bold disabled:opacity-60" disabled={saving || departing} onClick={() => void save()} type="button">{copy("Save", "Guardar")}</button>
          <button className="min-h-11 rounded-[10px] border px-5 text-sm font-bold disabled:opacity-60" disabled={saving || departing} onClick={() => void leave(`/briefcase/${encodeURIComponent(itemId)}`)} type="button">{copy("Save and leave", "Guardar y salir")}</button>
          <button className="min-h-11 rounded-[10px] bg-[#C2350A] px-5 text-sm font-bold text-white disabled:opacity-60" disabled={saving || departing || routeChanged} onClick={() => void continueForward()} type="button">{saving ? copy("Saving...", "Guardando...") : !screen || index === screens.length - 1 ? editingFromReview ? copy("Save and return to review", "Guardar y volver a la revisión") : copy("Review packet facts", "Revisar los datos del paquete") : copy("Save and continue", "Guardar y continuar")}</button>
        </div>
      </div>
      <button className="mt-5 min-h-11 text-sm font-semibold text-[#08786F] underline disabled:opacity-60" disabled={saving || departing} type="button" onClick={() => void leave(`/briefcase/${encodeURIComponent(itemId)}`)}>{copy("Return to this matter", "Volver a este caso")}</button>
    </div>
  );
}
