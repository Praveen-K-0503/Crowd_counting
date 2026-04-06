import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardList, LocateFixed, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FlowSteps } from "@/components/flow-steps";

const steps = ["Choose domain", "Add evidence", "Confirm location", "Review", "Submit"];

const reviewSections = [
  {
    icon: ClipboardList,
    title: "Complaint summary",
    items: [
      "Selected domain: Water Supply, Sewerage, and Drainage",
      "Likely sub-problem: Sewage overflow",
      "Urgency hint: High public impact",
      "Citizen note: Overflow near market entrance and bus stop",
    ],
  },
  {
    icon: LocateFixed,
    title: "Location confirmation",
    items: [
      "Coordinates captured from device",
      "Address resolved from map pin",
      "Ward and routing zone ready",
      "Nearby landmark noted for field staff",
    ],
  },
  {
    icon: CheckCircle2,
    title: "Evidence attached",
    items: [
      "1 photo uploaded",
      "0 video clips",
      "Optional voice note available for later support",
      "Media summary ready for department review",
    ],
  },
];

const routingPreview = [
  "Primary department: Water and Sewerage",
  "Secondary support: Drainage unit if monsoon overflow is detected",
  "Initial priority: P2 High",
  "Notification path: citizen confirmation after submission",
];

const submitChecks = [
  "Location is correct",
  "Complaint is within city jurisdiction",
  "Media is safe and relevant",
  "Description is clear enough for field response",
];

export default function ReportReviewPage() {
  return (
    <AppShell>
      <section className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Report flow</p>
          <h1 className="text-4xl font-semibold tracking-tight text-civic-text">Review before final submission</h1>
          <p className="max-w-3xl text-sm leading-7 text-civic-muted">
            Check the issue details, location, and evidence once more before sending the complaint to the city team.
          </p>
        </div>

        <FlowSteps currentStep={4} steps={steps} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-6">
          {reviewSections.map(({ icon: Icon, title, items }) => (
            <section key={title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-civic-secondary/15 text-civic-secondary">
                  <Icon className="h-5 w-5" />
                </div>
              <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">Summary</p>
                  <h2 className="text-xl font-semibold text-civic-text">{title}</h2>
              </div>
              </div>

              <div className="mt-5 grid gap-3">
                {items.map((item) => (
                  <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-civic-text">
                    {item}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-civic-primary text-white">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">Routing preview</p>
                <h2 className="text-xl font-semibold text-civic-text">What the system will do next</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {routingPreview.map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-civic-text">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <h2 className="text-lg font-semibold text-amber-950">Final checks before submission</h2>
                <p className="mt-2 text-sm leading-6 text-amber-900/85">
                  A quick final check helps the city team act faster and reduces follow-up questions.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {submitChecks.map((item) => (
                <div key={item} className="rounded-2xl bg-white/75 px-4 py-3 text-sm font-medium text-amber-950">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Submit complaint</p>
          <h2 className="mt-2 text-2xl font-semibold text-civic-text">Ready to create the complaint record</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-civic-muted">
            Once submitted, your complaint will receive an ID and move into review, routing, and department assignment.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary"
            href="/report/location"
          >
            Back to location
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-civic-primary px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            href="/report/success"
          >
            Submit complaint
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
