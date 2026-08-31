ALTER TABLE "Release" ADD COLUMN "acrScheduledAt" TIMESTAMP(3);

CREATE INDEX "Release_acrStatus_acrScheduledAt_idx"
ON "Release"("acrStatus", "acrScheduledAt");
