import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/admin";

export default async function LegacyDocumentsPage() {
  await requirePermission("documents.manage");
  redirect("/admin/action-required#documentation");
}
