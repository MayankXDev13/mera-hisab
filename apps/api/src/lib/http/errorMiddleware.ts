import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger.js";
import { ApiError } from "./errors.js";

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  let error: ApiError;

  if (err instanceof ApiError) {
    error = err;
  } else {
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err && typeof (err as { statusCode: unknown }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : 500;
    const message = err instanceof Error ? err.message : "Something went wrong";
    error = new ApiError(statusCode, message, [], err instanceof Error ? err.stack : undefined);
  }

  logger.error(
    {
      statusCode: error.statusCode,
      method: req.method,
      path: req.path,
      stack: error.stack,
    },
    error.message,
  );

  return res.status(error.statusCode).json({
    success: false,
    message: error.message,
    error: error.message,
    errors: error.errors,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};
