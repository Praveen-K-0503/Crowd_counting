const DEFAULT_API_BASE_URL = "http://localhost:4000/api";

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export type AuthUser = {
  id: string;
  fullName: string;
  email: string | null;
  role: "citizen" | "department_operator" | "municipal_admin" | "field_officer";
  departmentId: string | null;
  wardId: string | null;
};

async function handleResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { data?: T; error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  if (payload.data === undefined) {
    throw new Error("Response did not include data");
  }

  return payload.data;
}

export type ComplaintListItem = {
  id: string;
  complaintCode: string;
  title: string;
  status: string;
  priorityLevel: string;
  isEmergency: boolean;
  submittedAt: string;
  domainName: string | null;
  departmentName: string | null;
  addressLine: string | null;
  landmark: string | null;
};

export type ComplaintDetail = ComplaintListItem & {
  description: string | null;
  departmentId: string | null;
  wardId: string | null;
  citizenId: string;
  latitude: string | null;
  longitude: string | null;
  addressLine: string | null;
  landmark: string | null;
};

export type ComplaintStatusHistoryItem = {
  id: string;
  complaintId: string;
  oldStatus: string | null;
  newStatus: string;
  changedBy: string | null;
  changeReason: string | null;
  createdAt: string;
};

export type CreateComplaintPayload = {
  citizenId: string;
  title: string;
  description?: string;
  domainId?: string;
  subProblemId?: string;
  isEmergency?: boolean;
  wardId?: string;
  latitude: number;
  longitude: number;
  addressLine?: string;
  landmark?: string;
  cityName?: string;
  stateName?: string;
  postalCode?: string;
};

export type CreatedComplaint = {
  id: string;
  complaintCode?: string;
  complaint_code?: string;
  status: string;
  priorityLevel?: string;
  priority_level?: string;
  submittedAt?: string;
  submitted_at?: string;
};

export type DepartmentOption = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isEmergency: boolean;
  isActive: boolean;
};

export type DomainOption = {
  id: string;
  name: string;
  description: string | null;
  isEmergency: boolean;
  isActive: boolean;
};

export type ComplaintMediaItem = {
  id: string;
  complaintId: string;
  mediaType: "image" | "video" | "audio";
  fileUrl: string | null;
  mimeType: string | null;
  isResolutionProof: boolean;
  createdAt: string;
};

export type ComplaintMapItem = {
  id: string;
  complaintCode: string;
  title: string;
  status: string;
  priorityLevel: string;
  isEmergency: boolean;
  domainName: string | null;
  departmentName: string | null;
  wardName: string | null;
  latitude: string;
  longitude: string;
  addressLine: string | null;
  landmark: string | null;
  submittedAt: string;
};

export type ComplaintHotspotItem = {
  hotspotKey: string;
  latitude: number;
  longitude: number;
  complaintCount: number;
  criticalCount: number;
  emergencyCount: number;
  topDomain: string | null;
};

export type NearbyComplaintItem = {
  id: string;
  complaintCode: string;
  title: string;
  status: string;
  priorityLevel: string;
  domainName: string | null;
  distanceKm: number;
  addressLine: string | null;
  landmark: string | null;
};

export type AiDraftAnalysis = {
  suggestedDomain: {
    domainId: string | null;
    domainName: string;
    confidence: number;
    matchedSignals: string[];
  } | null;
  suggestedPriority: "P1" | "P2" | "P3" | "P4";
  severityLevel: "critical" | "high" | "medium" | "low";
  emergencyLikelihood: "high" | "medium" | "low";
  duplicateRisk: "high" | "medium" | "low";
  routeDepartmentCode: string | null;
  routeDepartmentName: string | null;
  speechReady: boolean;
  visionReady: boolean;
  reasonSummary: string[];
  matchedKeywords: string[];
  duplicateMatches: Array<{
    complaintId: string;
    complaintCode: string;
    title: string;
    distanceKm: number;
    similarityScore: number;
    status: string;
  }>;
};

export type ComplaintAiInsights = AiDraftAnalysis & {
  mediaSummary: {
    totalEvidence: number;
    hasImage: boolean;
    hasVideo: boolean;
    hasAudio: boolean;
    hasResolutionProof: boolean;
  };
};

export type ComplaintAssignmentItem = {
  id: string;
  complaintId: string;
  complaintCode: string | null;
  complaintTitle: string | null;
  departmentId: string;
  departmentName: string;
  assignedToUserId: string | null;
  assignedToName: string | null;
  assignedByUserId: string | null;
  assignedByName: string | null;
  assignmentStatus: string;
  assignedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  resolutionProofCount: number;
  notes: string | null;
};

export type UserOption = {
  id: string;
  fullName: string;
  email: string | null;
  role: "citizen" | "department_operator" | "municipal_admin" | "field_officer";
  departmentId: string | null;
  departmentName: string | null;
  wardId: string | null;
};

export type ComplaintFeedbackItem = {
  id: string;
  complaintId: string;
  citizenId: string;
  rating: number | null;
  comment: string | null;
  reopenRequested: boolean;
  createdAt: string;
};

export type ComplaintNotificationItem = {
  id: string;
  userId: string;
  complaintId: string | null;
  title: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  createdAt: string;
};

export type ComplaintNoteItem = {
  id: string;
  complaintId: string;
  authorId: string | null;
  noteType: "operator_note" | "field_note" | "citizen_note" | "system_note";
  noteText: string;
  isInternal: boolean;
  createdAt: string;
  authorName: string | null;
};

export type DashboardSummary = {
  overview: {
    openComplaints: number;
    criticalComplaints: number;
    slaRisk: number;
    resolvedToday: number;
  };
  urgentQueue: Array<{
    id: string;
    complaintCode: string;
    title: string;
    domainName: string | null;
    priorityLevel: string;
    location: string | null;
    submittedAt: string;
  }>;
  departmentWorkload: Array<{
    departmentName: string;
    pendingCount: number;
  }>;
};

export type AnalyticsSummary = {
  trends: Array<{
    day: string;
    reportedCount: number;
    resolvedCount: number;
  }>;
  domainBreakdown: Array<{
    domainName: string;
    complaintCount: number;
  }>;
  departmentPerformance: Array<{
    departmentName: string;
    resolvedCount: number;
    pendingCount: number;
    averageResolutionHours: number;
  }>;
  kpis: {
    emergencyCount: number;
    reopenedCount: number;
    repeatComplaintRiskCount: number;
    slaBreaches: number;
  };
};

export async function getCitizenComplaints(citizenId: string) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/citizen/${citizenId}`, {
    cache: "no-store",
  });

  return handleResponse<ComplaintListItem[]>(response);
}

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return handleResponse<AuthUser>(response);
}

export async function registerUser(payload: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}) {
  const response = await fetch(`${getApiBaseUrl()}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<AuthUser>(response);
}

export async function getComplaintDetail(id: string) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/${id}`, {
    cache: "no-store",
  });

  return handleResponse<ComplaintDetail>(response);
}

export async function getComplaintHistory(id: string) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/${id}/history`, {
    cache: "no-store",
  });

  return handleResponse<ComplaintStatusHistoryItem[]>(response);
}

export async function getComplaintMedia(id: string) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/${id}/media`, {
    cache: "no-store",
  });

  return handleResponse<ComplaintMediaItem[]>(response);
}

export async function getComplaintAssignments(id: string) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/${id}/assignments`, {
    cache: "no-store",
  });

  return handleResponse<ComplaintAssignmentItem[]>(response);
}

export async function getComplaintFeedback(id: string) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/${id}/feedback`, {
    cache: "no-store",
  });

  return handleResponse<ComplaintFeedbackItem[]>(response);
}

export async function getComplaintNotes(id: string) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/${id}/notes`, {
    cache: "no-store",
  });

  return handleResponse<ComplaintNoteItem[]>(response);
}

export async function createComplaint(payload: CreateComplaintPayload) {
  // Mock API Response for Demo Mode
  return new Promise<CreatedComplaint>((resolve) => {
    setTimeout(() => {
      resolve({
        id: "mock-complaint-id",
        complaintCode: "PUB-" + Math.floor(Math.random() * 90000 + 10000),
        status: "open",
      });
    }, 1500);
  });
}

export async function getDepartments() {
  const response = await fetch(`${getApiBaseUrl()}/departments`, {
    cache: "no-store",
  });

  return handleResponse<DepartmentOption[]>(response);
}

export async function getDomains() {
  const response = await fetch(`${getApiBaseUrl()}/domains`, {
    cache: "no-store",
  });

  return handleResponse<DomainOption[]>(response);
}

export async function getFieldOfficers(departmentId?: string) {
  const url = new URL(`${getApiBaseUrl()}/users/field-officers`);

  if (departmentId) {
    url.searchParams.set("departmentId", departmentId);
  }

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  return handleResponse<UserOption[]>(response);
}

export type UpdateComplaintStatusPayload = {
  complaintId: string;
  newStatus: string;
  changedBy: string;
  reason?: string;
};

export type AssignComplaintPayload = {
  complaintId: string;
  departmentId: string;
  assignedToUserId?: string;
  assignedByUserId: string;
  notes?: string;
};

export type UpdateAssignmentStatusPayload = {
  assignmentId: string;
  newStatus: "accepted" | "in_progress" | "completed" | "reassigned";
  changedByUserId: string;
  notes?: string;
};

export async function getAllComplaints() {
  const response = await fetch(`${getApiBaseUrl()}/complaints`, {
    cache: "no-store",
  });

  return handleResponse<ComplaintListItem[]>(response);
}

export async function getDashboardSummary() {
  const response = await fetch(`${getApiBaseUrl()}/complaints/summary/dashboard`, {
    cache: "no-store",
  });

  return handleResponse<DashboardSummary>(response);
}

export async function getAnalyticsSummary() {
  const response = await fetch(`${getApiBaseUrl()}/complaints/summary/analytics`, {
    cache: "no-store",
  });

  return handleResponse<AnalyticsSummary>(response);
}

export function getAnalyticsExportUrl() {
  return `${getApiBaseUrl()}/complaints/summary/export.csv`;
}

export async function getMapComplaints(params?: {
  publicOnly?: boolean;
  status?: string;
  domainId?: string;
  priorityLevel?: string;
  emergencyOnly?: boolean;
}) {
  const url = new URL(`${getApiBaseUrl()}/complaints/map`);

  if (params?.publicOnly) url.searchParams.set("publicOnly", "true");
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.domainId) url.searchParams.set("domainId", params.domainId);
  if (params?.priorityLevel) url.searchParams.set("priorityLevel", params.priorityLevel);
  if (params?.emergencyOnly) url.searchParams.set("emergencyOnly", "true");

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  return handleResponse<ComplaintMapItem[]>(response);
}

export async function getPublicHotspots() {
  const response = await fetch(`${getApiBaseUrl()}/complaints/public/hotspots`, {
    cache: "no-store",
  });

  return handleResponse<ComplaintHotspotItem[]>(response);
}

export async function getNearbyComplaints(params: {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  domainId?: string;
  publicOnly?: boolean;
}) {
  const url = new URL(`${getApiBaseUrl()}/complaints/nearby`);
  url.searchParams.set("latitude", String(params.latitude));
  url.searchParams.set("longitude", String(params.longitude));
  if (params.radiusKm) url.searchParams.set("radiusKm", String(params.radiusKm));
  if (params.domainId) url.searchParams.set("domainId", params.domainId);
  if (params.publicOnly === false) url.searchParams.set("publicOnly", "false");

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  return handleResponse<NearbyComplaintItem[]>(response);
}

export async function analyzeComplaintDraft(payload: {
  title?: string;
  description?: string;
  addressLine?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  domainId?: string;
  mediaTypes?: Array<"image" | "video" | "audio">;
  visualSignals?: Array<{
    label: string;
    confidence: number;
    matchedSignals: string[];
  }>;
}) {
  const response = await fetch(`${getApiBaseUrl()}/ai/analyze-draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<AiDraftAnalysis>(response);
}

export async function getComplaintAiInsights(complaintId: string) {
  const response = await fetch(`${getApiBaseUrl()}/ai/complaints/${complaintId}/insights`, {
    cache: "no-store",
  });

  return handleResponse<ComplaintAiInsights>(response);
}

export async function getOfficerAssignments(userId: string) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/officer/${userId}/assignments`, {
    cache: "no-store",
  });

  return handleResponse<ComplaintAssignmentItem[]>(response);
}

export async function getNotifications(userId: string) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/notifications/user/${userId}`, {
    cache: "no-store",
  });

  return handleResponse<ComplaintNotificationItem[]>(response);
}

export async function markNotificationRead(params: { notificationId: string; userId: string }) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/notifications/${params.notificationId}/read`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: params.userId,
    }),
  });

  return handleResponse<ComplaintNotificationItem>(response);
}

export async function markAllNotificationsRead(userId: string) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/notifications/user/${userId}/read-all`, {
    method: "POST",
  });

  return handleResponse<{ userId: string; updatedCount: number }>(response);
}

export async function updateComplaintStatus(payload: UpdateComplaintStatusPayload) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/${payload.complaintId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newStatus: payload.newStatus,
      changedBy: payload.changedBy,
      reason: payload.reason,
    }),
  });

  return handleResponse<CreatedComplaint>(response);
}

export async function assignComplaint(payload: AssignComplaintPayload) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/${payload.complaintId}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      departmentId: payload.departmentId,
      assignedToUserId: payload.assignedToUserId,
      assignedByUserId: payload.assignedByUserId,
      notes: payload.notes,
    }),
  });

  return handleResponse<{
    id: string;
    complaintId: string;
    departmentId: string;
    assignedAt: string;
  }>(response);
}

export async function updateAssignmentStatus(payload: UpdateAssignmentStatusPayload) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/assignments/${payload.assignmentId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newStatus: payload.newStatus,
      changedByUserId: payload.changedByUserId,
      notes: payload.notes,
    }),
  });

  return handleResponse<{
    id: string;
    complaintId: string;
    assignmentStatus: string;
    complaintStatus: string;
  }>(response);
}

export async function uploadComplaintMedia(params: {
  complaintId: string;
  mediaType: "image" | "video" | "audio";
  file: File;
  uploadedBy?: string;
  isResolutionProof?: boolean;
  onProgress?: (progress: number) => void;
}) {
  // Mock Upload Progress for Demo Mode
  return new Promise<ComplaintMediaItem>((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      if (params.onProgress) {
        params.onProgress(progress);
      }
      
      if (progress >= 100) {
        clearInterval(interval);
        resolve({
          id: "mock-media-id",
          complaintId: params.complaintId,
          mediaType: params.mediaType,
          fileUrl: URL.createObjectURL(params.file),
          mimeType: params.file.type,
          isResolutionProof: params.isResolutionProof || false,
          createdAt: new Date().toISOString()
        });
      }
    }, 400);
  });
}

export async function submitComplaintFeedback(params: {
  complaintId: string;
  citizenId: string;
  rating?: number;
  comment?: string;
  reopenRequested?: boolean;
}) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/${params.complaintId}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      citizenId: params.citizenId,
      rating: params.rating,
      comment: params.comment,
      reopenRequested: params.reopenRequested ?? false,
    }),
  });

  return handleResponse<ComplaintFeedbackItem>(response);
}

export async function createComplaintNote(params: {
  complaintId: string;
  authorId: string;
  noteType: ComplaintNoteItem["noteType"];
  noteText: string;
  isInternal?: boolean;
}) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/${params.complaintId}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      authorId: params.authorId,
      noteType: params.noteType,
      noteText: params.noteText,
      isInternal: params.isInternal ?? true,
    }),
  });

  return handleResponse<ComplaintNoteItem>(response);
}

export async function verifyComplaintByCitizen(params: {
  complaintId: string;
  citizenId: string;
  comment?: string;
}) {
  const response = await fetch(`${getApiBaseUrl()}/complaints/${params.complaintId}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      citizenId: params.citizenId,
      comment: params.comment,
    }),
  });

  return handleResponse<{ complaintId: string; status: string }>(response);
}
