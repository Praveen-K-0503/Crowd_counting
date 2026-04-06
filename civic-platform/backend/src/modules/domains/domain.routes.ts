import { Router } from "express";
import { listDomainsService } from "./domain.service.js";

export const domainRouter = Router();

domainRouter.get("/", async (_req, res) => {
  try {
    const domains = await listDomainsService();
    res.json({ data: domains });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch domains",
    });
  }
});
