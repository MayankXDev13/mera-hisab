import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getRepo } from "./repo.js";

const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? process.env.JWT_SECRET ?? "dev-secret-change-me";
const COOKIE_NAME = "mera_hisab_session";

export type AuthedUser = { id: string; email: string; role: string };

export function signToken(user: AuthedUser): string {
  return jwt.sign(user, BETTER_AUTH_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthedUser | null {
  try {
    return jwt.verify(token, BETTER_AUTH_SECRET) as AuthedUser;
  } catch {
    return null;
  }
}

function tokenFromReq(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[COOKIE_NAME] ?? extractBearer(req);
}

function extractBearer(req: Request): string | undefined {
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return undefined;
}

async function validateWithRepo(token: string): Promise<AuthedUser | null> {
  const payload = verifyToken(token);
  if (!payload) return null;
  try {
    const repo = getRepo();
    const user = await repo.users.get(payload.id);
    if (!user) return null;
    return { id: payload.id, email: payload.email, role: payload.role ?? user.role };
  } catch {
    return payload;
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = tokenFromReq(req);
  if (token) {
    const user = await validateWithRepo(token);
    if (user) (req as unknown as Record<string, unknown>).user = user;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as unknown as Record<string, unknown>).user as AuthedUser | undefined;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as unknown as Record<string, unknown>).user as AuthedUser | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

export { COOKIE_NAME, BETTER_AUTH_SECRET };
