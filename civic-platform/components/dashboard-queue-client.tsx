"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, MapPinned, Search, SlidersHorizontal } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getNextStatusOptions } from "@/lib/complaint-lifecycle";
import { LiveSyncBadge } from "@/components/live-sync-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import {
  assignComplaint,
  getDepartments,
  updateComplaintStatus,
  type DepartmentOption,
} from "@/lib/api";

export type QueueComplaintCard = {
  id: string;
  complaintCode?: string;
  title: string;
  domain: string;
  status: string;
  priority: string;
  department: string;
  location: string;
  updatedAt: string;
  submittedAt: string;
};

type FilterGroup = {
  title: "Status" | "Priority" | "Domain";
  options: string[];
};

type DashboardQueueClientProps = {
  complaints: QueueComplaintCard[];
  filterGroups: FilterGroup[];
  operatorId: string;
};

const sortOptions = [
  { label: "Priority first", value: "priority" },
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Reopened first", value: "reopened" },
] as const;

type SortValue = (typeof sortOptions)[number]["value"];

function normalizeDomainOption(option: string) {
  if (option === "Infrastructure") return "Public Infrastructure";
  return option;
}

function priorityRank(priority: string) {
  switch (priority) {
    case "P1 Critical":
      return 1;
    case "P2 High":
      return 2;
    case "P3 Medium":
      return 3;
    default:
      return 4;
  }
}

export function DashboardQueueClient({ complaints, filterGroups, operatorId }: DashboardQueueClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [sortBy, setSortBy] = useState<SortValue>("priority");
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [assignmentSelections, setAssignmentSelections] = useState<Record<string, string>>({});
  const [statusSelections, setStatusSelections] = useState<Record<string, string>>({});
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadDepartments() {
      try {
        const result = await getDepartments();
        setDepartments(result);
      } catch {
        return;
      }
    }

    void loadDepartments();
  }, []);

  const filteredComplaints = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = complaints.filter((complaint) => {
      const matchesSearch =
        query.length === 0 ||
        complaint.title.toLowerCase().includes(query) ||
        complaint.domain.toLowerCase().includes(query) ||
        complaint.location.toLowerCase().includes(query) ||
        complaint.department.toLowerCase().includes(query) ||
        (complaint.complaintCode ?? complaint.id).toLowerCase().includes(query);

      const matchesStatus = selectedStatus === "All" || complaint.status === selectedStatus;
      const matchesPriority = selectedPriority === "All" || complaint.priority === selectedPriority;
      const matchesDomain =
        selectedDomain === "All" || complaint.domain.toLowerCase().includes(normalizeDomainOption(selectedDomain).toLowerCase());

      return matchesSearch && matchesStatus && matchesPriority && matchesDomain;
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === "newest") {
        return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
      }

      if (sortBy === "oldest") {
        return new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
      }

      if (sortBy === "reopened") {
        const reopenedDelta =
          Number(right.status === "Reopened") - Number(left.status === "Reopened");

        if (reopenedDelta !== 0) {
          return reopenedDelta;
        }
      }

      const priorityDelta = priorityRank(left.priority) - priorityRank(right.priority);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
    });
  }, [complaints, searchQuery, selectedDomain, selectedPriority, selectedStatus, sortBy]);

  const queueStats = [
    { label: "Visible in queue", value: String(filteredComplaints.length) },
    {
      label: "Needs assignment",
      value: String(filteredComplaints.filter((complaint) => complaint.department === "Department pending").length),
    },
    {
      label: "Reopened",
      value: String(filteredComplaints.filter((complaint) => complaint.status === "Reopened").length),
    },
  ];

  function handleQuickAssign(complaintId: string) {
    const departmentId = assignmentSelections[complaintId];

    if (!departmentId) {
      return;
    }

    setError(null);
    setActiveAction(`assign-${complaintId}`);

    startTransition(async () => {
      try {
        await assignComplaint({
          complaintId,
          departmentId,
          assignedByUserId: operatorId,
          notes: "Quick assignment from queue",
        });

        router.refresh();
      } catch (assignError) {
        setError(assignError instanceof Error ? assignError.message : "Failed to assign complaint");
      } finally {
        setActiveAction(null);
      }
    });
  }

  function handleQuickStatus(complaintId: string) {
    const newStatus = statusSelections[complaintId];

    if (!newStatus) {
      return;
    }

    setError(null);
    setActiveAction(`status-${complaintId}`);

    startTransition(async () => {
      try {
        await updateComplaintStatus({
          complaintId,
          newStatus,
          changedBy: operatorId,
          reason: "Quick status update from queue",
        });

        router.refresh();
      } catch (statusError) {
        setError(statusError instanceof Error ? statusError.message : "Failed to update complaint status");
      } finally {
        setActiveAction(null);
      }
    });
  }

  return (
    <>
      <section className="grid gap-6 rounded-[2rem] bg-civic-primary px-6 py-8 text-white shadow-civic lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/75">Queue management</p>
          <h1 className="text-4xl font-semibold tracking-tight">Work through complaints with fast filters and clear urgency.</h1>
          <p className="max-w-2xl text-sm leading-7 text-white/80">
            Search, filter, assign, and update complaints from one live operational queue.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {queueStats.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">{stat.label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-civic-secondary/15 text-civic-secondary">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">Filters</p>
                <h2 className="text-xl font-semibold text-civic-text">Queue controls</h2>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {filterGroups.map((group) => {
                const selectedValue =
                  group.title === "Status"
                    ? selectedStatus
                    : group.title === "Priority"
                      ? selectedPriority
                      : selectedDomain;

                const setSelectedValue =
                  group.title === "Status"
                    ? setSelectedStatus
                    : group.title === "Priority"
                      ? setSelectedPriority
                      : setSelectedDomain;

                return (
                  <div key={group.title} className="space-y-3">
                    <p className="text-sm font-semibold text-civic-text">{group.title}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSelectedValue(option)}
                          className={[
                            "rounded-full px-4 py-2 text-sm font-semibold transition",
                            selectedValue === option
                              ? "bg-civic-primary text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                          ].join(" ")}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search className="h-4 w-4 text-civic-muted" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-transparent text-sm text-civic-text outline-none placeholder:text-civic-muted"
                placeholder="Search by complaint ID, domain, location, or department"
              />
            </label>

            <div className="mt-5 space-y-3">
              <p className="text-sm font-semibold text-civic-text">Sort by</p>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSortBy(option.value)}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      sortBy === option.value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </aside>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Complaint queue</p>
              <h2 className="mt-2 text-2xl font-semibold text-civic-text">Filtered operational list</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LiveSyncBadge label="Queue live refresh" />
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                <SlidersHorizontal className="h-4 w-4" />
                {sortOptions.find((option) => option.value === sortBy)?.label}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {error ? <p className="text-sm font-medium text-civic-danger">{error}</p> : null}
            {filteredComplaints.length === 0 ? (
              <EmptyState
                description="Try changing the filters, priority, or search term to bring complaints back into view."
                icon={SlidersHorizontal}
                title="No complaints match these filters"
              />
            ) : (
              filteredComplaints.map((complaint) => (
                <article
                  key={complaint.id}
                  className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-civic"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {complaint.complaintCode ?? complaint.id}
                        </span>
                        <StatusBadge status={complaint.status} />
                        <PriorityBadge priority={complaint.priority} />
                      </div>
                      <h3 className="text-xl font-semibold text-civic-text">{complaint.title}</h3>
                      <p className="text-sm text-civic-muted">{complaint.domain}</p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                      <Clock3 className="h-4 w-4" />
                      {complaint.updatedAt}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-civic-text">
                      Department: {complaint.department}
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-civic-text">
                      Queue state: {complaint.status}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-civic-muted">
                    <div className="inline-flex items-center gap-2">
                      <MapPinned className="h-4 w-4" />
                      {complaint.location}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                      href={`/dashboard/complaints/${complaint.id}`}
                    >
                      Open detail
                    </Link>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={assignmentSelections[complaint.id] ?? ""}
                        onChange={(event) =>
                          setAssignmentSelections((current) => ({
                            ...current,
                            [complaint.id]: event.target.value,
                          }))
                        }
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-civic-primary"
                      >
                        <option value="">Assign department</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={isPending || !assignmentSelections[complaint.id]}
                        onClick={() => handleQuickAssign(complaint.id)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {activeAction === `assign-${complaint.id}` ? "Assigning..." : "Quick assign"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={statusSelections[complaint.id] ?? ""}
                        onChange={(event) =>
                          setStatusSelections((current) => ({
                            ...current,
                            [complaint.id]: event.target.value,
                          }))
                        }
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-civic-primary"
                      >
                        <option value="">Change status</option>
                        {getNextStatusOptions(complaint.status).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={isPending || !statusSelections[complaint.id]}
                        onClick={() => handleQuickStatus(complaint.id)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {activeAction === `status-${complaint.id}` ? "Updating..." : "Quick status"}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </>
  );
}
