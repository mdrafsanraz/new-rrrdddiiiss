import { SectionPlaceholder } from "@/components/dashboard/section-placeholder";

export const metadata = { title: "Royalties" };

export default function RoyaltiesPage() {
  return (
    <SectionPlaceholder
      title="Royalties"
      body="Earnings and statements will appear here once distribution royalties sync from our distributor account. Per-user ownership stays in RDISTRO — you only see your catalog."
    />
  );
}
