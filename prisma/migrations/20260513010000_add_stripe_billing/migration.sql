CREATE TYPE "ProductOrderStatus" AS ENUM ('PENDING', 'PAID', 'PAYMENT_FAILED', 'CANCELED');
CREATE TYPE "SubscriptionEntitlementStatus" AS ENUM ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELED');

ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;

CREATE TABLE "ProviderEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "productKey" TEXT NOT NULL,
    "status" "ProductOrderStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "stripeCustomerId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionEntitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "productKey" TEXT NOT NULL,
    "status" "SubscriptionEntitlementStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX "ProviderEvent_providerEventId_key" ON "ProviderEvent"("providerEventId");
CREATE UNIQUE INDEX "ProductOrder_stripeCheckoutSessionId_key" ON "ProductOrder"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "ProductOrder_stripePaymentIntentId_key" ON "ProductOrder"("stripePaymentIntentId");
CREATE INDEX "ProductOrder_userId_idx" ON "ProductOrder"("userId");
CREATE INDEX "ProductOrder_email_idx" ON "ProductOrder"("email");
CREATE INDEX "ProductOrder_stripeCustomerId_idx" ON "ProductOrder"("stripeCustomerId");
CREATE UNIQUE INDEX "SubscriptionEntitlement_stripeSubscriptionId_key" ON "SubscriptionEntitlement"("stripeSubscriptionId");
CREATE INDEX "SubscriptionEntitlement_userId_idx" ON "SubscriptionEntitlement"("userId");
CREATE INDEX "SubscriptionEntitlement_email_idx" ON "SubscriptionEntitlement"("email");
CREATE INDEX "SubscriptionEntitlement_stripeCustomerId_idx" ON "SubscriptionEntitlement"("stripeCustomerId");
CREATE INDEX "SubscriptionEntitlement_status_idx" ON "SubscriptionEntitlement"("status");

ALTER TABLE "ProductOrder" ADD CONSTRAINT "ProductOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SubscriptionEntitlement" ADD CONSTRAINT "SubscriptionEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
