import type {
  AnalyticsSummary,
  AssignComplaintInput,
  ComplaintHotspotItem,
  ComplaintMapItem,
  ComplaintNotificationItem,
  CreateComplaintNoteInput,
  CreateComplaintInput,
  NearbyComplaintItem,
  SubmitComplaintFeedbackInput,
  UpdateAssignmentStatusInput,
  UpdateComplaintStatusInput,
  UploadComplaintMediaInput,
} from "./complaint.types.js";
import {
  assignComplaint,
  complaintHasResolutionProof,
  createComplaintNote,
  createComplaint,
  exportAnalyticsCsv,
  getAssignmentById,
  getAnalyticsSummary,
  getDashboardSummary,
  listAssignmentsByOfficer,
  listMapComplaints,
  listNearbyComplaints,
  listNotificationsByUser,
  listComplaintAssignments,
  getComplaintById,
  listComplaintFeedback,
  listPublicHotspots,
  listComplaintMedia,
  listComplaintNotes,
  getComplaintStatusHistory,
  listComplaints,
  listComplaintsByCitizen,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  submitComplaintFeedback,
  hasOfficerAssignment,
  updateAssignmentStatus,
  uploadComplaintMedia,
  updateComplaintStatus,
  verifyComplaintByCitizen,
} from "./complaint.repository.js";
import { getUserContext } from "../users/user.repository.js";
import { sanitizeText } from "../../lib/security.js";
import { withCache } from "../../lib/cache.js";

function validateCreateComplaintInput(input: Partial<CreateComplaintInput>) {
  const missing: string[] = [];

  if (!input.citizenId) missing.push("citizenId");
  if (!input.title) missing.push("title");
  if (typeof input.latitude !== "number") missing.push("latitude");
  if (typeof input.longitude !== "number") missing.push("longitude");

  if (missing.length > 0) {
    throw new Error(`Missing required complaint fields: ${missing.join(", ")}`);
  }
}

function isOperatorRole(role: string) {
  return role === "department_operator" || role === "municipal_admin";
}

async function requireUserContext(userId: string) {
  const user = await getUserContext(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function createComplaintService(input: Partial<CreateComplaintInput>) {
  validateCreateComplaintInput(input);

  const citizen = await requireUserContext(input.citizenId as string);

  if (citizen.role !== "citizen") {
    throw new Error("Only citizens can create complaints");
  }

  return createComplaint({
    ...(input as CreateComplaintInput),
    title: sanitizeText(input.title, 220) ?? "",
    description: sanitizeText(input.description, 2000),
    addressLine: sanitizeText(input.addressLine, 220),
    landmark: sanitizeText(input.landmark, 220),
    cityName: sanitizeText(input.cityName, 120),
    stateName: sanitizeText(input.stateName, 120),
    postalCode: sanitizeText(input.postalCode, 20),
  });
}

export async function listComplaintsService() {
  return listComplaints();
}

export async function getDashboardSummaryService() {
  return withCache("analytics:dashboard", 15000, () => getDashboardSummary());
}

export async function getMapComplaintsService(input: {
  publicOnly?: boolean;
  status?: string;
  domainId?: string;
  priorityLevel?: string;
  emergencyOnly?: boolean;
}): Promise<ComplaintMapItem[]> {
  return listMapComplaints(input);
}

export async function getPublicHotspotsService(): Promise<ComplaintHotspotItem[]> {
  return withCache("analytics:hotspots", 15000, () => listPublicHotspots());
}

export async function getAnalyticsSummaryService(): Promise<AnalyticsSummary> {
  return withCache("analytics:summary", 20000, () => getAnalyticsSummary());
}

export async function exportAnalyticsCsvService() {
  return withCache("analytics:csv", 20000, () => exportAnalyticsCsv());
}

export async function getNearbyComplaintsService(input: {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  domainId?: string;
  publicOnly?: boolean;
}): Promise<NearbyComplaintItem[]> {
  if (typeof input.latitude !== "number" || Number.isNaN(input.latitude)) {
    throw new Error("latitude is required");
  }

  if (typeof input.longitude !== "number" || Number.isNaN(input.longitude)) {
    throw new Error("longitude is required");
  }

  return listNearbyComplaints({
    latitude: input.latitude,
    longitude: input.longitude,
    radiusKm: input.radiusKm ?? 0.75,
    domainId: input.domainId,
    publicOnly: input.publicOnly ?? true,
  });
}

export async function listCitizenComplaintsService(citizenId: string) {
  if (!citizenId) {
    throw new Error("citizenId is required");
  }

  return listComplaintsByCitizen(citizenId);
}

export async function getComplaintDetailService(id: string) {
  if (!id) {
    throw new Error("Complaint id is required");
  }

  return getComplaintById(id);
}

export async function getComplaintStatusHistoryService(id: string) {
  if (!id) {
    throw new Error("Complaint id is required");
  }

  return getComplaintStatusHistory(id);
}

export async function getComplaintMediaService(id: string) {
  if (!id) {
    throw new Error("Complaint id is required");
  }

  return listComplaintMedia(id);
}

export async function getComplaintFeedbackService(id: string) {
  if (!id) {
    throw new Error("Complaint id is required");
  }

  return listComplaintFeedback(id);
}

export async function getComplaintAssignmentsService(id: string) {
  if (!id) {
    throw new Error("Complaint id is required");
  }

  return listComplaintAssignments(id);
}

export async function getOfficerAssignmentsService(userId: string) {
  if (!userId) {
    throw new Error("userId is required");
  }

  return listAssignmentsByOfficer(userId);
}

export async function getNotificationsService(userId: string): Promise<ComplaintNotificationItem[]> {
  if (!userId) {
    throw new Error("userId is required");
  }

  return listNotificationsByUser(userId);
}

export async function markNotificationReadService(notificationId: string, userId: string) {
  if (!notificationId) {
    throw new Error("notificationId is required");
  }

  if (!userId) {
    throw new Error("userId is required");
  }

  return markNotificationAsRead(notificationId, userId);
}

export async function markAllNotificationsReadService(userId: string) {
  if (!userId) {
    throw new Error("userId is required");
  }

  return markAllNotificationsAsRead(userId);
}

export async function getComplaintNotesService(id: string) {
  if (!id) {
    throw new Error("Complaint id is required");
  }

  return listComplaintNotes(id);
}

const allowedStatuses = new Set([
  "submitted",
  "validated",
  "classified",
  "prioritized",
  "assigned",
  "accepted",
  "in_progress",
  "resolved",
  "citizen_verified",
  "closed",
  "escalated",
  "reopened",
  "duplicate",
  "rejected",
  "on_hold",
]);

const allowedTransitions: Record<string, string[]> = {
  submitted: ["validated", "escalated", "rejected"],
  validated: ["classified", "prioritized", "assigned", "escalated"],
  classified: ["prioritized", "assigned"],
  prioritized: ["assigned", "escalated", "on_hold"],
  assigned: ["accepted", "in_progress", "escalated", "on_hold"],
  accepted: ["in_progress", "escalated", "on_hold"],
  in_progress: ["resolved", "escalated", "on_hold"],
  resolved: ["citizen_verified", "closed", "reopened"],
  citizen_verified: ["closed"],
  reopened: ["assigned", "in_progress", "escalated"],
  escalated: ["assigned", "in_progress", "resolved"],
  on_hold: ["assigned", "in_progress", "escalated"],
  rejected: ["reopened"],
  duplicate: ["reopened"],
  closed: ["reopened"],
};

export async function updateComplaintStatusService(input: Partial<UpdateComplaintStatusInput>) {
  if (!input.complaintId) {
    throw new Error("complaintId is required");
  }

  if (!input.changedBy) {
    throw new Error("changedBy is required");
  }

  if (!input.newStatus || !allowedStatuses.has(input.newStatus)) {
    throw new Error("newStatus is invalid");
  }

  const actor = await requireUserContext(input.changedBy);

  if (!isOperatorRole(actor.role)) {
    throw new Error("Only operators and municipal admins can update complaint status");
  }

  const complaint = await getComplaintById(input.complaintId);

  if (!complaint) {
    return null;
  }

  const nextStatuses = allowedTransitions[complaint.status] ?? [];

  if (!nextStatuses.includes(input.newStatus)) {
    throw new Error(`Cannot move complaint from ${complaint.status} to ${input.newStatus}`);
  }

  return updateComplaintStatus(input as UpdateComplaintStatusInput);
}

export async function assignComplaintService(input: Partial<AssignComplaintInput>) {
  if (!input.complaintId) {
    throw new Error("complaintId is required");
  }

  if (!input.departmentId) {
    throw new Error("departmentId is required");
  }

  if (!input.assignedByUserId) {
    throw new Error("assignedByUserId is required");
  }

  const actor = await requireUserContext(input.assignedByUserId);

  if (!isOperatorRole(actor.role)) {
    throw new Error("Only operators and municipal admins can assign complaints");
  }

  if (actor.role === "department_operator" && actor.departmentId !== input.departmentId) {
    throw new Error("Department operators can only assign complaints within their own department");
  }

  if (input.assignedToUserId) {
    const assignee = await requireUserContext(input.assignedToUserId);

    if (assignee.role !== "field_officer") {
      throw new Error("Assigned user must be a field officer");
    }

    if (assignee.departmentId !== input.departmentId) {
      throw new Error("Field officer must belong to the selected department");
    }
  }

  return assignComplaint(input as AssignComplaintInput);
}

const allowedAssignmentStatuses = new Set(["accepted", "in_progress", "completed", "reassigned"]);

export async function updateAssignmentStatusService(input: Partial<UpdateAssignmentStatusInput>) {
  if (!input.assignmentId) {
    throw new Error("assignmentId is required");
  }

  if (!input.changedByUserId) {
    throw new Error("changedByUserId is required");
  }

  if (!input.newStatus || !allowedAssignmentStatuses.has(input.newStatus)) {
    throw new Error("newStatus is invalid");
  }

  const actor = await requireUserContext(input.changedByUserId);
  const assignment = await getAssignmentById(input.assignmentId);

  if (!assignment) {
    return null;
  }

  if (actor.role === "field_officer") {
    if (assignment.assignedToUserId !== actor.id) {
      throw new Error("Field officers can only update assignments assigned to them");
    }

    if (input.newStatus === "reassigned") {
      throw new Error("Field officers cannot reassign tasks");
    }

    if (input.newStatus === "completed") {
      const hasProof = await complaintHasResolutionProof(assignment.complaintId);

      if (!hasProof) {
        throw new Error("Upload at least one resolution proof before marking the task as completed");
      }
    }
  } else if (isOperatorRole(actor.role)) {
    if (actor.role === "department_operator" && actor.departmentId !== assignment.departmentId) {
      throw new Error("Department operators can only manage assignments within their department");
    }

    if (input.newStatus !== "reassigned") {
      throw new Error("Operators can only use this action to reassign work");
    }
  } else {
    throw new Error("Only field officers, operators, and municipal admins can update assignments");
  }

  return updateAssignmentStatus(input as UpdateAssignmentStatusInput);
}

const allowedMediaTypes = new Set(["image", "video", "audio"]);

export async function uploadComplaintMediaService(input: Partial<UploadComplaintMediaInput>) {
  if (!input.complaintId) {
    throw new Error("complaintId is required");
  }

  if (!input.filePath) {
    throw new Error("filePath is required");
  }

  if (!input.fileUrl) {
    throw new Error("fileUrl is required");
  }

  if (!input.mediaType || !allowedMediaTypes.has(input.mediaType)) {
    throw new Error("mediaType is invalid");
  }

  if (input.mimeType) {
    const mimeAllowed =
      (input.mediaType === "image" && input.mimeType.startsWith("image/")) ||
      (input.mediaType === "video" && input.mimeType.startsWith("video/")) ||
      (input.mediaType === "audio" && input.mimeType.startsWith("audio/"));

    if (!mimeAllowed) {
      throw new Error("Uploaded file type does not match the selected media type");
    }
  }

  if (input.uploadedBy) {
    const actor = await requireUserContext(input.uploadedBy);

    if (input.isResolutionProof) {
      if (actor.role === "citizen") {
        throw new Error("Citizens cannot upload resolution proof");
      }

      if (actor.role === "field_officer") {
        const hasAssignment = await hasOfficerAssignment(input.complaintId, actor.id);

        if (!hasAssignment) {
          throw new Error("Field officers can only upload proof for complaints assigned to them");
        }
      }
    }
  }

  return uploadComplaintMedia(input as UploadComplaintMediaInput);
}

export async function submitComplaintFeedbackService(input: Partial<SubmitComplaintFeedbackInput>) {
  if (!input.complaintId) {
    throw new Error("complaintId is required");
  }

  if (!input.citizenId) {
    throw new Error("citizenId is required");
  }

  if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
    throw new Error("rating must be between 1 and 5");
  }

  const citizen = await requireUserContext(input.citizenId);

  if (citizen.role !== "citizen") {
    throw new Error("Only citizens can submit complaint feedback");
  }

  const complaint = await getComplaintById(input.complaintId);

  if (!complaint || complaint.citizenId !== input.citizenId) {
    throw new Error("Complaint does not belong to this citizen");
  }

  if (input.reopenRequested && !["resolved", "closed", "citizen_verified"].includes(complaint.status)) {
    throw new Error("Complaints can only be reopened after they have been resolved or closed");
  }

  return submitComplaintFeedback({
    ...(input as SubmitComplaintFeedbackInput),
    comment: sanitizeText(input.comment, 1200),
  });
}

export async function verifyComplaintByCitizenService(input: {
  complaintId?: string;
  citizenId?: string;
  comment?: string;
}) {
  if (!input.complaintId) {
    throw new Error("complaintId is required");
  }

  if (!input.citizenId) {
    throw new Error("citizenId is required");
  }

  const citizen = await requireUserContext(input.citizenId);

  if (citizen.role !== "citizen") {
    throw new Error("Only citizens can verify resolved complaints");
  }

  const complaint = await getComplaintById(input.complaintId);

  if (!complaint || complaint.citizenId !== input.citizenId) {
    throw new Error("Complaint does not belong to this citizen");
  }

  if (complaint.status !== "resolved") {
    throw new Error("Only resolved complaints can be verified by the citizen");
  }

  return verifyComplaintByCitizen({
    complaintId: input.complaintId,
    citizenId: input.citizenId,
    comment: sanitizeText(input.comment, 1200),
  });
}

const allowedNoteTypes = new Set(["operator_note", "field_note", "citizen_note", "system_note"]);

export async function createComplaintNoteService(input: Partial<CreateComplaintNoteInput>) {
  if (!input.complaintId) {
    throw new Error("complaintId is required");
  }

  if (!input.authorId) {
    throw new Error("authorId is required");
  }

  if (!input.noteText?.trim()) {
    throw new Error("noteText is required");
  }

  if (!input.noteType || !allowedNoteTypes.has(input.noteType)) {
    throw new Error("noteType is invalid");
  }

  const author = await requireUserContext(input.authorId);
  const complaint = await getComplaintById(input.complaintId);

  if (!complaint) {
    return null;
  }

  if (input.noteType === "system_note") {
    throw new Error("System notes cannot be created manually");
  }

  if (input.noteType === "citizen_note") {
    if (author.role !== "citizen" || complaint.citizenId !== author.id) {
      throw new Error("Only the reporting citizen can add a citizen note");
    }
  }

  if (input.noteType === "operator_note" && !isOperatorRole(author.role)) {
    throw new Error("Only operators and municipal admins can add operator notes");
  }

  if (input.noteType === "field_note") {
    if (author.role !== "field_officer") {
      throw new Error("Only field officers can add field notes");
    }

    const hasAssignment = await hasOfficerAssignment(input.complaintId, author.id);

    if (!hasAssignment) {
      throw new Error("Field notes can only be added to complaints assigned to the field officer");
    }
  }

  if ((input.isInternal ?? true) && author.role === "citizen") {
    throw new Error("Citizens cannot create internal notes");
  }

  return createComplaintNote({
    complaintId: input.complaintId,
    authorId: input.authorId,
    noteText: sanitizeText(input.noteText, 2000) ?? "",
    noteType: input.noteType as CreateComplaintNoteInput["noteType"],
    isInternal: input.isInternal ?? true,
  });
}
