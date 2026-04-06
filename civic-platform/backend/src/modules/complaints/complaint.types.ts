export type CreateComplaintInput = {
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

export type UpdateComplaintStatusInput = {
  complaintId: string;
  newStatus: string;
  changedBy: string;
  reason?: string;
};

export type AssignComplaintInput = {
  complaintId: string;
  departmentId: string;
  assignedToUserId?: string;
  assignedByUserId: string;
  notes?: string;
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

export type UpdateAssignmentStatusInput = {
  assignmentId: string;
  newStatus: "accepted" | "in_progress" | "completed" | "reassigned";
  changedByUserId: string;
  notes?: string;
};

export type UploadComplaintMediaInput = {
  complaintId: string;
  uploadedBy?: string;
  mediaType: "image" | "video" | "audio";
  filePath: string;
  fileUrl: string;
  mimeType?: string;
  isResolutionProof?: boolean;
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

export type SubmitComplaintFeedbackInput = {
  complaintId: string;
  citizenId: string;
  rating?: number;
  comment?: string;
  reopenRequested?: boolean;
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

export type CreateComplaintNoteInput = {
  complaintId: string;
  authorId: string;
  noteType: "operator_note" | "field_note" | "citizen_note" | "system_note";
  noteText: string;
  isInternal?: boolean;
};
