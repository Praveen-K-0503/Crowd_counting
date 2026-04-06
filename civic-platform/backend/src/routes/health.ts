import { Router } from "express";
import { db } from "../db/pool.js";

export const healthRouter = Router();

const startedAt = Date.now();

healthRouter.get("/", async (_req, res) => {
  try {
    await db.query("SELECT 1");

    res.json({
      status: "ok",
      service: "civicpulse-backend",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      database: "connected",
    });
  } catch {
    res.status(503).json({
      status: "degraded",
      service: "civicpulse-backend",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      database: "unavailable",
    });
  }
});
