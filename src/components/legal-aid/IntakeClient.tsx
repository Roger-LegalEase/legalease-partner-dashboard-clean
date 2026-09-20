"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  INTAKE_FIELDS, INTAKE_SECTIONS, applicableStatements, fieldApplies, type IntakeAnswers, type IntakeFieldSpec, type IntakeSectionKey, type IntakeValidation, type StatementKey
} from "@/lib/legal-aid/intake-schema";
import type { IntakeDocument, IntakeSignatureSummary, ParticipantIntakeView } from "@/lib/legal-aid/types";
import { Panel, laInput, laPrimary, laSecondary } from "./LegalAidShell";
import { SignaturePad } from "./SignaturePad";

// The confidential intake. Answers autosave to the server (never to browser
// storage); the Social Security number goes through its own protected call
// and is only ever shown masked; statements are signed by the applicant
// against the exact answers on screen; submission is a separate, explicit act.

type Props = {
  eventId: string;
  eventSlug: string;
  clinicLabel: string;
  partnerName: string;
  applicantName: string;
  registrationEmail: string | null;
  registrationPhone: string | null;
  initial: ParticipantIntakeView | null;
};

type StepKey = Exclude<IntakeSectionKey, "clinic"> | "protected";

const STEPS: { key: StepKey; title: string; intro: string }[] = [
  ...INTAKE_SECTIONS.filter((section) => section.key !== "clinic" && section.key !== "attestations").flatMap((section) =>
    section.key === "personal"
      ? [{ key: "personal" as StepKey, title: section.title, intro: section.intro }, { key: "protected" as StepKey, title: "Protected information", intro: "One number the court filing needs. It is stored encrypted and only the clinic attorney or coordinator on your case can see it." }]
      : [{ key: section.key as StepKey, title: section.title, intro: section.intro }]
  ),
  { key: "attestations", title: "Review and sign", intro: INTAKE_SECTIONS.find((section) => section.key === "attestations")?.intro ?? "" }
];

const EDITABLE = new Set(["draft", "needs_information"]);

export function IntakeClient(props: Props) {
  const [view, setView] = useState<ParticipantIntakeView | null>(props.initial);
  const [answers, setAnswers] = useState<IntakeAnswers>(() => props.initial?.answers ?? prefill(props));
  const [version, setVersion] = useState<number | null>(props.initial?.currentVersion ?? null);
  const [intakeId, setIntakeId] = useState<string | null>(props.initial?.id ?? null);
  const [validation, setValidation] = useState<IntakeValidation | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved" | "conflict" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ tone: "ok" | "warn"; text: string; missing?: string[] } | null>(null);
  const dirtyRef = useRef(false);
  const answersRef = useRef(answers);
  const versionRef = useRef(version);
  const intakeIdRef = useRef(intakeId);
  const inFlight = useRef<Promise<string | null> | null>(null);

  const editable = !view || EDITABLE.has(view.status);
  const current = STEPS[step];

  const save = useCallback(async (): Promise<string | null> => {
    if (inFlight.current) return inFlight.current;
    const run = (async () => {
      setSaveState("saving");
      setSaveError("");
      dirtyRef.current = false;
      try {
        const legalMatter = answersRef.current.legal_matter?.state === "answered" ? String(answersRef.current.legal_matter.value ?? "") : null;
        const response = await fetch("/api/legal-aid/intakes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId: props.eventId, answers: answersRef.current, expectedVersion: versionRef.current, legalMatter }) });
        const body = await response.json().catch(() => ({})) as { success?: boolean; outcome?: string; intakeId?: string | null; version?: number | null; validation?: IntakeValidation; error?: string };
        if (!response.ok) {
          if (body.outcome === "version_conflict") setSaveState("conflict");
          else { setSaveState("error"); setSaveError(body.error ?? "Your answers could not be saved."); }
          return null;
        }
        if (body.intakeId) { setIntakeId(body.intakeId); intakeIdRef.current = body.intakeId; }
        if (typeof body.version === "number") { setVersion(body.version); versionRef.current = body.version; }
        if (body.validation) setValidation(body.validation);
        setSaveState(dirtyRef.current ? "dirty" : "saved");
        return body.intakeId ?? null;
      } catch {
        setSaveState("error");
        setSaveError("Your answers could not be saved. Check your connection; nothing on this screen was lost.");
        return null;
      } finally {
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
  }, [props.eventId]);

  // Debounced autosave whenever an answer changes.
  useEffect(() => {
    if (!editable || saveState !== "dirty") return;
    const timer = window.setTimeout(() => { void save(); }, 1200);
    return () => window.clearTimeout(timer);
  }, [answers, editable, saveState, save]);

  const reload = useCallback(async (id: string | null = intakeIdRef.current) => {
    if (!id) return;
    const response = await fetch(`/api/legal-aid/intakes/${id}`, { cache: "no-store" });
    if (!response.ok) return;
    const body = await response.json() as { intake?: ParticipantIntakeView };
    if (body.intake) { setView(body.intake); setVersion(body.intake.currentVersion); versionRef.current = body.intake.currentVersion; }
  }, []);

  function setAnswer(key: string, answer: IntakeAnswers[string] | null) {
    const next = { ...answersRef.current };
    if (answer === null) delete next[key]; else next[key] = answer;
    answersRef.current = next;
    setAnswers(next);
    dirtyRef.current = true;
    setSaveState("dirty");
  }

  async function ensureIntake(): Promise<string | null> {
    if (intakeId && saveState !== "dirty") return intakeId;
    return save();
  }

  async function goTo(index: number) {
    setShowErrors(true);
    if (dirtyRef.current || saveState === "dirty") await save();
    const target = Math.max(0, Math.min(STEPS.length - 1, index));
    // The signing step shows which signatures still match the saved answers, so it always reads the server's view.
    if (STEPS[target].key === "attestations") await reload();
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setSubmitMessage(null);
    const id = await ensureIntake();
    if (!id) return;
    const response = await fetch(`/api/legal-aid/intakes/${id}/actions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "submit" }) });
    const body = await response.json().catch(() => ({})) as { outcome?: string; error?: string; missing?: string[]; statementKey?: string };
    if (response.ok) { setSubmitMessage({ tone: "ok", text: "Your application has been received." }); await reload(); return; }
    setShowErrors(true);
    setSubmitMessage({ tone: "warn", text: body.error ?? "The application could not be submitted.", missing: (body.missing ?? []).map(labelFor) });
    if (body.outcome === "ssn_required") setStep(STEPS.findIndex((entry) => entry.key === "protected"));
    else if (body.outcome === "validation_failed" && body.missing?.length) setStep(stepIndexForField(body.missing[0]));
  }

  async function withdraw() {
    if (!intakeId || !window.confirm("Withdraw this application? The clinic team will stop reviewing it.")) return;
    const response = await fetch(`/api/legal-aid/intakes/${intakeId}/actions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "withdraw" }) });
    if (response.ok) await reload();
  }

  if (view && !editable) return <SubmittedView view={view} partnerName={props.partnerName} clinicLabel={props.clinicLabel} onWithdraw={withdraw} onReload={reload} />;

  const errors = validation?.errors ?? {};
  const progress = validation ? Math.round((validation.answeredCount / Math.max(1, validation.applicableCount)) * 100) : 0;

  return (
    <div className="space-y-5">
      {view?.status === "needs_information" && view.openRequests.length > 0 ? (
        <Panel tone="warn" eyebrow="The clinic team needs more from you" title="Please update your application">
          <ul className="list-disc space-y-1 pl-5 text-sm">{view.openRequests.map((request) => <li key={request.id}>{request.requestText}</li>)}</ul>
          <p className="mt-3 text-sm text-[#5B4E66]">Make the changes, sign again where asked, and submit again.</p>
        </Panel>
      ) : null}

      <nav aria-label="Application steps" className="rounded-2xl border border-[#E8E1EE] bg-white p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-bold">Step {step + 1} of {STEPS.length}: {current.title}</span>
          <SaveBadge state={saveState} />
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#F1ECF4]"><div className="h-2 rounded-full bg-[var(--la-brand)] transition-all" style={{ width: `${progress}%` }} /></div>
        <ol className="mt-3 flex flex-wrap gap-1">
          {STEPS.map((entry, index) => <li key={entry.key}><button type="button" onClick={() => void goTo(index)} className={`rounded-full px-3 py-1 text-xs font-bold ${index === step ? "bg-[var(--la-brand)] text-white" : "bg-[#F1ECF4] text-[#5B4E66] hover:bg-[var(--la-soft)]"}`}>{index + 1}. {entry.title}</button></li>)}
        </ol>
      </nav>

      {saveState === "conflict" ? <Panel tone="warn"><p className="text-sm font-semibold">Your application was updated somewhere else (another tab or device). <button type="button" className="underline" onClick={() => window.location.reload()}>Reload to see the latest answers.</button></p></Panel> : null}
      {saveState === "error" ? <Panel tone="warn"><p className="text-sm font-semibold">{saveError} <button type="button" className="underline" onClick={() => void save()}>Try saving again.</button></p></Panel> : null}

      <Panel eyebrow={props.clinicLabel} title={current.title}>
        <p className="text-sm leading-6 text-[#5B4E66]">{current.intro}</p>
        {step === 0 ? <p className="mt-3 rounded-md bg-[var(--la-soft)] p-3 text-sm">Your clinic: <strong>{props.clinicLabel}</strong>. It comes from your registration.</p> : null}

        {current.key === "protected" ? (
          <ProtectedStep intakeId={intakeId} ssnHint={view?.ssnHint ?? null} ensureIntake={ensureIntake} onSaved={(hint) => setView((previous) => previous ? { ...previous, ssnHint: hint } : previous)} />
        ) : current.key === "attestations" ? (
          <AttestationStep answers={answers} signatures={view?.signatures ?? []} intakeId={intakeId} applicantName={props.applicantName} ensureIntake={ensureIntake} onSigned={reload} validation={validation} onJump={(key) => void goTo(stepIndexForField(key))} />
        ) : (
          <div className="mt-5 space-y-5">
            {INTAKE_FIELDS.filter((field) => field.section === current.key && field.control !== "restricted_ssn" && field.product.requirement !== "derived").map((field) => (
              fieldApplies(field, answers) ? <FieldInput key={field.key} field={field} answer={answers[field.key]} error={showErrors ? errors[field.key] : undefined} onChange={(answer) => setAnswer(field.key, answer)} /> : null
            ))}
          </div>
        )}

        {current.key === "attestations" && intakeId ? <DocumentsBlock intakeId={intakeId} documents={view?.documents ?? []} onChanged={reload} /> : null}

        {submitMessage ? (
          <div role="alert" className={`mt-5 rounded-md border p-3 text-sm ${submitMessage.tone === "ok" ? "border-[#BFE3CF] bg-[#F0FBF4]" : "border-[#E6C9A8] bg-[#FFF8EE]"}`}>
            <p className="font-bold">{submitMessage.text}</p>
            {submitMessage.missing?.length ? <ul className="mt-2 list-disc pl-5">{submitMessage.missing.map((label) => <li key={label}>{label}</li>)}</ul> : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {step > 0 ? <button type="button" onClick={() => void goTo(step - 1)} className={laSecondary}>Back</button> : null}
          {step < STEPS.length - 1 ? <button type="button" onClick={() => void goTo(step + 1)} className={laPrimary}>Save and continue</button> : <button type="button" onClick={() => void submit()} className={laPrimary}>Submit my application</button>}
          <span className="text-xs text-[#5B4E66]">You can leave and come back; your answers are saved on the server, not on this device.</span>
        </div>
      </Panel>

      {intakeId ? <p className="text-xs text-[#7A6E85]"><button type="button" onClick={() => void withdraw()} className="underline">Withdraw this application</button> · <Link href={`/clinic/${props.eventSlug}/register`} className="underline">Registration details</Link></p> : null}
    </div>
  );
}

/** The masked form of the protected number: only its last four digits are ever held outside the encrypted field. */
export function maskHint(lastFour: string): string {
  return `•••-••-${lastFour}`;
}

function prefill(props: Props): IntakeAnswers {
  const answers: IntakeAnswers = {};
  if (props.registrationEmail) answers.email = { state: "answered", value: props.registrationEmail };
  if (props.registrationPhone) answers.phone = { state: "answered", value: props.registrationPhone };
  return answers;
}

function labelFor(key: string): string {
  return INTAKE_FIELDS.find((field) => field.key === key)?.label ?? key;
}

function stepIndexForField(key: string): number {
  const field = INTAKE_FIELDS.find((entry) => entry.key === key);
  if (!field) return 0;
  if (field.control === "restricted_ssn") return STEPS.findIndex((entry) => entry.key === "protected");
  return Math.max(0, STEPS.findIndex((entry) => entry.key === field.section));
}

function SaveBadge({ state }: { state: string }) {
  const text = state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "dirty" ? "Unsaved changes" : state === "error" ? "Not saved" : state === "conflict" ? "Needs reload" : "";
  return <span aria-live="polite" className={`text-xs font-bold ${state === "error" || state === "conflict" ? "text-[#8A1F1F]" : "text-[#5B4E66]"}`}>{text}</span>;
}

function FieldInput({ field, answer, error, onChange }: { field: IntakeFieldSpec; answer: IntakeAnswers[string] | undefined; error?: string; onChange: (answer: IntakeAnswers[string] | null) => void }) {
  const value = answer?.state === "answered" ? (Array.isArray(answer.value) ? answer.value.join(",") : answer.value ?? "") : "";
  const unknown = answer?.state === "unknown";
  const required = field.product.requirement === "required" || field.product.requirement === "conditional";
  const id = `f-${field.key.replace(/\W/g, "-")}`;
  const control = (() => {
    if (field.control === "radio") return (
      <div className="mt-2 grid gap-2 sm:grid-cols-3">{(field.options ?? []).map((option) => <label key={option.value} className="flex min-h-11 items-center gap-2 rounded-md border border-[#E8E1EE] bg-white px-3 text-sm"><input type="radio" name={field.key} value={option.value} checked={value === option.value} onChange={() => onChange({ state: "answered", value: option.value })} />{option.label}</label>)}</div>
    );
    if (field.control === "dropdown") return (
      <select id={id} className={laInput} value={value} onChange={(event) => onChange(event.target.value ? { state: "answered", value: event.target.value } : null)}><option value="">Choose…</option>{(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
    );
    if (field.control === "textarea") return <textarea id={id} rows={4} className={laInput} value={value} onChange={(event) => onChange(event.target.value ? { state: "answered", value: event.target.value } : null)} />;
    if (field.control === "money") return (
      <div>
        <div className="relative mt-2"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#5B4E66]">$</span><input id={id} inputMode="decimal" disabled={unknown} className={`${laInput} mt-0 pl-7`} value={value} placeholder="0" onChange={(event) => onChange(event.target.value.trim() ? { state: "answered", value: event.target.value.trim() } : null)} /></div>
        {field.product.allowUnknown ? <label className="mt-2 flex items-center gap-2 text-sm text-[#5B4E66]"><input id={`${id}-unknown`} type="checkbox" checked={unknown} onChange={(event) => onChange(event.target.checked ? { state: "unknown" } : null)} />I don&apos;t know this amount</label> : null}
      </div>
    );
    if (field.control === "count") return <input id={id} type="number" min={0} step={1} inputMode="numeric" className={laInput} value={value} onChange={(event) => onChange(event.target.value !== "" ? { state: "answered", value: event.target.value } : null)} />;
    const type = field.control === "date" ? "date" : field.control === "email" ? "email" : field.control === "phone" ? "tel" : "text";
    const autoComplete = field.key === "name.first" ? "given-name" : field.key === "name.last" ? "family-name" : field.key === "email" ? "email" : field.key === "phone" ? "tel" : field.key === "address.line1" ? "address-line1" : field.key === "address.line2" ? "address-line2" : field.key === "address.city" ? "address-level2" : field.key === "address.postal_code" ? "postal-code" : field.key === "date_of_birth" ? "bday" : "off";
    return <input id={id} type={type} autoComplete={autoComplete} className={laInput} value={value} onChange={(event) => onChange(event.target.value ? { state: "answered", value: event.target.value } : null)} />;
  })();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold">{field.label}{required ? <span className="text-[var(--la-brand)]"> *</span> : <span className="font-normal text-[#7A6E85]"> (optional)</span>}</label>
      {field.help ? <p className="mt-1 text-xs leading-5 text-[#5B4E66]">{field.help}</p> : null}
      {control}
      {error ? <p role="alert" className="mt-1 text-xs font-semibold text-[#8A1F1F]">{error}</p> : null}
    </div>
  );
}

function ProtectedStep({ intakeId, ssnHint, ensureIntake, onSaved }: { intakeId: string | null; ssnHint: string | null; ensureIntake: () => Promise<string | null>; onSaved: (hint: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hint, setHint] = useState(ssnHint);
  const [value, setValue] = useState("");
  const ssnField = INTAKE_FIELDS.find((field) => field.control === "restricted_ssn");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const id = intakeId ?? await ensureIntake();
      if (!id) { setMessage("Save your answers first, then enter this number."); return; }
      const response = await fetch(`/api/legal-aid/intakes/${id}/restricted`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ssn: value }) });
      const body = await response.json().catch(() => ({})) as { hint?: string; error?: string };
      if (!response.ok) { setMessage(body.error ?? "The number could not be saved."); return; }
      setHint(body.hint ?? null);
      if (body.hint) onSaved(body.hint);
      setValue("");
      setMessage("Saved. Only the masked number is shown from now on.");
    } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="mt-5 space-y-4" autoComplete="off">
      <p className="text-sm leading-6">{ssnField?.help}</p>
      {hint ? <p className="rounded-md bg-[var(--la-soft)] p-3 text-sm">On file: <strong>{maskHint(hint)}</strong>. Enter it again only if you need to correct it.</p> : null}
      <label className="block text-sm font-bold">Social Security number<span className="text-[var(--la-brand)]"> *</span>
        <input name="ssn" inputMode="numeric" autoComplete="off" spellCheck={false} className={laInput} value={value} onChange={(event) => setValue(event.target.value)} placeholder="###-##-####" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || value.replace(/\D/g, "").length !== 9} className={laPrimary}>{busy ? "Saving…" : hint ? "Replace the number on file" : "Save securely"}</button>
        {message ? <span role="status" className="text-sm font-semibold">{message}</span> : null}
      </div>
    </form>
  );
}

function AttestationStep({ answers, signatures, intakeId, applicantName, ensureIntake, onSigned, validation, onJump }: { answers: IntakeAnswers; signatures: IntakeSignatureSummary[]; intakeId: string | null; applicantName: string; ensureIntake: () => Promise<string | null>; onSigned: () => Promise<void>; validation: IntakeValidation | null; onJump: (fieldKey: string) => void }) {
  const statements = useMemo(() => applicableStatements(answers), [answers]);
  const missing = validation?.missingRequired ?? [];
  return (
    <div className="mt-5 space-y-5">
      {missing.length > 0 ? (
        <div className="rounded-md border border-[#E6C9A8] bg-[#FFF8EE] p-3 text-sm">
          <p className="font-bold">Before you sign, these answers are still needed:</p>
          <ul className="mt-2 list-disc pl-5">{missing.slice(0, 12).map((key) => <li key={key}><button type="button" className="underline" onClick={() => onJump(key)}>{labelFor(key)}</button></li>)}{missing.length > 12 ? <li>and {missing.length - 12} more</li> : null}</ul>
        </div>
      ) : null}
      {statements.map((statement) => {
        const current = signatures.find((signature) => signature.statementKey === statement.key && signature.status === "active" && signature.current);
        return <StatementCard key={statement.key} statementKey={statement.key} title={statement.title} text={statement.text} current={current ?? null} intakeId={intakeId} applicantName={applicantName} ensureIntake={ensureIntake} onSigned={onSigned} />;
      })}
      <p className="text-xs leading-5 text-[#5B4E66]">Each signature is tied to the statement&apos;s wording and to your answers at the moment you sign. If you change an answer afterwards, you will be asked to sign again.</p>
    </div>
  );
}

function StatementCard({ statementKey, title, text, current, intakeId, applicantName, ensureIntake, onSigned }: { statementKey: StatementKey; title: string; text: string; current: IntakeSignatureSummary | null; intakeId: string | null; applicantName: string; ensureIntake: () => Promise<string | null>; onSigned: () => Promise<void> }) {
  const [method, setMethod] = useState<"typed" | "drawn">("typed");
  const [name, setName] = useState(applicantName);
  const [drawn, setDrawn] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function sign() {
    setBusy(true);
    setError("");
    try {
      const id = intakeId ?? await ensureIntake();
      if (!id) { setError("Save your answers first."); return; }
      const response = await fetch(`/api/legal-aid/intakes/${id}/actions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "sign", statementKey, signerName: name, signatureMethod: method, signatureData: method === "drawn" ? drawn : null }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setError(body.error ?? "The signature could not be saved."); return; }
      await onSigned();
    } finally { setBusy(false); }
  }
  return (
    <div className="rounded-xl border border-[#E8E1EE] bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--la-brand)]">{title}</p>
      <blockquote className="mt-2 border-l-4 border-[var(--la-brand)] pl-3 text-sm leading-6">{text}</blockquote>
      {current ? (
        <p className="mt-3 rounded-md bg-[#F0FBF4] p-3 text-sm">Signed by <strong>{current.signerName}</strong> on {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(current.signedAt))} ({current.signatureMethod === "drawn" ? "drawn signature" : "typed signature"}).</p>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-bold">Your full legal name<input className={laInput} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
          <div className="flex gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={method === "typed"} onChange={() => setMethod("typed")} />Type my name as my signature</label>
            <label className="flex items-center gap-2"><input type="radio" checked={method === "drawn"} onChange={() => setMethod("drawn")} />Draw my signature</label>
          </div>
          {method === "drawn" ? <SignaturePad onChange={setDrawn} /> : <p className="rounded-md border border-dashed border-[#9C8AA8] bg-white px-3 py-4 font-serif text-2xl italic">{name || "Your name"}</p>}
          {error ? <p role="alert" className="text-sm font-semibold text-[#8A1F1F]">{error}</p> : null}
          <button type="button" onClick={() => void sign()} disabled={busy || name.trim().length < 2 || (method === "drawn" && !drawn)} className={laPrimary}>{busy ? "Signing…" : "Sign this statement"}</button>
        </div>
      )}
    </div>
  );
}

const CATEGORY_LABELS: Record<IntakeDocument["category"], string> = { identification: "Photo ID", court_record: "Court record or paperwork", income: "Proof of income or benefits", executed_document: "Signed document", other: "Other" };

export function DocumentsBlock({ intakeId, documents, onChanged, categories = ["identification", "court_record", "income", "other"] }: { intakeId: string; documents: IntakeDocument[]; onChanged: () => Promise<void>; categories?: IntakeDocument["category"][] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/legal-aid/intakes/${intakeId}/documents`, { method: "POST", body: data });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) { setMessage(body.error ?? "The file could not be uploaded."); return; }
      form.reset();
      setMessage("Uploaded.");
      await onChanged();
    } finally { setBusy(false); }
  }
  async function remove(documentId: string) {
    const response = await fetch(`/api/legal-aid/documents/${documentId}`, { method: "DELETE" });
    if (response.ok) await onChanged();
  }
  return (
    <div className="mt-6 border-t border-[#E8E1EE] pt-5">
      <h3 className="text-base font-black">Documents (optional)</h3>
      <p className="mt-1 text-sm leading-6 text-[#5B4E66]">Add a photo ID, court paperwork, or proof of income if you have them. PDF, JPEG, PNG or WebP, up to 20 MB each. Files are stored privately and only opened by the clinic team assigned to you.</p>
      <ul className="mt-3 divide-y divide-[#EEE8F2]">{documents.map((document) => <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span><strong>{CATEGORY_LABELS[document.category]}</strong> · {document.originalFilename} · {Math.max(1, Math.round(document.sizeBytes / 1024))} KB</span><span className="flex gap-3"><a href={`/api/legal-aid/documents/${document.id}`} target="_blank" rel="noreferrer" className="font-bold text-[var(--la-brand-dark)] underline">Open</a>{document.uploadedRole === "participant" ? <button type="button" onClick={() => void remove(document.id)} className="underline">Remove</button> : null}</span></li>)}</ul>
      <form onSubmit={upload} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-sm font-bold">Type<select name="category" className={laInput}>{categories.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label>
        <label className="block text-sm font-bold">File<input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required className={`${laInput} py-1.5`} /></label>
        <button type="submit" disabled={busy} className={laSecondary}>{busy ? "Uploading…" : "Upload"}</button>
      </form>
      {message ? <p role="status" className="mt-2 text-sm font-semibold">{message}</p> : null}
    </div>
  );
}

function SubmittedView({ view, partnerName, clinicLabel, onWithdraw, onReload }: { view: ParticipantIntakeView; partnerName: string; clinicLabel: string; onWithdraw: () => Promise<void>; onReload: () => Promise<void> }) {
  const headline = view.status === "submitted" ? "Your application has been received" : view.status === "staff_review" ? `${partnerName} is reviewing your application` : view.status === "approved" ? "You are approved for clinic services" : view.status === "declined_for_program" ? `${partnerName} could not accept this application` : view.status === "referred" ? "You have been referred to another resource" : "This application was withdrawn";
  const pending = view.nextSteps.filter((step) => step.status === "pending");
  return (
    <div className="space-y-5">
      <Panel tone="brand" eyebrow={clinicLabel} title={headline}>
        <p className="text-sm leading-6">{view.status === "submitted" || view.status === "staff_review" ? `You do not need to do anything else right now. ${partnerName} will contact you using the details on your registration.` : view.status === "approved" ? "Your next steps are listed below. Bring a photo ID to the clinic." : view.status === "withdrawn" ? "If you withdrew by mistake, register again or contact the clinic." : `${partnerName} will explain your options.`}</p>
        {view.submittedAt ? <p className="mt-2 text-xs text-[#5B4E66]">Submitted {new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" }).format(new Date(view.submittedAt))}.</p> : null}
      </Panel>
      {pending.length > 0 ? <Panel title="Your next steps"><ul className="list-disc space-y-2 pl-5 text-sm">{pending.map((step) => <li key={step.id}><strong>{step.title}</strong>{step.dueAt ? ` · by ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(step.dueAt))}` : ""}{step.detail ? <><br /><span className="text-[#5B4E66]">{step.detail}</span></> : null}</li>)}</ul></Panel> : null}
      {view.documentTasks.length > 0 ? <Panel title="Your documents"><ul className="divide-y divide-[#EEE8F2] text-sm">{view.documentTasks.map((task) => <li key={task.id} className="py-2"><strong>{task.title}</strong><br /><span className="text-[#5B4E66]">{taskCopy(task.status)}</span></li>)}</ul></Panel> : null}
      <Panel title="Your documents on file"><DocumentsBlock intakeId={view.id} documents={view.documents} onChanged={onReload} /></Panel>
      <Panel title="What you told us"><AnswerSummary answers={view.answers} /><p className="mt-3 text-xs text-[#5B4E66]">Protected number on file: {view.ssnHint ? maskHint(view.ssnHint) : "not provided"}.</p></Panel>
      {view.status !== "withdrawn" && view.status !== "approved" ? <p className="text-xs text-[#7A6E85]"><button type="button" onClick={() => void onWithdraw()} className="underline">Withdraw this application</button></p> : null}
    </div>
  );
}

function taskCopy(status: string): string {
  switch (status) {
    case "draft": return "Being prepared by the clinic team.";
    case "attorney_reviewed": return "Reviewed by the attorney. Not yet ready to sign.";
    case "ready_for_execution": return "Ready for you to sign at the clinic.";
    case "signature_or_notary_pending": return "Waiting for signature or notarization.";
    case "executed_copy_received": return "Signed copy received; the team is checking it.";
    case "execution_reviewed": return "Signed copy checked.";
    case "ready_to_file": return "Ready to file with the court.";
    case "filed": return "Filed with the court.";
    default: return status;
  }
}

export function AnswerSummary({ answers }: { answers: IntakeAnswers }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {INTAKE_FIELDS.filter((field) => field.control !== "restricted_ssn" && field.product.requirement !== "derived" && fieldApplies(field, answers)).map((field) => {
        const answer = answers[field.key];
        const display = !answer ? "—" : answer.state === "unknown" ? "I don't know" : answer.state === "not_applicable" ? "Not applicable" : Array.isArray(answer.value) ? answer.value.join(", ") : (field.options?.find((option) => option.value === answer.value)?.label ?? answer.value ?? "—");
        return <div key={field.key}><dt className="font-bold">{field.label}</dt><dd className="text-[#5B4E66]">{field.control === "money" && answer?.state === "answered" ? `$${display}` : display}</dd></div>;
      })}
    </dl>
  );
}
