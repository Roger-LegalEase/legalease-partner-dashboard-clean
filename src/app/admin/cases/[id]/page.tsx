import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getAdminCaseDetail, type AdminOpsDatabase } from "@/lib/admin-ops";
import { prisma } from "@/lib/prisma";
import {
  addSupportNoteAction,
  anonymizeCaseAction,
  closeCaseAction,
  escalateCaseAction,
  markManualReviewAction,
  refreshCaseStatusAction,
  regenerateSummaryAction,
  resolveManualReviewAction
} from "@/app/admin/cases/actions";

export default async function AdminCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const detail = await getAdminCaseDetail(prisma as unknown as AdminOpsDatabase, id);
  if (!detail) notFound();
  const { record, row, displayState } = detail;
  const orders = record.owner?.productOrders ?? record.productOrders ?? [];
  const entitlements = record.owner?.entitlements ?? record.entitlements ?? [];
  const anonymized = displayState.anonymizationStatus === "completed";

  return (
    <div className="panel">
      <h1>{record.displayName}</h1>
      <p className="muted">
        Consumer self-check flow · Not for employment, tenant, credit, insurance, or eligibility decisioning · Provider event payloads are redacted
      </p>

      <section>
        <h2>Customer info</h2>
        <dl>
          <dt>Case ID</dt>
          <dd>{record.id}</dd>
          <dt>Customer</dt>
          <dd>{row.customerLabel}</dd>
          <dt>Email</dt>
          <dd>{anonymized ? "Anonymized" : row.email ?? "none"}</dd>
          <dt>Current case status</dt>
          <dd>{record.status}</dd>
          <dt>Anonymization/deletion status</dt>
          <dd>{displayState.anonymizationStatus === "completed" ? "Anonymized" : displayState.anonymizationStatus}</dd>
        </dl>
      </section>

      <section>
        <h2>Payment info</h2>
        <dl>
          <dt>Payment status</dt>
          <dd>{row.paymentStatus}</dd>
          <dt>Stripe customer ID</dt>
          <dd>{record.owner?.stripeCustomerId ?? orders[0]?.stripeCustomerId ?? entitlements[0]?.stripeCustomerId ?? "none"}</dd>
          <dt>Checkout/session/payment IDs</dt>
          <dd>{orders.map((order) => [order.stripeCheckoutSessionId, order.stripePaymentIntentId].filter(Boolean).join(" / ")).join(", ") || "none"}</dd>
          <dt>Subscription IDs</dt>
          <dd>{entitlements.map((item) => `${item.productKey}: ${item.stripeSubscriptionId} (${item.status})`).join(", ") || "none"}</dd>
        </dl>
      </section>

      <section>
        <h2>Background-check provider info</h2>
        <ul>
          {(record.providerCandidates ?? []).map((candidate) => (
            <li key={candidate.providerCandidateId}>Candidate ID: {candidate.providerCandidateId}</li>
          ))}
          {(record.providerInvitations ?? []).map((invitation) => (
            <li key={invitation.providerInvitationId}>
              Invitation ID: {invitation.providerInvitationId} · {invitation.status}
            </li>
          ))}
          {(record.providerReports ?? []).map((report) => (
            <li key={report.providerReportId}>
              Report ID: {report.providerReportId} · {report.status} · {report.result ?? "no result"}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>AI summary info</h2>
        <p>{row.summaryStatus}</p>
        {(record.providerReports ?? []).map((report) =>
          report.reportSummary ? <p key={report.id}>{report.reportSummary.plainEnglishSummary}</p> : null
        )}
      </section>

      <section>
        <h2>Expungement-readiness info</h2>
        <p>{row.expungementReadinessStatus}</p>
        <p className="muted">Do not use this tool to approve, deny, rank, or score a person.</p>
      </section>

      <section>
        <h2>Monitoring info</h2>
        <p>{row.monitoringStatus}</p>
        <ul>
          {(record.monitoringEnrollments ?? []).map((enrollment) => (
            <li key={enrollment.providerContinuousCheckId ?? enrollment.consentType}>
              {enrollment.consentType} · {enrollment.status} · {enrollment.providerContinuousCheckId ?? "pending provider id"}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Redacted provider event timeline</h2>
        <ul>
          {detail.providerEvents.map((event) => (
            <li key={event.providerEventId}>
              {event.receivedAt.toLocaleString()} · {event.provider} · {event.type} · {event.dedupeStatus}
              <pre>{JSON.stringify(event.payloadPreview, null, 2)}</pre>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Audit timeline</h2>
        <ul>
          {detail.auditTimeline.map((event) => (
            <li key={`${event.timestamp.toISOString()}-${event.action}`}>
              {event.timestamp.toLocaleString()} · {event.actorType} · {event.actorLabel} · {event.action}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Admin actions</h2>
        <form action={regenerateSummaryAction}>
          <input type="hidden" name="caseId" value={record.id} />
          <button className="button" type="submit">Retry AI summary</button>
        </form>
        <form action={markManualReviewAction}>
          <input type="hidden" name="caseId" value={record.id} />
          <input name="reason" placeholder="Manual review reason" required />
          <button className="button" type="submit">Mark manual review needed</button>
        </form>
        <form action={resolveManualReviewAction}>
          <input type="hidden" name="caseId" value={record.id} />
          <input name="resolutionNote" placeholder="Resolution note" required />
          <button className="button" type="submit">Resolve manual review</button>
        </form>
        <form action={refreshCaseStatusAction}>
          <input type="hidden" name="caseId" value={record.id} />
          <button className="button" type="submit">Refresh local status</button>
        </form>
        <form action={anonymizeCaseAction}>
          <input type="hidden" name="caseId" value={record.id} />
          <input name="reason" placeholder="Anonymization reason" required />
          <input name="confirmation" placeholder="Type ANONYMIZE" required />
          <button className="button" type="submit">Trigger anonymization</button>
        </form>
        <form action={escalateCaseAction}>
          <input type="hidden" name="caseId" value={record.id} />
          <button className="button" type="submit">Escalate case</button>
        </form>
        <form action={closeCaseAction}>
          <input type="hidden" name="caseId" value={record.id} />
          <button className="button" type="submit">Close case</button>
        </form>
      </section>

      <section>
        <h2>Support note</h2>
        <form action={addSupportNoteAction}>
          <input type="hidden" name="caseId" value={record.id} />
          <textarea name="body" rows={4} />
          <br />
          <button className="button" type="submit">Add note</button>
        </form>
      </section>
    </div>
  );
}
