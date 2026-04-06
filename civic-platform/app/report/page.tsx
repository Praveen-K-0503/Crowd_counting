import { AppShell } from "@/components/app-shell";
import { ReportForm } from "@/components/report-form";
import { requireRole } from "@/lib/auth";

export default async function ReportIssuePage() {
  const user = await requireRole(["citizen"]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8 pt-8">
        <div className="text-center space-y-4">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-civic-secondary">
            Citizen Reporting
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            File a Report
          </h1>
          <p className="mx-auto max-w-xl text-lg text-slate-500">
            Tell us what happened and where. We will get it to the right department.
          </p>
        </div>

        <ReportForm citizenId={user.id} />
      </div>
    </AppShell>
  );
}
