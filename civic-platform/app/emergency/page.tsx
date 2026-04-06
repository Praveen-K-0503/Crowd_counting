import Link from "next/link";
import { AlertTriangle, Flame, RadioTower, ShieldAlert, Siren, Waves, Zap } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const emergencyTypes = [
  {
    title: "Fire",
    summary: "Fire outbreak, smoke, electrical fire, or public flame hazard.",
    icon: Flame,
  },
  {
    title: "Flood",
    summary: "Flooding, dangerous water accumulation, or rapid overflow.",
    icon: Waves,
  },
  {
    title: "Electrical Hazard",
    summary: "Live wire, transformer blast, or severe public electrical risk.",
    icon: Zap,
  },
  {
    title: "Rescue / Disaster",
    summary: "Collapse, storm damage, trapped people, or multi-agency incident.",
    icon: RadioTower,
  },
];

const emergencyRules = [
  "Emergency reports should take fewer steps than standard complaints.",
  "Location must be captured first or confirmed manually.",
  "Priority should default to P1 unless the complaint is invalid.",
  "The system should route directly to the emergency queue.",
];

const minimalFields = [
  "Emergency type",
  "Photo or short video",
  "Current location or exact pin",
  "Short description of danger",
  "Optional contact number",
];

export default function EmergencyPage() {
  return (
    <AppShell>
      <section className="grid gap-6 rounded-[2rem] bg-civic-danger px-6 py-8 text-white shadow-civic lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90">
            <Siren className="h-4 w-4" />
            Emergency reporting flow
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">Use the fastest possible flow for urgent public danger.</h1>
          <p className="max-w-2xl text-sm leading-7 text-white/85">
            Report fire, flood, electrical danger, or rescue situations with the fewest possible steps so the response team can act quickly.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-5 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/75">Default response behavior</p>
          <div className="mt-4 space-y-3">
            {[
              "Priority set to P1 Critical",
              "Emergency queue routing",
              "Immediate operator visibility",
              "Stronger notification path",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Emergency type</p>
              <h2 className="mt-2 text-2xl font-semibold text-civic-text">Choose the urgent incident category</h2>
            </div>
            <div className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
              High priority flow
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {emergencyTypes.map(({ title, summary, icon: Icon }) => (
              <button
                key={title}
                type="button"
                className="group rounded-3xl border border-red-100 bg-red-50/50 p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-civic-danger hover:bg-white hover:shadow-civic"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-civic-danger">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-civic-danger">Select</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-civic-text">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-civic-muted">{summary}</p>
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-civic-danger/10 text-civic-danger">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">Form scope</p>
                <h2 className="text-xl font-semibold text-civic-text">Minimal fields for emergency submission</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {minimalFields.map((field) => (
                <div key={field} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-civic-text">
                  {field}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <h2 className="text-lg font-semibold text-amber-950">Emergency reporting principles</h2>
                <p className="mt-2 text-sm leading-6 text-amber-900/85">
                  This flow stays shorter than normal reporting and focuses only on what responders need first.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {emergencyRules.map((rule) => (
                <div key={rule} className="rounded-2xl bg-white/75 px-4 py-3 text-sm leading-6 text-amber-950">
                  {rule}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Switch reporting modes</p>
          <h2 className="mt-2 text-2xl font-semibold text-civic-text">Return to the normal report flow or operations dashboard.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-civic-muted">
            Use the standard reporting flow for non-emergency complaints, or return to the dashboard to monitor active work.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary"
            href="/report"
          >
            Back to normal report flow
          </Link>
          <Link
            className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            href="/dashboard"
          >
            Return to dashboard
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
