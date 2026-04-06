import { Bot, Route, ShieldAlert, Sparkles } from "lucide-react";
import type { ComplaintAiInsights } from "@/lib/api";

export function ComplaintAiPanel({ insights }: { insights: ComplaintAiInsights | null }) {
  return (
    <section className="rounded-[2rem] border border-civic-secondary/15 bg-gradient-to-br from-civic-secondary/5 via-white to-civic-primary/5 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-civic-secondary text-white">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">AI insight panel</p>
          <h2 className="text-xl font-semibold text-civic-text">Explainable operator assistance</h2>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {!insights ? (
          <div className="rounded-3xl bg-white px-4 py-4 text-sm text-civic-muted">
            AI insight is unavailable for this complaint right now.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-civic-muted">Suggested domain</p>
                <p className="mt-2 text-sm font-semibold text-civic-text">
                  {insights.suggestedDomain?.domainName ?? "No clear domain signal"}
                </p>
              </div>
              <div className="rounded-3xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-civic-muted">Suggested priority</p>
                <p className="mt-2 text-sm font-semibold text-civic-text">
                  {insights.suggestedPriority} · {insights.severityLevel}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-white p-4">
                <div className="flex items-center gap-2">
                  <Route className="h-4 w-4 text-civic-secondary" />
                  <p className="text-sm font-semibold text-civic-text">Routing suggestion</p>
                </div>
                <p className="mt-2 text-sm text-civic-muted">
                  {insights.routeDepartmentName ?? "No department suggestion available yet"}
                </p>
              </div>
              <div className="rounded-3xl bg-white p-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-civic-danger" />
                  <p className="text-sm font-semibold text-civic-text">Duplicate and urgency</p>
                </div>
                <p className="mt-2 text-sm text-civic-muted">
                  Duplicate risk {insights.duplicateRisk}. Emergency likelihood {insights.emergencyLikelihood}.
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-civic-muted">Evidence summary</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-civic-text">
                  Total evidence files: {insights.mediaSummary.totalEvidence}
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-civic-text">
                  Resolution proof: {insights.mediaSummary.hasResolutionProof ? "Available" : "Not uploaded"}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-civic-muted">Operator guidance</p>
              <div className="mt-3 space-y-2">
                {insights.reasonSummary.map((reason) => (
                  <div key={reason} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-6 text-civic-text">
                    {reason}
                  </div>
                ))}
              </div>
            </div>

            {insights.duplicateMatches.length > 0 ? (
              <div className="rounded-3xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-civic-muted">Nearby similar complaints</p>
                <div className="mt-3 space-y-2">
                  {insights.duplicateMatches.map((match) => (
                    <div key={match.complaintId} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-civic-muted">
                      <span className="font-semibold text-civic-text">{match.title}</span>
                      {` · ${match.distanceKm.toFixed(2)} km · similarity ${(match.similarityScore * 100).toFixed(0)}%`}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}

        <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700">
          <Sparkles className="h-3.5 w-3.5 text-civic-secondary" />
          AI suggestions never replace operator judgment.
        </div>
      </div>
    </section>
  );
}
