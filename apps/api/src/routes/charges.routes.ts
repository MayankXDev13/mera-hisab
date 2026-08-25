import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import { validateBody, validateQuery } from "../lib/validate.js";
import { waiverSchema, chargeFilterQuerySchema } from "@repo/shared";
import * as ctrl from "../controllers/charges.controller.js";

export const chargesRouter = Router();
chargesRouter.use(requireAuth);
chargesRouter.get("/", validateQuery(chargeFilterQuerySchema), ctrl.listCharges);
chargesRouter.post("/run", ctrl.runCharges);
chargesRouter.post("/:id/waive", validateBody(waiverSchema), ctrl.waiveCharge);
