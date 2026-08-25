import { z } from "zod";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { store, newId, nowIso } from "../lib/store.js";
import { signToken, COOKIE_NAME } from "../lib/auth.js";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;
  const uid = store.usersByEmail.get(email.toLowerCase());
  const user = uid ? store.users.get(uid) : undefined;
  if (!user) return res.status(401).json({ error: "invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const u = (req as unknown as { user?: { id: string; email: string; role: string } }).user;
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  const full = store.users.get(u.id);
  if (!full) return res.status(401).json({ error: "Unauthorized" });
  res.json({ id: full.id, email: full.email, name: full.name, role: full.role });
}
