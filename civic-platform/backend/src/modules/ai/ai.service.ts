import { getComplaintById, listComplaintMedia, listNearbyComplaints } from "../complaints/complaint.repository.js";
import { analyzeComplaintForOperators, analyzeDraft } from "./ai.engine.js";
import type { DraftAnalysisInput } from "./ai.types.js";

export async function analyzeDraftService(input: DraftAnalysisInput) {
  const nearby =
    typeof input.latitude === "number" && typeof input.longitude === "number"
      ? await listNearbyComplaints({
          latitude: input.latitude,
          longitude: input.longitude,
          radiusKm: 0.75,
          domainId: input.domainId,
          publicOnly: true,
        })
      : [];

  return analyzeDraft(input, nearby);
}

export async function getComplaintAiInsightsService(complaintId: string) {
  if (!complaintId) {
    throw new Error("complaintId is required");
  }

  const complaint = await getComplaintById(complaintId);

  if (!complaint) {
    return null;
  }

  const nearby =
    complaint.latitude && complaint.longitude
      ? await listNearbyComplaints({
          latitude: Number(complaint.latitude),
          longitude: Number(complaint.longitude),
          radiusKm: 0.75,
          publicOnly: true,
        })
      : [];

  const media = await listComplaintMedia(complaintId);

  const analysis = analyzeComplaintForOperators(
    {
      id: complaint.id,
      complaintCode: complaint.complaintCode,
      title: complaint.title,
      status: complaint.status,
      priorityLevel: complaint.priorityLevel,
      isEmergency: complaint.isEmergency,
      domainName: complaint.domainName,
      departmentName: complaint.departmentName,
      wardName: null,
      latitude: complaint.latitude ?? "0",
      longitude: complaint.longitude ?? "0",
      addressLine: complaint.addressLine,
      landmark: complaint.landmark,
      submittedAt: complaint.submittedAt,
      description: complaint.description,
    },
    nearby.filter((item) => item.id !== complaint.id),
  );

  return {
    ...analysis,
    mediaSummary: {
      totalEvidence: media.length,
      hasImage: media.some((item) => item.mediaType === "image"),
      hasVideo: media.some((item) => item.mediaType === "video"),
      hasAudio: media.some((item) => item.mediaType === "audio"),
      hasResolutionProof: media.some((item) => item.isResolutionProof),
    },
  };
}
