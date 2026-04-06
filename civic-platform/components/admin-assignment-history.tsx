import { ArrowRightLeft, CheckCircle2, Clock3, UserCog } from "lucide-react";
import type { ComplaintAssignmentItem } from "@/lib/api";

type AdminAssignmentHistoryProps = {
  assignments: ComplaintAssignmentItem[];
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Pending";
  }

  return new Date(value).toLocaleString();
}

function formatAssignmentStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminAssignmentHistory({ assignments }: AdminAssignmentHistoryProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-civic-secondary/15 text-civic-secondary">
          <ArrowRightLeft className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">Assignment activity</p>
          <h2 className="text-xl font-semibold text-civic-text">Department movement and ownership</h2>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {assignments.length > 0 ? (
          assignments.map((assignment) => (
            <article key={assignment.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-civic-text">{assignment.departmentName}</h3>
                  <p className="mt-1 text-sm text-civic-muted">{formatAssignmentStatus(assignment.assignmentStatus)}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                  <Clock3 className="h-4 w-4" />
                  {formatDateTime(assignment.assignedAt)}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-civic-text">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-civic-secondary">
                    <UserCog className="h-4 w-4" />
                    Assigned by
                  </div>
                  <p className="mt-2">{assignment.assignedByName ?? "System or untracked operator"}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-civic-text">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-civic-secondary">
                    <UserCog className="h-4 w-4" />
                    Assigned to
                  </div>
                  <p className="mt-2">{assignment.assignedToName ?? "Department queue"}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-civic-text">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-civic-secondary">
                    <Clock3 className="h-4 w-4" />
                    Accepted at
                  </div>
                  <p className="mt-2">{formatDateTime(assignment.acceptedAt)}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-civic-text">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-civic-secondary">
                    <CheckCircle2 className="h-4 w-4" />
                    Completed at
                  </div>
                  <p className="mt-2">{formatDateTime(assignment.completedAt)}</p>
                </div>
              </div>

              {assignment.notes ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-civic-text">
                  {assignment.notes}
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-civic-muted">
            No assignment history yet. Once this complaint is routed or reassigned, the movement will appear here.
          </div>
        )}
      </div>
    </section>
  );
}
