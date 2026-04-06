import { Router } from "express";
import { analyzeDraftService, getComplaintAiInsightsService } from "./ai.service.js";

export const aiRouter = Router();

aiRouter.post("/analyze-draft", async (req, res) => {
  try {
    const analysis = await analyzeDraftService(req.body);
    res.json({ data: analysis });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to analyze complaint draft",
    });
  }
});

aiRouter.get("/complaints/:id/insights", async (req, res) => {
  try {
    const analysis = await getComplaintAiInsightsService(req.params.id);

    if (!analysis) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }

    res.json({ data: analysis });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to fetch complaint insights",
    });
  }
});
