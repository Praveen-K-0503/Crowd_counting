import { AppShell } from "@/components/app-shell";
import { FieldTaskBoard } from "@/components/field-task-board";
import { LiveSyncBadge } from "@/components/live-sync-badge";
import { requireRole } from "@/lib/auth";
import { getOfficerAssignments, type ComplaintAssignmentItem } from "@/lib/api";

const fallbackAssignments: ComplaintAssignmentItem[] = [];

export default async function TasksPage() {
  const user = await requireRole(["field_officer"]);
  let assignments = fallbackAssignments;

  try {
    assignments = await getOfficerAssignments(user.id);
  } catch {
    assignments = fallbackAssignments;
  }

  return (
    <AppShell>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Field operations</p>
          <LiveSyncBadge label="Task board live refresh" />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-civic-text">Work through assigned on-ground tasks.</h1>
        <p className="max-w-3xl text-sm leading-7 text-civic-muted">
          Accept work, start field action, and mark completion so the complaint lifecycle stays accurate for citizens and operators.
        </p>
      </section>

      <FieldTaskBoard assignments={assignments} officerId={user.id} />
    </AppShell>
  );
}
