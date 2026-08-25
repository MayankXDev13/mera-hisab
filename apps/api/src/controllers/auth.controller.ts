import type { Request, Response } from "express";
import { signToken, COOKIE_NAME } from "../lib/auth.js";
import { getRepo } from "../lib/repo.js";
import bcrypt from "bcryptjs";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const lower = String(email ?? "").toLowerCase();
  const repo = getRepo();
  const user = await repo.users.getByEmail(lower);
  if (!user || !user.passwordHash || !(await bcrypt.compare(String(password ?? ""), user.passwordHash))) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  const secure = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ id: user.id, email: user.email, name: user.name ?? user.email, role: user.role });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const u = (req as unknown as { user?: { id: string; email: string; role: string } }).user;
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  const repo = getRepo();
  const full = await repo.users.get(u.id);
  if (!full) return res.status(401).json({ error: "Unauthorized" });
  res.json({ id: full.id, email: full.email, name: full.name ?? full.email, role: full.role });
}
