-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN     "fee" DECIMAL(28,12),
ADD COLUMN     "paidAmount" DECIMAL(28,12),
ADD COLUMN     "payoutAmount" DECIMAL(28,12),
ADD COLUMN     "taxWithholding" DECIMAL(28,12);

