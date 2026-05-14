import Link from "next/link";
import { WilmaChatWidget } from "@/components/wilma/WilmaChatWidget";
import { currentUser } from "@/lib/auth";
import { betaAccessMessage, canStartRecordCheckCheckout, getBetaFlagStatus } from "@/lib/beta";

export default async function HomePage() {
  const user = await currentUser();
  const flags = getBetaFlagStatus();
  const access = canStartRecordCheckCheckout(user);

  return (
    <div className="home-grid">
      <section className="panel home-summary">
        <p className="muted">LegalEase RecordShield beta</p>
        <h1>Personal record check with expungement-readiness review</h1>
        <p className="muted">
          A consumer self-check flow that helps you review your own record, see plain-English next steps, and understand what may require attorney review.
        </p>
        <ul>
          <li>Record Check + Expungement Readiness: $199 one-time</li>
          <li>Monitoring Lite: $14.99/month or $149/year</li>
          <li>Monitoring Plus: $29.99/month</li>
        </ul>
        <p className="muted">
          Not for employment, housing, tenant, credit, insurance, or eligibility decisions. This beta does not guarantee expungement or record removal.
        </p>
        {access.allowed ? (
          <p>
            <Link className="button" href="/dashboard">
              Continue to dashboard
            </Link>
          </p>
        ) : (
          <p className="muted">{betaAccessMessage(access.reason)} Contact support for beta availability.</p>
        )}
        <p className="muted">
          Beta access: {flags.betaAccessEnabled ? "open" : "paused"} · Purchases:{" "}
          {flags.recordCheckPurchaseEnabled ? "available for approved users" : "paused"}
        </p>
        <p>
          <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> ·{" "}
          <Link href="/beta-disclaimer">Beta disclaimer</Link> · <Link href="/support">Support</Link>
        </p>
      </section>
      <WilmaChatWidget />
    </div>
  );
}
