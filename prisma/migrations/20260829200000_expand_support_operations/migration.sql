ALTER TYPE "SupportTicketStatus" ADD VALUE IF NOT EXISTS 'resolved';
CREATE TYPE "SupportTicketPriority" AS ENUM ('low', 'normal', 'high', 'urgent');
ALTER TABLE "SupportTicket"
ADD COLUMN "priority" "SupportTicketPriority" NOT NULL DEFAULT 'normal',
ADD COLUMN "assignedToId" TEXT,
ADD COLUMN "releaseId" TEXT,
ADD COLUMN "artistId" TEXT,
ADD COLUMN "escalatedAt" TIMESTAMP(3);
CREATE INDEX "SupportTicket_priority_status_idx" ON "SupportTicket"("priority", "status");
CREATE INDEX "SupportTicket_assignedToId_status_idx" ON "SupportTicket"("assignedToId", "status");
CREATE INDEX "SupportTicket_releaseId_idx" ON "SupportTicket"("releaseId");
CREATE INDEX "SupportTicket_artistId_idx" ON "SupportTicket"("artistId");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
