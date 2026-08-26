import type { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import type { ActorRequest } from "../lib/actor.js";

export const requireSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  (req as ActorRequest).user = session.user as ActorRequest["user"];
  (req as ActorRequest).session = session.session;

  return next();
};
