ALTER TABLE "User"
ADD COLUMN "subscriptionCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN "subscriptionCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "SubscriptionEvent" (
  "id" TEXT NOT NULL,
  "stripeEventId" TEXT NOT NULL,
  "userId" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT,
  "amountDue" DECIMAL(28,12),
  "currency" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionEvent_stripeEventId_key" ON "SubscriptionEvent"("stripeEventId");
CREATE INDEX "SubscriptionEvent_userId_occurredAt_idx" ON "SubscriptionEvent"("userId", "occurredAt");
CREATE INDEX "SubscriptionEvent_type_occurredAt_idx" ON "SubscriptionEvent"("type", "occurredAt");
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
