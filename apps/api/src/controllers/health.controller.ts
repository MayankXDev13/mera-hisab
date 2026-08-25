import type { Request, Response } from "express";

export async function health(_req: Request, res: Response) {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
}
