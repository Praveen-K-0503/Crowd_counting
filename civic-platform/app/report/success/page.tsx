import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Hash, MapPinned, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FlowSteps } from "@/components/flow-steps";

const steps = ["Choose domain", "Add evidence", "Confirm location", "Review", "Submit"];

const nextActions = [
  "Your report is stored with a complaint ID for tracking.",
  "The first visible status is Submitted.",
  "Routing and priority decide which department picks it up next.",
  "You will see updates when the complaint is assigned, worked on, or resolved.",
];

const summaryCards = [
  {
    icon: Hash,
    label: "Complaint ID",
    value: "CP-2026-00124",
  },
  {
    icon: Clock3,
    label: "Current status",
    value: "Submitted",
  },
  {
    icon: MapPinned,
    label: "Location state",
    value: "Geo-tag confirmed",
  },
];

type ReportSuccessPageProps = {
  searchParams?: Promise<{
    id?: string;
    code?: string;
    media?: string;
  }>;
};

export default async function ReportSuccessPage({ searchParams }: ReportSuccessPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const complaintId = resolvedSearchParams?.id ?? "sample-complaint";
  const complaintCode = resolvedSearchParams?.code ?? "CP-2026-00124";
  const mediaStatus = resolvedSearchParams?.media ?? "complete";

  return (
    <AppShell>
      <section className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Report flow</p>
          <h1 className="text-4xl font-semibold tracking-tight text-civic-text">Complaint submitted successfully</h1>
          <p className="max-w-3xl text-sm leading-7 text-civic-muted">
            Your complaint has been recorded. Keep the complaint ID handy and use the tracking page for updates.
          </p>
        </div>

        <FlowSteps currentStep={5} steps={steps} />
      </section>

      <section className="rounded-[2rem] bg-civic-primary px-6 py-8 text-white shadow-civic lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-civic-primary">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight">Your complaint is now in the system.</h2>
              <p className="max-w-2xl text-sm leading-7 text-white/80">
                It will now move through review, routing, assignment, and resolution. You can track progress from your
                complaints page at any time.
              </p>
              {mediaStatus === "partial" ? (
                <p className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/90">
                  Your complaint was submitted, but one or more media files could not be uploaded.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-civic-primary transition hover:-translate-y-0.5"
                href="/complaints"
              >
                View my complaints
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                href={`/complaints/${complaintId}`}
              >
                Open complaint detail
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {summaryCards.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <Icon className="mb-4 h-6 w-6 text-civic-accent" />
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/75">{label}</p>
                <p className="mt-2 text-xl font-semibold text-white">
                  {label === "Complaint ID" ? complaintCode : value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-civic-secondary/15 text-civic-secondary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">What happens next</p>
              <h2 className="text-xl font-semibold text-civic-text">Post-submission workflow</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {nextActions.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-civic-text">
                {item}
              </div>
            ))}
          </div>
        </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Helpful shortcuts</p>
          <h2 className="mt-2 text-2xl font-semibold text-civic-text">What you can do from here</h2>
          <p className="mt-3 text-sm leading-7 text-civic-muted">
            You can report another issue, open the complaint detail page, or switch to emergency reporting if the
            situation has become urgent.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "Complaint ID",
              "Current status",
              "Expected next step",
              "Tracking shortcut",
              "Submit another issue",
              "Emergency reporting shortcut",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 p-4 text-sm font-medium text-civic-text">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary"
              href="/report"
            >
              Submit another issue
            </Link>
            <Link
              className="inline-flex rounded-full bg-civic-danger px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              href="/emergency"
            >
              Emergency reporting
            </Link>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
