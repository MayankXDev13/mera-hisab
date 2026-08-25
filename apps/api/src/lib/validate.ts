import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";

declare global {
  namespace Express {
    interface Request {
      validated?: { body?: unknown; query?: unknown };
    }
  }
}

export function validateBody<S extends z.ZodTypeAny>(schema: S) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ error: parsed.error.flatten() });
    req.validated = { ...(req.validated ?? {}), body: parsed.data };
    // also replace req.body with parsed data for convenience
    req.body = parsed.data;
    next();
  };
}

export function validateQuery<S extends z.ZodTypeAny>(schema: S) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(422).json({ error: parsed.error.flatten() });
    req.validated = { ...(req.validated ?? {}), query: parsed.data };
    // keep original query but expose validated
    next();
  };
}
