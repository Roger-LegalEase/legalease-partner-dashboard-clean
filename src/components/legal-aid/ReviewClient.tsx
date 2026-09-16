"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { EligibilitySummary } from "@/lib/legal-aid/eligibility";
import type { DocumentTask, DocumentTaskStatus, StaffIntakeDetail } from "@/lib/legal-aid/types";
import { AnswerSummary, DocumentsBlock } from "./IntakeClient";
import { Panel, laInput, laPrimary, laSecondary } from "./LegalAidShell";

// The assigned staff view of one application. What a person can do here is
// decided by their approved event permissions on the server; the page only
// shows the controls that make sense for the permissions it was given.

type Detail = StaffIntakeDetail & { eligibility: EligibilitySummary | null };
type Staff = { eventStaffId: string; email: string; role: string; permissions: string[] };
type RenderJob = { id: string; status: string; outputSha256: string | null; createdAt: string };

const TASK_FLOW: DocumentTaskStatus[] = ["draft", "attorney_reviewed", "ready_for_execution", "signature_or_notary_pending", "executed_copy_received", "execution_reviewed", "ready_to_file", "filed"];
const TASK_LABELS: Record<DocumentTaskStatus, string> = {
  draft: "Draft", attorney_reviewed: "Attorney reviewed", ready_for_execution: "Ready for execution", signature_or_notary_pending: "Signature or notary pending",
  executed_copy_received: "Executed copy received", execution_reviewed: "Execution reviewed", ready_to_file: "Ready to file", filed: "Filed"
};
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft (not submitted)", submitted: "Submitted", needs_information: "Needs information", staff_review: "In review", approved: "Approved for program", declined_for_program: "Declined for program", referred: "Referred", withdrawn: "Withdrawn"
};

export function ReviewClient({ detail, staff, eventId }: { detail: Detail; staff: Staff[]; eventId: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const has = (permission: string) => detail.permissions.includes(permission);
  const canReview = has("coordinator") || has("intake_review") || has("program_review") || has("attorney");

  async function act(payload: Record<string, unknown>, success: string | ((body: Record<string, unknown>) => string)): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/legal-aid/staff/intakes/${detail.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) { setNotice(typeof body.error === "string" ? body.error : "The action was refused."); return null; }
      setNotice(typeof success === "function" ? success(body) : success);
      router.refresh();
      return body;
    } catch {
      setNotice("The action could not be completed.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div aria-live="polite" className={`min-h-6 rounded-md px-3 py-2 text-sm font-semibold ${notice ? "border border-[#DCC9B8] bg-[#FFF7ED] text-[#8A3C1F]" : "text-transparent"}`}>{notice || "No update"}</div>

      <Panel eyebrow={STATUS_LABELS[detail.status] ?? detail.status} title={detail.registration?.contactName ?? "Registered applicant"}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Item label="Registration">{detail.registration ? `${detail.registration.status}` : "none"}</Item>
          <Item label="Contact">{detail.registration ? [detail.registration.contactEmail, detail.registration.contactPhone].filter(Boolean).join(" · ") || "—" : "—"}{detail.registration?.preferredContact ? ` (prefers ${detail.registration.preferredContact})` : ""}</Item>
          <Item label="Legal matter">{detail.legalMatter?.replaceAll("_", " ") ?? "—"}</Item>
          <Item label="Submitted">{detail.submittedAt ? fmt(detail.submittedAt) : "not yet"}</Item>
          <Item label="Program decision">{detail.programDecision?.replaceAll("_", " ") ?? "none"}</Item>
          <Item label="Attorney review">{detail.attorneyReviewStatus.replaceAll("_", " ")}</Item>
          <Item label="Assistance needs">{detail.registration?.assistanceNeeds ?? "—"}</Item>
          <Item label="Your permissions">{detail.permissions.join(", ")}</Item>
        </dl>
        {detail.registration?.languagePreference ? <p className="mt-2 text-sm text-[#5B4E66]">Language: {detail.registration.languagePreference}</p> : null}
        {(has("coordinator") || has("export")) ? <ExternalReference detail={detail} busy={busy} act={act} /> : null}
      </Panel>

      {canReview ? (
        <Panel eyebrow="Review" title="Review actions">
          <div className="flex flex-wrap gap-2">
            {(detail.status === "submitted" || detail.status === "needs_information") && (has("coordinator") || has("intake_review") || has("program_review")) ? <button type="button" disabled={busy} onClick={() => void act({ action: "start_review" }, "Review started.")} className={laPrimary}>Start review</button> : null}
            {has("attorney") && detail.attorneyReviewStatus === "not_started" ? <button type="button" disabled={busy} onClick={() => void act({ action: "set_attorney_review", status: "assigned" }, "Attorney assigned.")} className={laSecondary}>Take attorney assignment</button> : null}
            {has("attorney") && detail.attorneyReviewStatus === "assigned" ? <button type="button" disabled={busy} onClick={() => void act({ action: "set_attorney_review", status: "in_review" }, "Attorney review in progress.")} className={laSecondary}>Begin attorney review</button> : null}
          </div>
          <RequestForm detail={detail} busy={busy} act={act} />
          <DecisionForm detail={detail} busy={busy} act={act} />
          {detail.decisions.length > 0 ? <ul className="mt-4 divide-y divide-[#EEE8F2] text-sm">{detail.decisions.map((decision) => <li key={decision.id} className="py-2"><strong>{decision.decisionType.replaceAll("_", " ")}: {decision.outcome.replaceAll("_", " ")}</strong> · {decision.reviewerPermission} · {fmt(decision.decidedAt)}<br /><span className="text-[#5B4E66]">{decision.rationale}</span>{decision.policyBasis ? <><br /><span className="text-xs text-[#7A6E85]">Basis: {decision.policyBasis}</span></> : null}</li>)}</ul> : null}
        </Panel>
      ) : null}

      {detail.eligibility ? <EligibilityPanel summary={detail.eligibility} /> : null}

      {canReview ? (
        <Panel eyebrow="Application" title="Answers">
          <AnswerSummary answers={detail.answers} />
          <div className="mt-4 border-t border-[#E8E1EE] pt-4">
            <p className="text-sm"><strong>Statements signed:</strong> {detail.signatures.filter((signature) => signature.status === "active").length === 0 ? "none" : detail.signatures.filter((signature) => signature.status === "active").map((signature) => `${signature.statementKey.replaceAll("_", " ")} (${signature.signerName}, ${fmt(signature.signedAt)}${signature.current ? "" : ", answers changed since"})`).join("; ")}</p>
          </div>
          {(has("attorney") || has("coordinator")) ? <RevealBlock detail={detail} busy={busy} act={act} /> : <p className="mt-3 text-xs text-[#7A6E85]">Protected number on file: {detail.ssnHint ?? "not provided"}. Only the assigned attorney or coordinator can reveal it.</p>}
        </Panel>
      ) : null}

      <Panel eyebrow="Documents" title="Applicant documents and executed copies">
        <DocumentsBlock intakeId={detail.id} documents={detail.documents} onChanged={async () => router.refresh()} categories={["executed_document", "court_record", "identification", "income", "other"]} />
      </Panel>

      {(has("attorney") || has("coordinator") || has("notary")) ? <DocumentTasks detail={detail} busy={busy} act={act} canCreate={has("attorney") || has("coordinator")} /> : null}

      {(has("coordinator") || has("follow_up") || has("attorney") || has("program_review")) ? <NextSteps detail={detail} staff={staff} busy={busy} act={act} /> : null}

      {(has("coordinator") || has("follow_up")) ? <MessageForm staff={staff} busy={busy} act={act} /> : null}

      {has("export") ? <ExportPanel detail={detail} busy={busy} act={act} /> : null}

      <p className="text-xs text-[#7A6E85]">Application {detail.id} · clinic case {detail.clinicCaseId ?? "not yet created"} · event {eventId}</p>
    </div>
  );
}

type Act = (payload: Record<string, unknown>, success: string | ((body: Record<string, unknown>) => string)) => Promise<Record<string, unknown> | null>;

function Item({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-xs font-black uppercase tracking-wide text-[#7A6E85]">{label}</dt><dd className="mt-0.5">{children}</dd></div>;
}

function fmt(iso: string) { return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)); }

function ExternalReference({ detail, busy, act }: { detail: Detail; busy: boolean; act: Act }) {
  const [value, setValue] = useState(detail.externalCaseReference ?? "");
  return (
    <form onSubmit={(event) => { event.preventDefault(); void act({ action: "set_external_reference", reference: value }, "Case reference saved."); }} className="mt-4 flex flex-wrap items-end gap-2">
      <label className="block text-sm font-bold">Case reference in the partner&apos;s own system<input className={laInput} value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g. the case number in the partner's records" /></label>
      <button type="submit" disabled={busy} className={laSecondary}>Save reference</button>
    </form>
  );
}

function RequestForm({ detail, busy, act }: { detail: Detail; busy: boolean; act: Act }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-5 border-t border-[#E8E1EE] pt-4">
      <h3 className="text-base font-black">Information requests</h3>
      <ul className="mt-2 divide-y divide-[#EEE8F2] text-sm">{detail.allRequests.map((request) => <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{request.requestText} <span className="text-xs text-[#7A6E85]">({request.status}, {fmt(request.createdAt)})</span></span>{request.status === "open" ? <button type="button" disabled={busy} onClick={() => void act({ action: "withdraw_request", requestId: request.id }, "Request withdrawn.")} className="text-xs underline">Withdraw</button> : null}</li>)}</ul>
      <form onSubmit={(event) => { event.preventDefault(); void act({ action: "request_information", requestText: text }, "The applicant will see this request.").then((body) => { if (body) setText(""); }); }} className="mt-2 flex flex-wrap items-end gap-2">
        <label className="block min-w-64 flex-1 text-sm font-bold">Ask the applicant for something<input className={laInput} value={text} onChange={(event) => setText(event.target.value)} placeholder="Plain language the applicant will read" /></label>
        <button type="submit" disabled={busy || text.trim().length < 3} className={laSecondary}>Send request</button>
      </form>
    </div>
  );
}

function DecisionForm({ detail, busy, act }: { detail: Detail; busy: boolean; act: Act }) {
  const has = (permission: string) => detail.permissions.includes(permission);
  const types: { value: string; label: string; outcomes: [string, string][] }[] = [];
  if (has("program_review") || has("coordinator")) types.push({ value: "program_eligibility", label: "Program eligibility", outcomes: [["needs_information", "Needs information"], ["approved", "Approved"], ["declined_for_program", "Declined for program"], ["referred", "Referred elsewhere"]] });
  if (has("attorney")) types.push({ value: "attorney_review", label: "Attorney review", outcomes: [["needs_information", "Needs information"], ["reviewed", "Reviewed"]] }, { value: "conflict_engagement", label: "Conflict check and engagement", outcomes: [["accepted", "Accepted"], ["not_accepted", "Not accepted"]] });
  const [type, setType] = useState(types[0]?.value ?? "");
  const [outcome, setOutcome] = useState(types[0]?.outcomes[0]?.[0] ?? "");
  const [rationale, setRationale] = useState("");
  const [basis, setBasis] = useState("");
  if (types.length === 0) return null;
  const selected = types.find((entry) => entry.value === type) ?? types[0];
  return (
    <form onSubmit={(event) => { event.preventDefault(); void act({ action: "record_decision", decisionType: type, outcome, rationale, policyBasis: basis, evidence: {} }, "Decision recorded.").then((body) => { if (body) { setRationale(""); setBasis(""); } }); }} className="mt-5 border-t border-[#E8E1EE] pt-4">
      <h3 className="text-base font-black">Record a decision</h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold">Decision<select className={laInput} value={type} onChange={(event) => { setType(event.target.value); setOutcome(types.find((entry) => entry.value === event.target.value)?.outcomes[0]?.[0] ?? ""); }}>{types.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></label>
        <label className="block text-sm font-bold">Outcome<select className={laInput} value={outcome} onChange={(event) => setOutcome(event.target.value)}>{selected.outcomes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="block text-sm font-bold sm:col-span-2">Reason (kept in the case record)<textarea rows={3} className={laInput} value={rationale} onChange={(event) => setRationale(event.target.value)} /></label>
        <label className="block text-sm font-bold sm:col-span-2">Policy basis (optional)<input className={laInput} value={basis} onChange={(event) => setBasis(event.target.value)} placeholder="Which approved policy rule this applies" /></label>
      </div>
      <button type="submit" disabled={busy || rationale.trim().length < 10} className={`${laPrimary} mt-3`}>Record decision</button>
    </form>
  );
}

function EligibilityPanel({ summary }: { summary: EligibilitySummary }) {
  return (
    <Panel eyebrow="Financial summary" title={summary.outcome === "manual_review" ? "Needs a person's decision" : summary.outcome === "within_guideline" ? "Within the approved guideline" : "Over the approved guideline"}>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <Item label="Countable monthly cash income">{summary.countable.monthlyCashIncome === null ? "not computable" : `$${summary.countable.monthlyCashIncome.toFixed(2)}`}</Item>
        <Item label="Household size">{summary.householdSize ?? "not stated"}</Item>
        <Item label="Guideline">{summary.guideline ? `${summary.guideline.basis}: $${summary.guideline.monthlyLimit}/month` : "no income table in the approved profile"}</Item>
      </dl>
      <p className="mt-3 text-xs text-[#5B4E66]">Counted: {summary.countable.countedCategories.join(", ") || "none"} · Not counted: {summary.countable.excludedCategories.join(", ") || "none"} · Unknown: {summary.countable.unknownCategories.join(", ") || "none"} · Missing: {summary.countable.missingCategories.join(", ") || "none"}</p>
      {summary.reasons.length > 0 ? <ul className="mt-2 list-disc pl-5 text-sm">{summary.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
      <p className="mt-2 text-xs text-[#7A6E85]">Reported expenses are shown for context and are never deducted automatically.</p>
    </Panel>
  );
}

function RevealBlock({ detail, busy, act }: { detail: Detail; busy: boolean; act: Act }) {
  const [purpose, setPurpose] = useState("");
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    if (!value) return;
    const timer = window.setTimeout(() => setValue(null), 60_000);
    return () => window.clearTimeout(timer);
  }, [value]);
  return (
    <div className="mt-4 rounded-md border border-[#E6C9A8] bg-[#FFF8EE] p-3 text-sm">
      <p className="font-bold">Protected number on file: {detail.ssnHint ?? "not provided"}</p>
      {detail.ssnHint ? (
        value ? <p className="mt-2">Revealed for 60 seconds: <strong className="font-mono">{value}</strong> <button type="button" className="ml-2 underline" onClick={() => setValue(null)}>Hide now</button></p> : (
          <form onSubmit={(event) => { event.preventDefault(); void act({ action: "reveal_ssn", purpose }, "Reveal recorded in the access log.").then((body) => { if (body && typeof body.value === "string") setValue(body.value); }); }} className="mt-2 flex flex-wrap items-end gap-2">
            <label className="block min-w-64 flex-1 text-sm font-bold">Purpose (recorded)<input className={laInput} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="e.g. preparing the petition for filing" /></label>
            <button type="submit" disabled={busy || purpose.trim().length < 5} className={laSecondary}>Reveal once</button>
          </form>
        )
      ) : null}
    </div>
  );
}

function DocumentTasks({ detail, busy, act, canCreate }: { detail: Detail; busy: boolean; act: Act; canCreate: boolean }) {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  useEffect(() => {
    if (!canCreate) return;
    fetch(`/api/legal-aid/staff/intakes/${detail.id}`, { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((body) => { if (body?.renderJobs) setJobs(body.renderJobs as RenderJob[]); }).catch(() => null);
  }, [detail.id, canCreate]);
  const executed = detail.documents.filter((document) => document.category === "executed_document");
  return (
    <Panel eyebrow="Document execution" title="Court documents">
      <p className="text-sm leading-6 text-[#5B4E66]">Each document moves through review, execution and filing in order. The unsigned copy comes from the participant&apos;s prepared packet; the executed copy is uploaded above as a &quot;Signed document&quot; and attached here. No seal, notary block or signature is ever generated by this system.</p>
      <ul className="mt-3 divide-y divide-[#EEE8F2]">{detail.documentTasks.map((task) => <TaskRow key={task.id} intakeId={detail.id} task={task} busy={busy} act={act} executed={executed} jobs={jobs} />)}</ul>
      {detail.documentTasks.length === 0 ? <p className="mt-2 text-sm text-[#7A6E85]">No documents yet.</p> : null}
      {canCreate ? <CreateTaskForm busy={busy} act={act} jobs={jobs} /> : null}
    </Panel>
  );
}

function TaskRow({ intakeId, task, busy, act, executed, jobs }: { intakeId: string; task: DocumentTask; busy: boolean; act: Act; executed: Detail["documents"]; jobs: RenderJob[] }) {
  const index = TASK_FLOW.indexOf(task.status);
  const next = TASK_FLOW[index + 1];
  const [executedId, setExecutedId] = useState(task.executedDocumentId ?? "");
  const [note, setNote] = useState("");
  const [jobId, setJobId] = useState("");
  const needsExecuted = next === "executed_copy_received" && !executedId;
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><span><strong>{task.title}</strong> · {task.requiredSigner.replaceAll("_", " ")} · {task.executionMethod.replaceAll("_", " ")}</span><span className="rounded-full bg-[var(--la-soft)] px-3 py-1 text-xs font-bold text-[var(--la-brand-dark)]">{TASK_LABELS[task.status]}</span></div>
      <p className="mt-1 text-xs text-[#7A6E85]">Unsigned copy {task.unsignedArtifactSha256 ? `sha256 ${task.unsignedArtifactSha256.slice(0, 12)}…` : "not attached"}{task.unsignedRenderJobId ? <> · <a className="underline" href={`/api/legal-aid/staff/intakes/${intakeId}/unsigned/${task.id}`} target="_blank" rel="noreferrer">open prepared packet</a></> : null}{task.authorityNote ? ` · ${task.authorityNote}` : ""}{task.filingNote ? ` · ${task.filingNote}` : ""}</p>
      {next ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          {next === "executed_copy_received" ? <label className="block text-xs font-bold">Executed copy<select className={laInput} value={executedId} onChange={(event) => setExecutedId(event.target.value)}><option value="">Choose the uploaded signed document</option>{executed.map((document) => <option key={document.id} value={document.id}>{document.originalFilename}</option>)}</select></label> : null}
          <label className="block text-xs font-bold">Note (optional)<input className={laInput} value={note} onChange={(event) => setNote(event.target.value)} /></label>
          <button type="button" disabled={busy || needsExecuted} onClick={() => void act({ action: "transition_document_task", taskId: task.id, status: next, executedDocumentId: executedId || null, note }, `Moved to ${TASK_LABELS[next]}.`)} className={laSecondary}>Mark {TASK_LABELS[next].toLowerCase()}</button>
        </div>
      ) : null}
      {jobs.length > 0 && index < TASK_FLOW.indexOf("signature_or_notary_pending") ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block text-xs font-bold">Replace unsigned copy with<select className={laInput} value={jobId} onChange={(event) => setJobId(event.target.value)}><option value="">Choose a prepared packet</option>{jobs.map((job) => <option key={job.id} value={job.id}>{fmt(job.createdAt)} · {job.status}</option>)}</select></label>
          <button type="button" disabled={busy || !jobId} onClick={() => { const job = jobs.find((entry) => entry.id === jobId); if (job?.outputSha256) void act({ action: "replace_document_artifact", taskId: task.id, unsignedRenderJobId: job.id, unsignedArtifactSha256: job.outputSha256 }, "Unsigned copy replaced; execution restarts."); }} className={laSecondary}>Replace</button>
        </div>
      ) : null}
    </li>
  );
}

function CreateTaskForm({ busy, act, jobs }: { busy: boolean; act: Act; jobs: RenderJob[] }) {
  const [jobId, setJobId] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const job = jobs.find((entry) => entry.id === jobId);
    void act({
      action: "create_document_task", documentKey: String(data.get("documentKey") ?? ""), title: String(data.get("title") ?? ""), requiredSigner: String(data.get("requiredSigner") ?? ""), executionMethod: String(data.get("executionMethod") ?? ""),
      authorityNote: String(data.get("authorityNote") ?? ""), templateVersion: String(data.get("templateVersion") ?? ""), unsignedRenderJobId: job?.id ?? null, unsignedArtifactSha256: job?.outputSha256 ?? null
    }, "Document added.");
  }
  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 border-t border-[#E8E1EE] pt-4 sm:grid-cols-2">
      <h3 className="text-base font-black sm:col-span-2">Add a court document</h3>
      <label className="block text-sm font-bold">Document key<input name="documentKey" required pattern="[a-z0-9][a-z0-9_-]{1,79}" className={laInput} placeholder="ms-expungement-petition" /></label>
      <label className="block text-sm font-bold">Title<input name="title" required className={laInput} placeholder="Petition for Expungement" /></label>
      <label className="block text-sm font-bold">Who signs<select name="requiredSigner" className={laInput}><option value="applicant">Applicant</option><option value="applicant_and_notary">Applicant before a notary</option><option value="attorney">Attorney</option><option value="notary">Notary</option><option value="clerk">Clerk</option></select></label>
      <label className="block text-sm font-bold">Execution<select name="executionMethod" className={laInput}><option value="notary_jurat">Notary jurat (sworn)</option><option value="notary_acknowledgment">Notary acknowledgment</option><option value="wet_signature">Wet signature</option><option value="clerk_verification">Clerk verification</option><option value="no_signature_required">No signature required</option></select></label>
      <label className="block text-sm font-bold sm:col-span-2">Unsigned copy from the participant&apos;s prepared packet<select className={laInput} value={jobId} onChange={(event) => setJobId(event.target.value)}><option value="">Attach later</option>{jobs.map((job) => <option key={job.id} value={job.id}>{fmt(job.createdAt)} · {job.status}</option>)}</select></label>
      <label className="block text-sm font-bold">Authority note (optional)<input name="authorityNote" className={laInput} placeholder="Statute or rule requiring this execution" /></label>
      <label className="block text-sm font-bold">Template version (optional)<input name="templateVersion" className={laInput} /></label>
      <div className="sm:col-span-2"><button type="submit" disabled={busy} className={laPrimary}>Add document</button></div>
    </form>
  );
}

function NextSteps({ detail, staff, busy, act }: { detail: Detail; staff: Staff[]; busy: boolean; act: Act }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void act({ action: "save_next_step", nextStepId: null, title: String(data.get("title") ?? ""), detail: String(data.get("detail") ?? ""), dueAt: String(data.get("dueAt") ?? "") ? new Date(String(data.get("dueAt"))).toISOString() : null, ownerEventStaffId: String(data.get("owner") ?? "") || null, status: "pending" }, "Next step saved. The participant sees it in their application.").then((body) => { if (body) form.reset(); });
  }
  return (
    <Panel eyebrow="Follow-up" title="Participant next steps">
      <ul className="divide-y divide-[#EEE8F2] text-sm">{detail.nextSteps.map((step) => <li key={step.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><strong>{step.title}</strong>{step.dueAt ? ` · due ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(step.dueAt))}` : ""}{step.ownerEventStaffId ? ` · ${staff.find((member) => member.eventStaffId === step.ownerEventStaffId)?.email ?? "assigned"}` : ""}{step.detail ? <><br /><span className="text-[#5B4E66]">{step.detail}</span></> : null}</span><span className="flex gap-2">{step.status === "pending" ? <button type="button" disabled={busy} onClick={() => void act({ action: "save_next_step", nextStepId: step.id, title: step.title, detail: step.detail, dueAt: step.dueAt, ownerEventStaffId: step.ownerEventStaffId, status: "done" }, "Marked done.")} className="text-xs underline">Mark done</button> : <span className="text-xs text-[#7A6E85]">{step.status}</span>}</span></li>)}</ul>
      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold sm:col-span-2">What the participant should do next<input name="title" required className={laInput} placeholder="Bring your certified court record to the clinic" /></label>
        <label className="block text-sm font-bold sm:col-span-2">Details the participant will read (optional)<textarea name="detail" rows={2} className={laInput} /></label>
        <label className="block text-sm font-bold">Due (optional)<input name="dueAt" type="date" className={laInput} /></label>
        <label className="block text-sm font-bold">Owner on the clinic team<select name="owner" className={laInput}><option value="">Unassigned</option>{staff.map((member) => <option key={member.eventStaffId} value={member.eventStaffId}>{member.email}</option>)}</select></label>
        <div className="sm:col-span-2"><button type="submit" disabled={busy} className={laSecondary}>Add next step</button></div>
      </form>
    </Panel>
  );
}

function MessageForm({ staff, busy, act }: { staff: Staff[]; busy: boolean; act: Act }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void act({ action: "send_message", participantSafeMessage: String(data.get("message") ?? ""), internalNotes: String(data.get("internal") ?? ""), dueAt: String(data.get("dueAt") ?? "") ? new Date(String(data.get("dueAt"))).toISOString() : null, ownerEventStaffId: String(data.get("owner") ?? "") || null },
      (body) => body.communicationState === "sent" ? "Message sent by email and recorded." : body.communicationState === "failed" ? "The email provider refused the message; it is recorded as failed." : `Recorded, not sent: ${String(body.detail ?? "")}`).then((result) => { if (result) form.reset(); });
  }
  return (
    <Panel eyebrow="Follow-up" title="Contact the participant">
      <p className="text-sm leading-6 text-[#5B4E66]">The participant-safe message is what the person receives. Internal notes stay with the clinic team. Every attempt is recorded with what actually happened.</p>
      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-bold sm:col-span-2">Message to the participant<textarea name="message" required rows={3} className={laInput} placeholder="No financial details, no case specifics beyond what the person needs to act." /></label>
        <label className="block text-sm font-bold sm:col-span-2">Internal note (never sent)<textarea name="internal" rows={2} className={laInput} /></label>
        <label className="block text-sm font-bold">Follow up by (optional)<input name="dueAt" type="date" className={laInput} /></label>
        <label className="block text-sm font-bold">Owner<select name="owner" className={laInput}><option value="">Unassigned</option>{staff.map((member) => <option key={member.eventStaffId} value={member.eventStaffId}>{member.email}</option>)}</select></label>
        <div className="sm:col-span-2"><button type="submit" disabled={busy} className={laPrimary}>Send and record</button></div>
      </form>
    </Panel>
  );
}

function ExportPanel({ detail, busy, act }: { detail: Detail; busy: boolean; act: Act }) {
  const canRestricted = detail.permissions.includes("attorney") || detail.permissions.includes("coordinator");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void act({ action: "export_case_file", includeRestricted: data.get("includeRestricted") === "on", recipientNote: String(data.get("recipientNote") ?? "") }, "Case file exported. Download it below.");
  }
  return (
    <Panel eyebrow="Records" title="Case-file export">
      <p className="text-sm leading-6 text-[#5B4E66]">Produces the case file for the partner&apos;s own records: answers, decisions, signatures, document list and next steps. The protected number is masked unless the assigned attorney or coordinator chooses to include it, and every export is recorded.</p>
      <ul className="mt-3 divide-y divide-[#EEE8F2] text-sm">{detail.exports.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>Version {entry.exportVersion} · {fmt(entry.createdAt)}{entry.includesRestricted ? " · includes protected number" : ""}</span><span className="flex gap-3"><a className="font-bold underline" href={`/api/legal-aid/exports/${entry.id}?format=pdf`}>PDF</a><a className="font-bold underline" href={`/api/legal-aid/exports/${entry.id}?format=json`}>JSON</a></span></li>)}</ul>
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block min-w-64 flex-1 text-sm font-bold">Recipient note (optional)<input name="recipientNote" className={laInput} placeholder="Where this copy is going" /></label>
        {canRestricted ? <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="includeRestricted" />Include protected number</label> : null}
        <button type="submit" disabled={busy} className={laSecondary}>Export case file</button>
      </form>
    </Panel>
  );
}
