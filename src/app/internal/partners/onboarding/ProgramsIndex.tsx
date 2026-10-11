import Link from "next/link";
import type { InternalProvisioningRecord } from "@/lib/partners/partner-repository";
import { workspaceStatusLabel } from "@/lib/partners/onboarding/partner-labels";
import { PROGRAM_JURISDICTIONS, programServiceArea } from "@/lib/partners/onboarding/program-defaults";

export type ProgramFilters = { q?: string; operator?: string; state?: string; status?: string; owner?: string };
const control = "mt-2 min-h-11 w-full rounded border bg-white px-3 font-normal";
export function ProgramsIndex({ records, filters }: { records: InternalProvisioningRecord[] | null; filters: ProgramFilters }) {
  const query = (filters.q ?? "").trim();
  const visible = records?.filter(record =>
    `${record.organization_name} ${record.partner_name} ${record.program_name} ${record.partner_slug} ${programServiceArea(record.jurisdictions ?? [])} ${(record.jurisdictions ?? []).join(" ")} ${record.operating_model?.replaceAll("_", "-") ?? ""} ${record.workspace_status ? workspaceStatusLabel(record.workspace_status) : ""}`.toLowerCase().includes(query.toLowerCase()) &&
    (!filters.operator || record.operating_model === filters.operator) &&
    (!filters.state || record.jurisdictions?.includes(filters.state)) &&
    (!filters.status || record.workspace_status === filters.status) &&
    (!filters.owner || record.next_action_owner === filters.owner)
  );
  return <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold text-[#08786F]">RCAP</p><h1 className="mt-2 text-3xl font-black">Programs</h1><p className="mt-3 max-w-2xl text-grayWilma-700">Configure programs, review current materials, and manage live operations.</p></div>
      <Link href="/internal/partners/provisioning/new" className="inline-flex min-h-11 items-center rounded-md bg-[#C2350A] px-5 py-3 font-bold text-white">Create program</Link>
    </header>
    <form className="mt-6 grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
      <label className="font-bold sm:col-span-2 lg:col-span-3">Find a program<input name="q" defaultValue={query} type="search" className={control} placeholder="Organization, program, or page address" /></label>
      <label className="font-bold">Operator<select name="operator" defaultValue={filters.operator ?? ""} className={control}><option value="">All operators</option><option value="legalease_managed">LegalEase-managed</option><option value="partner_managed">Partner-managed</option></select></label>
      <label className="font-bold">Jurisdiction<select name="state" defaultValue={filters.state ?? ""} className={control}><option value="">All jurisdictions</option>{Object.entries(PROGRAM_JURISDICTIONS).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
      <label className="font-bold">Status<select name="status" defaultValue={filters.status ?? ""} className={control}><option value="">All statuses</option>{["draft", "commercially_blocked", "setup_in_progress", "waiting_on_partner", "ready_for_review", "ready_to_launch", "live", "paused", "closed"].map(status => <option key={status} value={status}>{workspaceStatusLabel(status)}</option>)}</select></label>
      <label className="font-bold">Next owner<select name="owner" defaultValue={filters.owner ?? ""} className={control}><option value="">All owners</option>{[...new Set(records?.map(record => record.next_action_owner).filter((owner): owner is string => Boolean(owner)))].sort().map(owner => <option key={owner} value={owner}>{owner.replaceAll("_", " ")}</option>)}</select></label>
      <div className="flex items-end gap-4"><button className="min-h-11 rounded bg-navy px-5 font-bold text-white">Search</button><Link className="inline-flex min-h-11 items-center underline" href="/internal/partners/onboarding">Clear filters</Link></div>
    </form>
    {records !== null ? <p className="mt-5 text-sm" role="status">{visible?.length} programs found</p> : null}
    <div className="mt-4 grid gap-4 md:grid-cols-2">{visible?.map(record => <article key={record.id} className="rounded-xl border bg-white p-6 shadow-sm">
      <p className="text-sm text-grayWilma-700">{record.organization_name || record.partner_name}</p><h2 className="mt-1 text-xl font-bold">{record.program_name || record.partner_name}</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="inline font-bold">Operator: </dt><dd className="inline">{record.operating_model === "legalease_managed" ? "LegalEase" : record.operating_model === "partner_managed" ? "Partner-managed" : "Not configured"}</dd></div>
        <div><dt className="inline font-bold">Selected jurisdictions: </dt><dd className="inline">{programServiceArea(record.jurisdictions ?? []) || "Not configured"}</dd></div>
        <div><dt className="inline font-bold">Services: </dt><dd className="inline">{record.service_mode?.replaceAll("_", " ") || "Review documented service terms"}</dd></div>
        <div><dt className="inline font-bold">Status: </dt><dd className="inline">{record.workspace_status === "live" ? "Launch recorded · open program to verify current public status" : record.workspace_status ? workspaceStatusLabel(record.workspace_status) : "Setup not started"}</dd></div>
        <div><dt className="inline font-bold">Last saved: </dt><dd className="inline">{record.workspace_updated_at ? new Date(record.workspace_updated_at).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC" : "Unavailable"}</dd></div>
        <div><dt className="inline font-bold">Next owner: </dt><dd className="inline">{record.next_action_owner?.replaceAll("_", " ") || record.assigned_owner || "Open program for current requirements"}</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-3"><Link href={`/internal/partners/onboarding/${encodeURIComponent(record.partner_slug)}`} className="inline-flex min-h-11 items-center rounded-md bg-navy px-4 py-2 font-bold text-white">Open program</Link><Link href={`/internal/clinic?partner=${encodeURIComponent(record.partner_slug)}`} className="inline-flex min-h-11 items-center underline">Clinics</Link></div>
    </article>)}</div>
    {records === null ? <p role="alert" className="mt-6">Program data is unavailable. <Link className="underline" href="/internal/partners/onboarding">Reload programs</Link></p> : !records.length ? <p className="mt-6">No programs recorded yet. Create your first program to begin.</p> : !visible?.length ? <p className="mt-6">No programs match these filters. Clear filters to see all programs.</p> : null}
  </main>;
}
