"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DocumentTask, IntakeDocument } from "@/lib/legal-aid/types";
import { DocumentsBlock } from "./IntakeClient";
import { Panel, laInput, laSecondary } from "./LegalAidShell";

// The notary's view: the documents that need notarization for this
// applicant, and the one action of recording that the executed copy exists.
// No answers, no financial detail, no protected values.

export function NotaryClient({ intakeId, applicantName, tasks, executedDocuments }: { intakeId: string; applicantName: string; tasks: DocumentTask[]; executedDocuments: IntakeDocument[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  async function received(taskId: string) {
    const executedDocumentId = chosen[taskId];
    if (!executedDocumentId) { setNotice("Upload the signed document first, then choose it."); return; }
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/legal-aid/staff/intakes/${intakeId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "transition_document_task", taskId, status: "executed_copy_received", executedDocumentId, note: "Executed copy received by notary" }) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      setNotice(response.ok ? "Recorded. The clinic team will review the executed copy." : body.error ?? "The update was refused.");
      if (response.ok) router.refresh();
    } finally { setBusy(false); }
  }
  const pending = tasks.filter((task) => task.status === "signature_or_notary_pending");
  return (
    <div className="space-y-5">
      <div aria-live="polite" className={`min-h-6 rounded-md px-3 py-2 text-sm font-semibold ${notice ? "border border-[#DCC9B8] bg-[#FFF7ED] text-[#8A3C1F]" : "text-transparent"}`}>{notice || "No update"}</div>
      <Panel eyebrow="Notary" title={applicantName}>
        <p className="text-sm leading-6 text-[#5B4E66]">Documents waiting for notarization are listed below. Notarize on paper as required, upload the signed copy as a &quot;Signed document&quot;, then record that it was received.</p>
        <ul className="mt-3 divide-y divide-[#EEE8F2] text-sm">
          {pending.map((task) => (
            <li key={task.id} className="py-3">
              <p><strong>{task.title}</strong> · {task.requiredSigner.replaceAll("_", " ")} · {task.executionMethod.replaceAll("_", " ")}</p>
              {task.authorityNote ? <p className="text-xs text-[#7A6E85]">{task.authorityNote}</p> : null}
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="block text-xs font-bold">Signed copy<select className={laInput} value={chosen[task.id] ?? ""} onChange={(event) => setChosen((previous) => ({ ...previous, [task.id]: event.target.value }))}><option value="">Choose the uploaded signed document</option>{executedDocuments.map((document) => <option key={document.id} value={document.id}>{document.originalFilename}</option>)}</select></label>
                <button type="button" disabled={busy} onClick={() => void received(task.id)} className={laSecondary}>Record executed copy received</button>
              </div>
            </li>
          ))}
        </ul>
        {pending.length === 0 ? <p className="mt-2 text-sm text-[#7A6E85]">Nothing is waiting for notarization for this applicant.</p> : null}
        {tasks.filter((task) => task.status !== "signature_or_notary_pending").length > 0 ? <p className="mt-3 text-xs text-[#7A6E85]">Other documents: {tasks.filter((task) => task.status !== "signature_or_notary_pending").map((task) => `${task.title} (${task.status.replaceAll("_", " ")})`).join("; ")}</p> : null}
      </Panel>
      <Panel title="Upload the signed copy"><DocumentsBlock intakeId={intakeId} documents={executedDocuments} onChanged={async () => router.refresh()} categories={["executed_document"]} /></Panel>
    </div>
  );
}
