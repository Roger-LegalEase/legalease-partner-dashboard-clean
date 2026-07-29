import { FirstAdminAccessPanel } from "@/app/internal/partners/provisioning/[partnerSlug]/FirstAdminAccessPanel";
import type { FirstAdminAccessView } from "@/lib/partners/first-admin-service";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";

export default async function FirstAdminHarnessPage({
  searchParams
}: {
  searchParams: Promise<{ state?: string; partner?: string }>;
}) {
  const query = await searchParams;
  const second = query.partner === "second";
  const partner = {
    partnerSlug: second ? "second-chance-network" : "community-justice",
    publicName: second ? "Second Chance Network" : "Community Justice Initiative",
    legalName: second
      ? "Second Chance Network, Inc."
      : "Community Justice Initiative, Inc.",
    jurisdiction: second ? "Georgia" : "Mississippi",
    selectedPackage: "Implementation Program"
  };
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <p className="text-xs font-black uppercase tracking-wide text-orange">
          Internal LegalEase operations
        </p>
        <h1 className="mt-3 text-3xl font-black md:text-4xl">
          {partner.publicName}
        </h1>
        <p className="mt-2 text-sm text-grayWilma-700">
          Legal name: {partner.legalName} · Jurisdiction: {partner.jurisdiction} · Package: {partner.selectedPackage}
        </p>
        <FirstAdminAccessPanel
          initialAccess={view(query.state ?? "none", second)}
          onboardingEnabled={isRcapPartnerOnboardingEnabled()}
          partner={partner}
        />
      </div>
    </main>
  );
}

function view(state: string, second: boolean): FirstAdminAccessView {
  const base = {
    workspaceExists: true,
    emailDeliveryConfigured: false,
    history: []
  };
  const invitation = {
    invitationId: "e4261a54-f330-467a-8028-c1b770dd68e9",
    fullName: second ? "Morgan Lee" : "Jordan Taylor",
    email: second ? "morgan@secondchance.example" : "jordan@communityjustice.example",
    role: "partner_admin" as const,
    status: state === "expired" ? "expired" as const : state === "revoked" ? "revoked" as const : "pending" as const,
    createdAt: "2026-07-29T12:00:00.000Z",
    expiresAt: state === "expired" ? "2026-07-28T12:00:00.000Z" : "2026-08-01T12:00:00.000Z",
    deliveryStatus: "not_requested" as const
  };
  if (state === "active") {
    return {
      ...base,
      accessStatus: "administrator_active",
      statusLabel: "Administrator active",
      invitation: { ...invitation, status: "accepted" },
      administrator: {
        fullName: invitation.fullName,
        email: invitation.email,
        role: "partner_admin",
        accountStatus: "active",
        membershipStatus: "active"
      }
    };
  }
  if (state === "expired") {
    return {
      ...base,
      accessStatus: "invitation_expired",
      statusLabel: "Invitation expired",
      invitation,
      administrator: null
    };
  }
  if (state === "revoked") {
    return {
      ...base,
      accessStatus: "invitation_revoked",
      statusLabel: "Invitation revoked",
      invitation,
      administrator: null
    };
  }
  if (state === "pending") {
    return {
      ...base,
      accessStatus: "invitation_pending",
      statusLabel: "Invitation pending",
      invitation,
      administrator: null
    };
  }
  return {
    ...base,
    accessStatus: "no_administrator",
    statusLabel: "No administrator configured",
    invitation: null,
    administrator: null
  };
}
