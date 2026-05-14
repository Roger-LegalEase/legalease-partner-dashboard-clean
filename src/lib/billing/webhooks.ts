import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { documentPrepProductKey } from "@/lib/billing/products";
import {
  requestDocumentPrepHandoff,
  type DocumentPrepHandoffDatabase
} from "@/lib/document-prep";
import { redactForStorage } from "@/lib/security/redaction";

type ProductOrderStatus = "PENDING" | "PAID" | "PAYMENT_FAILED" | "CANCELED";
export type SubscriptionEntitlementStatus =
  | "INCOMPLETE"
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "UNPAID"
  | "CANCELED";

type ProviderEventRecord = {
  id: string;
};

export type BillingDatabase = {
  providerEvent: {
    findUnique(args: { where: { providerEventId: string } }): Promise<ProviderEventRecord | null>;
    create(args: {
      data: {
        provider: "stripe";
        providerEventId: string;
        type: string;
        payload: Prisma.InputJsonValue;
      };
    }): Promise<ProviderEventRecord>;
  };
  productOrder: {
    upsert(args: {
      where: { stripeCheckoutSessionId?: string; stripePaymentIntentId?: string };
      create: ProductOrderWrite;
      update: Partial<ProductOrderWrite>;
    }): Promise<unknown>;
    updateMany(args: {
      where: { stripePaymentIntentId?: string; stripeCheckoutSessionId?: string };
      data: Partial<ProductOrderWrite>;
    }): Promise<{ count: number }>;
  };
  subscriptionEntitlement: {
    upsert(args: {
      where: { stripeSubscriptionId: string };
      create: SubscriptionEntitlementWrite;
      update: Partial<SubscriptionEntitlementWrite>;
    }): Promise<unknown>;
  };
  user: {
    updateMany(args: {
      where: { OR: Array<{ id?: string; email?: string }> };
      data: { stripeCustomerId: string };
    }): Promise<unknown>;
  };
  shieldCase?: {
    findFirst(args: {
      where: {
        ownerId?: string;
        owner?: { email?: string };
        productKey?: string;
      };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        ownerId: string;
        productKey: string;
        displayName: string;
        status: "IN_REVIEW";
      };
    }): Promise<{ id: string }>;
  };
  auditEvent?: {
    create(args: {
      data: {
        actorUserId?: string;
        actorEmail?: string;
        action: string;
        targetType: string;
        targetId?: string;
        metadata: Prisma.InputJsonValue;
      };
    }): Promise<unknown>;
  };
  wilmaChatSession?: DocumentPrepHandoffDatabase["wilmaChatSession"];
  caseNotice?: DocumentPrepHandoffDatabase["caseNotice"];
};

type ProductOrderWrite = {
  userId?: string;
  email?: string;
  productKey: string;
  status: ProductOrderStatus;
  amountCents: number;
  currency: string;
  stripeCustomerId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  paidAt?: Date;
};

type SubscriptionEntitlementWrite = {
  userId?: string;
  email?: string;
  productKey: string;
  status: SubscriptionEntitlementStatus;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
};

export type StripeWebhookProcessingResult = {
  processed: boolean;
  type: string;
};

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): SubscriptionEntitlementStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "unpaid":
      return "UNPAID";
    case "canceled":
      return "CANCELED";
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "INCOMPLETE";
  }
}

export function mapStripePaymentStatus(status: Stripe.Checkout.Session["payment_status"]): ProductOrderStatus {
  if (status === "paid") {
    return "PAID";
  }

  if (status === "unpaid" || status === "no_payment_required") {
    return "PENDING";
  }

  return "PAYMENT_FAILED";
}

export async function processStripeWebhookEvent(
  event: Stripe.Event,
  db: BillingDatabase
): Promise<StripeWebhookProcessingResult> {
  const existingEvent = await db.providerEvent.findUnique({
    where: { providerEventId: event.id }
  });

  if (existingEvent) {
    return { processed: false, type: event.type };
  }

  await db.providerEvent.create({
    data: {
      provider: "stripe",
      providerEventId: event.id,
      type: event.type,
      payload: redactForStorage(event)
    }
  });

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, db);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice, db);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, db);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await upsertSubscriptionEntitlement(event.data.object as Stripe.Subscription, db);
      break;
  }

  return { processed: true, type: event.type };
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  db: BillingDatabase
): Promise<void> {
  const customerId = getId(session.customer);
  const email = session.customer_details?.email ?? session.customer_email ?? session.metadata?.email;
  const userId = session.metadata?.userId;

  if (customerId) {
    await updateUserStripeCustomerId(db, customerId, userId, email);
  }

  if (session.mode === "payment") {
    const paymentIntentId = getId(session.payment_intent);
    const status = mapStripePaymentStatus(session.payment_status);

    await db.productOrder.upsert({
      where: { stripeCheckoutSessionId: session.id },
      create: {
        userId,
        email: email ?? undefined,
        productKey: session.metadata?.productKey ?? "record_check",
        status,
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        paidAt: status === "PAID" ? new Date() : undefined
      },
      update: {
        status,
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        stripeCustomerId: customerId,
        stripePaymentIntentId: paymentIntentId,
        paidAt: status === "PAID" ? new Date() : undefined
      }
    });
    if (status === "PAID") {
      await trackAnalyticsEvent(db, {
        event: "paid",
        actorUserId: userId,
        actorEmail: email ?? undefined,
        targetType: "ProductOrder",
        targetId: session.id,
        metadata: {
          productKey: session.metadata?.productKey ?? "record_check",
          amountCents: session.amount_total ?? 0,
          currency: session.currency ?? "usd",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: paymentIntentId
        }
      });
    }

    if (status === "PAID" && (session.metadata?.productKey ?? "record_check") === "record_check") {
      await ensureRecordCheckCase(db, {
        userId,
        email,
        stripeCheckoutSessionId: session.id
      });
    }

    if (status === "PAID" && session.metadata?.productKey === documentPrepProductKey && hasDocumentPrepHandoff(db)) {
      const wilmaSessionId = session.metadata.wilmaSessionId;
      const wilmaDecisionId = session.metadata.wilmaDecisionId;

      if (wilmaSessionId && wilmaDecisionId) {
        await requestDocumentPrepHandoff(db, {
          wilmaSessionId,
          wilmaDecisionId,
          paidAt: new Date()
        });
      }
    }
  }

  if (session.mode === "subscription") {
    const subscriptionId = getId(session.subscription);

    if (subscriptionId && customerId) {
      await db.subscriptionEntitlement.upsert({
        where: { stripeSubscriptionId: subscriptionId },
        create: {
          userId,
          email: email ?? undefined,
          productKey: session.metadata?.productKey ?? "monitoring_monthly",
          status: session.payment_status === "paid" ? "ACTIVE" : "INCOMPLETE",
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          cancelAtPeriodEnd: false
        },
        update: {
          userId,
          email: email ?? undefined,
          productKey: session.metadata?.productKey ?? "monitoring_monthly",
          status: session.payment_status === "paid" ? "ACTIVE" : "INCOMPLETE",
          stripeCustomerId: customerId
        }
      });
    }
  }
}

function hasDocumentPrepHandoff(db: BillingDatabase): db is BillingDatabase & DocumentPrepHandoffDatabase {
  return Boolean(db.wilmaChatSession && db.caseNotice && db.auditEvent);
}

async function ensureRecordCheckCase(
  db: BillingDatabase,
  input: { userId?: string; email?: string | null; stripeCheckoutSessionId: string }
): Promise<void> {
  if (!db.shieldCase || !input.userId) {
    return;
  }

  const existing = await db.shieldCase.findFirst({
    where: {
      ownerId: input.userId,
      productKey: "record_check"
    }
  });

  if (existing) {
    await db.auditEvent?.create({
      data: {
        actorUserId: input.userId,
        actorEmail: input.email ?? undefined,
        action: "checkout.record_check.completed",
        targetType: "ShieldCase",
        targetId: existing.id,
        metadata: {
          stripeCheckoutSessionId: input.stripeCheckoutSessionId,
          reusedExistingCase: true
        }
      }
    });
    return;
  }

  const shieldCase = await db.shieldCase.create({
    data: {
      ownerId: input.userId,
      productKey: "record_check",
      displayName: "Record Check + Expungement Readiness",
      status: "IN_REVIEW"
    }
  });

  await db.auditEvent?.create({
    data: {
      actorUserId: input.userId,
      actorEmail: input.email ?? undefined,
      action: "checkout.record_check.completed",
      targetType: "ShieldCase",
      targetId: shieldCase.id,
      metadata: {
        stripeCheckoutSessionId: input.stripeCheckoutSessionId,
        reusedExistingCase: false
      }
    }
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice, db: BillingDatabase): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (subscriptionId) {
    await db.subscriptionEntitlement.upsert({
      where: { stripeSubscriptionId: subscriptionId },
      create: {
        productKey: getMetadata(invoice).productKey ?? "monitoring_monthly",
        status: "ACTIVE",
        stripeCustomerId: getId(invoice.customer) ?? "",
        stripeSubscriptionId: subscriptionId,
        cancelAtPeriodEnd: false
      },
      update: {
        status: "ACTIVE",
        stripeCustomerId: getId(invoice.customer) ?? undefined
      }
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, db: BillingDatabase): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice);

  if (subscriptionId) {
    await db.subscriptionEntitlement.upsert({
      where: { stripeSubscriptionId: subscriptionId },
      create: {
        productKey: getMetadata(invoice).productKey ?? "monitoring_monthly",
        status: "PAST_DUE",
        stripeCustomerId: getId(invoice.customer) ?? "",
        stripeSubscriptionId: subscriptionId,
        cancelAtPeriodEnd: false
      },
      update: {
        status: "PAST_DUE",
        stripeCustomerId: getId(invoice.customer) ?? undefined
      }
    });
  }
}

async function upsertSubscriptionEntitlement(
  subscription: Stripe.Subscription,
  db: BillingDatabase
): Promise<void> {
  const subscriptionWithPeriod = subscription as Stripe.Subscription & {
    current_period_end?: number;
  };
  const customerId = getId(subscription.customer);
  const email = subscription.metadata.email;
  const userId = subscription.metadata.userId;

  if (!customerId) {
    return;
  }

  await updateUserStripeCustomerId(db, customerId, userId, email);

  await db.subscriptionEntitlement.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: {
      userId,
      email,
      productKey: subscription.metadata.productKey ?? "monitoring_monthly",
      status: mapStripeSubscriptionStatus(subscription.status),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: toDate(subscriptionWithPeriod.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    },
    update: {
      userId,
      email,
      productKey: subscription.metadata.productKey ?? "monitoring_monthly",
      status: mapStripeSubscriptionStatus(subscription.status),
      stripeCustomerId: customerId,
      currentPeriodEnd: toDate(subscriptionWithPeriod.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    }
  });
}

async function updateUserStripeCustomerId(
  db: BillingDatabase,
  stripeCustomerId: string,
  userId?: string,
  email?: string | null
): Promise<void> {
  const or: Array<{ id: string } | { email: string }> = [];

  if (userId) {
    or.push({ id: userId });
  }

  if (email) {
    or.push({ email });
  }

  if (or.length === 0) {
    return;
  }

  await db.user.updateMany({
    where: { OR: or },
    data: { stripeCustomerId }
  });
}

function getId(value: string | { id: string } | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return typeof value === "string" ? value : value.id;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  const invoiceWithSubscription = invoice as Stripe.Invoice & {
    subscription?: string | { id: string } | null;
  };

  return getId(invoiceWithSubscription.subscription);
}

function getMetadata(value: { metadata?: Stripe.Metadata | null }): Stripe.Metadata {
  return value.metadata ?? {};
}

function toDate(unixSeconds: number | undefined): Date | undefined {
  return unixSeconds ? new Date(unixSeconds * 1000) : undefined;
}
