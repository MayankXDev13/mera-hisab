import { Router } from "express";
import { me } from "../controllers/user.controller.js";
import { requireSession } from "../middlewares/auth.js";

const router = Router();

router.get("/me", requireSession, me);

export default router;
