"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ChevronRight,
  Crosshair,
  ImagePlus,
  LoaderCircle,
  LocateFixed,
  MapPinned,
  Mic,
  ShieldAlert,
  Video,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SectionHeader } from "@/components/section-header";
import { VoiceTranscribeButton } from "@/components/voice-transcribe-button";
import { mainDomains } from "@/data/domains";
import { createComplaint, getDomains, getNearbyComplaints, type DomainOption, type NearbyComplaintItem, uploadComplaintMedia } from "@/lib/api";
import { inferWard } from "@/lib/geo";
import { classifyImageEvidence, extractGpsFromImage, type CivicImageSignal } from "@/lib/image-metadata";

// LocationPickerMap removed as per requirements.

type FormState = {
  domainIndex: number;
  title: string;
  description: string;
  addressLine: string;
  landmark: string;
  latitude: string;
  longitude: string;
};

type MediaState = {
  photo: File | null;
  video: File | null;
  audio: File | null;
};

type MediaKey = keyof MediaState;
type UploadStatus = "idle" | "queued" | "uploading" | "uploaded" | "failed";
type UploadState = {
  status: UploadStatus;
  progress: number;
  error?: string;
};

const initialState: FormState = {
  domainIndex: 0,
  title: "",
  description: "",
  addressLine: "",
  landmark: "",
  latitude: "13.0827",
  longitude: "80.2707",
};

const evidenceActions = [
  {
    key: "photo" as MediaKey,
    icon: ImagePlus,
    title: "Photo",
    copy: "JPG, PNG, WebP",
    accept: "image/*",
    mediaType: "image" as const,
  },
  {
    key: "video" as MediaKey,
    icon: Video,
    title: "Video",
    copy: "Short clip up to 25 MB",
    accept: "video/*",
    mediaType: "video" as const,
  },
  {
    key: "audio" as MediaKey,
    icon: Mic,
    title: "Voice",
    copy: "Audio note in any language",
    accept: "audio/*",
    mediaType: "audio" as const,
  },
];

function fieldClasses() {
  return "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-civic-text outline-none transition focus:border-civic-primary focus:ring-4 focus:ring-civic-primary/10";
}

function helperClasses() {
  return "text-xs leading-5 text-civic-muted";
}

function parseCoordinate(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function EvidencePreview({
  file,
  type,
  label,
}: {
  file: File;
  type: "image" | "video" | "audio";
  label: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!previewUrl) {
    return null;
  }

  if (type === "image") {
    return <img src={previewUrl} alt={`${label} preview`} className="h-40 w-full rounded-2xl object-cover" />;
  }

  if (type === "video") {
    return <video src={previewUrl} className="h-40 w-full rounded-2xl object-cover" controls />;
  }

  return <audio src={previewUrl} className="w-full" controls />;
}

export function ReportForm({ citizenId }: { citizenId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, startLocationTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [domainMap, setDomainMap] = useState<DomainOption[]>([]);
  const [nearbyComplaints, setNearbyComplaints] = useState<NearbyComplaintItem[]>([]);
  const [locationSource, setLocationSource] = useState<"default" | "gps" | "map" | "address" | "photo">("default");
  const [photoLocationMessage, setPhotoLocationMessage] = useState<string | null>(null);
  const [visualSignals, setVisualSignals] = useState<CivicImageSignal[]>([]);
  const [createdComplaint, setCreatedComplaint] = useState<{ id: string; code: string } | null>(null);
  const [media, setMedia] = useState<MediaState>({
    photo: null,
    video: null,
    audio: null,
  });
  const [mediaUploads, setMediaUploads] = useState<Record<MediaKey, UploadState>>({
    photo: { status: "idle", progress: 0 },
    video: { status: "idle", progress: 0 },
    audio: { status: "idle", progress: 0 },
  });

  const selectedDomain = useMemo(() => mainDomains[form.domainIndex], [form.domainIndex]);
  const latitude = useMemo(() => parseCoordinate(form.latitude, 17.385), [form.latitude]);
  const longitude = useMemo(() => parseCoordinate(form.longitude, 78.4867), [form.longitude]);
  const wardInsight = useMemo(() => inferWard(latitude, longitude), [latitude, longitude]);
  const locationLabel = useMemo(() => {
    if (form.addressLine.trim()) {
      return form.landmark.trim() ? `${form.addressLine}, near ${form.landmark}` : form.addressLine;
    }

    if (locationSource === "photo") return "Location extracted from photo metadata";
    if (locationSource === "gps") return "Current location selected";
    if (locationSource === "map") return "Pinned on map";
    if (locationSource === "address") return "Address searched on map";
    return "Choose a location using address search, GPS, or map pin";
  }, [form.addressLine, form.landmark, locationSource]);

  useEffect(() => {
    void getDomains()
      .then((domains) => setDomainMap(domains))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const domainId = domainMap.find((domain) => domain.name === selectedDomain.title)?.id;
    const timer = window.setTimeout(() => {
      void getNearbyComplaints({
        latitude,
        longitude,
        radiusKm: 0.75,
        domainId,
      })
        .then((results) => setNearbyComplaints(results))
        .catch(() => setNearbyComplaints([]));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [domainMap, latitude, longitude, selectedDomain.title]);

  async function fillAddressFromCoordinates(latitudeValue: number, longitudeValue: number) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitudeValue}&lon=${longitudeValue}`,
        {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        display_name?: string;
        address?: {
          road?: string;
          suburb?: string;
          neighbourhood?: string;
          city?: string;
          town?: string;
          village?: string;
        };
      };

      setForm((current) => ({
        ...current,
        addressLine:
          current.addressLine.trim() ||
          data.address?.road ||
          data.address?.suburb ||
          data.address?.neighbourhood ||
          data.display_name ||
          current.addressLine,
        landmark:
          current.landmark.trim() ||
          data.address?.suburb ||
          data.address?.neighbourhood ||
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          current.landmark,
      }));
    } catch {
      return;
    }
  }

  function handleCoordinateSelect(latitudeValue: number, longitudeValue: number) {
    setLocationError(null);
    setLocationSource("map");
    setForm((current) => ({
      ...current,
      latitude: latitudeValue.toFixed(6),
      longitude: longitudeValue.toFixed(6),
    }));
    void fillAddressFromCoordinates(latitudeValue, longitudeValue);
  }

  async function handleSearchAddress() {
    const query = [form.addressLine, form.landmark].filter((value) => value.trim()).join(", ");

    if (!query.trim()) {
      setLocationError("Type an address or landmark before searching.");
      return;
    }

    setIsGeocoding(true);
    setLocationError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error("Address search failed");
      }

      const results = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name?: string;
      }>;
      const match = results[0];

      if (!match) {
        setLocationError("We could not find that address. Try adding a nearby landmark or place the pin manually.");
        return;
      }

      const latitudeValue = Number(match.lat);
      const longitudeValue = Number(match.lon);
      setLocationSource("address");
      setForm((current) => ({
        ...current,
        latitude: latitudeValue.toFixed(6),
        longitude: longitudeValue.toFixed(6),
        addressLine: current.addressLine.trim() || match.display_name || current.addressLine,
      }));
      void fillAddressFromCoordinates(latitudeValue, longitudeValue);
    } catch (searchError) {
      setLocationError(searchError instanceof Error ? searchError.message : "Address search failed");
    } finally {
      setIsGeocoding(false);
    }
  }

  function handleUseCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Location services are not available in this browser.");
      return;
    }

    setLocationError(null);

    startLocationTransition(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitudeValue = position.coords.latitude;
          const longitudeValue = position.coords.longitude;
          setLocationSource("gps");
          handleCoordinateSelect(latitudeValue, longitudeValue);
        },
        () => {
          setLocationError("We could not access your location. You can still place the pin manually.");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
        },
      );
    });
  }

  async function handleMediaSelected(action: (typeof evidenceActions)[number], file: File | null) {
    if (file && file.size > 25 * 1024 * 1024) {
      setError(`${action.title} must be 25 MB or smaller.`);
      return;
    }

    setError(null);
    setMedia((current) => ({
      ...current,
      [action.key]: file,
    }) as MediaState);
    setMediaUploads((current) => ({
      ...current,
      [action.key]: {
        status: file ? "queued" : "idle",
        progress: 0,
      },
    }));

    if (action.mediaType !== "image" || !file) {
      if (action.mediaType === "image") {
        setPhotoLocationMessage(null);
        setVisualSignals([]);
      }
      return;
    }

    const signal = classifyImageEvidence(file);
    setVisualSignals(signal ? [signal] : []);

    const gps = await extractGpsFromImage(file);

    if (!gps) {
      setPhotoLocationMessage("No GPS metadata found in this photo. You can still use GPS, address search, or the map pin.");
      return;
    }

    setPhotoLocationMessage("Photo GPS metadata found. Location and address were updated from the image.");
    setLocationSource("photo");
    setForm((current) => ({
      ...current,
      latitude: gps.latitude.toFixed(6),
      longitude: gps.longitude.toFixed(6),
    }));
    void fillAddressFromCoordinates(gps.latitude, gps.longitude);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await createComplaint({
        citizenId,
        title: form.title.trim() || `${selectedDomain.title} issue reported by citizen`,
        description: form.description.trim() || undefined,
        domainId: domainMap.find((domain) => domain.name === selectedDomain.title)?.id,
        wardId: wardInsight?.id,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        addressLine: form.addressLine.trim() || undefined,
        landmark: form.landmark.trim() || undefined,
      });

      const complaintId = response.id;
      const complaintCode = response.complaintCode ?? response.complaint_code ?? complaintId;
      setCreatedComplaint({ id: complaintId, code: complaintCode });
      const uploads: Array<{ key: MediaKey; file: File; mediaType: "image" | "video" | "audio" }> = [];

      if (media.photo) {
        uploads.push({ key: "photo", file: media.photo, mediaType: "image" });
      }

      if (media.video) {
        uploads.push({ key: "video", file: media.video, mediaType: "video" });
      }

      if (media.audio) {
        uploads.push({ key: "audio", file: media.audio, mediaType: "audio" });
      }

      if (uploads.length > 0) {
        const results = await Promise.allSettled(
          uploads.map((entry) =>
            createMediaUpload({
              mediaKey: entry.key,
              complaintId,
              file: entry.file,
              mediaType: entry.mediaType,
            }),
          ),
        );

        if (results.some((result) => result.status === "rejected")) {
          setError("Complaint submitted, but one or more uploads failed. Retry the failed evidence below before you leave.");
          setIsSubmitting(false);
          return;
        }
      }

      router.push(`/report/success?id=${encodeURIComponent(complaintId)}&code=${encodeURIComponent(complaintCode)}&media=complete`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit complaint");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createMediaUpload(input: {
    mediaKey: MediaKey;
    complaintId: string;
    file: File;
    mediaType: "image" | "video" | "audio";
  }) {
    try {
      const result = await uploadComplaintMedia({
        complaintId: input.complaintId,
        file: input.file,
        mediaType: input.mediaType,
        uploadedBy: citizenId,
        onProgress: (progress) => {
          setMediaUploads((current) => ({
            ...current,
            [input.mediaKey]: {
              status: "uploading",
              progress,
            },
          }));
        },
      });

      setMediaUploads((current) => ({
        ...current,
        [input.mediaKey]: {
          status: "uploaded",
          progress: 100,
        },
      }));

      return result;
    } catch (uploadError) {
      setMediaUploads((current) => ({
        ...current,
        [input.mediaKey]: {
          status: "failed",
          progress: current[input.mediaKey]?.progress ?? 0,
          error: uploadError instanceof Error ? uploadError.message : "Upload failed",
        },
      }));

      throw uploadError;
    }
  }

  async function retryFailedUploads() {
    if (!createdComplaint) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const uploads = (Object.entries(media) as Array<[MediaKey, File | null]>)
      .filter(([key, file]) => file && mediaUploads[key].status === "failed")
      .map(([key, file]) => ({
        key,
        file: file as File,
        mediaType:
          key === "photo"
            ? ("image" as const)
            : key === "video"
              ? ("video" as const)
              : ("audio" as const),
      }));

    const results = await Promise.allSettled(
      uploads.map((entry) =>
        createMediaUpload({
          mediaKey: entry.key,
          complaintId: createdComplaint.id,
          file: entry.file,
          mediaType: entry.mediaType,
        }),
      ),
    );

    if (results.every((result) => result.status === "fulfilled")) {
      router.push(
        `/report/success?id=${encodeURIComponent(createdComplaint.id)}&code=${encodeURIComponent(createdComplaint.code)}&media=complete`,
      );
      return;
    }

    setError("Some uploads still need attention. You can retry again or submit additional evidence later.");
    setIsSubmitting(false);
  }

  return (
    <form className="mx-auto max-w-2xl pb-24" onSubmit={handleSubmit}>
      <div className="space-y-8">
        {step === 1 && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-xl sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-civic-secondary">Report issue</p>
                <h2 className="text-2xl font-semibold text-civic-text">What needs attention?</h2>
                <p className="max-w-2xl text-sm leading-6 text-civic-muted">
                  Pick the issue type that best matches the situation. This helps route the complaint to the right team faster.
                </p>
              </div>
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                href="/emergency"
              >
                Emergency
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {mainDomains.map((domain, index) => {
                const isActive = index === form.domainIndex;

                return (
                  <button
                    key={domain.title}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, domainIndex: index }))}
                    className={[
                      "rounded-3xl border p-5 text-left transition duration-200 hover:-translate-y-0.5",
                      isActive
                        ? "border-civic-primary bg-civic-primary text-white shadow-civic"
                        : "border-slate-200 bg-slate-50 hover:border-civic-secondary hover:bg-white hover:shadow-sm",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-base font-semibold">{domain.title}</h3>
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                          isActive ? "bg-white/15 text-white" : "bg-white text-civic-secondary",
                        ].join(" ")}
                      >
                        {isActive ? "Active" : "Choose"}
                      </span>
                    </div>
                    <p className={["mt-3 text-sm leading-6", isActive ? "text-white/85" : "text-civic-muted"].join(" ")}>
                      {domain.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Continue to Details
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
        )}

        {step === 2 && (
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <section 
            className="rounded-[2.5rem] border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-xl sm:p-8">
            <SectionHeader eyebrow="Details" icon={MapPinned} title="Issue summary & Location" />

            <div className="mt-6 space-y-4">
              <div className="rounded-[1.75rem] bg-slate-50 p-4 sm:p-5">

                <div className="mt-4 space-y-4">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-civic-text">Title</span>
                    <input
                      className={fieldClasses()}
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="e.g., Sewage overflow near Anna Arch"
                    />
                    <p className={helperClasses()}>Example: "Streetlight not working near school gate"</p>
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-civic-text">Description</span>
                    <textarea
                      className={`${fieldClasses()} min-h-28 resize-none`}
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Add a short description so the team can understand the issue quickly."
                    />
                    <p className={helperClasses()}>Mention what is affected, how long it has been happening, or why it is risky.</p>
                    <VoiceTranscribeButton
                      onTranscript={(text) =>
                        setForm((current) => ({
                          ...current,
                          description: current.description ? `${current.description} ${text}`.trim() : text,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-slate-50 p-4 sm:p-5">
                <p className="text-sm font-semibold text-civic-text">Location details</p>
                <p className="mt-1 text-sm leading-6 text-civic-muted">
                  Add the address if you know it. You can search it, use current location, upload a GPS-tagged photo, or drop the pin on the map.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-civic-text">Address</span>
                    <input
                      className={fieldClasses()}
                      value={form.addressLine}
                      onChange={(event) => setForm((current) => ({ ...current, addressLine: event.target.value }))}
                      placeholder="2nd Main Road, Anna Nagar"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-civic-text">Landmark</span>
                    <input
                      className={fieldClasses()}
                      value={form.landmark}
                      onChange={(event) => setForm((current) => ({ ...current, landmark: event.target.value }))}
                      placeholder="Near Tower Park"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSearchAddress}
                    disabled={isGeocoding}
                    className="inline-flex items-center gap-2 rounded-full bg-civic-primary px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isGeocoding ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MapPinned className="h-4 w-4" />}
                    {isGeocoding ? "Searching..." : "Search Address"}
                  </button>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-civic-primary transition hover:-translate-y-0.5"
                  >
                    {isLocating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                    {isLocating ? "Locating..." : "Use current location"}
                  </button>
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-slate-50 p-4 sm:p-5 mt-4">
                <p className="text-sm font-semibold text-civic-text">Selected location</p>
                <p className="mt-1 text-sm font-medium text-civic-muted">{locationLabel}</p>
                {locationError ? <p className="mt-3 text-sm font-medium text-civic-danger">{locationError}</p> : null}
                {photoLocationMessage ? <p className="mt-3 text-sm font-medium text-civic-primary">{photoLocationMessage}</p> : null}
              </div>
            </div>
          </section>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Continue to Evidence
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
        )}

        {step === 3 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8"
        >
          <section 
            className="rounded-[2.5rem] border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-xl sm:p-8">
            <SectionHeader eyebrow="Evidence" icon={ImagePlus} title="Add supporting proof" />

            <div className="mt-5 grid gap-3">
              {evidenceActions.map((action) => {
                const Icon = action.icon;
                const selectedFile = media[action.key];
                const uploadState = mediaUploads[action.key];

                return (
                  <div
                    key={action.title}
                    className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-civic-secondary hover:bg-white"
                  >
                    <label className="flex cursor-pointer items-center justify-between gap-3 text-left">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-civic-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-civic-text">{action.title}</p>
                          <p className="text-sm text-civic-muted">{action.copy}</p>
                          {selectedFile ? (
                            <p className="mt-1 text-xs font-medium text-civic-primary">{selectedFile.name}</p>
                          ) : null}
                        </div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {selectedFile ? "Selected" : "Choose"}
                      </span>
                      <input
                        type="file"
                        accept={action.accept}
                        className="sr-only"
                        onChange={(event) => {
                          void handleMediaSelected(action, event.target.files?.[0] ?? null);
                        }}
                      />
                    </label>

                    {selectedFile ? (
                      <div className="mt-4 space-y-3 rounded-[1.5rem] bg-white p-4">
                        <EvidencePreview file={selectedFile} label={action.title} type={action.mediaType} />

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-civic-muted">
                            <span>{uploadState.status}</span>
                            <span>{uploadState.progress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={[
                                "h-full rounded-full transition-all",
                                uploadState.status === "failed"
                                  ? "bg-civic-danger"
                                  : uploadState.status === "uploaded"
                                    ? "bg-civic-success"
                                    : "bg-civic-primary",
                              ].join(" ")}
                              style={{ width: `${uploadState.progress}%` }}
                            />
                          </div>
                          {uploadState.error ? <p className="text-xs font-medium text-civic-danger">{uploadState.error}</p> : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {!media.photo && !media.video && !media.audio ? (
              <div className="mt-5">
                <EmptyState
                  description="A clear photo or short video helps the city team understand the issue faster."
                  icon={ImagePlus}
                  title="No evidence added yet"
                />
              </div>
            ) : null}
          </section>

          <section 
            className="rounded-[2.5rem] border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-xl sm:p-8">

            {error ? (
              <div className="mb-5 flex items-start gap-3 rounded-3xl border border-civic-danger/20 bg-civic-danger/5 px-4 py-3 text-sm font-medium text-civic-danger">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-civic-primary px-8 py-5 text-lg font-bold text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ShieldAlert className="h-5 w-5" />}
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </section>
        </motion.div>
        )}
      </div>
    </form>
  );
}
