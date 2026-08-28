CREATE TYPE "WalletTransactionType" AS ENUM ('royalty_credit', 'withdrawal', 'adjustment', 'reversal');
CREATE TYPE "WalletDirection" AS ENUM ('credit', 'debit');
CREATE TYPE "WalletSourceType" AS ENUM ('user_royalty_statement', 'withdrawal', 'adjustment', 'reversal');
CREATE TYPE "WalletTransactionStatus" AS ENUM ('pending', 'available', 'processing', 'paid', 'declined', 'reversed');

CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "WalletTransactionType" NOT NULL,
  "amount" DECIMAL(28,12) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "direction" "WalletDirection" NOT NULL,
  "sourceType" "WalletSourceType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "WalletTransactionStatus" NOT NULL,
  "availableAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Withdrawal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" DECIMAL(28,12) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "method" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "status" "WalletTransactionStatus" NOT NULL DEFAULT 'pending',
  "reference" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WalletTransaction_sourceType_sourceId_key" ON "WalletTransaction"("sourceType", "sourceId");
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");
CREATE INDEX "WalletTransaction_userId_type_createdAt_idx" ON "WalletTransaction"("userId", "type", "createdAt");
CREATE INDEX "WalletTransaction_userId_status_idx" ON "WalletTransaction"("userId", "status");
CREATE UNIQUE INDEX "Withdrawal_reference_key" ON "Withdrawal"("reference");
CREATE INDEX "Withdrawal_userId_requestedAt_idx" ON "Withdrawal"("userId", "requestedAt");
CREATE INDEX "Withdrawal_status_idx" ON "Withdrawal"("status");

ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One user-visible credit per previously published statement. Source transaction rows remain in the statement only.
INSERT INTO "WalletTransaction" (
  "id", "userId", "type", "amount", "currency", "direction", "sourceType", "sourceId",
  "title", "description", "status", "availableAt", "createdAt", "updatedAt"
)
SELECT
  'wallet_' || statement."id",
  statement."userId",
  CASE WHEN statement."userPayableTotal" >= 0 THEN 'royalty_credit'::"WalletTransactionType" ELSE 'reversal'::"WalletTransactionType" END,
  ABS(statement."userPayableTotal"),
  'USD',
  CASE WHEN statement."userPayableTotal" >= 0 THEN 'credit'::"WalletDirection" ELSE 'debit'::"WalletDirection" END,
  'user_royalty_statement'::"WalletSourceType",
  statement."id",
  to_char(period."startDate", 'FMMonth YYYY') || ' Royalties',
  'Published Royalty Statement',
  CASE
    WHEN statement."status" = 'pending' THEN 'pending'::"WalletTransactionStatus"
    ELSE 'available'::"WalletTransactionStatus"
  END,
  CASE WHEN statement."status" = 'pending' THEN NULL ELSE COALESCE(statement."availableAt", statement."publishedAt") END,
  statement."publishedAt",
  statement."updatedAt"
FROM "UserRoyaltyStatement" statement
JOIN "RoyaltyPeriod" period ON period."id" = statement."royaltyPeriodId"
WHERE period."status" = 'published'
ON CONFLICT ("sourceType", "sourceId") DO NOTHING;
