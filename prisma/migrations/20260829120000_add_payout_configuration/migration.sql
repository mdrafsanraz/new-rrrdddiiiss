ALTER TABLE "User" ADD COLUMN "payoutPayoneerAccount" TEXT;

CREATE TABLE "PayoutConfiguration" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "availabilityRules" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayoutMethodConfiguration" (
  "method" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "minimum" DECIMAL(28,12) NOT NULL,
  "fixedFee" DECIMAL(28,12) NOT NULL DEFAULT 0,
  "percentageFee" DECIMAL(8,4) NOT NULL DEFAULT 0,
  "instructions" TEXT,
  "processingText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutMethodConfiguration_pkey" PRIMARY KEY ("method")
);
