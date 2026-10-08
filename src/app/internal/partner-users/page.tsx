import Link from "next/link";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function AccessAndTeamPage() {
  const access = await resolveInternalAdminPageAccess("/internal/partner-users");
  if (access.kind === "denied") return <InternalAdminDenied title={access.title} body={access.body} email={access.email} />;
  const admin = getSupabaseAdminClient();
  const result = admin ? await admin.from("partner_users").select("id,partner_slug,role,status", {count:"exact"}).order("id").limit(100) : null;
  const unavailable = !result || Boolean(result.error);
  return <main className="mx-auto w-full max-w-5xl px-4 py-10">
    <h1 className="text-3xl font-black">Access and team</h1>
    <p className="mt-4 text-sm">Source: server-verified partner memberships. As of {new Date().toISOString()}.</p>
    <Link href="/internal/partner-users/new" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-navy px-5 py-3 font-bold text-white">Open authorized partner invitation tool</Link>
    <p className="mt-6 rounded-xl border border-grayWilma-200 bg-white p-5 text-sm">Assigned Partner Success Manager permissions remain disabled pending approval of the assignment, capability and tenant policies. No new roles have been granted.</p>
    {unavailable ? <p className="mt-6" role="alert">Membership data unavailable. Reload to retry.</p> : <div className="mt-6 overflow-x-auto"><p className="mb-3 text-sm">Showing {result.data?.length ?? 0} of {result.count ?? "unknown"} membership records.</p><table className="w-full text-left text-sm"><caption className="sr-only">Recorded memberships</caption><thead><tr><th className="p-3">Partner scope</th><th className="p-3">Role</th><th className="p-3">Status</th></tr></thead><tbody>{result.data?.map(row=><tr key={row.id} className="border-t border-grayWilma-200"><td className="p-3">{row.partner_slug ?? "LegalEase internal"}</td><td className="p-3">{row.role}</td><td className="p-3">{row.status}</td></tr>)}</tbody></table></div>}
  </main>;
}
