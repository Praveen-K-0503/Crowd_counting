import { Router } from "express";
import { loginService, registerCitizenService } from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  try {
    const user = await loginService({
      email: req.body.email,
      password: req.body.password,
    });

    res.json({ data: user });
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : "Login failed",
    });
  }
});

authRouter.post("/register", async (req, res) => {
  try {
    const user = await registerCitizenService({
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      password: req.body.password,
    });

    res.status(201).json({ data: user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";
    const status = message.includes("already exists") ? 409 : 400;

    res.status(status).json({ error: message });
  }
});
