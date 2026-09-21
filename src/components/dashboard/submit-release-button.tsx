import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

/** Resume the validated builder; the release page must not skip upload stages. */
export function SubmitReleaseButton({ releaseId }: { releaseId: string }) {
  return (
    <Link href={`/dashboard/releases/${releaseId}/edit`} className={buttonVariants({ variant: "default" })}>
      Complete & submit release
    </Link>
  );
}
