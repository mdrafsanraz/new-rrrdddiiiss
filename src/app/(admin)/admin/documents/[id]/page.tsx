import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export default async function LegacyDocumentReviewPage({ params }: Props) {
  await requirePermission("documents.manage");
  const { id } = await params;
  const document = await prisma.releaseDocument.findUnique({
    where: { id },
    select: { releaseId: true },
  });
  if (!document) notFound();
  redirect(`/admin/releases/${document.releaseId}#documents`);
}
