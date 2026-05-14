import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listAdminCaseRows, type AdminOpsDatabase } from "@/lib/admin-ops";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | undefined>;

export default async function AdminCasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin();
  const filters = await searchParams;
  const rows = (await listAdminCaseRows(prisma as unknown as AdminOpsDatabase, filters)).filter((row) => {
    if (filters.summaryStatus && row.displayState.summaryStatus !== filters.summaryStatus) return false;
    if (filters.manualReviewNeeded === "true" && !row.displayState.manualReviewNeeded) return false;
    return true;
  });

  return (
    <div className="panel">
      <h1>Cases</h1>
      <p className="muted">
        Consumer self-check flow · Provider event payloads are redacted · Do not use this tool to approve, deny, rank, or score a person
      </p>
      <form>
        <input name="email" placeholder="Email" defaultValue={filters.email ?? ""} />
        <select name="status" defaultValue={filters.status ?? ""}>
          <option value="">Any case status</option>
          {["DRAFT", "IN_REVIEW", "ACTION_REQUIRED", "SUBMITTED", "CLOSED"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select name="paymentStatus" defaultValue={filters.paymentStatus ?? ""}>
          <option value="">Any payment</option>
          <option value="PENDING">Pending payment</option>
          <option value="PAID">Paid</option>
          <option value="PAYMENT_FAILED">Payment failed</option>
        </select>
        <input name="invitationStatus" placeholder="Invitation status" defaultValue={filters.invitationStatus ?? ""} />
        <input name="reportStatus" placeholder="Report status" defaultValue={filters.reportStatus ?? ""} />
        <select name="summaryStatus" defaultValue={filters.summaryStatus ?? ""}>
          <option value="">Any summary</option>
          <option value="summary_ready">Summary ready</option>
          <option value="summary_failed">Summary failed</option>
          <option value="summary_missing">Summary pending</option>
        </select>
        <select name="monitoringStatus" defaultValue={filters.monitoringStatus ?? ""}>
          <option value="">Any monitoring</option>
          <option value="ACTIVE">Monitoring active</option>
          <option value="CANCELED">Monitoring canceled</option>
          <option value="REVOKED">Monitoring revoked</option>
        </select>
        <select name="anonymizationStatus" defaultValue={filters.anonymizationStatus ?? ""}>
          <option value="">Any anonymization</option>
          <option value="none">Not anonymized</option>
          <option value="requested">Requested</option>
          <option value="completed">Anonymized</option>
        </select>
        <label>
          <input name="manualReviewNeeded" type="checkbox" value="true" defaultChecked={filters.manualReviewNeeded === "true"} /> Manual review needed
        </label>
        <input name="createdFrom" type="date" defaultValue={filters.createdFrom ?? ""} />
        <input name="updatedFrom" type="date" defaultValue={filters.updatedFrom ?? ""} />
        <button className="button" type="submit">
          Filter
        </button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Case</th>
            <th>Customer</th>
            <th>Email</th>
            <th>Payment</th>
            <th>Checkr/report</th>
            <th>AI summary</th>
            <th>Readiness</th>
            <th>Monitoring</th>
            <th>Latest audit</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.customerLabel}</td>
              <td>{row.email ?? "Anonymized"}</td>
              <td>{row.paymentStatus}</td>
              <td>
                {row.invitationStatus} · {row.reportStatus}
              </td>
              <td>{row.summaryStatus}</td>
              <td>{row.expungementReadinessStatus}</td>
              <td>{row.monitoringStatus}</td>
              <td>{row.latestAuditAt?.toLocaleString() ?? "none"}</td>
              <td>
                <Link href={`/admin/cases/${row.id}`}>View details</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
