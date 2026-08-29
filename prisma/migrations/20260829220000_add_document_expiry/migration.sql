ALTER TABLE "ReleaseDocument" ADD COLUMN "expiresAt" TIMESTAMP(3);
CREATE INDEX "ReleaseDocument_expiresAt_idx" ON "ReleaseDocument"("expiresAt");
