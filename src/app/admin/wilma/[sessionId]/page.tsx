import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { documentPrepProductKey } from "@/lib/billing/products";
import { prisma } from "@/lib/prisma";
import { wilmaEligibilityRuleVersion } from "@/lib/wilma";
import {
  asWilmaAdminDecision,
  asWilmaAdminFacts,
  formatWilmaAdminDateTime,
  prettyWilmaJson,
  wilmaReasonCodes
} from "@/wilma/admin/view";
import type { WilmaAnalyticsEvent } from "@/wilma/analytics/types";

export default async function AdminWilmaSessionPage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await requireAdmin();
  const { sessionId } = await params;
  const session = await prisma.wilmaChatSession.findUnique({
    where: { id: sessionId },
    include: {
      user: true,
      case: true,
      messages: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!session) {
    notFound();
  }

  const facts = asWilmaAdminFacts(session.facts);
  const decision = asWilmaAdminDecision(session.decision);
  const order = await loadDocumentPrepOrder(session);
  const events = await loadSessionEvents(session.id);
  const riskFlags = Array.from(new Set(events.flatMap((event) => event.riskFlags)));
  const fulfillment = buildFulfillmentStatus(events, order);

  return (
    <div className="admin-wilma">
      <div className="panel">
        <div className="admin-wilma__header">
          <div>
            <Link href="/admin/wilma">Back to Wilma sessions</Link>
            <h1>Wilma Session</h1>
            <p className="muted">{session.leadEmail ?? session.user.email}</p>
          </div>
          <span className="admin-wilma__count">{decision?.status ?? "not_started"}</span>
        </div>

        <div className="admin-wilma__grid">
          <section className="admin-wilma__details" aria-label="Wilma session details">
            <section>
              <h2>Decision</h2>
              <dl className="admin-wilma__meta">
                <div>
                  <dt>Status</dt>
                  <dd>{decision?.status ?? "not_started"}</dd>
                </div>
                <div>
                  <dt>State</dt>
                  <dd>{facts.state ?? "unknown"}</dd>
                </div>
                <div>
                  <dt>Rule version</dt>
                  <dd>{decision?.ruleVersion ?? wilmaEligibilityRuleVersion}</dd>
                </div>
                <div>
                  <dt>Document target</dt>
                  <dd>{decision?.documentTarget ?? "none"}</dd>
                </div>
                <div>
                  <dt>Decision ID</dt>
                  <dd>{session.decisionId ?? decision?.id ?? "none"}</dd>
                </div>
              </dl>
              <h3>Reason codes</h3>
              {wilmaReasonCodes(decision).length ? (
                <ul className="admin-wilma__codes">
                  {wilmaReasonCodes(decision).map((code) => (
                    <li key={code}>
                      <strong>{code}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No rule reasons recorded.</p>
              )}
            </section>

            <section>
              <h2>Checkout Payment Order</h2>
              <dl className="admin-wilma__meta">
                <div>
                  <dt>Email captured</dt>
                  <dd>{session.leadEmail ?? "none"}</dd>
                </div>
                <div>
                  <dt>Checkout created</dt>
                  <dd>{fulfillment.checkoutCreatedAt ? formatWilmaAdminDateTime(fulfillment.checkoutCreatedAt) : "none"}</dd>
                </div>
                <div>
                  <dt>Checkout session</dt>
                  <dd>{fulfillment.checkoutSessionId ?? "none"}</dd>
                </div>
                <div>
                  <dt>Payment provider</dt>
                  <dd>{fulfillment.paymentProvider ?? "none"}</dd>
                </div>
                <div>
                  <dt>Checkout status</dt>
                  <dd>{order?.status ?? "none"}</dd>
                </div>
                <div>
                  <dt>Paid at</dt>
                  <dd>{fulfillment.paymentSucceededAt ? formatWilmaAdminDateTime(fulfillment.paymentSucceededAt) : "not paid"}</dd>
                </div>
                <div>
                  <dt>Order created</dt>
                  <dd>{fulfillment.orderCreatedAt ? formatWilmaAdminDateTime(fulfillment.orderCreatedAt) : "none"}</dd>
                </div>
                <div>
                  <dt>Order ID</dt>
                  <dd>{fulfillment.orderId ?? "none"}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h2>Document Tracker Fulfillment</h2>
              <dl className="admin-wilma__meta">
                <div>
                  <dt>Generation started</dt>
                  <dd>{fulfillment.documentGenerationStartedAt ? formatWilmaAdminDateTime(fulfillment.documentGenerationStartedAt) : "not started"}</dd>
                </div>
                <div>
                  <dt>Generation succeeded</dt>
                  <dd>{fulfillment.documentGenerationSucceededAt ? formatWilmaAdminDateTime(fulfillment.documentGenerationSucceededAt) : "not completed"}</dd>
                </div>
                <div>
                  <dt>Generation failed</dt>
                  <dd>{fulfillment.documentGenerationFailedAt ? formatWilmaAdminDateTime(fulfillment.documentGenerationFailedAt) : "no"}</dd>
                </div>
                <div>
                  <dt>Tracker created</dt>
                  <dd>{fulfillment.trackerCreatedAt ? formatWilmaAdminDateTime(fulfillment.trackerCreatedAt) : "not created"}</dd>
                </div>
                <div>
                  <dt>Document handoff</dt>
                  <dd>{session.documentPrepHandoffAt ? formatWilmaAdminDateTime(session.documentPrepHandoffAt) : "not requested"}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h2>Risk Flags</h2>
              {riskFlags.length ? (
                <ul className="admin-wilma__codes">
                  {riskFlags.map((flag) => (
                    <li key={flag}>
                      <strong>{flag}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No risk flags recorded.</p>
              )}
            </section>

            <section>
              <h2>Analytics Events</h2>
              <div className="admin-wilma__transcript">
                {events.map((event) => (
                  <article key={`${event.event}-${event.createdAt}`} className="admin-wilma__message">
                    <strong>{event.event}</strong>
                    <p>{event.reasonCodes?.join(", ") || event.riskFlags.join(", ") || "No codes"}</p>
                    <span>{formatWilmaAdminDateTime(new Date(event.createdAt))}</span>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2>Transcript</h2>
              <div className="admin-wilma__transcript">
                {session.messages.map((message) => (
                  <article key={message.id} className={`admin-wilma__message admin-wilma__message--${message.role}`}>
                    <strong>{message.role}</strong>
                    <p>{message.content}</p>
                    <span>{formatWilmaAdminDateTime(message.createdAt)}</span>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2>Extracted Facts</h2>
              <pre>{prettyWilmaJson(facts)}</pre>
            </section>
          </section>
        </div>
      </div>
    </div>
  );
}

async function loadDocumentPrepOrder(session: {
  userId: string;
  leadEmail: string | null;
  user: { email: string };
}) {
  return prisma.productOrder.findFirst({
    where: {
      productKey: documentPrepProductKey,
      OR: [
        { userId: session.userId },
        { email: session.leadEmail ?? session.user.email }
      ]
    },
    orderBy: { updatedAt: "desc" }
  });
}

async function loadSessionEvents(sessionId: string): Promise<WilmaAnalyticsEvent[]> {
  const rows = await prisma.auditEvent.findMany({
    where: {
      action: { startsWith: "wilma_" },
      targetId: sessionId
    },
    orderBy: { createdAt: "asc" },
    take: 200
  });

  return rows.flatMap((row) => {
    const event = parseWilmaAnalyticsEvent(row.metadata);
    return event ? [event] : [];
  });
}

function parseWilmaAnalyticsEvent(value: unknown): WilmaAnalyticsEvent | null {
  if (!isRecord(value) || typeof value.event !== "string" || typeof value.wilmaSessionId !== "string") {
    return null;
  }

  return {
    event: value.event as WilmaAnalyticsEvent["event"],
    wilmaSessionId: value.wilmaSessionId,
    actorUserId: stringOrUndefined(value.actorUserId),
    leadId: stringOrUndefined(value.leadId),
    emailHash: stringOrUndefined(value.emailHash),
    state: stringOrUndefined(value.state),
    decisionStatus: stringOrUndefined(value.decisionStatus) as WilmaAnalyticsEvent["decisionStatus"],
    documentTarget: stringOrUndefined(value.documentTarget) as WilmaAnalyticsEvent["documentTarget"],
    ruleVersion: stringOrUndefined(value.ruleVersion),
    reasonCodes: Array.isArray(value.reasonCodes) ? value.reasonCodes.filter((code): code is string => typeof code === "string") : undefined,
    orderId: stringOrUndefined(value.orderId),
    checkoutSessionId: stringOrUndefined(value.checkoutSessionId),
    paymentProvider: stringOrUndefined(value.paymentProvider) as WilmaAnalyticsEvent["paymentProvider"],
    riskFlags: Array.isArray(value.riskFlags) ? value.riskFlags.filter((flag): flag is WilmaAnalyticsEvent["riskFlags"][number] => typeof flag === "string") : [],
    metadata: isRecord(value.metadata) ? value.metadata : undefined,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date(0).toISOString()
  };
}

function buildFulfillmentStatus(
  events: WilmaAnalyticsEvent[],
  order: Awaited<ReturnType<typeof loadDocumentPrepOrder>>
) {
  const checkoutCreated = findEvent(events, "wilma_checkout_created");
  const paymentSucceeded = findEvent(events, "wilma_payment_succeeded");
  const orderCreated = findEvent(events, "wilma_order_created");
  const documentStarted = findEvent(events, "wilma_document_generation_started");
  const documentSucceeded = findEvent(events, "wilma_document_generation_succeeded");
  const documentFailed = findEvent(events, "wilma_document_generation_failed");
  const trackerCreated = findEvent(events, "wilma_tracker_created");

  return {
    checkoutCreatedAt: dateFromEvent(checkoutCreated),
    checkoutSessionId: checkoutCreated?.checkoutSessionId ?? paymentSucceeded?.checkoutSessionId,
    paymentProvider: paymentSucceeded?.paymentProvider ?? checkoutCreated?.paymentProvider,
    paymentSucceededAt: dateFromEvent(paymentSucceeded) ?? order?.paidAt ?? null,
    orderCreatedAt: dateFromEvent(orderCreated),
    orderId: orderCreated?.orderId ?? order?.id,
    documentGenerationStartedAt: dateFromEvent(documentStarted),
    documentGenerationSucceededAt: dateFromEvent(documentSucceeded),
    documentGenerationFailedAt: dateFromEvent(documentFailed),
    trackerCreatedAt: dateFromEvent(trackerCreated)
  };
}

function findEvent(events: WilmaAnalyticsEvent[], eventName: WilmaAnalyticsEvent["event"]) {
  return events.find((event) => event.event === eventName);
}

function dateFromEvent(event: WilmaAnalyticsEvent | undefined): Date | null {
  return event ? new Date(event.createdAt) : null;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
