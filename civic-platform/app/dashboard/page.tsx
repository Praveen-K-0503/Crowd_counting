import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Clock3,
  MapPinned,
  Siren,
  TimerReset,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { LiveSyncBadge } from "@/components/live-sync-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { requireRole } from "@/lib/auth";
import { getDashboardSummary, type DashboardSummary } from "@/lib/api";

const focusItems = [
  "Urgent complaints",
  "Unaccepted assignments",
  "SLA breaches",
  "Pending field updates",
];

export default async function DashboardPage() {
  await requireRole(["department_operator", "municipal_admin"]);

  const fallbackSummary: DashboardSummary = {
    overview: {
      openComplaints: 184,
      criticalComplaints: 7,
      slaRisk: 19,
      resolvedToday: 42,
    },
    urgentQueue: [
      {
        id: "sample-urgent-1",
        complaintCode: "CP-2026-00141",
        title: "Open manhole on high-traffic road",
        domainName: "Public Infrastructure and Amenities",
        priorityLevel: "P1",
        location: "Temple Junction, Ward 4",
        submittedAt: new Date().toISOString(),
      },
      {
        id: "sample-urgent-2",
        complaintCode: "CP-2026-00139",
        title: "Live wire hanging near bus stop",
        domainName: "Electrical Hazard",
        priorityLevel: "P1",
        location: "Bus Stand Road, Ward 9",
        submittedAt: new Date().toISOString(),
      },
    ],
    departmentWorkload: [
      { departmentName: "Roads and Public Works", pendingCount: 31 },
      { departmentName: "Sanitation and Solid Waste", pendingCount: 28 },
      { departmentName: "Water and Sewerage", pendingCount: 44 },
      { departmentName: "Electrical and Street Lighting", pendingCount: 22 },
    ],
  };

  let summary: DashboardSummary = fallbackSummary;

  try {
    summary = await getDashboardSummary();
  } catch {
    summary = fallbackSummary;
  }

  const overviewStats = [
    { label: "Open complaints", value: String(summary.overview.openComplaints), tone: "text-civic-text" },
    { label: "Critical", value: String(summary.overview.criticalComplaints), tone: "text-civic-danger" },
    { label: "SLA risk", value: String(summary.overview.slaRisk), tone: "text-amber-700" },
    { label: "Resolved today", value: String(summary.overview.resolvedToday), tone: "text-emerald-700" },
  ];

  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#09090b] via-civic-primary to-[#1e3a8a] px-8 py-10 text-white shadow-civic lg:px-10 lg:py-12">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/5 blur-[100px]" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-4">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/70">Operations</p>
            <h1 className="text-5xl font-extrabold tracking-tight">Command Center</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <LiveSyncBadge label="Live Refresh" />
            <Link
              className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/40 hover:bg-white/10"
              href="/dashboard/analytics"
            >
              Analytics
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-civic-primary shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
              href="/dashboard/complaints"
            >
              Open Queue
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <div className="relative mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map((stat) => (
            <div key={stat.label} className="group rounded-[2rem] border border-white/15 bg-white/10 p-6 backdrop-blur-xl transition hover:bg-white/15">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">{stat.label}</p>
              <p className={["mt-4 text-4xl font-extrabold tracking-tight", stat.tone.replace("text-civic-text", "text-white").replace("text-civic-danger", "text-rose-400").replace("text-amber-700", "text-amber-400").replace("text-emerald-700", "text-emerald-400")].join(" ")}>{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2.5rem] border border-slate-200 bg-white/80 p-8 shadow-glass backdrop-blur-3xl transition hover:shadow-glass-hover">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-civic-secondary">Urgent queue</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Priority Incidents</h2>
            </div>
            <div className="inline-flex animate-pulse items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-sm font-bold text-rose-700">
              <Siren className="h-4 w-4" />
              Live Feed
            </div>
          </div>

          <div className="mt-8 space-y-5">
            {summary.urgentQueue.length === 0 ? (
              <EmptyState
                description="Critical complaints will appear here as soon as they enter the queue."
                icon={Siren}
                title="No urgent complaints right now"
              />
            ) : (
              summary.urgentQueue.map((item) => (
                <article key={item.id} className="group relative overflow-hidden rounded-[2rem] border-2 border-rose-100 bg-gradient-to-br from-rose-50 to-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-rose-200 hover:shadow-xl">
                  <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-rose-200/50 blur-3xl transition group-hover:bg-rose-300/50" />
                  <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-white px-3.5 py-1 text-xs font-bold text-slate-700 shadow-sm">
                          {item.complaintCode}
                        </span>
                        <PriorityBadge priority={`${item.priorityLevel} ${item.priorityLevel === "P1" ? "Critical" : item.priorityLevel === "P2" ? "High" : item.priorityLevel === "P3" ? "Medium" : "Low"}`} />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900">{item.title}</h3>
                      <p className="text-sm font-medium text-slate-500">{item.domainName ?? "Unclassified"}</p>
                    </div>

                    <div className="rounded-full bg-white/80 px-4 py-2 text-xs font-bold text-rose-700 shadow-sm backdrop-blur-md">
                      {new Date(item.submittedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="relative mt-5 flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
                    <div className="inline-flex items-center gap-2">
                      <MapPinned className="h-4 w-4 text-slate-400" />
                      {item.location ?? "Location pending"}
                    </div>
                  </div>

                  <div className="relative mt-6">
                    <Link
                      className="group/btn inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 hover:shadow-lg"
                      href={`/dashboard/complaints/${item.id}`}
                    >
                      Open Incident
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white/80 p-8 shadow-glass backdrop-blur-3xl transition hover:shadow-glass-hover">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-civic-secondary/15 text-civic-secondary shadow-inner">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-civic-secondary">Departments</p>
                <h2 className="text-2xl font-extrabold text-slate-900">Current Workload</h2>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {summary.departmentWorkload.length === 0 ? (
                <EmptyState
                  description="Department workload will appear here once complaints are assigned into active queues."
                  icon={Building2}
                  title="No department workload yet"
                />
              ) : (
                summary.departmentWorkload.map((item) => (
                  <div key={item.departmentName} className="group rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-slate-200 hover:shadow-md">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg font-bold text-slate-800">{item.departmentName}</h3>
                      <span className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-700 transition group-hover:bg-civic-secondary group-hover:text-white">
                        {item.pendingCount} pending
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[2.5rem] border border-slate-200 bg-white/80 p-8 shadow-glass backdrop-blur-3xl transition hover:shadow-glass-hover">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-inner">
                <TimerReset className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-civic-secondary">Focus</p>
                <h2 className="text-2xl font-extrabold text-slate-900">Immediate Attention</h2>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {focusItems.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-200 hover:shadow-md">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-civic-primary to-blue-900 p-8 text-white shadow-xl transition hover:shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-md">
                <Clock3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">Queue</p>
                <h2 className="text-2xl font-extrabold">Continue Operations</h2>
              </div>
            </div>

            <div className="mt-8">
              <Link
                className="group inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-bold text-civic-primary shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
                href="/dashboard/complaints"
              >
                Go to Complaint Queue
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
