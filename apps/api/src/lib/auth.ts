import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { store } from "./store.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const COOKIE_NAME = "mera_hisab_session";

export type AuthedUser = { id: string; email: string; role: string };

export function signToken(user: AuthedUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthedUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthedUser;
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = (req.cookies as Record<string, string>)[COOKIE_NAME] ?? extractBearer(req);
  if (token) {
    const user = verifyToken(token);
    if (user) (req as unknown as Record<string, unknown>).user = user;
  }
  next();
}

function extractBearer(req: Request): string | undefined {
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return undefined;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req as unknown as Record<string, unknown>).user as AuthedUser | undefined;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

export { COOKIE_NAME, JWT_SECRET };
