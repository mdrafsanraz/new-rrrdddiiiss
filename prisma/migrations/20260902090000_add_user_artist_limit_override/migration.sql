ALTER TABLE "User" ADD COLUMN "artistLimitOverride" INTEGER;

ALTER TABLE "User"
ADD CONSTRAINT "User_artistLimitOverride_check"
CHECK ("artistLimitOverride" IS NULL OR "artistLimitOverride" >= 0);
