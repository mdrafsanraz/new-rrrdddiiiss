CREATE TABLE "PlanConfiguration" (
  "planId" "PlanId" NOT NULL,
  "name" TEXT NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  "billingInterval" TEXT NOT NULL,
  "artistLimit" INTEGER,
  "monthlyReleaseLimit" INTEGER,
  "featuresJson" TEXT NOT NULL DEFAULT '[]',
  "royaltyCommissionPercent" DECIMAL(8,4) NOT NULL,
  "analytics" BOOLEAN NOT NULL DEFAULT false,
  "priorityReview" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "stripePriceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanConfiguration_pkey" PRIMARY KEY ("planId")
);

CREATE UNIQUE INDEX "PlanConfiguration_stripePriceId_key" ON "PlanConfiguration"("stripePriceId");
