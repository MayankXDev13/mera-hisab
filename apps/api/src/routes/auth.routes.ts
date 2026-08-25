import { Router } from "express";
import { validateBody } from "../lib/validate.js";
import { z } from "zod";
import * as auth from "../controllers/auth.controller.js";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const authRouter = Router();
authRouter.post("/login", validateBody(loginSchema), auth.login);
authRouter.post("/logout", auth.logout);
authRouter.get("/me", auth.me);
