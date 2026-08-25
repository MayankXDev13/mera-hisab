import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import * as ctrl from "../controllers/accounts.controller.js";

export const accountsRouter = Router();
accountsRouter.use(requireAuth);
accountsRouter.get("/", ctrl.listAccounts);
accountsRouter.post("/", ctrl.createAccount);
accountsRouter.get("/:id", ctrl.getAccount);
accountsRouter.patch("/:id", ctrl.updateAccount);
accountsRouter.post("/:id/deactivate", ctrl.deactivateAccount);
