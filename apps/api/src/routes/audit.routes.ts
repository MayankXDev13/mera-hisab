import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import * as ctrl from "../controllers/audit.controller.js";

export const auditRouter = Router();
auditRouter.use(requireAuth);
auditRouter.get("/", ctrl.listAudit);
