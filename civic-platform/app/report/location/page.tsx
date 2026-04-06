import Link from "next/link";
import { Crosshair, MapPinned, Navigation, ShieldAlert, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FlowSteps } from "@/components/flow-steps";

const steps = ["Choose domain", "Add evidence", "Confirm location", "Review", "Submit"];

const locationChecks = [
  "Use current GPS for the quickest routing path.",
  "If GPS is weak, move the map pin to the exact road, lane, or landmark.",
  "Mention a nearby landmark so field staff can find the problem faster.",
  "Emergency incidents should be pinned as precisely as possible.",
];

const locationFields = [
  "Latitude and longitude",
  "Resolved address",
  "Ward or zone",
  "Nearby landmark",
  "Road or locality name",
  "Manual pin adjustment status",
];

export default function ReportLocationPage() {
  return (
    <AppShell>
      <section className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Report flow</p>
          <h1 className="text-4xl font-semibold tracking-tight text-civic-text">Confirm the issue location</h1>
          <p className="max-w-3xl text-sm leading-7 text-civic-muted">
            This step helps the system assign the correct ward, identify the responsible department, and improve
            routing accuracy for field teams.
          </p>
        </div>

        <FlowSteps currentStep={3} steps={steps} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Step 3</p>
              <h2 className="text-2xl font-semibold text-civic-text">Map and address confirmation</h2>
              <p className="max-w-2xl text-sm leading-6 text-civic-muted">
                In the MVP, this screen should open the user location, show a map preview, and let the citizen correct
                the pin before moving to review.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              Routing-ready
            </div>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-civic-primary text-white">
                <MapPinned className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">Interactive map</p>
                <h3 className="text-lg font-semibold text-civic-text">Pinned complaint location</h3>
              </div>
            </div>

            <div className="mt-5 flex min-h-[22rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-[linear-gradient(135deg,rgba(15,76,129,0.05),rgba(20,184,166,0.08))] p-6 text-center">
              <div className="max-w-md space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                  <Navigation className="h-6 w-6 text-civic-primary" />
                </div>
                <h4 className="text-xl font-semibold text-civic-text">Map preview placeholder</h4>
                <p className="text-sm leading-6 text-civic-muted">
                  This area will use Leaflet with OpenStreetMap tiles, current location detection, drag-to-adjust pin,
                  and reverse geocoding for address confirmation.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-civic-primary px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                <Crosshair className="h-4 w-4" />
                Use current location
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary"
              >
                <MapPinned className="h-4 w-4" />
                Adjust map pin
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-civic-secondary/15 text-civic-secondary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">Stored data</p>
                <h2 className="text-xl font-semibold text-civic-text">Location fields for the complaint</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {locationFields.map((field) => (
                <div key={field} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-civic-text">
                  {field}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <h2 className="text-lg font-semibold text-amber-950">Accuracy matters for emergency routing</h2>
                <p className="mt-2 text-sm leading-6 text-amber-900/85">
                  A precise location helps responders find the incident faster, especially in flood, fire, collapse,
                  or live wire complaints.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {locationChecks.map((item) => (
                <div key={item} className="rounded-2xl bg-white/70 px-4 py-3 text-sm leading-6 text-amber-950">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Next step</p>
          <h2 className="mt-2 text-2xl font-semibold text-civic-text">Review complaint details before submission</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-civic-muted">
            After location is confirmed, the user should see a review screen with domain, evidence, location, and the
            initial routing preview.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary"
            href="/report"
          >
            Back to report
          </Link>
          <Link
            className="inline-flex rounded-full bg-civic-primary px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            href="/report/review"
          >
            Continue to review
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
