import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardOverview, type AdminOpsDatabase } from "@/lib/admin-ops";
import { getBetaFlagStatus } from "@/lib/beta";
import { prisma } from "@/lib/prisma";

const safetyLabels = [
  "Consumer self-check flow",
  "Not for employment, tenant, credit, insurance, or eligibility decisioning",
  "Do not use this tool to approve, deny, rank, or score a person",
  "Provider event payloads are redacted"
];

export default async function AdminPage() {
	  await requireAdmin();
	  const overview = await getAdminDashboardOverview(prisma as unknown as AdminOpsDatabase);
  const betaFlags = getBetaFlagStatus();
  const cards = [
    ["Total Record Check cases", overview.totalCases],
    ["Pending Checkr invitations", overview.pendingInvitations],
    ["Active report checks", overview.activeReports],
    ["Completed summaries", overview.completedSummaries],
    ["Failed AI summaries needing retry", overview.failedSummaries],
    ["Monitoring subscriptions active", overview.activeMonitoring],
    ["Monitoring cancellations", overview.canceledMonitoring],
    ["Deletion/anonymization workflows", overview.anonymizations]
  ];

  return (
    <div className="panel">
      <h1>Operations Launch Console</h1>
      <ul>
        {safetyLabels.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
      <p>
        <Link className="button" href="/admin/cases">
          Review cases
        </Link>
      </p>
	      <div className="dashboard-grid">
	        {cards.map(([label, value]) => (
          <section className="panel" key={label}>
            <h2>{label}</h2>
            <p>{value}</p>
          </section>
	        ))}
	      </div>
      <h2>Beta launch controls</h2>
      <ul>
        <li>Beta access: {betaFlags.betaAccessEnabled ? "enabled" : "paused"}</li>
        <li>Invite-only: {betaFlags.betaInviteOnly ? "enabled" : "disabled"}</li>
        <li>Beta user limit: {betaFlags.betaMaxUsers > 0 ? betaFlags.betaMaxUsers : "not capped"}</li>
        <li>Approved emails configured: {betaFlags.approvedEmailCount}</li>
        <li>Invite codes configured: {betaFlags.inviteCodeCount}</li>
        <li>Record Check purchases: {betaFlags.recordCheckPurchaseEnabled ? "enabled" : "paused"}</li>
        <li>Monitoring purchases: {betaFlags.monitoringPurchaseEnabled ? "enabled" : "paused"}</li>
        <li>AI summaries: {betaFlags.aiSummaryEnabled ? "enabled" : "manual review pending"}</li>
        <li>Admin retries: {betaFlags.adminRetryEnabled ? "enabled" : "paused"}</li>
        <li>Deletion requests: {betaFlags.dataDeletionRequestEnabled ? "enabled" : "paused"}</li>
      </ul>
	      <h2>Recent audit events</h2>
      <ul>
        {overview.recentAuditEvents.map((event) => (
          <li key={`${event.action}-${event.timestamp.toISOString()}`}>
            {event.timestamp.toLocaleString()} · {event.actorType} · {event.action}
          </li>
        ))}
      </ul>
    </div>
  );
}
