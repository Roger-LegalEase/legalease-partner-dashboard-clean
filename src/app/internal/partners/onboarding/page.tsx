import Link from "next/link";
import { InternalAdminDenied, resolveInternalAdminPageAccess } from "@/lib/partners/internal-admin-gate";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";
import { listOnboardingSummaries, statusLabel, type OnboardingSummary } from "@/lib/partners/partner-onboarding";

export const dynamic = "force-dynamic";

const ACCESS_MODE_LABELS: Record<string, string> = {
  open: "Open Link",
  optional_code: "Optional Code",
  required_code: "Access Code Required",
  invite_only: "Invite Only"
};

const AGREEMENT_LABELS: Record<string, string> = {
  not_sent: "Not sent",
  sent: "Sent",
  signed: "Signed",
  waived_internal: "Waived (internal)"
};

export default async function InternalOnboardingDashboard() {
  const access = await resolveInternalAdminPageAccess("/internal/partners/onboarding");
  if (access.kind === "denied") {
    return <InternalAdminDenied title={access.title} body={access.body} />;
  }
  const phase1Enabled = isRcapPartnerOnboardingEnabled();

  let partners: OnboardingSummary[] = [];
  let loadError: string | null = null;
  try {
    partners = await listOnboardingSummaries();
  } catch {
    loadError = "Onboarding data is temporarily unavailable.";
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#0F1E3D]">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Partner onboarding</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#5C5750]">
              {phase1Enabled
                ? "Open an existing partner to provision and review its secure Phase 1 RCAP onboarding workspace. This table remains a read-only compatibility index; Phase 1 does not create partners, send invitations, publish pages, or activate programs."
                : "Set up every RCAP partner from one place: profile, billing, access codes, landing page, admins, and launch materials. A partner only goes live when required steps are complete."}
            </p>
          </div>
          {phase1Enabled ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex min-h-10 items-center rounded-full border border-orange/30 bg-orange/10 px-4 py-2 text-xs font-black text-orange">
                Phase 1 review mode
              </span>
              <Link
                href="/internal/partners/onboarding/new"
                className="inline-flex min-h-10 items-center rounded-md bg-navy px-4 py-2 text-sm font-black text-white hover:bg-navy-mid"
              >
                Open existing partner
              </Link>
            </div>
          ) : (
            <Link
              href="/internal/partners/onboarding/new"
              className="rounded-md bg-[#D85A30] px-5 py-2.5 text-sm font-black text-white hover:bg-[#BF4B25]"
            >
              Start a new partner
            </Link>
          )}
        </header>

        {loadError ? <p className="mb-4 rounded-md border border-[#F3C9B8] bg-[#FDF1E8] px-4 py-3 text-sm text-[#9A3412]">{loadError}</p> : null}

        <div className="overflow-x-auto rounded-lg border border-[#EEE6DB] bg-white">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#EEE6DB] text-xs font-black uppercase tracking-wide text-[#8A8278]">
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Page address</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Packet Cap</th>
                <th className="px-4 py-3">Packets Used</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Agreement</th>
                <th className="px-4 py-3">Ready to Launch</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-[#8A8278]">
                    {phase1Enabled
                      ? "No existing partners are available in this compatibility index."
                      : "No partners in onboarding yet. Start a new partner to begin."}
                  </td>
                </tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.partnerSlug} className="border-b border-[#F3EEE5]">
                    <td className="px-4 py-3 font-bold">{p.organizationName}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-[#5C5750]">/p/{p.partnerSlug}</td>
                    <td className="px-4 py-3">{statusLabel(p.status)}</td>
                    <td className="px-4 py-3">{p.packetCap}</td>
                    <td className="px-4 py-3">{p.packetsUsed}</td>
                    <td className="px-4 py-3">{ACCESS_MODE_LABELS[p.accessMode] ?? p.accessMode}</td>
                    <td className="px-4 py-3">{AGREEMENT_LABELS[p.agreementStatus] ?? p.agreementStatus}</td>
                    <td className="px-4 py-3">{p.launchReady ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 text-[#8A8278]">{formatDate(p.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/internal/partners/onboarding/${p.partnerSlug}`} className="font-bold text-[#1D9E75] hover:text-[#0F1E3D]">
                        {phase1Enabled ? "Open Phase 1" : "Manage"}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}
