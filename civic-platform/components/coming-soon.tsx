import Link from "next/link";

type ComingSoonProps = {
  eyebrow: string;
  title: string;
  description: string;
  nextStep: string;
};

export function ComingSoon({ eyebrow, title, description, nextStep }: ComingSoonProps) {
  return (
    <section className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">{eyebrow}</p>
        <h1 className="text-4xl font-semibold tracking-tight text-civic-text">{title}</h1>
        <p className="max-w-2xl text-sm leading-7 text-civic-muted">{description}</p>
        <Link
          className="inline-flex rounded-full bg-civic-primary px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
          href="/report"
        >
          Go to report flow
        </Link>
      </div>

      <div className="rounded-[1.75rem] bg-slate-50 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Next build focus</p>
        <p className="mt-3 text-lg font-semibold text-civic-text">{nextStep}</p>
      </div>
    </section>
  );
}
