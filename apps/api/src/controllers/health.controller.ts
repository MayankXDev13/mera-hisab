import type { Request, Response } from "express";

export const check = (req: Request, res: Response) => {
  res.json({ ok: true });
};
