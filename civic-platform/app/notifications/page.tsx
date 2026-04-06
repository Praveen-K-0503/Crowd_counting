import { AppShell } from "@/components/app-shell";
import { LiveSyncBadge } from "@/components/live-sync-badge";
import { NotificationCenter } from "@/components/notification-center";
import { requireUser } from "@/lib/auth";
import { getNotifications, type ComplaintNotificationItem } from "@/lib/api";

const fallbackNotifications: ComplaintNotificationItem[] = [];

export default async function NotificationsPage() {
  const user = await requireUser();
  let notifications = fallbackNotifications;

  try {
    notifications = await getNotifications(user.id);
  } catch {
    notifications = fallbackNotifications;
  }

  return (
    <AppShell>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Notifications</p>
          <LiveSyncBadge label="Inbox live refresh" />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-civic-text">See the latest updates on your work and complaints.</h1>
        <p className="max-w-3xl text-sm leading-7 text-civic-muted">
          Assignment, field progress, reopening, and citizen verification updates appear here.
        </p>
      </section>

      <NotificationCenter notifications={notifications} userId={user.id} />
    </AppShell>
  );
}
