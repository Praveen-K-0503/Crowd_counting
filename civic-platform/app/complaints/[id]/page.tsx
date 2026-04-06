import Link from "next/link";
import { AlertTriangle, Clock3, MapPinned, ShieldCheck, Waves } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CitizenFollowUpPanel } from "@/components/citizen-follow-up-panel";
import { ComplaintMediaGallery } from "@/components/complaint-media-gallery";
import { SectionHeader } from "@/components/section-header";
import { requireRole } from "@/lib/auth";
import {
  getComplaintDetail,
  getComplaintFeedback,
  getComplaintHistory,
  getComplaintMedia,
  type ComplaintFeedbackItem,
  type ComplaintMediaItem,
  type ComplaintStatusHistoryItem,
} from "@/lib/api";

type ComplaintDetailPageProps = {
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

export default async function ComplaintDetailPage({ params }: ComplaintDetailPageProps) {
  await requireRole(["citizen"]);
  const { id } = await params;

  let complaintStatus = "In Progress";
  let complaintPriority = "P2 High";
  let complaintLocation = "Market Road, Ward 12";
  let complaintDomain = "Water Supply, Sewerage, and Drainage";
  let complaintDescription = "Overflow affecting entry and traffic movement near the market.";
  let complaintCode = "CP-2026-00124";
  let complaintDepartment = "Water and Sewerage";
  let media: ComplaintMediaItem[] = [];
  let feedback: ComplaintFeedbackItem[] = [];
  let rawStatus = "in_progress";
  let citizenId = "00000000-0000-0000-0000-000000000001";
  let timeline: Array<{ title: string; time: string; note: string; tone: string }> = [
    {
      title: "Submitted",
      time: "Pending",
      note: "Complaint created by citizen with image, description, and geo-tagged location.",
      tone: "bg-civic-primary",
    },
  ];

  try {
    const [complaint, history, mediaItems, feedbackItems] = await Promise.all([
      getComplaintDetail(id),
      getComplaintHistory(id),
      getComplaintMedia(id),
      getComplaintFeedback(id),
    ]);

    rawStatus = complaint.status;
    complaintStatus = formatStatus(complaint.status);
    complaintPriority = formatPriority(complaint.priorityLevel);
    complaintLocation = complaint.addressLine ?? complaint.landmark ?? "Location pending";
    complaintDomain = complaint.domainName ?? "Unclassified";
    complaintDescription = complaint.description ?? complaintDescription;
    complaintCode = complaint.complaintCode;
    complaintDepartment = complaint.departmentName ?? complaintDepartment;
    citizenId = complaint.citizenId;
    media = mediaItems;
    feedback = feedbackItems;

    if (history.length > 0) {
      timeline = history.map((entry: ComplaintStatusHistoryItem) => ({
        title: formatStatus(entry.newStatus),
        time: formatDateTime(entry.createdAt),
        note: entry.changeReason ?? `Complaint moved to ${formatStatus(entry.newStatus)}.`,
        tone: timelineTone(entry.newStatus),
      }));
    }
  } catch {
    // Keep fallback values for design flow when backend is unavailable.
  }

  return (
    <AppShell>
      <section className="grid gap-6 rounded-[2rem] bg-civic-primary px-6 py-8 text-white shadow-civic lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/75">Complaint detail</p>
          <h1 className="text-4xl font-semibold tracking-tight">Track your complaint in one place.</h1>
          <p className="max-w-2xl text-sm leading-7 text-white/80">
            Check the current status, department ownership, attached evidence, and any updates from the city team.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: "Complaint ID", value: complaintCode },
            { label: "Current status", value: complaintStatus },
            { label: "Priority", value: complaintPriority },
            { label: "Assigned department", value: complaintDepartment },
          ].map((card) => (
            <div key={card.label} className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">{card.label}</p>
              <p className="mt-3 text-xl font-semibold text-white">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Timeline</p>
              <h2 className="mt-2 text-2xl font-semibold text-civic-text">Status history</h2>
            </div>
            <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
              Current state: {complaintStatus}
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {timeline.map((entry, index) => (
              <div key={`${entry.title}-${entry.time}-${index}`} className="grid gap-4 md:grid-cols-[auto_1fr] md:gap-5">
                <div className="flex items-start gap-4 md:flex-col md:items-center">
                  <div className={["mt-1 h-4 w-4 rounded-full", entry.tone].join(" ")} />
                  {index !== timeline.length - 1 ? <div className="hidden h-16 w-px bg-slate-200 md:block" /> : null}
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

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader eyebrow="Location" icon={MapPinned} title="Complaint context" />

            <div className="mt-5 space-y-3">
              {[complaintLocation, `Domain: ${complaintDomain}`, complaintDescription].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-civic-text">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <ComplaintMediaGallery
            items={media}
            title="Photos, video, and audio"
            emptyLabel="No evidence has been added to this complaint yet."
          />

          <CitizenFollowUpPanel complaintId={id} citizenId={citizenId} status={rawStatus} feedback={feedback} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-lg font-semibold text-emerald-950">What you can see here</h2>
              <p className="mt-2 text-sm leading-6 text-emerald-900/85">
                This page shows your complaint progress and public-safe updates without exposing internal staff notes.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <h2 className="text-lg font-semibold text-amber-950">Need more help?</h2>
              <p className="mt-2 text-sm leading-6 text-amber-900/85">
                If the issue is marked resolved but still exists, use the reopen option below so the team can review it again.
              </p>
            </div>
          </div>
        </section>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Quick actions</p>
          <h2 className="text-2xl font-semibold text-civic-text">Keep track of this report or return to your list.</h2>
          <p className="max-w-2xl text-sm leading-6 text-civic-muted">
            You can go back to all complaints, stay on this page for updates, or report another issue if needed.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary"
            href="/complaints"
          >
            Back to complaints
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            href="/report"
          >
            Report another issue
            <Waves className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
