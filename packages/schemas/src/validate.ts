import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

export type ValidatedRequest<TBody = unknown, TQuery = unknown, TParams = unknown> = Request & {
  validatedBody?: TBody;
  validatedQuery?: TQuery;
  validatedParams?: TParams;
};

export type BodyRequest<T> = Request & { validatedBody: T };
export type QueryRequest<T> = Request & { validatedQuery: T };
export type ParamsRequest<T> = Request & { validatedParams: T };

export const validateBody =
  <T>(schema: ZodType<T>) =>
  (req: ValidatedRequest<T, unknown, unknown>, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse((req as Request).body);
    if (!parsed.success) {
      return (_res as Response).status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    (req as BodyRequest<T>).validatedBody = parsed.data;
    return next();
  };

export const validateQuery =
  <T>(schema: ZodType<T>) =>
  (req: ValidatedRequest<unknown, T, unknown>, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse((req as Request).query);
    if (!parsed.success) {
      return (_res as Response).status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    (req as QueryRequest<T>).validatedQuery = parsed.data;
    return next();
  };

export const validateParams =
  <T>(schema: ZodType<T>) =>
  (req: ValidatedRequest<unknown, unknown, T>, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse((req as Request).params);
    if (!parsed.success) {
      return (_res as Response).status(422).json({ error: "Validation failed", details: parsed.error.flatten() });
    }
    (req as ParamsRequest<T>).validatedParams = parsed.data;
    return next();
  };
