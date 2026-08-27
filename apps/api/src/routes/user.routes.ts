import { Router } from "express";
import { me } from "../controllers/user.controller.js";
import { requireSession } from "../middlewares/auth.js";
import { asyncHandler } from "../lib/http/asyncHandler.js";

const router = Router();

router.get("/me", requireSession, asyncHandler(me));

export default router;
