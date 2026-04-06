"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareText, Plus } from "lucide-react";
import { createComplaintNote, type ComplaintNoteItem } from "@/lib/api";

type AdminNotesPanelProps = {
  complaintId: string;
  operatorId: string;
  initialNotes: ComplaintNoteItem[];
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatNoteType(noteType: ComplaintNoteItem["noteType"]) {
  switch (noteType) {
    case "field_note":
      return "Field note";
    case "citizen_note":
      return "Citizen note";
    case "system_note":
      return "System note";
    default:
      return "Operator note";
  }
}

export function AdminNotesPanel({ complaintId, operatorId, initialNotes }: AdminNotesPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [noteText, setNoteText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!noteText.trim()) {
      setError("Enter a short internal note before saving.");
      return;
    }

    setError(null);

    try {
      await createComplaintNote({
        complaintId,
        authorId: operatorId,
        noteType: "operator_note",
        noteText: noteText.trim(),
        isInternal: true,
      });

      setNoteText("");
      startTransition(() => {
        router.refresh();
      });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to save note right now.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {initialNotes.length > 0 ? (
          initialNotes.map((note) => (
            <article key={note.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-civic-secondary">
                <span>{formatNoteType(note.noteType)}</span>
                <span className="text-slate-300">/</span>
                <span>{note.authorName ?? "Unknown author"}</span>
                <span className="text-slate-300">/</span>
                <span className="text-slate-500 normal-case tracking-normal">{formatDateTime(note.createdAt)}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-civic-text">{note.noteText}</p>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-civic-muted">
            No internal notes yet. Use this space for routing context, field instructions, or risk observations.
          </div>
        )}
      </div>

      <form className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5" onSubmit={handleSubmit}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <MessageSquareText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-civic-text">Add internal note</h3>
            <p className="text-sm text-civic-muted">Visible only to operators, field staff, and admins.</p>
          </div>
        </div>

        <textarea
          className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-civic-text outline-none transition focus:border-civic-primary focus:bg-white"
          name="noteText"
          onChange={(event) => setNoteText(event.target.value)}
          placeholder="Add routing context, on-ground risks, or coordination notes."
          value={noteText}
        />

        {error ? <p className="text-sm font-medium text-civic-danger">{error}</p> : null}

        <button
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Save note
        </button>
      </form>
    </div>
  );
}
