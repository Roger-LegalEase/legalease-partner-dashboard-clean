import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getBetaFlagStatus } from "@/lib/beta";
import { prisma } from "@/lib/prisma";
import { productConfig } from "@/lib/product-config";

export default async function DashboardPage() {
  const user = await requireUser();
  const [invitationUrl, alerts] = await Promise.all([
    getLatestInvitationUrl(user.email),
    prisma.monitoringAlert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10
    }).catch(() => [])
	  ]);
  const flags = getBetaFlagStatus();

  return (
    <div className="panel">
      <h1>Personal self-check dashboard</h1>
      <p className="muted">Welcome back, {user.email}.</p>
      <p className="muted">
        LegalEase RecordShield is for personal self-review only. It is not for employment, tenant, credit,
        insurance, or eligibility decisions, and it is not a final legal determination.
      </p>
      {invitationUrl ? (
        <section>
          <h2>Provider invitation</h2>
          <p className="muted">
            You requested a personal background check on yourself. Checkr may collect sensitive information through
            its hosted flow; LegalEase avoids storing SSNs, full dates of birth, driver license numbers, and unnecessary
            sensitive provider data.
          </p>
          <p>
            <a className="button" href={invitationUrl}>
              Complete your secure Checkr invitation
            </a>
          </p>
        </section>
      ) : null}
      <h2>Monitoring alert history</h2>
      {alerts.length > 0 ? (
        <ul>
          {alerts.map((alert) => (
            <li key={alert.id}>
              <strong>{alert.title}</strong> <span className="muted">{alert.createdAt.toLocaleDateString()}</span>
              <br />
              {alert.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No monitoring alerts yet.</p>
      )}
      {flags.monitoringPurchaseEnabled ? (
        <>
          <h2>Available plans</h2>
          <p className="muted">
            Monitoring alerts do not guarantee detection of every record or change. Check your dashboard for details
            rather than relying on email content.
          </p>
          <ul>
            {Object.values(productConfig).map((product) => (
              <li key={product.key}>
                {product.name}: {product.formattedPrice}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">Monitoring purchases are paused for this beta cohort.</p>
      )}
      <p>
        <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> ·{" "}
        <Link href="/support">Support</Link> · <Link href="/data-deletion">Data deletion</Link>
      </p>
    </div>
  );
}

async function getLatestInvitationUrl(email: string): Promise<string | null> {
  try {
    const invitation = await prisma.providerInvitation.findFirst({
      where: { candidate: { email }, invitationUrl: { not: "" } },
      orderBy: { createdAt: "desc" },
      select: { invitationUrl: true }
    });
    return invitation?.invitationUrl ?? null;
  } catch {
    return null;
  }
}
