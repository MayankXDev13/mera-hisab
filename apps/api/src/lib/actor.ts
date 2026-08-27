import type { Request } from "express";
import "./http/types.js";

export type ActorRequest = Request & { user?: { id: string }; session?: unknown };

export function getActor(req: Request): string | null {
  const r = req as ActorRequest;
  return r.user?.id ?? null;
}
