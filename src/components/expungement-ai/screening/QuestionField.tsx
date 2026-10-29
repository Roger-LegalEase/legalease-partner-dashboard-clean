"use client";

/**
 * The question-type -> component mapping. This is the reusability key for the whole flow: the
 * `type` field on each profile question selects the input. One renderer handles all 51 states;
 * adding a new question type is a single case here, never a per-state component.
 *
 * Handles every type observed across the 51 consumer profiles:
 *   single_choice | multi_select | yes_no_unsure | yes_no_prefer_not_to_say
 *   text | text_or_unknown | date_or_unknown | number_or_range
 * An unsupported required type stays unresolved with an explicit recovery message.
 *
 * Accessibility: the prompt is a real heading, and exactly one heading on a
 * screen is an `<h1>`. On a screening screen that is the question itself. Inside
 * a packet-information section the page owns the `<h1>` ("Complete packet
 * information"), the section heading is an `<h2>` and each question below it is
 * an `<h3>`, which is what `headingLevel` selects. The naming relationships are
 * unchanged either way. Choice groups and inputs
 * are named by it via `aria-labelledby`, with the contextOnly note and error text linked via
 * `aria-describedby`. Errors use `role="alert"`.
 */
import { NyTransactionAssociationsField } from "@/components/expungement-ai/screening/fields/NyTransactionAssociationsField";
import { NY_TRANSACTION_ASSOCIATIONS_ID, NY_TRANSACTION_ASSOCIATIONS_VERSION } from "@/lib/expungement-ai/ny-16059-transaction-facts";
import { SealingHistoryField } from "@/components/expungement-ai/screening/fields/SealingHistoryField";
import { FutureApplicationsField } from "./fields/FutureApplicationsField";
import { NY_FUTURE_ID, NY_FUTURE_CONTRACT } from "@/lib/expungement-ai/ny-16059-future-applications";
import { NY_SEALING_HISTORY_ID, NY_SEALING_HISTORY_CONTRACT } from "@/lib/expungement-ai/ny-16059-sealing-history";
import { FilingContactFields } from "@/components/expungement-ai/screening/fields/FilingContactFields";
import { CA_CONTACT_IDS, CA_CONTACT_CONTRACT } from "@/lib/expungement-ai/ca-prop64-contact-answer";
import { caProp64Choice, isCaProp64ChoiceQuestion, CA_PROP64_CLARIFICATION_COPY } from "@/lib/expungement-ai/ca-prop64-choices";
import type { AnswerValue, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { SensitiveIdentifierField } from "@/components/expungement-ai/screening/fields/SensitiveIdentifierField";
import { CalendarDateField } from "@/components/expungement-ai/screening/fields/CalendarDateField";
import { exclusiveOptionsFor, hasIncompatibleAnswerShape, scalarAnswerText, normalizeQuestionChoices } from "@/lib/expungement-ai/question-answer-state";
import { readOrUnknown, type OrUnknownValue } from "@/components/expungement-ai/screening/answers";
import { ContextOnlyBanner } from "@/components/expungement-ai/screening/ContextOnlyBanner";
import { OptionGroup } from "@/components/expungement-ai/screening/fields/OptionGroup";
import { OptionalPathwayContextField } from "@/components/expungement-ai/screening/fields/OptionalPathwayContextField";
import { OrUnknownField } from "@/components/expungement-ai/screening/fields/OrUnknownField";
import { isCaProp64QuantityQuestion } from "@/lib/expungement-ai/ca-prop64-quantity";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { localizeProfileText } from "@/lib/expungement-ai/localization";
import { CourtCaseRecordsField } from "@/components/expungement-ai/screening/fields/CourtCaseRecordsField";
import { NY_CASE_RECONCILIATION_ID, NY_COURT_DIRECTION_CASES_ID, NY_COURT_DIRECTION_CONFIRMATION_ID, NY_FILING_CASE_ID } from "@/lib/expungement-ai/ny-16059-case-questions";
import { NY_CASE_RECORDS_ID, NY_CASE_RECORDS_CONTRACT } from "@/lib/expungement-ai/ny-16059-case-records";

const YES_NO_UNSURE_OPTIONS = ["Yes", "No", "I am not sure"];
const YES_NO_PREFER_NOT_OPTIONS = ["Yes", "No", "Prefer not to say"];

export function QuestionField({
  question,
  stateCode,
  value: savedValue,
  onChange,
  error,
  headingLevel = 1,
  sensitiveInputAllowed = true,
  caJuvenilePreparation = false
}: {
  question: ProfileQuestion;
  stateCode: string;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  error?: string | null;
  /** 1 when the question is the screen's own heading, 3 when it sits under a section heading. */
  headingLevel?: 1 | 2 | 3;
  sensitiveInputAllowed?: boolean;
  caJuvenilePreparation?: boolean;
}) {
  const { locale, t: translate, text: localizeText } = useLocalization();
  const fieldId = `q-${question.id}`;
  const promptId = `${fieldId}-prompt`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const contextId = question.contextOnly ? `${fieldId}-context` : undefined;
  const helperId = question.helperText ? `${fieldId}-helper` : undefined;
  const incompatibleShape = hasIncompatibleAnswerShape(question, savedValue);
  const shapeId = incompatibleShape || question.savedAnswerNeedsClarification ? `${fieldId}-saved-shape` : undefined;
  // Keep the original in the owner draft; an unsupported shape is never coerced
  // into a guessed value or allowed to disable the replacement control.
  const value = incompatibleShape ? undefined : savedValue;
  const legacyId = stateCode === "CA" && question.legacyAnswerText !== undefined
    && (question.answerContract === "ca_prop64_record_fact_v1" || question.id === "sentence_completion_date" && question.type === "yes_no_unsure") ? `${fieldId}-legacy` : undefined;
  const describedBy = [contextId, helperId, legacyId, shapeId, errorId].filter(Boolean).join(" ") || undefined;
  const optional = question.contextOnly || !question.required;
  const promptText =
    locale === "es" && question.translations?.es?.prompt
      ? question.translations.es.prompt
      : localizeProfileText(locale, question.prompt, { state: stateCode, questionId: question.id, part: "prompt", stage: question.stage });
  const helperText =
    locale === "es" && question.translations?.es?.helperText
      ? question.translations.es.helperText
      : question.helperText
        ? localizeProfileText(locale, question.helperText, { state: stateCode, questionId: question.id, part: "helper", stage: question.stage })
        : "";

  const heading = (
    <PromptHeading
      id={promptId}
      prompt={promptText}
      optional={optional}
      contextOnly={question.contextOnly}
      optionalLabel={translate("common.optional", "Optional")}
      headingLevel={headingLevel}
    />
  );
  const offersUncertainty = question.type.endsWith("_or_unknown") || question.type === "number_or_range"
    || question.type === "yes_no_unsure" || question.options?.includes("I am not sure");
  const savedChoice = savedValue && typeof savedValue === "object" && !Array.isArray(savedValue) && savedValue.unknown === true ? null : scalarAnswerText(savedValue);
  const bannerNode = <>
    {stateCode === "NY" && [NY_CASE_RECONCILIATION_ID, NY_COURT_DIRECTION_CONFIRMATION_ID, NY_FILING_CASE_ID].includes(question.id) && savedChoice && !question.options?.includes(savedChoice) ? <p role="status" className="rounded border border-amber-300 p-3 text-sm">{locale === "es" ? "La selección anterior ya no coincide con la lista actual de casos. Revísela y vuelva a elegir. La respuesta anterior permanece guardada hasta que guarde el cambio." : "The earlier choice no longer matches the current case list. Review it and choose again. The earlier answer stays saved until you save the change."}</p> : null}

    {question.contextOnly ? <ContextOnlyBanner id={contextId} /> : null}
    {shapeId ? <p id={shapeId} role="status" data-saved-answer-clarification className="rounded border border-amber-300 p-3 text-sm">
      {locale === "es"
        ? "Una respuesta anterior no se puede mostrar aquí. Consulte sus documentos antes de reemplazarla. Ver esta página no cambia esa respuesta."
        : "An earlier answer cannot be displayed here. Check your records before replacing it. Viewing this page does not change that answer."}
      {offersUncertainty ? locale === "es"
        ? " Si no puede confirmar la respuesta, puede elegir la opción para indicar que no lo sabe."
        : " If you cannot confirm the answer, you can choose the unsure option." : null}
    </p> : null}
  </>;
  // TODO(save-and-resume): PR 3 attaches the save affordance near readiness helper copy.
  const helperClass = `text-[13.5px] leading-6 text-[#5A6275]${["CO", "AL", "GA", "NY", "MD"].includes(stateCode) && question.id === "state_exclusion_categories" ? " whitespace-pre-line" : ""}`;
  // Keep the four adopted AL lists separate; their source headings delimit the reviewed copy.
  const alExclusionSections = stateCode === "AL" && question.id === "state_exclusion_categories"
    ? helperText.split(/\n\n(?=[^\n]+ — (?:Alabama Code|Código de Alabama|49 CFR))/) : [];
  const helperNode = question.helperText ? (
    alExclusionSections.length === 6 && alExclusionSections.slice(1, 5).every(section => section.includes(". ")) ? <>
      <p id={helperId} className={helperClass}>{alExclusionSections[0]}</p>
      {alExclusionSections.slice(1, 5).map(section => {
        const headingEnd = section.indexOf(". ") + 1;
        return <details key={section.slice(0, headingEnd)}>
          <summary>{alExclusionSections[0].split(",")[0]} — {section.slice(0, headingEnd)}</summary>
          <p className={helperClass}>{section.slice(headingEnd).trimStart()}</p>
        </details>;
      })}
      <p className={helperClass}>{alExclusionSections[5]}</p>
    </> : <p id={helperId} className={helperClass}>{helperText}</p>
  ) : null;
  const errorNode = error ? (
    <p id={errorId} role="alert" className="text-[13px] font-semibold text-[#C2410C]">
      {localizeText(error)}
    </p>
  ) : null;

  if (question.id === "social_security_number") return <div className="grid gap-3">
    {heading}{helperNode}{bannerNode}
    {sensitiveInputAllowed ? <SensitiveIdentifierField id={fieldId} value={scalarAnswerText(value) ?? ""} onChange={onChange} ariaLabelledBy={promptId} ariaDescribedBy={describedBy} invalid={Boolean(error)} />
      : <p role="status" className="rounded border border-amber-300 p-3 text-sm">{locale === "es" ? "Antes de ingresar un número de Seguro Social, indique el método de entrega aprobado por el tribunal y quién lo confirmó y cuándo. Puede guardar los demás datos mientras obtiene esa confirmación." : "Before entering a Social Security number, provide the court-approved delivery method and who confirmed it and when. You can save other details while obtaining that confirmation."}</p>}
    {errorNode}
  </div>;

  switch (question.type) {
    case "filing_contact":
      if (stateCode !== "CA" || !CA_CONTACT_IDS.includes(question.id) || question.answerContract !== CA_CONTACT_CONTRACT || !question.contactContext) return <MalformedQuestion prompt={promptText} headingLevel={headingLevel} required={!optional} />;
      return <div className="grid gap-3">{heading}{helperNode}{bannerNode}<FilingContactFields caJuvenilePreparation={caJuvenilePreparation} id={fieldId} factId={question.id} value={savedValue} context={question.contactContext} onChange={onChange} ariaLabelledBy={promptId} ariaDescribedBy={describedBy} />{errorNode}</div>;
    case "future_applications":
      if (stateCode !== "NY" || question.id !== NY_FUTURE_ID || question.answerContract !== NY_FUTURE_CONTRACT) return <MalformedQuestion prompt={promptText} headingLevel={headingLevel} required={!optional} />;
      return <div className="grid gap-3">{heading}{helperNode}{bannerNode}<FutureApplicationsField id={fieldId} value={savedValue} references={question.futureApplicationReferences} onChange={onChange} ariaLabelledBy={promptId} ariaDescribedBy={describedBy} />{errorNode}</div>;
    case "sealing_history":
      if (stateCode !== "NY" || question.id !== NY_SEALING_HISTORY_ID || question.answerContract !== NY_SEALING_HISTORY_CONTRACT) return <MalformedQuestion prompt={promptText} headingLevel={headingLevel} required={!optional} />;
      return <div className="grid gap-3">{heading}{helperNode}{bannerNode}<SealingHistoryField id={fieldId} value={savedValue} knownPriorApplication={question.prior16058ApplicationKnown} onChange={onChange} ariaLabelledBy={promptId} ariaDescribedBy={describedBy} />{errorNode}</div>;
    case "transaction_associations":
      if (stateCode !== "NY" || question.id !== NY_TRANSACTION_ASSOCIATIONS_ID || question.answerContract !== NY_TRANSACTION_ASSOCIATIONS_VERSION) return <MalformedQuestion prompt={promptText} headingLevel={headingLevel} required={!optional} />;
      return <div className="grid gap-3">{heading}{helperNode}{bannerNode}<NyTransactionAssociationsField id={fieldId} value={savedValue} caseRecords={question.transactionCaseRecords} onChange={onChange} aria-labelledby={promptId} aria-describedby={describedBy} />{errorNode}</div>;
    case "court_case_records":
      if (stateCode !== "NY" || question.id !== NY_CASE_RECORDS_ID || question.answerContract !== NY_CASE_RECORDS_CONTRACT) return <MalformedQuestion prompt={promptText} headingLevel={headingLevel} required={!optional} />;
      return <div className="grid gap-3">{heading}{helperNode}{bannerNode}
        <CourtCaseRecordsField id={fieldId} value={savedValue} onChange={onChange}
          firstCaseNumbers={question.caseRecordReferences?.firstCaseNumbers} additionalCaseNumbers={question.caseRecordReferences?.additionalCaseNumbers}
          ariaLabelledBy={promptId} ariaDescribedBy={describedBy} />{errorNode}
      </div>;
    case "single_choice":
    case "yes_no_unsure":
    case "yes_no_prefer_not_to_say": {
      const options =
        question.type === "yes_no_unsure"
          ? YES_NO_UNSURE_OPTIONS
          : question.type === "yes_no_prefer_not_to_say"
            ? YES_NO_PREFER_NOT_OPTIONS
            : normalizeQuestionChoices(question.options).options ?? [];

      if (options.length === 0) return <MalformedQuestion prompt={promptText} headingLevel={headingLevel} required={!optional} />;
      const caChoice = stateCode === "CA" && isCaProp64ChoiceQuestion(question);
      const normalized = caChoice ? caProp64Choice(question.id, value) : null;
      const unrecognized = caChoice && value !== undefined && value !== null && value !== "" && normalized === null;
      const caCopy = (key: keyof typeof CA_PROP64_CLARIFICATION_COPY) => CA_PROP64_CLARIFICATION_COPY[key][locale];
      const ChoiceField = question.id === "possible_pathway_context" && question.contextOnly === true && question.required === false
        ? OptionalPathwayContextField : OptionGroup;

      return (
        <div className="grid gap-3">
          {heading}
          {helperNode}
          {bannerNode}
          {legacyId ? <p id={legacyId} role="status" data-ca-prop64-legacy-completion-answer className="whitespace-pre-wrap break-words rounded border border-amber-300 p-3 text-sm">
            {CA_PROP64_CLARIFICATION_COPY.saved_answer_label[locale]}: {question.legacyAnswerText}
          </p> : null}
          {unrecognized ? <div className="rounded border border-amber-300 p-3 text-sm" role="status" data-ca-prop64-legacy-answer>
            <p className="font-semibold">{caCopy("legacy_heading")}</p>
            <p className="mt-2">{caCopy("legacy_explanation")}</p>
            <p className="mt-2 whitespace-pre-wrap break-words">{caCopy("saved_answer_label")}: {typeof value === "string" ? value : JSON.stringify(value)}</p>
            <p className="mt-2">{caCopy("ambiguous_scope")}</p>
          </div> : null}
          <ChoiceField
            key={stateCode}
            mode="single"
            name={fieldId}
            options={options}
            optionDisplay={question.optionDisplay}
            questionId={question.id}
            stateCode={stateCode}
            value={caChoice ? normalized ?? "" : typeof value === "boolean" ? value ? "Yes" : "No"
              : value && typeof value === "object" && "unknown" in value && value.unknown ? "" : scalarAnswerText(value) ?? ""}
            onChange={(next) => onChange(next)}
            ariaLabelledBy={promptId}
            ariaDescribedBy={describedBy}
            invalid={Boolean(error)}
          />
          {errorNode}
        </div>
      );
    }

    case "multi_select": {
      const options = normalizeQuestionChoices(question.options).options ?? [];
      const awaitingCases = stateCode === "NY" && question.id === NY_COURT_DIRECTION_CASES_ID && question.awaitingNyCaseRecords === true
        && !question.answerContract && Array.isArray(question.options) && question.options.length === 0
        && question.optionDisplay && typeof question.optionDisplay === "object" && !Array.isArray(question.optionDisplay) && Object.keys(question.optionDisplay).length === 0
        && (savedValue === undefined || savedValue === null || savedValue === "" || Array.isArray(savedValue) && savedValue.length === 0);
      if (awaitingCases) return <div className="grid gap-3">
        {heading}{helperNode}{bannerNode}
        <p role="status">{locale === "es"
          ? "Primero agregue los casos en «Revise cada caso judicial incluido en esta solicitud». Después seleccione los casos a los que se refiere la instrucción o explicación."
          : "First add the court cases in ‘Review each court case covered by this application.’ Then select the cases this instruction or explanation concerns."}</p>
        {errorNode}
      </div>;
      if (options.length === 0) return <MalformedQuestion prompt={promptText} headingLevel={headingLevel} required={!optional} />;

      return (
        <div className="grid gap-3">
          {heading}
          {helperNode}
          {bannerNode}
          <OptionGroup
            mode="multi"
            exclusiveOptions={exclusiveOptionsFor(question)}
            name={fieldId}
            options={options}
            optionDisplay={question.optionDisplay}
            questionId={question.id}
            stateCode={stateCode}
            value={Array.isArray(value) ? value : []}
            onChange={(next) => onChange(next)}
            ariaLabelledBy={promptId}
            ariaDescribedBy={describedBy}
            invalid={Boolean(error)}
          />
          {errorNode}
        </div>
      );
    }

    case "text":
    case "textarea":
      return (
        <div className="grid gap-3">
          {heading}
          {helperNode}
          {bannerNode}
          {question.multiline || question.type === "textarea" ? <textarea
            id={fieldId}
            rows={6}
            className="min-h-[144px] w-full resize-y rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-4 py-3 text-[15.5px] text-[#0B1320] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]"
            value={scalarAnswerText(value) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            aria-labelledby={promptId}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error) || undefined}
          /> : <input
            id={fieldId}
            className="min-h-[48px] rounded-xl border-[1.5px] border-[#E4E8EF] bg-white px-4 text-[15.5px] text-[#0B1320] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D]"
            type="text"
            value={scalarAnswerText(value) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            aria-labelledby={promptId}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error) || undefined}
          />}
          {errorNode}
        </div>
      );

    case "text_or_unknown":
    case "number_or_range": {
      const config = OR_UNKNOWN_CONFIG[question.type as keyof typeof OR_UNKNOWN_CONFIG];
      return (
        <div className="grid gap-3">
          {heading}
          {helperNode}
          {bannerNode}
          {legacyId ? <div id={legacyId} role="status" data-ca-prop64-legacy-record-answer className="rounded border border-amber-300 p-3 text-sm">
            <p>{localizeText("Review the court and charge details for this case before continuing.")}</p>
            <p className="mt-2 whitespace-pre-wrap break-words">{CA_PROP64_CLARIFICATION_COPY.saved_answer_label[locale]}: {question.legacyAnswerText}</p>
          </div> : null}
          <OrUnknownField
            id={fieldId}
            inputType={config.inputType}
            decimal={isCaProp64QuantityQuestion(question)}
            multiline={question.multiline}
            unknownLabel={translate(config.unknownKey, config.unknownLabel)}
            placeholder={config.placeholder}
            value={readOrUnknown(value)}
            onChange={(next: OrUnknownValue) => onChange(next)}
            ariaLabelledBy={promptId}
            ariaDescribedBy={describedBy}
            invalid={Boolean(error)}
          />
          {errorNode}
        </div>
      );
    }

    case "date":
    case "date_or_unknown": {
      return (
        <div className="grid gap-3">
          {heading}
          {helperNode}
          {bannerNode}
          <CalendarDateField
            id={fieldId}
            value={readOrUnknown(value)}
            unknownLabel={question.type === "date_or_unknown" ? translate("answer.dont_know_date", "I don't know the date") : undefined}
            birthDate={question.id === "date_of_birth"}
            onChange={(next: OrUnknownValue) => onChange(question.type === "date" ? next.value ?? "" : next)}
            ariaLabelledBy={promptId}
            ariaDescribedBy={describedBy}
            invalid={Boolean(error)}
          />
          {stateCode === "DE" && question.id === "release_date" && question.type === "date_or_unknown"
            && question.required === false && question.clearEarlierReleaseDate === true ? (
              <button type="button" className="min-h-[44px] rounded border px-3 py-2 text-left font-semibold underline focus-visible:outline focus-visible:outline-2"
                data-de-clear-earlier-release-date onClick={() => onChange({ value: "", unknown: false })}>
                {locale === "es" ? "Borrar la fecha anterior de puesta en libertad" : "Clear earlier release date"}
              </button>
            ) : null}
          {errorNode}
        </div>
      );
    }

    default:
      // A required unsupported control stays unresolved; never promise an uncreated review task.
      return <MalformedQuestion prompt={promptText} headingLevel={headingLevel} required={!optional} />;
  }
}

const OR_UNKNOWN_CONFIG = {
  text_or_unknown: { inputType: "text" as const, unknownLabel: "I'm not sure", unknownKey: "answer.not_sure", placeholder: undefined },
  number_or_range: { inputType: "number" as const, unknownLabel: "I'm not sure", unknownKey: "answer.not_sure", placeholder: undefined }
};

function PromptHeading({
  id,
  prompt,
  optional,
  contextOnly,
  optionalLabel,
  headingLevel
}: {
  id: string;
  prompt: string;
  optional: boolean;
  contextOnly: boolean;
  optionalLabel: string;
  headingLevel: 1 | 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : headingLevel === 2 ? "h2" : "h1";
  const className = headingLevel === 1
    ? "text-[19px] font-extrabold leading-[1.3] text-[#0B1320] md:text-[22px]"
    : "text-[16px] font-extrabold leading-[1.35] text-[#0B1320] md:text-[17px]";
  return (
    <Heading id={id} className={className}>
      {prompt}
      {optional && !contextOnly ? (
        <span className="ml-2 align-middle text-xs font-bold uppercase tracking-[0.06em] text-[#5A6275]">{optionalLabel}</span>
      ) : null}
    </Heading>
  );
}

function MalformedQuestion({ prompt, headingLevel, required }: { prompt: string; headingLevel: 1 | 2 | 3; required: boolean }) {
  const Heading = headingLevel === 3 ? "h3" : headingLevel === 2 ? "h2" : "h1";
  const { t: translate } = useLocalization();
  return (
    <div className="grid gap-2">
      <Heading className="text-[19px] font-extrabold leading-[1.3] text-[#0B1320] md:text-[22px]">{prompt}</Heading>
      <p className="rounded-xl border border-[#F4D9C7] bg-[#FDF1E8] px-4 py-3 text-[13px] leading-6 text-[#9A3412]">
        {required
          ? translate("screening.question_unavailable_required", "We could not show this required question. Save your progress and try again. This detail is still needed before verification.")
          : translate("screening.question_unavailable_optional", "We could not show this optional question. You can continue without answering it.")}
      </p>
    </div>
  );
}
