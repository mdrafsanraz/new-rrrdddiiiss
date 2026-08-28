"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { DeleteReleaseDialog } from "./delete-release-dialog";
import { TakedownReleaseDialog } from "./takedown-release-dialog";

/**
 * Header primary actions — Edit/Delete for a draft that never entered
 * distribution, Request Takedown for anything that has. The two destructive
 * actions are mutually exclusive by construction (see
 * computeReleaseLifecycleActions) so this never renders both.
 */
export function ReleaseActions({
  releaseId,
  canEdit,
  canDelete,
  canTakedown,
  takedownDisabledReason,
  title,
  artist,
  upc,
  deliveryState,
}: {
  releaseId: string;
  canEdit: boolean;
  canDelete: boolean;
  canTakedown: boolean;
  takedownDisabledReason: string | null;
  title: string;
  artist: string | null;
  upc: string | null;
  deliveryState: string | null;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [takedownOpen, setTakedownOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit ? (
        <Link
          href={`/dashboard/releases/${releaseId}/edit`}
          prefetch={false}
          className={cn(buttonVariants({ variant: "outline" }), "h-9 px-4")}
        >
          Edit Release
        </Link>
      ) : null}

      {canDelete ? (
        <Button
          type="button"
          variant="destructive"
          className="h-9 px-4"
          onClick={() => setDeleteOpen(true)}
        >
          Delete Release
        </Button>
      ) : null}

      {canTakedown ? (
        <Button
          type="button"
          variant="destructive"
          className="h-9 px-4"
          onClick={() => setTakedownOpen(true)}
        >
          Request Takedown
        </Button>
      ) : takedownDisabledReason ? (
        <span className="text-xs text-muted-foreground">
          {takedownDisabledReason}
        </span>
      ) : null}

      <DeleteReleaseDialog
        releaseId={releaseId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
      <TakedownReleaseDialog
        releaseId={releaseId}
        title={title}
        artist={artist}
        upc={upc}
        currentState={deliveryState}
        open={takedownOpen}
        onOpenChange={setTakedownOpen}
      />
    </div>
  );
}
