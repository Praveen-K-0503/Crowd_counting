import Link from "next/link";
import { FileAudio, ImageIcon, PlayCircle, ShieldCheck } from "lucide-react";
import type { ComplaintMediaItem } from "@/lib/api";

type ComplaintMediaGalleryProps = {
  items: ComplaintMediaItem[];
  title?: string;
  emptyLabel?: string;
};

function iconFor(mediaType: ComplaintMediaItem["mediaType"]) {
  if (mediaType === "video") return PlayCircle;
  if (mediaType === "audio") return FileAudio;
  return ImageIcon;
}

function labelFor(mediaType: ComplaintMediaItem["mediaType"]) {
  if (mediaType === "video") return "Video";
  if (mediaType === "audio") return "Audio";
  return "Photo";
}

export function ComplaintMediaGallery({
  items,
  title = "Evidence",
  emptyLabel = "No evidence uploaded yet.",
}: ComplaintMediaGalleryProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-civic-primary text-white">
          <ImageIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-civic-secondary">Evidence</p>
          <h2 className="text-xl font-semibold text-civic-text">{title}</h2>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-civic-muted">{emptyLabel}</div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const Icon = iconFor(item.mediaType);

            return (
              <article key={item.id} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-civic-primary" />
                    <span className="text-sm font-semibold text-civic-text">{labelFor(item.mediaType)}</span>
                  </div>
                  {item.isResolutionProof ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Proof
                    </span>
                  ) : null}
                </div>

                {item.mediaType === "image" ? (
                  <img
                    src={item.fileUrl ?? ""}
                    alt="Complaint evidence"
                    className="h-52 w-full object-cover"
                  />
                ) : item.mediaType === "video" ? (
                  <video controls className="h-52 w-full bg-slate-950 object-cover">
                    <source src={item.fileUrl ?? ""} type={item.mimeType ?? "video/mp4"} />
                  </video>
                ) : (
                  <div className="flex h-52 items-center justify-center bg-slate-100 p-6">
                    <audio controls className="w-full">
                      <source src={item.fileUrl ?? ""} type={item.mimeType ?? "audio/mpeg"} />
                    </audio>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="text-xs text-civic-muted">{new Date(item.createdAt).toLocaleString()}</p>
                  <Link
                    className="text-sm font-semibold text-civic-primary transition hover:text-civic-secondary"
                    href={item.fileUrl ?? "#"}
                    target="_blank"
                  >
                    Open file
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
