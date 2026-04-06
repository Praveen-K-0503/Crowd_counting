"use client";

import { ChangeEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Paperclip, PlayCircle, ShieldAlert, UploadCloud } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { uploadComplaintMedia, updateAssignmentStatus, type ComplaintAssignmentItem } from "@/lib/api";

type FieldTaskBoardProps = {
  assignments: ComplaintAssignmentItem[];
  officerId: string;
};

function nextAssignmentActions(status: string) {
  if (status === "assigned") {
    return [{ label: "Accept task", value: "accepted" as const, icon: ShieldAlert }];
  }

  if (status === "accepted") {
    return [{ label: "Start work", value: "in_progress" as const, icon: PlayCircle }];
  }

  if (status === "in_progress") {
    return [{ label: "Mark complete", value: "completed" as const, icon: CheckCircle2 }];
  }

  return [];
}

export function FieldTaskBoard({ assignments, officerId }: FieldTaskBoardProps) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function detectMediaType(file: File): "image" | "video" | "audio" {
    if (file.type.startsWith("video/")) {
      return "video";
    }

    if (file.type.startsWith("audio/")) {
      return "audio";
    }

    return "image";
  }

  function handleProofSelection(assignmentId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setProofFiles((current) => ({
      ...current,
      [assignmentId]: file,
    }));
  }

  function handleProofUpload(assignment: ComplaintAssignmentItem) {
    const selectedFile = proofFiles[assignment.id];

    if (!selectedFile) {
      setError("Choose a photo, video, or audio note before uploading proof.");
      return;
    }

    setError(null);
    setActiveAction(`proof-${assignment.id}`);

    startTransition(async () => {
      try {
        await uploadComplaintMedia({
          complaintId: assignment.complaintId,
          mediaType: detectMediaType(selectedFile),
          file: selectedFile,
          uploadedBy: officerId,
          isResolutionProof: true,
        });

        setProofFiles((current) => ({
          ...current,
          [assignment.id]: null,
        }));
        router.refresh();
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Failed to upload proof");
      } finally {
        setActiveAction(null);
      }
    });
  }

  function handleAction(assignmentId: string, newStatus: "accepted" | "in_progress" | "completed") {
    setError(null);
    setActiveAction(`${assignmentId}-${newStatus}`);

    startTransition(async () => {
      try {
        await updateAssignmentStatus({
          assignmentId,
          newStatus,
          changedByUserId: officerId,
        });

        router.refresh();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Failed to update task");
      } finally {
        setActiveAction(null);
      }
    });
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      {error ? <p className="mb-4 text-sm font-medium text-civic-danger">{error}</p> : null}

      {assignments.length === 0 ? (
        <EmptyState
          description="New field tasks will appear here as soon as the operations team assigns them to you."
          icon={Clock3}
          title="No active field tasks"
        />
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <article key={assignment.id} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {assignment.departmentName}
                    </span>
                    <StatusBadge status={assignment.assignmentStatus.replace("_", " ")} />
                  </div>
                  <h3 className="text-lg font-semibold text-civic-text">
                    {assignment.complaintTitle ?? "Assigned civic issue"}
                  </h3>
                  <p className="text-sm font-medium text-civic-secondary">
                    {assignment.complaintCode ?? assignment.complaintId}
                  </p>
                  <p className="text-sm text-civic-muted">
                    Assigned by {assignment.assignedByName ?? "operations team"} on{" "}
                    {new Date(assignment.assignedAt).toLocaleString()}
                  </p>
                  {assignment.notes ? <p className="text-sm leading-6 text-civic-text">{assignment.notes}</p> : null}
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-civic-text">Resolution proof</p>
                    <p className="text-sm text-civic-muted">
                      {assignment.resolutionProofCount > 0
                        ? `${assignment.resolutionProofCount} file${assignment.resolutionProofCount > 1 ? "s" : ""} uploaded`
                        : "Upload at least one proof file before marking the work complete."}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
                    <Paperclip className="h-4 w-4" />
                    {proofFiles[assignment.id]?.name ?? "No new file selected"}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary">
                    <UploadCloud className="h-4 w-4" />
                    Choose proof
                    <input
                      type="file"
                      accept="image/*,video/*,audio/*"
                      className="hidden"
                      onChange={(event) => handleProofSelection(assignment.id, event)}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={isPending || !proofFiles[assignment.id]}
                    onClick={() => handleProofUpload(assignment)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activeAction === `proof-${assignment.id}` ? "Uploading..." : "Upload proof"}
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {nextAssignmentActions(assignment.assignmentStatus).map((action) => {
                  const Icon = action.icon;
                  const isCompleteAction = action.value === "completed";
                  const needsProof = isCompleteAction && assignment.resolutionProofCount === 0;

                  return (
                    <button
                      key={action.value}
                      type="button"
                      disabled={isPending || needsProof}
                      onClick={() => handleAction(assignment.id, action.value)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Icon className="h-4 w-4" />
                      {activeAction === `${assignment.id}-${action.value}`
                        ? "Updating..."
                        : needsProof
                          ? "Upload proof first"
                          : action.label}
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
