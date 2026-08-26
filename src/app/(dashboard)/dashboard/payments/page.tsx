import { SectionPlaceholder } from "@/components/dashboard/section-placeholder";

export const metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <SectionPlaceholder
      title="Payments"
      body="Payout history and balance will connect to royalty statements. Subscription billing lives under Subscription."
    />
  );
}
