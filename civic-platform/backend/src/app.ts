import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import { aiRouter } from "./modules/ai/ai.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { env } from "./config/env.js";
import { rateLimitMiddleware, securityHeaders } from "./lib/security.js";
import { complaintRouter } from "./modules/complaints/complaint.routes.js";
import { departmentRouter } from "./modules/departments/department.routes.js";
import { domainRouter } from "./modules/domains/domain.routes.js";
import { userRouter } from "./modules/users/user.routes.js";
import { healthRouter } from "./routes/health.js";

export function createApp() {
  const app = express();
  const uploadsDir = path.resolve(process.cwd(), "uploads");

  fs.mkdirSync(path.join(uploadsDir, "complaints"), { recursive: true });

  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: env.corsOrigins.split(",").map((value) => value.trim()),
    }),
  );
  app.use(securityHeaders);
  app.use(rateLimitMiddleware);
  app.use(express.json({ limit: "10mb" }));
  app.use("/uploads", express.static(uploadsDir));

  app.get("/", (_req, res) => {
    res.json({
      name: "civicpulse-backend",
      message: "CivicPulse backend is running",
    });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/departments", departmentRouter);
  app.use("/api/domains", domainRouter);
  app.use("/api/users", userRouter);
  app.use("/api/complaints", complaintRouter);

  return app;
}
