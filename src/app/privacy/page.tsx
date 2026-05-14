// Product/legal placeholder. Counsel must review before public launch.
export default function PrivacyPage() {
  return (
    <main className="panel">
      <h1>Privacy placeholder</h1>
      <p className="muted">This beta placeholder is not a final attorney-approved privacy policy.</p>
      <h2>Data we use</h2>
      <p>
        LegalEase may store account contact details, payment references, provider IDs, case status, redacted provider
        events, summaries, monitoring status, support notes, and audit records needed to operate the beta.
      </p>
      <h2>Provider-hosted flow</h2>
      <p>
        Checkr or another selected provider may collect sensitive information through its hosted flow. LegalEase is
        designed to avoid storing SSNs, full dates of birth, driver license numbers, and raw provider payloads.
      </p>
      <h2>Payments, AI, and monitoring</h2>
      <p>
        Stripe processes payments. OpenAI may be used to generate plain-English summaries from normalized, minimized
        report data. Monitoring alerts may depend on provider availability and may not detect every record or change.
      </p>
      <h2>Deletion and anonymization</h2>
      <p>
        Users can request deletion or anonymization. Some non-personal billing, audit, fraud-prevention, or compliance
        records may be retained when appropriate.
      </p>
    </main>
  );
}
