import { Router } from "express";
import { listDepartmentsService } from "./department.service.js";

export const departmentRouter = Router();

departmentRouter.get("/", async (_req, res) => {
  try {
    const departments = await listDepartmentsService();
    res.json({ data: departments });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch departments",
    });
  }
});
