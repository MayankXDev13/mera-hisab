import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import { validateQuery } from "../lib/validate.js";
import { auditFilterQuerySchema } from "@repo/shared";
import * as ctrl from "../controllers/audit.controller.js";

export const auditRouter = Router();
auditRouter.use(requireAuth);
auditRouter.get("/", validateQuery(auditFilterQuerySchema), ctrl.listAudit);
