import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  next();
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const current = requestBuckets.get(key);

  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, {
      count: 1,
      resetAt: now + env.rateLimitWindowMs,
    });
    next();
    return;
  }

  if (current.count >= env.rateLimitMaxRequests) {
    res.status(429).json({
      error: "Too many requests. Please wait and try again.",
    });
    return;
  }

  current.count += 1;
  requestBuckets.set(key, current);
  next();
}

export function sanitizeText(input?: string, maxLength = 2000) {
  if (!input) {
    return undefined;
  }

  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

