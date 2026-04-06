import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MessageSquareText,
  ShieldAlert,
  UserCog,
} from "lucide-react";
import { AdminAssignAction } from "@/components/admin-assign-action";
import { AdminAssignmentHistory } from "@/components/admin-assignment-history";
import { AdminNotesPanel } from "@/components/admin-notes-panel";
import { AppShell } from "@/components/app-shell";
import { AdminStatusActions } from "@/components/admin-status-actions";
import { ComplaintAiPanel } from "@/components/complaint-ai-panel";
import { ComplaintMediaGallery } from "@/components/complaint-media-gallery";
import { ResolutionProofUploader } from "@/components/resolution-proof-uploader";
import { SectionHeader } from "@/components/section-header";
import { requireRole } from "@/lib/auth";
import {
  getComplaintDetail,
  getComplaintAssignments,
  getComplaintAiInsights,
  getComplaintHistory,
  getComplaintMedia,
  getComplaintNotes,
  type ComplaintAiInsights,
  type ComplaintAssignmentItem,
  type ComplaintMediaItem,
  type ComplaintNoteItem,
  type ComplaintStatusHistoryItem,
} from "@/lib/api";

const internalActions = [
  "Validate complaint",
  "Adjust domain or sub-problem if needed",
  "Assign responsible department",
  "Assign field officer later",
  "Change lifecycle state",
  "Escalate if public danger is immediate",
];

type DashboardComplaintDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function getPriorityRationale(priority: string, isEmergency: boolean) {
  if (isEmergency || priority === "P1 Critical") {
    return "Emergency or public-danger signals require immediate routing and shortest possible response time.";
  }

  if (priority === "P2 High") {
    return "High-impact infrastructure or safety risk needs fast ownership before it grows into a wider area failure.";
  }

  if (priority === "P3 Medium") {
    return "Standard operational issue with visible citizen impact. Keep it moving through the active queue.";
  }

  return "Lower-impact maintenance issue that can stay in the planned service backlog unless conditions worsen.";
}

function getRoutingConfidence(domain: string, assignments: ComplaintAssignmentItem[], department: string) {
  if (assignments.length > 0) {
    return `Routing has already been acted on. The latest ownership sits with ${assignments[0]?.departmentName ?? department}.`;
  }

  if (domain === "Fire Emergencies" || domain === "Flood and Water Disaster" || domain === "Disaster and Rescue") {
    return `Emergency domain strongly matches ${department} and should stay on the fastest escalation path.`;
  }

  return `Current domain and complaint context point to ${department} as the primary queue owner.`;
}

function getOperationalState(status: string, assignments: ComplaintAssignmentItem[]) {
  if (status === "Resolved" || status === "Closed") {
    return "Work appears completed. Review proof, citizen follow-up, and any reopen risk.";
  }

  if (status === "Reopened" || status === "Escalated") {
    return "Complaint needs renewed attention. Recheck ownership, on-ground risk, and SLA exposure.";
  }

  if (assignments.length > 0) {
    return "Complaint is in active departmental handling. Track acceptance and field progress closely.";
  }

  return "Complaint still needs clear ownership. Assignment is the next critical operator action.";
}

function timelineTone(status: string) {
  switch (status) {
    case "submitted":
      return "bg-civic-primary";
    case "validated":
      return "bg-civic-secondary";
    case "classified":
    case "prioritized":
      return "bg-amber-500";
    case "assigned":
      return "bg-slate-800";
    case "in_progress":
      return "bg-emerald-600";
    case "resolved":
    case "closed":
      return "bg-emerald-700";
    case "reopened":
    case "escalated":
      return "bg-civic-danger";
    default:
      return "bg-slate-300";
  }
}

export default async function DashboardComplaintDetailPage({ params }: DashboardComplaintDetailPageProps) {
  const user = await requireRole(["department_operator", "municipal_admin"]);
  const { id } = await params;

  let complaintCode = "CP-2026-00141";
  let complaintStatusValue = "submitted";
  let complaintStatus = "Submitted";
  let complaintPriority = "P1 Critical";
  let complaintDomain = "Public Infrastructure and Amenities";
  let complaintTitle = "Open manhole on high-traffic road";
  let complaintLocation = "Temple Junction, Ward 4";
  let complaintDescription = "High-risk public hazard affecting traffic near the junction.";
  let complaintDepartment = "Municipal Maintenance";
  let isEmergency = true;
  let media: ComplaintMediaItem[] = [];
  let assignments: ComplaintAssignmentItem[] = [];
  let notes: ComplaintNoteItem[] = [];
  let aiInsights: ComplaintAiInsights | null = null;
  let internalTimeline: Array<{ title: string; time: string; note: string; tone: string }> = [
    {
      title: "Submitted",
      time: "Pending",
      note: "Complaint created by citizen with image and geo-tag.",
      tone: "bg-civic-primary",
    },
  ];

  try {
    const [complaint, assignmentItems, history, mediaItems, noteItems, aiData] = await Promise.all([
      getComplaintDetail(id),
      getComplaintAssignments(id),
      getComplaintHistory(id),
      getComplaintMedia(id),
      getComplaintNotes(id),
      getComplaintAiInsights(id),
    ]);

    complaintCode = complaint.complaintCode;
    complaintStatusValue = complaint.status;
    complaintStatus = formatStatus(complaint.status);
    complaintPriority = formatPriority(complaint.priorityLevel);
    complaintDomain = complaint.domainName ?? complaintDomain;
    complaintTitle = complaint.title;
    complaintLocation = complaint.addressLine ?? complaint.landmark ?? complaintLocation;
    complaintDescription = complaint.description ?? complaintDescription;
    complaintDepartment = complaint.departmentName ?? complaintDepartment;
    isEmergency = complaint.isEmergency;
    assignments = assignmentItems;
    media = mediaItems;
    notes = noteItems;
    aiInsights = aiData;

    if (history.length > 0) {
      internalTimeline = history.map((entry: ComplaintStatusHistoryItem) => ({
        title: formatStatus(entry.newStatus),
        time: formatDateTime(entry.createdAt),
        note: entry.changeReason ?? `Complaint moved to ${formatStatus(entry.newStatus)}.`,
        tone: timelineTone(entry.newStatus),
      }));
    }
  } catch {
    // Keep fallback values when backend is unavailable.
  }

  const complaintMeta = [
    { label: "Complaint ID", value: complaintCode },
    { label: "Current status", value: complaintStatus },
    { label: "Priority", value: complaintPriority },
    { label: "Domain", value: complaintDomain },
  ];

  const complaintContext = [
    `Issue: ${complaintTitle}`,
    `Location: ${complaintLocation}`,
    `Likely department: ${complaintDepartment}`,
    complaintDescription,
  ];

  const routingDecisionItems = [
    `Current queue owner: ${assignments[0]?.departmentName ?? complaintDepartment}`,
    `Operational mode: ${isEmergency ? "Emergency escalation path" : "Standard civic workflow"}`,
    `Priority rationale: ${getPriorityRationale(complaintPriority, isEmergency)}`,
    `Routing confidence: ${getRoutingConfidence(complaintDomain, assignments, complaintDepartment)}`,
    `Current action state: ${getOperationalState(complaintStatus, assignments)}`,
  ];

  return (
    <AppShell>
      <section className="grid gap-6 rounded-[2rem] bg-civic-primary px-6 py-8 text-white shadow-civic lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/75">Internal complaint view</p>
          <h1 className="text-4xl font-semibold tracking-tight">Manage one complaint from triage to resolution.</h1>
          <p className="max-w-2xl text-sm leading-7 text-white/80">
            Review context, route the work, assign the right team, and move the complaint through the next action.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {complaintMeta.map((item) => (
            <div key={item.label} className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">{item.label}</p>
              <p className="mt-3 text-xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader eyebrow="Complaint context" icon={ClipboardList} title="Citizen submission details" />

            <div className="mt-5 space-y-3">
              {complaintContext.map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-civic-text">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader eyebrow="Lifecycle" icon={Clock3} iconClassName="bg-civic-primary text-white" title="Internal status timeline" />

            <div className="mt-6 space-y-5">
              {internalTimeline.map((entry, index) => (
                <div key={`${entry.title}-${entry.time}-${index}`} className="grid gap-4 md:grid-cols-[auto_1fr] md:gap-5">
                  <div className="flex items-start gap-4 md:flex-col md:items-center">
                    <div className={["mt-1 h-4 w-4 rounded-full", entry.tone].join(" ")} />
                    {index !== internalTimeline.length - 1 ? <div className="hidden h-16 w-px bg-slate-200 md:block" /> : null}
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-civic-text">{entry.title}</h3>
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                        <Clock3 className="h-4 w-4" />
                        {entry.time}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-civic-muted">{entry.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader eyebrow="Internal notes" icon={MessageSquareText} iconClassName="bg-amber-100 text-amber-700" title="Operator-only information" />

            <div className="mt-5">
              <AdminNotesPanel complaintId={id} initialNotes={notes} operatorId={user.id} />
            </div>
          </section>

          <AdminAssignmentHistory assignments={assignments} />
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader eyebrow="Priority and routing" icon={ShieldAlert} iconClassName="bg-red-100 text-civic-danger" title="Department decision block" />

            <div className="mt-5 space-y-3">
              {routingDecisionItems.map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-civic-text">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-5">
              <AdminAssignAction complaintId={id} suggestedDepartment={complaintDepartment} operatorId={user.id} />
            </div>
          </section>

          <ComplaintAiPanel insights={aiInsights} />

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader eyebrow="Actions" icon={UserCog} title="Operator workflow controls" />

            <div className="mt-5 space-y-3">
              {internalActions.map((action) => (
                <div key={action} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-civic-text">
                  {action}
                </div>
              ))}
            </div>

            <div className="mt-5">
              <AdminStatusActions complaintId={id} currentStatus={complaintStatusValue} operatorId={user.id} />
            </div>
          </section>

          <ComplaintMediaGallery
            items={media}
            title="Complaint evidence"
            emptyLabel="No evidence has been uploaded for this complaint yet."
          />

          <ResolutionProofUploader complaintId={id} uploadedBy={user.id} label="Attach final proof from operations" />

          <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div>
                <h2 className="text-lg font-semibold text-emerald-950">Internal-only context</h2>
                <p className="mt-2 text-sm leading-6 text-emerald-900/85">
                  Notes, routing context, and assignment controls stay visible only to internal teams.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Queue navigation</p>
          <h2 className="text-2xl font-semibold text-civic-text">Jump back to the queue or move into emergency operations.</h2>
          <p className="max-w-2xl text-sm leading-6 text-civic-muted">
            Use the queue to continue triage work, or switch to emergency reporting when a fast-response situation needs immediate handling.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary"
            href="/dashboard/complaints"
          >
            Back to queue
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            href="/emergency"
          >
            Open emergency reporting
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
