"use client";

import { ChangeEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, UploadCloud } from "lucide-react";
import { uploadComplaintMedia } from "@/lib/api";

function inferMediaType(file: File): "image" | "video" | "audio" {
  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return "image";
}

export function ResolutionProofUploader({
  complaintId,
  uploadedBy,
  label = "Upload resolution proof",
}: {
  complaintId: string;
  uploadedBy: string;
  label?: string;
}) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (file && file.size > 25 * 1024 * 1024) {
      setError("Resolution proof files must be 25 MB or smaller.");
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSuccess(null);
    setProgress(0);
    setSelectedFile(file);
  }

  function handleUpload() {
    if (!selectedFile) {
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await uploadComplaintMedia({
          complaintId,
          file: selectedFile,
          mediaType: inferMediaType(selectedFile),
          uploadedBy,
          isResolutionProof: true,
          onProgress: setProgress,
        });

        setSuccess("Resolution proof uploaded.");
        setSelectedFile(null);
        setProgress(100);
        router.refresh();
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Failed to upload proof");
      }
    });
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Resolution proof</p>
        <h2 className="text-xl font-semibold text-civic-text">{label}</h2>
        <p className="text-sm leading-6 text-civic-muted">
          Add a final image, video, or audio note that confirms the work completed on the ground.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-civic-primary hover:text-civic-primary">
          <UploadCloud className="h-4 w-4" />
          Choose file
          <input type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleSelection} />
        </label>
        <button
          type="button"
          disabled={isPending || !selectedFile}
          onClick={handleUpload}
          className="inline-flex items-center gap-2 rounded-full bg-civic-primary px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {isPending ? "Uploading..." : "Upload proof"}
        </button>
        {selectedFile ? <span className="text-sm text-civic-muted">{selectedFile.name}</span> : null}
      </div>

      {(progress > 0 || success || error) && (
        <div className="mt-4 space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-civic-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          {success ? <p className="text-sm font-medium text-civic-success">{success}</p> : null}
          {error ? <p className="text-sm font-medium text-civic-danger">{error}</p> : null}
        </div>
      )}
    </section>
  );
}
