import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export const validateBody =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    (req as unknown as { validatedBody: unknown }).validatedBody = parsed.data;
    return next();
  };

export const validateQuery =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    (req as unknown as { validatedQuery: unknown }).validatedQuery = parsed.data;
    return next();
  };

export const validateParams =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    (req as unknown as { validatedParams: unknown }).validatedParams = parsed.data;
    return next();
  };
