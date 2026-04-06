"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { analyzeComplaintDraft, type AiDraftAnalysis } from "@/lib/api";

export function ReportAiAssistant({
  title,
  description,
  addressLine,
  landmark,
  latitude,
  longitude,
  domainId,
  mediaTypes,
  visualSignals,
}: {
  title: string;
  description: string;
  addressLine: string;
  landmark: string;
  latitude: number;
  longitude: number;
  domainId?: string;
  mediaTypes: Array<"image" | "video" | "audio">;
  visualSignals?: Array<{
    label: string;
    confidence: number;
    matchedSignals: string[];
  }>;
}) {
  const [analysis, setAnalysis] = useState<AiDraftAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const shouldAnalyze = useMemo(
    () => title.trim().length > 2 || description.trim().length > 8 || mediaTypes.length > 0,
    [description, mediaTypes.length, title],
  );

  useEffect(() => {
    if (!shouldAnalyze) {
      setAnalysis(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setIsLoading(true);
      void analyzeComplaintDraft({
        title,
        description,
        addressLine,
        landmark,
        latitude,
        longitude,
        domainId,
        mediaTypes,
        visualSignals,
      })
        .then((result) => setAnalysis(result))
        .catch(() => setAnalysis(null))
        .finally(() => setIsLoading(false));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [addressLine, description, domainId, landmark, latitude, longitude, mediaTypes, shouldAnalyze, title, visualSignals]);

  return (
    <section className="rounded-[2rem] border border-civic-secondary/15 bg-gradient-to-br from-civic-secondary/5 via-white to-civic-primary/5 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-civic-secondary text-white">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">AI assistant</p>
          <h2 className="text-xl font-semibold text-civic-text">Smart review before you submit</h2>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <div className="rounded-3xl bg-white px-4 py-4 text-sm text-civic-muted">Analyzing your complaint draft...</div>
        ) : analysis ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-civic-muted">Suggested domain</p>
                <p className="mt-2 text-sm font-semibold text-civic-text">
                  {analysis.suggestedDomain?.domainName ?? "No strong signal yet"}
                </p>
                {analysis.suggestedDomain ? (
                  <p className="mt-1 text-xs text-civic-muted">
                    Confidence {(analysis.suggestedDomain.confidence * 100).toFixed(0)}%
                  </p>
                ) : null}
              </div>
              <div className="rounded-3xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-civic-muted">Suggested priority</p>
                <p className="mt-2 text-sm font-semibold text-civic-text">
                  {analysis.suggestedPriority} · {analysis.severityLevel}
                </p>
                <p className="mt-1 text-xs text-civic-muted">
                  Emergency likelihood {analysis.emergencyLikelihood}
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-civic-muted">Duplicate risk</p>
              <p className="mt-2 text-sm font-semibold text-civic-text">
                {analysis.duplicateRisk === "high"
                  ? "High duplicate risk nearby"
                  : analysis.duplicateRisk === "medium"
                    ? "Possible nearby duplicate"
                    : "No strong duplicate signal"}
              </p>
              {analysis.duplicateMatches.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {analysis.duplicateMatches.slice(0, 2).map((match) => (
                    <div key={match.complaintId} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-civic-muted">
                      <span className="font-semibold text-civic-text">{match.title}</span>
                      {` · ${match.distanceKm.toFixed(2)} km · similarity ${(match.similarityScore * 100).toFixed(0)}%`}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-civic-muted">Why this was suggested</p>
              <div className="mt-3 space-y-2">
                {analysis.reasonSummary.map((reason) => (
                  <div key={reason} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-6 text-civic-text">
                    {reason}
                  </div>
                ))}
              </div>
            </div>
            {visualSignals?.length ? (
              <div className="rounded-3xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-civic-muted">Image signal</p>
                <p className="mt-2 text-sm font-semibold text-civic-text">
                  {visualSignals[0].label} Â· {(visualSignals[0].confidence * 100).toFixed(0)}% confidence
                </p>
                <p className="mt-1 text-xs text-civic-muted">
                  Current local signal is filename/metadata based. A trained civic vision model can replace this once labeled data is ready.
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-3xl bg-white px-4 py-4 text-sm text-civic-muted">
            Start typing a title or description and the assistant will suggest a domain, urgency, and nearby duplicate risk.
          </div>
        )}

        <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700">
          <Sparkles className="h-3.5 w-3.5 text-civic-secondary" />
          Suggestions are assistive. You stay in control of what gets submitted.
        </div>
      </div>
    </section>
  );
}
