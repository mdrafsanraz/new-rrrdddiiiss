import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { LoginAsUserButton } from "@/components/admin/login-as-user-button";
import { EditArtistNameForm } from "@/components/admin/edit-artist-name-form";
import { hasPermission } from "@/lib/auth/permissions";

export const metadata = { title: "Artists · Admin" };

export default async function AdminArtistsPage() {
  const admin = await requireAdmin();
  const canEditNames = hasPermission(admin.role, "users.write");

  const artists = await prisma.artist.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { releases: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Artists</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All artist profiles across tenants.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Artist</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                Owner
              </th>
              <th className="px-4 py-3 font-medium">Releases</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {artists.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.locked ? "Locked" : "Editable"}
                    {a.labelgridId ? ` · LG ${a.labelgridId}` : ""}
                  </p>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <Link
                    href={`/admin/users/${a.user.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {a.user.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{a.user.email}</p>
                </td>
                <td className="px-4 py-3 tabular-nums">{a._count.releases}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    {canEditNames ? <EditArtistNameForm artistId={a.id} initialName={a.name} /> : null}
                    <LoginAsUserButton userId={a.user.id} userName={a.user.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
