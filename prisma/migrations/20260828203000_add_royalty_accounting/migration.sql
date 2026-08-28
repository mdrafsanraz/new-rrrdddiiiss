CREATE TYPE "RoyaltyImportStatus" AS ENUM ('imported', 'needs_review', 'calculated', 'published', 'failed');
CREATE TYPE "RoyaltyPeriodStatus" AS ENUM ('draft', 'imported', 'matching', 'needs_review', 'calculated', 'ready_to_publish', 'published', 'corrected', 'superseded');
CREATE TYPE "RoyaltyMatchStatus" AS ENUM ('matched', 'unmatched', 'conflict', 'manual_match', 'unallocated');
CREATE TYPE "RoyaltyCalculationStatus" AS ENUM ('pending', 'calculated', 'excluded');
CREATE TYPE "RoyaltyStatementStatus" AS ENUM ('pending', 'available', 'paid');
CREATE TYPE "RoyaltyRuleScope" AS ENUM ('global', 'plan', 'user');
CREATE TYPE "RoyaltyAdjustmentType" AS ENUM ('fixed', 'manual', 'tax_withholding', 'processing', 'correction', 'other');

CREATE TABLE "RoyaltyPeriod" (
  "id" TEXT NOT NULL, "period" TEXT NOT NULL, "startDate" TIMESTAMP(3) NOT NULL, "endDate" TIMESTAMP(3) NOT NULL,
  "status" "RoyaltyPeriodStatus" NOT NULL DEFAULT 'draft', "importedAt" TIMESTAMP(3), "calculatedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3), "publishedById" TEXT, "unresolvedApprovedAt" TIMESTAMP(3), "unresolvedApprovedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoyaltyPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoyaltyImport" (
  "id" TEXT NOT NULL, "royaltyPeriodId" TEXT NOT NULL, "fileName" TEXT NOT NULL, "source" TEXT NOT NULL DEFAULT 'labelgrid',
  "checksum" TEXT NOT NULL, "uploadedById" TEXT NOT NULL, "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payPeriod" TEXT NOT NULL, "rowCount" INTEGER NOT NULL, "malformedRowCount" INTEGER NOT NULL DEFAULT 0,
  "totalSourceGross" DECIMAL(28,12) NOT NULL, "totalSourceFees" DECIMAL(28,12) NOT NULL, "totalSourceNet" DECIMAL(28,12) NOT NULL,
  "status" "RoyaltyImportStatus" NOT NULL DEFAULT 'imported', "errorSummary" JSONB, "headerMap" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RoyaltyImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoyaltyRule" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "scope" "RoyaltyRuleScope" NOT NULL, "userId" TEXT, "planId" "PlanId",
  "commissionRate" DECIMAL(9,6), "revenueShareRate" DECIMAL(9,6), "fixedAdjustment" DECIMAL(28,12) NOT NULL DEFAULT 0,
  "otherDeduction" DECIMAL(28,12) NOT NULL DEFAULT 0, "effectiveFrom" TIMESTAMP(3) NOT NULL, "effectiveTo" TIMESTAMP(3),
  "version" INTEGER NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoyaltyRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserRoyaltyStatement" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "royaltyPeriodId" TEXT NOT NULL, "sourceNetTotal" DECIMAL(28,12) NOT NULL,
  "totalDeductions" DECIMAL(28,12) NOT NULL, "userPayableTotal" DECIMAL(28,12) NOT NULL, "transactionCount" INTEGER NOT NULL,
  "status" "RoyaltyStatementStatus" NOT NULL DEFAULT 'pending', "publishedAt" TIMESTAMP(3) NOT NULL, "availableAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserRoyaltyStatement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoyaltyTransaction" (
  "id" TEXT NOT NULL, "royaltyImportId" TEXT NOT NULL, "royaltyPeriodId" TEXT NOT NULL, "sourceRowNumber" INTEGER NOT NULL,
  "sourceFingerprint" TEXT NOT NULL, "payPeriod" TEXT NOT NULL, "retailer" TEXT, "territory" TEXT, "upc" TEXT,
  "releaseTitle" TEXT, "isrc" TEXT, "artistName" TEXT, "trackTitle" TEXT, "usageType" TEXT,
  "quantity" DECIMAL(28,8) NOT NULL, "sourceGrossUsd" DECIMAL(28,12) NOT NULL, "sourceTotalLabelGridFee" DECIMAL(28,12) NOT NULL,
  "sourceNetRevenueUsd" DECIMAL(28,12) NOT NULL, "rawSourceData" JSONB NOT NULL, "userId" TEXT, "releaseId" TEXT, "trackId" TEXT,
  "labelgridReleaseId" TEXT, "labelgridTrackId" TEXT, "matchStatus" "RoyaltyMatchStatus" NOT NULL DEFAULT 'unmatched',
  "matchMethod" TEXT, "matchConfidence" DECIMAL(5,4), "matchNotes" TEXT, "manuallyMatchedById" TEXT, "manuallyMatchedAt" TIMESTAMP(3),
  "originalMatchState" JSONB, "calculationStatus" "RoyaltyCalculationStatus" NOT NULL DEFAULT 'pending', "royaltyRuleId" TEXT,
  "royaltyRuleVersion" INTEGER, "appliedCommissionRate" DECIMAL(9,6), "appliedRevenueShareRate" DECIMAL(9,6),
  "rdistroCommissionUsd" DECIMAL(28,12) NOT NULL DEFAULT 0, "rdistroAdjustmentsUsd" DECIMAL(28,12) NOT NULL DEFAULT 0,
  "rdistroOtherDeductionsUsd" DECIMAL(28,12) NOT NULL DEFAULT 0, "userPayableUsd" DECIMAL(28,12) NOT NULL DEFAULT 0,
  "calculationTimestamp" TIMESTAMP(3), "calculationBreakdown" JSONB, "userStatementId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoyaltyAdjustment" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "royaltyPeriodId" TEXT NOT NULL, "transactionId" TEXT,
  "type" "RoyaltyAdjustmentType" NOT NULL, "amount" DECIMAL(28,12) NOT NULL, "reason" TEXT NOT NULL, "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RoyaltyAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoyaltyPeriod_period_key" ON "RoyaltyPeriod"("period");
CREATE INDEX "RoyaltyPeriod_status_idx" ON "RoyaltyPeriod"("status");
CREATE INDEX "RoyaltyPeriod_startDate_idx" ON "RoyaltyPeriod"("startDate");
CREATE UNIQUE INDEX "RoyaltyImport_checksum_key" ON "RoyaltyImport"("checksum");
CREATE INDEX "RoyaltyImport_royaltyPeriodId_idx" ON "RoyaltyImport"("royaltyPeriodId");
CREATE INDEX "RoyaltyImport_payPeriod_idx" ON "RoyaltyImport"("payPeriod");
CREATE INDEX "RoyaltyImport_uploadedById_idx" ON "RoyaltyImport"("uploadedById");
CREATE UNIQUE INDEX "RoyaltyRule_name_version_key" ON "RoyaltyRule"("name", "version");
CREATE INDEX "RoyaltyRule_scope_active_effectiveFrom_idx" ON "RoyaltyRule"("scope", "active", "effectiveFrom");
CREATE INDEX "RoyaltyRule_userId_active_idx" ON "RoyaltyRule"("userId", "active");
CREATE INDEX "RoyaltyRule_planId_active_idx" ON "RoyaltyRule"("planId", "active");
CREATE UNIQUE INDEX "UserRoyaltyStatement_userId_royaltyPeriodId_key" ON "UserRoyaltyStatement"("userId", "royaltyPeriodId");
CREATE INDEX "UserRoyaltyStatement_userId_status_idx" ON "UserRoyaltyStatement"("userId", "status");
CREATE INDEX "UserRoyaltyStatement_royaltyPeriodId_idx" ON "UserRoyaltyStatement"("royaltyPeriodId");
CREATE UNIQUE INDEX "RoyaltyTransaction_royaltyImportId_sourceRowNumber_key" ON "RoyaltyTransaction"("royaltyImportId", "sourceRowNumber");
CREATE INDEX "RoyaltyTransaction_sourceFingerprint_idx" ON "RoyaltyTransaction"("sourceFingerprint");
CREATE INDEX "RoyaltyTransaction_royaltyPeriodId_matchStatus_idx" ON "RoyaltyTransaction"("royaltyPeriodId", "matchStatus");
CREATE INDEX "RoyaltyTransaction_userId_royaltyPeriodId_idx" ON "RoyaltyTransaction"("userId", "royaltyPeriodId");
CREATE INDEX "RoyaltyTransaction_releaseId_idx" ON "RoyaltyTransaction"("releaseId");
CREATE INDEX "RoyaltyTransaction_trackId_idx" ON "RoyaltyTransaction"("trackId");
CREATE INDEX "RoyaltyTransaction_isrc_idx" ON "RoyaltyTransaction"("isrc");
CREATE INDEX "RoyaltyTransaction_upc_idx" ON "RoyaltyTransaction"("upc");
CREATE INDEX "RoyaltyTransaction_retailer_idx" ON "RoyaltyTransaction"("retailer");
CREATE INDEX "RoyaltyTransaction_territory_idx" ON "RoyaltyTransaction"("territory");
CREATE INDEX "RoyaltyTransaction_userStatementId_idx" ON "RoyaltyTransaction"("userStatementId");
CREATE INDEX "RoyaltyAdjustment_userId_royaltyPeriodId_idx" ON "RoyaltyAdjustment"("userId", "royaltyPeriodId");
CREATE INDEX "RoyaltyAdjustment_transactionId_idx" ON "RoyaltyAdjustment"("transactionId");
CREATE INDEX "RoyaltyAdjustment_createdById_idx" ON "RoyaltyAdjustment"("createdById");

ALTER TABLE "RoyaltyPeriod" ADD CONSTRAINT "RoyaltyPeriod_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoyaltyImport" ADD CONSTRAINT "RoyaltyImport_royaltyPeriodId_fkey" FOREIGN KEY ("royaltyPeriodId") REFERENCES "RoyaltyPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoyaltyImport" ADD CONSTRAINT "RoyaltyImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoyaltyRule" ADD CONSTRAINT "RoyaltyRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRoyaltyStatement" ADD CONSTRAINT "UserRoyaltyStatement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserRoyaltyStatement" ADD CONSTRAINT "UserRoyaltyStatement_royaltyPeriodId_fkey" FOREIGN KEY ("royaltyPeriodId") REFERENCES "RoyaltyPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoyaltyTransaction" ADD CONSTRAINT "RoyaltyTransaction_royaltyImportId_fkey" FOREIGN KEY ("royaltyImportId") REFERENCES "RoyaltyImport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoyaltyTransaction" ADD CONSTRAINT "RoyaltyTransaction_royaltyPeriodId_fkey" FOREIGN KEY ("royaltyPeriodId") REFERENCES "RoyaltyPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoyaltyTransaction" ADD CONSTRAINT "RoyaltyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoyaltyTransaction" ADD CONSTRAINT "RoyaltyTransaction_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoyaltyTransaction" ADD CONSTRAINT "RoyaltyTransaction_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoyaltyTransaction" ADD CONSTRAINT "RoyaltyTransaction_manuallyMatchedById_fkey" FOREIGN KEY ("manuallyMatchedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoyaltyTransaction" ADD CONSTRAINT "RoyaltyTransaction_royaltyRuleId_fkey" FOREIGN KEY ("royaltyRuleId") REFERENCES "RoyaltyRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoyaltyTransaction" ADD CONSTRAINT "RoyaltyTransaction_userStatementId_fkey" FOREIGN KEY ("userStatementId") REFERENCES "UserRoyaltyStatement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoyaltyAdjustment" ADD CONSTRAINT "RoyaltyAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoyaltyAdjustment" ADD CONSTRAINT "RoyaltyAdjustment_royaltyPeriodId_fkey" FOREIGN KEY ("royaltyPeriodId") REFERENCES "RoyaltyPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoyaltyAdjustment" ADD CONSTRAINT "RoyaltyAdjustment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "RoyaltyTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoyaltyAdjustment" ADD CONSTRAINT "RoyaltyAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
