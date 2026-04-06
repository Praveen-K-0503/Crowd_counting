import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { LiveSyncBadge } from "@/components/live-sync-badge";
import { requireRole } from "@/lib/auth";
import { getAnalyticsExportUrl, getAnalyticsSummary, type AnalyticsSummary } from "@/lib/api";
import { ArrowDownToLine, BarChart3, Clock3, Siren, TrendingUp } from "lucide-react";

const fallbackAnalytics: AnalyticsSummary = {
  trends: [],
  domainBreakdown: [],
  departmentPerformance: [],
  kpis: {
    emergencyCount: 0,
    reopenedCount: 0,
    repeatComplaintRiskCount: 0,
    slaBreaches: 0,
  },
};

export default async function DashboardAnalyticsPage() {
  await requireRole(["department_operator", "municipal_admin"]);

  let analytics = fallbackAnalytics;

  try {
    analytics = await getAnalyticsSummary();
  } catch {
    analytics = fallbackAnalytics;
  }

  const maxTrend = Math.max(
    1,
    ...analytics.trends.flatMap((item) => [item.reportedCount, item.resolvedCount]),
  );

  return (
    <AppShell>
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-civic-primary to-[#0b6a8f] px-6 py-8 text-white shadow-civic lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70">Analytics</p>
            <h1 className="text-4xl font-semibold tracking-tight">Track performance, trends, and launch readiness.</h1>
            <p className="max-w-2xl text-sm leading-7 text-white/80">
              Use this view to monitor complaint trends, department throughput, SLA risk, and repeat civic failures.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LiveSyncBadge label="Analytics live refresh" />
            <a
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-civic-primary transition hover:-translate-y-0.5"
              href={getAnalyticsExportUrl()}
              target="_blank"
              rel="noreferrer"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Export CSV
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        {[
          { label: "Emergency", value: analytics.kpis.emergencyCount, icon: Siren },
          { label: "Reopened", value: analytics.kpis.reopenedCount, icon: TrendingUp },
          { label: "Repeat risk", value: analytics.kpis.repeatComplaintRiskCount, icon: BarChart3 },
          { label: "SLA breaches", value: analytics.kpis.slaBreaches, icon: Clock3 },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-civic-secondary/15 text-civic-secondary">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-civic-muted">{item.label}</p>
              <p className="mt-2 text-3xl font-semibold text-civic-text">{item.value}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Trends</p>
            <h2 className="mt-2 text-2xl font-semibold text-civic-text">Reported vs resolved over the last 7 days</h2>
          </div>
          <div className="mt-6 space-y-4">
            {analytics.trends.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No trend data yet" description="Trend data will appear once complaints start moving through the system." />
            ) : (
              analytics.trends.map((item) => (
                <div key={item.day} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-civic-text">{item.day}</span>
                    <span className="text-civic-muted">
                      reported {item.reportedCount} · resolved {item.resolvedCount}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-civic-primary"
                        style={{ width: `${(item.reportedCount / maxTrend) * 100}%` }}
                      />
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-civic-success"
                        style={{ width: `${(item.resolvedCount / maxTrend) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Domains</p>
            <h2 className="mt-2 text-2xl font-semibold text-civic-text">Complaint share by category</h2>
          </div>
          <div className="mt-6 space-y-3">
            {analytics.domainBreakdown.length === 0 ? (
              <EmptyState icon={BarChart3} title="No domain data yet" description="Domain distribution appears once complaints are recorded." />
            ) : (
              analytics.domainBreakdown.map((item) => (
                <div key={item.domainName} className="rounded-3xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-civic-text">{item.domainName}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {item.complaintCount}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Departments</p>
            <h2 className="mt-2 text-2xl font-semibold text-civic-text">Performance and response time</h2>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary"
          >
            Back to overview
          </Link>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-civic-muted">
                <th className="px-3 py-3 font-semibold">Department</th>
                <th className="px-3 py-3 font-semibold">Pending</th>
                <th className="px-3 py-3 font-semibold">Resolved</th>
                <th className="px-3 py-3 font-semibold">Avg resolution (hrs)</th>
              </tr>
            </thead>
            <tbody>
              {analytics.departmentPerformance.map((item) => (
                <tr key={item.departmentName} className="border-b border-slate-100">
                  <td className="px-3 py-4 font-semibold text-civic-text">{item.departmentName}</td>
                  <td className="px-3 py-4 text-civic-muted">{item.pendingCount}</td>
                  <td className="px-3 py-4 text-civic-muted">{item.resolvedCount}</td>
                  <td className="px-3 py-4 text-civic-muted">{item.averageResolutionHours.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
