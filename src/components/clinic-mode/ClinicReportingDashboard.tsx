import type { ClinicEventReport } from "@/lib/clinic-mode/types";

export function ClinicReportingDashboard({ report }: { report: ClinicEventReport }) {
  const allocation = report.sponsorship.allocation;
  const committed = report.sponsorship.reserved + report.sponsorship.consumed;
  return <div className="space-y-6">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Event entries" value={report.entries} note={`capacity ${report.capacity}`} />
      <Metric label="Clinic cases" value={report.participants} note="aggregate only" />
      <Metric label="Packets consumed" value={report.sponsorship.consumed} note={`${report.sponsorship.reserved} reserved`} />
      <Metric label="Allocation remaining" value={allocation === null ? "Base entitlement" : Math.max(0, allocation - committed)} note={`${report.sponsorship.released} released`} />
    </section>
    <section className="grid gap-6 lg:grid-cols-3">
      <Breakdown title="Queue" counts={report.queueCounts} />
      <Breakdown title="Nationwide route" counts={report.routeCounts} />
      <Breakdown title="Follow-up" counts={report.followUpCounts} />
    </section>
    <section className="rounded-xl border border-[#D9E5DF] bg-[#F3F8F5] p-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#1D9E75]">Privacy boundary</p><h2 className="mt-2 text-xl font-black text-[#0F1E3D]">Aggregate event reporting</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#50635B]">This report returns counts only. It contains no participant, account, matter, Briefcase, packet, court, form, upload, or message identity.</p><p className="mt-4 text-sm font-bold text-[#29453B]">Open incidents: {report.incidents.open} · Resolved/closed: {report.incidents.resolved}</p></section>
  </div>;
}

function Metric({ label, value, note }: { label: string; value: number | string; note: string }) {
  return <div className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#6B625B]">{label}</p><p className="mt-3 text-3xl font-black text-[#0F1E3D]">{value}</p><p className="mt-1 text-sm text-[#6B625B]">{note}</p></div>;
}

function Breakdown({ title, counts }: { title: string; counts: Record<string, number> }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return <section className="rounded-xl border border-[#E8DED3] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#0F1E3D]">{title}</h2><div className="mt-4 divide-y divide-[#EEE6DB]">{rows.map(([label, count]) => <div key={label} className="flex justify-between gap-4 py-3 text-sm"><span className="font-semibold text-[#5C5750]">{label.replaceAll("_", " ")}</span><span className="font-black text-[#0F1E3D]">{count}</span></div>)}{rows.length === 0 ? <p className="py-5 text-sm text-[#6B625B]">No activity yet.</p> : null}</div></section>;
}
