import { requireAdmin } from "@/lib/auth/admin";
import { NewSupportTicketForm } from "@/components/dashboard/new-support-ticket-form";

export default async function NewAdminSupportTicketPage() {
  await requireAdmin();
  return <div className="mx-auto max-w-3xl space-y-6"><h1 className="text-2xl font-semibold">Open ticket on behalf of a user</h1><NewSupportTicketForm admin /></div>;
}
