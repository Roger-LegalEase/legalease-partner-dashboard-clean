import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import Link from "next/link";
import { listInternalProvisioningRecords } from "@/lib/partners/partner-repository";
import { workspaceStatusLabel } from "@/lib/partners/onboarding/partner-labels";

export const dynamic = "force-dynamic";
export default async function LaunchStudioIndex() {
  const access = await resolveInternalAdminPageAccess("/internal/partners/onboarding");
  if (access.kind === "denied") return <InternalAdminDenied title={access.title} body={access.body} email={access.email} />;
  const records = await listInternalProvisioningRecords().catch(() => null);
  return <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold text-teal">RCAP</p><h1 className="mt-2 text-3xl font-black">Partner Launch Studio</h1><p className="mt-3 max-w-2xl text-grayWilma-700">Prepare your partner’s program, review its page, and see who owns each remaining task.</p></div>
      <Link href="/internal/partners/provisioning/new" className="inline-flex min-h-11 items-center rounded-md bg-orange px-5 py-3 font-bold text-white">Create partner</Link>
    </header>
    <p className="mt-5 text-sm text-grayWilma-700">Source: current partner records and canonical program workspaces. Setup approval is separate from launch verification.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">{records?.map(record=><article key={record.id} className="rounded-xl border border-grayWilma-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold">{record.organization_name || record.partner_name}</h2>
      <p className="mt-3 font-semibold text-teal">{record.workspace_status === "ready_to_launch" ? "Setup approved; launch review remaining" : record.workspace_status === "live" ? "Launch recorded; review public status" : record.workspace_status ? workspaceStatusLabel(record.workspace_status) : "Program setup not started"}</p>
      <p className="mt-3 text-sm">Last saved: {record.workspace_updated_at ? new Date(record.workspace_updated_at).toLocaleString("en-US", {timeZone:"UTC"}) + " UTC" : "Unavailable"}</p>
      <p className="mt-3 text-sm">Owner: {record.assigned_owner || "LegalEase assignment not recorded"}</p>
      <Link href={`/internal/partners/onboarding/${encodeURIComponent(record.partner_slug)}`} className="mt-4 inline-flex min-h-11 items-center rounded-md bg-navy px-4 py-2 font-bold text-white">Resume program →</Link>
    </article>)}</div>
    {records === null ? <p role="alert" className="mt-6">Partner data is unavailable. Reload to retry.</p> : records.length === 0 ? <p className="mt-6">No partner programs recorded yet.</p> : null}
  </main>;
}
