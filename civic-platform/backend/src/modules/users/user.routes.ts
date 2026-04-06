import { Router } from "express";
import { getUserContextService, listFieldOfficersService } from "./user.service.js";

export const userRouter = Router();

userRouter.get("/field-officers", async (req, res) => {
  try {
    const officers = await listFieldOfficersService(
      typeof req.query.departmentId === "string" ? req.query.departmentId : undefined,
    );

    res.json({ data: officers });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to fetch field officers",
    });
  }
});

userRouter.get("/:id", async (req, res) => {
  try {
    const user = await getUserContextService(req.params.id);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ data: user });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to fetch user",
    });
  }
});
