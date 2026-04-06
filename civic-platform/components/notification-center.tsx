"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type ComplaintNotificationItem,
} from "@/lib/api";

export function NotificationCenter({
  notifications,
  userId,
}: {
  notifications: ComplaintNotificationItem[];
  userId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  function handleMarkOne(notificationId: string) {
    setError(null);
    setActiveNotification(notificationId);

    startTransition(async () => {
      try {
        await markNotificationRead({ notificationId, userId });
        router.refresh();
      } catch (notificationError) {
        setError(notificationError instanceof Error ? notificationError.message : "Failed to update notification");
      } finally {
        setActiveNotification(null);
      }
    });
  }

  function handleMarkAll() {
    setError(null);
    setActiveNotification("all");

    startTransition(async () => {
      try {
        await markAllNotificationsRead(userId);
        router.refresh();
      } catch (notificationError) {
        setError(notificationError instanceof Error ? notificationError.message : "Failed to update notifications");
      } finally {
        setActiveNotification(null);
      }
    });
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Notification feed</p>
          <h2 className="mt-2 text-2xl font-semibold text-civic-text">Latest complaint and field updates</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            {unreadCount} unread
          </div>
          <button
            type="button"
            disabled={isPending || unreadCount === 0}
            onClick={handleMarkAll}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeNotification === "all" ? "Updating..." : "Mark all read"}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {error ? <p className="text-sm font-medium text-civic-danger">{error}</p> : null}
        {notifications.length === 0 ? (
          <EmptyState
            description="New complaint updates and assignment activity will appear here."
            icon={Bell}
            title="No notifications yet"
          />
        ) : (
          notifications.map((notification) => (
            <article
              key={notification.id}
              className={[
                "rounded-[1.75rem] border p-5 transition",
                notification.isRead ? "border-slate-200 bg-slate-50" : "border-civic-secondary/25 bg-civic-secondary/5",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {!notification.isRead ? (
                      <span className="rounded-full bg-civic-secondary px-3 py-1 text-xs font-semibold text-white">
                        New
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {notification.notificationType.replaceAll("_", " ")}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-civic-text">{notification.title}</h3>
                  <p className="text-sm leading-6 text-civic-muted">{notification.message}</p>
                </div>
                <div className="space-y-3 text-right">
                  <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700">
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                  {!notification.isRead ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleMarkOne(notification.id)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {activeNotification === notification.id ? "Updating..." : "Mark as read"}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
