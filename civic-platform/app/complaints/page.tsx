import Link from "next/link";
import { Clock3, MapPinned, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { getCitizenComplaints } from "@/lib/api";
import { requireRole } from "@/lib/auth";

const complaintStats = [
  { label: "Active", value: "04" },
  { label: "Resolved", value: "09" },
  { label: "Reopened", value: "01" },
];

type ComplaintCard = {
  id: string;
  complaintCode?: string;
  title: string;
  domain: string;
  status: string;
  priority: string;
  location: string;
  updatedAt: string;
};

const fallbackComplaints: ComplaintCard[] = [
  {
    id: "CP-2026-00124",
    complaintCode: "CP-2026-00124",
    title: "Sewage overflow near market entrance",
    domain: "Water Supply, Sewerage, and Drainage",
    status: "In Progress",
    priority: "P2 High",
    location: "Market Road, Ward 12",
    updatedAt: "Updated 1 hour ago",
  },
  {
    id: "CP-2026-00108",
    complaintCode: "CP-2026-00108",
    title: "Streetlight not working on school road",
    domain: "Street Lighting and Electrical Infrastructure",
    status: "Assigned",
    priority: "P3 Medium",
    location: "School Street, Ward 8",
    updatedAt: "Updated today",
  },
  {
    id: "CP-2026-00097",
    complaintCode: "CP-2026-00097",
    title: "Overflowing garbage bin near bus stop",
    domain: "Sanitation and Waste Management",
    status: "Resolved",
    priority: "P3 Medium",
    location: "Central Bus Stop, Ward 3",
    updatedAt: "Resolved yesterday",
  },
  {
    id: "CP-2026-00091",
    complaintCode: "CP-2026-00091",
    title: "Open manhole beside community hall",
    domain: "Public Infrastructure and Amenities",
    status: "Reopened",
    priority: "P1 Critical",
    location: "Community Hall Lane, Ward 5",
    updatedAt: "Reopened 3 hours ago",
  },
];

const filters = ["All", "Active", "Resolved", "Reopened", "Emergency"];

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPriority(priority: string) {
  switch (priority) {
    case "P1":
      return "P1 Critical";
    case "P2":
      return "P2 High";
    case "P3":
      return "P3 Medium";
    default:
      return "P4 Low";
  }
}

export default async function ComplaintsPage() {
  const user = await requireRole(["citizen"]);
  let complaints: ComplaintCard[] = fallbackComplaints;

  try {
    const apiComplaints = await getCitizenComplaints(user.id);

    if (apiComplaints.length > 0) {
      complaints = apiComplaints.map((complaint) => ({
        id: complaint.id,
        title: complaint.title,
        domain: complaint.domainName ?? "Unclassified",
        status: formatStatus(complaint.status),
        priority: formatPriority(complaint.priorityLevel),
        location: complaint.departmentName ?? "Department pending",
        updatedAt: new Date(complaint.submittedAt).toLocaleString(),
        complaintCode: complaint.complaintCode,
      }));
    }
  } catch {
    complaints = fallbackComplaints;
  }

  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0F172A] via-civic-primary to-[#1E3A8A] px-8 py-12 text-white shadow-civic lg:px-12 lg:py-16">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-[100px]" />
        
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">My Reports</h1>
            <p className="text-lg text-slate-300">Track the status of the issues you've reported in your neighborhood.</p>
          </div>
          <Link
            className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-base font-bold text-civic-primary shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl"
            href="/report"
          >
            Report a new issue
          </Link>
        </div>

        <div className="relative mt-10 grid gap-5 sm:grid-cols-3">
          {complaintStats.map((stat) => (
            <div key={stat.label} className="rounded-[2rem] border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">{stat.label}</p>
              <p className="mt-4 text-4xl font-extrabold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={[
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    filter === "All"
                      ? "bg-civic-primary text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                  ].join(" ")}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-civic-muted lg:min-w-80">
              <Search className="h-4 w-4" />
              Search by complaint ID or area
            </div>
          </div>
        </div>

        <section className="rounded-[2.5rem] border border-slate-200 bg-white/70 p-8 shadow-glass backdrop-blur-xl">
          <h2 className="text-2xl font-extrabold text-slate-900">Recent Activity</h2>

          <div className="mt-8 space-y-5">
            {complaints.map((complaint) => (
              <article
                key={complaint.id}
                className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-slate-100 px-3.5 py-1 text-xs font-bold text-slate-700">
                        {complaint.complaintCode ?? complaint.id}
                      </span>
                      <StatusBadge status={complaint.status} />
                      <PriorityBadge priority={complaint.priority} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">{complaint.title}</h3>
                    <p className="text-sm font-medium text-slate-500">{complaint.domain}</p>
                  </div>

                  <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500">
                    <Clock3 className="h-4 w-4" />
                    {complaint.updatedAt}
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-500">
                  <MapPinned className="h-4 w-4" />
                  {complaint.location}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 hover:shadow-lg"
                    href={`/complaints/${complaint.id}`}
                  >
                    View Details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
