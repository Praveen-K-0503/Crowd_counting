const stages = [
  "Submitted",
  "Validated",
  "Classified",
  "Prioritized",
  "Assigned",
  "In Progress",
  "Resolved",
  "Citizen Verified",
  "Closed",
];

export function Lifecycle() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-civic-text">Complaint lifecycle</h2>
        <p className="max-w-3xl text-sm leading-6 text-civic-muted">
          The platform should make every complaint traceable, with clear states for both citizens and departments.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {stages.map((stage, index) => (
          <div key={stage} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-civic-secondary">
              Step {index + 1}
            </p>
            <p className="mt-2 text-base font-semibold text-civic-text">{stage}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
