import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import * as ctrl from "../controllers/charges.controller.js";

export const chargesRouter = Router();
chargesRouter.use(requireAuth);
chargesRouter.get("/", ctrl.listCharges);
chargesRouter.post("/run", ctrl.runCharges);
chargesRouter.post("/:id/waive", ctrl.waiveCharge);
