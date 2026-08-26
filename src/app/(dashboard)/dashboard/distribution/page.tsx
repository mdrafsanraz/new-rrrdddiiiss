import { SectionPlaceholder } from "@/components/dashboard/section-placeholder";

export const metadata = { title: "Distribution" };

export default function DistributionPage() {
  return (
    <SectionPlaceholder
      title="Distribution"
      body="Delivery status across stores will show here after a release is submitted for review. Sandbox deliveries never reach real DSPs."
    />
  );
}
