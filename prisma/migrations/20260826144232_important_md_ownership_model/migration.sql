/*
  Warnings:

  - You are about to drop the column `labelgridUserId` on the `User` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Track` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Release_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "Release" ADD COLUMN "submittedAt" DATETIME;
ALTER TABLE "Release" ADD COLUMN "syncError" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isrc" TEXT,
    "trackNumber" INTEGER NOT NULL DEFAULT 1,
    "durationMs" INTEGER,
    "audioUrl" TEXT,
    "labelgridId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Track_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Track" ("audioUrl", "createdAt", "durationMs", "id", "isrc", "labelgridId", "releaseId", "title", "trackNumber", "updatedAt") SELECT "audioUrl", "createdAt", "durationMs", "id", "isrc", "labelgridId", "releaseId", "title", "trackNumber", "updatedAt" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE INDEX "Track_releaseId_idx" ON "Track"("releaseId");
CREATE INDEX "Track_userId_idx" ON "Track"("userId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "planId" TEXT NOT NULL DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeStatus" TEXT NOT NULL DEFAULT 'none',
    "stripePriceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "passwordHash", "planId", "stripeCustomerId", "stripePriceId", "stripeStatus", "stripeSubscriptionId", "updatedAt") SELECT "createdAt", "email", "id", "name", "passwordHash", "planId", "stripeCustomerId", "stripePriceId", "stripeStatus", "stripeSubscriptionId", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Release_userId_submittedAt_idx" ON "Release"("userId", "submittedAt");
