"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, MessageSquare } from "lucide-react";
import { submitComplaintFeedback, type ComplaintFeedbackItem, verifyComplaintByCitizen } from "@/lib/api";

type CitizenFollowUpPanelProps = {
  complaintId: string;
  citizenId: string;
  status: string;
  feedback: ComplaintFeedbackItem[];
};

const feedbackAllowedStatuses = new Set(["resolved", "closed", "citizen_verified"]);

export function CitizenFollowUpPanel({
  complaintId,
  citizenId,
  status,
  feedback,
}: CitizenFollowUpPanelProps) {
  const router = useRouter();
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [mode, setMode] = useState<"feedback" | "reopen">("feedback");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmitFeedback = feedbackAllowedStatuses.has(status);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await submitComplaintFeedback({
        complaintId,
        citizenId,
        rating: mode === "feedback" ? Number(rating) : undefined,
        comment: comment.trim() || undefined,
        reopenRequested: mode === "reopen",
      });

      setComment("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setIsVerifying(true);

    try {
      await verifyComplaintByCitizen({
        complaintId,
        citizenId,
      });

      router.refresh();
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Failed to verify complaint");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">Citizen actions</p>
          <h2 className="text-xl font-semibold text-civic-text">Feedback and reopen</h2>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("feedback")}
          className={[
            "rounded-full px-4 py-2 text-sm font-semibold transition",
            mode === "feedback" ? "bg-civic-primary text-white" : "bg-slate-100 text-slate-700",
          ].join(" ")}
        >
          Share feedback
        </button>
        <button
          type="button"
          onClick={() => setMode("reopen")}
          className={[
            "rounded-full px-4 py-2 text-sm font-semibold transition",
            mode === "reopen" ? "bg-civic-danger text-white" : "bg-slate-100 text-slate-700",
          ].join(" ")}
        >
          Reopen complaint
        </button>
        {status === "resolved" ? (
          <button
            type="button"
            onClick={handleVerify}
            disabled={isVerifying}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isVerifying ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Verifying...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Mark as verified
              </span>
            )}
          </button>
        ) : null}
      </div>

      {mode === "feedback" && !canSubmitFeedback ? (
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-civic-muted">
          Feedback becomes available after the complaint is resolved or closed.
        </div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {mode === "feedback" ? (
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-civic-text">Rating</span>
              <select
                value={rating}
                onChange={(event) => setRating(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-civic-text outline-none transition focus:border-civic-primary"
              >
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Okay</option>
                <option value="2">2 - Poor</option>
                <option value="1">1 - Not resolved well</option>
              </select>
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-civic-text">
              {mode === "reopen" ? "Explain why the issue is still open" : "Comment"}
            </span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-civic-text outline-none transition focus:border-civic-primary"
              placeholder={
                mode === "reopen"
                  ? "Tell the team what is still unresolved."
                  : "Share what went well or what could be improved."
              }
            />
          </label>

          {error ? <p className="text-sm font-medium text-civic-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting || (mode === "feedback" && !canSubmitFeedback)}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            {mode === "reopen" ? "Submit and reopen" : "Submit feedback"}
          </button>
        </form>
      )}

      {feedback.length > 0 ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">Recent follow-up</p>
          {feedback.slice(0, 2).map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-civic-text">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold">
                  {item.reopenRequested ? "Reopen requested" : `Rating: ${item.rating ?? "-"}/5`}
                </span>
                <span className="text-xs text-civic-muted">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              {item.comment ? <p className="mt-2 text-civic-muted">{item.comment}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
