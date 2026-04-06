"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { getNextStatusOptions } from "@/lib/complaint-lifecycle";
import { updateComplaintStatus } from "@/lib/api";

export function AdminStatusActions({
  complaintId,
  operatorId,
  currentStatus,
}: {
  complaintId: string;
  operatorId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const statusOptions = getNextStatusOptions(currentStatus);

  function handleStatusUpdate(newStatus: string) {
    setError(null);
    setActiveStatus(newStatus);

    startTransition(async () => {
      try {
        await updateComplaintStatus({
          complaintId,
          newStatus,
          changedBy: operatorId,
          reason: `Status changed to ${newStatus} by operator`,
        });

        router.refresh();
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : "Failed to update status");
      } finally {
        setActiveStatus(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-civic-muted">
        Available actions are based on the complaint&apos;s current lifecycle state so operators only see relevant next steps.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {statusOptions.map((status) => (
          <button
            key={status.value}
            type="button"
            disabled={isPending}
            onClick={() => handleStatusUpdate(status.value)}
            className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending && activeStatus === status.value ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Updating...
              </span>
            ) : (
              status.label
            )}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm font-medium text-civic-danger">{error}</p> : null}
    </div>
  );
}
