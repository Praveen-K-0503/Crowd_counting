import { AppShell } from "@/components/app-shell";
import {
  DashboardQueueClient,
  type QueueComplaintCard,
} from "@/components/dashboard-queue-client";
import { getAllComplaints } from "@/lib/api";
import { requireRole } from "@/lib/auth";

const filterGroups = [
  {
    title: "Status" as const,
    options: ["All", "Submitted", "Assigned", "In Progress", "Resolved", "Reopened"],
  },
  {
    title: "Priority" as const,
    options: ["All", "P1 Critical", "P2 High", "P3 Medium", "P4 Low"],
  },
  {
    title: "Domain" as const,
    options: ["All", "Roads", "Sanitation", "Water", "Electrical", "Infrastructure", "Environment"],
  },
];

const fallbackComplaints: QueueComplaintCard[] = [
  {
    id: "CP-2026-00141",
    complaintCode: "CP-2026-00141",
    title: "Open manhole on high-traffic road",
    domain: "Public Infrastructure and Amenities",
    status: "Submitted",
    priority: "P1 Critical",
    department: "Municipal Maintenance",
    location: "Temple Junction, Ward 4",
    updatedAt: "5 minutes ago",
    submittedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "CP-2026-00139",
    complaintCode: "CP-2026-00139",
    title: "Live wire hanging near bus stop",
    domain: "Electrical Hazard",
    status: "Assigned",
    priority: "P1 Critical",
    department: "Electrical Safety Response",
    location: "Bus Stand Road, Ward 9",
    updatedAt: "12 minutes ago",
    submittedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: "CP-2026-00124",
    complaintCode: "CP-2026-00124",
    title: "Sewage overflow near market entrance",
    domain: "Water Supply, Sewerage, and Drainage",
    status: "In Progress",
    priority: "P2 High",
    department: "Water and Sewerage",
    location: "Market Road, Ward 12",
    updatedAt: "1 hour ago",
    submittedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

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

export default async function DashboardComplaintsPage() {
  const user = await requireRole(["department_operator", "municipal_admin"]);
  let complaints: QueueComplaintCard[] = fallbackComplaints;

  try {
    const apiComplaints = await getAllComplaints();

    if (apiComplaints.length > 0) {
      complaints = apiComplaints.map((complaint) => ({
        id: complaint.id,
        complaintCode: complaint.complaintCode,
        title: complaint.title,
        domain: complaint.domainName ?? "Unclassified",
        status: formatStatus(complaint.status),
        priority: formatPriority(complaint.priorityLevel),
        department: complaint.departmentName ?? "Department pending",
        location: complaint.addressLine ?? complaint.landmark ?? "Location pending",
        updatedAt: new Date(complaint.submittedAt).toLocaleString(),
        submittedAt: complaint.submittedAt,
      }));
    }
  } catch {
    complaints = fallbackComplaints;
  }

  return (
    <AppShell>
      <DashboardQueueClient complaints={complaints} filterGroups={filterGroups} operatorId={user.id} />
    </AppShell>
  );
}
