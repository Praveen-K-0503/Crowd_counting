import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import {
  assignComplaintService,
  createComplaintService,
  createComplaintNoteService,
  getDashboardSummaryService,
  getAnalyticsSummaryService,
  getMapComplaintsService,
  getNearbyComplaintsService,
  markAllNotificationsReadService,
  markNotificationReadService,
  getNotificationsService,
  getOfficerAssignmentsService,
  getPublicHotspotsService,
  exportAnalyticsCsvService,
  getComplaintAssignmentsService,
  getComplaintDetailService,
  getComplaintFeedbackService,
  getComplaintMediaService,
  getComplaintNotesService,
  getComplaintStatusHistoryService,
  listCitizenComplaintsService,
  listComplaintsService,
  submitComplaintFeedbackService,
  updateAssignmentStatusService,
  uploadComplaintMediaService,
  updateComplaintStatusService,
  verifyComplaintByCitizenService,
} from "./complaint.service.js";

export const complaintRouter = Router();

const uploadsRoot = path.resolve(process.cwd(), "uploads", "complaints");
fs.mkdirSync(uploadsRoot, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, uploadsRoot);
    },
    filename: (_req, file, callback) => {
      const safeExtension = path.extname(file.originalname) || "";
      callback(null, `${Date.now()}-${randomUUID()}${safeExtension}`);
    },
  }),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeMediaType(value: string | undefined) {
  if (value === "image" || value === "video" || value === "audio") {
    return value;
  }

  return undefined;
}

complaintRouter.get("/", async (_req, res) => {
  try {
    const complaints = await listComplaintsService();
    res.json({ data: complaints });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch complaints",
    });
  }
});

complaintRouter.get("/summary/dashboard", async (_req, res) => {
  try {
    const summary = await getDashboardSummaryService();
    res.json({ data: summary });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch dashboard summary",
    });
  }
});

complaintRouter.get("/summary/analytics", async (_req, res) => {
  try {
    const summary = await getAnalyticsSummaryService();
    res.json({ data: summary });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch analytics summary",
    });
  }
});

complaintRouter.get("/summary/export.csv", async (_req, res) => {
  try {
    const csv = await exportAnalyticsCsvService();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"civicpulse-analytics.csv\"");
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to export analytics",
    });
  }
});

complaintRouter.get("/map", async (req, res) => {
  try {
    const complaints = await getMapComplaintsService({
      publicOnly: req.query.publicOnly === "true",
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      domainId: typeof req.query.domainId === "string" ? req.query.domainId : undefined,
      priorityLevel: typeof req.query.priorityLevel === "string" ? req.query.priorityLevel : undefined,
      emergencyOnly: req.query.emergencyOnly === "true",
    });

    res.json({ data: complaints });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to fetch map complaints",
    });
  }
});

complaintRouter.get("/public/hotspots", async (_req, res) => {
  try {
    const hotspots = await getPublicHotspotsService();
    res.json({ data: hotspots });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch hotspots",
    });
  }
});

complaintRouter.get("/nearby", async (req, res) => {
  try {
    const nearby = await getNearbyComplaintsService({
      latitude: typeof req.query.latitude === "string" ? Number(req.query.latitude) : undefined,
      longitude: typeof req.query.longitude === "string" ? Number(req.query.longitude) : undefined,
      radiusKm: typeof req.query.radiusKm === "string" ? Number(req.query.radiusKm) : undefined,
      domainId: typeof req.query.domainId === "string" ? req.query.domainId : undefined,
      publicOnly: req.query.publicOnly !== "false",
    });

    res.json({ data: nearby });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to fetch nearby complaints",
    });
  }
});

complaintRouter.get("/citizen/:citizenId", async (req, res) => {
  try {
    const complaints = await listCitizenComplaintsService(req.params.citizenId);
    res.json({ data: complaints });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to fetch citizen complaints",
    });
  }
});

complaintRouter.get("/officer/:officerId/assignments", async (req, res) => {
  try {
    const assignments = await getOfficerAssignmentsService(req.params.officerId);
    res.json({ data: assignments });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to fetch officer assignments",
    });
  }
});

complaintRouter.get("/notifications/user/:userId", async (req, res) => {
  try {
    const notifications = await getNotificationsService(req.params.userId);
    res.json({ data: notifications });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to fetch notifications",
    });
  }
});

complaintRouter.patch("/notifications/:notificationId/read", async (req, res) => {
  try {
    const notification = await markNotificationReadService(req.params.notificationId, req.body.userId);

    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    res.json({ data: notification });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to update notification",
    });
  }
});

complaintRouter.post("/notifications/user/:userId/read-all", async (req, res) => {
  try {
    const result = await markAllNotificationsReadService(req.params.userId);
    res.json({ data: result });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to update notifications",
    });
  }
});

complaintRouter.get("/:id", async (req, res) => {
  try {
    const complaint = await getComplaintDetailService(req.params.id);

    if (!complaint) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }

    res.json({ data: complaint });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch complaint detail",
    });
  }
});

complaintRouter.get("/:id/history", async (req, res) => {
  try {
    const history = await getComplaintStatusHistoryService(req.params.id);
    res.json({ data: history });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to fetch complaint history",
    });
  }
});

complaintRouter.get("/:id/media", async (req, res) => {
  try {
    const media = await getComplaintMediaService(req.params.id);
    res.json({ data: media });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to fetch complaint media",
    });
  }
});

complaintRouter.get("/:id/feedback", async (req, res) => {
  try {
    const feedback = await getComplaintFeedbackService(req.params.id);
    res.json({ data: feedback });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to fetch complaint feedback",
    });
  }
});

complaintRouter.get("/:id/assignments", async (req, res) => {
  try {
    const assignments = await getComplaintAssignmentsService(req.params.id);
    res.json({ data: assignments });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to fetch complaint assignments",
    });
  }
});

complaintRouter.get("/:id/notes", async (req, res) => {
  try {
    const notes = await getComplaintNotesService(req.params.id);
    res.json({ data: notes });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to fetch complaint notes",
    });
  }
});

complaintRouter.post("/", async (req, res) => {
  try {
    const complaint = await createComplaintService(req.body);
    res.status(201).json({ data: complaint });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to create complaint",
    });
  }
});

complaintRouter.post("/:id/notes", async (req, res) => {
  try {
    const note = await createComplaintNoteService({
      complaintId: req.params.id,
      authorId: req.body.authorId,
      noteType: req.body.noteType,
      noteText: req.body.noteText,
      isInternal: req.body.isInternal,
    });

    if (!note) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }

    res.status(201).json({ data: note });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to create complaint note",
    });
  }
});

complaintRouter.patch("/:id/status", async (req, res) => {
  try {
    const complaint = await updateComplaintStatusService({
      complaintId: req.params.id,
      newStatus: req.body.newStatus,
      changedBy: req.body.changedBy,
      reason: req.body.reason,
    });

    if (!complaint) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }

    res.json({ data: complaint });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to update complaint status",
    });
  }
});

complaintRouter.post("/:id/assign", async (req, res) => {
  try {
    const assignment = await assignComplaintService({
      complaintId: req.params.id,
      departmentId: req.body.departmentId,
      assignedToUserId: req.body.assignedToUserId,
      assignedByUserId: req.body.assignedByUserId,
      notes: req.body.notes,
    });

    if (!assignment) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }

    res.status(201).json({ data: assignment });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to assign complaint",
    });
  }
});

complaintRouter.patch("/assignments/:assignmentId/status", async (req, res) => {
  try {
    const assignment = await updateAssignmentStatusService({
      assignmentId: req.params.assignmentId,
      newStatus: req.body.newStatus,
      changedByUserId: req.body.changedByUserId,
      notes: req.body.notes,
    });

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    res.json({ data: assignment });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to update assignment status",
    });
  }
});

complaintRouter.post("/:id/media", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "File is required" });
      return;
    }

    const media = await uploadComplaintMediaService({
      complaintId: String(req.params.id),
      uploadedBy: singleValue(req.body.uploadedBy),
      mediaType: normalizeMediaType(singleValue(req.body.mediaType)),
      filePath: req.file.path,
      fileUrl: `${req.protocol}://${req.get("host")}/uploads/complaints/${req.file.filename}`,
      mimeType: req.file.mimetype,
      isResolutionProof: singleValue(req.body.isResolutionProof) === "true",
    });

    if (!media) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }

    res.status(201).json({ data: media });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to upload complaint media",
    });
  }
});

complaintRouter.post("/:id/feedback", async (req, res) => {
  try {
    const feedback = await submitComplaintFeedbackService({
      complaintId: req.params.id,
      citizenId: req.body.citizenId,
      rating: req.body.rating,
      comment: req.body.comment,
      reopenRequested: req.body.reopenRequested,
    });

    if (!feedback) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }

    res.status(201).json({ data: feedback });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to submit complaint feedback",
    });
  }
});

complaintRouter.post("/:id/verify", async (req, res) => {
  try {
    const verification = await verifyComplaintByCitizenService({
      complaintId: req.params.id,
      citizenId: req.body.citizenId,
      comment: req.body.comment,
    });

    if (!verification) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }

    res.status(201).json({ data: verification });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to verify complaint",
    });
  }
});
