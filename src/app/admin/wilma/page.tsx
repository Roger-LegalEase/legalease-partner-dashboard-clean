import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { documentPrepProductKey } from "@/lib/billing/products";
import { prisma } from "@/lib/prisma";
import {
  asWilmaAdminDecision,
  asWilmaAdminFacts,
  formatWilmaAdminDateTime,
  wilmaConversionLabel,
  wilmaLaunchConfigSummary
} from "@/wilma/admin/view";
import { getWilmaLaunchConfig } from "@/wilma/launch/config";

type SearchParams = {
  status?: string;
  state?: string;
  email?: string;
};

export default async function AdminWilmaPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const filters = await searchParams;
  const sessions = await prisma.wilmaChatSession.findMany({
    where: buildWhere(filters),
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      user: true,
      case: true,
      messages: { orderBy: { createdAt: "asc" } }
    }
  });
  const productOrders = await loadDocumentPrepOrders(sessions);
  const launchConfig = wilmaLaunchConfigSummary(getWilmaLaunchConfig());

  return (
    <div className="admin-wilma">
      <div className="panel">
        <div className="admin-wilma__header">
          <div>
            <h1>Wilma QA</h1>
            <p className="muted">Review eligibility sessions, transcripts, extraction output, and checkout handoff status.</p>
          </div>
          <span className="admin-wilma__count">{sessions.length} sessions</span>
        </div>

        <section className="admin-wilma__launch" aria-label="Wilma launch controls">
          <h2>Launch controls</h2>
          <dl>
            {launchConfig.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <form className="admin-wilma__filters">
          <input name="email" placeholder="Email" defaultValue={filters.email ?? ""} />
          <input name="state" placeholder="State" defaultValue={filters.state ?? ""} maxLength={2} />
          <select name="status" defaultValue={filters.status ?? ""}>
            <option value="">Any status</option>
            {[
              "needs_information",
              "likely_eligible_for_document_prep",
              "manual_review",
              "likely_ineligible",
              "not_started"
            ].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button className="button" type="submit">
            Filter
          </button>
        </form>

        <div className="admin-wilma__grid">
          <section className="admin-wilma__sessions" aria-label="Wilma sessions">
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Status</th>
                  <th>State</th>
                  <th>Conversion</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const facts = asWilmaAdminFacts(session.facts);
                  const decision = asWilmaAdminDecision(session.decision);
                  const order = findOrder(productOrders, session.userId, session.leadEmail ?? session.user.email);

                  return (
                    <tr key={session.id}>
                      <td>
                        <Link href={`/admin/wilma/${session.id}`}>
                          <strong>{session.leadEmail ?? session.user.email}</strong>
                          <span>{session.case?.displayName ?? session.id}</span>
                        </Link>
                      </td>
                      <td>{decision?.status ?? "not_started"}</td>
                      <td>{facts.state ?? "unknown"}</td>
                      <td>{wilmaConversionLabel(session.documentPrepHandoffAt, order?.status, session.leadEmail)}</td>
                      <td>{formatWilmaAdminDateTime(session.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}

function buildWhere(filters: SearchParams): Prisma.WilmaChatSessionWhereInput {
  const where: Prisma.WilmaChatSessionWhereInput = {};

  if (filters.email) {
    where.OR = [
      { leadEmail: { contains: filters.email, mode: "insensitive" } },
      { user: { email: { contains: filters.email, mode: "insensitive" } } }
    ];
  }

  if (filters.state) {
    where.facts = {
      path: ["state"],
      equals: filters.state.trim().toUpperCase()
    };
  }

  if (filters.status) {
    where.decision = {
      path: ["status"],
      equals: filters.status
    };
  }

  return where;
}

async function loadDocumentPrepOrders(
  sessions: Array<{ userId: string; leadEmail: string | null; user: { email: string } }>
) {
  const userIds = Array.from(new Set(sessions.map((session) => session.userId)));
  const emails = Array.from(
    new Set(sessions.flatMap((session) => [session.leadEmail, session.user.email]).filter(Boolean))
  ) as string[];

  if (userIds.length === 0 && emails.length === 0) {
    return [];
  }

  return prisma.productOrder.findMany({
    where: {
      productKey: documentPrepProductKey,
      OR: [{ userId: { in: userIds } }, { email: { in: emails } }]
    },
    orderBy: { updatedAt: "desc" },
    take: 200
  });
}

function findOrder(
  orders: Awaited<ReturnType<typeof loadDocumentPrepOrders>>,
  userId: string,
  email: string | null
) {
  return orders.find((order) => order.userId === userId || (email && order.email === email));
}
