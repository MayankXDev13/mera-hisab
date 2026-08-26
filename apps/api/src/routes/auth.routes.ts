import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../lib/auth.js";

const router = Router();

// Better Auth handles all /api/auth/* routes including sign-in, sign-up, callback, session
// Use `use` instead of `all("/*")` for Express 5 + path-to-regexp v8 compatibility
router.use("/", toNodeHandler(auth));

export default router;
