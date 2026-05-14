// Product/legal placeholder. Counsel must review deletion and retention language before public launch.
import { getBetaFlagStatus } from "@/lib/beta";

export default function DataDeletionPage() {
  const flags = getBetaFlagStatus();

  return (
    <main className="panel">
      <h1>Data deletion and anonymization</h1>
      <p>
        You can request deletion or anonymization of personal information by contacting support@example.com. Replace
        this placeholder with the production support address before launch.
      </p>
      <p className="muted">
        Requests are currently {flags.dataDeletionRequestEnabled ? "accepted" : "paused"} for this beta environment.
      </p>
      <h2>What may be changed</h2>
      <p>
        LegalEase can remove or anonymize account contact fields, case display fields, provider references, AI summary
        records, monitoring history, and support notes where supported by the current workflow.
      </p>
      <h2>What may be retained</h2>
      <p>
        Some non-personal billing, fraud-prevention, audit, compliance, or security records may be retained where
        appropriate.
      </p>
    </main>
  );
}
