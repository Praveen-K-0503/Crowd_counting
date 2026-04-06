"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";

export function LiveSyncBadge({
  label = "Auto-refreshing",
  intervalMs = 20000,
}: {
  label?: string;
  intervalMs?: number;
}) {
  const router = useRouter();
  const [lastSyncedAt, setLastSyncedAt] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLastSyncedAt(new Date());
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, router]);

  const timeLabel = useMemo(
    () =>
      lastSyncedAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [lastSyncedAt],
  );

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
      <RefreshCcw className="h-3.5 w-3.5 text-civic-secondary" />
      {label} · last sync {timeLabel}
    </div>
  );
}
